import * as THREE from 'three';
import { pebbleDensity, terrainHeight, groundColorAtXZ } from './terrain.js';

// A real trailing dust cloud, not a puff that pops and vanishes. Each wheel throws
// particles behind the rover as it drives — more of them, and bigger, over sandy
// ground (pebbleDensity doubles as a sandiness field) and under wheelspin, plus a
// patchy noise field so the same speed throws very different amounts of dust from
// one stretch of road to the next (real ground isn't uniform). A particle rises and
// billows first, then gravity pulls it back down; once it touches the ground it
// settles there and only slowly fades, rather than blinking out. Through its whole
// life it keeps expanding — a tight puff at the wheel becomes a big, thin, drifting
// haze well behind the rover, not a cloud of same-size dots. A gentle constant wind
// (plus a slow gust wobble) keeps it all drifting instead of sitting dead still.
//
// The texture itself is just a soft white-to-transparent mask. Each particle's own
// colour is set once at spawn: the ground's own colour right under that wheel (see
// terrain.js's groundColorAtXZ — same field that paints the terrain mesh itself),
// mixed toward the current day/night mood (see setTint, driven by main.js's LOOKS).
// So dust thrown up crossing onto reddish ground reads reddish, onto the packed grey
// road reads paler, instead of always the same generic tan everywhere.

const GRAVITY = 3.71; // Mars
const POOL = 510;
const WIND = new THREE.Vector3(0.5, 0, 0.2);
// Sprites ignore scene lighting entirely (no normals) — left alone they render at
// full painted brightness even in pitch dark, which is exactly what made the trail
// read as a glowing cloud at night instead of the near-black haze it should be. So
// night brightness is faked by hand: a dark ambient floor everywhere, restored to
// full only where an actual light reaches — here, the tail lamps, which is what's
// actually behind the rover pointed straight down this trail.
const NIGHT_FLOOR = 0.1;
const TAIL_LIT_R = 13; // roughly the tail SpotLight's own range plus its falloff

function makeDustTexture() {
  const c = document.createElement('canvas');
  c.width = c.height = 64;
  const ctx = c.getContext('2d');
  const g = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
  g.addColorStop(0, 'rgba(255,255,255,1)');
  g.addColorStop(0.45, 'rgba(255,255,255,0.55)');
  g.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 64, 64);
  return new THREE.CanvasTexture(c);
}

// Cheap smooth 0..1 field over world space — no imports needed from terrain.js, just
// two mismatched sine waves so it never repeats in an obvious grid. Raised to a power
// in emitDust() below to turn it patchy: mostly quiet with the odd dusty stretch,
// instead of a plain smooth ramp.
function patchNoise(x, z) {
  const a = Math.sin(x * 0.013 + z * 0.021);
  const b = Math.sin(x * 0.006 - z * 0.017 + 2.4);
  const c = Math.sin((x + z) * 0.0037 - 1.1);
  return 0.5 + 0.5 * (a * 0.5 + b * 0.32 + c * 0.18);
}

