import * as THREE from 'three';
import { lamp } from './glow.js';
import { ROUTE_BOUNDS, riverDepthAt, waterDepthAt, terrainHeight, groundHeight, nearLandmark, LAB } from './terrain.js';

// Верданта's own job: the survey drop that went in ahead of the rover scattered five
// seed probes — sealed capsules of soil cultures and spores — along the river and
// across the meadows. Find each one, bring them to the seed lab parked beside АЛЬФА,
// and the first real biology on this world can start. Same find-and-deliver loop as
// Гермес-3 on Mars, but its own objects, its own save and its own lab.

export const SEED_TYPES = [
  { id: 'moss', name: 'Зонд «Мох»', color: 0x7ce68f },
  { id: 'spore', name: 'Зонд «Спора»', color: 0x5fe0c0 },
  { id: 'root', name: 'Зонд «Корінь»', color: 0xb8f03a },
  { id: 'algae', name: 'Зонд «Водорість»', color: 0x4fd0ff },
  { id: 'lichen', name: 'Зонд «Лишайник»', color: 0xe0f07a },
];

const PICK_R = 6;
const LAB_R = 30;
const STORE_KEY = 'rover.verdanta';

function loadState() {
  try {
    const raw = JSON.parse(localStorage.getItem(STORE_KEY));
    if (raw && Array.isArray(raw.collected) && Array.isArray(raw.delivered)) return raw;
  } catch (e) { /* storage may be blocked or empty */ }
  return { collected: [], delivered: [] };
}
// How many probes are in the lab, read straight from the save — the story needs it
// on every planet, and building Верданта's probes on Mars just to count them is waste.
export function seedsDelivered() {
  return loadState().delivered.length;
}
function saveState(s) {
  try { localStorage.setItem(STORE_KEY, JSON.stringify(s)); } catch (e) { /* storage may be blocked */ }
}

// The lab sits beside АЛЬФА; its position is worked out in terrain.js.
export { LAB };

// Deterministic placement, worked out once from the river itself: three probes come
// down on the dry bank just above the waterline, two out in the open meadows, each
// at its own distance from the lab so the run out and back grows as you go.
function placements() {
  let seed = 4711;
  const rand = () => {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed / 4294967296;
  };
  const PAD = 180; // inside the minimap's relief, which reaches 240 m past the route
  const bank = [];
  const meadow = [];
  // A coarse scan (~12k samples, cheapest test first) — a one-off at load.
  for (let z = ROUTE_BOUNDS.z0 - PAD; z <= ROUTE_BOUNDS.z1 + PAD; z += 70) {
    for (let x = ROUTE_BOUNDS.x0 - PAD; x <= ROUTE_BOUNDS.x1 + PAD; x += 70) {
      const jx = x + (rand() - 0.5) * 40;
      const jz = z + (rand() - 0.5) * 40;
      const d = Math.hypot(jx - LAB.x, jz - LAB.z);
      const coin = rand();
      if (d < 350) continue;
      const r = riverDepthAt(jx, jz);
      const isBank = r > 0.12 && r < 0.38;
      if (!isBank && !(r === 0 && coin < 0.08)) continue;
      if (waterDepthAt(jx, jz) > 0) continue;
      if (nearLandmark(jx, jz, 10)) continue;
      // Gentle ground only, so a probe never sits on a cliff edge.
      const e = 3;
      const slope = Math.hypot(terrainHeight(jx + e, jz) - terrainHeight(jx - e, jz), terrainHeight(jx, jz + e) - terrainHeight(jx, jz - e)) / (2 * e);
      if (slope > 0.35) continue;
      (isBank ? bank : meadow).push({ x: jx, z: jz, d });
    }
  }
  const picked = [];
  const pick = (pool, target) => {
    let best = null;
    let bestCost = Infinity;
    for (const c of pool) {
      if (picked.some((p) => Math.hypot(p.x - c.x, p.z - c.z) < 450)) continue;
      const cost = Math.abs(c.d - target);
      if (cost < bestCost) { bestCost = cost; best = c; }
    }
    if (best) picked.push(best);
    return best;
  };
  // Nearest first: a bank, a meadow, then the far ones.
  const plan = [[bank, 600], [meadow, 1300], [bank, 2100], [meadow, 3000], [bank, 3900]];
  return SEED_TYPES.map((type, i) => {
    const [pool, target] = plan[i];
    const p = pick(pool, target) || pick(pool === bank ? meadow : bank, target) || { x: LAB.x + 400 * (i + 1), z: LAB.z };
    return { ...type, x: p.x, z: p.z, y: groundHeight(p.x, p.z), onBank: pool === bank };
  });
}

const std = (color, metalness = 0, roughness = 0.6, extra = {}) =>
  new THREE.MeshStandardMaterial({ color, metalness, roughness, ...extra });
