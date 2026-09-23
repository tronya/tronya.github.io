import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { terrainHeight, ROUTE_PTS, ROUTE_BOUNDS, BASES } from './terrain.js';

// A small, real 3D relief of the whole crossing, built once from the same height
// field the ground itself uses. Parked in the corner it just turns slowly on its
// own, like a display model; a tap opens it into a big, orbitable dialog (drag to
// rotate, wheel to zoom) where tapping the ground — a tap, not a drag — drops a
// waypoint there. Lit by a fixed lamp rather than the sol cycle, so it reads the
// same whether it's day or night outside.

const ELEV_STOPS = [
  [0.0, new THREE.Color(0x7c4228)],
  [0.35, new THREE.Color(0xa15c34)],
  [0.68, new THREE.Color(0xc99459)],
  [1.0, new THREE.Color(0xecd4a8)],
];
function elevColor(hi, out) {
  let i = 0;
  while (i < ELEV_STOPS.length - 2 && hi > ELEV_STOPS[i + 1][0]) i++;
  const [t0, c0] = ELEV_STOPS[i];
  const [t1, c1] = ELEV_STOPS[i + 1];
  const t = t1 > t0 ? Math.min(1, Math.max(0, (hi - t0) / (t1 - t0))) : 0;
  return out.copy(c0).lerp(c1, t);
}

// A flat arrow lying in the XZ plane, tip toward +Z — matches the game's own heading
// convention (yaw 0 faces +Z), so `marker.rotation.y = yaw` alone points it correctly.
function arrowGeometry(len, wid) {
  const geo = new THREE.BufferGeometry();
  const v = new Float32Array([0, 0, len, -wid, 0, -len * 0.6, wid, 0, -len * 0.6]);
  geo.setAttribute('position', new THREE.BufferAttribute(v, 3));
  geo.setIndex([0, 1, 2]);
  geo.computeVertexNormals();
  return geo;
}

