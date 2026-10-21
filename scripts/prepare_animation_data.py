"""Local SpriteCollab metadata and shadow anchors.
Coordinate convention follows SkyTemple chara_wan/sheets.py (DRAW_CENTER_Y=-4).
"""
import json
from pathlib import Path
from PIL import Image
R=Path(__file__).resolve().parents[1]
species=json.loads((R/'data/assets.json').read_text())['species']+json.loads((R/'data/assets-extra.json').read_text())
result={}
for p in species:
 animations={}
 for name,a in p['animations'].items():
  w,h=a['frameWidth'],a['frameHeight'];sheet=Image.open(R/f"assets/pokemon/{p['dex']:04}/{a['sheet']}-Shadow.png").convert('RGBA')
  anchors=[]
  for d in range(sheet.height//h):
   frames=[]
   for f in range(len(a['durations'])):
    found=[(x,y) for x in range(w) for y in range(h) if sheet.getpixel((f*w+x,d*h+y))==(255,255,255,255)]
    assert len(found)<=1
    frames.append(found[0] if found else [w//2,h//2+4])
   anchors.append(frames)
  animations[name]={**a,'shadowAnchors':anchors}
 result[p['dex']]=animations
(R/'assets/game/animations.json').write_text(json.dumps(result,separators=(',',':')))
print('Prepared authentic animation timing and shadow anchors for',len(result),'species.')
