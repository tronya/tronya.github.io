import * as THREE from 'three';
import { lamp } from './glow.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { CHASSIS, SPEC, WHEEL_DEFS, steerAngle } from './chassis.js';

// Vehicle-local space: origin on the suspension mount plane, forward = +Z, left = +X.
// Ground sits WHEEL_R + L below the mount plane, so y = -1.43 at static ride height.
const WHEEL_SCALE = SPEC.wheelScale; // wheel model is built at radius 0.855, then scaled up
export const WHEEL_R = 0.855 * WHEEL_SCALE;
export const WHEEL_X = SPEC.wheelX;
const HULL_W = SPEC.hullW; // narrower than the track, so the tyres are the widest point
// Suspension length = distance from the mount plane down to the wheel centre.
export const SUSP = SPEC.susp;

const std = (color, metalness = 0, roughness = 0.6, extra = {}) =>
  new THREE.MeshStandardMaterial({ color, metalness, roughness, ...extra });

const M = {
  armor: std(0x26282e, 0.55, 0.45),
  armorLit: std(0x34373f, 0.5, 0.42), // upward-facing panels, reads apart from the flanks
  armorDark: std(0x1a1c21, 0.5, 0.5),
  black: std(0x101216, 0.35, 0.55),
  metal: std(0x6e747e, 0.9, 0.3),
  metalDark: std(0x3a3e46, 0.8, 0.4),
  tire: std(0x14151a, 0, 0.92, { side: THREE.DoubleSide }),
  rim: std(0x2c2f36, 0.75, 0.38),
  glass: std(0x1b2a3a, 0.5, 0.06, { transparent: true, opacity: 0.42, depthWrite: false }),
  suit: std(0x3f434b, 0, 0.7),
  suitOrange: std(0x8a4a22, 0, 0.7),
  visor: std(0xc98a2e, 0.85, 0.15),
  // Unlit, so the running lights read as emissive at night.
  amber: new THREE.MeshBasicMaterial({ color: lamp(0xff9420) }),
  amberDim: new THREE.MeshBasicMaterial({ color: lamp(0xa8560f, 2) }),
  // Painted steel, not a lamp: as an unlit material the coil springs glowed under
  // the rover all night.
  spring: std(0x9c4a16, 0.55, 0.45),
  headlight: new THREE.MeshBasicMaterial({ color: lamp(0xd8c49a, 5) }),
  tail: new THREE.MeshBasicMaterial({ color: lamp(0x7e1a0b, 2) }),
  screen: new THREE.MeshBasicMaterial({ color: lamp(0xff8a2a, 2.5) }),
};
function solarTexture() {
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#10203c';
  ctx.fillRect(0, 0, 128, 128);
  for (let i = 0; i < 4; i++) {
    for (let j = 0; j < 4; j++) {
      ctx.fillStyle = j % 2 === i % 2 ? '#16294a' : '#122442';
      ctx.fillRect(i * 32 + 2, j * 32 + 2, 28, 28);
    }
  }
  ctx.strokeStyle = 'rgba(150,180,220,0.5)';
  ctx.lineWidth = 1.5;
  for (let i = 0; i <= 4; i++) {
    ctx.beginPath(); ctx.moveTo(i * 32, 0); ctx.lineTo(i * 32, 128); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(0, i * 32); ctx.lineTo(128, i * 32); ctx.stroke();
  }
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(3, 4);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}
M.solar = new THREE.MeshStandardMaterial({ map: solarTexture(), metalness: 0.45, roughness: 0.28, side: THREE.DoubleSide });
M.panelBack = std(0x2a2d34, 0.5, 0.5);

// Lamps and glazing never cast: they are unlit strips or transparent.
const NO_CAST = new Set([M.amber, M.amberDim, M.headlight, M.tail, M.screen, M.glass]);

const V = (x, y, z) => new THREE.Vector3(x, y, z);

function mesh(geo, mat, x = 0, y = 0, z = 0) {
  const m = new THREE.Mesh(geo, mat);
  m.position.set(x, y, z);
  return m;
}
const box = (w, h, d, mat, x, y, z) => mesh(new THREE.BoxGeometry(w, h, d), mat, x, y, z);

function cyl(rt, rb, h, mat, x, y, z, axis = 'y', seg = 20) {
  const m = mesh(new THREE.CylinderGeometry(rt, rb, h, seg), mat, x, y, z);
  if (axis === 'x') m.rotation.z = Math.PI / 2;
  if (axis === 'z') m.rotation.x = Math.PI / 2;
  return m;
}

// Collapse a tree of static meshes into one mesh per material. The body is ~300
// parts; every shadow-casting light redraws each one, so merging is the difference
// between ~900 draw calls a frame and ~40.
// mergeGeometries demands an identical attribute set, and the primitives disagree:
// ExtrudeGeometry is non-indexed, the rest are indexed, and the attribute order
// varies. Rebuild each one into exactly position/normal/uv, non-indexed.
function normalize(geo, matrix) {
  const g = (geo.index ? geo.toNonIndexed() : geo.clone()).applyMatrix4(matrix);
  if (!g.attributes.normal) g.computeVertexNormals();
  const out = new THREE.BufferGeometry();
  out.setAttribute('position', g.attributes.position);
  out.setAttribute('normal', g.attributes.normal);
  out.setAttribute(
    'uv',
    g.attributes.uv || new THREE.BufferAttribute(new Float32Array(g.attributes.position.count * 2), 2)
  );
  return out;
}

function mergeStatic(group) {
  group.updateMatrixWorld(true);
  const byMat = new Map();
  group.traverse((o) => {
    if (!o.isMesh) return;
    if (!byMat.has(o.material)) byMat.set(o.material, []);
    byMat.get(o.material).push(normalize(o.geometry, o.matrixWorld));
  });

  const out = new THREE.Group();
  for (const [mat, list] of byMat) {
    const merged = mergeGeometries(list, false);
    for (const g of list) g.dispose();
    if (!merged) throw new Error('vehicle: geometry merge failed');
    const m = new THREE.Mesh(merged, mat);
    m.receiveShadow = true;
    m.castShadow = !NO_CAST.has(mat);
    out.add(m);
  }
  return out;
}

