# AGENTS.md — rules for anyone (human or AI) changing MoveMatch

Follows DEV-01. Read this before editing.

## How the code is laid out
| Path | What it is |
|---|---|
| `build.js` | Static site generator → `dist/` (all public pages). |
| `middleware.js` | Vercel Edge middleware: route aliases, dashboard protection, auth, legacy `/api/*`. |
| `v1.js` | `/api/v1` — the shared business API (projects, quotes, bookings, providers, admin). One authoritative record per business object. |
| `workspace.js` | `/app/` — customer and moving-company screens on top of `/api/v1`. |
| `live.js` | `/super-admin/data/` — admin review of accounts, providers, projects, bookings, flags. |
| `app.js`, `os.js`, `os-config.js`, `sa.js`, `style.css` | Front-end scripts, dashboards and styles. |
| `tests/` | Real-Postgres API tests and browser tests (see `docs/RUNBOOK.md`). |
| `docs/` | OpenAPI spec, runbook, release notes. |

## Non-negotiable rules
1. **Secrets only in Vercel environment variables** (`DATABASE_URL`, `ADMIN_PASSWORD`, `RESEND_API_KEY`, …). Never in code, tests or docs.
2. **Server decides.** Prices, totals, permissions and status changes are computed and enforced in `v1.js`. The browser is never trusted.
3. **One record, many views.** Dashboards read the same rows; never create per-dashboard copies of a project, quote or booking.
4. **Status changes go through the transition tables** (`PROJECT_FLOW`, `BOOKING_FLOW`) and write a history row and an audit entry.
5. **Accepted quote versions are immutable.** Revisions create a new version.
6. **Tenant isolation:** every query that returns a customer or company record filters by the signed-in owner. Answer `404` (not `403`) for other people's records.
7. **Never invent data.** No fake reviews, ratings, availability or "verified" badges. Sample data must be labelled.
8. **Every change ships with tests** in `tests/`, and `sh tests/run_all.sh` must pass before deploying.
9. **Schema changes** are additive (`CREATE … IF NOT EXISTS`, `ADD COLUMN IF NOT EXISTS`). No destructive migration without a backup and written approval.
10. **Money** is `NUMERIC(19,4)` in the database and integer cents in code. Never floats.

## API conventions (API-01)
- Base path `/api/v1`. Lower-case plural resources. JSON only.
- Success: `{ success: true, data, meta: { request_id, timestamp } }`.
- Error: `{ success: false, error: { code, message, details[] }, meta }`. Never return stack traces or SQL.
- `Idempotency-Key` header is honoured on quote acceptance. Reusing a key with a different body is `422`.
- Every response carries `x-request-id`; quote it in bug reports.

## Commit messages
`feat:`, `fix:`, `security:`, `test:`, `docs:`, `refactor:`, `perf:`. Add an entry to `docs/CHANGELOG.md` for anything user-visible.
