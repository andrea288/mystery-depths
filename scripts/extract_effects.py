"""Extract secondary-effect constants directly from pinned pret/pmd-sky ASM."""
from pathlib import Path
import json,re
R=Path(__file__).resolve().parents[1];source=R/'research/pmd-sky/asm'
text='\n'.join(p.read_text() for p in source.glob('overlay_10*.s'))
names=['FLAMETHROWER_BURN_CHANCE','THUNDERSHOCK_PARALYZE_CHANCE','THUNDERBOLT_PARALYZE_CHANCE','BITE_CRINGE_CHANCE','METAL_CLAW_BOOST_ATTACK_CHANCE','SHADOW_BALL_LOWER_SPECIAL_DEFENSE_CHANCE','FLARE_BLITZ_BURN_CHANCE','FIRE_FANG_CRINGE_CHANCE']
# Preserve all named constants used by the move-handler subset and status ranges.
handlers='\n'.join(p.read_text() for p in source.glob('overlay_29*.s'))
for fn in ['DoMoveDamageFreeze15','DoMoveDamageParalyze15','DoMoveDamageConfuse30','DoMoveDamageCringe30','DoMoveCrunch']:
 body=re.search(r'arm_func_start '+fn+r'\n(.*?)arm_func_end '+fn,handlers,re.S)[1]
 names+=re.findall(r'; =(\w+)',body)
names+=['SLEEP_TURN_RANGE','FROZEN_TURN_RANGE','PARALYSIS_TURN_RANGE','CONFUSED_TURN_RANGE','CRINGE_TURN_RANGE']
out={}
for name in sorted(set(names)):
 match=re.search(r'^'+name+r':\n\s*\.byte ([^\n]+)',text,re.M)
 if not match:continue
 b=bytes(int(v.strip(),0) for v in match[1].split(','));out[name]=list(int.from_bytes(b[i:i+2],'little') for i in range(0,len(b),2)) if 'TURN_RANGE' in name else int.from_bytes(b[:2],'little')
(R/'assets/game/effects.json').write_text(json.dumps(out,indent=2)+'\n')
print(out)
