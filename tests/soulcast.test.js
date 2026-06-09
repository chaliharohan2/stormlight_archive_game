import test from "node:test";
import assert from "node:assert/strict";
import { SoulcastPuzzle, makePuzzleSet } from "../src/core/soulcast.js";

// A reusable recipe: turn a stone wall into quartz with a Diamond.
function diamondPuzzle(overrides = {}) {
  return new SoulcastPuzzle({
    from: "Stone wall",
    to: "Quartz",
    gem: "Diamond",
    gemOptions: ["Diamond", "Ruby", "Topaz"],
    resistance: 100,
    ...overrides,
  });
}

test("correct gem + enough Stormlight transforms the object", () => {
  const p = diamondPuzzle();
  assert.equal(p.selectGem("Diamond"), true);
  // Channel more than the resistance to drive it to zero.
  const state = p.push(120);
  assert.equal(state.transformed, true);
  assert.equal(state.resistance, 0);
  assert.equal(p.isSolved(), true);
});

test("correct gem solves over several smaller pushes", () => {
  const p = diamondPuzzle();
  p.selectGem("Diamond");
  p.push(40);
  assert.equal(p.isSolved(), false);
  assert.equal(p.resistance, 60);
  p.push(40);
  assert.equal(p.resistance, 20);
  p.push(40); // overshoots, clamps to 0
  assert.equal(p.resistance, 0);
  assert.equal(p.isSolved(), true);
});

test("wrong gem makes no progress and backlash never exceeds max resistance", () => {
  const p = diamondPuzzle({ wrongBacklash: 8 });
  p.selectGem("Ruby"); // wrong Essence
  const before = p.resistance;
  p.push(50);
  // Resistance went UP (backlash), not down, so no progress was made.
  assert.ok(p.resistance >= before);
  assert.equal(p.isSolved(), false);
  // Hammering the wrong gem can never push past the original max.
  for (let i = 0; i < 50; i++) p.push(50);
  assert.equal(p.resistance, p.maxResistance);
  assert.ok(p.resistance <= 100);
});

test("push with no gem selected does nothing", () => {
  const p = diamondPuzzle();
  const before = p.resistance;
  const state = p.push(100);
  assert.equal(state.resistance, before);
  assert.equal(state.transformed, false);
  assert.equal(p.isSolved(), false);
});

test("selectGem rejects a gem not among the options", () => {
  const p = diamondPuzzle();
  assert.equal(p.selectGem("Emerald"), false);
  assert.equal(p.selectedGem, null);
});

test("progress() stays in [0,1] and rises with correct pushes", () => {
  const p = diamondPuzzle();
  assert.equal(p.progress(), 0);
  p.selectGem("Diamond");
  p.push(25);
  const mid = p.progress();
  assert.ok(mid > 0 && mid < 1);
  p.push(25);
  assert.ok(p.progress() > mid);
  p.push(100); // finish
  assert.equal(p.progress(), 1);
});

test("reset restores resistance and clears state", () => {
  const p = diamondPuzzle();
  p.selectGem("Diamond");
  p.push(120);
  assert.equal(p.isSolved(), true);
  p.reset();
  assert.equal(p.resistance, p.maxResistance);
  assert.equal(p.transformed, false);
  assert.equal(p.selectedGem, null);
  assert.equal(p.progress(), 0);
});

test("makePuzzleSet returns SoulcastPuzzle instances including the correct gem", () => {
  const set = makePuzzleSet([
    { from: "Bloodstained sand", to: "Smoke", gem: "Smokestone" },
    { from: "Goblet", to: "Crystal", gem: "Diamond" },
  ]);
  assert.equal(set.length, 2);
  for (const p of set) {
    assert.ok(p instanceof SoulcastPuzzle);
    // gemOptions were auto-generated but must always contain the answer.
    assert.ok(p.gemOptions.includes(p.gem));
    // And should offer real distractors (more than one choice).
    assert.ok(p.gemOptions.length > 1);
  }
});

test("makePuzzleSet honors explicit gemOptions when provided", () => {
  const [p] = makePuzzleSet([
    { from: "Goblet", to: "Crystal", gem: "Diamond", gemOptions: ["Diamond", "Garnet"] },
  ]);
  assert.deepEqual(p.gemOptions, ["Diamond", "Garnet"]);
});
