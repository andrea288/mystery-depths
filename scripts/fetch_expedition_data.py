"""Canonical identities and HM compatibility, cached PokeAPI responses and provenance."""
import json,urllib.request,concurrent.futures,hashlib,csv,io
from pathlib import Path
R=Path(__file__).resolve().parents[1];D=json.loads((R/'assets/game/data.json').read_text());cache=R/'data/source/expedition';cache.mkdir(exist_ok=True)
HMS={15:'cut',19:'fly',57:'surf',70:'strength',148:'flash',250:'whirlpool',127:'waterfall',249:'rockSmash',291:'dive',432:'defog',431:'rockClimb'}
def get(url,name):
 p=cache/name
 if not p.exists():
  url=url.replace('https://pokeapi.co/api/v2/','https://raw.githubusercontent.com/PokeAPI/api-data/master/data/api/v2/')+'/index.json'
  req=urllib.request.Request(url,headers={'User-Agent':'MysteryDepths-data-build/1.0'})
  p.write_bytes(urllib.request.urlopen(req,timeout=45).read())
 return p.read_bytes()
def mon(sid):
 data=json.loads(get(f'https://pokeapi.co/api/v2/pokemon/{sid}',f'pokemon-{sid}.json'))
 hm=sorted({HMS[int(x['move']['url'].rstrip('/').split('/')[-1])] for x in data['moves'] if int(x['move']['url'].rstrip('/').split('/')[-1]) in HMS})
 return sid,{'types':[t['type']['name'] for t in sorted(data['types'],key=lambda x:x['slot'])], 'abilities':[x['ability']['name'] for x in data['abilities'] if not x['is_hidden']], 'hiddenAbilities':[x['ability']['name'] for x in data['abilities'] if x['is_hidden']], 'fieldSkills':hm}
with concurrent.futures.ThreadPoolExecutor(max_workers=8) as pool: species=dict(pool.map(mon,map(int,D['pokemon'])))
names={};abilityNames={}
for mid,key in HMS.items():
 raw=json.loads(get(f'https://pokeapi.co/api/v2/move/{mid}',f'move-{mid}.json'));names[key]=next(n['name'] for n in raw['names'] if n['language']['name']=='it')
abilities=sorted({a for p in species.values() for a in p['abilities']})
abilityIds={a['ability']['name']:a['ability']['url'].rstrip('/').split('/')[-1] for p in cache.glob('pokemon-*.json') for a in json.loads(p.read_text())['abilities']}
for slug in abilities:
 raw=json.loads(get('https://pokeapi.co/api/v2/ability/'+abilityIds[slug],'ability-'+slug+'.json'));abilityNames[slug]={'it':next(n['name'] for n in raw['names'] if n['language']['name']=='it'),'en':next(n['name'] for n in raw['names'] if n['language']['name']=='en')}
result={'source':'https://pokeapi.co/','compatibility':'Move present in official learnsets represented by PokeAPI, across version groups and methods; not restricted to possession of an HM in one generation. Field effects are Mystery Depths adaptations.','hmNames':names,'species':species,'abilityNames':abilityNames}
(R/'assets/game/expedition-data.json').write_text(json.dumps(result,ensure_ascii=False,separators=(',',':')))
manifest={'provider':'PokeAPI','upstream':'https://github.com/PokeAPI/api-data/tree/master/data/api/v2','cachePolicy':'Raw responses are locally cached and excluded from Git. The compact runtime dataset and response SHA-256 hashes are committed.','retrieved':'2026-10-25','files':[{ 'file':str(p.relative_to(R)),'sha256':hashlib.sha256(p.read_bytes()).hexdigest()} for p in sorted(cache.glob('*.json'))]}
(R/'data/expedition-sources.json').write_text(json.dumps(manifest,indent=2))
print('Identities and HM compatibility:',len(species),'species;',len(abilities),'abilities;',names)
