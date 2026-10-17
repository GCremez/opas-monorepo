#!/bin/bash
# Creates the local S3 upload bucket in LocalStack. The name must match S3_BUCKET_NAME
# (opas-app-bucket in .env.example and the backend default).
awslocal s3 mb s3://opas-app-bucket --region eu-north-1
awslocal s3api put-bucket-lifecycle-configuration \
  --bucket opas-app-bucket \
  --lifecycle-configuration '{
    "Rules": [{
      "ID": "delete-uploads-after-1-day",
      "Status": "Enabled",
      "Expiration": { "Days": 1 },
      "Filter": { "Prefix": "" }
    }]
  }'
echo "LocalStack S3 bucket created: opas-app-bucket"
