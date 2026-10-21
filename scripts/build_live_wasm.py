"""Build a documented live-RNG adapter without modifying the pinned submodule."""
import os
from pathlib import Path
import shutil
import subprocess
import sys

ROOT = Path(__file__).resolve().parents[1]
stage = ROOT / 'build/live-eos'
stage.mkdir(parents=True, exist_ok=True)
source = ROOT / 'third_party/damage-eos/src'
shutil.copytree(source, stage / 'src', dirs_exist_ok=True, ignore=shutil.ignore_patterns('.git'))
header = stage / 'src/damage.hpp'
text = header.read_text()
text = text.replace('class MockDungeonRNG {', 'extern int32_t md_rand_int(int32_t end);\nclass MockDungeonRNG {')
replacements = {
    'return huge_pure_power;': 'return md_rand_int(100) < 33;',
    'return critical_hit;': 'return md_rand_int(100) < crit_chance;',
    'forewarn_active = true; // Store this so we know the roll happened later\n        return false;':
        'forewarn_active = true;\n        return md_rand_int(100) < 20;',
    'return true;\n    }\n    std::optional<int32_t> get_hit_chance1()':
        'return md_rand_int(100) < hit_chance;\n    }\n    std::optional<int32_t> get_hit_chance1()',
    'std::min(std::max(static_cast<int>(std::round(variance_dial * 0x3FFF)), 0), 0x3FFF)':
        'md_rand_int(0x4000)',
}
for old, new in replacements.items():
    if text.count(old) != 1: raise RuntimeError('Upstream RNG layout changed: '+old)
    text = text.replace(old, new)
header.write_text(text)
sdk = Path(os.environ.get('EMSDK_ROOT', '/workspace/references/emsdk'))
empp = sdk / 'upstream/emscripten/em++'
include = ROOT / 'build/native/_deps/json-src/include'
if not include.exists(): raise RuntimeError('Build the native reference first (scripts/test_native.py).')
output = ROOT / 'assets/wasm'
output.mkdir(exist_ok=True)
sources=[str(stage/'src'/f) for f in ['mathutil.cpp','mechanics.cpp','damage.cpp','idmap.cpp','cfgparse.cpp']]
if '--native-only' in sys.argv:
    subprocess.run([os.environ.get('CXX','c++'),'-std=c++17','-O2','-I'+str(stage/'src'),'-I'+str(include),*sources,str(ROOT/'src/core/live_damage.cpp'),'-o',str(stage/'native-adapter')],cwd=ROOT,check=True)
    print('Built native adapter for differential tests.')
    raise SystemExit(0)
args = [str(empp), '-std=c++17', '-O2', '-lembind', '-fexceptions', '-sDISABLE_EXCEPTION_CATCHING=0',
        '-sMODULARIZE=1', '-sEXPORT_ES6=1', '-sEXPORT_NAME=createEosCore', '-sALLOW_MEMORY_GROWTH=1',
        '-I'+str(stage/'src'), '-I'+str(include),
        *[str(stage/'src'/f) for f in ['mathutil.cpp','mechanics.cpp','damage.cpp','idmap.cpp','cfgparse.cpp']],
        str(ROOT/'src/core/live_damage.cpp'), '-o', str(output/'eos-core.mjs')]
subprocess.run(args, cwd=ROOT, check=True)
print('Built local EoS damage adapter with live RNG. Full engine equivalence remains unverified.')
