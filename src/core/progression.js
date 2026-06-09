// Campaign progression: which chapters are unlocked/completed, the global story
// flags, and serialization for the save system. The ordered chapter list is
// injected so story content owns the ordering.

export class GameProgress {
  /**
   * @param {string[]} chapterOrder - ordered chapter ids
   * @param {Object} [data] - restored state
   */
  constructor(chapterOrder, data = {}) {
    this.chapterOrder = chapterOrder.slice();
    this.unlocked = new Set(data.unlocked ?? [chapterOrder[0]]);
    this.completed = new Set(data.completed ?? []);
    this.currentChapter = data.currentChapter ?? chapterOrder[0] ?? null;
    this.flags = { ...(data.flags ?? {}) };
  }

  isUnlocked(id) {
    return this.unlocked.has(id);
  }

  isCompleted(id) {
    return this.completed.has(id);
  }

  unlock(id) {
    this.unlocked.add(id);
  }

  /** Mark a chapter complete and unlock the next one in order. */
  complete(id) {
    this.completed.add(id);
    const idx = this.chapterOrder.indexOf(id);
    if (idx >= 0 && idx + 1 < this.chapterOrder.length) {
      this.unlock(this.chapterOrder[idx + 1]);
    }
  }

  /** Next not-yet-completed chapter in order, or null if the game is done. */
  nextChapter() {
    return this.chapterOrder.find((id) => !this.completed.has(id)) ?? null;
  }

  isCampaignComplete() {
    return this.chapterOrder.every((id) => this.completed.has(id));
  }

  setFlag(key, value = true) {
    this.flags[key] = value;
  }

  hasFlag(key) {
    return !!this.flags[key];
  }

  getFlag(key) {
    return this.flags[key];
  }

  toJSON() {
    return {
      unlocked: [...this.unlocked],
      completed: [...this.completed],
      currentChapter: this.currentChapter,
      flags: { ...this.flags },
    };
  }

  static fromJSON(chapterOrder, data) {
    return new GameProgress(chapterOrder, data ?? {});
  }
}
