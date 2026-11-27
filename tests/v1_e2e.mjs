// End-to-end test of /api/v1 against a real PostgreSQL 16 (via tests/neon_shim.py).
// Run: python3 tests/neon_shim.py 8799 &  then  node tests/v1_e2e.mjs
const SHIM = 'http://127.0.0.1:8799/';
const realFetch = globalThis.fetch;
globalThis.fetch = (u, o) => String(u).includes('.neon.tech/sql') ? realFetch(SHIM, o) : realFetch(u, o);
process.env.DATABASE_URL = 'postgresql://u:p@ep-test.neon.tech/db'; process.env.ADMIN_PASSWORD = 'test-admin-pw';
const mw = (await import('../middleware.js?' + Date.now())).default;
const B = 'https://movematch.test';
let pass = 0, fail = 0; const results = [];
const ok = (name, cond, extra = '') => { (cond ? pass++ : fail++); results.push(`${cond ? 'PASS' : 'FAIL'}  ${name}${cond ? '' : '  ' + extra}`); };
const sqlDirect = async (q, params = []) => { const r = await realFetch(SHIM, { method: 'POST', body: JSON.stringify({ query: q, params }) }); return (await r.json()).rows; };

async function call(path, method = 'GET', body, cookie = '', headers = {}) {
  const r = await mw(new Request(B + path, { method, headers: { 'content-type': 'application/json', origin: B, cookie, ...headers }, body: body ? JSON.stringify(body) : undefined }));
  let j = null; try { j = await r.json(); } catch {}
  return { s: r.status, j, h: r.headers };
}
async function account(email, role, company) {
  await call('/api/signup', 'POST', { name: email.split('@')[0], email, password: 'correct-horse-9', role, company });
  await sqlDirect("UPDATE mm_users SET status='approved' WHERE email=$1", [email]);
  const r = await mw(new Request(B + '/api/login', { method: 'POST', headers: { 'content-type': 'application/json', origin: B }, body: JSON.stringify({ email, password: 'correct-horse-9' }) }));
  return (r.headers.get('set-cookie') || '').split(';')[0];
}
const adminCookie = async () => { const r = await mw(new Request(B + '/admin-login/', { method: 'POST', headers: { 'content-type': 'application/x-www-form-urlencoded', origin: B }, body: 'password=test-admin-pw' })); return (r.headers.get('set-cookie') || '').split(';')[0]; };

// clean slate
await sqlDirect('DROP TABLE IF EXISTS mm_idempotency, mm_feature_flags, mm_booking_status_history, mm_bookings, mm_quote_items, mm_quote_versions, mm_quotes, mm_project_status_history, mm_inventory_items, mm_project_addresses, mm_projects, mm_verifications, mm_providers, mm_orgs, mm_resets, mm_audit, mm_quote_requests, mm_app_state, mm_users CASCADE');

// ---- health
let r = await call('/api/v1/health/live'); ok('health/live 200 + envelope', r.s === 200 && r.j.success && r.j.meta.request_id && r.h.get('x-request-id'));
r = await call('/api/v1/health/ready'); ok('health/ready reports ready (DB reachable)', r.s === 200 && r.j.data.status === 'ready');
r = await call('/api/v1/health/dependencies'); ok('health/dependencies lists providers without secrets', r.j.data.database === 'ok' && r.j.data.payments === 'not_configured' && !JSON.stringify(r.j).includes('postgresql://'));

// ---- auth required
r = await call('/api/v1/projects'); ok('unauthenticated → 401 AUTHENTICATION_REQUIRED', r.s === 401 && r.j.error.code === 'AUTHENTICATION_REQUIRED');
const custA = await account('cust.a@example.test', 'customer');
const custB = await account('cust.b@example.test', 'customer');
const coA = await account('owner@company-a.test', 'company', 'Company A Movers');
const coB = await account('owner@company-b.test', 'company', 'Company B Movers');
await call('/api/signup', 'POST', { name: 'Pending', email: 'pending@example.test', password: 'correct-horse-9', role: 'customer' });
const pendLogin = await call('/api/login', 'POST', { email: 'pending@example.test', password: 'correct-horse-9' });
ok('pending account cannot log in', pendLogin.s === 403);
const adm = await adminCookie();

