import test from "node:test";
import assert from "node:assert/strict";
import { RNG } from "../src/core/rng.js";

test("rng is deterministic for a given seed", () => {
  const a = new RNG(12345);
  const b = new RNG(12345);
  for (let i = 0; i < 100; i++) {
    assert.equal(a.next(), b.next());
  }
});

test("rng different seeds diverge", () => {
  const a = new RNG(1);
  const b = new RNG(2);
  assert.notEqual(a.next(), b.next());
});

test("next() stays in [0,1)", () => {
  const r = new RNG(7);
  for (let i = 0; i < 1000; i++) {
    const v = r.next();
    assert.ok(v >= 0 && v < 1, `value out of range: ${v}`);
  }
});

test("int() respects inclusive bounds", () => {
  const r = new RNG(99);
  const seen = new Set();
  for (let i = 0; i < 2000; i++) {
    const v = r.int(1, 6);
    assert.ok(Number.isInteger(v));
    assert.ok(v >= 1 && v <= 6);
    seen.add(v);
  }
  assert.equal(seen.size, 6, "should hit every face of a d6");
});

test("chance(0) never true, chance(1) always true", () => {
  const r = new RNG(3);
  for (let i = 0; i < 50; i++) {
    assert.equal(r.chance(0), false);
    assert.equal(r.chance(1), true);
  }
});

test("pick returns an element of the array", () => {
  const r = new RNG(42);
  const arr = ["a", "b", "c", "d"];
  for (let i = 0; i < 50; i++) {
    assert.ok(arr.includes(r.pick(arr)));
  }
  assert.equal(r.pick([]), undefined);
});

test("shuffle preserves multiset and does not mutate input", () => {
  const r = new RNG(5);
  const input = [1, 2, 3, 4, 5, 6];
  const out = r.shuffle(input);
  assert.deepEqual(input, [1, 2, 3, 4, 5, 6]);
  assert.deepEqual(out.slice().sort((a, b) => a - b), input);
});

test("state save/restore reproduces sequence", () => {
  const r = new RNG(1000);
  r.next();
  r.next();
  const state = r.getState();
  const futureA = [r.next(), r.next(), r.next()];
  r.setState(state);
  const futureB = [r.next(), r.next(), r.next()];
  assert.deepEqual(futureA, futureB);
});
