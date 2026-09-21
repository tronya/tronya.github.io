import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

// Vehicle-local space: origin on the suspension mount plane, forward = +Z, left = +X.
// Ground sits WHEEL_R + L below the mount plane, so y = -1.43 at static ride height.
const WHEEL_SCALE = 1.2; // wheel model is built at radius 0.855, then scaled up
export const WHEEL_R = 0.855 * WHEEL_SCALE;
export const WHEEL_X = 1.75;
const HULL_W = 3.1; // narrower than the track, so the tyres are the widest point
export const AXLE_Z = { front: 2.4, rear: -2.4 };
export const WHEELBASE = AXLE_Z.front - AXLE_Z.rear;
// Suspension length = distance from the mount plane down to the wheel centre.
export const SUSP = { Lmin: 0.15, Lmax: 0.72, Lfree: 0.52, Lstatic: 0.465 };

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
  amber: new THREE.MeshBasicMaterial({ color: 0xff9420 }),
  amberDim: new THREE.MeshBasicMaterial({ color: 0xa8560f }),
  // Painted steel, not a lamp: as an unlit material the coil springs glowed under
  // the rover all night.
  spring: std(0x9c4a16, 0.55, 0.45),
  headlight: new THREE.MeshBasicMaterial({ color: 0xd8c49a }),
  tail: new THREE.MeshBasicMaterial({ color: 0x7e1a0b }),
  screen: new THREE.MeshBasicMaterial({ color: 0xff8a2a }),
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

const halfProfile = [
  [0.34, 0.36], [0.56, 0.37], [0.73, 0.32], [0.815, 0.2], [0.835, 0],
];
const tireGeo = new THREE.LatheGeometry(
  [...halfProfile.map(([r, a]) => [r, -a]), ...halfProfile.slice(0, -1).reverse().map(([r, a]) => [r, a])].map(
    ([r, a]) => new THREE.Vector2(r, a)
  ),
  40
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

    // Ten-spoke rim, recessed into the tyre on both faces.
    for (const side of [-1, 1]) {
      const face = new THREE.Group();
      face.position.x = side * 0.3;
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
  const arms = Array.from({ length: 4 }, () => new THREE.Mesh(UNIT, M.metalDark));
  const spring = new THREE.Mesh(SPRING_GEO, M.spring);
  const damper = new THREE.Mesh(UNIT, M.black);
  const piston = new THREE.Mesh(UNIT, M.metal);
  const shaft = new THREE.Mesh(UNIT, M.metalDark);
  const knuckle = box(0.14, 0.44, 0.24, M.metalDark, 0, 0, 0);
  root.add(...arms, spring, damper, piston, shaft, knuckle);

  const top = V(s * 0.95, 0.55, z);
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
    lowOut.set(s * 1.22, -L - 0.1, z);
    upOut.set(s * 1.2, -L + 0.28, z);
    place(arms[0], lowIn[0], lowOut, 0.055);
    place(arms[1], lowIn[1], lowOut, 0.055);
    place(arms[2], upIn[0], upOut, 0.045);
    place(arms[3], upIn[1], upOut, 0.045);
    knuckle.position.set(s * 1.24, -L + 0.08, z);
    place(shaft, diff, V(s * 1.2, -L, z), 0.055);

    bot.set(s * 1.0, -L - 0.08, z);
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

function buildPanels(root) {
  const hinges = [];
  for (const s of [-1, 1]) {
    // Inner segment hinges at the deck edge; the sides sit at slightly different
    // heights so they nest instead of z-fighting when folded.
    const inner = new THREE.Group();
    inner.position.set(s * 1.28, 1.41 + (s > 0 ? 0 : 0.14), -2.05);
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

// A wheel-arch band in the ZY plane, extruded across x.
function fenderProfile(z0) {
  return [
    [z0 - 1.32, -0.05], [z0 - 1.24, 0.42], [z0 - 0.72, 0.76], [z0 + 0.72, 0.76],
    [z0 + 1.24, 0.42], [z0 + 1.32, -0.05], [z0 + 1.06, -0.05], [z0 + 0.99, 0.35],
    [z0 + 0.58, 0.6], [z0 - 0.58, 0.6], [z0 - 0.99, 0.35], [z0 - 1.06, -0.05],
  ];
}

// Ackermann geometry: the inner front wheel turns more than the outer one.
export function ackermann(delta) {
  const a = Math.abs(delta);
  if (a < 1e-4) return { left: 0, right: 0 };
  const R = WHEELBASE / Math.tan(a);
  const inner = Math.atan(WHEELBASE / (R - WHEEL_X));
  const outer = Math.atan(WHEELBASE / (R + WHEEL_X));
  return delta > 0 ? { left: inner, right: outer } : { left: -outer, right: -inner };
}

// ---------- vehicle ----------

export function buildVehicle() {
  const root = new THREE.Group();
  const shell = new THREE.Group(); // static body, merged at the end

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
    for (const z of [AXLE_Z.front, AXLE_Z.rear]) {
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

  // Wheels + suspension.
  const defs = [
    { name: 'FL', s: 1, z: AXLE_Z.front, front: true },
    { name: 'FR', s: -1, z: AXLE_Z.front, front: true },
    { name: 'RL', s: 1, z: AXLE_Z.rear, front: false },
    { name: 'RR', s: -1, z: AXLE_Z.rear, front: false },
  ];
  const wheels = defs.map((d) => {
    const setCorner = buildCorner(shell, root, d.s, d.z);
    const hub = new THREE.Group();
    const steer = new THREE.Group();
    const spin = buildWheel();
    steer.add(spin);
    hub.add(steer);
    root.add(hub);
    return { ...d, x: d.s * WHEEL_X, hub, steer, spin, setCorner };
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
  const tailDim = new THREE.Color(0x7e1a0b);
  const tailLit = new THREE.Color(0xff3a1c);
  function setBrake(k) {
    M.tail.color.copy(tailDim).lerp(tailLit, k);
  }

  function setSteer(delta) {
    const { left, right } = ackermann(delta);
    for (const w of wheels) if (w.front) w.steer.rotation.y = w.s > 0 ? left : right;
    yokePivot.rotation.z = -delta * 2.5;
  }

  wheels.forEach((_, i) => setSuspension(i, SUSP.Lstatic));
  setPanels(0);
  return { root, wheels, setSuspension, setSteer, setPanels, setBrake, TAIL_LAMPS: [
    new THREE.Vector3(0.95, 0.5, -3.66), new THREE.Vector3(-0.95, 0.5, -3.66),
  ] };
}
