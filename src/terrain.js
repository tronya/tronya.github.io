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

// ---------- the route ----------

export const ROUTE_HALF = 4900;

// The corridor snakes, so the drive is longer than the straight line between bases.
export function routeZ(x) {
  const t = clamp(x / ROUTE_HALF, -1.15, 1.15);
  return Math.sin(t * 2.3) * 780 + Math.sin(t * 5.7 + 1.2) * 260 + t * 900;
}

// Half-width of the drivable corridor; it pinches and opens out along the way.
export function corridorWidth(x) {
  return 560 + 250 * Math.sin(x * 0.00043 + 2.0) + 130 * Math.sin(x * 0.00117 + 0.4);
}

export const BASES = [
  { name: 'АЛЬФА', x: -ROUTE_HALF, z: routeZ(-ROUTE_HALF) },
  { name: 'БЕТА', x: ROUTE_HALF, z: routeZ(ROUTE_HALF) },
];
export const BASE_FLAT_R = 95;

// How far outside the corridor a point is: 0 inside, 1 in the ridges that wall it in.
function wallAmount(x, z) {
  const w = corridorWidth(x);
  const off = Math.abs(z - routeZ(x)) + (fbm(x * 0.0016 + 11, z * 0.0016 + 5, 2) - 0.5) * 170;
  const side = smooth(w, w + 150, off);
  const ends = smooth(ROUTE_HALF + 60, ROUTE_HALF + 420, Math.abs(x));
  return Math.max(side, ends);
}

// Flat apron around each base so the habitat sits level and you can park.
function baseFlatten(x, z) {
  let k = 1;
  for (const b of BASES) {
    k = Math.min(k, smooth(BASE_FLAT_R * 0.55, BASE_FLAT_R * 1.7, Math.hypot(x - b.x, z - b.z)));
  }
  return k;
}

