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
      if (r.status() >= 400) errors.push(r.status() + " " + r.url());
    });
    await page.goto(process.env.GAME_URL || "http://127.0.0.1:4184");
    await page.locator("#start-button").click();
    await page.locator("#player-card h3").waitFor();
    // Build a validated controlled save: roster of six at the boss, using actual recruitment methods.
    await page.evaluate(async () => {
      const { Game } = await import("./src/team.mjs");
      const { default: create } = await import("./assets/wasm/eos-core.mjs");
      const d = await (await fetch("assets/game/data.json")).json();
      const g = new Game(d, await create());
      g.start(4, 42);
      for (const id of [7, 25, 41, 12, 36]) {
        g.run.enemies = [];
        g.run.player.x = g.run.exit.x;
        g.run.player.y = g.run.exit.y;
        g.run.floorKOs = [{ species: id, level: 5 }];
        g.stairs();
        g.recruit(id);
        g.chooseReward(0);
      }
      g.run.floor = 5;
      g.buildFloor();
      g.validateRun(g.run);
      localStorage.setItem("mystery-depths-v3", JSON.stringify(g.export()));
    });
    await page.reload();
    assert.equal(await page.locator('[data-starter="41"]').count(), 1);
    await page.locator("#resume-button").click();
    await page.locator("#begin-boss").waitFor();
    const save = () =>
      page.evaluate(
        () => JSON.parse(localStorage.getItem("mystery-depths-v3")).run,
      );
    let r = await save();
    assert.equal(r.companions.length, 5);
    assert.equal(r.companions.filter((m) => m.active).length, 2);
    const turn = r.turn;
    const box = await page.locator("#dungeon").boundingBox(),
      size = Math.min(
        40,
        Math.floor(box.width / 21),
        Math.floor(box.height / 15),
      );
    const x = box.x + box.width / 2 + 2 * size,
      y = box.y + box.height / 2 + 6 * size;
    if (mobile) await page.touchscreen.tap(x, y);
    else await page.mouse.click(x, y);
    assert.equal((await save()).player.x, 14);
    assert.equal((await save()).player.y, 15);
    await page.locator("#begin-boss").click();
    await page.locator("#wait-button").click();
    assert.equal((await save()).turn, turn);
    assert.ok(await page.locator("#resolve-orders").isDisabled());
    for (const m of r.companions.filter((m) => m.active)) {
      await page.locator(`[data-command="${m.uid}"]`).click();
      if (m.species === 7) {
        if (mobile) await page.locator('[data-direction="0,1"]').tap();
        else await page.keyboard.press("ArrowDown");
      } else {
        await page.locator("#moves-button").click();
        await page.locator('[data-move="0"]').click();
        if (mobile) await page.locator('[data-direction="0,-1"]').tap();
        else await page.keyboard.press("ArrowUp");
      }
    }
    assert.ok(await page.locator("#resolve-orders").isEnabled());
    await page.screenshot({
      path: `test-results/team-boss-${mobile ? "mobile" : "desktop"}.png`,
      fullPage: true,
    });
    await page.locator("#resolve-orders").click();
    assert.equal((await save()).turn, turn + 1);
    await page.locator("#skip-animation").evaluate((b) => b.click());
    await page.locator("body.playing-action").waitFor({ state: "hidden" });
    await page.locator("#manage-team").click();
    const bench = r.companions.find((m) => !m.active);
    await page.locator(`[data-bring="${bench.uid}"]`).click();
    assert.equal(
      await page
        .locator("#modal .modal-actions button")
        .filter({ hasText: "Charmander" })
        .count(),
      0,
    );
    await page.locator("#modal .modal-actions button").first().click();
    await page.locator("#skip-animation").evaluate((b) => b.click());
    await page.locator("body.playing-action").waitFor({ state: "hidden" });
    assert.equal((await save()).turn, turn + 2);
    await page.reload();
    assert.equal(await page.locator('[data-starter="41"]').count(), 1);
    await page.locator("#resume-button").click();
    assert.equal((await save()).turn, turn + 2);
    assert.equal(
      (await save()).companions.find((m) => m.uid === bench.uid).active,
      true,
    );
    assert.deepEqual(errors, []);
    results.push({
      mobile,
      ordersWaitForAll: true,
      swapCostsOneTurn: true,
      starterProtected: true,
      saveRestored: true,
      errors,
    });
    await page.close();
  }
  console.log(results);
  fs.writeFileSync(
    "test-results/browser-team.json",
    JSON.stringify(results, null, 2),
  );
} finally {
  await browser.close();
}
