#!/usr/bin/env bash
# Run the Parker567 apps on this Mac against the LIVE backend.
#
# The backend runs on the server now (backend work happens there):
#   API          https://api.parker567.com
#   Admin        https://admin.parker567.com
#   Owner panel  https://admin.parker567.com/owner   (the live backend pulls entitlements and
#                branding from THIS one; it runs on the server, use it for live changes)
# This starts the frontend and the site admin here, both talking to the live API, with no local
# backend:
#   frontend     http://localhost:5190
#   site admin   http://localhost:3080
# The live API already allows these localhost origins (CORS).
#
# No owner panel is started against the live API: the live backend only trusts the server's own
# owner key, so a panel on this Mac gets "Bad owner key" there. The local owner panel
# (./run.sh, http://localhost:3085) stays on the local backend.
#
#   ./live.sh                 start (or restart) both, print the URLs
#   ./live.sh frontend        only the frontend (or: site-admin)
#   ./live.sh stop            stop both
#   ./live.sh logs <name>     follow one log (frontend | site-admin)
#   API_BASE=<url> ./live.sh  point at another backend for one run
set -euo pipefail
cd "$(dirname "$0")"

API_BASE="${API_BASE:-https://api.parker567.com}"
ADMIN_LIVE="https://admin.parker567.com"
APPS=(frontend site-admin)

# scripts/dev.mjs starts each app with this environment, and the environment wins over each
# app's .env.local, so the live API is set here rather than in those files.
export NEXT_PUBLIC_API_BASE="$API_BASE" VITE_API_BASE="$API_BASE" GATEWAY_URL="$API_BASE"   # frontend
export API_URL="$API_BASE"                                                                  # site admin

cmd="${1:-start}"
case "$cmd" in
  stop)
    node scripts/dev.mjs stop "${APPS[@]}"
    ;;
  logs)
    node scripts/dev.mjs logs "${2:?usage: ./live.sh logs frontend|site-admin}"
    ;;
  start|restart|frontend|site-admin)
    if [ "$cmd" = start ] || [ "$cmd" = restart ]; then names=("${APPS[@]}"); else names=("$@"); fi
    if ! curl -fsS -m 15 "$API_BASE/health" >/dev/null; then
      echo "warning: $API_BASE/health did not answer 200; starting anyway" >&2
    fi
    node scripts/dev.mjs restart "${names[@]}" >/dev/null
    echo "API          $API_BASE"
    echo "Frontend     http://localhost:5190"
    echo "Site admin   http://localhost:3080   (live copy: $ADMIN_LIVE)"
    echo "Owner panel  https://admin.parker567.com/owner   (live; the local one is on ./run.sh)"
    echo "Logs: ./live.sh logs <name>    Stop: ./live.sh stop"
    ;;
  *)
    echo "usage: ./live.sh [start|stop|logs <name>|frontend|site-admin …]" >&2
    exit 2
    ;;
esac
