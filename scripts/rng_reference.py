"""Compile the actual pinned C reference, rather than a second handwritten RNG."""
import hashlib
import json
from pathlib import Path
import re
import subprocess

ROOT = Path(__file__).resolve().parents[1]
source = ROOT / "research/pmd-sky/dg_random.c"
text = source.read_text()
# Unmodified function bodies. Only external headers and unrelated status routine
# are excluded; the latter needs the full entity/IQ/ability engine.
body = re.sub(r'^#include.*$', '', text.split("s32 CalcStatusDuration(")[0], flags=re.M)
preamble = r"""
#include <stdint.h>
#include <stdio.h>
typedef uint8_t bool8;
typedef uint16_t u16;
typedef uint32_t u32;
typedef int32_t s32;
typedef uint64_t u64;
#define TRUE 1
#define FALSE 0
typedef struct {
 bool8 use_secondary;
 u32 seq_num_primary;
 u32 preseed;
 u32 last_value_primary;
 s32 idx_secondary;
} prng_state;
prng_state DUNGEON_PRNG_STATE;
u32 DUNGEON_PRNG_STATE_SECONDARY_VALUES[5];
"""
harness = r"""
int main(void) {
 u32 seeds[] = {0,1,2,123456789,0x80000000,0xffffffff};
 for (int s=0;s<6;s++) {
  for (int mode=-1;mode<5;mode++) {
   DUNGEON_PRNG_STATE.use_secondary = mode >= 0;
   DUNGEON_PRNG_STATE.idx_secondary = mode < 0 ? 0 : mode;
   InitDungeonRng(seeds[s]);
   for (int i=0;i<1000;i++) {
    s32 value;
    switch(i%6) {
      case 0: value = DungeonRand16Bit(); break;
      case 1: value = DungeonRandInt(100); break;
      case 2: value = DungeonRandRange(-5,128); break;
      case 3: value = DungeonRandRange(42,42); break;
      case 4: value = DungeonRandRange(100,-10); break;
      default: value = DungeonRandOutcome__022EAB20(37);
    }
    printf("%u %d %d %d %u %u %u\n",seeds[s],mode,i,value,
      DUNGEON_PRNG_STATE.seq_num_primary,
      DUNGEON_PRNG_STATE.last_value_primary,
      DUNGEON_PRNG_STATE_SECONDARY_VALUES[mode < 0 ? 0 : mode]);
   }
  }
 }
 return 0;
}
"""
build = ROOT / "build/rng-reference"
build.mkdir(parents=True, exist_ok=True)
(build / "reference.c").write_text(preamble + body + harness)
subprocess.run(["cc", "-std=c11", "-O2", "-fwrapv", str(build / "reference.c"),
                "-o", str(build / "reference")], check=True)
with (build / "vectors.txt").open("w") as output:
    subprocess.run([str(build / "reference")], check=True, stdout=output)
report = {
    "source": "https://github.com/pret/pmd-sky/blob/e3f02199ebe9e263ee67b07f36b3f240f83ef5d9/src/dg_random.c",
    "sourceSha256": hashlib.sha256(source.read_bytes()).hexdigest(),
    "vectorRows": 36000,
    "scope": "RNG functions only; no ROM comparison, turn order or CalcStatusDuration",
}
(ROOT / "test-results/rng-reference.json").write_text(json.dumps(report, indent=2) + "\n")
print("36000 vectors generated from pinned C function bodies.")
