import * as THREE from 'three';
import { groundHeight } from './terrain.js';
import { WHEEL_R, WHEEL_X, AXLE_Z, WHEELBASE, SUSP, ackermann } from './vehicle.js';

// Rigid-body vehicle in SI units on Mars gravity. The body has mass, inertia and a
// high centre of mass; every wheel has a spring/damper, tyre friction limited by the
// load on it, and the hull collides with the ground, so the truck can slide and roll over.

export const GRAVITY = 3.71;
const MASS = 4200; // a heavy, armoured rover
const WEIGHT = MASS * GRAVITY;
const CORNER = WEIGHT / 4; // static load on one wheel
// Low and central: the battery pack sits in the floor, which is what keeps a
// tall-wheeled rover from tipping when it lands off a dune.
const COM = new THREE.Vector3(0, -0.32, 0); // relative to the suspension mount plane
const BOX = { w: 3.6, h: 2.0, l: 7.2 };
const INERTIA = {
  x: (MASS / 12) * (BOX.h ** 2 + BOX.l ** 2), // pitch
  y: (MASS / 12) * (BOX.w ** 2 + BOX.l ** 2) * 0.62, // yaw (lower = turns in more eagerly)
  z: (MASS / 12) * (BOX.w ** 2 + BOX.h ** 2), // roll
};

// Grip must stay under the rollover threshold or the tyres hold harder than the
// rover can resist tipping, and it lies down instead of sliding. With the battery
// floor giving a 1.39 m centre of mass and a 1.75 m half-track, that limit is
// 1.26 g; 1.1 leaves the rover sliding first, with margin.
const MU = 1.3; // tyre grip on dust
// Stiff and well damped: on Mars gravity a soft spring wallows for seconds after
// every bump. ~1.4 Hz with 40/65 % of critical damping settles the body at once.
const K_SPRING = (MASS * GRAVITY) / 4 / (SUSP.Lfree - SUSP.Lstatic);
const C_BUMP = 4600 * (MASS / 2500);
const C_REBOUND = 7200 * (MASS / 2500);
const LDOT_MAX = 6; // damper blow-off, m/s — keeps a kerb strike from spiking the damper
const K_ARB = 26000 * (MASS / 2500); // anti-roll bar, per axle

// Bump stop. Past full compression it acts as a one-way velocity limit rather than a
// spring: it can cancel inward motion and ease the wheel out of a ledge at walking
// pace, but never pushes a chassis that is already separating. A spring here stores
// the whole height of the obstacle and fires the truck into orbit.
const PEN_MAX = 0.12;
const BUMP_STOP_MAX = 3.6 * CORNER;
const BUMP_EXIT_V = 1.2; // m/s, the fastest the bump stop alone will push a wheel out
const C_STOP = 10 * CORNER;
// A tyre cannot teleport onto an obstacle; the contact point may only rise this
// fast (m/s per m/s of travel, plus a floor), which bounds the energy a step injects.
const CLIMB_RATE = 1.6;
const CLIMB_FLOOR = 2.5;
// Below this the suspension axis is too horizontal to reach the ground at all.
const UP_MIN = 0.5;
const UP_FADE = 0.8;
const F_DRIVE = 26000; // total, all four wheels
const POWER = 180000;
const V_MAX = 12; // ~43 km/h cruising
const V_MAX_BOOST = 22; // Shift only, and it drinks the battery
const V_MAX_REVERSE = 6;
// Steering behaves like a wheel, not a spring: the angle stays where it is left.
const MECH_STEER = 0.56; // mechanical lock at the knuckle
// Time to wind the wheel from centre to full lock. Scaling the rate to the current
// lock keeps that time the same at any speed; a fixed rad/s hit the (small) lock at
// speed in a fifth of a second, so a tap was full opposite lock.
const STEER_LOCK_TIME = 0.95;
const STEER_GRIP = 0.88; // fraction of available grip the lock is allowed to demand
const BRAKE_FORCE = 3.2 * CORNER; // per wheel
// Regolith is soft: a rover that stops pulling slows down noticeably. The linear
// term is rolling resistance, the quadratic one stands in for churning through dust.
const ROLLING_RES = 0.17;
const DRAG_V2 = 22; // N per (m/s)^2
const SUBSTEP = 1 / 240;
// The corridor ridges are the map boundary now; this is just a last-ditch backstop.
const MAX_RADIUS = 20000;

