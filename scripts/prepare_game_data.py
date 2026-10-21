"""Join handoff art to EoS data; main-series battle numbers are not retained."""
import json, struct, hashlib
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
raw=(ROOT/'research/handoff/data.original.js').read_text().split('=',1)[1].strip().rstrip(';')
D=json.loads(raw)
C=json.loads((ROOT/'data/eos-catalog.json').read_text())
IT=json.loads((ROOT/'data/i18n/it-eos.json').read_text())['categories']
norm=lambda s: ''.join(c for c in s.lower() if c.isalnum())
moves_by_name={norm(k):(k,v) for k,v in C['moves'].items()}
blob=(ROOT/'data/source/waza_p.bin').read_bytes()
ptr=struct.unpack_from('<I',blob,4)[0]
move_ptr,learn_ptr=struct.unpack_from('<II',blob,ptr)
def ints(pos):
    result=[];value=0;continued=False
    for b in blob[pos:]:
        if not continued and b==0:break
        value|=b&127
        if b&128:value<<=7;continued=True
        else:result.append(value);value=0;continued=False
    return result

available={}; to_main={}
for main_id,old in D['moves'].items():
    pair=moves_by_name.get(norm(old['slug']))
    if not pair:continue
    name,m=pair
    if m['unsupported']:continue
    mid=m['id'];rawrange=struct.unpack_from('<H',blob,move_ptr+mid*26+4)[0]
    m={**m,'id':int(main_id),'eosId':mid,'eosName':name,'name':IT['Move Names']['entries'][mid],
       'slug':old['slug'],'type':m['type'].lower(),'damageClass':m['category'].lower(),
       'rangeCode':(rawrange>>4)&15,'targetCode':rawrange&15,
       'accuracy':m['accuracy2'],'effectChance':None}
    available[main_id]=m;to_main[mid]=int(main_id)
D['moves']=available
D['effects']=json.loads((ROOT/'assets/game/effects.json').read_text())
growth_path=ROOT/'data/eos-growth.json'
growth=json.loads(growth_path.read_text()) if growth_path.exists() else {}
# Explicit post-EoS conversion: use an existing species' growth and learnset.
# Art/name remain the chosen species; no new original-game behavior is claimed.
donors={495:'Treecko',498:'Torchic',501:'Mudkip',650:'Chikorita',653:'Cyndaquil',656:'Squirtle',
 722:'Treecko',725:'Charmander',728:'Piplup',810:'Turtwig',813:'Chimchar',816:'Totodile',
 906:'Bulbasaur',909:'Charmander',912:'Squirtle',570:'Absol',624:'Lucario',679:'Metang',635:'Garchomp'}
for sid,p in D['pokemon'].items():
    donor=donors.get(int(sid),p['name'])
    reference=C['species'].get(donor)
    if not reference:raise ValueError('Missing original species: '+donor)
    p['eosSpecies']=donor;p['eosId']=reference['id'];p['rulesModule']='post-eos' if int(sid)>493 else 'eos-na'
    p['types']=[t.lower() for t in reference['types'] if t.lower()!='none'];p['type']=p['types'][0]
    p['abilities']=reference['abilities']
    p.update(growth.get(donor,{}))
    p.pop('stats',None)
    p['levelStats']=json.loads((ROOT/'third_party/damage-eos/levelup-stats'/f'{donor}.json').read_text())
    p0,p1,p2=struct.unpack_from('<III',blob,learn_ptr+p['eosId']*12)
    level=ints(p0) if p0 else []
    lvl=[{'move':to_main[level[i]],'level':level[i+1]} for i in range(0,len(level),2) if level[i] in to_main]
    all_ids=[*level[::2],*(ints(p1) if p1 else []),*(ints(p2) if p2 else [])]
    p['learnset']=sorted({to_main[m] for m in all_ids if m in to_main})
    p['levelMoves']=lvl
    if not p['learnset']:raise ValueError('Empty move list: '+p['name'])
D.pop('typeChart',None)
D['mechanicsSource']='damage-eos a1fa84ce + live RNG; waza_p from pret/pmd-sky e3f02199. Complete engine NOT verified.'
D['dataVersion']=2
D['sourceWazaSha256']=hashlib.sha256(blob).hexdigest()
(ROOT/'assets/game/data.json').write_text(json.dumps(D,ensure_ascii=False,separators=(',',':')))
(ROOT/'data/post-eos-conversions.json').write_text(json.dumps(donors,indent=2)+'\n')
print(len(D['pokemon']),'species;',len(D['moves']),'original moves; no main-series stats or type chart.')
