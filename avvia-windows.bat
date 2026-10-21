@echo off
setlocal
cd /d "%~dp0"
where node >nul 2>nul
if errorlevel 1 (
  echo Installa Node.js 22 o successivo da https://nodejs.org e riapri questo file.
  pause
  exit /b 1
)
echo Mystery Depths - avvio locale, nessuna pubblicazione.
echo Apri http://127.0.0.1:4173 nel browser.
echo Mantieni aperta questa finestra. Per chiudere premi Ctrl+C.
node scripts\serve.mjs
pause