// Unit-height, unit-radius cylinder stretched between two points by place().
const UNIT = new THREE.CylinderGeometry(1, 1, 1, 12);
const UP = V(0, 1, 0);
const _d = V(0, 0, 0);

function place(m, a, b, r) {
  _d.subVectors(b, a);
  const len = _d.length();
  m.position.addVectors(a, b).multiplyScalar(0.5);
  m.quaternion.setFromUnitVectors(UP, _d.divideScalar(len || 1));
  m.scale.set(r, len, r);
}

function tube(a, b, r, mat) {
  const m = new THREE.Mesh(UNIT, mat);
  place(m, V(...a), V(...b), r);
  return m;
}

// Side profile [z, y] extruded across the vehicle. A single-segment bevel pulled
// inward keeps the silhouette as drawn and gives flat armour chamfers.
function extrude(points, width, mat, bevel = 0.1, x = 0, y = 0, z = 0) {
  const shape = new THREE.Shape(points.map(([pz, py]) => new THREE.Vector2(pz, py)));
  const depth = Math.max(0.02, width - bevel * 2);
  const geo = new THREE.ExtrudeGeometry(shape, {
    depth,
    bevelEnabled: true,
    bevelSize: bevel,
    bevelOffset: -bevel,
    bevelThickness: bevel,
    bevelSegments: 1,
  });
  geo.translate(0, 0, -depth / 2);
  const m = new THREE.Mesh(geo, mat);
  m.rotation.y = -Math.PI / 2;
  m.position.set(x, y, z);
  return m;
}

class Helix extends THREE.Curve {
  constructor(turns, radius) {
    super();
    this.turns = turns;
    this.radius = radius;
  }
  getPoint(t, target = new THREE.Vector3()) {
    const a = t * this.turns * Math.PI * 2;
    return target.set(Math.cos(a) * this.radius, t - 0.5, Math.sin(a) * this.radius);
  }
}
const SPRING_GEO = new THREE.TubeGeometry(new Helix(8, 0.085), 220, 0.028, 6, false);

// ---------- wheel ----------

// [radius, half-width] from the bead out to the tread centre. The crawler runs fat,
// low-pressure balloon tyres: nearly half again as wide, with a round shoulder
// instead of the scout's squared-off one.
const CRAWLER = CHASSIS === 'crawler';
const halfProfile = CRAWLER
  ? [[0.36, 0.5], [0.52, 0.53], [0.64, 0.52], [0.74, 0.47], [0.805, 0.38], [0.84, 0.26], [0.855, 0.12], [0.858, 0]]
  : [[0.34, 0.36], [0.56, 0.37], [0.73, 0.32], [0.815, 0.2], [0.835, 0]];
const RIM_FACE = CRAWLER ? 0.43 : 0.3; // how far out the rim faces sit
export const TYRE_HALF_W = halfProfile[1][1] * WHEEL_SCALE;
const tireGeo = new THREE.LatheGeometry(
  [...halfProfile.map(([r, a]) => [r, -a]), ...halfProfile.slice(0, -1).reverse().map(([r, a]) => [r, a])].map(
    ([r, a]) => new THREE.Vector2(r, a)
  ),
  CRAWLER ? 56 : 40
);
const lugGeo = new THREE.BoxGeometry(0.3, 0.1, 0.26);
const spokeGeo = new THREE.BoxGeometry(0.09, 0.42, 0.14);
const rimRingGeo = new THREE.TorusGeometry(0.47, 0.045, 8, 40);
const hubGeo = new THREE.CylinderGeometry(0.15, 0.15, 0.2, 18);
const boltGeo = new THREE.CylinderGeometry(0.035, 0.035, 0.06, 6);

// Everything here turns with the wheel, so it merges into a handful of meshes.
let wheelProto = null;
function buildWheel() {
  if (!wheelProto) {
    const parts = new THREE.Group();

    const tire = new THREE.Mesh(tireGeo, M.tire);
    tire.rotation.z = Math.PI / 2;
    parts.add(tire);

    if (CRAWLER) {
      // Chevron tread wrapping round the shoulder: a centre block and two blocks
      // tipped over onto each rounded edge, so the tyre reads round, not square.
      const LUGS = 20;
      for (let i = 0; i < LUGS; i++) {
        const pivot = new THREE.Group();
        pivot.rotation.x = (i * Math.PI * 2) / LUGS;
        const c = new THREE.Mesh(lugGeo, M.tire);
        c.position.set(0, 0.825, 0);
        c.scale.set(0.8, 0.9, 0.8);
        pivot.add(c);
        for (const k of [-1, 1]) {
          const lug = new THREE.Mesh(lugGeo, M.tire);
          lug.position.set(k * 0.3, 0.79, k * 0.08);
          lug.rotation.set(0, k * 0.4, -k * 0.5);
          pivot.add(lug);
          const edge = new THREE.Mesh(lugGeo, M.tire);
          edge.position.set(k * 0.46, 0.68, -k * 0.05);
          edge.rotation.set(0, 0, -k * 1.0);
          edge.scale.set(0.6, 0.8, 0.7);
          pivot.add(edge);
        }
        parts.add(pivot);
      }
    } else {
      // Two staggered rows of chunky tread blocks.
      const LUGS = 18;
      for (let i = 0; i < LUGS; i++) {
        const pivot = new THREE.Group();
        pivot.rotation.x = (i * Math.PI * 2) / LUGS;
        for (const k of [-1, 1]) {
          const lug = new THREE.Mesh(lugGeo, M.tire);
          lug.position.set(k * 0.17, 0.795, k * 0.06);
          lug.rotation.y = k * 0.3;
          pivot.add(lug);
        }
        parts.add(pivot);
      }
    }

    // Ten-spoke rim, recessed into the tyre on both faces.
    for (const side of [-1, 1]) {
      const face = new THREE.Group();
      face.position.x = side * RIM_FACE;
      if (CRAWLER) {
        // Beadlock ring: a bolted clamp band round the rim lip.
        const lock = new THREE.Mesh(new THREE.TorusGeometry(0.53, 0.035, 6, 40), M.metalDark);
        lock.rotation.y = Math.PI / 2;
        lock.position.x = side * 0.02;
        face.add(lock);
        for (let i = 0; i < 16; i++) {
          const a = (i * Math.PI * 2) / 16;
          const b = new THREE.Mesh(boltGeo, M.metal);
          b.rotation.z = Math.PI / 2;
          b.position.set(side * 0.05, Math.cos(a) * 0.53, Math.sin(a) * 0.53);
          face.add(b);
        }
      }
      const ring = new THREE.Mesh(rimRingGeo, M.rim);
      ring.rotation.y = Math.PI / 2;
      face.add(ring);
      face.add(mesh(new THREE.CircleGeometry(0.47, 28), M.armorDark, side * -0.03, 0, 0).rotateY((side * Math.PI) / 2));
      for (let i = 0; i < 10; i++) {
        const arm = new THREE.Group();
        arm.rotation.x = (i * Math.PI * 2) / 10;
        const sp = new THREE.Mesh(spokeGeo, M.rim);
        sp.position.y = 0.27;
        arm.add(sp);
        face.add(arm);
      }
      const hub = new THREE.Mesh(hubGeo, M.metalDark);
      hub.rotation.z = Math.PI / 2;
      hub.position.x = side * 0.06;
      face.add(hub);
      for (let i = 0; i < 6; i++) {
        const a = (i * Math.PI * 2) / 6;
        const b = new THREE.Mesh(boltGeo, M.metal);
        b.rotation.z = Math.PI / 2;
        b.position.set(side * 0.14, Math.cos(a) * 0.1, Math.sin(a) * 0.1);
        face.add(b);
      }
      parts.add(face);
    }
    wheelProto = mergeStatic(parts);
  }

  const spin = new THREE.Group();
  spin.scale.setScalar(WHEEL_SCALE);
  for (const m of wheelProto.children) {
    const c = new THREE.Mesh(m.geometry, m.material);
    c.castShadow = m.castShadow;
    c.receiveShadow = true;
    spin.add(c);
  }
  return spin;
}

