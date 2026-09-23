import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { buildVehicle, WHEEL_R, SUSP } from './vehicle.js';
import { VehicleSim } from './physics.js';
import { createTerrain, groundHeight, terrainHeight, BASES, roadSpawn, setViewScale } from './terrain.js';
import { buildBase } from './base.js';
import { createAudio } from './audio.js';
import { createTracks } from './tracks.js';
import { createSand } from './sand.js';
import { createRoadPosts } from './roadposts.js';
import { createMissions } from './missions.js';
import { createDustTrail } from './dust.js';
import { createSonar, MAX_BIAS as SONAR_MAX_BIAS } from './sonar.js';
import { createMinimap3D } from './minimap3d.js';
import { createSkyMaterial, updateSky, horizonColor } from './sky.js';

const ARRIVE_R = 70; // how close counts as docked at a base
// Fog only far from the rover. Exponential fog was fully opaque by ~500 m, which
// turned the ridges near-white. Linear fog leaves everything within FOG_NEAR
// untouched and reaches full strength exactly where the streamed terrain window
// ends (660 m), so it also hides the edge of the world.
const FOG_NEAR = 594;
const FOG_FAR = 1179;
// ---------- solar rover ----------
const SOL_SECONDS = 330; // one Martian day, compressed
const BATTERY_MAX = 100;
const DRAW_IDLE = 0.12; // %/s just being alive
const DRAW_DRIVE = 0.62; // %/s at full power
const CHARGE_PEAK = 1.5; // %/s with the wings open and the sun overhead
const PANEL_SECONDS = 2.6; // time to unfold or stow
const LOW_BATTERY = 20;
const BOOST_DRAW = 4.5; // Shift is fast but drinks the pack
// Default camera: low behind the truck.
const CAM_BACK = 13;
const CAM_UP = 2;
// Cinematic camera modes, cycled with C. Chase/far still turn with the truck's
// heading and can be dragged/zoomed by hand (same trick as the default camera);
// top-down and orbit are fully automatic and lock out manual control.
const CAM_MODES = ['chase', 'far', 'top', 'orbit'];
const CAM_FAR_BACK = 34;
const CAM_FAR_UP = 13;
const CAM_TOP_HEIGHT = 55;
const CAM_ORBIT_RADIUS = 70;
const CAM_ORBIT_HEIGHT = 35;
const CAM_ORBIT_SPEED = 0.15; // rad/s, slow reveal, not a spin

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
sun.shadow.mapSize.set(4096, 4096);
Object.assign(sun.shadow.camera, { left: -250, right: 250, top: 250, bottom: -250, near: 1, far: 400 });
sun.shadow.bias = -0.0004;
sun.shadow.normalBias = 0.04;
scene.add(sun, sun.target);
const hemi = new THREE.HemisphereLight(0xffffff, 0x000000, 0.35);
scene.add(hemi);

// Day and night are the two ends of a continuous cycle, blended by sun height.
const LOOKS = {
  day: { light: 0xfff0dd, intensity: 2.8, sky: 0xf1c9a0, ground: 0x8a4a32, hemi: 0.35, env: 0.7, exposure: 1.0, dust: 0x9d6d44 },
  night: { light: 0x9db4ff, intensity: 0.7, sky: 0x22305a, ground: 0x0a0806, hemi: 0.45, env: 0.2, exposure: 1.2, dust: 0x5a3d2b },
};
const sunDir = new THREE.Vector3(0, 1, 0);
const look = { ...LOOKS.night };
const mixC = new THREE.Color();
const cA = new THREE.Color();
const cB = new THREE.Color();
let daylight = 0;
let envAt = -1;

// The sun is up between these hours; the rest of the sol is night.
const SUNRISE = 5 / 24;
const SUNSET = 21 / 24;
const DAY_SPAN = SUNSET - SUNRISE;

// Its arc is half a circle either way, but stretched over the long day and squeezed
// into the short night, rather than a plain sine that would split the sol evenly.
function sunAngle(t) {
  if (t >= SUNRISE && t < SUNSET) return (Math.PI * (t - SUNRISE)) / DAY_SPAN;
  const intoNight = t < SUNRISE ? t + 1 - SUNSET : t - SUNSET;
  return Math.PI + (Math.PI * intoNight) / (1 - DAY_SPAN);
}

