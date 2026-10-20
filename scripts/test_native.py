"""Build and execute the pinned upstream reference, without changing its rules."""
import os
from pathlib import Path
import shutil
import subprocess
import sys
import xml.etree.ElementTree as ET

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "third_party/damage-eos"
BUILD = ROOT / "build/native"
RESULTS = ROOT / "test-results"
PIN = "a1fa84ce0f436e5a2887943e807839372f26a245"


def run(args, log=None):
    if log:
        with (RESULTS / log).open("w") as output:
            subprocess.run(args, cwd=ROOT, check=True, stdout=output, stderr=subprocess.STDOUT)
    else:
        subprocess.run(args, cwd=ROOT, check=True)


def main():
    RESULTS.mkdir(exist_ok=True)
    run(["git", "submodule", "update", "--init", "--recursive"])
    actual = subprocess.check_output(["git", "-C", str(SOURCE), "rev-parse", "HEAD"], text=True).strip()
    if actual != PIN:
        raise SystemExit(f"Reference commit mismatch: expected {PIN}, got {actual}")
    run(["git", "-C", str(SOURCE), "diff", "--exit-code", "HEAD", "--"])
    cmake = shutil.which("cmake") or str(Path(sys.executable).parent / ("cmake.exe" if os.name == "nt" else "cmake"))
    ctest = str(Path(cmake).with_name("ctest.exe" if os.name == "nt" else "ctest"))
    config = [cmake, "-S", str(SOURCE), "-B", str(BUILD), "-DCMAKE_BUILD_TYPE=Release"]
    if os.name != "nt":
        # Catch2 3.2.1 omits cstdint; GCC 14 no longer includes it transitively.
        # Include the standard header without altering dependencies or assertions.
        config.append("-DCMAKE_CXX_FLAGS=-include cstdint")
    run(config, "native-configure.log")
    run([cmake, "--build", str(BUILD), "--config", "Release", "--parallel", "4"], "native-build.log")
    xml = RESULTS / "native-tests.xml"
    if xml.exists():
        xml.unlink()
    run([ctest, "--test-dir", str(BUILD / "src"), "-C", "Release",
         "--output-on-failure", "--output-junit", str(xml)], "native-tests.log")
    tree = ET.parse(xml)
    cases = tree.findall(".//testcase")
    if not cases or any(c.find("failure") is not None or c.find("skipped") is not None for c in cases):
        raise SystemExit("Tests did not execute completely")
    executable = BUILD / "src" / ("Release/damagecalc.exe" if os.name == "nt" else "damagecalc")
    run([str(executable), "-i", str(SOURCE / "sample-config.json"), "-vvv"], "native-sample.txt")
    print(f"{len(cases)} upstream tests passed. Original-game equivalence is NOT established.")


if __name__ == "__main__":
    main()
