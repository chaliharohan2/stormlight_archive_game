import test from "node:test";
import assert from "node:assert/strict";
import { BridgeRun } from "../src/core/bridgeRun.js";
import { RNG } from "../src/core/rng.js";

// Drive a run to completion (or failure) with a fixed brace policy. Returns the
// final sim so callers can inspect casualties/status deterministically.
function runToEnd(sim, { bracing = false, dt = 0.1, maxSteps = 5000 } = {}) {
  let steps = 0;
  while (!sim.isOver() && steps < maxSteps) {
    sim.update(dt, { bracing });
    steps++;
  }
  return sim;
}

test("constructor sets up a fresh, fully-living crew", () => {
  const sim = new BridgeRun({ crewSize: 24 });
  assert.equal(sim.crew.length, 24);
  assert.equal(sim.carriers(), 24);
  assert.equal(sim.distance, 0);
  assert.equal(sim.status, "running");
  assert.equal(sim.casualties, 0);
});

test("identical seed + identical calls yield identical outcomes", () => {
  const make = () => new BridgeRun({ rng: new RNG(42), crewSize: 30, minCarriers: 0 });
  const a = runToEnd(make());
  const b = runToEnd(make());
  assert.equal(a.casualties, b.casualties);
  assert.equal(a.volleys, b.volleys);
  assert.equal(a.status, b.status);
  assert.deepEqual(
    a.crew.map((m) => m.alive),
    b.crew.map((m) => m.alive)
  );
});

test("bracing yields fewer casualties than not bracing (same seed)", () => {
  // minCarriers:0 so neither run fails early — we want a fair casualty count
  // across the whole journey for a like-for-like comparison.
  const unbraced = runToEnd(new BridgeRun({ rng: new RNG(99), crewSize: 60, minCarriers: 0 }), {
    bracing: false,
  });
  const braced = runToEnd(new BridgeRun({ rng: new RNG(99), crewSize: 60, minCarriers: 0 }), {
    bracing: true,
  });
  assert.ok(
    braced.casualties < unbraced.casualties,
    `expected braced (${braced.casualties}) < unbraced (${unbraced.casualties})`
  );
});

test("status becomes 'won' when the goal is reached with enough carriers", () => {
  // No casualties possible, so the whole crew survives to the goal.
  const sim = new BridgeRun({
    rng: new RNG(1),
    crewSize: 24,
    minCarriers: 8,
    baseCasualtyChance: 0,
    bracedCasualtyChance: 0,
    goalDistance: 100,
    runSpeed: 100,
  });
  runToEnd(sim, { dt: 0.1 });
  assert.equal(sim.status, "won");
  assert.ok(sim.distance >= sim.goalDistance);
  assert.equal(sim.carriers(), 24);
});

test("status becomes 'failed' when carriers drop below minCarriers", () => {
  // Guaranteed kills every volley quickly wipe enough of the crew to fall short.
  const sim = new BridgeRun({
    rng: new RNG(3),
    crewSize: 10,
    minCarriers: 8,
    baseCasualtyChance: 1, // everyone alive dies each volley
    goalDistance: 100000, // far enough that volleys resolve before winning
    volleyInterval: 1,
  });
  runToEnd(sim, { dt: 1 });
  assert.equal(sim.status, "failed");
  assert.ok(sim.carriers() < sim.minCarriers);
});

test("a won run never resolves as failed afterwards", () => {
  const sim = new BridgeRun({
    rng: new RNG(5),
    baseCasualtyChance: 0,
    goalDistance: 50,
    runSpeed: 100,
  });
  runToEnd(sim, { dt: 0.1 });
  assert.equal(sim.status, "won");
  // update() on a finished run is a no-op and cannot flip the status.
  const summary = sim.update(0.1, { bracing: false });
  assert.equal(summary.status, "won");
  assert.equal(summary.casualties, 0);
});

test("resolveVolley with chance 0 kills nobody, with chance 1 kills everyone", () => {
  const safe = new BridgeRun({ crewSize: 5, baseCasualtyChance: 0 });
  assert.equal(safe.resolveVolley(false), 0);
  assert.equal(safe.carriers(), 5);
  assert.equal(safe.volleys, 1);

  const lethal = new BridgeRun({ crewSize: 5, baseCasualtyChance: 1 });
  assert.equal(lethal.resolveVolley(false), 5);
  assert.equal(lethal.carriers(), 0);
  assert.equal(lethal.casualties, 5);
});

test("reset() restores initial state and replays deterministically", () => {
  const sim = new BridgeRun({ rng: new RNG(7), crewSize: 40, minCarriers: 0 });
  runToEnd(sim);
  const firstCasualties = sim.casualties;
  const firstAlive = sim.crew.map((m) => m.alive);

  sim.reset();
  assert.equal(sim.distance, 0);
  assert.equal(sim.status, "running");
  assert.equal(sim.casualties, 0);
  assert.equal(sim.carriers(), 40);

  runToEnd(sim);
  assert.equal(sim.casualties, firstCasualties);
  assert.deepEqual(
    sim.crew.map((m) => m.alive),
    firstAlive
  );
});

test("progress() stays within [0,1]", () => {
  const sim = new BridgeRun({
    rng: new RNG(11),
    baseCasualtyChance: 0,
    goalDistance: 100,
    runSpeed: 100,
  });
  assert.equal(sim.progress(), 0);
  for (let i = 0; i < 30; i++) {
    sim.update(0.1, { bracing: false });
    const p = sim.progress();
    assert.ok(p >= 0 && p <= 1, `progress out of range: ${p}`);
  }
  // Even well past the goal it clamps at 1.
  assert.equal(sim.progress(), 1);
});

test("update is frame-rate independent: many small steps == few large steps", () => {
  const opts = {
    crewSize: 50,
    minCarriers: 0,
    goalDistance: 1000,
    runSpeed: 100,
    volleyInterval: 2,
  };
  const fine = new BridgeRun({ rng: new RNG(123), ...opts });
  const coarse = new BridgeRun({ rng: new RNG(123), ...opts });
  // 100 steps of 0.1s vs 10 steps of 1s — both cover 10s of run time.
  for (let i = 0; i < 100; i++) fine.update(0.1, { bracing: false });
  for (let i = 0; i < 10; i++) coarse.update(1.0, { bracing: false });
  assert.equal(fine.volleys, coarse.volleys);
  assert.equal(fine.casualties, coarse.casualties);
});
