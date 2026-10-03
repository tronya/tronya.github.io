import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { lamp } from './glow.js';
import { PLANET } from './planet.js';
import { groundHeight, getSettlement, setMovingSolids, ROUTE_PTS } from './terrain.js';

// Life: people walking the streets of «Обрій», the town's own rovers doing their
// rounds, and a couple of haulers running the road between the bases. None of it is
// simulated physically — people and rovers follow their paths — but the rovers are
// solid to yours (terrain.setMovingSolids) and everyone gives way to you: people
// step aside, rovers stop and wait.

const tmpM = new THREE.Matrix4();
const tmpQ = new THREE.Quaternion();
const tmpE = new THREE.Euler();
const tmpP = new THREE.Vector3();
const tmpS = new THREE.Vector3(1, 1, 1);
const UP = new THREE.Vector3(0, 1, 0);

// The townsfolk are the colony's little utility robots, after the user's pick: one
// rounded barrel of a body that is head and torso at once, a big dark screen for a
// face with two small eyes, a camera "ear" on one side, a white pack with an antenna
// on the back, plump stubby arms and chunky red-orange boots. Warm shell colours,
// each its own.
const SHELLS = [0xe89a3c, 0xf0b060, 0xe07a30, 0xe8c890, 0xd8a050, 0xf2d2a2, 0xe48848];
const EYES = [0xfff2d8, 0xffffff, 0xd8f4ff, 0xffe6b0];

// A box with rounded edges: every vertex of a finely divided box is pulled onto a
// sphere of radius r around the nearest point of the box shrunk by r.
function roundedBox(w, h, d, r, seg = 6) {
  const g = new THREE.BoxGeometry(w, h, d, seg, seg, seg);
  const p = g.attributes.position;
  const v = new THREE.Vector3();
  const inner = new THREE.Vector3();
  for (let i = 0; i < p.count; i++) {
    v.fromBufferAttribute(p, i);
    inner.set(
      Math.max(-w / 2 + r, Math.min(w / 2 - r, v.x)),
      Math.max(-h / 2 + r, Math.min(h / 2 - r, v.y)),
      Math.max(-d / 2 + r, Math.min(d / 2 - r, v.z))
    );
    v.sub(inner).normalize().multiplyScalar(r).add(inner);
    p.setXYZ(i, v.x, v.y, v.z);
  }
  g.computeVertexNormals();
  return g;
}

// A thin plate with rounded corners (a screen, a bezel): a rounded rectangle
// extruded by `d`, front face at z = +d/2. roundedBox can't do this — its corner
// radius is shared by all three axes, so a radius past half the depth breaks it.
function roundedPlate(w, h, d, r) {
  const sh = new THREE.Shape();
  const x0 = -w / 2;
  const y0 = -h / 2;
  sh.moveTo(x0 + r, y0);
  sh.lineTo(x0 + w - r, y0);
  sh.quadraticCurveTo(x0 + w, y0, x0 + w, y0 + r);
  sh.lineTo(x0 + w, y0 + h - r);
  sh.quadraticCurveTo(x0 + w, y0 + h, x0 + w - r, y0 + h);
  sh.lineTo(x0 + r, y0 + h);
  sh.quadraticCurveTo(x0, y0 + h, x0, y0 + h - r);
  sh.lineTo(x0, y0 + r);
  sh.quadraticCurveTo(x0, y0, x0 + r, y0);
  const g = new THREE.ExtrudeGeometry(sh, { depth: d, bevelEnabled: true, bevelThickness: 0.01, bevelSize: 0.01, bevelSegments: 2, curveSegments: 6 });
  g.translate(0, 0, -d / 2);
  g.deleteAttribute('uv');
  g.setAttribute('uv', new THREE.Float32BufferAttribute(new Float32Array(g.attributes.position.count * 2), 2));
  return g;
}

// --- looks ------------------------------------------------------------------------
// Each look builds its instanced parts for n people, colours person i, and poses
// person i every frame through `place(part, index, x, y, z, rx, ry, sy)` — offsets
// in the person's own frame, pitch and yaw about that pivot, a vertical squash.
const mergeAll = (list) => mergeGeometries(list.map((g) => (g.index ? g.toNonIndexed() : g)), false);
const stdMat = (color, r = 0.55, m = 0.15) => new THREE.MeshStandardMaterial({ color, roughness: r, metalness: m });
const DARK = stdMat(0x24272c, 0.45, 0.5);

