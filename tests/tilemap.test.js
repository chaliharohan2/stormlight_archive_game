import test from "node:test";
import assert from "node:assert/strict";
import { parseTileMap, tileDefAt, isDeadlyAt } from "../src/core/tilemap.js";

const ROWS = [
  "#####",
  "#...#",
  "#.~.#",
  "#...#",
  "#####",
];

test("parseTileMap computes dimensions and solids", () => {
  const map = parseTileMap(ROWS, { tileSize: 10 });
  assert.equal(map.cols, 5);
  assert.equal(map.rows, 5);
  assert.equal(map.width, 50);
  assert.equal(map.height, 50);
  // Border walls: perimeter of 5x5 = 16 tiles.
  assert.equal(map.solids.length, 16);
});

test("ragged rows are padded to equal width", () => {
  const map = parseTileMap(["##", "#"], { tileSize: 8 });
  assert.equal(map.cols, 2);
  assert.equal(map.grid[1].length, 2);
  assert.equal(map.grid[1][1], " ");
});

test("tileDefAt resolves type and out-of-bounds", () => {
  const map = parseTileMap(ROWS, { tileSize: 10 });
  assert.equal(tileDefAt(map, 5, 5).type, "wall");
  assert.equal(tileDefAt(map, 15, 15).type, "floor");
  assert.equal(tileDefAt(map, -1, -1), null);
  assert.equal(tileDefAt(map, 999, 999), null);
});

test("isDeadlyAt flags chasm tiles", () => {
  const map = parseTileMap(ROWS, { tileSize: 10 });
  // The '~' is at grid col 2, row 2 => pixel (20..30, 20..30).
  assert.equal(isDeadlyAt(map, 25, 25), true);
  assert.equal(isDeadlyAt(map, 15, 15), false);
});

test("custom legend overrides defaults", () => {
  const map = parseTileMap(["XX"], {
    tileSize: 4,
    legend: { X: { solid: true, type: "crystal" } },
  });
  assert.equal(map.solids.length, 2);
  assert.equal(tileDefAt(map, 0, 0).type, "crystal");
});

test("empty input throws", () => {
  assert.throws(() => parseTileMap([]));
});
