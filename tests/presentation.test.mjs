import test from "node:test";
import assert from "node:assert/strict";
import { Playback, EFFECTS } from "../src/presentation.mjs";
import { readFileSync } from "node:fs";
const before = {
  player: { uid: 0, name: "A", x: 1, y: 1, hp: 30, maxHp: 30 },
  enemies: [{ uid: 1, name: "B", x: 2, y: 1, hp: 20, maxHp: 20 }],
  log: [],
  turn: 0,
};
const game = {
  run: { ...structuredClone(before), turn: 1 },
  face(m, x, y) {
    m.facing = [x, y];
  },
};
const events = [
  {
    type: "attack",
    uid: 0,
    from: { x: 1, y: 1 },
    to: { x: 2, y: 1 },
    slug: "ember",
  },
  { type: "hit", uid: 1, from: { x: 1, y: 1 }, to: { x: 2, y: 1 }, amount: 7 },
  {
    type: "attack",
    uid: 1,
    from: { x: 2, y: 1 },
    to: { x: 1, y: 1 },
    slug: "tackle",
  },
  { type: "hit", uid: 0, from: { x: 2, y: 1 }, to: { x: 1, y: 1 }, amount: 4 },
];
test("Animazioni: PS al momento dell’impatto, risposta successiva e simulazione immutata", () => {
  const original = structuredClone(game.run);
  const p = new Playback(game, before, events);
  p.advance(699);
  assert.equal(p.game.run.enemies[0].hp, 20);
  p.advance(1);
  assert.equal(p.game.run.enemies[0].hp, 13);
  assert.equal(p.game.run.player.hp, 30);
  assert.ok(p.schedule[2].time > p.schedule[1].time);
  assert.deepEqual(game.run, original);
  p.advance(100000);
  assert.equal(p.game.run, game.run);
  assert.ok(p.done);
});
test("Pausa e velocità cambiano solo la presentazione", () => {
  const p = new Playback(game, before, events),
    fast = new Playback(game, before, events, 0.35);
  p.advance(300);
  p.advance(2000, true);
  assert.equal(p.elapsed, 300);
  assert.equal(fast.duration, p.duration * 0.35);
  assert.deepEqual(game.run.turn, 1);
});
test("37 mosse hanno effetti disponibili e fogli con frame validi", () => {
  const D = JSON.parse(readFileSync("assets/game/data.json"));
  const manifest = JSON.parse(readFileSync("assets/effects/manifest.json"));
  for (const m of Object.values(D.moves)) {
    assert.ok(EFFECTS[m.slug], m.slug);
    const a = manifest.sheets[EFFECTS[m.slug][0]];
    assert.ok(a && a.frames > 0 && a.size > 0);
    assert.ok(readFileSync("assets/effects/" + a.file).length > 0);
  }
});
test("Multi-colpo: impatti distinti e sequenza completa prima del nemico", () => {
  const p = new Playback(game, before, [
    events[0],
    events[1],
    events[1],
    events[1],
    events[2],
    events[3],
  ]);
  const hits = p.schedule.filter((e) => e.type === "hit" && e.uid === 1);
  assert.ok(hits[1].time > hits[0].time && hits[2].time > hits[1].time);
  assert.ok(
    p.schedule.find((e) => e.type === "attack" && e.uid === 1).time >
      hits[2].time,
  );
});
