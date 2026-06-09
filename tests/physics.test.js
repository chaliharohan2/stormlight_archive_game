import test from "node:test";
import assert from "node:assert/strict";
import {
  aabbIntersect,
  pointInRect,
  distance,
  clamp,
  moveWithCollision,
  normalizeTo,
} from "../src/core/physics.js";

test("aabbIntersect detects overlap and separation", () => {
  const a = { x: 0, y: 0, w: 10, h: 10 };
  assert.equal(aabbIntersect(a, { x: 5, y: 5, w: 10, h: 10 }), true);
  assert.equal(aabbIntersect(a, { x: 20, y: 0, w: 10, h: 10 }), false);
  // Edge-touching is not overlap.
  assert.equal(aabbIntersect(a, { x: 10, y: 0, w: 5, h: 5 }), false);
});

test("pointInRect", () => {
  const r = { x: 0, y: 0, w: 10, h: 10 };
  assert.equal(pointInRect(5, 5, r), true);
  assert.equal(pointInRect(0, 0, r), true);
  assert.equal(pointInRect(11, 5, r), false);
});

test("distance + clamp", () => {
  assert.equal(distance(0, 0, 3, 4), 5);
  assert.equal(clamp(5, 0, 10), 5);
  assert.equal(clamp(-1, 0, 10), 0);
  assert.equal(clamp(99, 0, 10), 10);
});

test("moveWithCollision slides along a wall on X", () => {
  const box = { x: 0, y: 0, w: 10, h: 10 };
  const wall = { x: 15, y: 0, w: 10, h: 10 };
  const res = moveWithCollision(box, 20, 0, [wall]);
  // Should stop flush against the wall's left edge (x = 5).
  assert.equal(res.x, 5);
  assert.equal(res.collidedX, true);
});

test("moveWithCollision stops on Y from below", () => {
  const box = { x: 0, y: 20, w: 10, h: 10 };
  const ceiling = { x: 0, y: 0, w: 10, h: 10 };
  const res = moveWithCollision(box, 0, -20, [ceiling]);
  assert.equal(res.y, 10);
  assert.equal(res.collidedY, true);
});

test("moveWithCollision free movement when no solids", () => {
  const box = { x: 0, y: 0, w: 10, h: 10 };
  const res = moveWithCollision(box, 5, 7, []);
  assert.deepEqual({ x: res.x, y: res.y }, { x: 5, y: 7 });
  assert.equal(res.collidedX, false);
  assert.equal(res.collidedY, false);
});

test("normalizeTo returns a unit vector", () => {
  const v = normalizeTo(0, 0, 0, 10);
  assert.ok(Math.abs(v.x - 0) < 1e-9);
  assert.ok(Math.abs(v.y - 1) < 1e-9);
  const d = normalizeTo(0, 0, 3, 4);
  assert.ok(Math.abs(Math.hypot(d.x, d.y) - 1) < 1e-9);
});
