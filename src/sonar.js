import * as THREE from 'three';
import { findObstacles, groundHeight } from './terrain.js';

// A scanning sonar/lidar: purely a sensor, no visible beam or light of any kind —
// just the ping markers over whatever it's found. Anything tall enough to actually
// block driving (rocks over OBSTACLE_MIN_H) lights up as a ping, coloured by how
// urgent it is. Two separate radii matter: WARN_R just flags it (HUD + a beep),
// AVOID_R is close enough that the autopilot itself leans the route around it
// (see `avoidBias`).

const RANGE = 40;
const CONE = THREE.MathUtils.degToRad(55); // half-angle of the forward detection cone
const OBSTACLE_MIN_H = 0.5; // a rock shorter than this the rover can just drive over
const WARN_R = 25;
const AVOID_R = 15; // base — a big boulder gets noticed well past this, see `reach` below
const AVOID_CORRIDOR = 3.2; // lateral half-width that counts as "in the way"
export const MAX_BIAS = THREE.MathUtils.degToRad(42);
const SCAN_EVERY = 0.08; // seconds between obstacle scans
const PING_POOL = 14;

function makePingTexture() {
  const c = document.createElement('canvas');
  c.width = c.height = 64;
  const ctx = c.getContext('2d');
  ctx.strokeStyle = 'white';
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.arc(32, 32, 22, 0, Math.PI * 2);
  ctx.stroke();
  return new THREE.CanvasTexture(c);
}

// `mount` is the rover's own root, kept for a consistent call signature even though
// nothing is actually attached to it any more — the sensor has no physical prop.
export function createSonar(mount) {
  const group = new THREE.Group(); // world-space: just the obstacle pings

  const pingTex = makePingTexture();
  const pings = Array.from({ length: PING_POOL }, () => {
    const sprite = new THREE.Sprite(
      new THREE.SpriteMaterial({ map: pingTex, transparent: true, opacity: 0, depthWrite: false, fog: false })
    );
    sprite.visible = false;
    sprite.scale.setScalar(1.1);
    group.add(sprite);
    return sprite;
  });

  const GREEN = new THREE.Color(0x6fe08a);
  const YELLOW = new THREE.Color(0xf3c25a);
  const RED = new THREE.Color(0xff5a4a);

  let scanClock = 0;
  const found = [];
  let lastScan = { warnObstacle: null, avoidBias: 0 };
  // Which way we last dodged. A boulder dead-centre in the path has a lateral offset
  // that's essentially noise (a hair left or right of zero, flipping scan to scan as
  // the rover closes in) — without this the chosen side could flip-flop right as it
  // matters most. Only trust a fresh reading once it's clearly off to one side;
  // otherwise keep whichever way was already committed to.
  let dodgeCommit = 1;

  function update(dt, x, z, yaw) {
    scanClock -= dt;
    if (scanClock > 0) return lastScan;
    scanClock = SCAN_EVERY;

    findObstacles(x, z, RANGE, OBSTACLE_MIN_H, found);
    const fwd = { x: Math.sin(yaw), z: Math.cos(yaw) };
    const right = { x: Math.cos(yaw), z: -Math.sin(yaw) };
    let pingN = 0;
    let warnObstacle = null;
    let biasSum = 0;
    let weightSum = 0;
    let maxUrgency = 0;

    for (const o of found) {
      const dx = o.x - x, dz = o.z - z;
      const along = dx * fwd.x + dz * fwd.z;
      const lateral = dx * right.x + dz * right.z;
      if (along <= 0 || Math.abs(lateral) > o.r + RANGE * Math.tan(CONE)) continue;
      const inPath = Math.abs(lateral) < AVOID_CORRIDOR + o.r;

      if (pingN < pings.length) {
        const band = o.d <= AVOID_R + o.r * 4.2 && inPath ? RED : o.d <= WARN_R && inPath ? YELLOW : GREEN;
        const s = pings[pingN++];
        s.position.set(o.x, groundHeight(o.x, o.z) + 0.4, o.z);
        s.material.color.copy(band);
        s.material.opacity = 0.75;
        s.visible = true;
      }

      if (inPath && o.d <= WARN_R && (!warnObstacle || o.d < warnObstacle.d)) warnObstacle = o;

      // A car-sized boulder needs noticing — and steering around — well before it
      // fills the windscreen, not just inside the last 15 m. Its own "reach" grows
      // with its radius, and urgency ramps up fast (front-loaded, not a plain ramp)
      // across that whole distance, so most of the turn is already committed to
      // while there's still room to make it, not squeezed into the last couple of
      // metres — that's what almost tipped the rover over reacting too late.
      if (inPath) {
        const reach = AVOID_R + o.r * 4.2;
        if (o.d <= reach) {
          const centered = clamp01(1 - Math.abs(lateral) / (AVOID_CORRIDOR + o.r));
          const urgency = centered * Math.pow(clamp01(1 - o.d / reach), 0.4);
          const side = Math.abs(lateral) > 0.25 ? Math.sign(lateral) : dodgeCommit;
          if (Math.abs(lateral) > 0.25) dodgeCommit = side;
          biasSum += -side * urgency;
          weightSum += urgency;
          if (urgency > maxUrgency) maxUrgency = urgency;
        }
      }
    }
    for (let i = pingN; i < pings.length; i++) pings[i].visible = false;

    const dir = weightSum > 0 ? biasSum / weightSum : 0;
    // Driven by the single most urgent obstacle, not the summed weight — one big
    // rock dead ahead should already steer at full strength on its own, not wait
    // for a second one to add up to it.
    const intensity = clamp01(maxUrgency * 1.6);
    lastScan = { warnObstacle, avoidBias: dir * MAX_BIAS * intensity };
    return lastScan;
  }

  return { group, update };
}

function clamp01(v) {
  return v < 0 ? 0 : v > 1 ? 1 : v;
}
