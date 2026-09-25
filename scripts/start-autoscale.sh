#!/usr/bin/env bash
set -euo pipefail
PORT="${PORT:-5000}"
exec ./node_modules/.bin/serve -s dist -l "tcp://0.0.0.0:${PORT}"
