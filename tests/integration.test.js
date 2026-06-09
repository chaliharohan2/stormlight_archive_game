import test from "node:test";
import assert from "node:assert/strict";
import { makeFakeCanvas, installRAF } from "./helpers/headless.js";
import { Game } from "../src/engine/game.js";
import { CHAPTERS } from "../src/content/campaign.js";
import { MemoryBackend } from "../src/engine/storage.js";

function newGame() {
  return new Game({
    canvas: makeFakeCanvas(),
    width: 960,
    height: 600,
    chapters: CHAPTERS,
    saveBackend: new MemoryBackend(),
  });
}

/** Run one scene frame with the current input, then clear edge presses. */
function frame(game, dt = 0.2) {
  game.scenes.update(dt, game.input);
  game.input.endFrame();
}

/** Simulate a fresh key tap that lasts exactly one frame. */
function tap(game, code, dt = 0.4) {
  game.input.releaseCode(code);
  game.input.pressCode(code);
  frame(game, dt);
  game.input.releaseCode(code);
}

test("game loop runs without throwing and renders frames", () => {
  const stepper = installRAF();
  const game = newGame();
  game.startChapter("sandbox");
  game.start(); // begins RAF loop with current scene
  stepper.run(5, 16);
  game.stop();
  assert.ok(game.scenes.current, "a scene should be active");
});

test("sphere pickup grants Stormlight", () => {
  const game = newGame();
  game.startChapter("sandbox");
  const scene = game.scenes.current;
  const sphere = scene.entities.find((e) => e.type === "sphere");
  scene.px = sphere.x;
  scene.py = sphere.y;
  assert.equal(game.player.stormlight.amount, 0);
  frame(game, 0.016);
  assert.ok(game.player.stormlight.amount > 0, "should have absorbed Stormlight");
  assert.equal(sphere._dead, true);
});

test("striking an enemy eventually kills it", () => {
  const game = newGame();
  game.startChapter("sandbox");
  const scene = game.scenes.current;
  const enemy = scene.entities.find((e) => e.type === "enemy");
  // Stand just left of the enemy, facing right.
  scene.px = enemy.x - 18;
  scene.py = enemy.y;
  game.player.facing = { x: 1, y: 0 };
  let safety = 30;
  while (!enemy._dead && safety-- > 0) {
    scene.px = enemy.x - 18; // keep adjacent; ignore knockback drift
    scene.py = enemy.y;
    game.player.facing = { x: 1, y: 0 };
    tap(game, "KeyJ", 0.4);
  }
  assert.equal(enemy._dead, true, "enemy should be defeated");
});

test("reaching the gate completes the chapter and the campaign", () => {
  const game = newGame();
  let campaignDone = false;
  game.onCampaignComplete = () => {
    campaignDone = true;
  };
  game.startChapter("sandbox");
  const scene = game.scenes.current;
  const exit = scene.entities.find((e) => e.type === "exit");
  // Stand on the gate and interact.
  scene.px = exit.x;
  scene.py = exit.y;
  tap(game, "KeyE", 0.05);
  assert.equal(game.progress.isCompleted("sandbox"), true);
  assert.equal(campaignDone, true);
});

test("progress persists across a save/restore", () => {
  const backend = new MemoryBackend();
  const g1 = new Game({ canvas: makeFakeCanvas(), chapters: CHAPTERS, saveBackend: backend });
  g1.progress.complete("sandbox");
  g1.persist();
  const g2 = new Game({ canvas: makeFakeCanvas(), chapters: CHAPTERS, saveBackend: backend });
  assert.equal(g2.restore(), true);
  assert.equal(g2.progress.isCompleted("sandbox"), true);
});
