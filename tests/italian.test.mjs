import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {createHash} from "node:crypto";
import {createItalianLexicon} from "../src/i18n/official-italian.mjs";
const readJson = file => JSON.parse(readFileSync(new URL(file, import.meta.url), "utf8"));
const eos = readJson("../data/i18n/it-eos.json");
const starters = readJson("../data/i18n/it-starters.json");
const lexicon = createItalianLexicon(eos, starters);

test("fonte italiana originale fissata e hash del binario conservato", () => {
  const source = readFileSync(new URL("../data/source/text_i.str", import.meta.url));
  assert.equal(createHash("sha256").update(source).digest("hex"), eos.sourceSha256);
  assert.equal(eos.textVersion, "EoS_EU");
  assert.equal(eos.rulesVersion, "EoS_NA");
  assert.equal(Object.values(eos.categories).reduce((n, category) => n + category.entries.length, 0), 5042);
});

test("nomi originali e grafia dell'epoca sono preservati", () => {
  assert.equal(lexicon.term("Move Names", 1), "Codacciaio");
  assert.equal(lexicon.term("Move Names", 2), "Palla Gelo");
  assert.equal(lexicon.term("Item Names", 7), "Gravelroccia");
  assert.equal(lexicon.term("Ability Names", 2), "Grassospesso");
  assert.equal(lexicon.term("Type Names", 5), "Elettro");
  assert.equal(starters.starters.length, 29);
  assert.equal(lexicon.starter(906), "Sprigatito");
});

test("nessun fallback inglese o traduzione inventata per voci assenti", () => {
  assert.throws(() => lexicon.term("Move Names", 99999));
  assert.throws(() => lexicon.term("Invented", 0));
  assert.throws(() => lexicon.term("Move Names", "1"));
  assert.throws(() => lexicon.starter(99999));
});