// The colony's utility robot (reference 2): one rounded barrel that is head and
// body at once, a dark screen face, an ear camera, a white pack with an antenna,
// plump arms, chunky red-orange boots.
function robotLook(mk) {
  const geo = {
    body: roundedBox(0.72, 0.8, 0.62, 0.17).translate(0, 0.84, 0),
    bezel: roundedPlate(0.58, 0.44, 0.04, 0.11).translate(0, 0.98, 0.31),
    screen: roundedPlate(0.5, 0.36, 0.04, 0.09).translate(0, 0.98, 0.33),
    eye: new THREE.SphereGeometry(0.035, 12, 10).scale(1, 1.1, 0.6),
    ear: mergeAll([
      new THREE.CylinderGeometry(0.115, 0.12, 0.12, 18).rotateZ(Math.PI / 2).translate(-0.39, 0.96, 0.02),
      new THREE.CylinderGeometry(0.07, 0.07, 0.04, 16).rotateZ(Math.PI / 2).translate(-0.46, 0.96, 0.02),
    ]),
    lens: new THREE.CylinderGeometry(0.05, 0.05, 0.02, 14).rotateZ(Math.PI / 2).translate(-0.485, 0.96, 0.02),
    pack: mergeAll([
      roundedBox(0.36, 0.5, 0.2, 0.06, 3).translate(0.04, 0.86, -0.38),
      new THREE.CylinderGeometry(0.011, 0.011, 0.75, 6).translate(-0.12, 1.32, -0.4),
    ]),
    stripe: new THREE.BoxGeometry(0.37, 0.06, 0.21).translate(0.04, 0.7, -0.38),
    panel: mergeAll([
      new THREE.BoxGeometry(0.2, 0.08, 0.03).translate(0.12, 0.66, 0.31),
      new THREE.BoxGeometry(0.08, 0.04, 0.03).translate(-0.12, 0.7, 0.31),
      new THREE.BoxGeometry(0.08, 0.04, 0.03).translate(-0.12, 0.64, 0.31),
    ]),
    led: new THREE.SphereGeometry(0.018, 8, 6).translate(0.2, 0.68, 0.33),
    arm: new THREE.SphereGeometry(0.13, 14, 10).scale(1, 1.55, 1).translate(0, -0.17, 0),
    hand: new THREE.SphereGeometry(0.06, 10, 8).scale(1.2, 1, 1).translate(0, -0.38, 0.03),
    leg: new THREE.CylinderGeometry(0.06, 0.06, 0.12, 8).translate(0, -0.06, 0),
    boot: roundedBox(0.24, 0.2, 0.3, 0.07, 4).translate(0, -0.2, 0.02),
  };
  const shell = stdMat(0xffffff, 0.42, 0.1); // a little glossy, like moulded plastic
  const parts = {
    body: mk(geo.body, shell),
    bezel: mk(geo.bezel, shell),
    screen: mk(geo.screen, stdMat(0x120d0b, 0.08, 0.5)),
    eye: mk(geo.eye, new THREE.MeshBasicMaterial({ color: lamp(0xffffff, 1.4) }), 2),
    ear: mk(geo.ear, shell),
    lens: mk(geo.lens, DARK),
    pack: mk(geo.pack, stdMat(0xe8e6e0, 0.5, 0.1)),
    stripe: mk(geo.stripe, stdMat(0xd8402a, 0.5, 0)),
    panel: mk(geo.panel, stdMat(0x9aa0a6, 0.4, 0.7)),
    led: mk(geo.led, new THREE.MeshBasicMaterial({ color: lamp(0xff4a2a, 3) })),
    arm: mk(geo.arm, shell, 2),
    hand: mk(geo.hand, DARK, 2),
    leg: mk(geo.leg, DARK, 2),
    boot: mk(geo.boot, stdMat(0xffffff, 0.5, 0.1), 2),
  };
  const col = new THREE.Color();
  return {
    parts,
    color(i) {
      col.setHex(SHELLS[i % SHELLS.length]);
      for (const k of ['body', 'bezel', 'ear']) parts[k].setColorAt(i, col);
      parts.arm.setColorAt(i * 2, col);
      parts.arm.setColorAt(i * 2 + 1, col);
      // Boots in a deeper red-orange of the same shell.
      const boot = col.clone().lerp(new THREE.Color(0xc8401e), 0.55);
      parts.boot.setColorAt(i * 2, boot);
      parts.boot.setColorAt(i * 2 + 1, boot);
      col.setHex(EYES[(i * 3) % EYES.length]);
      parts.eye.setColorAt(i * 2, col);
      parts.eye.setColorAt(i * 2 + 1, col);
    },
    // st: { swing, bob, rock, open, wave } — a waddle with a bounce.
    pose(place, i, st) {
      const { swing, bob, rock } = st;
      for (const k of ['body', 'bezel', 'screen', 'ear', 'lens', 'pack', 'stripe', 'panel', 'led']) place(parts[k], i, 0, bob, 0, 0, rock * 0.3);
      for (const sd of [-1, 1]) place(parts.eye, i * 2 + (sd > 0 ? 1 : 0), sd * 0.085, 1.0 + bob, 0.36, 0, 0, st.open);
      place(parts.leg, i * 2, -0.17, 0.36 + bob, 0, swing);
      place(parts.leg, i * 2 + 1, 0.17, 0.36 + bob, 0, -swing);
      place(parts.boot, i * 2, -0.17, 0.36 + bob, 0, swing);
      place(parts.boot, i * 2 + 1, 0.17, 0.36 + bob, 0, -swing);
      place(parts.arm, i * 2, -0.44, 0.86 + bob, 0, -swing * 0.7);
      place(parts.hand, i * 2, -0.44, 0.86 + bob, 0, -swing * 0.7);
      place(parts.arm, i * 2 + 1, 0.44, 0.92 + bob, 0, swing * 0.7 + st.wave);
      place(parts.hand, i * 2 + 1, 0.44, 0.92 + bob, 0, swing * 0.7 + st.wave);
    },
  };
}

