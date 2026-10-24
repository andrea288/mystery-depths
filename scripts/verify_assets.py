"""Verify every downloaded file and decode every PNG; produce a QA contact sheet."""
import hashlib
import json
from pathlib import Path
from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parents[1]
manifest = json.loads((ROOT / "data/assets.json").read_text())
assert not manifest["failures"], manifest["failures"]
assert len(manifest["species"]) == 29
assert len({s["dex"] for s in manifest["species"]}) == 29
manifest["species"] += json.loads((ROOT / "data/assets-extra.json").read_text())
runtime = json.loads((ROOT / "assets/game/data.json").read_text())
assert {s["dex"] for s in manifest["species"]} == {int(k) for k in runtime["pokemon"]}
assert len({s["dex"] for s in manifest["species"]}) == len(manifest["species"])
count = len(manifest["species"])
checked, png_count = 0, 0
sheet = Image.new("RGB", (7 * 180, ((count + 6) // 7) * 140), "#101b24")
draw = ImageDraw.Draw(sheet)
for index, species in enumerate(manifest["species"]):
    for entry in species["files"]:
        path = ROOT / entry["path"]
        assert hashlib.sha256(path.read_bytes()).hexdigest() == entry["sha256"], path
        if path.suffix == ".png":
            with Image.open(path) as image:
                image.verify()
            with Image.open(path) as image:
                image.load()
            png_count += 1
        checked += 1
    folder = ROOT / "assets/pokemon" / f'{species["dex"]:04}'
    portrait = Image.open(folder / "portrait.png").convert("RGBA")
    assert portrait.size == (40, 40), species["name"]
    x, y = (index % 7) * 180, (index // 7) * 140
    portrait = portrait.resize((80, 80), Image.Resampling.NEAREST)
    sheet.paste(portrait, (x + 4, y + 8), portrait)
    walk = species["animations"]["Walk"]
    with Image.open(folder / f'{walk["sheet"]}-Anim.png') as image:
        fw, fh = walk["frameWidth"], walk["frameHeight"]
        # Asset-format validation only: visual row orientation is not certified.
        assert image.height // fh == 8, species["name"]
        frame = image.crop((0, 0, fw, fh)).convert("RGBA")
        frame.thumbnail((76, 80), Image.Resampling.NEAREST)
        sheet.paste(frame, (x + 94, y + 12), frame)
    draw.text((x + 4, y + 98), species["name"], fill="white")
    draw.text((x + 4, y + 116), (species["region"] or "Speciali"), fill="#8bc9ad")
for entry in manifest["commonFiles"]:
    assert hashlib.sha256((ROOT / entry["path"]).read_bytes()).hexdigest() == entry["sha256"]
    checked += 1
sheet.save(ROOT / "test-results/assets-contact-sheet.png")
report = {"species": count, "filesVerified": checked, "pngDecoded": png_count,
          "eightDirectionWalkSheets": count,
          "animationTimingComparedToOriginal": False,
          "browserRenderingScope": "separate tests/browser suite"}
(ROOT / "test-results/assets-verification.json").write_text(json.dumps(report, indent=2) + "\n")
print(json.dumps(report, indent=2))
