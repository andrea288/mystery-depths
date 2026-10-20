import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync, existsSync} from "node:fs";
import {DungeonRng} from "../src/core/dungeon-rng.mjs";

test("36000 risultati e transizioni confrontati con il sorgente C indipendente fissato", () => {
  const file = new URL("../build/rng-reference/vectors.txt", import.meta.url);
  assert.ok(existsSync(file), "Esegui prima: python3 scripts/rng_reference.py");
  const lines = readFileSync(file, "utf8").trim().split("\n");
  assert.equal(lines.length, 36000);
  let rng;
  for (const line of lines) {
    const [seed, mode, index, expected, sequence, primary, secondary] = line.split(" ").map(Number);
    if (index === 0) {
      rng = new DungeonRng(seed);
      rng.useSecondary = mode >= 0;
      rng.secondaryIndex = Math.max(0, mode);
    }
    let result;
    switch (index % 6) {
      case 0: result = rng.rand16(); break;
      case 1: result = rng.int(100); break;
      case 2: result = rng.range(-5, 128); break;
      case 3: result = rng.range(42, 42); break;
      case 4: result = rng.range(100, -10); break;
      default: result = Number(rng.outcome(37));
    }
    assert.equal(result, expected, line);
    assert.equal(rng.sequence, sequence);
    assert.equal(rng.primary, primary);
    assert.equal(rng.secondary[Math.max(0, mode)], secondary);
  }
});

test("snapshot RNG mantiene la sequenza; init conserva modalità e indice", () => {
  const rng = new DungeonRng(99);
  rng.useSecondary = true;
  rng.secondaryIndex = 3;
  rng.rand16();
  const restored = DungeonRng.restore(rng.snapshot());
  assert.deepEqual(Array.from({length: 100}, () => rng.rand16()),
                   Array.from({length: 100}, () => restored.rand16()));
  rng.init(0);
  assert.equal(rng.useSecondary, true);
  assert.equal(rng.secondaryIndex, 3);
  assert.equal(rng.primary, 1);
});

test("range uguale non consuma RNG; probabilità 0 e 100 consumano ciascuna un'estrazione", () => {
  const rng = new DungeonRng(0);
  const before = rng.snapshot();
  assert.equal(rng.range(7, 7), 7);
  assert.deepEqual(rng.snapshot(), before);
  assert.equal(rng.outcome(0), false);
  assert.equal(rng.outcome(100), true);
  assert.equal(rng.sequence, 2);
});
