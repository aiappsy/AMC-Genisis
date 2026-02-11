# DGBP - Digital Business Genesis Platform

## Environment Configuration
Set these variables in your Cloud Run service or `.env`:
- `API_KEY`: Your Google AI Studio key (Required for Gemini SDK).
- `GOOGLE_CLIENT_ID`: Your Google OAuth Client ID.
- `GOOGLE_CLOUD_PROJECT`: Your GCP Project ID.
- `GCS_BUCKET_NAME`: Dedicated bucket for versioned assets.

## Required IAM Roles
The service account running the backend (e.g., Cloud Run default) needs:
- **Storage Object Admin**: `roles/storage.objectAdmin`
- **Datastore User**: `roles/datastore.user`
- **Cloud Build Editor**: `roles/cloudbuild.builds.editor`
- **Cloud Run Admin**: `roles/run.admin`
- **Artifact Registry Admin**: `roles/artifactregistry.admin`
- **Service Account User**: `roles/iam.serviceAccountUser`

## Infrastructure Setup
```bash
# 1. Create the Genesis Storage Bucket
gsutil mb -p $PROJECT_ID -l us-central1 gs://$GCS_BUCKET_NAME

# 2. Enable APIs
gcloud services enable \
    artifactregistry.googleapis.com \
    cloudbuild.googleapis.com \
    run.googleapis.com
```

## Local Development
1. `npm install`
2. `npm run build`
3. `API_KEY=xxx GOOGLE_CLIENT_ID=xxx GOOGLE_CLOUD_PROJECT=xxx GCS_BUCKET_NAME=xxx node server.js`