// ---------- suspension corner: wishbones, coil-over, drive shaft ----------

function buildCorner(shell, root, s, z) {
  // Drawn for the scout's 1.75 m half-track; a wider track pushes the outboard ends.
  const ox = WHEEL_X - 1.75;
  const arms = Array.from({ length: 4 }, () => new THREE.Mesh(UNIT, M.metalDark));
  const spring = new THREE.Mesh(SPRING_GEO, M.spring);
  const damper = new THREE.Mesh(UNIT, M.black);
  const piston = new THREE.Mesh(UNIT, M.metal);
  const shaft = new THREE.Mesh(UNIT, M.metalDark);
  const knuckle = box(0.14, 0.44, 0.24, M.metalDark, 0, 0, 0);
  root.add(...arms, spring, damper, piston, shaft, knuckle);

  const top = V(s * (0.95 + ox), 0.55, z);
  const bot = V(0, 0, 0);
  const pA = V(0, 0, 0);
  const pB = V(0, 0, 0);
  const diff = V(s * 0.3, -0.12, z);
  const lowIn = [V(s * 0.72, -0.34, z - 0.42), V(s * 0.72, -0.34, z + 0.42)];
  const upIn = [V(s * 0.74, 0.16, z - 0.32), V(s * 0.74, 0.16, z + 0.32)];
  const lowOut = V(0, 0, 0);
  const upOut = V(0, 0, 0);

  // Mounts and the diff housing never move: they belong to the merged shell.
  for (const p of [...lowIn, ...upIn]) shell.add(box(0.13, 0.13, 0.15, M.armorDark, p.x, p.y, p.z));
  shell.add(box(0.2, 0.14, 0.2, M.armorDark, top.x, top.y, top.z));
  shell.add(box(0.42, 0.3, 0.42, M.black, diff.x, diff.y, diff.z));

  return (L) => {
    lowOut.set(s * (1.22 + ox), -L - 0.1, z);
    upOut.set(s * (1.2 + ox), -L + 0.28, z);
    place(arms[0], lowIn[0], lowOut, 0.055);
    place(arms[1], lowIn[1], lowOut, 0.055);
    place(arms[2], upIn[0], upOut, 0.045);
    place(arms[3], upIn[1], upOut, 0.045);
    knuckle.position.set(s * (1.24 + ox), -L + 0.08, z);
    place(shaft, diff, V(s * (1.2 + ox), -L, z), 0.055);

    bot.set(s * (1.0 + ox), -L - 0.08, z);
    place(spring, pA.lerpVectors(bot, top, 0.06), pB.lerpVectors(top, bot, 0.06), 1);
    place(damper, bot, pA.lerpVectors(bot, top, 0.5), 0.055);
    place(piston, top, pA.lerpVectors(top, bot, 0.55), 0.032);
  };
}

// ---------- pilots ----------

function buildPilot(x, suit) {
  const g = new THREE.Group();
  g.position.set(x, 0, 0);
  g.add(mesh(new THREE.CapsuleGeometry(0.18, 0.28, 6, 10), suit, 0, 0.5, 0.95));
  g.add(mesh(new THREE.SphereGeometry(0.19, 16, 12), M.suit, 0, 0.98, 0.98));
  g.add(
    mesh(new THREE.SphereGeometry(0.195, 16, 10, Math.PI / 2 - 0.9, 1.8, Math.PI * 0.3, Math.PI * 0.36), M.visor, 0, 0.98, 0.98)
  );
  for (const dx of [-0.1, 0.1]) {
    g.add(mesh(new THREE.CapsuleGeometry(0.09, 0.34, 4, 6), suit, dx, 0.32, 1.24).rotateX(Math.PI / 2));
    g.add(cyl(0.08, 0.08, 0.26, suit, dx, 0.24, 1.52));
  }
  return g;
}

// Fold-out solar wings on the rear deck. Two hinged segments per side: stowed they
// lie folded flat on the deck, deployed they swing out into one long wing.
const PANEL_L = 1.25;
const PANEL_D = 1.9;
const panelGeo = new THREE.BoxGeometry(PANEL_L, 0.05, PANEL_D);

