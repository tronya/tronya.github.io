import * as THREE from 'three';
import { waterDepthAt, waterLevelAt } from './terrain.js';
import { PLANET } from './planet.js';

// Spray thrown up by wheels crossing the river. Ballistic droplets, not a puff:
// each one leaves the tyre with the rover's own speed plus a sideways kick, arcs
// under gravity and dies the moment it falls back through the surface it came from,
// which is what makes the spray track the rover instead of hanging in the air.
//
// Kept separate from dust.js on purpose. Dust settles on the ground and lingers,
// takes the colour of whatever it was thrown off, and drifts on the wind; water
// does none of those things, and folding both into one system would have meant a
// pile of flags rather than shared code.

const ACTIVE = PLANET === 'verdanta';
const GRAVITY = 9.5; // Верданта
const POOL = 420;
const LIFE = 0.85;
const MIN_SPEED = 1.8; // below this the wheels just part the water, no spray
// Sprites take no light at all, so at night they would glow white unless dimmed by
// hand — the same problem dust.js solves the same way.
const NIGHT_FLOOR = 0.16;

function makeDropTexture() {
  const c = document.createElement('canvas');
  c.width = c.height = 48;
  const ctx = c.getContext('2d');
  const g = ctx.createRadialGradient(24, 24, 0, 24, 24, 24);
  g.addColorStop(0, 'rgba(255,255,255,1)');
  g.addColorStop(0.4, 'rgba(226,244,255,0.8)');
  g.addColorStop(1, 'rgba(198,232,245,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 48, 48);
  return new THREE.CanvasTexture(c);
}

export function createSplash() {
  const group = new THREE.Group();
  if (!ACTIVE) return { group, update() {} };

  const tex = makeDropTexture();
  const drops = Array.from({ length: POOL }, () => {
    const sprite = new THREE.Sprite(
      new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false, opacity: 0, fog: true })
    );
    sprite.visible = false;
    group.add(sprite);
    return { sprite, life: 0, size: 1, vel: new THREE.Vector3(), surface: 0 };
  });
  let next = 0;

  function spawn(x, y, z, vx, vy, vz, size) {
    const d = drops[next];
    next = (next + 1) % POOL;
    d.sprite.position.set(x, y, z);
    d.vel.set(vx, vy, vz);
    d.life = LIFE * (0.65 + Math.random() * 0.5);
    d.size = size;
    d.surface = y; // the level it must fall back through to die
    d.sprite.scale.setScalar(size);
    d.sprite.visible = true;
  }

  const stats = { alive: 0 };

  // ctx: { x, z, vx, vz, wheels: [{cx, cz, contact}], daylight }
  function update(dt, ctx) {
    dt = Math.min(dt, 0.05);
    const speed = Math.hypot(ctx.vx, ctx.vz);

    if (speed > MIN_SPEED && ctx.wheels) {
      const dirX = ctx.vx / speed;
      const dirZ = ctx.vz / speed;
      for (const wh of ctx.wheels) {
        const depth = waterDepthAt(wh.cx, wh.cz);
        if (depth <= 0.04) continue;
        // Faster and deeper throws more, but a wheel barely wet still flicks a little.
        const rate = Math.min(90, speed * (3.4 + 7.0 * Math.min(depth, 1))) * dt;
        let n = Math.floor(rate);
        if (Math.random() < rate - n) n++;
        const level = waterLevelAt(wh.cx, wh.cz);
        for (let i = 0; i < n; i++) {
          // Mostly a low sheet fanning sideways out of the tyre, with the odd
          // droplet thrown high — spray that all goes straight up reads as falling
          // snow rather than as water being shouldered aside.
          const high = Math.random() < 0.18;
          const side = (Math.random() < 0.5 ? -1 : 1) * (1.4 + Math.random() * 3.0);
          const up = high ? 2.4 + Math.random() * 2.6 : 0.7 + Math.random() * 1.5;
          spawn(
            wh.cx + (Math.random() - 0.5) * 0.8,
            level + 0.05,
            wh.cz + (Math.random() - 0.5) * 0.8,
            -dirZ * side + dirX * speed * (0.15 + Math.random() * 0.2),
            up,
            dirX * side + dirZ * speed * (0.15 + Math.random() * 0.2),
            (high ? 0.1 : 0.16) + Math.random() * 0.26
          );
        }
      }
    }

    const lit = NIGHT_FLOOR + (1 - NIGHT_FLOOR) * (ctx.daylight ?? 1);
    let alive = 0;
    for (const d of drops) {
      if (d.life <= 0) continue;
      d.life -= dt;
      if (d.life <= 0) { d.sprite.visible = false; continue; }
      d.vel.y -= GRAVITY * dt;
      const p = d.sprite.position;
      p.addScaledVector(d.vel, dt);
      // Back through the surface it was thrown from: gone.
      if (d.vel.y < 0 && p.y <= d.surface) { d.life = 0; d.sprite.visible = false; continue; }
      const t = d.life / LIFE;
      d.sprite.scale.setScalar(d.size * (1 + (1 - t) * 0.5));
      d.sprite.material.opacity = Math.min(1, t * 1.6) * 0.72 * lit;
      alive++;
    }
    stats.alive = alive;
  }

  return { group, update, stats };
}
