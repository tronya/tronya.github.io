import * as THREE from 'three';

// A ~10 km crossing between two bases. The world is far too large for one mesh, so
// the ground is analytic (terrainHeight) and the visuals are streamed as tiles that
// follow the rover. Rocks come from the same hash the physics reads, so what you see
// is what you hit.

function hash(i, j) {
  const n = Math.sin(i * 127.1 + j * 311.7) * 43758.5453;
  return n - Math.floor(n);
}

function vnoise(x, y) {
  const i = Math.floor(x);
  const j = Math.floor(y);
  const fx = x - i;
  const fy = y - j;
  const u = fx * fx * (3 - 2 * fx);
  const v = fy * fy * (3 - 2 * fy);
  const a = hash(i, j);
  const b = hash(i + 1, j);
  const c = hash(i, j + 1);
  const d = hash(i + 1, j + 1);
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
}

function fbm(x, y, octaves) {
  let sum = 0;
  let amp = 0.5;
  let freq = 1;
  for (let i = 0; i < octaves; i++) {
    sum += amp * vnoise(x * freq, y * freq);
    freq *= 2;
    amp *= 0.5;
  }
  return sum;
}

const smooth = (a, b, x) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};
const clamp = (x, a, b) => Math.min(b, Math.max(a, x));

// ---------- the route: a graded road shaped like the letter S ----------

// A stretched, wandering S: a rough zigzag through control points, smoothed with a
// Catmull-Rom spline and pushed about by low-frequency noise so it never looks like a
// compass-drawn letter. It is ~10 km long while the bases sit ~5.5 km apart, so cutting
// across is much shorter but crosses rough, rocky ground instead of the road.
export const ROAD_HALF = 34; // half-width of the graded strip
const WALL_START = 1650; // farther than this from the road, ridges close the world in
const ROUTE_SCALE = 0.8; // tunes the overall length
const ROUTE_CONTROL = [
  [1650, -2900], [900, -3250], [-250, -3050], [-1150, -2450], [-1500, -1500], [-1100, -650],
  [-200, -80], [700, 350], [1350, 1000], [1500, 1900], [900, 2650], [-100, 2950], [-1050, 2850], [-1750, 2400],
];

export const ROUTE_PTS = (() => {
  const c = ROUTE_CONTROL.map(([x, z]) => [x * ROUTE_SCALE, z * ROUTE_SCALE]);
  const pts = [];
  const at = (i) => c[Math.min(c.length - 1, Math.max(0, i))];
  for (let i = 0; i < c.length - 1; i++) {
    const p0 = at(i - 1);
    const p1 = at(i);
    const p2 = at(i + 1);
    const p3 = at(i + 2);
    const n = Math.max(4, Math.ceil(Math.hypot(p2[0] - p1[0], p2[1] - p1[1]) / 24));
    for (let k = 0; k < n; k++) {
      const t = k / n;
      const t2 = t * t;
      const t3 = t2 * t;
      const q = (a0, a1, a2, a3) =>
        0.5 * (2 * a1 + (-a0 + a2) * t + (2 * a0 - 5 * a1 + 4 * a2 - a3) * t2 + (-a0 + 3 * a1 - 3 * a2 + a3) * t3);
      pts.push({ x: q(p0[0], p1[0], p2[0], p3[0]), z: q(p0[1], p1[1], p2[1], p3[1]) });
    }
  }
  pts.push({ x: c[c.length - 1][0], z: c[c.length - 1][1] });
  // Wander a little, but keep both ends where they are.
  const last = pts.length - 1;
  pts.forEach((p, i) => {
    const fade = Math.min(1, Math.min(i, last - i) / 12);
    p.x += (fbm(p.x * 0.0011 + 40, p.z * 0.0011 + 3, 2) - 0.5) * 300 * fade;
    p.z += (fbm(p.x * 0.0011 - 20, p.z * 0.0011 + 70, 2) - 0.5) * 300 * fade;
  });
  let s = 0;
  pts[0].s = 0;
  for (let i = 1; i < pts.length; i++) {
    s += Math.hypot(pts[i].x - pts[i - 1].x, pts[i].z - pts[i - 1].z);
    pts[i].s = s;
  }
  return pts;
})();
export const ROUTE_LEN = ROUTE_PTS[ROUTE_PTS.length - 1].s;

export const BASES = [
  { name: 'АЛЬФА', x: ROUTE_PTS[0].x, z: ROUTE_PTS[0].z },
  { name: 'БЕТА', x: ROUTE_PTS[ROUTE_PTS.length - 1].x, z: ROUTE_PTS[ROUTE_PTS.length - 1].z },
];
export const BASE_FLAT_R = 95;

export const ROUTE_BOUNDS = (() => {
  let x0 = Infinity, x1 = -Infinity, z0 = Infinity, z1 = -Infinity;
  for (const p of ROUTE_PTS) {
    x0 = Math.min(x0, p.x); x1 = Math.max(x1, p.x);
    z0 = Math.min(z0, p.z); z1 = Math.max(z1, p.z);
  }
  return { x0, x1, z0, z1 };
})();

