"""Create a portable source/runtime archive without credentials or Git metadata."""
from pathlib import Path
import hashlib,zipfile
R=Path(__file__).resolve().parents[1]
out=R.parent/'artifacts';out.mkdir(exist_ok=True)
archive=out/'mystery-depths.zip'
roots=['src','assets','data','docs','scripts','tests','research','third_party','test-results']
files=[R/name for name in ['README.md','package.json','package-lock.json','index.html','style.css','requirements-dev.txt','avvia-windows.bat','avvia-linux-mac.sh']]
for directory in roots:
 for p in (R/directory).rglob('*'):
  if p.is_file() and 'data/source/expedition' not in str(p.relative_to(R)) and not any(s in {'.git','.cache','__pycache__','node_modules','.venv'} for s in p.relative_to(R).parts) and p.suffix!='.pyc':files.append(p)
with zipfile.ZipFile(archive,'w',zipfile.ZIP_DEFLATED,compresslevel=9) as z:
 for p in sorted(set(files)):z.write(p,'mystery-depths/'+str(p.relative_to(R)))
with zipfile.ZipFile(archive) as z:
 assert z.testzip() is None
 assert 'mystery-depths/assets/wasm/eos-core.wasm' in z.namelist()
digest=hashlib.sha256(archive.read_bytes()).hexdigest()
archive.with_suffix('.zip.sha256').write_text(digest+'  '+archive.name+'\n')
print(archive,archive.stat().st_size,'bytes',len(set(files)),'files',digest)
