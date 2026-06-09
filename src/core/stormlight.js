// Stormlight: the magic resource of Roshar. Characters draw it from infused
// spheres, hold it (glowing/"Infused"), spend it on powers (Lashings, healing),
// and lose it slowly as it leaks away. This module is the pure model; the
// scenes read it to drive visuals and abilities.

import { clamp } from "./physics.js";

/** Costs are expressed in Stormlight units; capacity tunes how much one holds. */
export const POWER_COSTS = {
  basicLashing: 25, // a Basic Lashing (stick things together / to surfaces)
  fullLashing: 15, // a Full Lashing (gravity along a direction) per pulse
  reverseLashing: 20,
  healWound: 30, // surge of Regrowth-like healing
  surgeStep: 8, // momentary super-leap / dash
};

export class Stormlight {
  constructor(opts = {}) {
    this.capacity = opts.capacity ?? 100;
    this.amount = clamp(opts.amount ?? 0, 0, this.capacity);
    // Fraction of current Stormlight lost per second while Infused.
    this.decayPerSecond = opts.decayPerSecond ?? 4;
  }

  get infused() {
    return this.amount > 0;
  }

  /** Fraction full, 0..1 — drives the glow intensity. */
  get fraction() {
    return this.capacity > 0 ? this.amount / this.capacity : 0;
  }

  /**
   * Draw Stormlight from a sphere of the given charge. Returns the amount
   * actually absorbed (a full holder cannot drink more).
   */
  absorb(sphereCharge) {
    const room = this.capacity - this.amount;
    const taken = Math.min(room, Math.max(0, sphereCharge));
    this.amount += taken;
    return taken;
  }

  /** Can the holder currently afford a power? */
  canAfford(cost) {
    return this.amount >= cost;
  }

  /**
   * Spend Stormlight on a power. Returns true if it was affordable and spent.
   */
  spend(cost) {
    if (!this.canAfford(cost)) return false;
    this.amount = clamp(this.amount - cost, 0, this.capacity);
    return true;
  }

  /** Spend by named power from POWER_COSTS. */
  usePower(name) {
    const cost = POWER_COSTS[name];
    if (cost == null) throw new Error(`Unknown power: ${name}`);
    return this.spend(cost);
  }

  /** Advance time by dt seconds, leaking Stormlight away. */
  tick(dt) {
    if (this.amount > 0) {
      this.amount = clamp(this.amount - this.decayPerSecond * dt, 0, this.capacity);
    }
  }

  toJSON() {
    return { capacity: this.capacity, amount: this.amount, decayPerSecond: this.decayPerSecond };
  }

  static fromJSON(data = {}) {
    return new Stormlight(data);
  }
}
