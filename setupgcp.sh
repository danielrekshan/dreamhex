#!/bin/bash

# FIX: Use the new single project name 'dreamhex'
PROJECT_ID="dreamhex"
REGION="us-central1"
# Ensure the bucket name uses the new project name suffix
BUCKET_NAME="dreamhex-assets-${PROJECT_ID}"

# 1. Config GCP
# Ensure this command is run to make the selected project active for all subsequent commands
# NOTE: You MUST first create the 'dreamhex' project in the GCP Console before running this.
gcloud config set project $PROJECT_ID

# 2. Enable APIs (Re-running this is harmless)
gcloud services enable run.googleapis.com \
    firestore.googleapis.com \
    storage.googleapis.com \
    artifactregistry.googleapis.com \
    cloudbuild.googleapis.com 
# Note: I added cloudbuild and artifactregistry enablement back for safety.

# 3. Deploy API (CPU Only - Free Tier Friendly)
# Note: Ensure you run `modal token create` locally and copy the Token ID and Secret 
# to the environment variables below so the API can talk to Modal.

gcloud run deploy dreamhex-api \
    --source ./api \
    --region $REGION \
    --allow-unauthenticated \
    --memory 1Gi \
    --set-env-vars GCS_BUCKET_NAME=$BUCKET_NAME,OPENAI_API_KEY="YOUR_OPENAI_KEY",MODAL_TOKEN_ID="YOUR_MODAL_ID",MODAL_TOKEN_SECRET="YOUR_MODAL_SECRET"