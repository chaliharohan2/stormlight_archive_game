// The game shell: owns the canvas, the loop, input, the scene stack, the save
// system, campaign progression, and the active character's runtime state.
// Story content (chapters) drives it through a small, stable API.

import { Renderer } from "./renderer.js";
import { Input } from "./input.js";
import { SceneManager } from "./scene.js";
import { SaveManager } from "./storage.js";
import { EventBus } from "./events.js";
import { GameProgress } from "../core/progression.js";
import { makeCombatant } from "../core/combat.js";
import { Stormlight } from "../core/stormlight.js";
import { Inventory } from "../core/inventory.js";

export class Game {
  /**
   * @param {Object} opts
   * @param {HTMLCanvasElement} opts.canvas
   * @param {number} [opts.width]
   * @param {number} [opts.height]
   * @param {Array<{id:string,title:string,start:Function}>} [opts.chapters]
   * @param {Object} [opts.saveBackend]
   */
  constructor(opts) {
    this.canvas = opts.canvas;
    this.width = opts.width ?? this.canvas.width;
    this.height = opts.height ?? this.canvas.height;
    this.ctx = this.canvas.getContext("2d");
    this.renderer = new Renderer(this.ctx, this.width, this.height);
    /** Optional 3D view (see src/render3d/). When present the 2D canvas
     *  becomes a transparent HUD overlay and scenes skip their 2D playfields. */
    this.renderer3d = opts.renderer3d ?? null;
    this.renderer.overlay = !!this.renderer3d;
    this.input = new Input();
    this.scenes = new SceneManager(this);
    this.save = new SaveManager(opts.saveBackend);
    this.bus = new EventBus();

    this.chapters = new Map();
    this.chapterOrder = [];
    for (const ch of opts.chapters ?? []) {
      this.chapters.set(ch.id, ch);
      this.chapterOrder.push(ch.id);
    }
    this.progress = new GameProgress(this.chapterOrder);

    /** Active character runtime state, set up per chapter. */
    this.player = null;
    /** Optional hook invoked when the whole campaign is finished. */
    this.onCampaignComplete = null;
    /** Optional hook invoked after each chapter (id => void). */
    this.onChapterComplete = null;

    this._running = false;
    this._lastTime = 0;
    this._raf = null;
  }

  // --- Character setup -----------------------------------------------------

  /** Configure the playable character for the current chapter. */
  setupCharacter(cfg = {}) {
    this.player = {
      name: cfg.name ?? "Hero",
      combatant: makeCombatant({
        name: cfg.name ?? "Hero",
        maxHp: cfg.maxHp ?? 100,
        attack: cfg.attack ?? 12,
        defense: cfg.defense ?? 2,
        stormlightBonus: cfg.stormlightBonus ?? 18,
      }),
      stormlight: new Stormlight({
        capacity: cfg.stormlightCapacity ?? 100,
        amount: cfg.stormlight ?? 0,
      }),
      inventory: new Inventory(cfg.inventory ?? {}),
      // Which surges/powers the character has unlocked this chapter.
      powers: new Set(cfg.powers ?? []),
      facing: { x: 0, y: 1 },
    };
    return this.player;
  }

  hasPower(name) {
    return !!this.player?.powers?.has(name);
  }

  /** True when a 3D renderer is attached (scenes use this to skip 2D playfields). */
  get has3D() {
    return !!this.renderer3d;
  }

  // --- Campaign flow -------------------------------------------------------

  startChapter(id) {
    const ch = this.chapters.get(id);
    if (!ch) throw new Error(`Unknown chapter: ${id}`);
    this.progress.currentChapter = id;
    this.progress.unlock(id);
    ch.start(this);
    this.bus.emit("chapterStarted", id);
  }

  /** Mark the current chapter complete, persist, and report the next id. */
  completeChapter(id) {
    this.progress.complete(id);
    this.persist();
    if (this.onChapterComplete) this.onChapterComplete(id);
    this.bus.emit("chapterComplete", id);
    const next = this.progress.nextChapter();
    if (!next) {
      if (this.onCampaignComplete) this.onCampaignComplete();
      this.bus.emit("campaignComplete");
    }
    return next;
  }

  // --- Persistence ---------------------------------------------------------

  persist() {
    return this.save.save({ version: 1, progress: this.progress.toJSON() });
  }

  restore() {
    const data = this.save.load();
    if (data?.progress) {
      this.progress = GameProgress.fromJSON(this.chapterOrder, data.progress);
      return true;
    }
    return false;
  }

  // --- Loop ----------------------------------------------------------------

  start(scene) {
    if (scene) this.scenes.replace(scene);
    if (this._running) return;
    this._running = true;
    this._lastTime = (typeof performance !== "undefined" ? performance.now() : Date.now());
    const tick = (now) => {
      if (!this._running) return;
      const dt = Math.min(0.05, (now - this._lastTime) / 1000); // clamp big gaps
      this._lastTime = now;
      this.scenes.update(dt, this.input);
      if (this.renderer3d) {
        this.renderer3d.render(this, dt);
        this.renderer.clearTransparent();
      } else {
        this.renderer.clear();
      }
      this.scenes.render(this.renderer);
      this.input.endFrame();
      this._raf = requestAnimationFrame(tick);
    };
    this._raf = requestAnimationFrame(tick);
  }

  stop() {
    this._running = false;
    if (this._raf != null) cancelAnimationFrame(this._raf);
  }
}
