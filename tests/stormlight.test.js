import test from "node:test";
import assert from "node:assert/strict";
import { Stormlight, POWER_COSTS } from "../src/core/stormlight.js";

test("starts empty and not infused", () => {
  const s = new Stormlight({ capacity: 100 });
  assert.equal(s.amount, 0);
  assert.equal(s.infused, false);
  assert.equal(s.fraction, 0);
});

test("absorb fills up to capacity and reports overflow", () => {
  const s = new Stormlight({ capacity: 100 });
  assert.equal(s.absorb(40), 40);
  assert.equal(s.amount, 40);
  assert.equal(s.infused, true);
  // Only 60 room left even though 100 offered.
  assert.equal(s.absorb(100), 60);
  assert.equal(s.amount, 100);
  assert.equal(s.fraction, 1);
});

test("spend respects affordability", () => {
  const s = new Stormlight({ capacity: 100, amount: 30 });
  assert.equal(s.canAfford(25), true);
  assert.equal(s.spend(25), true);
  assert.equal(s.amount, 5);
  assert.equal(s.spend(25), false);
  assert.equal(s.amount, 5);
});

test("usePower deducts the catalogued cost", () => {
  const s = new Stormlight({ capacity: 100, amount: 100 });
  assert.equal(s.usePower("basicLashing"), true);
  assert.equal(s.amount, 100 - POWER_COSTS.basicLashing);
  assert.throws(() => s.usePower("nonexistent"));
});

test("tick leaks stormlight over time and never goes negative", () => {
  const s = new Stormlight({ capacity: 100, amount: 10, decayPerSecond: 4 });
  s.tick(1);
  assert.equal(s.amount, 6);
  s.tick(10); // would go to -34, clamps at 0
  assert.equal(s.amount, 0);
  assert.equal(s.infused, false);
});

test("serializes round-trip", () => {
  const s = new Stormlight({ capacity: 80, amount: 25, decayPerSecond: 3 });
  const restored = Stormlight.fromJSON(s.toJSON());
  assert.equal(restored.capacity, 80);
  assert.equal(restored.amount, 25);
  assert.equal(restored.decayPerSecond, 3);
});
