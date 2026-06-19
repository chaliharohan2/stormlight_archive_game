// Full-screen narration: a sequence of text "pages" used for chapter intros,
// epigraphs, and story interludes between playable areas. Advances on a key
// press; calls onComplete when the last page is dismissed.

import { Scene } from "../engine/scene.js";
import { PALETTE } from "../engine/renderer.js";

const CHARS_PER_SECOND = 55;

export class NarrationScene extends Scene {
  /**
   * @param {Array<string|{title?:string,subtitle?:string,text:string,epigraph?:string}>} pages
   * @param {Object} [opts]
   * @param {()=>void} [opts.onComplete]
   * @param {string} [opts.bg]
   */
  constructor(pages, opts = {}) {
    super();
    this.pages = pages.map((p) => (typeof p === "string" ? { text: p } : p));
    this.onComplete = opts.onComplete ?? null;
    this.bg = opts.bg ?? PALETTE.bgDeep;
    this.index = 0;
    this._revealed = 0;
  }

  get page() {
    return this.pages[this.index];
  }

  update(dt, input) {
    const full = this._revealed >= (this.page?.text?.length ?? 0);
    if (!full) this._revealed += CHARS_PER_SECOND * dt;
    if (input.pressed("confirm") || input.pressed("interact") || input.pressed("attack")) {
      if (!full) {
        this._revealed = this.page.text.length;
        return;
      }
      this.index++;
      this._revealed = 0;
      if (this.index >= this.pages.length) {
        this.game.scenes.pop();
        if (this.onComplete) this.onComplete();
      }
    }
  }

  render(r) {
    const p = this.page;
    if (!p) return;
    r.sceneBackdrop(this.bg, 0.6);
    // Subtle starfield-ish glow.
    r.glow(r.width / 2, r.height / 2 - 40, 320, "rgba(79,176,255,0.06)", false);

    let y = r.height / 2 - 120;
    if (p.epigraph) {
      r.textWrapped(p.epigraph, r.width / 2 - 320, y - 60, 640, {
        size: 13,
        lineHeight: 18,
        color: PALETTE.dim,
        align: "center",
      });
    }
    if (p.title) {
      r.text(p.title, r.width / 2, y, { color: PALETTE.glow, size: 32, align: "center", weight: "bold" });
      y += 44;
    }
    if (p.subtitle) {
      r.text(p.subtitle, r.width / 2, y, { color: PALETTE.dim, size: 16, align: "center" });
      y += 40;
    }
    const shown = p.text.slice(0, Math.floor(this._revealed));
    r.textWrapped(shown, r.width / 2 - 340, y + 20, 680, {
      size: 18,
      lineHeight: 28,
      color: PALETTE.white,
      align: "center",
    });

    r.text(`${this.index + 1}/${this.pages.length}  —  press Space`, r.width / 2, r.height - 36, {
      color: PALETTE.dim,
      size: 13,
      align: "center",
    });
  }
}
