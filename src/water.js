import * as THREE from 'three';
import { terrainHeight, riverDepthAt, RIVER_DEPTH, RIVER_FILL, waterDepthAt } from './terrain.js';
import { PLANET } from './planet.js';

// The river's actual surface on Верданта. Until this existed the river was only a
// teal tint painted onto the ground, so standing in one you saw coloured dirt and
// no water at all.
//
// The whole thing is one height field and the geometry does the rest. The channel
// is carved out of the bank by RIVER_DEPTH * riverAmount (see verdantaHeight), so
// putting the surface at bank - RIVER_DEPTH * FILL means it sits above the ground
// exactly where riverAmount > FILL and is buried under it everywhere else. No
// shoreline has to be found or drawn: the terrain occludes the plane and the
// waterline falls out on its own, which is also how real water is rendered.
//
// A patch follows the rover rather than covering the world. Rebuilding it costs a
// terrainHeight per vertex, which is far too slow to do in one frame, so the next
// patch is built a slice at a time into a second mesh while the current one stays
// up, and they swap once it is finished.

const ACTIVE = PLANET === 'verdanta';
const SIZE = 180; // metres across the patch
const SEG = 72; // 2.5 m cells — the river is only ~18 m wide, so it needs the detail
const BUDGET = 280; // vertices rebuilt per frame
const WAKE = 12; // rover positions kept as expanding ripple sources
const WAKE_SPEED = 3.4; // m/s the rings travel outwards
const WAKE_LIFE = 3.2; // seconds before a ring has faded out
const CELL = SIZE / SEG;
const VERTS = (SEG + 1) * (SEG + 1);

