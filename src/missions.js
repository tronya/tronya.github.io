import * as THREE from 'three';
import { ROUTE_PTS, ROUTE_LEN, BASES, surfaceHeight } from './terrain.js';

// The shuttle "Гермес-3" broke into 4 modules on approach, scattered off the road
// between the bases. Each one, once hauled to БЕТА, unlocks a workshop upgrade
// branch (not implemented yet — this is just the find-and-deliver loop).
export const MODULE_TYPES = [
  { id: 'reactor', name: 'Реакторний блок', log: 'ГЕРМЕС-3: реакторний блок стабільний, підбір дозволено', color: 0xffa23a },
  { id: 'drive', name: 'Блок приводу', log: 'ГЕРМЕС-3: привідний блок відокремлено, підбір дозволено', color: 0x4fe0ff },
  { id: 'cargo', name: 'Вантажний блок', log: 'ГЕРМЕС-3: вантажний контейнер цілий, підбір дозволено', color: 0x9a7cff },
  { id: 'sensor', name: 'Сенсорний блок', log: 'ГЕРМЕС-3: сенсорна щогла знайдена, підбір дозволено', color: 0x7ce68f },
];

const PICK_R = 6; // metres — auto-collect once this close
const STORE_KEY = 'rover.missions';

function loadState() {
  try {
    const raw = JSON.parse(localStorage.getItem(STORE_KEY));
    if (raw && Array.isArray(raw.collected) && Array.isArray(raw.delivered)) return raw;
  } catch (e) { /* storage may be blocked or empty */ }
  return { collected: [], delivered: [] };
}
function saveState(s) {
  try { localStorage.setItem(STORE_KEY, JSON.stringify(s)); } catch (e) { /* storage may be blocked */ }
}

// Deterministic placement: spread along the route, offset well clear of the road so
// they're a genuine detour, never on top of a base. Own tiny seeded RNG (same trick
// as roadposts.js) so a reload doesn't shuffle the map.
function placements() {
  let seed = 90210;
  const rand = () => {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed / 4294967296;
  };
  const fracs = [0.18, 0.42, 0.62, 0.84];
  return MODULE_TYPES.map((type, i) => {
    const s = fracs[i] * ROUTE_LEN;
    let k = 0;
    while (k < ROUTE_PTS.length - 2 && ROUTE_PTS[k + 1].s < s) k++;
    const a = ROUTE_PTS[k];
    const b = ROUTE_PTS[k + 1];
    const len = Math.hypot(b.x - a.x, b.z - a.z) || 1;
    const nx = -(b.z - a.z) / len;
    const nz = (b.x - a.x) / len;
    const side = rand() < 0.5 ? -1 : 1;
    const off = side * (70 + rand() * 110);
    const x = a.x + nx * off;
    const z = a.z + nz * off;
    return { ...type, x, z, y: surfaceHeight(x, z) };
  });
}

export function createMissions() {
  const modules = placements();
  const state = loadState();
  for (const m of modules) {
    m.collected = state.collected.includes(m.id);
    m.delivered = state.delivered.includes(m.id);
  }

  const group = new THREE.Group();
  const crateGeo = new THREE.BoxGeometry(1.5, 1.1, 1.5);
  const beamGeo = new THREE.CylinderGeometry(0.08, 0.08, 40, 6, 1, true);
  beamGeo.translate(0, 20, 0);

  for (const m of modules) {
    const holder = new THREE.Group();
    holder.position.set(m.x, m.y, m.z);
    const crate = new THREE.Mesh(
      crateGeo,
      new THREE.MeshStandardMaterial({ color: 0x5a5148, roughness: 0.8, emissive: new THREE.Color(m.color), emissiveIntensity: 0.35 })
    );
    crate.position.y = 0.55;
    crate.castShadow = true;
    const beam = new THREE.Mesh(
      beamGeo,
      new THREE.MeshBasicMaterial({ color: m.color, transparent: true, opacity: 0.28, depthWrite: false, side: THREE.DoubleSide })
    );
    const light = new THREE.PointLight(m.color, 6, 26, 1.6);
    light.position.y = 1.4;
    holder.add(crate, beam, light);
    holder.visible = !m.collected;
    group.add(holder);
    m.holder = holder;
  }

  function persist() {
    saveState({
      collected: modules.filter((m) => m.collected).map((m) => m.id),
      delivered: modules.filter((m) => m.delivered).map((m) => m.id),
    });
  }

  // update: called every frame with the rover's position. Returns a short log line
  // when something happens this frame (pickup or delivery), else null.
  function update(t, x, z) {
    for (const m of modules) {
      if (!m.holder.visible) continue;
      const s = 0.85 + 0.15 * Math.sin(t * 3 + m.x);
      m.holder.children[0].rotation.y = t * 0.6;
      m.holder.children[2].intensity = 5 * s;
    }
    for (const m of modules) {
      if (m.collected) continue;
      if (Math.hypot(x - m.x, z - m.z) < PICK_R) {
        m.collected = true;
        m.holder.visible = false;
        persist();
        return { type: 'pickup', text: `${m.log} · ${m.name} на борту` };
      }
    }
    const carried = modules.filter((m) => m.collected && !m.delivered);
    if (carried.length && Math.hypot(x - BASES[1].x, z - BASES[1].z) < 95) {
      for (const m of carried) m.delivered = true;
      persist();
      return {
        type: 'deliver',
        text: `Здано на БЕТА: ${carried.map((m) => m.name).join(', ')}`,
        count: carried.length,
      };
    }
    return null;
  }

  return {
    group,
    modules,
    update,
    carriedCount: () => modules.filter((m) => m.collected && !m.delivered).length,
    deliveredCount: () => modules.filter((m) => m.delivered).length,
    total: modules.length,
  };
}