// The chibi colonist (the last reference): a big white hood-helmet with a peak, a
// black visor and two orange-tipped antennas, a puffy jacket in a bright colour under
// a black harness with an orange zip, black trousers, chunky boots.
const JACKETS = [0xb8e030, 0xf08a30, 0x40c0d8, 0xe8c030, 0xd84a3a, 0x9a7ce8];
function chibiLook(mk) {
  const geo = {
    hood: mergeAll([
      roundedBox(0.74, 0.6, 0.66, 0.16).translate(0, 1.32, -0.04),
      roundedBox(0.78, 0.1, 0.26, 0.04, 3).rotateX(0.18).translate(0, 1.6, 0.24), // the peak
      roundedBox(0.18, 0.26, 0.3, 0.05, 3).translate(-0.4, 1.24, -0.02), // side module
    ]),
    visor: new THREE.SphereGeometry(0.27, 20, 14).scale(1, 0.95, 0.75).translate(0, 1.28, 0.2),
    tips: mergeAll([
      new THREE.CylinderGeometry(0.02, 0.02, 0.42, 6).rotateZ(0.35).translate(0.27, 1.78, -0.1),
      new THREE.CylinderGeometry(0.02, 0.02, 0.42, 6).rotateZ(-0.35).translate(-0.27, 1.78, -0.1),
    ]),
    tipEnds: mergeAll([
      new THREE.CylinderGeometry(0.035, 0.035, 0.14, 8).rotateZ(0.35).translate(0.35, 1.98, -0.1),
      new THREE.CylinderGeometry(0.035, 0.035, 0.14, 8).rotateZ(-0.35).translate(-0.35, 1.98, -0.1),
    ]),
    jacket: roundedBox(0.58, 0.5, 0.44, 0.18).translate(0, 0.74, 0),
    harness: mergeAll([
      new THREE.BoxGeometry(0.6, 0.09, 0.46).translate(0, 0.68, 0),
      new THREE.BoxGeometry(0.08, 0.46, 0.06).translate(-0.12, 0.8, 0.22),
      new THREE.BoxGeometry(0.08, 0.46, 0.06).translate(0.12, 0.8, 0.22),
      new THREE.BoxGeometry(0.16, 0.14, 0.07).translate(0.2, 0.62, 0.22),
    ]),
    zip: new THREE.BoxGeometry(0.03, 0.42, 0.03).translate(0, 0.76, 0.225),
    pack: roundedBox(0.4, 0.42, 0.18, 0.06, 3).translate(0, 0.82, -0.29),
    pants: roundedBox(0.46, 0.18, 0.36, 0.07, 3).translate(0, 0.44, 0),
    arm: new THREE.SphereGeometry(0.12, 14, 10).scale(1, 1.6, 1).translate(0, -0.16, 0),
    glove: roundedBox(0.13, 0.13, 0.13, 0.04, 3).translate(0, -0.36, 0.02),
    leg: new THREE.CylinderGeometry(0.075, 0.07, 0.16, 8).translate(0, -0.08, 0),
    boot: roundedBox(0.2, 0.17, 0.3, 0.06, 4).translate(0, -0.23, 0.03),
    sole: new THREE.BoxGeometry(0.21, 0.05, 0.32).translate(0, -0.31, 0.03),
  };
  const parts = {
    hood: mk(geo.hood, stdMat(0xf0f0ec, 0.45, 0.1)),
    visor: mk(geo.visor, stdMat(0x07080a, 0.06, 0.7)),
    tips: mk(geo.tips, DARK),
    tipEnds: mk(geo.tipEnds, stdMat(0xf08a20, 0.5, 0)),
    jacket: mk(geo.jacket, stdMat(0xffffff, 0.75, 0)),
    harness: mk(geo.harness, DARK),
    zip: mk(geo.zip, stdMat(0xf08a20, 0.5, 0)),
    pack: mk(geo.pack, stdMat(0x5a5e66, 0.5, 0.4)),
    pants: mk(geo.pants, stdMat(0x1a1c20, 0.8, 0)),
    arm: mk(geo.arm, stdMat(0xffffff, 0.75, 0), 2),
    glove: mk(geo.glove, DARK, 2),
    leg: mk(geo.leg, stdMat(0x1a1c20, 0.8, 0), 2),
    boot: mk(geo.boot, stdMat(0xffffff, 0.6, 0), 2),
    sole: mk(geo.sole, DARK, 2),
  };
  const col = new THREE.Color();
  return {
    parts,
    color(i) {
      col.setHex(JACKETS[i % JACKETS.length]);
      parts.jacket.setColorAt(i, col);
      for (const k of ['arm', 'boot']) { parts[k].setColorAt(i * 2, col); parts[k].setColorAt(i * 2 + 1, col); }
    },
    // Quick little steps; the big helmet nods with them.
    pose(place, i, st) {
      const { swing, bob, rock } = st;
      for (const k of ['jacket', 'harness', 'zip', 'pack', 'pants']) place(parts[k], i, 0, bob, 0, 0, rock * 0.3);
      for (const k of ['hood', 'visor', 'tips', 'tipEnds']) place(parts[k], i, 0, bob, 0, Math.abs(swing) * 0.04, rock * 0.3);
      place(parts.leg, i * 2, -0.13, 0.36 + bob, 0, swing);
      place(parts.leg, i * 2 + 1, 0.13, 0.36 + bob, 0, -swing);
      place(parts.boot, i * 2, -0.13, 0.36 + bob, 0, swing);
      place(parts.boot, i * 2 + 1, 0.13, 0.36 + bob, 0, -swing);
      place(parts.sole, i * 2, -0.13, 0.36 + bob, 0, swing);
      place(parts.sole, i * 2 + 1, 0.13, 0.36 + bob, 0, -swing);
      place(parts.arm, i * 2, -0.36, 0.9 + bob, 0, -swing * 0.8);
      place(parts.glove, i * 2, -0.36, 0.9 + bob, 0, -swing * 0.8);
      place(parts.arm, i * 2 + 1, 0.36, 0.9 + bob, 0, swing * 0.8 + st.wave);
      place(parts.glove, i * 2 + 1, 0.36, 0.9 + bob, 0, swing * 0.8 + st.wave);
    },
  };
}

