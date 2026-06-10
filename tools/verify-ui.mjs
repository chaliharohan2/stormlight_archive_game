// Playwright UI smoke test: launches the real game in a headless Chromium,
// drives it from the title screen into actual gameplay with keyboard input,
// and verifies the canvas truly renders (non-blank pixels) with no JS errors.
// Captures screenshots to tools/screenshots/ for manual inspection.
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

/** Fraction of canvas pixels that differ from the very first pixel (the bg). */
async function nonBlankFraction(page) {
  return page.evaluate(() => {
    const c = document.getElementById("game");
    const ctx = c.getContext("2d");
    const { data } = ctx.getImageData(0, 0, c.width, c.height);
    const r0 = data[0], g0 = data[1], b0 = data[2];
    let diff = 0;
    const total = data.length / 4;
    for (let i = 0; i < data.length; i += 4) {
      if (data[i] !== r0 || data[i + 1] !== g0 || data[i + 2] !== b0) diff++;
    }
    return diff / total;
  });
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
    await wait(600); // let the RAF loop paint the title

    // 1) Title screen renders.
    let frac = await nonBlankFraction(page);
    check("title screen renders content", frac > 0.02, `non-bg pixels ${(frac * 100).toFixed(1)}%`);
    await page.screenshot({ path: join(SHOTS, "01-title.png") });

    // 2) New Game -> intro narration.
    await key(page, "Enter"); // select "New Game"
    await wait(500);
    frac = await nonBlankFraction(page);
    check("chapter intro narration renders", frac > 0.02, `non-bg pixels ${(frac * 100).toFixed(1)}%`);
    await page.screenshot({ path: join(SHOTS, "02-intro.png") });

    // 3) Advance through the intro pages into the prologue world area.
    for (let i = 0; i < 8; i++) await key(page, "Space", 300);
    await wait(400);
    frac = await nonBlankFraction(page);
    check("prologue world area renders", frac > 0.05, `non-bg pixels ${(frac * 100).toFixed(1)}%`);
    await page.screenshot({ path: join(SHOTS, "03-world.png") });

    // 4) Player responds to movement input (the rendered frame changes).
    const before = await page.screenshot();
    await page.keyboard.down("KeyD");
    await wait(500);
    await page.keyboard.up("KeyD");
    await key(page, "KeyJ"); // a strike
    await wait(300);
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
