#!/usr/bin/env bash
# Run the Hash Game Exchange stack: backend (gateway :4700 + 6 processes), site admin :3080,
# owner panel :3085, frontend :5190.
#   ./run.sh [start]      ./run.sh stop      ./run.sh restart      ./run.sh status      ./run.sh logs <name>
# See scripts/dev.mjs. First time: npm ci in backend admin owner-panel frontend, then node scripts/make-env.mjs.
set -euo pipefail
cd "$(dirname "$0")"
exec node scripts/dev.mjs "${@:-start}"
