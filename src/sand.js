import * as THREE from 'three';
import { terrainHeight, surfaceHeight, pebbleDensity } from './terrain.js';
import { PLANET } from './planet.js';

// Loose angular rocks lying on the ground around the rover. There are only a couple
// of thousand slots, and how many are actually there depends on where you are:
// stony ground thins out into clear ground (see pebbleDensity). A wheel running over
// a rock kicks it aside; it tumbles through a ballistic arc under Mars gravity and
// settles somewhere else, so the wheels leave a swept lane with the rocks heaped
// beside it. Rocks left behind wrap to the far side of the disc, so the amount stays
// steady without simulating the whole world.
//
// They are real (very low poly) meshes rather than sprites, so they are lit by the
// sun, the moon and the headlights like everything else, and they read as chunks of
// rock instead of round pebbles.

const GRAVITY = PLANET === 'moon' ? 1.62 : PLANET === 'verdanta' ? 9.5 : 3.71;

// Footprint of one tyre in the rover's own frame (half-width across, half-length along).
const TYRE_HALF_W = 0.85;
const TYRE_HALF_L = 1.45;

// Only chips this small are thrown by a tyre; anything bigger is a slab the rover
// simply drives over.
const KICK_MAX_SIZE = 0.27;
const DENSITY_SCALE = 0.5; // thins the whole field out; pebbleDensity still shapes it

const RESPAWN_BUDGET = 500; // per frame, so a teleport does not stall a frame
const JITTER = 24; // how far a wrapped rock is scattered from its mirror spot

// Only Martian earth tones: rust, sandstone, dusty orange and dark basalt-brown.
// Nothing near white or grey, whichever way the light falls. The Moon has none of
// that iron-oxide weathering — plain grey regolith chips instead. Верданта's are
// dark basalt gravel, a couple of them mossed over green.
const PALETTE = (PLANET === 'moon'
  ? [0x3c3c3e, 0x545456, 0x2c2c2d, 0x707072, 0x656567, 0x5c5c5e, 0x424244, 0x48484a]
  : PLANET === 'verdanta'
  // Weathered basalt gravel, a few chips mossed over. Kept well off black: against
  // Верданта's green these used to read as holes in the ground rather than stones.
  ? [0x4a4a4c, 0x5c5c5e, 0x3c3c3e, 0x6a6a6a, 0x545456, 0x5e6b4a, 0x484a46, 0x525c42]
  : [0x4a2a1e, 0x6b3b28, 0x3a241b, 0xa5603c, 0xa8683f, 0x9a6a48, 0x5a3a2c, 0x8b4a30]
).map((c) => new THREE.Color(c));

// A rough chunk: a dodecahedron with every vertex pushed in or out by a hash of its
// position (so shared corners move together and the surface stays closed).
function makeChunkGeometry() {
  const geo = new THREE.DodecahedronGeometry(1, 0);
  const p = geo.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i);
    const y = p.getY(i);
    const z = p.getZ(i);
    const h = Math.sin(x * 12.9898 + y * 78.233 + z * 37.719) * 43758.5453;
    const j = 0.62 + 0.62 * (h - Math.floor(h));
    p.setXYZ(i, x * j, y * j, z * j);
  }
  geo.computeVertexNormals();
  return geo;
}

