import test from "node:test";
import assert from "node:assert/strict";
import {
  makeCombatant,
  computeDamage,
  applyDamage,
  resolveAttack,
  heal,
  isAlive,
  healthFraction,
} from "../src/core/combat.js";

test("makeCombatant defaults", () => {
  const c = makeCombatant();
  assert.equal(c.hp, 100);
  assert.equal(c.maxHp, 100);
  assert.equal(c.attack, 10);
});

test("computeDamage mitigates by defense with a chip minimum", () => {
  const att = makeCombatant({ attack: 20 });
  const def = makeCombatant({ defense: 5 });
  assert.equal(computeDamage(att, def), 15);
  // Heavy strike doubles.
  assert.equal(computeDamage(att, def, { power: 2 }), 35);
  // Over-defended still chips at least 1.
  const tank = makeCombatant({ defense: 999 });
  assert.equal(computeDamage(att, tank), 1);
});

test("stormlight infusion adds bonus damage only when infused", () => {
  const att = makeCombatant({ attack: 10, stormlightBonus: 15 });
  const def = makeCombatant({ defense: 0 });
  assert.equal(computeDamage(att, def), 10);
  assert.equal(computeDamage(att, def, { infused: true }), 25);
});

test("applyDamage reduces hp and reports kills", () => {
  const c = makeCombatant({ maxHp: 30 });
  const r1 = applyDamage(c, 10);
  assert.equal(r1.hp, 20);
  assert.equal(r1.killed, false);
  const r2 = applyDamage(c, 100);
  assert.equal(r2.hp, 0);
  assert.equal(r2.killed, true);
});

test("resolveAttack mutates the defender", () => {
  const att = makeCombatant({ attack: 12 });
  const def = makeCombatant({ maxHp: 50, defense: 2 });
  const res = resolveAttack(att, def);
  assert.equal(res.damage, 10);
  assert.equal(def.hp, 40);
});

test("heal clamps to maxHp and reports amount", () => {
  const c = makeCombatant({ maxHp: 50, hp: 40 });
  assert.equal(heal(c, 5), 5);
  assert.equal(c.hp, 45);
  assert.equal(heal(c, 100), 5); // only 5 room left
  assert.equal(c.hp, 50);
});

test("isAlive + healthFraction", () => {
  const c = makeCombatant({ maxHp: 100, hp: 25 });
  assert.equal(isAlive(c), true);
  assert.equal(healthFraction(c), 0.25);
  applyDamage(c, 25);
  assert.equal(isAlive(c), false);
  assert.equal(healthFraction(c), 0);
});
