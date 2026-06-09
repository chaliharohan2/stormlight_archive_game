import test from "node:test";
import assert from "node:assert/strict";
import { SaveManager, MemoryBackend } from "../src/engine/storage.js";

test("save/load round-trips JSON state", () => {
  const sm = new SaveManager(new MemoryBackend());
  assert.equal(sm.hasSave(), false);
  assert.equal(sm.load(), null);
  sm.save({ progress: { completed: ["prologue"] } });
  assert.equal(sm.hasSave(), true);
  assert.deepEqual(sm.load(), { progress: { completed: ["prologue"] } });
});

test("clear removes the save", () => {
  const sm = new SaveManager(new MemoryBackend());
  sm.save({ a: 1 });
  sm.clear();
  assert.equal(sm.hasSave(), false);
  assert.equal(sm.load(), null);
});

test("corrupt data loads as null instead of throwing", () => {
  const backend = new MemoryBackend();
  backend.setItem("wok_save_v1", "{not valid json");
  const sm = new SaveManager(backend);
  assert.equal(sm.load(), null);
});
