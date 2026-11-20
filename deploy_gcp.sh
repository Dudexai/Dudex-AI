#!/bin/bash
set -e

echo "===================================================="
echo "DudeX AI - Google Cloud Run One-Click Deployment"
echo "===================================================="

PROJECT_ID=$1
REGION=${2:-"us-central1"}

if [ -z "$PROJECT_ID" ]; then
    echo "[ERROR] Please provide your Google Cloud Project ID!"
    echo "Usage: ./deploy_gcp.sh YOUR_PROJECT_ID [REGION]"
    exit 1
fi

echo "[1/4] Setting active GCP project to: $PROJECT_ID ($REGION)..."
gcloud config set project "$PROJECT_ID"

echo "[2/4] Enabling required Google Cloud APIs..."
gcloud services enable run.googleapis.com artifactregistry.googleapis.com cloudbuild.googleapis.com

echo "[3/4] Building and deploying DudeX Backend to Cloud Run..."
gcloud run deploy dudex-backend \
    --source="./backend 1" \
    --region="$REGION" \
    --allow-unauthenticated \
    --port=8000

echo "[4/4] Building and deploying DudeX Frontend to Cloud Run..."
gcloud run deploy dudex-frontend \
    --source="./frontend 1" \
    --region="$REGION" \
    --allow-unauthenticated \
    --port=8080

echo "===================================================="
echo "SUCCESS: DudeX AI is live on Google Cloud!"
echo "===================================================="
