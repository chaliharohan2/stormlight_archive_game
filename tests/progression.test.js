import test from "node:test";
import assert from "node:assert/strict";
import { GameProgress } from "../src/core/progression.js";

const ORDER = ["prologue", "kaladin", "shallan", "dalinar", "tower", "finale"];

test("only the first chapter is unlocked at start", () => {
  const p = new GameProgress(ORDER);
  assert.equal(p.isUnlocked("prologue"), true);
  assert.equal(p.isUnlocked("kaladin"), false);
  assert.equal(p.nextChapter(), "prologue");
});

test("completing a chapter unlocks the next", () => {
  const p = new GameProgress(ORDER);
  p.complete("prologue");
  assert.equal(p.isCompleted("prologue"), true);
  assert.equal(p.isUnlocked("kaladin"), true);
  assert.equal(p.nextChapter(), "kaladin");
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
  p.complete("prologue");
  p.setFlag("metSyl");
  const restored = GameProgress.fromJSON(ORDER, p.toJSON());
  assert.equal(restored.isCompleted("prologue"), true);
  assert.equal(restored.isUnlocked("kaladin"), true);
  assert.equal(restored.hasFlag("metSyl"), true);
});
