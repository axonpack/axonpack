#!/bin/sh
# start | stop | reset for the local S3 in compose.yaml. Needs Docker (Docker Desktop, OrbStack,
# or the Docker engine on Linux); Podman's Docker socket works too.
set -eu
cd "$(dirname "$0")"

# --env-file feeds the ${...} values in compose.yaml from the same file the containers read.
if docker compose version >/dev/null 2>&1; then compose="docker compose --env-file local-s3.env"
elif command -v docker-compose >/dev/null 2>&1; then compose="docker-compose --env-file local-s3.env"
else echo "Docker Compose not found. Install Docker Desktop or OrbStack (macOS) or the Docker engine (Linux)." >&2; exit 1
fi

LOCAL_S3_UID="$(id -u)"
export LOCAL_S3_UID

case "${1:-start}" in
  start)
    mkdir -p data
    $compose up -d --wait minio
    $compose run --rm init
    ;;
  stop) $compose down ;;
  reset)
    $compose down
    rm -rf data
    ;;
  *) echo "usage: run.sh start|stop|reset" >&2; exit 1 ;;
esac
