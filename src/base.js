import * as THREE from 'three';
import { terrainHeight } from './terrain.js';

// A habitat at each end of the route: dome, landing pad, mast and a solar farm.
// Deliberately readable from a long way off, since it is what you navigate towards.
const std = (color, metalness = 0, roughness = 0.6, extra = {}) =>
  new THREE.MeshStandardMaterial({ color, metalness, roughness, ...extra });

const M = {
  shell: std(0xd8d4c8, 0.2, 0.55),
  trim: std(0x3a3e46, 0.6, 0.4),
  dark: std(0x1a1c21, 0.4, 0.5),
  pad: std(0x55524c, 0.1, 0.9),
  solar: std(0x16294a, 0.45, 0.28),
  beacon: new THREE.MeshBasicMaterial({ color: 0x4fe0ff }),
  stripe: new THREE.MeshBasicMaterial({ color: 0xff9420 }),
};

// A SpriteMaterial with no map draws a hard square, so the beacon needs a soft disc.
const haloTexture = (() => {
  const c = document.createElement('canvas');
  c.width = c.height = 64;
  const ctx = c.getContext('2d');
  const grd = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
  grd.addColorStop(0, 'rgba(255,255,255,1)');
  grd.addColorStop(0.28, 'rgba(255,255,255,0.75)');
  grd.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = grd;
  ctx.fillRect(0, 0, 64, 64);
  return new THREE.CanvasTexture(c);
})();

export function buildBase(bx, bz) {
  const g = new THREE.Group();
  g.position.set(bx, terrainHeight(bx, bz), bz);

  // Landing apron
  const pad = new THREE.Mesh(new THREE.CylinderGeometry(26, 26, 0.35, 32), M.pad);
  pad.position.y = 0.1;
  g.add(pad);
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    const s = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.06, 5), M.stripe);
    s.position.set(Math.cos(a) * 20, 0.3, Math.sin(a) * 20);
    s.rotation.y = -a;
    g.add(s);
  }

  // Habitat domes
  for (const [dx, dz, r] of [[-12, -8, 8], [10, -12, 6], [4, 10, 7]]) {
    const dome = new THREE.Mesh(new THREE.SphereGeometry(r, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2), M.shell);
    dome.position.set(dx, 0.2, dz);
    g.add(dome);
    const ring = new THREE.Mesh(new THREE.TorusGeometry(r, 0.35, 8, 28), M.trim);
    ring.rotation.x = Math.PI / 2;
    ring.position.set(dx, 0.4, dz);
    g.add(ring);
  }
  // Connecting tunnels
  for (const [ax, az, bx2, bz2] of [[-12, -8, 4, 10], [10, -12, 4, 10]]) {
    const dx = bx2 - ax;
    const dz = bz2 - az;
    const len = Math.hypot(dx, dz);
    const tube = new THREE.Mesh(new THREE.CylinderGeometry(2.2, 2.2, len, 12), M.shell);
    tube.rotation.z = Math.PI / 2;
    tube.rotation.y = -Math.atan2(dz, dx);
    tube.position.set(ax + dx / 2, 2.4, az + dz / 2);
    g.add(tube);
  }

  // Solar farm
  for (let i = 0; i < 6; i++) {
    const p = new THREE.Mesh(new THREE.BoxGeometry(9, 0.2, 4.4), M.solar);
    p.position.set(-30, 3.2, -18 + i * 7.5);
    p.rotation.x = -0.32;
    g.add(p);
    // Object3D.add() returns the parent, so the post is positioned before adding.
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, 3.2, 8), M.trim);
    post.position.set(-30, 1.6, -18 + i * 7.5);
    g.add(post);
  }

  // Comms mast with a beacon that is visible from far away
  const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.8, 34, 10), M.trim);
  mast.position.set(18, 17, 6);
  g.add(mast);
  const beacon = new THREE.Mesh(new THREE.SphereGeometry(1.8, 12, 10), M.beacon);
  beacon.position.set(18, 35, 6);
  g.add(beacon);

  // A navigation beacon has to punch through the haze, so the column and the marker
  // both ignore fog. The column reads up close; the marker keeps a constant size on
  // screen, so the base stays findable from any distance.
  const beamGeo = new THREE.CylinderGeometry(2.6, 0.9, 150, 14, 1, true);
  const beamMat = new THREE.MeshBasicMaterial({
    color: 0x63e6ff, transparent: true, opacity: 0.16, side: THREE.DoubleSide,
    depthWrite: false, blending: THREE.AdditiveBlending, fog: false,
  });
  const beam = new THREE.Mesh(beamGeo, beamMat);
  beam.position.set(18, 110, 6);
  beam.renderOrder = 2;
  g.add(beam);

  const halo = new THREE.Sprite(new THREE.SpriteMaterial({
    map: haloTexture, color: 0x8df0ff, transparent: true, opacity: 0.85, depthWrite: false,
    blending: THREE.AdditiveBlending, fog: false, sizeAttenuation: false,
  }));
  halo.position.set(18, 36, 6);
  halo.scale.set(0.06, 0.06, 1);
  halo.renderOrder = 3;
  g.add(halo);
  const dish = new THREE.Mesh(new THREE.CylinderGeometry(5, 5, 0.4, 6), M.shell);
  dish.position.set(18, 30, 6);
  dish.rotation.set(-0.5, 0, 0.3);
  g.add(dish);

  g.traverse((o) => {
    if (o.isMesh && o.material !== M.beacon && o.material !== M.stripe && o.material !== beamMat) {
      o.castShadow = true;
      o.receiveShadow = true;
    }
  });
  return { group: g, beacon, beam, halo };
}
