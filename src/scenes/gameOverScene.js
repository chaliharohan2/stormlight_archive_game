// Full-screen failure overlay with a retry prompt.

import { Scene } from "../engine/scene.js";
import { PALETTE } from "../engine/renderer.js";

export class GameOverScene extends Scene {
  constructor(message, opts = {}) {
    super();
    this.message = message;
    this.onRetry = opts.onRetry ?? null;
    this._t = 0;
  }

  update(dt, input) {
    this._t += dt;
    if (this._t > 0.4 && (input.pressed("confirm") || input.pressed("interact"))) {
      if (this.onRetry) this.onRetry();
    }
  }

  render(r) {
    r.rectScreen(0, 0, r.width, r.height, "rgba(6,8,16,0.92)");
    r.text("You have fallen", r.width / 2, r.height / 2 - 50, {
      color: PALETTE.red,
      size: 36,
      align: "center",
      weight: "bold",
    });
    r.textWrapped(this.message, r.width / 2 - 280, r.height / 2, 560, {
      size: 16,
      lineHeight: 24,
      color: PALETTE.dim,
      align: "center",
    });
    if (this._t > 0.4) {
      r.text("Press Enter to journey on", r.width / 2, r.height / 2 + 80, {
        color: PALETTE.glow,
        size: 16,
        align: "center",
      });
      r.text('"Life before death. Strength before weakness."', r.width / 2, r.height - 40, {
        color: PALETTE.dim,
        size: 13,
        align: "center",
      });
    }
  }
}
