@echo off
echo Stopping old processes...
taskkill /F /IM node.exe >nul 2>&1
taskkill /F /IM python.exe >nul 2>&1
taskkill /F /IM uvicorn.exe >nul 2>&1

echo Starting Backend...
start cmd /k "cd backend && pip install -r requirements.txt && uvicorn main:app --reload"

echo Starting Frontend...
start cmd /k "cd frontend && npm install && npm run dev"

echo Both services have been started in new windows!
echo Make sure to check the windows for any errors during installation.
