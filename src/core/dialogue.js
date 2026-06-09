// Branching dialogue runner. A dialogue is a plain object map of nodes; each
// node is one line spoken by someone, optionally followed by player choices.
// Effects and conditions are expressed as small functions over a `flags`
// object, so authored content (in JS) stays declarative and testable.

/**
 * @typedef {Object} DialogueChoice
 * @property {string} text
 * @property {string} [next]                 - next node id (omit to end)
 * @property {(flags:Object)=>boolean} [condition] - hide choice if false
 * @property {(ctx:DialogueContext)=>void} [onSelect]
 *
 * @typedef {Object} DialogueNode
 * @property {string} id
 * @property {string} [speaker]
 * @property {string} text
 * @property {string} [next]                 - auto-advance target id
 * @property {DialogueChoice[]} [choices]
 * @property {(ctx:DialogueContext)=>void} [onEnter]
 * @property {boolean} [end]                 - terminal node
 *
 * @typedef {Object} DialogueContext
 * @property {Object} flags
 * @property {(k:string,v:any)=>void} setFlag
 * @property {(k:string)=>any} getFlag
 */

export class DialogueRunner {
  /**
   * @param {Object<string,DialogueNode>} tree
   * @param {Object} [opts]
   * @param {Object} [opts.flags]  - shared flag store (mutated in place)
   */
  constructor(tree, opts = {}) {
    this.tree = tree;
    this.flags = opts.flags ?? {};
    this.currentId = null;
    this.done = false;
    this._ctx = {
      flags: this.flags,
      setFlag: (k, v) => {
        this.flags[k] = v;
      },
      getFlag: (k) => this.flags[k],
    };
  }

  /** Begin at a node id; runs its onEnter. */
  start(startId) {
    this.done = false;
    this._enter(startId);
    return this.current();
  }

  _enter(id) {
    const node = this.tree[id];
    if (!node) throw new Error(`Dialogue node not found: ${id}`);
    this.currentId = id;
    if (typeof node.onEnter === "function") node.onEnter(this._ctx);
    if (node.end) this.done = true;
  }

  /** The current node enriched with its currently-visible choices. */
  current() {
    if (this.currentId == null) return null;
    const node = this.tree[this.currentId];
    const choices = (node.choices ?? []).filter(
      (c) => typeof c.condition !== "function" || c.condition(this.flags)
    );
    return {
      id: node.id,
      speaker: node.speaker ?? "",
      text: node.text,
      choices,
      hasChoices: choices.length > 0,
      end: !!node.end,
    };
  }

  /** True if the current node has selectable choices. */
  awaitingChoice() {
    const cur = this.current();
    return !!cur && cur.hasChoices && !this.done;
  }

  /**
   * Advance a non-choice node to its `next`. If the node is terminal or has
   * choices, this is a no-op (use choose()).  Returns the new current() or
   * null when the dialogue has ended.
   */
  advance() {
    if (this.done) return null;
    const node = this.tree[this.currentId];
    if (node.choices && node.choices.length) return this.current();
    if (node.next) {
      this._enter(node.next);
      return this.current();
    }
    // No next and no choices => dialogue ends.
    this.done = true;
    return null;
  }

  /** Select choice index from the *visible* choices list. */
  choose(index) {
    const cur = this.current();
    if (!cur || !cur.hasChoices) {
      throw new Error("No choices available at current node");
    }
    const choice = cur.choices[index];
    if (!choice) throw new Error(`Invalid choice index: ${index}`);
    if (typeof choice.onSelect === "function") choice.onSelect(this._ctx);
    if (choice.next) {
      this._enter(choice.next);
      return this.current();
    }
    this.done = true;
    return null;
  }

  isComplete() {
    return this.done;
  }
}