// timeOfDay 0 = midnight, 0.5 = noon.
function applyTimeOfDay(timeOfDay) {
  const ang = sunAngle(timeOfDay);
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
  dust.setTint(mixC);
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
const drawSize = new THREE.Vector2();
const sandCtx = { x: 0, z: 0, yaw: 0, vx: 0, vz: 0, wheels: [], daylight: 1, pxPerUnit: 1000, head: { on: false, x: 0, y: 0, z: 0, dx: 0, dz: 1 } };
const roadPosts = createRoadPosts();
scene.add(roadPosts.group);
const missions = createMissions();
scene.add(missions.group);
const sand = createSand();
scene.add(sand.points);
scene.add(tracks.mesh);

const sim = new VehicleSim();
{
  const sp = roadSpawn(false);
  sim.reset(sp.x, sp.z, sp.yaw);
}
const vehicle = buildVehicle();
scene.add(vehicle.root);
const W = vehicle.wheels.map((w, i) => ({ ...w, sim: sim.wheels[i], spinAngle: 0 }));

// ---------- dust trail ----------
// A CanvasTexture for headlight glow/impact flashes elsewhere in this file — the
// trailing dust cloud now has its own softer texture, see dust.js.
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
const dust = createDustTrail();
scene.add(dust.group);
const sonar = createSonar(vehicle.root);
scene.add(sonar.group);
let sonarScan = { warnObstacle: null, avoidBias: 0 };
let sonarWarned = false;

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
// The roof bar is a long-range spot: a narrow, strong beam that reaches far ahead of
// the two headlights. It is on with full headlights only.
const farLight = new THREE.SpotLight(0xfff6e4, 0, 320, 0.13, 0, 2);
farLight.position.set(0, 1.4, 2.0);
// It casts shadows too, so rocks far down the beam are not flat blobs. The narrow cone
// keeps the map sharp: ~1 cm per texel a hundred metres out.
farLight.castShadow = true;
farLight.shadow.mapSize.set(1024, 1024);
farLight.shadow.camera.near = 2;
farLight.shadow.camera.far = 350;
farLight.shadow.bias = -0.0003;
farLight.shadow.normalBias = 0.05;
// The bar is a rectangle, so the beam is too: project a soft-edged wide rectangle
// through the cone instead of the usual round pool.
{
  const N = 128;
  const px = new Uint8Array(N * N * 4);
  const hw = 0.8; // half-width and half-height inside the [-1, 1] projection square
  const hh = 0.42;
  const soft = 0.16;
  for (let y = 0; y < N; y++) {
    for (let x = 0; x < N; x++) {
      const u = Math.abs((x + 0.5) / N * 2 - 1);
      const v = Math.abs((y + 0.5) / N * 2 - 1);
      const k = (1 - THREE.MathUtils.smoothstep(u, hw - soft, hw)) * (1 - THREE.MathUtils.smoothstep(v, hh - soft, hh));
      const o = (y * N + x) * 4;
      px[o] = px[o + 1] = px[o + 2] = Math.round(255 * k);
      px[o + 3] = 255;
    }
  }
  const tex = new THREE.DataTexture(px, N, N, THREE.RGBAFormat);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.minFilter = tex.magFilter = THREE.LinearFilter;
  tex.needsUpdate = true;
  farLight.map = tex;
}
const farAim = new THREE.Object3D();
farAim.position.set(0, -0.8, 110);
farLight.target = farAim;
vehicle.root.add(farLight, farAim);
const farUpLocal = new THREE.Vector3(0, 1, 0); // the truck's own up, before rotation

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
// One lamp per side, and each throws its light backwards. A point light at the tail
// also lit the ground under the whole body, which read as a red glow from nowhere.
const tailLights = vehicle.TAIL_LAMPS.map((p) => {
  const l = new THREE.SpotLight(0xff2a10, 0, 10, 0.8, 1, 2);
  l.position.set(p.x, p.y - 0.1, p.z - 0.15);
  const aim = new THREE.Object3D();
  aim.position.set(p.x * 1.4, -1.6, p.z - 9);
  l.target = aim;
  vehicle.root.add(l, aim);
  return l;
});

// The amber marker strips also spill a little light on the ground at the sides, at
// night. They are spots aimed outwards: a point light under the sill lit the ground
// beneath the body too, which read as a glow coming from under the truck.
const markerLights = [-1, 1].map((side) => {
  const l = new THREE.SpotLight(0xffa030, 0, 6, 0.6, 1, 2);
  l.position.set(side * 1.55, -0.2, 0.1);
  const aim = new THREE.Object3D();
  aim.position.set(side * 4.2, -1.6, 0.1);
  l.target = aim;
  vehicle.root.add(l, aim);
  return l;
});

const cabLight = new THREE.PointLight(0xff9a3c, 0, 3, 2);
cabLight.position.set(0, 1.0, 1.7); // short reach: it lit the ground under the whole body
vehicle.root.add(cabLight);

function toggleSand() {
  sand.setEnabled(!sand.enabled);
  const btn = document.getElementById('sandToggle');
  btn.textContent = sand.enabled ? 'Камінці: увімк' : 'Камінці: вимк';
  btn.classList.toggle('on', sand.enabled);
}

// L cycles: auto (the default) -> off -> marker lights only -> full headlights.
// Levels: 0 nothing, 1 marker lights (amber sides, red tail), 2 marker lights + headlights.
const LAMP_MODES = [
  { label: 'АВТО', level: null },
  { label: 'ВИМК', level: 0 },
  { label: 'ГАБАРИТИ', level: 1 },
  { label: 'ФАРИ', level: 2 },
];
let lampMode = 0;
function cycleLamps() {
  lampMode = (lampMode + 1) % LAMP_MODES.length;
  document.getElementById('lamps').textContent = `Світло: ${LAMP_MODES[lampMode].label}`;
  document.getElementById('lamps').classList.toggle('on', lampMode !== 0);
}
function lampLevel() {
  const fixed = LAMP_MODES[lampMode].level;
  return fixed !== null ? fixed : daylight < 0.45 ? 2 : 0;
}

const HEAD_INTENSITY = 2200;
const FAR_INTENSITY = 20000;
function setLamps(level) {
  const marks = level >= 1;
  const heads = level >= 2;
  for (const g of tailGlows) g.visible = marks;
  for (const l of tailLights) l.visible = marks;
  for (const l of markerLights) l.visible = marks;
  for (const l of headlights) {
    l.visible = heads;
    l.intensity = heads ? HEAD_INTENSITY : 0;
  }
  // The nose and roof bars glow as position lights in marker mode, brighter with the beams.
  for (const g of glows) {
    g.visible = marks;
    g.material.opacity = heads ? 1 : 0.4;
  }
  cabLight.visible = heads;
  cabLight.intensity = heads ? 25 : 0;
  farLight.visible = heads;
  farLight.intensity = heads ? FAR_INTENSITY : 0;
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
document.getElementById('sandToggle').addEventListener('click', toggleSand);

// ---------- graphics settings ----------
document.getElementById('viewDist').addEventListener('input', (e) => {
  const k = e.target.value / 100;
  document.getElementById('viewDistV').textContent = `${e.target.value}%`;
  setViewScale(k);
  scene.fog.near = FOG_NEAR * k;
  scene.fog.far = FOG_FAR * k;
});
const btnShadows = document.getElementById('shadowsToggle');
btnShadows.addEventListener('click', () => {
  const on = !renderer.shadowMap.enabled;
  renderer.shadowMap.enabled = on;
  scene.traverse((o) => { if (o.material) o.material.needsUpdate = true; });
  btnShadows.textContent = `Тіні: ${on ? 'увімк' : 'вимк'}`;
  btnShadows.classList.toggle('on', on);
});
let dynamicLight = true;
const btnDynLight = document.getElementById('dynLightToggle');
btnDynLight.addEventListener('click', () => {
  dynamicLight = !dynamicLight;
  btnDynLight.textContent = `Динамічне світло: ${dynamicLight ? 'увімк' : 'вимк'}`;
  btnDynLight.classList.toggle('on', dynamicLight);
});

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
  if (e.code === 'KeyJ') return toggleSand();
  if (e.code === 'KeyC') return cycleCamera();
  keys.add(e.code);
  if (DRIVE_KEYS.has(e.code)) {
    setAutopilot(false);
    e.preventDefault();
  }
});
window.addEventListener('keyup', (e) => keys.delete(e.code));
window.addEventListener('blur', () => keys.clear());

