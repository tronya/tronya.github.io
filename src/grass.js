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
const COUNT = 3400;
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
  // Fixed seed: the texture must come out identical every run, or the world looks
  // different each time it is loaded.
  let seed = 7;
  const rnd = () => ((seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff);

  const BASE_X = 64;
  const BASE_Y = 126; // canvas y=128 is the card's root, see makeCrossGeometry

  // A low body first, so the clump still has some mass once distance and mipmapping
  // have eaten the thin blades, then the blades themselves over the top.
  for (let i = 0; i < 5; i++) {
    ctx.fillStyle = '#3d5a2a';
    ctx.beginPath();
    ctx.ellipse(BASE_X + (rnd() - 0.5) * 44, 108 - rnd() * 14, 18 + rnd() * 12, 12 + rnd() * 8, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  // Blades fanning up out of a common base. An irregular, broken silhouette is what
  // reads as a plant — an earlier pass used a handful of clean overlapping circles
  // and every tuft came out looking like a little cabbage.
  ctx.lineCap = 'round';
  for (let i = 0; i < 95; i++) {
    const ang = -Math.PI / 2 + (rnd() - 0.5) * 2.0; // fanned, but generally upward
    const len = 30 + rnd() * 74;
    const sx = BASE_X + (rnd() - 0.5) * 46;
    const sy = BASE_Y - rnd() * 16;
    const tipX = sx + Math.cos(ang) * len * 0.9;
    const tipY = sy + Math.sin(ang) * len;
    const midX = sx + Math.cos(ang) * len * 0.5 + (rnd() - 0.5) * 16;
    const midY = sy + Math.sin(ang) * len * 0.55;
    // Higher blades are lighter: a clump shadows itself towards its own base, and
    // that gradient does most of the work of making it look three-dimensional.
    const h = 1 - tipY / 128;
    const g = Math.round(80 + 68 * h + rnd() * 20);
    ctx.strokeStyle = `rgb(${Math.round(g * (0.6 + 0.16 * rnd()))},${g},${Math.round(g * (0.4 + 0.14 * rnd()))})`;
    ctx.lineWidth = 3.5 + rnd() * 4.5;
    ctx.beginPath();
    ctx.moveTo(sx, sy);
    ctx.quadraticCurveTo(midX, midY, tipX, tipY);
    ctx.stroke();
  }
  const tex = new THREE.CanvasTexture(c);
  tex.anisotropy = 4;
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

// Two crossed unit planes, base at y=0, tip at y=1, so a shader can weight sway by
// local y (0 at the root, full swing at the tip) and an instance matrix can scale
// it to whatever size/rotation a tuft needs. Each quad is indexed twice, once per
// winding, so both faces draw without needing DoubleSide — which matters for the
// normals below, because DoubleSide flips the normal on back faces and would point
// half of these at the ground.
function makeCrossGeometry() {
  const pos = new Float32Array([
    -0.5, 0, 0, 0.5, 0, 0, 0.5, 1, 0, -0.5, 1, 0,
    0, 0, -0.5, 0, 0, 0.5, 0, 1, 0.5, 0, 1, -0.5,
  ]);
  // Every normal points straight up rather than out of the card it belongs to. The
  // cards are vertical, so true normals face sideways and catch almost none of the
  // light that falls on the moss right beside them — which is exactly why these
  // read as black lumps scattered over a lit green field. Pointing them at the sky
  // instead (the usual trick for foliage cards) lights a tuft like the ground it
  // grows out of, and a clump of grass has no meaningful surface direction anyway.
  const nrm = new Float32Array(8 * 3);
  for (let i = 0; i < 8; i++) nrm[i * 3 + 1] = 1;
  const uv = new Float32Array([0, 0, 1, 0, 1, 1, 0, 1, 0, 0, 1, 0, 1, 1, 0, 1]);
  const idx = [0, 1, 2, 0, 2, 3, 4, 5, 6, 4, 6, 7, 0, 2, 1, 0, 3, 2, 4, 6, 5, 4, 7, 6];
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.setAttribute('normal', new THREE.BufferAttribute(nrm, 3));
  geo.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  geo.setIndex(idx);
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
  // Standard, not Lambert, and this matters more than it looks: almost all of
  // Верданта's daylight arrives as image-based light from the sky probe
  // (scene.environment, see main.js), which Standard materials gather and Lambert
  // ones essentially ignore. As Lambert these tufts came out near-black against
  // their own moss — they read as scattered rocks, not plants — and no amount of
  // brightening the texture or faking it with emissive fixed that, because the
  // ground they sit on was being lit by a light they never received.
  const material = new THREE.MeshStandardMaterial({
    map: makeTuftTexture(),
    alphaTest: 0.3,
    roughness: 1,
    metalness: 0,
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
           // Shrink tufts away over most of the outer disc rather than just its last
           // few metres: a short fade still reads as a ring of grass that follows the
           // rover around, which a long one dissolves.
           transformed *= smoothstep(uRadius, uRadius * 0.62, length(instP.xz - uRover.xz));
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
  let colorDirty = false;
  let cursor = 0;
  const tmpC = new THREE.Color();
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
    size[i * 2] = 0.42 + Math.random() * 0.3;
    size[i * 2 + 1] = 0.34 + Math.random() * 0.3;
    on[i] = bestV > 0.12 && Math.random() < bestV ? 1 : 0;
    // One texture repeated across a whole field reads as wallpaper, so each tuft
    // gets its own tint: some lush green, some dried out to straw, all of them a
    // little lighter or darker than their neighbours.
    const dry = Math.random();
    const bright = 0.78 + Math.random() * 0.42;
    tmpC.setRGB(bright * (0.9 + 0.35 * dry), bright * (1 - 0.05 * dry), bright * (0.95 - 0.45 * dry));
    mesh.setColorAt(i, tmpC);
    colorDirty = true;
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
    if (colorDirty && mesh.instanceColor) {
      mesh.instanceColor.needsUpdate = true;
      colorDirty = false;
    }
    rover.value.set(ctx.x, 0, ctx.z);
  }

  return { group, update, count };
}
