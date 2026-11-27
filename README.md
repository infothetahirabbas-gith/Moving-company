# MoveMatch

US moving marketplace: **https://movematchs.vercel.app**

| What | Where |
|---|---|
| Public site (172 pages) | `build.js` → `dist/` (static, Vercel CDN) |
| Server: auth, approvals, dashboards protection, API | `middleware.js` (Vercel Edge) |
| Business API `/api/v1` (projects, quotes, bookings, providers, admin, integrations) | `v1.js`, spec in `docs/openapi.json`, reference at `/developer/api-reference/` |
| Customer & moving-company workspace | `/app/` → `workspace.js` |
| Admin (accounts, verification, projects, bookings, flags, integrations) | `/super-admin/data/` → `live.js` |
| Database | Neon Postgres (`DATABASE_URL`) |

**Start here:** `AGENTS.md` (rules for changing the code) · `docs/RUNBOOK.md` (operations, release, rollback, backups) · `TRACKER.md` (what is built vs not, per spec document) · `docs/TRACEABILITY.md` (requirement → code → test) · `docs/CHANGELOG.md`.

**Tests:** `sh tests/run_all.sh`. It runs the API suite on a real PostgreSQL, the traceability check and the browser journey. CI runs the same on every push (`.github/workflows/ci.yml`).

Secrets live only in Vercel environment variables. Never commit them.
