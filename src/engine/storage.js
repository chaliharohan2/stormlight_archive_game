// Save/load. Wraps localStorage when available but accepts an injectable
// backend so the save system is fully unit-testable in Node.

const KEY = "wok_save_v1";

/** A Map-backed store that mimics the bits of localStorage we use. */
export class MemoryBackend {
  constructor() {
    this._m = new Map();
  }
  getItem(k) {
    return this._m.has(k) ? this._m.get(k) : null;
  }
  setItem(k, v) {
    this._m.set(k, String(v));
  }
  removeItem(k) {
    this._m.delete(k);
  }
}

export class SaveManager {
  constructor(backend) {
    if (backend) this.backend = backend;
    else if (typeof localStorage !== "undefined") this.backend = localStorage;
    else this.backend = new MemoryBackend();
  }

  save(state) {
    try {
      this.backend.setItem(KEY, JSON.stringify(state));
      return true;
    } catch {
      return false;
    }
  }

  load() {
    try {
      const raw = this.backend.getItem(KEY);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }

  hasSave() {
    return this.backend.getItem(KEY) != null;
  }

  clear() {
    this.backend.removeItem(KEY);
  }
}
