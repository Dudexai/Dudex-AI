@echo off
echo ====================================================
echo DudeX AI - Google Cloud Run One-Click Deployment
echo ====================================================

set PROJECT_ID=%1
if "%PROJECT_ID%"=="" (
    echo [ERROR] Please provide your Google Cloud Project ID!
    echo Usage: deploy_gcp.bat YOUR_PROJECT_ID [REGION]
    echo Example: deploy_gcp.bat my-dudex-project us-central1
    exit /b 1
)

set REGION=%2
if "%REGION%"=="" set REGION=us-central1

echo [1/4] Setting active GCP project to: %PROJECT_ID% (Region: %REGION%)
gcloud config set project %PROJECT_ID%

echo [2/4] Enabling required Google Cloud APIs...
gcloud services enable run.googleapis.com artifactregistry.googleapis.com cloudbuild.googleapis.com

echo [3/4] Building and deploying DudeX Backend to Cloud Run...
gcloud run deploy dudex-backend ^
    --source="./backend 1" ^
    --region=%REGION% ^
    --allow-unauthenticated ^
    --port=8000

echo [4/4] Building and deploying DudeX Frontend to Cloud Run...
gcloud run deploy dudex-frontend ^
    --source="./frontend 1" ^
    --region=%REGION% ^
    --allow-unauthenticated ^
    --port=8080

echo ====================================================
echo SUCCESS: DudeX AI is now running on Google Cloud!
echo ====================================================