// Shallow craters scattered along the corridor.
const CRATERS = (() => {
  const list = [];
  for (let i = 0; i < 46; i++) {
    const r1 = hash(i * 3 + 1, 7);
    const r2 = hash(i * 5 + 2, 13);
    const r3 = hash(i * 7 + 3, 29);
    const x = (r1 * 2 - 1) * ROUTE_HALF * 0.97;
    const z = routeZ(x) + (r2 * 2 - 1) * corridorWidth(x) * 0.72;
    const R = 14 + r3 * 30;
    if (BASES.some((b) => Math.hypot(x - b.x, z - b.z) < BASE_FLAT_R + R + 40)) continue;
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

// An open plain inside the corridor, walled by ridges outside it.
export function terrainHeight(x, z) {
  const wx = x + (fbm(x * 0.02 + 11, z * 0.02 + 3, 2) - 0.5) * 26;
  const wz = z + (fbm(x * 0.02 - 7, z * 0.02 + 29, 2) - 0.5) * 26;

  let h = (fbm(wx * 0.009 + 5, wz * 0.009 + 9, 3) - 0.46) * 9;
  h += (fbm(wx * 0.026 + 60, wz * 0.026 - 18, 2) - 0.46) * 2.4;

  const duneZone = smooth(0.44, 0.6, fbm(wx * 0.012 + 200, wz * 0.012 + 90, 2));
  if (duneZone > 0) {
    const ph = (wx * 0.7 + wz * 0.4) * 0.16 + (fbm(wx * 0.03, wz * 0.03, 2) - 0.44) * 5;
    h += duneZone * 1.15 * 0.5 * (Math.sin(ph) + 0.5 * Math.sin(2 * ph + 0.6));
  }
  h += craterHeight(x, z);

  const wall = wallAmount(x, z);
  if (wall > 0) h += wall * (34 + 62 * fbm(x * 0.0075 + 400, z * 0.0075 + 120, 3));

  const flat = baseFlatten(x, z);
  const mid = (fbm(x * 0.06, z * 0.06, 3) - 0.44) * 0.9;
  const rough = (fbm(x * 0.18 + 9, z * 0.18 + 4, 2) - 0.44) * 0.3;
  const small = (vnoise(x * 0.35, z * 0.35) - 0.5) * 0.12;
  return (h + mid + rough + small) * flat;
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
  const density = 0.12 + 0.72 * smooth(0.42, 0.62, fbm(x * 0.0055 + 300, z * 0.0055 - 60, 2));
  if (a > density) return false;
  if (baseFlatten(x, z) < 0.999) return false;
  const b = hash(ci + 91, cj + 3);
  const big = b > 0.88;
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
const GRID = 7; // tiles across, centred on the rover
const SEG = 48; // uniform, so a tile keeps its geometry as the window scrolls
const ROCK_DIST = 430; // rocks are drawn this far out; fog hides the rest
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
  // Blotches at several scales; a single scale reads as an obvious repeat.
  for (const [count, rMin, rMax, alpha] of [[40, 30, 90, 0.035], [120, 8, 34, 0.05], [260, 2, 9, 0.07]]) {
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
    const a = fbm(x * 0.03 + 40, z * 0.03 - 20, 3);
    const m = fbm(x * 0.2, z * 0.2, 2);
    // Very low frequency wash over hundreds of metres, which is what stops the eye
    // from locking onto the texture tiling when looking into the distance.
    const macro = fbm(x * 0.0022 + 900, z * 0.0022 - 400, 3);
    const patch = fbm(x * 0.008 - 210, z * 0.008 + 77, 2);
    _c.copy(dark).lerp(base, smooth(0.25, 0.6, a)).lerp(dust, smooth(0.5, 0.85, m) * 0.55);
    _c.lerp(pale, smooth(0.46, 0.74, macro) * 0.5).lerp(rust, smooth(0.48, 0.72, patch) * 0.32);
    const steep = smooth(0.06, 0.4, 1 - normal.getY(k));
    if (steep > 0) {
      const band = Math.sin(pos.getY(k) * 1.7 + a * 10) * 0.5 + 0.5;
      _c.lerp(rockCol, steep * 0.85).lerp(strata, steep * band * 0.35);
    }
    col.setXYZ(k, _c.r, _c.g, _c.b);
  }
  col.needsUpdate = true;
  uv.needsUpdate = true;
  geo.computeBoundingSphere();
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
    vertexColors: true, map: tex, bumpMap: tex, bumpScale: 1.2, roughness: 1, metalness: 0,
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

  function fillRocks(tile, ox, oz) {
    const im = tile.rocks;
    const ci0 = Math.floor(ox / STONE_CELL);
    const cj0 = Math.floor(oz / STONE_CELL);
    const span = Math.ceil(TILE / STONE_CELL) + 1;
    let n = 0;
    for (let dj = 0; dj < span && n < im.instanceMatrix.count; dj++) {
      for (let di = 0; di < span && n < im.instanceMatrix.count; di++) {
        if (!stoneInCell(ci0 + di, cj0 + dj)) continue;
        q.setFromAxisAngle(axisY, hash(ci0 + di + 5, cj0 + dj + 9) * Math.PI * 2);
        posV.set(stone.x, terrainHeight(stone.x, stone.z), stone.z);
        scl.set(stone.r, stone.h, stone.r);
        m4.compose(posV, q, scl);
        im.setMatrixAt(n, m4);
        const shade = 0.2 + 0.18 * hash(ci0 + di + 77, cj0 + dj + 12);
        _c.setHSL(0.045 + 0.03 * hash(ci0 + di, cj0 + dj + 3), 0.38, stone.big ? shade * 0.85 : shade);
        im.setColorAt(n, _c);
        n++;
      }
    }
    im.count = n;
    im.instanceMatrix.needsUpdate = true;
    if (im.instanceColor) im.instanceColor.needsUpdate = true;
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

  function update(x, z, budget = 1) {
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
    for (const t of tiles) {
      t.rocks.visible = Math.hypot(t.ti * TILE + TILE / 2 - x, t.tj * TILE + TILE / 2 - z) < ROCK_DIST;
    }
    return queue.length;
  }

  function prime(x, z) {
    update(x, z, 0);
    while (queue.length) update(x, z, 8);
  }

  return { group, update, prime, TILE, GRID };
}
