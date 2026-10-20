@echo off
setlocal
cd /d "%~dp0"
where git >nul 2>nul
if errorlevel 1 (
  echo Installa Git per Windows e riprova.
  exit /b 1
)
py -3 -m venv .venv
if errorlevel 1 exit /b 1
.venv\Scripts\python -m pip install -r requirements-dev.txt
if errorlevel 1 exit /b 1
.venv\Scripts\python scripts\verify_assets.py
if errorlevel 1 exit /b 1
.venv\Scripts\python scripts\extract_italian.py
if errorlevel 1 exit /b 1
.venv\Scripts\python scripts\test_native.py
if errorlevel 1 exit /b 1
echo Verifiche completate. Questo script NON avvia un gioco.
