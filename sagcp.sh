# 1. Define Variables
export PROJECT_ID="dreamhex"
# Define the custom variable based on the Project ID


export PROJECT_ID="dreamhex"
export OPENAI_API_KEY="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"
export MODAL_TOKEN_ID="ak-4fdJxeFqQ8VvFx4xjP2gSD"
export MODAL_TOKEN_SECRET="as-gh1o1Fm7dWrhHNSKoSqKTV"
export REGION="us-central1"
export DREAMHEX_PROJECT_ID=$PROJECT_ID
export BUCKET_NAME="dreamhex-assets-dreamhex"


# 2. Execute Deployment (Ensure all variables are passed)
gcloud run deploy dreamhex-api \
    --source ./api \
    --region us-central1 \
    --allow-unauthenticated \
    --memory 1Gi \
    --set-env-vars GCS_BUCKET_NAME=$BUCKET_NAME,OPENAI_API_KEY=$OPENAI_API_KEY,MODAL_TOKEN_ID=$MODAL_TOKEN_ID,MODAL_TOKEN_SECRET=$MODAL_TOKEN_SECRET,GCP_PROJECT=$DREAMHEX_PROJECT_ID
