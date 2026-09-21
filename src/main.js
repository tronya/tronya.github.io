import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { buildVehicle, WHEEL_R, SUSP } from './vehicle.js';
import { VehicleSim } from './physics.js';
import { createTerrain, groundHeight, terrainHeight, BASES, ROUTE_HALF, routeZ, corridorWidth } from './terrain.js';
import { buildBase } from './base.js';
import { createAudio } from './audio.js';
import { createTracks } from './tracks.js';
import { createSkyMaterial, updateSky, horizonColor } from './sky.js';

const ARRIVE_R = 70; // how close counts as docked at a base
// Fog only far from the rover. Exponential fog was fully opaque by ~500 m, which
// turned the ridges near-white. Linear fog leaves everything within FOG_NEAR
// untouched and reaches full strength exactly where the streamed terrain window
// ends (660 m), so it also hides the edge of the world.
const FOG_NEAR = 330;
const FOG_FAR = 655;
// ---------- solar rover ----------
const SOL_SECONDS = 330; // one Martian day, compressed
const BATTERY_MAX = 100;
const DRAW_IDLE = 0.12; // %/s just being alive
const DRAW_DRIVE = 0.62; // %/s at full power
const CHARGE_PEAK = 1.5; // %/s with the wings open and the sun overhead
const PANEL_SECONDS = 2.6; // time to unfold or stow
const LOW_BATTERY = 20;
const BOOST_DRAW = 4.5; // Shift is fast but drinks the pack
// Default camera: high behind the truck, looking down at it.
const CAM_BACK = 13;
const CAM_UP = 20;

// ---------- renderer / scene ----------
const renderer = new THREE.WebGLRenderer({ antialias: true });
// 2x on a Retina panel means 4x the fragments for a full-screen terrain; 1.5 keeps
// the image sharp at a fraction of the fill cost.
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
document.body.appendChild(renderer.domElement);

const scene = new THREE.Scene();
scene.fog = new THREE.Fog(0xffffff, FOG_NEAR, FOG_FAR);

const camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 2000);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.minDistance = 8;
controls.maxDistance = 80;
controls.maxPolarAngle = Math.PI / 2 - 0.03;

// ---------- sky + lighting (day / night) ----------
const sky = new THREE.Mesh(new THREE.SphereGeometry(900, 32, 16), createSkyMaterial());
sky.renderOrder = -1000;
scene.add(sky);

const envScene = new THREE.Scene();
const envSky = new THREE.Mesh(new THREE.SphereGeometry(50, 32, 16), createSkyMaterial());
envScene.add(envSky);
const pmrem = new THREE.PMREMGenerator(renderer);
let envTarget = null;

// Sun by day, moon by night: same light, different look.
const sun = new THREE.DirectionalLight(0xffffff, 1);
sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
Object.assign(sun.shadow.camera, { left: -18, right: 18, top: 18, bottom: -18, near: 1, far: 130 });
sun.shadow.bias = -0.0004;
sun.shadow.normalBias = 0.04;
scene.add(sun, sun.target);
const hemi = new THREE.HemisphereLight(0xffffff, 0x000000, 0.35);
scene.add(hemi);

// Day and night are the two ends of a continuous cycle, blended by sun height.
const LOOKS = {
  day: { light: 0xfff0dd, intensity: 2.8, sky: 0xf1c9a0, ground: 0x8a4a32, hemi: 0.35, env: 0.7, exposure: 1.0, dust: 0xc99a70, dustAlpha: 0.24 },
  night: { light: 0x9db4ff, intensity: 0.7, sky: 0x22305a, ground: 0x0a0806, hemi: 0.45, env: 0.2, exposure: 1.2, dust: 0x6b5545, dustAlpha: 0.2 },
};
const sunDir = new THREE.Vector3(0, 1, 0);
const look = { ...LOOKS.night };
const mixC = new THREE.Color();
const cA = new THREE.Color();
const cB = new THREE.Color();
let daylight = 0;
let envAt = -1;

// timeOfDay 0 = midnight, 0.5 = noon.
function applyTimeOfDay(timeOfDay) {
  const ang = (timeOfDay - 0.25) * Math.PI * 2;
  const elev = Math.sin(ang);
  sunDir.set(Math.cos(ang) * 0.55, elev, Math.cos(ang) * 0.45 + 0.18).normalize();
  sunDir.y = Math.max(elev, -0.35);
  sunDir.normalize();
  daylight = clamp((elev + 0.12) / 0.42, 0, 1);
  const k = daylight * daylight * (3 - 2 * daylight);

  const d = LOOKS.day;
  const n = LOOKS.night;
  const lerp = (a, b) => a + (b - a) * k;
  look.intensity = lerp(n.intensity, d.intensity);
  look.hemi = lerp(n.hemi, d.hemi);
  look.env = lerp(n.env, d.env);
  look.exposure = lerp(n.exposure, d.exposure);
  look.dustAlpha = lerp(n.dustAlpha, d.dustAlpha);

  updateSky(sky.material, sunDir, k);
  horizonColor(k, scene.fog.color);
  renderer.toneMappingExposure = look.exposure;
  sun.color.copy(cA.setHex(n.light)).lerp(cB.setHex(d.light), k);
  sun.intensity = look.intensity;
  hemi.color.copy(cA.setHex(n.sky)).lerp(cB.setHex(d.sky), k);
  hemi.groundColor.copy(cA.setHex(n.ground)).lerp(cB.setHex(d.ground), k);
  hemi.intensity = look.hemi;
  scene.environmentIntensity = look.env;
  mixC.setHex(n.dust).lerp(cB.setHex(d.dust), k);
  for (const p of puffs) p.sprite.material.color.copy(mixC);
  document.body.classList.toggle('night', k < 0.35);

  // The environment probe is costly; refresh it only when the light really moved.
  if (Math.abs(k - envAt) > 0.06) {
    envAt = k;
    updateSky(envSky.material, sunDir, k);
    if (envTarget) envTarget.dispose();
    envTarget = pmrem.fromScene(envScene, 0.02);
    scene.environment = envTarget.texture;
  }
}

