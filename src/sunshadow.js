import * as THREE from 'three';
import { CSM } from 'three/addons/csm/CSM.js';

// Cascaded sun shadows. One 4096 map had to cover ±250 m around the rover: ~12 cm a
// texel up close (soft, blocky rock shadows) and nothing at all past it. Three
// cascades split the view instead — a tight one around the rover, a middle one, and a
// wide one out to the fog — so shadows are crisp underfoot and still there on the
// far dunes, and the terrain itself can finally throw long hill shadows at dusk.
//
// CSM draws the sun as one light per cascade and patches every lit material to pick
// the right one per pixel. A lit material it has not patched would add all three
// lights together and glow, so `adopt` walks the scene and patches whatever is new
// (streamed tiles, pickups, the base), chaining any shader hook a material already
// has instead of replacing it.
export function createSunShadows(scene, camera, sun, { far = 900 } = {}) {
  const csm = new CSM({
    camera,
    parent: scene,
    cascades: 3,
    maxFar: far,
    mode: 'practical',
    shadowMapSize: 2048,
    lightDirection: new THREE.Vector3(0, -1, 0),
    lightIntensity: 0,
    lightNear: 1,
    lightFar: 3000,
    lightMargin: 400,
  });
  csm.fade = true;
  for (const l of csm.lights) {
    l.shadow.bias = -0.0003;
    l.shadow.normalBias = 0.05;
  }
  // Re-rendering every cascade every frame was the single biggest GPU cost in the
  // game (~9 ms). Only the near one holds the rover and anything fast; the middle one
  // is redrawn every 2nd frame and the far one (hills out to the fog) every 3rd. A
  // skipped cascade keeps its own shadow matrix from when it was drawn, so its
  // shadows stay put on the ground — only something moving inside it lags a frame.
  const EVERY = [1, 2, 3];
  csm.lights.forEach((l, i) => { if (EVERY[i] > 1) l.shadow.autoUpdate = false; });
  // `sun` stays the source of truth for colour, strength and direction (the day/night
  // code already drives it); it just no longer lights anything itself.
  sun.castShadow = false;
  sun.visible = false;

  const seen = new WeakSet();
  const LIT = (m) => m && (m.isMeshStandardMaterial || m.isMeshLambertMaterial || m.isMeshPhongMaterial);
  function patch(m) {
    if (seen.has(m)) return;
    seen.add(m);
    if (!LIT(m)) return;
    const prev = m.onBeforeCompile;
    csm.setupMaterial(m);
    const mine = m.onBeforeCompile;
    if (prev && prev !== THREE.Material.prototype.onBeforeCompile) {
      m.onBeforeCompile = function (shader, r) {
        prev.call(this, shader, r);
        mine.call(this, shader, r);
      };
    }
    m.needsUpdate = true;
  }
  function adopt(root = scene) {
    root.traverse((o) => {
      const m = o.material;
      if (!m) return;
      if (Array.isArray(m)) m.forEach(patch);
      else patch(m);
    });
  }
  adopt();

  const dir = new THREE.Vector3();
  let frame = 0;
  return {
    csm,
    adopt,
    update() {
      // Light travels from the sun toward the ground. After sunset the same light
      // stands in for the moon (see LOOKS in main.js), but it was still placed where
      // the sun is — under the horizon — so "moonlight" shone up through the ground:
      // the terrain got none of it and the rover was lit from underneath. Mirroring
      // it above the horizon makes it the moon it was meant to be, with long, faint
      // moon shadows. At the horizon the two agree, so dusk has no jump.
      dir.copy(sun.position).sub(sun.target.position).normalize().negate();
      dir.y = -Math.abs(dir.y);
      dir.normalize();
      csm.lightDirection.copy(dir);
      for (const l of csm.lights) {
        l.color.copy(sun.color);
        l.intensity = sun.intensity;
      }
      csm.update();
      frame++;
      csm.lights.forEach((l, i) => {
        if (EVERY[i] > 1 && (frame + i) % EVERY[i] === 0) l.shadow.needsUpdate = true;
      });
      if (frame % 30 === 0) adopt();
    },
    setSize() { csm.updateFrustums(); },
  };
}
