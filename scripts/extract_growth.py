"""Decode EoS NA growth via SkyTemple's pinned PKDPX decoder.
Layout: skytemple-files 5ed359a/data/level_bin_entry/model.py;
monster.md layout: pmdsky-debug c72fe675/common.h.
"""
from pathlib import Path
import json,struct
from skytemple_rust.st_pkdpx import Pkdpx
R=Path(__file__).resolve().parents[1]
D=json.loads((R/'assets/game/data.json').read_text());blob=(R/'data/source/m_level.bin').read_bytes();md=(R/'data/source/monster.md').read_bytes()
out={}
for p in D['pokemon'].values():
 i=p['eosId'];offset=8+i*68
 start,size=struct.unpack_from('<II',blob,8+(i-1)*8)
 sir=blob[start:start+size];ptr=struct.unpack_from('<I',sir,4)[0]
 raw=Pkdpx(sir[ptr:]).decompress()
 assert len(raw)==1200
 entries=[struct.unpack_from('<iHBBBBH',raw,n*12) for n in range(100)]
 hp=struct.unpack_from('<H',md,offset+0x20)[0];atk,spa,df,spd=struct.unpack_from('<BBBB',md,offset+0x24)
 for n,(_,h,a,s,d,sd,z) in enumerate(entries):
  hp+=h;atk+=a;spa+=s;df+=d;spd+=sd
  assert p['levelStats'][n]=={'hp':hp,'atk':atk,'spa':spa,'def':df,'spd':spd},(p['name'],n,p['levelStats'][n],{'hp':hp,'atk':atk,'spa':spa,'def':df,'spd':spd})
 out[p['eosSpecies']]={'expThresholds':[e[0] for e in entries],'expYield':struct.unpack_from('<H',md,offset+0x1c)[0],'regenSpeed':(md[offset+0x30]<<1)&255}
(R/'data/eos-growth.json').write_text(json.dumps(out,separators=(',',':')))
print('Growth independently matches damage-eos:',len(D['pokemon']),'species /',len(D['pokemon'])*100,'levels.')
