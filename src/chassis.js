// Which vehicle you drive. Read once at load, exactly like planet.js: the wheel
// layout, mass, inertia and suspension rates are all derived into module-level
// constants in physics.js, so switching chassis reloads the page instead of trying
// to rebuild a live rigid body.
const KEY = 'rover.chassis';

function read() {
  try { return localStorage.getItem(KEY); } catch (e) { return null; } // storage may be blocked
}
export const CHASSIS = read() === 'crawler' ? 'crawler' : 'truck';

export function setChassis(id) {
  localStorage.setItem(KEY, id === 'crawler' ? 'crawler' : 'truck');
  location.reload();
}

// Everything that differs between the two machines lives here, so vehicle.js (art)
// and physics.js (behaviour) read one description instead of each keeping their own
// copy of the wheel positions.
const SPECS = {
  // ГЕРМЕС-3: the original four-wheel scout. These numbers are the tuned ones the
  // whole game was balanced around — do not drift them.
  truck: {
    id: 'truck',
    name: 'СКАУТ 4×4',
    tag: 'сонячний ровер · Гермес-3',
    driveLabel: ['4×4', '4×2'],
    wheelScale: 1.2,
    wheelX: 1.75,
    hullW: 3.1,
    axleZ: [2.4, -2.4],
    turnZ: -2.4, // steering pivots about the rear axle
    susp: { Lmin: 0.15, Lmax: 0.72, Lfree: 0.52, Lstatic: 0.465 },
    steerTime: 0.5, // seconds from centre to full lock
    progLen: 0.15, // how quickly the coil firms up past static sag (smaller = sooner)
    damp: { bump: 1, rebound: 1 },
    mass: 4200,
    box: { w: 3.6, h: 2.0, l: 7.2 },
    comY: -0.32,
    mu: 1.3,
    vMax: 12,
    vMaxBoost: 34,
    awdSplit: true, // front hubs disengage at speed
    lockers: false, // open diffs: a wheel in the air still takes its share of torque
    lowGear: 1, // multiplies the stock tractive-force ceiling, not the power
    arb: [1, 1], // anti-roll bar stiffness per axle
    climb: 0.65, // tallest step a tyre mounts, in wheel radii
    tyreFaceX: 2.0,
    hullGrids: [
      { xs: [-1.2, 0, 1.2], ys: [-0.5], zs: [-3.3, -1.1, 1.1, 3.3] },
      { xs: [-1.55, 0, 1.55], ys: [0.35, 0.85], zs: [-3.6, -1.8, 0, 1.8, 3.7] },
      { xs: [-1.35, 0, 1.35], ys: [1.38], zs: [-3.2, -1.5, 0.5, 2.0] },
      { xs: [-1.55, 1.55], ys: [-0.45], zs: [-3.4, -1.7, 0, 1.7, 3.4] },
    ],
    mounts: {
      head: { x: 0.8, y: 0.36, z: 3.7, glowZ: 3.84, aimX: 0.55 },
      far: { y: 1.4, z: 2.0 },
      cab: { y: 1.0, z: 1.7 },
      marker: { x: 1.55, y: -0.2, z: 0.1 },
    },
  },
  // ТИТАН-6: a six-wheel crawler. Three axles, all of them driven and all of them
  // steered (the rear pair counter-steers, see turnZ), a long low frame and half
  // again the mass. It is slower and it leans less; it climbs and it does not care
  // if one wheel is in a hole.
  crawler: {
    id: 'crawler',
    name: 'КРАУЛЕР 6×6',
    tag: 'важкий краулер · Титан-6',
    driveLabel: ['6×6', '6×6'],
    wheelScale: 1.12,
    wheelX: 2.02, // wide track for the balloon tyres
    hullW: 3.4,
    axleZ: [3.35, 0, -3.35],
    // Ahead of the rear axle, so the rear wheels steer the other way: the whole
    // 9-metre machine turns inside a radius a four-wheeler that long could not.
    turnZ: -1.1,
    // Long-travel and soft: 0.52 m of bump from ride height on a spring with half a
    // metre of static sag, so a rock the size of a sidewall is swallowed by the wheel
    // instead of lifting the body. Flat test bed at 25 km/h: a 30 cm rock lifts it
    // 2 cm (was 15), a 60 cm one 9 cm (was 48). The free length sits past full droop,
    // so a wheel dropping into a hole still pushes down on it. A spring this soft
    // leans, so the ride stays low and the mass sits lower (comY) — with both, a blind
    // full-throttle weave over steep hills rolls it no more often than the stiff one.
    susp: { Lmin: 0.1, Lmax: 1.08, Lfree: 1.12, Lstatic: 0.62 },
    steerTime: 0.5,
    progLen: 0.5,
    // Light bump damping — it is the damper, not the spring, that kicks a body up
    // off a sharp edge — and a firmer, but still under-critical, rebound.
    damp: { bump: 0.1, rebound: 0.22 },
    mass: 6400,
    box: { w: 3.8, h: 2.1, l: 10.0 },
    comY: -0.55, // even lower: the pack hangs between the frame rails
    mu: 1.45, // six contact patches
    vMax: 10,
    vMaxBoost: 24,
    awdSplit: false, // permanent 6×6
    // A crawler's whole point. Locked diffs send the torque to whichever wheels are
    // actually on the ground; the low range puts more force down at walking pace
    // (the power, and so the top speed, is the same motor's); and the middle axle
    // has no anti-roll bar, so the chassis can twist and keep all six tyres loaded
    // over ground that lifts a rigid three-axle frame onto four of them.
    lockers: true,
    lowGear: 1.6,
    arb: [1, 0, 1],
    // Six driven wheels push the front pair up a ledge a lone axle could not.
    climb: 0.8,
    tyreFaceX: 2.62,
    hullGrids: [
      { xs: [-1.3, 0, 1.3], ys: [-0.52], zs: [-4.4, -2.6, -0.9, 0.9, 2.6, 4.4] },
      { xs: [-1.7, 0, 1.7], ys: [0.3, 0.8], zs: [-4.5, -2.7, -0.9, 0.9, 2.7, 4.5] },
      { xs: [-1.35, 0, 1.35], ys: [1.85], zs: [-4.3, -1.5, 1.4, 3.9] }, // cage and cab roof
      { xs: [-1.75, 1.75], ys: [-0.45], zs: [-4.2, -2.1, 0, 2.1, 4.2] },
    ],
    mounts: {
      head: { x: 1.0, y: 0.32, z: 4.6, glowZ: 4.72, aimX: 0.7 },
      far: { y: 1.97, z: 3.4 },
      cab: { y: 1.4, z: 2.9 },
      marker: { x: 1.45, y: -0.2, z: 1.67 },
    },
  },
};