// Distance to the road, from a coarse field built once. Bilinear lookups are far
// cheaper than searching the polyline, and terrainHeight asks for this constantly.
const FSTEP = 25;
const FMARGIN = 2000;
const FIELD = (() => {
  const { x0, x1, z0, z1 } = ROUTE_BOUNDS;
  const fx0 = x0 - FMARGIN;
  const fz0 = z0 - FMARGIN;
  const nx = Math.ceil((x1 - x0 + 2 * FMARGIN) / FSTEP) + 2;
  const nz = Math.ceil((z1 - z0 + 2 * FMARGIN) / FSTEP) + 2;
  const d = new Float32Array(nx * nz);
  const n = ROUTE_PTS.length;
  for (let j = 0; j < nz; j++) {
    const pz = fz0 + j * FSTEP;
    for (let i = 0; i < nx; i++) {
      const px = fx0 + i * FSTEP;
      // Nearest vertex first; the nearest point on the line is on one of its two segments.
      let bi = 0;
      let bd = Infinity;
      for (let k = 0; k < n; k++) {
        const dx = px - ROUTE_PTS[k].x;
        const dz = pz - ROUTE_PTS[k].z;
        const dd = dx * dx + dz * dz;
        if (dd < bd) { bd = dd; bi = k; }
      }
      let best = bd;
      for (const k of [bi - 1, bi]) {
        if (k < 0 || k >= n - 1) continue;
        const a = ROUTE_PTS[k];
        const b = ROUTE_PTS[k + 1];
        const ex = b.x - a.x;
        const ez = b.z - a.z;
        const t = clamp(((px - a.x) * ex + (pz - a.z) * ez) / (ex * ex + ez * ez), 0, 1);
        const dx = px - (a.x + ex * t);
        const dz = pz - (a.z + ez * t);
        best = Math.min(best, dx * dx + dz * dz);
      }
      d[j * nx + i] = Math.sqrt(best);
    }
  }
  return { x0: fx0, z0: fz0, nx, nz, d };
})();

export function roadDist(x, z) {
  const fx = clamp((x - FIELD.x0) / FSTEP, 0, FIELD.nx - 1.001);
  const fz = clamp((z - FIELD.z0) / FSTEP, 0, FIELD.nz - 1.001);
  const i = Math.floor(fx);
  const j = Math.floor(fz);
  const u = fx - i;
  const v = fz - j;
  const o = j * FIELD.nx + i;
  const d = FIELD.d;
  return d[o] * (1 - u) * (1 - v) + d[o + 1] * u * (1 - v) + d[o + FIELD.nx] * (1 - u) * v + d[o + FIELD.nx + 1] * u * v;
}

// Index of the route vertex closest to a point.
export function nearestRouteIndex(x, z) {
  let bi = 0;
  let bd = Infinity;
  for (let k = 0; k < ROUTE_PTS.length; k++) {
    const dx = x - ROUTE_PTS[k].x;
    const dz = z - ROUTE_PTS[k].z;
    const dd = dx * dx + dz * dz;
    if (dd < bd) { bd = dd; bi = k; }
  }
  return bi;
}

// Where to put the rover at a base and which way the road leaves it.
export function roadSpawn(atEnd) {
  const from = atEnd ? ROUTE_PTS.length - 1 : 0;
  const dir = atEnd ? -1 : 1;
  const k = clamp(from + dir * 2, 0, ROUTE_PTS.length - 1);
  const p = ROUTE_PTS[from + dir * 2];
  const q = ROUTE_PTS[clamp(k + dir, 0, ROUTE_PTS.length - 1)];
  return { x: p.x, z: p.z, yaw: Math.atan2(q.x - p.x, q.z - p.z) };
}

// Metres left along the road from where you are to one end, plus the detour to reach it.
export function roadRemaining(x, z, toEnd) {
  const k = nearestRouteIndex(x, z);
  const along = toEnd ? ROUTE_LEN - ROUTE_PTS[k].s : ROUTE_PTS[k].s;
  return along + Math.hypot(x - ROUTE_PTS[k].x, z - ROUTE_PTS[k].z);
}

// Ridges that close the world in far from the road.
function wallAmount(x, z) {
  const off = roadDist(x, z) + (fbm(x * 0.0016 + 11, z * 0.0016 + 5, 2) - 0.5) * 170;
  return smooth(WALL_START, WALL_START + 240, off);
}

// Flat apron around each base so the habitat sits level and you can park.
function baseFlatten(x, z) {
  let k = 1;
  for (const b of BASES) {
    k = Math.min(k, smooth(BASE_FLAT_R * 0.55, BASE_FLAT_R * 1.7, Math.hypot(x - b.x, z - b.z)));
  }
  return k;
}