// ---------- odometer ----------
const odo = { trip: 0, total: 0, last: null, savedAt: 0 };
try { odo.total = Number(localStorage.getItem('rover.odo')) || 0; } catch (e) { /* storage may be blocked */ }
const hudOdoTrip = document.getElementById('odoTrip');
const hudOdoTotal = document.getElementById('odoTotal');
const hudMissions = document.getElementById('missionStat');
const fmtDist = (m) => (m >= 1000 ? `${(m / 1000).toFixed(2)} км` : `${Math.round(m)} м`);
document.getElementById('odoRow').addEventListener('click', () => { odo.trip = 0; });
function stepOdometer(t) {
  if (odo.last) {
    const d = Math.hypot(sim.pos.x - odo.last.x, sim.pos.z - odo.last.z);
    if (d < 30) { odo.trip += d; odo.total += d; } // a bigger jump is a teleport, not driving
  }
  odo.last = { x: sim.pos.x, z: sim.pos.z };
  hudOdoTrip.textContent = fmtDist(odo.trip);
  hudOdoTotal.textContent = fmtDist(odo.total);
  if (t > odo.savedAt) {
    odo.savedAt = t + 3;
    try { localStorage.setItem('rover.odo', String(Math.round(odo.total))); } catch (e) { /* ignore */ }
  }
}

