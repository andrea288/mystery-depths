import { chromium } from "@playwright/test";
import assert from "node:assert/strict";
import { writeFileSync } from "node:fs";
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
        : { width: 1440, height: 900 },
      hasTouch: mobile,
    });
    const errors = [];
    page.on("pageerror", (e) => errors.push(e.message));
    page.on("response", (r) => {
      if (r.status() >= 400) errors.push(`${r.status()} ${r.url()}`);
    });
    await page.goto(process.env.GAME_URL || "http://127.0.0.1:4180");
    await page.locator("#start-button").waitFor();
    await page.screenshot({
      path: `test-results/pixel-camp-${mobile ? "mobile" : "desktop"}.png`,
      fullPage: true,
    });
    await page.locator("#start-button").click();
    await page.locator("#player-card h3").waitFor();
    const save = () =>
      page.evaluate(
        () => JSON.parse(localStorage.getItem("mystery-depths-v3")).run,
      );
    const before = await save();
    await page.locator("#face-button").click();
    for (const direction of ["1,0", "0,-1", "-1,1"]) {
      if (mobile) await page.locator(`[data-direction="${direction}"]`).tap();
      else await page.locator(`[data-direction="${direction}"]`).click();
    }
    let after = await save();
    assert.equal(after.player.facing, 1);
    const box = await page.locator("#dungeon").boundingBox();
    if (mobile)
      await page.touchscreen.tap(
        box.x + box.width / 2 + 70,
        box.y + box.height / 2,
      );
    else
      await page.mouse.click(
        box.x + box.width / 2 + 70,
        box.y + box.height / 2,
      );
    after = await save();
    assert.equal(after.player.facing, 6);
    if (!mobile) {
      await page.mouse.click(
        box.x + box.width / 2,
        box.y + box.height / 2 - 70,
        { button: "right" },
      );
      after = await save();
      assert.equal(after.player.facing, 4);
    }
    assert.equal(after.turn, before.turn);
    assert.equal(after.belly, before.belly);
    assert.deepEqual(after.combatRng, before.combatRng);
    assert.deepEqual(after.enemies, before.enemies);
    assert.equal(after.player.x, before.player.x);
    assert.equal(after.player.y, before.player.y);
    assert.deepEqual(after.player.moves, before.player.moves);
    await page.reload();
    await page.locator("#resume-button").click();
    await page.locator("#player-card h3").waitFor();
    assert.equal((await save()).player.facing, after.player.facing);
    await page.locator("#wait-button").evaluate((b) => b.click());
    assert.equal((await save()).turn, before.turn + 1);
    assert.equal(
      await page.evaluate(
        () => document.documentElement.scrollWidth > innerWidth,
      ),
      false,
    );
    await page.screenshot({
      path: `test-results/pixel-game-${mobile ? "mobile" : "desktop"}.png`,
      fullPage: true,
    });
    assert.deepEqual(errors, []);
    results.push({
      mobile,
      orientationFree: true,
      saveRestored: true,
      waitConsumesTurn: true,
      errors,
    });
    await page.close();
  }
  writeFileSync(
    "test-results/pixel-controls.json",
    JSON.stringify(results, null, 2) + "\n",
  );
  console.log(results);
} finally {
  await browser.close();
}
