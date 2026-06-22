// Shared helpers for the 3D presenters: palette mirroring the 2D renderer,
// a procedural glow sprite (no image assets), and tiny figure/mesh builders.
// Browser-only — this module is reached only through src/render3d/renderer3d.js.

import * as THREE from "../../vendor/three.module.js";

// Mirrors src/engine/renderer.js PALETTE so 2D fallback and 3D agree on mood.
export const COLORS = {
  bg: 0x0b1020,
  bgDeep: 0x070a16,
  stone: 0x3a4256,
  stoneLight: 0x525c75,
  floor: 0x1a2032,
  floorAlt: 0x222a40,
  chasm: 0x05070f,
  white: 0xe8ecf5,
  dim: 0x8893ab,
  blue: 0x4fb0ff,
  glow: 0xbfe6ff,
  amethyst: 0x9b6bff,
  gold: 0xf2c14e,
  red: 0xe2574c,
  green: 0x5fcf80,
  parshendi: 0xc0563a,
  wood: 0x6b4a2b,
  woodLight: 0x8a6438,
};

/** Parse CSS hexes coming from level data ("#rrggbb") into three colors. */
export function cssToHex(css, fallback) {
  if (typeof css === "string" && css.startsWith("#") && css.length >= 7) {
    return parseInt(css.slice(1, 7), 16);
  }
  return fallback;
}

let _glowTexture = null;

/** A soft radial gradient texture, generated once on a tiny offscreen canvas. */
export function glowTexture() {
  if (_glowTexture) return _glowTexture;
  const c = document.createElement("canvas");
  c.width = c.height = 64;
  const ctx = c.getContext("2d");
  const g = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
  g.addColorStop(0, "rgba(255,255,255,1)");
  g.addColorStop(0.4, "rgba(255,255,255,0.45)");
  g.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 64, 64);
  _glowTexture = new THREE.CanvasTexture(c);
  return _glowTexture;
}

/** Additive glow sprite (Stormlight, spheres, exits). */
export function makeGlow(color, scale = 40, opacity = 0.8) {
  const mat = new THREE.SpriteMaterial({
    map: glowTexture(),
    color,
    transparent: true,
    opacity,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });
  const s = new THREE.Sprite(mat);
  s.scale.set(scale, scale, 1);
  return s;
}

/**
 * A simple character figure: capsule body + head sphere in a group whose
 * origin sits at the feet, so `position.y = 0` stands it on the ground.
 * Figures carry a faint self-glow so they read against the dark stone;
 * userData.baseEmissive lets hit-flash effects restore it afterwards.
 */
export function makeFigure(color, { height = 34, radius = 9 } = {}) {
  const group = new THREE.Group();
  const base = new THREE.Color(color).multiplyScalar(0.18);
  const mat = new THREE.MeshStandardMaterial({
    color,
    emissive: base,
    roughness: 0.62,
    metalness: 0.08,
  });
  const bodyLen = Math.max(2, height - radius * 2 - 6);
  const body = new THREE.Mesh(new THREE.CapsuleGeometry(radius, bodyLen, 6, 14), mat);
  body.position.y = radius + bodyLen / 2;
  body.castShadow = true;
  body.receiveShadow = true;
  const head = new THREE.Mesh(new THREE.SphereGeometry(radius * 0.62, 16, 14), mat);
  head.position.y = radius + bodyLen + radius * 0.62 + 1;
  head.castShadow = true;
  group.add(body, head);
  group.userData.material = mat;
  group.userData.baseEmissive = base.getHex();
  return group;
}

/** Flat dark blob under figures — a cheap shadow without shadow maps. */
export function makeBlobShadow(radius = 11) {
  const mat = new THREE.MeshBasicMaterial({
    map: glowTexture(),
    color: 0x000000,
    transparent: true,
    opacity: 0.22,
    depthWrite: false,
  });
  const m = new THREE.Mesh(new THREE.PlaneGeometry(radius * 2, radius * 2), mat);
  m.rotation.x = -Math.PI / 2;
  m.position.y = 0.5;
  return m;
}

/**
 * Standard lighting rig shared by most presenters: a soft hemisphere fill plus
 * a shadow-casting directional "sun". With an environment map and ACES tone
 * mapping doing the heavy lifting, the direct lights stay restrained.
 * `shadows` sizes the orthographic shadow frustum; presenters that follow the
 * player reposition the returned light so the frustum tracks the action.
 */
export function addLights(scene, { ambient = 0.55, sun = 2.1, sunColor = 0xfff1d6, shadows = 700 } = {}) {
  scene.add(new THREE.HemisphereLight(0xbcd0ff, 0x2a2536, ambient));
  const dir = new THREE.DirectionalLight(sunColor, sun);
  dir.position.set(320, 640, 240);
  if (shadows) {
    dir.castShadow = true;
    dir.shadow.mapSize.set(2048, 2048);
    dir.shadow.bias = -0.0006;
    dir.shadow.normalBias = 2;
    const cam = dir.shadow.camera;
    cam.near = 50;
    cam.far = 2200;
    cam.left = -shadows;
    cam.right = shadows;
    cam.top = shadows;
    cam.bottom = -shadows;
    cam.updateProjectionMatrix();
  }
  scene.add(dir);
  scene.add(dir.target);
  return dir;
}

/** Scatter of glowing points used for stormwall / dream particles. */
export function makeParticles(count, color, spread, size = 4, opacity = 0.7) {
  const pos = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) {
    pos[i * 3] = (Math.random() - 0.5) * spread.x;
    pos[i * 3 + 1] = Math.random() * spread.y;
    pos[i * 3 + 2] = (Math.random() - 0.5) * spread.z;
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  const mat = new THREE.PointsMaterial({
    color,
    size,
    map: glowTexture(),
    transparent: true,
    opacity,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });
  return new THREE.Points(geo, mat);
}

export { THREE };
