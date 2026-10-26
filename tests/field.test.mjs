import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { createRequire } from "node:module";
import { Game, FIELD } from "../src/field.mjs";
globalThis.require = createRequire(import.meta.url);
globalThis.__dirname = process.cwd() + "/assets/wasm";
const { default: create } = await import("../assets/wasm/eos-core.mjs");
const core = await create({
  wasmBinary: fs.readFileSync("assets/wasm/eos-core.wasm"),
});
const D = JSON.parse(fs.readFileSync("assets/game/data.json"));
D.expedition = JSON.parse(fs.readFileSync("assets/game/expedition-data.json"));
function make() {
  const g = new Game(D, core);
  g.start(4, 42);
  g.run.floor = 5;
  g.buildFloor();
  g.beginBoss();
  g.run.enemies = [];
  g.run.adventure.terrain = [];
  g.run.adventure.weather = "clear";
  g.run.player.x = 10;
  g.run.player.y = 12;
  g.run.field.features = [];
  for (const row of g.run.seen) row.fill(true);
  return g;
}
function compatible(g, key) {
  const id = Object.keys(D.expedition.species).find((id) =>
    D.expedition.species[id].fieldSkills.includes(key),
  );
  const old = g.run.player;
  g.run.player = Object.assign(g.makeMon(+id, 5), {
    uid: 0,
    x: old.x,
    y: old.y,
  });
}
test("MN: 11 nomi ufficiali e compatibilità per ogni specie", () => {
  assert.equal(Object.keys(FIELD).length, 11);
  for (const [key, d] of Object.entries(FIELD))
    assert.equal(d.name, D.expedition.hmNames[key]);
  for (const id of Object.keys(D.pokemon)) assert.ok(D.expedition.species[id]);
});
for (const key of Object.keys(FIELD))
  test(
    "MN: " + FIELD[key].name + " esegue un effetto e consuma energia una volta",
    () => {
      const g = make();
      compatible(g, key);
      const m = g.run.player,
        d = FIELD[key],
        p = { x: m.x + 1, y: m.y };
      if (d.feature) g.run.field.features.push({ ...p, kind: d.feature });
      if (key === "dive")
        g.run.field.features.push({ x: m.x, y: m.y, kind: "water" });
      if (["flash", "defog"].includes(key)) {
        p.x = m.x;
        g.run.field.features.push({ x: m.x + 1, y: m.y, kind: "fog" });
      }
      assert.ok(g.useField(0, key, p));
      assert.equal(g.run.turn, 0);
      assert.ok(g.resolveOrders());
      assert.equal(g.run.turn, 1);
      assert.equal(g.run.field.energy, 10 - d.cost);
      assert.equal(g.run.field.uses, 1);
      if (d.travel) assert.equal(m.x, p.x);
      if (["cut", "rockSmash", "whirlpool", "flash", "defog"].includes(key))
        assert.equal(g.run.field.features.length, 0);
      if (key === "strength") assert.equal(g.run.field.features[0].x, p.x + 1);
      if (key === "surf") assert.equal(g.run.field.features[0].kind, "ford");
      if (["dive", "waterfall", "rockClimb"].includes(key))
        assert.equal(m.protectUntil, 1);
      g.validateRun(g.run);
    },
  );
