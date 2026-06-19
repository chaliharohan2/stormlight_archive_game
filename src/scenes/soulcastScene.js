// Browser scene wrapping the Soulcasting puzzle. The player works through a
// list of recipes: pick the matching Essence (gemstone) and hold the channel
// key to pour Stormlight into the object until it transforms. Drains the
// player's Stormlight when present, but always allows a free trickle so the
// puzzle remains playable (and testable) even with an empty holder.

import { Scene } from "../engine/scene.js";
import { PALETTE } from "../engine/renderer.js";
import { SoulcastPuzzle, makePuzzleSet } from "../core/soulcast.js";

// Stormlight drawn per second while channelling, and the floor we always grant
// for free so an empty player can still finish the puzzle.
const CHANNEL_PER_SEC = 60;
const FREE_TRICKLE_PER_SEC = 30;

// Rough colors for the known Essences so the gems read at a glance. Anything
// unlisted falls back to the amethyst gem tone.
const GEM_COLORS = {
  Smokestone: "#8893ab",
  Heliodor: "#f2c14e",
  Ruby: "#e2574c",
  Sapphire: "#4fb0ff",
  Diamond: "#bfe6ff",
  Topaz: "#caa15a",
  Garnet: "#a8324a",
  Emerald: "#5fcf80",
};

export class SoulcastScene extends Scene {
  constructor(puzzleConfigs = [], opts = {}) {
    super();
    this._configs = puzzleConfigs;
    this._opts = opts;
  }

  enter() {
    this.puzzles = makePuzzleSet(this._configs);
    this.index = 0;
    // Which gem option is highlighted (commit it with confirm/num keys).
    this.selected = 0;
    this._t = 0;
  }

  get current() {
    return this.puzzles[this.index] ?? null;
  }

  update(dt, input) {
    this._t += dt;

    // Optional bail-out without completing.
    if (input.pressed("cancel")) {
      this.game?.scenes.pop();
      return;
    }

    const current = this.current;
    if (!current) return;

    // Move the highlight between gem options.
    const n = current.gemOptions.length;
    if (input.pressed("left")) this.selected = (this.selected - 1 + n) % n;
    if (input.pressed("right")) this.selected = (this.selected + 1) % n;

    // Number keys jump straight to an option and commit it.
    const numActions = ["num1", "num2", "num3", "num4"];
    for (let i = 0; i < numActions.length && i < n; i++) {
      if (input.pressed(numActions[i])) {
        this.selected = i;
        current.selectGem(current.gemOptions[i]);
      }
    }

    // Confirm commits the highlighted gem (so arrow users can pick too).
    if (input.pressed("confirm") || input.pressed("interact")) {
      current.selectGem(current.gemOptions[this.selected]);
    }

    // Hold power/attack to channel Stormlight into the object.
    if (input.isDown("power") || input.isDown("attack")) {
      const channelled = this._drawStormlight(dt);
      current.push(channelled);
    }

    if (current.isSolved()) this._advance();
  }

  /**
   * Pull Stormlight from the player to spend on channelling. We always return
   * at least a free trickle so the puzzle can be solved even with no holder or
   * an empty one — design choice to keep it from soft-locking.
   */
  _drawStormlight(dt) {
    const want = CHANNEL_PER_SEC * dt;
    const free = FREE_TRICKLE_PER_SEC * dt;
    const sl = this.game?.player?.stormlight;
    if (sl && sl.canAfford(want) && sl.spend(want)) return want;
    return free;
  }

  _advance() {
    this.index++;
    this.selected = 0;
    // Past the last puzzle: close the scene and notify the caller.
    if (this.index >= this.puzzles.length) {
      this.game?.scenes.pop();
      this._opts.onComplete?.();
    }
  }

