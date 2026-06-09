// Soulcasting: the pure puzzle model behind a Soulcaster fabrial. A Soulcaster
// transforms one material into another, but the object "resists" the change —
// it must be convinced it is something else. The wielder picks the Essence
// (gemstone) matching the desired form and channels Stormlight until the
// object's resistance is worn down to nothing and it agrees to transform.
//
// This module is DOM-free so the logic can be unit-tested in isolation; the
// scene wrapper drives the visuals and feeds it Stormlight.

// The Ten Essences as expressed through their gemstones. Used to fabricate
// plausible distractor options when a recipe doesn't spell them out, so the
// player always has a real choice to make.
export const GEMSTONES = [
  "Smokestone", // smoke / air
  "Heliodor", // flesh
  "Ruby", // fire
  "Sapphire", // air / translucent gas
  "Diamond", // quartz / crystal
  "Topaz", // rock / stone
  "Garnet", // blood
  "Emerald", // grain / plant
];

export class SoulcastPuzzle {
  constructor({
    from,
    to,
    gem,
    gemOptions,
    resistance = 100,
    perPush = 22,
    wrongBacklash = 8,
  } = {}) {
    this.from = from;
    this.to = to;
    // The single correct Essence; only channelling through it makes progress.
    this.gem = gem;

    // The choices presented. Always ensure the correct gem is among them,
    // otherwise the puzzle would be unsolvable.
    this.gemOptions = Array.isArray(gemOptions) ? gemOptions.slice() : [gem];
    if (!this.gemOptions.includes(gem)) this.gemOptions.unshift(gem);

    // maxResistance is the ceiling: backlash can never push the object more
    // stubborn than it started, and progress() is measured against it.
    this.maxResistance = resistance;
    this.perPush = perPush;
    this.wrongBacklash = wrongBacklash;

    this.resistance = resistance;
    this.selectedGem = null;
    this.transformed = false;
  }

  /**
   * Choose an Essence to channel through. Must be one of gemOptions, otherwise
   * the selection is rejected (a gem you don't hold can't be used).
   */
  selectGem(g) {
    if (!this.gemOptions.includes(g)) return false;
    this.selectedGem = g;
    return true;
  }

  /**
   * Channel `stormlight` units into the object. With the correct gem the
   * resistance drops by the amount channelled; with the wrong gem the object
   * resists harder (a small backlash, capped at its original resistance); with
   * no gem selected nothing happens. Returns the new state.
   */
  push(stormlight) {
    if (this.transformed) return { transformed: true, resistance: this.resistance };
    // No Essence selected: Stormlight has nothing to flow through.
    if (this.selectedGem == null) {
      return { transformed: this.transformed, resistance: this.resistance };
    }

    if (this.selectedGem === this.gem) {
      // Correct Essence: wear the resistance down. Ignore non-positive input so
      // a zero/negative channel can't accidentally heal the object.
      const amount = Math.max(0, stormlight);
      this.resistance -= amount;
      if (this.resistance <= 0) {
        this.resistance = 0;
        this.transformed = true;
      }
    } else {
      // Wrong Essence: the object digs in, but never beyond its starting will.
      this.resistance = Math.min(this.maxResistance, this.resistance + this.wrongBacklash);
    }

    return { transformed: this.transformed, resistance: this.resistance };
  }

  /** Fraction transformed, 0..1 — drives the morph/progress visuals. */
  progress() {
    if (this.maxResistance <= 0) return 1;
    const p = 1 - this.resistance / this.maxResistance;
    // Clamp defensively in case resistance ever exceeds max via tuning.
    return p < 0 ? 0 : p > 1 ? 1 : p;
  }

  isSolved() {
    return this.transformed === true;
  }

  /** Restore the object to its original, untransformed, unselected state. */
  reset() {
    this.resistance = this.maxResistance;
    this.transformed = false;
    this.selectedGem = null;
  }
}

/**
 * Build SoulcastPuzzle instances from plain recipe configs. When a recipe omits
 * gemOptions we synthesize a set by mixing the correct gem with a few distractor
 * gemstones, so every puzzle is a genuine multiple-choice without authors having
 * to spell out the wrong answers.
 */
export function makePuzzleSet(list = []) {
  return list.map((cfg) => {
    if (cfg.gemOptions) return new SoulcastPuzzle(cfg);

    // Pull distractors from the global Essence list, excluding the answer, and
    // keep the option count small (4) so the UI stays readable.
    const distractors = GEMSTONES.filter((g) => g !== cfg.gem).slice(0, 3);
    const gemOptions = [cfg.gem, ...distractors];
    return new SoulcastPuzzle({ ...cfg, gemOptions });
  });
}
