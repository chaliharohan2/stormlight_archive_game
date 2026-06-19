// The 3D view layer. Owns a WebGL canvas beneath the 2D HUD canvas and a set
// of "presenters" — one per scene type — that read a scene's plain logic state
// every frame and mirror it as a Three.js scene graph. Scenes know nothing
// about Three.js, so the whole game still runs (and is tested) headlessly;
// this module is only ever imported from src/main.js in a real browser.

import * as THREE from "../../vendor/three.module.js";
import { WorldPresenter } from "./worldPresenter.js";
import { BridgePresenter } from "./bridgePresenter.js";
import { SoulcastPresenter } from "./soulcastPresenter.js";
import { VisionPresenter } from "./visionPresenter.js";
import { AmbientPresenter } from "./ambientPresenter.js";

// Scene constructor name -> presenter class. Scenes without an entry (e.g.
// DialogueScene, a transparent overlay) fall through to the scene beneath
// them on the stack, so the world keeps rendering behind conversations.
const PRESENTER_FOR = {
  WorldScene: WorldPresenter,
  BridgeRunScene: BridgePresenter,
  SoulcastScene: SoulcastPresenter,
  VisionScene: VisionPresenter,
  MenuScene: AmbientPresenter,
  NarrationScene: AmbientPresenter,
  GameOverScene: AmbientPresenter,
};

export class Renderer3D {
  constructor(canvas, width, height) {
    this.width = width;
    this.height = height;
    this.gl = new THREE.WebGLRenderer({
      canvas,
      antialias: false, // cheap + crisp at this resolution; kind to SwiftShader
      preserveDrawingBuffer: true, // lets tests/screenshots read pixels back
    });
    this.gl.setPixelRatio(1);
    this.gl.setSize(width, height, false);
    this.camera = new THREE.PerspectiveCamera(55, width / height, 1, 6000);

    this._presenters = new Map(); // PresenterClass -> instance
    this._active = null;
  }

  /** Topmost scene on the stack that has a presenter. */
  _pickScene(stack) {
    for (let i = stack.length - 1; i >= 0; i--) {
      if (PRESENTER_FOR[stack[i].constructor.name]) return stack[i];
    }
    return null;
  }

  render(game, dt) {
    const scene = this._pickScene(game.scenes.stack);
    if (!scene) {
      this.gl.clear();
      return;
    }
    const Cls = PRESENTER_FOR[scene.constructor.name];
    let presenter = this._presenters.get(Cls);
    if (!presenter) {
      presenter = new Cls();
      this._presenters.set(Cls, presenter);
    }
    presenter.sync(scene, this.camera, dt);
    this._active = presenter;
    this.gl.render(presenter.three, this.camera);
  }
}

/**
 * Build the 3D renderer, or return null when WebGL is unavailable so the
 * caller can fall back to the pure-2D pipeline.
 */
export function createRenderer3D(canvas, width, height) {
  if (!canvas) return null;
  try {
    const probe = canvas.getContext("webgl2") || canvas.getContext("webgl");
    if (!probe) return null;
    return new Renderer3D(canvas, width, height);
  } catch {
    return null;
  }
}
