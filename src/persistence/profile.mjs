/**
 * Permanent progression only. Run resources never belong in this format.
 * The caller MUST supply a species->Set(moveId) catalog from verified data.
 */
export const PROFILE_KEY = "mystery-depths:profile:v1";
export const PROFILE_VERSION = 1;
const MAX_BYTES = 1024 * 1024;
const object = value => value !== null && typeof value === "object" && !Array.isArray(value);
const exactKeys = (value, allowed) => Object.keys(value).every(key => allowed.includes(key));

export function emptyProfile() {
  return {version: PROFILE_VERSION, species: {}};
}

export function validateProfile(input, catalog) {
  if (!(catalog instanceof Map) || catalog.size === 0) throw new TypeError("Catalogo mosse richiesto.");
  if (!object(input) || !exactKeys(input, ["version", "species"]) ||
      input.version !== PROFILE_VERSION || !object(input.species)) {
    throw new TypeError("Formato o versione del salvataggio non supportati.");
  }
  const profile = emptyProfile();
  for (const [speciesId, entry] of Object.entries(input.species)) {
    if (!catalog.has(speciesId) || !(catalog.get(speciesId) instanceof Set)) {
      throw new TypeError("Specie sconosciuta nel salvataggio.");
    }
    if (!object(entry) || !exactKeys(entry, ["learned", "equipped"]) ||
        !Array.isArray(entry.learned) || !Array.isArray(entry.equipped) ||
        entry.equipped.length > 4 || new Set(entry.learned).size !== entry.learned.length ||
        new Set(entry.equipped).size !== entry.equipped.length) {
      throw new TypeError("Elenco mosse non valido.");
    }
    const allowed = catalog.get(speciesId);
    if (entry.learned.some(move => typeof move !== "string" || !allowed.has(move)) ||
        entry.equipped.some(move => !entry.learned.includes(move))) {
      throw new TypeError("Mossa sconosciuta o non appresa.");
    }
    // Species identifiers supplied by the catalog are still constrained.
    if (!/^[1-9][0-9]{0,3}$/.test(speciesId)) throw new TypeError("Identificatore specie non valido.");
    profile.species[speciesId] = {learned: [...entry.learned], equipped: [...entry.equipped]};
  }
  return profile;
}

export function importProfile(text, catalog) {
  if (typeof text !== "string" || new TextEncoder().encode(text).length > MAX_BYTES) {
    throw new TypeError("Salvataggio troppo grande.");
  }
  return validateProfile(JSON.parse(text), catalog);
}

export function exportProfile(profile, catalog) {
  return JSON.stringify(validateProfile(profile, catalog), null, 2);
}

export function learnMove(profile, speciesId, moveId, catalog) {
  const next = validateProfile(profile, catalog);
  if (!catalog.get(speciesId)?.has(moveId)) throw new TypeError("Mossa non ammessa per la specie.");
  const entry = next.species[speciesId] ??= {learned: [], equipped: []};
  if (!entry.learned.includes(moveId)) entry.learned.push(moveId);
  return validateProfile(next, catalog);
}

export function equipMoves(profile, speciesId, moves, catalog) {
  const next = validateProfile(profile, catalog);
  if (!next.species[speciesId]) throw new TypeError("Nessuna mossa appresa.");
  next.species[speciesId].equipped = [...moves];
  return validateProfile(next, catalog);
}

export function saveProfile(storage, profile, catalog) {
  // Validate before the single atomic Web Storage write.
  storage.setItem(PROFILE_KEY, exportProfile(profile, catalog));
}

export function loadProfile(storage, catalog) {
  const text = storage.getItem(PROFILE_KEY);
  return text === null ? emptyProfile() : importProfile(text, catalog);
}

export function importIntoStorage(storage, text, catalog) {
  const profile = importProfile(text, catalog);
  saveProfile(storage, profile, catalog);
  return profile;
}
