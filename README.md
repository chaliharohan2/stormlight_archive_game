# The Way of Kings — a Stormlight Archive game

A **3D** narrative action-RPG that adapts **Book One of the Stormlight Archive,
_The Way of Kings_** by Brandon Sanderson. Play through eight chapters spanning
the whole novel — from the Heralds abandoning the Oathpact at Aharietiam to
Bridge Four's charge at the Tower.

Built **from scratch with no build step and no framework**: vanilla JavaScript
ES modules, rendered with [Three.js](https://threejs.org/) (vendored in
`vendor/`, no install or bundler required). The world is drawn procedurally in
WebGL — extruded stone, glowing spheres, Stormlight, figures that follow a
three-quarter camera — over a transparent 2D Canvas that paints the HUD and
text. Where WebGL isn't available the game **falls back to the original pure-2D
renderer** automatically, so it still runs (and tests) anywhere.

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

## The story (eight chapters)

1. **Prelude — The Oathpact.** Play Kalak, a Herald, crossing the corpse-strewn
   field of Aharietiam to find Jezrien — and learn the Heralds are abandoning
   the Oathpact, leaving Taln alone to hold it.
2. **To Kill.** Play Szeth, the white-clad Truthless, Lashing yourself through
   Gavilar's palace to assassinate the king.
3. **Bridge Four.** Kaladin, a branded slave, must carry a bridge into Parshendi
   arrows — the signature **bridge-run** minigame. Brace to shield the crew.
4. **The Palanaeum.** Shallan wards under the heretic scholar Jasnah and learns
   **Soulcasting** — choose the right Essence and pour Stormlight to transform
   matter.
5. **The Shardbearer.** Eight months earlier: squadleader Kaladin fells a
   Shardbearer in open battle, refuses the Shards — and Brightlord Amaram
   repays him with a shash brand and slavery.
6. **Visions in the Storm.** Dalinar walks the highstorm **visions** — now
   including the Midnight Essence town and the Day of Recreance at Feverstone
   Keep; your choices decide whether he emerges Radiant, Honorable, Wavering,
   or Fallen.
7. **The Assassin in White.** Szeth again, his Oathstone in a new master's
   hand: two assassinations — the King of Jah Keved and the Prime of Azir —
   and a list with one name left on it.
8. **The Tower.** The finale — Sadeas's betrayal, Kaladin's charge back across
   the chasms, and Dalinar trading his Shardblade Oathbringer to free every
   bridgeman.

Progress saves automatically (browser `localStorage`); **Continue** and
**Chapter Select** are available from the title screen.

## Project layout

```
src/
  core/        Pure, DOM-free game logic (unit-tested):
               rng, physics, combat, stormlight, dialogue, inventory,
               progression, tilemap, bridgeRun, soulcast, vision
  engine/      Browser runtime: game loop, scene stack, 2D renderer, input,
               storage, event bus
  scenes/      Concrete scenes: world, dialogue, narration, menu, game-over,
               and the three minigame scenes
  render3d/    The 3D layer: one "presenter" per scene type that mirrors the
               scene's plain logic state into a Three.js scene graph each frame
  content/     The campaign (characters.js, campaign.js)
  main.js      Browser entry point
vendor/          Vendored Three.js (no npm install / bundler needed)
tools/
  serve.js        zero-dep static file server
  verify-ui.mjs   Playwright UI smoke test (checks both render layers)
tests/            node:test suites + a headless autoplay harness
index.html, styles.css
```

The architecture deliberately splits **pure logic** (in `src/core`, fully
unit-tested with no DOM) from a thin **rendering/scene layer**, so the entire
simulation — including a full campaign playthrough — can be driven and verified
headlessly. The 3D presenters in `src/render3d` only *read* scene state and
never write to it: scenes know nothing about Three.js, which is why the game
stays fully playable and testable without a GPU.

## Tests

```bash
npm test
```

Runs the full suite with Node's built-in test runner — **128 tests** covering
the core logic plus integration tests that drive the _real_ game loop through:

- a sphere pickup and a real melee kill,
- a **complete eight-chapter playthrough** (an autoplay harness walks every
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
