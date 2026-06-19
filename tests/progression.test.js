import test from "node:test";
import assert from "node:assert/strict";
import { GameProgress } from "../src/core/progression.js";

const ORDER = ["prelude", "szeth", "kaladin", "shallan", "amaram", "dalinar", "assassin", "tower"];

test("only the first chapter is unlocked at start", () => {
  const p = new GameProgress(ORDER);
  assert.equal(p.isUnlocked("prelude"), true);
  assert.equal(p.isUnlocked("szeth"), false);
  assert.equal(p.nextChapter(), "prelude");
});

test("completing a chapter unlocks the next", () => {
  const p = new GameProgress(ORDER);
  p.complete("prelude");
  assert.equal(p.isCompleted("prelude"), true);
  assert.equal(p.isUnlocked("szeth"), true);
  assert.equal(p.nextChapter(), "szeth");
});

test("completing the final chapter finishes the campaign", () => {
  const p = new GameProgress(ORDER);
  for (const id of ORDER) p.complete(id);
  assert.equal(p.isCampaignComplete(), true);
  assert.equal(p.nextChapter(), null);
});

test("flags set/get", () => {
  const p = new GameProgress(ORDER);
  assert.equal(p.hasFlag("savedDalinar"), false);
  p.setFlag("savedDalinar");
  assert.equal(p.hasFlag("savedDalinar"), true);
  p.setFlag("bridgesLost", 3);
  assert.equal(p.getFlag("bridgesLost"), 3);
});

test("serializes and restores progress", () => {
  const p = new GameProgress(ORDER);
  p.complete("prelude");
  p.setFlag("metSyl");
  const restored = GameProgress.fromJSON(ORDER, p.toJSON());
  assert.equal(restored.isCompleted("prelude"), true);
  assert.equal(restored.isUnlocked("szeth"), true);
  assert.equal(restored.hasFlag("metSyl"), true);
});
