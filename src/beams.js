import * as THREE from 'three';

// Visible headlight beams: a soft cone of lit dust in front of each lamp. It is only
// air being lit, so it is additive, writes no depth, fades along its length and
// towards its silhouette (so there is never a hard cone edge), and carries a slow,
// drifting grain — motes turning in the light. Only worth seeing in the dark.
const LEN = 26;

const material = new THREE.ShaderMaterial({
  uniforms: {
    time: { value: 0 },
    strength: { value: 0 },
    color: { value: new THREE.Color(0xfff0d0) },
  },
  vertexShader: /* glsl */ `
    varying float vAlong;
    varying vec3 vN;
    varying vec3 vView;
    varying vec3 vWorld;
    void main() {
      vAlong = 1.0 - uv.y;                 // 0 at the lamp .. 1 at the far end
      vec4 mv = modelViewMatrix * vec4(position, 1.0);
      vN = normalize(normalMatrix * normal);
      vView = normalize(-mv.xyz);
      vWorld = (modelMatrix * vec4(position, 1.0)).xyz;
      gl_Position = projectionMatrix * mv;
    }
  `,
  fragmentShader: /* glsl */ `
    uniform float time;
    uniform float strength;
    uniform vec3 color;
    varying float vAlong;
    varying vec3 vN;
    varying vec3 vView;
    varying vec3 vWorld;
    float hash(vec3 p) { return fract(sin(dot(p, vec3(12.9898, 78.233, 37.719))) * 43758.5453); }
    float noise(vec3 p) {
      vec3 i = floor(p); vec3 f = fract(p); f = f * f * (3.0 - 2.0 * f);
      float n = mix(mix(mix(hash(i), hash(i + vec3(1,0,0)), f.x), mix(hash(i + vec3(0,1,0)), hash(i + vec3(1,1,0)), f.x), f.y),
                    mix(mix(hash(i + vec3(0,0,1)), hash(i + vec3(1,0,1)), f.x), mix(hash(i + vec3(0,1,1)), hash(i + vec3(1,1,1)), f.x), f.y), f.z);
      return n;
    }
    void main() {
      float edge = pow(abs(dot(normalize(vN), normalize(vView))), 1.6);
      float along = (1.0 - vAlong);
      float fall = along * along * smoothstep(0.0, 0.18, vAlong);
      float motes = 0.65 + 0.7 * noise(vWorld * 0.9 + vec3(time * 0.3, time * 0.1, -time * 0.2));
      float a = strength * edge * fall * motes * 0.075;
      gl_FragColor = vec4(color * a, 1.0);
    }
  `,
  transparent: true,
  depthWrite: false,
  blending: THREE.AdditiveBlending,
  side: THREE.DoubleSide,
});

// mounts: { head: { x, y, z, aimX } } from the chassis; the aim point matches the
// headlight spots in main.js (aimX, -1.9, 32).
export function createBeams(root, mount) {
  const group = new THREE.Group();
  const cone = new THREE.CylinderGeometry(0.16, LEN * Math.tan(0.3), LEN, 24, 1, true);
  // Cylinder uv.y runs 1 at the top (+y) to 0 at the bottom; put the lamp at the top,
  // then shift so it sits on the lamp and point the cone down its own -y.
  cone.translate(0, -LEN / 2, 0);
  for (const side of [-1, 1]) {
    const m = new THREE.Mesh(cone, material);
    m.position.set(side * mount.head.x, mount.head.y, mount.head.z + 0.05);
    const aim = new THREE.Vector3(side * mount.head.aimX, -1.9, 32).sub(m.position).normalize();
    m.quaternion.setFromUnitVectors(new THREE.Vector3(0, -1, 0), aim);
    m.renderOrder = 5;
    m.frustumCulled = false;
    group.add(m);
  }
  root.add(group);
  let time = 0;
  return {
    // on: headlights lit; dark: 0 by day .. 1 at night.
    update(dt, on, dark) {
      time += dt;
      material.uniforms.time.value = time;
      material.uniforms.strength.value = on ? dark : 0;
      group.visible = on && dark > 0.02;
    },
  };
}
