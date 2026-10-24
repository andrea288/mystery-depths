"""Pinned pixel representations for equipment and evolution items; mappings are adaptations."""
import json,hashlib,urllib.request,concurrent.futures
from pathlib import Path
R=Path(__file__).resolve().parents[1];root=R/'assets/items/gear';root.mkdir(exist_ok=True)
commit='03c80dad937911572f8fb19903771a47956fc696'
icons={'powerBand':'Band_Brown','specialBand':'Band_Pink','defScarf':'Scarf_Blue','zincBand':'Band_Gray','detectBand':'Band_Green','pechaScarf':'Scarf_Pink','insomniscope':'Band_Tan','thunderStone':'Stone_Yellow','fireStone':'Stone_Red','waterStone':'Stone_Blue','linkCable':'Band_Gray','metalCoat':'Scarf_2_White','duskStone':'Stone_Purple'}
def get(entry):
 key,name=entry;url=f'https://raw.githubusercontent.com/PMDCollab/RawAsset/{commit}/Item/{name}.None.png';data=urllib.request.urlopen(url,timeout=30).read();assert data[:8]==b'\x89PNG\r\n\x1a\n';(root/f'{key}.png').write_bytes(data);return {'key':key,'url':url,'sha256':hashlib.sha256(data).hexdigest(),'adaptedMapping':True}
with concurrent.futures.ThreadPoolExecutor(max_workers=5) as pool:manifest=list(pool.map(get,icons.items()))
(root/'sources.json').write_text(json.dumps(manifest,indent=2)+'\n');print('Downloaded',len(manifest),'gear icons')