// Craters lie beside the road, never on it, and get more frequent the farther you go.
const CRATERS = (() => {
  const list = [];
  const n = ROUTE_PTS.length;
  for (let i = 0; i < 150; i++) {
    const r1 = hash(i * 3 + 1, 7);
    const r2 = hash(i * 5 + 2, 13);
    const r3 = hash(i * 7 + 3, 29);
    const r4 = hash(i * 11 + 5, 41);
    const k = 1 + Math.floor(r1 * (n - 3));
    const a = ROUTE_PTS[k - 1];
    const b = ROUTE_PTS[k + 1];
    const len = Math.hypot(b.x - a.x, b.z - a.z) || 1;
    const nx = -(b.z - a.z) / len;
    const nz = (b.x - a.x) / len;
    const R = 14 + r3 * 34;
    const off = (r2 < 0.5 ? -1 : 1) * (ROAD_HALF + R + 30 + r4 * 900);
    const x = ROUTE_PTS[k].x + nx * off;
    const z = ROUTE_PTS[k].z + nz * off;
    if (roadDist(x, z) < ROAD_HALF + R + 20) continue;
    if (BASES.some((bs) => Math.hypot(x - bs.x, z - bs.z) < BASE_FLAT_R + R + 40)) continue;
    list.push({ x, z, R });
  }
  return list;
})();

// Bucket the craters by x so a lookup touches only a few.
const CRATER_BIN = 400;
const craterBins = new Map();
for (const c of CRATERS) {
  const k = Math.floor(c.x / CRATER_BIN);
  for (const d of [-1, 0, 1]) {
    if (!craterBins.has(k + d)) craterBins.set(k + d, []);
    craterBins.get(k + d).push(c);
  }
}

function craterHeight(x, z) {
  const bin = craterBins.get(Math.floor(x / CRATER_BIN));
  if (!bin) return 0;
  let h = 0;
  for (const c of bin) {
    const dx = x - c.x;
    const dz = z - c.z;
    const lim = c.R * 2.2;
    if (dx * dx + dz * dz > lim * lim) continue;
    const t = (Math.sqrt(dx * dx + dz * dz) / c.R) * (1 + 0.14 * (vnoise(x * 0.05, z * 0.05) - 0.5));
    if (t < 1) h -= c.R * 0.085 * (1 - t * t);
    h += c.R * 0.03 * Math.exp(-(((t - 1) / 0.3) ** 2));
  }
  return h;
}

// Flat-topped mesas standing over the plain, the shape Mars is photographed in.
// A slow field says where one stands, and a very narrow smoothstep across its edge
// turns what would be a hillside into a sheer wall and leaves the top dead level.
// The second tier only rises where the first is already there, so they stack into
// terraces. Returns the height; `onTop` says how flat the ground up there should be.
const MESA = { onTop: 0 };
function mesaHeight(wx, wz) {
  const m1 = fbm(wx * 0.00068 + 310, wz * 0.00068 - 180, 3);
  // A narrow band right at the threshold gave every barely-there wobble of the coarse
  // field the same sharp-walled edge as a real mesa: dozens of shin-high "cliffs"
  // scattered over otherwise flat ground, which read from a distance as dark smudges.
  // Starting the ramp well above the field's middle means only its actual local
  // maxima ever clear it, so a mesa now stands somewhere there was already a broad
  // rise, instead of any point where the noise merely ticks past the midline.
  const k1 = smooth(0.58, 0.635, m1);
  if (k1 <= 0) {
    MESA.onTop = 0;
    return 0;
  }
  const m2 = fbm(wx * 0.00152 + 52, wz * 0.00152 + 640, 2);
  const k2 = smooth(0.52, 0.55, m2);
  MESA.onTop = k1 * (0.55 + 0.45 * k2);
  return k1 * 84 + k1 * k2 * 50;
}

