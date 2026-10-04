import * as THREE from 'three';
import { surfaceHeight, waterDepthAt, deckHeight } from './terrain.js';
import { PLANET } from './planet.js';

// Clods and stones flung out from under the tyres. Every now and then — more often
// the faster you go, the harder you pull and the bigger the wheels — a tyre throws a
// chunk of ground up and back in an arc; it lands, skips once and settles, then
// sinks away. A heavy 8×8 throws fist-sized lumps; a light car flicks out gravel.
// A hard landing after a jump throws a little burst from every wheel that hits.

const GRAVITY = PLANET === 'moon' ? 1.62 : PLANET === 'verdanta' ? 9.5 : 3.71;
const POOL = 260;
const LIFE = 3.2; // seconds on the ground before it sinks away

// Ground-matched, in two families: crumbly earth clods and harder stone chips.
const PALETTE = (PLANET === 'moon'
  ? [0x4c4c4e, 0x5e5e60, 0x3a3a3c, 0x6c6c6e]
  : PLANET === 'verdanta'
  ? [0x3a2e22, 0x4a3a2a, 0x2e2a24, 0x56524a]
  : [0x7a4428, 0x8f5432, 0x5e3522, 0xa86a42]
).map((c) => new THREE.Color(c));

function chunkGeometry() {
  const geo = new THREE.IcosahedronGeometry(1, 0);
  const p = geo.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i);
    const y = p.getY(i);
    const z = p.getZ(i);
    const h = Math.sin(x * 12.9898 + y * 78.233 + z * 37.719) * 43758.5453;
    const j = 0.6 + 0.6 * (h - Math.floor(h));
    p.setXYZ(i, x * j, y * j * 0.8, z * j);
  }
  geo.computeVertexNormals();
  return geo;
}

export function createKickup() {
  const mesh = new THREE.InstancedMesh(
    chunkGeometry(),
    new THREE.MeshStandardMaterial({ flatShading: true, roughness: 0.97, metalness: 0 }),
    POOL
  );
  mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  mesh.frustumCulled = false;
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  mesh.count = 0;
  for (let i = 0; i < POOL; i++) mesh.setColorAt(i, PALETTE[0]);

  const P = Array.from({ length: POOL }, () => ({
    x: 0, y: 0, z: 0, vx: 0, vy: 0, vz: 0, rx: 0, ry: 0, rz: 0, wx: 0, wy: 0, wz: 0,
    s: 0.1, t: 0, rest: false, skips: 0, col: 0,
  }));
  let live = 0; // P[0..live) are in flight or resting
  const wasDown = [];
  const acc = [];
  const tmpM = new THREE.Matrix4();
  const tmpQ = new THREE.Quaternion();
  const tmpE = new THREE.Euler();
  const tmpV = new THREE.Vector3();
  const tmpS = new THREE.Vector3();
  let enabled = true;

  function spawn(x, z, fx, fz, speed, R, burst) {
    if (live >= POOL) return;
    if (waterDepthAt(x, z) > 0.05) return;
    if (deckHeight(x, z) > -Infinity) return; // nothing to dig out of a steel deck
    const p = P[live++];
    const big = R * (burst ? 1.1 : 1);
    // Mostly small stuff, now and then a proper lump.
    p.s = big * (0.025 + Math.pow(Math.random(), 3) * 0.08);
    const back = speed * (0.25 + Math.random() * 0.35);
    const side = (Math.random() - 0.5) * (1.5 + speed * 0.15);
    const up = (burst ? 2.5 : 1.8) + Math.random() * (2 + speed * 0.22) * Math.sqrt(R);
    // Thrown back off the tread, out past the tyre, and up.
    p.x = x - fx * R * 0.6 + (Math.random() - 0.5) * 0.4;
    p.z = z - fz * R * 0.6 + (Math.random() - 0.5) * 0.4;
    p.y = surfaceHeight(p.x, p.z) + 0.15 + p.s;
    p.vx = -fx * back + fz * side;
    p.vz = -fz * back - fx * side;
    p.vy = up;
    p.rx = Math.random() * 6;
    p.ry = Math.random() * 6;
    p.rz = Math.random() * 6;
    p.wx = (Math.random() - 0.5) * 18;
    p.wy = (Math.random() - 0.5) * 18;
    p.wz = (Math.random() - 0.5) * 18;
    p.t = 0;
    p.rest = false;
    p.skips = 0;
    p.col = Math.floor(Math.random() * PALETTE.length);
  }

  // ctx: { wheels: [{ x, z, contact, R }], speed, throttle, fx, fz, offroad }
  function update(dt, ctx) {
    if (!enabled) { mesh.count = 0; live = 0; return; }
    const v = Math.abs(ctx.speed);
    const fx = Math.sign(ctx.speed || 1) * ctx.fx;
    const fz = Math.sign(ctx.speed || 1) * ctx.fz;
    ctx.wheels.forEach((w, i) => {
      if (acc[i] === undefined) { acc[i] = Math.random(); wasDown[i] = true; }
      if (w.contact) {
        // Landing hard: a short spray from that tyre.
        if (!wasDown[i] && v > 4) for (let n = 0; n < 1 + Math.floor(w.R * 1.5); n++) spawn(w.x, w.z, fx, fz, v, w.R, true);
        // Steady flinging: grows with speed and pull, with tyre size (a big tyre
        // churns more ground per turn), and much less on the graded road.
        const rate = Math.max(0, v - 4) * 0.022 * (0.55 + 0.9 * Math.abs(ctx.throttle)) * Math.pow(w.R, 1.6) * (0.35 + 0.65 * ctx.offroad);
        acc[i] -= rate * dt;
        if (acc[i] <= 0) {
          acc[i] += 0.4 + Math.random() * 1.6; // irregular, not a metronome
          spawn(w.x, w.z, fx, fz, v, w.R, false);
        }
      }
      wasDown[i] = w.contact;
    });

    for (let i = 0; i < live; i++) {
      const p = P[i];
      if (!p.rest) {
        p.vy -= GRAVITY * dt;
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.z += p.vz * dt;
        p.rx += p.wx * dt;
        p.ry += p.wy * dt;
        p.rz += p.wz * dt;
        const g = surfaceHeight(p.x, p.z) + p.s * 0.6;
        if (p.y < g) {
          p.y = g;
          if (p.skips < 1 && p.vy < -1.5) {
            p.vy *= -0.28;
            p.vx *= 0.45;
            p.vz *= 0.45;
            p.wx *= 0.5;
            p.wy *= 0.5;
            p.wz *= 0.5;
            p.skips++;
          } else {
            p.rest = true;
          }
        }
      } else {
        p.t += dt;
      }
      if (p.t > LIFE) {
        // Swap the last live one in and look at this slot again.
        P[i] = P[live - 1];
        P[live - 1] = p;
        live--;
        i--;
      }
    }

    for (let i = 0; i < live; i++) {
      const p = P[i];
      // Sinks into the ground over its last half second.
      const fade = p.rest ? Math.min(1, (LIFE - p.t) / 0.5) : 1;
      tmpV.set(p.x, p.y - (1 - fade) * p.s, p.z);
      tmpQ.setFromEuler(tmpE.set(p.rx, p.ry, p.rz));
      tmpS.setScalar(p.s * Math.max(0.05, fade));
      tmpM.compose(tmpV, tmpQ, tmpS);
      mesh.setMatrixAt(i, tmpM);
      mesh.setColorAt(i, PALETTE[p.col]);
    }
    mesh.count = live;
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  }

  return {
    mesh,
    update,
    get live() { return live; },
    setEnabled(on) { enabled = on; },
  };
}
