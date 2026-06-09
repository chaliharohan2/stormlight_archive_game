// Pure combat resolution. Combatants are plain objects so they serialize and
// test easily. The browser combat scene drives these functions in real time;
// the tests drive them deterministically.

import { clamp } from "./physics.js";

/**
 * @typedef {Object} Combatant
 * @property {string} name
 * @property {number} hp
 * @property {number} maxHp
 * @property {number} attack   - base attack power
 * @property {number} defense  - flat damage reduction
 * @property {number} [stormlightBonus] - extra attack while Infused
 */

/** Create a combatant with sane defaults. */
export function makeCombatant(opts = {}) {
  const maxHp = opts.maxHp ?? 100;
  return {
    name: opts.name ?? "Combatant",
    hp: opts.hp ?? maxHp,
    maxHp,
    attack: opts.attack ?? 10,
    defense: opts.defense ?? 0,
    stormlightBonus: opts.stormlightBonus ?? 0,
  };
}

/**
 * Compute raw damage for an attack. Damage never drops below a chip minimum so
 * fights cannot stalemate. A `power` multiplier models heavy/light strikes.
 *
 * @returns {number} integer damage
 */
export function computeDamage(attacker, defender, opts = {}) {
  const power = opts.power ?? 1;
  const infused = opts.infused ? attacker.stormlightBonus ?? 0 : 0;
  const raw = (attacker.attack + infused) * power;
  const mitigated = raw - (defender.defense ?? 0);
  const MIN_CHIP = 1;
  return Math.max(MIN_CHIP, Math.round(mitigated));
}

/**
 * Apply damage to a combatant, mutating its hp. Returns a result summary.
 * @returns {{damage:number, hp:number, killed:boolean}}
 */
export function applyDamage(target, damage) {
  const dmg = Math.max(0, Math.round(damage));
  target.hp = clamp(target.hp - dmg, 0, target.maxHp);
  return { damage: dmg, hp: target.hp, killed: target.hp <= 0 };
}

/**
 * Resolve a single attack from attacker to defender, mutating defender.hp.
 * @returns {{damage:number, hp:number, killed:boolean}}
 */
export function resolveAttack(attacker, defender, opts = {}) {
  const dmg = computeDamage(attacker, defender, opts);
  return applyDamage(defender, dmg);
}

/** Heal a combatant up to maxHp. Returns amount actually healed. */
export function heal(target, amount) {
  const before = target.hp;
  target.hp = clamp(target.hp + Math.max(0, amount), 0, target.maxHp);
  return target.hp - before;
}

/** Convenience: is this combatant still alive? */
export function isAlive(c) {
  return c.hp > 0;
}

/** Fraction of health remaining, 0..1. */
export function healthFraction(c) {
  return c.maxHp > 0 ? c.hp / c.maxHp : 0;
}