// ---------- world ----------
const terrain = createTerrain(renderer.capabilities.getMaxAnisotropy());
scene.add(terrain.group);
terrain.prime(BASES[0].x, BASES[0].z);

const beacons = [];
for (const b of BASES) {
  const built = buildBase(b.x, b.z);
  scene.add(built.group);
  beacons.push({ ...built, x: b.x, z: b.z });
}

const tracks = createTracks();
scene.add(tracks.mesh);

const sim = new VehicleSim();
sim.reset(BASES[0].x + 40, BASES[0].z, Math.atan2(BASES[1].x - BASES[0].x, BASES[1].z - BASES[0].z));
const vehicle = buildVehicle();
scene.add(vehicle.root);
const W = vehicle.wheels.map((w, i) => ({ ...w, sim: sim.wheels[i], spinAngle: 0, dustAcc: 0 }));

// ---------- dust puffs ----------
function makeDustTexture() {
  const c = document.createElement('canvas');
  c.width = c.height = 64;
  const ctx = c.getContext('2d');
  const g = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
  g.addColorStop(0, 'rgba(255,255,255,1)');
  g.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 64, 64);
  return new THREE.CanvasTexture(c);
}
const dustTex = makeDustTexture();
const puffs = Array.from({ length: 120 }, () => {
  const sprite = new THREE.Sprite(
    new THREE.SpriteMaterial({ map: dustTex, color: 0xc99a70, transparent: true, opacity: 0, depthWrite: false })
  );
  sprite.visible = false;
  scene.add(sprite);
  return { sprite, life: 0, max: 1, vel: new THREE.Vector3() };
});
let puffCursor = 0;

function spawnPuff(x, y, z, drift) {
  const p = puffs[puffCursor++ % puffs.length];
  p.life = p.max = 0.9 + Math.random() * 0.6;
  p.sprite.position.set(x, y, z);
  p.vel.set((Math.random() - 0.5) * 0.5, 0.3 + Math.random() * 0.4, (Math.random() - 0.5) * 0.5).addScaledVector(drift, 0.5);
  p.sprite.visible = true;
}

// ---------- airborne dust ----------
// A block of motes that follows the camera and wraps around it, so a handful of
// points reads as haze blowing across the whole plain.
const DUST_N = 1400;
const DUST_BOX = 150;
const dustPos = new Float32Array(DUST_N * 3);
const dustPhase = new Float32Array(DUST_N);
for (let i = 0; i < DUST_N; i++) {
  dustPos[i * 3] = (Math.random() - 0.5) * DUST_BOX;
  dustPos[i * 3 + 1] = Math.random() * 26;
  dustPos[i * 3 + 2] = (Math.random() - 0.5) * DUST_BOX;
  dustPhase[i] = Math.random() * Math.PI * 2;
}
const dustGeo = new THREE.BufferGeometry();
dustGeo.setAttribute('position', new THREE.BufferAttribute(dustPos, 3));
// Without a map, PointsMaterial draws hard opaque squares; the soft sprite makes
// them read as motes rather than confetti.
const dustMat = new THREE.PointsMaterial({
  color: 0xc79a72, size: 0.34, sizeAttenuation: true, transparent: true,
  opacity: 0.3, depthWrite: false, map: dustTex, alphaTest: 0.01, fog: true,
});
const dustField = new THREE.Points(dustGeo, dustMat);
dustField.frustumCulled = false;
scene.add(dustField);

// Wind direction drifts slowly; gusts thicken the haze for a few seconds.
const wind = new THREE.Vector2(1, 0.3).normalize();
let gust = 0;
let gustTimer = 6 + Math.random() * 10;

function updateDust(dt, t, cam) {
  gustTimer -= dt;
  if (gustTimer <= 0) {
    gustTimer = 9 + Math.random() * 16;
    gust = 1;
  }
  gust = Math.max(0, gust - dt * 0.22);
  const ang = t * 0.035;
  wind.set(Math.cos(ang), Math.sin(ang * 0.7));
  const sp = (3.5 + 9 * gust) * dt;
  const half = DUST_BOX / 2;
  for (let i = 0; i < DUST_N; i++) {
    const k = i * 3;
    dustPos[k] += wind.x * sp + Math.sin(t * 0.8 + dustPhase[i]) * dt * 1.4;
    dustPos[k + 2] += wind.y * sp + Math.cos(t * 0.6 + dustPhase[i]) * dt * 1.4;
    dustPos[k + 1] += Math.sin(t * 0.5 + dustPhase[i] * 1.7) * dt * 0.5;
    // Wrap the block around the camera
    let dx = dustPos[k] - cam.position.x;
    let dz = dustPos[k + 2] - cam.position.z;
    if (dx > half) dustPos[k] -= DUST_BOX;
    else if (dx < -half) dustPos[k] += DUST_BOX;
    if (dz > half) dustPos[k + 2] -= DUST_BOX;
    else if (dz < -half) dustPos[k + 2] += DUST_BOX;
    const gy = groundHeight(dustPos[k], dustPos[k + 2]);
    if (dustPos[k + 1] < gy + 0.4) dustPos[k + 1] = gy + 0.4 + Math.random() * 20;
    else if (dustPos[k + 1] > gy + 30) dustPos[k + 1] = gy + 0.5;
  }
  dustGeo.attributes.position.needsUpdate = true;
  dustMat.opacity = (0.24 + 0.3 * gust) * (0.45 + 0.55 * daylight);
  dustMat.size = 0.3 + 0.22 * gust;
  return gust;
}

