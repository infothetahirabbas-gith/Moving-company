// MoveMatch API v1 — core vertical slice (API-01 / DB-01 / BRS-01 / SEC-01).
// One authoritative record per project, quote version and booking; every dashboard reads the same rows.
// Standard envelope: { success, data, meta:{request_id,timestamp} } / { success:false, error:{code,message,details} }.

const SCHEMA = [
  `CREATE TABLE IF NOT EXISTS mm_orgs (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), name TEXT NOT NULL, org_type TEXT NOT NULL CHECK (org_type IN ('moving_company','service_provider','enterprise','platform_entity','other')), country_code CHAR(2) NOT NULL DEFAULT 'US', status TEXT NOT NULL DEFAULT 'active', owner_user_id INT NOT NULL UNIQUE REFERENCES mm_users(id), created_at TIMESTAMPTZ NOT NULL DEFAULT now())`,
  `CREATE TABLE IF NOT EXISTS mm_providers (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), org_id UUID NOT NULL UNIQUE REFERENCES mm_orgs(id), provider_type TEXT NOT NULL, verification_status TEXT NOT NULL DEFAULT 'draft' CHECK (verification_status IN ('draft','submitted','under_review','verified','rejected','suspended','expired')), service_states TEXT[] NOT NULL DEFAULT '{}', services TEXT[] NOT NULL DEFAULT '{}', created_at TIMESTAMPTZ NOT NULL DEFAULT now(), updated_at TIMESTAMPTZ NOT NULL DEFAULT now())`,
  `CREATE TABLE IF NOT EXISTS mm_verifications (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), provider_id UUID NOT NULL REFERENCES mm_providers(id), check_type TEXT NOT NULL CHECK (check_type IN ('identity','business','operating_authority','insurance')), reference TEXT, status TEXT NOT NULL DEFAULT 'submitted' CHECK (status IN ('submitted','approved','rejected','expired')), expires_on DATE, note TEXT, submitted_at TIMESTAMPTZ NOT NULL DEFAULT now(), reviewed_at TIMESTAMPTZ)`,
  `CREATE UNIQUE INDEX IF NOT EXISTS uq_verif_open ON mm_verifications(provider_id, check_type) WHERE status IN ('submitted','approved')`,
  `CREATE TABLE IF NOT EXISTS mm_projects (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), project_number TEXT NOT NULL UNIQUE, customer_user_id INT NOT NULL REFERENCES mm_users(id), project_type TEXT NOT NULL CHECK (project_type IN ('local','long_distance','interstate','international','commercial')), operating_model TEXT NOT NULL DEFAULT 'marketplace' CHECK (operating_model IN ('marketplace','owned','hybrid')), status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','submitted','quoting','booked','in_progress','completed','cancelled')), requested_move_date DATE, property_type TEXT, home_size TEXT, notes TEXT, currency_code CHAR(3) NOT NULL DEFAULT 'USD', version INT NOT NULL DEFAULT 1, created_at TIMESTAMPTZ NOT NULL DEFAULT now(), updated_at TIMESTAMPTZ NOT NULL DEFAULT now())`,
  `CREATE INDEX IF NOT EXISTS ix_projects_customer ON mm_projects(customer_user_id, status)`,
  `CREATE TABLE IF NOT EXISTS mm_project_addresses (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), project_id UUID NOT NULL REFERENCES mm_projects(id) ON DELETE CASCADE, address_type TEXT NOT NULL CHECK (address_type IN ('origin','destination','intermediate_stop','storage')), line1 TEXT NOT NULL, city TEXT NOT NULL, region TEXT NOT NULL, postal_code TEXT NOT NULL, country_code CHAR(2) NOT NULL DEFAULT 'US', floor_number TEXT, lift_available BOOLEAN, access_notes TEXT, created_at TIMESTAMPTZ NOT NULL DEFAULT now())`,
  `CREATE TABLE IF NOT EXISTS mm_inventory_items (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), project_id UUID NOT NULL REFERENCES mm_projects(id) ON DELETE CASCADE, room TEXT NOT NULL, item_name TEXT NOT NULL, quantity INT NOT NULL DEFAULT 1 CHECK (quantity > 0 AND quantity <= 999), fragile BOOLEAN NOT NULL DEFAULT FALSE, created_at TIMESTAMPTZ NOT NULL DEFAULT now())`,
  `CREATE TABLE IF NOT EXISTS mm_project_status_history (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), project_id UUID NOT NULL REFERENCES mm_projects(id) ON DELETE CASCADE, old_status TEXT, new_status TEXT NOT NULL, changed_by INT, reason TEXT, created_at TIMESTAMPTZ NOT NULL DEFAULT now())`,
  `CREATE TABLE IF NOT EXISTS mm_quotes (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), project_id UUID NOT NULL REFERENCES mm_projects(id), provider_id UUID NOT NULL REFERENCES mm_providers(id), quote_number TEXT NOT NULL UNIQUE, status TEXT NOT NULL DEFAULT 'issued' CHECK (status IN ('draft','issued','accepted','rejected','expired','withdrawn')), currency_code CHAR(3) NOT NULL DEFAULT 'USD', valid_until TIMESTAMPTZ, created_at TIMESTAMPTZ NOT NULL DEFAULT now(), UNIQUE (project_id, provider_id))`,
  `CREATE TABLE IF NOT EXISTS mm_quote_versions (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), quote_id UUID NOT NULL REFERENCES mm_quotes(id), version_number INT NOT NULL, estimate_type TEXT NOT NULL CHECK (estimate_type IN ('binding','non_binding','binding_not_to_exceed')), subtotal NUMERIC(19,4) NOT NULL CHECK (subtotal >= 0), discount_amount NUMERIC(19,4) NOT NULL DEFAULT 0 CHECK (discount_amount >= 0), tax_amount NUMERIC(19,4) NOT NULL DEFAULT 0 CHECK (tax_amount >= 0), total_amount NUMERIC(19,4) NOT NULL CHECK (total_amount >= 0), currency_code CHAR(3) NOT NULL DEFAULT 'USD', inclusions TEXT, exclusions TEXT, terms TEXT, created_at TIMESTAMPTZ NOT NULL DEFAULT now(), UNIQUE (quote_id, version_number))`,
  `CREATE TABLE IF NOT EXISTS mm_quote_items (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), quote_version_id UUID NOT NULL REFERENCES mm_quote_versions(id), description TEXT NOT NULL, quantity NUMERIC(12,3) NOT NULL CHECK (quantity > 0), unit_price NUMERIC(19,4) NOT NULL CHECK (unit_price >= 0), line_total NUMERIC(19,4) NOT NULL CHECK (line_total >= 0))`,
  `CREATE TABLE IF NOT EXISTS mm_bookings (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), project_id UUID NOT NULL REFERENCES mm_projects(id), quote_version_id UUID NOT NULL REFERENCES mm_quote_versions(id), provider_id UUID NOT NULL REFERENCES mm_providers(id), booking_number TEXT NOT NULL UNIQUE, status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','confirmed','in_progress','completed','cancelled')), scheduled_date DATE, agreed_total NUMERIC(19,4) NOT NULL CHECK (agreed_total >= 0), currency_code CHAR(3) NOT NULL DEFAULT 'USD', created_at TIMESTAMPTZ NOT NULL DEFAULT now(), updated_at TIMESTAMPTZ NOT NULL DEFAULT now())`,
  `CREATE UNIQUE INDEX IF NOT EXISTS uq_booking_active_project ON mm_bookings(project_id) WHERE status <> 'cancelled'`,
  `CREATE TABLE IF NOT EXISTS mm_booking_status_history (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), booking_id UUID NOT NULL REFERENCES mm_bookings(id), old_status TEXT, new_status TEXT NOT NULL, changed_by INT, reason TEXT, created_at TIMESTAMPTZ NOT NULL DEFAULT now())`,
  `CREATE TABLE IF NOT EXISTS mm_idempotency (user_id INT NOT NULL, idem_key TEXT NOT NULL, route TEXT NOT NULL, fingerprint TEXT NOT NULL, response JSONB, created_at TIMESTAMPTZ NOT NULL DEFAULT now(), PRIMARY KEY (user_id, idem_key))`,
  `CREATE TABLE IF NOT EXISTS mm_crew (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), provider_id UUID NOT NULL REFERENCES mm_providers(id), name TEXT NOT NULL, crew_role TEXT NOT NULL CHECK (crew_role IN ('mover','driver','crew_lead','packer')), phone TEXT, status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','inactive')), created_at TIMESTAMPTZ NOT NULL DEFAULT now())`,
  `CREATE TABLE IF NOT EXISTS mm_vehicles (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), provider_id UUID NOT NULL REFERENCES mm_providers(id), label TEXT NOT NULL, registration TEXT NOT NULL, capacity_cuft INT CHECK (capacity_cuft IS NULL OR capacity_cuft BETWEEN 50 AND 6000), status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','maintenance','inactive')), created_at TIMESTAMPTZ NOT NULL DEFAULT now(), UNIQUE (provider_id, registration))`,
  `CREATE TABLE IF NOT EXISTS mm_assignments (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), booking_id UUID NOT NULL REFERENCES mm_bookings(id), provider_id UUID NOT NULL REFERENCES mm_providers(id), crew_id UUID REFERENCES mm_crew(id), vehicle_id UUID REFERENCES mm_vehicles(id), work_date DATE NOT NULL, created_at TIMESTAMPTZ NOT NULL DEFAULT now(), CHECK ((crew_id IS NULL) <> (vehicle_id IS NULL)))`,
  `CREATE UNIQUE INDEX IF NOT EXISTS uq_crew_day ON mm_assignments(crew_id, work_date) WHERE crew_id IS NOT NULL`,
  `CREATE UNIQUE INDEX IF NOT EXISTS uq_vehicle_day ON mm_assignments(vehicle_id, work_date) WHERE vehicle_id IS NOT NULL`,
  `CREATE TABLE IF NOT EXISTS mm_integrations (id TEXT PRIMARY KEY, provider TEXT NOT NULL, category TEXT NOT NULL, purpose TEXT NOT NULL, env_key TEXT, status TEXT NOT NULL DEFAULT 'planned' CHECK (status IN ('planned','configuring','active','degraded','suspended','failed','retired')), owner TEXT NOT NULL DEFAULT 'Platform owner', fallback TEXT NOT NULL, docs_url TEXT, timeout_ms INT NOT NULL DEFAULT 10000, last_check_at TIMESTAMPTZ, last_ok_at TIMESTAMPTZ, last_error TEXT, updated_at TIMESTAMPTZ NOT NULL DEFAULT now())`,
  `INSERT INTO mm_integrations (id, provider, category, purpose, env_key, fallback, docs_url) VALUES
    ('neon','Neon Postgres','Database','Primary transactional database','DATABASE_URL','Restore from Neon point-in-time history (docs/RUNBOOK.md §6)','https://neon.tech/docs'),
    ('resend','Resend','Communication','Transactional email: approvals, quote confirmations, password reset','RESEND_API_KEY','Emails are skipped and logged; users contact support; password reset shows a support message','https://resend.com/docs'),
    ('stripe','Stripe','Payments','Deposits and payments (not built yet)','STRIPE_SECRET_KEY','Payment arranged directly with the mover; online_payments flag stays off','https://docs.stripe.com'),
    ('maps','Google Maps Platform','Maps & Geolocation','Address autocomplete and road distances (not built yet)','MAPS_API_KEY','Built-in 55-city distance estimate and manual address entry','https://developers.google.com/maps'),
    ('vercel','Vercel','Hosting','Hosting, CDN, TLS, edge functions',NULL,'Promote the previous deployment (docs/RUNBOOK.md §5)','https://vercel.com/docs')
    ON CONFLICT (id) DO NOTHING`,
  `CREATE TABLE IF NOT EXISTS mm_integration_events (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), integration_id TEXT NOT NULL REFERENCES mm_integrations(id), event TEXT NOT NULL, ok BOOLEAN NOT NULL, detail TEXT, duration_ms INT, created_at TIMESTAMPTZ NOT NULL DEFAULT now())`,
  `CREATE TABLE IF NOT EXISTS mm_feature_flags (flag_key TEXT PRIMARY KEY, enabled BOOLEAN NOT NULL DEFAULT FALSE, description TEXT, updated_at TIMESTAMPTZ NOT NULL DEFAULT now())`,
  `INSERT INTO mm_feature_flags (flag_key, enabled, description) VALUES ('marketplace_quotes', TRUE, 'Verified providers can quote on submitted projects'), ('online_payments', FALSE, 'Card payments (needs a payment provider account)'), ('email_notifications', TRUE, 'Transactional emails when an email provider is configured') ON CONFLICT (flag_key) DO NOTHING`
];

