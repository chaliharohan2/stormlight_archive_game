// Dalinar's Highstorm visions, modeled as a scored moral gauntlet. Each "beat"
// is one vision tableau (a setting + situation text) with 2-4 choices, every
// choice carrying an HONOR value (often negative for the pragmatic path). Beats
// play in array order; a choice may `next`-branch to a beat by id. Pure and
// DOM-free so the decision logic can be unit-tested without a canvas.

/**
 * @typedef {Object} VisionChoice
 * @property {string} text
 * @property {number} [honor]      - honor delta for taking this choice (default 0)
 * @property {string} [next]       - beat id to jump to (omit to advance linearly)
 * @property {string} [response]   - short line shown after the choice is made
 *
 * @typedef {Object} VisionBeat
 * @property {string} [id]         - id used as a `next` branch target
 * @property {string} setting      - dim caption ("Feverstone Keep — the Recreance")
 * @property {string} text         - the situation presented to Dalinar
 * @property {string} [speaker]    - who is speaking, if anyone
 * @property {VisionChoice[]} choices
 */

export class VisionSequence {
  /**
   * @param {VisionBeat[]} beats
   * @param {Object} [opts]
   * @param {number} [opts.unityThreshold]
   *   Honor at/above which Dalinar resolves to unite the highprinces. Defaults
   *   to 60% of the maximum attainable honor (a relative bar so authored
   *   content can scale without re-tuning a magic number). If max honor is
   *   non-positive, falls back to 0 so any beats array stays usable.
   */
  constructor(beats, opts = {}) {
    if (!Array.isArray(beats) || beats.length === 0) {
      throw new Error("VisionSequence requires a non-empty beats array");
    }
    this.beats = beats;
    // Map ids -> index once, so branching `next` lookups are O(1) and we can
    // validate branch targets eagerly rather than mid-playthrough.
    this._idToIndex = new Map();
    beats.forEach((b, i) => {
      if (b.id != null) this._idToIndex.set(b.id, i);
    });

    const max = this.maxHonor();
    // 60% of the best possible run is a "mostly honorable" bar. We round so the
    // documented threshold is a clean integer in result()/UI.
    this.unityThreshold = opts.unityThreshold ?? Math.max(0, Math.round(max * 0.6));

    this.reset();
  }

  /** The beat the player is currently facing, or null once the run is over. */
  current() {
    if (this.done || this.index < 0 || this.index >= this.beats.length) return null;
    return this.beats[this.index];
  }

  /** Choices for the current beat (empty array when complete). */
  choices() {
    const beat = this.current();
    return beat ? beat.choices : [];
  }

  /**
   * Apply choice `i` of the current beat: accrue honor, record history, then
   * branch via `next` or advance to the following beat. Marks done when we run
   * past the end (or jump to a missing target).
   * @returns {{honor:number, done:boolean, response:(string|null)}}
   */
  choose(i) {
    const beat = this.current();
    if (!beat) throw new Error("choose() called with no current beat (already complete)");
    const choice = beat.choices[i];
    if (!choice) throw new Error(`Invalid choice index: ${i}`);

    this.honor += choice.honor ?? 0;
    this.history.push({ beatIndex: this.index, beatId: beat.id ?? null, choiceIndex: i, honor: choice.honor ?? 0 });

    if (choice.next != null) {
      const target = this._idToIndex.get(choice.next);
      // An unknown branch target ends the vision rather than throwing — authored
      // content can intentionally use `next` to a sentinel to finish early.
      this.index = target ?? this.beats.length;
    } else {
      this.index += 1;
    }

    if (this.index >= this.beats.length) this.done = true;

    return { honor: this.honor, done: this.done, response: choice.response ?? null };
  }

  isComplete() {
    return this.done;
  }

  /**
   * Final tally. `united` gates the story branch (resolve to unite vs. waver).
   * Rating bands are expressed as fractions of maxHonor so they track the bar
   * used for `united`, keeping flavor and mechanics consistent:
   *   Radiant   >= 90% of max   (acted with near-perfect honor)
   *   Honorable >= unityThreshold (united; "the most important words")
   *   Wavering  >= 30% of max   (some honor, but he hesitates)
   *   Fallen    below that      (gave in to expedience)
   */
  result() {
    const max = this.maxHonor();
    const radiantBar = Math.round(max * 0.9);
    const waveringBar = Math.round(max * 0.3);
    let rating;
    if (this.honor >= radiantBar) rating = "Radiant";
    else if (this.honor >= this.unityThreshold) rating = "Honorable";
    else if (this.honor >= waveringBar) rating = "Wavering";
    else rating = "Fallen";
    return { honor: this.honor, united: this.honor >= this.unityThreshold, rating };
  }

  /**
   * Upper bound on honor: sum of each beat's best choice in array order. This
   * ignores branching (a branch could skip beats), so it is a generous ceiling
   * used to size the honor meter and derive thresholds — exactness isn't needed.
   */
  maxHonor() {
    return this.beats.reduce((sum, beat) => {
      const best = beat.choices.reduce((m, c) => Math.max(m, c.honor ?? 0), 0);
      return sum + best;
    }, 0);
  }

  /** Return to the start so a vision can be replayed (e.g. a new highstorm). */
  reset() {
    this.index = 0;
    this.honor = 0;
    this.history = [];
    this.done = false;
  }
}
