import test from "node:test";
import assert from "node:assert/strict";
import {generateDungeon, reachableCells, nextFloor} from "../src/roguelite/dungeon.mjs";

test("2000 seed/piano: ogni cella, scala e spawn è raggiungibile, bordo chiuso, spawn unici", () => {
  for (let i = 0; i < 2000; i++) {
    const map = generateDungeon(`seed-${i}`, String(1 + i * 17));
    const reachable = reachableCells(map);
    assert.equal(reachable.size, map.tiles.reduce((sum, value) => sum + value, 0));
    assert.ok(reachable.has(map.stairs.y * map.width + map.stairs.x));
    for (let x = 0; x < map.width; x++) {
      assert.equal(map.tiles[x], 0);
      assert.equal(map.tiles[(map.height - 1) * map.width + x], 0);
    }
    for (let y = 0; y < map.height; y++) {
      assert.equal(map.tiles[y * map.width], 0);
      assert.equal(map.tiles[y * map.width + map.width - 1], 0);
    }
    const seen = new Set([JSON.stringify(map.start), JSON.stringify(map.stairs)]);
    for (const cell of Object.values(map.spawns).flat()) {
      assert.ok(reachable.has(cell.y * map.width + cell.x));
      assert.ok(!seen.has(JSON.stringify(cell)));
      seen.add(JSON.stringify(cell));
    }
  }
});

test("stesso seed e piano riproducono esattamente la mappa; il piano cambia la mappa", () => {
  assert.deepEqual(generateDungeon("prova", "8"), generateDungeon("prova", "8"));
  assert.notDeepEqual(generateDungeon("prova", "8").tiles, generateDungeon("prova", "9").tiles);
});

test("piani oltre MAX_SAFE_INTEGER non traboccano; boss ogni quinto piano", () => {
  const floor = "9007199254740995";
  const map = generateDungeon("alto", floor);
  assert.equal(map.floor, floor);
  assert.equal(map.bossFloor, true);
  assert.equal(nextFloor(floor), "9007199254740996");
  assert.equal(map.spawns.enemies.length, 14);
});

test("input invalidi e limiti espliciti vengono rifiutati", () => {
  for (const floor of ["0", "-1", "01", "1.5", 1, "1".repeat(129)]) {
    assert.throws(() => generateDungeon("ok", floor));
  }
  assert.throws(() => generateDungeon(""));
  assert.throws(() => nextFloor("9".repeat(128)));
});
