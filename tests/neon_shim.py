"""Local stand-in for Neon's HTTPS /sql endpoint, backed by a real PostgreSQL 16.
Accepts {"query", "params"} like Neon (text output), runs it through psql, returns {"rows": [...]}.
Test-only: parameters are inlined as quoted literals."""
import json, re, subprocess, sys
from http.server import BaseHTTPRequestHandler, HTTPServer

PSQL = ['psql', '-h', '/tmp/pg', '-p', '5433', '-U', 'postgres', '-X', '-q', '-A', '-F', '\x1f',
        '-P', 'footer=off', '-P', 'null=\x1e', '-v', 'ON_ERROR_STOP=1']

def lit(v):
    if v is None: return 'NULL'
    if isinstance(v, bool): return 'TRUE' if v else 'FALSE'
    if isinstance(v, (int, float)): return repr(v)
    if isinstance(v, (dict, list)): v = json.dumps(v)
    return "'" + str(v).replace("'", "''") + "'"

def run(q, params):
    for i in range(len(params), 0, -1):
        q = re.sub(r'\$' + str(i) + r'(?!\d)', lambda m, i=i: lit(params[i - 1]), q)
    p = subprocess.run(PSQL + ['-c', q], capture_output=True, text=True)
    if p.returncode:
        errs=[l for l in p.stderr.splitlines() if l.startswith('ERROR:')]
        raise Exception((errs[0][6:].strip() if errs else p.stderr.strip()) or 'error')
    lines = [l for l in p.stdout.split('\n') if l != '']
    if not lines: return []
    head = lines[0].split('\x1f'); rows = []
    for l in lines[1:]:
        vals = l.split('\x1f')
        if len(vals) != len(head): continue
        rows.append({h: (None if v == '\x1e' else v) for h, v in zip(head, vals)})
    return rows

class H(BaseHTTPRequestHandler):
    def log_message(self, *a): pass
    def do_POST(self):
        b = json.loads(self.rfile.read(int(self.headers['content-length'])))
        try:
            out, code = {'rows': run(b['query'], b.get('params', []))}, 200
        except Exception as e:
            out, code = {'message': str(e)}, 400
        d = json.dumps(out).encode()
        self.send_response(code); self.send_header('content-type', 'application/json'); self.send_header('content-length', str(len(d))); self.end_headers(); self.wfile.write(d)

HTTPServer(('127.0.0.1', int(sys.argv[1]) if len(sys.argv) > 1 else 8799), H).serve_forever()
