// Dialogue overlay. Renders a bottom panel with the speaker, a typewriter line,
// and numbered choices. Drives a DialogueRunner and pops itself when the
// conversation ends, invoking onComplete(flags).

import { Scene } from "../engine/scene.js";
import { PALETTE } from "../engine/renderer.js";
import { DialogueRunner } from "../core/dialogue.js";
import { speakerColor } from "../content/characters.js";

const CHARS_PER_SECOND = 48;

export class DialogueScene extends Scene {
  /**
   * @param {Object} tree dialogue node map
   * @param {Object} [opts]
   * @param {string} [opts.startNode]
   * @param {Object} [opts.flags]
   * @param {(flags:Object)=>void} [opts.onComplete]
   */
  constructor(tree, opts = {}) {
    super();
    this.transparent = true;
    this.runner = new DialogueRunner(tree, { flags: opts.flags });
    this.startNode = opts.startNode ?? "start";
    this.onComplete = opts.onComplete ?? null;
    this.selected = 0;
    this._revealed = 0; // chars shown so far (typewriter)
    this._line = "";
  }

  enter() {
    this.runner.start(this.startNode);
    this._sync();
  }

  _sync() {
    const cur = this.runner.current();
    this._line = cur ? cur.text : "";
    this._revealed = 0;
    this.selected = 0;
  }

  _finishOrAdvance() {
    if (this.runner.isComplete()) return this._end();
  }

  _end() {
    const flags = this.runner.flags;
    this.game.scenes.pop();
    if (this.onComplete) this.onComplete(flags);
  }

  update(dt, input) {
    const cur = this.runner.current();
    if (!cur) return this._end();

    const fullyRevealed = this._revealed >= this._line.length;
    if (!fullyRevealed) this._revealed += CHARS_PER_SECOND * dt;

    if (cur.hasChoices && fullyRevealed) {
      // Choice navigation.
      if (input.pressed("up")) this.selected = (this.selected + cur.choices.length - 1) % cur.choices.length;
      if (input.pressed("down")) this.selected = (this.selected + 1) % cur.choices.length;
      for (let i = 0; i < cur.choices.length && i < 4; i++) {
        if (input.pressed(`num${i + 1}`)) {
          this.selected = i;
          this._choose();
          return;
        }
      }
      if (input.pressed("confirm")) {
        this._choose();
      }
      return;
    }

    if (input.pressed("confirm") || input.pressed("attack")) {
      if (!fullyRevealed) {
        this._revealed = this._line.length; // first press: reveal all
        return;
      }
      // Advance linear node.
      const next = this.runner.advance();
      if (next == null || this.runner.isComplete()) {
        // If advance produced a terminal node, still show it once.
        if (next && next.end) {
          this._line = next.text;
          this._revealed = 0;
          return;
        }
        return this._end();
      }
      this._line = next.text;
      this._revealed = 0;
      this.selected = 0;
    }
  }

  _choose() {
    const result = this.runner.choose(this.selected);
    if (result == null || this.runner.isComplete()) {
      if (result && result.end) {
        this._line = result.text;
        this._revealed = 0;
        return;
      }
      return this._end();
    }
    this._line = result.text;
    this._revealed = 0;
    this.selected = 0;
  }

  render(r) {
    const cur = this.runner.current();
    if (!cur) return;
    const W = r.width;
    const H = r.height;
    const boxH = 170;
    const y = H - boxH - 16;
    const x = 24;
    const w = W - 48;

    // Dim the world a touch.
    r.rectScreen(0, 0, W, H, "rgba(4,6,14,0.35)");
    // Panel.
    r.rectScreen(x, y, w, boxH, "rgba(10,14,28,0.95)");
    r.strokeRectScreen(x, y, w, boxH, PALETTE.stoneLight, 2);

    // Speaker tag.
    if (cur.speaker) {
      const col = speakerColor(cur.speaker);
      r.rectScreen(x, y - 28, Math.max(120, cur.speaker.length * 11 + 24), 28, "rgba(10,14,28,0.95)");
      r.strokeRectScreen(x, y - 28, Math.max(120, cur.speaker.length * 11 + 24), 28, col, 2);
      r.text(cur.speaker, x + 12, y - 8, { color: col, size: 16, weight: "bold" });
    }

    // Typewritten body.
    const shown = this._line.slice(0, Math.floor(this._revealed));
    const bodyLines = r.textWrapped(shown, x + 20, y + 34, w - 40, {
      size: 17,
      lineHeight: 24,
      color: PALETTE.white,
    });

    const fullyRevealed = this._revealed >= this._line.length;
    if (cur.hasChoices && fullyRevealed) {
      const cy = y + 34 + bodyLines.length * 24 + 12;
      cur.choices.forEach((c, i) => {
        const sel = i === this.selected;
        const ty = cy + i * 26;
        if (sel) r.rectScreen(x + 14, ty - 16, w - 28, 24, "rgba(79,176,255,0.18)");
        r.text(`${i + 1}. ${c.text}`, x + 24, ty, {
          color: sel ? PALETTE.glow : PALETTE.dim,
          size: 16,
        });
      });
    } else if (fullyRevealed) {
      r.text("▼ space", x + w - 90, y + boxH - 14, { color: PALETTE.dim, size: 13 });
    }
  }
}
