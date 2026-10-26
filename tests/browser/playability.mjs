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
    const page = await browser.newPage({ viewport });
    const errors = [];
    page.on("pageerror", (e) => errors.push(e.message));
    await page.goto(process.env.GAME_URL || "http://127.0.0.1:4194");
    await page.locator("#start-button").waitFor();
    assert.ok(
      (await page.locator(".starter-card").first().boundingBox()).height <= 60,
    );
    await page.locator("#start-button").click();
    await page.locator("#quick-moves button").first().waitFor();
    assert.ok(await page.locator("#quick-moves").isVisible());
    const saved = () =>
      page.evaluate(
        () => JSON.parse(localStorage.getItem("mystery-depths-v3")).run,
      );
    const before = await saved();
    await page.locator("#minimap").click();
    await page.locator("#expanded-map").waitFor();
    const large=await page.locator("#expanded-map").boundingBox();
    const small=await page.locator("#minimap").boundingBox();
    assert.ok(large.width>small.width*2);
    await page.getByRole("button",{name:"Torna al gioco",exact:true}).click();
    assert.equal((await saved()).turn,before.turn);
    await page.keyboard.press("Space");
    const after = await saved();
    assert.equal(after.turn, before.turn);
    assert.ok(after.w <= 33 && after.h <= 25);
    assert.deepEqual(errors, []);
    await page.screenshot({ path: `/tmp/playability-${viewport.width}.png` });
    await page.close();
  }
  console.log(
    "Desktop e touch: starter compatti, mosse visibili, Spazio senza attacco, dungeon compatto OK",
  );
} finally {
  await browser.close();
}
