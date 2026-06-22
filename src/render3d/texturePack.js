// Cached PBR materials for world surfaces, built from CC0 Poly Haven texture
// sets (albedo + OpenGL normal + roughness) in assets/textures. Textures load
// lazily through a single TextureLoader the first time a material is requested,
// so this module imports cleanly in Node and only touches the network/GPU in a
// real browser.

import { THREE } from "./presenterUtils.js";

const FILES = {
  floor: { diff: "floor_diff.jpg", nor: "floor_nor.jpg", rough: "floor_rough.jpg", repeat: 1 },
  wall: { diff: "wall_diff.jpg", nor: "wall_nor.jpg", rough: "wall_rough.jpg", repeat: 1 },
  wood: { diff: "wood_diff.jpg", nor: "wood_nor.jpg", rough: "wood_rough.jpg", repeat: 1 },
};

let _loader = null;
const _matCache = new Map();

function tex(file, { srgb = false, repeat = 1 } = {}) {
  if (!_loader) _loader = new THREE.TextureLoader();
  const url = new URL(`../../assets/textures/${file}`, import.meta.url).href;
  const t = _loader.load(url);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(repeat, repeat);
  t.anisotropy = 8;
  if (srgb) t.colorSpace = THREE.SRGBColorSpace; // albedo only; data maps stay linear
  return t;
}

/**
 * A cached, textured MeshStandardMaterial for a world-surface role
 * ("floor" | "wall" | "wood"). Shared across InstancedMeshes — per-tile tint
 * still works because that lives on each mesh's instanceColor, not the material.
 */
export function worldMaterial(role) {
  if (_matCache.has(role)) return _matCache.get(role);
  const f = FILES[role];
  const mat = new THREE.MeshStandardMaterial({
    map: tex(f.diff, { srgb: true, repeat: f.repeat }),
    normalMap: tex(f.nor, { repeat: f.repeat }),
    roughnessMap: tex(f.rough, { repeat: f.repeat }),
    metalness: 0.0,
    roughness: 1.0,
  });
  _matCache.set(role, mat);
  return mat;
}
