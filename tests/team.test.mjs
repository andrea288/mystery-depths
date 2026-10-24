import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { createRequire } from "node:module";
import { Game, GUARDIANS, guardianFor } from "../src/team.mjs";
globalThis.require = createRequire(import.meta.url);
globalThis.__dirname = process.cwd() + "/assets/wasm";
const { default: create } = await import("../assets/wasm/eos-core.mjs");
const core = await create({
  wasmBinary: fs.readFileSync("assets/wasm/eos-core.wasm"),
});
const D = JSON.parse(fs.readFileSync("assets/game/data.json"));
const make = () => {
  const g = new Game(D, core);
  g.start(4, 42);
  return g;
};
function recruit(g, id) {
  g.run.floorKOs = [{ species: id, level: 5 }];
  g.run.player.x = g.run.exit.x;
  g.run.player.y = g.run.exit.y;
  g.run.enemies = [];
  g.stairs();
  assert.equal(g.recruit(id), true);
  g.chooseReward(0);
  return g.run.companions.at(-1);
}
function arena(g) {
  g.run.floor = 5;
  g.buildFloor();
  g.beginBoss();
  return g.run;
}
test("KO per specie e scelta singola per piano; sblocco starter permanente", () => {
  const g = make();
  const e = g.makeMon(41, 5);
  Object.assign(e, { x: 5, y: 5, hp: 0, uid: 12 });
  g.run.enemies = [e, { ...structuredClone(e), uid: 13 }];
  g.removeDead();
  assert.deepEqual(g.run.floorKOs, [{ species: 41, level: 5 }]);
  g.run.player.x = g.run.exit.x;
  g.run.player.y = g.run.exit.y;
  g.stairs();
  assert.ok(g.recruit(41));
  assert.equal(g.recruit(41), false);
  assert.ok(g.starterIds().includes(41));
  const copy = new Game(D, core);
  copy.restore(g.export());
  assert.ok(copy.starterIds().includes(41));
  copy.start(41, 99);
  assert.equal(copy.run.player.species, 41);
});
test("Sei membri, tre attivi, starter non sostituibile, cambio costa un turno", () => {
  const g = make();
  for (const id of [41, 19, 7, 25, 1]) recruit(g, id);
  assert.equal(g.members().length, 6);
  assert.equal(g.active().length, 3);
  const bench = g.run.companions.find((m) => !m.active);
  assert.equal(g.substitute(0, bench.uid), false);
  const turn = g.run.turn;
  g.run.enemies = [];
  assert.ok(g.substitute(g.active()[1].uid, bench.uid));
  assert.equal(g.run.turn, turn + 1);
  assert.equal(g.active().length, 3);
  g.validateRun(g.run);
});
test("Boss: schieramento solo nelle ultime tre righe; nessuna azione senza tutti gli ordini", () => {
  const g = make();
  recruit(g, 7);
  recruit(g, 25);
  g.run.floor = 5;
  g.buildFloor();
  const r = g.run,
    turn = r.turn;
  assert.equal(g.deploy(0, 12, 7), false);
  assert.equal(g.deploy(0, 12, 15), true);
  assert.ok(g.beginBoss());
  assert.equal(g.resolveOrders(), false);
  for (const m of g.active()) assert.ok(g.plan(m.uid, { type: "wait" }));
  assert.equal(r.turn, turn);
  assert.ok(g.resolveOrders());
  assert.equal(r.turn, turn + 1);
  assert.deepEqual(r.tactics.orders, {});
  g.validateRun(r);
});
test("Ordini boss separati: muove solo il Pokémon ordinato e non parte IA alleata", () => {
  const g = make();
  recruit(g, 7);
  arena(g);
  g.run.enemies[0].awake = false;
  const a = g.active()[1],
    before = { x: a.x, y: a.y };
  g.plan(0, { type: "wait" });
  g.plan(a.uid, { type: "move", dx: 0, dy: -1 });
  g.resolveOrders();
  assert.equal(a.x, before.x);
  assert.equal(a.y, before.y - 1);
});
test("Alleati seguono e preferiscono una mossa superefficace quando combattono", () => {
  const g = make();
  const a = recruit(g, 7);
  g.run.enemies = [];
  const p = g.run.player;
  const room = g.run.rooms[0];
  p.x = room.x + 2;
  p.y = room.y + 2;
  a.x = p.x - 2;
  a.y = p.y;
  g.alliesTurn(false);
  assert.equal(a.x, p.x - 1);
  a.moves = [
    { id: 33, pp: 35 },
    { id: 55, pp: 8 },
  ];
  const e = g.makeMon(4, 5);
  Object.assign(e, { x: a.x, y: a.y - 1, uid: 333, awake: true });
  g.run.enemies = [e];
  const best = g.bestMove(a, e);
  assert.equal(best.m.type, "water");
  const hp = e.hp;
  g.alliesTurn(true);
  assert.ok(e.hp < hp || a.moves[1].pp === 7);
});
test("KO dello starter termina la run anche con compagni vivi", () => {
  const g = make();
  recruit(g, 7);
  g.run.enemies = [];
  g.run.player.hp = 1;
  g.run.belly = 0;
  g.wait();
  assert.equal(g.run.state, "dead");
  assert.equal(g.run.player.hp, 0);
  assert.ok(g.run.companions[0].hp > 0);
});
test("18 guardiani e biomi coerenti, incontri favoriti e difficoltà crescente", () => {
  const g = make();
  assert.equal(new Set(GUARDIANS.map((b) => b.type)).size, 18);
  let previous = 0;
  for (let i = 0; i < 18; i++) {
    g.run.floor = i * 5 + 5;
    g.buildFloor();
    const b = g.run.enemies[0];
    assert.ok(
      D.pokemon[b.species].types.includes(guardianFor(g.run.floor).type),
    );
    assert.ok(
      b.moves.some(
        (s) => g.D.moves[s.id].type === guardianFor(g.run.floor).type,
      ),
    );
    assert.ok(b.level > previous);
    previous = b.level;
    g.validateRun(g.run);
    g.run.floor = i * 5 + 1;
    g.buildFloor();
    assert.ok(
      g.run.enemies.filter((e) =>
        D.pokemon[e.species].types.includes(g.biome().type),
      ).length >= Math.ceil(g.run.enemies.length * 0.7),
    );
  }
});
test("Salvataggio conserva squadra, ordini e KO; rifiuta corruzioni senza modifiche", () => {
  const g = make();
  recruit(g, 7);
  arena(g);
  g.plan(0, { type: "wait" });
  const data = g.export(),
    copy = new Game(D, core);
  copy.restore(data);
  assert.deepEqual(copy.export(), data);
  for (const mutate of [
    (r) => (r.companions[0].uid = 0),
    (r) => (r.companions[0].hp = 99999),
    (r) => (r.tactics.orders[0] = { type: "teleport" }),
    (r) => (r.floorKOs = [{ species: 99999, level: 5 }]),
  ]) {
    const broken = structuredClone(data);
    mutate(broken.run);
    assert.throws(() => copy.restore(broken));
    assert.deepEqual(copy.export(), data);
  }
});
test("Migrazione v5 e nessun danno amico dalle mosse ad area", () => {
  const g = make();
  const old = g.export();
  old.run.mechanicsVersion = 5;
  delete old.run.companions;
  delete old.run.teamUid;
  delete old.run.tactics;
  delete old.run.floorKOs;
  delete old.run.recruitmentDone;
  g.restore(old);
  assert.deepEqual(g.run.companions, []);
  assert.equal(g.run.mechanicsVersion, 6);
  const a = recruit(g, 7);
  const hp = a.hp;
  g.attack(g.run.player, a, D.moves[52]);
  assert.equal(a.hp, hp);
});
test("Folletto: Magibrillio è superefficace contro Drago; Acciaio contro Folletto", () => {
  const g = make();
  const fairy = g.makeMon(36, 20),
    dragon = g.makeMon(149, 20),
    steel = g.makeMon(304, 20);
  Object.assign(fairy, { uid: 1000000, active: true, x: 5, y: 5 });
  Object.assign(dragon, { uid: 5, x: 6, y: 5 });
  Object.assign(steel, { uid: 6, x: 6, y: 6 });
  g.run.companions = [fairy];
  const cfg = (a, b, id) => ({
    move: { id, pp: 10 },
    attacker: g.configMon(a),
    defender: g.configMon(b),
    dungeon: { weather: "clear" },
    misc: { version: "NA" },
    rngState: 123456789,
  });
  assert.equal(g.damageResult(cfg(fairy, dragon, "Swift")).matchup, 3);
  assert.equal(g.damageResult(cfg(steel, fairy, "Metal Claw")).matchup, 3);
  const state = g.combat.snapshot();
  g.bestMove(fairy, dragon);
  assert.deepEqual(g.combat.snapshot(), state);
});
test("Ritirare un alleato costa un turno, lascia lo starter e consente schierare meno di tre", () => {
  const g = make(),
    a = recruit(g, 7);
  g.run.enemies = [];
  const turn = g.run.turn;
  assert.equal(g.withdraw(0), false);
  assert.ok(g.withdraw(a.uid));
  assert.equal(g.run.turn, turn + 1);
  assert.equal(g.active().length, 1);
  g.validateRun(g.run);
});
test("Corridoio: lo starter può passare attraverso un alleato scambiando posizione", () => {
  const g = make(),
    a = recruit(g, 7);
  g.run.enemies = [];
  const r = g.run;
  r.map = Array.from({ length: r.h }, () => Array(r.w).fill(1));
  for (let x = 2; x < 8; x++) r.map[5][x] = 0;
  Object.assign(r.player, { x: 3, y: 5 });
  Object.assign(a, { x: 4, y: 5 });
  const step = g.pathStep(r.player, { x: 7, y: 5 });
  assert.deepEqual(step, { x: 4, y: 5 });
  const turn = r.turn;
  g.move(1, 0);
  assert.equal(r.player.x, 4);
  assert.equal(a.x, 3);
  assert.equal(r.turn, turn + 1);
});
test("Cambio: gli alleati non attaccano, il nemico risponde e gli ordini sono cancellati", () => {
  const g = make();
  recruit(g, 7);
  recruit(g, 25);
  recruit(g, 41);
  arena(g);
  let allyActions = 0,
    enemyTurns = 0;
  g.perform = () => allyActions++;
  g.enemiesTurn = () => enemyTurns++;
  for (const m of g.active()) g.plan(m.uid, { type: "wait" });
  const bench = g.run.companions.find((m) => !m.active);
  g.substitute(g.active()[1].uid, bench.uid);
  assert.equal(allyActions, 0);
  assert.equal(enemyTurns, 1);
  assert.deepEqual(g.run.tactics.orders, {});
});
