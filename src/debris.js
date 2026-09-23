import * as THREE from 'three';
import { ROUTE_PTS, ROUTE_LEN, surfaceHeight } from './terrain.js';

// Scrap scattered off the road between the bases — old hardware, panel shards,
// snapped struts. Not part of the Гермес-3 story (that's missions.js): just junk
// to hunt down for a currency to spend at the workshop later. Deliberately no
// beacon light or beam like the mission crates, and no minimap marker — these are
// found by actually looking, not driven straight to.

const PICK_R = 4; // metres — tighter than a mission crate's, on purpose
const COUNT = 28;
const STORE_KEY = 'rover.debris';

// A soft, dim blue glow — not a beacon like the mission crates, just enough of a
// wink to catch the eye if you're scanning the horizon for one of these.
function makeGlowTexture() {
  const c = document.createElement('canvas');
  c.width = c.height = 64;
  const ctx = c.getContext('2d');
  const g = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
  g.addColorStop(0, 'rgba(255,255,255,1)');
  g.addColorStop(0.5, 'rgba(255,255,255,0.35)');
  g.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 64, 64);
  return new THREE.CanvasTexture(c);
}

function loadState() {
  try {
    const raw = JSON.parse(localStorage.getItem(STORE_KEY));
    if (raw && Array.isArray(raw.collected)) return raw;
  } catch (e) { /* storage may be blocked or empty */ }
  return { collected: [] };
}
function saveState(s) {
  try { localStorage.setItem(STORE_KEY, JSON.stringify(s)); } catch (e) { /* storage may be blocked */ }
}

// Deterministic scatter along the whole route, own seeded RNG so a reload doesn't
// reshuffle the map (same trick as roadposts.js / missions.js).
function placements() {
  let seed = 337799;
  const rand = () => {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed / 4294967296;
  };
  const shapes = ['shard', 'ring', 'strut'];
  const out = [];
  for (let i = 0; i < COUNT; i++) {
    const s = ((i + 0.5) / COUNT) * ROUTE_LEN;
    let k = 0;
    while (k < ROUTE_PTS.length - 2 && ROUTE_PTS[k + 1].s < s) k++;
    const a = ROUTE_PTS[k];
    const b = ROUTE_PTS[k + 1];
    const len = Math.hypot(b.x - a.x, b.z - a.z) || 1;
    const t = len ? (s - a.s) / (b.s - a.s || 1) : 0;
    const px = a.x + (b.x - a.x) * t;
    const pz = a.z + (b.z - a.z) * t;
    const nx = -(b.z - a.z) / len;
    const nz = (b.x - a.x) / len;
    const side = rand() < 0.5 ? -1 : 1;
    const off = side * (15 + rand() * 160);
    const x = px + nx * off;
    const z = pz + nz * off;
    out.push({
      id: `d${i}`,
      x, z, y: surfaceHeight(x, z),
      shape: shapes[Math.floor(rand() * shapes.length)],
      rot: rand() * Math.PI * 2,
      spin: 0.15 + rand() * 0.35,
      phase: rand() * Math.PI * 2,
    });
  }
  return out;
}

export function createDebris() {
  const pieces = placements();
  const state = loadState();
  for (const p of pieces) p.collected = state.collected.includes(p.id);

  const group = new THREE.Group();
  const geo = {
    shard: new THREE.ConeGeometry(0.32, 0.9, 4),
    ring: new THREE.TorusGeometry(0.32, 0.09, 6, 10),
    strut: new THREE.BoxGeometry(1.1, 0.14, 0.14),
  };
  const mat = new THREE.MeshStandardMaterial({ color: 0x9aa4ad, metalness: 0.85, roughness: 0.35, emissive: 0x2a3a44, emissiveIntensity: 0.18 });
  const glowTex = makeGlowTexture();

  for (const p of pieces) {
    const mesh = new THREE.Mesh(geo[p.shape], mat);
    mesh.position.set(p.x, p.y + 0.35, p.z);
    mesh.rotation.set(rand2(p) * 0.6, p.rot, rand2(p, 1) * 0.6);
    mesh.castShadow = true;
    mesh.visible = !p.collected;
    group.add(mesh);
    p.mesh = mesh;

    const glow = new THREE.Sprite(
      new THREE.SpriteMaterial({ map: glowTex, color: 0x3fa2ff, blending: THREE.AdditiveBlending, transparent: true, depthWrite: false, fog: false, opacity: 0.55 })
    );
    glow.position.set(p.x, p.y + 0.4, p.z);
    glow.scale.setScalar(1.3);
    glow.visible = !p.collected;
    group.add(glow);
    p.glow = glow;
  }

  function rand2(p, salt = 0) {
    return Math.sin(p.x * 12.9898 + p.z * 78.233 + salt * 37.1) * 0.5;
  }

  function persist() {
    saveState({ collected: pieces.filter((p) => p.collected).map((p) => p.id) });
  }

  // update: called every frame with the rover's position. Returns a short pickup
  // event or null. A slow bob/spin so a glint catches the eye at range without a
  // full beacon like the mission crates.
  function update(t, x, z) {
    for (const p of pieces) {
      if (p.collected) continue;
      p.mesh.rotation.y = p.rot + t * p.spin;
      const bobY = p.y + 0.35 + Math.sin(t * 0.9 + p.phase) * 0.06;
      p.mesh.position.y = bobY;
      p.glow.position.y = bobY + 0.05;
      p.glow.material.opacity = 0.4 + 0.25 * (0.5 + 0.5 * Math.sin(t * 1.6 + p.phase));
      if (Math.hypot(x - p.x, z - p.z) < PICK_R) {
        p.collected = true;
        p.mesh.visible = false;
        p.glow.visible = false;
        persist();
        return { text: `Підібрано мотлох (${collectedCount()}/${pieces.length})` };
      }
    }
    return null;
  }

  const collectedCount = () => pieces.filter((p) => p.collected).length;

  return { group, pieces, update, collectedCount, total: pieces.length };
}
