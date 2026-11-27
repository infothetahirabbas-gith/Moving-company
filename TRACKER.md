# MoveMatch — Master Implementation Tracker (MM-ULTIMATE-MASTER-001 / FE-ARCH-01)

| Stage | Name | Status | Notes |
|---|---|---|---|
| 01 | Codebase audit | Done | 225 spec routes audited: 7 existed at the exact URL, 215 had equivalent content at a different URL, 3 were genuinely missing (About, Reviews, Forgot password). |
| 02 | Architecture mapping | Done | Static generator (build.js) + Vercel Edge middleware (auth, API, routing) + Neon Postgres. Spec route → existing page map lives in middleware.js (ALIASES). |
| 03 | Design system | Existing | Navy/teal/amber tokens, Manrope/Inter, cards, forms in style.css. |
| 04 | Navigation & routes | Done | All 225 FE-ARCH-01 routes resolve (308 redirect to the matching page or dashboard module). Old URLs keep working. |
| 05 | Homepage | Done | All 17 sections present. Added US coverage map (14) and Moving protection (15). Removed the illustrative 5-star stories — no reviews are shown until real ones exist. |
| 06 | Quote journey | Done* | 10 steps, progress, validation, save & resume, consent, photo attachments (resized on device, max 3), server-side duplicate protection (same email/route/date within 24h returns the existing reference), size limit. *Street-address autocomplete needs a maps API key. |
| 07 | Marketplace | Done* | Directory filters: move type, search, state, ZIP, verification checks, business type; sorting. Rating/price/response-time sorts shown disabled until real data exists. *Only labelled sample providers until companies are approved. |
| 08 | Customer tools | Done | All 14 spec tools live. New: Savings Calculator, Furniture Measurement Planner, Insurance & Valuation Estimator, Distance Calculator; Route Planner now calculates real distance/time for 55 cities. Save on device + download results. |
| 09 | Customer experience | Partial | Dashboard saves to the account. Booking, payments, messaging need Stripe and email. |
| 10 | Data integration | Partial | Accounts, quotes, dashboard state and audit are in Postgres. Geographic data (ZIP/city) dataset not yet loaded. |
| 11 | SEO & resources | Partial | Sitemap, robots, canonical, schema exist; state/city page templates pending real data. |
| 12 | Visual enhancement | Partial | |
| 13 | Performance | Partial | Hero preload, lazy images; Lighthouse run pending. |
| 14 | Security & accessibility | Done | Security headers (HSTS, CSP, X-Frame-Options, nosniff, Referrer & Permissions policy). Admin + account auth, approval workflow, PBKDF2 passwords, signed sessions, origin checks, rate limits. |
| 15 | Complete QA | Done (this round) | 169 pages: 0 JS errors, 0 mobile overflow; link check, 360px overflow on all pages, 93 dashboard modules, 28 business-rule tests, API tests. |
| 16 | Production deployment | Ongoing | movematchs.vercel.app |

## External dependencies (cannot be built without accounts the owner creates)
Stripe (payments), Resend or similar (emails / password reset), Google Maps or similar (address autocomplete, distances), telematics provider (GPS), licensed US geographic dataset.

## Architecture documents — implementation status (27 Nov 2026)
Legend: **Live** = built, tested, deployed · **Partial** = core built, rest listed · **Needs** = requires an account, paid service or team that doesn't exist yet.

| Doc | Status | What is live | What is not |
|---|---|---|---|
| TAD-01 | Partial | One shared backend (`middleware.js` + `v1.js`) serving all dashboards; one Postgres | NestJS/Next.js monorepo (stack runs on Vercel Edge + static site instead) |
| ERD-01 / DB-01 | Partial | Users, orgs, providers, verifications, projects, addresses, inventory, status history, quotes, quote versions/items, bookings, booking history, idempotency, feature flags, audit; FKs, CHECKs, unique and partial-unique indexes, NUMERIC(19,4) money | Finance ledger, payments, crew/fleet, storage, enterprise, claims, messaging, developer apps tables; schemas-per-domain; RLS |
| API-01 | Partial | 35 `/api/v1` operations, standard envelope, request ids, error codes, idempotency, rate limits, OpenAPI 3.1 at `/openapi.json` | Remaining domains (~350 endpoints), cursor pagination, OAuth, webhooks |
| BRS-01 | Partial | Project/quote/booking state machines, verification gate, server pricing, immutable accepted terms, one active booking per project, data minimisation | Payments, commissions, refunds, cancellation fees, enterprise approvals |
| SEC-01 | Partial | PBKDF2 passwords, signed sessions, admin HMAC, approval workflow, tenant isolation (404 for others' records), origin checks, rate limits, CSP/HSTS headers, audit log, secrets only in env | MFA, RBAC/ABAC tables, RLS, WAF rules, pen-test, KYC |
| INT-01 / INTG-OPS-01 | Partial | Resend adapter (off until key added); dependency status endpoint | Stripe, Maps, SMS, KYC, accounting, CRM |
| OPS-01 / ARCH-01 / INF-01 | Partial | Vercel hosting + CDN + TLS, Neon Postgres, GitHub, CI workflow | AWS/Terraform/Docker/Redis/queues, staging environment |
| QA-01 | Live (for built scope) | 66 API checks on real Postgres, 20 browser checks, 172-page JS-error + 360px sweep, CI on every push | Load tests, security scans, UAT |
| DEV-01 | Live | `AGENTS.md` rules, commit convention, tests required | Monorepo/TypeScript |
| REL-01 | Partial | Semantic versions + `docs/CHANGELOG.md`, release + rollback steps, feature flags | Staging, canary/blue-green |
| SRE-01 / MON-01 | Partial | `/api/v1/health/live|ready|dependencies`, structured error logs with request ids, runbook, incident levels | External uptime monitor (needs your account), Sentry/Grafana, SLO dashboards, on-call |
| INTG-OPS-01 | Partial | Integration registry (5 providers: owner, fallback, secret name, status), free health checks, event history, suspend/activate, admin panel | Vendor contracts/costs, webhook gateway, queues, circuit breakers (no queue infrastructure yet) |
| DR-01 | Partial | `scripts/backup_and_verify.sh` restore drill, verified locally (21 tables, 19 FKs); restore log in runbook; rollback steps | Production drill needs your Neon access; object-storage backups (no file storage yet); DR environment |
| MM-MASTER-01 | Partial | One canonical record per project, quote, booking across dashboards; modular monolith; release gates in runbook | Phases 4–8 for remaining dashboards and integrations |
| MM-TRACE-01 | Live (for built scope) | `docs/traceability.json` → `docs/TRACEABILITY.md`; 37 requirement IDs, 31 verified; checker fails CI if a cited test disappears | Full line-by-line extraction of PRD-01…08 |
| MM-AI-OS-01 / PRD-09 v1.3 | Not started | Pre-conditions in place: audit log, feature flags (kill switch), approval-style admin actions, idempotency, health checks | Needs an AI model provider account and key, plus your approval of autonomy levels; the doc itself says to reconcile before coding |
