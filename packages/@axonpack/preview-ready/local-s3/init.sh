#!/bin/sh
# Creates the two buckets and the read-only key. Safe to run again: every step leaves what is
# already there alone. Needs `mc` and the values from local-s3.env in the environment.
set -eu

export MC_HOST_local="http://$MINIO_ROOT_USER:$MINIO_ROOT_PASSWORD@${LOCAL_S3_URL#http://}"

mc mb --ignore-existing --region "$LOCAL_S3_REGION" "local/$LOCAL_S3_PUBLIC_BUCKET" "local/$LOCAL_S3_PRIVATE_BUCKET"
mc anonymous set download "local/$LOCAL_S3_PUBLIC_BUCKET"
mc anonymous set none "local/$LOCAL_S3_PRIVATE_BUCKET"

policy="${TMPDIR:-/tmp}/preview-ready-reader.json"
cat > "$policy" <<JSON
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": ["s3:GetObject", "s3:ListBucket"],
      "Resource": [
        "arn:aws:s3:::$LOCAL_S3_PRIVATE_BUCKET",
        "arn:aws:s3:::$LOCAL_S3_PRIVATE_BUCKET/*"
      ]
    }
  ]
}
JSON
mc admin policy create local preview-ready-reader "$policy"
rm -f "$policy"

mc admin user add local "$LOCAL_S3_READ_KEY" "$LOCAL_S3_READ_SECRET"
# Attaching a policy the user already has is an error in mc, so only attach when it is missing.
if ! mc admin user info local "$LOCAL_S3_READ_KEY" | grep -q '^PolicyName:.*preview-ready-reader'; then
  mc admin policy attach local preview-ready-reader --user "$LOCAL_S3_READ_KEY"
fi

echo "Local S3 ready on $LOCAL_S3_URL: $LOCAL_S3_PUBLIC_BUCKET (public read), $LOCAL_S3_PRIVATE_BUCKET (read key $LOCAL_S3_READ_KEY)"