// ---------- headlights, cab glow ----------
const headlights = [];
const glows = [];
for (const side of [-1, 1]) {
  const spot = new THREE.SpotLight(0xfff2d6, 0, 110, 0.44, 0.7, 2);
  spot.position.set(side * 0.8, 0.36, 3.7);
  // One beam casts the shadows; two look the same from the driver's seat and cost double.
  spot.castShadow = side < 0;
  spot.shadow.mapSize.set(512, 512);
  spot.shadow.camera.near = 0.6;
  spot.shadow.camera.far = 100;
  spot.shadow.bias = -0.0004;
  spot.shadow.normalBias = 0.05;
  const aim = new THREE.Object3D();
  aim.position.set(side * 0.55, -1.9, 32);
  spot.target = aim;
  vehicle.root.add(spot, aim);
  headlights.push(spot);

  const glow = new THREE.Sprite(
    new THREE.SpriteMaterial({ map: dustTex, color: 0xfff2d6, blending: THREE.AdditiveBlending, transparent: true, depthWrite: false, fog: false })
  );
  glow.position.set(side * 0.8, 0.36, 3.84);
  glow.scale.setScalar(0.55);
  vehicle.root.add(glow);
  glows.push(glow);
}
// The rear had no light of any kind: just a flat red box that read as a dash at
// night while the nose had two haloes and two beams.
const tailGlows = [];
for (const p of vehicle.TAIL_LAMPS) {
  const glow = new THREE.Sprite(
    new THREE.SpriteMaterial({ map: dustTex, color: 0xff2e14, blending: THREE.AdditiveBlending,
      transparent: true, depthWrite: false, fog: false })
  );
  glow.position.copy(p).add(new THREE.Vector3(0, 0, -0.06));
  glow.scale.setScalar(0.42);
  vehicle.root.add(glow);
  tailGlows.push(glow);
}
// One light per lamp, not a single one on the centreline, so the glow behind reads
// as two separate lamps rather than one blob.
const tailLights = vehicle.TAIL_LAMPS.map((p) => {
  const l = new THREE.PointLight(0xff2a10, 0, 7.5, 2);
  l.position.set(p.x, p.y, p.z - 0.3);
  vehicle.root.add(l);
  return l;
});

const cabLight = new THREE.PointLight(0xff9a3c, 0, 7, 2);
cabLight.position.set(0, 0.95, 1.7);
vehicle.root.add(cabLight);

function toggleMap() {
  const hidden = mapEl.classList.toggle('hidden');
  const btn = document.getElementById('mapToggle');
  if (btn) btn.textContent = hidden ? 'Карта: вимк' : 'Карта: увімк';
}

const LAMP_MODES = ['АВТО', 'УВІМК', 'ВИМК'];
let lampMode = 0;
function cycleLamps() {
  lampMode = (lampMode + 1) % LAMP_MODES.length;
  document.getElementById('lamps').textContent = `Фари: ${LAMP_MODES[lampMode]}`;
  document.getElementById('lamps').classList.toggle('on', lampMode !== 0);
}
function lampsWanted() {
  return lampMode === 1 ? true : lampMode === 2 ? false : daylight < 0.45;
}

function setLamps(on) {
  for (const g of tailGlows) g.visible = on;
  for (const l of tailLights) l.visible = on;
  for (const l of headlights) {
    l.visible = on;
    l.intensity = on ? 1500 : 0;
  }
  for (const g of glows) g.visible = on;
  cabLight.visible = on;
  cabLight.intensity = on ? 25 : 0;
}

// ---------- audio ----------
const audio = createAudio();
const btnSound = document.getElementById('sound');
async function toggleSound() {
  if (!audio) return;
  const on = await audio.toggle();
  btnSound.classList.toggle('on', on);
  btnSound.textContent = on ? 'Звук: увімк' : 'Звук: вимк';
}
btnSound.addEventListener('click', toggleSound);

