"""Pinned art + EoS growth for evolution chains; explicit donors for post-EoS species."""
import json,csv,struct,concurrent.futures,shutil,re,xml.etree.ElementTree as ET
from pathlib import Path
from fetch_assets import ROOT as R,download,fetch_species,WANTED
from skytemple_rust.st_pkdpx import Pkdpx
D=json.loads((R/'assets/game/data.json').read_text());C=json.loads((R/'data/eos-catalog.json').read_text());IT=json.loads((R/'data/i18n/it-eos.json').read_text())['categories'];G=json.loads((R/'data/eos-growth.json').read_text());names={int(x['pokemon_species_id']):x['name'] for x in csv.DictReader((R/'data/source/pokemon_species_names.csv').open()) if x['local_language_id']=='9'};italian={int(x['pokemon_species_id']):x['name'] for x in csv.DictReader((R/'data/source/pokemon_species_names.csv').open()) if x['local_language_id']=='8'}
blob=(R/'data/source/waza_p.bin').read_bytes();ptr=struct.unpack_from('<I',blob,4)[0];mp,lp=struct.unpack_from('<II',blob,ptr)
def ints(pos):
 if not pos:return []
 out=[];v=0;cont=False
 for b in blob[pos:]:
  if not cont and b==0:break
  v|=b&127
  if b&128:v<<=7;cont=True
  else:out.append(v);v=0;cont=False
 return out
status=[(105,'Recover','recover','heal'),(182,'Protect','protect','protect'),(14,'Swords Dance','swords-dance','atk'),(45,'Growl','growl','lowerAtk'),(86,'Thunder Wave','thunder-wave','paralysis'),(79,'Sleep Powder','sleep-powder','sleep'),(115,'Reflect','reflect','def'),(113,'Light Screen','light-screen','spd')]
for mid,name,slug,kind in status:
 m=C['moves'][name];eid=m['id'];raw=struct.unpack_from('<H',blob,mp+eid*26+4)[0];D['moves'][str(mid)]={**m,'id':mid,'eosId':eid,'eosName':name,'name':IT['Move Names']['entries'][eid],'slug':slug,'type':m['type'].lower(),'damageClass':'status','rangeCode':(raw>>4)&15,'targetCode':raw&15,'accuracy':m['accuracy2'],'effectChance':None,'statusEffect':kind,'rulesModule':'status-adapter'}
mapping={m['eosId']:m['id'] for m in D['moves'].values() if m.get('rulesModule')!='fairy-extension'}
chains=[(1,2,16,3,32),(4,5,16,6,36),(7,8,16,9,36),(152,153,16,154,32),(155,156,14,157,36),(158,159,18,160,30),(252,253,16,254,36),(255,256,16,257,36),(258,259,16,260,36),(387,388,18,389,32),(390,391,14,392,36),(393,394,16,395,36),(495,496,17,497,36),(498,499,17,500,36),(501,502,17,503,36),(650,651,16,652,36),(653,654,16,655,36),(656,657,16,658,36),(722,723,17,724,34),(725,726,17,727,34),(728,729,17,730,34),(810,811,16,812,35),(813,814,16,815,35),(816,817,16,818,35),(906,907,16,908,36),(909,910,16,911,36),(912,913,16,914,36),(246,247,30,248,55),(443,444,24,445,48),(304,305,32,306,42),(280,281,20,282,30)]
evos={};donors={};needed={};
for base,middle,l1,final,l2 in chains:
 evos[str(base)]=[{'to':middle,'level':l1}];evos[str(middle)]=[{'to':final,'level':l2}]
 reference=D['pokemon'][str(base)]['eosSpecies'];donor_chain=next((c for c in chains if names.get(c[0])==reference and c[0]<494),None)
 for target,stage in [(middle,1),(final,2)]:
  donor=names[target] if target<494 else names[donor_chain[1 if stage==1 else 3]] if donor_chain else reference
  needed[target]=(donor,D['pokemon'][str(base)]['region']);donors[target]=donor
for base,target,level,item,bond in [(19,20,20,None,0),(25,26,1,'thunderStone',0),(41,42,22,None,0),(42,169,1,None,20),(74,75,25,None,0),(75,76,1,'linkCable',0),(92,93,25,None,0),(93,94,1,'linkCable',0),(95,208,1,'metalCoat',0),(447,448,1,None,20),(570,571,30,None,0),(624,625,52,None,0),(679,680,35,None,0),(680,681,1,'duskStone',0),(133,134,1,'waterStone',0),(133,135,1,'thunderStone',0),(133,136,1,'fireStone',0)]:
 evos.setdefault(str(base),[]).append({'to':target,'level':level,**({'item':item} if item else {}),**({'bond':bond} if bond else {})});reference=D['pokemon'].get(str(base),{}).get('eosSpecies','Metang');needed[target]=(names[target] if target<494 else {'571':'Absol','625':'Lucario','680':'Metang','681':'Metagross'}.get(str(target),reference),'Kanto' if target<152 else 'Speciali')