// Hull points that can touch the ground, matching the body shell: skid plate, flanks,
// deck and roof. These must track the visual hull or the truck collides with nothing.
const BODY_POINTS = [];
for (const x of [-1.2, 0, 1.2]) for (const z of [-3.3, -1.1, 1.1, 3.3]) BODY_POINTS.push(new THREE.Vector3(x, -0.5, z));
for (const y of [0.35, 0.85]) {
  for (const x of [-1.55, 0, 1.55]) for (const z of [-3.6, -1.8, 0, 1.8, 3.7]) BODY_POINTS.push(new THREE.Vector3(x, y, z));
}
for (const x of [-1.35, 0, 1.35]) for (const z of [-3.2, -1.5, 0.5, 2.0]) BODY_POINTS.push(new THREE.Vector3(x, 1.38, z));
// The sill along each flank. Without it the only side points sit above the centre of
// mass, so a truck on its flank had nothing under its low centre of gravity and tipped
// straight back over onto its wheels or its roof instead of lying there.
for (const x of [-1.55, 1.55]) for (const z of [-3.4, -1.7, 0, 1.7, 3.4]) BODY_POINTS.push(new THREE.Vector3(x, -0.45, z));
// The outer faces of the tyres. Lying on its side the truck rests on its four wheels,
// which stand well proud of the flank, and that base is wide enough to hold the low
// centre of mass. The points stay above the tread even at full bump, so they never
// touch the ground while driving.
for (const x of [-2.0, 2.0]) for (const z of [AXLE_Z.front, AXLE_Z.rear]) for (const dy of [-0.55, 0, 0.55]) {
  BODY_POINTS.push(new THREE.Vector3(x, -SUSP.Lstatic + dy, z));
}
const F_SUSP_MAX = 9 * CORNER; // a wheel can never push harder than ~9x its static load
const F_HULL_MAX = 4 * WEIGHT;
const HULL_ITER = 6;
const HULL_EXIT_V = 1.0;
const MU_HULL = 0.7;
const V_LIMIT = 40;
const W_LIMIT = 6;
// Angular drag is quadratic: negligible while driving (< 1 rad/s), but it bleeds off
// a tumble in a couple of seconds instead of letting the truck spin like a top.
const W_DRAG_LIN = 0.08;
const W_DRAG_SQ = 0.35;

const FOOTPRINT = [-0.8, -0.4, 0, 0.4, 0.8];
const FOOT_DROP = FOOTPRINT.map((d) => WHEEL_R - Math.sqrt(WHEEL_R * WHEEL_R - d * d));
// A tyre can mount a step about half its radius. Anything taller is a wall you stop
// against, not a ramp: without this the suspension "climbs" boulders vertically and
// throws the truck into the air.
const CLIMB_MAX = 0.65 * WHEEL_R;
const K_BLOCK = 8 * WEIGHT;
const C_BLOCK = 0.6 * WEIGHT;
const F_BLOCK_MAX = 1.7 * WEIGHT;

// Highest ground under the tyre footprint, so a wheel rolls over a stone instead of
// sinking into it. `blocked` is how far that reading exceeds what the tyre can climb.
const contact = { g: 0, blocked: 0 };
function contactHeight(x, z, fx, fz) {
  const base = groundHeight(x, z);
  let best = base;
  for (let i = 0; i < FOOTPRINT.length; i++) {
    const d = FOOTPRINT[i];
    if (d === 0) continue;
    const v = groundHeight(x + fx * d, z + fz * d) - FOOT_DROP[i];
    if (v > best) best = v;
  }
  const cap = base + CLIMB_MAX;
  contact.blocked = Math.max(0, best - cap);
  contact.g = Math.min(best, cap);
  return contact.g;
}

