#!/usr/bin/env python3
"""Rebuild offline PMDCollab art and PokeAPI data. Python 3 standard library only."""
import csv,io,json,time,urllib.request,concurrent.futures,xml.etree.ElementTree as ET
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
ASSETS=ROOT/'assets'
CACHE=ROOT/'scripts'/'.cache'
CACHE.mkdir(exist_ok=True)
P='https://raw.githubusercontent.com/PokeAPI/pokeapi/master/data/v2/csv/'
S='https://raw.githubusercontent.com/PMDCollab/SpriteCollab/master/'
STARTERS=[1,4,7,152,155,158,252,255,258,387,390,393,495,498,501,650,653,656,722,725,728,810,813,816,906,909,912,25,133]
ENEMIES=[19,41,74,92,133,25,246,280,304,359,447,443,570,624,679]
BOSSES=[95,94,248,445,448,635,149,373]
IDS=sorted(set(STARTERS+ENEMIES+BOSSES))
REGIONS=['Kanto','Johto','Hoenn','Sinnoh','Unima','Kalos','Alola','Galar','Paldea']
MOVE_SLUGS='tackle scratch pound growl tail-whip ember flamethrower fire-spin fire-fang water-gun bubble bubble-beam water-pulse hydro-pump vine-whip razor-leaf absorb mega-drain giga-drain leafage magical-leaf leaf-blade thunder-shock thunderbolt quick-attack bite crunch lick astonish shadow-ball rock-throw rock-slide metal-claw iron-head dragon-breath dragon-claw ice-beam powder-snow protect swords-dance synthesis recover sleep-powder poison-powder stun-spore hypnosis confuse-ray double-kick fury-swipes focus-energy'.split()
errors=[]
def fetch(url,path):
 if path.exists() and path.stat().st_size: return path.read_bytes()
 for attempt in range(3):
  try:
   with urllib.request.urlopen(url,timeout=45) as r: data=r.read()
   path.parent.mkdir(parents=True,exist_ok=True);path.write_bytes(data)
   return data
  except Exception as e:
   if getattr(e,'code',0)==404: raise
   if attempt==2: raise
   time.sleep(attempt+1)
def table(name):
 return list(csv.DictReader(io.StringIO(fetch(P+name+'.csv',CACHE/(name+'.csv')).decode('utf-8-sig'))))
def assets(pid):
 folder=ASSETS/'sprites'/str(pid)
 try:
  xml=fetch(S+f'sprite/{pid:04d}/AnimData.xml',folder/'AnimData.xml')
  root=ET.fromstring(xml)
  anims={a.findtext('Name'):a for a in root.findall('./Anims/Anim')}
  result={}
  for action in ['Idle','Walk','Attack']:
   name=next((n for n in [action,'Walk','Idle','Attack'] if n in anims),None)
   if not name: continue
   original=name;anim=anims[name]
   while anim.findtext('CopyOf'):
    name=anim.findtext('CopyOf');anim=anims[name]
   try:
    fetch(S+f'sprite/{pid:04d}/{name}-Anim.png',folder/f'{name}-Anim.png')
    result[action]={'w':int(anim.findtext('FrameWidth')),'h':int(anim.findtext('FrameHeight')),'durations':[int(x.text) for x in anim.findall('./Durations/Duration')],'file':f'{name}-Anim.png','sourceAction':original}
   except Exception as e: errors.append(f'{pid} {action}: {e}')
  try: fetch(S+f'portrait/{pid:04d}/Normal.png',ASSETS/'portraits'/f'{pid}.png')
  except Exception as e: errors.append(f'{pid} portrait: {e}')
  return pid,result
 except Exception as e: errors.append(f'{pid} sprite: {e}');return pid,{}
