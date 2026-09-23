import * as THREE from 'three';
import { surfaceHeight, vegetationAmount } from './terrain.js';
import { PLANET } from './planet.js';

// Little round bushes on Верданта's moss banks. Cheap on purpose: a small fixed
// pool of crossed billboard cards (two quads at 90°, like classic foliage-card
// rendering), confined to a disc around the rover and wrapped to the far side as
// it drives — exactly sand.js's trick, just without any physics. Every instance
// is one draw call; there is no per-leaf geometry, no shadow casting, and
// instances outside a mossy patch are simply scaled to nothing rather than
// skipped, so the whole field costs one InstancedMesh regardless of how green
// the ground actually is.
// (An earlier pass drew tall pointed blades instead — from any distance they
// read as black thorny spikes, not grass, so the card is now a soft round
// clump instead of something with a sharp tip.)

const ACTIVE = PLANET === 'verdanta';
const COUNT = 2600;
const RADIUS = 42; // grass only needs to exist right around the rover, not to the horizon
const CANDIDATES = 4; // best-of-N placement so the pool lands on moss, not bare rock
// verdantaHeight is a dozen-odd fbm calls deep, and placing a tuft samples it several
// times (gradient + candidates) — re-checking the whole pool every frame would make
// grass more expensive than the terrain it sits on. Instead only a bounded slice is
// re-checked each frame, cycling through the pool over ~10 frames; a tuft that just
// left the disc sits invisible (scale 0, from the fade in the shader) for at most a
// few frames before its turn comes up, which is not visible at any real driving speed.
const SLICE = 260;

function makeTuftTexture() {
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const ctx = c.getContext('2d');
  // A soft round clump — several overlapping, feather-edged blobs low in the
  // frame (canvas y=128 is the card's root, see makeCrossGeometry) — instead of
  // anything with a sharp tip, so the silhouette reads as a little bush, not a
  // spike. Darker blobs first, brighter ones on top for a bit of shape.
  const blobs = [
    { x: 40, y: 82, r: 32, col: '#375c26' },
    { x: 86, y: 78, r: 30, col: '#3a5f28' },
    { x: 62, y: 100, r: 36, col: '#446b30' },
    { x: 36, y: 102, r: 24, col: '#4a7336' },
    { x: 88, y: 100, r: 26, col: '#436c30' },
    { x: 62, y: 66, r: 24, col: '#5c8a42' },
    { x: 46, y: 70, r: 16, col: '#6a9a4c' },
    { x: 78, y: 62, r: 14, col: '#6a9a4c' },
  ];
  for (const b of blobs) {
    const g = ctx.createRadialGradient(b.x, b.y, 0, b.x, b.y, b.r);
    g.addColorStop(0, b.col);
    g.addColorStop(0.7, b.col);
    g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2);
    ctx.fill();
  }
  const tex = new THREE.CanvasTexture(c);
  tex.anisotropy = 4;
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

// Two crossed unit planes, base at y=0, tip at y=1, so a shader can weight sway by
// local y (0 at the root, full swing at the tip) and an instance matrix can scale
// it to whatever size/rotation a tuft needs.
function makeCrossGeometry() {
  const pos = new Float32Array([
    -0.5, 0, 0, 0.5, 0, 0, 0.5, 1, 0, -0.5, 1, 0,
    0, 0, -0.5, 0, 0, 0.5, 0, 1, 0.5, 0, 1, -0.5,
  ]);
  const uv = new Float32Array([0, 0, 1, 0, 1, 1, 0, 1, 0, 0, 1, 0, 1, 1, 0, 1]);
  const idx = [0, 1, 2, 0, 2, 3, 4, 5, 6, 4, 6, 7, 0, 2, 1, 0, 3, 2, 4, 6, 5, 4, 7, 6];
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  geo.setIndex(idx);
  geo.computeVertexNormals();
  geo.computeBoundingSphere();
  return geo;
}

