#!/usr/bin/env bash
# open the ssh tunnel to the BTP PostgreSQL so a local client (psql / DBeaver) reaches it
# at localhost:LOCAL_PORT. the trial plan has no public DB endpoint, so the tunnel is the way in.
set -euo pipefail

HERE="$(cd "$(dirname "$0")" && pwd)"
source "$HERE/lib.sh"

require_ssh
read_credentials

echo "Tunnel localhost:${LOCAL_PORT} -> ${PG_HOST}:${PG_PORT} (via ${APP}). Leave open; Ctrl+C closes it."
echo "Connect your client: host=localhost port=${LOCAL_PORT} SSL mode=require."
echo "Read dbname/user/password with: cf service-key ${SERVICE} ${KEY}"

exec cf ssh -N -L "${LOCAL_PORT}:${PG_HOST}:${PG_PORT}" "$APP"
