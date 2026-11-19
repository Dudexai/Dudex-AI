@echo off
echo Starting DudeX AI Backend...
start "DudeX AI Backend" cmd /k "cd /d "%~dp0backend 1" && call venv\Scripts\activate.bat && uvicorn main:app --reload --host 127.0.0.1 --port 8000"

echo Starting DudeX AI Frontend...
start "DudeX AI Frontend" cmd /k "cd /d "%~dp0frontend 1" && npm run dev"

echo Both services have been started in separate windows!
echo Backend: http://127.0.0.1:8000
echo Frontend: http://localhost:8080
