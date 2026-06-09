import test from "node:test";
import assert from "node:assert/strict";
import { Input } from "../src/engine/input.js";

// In Node there is no window, so no listeners attach; we drive it manually.

test("isDown reflects held action keys", () => {
  const inp = new Input(null);
  inp.pressCode("KeyW");
  assert.equal(inp.isDown("up"), true);
  assert.equal(inp.isDown("down"), false);
  inp.releaseCode("KeyW");
  assert.equal(inp.isDown("up"), false);
});

test("pressed is edge-triggered and cleared by endFrame", () => {
  const inp = new Input(null);
  inp.pressCode("Space");
  assert.equal(inp.pressed("attack"), true);
  inp.endFrame();
  // Still held, but no longer 'pressed' this frame.
  assert.equal(inp.pressed("attack"), false);
  assert.equal(inp.isDown("attack"), true);
});

test("axis normalizes diagonals", () => {
  const inp = new Input(null);
  inp.pressCode("KeyD");
  inp.pressCode("KeyS");
  const a = inp.axis();
  assert.ok(Math.abs(Math.hypot(a.x, a.y) - 1) < 1e-9);
  assert.ok(a.x > 0 && a.y > 0);
});

test("axis is zero with no input", () => {
  const inp = new Input(null);
  assert.deepEqual(inp.axis(), { x: 0, y: 0 });
});

test("number actions map to digit codes", () => {
  const inp = new Input(null);
  inp.pressCode("Digit2");
  assert.equal(inp.pressed("num2"), true);
});
