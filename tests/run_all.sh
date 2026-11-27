#!/bin/sh
# Full local test suite. Needs PostgreSQL on /tmp/pg:5433 (see docs/RUNBOOK.md → "Run the tests").
set -e
cd "$(dirname "$0")/.."
node build.js
pkill -f neon_shim.py 2>/dev/null || true
python3 tests/neon_shim.py 8799 & sleep 1
psql -h /tmp/pg -p 5433 -U postgres -qc "DROP SCHEMA public CASCADE; CREATE SCHEMA public;" 2>/dev/null
node tests/v1_e2e.mjs
sh tests/run_ui.sh
