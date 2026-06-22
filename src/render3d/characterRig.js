// Loads a rigged, animated humanoid (CC0 glTF) once and clones it per
// character with SkeletonUtils, so every soldier/figure shares geometry but has
// its own AnimationMixer. The model + addons are imported lazily and the glb is
// fetched over HTTP, so this module is browser-only and never touched by the
// headless Node tests. A CharacterRig fills its `root` group in asynchronously;
// callers add `root` to the scene immediately and keep a capsule fallback
// visible until `rig.ready` flips true.

import { THREE } from "./presenterUtils.js";

// Default humanoid. Swap in a bespoke hero by passing `url` to CharacterRig —
// any rigged glTF with idle/walk(/run) clips works; sizing is automatic.
export const DEFAULT_MODEL_URL = new URL("../../assets/models/soldier.glb", import.meta.url).href;

// The Soldier model's local forward axis vs. our convention (rotation.y = 0
// should face +z, toward the camera). Tuned to look correct in-scene.
const MODEL_FACING_OFFSET = Math.PI;

const _cache = new Map(); // url -> Promise<{ gltf, clone }>
function loadGLTF(url) {
  if (!_cache.has(url)) {
    _cache.set(
      url,
      (async () => {
        const [{ GLTFLoader }, { clone }] = await Promise.all([
          import("../../vendor/jsm/loaders/GLTFLoader.js"),
          import("../../vendor/jsm/utils/SkeletonUtils.js"),
        ]);
        const loader = new GLTFLoader();
        const gltf = await loader.loadAsync(url);
        return { gltf, clone };
      })()
    );
  }
  return _cache.get(url);
}

export class CharacterRig {
  /** @param {{height?:number,color?:number|null,url?:string}} opts */
  constructor({ height = 38, color = null, url = DEFAULT_MODEL_URL } = {}) {
    this.root = new THREE.Group();
    this.ready = false;
    this._height = height;
    this._color = color;
    this._url = url;
    this._mixer = null;
    this._idle = null;
    this._walk = null;
    this._mats = [];
    this._load();
  }

  async _load() {
    let data;
    try {
      data = await loadGLTF(this._url);
    } catch {
      return; // leave the caller's capsule fallback in place
    }
    const model = data.clone(data.gltf.scene);
    model.rotation.y = MODEL_FACING_OFFSET;

    const tint = this._color != null ? new THREE.Color(this._color) : null;
    model.traverse((o) => {
      if (!o.isMesh) return;
      o.castShadow = true;
      o.receiveShadow = true;
      o.material = o.material.clone(); // per-instance so emissive/tint are local
      o.material.metalness = Math.min(o.material.metalness ?? 0, 0.1);
      o.material.roughness = Math.max(o.material.roughness ?? 1, 0.6);
      if (tint) o.material.color.copy(tint);
      this._mats.push(o.material);
    });

    this.root.add(model);
    this._model = model;

    // Animation: blend idle <-> walk by movement. Set up and pose to idle BEFORE
    // measuring, so the bones are in their real standing positions when
    // _normalize sizes the model off them.
    this._mixer = new THREE.AnimationMixer(model);
    const clips = data.gltf.animations || [];
    const find = (n) => clips.find((c) => c.name.toLowerCase().includes(n));
    const idleClip = find("idle") || clips[0];
    const walkClip = find("walk") || find("run") || idleClip;
    if (idleClip) {
      this._idle = this._mixer.clipAction(idleClip);
      this._idle.play();
    }
    if (walkClip && walkClip !== idleClip) {
      this._walk = this._mixer.clipAction(walkClip);
      this._walk.play();
      this._walk.setEffectiveWeight(0);
    }
    this._mixer.update(0); // apply the idle pose so bones are in place
    this._normalize(model);
    this.ready = true;
  }

  /** Scale to the requested height. This model is authored tiny and is scaled
   *  up to human size by its *bones*, so neither the geometry bounds nor the
   *  static skinned bounds reflect the real figure. The posed bone joints do:
   *  we measure the world Y-span from the lowest (foot) to highest (head/neck)
   *  bone, pad it slightly for the skull above the top joint, scale the root to
   *  the target height, and drop the feet to y = 0. Measured once at native
   *  scale (root = 1) to avoid feeding the new scale back into the bones. */
  _normalize(model) {
    model.updateWorldMatrix(true, true);
    const p = new THREE.Vector3();
    let minY = Infinity;
    let maxY = -Infinity;
    model.traverse((o) => {
      if (o.isBone) {
        p.setFromMatrixPosition(o.matrixWorld);
        if (p.y < minY) minY = p.y;
        if (p.y > maxY) maxY = p.y;
      }
    });
    if (!isFinite(minY) || maxY <= minY) return; // no usable skeleton
    const nativeH = (maxY - minY) * 1.12; // pad for the skull above the neck joint
    const s = this._height / nativeH;
    this.root.scale.setScalar(s);
    this.root.position.y = -minY * s; // feet (lowest bone) to ground
  }

  /** Advance animation; crossfade toward walk when moving. */
  update(dt, moving) {
    if (!this._mixer) return;
    this._mixer.update(dt);
    if (this._walk && this._idle) {
      const want = moving ? 1 : 0;
      const w = this._walk.getEffectiveWeight();
      const nw = w + (want - w) * Math.min(1, dt * 9);
      this._walk.setEffectiveWeight(nw);
      this._idle.setEffectiveWeight(1 - nw);
    }
  }

  /** Tint the whole model's emissive (Stormlight glow, hit flash). */
  setEmissive(hex) {
    for (const m of this._mats) {
      if (m.emissive) m.emissive.setHex(hex);
    }
  }
}
