import { chromium } from "@playwright/test";
import assert from "node:assert/strict";
const browser = await chromium.launch({
  executablePath: "/usr/bin/chromium",
  args: ["--no-sandbox"],
});
try {
  for (const [width, height] of [
    [1440, 900],
    [390, 844],
    [844, 390],
  ]) {
    const page = await browser.newPage({
      viewport: { width, height },
      hasTouch: width < 900,
    });
    const errors = [];
    page.on("pageerror", (e) => errors.push(e.message));
    page.on("response", (r) => {
      if (r.status() >= 400) errors.push(r.url());
    });
    await page.goto(process.env.GAME_URL || "http://127.0.0.1:4194");
    await page.locator("#start-button").waitFor();
    await page.evaluate(async () => {
      const { Game } = await import("./src/field.mjs"),
        { default: create } = await import("./assets/wasm/eos-core.mjs");
      const d = await (await fetch("assets/game/data.json")).json();
      d.expedition = await (
        await fetch("assets/game/expedition-data.json")
      ).json();
      const g = new Game(d, await create());
      g.start(4, 42);
      g.run.enemies = [];
      const p = g.run.player,
        q = [
          [1, 0],
          [-1, 0],
          [0, 1],
          [0, -1],
        ]
          .map(([dx, dy]) => ({ x: p.x + dx, y: p.y + dy }))
          .find((q) => g.floorTile(q.x, q.y));
      g.run.field.features = [{ ...q, kind: "vines" }];
      g.run.seen[q.y][q.x] = true;
      g.validateRun(g.run);
      localStorage.setItem("mystery-depths-v3", JSON.stringify(g.export()));
    });
    await page.reload();
    await page.locator("#resume-button").click();
    await page.locator("#hud-tools-button").click();
    await page.locator("#field-button").click();
    await page
      .getByRole("button", { name: "Charmander ★", exact: true })
      .click();
    await page.getByRole("button", { name: /^Taglio ·/ }).click();
    await page.getByRole("button", { name: /· Rovi$/ }).click();
    await page.waitForFunction(
      () =>
        JSON.parse(localStorage.getItem("mystery-depths-v3")).run.field.uses ===
        1,
    );
    if (await page.locator("body.playing-action").count())
      await page.locator("#skip-animation").evaluate((b) => b.click());
    const r = await page.evaluate(
      () => JSON.parse(localStorage.getItem("mystery-depths-v3")).run,
    );
    assert.equal(r.turn, 1);
    assert.equal(r.field.energy, 9);
    assert.equal(r.field.features.length, 0);
    assert.equal(
      await page.evaluate(
        () => document.documentElement.scrollWidth > innerWidth,
      ),
      false,
    );
    assert.deepEqual(errors, []);
    await page.screenshot({ path: `/tmp/mn-${width}.png` });
    await page.close();
    console.log(`MN UI ${width}×${height}: OK`);
  }
} finally {
  await browser.close();
}
