// MoveMatch server layer (Vercel Routing Middleware, Edge runtime).
// 1) Protects private dashboards.  2) Real backend API under /api/* backed by Neon Postgres.
// Secrets come only from environment variables: ADMIN_PASSWORD, ADMIN_USERNAME (optional), DATABASE_URL (added by the Neon integration).
const PROTECTED = ['/super-admin', '/dashboard', '/company-os', '/partner-os', '/operations-os', '/enterprise/portal', '/developer/portal'];
// Which signed-in account roles may open which dashboard (admin may open all)
const ROLE_PATHS = { customer: '/dashboard', company: '/company-os', partner: '/partner-os', enterprise: '/enterprise/portal', developer: '/developer/portal' };
const APP_OF_ROLE = { customer: 'customer', company: 'company', partner: 'partner', enterprise: 'enterprise', developer: 'developer' };
const ALIASES = {"/how-it-works":"/how-it-works/","/about":"/about/","/contact":"/contact/","/moving-services":"/services/residential-moving/","/local-moving":"/movers/local/","/long-distance-moving":"/movers/long-distance/","/interstate-moving":"/movers/interstate/","/residential-moving":"/services/residential-moving/","/commercial-moving":"/services/commercial-moving/","/office-moving":"/services/office-moving/","/apartment-moving":"/services/apartment-moving/","/packing-services":"/services/packing/","/loading-unloading":"/services/loading/","/storage":"/services/storage/","/specialty-moving":"/white-glove-moving/","/furniture-moving":"/services/heavy-furniture-moving/","/piano-moving":"/services/piano-moving/","/moving-companies":"/movers/search/","/search":"/search/","/get-quotes":"/get-quotes/","/booking/checkout":"/booking/","/moving-cost-calculator":"/tools/moving-cost-calculator/","/moving-distance-calculator":"/tools/moving-route-planner/","/moving-checklist":"/tools/moving-checklist/","/guides":"/moving-guides/","/resources":"/learn/","/reviews":"/reviews/","/blog":"/moving-blog/","/become-a-mover":"/for-movers/register/","/become-a-partner":"/signup/?role=partner","/register":"/signup/","/forgot-password":"/forgot-password/","/privacy-policy":"/legal/privacy/","/terms":"/legal/terms/","/cookie-policy":"/legal/cookies/","/accessibility":"/legal/accessibility/","/faq":"/faqs/","/moving-companies/:slug":"/movers/profile/:slug/","/quotes/:id":"/compare-quotes/","/booking/confirmation/:id":"/my-bookings/","/guides/:slug":"/moving-guides/","/blog/:slug":"/moving-blog/","/customer/dashboard":"/dashboard/","/customer/profile":"/dashboard/#security","/customer/profile/personal":"/dashboard/#security","/customer/addresses":"/dashboard/#projects","/customer/addresses/:id":"/dashboard/#projects","/customer/moving-requests":"/dashboard/#requests","/customer/moving-requests/:id":"/dashboard/#requests","/customer/moving-requests/new":"/dashboard/#request","/customer/quotes":"/dashboard/#quotes","/customer/quotes/:id":"/dashboard/#quotes","/customer/quotes/compare":"/dashboard/#compare","/customer/bookings":"/dashboard/#bookings","/customer/bookings/:id":"/dashboard/#bookings","/customer/bookings/:id/modify":"/dashboard/#bookings","/customer/bookings/:id/tracking":"/dashboard/#bookings","/customer/payments":"/dashboard/#payments","/customer/payments/:id":"/dashboard/#payments","/customer/invoices":"/dashboard/#payments","/customer/documents":"/dashboard/#docs","/customer/messages":"/dashboard/#messages","/customer/messages/:id":"/dashboard/#messages","/customer/notifications":"/dashboard/#notif","/customer/reviews":"/dashboard/#reviews","/customer/reviews/new/:id":"/dashboard/#reviews","/customer/support":"/dashboard/#support","/customer/support/:id":"/dashboard/#support","/customer/settings":"/dashboard/#security","/customer/settings/security":"/dashboard/#security","/company/dashboard":"/company-os/","/company/profile":"/company-os/#permissions","/company/verification":"/company-os/#partners","/company/verification/documents":"/company-os/#partners","/company/services":"/company-os/#pricing","/company/services/:id":"/company-os/#pricing","/company/service-areas":"/company-os/#pricing","/company/leads":"/company-os/#leads","/company/leads/:id":"/company-os/#leads","/company/quotes":"/company-os/#quotes","/company/quotes/new":"/company-os/#quotes","/company/quotes/:id":"/company-os/#quotes","/company/bookings":"/company-os/#bookings","/company/bookings/:id":"/company-os/#bookings","/company/scheduling":"/company-os/#calendar","/company/dispatch":"/company-os/#dispatch","/company/customers":"/company-os/#customers","/company/customers/:id":"/company-os/#customers","/company/employees":"/company-os/#crews","/company/employees/:id":"/company-os/#crews","/company/financials":"/company-os/#finance","/company/transactions":"/company-os/#finance","/company/invoices":"/company-os/#invoices","/company/reviews":"/company-os/#claims","/company/marketing":"/company-os/#automation","/company/analytics":"/company-os/#finance","/company/team":"/company-os/#permissions","/company/settings":"/company-os/#permissions","/partner/dashboard":"/partner-os/","/partner/profile":"/partner-os/#onboarding","/partner/registration":"/partner-os/#onboarding","/partner/verification":"/partner-os/#verification","/partner/services":"/partner-os/#catalogue","/partner/services/:id":"/partner-os/#catalogue","/partner/service-areas":"/partner-os/#coverage","/partner/opportunities":"/partner-os/#leads","/partner/opportunities/:id":"/partner-os/#leads","/partner/orders":"/partner-os/#jobs","/partner/orders/:id":"/partner-os/#jobs","/partner/availability":"/partner-os/#calendar","/partner/schedule":"/partner-os/#calendar","/partner/pricing":"/partner-os/#catalogue","/partner/earnings":"/partner-os/#earnings","/partner/payouts":"/partner-os/#earnings","/partner/invoices":"/partner-os/#invoices","/partner/reviews":"/partner-os/#support","/partner/messages":"/partner-os/#support","/partner/analytics":"/partner-os/#earnings","/partner/team":"/partner-os/#team","/partner/settings":"/partner-os/#onboarding","/crew/dashboard":"/operations-os/","/crew/jobs":"/operations-os/#field","/crew/jobs/:id":"/operations-os/#field","/crew/schedule":"/operations-os/#jobs","/crew/dispatch":"/operations-os/#dispatch","/crew/members":"/operations-os/#workers","/crew/members/:id":"/operations-os/#workers","/crew/vehicles":"/operations-os/#fleet","/crew/vehicles/:id":"/operations-os/#fleet","/crew/inspections":"/operations-os/#inspections","/crew/maintenance":"/operations-os/#maint","/crew/checklists":"/operations-os/#field","/crew/inventory":"/operations-os/#equipment","/crew/documents":"/operations-os/#drivers","/crew/time-tracking":"/operations-os/#workers","/crew/incidents":"/operations-os/#incidents","/crew/tracking":"/operations-os/#control","/crew/notifications":"/operations-os/#control","/crew/profile":"/operations-os/#drivers","/enterprise/dashboard":"/enterprise/portal/","/enterprise/organization":"/enterprise/portal/#employees","/enterprise/locations":"/enterprise/portal/#employees","/enterprise/locations/:id":"/enterprise/portal/#employees","/enterprise/business-units":"/enterprise/portal/#budgets","/enterprise/employees":"/enterprise/portal/#employees","/enterprise/employees/:id":"/enterprise/portal/#employees","/enterprise/programs":"/enterprise/portal/#programs","/enterprise/programs/:id":"/enterprise/portal/#programs","/enterprise/move-requests":"/enterprise/portal/#cases","/enterprise/move-requests/:id":"/enterprise/portal/#cases","/enterprise/bookings":"/enterprise/portal/#cases","/enterprise/bookings/:id":"/enterprise/portal/#cases","/enterprise/vendors":"/enterprise/portal/#vendors","/enterprise/vendors/:id":"/enterprise/portal/#vendors","/enterprise/procurement":"/enterprise/portal/#pos","/enterprise/approvals":"/enterprise/portal/#approvals","/enterprise/cost-centers":"/enterprise/portal/#budgets","/enterprise/budgets":"/enterprise/portal/#budgets","/enterprise/invoices":"/enterprise/portal/#invoices","/enterprise/contracts":"/enterprise/portal/#docs","/enterprise/reports":"/enterprise/portal/#analytics","/enterprise/analytics":"/enterprise/portal/#analytics","/enterprise/team":"/enterprise/portal/#employees","/enterprise/settings":"/enterprise/portal/#policies","/developers/dashboard":"/developer/portal/","/developers/dashboard/apps":"/developer/portal/#apps","/developers/dashboard/apps/:id":"/developer/portal/#apps","/developers/dashboard/credentials":"/developer/portal/#keys","/developers/dashboard/webhooks":"/developer/portal/#webhooks","/developers/dashboard/usage":"/developer/portal/#logs","/developers/dashboard/logs":"/developer/portal/#logs","/developers/dashboard/sandbox":"/developer/portal/#explorer","/developers/dashboard/team":"/developer/portal/","/developers/dashboard/settings":"/developer/portal/","/developers":"/developer/docs/","/developers/docs":"/developer/docs/","/developers/docs/api":"/developer/api/","/developers/docs/authentication":"/developer/docs/","/developers/docs/reference":"/developer/api/","/developers/docs/reference/:id":"/developer/api/","/developers/docs/webhooks":"/developer/docs/","/developers/docs/sdks":"/developer/portal/#sdk","/developers/docs/quickstart":"/developer/docs/","/developers/changelog":"/developer/portal/#changelog","/developers/status":"/api/health","/developers/login":"/login/","/developers/register":"/signup/?role=developer","/admin/dashboard":"/super-admin/","/admin/users":"/super-admin/data/","/admin/users/:id":"/super-admin/data/","/admin/customers":"/super-admin/data/","/admin/companies":"/super-admin/data/","/admin/companies/:id":"/super-admin/data/","/admin/companies/verification":"/super-admin/data/","/admin/companies/verification/:id":"/super-admin/data/","/admin/partners":"/super-admin/data/","/admin/crew":"/super-admin/","/admin/fleet":"/super-admin/","/admin/enterprises":"/super-admin/data/","/admin/bookings":"/super-admin/","/admin/bookings/:id":"/super-admin/","/admin/quotes":"/super-admin/data/","/admin/leads":"/super-admin/data/","/admin/payments":"/super-admin/","/admin/refunds":"/super-admin/","/admin/commissions":"/super-admin/","/admin/reviews":"/super-admin/","/admin/disputes":"/super-admin/","/admin/support":"/super-admin/","/admin/support/:id":"/super-admin/","/admin/cms":"/super-admin/","/admin/cms/pages/:id":"/super-admin/","/admin/locations":"/super-admin/","/admin/services":"/super-admin/","/admin/pricing":"/super-admin/","/admin/promotions":"/super-admin/","/admin/reports":"/super-admin/","/admin/analytics":"/super-admin/","/admin/notifications":"/super-admin/","/admin/audit-logs":"/super-admin/data/","/admin/access-control":"/super-admin/","/admin/settings":"/super-admin/","/admin":"/super-admin/","/customer":"/dashboard/","/company":"/company-os/","/partner":"/partner-os/","/crew":"/operations-os/"};
const ALIAS_EXACT = new Map(), ALIAS_DYN = [];
for (const [k, v] of Object.entries(ALIASES)) { if (k.includes(':')) ALIAS_DYN.push([new RegExp('^' + k.replace(/:[a-z]+/g, '([^/]+)') + '$'), v, k.includes(':slug')]); else ALIAS_EXACT.set(k, v); }
function aliasFor(P) { if (ALIAS_EXACT.has(P)) return ALIAS_EXACT.get(P); for (const [re, v, keep] of ALIAS_DYN) { const m = P.match(re); if (m) return keep ? v.replace(':slug', m[1]) : v; } return null; }
export const config = { matcher: ['/((?!_next|.*\.[a-z0-9]+$).*)', '/sa.js', '/os.js', '/os-config.js'] };

