# IronHub local dev stack: PostgreSQL 16 + SeaweedFS S3 gateway in a single image.
# Local development only — credentials are intentionally static, never deploy this image.
FROM chrislusf/seaweedfs:3.80 AS seaweedfs

FROM postgres:16-alpine

COPY --from=seaweedfs /usr/bin/weed /usr/local/bin/weed

COPY s3-config.json /etc/seaweedfs/s3-config.json
COPY entrypoint.sh /usr/local/bin/dev-stack-entrypoint.sh
RUN chmod +x /usr/local/bin/dev-stack-entrypoint.sh && mkdir -p /data/seaweedfs

# 5432 = PostgreSQL, 8333 = S3 API
EXPOSE 5432 8333

ENTRYPOINT ["/usr/local/bin/dev-stack-entrypoint.sh"]
CMD ["postgres"]
