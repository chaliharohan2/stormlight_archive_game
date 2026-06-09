// Deterministic, seedable pseudo-random number generator.
// Using mulberry32 — small, fast, and good enough for game logic.
// Deterministic seeding lets the test suite assert exact outcomes.

export class RNG {
  /** @param {number} seed - any 32-bit integer seed */
  constructor(seed = 0x9e3779b9) {
    // Force to unsigned 32-bit.
    this._state = seed >>> 0;
  }

  /** Returns a float in [0, 1). */
  next() {
    let t = (this._state += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  /** Returns an integer in [min, max] inclusive. */
  int(min, max) {
    if (max < min) [min, max] = [max, min];
    return min + Math.floor(this.next() * (max - min + 1));
  }

  /** Returns a float in [min, max). */
  float(min, max) {
    return min + this.next() * (max - min);
  }

  /** Returns true with probability p (0..1). */
  chance(p) {
    return this.next() < p;
  }

  /** Picks a random element from a non-empty array. */
  pick(array) {
    if (!array || array.length === 0) return undefined;
    return array[this.int(0, array.length - 1)];
  }

  /** Returns a shuffled copy of the array (Fisher–Yates). */
  shuffle(array) {
    const a = array.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = this.int(0, i);
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  /** Snapshot the internal state for save/restore. */
  getState() {
    return this._state;
  }

  setState(state) {
    this._state = state >>> 0;
  }
}

export function makeRNG(seed) {
  return new RNG(seed);
}
