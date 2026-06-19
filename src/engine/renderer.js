// Thin wrapper over a 2D canvas context with a shared palette and a handful of
// drawing helpers. Scenes may also use ctx directly. Procedural shapes only —
// the game ships no external image assets, keeping it fully self-contained.

export const PALETTE = {
  bg: "#0b1020",
  bgDeep: "#070a16",
  stone: "#3a4256",
  stoneLight: "#525c75",
  floor: "#1a2032",
  floorAlt: "#222a40",
  chasm: "#05070f",
  white: "#e8ecf5",
  dim: "#8893ab",
  blue: "#4fb0ff", // Stormlight glow / Syl
  glow: "#bfe6ff",
  amethyst: "#9b6bff",
  gold: "#f2c14e", // spheres
  red: "#e2574c", // health / blood
  green: "#5fcf80",
  parshendi: "#c0563a",
  shadow: "rgba(0,0,0,0.45)",
};

export class Renderer {
  constructor(ctx, width, height) {
    this.ctx = ctx;
    this.width = width;
    this.height = height;
    this.cam = { x: 0, y: 0 };
    /** When true the 2D canvas is a HUD overlay above the 3D view: full-screen
     *  scene backdrops become translucent veils instead of opaque fills. */
    this.overlay = false;
  }

  clear(color = PALETTE.bg) {
    this.ctx.fillStyle = color;
    this.ctx.fillRect(0, 0, this.width, this.height);
  }

  /** Wipe to fully transparent (overlay mode clears between frames). */
  clearTransparent() {
    this.ctx.clearRect(0, 0, this.width, this.height);
  }

  /**
   * Full-screen backdrop for text-heavy scenes (menus, narration, puzzles).
   * Opaque in 2D mode; in overlay mode a dark veil that keeps the 3D scene
   * visible underneath while text stays readable.
   */
  sceneBackdrop(color = PALETTE.bgDeep, veil = 0.55) {
    if (this.overlay) {
      this.ctx.fillStyle = `rgba(5, 7, 15, ${veil})`;
    } else {
      this.ctx.fillStyle = color;
    }
    this.ctx.fillRect(0, 0, this.width, this.height);
  }

  /** Camera-space rect. */
  rect(x, y, w, h, color) {
    this.ctx.fillStyle = color;
    this.ctx.fillRect(Math.round(x - this.cam.x), Math.round(y - this.cam.y), w, h);
  }

  /** Screen-space rect (ignores camera) — for HUD. */
  rectScreen(x, y, w, h, color) {
    this.ctx.fillStyle = color;
    this.ctx.fillRect(x, y, w, h);
  }

  strokeRectScreen(x, y, w, h, color, lw = 2) {
    this.ctx.strokeStyle = color;
    this.ctx.lineWidth = lw;
    this.ctx.strokeRect(x, y, w, h);
  }

  circle(x, y, r, color) {
    this.ctx.fillStyle = color;
    this.ctx.beginPath();
    this.ctx.arc(Math.round(x - this.cam.x), Math.round(y - this.cam.y), r, 0, Math.PI * 2);
    this.ctx.fill();
  }

  /** Soft radial glow (for Stormlight, spheres). Screen-or-world via cam flag. */
  glow(x, y, r, color, world = true) {
    const cx = world ? x - this.cam.x : x;
    const cy = world ? y - this.cam.y : y;
    const g = this.ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
    g.addColorStop(0, color);
    g.addColorStop(1, "rgba(0,0,0,0)");
    this.ctx.fillStyle = g;
    this.ctx.beginPath();
    this.ctx.arc(cx, cy, r, 0, Math.PI * 2);
    this.ctx.fill();
  }

  text(str, x, y, opts = {}) {
    const {
      color = PALETTE.white,
      size = 16,
      font = "monospace",
      align = "left",
      baseline = "alphabetic",
      weight = "normal",
    } = opts;
    this.ctx.fillStyle = color;
    this.ctx.font = `${weight} ${size}px ${font}`;
    this.ctx.textAlign = align;
    this.ctx.textBaseline = baseline;
    this.ctx.fillText(str, x, y);
  }

  /** Word-wrap text into lines fitting maxWidth; returns the lines drawn. */
  textWrapped(str, x, y, maxWidth, opts = {}) {
    const { size = 16, lineHeight = 22, font = "monospace" } = opts;
    this.ctx.font = `${opts.weight ?? "normal"} ${size}px ${font}`;
    const words = str.split(/\s+/);
    const lines = [];
    let line = "";
    for (const w of words) {
      const test = line ? line + " " + w : w;
      if (this.ctx.measureText(test).width > maxWidth && line) {
        lines.push(line);
        line = w;
      } else {
        line = test;
      }
    }
    if (line) lines.push(line);
    lines.forEach((ln, i) => this.text(ln, x, y + i * lineHeight, opts));
    return lines;
  }

  centerCamOn(x, y, worldW, worldH) {
    this.cam.x = Math.round(x - this.width / 2);
    this.cam.y = Math.round(y - this.height / 2);
    if (worldW != null) this.cam.x = Math.max(0, Math.min(this.cam.x, worldW - this.width));
    if (worldH != null) this.cam.y = Math.max(0, Math.min(this.cam.y, worldH - this.height));
    if (worldW != null && worldW < this.width) this.cam.x = (worldW - this.width) / 2;
    if (worldH != null && worldH < this.height) this.cam.y = (worldH - this.height) / 2;
  }
}
