import * as THREE from 'three';
import { GTAOPass } from 'three/addons/postprocessing/GTAOPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { FullScreenQuad } from 'three/addons/postprocessing/Pass.js';
import { PLANET } from './planet.js';

// Post stack, hand-rolled rather than an EffectComposer chain, because on this class of
// GPU every full-screen pass costs ~1.5 ms and the stock chain had eight of them:
//
//   opaque world → HDR target (with its depth kept; no MSAA — a multisampled target
//           is thrown away once resolved, so the second draw below landed on nothing)
//   AO    ← that depth alone, half resolution (normals rebuilt from depth, so the
//           world is never drawn a second time for a G-buffer), faded out with
//           distance, then multiplied into the target
//   see-through things (dust, particles, water, glass, beams) drawn on top, AFTER
//           the AO — multiplied over a bright dust cloud, AO's fine noise and its
//           far-field banding showed through the dust as stripes
//   bloom ← bright pixels only, at quarter resolution
//   final : scene + bloom → ACES → sRGB → FXAA → grade → vignette, in ONE pass
//
// The split uses camera layers: anything see-through is moved to layer 1 (and every
// light is put on both, so layer-1 materials are still lit).
//
// AO is what seats rocks, wheels and the base on the ground instead of floating over it.
// Bloom only catches lamps because they are authored brighter than any sunlit surface
// (glow.js) and the threshold sits above lit sand.

// Display-space grade: a little saturation and a warm/cool split per planet, plus a
// soft vignette. Deliberately small — the lighting already carries each planet's look.
// `curve` is how much of a soft S-curve to apply (contrast without crushing).
// Mars: cooler shadows against warm light, the classic dusty-desert split. Moon:
// stark, neutral, hard. Верданта: soft, damp, greens kept rich.
const GRADE = {
  mars: { sat: 1.1, shadow: [0.97, 0.99, 1.03], high: [1.04, 0.99, 0.93], vignette: 0.3, curve: 0.22 },
  moon: { sat: 0.82, shadow: [0.96, 0.99, 1.05], high: [1.0, 1.0, 0.99], vignette: 0.36, curve: 0.32 },
  verdanta: { sat: 1.08, shadow: [0.95, 1.01, 1.04], high: [1.02, 1.02, 0.96], vignette: 0.26, curve: 0.15 },
};

