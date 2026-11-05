# shared helpers for the tunnel scripts (db:tunnel, db:shell, hybrid). sourced, not run.
# no cd here on purpose: hybrid's `npx cds-tsx` must run from the project root.

APP=hotel-terror-srv
SERVICE=hotel-terror-db
KEY=hotel-terror-db-key
LOCAL_PORT=63306

# ssh must be enabled on the app for the tunnel to work. enabling it restarts the app,
# so we don't do it silently: print the command and let the user run it once.
require_ssh() {
  cf ssh-enabled "$APP" 2>/dev/null | grep -q "is enabled" && return 0
  echo "SSH is not enabled on $APP. Run this once, then retry:"
  echo "  cf enable-ssh $APP && cf restart $APP"
  exit 1
}

# read host/port and credentials from a one-off service key in a single node call.
# nothing is written to disk; the values live only in this process.
read_credentials() {
  cf service-key "$SERVICE" "$KEY" >/dev/null 2>&1 || cf create-service-key "$SERVICE" "$KEY"
  local creds
  creds="$(cf service-key "$SERVICE" "$KEY" | node -e '
    let s="";process.stdin.on("data",d=>s+=d).on("end",()=>{
      const c=JSON.parse(s.slice(s.indexOf("{")));const r=c.credentials||c;
      process.stdout.write([r.hostname,r.port,r.dbname,r.username,r.password].join("\t"));
    });')"
  IFS=$'\t' read -r PG_HOST PG_PORT PG_DBNAME PG_USER PG_PASSWORD <<<"$creds"
  [ -n "$PG_HOST" ] && [ -n "$PG_PORT" ] || { echo "Could not read host/port from the service key."; exit 1; }
}

port_ready() { nc -z localhost "$LOCAL_PORT" >/dev/null 2>&1; }

wait_for_port() {
  for _ in $(seq 1 30); do
    port_ready && return 0
    sleep 1
  done
  echo "Tunnel never bound on localhost:${LOCAL_PORT}."
  exit 1
}

# reuse a tunnel already up (e.g. from db:tunnel) or open our own. callers trap on TUN,
# which stays empty when we reuse, so a borrowed tunnel is never torn down.
start_tunnel() {
  if port_ready; then
    echo "Reusing the tunnel already on localhost:${LOCAL_PORT}."
    return 0
  fi
  echo "Opening tunnel localhost:${LOCAL_PORT} -> ${PG_HOST}:${PG_PORT} (via ${APP})..."
  cf ssh -N -L "${LOCAL_PORT}:${PG_HOST}:${PG_PORT}" "$APP" &
  TUN=$!
  wait_for_port
}
