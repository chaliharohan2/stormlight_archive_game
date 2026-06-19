// Browser scene wrapping the pure BridgeRun simulation. Renders a side view of
// Bridge Four sprinting the bridge across a chasm under archer fire, and lets
// the player BRACE (hold Space/Shift) to shield the crew during volleys. All
// game logic lives in BridgeRun; this file is presentation + input glue only.

import { Scene } from "../engine/scene.js";
import { PALETTE } from "../engine/renderer.js";
import { BridgeRun } from "../core/bridgeRun.js";
import { RNG } from "../core/rng.js";
import { GameOverScene } from "./gameOverScene.js";

// Bracing is taxing: while shielding the crew Kaladin burns a trickle of
// Stormlight (if the player has any), mirroring the simulation's extra risk.
const BRACE_STORMLIGHT_DRAIN = 8; // per second

export class BridgeRunScene extends Scene {
  /**
   * @param {Object} [config] - forwarded to BridgeRun (crewSize/goalDistance/...)
   * @param {Object} [opts]
   * @param {() => void} [opts.onComplete] - called when the run is won
   * @param {number} [opts.seed] - RNG seed for a reproducible run
   */
  constructor(config = {}, opts = {}) {
    super();
    this.config = config;
    this.opts = opts;
    // Visual-only state. Volley flashes telegraph the simulation's hidden timer.
    this._scroll = 0;
    this._volleyFlash = 0;
    this._lastVolleys = 0;
    this._braceGlow = 0;
  }

  enter() {
    this.sim = new BridgeRun({ rng: new RNG(this.opts.seed ?? 7), ...this.config });
    this._scroll = 0;
    this._volleyFlash = 0;
    this._lastVolleys = 0;
    this._braceGlow = 0;
  }

  update(dt, input) {
    // Either hold maps to BRACE so the prompt's "Space/Shift" stays honest.
    const bracing = input.isDown("power") || input.isDown("attack");

    if (bracing) {
      this._braceGlow = Math.min(1, this._braceGlow + dt * 4);
      // Drain a little Stormlight while bracing, if the player tracks it.
      const player = this.game?.player;
      if (player && typeof player.stormlight === "number") {
        player.stormlight = Math.max(0, player.stormlight - BRACE_STORMLIGHT_DRAIN * dt);
      }
    } else {
      this._braceGlow = Math.max(0, this._braceGlow - dt * 4);
    }

    const before = this.sim.volleys;
    const summary = this.sim.update(dt, { bracing });

    // Background scrolls with covered distance to sell the sprint.
    this._scroll += this.sim.runSpeed * dt;
    // Flash arrows whenever a fresh volley landed this frame.
    if (this.sim.volleys > before) this._volleyFlash = 0.35;
    if (this._volleyFlash > 0) this._volleyFlash = Math.max(0, this._volleyFlash - dt);

    if (summary.status === "won") {
      this.game.scenes.pop();
      this.opts.onComplete?.();
      return;
    }
    if (summary.status === "failed") {
      this.game.scenes.push(
        new GameOverScene("The bridge fell. Bridge Four is broken.", {
          onRetry: () => {
            this.game.scenes.pop();
            this.sim.reset();
          },
        })
      );
    }
  }

