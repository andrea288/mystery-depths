"""Fetch pinned SpriteCollab assets; never substitute a missing animation."""
import concurrent.futures
import hashlib
import json
from pathlib import Path
import struct
import urllib.request
import xml.etree.ElementTree as ET

ROOT = Path(__file__).resolve().parents[1]
COMMIT = "9d905ec258c39b1846d33629e5ba47cb8e49dfa8"
BASE = f"https://raw.githubusercontent.com/PMDCollab/SpriteCollab/{COMMIT}/"
GROUPS = [
    ("Kanto", [(1, "Bulbasaur"), (4, "Charmander"), (7, "Squirtle")]),
    ("Johto", [(152, "Chikorita"), (155, "Cyndaquil"), (158, "Totodile")]),
    ("Hoenn", [(252, "Treecko"), (255, "Torchic"), (258, "Mudkip")]),
    ("Sinnoh", [(387, "Turtwig"), (390, "Chimchar"), (393, "Piplup")]),
    ("Unima", [(495, "Snivy"), (498, "Tepig"), (501, "Oshawott")]),
    ("Kalos", [(650, "Chespin"), (653, "Fennekin"), (656, "Froakie")]),
    ("Alola", [(722, "Rowlet"), (725, "Litten"), (728, "Popplio")]),
    ("Galar", [(810, "Grookey"), (813, "Scorbunny"), (816, "Sobble")]),
    ("Paldea", [(906, "Sprigatito"), (909, "Fuecoco"), (912, "Quaxly")]),
    ("Speciali", [(25, "Pikachu"), (133, "Eevee")]),
]
WANTED = ("Idle", "Walk", "Attack", "Hurt", "Faint")


def download(remote, local):
    """TLS is verified by urllib; temporary files never masquerade as assets."""
    with urllib.request.urlopen(BASE + remote, timeout=40) as response:
        data = response.read()
    if remote.endswith(".png"):
        if data[:8] != b"\x89PNG\r\n\x1a\n":
            raise ValueError(f"Invalid PNG: {remote}")
    local.parent.mkdir(parents=True, exist_ok=True)
    temp = local.with_suffix(local.suffix + ".tmp")
    temp.write_bytes(data)
    temp.replace(local)
    return {"path": str(local.relative_to(ROOT)), "sha256": hashlib.sha256(data).hexdigest(),
            "source": BASE + remote, "bytes": len(data)}


def fetch_species(entry):
    region, dex, name = entry
    prefix = f"{dex:04}"
    folder = ROOT / "assets" / "pokemon" / prefix
    files = []
    for remote, local in [
        (f"sprite/{prefix}/AnimData.xml", folder / "AnimData.xml"),
        (f"sprite/{prefix}/credits.txt", folder / "sprite-credits.txt"),
        (f"portrait/{prefix}/credits.txt", folder / "portrait-credits.txt"),
        (f"portrait/{prefix}/Normal.png", folder / "portrait.png"),
    ]:
        files.append(download(remote, local))
    tree = ET.parse(folder / "AnimData.xml")
    animations = {a.findtext("Name"): a for a in tree.findall(".//Anim")}
    resolved = {}
    sheets = set()
    for name_key in WANTED:
        target = name_key
        seen = set()
        while True:
            if target in seen or target not in animations:
                raise ValueError(f"{name}: missing/circular animation {target}")
            seen.add(target)
            anim = animations[target]
            copy = anim.findtext("CopyOf")
            if not copy:
                break
            target = copy
        durations = [int(d.text) for d in anim.findall("Durations/Duration")]
        width, height = int(anim.findtext("FrameWidth")), int(anim.findtext("FrameHeight"))
        if not durations or min(durations) <= 0 or min(width, height) <= 0:
            raise ValueError(f"{name}: invalid animation metadata {target}")
        resolved[name_key] = {
            "sheet": target, "frameWidth": width, "frameHeight": height,
            "durations": durations,
            "rushFrame": anim.findtext("RushFrame"), "hitFrame": anim.findtext("HitFrame"),
            "returnFrame": anim.findtext("ReturnFrame"),
        }
        if target not in sheets:
            for kind in ("Anim", "Offsets", "Shadow"):
                filename = f"{target}-{kind}.png"
                files.append(download(f"sprite/{prefix}/{filename}", folder / filename))
                png = (folder / filename).read_bytes()
                w, h = struct.unpack(">II", png[16:24])
                if w % width or h % height:
                    raise ValueError(f"{name}: sheet not aligned to metadata: {filename}")
                if w // width < len(durations):
                    raise ValueError(f"{name}: missing animation frames: {filename}")
            sheets.add(target)
    return {
        "dex": dex, "name": name, "region": region,
        "rulesModule": "eos-na" if dex <= 493 else "post-eos",
        "rulesVerified": False,
        "animations": resolved, "files": files,
    }


def main():
    common = ROOT / "assets" / "credits"
    common_files = [
        download("credit_names.txt", common / "SpriteCollab-authors.tsv"),
        download("README.md", common / "SpriteCollab-policy.md"),
    ]
    entries = [(r, dex, n) for r, group in GROUPS for dex, n in group]
    completed, failures = [], []
    with concurrent.futures.ThreadPoolExecutor(max_workers=6) as pool:
        futures = {pool.submit(fetch_species, e): e for e in entries}
        for future in concurrent.futures.as_completed(futures):
            entry = futures[future]
            try:
                result = future.result()
                completed.append(result)
                print(f"OK {entry[2]}: {len(result['files'])} files", flush=True)
            except Exception as error:
                failures.append({"species": entry[2], "error": str(error)})
                print(f"FAILED {entry[2]}: {error}", flush=True)
    document = {"sourceCommit": COMMIT, "commonFiles": common_files,
                "species": sorted(completed, key=lambda x: x["dex"]), "failures": failures}
    (ROOT / "data" / "assets.json").write_text(json.dumps(document, indent=2) + "\n")
    if failures:
        raise SystemExit(f"{len(failures)} species incomplete; see data/assets.json")


if __name__ == "__main__":
    main()