// --- people ---------------------------------------------------------------------
// The behaviour is shared: wander the sidewalks between doors and the plaza, step
// aside from the rover, turn to watch it and wave. `makeLook` decides the body.
function createWalkers(town, count, makeLook, seed0) {
  const L = town.layout;
  const toWorld = (x, z) => ({ x: town.x + x * town.cos + z * town.sin, z: town.z - x * town.sin + z * town.cos });
  // Sidewalk route from a to b (town frame): out to the nearest sidewalk, along it,
  // across the plaza if the two lie on different streets, then in to b.
  const side = (p) => (Math.abs(p.x) <= Math.abs(p.z) ? { x: Math.sign(p.x || 1) * 6.5, z: p.z } : { x: p.x, z: Math.sign(p.z || 1) * 6.5 });
  function route(a, b) {
    const sa = side(a);
    const sb = side(b);
    const pts = [sa];
    const aMain = Math.abs(a.x) <= Math.abs(a.z);
    const bMain = Math.abs(b.x) <= Math.abs(b.z);
    // Different streets: turn the corner by the plaza.
    if (aMain !== bMain) pts.push(aMain ? { x: sa.x, z: sb.z } : { x: sb.x, z: sa.z });
    pts.push(sb, b);
    return pts;
  }
  const places = [...L.doors, ...L.nodes];

  const n = count;
  const mk = (g, mat, k = 1) => {
    const m = new THREE.InstancedMesh(g, mat, n * k);
    m.castShadow = !mat.isMeshBasicMaterial;
    m.frustumCulled = false;
    return m;
  };
  const look = makeLook(mk);
  const parts = look.parts;
  const group = new THREE.Group();
  for (const m of Object.values(parts)) group.add(m);

  let seed = seed0;
  const rand = () => {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed / 4294967296;
  };
  const people = [];
  for (let i = 0; i < n; i++) {
    const at = places[Math.floor(rand() * places.length)];
    people.push({
      x: at.x, z: at.z, path: [], wait: rand() * 4, phase: rand() * 6, speed: 0.9 + rand() * 0.5,
      yaw: 0, shy: 0, blink: rand() * 4, wave: 0, scale: 0.92 + rand() * 0.2,
      // Night: most go home to their own door at their own hour and stay in till
      // morning; about one in four is on the night shift and keeps walking.
      home: L.doors[Math.floor(rand() * L.doors.length)], bed: 0.35 + rand() * 0.5,
      owl: rand() < 0.25, inside: false, homing: false,
    });
    look.color(i);
  }

  const anchor = { x: 0, y: 0, z: 0, yaw: 0, scale: 1 };
  // Place one part for the person in `anchor`.
  function place(m, idx, lx, ly, lz, rx = 0, ry = 0, sy = 1) {
    const w = anchor;
    const c = Math.cos(w.yaw);
    const s = Math.sin(w.yaw);
    const k = w.scale;
    tmpP.set(w.x + (lx * c + lz * s) * k, w.y + ly * k, w.z + (-lx * s + lz * c) * k);
    tmpQ.setFromEuler(tmpE.set(rx, w.yaw + ry, 0, 'YXZ'));
    tmpS.set(k, k * sy, k);
    tmpM.compose(tmpP, tmpQ, tmpS);
    m.setMatrixAt(idx, tmpM);
  }
  const st = { swing: 0, bob: 0, rock: 0, open: 1, wave: 0 };

  return {
    group,
    update(dt, t, rover, night = 0) {
      for (let i = 0; i < n; i++) {
        const p = people[i];
        let moving = false;
        const sleepy = !p.owl && night > p.bed;
        if (p.inside) {
          if (night < p.bed - 0.25) {
            // Morning: out of the door, a moment's pause, then about the day.
            p.inside = false;
            p.x = p.home.x;
            p.z = p.home.z;
            p.path = [];
            p.wait = 0.5 + rand() * 3;
          } else {
            anchor.x = 0;
            anchor.y = -1e4;
            anchor.z = 0;
            look.pose(place, i, st);
            continue;
          }
        } else if (sleepy && !p.homing) {
          p.homing = true;
          p.path = route(p, p.home);
          p.wait = 0;
        } else if (!sleepy) {
          p.homing = false;
        }
        if (p.homing && !p.path.length && p.shy <= 0) {
          p.inside = true;
          p.homing = false;
          continue;
        }
        // Give way: a rover close by sends people off to the side of it.
        const w0 = toWorld(p.x, p.z);
        const dx = w0.x - rover.x;
        const dz = w0.z - rover.z;
        const d = Math.hypot(dx, dz);
        // Bearing to the rover relative to where this person faces.
        const toRover = Math.atan2(-dx, -dz) - (p.yaw + town.yaw);
        if (d < 7 && d > 0.01) {
          const bx = (dx * town.cos - dz * town.sin) / d;
          const bz = (dx * town.sin + dz * town.cos) / d;
          p.x += bx * 2.2 * dt;
          p.z += bz * 2.2 * dt;
          p.yaw = Math.atan2(bx, bz);
          p.shy = 2.5;
          moving = true;
        } else if (p.shy > 0) {
          p.shy -= dt; // stop and look at the rover for a moment, and wave
          p.wave = Math.min(1, p.wave + dt * 3);
        } else if (p.wait > 0) {
          p.wait -= dt;
          if (p.wait <= 0 && !p.path.length) p.path = route(p, places[Math.floor(rand() * places.length)]);
        } else if (p.path.length) {
          const tgt = p.path[0];
          const ex = tgt.x - p.x;
          const ez = tgt.z - p.z;
          const dd = Math.hypot(ex, ez);
          if (dd < 0.3) {
            p.path.shift();
            if (!p.path.length) p.wait = 2 + rand() * 7;
          } else {
            const step = Math.min(dd, p.speed * dt);
            p.x += (ex / dd) * step;
            p.z += (ez / dd) * step;
            p.yaw = Math.atan2(ex, ez);
            moving = true;
          }
        } else {
          p.wait = 1 + rand() * 4;
        }
        if (p.shy <= 0) p.wave = Math.max(0, p.wave - dt * 2);
        if (moving) p.phase += dt * p.speed * 6;
        // Standing still with the rover near, it turns its whole body to watch.
        if (!moving && d < 25) p.yaw += Math.atan2(Math.sin(toRover), Math.cos(toRover)) * Math.min(1, dt * 3);
        p.blink -= dt;
        if (p.blink < -0.12) p.blink = 2 + rand() * 4;

        const w = toWorld(p.x, p.z);
        anchor.x = w.x;
        anchor.z = w.z;
        anchor.y = groundHeight(w.x, w.z);
        anchor.yaw = p.yaw + town.yaw; // town frame -> world
        anchor.scale = p.scale;
        st.swing = moving ? Math.sin(p.phase) * 0.5 : 0;
        st.bob = moving ? Math.abs(Math.sin(p.phase)) * 0.05 : Math.sin(t * 2 + i) * 0.006;
        st.rock = moving ? Math.sin(p.phase) * 0.05 : 0;
        st.open = p.blink < 0 ? 0.1 : 1;
        st.wave = p.wave * (-2.5 + Math.sin(t * 9) * 0.35);
        look.pose(place, i, st);
      }
      for (const m of Object.values(parts)) {
        m.instanceMatrix.needsUpdate = true;
        if (m.instanceColor) m.instanceColor.needsUpdate = true;
      }
    },
  };
}

