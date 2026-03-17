@echo off
echo Starting Backend...
start cmd /k "cd backend && call venv\Scripts\activate.bat && uvicorn main:app --reload"

echo Starting Frontend...
start cmd /k "cd frontend && npm run dev"

echo Both services have been started in separate windows!
