#!/usr/bin/env bash
# drop the app's Postgres tables/views via a one-off cf task so the next deploy recreates
# the schema fresh. DESTRUCTIVE: trial data only. base64 because cf run-task takes one
# command string and the container has no psql.
set -euo pipefail

APP=hotel-terror-srv
TASK=dbreset
HERE="$(cd "$(dirname "$0")" && pwd)"

echo "This DROPS every app table and view in the bound PostgreSQL (all data lost)."
read -r -p "Type 'reset' to continue: " CONFIRM
[ "$CONFIRM" = "reset" ] || { echo "Aborted."; exit 1; }

B="$(base64 -w0 "$HERE/db-reset.cjs")"
cf run-task "$APP" --name "$TASK" --command "echo $B | base64 -d | node"

echo "Check: cf logs $APP --recent | grep RESET"
