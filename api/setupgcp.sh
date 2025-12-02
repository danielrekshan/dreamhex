#!/bin/bash

# CONFIG
PROJECT_ID="dreamhex-prototype"
REGION="us-central1"
BUCKET_NAME="dreamhex-assets-${PROJECT_ID}"

# 1. Login & Set Project
gcloud auth login
gcloud config set project $PROJECT_ID

# 2. Enable APIs
gcloud services enable run.googleapis.com \
    firestore.googleapis.com \
    storage.googleapis.com \
    artifactregistry.googleapis.com

# 3. Create Storage Bucket (Public Read)
gcloud storage buckets create gs://$BUCKET_NAME --location=$REGION
gcloud storage buckets add-iam-policy-binding gs://$BUCKET_NAME \
    --member=allUsers --role=roles/storage.objectViewer

# 4. Create Firestore (Native Mode)
gcloud firestore databases create --location=$REGION

# 5. Deploy to Cloud Run (GPU)
# Note: You must have Quota for NVIDIA L4. If not, remove --gpu flag for CPU-only testing.
gcloud run deploy dreamhex-api \
    --source ./api \
    --region $REGION \
    --allow-unauthenticated \
    --set-env-vars GCS_BUCKET_NAME=$BUCKET_NAME,OPENAI_API_KEY="YOUR_KEY_HERE" \
    --gpu 1 \
    --gpu-type nvidia-l4 \
    --memory 16Gi