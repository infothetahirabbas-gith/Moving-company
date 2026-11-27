"""Browser E2E: customer creates & submits a project, verified company quotes, customer accepts, company confirms.
Needs tests/neon_shim.py (8799) and tests/devserver.mjs (8766) running."""
import json, subprocess, urllib.request
from playwright.sync_api import sync_playwright
B = 'http://localhost:8766'
def sql(q, p=[]):
    r = urllib.request.urlopen(urllib.request.Request('http://127.0.0.1:8799/', data=json.dumps({'query': q, 'params': p}).encode(), method='POST'))
    return json.loads(r.read())['rows']
def api(path, body):
    req = urllib.request.Request(B + path, data=json.dumps(body).encode(), headers={'content-type': 'application/json', 'origin': B}, method='POST')
    try: return urllib.request.urlopen(req).status
    except urllib.error.HTTPError as e: return e.code
res = []; ok = lambda n, c: res.append(('PASS ' if c else 'FAIL ') + n)
pass  # DB reset happens before the dev server starts (see run_ui.sh)
api('/api/health', {})
for e, role, co in [('ui.cust@example.test', 'customer', ''), ('ui.co@example.test', 'company', 'UI Test Movers')]:
    api('/api/signup', {'name': e.split('@')[0], 'email': e, 'password': 'correct-horse-9', 'role': role, 'company': co})
    sql("UPDATE mm_users SET status='approved' WHERE email=$1", [e])
