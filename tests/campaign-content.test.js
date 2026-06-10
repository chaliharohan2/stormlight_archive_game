import test from "node:test";
import assert from "node:assert/strict";
import { makeFakeCanvas } from "./helpers/headless.js";
import { playUntil } from "./helpers/autoplay.js";
import { Game } from "../src/engine/game.js";
import { CHAPTERS } from "../src/content/campaign.js";
import { MemoryBackend } from "../src/engine/storage.js";

function newGame() {
  return new Game({
    canvas: makeFakeCanvas(),
    chapters: CHAPTERS,
    saveBackend: new MemoryBackend(),
  });
}

/** Every `next`/choice target must reference a real node; start must exist. */
function validateTree(tree, where) {
  const ids = new Set(Object.keys(tree));
  assert.ok(ids.has("start"), `${where}: dialogue tree must have a 'start' node`);
  for (const [id, node] of Object.entries(tree)) {
    assert.equal(typeof node.text, "string", `${where}:${id} needs text`);
    if (node.next) {
      assert.ok(ids.has(node.next), `${where}:${id} -> '${node.next}' is a dangling node`);
    }
    for (const c of node.choices ?? []) {
      assert.equal(typeof c.text, "string", `${where}:${id} choice needs text`);
      if (c.next) {
        assert.ok(ids.has(c.next), `${where}:${id} choice -> '${c.next}' is a dangling node`);
      }
    }
    // A node must be able to progress: terminal, or has next/choices.
    const canProgress = node.end || node.next || (node.choices && node.choices.length);
    assert.ok(canProgress, `${where}:${id} is a dead end (no end/next/choices)`);
  }
}

test("every chapter declares the required shape", () => {
  const ids = new Set();
  for (const ch of CHAPTERS) {
    assert.equal(typeof ch.id, "string");
    assert.equal(typeof ch.title, "string");
    assert.equal(typeof ch.start, "function");
    assert.ok(!ids.has(ch.id), `duplicate chapter id: ${ch.id}`);
    ids.add(ch.id);
  }
  assert.equal(CHAPTERS.length, 6, "the campaign has six chapters");
});

test("all NPC dialogue trees across the campaign have no dangling references", () => {
  const game = newGame();
  let campaignDone = false;
  game.onChapterComplete = () => {
    const next = game.progress.nextChapter();
    if (next) game.startChapter(next);
  };
  game.onCampaignComplete = () => {
    campaignDone = true;
  };

  // Collect every world area's NPC trees as they become the active scene while
  // the autoplayer walks the whole campaign.
  const seen = new Set();
  const trees = [];
  game.startChapter(game.chapterOrder[0]);
  playUntil(
    game,
    () => {
      const s = game.scenes.current;
      const ents = s?.entities;
      if (Array.isArray(ents)) {
        for (const e of ents) {
          if (e.type === "npc" && e.tree && typeof e.tree === "object" && !seen.has(e)) {
            seen.add(e);
            trees.push({ tree: e.tree, where: `${s.level?.id ?? "?"}/${e.name ?? "npc"}` });
          }
        }
      }
      return campaignDone;
    },
    { budget: 12000 }
  );

  assert.ok(trees.length >= 6, `expected to encounter several NPC trees, saw ${trees.length}`);
  for (const { tree, where } of trees) validateTree(tree, where);
});

test("every chapter starts cleanly and yields an active scene", () => {
  for (const ch of CHAPTERS) {
    const game = newGame();
    assert.doesNotThrow(() => game.startChapter(ch.id), `${ch.id} should start without throwing`);
    assert.ok(game.scenes.current, `${ch.id} should leave an active scene`);
    assert.ok(game.player, `${ch.id} should set up a player`);
  }
});
