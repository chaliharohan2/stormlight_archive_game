// Inventory + spheres (the currency/light source of Roshar). Spheres double as
// money and as Stormlight batteries, so we track a "spheres" charge total
// separately from generic stackable items.

export class Inventory {
  constructor(data = {}) {
    /** @type {Object<string, number>} itemId -> count */
    this.items = { ...(data.items ?? {}) };
    /** Total Stormlight charge held across carried spheres. */
    this.spheres = data.spheres ?? 0;
  }

  add(itemId, count = 1) {
    this.items[itemId] = (this.items[itemId] ?? 0) + count;
    return this.items[itemId];
  }

  /** Remove up to `count`; returns the number actually removed. */
  remove(itemId, count = 1) {
    const have = this.items[itemId] ?? 0;
    const removed = Math.min(have, count);
    const left = have - removed;
    if (left > 0) this.items[itemId] = left;
    else delete this.items[itemId];
    return removed;
  }

  has(itemId, count = 1) {
    return (this.items[itemId] ?? 0) >= count;
  }

  count(itemId) {
    return this.items[itemId] ?? 0;
  }

  /** Add charged spheres (currency + light). */
  addSpheres(charge) {
    this.spheres += Math.max(0, charge);
    return this.spheres;
  }

  /** Spend spheres; returns true if affordable. */
  spendSpheres(charge) {
    if (this.spheres < charge) return false;
    this.spheres -= charge;
    return true;
  }

  list() {
    return Object.entries(this.items).map(([id, count]) => ({ id, count }));
  }

  toJSON() {
    return { items: { ...this.items }, spheres: this.spheres };
  }

  static fromJSON(data) {
    return new Inventory(data ?? {});
  }
}