const finalMaterial = new THREE.ShaderMaterial({
  uniforms: {
    tScene: { value: null },
    tBloom: { value: null },
    bloomAmount: { value: 1 },
    exposure: { value: 1 },
    sat: { value: 1 },
    shadowTint: { value: new THREE.Vector3(1, 1, 1) },
    highTint: { value: new THREE.Vector3(1, 1, 1) },
    vignette: { value: 0.3 },
    aspect: { value: 1 },
    texel: { value: new THREE.Vector2(1 / 1024, 1 / 1024) },
    tShaft: { value: null },
    curve: { value: 0 },
    grain: { value: 0.035 },
    time: { value: 0 },
    shaftAmount: { value: 0 },
    shaftColor: { value: new THREE.Color(1, 0.9, 0.75) },
  },
  vertexShader: /* glsl */ `
    varying vec2 vUv;
    void main() { vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }
  `,
  fragmentShader: /* glsl */ `
    uniform vec2 texel;
    uniform sampler2D tScene;
    uniform sampler2D tBloom;
    uniform float bloomAmount;
    uniform float exposure;
    uniform float sat;
    uniform vec3 shadowTint;
    uniform vec3 highTint;
    uniform float vignette;
    uniform float aspect;
    uniform sampler2D tShaft;
    uniform float curve;
    uniform float grain;
    uniform float time;
    uniform float shaftAmount;
    uniform vec3 shaftColor;
    varying vec2 vUv;

    // three.js's ACES filmic, so the look matches the no-post path exactly.
    const mat3 ACESIn = mat3(vec3(0.59719, 0.07600, 0.02840), vec3(0.35458, 0.90834, 0.13383), vec3(0.04823, 0.01566, 0.83777));
    const mat3 ACESOut = mat3(vec3(1.60475, -0.10208, -0.00327), vec3(-0.53108, 1.10813, -0.07276), vec3(-0.07367, -0.00605, 1.07602));
    vec3 rrt(vec3 v) { vec3 a = v * (v + 0.0245786) - 0.000090537; vec3 b = v * (0.983729 * v + 0.4329510) + 0.238081; return a / b; }
    vec3 aces(vec3 c) { c *= exposure / 0.6; c = ACESIn * c; c = rrt(c); c = ACESOut * c; return clamp(c, 0.0, 1.0); }
    vec3 srgb(vec3 c) { return mix(pow(c, vec3(0.41666)) * 1.055 - 0.055, c * 12.92, vec3(lessThanEqual(c, vec3(0.0031308)))); }

    // Display-referred colour at uv: HDR scene + bloom, tone mapped.
    vec3 tm(vec2 uv) { return srgb(aces(texture2D(tScene, uv).rgb + texture2D(tBloom, uv).rgb * bloomAmount)); }
    float luma(vec3 c) { return dot(c, vec3(0.299, 0.587, 0.114)); }

    void main() {
      // FXAA (the compact 'simple' variant), run on tone-mapped colour where edges
      // are judged the way they will be seen.
      vec3 rgbM = tm(vUv);
      vec3 rgbNW = tm(vUv + vec2(-1.0, -1.0) * texel);
      vec3 rgbNE = tm(vUv + vec2(1.0, -1.0) * texel);
      vec3 rgbSW = tm(vUv + vec2(-1.0, 1.0) * texel);
      vec3 rgbSE = tm(vUv + vec2(1.0, 1.0) * texel);
      float lM = luma(rgbM), lNW = luma(rgbNW), lNE = luma(rgbNE), lSW = luma(rgbSW), lSE = luma(rgbSE);
      float lMin = min(lM, min(min(lNW, lNE), min(lSW, lSE)));
      float lMax = max(lM, max(max(lNW, lNE), max(lSW, lSE)));
      vec2 dir = vec2(-((lNW + lNE) - (lSW + lSE)), (lNW + lSW) - (lNE + lSE));
      float reduce = max((lNW + lNE + lSW + lSE) * 0.03125, 1.0 / 128.0);
      float rcpMin = 1.0 / (min(abs(dir.x), abs(dir.y)) + reduce);
      dir = clamp(dir * rcpMin, vec2(-8.0), vec2(8.0)) * texel;
      vec3 rgbA = 0.5 * (tm(vUv + dir * (1.0 / 3.0 - 0.5)) + tm(vUv + dir * (2.0 / 3.0 - 0.5)));
      vec3 rgbB = rgbA * 0.5 + 0.25 * (tm(vUv - dir * 0.5) + tm(vUv + dir * 0.5));
      float lB = luma(rgbB);
      vec3 c = (lB < lMin || lB > lMax) ? rgbA : rgbB;
      float l = dot(c, vec3(0.2126, 0.7152, 0.0722));
      c = mix(vec3(l), c, sat);
      c *= mix(shadowTint, highTint, smoothstep(0.1, 0.7, l));
      if (shaftAmount > 0.0) {
        float sh = texture2D(tShaft, vUv).r * shaftAmount;
        c += shaftColor * sh * (1.0 - c * 0.6); // screen-ish: never blows the sky out
      }
      c = clamp(c, 0.0, 1.0);
      c = mix(c, c * c * (3.0 - 2.0 * c), curve);
      vec2 d = (vUv - 0.5) * vec2(aspect, 1.0);
      c *= 1.0 - vignette * smoothstep(0.35, 1.05, length(d) * 1.25);
      // Fine film grain, strongest in the mid-tones, fresh every frame.
      if (grain > 0.0) {
        float gn = fract(sin(dot(gl_FragCoord.xy + fract(time * 7.13) * 117.0, vec2(12.9898, 78.233))) * 43758.5453) - 0.5;
        float lg = dot(c, vec3(0.2126, 0.7152, 0.0722));
        c += gn * grain * (1.0 - abs(lg * 2.0 - 1.0) * 0.7);
      }
      gl_FragColor = vec4(c, 1.0);
    }
  `,
  depthTest: false,
  depthWrite: false,
});

