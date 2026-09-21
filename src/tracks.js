import * as THREE from 'three';
import { surfaceHeight } from './terrain.js';

// Tyre ruts pressed into the regolith. Each segment is a shallow channel: the middle
// sits low and dark where the wheel packed the dust down, and the dust pushed aside
// piles into a lighter berm on either side. Each wheel owns a ring of segments, so
// the oldest is reused once the ring wraps and the trail stays a few hundred metres.

const STEP = 1.5; // metres of travel between segments
const TELEPORT = 25; // a jump bigger than this is a reset, not driving

// Cross-section from one side to the other. Nothing dips below the rendered surface:
// the groove reads from the height difference between berm and floor, which also
// keeps it clear of the terrain mesh instead of z-fighting it.
const BERM = [0.60, 0.41, 0.30];
const FLOOR = [0.23, 0.125, 0.085];
const LANES = [
  { off: -1.0, lift: 0.005, tint: BERM },
  { off: -0.68, lift: 0.125, tint: BERM },
  { off: -0.4, lift: 0.02, tint: FLOOR },
  { off: 0.4, lift: 0.02, tint: FLOOR },
  { off: 0.68, lift: 0.125, tint: BERM },
  { off: 1.0, lift: 0.005, tint: BERM },
];
const STRIPS = LANES.length - 1;
const VERTS_PER_SEG = STRIPS * 6;
// Which lane each vertex of a strip belongs to, for colouring.
const LANE_OF_VERT = [];
for (let l = 0; l < STRIPS; l++) LANE_OF_VERT.push(l, l + 1, l, l + 1, l + 1, l);

export function createTracks(wheels = 4, segments = 170, width = 1.05) {
  const total = wheels * segments * VERTS_PER_SEG;
  const pos = new Float32Array(total * 3);
  const nrm = new Float32Array(total * 3);
  const col = new Float32Array(total * 4);

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.setAttribute('normal', new THREE.BufferAttribute(nrm, 3));
  geo.setAttribute('color', new THREE.BufferAttribute(col, 4));

  const mat = new THREE.MeshStandardMaterial({
    vertexColors: true,
    transparent: true,
    roughness: 1,
    metalness: 0,
    depthWrite: false,
    polygonOffset: true,
    polygonOffsetFactor: -4,
    polygonOffsetUnits: -4,
  });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.frustumCulled = false; // the ring spans hundreds of metres and moves
  mesh.receiveShadow = true;
  mesh.renderOrder = 1;

  const half = width / 2;
  const head = new Int32Array(wheels);
  const filled = new Int32Array(wheels);
  const last = Array.from({ length: wheels }, () => ({ x: 0, z: 0, has: false }));

  const cx = new Float64Array(LANES.length * 2);
  const cy = new Float64Array(LANES.length * 2);
  const cz = new Float64Array(LANES.length * 2);

  function emit(w, fromX, fromZ, toX, toZ) {
    const dx = toX - fromX;
    const dz = toZ - fromZ;
    const len = Math.hypot(dx, dz) || 1;
    const rx = (dz / len) * half;
    const rz = (-dx / len) * half;

    for (let e = 0; e < 2; e++) {
      const bx = e ? toX : fromX;
      const bz = e ? toZ : fromZ;
      for (let l = 0; l < LANES.length; l++) {
        const k = e * LANES.length + l;
        cx[k] = bx + rx * LANES[l].off;
        cz[k] = bz + rz * LANES[l].off;
        cy[k] = surfaceHeight(cx[k], cz[k]) + LANES[l].lift;
      }
    }

    let o = (w * segments + head[w]) * VERTS_PER_SEG * 3;
    for (let l = 0; l < STRIPS; l++) {
      const a0 = l;
      const b0 = l + 1;
      const a1 = LANES.length + l;
      const b1 = LANES.length + l + 1;
      // One flat normal per strip, so the berm walls actually catch the light.
      const ux = cx[b0] - cx[a0];
      const uy = cy[b0] - cy[a0];
      const uz = cz[b0] - cz[a0];
      const vx = cx[a1] - cx[a0];
      const vy = cy[a1] - cy[a0];
      const vz = cz[a1] - cz[a0];
      let nx = uy * vz - uz * vy;
      let ny = uz * vx - ux * vz;
      let nz = ux * vy - uy * vx;
      const nl = Math.hypot(nx, ny, nz) || 1;
      nx /= nl;
      ny /= nl;
      nz /= nl;
      if (ny < 0) {
        nx = -nx;
        ny = -ny;
        nz = -nz;
      }

      for (const idx of [a0, b0, a1, b0, b1, a1]) {
        pos[o] = cx[idx];
        pos[o + 1] = cy[idx];
        pos[o + 2] = cz[idx];
        nrm[o] = nx;
        nrm[o + 1] = ny;
        nrm[o + 2] = nz;
        o += 3;
      }
    }

    head[w] = (head[w] + 1) % segments;
    if (filled[w] < segments) filled[w]++;
  }

  // Alpha falls off with age. Age is the distance back from the write head, so this
  // only needs rewriting when a segment is added, not every frame.
  function refade(w) {
    for (let k = 0; k < segments; k++) {
      const age = (head[w] - 1 - k + segments * 2) % segments;
      const live = filled[w] === segments || k < filled[w];
      const f = live ? Math.max(0, 1 - age / segments) : 0;
      const alpha = 0.7 * f * f;
      let o = (w * segments + k) * VERTS_PER_SEG * 4;
      for (let v = 0; v < VERTS_PER_SEG; v++) {
        const tint = LANES[LANE_OF_VERT[v]].tint;
        col[o] = tint[0];
        col[o + 1] = tint[1];
        col[o + 2] = tint[2];
        col[o + 3] = alpha;
        o += 4;
      }
    }
  }

  function clear() {
    pos.fill(0);
    col.fill(0);
    head.fill(0);
    filled.fill(0);
    for (const l of last) l.has = false;
    geo.attributes.position.needsUpdate = true;
    geo.attributes.color.needsUpdate = true;
  }

  // contacts: one {x, z, contact} per wheel, in world space
  function update(contacts) {
    let touched = false;
    for (let w = 0; w < wheels && w < contacts.length; w++) {
      const c = contacts[w];
      const l = last[w];
      if (!c.contact) {
        l.has = false; // airborne: break the trail rather than bridging the gap
        continue;
      }
      if (!l.has) {
        l.x = c.x;
        l.z = c.z;
        l.has = true;
        continue;
      }
      const d = Math.hypot(c.x - l.x, c.z - l.z);
      if (d > TELEPORT) {
        l.x = c.x;
        l.z = c.z;
        continue;
      }
      if (d < STEP) continue;
      emit(w, l.x, l.z, c.x, c.z);
      refade(w);
      l.x = c.x;
      l.z = c.z;
      touched = true;
    }
    if (touched) {
      geo.attributes.position.needsUpdate = true;
      geo.attributes.normal.needsUpdate = true;
      geo.attributes.color.needsUpdate = true;
    }
  }

  return { mesh, update, clear };
}