errs = []
with sync_playwright() as p:
    b = p.chromium.launch()
    def login(email, mobile=False):
        ctx = b.new_context(viewport={'width': 390, 'height': 844} if mobile else {'width': 1280, 'height': 900})
        pg = ctx.new_page(); pg.on('pageerror', lambda e: None if 'ViewTransition' in str(e) or 'Transition was aborted' in str(e) else errs.append(str(e)))
        pg.goto(B + '/login/?next=/app/'); pg.fill('input[type=email]', email); pg.fill('input[type=password]', 'correct-horse-9')
        pg.click('form[data-api] button[type=submit]'); pg.wait_for_url('**/app/**', timeout=8000); pg.wait_for_selector('#ws .wtop, #ws .card', timeout=8000); pg.wait_for_timeout(300)
        return pg
    c = login('ui.cust@example.test', mobile=True)
    ok('customer lands in workspace', 'My moving projects' in c.inner_text('#ws'))
    c.click('#wNew'); c.fill('#nD', '2030-09-10'); c.click('#fNew button[type=submit]'); c.wait_for_timeout(800)
    ok('project created and opened', 'MP-' in c.inner_text('#ws') and 'Draft' in c.inner_text('#ws').title())
    c.click('#pSubmit'); c.wait_for_timeout(500)
    ok('submit blocked with clear reasons', 'Add the origin address' in c.inner_text('#sErr'))
    for t, l, city, st, z in [('origin', '1 Main St', 'Denver', 'CO', '80202'), ('destination', '9 Elm Ave', 'Austin', 'TX', '73301')]:
        c.select_option('#aT', t); c.fill('#aL', l); c.fill('#aC', city); c.fill('#aR', st); c.fill('#aZ', z); c.click('#fAddr button[type=submit]'); c.wait_for_timeout(600)
    c.fill('#iR', 'Living room'); c.fill('#iN', 'Sofa'); c.fill('#iQ', '2'); c.click('#fInv button[type=submit]'); c.wait_for_timeout(600)
    ok('addresses + inventory shown', 'Denver, CO 80202' in c.inner_text('#ws') and '2 × Sofa' in c.inner_text('#ws'))
    c.click('#pSubmit'); c.wait_for_timeout(700)
    ok('project submitted', 'Submitted' in c.inner_text('#ws'))
    ok('no horizontal overflow on mobile', c.evaluate('document.documentElement.scrollWidth') <= 392)

    co = login('ui.co@example.test')
    co.wait_for_selector('#pBody .notice', timeout=8000); ok('company sees verification prompt', 'Complete verification' in co.inner_text('#ws'))
    co.click('[data-tab=verify]'); co.wait_for_timeout(400)
    for t in ['identity', 'business', 'insurance']:
        co.select_option('#vT', t); co.fill('#vR', 'REF-' + t); co.click('#fVer button[type=submit]'); co.wait_for_timeout(500)
    ok('three checks submitted', co.inner_text('#ws').count('Submitted') >= 3)

    adm = b.new_context().new_page(); adm.on('pageerror', lambda e: errs.append(str(e)))
    adm.goto(B + '/admin-login/?next=/super-admin/data/'); adm.fill('input[name=username]', 'tester'); adm.fill('input[name=password]', 'test-admin-pw'); adm.click('form button'); adm.wait_for_timeout(800)
    adm.goto(B + '/super-admin/data/'); adm.wait_for_timeout(1200)
    ok('admin sees provider checks waiting', 'UI Test Movers' in adm.inner_text('#ld2'))
    adm.on('dialog', lambda d: d.accept())
    for _ in range(3): adm.click('[data-ap] >> nth=0'); adm.wait_for_timeout(700)
    ok('admin approvals make provider verified', 'Verified' in adm.inner_text('#ld2').title())

    co.reload(); co.wait_for_timeout(900)
    ok('verified company sees opportunity Denver → Austin', 'Denver, CO → Austin, TX' in co.inner_text('#ws'))
    ok('opportunity hides customer email', 'ui.cust@' not in co.inner_text('#ws'))
    co.click('[data-q]'); co.wait_for_timeout(300)
    co.fill('[name=d0]', '3 movers x 6 hours'); co.fill('[name=q0]', '18'); co.fill('[name=p0]', '45')
    co.fill('[name=d1]', '26 ft truck'); co.fill('[name=p1]', '350'); co.fill('#qTax', '12.50'); co.fill('#qI', 'Loading, transport, unloading')
    ok('live total preview = $1,172.50', '$1,172.50' in co.inner_text('#qTot'))
    co.click('#fQ button[type=submit]'); co.wait_for_timeout(800)
    ok('quote listed under My quotes', 'Issued' in co.inner_text('#ws') and '$1,172.50' in co.inner_text('#ws'))

    c.reload(); c.wait_for_timeout(700); c.click('[data-open] >> nth=0'); c.wait_for_timeout(800)
    ok('customer sees quote with inclusions', 'UI Test Movers' in c.inner_text('#ws') and 'Loading, transport' in c.inner_text('#ws'))
    c.on('dialog', lambda d: d.accept())
    c.click('[data-accept]'); c.wait_for_timeout(1000)
    ok('customer accepted → booking pending', 'Booking BK-' in c.inner_text('#ws') and 'Pending' in c.inner_text('#ws'))

    co.click('[data-tab=bookings]'); co.wait_for_timeout(700)
    ok('company sees booking, contact hidden', 'Shared after you confirm' in co.inner_text('#ws'))
    co.on('dialog', lambda d: d.accept())
    co.click('[data-act=confirm]'); co.wait_for_timeout(900)
    ok('company confirmed → customer contact revealed', 'ui.cust@example.test' in co.inner_text('#ws'))
    co.click('[data-tab=crew]'); co.wait_for_timeout(600)
    co.fill('#cN', 'Maria Lopez'); co.select_option('#cR', 'crew_lead'); co.click('#fCrew button[type=submit]'); co.wait_for_timeout(700)
    co.fill('#vL', '26 ft truck'); co.fill('#vP', 'CO-123'); co.click('#fVeh button[type=submit]'); co.wait_for_timeout(700)
    ok('crew member and truck added', 'Maria Lopez' in co.inner_text('#ws') and 'CO-123' in co.inner_text('#ws'))
    co.click('[data-tab=bookings]'); co.wait_for_timeout(700); co.click('[data-assign]'); co.wait_for_timeout(800)
    co.check('[name=crew] >> nth=0'); co.check('[name=veh] >> nth=0'); co.click('#fAs button[type=submit]'); co.wait_for_timeout(900)
    ok('crew and truck assigned to booking', 'Assigned:' in co.inner_text('#ws'))
    co.click('#asBack'); co.wait_for_timeout(500); co.click('[data-tab=schedule]'); co.wait_for_timeout(700)
    ok('schedule shows the move day', '2030-09-10' in co.inner_text('#ws') and 'Maria Lopez' in co.inner_text('#ws'))
    c.reload(); c.wait_for_timeout(700); c.click('[data-open] >> nth=0'); c.wait_for_timeout(800)
    c.wait_for_timeout(600); ok('customer sees confirmed booking', 'Confirmed' in c.inner_text('#ws'))
    ok('customer sees team first names, not phone/plate', 'Your team: Maria (crew lead), 26 ft truck' in c.inner_text('#ws') and 'CO-123' not in c.inner_text('#ws'))
    b.close()
ok('no JavaScript errors in any page', not errs)
print('\n'.join(res)); print(sum(r.startswith('PASS') for r in res), 'passed,', sum(r.startswith('FAIL') for r in res), 'failed', errs[:3])
