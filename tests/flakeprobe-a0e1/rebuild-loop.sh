#!/usr/bin/env bash
# Simulates ANOTHER agent rebuilding dist/ while a suite is mid-run.
# Usage: rebuild-loop.sh <seconds>
set -u
end=$(( $(date +%s) + ${1:-30} ))
n=0
while [ "$(date +%s)" -lt "$end" ]; do
  n=$((n + 1))
  # Faithful to what another agent's `npm run build` / `npm run test:users`
  # does: vite empties dist/ before refilling it, then prerender rewrites the
  # route shells. The emptying is the damaging moment.
  npx vite build --mode test > /dev/null 2>&1
  node scripts/prerender.mjs > /dev/null 2>&1
  echo "rebuild $n done at $(date +%T)"
  sleep 1
done
echo "rebuild loop finished after $n builds"
