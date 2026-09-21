import * as THREE from 'three';
import { ROUTE_PTS, BASES, BASE_FLAT_R, surfaceHeight } from './terrain.js';

// Marker posts down the middle of the road every 200-300 m, each with an amber lamp that
// flashes once every couple of seconds. The flash runs down the road as a wave (each
// post is a little later than the one before it), so the road reads as a line of blinking
// lights at night and you can see which way it goes.

const SPACING_MIN = 200;
const SPACING_MAX = 300;
const POST_H = 1.5;
const PERIOD = 2.4; // seconds between flashes
const WAVE = 0.045; // phase step per 200 m of road, as a fraction of the period

const glowVertex = /* glsl */ `
  attribute float aPhase;
  uniform float uTime;
  uniform float uPx;
  uniform float uPeriod;
  varying float vOn;
  void main() {
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    gl_Position = projectionMatrix * mv;
    float ph = fract(uTime / uPeriod + aPhase);
    // A short, soft flash: quick rise, slightly slower fall.
    vOn = smoothstep(0.0, 0.015, ph) * (1.0 - smoothstep(0.06, 0.13, ph));
    float d = max(-mv.z, 0.1);
    gl_PointSize = clamp(2.2 * uPx / d, 3.0, 80.0) * (0.3 + 0.7 * vOn);
  }
`;

const glowFragment = /* glsl */ `
  uniform float uGain;
  varying float vOn;
  void main() {
    float r = length(gl_PointCoord - 0.5) * 2.0;
    if (r > 1.0) discard;
    float a = pow(1.0 - r, 2.0);
    gl_FragColor = vec4(1.0, 0.6, 0.18, a * (0.07 + vOn * uGain));
  }
`;

export function createRoadPosts() {
  // One run of posts down the middle of the road, 200-300 m apart. A fixed seed keeps
  // the layout the same every visit.
  const spots = [];
  let seed = 12345;
  const rand = () => {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed / 4294967296;
  };
  let next = 60 + rand() * 200;
  for (let i = 1; i < ROUTE_PTS.length - 1; i++) {
    const a = ROUTE_PTS[i];
    if (a.s < next) continue;
    next += SPACING_MIN + rand() * (SPACING_MAX - SPACING_MIN);
    if (BASES.some((b) => Math.hypot(a.x - b.x, a.z - b.z) < BASE_FLAT_R + 40)) continue;
    const x = a.x;
    const z = a.z;
    spots.push({ x, y: surfaceHeight(x, z), z, phase: ((a.s / 200) * WAVE) % 1 });
  }
  const n = spots.length;

  const group = new THREE.Group();

  const postGeo = new THREE.CylinderGeometry(0.07, 0.1, POST_H, 6);
  postGeo.translate(0, POST_H / 2 - 0.1, 0);
  const posts = new THREE.InstancedMesh(postGeo, new THREE.MeshStandardMaterial({ color: 0x3b2c26, roughness: 0.9 }), n);
  posts.castShadow = true;

  const capGeo = new THREE.BoxGeometry(0.26, 0.18, 0.26);
  const caps = new THREE.InstancedMesh(capGeo, new THREE.MeshBasicMaterial({ color: 0xffffff }), n);
  caps.instanceMatrix.setUsage(THREE.StaticDrawUsage);

  const m = new THREE.Matrix4();
  const glowPos = new Float32Array(n * 3);
  const glowPhase = new Float32Array(n);
  spots.forEach((s, i) => {
    m.makeTranslation(s.x, s.y, s.z);
    posts.setMatrixAt(i, m);
    m.makeTranslation(s.x, s.y + POST_H - 0.05, s.z);
    caps.setMatrixAt(i, m);
    caps.setColorAt(i, new THREE.Color(0x3a1a08));
    glowPos.set([s.x, s.y + POST_H, s.z], i * 3);
    glowPhase[i] = s.phase;
  });
  posts.frustumCulled = false; // the posts span the whole map
  caps.frustumCulled = false;

  const glowGeo = new THREE.BufferGeometry();
  glowGeo.setAttribute('position', new THREE.BufferAttribute(glowPos, 3));
  glowGeo.setAttribute('aPhase', new THREE.BufferAttribute(glowPhase, 1));
  const uniforms = {
    uTime: { value: 0 },
    uPx: { value: 1000 },
    uPeriod: { value: PERIOD },
    uGain: { value: 1 },
  };
  const glow = new THREE.Points(
    glowGeo,
    new THREE.ShaderMaterial({
      uniforms,
      vertexShader: glowVertex,
      fragmentShader: glowFragment,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      fog: false,
    })
  );
  glow.frustumCulled = false;

  group.add(posts, caps, glow);

  const on = new THREE.Color(0xffa23a);
  const off = new THREE.Color(0x3a1a08);
  const c = new THREE.Color();
  const wasOn = new Uint8Array(n);

  return {
    group,
    count: n,
    // t: seconds, daylight 0..1, pxPerUnit: pixels per metre at 1 m distance
    update(t, daylight, pxPerUnit) {
      uniforms.uTime.value = t;
      uniforms.uPx.value = pxPerUnit;
      // Sunlight washes the glow out but the lamps still show in daylight.
      uniforms.uGain.value = 0.45 + 1.1 * (1 - daylight);
      let changed = false;
      for (let i = 0; i < n; i++) {
        const ph = (t / PERIOD + glowPhase[i]) % 1;
        const lit = ph < 0.1 ? 1 : 0;
        if (lit === wasOn[i]) continue;
        wasOn[i] = lit;
        caps.setColorAt(i, c.copy(lit ? on : off));
        changed = true;
      }
      if (changed) caps.instanceColor.needsUpdate = true;
    },
  };
}
