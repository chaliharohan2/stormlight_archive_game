// Playwright UI smoke test: launches the real game in a headless Chromium,
// drives it from the title screen into actual gameplay with keyboard input,
// and verifies BOTH render layers work — the WebGL 3D scene (#game3d) and the
// transparent 2D HUD/text overlay (#game) — with no JS errors. Captures
// screenshots to tools/screenshots/ for manual inspection.
//
// The 3D layer is checked without reading the WebGL framebuffer (headless GL
// won't reliably hand back its pixels): we freeze the loop and compare a
// screenshot with #game3d shown vs hidden, so any difference can only be the
// 3D canvas's own contribution.
//
// Run: node tools/verify-ui.mjs   (requires `npm i -D playwright` + chromium)

import { spawn } from "node:child_process";
import { mkdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { chromium } from "playwright";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const SHOTS = join(ROOT, "tools", "screenshots");
const PORT = 8137;
const URL = `http://127.0.0.1:${PORT}/`;

const wait = (ms) => new Promise((r) => setTimeout(r, ms));

/** Press a key, then give the game a few frames to react. */
async function key(page, k, settle = 350) {
  await page.keyboard.press(k);
  await wait(settle);
}

/** Fraction of the 2D HUD canvas pixels that differ from its first pixel. */
async function hudNonBlankFraction(page) {
  return page.evaluate(() => {
    const c = document.getElementById("game");
    const { data } = c.getContext("2d").getImageData(0, 0, c.width, c.height);
    const r0 = data[0], g0 = data[1], b0 = data[2], a0 = data[3];
    let diff = 0;
    const total = data.length / 4;
    for (let i = 0; i < data.length; i += 4) {
      if (data[i] !== r0 || data[i + 1] !== g0 || data[i + 2] !== b0 || data[i + 3] !== a0) diff++;
    }
    return diff / total;
  });
}

/**
 * Readback-free proof the 3D layer renders: freeze the loop (so the frame is
 * static and nothing animates between shots), screenshot with #game3d shown,
 * then hidden, and compare. A difference can only come from the 3D canvas.
 */
async function layer3DContributes(page) {
  await page.evaluate(() => window.__game?.stop());
  await wait(150);
  const shown = await page.screenshot();
  await page.evaluate(() => { document.getElementById("game3d").style.visibility = "hidden"; });
  await wait(150);
  const hidden = await page.screenshot();
  await page.evaluate(() => {
    document.getElementById("game3d").style.visibility = "";
    window.__game?.start();
  });
  await wait(150);
  return !shown.equals(hidden);
}

async function main() {
  await mkdir(SHOTS, { recursive: true });

  // --- start the static server ---
  const server = spawn("node", ["tools/serve.js"], {
    cwd: ROOT,
    env: { ...process.env, PORT: String(PORT) },
    stdio: "ignore",
  });
  await wait(600);

  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1000, height: 680 } });

  const errors = [];
  page.on("pageerror", (e) => errors.push(`pageerror: ${e.message}`));
  page.on("console", (m) => {
    if (m.type() === "error") errors.push(`console.error: ${m.text()}`);
  });

  const checks = [];
  const check = (name, cond, detail = "") => {
    checks.push({ name, ok: !!cond, detail });
    console.log(`${cond ? "PASS" : "FAIL"}  ${name}${detail ? "  — " + detail : ""}`);
  };

  try {
    await page.goto(URL, { waitUntil: "load" });
    await page.waitForSelector("#game", { timeout: 5000 });
    await wait(700); // let the RAF loop paint the title

    // 0) The 3D renderer actually initialized (didn't silently fall back to 2D).
    const has3D = await page.evaluate(() => !!window.__r3d);
    check("WebGL 3D renderer initialized", has3D, has3D ? "window.__r3d present" : "fell back to 2D");

    // 1) Title screen renders on both layers: 3D ambient backdrop + 2D menu.
    let hud = await hudNonBlankFraction(page);
    check("title menu (2D overlay) renders", hud > 0.01, `HUD non-bg ${(hud * 100).toFixed(1)}%`);
    await page.screenshot({ path: join(SHOTS, "01-title.png") });
    check("title 3D backdrop renders", await layer3DContributes(page));

    // 2) New Game -> Prelude intro narration.
    await key(page, "Enter"); // select "New Game"
    await wait(500);
    hud = await hudNonBlankFraction(page);
    check("chapter intro narration renders", hud > 0.02, `HUD non-bg ${(hud * 100).toFixed(1)}%`);
    await page.screenshot({ path: join(SHOTS, "02-intro.png") });

    // 3) Advance through the intro pages into the Prelude world area (3D).
    for (let i = 0; i < 8; i++) await key(page, "Space", 300);
    await wait(500);
    hud = await hudNonBlankFraction(page);
    check("prelude HUD overlay renders", hud > 0.005, `HUD non-bg ${(hud * 100).toFixed(1)}%`);
    await page.screenshot({ path: join(SHOTS, "03-world.png") });
    check("prelude 3D world renders", await layer3DContributes(page));

    // 4) Player responds to movement input — the rendered frame changes (the
    //    camera follows the figure, so the 3D geometry shifts on screen).
    const before = await page.screenshot();
    await page.keyboard.down("KeyD");
    await wait(600);
    await page.keyboard.up("KeyD");
    const after = await page.screenshot();
    check("frame changes in response to input", !before.equals(after));
    await page.screenshot({ path: join(SHOTS, "04-after-input.png") });

    // 5) No uncaught JS errors during the whole flow.
    check("no JS/console errors", errors.length === 0, errors.slice(0, 3).join(" | "));
  } finally {
    await browser.close();
    server.kill();
  }

  const failed = checks.filter((c) => !c.ok);
  console.log(`\n${checks.length - failed.length}/${checks.length} UI checks passed.`);
  if (errors.length) {
    console.log("Collected errors:\n  " + errors.join("\n  "));
  }
  process.exit(failed.length ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
