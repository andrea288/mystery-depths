import { chromium } from "@playwright/test";
import { writeFileSync } from "node:fs";
const browser = await chromium.launch({
  executablePath: "/usr/bin/chromium",
  args: ["--no-sandbox"],
});
const page = await browser.newPage({ viewport: { width: 1440, height: 1100 } });
const errors = [];
page.on("pageerror", (e) => errors.push(e.message));
await page.goto(process.env.GAME_URL || "http://127.0.0.1:4173");
await page.locator('[data-starter="4"]').click();
await page.locator("#seed-input").fill("314159");
await page.locator("#run-difficulty").selectOption("relaxed");
await page.locator("#start-button").click();
await page.locator("#player-card h3").waitFor();
// Read-only copy of each autosave is used to choose legal keyboard actions.
await page.evaluate(async () => {
  window.qaData = await (await fetch("assets/game/data.json")).json();
  window.qaGame = (await import("./src/adventure.mjs")).Game;
  window.qaCore = await (await import("./assets/wasm/eos-core.mjs")).default();
});
const records = [];
let lastFloor = 0,
  resumed = false,
  permanent = false;
for (let step = 0; step < 2500; step++) {
  if (await page.locator("body.playing-action").count()) {
    await page.locator("#skip-animation").evaluate((button) => button.click());
    await page.locator("body.playing-action").waitFor({ state: "hidden" });
  }
  if (
    await page
      .getByRole("button", { name: "Prosegui senza reclutare", exact: true })
      .isVisible()
  ) {
    const buttons = page.locator("[data-recruit]");
    if (
      (await buttons.count()) &&
      (await page.evaluate(
        () =>
          JSON.parse(localStorage.getItem("mystery-depths-v3")).run.companions
            .length < 5,
      ))
    )
      await buttons.first().click();
    else
      await page
        .getByRole("button", { name: "Prosegui senza reclutare", exact: true })
        .click();
  }
  if (await page.locator("#begin-boss").isVisible()) {
    await page.locator("#begin-boss").click();
    continue;
  }
  if (await page.locator("#resolve-orders").isVisible()) {
    const orders = await page.evaluate(() => {
      const g = new window.qaGame(window.qaData, window.qaCore);
      g.restore(JSON.parse(localStorage.getItem("mystery-depths-v3")));
      return g.active().map((m) => {
        const t = g.run.enemies[0],
          dist = Math.max(Math.abs(m.x - t.x), Math.abs(m.y - t.y));
        if (m.uid === 0 && m.hp < m.maxHp * 0.65 && g.run.bag.berry)
          return { uid: m.uid, item: "berry" };
        if (m.uid === 0 && m.moves.every((s) => s.pp === 0) && g.run.bag.ether)
          return { uid: m.uid, item: "ether" };
        const best = g.bestMove(m, t);
        if (best)
          return {
            uid: m.uid,
            slot: best.slot,
            dx: Math.sign(t.x - m.x),
            dy: Math.sign(t.y - m.y),
          };
        if (dist === 1 && g.canStep(m, t.x, t.y, true))
          return { uid: m.uid, attack: true, dx: t.x - m.x, dy: t.y - m.y };
        const step = g.pathStep(m, t);
        return step
          ? { uid: m.uid, dx: step.x - m.x, dy: step.y - m.y }
          : { uid: m.uid, wait: true };
      });
    });
    for (const order of orders) {
      await page.locator(`[data-command="${order.uid}"]`).click();
      if (order.item) {
        await page.locator("#bag-shortcut").click();
        await page.locator(`[data-item="${order.item}"]`).click();
        await page.getByRole("button", { name: /^Charmander ·/ }).click();
      } else if (order.wait) await page.locator("#order-wait").click();
      else {
        if (order.slot !== undefined)
          await page.locator(`[data-move="${order.slot}"]`).click();
        else if (order.attack) await page.locator("#order-attack").click();
        await page.keyboard.press(
          {
            "0,1": "ArrowDown",
            "0,-1": "ArrowUp",
            "1,0": "ArrowRight",
            "-1,0": "ArrowLeft",
            "-1,-1": "q",
            "1,-1": "e",
            "-1,1": "z",
            "1,1": "c",
          }[[order.dx, order.dy].join(",")],
        );
      }
    }
    // The new preview rejects colliding destinations; correct them through the UI.
    for (
      let attempt = 0;
      attempt < 3 && !(await page.locator("#resolve-orders").isEnabled());
      attempt++
    ) {
      const uid = await page.evaluate(() => {
        const g = new window.qaGame(window.qaData, window.qaCore);
        g.restore(JSON.parse(localStorage.getItem("mystery-depths-v3")));
        return g
          .orderPreview()
          .filter((o) => o.conflict)
          .sort((a, b) => b.uid - a.uid)[0]?.uid;
      });
      if (uid === undefined) throw Error("Ordine mancante senza conflitto");
      await page.locator(`[data-command="${uid}"]`).click();
      await page.locator("#order-wait").click();
    }
    await page.locator("#resolve-orders").click();
    continue;
  }
  const plan = await page.evaluate(() => {
    const save = JSON.parse(localStorage.getItem("mystery-depths-v3")),
      g = new window.qaGame(window.qaData, window.qaCore);
    g.restore(save);
    const r = g.run,
      p = r.player;
    if (r.state !== "playing")
      return {
        state: r.state,
        floor: r.floor,
        kills: r.kills,
        turn: r.turn,
        rewards: r.reward,
      };
    const danger = r.enemies.some((e) => g.visible(e.x, e.y));
    if (danger && Object.keys(p.statuses).length && r.bag.healSeed)
      return { item: "healSeed" };
    if (danger && p.hp < p.maxHp * 0.8 && r.bag.sitrus)
      return { item: "sitrus" };
    if (!danger && p.hp < p.maxHp * 0.95 && r.belly > 10) return { key: "." };
    if (danger && p.hp < p.maxHp * 0.8 && r.bag.berry) return { item: "berry" };
    if (r.belly < 25 && r.bag.apple) return { item: "apple" };
    if (
      (p.moves.every((m) => m.pp === 0) ||
        (!danger && p.moves.some((m) => m.pp === 0))) &&
      r.bag.ether
    )
      return { item: "ether" };
    const enemies = r.enemies
      .filter((e) => g.visible(e.x, e.y))
      .sort(
        (a, b) =>
          Math.max(Math.abs(a.x - p.x), Math.abs(a.y - p.y)) -
          Math.max(Math.abs(b.x - p.x), Math.abs(b.y - p.y)),
      );
    for (const e of enemies) {
      const usable = p.moves
        .map((s, i) => ({ s, i, m: window.qaData.moves[s.id] }))
        .filter((x) => x.s.pp > 0 && g.validTarget(p, e, x.m))
        .sort((a, b) => b.m.power - a.m.power);
      if (usable.length)
        return {
          key: String(usable[0].i + 1),
          target: { x: e.x, y: e.y },
          player: { x: p.x, y: p.y },
        };
      if (
        Math.max(Math.abs(e.x - p.x), Math.abs(e.y - p.y)) === 1 &&
        g.canStep(p, e.x, e.y, true)
      )
        return {
          key: {
            "0,1": "ArrowDown",
            "0,-1": "ArrowUp",
            "1,0": "ArrowRight",
            "-1,0": "ArrowLeft",
            "-1,-1": "q",
            "1,-1": "e",
            "-1,1": "z",
            "1,1": "c",
          }[[e.x - p.x, e.y - p.y].join(",")],
        };
    }
    if (p.x === r.exit.x && p.y === r.exit.y && !r.enemies.some((e) => e.boss))
      return { key: "Enter" };
    const goal =
      r.enemies.find((e) => e.boss) ||
      (p.level < 6
        ? r.enemies.sort(
            (a, b) =>
              Math.max(Math.abs(a.x - p.x), Math.abs(a.y - p.y)) -
              Math.max(Math.abs(b.x - p.x), Math.abs(b.y - p.y)),
          )[0]
        : null) ||
      r.exit;
    // A sleeping enemy can block the only corridor to the exit. Approach the
    // obstruction instead of waiting until starvation (read-only planning copy).
    const next =
      g.pathStep(p, goal) ||
      [...r.enemies]
        .sort(
          (a, b) =>
            Math.max(Math.abs(a.x - p.x), Math.abs(a.y - p.y)) -
            Math.max(Math.abs(b.x - p.x), Math.abs(b.y - p.y)),
        )
        .map((e) => g.pathStep(p, e))
        .find(Boolean);
    if (!next) return { key: "." };
    return {
      key: {
        "0,1": "ArrowDown",
        "0,-1": "ArrowUp",
        "1,0": "ArrowRight",
        "-1,0": "ArrowLeft",
        "-1,-1": "q",
        "1,-1": "e",
        "-1,1": "z",
        "1,1": "c",
      }[[next.x - p.x, next.y - p.y].join(",")],
      floor: r.floor,
      turn: r.turn,
      kills: r.kills,
    };
  });
  if (plan.floor && plan.floor !== lastFloor) {
    lastFloor = plan.floor;
    records.push(plan);
    console.log("Progress", JSON.stringify(plan));
  }
  if (plan.state === "dead") {
    records.push(plan);
    break;
  }
  if (plan.state === "reward") {
    const i = permanent ? 0 : plan.rewards.findIndex((r) => r.kind === "move");
    permanent ||= i >= 0;
    await page.locator(`[data-reward="${i >= 0 ? i : 0}"]`).click();
    const replace = page.locator("#modal[open] .modal-actions button").first();
    if (await replace.isVisible()) await replace.click();
    await page.locator("#modal").waitFor({ state: "hidden" });
    if (!resumed) {
      await page.reload();
      await page.locator("#resume-button").click();
      await page.locator("#player-card h3").waitFor();
      await page.evaluate(async () => {
        window.qaData = await (await fetch("assets/game/data.json")).json();
        window.qaGame = (await import("./src/adventure.mjs")).Game;
        window.qaCore = await (
          await import("./assets/wasm/eos-core.mjs")
        ).default();
      });
      resumed = true;
    }
    if (plan.floor >= 5) {
      console.log("Boss completed");
      break;
    }
    continue;
  }
  if (plan.item) {
    await page.locator("#bag-shortcut").click();
    await page.locator(`[data-item="${plan.item}"]`).click();
    if (!["apple", "bigApple", "hugeApple", "seed"].includes(plan.item))
      await page.getByRole("button", { name: /^Charmander ·/ }).click();
    continue;
  }
  if (plan.target) {
    await page.waitForTimeout(180); // Let the 160ms movement animation settle before aiming.
    const box = await page.locator("#dungeon").boundingBox();
    await page.mouse.click(
      box.x +
        box.width / 2 +
        (plan.target.x - plan.player.x) * (box.width >= 700 ? 56 : 40),
      box.y +
        box.height / 2 +
        (plan.target.y - plan.player.y) * (box.width >= 700 ? 56 : 40),
    );
  }
  await page.keyboard.press(plan.key);
}
let reachedBoss = lastFloor >= 5;
const beforeDeath = await page.evaluate(() =>
  JSON.parse(localStorage.getItem("mystery-depths-v3")),
);
let died = false,
  newRun = false;
