import * as THREE from 'three';

// Fog colour and sky horizon are the same raw display values, so terrain fades
// into the sky seamlessly (three applies fog after tone mapping).
const raw = (r, g, b) => new THREE.Color().setRGB(r, g, b, THREE.LinearSRGBColorSpace);

export const PRESETS = {
  day: {
    horizon: raw(0.86, 0.62, 0.45),
    zenith: raw(0.6, 0.4, 0.31),
    ground: raw(0.5, 0.28, 0.17),
    tint: raw(1.0, 0.86, 0.66),
    stars: 0,
    glow: 0.22,
    core: 0.35,
    discA: 0.9993,
    discB: 0.9998,
    disc: 3.0,
    dir: new THREE.Vector3(0.55, 0.48, 0.7).normalize(),
  },
  night: {
    horizon: raw(0.075, 0.062, 0.09),
    zenith: raw(0.006, 0.008, 0.03),
    ground: raw(0.02, 0.015, 0.02),
    tint: raw(0.65, 0.78, 1.0),
    stars: 1,
    glow: 0.05,
    core: 0.08,
    discA: 0.9975,
    discB: 0.9982,
    disc: 1.5,
    dir: new THREE.Vector3(0.4, 0.55, 0.75).normalize(),
  },
};

export function createSkyMaterial() {
  return new THREE.ShaderMaterial({
    side: THREE.BackSide,
    depthWrite: false,
    fog: false,
    uniforms: {
      sunDir: { value: new THREE.Vector3(0, 1, 0) },
      horizon: { value: new THREE.Color() },
      zenith: { value: new THREE.Color() },
      ground: { value: new THREE.Color() },
      tint: { value: new THREE.Color() },
      stars: { value: 0 },
      glow: { value: 0 },
      core: { value: 0 },
      discA: { value: 0.9993 },
      discB: { value: 0.9998 },
      disc: { value: 3 },
    },
    vertexShader: /* glsl */ `
      varying vec3 vDir;
      void main() {
        vDir = normalize(position);
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: /* glsl */ `
      uniform vec3 sunDir;
      uniform vec3 horizon;
      uniform vec3 zenith;
      uniform vec3 ground;
      uniform vec3 tint;
      uniform float stars;
      uniform float glow;
      uniform float core;
      uniform float discA;
      uniform float discB;
      uniform float disc;
      varying vec3 vDir;

      float hash31(vec3 p) {
        p = fract(p * 0.3183099 + 0.1);
        p *= 17.0;
        return fract(p.x * p.y * p.z * (p.x + p.y + p.z));
      }

      void main() {
        vec3 d = normalize(vDir);
        float t = pow(clamp(d.y, 0.0, 1.0), 0.45);
        vec3 col = mix(horizon, zenith, t);
        col = mix(col, ground, smoothstep(0.0, -0.35, d.y));

        if (stars > 0.0) {
          vec3 sp = d * 170.0;
          vec3 id = floor(sp);
          vec3 f = fract(sp) - 0.5;
          float r = hash31(id);
          float star = step(0.975, r) * smoothstep(0.32, 0.0, length(f));
          float band = exp(-pow(dot(d, normalize(vec3(0.3, 0.8, 0.5))) * 4.0, 2.0)) * 0.035;
          float up = smoothstep(0.02, 0.3, d.y);
          col += stars * up * (star * (0.35 + 0.65 * r) * vec3(0.85, 0.9, 1.0) + band * vec3(0.5, 0.6, 1.0));
        }

        float s = max(dot(d, sunDir), 0.0);
        col += tint * (pow(s, 6.0) * glow + pow(s, 60.0) * core);
        col += mix(vec3(1.0, 0.95, 0.85), tint, 0.5) * smoothstep(discA, discB, s) * disc;
        gl_FragColor = vec4(col, 1.0);
      }
    `,
  });
}

// Blend the two presets by how high the sun is, so dusk and dawn pass through
// smoothly instead of snapping between day and night.
const _c = new THREE.Color();
export function updateSky(material, sunDir, daylight) {
  const u = material.uniforms;
  const d = PRESETS.day;
  const n = PRESETS.night;
  u.sunDir.value.copy(sunDir).normalize();
  u.horizon.value.copy(n.horizon).lerp(_c.copy(d.horizon), daylight);
  u.zenith.value.copy(n.zenith).lerp(_c.copy(d.zenith), daylight);
  u.ground.value.copy(n.ground).lerp(_c.copy(d.ground), daylight);
  u.tint.value.copy(n.tint).lerp(_c.copy(d.tint), daylight);
  u.stars.value = 1 - Math.min(1, daylight * 1.6);
  u.glow.value = n.glow + (d.glow - n.glow) * daylight;
  u.core.value = n.core + (d.core - n.core) * daylight;
  u.discA.value = n.discA + (d.discA - n.discA) * daylight;
  u.discB.value = n.discB + (d.discB - n.discB) * daylight;
  u.disc.value = n.disc + (d.disc - n.disc) * daylight;
}

// The sky shader prints its colours as-is, but three converts the fog colour from
// linear to sRGB before blending. Storing the sky's numbers unchanged therefore made
// the fog several times brighter than the sky behind it (a cream smear by day, a grey
// haze by night). Store the linear equivalent instead, so the fog is *rendered* as
// exactly the horizon colour and distant terrain melts into the sky.
const _mix = new THREE.Color();
export function horizonColor(daylight, out) {
  _mix.copy(PRESETS.night.horizon).lerp(_c.copy(PRESETS.day.horizon), daylight);
  return out.setRGB(_mix.r, _mix.g, _mix.b, THREE.SRGBColorSpace);
}