const clamp = (x, a, b) => Math.min(b, Math.max(a, x));
const damp = (cur, target, rate, dt) => cur + (target - cur) * (1 - Math.exp(-rate * dt));
const smoothstep = (a, b, x) => {
  const t = clamp((x - a) / (b - a), 0, 1);
  return t * t * (3 - 2 * t);
};

const SLOPE_CAP = 1.5;
function groundGradient(x, z, out) {
  const e = 0.35;
  out.x = clamp((groundHeight(x + e, z) - groundHeight(x - e, z)) / (2 * e), -SLOPE_CAP, SLOPE_CAP);
  out.z = clamp((groundHeight(x, z + e) - groundHeight(x, z - e)) / (2 * e), -SLOPE_CAP, SLOPE_CAP);
  return out;
}

// scratch objects
const V3 = () => new THREE.Vector3();
const up = V3(), fwd = V3(), fh = V3(), worldUp = new THREE.Vector3(0, 1, 0);
const rel = V3(), mount = V3(), vm = V3(), vp = V3(), tmpA = V3(), tmpB = V3();
const force = V3(), torque = V3(), grad = { x: 0, z: 0 };
const nrm = V3(), dir = V3(), fw = V3(), lw = V3(), f0 = V3();
const wb = V3(), tb = V3(), iw = V3(), gyro = V3(), blk = V3();
const rxn = V3(), tmpI = V3();
const hullContacts = Array.from({ length: 96 }, () => ({ rel: V3(), n: V3(), pen: 0, jn: 0 }));
// World-space inverse inertia applied to a vector: out = R diag(1/I) R^T v.
function invInertia(v, out, q) {
  out.copy(v).applyQuaternion(qInvScratch.copy(q).invert());
  out.set(out.x / INERTIA.x, out.y / INERTIA.y, out.z / INERTIA.z);
  return out.applyQuaternion(q);
}
const qInv = new THREE.Quaternion(), dq = new THREE.Quaternion(), qInvScratch = new THREE.Quaternion();

export class VehicleSim {
  constructor() {
    this.pos = new THREE.Vector3();
    this.quat = new THREE.Quaternion();
    this.vel = new THREE.Vector3();
    this.angVel = new THREE.Vector3();
    this.cmd = { throttle: 0, brake: 0, steer: 0, parked: false, boost: false };
    this.acc = 0;
    this.speed = 0; // forward speed, m/s
    this.upY = 1; // 1 = upright, <0 = upside down
    this.maxSteer = MECH_STEER;
    this.wheels = [
      { name: 'FL', s: 1, z: AXLE_Z.front, front: true },
      { name: 'FR', s: -1, z: AXLE_Z.front, front: true },
      { name: 'RL', s: 1, z: AXLE_Z.rear, front: false },
      { name: 'RR', s: -1, z: AXLE_Z.rear, front: false },
    ].map((w) => ({
      ...w, x: w.s * WHEEL_X, L: SUSP.Lstatic, Lprev: SUSP.Lstatic, wasContact: false, contact: false, Fs: 0, comp: 0,
      cx: 0, cz: 0, g: 0, gPrev: 0, blocked: 0, vx: 0, vy: 0, spinRate: 0, dir: V3(), n: V3(), rel: V3(),
    }));
    this.reset(0, 0, 0.6);
  }

