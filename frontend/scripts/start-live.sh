#!/bin/sh
# pm2's parker-frontend. `next build` wipes and rewrites .next while it runs, so serving .next directly
# gave visitors "This page couldn't load" (chunks 500) during every build until the restart. Live
# serves .next-live instead: a copy of the last FINISHED build (BUILD_ID is written at the end),
# taken here at (re)start. A build alone never touches the running site.
set -e
cd "$(dirname "$0")/.."
if [ -f .next/BUILD_ID ] && ! cmp -s .next/BUILD_ID .next-live/BUILD_ID; then
  rm -rf .next-live.new
  cp -r .next .next-live.new
  rm -rf .next-live.new/cache
  rm -rf .next-live
  mv .next-live.new .next-live
fi
NEXT_DIST_DIR=.next-live exec node node_modules/next/dist/bin/next "$@"
