"""Pinned animation/offset/credit sheets for encounters, using the starter fetcher."""
import json,concurrent.futures
from fetch_assets import fetch_species,ROOT,download,WANTED
import xml.etree.ElementTree as ET
D=json.loads((ROOT/'assets/game/data.json').read_text())
entries=[('Incontri',p['id'],p['name']) for p in D['pokemon'].values() if not p['starter']]
def fetch(entry):
 folder=ROOT/'assets/pokemon'/f'{entry[1]:04}'
 download(f'sprite/{entry[1]:04}/AnimData.xml',folder/'AnimData.xml')
 names={x.findtext('Name') for x in ET.parse(folder/'AnimData.xml').findall('.//Anim')}
 wanted=[n for n in WANTED if n in names]
 result=fetch_species(entry,wanted)
 result['missingAnimations']=[n for n in WANTED if n not in names]
 return result
with concurrent.futures.ThreadPoolExecutor(max_workers=6) as pool:
 results=list(pool.map(fetch,entries))
(ROOT/'data/assets-extra.json').write_text(json.dumps(results,ensure_ascii=False,indent=2)+'\n')
print('Scaricate',len(results),'specie aggiuntive dal commit SpriteCollab fissato.')