function buildPanels(root, at = { x: 1.28, y: 1.41, z: -2.05 }) {
  const hinges = [];
  for (const s of [-1, 1]) {
    // Inner segment hinges at the deck edge; the sides sit at slightly different
    // heights so they nest instead of z-fighting when folded.
    const inner = new THREE.Group();
    inner.position.set(s * at.x, at.y + (s > 0 ? 0 : 0.14), at.z);
    root.add(inner);
    inner.add(mesh(panelGeo, M.solar, (s * PANEL_L) / 2, 0, 0));
    inner.add(box(0.06, 0.09, PANEL_D * 0.92, M.panelBack, s * 0.06, -0.06, 0));

    const outer = new THREE.Group();
    outer.position.set(s * PANEL_L, 0.07, 0); // stacks above the inner when folded
    inner.add(outer);
    outer.add(mesh(panelGeo, M.solar, (s * PANEL_L) / 2, 0, 0));
    outer.add(box(0.05, 0.07, PANEL_D * 0.9, M.panelBack, s * 0.05, -0.05, 0));

    hinges.push({ s, inner, outer });
  }

  // t = 0 stowed, 1 fully deployed.
  return (t) => {
    const e = t * t * (3 - 2 * t);
    for (const { s, inner, outer } of hinges) {
      // Folded: inner lies flat pointing inboard, outer folds back on top of it.
      inner.rotation.z = s * (1 - e) * Math.PI;
      outer.rotation.z = -s * (1 - e) * Math.PI;
      inner.rotation.x = e * 0.12; // slight tilt toward the sky once open
    }
  };
}

// The crawler's array: nine panels in a 3×3 grid that open in two stages. First the
// two side wings flip out from on top of the centre panel; then, from all three of
// those, a leaf swings out fore and aft. Folded it is one low pack on the cage roof.
const ARR_W = 1.3; // wing width; the centre panel is two of these
const ARR_D = 1.9;
function buildArray(root, at) {
  const panel = (w) => {
    const g = new THREE.Group();
    g.add(mesh(new THREE.BoxGeometry(w, 0.04, ARR_D), M.solar, 0, 0, 0));
    g.add(box(w * 0.94, 0.05, 0.06, M.panelBack, 0, -0.035, 0));
    g.add(box(0.06, 0.05, ARR_D * 0.94, M.panelBack, 0, -0.035, 0));
    return g;
  };
  const leaves = [];
  // Fore and aft leaves on a panel of width w centred at x. They fold back over the
  // panel's own face, at two heights so the pair nests instead of intersecting.
  function addLeaves(parent, w, x) {
    for (const d of [1, -1]) {
      const hinge = new THREE.Group();
      hinge.position.set(x, d > 0 ? 0.05 : 0.1, (d * ARR_D) / 2);
      const leaf = panel(w - 0.04);
      leaf.position.z = (d * ARR_D) / 2;
      hinge.add(leaf);
      hinge.add(box(w * 0.9, 0.04, 0.05, M.metalDark, 0, -0.02, 0)); // hinge barrel
      parent.add(hinge);
      leaves.push({ hinge, d });
    }
  }

  const base = new THREE.Group();
  base.position.set(0, at.y, at.z);
  root.add(base);
  base.add(panel(ARR_W * 2));
  addLeaves(base, ARR_W * 2, 0);

  // Wings hinge on short posts at the centre panel's edges, high enough to fold over
  // the centre panel's own folded leaves.
  const WING_Y = 0.3;
  const wings = [];
  for (const s of [-1, 1]) {
    base.add(box(0.08, WING_Y, 0.08, M.metalDark, s * ARR_W, WING_Y / 2, ARR_D * 0.4));
    base.add(box(0.08, WING_Y, 0.08, M.metalDark, s * ARR_W, WING_Y / 2, -ARR_D * 0.4));
    const hinge = new THREE.Group();
    hinge.position.set(s * ARR_W, WING_Y, 0);
    base.add(hinge);
    const wing = panel(ARR_W - 0.04);
    wing.position.x = (s * ARR_W) / 2;
    hinge.add(wing);
    addLeaves(hinge, ARR_W - 0.04, (s * ARR_W) / 2);
    wings.push({ s, hinge });
  }

  const ease = (x) => { const t = Math.min(1, Math.max(0, x)); return t * t * (3 - 2 * t); };
  return (t) => {
    const e1 = ease(t / 0.5); // wings
    const e2 = ease((t - 0.5) / 0.5); // then the leaves
    // Folded, each wing lies upside down over its own half of the centre panel.
    for (const { s, hinge } of wings) hinge.rotation.z = s * (1 - e1) * Math.PI;
    // Leaves swing up and over the top: +z leaves turn negative about x, -z positive.
    for (const { hinge, d } of leaves) hinge.rotation.x = -d * (1 - e2) * Math.PI;
    base.rotation.x = e2 * 0.06; // a slight tilt to the sky once fully open
  };
}

// A wheel-arch band in the ZY plane, extruded across x.
function fenderProfile(z0) {
  return [
    [z0 - 1.32, -0.05], [z0 - 1.24, 0.42], [z0 - 0.72, 0.76], [z0 + 0.72, 0.76],
    [z0 + 1.24, 0.42], [z0 + 1.32, -0.05], [z0 + 1.06, -0.05], [z0 + 0.99, 0.35],
    [z0 + 0.58, 0.6], [z0 - 0.58, 0.6], [z0 - 0.99, 0.35], [z0 - 1.06, -0.05],
  ];
}

// ---------- bodies ----------

