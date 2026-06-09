import test from "node:test";
import assert from "node:assert/strict";
import { Inventory } from "../src/core/inventory.js";

test("add and count items", () => {
  const inv = new Inventory();
  inv.add("spear");
  inv.add("spear", 2);
  assert.equal(inv.count("spear"), 3);
  assert.equal(inv.has("spear", 3), true);
  assert.equal(inv.has("spear", 4), false);
});

test("remove never goes negative and deletes empty stacks", () => {
  const inv = new Inventory();
  inv.add("knobweed", 5);
  assert.equal(inv.remove("knobweed", 2), 2);
  assert.equal(inv.count("knobweed"), 3);
  assert.equal(inv.remove("knobweed", 10), 3); // only 3 left
  assert.equal(inv.has("knobweed"), false);
  assert.deepEqual(inv.list(), []);
});

test("spheres as currency", () => {
  const inv = new Inventory({ spheres: 10 });
  inv.addSpheres(5);
  assert.equal(inv.spheres, 15);
  assert.equal(inv.spendSpheres(20), false);
  assert.equal(inv.spendSpheres(15), true);
  assert.equal(inv.spheres, 0);
});

test("serializes round-trip", () => {
  const inv = new Inventory();
  inv.add("boots");
  inv.addSpheres(7);
  const restored = Inventory.fromJSON(inv.toJSON());
  assert.equal(restored.count("boots"), 1);
  assert.equal(restored.spheres, 7);
});