// Light shafts ("god rays"), at quarter resolution: march from each pixel toward the
// sun on screen and count how much open sky the path crosses. Ridges, rocks and the
// rover break that up into rays; the result is added in the final pass.
const shaftMaterial = new THREE.ShaderMaterial({
  uniforms: { tDepth: { value: null }, sunUV: { value: new THREE.Vector2(0.5, 0.5) }, aspect: { value: 1 } },
  vertexShader: /* glsl */ `varying vec2 vUv; void main() { vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }`,
  fragmentShader: /* glsl */ `
    uniform sampler2D tDepth;
    uniform vec2 sunUV;
    uniform float aspect;
    varying vec2 vUv;
    const int STEPS = 36;
    void main() {
      vec2 toSun = vUv - sunUV;
      float dist = length(toSun * vec2(aspect, 1.0));
      vec2 delta = toSun * (0.92 / float(STEPS));
      vec2 uv = vUv;
      float sum = 0.0;
      float wgt = 1.0;
      float tot = 0.0;
      for (int i = 0; i < STEPS; i++) {
        vec2 q = clamp(uv, vec2(0.001), vec2(0.999));
        sum += step(0.99999, texture2D(tDepth, q).x) * wgt;
        tot += wgt;
        wgt *= 0.965;
        uv -= delta;
      }
      float s = sum / tot;
      s *= exp(-dist * 1.5);
      gl_FragColor = vec4(vec3(s), 1.0);
    }
  `,
  depthTest: false,
  depthWrite: false,
});

// AO, faded out with distance (it is a contact term, and far off, where depth is
// coarse, GTAO rebuilt from depth alone turns into streaks), baked to half res.
const aoFadeMaterial = new THREE.ShaderMaterial({
  uniforms: { tAO: { value: null }, tDepth: { value: null }, near: { value: 0.1 }, far: { value: 2000 }, amount: { value: 0.85 } },
  vertexShader: /* glsl */ `varying vec2 vUv; void main() { vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }`,
  fragmentShader: /* glsl */ `
    uniform sampler2D tAO;
    uniform sampler2D tDepth;
    uniform float near;
    uniform float far;
    uniform float amount;
    varying vec2 vUv;
    void main() {
      float z = texture2D(tDepth, vUv).x * 2.0 - 1.0;
      float dist = 2.0 * near * far / (far + near - z * (far - near));
      float k = amount * (1.0 - smoothstep(35.0, 90.0, dist));
      gl_FragColor = vec4(vec3(mix(1.0, texture2D(tAO, vUv).r, k)), 1.0);
    }
  `,
  depthTest: false,
  depthWrite: false,
});
// dst.rgb *= src.rgb — darkens what is already in the target, touches nothing else.
const aoApplyMaterial = new THREE.ShaderMaterial({
  uniforms: { tAO: { value: null } },
  vertexShader: /* glsl */ `varying vec2 vUv; void main() { vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }`,
  fragmentShader: /* glsl */ `uniform sampler2D tAO; varying vec2 vUv; void main() { gl_FragColor = vec4(texture2D(tAO, vUv).rgb, 1.0); }`,
  blending: THREE.CustomBlending,
  blendEquation: THREE.AddEquation,
  blendSrc: THREE.ZeroFactor,
  blendDst: THREE.SrcColorFactor,
  depthTest: false,
  depthWrite: false,
});

export const SEE_THROUGH = 1; // camera layer for everything drawn after AO

// Move see-through objects to their layer and let every light reach both. Cheap
// enough to re-run now and then for things created later.
export function tagLayers(scene) {
  scene.traverse((o) => {
    if (o.isLight) { o.layers.enable(SEE_THROUGH); return; }
    const m = o.material;
    if (o.isSprite || o.isPoints || (m && !Array.isArray(m) && (m.transparent || m.blending === THREE.AdditiveBlending))) {
      o.layers.set(SEE_THROUGH);
    }
  });
}

