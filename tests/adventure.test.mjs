import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { createRequire } from "node:module";
import { Game, GEAR } from "../src/adventure.mjs";
globalThis.require = createRequire(import.meta.url);
globalThis.__dirname = process.cwd() + "/assets/wasm";
const { default: create } = await import("../assets/wasm/eos-core.mjs");
const core = await create({
  wasmBinary: fs.readFileSync("assets/wasm/eos-core.wasm"),
});
const D = JSON.parse(fs.readFileSync("assets/game/data.json"));
const make = (options = {}) => {
  const g = new Game(D, core);
  g.start(4, 42, undefined, options);
  return g;
};
function companion(g, id = 7) {
  const m = g.makeMon(id, 5),
    pos = g.nearFree(g.run.player);
  Object.assign(m, pos, {
    uid: g.run.teamUid++,
    active: g.active().length < 3,
  });
  g.run.companions.push(m);
  return m;
}
function clear(g) {
  g.run.enemies = [];
  g.run.adventure.weather = "clear";
}
function boss(g) {
  g.run.floor = 5;
  g.buildFloor();
  g.beginBoss();
}
function cfg(g, a, b, id = "Tackle") {
  return {
    move: { id, pp: 20 },
    attacker: g.configMon(a),
    defender: g.configMon(b),
    dungeon: { weather: "clear" },
    misc: { version: "NA" },
    rngState: 123456789,
  };
}
test("Avventura: 29 starter, nuove aree e roundtrip v7 senza alterare RNG", () => {
  for (const id of D.starterIds) {
    const g = new Game(D, core);
    g.start(id, 42);
    g.validateRun(g.run);
    const copy = new Game(D, core);
    copy.restore(g.export());
    assert.deepEqual(copy.export(), g.export());
    assert.equal(g.run.adventure.sites.length, 5);
  }
});
test("Anteprima ordini: conflitti visibili e nessun turno consumato", () => {
  const g = make(),
    a = companion(g);
  boss(g);
  g.run.player.x = 10;
  g.run.player.y = 14;
  a.x = 12;
  a.y = 14;
  g.plan(0, { type: "move", dx: 1, dy: 0 });
  g.plan(a.uid, { type: "move", dx: -1, dy: 0 });
  const turn = g.run.turn;
  assert.ok(g.orderPreview().every((o) => o.conflict));
  assert.equal(g.resolveOrders(), false);
  assert.equal(g.run.turn, turn);
});
test("Scambio simultaneo: due ordini reciproci scambiano le posizioni nello stesso turno", () => {
  const g = make(),
    a = companion(g);
  boss(g);
  g.run.player.x = 10;
  g.run.player.y = 14;
  a.x = 11;
  a.y = 14;
  g.plan(0, { type: "move", dx: 1, dy: 0 });
  g.plan(a.uid, { type: "move", dx: -1, dy: 0 });
  assert.ok(g.orderPreview().every((o) => !o.conflict));
  assert.ok(g.resolveOrders());
  assert.equal(g.run.player.x, 11);
  assert.equal(a.x, 10);
  assert.equal(g.run.turn, 1);
});
test("Intenzioni boss bloccate prima del turno, fasi e arena mutano con i PS", () => {
  const g = make();
  boss(g);
  const e = g.run.enemies[0];
  g.run.player.x = e.x;
  g.run.player.y = e.y + 1;
  g.prepareIntent();
  const intent = structuredClone(g.run.adventure.bossIntent);
  assert.equal(intent.kind, "attack");
  g.plan(0, { type: "move", dx: 1, dy: 1 });
  assert.deepEqual(g.run.adventure.bossIntent, intent);
  g.resolveOrders();
  e.hp = Math.floor(e.maxHp * 0.6);
  g.prepareIntent();
  assert.equal(g.run.adventure.bossPhase, 2);
  assert.equal(g.run.map[9][8], 1);
  e.hp = Math.floor(e.maxHp * 0.3);
  g.prepareIntent();
  assert.equal(g.run.adventure.bossPhase, 3);
  assert.equal(g.run.map[9][8], 0);
});
test("Cura mirata e PP ripristinati sul compagno, non sullo starter", () => {
  const g = make(),
    a = companion(g);
  clear(g);
  a.hp = 1;
  g.run.bag.berry = 1;
  const hp = g.run.player.hp;
  assert.ok(g.useItemOn("berry", a.uid));
  assert.equal(a.hp, a.maxHp);
  assert.equal(g.run.player.hp, hp);
  a.moves[0].pp = 0;
  g.run.bag.ether = 1;
  g.useItemOn("ether", a.uid);
  assert.equal(a.moves[0].pp, D.moves[a.moves[0].id].pp);
  g.validateRun(g.run);
});
test("Esperienza alla squadra, riserve al 50%, apprendimento e PP non ricaricabili cambiando slot", () => {
  const g = make(),
    active = companion(g),
    bench = companion(g);
  bench.active = false;
  clear(g);
  const e = g.makeMon(19, 5);
  Object.assign(e, {
    uid: 77,
    x: g.run.exit.x,
    y: g.run.exit.y,
    hp: 0,
    hitByMove: true,
  });
  g.run.enemies = [e];
  g.removeDead();
  assert.ok(active.teamXp >= bench.teamXp);
  assert.ok(active.bond > 0);
  const m = g.run.player,
    ids = g.D.pokemon[m.species].learnset;
  m.knownMoves = ids;
  const first = m.moves[0].id;
  m.moves[0].pp = 1;
  const other = ids.find((id) => !m.moves.some((s) => s.id === id));
  assert.ok(g.equipMove(0, 0, other));
  assert.ok(g.equipMove(0, 0, first));
  assert.equal(m.moves[0].pp, 1);
});
test("Tattiche e disattivazione mosse sono salvate e rispettate dalla selezione IA", () => {
  const g = make(),
    a = companion(g);
  clear(g);
  assert.ok(g.setTactic(a.uid, "conserve"));
  const e = g.makeMon(4, 5);
  Object.assign(e, { uid: 12, x: a.x, y: a.y - 1 });
  g.run.enemies = [e];
  for (const s of a.moves) g.toggleMove(a.uid, s.id);
  assert.equal(g.bestMove(a, e), undefined);
  const copy = new Game(D, core);
  copy.restore(g.export());
  assert.equal(copy.run.companions[0].tactic, "conserve");
  assert.deepEqual(copy.run.companions[0].disabledMoves, a.disabledMoves);
});
test("Evoluzioni a scelta, requisiti e consumi strumenti; lo starter conserva uid 0", () => {
  const g = make();
  clear(g);
  g.run.player.level = 16;
  assert.ok(g.evolutionOptions(0).some((e) => e.to === 5 && e.ready));
  assert.equal(g.run.player.species, 4);
  assert.ok(g.evolve(0, 5));
  assert.equal(g.run.player.uid, 0);
  assert.equal(g.run.player.species, 5);
  assert.ok(g.starterIds().includes(5));
  const p = companion(g, 25);
  assert.equal(g.evolve(p.uid, 26), false);
  g.run.adventure.gear.thunderStone = 1;
  assert.ok(g.evolve(p.uid, 26));
  assert.equal(g.run.adventure.gear.thunderStone, 0);
  g.validateRun(g.run);
});
test("Rapporti fra tipi consultabili senza consumo RNG o PP", () => {
  const g = make(),
    p = g.run.player,
    e = g.makeMon(1, 5);
  e.uid = 4;
  const before = g.combat.snapshot(),
    pp = p.moves.map((s) => s.pp);
  const result = g.matchup(p, e, D.moves[52]);
  assert.equal(result.score, 3);
  assert.deepEqual(g.combat.snapshot(), before);
  assert.deepEqual(
    p.moves.map((s) => s.pp),
    pp,
  );
});
test("Abilità di campo: Sincronismo, Idratazione e Magicscudo hanno effetti reali", () => {
  const g = make(),
    r = companion(g, 280),
    e = g.makeMon(25, 5);
  Object.assign(e, { uid: 333, x: r.x, y: r.y - 1 });
  g.run.enemies = [e];
  g.inflict(r, "burn", e);
  assert.ok(g.hasStatus(e, "burn"));
  const dew = companion(g, 87);
  g.inflict(dew, "burn", e);
  g.run.adventure.weather = "rain";
  g.statusTick(dew);
  assert.deepEqual(dew.statuses, {});
  const clef = g.makeMon(36, 5);
  clef.uid = 123;
  g.inflict(clef, "poison", e);
  const hp = clef.hp;
  g.statusTick(clef);
  assert.equal(clef.hp, hp);
});
test("Mosse di stato: cura, protezione, potenziamento e paralisi", () => {
  const g = make(),
    p = g.run.player,
    e = g.makeMon(19, 5);
  Object.assign(e, { uid: 99, x: p.x + 1, y: p.y });
  g.run.map[e.y][e.x] = 0;
  g.run.enemies = [e];
  p.hp = 1;
  g.castStatus(p, D.moves[105], 0);
  assert.ok(p.hp > 1);
  g.castStatus(p, D.moves[14], 0);
  assert.equal(p.stages.atk, 2);
  g.castStatus(p, D.moves[86], 99);
  assert.ok(g.hasStatus(e, "paralysis"));
  g.castStatus(p, D.moves[182], 0);
  const hp = p.hp;
  g.attack(e, p, D.moves[33]);
  assert.equal(p.hp, hp);
});
test("Strumento tenuto: effetto nel nucleo e protezione dallo stato", () => {
  const g = make(),
    p = g.run.player,
    e = g.makeMon(19, 5);
  e.uid = 9;
  const before = g.damageResult(cfg(g, p, e));
  g.run.adventure.gear.powerBand = 1;
  g.equipGear(0, "powerBand");
  assert.equal(g.configMon(p).held_item.id, "Power Band");
  assert.ok(g.damageResult(cfg(g, p, e)).damage >= before.damage);
  g.run.adventure.gear.pechaScarf = 1;
  g.equipGear(0, "pechaScarf");
  g.inflict(p, "poison", e);
  assert.equal(g.hasStatus(p, "poison"), false);
  assert.equal(g.run.adventure.gear.powerBand, 1);
});
test("Terreno: ghiaccio fa scivolare, tipi Ghiaccio e Volante lo ignorano", () => {
  const g = make();
  clear(g);
  const p = g.run.player;
  for (let x = 3; x <= 7; x++) g.run.map[5][x] = 0;
  p.x = 3;
  p.y = 5;
  g.run.adventure.terrain = [{ x: 4, y: 5, kind: "ice" }];
  g.walkActor(p, 4, 5);
  assert.equal(p.x, 5);
  const ice = companion(g, 87);
  ice.x = 3;
  ice.y = 5;
  g.walkActor(ice, 4, 5);
  assert.equal(ice.x, 4);
});
test("Meteo influenza danni e previsione del piano successivo", () => {
  const g = make(),
    p = g.run.player,
    e = g.makeMon(19, 5);
  e.uid = 99;
  g.run.adventure.weather = "sunny";
  const sunny = g.damageResult(cfg(g, p, e, "Ember"));
  g.run.adventure.weather = "rain";
  const rain = g.damageResult(cfg(g, p, e, "Ember"));
  assert.ok(sunny.damage > rain.damage);
  const floor = g.run.floor;
  assert.equal(typeof g.weatherPreview(), "string");
  assert.equal(g.run.floor, floor);
});
test("Stanze: tesoro monouso, ristoro e ricompensa della sfida", () => {
  const g = make();
  clear(g);
  const r = g.run;
  const setup = (kind) => {
    const i = r.adventure.sites.findIndex((s) => s.kind === kind),
      s = r.adventure.sites[i];
    Object.assign(r.player, { x: s.x, y: s.y });
    return i;
  };
  let i = setup("treasure"),
    coins = r.adventure.coins;
  assert.ok(g.interact(i));
  assert.equal(r.adventure.coins, coins + 40);
  assert.equal(g.interact(i), false);
  i = setup("rest");
  r.player.hp = 1;
  r.belly = 10;
  g.interact(i);
  assert.equal(r.player.hp, r.player.maxHp);
  assert.ok(r.belly > 99);
  i = setup("trial");
  g.interact(i);
  coins = r.adventure.coins;
  for (const e of r.enemies) e.hp = 0;
  g.removeDead();
  assert.ok(r.adventure.coins >= coins + 80);
});
test("Mercante: stock limitato, compra e vende senza monete negative", () => {
  const g = make();
  clear(g);
  const r = g.run,
    i = r.adventure.sites.findIndex((s) => s.kind === "merchant"),
    s = r.adventure.sites[i];
  Object.assign(r.player, { x: s.x, y: s.y });
  const coins = r.adventure.coins;
  assert.ok(g.buy(i, "berry"));
  assert.equal(r.adventure.coins, coins - 30);
  assert.ok(g.sell(i, "berry"));
  assert.equal(r.adventure.coins, coins - 15);
  r.adventure.coins = 0;
  assert.equal(g.buy(i, "ether"), false);
});
test("Soccorso: reclutamento senza KO, sblocco starter e nessuna duplicazione dell’evento", () => {
  const g = make();
  clear(g);
  const r = g.run,
    i = r.adventure.sites.findIndex((s) => s.kind === "rescue"),
    s = r.adventure.sites[i];
  Object.assign(r.player, { x: s.x, y: s.y });
  assert.ok(g.interact(i));
  assert.equal(r.companions.length, 1);
  assert.ok(g.starterIds().includes(s.species));
  assert.equal(g.interact(i), false);
});
test("Registro persistente: specie, strumenti e guardiani", () => {
  const g = make();
  g.run.adventure.gear.powerBand = 1;
  g.discover();
  assert.ok(g.meta.discoveries.species.includes(4));
  assert.ok(g.meta.discoveries.items.includes("powerBand"));
  boss(g);
  g.run.enemies[0].hp = 0;
  g.removeDead();
  assert.ok(g.meta.discoveries.bosses.includes("grass"));
  const copy = new Game(D, core);
  copy.restore(g.export());
  assert.deepEqual(copy.meta.discoveries, g.meta.discoveries);
});
test("Difficoltà e codice sfida riproducono mappa, squadra iniziale e opzioni", () => {
  const g = make({ difficulty: "expert" }),
    copy = new Game(D, core);
  copy.startChallenge(g.exportChallenge());
  assert.equal(copy.run.adventure.difficulty, "expert");
  assert.deepEqual(copy.run.map, g.run.map);
  assert.deepEqual(copy.run.player.moves, g.run.player.moves);
  assert.equal(copy.run.adventure.challenge, true);
  assert.throws(() => copy.startChallenge("MD2:evil"));
  const normal = make(),
    a = normal.run.enemies[0];
  const hard = g.damageResult(cfg(g, g.run.enemies[0], g.run.player));
  const medium = normal.damageResult(cfg(normal, a, normal.run.player));
  assert.ok(hard.damage >= medium.damage);
});
test("Migrazione v6 conservativa e rifiuto dati corrotti senza mutare la partita", () => {
  const g = make();
  const data = g.export();
  const bad = structuredClone(data);
  bad.run.adventure.coins = -1;
  assert.throws(() => g.restore(bad));
  assert.deepEqual(g.export(), data);
  const old = structuredClone(data);
  old.run.mechanicsVersion = 6;
  delete old.run.adventure;
  g.restore(old);
  assert.equal(g.run.mechanicsVersion, 7);
  g.validateRun(g.run);
});
test("Soccorso a squadra piena: scelta obbligatoria, starter intoccabile e strumento restituito", () => {
  const g = make();
  clear(g);
  for (let i = 0; i < 5; i++) companion(g);
  const r = g.run,
    old = r.companions[0],
    i = r.adventure.sites.findIndex((s) => s.kind === "rescue"),
    site = r.adventure.sites[i];
  old.held = "powerBand";
  Object.assign(r.player, { x: site.x, y: site.y });
  const turn = r.turn;
  assert.equal(g.interact(i, 0), false);
  assert.equal(g.interact(i), false);
  assert.equal(r.turn, turn);
  assert.ok(g.interact(i, old.uid));
  assert.equal(r.turn, turn + 1);
  assert.equal(g.members().length, 6);
  assert.equal(r.player.uid, 0);
  assert.ok(!r.companions.includes(old));
  assert.equal(r.adventure.gear.powerBand, 1);
  g.validateRun(r);
});
test("Protezione, Vigore e Testadura prevengono i rispettivi danni", () => {
  const g = make(),
    p = g.run.player,
    t = g.makeMon(74, 10);
  t.uid = 99;
  g.combat.outcome = () => true;
  const hp = t.hp;
  g.attack(p, t, D.moves[90]);
  assert.equal(t.hp, hp);
  t.copiedAbility = "Unknown";
  const target = g.makeMon(19, 10);
  target.uid = 98;
  target.protectUntil = g.run.turn;
  g.attack(p, target, D.moves[90]);
  assert.ok(target.hp > 0);
  target.protectUntil = -1;
  g.attack(p, target, D.moves[90]);
  assert.equal(target.hp, 0);
  const rock = g.makeMon(95, 10),
    victim = g.makeMon(19, 10);
  rock.uid = 97;
  victim.uid = 96;
  const before = rock.hp;
  g.attack(rock, victim, D.moves[36]);
  assert.equal(rock.hp, before);
});
test("Salvataggi: rifiuta identificatori corrotti di una sfida facoltativa", () => {
  const g = make(),
    before = g.export(),
    bad = structuredClone(before);
  const s = bad.run.adventure.sites.find((s) => s.kind === "trial");
  s.pending = true;
  s.enemyUids = "errato";
  assert.throws(() => g.restore(bad));
  assert.deepEqual(g.export(), before);
});
test("Evoluzione e cambio mosse conservano un salvataggio v7 stabile", () => {
  const g = make();
  g.run.player.level = 16;
  assert.ok(g.evolve(0, 5));
  const before = g.export(),
    copy = new Game(D, core);
  copy.restore(before);
  assert.deepEqual(copy.export(), before);
  const m = g.run.player,
    choice = g
      .availableMoves(m)
      .find((id) => !m.moves.some((s) => s.id === id));
  if (choice) {
    assert.ok(g.equipMove(0, 0, choice));
    const save = g.export();
    copy.restore(save);
    assert.deepEqual(copy.export(), save);
  }
});
