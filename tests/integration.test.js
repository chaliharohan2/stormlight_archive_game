import test from "node:test";
import assert from "node:assert/strict";
import { makeFakeCanvas, installRAF } from "./helpers/headless.js";
import { playUntil } from "./helpers/autoplay.js";
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
  game.startChapter("prelude");
  game.start(); // begins RAF loop with the current scene
  stepper.run(5, 16);
  game.stop();
  assert.ok(game.scenes.current, "a scene should be active");
});

test("sphere pickup grants Stormlight", () => {
  const game = newGame();
  game.startChapter("szeth");
  const scene = game.scenes.current;
  const sphere = scene.entities.find((e) => e.type === "sphere");
  const before = game.player.stormlight.amount;
  scene.px = sphere.x;
  scene.py = sphere.y;
  frame(game, 0.016);
  assert.ok(game.player.stormlight.amount > before, "should have absorbed Stormlight");
  assert.equal(sphere._dead, true);
});

test("striking an enemy eventually kills it", () => {
  const game = newGame();
  game.startChapter("szeth");
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

test("a single chapter (the prelude) can be played to completion", () => {
  const game = newGame();
  let completed = null;
  game.onChapterComplete = (id) => {
    completed = id;
  };
  game.startChapter("prelude");
  playUntil(game, () => completed === "prelude", { budget: 2000 });
  assert.equal(completed, "prelude", "the prelude should complete when played");
  assert.equal(game.progress.isCompleted("prelude"), true);
  assert.equal(game.progress.isUnlocked("szeth"), true, "next chapter should unlock");
  assert.equal(game.progress.getFlag("oathpactAbandoned"), true, "the Oathpact flag should be set");
});

test("the full eight-chapter campaign can be played start to finish", () => {
  const game = newGame();
  let campaignDone = false;
  const completedOrder = [];
  game.onChapterComplete = (id) => {
    completedOrder.push(id);
    const next = game.progress.nextChapter();
    if (next) game.startChapter(next);
  };
  game.onCampaignComplete = () => {
    campaignDone = true;
  };

  game.startChapter(game.chapterOrder[0]);
  playUntil(game, () => campaignDone, { budget: 20000 });

  assert.equal(campaignDone, true, "the campaign should reach its ending");
  assert.deepEqual(
    completedOrder,
    ["prelude", "szeth", "kaladin", "shallan", "amaram", "dalinar", "assassin", "tower"],
    "every chapter should complete in order"
  );
  assert.equal(game.progress.isCampaignComplete(), true);
});

test("progress persists across a save/restore", () => {
  const backend = new MemoryBackend();
  const g1 = new Game({ canvas: makeFakeCanvas(), chapters: CHAPTERS, saveBackend: backend });
  g1.progress.complete("prelude");
  g1.persist();
  const g2 = new Game({ canvas: makeFakeCanvas(), chapters: CHAPTERS, saveBackend: backend });
  assert.equal(g2.restore(), true);
  assert.equal(g2.progress.isCompleted("prelude"), true);
  assert.equal(g2.progress.isUnlocked("szeth"), true);
});