export function createGrass({ count = COUNT, radius = RADIUS } = {}) {
  const group = new THREE.Group();
  if (!ACTIVE) {
    // Off Верданта there is nothing to place — keep the same shape of object so
    // main.js can wire it in unconditionally.
    return { group, update() {} };
  }

  const pos = new Float32Array(count * 3);
  const yaw = new Float32Array(count);
  const size = new Float32Array(count * 2); // width, height per tuft
  const on = new Uint8Array(count);

  const geometry = makeCrossGeometry();
  const rover = { value: new THREE.Vector3() };
  const radiusU = { value: radius };
  const timeU = { value: 0 };
  const material = new THREE.MeshLambertMaterial({
    map: makeTuftTexture(),
    alphaTest: 0.3,
    side: THREE.DoubleSide,
    transparent: false,
    // Real grass sub-surface-scatters light and never reads pure black even in its
    // own shadow; a small fixed emissive keeps thin vertical cards legible under
    // Верданта's flat, mostly-ambient overcast light instead of silhouetting to
    // black the way the (correctly, physically) sun-lit ground never does.
    emissive: new THREE.Color(0x223c17),
    emissiveIntensity: 0.8,
  });
  material.onBeforeCompile = (shader) => {
    shader.uniforms.uRover = rover;
    shader.uniforms.uRadius = radiusU;
    shader.uniforms.uTime = timeU;
    shader.vertexShader = shader.vertexShader
      .replace(
        '#include <common>',
        `#include <common>
         uniform vec3 uRover;
         uniform float uRadius;
         uniform float uTime;`
      )
      .replace(
        '#include <begin_vertex>',
        `#include <begin_vertex>
         #ifdef USE_INSTANCING
           vec3 instP = vec3(instanceMatrix[3]);
           // Fade the last bit of the disc instead of popping tufts in and out.
           transformed *= smoothstep(uRadius, uRadius * 0.82, length(instP.xz - uRover.xz));
           // A gentle travelling sway: phased by world position so it reads as wind
           // crossing the field rather than every bush wobbling in lockstep. A round
           // clump is stiffer than a blade of grass, so this stays subtle.
           float sway = sin(uTime * 1.4 - (instP.x + instP.z) * 0.08);
           transformed.x += sway * 0.05 * transformed.y;
           transformed.z += cos(uTime * 1.1 - (instP.x - instP.z) * 0.08) * 0.035 * transformed.y;
         #endif`
      );
  };

  const mesh = new THREE.InstancedMesh(geometry, material, count);
  mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  mesh.frustumCulled = false;
  mesh.castShadow = false; // thin alpha-tested cards make a noisy, expensive shadow for no visual gain
  mesh.receiveShadow = true;
  group.add(mesh);

  let seeded = false;
  let dirty = false;
  let cursor = 0;
  const tmpV = new THREE.Vector3();
  const tmpQ = new THREE.Quaternion();
  const tmpE = new THREE.Euler();
  const tmpS = new THREE.Vector3();
  const tmpM = new THREE.Matrix4();

  function writeMatrix(i) {
    const o = i * 3;
    tmpV.set(pos[o], pos[o + 1], pos[o + 2]);
    tmpE.set(0, yaw[i], 0);
    tmpQ.setFromEuler(tmpE);
    const k = on[i];
    tmpS.set(size[i * 2] * k, size[i * 2 + 1] * k, size[i * 2] * k);
    tmpM.compose(tmpV, tmpQ, tmpS);
    mesh.setMatrixAt(i, tmpM);
    dirty = true;
  }

  function place(i, cx, cz) {
    let bestX = cx, bestZ = cz, bestV = -1;
    for (let n = 0; n < CANDIDATES; n++) {
      const a = Math.random() * Math.PI * 2;
      const r = radius * Math.sqrt(Math.random());
      const x = cx + Math.cos(a) * r;
      const z = cz + Math.sin(a) * r;
      const v = vegetationAmount(x, z);
      if (v > bestV) {
        bestV = v;
        bestX = x;
        bestZ = z;
      }
    }
    const o = i * 3;
    pos[o] = bestX;
    pos[o + 1] = surfaceHeight(bestX, bestZ) - 0.03; // sink the root slightly so no gap shows on slopes
    pos[o + 2] = bestZ;
    yaw[i] = Math.random() * Math.PI * 2;
    size[i * 2] = 0.5 + Math.random() * 0.4; // width — a little wider than tall, like a squat shrub
    size[i * 2 + 1] = 0.32 + Math.random() * 0.26;
    on[i] = bestV > 0.12 && Math.random() < bestV ? 1 : 0;
    writeMatrix(i);
  }

  function update(dt, ctx) {
    if (!seeded) {
      for (let i = 0; i < count; i++) place(i, ctx.x, ctx.z);
      seeded = true;
    }
    timeU.value += dt;
    const R2 = radius * radius;
    for (let n = 0; n < SLICE; n++) {
      const i = cursor;
      cursor = cursor + 1 < count ? cursor + 1 : 0;
      const o = i * 3;
      const rx = pos[o] - ctx.x;
      const rz = pos[o + 2] - ctx.z;
      if (rx * rx + rz * rz > R2) place(i, ctx.x, ctx.z);
    }
    if (dirty) {
      mesh.instanceMatrix.needsUpdate = true;
      dirty = false;
    }
    rover.value.set(ctx.x, 0, ctx.z);
  }

  return { group, update, count };
}