const M = {
  shell: std(0xe8ece6, 0.25, 0.45),
  dark: std(0x22262b, 0.5, 0.5),
  metal: std(0x8a9096, 0.85, 0.3),
  glass: std(0x9fd8c0, 0.3, 0.08, { transparent: true, opacity: 0.35, depthWrite: false }),
  green: std(0x3f7a3a, 0, 0.8),
  pad: std(0x55594f, 0.1, 0.9),
  lampW: new THREE.MeshBasicMaterial({ color: lamp(0xfff2d6, 3) }),
  lampG: new THREE.MeshBasicMaterial({ color: lamp(0x7ce68f, 3) }),
};

// One probe: an upright capsule on three splayed legs, a glowing band in its own
// colour, a short antenna. Slightly tilted, as if it bounced in on landing.
function buildProbe(color) {
  const g = new THREE.Group();
  const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.42, 0.9, 6, 16), M.shell);
  body.position.y = 1.05;
  const band = new THREE.Mesh(
    new THREE.CylinderGeometry(0.44, 0.44, 0.16, 20),
    new THREE.MeshBasicMaterial({ color: lamp(color, 3) })
  );
  band.position.y = 1.15;
  const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.3, 0.18, 14), M.dark);
  cap.position.y = 1.75;
  const ant = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 0.7, 5), M.metal);
  ant.position.set(0.12, 2.1, 0);
  const tip = new THREE.Mesh(new THREE.SphereGeometry(0.05, 8, 6), new THREE.MeshBasicMaterial({ color: lamp(color, 4) }));
  tip.position.set(0.12, 2.46, 0);
  g.add(body, band, cap, ant, tip);
  for (let k = 0; k < 3; k++) {
    const a = (k / 3) * Math.PI * 2;
    const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.95, 6), M.metal);
    leg.position.set(Math.cos(a) * 0.45, 0.4, Math.sin(a) * 0.45);
    leg.rotation.set(Math.sin(a) * 0.5, 0, -Math.cos(a) * 0.5);
    const foot = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.04, 10), M.dark);
    foot.position.set(Math.cos(a) * 0.68, 0.02, Math.sin(a) * 0.68);
    g.add(leg, foot);
  }
  g.rotation.z = 0.08;
  g.rotation.x = -0.05;
  g.traverse((o) => { if (o.isMesh) { o.castShadow = !o.material.isMeshBasicMaterial; o.receiveShadow = true; } });
  return { group: g, band, tip };
}

// The seed lab: a squat lander on four legs with a hatch and ramp, beside it a glass
// greenhouse half full of green, and a mast with a green beacon you can steer by.
function buildLab() {
  const g = new THREE.Group();
  const y0 = terrainHeight(LAB.x, LAB.z);
  g.position.set(LAB.x, y0, LAB.z);
  const pad = new THREE.Mesh(new THREE.CylinderGeometry(16, 16.5, 0.3, 40), M.pad);
  pad.position.y = 0.05;
  g.add(pad);

  const lander = new THREE.Group();
  lander.position.set(-5, 0, 0);
  const hull = new THREE.Mesh(new THREE.CylinderGeometry(3.2, 3.8, 3.4, 8), M.shell);
  hull.position.y = 3.6;
  const roof = new THREE.Mesh(new THREE.ConeGeometry(3.2, 1.6, 8), M.shell);
  roof.position.y = 6.1;
  const ring = new THREE.Mesh(new THREE.CylinderGeometry(3.85, 3.85, 0.25, 8), M.dark);
  ring.position.y = 2.0;
  lander.add(hull, roof, ring);
  for (let k = 0; k < 4; k++) {
    const a = (k / 4) * Math.PI * 2 + Math.PI / 4;
    const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.14, 2.9, 8), M.metal);
    leg.position.set(Math.cos(a) * 4.1, 1.3, Math.sin(a) * 4.1);
    leg.rotation.set(Math.sin(a) * 0.35, 0, -Math.cos(a) * 0.35);
    const foot = new THREE.Mesh(new THREE.CylinderGeometry(0.6, 0.7, 0.15, 12), M.dark);
    foot.position.set(Math.cos(a) * 4.6, 0.08, Math.sin(a) * 4.6);
    lander.add(leg, foot);
  }
  const hatch = new THREE.Mesh(new THREE.BoxGeometry(1.6, 2.0, 0.2), M.dark);
  hatch.position.set(3.4, 3.2, 0);
  hatch.rotation.y = Math.PI / 2;
  const ramp = new THREE.Mesh(new THREE.BoxGeometry(3.2, 0.12, 1.6), M.metal);
  ramp.position.set(5.0, 1.15, 0);
  ramp.rotation.z = -0.72;
  const hatchLamp = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.1, 1.4), M.lampW);
  hatchLamp.position.set(3.45, 4.4, 0);
  lander.add(hatch, ramp, hatchLamp);
  for (let k = 0; k < 8; k++) {
    const a = (k / 8) * Math.PI * 2;
    const win = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.3, 0.05), M.lampW);
    win.position.set(Math.cos(a) * 3.35, 4.7, Math.sin(a) * 3.35);
    win.rotation.y = -a + Math.PI / 2;
    if (Math.abs(Math.cos(a)) > 0.9 && Math.cos(a) > 0) continue; // the hatch side
    lander.add(win);
  }
  g.add(lander);

  // Greenhouse: a glass half-cylinder over raised beds of green.
  const gh = new THREE.Group();
  gh.position.set(7, 0, 2);
  const glass = new THREE.Mesh(new THREE.CylinderGeometry(3, 3, 9, 20, 1, false, 0, Math.PI), M.glass);
  glass.rotation.z = Math.PI / 2;
  glass.rotation.y = Math.PI / 2;
  glass.position.y = 0.2;
  gh.add(glass);
  for (let k = 0; k < 6; k++) {
    const rib = new THREE.Mesh(new THREE.TorusGeometry(3, 0.06, 6, 20, Math.PI), M.metal);
    rib.position.set(0, 0.2, -4.2 + k * 1.68);
    gh.add(rib);
  }
  for (const x of [-1.4, 1.4]) {
    const bed = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.5, 8), M.dark);
    bed.position.set(x, 0.45, 0);
    const plants = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.35, 7.6), M.green);
    plants.position.set(x, 0.85, 0);
    gh.add(bed, plants);
  }
  g.add(gh);

  // Beacon mast.
  const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.18, 12, 8), M.metal);
  mast.position.set(2, 6, -6);
  const beacon = new THREE.Mesh(new THREE.SphereGeometry(0.35, 12, 10), M.lampG);
  beacon.position.set(2, 12.2, -6);
  const light = new THREE.PointLight(0x7ce68f, 30, 60, 1.6);
  light.position.copy(beacon.position);
  g.add(mast, beacon, light);

  g.traverse((o) => { if (o.isMesh) { o.castShadow = !o.material.isMeshBasicMaterial && !o.material.transparent; o.receiveShadow = true; } });
  return { group: g, beacon, light };
}