// A graded road across rough country: gentle along the road, hilly, cratered and
// strewn with boulders once you leave it.
export function terrainHeight(x, z) {
  const rd = roadDist(x, z);
  const rough = smooth(ROAD_HALF + 14, ROAD_HALF + 170, rd); // 0 on the road, 1 out in the rough
  const away = smooth(60, 340, rd);
  const wx = x + (fbm(x * 0.02 + 11, z * 0.02 + 3, 2) - 0.5) * 26;
  const wz = z + (fbm(x * 0.02 - 7, z * 0.02 + 29, 2) - 0.5) * 26;

  // Mesas are worked out first: the rolling hills are flattened away on top of one,
  // or the plateau reads as another lumpy hill instead of a table.
  const mesa = away > 0 ? mesaHeight(wx, wz) : 0;
  const flatTop = 1 - 0.75 * MESA.onTop * away;

  let h = (fbm(wx * 0.009 + 5, wz * 0.009 + 9, 3) - 0.46) * 9 * (0.3 + 2.5 * rough) * flatTop;
  h += (fbm(wx * 0.026 + 60, wz * 0.026 - 18, 2) - 0.46) * 2.4 * (0.3 + 3.0 * rough) * flatTop;

  const duneZone = smooth(0.44, 0.6, fbm(wx * 0.012 + 200, wz * 0.012 + 90, 2)) * flatTop;
  if (duneZone > 0) {
    const ph = (wx * 0.7 + wz * 0.4) * 0.16 + (fbm(wx * 0.03, wz * 0.03, 2) - 0.44) * 5;
    h += duneZone * 1.15 * 0.5 * (Math.sin(ph) + 0.5 * Math.sin(2 * ph + 0.6)) * (0.4 + 1.2 * rough);
  }
  h += craterHeight(x, z);

  // Real mountains, kept off the road: the road threads the valleys between them, so
  // cutting across means climbing. The foothills start ~70 m from the road.
  if (away > 0) {
    h += away * mesa;
    const range = smooth(0.4, 0.64, fbm(wx * 0.00085 + 120, wz * 0.00085 - 60, 4));
    if (range > 0) {
      const ridge = 1 - Math.abs(fbm(wx * 0.0013 + 7, wz * 0.0013 + 81, 3) * 2 - 1);
      h += away * range * (60 + 110 * ridge * ridge + 40 * fbm(wx * 0.005 + 3, wz * 0.005 + 44, 3));
    }
  }

  const wall = wallAmount(x, z);
  if (wall > 0) h += wall * (34 + 62 * fbm(x * 0.0075 + 400, z * 0.0075 + 120, 3));

  const flat = baseFlatten(x, z);
  const mid = (fbm(x * 0.06, z * 0.06, 3) - 0.44) * 0.9 * (0.5 + 1.2 * rough);
  const bumpy = (fbm(x * 0.18 + 9, z * 0.18 + 4, 2) - 0.44) * 0.3 * (0.5 + 2.4 * rough);
  const small = (vnoise(x * 0.35, z * 0.35) - 0.5) * 0.12;
  return (h + mid + bumpy + small) * flat;
}

// How thickly loose pebbles lie at a spot, 0..1. Gravel comes in patches a few
// hundred metres across with clear ground between them, and each patch is itself
// uneven, so the amount changes as you drive instead of being spread evenly.
export function pebbleDensity(x, z) {
  const patch = smooth(0.32, 0.64, fbm(x * 0.0065 + 710, z * 0.0065 - 330, 2));
  const grain = 0.55 + 1.2 * fbm(x * 0.045 + 40, z * 0.045 + 9, 2);
  return clamp(0.16 + 0.84 * patch * Math.min(1, grain), 0, 1);
}

// ---------- rocks: one hash, used by both the physics and the visuals ----------

const STONE_CELL = 13;
export const stone = { x: 0, z: 0, r: 0, h: 0, big: false };

// Returns false when the cell is empty. Fills the shared `stone` record otherwise.
function stoneInCell(ci, cj) {
  const a = hash(ci * 1.37 + 5.1, cj * 2.11 + 9.7);
  const x = (ci + 0.15 + 0.7 * hash(ci + 31, cj + 17)) * STONE_CELL;
  const z = (cj + 0.15 + 0.7 * hash(ci + 7, cj + 53)) * STONE_CELL;
  // Rocks clump into fields, leaving clear lanes between them.
  // Sparse and small on the road, dense with big boulders off it.
  const rough = smooth(ROAD_HALF + 14, ROAD_HALF + 170, roadDist(x, z));
  const density = Math.min(0.95, (0.12 + 0.72 * smooth(0.42, 0.62, fbm(x * 0.0055 + 300, z * 0.0055 - 60, 2))) * (0.22 + 1.5 * rough));
  if (a > density) return false;
  if (baseFlatten(x, z) < 0.999) return false;
  const b = hash(ci + 91, cj + 3);
  const big = b > 0.97 - 0.13 * rough;
  const r = big ? 1.3 + b * 2.2 : 0.35 + b * 1.15;
  stone.x = x;
  stone.z = z;
  stone.r = r;
  stone.h = big ? r * (0.75 + 0.35 * hash(ci + 2, cj + 44)) : Math.min(0.62, r * (0.3 + 0.3 * hash(ci + 2, cj + 44)));
  stone.big = big;
  return true;
}

// Terrain plus any rock the wheel is standing on.
export function groundHeight(x, z) {
  let h = terrainHeight(x, z);
  const ci = Math.floor(x / STONE_CELL);
  const cj = Math.floor(z / STONE_CELL);
  for (let di = -1; di <= 1; di++) {
    for (let dj = -1; dj <= 1; dj++) {
      if (!stoneInCell(ci + di, cj + dj)) continue;
      const dx = x - stone.x;
      const dz = z - stone.z;
      const r2 = stone.r * stone.r;
      const d2 = dx * dx + dz * dz;
      if (d2 >= r2) continue;
      const top = terrainHeight(stone.x, stone.z) + stone.h * 0.95 * Math.pow(1 - d2 / r2, 0.55);
      if (top > h) h = top;
    }
  }
  return h;
}

