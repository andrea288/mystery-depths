"""Add three missing type representatives using pinned EoS data and SpriteCollab."""
import json,struct,shutil,concurrent.futures,xml.etree.ElementTree as ET
from fetch_assets import ROOT,fetch_species,download,WANTED
from skytemple_rust.st_pkdpx import Pkdpx
D=json.loads((ROOT/'assets/game/data.json').read_text());C=json.loads((ROOT/'data/eos-catalog.json').read_text());G=json.loads((ROOT/'data/eos-growth.json').read_text())
blob=(ROOT/'data/source/waza_p.bin').read_bytes();ptr=struct.unpack_from('<I',blob,4)[0];_,learn=struct.unpack_from('<II',blob,ptr);mapping={m['eosId']:m['id'] for m in D['moves'].values() if m.get('rulesModule')!='fairy-extension'}
def ints(pos):
 out=[];v=0;cont=False
 for b in blob[pos:]:
  if not cont and b==0:break
  v|=b&127
  if b&128:v<<=7;cont=True
  else:out.append(v);v=0;cont=False
 return out
entries=[('Kanto',12,'Butterfree'),('Kanto',87,'Dewgong'),('Kanto',36,'Clefable')]
def add(entry):
 region,sid,name=entry;c=C['species'][name]
 if name not in G:
  growth=(ROOT/'data/source/m_level.bin').read_bytes();md=(ROOT/'data/source/monster.md').read_bytes();i=c['id'];start,size=struct.unpack_from('<II',growth,8+(i-1)*8);sir=growth[start:start+size];ptr=struct.unpack_from('<I',sir,4)[0];raw=Pkdpx(sir[ptr:]).decompress();off=8+i*68;G[name]={'expThresholds':[struct.unpack_from('<i',raw,n*12)[0] for n in range(100)],'expYield':struct.unpack_from('<H',md,off+0x1c)[0],'regenSpeed':(md[off+0x30]<<1)&255}
 p0,p1,p2=struct.unpack_from('<III',blob,learn+c['id']*12);lv=ints(p0);allids=[*lv[::2],*ints(p1),*ints(p2)];levels=[{'move':mapping[lv[i]],'level':lv[i+1]} for i in range(0,len(lv),2) if lv[i] in mapping];ids=sorted({mapping[i] for i in allids if i in mapping})
 # Evolved species can have no supported low-level moves; select an original compatible move.
 if not any(m['level']<=5 for m in levels):levels.insert(0,{'move':ids[0],'level':1})
 types=[t.lower() for t in c['types'] if t!='None'];types=['fairy'] if sid==36 else types
 D['pokemon'][str(sid)]={'id':sid,'name':name,'region':region,'starter':False,'types':types,'type':types[0],'eosSpecies':name,'eosId':c['id'],'abilities':c['abilities'],'rulesModule':'fairy-extension' if sid==36 else 'eos-na','levelStats':json.loads((ROOT/f'third_party/damage-eos/levelup-stats/{name}.json').read_text()),'levelMoves':levels,'learnset':ids,**G.get(name,{})}
 folder=ROOT/f'assets/pokemon/{sid:04}';download(f'sprite/{sid:04}/AnimData.xml',folder/'AnimData.xml');names={a.findtext('Name') for a in ET.parse(folder/'AnimData.xml').findall('.//Anim')};a=fetch_species(entry,[n for n in WANTED if n in names]);shutil.copy2(folder/'portrait.png',ROOT/f'assets/portraits/{sid}.png');return a
with concurrent.futures.ThreadPoolExecutor(max_workers=3) as pool:assets=list(pool.map(add,entries))
p=ROOT/'data/assets-extra.json';old=json.loads(p.read_text());old=[a for a in old if a['dex'] not in [12,87,36]];p.write_text(json.dumps(old+assets,indent=2)+'\n');(ROOT/'assets/game/data.json').write_text(json.dumps(D,ensure_ascii=False,separators=(',',':')));print('Added Butterfree, Dewgong, Clefable and pinned assets')

# Add the explicit Fairy extension after extracting the original learnsets.
name=json.loads((ROOT/'data/fairy-move-source.json').read_text())['name']
c=C['moves']['Swift']
D['moves']['605']={**c,'id':605,'eosId':c['id'],'eosName':'Swift','name':name,'slug':'dazzling-gleam','type':'fairy','damageClass':'special','rangeCode':3,'targetCode':0,'accuracy':c['accuracy2'],'effectChance':None,'rulesModule':'fairy-extension'}
p=D['pokemon']['36'];p['learnset']=sorted(set(p['learnset']+[605]));p['levelMoves']=[x for x in p['levelMoves'] if x['move']!=605]+[{'move':605,'level':1}]
(ROOT/'assets/game/data.json').write_text(json.dumps(D,ensure_ascii=False,separators=(',',':')))

(ROOT/'data/eos-growth.json').write_text(json.dumps(G,separators=(',',':')))
