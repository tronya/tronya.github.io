import * as THREE from 'three';
import { ROUTE_PTS, surfaceHeight } from './terrain.js';
import { PLANET } from './planet.js';

// The Moon chapter: the wreck of Гермес-1, sitting off the route where it came down.
// One objective, no cargo and no shop — the whole level is the drive there in a rover
// that has none of the gear Марс taught you to rely on (upgrades.js forces stock
// hardware on the Moon, which is what makes this a flashback rather than a detour).

const ACTIVE = PLANET === 'moon';
const ARRIVE_R = 26;
const SITE_AT = 0.62; // how far along the route the wreck lies
const SITE_OFF = 150; // and how far off it

export function createFlashback() {
  const group = new THREE.Group();
  if (!ACTIVE) return { group, update: () => null, site: null };

  // Put it beside the route rather than at a fixed coordinate, so it always sits a
  // sensible drive from the start whatever the road does.
  const a = ROUTE_PTS[Math.floor(ROUTE_PTS.length * SITE_AT)];
  const b = ROUTE_PTS[Math.min(ROUTE_PTS.length - 1, Math.floor(ROUTE_PTS.length * SITE_AT) + 1)];
  const nx = -(b.z - a.z);
  const nz = b.x - a.x;
  const nl = Math.hypot(nx, nz) || 1;
  const site = { x: a.x + (nx / nl) * SITE_OFF, z: a.z + (nz / nl) * SITE_OFF };
  site.y = surfaceHeight(site.x, site.z);

  const hullMat = new THREE.MeshStandardMaterial({ color: 0x9a9a96, roughness: 0.85, metalness: 0.1 });
  const burntMat = new THREE.MeshStandardMaterial({ color: 0x2a2a2c, roughness: 1, metalness: 0 });

  // A broken-backed lander: the main drum tipped over, a torn-off panel, scattered
  // debris. Low-poly on purpose, to sit with everything else in this world.
  const drum = new THREE.Mesh(new THREE.CylinderGeometry(3.1, 3.4, 7.4, 12), hullMat);
  drum.rotation.set(Math.PI / 2, 0, 0.32);
  drum.position.set(site.x, site.y + 2.4, site.z);
  drum.castShadow = true;
  drum.receiveShadow = true;
  group.add(drum);

  const panel = new THREE.Mesh(new THREE.BoxGeometry(9, 0.25, 4.2), burntMat);
  panel.position.set(site.x + 7.5, site.y + 0.5, site.z - 4.2);
  panel.rotation.set(0.1, 0.7, 0.24);
  panel.castShadow = true;
  group.add(panel);

  for (let i = 0; i < 9; i++) {
    const a2 = (i / 9) * Math.PI * 2 + 0.7;
    const d = 6 + (i % 4) * 3.5;
    const s = 0.5 + (i % 3) * 0.45;
    const chunk = new THREE.Mesh(new THREE.BoxGeometry(s, s * 0.6, s * 1.3), i % 2 ? burntMat : hullMat);
    const cxp = site.x + Math.cos(a2) * d;
    const czp = site.z + Math.sin(a2) * d;
    chunk.position.set(cxp, surfaceHeight(cxp, czp) + s * 0.3, czp);
    chunk.rotation.set(i * 0.7, i * 1.3, i * 0.4);
    chunk.castShadow = true;
    group.add(chunk);
  }

  // A beacon still running on the wreck's own reserve, so you can find it in the dark.
  const beacon = new THREE.Mesh(
    new THREE.SphereGeometry(0.42, 10, 8),
    new THREE.MeshBasicMaterial({ color: 0xff6a3a, fog: false })
  );
  beacon.position.set(site.x, site.y + 6.2, site.z);
  group.add(beacon);
  const beaconLight = new THREE.PointLight(0xff6a3a, 8, 70, 2);
  beaconLight.position.copy(beacon.position);
  group.add(beaconLight);

  let arrived = false;
  let t = 0;

  function update(dt, x, z) {
    t += dt;
    const pulse = 0.55 + 0.45 * Math.sin(t * 2.6);
    beacon.material.color.setRGB(1, 0.26 + 0.2 * pulse, 0.12 + 0.12 * pulse);
    beaconLight.intensity = 4 + 7 * pulse;
    if (arrived) return null;
    if (Math.hypot(x - site.x, z - site.z) < ARRIVE_R) {
      arrived = true;
      return { arrived: true };
    }
    return null;
  }

  return { group, update, site };
}
