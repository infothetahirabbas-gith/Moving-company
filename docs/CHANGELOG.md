# Changelog

Semantic versioning (REL-01 §6.2). Asset version `V` in `build.js` changes with every release.

## 1.0.0 — 2026-11-27 (asset V13)
### Added
- **API v1** (`/api/v1`), the shared business API from API-01 and DB-01:
  - moving projects with addresses, inventory and status history;
  - provider organisations with separate verification checks (identity, business, operating authority, insurance) and admin review;
  - opportunities for verified providers, with no customer identity;
  - quotes with immutable versions and server-side pricing;
  - atomic, idempotent quote acceptance that creates a booking, with one active booking per project;
  - booking lifecycle (confirm, start, complete, cancel) with history;
  - feature flags and admin metrics;
  - health checks (live, ready, dependencies);
  - standard response envelope and `x-request-id`.
- **My moves workspace** (`/app/`) for customers and moving companies.
- **Admin marketplace panel** on `/super-admin/data/`: verification review, suspend/reinstate, projects, bookings, feature flags.
- **API reference** at `/developer/api-reference/` and `/openapi.json` (OpenAPI 3.1).
- Email via Resend: application received, approval/rejection, quote confirmation, password reset. Inactive until `RESEND_API_KEY` is set.
- Tools: savings calculator, furniture fit planner, insurance/valuation estimator, distance calculator; the route planner now calculates real distances.
- Homepage: US coverage map and moving-protection sections. Removed invented customer stories.
- Quote form: photo attachments and server-side duplicate protection.
- Directory filters: state, ZIP, verification checks, business type.
- Security headers in `vercel.json`.
- `AGENTS.md`, `docs/RUNBOOK.md`, CI workflow and test suites (66 API checks on real Postgres, 20 browser checks).

### Fixed
- Redirect loop on 6 pages after route aliases (/about, /contact, /get-quotes, …).
- Quote request rows could be cut off mid-JSON when very large (now rejected with a clear message).
- US map script error on the homepage.
