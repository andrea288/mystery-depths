import { chromium } from "@playwright/test";
import assert from "node:assert/strict";
const browser = await chromium.launch({
  executablePath: "/usr/bin/chromium",
  args: ["--no-sandbox"],
});
try {
  const page = await browser.newPage();
  await page.goto(process.env.GAME_URL || "http://127.0.0.1:4194");
  const result = await page.evaluate(async () => {
    const { Game } = await import("./src/field.mjs"),
      { Renderer } = await import("./src/render.mjs"),
      { default: create } = await import("./assets/wasm/eos-core.mjs");
    const d = await (await fetch("assets/game/data.json")).json();
    d.expedition = await (
      await fetch("assets/game/expedition-data.json")
    ).json();
    const g = new Game(d, await create());
    g.start(4, 42);
    g.run.enemies = [];
    const ally = g.makeMon(7, 5);
    Object.assign(ally, {
      uid: g.run.teamUid++,
      x: g.run.player.x + 4,
      y: g.run.player.y + 3,
      active: true,
    });
    g.run.companions.push(ally);
    g.selectLeader(ally.uid);
    const canvas = document.createElement("canvas");
    canvas.style.width = "800px";
    canvas.style.height = "600px";
    document.body.append(canvas);
    const renderer = new Renderer(canvas);
    await renderer.prepare([4, 7]);
    renderer.draw(g, performance.now());
    const focus = {
      ...renderer.camera,
      uid: g.controlled().uid,
      seen: g.run.seen[ally.y][ally.x],
    };
    g.run.tactics = { phase: "plan", orders: {} };
    renderer.draw(g, performance.now());
    const boss = { ...renderer.camera };
    return {
      focus,
      boss,
      ally: { x: ally.x, y: ally.y },
      canvas: { w: canvas.width, h: canvas.height },
    };
  });
  assert.notEqual(result.focus.uid, 0);
  assert.equal(result.focus.seen, true);
  assert.ok(
    Math.abs(
      result.focus.x +
        result.ally.x * result.focus.size +
        result.focus.size / 2 -
        result.canvas.w / 2,
    ) <= 1,
  );
  assert.ok(
    Math.abs(
      result.focus.y +
        result.ally.y * result.focus.size +
        result.focus.size / 2 -
        result.canvas.h / 2,
    ) <= 1,
  );
  assert.notEqual(result.boss.x, result.focus.x);
  console.log("Telecamera sul compagno; visuale boss fissa: OK");
} finally {
  await browser.close();
}
