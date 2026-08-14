#!/bin/sh
# Starts SeaweedFS (S3 gateway) in the background, ensures the dev bucket
# exists, then hands PID 1 to the official postgres entrypoint.
set -e

S3_BUCKET="${S3_BUCKET:-ironhub}"

weed server \
  -dir=/data/seaweedfs \
  -master.volumeSizeLimitMB=64 \
  -volume.max=8 \
  -s3 \
  -s3.port=8333 \
  -s3.config=/etc/seaweedfs/s3-config.json \
  -s3.allowEmptyFolder=true \
  >/var/log/seaweedfs.log 2>&1 &

# Create the bucket once the S3/filer stack is up (idempotent, best-effort).
(
  i=0
  while [ "$i" -lt 60 ]; do
    if echo "s3.bucket.list" | weed shell 2>/dev/null | grep -q "^${S3_BUCKET}\b"; then
      echo "dev-stack: S3 bucket '${S3_BUCKET}' ready"
      exit 0
    fi
    echo "s3.bucket.create -name ${S3_BUCKET}" | weed shell >/dev/null 2>&1 || true
    i=$((i + 1))
    sleep 1
  done
  echo "dev-stack: WARNING — could not confirm S3 bucket '${S3_BUCKET}'" >&2
) &

exec docker-entrypoint.sh "$@"
