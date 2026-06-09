// Keyboard input. Tracks held keys plus edge-triggered "just pressed" so scenes
// can poll either continuous movement or one-shot actions. Action names are
// mapped from several physical keys (WASD + arrows, etc.).

export const ACTIONS = {
  up: ["ArrowUp", "KeyW"],
  down: ["ArrowDown", "KeyS"],
  left: ["ArrowLeft", "KeyA"],
  right: ["ArrowRight", "KeyD"],
  interact: ["KeyE", "Enter"],
  attack: ["KeyJ", "Space"],
  power: ["KeyK", "ShiftLeft", "ShiftRight"],
  confirm: ["Enter", "Space", "KeyE"],
  cancel: ["Escape"],
  pause: ["KeyP"],
  // Number keys for dialogue choices / menus.
  num1: ["Digit1"],
  num2: ["Digit2"],
  num3: ["Digit3"],
  num4: ["Digit4"],
};

export class Input {
  /** @param {EventTarget} [target] - usually window; injectable for tests */
  constructor(target = (typeof window !== "undefined" ? window : null)) {
    this.target = target;
    this._down = new Set(); // codes currently held
    this._pressed = new Set(); // codes pressed since last frame
    this._codeToActions = new Map();
    for (const [action, codes] of Object.entries(ACTIONS)) {
      for (const code of codes) {
        if (!this._codeToActions.has(code)) this._codeToActions.set(code, []);
        this._codeToActions.get(code).push(action);
      }
    }
    this._onKeyDown = (e) => this._handleDown(e);
    this._onKeyUp = (e) => this._handleUp(e);
    if (this.target) {
      this.target.addEventListener("keydown", this._onKeyDown);
      this.target.addEventListener("keyup", this._onKeyUp);
    }
  }

  _handleDown(e) {
    // Prevent the page from scrolling on arrows/space while playing.
    if (this._codeToActions.has(e.code) && e.preventDefault) e.preventDefault();
    if (!this._down.has(e.code)) this._pressed.add(e.code);
    this._down.add(e.code);
  }

  _handleUp(e) {
    this._down.delete(e.code);
  }

  /** Inject a key event manually (used by tests). */
  pressCode(code) {
    if (!this._down.has(code)) this._pressed.add(code);
    this._down.add(code);
  }
  releaseCode(code) {
    this._down.delete(code);
  }

  /** Is any key bound to this action currently held? */
  isDown(action) {
    return (ACTIONS[action] ?? []).some((code) => this._down.has(code));
  }

  /** Was any key bound to this action pressed this frame (edge)? */
  pressed(action) {
    return (ACTIONS[action] ?? []).some((code) => this._pressed.has(code));
  }

  /** Movement vector from the directional actions, normalized to <= 1 length. */
  axis() {
    let x = 0;
    let y = 0;
    if (this.isDown("left")) x -= 1;
    if (this.isDown("right")) x += 1;
    if (this.isDown("up")) y -= 1;
    if (this.isDown("down")) y += 1;
    if (x !== 0 && y !== 0) {
      const inv = 1 / Math.SQRT2;
      x *= inv;
      y *= inv;
    }
    return { x, y };
  }

  /** Call once at the end of each frame to clear edge-triggered presses. */
  endFrame() {
    this._pressed.clear();
  }

  destroy() {
    if (this.target) {
      this.target.removeEventListener("keydown", this._onKeyDown);
      this.target.removeEventListener("keyup", this._onKeyUp);
    }
    this._down.clear();
    this._pressed.clear();
  }
}
