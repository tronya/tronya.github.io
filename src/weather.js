import * as THREE from 'three';
import { PLANET } from './planet.js';

// Weather: dust storms on Mars, rain on Верданта, nothing on the airless Moon. A
// storm comes round every few minutes, builds for half a minute, blows for a while
// and dies away. `w` (0..1) is how hard it is blowing right now; main.js reads it to
// thicken the fog, dim the sun, starve the solar panels and raise the wind. The
// particles here are just streaks in a box that travels with the camera.

const KIND = { mars: 'dust', verdanta: 'rain' }[PLANET] || null;
const N = KIND === 'rain' ? 4000 : 3000;
const HALF = KIND === 'rain' ? 45 : 60; // half the box, across
const TALL = KIND === 'rain' ? 34 : 22;

const RISE = 30;
const FALL = 35;

export const WEATHER_TEXT = {
  dust: { start: 'Насувається пилова буря — видимість падає, панелі майже не заряджають', end: 'Буря вщухла, небо прояснюється' },
  rain: { start: 'Починається злива — ґрунт слизький, сонця мало', end: 'Дощ скінчився' },
};

export function createWeather() {
  const group = new THREE.Group();
  let seed = 4242;
  const rand = () => {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed / 4294967296;
  };
  const api = {
    group,
    kind: KIND,
    w: 0,
    phase: 'clear',
    event: null,
    update() { api.event = null; return api; },
    // Debug / testing: start a storm now.
    force() {},
  };
  if (!KIND) return api;

  const pos = new Float32Array(N * 6);
  const pts = new Float32Array(N * 3);
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3).setUsage(THREE.DynamicDrawUsage));
  const mat = new THREE.LineBasicMaterial({
    color: KIND === 'rain' ? 0xc4d2d8 : 0xe0b080, transparent: true, opacity: 0, depthWrite: false,
  });
  const lines = new THREE.LineSegments(geo, mat);
  lines.frustumCulled = false;
  lines.visible = false;
  group.add(lines);
  let seeded = false;

  let t = 150 + rand() * 150; // first storm a few minutes in
  let len = 0;
  let peak = 1;
  let windAng = rand() * Math.PI * 2;
  let gust = 0;
  const wrap = (v, h) => ((((v + h) % (2 * h)) + 2 * h) % (2 * h)) - h;

  function begin() {
    api.phase = 'rise';
    t = RISE;
    peak = 0.75 + rand() * 0.25;
    len = 70 + rand() * 90;
    windAng += (rand() - 0.5) * 2;
    api.event = 'start';
  }
  // Debug: start a storm now; `now` skips the build-up straight to full blow.
  api.force = (now = false) => {
    begin();
    if (now) { api.phase = 'peak'; t = len; }
  };

  api.update = (dt, cam, daylight) => {
    api.event = null;
    t -= dt;
    if (t <= 0) {
      if (api.phase === 'clear') begin();
      else if (api.phase === 'rise') { api.phase = 'peak'; t = len; }
      else if (api.phase === 'peak') { api.phase = 'fall'; t = FALL; }
      else { api.phase = 'clear'; t = 240 + rand() * 300; api.event = 'end'; }
    }
    const ph = api.phase;
    gust += dt;
    const flutter = 0.92 + 0.08 * Math.sin(gust * 0.7) * Math.sin(gust * 1.9);
    api.w = ph === 'clear' ? 0 : ph === 'rise' ? peak * (1 - t / RISE) : ph === 'peak' ? peak * flutter : peak * (t / FALL);
    const w = api.w;
    lines.visible = w > 0.01;
    if (!lines.visible) return api;

    if (!seeded) {
      seeded = true;
      for (let i = 0; i < N; i++) {
        pts[i * 3] = cam.x + (rand() * 2 - 1) * HALF;
        pts[i * 3 + 1] = cam.y + (rand() - 0.35) * TALL;
        pts[i * 3 + 2] = cam.z + (rand() * 2 - 1) * HALF;
      }
    }
    windAng += Math.sin(gust * 0.05) * dt * 0.02;
    const wx = Math.sin(windAng);
    const wz = Math.cos(windAng);
    let vx;
    let vy;
    let vz;
    let streak;
    if (KIND === 'rain') {
      vx = wx * 4 * w;
      vy = -24;
      vz = wz * 4 * w;
      streak = 0.035;
      mat.opacity = 0.42 * w * (0.45 + 0.55 * daylight);
    } else {
      const sp = 9 + 15 * w;
      vx = wx * sp;
      vy = -0.6;
      vz = wz * sp;
      streak = 0.05;
      mat.opacity = 0.8 * w * (0.3 + 0.7 * daylight);
    }
    const n = Math.ceil(N * Math.min(1, w * 1.15));
    geo.setDrawRange(0, n * 2);
    for (let i = 0; i < n; i++) {
      const k = i * 3;
      // A little per-particle wobble so the dust swirls rather than marches.
      const jig = KIND === 'dust' ? Math.sin(i * 12.9898 + gust * 2.3) * 2.5 : 0;
      let x = pts[k] + (vx + jig * wz) * dt;
      let y = pts[k + 1] + (vy + (KIND === 'dust' ? Math.cos(i * 7.31 + gust * 1.7) * 1.2 : 0)) * dt;
      let z = pts[k + 2] + (vz - jig * wx) * dt;
      x = cam.x + wrap(x - cam.x, HALF);
      z = cam.z + wrap(z - cam.z, HALF);
      const ry = y - cam.y;
      if (ry < -TALL * 0.35) y += TALL;
      else if (ry > TALL * 0.65) y -= TALL;
      pts[k] = x;
      pts[k + 1] = y;
      pts[k + 2] = z;
      const j = i * 6;
      pos[j] = x;
      pos[j + 1] = y;
      pos[j + 2] = z;
      pos[j + 3] = x - vx * streak;
      pos[j + 4] = y - vy * streak;
      pos[j + 5] = z - vz * streak;
    }
    geo.attributes.position.needsUpdate = true;
    return api;
  };
  return api;
}