const ADMIN_COOKIE = 'mm_admin', USER_COOKIE = 'mm_s';
const MAX_AGE = 60 * 60 * 8, USER_AGE = 60 * 60 * 24 * 7;
const enc = new TextEncoder();
const hex = b => [...new Uint8Array(b)].map(x => x.toString(16).padStart(2, '0')).join('');
const b64u = s => btoa(unescape(encodeURIComponent(s))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const unb64u = s => decodeURIComponent(escape(atob(s.replace(/-/g, '+').replace(/_/g, '/'))));
async function hmac(key, msg) { const k = await crypto.subtle.importKey('raw', enc.encode(key), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']); return hex(await crypto.subtle.sign('HMAC', k, enc.encode(msg))); }
const adminToken = (pw, day) => hmac(pw, 'movematch-admin-v1|' + day);
function safeEqual(a, b) { if (typeof a !== 'string' || typeof b !== 'string' || a.length !== b.length) return false; let r = 0; for (let i = 0; i < a.length; i++) r |= a.charCodeAt(i) ^ b.charCodeAt(i); return r === 0; }
const cookieOf = (req, n) => (req.headers.get('cookie') || '').split(/;\s*/).map(c => [c.slice(0, c.indexOf('=')), c.slice(c.indexOf('=') + 1)]).find(c => c[0] === n)?.[1] || '';
const pass = () => new Response(null, { headers: { 'x-middleware-next': '1' } });
const noStore = { 'cache-control': 'no-store', 'x-robots-tag': 'noindex, nofollow', 'content-type': 'text/html; charset=utf-8' };
const json = (data, status = 200, extra = {}) => new Response(JSON.stringify(data), { status, headers: { 'content-type': 'application/json', 'cache-control': 'no-store', ...extra } });
const secretKey = () => 'mm-session-v1|' + (process.env.DATABASE_URL || process.env.STORAGE_URL || '') + '|' + (process.env.ADMIN_PASSWORD || '');

/* ---------------- Neon Postgres over HTTPS (no packages needed) ---------------- */
function dbUrl() { return process.env.DATABASE_URL || process.env.STORAGE_URL || process.env.POSTGRES_URL || ''; }
async function sql(query, params = []) {
  const cs = dbUrl(); if (!cs) throw new Error('Database not configured');
  const host = new URL(cs.replace(/^postgres(ql)?:/, 'https:')).hostname;
  const r = await fetch(`https://${host}/sql`, { method: 'POST', headers: { 'Neon-Connection-String': cs, 'Neon-Raw-Text-Output': 'true', 'Neon-Array-Mode': 'false', 'content-type': 'application/json' }, body: JSON.stringify({ query, params }) });
  const t = await r.text(); let j; try { j = JSON.parse(t); } catch { throw new Error('DB error ' + r.status); }
  if (!r.ok) throw new Error(j.message || ('DB error ' + r.status));
  return j.rows || [];
}
let schemaReady = false;
async function ensureSchema() {
  if (schemaReady) return;
  for (const q of [
    `CREATE TABLE IF NOT EXISTS mm_users (id SERIAL PRIMARY KEY, email TEXT UNIQUE NOT NULL, name TEXT NOT NULL, role TEXT NOT NULL, company TEXT, pass_hash TEXT NOT NULL, salt TEXT NOT NULL, created_at TIMESTAMPTZ DEFAULT now(), last_login TIMESTAMPTZ)`,
    `CREATE TABLE IF NOT EXISTS mm_app_state (user_id INT NOT NULL REFERENCES mm_users(id) ON DELETE CASCADE, app TEXT NOT NULL, data JSONB NOT NULL, updated_at TIMESTAMPTZ DEFAULT now(), PRIMARY KEY (user_id, app))`,
    `CREATE TABLE IF NOT EXISTS mm_quote_requests (id SERIAL PRIMARY KEY, ref TEXT UNIQUE NOT NULL, user_id INT REFERENCES mm_users(id) ON DELETE SET NULL, email TEXT, data JSONB NOT NULL, status TEXT NOT NULL DEFAULT 'New', created_at TIMESTAMPTZ DEFAULT now())`,
    `ALTER TABLE mm_users ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'pending'`,
    `ALTER TABLE mm_users ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMPTZ`,
    `ALTER TABLE mm_users ADD COLUMN IF NOT EXISTS review_note TEXT`,
    `CREATE TABLE IF NOT EXISTS mm_audit (id SERIAL PRIMARY KEY, user_id INT, actor TEXT, action TEXT NOT NULL, ref TEXT, at TIMESTAMPTZ DEFAULT now())`,
    `CREATE TABLE IF NOT EXISTS mm_resets (token_hash TEXT PRIMARY KEY, user_id INT NOT NULL REFERENCES mm_users(id) ON DELETE CASCADE, expires_at TIMESTAMPTZ NOT NULL, used_at TIMESTAMPTZ)`
  ]) await sql(q);
  schemaReady = true;
}
const audit = (uid, actor, action, ref = '') => sql('INSERT INTO mm_audit (user_id, actor, action, ref) VALUES ($1,$2,$3,$4)', [uid, actor, action, ref]).catch(() => {});

/* ---------------- email (Resend) ---------------- */
const mailKey = () => (typeof process !== 'undefined' && process.env && process.env.RESEND_API_KEY) || '';
const mailFrom = () => (typeof process !== 'undefined' && process.env && process.env.MAIL_FROM) || 'MoveMatch <onboarding@resend.dev>';
const escH = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const mailWrap = (title, inner) => `<div style="font-family:Arial,sans-serif;max-width:560px;margin:auto;color:#102A43"><div style="background:#102A43;color:#fff;padding:16px 20px;font-weight:bold;font-size:18px">MoveMatch</div><div style="padding:20px;border:1px solid #e2e8f0"><h2 style="margin-top:0">${escH(title)}</h2>${inner}<p style="color:#64748b;font-size:12px;margin-top:24px">You received this because of activity on your MoveMatch account or request. If this wasn't you, ignore this email.</p></div></div>`;
async function sendMail(to, subject, html) {
  const key = mailKey(); if (!key || !to) return { sent: false, reason: 'not configured' };
  try { const r = await fetch('https://api.resend.com/emails', { method: 'POST', headers: { authorization: 'Bearer ' + key, 'content-type': 'application/json' }, body: JSON.stringify({ from: mailFrom(), to: [to], subject, html }) }); const ok = r.ok; await audit(null, 'system', ok ? 'email_sent' : 'email_failed:' + r.status, subject.slice(0, 60)); return { sent: ok }; } catch (e) { await audit(null, 'system', 'email_error', String(e.message).slice(0, 60)); return { sent: false }; }
}
const sha256 = async s => hex(await crypto.subtle.digest('SHA-256', enc.encode(s)));

/* ---------------- passwords & sessions ---------------- */
async function hashPw(pw, salt) { const k = await crypto.subtle.importKey('raw', enc.encode(pw), 'PBKDF2', false, ['deriveBits']); return hex(await crypto.subtle.deriveBits({ name: 'PBKDF2', salt: enc.encode(salt), iterations: 100000, hash: 'SHA-256' }, k, 256)); }
async function makeSession(u) { const body = b64u(JSON.stringify({ uid: u.id, role: u.role, name: u.name, email: u.email, exp: Date.now() + USER_AGE * 1000 })); return body + '.' + await hmac(secretKey(), body); }
async function readSession(req) {
  const c = cookieOf(req, USER_COOKIE); if (!c || !c.includes('.')) return null;
  const [body, sig] = c.split('.'); if (!safeEqual(sig, await hmac(secretKey(), body))) return null;
  try { const s = JSON.parse(unb64u(body)); return s.exp > Date.now() ? s : null; } catch { return null; }
}
async function isAdmin(req) {
  const PW = process.env.ADMIN_PASSWORD || ''; const c = cookieOf(req, ADMIN_COOKIE); if (!PW || !c) return false;
  const day = Math.floor(Date.now() / 86400000); const [t0, t1] = await Promise.all([adminToken(PW, day), adminToken(PW, day - 1)]);
  return safeEqual(c, t0) || safeEqual(c, t1);
}
const userCookie = v => `${USER_COOKIE}=${v}; Path=/; Max-Age=${v ? USER_AGE : 0}; HttpOnly; Secure; SameSite=Lax`;
const ROLES = ['customer', 'company', 'partner', 'enterprise', 'developer'];
const hits = new Map();
function limited(req, key, max) { const ip = req.headers.get('x-forwarded-for')?.split(',')[0] || 'x'; const k = key + ip, now = Date.now(); const a = (hits.get(k) || []).filter(t => now - t < 600000); a.push(now); hits.set(k, a); return a.length > max; }

async function activeUser(s) { if (!s) return null; try { await ensureSchema(); const [u] = await sql('SELECT status FROM mm_users WHERE id=$1', [s.uid]); return u && u.status === 'approved' ? s : null; } catch { return null; } }
/* ---------------- API ---------------- */
async function api(req, url) {
  const p = url.pathname.replace(/\/$/, ''), m = req.method;
  if (p === '/api/health') { try { await ensureSchema(); const [u] = await sql('SELECT count(*)::int AS n FROM mm_users'); return json({ ok: true, database: 'connected', users: u.n, email: mailKey() ? 'configured' : 'not configured' }); } catch (e) { return json({ ok: false, database: dbUrl() ? 'error' : 'not configured', error: String(e.message) }, 503); } }
  if (!dbUrl()) return json({ error: 'Database not configured' }, 503);
  if (m !== 'GET' && m !== 'HEAD') { const o = req.headers.get('origin'); if (o && new URL(o).host !== url.host) return json({ error: 'Bad origin' }, 403); }
  await ensureSchema();
  const body = m === 'POST' || m === 'PUT' ? await req.json().catch(() => ({})) : {};

  if (p === '/api/forgot' && m === 'POST') {
    if (limited(req, 'fp', 5)) return json({ error: 'Too many attempts. Try again later.' }, 429);
    const email = String(body.email || '').trim().toLowerCase(); if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return json({ error: 'Enter a valid email.' }, 400);
    if (!mailKey()) return json({ error: 'Email reset is not switched on yet. Please contact support.' }, 503);
    const [u] = await sql("SELECT id,name FROM mm_users WHERE email=$1 AND status IN ('approved','pending')", [email]);
    if (u) { const t = crypto.randomUUID().replace(/-/g, '') + crypto.randomUUID().replace(/-/g, ''); await sql("INSERT INTO mm_resets (token_hash,user_id,expires_at) VALUES ($1,$2,now()+interval '1 hour')", [await sha256(t), u.id]); const link = new URL(req.url).origin + '/reset-password/?t=' + t; await sendMail(email, 'Reset your MoveMatch password', mailWrap('Reset your password', `<p>Hi ${escH(u.name)},</p><p>Use the button below within 1 hour to choose a new password.</p><p><a href="${link}" style="background:#0F8F81;color:#fff;padding:10px 18px;text-decoration:none;border-radius:6px">Choose a new password</a></p>`)); await audit(u.id, email, 'password_reset_requested'); }
    return json({ ok: true, done: true, message: 'If an account exists for that email, a reset link is on its way. It expires in 1 hour.' });
  }
  if (p === '/api/reset' && m === 'POST') {
    if (limited(req, 'rp', 10)) return json({ error: 'Too many attempts. Try again later.' }, 429);
    const t = String(body.t || ''), pw = String(body.password || ''); if (!/^[a-f0-9]{64}$/.test(t)) return json({ error: 'This reset link is invalid.' }, 400);
    if (pw.length < 8) return json({ error: 'Password must be at least 8 characters.' }, 400);
    const th = await sha256(t); const [r] = await sql('SELECT user_id FROM mm_resets WHERE token_hash=$1 AND used_at IS NULL AND expires_at > now()', [th]);
    if (!r) return json({ error: 'This reset link has expired or was already used. Request a new one.' }, 400);
    const salt = crypto.randomUUID(); await sql('UPDATE mm_users SET pass_hash=$1, salt=$2 WHERE id=$3', [await hashPw(pw, salt), salt, r.user_id]); await sql('UPDATE mm_resets SET used_at=now() WHERE user_id=$1 AND used_at IS NULL', [r.user_id]); await audit(r.user_id, 'user', 'password_reset_done');
    return json({ ok: true, done: true, message: 'Your password has been changed. You can now log in.' });
  }
  if (p === '/api/signup' && m === 'POST') {
    if (limited(req, 'su', 10)) return json({ error: 'Too many attempts. Try again later.' }, 429);
    const email = String(body.email || '').trim().toLowerCase(), name = String(body.name || '').trim().slice(0, 120), pw = String(body.password || ''), role = ROLES.includes(body.role) ? body.role : 'customer', company = String(body.company || '').trim().slice(0, 160);
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return json({ error: 'Enter a valid email.' }, 400);
    if (name.length < 2) return json({ error: 'Enter your name.' }, 400);
    if (pw.length < 8) return json({ error: 'Password must be at least 8 characters.' }, 400);
    if (role !== 'customer' && company.length < 2) return json({ error: 'Enter your business name.' }, 400);
    const exists = await sql('SELECT id FROM mm_users WHERE email=$1', [email]); if (exists.length) return json({ error: 'An account with this email already exists. Log in instead.' }, 409);
    const salt = crypto.randomUUID(); const h = await hashPw(pw, salt);
    const [u] = await sql("INSERT INTO mm_users (email,name,role,company,pass_hash,salt,status) VALUES ($1,$2,$3,$4,$5,$6,'pending') RETURNING id,email,name,role,company,status", [email, name, role, company || null, h, salt]);
    await audit(u.id, email, 'signup', role);
    await sendMail(email, 'We received your MoveMatch application', mailWrap('Application received', `<p>Hi ${escH(name)},</p><p>Thanks for signing up as a <b>${escH(role)}</b>. Your account is pending review by the MoveMatch team. We will email you as soon as it is approved.</p>`));
    return json({ ok: true, pending: true, message: 'Thanks! Your account is pending approval by the MoveMatch team. You can log in once it is approved.' }, 201);
  }
  if (p === '/api/login' && m === 'POST') {
    if (limited(req, 'li', 20)) return json({ error: 'Too many attempts. Wait 10 minutes.' }, 429);
    const email = String(body.email || '').trim().toLowerCase(), pw = String(body.password || '');
    const [u] = await sql('SELECT id,email,name,role,company,pass_hash,salt,status,review_note FROM mm_users WHERE email=$1', [email]);
    const h = u ? await hashPw(pw, u.salt) : await hashPw(pw, 'dummy-salt');
    if (!u || !safeEqual(h, u.pass_hash)) { await new Promise(r => setTimeout(r, 400)); return json({ error: 'Incorrect email or password.' }, 401); }
    if (u.status !== 'approved') { await audit(u.id, email, 'login_blocked:' + u.status); const msg = { pending: 'Your account is still pending approval by the MoveMatch team.', rejected: 'Your application was not approved.' + (u.review_note ? ' Reason: ' + u.review_note : '') + ' Contact support if you think this is a mistake.', suspended: 'Your account is suspended. Contact MoveMatch support.' }[u.status] || 'Your account is not active.'; return json({ error: msg, status: u.status }, 403); }
    await sql('UPDATE mm_users SET last_login=now() WHERE id=$1', [u.id]); await audit(u.id, email, 'login');
    const pub = { id: u.id, email: u.email, name: u.name, role: u.role, company: u.company };
    return json({ ok: true, user: pub, home: ROLE_PATHS[u.role] + '/' }, 200, { 'set-cookie': userCookie(await makeSession(pub)) });
  }
  if (p === '/api/logout') return json({ ok: true }, 200, { 'set-cookie': userCookie('') });
  if (p === '/api/me') { const s = await activeUser(await readSession(req)); return s ? json({ user: { id: s.uid, name: s.name, email: s.email, role: s.role }, home: ROLE_PATHS[s.role] + '/' }) : json({ user: null }, 401); }

  if (p.startsWith('/api/state/')) {
    const app = p.split('/')[3]; const s = await activeUser(await readSession(req));
    if (!s) return json({ error: 'Sign in required' }, 401);
    if (APP_OF_ROLE[s.role] !== app) return json({ error: 'This account cannot use that dashboard' }, 403);
    if (m === 'GET') { const [r] = await sql('SELECT data, updated_at FROM mm_app_state WHERE user_id=$1 AND app=$2', [s.uid, app]); return json({ data: r ? r.data : null, updated_at: r ? r.updated_at : null }); }
    if (m === 'PUT') { const txt = JSON.stringify(body.data ?? null); if (txt.length > 900000) return json({ error: 'Too large' }, 413); await sql('INSERT INTO mm_app_state (user_id,app,data,updated_at) VALUES ($1,$2,$3::jsonb,now()) ON CONFLICT (user_id,app) DO UPDATE SET data=EXCLUDED.data, updated_at=now()', [s.uid, app, txt]); return json({ ok: true, saved_at: new Date().toISOString() }); }
  }
  if (p === '/api/quotes' && m === 'POST') {
    if (limited(req, 'q', 15)) return json({ error: 'Too many requests. Try again later.' }, 429);
    const d = body.data || {}; const f = d.f || {}; if (!f.from || !f.to) return json({ error: 'Missing move details' }, 400);
    const s = await readSession(req); const ref = 'MM-' + crypto.randomUUID().replace(/-/g, '').slice(0, 6).toUpperCase();
    const email = String(f.email || s?.email || '').slice(0, 200);
    const raw = JSON.stringify(d); if (raw.length > 600000) return json({ error: 'Request too large — remove some photos.' }, 413);
    if (email) { const [dup] = await sql("SELECT ref FROM mm_quote_requests WHERE lower(email)=lower($1) AND data->'f'->>'from'=$2 AND data->'f'->>'to'=$3 AND coalesce(data->'f'->>'date','')=$4 AND created_at > now() - interval '24 hours' LIMIT 1", [email, String(f.from), String(f.to), String(f.date || '')]); if (dup) return json({ ok: true, ref: dup.ref, duplicate: true }, 200); }
    await sql('INSERT INTO mm_quote_requests (ref,user_id,email,data) VALUES ($1,$2,$3,$4::jsonb)', [ref, s?.uid || null, email, raw]);
    await audit(s?.uid || null, email || 'guest', 'quote_request', ref);
    if (email) await sendMail(email, 'Your moving request ' + ref, mailWrap('Request received — ' + ref, `<p>We received your moving request from <b>${escH(f.from)}</b> to <b>${escH(f.to)}</b>${f.date ? ' on <b>' + escH(f.date) + '</b>' : ''}.</p><p>Keep your reference <b>${ref}</b>. You can check its status at ${new URL(req.url).origin}/track-my-move/.</p>`));
    return json({ ok: true, ref }, 201);
  }
  if (p === '/api/quotes/mine') { const s = await readSession(req); if (!s) return json({ error: 'Sign in required' }, 401); return json({ requests: await sql('SELECT ref,status,data,created_at FROM mm_quote_requests WHERE user_id=$1 OR email=$2 ORDER BY id DESC LIMIT 50', [s.uid, s.email]) }); }
  if (p === '/api/track') { const ref = String(url.searchParams.get('ref') || '').toUpperCase(); if (!/^MM-[A-Z0-9]{4,8}$/.test(ref)) return json({ error: 'Invalid reference' }, 400); const [r] = await sql("SELECT ref,status,created_at,data->'f'->>'from' AS frm,data->'f'->>'to' AS dest FROM mm_quote_requests WHERE ref=$1", [ref]); return r ? json({ request: r }) : json({ error: 'Not found' }, 404); }

  if (p.startsWith('/api/admin/')) {
    if (!(await isAdmin(req))) return json({ error: 'Admin only' }, 401);
    if (p === '/api/admin/overview') {
      const [c] = await sql("SELECT (SELECT count(*)::int FROM mm_users) users,(SELECT count(*)::int FROM mm_quote_requests) quotes,(SELECT count(*)::int FROM mm_quote_requests WHERE status='New') new_quotes,(SELECT count(*)::int FROM mm_app_state) states,(SELECT count(*)::int FROM mm_users WHERE status='pending') pending");
      const roles = await sql('SELECT role, count(*)::int n FROM mm_users GROUP BY role ORDER BY n DESC');
      const users = await sql("SELECT id,email,name,role,company,status,review_note,created_at,last_login FROM mm_users ORDER BY (status='pending') DESC, id DESC LIMIT 200");
      const quotes = await sql("SELECT id,ref,email,status,created_at,data->'f'->>'from' AS frm,data->'f'->>'to' AS dest,data->'f'->>'date' AS move_date FROM mm_quote_requests ORDER BY id DESC LIMIT 100");
      const log = await sql('SELECT actor,action,ref,at FROM mm_audit ORDER BY id DESC LIMIT 50');
      return json({ counts: c, roles, users, quotes, audit: log });
    }
    if (p === '/api/admin/user-status' && m === 'POST') { const st = ['approved', 'rejected', 'suspended', 'pending'].includes(body.status) ? body.status : null; const id = parseInt(body.id, 10); if (!st || !id) return json({ error: 'Bad request' }, 400); const [u] = await sql('UPDATE mm_users SET status=$1, reviewed_at=now(), review_note=$2 WHERE id=$3 RETURNING id,email,status', [st, String(body.note || '').slice(0, 300) || null, id]); if (!u) return json({ error: 'User not found' }, 404); await audit(id, 'admin', 'account_' + st, u.email); const site = new URL(req.url).origin; const note = String(body.note || '').slice(0, 300); const msgs = { approved: ['Your MoveMatch account is approved', 'Account approved', `<p>Good news — your account is now active.</p><p><a href="${site}/login/" style="background:#0F8F81;color:#fff;padding:10px 18px;text-decoration:none;border-radius:6px">Log in to MoveMatch</a></p>`], rejected: ['Update on your MoveMatch application', 'Application not approved', `<p>We could not approve your account at this time.</p>${note ? `<p>Reason: ${escH(note)}</p>` : ''}<p>Reply to support via ${site}/contact/ if you have questions.</p>`], suspended: ['Your MoveMatch account is suspended', 'Account suspended', `<p>Your account has been suspended.</p>${note ? `<p>Reason: ${escH(note)}</p>` : ''}<p>Contact support via ${site}/contact/.</p>`] }; const mm = msgs[st]; const mr = mm ? await sendMail(u.email, mm[0], mailWrap(mm[1], mm[2])) : { sent: false }; return json({ ok: true, user: u, emailed: !!mr.sent }); }
    if (p === '/api/admin/quote-status' && m === 'POST') { const st = ['New', 'Contacted', 'Quoted', 'Booked', 'Closed', 'Spam'].includes(body.status) ? body.status : null; if (!st) return json({ error: 'Bad status' }, 400); await sql('UPDATE mm_quote_requests SET status=$1 WHERE ref=$2', [st, String(body.ref)]); await audit(null, 'admin', 'quote_status:' + st, body.ref); return json({ ok: true }); }
  }
  return json({ error: 'Not found' }, 404);
}

/* ---------------- admin login page ---------------- */
function page(msg, next, configured) {
  return `<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex"><title>Admin sign-in | MoveMatch</title>
<style>*{box-sizing:border-box}body{margin:0;min-height:100vh;display:grid;place-items:center;background:#102A43;font:16px/1.5 Inter,system-ui,Arial,sans-serif;color:#172B4D;padding:16px}
.c{background:#fff;border-radius:18px;padding:32px;width:min(400px,100%);box-shadow:0 30px 80px rgba(0,0,0,.35)}h1{font-size:24px;margin:12px 0 4px;color:#102A43}p{color:#52606D;margin:0 0 18px;font-size:14px}
label{display:block;font-size:13px;font-weight:600;margin-bottom:6px;color:#334E68}input{width:100%;min-height:50px;border:1.5px solid #D9E2EC;border-radius:10px;padding:0 14px;font-size:16px}input:focus{outline:0;border-color:#14B8A6;box-shadow:0 0 0 4px rgba(20,184,166,.2)}
button{width:100%;min-height:50px;margin-top:16px;border:0;border-radius:10px;background:#14B8A6;color:#102A43;font-weight:700;font-size:16px;cursor:pointer}button:disabled{opacity:.5}
.m{background:#FDECEA;color:#B42318;border-radius:10px;padding:10px 12px;font-size:14px;margin-bottom:14px}.w{background:#FEF6E4;color:#7a4a08}.logo{display:flex;align-items:center;gap:10px;font-weight:800;font-size:20px;color:#102A43}.logo span{width:36px;height:36px;border-radius:9px;background:#102A43;display:inline-block}
a{color:#0F8F81}</style></head><body><main class="c"><div class="logo"><span></span>MoveMatch</div><h1>MoveMatch admin sign-in</h1><p>Restricted area. Customers and businesses: <a href="/login/">use the normal log-in</a>.</p>
${configured ? '' : '<div class="m w"><b>Not set up yet.</b> Add an environment variable named <code>ADMIN_PASSWORD</code> in your Vercel project settings, then redeploy.</div>'}
${msg ? `<div class="m" role="alert">${msg}</div>` : ''}
<form method="POST" action="/admin-login/"><input type="hidden" name="next" value="${(next || '/super-admin/').replace(/[^\w\/\-#:.]/g, '')}"><label for="un">Username</label><input id="un" name="username" autocomplete="username" required ${configured ? '' : 'disabled'} style="margin-bottom:14px"><label for="pw">Password</label><input id="pw" name="password" type="password" autocomplete="current-password" required ${configured ? '' : 'disabled'}><button ${configured ? '' : 'disabled'}>Sign in</button></form>
<p style="margin:16px 0 0"><a href="/">← Back to website</a></p></main></body></html>`;
}

export default async function middleware(req) {
  const url = new URL(req.url);
  const P = url.pathname.length > 1 ? url.pathname.replace(/\/$/, '') : url.pathname;
  if (P.startsWith('/api/')) { try { return await api(req, url); } catch (e) { return json({ error: 'Server error', detail: String(e.message).slice(0, 200) }, 500); } }

  const al = aliasFor(P);
  if (al && al.split(/[?#]/)[0].replace(/\/$/, '') !== P) return new Response(null, { status: 308, headers: { location: al, 'cache-control': 'public, max-age=3600' } });
  const isProtected = /\.js$/.test(P) || ['/admin-login', '/admin-logout'].includes(P) || PROTECTED.some(p => P === p || P.startsWith(p + '/'));
  if (!isProtected) return pass();
  const PW = process.env.ADMIN_PASSWORD || '';
  const USER = process.env.ADMIN_USERNAME || '';
  const day = Math.floor(Date.now() / 86400000);

  if (P === '/admin-logout') return new Response(null, { status: 302, headers: { location: '/admin-login/', 'set-cookie': `${ADMIN_COOKIE}=; Path=/; Max-Age=0; HttpOnly; Secure; SameSite=Strict` } });
  if (P === '/admin-login') {
    if (req.method === 'POST') {
      const form = await req.formData();
      const pw = String(form.get('password') || ''), un = String(form.get('username') || '').trim();
      const next = String(form.get('next') || '/super-admin/');
      const dest = PROTECTED.some(p => next.startsWith(p)) ? next : '/super-admin/';
      if (!PW) return new Response(page('', dest, false), { status: 503, headers: noStore });
      await new Promise(r => setTimeout(r, 400));
      if (!safeEqual(pw, PW) || (USER && !safeEqual(un.toLowerCase(), USER.toLowerCase()))) return new Response(page('Incorrect username or password.', dest, true), { status: 401, headers: noStore });
      const t = await adminToken(PW, day);
      return new Response(null, { status: 303, headers: { location: dest, 'set-cookie': `${ADMIN_COOKIE}=${t}; Path=/; Max-Age=${MAX_AGE}; HttpOnly; Secure; SameSite=Strict`, 'cache-control': 'no-store' } });
    }
    return new Response(page('', url.searchParams.get('next'), !!PW), { headers: noStore });
  }

  // Protected areas: admin may open everything; signed-in accounts may open their own dashboard.
  if (await isAdmin(req)) return pass();
  const s = await activeUser(await readSession(req));
  if (s) {
    if (/\.js$/.test(P)) return pass(); // dashboard scripts (data is only fetched via authorised API)
    const own = ROLE_PATHS[s.role];
    if (own && (P === own || P.startsWith(own + '/'))) return pass();
  }
  if (/\.js$/.test(P)) return new Response('Unauthorized', { status: 401, headers: { 'cache-control': 'no-store' } });
  const userArea = Object.values(ROLE_PATHS).find(p => P === p || P.startsWith(p + '/'));
  const loginUrl = userArea ? '/login/?next=' : '/admin-login/?next=';
  return new Response(null, { status: 302, headers: { location: loginUrl + encodeURIComponent(url.pathname + url.search), 'cache-control': 'no-store' } });
}
