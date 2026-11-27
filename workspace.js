// MoveMatch workspace — real projects, quotes and bookings via /api/v1 (same records every dashboard sees).
(function () {
  const root = document.getElementById('ws'); if (!root) return;
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const money = v => v == null ? '—' : '$' + Number(v).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const label = s => String(s || '').replace(/_/g, ' ');
  const chip = s => `<span class="wchip s-${esc(s)}">${esc(label(s))}</span>`;
  async function api(path, method = 'GET', body, headers = {}) {
    const r = await fetch('/api/v1' + path, { method, headers: { 'content-type': 'application/json', ...headers }, body: body ? JSON.stringify(body) : undefined, credentials: 'same-origin' }).catch(() => null);
    if (!r) return { ok: false, status: 0, error: { message: 'Network error — check your connection and try again.' } };
    const j = await r.json().catch(() => ({}));
    return { ok: r.ok, status: r.status, data: j.data, meta: j.meta, error: j.error };
  }
  const errBox = e => `<div class="notice" role="alert" style="background:#FDECEA;border-color:#f5c2c0"><div><b>${esc(e?.message || 'Something went wrong.')}</b>${(e?.details || []).length ? '<ul style="margin:6px 0 0">' + e.details.map(d => `<li>${esc(d.message)}</li>`).join('') + '</ul>' : ''}</div></div>`;
  const toast = (m, bad) => window.mmToast ? mmToast(m, bad ? 'var(--warn)' : undefined) : alert(m);
  const formData = f => Object.fromEntries(new FormData(f).entries());
  let me = null;

  async function boot() {
    root.innerHTML = '<p class="help">Loading your workspace…</p>';
    const r = await api('/me');
    if (r.status === 401) { root.innerHTML = `<div class="card"><h2>Sign in to manage your moves</h2><p>Use an approved MoveMatch account. New accounts are reviewed by our team before they can be used.</p><a class="btn btn-p" href="/login/?next=/app/">Log in</a> <a class="btn btn-o" href="/signup/">Create account</a></div>`; return; }
    if (!r.ok) { root.innerHTML = errBox(r.error); return; }
    me = r.data;
    if (me.role === 'customer') return customerHome();
    if (me.provider) return providerHome();
    root.innerHTML = `<div class="card"><h2>Workspace</h2><p>This workspace is for customers and moving companies. Your ${esc(me.role)} tools are in <a href="/platform/dashboards/">your dashboard</a>.</p></div>`;
  }

  /* ================= customer ================= */
  async function customerHome() {
    const r = await api('/projects');
    root.innerHTML = `<div class="wtop"><h2>My moving projects</h2><button class="btn btn-p" id="wNew">+ New project</button></div>
      <div id="wNewF" hidden class="card" style="margin-bottom:16px"><form id="fNew" class="fgrid" novalidate>
        <div class="fld"><label for="nT">Move type</label><select id="nT" name="project_type" required><option value="local">Local</option><option value="long_distance">Long-distance (in state)</option><option value="interstate" selected>Interstate</option><option value="international">International</option><option value="commercial">Commercial / office</option></select></div>
        <div class="fld"><label for="nD">Move date</label><input id="nD" name="requested_move_date" type="date" required min="${new Date().toISOString().slice(0, 10)}"></div>
        <div class="fld"><label for="nP">Property</label><select id="nP" name="property_type"><option>House</option><option>Apartment</option><option>Condo</option><option>Office</option><option>Storage unit</option></select></div>
        <div class="fld"><label for="nS">Size</label><select id="nS" name="home_size"><option>Studio</option><option>1 bedroom</option><option selected>2 bedrooms</option><option>3 bedrooms</option><option>4+ bedrooms</option></select></div>
        <div class="fld full"><label for="nN">Notes for movers (optional)</label><textarea id="nN" name="notes" rows="2" maxlength="1000"></textarea></div>
        <div class="full" id="nErr"></div><div class="full"><button class="btn btn-p" type="submit">Create project</button></div></form></div>
      <div id="wList">${!r.ok ? errBox(r.error) : !r.data.length ? '<div class="card"><p style="margin:0">No projects yet. Create one, add your addresses and items, then submit it to receive quotes from verified movers.</p></div>' :
        '<div class="tbl"><table><thead><tr><th>Project</th><th>Type</th><th>Move date</th><th>Quotes</th><th>Status</th><th></th></tr></thead><tbody>' + r.data.map(p => `<tr><td><b>${esc(p.project_number)}</b></td><td>${esc(label(p.project_type))}</td><td>${esc(p.requested_move_date || '—')}</td><td>${esc(p.quotes)}</td><td>${chip(p.status)}</td><td><button class="btn btn-o btn-sm" data-open="${esc(p.id)}">Open</button></td></tr>`).join('') + '</tbody></table></div>'}</div>`;
    root.querySelector('#wNew').onclick = () => { const f = root.querySelector('#wNewF'); f.hidden = !f.hidden; };
    root.querySelector('#fNew').onsubmit = async e => { e.preventDefault(); const x = await api('/projects', 'POST', formData(e.target)); if (!x.ok) { root.querySelector('#nErr').innerHTML = errBox(x.error); return; } toast('Project ' + x.data.project_number + ' created'); openProject(x.data.id); };
    root.querySelectorAll('[data-open]').forEach(b => b.onclick = () => openProject(b.dataset.open));
  }

  async function openProject(id) {
    const r = await api('/projects/' + id); if (!r.ok) { root.innerHTML = errBox(r.error); return; }
    const p = r.data, draft = p.status === 'draft', addr = t => p.addresses.find(a => a.address_type === t);
    const steps = ['draft', 'submitted', 'quoting', 'booked', 'in_progress', 'completed'], si = steps.indexOf(p.status);
    root.innerHTML = `<p><button class="btn btn-g btn-sm" id="back">← All projects</button></p>
      <div class="wtop"><h2>${esc(p.project_number)} ${chip(p.status)}</h2>${['draft', 'submitted', 'quoting', 'booked'].includes(p.status) ? '<button class="btn btn-g btn-sm" id="pCancel">Cancel project</button>' : ''}</div>
      <ol class="wsteps">${steps.map((s, i) => `<li class="${p.status === 'cancelled' ? '' : i < si ? 'done' : i === si ? 'cur' : ''}">${esc(label(s))}</li>`).join('')}</ol>
      <div class="wgrid">
        <section class="card"><h3>Addresses</h3>${['origin', 'destination'].map(t => { const a = addr(t); return `<p><b>${t === 'origin' ? 'Moving from' : 'Moving to'}:</b> ${a ? esc(`${a.line1}, ${a.city}, ${a.region} ${a.postal_code}`) + (draft ? ` <button class="btn btn-g btn-sm" data-deladdr="${esc(a.id)}">Remove</button>` : '') : '<span class="help">Not added yet</span>'}</p>`; }).join('')}
          ${draft ? `<form id="fAddr" class="fgrid" novalidate><div class="fld"><label for="aT">Type</label><select id="aT" name="address_type"><option value="origin">Moving from</option><option value="destination">Moving to</option><option value="intermediate_stop">Extra stop</option></select></div>
          <div class="fld"><label for="aL">Street address</label><input id="aL" name="line1" required autocomplete="street-address"></div><div class="fld"><label for="aC">City</label><input id="aC" name="city" required></div>
          <div class="fld"><label for="aR">State</label><input id="aR" name="region" maxlength="2" required placeholder="CO"></div><div class="fld"><label for="aZ">ZIP</label><input id="aZ" name="postal_code" inputmode="numeric" maxlength="10" required></div>
          <div class="full" id="aErr"></div><div class="full"><button class="btn btn-o btn-sm" type="submit">Add address</button></div></form>` : ''}</section>
        <section class="card"><h3>Inventory <span class="help">(${p.inventory.reduce((a, b) => a + Number(b.quantity), 0)} items)</span></h3>
          ${p.inventory.length ? '<ul class="winv">' + p.inventory.map(i => `<li>${esc(i.quantity)} × ${esc(i.item_name)} <small>${esc(i.room)}${i.fragile === 't' || i.fragile === true || i.fragile === 'true' ? ' · fragile' : ''}</small>${draft ? ` <button class="btn btn-g btn-sm" data-delinv="${esc(i.id)}" aria-label="Remove ${esc(i.item_name)}">×</button>` : ''}</li>`).join('') + '</ul>' : '<p class="help">No items yet — a few large items helps movers quote accurately.</p>'}
          ${draft ? `<form id="fInv" class="fgrid" novalidate><div class="fld"><label for="iR">Room</label><input id="iR" name="room" required placeholder="Living room"></div><div class="fld"><label for="iN">Item</label><input id="iN" name="item_name" required placeholder="Sofa"></div>
          <div class="fld"><label for="iQ">Qty</label><input id="iQ" name="quantity" type="number" min="1" max="999" value="1" required></div><label class="chk"><input type="checkbox" name="fragile" value="1">Fragile</label>
          <div class="full" id="iErr"></div><div class="full"><button class="btn btn-o btn-sm" type="submit">Add item</button></div></form>` : ''}</section>
      </div>
      ${draft ? `<div class="card" style="margin-top:16px"><div id="sErr"></div><button class="btn btn-p" id="pSubmit">Submit for quotes</button> <span class="help">After submitting, addresses and inventory are locked so every mover quotes on the same details.</span></div>` : ''}
      ${p.booking ? `<section class="card" style="margin-top:16px"><h3>Booking ${esc(p.booking.booking_number)} ${chip(p.booking.status)}</h3><p>${esc(p.booking.provider_name)} · agreed total <b>${money(p.booking.agreed_total)}</b> · ${esc(p.booking.scheduled_date || '')}</p>
        <p class="help">${p.booking.status === 'pending' ? 'Waiting for the moving company to confirm.' : p.booking.status === 'confirmed' ? 'Confirmed. Your mover can now see your contact details.' : ''} Payment is arranged directly with the mover — online payments are not switched on yet.</p>
        ${['pending', 'confirmed'].includes(p.booking.status) ? `<button class="btn btn-g btn-sm" id="bCancel" data-id="${esc(p.booking.id)}">Cancel booking</button>` : ''}</section>` : ''}
      ${p.quotes.length ? `<section style="margin-top:16px"><h3>Quotes (${p.quotes.length})</h3><p class="help">Sorted by total. Compare estimate type and what's included — the cheapest isn't always the best value.</p><div class="tbl"><table><thead><tr><th>Mover</th><th>Estimate type</th><th>Total</th><th>Included</th><th>Not included</th><th>Valid until</th><th>Status</th><th></th></tr></thead><tbody>` +
        p.quotes.map(q => `<tr><td><b>${esc(q.provider_name)}</b><br><small>${esc(q.quote_number)} · v${esc(q.version_number)} · ${q.verification_status === 'verified' ? '✓ checks passed' : esc(q.verification_status)}</small></td><td>${esc(label(q.estimate_type))}</td><td><b>${money(q.total_amount)}</b><br><small>subtotal ${money(q.subtotal)}${Number(q.discount_amount) ? ' − ' + money(q.discount_amount) : ''}${Number(q.tax_amount) ? ' + tax ' + money(q.tax_amount) : ''}</small></td><td><small>${esc(q.inclusions || '—')}</small></td><td><small>${esc(q.exclusions || '—')}</small></td><td><small>${esc((q.valid_until || '').slice(0, 10))}</small></td><td>${chip(q.status)}</td>
        <td>${q.status === 'issued' && ['submitted', 'quoting'].includes(p.status) ? `<button class="btn btn-p btn-sm" data-accept="${esc(q.version_id)}" data-name="${esc(q.provider_name)}" data-total="${esc(q.total_amount)}" data-terms="${esc(q.terms || '')}">Accept</button>` : ''}</td></tr>`).join('') + '</tbody></table></div></section>'
        : ['submitted', 'quoting'].includes(p.status) ? '<div class="card" style="margin-top:16px"><p style="margin:0">Submitted. Verified movers who cover your route can now send quotes — check back here.</p></div>' : ''}
      <details class="card" style="margin-top:16px"><summary>Status history</summary><ul>${p.history.map(h => `<li>${esc(h.created_at.slice(0, 16).replace('T', ' '))} — ${esc(label(h.new_status))}${h.reason ? ' · ' + esc(h.reason) : ''}</li>`).join('')}</ul></details>`;
    const $ = s => root.querySelector(s);
    $('#back').onclick = customerHome;
    const fa = $('#fAddr'); if (fa) fa.onsubmit = async e => { e.preventDefault(); const x = await api(`/projects/${id}/addresses`, 'POST', formData(e.target)); if (!x.ok) { $('#aErr').innerHTML = errBox(x.error); return; } openProject(id); };
    const fi = $('#fInv'); if (fi) fi.onsubmit = async e => { e.preventDefault(); const d = formData(e.target); d.fragile = !!d.fragile; const x = await api(`/projects/${id}/inventory`, 'POST', d); if (!x.ok) { $('#iErr').innerHTML = errBox(x.error); return; } openProject(id); };
    root.querySelectorAll('[data-deladdr]').forEach(b => b.onclick = async () => { await api(`/projects/${id}/addresses?id=${encodeURIComponent(b.dataset.deladdr)}`, 'DELETE'); openProject(id); });
    root.querySelectorAll('[data-delinv]').forEach(b => b.onclick = async () => { await api(`/projects/${id}/inventory?id=${encodeURIComponent(b.dataset.delinv)}`, 'DELETE'); openProject(id); });
    const sb = $('#pSubmit'); if (sb) sb.onclick = async () => { sb.disabled = true; const x = await api(`/projects/${id}/submit`, 'POST', {}); sb.disabled = false; if (!x.ok) { $('#sErr').innerHTML = errBox(x.error); return; } toast('Submitted — verified movers can now quote.'); openProject(id); };
    const pc = $('#pCancel'); if (pc) pc.onclick = async () => { const reason = prompt('Why are you cancelling? (optional)'); if (reason === null) return; const x = await api(`/projects/${id}/cancel`, 'POST', { reason }); if (!x.ok) return toast(x.error.message, 1); openProject(id); };
    const bc = $('#bCancel'); if (bc) bc.onclick = async () => { const reason = prompt('Reason for cancelling this booking:'); if (!reason) return; const x = await api(`/bookings/${bc.dataset.id}/cancel`, 'POST', { reason }); if (!x.ok) return toast(x.error.message, 1); toast('Booking cancelled. Your project is open for quotes again.'); openProject(id); };
    root.querySelectorAll('[data-accept]').forEach(b => b.onclick = async () => {
      const ok = confirm(`Accept ${b.dataset.name}'s quote for ${money(b.dataset.total)}?\n\n${b.dataset.terms ? 'Terms: ' + b.dataset.terms + '\n\n' : ''}This creates a booking and declines the other quotes. The mover then confirms the booking.`);
      if (!ok) return; b.disabled = true;
      const key = 'acc-' + b.dataset.accept; // same key on retry → never two bookings
      const x = await api(`/quote-versions/${b.dataset.accept}/accept`, 'POST', { accept_terms: true }, { 'idempotency-key': key });
      if (!x.ok) { b.disabled = false; return toast(x.error.message, 1); }
      toast('Booked — reference ' + x.data.booking_number); openProject(id);
    });
  }

  /* ================= moving company / partner ================= */
  async function providerHome(tab = 'opps') {
    const pv = (await api('/providers/me')).data || me.provider;
    const verified = pv.verification_status === 'verified';
    root.innerHTML = `<div class="wtop"><h2>${esc(pv.org_name)} ${chip(pv.verification_status)}</h2></div>
      <div class="tabs" role="tablist">${[['opps', 'Opportunities'], ['quotes', 'My quotes'], ['bookings', 'Bookings'], ['verify', 'Verification']].map(t => `<button class="tab" role="tab" aria-selected="${t[0] === tab}" data-tab="${t[0]}">${t[1]}</button>`).join('')}</div><div id="pBody" style="margin-top:16px"></div>`;
    root.querySelectorAll('[data-tab]').forEach(b => b.onclick = () => providerHome(b.dataset.tab));
    const body = root.querySelector('#pBody');
    if (!verified && tab !== 'verify' && tab !== 'bookings') body.innerHTML = `<div class="notice"><div><b>Complete verification to receive opportunities.</b> Submit your identity, business registration and insurance details. Each check is reviewed separately by MoveMatch.</div></div>`;
    if (tab === 'verify') {
      const have = t => pv.verifications.find(v => v.check_type === t && v.status !== 'rejected' && v.status !== 'expired');
      body.innerHTML = `<div class="tbl"><table><thead><tr><th>Check</th><th>Reference</th><th>Status</th><th>Note</th></tr></thead><tbody>${['identity', 'business', 'insurance', 'operating_authority'].map(t => { const v = have(t) || pv.verifications.find(x => x.check_type === t); return `<tr><td>${esc(label(t))}${t === 'operating_authority' ? ' <small>(USDOT/MC — interstate)</small>' : ''}</td><td>${esc(v?.reference || '—')}</td><td>${v ? chip(v.status) : chip('not_submitted')}</td><td><small>${esc(v?.note || '')}</small></td></tr>`; }).join('')}</tbody></table></div>
        <form id="fVer" class="card fgrid" style="margin-top:16px" novalidate><h3 class="full" style="margin:0">Submit a check</h3>
        <div class="fld"><label for="vT">Check</label><select id="vT" name="check_type">${['identity', 'business', 'insurance', 'operating_authority'].filter(t => !have(t)).map(t => `<option value="${t}">${esc(label(t))}</option>`).join('') || '<option value="">All submitted</option>'}</select></div>
        <div class="fld"><label for="vR">Reference number</label><input id="vR" name="reference" required placeholder="Registration, USDOT/MC or policy number"></div>
        <div class="fld"><label for="vE">Expires (if any)</label><input id="vE" name="expires_on" type="date"></div>
        <div class="full" id="vErr"></div><div class="full"><button class="btn btn-p" type="submit">Submit for review</button></div></form>
        <form id="fArea" class="card" style="margin-top:16px"><h3 style="margin-top:0">Service area</h3><label for="sa">States you serve (2-letter codes, comma separated; leave empty for all)</label><input id="sa" name="states" value="${esc((pv.service_states || []).toString().replace(/[{}]/g, ''))}" placeholder="CO, TX, NM"><button class="btn btn-o btn-sm" style="margin-top:10px" type="submit">Save</button></form>`;
      body.querySelector('#fVer').onsubmit = async e => { e.preventDefault(); const x = await api('/providers/me/verifications', 'POST', formData(e.target)); if (!x.ok) { body.querySelector('#vErr').innerHTML = errBox(x.error); return; } toast('Submitted for review'); providerHome('verify'); };
      body.querySelector('#fArea').onsubmit = async e => { e.preventDefault(); const states = e.target.states.value.split(/[ ,]+/).filter(Boolean); const x = await api('/providers/me', 'PUT', { service_states: states }); toast(x.ok ? 'Service area saved' : x.error.message, !x.ok); };
      return;
    }
    if (tab === 'opps' && verified) {
      const r = await api('/opportunities');
      body.innerHTML = r.data?.length ? '<div class="tbl"><table><thead><tr><th>Project</th><th>Route</th><th>Date</th><th>Size</th><th>Items</th><th>Quotes so far</th><th></th></tr></thead><tbody>' + r.data.map(o => `<tr><td>${esc(o.project_number)}<br><small>${esc(label(o.project_type))}</small></td><td>${esc(o.origin)} → ${esc(o.destination)}</td><td>${esc(o.requested_move_date || '—')}</td><td>${esc(o.property_type || '')} ${esc(o.home_size || '')}</td><td>${esc(o.item_count)}</td><td>${esc(o.quotes_so_far)}</td><td><button class="btn btn-p btn-sm" data-q="${esc(o.id)}" data-n="${esc(o.project_number)}">Send quote</button></td></tr>`).join('') + '</tbody></table></div><p class="help">Customer contact details are shared only after a customer books you and you confirm.</p>'
        : `<div class="card"><p style="margin:0">${esc(r.meta?.notice || 'No open projects in your service area right now.')}</p></div>`;
      body.querySelectorAll('[data-q]').forEach(b => b.onclick = () => quoteForm(body, b.dataset.q, b.dataset.n));
    }
    if (tab === 'quotes') {
      const r = await api('/quotes');
      body.innerHTML = r.data?.length ? '<div class="tbl"><table><thead><tr><th>Quote</th><th>Project</th><th>Version</th><th>Total</th><th>Status</th><th></th></tr></thead><tbody>' + r.data.map(q => `<tr><td>${esc(q.quote_number)}</td><td>${esc(q.project_number)}</td><td>v${esc(q.version_number)} · ${esc(label(q.estimate_type))}</td><td>${money(q.total_amount)}</td><td>${chip(q.status)}</td><td>${q.status === 'issued' ? `<button class="btn btn-o btn-sm" data-rev="${esc(q.id)}" data-n="${esc(q.quote_number)}">Revise</button> <button class="btn btn-g btn-sm" data-wd="${esc(q.id)}">Withdraw</button>` : ''}</td></tr>`).join('') + '</tbody></table></div>' : '<div class="card"><p style="margin:0">No quotes yet.</p></div>';
      body.querySelectorAll('[data-rev]').forEach(b => b.onclick = () => quoteForm(body, b.dataset.rev, b.dataset.n, true));
      body.querySelectorAll('[data-wd]').forEach(b => b.onclick = async () => { if (!confirm('Withdraw this quote? The customer will no longer be able to accept it.')) return; const x = await api(`/quotes/${b.dataset.wd}/withdraw`, 'POST', {}); toast(x.ok ? 'Quote withdrawn' : x.error.message, !x.ok); providerHome('quotes'); });
    }
    if (tab === 'bookings') {
      const r = await api('/bookings');
      const next = { pending: [['confirm', 'Confirm']], confirmed: [['start', 'Start move']], in_progress: [['complete', 'Mark complete']] };
      body.innerHTML = r.data?.length ? '<div class="tbl"><table><thead><tr><th>Booking</th><th>Route</th><th>Date</th><th>Agreed total</th><th>Customer</th><th>Status</th><th></th></tr></thead><tbody>' + r.data.map(b => `<tr><td>${esc(b.booking_number)}<br><small>${esc(b.project_number)}</small></td><td>${esc(b.origin || '')} → ${esc(b.destination || '')}</td><td>${esc(b.scheduled_date || '—')}</td><td>${money(b.agreed_total)}</td><td>${b.customer_email ? esc(b.customer_name) + '<br><small>' + esc(b.customer_email) + '</small>' : '<small>Shared after you confirm</small>'}</td><td>${chip(b.status)}</td><td>${(next[b.status] || []).map(n => `<button class="btn btn-p btn-sm" data-act="${n[0]}" data-id="${esc(b.id)}">${n[1]}</button>`).join('')}${['pending', 'confirmed'].includes(b.status) ? ` <button class="btn btn-g btn-sm" data-act="cancel" data-id="${esc(b.id)}">Cancel</button>` : ''}</td></tr>`).join('') + '</tbody></table></div>' : '<div class="card"><p style="margin:0">No bookings yet.</p></div>';
      body.querySelectorAll('[data-act]').forEach(b => b.onclick = async () => { let reason; if (b.dataset.act === 'cancel') { reason = prompt('Reason for cancelling (shared with the customer):'); if (!reason) return; } b.disabled = true; const x = await api(`/bookings/${b.dataset.id}/${b.dataset.act}`, 'POST', { reason }); toast(x.ok ? 'Booking updated' : x.error.message, !x.ok); providerHome('bookings'); });
    }
  }

  function quoteForm(body, id, num, revise) {
    const row = n => `<div class="qline fgrid"><div class="fld"><label>Description</label><input name="d${n}" placeholder="e.g. 3 movers × 6 hours"></div><div class="fld"><label>Qty</label><input name="q${n}" type="number" min="0.001" step="any" value="1"></div><div class="fld"><label>Unit price ($)</label><input name="p${n}" inputmode="decimal" placeholder="0.00"></div></div>`;
    body.innerHTML = `<form id="fQ" class="card" novalidate><h3 style="margin-top:0">${revise ? 'Revise quote ' : 'Quote for '}${esc(num)}</h3><p class="help">Totals are calculated by MoveMatch from your lines. ${revise ? 'A revision creates a new version; earlier versions are kept and can no longer be accepted.' : ''}</p>
      <div class="fld"><label for="qE">Estimate type</label><select id="qE" name="estimate_type"><option value="binding">Binding</option><option value="binding_not_to_exceed">Binding not-to-exceed</option><option value="non_binding">Non-binding</option></select></div>
      <div id="qLines">${row(0)}${row(1)}${row(2)}</div><button type="button" class="btn btn-g btn-sm" id="qAdd">+ Line</button>
      <div class="fgrid" style="margin-top:12px"><div class="fld"><label for="qDis">Discount ($)</label><input id="qDis" name="discount_amount" inputmode="decimal" placeholder="0.00"></div><div class="fld"><label for="qTax">Tax ($)</label><input id="qTax" name="tax_amount" inputmode="decimal" placeholder="0.00"></div><div class="fld"><label for="qV">Valid for (days)</label><input id="qV" name="valid_days" type="number" min="1" max="60" value="14"></div></div>
      <div class="fld"><label for="qI">Included</label><input id="qI" name="inclusions" placeholder="Loading, transport, unloading, basic valuation"></div>
      <div class="fld"><label for="qX">Not included / extra charges</label><input id="qX" name="exclusions" placeholder="Long carry over 75 ft, stairs above 2nd floor"></div>
      <div class="fld"><label for="qT">Terms (deposit, cancellation)</label><textarea id="qT" name="terms" rows="2"></textarea></div>
      <p>Estimated total: <b id="qTot">$0.00</b></p><div id="qErr"></div><button class="btn btn-p" type="submit">${revise ? 'Issue new version' : 'Send quote'}</button> <button class="btn btn-g" type="button" id="qCancel">Cancel</button></form>`;
    const f = body.querySelector('#fQ'); let n = 3;
    const calc = () => { let t = 0; for (let i = 0; i < n; i++) t += (Number(f['q' + i]?.value) || 0) * (Number(f['p' + i]?.value) || 0); t = t - (Number(f.discount_amount.value) || 0) + (Number(f.tax_amount.value) || 0); body.querySelector('#qTot').textContent = money(Math.max(0, t)); };
    f.oninput = calc;
    body.querySelector('#qAdd').onclick = () => { body.querySelector('#qLines').insertAdjacentHTML('beforeend', row(n++)); };
    body.querySelector('#qCancel').onclick = () => providerHome(revise ? 'quotes' : 'opps');
    f.onsubmit = async e => {
      e.preventDefault(); const items = [];
      for (let i = 0; i < n; i++) { const d = f['d' + i]?.value.trim(); if (d) items.push({ description: d, quantity: f['q' + i].value, unit_price: f['p' + i].value.trim() }); }
      const payload = { estimate_type: f.estimate_type.value, items, discount_amount: f.discount_amount.value.trim(), tax_amount: f.tax_amount.value.trim(), valid_days: f.valid_days.value, inclusions: f.inclusions.value, exclusions: f.exclusions.value, terms: f.terms.value };
      const x = await api(revise ? `/quotes/${id}/versions` : `/opportunities/${id}/quotes`, 'POST', payload);
      if (!x.ok) { body.querySelector('#qErr').innerHTML = errBox(x.error); return; }
      toast(revise ? 'New version issued' : 'Quote sent'); providerHome('quotes');
    };
  }
  boot();
})();