// ГЕРМЕС-3, the four-wheel scout: long low wedge, greenhouse cab, armoured box aft.
function truckBody(shell, root) {
  // Exposed chassis spine and skid plate, visible between the wheels.
  shell.add(box(1.5, 0.5, 5.4, M.black, 0, -0.2, 0));
  shell.add(box(2.5, 0.12, 4.6, M.armorDark, 0, -0.52, 0.1));
  for (const s of [-1, 1]) shell.add(box(0.16, 0.3, 4.4, M.metalDark, s * 1.2, -0.34, 0.1));

  // Main hull: one long low wedge, nose down at +Z.
  shell.add(
    extrude(
      [
        [3.9, 0.05], [3.62, 0.5], [2.35, 0.74], [0.6, 0.82], [-2.55, 0.85],
        [-3.58, 0.58], [-3.62, -0.42], [2.85, -0.48], [3.72, -0.22],
      ],
      HULL_W,
      M.armor
    )
  );
  shell.add(extrude([[2.2, 0.8], [-2.5, 0.83], [-2.5, 0.72], [2.2, 0.7]], HULL_W - 0.5, M.armorLit));

  // Angular fender flares; the tyres rise past them as in the reference.
  for (const s of [-1, 1]) {
    for (const z of SPEC.axleZ) {
      shell.add(extrude(fenderProfile(z), 0.46, M.armorDark, 0.05, s * (HULL_W / 2 + 0.18), 0, 0));
    }
    // Sill runner with a glowing strip underneath.
    shell.add(box(0.22, 0.16, 3.0, M.armorDark, s * (HULL_W / 2 + 0.05), -0.36, 0.1));
    shell.add(box(0.1, 0.04, 2.6, M.amber, s * (HULL_W / 2 + 0.12), -0.44, 0.1));
  }

  // Nose: sharp wedge, recessed light bar, skid bumper and winch.
  shell.add(box(2.6, 0.3, 0.14, M.black, 0, 0.36, 3.7));
  for (const s of [-1, 1]) shell.add(box(0.95, 0.075, 0.08, M.headlight, s * 0.6, 0.37, 3.78));
  shell.add(box(0.26, 0.05, 0.07, M.amber, 0, 0.37, 3.78));
  for (const s of [-1, 1]) {
    shell.add(box(0.2, 0.07, 0.07, M.amber, s * 1.33, 0.26, 3.66));
    shell.add(box(0.12, 0.09, 0.06, M.amber, s * 1.6, -0.08, 3.3));
    shell.add(box(0.26, 0.5, 0.5, M.armorDark, s * 1.42, 0.12, 3.35));
  }
  shell.add(box(2.7, 0.3, 0.34, M.armorDark, 0, -0.26, 3.62));
  shell.add(box(1.0, 0.26, 0.26, M.metalDark, 0, -0.24, 3.78));
  shell.add(cyl(0.11, 0.11, 0.9, M.metal, 0, -0.24, 3.8, 'x'));

  // Cab: dark armoured greenhouse with a slit windscreen.
  shell.add(extrude([[2.3, 0.8], [1.98, 1.24], [0.15, 1.28], [-0.3, 0.82]], 2.55, M.glass, 0.04));
  shell.add(extrude([[2.05, 1.3], [0.1, 1.34], [0.1, 1.2], [2.05, 1.16]], 2.75, M.armorLit, 0.05));
  for (const s of [-1, 1]) {
    shell.add(tube([s * 1.3, 1.26, 0.2], [s * 1.35, 0.82, -0.28], 0.08, M.armor));
    shell.add(tube([s * 1.3, 1.26, 1.95], [s * 1.38, 0.82, 2.3], 0.08, M.armor));
    shell.add(box(0.06, 0.46, 2.1, M.armor, s * 1.29, 1.04, 1.05));
    shell.add(box(0.05, 0.05, 1.9, M.amberDim, s * 1.33, 1.2, 1.05));
  }
  shell.add(box(1.15, 0.055, 0.09, M.headlight, 0, 1.35, 1.92));

  // Rear: raised armoured box with a round port, stacks and tail bar.
  shell.add(extrude([[-0.55, 0.85], [-1.0, 1.34], [-3.1, 1.36], [-3.56, 1.02], [-3.58, 0.85]], 2.9, M.armor));
  shell.add(extrude([[-1.1, 1.38], [-3.05, 1.4], [-3.05, 1.28], [-1.1, 1.26]], 2.5, M.armorLit, 0.05));
  for (const s of [-1, 1]) {
    shell.add(cyl(0.3, 0.3, 0.12, M.armorDark, s * 1.46, 1.08, -2.2, 'x'));
    shell.add(cyl(0.21, 0.21, 0.06, M.glass, s * 1.53, 1.08, -2.2, 'x'));
    shell.add(cyl(0.12, 0.12, 0.7, M.metalDark, s * 1.0, 1.25, -3.2));
    shell.add(cyl(0.13, 0.13, 0.08, M.black, s * 1.0, 1.6, -3.2));
    shell.add(box(0.6, 0.12, 0.06, M.tail, s * 0.95, 0.5, -3.66));
    shell.add(box(0.1, 0.06, 0.05, M.amber, s * 1.5, 0.2, -3.6));
  }
  shell.add(box(2.6, 0.32, 0.34, M.armorDark, 0, -0.22, -3.66));
  shell.add(box(0.9, 0.5, 0.12, M.armorDark, 0, 0.55, -3.64));

  // Roof gear: sensor pod, rails, antennas.
  shell.add(box(0.8, 0.2, 0.5, M.black, -0.6, 1.5, -1.3));
  shell.add(box(0.22, 0.07, 0.12, M.amber, -0.6, 1.5, -1.07));
  for (const s of [-1, 1]) shell.add(box(0.08, 0.1, 2.0, M.metalDark, s * 0.95, 1.46, -2.1));
  for (const [x, z, hh] of [[1.2, -3.0, 0.9], [-1.2, -3.05, 0.7]]) {
    shell.add(tube([x, 1.3, z], [x, 1.3 + hh, z], 0.025, M.metalDark));
  }

  // Panel lines and markings along the flanks.
  for (const s of [-1, 1]) {
    const x = s * (HULL_W / 2 + 0.015);
    shell.add(box(0.02, 0.05, 2.4, M.armorDark, x, 0.34, -0.4));
    shell.add(box(0.02, 0.52, 0.04, M.armorDark, x, 0.3, 0.9));
    shell.add(box(0.02, 0.52, 0.04, M.armorDark, x, 0.3, -1.7));
    shell.add(box(0.02, 0.3, 0.55, M.black, x, 0.1, -2.7));
    shell.add(box(0.02, 0.1, 0.34, M.amberDim, x, 0.62, 1.45));
  }

  // Interior: dash, seats, two pilots. The yoke turns, so it stays separate.
  shell.add(box(2.3, 0.26, 0.4, M.black, 0, 0.5, 2.1));
  for (const x of [-0.6, 0.6]) {
    shell.add(box(0.42, 0.02, 0.22, M.screen, x, 0.64, 2.05));
    shell.add(box(0.56, 0.12, 0.56, M.black, x, 0.36, 1.15));
    shell.add(box(0.56, 0.7, 0.1, M.black, x, 0.72, 0.8));
  }
  shell.add(buildPilot(0.6, M.suitOrange));
  shell.add(buildPilot(-0.6, M.suit));
  shell.add(tube([0.6, 0.56, 2.0], [0.6, 0.8, 1.68], 0.028, M.black));

  const setPanels = buildPanels(root);

  const yokePivot = new THREE.Group();
  yokePivot.position.set(0.6, 0.82, 1.62);
  yokePivot.rotation.x = -0.45;
  yokePivot.add(new THREE.Mesh(new THREE.TorusGeometry(0.14, 0.028, 8, 20), M.black));
  root.add(yokePivot);

  return { yokePivot, setPanels, tailLamps: [V(0.95, 0.5, -3.66), V(-0.95, 0.5, -3.66)] };
}