// ---------- the crossing ----------
const trip = { target: BASES[1], docked: false, legs: 0, best: Infinity };

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

const hudSpeed = document.getElementById('speed');
const hudMode = document.getElementById('mode');
const hudHint = document.getElementById('hint');
const btnAuto = document.getElementById('autopilot');
const btnReset = document.getElementById('reset');
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
    const sp = roadSpawn(b === BASES[1]);
    sim.reset(sp.x, sp.z, sp.yaw);
    odo.last = null;
    terrain.prime(sim.pos.x, sim.pos.z);
    tracks.clear();
  } else {
    startRighting();
  }
  camYaw = sim.yaw();
}

// ---------- route: waypoints the autopilot drives through ----------
// The map parks small in the corner, turning slowly like a display model. A tap
// opens it into a big, orbitable dialog (drag to rotate, wheel to zoom); tapping
// its ground there — a tap, not a drag — drops a waypoint. The autopilot only ever
// drives through waypoints you've placed, never straight at a base on its own.
const route = [];
const WAYPOINT_R = 40;
const map3dEl = document.getElementById('map3d');
const routeInfo = document.getElementById('routeInfo');
const minimap = createMinimap3D(document.getElementById('map3dCanvas'), document.getElementById('map3dOverlay'), missions.modules);

function updateRouteInfo() {
  routeInfo.textContent = route.length
    ? `Маршрут: ${route.length} ${route.length === 1 ? 'точка' : 'точок'}`
    : 'Маршрут порожній — клацай по карті, щоб ставити точки';
  minimap.setRoute(route);
}

minimap.setOnAdd((x, z) => {
  route.push({ x, z });
  updateRouteInfo();
  if (!autopilot) {
    setAutopilot(true);
    flash('Маршрут задано — автопілот увімкнено');
  }
});

function openMap() {
  map3dEl.classList.add('big');
  minimap.setBig(true);
  minimap.resize();
}
function closeMap() {
  map3dEl.classList.remove('big');
  minimap.setBig(false);
  minimap.resize();
}
minimap.setOnTapSmall(openMap);
document.getElementById('mapClose').addEventListener('click', closeMap);

function toggleMap() {
  const hidden = map3dEl.classList.toggle('hidden');
  const btn = document.getElementById('mapToggle');
  if (btn) btn.textContent = hidden ? 'Карта: вимк' : 'Карта: увімк';
  if (hidden) closeMap();
  else minimap.resize();
}
document.getElementById('routeClear').addEventListener('click', () => {
  route.length = 0;
  updateRouteInfo();
});
document.getElementById('routeUndo').addEventListener('click', () => {
  route.pop();
  updateRouteInfo();
});
window.addEventListener('resize', () => {
  if (!map3dEl.classList.contains('hidden')) minimap.resize();
});
updateRouteInfo();
minimap.resize();