  render(r) {
    // With the 3D view active, BridgePresenter draws the run; keep HUD only.
    if (this.game.has3D) return this._renderHud(r);
    const W = r.width;
    const H = r.height;

    // --- Sky / plains backdrop. ---
    r.clear(PALETTE.bg);
    const horizon = H * 0.42;
    r.rectScreen(0, horizon, W, H - horizon, PALETTE.bgDeep);

    // Scrolling stone plateaus on the far side to convey forward motion.
    const tileW = 140;
    const offset = -(this._scroll * 0.5) % tileW;
    for (let x = offset - tileW; x < W + tileW; x += tileW) {
      r.rectScreen(x + 14, horizon - 26, tileW - 28, 26, PALETTE.stone);
      r.rectScreen(x + 14, horizon - 26, tileW - 28, 6, PALETTE.stoneLight);
    }

    // --- The chasm the bridge spans. ---
    const chasmTop = H * 0.62;
    const chasmH = H * 0.30;
    r.rectScreen(0, chasmTop, W, chasmH, PALETTE.chasm);
    // Crumbling stone lips on both sides of the gap.
    r.rectScreen(0, chasmTop - 10, W, 12, PALETTE.stone);
    r.rectScreen(0, chasmTop + chasmH - 2, W, 14, PALETTE.stone);

    // --- The bridge: a wooden plank with the crew running atop it. ---
    const bridgeY = chasmTop - 18;
    const bridgeX = W * 0.16;
    const bridgeW = W * 0.68;
    const bridgeH = 16;
    r.rectScreen(bridgeX, bridgeY, bridgeW, bridgeH, "#6b4a2b");
    r.rectScreen(bridgeX, bridgeY, bridgeW, 4, "#8a6438");
    // Plank seams that drift backwards as the crew runs forward.
    const plankGap = 26;
    const plankOff = -(this._scroll) % plankGap;
    for (let x = plankOff; x < bridgeW; x += plankGap) {
      if (x < 0) continue;
      r.rectScreen(bridgeX + x, bridgeY, 2, bridgeH, "#4a3018");
    }

    // Crew squares spread along the bridge; dead members leave gaps.
    const crew = this.sim.crew;
    const memSize = 12;
    const slotW = bridgeW / crew.length;
    const bracing = this._braceGlow > 0.05;
    crew.forEach((m, i) => {
      if (!m.alive) return;
      const cx = bridgeX + slotW * (i + 0.5);
      const cy = bridgeY - memSize - 2;
      // Treat the lead member (front of the run) as Kaladin / the player.
      const isLead = i === crew.length - 1;
      if (isLead) {
        if (bracing) r.glow(cx, cy + memSize / 2, 22, "rgba(79,176,255,0.55)", false);
        r.rectScreen(cx - memSize / 2, cy, memSize, memSize, PALETTE.blue);
      } else {
        r.rectScreen(cx - memSize / 2, cy, memSize, memSize, PALETTE.dim);
      }
    });

    // --- Incoming arrow volley animation (from the top, near volley timing). ---
    if (this._volleyFlash > 0) {
      const ctx = r.ctx;
      ctx.strokeStyle = bracing ? "rgba(79,176,255,0.7)" : PALETTE.parshendi;
      ctx.lineWidth = 2;
      // Deterministic-ish spread tied to volley count so arrows look varied.
      for (let i = 0; i < 14; i++) {
        const ax = bridgeX + ((i * 53 + this.sim.volleys * 17) % bridgeW);
        const fall = (0.35 - this._volleyFlash) / 0.35; // 0..1 progress
        const ay = 30 + fall * (bridgeY - 60);
        ctx.beginPath();
        ctx.moveTo(ax, ay);
        ctx.lineTo(ax + 3, ay + 16);
        ctx.stroke();
      }
    }

    this._renderHud(r);
  }

  _renderHud(r) {
    const W = r.width;
    const bracing = this._braceGlow > 0.05;
    // Distance progress bar.
    const barX = 24;
    const barY = 24;
    const barW = W - 48;
    const barH = 14;
    r.rectScreen(barX, barY, barW, barH, "rgba(0,0,0,0.5)");
    r.rectScreen(barX, barY, barW * this.sim.progress(), barH, PALETTE.gold);
    r.strokeRectScreen(barX, barY, barW, barH, PALETTE.dim, 1);

    const carriers = this.sim.carriers();
    const low = carriers <= this.sim.minCarriers + 2;
    r.text(`Carriers: ${carriers}/${this.sim.minCarriers}`, barX, barY + 38, {
      color: low ? PALETTE.red : PALETTE.white,
      size: 16,
    });

    r.text(
      bracing ? "BRACING — shielding the crew!" : "[Space/Shift] BRACE during volleys!",
      W / 2,
      barY + 38,
      { color: bracing ? PALETTE.blue : PALETTE.glow, size: 16, align: "center" }
    );
  }
}
