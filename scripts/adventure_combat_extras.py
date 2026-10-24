"""Damage/recoil + OHKO adapters, sourced from EoS parameters and Italian strings."""
import json,struct
from pathlib import Path
R=Path(__file__).resolve().parents[1];p=R/'assets/game/data.json';D=json.loads(p.read_text());C=json.loads((R/'data/eos-catalog.json').read_text());IT=json.loads((R/'data/i18n/it-eos.json').read_text())['categories']['Move Names']['entries'];blob=(R/'data/source/waza_p.bin').read_bytes();ptr=struct.unpack_from('<I',blob,4)[0];mp,lp=struct.unpack_from('<II',blob,ptr)
def ints(pos):
 if not pos:return []
 out=[];v=0;cont=False
 for b in blob[pos:]:
  if not cont and b==0:break
  v|=b&127
  if b&128:v<<=7;cont=True
  else:out.append(v);v=0;cont=False
 return out
for mid,name,slug,extra in [(36,'Take Down','take-down',{'recoil':True}),(90,'Fissure','fissure',{'ohko':True,'rulesModule':'ohko-adapter'})]:
 m=C['moves'][name];eid=m['id'];raw=struct.unpack_from('<H',blob,mp+eid*26+4)[0];D['moves'][str(mid)]={**m,'id':mid,'eosId':eid,'eosName':name,'name':IT[eid],'slug':slug,'type':m['type'].lower(),'damageClass':m['category'].lower(),'rangeCode':(raw>>4)&15,'targetCode':raw&15,'accuracy':m['accuracy2'],'effectChance':None,**extra}
 for mon in D['pokemon'].values():
  p0,p1,p2=struct.unpack_from('<III',blob,lp+mon['eosId']*12);lv=ints(p0)
  if eid in [*lv[::2],*ints(p1),*ints(p2)]:mon['learnset']=sorted(set(mon['learnset']+[mid]))
  mon['levelMoves']=[x for x in mon['levelMoves'] if x['move']!=mid]+[{'move':mid,'level':lv[i+1]} for i in range(0,len(lv),2) if lv[i]==eid];mon['levelMoves'].sort(key=lambda x:x['level'])
p.write_text(json.dumps(D,ensure_ascii=False,separators=(',',':')))