export function createWater() {
  const group = new THREE.Group();
  if (!ACTIVE) return { group, update() {}, prime() {}, addWake() {} }; // nothing to do off Верданта

  const timeU = { value: 0 };
  // Each entry is one ripple source the rover left behind: xz where it was, w when
  // (in uTime seconds), and y its strength. Rings expand out of these, so the wake
  // stays where it was made instead of being dragged along under the rover.
  const wakeU = { value: Array.from({ length: WAKE }, () => new THREE.Vector4(0, 0, 0, -999)) };
  let wakeNext = 0;
  const material = new THREE.MeshStandardMaterial({
    color: 0x1b4753,
    transparent: true,
    vertexColors: true, // rgba: alpha carries the depth shading and the patch-edge fade
    depthWrite: false,
    roughness: 0.07, // glassy, so it picks up the sky probe and reads as water
    metalness: 0,
    side: THREE.DoubleSide,
  });
  material.onBeforeCompile = (shader) => {
    shader.uniforms.uTime = timeU;
    shader.uniforms.uWake = wakeU;
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', `#include <common>
         uniform float uTime;
         uniform vec4 uWake[${WAKE}];`)
      .replace(
        '#include <begin_vertex>',
        `#include <begin_vertex>
         // Ripple off world position, not the patch's local coordinates, so the
         // pattern stays put when the patch is rebuilt around a new origin.
         vec2 wp = (modelMatrix * vec4(transformed, 1.0)).xz;
         transformed.y += sin(wp.x * 0.55 + uTime * 1.6) * 0.035
                        + sin(wp.y * 0.81 - uTime * 1.2) * 0.028;
         // The rover's wake: every source throws one ring outwards, fading with both
         // age and distance. The ring is a single sine cycle windowed by its own
         // radius, so it reads as a travelling swell rather than endless ripples.
         for (int i = 0; i < ${WAKE}; i++) {
           vec4 w = uWake[i];
           float age = uTime - w.w;
           if (age < 0.0 || age > ${WAKE_LIFE.toFixed(1)}) continue;
           float ring = age * ${WAKE_SPEED.toFixed(1)};
           float dist = distance(wp, w.xy);
           float off = dist - ring;
           float env = exp(-off * off * 0.55) * (1.0 - age / ${WAKE_LIFE.toFixed(1)}) / (1.0 + dist * 0.35);
           transformed.y += sin(off * 2.2) * env * w.z;
         }`
      );
  };

  const meshes = [0, 1].map(() => {
    const geo = new THREE.PlaneGeometry(SIZE, SIZE, SEG, SEG);
    geo.rotateX(-Math.PI / 2);
    geo.setAttribute('color', new THREE.BufferAttribute(new Float32Array(VERTS * 4), 4));
    // Straight up, and left that way: the surface only tilts with the valley it sits
    // in, and a flat normal is both cheaper than recomputing 10k of them per rebuild
    // and closer to what water should reflect like.
    const nrm = geo.attributes.normal;
    for (let i = 0; i < VERTS; i++) nrm.setXYZ(i, 0, 1, 0);
    const m = new THREE.Mesh(geo, material);
    m.frustumCulled = false;
    m.visible = false;
    m.renderOrder = 5; // after the opaque ground it is blended against
    group.add(m);
    return m;
  });

  let front = -1; // which mesh is on screen
  let building = 0;
  let cursor = 0;
  let bx = 0;
  let bz = 0;
  let cx = 0;
  let cz = 0; // centre of the patch currently on screen

  function startBuild(x, z) {
    building = front === 0 ? 1 : 0;
    bx = Math.round(x / CELL) * CELL;
    bz = Math.round(z / CELL) * CELL;
    cursor = 0;
  }

  function stepBuild() {
    const geo = meshes[building].geometry;
    const pos = geo.attributes.position;
    const col = geo.attributes.color;
    const end = Math.min(VERTS, cursor + BUDGET);
    for (let i = cursor; i < end; i++) {
      const lx = pos.getX(i);
      const lz = pos.getZ(i);
      const wx = bx + lx;
      const wz = bz + lz;
      const r = riverDepthAt(wx, wz);
      // bank - RIVER_DEPTH * FILL, written out so riverAmount is only asked for once
      pos.setY(i, terrainHeight(wx, wz) + (r - RIVER_FILL) * RIVER_DEPTH);
      // Deep water is darker and more opaque; the last of the patch fades out so it
      // dissolves into the painted riverbed instead of ending at a visible square.
      const depth = Math.min(1, Math.max(0, (r - RIVER_FILL) * RIVER_DEPTH / 1.4));
      const edge = 1 - Math.min(1, Math.max(0, (Math.max(Math.abs(lx), Math.abs(lz)) / (SIZE / 2) - 0.72) / 0.28));
      const shallow = 0.45 + 0.55 * depth;
      col.setXYZW(i, shallow, shallow, shallow, (0.5 + 0.42 * depth) * edge);
    }
    cursor = end;
    if (cursor >= VERTS) {
      pos.needsUpdate = true;
      col.needsUpdate = true;
      geo.computeBoundingSphere();
      meshes[building].position.set(bx, 0, bz);
      meshes[building].visible = true;
      if (front >= 0) meshes[front].visible = false;
      front = building;
      cx = bx;
      cz = bz;
      cursor = -1; // idle
    }
  }

  // Drop a ripple source at a point on the surface. main.js calls this while the
  // rover is actually in the water; strength scales with how hard it is pushing.
  function addWake(x, z, strength) {
    const v = wakeU.value[wakeNext];
    wakeNext = (wakeNext + 1) % WAKE;
    v.set(x, z, strength, timeU.value);
  }

  let wakeClock = 0;

  function update(dt, ctx) {
    timeU.value += dt;

    // Leave ripples behind while the rover is actually wading through.
    wakeClock -= dt;
    const speed = Math.hypot(ctx.vx || 0, ctx.vz || 0);
    if (wakeClock <= 0 && speed > 1.2 && waterDepthAt(ctx.x, ctx.z) > 0.05) {
      wakeClock = 0.13;
      addWake(ctx.x, ctx.z, Math.min(0.4, 0.07 + speed * 0.018));
    }

    if (cursor >= 0) {
      stepBuild();
      return;
    }
    // Start the next patch well before the rover can reach the edge of this one.
    if (front < 0 || Math.hypot(ctx.x - cx, ctx.z - cz) > SIZE * 0.25) startBuild(ctx.x, ctx.z);
  }

  // The first patch has to exist before the first frame is drawn, or the rover can
  // spawn in a river and see dry ground for a few frames.
  function prime(x, z) {
    if (!ACTIVE) return;
    startBuild(x, z);
    while (cursor >= 0) stepBuild();
  }

  return { group, update, prime, addWake };
}
