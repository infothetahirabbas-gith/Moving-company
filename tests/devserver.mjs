// Local dev server: static dist/ + the real middleware for /api/* and admin login, backed by tests/neon_shim.py.
import http from 'node:http'; import fs from 'node:fs'; import path from 'node:path';
const SHIM = 'http://127.0.0.1:8799/'; const realFetch = globalThis.fetch;
globalThis.fetch = (u, o) => String(u).includes('.neon.tech/sql') ? realFetch(SHIM, o) : realFetch(u, o);
process.env.DATABASE_URL = 'postgresql://u:p@ep-test.neon.tech/db'; process.env.ADMIN_PASSWORD = 'test-admin-pw';
const mw = (await import('../middleware.js')).default;
const DIST = new URL('../dist/', import.meta.url).pathname;
const types = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png' };
http.createServer(async (req, res) => {
  const chunks = []; for await (const c of req) chunks.push(c);
  const url = 'http://localhost:8766' + req.url;
  if (req.url.startsWith('/api/') || req.url.startsWith('/admin-login') || req.url.startsWith('/admin-logout')) {
    const r = await mw(new Request(url, { method: req.method, headers: req.headers, body: ['GET', 'HEAD'].includes(req.method) ? undefined : Buffer.concat(chunks) }));
    const h = {}; r.headers.forEach((v, k) => { h[k] = v; }); const sc = r.headers.getSetCookie?.(); if (sc && sc.length) h['set-cookie'] = sc;
    res.writeHead(r.status, h); res.end(Buffer.from(await r.arrayBuffer())); return;
  }
  let p = decodeURIComponent(new URL(url).pathname); if (p.endsWith('/')) p += 'index.html';
  const f = path.join(DIST, p);
  if (!f.startsWith(DIST) || !fs.existsSync(f)) { res.writeHead(404); res.end('nf'); return; }
  res.writeHead(200, { 'content-type': types[path.extname(f)] || 'application/octet-stream' }); fs.createReadStream(f).pipe(res);
}).listen(8766, () => console.log('dev on 8766'));