export function createPost(renderer, scene, camera) {
  const size = renderer.getDrawingBufferSize(new THREE.Vector2());
  const sceneRT = new THREE.WebGLRenderTarget(size.x, size.y, {
    type: THREE.HalfFloatType,
    depthTexture: new THREE.DepthTexture(size.x, size.y),
  });

  // GTAOPass is used for its shaders and targets only; it is driven by hand below.
  const ao = new GTAOPass(scene, camera, size.x / 2, size.y / 2);
  ao.setGBuffer(sceneRT.depthTexture); // depth-only: no second scene draw
  ao.updateGtaoMaterial({ radius: 1.2, distanceExponent: 1.4, thickness: 1.5, scale: 1.1, samples: 10, distanceFallOff: 1 });
  ao.updatePdMaterial({ lumaPhi: 10, depthPhi: 2, normalPhi: 3, radius: 5, rings: 2, samples: 8 });

  const bloom = new UnrealBloomPass(new THREE.Vector2(size.x / 2, size.y / 2), 0.5, 0.55, 1.6);
  const clear = new THREE.Color();

  const quad = new FullScreenQuad(finalMaterial);
  const U = finalMaterial.uniforms;
  const g = GRADE[PLANET] || GRADE.mars;
  U.sat.value = g.sat;
  U.shadowTint.value.set(...g.shadow);
  U.highTint.value.set(...g.high);
  U.vignette.value = g.vignette;
  U.curve.value = g.curve;
  U.tScene.value = sceneRT.texture;
  const aoFadeRT = new THREE.WebGLRenderTarget(Math.round(size.x / 2), Math.round(size.y / 2), { type: THREE.HalfFloatType });
  aoFadeMaterial.uniforms.tAO.value = ao.pdRenderTarget.texture;
  aoFadeMaterial.uniforms.tDepth.value = sceneRT.depthTexture;
  aoApplyMaterial.uniforms.tAO.value = aoFadeRT.texture;
  const fadeQuad = new FullScreenQuad(aoFadeMaterial);
  const applyQuad = new FullScreenQuad(aoApplyMaterial);
  U.tBloom.value = bloom.renderTargetsHorizontal[0].texture;
  const shaftRT = new THREE.WebGLRenderTarget(Math.max(1, Math.round(size.x / 4)), Math.max(1, Math.round(size.y / 4)));
  shaftMaterial.uniforms.tDepth.value = sceneRT.depthTexture;
  U.tShaft.value = shaftRT.texture;
  const shaftQuad = new FullScreenQuad(shaftMaterial);
  let shaftAmt = 0;

  function renderAO() {
    const m = ao.gtaoMaterial.uniforms;
    m.cameraNear.value = camera.near;
    m.cameraFar.value = camera.far;
    m.cameraProjectionMatrix.value.copy(camera.projectionMatrix);
    m.cameraProjectionMatrixInverse.value.copy(camera.projectionMatrixInverse);
    m.cameraWorldMatrix.value.copy(camera.matrixWorld);
    ao.renderPass(renderer, ao.gtaoMaterial, ao.gtaoRenderTarget, 0xffffff, 1.0);
    ao.pdMaterial.uniforms.cameraProjectionMatrixInverse.value.copy(camera.projectionMatrixInverse);
    ao.renderPass(renderer, ao.pdMaterial, ao.pdRenderTarget, 0xffffff, 1.0);
    aoFadeMaterial.uniforms.near.value = camera.near;
    aoFadeMaterial.uniforms.far.value = camera.far;
    renderer.setRenderTarget(aoFadeRT);
    fadeQuad.render(renderer);
    // render() would clear the target first (autoClear) and multiply AO into black.
    const autoClear = renderer.autoClear;
    renderer.autoClear = false;
    renderer.setRenderTarget(sceneRT);
    applyQuad.render(renderer);
    renderer.autoClear = autoClear;
  }

  // UnrealBloomPass.render minus its last step: it would blend the glow back over the
  // scene in a full-screen pass of its own; the final pass adds it instead.
  function renderBloom() {
    const b = bloom;
    renderer.getClearColor(clear);
    const alpha = renderer.getClearAlpha();
    renderer.setClearColor(0x000000, 0);
    b.highPassUniforms.tDiffuse.value = sceneRT.texture;
    b.highPassUniforms.luminosityThreshold.value = b.threshold;
    b.fsQuad.material = b.materialHighPassFilter;
    renderer.setRenderTarget(b.renderTargetBright);
    renderer.clear();
    b.fsQuad.render(renderer);
    let input = b.renderTargetBright;
    for (let i = 0; i < b.nMips; i++) {
      const mat = b.separableBlurMaterials[i];
      b.fsQuad.material = mat;
      mat.uniforms.colorTexture.value = input.texture;
      mat.uniforms.direction.value = UnrealBloomPass.BlurDirectionX;
      renderer.setRenderTarget(b.renderTargetsHorizontal[i]);
      renderer.clear();
      b.fsQuad.render(renderer);
      mat.uniforms.colorTexture.value = b.renderTargetsHorizontal[i].texture;
      mat.uniforms.direction.value = UnrealBloomPass.BlurDirectionY;
      renderer.setRenderTarget(b.renderTargetsVertical[i]);
      renderer.clear();
      b.fsQuad.render(renderer);
      input = b.renderTargetsVertical[i];
    }
    b.fsQuad.material = b.compositeMaterial;
    b.compositeMaterial.uniforms.bloomStrength.value = b.strength;
    b.compositeMaterial.uniforms.bloomRadius.value = b.radius;
    b.compositeMaterial.uniforms.bloomTintColors.value = b.bloomTintColors;
    renderer.setRenderTarget(b.renderTargetsHorizontal[0]);
    renderer.clear();
    b.fsQuad.render(renderer);
    renderer.setClearColor(clear, alpha);
  }

  let enabled = true;
  const settings = { ao: true, bloom: true, shafts: true, grain: true };
  return {
    get enabled() { return enabled; },
    setEnabled(on) { enabled = on; },
    settings,
    // daylight 0..1: lamps bloom hard at night and only just glint by day.
    update(daylight) {
      bloom.strength = 0.95 - 0.6 * daylight;
    },
    // Sun position in screen uv, how strong the rays are (0 = off, skips the pass)
    // and their colour.
    setShafts(u, v, amount, color) {
      shaftMaterial.uniforms.sunUV.value.set(u, v);
      shaftAmt = amount;
      if (color) U.shaftColor.value.copy(color);
    },
    render() {
      const mask = camera.layers.mask;
      if (!enabled) {
        camera.layers.enable(SEE_THROUGH);
        renderer.setRenderTarget(null);
        renderer.render(scene, camera);
        camera.layers.mask = mask;
        return;
      }
      // Opaque world, then AO into it, then everything see-through on top. The
      // second draw reuses this frame's shadow maps instead of re-rendering them.
      camera.layers.set(0);
      renderer.setRenderTarget(sceneRT);
      renderer.render(scene, camera);
      if (settings.ao) renderAO();
      camera.layers.set(SEE_THROUGH);
      const autoClear = renderer.autoClear;
      const autoShadow = renderer.shadowMap.autoUpdate;
      renderer.autoClear = false;
      renderer.shadowMap.autoUpdate = false;
      renderer.setRenderTarget(sceneRT);
      renderer.render(scene, camera);
      renderer.autoClear = autoClear;
      renderer.shadowMap.autoUpdate = autoShadow;
      camera.layers.mask = mask;
      if (settings.bloom) renderBloom();
      const sAmt = settings.shafts ? shaftAmt : 0;
      U.shaftAmount.value = sAmt;
      U.grain.value = settings.grain ? 0.035 : 0;
      U.time.value = performance.now() / 1000;
      if (sAmt > 0.005) {
        renderer.setRenderTarget(shaftRT);
        shaftQuad.render(renderer);
      }
      U.bloomAmount.value = settings.bloom ? 1 : 0;
      U.exposure.value = renderer.toneMappingExposure;
      renderer.setRenderTarget(null);
      quad.render(renderer);
    },
    setSize(w, h) {
      const pr = renderer.getPixelRatio();
      const W = Math.round(w * pr);
      const H = Math.round(h * pr);
      sceneRT.setSize(W, H);
      ao.setSize(Math.max(1, Math.round(W / 2)), Math.max(1, Math.round(H / 2)));
      aoFadeRT.setSize(Math.max(1, Math.round(W / 2)), Math.max(1, Math.round(H / 2)));
      bloom.setSize(Math.round(W / 2), Math.round(H / 2));
      U.aspect.value = w / h;
      shaftMaterial.uniforms.aspect.value = w / h;
      shaftRT.setSize(Math.max(1, Math.round(W / 4)), Math.max(1, Math.round(H / 4)));
      U.texel.value.set(1 / W, 1 / H);
    },
    passes: { ao, bloom },
  };
}