if (reachedBoss) {
  for (let n = 0; n < 1800; n++) {
    const state = await page.evaluate(
      () => JSON.parse(localStorage.getItem("mystery-depths-v3")).run.state,
    );
    if (state === "dead") {
      died = true;
      break;
    }
    await page.keyboard.press(".");
    if (await page.locator("body.playing-action").count()) {
      await page
        .locator("#skip-animation")
        .evaluate((button) => button.click());
      await page.locator("body.playing-action").waitFor({ state: "hidden" });
    }
  }
  if (died) {
    await page
      .getByRole("button", { name: "Torna al campo base", exact: true })
      .click();
    await page.locator("#start-button").click();
    await page.locator("#player-card h3").waitFor();
    const after = await page.evaluate(() =>
      JSON.parse(localStorage.getItem("mystery-depths-v3")),
    );
    newRun =
      after.run.floor === 1 &&
      after.run.player.level === 5 &&
      after.run.bag.berry === 3 &&
      JSON.stringify(after.meta.unlocks) ===
        JSON.stringify(beforeDeath.meta.unlocks);
  }
}
const end = await page.evaluate(() =>
  JSON.parse(localStorage.getItem("mystery-depths-v3")),
);
await page.screenshot({ path: "test-results/journey.png", fullPage: true });
writeFileSync(
  "test-results/browser-journey.json",
  JSON.stringify(
    {
      records,
      resumed,
      permanent,
      reachedBoss,
      died,
      newRun,
      errors,
      beforeDeath,
      end,
    },
    null,
    2,
  ),
);
console.log({
  floor: end.run.floor,
  state: end.run.state,
  kills: end.run.kills,
  turn: end.run.turn,
  resumed,
  permanent,
  reachedBoss,
  died,
  newRun,
  errors,
});
await browser.close();
if (errors.length || !reachedBoss || !died || !newRun) process.exitCode = 1;