// ---------- compass ----------
// A ribbon that scrolls under a fixed centre marker, the way a real heading tape
// does: a world direction's mark slides toward the centre as you turn to face it.
// It floats with no backing panel, so every stroke gets a dark outline first —
// that, not the tick spacing, is what keeps it legible over bright ground too.
const compassCtx = document.getElementById('compassCanvas').getContext('2d');
const CARDINAL = { 0: 'Пн', 90: 'Сх', 180: 'Пд', 270: 'Зх' };
const HALF_WINDOW = 62; // degrees shown either side of centre
function wrapDeg(d) {
  return ((d % 360) + 360) % 360;
}
function outlinedText(c, text, x, y) {
  c.lineWidth = 3;
  c.strokeStyle = 'rgba(20, 10, 6, 0.85)';
  c.strokeText(text, x, y);
  c.fillText(text, x, y);
}
function drawCompass(yaw, waypoints) {
  const c = compassCtx;
  const w = c.canvas.width;
  const h = c.canvas.height;
  const headingDeg = wrapDeg((yaw * 180) / Math.PI);
  const pxPerDeg = w / 130;
  const cx = w / 2;
  c.clearRect(0, 0, w, h);
  c.textAlign = 'center';
  c.textBaseline = 'alphabetic';

  // Ticks and labels are generated straight from world degrees (multiples of 10,
  // major every 30), never from a fixed screen step — that's what made numbers
  // wink in and out before: a screen-spaced sample could skip right past a round
  // number as the heading changed, and land on nothing to draw.
  const first = Math.ceil((headingDeg - HALF_WINDOW) / 10) * 10;
  for (let deg = first; deg <= headingDeg + HALF_WINDOW; deg += 10) {
    const d = deg - headingDeg;
    const x = cx + d * pxPerDeg;
    if (x < -10 || x > w + 10) continue;
    const wrapped = wrapDeg(deg);
    const major = wrapped % 30 === 0;
    c.lineWidth = major ? 4.2 : 2.6;
    c.strokeStyle = 'rgba(20, 10, 6, 0.85)';
    c.beginPath();
    c.moveTo(x, h - (major ? 20 : 12));
    c.lineTo(x, h - 4);
    c.stroke();
    c.lineWidth = major ? 1.8 : 1.1;
    c.strokeStyle = major ? 'rgba(255, 214, 176, 0.95)' : 'rgba(255, 214, 176, 0.55)';
    c.beginPath();
    c.moveTo(x, h - (major ? 20 : 12));
    c.lineTo(x, h - 4);
    c.stroke();
    if (major) {
      c.font = 'bold 12px ui-monospace, monospace';
      c.fillStyle = CARDINAL[wrapped] ? '#7ce6ff' : '#ffd6b0';
      outlinedText(c, CARDINAL[wrapped] || String(wrapped), x, h - 26);
    }
  }

  // Waypoints: where each numbered route point actually lies, as a badge above the
  // ribbon — the same idea as an objective marker on a game compass. A bare triangle
  // was too small to hold a legible digit, so this is a numbered disc instead, the
  // same shape and colour as its marker on the map.
  if (waypoints) {
    const r = 9;
    const badgeY = 13;
    for (const wp of waypoints) {
      let d = ((wp.bearing - headingDeg + 180) % 360 + 360) % 360 - 180;
      if (Math.abs(d) > HALF_WINDOW) continue;
      const x = cx + d * pxPerDeg;
      // Tail pointing down at the ribbon, then the disc on top of it.
      c.fillStyle = wp.color;
      c.beginPath();
      c.moveTo(x - 5, badgeY + r - 2);
      c.lineTo(x + 5, badgeY + r - 2);
      c.lineTo(x, badgeY + r + 7);
      c.closePath();
      c.fill();
      c.beginPath();
      c.arc(x, badgeY, r, 0, Math.PI * 2);
      c.fillStyle = wp.color;
      c.fill();
      c.lineWidth = 2;
      c.strokeStyle = 'rgba(20, 10, 6, 0.9)';
      c.stroke();
      c.fillStyle = '#0d1a22';
      c.font = 'bold 11px ui-monospace, monospace';
      c.textBaseline = 'middle';
      c.fillText(String(wp.n), x, badgeY + 1);
      c.textBaseline = 'alphabetic';
    }
  }

  c.lineWidth = 3;
  c.strokeStyle = 'rgba(20, 10, 6, 0.8)';
  c.beginPath();
  c.moveTo(cx, 2);
  c.lineTo(cx, h - 2);
  c.stroke();
  c.lineWidth = 1.6;
  c.strokeStyle = '#4fe0ff';
  c.beginPath();
  c.moveTo(cx, 2);
  c.lineTo(cx, h - 2);
  c.stroke();
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
  // No waypoints plotted: sit tight rather than heading for a base on its own.
  if (!route.length) return { throttle: 0, steer: 0, brake: 1, boost: false };

  const tgt = route[0];
  const want = Math.atan2(tgt.x - sim.pos.x, tgt.z - sim.pos.z) + sonarScan.avoidBias;
  // A rock dead ahead with no clear side (avoidBias pinned near its max both ways
  // cancel toward the corridor centre, but the beam still reports it as crowded):
  // ease off rather than forcing the turn through it.
  const dodgeLoad = Math.abs(sonarScan.avoidBias) / SONAR_MAX_BIAS;
  // A hard swerve at full speed is how it nearly tipped over — bleed off real speed
  // (not just throttle) once the dodge gets serious, so the turn happens slower.
  return {
    throttle: clamp((10.5 - sim.speed) * 0.6, -1, 1) * (1 - 0.7 * dodgeLoad),
    steerTo: clamp(wrapAngle(want - sim.yaw()) * 1.5, -1, 1),
    brake: dodgeLoad > 0.55 ? (dodgeLoad - 0.55) * 1.4 : 0,
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
const UP = new THREE.Vector3(0, 1, 0);
let camYaw = sim.yaw();
let camY = sim.pos.y;
let flippedFor = 0;
let camMode = 0;
let orbitAngle = 0;
const btnCamera = document.getElementById('camBtn');
const CAM_LABEL = { chase: 'ближня', far: 'дальня', top: 'згори', orbit: 'оберт' };
function presetOffset(mode, yaw) {
  const [back, up] = mode === 'far' ? [CAM_FAR_BACK, CAM_FAR_UP] : [CAM_BACK, CAM_UP];
  return new THREE.Vector3(-Math.sin(yaw) * back, up, -Math.cos(yaw) * back);
}
function setCamMode(i) {
  camMode = ((i % CAM_MODES.length) + CAM_MODES.length) % CAM_MODES.length;
  const mode = CAM_MODES[camMode];
  controls.enabled = mode === 'chase' || mode === 'far';
  if (mode === 'chase' || mode === 'far') {
    camera.position.copy(camTarget).add(presetOffset(mode, camYaw));
    controls.target.copy(camTarget);
    controls.update();
  } else if (mode === 'orbit') {
    orbitAngle = camYaw;
  }
  btnCamera.textContent = `Камера: ${CAM_LABEL[mode]} (C)`;
}
function cycleCamera() { setCamMode(camMode + 1); }
btnCamera.addEventListener('click', cycleCamera);

camTarget.set(sim.pos.x, sim.pos.y + 0.5, sim.pos.z);
controls.target.copy(camTarget);
camera.position.copy(camTarget).add(camOffset.set(-Math.sin(camYaw) * CAM_BACK, CAM_UP, -Math.cos(camYaw) * CAM_BACK));

// ---------- loop ----------
const clock = new THREE.Clock();

// ---------- debug bar: fps and frame time ----------
// A browser page has no API for real OS CPU load, so frame time stands in for it —
// the same idea (how long each frame took to compute and draw), just measured here
// instead of by the OS.
let dbgLast = performance.now();
let fpsEma = 60;
let msEma = 16.7;
let dbgAt = 0;
const dbgFpsEl = document.getElementById('dbgFps');
const dbgMsEl = document.getElementById('dbgMs');

function frame() {
  const dt = Math.min(clock.getDelta(), 0.05);
  const t = clock.elapsedTime;

  // Scanned from last frame's position — one frame of lag, not worth chasing — so
  // autopilotInput() (called inside readInput below) already sees this tick's bias.
  sonarScan = sonar.update(dt, sim.pos.x, sim.pos.z, sim.yaw());
  if (sonarScan.warnObstacle && !sonarWarned) {
    sonarWarned = true;
    flash(`Сонар: перешкода за ${Math.round(sonarScan.warnObstacle.d)} м`);
    if (audio) audio.beep(620);
  } else if (!sonarScan.warnObstacle) {
    sonarWarned = false;
  }

  if (!stepRighting(dt)) sim.update(dt, readInput(t));
  else sim.update(0.0001, { throttle: 0, steer: 0, brake: 1 });

  // Visual model follows the rigid body.
  {
    const yw = sim.yaw();
    terrain.update(sim.pos.x, sim.pos.z, 8, lampLevel() >= 2 ? { dx: Math.sin(yw), dz: Math.cos(yw) } : null);
  }
  sim.origin(origin);
  vehicle.root.position.copy(origin);
  vehicle.root.quaternion.copy(sim.quat);
  vehicle.setSteer(sim.cmd.steer);

  // The roof spot's rectangular beam is drawn through its shadow camera, and that
  // camera's own `up` never rotates with its parent — only its position and look
  // direction do. Left at the world's up, the beam stayed level on a banked truck
  // instead of banking with it. Feeding it the truck's actual up vector each frame
  // rolls the rectangle along with the body, the way a real fixed lamp would.
  farLight.shadow.camera.up.copy(farUpLocal).applyQuaternion(sim.quat);

  const speedAbs = Math.abs(sim.speed);
  W.forEach((w, i) => {
    const s = w.sim;
    const Lvis = s.contact ? clamp(s.L, SUSP.Lmin, SUSP.Lmax) : SUSP.Lmax;
    vehicle.setSuspension(i, Lvis);
    w.spin.rotation.x += s.spinRate * dt;

  });

  // Camera: turns with the truck's heading (not its roll/pitch, so a flip doesn't spin
  // the view). Chase/far keep the old drag-to-orbit trick; top/orbit drive the camera
  // outright (see setCamMode/CAM_MODES).
  const prevYaw = camYaw;
  if (sim.upY > 0.2) camYaw += wrapAngle(sim.yaw() - camYaw) * (1 - Math.exp(-3 * dt));
  camY = damp(camY, sim.pos.y, 4, dt);
  camTarget.set(sim.pos.x, camY + 0.5, sim.pos.z);
  const camModeName = CAM_MODES[camMode];
  if (camModeName === 'chase' || camModeName === 'far') {
    camOffset.copy(camera.position).sub(controls.target).applyAxisAngle(UP, camYaw - prevYaw);
    camera.position.copy(camTarget).add(camOffset);
  } else if (camModeName === 'top') {
    camera.position.set(camTarget.x, camTarget.y + CAM_TOP_HEIGHT, camTarget.z + 0.01);
  } else {
    orbitAngle += dt * CAM_ORBIT_SPEED;
    camera.position.set(
      camTarget.x - Math.sin(orbitAngle) * CAM_ORBIT_RADIUS,
      camTarget.y + CAM_ORBIT_HEIGHT,
      camTarget.z - Math.cos(orbitAngle) * CAM_ORBIT_RADIUS
    );
  }
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
  if (dynamicLight) {
    timeOfDay = (timeOfDay + dt / SOL_SECONDS) % 1;
    applyTimeOfDay(timeOfDay);
  }
  setLamps(lampLevel());

  const target = power.wantPanels ? 1 : 0;
  if (power.panels !== target) {
    const step = dt / PANEL_SECONDS;
    power.panels = target > power.panels ? Math.min(target, power.panels + step) : Math.max(target, power.panels - step);
  }
  vehicle.setPanels(power.panels);

  // Charging needs the wings fully open and the sun above the horizon.
  power.charge = power.panels > 0.99 ? CHARGE_PEAK * Math.max(0, sunDir.y) : 0;
  // Rear-only drive spins up half the drivetrain, so it costs less to hold the same
  // throttle — the payoff for giving up front-axle traction above AWD_UP.
  power.draw = DRAW_IDLE + DRAW_DRIVE * Math.abs(sim.cmd.throttle) * (sim.cmd.boost ? BOOST_DRAW : 1) * (sim.awd ? 1 : 0.8);
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

  stepOdometer(t);
  // ---------- navigation ----------
  if (route.length && Math.hypot(sim.pos.x - route[0].x, sim.pos.z - route[0].z) < WAYPOINT_R) {
    route.shift();
    updateRouteInfo();
    if (audio) audio.beep(route.length ? 980 : 1240, 0.12);
    if (!route.length) flash('Маршрут пройдено');
  }
  if (autopilot) hudMode.textContent = AUTO_LABEL[auto.state];

  // Arrival at a base is still tracked (for the docking message and H's target),
  // even though the HUD no longer shows a running bearing to it.
  const dist = distanceTo(trip.target);
  const other = trip.target === BASES[0] ? BASES[1] : BASES[0];
  if (dist < ARRIVE_R && !trip.docked) {
    trip.docked = true;
    trip.legs++;
    flash(`Прибув на ${trip.target.name}. Наступна ціль: ${other.name}`);
    if (audio) { audio.beep(880); setTimeout(() => audio.beep(1180), 130); audio.speak(`Прибули на базу ${trip.target.name}`); }
    trip.target = other;
  } else if (dist > ARRIVE_R * 1.6) {
    trip.docked = false;
  }

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
  const lampsLit = lampLevel() >= 1;
  for (const g of tailGlows) g.material.opacity = lampsLit ? 0.35 + 0.65 * braking : 0;
  for (const l of tailLights) l.intensity = lampsLit ? 14 + 56 * braking : 0;
  for (const l of markerLights) l.intensity = lampsLit ? 14 : 0;

  tracks.update(W.map((w) => ({ x: w.sim.cx, z: w.sim.cz, contact: w.sim.contact })));

  // Loose sand: scattered by the wheels, lit by the sun or, at night, by the headlights.
  const yawNow = sim.yaw();
  const fx = Math.sin(yawNow);
  const fz = Math.cos(yawNow);
  sandCtx.x = sim.pos.x;
  sandCtx.z = sim.pos.z;
  sandCtx.yaw = yawNow;
  sandCtx.vx = sim.vel.x;
  sandCtx.vz = sim.vel.z;
  sandCtx.wheels = sim.wheels;
  sandCtx.daylight = daylight;
  sandCtx.pxPerUnit = renderer.getDrawingBufferSize(drawSize).y / (2 * Math.tan(THREE.MathUtils.degToRad(camera.fov) / 2));
  sandCtx.head.on = lampLevel() >= 2;
  sandCtx.head.x = sim.pos.x + fx * 3.6;
  sandCtx.head.y = sim.pos.y - 0.9;
  sandCtx.head.z = sim.pos.z + fz * 3.6;
  sandCtx.head.dx = fx;
  sandCtx.head.dz = fz;
  sand.update(dt, sandCtx);
  dust.update(dt, sandCtx);
  roadPosts.update(t, daylight, sandCtx.pxPerUnit, sim.pos);

  const missionEvent = missions.update(t, sim.pos.x, sim.pos.z);
  if (missionEvent) {
    flash(missionEvent.text);
    if (audio) { audio.beep(missionEvent.type === 'deliver' ? 1180 : 780); if (missionEvent.type === 'pickup') setTimeout(() => audio.beep(1040), 110); }
  }
  hudMissions.textContent = `везеш ${missions.carriedCount()} · здано ${missions.deliveredCount()}/${missions.total}`;

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

  hudSpeed.textContent = `${(speedAbs * 3.6).toFixed(0)} км/год · ${sim.awd ? '4×4' : '4×2'}`;
  drawCompass(
    sim.yaw(),
    route.map((p, i) => ({
      n: i + 1,
      bearing: (Math.atan2(p.x - sim.pos.x, p.z - sim.pos.z) * 180) / Math.PI,
      color: i === 0 ? '#7ce68f' : '#4fe0ff',
    }))
  );
  if (!map3dEl.classList.contains('hidden')) minimap.update(sim, dt);
  renderer.render(scene, camera);

  const now = performance.now();
  const rawMs = now - dbgLast;
  dbgLast = now;
  msEma += (rawMs - msEma) * 0.08;
  fpsEma += (1000 / Math.max(rawMs, 1) - fpsEma) * 0.08;
  if (t > dbgAt) {
    dbgAt = t + 0.3;
    dbgFpsEl.textContent = `${Math.round(fpsEma)} FPS`;
    dbgMsEl.textContent = `· ${msEma.toFixed(1)} мс/кадр`;
  }

  requestAnimationFrame(frame);
}

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// debug hook: inspect state and scrub the sol from the console
window.game = { roadPosts, missions, dust, sonar, get sonarScan() { return sonarScan; }, sim, camera, controls, power, renderer, scene, terrain, route, minimap, auto, sand, setTime: (t) => { timeOfDay = t % 1; }, get timeOfDay() { return timeOfDay; } };
document.getElementById('loading').classList.add('hidden');
frame();
