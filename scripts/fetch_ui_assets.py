"""Download the pinned UI assets; runtime never needs network access."""
from pathlib import Path
import hashlib,json,urllib.request
R=Path(__file__).resolve().parents[1]
S='97a7832d307311c0e1c6ea9035308bf80cc94f81'
F='45e3d5269e4a17d823f6d84470bc084dc5ae46f6'
assets=[('assets/items/'+key+'.png',f'https://raw.githubusercontent.com/PokeAPI/sprites/{S}/sprites/items/{name}.png','PokeAPI/sprites; Pokémon artwork belongs to its respective rights holders') for key,name in [('berry','oran-berry'),('ether','max-elixir'),('apple','apple')]]
assets += [('assets/fonts/'+name,f'https://raw.githubusercontent.com/google/fonts/{F}/ofl/vt323/{name}','VT323 by Peter Hull; SIL Open Font License 1.1') for name in ['VT323-Regular.ttf','OFL.txt']]
manifest=[]
for dest,url,credit in assets:
 p=R/dest;p.parent.mkdir(parents=True,exist_ok=True)
 data=urllib.request.urlopen(url,timeout=30).read();p.write_bytes(data)
 manifest.append(dict(path=dest,url=url,credit=credit,sha256=hashlib.sha256(data).hexdigest()))
(R/'assets/ui-sources.json').write_text(json.dumps(manifest,indent=2)+'\n')
print('Downloaded',len(manifest),'pinned assets')