// Height of the *rendered* surface, which is a coarse triangulation of terrainHeight.
// Anything laid on the ground (tyre tracks) has to follow this, not the analytic
// height, or it sinks below the mesh between vertices.
export function surfaceHeight(x, z) {
  const s = 220 / 48;
  const i = Math.floor(x / s);
  const j = Math.floor(z / s);
  const fx = x / s - i;
  const fz = z / s - j;
  const h00 = terrainHeight(i * s, j * s);
  const h10 = terrainHeight((i + 1) * s, j * s);
  const h01 = terrainHeight(i * s, (j + 1) * s);
  const h11 = terrainHeight((i + 1) * s, (j + 1) * s);
  // PlaneGeometry splits every cell into two triangles across the anti-diagonal, so
  // interpolate over the matching triangle. Averaging the cell bilinearly instead
  // put the surface up to 8 cm off, and anything laid on the ground sank through it.
  return fx + fz <= 1
    ? h00 * (1 - fx - fz) + h01 * fz + h10 * fx
    : h11 * (fx + fz - 1) + h01 * (1 - fx) + h10 * (1 - fz);
}

// ---------- streamed visuals ----------

const TILE = 220;
const GRID = 21; // tiles across, centred on the rover
const SEG = 48; // uniform, so a tile keeps its geometry as the window scrolls
// Rocks this close always cast a real shadow (see the dedicated `nearRocks` mesh in
// createTerrain — InstancedMesh.castShadow is one flag for the whole batch, so the
// old approach of toggling it per streamed 220 m tile made two rocks a few metres
// apart disagree about shadows whenever they landed in different tiles).
const NEAR_SHADOW_REACH = 200;
const BEAM_REACH = 300; // and rocks this far along the long-range spotlight
const BEAM_HALF_WIDTH = 45;
const ROCK_DIST_BASE = 774; // rocks are drawn this far out; fog hides the rest
let ROCK_DIST = ROCK_DIST_BASE;
export function setViewScale(k) {
  ROCK_DIST = ROCK_DIST_BASE * k;
}
export const MESH_STEP = 220 / 48; // TILE / SEG, the spacing of terrain vertices
const TEX_METERS = 26; // one texture tile covers this many metres of ground

