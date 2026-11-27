#!/bin/sh
# Reset local DB, start dev server, run browser E2E.
psql -h /tmp/pg -p 5433 -U postgres -qc "DROP SCHEMA public CASCADE; CREATE SCHEMA public;"
pkill -f devserver.mjs; node "$(dirname "$0")/devserver.mjs" >/tmp/dev.log 2>&1 & sleep 2
python3 "$(dirname "$0")/ui_e2e.py"
