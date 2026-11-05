#!/usr/bin/env bash
# open the tunnel and drop into a small SQL prompt (scripts/pg-shell.cjs) in one command.
# no psql install needed; the tunnel closes on exit.
set -euo pipefail

HERE="$(cd "$(dirname "$0")" && pwd)"
source "$HERE/lib.sh"

require_ssh
read_credentials
TUN=""
trap '[ -n "${TUN:-}" ] && kill "$TUN" 2>/dev/null || true' EXIT
start_tunnel

export PG_LOCAL_PORT="$LOCAL_PORT" PG_DBNAME="$PG_DBNAME" PG_USER="$PG_USER" PG_PASSWORD="$PG_PASSWORD"
node "$HERE/pg-shell.cjs"