// ---------- audio settings ----------
const MIX_KEYS = ['master', 'engine', 'ground', 'ambient', 'voice'];
const menuEl = document.getElementById('menu');
function loadMix() {
  if (!audio) return;
  try {
    const saved = JSON.parse(localStorage.getItem('rover.mix') || '{}');
    for (const k of MIX_KEYS) if (typeof saved[k] === 'number') audio.setLevel(k, saved[k]);
  } catch {
    /* storage can be unavailable; defaults are fine */
  }
}
function saveMix() {
  if (!audio) return;
  try {
    localStorage.setItem('rover.mix', JSON.stringify(audio.levels));
  } catch {
    /* ignore */
  }
}
loadMix();
for (const k of MIX_KEYS) {
  const el = document.getElementById(`mix-${k}`);
  if (!el || !audio) continue;
  el.value = Math.round(audio.levels[k] * 100);
  const out = document.getElementById(`mixv-${k}`);
  out.textContent = el.value;
  el.addEventListener('input', () => {
    audio.setLevel(k, el.value / 100);
    out.textContent = el.value;
    saveMix();
  });
}
document.getElementById('menuBtn').addEventListener('click', () => menuEl.classList.toggle('show'));
document.getElementById('menuClose').addEventListener('click', () => menuEl.classList.remove('show'));
for (const tab of document.querySelectorAll('#menu .tab')) {
  tab.addEventListener('click', () => {
    for (const t of document.querySelectorAll('#menu .tab')) t.classList.toggle('on', t === tab);
    for (const b of document.querySelectorAll('#menu .tabBody')) b.classList.toggle('on', b.id === `tab-${tab.dataset.tab}`);
  });
}
document.getElementById('mapToggle').addEventListener('click', toggleMap);