export function createSeeds() {
  const items = placements();
  const state = loadState();
  for (const s of items) {
    s.collected = state.collected.includes(s.id);
    s.delivered = state.delivered.includes(s.id);
  }

  const group = new THREE.Group();
  const beamGeo = new THREE.CylinderGeometry(0.08, 0.08, 40, 6, 1, true);
  beamGeo.translate(0, 20, 0);
  for (const s of items) {
    const holder = new THREE.Group();
    holder.position.set(s.x, s.y, s.z);
    const probe = buildProbe(s.color);
    const beam = new THREE.Mesh(
      beamGeo,
      new THREE.MeshBasicMaterial({ color: s.color, transparent: true, opacity: 0.28, depthWrite: false, side: THREE.DoubleSide })
    );
    const light = new THREE.PointLight(s.color, 6, 26, 1.6);
    light.position.y = 1.6;
    holder.add(probe.group, beam, light);
    holder.visible = !s.collected;
    group.add(holder);
    s.holder = holder;
    s.light = light;
    s.probe = probe;
  }
  const lab = buildLab();
  group.add(lab.group);

  function persist() {
    saveState({
      collected: items.filter((s) => s.collected).map((s) => s.id),
      delivered: items.filter((s) => s.delivered).map((s) => s.id),
    });
  }

  // Called every frame with the rover's position. Returns a short log line when
  // something happens this frame (pickup or delivery), else null.
  function update(t, x, z) {
    lab.light.intensity = 24 + 8 * Math.sin(t * 2.2);
    for (const s of items) {
      if (!s.holder.visible) continue;
      s.light.intensity = 5 * (0.85 + 0.15 * Math.sin(t * 3 + s.x));
      s.probe.tip.visible = Math.sin(t * 5 + s.z) > 0;
    }
    for (const s of items) {
      if (s.collected) continue;
      if (Math.hypot(x - s.x, z - s.z) < PICK_R) {
        s.collected = true;
        s.holder.visible = false;
        persist();
        return { type: 'pickup', text: `${s.name} на борту` };
      }
    }
    const carried = items.filter((s) => s.collected && !s.delivered);
    if (carried.length && Math.hypot(x - LAB.x, z - LAB.z) < LAB_R) {
      for (const s of carried) s.delivered = true;
      persist();
      return { type: 'deliver', text: `Здано в лабораторію: ${carried.map((s) => s.name).join(', ')}`, count: carried.length };
    }
    return null;
  }

  return {
    group,
    items,
    update,
    carriedCount: () => items.filter((s) => s.collected && !s.delivered).length,
    deliveredCount: () => items.filter((s) => s.delivered).length,
    total: items.length,
  };
}
