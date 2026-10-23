"""Fetch unmodified PMDCollab particle sheets, pin provenance and dimensions."""
from pathlib import Path
import json,struct,hashlib,urllib.request,concurrent.futures
R=Path(__file__).resolve().parents[1];P=R/'assets/effects';P.mkdir(exist_ok=True)
PIN='03c80dad937911572f8fb19903771a47956fc696'
names=['Ember','Flamethrower','Hit_Neutral','Shadow_Ball','Razor_Leaf','Magical_Leaf','Absorb','Bubbles_Blue','Bubble_Pop_Blue','Spark','Shock_Wave','Ice_RSE','Ice_Pieces','Fire_Spin_Front','Fire_Fang_Hit','Leaf_Blade','Lick','Rock_Pieces','Rock_Smash','Bullet_Punch','Fangs_RSE','Dragon_Pulse_Ball','Healing_Wish_Hit','Metal_Burst_Hit','Vine_Whip_2']
def fetch(name):
 url=f'https://raw.githubusercontent.com/PMDCollab/RawAsset/{PIN}/Particle/{name}.None.png'
 data=urllib.request.urlopen(url,timeout=30).read();w,h=struct.unpack('>II',data[16:24]);assert w%h==0,(name,w,h)
 (P/(name+'.png')).write_bytes(data)
 return name,dict(file=name+'.png',size=h,frames=w//h,url=url,sha256=hashlib.sha256(data).hexdigest())
with concurrent.futures.ThreadPoolExecutor(max_workers=5) as pool: result=dict(pool.map(fetch,names))
(P/'manifest.json').write_text(json.dumps(dict(source='PMDCollab/RawAsset',commit=PIN,sheets=result),indent=2)+'\n')
print(len(result),'particle sheets')
