// Pure 2D physics helpers: axis-aligned bounding boxes, collision and
// swept movement against a set of solid rectangles. No rendering here.

/** @typedef {{x:number,y:number,w:number,h:number}} Rect */

/** True if two rectangles overlap (touching edges do NOT count as overlap). */
export function aabbIntersect(a, b) {
  return (
    a.x < b.x + b.w &&
    a.x + a.w > b.x &&
    a.y < b.y + b.h &&
    a.y + a.h > b.y
  );
}

/** True if point (px,py) lies inside rect r. */
export function pointInRect(px, py, r) {
  return px >= r.x && px <= r.x + r.w && py >= r.y && py <= r.y + r.h;
}

/** Euclidean distance between two points. */
export function distance(ax, ay, bx, by) {
  const dx = bx - ax;
  const dy = by - ay;
  return Math.hypot(dx, dy);
}

/** Clamp v into [min, max]. */
export function clamp(v, min, max) {
  return v < min ? min : v > max ? max : v;
}

/**
 * Move a rectangle by (dx, dy), resolving collisions against solids one axis
 * at a time so the entity slides along walls instead of sticking.
 *
 * @param {Rect} box   - current bounding box (not mutated)
 * @param {number} dx
 * @param {number} dy
 * @param {Rect[]} solids
 * @returns {{x:number, y:number, collidedX:boolean, collidedY:boolean}}
 */
export function moveWithCollision(box, dx, dy, solids) {
  let { x, y } = box;
  const { w, h } = box;
  let collidedX = false;
  let collidedY = false;

  // Resolve X axis.
  x += dx;
  for (const s of solids) {
    const probe = { x, y, w, h };
    if (aabbIntersect(probe, s)) {
      collidedX = true;
      if (dx > 0) x = s.x - w;
      else if (dx < 0) x = s.x + s.w;
    }
  }

  // Resolve Y axis.
  y += dy;
  for (const s of solids) {
    const probe = { x, y, w, h };
    if (aabbIntersect(probe, s)) {
      collidedY = true;
      if (dy > 0) y = s.y - h;
      else if (dy < 0) y = s.y + s.h;
    }
  }

  return { x, y, collidedX, collidedY };
}

/** Returns a unit vector pointing from (ax,ay) toward (bx,by). */
export function normalizeTo(ax, ay, bx, by) {
  const dx = bx - ax;
  const dy = by - ay;
  const len = Math.hypot(dx, dy) || 1;
  return { x: dx / len, y: dy / len };
}
