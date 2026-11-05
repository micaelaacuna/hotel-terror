#!/usr/bin/env bash
# run the local CAP server against the REAL BTP PostgreSQL over a cf ssh tunnel.
# why a tunnel: the trial plan has no public DB endpoint.
set -euo pipefail

HERE="$(cd "$(dirname "$0")" && pwd)"
source "$HERE/lib.sh"

require_ssh
read_credentials
TUN=""
trap '[ -n "${TUN:-}" ] && kill "$TUN" 2>/dev/null || true' EXIT
start_tunnel

# point the hybrid cds profile at the tunnel end; credentials stay in this process, never on disk.
export CDS_REQUIRES_DB_CREDENTIALS_HOST=127.0.0.1
export CDS_REQUIRES_DB_CREDENTIALS_PORT="$LOCAL_PORT"
export CDS_REQUIRES_DB_CREDENTIALS_DATABASE="$PG_DBNAME"
export CDS_REQUIRES_DB_CREDENTIALS_USER="$PG_USER"
export CDS_REQUIRES_DB_CREDENTIALS_PASSWORD="$PG_PASSWORD"
# ssl as a JSON string so the camelCase key survives; cert is for the real host, not localhost.
export CDS_REQUIRES_DB_CREDENTIALS_SSL='{"rejectUnauthorized":false}'

echo "Hybrid: local CAP -> real Postgres (localhost:${LOCAL_PORT}). Writes the SAME DB as the deployed app. Ctrl+C stops."
npx cds-tsx watch --profile hybrid
