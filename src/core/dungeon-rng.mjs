/**
 * Port of pret/pmd-sky src/dg_random.c at
 * e3f02199ebe9e263ee67b07f36b3f240f83ef5d9, EoS NA reference.
 * This is the DUNGEON RNG, never the roguelite map generator's RNG.
 * CalcStatusDuration and engine call order are NOT implemented here.
 */
const MULTIPLIER = 0x5d588b65;
const SECONDARY_INCREMENT = 0x00269ec3;
function uint32(value) {
  if (!Number.isInteger(value) || value < 0 || value > 0xffffffff) throw new TypeError("u32 non valido.");
  return value;
}
function int32(value) {
  if (!Number.isInteger(value) || value < -0x80000000 || value > 0x7fffffff) throw new TypeError("s32 non valido.");
  return value;
}

export class DungeonRng {
  constructor(seed) {
    this.useSecondary = false;
    this.sequence = 0;
    this.preseed = 0;
    this.primary = 0;
    this.secondaryIndex = 0;
    this.secondary = new Array(5).fill(0);
    this.init(seed);
  }

  init(seed) {
    uint32(seed);
    this.primary = (seed | 1) >>> 0;
    this.sequence = 0;
    this.secondary.fill(seed);
    // InitDungeonRng does not change mode, index or preseed.
  }

  rand16() {
    if (this.useSecondary) {
      if (!Number.isInteger(this.secondaryIndex) || this.secondaryIndex < 0 || this.secondaryIndex >= 5) {
        throw new RangeError("Indice RNG secondario non valido.");
      }
      const result = (Math.imul(this.secondary[this.secondaryIndex], MULTIPLIER) + SECONDARY_INCREMENT) >>> 0;
      this.secondary[this.secondaryIndex] = result;
      return result & 0xffff;
    }
    this.sequence = (this.sequence + 1) >>> 0;
    this.primary = (Math.imul(this.primary, MULTIPLIER) + 1) >>> 0;
    return this.primary >>> 16;
  }

  int(end) {
    int32(end);
    return (Math.imul(this.rand16(), end) >> 16) & 0xffff;
  }

  range(from, to) {
    int32(from); int32(to);
    if (from === to) return from;
    const low = Math.min(from, to);
    const span = (Math.max(from, to) - low) | 0;
    return (low + ((Math.imul(this.rand16(), span) >> 16) & 0xffff)) | 0;
  }

  outcome(percentChance) {
    int32(percentChance);
    return ((this.rand16() * 100) >> 16) < percentChance;
  }

  snapshot() {
    return {
      useSecondary: this.useSecondary, sequence: this.sequence, preseed: this.preseed,
      primary: this.primary, secondaryIndex: this.secondaryIndex, secondary: [...this.secondary],
    };
  }

  static restore(state) {
    if (!state || typeof state.useSecondary !== "boolean" || !Array.isArray(state.secondary) ||
        state.secondary.length !== 5 || !Number.isInteger(state.secondaryIndex) ||
        state.secondaryIndex < 0 || state.secondaryIndex >= 5) throw new TypeError("Stato RNG non valido.");
    const rng = new DungeonRng(0);
    rng.useSecondary = state.useSecondary;
    rng.sequence = uint32(state.sequence);
    rng.preseed = uint32(state.preseed);
    rng.primary = uint32(state.primary);
    rng.secondaryIndex = state.secondaryIndex;
    rng.secondary = state.secondary.map(uint32);
    return rng;
  }
}
