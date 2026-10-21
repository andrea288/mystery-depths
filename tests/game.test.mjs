import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { spawnSync } from "node:child_process";
import { Game } from "../src/game.mjs";
globalThis.require = createRequire(import.meta.url);
globalThis.__dirname = process.cwd() + "/assets/wasm";
const { default: create } = await import("../assets/wasm/eos-core.mjs");
const core = await create({
  wasmBinary: readFileSync("assets/wasm/eos-core.wasm"),
});
const D = JSON.parse(readFileSync("assets/game/data.json"));
const make = () => new Game(D, core);
test("29 starter: avvio, quattro mosse al massimo, esportazione e ripresa", () => {
  for (const id of D.starterIds) {
    const g = make();
    g.start(id, 12345);
    g.validateRun(g.run);
    assert.ok(g.run.player.moves.length > 0);
    const save = g.export(),
      copy = make();
    copy.restore(save);
    assert.deepEqual(copy.export(), save);
    g.wait();
    copy.wait();
    assert.deepEqual(copy.export(), g.export());
  }
});
test("Mappe runtime: 2000 seed/piani, scale raggiungibili e salvataggi validi", () => {
  const g = make();
  for (let i = 0; i < 2000; i++) {
    g.start(1, i);
    g.run.floor = 1 + (i % 100);
    g.buildFloor();
    g.validateRun(g.run);
    const r = g.run,
      q = [r.player],
      seen = new Set([r.player.x + "," + r.player.y]);
    for (let j = 0; j < q.length; j++)
      for (const [dx, dy] of [
        [0, 1],
        [0, -1],
        [1, 0],
        [-1, 0],
      ]) {
        const p = { x: q[j].x + dx, y: q[j].y + dy },
          k = p.x + "," + p.y;
        if (!seen.has(k) && g.floorTile(p.x, p.y)) {
          seen.add(k);
          q.push(p);
        }
      }
    assert.ok(seen.has(r.exit.x + "," + r.exit.y));
  }
});
test("Ricompensa permanente, consumo, morte e reset provviste", () => {
  const g = make();
  g.start(1, 42);
  g.run.enemies = [];
  Object.assign(g.run.player, g.run.exit);
  assert.equal(g.stairs(), true);
  const reward = g.run.reward.findIndex((r) => r.kind === "move"),
    id = g.run.reward[reward].id;
  g.chooseReward(reward);
  assert.equal(g.run.floor, 2);
  assert.ok(g.known(1).includes(id));
  g.run.bag.berry = 0;
  g.run.player.hp = 0;
  g.end();
  g.start(1, 99);
  assert.ok(g.known(1).includes(id));
  assert.equal(g.run.bag.berry, 3);
  assert.equal(g.run.floor, 1);
  g.validateRun(g.run);
});
test("Turni: orientamento e passi bloccati gratuiti, mossa a vuoto consuma PP", () => {
  const g = make();
  g.start(1, 12);
  g.run.enemies = [];
  g.face(g.run.player, 1, 0);
  assert.equal(g.run.turn, 0);
  g.move(0, 0);
  assert.equal(g.run.turn, 0);
  const pp = g.run.player.moves[0].pp;
  g.useMove(0);
  assert.equal(g.run.turn, 1);
  assert.equal(g.run.player.moves[0].pp, pp - 1);
});
test("Importazione rifiutata senza modificare lo stato", () => {
  const g = make();
  g.start(1, 7);
  const before = g.export();
  for (const mutate of [
    (r) => (r.player.moves[0].pp = -1),
    (r) => (r.player.hp = 1e9),
    (r) => (r.bag.apple = -1),
    (r) => (r.combatRng.primary = -1),
    (r) => (r.player.x = -1),
  ]) {
    const bad = structuredClone(before);
    mutate(bad.run);
    assert.throws(() => g.restore(bad));
    assert.deepEqual(g.export(), before);
  }
});
test("Combattimento reale WASM riproducibile con salvataggio a metà", () => {
  const a = make();
  a.start(1, 123);
  a.run.enemies = [];
  const p = a.run.player,
    e = a.makeMon(19, 5);
  e.x = p.x + 1;
  e.y = p.y;
  e.uid = 1;
  e.awake = true;
  a.run.map[e.y][e.x] = 0;
  a.run.enemies = [e];
  const b = make();
  b.restore(a.export());
  for (let n = 0; n < 8 && a.run.state === "playing"; n++) {
    a.useMove(0, a.run.enemies[0]);
    b.useMove(0, b.run.enemies[0]);
    assert.deepEqual(a.export().run, b.export().run);
  }
  assert.ok(a.run.log.some((l) => l.text.includes("PS")));
});
test("Parità WASM/native: 256 semi, statistiche e mosse originali", () => {
  const configs = [];
  const g = make();
  g.start(1, 1);
  for (let n = 0; n < 256; n++) {
    const a = g.makeMon(D.starterIds[n % 29], 1 + (n % 100)),
      b = g.makeMon(D.enemyIds[n % D.enemyIds.length], 1 + ((n * 7) % 100));
    const move = Object.values(D.moves)[n % Object.keys(D.moves).length];
    configs.push({
      move: { id: move.eosName, pp: move.pp },
      attacker: g.configMon(a),
      defender: g.configMon(b),
      dungeon: { weather: "clear" },
      misc: { version: "NA" },
      rngState: (n * 374761393) >>> 0,
    });
  }
  const native = spawnSync("build/live-eos/native-adapter", [], {
    input: configs.map(JSON.stringify).join("\n") + "\n",
    encoding: "utf8",
  });
  assert.equal(native.status, 0, native.stderr || native.error?.message);
  const results = native.stdout.trim().split("\n");
  for (let i = 0; i < configs.length; i++) {
    const wasm = JSON.parse(core.singleDamage(JSON.stringify(configs[i])));
    assert.ok(!wasm.error, wasm.error);
    assert.deepEqual(wasm, JSON.parse(results[i]));
  }
});
test("Discesa oltre 2^53: contatore, bioma e guardiano conservano precisione", () => {
  const g = make();
  g.start(1, 8);
  g.run.floor = "9007199254740995";
  g.buildFloor();
  assert.equal(g.run.enemies.length, 1);
  assert.equal(g.run.enemies[0].boss, true);
  g.run.enemies = [];
  Object.assign(g.run.player, g.run.exit);
  g.stairs();
  g.chooseReward(0);
  assert.equal(g.run.floor, "9007199254740996");
  g.validateRun(g.run);
  const copy = make();
  copy.restore(g.export());
  assert.deepEqual(copy.export(), g.export());
  assert.equal(g.meta.best, "9007199254740995");
});
test('Crescita e recupero: soglie EoS e accumulatore, nessuna cura gratuita sulle scale',()=>{const g=make();g.start(1,1);g.run.enemies=[];const p=g.run.player;p.hp=10;for(let i=0;i<7;i++)g.wait();assert.equal(p.hp,11);assert.equal(p.regenCounter,24);const belly=g.run.belly;g.buildFloor();assert.equal(g.run.belly,belly);assert.equal(p.hp,11);assert.equal(g.xpNeeded(),105);});
test('Multi-colpo EoS: estrazione uniforme da due a cinque colpi',()=>{const counts=new Set();for(let seed=1;seed<100;seed++){let calls=0;const fake={singleDamage:input=>{calls++;const c=JSON.parse(input);return JSON.stringify({damage:1,rngState:c.rngState,rngCalls:0});}};const g=new Game(D,fake);g.start(252,seed);const e=g.makeMon(19,100);e.hp=e.maxHp=999;e.x=g.run.player.x+1;e.y=g.run.player.y;g.attack(g.run.player,e,D.moves[154]);assert.ok(calls>=2&&calls<=5);counts.add(calls);}assert.deepEqual([...counts].sort(),[2,3,4,5]);});
