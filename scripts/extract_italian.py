"""Extract official EoS Italian strings with the upstream SkyTemple codec.

No generated translations. Rule reference remains NA; string offsets are EU.
"""
import hashlib
import importlib.util
import json
import csv
from pathlib import Path
import struct
import xml.etree.ElementTree as ET

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "data/source/text_i.str"
CONFIG = ROOT / "data/source/pmd2data.xml"
spec = importlib.util.spec_from_file_location("pmd_codec", ROOT / "third_party/skytemple-codec/string_codec.py")
codec = importlib.util.module_from_spec(spec)
spec.loader.exec_module(codec)
codec.init()
data = SOURCE.read_bytes()
first, = struct.unpack_from("<I", data)
if first % 4 or first > len(data) or first < 8:
    raise ValueError("Invalid string table header")
count = first // 4 - 1
pointers = struct.unpack_from(f"<{count + 1}I", data)
if pointers[-1] != len(data) or any(p < first or p > len(data) for p in pointers):
    raise ValueError("Invalid string table pointers")
strings = []
for pointer in pointers[:-1]:
    end = data.index(0, pointer)
    value = data[pointer:end].decode(codec.PMD2_STR_ENCODER)
    # Preserve all control tags and accents; roundtrip the original bytes.
    if value.encode(codec.PMD2_STR_ENCODER) != data[pointer:end]:
        raise ValueError(f"Lossy text decoding at {pointer}")
    strings.append(value)

config = ET.parse(CONFIG)
game = config.find(".//StringIndexData/Game[@id='EoS_EU']")
categories = {}
selected = {
    "Item Names", "Move Names", "Pokemon Names", "Ability Names", "Type Names",
    "IQ Skills Names", "IQ Skills Descriptions", "Move Descriptions",
    "Item Long Descriptions", "Ability Descriptions", "Default Menu Strings 1",
    "Default Menu Strings 2", "Dungeon Item Action Menu Strings",
}
for block in game.findall("StringBlocks/StringBlock"):
    name = block.attrib["name"]
    if name not in selected:
        continue
    start, stop = int(block.attrib["beg"]), int(block.attrib["end"])
    if not 0 <= start < stop <= len(strings):
        raise ValueError(f"Invalid block: {name}")
    categories[name] = {"startStringIndex": start, "entries": strings[start:stop]}
if selected - categories.keys():
    raise ValueError(f"Missing categories: {selected - categories.keys()}")
result = {
    "locale": "it-IT", "textVersion": "EoS_EU", "rulesVersion": "EoS_NA",
    "sourceCommit": "e3f02199ebe9e263ee67b07f36b3f240f83ef5d9",
    "codecCommit": "5ed359a2560a1f04666b9ea02b71649b89cb16d7",
    "sourceSha256": hashlib.sha256(data).hexdigest(),
    "indexConfigSha256": hashlib.sha256(CONFIG.read_bytes()).hexdigest(),
    "categories": categories,
}
output = ROOT / "data/i18n/it-eos.json"
output.parent.mkdir(exist_ok=True)
output.write_text(json.dumps(result, ensure_ascii=False, indent=2) + "\n")
with (ROOT / "data/source/languages.csv").open() as handle:
    italian_id = next(row["id"] for row in csv.DictReader(handle) if row["identifier"] == "it")
with (ROOT / "data/source/pokemon_species_names.csv").open() as handle:
    names = {int(row["pokemon_species_id"]): row["name"] for row in csv.DictReader(handle)
             if row["local_language_id"] == italian_id}
assets = json.loads((ROOT / "data/assets.json").read_text())
starters = [{"dex": s["dex"], "name": names[s["dex"]], "region": s["region"],
             "rulesModule": s["rulesModule"]} for s in assets["species"]]
modern_commit = "2bf639e5572812a67d2b94903fdcb9d095f5aeb2"
starter_data = {
    "locale": "it-IT",
    "source": f"https://raw.githubusercontent.com/PokeAPI/pokeapi/{modern_commit}/data/v2/csv/pokemon_species_names.csv",
    "commit": modern_commit,
    "usage": "Solo denominazioni, mai regole o statistiche Mystery Dungeon",
    "sha256": hashlib.sha256((ROOT / "data/source/pokemon_species_names.csv").read_bytes()).hexdigest(),
    "starters": starters,
}
(ROOT / "data/i18n/it-starters.json").write_text(json.dumps(starter_data, ensure_ascii=False, indent=2) + "\n")
report = {
    "decodedStrings": len(strings), "roundtrippedStrings": len(strings),
    "exportedStrings": sum(len(c["entries"]) for c in categories.values()),
    "categories": len(categories), "sourceSha256": result["sourceSha256"],
    "manualTranslations": 0,
}
(ROOT / "test-results/italian-extraction.json").write_text(json.dumps(report, indent=2) + "\n")
print(json.dumps(report, indent=2))