// ---------- sculpted shapes (crawler) ----------

// A rounded rectangle in the XY plane, counter-clockwise seen from +z. Top and bottom
// corners take separate radii; every section has the same point count so they loft.
function rrect(w, yb, yt, rt, rb = rt, seg = 5) {
  const hw = w / 2;
  const h = yt - yb;
  rt = Math.min(rt, hw, h / 2);
  rb = Math.min(rb, hw, h / 2);
  const corners = [
    [hw - rb, yb + rb, rb, -Math.PI / 2],
    [hw - rt, yt - rt, rt, 0],
    [-hw + rt, yt - rt, rt, Math.PI / 2],
    [-hw + rb, yb + rb, rb, Math.PI],
  ];
  const pts = [];
  for (const [cx, cy, r, a0] of corners) {
    for (let i = 0; i <= seg; i++) {
      const a = a0 + (i / seg) * (Math.PI / 2);
      pts.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r]);
    }
  }
  return pts;
}

// Skin a run of rounded sections (ascending z) into one smooth hull, capped flat at
// both ends. This is what takes the crawler off the box: noses taper, roofs roll
// over, edges catch a highlight instead of ending in a hard corner.
function loft(list, mat) {
  const S = list.map((q) => rrect(q.w, q.yb, q.yt, q.rt, q.rb ?? q.rt));
  const n = S[0].length;
  const pos = [];
  list.forEach((q, k) => { for (const [x, y] of S[k]) pos.push(x, y, q.z); });
  const idx = [];
  for (let k = 0; k < list.length - 1; k++) {
    for (let i = 0; i < n; i++) {
      const a = k * n + i;
      const b = k * n + ((i + 1) % n);
      const c = a + n;
      const d = b + n;
      idx.push(a, b, c, b, d, c);
    }
  }
  const skin = new THREE.BufferGeometry();
  skin.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  skin.setIndex(idx);
  skin.computeVertexNormals();

  const cap = [];
  for (const [k, dir] of [[0, -1], [list.length - 1, 1]]) {
    const P = S[k];
    const z = list[k].z;
    let cx = 0;
    let cy = 0;
    for (const [x, y] of P) { cx += x / n; cy += y / n; }
    for (let i = 0; i < n; i++) {
      const [x0, y0] = P[i];
      const [x1, y1] = P[(i + 1) % n];
      if (dir > 0) cap.push(cx, cy, z, x0, y0, z, x1, y1, z);
      else cap.push(cx, cy, z, x1, y1, z, x0, y0, z);
    }
  }
  const caps = new THREE.BufferGeometry();
  caps.setAttribute('position', new THREE.Float32BufferAttribute(cap, 3));
  caps.computeVertexNormals();

  const g = new THREE.Group();
  g.add(new THREE.Mesh(skin, mat), new THREE.Mesh(caps, mat));
  return g;
}

// A rounded bar of constant section between z0 and z1, ends eased in.
const bar = (w, yb, yt, r, z0, z1, mat, x = 0, ease = 0.08) => {
  const g = loft([
    { z: z0, w: w - ease * 2, yb: yb + ease, yt: yt - ease, rt: r },
    { z: z0 + ease, w, yb, yt, rt: r },
    { z: z1 - ease, w, yb, yt, rt: r },
    { z: z1, w: w - ease * 2, yb: yb + ease, yt: yt - ease, rt: r },
  ], mat);
  g.position.x = x;
  return g;
};

// A bent tube through the given points (smooth, not kinked).
function bentTube(points, r, mat) {
  const curve = new THREE.CatmullRomCurve3(points.map((p) => V(...p)), false, 'centripetal');
  return new THREE.Mesh(new THREE.TubeGeometry(curve, points.length * 12, r, 8, false), mat);
}

