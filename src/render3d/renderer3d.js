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

// A cheap radial vignette to frame the scene cinematically. Applied in the
// composer chain after bloom (in linear HDR), so it just darkens toward the
// corners before tone mapping.
const VIGNETTE_SHADER = {
  uniforms: { tDiffuse: { value: null }, strength: { value: 0.5 } },
  vertexShader:
    "varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }",
  fragmentShader: `
    uniform sampler2D tDiffuse;
    uniform float strength;
    varying vec2 vUv;
    void main() {
      vec4 c = texture2D(tDiffuse, vUv);
      float d = distance(vUv, vec2(0.5));
      float vig = smoothstep(0.85, 0.40, d);
      c.rgb *= mix(1.0, vig, strength);
      gl_FragColor = c;
    }`,
};

export class Renderer3D {
  constructor(canvas, width, height) {
    this.width = width;
    this.height = height;
    this.gl = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      preserveDrawingBuffer: true, // lets tests/screenshots read pixels back
    });
    this.gl.setPixelRatio(1);
    this.gl.setSize(width, height, false);
    // Cinematic image: filmic tone mapping turns the HDR lighting + bloom into a
    // graded frame instead of flat clamped colors, and real shadow maps replace
    // the old fake blobs.
    this.gl.toneMapping = THREE.ACESFilmicToneMapping;
    this.gl.toneMappingExposure = 1.05;
    this.gl.shadowMap.enabled = true;
    this.gl.shadowMap.type = THREE.PCFSoftShadowMap;
    this.camera = new THREE.PerspectiveCamera(55, width / height, 1, 6000);

    this._presenters = new Map(); // PresenterClass -> instance
    this._active = null;

    // Post-processing (bloom) + image-based lighting are pulled in lazily so the
    // headless Node smoke-import test never loads the WebGL-only addons. Until
    // they resolve, render() falls back to a plain forward render.
    this._composer = null;
    this._renderPass = null;
    this._envMap = null;
    this._initPostFX();
  }

  async _initPostFX() {
    try {
      const [
        { EffectComposer },
        { RenderPass },
        { UnrealBloomPass },
        { ShaderPass },
        { OutputPass },
        { RoomEnvironment },
      ] = await Promise.all([
        import("../../vendor/jsm/postprocessing/EffectComposer.js"),
        import("../../vendor/jsm/postprocessing/RenderPass.js"),
        import("../../vendor/jsm/postprocessing/UnrealBloomPass.js"),
        import("../../vendor/jsm/postprocessing/ShaderPass.js"),
        import("../../vendor/jsm/postprocessing/OutputPass.js"),
        import("../../vendor/jsm/environments/RoomEnvironment.js"),
      ]);

      // Image-based lighting: a soft procedural room gives PBR surfaces
      // something to reflect, so Standard materials read as lit, not flat.
      const pmrem = new THREE.PMREMGenerator(this.gl);
      this._envMap = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;

      const composer = new EffectComposer(this.gl);
      composer.setPixelRatio(1);
      composer.setSize(this.width, this.height);
      const renderPass = new RenderPass(new THREE.Scene(), this.camera);
      const bloom = new UnrealBloomPass(
        new THREE.Vector2(this.width, this.height),
        0.55, // strength — Stormlight should glow, not wash out
        0.6, // radius
        0.82 // threshold: only bright emissive bits bloom
      );
      composer.addPass(renderPass);
      composer.addPass(bloom);
      composer.addPass(new ShaderPass(VIGNETTE_SHADER));
      composer.addPass(new OutputPass());

      this._renderPass = renderPass;
      this._composer = composer;
    } catch (err) {
      // No bloom/IBL — the plain render path still produces a lit, shadowed,
      // tone-mapped image. Better degraded than broken.
      console.warn("3D post-processing unavailable; using plain render.", err);
      this._composer = null;
    }
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

    // Image-based lighting for every scene's PBR materials.
    if (this._envMap && presenter.three.environment !== this._envMap) {
      presenter.three.environment = this._envMap;
    }

    if (this._composer) {
      this._renderPass.scene = presenter.three;
      this._renderPass.camera = this.camera;
      try {
        this._composer.render(dt);
        return;
      } catch (err) {
        console.warn("3D composer render failed; falling back.", err);
        this._composer = null; // stop trying; plain path below from now on
      }
    }
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
