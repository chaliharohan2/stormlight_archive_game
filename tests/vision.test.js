import test from "node:test";
import assert from "node:assert/strict";
import { VisionSequence } from "../src/core/vision.js";

// Small linear fixture: three beats, no branching. Best run = 3+5+2 = 10.
const linear = () => [
  {
    id: "a",
    setting: "Plains",
    text: "Choose.",
    choices: [
      { text: "Honor", honor: 3, response: "Good." },
      { text: "Expedience", honor: -2 },
    ],
  },
  {
    id: "b",
    setting: "Keep",
    text: "Again.",
    choices: [
      { text: "Best", honor: 5 },
      { text: "Worst", honor: -5 },
    ],
  },
  {
    id: "c",
    setting: "Storm",
    text: "Last.",
    choices: [
      { text: "Best", honor: 2 },
      { text: "Worst", honor: 0 },
    ],
  },
];

// Branching fixture: choosing the branch in "start" jumps past "skipped".
const branching = () => [
  {
    id: "start",
    setting: "Fork",
    text: "Branch?",
    choices: [
      { text: "Jump to end", honor: 1, next: "endbeat" },
      { text: "Continue linearly", honor: 1 },
    ],
  },
  {
    id: "skipped",
    setting: "Skipped",
    text: "Should be skipped on branch.",
    choices: [{ text: "x", honor: 99 }],
  },
  {
    id: "endbeat",
    setting: "End",
    text: "Final.",
    choices: [{ text: "done", honor: 1 }],
  },
];

test("linear progression walks beats in array order", () => {
  const v = new VisionSequence(linear());
  assert.equal(v.current().id, "a");
  v.choose(0);
  assert.equal(v.current().id, "b");
  v.choose(0);
  assert.equal(v.current().id, "c");
  assert.equal(v.isComplete(), false);
  v.choose(0);
  assert.equal(v.current(), null);
  assert.equal(v.isComplete(), true);
});

test("honor accumulates from chosen choices", () => {
  const v = new VisionSequence(linear());
  let res = v.choose(0); // +3
  assert.equal(res.honor, 3);
  assert.equal(res.response, "Good.");
  res = v.choose(1); // -5
  assert.equal(res.honor, -2);
  res = v.choose(0); // +2
  assert.equal(res.honor, 0);
});

test("response defaults to null when the choice has none", () => {
  const v = new VisionSequence(linear());
  const res = v.choose(1); // "Expedience" has no response
  assert.equal(res.response, null);
});

test("maxHonor sums each beat's best choice", () => {
  const v = new VisionSequence(linear());
  assert.equal(v.maxHonor(), 10); // 3 + 5 + 2
});

test("choice.next branches to the target beat by id", () => {
  const v = new VisionSequence(branching());
  v.choose(0); // jump to "endbeat", skipping "skipped"
  assert.equal(v.current().id, "endbeat");
  v.choose(0);
  assert.equal(v.isComplete(), true);
});

test("omitting next advances linearly (no branch)", () => {
  const v = new VisionSequence(branching());
  v.choose(1); // continue linearly -> "skipped"
  assert.equal(v.current().id, "skipped");
});

test("unknown branch target ends the sequence", () => {
  const beats = [
    { id: "only", setting: "s", text: "t", choices: [{ text: "go", honor: 1, next: "nowhere" }] },
  ];
  const v = new VisionSequence(beats);
  const res = v.choose(0);
  assert.equal(res.done, true);
  assert.equal(v.isComplete(), true);
});

test("best choices yield united=true; worst yield united=false", () => {
  const best = new VisionSequence(linear());
  best.choose(0);
  best.choose(0);
  best.choose(0);
  assert.equal(best.honor, 10);
  assert.equal(best.result().united, true);

  const worst = new VisionSequence(linear());
  worst.choose(1);
  worst.choose(1);
  worst.choose(1);
  assert.equal(worst.honor, -7);
  assert.equal(worst.result().united, false);
});

test("unityThreshold derives from 60% of maxHonor by default", () => {
  const v = new VisionSequence(linear());
  assert.equal(v.maxHonor(), 10);
  assert.equal(v.unityThreshold, 6); // round(10 * 0.6)
});

test("explicit unityThreshold overrides the default", () => {
  // A modest honor 3 run would fail the default bar (6) but clears an explicit 1.
  const v = new VisionSequence(linear(), { unityThreshold: 1 });
  assert.equal(v.unityThreshold, 1);
  v.choose(0); // +3
  v.choose(1); // -5
  v.choose(0); // +2 -> honor 0, below 1
  assert.equal(v.result().united, false);

  const v2 = new VisionSequence(linear(), { unityThreshold: 1 });
  v2.choose(0); // +3 >= 1
  v2.choose(0); // +5
  v2.choose(1); // +0 -> honor 8 >= 1
  assert.equal(v2.result().united, true);
});

test("result rating bands map to honor", () => {
  // maxHonor = 10 -> Radiant>=9, Honorable>=6 (threshold), Wavering>=3, else Fallen.
  const rate = (picks) => {
    const v = new VisionSequence(linear());
    picks.forEach((p) => v.choose(p));
    return v.result().rating;
  };
  assert.equal(rate([0, 0, 0]), "Radiant"); // honor 10 (>= 9)
  assert.equal(rate([0, 0, 1]), "Honorable"); // honor 8 (>= 6 threshold)
  assert.equal(rate([1, 0, 0]), "Wavering"); // honor 5 (>= 3)
  assert.equal(rate([1, 1, 1]), "Fallen"); // honor -7
});

test("choose throws when sequence is complete", () => {
  const v = new VisionSequence(linear());
  v.choose(0);
  v.choose(0);
  v.choose(0);
  assert.equal(v.isComplete(), true);
  assert.throws(() => v.choose(0));
});

test("choose throws on an invalid choice index", () => {
  const v = new VisionSequence(linear());
  assert.throws(() => v.choose(99));
});

test("choices() returns current choices and [] when complete", () => {
  const v = new VisionSequence(linear());
  assert.equal(v.choices().length, 2);
  v.choose(0);
  v.choose(0);
  v.choose(0);
  assert.deepEqual(v.choices(), []);
});

test("history records each decision", () => {
  const v = new VisionSequence(linear());
  v.choose(0);
  v.choose(1);
  assert.equal(v.history.length, 2);
  assert.equal(v.history[0].beatId, "a");
  assert.equal(v.history[0].choiceIndex, 0);
  assert.equal(v.history[1].honor, -5);
});

test("reset restores initial state", () => {
  const v = new VisionSequence(linear());
  v.choose(0);
  v.choose(0);
  assert.notEqual(v.honor, 0);
  v.reset();
  assert.equal(v.index, 0);
  assert.equal(v.honor, 0);
  assert.equal(v.done, false);
  assert.deepEqual(v.history, []);
  assert.equal(v.current().id, "a");
});

test("constructor rejects an empty beats array", () => {
  assert.throws(() => new VisionSequence([]));
});