// ---- project creation & validation
r = await call('/api/v1/projects', 'POST', { project_type: 'teleport' }, custA); ok('invalid project_type → 422 with field details', r.s === 422 && r.j.error.details[0].field === 'project_type');
r = await call('/api/v1/projects', 'POST', { project_type: 'interstate', requested_move_date: '2020-01-01' }, custA); ok('past move date rejected', r.s === 422);
r = await call('/api/v1/projects', 'POST', { project_type: 'interstate', requested_move_date: '2030-06-15', home_size: '2 bedrooms' }, coA); ok('company cannot create customer project → 403', r.s === 403);
r = await call('/api/v1/projects', 'POST', { project_type: 'interstate', requested_move_date: '2030-06-15', home_size: '2 bedrooms' }, custA);
ok('customer creates project (draft, MP- number)', r.s === 201 && r.j.data.status === 'draft' && /^MP-/.test(r.j.data.project_number));
const P = r.j.data.id;

// ---- tenant isolation
r = await call('/api/v1/projects/' + P, 'GET', null, custB); ok('customer B cannot read customer A project → 404', r.s === 404);
r = await call('/api/v1/projects/not-a-uuid', 'GET', null, custA); ok('malformed id → 404 (no enumeration)', r.s === 404);

// ---- submit validation then addresses/inventory
r = await call(`/api/v1/projects/${P}/submit`, 'POST', {}, custA); ok('submit without addresses → 422 listing missing origin+destination', r.s === 422 && r.j.error.details.length === 2);
r = await call(`/api/v1/projects/${P}/addresses`, 'POST', { address_type: 'origin', line1: '1 Main St', city: 'Denver', region: 'co', postal_code: '8020' }, custA); ok('bad ZIP rejected', r.s === 422 && r.j.error.details.some(d => d.field === 'postal_code'));
r = await call(`/api/v1/projects/${P}/addresses`, 'POST', { address_type: 'origin', line1: '1 Main St', city: 'Denver', region: 'co', postal_code: '80202' }, custA); ok('origin address added (state upper-cased)', r.s === 201 && r.j.data.region === 'CO');
r = await call(`/api/v1/projects/${P}/addresses`, 'POST', { address_type: 'origin', line1: '2 Main St', city: 'Denver', region: 'CO', postal_code: '80202' }, custA); ok('second origin → 409 DUPLICATE_ADDRESS', r.s === 409);
r = await call(`/api/v1/projects/${P}/addresses`, 'POST', { address_type: 'destination', line1: '9 Elm Ave', city: 'Austin', region: 'TX', postal_code: '73301' }, custA); ok('destination added', r.s === 201);
r = await call(`/api/v1/projects/${P}/inventory`, 'POST', { room: 'Living room', item_name: 'Sofa', quantity: 0 }, custA); ok('quantity 0 rejected', r.s === 422);
r = await call(`/api/v1/projects/${P}/inventory`, 'POST', { room: 'Living room', item_name: 'Sofa', quantity: 2, fragile: false }, custA); ok('inventory item added', r.s === 201);
r = await call(`/api/v1/projects/${P}/submit`, 'POST', {}, custA); ok('submit succeeds → submitted', r.s === 200 && r.j.data.status === 'submitted');
r = await call(`/api/v1/projects/${P}/inventory`, 'POST', { room: 'Kitchen', item_name: 'Table', quantity: 1 }, custA); ok('inventory locked after submit → 409', r.s === 409 && r.j.error.code === 'PROJECT_LOCKED');
r = await call(`/api/v1/projects/${P}/submit`, 'POST', {}, custA); ok('re-submit → 409 INVALID_TRANSITION', r.s === 409 && r.j.error.code === 'INVALID_TRANSITION');

