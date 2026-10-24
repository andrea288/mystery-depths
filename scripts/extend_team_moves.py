"""Original EoS moves needed for type-themed guardians, with official Italian names."""
import json,struct
from pathlib import Path
R=Path(__file__).resolve().parents[1];p=R/'assets/game/data.json';D=json.loads(p.read_text());C=json.loads((R/'data/eos-catalog.json').read_text());IT=json.loads((R/'data/i18n/it-eos.json').read_text())['categories']['Move Names']['entries'];blob=(R/'data/source/waza_p.bin').read_bytes();ptr=struct.unpack_from('<I',blob,4)[0];moves,learn=struct.unpack_from('<II',blob,ptr)
entries=[(318,'Silver Wind','silver-wind'),(89,'Earthquake','earthquake'),(94,'Psychic','psychic'),(16,'Gust','gust'),(188,'Sludge Bomb','sludge-bomb'),(93,'Confusion','confusion'),(332,'Aerial Ace','aerial-ace'),(396,'Aura Sphere','aura-sphere'),(399,'Dark Pulse','dark-pulse')]
def ints(pos):
 if not pos:return []
 out=[];v=0;cont=False
 for b in blob[pos:]:
  if not cont and b==0:break
  v|=b&127
  if b&128:v<<=7;cont=True
  else:out.append(v);v=0;cont=False
 return out
for mid,name,slug in entries:
 m=C['moves'][name];assert not m['unsupported'];eid=m['id'];raw=struct.unpack_from('<H',blob,moves+eid*26+4)[0];D['moves'][str(mid)]={**m,'id':mid,'eosId':eid,'eosName':name,'name':IT[eid],'slug':slug,'type':m['type'].lower(),'damageClass':m['category'].lower(),'rangeCode':(raw>>4)&15,'targetCode':raw&15,'accuracy':m['accuracy2'],'effectChance':None}
 for mon in D['pokemon'].values():
  p0,p1,p2=struct.unpack_from('<III',blob,learn+mon['eosId']*12);lv=ints(p0);available=[*lv[::2],*ints(p1),*ints(p2)]
  if eid in available:mon['learnset']=sorted(set(mon['learnset']+[mid]))
  mon['levelMoves']=[x for x in mon['levelMoves'] if x['move']!=mid]+[{'move':mid,'level':lv[i+1]} for i in range(0,len(lv),2) if lv[i]==eid]
  mon['levelMoves'].sort(key=lambda x:x['level'])
p.write_text(json.dumps(D,ensure_ascii=False,separators=(',',':')));print('Nine original EoS moves added with official Italian names')