// --- rovers -----------------------------------------------------------------------
// A plain six-wheeled utility rover, merged into one mesh per material.
function roverMesh(color) {
  const std = (c, m = 0.3, r = 0.55) => new THREE.MeshStandardMaterial({ color: c, metalness: m, roughness: r });
  const body = std(color);
  const dark = std(0x22252a, 0.5, 0.5);
  const parts = [];
  const add = (geo, mat, x, y, z, rx = 0, ry = 0, rz = 0) => {
    const m = new THREE.Mesh(geo, mat);
    m.position.set(x, y, z);
    m.rotation.set(rx, ry, rz);
    m.updateMatrix();
    parts.push({ geo: geo.clone().applyMatrix4(m.matrix), mat });
  };
  add(new THREE.BoxGeometry(2.4, 1.0, 5.2), body, 0, 1.25, 0);
  add(new THREE.BoxGeometry(2.2, 1.0, 1.8), body, 0, 2.2, 1.4);
  add(new THREE.BoxGeometry(2.0, 0.6, 0.06), std(0x1b2a3a, 0.5, 0.1), 0, 2.3, 2.31);
  add(new THREE.BoxGeometry(2.4, 0.3, 3.0), dark, 0, 1.85, -1.0);
  add(new THREE.BoxGeometry(1.8, 0.7, 2.4), std(0x8a6a40, 0, 0.8), 0, 2.2, -1.2);
  for (const x of [-1.25, 1.25]) for (const z of [-1.8, 0, 1.8]) {
    add(new THREE.CylinderGeometry(0.62, 0.62, 0.5, 14), dark, x, 0.62, z, 0, 0, Math.PI / 2);
  }
  const lampMat = new THREE.MeshBasicMaterial({ color: lamp(0xfff2d6, 4) });
  const tailMat = new THREE.MeshBasicMaterial({ color: lamp(0xff3a1c, 3) });
  const beacon = new THREE.MeshBasicMaterial({ color: lamp(0xff9420, 4) });
  for (const x of [-0.8, 0.8]) {
    add(new THREE.BoxGeometry(0.4, 0.2, 0.06), lampMat, x, 1.45, 2.62);
    add(new THREE.BoxGeometry(0.4, 0.2, 0.06), tailMat, x, 1.45, -2.62);
  }
  add(new THREE.CylinderGeometry(0.14, 0.14, 0.2, 8), beacon, 0, 2.8, 1.4);
  const byMat = new Map();
  for (const p of parts) {
    const g = p.geo.index ? p.geo.toNonIndexed() : p.geo;
    const keep = new THREE.BufferGeometry();
    keep.setAttribute('position', g.getAttribute('position'));
    keep.setAttribute('normal', g.getAttribute('normal'));
    if (!byMat.has(p.mat)) byMat.set(p.mat, []);
    byMat.get(p.mat).push(keep);
  }
  const out = new THREE.Group();
  for (const [mat, list] of byMat) {
    const m = new THREE.Mesh(mergeGeometries(list, false), mat);
    m.castShadow = !mat.isMeshBasicMaterial;
    m.receiveShadow = true;
    out.add(m);
  }
  return out;
}