// ТИТАН-6, the six-wheel crawler: a narrow, tapered armoured tub slung between the
// wheels so all six fat tyres stand bare, with no arches over them; a rounded
// cab-over with a raked screen up front; an open deck under a bent-tube cage aft,
// with the solar array folded on the cage roof.
function crawlerBody(shell, root) {
  const D = 0.6; // deck height

  // Tub: tapered, chamfered nose and tail, rounded bilge. The tyres start 1.43 m out.
  shell.add(loft([
    { z: -4.7, w: 2.1, yb: -0.2, yt: 0.46, rt: 0.16, rb: 0.2 },
    { z: -4.45, w: 2.46, yb: -0.46, yt: D, rt: 0.2, rb: 0.32 },
    { z: 3.9, w: 2.5, yb: -0.5, yt: D, rt: 0.2, rb: 0.32 },
    { z: 4.45, w: 2.3, yb: -0.28, yt: D - 0.02, rt: 0.2, rb: 0.3 },
    { z: 4.72, w: 1.86, yb: 0.02, yt: 0.52, rt: 0.2, rb: 0.2 },
  ], M.armor));
  shell.add(box(2.0, 0.1, 8.0, M.armorDark, 0, -0.56, 0));
  for (const s of [-1, 1]) shell.add(box(0.18, 0.3, 8.8, M.metalDark, s * 1.08, -0.34, 0));
  for (const z of [-4.1, -1.7, 1.7, 4.1]) shell.add(box(2.3, 0.14, 0.18, M.black, 0, -0.44, z));

  for (const s of [-1, 1]) {
    // Rounded lockers and marker strips in the gaps between the wheels.
    for (const z of [-1.67, 1.67]) {
      shell.add(bar(0.24, -0.1, 0.5, 0.08, z - 0.5, z + 0.5, M.armorDark, s * 1.28));
      shell.add(box(0.02, 0.4, 0.03, M.black, s * 1.41, 0.2, z));
      shell.add(box(0.05, 0.05, 0.8, M.amber, s * 1.41, -0.16, z));
    }
  }

  // Cab-over: armoured lower half, then a glass bubble with a raked screen under a
  // rolled armour roof. The glass is a hull of its own so the crew show through it.
  shell.add(loft([
    { z: 1.5, w: 2.78, yb: D - 0.05, yt: 1.12, rt: 0.12, rb: 0.05 },
    { z: 4.15, w: 2.78, yb: D - 0.05, yt: 1.12, rt: 0.12, rb: 0.05 },
    { z: 4.62, w: 2.2, yb: D - 0.05, yt: 1.02, rt: 0.2, rb: 0.05 },
  ], M.armor));
  shell.add(loft([
    { z: 1.58, w: 2.6, yb: 1.08, yt: 1.86, rt: 0.42, rb: 0.02 },
    { z: 3.6, w: 2.58, yb: 1.08, yt: 1.84, rt: 0.42, rb: 0.02 },
    { z: 4.05, w: 2.42, yb: 1.08, yt: 1.66, rt: 0.36, rb: 0.02 },
    { z: 4.4, w: 2.2, yb: 1.08, yt: 1.14, rt: 0.03, rb: 0.02 },
  ], M.glass));
  shell.add(loft([
    { z: 1.45, w: 2.7, yb: 1.6, yt: 1.94, rt: 0.45, rb: 0.04 },
    { z: 3.45, w: 2.68, yb: 1.6, yt: 1.92, rt: 0.45, rb: 0.04 },
    { z: 3.78, w: 2.5, yb: 1.6, yt: 1.84, rt: 0.38, rb: 0.04 },
  ], M.armorLit));
  shell.add(loft([
    { z: 1.44, w: 2.66, yb: 1.08, yt: 1.9, rt: 0.44, rb: 0.03 },
    { z: 1.56, w: 2.66, yb: 1.08, yt: 1.9, rt: 0.44, rb: 0.03 },
  ], M.armor));
  for (const s of [-1, 1]) {
    shell.add(bentTube([[s * 1.1, 1.1, 4.42], [s * 1.2, 1.5, 4.18], [s * 1.28, 1.78, 3.72]], 0.06, M.armor));
    shell.add(box(0.05, 0.04, 2.3, M.amberDim, s * 1.4, 1.1, 2.95));
    // Mirrors on stalks.
    shell.add(bentTube([[s * 1.3, 1.4, 4.1], [s * 1.6, 1.5, 4.2], [s * 1.78, 1.52, 4.18]], 0.025, M.metalDark));
    shell.add(bar(0.07, 1.36, 1.72, 0.03, 4.08, 4.3, M.black, s * 1.8, 0.02));
  }
  // Roof light bar (the long-range beam lives in it, see mounts.far).
  shell.add(bar(2.2, 1.9, 2.06, 0.07, 3.28, 3.5, M.black, 0, 0.03));
  shell.add(box(1.9, 0.06, 0.04, M.headlight, 0, 1.97, 3.52));
  for (const s of [-1, 1]) shell.add(box(0.12, 0.1, 0.05, M.amber, s * 1.02, 1.97, 3.52));
  // Sensor mast with a round head.
  shell.add(tube([-0.9, 1.9, 2.0], [-0.9, 2.62, 2.0], 0.04, M.metalDark));
  shell.add(cyl(0.2, 0.2, 0.24, M.black, -0.9, 2.72, 2.0, 'x'));
  shell.add(cyl(0.12, 0.12, 0.26, M.glass, -0.9, 2.72, 2.02, 'x'));
  shell.add(tube([0.9, 1.9, 1.9], [0.9, 2.9, 1.9], 0.02, M.metalDark));

  // Nose: rolled bumper, winch, round lamps in pods.
  shell.add(loft([
    { z: 4.5, w: 3.0, yb: -0.34, yt: 0.06, rt: 0.16 },
    { z: 4.82, w: 3.0, yb: -0.34, yt: 0.06, rt: 0.16 },
    { z: 4.98, w: 2.6, yb: -0.3, yt: 0.0, rt: 0.14 },
  ], M.armorDark));
  shell.add(cyl(0.13, 0.13, 0.95, M.metal, 0, -0.14, 5.02, 'x'));
  for (const s of [-1, 1]) {
    shell.add(cyl(0.2, 0.22, 0.2, M.black, s * 1.0, 0.32, 4.6, 'z'));
    shell.add(cyl(0.16, 0.16, 0.04, M.headlight, s * 1.0, 0.32, 4.7, 'z'));
    shell.add(cyl(0.05, 0.05, 0.04, M.amber, s * 1.36, 0.1, 4.95, 'z'));
    shell.add(bentTube([[s * 1.35, -0.14, 4.9], [s * 1.34, 0.3, 4.72], [s * 1.2, 0.56, 4.5]], 0.05, M.metalDark));
  }

  // Interior.
  shell.add(box(2.3, 0.24, 0.36, M.black, 0, 0.94, 3.9));
  for (const x of [-0.55, 0.55]) {
    shell.add(box(0.42, 0.02, 0.22, M.screen, x, 1.07, 3.85));
    shell.add(box(0.56, 0.12, 0.56, M.black, x, 0.71, 2.7));
    shell.add(box(0.56, 0.7, 0.1, M.black, x, 1.07, 2.35));
  }
  for (const [x, suit] of [[0.55, M.suitOrange], [-0.55, M.suit]]) {
    const pilot = buildPilot(x, suit);
    pilot.position.y += 0.35;
    pilot.position.z += 1.55;
    shell.add(pilot);
  }
  shell.add(tube([0.55, 0.98, 3.8], [0.55, 1.15, 3.28], 0.028, M.black));

  // Cargo deck with rolled edge rails, and a bent-tube cage: three hoops that round
  // over at the shoulders, tied by rails that sit on those shoulders.
  shell.add(box(2.9, 0.08, 5.9, M.armorLit, 0, D, -1.5));
  for (let i = 0; i < 7; i++) shell.add(box(2.8, 0.03, 0.05, M.armorDark, 0, D + 0.05, -4.2 + i * 0.85));
  for (const s of [-1, 1]) shell.add(tube([s * 1.45, D + 0.08, 1.4], [s * 1.45, D + 0.08, -4.4], 0.06, M.metalDark));
  const cy = 1.8;
  const hoop = (z) => bentTube([
    [-1.35, D, z], [-1.35, cy - 0.35, z], [-1.22, cy - 0.08, z], [-0.95, cy, z],
    [0.95, cy, z], [1.22, cy - 0.08, z], [1.35, cy - 0.35, z], [1.35, D, z],
  ], 0.06, M.metalDark);
  for (const z of [1.4, -1.5, -4.35]) shell.add(hoop(z));
  for (const s of [-1, 1]) {
    shell.add(tube([s * 1.24, cy - 0.06, 1.4], [s * 1.24, cy - 0.06, -4.35], 0.055, M.metalDark));
    shell.add(tube([s * 1.35, D + 0.1, 0.9], [s * 1.3, cy - 0.3, -1.5], 0.04, M.metalDark));
  }

  // Load: rounded crates, a capsule fuel cell lying lengthwise, a spare at the tail.
  shell.add(bar(0.95, D, D + 0.72, 0.08, 0.08, 1.02, M.armorDark, 0.62, 0.03));
  shell.add(bar(0.95, D, D + 0.52, 0.08, -0.98, -0.04, M.panelBack, 0.62, 0.03));
  shell.add(box(0.96, 0.05, 0.9, M.amberDim, 0.62, D + 0.5, 0.55));
  const tank = mesh(new THREE.CapsuleGeometry(0.36, 1.5, 6, 16), M.metal, -0.72, D + 0.41, -1.2);
  tank.rotation.x = Math.PI / 2;
  shell.add(tank);
  for (const z of [-0.6, -1.8]) shell.add(cyl(0.38, 0.38, 0.08, M.armorDark, -0.72, D + 0.41, z, 'z'));
  const spare = mesh(new THREE.TorusGeometry(0.46, 0.2, 12, 28), M.tire, 0, D + 0.68, -3.95);
  shell.add(spare);
  shell.add(cyl(0.3, 0.3, 0.3, M.rim, 0, D + 0.68, -3.95, 'z'));

  // Tail: rolled panel and bumper.
  shell.add(loft([
    { z: -4.66, w: 2.9, yb: 0.12, yt: 0.64, rt: 0.12 },
    { z: -4.54, w: 2.9, yb: 0.12, yt: 0.64, rt: 0.12 },
  ], M.armor));
  shell.add(loft([
    { z: -4.9, w: 2.6, yb: -0.36, yt: -0.02, rt: 0.14 },
    { z: -4.78, w: 3.0, yb: -0.38, yt: 0.02, rt: 0.16 },
    { z: -4.45, w: 3.0, yb: -0.38, yt: 0.02, rt: 0.16 },
  ], M.armorDark));
  for (const s of [-1, 1]) {
    shell.add(box(0.6, 0.12, 0.05, M.tail, s * 1.0, 0.45, -4.68));
    shell.add(cyl(0.05, 0.05, 0.04, M.amber, s * 1.4, 0.24, -4.68, 'z'));
    shell.add(bentTube([[s * 1.35, D, -4.35], [s * 1.33, 0.2, -4.6], [s * 1.2, -0.18, -4.7]], 0.05, M.metalDark));
  }

  const setPanels = buildArray(root, { y: cy + 0.1, z: -1.45 });

  const yokePivot = new THREE.Group();
  yokePivot.position.set(0.55, 1.17, 3.17);
  yokePivot.rotation.x = -0.45;
  yokePivot.add(new THREE.Mesh(new THREE.TorusGeometry(0.14, 0.028, 8, 20), M.black));
  root.add(yokePivot);

  return { yokePivot, setPanels, tailLamps: [V(1.0, 0.45, -4.68), V(-1.0, 0.45, -4.68)] };
}

