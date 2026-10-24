"""Portable, offline runtime including local pixel fonts and item graphics."""
from pathlib import Path
from zipfile import ZipFile, ZIP_DEFLATED
import shutil
R=Path(__file__).resolve().parents[1]
archive=R/'downloads/mystery-depths-gioco.zip';archive.parent.mkdir(exist_ok=True)
roots=['src','assets/game','assets/wasm','assets/pokemon','assets/portraits','assets/items','assets/fonts','assets/credits','assets/effects']
files=[R/p for p in ['index.html','style.css','package.json','avvia-windows.bat','avvia-linux-mac.sh','scripts/serve.mjs','assets/SOURCES.md','assets/ui-sources.json','assets/spritebot_credits.txt','docs/CONFORMITA.md','docs/SQUADRA-E-GUARDIANI.md','docs/MIGLIORAMENTI-20.md','data/evolution-donors.json','data/assets-extra.json','data/fairy-move-source.json']]
for directory in roots:
 files += [p for p in (R/directory).rglob('*') if p.is_file()]
with ZipFile(archive,'w',ZIP_DEFLATED,compresslevel=9) as z:
 for p in sorted(set(files)): z.write(p,'mystery-depths/'+str(p.relative_to(R)))
 z.writestr('mystery-depths/LEGGIMI.txt', 'Mystery Depths\n\nInstalla Node.js 22 o successivo. Su Windows apri avvia-windows.bat.\nIn alternativa esegui npm start nella cartella estratta.\nApri http://127.0.0.1:4173 nel browser.\n\nOrienta: pulsanti direzionali o tocchi sulla mappa girano il Pokémon senza consumare turni.\nCon il mouse puoi anche usare il clic destro. Frecce/WASD: movimento; 1-4: mosse.\n\nCodice e fonti complete: https://github.com/andrea288/mystery-depths\nLe differenze ancora presenti rispetto a EoS sono documentate in docs/CONFORMITA.md.\n')
with ZipFile(archive) as z: assert z.testzip() is None
out=R.parent/'artifacts';out.mkdir(exist_ok=True);shutil.copy2(archive,out/archive.name)
print(archive,archive.stat().st_size,'bytes')