// Allowed status transitions (BRS-01). Anything not listed is rejected with 409 INVALID_TRANSITION.
const PROJECT_FLOW = { draft: ['submitted', 'cancelled'], submitted: ['quoting', 'cancelled', 'draft'], quoting: ['booked', 'cancelled'], booked: ['in_progress', 'cancelled'], in_progress: ['completed'], completed: [], cancelled: [] };
const BOOKING_FLOW = { pending: ['confirmed', 'cancelled'], confirmed: ['in_progress', 'cancelled'], in_progress: ['completed'], completed: [], cancelled: [] };
const CHECKS = ['identity', 'business', 'operating_authority', 'insurance'];
const REQUIRED_CHECKS = ['identity', 'business', 'insurance'];
const PROVIDER_ROLES = ['company', 'partner'];
const US = /^[A-Z]{2}$/, ZIP = /^\d{5}(-\d{4})?$/, MONEY = /^\d{1,8}(\.\d{1,2})?$/;

const code = (prefix) => prefix + '-' + crypto.randomUUID().replace(/-/g, '').slice(0, 8).toUpperCase();
const str = (v, max = 200) => String(v ?? '').trim().slice(0, max);
const isUuid = v => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(String(v || ''));
const cents = v => { const s = String(v ?? '').trim(); if (!MONEY.test(s)) return null; const [a, b = ''] = s.split('.'); return parseInt(a, 10) * 100 + parseInt((b + '00').slice(0, 2), 10); };
const fromCents = c => (c / 100).toFixed(2);

class ApiError extends Error { constructor(status, codeName, message, details) { super(message); this.status = status; this.code = codeName; this.details = details || []; } }
const bad = (msg, details) => new ApiError(422, 'VALIDATION_FAILED', msg, details);
const notFound = () => new ApiError(404, 'RESOURCE_NOT_FOUND', 'The requested resource was not found.');
const forbidden = (m = 'You do not have permission for this action.') => new ApiError(403, 'FORBIDDEN', m);

