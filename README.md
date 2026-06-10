# The Way of Kings — a Stormlight Archive game

A 2D narrative action-RPG that adapts **Book One of the Stormlight Archive,
_The Way of Kings_** by Brandon Sanderson. Play through six chapters spanning
the whole novel — from Szeth's assassination of King Gavilar to Kaladin
speaking the First Ideal of the Knights Radiant.

Built **from scratch with zero runtime dependencies**: plain HTML5 Canvas and
vanilla JavaScript ES modules. No build step, no framework, no asset pipeline —
all visuals are drawn procedurally.

---

## Play it

You need [Node.js](https://nodejs.org/) 18+ (only to serve the files — the game
itself runs entirely in your browser).

```bash
npm run serve          # starts a static server on http://localhost:8080
```

Then open **http://localhost:8080** in a modern browser and choose **New Game**.

> Opening `index.html` directly via `file://` won't work — browsers block ES
> module imports over the file protocol, which is why the tiny `serve` script
> exists.

## Controls

| Action | Keys |
| --- | --- |
| Move | `W` `A` `S` `D` or Arrow keys |
| Interact / talk / confirm | `E` or `Enter` |
| Strike (spear) | `Space` or `J` |
| Dash / Lash on Stormlight | `Shift` or `K` |
| Dialogue & menu choices | `1`–`4`, or Arrows + `Enter` |
| Pause hint | `P` |

In the minigames the same keys do the obvious thing: **hold `Space`/`Shift` to
BRACE** during the bridge run, **hold `Space` to channel** Stormlight while
Soulcasting, and pick numbered choices in Dalinar's visions.

## The story (six chapters)

1. **Prologue — To Kill.** Play Szeth, the white-clad Truthless, Lashing
   yourself through Gavilar's palace to assassinate the king.
2. **Bridge Four.** Kaladin, a branded slave, must carry a bridge into Parshendi
   arrows — the signature **bridge-run** minigame. Brace to shield the crew.
3. **The Palanaeum.** Shallan wards under the heretic scholar Jasnah and learns
   **Soulcasting** — choose the right Essence and pour Stormlight to transform
   matter.
4. **Visions in the Storm.** Dalinar walks the highstorm **visions**; your
   choices decide whether he emerges Radiant, Honorable, Wavering, or Fallen.
5. **The Tower.** Sadeas's betrayal — Kaladin, now touched by Stormlight, Lashes
   across the chasms and cuts through the Parshendi to save Dalinar's army.
6. **Words of Radiance.** On the edge of death, Kaladin speaks the First Ideal
   and Syl becomes a Shardblade. The Knights Radiant return.

Progress saves automatically (browser `localStorage`); **Continue** and
**Chapter Select** are available from the title screen.

## Project layout

```
src/
  core/        Pure, DOM-free game logic (unit-tested):
               rng, physics, combat, stormlight, dialogue, inventory,
               progression, tilemap, bridgeRun, soulcast, vision
  engine/      Browser runtime: game loop, scene stack, renderer, input,
               storage, event bus
  scenes/      Concrete scenes: world, dialogue, narration, menu, game-over,
               and the three minigame scenes
  content/     The campaign (characters.js, campaign.js)
  main.js      Browser entry point
tools/
  serve.js        zero-dep static file server
  verify-ui.mjs   Playwright UI smoke test
tests/            node:test suites + a headless autoplay harness
index.html, styles.css
```

The architecture deliberately splits **pure logic** (in `src/core`, fully
unit-tested with no DOM) from a thin **rendering/scene layer**, so the entire
simulation — including a full campaign playthrough — can be driven and verified
headlessly.

## Tests

```bash
npm test
```

Runs the full suite with Node's built-in test runner — **124 tests** covering
the core logic plus integration tests that drive the _real_ game loop through:

- a sphere pickup and a real melee kill,
- a **complete six-chapter playthrough** (an autoplay harness walks every
  narration page, dialogue, minigame, and combat area to the ending), and
- save/restore of campaign progress.

### Browser UI verification (optional)

A Playwright smoke test launches the actual game in headless Chromium, drives it
from the title screen into gameplay with real keystrokes, asserts the canvas
renders non-blank frames that respond to input, and checks for JS errors:

```bash
npm i -D playwright && npx playwright install chromium   # one-time
npm run verify:ui                                        # writes tools/screenshots/
```

## Credits

A fan project built for learning and love of the books. _The Stormlight Archive_
and all its characters are the creation of **Brandon Sanderson**. No copyright
infringement intended; not for sale.