export const SPEC = SPECS[CHASSIS];
export const CHASSIS_LIST = [SPECS.truck, SPECS.crawler];

// One entry per wheel, the single source of truth for both the art and the sim —
// they are matched by index in main.js, so the order must come from one place.
// `dz` is the lever arm about the steering centre; 0 means the wheel never steers.
export const WHEEL_DEFS = SPEC.axleZ.flatMap((z, axle) =>
  [1, -1].map((s) => ({
    name: `${'FMR'[SPEC.axleZ.length === 2 ? (axle ? 2 : 0) : axle]}${s > 0 ? 'L' : 'R'}`,
    s,
    axle,
    z,
    x: s * SPEC.wheelX,
    dz: z - SPEC.turnZ,
    front: axle === 0,
  }))
);

// Left/right pairs of one axle, for the anti-roll bars.
export const AXLE_PAIRS = SPEC.axleZ.map((_, axle) => [axle * 2, axle * 2 + 1]);

const REAR_Z = SPEC.axleZ[SPEC.axleZ.length - 1];
// Rear-axle counter-steer is a low-speed trick. At speed it makes every input twice as
// sharp, and with a maxed motor the crawler rolled itself over on an ordinary weave.
// So the steering centre slides back onto the rear axle between these speeds, which
// straightens the rear wheels — what real all-wheel-steer trucks do. For the scout the
// centre already sits on the rear axle, so nothing changes there.
const RS_FULL = 12 / 3.6;
const RS_OFF = 35 / 3.6;

// Ackermann for an arbitrary layout: every wheel points along the tangent of its own
// circle about one turn centre, which sits abeam the steering centre at radius R. For
// the four-wheeler (turn centre on the rear axle) this reduces exactly to the old
// two-wheel formula; for the crawler it falls out as all-wheel steering for free.
export function steerAngle(w, delta, speed = 0) {
  if (Math.abs(delta) < 1e-4) return 0;
  const t = Math.min(1, Math.max(0, (Math.abs(speed) - RS_FULL) / (RS_OFF - RS_FULL)));
  const turnZ = SPEC.turnZ + (REAR_Z - SPEC.turnZ) * t * t * (3 - 2 * t);
  const dz = w.z - turnZ;
  if (Math.abs(dz) < 1e-6) return 0;
  const s = Math.sign(delta);
  const R = (SPEC.axleZ[0] - turnZ) / Math.tan(Math.abs(delta));
  return s * Math.atan2(dz, R - s * w.x);
}
