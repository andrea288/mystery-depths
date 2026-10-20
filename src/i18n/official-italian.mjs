/**
 * No fallback to English and no machine-translated Pokémon terminology.
 * Caller loads bundled JSON locally; nothing is fetched from an external API.
 * Returned strings may contain original game formatting tags: render as text
 * or through a dedicated, audited tag renderer, never with innerHTML.
 */
export function createItalianLexicon(eosData, starterData) {
  if (eosData.locale !== "it-IT" || eosData.textVersion !== "EoS_EU" ||
      eosData.rulesVersion !== "EoS_NA" || starterData.locale !== "it-IT") {
    throw new TypeError("Dati di localizzazione incompatibili.");
  }
  const starters = new Map(starterData.starters.map(s => [s.dex, s.name]));
  return Object.freeze({
    term(category, index) {
      const entries = eosData.categories[category]?.entries;
      if (!entries || !Number.isInteger(index) || index < 0 || index >= entries.length) {
        throw new RangeError("Denominazione italiana ufficiale non disponibile.");
      }
      const value = entries[index];
      if (typeof value !== "string" || !value || value.includes("$$$")) {
        throw new RangeError("Voce riservata o non disponibile.");
      }
      return value;
    },
    starter(dex) {
      if (!starters.has(dex)) throw new RangeError("Starter non disponibile.");
      return starters.get(dex);
    },
  });
}
