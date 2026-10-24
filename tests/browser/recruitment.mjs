import { chromium } from "@playwright/test";
import assert from "node:assert/strict";
import fs from "node:fs";
const browser = await chromium.launch({
  executablePath: "/usr/bin/chromium",
  args: ["--no-sandbox"],
});
try {
  const page = await browser.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto(process.env.GAME_URL || "http://127.0.0.1:4184");
  await page.locator("#start-button").waitFor();
  await page.evaluate(async () => {
    const { Game } = await import("./src/team.mjs"),
      { default: create } = await import("./assets/wasm/eos-core.mjs"),
      data = await (await fetch("assets/game/data.json")).json();
    const g = new Game(data, await create());
    g.start(4, 42);
    const a = g.makeMon(41, 5);
    Object.assign(a, { uid: 13, x: 5, y: 5, hp: 0 });
    g.run.enemies = [a, { ...structuredClone(a), uid: 14 }];
    g.removeDead();
    Object.assign(g.run.player, g.run.exit);
    g.stairs();
    g.validateRun(g.run);
    localStorage.setItem("mystery-depths-v3", JSON.stringify(g.export()));
  });
  await page.reload();
  await page.locator("#resume-button").click();
  await page.locator('[data-recruit="41"]').waitFor();
  assert.equal(await page.locator('[data-recruit="41"]').count(), 1);
  await page.locator('[data-recruit="41"]').click();
  assert.equal(await page.locator("[data-recruit]").count(), 0);
  await page.locator('[data-reward="0"]').click();
  await page.locator("#team-strip [data-command]").nth(1).waitFor();
  await page.reload();
  assert.equal(await page.locator('[data-starter="41"]').count(), 1);
  await page.locator('[data-starter="41"]').click();
  await page.locator("#start-button").click();
  await page
    .getByRole("button", { name: "Nuova spedizione", exact: true })
    .click();
  await page.locator("#player-card h3").waitFor();
  assert.equal(await page.locator("#player-card h3").textContent(), "Zubat");
  assert.deepEqual(errors, []);
  const result = {
    oneZubatForTwoKOs: true,
    recruitOnce: true,
    starterUnlocked: true,
    recruitedStarterPlayable: true,
    errors,
  };
  fs.writeFileSync(
    "test-results/browser-recruitment.json",
    JSON.stringify(result, null, 2),
  );
  console.log(result);
} finally {
  await browser.close();
}
