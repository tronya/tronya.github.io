import * as THREE from 'three';

// Lamps are authored brighter than anything the sun can light, so the bloom pass
// (post.js), whose threshold sits just above sunlit sand, picks out lamps and only
// lamps. Tone mapping rolls them back into range, so they still read as their colour.
export const GLOW = 4;
export const lamp = (hex, k = GLOW) => new THREE.Color(hex).multiplyScalar(k);