  // Put the truck upright on the ground at (x, z).
  reset(x, z, heading) {
    this.quat.setFromAxisAngle(worldUp, heading);
    const cos = Math.cos(heading);
    const sin = Math.sin(heading);
    let highest = -Infinity;
    for (const w of this.wheels) {
      w.cx = x + w.x * cos + w.z * sin;
      w.cz = z - w.x * sin + w.z * cos;
      w.g = contactHeight(w.cx, w.cz, sin, cos);
      w.gPrev = w.g;
      w.wasContact = false;
      w.blocked = 0;
      w.L = SUSP.Lstatic;
      w.Lprev = SUSP.Lstatic;
      w.contact = false;
      w.Fs = 0;
      w.spinRate = 0;
      highest = Math.max(highest, w.g);
    }
    const origin = new THREE.Vector3(x, highest + WHEEL_R + SUSP.Lstatic + 0.05, z);
    this.pos.copy(origin).add(COM.clone().applyQuaternion(this.quat));
    this.vel.set(0, 0, 0);
    this.angVel.set(0, 0, 0);
    this.cmd.throttle = 0;
    this.cmd.steer = 0;
    this.refresh();
  }

  // Body origin (mount-plane centre) in world space, for placing the visual model.
  origin(out) {
    return out.copy(COM).applyQuaternion(this.quat).multiplyScalar(-1).add(this.pos);
  }

  yaw() {
    fwd.set(0, 0, 1).applyQuaternion(this.quat);
    return Math.atan2(fwd.x, fwd.z);
  }

  refresh() {
    up.set(0, 1, 0).applyQuaternion(this.quat);
    fwd.set(0, 0, 1).applyQuaternion(this.quat);
    this.upY = up.y;
    this.speed = this.vel.dot(fwd);
  }

  // input: { throttle: -1..1, steer: -1..1 (left +), brake: 0..1, boost: bool }
  update(dt, input) {
    const v = this.speed;
    let throttle = 0;
    let brake = input.brake || 0;
    if (input.throttle > 0) {
      if (v < -0.8) brake = 1;
      else throttle = input.throttle;
    } else if (input.throttle < 0) {
      if (v > 0.8) brake = 1;
      else throttle = input.throttle;
    }
    const c = this.cmd;
    c.throttle = damp(c.throttle, throttle, 12, dt);
    if (Math.abs(c.throttle) < 0.01 && throttle === 0) c.throttle = 0;
    c.brake = brake;
    c.boost = !!input.boost;
    c.parked = throttle === 0 && brake === 0 && this.vel.length() < 1.2 && this.upY > 0.7;
    // Cap the lock at what the tyres can actually deliver. Letting the wheels turn
    // further than that just scrubs the fronts and the rover ploughs straight on,
    // which is what made the steering feel like a formality at speed.
    const aLat = MU * GRAVITY * STEER_GRIP;
    const maxSteer = Math.min(MECH_STEER, Math.atan((aLat * WHEELBASE) / Math.max(v * v, 4)));
    this.maxSteer = maxSteer;
    if (input.steerTo !== undefined) {
      c.steer = damp(c.steer, clamp(input.steerTo, -1, 1) * maxSteer, 5, dt);
    } else {
      const inp = clamp(input.steer, -1, 1);
      // The wheel turns at this rate whichever way it moves, whether that is a key
      // winding it toward lock or the wheel unwinding back to centre once released.
      const step = (maxSteer * dt) / STEER_LOCK_TIME;
      if (inp !== 0) c.steer += inp * step;
      else if (c.steer > step) c.steer -= step;
      else if (c.steer < -step) c.steer += step;
      else c.steer = 0;
    }
    c.steer = clamp(c.steer, -maxSteer, maxSteer);

    this.acc = Math.min(this.acc + dt, SUBSTEP * 12);
    while (this.acc >= SUBSTEP) {
      this.step(SUBSTEP);
      this.acc -= SUBSTEP;
    }
    this.refresh();
    if (!Number.isFinite(this.pos.x + this.pos.y + this.pos.z)) this.reset(0, 0, 0);
  }