// ---- provider verification gate
r = await call('/api/v1/opportunities', 'GET', null, coA); ok('unverified company sees no opportunities (notice)', r.s === 200 && r.j.data.length === 0 && r.j.meta.notice);
r = await call(`/api/v1/opportunities/${P}/quotes`, 'POST', { estimate_type: 'binding', items: [{ description: 'Move', quantity: 1, unit_price: '100' }] }, coA); ok('unverified company cannot quote → 403', r.s === 403);
for (const t of ['identity', 'business', 'insurance']) await call('/api/v1/providers/me/verifications', 'POST', { check_type: t, reference: 'REF-' + t }, coA);
for (const t of ['identity', 'business', 'insurance']) await call('/api/v1/providers/me/verifications', 'POST', { check_type: t, reference: 'REFB-' + t }, coB);
r = await call('/api/v1/providers/me/verifications', 'POST', { check_type: 'identity', reference: 'dup' }, coA); ok('duplicate open check → 409', r.s === 409);
r = await call('/api/v1/admin/providers', 'GET', null, custA); ok('non-admin blocked from admin API → 401', r.s === 401);
r = await call('/api/v1/admin/providers', 'GET', null, adm); ok('admin lists providers with checks', r.s === 200 && r.j.data.length === 2);
const vA = await sqlDirect("SELECT v.id, v.check_type FROM mm_verifications v JOIN mm_providers p ON p.id=v.provider_id JOIN mm_orgs o ON o.id=p.org_id WHERE o.name='Company A Movers'");
const vB = await sqlDirect("SELECT v.id, v.check_type FROM mm_verifications v JOIN mm_providers p ON p.id=v.provider_id JOIN mm_orgs o ON o.id=p.org_id WHERE o.name='Company B Movers'");
r = await call(`/api/v1/admin/verifications/${vA[0].id}/reject`, 'POST', {}, adm); ok('reject without reason → 422', r.s === 422);
let last; for (const v of vA) last = await call(`/api/v1/admin/verifications/${v.id}/approve`, 'POST', {}, adm);
ok('all required checks approved → provider verified', last.j.data.provider_status === 'verified', JSON.stringify(last.j));
for (const v of vB) await call(`/api/v1/admin/verifications/${v.id}/approve`, 'POST', {}, adm);

// ---- opportunities: data minimisation
r = await call('/api/v1/opportunities', 'GET', null, coA);
ok('verified company sees the project', r.j.data.length === 1 && r.j.data[0].origin === 'Denver, CO');
ok('opportunity hides customer identity', !JSON.stringify(r.j.data).includes('cust.a@') && !('line1' in r.j.data[0]));

// ---- quoting: server-side pricing
r = await call(`/api/v1/opportunities/${P}/quotes`, 'POST', { estimate_type: 'binding', items: [{ description: 'Labor', quantity: 3, unit_price: '120.50' }, { description: 'Truck', quantity: 1, unit_price: '400' }], tax_amount: '10.25', discount_amount: '20', total_amount: '1' }, coA);
ok('quote total computed on server (client total ignored): 361.50+400-20+10.25 = 751.75', r.s === 201 && r.j.data.version.total_amount === '751.7500', JSON.stringify(r.j));
const QA = r.j.data.id;
r = await call(`/api/v1/opportunities/${P}/quotes`, 'POST', { estimate_type: 'binding', items: [{ description: 'x', quantity: 1, unit_price: '1' }] }, coA); ok('same company cannot quote twice → 409', r.s === 409, r.s+JSON.stringify(r.j));
r = await call(`/api/v1/opportunities/${P}/quotes`, 'POST', { estimate_type: 'non_binding', items: [{ description: 'Full move', quantity: 1, unit_price: '900.00' }] }, coB); ok('company B quotes', r.s === 201);
const QB = r.j.data.id, QBv1 = r.j.data.version.id;
r = await call(`/api/v1/opportunities/${P}/quotes`, 'POST', { estimate_type: 'binding', items: [{ description: 'Bad', quantity: 1, unit_price: '-5' }] }, coB); ok('negative price rejected', r.s === 422 || r.s === 409);
r = await call(`/api/v1/quotes/${QA}`, 'GET', null, coB); ok('company B cannot touch company A quote → 404', r.s === 404);
r = await call(`/api/v1/projects/${P}`, 'GET', null, custA); ok('project moved to quoting; customer sees 2 quotes sorted by price', r.j.data.status === 'quoting' && r.j.data.quotes.length === 2 && Number(r.j.data.quotes[0].total_amount) <= Number(r.j.data.quotes[1].total_amount));