// ---------- input ----------
let autopilot = false;
const keys = new Set();
const DRIVE_KEYS = new Set(['KeyW', 'KeyA', 'KeyS', 'KeyD', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space']);
window.addEventListener('keydown', (e) => {
  if (e.code === 'KeyP') return setAutopilot(!autopilot);
  if (e.code === 'KeyE') return togglePanels();
  if (e.code === 'KeyL') return cycleLamps();
  if (e.code === 'KeyK') return void toggleSound();
  if (e.code === 'KeyO') return menuEl.classList.toggle('show');
  if (e.code === 'KeyR') return resetVehicle();
  if (e.code === 'KeyH') return resetVehicle(true);
  if (e.code === 'KeyM') return toggleMap();
  keys.add(e.code);
  if (DRIVE_KEYS.has(e.code)) {
    setAutopilot(false);
    e.preventDefault();
  }
});
window.addEventListener('keyup', (e) => keys.delete(e.code));
window.addEventListener('blur', () => keys.clear());

// ---------- the crossing ----------
const trip = { target: BASES[1], docked: false, legs: 0, best: Infinity };
const hudNavDist = () => document.getElementById('navDist');

function distanceTo(b) {
  return Math.hypot(sim.pos.x - b.x, sim.pos.z - b.z);
}

// ---------- rover power state ----------
const power = { battery: BATTERY_MAX, panels: 0, wantPanels: false, charge: 0, draw: 0 };
let timeOfDay = 0.62; // start in the afternoon, wings stowed
const el = (id) => document.getElementById(id);
const hudBattery = el('battery');
const hudBatteryBar = el('batteryBar');
const hudPower = el('powerFlow');
const hudClock = el('clock');
const hudPanels = el('panelState');
const hudWarn = el('warn');

function togglePanels() {
  if (!power.wantPanels && Math.abs(sim.speed) > 0.6) {
    flash('Спершу зупинись — крила не розкласти на ходу');
    return;
  }
  power.wantPanels = !power.wantPanels;
  if (audio) audio.servo(power.wantPanels);
}

let flashUntil = 0;
function flash(msg) {
  hudWarn.textContent = msg;
  hudWarn.classList.add('show');
  flashUntil = clock.elapsedTime + 2.6;
}

const steerFill = document.getElementById('steerFill');
const steerDeg = document.getElementById('steerDeg');
const hudSpeed = document.getElementById('speed');
const hudMode = document.getElementById('mode');
const hudHint = document.getElementById('hint');
const btnAuto = document.getElementById('autopilot');
const btnReset = document.getElementById('reset');
const hudBars = W.map((w) => document.getElementById(`susp-${w.name}`));
// The autopilot parks, unfolds, charges to full, folds and carries on by itself.
const auto = { state: 'drive' };

function setAutopilot(on) {
  autopilot = on;
  if (!on) auto.state = 'drive';
  hudMode.textContent = on ? 'АВТОПІЛОТ' : 'РУЧНЕ КЕРУВАННЯ';
  btnAuto.classList.toggle('on', on);
}
btnAuto.addEventListener('click', () => setAutopilot(!autopilot));
btnReset.addEventListener('click', () => resetVehicle());
setAutopilot(false);

const clamp = (x, a, b) => Math.min(b, Math.max(a, x));
const wrapAngle = (a) => Math.atan2(Math.sin(a), Math.cos(a));
const damp = (cur, target, rate, dt) => cur + (target - cur) * (1 - Math.exp(-rate * dt));

// Righting is animated over ~0.8 s so it always visibly works, rather than the
// rover snapping upright or bouncing itself back onto its roof.
const righting = { t: 0, yaw: 0 };
function startRighting() {
  righting.t = 0.8;
  righting.yaw = sim.yaw();
}
function stepRighting(dt) {
  if (righting.t <= 0) return false;
  righting.t -= dt;
  const k = 1 - Math.exp(-9 * dt);
  const want = new THREE.Quaternion().setFromAxisAngle(UP, righting.yaw);
  sim.quat.slerp(want, k);
  const g = groundHeight(sim.pos.x, sim.pos.z);
  sim.pos.y += (g + WHEEL_R + SUSP.Lstatic + 0.35 - sim.pos.y) * k;
  sim.vel.multiplyScalar(1 - k);
  sim.angVel.multiplyScalar(1 - k);
  for (const w of sim.wheels) w.wasContact = false;
  sim.refresh();
  return true;
}

// R: back on the wheels where you are. H: back to base.
function resetVehicle(home = false) {
  if (home) {
    const b = trip.target === BASES[1] ? BASES[0] : BASES[1];
    sim.reset(b.x + 40, b.z, Math.atan2(trip.target.x - b.x, trip.target.z - b.z));
    terrain.prime(sim.pos.x, sim.pos.z);
    tracks.clear();
  } else {
    startRighting();
  }
  camYaw = sim.yaw();
}

// ---------- route map: the whole crossing, not the ground nearby ----------
const mapEl = document.getElementById('map');
const mapMarker = document.getElementById('mapMarker');
const MAP_PAD = 700;
const mapBox = { x0: -ROUTE_HALF - MAP_PAD, x1: ROUTE_HALF + MAP_PAD, z0: 0, z1: 0 };
(function buildRouteMap() {
  let zMin = Infinity;
  let zMax = -Infinity;
  for (let x = -ROUTE_HALF; x <= ROUTE_HALF; x += 40) {
    const w = corridorWidth(x);
    zMin = Math.min(zMin, routeZ(x) - w);
    zMax = Math.max(zMax, routeZ(x) + w);
  }
  mapBox.z0 = zMin - MAP_PAD * 0.5;
  mapBox.z1 = zMax + MAP_PAD * 0.5;

  const W = 760;
  const H = Math.max(90, Math.round((W * (mapBox.z1 - mapBox.z0)) / (mapBox.x1 - mapBox.x0)));
  const canvas = document.getElementById('mapCanvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = 'rgba(28,14,9,0.55)';
  ctx.fillRect(0, 0, W, H);

  const sx = (x) => ((x - mapBox.x0) / (mapBox.x1 - mapBox.x0)) * W;
  const sz = (z) => ((z - mapBox.z0) / (mapBox.z1 - mapBox.z0)) * H;

  // The drivable corridor
  ctx.beginPath();
  for (let x = -ROUTE_HALF; x <= ROUTE_HALF; x += 25) ctx.lineTo(sx(x), sz(routeZ(x) - corridorWidth(x)));
  for (let x = ROUTE_HALF; x >= -ROUTE_HALF; x -= 25) ctx.lineTo(sx(x), sz(routeZ(x) + corridorWidth(x)));
  ctx.closePath();
  ctx.fillStyle = 'rgba(196,120,72,0.5)';
  ctx.fill();
  ctx.strokeStyle = 'rgba(255,190,140,0.55)';
  ctx.lineWidth = 1;
  ctx.stroke();

  // Centre line
  ctx.beginPath();
  for (let x = -ROUTE_HALF; x <= ROUTE_HALF; x += 25) ctx.lineTo(sx(x), sz(routeZ(x)));
  ctx.strokeStyle = 'rgba(255,220,180,0.35)';
  ctx.setLineDash([5, 5]);
  ctx.stroke();
  ctx.setLineDash([]);

  for (const b of BASES) {
    ctx.fillStyle = '#4fe0ff';
    ctx.beginPath();
    ctx.arc(sx(b.x), sz(b.z), 4.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#ffe9d6';
    ctx.font = 'bold 11px ui-monospace, monospace';
    ctx.textAlign = b.x < 0 ? 'left' : 'right';
    ctx.fillText(b.name, sx(b.x) + (b.x < 0 ? 8 : -8), sz(b.z) + 4);
  }
  document.getElementById('mapView').style.aspectRatio = `${W} / ${H}`;
  const rc = document.getElementById('routeCanvas');
  rc.width = W;
  rc.height = H;
})();

// ---------- route: waypoints the autopilot drives through ----------
const route = [];
const WAYPOINT_R = 40;
const mapToWorld = (fx, fz) => ({
  x: mapBox.x0 + fx * (mapBox.x1 - mapBox.x0),
  z: mapBox.z0 + fz * (mapBox.z1 - mapBox.z0),
});
const worldToMap = (p) => ({
  x: ((p.x - mapBox.x0) / (mapBox.x1 - mapBox.x0)) * routeCtx.canvas.width,
  y: ((p.z - mapBox.z0) / (mapBox.z1 - mapBox.z0)) * routeCtx.canvas.height,
});
const routeCtx = document.getElementById('routeCanvas').getContext('2d');
const routeInfo = document.getElementById('routeInfo');

function drawRoute() {
  const c = routeCtx;
  c.clearRect(0, 0, c.canvas.width, c.canvas.height);
  routeInfo.textContent = route.length
    ? `Маршрут: ${route.length} ${route.length === 1 ? 'точка' : 'точок'}`
    : 'Маршрут порожній — клацай, щоб ставити точки';
  if (!route.length) return;

  const pts = [worldToMap(sim.pos), ...route.map(worldToMap)];
  c.setLineDash([7, 6]);
  c.strokeStyle = 'rgba(79, 208, 255, 0.85)';
  c.lineWidth = 2;
  c.beginPath();
  for (const p of pts) c.lineTo(p.x, p.y);
  c.stroke();
  c.setLineDash([]);

  pts.slice(1).forEach((p, i) => {
    c.fillStyle = i === 0 ? '#7ce68f' : '#4fe0ff';
    c.beginPath();
    c.arc(p.x, p.y, 7, 0, Math.PI * 2);
    c.fill();
    c.fillStyle = '#0d1a22';
    c.font = 'bold 10px ui-monospace, monospace';
    c.textAlign = 'center';
    c.textBaseline = 'middle';
    c.fillText(String(i + 1), p.x, p.y + 0.5);
  });
}

mapEl.addEventListener('click', (e) => {
  if (e.target.closest('#mapBar')) return;
  // First click opens the map; once open, clicks drop waypoints.
  if (!mapEl.classList.contains('big')) {
    mapEl.classList.add('big');
    drawRoute();
    return;
  }
  // Measure the map itself, not the whole box: the button bar sits below it now.
  const r = document.getElementById('mapView').getBoundingClientRect();
  const fx = (e.clientX - r.left) / r.width;
  const fz = (e.clientY - r.top) / r.height;
  if (fx < 0 || fx > 1 || fz < 0 || fz > 1) return;
  route.push(mapToWorld(fx, fz));
  drawRoute();
  if (!autopilot) {
    setAutopilot(true);
    flash('Маршрут задано — автопілот увімкнено');
  }
});
document.getElementById('mapCollapse').addEventListener('click', () => mapEl.classList.remove('big'));
document.getElementById('routeClear').addEventListener('click', () => {
  route.length = 0;
  drawRoute();
});
document.getElementById('routeUndo').addEventListener('click', () => {
  route.pop();
  drawRoute();
});

function updateMinimap() {
  mapMarker.style.left = `${((sim.pos.x - mapBox.x0) / (mapBox.x1 - mapBox.x0)) * 100}%`;
  mapMarker.style.top = `${((sim.pos.z - mapBox.z0) / (mapBox.z1 - mapBox.z0)) * 100}%`;
  mapMarker.style.transform = `translate(-50%, -50%) rotate(${180 - (sim.yaw() * 180) / Math.PI}deg)`;
}

const AUTO_LABEL = { drive: 'АВТОПІЛОТ', stopping: 'АВТОПІЛОТ: ЗУПИНКА',
  charging: 'АВТОПІЛОТ: ЗАРЯДКА', stowing: 'АВТОПІЛОТ: ЗБІР КРИЛ' };

function autopilotInput() {
  if (auto.state === 'drive' && power.battery <= 0.6) auto.state = 'stopping';
  // Someone left the wings out; fold them before moving.
  if (auto.state === 'drive' && power.panels > 0.02) {
    power.wantPanels = false;
    auto.state = 'stowing';
  }
  if (auto.state === 'stopping' && Math.abs(sim.speed) < 0.6) {
    if (!power.wantPanels) {
      power.wantPanels = true;
      if (audio) audio.servo(true);
    }
    auto.state = 'charging';
  }
  if (auto.state === 'charging' && power.battery >= 99.5) {
    power.wantPanels = false;
    if (audio) { audio.servo(false); audio.speak('Батарея заряджена. Продовжую маршрут'); }
    auto.state = 'stowing';
  }
  if (auto.state === 'stowing' && power.panels < 0.01) auto.state = 'drive';

  if (auto.state !== 'drive') return { throttle: 0, steer: 0, brake: 1, boost: false };

  const tgt = route.length ? route[0] : trip.target;
  const want = Math.atan2(tgt.x - sim.pos.x, tgt.z - sim.pos.z);
  return {
    throttle: clamp((10.5 - sim.speed) * 0.6, -1, 1),
    steerTo: clamp(wrapAngle(want - sim.yaw()) * 1.5, -1, 1),
    brake: 0,
    boost: false,
  };
}

function readInput(t) {
  if (autopilot) return autopilotInput();
  // Wings out or battery flat: no drive, but you can still coast and steer.
  if (power.panels > 0.02 || power.battery <= 0) {
    const has = (a, b) => keys.has(a) || keys.has(b);
    return {
      throttle: 0,
      steer: (has('KeyA', 'ArrowLeft') ? 1 : 0) - (has('KeyD', 'ArrowRight') ? 1 : 0),
      centre: has('KeyA', 'ArrowLeft') && has('KeyD', 'ArrowRight'),
      brake: power.panels > 0.02 ? 1 : keys.has('Space') ? 1 : 0,
      boost: false,
    };
  }
  const has = (a, b) => keys.has(a) || keys.has(b);
  const left = has('KeyA', 'ArrowLeft');
  const right = has('KeyD', 'ArrowRight');
  return {
    throttle: (has('KeyW', 'ArrowUp') ? 1 : 0) - (has('KeyS', 'ArrowDown') ? 1 : 0),
    steer: (left ? 1 : 0) - (right ? 1 : 0),
    // Holding both keys is the way back to straight ahead.
    centre: left && right,
    brake: keys.has('Space') ? 1 : 0,
    boost: keys.has('ShiftLeft') || keys.has('ShiftRight'),
  };
}

// ---------- camera ----------
const origin = new THREE.Vector3();
const camTarget = new THREE.Vector3();
const camOffset = new THREE.Vector3();
const drift = new THREE.Vector3();
const UP = new THREE.Vector3(0, 1, 0);
let camYaw = sim.yaw();
let camY = sim.pos.y;
let flippedFor = 0;

camTarget.set(sim.pos.x, sim.pos.y + 0.5, sim.pos.z);
controls.target.copy(camTarget);
camera.position.copy(camTarget).add(camOffset.set(-Math.sin(camYaw) * CAM_BACK, CAM_UP, -Math.cos(camYaw) * CAM_BACK));

// ---------- loop ----------
const clock = new THREE.Clock();
function frame() {
  const dt = Math.min(clock.getDelta(), 0.05);
  const t = clock.elapsedTime;

  if (!stepRighting(dt)) sim.update(dt, readInput(t));
  else sim.update(0.0001, { throttle: 0, steer: 0, brake: 1 });

  // Visual model follows the rigid body.
  terrain.update(sim.pos.x, sim.pos.z);
  sim.origin(origin);
  vehicle.root.position.copy(origin);
  vehicle.root.quaternion.copy(sim.quat);
  vehicle.setSteer(sim.cmd.steer);

  const speedAbs = Math.abs(sim.speed);
  W.forEach((w, i) => {
    const s = w.sim;
    const Lvis = s.contact ? clamp(s.L, SUSP.Lmin, SUSP.Lmax) : SUSP.Lmax;
    vehicle.setSuspension(i, Lvis);
    w.spin.rotation.x += s.spinRate * dt;
    hudBars[i].style.height = `${Math.round(((SUSP.Lmax - Lvis) / (SUSP.Lmax - SUSP.Lmin)) * 100)}%`;

    if (s.contact) {
      w.dustAcc += (Math.abs(s.vx) + Math.abs(s.vy)) * dt * 0.9;
      while (w.dustAcc >= 1) {
        w.dustAcc -= 1;
        drift.set(-Math.sin(sim.yaw()), 0, -Math.cos(sim.yaw())).multiplyScalar(Math.sign(s.vx) || 1);
        spawnPuff(s.cx, s.g + 0.1, s.cz, drift);
      }
    }
  });
  for (const p of puffs) {
    if (p.life <= 0) continue;
    p.life -= dt;
    if (p.life <= 0) {
      p.sprite.visible = false;
      continue;
    }
    const k = 1 - p.life / p.max;
    p.sprite.position.addScaledVector(p.vel, dt);
    p.vel.multiplyScalar(1 - 1.5 * dt);
    p.sprite.scale.setScalar(0.5 + k * 1.6);
    p.sprite.material.opacity = look.dustAlpha * (1 - k);
  }

  // Chase camera: turns with the truck's heading (not its roll/pitch, so a flip doesn't spin the view).
  const prevYaw = camYaw;
  if (sim.upY > 0.2) camYaw += wrapAngle(sim.yaw() - camYaw) * (1 - Math.exp(-3 * dt));
  camY = damp(camY, sim.pos.y, 4, dt);
  camTarget.set(sim.pos.x, camY + 0.5, sim.pos.z);
  camOffset.copy(camera.position).sub(controls.target).applyAxisAngle(UP, camYaw - prevYaw);
  camera.position.copy(camTarget).add(camOffset);
  controls.target.copy(camTarget);
  controls.update();
  const minCamY = groundHeight(camera.position.x, camera.position.z) + 0.5;
  if (camera.position.y < minCamY) camera.position.y = minCamY;

  sky.position.copy(camera.position);
  sun.position.copy(sim.pos).addScaledVector(sunDir, 60);
  sun.target.position.copy(sim.pos);

  flippedFor = sim.upY < 0.55 && speedAbs < 2.5 && righting.t <= 0 ? flippedFor + dt : 0;
  hudHint.classList.toggle('show', flippedFor > 1.0);
  // ---------- sol cycle and power ----------
  timeOfDay = (timeOfDay + dt / SOL_SECONDS) % 1;
  applyTimeOfDay(timeOfDay);
  setLamps(lampsWanted());

  const target = power.wantPanels ? 1 : 0;
  if (power.panels !== target) {
    const step = dt / PANEL_SECONDS;
    power.panels = target > power.panels ? Math.min(target, power.panels + step) : Math.max(target, power.panels - step);
  }
  vehicle.setPanels(power.panels);

  // Charging needs the wings fully open and the sun above the horizon.
  power.charge = power.panels > 0.99 ? CHARGE_PEAK * Math.max(0, sunDir.y) : 0;
  power.draw = DRAW_IDLE + DRAW_DRIVE * Math.abs(sim.cmd.throttle) * (sim.cmd.boost ? BOOST_DRAW : 1);
  const wasEmpty = power.battery <= 0;
  power.battery = clamp(power.battery + (power.charge - power.draw) * dt, 0, BATTERY_MAX);
  if (!wasEmpty && power.battery <= 0) {
    flash('Батарея розряджена — розклади крила (E)');
    if (audio) { audio.beep(300, 0.4); audio.speak('Батарея розряджена. Розклади сонячні крила'); }
  }

  const pct = (power.battery / BATTERY_MAX) * 100;
  hudBatteryBar.style.width = `${pct}%`;
  hudBatteryBar.style.background = pct < LOW_BATTERY ? '#ff4530' : power.charge > power.draw ? '#4fe06a' : '#ff9420';
  hudBattery.textContent = `${pct.toFixed(0)}%`;
  const net = power.charge - power.draw;
  hudPower.textContent = `${net >= 0 ? '+' : ''}${net.toFixed(2)} %/с`;
  hudPower.style.color = net >= 0 ? '#7ce68f' : '#ffb27a';
  const hh = Math.floor(timeOfDay * 24);
  const mm = Math.floor((timeOfDay * 24 - hh) * 60);
  hudClock.textContent = `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`;
  hudPanels.textContent =
    power.panels > 0.99 ? (power.charge > 0 ? 'КРИЛА: ЗАРЯДКА' : 'КРИЛА: ВІДКРИТІ (НЕМА СОНЦЯ)')
    : power.panels < 0.01 ? 'КРИЛА: СКЛАДЕНІ' : 'КРИЛА: РУХ…';
  hudPanels.classList.toggle('on', power.charge > 0);
  if (flashUntil && t > flashUntil) {
    hudWarn.classList.remove('show');
    flashUntil = 0;
  }

  // ---------- navigation ----------
  if (route.length && Math.hypot(sim.pos.x - route[0].x, sim.pos.z - route[0].z) < WAYPOINT_R) {
    route.shift();
    drawRoute();
    if (audio) audio.beep(route.length ? 980 : 1240, 0.12);
    if (!route.length) flash('Маршрут пройдено');
  }
  if (autopilot) hudMode.textContent = AUTO_LABEL[auto.state];
  if (mapEl.classList.contains('big') && route.length) drawRoute();

  const dist = distanceTo(trip.target);
  const other = trip.target === BASES[0] ? BASES[1] : BASES[0];
  const legTotal = Math.hypot(trip.target.x - other.x, trip.target.z - other.z);
  if (dist < ARRIVE_R && !trip.docked) {
    trip.docked = true;
    trip.legs++;
    flash(`Прибув на ${trip.target.name}. Наступна ціль: ${other.name}`);
    if (audio) { audio.beep(880); setTimeout(() => audio.beep(1180), 130); audio.speak(`Прибули на базу ${trip.target.name}`); }
    trip.target = other;
  } else if (dist > ARRIVE_R * 1.6) {
    trip.docked = false;
  }
  const bearing = Math.atan2(trip.target.x - sim.pos.x, trip.target.z - sim.pos.z);
  document.getElementById('navArrow').style.transform =
    `rotate(${((bearing - sim.yaw()) * 180) / Math.PI}deg)`;
  document.getElementById('navName').textContent = trip.target.name;
  document.getElementById('navDist').textContent =
    dist > 1500 ? `${(dist / 1000).toFixed(2)} км` : `${Math.round(dist)} м`;
  document.getElementById('navBar').style.width = `${clamp(100 * (1 - dist / legTotal), 0, 100)}%`;

  // Beacons pulse; the one you are heading for pulses harder and brighter.
  const pulse = 0.5 + 0.5 * Math.sin(t * 2.4);
  for (const b of beacons) {
    const isTarget = Math.abs(b.x - trip.target.x) < 1 && Math.abs(b.z - trip.target.z) < 1;
    const k = isTarget ? 0.45 + 0.55 * pulse : 0.3 + 0.2 * pulse;
    b.beacon.material.color.setRGB(0.15 * k, 0.78 * k, k);
    b.beam.material.opacity = (isTarget ? 0.2 : 0.09) * (0.55 + 0.45 * pulse);
    b.halo.material.opacity = (isTarget ? 0.9 : 0.45) * (0.5 + 0.5 * pulse);
    b.halo.scale.setScalar(isTarget ? 0.052 + 0.022 * pulse : 0.034);
  }

  // Tail lamps: dim running light, bright under braking or reversing.
  const braking = clamp(sim.cmd.brake + (sim.cmd.throttle < -0.05 ? 0.7 : 0), 0, 1);
  vehicle.setBrake(braking);
  const lampsLit = lampsWanted();
  for (const g of tailGlows) g.material.opacity = lampsLit ? 0.35 + 0.65 * braking : 0;
  for (const l of tailLights) l.intensity = lampsLit ? 2.2 + 8 * braking : 0;

  tracks.update(W.map((w) => ({ x: w.sim.cx, z: w.sim.cz, contact: w.sim.contact })));

  const gustNow = updateDust(dt, t, camera);
  if (audio) {
    const contacts = W.filter((w) => w.sim.contact).length / 4;
    audio.update({ speed: sim.speed, throttle: sim.cmd.throttle, contact: contacts,
      boost: sim.cmd.boost, daylight });
    // Knock when a wheel slams into its bump stop.
    for (const w of W) {
      const hard = w.sim.contact && w.sim.L < SUSP.Lmin + 0.04;
      if (hard && !w.thumped) audio.thump(clamp((SUSP.Lmin + 0.04 - w.sim.L) * 22, 0.3, 2));
      w.thumped = hard;
    }
  }

  const lockPct = sim.maxSteer > 1e-3 ? (sim.cmd.steer / sim.maxSteer) * 100 : 0;
  steerFill.style.width = `${Math.abs(lockPct) / 2}%`;
  steerFill.style.left = lockPct >= 0 ? 'auto' : '50%';
  steerFill.style.right = lockPct >= 0 ? '50%' : 'auto';
  steerDeg.textContent = `${((sim.cmd.steer * 180) / Math.PI).toFixed(0)}°`;

  hudSpeed.textContent = `${(speedAbs * 3.6).toFixed(0)} км/год`;
  updateMinimap();
  renderer.render(scene, camera);
  requestAnimationFrame(frame);
}

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// debug hook: inspect state and scrub the sol from the console
window.game = { sim, camera, controls, power, renderer, scene, terrain, route, drawRoute, auto, setTime: (t) => { timeOfDay = t % 1; }, get timeOfDay() { return timeOfDay; } };
document.getElementById('loading').classList.add('hidden');
frame();
