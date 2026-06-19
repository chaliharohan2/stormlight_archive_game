// Generic vertical menu used for the title screen and the chapter-select screen.
// Items are { label, hint?, disabled?, onSelect }.

import { Scene } from "../engine/scene.js";
import { PALETTE } from "../engine/renderer.js";

export class MenuScene extends Scene {
  constructor(opts = {}) {
    super();
    this.title = opts.title ?? "";
    this.subtitle = opts.subtitle ?? "";
    this.footer = opts.footer ?? "";
    this.items = opts.items ?? [];
    this.selected = this.items.findIndex((i) => !i.disabled);
    if (this.selected < 0) this.selected = 0;
    this._t = 0;
  }

  setItems(items) {
    this.items = items;
    this.selected = Math.max(0, this.items.findIndex((i) => !i.disabled));
  }

  update(dt, input) {
    this._t += dt;
    if (this.items.length === 0) return;
    if (input.pressed("up")) this._move(-1);
    if (input.pressed("down")) this._move(1);
    if (input.pressed("confirm") || input.pressed("interact")) {
      const item = this.items[this.selected];
      if (item && !item.disabled && item.onSelect) item.onSelect();
    }
  }

  _move(dir) {
    const n = this.items.length;
    let i = this.selected;
    for (let k = 0; k < n; k++) {
      i = (i + dir + n) % n;
      if (!this.items[i].disabled) break;
    }
    this.selected = i;
  }

  render(r) {
    r.sceneBackdrop(PALETTE.bgDeep, 0.5);
    r.glow(r.width / 2, r.height / 2 - 60, 360, "rgba(79,176,255,0.08)", false);

    if (this.title) {
      r.text(this.title, r.width / 2, 130, {
        color: PALETTE.glow,
        size: 40,
        align: "center",
        weight: "bold",
      });
    }
    if (this.subtitle) {
      r.text(this.subtitle, r.width / 2, 172, { color: PALETTE.dim, size: 18, align: "center" });
    }

    const startY = 260;
    const rowH = 56;
    this.items.forEach((item, i) => {
      const sel = i === this.selected;
      const y = startY + i * rowH;
      const color = item.disabled ? "#4a526a" : sel ? PALETTE.glow : PALETTE.white;
      if (sel && !item.disabled) {
        r.rectScreen(r.width / 2 - 180, y - 20, 360, 32, "rgba(79,176,255,0.14)");
      }
      r.text((sel ? "▸ " : "  ") + item.label, r.width / 2, y, {
        color,
        size: 22,
        align: "center",
      });
      if (item.hint && sel) {
        r.text(item.hint, r.width / 2, y + 30, { color: PALETTE.dim, size: 12, align: "center" });
      }
    });

    if (this.footer) {
      r.text(this.footer, r.width / 2, r.height - 40, { color: PALETTE.dim, size: 13, align: "center" });
    }
  }
}
