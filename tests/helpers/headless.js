// A headless harness that fakes just enough of the browser (a no-op 2D canvas
// context, requestAnimationFrame, performance) to run the real Game loop and
// scenes in Node for integration testing.

export function makeFakeContext() {
  const noop = () => {};
  return {
    fillStyle: "#000",
    strokeStyle: "#000",
    lineWidth: 1,
    font: "16px monospace",
    textAlign: "left",
    textBaseline: "alphabetic",
    fillRect: noop,
    strokeRect: noop,
    fillText: noop,
    beginPath: noop,
    arc: noop,
    fill: noop,
    stroke: noop,
    moveTo: noop,
    lineTo: noop,
    save: noop,
    restore: noop,
    translate: noop,
    measureText: (s) => ({ width: String(s).length * 8 }),
    createRadialGradient: () => ({ addColorStop: noop }),
  };
}

export function makeFakeCanvas(width = 960, height = 600) {
  const ctx = makeFakeContext();
  return {
    width,
    height,
    getContext: () => ctx,
    addEventListener: () => {},
    removeEventListener: () => {},
  };
}

/** Install global RAF/performance so Game.start() can run. Returns a stepper. */
export function installRAF() {
  let callbacks = [];
  let now = 0;
  globalThis.requestAnimationFrame = (fn) => {
    callbacks.push(fn);
    return callbacks.length;
  };
  globalThis.cancelAnimationFrame = () => {};
  if (typeof globalThis.performance === "undefined") {
    globalThis.performance = { now: () => now };
  }
  return {
    /** Advance one frame by dtMs milliseconds. */
    step(dtMs = 16) {
      now += dtMs;
      const pending = callbacks;
      callbacks = [];
      for (const fn of pending) fn(now);
    },
    /** Run n frames. */
    run(n, dtMs = 16) {
      for (let i = 0; i < n; i++) this.step(dtMs);
    },
  };
}