// A rover following a polyline: `loop` closes it, otherwise it runs end to end and
// turns back. Stops while yours is in its way.
function createDriver(pts, loop, speed, color, startAt = 0) {
  const mesh = roverMesh(color);
  const seg = [];
  let total = 0;
  const n = loop ? pts.length : pts.length - 1;
  for (let i = 0; i < n; i++) {
    const a = pts[i];
    const b = pts[(i + 1) % pts.length];
    const len = Math.hypot(b.x - a.x, b.z - a.z);
    seg.push({ a, b, len, s0: total });
    total += len;
  }
  let s = startAt * total;
  let dir = 1;
  let v = speed;
  const pos = { x: 0, z: 0, yaw: 0 };
  function at(sv) {
    let k = seg.length - 1;
    for (let i = 0; i < seg.length; i++) if (sv < seg[i].s0 + seg[i].len) { k = i; break; }
    const g = seg[k];
    const f = Math.max(0, Math.min(1, (sv - g.s0) / g.len));
    return { x: g.a.x + (g.b.x - g.a.x) * f, z: g.a.z + (g.b.z - g.a.z) * f, yaw: Math.atan2(g.b.x - g.a.x, g.b.z - g.a.z) };
  }
  const solid = { x: 0, z: 0, y: 0, yaw: 0, w: 2.8, d: 5.6, h: 3 };
  return {
    mesh,
    solid,
    update(dt, rover) {
      // Look ahead: wait while the player's rover is in the way.
      const p0 = at(s);
      const fx = Math.sin(p0.yaw) * dir;
      const fz = Math.cos(p0.yaw) * dir;
      const rx = rover.x - p0.x;
      const rz = rover.z - p0.z;
      const ahead = rx * fx + rz * fz;
      const lateral = Math.abs(rx * fz - rz * fx);
      const blocked = ahead > -2 && ahead < 16 && lateral < 4.5;
      v += ((blocked ? 0 : speed) - v) * Math.min(1, dt * (blocked ? 4 : 0.8));
      s += v * dir * dt;
      if (loop) s = ((s % total) + total) % total;
      else if (s > total) { s = total; dir = -1; } else if (s < 0) { s = 0; dir = 1; }
      const p = at(s);
      // Smooth the heading through corners instead of snapping.
      const want = p.yaw + (dir < 0 ? Math.PI : 0);
      let dy = want - pos.yaw;
      dy = Math.atan2(Math.sin(dy), Math.cos(dy));
      pos.yaw += dy * Math.min(1, dt * 4);
      pos.x = p.x;
      pos.z = p.z;
      const y = groundHeight(p.x, p.z);
      // Pitch to the ground under its ends.
      const yF = groundHeight(p.x + Math.sin(pos.yaw) * 2.2, p.z + Math.cos(pos.yaw) * 2.2);
      const yB = groundHeight(p.x - Math.sin(pos.yaw) * 2.2, p.z - Math.cos(pos.yaw) * 2.2);
      mesh.position.set(p.x, (yF + yB) / 2 * 0.5 + y * 0.5, p.z);
      mesh.rotation.set(0, 0, 0);
      mesh.quaternion.setFromAxisAngle(UP, pos.yaw);
      mesh.rotateX(-Math.atan2(yF - yB, 4.4));
      solid.x = p.x;
      solid.z = p.z;
      solid.y = mesh.position.y;
      solid.yaw = pos.yaw;
    },
  };
}

