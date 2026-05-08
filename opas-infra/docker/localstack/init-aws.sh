#!/bin/bash
# Creates the local S3 upload bucket in LocalStack
awslocal s3 mb s3://opas-uploads-dev --region eu-north-1
awslocal s3api put-bucket-lifecycle-configuration \
  --bucket opas-uploads-dev \
  --lifecycle-configuration '{
    "Rules": [{
      "ID": "delete-uploads-after-15min",
      "Status": "Enabled",
      "Expiration": { "Days": 1 },
      "Filter": { "Prefix": "" }
    }]
  }'
echo "LocalStack S3 bucket created: opas-uploads-dev"