// canvas: the WebGL view. overlay: a plain 2D canvas stacked exactly on top of it.
export function createMinimap3D(canvas, overlay, missionModules = []) {
  const PAD = 240;
  const x0 = ROUTE_BOUNDS.x0 - PAD;
  const x1 = ROUTE_BOUNDS.x1 + PAD;
  const z0 = ROUTE_BOUNDS.z0 - PAD;
  const z1 = ROUTE_BOUNDS.z1 + PAD;
  const spanX = x1 - x0;
  const spanZ = z1 - z0;
  const center = new THREE.Vector3(x0 + spanX / 2, 0, z0 + spanZ / 2);

  // Camera framing: how far out the camera has to orbit for the whole padded
  // crossing to fit inside its field of view from any angle. A plain circular orbit
  // at one fitted distance, rather than an ellipse tied to spanX/spanZ, frames the
  // same way from every angle by construction — the ellipse framed some turntable
  // angles fine and cropped others.
  const FOV = 42;
  const halfDiag = 0.5 * Math.hypot(spanX, spanZ);
  const orbitDist = (halfDiag / Math.tan(THREE.MathUtils.degToRad(FOV / 2))) * 1.2;
  const ORBIT_ELEV = THREE.MathUtils.degToRad(56);
  const markerUnit = orbitDist * 0.07;

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x120a06);

  // The relief mesh: one static grid over the whole crossing, roughly 45 m a cell —
  // coarser than the driving terrain, which is fine for an overview you can orbit.
  const cell = 45;
  const segX = Math.max(24, Math.round(spanX / cell));
  const segZ = Math.max(24, Math.round(spanZ / cell));
  const geo = new THREE.PlaneGeometry(spanX, spanZ, segX, segZ);
  geo.rotateX(-Math.PI / 2);
  geo.translate(center.x, 0, center.z);
  const pos = geo.attributes.position;
  let maxH = 1;
  const heights = new Float32Array(pos.count);
  for (let i = 0; i < pos.count; i++) {
    const h = terrainHeight(pos.getX(i), pos.getZ(i));
    heights[i] = h;
    if (h > maxH) maxH = h;
  }
  const col = new Float32Array(pos.count * 3);
  const cc = new THREE.Color();
  for (let i = 0; i < pos.count; i++) {
    pos.setY(i, heights[i]);
    // Most of the crossing sits low and only the mesas reach the top of the range;
    // a plain linear ramp buried the whole plain in the darkest stop. A gamma curve
    // gives the low ground a readable tone while peaks still stand out palest.
    elevColor(Math.pow(Math.max(0, heights[i]) / maxH, 0.5), cc);
    col[i * 3] = cc.r;
    col[i * 3 + 1] = cc.g;
    col[i * 3 + 2] = cc.b;
  }
  geo.computeVertexNormals();
  geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
  const mesh = new THREE.Mesh(geo, new THREE.MeshLambertMaterial({ vertexColors: true }));
  scene.add(mesh);

  // The road, as a tube standing clear of the terrain so it reads from any angle.
  const roadPts = ROUTE_PTS.filter((_, i) => i % 3 === 0).map(
    (p) => new THREE.Vector3(p.x, terrainHeight(p.x, p.z) + 3, p.z)
  );
  const curve = new THREE.CatmullRomCurve3(roadPts);
  const roadGeo = new THREE.TubeGeometry(curve, 240, 3.4, 5, false);
  scene.add(new THREE.Mesh(roadGeo, new THREE.MeshBasicMaterial({ color: 0xe8aa74 })));

  for (const b of BASES) {
    const m = new THREE.Mesh(
      new THREE.ConeGeometry(markerUnit * 0.22, markerUnit * 0.6, 4),
      new THREE.MeshBasicMaterial({ color: 0x4fe0ff })
    );
    m.position.set(b.x, terrainHeight(b.x, b.z) + markerUnit * 0.3, b.z);
    m.rotation.y = Math.PI / 4;
    scene.add(m);
  }

  // Mission modules: shown from the very start (no proximity reveal) so the player
  // can plan their own route; each hides once picked up, same as its in-world crate.
  const moduleMarkers = missionModules.map((m) => {
    const mesh = new THREE.Mesh(
      new THREE.OctahedronGeometry(markerUnit * 0.28),
      new THREE.MeshBasicMaterial({ color: m.color })
    );
    mesh.position.set(m.x, terrainHeight(m.x, m.z) + markerUnit * 0.5, m.z);
    scene.add(mesh);
    return { mesh, m };
  });

  const roverMarker = new THREE.Mesh(
    arrowGeometry(markerUnit * 0.5, markerUnit * 0.3),
    new THREE.MeshBasicMaterial({ color: 0x7ce68f, side: THREE.DoubleSide })
  );
  roverMarker.position.y = markerUnit * 0.2;
  scene.add(roverMarker);

  const sun = new THREE.DirectionalLight(0xfff3e0, 2.0);
  sun.position.set(-420, 720, 260);
  scene.add(sun, new THREE.AmbientLight(0x9a7a5c, 1.4));

  const camera = new THREE.PerspectiveCamera(FOV, 1, 20, 12000);
  camera.position.set(
    center.x,
    orbitDist * Math.sin(ORBIT_ELEV),
    center.z + orbitDist * Math.cos(ORBIT_ELEV)
  );

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));

  const octx = overlay.getContext('2d');
  let overlayDpr = 1;

  const controls = new OrbitControls(camera, canvas);
  controls.target.copy(center);
  controls.minDistance = 140;
  controls.maxDistance = orbitDist * 1.6;
  controls.maxPolarAngle = Math.PI / 2 - 0.02;
  controls.enableDamping = true;
  controls.dampingFactor = 0.12;
  controls.zoomSpeed = 0.7;
  controls.enabled = false; // off while parked small; the tap there opens the dialog instead
  controls.update();

  let big = false;
  let turnAngle = 0;
  let route = [];

  // A tap either opens the dialog (parked small) or, inside it, drops a waypoint —
  // a drag orbits instead. Distinguished by how far the pointer moved and how long
  // it was held between down and up.
  const ray = new THREE.Raycaster();
  const ndc = new THREE.Vector2();
  let downAt = null;
  let onAdd = null;
  let onTapSmall = null;
  canvas.addEventListener('pointerdown', (e) => {
    downAt = { x: e.clientX, y: e.clientY, t: performance.now() };
  });
  canvas.addEventListener('pointerup', (e) => {
    if (!downAt) return;
    const moved = Math.hypot(e.clientX - downAt.x, e.clientY - downAt.y);
    const held = performance.now() - downAt.t;
    downAt = null;
    if (moved > 6 || held > 450) return;
    if (!big) {
      if (onTapSmall) onTapSmall();
      return;
    }
    const r = canvas.getBoundingClientRect();
    ndc.x = ((e.clientX - r.left) / r.width) * 2 - 1;
    ndc.y = -((e.clientY - r.top) / r.height) * 2 + 1;
    ray.setFromCamera(ndc, camera);
    const hit = ray.intersectObject(mesh, false)[0];
    if (hit && onAdd) onAdd(hit.point.x, hit.point.z);
  });

  function setRoute(newRoute) {
    route = newRoute;
  }

  function resize() {
    const r = canvas.getBoundingClientRect();
    if (r.width < 2 || r.height < 2) return;
    camera.aspect = r.width / r.height;
    camera.updateProjectionMatrix();
    renderer.setSize(r.width, r.height, false);
    // The 2D overlay is sized in real device pixels too (drawn shapes stay crisp,
    // never blurry-stretched), then scaled back down to the same CSS box with a
    // transform on the drawing context — same trick <canvas> itself uses.
    overlayDpr = Math.min(window.devicePixelRatio, 1.5);
    overlay.width = r.width * overlayDpr;
    overlay.height = r.height * overlayDpr;
  }

  // Waypoint badges: drawn in plain 2D on the overlay, one call a frame. A 3D sprite
  // sized to look right needs recalibrating for the canvas' own pixel dimensions —
  // get that a little wrong and it either hides or balloons across the screen. A 2D
  // circle asked for at 15 px is 15 px, full stop, on the small panel or the big
  // dialog alike.
  const projTop = new THREE.Vector3();
  const projGround = new THREE.Vector3();
  function drawWaypoints() {
    const w = overlay.width;
    const h = overlay.height;
    octx.clearRect(0, 0, w, h);
    if (!route.length) return;
    const R = 13 * overlayDpr;
    octx.font = `bold ${12 * overlayDpr}px ui-monospace, monospace`;
    octx.textAlign = 'center';
    octx.textBaseline = 'middle';
    const toScreen = (v) => [((v.x + 1) / 2) * w, ((1 - v.y) / 2) * h];
    route.forEach((p, i) => {
      const groundY = terrainHeight(p.x, p.z);
      // The badge floats a fixed height above its exact spot; projecting both ends
      // and drawing the ground one as the needle's point is what makes it read as a
      // pin actually stuck into that spot, not a coin just floating over the map.
      projTop.set(p.x, groundY + markerUnit * 1.6, p.z).project(camera);
      projGround.set(p.x, groundY, p.z).project(camera);
      if (projTop.z > 1 || projTop.z < -1) return; // behind the camera
      const [x, y] = toScreen(projTop);
      const [gx, gy] = toScreen(projGround);
      if (x < -R * 3 || x > w + R * 3 || y < -R * 3 || y > h + R * 3) return;

      const color = i === 0 ? '#7ce68f' : '#4fe0ff';
      // Needle: tapers from a couple of pixels at the badge down to a sharp point
      // exactly on the ground, so the tip — not the badge — marks the real spot.
      const dx = gx - x;
      const dy = gy - y;
      const len = Math.hypot(dx, dy) || 1;
      const perp = { x: (-dy / len) * 2 * overlayDpr, y: (dx / len) * 2 * overlayDpr };
      octx.beginPath();
      octx.moveTo(x + perp.x, y + perp.y);
      octx.lineTo(x - perp.x, y - perp.y);
      octx.lineTo(gx, gy);
      octx.closePath();
      octx.fillStyle = color;
      octx.fill();
      octx.lineWidth = 1.4 * overlayDpr;
      octx.strokeStyle = 'rgba(13, 26, 34, 0.9)';
      octx.stroke();
      // A little dark tick right at the ground point, so the exact spot reads even
      // where the needle itself is foreshortened almost to nothing.
      octx.beginPath();
      octx.arc(gx, gy, 2.2 * overlayDpr, 0, Math.PI * 2);
      octx.fillStyle = 'rgba(13, 26, 34, 0.9)';
      octx.fill();

      octx.beginPath();
      octx.arc(x, y, R, 0, Math.PI * 2);
      octx.fillStyle = color;
      octx.fill();
      octx.lineWidth = 2.2 * overlayDpr;
      octx.strokeStyle = 'rgba(13, 26, 34, 0.9)';
      octx.stroke();
      octx.fillStyle = '#0d1a22';
      octx.fillText(String(i + 1), x, y + overlayDpr);
    });
  }

  // Parked small: turns like a display model on a turntable, camera position set
  // directly at a fixed distance from the target — a true circular orbit, so every
  // angle frames the crossing the same way. Opened big: an ordinary user-orbited
  // camera, driven by OrbitControls.
  function update(sim, dt) {
    if (big) {
      controls.update();
    } else {
      turnAngle += dt * 0.12;
      const flat = orbitDist * Math.cos(ORBIT_ELEV);
      camera.position.set(
        center.x + Math.sin(turnAngle) * flat,
        orbitDist * Math.sin(ORBIT_ELEV),
        center.z + Math.cos(turnAngle) * flat
      );
      camera.lookAt(center);
    }
    const y = terrainHeight(sim.pos.x, sim.pos.z) + markerUnit * 0.2;
    roverMarker.position.set(sim.pos.x, y, sim.pos.z);
    roverMarker.rotation.y = sim.yaw();
    for (const { mesh, m } of moduleMarkers) {
      mesh.visible = !m.collected;
      mesh.rotation.y += dt * 0.8;
    }
    renderer.render(scene, camera);
    drawWaypoints();
  }

  return {
    update,
    setRoute,
    resize,
    setBig(v) {
      big = v;
      controls.enabled = v;
    },
    setOnAdd(fn) {
      onAdd = fn;
    },
    setOnTapSmall(fn) {
      onTapSmall = fn;
    },
  };
}
