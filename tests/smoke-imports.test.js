import test from "node:test";
import assert from "node:assert/strict";

// Importing every browser-layer module in Node catches syntax errors, bad
// import paths, and top-level crashes without needing a DOM. Modules that touch
// the DOM guard their side effects, so importing them is safe.

const MODULES = [
  "../src/engine/events.js",
  "../src/engine/input.js",
  "../src/engine/storage.js",
  "../src/engine/renderer.js",
  "../src/engine/scene.js",
  "../src/engine/game.js",
  "../src/scenes/menuScene.js",
  "../src/scenes/narrationScene.js",
  "../src/scenes/gameOverScene.js",
  "../src/scenes/dialogueScene.js",
  "../src/scenes/worldScene.js",
  "../src/scenes/bridgeRunScene.js",
  "../src/scenes/soulcastScene.js",
  "../src/scenes/visionScene.js",
  "../src/core/bridgeRun.js",
  "../src/core/soulcast.js",
  "../src/core/vision.js",
  "../src/content/characters.js",
  "../src/content/campaign.js",
  "../src/main.js",
  // 3D layer (browser-only at runtime, but imports cleanly in Node — the
  // presenters only touch WebGL/DOM lazily, inside methods, never at import).
  "../src/render3d/presenterUtils.js",
  "../src/render3d/renderer3d.js",
  "../src/render3d/worldPresenter.js",
  "../src/render3d/bridgePresenter.js",
  "../src/render3d/soulcastPresenter.js",
  "../src/render3d/visionPresenter.js",
  "../src/render3d/ambientPresenter.js",
];

for (const m of MODULES) {
  test(`imports cleanly: ${m}`, async () => {
    const mod = await import(m);
    assert.ok(mod, `module ${m} should export something or load`);
  });
}

test("campaign exposes chapters with required shape", async () => {
  const { CHAPTERS } = await import("../src/content/campaign.js");
  assert.ok(Array.isArray(CHAPTERS) && CHAPTERS.length > 0);
  for (const ch of CHAPTERS) {
    assert.equal(typeof ch.id, "string");
    assert.equal(typeof ch.title, "string");
    assert.equal(typeof ch.start, "function");
  }
});