export function createNPCs() {
  const group = new THREE.Group();
  const drivers = [];
  let walkers = null;
  const town = PLANET === 'mars' ? getSettlement() : null;
  if (town) {
    walkers = [createWalkers(town, 9, robotLook, 2024), createWalkers(town, 7, chibiLook, 777)];
    for (const w of walkers) group.add(w.group);
    const toWorld = (p) => ({ x: town.x + p.x * town.cos + p.z * town.sin, z: town.z - p.x * town.sin + p.z * town.cos });
    const loop = town.layout.loop.map(toWorld);
    for (const [c, st] of [[0x3f6fa8, 0], [0xd8b030, 0.5]]) drivers.push({ d: createDriver(loop, true, 4.5, c, st), town: true });
  }
  if (PLANET !== 'moon') {
    // Haulers on the road, following the graded route a little off its centre line.
    const thin = ROUTE_PTS.filter((_, i) => i % 2 === 0);
    // Four metres right of the centre line, so they keep a lane and leave yours.
    const road = thin.map((p, i) => {
      const q = thin[Math.min(i + 1, thin.length - 1)];
      const o = thin[Math.max(i - 1, 0)];
      const len = Math.hypot(q.x - o.x, q.z - o.z) || 1;
      return { x: p.x - ((q.z - o.z) / len) * 4, z: p.z + ((q.x - o.x) / len) * 4 };
    });
    for (const [c, st] of [[0xd8662a, 0.15], [0xb8c4cc, 0.65]]) drivers.push({ d: createDriver(road, false, 9, c, st), town: false });
  }
  for (const { d } of drivers) group.add(d.mesh);
  const solids = drivers.map((x) => x.d.solid);
  setMovingSolids(solids);

  return {
    group,
    update(dt, t, rover, night = 0) {
      const nearTown = town && Math.hypot(rover.x - town.x, rover.z - town.z) < 900;
      if (walkers) {
        for (const w of walkers) {
          w.group.visible = nearTown;
          if (nearTown) w.update(Math.min(dt, 0.1), t, rover, night);
        }
      }
      for (const { d, town: inTown } of drivers) {
        d.update(Math.min(dt, 0.1), rover);
        d.mesh.visible = inTown ? nearTown : Math.hypot(rover.x - d.solid.x, rover.z - d.solid.z) < 1600;
      }
    },
  };
}
