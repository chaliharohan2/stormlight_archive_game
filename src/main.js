// Browser entry point. Wires the canvas to the Game, builds the title and
// chapter-select flow, and routes chapter completion through the campaign.

import { Game } from "./engine/game.js";
import { MenuScene } from "./scenes/menuScene.js";
import { NarrationScene } from "./scenes/narrationScene.js";
import { CHAPTERS } from "./content/campaign.js";

const WIDTH = 960;
const HEIGHT = 600;

function boot() {
  const canvas = document.getElementById("game");
  canvas.width = WIDTH;
  canvas.height = HEIGHT;

  const game = new Game({ canvas, width: WIDTH, height: HEIGHT, chapters: CHAPTERS });

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
          { title: "The Way of Kings", subtitle: "Book One complete", text: "You have walked the Shattered Plains, drawn Stormlight, and spoken the First Ideal." },
          { epigraph: "“Life before death. Strength before weakness. Journey before destination.”", text: "Thank you for playing. — Words of Radiance awaits." },
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
          hint: "Begin from the prologue",
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