// ---------- vehicle ----------

export function buildVehicle() {
  const root = new THREE.Group();
  const shell = new THREE.Group(); // static body, merged at the end
  const { yokePivot, setPanels, tailLamps } = (CHASSIS === 'crawler' ? crawlerBody : truckBody)(shell, root);

  // Wheels + suspension, one corner per entry in the shared wheel table.
  const wheels = WHEEL_DEFS.map((d) => {
    const setCorner = buildCorner(shell, root, d.s, d.z);
    const hub = new THREE.Group();
    const steer = new THREE.Group();
    const spin = buildWheel();
    steer.add(spin);
    hub.add(steer);
    root.add(hub);
    return { ...d, hub, steer, spin, setCorner };
  });

  root.add(mergeStatic(shell));
  root.traverse((o) => {
    if (!o.isMesh || o.castShadow) return;
    o.receiveShadow = true;
    o.castShadow = !NO_CAST.has(o.material);
  });

  function setSuspension(i, L) {
    const w = wheels[i];
    w.hub.position.set(w.x, -L, w.z);
    w.setCorner(L);
  }

  // 0 = running lights, 1 = on the brakes.
  const tailDim = lamp(0x7e1a0b, 2);
  const tailLit = lamp(0xff3a1c, 6);
  function setBrake(k) {
    M.tail.color.copy(tailDim).lerp(tailLit, k);
  }

  function setSteer(delta, speed = 0) {
    for (const w of wheels) w.steer.rotation.y = steerAngle(w, delta, speed);
    yokePivot.rotation.z = -delta * 2.5;
  }

  wheels.forEach((_, i) => setSuspension(i, SUSP.Lstatic));
  setPanels(0);
  return { root, wheels, setSuspension, setSteer, setPanels, setBrake, TAIL_LAMPS: tailLamps, MOUNTS: SPEC.mounts };
}
