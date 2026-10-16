#!/usr/bin/env bash
# Run the Parker567 apps on this Mac against the LIVE backend.
#
# The backend runs on the server now (backend work happens there):
#   API    https://api.parker567.com
#   Admin  https://admin.parker567.com
# This starts the three web apps here, all talking to the live API, with no local backend:
#   frontend     http://localhost:5190
#   site admin   http://localhost:3080
#   owner panel  http://localhost:3085
# The live API already allows these localhost origins (CORS).
#
# The owner panel here is NOT the one the live backend pulls entitlements and branding from:
# that one runs on the server. Saving here changes only this Mac's owner-panel/data.
#
#   ./live.sh                 start (or restart) all three, print the URLs
#   ./live.sh frontend        only the frontend (also: site-admin, owner-panel; several allowed)
#   ./live.sh stop            stop all three
#   ./live.sh logs <name>     follow one log (frontend | site-admin | owner-panel)
#   API_BASE=<url> ./live.sh  point at another backend for one run
set -euo pipefail
cd "$(dirname "$0")"

API_BASE="${API_BASE:-https://api.parker567.com}"
ADMIN_LIVE="https://admin.parker567.com"
APPS=(frontend site-admin owner-panel)

# scripts/dev.mjs starts each app with this environment, and the environment wins over each
# app's .env.local, so the live API is set here rather than in those files.
export NEXT_PUBLIC_API_BASE="$API_BASE" VITE_API_BASE="$API_BASE" GATEWAY_URL="$API_BASE"   # frontend
export API_URL="$API_BASE"                                                                  # site admin
export SITE_GATEWAY_URL="$API_BASE" SITE_ADMIN_URL="http://localhost:3080" SITE_FRONTEND_URL="http://localhost:5190"  # owner panel

cmd="${1:-start}"
case "$cmd" in
  stop)
    node scripts/dev.mjs stop "${APPS[@]}"
    ;;
  logs)
    node scripts/dev.mjs logs "${2:?usage: ./live.sh logs frontend|site-admin|owner-panel}"
    ;;
  start|restart|frontend|site-admin|owner-panel)
    if [ "$cmd" = start ] || [ "$cmd" = restart ]; then names=("${APPS[@]}"); else names=("$@"); fi
    if ! curl -fsS -m 15 "$API_BASE/health" >/dev/null; then
      echo "warning: $API_BASE/health did not answer 200; starting anyway" >&2
    fi
    node scripts/dev.mjs restart "${names[@]}" >/dev/null
    echo "API          $API_BASE"
    echo "Frontend     http://localhost:5190"
    echo "Site admin   http://localhost:3080   (live copy: $ADMIN_LIVE)"
    echo "Owner panel  http://localhost:3085"
    echo "Logs: ./live.sh logs <name>    Stop: ./live.sh stop"
    ;;
  *)
    echo "usage: ./live.sh [start|stop|logs <name>|frontend|site-admin|owner-panel …]" >&2
    exit 2
    ;;
esac
