// Browser entry point. Wires the canvas to the Game, builds the title and
// chapter-select flow, and routes chapter completion through the campaign.

import { Game } from "./engine/game.js";
import { MenuScene } from "./scenes/menuScene.js";
import { NarrationScene } from "./scenes/narrationScene.js";
import { CHAPTERS } from "./content/campaign.js";

const WIDTH = 960;
const HEIGHT = 600;

async function boot() {
  const canvas = document.getElementById("game");
  canvas.width = WIDTH;
  canvas.height = HEIGHT;

  // 3D view (Three.js over WebGL). If the browser can't do WebGL — or the
  // module fails to load — we fall back to the original pure-2D renderer.
  let renderer3d = null;
  try {
    const { createRenderer3D } = await import("./render3d/renderer3d.js");
    renderer3d = createRenderer3D(document.getElementById("game3d"), WIDTH, HEIGHT);
  } catch (err) {
    console.warn("3D renderer unavailable; falling back to 2D.", err);
  }
  if (!renderer3d) document.getElementById("game3d")?.remove();

  const game = new Game({ canvas, width: WIDTH, height: HEIGHT, chapters: CHAPTERS, renderer3d });
  // Debug/verification handles (used by tools/verify-ui.mjs).
  window.__game = game;
  window.__r3d = renderer3d;

  // Show a chapter's intro pages, then begin play.
  function startChapterFlow(id) {
    const ch = game.chapters.get(id);
    const pages = ch.intro ?? [{ title: ch.title, text: ch.blurb ?? "" }];
    game.scenes.replace(new NarrationScene(pages, { onComplete: () => game.startChapter(id) }));
  }

  // After a chapter is completed, advance to the next one's intro.
  game.onChapterComplete = (id) => {
    const next = game.progress.nextChapter();
    if (next) {
      const finished = game.chapters.get(id);
      game.scenes.replace(
        new NarrationScene(
          finished.outro ?? [{ subtitle: "Chapter complete", text: `“${finished.title}” complete.` }],
          { onComplete: () => startChapterFlow(next) }
        )
      );
    }
  };

  game.onCampaignComplete = () => showEnding();

  function showEnding() {
    game.scenes.replace(
      new NarrationScene(
        [
          { title: "The Way of Kings", subtitle: "Book One complete", text: "The Tower has been survived. Bridge Four stands free in Kholin blue, a Shardblade has been traded for a thousand slaves, and the Assassin in White carries a list with one name left upon it." },
          { epigraph: "“The most important step a man can take. It's not the first one. It's the next one.”", text: "Thank you for playing. The Knights Radiant must stand again — Words of Radiance is next." },
        ],
        { onComplete: showTitle }
      )
    );
  }

  function buildTitle() {
    const hasSave = game.save.hasSave();
    return new MenuScene({
      title: "THE WAY OF KINGS",
      subtitle: "The Stormlight Archive — Book One",
      footer: "Arrows/WASD to choose · Enter to select",
      items: [
        {
          label: "New Game",
          hint: "Begin from the Prelude",
          onSelect: () => {
            game.save.clear();
            game.progress = game.progress.constructor
              ? new (game.progress.constructor)(game.chapterOrder)
              : game.progress;
            startChapterFlow(game.chapterOrder[0]);
          },
        },
        {
          label: "Continue",
          hint: hasSave ? "Resume your saved journey" : "No save found",
          disabled: !hasSave,
          onSelect: () => {
            game.restore();
            showChapterSelect();
          },
        },
        { label: "Chapter Select", hint: "Jump to an unlocked chapter", onSelect: showChapterSelect },
      ],
    });
  }

  function showTitle() {
    game.scenes.replace(buildTitle());
  }

  function showChapterSelect() {
    const items = game.chapterOrder.map((id) => {
      const ch = game.chapters.get(id);
      const unlocked = game.progress.isUnlocked(id);
      const done = game.progress.isCompleted(id);
      return {
        label: `${done ? "✓ " : ""}${ch.title}`,
        hint: unlocked ? ch.blurb : "Locked — complete earlier chapters",
        disabled: !unlocked,
        onSelect: () => startChapterFlow(id),
      };
    });
    items.push({ label: "← Back", onSelect: showTitle });
    game.scenes.replace(new MenuScene({ title: "Chapters", subtitle: "Choose your path", items }));
  }

  game.restore(); // load progress if present (title 'Continue' depends on it)
  game.start(buildTitle());
}

if (typeof document !== "undefined") {
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
}
