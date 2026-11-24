#!/usr/bin/env bash
# Starts (or restarts) a copy of frontend/ on :5195 whose API is the LOCAL backend gateway (:4700),
# through the same-origin proxy (frontend/proxy.js), so a QA player can be signed up and signed-in
# screens tested without touching the live site.
#
#   .claude/skills/signed-in-qa/scripts/qa-frontend.sh          # sync src and (re)start
#   .claude/skills/signed-in-qa/scripts/qa-frontend.sh sync     # only re-sync src (HMR picks it up)
#   .claude/skills/signed-in-qa/scripts/qa-frontend.sh stop
#
# The copy lives in $QA_DIR (default: /tmp/parker-qa-frontend). node_modules is an APFS clone
# (`cp -c`), not a symlink: Turbopack refuses a node_modules symlink that leaves the project root.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/../../../.." && pwd)"
QA_DIR="${QA_DIR:-/tmp/parker-qa-frontend}"
PORT="${QA_PORT:-5195}"
LOG="$QA_DIR.log"

stop() { pkill -f "next dev --port $PORT" 2>/dev/null || true; }
sync() { rsync -a --exclude node_modules --exclude .next --exclude '.env*' "$ROOT/frontend/" "$QA_DIR/"; }

case "${1:-start}" in
  stop) stop; echo "stopped :$PORT"; exit 0 ;;
  sync) sync; echo "synced $QA_DIR"; exit 0 ;;
esac

curl -sf -m 5 http://localhost:4700/health >/dev/null || { echo "local gateway :4700 is down — start it: ./run.sh" >&2; exit 1; }
stop
mkdir -p "$QA_DIR"
sync
[ -d "$QA_DIR/node_modules" ] || cp -cR "$ROOT/frontend/node_modules" "$QA_DIR/node_modules"
rm -rf "$QA_DIR/.next"
( cd "$QA_DIR" && NEXT_PUBLIC_USE_FIXTURES=false API_PROXY_TARGET=http://localhost:4700 nohup npx next dev --port "$PORT" >"$LOG" 2>&1 </dev/null & )
for _ in $(seq 1 60); do
  sleep 3
  if curl -sf -m 60 -o /dev/null "http://localhost:$PORT/"; then echo "QA frontend: http://localhost:$PORT (API → local :4700), log $LOG"; exit 0; fi
done
echo "did not come up — see $LOG" >&2; exit 1