// ---- versioning: old version cannot be accepted
r = await call(`/api/v1/quotes/${QB}/versions`, 'POST', { estimate_type: 'binding', items: [{ description: 'Full move (revised)', quantity: 1, unit_price: '850.00' }] }, coB); ok('company B revises quote → v2', r.s === 201 && r.j.data.version_number === '2');
const QBv2 = r.j.data.id;
r = await call(`/api/v1/quote-versions/${QBv1}/accept`, 'POST', { accept_terms: true }, custA); ok('accepting superseded v1 → 409 QUOTE_NOT_ACCEPTABLE', r.s === 409 && r.j.error.code === 'QUOTE_NOT_ACCEPTABLE');
r = await call(`/api/v1/quote-versions/${QBv2}/accept`, 'POST', {}, custA); ok('accept without terms → 422', r.s === 422);
r = await call(`/api/v1/quote-versions/${QBv2}/accept`, 'POST', { accept_terms: true }, custB); ok("customer B cannot accept A's quote", r.s === 409);

// ---- accept + idempotency + double-booking protection
const key = 'idem-' + Date.now();
r = await call(`/api/v1/quote-versions/${QBv2}/accept`, 'POST', { accept_terms: true }, custA, { 'idempotency-key': key });
ok('accept v2 → booking pending at agreed 850.00', r.s === 201 && r.j.data.status === 'pending' && r.j.data.agreed_total === '850.0000' && /^BK-/.test(r.j.data.booking_number), JSON.stringify(r.j));
const BK = r.j.data.id, bn = r.j.data.booking_number;
r = await call(`/api/v1/quote-versions/${QBv2}/accept`, 'POST', { accept_terms: true }, custA, { 'idempotency-key': key }); ok('retry with same Idempotency-Key returns same booking', r.j.data.booking_number === bn);
r = await call(`/api/v1/quote-versions/${QBv2}/accept`, 'POST', { accept_terms: false, x: 1 }, custA, { 'idempotency-key': key }); ok('same key + different body → 422', r.s === 422);
const qaVer = (await sqlDirect('SELECT id FROM mm_quote_versions WHERE quote_id=$1', [QA]))[0].id;
r = await call(`/api/v1/quote-versions/${qaVer}/accept`, 'POST', { accept_terms: true }, custA); ok('second quote cannot be accepted once booked (no double booking)', r.s === 409);
const cnt = await sqlDirect('SELECT count(*) n FROM mm_bookings'); ok('exactly one booking row exists', cnt[0].n === '1');
const qs = await sqlDirect('SELECT status FROM mm_quotes ORDER BY status'); ok('winning quote accepted, other rejected', qs.map(x => x.status).join() === 'accepted,rejected');

// ---- immutability of accepted terms
r = await call(`/api/v1/quotes/${QB}/versions`, 'POST', { estimate_type: 'binding', items: [{ description: 'Sneaky', quantity: 1, unit_price: '9999' }] }, coB); ok('accepted quote cannot be revised → 409 QUOTE_LOCKED', r.s === 409 && r.j.error.code === 'QUOTE_LOCKED');

// ---- booking lifecycle & permissions
r = await call(`/api/v1/bookings`, 'GET', null, coB); ok('provider sees booking; customer contact hidden until confirmed', r.j.data.length === 1 && r.j.data[0].customer_email === null);
r = await call(`/api/v1/bookings/${BK}/confirm`, 'POST', {}, custA); ok('customer cannot confirm on behalf of company → 403', r.s === 403);
r = await call(`/api/v1/bookings/${BK}/confirm`, 'POST', {}, coA); ok('other company cannot see booking → 404', r.s === 404);
r = await call(`/api/v1/bookings/${BK}/complete`, 'POST', {}, coB); ok('pending → completed skipped → 409', r.s === 409);
r = await call(`/api/v1/bookings/${BK}/confirm`, 'POST', {}, coB); ok('company confirms booking', r.s === 200 && r.j.data.status === 'confirmed');
r = await call(`/api/v1/bookings`, 'GET', null, coB); ok('after confirmation provider sees customer contact', r.j.data[0].customer_email === 'cust.a@example.test');
r = await call(`/api/v1/bookings/${BK}/start`, 'POST', {}, coB); ok('start → in_progress; project in_progress', r.j.data.status === 'in_progress' && (await sqlDirect('SELECT status FROM mm_projects'))[0].status === 'in_progress');
r = await call(`/api/v1/bookings/${BK}/cancel`, 'POST', { reason: 'test' }, custA); ok('cannot cancel a move in progress → 409', r.s === 409);
r = await call(`/api/v1/bookings/${BK}/complete`, 'POST', {}, coB); ok('complete → project completed', r.j.data.status === 'completed' && (await sqlDirect('SELECT status FROM mm_projects'))[0].status === 'completed');
const hist = await sqlDirect('SELECT new_status FROM mm_project_status_history ORDER BY created_at'); ok('full project status history recorded', hist.map(x => x.new_status).join('>') === 'draft>submitted>quoting>booked>in_progress>completed', hist.map(x => x.new_status).join('>'));
const aud = await sqlDirect("SELECT count(*) n FROM mm_audit WHERE action LIKE 'quote.%' OR action LIKE 'booking.%' OR action LIKE 'project.%'"); ok('audit log captured lifecycle events', Number(aud[0].n) >= 8);