growth=(R/'data/source/m_level.bin').read_bytes();md=(R/'data/source/monster.md').read_bytes()
def fill_mon(p,donor):
 c=C['species'][donor];eid=c['id'];p0,p1,p2=struct.unpack_from('<III',blob,lp+eid*12);lv=ints(p0);learnset=sorted({mapping[i] for i in [*lv[::2],*ints(p1),*ints(p2)] if i in mapping});levels=[{'move':mapping[lv[i]],'level':lv[i+1]} for i in range(0,len(lv),2) if lv[i] in mapping]
 # Preserve existing adaptations (e.g. Fairy) and evolved starter fallback.
 for old in p.get('levelMoves',[]):
  if old not in levels:levels.append(old)
 if not any(x['level']<=5 for x in levels):levels.insert(0,{'move':next((m for m in learnset if D['moves'][str(m)]['damageClass']!='status'),learnset[0]),'level':1})
 levels.sort(key=lambda x:x['level']);learnset=sorted(set(learnset+p.get('learnset',[])));p.update(learnset=learnset,levelMoves=levels)
 if donor not in G:
  start,size=struct.unpack_from('<II',growth,8+(eid-1)*8);sir=growth[start:start+size];ptr=struct.unpack_from('<I',sir,4)[0];raw=Pkdpx(sir[ptr:]).decompress();off=8+eid*68;G[donor]={'expThresholds':[struct.unpack_from('<i',raw,n*12)[0] for n in range(100)],'expYield':struct.unpack_from('<H',md,off+0x1c)[0],'regenSpeed':(md[off+0x30]<<1)&255}
 p.update(G[donor]);return p
for p in D['pokemon'].values():fill_mon(p,p['eosSpecies'])
def fetch(entry):
 sid,(donor,region)=entry
 if str(sid) in D['pokemon']:return None
 c=C['species'][donor];types=[t.lower() for t in c['types'] if t!='None'];p={'id':sid,'name':italian.get(sid,names[sid]),'region':region,'starter':False,'types':types,'type':types[0],'eosSpecies':donor,'eosId':c['id'],'abilities':c['abilities'],'rulesModule':'post-eos' if sid>493 else 'eos-na','levelStats':json.loads((R/f'third_party/damage-eos/levelup-stats/{donor}.json').read_text())};fill_mon(p,donor)
 folder=R/f'assets/pokemon/{sid:04}';download(f'sprite/{sid:04}/AnimData.xml',folder/'AnimData.xml');actions={a.findtext('Name') for a in ET.parse(folder/'AnimData.xml').findall('.//Anim')};assert {'Idle','Walk','Attack'}<=actions,(sid,actions);art=fetch_species((region,sid,p['name']),[n for n in WANTED if n in actions]);shutil.copy2(folder/'portrait.png',R/f'assets/portraits/{sid}.png');D['pokemon'][str(sid)]=p;print('Evolution art',sid,p['name'],flush=True);return art
arts=[]
with concurrent.futures.ThreadPoolExecutor(max_workers=6) as pool:
 for result in pool.map(fetch,needed.items()):
  if result:arts.append(result)
path=R/'data/assets-extra.json';previous=json.loads(path.read_text());path.write_text(json.dumps(previous+arts,ensure_ascii=False,indent=2)+'\n');(R/'data/eos-growth.json').write_text(json.dumps(G,separators=(',',':')));(R/'assets/game/data.json').write_text(json.dumps(D,ensure_ascii=False,separators=(',',':')));(R/'assets/game/evolutions.json').write_text(json.dumps(evos,indent=2)+'\n');(R/'data/evolution-donors.json').write_text(json.dumps(donors,indent=2)+'\n')
# Official Italian item/ability labels; keep mechanics descriptions separate.
items=IT['Item Names']['entries'];wanted=['Power Band','Special Band','Def. Scarf','Zinc Band','Detect Band','Pecha Scarf','Insomniscope','Thunderstone','Fire Stone','Water Stone','Link Cable','Metal Coat','Dusk Stone']
# English item ids from enums match the localized string table.
enums=(R/'third_party/damage-eos/src/pmdsky-debug/headers/types/common/enums.h').read_text();norm=lambda s:re.sub('[^a-z0-9]','',s.lower());aliases={norm(n):int(i,0) for n,i in re.findall(r'ITEM_([A-Z0-9_]+)\s*=\s*(0x[0-9a-fA-F]+|\d+)',enums)};labels={name:items[aliases[norm(name)]] for name in wanted if norm(name) in aliases}
ability_ids={norm(n):int(i,0) for n,i in re.findall(r'ABILITY_([A-Z0-9_]+)\s*=\s*(0x[0-9a-fA-F]+|\d+)',enums)};abilities={a:IT['Ability Names']['entries'][ability_ids[norm(a)]] for p in D['pokemon'].values() for a in p['abilities'] if norm(a) in ability_ids}
(R/'assets/game/adventure-labels.json').write_text(json.dumps({'items':labels,'abilities':abilities},ensure_ascii=False,indent=2)+'\n');print('All evolutions and status moves prepared',len(arts),len(D['pokemon']))

D['evolutions']=evos;D['adventureLabels']={'items':labels,'abilities':abilities}
pre_expansion_species = {1, 258, 387, 4, 133, 390, 7, 393, 650, 906, 12, 653, 909, 656, 912, 19, 149, 152, 25, 280, 155, 158, 36, 679, 41, 810, 813, 304, 816, 570, 443, 445, 447, 448, 74, 722, 725, 87, 728, 92, 94, 95, 359, 495, 624, 498, 373, 246, 501, 248, 635, 252, 255}
for choices in evos.values():
 for e in choices:
  target=D['pokemon'][str(e['to'])]
  if e['to'] not in pre_expansion_species:target.setdefault('minEncounterLevel',max(15,e['level']))
(R/'assets/game/data.json').write_text(json.dumps(D,ensure_ascii=False,separators=(',',':')))
