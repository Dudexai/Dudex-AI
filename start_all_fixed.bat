@echo off
echo Stopping old processes...
taskkill /F /IM node.exe >nul 2>&1
taskkill /F /IM python.exe >nul 2>&1
taskkill /F /IM uvicorn.exe >nul 2>&1

echo Starting DudeX AI Backend...
start "DudeX AI Backend" cmd /k "cd /d "%~dp0backend 1" && call venv\Scripts\activate.bat && uvicorn main:app --reload --host 127.0.0.1 --port 8000"

echo Starting DudeX AI Frontend...
start "DudeX AI Frontend" cmd /k "cd /d "%~dp0frontend 1" && npm run dev"

echo Both services have been started in new windows!
echo Backend: http://127.0.0.1:8000
echo Frontend: http://localhost:8080
