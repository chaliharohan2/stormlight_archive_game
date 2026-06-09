// Pure tilemap model. Levels are authored as arrays of equal-length strings
// plus a legend mapping each character to tile properties. This module turns
// that into a grid, a list of solid collision rects, and lookup helpers — all
// without touching the DOM, so it is unit-testable.

/**
 * @typedef {Object} TileDef
 * @property {boolean} [solid]
 * @property {string} [color]
 * @property {string} [type]   - semantic tag (floor, wall, chasm, bridge...)
 *
 * @typedef {Object} TileMap
 * @property {number} cols
 * @property {number} rows
 * @property {number} tileSize
 * @property {number} width    - pixels
 * @property {number} height   - pixels
 * @property {string[][]} grid - grid[y][x] = char
 * @property {Object<string,TileDef>} legend
 * @property {{x:number,y:number,w:number,h:number}[]} solids
 */

const DEFAULT_LEGEND = {
  "#": { solid: true, type: "wall" },
  ".": { solid: false, type: "floor" },
  " ": { solid: false, type: "floor" },
  "~": { solid: false, type: "chasm", deadly: true },
  "=": { solid: false, type: "bridge" },
};

/**
 * @param {string[]} rows
 * @param {Object} [opts]
 * @param {Object<string,TileDef>} [opts.legend]
 * @param {number} [opts.tileSize]
 * @returns {TileMap}
 */
export function parseTileMap(rows, opts = {}) {
  const tileSize = opts.tileSize ?? 32;
  const legend = { ...DEFAULT_LEGEND, ...(opts.legend ?? {}) };
  if (!Array.isArray(rows) || rows.length === 0) {
    throw new Error("parseTileMap: rows must be a non-empty array");
  }
  const cols = Math.max(...rows.map((r) => r.length));
  const grid = rows.map((r) => {
    const chars = r.split("");
    while (chars.length < cols) chars.push(" ");
    return chars;
  });

  const solids = [];
  for (let y = 0; y < grid.length; y++) {
    for (let x = 0; x < cols; x++) {
      const def = legend[grid[y][x]];
      if (def?.solid) {
        solids.push({ x: x * tileSize, y: y * tileSize, w: tileSize, h: tileSize });
      }
    }
  }

  return {
    cols,
    rows: grid.length,
    tileSize,
    width: cols * tileSize,
    height: grid.length * tileSize,
    grid,
    legend,
    solids,
  };
}

/** Tile definition at a pixel coordinate (or null if out of bounds). */
export function tileDefAt(map, px, py) {
  const tx = Math.floor(px / map.tileSize);
  const ty = Math.floor(py / map.tileSize);
  if (ty < 0 || ty >= map.rows || tx < 0 || tx >= map.cols) return null;
  return map.legend[map.grid[ty][tx]] ?? null;
}

/** True if the pixel coordinate lies on a tile flagged deadly (e.g. chasm). */
export function isDeadlyAt(map, px, py) {
  return !!tileDefAt(map, px, py)?.deadly;
}