export function makeV1(deps) {
  const { sql, readSession, activeUser, isAdmin, audit, limited } = deps;
  let ready = false;
  async function ensure() { if (ready) return; for (const q of SCHEMA) await sql(q); ready = true; }

  return async function v1(req, url, body) {
    const rid = crypto.randomUUID(), t0 = Date.now();
    const meta = () => ({ request_id: rid, timestamp: new Date().toISOString() });
    const out = (data, status = 200, extra) => new Response(JSON.stringify({ success: true, data, meta: { ...meta(), ...extra } }), { status, headers: { 'content-type': 'application/json', 'cache-control': 'no-store', 'x-request-id': rid } });
    const p = url.pathname.replace(/\/$/, '').slice('/api/v1'.length) || '/', m = req.method;
    const seg = p.split('/').filter(Boolean);
    let actor = 'anonymous';
    try {
      // ---------- health (SRE-01 §13): no auth, no secrets ----------
      if (p === '/health/live') return out({ status: 'ok' });
      if (p === '/health/ready' || p === '/health/dependencies') {
        let db = 'ok'; try { await ensure(); await sql('SELECT 1'); } catch { db = 'unavailable'; }
        if (p === '/health/ready') return out({ status: db === 'ok' ? 'ready' : 'not_ready' }, db === 'ok' ? 200 : 503);
        const env = typeof process !== 'undefined' ? process.env : {};
        return out({ database: db, email: env.RESEND_API_KEY ? 'configured' : 'not_configured', payments: env.STRIPE_SECRET_KEY ? 'configured' : 'not_configured', maps: env.MAPS_API_KEY ? 'configured' : 'not_configured' });
      }
      await ensure();
      if (p === '/feature-flags' && m === 'GET') return out(await sql('SELECT flag_key, enabled FROM mm_feature_flags ORDER BY flag_key'));

      // ---------- admin ----------
      if (seg[0] === 'admin') {
        if (!(await isAdmin(req))) throw new ApiError(401, 'AUTHENTICATION_REQUIRED', 'Admin sign-in required.');
        actor = 'admin';
        return await admin(seg.slice(1), m, body, out);
      }

      // ---------- everything else needs an approved account ----------
      const s = await activeUser(await readSession(req));
      if (!s) throw new ApiError(401, 'AUTHENTICATION_REQUIRED', 'Sign in with an approved account.');
      actor = s.email;
      if (m !== 'GET' && limited(req, 'v1w', 120)) throw new ApiError(429, 'RATE_LIMITED', 'Too many requests. Try again shortly.');
      const r = await user(s, seg, m, body, out, req);
      return r;
    } catch (e) {
      const known = e instanceof ApiError;
      const status = known ? e.status : (/violates (unique|check|foreign key)/i.test(e.message) ? 409 : 500);
      const errCode = known ? e.code : status === 409 ? 'CONFLICT' : 'INTERNAL_ERROR';
      const message = known ? e.message : status === 409 ? 'This change conflicts with the current state. Refresh and try again.' : 'Something went wrong. Reference: ' + rid;
      if (!known) console.error(JSON.stringify({ level: 'error', service: 'api-v1', request_id: rid, route: p, method: m, error: String(e.message).slice(0, 300), duration_ms: Date.now() - t0 }));
      return new Response(JSON.stringify({ success: false, error: { code: errCode, message, details: known ? e.details : [] }, meta: meta() }), { status, headers: { 'content-type': 'application/json', 'cache-control': 'no-store', 'x-request-id': rid } });
    }
  };

  // ---------------- helpers ----------------
  async function providerOf(s, create = false) {
    let [pv] = await sql('SELECT pr.* , o.name AS org_name FROM mm_providers pr JOIN mm_orgs o ON o.id = pr.org_id WHERE o.owner_user_id = $1', [s.uid]);
    if (!pv && create) {
      const [u] = await sql('SELECT name, company, role FROM mm_users WHERE id = $1', [s.uid]);
      const [o] = await sql("INSERT INTO mm_orgs (name, org_type, owner_user_id) VALUES ($1, $2, $3) ON CONFLICT (owner_user_id) DO UPDATE SET name = mm_orgs.name RETURNING id", [u.company || u.name, u.role === 'company' ? 'moving_company' : 'service_provider', s.uid]);
      await sql('INSERT INTO mm_providers (org_id, provider_type) VALUES ($1, $2) ON CONFLICT (org_id) DO NOTHING', [o.id, u.role === 'company' ? 'carrier' : 'service_partner']);
      [pv] = await sql('SELECT pr.*, o.name AS org_name FROM mm_providers pr JOIN mm_orgs o ON o.id = pr.org_id WHERE o.owner_user_id = $1', [s.uid]);
    }
    return pv || null;
  }
  async function ownProject(s, id) {
    if (!isUuid(id)) throw notFound();
    const [pr] = await sql('SELECT * FROM mm_projects WHERE id = $1 AND customer_user_id = $2', [id, s.uid]);
    if (!pr) throw notFound(); // same answer whether it exists or not (no enumeration)
    return pr;
  }
  async function moveProject(pr, to, by, reason) {
    if (!(PROJECT_FLOW[pr.status] || []).includes(to)) throw new ApiError(409, 'INVALID_TRANSITION', `A ${pr.status} project cannot move to ${to}.`);
    const [u] = await sql('UPDATE mm_projects SET status = $1, version = version + 1, updated_at = now() WHERE id = $2 AND version = $3 RETURNING *', [to, pr.id, pr.version]);
    if (!u) throw new ApiError(409, 'CONCURRENT_UPDATE', 'This project changed while you were working. Refresh and try again.');
    await sql('INSERT INTO mm_project_status_history (project_id, old_status, new_status, changed_by, reason) VALUES ($1,$2,$3,$4,$5)', [pr.id, pr.status, to, by, reason || null]);
    return u;
  }
  async function idem(s, req, route, payload, fn) {
    const key = str(req.headers.get('idempotency-key'), 100);
    if (!key) return fn();
    const fp = JSON.stringify(payload);
    const [hit] = await sql('SELECT fingerprint, response FROM mm_idempotency WHERE user_id = $1 AND idem_key = $2', [s.uid, key]);
    if (hit) { if (hit.fingerprint !== fp) throw new ApiError(422, 'IDEMPOTENCY_KEY_REUSED', 'This Idempotency-Key was already used for a different request.'); return typeof hit.response === 'string' ? JSON.parse(hit.response) : hit.response; }
    const res = await fn();
    await sql('INSERT INTO mm_idempotency (user_id, idem_key, route, fingerprint, response) VALUES ($1,$2,$3,$4,$5::jsonb) ON CONFLICT DO NOTHING', [s.uid, key, route, fp, JSON.stringify(res)]);
    return res;
  }
  async function refreshVerification(providerId) {
    const rows = await sql("SELECT check_type FROM mm_verifications WHERE provider_id = $1 AND status = 'approved' AND (expires_on IS NULL OR expires_on >= CURRENT_DATE)", [providerId]);
    const ok = REQUIRED_CHECKS.every(c => rows.some(r => r.check_type === c));
    const [cur] = await sql('SELECT verification_status FROM mm_providers WHERE id = $1', [providerId]);
    if (cur.verification_status === 'suspended') return 'suspended';
    const next = ok ? 'verified' : 'under_review';
    await sql('UPDATE mm_providers SET verification_status = $1, updated_at = now() WHERE id = $2', [next, providerId]);
    return next;
  }

  // ---------------- signed-in users ----------------
  async function user(s, seg, m, body, out, req) {
    const [a, id, sub] = seg;
    const isProvider = PROVIDER_ROLES.includes(s.role);

    if (a === 'me' && m === 'GET') return out({ user_id: s.uid, email: s.email, role: s.role, provider: isProvider ? await providerOf(s, true) : null });

    // ===== customer: moving projects =====
    if (a === 'projects') {
      if (!id) {
        if (m === 'GET') {
          if (s.role !== 'customer') throw forbidden();
          return out(await sql("SELECT p.id, p.project_number, p.status, p.project_type, p.requested_move_date, p.created_at, (SELECT count(*)::int FROM mm_quotes q WHERE q.project_id = p.id AND q.status IN ('issued','accepted')) AS quotes FROM mm_projects p WHERE p.customer_user_id = $1 ORDER BY p.created_at DESC LIMIT 100", [s.uid]));
        }
        if (m === 'POST') {
          if (s.role !== 'customer') throw forbidden('Only customer accounts can create moving projects.');
          const type = str(body.project_type, 30), date = str(body.requested_move_date, 10), errs = [];
          if (!['local', 'long_distance', 'interstate', 'international', 'commercial'].includes(type)) errs.push({ field: 'project_type', message: 'Choose a move type.' });
          if (date && (!/^\d{4}-\d{2}-\d{2}$/.test(date) || date < new Date().toISOString().slice(0, 10))) errs.push({ field: 'requested_move_date', message: 'Choose today or a future date.' });
          if (errs.length) throw bad('Please fix the highlighted fields.', errs);
          const [open] = await sql("SELECT count(*)::int AS n FROM mm_projects WHERE customer_user_id = $1 AND status IN ('draft','submitted','quoting')", [s.uid]);
          if (Number(open.n) >= 10) throw new ApiError(422, 'LIMIT_REACHED', 'You already have 10 open projects. Close or cancel one first.');
          const [pr] = await sql('INSERT INTO mm_projects (project_number, customer_user_id, project_type, requested_move_date, property_type, home_size, notes) VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *', [code('MP'), s.uid, type, date || null, str(body.property_type, 40) || null, str(body.home_size, 40) || null, str(body.notes, 1000) || null]);
          await sql('INSERT INTO mm_project_status_history (project_id, new_status, changed_by) VALUES ($1, $2, $3)', [pr.id, 'draft', s.uid]);
          await audit(s.uid, s.email, 'project.created', pr.project_number);
          return out(pr, 201);
        }
      }
      if (s.role !== 'customer') throw notFound();
      const pr = await ownProject(s, id);
      if (!sub && m === 'GET') {
        const [addresses, items, quotes, booking, history] = await Promise.all([
          sql('SELECT * FROM mm_project_addresses WHERE project_id = $1 ORDER BY created_at', [pr.id]),
          sql('SELECT * FROM mm_inventory_items WHERE project_id = $1 ORDER BY room, created_at', [pr.id]),
          sql(`SELECT q.id, q.quote_number, q.status, q.valid_until, o.name AS provider_name, pr.verification_status, v.id AS version_id, v.version_number, v.estimate_type, v.subtotal, v.discount_amount, v.tax_amount, v.total_amount, v.currency_code, v.inclusions, v.exclusions, v.terms
               FROM mm_quotes q JOIN mm_providers pr ON pr.id = q.provider_id JOIN mm_orgs o ON o.id = pr.org_id
               JOIN LATERAL (SELECT * FROM mm_quote_versions WHERE quote_id = q.id ORDER BY version_number DESC LIMIT 1) v ON TRUE
               WHERE q.project_id = $1 AND q.status <> 'draft' ORDER BY v.total_amount`, [pr.id]),
          sql("SELECT b.*, o.name AS provider_name FROM mm_bookings b JOIN mm_providers pv ON pv.id = b.provider_id JOIN mm_orgs o ON o.id = pv.org_id WHERE b.project_id = $1 AND b.status <> 'cancelled'", [pr.id]),
          sql('SELECT old_status, new_status, reason, created_at FROM mm_project_status_history WHERE project_id = $1 ORDER BY created_at', [pr.id])]);
        return out({ ...pr, addresses, inventory: items, quotes, booking: booking[0] || null, history });
      }
      if (sub === 'addresses' && m === 'POST') {
        if (pr.status !== 'draft') throw new ApiError(409, 'PROJECT_LOCKED', 'Addresses can only change while the project is a draft.');
        const t = str(body.address_type, 20), region = str(body.region, 2).toUpperCase(), zip = str(body.postal_code, 10), errs = [];
        if (!['origin', 'destination', 'intermediate_stop', 'storage'].includes(t)) errs.push({ field: 'address_type', message: 'Choose origin, destination or stop.' });
        if (str(body.line1).length < 3) errs.push({ field: 'line1', message: 'Enter the street address.' });
        if (str(body.city).length < 2) errs.push({ field: 'city', message: 'Enter the city.' });
        if (!US.test(region)) errs.push({ field: 'region', message: 'Use the 2-letter state code.' });
        if (!ZIP.test(zip)) errs.push({ field: 'postal_code', message: 'Enter a 5-digit ZIP code.' });
        if (errs.length) throw bad('Please fix the highlighted fields.', errs);
        if (t !== 'intermediate_stop') { const [d] = await sql('SELECT count(*)::int AS n FROM mm_project_addresses WHERE project_id = $1 AND address_type = $2', [pr.id, t]); if (Number(d.n) > 0) throw new ApiError(409, 'DUPLICATE_ADDRESS', `This project already has a ${t} address. Remove it first.`); }
        const [ad] = await sql('INSERT INTO mm_project_addresses (project_id, address_type, line1, city, region, postal_code, floor_number, lift_available, access_notes) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *', [pr.id, t, str(body.line1), str(body.city, 120), region, zip, str(body.floor_number, 20) || null, body.lift_available === true, str(body.access_notes, 500) || null]);
        return out(ad, 201);
      }
      if (sub === 'addresses' && m === 'DELETE') {
        if (pr.status !== 'draft') throw new ApiError(409, 'PROJECT_LOCKED', 'Addresses can only change while the project is a draft.');
        const aid = url_q(req, 'id'); if (!isUuid(aid)) throw notFound();
        await sql('DELETE FROM mm_project_addresses WHERE id = $1 AND project_id = $2', [aid, pr.id]); return out({ deleted: true });
      }
      if (sub === 'inventory' && m === 'POST') {
        if (pr.status !== 'draft') throw new ApiError(409, 'PROJECT_LOCKED', 'Inventory can only change while the project is a draft.');
        const q = parseInt(body.quantity, 10), errs = [];
        if (str(body.room, 60).length < 2) errs.push({ field: 'room', message: 'Enter the room.' });
        if (str(body.item_name, 120).length < 2) errs.push({ field: 'item_name', message: 'Enter the item.' });
        if (!(q >= 1 && q <= 999)) errs.push({ field: 'quantity', message: 'Quantity must be 1–999.' });
        if (errs.length) throw bad('Please fix the highlighted fields.', errs);
        const [n] = await sql('SELECT count(*)::int AS n FROM mm_inventory_items WHERE project_id = $1', [pr.id]); if (Number(n.n) >= 300) throw new ApiError(422, 'LIMIT_REACHED', 'Inventory is limited to 300 lines.');
        const [it] = await sql('INSERT INTO mm_inventory_items (project_id, room, item_name, quantity, fragile) VALUES ($1,$2,$3,$4,$5) RETURNING *', [pr.id, str(body.room, 60), str(body.item_name, 120), q, body.fragile === true]);
        return out(it, 201);
      }
      if (sub === 'inventory' && m === 'DELETE') {
        if (pr.status !== 'draft') throw new ApiError(409, 'PROJECT_LOCKED', 'Inventory can only change while the project is a draft.');
        const iid = url_q(req, 'id'); if (!isUuid(iid)) throw notFound();
        await sql('DELETE FROM mm_inventory_items WHERE id = $1 AND project_id = $2', [iid, pr.id]); return out({ deleted: true });
      }
      if (sub === 'submit' && m === 'POST') {
        const ads = await sql('SELECT address_type FROM mm_project_addresses WHERE project_id = $1', [pr.id]);
        const errs = [];
        if (!ads.some(x => x.address_type === 'origin')) errs.push({ field: 'origin', message: 'Add the origin address.' });
        if (!ads.some(x => x.address_type === 'destination')) errs.push({ field: 'destination', message: 'Add the destination address.' });
        if (!pr.requested_move_date) errs.push({ field: 'requested_move_date', message: 'Set a move date.' });
        if (errs.length) throw bad('This project is not ready to submit.', errs);
        const u = await moveProject(pr, 'submitted', s.uid, 'Submitted by customer');
        await audit(s.uid, s.email, 'project.submitted', pr.project_number);
        return out(u);
      }
      if (sub === 'cancel' && m === 'POST') {
        const reason = str(body.reason, 300) || 'Cancelled by customer';
        const u = await moveProject(pr, 'cancelled', s.uid, reason);
        await sql("UPDATE mm_quotes SET status = 'rejected' WHERE project_id = $1 AND status = 'issued'", [pr.id]);
        const bk = await sql("UPDATE mm_bookings SET status = 'cancelled', updated_at = now() WHERE project_id = $1 AND status IN ('pending','confirmed') RETURNING id, status", [pr.id]);
        for (const b of bk) await sql("INSERT INTO mm_booking_status_history (booking_id, old_status, new_status, changed_by, reason) VALUES ($1, 'active', 'cancelled', $2, $3)", [b.id, s.uid, reason]);
        if (bk.length) await sql('DELETE FROM mm_assignments WHERE booking_id = ANY($1::uuid[])', ['{' + bk.map(b => b.id).join(',') + '}']);
        await audit(s.uid, s.email, 'project.cancelled', pr.project_number);
        return out(u);
      }
      throw notFound();
    }

    // ===== customer: accept a quote version → booking (atomic, idempotent) =====
    if (a === 'quote-versions' && sub === 'accept' && m === 'POST') {
      if (s.role !== 'customer') throw forbidden();
      if (!isUuid(id)) throw notFound();
      if (body.accept_terms !== true) throw bad('Please accept the quote terms.', [{ field: 'accept_terms', message: 'Required.' }]);
      const res = await idem(s, req, 'accept', { id }, async () => {
        const bn = code('BK');
        const rows = await sql(`WITH v AS (
            SELECT qv.id, qv.total_amount, qv.currency_code, q.id AS qid, q.project_id, q.provider_id, p.requested_move_date, p.status AS pstatus, p.version AS pversion
            FROM mm_quote_versions qv JOIN mm_quotes q ON q.id = qv.quote_id JOIN mm_projects p ON p.id = q.project_id JOIN mm_providers pv ON pv.id = q.provider_id
            WHERE qv.id = $1 AND p.customer_user_id = $2 AND q.status = 'issued' AND pv.verification_status = 'verified'
              AND p.status IN ('submitted','quoting') AND (q.valid_until IS NULL OR q.valid_until > now())
              AND qv.version_number = (SELECT max(version_number) FROM mm_quote_versions WHERE quote_id = q.id)),
          b AS (INSERT INTO mm_bookings (project_id, quote_version_id, provider_id, booking_number, status, scheduled_date, agreed_total, currency_code)
                SELECT project_id, id, provider_id, $3, 'pending', requested_move_date, total_amount, currency_code FROM v RETURNING *),
          qa AS (UPDATE mm_quotes SET status = 'accepted' WHERE id = (SELECT qid FROM v) AND EXISTS (SELECT 1 FROM b) RETURNING id),
          qr AS (UPDATE mm_quotes SET status = 'rejected' WHERE project_id = (SELECT project_id FROM v) AND id <> (SELECT qid FROM v) AND status = 'issued' AND EXISTS (SELECT 1 FROM b) RETURNING id),
          pu AS (UPDATE mm_projects SET status = 'booked', version = version + 1, updated_at = now() WHERE id = (SELECT project_id FROM v) AND EXISTS (SELECT 1 FROM b) RETURNING id),
          ph AS (INSERT INTO mm_project_status_history (project_id, old_status, new_status, changed_by, reason) SELECT project_id, pstatus, 'booked', $2, 'Quote accepted' FROM v WHERE EXISTS (SELECT 1 FROM b) RETURNING id),
          bh AS (INSERT INTO mm_booking_status_history (booking_id, new_status, changed_by, reason) SELECT id, 'pending', $2, 'Created from accepted quote' FROM b RETURNING id)
          SELECT b.* FROM b`, [id, s.uid, bn]);
        if (!rows.length) throw new ApiError(409, 'QUOTE_NOT_ACCEPTABLE', 'This quote can no longer be accepted (it may be outdated, expired, withdrawn, or the project is already booked).');
        await audit(s.uid, s.email, 'quote.accepted', rows[0].booking_number);
        return rows[0];
      });
      return out(res, 201);
    }

    // ===== bookings (customer sees own; provider sees theirs) =====
    if (a === 'bookings') {
      const pv = isProvider ? await providerOf(s) : null;
      if (!id && m === 'GET') {
        if (s.role === 'customer') return out(await sql("SELECT b.*, p.project_number, o.name AS provider_name FROM mm_bookings b JOIN mm_projects p ON p.id = b.project_id JOIN mm_providers pv ON pv.id = b.provider_id JOIN mm_orgs o ON o.id = pv.org_id WHERE p.customer_user_id = $1 ORDER BY b.created_at DESC", [s.uid]));
        if (pv) return out(await sql(`SELECT b.*, p.project_number, p.project_type,
            (SELECT city || ', ' || region FROM mm_project_addresses WHERE project_id = p.id AND address_type = 'origin' LIMIT 1) AS origin,
            (SELECT city || ', ' || region FROM mm_project_addresses WHERE project_id = p.id AND address_type = 'destination' LIMIT 1) AS destination,
            CASE WHEN b.status IN ('confirmed','in_progress','completed') THEN u.name END AS customer_name,
            CASE WHEN b.status IN ('confirmed','in_progress','completed') THEN u.email END AS customer_email
            FROM mm_bookings b JOIN mm_projects p ON p.id = b.project_id JOIN mm_users u ON u.id = p.customer_user_id WHERE b.provider_id = $1 ORDER BY b.created_at DESC`, [pv.id]));
        throw forbidden();
      }
      if (!isUuid(id)) throw notFound();
      const [b] = await sql('SELECT b.*, p.customer_user_id, p.id AS pid, p.status AS pstatus, p.version AS pversion FROM mm_bookings b JOIN mm_projects p ON p.id = b.project_id WHERE b.id = $1', [id]);
      const mine = b && (String(b.customer_user_id) === String(s.uid) || (pv && b.provider_id === pv.id));
      if (!mine) throw notFound();
      if (!sub && m === 'GET') return out(b);
      if (sub === 'assignments') {
        if (m === 'GET') return out(await sql(`SELECT x.id, x.work_date, c.name AS crew_name, c.crew_role, v.label AS vehicle_label, v.registration FROM mm_assignments x LEFT JOIN mm_crew c ON c.id = x.crew_id LEFT JOIN mm_vehicles v ON v.id = x.vehicle_id WHERE x.booking_id = $1 ORDER BY v.label NULLS FIRST, c.name`, [b.id]).then(rows => pv && b.provider_id === pv.id ? rows : rows.map(r => ({ crew_role: r.crew_role, crew_name: r.crew_name ? r.crew_name.split(' ')[0] : null, vehicle_label: r.vehicle_label, work_date: r.work_date })))); // customer sees first names + truck type only
        if (!(pv && b.provider_id === pv.id)) throw forbidden('Only the moving company can assign crew and vehicles.');
        if (m === 'POST') {
          if (!['confirmed', 'in_progress'].includes(b.status)) throw new ApiError(409, 'BOOKING_NOT_CONFIRMED', 'Confirm the booking before assigning crew and vehicles.');
          if (!b.scheduled_date) throw new ApiError(422, 'NO_DATE', 'This booking has no move date.');
          const crew = [...new Set((Array.isArray(body.crew_ids) ? body.crew_ids : []).filter(isUuid))].slice(0, 30), veh = [...new Set((Array.isArray(body.vehicle_ids) ? body.vehicle_ids : []).filter(isUuid))].slice(0, 10);
          if (!crew.length && !veh.length) throw bad('Choose at least one crew member or vehicle.');
          const ok = await sql(`SELECT 'c' AS k, id FROM mm_crew WHERE provider_id = $1 AND status = 'active' AND id = ANY($2::uuid[]) UNION ALL SELECT 'v', id FROM mm_vehicles WHERE provider_id = $1 AND status = 'active' AND id = ANY($3::uuid[])`, [pv.id, '{' + crew.join(',') + '}', '{' + veh.join(',') + '}']);
          if (ok.length !== crew.length + veh.length) throw bad('Some crew or vehicles are not yours or are not active (inactive or in maintenance).');
          // Conflict check with names (friendly message); the unique indexes enforce it under concurrency too.
          const clash = await sql(`SELECT coalesce(c.name, v.label || ' ' || v.registration) AS who, b2.booking_number FROM mm_assignments x JOIN mm_bookings b2 ON b2.id = x.booking_id LEFT JOIN mm_crew c ON c.id = x.crew_id LEFT JOIN mm_vehicles v ON v.id = x.vehicle_id
            WHERE x.work_date = $1 AND x.booking_id <> $2 AND (x.crew_id = ANY($3::uuid[]) OR x.vehicle_id = ANY($4::uuid[]))`, [b.scheduled_date, b.id, '{' + crew.join(',') + '}', '{' + veh.join(',') + '}']);
          if (clash.length) throw new ApiError(409, 'RESOURCE_CONFLICT', 'Already booked that day: ' + clash.map(c => `${c.who} (${c.booking_number})`).join(', '), clash.map(c => ({ field: 'resource', message: `${c.who} is on ${c.booking_number}` })));
          const rows = await sql(`WITH ins AS (INSERT INTO mm_assignments (booking_id, provider_id, crew_id, vehicle_id, work_date)
              SELECT $1::uuid, $2::uuid, u, NULL::uuid, $3::date FROM unnest($4::uuid[]) u WHERE NOT EXISTS (SELECT 1 FROM mm_assignments WHERE booking_id = $1::uuid AND crew_id = u)
              UNION ALL SELECT $1::uuid, $2::uuid, NULL::uuid, u, $3::date FROM unnest($5::uuid[]) u WHERE NOT EXISTS (SELECT 1 FROM mm_assignments WHERE booking_id = $1::uuid AND vehicle_id = u) RETURNING id) SELECT count(*)::int AS n FROM ins`,
            [b.id, pv.id, b.scheduled_date, '{' + crew.join(',') + '}', '{' + veh.join(',') + '}']);
          await audit(s.uid, s.email, 'booking.assigned', b.booking_number + ' +' + rows[0].n);
          return out({ added: Number(rows[0].n) }, 201);
        }
        if (m === 'DELETE') {
          const xid = url_q(req, 'id'); if (!isUuid(xid)) throw notFound();
          if (b.status === 'completed') throw new ApiError(409, 'BOOKING_CLOSED', 'Completed bookings keep their assignment history.');
          await sql('DELETE FROM mm_assignments WHERE id = $1 AND booking_id = $2', [xid, b.id]); return out({ deleted: true });
        }
      }
      const to = { confirm: 'confirmed', start: 'in_progress', complete: 'completed', cancel: 'cancelled' }[sub];
      if (!to || m !== 'POST') throw notFound();
      const byProvider = pv && b.provider_id === pv.id;
      if (['confirmed', 'in_progress', 'completed'].includes(to) && !byProvider) throw forbidden('Only the moving company can do this.');
      if (!(BOOKING_FLOW[b.status] || []).includes(to)) throw new ApiError(409, 'INVALID_TRANSITION', `A ${b.status} booking cannot move to ${to}.`);
      const reason = str(body.reason, 300) || null;
      if (to === 'cancelled' && !reason) throw bad('Give a reason for cancelling.', [{ field: 'reason', message: 'Required.' }]);
      const [u] = await sql('UPDATE mm_bookings SET status = $1, updated_at = now() WHERE id = $2 AND status = $3 RETURNING *', [to, b.id, b.status]);
      if (!u) throw new ApiError(409, 'CONCURRENT_UPDATE', 'This booking changed. Refresh and try again.');
      await sql('INSERT INTO mm_booking_status_history (booking_id, old_status, new_status, changed_by, reason) VALUES ($1,$2,$3,$4,$5)', [b.id, b.status, to, s.uid, reason]);
      if (to === 'cancelled') await sql('DELETE FROM mm_assignments WHERE booking_id = $1', [b.id]); // free crew and trucks for other jobs
      const projTo = { in_progress: 'in_progress', completed: 'completed', cancelled: 'quoting' }[to];
      if (projTo) { const [pr] = await sql('SELECT * FROM mm_projects WHERE id = $1', [b.pid]); if (projTo === 'quoting') { await sql("UPDATE mm_projects SET status = 'quoting', version = version + 1, updated_at = now() WHERE id = $1 AND status = 'booked'", [pr.id]); await sql("INSERT INTO mm_project_status_history (project_id, old_status, new_status, changed_by, reason) VALUES ($1, 'booked', 'quoting', $2, $3)", [pr.id, s.uid, 'Booking cancelled: ' + reason]); } else await moveProject(pr, projTo, s.uid, 'Booking ' + to); }
      await audit(s.uid, s.email, 'booking.' + to, u.booking_number);
      return out(u);
    }

    // ===== providers (company / partner) =====
    if (!isProvider) throw notFound();
    const pv = await providerOf(s, true);

    if (a === 'providers' && id === 'me') {
      if (!sub && m === 'GET') return out({ ...pv, verifications: await sql('SELECT id, check_type, reference, status, expires_on, note, submitted_at, reviewed_at FROM mm_verifications WHERE provider_id = $1 ORDER BY submitted_at DESC', [pv.id]) });
      if (!sub && m === 'PUT') {
        const states = [...new Set((Array.isArray(body.service_states) ? body.service_states : []).map(x => str(x, 2).toUpperCase()).filter(x => US.test(x)))].slice(0, 60);
        const services = [...new Set((Array.isArray(body.services) ? body.services : []).map(x => str(x, 40)).filter(Boolean))].slice(0, 30);
        const [u] = await sql('UPDATE mm_providers SET service_states = $1::text[], services = $2::text[], updated_at = now() WHERE id = $3 RETURNING *', ['{' + states.join(',') + '}', '{' + services.map(x => '"' + x.replace(/["\\]/g, '') + '"').join(',') + '}', pv.id]);
        return out(u);
      }
      if (sub === 'verifications' && m === 'POST') {
        const t = str(body.check_type, 30), ref = str(body.reference, 120), exp = str(body.expires_on, 10);
        const errs = [];
        if (!CHECKS.includes(t)) errs.push({ field: 'check_type', message: 'Unknown check.' });
        if (ref.length < 3) errs.push({ field: 'reference', message: 'Enter the registration, licence, USDOT/MC or policy number.' });
        if (exp && !/^\d{4}-\d{2}-\d{2}$/.test(exp)) errs.push({ field: 'expires_on', message: 'Use YYYY-MM-DD.' });
        if (errs.length) throw bad('Please fix the highlighted fields.', errs);
        const [v] = await sql('INSERT INTO mm_verifications (provider_id, check_type, reference, expires_on) VALUES ($1,$2,$3,$4) RETURNING *', [pv.id, t, ref, exp || null]);
        if (pv.verification_status === 'draft' || pv.verification_status === 'rejected') await sql("UPDATE mm_providers SET verification_status = 'submitted', updated_at = now() WHERE id = $1", [pv.id]);
        await audit(s.uid, s.email, 'verification.submitted', t);
        return out(v, 201);
      }
    }

    // ===== crew & fleet (PRD-05) =====
    if (a === 'crew') {
      if (!id && m === 'GET') return out(await sql("SELECT c.*, (SELECT count(*)::int FROM mm_assignments x WHERE x.crew_id = c.id AND x.work_date >= CURRENT_DATE) AS upcoming_jobs FROM mm_crew c WHERE c.provider_id = $1 ORDER BY c.status, c.name", [pv.id]));
      if (!id && m === 'POST') {
        const name = str(body.name, 120), role = str(body.crew_role, 20), phone = str(body.phone, 30), errs = [];
        if (name.length < 2) errs.push({ field: 'name', message: 'Enter the name.' });
        if (!['mover', 'driver', 'crew_lead', 'packer'].includes(role)) errs.push({ field: 'crew_role', message: 'Choose a role.' });
        if (phone && !/^[+\d][\d\s().-]{6,}$/.test(phone)) errs.push({ field: 'phone', message: 'Enter a valid phone number.' });
        if (errs.length) throw bad('Please fix the highlighted fields.', errs);
        const [n] = await sql('SELECT count(*)::int AS n FROM mm_crew WHERE provider_id = $1', [pv.id]); if (Number(n.n) >= 500) throw new ApiError(422, 'LIMIT_REACHED', 'Crew list is limited to 500 people.');
        const [c] = await sql('INSERT INTO mm_crew (provider_id, name, crew_role, phone) VALUES ($1,$2,$3,$4) RETURNING *', [pv.id, name, role, phone || null]);
        await audit(s.uid, s.email, 'crew.added', name); return out(c, 201);
      }
      if (isUuid(id) && (sub === 'deactivate' || sub === 'activate') && m === 'POST') {
        const [c] = await sql('UPDATE mm_crew SET status = $1 WHERE id = $2 AND provider_id = $3 RETURNING *', [sub === 'activate' ? 'active' : 'inactive', id, pv.id]); if (!c) throw notFound();
        return out(c);
      }
      throw notFound();
    }
    if (a === 'vehicles') {
      if (!id && m === 'GET') return out(await sql("SELECT v.*, (SELECT count(*)::int FROM mm_assignments x WHERE x.vehicle_id = v.id AND x.work_date >= CURRENT_DATE) AS upcoming_jobs FROM mm_vehicles v WHERE v.provider_id = $1 ORDER BY v.status, v.label", [pv.id]));
      if (!id && m === 'POST') {
        const label = str(body.label, 80), reg = str(body.registration, 20).toUpperCase(), cap = body.capacity_cuft === '' || body.capacity_cuft == null ? null : parseInt(body.capacity_cuft, 10), errs = [];
        if (label.length < 2) errs.push({ field: 'label', message: 'Name the vehicle, e.g. "26 ft truck".' });
        if (!/^[A-Z0-9 -]{2,12}$/.test(reg)) errs.push({ field: 'registration', message: 'Enter the plate number.' });
        if (cap !== null && !(cap >= 50 && cap <= 6000)) errs.push({ field: 'capacity_cuft', message: 'Capacity must be 50–6000 cu ft.' });
        if (errs.length) throw bad('Please fix the highlighted fields.', errs);
        const [dupV] = await sql('SELECT 1 FROM mm_vehicles WHERE provider_id = $1 AND registration = $2', [pv.id, reg]); if (dupV) throw new ApiError(409, 'DUPLICATE_VEHICLE', 'A vehicle with this plate is already in your fleet.');
        const [v] = await sql('INSERT INTO mm_vehicles (provider_id, label, registration, capacity_cuft) VALUES ($1,$2,$3,$4) RETURNING *', [pv.id, label, reg, cap]);
        await audit(s.uid, s.email, 'vehicle.added', reg); return out(v, 201);
      }
      if (isUuid(id) && sub === 'status' && m === 'POST') {
        const st = str(body.status, 20); if (!['active', 'maintenance', 'inactive'].includes(st)) throw bad('Choose active, maintenance or inactive.');
        const [v] = await sql('UPDATE mm_vehicles SET status = $1 WHERE id = $2 AND provider_id = $3 RETURNING *', [st, id, pv.id]); if (!v) throw notFound();
        return out(v);
      }
      throw notFound();
    }
    if (a === 'schedule' && m === 'GET') {
      return out(await sql(`SELECT x.id, x.work_date, b.booking_number, b.status AS booking_status, c.name AS crew_name, c.crew_role, v.label AS vehicle_label, v.registration
        FROM mm_assignments x JOIN mm_bookings b ON b.id = x.booking_id LEFT JOIN mm_crew c ON c.id = x.crew_id LEFT JOIN mm_vehicles v ON v.id = x.vehicle_id
        WHERE x.provider_id = $1 AND x.work_date >= CURRENT_DATE - 7 ORDER BY x.work_date, b.booking_number LIMIT 500`, [pv.id]));
    }
    if (a === 'opportunities' && m === 'GET') {
      if (pv.verification_status !== 'verified') return out([], 200, { notice: 'Opportunities appear once your identity, business and insurance checks are approved.' });
      const [flag] = await sql("SELECT enabled FROM mm_feature_flags WHERE flag_key = 'marketplace_quotes'");
      if (flag && String(flag.enabled) !== 'true' && flag.enabled !== true && flag.enabled !== 't') return out([], 200, { notice: 'Quoting is paused by MoveMatch.' });
      // Data minimisation (API-01 §6.3): city/state, date and inventory size only — no customer identity.
      return out(await sql(`SELECT p.id, p.project_number, p.project_type, p.requested_move_date, p.property_type, p.home_size,
          o.city || ', ' || o.region AS origin, d.city || ', ' || d.region AS destination, o.region AS origin_state, d.region AS destination_state,
          (SELECT coalesce(sum(quantity),0)::int FROM mm_inventory_items WHERE project_id = p.id) AS item_count,
          (SELECT count(*)::int FROM mm_quotes WHERE project_id = p.id AND status = 'issued') AS quotes_so_far
          FROM mm_projects p JOIN mm_project_addresses o ON o.project_id = p.id AND o.address_type = 'origin' JOIN mm_project_addresses d ON d.project_id = p.id AND d.address_type = 'destination'
          WHERE p.status IN ('submitted','quoting') AND NOT EXISTS (SELECT 1 FROM mm_quotes q WHERE q.project_id = p.id AND q.provider_id = $1)
            AND (cardinality($2::text[]) = 0 OR o.region = ANY($2::text[]) OR d.region = ANY($2::text[]))
          ORDER BY p.requested_move_date NULLS LAST LIMIT 50`, [pv.id, '{' + (pv.service_states || []).toString().replace(/[{}"]/g, '') + '}']));
    }
    if (a === 'opportunities' && id && sub === 'quotes' && m === 'POST') {
      if (pv.verification_status !== 'verified') throw forbidden('Your company must be verified before quoting.');
      if (!isUuid(id)) throw notFound();
      const [pr] = await sql("SELECT * FROM mm_projects WHERE id = $1 AND status IN ('submitted','quoting')", [id]);
      if (!pr) throw notFound();
      const [dupQ] = await sql('SELECT quote_number FROM mm_quotes WHERE project_id = $1 AND provider_id = $2', [pr.id, pv.id]);
      if (dupQ) throw new ApiError(409, 'ALREADY_QUOTED', `You already quoted on this project (${dupQ.quote_number}). Revise that quote instead.`);
      const { versionData, items } = priceQuote(body);
      const [q] = await sql("INSERT INTO mm_quotes (project_id, provider_id, quote_number, status, valid_until) VALUES ($1,$2,$3,'issued', now() + make_interval(days => $4)) RETURNING *", [pr.id, pv.id, code('Q'), versionData.valid_days]);
      const ver = await writeVersion(q.id, 1, versionData, items);
      if (pr.status === 'submitted') await moveProject(pr, 'quoting', s.uid, 'First quote received');
      await audit(s.uid, s.email, 'quote.issued', q.quote_number);
      return out({ ...q, version: ver }, 201);
    }
    if (a === 'quotes') {
      if (!id && m === 'GET') return out(await sql(`SELECT q.*, p.project_number, p.status AS project_status, v.version_number, v.total_amount, v.estimate_type FROM mm_quotes q JOIN mm_projects p ON p.id = q.project_id JOIN LATERAL (SELECT * FROM mm_quote_versions WHERE quote_id = q.id ORDER BY version_number DESC LIMIT 1) v ON TRUE WHERE q.provider_id = $1 ORDER BY q.created_at DESC`, [pv.id]));
      if (!isUuid(id)) throw notFound();
      const [q] = await sql('SELECT q.*, p.status AS project_status FROM mm_quotes q JOIN mm_projects p ON p.id = q.project_id WHERE q.id = $1 AND q.provider_id = $2', [id, pv.id]);
      if (!q) throw notFound();
      if (sub === 'versions' && m === 'POST') {
        if (q.status !== 'issued' || !['submitted', 'quoting'].includes(q.project_status)) throw new ApiError(409, 'QUOTE_LOCKED', 'Only open, issued quotes can be revised. Accepted terms never change.');
        const { versionData, items } = priceQuote(body);
        const [mx] = await sql('SELECT max(version_number)::int AS n FROM mm_quote_versions WHERE quote_id = $1', [q.id]);
        const ver = await writeVersion(q.id, Number(mx.n) + 1, versionData, items);
        await sql('UPDATE mm_quotes SET valid_until = now() + make_interval(days => $1) WHERE id = $2', [versionData.valid_days, q.id]);
        await audit(s.uid, s.email, 'quote.revised', q.quote_number + ' v' + ver.version_number);
        return out(ver, 201);
      }
      if (sub === 'withdraw' && m === 'POST') {
        const [u] = await sql("UPDATE mm_quotes SET status = 'withdrawn' WHERE id = $1 AND status = 'issued' RETURNING *", [q.id]);
        if (!u) throw new ApiError(409, 'INVALID_TRANSITION', 'Only issued quotes can be withdrawn.');
        await audit(s.uid, s.email, 'quote.withdrawn', q.quote_number);
        return out(u);
      }
    }
    throw notFound();
  }

  // Server-side pricing (BRS-01): the client sends line items; totals are always computed here.
  function priceQuote(body) {
    const errs = [], et = str(body.estimate_type, 30);
    if (!['binding', 'non_binding', 'binding_not_to_exceed'].includes(et)) errs.push({ field: 'estimate_type', message: 'Choose binding, non-binding or not-to-exceed.' });
    const raw = Array.isArray(body.items) ? body.items.slice(0, 40) : [];
    if (!raw.length) errs.push({ field: 'items', message: 'Add at least one line item.' });
    const items = raw.map((it, i) => { const q = Number(it.quantity), up = cents(it.unit_price), d = str(it.description, 200); if (d.length < 2 || !(q > 0 && q <= 10000) || up === null) errs.push({ field: `items[${i}]`, message: 'Each line needs a description, quantity and price.' }); return { description: d, quantity: q, unit: up ?? 0, total: Math.round((q || 0) * (up ?? 0)) }; });
    const disc = body.discount_amount === undefined || body.discount_amount === '' ? 0 : cents(body.discount_amount), tax = body.tax_amount === undefined || body.tax_amount === '' ? 0 : cents(body.tax_amount);
    if (disc === null) errs.push({ field: 'discount_amount', message: 'Invalid amount.' });
    if (tax === null) errs.push({ field: 'tax_amount', message: 'Invalid amount.' });
    const subtotal = items.reduce((a, b) => a + b.total, 0), total = subtotal - (disc || 0) + (tax || 0);
    if (total < 0) errs.push({ field: 'discount_amount', message: 'Discount is larger than the subtotal.' });
    const vd = parseInt(body.valid_days ?? 14, 10); if (!(vd >= 1 && vd <= 60)) errs.push({ field: 'valid_days', message: 'Validity must be 1–60 days.' });
    if (errs.length) throw bad('Please fix the quote.', errs);
    return { items, versionData: { estimate_type: et, subtotal, discount: disc || 0, tax: tax || 0, total, inclusions: str(body.inclusions, 1000), exclusions: str(body.exclusions, 1000), terms: str(body.terms, 2000), valid_days: vd } };
  }
  async function writeVersion(qid, n, v, items) {
    const [ver] = await sql('INSERT INTO mm_quote_versions (quote_id, version_number, estimate_type, subtotal, discount_amount, tax_amount, total_amount, inclusions, exclusions, terms) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING *', [qid, n, v.estimate_type, fromCents(v.subtotal), fromCents(v.discount), fromCents(v.tax), fromCents(v.total), v.inclusions || null, v.exclusions || null, v.terms || null]);
    for (const it of items) await sql('INSERT INTO mm_quote_items (quote_version_id, description, quantity, unit_price, line_total) VALUES ($1,$2,$3,$4,$5)', [ver.id, it.description, it.quantity, fromCents(it.unit), fromCents(it.total)]);
    return ver;
  }

  // Integration health (INTG-OPS-01 §12): a cheap, non-billable check per provider, with a timeout.
  async function checkIntegration(iid) {
    const [i] = await sql('SELECT * FROM mm_integrations WHERE id = $1', [iid]); if (!i) throw notFound();
    const env = typeof process !== 'undefined' ? process.env : {}; const t0 = Date.now(); let ok = false, detail = '', status;
    const timed = (u, o) => Promise.race([fetch(u, o), new Promise((_, rej) => setTimeout(() => rej(new Error('timeout')), i.timeout_ms))]);
    try {
      if (i.status === 'suspended') { status = 'suspended'; detail = 'Suspended by admin'; }
      else if (i.id === 'neon') { await sql('SELECT 1'); ok = true; detail = 'Query OK'; }
      else if (i.id === 'vercel') { ok = true; detail = 'Serving this request'; }
      else if (i.env_key && !env[i.env_key]) { status = 'planned'; detail = `${i.env_key} not set`; }
      else if (i.id === 'resend') { const r = await timed('https://api.resend.com/domains', { headers: { authorization: 'Bearer ' + env.RESEND_API_KEY } }); ok = r.status < 500 && r.status !== 401 && r.status !== 403; detail = 'HTTP ' + r.status; }
      else { status = 'configuring'; detail = 'Key present; adapter not built yet'; }
    } catch (e) { detail = String(e.message).slice(0, 200); }
    status = status || (ok ? 'active' : 'failed');
    const dur = Date.now() - t0;
    await sql('UPDATE mm_integrations SET status = $1, last_check_at = now(), last_ok_at = CASE WHEN $2 THEN now() ELSE last_ok_at END, last_error = CASE WHEN $2 THEN NULL ELSE $3 END, updated_at = now() WHERE id = $4', [status, ok, detail, iid]);
    await sql('INSERT INTO mm_integration_events (integration_id, event, ok, detail, duration_ms) VALUES ($1, $2, $3, $4, $5)', [iid, 'health_check', ok || status === 'planned' || status === 'suspended', detail, dur]);
    return { id: iid, status, ok, detail, duration_ms: dur };
  }

  // ---------------- admin ----------------
  async function admin(seg, m, body, out) {
    const [a, id, sub] = seg;
    if (a === 'providers' && m === 'GET') return out(await sql(`SELECT pr.id, pr.verification_status, pr.provider_type, pr.service_states, o.name, u.email, u.status AS account_status,
        coalesce((SELECT json_agg(json_build_object('id', v.id, 'check_type', v.check_type, 'reference', v.reference, 'status', v.status, 'expires_on', v.expires_on, 'note', v.note, 'submitted_at', v.submitted_at) ORDER BY v.submitted_at DESC) FROM mm_verifications v WHERE v.provider_id = pr.id), '[]') AS verifications
        FROM mm_providers pr JOIN mm_orgs o ON o.id = pr.org_id JOIN mm_users u ON u.id = o.owner_user_id ORDER BY (pr.verification_status IN ('submitted','under_review')) DESC, pr.created_at DESC LIMIT 200`));
    if (a === 'verifications' && id && m === 'POST') {
      if (!isUuid(id)) throw notFound();
      const st = { approve: 'approved', reject: 'rejected' }[sub]; if (!st) throw notFound();
      const note = str(body.note, 300); if (st === 'rejected' && note.length < 3) throw bad('Give a reason for rejecting.', [{ field: 'note', message: 'Required.' }]);
      const [v] = await sql("UPDATE mm_verifications SET status = $1, note = $2, reviewed_at = now() WHERE id = $3 AND status = 'submitted' RETURNING *", [st, note || null, id]);
      if (!v) throw new ApiError(409, 'INVALID_TRANSITION', 'Only submitted checks can be reviewed.');
      const ps = await refreshVerification(v.provider_id);
      await audit(null, 'admin', 'verification.' + st, v.check_type + ' → provider ' + ps);
      return out({ ...v, provider_status: ps });
    }
    if (a === 'providers' && id && (sub === 'suspend' || sub === 'reinstate') && m === 'POST') {
      if (!isUuid(id)) throw notFound();
      if (sub === 'suspend') { if (str(body.reason, 300).length < 3) throw bad('Give a reason.', [{ field: 'reason', message: 'Required.' }]); await sql("UPDATE mm_providers SET verification_status = 'suspended', updated_at = now() WHERE id = $1", [id]); }
      else { await sql("UPDATE mm_providers SET verification_status = 'under_review' WHERE id = $1 AND verification_status = 'suspended'", [id]); await refreshVerification(id); }
      await audit(null, 'admin', 'provider.' + sub, id);
      return out({ ok: true });
    }
    if (a === 'projects' && m === 'GET') return out(await sql("SELECT p.id, p.project_number, p.status, p.project_type, p.requested_move_date, p.created_at, u.email AS customer_email, (SELECT count(*)::int FROM mm_quotes q WHERE q.project_id = p.id) AS quotes FROM mm_projects p JOIN mm_users u ON u.id = p.customer_user_id ORDER BY p.created_at DESC LIMIT 200"));
    if (a === 'bookings' && m === 'GET') return out(await sql("SELECT b.booking_number, b.status, b.agreed_total, b.currency_code, b.scheduled_date, b.created_at, p.project_number, o.name AS provider FROM mm_bookings b JOIN mm_projects p ON p.id = b.project_id JOIN mm_providers pv ON pv.id = b.provider_id JOIN mm_orgs o ON o.id = pv.org_id ORDER BY b.created_at DESC LIMIT 200"));
    if (a === 'feature-flags' && m === 'GET') return out(await sql('SELECT * FROM mm_feature_flags ORDER BY flag_key'));
    if (a === 'feature-flags' && id && m === 'PUT') { const [f] = await sql('UPDATE mm_feature_flags SET enabled = $1, updated_at = now() WHERE flag_key = $2 RETURNING *', [body.enabled === true, str(id, 60)]); if (!f) throw notFound(); await audit(null, 'admin', 'flag.' + (f.enabled ? 'on' : 'off'), f.flag_key); return out(f); }
    if (a === 'integrations' && !id && m === 'GET') return out(await sql("SELECT i.*, (SELECT count(*)::int FROM mm_integration_events e WHERE e.integration_id = i.id AND NOT e.ok AND e.created_at > now() - interval '24 hours') AS failures_24h FROM mm_integrations i ORDER BY i.category"));
    if (a === 'integrations' && id && !sub && m === 'GET') { const [i] = await sql('SELECT * FROM mm_integrations WHERE id = $1', [str(id, 40)]); if (!i) throw notFound(); return out({ ...i, events: await sql('SELECT event, ok, detail, duration_ms, created_at FROM mm_integration_events WHERE integration_id = $1 ORDER BY created_at DESC LIMIT 50', [i.id]) }); }
    if (a === 'integrations' && id && sub === 'health-check' && m === 'POST') { const r = await checkIntegration(str(id, 40)); await audit(null, 'admin', 'integration.health_check', id + ':' + r.status); return out(r); }
    if (a === 'integrations' && id && (sub === 'suspend' || sub === 'activate') && m === 'POST') {
      const [i] = await sql("UPDATE mm_integrations SET status = $1, updated_at = now() WHERE id = $2 RETURNING *", [sub === 'suspend' ? 'suspended' : 'configuring', str(id, 40)]); if (!i) throw notFound();
      await sql('INSERT INTO mm_integration_events (integration_id, event, ok, detail) VALUES ($1,$2,TRUE,$3)', [i.id, sub, str(body.reason, 200) || null]); await audit(null, 'admin', 'integration.' + sub, i.id);
      return out(sub === 'activate' ? await checkIntegration(i.id) : i);
    }
    if (a === 'metrics' && m === 'GET') {
      const [c] = await sql(`SELECT (SELECT count(*)::int FROM mm_projects) AS projects, (SELECT count(*)::int FROM mm_projects WHERE status IN ('submitted','quoting')) AS open_projects,
        (SELECT count(*)::int FROM mm_quotes) AS quotes, (SELECT count(*)::int FROM mm_bookings WHERE status <> 'cancelled') AS active_bookings,
        (SELECT count(*)::int FROM mm_providers WHERE verification_status = 'verified') AS verified_providers, (SELECT count(*)::int FROM mm_verifications WHERE status = 'submitted') AS checks_waiting`);
      return out(c);
    }
    throw notFound();
  }
}
function url_q(req, k) { try { return new URL(req.url).searchParams.get(k) || ''; } catch { return ''; } }
