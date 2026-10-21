import { chromium } from "@playwright/test";
const browser = await chromium.launch({
  executablePath: "/usr/bin/chromium",
  args: ["--no-sandbox"],
});
const page = await browser.newPage({ viewport: { width: 1440, height: 1100 } });
const errors = [];
page.on("pageerror", (e) => errors.push(e.message));
page.on("console", (m) => {
  if (m.type() === "error") errors.push(m.text());
});
await page.goto("http://127.0.0.1:4173");
await page.locator("#start-button").waitFor();
await page.screenshot({ path: "test-results/camp.png", fullPage: true });
await page.locator("#seed-input").fill("12345");
await page.locator("#start-button").click();
await page.locator("#player-card h3").waitFor();
await page.keyboard.press(".");
await page.keyboard.press("Space");
await page.screenshot({ path: "test-results/expedition.png", fullPage: true });
const saved = await page.evaluate(() =>
  JSON.parse(localStorage.getItem("mystery-depths-v3")),
);
console.log({
  errors,
  turn: saved.run.turn,
  hp: saved.run.player.hp,
  cards: await page.locator("[data-starter]").count(),
});
await page.reload();
await page.locator("#resume-button").click();
await page.locator("#player-card h3").waitFor();
console.log("Resumed", await page.locator("#turn-label").textContent());
await page.setViewportSize({ width: 390, height: 844 });
await page.screenshot({ path: "test-results/mobile.png", fullPage: true });
await browser.close();
if (errors.length) process.exitCode = 1;
