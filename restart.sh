#!/usr/bin/env bash
# Restart the live Parker567 backend (pm2 parker-*) and show whether it came back.
#
#   ./restart.sh            restart the 7 backend processes (user, admin, casino, sports,
#                           sports-worker, user-worker, gateway)
#   ./restart.sh --pull     git pull + db:migrate first, then restart the backend
#   ./restart.sh --all      also build and restart the admin panel and owner panel
#   ./restart.sh --pull --all   the full deploy
#
# Migrations run BEFORE the restart, because new code may read a table the migration creates.
# A Next build is skipped (with a warning) while another build of the same app is running —
# two builds at once wipe each other's .next.
set -uo pipefail
# readlink: also works when called through the /usr/local/bin/parker-restart symlink.
cd "$(dirname "$(readlink -f "$0")")"

BACKEND=(parker-user-svc parker-admin-svc parker-casino-svc parker-sports-svc parker-sports-worker parker-user-worker parker-gateway)
PULL=0; ALL=0
for arg in "$@"; do
  case "$arg" in
    --pull) PULL=1 ;;
    --all) ALL=1 ;;
    *) echo "usage: ./restart.sh [--pull] [--all]" >&2; exit 2 ;;
  esac
done

if [ "$PULL" = 1 ]; then
  echo "== git pull"
  git pull --no-rebase --no-edit || { echo "git pull failed — fix it (conflict / local changes) and run again" >&2; exit 1; }
  echo "== db:migrate"
  (cd backend && npm run db:migrate 2>&1 | grep -oE '"msg":"(migrated:|Applied|No pending)[^"]*"') || { echo "migration failed — not restarting" >&2; exit 1; }
fi

APPS=("${BACKEND[@]}")
if [ "$ALL" = 1 ]; then
  for app in admin owner-panel; do
    if pgrep -f "$app/node_modules/.bin/next build" >/dev/null; then
      echo "== $app: another build is running, skipped" >&2
      continue
    fi
    echo "== build $app"
    if (cd "$app" && npm run build >/dev/null 2>&1) && [ -f "$app/.next/BUILD_ID" ]; then
      APPS+=("parker-$app")
    else
      echo "$app build FAILED — not restarting it (run: cd $app && npm run build)" >&2
    fi
  done
fi

echo "== restart ${#APPS[@]} process(es)"
pm2 restart "${APPS[@]}" --update-env >/dev/null && pm2 save >/dev/null
sleep 20

pm2 jlist | node -e '
const want = new Set(process.argv.slice(1));
let bad = 0;
for (const p of JSON.parse(require("fs").readFileSync(0))) {
  if (!p.name.startsWith("parker")) continue;
  const up = Math.round((Date.now() - p.pm2_env.pm_uptime) / 1000);
  const ok = p.pm2_env.status === "online";
  if (!ok) bad++;
  console.log(`${ok ? "OK  " : "DOWN"} ${p.name.padEnd(22)} ${p.pm2_env.status.padEnd(8)} up ${up}s${want.has(p.name) ? "  (restarted)" : ""}`);
}
process.exit(bad ? 1 : 0);
' "${APPS[@]}"
STATUS=$?

for url in https://api.parker567.com/health https://admin.parker567.com https://admin.parker567.com/owner/login; do
  echo "$(curl -s -o /dev/null -w '%{http_code}' -m 15 "$url")  $url"
done
exit $STATUS
