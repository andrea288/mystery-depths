import { chromium } from "@playwright/test";
import assert from "node:assert/strict";
import { writeFileSync } from "node:fs";
const browser = await chromium.launch({
  executablePath: "/usr/bin/chromium",
  args: ["--no-sandbox"],
});
try {
  const page = await browser.newPage({
      viewport: { width: 1440, height: 1000 },
    }),
    errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("response", (r) => {
    if (r.status() >= 400) errors.push(r.status() + " " + r.url());
  });
  await page.goto(process.env.GAME_URL || "http://127.0.0.1:4182");
  await page.locator('[data-starter="4"]').click();
  await page.locator("#start-button").click();
  await page.locator("#player-card h3").waitFor();
  // Controlled combat fixture; the separate journey test uses unmodified game state.
  await page.evaluate(() => {
    const s = JSON.parse(localStorage.getItem("mystery-depths-v3")),
      r = s.run,
      p = r.player,
      e = r.enemies[0];
    p.moves = [{ id: 52, pp: 15 }];
    p.facing = 6;
    e.x = p.x + 1;
    e.y = p.y;
    r.map[e.y][e.x] = 0;
    e.hp = e.maxHp = 200;
    e.awake = true;
    r.enemies = [e];
    r.items = [];
    r.traps = [];
    localStorage.setItem("mystery-depths-v3", JSON.stringify(s));
  });
  await page.reload();
  await page.locator("#resume-button").click();
  await page.locator("#player-card h3").waitFor();
  const saved = () =>
    page.evaluate(
      () => JSON.parse(localStorage.getItem("mystery-depths-v3")).run,
    );
  const before = await saved();
  await page.keyboard.press("1");
  await page.locator("body.playing-action").waitFor();
  const after = await saved();
  assert.equal(after.turn, before.turn + 1);
  for (let i = 0; i < 5; i++) await page.keyboard.press("1");
  assert.deepEqual(await saved(), after);
  await page.keyboard.press("Escape");
  await page.locator("#modal[open]").waitFor();
  const paused = await page.locator("#dungeon").screenshot();
  await page.waitForTimeout(300);
  assert.deepEqual(await page.locator("#dungeon").screenshot(), paused);
  await page.getByRole("button", { name: "Riprendi", exact: true }).click();
  await page.waitForTimeout(280);
  await page.screenshot({
    path: "test-results/move-animation.png",
    fullPage: true,
  });
  await page.locator("#skip-animation").click();
  await page.locator("body.playing-action").waitFor({ state: "hidden" });
  assert.deepEqual(await saved(), after);
  await page.keyboard.press("Escape");
  await page.getByRole("button", { name: "Opzioni", exact: true }).click();
  await page.locator("#animation-speed").selectOption("1.4");
  await page.locator('[data-option="grid"]').check();
  await page.locator('[data-option="confirmItems"]').check();
  await page.getByRole("button", { name: "Chiudi", exact: true }).click();
  await page.reload();
  assert.equal(
    await page.evaluate(
      () => JSON.parse(localStorage.getItem("mystery-depths-options")).speed,
    ),
    1.4,
  );
  assert.deepEqual(errors, []);
  const result = {
    animation: true,
    inputLocked: true,
    menuPauses: true,
    skipPreservesSimulation: true,
    preferencesPersist: true,
    errors,
  };
  writeFileSync(
    "test-results/browser-animations.json",
    JSON.stringify(result, null, 2),
  );
  console.log(result);
} finally {
  await browser.close();
}
