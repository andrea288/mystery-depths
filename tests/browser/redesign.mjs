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
        : { width: 1440, height: 1000 },
      hasTouch: mobile,
    });
    const errors = [];
    page.on("pageerror", (e) => errors.push(e.message));
    page.on("response", (r) => {
      if (r.status() >= 400) errors.push(`${r.status()} ${r.url()}`);
    });
    await page.goto(process.env.GAME_URL || "http://127.0.0.1:4190");
    await page.locator("#start-button").waitFor();
    await page.screenshot({
      path: `test-results/dex-camp-${mobile ? "mobile" : "desktop"}.png`,
      fullPage: true,
    });
    await page.evaluate(async () => {
      const { Game } = await import("./src/adventure.mjs"),
        { default: create } = await import("./assets/wasm/eos-core.mjs");
      const d = await (await fetch("assets/game/data.json")).json();
      const g = new Game(d, await create());
      g.start(4, 42);
      for (const id of [7, 1]) {
        const m = g.makeMon(id, 5);
        Object.assign(m, g.nearFree(g.run.player), {
          uid: g.run.teamUid++,
          active: true,
        });
        g.run.companions.push(m);
      }
      g.run.seen = g.run.map.map((row) => row.map(() => true));
      g.validateRun(g.run);
      localStorage.setItem("mystery-depths-v3", JSON.stringify(g.export()));
    });
    await page.reload();
    await page.locator("#resume-button").click();
    await page.locator("#player-card h3").waitFor();
    const run = () =>
      page.evaluate(
        () => JSON.parse(localStorage.getItem("mystery-depths-v3")).run,
      );
    assert.equal(await page.locator(".team-strip [data-command]").count(), 3);
    assert.equal(
      await page.evaluate(
        () => document.documentElement.scrollWidth > innerWidth,
      ),
      false,
    );
    await page.screenshot({
      path: `test-results/dex-dungeon-${mobile ? "mobile" : "desktop"}.png`,
      fullPage: true,
    });
    const before = await run();
    await page.locator("#bag-shortcut").click();
    assert.ok(await page.locator("#bag-dialog").isVisible());
    await page.keyboard.press("ArrowRight");
    assert.equal((await run()).turn, before.turn);
    await page.screenshot({
      path: `test-results/dex-bag-${mobile ? "mobile" : "desktop"}.png`,
    });
    await page.keyboard.press("Escape");
    assert.equal(await page.locator("#bag-dialog").isVisible(), false);
    await page.locator("#face-button").click();
    await page.locator('[data-direction="1,0"]').click();
    assert.equal((await run()).turn, before.turn);
    await page.locator("#movement-button").click();
    assert.equal(
      await page.locator("#face-button").getAttribute("aria-pressed"),
      "false",
    );
    const preview = await page.evaluate(async () => {
      const { Game } = await import("./src/adventure.mjs"),
        { Renderer } = await import("./src/render.mjs"),
        { default: create } = await import("./assets/wasm/eos-core.mjs"),
        d = await (await fetch("assets/game/data.json")).json(),
        g = new Game(d, await create());
      g.restore(JSON.parse(localStorage.getItem("mystery-depths-v3")));
      const c = document.createElement("canvas");
      c.style.cssText = "width:640px;height:400px;position:fixed;left:-1000px";
      document.body.append(c);
      const renderer = new Renderer(c);
      let total = 0;
      for (let i = 0; i < 18; i++) {
        g.run.floor = String(i * 5 + 1);
        g.buildFloor();
        g.run.seen = g.run.map.map((row) => row.map(() => true));
        const before = JSON.stringify(g.export());
        renderer.draw(g, 123);
        renderer.draw(g, 456);
        if (JSON.stringify(g.export()) !== before)
          throw Error("Il renderer ha mutato la simulazione");
        total++;
      }
      c.remove();
      return total;
    });
    assert.equal(preview, 18);
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
    await page.locator('[data-command="0"]').click();
    await page.locator("#wait-button").click();
    await page.screenshot({
      path: `test-results/dex-boss-${mobile ? "mobile" : "desktop"}.png`,
      fullPage: true,
    });
    assert.deepEqual(errors, []);
    results.push({
      mobile,
      teamOfThree: true,
      bagKeyboardIsolation: true,
      orientationFree: true,
      noHorizontalOverflow: true,
      biomesRendered: preview,
      renderDoesNotMutateSave: true,
      errors,
    });
    await page.close();
  }
  fs.writeFileSync(
    "test-results/browser-redesign.json",
    JSON.stringify(results, null, 2),
  );
  console.log(results);
} finally {
  await browser.close();
}