export function createSand({ count = 2800, radius = 120 } = {}) {
  const pos = new Float32Array(count * 3);
  const vel = new Float32Array(count * 3);
  const rot = new Float32Array(count * 3); // Euler angles
  const spin = new Float32Array(count * 3);
  const scl = new Float32Array(count * 3); // half-extents of the chunk
  const flying = new Uint8Array(count);
  const size = new Float32Array(count); // overall diameter in metres
  const on = new Uint8Array(count);

  const geometry = makeChunkGeometry();
  const rover = { value: new THREE.Vector3() };
  const radiusU = { value: radius };
  const material = new THREE.MeshStandardMaterial({ flatShading: true, roughness: 0.96, metalness: 0 });
  // Rocks shrink to nothing at the edge of the disc instead of popping in and out.
  material.onBeforeCompile = (shader) => {
    shader.uniforms.uRover = rover;
    shader.uniforms.uRadius = radiusU;
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nuniform vec3 uRover;\nuniform float uRadius;')
      .replace(
        '#include <begin_vertex>',
        `#include <begin_vertex>
         #ifdef USE_INSTANCING
           vec3 instP = vec3(instanceMatrix[3]);
           transformed *= smoothstep(uRadius, uRadius * 0.86, length(instP.xz - uRover.xz));
         #endif`
      );
  };

  const mesh = new THREE.InstancedMesh(geometry, material, count);
  mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  mesh.frustumCulled = false; // instances move every frame
  mesh.castShadow = true; // the sun's shadow map only covers the ground next to the rover, so this is cheap
  mesh.receiveShadow = true;

  const stats = { flying: 0, kicked: 0, respawned: 0 };
  let enabled = true;
  let seeded = false;
  let dirty = false;

  const tmpV = new THREE.Vector3();
  const tmpS = new THREE.Vector3();
  const tmpE = new THREE.Euler();
  const tmpQ = new THREE.Quaternion();
  const tmpM = new THREE.Matrix4();
  const tmpC = new THREE.Color();

  // Mostly small chips with the occasional big slab: sizes are diameters in metres.
  for (let i = 0; i < count; i++) {
    size[i] = 0.16 + 0.6 * Math.pow(Math.random(), 3.2);
    const half = size[i] * 0.5;
    // Uneven axes: slabs, wedges and blocks rather than balls.
    scl[i * 3] = half * (0.75 + Math.random() * 0.75);
    scl[i * 3 + 1] = half * (0.4 + Math.random() * 0.45);
    scl[i * 3 + 2] = half * (0.65 + Math.random() * 0.7);
    tmpC.copy(PALETTE[(Math.random() * PALETTE.length) | 0]).multiplyScalar(0.82 + Math.random() * 0.32);
    mesh.setColorAt(i, tmpC);
  }
  mesh.instanceColor.needsUpdate = true;

  function writeMatrix(i) {
    const o = i * 3;
    const k = on[i]; // an unused slot collapses to nothing
    tmpV.set(pos[o], pos[o + 1], pos[o + 2]);
    tmpE.set(rot[o], rot[o + 1], rot[o + 2]);
    tmpQ.setFromEuler(tmpE);
    tmpS.set(scl[o] * k, scl[o + 1] * k, scl[o + 2] * k);
    tmpM.compose(tmpV, tmpQ, tmpS);
    mesh.setMatrixAt(i, tmpM);
    dirty = true;
  }

  // Rest height: a rock sits partly sunk into the ground.
  const restLift = (i) => scl[i * 3 + 1] * 0.55;

  function lieDown(i) {
    // Settle roughly flat, keeping whatever heading it landed with.
    rot[i * 3] = (Math.random() - 0.5) * 0.5;
    rot[i * 3 + 2] = (Math.random() - 0.5) * 0.5;
  }

  function place(i, x, z) {
    const o = i * 3;
    pos[o] = x;
    pos[o + 1] = surfaceHeight(x, z) + restLift(i);
    pos[o + 2] = z;
    vel[o] = vel[o + 1] = vel[o + 2] = 0;
    flying[i] = 0;
    rot[o + 1] = Math.random() * Math.PI * 2;
    lieDown(i);
    // This slot is only a rock here if the ground is stony here.
    on[i] = Math.random() < pebbleDensity(x, z) * DENSITY_SCALE ? 1 : 0;
    writeMatrix(i);
  }

  function seed(i, cx, cz) {
    const a = Math.random() * Math.PI * 2;
    const r = radius * Math.sqrt(Math.random());
    place(i, cx + Math.cos(a) * r, cz + Math.sin(a) * r);
  }

  function kick(i, lx, s) {
    const o = i * 3;
    // Heavy rocks barely move; small chips are thrown well.
    const mass = Math.min(1.3, Math.max(0.2, 0.14 / size[i]));
    const k = Math.min(1.7, Math.max(0.35, s.speed / 5));
    const side = Math.abs(lx) < 0.12 ? (Math.random() < 0.5 ? -1 : 1) : Math.sign(lx);
    const lat = side * (1.0 + Math.random() * 1.8) * k * mass;
    const along = s.speed * (0.2 + Math.random() * 0.25) * mass;
    vel[o] = s.latX * lat + s.dirX * along + (Math.random() - 0.5) * 0.8 * mass;
    vel[o + 2] = s.latZ * lat + s.dirZ * along + (Math.random() - 0.5) * 0.8 * mass;
    vel[o + 1] = (1.2 + Math.random() * 2.0) * k * (0.75 + s.speed * 0.025) * Math.pow(mass, 0.7);
    // Tumble while airborne; small chips spin faster than big ones.
    const w = 5 + 9 * mass;
    spin[o] = (Math.random() - 0.5) * w;
    spin[o + 1] = (Math.random() - 0.5) * w;
    spin[o + 2] = (Math.random() - 0.5) * w;
    pos[o + 1] += 0.06;
    flying[i] = 1;
    stats.kicked++;
  }

  const scratch = { speed: 0, latX: 0, latZ: 0, dirX: 0, dirZ: 0 };

  // ctx: { x, z, yaw, vx, vz, wheels: [{cx, cz, contact}] }
  function update(dt, ctx) {
    if (!enabled) return;
    dt = Math.min(dt, 0.05);

    if (!seeded) {
      for (let i = 0; i < count; i++) seed(i, ctx.x, ctx.z);
      seeded = true;
    }

    const speed = Math.hypot(ctx.vx, ctx.vz);
    const cosY = Math.cos(ctx.yaw);
    const sinY = Math.sin(ctx.yaw);
    const kicking = speed > 0.4;
    scratch.speed = speed;
    scratch.latX = cosY; // rover-local +x in world axes
    scratch.latZ = -sinY;
    scratch.dirX = kicking ? ctx.vx / speed : 0;
    scratch.dirZ = kicking ? ctx.vz / speed : 0;

    const wheels = ctx.wheels;
    const R2 = radius * radius;
    const far2 = 9 * R2;
    const drag = 1 - 0.7 * dt;
    let respawns = 0;
    let airborne = 0;

    for (let i = 0; i < count; i++) {
      const o = i * 3;
      let x = pos[o];
      let z = pos[o + 2];

      if (flying[i]) {
        vel[o + 1] -= GRAVITY * dt;
        vel[o] *= drag;
        vel[o + 2] *= drag;
        x += vel[o] * dt;
        z += vel[o + 2] * dt;
        const y = pos[o + 1] + vel[o + 1] * dt;
        pos[o] = x;
        pos[o + 2] = z;
        rot[o] += spin[o] * dt;
        rot[o + 1] += spin[o + 1] * dt;
        rot[o + 2] += spin[o + 2] * dt;
        if (vel[o + 1] < 0 && y <= terrainHeight(x, z) + restLift(i)) {
          // Landed: settle on the rendered surface and stay put until disturbed.
          pos[o + 1] = surfaceHeight(x, z) + restLift(i);
          vel[o] = vel[o + 1] = vel[o + 2] = 0;
          flying[i] = 0;
          lieDown(i);
        } else {
          pos[o + 1] = y;
          airborne++;
        }
        writeMatrix(i);
      } else if (kicking && on[i] === 1 && size[i] < KICK_MAX_SIZE) {
        for (let w = 0; w < wheels.length; w++) {
          const wh = wheels[w];
          if (!wh.contact) continue;
          const dx = x - wh.cx;
          const dz = z - wh.cz;
          if (dx > 2.2 || dx < -2.2 || dz > 2.2 || dz < -2.2) continue;
          const lx = dx * cosY - dz * sinY;
          const lz = dx * sinY + dz * cosY;
          if (lx < TYRE_HALF_W && lx > -TYRE_HALF_W && lz < TYRE_HALF_L && lz > -TYRE_HALF_L) {
            kick(i, lx, scratch);
            break;
          }
        }
      }

      // Wrap: rocks left behind reappear on the far side of the disc.
      const rx = x - ctx.x;
      const rz = z - ctx.z;
      const d2 = rx * rx + rz * rz;
      if (d2 > R2 && respawns < RESPAWN_BUDGET) {
        respawns++;
        if (d2 > far2) {
          seed(i, ctx.x, ctx.z); // a teleport: reseed anywhere in the disc
        } else {
          const k = Math.min(0.985, (radius * 0.985) / Math.sqrt(d2));
          // Jitter widely: the field changes from place to place, so the new spot
          // should be judged on its own ground rather than copied from the far side.
          place(i, ctx.x - rx * k + (Math.random() - 0.5) * JITTER, ctx.z - rz * k + (Math.random() - 0.5) * JITTER);
        }
      }
    }

    stats.flying = airborne;
    stats.respawned = respawns;
    if (dirty) {
      mesh.instanceMatrix.needsUpdate = true;
      dirty = false;
    }
    rover.value.set(ctx.x, 0, ctx.z);
  }

  return {
    points: mesh, // kept under this name so the scene wiring stays the same
    update,
    stats,
    count,
    setEnabled(on_) {
      enabled = on_;
      mesh.visible = on_;
    },
    get enabled() {
      return enabled;
    },
    // Test hooks -------------------------------------------------------------
    visibleCount() {
      let n = 0;
      for (let i = 0; i < count; i++) if (on[i] === 1) n++;
      return n;
    },
    sizes() {
      const out = [];
      for (let i = 0; i < count; i++) if (on[i] === 1) out.push(size[i]);
      return out;
    },
    countInBox(x0, z0, x1, z1) {
      let n = 0;
      for (let i = 0; i < count; i++) {
        if (flying[i] || on[i] === 0) continue;
        const x = pos[i * 3];
        const z = pos[i * 3 + 2];
        if (x >= x0 && x <= x1 && z >= z0 && z <= z1) n++;
      }
      return n;
    },
  };
}