test("MN: ordine invalido non consuma turni, energia o RNG", () => {
  const g = make(),
    before = g.export();
  assert.equal(g.useField(0, "cut", { x: -1, y: 0 }), false);
  assert.deepEqual(g.export(), before);
});
test("MN: salvataggio con ordine pianificato, migrazione e dati malformati", () => {
  const g = make();
  g.run.field.features = [{ x: 11, y: 12, kind: "vines" }];
  assert.ok(g.useField(0, "cut", { x: 11, y: 12 }));
  const copy = new Game(D, core);
  copy.restore(g.export());
  assert.deepEqual(copy.export(), g.export());
  const bad = g.export();
  bad.run.field.energy = -1;
  assert.throws(() => copy.restore(bad));
  const old = g.export();
  delete old.run.field;
  old.run.tactics.orders = {};
  copy.restore(old);
  assert.equal(copy.run.field.energy, 10);
});
test("MN: riserva energia condivisa e collisioni di atterraggio nei boss", () => {
  const g = make();
  compatible(g, "fly");
  const a = g.makeMon(g.run.player.species, 5);
  Object.assign(a, { uid: g.run.teamUid++, x: 12, y: 12, active: true });
  g.run.companions.push(a);
  g.run.field.energy = 5;
  assert.ok(g.useField(0, "fly", { x: 11, y: 12 }));
  assert.equal(g.useField(a.uid, "fly", { x: 11, y: 12 }), false);
  g.run.field.energy = 10;
  assert.ok(g.useField(a.uid, "fly", { x: 11, y: 12 }));
  assert.ok(g.orderPreview().every((o) => o.conflict));
  assert.equal(g.resolveOrders(), false);
  assert.equal(g.run.turn, 0);
});
test("MN: i piani restano percorribili senza tecniche e la generazione è ripetibile", () => {
  for (let seed = 1; seed <= 15; seed++) {
    const g = new Game(D, core),
      h = new Game(D, core);
    g.start(4, seed);
    h.start(4, seed);
    assert.deepEqual(g.run.field, h.run.field);
    const queue = [g.run.player],
      seen = new Set();
    for (let i = 0; i < queue.length; i++) {
      const p = queue[i],
        key = `${p.x},${p.y}`;
      if (seen.has(key)) continue;
      seen.add(key);
      for (const [dx, dy] of [
        [1, 0],
        [-1, 0],
        [0, 1],
        [0, -1],
      ])
        if (
          g.floorTile(p.x + dx, p.y + dy) &&
          !seen.has(`${p.x + dx},${p.y + dy}`)
        )
          queue.push({ x: p.x + dx, y: p.y + dy });
    }
    assert.ok(seen.has(`${g.run.exit.x},${g.run.exit.y}`));
    g.validateRun(g.run);
  }
});
test("MN: un alleato usa la tecnica senza ottenere una seconda azione autonoma", () => {
  const g = make();
  g.run.tactics = null;
  const a = g.makeMon(1, 5);
  Object.assign(a, { uid: g.run.teamUid++, x: 12, y: 12, active: true });
  g.run.companions.push(a);
  g.run.field.features = [{ x: 13, y: 12, kind: "vines" }];
  assert.ok(g.useField(a.uid, "cut", { x: 13, y: 12 }));
  assert.equal(g.run.turn, 1);
  assert.equal(a.x, 12);
  assert.equal(a.y, 12);
  assert.equal(g.run.field.uses, 1);
});

test("MN: copertura riduce il danno reale senza cambiare il consumo di RNG", () => {
  const setup = () => {
    const g = make(),
      e = g.makeMon(7, 5);
    Object.assign(e, { uid: 44, x: 11, y: 12, hp: 999, maxHp: 999 });
    g.run.enemies = [e];
    return g;
  };
  const g = setup(),
    h = setup();
  h.run.field.features = [{ x: 12, y: 12, kind: "boulder" }];
  g.attack(g.run.player, g.run.enemies[0], null);
  h.attack(h.run.player, h.run.enemies[0], null);
  const plain = 999 - g.run.enemies[0].hp,
    covered = 999 - h.run.enemies[0].hp;
  assert.ok(plain > 1);
  assert.equal(covered, Math.max(1, Math.floor(plain * 0.75)));
  assert.deepEqual(g.combat.snapshot(), h.combat.snapshot());
});
test("MN: nebbia limita la linea di vista di entrambe le squadre e viene dispersa", () => {
  const g = make();
  compatible(g, "defog");
  const m = g.run.player,
    target = { x: 14, y: 12 };
  g.run.field.features = [{ x: 13, y: 12, kind: "fog" }];
  assert.equal(g.los(m, target), false);
  assert.equal(g.los(target, m), false);
  assert.ok(g.useField(0, "defog", m));
  assert.ok(g.resolveOrders());
  assert.equal(g.los(m, target), true);
});
test("MN: acqua rallenta, il guado permette il passo normale", () => {
  const g = make(),
    m = g.run.player;
  g.run.field.features = [{ x: 11, y: 12, kind: "water" }];
  g.run.turn = 1;
  assert.ok(g.walkActor(m, 11, 12));
  g.run.turn = 2;
  assert.equal(g.walkActor(m, 12, 12), false);
  g.run.turn = 3;
  assert.ok(g.walkActor(m, 12, 12));
  g.run.field.features[0].kind = "ford";
  g.run.turn = 4;
  assert.ok(g.walkActor(m, 11, 12));
  g.run.turn = 5;
  assert.ok(g.walkActor(m, 12, 12));
});

test("MN: tutti i 18 biomi e le fasi dei boss mantengono salvataggi validi", () => {
  const g = new Game(D, core);
  g.start(4, 42);
  for (let floor = 1; floor <= 90; floor++) {
    g.run.floor = floor;
    g.buildFloor();
    g.validateRun(g.run);
    if (g.run.tactics) {
      const b = g.run.enemies.find((e) => e.boss);
      b.hp = Math.floor(b.maxHp * 0.5);
      g.prepareIntent();
      g.validateRun(g.run);
    }
  }
});