export function createDustTrail() {
  const tex = makeDustTexture();
  const group = new THREE.Group();
  const particles = Array.from({ length: POOL }, () => {
    const sprite = new THREE.Sprite(
      new THREE.SpriteMaterial({ map: tex, color: 0xc99a70, transparent: true, opacity: 0, depthWrite: false, fog: true })
    );
    sprite.visible = false;
    group.add(sprite);
    return { sprite, life: 0, max: 1, base: 1, punch: 1, vel: new THREE.Vector3(), settled: false };
  });
  let cursor = 0;
  const acc = [];
  let time = 0;
  const back = new THREE.Vector3();
  const dayTint = new THREE.Color(0xc99a70);
  const groundCol = new THREE.Color();

  function spawn(x, y, z, vx, vy, vz, size, life, punch) {
    const p = particles[cursor++ % POOL];
    p.life = p.max = life;
    p.base = size;
    p.punch = punch;
    p.settled = false;
    p.sprite.position.set(x, y, z);
    p.sprite.scale.setScalar(size * 0.3);
    p.vel.set(vx, vy, vz);
    // The ground's own colour where it was kicked up, leaned toward the current
    // day/night mood rather than replaced by it — a light dusting of that mood, not
    // a full recolour, so noon on rust-red ground still reads rust-red dust.
    groundColorAtXZ(x, z, groundCol);
    p.sprite.material.color.copy(groundCol).lerp(dayTint, 0.3);
    p.sprite.visible = true;
  }

  // ctx: same shape main.js already builds for sand.js — x/z/yaw/vx/vz/wheels/
  // daylight/tail (tail-lamp position, for the night-brightness trick below).
  function update(dt, ctx) {
    time += dt;
    const gust = 1 + 0.5 * Math.sin(time * 0.11);
    const speed = Math.hypot(ctx.vx, ctx.vz);
    // Same darkening for every particle this frame bar the tail-lit ones below.
    const nightFloor = 1 - (1 - ctx.daylight) * (1 - NIGHT_FLOOR);

    ctx.wheels.forEach((w, i) => {
      if (!w.contact) return;
      const sandiness = pebbleDensity(w.cx, w.cz);
      const slip = Math.hypot(w.vx, w.vy);
      // Non-linear, patchy emission: patch is smooth ground noise, but squaring it
      // means most of the road stays fairly clean and only the peaks of the patch
      // throw real dust — a few metres later the same speed can look completely
      // different.
      const patch = 0.15 + 1.5 * Math.pow(patchNoise(w.cx, w.cz), 2.2);
      acc[i] = (acc[i] || 0) + (speed * 0.72 + slip * 2) * (0.12 + 0.9 * sandiness) * patch * dt;
      while (acc[i] >= 1) {
        acc[i] -= 1;
        // Thrown clear of the tyre, a little behind its contact patch — but a dust
        // grain is mostly still carrying the rover's own momentum, not standing
        // still in the world. Give it most of the rover's current velocity, so it
        // keeps travelling that way afterwards on its own: brake hard and the dust
        // already in the air keeps going, sailing past the now-slower rover.
        back.set(-ctx.vx, 0, -ctx.vz);
        if (back.lengthSq() > 0.01) back.normalize();
        const kick = 0.5 + Math.random() * 0.7;
        spawn(
          w.cx + (Math.random() - 0.5) * 0.6,
          w.g + 0.1,
          w.cz + (Math.random() - 0.5) * 0.6,
          ctx.vx * 0.8 + back.x * kick + (Math.random() - 0.5) * 1.5,
          1 + Math.random() * 1.35,
          ctx.vz * 0.8 + back.z * kick + (Math.random() - 0.5) * 1.5,
          1.2 + sandiness * 1.65 + Math.min(1, slip * 0.32),
          4 + Math.random() * 3 + sandiness * 2.4,
          0.26 + 0.26 * sandiness + Math.min(0.26, slip * 0.055)
        );
      }
    });

    for (const p of particles) {
      if (p.life <= 0) continue;
      p.life -= dt;
      if (p.life <= 0) {
        p.sprite.visible = false;
        continue;
      }
      const k = 1 - p.life / p.max;
      if (!p.settled) {
        // A fine grain in thin Martian air falls slower than the real 3.71 m/s² would
        // suggest — cut well down so it hangs and drifts instead of dropping out
        // almost as soon as it's thrown.
        p.vel.y -= GRAVITY * 0.26 * dt;
        p.vel.x += WIND.x * gust * dt;
        p.vel.z += WIND.z * gust * dt;
        // Lighter drag than a falling rock — thin air, fine dust — so it keeps
        // drifting and spreading well after the kick that threw it, instead of
        // stopping dead a metre from the wheel.
        p.vel.multiplyScalar(1 - 0.28 * dt);
        p.sprite.position.addScaledVector(p.vel, dt);
        const floor = terrainHeight(p.sprite.position.x, p.sprite.position.z) + 0.06;
        if (p.sprite.position.y <= floor) {
          p.sprite.position.y = floor;
          p.settled = true;
          p.vel.set(WIND.x * gust * 0.4, 0, WIND.z * gust * 0.4);
        }
      } else {
        p.sprite.position.addScaledVector(p.vel, dt);
      }
      // Keeps growing almost its whole life — a tight puff at the wheel spreads into
      // a big, thin haze well behind the rover — while opacity ramps up fast then
      // fades out over a long tail, so it reads as dispersing, not shrinking.
      const grow = Math.min(1, k * 1.1);
      const fade = k < 0.18 ? k / 0.18 : 1 - (k - 0.18) / 0.82;
      p.sprite.scale.setScalar(p.base * (0.45 + grow * 4.3));

      let bright = nightFloor;
      if (bright < 1 && ctx.tail && ctx.tail.on) {
        const dx = p.sprite.position.x - ctx.tail.x;
        const dy = p.sprite.position.y - ctx.tail.y;
        const dz = p.sprite.position.z - ctx.tail.z;
        const glow = Math.max(0, 1 - Math.sqrt(dx * dx + dy * dy + dz * dz) / TAIL_LIT_R);
        bright = Math.max(bright, glow);
      }
      p.sprite.material.opacity = p.punch * Math.max(0, fade) * (1 - grow * 0.55) * bright;
    }
  }

  return {
    group,
    update,
    setTint(color) {
      dayTint.copy(color);
    },
  };
}