  driveForce(thr, speed) {
    const boost = this.cmd.boost;
    const vmax = thr > 0 ? (boost ? V_MAX_BOOST : V_MAX) : V_MAX_REVERSE;
    const fmax = boost ? F_DRIVE * 1.4 : F_DRIVE;
    let f = Math.min(fmax, (boost ? POWER * 1.4 : POWER) / Math.max(Math.abs(speed), 2));
    if (thr * speed >= 0) f *= 1 - smoothstep(0.8 * vmax, vmax, Math.abs(speed));
    return f * thr;
  }

  applyAt(f, r) {
    force.add(f);
    torque.add(tmpA.crossVectors(r, f));
  }

  pointVelocity(r, out) {
    return out.crossVectors(this.angVel, r).add(this.vel);
  }

  // Hull vs ground: lets the truck scrape, roll onto its side or lie on its roof.
  // Solved as impulses on the velocities, a few passes over all touching points. The
  // ground pushes hardest where the truck's weight actually is, so a truck that lands
  // flat on its side stays there. Independent spring-like forces at every point did
  // not distribute like that: with the centre of mass low, equal forces at points all
  // above it kicked the body over, and it bounced and rolled onto its roof.
  solveHull(h) {
    const { quat: q, pos, vel, angVel } = this;
    let n = 0;
    for (const b of BODY_POINTS) {
      rel.copy(b).sub(COM).applyQuaternion(q);
      tmpB.copy(pos).add(rel);
      const gh = groundHeight(tmpB.x, tmpB.z);
      const pen = Math.min(gh - tmpB.y, 0.8);
      if (pen <= 0) continue;
      groundGradient(tmpB.x, tmpB.z, grad);
      const c = hullContacts[n++];
      c.rel.copy(rel);
      c.n.set(-grad.x, 1, -grad.z).normalize();
      c.pen = pen;
      c.jn = 0;
    }
    if (!n) return;
    qInv.copy(q).invert();
    const cap = F_HULL_MAX * h; // most impulse one point may add in a step
    for (let it = 0; it < HULL_ITER; it++) {
      for (let i = 0; i < n; i++) {
        const c = hullContacts[i];
        this.pointVelocity(c.rel, vp);
        const vn = vp.dot(c.n);
        const vWant = Math.min(c.pen * 10, HULL_EXIT_V);
        let j = 0;
        if (vn < vWant && c.jn < cap) {
          rxn.crossVectors(c.rel, c.n);
          invInertia(rxn, tmpI, q);
          j = Math.min((vWant - vn) / (1 / MASS + rxn.dot(tmpI)), cap - c.jn);
          c.jn += j;
          vel.addScaledVector(c.n, j / MASS);
          rxn.multiplyScalar(j);
          invInertia(rxn, tmpI, q);
          angVel.add(tmpI);
        }
        // Coulomb friction against the sliding of this point, limited by how hard it
        // is being pressed into the ground.
        if (j <= 0) continue;
        this.pointVelocity(c.rel, vp);
        vp.addScaledVector(c.n, -vp.dot(c.n));
        const vt = vp.length();
        if (vt < 1e-4) continue;
        vp.multiplyScalar(1 / vt);
        rxn.crossVectors(c.rel, vp);
        invInertia(rxn, tmpI, q);
        const jt = Math.min(MU_HULL * j, vt / (1 / MASS + rxn.dot(tmpI)));
        vel.addScaledVector(vp, -jt / MASS);
        rxn.multiplyScalar(-jt);
        invInertia(rxn, tmpI, q);
        angVel.add(tmpI);
      }
    }
  }

