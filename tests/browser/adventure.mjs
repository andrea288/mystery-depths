import { chromium } from "@playwright/test";
import assert from "node:assert/strict";
import fs from "node:fs";
const browser = await chromium.launch({
  executablePath: "/usr/bin/chromium",
  args: ["--no-sandbox"],
});
const results = [];
try {
  for (const mobile of [false, true]) {
    const page = await browser.newPage({
      viewport: mobile
        ? { width: 390, height: 844 }
        : { width: 1440, height: 1100 },
      hasTouch: mobile,
    });
    const errors = [];
    page.on("pageerror", (e) => errors.push(e.message));
    page.on("response", (r) => {
      if (r.status() >= 400) errors.push(`${r.status()} ${r.url()}`);
    });
    await page.goto(process.env.GAME_URL || "http://127.0.0.1:4186");
    await page.locator("#start-button").waitFor();
    await page.locator("#run-difficulty").selectOption("relaxed");
    await page.locator("#start-button").click();
    await page.locator("#player-card h3").waitFor();
    await page.evaluate(async () => {
      const { Game } = await import("./src/adventure.mjs"),
        { default: create } = await import("./assets/wasm/eos-core.mjs"),
        d = await (await fetch("assets/game/data.json")).json(),
        g = new Game(d, await create());
      g.start(4, 42);
      g.run.enemies = [];
      g.run.player.level = 16;
      g.run.adventure.coins = 1000;
      g.run.adventure.gear.powerBand = 1;
      const m = g.makeMon(7, 5);
      Object.assign(m, g.nearFree(g.run.player), {
        uid: g.run.teamUid++,
        active: true,
        hp: 1,
      });
      g.run.companions.push(m);
      g.validateRun(g.run);
      localStorage.setItem("mystery-depths-v3", JSON.stringify(g.export()));
    });
    await page.reload();
    await page.locator("#resume-button").click();
    await page.locator("#adventure-bar").waitFor();
    const saved = () =>
      page.evaluate(
        () => JSON.parse(localStorage.getItem("mystery-depths-v3")).run,
      );
    const finish = async () => {
      if (await page.locator("body.playing-action").count()) {
        await page.locator("#skip-animation").evaluate((b) => b.click());
        await page.locator("body.playing-action").waitFor({ state: "hidden" });
      }
    };
    await page.locator('[data-item="berry"]').click();
    await page.getByRole("button", { name: /Squirtle ·/ }).click();
    await finish();
    assert.equal(
      (await saved()).companions[0].hp,
      (await saved()).companions[0].maxHp,
    );
    await page.locator("#manage-team").click();
    await page.locator('[data-manage-member="1000000"]').click();
    await page.locator("#member-tactic").selectOption("guard");
    await page.locator("#held-gear").selectOption("powerBand");
    assert.equal((await saved()).companions[0].held, "powerBand");
    await page
      .getByRole("button", { name: "Torna alla squadra", exact: true })
      .click();
    await page.locator('[data-manage-member="0"]').click();
    await page.locator('[data-evolve="5"]').click();
    await page.getByRole("button", { name: "Evolvi", exact: true }).click();
    await page.locator("#member-tactic").waitFor();
    assert.equal((await saved()).player.species, 5);
    await page.getByRole("button", { name: "Chiudi", exact: true }).click();
    await page.locator("#challenge-button").click();
    assert.ok((await page.locator("#share-code").inputValue()).includes(":4:"));
    await page.getByRole("button", { name: "Chiudi", exact: true }).click();
    await page.evaluate(() => {
      const s = JSON.parse(localStorage.getItem("mystery-depths-v3")),
        site = s.run.adventure.sites.find((s) => s.kind === "merchant");
      Object.assign(s.run.player, { x: site.x, y: site.y });
      localStorage.setItem("mystery-depths-v3", JSON.stringify(s));
    });
    await page.reload();
    await page.locator("#resume-button").click();
    await page.locator("#site-button").click();
    const before = (await saved()).adventure.coins;
    await page.locator('[data-buy="berry"]').click();
    assert.equal((await saved()).adventure.coins, before - 30);
    await page.locator('[data-sell="berry"]').click();
    assert.equal((await saved()).adventure.coins, before - 15);
    await page.screenshot({
      path: `test-results/adventure-merchant-${mobile ? "mobile" : "desktop"}.png`,
      fullPage: true,
    });
    await page.getByRole("button", { name: "Chiudi", exact: true }).click();
    await page.evaluate(async () => {
      const { Game } = await import("./src/adventure.mjs"),
        { default: create } = await import("./assets/wasm/eos-core.mjs"),
        d = await (await fetch("assets/game/data.json")).json(),
        g = new Game(d, await create());
      g.restore(JSON.parse(localStorage.getItem("mystery-depths-v3")));
      g.run.floor = 5;
      g.buildFloor();
      g.beginBoss();
      Object.assign(g.run.player, { x: 10, y: 14 });
      Object.assign(g.run.companions[0], { x: 11, y: 14 });
      g.prepareIntent();
      g.validateRun(g.run);
      localStorage.setItem("mystery-depths-v3", JSON.stringify(g.export()));
    });
    await page.reload();
    await page.locator("#resume-button").click();
    await page.locator("#resolve-orders").waitFor();
    await page.locator('[data-command="0"]').click();
    await page.keyboard.press("ArrowRight");
    await page.locator('[data-command="1000000"]').click();
    await page.keyboard.press("ArrowLeft");
    assert.ok(await page.locator("#resolve-orders").isEnabled());
    await page.screenshot({
      path: `test-results/adventure-orders-${mobile ? "mobile" : "desktop"}.png`,
      fullPage: true,
    });
    await page.locator("#resolve-orders").click();
    await finish();
    assert.equal((await saved()).player.x, 11);
    assert.equal((await saved()).companions[0].x, 10);
    await page.locator("#discovery-button").click();
    await page
      .getByRole("heading", { name: "Registro delle scoperte" })
      .waitFor();
    assert.deepEqual(errors, []);
    results.push({
      mobile,
      healingTarget: true,
      tactics: true,
      equipment: true,
      evolution: true,
      sharedSeed: true,
      merchant: true,
      orderPreviewAndSwap: true,
      discoveries: true,
      errors,
    });
    await page.close();
  }
  fs.writeFileSync(
    "test-results/browser-adventure.json",
    JSON.stringify(results, null, 2),
  );
  console.log(results);
} finally {
  await browser.close();
}