  render(r) {
    r.sceneBackdrop(PALETTE.bgDeep, 0.35);
    const current = this.current;
    if (!current) return;

    const cx = r.width / 2;
    const p = current.progress();

    // --- Title / counter ---
    r.text("Soulcasting", cx, 70, {
      color: PALETTE.glow,
      size: 30,
      align: "center",
      weight: "bold",
    });
    r.text(`Puzzle ${this.index + 1}/${this.puzzles.length}`, cx, 100, {
      color: PALETTE.dim,
      size: 14,
      align: "center",
    });

    // --- The object: a shape morphing from stone toward Stormlight glow as
    // progress rises, with a glow that swells with it. ---
    const objY = 210;
    const radius = 54;
    r.glow(cx, objY, radius + 60, `rgba(79,176,255,${0.1 + 0.4 * p})`, false);
    const shapeColor = lerpColor(PALETTE.stone, PALETTE.glow, p);
    r.circle(cx, objY, radius, shapeColor);

    r.text(`${current.from}  ->  ${current.to}`, cx, objY + radius + 34, {
      color: PALETTE.white,
      size: 18,
      align: "center",
    });

    // --- Resistance / progress bar ---
    const barW = 360;
    const barX = cx - barW / 2;
    const barY = objY + radius + 60;
    r.rectScreen(barX, barY, barW, 16, PALETTE.floor);
    r.rectScreen(barX, barY, Math.round(barW * p), 16, PALETTE.blue);
    r.strokeRectScreen(barX, barY, barW, 16, PALETTE.dim, 1);
    r.text(`resistance ${Math.ceil(current.resistance)}`, cx, barY + 34, {
      color: PALETTE.dim,
      size: 12,
      align: "center",
    });

    // --- Gem options ---
    const gemY = barY + 90;
    const gap = 110;
    const startX = cx - ((current.gemOptions.length - 1) * gap) / 2;
    current.gemOptions.forEach((g, i) => {
      const gx = startX + i * gap;
      const highlighted = i === this.selected;
      const committed = current.selectedGem === g;
      const correct = committed && g === current.gem;
      const base = GEM_COLORS[g] ?? PALETTE.amethyst;

      // A correct, committed gem glows; highlighted ones get a soft halo.
      if (correct) r.glow(gx, gemY, 48, "rgba(95,207,128,0.5)", false);
      else if (highlighted) r.glow(gx, gemY, 40, "rgba(191,230,255,0.3)", false);

      r.circle(gx, gemY, 22, base);
      if (committed) {
        r.strokeRectScreen(gx - 26, gemY - 26, 52, 52, correct ? PALETTE.green : PALETTE.red, 2);
      } else if (highlighted) {
        r.strokeRectScreen(gx - 26, gemY - 26, 52, 52, PALETTE.glow, 2);
      }

      r.text(`${i + 1}. ${g}`, gx, gemY + 44, {
        color: highlighted ? PALETTE.white : PALETTE.dim,
        size: 12,
        align: "center",
      });
    });

    // --- Instructions ---
    r.text(
      "<- -> choose gem  ·  hold [Space] to channel Stormlight",
      cx,
      r.height - 40,
      { color: PALETTE.dim, size: 13, align: "center" },
    );
  }
}

// Blend two hex colors; used to morph the object's tone with progress. Kept
// local so the pure logic module stays free of rendering concerns.
function lerpColor(a, b, t) {
  const ca = hexToRgb(a);
  const cb = hexToRgb(b);
  const r = Math.round(ca[0] + (cb[0] - ca[0]) * t);
  const g = Math.round(ca[1] + (cb[1] - ca[1]) * t);
  const bl = Math.round(ca[2] + (cb[2] - ca[2]) * t);
  return `rgb(${r},${g},${bl})`;
}

function hexToRgb(hex) {
  const h = hex.replace("#", "");
  return [
    parseInt(h.slice(0, 2), 16),
    parseInt(h.slice(2, 4), 16),
    parseInt(h.slice(4, 6), 16),
  ];
}
