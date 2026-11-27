#!/bin/sh
# DR-01 §7 / §22: take a backup, restore it into a scratch database, and prove the copy matches.
# Usage: DATABASE_URL=postgresql://... SCRATCH_URL=postgresql://.../scratch sh scripts/backup_and_verify.sh
#   DATABASE_URL  database to back up (production: copy it from Vercel → Settings → Environment Variables)
#   SCRATCH_URL   an EMPTY database to test-restore into (e.g. a Neon branch). It is wiped. Never point it at production.
set -eu
: "${DATABASE_URL:?set DATABASE_URL}"; : "${SCRATCH_URL:?set SCRATCH_URL}"
[ "$DATABASE_URL" = "$SCRATCH_URL" ] && { echo "Refusing: SCRATCH_URL equals DATABASE_URL"; exit 1; }
STAMP=$(date -u +%Y%m%dT%H%M%SZ); OUT="backups/movematch-$STAMP.dump"; mkdir -p backups
echo "1/4 Backing up → $OUT"
pg_dump --format=custom --no-owner --no-privileges "$DATABASE_URL" -f "$OUT"
sha256sum "$OUT" > "$OUT.sha256"
echo "2/4 Restoring into scratch database"
psql "$SCRATCH_URL" -qc "DROP SCHEMA IF EXISTS public CASCADE; CREATE SCHEMA public;"
pg_restore --no-owner --no-privileges -d "$SCRATCH_URL" "$OUT"
echo "3/4 Comparing row counts table by table"
Q="SELECT string_agg(t || '=' || n, ' ' ORDER BY t) FROM (SELECT relname t, (xpath('/row/c/text()', query_to_xml('SELECT count(*) c FROM public.' || quote_ident(relname), false, true, '')))[1]::text n FROM pg_class WHERE relkind='r' AND relnamespace='public'::regnamespace) x"
A=$(psql "$DATABASE_URL" -Atc "$Q"); B=$(psql "$SCRATCH_URL" -Atc "$Q")
echo "   source : $A"; echo "   restore: $B"
[ "$A" = "$B" ] || { echo "MISMATCH — backup NOT verified"; exit 2; }
echo "4/4 Checking foreign keys"
psql "$SCRATCH_URL" -Atc "SELECT count(*) FROM pg_constraint WHERE contype='f' AND connamespace='public'::regnamespace" | sed 's/^/   foreign keys restored: /'
echo "OK — backup $OUT verified at $STAMP (sha256 in $OUT.sha256). Record this in docs/RUNBOOK.md §6 restore log."