function makeGroundTexture(anisotropy) {
  const size = 512;
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext('2d');
  const img = ctx.createImageData(size, size);
  for (let i = 0; i < size * size; i++) {
    const v = 190 + Math.random() * 65;
    img.data[i * 4] = img.data[i * 4 + 1] = img.data[i * 4 + 2] = v;
    img.data[i * 4 + 3] = 255;
  }
  ctx.putImageData(img, 0, 0);
  // Fine grain only. A layer of big, dark blotches used to sit here too, and because
  // this texture doubles as a bump map, each one also faked a shallow dent in the
  // lighting — at a grazing look-out across the plain, dozens of these tiled across
  // the view as soft dark ovals scattered over otherwise flat ground.
  for (const [count, rMin, rMax, alpha] of [[160, 5, 20, 0.028]]) {
    for (let i = 0; i < count; i++) {
      ctx.fillStyle = `rgba(${Math.random() < 0.5 ? '0,0,0' : '255,255,255'},${alpha * (0.4 + Math.random())})`;
      const x = Math.random() * size;
      const y = Math.random() * size;
      const r = rMin + Math.random() * (rMax - rMin);
      // Draw across the seam too, so the wrap has no visible edge.
      for (const ox of [-size, 0, size]) {
        for (const oy of [-size, 0, size]) {
          ctx.beginPath();
          ctx.ellipse(x + ox, y + oy, r, r * (0.6 + Math.random() * 0.8), Math.random() * 3.14, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  // UVs are written in world space per vertex, so repeat stays 1:1 here.
  tex.repeat.set(1, 1);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = anisotropy;
  return tex;
}

function makeRockGeometry() {
  const geo = new THREE.IcosahedronGeometry(1, 1);
  const p = geo.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i);
    const y = p.getY(i);
    const z = p.getZ(i);
    const s = 0.72 + 0.5 * vnoise(x * 1.7 + z * 2.9, y * 2.1 + 7);
    p.setXYZ(i, x * s, y * s, z * s);
  }
  geo.computeVertexNormals();
  return geo;
}

const dark = new THREE.Color(0x8a452b);
const base = new THREE.Color(0xb4633c);
const dust = new THREE.Color(0xd09462);
const rockCol = new THREE.Color(0x5b3326);
const strata = new THREE.Color(0xb46f45);
const pale = new THREE.Color(0xd9b189);
const rust = new THREE.Color(0x7d3a22);
const roadCol = new THREE.Color(0xcf9666);
const _c = new THREE.Color();

// Heights for the tile plus a one-cell margin. computeVertexNormals() only sees the
// triangles inside its own tile, so border normals came out wrong and every tile
// edge showed as a straight dark seam across the plain. Central differences on a
// padded grid depend only on world position, so neighbouring tiles agree exactly.
const padH = new Float32Array((SEG + 3) * (SEG + 3));
// Every tile shares the same vertex layout, so the vertex -> padded-grid mapping is
// computed once instead of rounding coordinates for every vertex of every tile.
let padIndex = null;

function fillTile(geo, ox, oz, seg) {
  const pos = geo.attributes.position;
  const normal = geo.attributes.normal;
  const n = seg + 1;
  const P = n + 2;
  const step = TILE / seg;
  for (let j = -1; j <= n; j++) {
    const wz = oz + j * step;
    for (let i = -1; i <= n; i++) {
      padH[(j + 1) * P + (i + 1)] = terrainHeight(ox + i * step, wz);
    }
  }
  if (!padIndex) {
    padIndex = new Int32Array(pos.count);
    for (let k = 0; k < pos.count; k++) {
      const i = Math.round(pos.getX(k) / step);
      const j = Math.round(pos.getZ(k) / step);
      padIndex[k] = (j + 1) * P + (i + 1);
    }
  }
  const inv = 1 / (2 * step);
  const posArr = pos.array;
  const nrmArr = normal.array;
  for (let k = 0; k < pos.count; k++) {
    const p = padIndex[k];
    posArr[k * 3 + 1] = padH[p];
    const dx = (padH[p + 1] - padH[p - 1]) * inv;
    const dz = (padH[p + P] - padH[p - P]) * inv;
    const inv2 = 1 / Math.sqrt(dx * dx + 1 + dz * dz);
    nrmArr[k * 3] = -dx * inv2;
    nrmArr[k * 3 + 1] = inv2;
    nrmArr[k * 3 + 2] = -dz * inv2;
  }
  pos.needsUpdate = true;
  normal.needsUpdate = true;

  const col = geo.attributes.color;
  const uv = geo.attributes.uv;
  for (let k = 0; k < pos.count; k++) {
    const x = ox + pos.getX(k);
    const z = oz + pos.getZ(k);
    // World-space UVs: the texture runs continuously across tile borders.
    uv.setXY(k, x / TEX_METERS, z / TEX_METERS);
    groundColorAt(x, z, pos.getY(k), nrmArr[k * 3 + 1], _c);
    col.setXYZ(k, _c.r, _c.g, _c.b);
  }
  col.needsUpdate = true;
  uv.needsUpdate = true;
  geo.computeBoundingSphere();
}

// The ground's own colour at a point — shared by the terrain mesh's vertex colours
// above and by anything outside that wants to match it, like dust kicked up off it
// (see dust.js), so a puff thrown up over these reddish mountains actually reads
// reddish instead of always the same generic tan.
function groundColorAt(x, z, y, normalY, out) {
  const a = fbm(x * 0.03 + 40, z * 0.03 - 20, 3);
  const m = fbm(x * 0.2, z * 0.2, 2);
  // Very low frequency wash over hundreds of metres, which is what stops the eye
  // from locking onto the texture tiling when looking into the distance.
  const macro = fbm(x * 0.0022 + 900, z * 0.0022 - 400, 3);
  const patch = fbm(x * 0.008 - 210, z * 0.008 + 77, 2);
  out.copy(dark).lerp(base, smooth(0.25, 0.6, a)).lerp(dust, smooth(0.5, 0.85, m) * 0.55);
  out.lerp(pale, smooth(0.46, 0.74, macro) * 0.5).lerp(rust, smooth(0.48, 0.72, patch) * 0.32);
  // The graded road is paler, packed dust; off it the ground is darker and rockier.
  const onRoad = 1 - smooth(ROAD_HALF + 14, ROAD_HALF + 170, roadDist(x, z));
  out.lerp(roadCol, onRoad * 0.6);
  // Widening the mountains' roughness earlier made ordinary rolling ground pick up
  // enough small-scale slope to light this up too, so gentle hillsides across the
  // whole off-road plain were reading as dark rock smudges from a distance. Only
  // genuinely steep faces — mesa walls, crater rims, real cliffs — should tint.
  const steep = smooth(0.24, 0.58, 1 - normalY);
  if (steep > 0) {
    // Sedimentary beds: broad layers with finer banding inside them, keyed to world
    // height, so they run dead level right around a mesa the way real strata do.
    const bed = Math.sin(y * 0.21 + a * 2.2);
    const fine = Math.sin(y * 0.78 + a * 3.5);
    const band = clamp(0.5 + 0.34 * bed + 0.16 * fine, 0, 1);
    out.lerp(rockCol, steep * (0.55 + 0.45 * (1 - band)));
    out.lerp(strata, steep * band * 0.6);
  }
  return out;
}

// For callers outside the tile builder (no ready-made vertex normal): a cheap central
// difference of the height field itself, same trick fillTile uses for lighting.
const _gcEps = 0.6;
export function groundColorAtXZ(x, z, out = new THREE.Color()) {
  const y = terrainHeight(x, z);
  const dx = (terrainHeight(x + _gcEps, z) - terrainHeight(x - _gcEps, z)) / (2 * _gcEps);
  const dz = (terrainHeight(x, z + _gcEps) - terrainHeight(x, z - _gcEps)) / (2 * _gcEps);
  const normalY = 1 / Math.sqrt(dx * dx + 1 + dz * dz);
  return groundColorAt(x, z, y, normalY, out);
}

function tileGeometry(seg) {
  const geo = new THREE.PlaneGeometry(TILE, TILE, seg, seg);
  geo.rotateX(-Math.PI / 2);
  geo.translate(TILE / 2, 0, TILE / 2);
  geo.setAttribute('color', new THREE.BufferAttribute(new Float32Array(geo.attributes.position.count * 3), 3));
  return geo;
}

export function createTerrain(anisotropy = 8) {
  const group = new THREE.Group();
  const tex = makeGroundTexture(anisotropy);
  const mat = new THREE.MeshStandardMaterial({
    vertexColors: true, map: tex, bumpMap: tex, bumpScale: 0.35, roughness: 1, metalness: 0,
  });
  // One texture repeating every few metres reads as an obvious grid from a distance.
  // Mixing a second sample at an incommensurate scale and offset pushes the combined
  // repeat period far beyond what the eye picks up.
  mat.onBeforeCompile = (shader) => {
    shader.fragmentShader = shader.fragmentShader.replace(
      '#include <map_fragment>',
      `#ifdef USE_MAP
         // Coarse layer carries the blotches and repeats only every ~26 m; the fine
         // layer is folded in as a brightness modulation so close-up grain stays
         // crisp. Averaging the two would just wash the contrast out to flat mud.
         vec3 coarse = texture2D( map, vMapUv ).rgb;
         float fine = texture2D( map, vMapUv * 8.37 + vec2( 0.21, 0.63 ) ).g;
         float grain = texture2D( map, vMapUv * 31.7 + vec2( 0.55, 0.11 ) ).r;
         diffuseColor.rgb *= coarse * ( 0.72 + 0.34 * fine ) * ( 0.88 + 0.16 * grain );
       #endif`
    );
  };
  const rockGeo = makeRockGeometry();
  const rockMat = new THREE.MeshStandardMaterial({ roughness: 0.95, metalness: 0, flatShading: true, vertexColors: true });
  const ROCKS_PER_TILE = Math.ceil(TILE / STONE_CELL + 2) ** 2;

  // A small, always-shadow-casting set of rocks confined to a disc around the rover
  // (the same "rebuild every frame within a radius" trick src/sand.js uses), instead
  // of the big per-tile batches ever casting a near shadow. colorWrite/depthWrite are
  // off, so it draws nothing into the beauty pass — its only effect is the shadow it
  // casts — and so it can't double-render or z-fight the same rocks the visible tile
  // mesh already draws.
  const nearRockMat = new THREE.MeshBasicMaterial({ colorWrite: false, depthWrite: false });
  const NEAR_ROCKS_MAX = Math.ceil((2 * NEAR_SHADOW_REACH) / STONE_CELL + 2) ** 2;
  const nearRocks = new THREE.InstancedMesh(rockGeo, nearRockMat, NEAR_ROCKS_MAX);
  nearRocks.castShadow = true;
  nearRocks.receiveShadow = false;
  nearRocks.frustumCulled = false;
  nearRocks.count = 0;
  group.add(nearRocks);

  const half = (GRID - 1) / 2;
  const tiles = [];
  for (let j = 0; j < GRID; j++) {
    for (let i = 0; i < GRID; i++) {
      const m = new THREE.Mesh(tileGeometry(SEG), mat);
      m.receiveShadow = true;
      m.matrixAutoUpdate = false;
      group.add(m);
      const rocks = new THREE.InstancedMesh(rockGeo, rockMat, ROCKS_PER_TILE);
      rocks.castShadow = false;
      rocks.receiveShadow = true;
      rocks.frustumCulled = false;
      rocks.count = 0;
      group.add(rocks);
      tiles.push({ i, j, mesh: m, rocks, ti: null, tj: null });
    }
  }

  const m4 = new THREE.Matrix4();
  const q = new THREE.Quaternion();
  const scl = new THREE.Vector3();
  const posV = new THREE.Vector3();
  const axisY = new THREE.Vector3(0, 1, 0);

  // Assumes `stone` already holds the record from a just-true `stoneInCell(ci, cj)`
  // call; writes it into instance slot n. Shared by the per-tile fill below and the
  // near-field shadow fill, so both draw the exact same rock the exact same way.
  function writeRockInstance(im, n, ci, cj) {
    q.setFromAxisAngle(axisY, hash(ci + 5, cj + 9) * Math.PI * 2);
    posV.set(stone.x, terrainHeight(stone.x, stone.z), stone.z);
    scl.set(stone.r, stone.h, stone.r);
    m4.compose(posV, q, scl);
    im.setMatrixAt(n, m4);
    const shade = 0.2 + 0.18 * hash(ci + 77, cj + 12);
    _c.setHSL(0.045 + 0.03 * hash(ci, cj + 3), 0.38, stone.big ? shade * 0.85 : shade);
    im.setColorAt(n, _c);
  }

  function fillRocks(tile, ox, oz) {
    const im = tile.rocks;
    const ci0 = Math.floor(ox / STONE_CELL);
    const cj0 = Math.floor(oz / STONE_CELL);
    const span = Math.ceil(TILE / STONE_CELL) + 1;
    let n = 0;
    for (let dj = 0; dj < span && n < im.instanceMatrix.count; dj++) {
      for (let di = 0; di < span && n < im.instanceMatrix.count; di++) {
        const ci = ci0 + di;
        const cj = cj0 + dj;
        if (!stoneInCell(ci, cj)) continue;
        writeRockInstance(im, n, ci, cj);
        n++;
      }
    }
    im.count = n;
    im.instanceMatrix.needsUpdate = true;
    if (im.instanceColor) im.instanceColor.needsUpdate = true;
  }

  // Every rock within NEAR_SHADOW_REACH of the rover, regardless of which streamed
  // tile it happens to belong to — this is what actually gives each rock its own
  // shadow verdict instead of inheriting its tile's.
  function fillNearRocks(x, z) {
    const ci0 = Math.floor((x - NEAR_SHADOW_REACH) / STONE_CELL);
    const cj0 = Math.floor((z - NEAR_SHADOW_REACH) / STONE_CELL);
    const span = Math.ceil((2 * NEAR_SHADOW_REACH) / STONE_CELL) + 2;
    const r2 = NEAR_SHADOW_REACH * NEAR_SHADOW_REACH;
    let n = 0;
    for (let dj = 0; dj < span && n < nearRocks.instanceMatrix.count; dj++) {
      for (let di = 0; di < span && n < nearRocks.instanceMatrix.count; di++) {
        const ci = ci0 + di;
        const cj = cj0 + dj;
        if (!stoneInCell(ci, cj)) continue;
        const dx = stone.x - x;
        const dz = stone.z - z;
        if (dx * dx + dz * dz > r2) continue;
        writeRockInstance(nearRocks, n, ci, cj);
        n++;
      }
    }
    nearRocks.count = n;
    nearRocks.instanceMatrix.needsUpdate = true;
  }

  // Slot i holds whichever world tile in the window satisfies index % GRID === i, so
  // scrolling the window by one recycles a single row instead of all 49 tiles.
  function slotWorld(centre, slot) {
    let t = Math.floor((centre - half - slot) / GRID) * GRID + slot;
    if (t < centre - half) t += GRID;
    return t;
  }

  const queue = [];
  let centerI = NaN;
  let centerJ = NaN;

  // beam: optional {dx, dz} unit vector of the long-range spotlight, so rocks along it
  // cast shadows as far out as the beam reaches.
  function update(x, z, budget = 1, beam = null) {
    const ci = Math.round(x / TILE);
    const cj = Math.round(z / TILE);
    if (ci !== centerI || cj !== centerJ) {
      centerI = ci;
      centerJ = cj;
      for (const t of tiles) {
        const ti = slotWorld(ci, t.i);
        const tj = slotWorld(cj, t.j);
        if (t.ti === ti && t.tj === tj) continue;
        t.ti = ti;
        t.tj = tj;
        t.mesh.position.set(ti * TILE, 0, tj * TILE);
        t.mesh.updateMatrix();
        t.rocks.count = 0;
        queue.push(t);
      }
      queue.sort((a, b) =>
        Math.hypot(a.ti * TILE - x, a.tj * TILE - z) - Math.hypot(b.ti * TILE - x, b.tj * TILE - z));
    }
    // Rebuilding a whole row in one frame stutters; spread it out.
    for (let n = 0; n < budget && queue.length; n++) {
      const t = queue.shift();
      const ox = t.ti * TILE;
      const oz = t.tj * TILE;
      fillTile(t.mesh.geometry, ox, oz, SEG);
      fillRocks(t, ox, oz);
    }
    // Near-field rock shadows are handled entirely by the dedicated nearRocks mesh
    // now (see below) — accurate per rock, not per 220 m tile.
    fillNearRocks(x, z);
    for (const t of tiles) {
      const cx = t.ti * TILE + TILE / 2;
      const cz = t.tj * TILE + TILE / 2;
      t.rocks.visible = Math.hypot(cx - x, cz - z) < ROCK_DIST;
      // The far beam-reach case is the only thing tile-level shadow casting still
      // does — rare (headlights, at night, far ahead), so the same per-tile
      // granularity that was wrong up close is fine out there.
      let cast = false;
      if (beam && t.rocks.visible) {
        // Does the beam corridor (out to BEAM_REACH, a little wide) touch this tile?
        for (let d = 40; d <= BEAM_REACH && !cast; d += 40) {
          const px = x + beam.dx * d;
          const pz = z + beam.dz * d;
          const ex = Math.max(Math.abs(cx - px) - TILE / 2, 0);
          const ez = Math.max(Math.abs(cz - pz) - TILE / 2, 0);
          cast = Math.hypot(ex, ez) < BEAM_HALF_WIDTH;
        }
      }
      t.rocks.castShadow = cast;
    }
    return queue.length;
  }

  function prime(x, z) {
    update(x, z, 0);
    while (queue.length) update(x, z, 8);
  }

  return { group, update, prime, TILE, GRID };
}