def main():
 names=['pokemon','pokemon_species_names','pokemon_types','types','pokemon_stats','stats','moves','move_names','move_meta','move_meta_stat_changes','move_meta_ailments','type_efficacy','pokemon_moves']
 with concurrent.futures.ThreadPoolExecutor(max_workers=8) as pool:
  tables=dict(zip(names,pool.map(table,names)))
 print('Downloaded CSV tables',flush=True)
 types={int(r['id']):r['identifier'] for r in tables['types']}
 stat_names={r['id']:r['identifier'] for r in tables['stats']}
 local_names={int(r['pokemon_species_id']):r['name'] for r in tables['pokemon_species_names'] if r['local_language_id']=='8'}
 poke={int(r['id']):{'id':int(r['id']),'name':local_names.get(int(r['species_id']),r['identifier'].capitalize()),'types':[],'stats':{},'region':REGIONS[STARTERS.index(int(r['id']))//3] if int(r['id']) in STARTERS[:27] else 'Kanto' if int(r['id']) in STARTERS else None,'starter':int(r['id']) in STARTERS,'learnset':[]} for r in tables['pokemon'] if int(r['id']) in IDS}
 for r in tables['pokemon_types']:
  pid=int(r['pokemon_id'])
  if pid in poke: poke[pid]['types'].append(types[int(r['type_id'])])
 for p in poke.values():p['type']=p['types'][0]
 for r in tables['pokemon_stats']:
  pid=int(r['pokemon_id'])
  if pid in poke: poke[pid]['stats'][stat_names[r['stat_id']]]=int(r['base_stat'])
 mn={int(r['move_id']):r['name'] for r in tables['move_names'] if r['local_language_id']=='8'}
 moves={int(r['id']):{'id':int(r['id']),'slug':r['identifier'],'name':mn.get(int(r['id']),r['identifier']),'type':types[int(r['type_id'])],'power':int(r['power'] or 0),'pp':int(r['pp'] or 0),'accuracy':int(r['accuracy'] or 100),'damageClass':{'1':'status','2':'physical','3':'special'}[r['damage_class_id']],'effectChance':int(r['effect_chance'] or 0),'effectId':int(r['effect_id'] or 0),'meta':{}} for r in tables['moves'] if r['identifier'] in MOVE_SLUGS}
 ailments={r['id']:r['identifier'] for r in tables['move_meta_ailments']}
 for r in tables['move_meta']:
  mid=int(r['move_id'])
  if mid in moves:
   moves[mid]['meta']={k:int(v) if v and v.lstrip('-').isdigit() else v for k,v in r.items() if k!='move_id'}
   moves[mid]['meta']['ailment']=ailments.get(r['meta_ailment_id'],'none')
   moves[mid]['meta']['statChanges']=[]
 for r in tables['move_meta_stat_changes']:
  mid=int(r['move_id'])
  if mid in moves:moves[mid]['meta'].setdefault('statChanges',[]).append({'stat':stat_names[r['stat_id']],'change':int(r['change'])})
 for r in tables['pokemon_moves']:
  pid,mid=int(r['pokemon_id']),int(r['move_id'])
  if pid in poke and mid in moves:poke[pid]['learnset'].append(mid)
 for p in poke.values():p['learnset']=sorted(set(p['learnset']))
 efficacy={v:{} for v in types.values()}
 for r in tables['type_efficacy']: efficacy[types[int(r['damage_type_id'])]][types[int(r['target_type_id'])]]=int(r['damage_factor'])/100
 with concurrent.futures.ThreadPoolExecutor(max_workers=10) as pool:
  for pid,anims in pool.map(assets,IDS):
   poke[pid]['sprite']=anims
   print('Sprites',pid,list(anims),flush=True)
 data={'pokemon':poke,'moves':moves,'typeChart':efficacy,'starterIds':STARTERS,'enemyIds':ENEMIES,'bossIds':BOSSES,'regions':REGIONS,'dataVersion':1,'mechanicsSource':'PokeAPI main-series data, NOT original Explorers of Sky parameters'}
 (ASSETS/'data.js').write_text('globalThis.GAME_DATA = '+json.dumps(data,ensure_ascii=False,separators=(',',':'))+';\n')
 (ASSETS/'SOURCES.md').write_text('# Asset and data provenance\n\n- Pokémon dungeon sprites and portraits: https://github.com/PMDCollab/SpriteCollab (downloaded 2026-10-20). These include community-contributed sprites, especially later generations; they are not all original Nintendo DS assets. Individual credits are retained in spritebot_credits.txt and tracker.json.\n- Pokémon names, base stats, types, move names, move data, type efficacy and learnset membership: https://github.com/PokeAPI/pokeapi/tree/master/data/v2/csv (downloaded 2026-10-20).\n- Learnset membership is the union across available PokeAPI version groups and methods, restricted to the curated moves implemented by this game. It does not imply a move is available in every generation.\n- Move power, accuracy, PP, effects and type chart are main-series data; they are NOT the original Explorers of Sky move data. Game combat is a custom adaptation.\n- Sprite direction row order follows PMDCollab: down, down-right, right, up-right, up, up-left, left, down-left. Frame durations are in 1/60-second ticks.\n- Rebuild with python3 scripts/fetch_assets.py (requires internet). Gameplay uses only local bundled assets.\n\n## Missing or substituted actions\n'+('\n'.join(errors) if errors else 'None: every Pokémon has Idle, Walk and Attack art plus a portrait. Action aliases, if any, are recorded in data.js sourceAction/file fields.')+'\n')
 for file in ['spritebot_credits.txt','tracker.json']:
  try:fetch(S+file,ASSETS/file)
  except Exception as e:print('Credits download',e)
 print('DONE',len(poke),'pokemon',len(moves),'moves',len(errors),'issues',flush=True)
 print('\n'.join(errors),flush=True)
if __name__=='__main__':main()
