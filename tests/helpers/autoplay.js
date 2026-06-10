// An automated player. Given a Game whose current scene is anything the
// campaign can present (narration, dialogue, a world area, or one of the three
// minigames), it drives real input through the real scenes until the scene
// resolves — so a test can play whole chapters, or the whole campaign,
// headlessly and assert it completes without crashing.
//
// Traversal inside world areas is "cheated" (enemies are marked down and the
// player is teleported onto the objective) because the point of this harness is
// to prove the content is *completable and crash-free*, not to exercise the
// combat AI — dedicated tests cover real movement and combat.

import { NarrationScene } from "../../src/scenes/narrationScene.js";
import { DialogueScene } from "../../src/scenes/dialogueScene.js";
import { WorldScene } from "../../src/scenes/worldScene.js";
import { BridgeRunScene } from "../../src/scenes/bridgeRunScene.js";
import { SoulcastScene } from "../../src/scenes/soulcastScene.js";
import { VisionScene } from "../../src/scenes/visionScene.js";
import { GameOverScene } from "../../src/scenes/gameOverScene.js";

function step(game, dt = 0.1) {
  game.scenes.update(dt, game.input);
  game.input.endFrame();
}

function tap(game, code, dt = 0.2) {
  game.input.pressCode(code);
  step(game, dt);
  game.input.releaseCode(code);
}

function handleNarration(game) {
  // One tap reveals the page; the next advances it. Two taps clears a page.
  tap(game, "Space");
}

function handleDialogue(game, scene) {
  const cur = scene.runner.current();
  if (cur && cur.hasChoices) {
    tap(game, "Space"); // ensure fully revealed
    tap(game, "Digit1"); // always take the first option
  } else {
    tap(game, "Space");
  }
}

function handleWorld(game, scene) {
  // Clear any enemies so clear-to-exit gating opens.
  for (const e of scene.entities) if (e.type === "enemy") e._dead = true;

  // Prefer an explicit exit; otherwise an NPC whose talk completes the area.
  const exit = scene.entities.find((e) => e.type === "exit" && !e._dead);
  const target = exit ?? scene.entities.find((e) => e.type === "npc" && typeof e.onTalk === "function");
  if (!target) {
    // Nothing to do here — nudge a frame so we don't spin forever.
    step(game);
    return;
  }
  scene.px = target.x;
  scene.py = target.y;
  tap(game, "KeyE", 0.05); // interact: trigger exit or open the NPC's dialogue
}

function handleBridge(game) {
  // Hold BRACE (power) and let the run play out; it pops itself on a win.
  game.input.pressCode("KeyK");
  for (let i = 0; i < 30 && game.scenes.current instanceof BridgeRunScene; i++) {
    step(game, 0.1);
  }
  game.input.releaseCode("KeyK");
}

function handleSoulcast(game, scene) {
  const cur = scene.current;
  if (!cur) {
    step(game);
    return;
  }
  // Commit the correct gem, then channel Stormlight until it transforms.
  const idx = cur.gemOptions.indexOf(cur.gem);
  if (idx >= 0) tap(game, `Digit${idx + 1}`, 0.05);
  game.input.pressCode("KeyK");
  for (let i = 0; i < 40 && scene.current === cur && !cur.isSolved(); i++) {
    step(game, 0.1);
  }
  game.input.releaseCode("KeyK");
}

function handleVision(game, scene) {
  if (scene._showingResponse != null) {
    tap(game, "Space");
  } else {
    tap(game, "Digit1");
  }
}

/**
 * Drive the current scene(s) forward until `done()` returns true or the frame
 * budget runs out. Throws if the player ever hits a Game Over.
 * @param {import('../../src/engine/game.js').Game} game
 * @param {() => boolean} done
 * @param {Object} [opts]
 * @param {number} [opts.budget] max driver iterations
 */
export function playUntil(game, done, { budget = 6000 } = {}) {
  let i = 0;
  while (i++ < budget) {
    if (done()) return true;
    const s = game.scenes.current;
    if (!s) {
      step(game);
      continue;
    }
    if (s instanceof GameOverScene) {
      throw new Error("Autoplay hit a Game Over — the area is not winnable as driven.");
    } else if (s instanceof NarrationScene) {
      handleNarration(game);
    } else if (s instanceof DialogueScene) {
      handleDialogue(game, s);
    } else if (s instanceof BridgeRunScene) {
      handleBridge(game);
    } else if (s instanceof SoulcastScene) {
      handleSoulcast(game, s);
    } else if (s instanceof VisionScene) {
      handleVision(game, s);
    } else if (s instanceof WorldScene) {
      handleWorld(game, s);
    } else {
      // Unknown scene (e.g. a menu) — advance a frame and re-check.
      step(game);
    }
  }
  return done();
}