// ---- cancellation path on a second project
r = await call('/api/v1/projects', 'POST', { project_type: 'local', requested_move_date: '2030-07-01' }, custA); const P2 = r.j.data.id;
r = await call(`/api/v1/projects/${P2}/cancel`, 'POST', {}, custA); ok('draft project can be cancelled', r.j.data.status === 'cancelled');
r = await call(`/api/v1/projects/${P2}/submit`, 'POST', {}, custA); ok('cancelled project cannot be submitted', r.s === 409 || r.s === 422);

// ---- suspension removes access to opportunities
const prov = await sqlDirect("SELECT p.id FROM mm_providers p JOIN mm_orgs o ON o.id=p.org_id WHERE o.name='Company A Movers'");
r = await call(`/api/v1/admin/providers/${prov[0].id}/suspend`, 'POST', { reason: 'Insurance lapsed' }, adm); ok('admin suspends provider', r.s === 200);
r = await call('/api/v1/opportunities', 'GET', null, coA); ok('suspended provider gets no opportunities', r.j.data.length === 0);

// ---- feature flags & metrics
r = await call('/api/v1/admin/feature-flags/online_payments', 'PUT', { enabled: false }, adm); ok('admin can toggle a feature flag', r.s === 200);
r = await call('/api/v1/admin/metrics', 'GET', null, adm); ok('admin metrics', r.s === 200 && r.j.data.verified_providers === '1');
r = await call('/api/v1/nope', 'GET', null, custA); ok('unknown route → 404 standard error', r.s === 404 && r.j.success === false);
// cross-origin write blocked
r = await mw(new Request(B + '/api/v1/projects', { method: 'POST', headers: { 'content-type': 'application/json', origin: 'https://evil.test', cookie: custA }, body: '{}' })); ok('cross-origin write blocked → 403', r.status === 403);

// ---- integration registry (INTG-OPS-01)
r = await call('/api/v1/admin/integrations', 'GET', null, adm); ok('integration registry lists 5 providers with owner + fallback', r.s === 200 && r.j.data.length === 5 && r.j.data.every(i => i.owner && i.fallback));
r = await call('/api/v1/admin/integrations', 'GET', null, custA); ok('registry is admin-only', r.s === 401);
r = await call('/api/v1/admin/integrations/neon/health-check', 'POST', {}, adm); ok('database health check → active', r.j.data.status === 'active' && r.j.data.ok === true);
r = await call('/api/v1/admin/integrations/stripe/health-check', 'POST', {}, adm); ok('unconfigured provider reported as planned (no fake success)', r.j.data.status === 'planned' && /not set/.test(r.j.data.detail));
r = await call('/api/v1/admin/integrations/resend/suspend', 'POST', { reason: 'test' }, adm); ok('admin can suspend an integration', r.j.data.status === 'suspended');
r = await call('/api/v1/admin/integrations/resend', 'GET', null, adm); ok('integration events recorded (health checks + suspension)', r.j.data.events.length >= 1 && r.j.data.events[0].event === 'suspend');
r = await call('/api/v1/admin/integrations/nope/health-check', 'POST', {}, adm); ok('unknown integration → 404', r.s === 404);
console.log(results.join('\n'));
console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
