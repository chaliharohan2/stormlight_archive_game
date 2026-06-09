import test from "node:test";
import assert from "node:assert/strict";
import { DialogueRunner } from "../src/core/dialogue.js";

const tree = {
  start: { id: "start", speaker: "Syl", text: "You're alive.", next: "ask" },
  ask: {
    id: "ask",
    speaker: "Syl",
    text: "Will you carry the bridge again?",
    choices: [
      { text: "Yes.", next: "resolve", onSelect: (ctx) => ctx.setFlag("resolved", true) },
      { text: "I can't.", next: "despair" },
      {
        text: "[Stormlight] Fly.",
        next: "fly",
        condition: (flags) => flags.knowsLashing === true,
      },
    ],
  },
  resolve: { id: "resolve", speaker: "Kaladin", text: "Life before death.", end: true },
  despair: { id: "despair", speaker: "Kaladin", text: "...", end: true },
  fly: { id: "fly", speaker: "Kaladin", text: "I rise.", end: true },
};

test("linear advance runs onEnter and follows next", () => {
  const r = new DialogueRunner(tree);
  const first = r.start("start");
  assert.equal(first.speaker, "Syl");
  assert.equal(first.text, "You're alive.");
  const second = r.advance();
  assert.equal(second.id, "ask");
  assert.equal(second.hasChoices, true);
});

test("hidden choices are filtered by condition", () => {
  const r = new DialogueRunner(tree, { flags: { knowsLashing: false } });
  r.start("ask");
  assert.equal(r.current().choices.length, 2);

  const r2 = new DialogueRunner(tree, { flags: { knowsLashing: true } });
  r2.start("ask");
  assert.equal(r2.current().choices.length, 3);
});

test("choosing applies onSelect effects and advances", () => {
  const flags = {};
  const r = new DialogueRunner(tree, { flags });
  r.start("ask");
  const res = r.choose(0);
  assert.equal(res.id, "resolve");
  assert.equal(flags.resolved, true);
  assert.equal(res.end, true);
  assert.equal(r.isComplete(), true);
});

test("awaitingChoice reflects choice nodes", () => {
  const r = new DialogueRunner(tree);
  r.start("start");
  assert.equal(r.awaitingChoice(), false);
  r.advance();
  assert.equal(r.awaitingChoice(), true);
});

test("advancing a terminal node ends the dialogue", () => {
  const r = new DialogueRunner(tree);
  r.start("resolve");
  assert.equal(r.isComplete(), true);
  assert.equal(r.advance(), null);
});

test("choosing with the wrong index or no choices throws", () => {
  const r = new DialogueRunner(tree);
  r.start("start");
  assert.throws(() => r.choose(0)); // start has no choices
  r.advance();
  assert.throws(() => r.choose(99));
});

test("unknown start node throws", () => {
  const r = new DialogueRunner(tree);
  assert.throws(() => r.start("nope"));
});
