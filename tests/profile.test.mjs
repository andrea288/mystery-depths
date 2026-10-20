import test from "node:test";
import assert from "node:assert/strict";
import {
  emptyProfile, learnMove, equipMoves, validateProfile, exportProfile,
  importProfile, saveProfile, loadProfile, importIntoStorage, PROFILE_KEY,
} from "../src/persistence/profile.mjs";

// A restricted test catalog; this is NOT a claim about complete EoS learnsets.
const catalog = new Map([
  ["1", new Set(["tackle", "growl", "vine whip", "razor leaf", "sleep powder"])],
  ["4", new Set(["scratch", "ember"])],
]);
function memoryStorage() {
  const entries = new Map();
  return {getItem: key => entries.get(key) ?? null, setItem: (key, value) => entries.set(key, value)};
}

test("apprendimento permanente per specie, idempotente, senza mutare lo stato precedente", () => {
  const before = emptyProfile();
  const once = learnMove(before, "1", "tackle", catalog);
  const twice = learnMove(once, "1", "tackle", catalog);
  assert.deepEqual(before, emptyProfile());
  assert.deepEqual(once, twice);
  assert.deepEqual(twice.species["1"].learned, ["tackle"]);
  assert.equal(twice.species["4"], undefined);
  assert.throws(() => learnMove(twice, "4", "tackle", catalog));
});

test("massimo quattro mosse equipaggiate, tutte apprese, nessun duplicato", () => {
  let profile = emptyProfile();
  for (const move of catalog.get("1")) profile = learnMove(profile, "1", move, catalog);
  const moves = [...catalog.get("1")];
  assert.equal(equipMoves(profile, "1", moves.slice(0, 4), catalog).species["1"].equipped.length, 4);
  assert.throws(() => equipMoves(profile, "1", moves, catalog));
  assert.throws(() => equipMoves(profile, "1", ["tackle", "tackle"], catalog));
  assert.throws(() => equipMoves(profile, "1", ["ember"], catalog));
});

test("salvataggio e ripresa del profilo, export/import senza perdita", () => {
  const storage = memoryStorage();
  const profile = equipMoves(learnMove(emptyProfile(), "4", "ember", catalog), "4", ["ember"], catalog);
  saveProfile(storage, profile, catalog);
  assert.deepEqual(loadProfile(storage, catalog), profile);
  assert.deepEqual(importProfile(exportProfile(profile, catalog), catalog), profile);
  const other = memoryStorage();
  importIntoStorage(other, exportProfile(profile, catalog), catalog);
  assert.deepEqual(loadProfile(other, catalog), profile);
});

test("run e bonus temporanei non possono essere serializzati come progressione permanente", () => {
  assert.throws(() => validateProfile({...emptyProfile(), temporaryBonuses: ["attack"]}, catalog));
  assert.throws(() => validateProfile({...emptyProfile(), run: {floor: "12"}}, catalog));
});

test("import corrotto, versione futura, proprietà ostili, specie e mosse ignote non cancellano i dati", () => {
  const storage = memoryStorage();
  saveProfile(storage, learnMove(emptyProfile(), "1", "tackle", catalog), catalog);
  const before = storage.getItem(PROFILE_KEY);
  const invalid = [
    "{", "null", '{"version":2,"species":{}}',
    '{"version":1,"species":{"__proto__":{"learned":[],"equipped":[]}}}',
    '{"version":1,"species":{"9999":{"learned":[],"equipped":[]}}}',
    '{"version":1,"species":{"1":{"learned":["invented"],"equipped":[]}}}',
    " ".repeat(1024 * 1024 + 1),
  ];
  for (const text of invalid) {
    assert.throws(() => importIntoStorage(storage, text, catalog));
    assert.equal(storage.getItem(PROFILE_KEY), before);
  }
});

test("errore quota storage propagato, senza fingere un salvataggio riuscito", () => {
  assert.throws(() => saveProfile({setItem() {throw new Error("QuotaExceededError");}}, emptyProfile(), catalog),
    /QuotaExceededError/);
});
