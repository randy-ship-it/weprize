#!/usr/bin/env bash
# WePrize Autoscale: Express serves dist/ SPA + /api (Stripe webhook, orders, identity, jobs).
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"
PORT="${PORT:-5000}"

if [[ ! -d dist ]] || [[ ! -f dist/index.html ]]; then
  echo "[start] dist/ missing — running npm run build"
  npm run build
fi

exec node server/index.js
