# MoveMatch operations runbook

Covers the parts of OPS-01, REL-01, SRE-01, MON-01 and ARCH-01 that apply to the platform **as it runs today**. Items that need infrastructure the project doesn't have yet are listed at the end, so nobody assumes they exist.

## 1. What is running
| Layer | Today | Where configured |
|---|---|---|
| Hosting, CDN, TLS | Vercel (project `moving-company`) | Vercel dashboard |
| Server logic | Vercel Edge middleware (`middleware.js` + `v1.js`) | repo |
| Database | Neon Postgres (free tier), reached over HTTPS | `DATABASE_URL` env var |
| Email | Resend — **not connected yet** | `RESEND_API_KEY`, `MAIL_FROM` |
| Payments | **Not connected** (feature flag `online_payments` off) | `STRIPE_SECRET_KEY` (future) |
| Maps | **Not connected** | `MAPS_API_KEY` (future) |
| Security headers | HSTS, CSP, X-Frame-Options, nosniff, Referrer/Permissions policy | `vercel.json` |

**Environment variables (secrets live only here):** `DATABASE_URL`, `ADMIN_PASSWORD`, optional `ADMIN_USERNAME`, `RESEND_API_KEY`, `MAIL_FROM`.

## 2. Health checks (SRE-01 §13)
| URL | Meaning | Healthy answer |
|---|---|---|
| `/api/v1/health/live` | The server code is running | `200`, `status: ok` |
| `/api/v1/health/ready` | It can reach the database | `200`, `status: ready` (`503` = database down) |
| `/api/v1/health/dependencies` | Which outside services are configured | `database: ok`; others `configured` / `not_configured` |
| `/api/health` | Legacy check incl. user count | `ok: true, database: connected` |

**Recommended free uptime monitor:** point UptimeRobot, Better Stack or similar at `/api/v1/health/ready` every 5 minutes and alert by email. This needs an account you create yourself.

## 3. Logs and tracing
- Every API response carries `x-request-id`. Unexpected server errors are logged as one JSON line (`level, service, request_id, route, method, error, duration_ms`) and visible in **Vercel → Project → Logs**. Search by request id.
- Errors shown to users never include SQL or stack traces, only a reference id.
- The business audit trail (signups, approvals, project, quote and booking events, emails) is in the `mm_audit` table and on `/super-admin/data/`.

## 4. Incident response (SRE-01 / REL-01)
| Severity | Example | First action |
|---|---|---|
| SEV-1 | Site or database down; data exposed | Check `/api/v1/health/ready`; if a deploy caused it → **roll back** (§5) |
| SEV-2 | Quotes or bookings failing | Check Vercel logs by `x-request-id`; turn off the feature via **feature flags** on `/super-admin/data/` |
| SEV-3 | One page broken | Fix forward in the next release |

After every SEV-1/2, write down what happened, how it was found, impact, fix and prevention in `docs/CHANGELOG.md` under the release that fixed it.

## 5. Releases and rollback (REL-01)
1. Run `sh tests/run_all.sh`. All suites must pass (API on real Postgres, browser flows, 360px overflow and JS-error sweep).
2. Bump `V` in `build.js` and add a `docs/CHANGELOG.md` entry (semantic version).
3. Deploy to Vercel project `moving-company`, then commit the same files to GitHub `main`.
4. **Smoke test live:** `/api/v1/health/ready`, home page, `/get-quotes/`, log in, `/app/`.
5. **Rollback:** Vercel → Deployments → previous "Ready" deployment → ⋯ → *Promote to Production*. Takes effect in seconds. Database changes are additive only, so an older deployment keeps working with the newer schema.

## 6. Backups and recovery
- **Neon free tier** keeps point-in-time history for a limited window (check your plan in the Neon console). To restore: Neon console → Branches → *Restore* to a timestamp, or create a branch at that time and point `DATABASE_URL` at it.
- **Manual export** before risky changes: Neon console → SQL editor, or `pg_dump "$DATABASE_URL" > backup.sql` from a machine with Postgres tools.
- **Verified backup drill (DR-01 §22):** `sh scripts/backup_and_verify.sh` (needs `DATABASE_URL` and an empty `SCRATCH_URL`, such as a Neon branch). It dumps the database, restores it into the scratch database, compares every table's row count and checks foreign keys. It refuses to run if both URLs are the same. Backups go to `backups/`, which is git-ignored and must never be committed.

**Restore log** (add a line after every drill):
| Date (UTC) | Source | Result | Tables | Rows matched | Duration | By |
|---|---|---|---|---|---|---|
| 2026-11-27 | Local test DB (Postgres 16) | ✅ verified | 21 | all | < 5 s | script |
| _pending_ | Production Neon | — | — | — | — | owner (needs your Neon access) |

- The RPO 15 min / RTO 4 h targets in the specs are **targets only**. They have not been tested here. A restore test should be done and recorded before public launch.

## 7. Run the tests locally
```sh
# one-time: local PostgreSQL 16 on a socket in /tmp/pg, port 5433
/usr/lib/postgresql/16/bin/initdb -D /tmp/pg/data -A trust
/usr/lib/postgresql/16/bin/pg_ctl -D /tmp/pg/data -o "-p 5433 -k /tmp/pg" -l /tmp/pg/log start
sh tests/run_all.sh
```
`tests/neon_shim.py` imitates Neon's HTTPS `/sql` endpoint on top of real Postgres, so the same middleware code that runs on Vercel is tested.

## 7b. Integrations (INTG-OPS-01)
Every outside service is listed in the **integration registry** (`mm_integrations`, shown on `/super-admin/data/` → Integrations) with its purpose, owner, fallback and secret name. *Check now* runs a free, read-only health check, and each result is stored in `mm_integration_events`. A service whose key isn't set shows **planned**, never a fake "active". Suspending an integration is recorded in the audit log.

| Provider | If it fails |
|---|---|
| Neon | Site shows errors on account pages; restore per §6 |
| Resend | Emails skipped and logged; password reset tells users to contact support |
| Stripe *(not built)* | Payment arranged directly with mover |
| Google Maps *(not built)* | 55-city distance estimate; manual address entry |
| Vercel | Promote previous deployment (§5) |

## 8. Not in place yet (needs accounts, money or a team)
Terraform/IaC, Docker/containers, separate staging environment with its own database, Redis/queues/workers, WebSockets, Sentry/Grafana/Prometheus/OpenTelemetry, WAF beyond Vercel's defaults, MFA for admin, row-level security in Postgres, 24/7 on-call, load testing at 1k–10k users, multi-region DR, Stripe payments and ledger, KYC, SMS/WhatsApp, eight separately deployed front-ends. Each is described in the specs. None should be claimed as live until it is.
