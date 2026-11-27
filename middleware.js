// Vercel Routing Middleware — protects the Super Admin panel on the server.
// The password is NEVER stored in code. Set it in Vercel:
// Project → Settings → Environment Variables → ADMIN_PASSWORD (then redeploy).
export const config = { matcher: ['/super-admin', '/super-admin/:path*', '/sa.js', '/admin-login', '/admin-login/', '/admin-logout', '/admin-logout/'] };

const COOKIE = 'mm_admin';
const MAX_AGE = 60 * 60 * 8; // 8 hours
const enc = new TextEncoder();
const hex = b => [...new Uint8Array(b)].map(x => x.toString(16).padStart(2, '0')).join('');
async function token(pw, day) {
  const key = await crypto.subtle.importKey('raw', enc.encode(pw), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  return hex(await crypto.subtle.sign('HMAC', key, enc.encode('movematch-admin-v1|' + day)));
}
function safeEqual(a, b) { if (a.length !== b.length) return false; let r = 0; for (let i = 0; i < a.length; i++) r |= a.charCodeAt(i) ^ b.charCodeAt(i); return r === 0; }
const cookieOf = (req, n) => (req.headers.get('cookie') || '').split(/;\s*/).map(c => c.split('=')).find(c => c[0] === n)?.[1] || '';
const pass = () => new Response(null, { headers: { 'x-middleware-next': '1' } });
const noStore = { 'cache-control': 'no-store', 'x-robots-tag': 'noindex, nofollow', 'content-type': 'text/html; charset=utf-8' };

function page(msg, next, configured) {
  return `<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex"><title>Admin sign-in | MoveMatch</title>
<style>*{box-sizing:border-box}body{margin:0;min-height:100vh;display:grid;place-items:center;background:#102A43;font:16px/1.5 Inter,system-ui,Arial,sans-serif;color:#172B4D;padding:16px}
.c{background:#fff;border-radius:18px;padding:32px;width:min(400px,100%);box-shadow:0 30px 80px rgba(0,0,0,.35)}h1{font-size:24px;margin:12px 0 4px;color:#102A43}p{color:#52606D;margin:0 0 18px;font-size:14px}
label{display:block;font-size:13px;font-weight:600;margin-bottom:6px;color:#334E68}input{width:100%;min-height:50px;border:1.5px solid #D9E2EC;border-radius:10px;padding:0 14px;font-size:16px}input:focus{outline:0;border-color:#14B8A6;box-shadow:0 0 0 4px rgba(20,184,166,.2)}
button{width:100%;min-height:50px;margin-top:16px;border:0;border-radius:10px;background:#14B8A6;color:#102A43;font-weight:700;font-size:16px;cursor:pointer}button:disabled{opacity:.5}
.m{background:#FDECEA;color:#B42318;border-radius:10px;padding:10px 12px;font-size:14px;margin-bottom:14px}.w{background:#FEF6E4;color:#7a4a08}.logo{display:flex;align-items:center;gap:10px;font-weight:800;font-size:20px;color:#102A43}.logo span{width:36px;height:36px;border-radius:9px;background:#102A43;display:inline-block}
a{color:#0F8F81}</style></head><body><main class="c"><div class="logo"><span></span>MoveMatch</div><h1>Super Admin sign-in</h1><p>Restricted area. Access attempts are recorded by the hosting provider.</p>
${configured ? '' : '<div class="m w"><b>Not set up yet.</b> Add an environment variable named <code>ADMIN_PASSWORD</code> in your Vercel project settings, then redeploy.</div>'}
${msg ? `<div class="m" role="alert">${msg}</div>` : ''}
<form method="POST" action="/admin-login/"><input type="hidden" name="next" value="${(next || '/super-admin/').replace(/[^\w\/\-#:.]/g, '')}"><label for="pw">Password</label><input id="pw" name="password" type="password" autocomplete="current-password" required autofocus ${configured ? '' : 'disabled'}><button ${configured ? '' : 'disabled'}>Sign in</button></form>
<p style="margin:16px 0 0"><a href="/">← Back to website</a></p></main></body></html>`;
}

export default async function middleware(req) {
  const url = new URL(req.url);
  const P = url.pathname.length > 1 ? url.pathname.replace(/\/$/, '') : url.pathname;
  const PW = process.env.ADMIN_PASSWORD || '';
  const day = Math.floor(Date.now() / 86400000);

  if (P === '/admin-logout') {
    return new Response(null, { status: 302, headers: { location: '/admin-login/', 'set-cookie': `${COOKIE}=; Path=/; Max-Age=0; HttpOnly; Secure; SameSite=Strict` } });
  }

  if (P === '/admin-login') {
    if (req.method === 'POST') {
      const form = await req.formData();
      const pw = String(form.get('password') || '');
      const next = String(form.get('next') || '/super-admin/');
      const dest = next.startsWith('/super-admin') ? next : '/super-admin/';
      if (!PW) return new Response(page('', dest, false), { status: 503, headers: noStore });
      await new Promise(r => setTimeout(r, 400)); // slow down guessing
      if (!safeEqual(pw, PW)) return new Response(page('Incorrect password.', dest, true), { status: 401, headers: noStore });
      const t = await token(PW, day);
      return new Response(null, { status: 303, headers: { location: dest, 'set-cookie': `${COOKIE}=${t}; Path=/; Max-Age=${MAX_AGE}; HttpOnly; Secure; SameSite=Strict`, 'cache-control': 'no-store' } });
    }
    return new Response(page('', url.searchParams.get('next'), !!PW), { headers: noStore });
  }

  // Protected paths
  const c = cookieOf(req, COOKIE);
  if (PW && c) {
    const [t0, t1] = await Promise.all([token(PW, day), token(PW, day - 1)]);
    if (safeEqual(c, t0) || safeEqual(c, t1)) return pass();
  }
  if (url.pathname === '/sa.js') return new Response('Unauthorized', { status: 401, headers: { 'cache-control': 'no-store' } });
  return new Response(null, { status: 302, headers: { location: '/admin-login/?next=' + encodeURIComponent(url.pathname + url.search), 'cache-control': 'no-store' } });
}
