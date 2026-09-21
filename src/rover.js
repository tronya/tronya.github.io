import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';

// Rover-local space: origin on the ground plane, forward = +Z, left = +X.
export const WHEEL_R = 0.33;
export const WHEEL_X = 1.08;
export const WHEEL_Z = { front: 1.2, mid: -0.05, rear: -1.25 };

const std = (color, metalness, roughness, extra = {}) =>
  new THREE.MeshStandardMaterial({ color, metalness, roughness, ...extra });

const M = {
  body: std(0xe9e6df, 0.35, 0.5),
  panel: std(0xc4c8cd, 0.8, 0.35),
  strut: std(0xb8bcc2, 0.85, 0.3),
  dark: std(0x1e2023, 0.4, 0.6),
  gold: std(0xd9a93a, 1.0, 0.28),
  wheel: std(0xaeb2b7, 0.95, 0.38, { side: THREE.DoubleSide }),
  glass: std(0x080b12, 0.9, 0.08),
  led: new THREE.MeshBasicMaterial({ color: 0x4fd0ff }),
};

const V = (x, y, z) => new THREE.Vector3(x, y, z);

function mesh(geo, mat, x = 0, y = 0, z = 0) {
  const m = new THREE.Mesh(geo, mat);
  m.position.set(x, y, z);
  return m;
}
const box = (w, h, d, mat, x, y, z) => mesh(new THREE.BoxGeometry(w, h, d), mat, x, y, z);

function cyl(rt, rb, h, mat, x, y, z, axis = 'y', seg = 24) {
  const m = mesh(new THREE.CylinderGeometry(rt, rb, h, seg), mat, x, y, z);
  if (axis === 'x') m.rotation.z = Math.PI / 2;
  if (axis === 'z') m.rotation.x = Math.PI / 2;
  return m;
}

function tube(a, b, r, mat, seg = 12) {
  const A = V(...a);
  const B = V(...b);
  const dir = B.clone().sub(A);
  const len = dir.length();
  const m = mesh(new THREE.CylinderGeometry(r, r, len, seg), mat);
  m.position.copy(A).add(B).multiplyScalar(0.5);
  m.quaternion.setFromUnitVectors(V(0, 1, 0), dir.normalize());
  return m;
}

const ball = (r, mat, p) => mesh(new THREE.SphereGeometry(r, 16, 12), mat, ...p);

// A jointed strut: tubes between consecutive points, ball joints at every vertex.
function strut(points, r, mat = M.strut) {
  const g = new THREE.Group();
  for (let i = 0; i < points.length - 1; i++) g.add(tube(points[i], points[i + 1], r, mat));
  for (const p of points) g.add(ball(r * 1.15, mat, p));
  return g;
}

// ---------- wheel ----------

const wheelGeo = {
  rim: new THREE.CylinderGeometry(0.3, 0.3, 0.28, 40, 1, true),
  ring: new THREE.RingGeometry(0.2, 0.31, 40),
  hub: new THREE.CylinderGeometry(0.085, 0.085, 0.36, 20),
  cap: new THREE.CylinderGeometry(0.06, 0.06, 0.04, 20),
  spoke: new THREE.BoxGeometry(0.03, 0.2, 0.06),
  grouser: new THREE.BoxGeometry(0.16, 0.04, 0.045),
};

function buildWheel() {
  const spin = new THREE.Group();

  const rim = new THREE.Mesh(wheelGeo.rim, M.wheel);
  rim.rotation.z = Math.PI / 2;
  spin.add(rim);

  for (const side of [-1, 1]) {
    const ring = new THREE.Mesh(wheelGeo.ring, M.wheel);
    ring.rotation.y = Math.PI / 2;
    ring.position.x = side * 0.14;
    spin.add(ring);
  }

  const hub = new THREE.Mesh(wheelGeo.hub, M.dark);
  hub.rotation.z = Math.PI / 2;
  spin.add(hub);
  for (const side of [-1, 1]) {
    const cap = new THREE.Mesh(wheelGeo.cap, M.panel);
    cap.rotation.z = Math.PI / 2;
    cap.position.x = side * 0.19;
    spin.add(cap);
  }

  for (let i = 0; i < 6; i++) {
    const pivot = new THREE.Group();
    pivot.rotation.x = (i * Math.PI) / 3;
    const spoke = new THREE.Mesh(wheelGeo.spoke, M.wheel);
    spoke.position.y = 0.185;
    pivot.add(spoke);
    spin.add(pivot);
  }

  // Chevron grousers around the tread.
  const N = 20;
  for (let i = 0; i < N; i++) {
    const pivot = new THREE.Group();
    pivot.rotation.x = (i * Math.PI * 2) / N;
    for (const k of [-1, 1]) {
      const g = new THREE.Mesh(wheelGeo.grouser, M.wheel);
      g.position.set(k * 0.075, 0.315, 0);
      g.rotation.y = k * 0.45;
      pivot.add(g);
    }
    spin.add(pivot);
  }
  return spin;
}

