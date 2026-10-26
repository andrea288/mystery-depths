import { chromium } from "@playwright/test";
import assert from "node:assert/strict";
import fs from "node:fs";
const browser = await chromium.launch({
  executablePath: "/usr/bin/chromium",
  args: ["--no-sandbox"],
});
const results = [];
try {
  for (const [width, height] of [
    [1440, 900],
    [390, 844],
    [360, 740],
    [844, 390],
  ]) {
    const page = await browser.newPage({
      viewport: { width, height },
      hasTouch: width < 900,
    });
    const errors = [];
    page.on("pageerror", (e) => errors.push(e.message));
    page.on("response", (r) => {
      if (r.status() >= 400) errors.push(`${r.status()} ${r.url()}`);
    });
    await page.goto(process.env.GAME_URL || "http://127.0.0.1:4192");
    await page.locator("#start-button").click();
    await page.locator('[data-command="0"]').waitFor();
    const run = () =>
      page.evaluate(
        () => JSON.parse(localStorage.getItem("mystery-depths-v3")).run,
      );
    await page.evaluate(async () => {
      const { Game } = await import("./src/adventure.mjs"),
        { default: create } = await import("./assets/wasm/eos-core.mjs"),
        d = await (await fetch("assets/game/data.json")).json(),
        g = new Game(d, await create());
      g.start(4, 42);
      for (const id of [7, 1]) {
        const m = g.makeMon(id, 5);
        Object.assign(m, g.nearFree(g.run.player), {
          uid: g.run.teamUid++,
          active: true,
        });
        g.run.companions.push(m);
      }
      localStorage.setItem("mystery-depths-v3", JSON.stringify(g.export()));
    });
    await page.reload();
    await page.locator("#resume-button").click();
    await page.locator('[data-command="0"]').waitFor();
    const bounds = async () =>
      page.evaluate(() => ({
        scrollX: document.documentElement.scrollWidth > innerWidth,
        scrollY: document.documentElement.scrollHeight > innerHeight + 1,
        canvas: document.getElementById("dungeon").getBoundingClientRect()
          .height,
        controls: [
          ...document.querySelectorAll(
            ".primary-actions button,.touch-controls button",
          ),
        ].map((b) => {
          const r = b.getBoundingClientRect();
          return (
            r.top >= 0 &&
            r.bottom <= innerHeight &&
            r.left >= 0 &&
            r.right <= innerWidth
          );
        }),
      }));
    let layout = await bounds();
    assert.equal(layout.scrollX, false);
    assert.equal(layout.scrollY, false);
    assert.ok(layout.controls.every(Boolean));
    const clickable = await page
      .locator(".primary-actions button,.touch-controls button")
      .evaluateAll((bs) =>
        bs.every((b) => {
          const r = b.getBoundingClientRect();
          return (
            document
              .elementFromPoint(r.x + r.width / 2, r.y + r.height / 2)
              ?.closest("button") === b
          );
        }),
      );
    assert.ok(clickable, "Un comando è coperto da un pannello");
    if (width < 900) {
      const targets = await page
        .locator(".touch-controls button,.primary-actions button")
        .evaluateAll((bs) => bs.map((b) => b.getBoundingClientRect().height));
      assert.ok(targets.every((h) => h >= 44));
    }
    assert.ok(
      layout.canvas > height * 0.4,
      `Map too small: ${layout.canvas}/${height}`,
    );
    await page.screenshot({
      animations: "disabled",
      path: `test-results/ux-game-${width}x${height}.png`,
    });
    const initial = (await run()).turn;
    await page.locator("#moves-button").click();
    assert.ok(await page.locator("#moves-panel").isVisible());
    await page.keyboard.press("ArrowRight");
    await page.keyboard.press("w");
    assert.equal((await run()).turn, initial);
    await page.screenshot({
      animations: "disabled",
      path: `test-results/ux-moves-${width}x${height}.png`,
    });
    await page.keyboard.press("Escape");
    assert.equal(await page.locator("#moves-panel").isVisible(), false);
    assert.equal(
      await page.locator("#moves-button").getAttribute("aria-expanded"),
      "false",
    );
    await page.locator("#hud-tools-button").click();
    await page.keyboard.press("ArrowDown");
    await page.keyboard.press("w");
    assert.equal((await run()).turn, initial);
    await page.keyboard.press("Escape");
    assert.equal(
      await page.evaluate(() => document.activeElement.id),
      "hud-tools-button",
    );
    await page.locator("#manage-team").click();
    assert.equal(
      await page.locator("#modal").getAttribute("data-side"),
      "left",
    );
    await page.keyboard.press("ArrowDown");
    assert.equal((await run()).turn, initial);
    await page.screenshot({
      animations: "disabled",
      path: `test-results/ux-team-${width}x${height}.png`,
    });
    await page.keyboard.press("Escape");
    await page.locator("#bag-shortcut").click();
    const box = await page.locator("#bag-dialog").boundingBox();
    assert.ok(box.x > 0);
    assert.ok(box.y >= 0 && box.y + box.height <= height + 1);
    await page.keyboard.press("ArrowUp");
    assert.equal((await run()).turn, initial);
    await page.keyboard.press("Escape");
    await page.locator("#face-button").click();
    await page.locator('[data-direction="1,0"]').click();
    assert.equal((await run()).turn, initial);
    await page.locator("#movement-button").click();
    assert.equal(
      await page.locator("#face-button").getAttribute("aria-pressed"),
      "false",
    );
    await page.evaluate(async () => {
      const { Game } = await import("./src/adventure.mjs"),
        { default: create } = await import("./assets/wasm/eos-core.mjs"),
        d = await (await fetch("assets/game/data.json")).json(),
        g = new Game(d, await create());
      g.restore(JSON.parse(localStorage.getItem("mystery-depths-v3")));
      g.run.floor = 5;
      g.buildFloor();
      localStorage.setItem("mystery-depths-v3", JSON.stringify(g.export()));
    });
    await page.reload();
    await page.locator("#resume-button").click();
    await page.locator("#begin-boss").click();
    layout = await bounds();
    assert.equal(layout.scrollY, false);
    assert.equal(layout.scrollX, false);
    const confirm = await page.locator("#resolve-orders").boundingBox();
    assert.ok(confirm.y + confirm.height <= height);
    for (let i = 0; i < 3; i++) {
      await page.locator("#wait-button").click();
      if (i < 2) await page.locator("#resolve-orders").click();
    }
    assert.ok(await page.locator("#resolve-orders").isEnabled());
    assert.ok(
      (await page.locator("#floor-label").boundingBox()).y >= 0,
      "Il focus ha spostato la schermata",
    );
    const turn = (await run()).turn;
    await page.screenshot({
      animations: "disabled",
      path: `test-results/ux-boss-${width}x${height}.png`,
    });
    await page.locator("#resolve-orders").click();
    assert.equal((await run()).turn, turn + 1);
    assert.deepEqual(errors, []);
    results.push({
      width,
      height,
      noPageScroll: true,
      controlsInsideViewport: true,
      menuInputIsolation: true,
      sideDrawers: true,
      orientationFree: true,
      bossOrders: true,
      errors,
    });
    await page.close();
  }
  fs.writeFileSync(
    "test-results/browser-ux.json",
    JSON.stringify(results, null, 2),
  );
  console.log(results);
} finally {
  await browser.close();
}
