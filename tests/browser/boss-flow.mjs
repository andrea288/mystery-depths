import { chromium } from "@playwright/test";
import assert from "node:assert/strict";
const browser = await chromium.launch({
  executablePath: "/usr/bin/chromium",
  args: ["--no-sandbox"],
});
try {
  for (const viewport of [
    { width: 1440, height: 900 },
    { width: 390, height: 844 },
  ]) {
    const page = await browser.newPage({
      viewport,
      hasTouch: viewport.width < 500,
    });
    const errors = [];
    page.on("pageerror", (e) => errors.push(e.message));
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
      const ids = [7, 1];
      for (const [i, id] of ids.entries()) {
        const m = g.makeMon(id, 5);
        Object.assign(m, {
          uid: g.run.teamUid++,
          active: true,
          x: g.run.player.x + 2 + i,
          y: g.run.player.y,
        });
        g.run.companions.push(m);
      }
      g.run.floor = 5;
      g.buildFloor();
      g.validateRun(g.run);
      localStorage.setItem("mystery-depths-v3", JSON.stringify(g.export()));
    });
    await page.reload();
    await page.locator("#resume-button").click();
    const saved = () =>
      page.evaluate(
        () => JSON.parse(localStorage.getItem("mystery-depths-v3")).run,
      );
    assert.equal((await saved()).w, 13);
    assert.equal((await saved()).h, 11);
    await page.locator("#begin-boss").click();
    const turn = (await saved()).turn;
    await page.locator("#boss-wait").click();
    assert.equal((await saved()).turn, turn);
    assert.equal((await saved()).tactics.orders[0].type, "wait");
    assert.match(await page.locator(".tactical-summary").innerText(), /2\/3/);
    await page.locator("#boss-back").click();
    assert.match(await page.locator(".tactical-summary").innerText(), /1\/3/);
    await page.locator("#resolve-orders").click();
    await page.locator("#boss-wait").click();
    assert.equal(await page.locator("#resolve-orders").innerText(), "Conferma");
    await page.screenshot({ path: `/tmp/boss-flow-${viewport.width}.png` });
    assert.ok(await page.locator("#resolve-orders").isDisabled());
    await page.locator("#boss-wait").click();
    assert.equal((await saved()).turn, turn);
    await page.locator("#resolve-orders").click();
    assert.equal((await saved()).turn, turn + 1);
    assert.deepEqual(errors, []);
    await page.close();
    console.log("Boss sequenziale " + viewport.width + "px: OK");
  }
} finally {
  await browser.close();
}