// ---------- rover ----------

export function buildRover() {
  const root = new THREE.Group();

  // Hull
  root.add(mesh(new RoundedBoxGeometry(1.4, 0.5, 2.0, 4, 0.07), M.body, 0, 0.98, 0));
  root.add(box(1.2, 0.1, 1.7, M.panel, 0, 0.7, 0));
  root.add(box(1.42, 0.04, 2.02, M.panel, 0, 1.245, 0));
  for (const s of [-1, 1]) root.add(box(0.02, 0.34, 1.5, M.gold, s * 0.71, 0.98, 0));

  // Deck details: sample inlets, vents, status LED
  for (const [x, z] of [[-0.32, 0.2], [0.05, -0.05]]) {
    root.add(cyl(0.12, 0.12, 0.05, M.panel, x, 1.28, z));
    root.add(cyl(0.08, 0.08, 0.06, M.dark, x, 1.285, z));
  }
  root.add(box(0.35, 0.05, 0.22, M.dark, 0.35, 1.28, -0.4));
  root.add(box(0.28, 0.04, 0.5, M.panel, -0.35, 1.275, 0.7));
  const led = ball(0.03, M.led, [0.05, 1.3, -0.75]);
  root.add(led);

  // Hazcams (front + rear)
  for (const z of [1.012, -1.012]) {
    for (const x of [-0.45, 0.45]) {
      root.add(box(0.16, 0.1, 0.04, M.dark, x, 0.8, z));
      root.add(cyl(0.03, 0.03, 0.03, M.glass, x, 0.8, z + Math.sign(z) * 0.02, 'z'));
    }
  }

  // Rocker-bogie suspension
  const wheels = [];
  for (const s of [1, -1]) {
    const R = [s * 0.74, 0.98, 0.32];
    const Bp = [s * 0.86, 0.62, -0.55];
    const hub = (z) => [s * 0.88, WHEEL_R, z];

    root.add(strut([R, [s * 0.86, 0.72, 0.95], hub(WHEEL_Z.front)], 0.05));
    root.add(strut([R, Bp], 0.05));
    root.add(strut([Bp, hub(WHEEL_Z.mid)], 0.045));
    root.add(strut([Bp, hub(WHEEL_Z.rear)], 0.045));

    root.add(cyl(0.075, 0.075, 0.16, M.dark, R[0], R[1], R[2], 'x'));
    root.add(cyl(0.07, 0.07, 0.14, M.dark, Bp[0], Bp[1], Bp[2], 'x'));

    for (const [name, z] of Object.entries(WHEEL_Z)) {
      root.add(tube(hub(z), [s * WHEEL_X, WHEEL_R, z], 0.045, M.dark));
      const mount = new THREE.Group();
      mount.position.set(s * WHEEL_X, WHEEL_R, z);
      const spinner = buildWheel();
      mount.add(spinner);
      root.add(mount);
      wheels.push({ mount, spin: spinner, side: s, z, name });
    }
  }

  // Mast with camera head
  const mast = new THREE.Group();
  mast.position.set(0.38, 1.265, 0.55);
  mast.add(cyl(0.09, 0.11, 0.06, M.dark, 0, 0.03, 0));
  mast.add(cyl(0.035, 0.035, 0.75, M.panel, 0, 0.42, 0));
  const mastHead = new THREE.Group();
  mastHead.position.y = 0.82;
  mastHead.add(box(0.46, 0.17, 0.15, M.body, 0, 0, 0));
  mastHead.add(box(0.5, 0.02, 0.2, M.panel, 0, 0.095, 0));
  for (const x of [-0.14, 0.14]) {
    mastHead.add(cyl(0.062, 0.062, 0.03, M.dark, x, 0, 0.09, 'z'));
    mastHead.add(cyl(0.045, 0.045, 0.04, M.glass, x, 0, 0.095, 'z'));
  }
  mastHead.add(box(0.1, 0.1, 0.18, M.panel, 0, 0.16, -0.02));
  mastHead.add(cyl(0.03, 0.03, 0.03, M.glass, 0, 0.16, 0.075, 'z'));
  mast.add(mastHead);
  root.add(mast);

  // High-gain antenna (hexagonal dish)
  const hga = new THREE.Group();
  hga.position.set(-0.42, 1.265, -0.55);
  hga.add(tube([0, 0, 0], [0, 0.32, 0], 0.03, M.panel));
  const dish = new THREE.Group();
  dish.position.y = 0.4;
  dish.add(cyl(0.24, 0.24, 0.025, M.body, 0, 0, 0, 'y', 6));
  dish.add(cyl(0.25, 0.25, 0.012, M.dark, 0, -0.012, 0, 'y', 6));
  dish.add(tube([0, 0, 0], [0.05, 0.16, 0.02], 0.012, M.panel));
  dish.add(ball(0.025, M.panel, [0.05, 0.16, 0.02]));
  dish.rotation.set(-0.5, 0, 0.3);
  hga.add(dish);
  root.add(hga);

  // UHF whip
  root.add(tube([0.55, 1.265, -0.82], [0.55, 1.75, -0.82], 0.018, M.panel));
  root.add(ball(0.035, M.panel, [0.55, 1.76, -0.82]));

  // RTG (rear, fins)
  const rtg = new THREE.Group();
  rtg.position.set(0, 1.0, -1.5);
  rtg.rotation.x = -0.1;
  rtg.add(cyl(0.15, 0.15, 0.86, M.dark, 0, 0, 0, 'z'));
  for (let i = 0; i < 8; i++) rtg.add(cyl(0.2, 0.2, 0.022, M.panel, 0, 0, -0.32 + i * 0.09, 'z'));
  rtg.add(cyl(0.16, 0.16, 0.05, M.gold, 0, 0, -0.44, 'z'));
  root.add(rtg);
  root.add(box(0.5, 0.1, 0.14, M.dark, 0, 1.0, -1.06));
  for (const s of [-1, 1]) root.add(tube([s * 0.2, 0.75, -1.0], [s * 0.1, 0.93, -1.3], 0.025, M.strut));

  // Robotic arm, folded at the front
  root.add(box(0.3, 0.2, 0.16, M.dark, 0, 0.88, 1.06));
  root.add(cyl(0.085, 0.085, 0.34, M.panel, 0, 0.88, 1.12, 'x'));
  root.add(strut([[0, 0.9, 1.12], [0, 1.0, 1.42]], 0.045));
  root.add(strut([[0, 1.0, 1.42], [0, 0.86, 1.56]], 0.04));
  const turret = new THREE.Group();
  turret.position.set(0, 0.82, 1.6);
  turret.add(cyl(0.16, 0.16, 0.26, M.dark, 0, 0, 0, 'z'));
  turret.add(cyl(0.04, 0.04, 0.32, M.panel, 0, 0.08, 0.2, 'z'));
  turret.add(cyl(0.045, 0.02, 0.1, M.gold, 0, 0.08, 0.38, 'z'));
  turret.add(box(0.12, 0.12, 0.2, M.panel, 0.14, -0.04, 0.05));
  turret.add(cyl(0.045, 0.045, 0.04, M.glass, -0.12, 0.1, 0.14, 'z'));
  root.add(turret);

  root.traverse((o) => {
    if (o.isMesh) {
      o.castShadow = true;
      o.receiveShadow = true;
    }
  });
  led.castShadow = false;

  const update = (t) => {
    mastHead.rotation.y = Math.sin(t * 0.5) * 0.9;
    dish.rotation.x = -0.5 + Math.sin(t * 0.3) * 0.08;
    const pulse = 0.5 + 0.5 * Math.sin(t * 4);
    led.material.color.setRGB(0.1 + 0.2 * pulse, 0.5 + 0.5 * pulse, 0.7 + 0.3 * pulse);
  };

  return { root, wheels, update };
}
