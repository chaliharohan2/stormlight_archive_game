// Scene base class + a stack-based scene manager. The top scene receives
// update/input; scenes flagged `transparent` let the scene beneath them keep
// rendering (used for dialogue and pause overlays).

export class Scene {
  constructor() {
    /** @type {import('./game.js').Game|null} */
    this.game = null;
    /** Overlay scenes set this true so lower scenes still render. */
    this.transparent = false;
  }

  /** Called when pushed/made active. */
  enter() {}
  /** Called when popped/replaced. */
  exit() {}
  /** Called when a scene above this one is popped, returning `result`. */
  resume(result) {}
  /** @param {number} dt seconds @param {import('./input.js').Input} input */
  update(dt, input) {}
  /** @param {import('./renderer.js').Renderer} r */
  render(r) {}
}

export class SceneManager {
  constructor(game) {
    this.game = game;
    /** @type {Scene[]} */
    this.stack = [];
  }

  get current() {
    return this.stack[this.stack.length - 1] ?? null;
  }

  push(scene) {
    scene.game = this.game;
    this.stack.push(scene);
    scene.enter();
  }

  /** Pop the top scene; the new top gets resume(result). */
  pop(result) {
    const scene = this.stack.pop();
    scene?.exit();
    this.current?.resume(result);
    return scene;
  }

  /** Replace the entire stack with a single scene. */
  replace(scene) {
    while (this.stack.length) this.stack.pop()?.exit();
    this.push(scene);
  }

  update(dt, input) {
    this.current?.update(dt, input);
  }

  render(r) {
    // Find the lowest opaque scene and render from there up, so overlays stack.
    let start = this.stack.length - 1;
    while (start > 0 && this.stack[start].transparent) start--;
    for (let i = start; i < this.stack.length; i++) this.stack[i].render(r);
  }
}