  step(h) {
    const { quat: q, pos, vel, angVel, cmd, wheels } = this;
    up.set(0, 1, 0).applyQuaternion(q);
    fwd.set(0, 0, 1).applyQuaternion(q);
    force.set(0, -MASS * GRAVITY, 0);
    torque.set(0, 0, 0);
    const steer = ackermann(cmd.steer);
    const speed = vel.dot(fwd);

    // Pass 1: where is the ground under each wheel, how compressed is each spring.
    fh.set(fwd.x, 0, fwd.z);
    if (fh.lengthSq() < 1e-6) fh.set(0, 0, 1);
    fh.normalize();

    for (const w of wheels) {
      w.contact = false;
      w.Fs = 0;
      rel.set(w.x, 0, w.z).sub(COM).applyQuaternion(q);
      mount.copy(pos).add(rel);
      this.pointVelocity(rel, vm);

      // Sample under the wheel centre, which hangs below the mount at the current
      // (always physical) length. Keeping L bounded keeps this sample on the wheel.
      const cx = mount.x - up.x * w.L;
      const cz = mount.z - up.z * w.L;
      let g = contactHeight(cx, cz, fh.x, fh.z);
      w.blocked = contact.blocked;
      const climb = CLIMB_FLOOR + CLIMB_RATE * Math.hypot(vm.x, vm.z);
      g = Math.min(g, w.gPrev + climb * h);
      w.gPrev = g;
      w.cx = cx;
      w.cz = cz;
      w.g = g;

      // Tilted past ~72 deg the suspension axis is too flat to reach the ground.
      if (up.y <= UP_MIN) {
        w.L = SUSP.Lmax;
        w.Lprev = w.L;
        w.wasContact = false;
        continue;
      }
      const Lreq = (mount.y - (g + WHEEL_R)) / up.y;
      w.L = clamp(Lreq, SUSP.Lmin - PEN_MAX, SUSP.Lmax);
      if (Lreq >= SUSP.Lmax) {
        w.Lprev = w.L;
        w.wasContact = false;
        continue;
      }

      // Damper velocity is measured from the length itself. Estimating it from the
      // terrain gradient gets the sign wrong on slopes, which pumps energy in.
      // On the first substep back in contact the length jumps from full droop to
      // wherever the ground is; reading that as damper velocity punches the rover
      // into the air, which is what made a roll-over impossible to recover from.
      const Ldot = w.wasContact ? clamp((w.L - w.Lprev) / h, -LDOT_MAX, LDOT_MAX) : 0;
      w.Lprev = w.L;
      w.wasContact = true;
      groundGradient(cx, cz, grad);
      const Lspring = clamp(Lreq, SUSP.Lmin, SUSP.Lmax);
      let Fs = K_SPRING * (SUSP.Lfree - Lspring) - (Ldot < 0 ? C_BUMP : C_REBOUND) * Ldot;

      // Past full compression: push only until the wheel is easing out at vWant.
      const pen = clamp(SUSP.Lmin - Lreq, 0, PEN_MAX);
      if (pen > 0) {
        const vWant = Math.min(pen * 10, BUMP_EXIT_V);
        if (Ldot < vWant) Fs += Math.min(BUMP_STOP_MAX, C_STOP * (vWant - Ldot));
      }

      w.contact = true;
      w.Fs = Fs * smoothstep(UP_MIN, UP_FADE, up.y);
      w.comp = SUSP.Lfree - Lspring;
      w.n.set(-grad.x, 1, -grad.z).normalize();
    }

    // Anti-roll bars couple the left and right wheel of each axle.
    for (const [a, b] of [[0, 1], [2, 3]]) {
      const l = wheels[a];
      const r = wheels[b];
      if (!l.contact && !r.contact) continue;
      const arb = K_ARB * (clamp(l.comp, -0.2, 0.5) - clamp(r.comp, -0.2, 0.5));
      if (l.contact) l.Fs += arb;
      if (r.contact) r.Fs -= arb;
    }

    // Pass 2: suspension + tyre forces at each contact patch.
    for (const w of wheels) {
      if (!w.contact) {
        w.spinRate *= 0.995;
        continue;
      }
      // Rock too tall to mount: resist the wheel's horizontal motion. Purely
      // dissipative (it always opposes velocity), so it can never add energy.
      // Gated on contact, so flying over a boulder does not brake the truck.
      if (w.blocked > 1e-3) {
        blk.set(w.cx, w.g, w.cz).sub(pos);
        this.pointVelocity(blk, vp);
        vp.y = 0;
        const vh = vp.length();
        if (vh > 0.05) {
          const Fb = Math.min(F_BLOCK_MAX, K_BLOCK * w.blocked + C_BLOCK * vh);
          tmpB.copy(vp).multiplyScalar(-Fb / vh);
          this.applyAt(tmpB, blk);
        }
      }
      const Fs = clamp(w.Fs, 0, F_SUSP_MAX);
      nrm.copy(w.n);
      dir.copy(up).multiplyScalar(0.6).addScaledVector(nrm, 0.2).addScaledVector(worldUp, 0.2).normalize();
      w.rel.set(w.cx, w.g, w.cz).sub(pos);
      tmpB.copy(dir).multiplyScalar(Fs);
      this.applyAt(tmpB, w.rel);

      this.pointVelocity(w.rel, vp);
      const angle = w.front ? (w.s > 0 ? steer.left : steer.right) : 0;
      f0.copy(fwd).applyAxisAngle(up, angle);
      fw.copy(f0).addScaledVector(nrm, -f0.dot(nrm)).normalize();
      lw.crossVectors(nrm, fw);
      const vx = vp.dot(fw);
      const vy = vp.dot(lw);
      w.vx = vx;
      w.vy = vy;

      const N = Fs;
      const grip = MU * N;
      let Fx;
      if (cmd.parked) Fx = -grip * Math.tanh(vx / 0.05);
      else {
        const resist = cmd.brake * BRAKE_FORCE + ROLLING_RES * N + (DRAG_V2 * vx * vx) / 4;
        Fx = this.driveForce(cmd.throttle, speed) / 4 - resist * Math.tanh(vx / 0.4);
      }
      let Fy = -grip * Math.tanh(vy / (cmd.parked ? 0.05 : 0.15));
      const mag = Math.hypot(Fx, Fy);
      if (mag > grip && mag > 0) {
        Fx *= grip / mag;
        Fy *= grip / mag;
      }
      tmpB.copy(fw).multiplyScalar(Fx).addScaledVector(lw, Fy);
      this.applyAt(tmpB, w.rel);
      w.spinRate = vx / WHEEL_R;
    }

    // Soft wall at the edge of the map.
    const r = Math.hypot(pos.x, pos.z);
    if (r > MAX_RADIUS) {
      const over = r - MAX_RADIUS;
      force.x += (-pos.x / r) * over * MASS * 1.0 - vel.x * MASS * 0.5;
      force.z += (-pos.z / r) * over * MASS * 1.0 - vel.z * MASS * 0.5;
    }

    // Integrate velocities. Angular part is solved in body axes (gyroscopic term included).
    vel.addScaledVector(force, h / MASS);

    qInv.copy(q).invert();
    wb.copy(angVel).applyQuaternion(qInv);
    tb.copy(torque).applyQuaternion(qInv);
    iw.set(INERTIA.x * wb.x, INERTIA.y * wb.y, INERTIA.z * wb.z);
    gyro.crossVectors(wb, iw);
    wb.x += ((tb.x - gyro.x) / INERTIA.x) * h;
    wb.y += ((tb.y - gyro.y) / INERTIA.y) * h;
    wb.z += ((tb.z - gyro.z) / INERTIA.z) * h;
    angVel.copy(wb).applyQuaternion(q);
    const spin = angVel.length();
    angVel.multiplyScalar(1 - Math.min(0.5, (W_DRAG_LIN + W_DRAG_SQ * spin) * h));
    if (spin > W_LIMIT) angVel.setLength(W_LIMIT);

    this.solveHull(h);
    if (vel.length() > V_LIMIT) vel.setLength(V_LIMIT);

    pos.addScaledVector(vel, h);
    dq.set(angVel.x * h * 0.5, angVel.y * h * 0.5, angVel.z * h * 0.5, 0).multiply(q);
    q.set(q.x + dq.x, q.y + dq.y, q.z + dq.z, q.w + dq.w).normalize();
  }
}
