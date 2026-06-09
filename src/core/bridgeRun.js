// Pure simulation of Kaladin's signature mechanic: the bridge run.
// Bridge Four sprints a wooden bridge across the Shattered Plains while
// Parshendi archers loose volleys. Crew members die; if too few remain the
// bridge falls. Bracing (leading from the dangerous side) shields the crew
// during a volley at Kaladin's own risk, modelled here as a far lower
// per-member casualty chance while bracing.
//
// DOM-free on purpose: the scene wrapper drives this in real time, while the
// test suite drives it deterministically. All randomness flows through the
// injected RNG so a fixed seed + identical call sequence reproduces outcomes.

import { RNG } from "../core/rng.js";

export class BridgeRun {
  /**
   * @param {Object} [opts]
   * @param {RNG} [opts.rng] - seeded RNG; defaults to a fixed seed for determinism
   * @param {number} [opts.crewSize=24]
   * @param {number} [opts.goalDistance=1000]
   * @param {number} [opts.minCarriers=8] - below this the bridge cannot be carried
   * @param {number} [opts.runSpeed=120] - world units per second
   * @param {number} [opts.volleyInterval=2.0] - seconds between archer volleys
   * @param {number} [opts.baseCasualtyChance=0.18] - per-member death chance, unbraced
   * @param {number} [opts.bracedCasualtyChance=0.05] - per-member death chance, braced
   */
  constructor(opts = {}) {
    this.crewSize = opts.crewSize ?? 24;
    this.goalDistance = opts.goalDistance ?? 1000;
    this.minCarriers = opts.minCarriers ?? 8;
    this.runSpeed = opts.runSpeed ?? 120;
    this.volleyInterval = opts.volleyInterval ?? 2.0;
    this.baseCasualtyChance = opts.baseCasualtyChance ?? 0.18;
    this.bracedCasualtyChance = opts.bracedCasualtyChance ?? 0.05;

    // Remember the seed so reset() can reproduce the exact same run. If the
    // caller passed an RNG we snapshot its current state as the "seed" to
    // restore to, keeping reset() deterministic regardless of source.
    if (opts.rng) {
      this.rng = opts.rng;
      this._seed = opts.rng.getState();
    } else {
      this._seed = 12345;
      this.rng = new RNG(this._seed);
    }

    this._init();
  }

  /** Build the fresh per-run state. Shared by the constructor and reset(). */
  _init() {
    this.distance = 0;
    this.status = "running"; // "running" | "won" | "failed"
    this.casualties = 0;
    this.volleys = 0;
    this._timer = 0; // accumulates dt until a volley fires
    this.crew = [];
    for (let i = 0; i < this.crewSize; i++) {
      this.crew.push({ id: i, alive: true });
    }
  }

  /** @returns {number} count of still-living crew. */
  carriers() {
    let n = 0;
    for (const m of this.crew) if (m.alive) n++;
    return n;
  }

  /**
   * Advance the simulation by `dt` seconds.
   * @param {number} dt - elapsed seconds
   * @param {Object} [opts]
   * @param {boolean} [opts.bracing] - Kaladin is shielding the crew this frame
   * @returns {{distance:number, status:string, casualties:number}} frame summary
   */
  update(dt, opts = {}) {
    if (this.status !== "running") {
      return { distance: this.distance, status: this.status, casualties: 0 };
    }

    // The bridge falls the instant too few carriers remain — checked before
    // moving so a lethal volley last frame ends the run immediately.
    if (this.carriers() < this.minCarriers) {
      this.status = "failed";
      return { distance: this.distance, status: this.status, casualties: 0 };
    }

    this.distance += this.runSpeed * dt;

    let frameCasualties = 0;
    // Multiple volleys can land in one frame if dt is large; loop the timer so
    // behaviour is independent of frame rate.
    this._timer += dt;
    while (this._timer >= this.volleyInterval) {
      this._timer -= this.volleyInterval;
      frameCasualties += this.resolveVolley(!!opts.bracing);
    }

    if (this.distance >= this.goalDistance) {
      this.status = "won";
    }

    return { distance: this.distance, status: this.status, casualties: frameCasualties };
  }

  /**
   * Resolve a single archer volley against the living crew.
   * @param {boolean} bracing - lower casualty chance when Kaladin shields them
   * @returns {number} crew killed this volley
   */
  resolveVolley(bracing) {
    const p = bracing ? this.bracedCasualtyChance : this.baseCasualtyChance;
    let killed = 0;
    for (const m of this.crew) {
      if (!m.alive) continue;
      if (this.rng.chance(p)) {
        m.alive = false;
        this.casualties++;
        killed++;
      }
    }
    this.volleys++;
    return killed;
  }

  /** @returns {number} run completion fraction, clamped to 0..1. */
  progress() {
    const p = this.distance / this.goalDistance;
    if (p < 0) return 0;
    if (p > 1) return 1;
    return p;
  }

  /** @returns {boolean} true once the run has resolved (won or failed). */
  isOver() {
    return this.status !== "running";
  }

  /** Restore the initial state and re-seed so the run replays deterministically. */
  reset() {
    this.rng.setState(this._seed);
    this._init();
  }
}
