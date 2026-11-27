/* MoveMatch OS engine — config-driven dashboards for PRDs 02–06 & 08.
   Frontend only: sample data persisted in this browser (localStorage). No backend is connected. */
(function(){
'use strict';
const root=document.getElementById('os');if(!root)return;
const CFG=window.MMOS&&window.MMOS[root.dataset.os];if(!CFG){root.textContent='Configuration missing.';return}
const $=(s,r=document)=>r.querySelector(s),$$=(s,r=document)=>[...r.querySelectorAll(s)];
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const money=n=>'$'+(+n||0).toLocaleString(undefined,{maximumFractionDigits:0});
const today=()=>new Date().toISOString().slice(0,10);
const uid=p=>p+'-'+Math.random().toString(36).slice(2,7).toUpperCase();
const toast=m=>window.mmToast?mmToast(m):alert(m);
const KEY='mmos_'+CFG.id+'_v'+(CFG.version||1);
const clone=o=>JSON.parse(JSON.stringify(o));
let S;try{S=JSON.parse(localStorage.getItem(KEY))}catch(e){}
if(!S){S={data:clone(CFG.seed),audit:[],role:CFG.roles[0].id}}
const save=()=>{try{localStorage.setItem(KEY,JSON.stringify(S))}catch(e){}};
const role=()=>CFG.roles.find(r=>r.id===S.role)||CFG.roles[0];
const can=m=>{const r=role();return r.mods==='*'||r.mods.includes(m)};
const log=(action,ref)=>{S.audit.unshift({t:new Date().toISOString(),role:role().name,action,ref:ref||''});S.audit=S.audit.slice(0,300);save()};
const ctx={S,save,log,esc,money,uid,today,toast,role,render:()=>render(),go:id=>go(id),cfg:CFG};
CFG.ctx=ctx;
/* ---------- shell ---------- */
const groups=[];CFG.modules.forEach(m=>{let g=groups.find(x=>x.n===m.group);if(!g)groups.push(g={n:m.group,m:[]});g.m.push(m)});
root.innerHTML=`<aside class="sa-side" id="osSide" aria-label="${esc(CFG.title)} navigation"><div class="os-brand"><b>${esc(CFG.title)}</b><small>${esc(CFG.sub)}</small></div>
<label class="sr" for="osFilt">Filter modules</label><input id="osFilt" class="os-filt" placeholder="Filter ${CFG.modules.length} modules…">
<nav id="osNav">${groups.map(g=>`<div class="os-g"><p>${esc(g.n)}</p>${g.m.map(m=>`<a href="#${m.id}" class="sa-link" data-m="${m.id}">${esc(m.name)}</a>`).join('')}</div>`).join('')}</nav></aside>
<div class="sa-main"><div class="sa-top"><button class="btn btn-o sa-mb" id="osMenu" type="button" aria-controls="osSide" aria-expanded="false">☰ Menu</button>
<form id="osSearch" role="search" style="flex:1 1 240px;min-width:0;display:flex"><label class="sr" for="osQ">Search records</label><input id="osQ" class="sa-q" type="search" placeholder="Search all records…"></form>
<label class="sr" for="osRole">View as role</label><select id="osRole" class="os-sel">${CFG.roles.map(r=>`<option value="${r.id}">${esc(r.name)}</option>`).join('')}</select>
<button class="btn btn-g" id="osAudit" type="button">Audit log</button><button class="btn btn-g" id="osReset" type="button">Reset demo</button></div>
<div class="notice" style="margin-bottom:16px"><span>ⓘ</span><div><b>Interactive demo with sample data.</b> Everything works in this browser and is saved on this device only. No real customers, payments, GPS or backend are connected — ${esc(CFG.backendNote||'these need the MoveMatch API.')}</div></div>
<div id="osView" tabindex="-1"></div></div>
<div class="os-drawer" id="osDrawer" hidden><div class="os-bd" data-x></div><div class="os-pane" role="dialog" aria-modal="true" aria-labelledby="osDT"><button class="btn btn-g os-x" data-x aria-label="Close">×</button><div id="osDB"></div></div></div>`;
$('#osRole').value=S.role;
$('#osRole').onchange=e=>{S.role=e.target.value;log('Switched role to '+role().name);render()};
$('#osReset').onclick=()=>{if(confirm('Reset all demo data for '+CFG.title+'?')){S={data:clone(CFG.seed),audit:[],role:S.role};save();ctx.S=S;toast('Demo data reset');render()}};
$('#osAudit').onclick=()=>drawer('Audit log',`<p class="help">${S.audit.length} events recorded in this browser.</p>${S.audit.length?`<div class="tbl"><table><thead><tr><th>Time</th><th>Role</th><th>Action</th><th>Ref</th></tr></thead><tbody>${S.audit.map(a=>`<tr><td>${new Date(a.t).toLocaleString()}</td><td>${esc(a.role)}</td><td>${esc(a.action)}</td><td>${esc(a.ref)}</td></tr>`).join('')}</tbody></table></div><button class="btn btn-o" type="button" id="osAuditCsv" style="margin-top:12px">Export CSV</button>`:'<div class="empty"><h3>No activity yet</h3></div>'}`,()=>{const b=$('#osAuditCsv');if(b)b.onclick=()=>csv('audit-log',['t','role','action','ref'],S.audit)});
$('#osFilt').oninput=e=>{const q=e.target.value.toLowerCase();$$('#osNav .sa-link').forEach(a=>a.classList.toggle('sa-hide',!a.textContent.toLowerCase().includes(q)))};
$('#osMenu').onclick=()=>{const o=root.classList.toggle('open');$('#osMenu').setAttribute('aria-expanded',o)};
$('#osSearch').onsubmit=e=>{e.preventDefault();globalSearch($('#osQ').value.trim())};
$('#osDrawer').addEventListener('click',e=>{if(e.target.closest('[data-x]'))closeDrawer()});
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&!$('#osDrawer').hidden)closeDrawer()});
addEventListener('hashchange',render);
function go(id){location.hash=id}
function drawer(title,html,after){$('#osDB').innerHTML=`<h2 id="osDT" style="margin:0 40px 14px 0;font-size:22px">${esc(title)}</h2>${html}`;$('#osDrawer').hidden=false;document.body.style.overflow='hidden';after&&after();setTimeout(()=>$('.os-x').focus(),20)}
function closeDrawer(){$('#osDrawer').hidden=true;document.body.style.overflow=''}
ctx.drawer=drawer;ctx.closeDrawer=closeDrawer;
function csv(name,cols,rows){const q=v=>'"'+String(v??'').replace(/"/g,'""')+'"';const t=[cols.join(','),...rows.map(r=>cols.map(c=>q(typeof r[c]==='object'?JSON.stringify(r[c]):r[c])).join(','))].join('\n');const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([t],{type:'text/csv'}));a.download=name+'.csv';a.click();log('Exported '+name+'.csv')}
ctx.csv=csv;
function globalSearch(q){if(!q)return;const hits=[];Object.entries(S.data).forEach(([ent,rows])=>{if(!Array.isArray(rows))return;rows.forEach(r=>{if(JSON.stringify(r).toLowerCase().includes(q.toLowerCase()))hits.push([ent,r])})});
 drawer('Search: '+q,hits.length?hits.slice(0,40).map(([e,r])=>{const m=CFG.modules.find(x=>x.entity===e&&(x.type==='table'||x.type==='kanban'));return`<a class="card os-hit" href="#${m?m.id:''}" data-close><small class="help">${esc((CFG.entities[e]||{}).label||e)}</small><b style="display:block">${esc(r.id)} — ${esc(r[(CFG.entities[e]||{}).title||'name']||'')}</b>${r.status?`<span class="os-st">${esc(r.status)}</span>`:''}</a>`}).join(''):'<div class="empty"><h3>No matching records</h3></div>',()=>$$('.os-hit').forEach(a=>a.onclick=closeDrawer))}
/* ---------- record helpers ---------- */
const ent=e=>CFG.entities[e]||{};
function flowNext(e,st){const f=ent(e).flow;return f&&f[st]?f[st]:[]}
function setStatus(e,r,to,note){const g=ent(e).guard;if(g){const msg=g(r,to,ctx);if(msg){toast(msg);return false}}const from=r.status;r.status=to;(r.hist=r.hist||[]).push({t:new Date().toISOString(),from,to,by:role().name,note:note||''});ent(e).onStatus&&ent(e).onStatus(r,to,ctx);log(`${ent(e).label||e}: ${from} → ${to}`,r.id);save();return true}
ctx.setStatus=setStatus;
function fmt(c,r){const v=r[c.k];if(c.f==='money')return money(v);if(c.f==='status')return`<span class="os-st" data-s="${esc(v)}">${esc(v)}</span>`;if(c.f==='date')return v?esc(v):'—';if(c.f==='bool')return v?'Yes':'No';if(typeof c.f==='function')return c.f(r,ctx);return esc(Array.isArray(v)?v.join(', '):v)}
function detail(e,r,after){const E=ent(e);const fields=E.fields||[];const nx=flowNext(e,r.status);
 drawer(`${E.label||e} ${r.id}`,`${r.status?`<p>Status: <span class="os-st" data-s="${esc(r.status)}">${esc(r.status)}</span></p>`:''}
 ${nx.length?`<div class="os-acts"><b>Next steps</b><div>${nx.map(n=>`<button class="btn btn-s" type="button" data-to="${esc(n)}">${esc(n)}</button>`).join('')}</div><label class="sr" for="osNote">Note</label><input id="osNote" class="os-in" placeholder="Optional note for the audit trail"></div>`:(E.flow&&r.status?'<p class="help">No further transitions from this status.</p>':'')}
 <form id="osEdit" class="fgrid" novalidate>${fields.map(f=>field(f,r[f.k])).join('')}${fields.length&&!E.readonly?`<button class="btn btn-p full">Save changes</button>`:''}</form>
 ${E.extra?E.extra(r,ctx):''}
 ${r.hist&&r.hist.length?`<h3 class="sa-h">History</h3><ol class="os-hist">${r.hist.slice().reverse().map(h=>`<li><b>${esc(h.from||'—')} → ${esc(h.to)}</b> · ${new Date(h.t).toLocaleString()} · ${esc(h.by)}${h.note?' · '+esc(h.note):''}</li>`).join('')}</ol>`:''}
 ${E.versions&&r.versions&&r.versions.length?`<h3 class="sa-h">Version history</h3><div class="tbl"><table><thead><tr><th>v</th><th>Change</th><th>When</th><th>By</th></tr></thead><tbody>${r.versions.map((v,i)=>`<tr><td>${i+1}</td><td>${esc(v.change)}</td><td>${new Date(v.t).toLocaleString()}</td><td>${esc(v.by)}</td></tr>`).join('')}</tbody></table></div>`:''}`,
 ()=>{$$('[data-to]').forEach(b=>b.onclick=()=>{if(setStatus(e,r,b.dataset.to,($('#osNote')||{}).value)){toast(`${r.id} → ${b.dataset.to}`);detail(e,r,after);after&&after()}});
  const fm=$('#osEdit');if(fm)fm.onsubmit=ev=>{ev.preventDefault();const ch=[];fields.forEach(f=>{const el=fm.elements[f.k];if(!el)return;let v=f.t==='number'||f.t==='money'?+el.value:f.t==='bool'?el.checked:el.value;if(String(v)!==String(r[f.k])){ch.push(`${f.l}: ${r[f.k]} → ${v}`);r[f.k]=v}});
   if(!ch.length){toast('No changes');return}const g=E.editGuard&&E.editGuard(r,ch,ctx);if(g){toast(g);return}if(E.versions)(r.versions=r.versions||[]).push({t:new Date().toISOString(),change:ch.join('; '),by:role().name});log(`Edited ${E.label||e}`,r.id+' — '+ch.join('; '));save();toast('Saved');detail(e,r,after);after&&after()};
  E.extraBind&&E.extraBind(r,ctx,()=>{detail(e,r,after);after&&after()})})}
ctx.detail=detail;
function field(f,v){const id='f_'+f.k;v=v??f.d??'';const req=f.req?' required':'';
 if(f.t==='select')return`<div class="fld${f.full?' full':''}"><label for="${id}">${esc(f.l)}</label><select id="${id}" name="${f.k}">${f.o.map(o=>`<option${String(o)===String(v)?' selected':''}>${esc(o)}</option>`).join('')}</select></div>`;
 if(f.t==='bool')return`<div class="fld"><label class="chk" style="border:0"><input type="checkbox" name="${f.k}"${v?' checked':''}>${esc(f.l)}</label></div>`;
 if(f.t==='area')return`<div class="fld full"><label for="${id}">${esc(f.l)}</label><textarea id="${id}" name="${f.k}" rows="3" class="os-in"${req}>${esc(v)}</textarea></div>`;
 return`<div class="fld${f.full?' full':''}"><label for="${id}">${esc(f.l)}</label><input id="${id}" name="${f.k}" type="${f.t==='money'?'number':f.t||'text'}" value="${esc(v)}"${req}${f.t==='money'||f.t==='number'?' min="0" step="any"':''}><div class="msg">Required</div></div>`}
ctx.field=field;
function addForm(e,after){const E=ent(e);drawer('New '+(E.label||e),`<form id="osAdd" class="fgrid" novalidate>${E.fields.map(f=>field(f)).join('')}<button class="btn btn-p full">Create</button></form>`,()=>{$('#osAdd').onsubmit=ev=>{ev.preventDefault();const fm=ev.target;let ok=true;const r={id:uid(E.prefix||'REC')};
 E.fields.forEach(f=>{const el=fm.elements[f.k];let v=f.t==='number'||f.t==='money'?+el.value:f.t==='bool'?el.checked:el.value;const bad=f.req&&(v===''||v===0&&f.t!=='number');el.closest('.fld').classList.toggle('err',bad);if(bad)ok=false;r[f.k]=v});
 if(!ok)return;if(E.initial)r.status=E.initial;const g=E.createGuard&&E.createGuard(r,ctx);if(g){toast(g);return}E.onCreate&&E.onCreate(r,ctx);S.data[e].unshift(r);log('Created '+(E.label||e),r.id);save();closeDrawer();toast((E.label||e)+' '+r.id+' created');after()}})}
ctx.addForm=addForm;
/* ---------- module renderers ---------- */
const R={
 overview(m,v){const k=m.kpis(ctx);v.innerHTML=`<h1 class="os-h1">${esc(m.title||m.name)}</h1><div class="grid g4">${k.map(x=>`<div class="card sa-kpi"><small class="help">${esc(x[0])}</small><div class="os-big">${x[1]}</div>${x[2]?`<small class="help">${esc(x[2])}</small>`:''}</div>`).join('')}</div>${m.body?m.body(ctx):''}`;m.bind&&m.bind(ctx,v)},
 table(m,v){const e=m.entity,E=ent(e),rows=S.data[e]||[];const sts=[...new Set(rows.map(r=>r.status).filter(Boolean))];const st=v.dataset.st||'All';const q=(v.dataset.q||'').toLowerCase();
  let list=rows.filter(r=>(st==='All'||r.status===st)&&(!q||JSON.stringify(r).toLowerCase().includes(q)));if(m.scope)list=list.filter(r=>m.scope(r,ctx));
  v.innerHTML=`<div class="os-head"><div><h1 class="os-h1">${esc(m.name)}</h1>${m.desc?`<p class="help">${esc(m.desc)}</p>`:''}</div><div class="os-hb">${E.fields&&!m.noAdd?`<button class="btn btn-p" id="osNew" type="button">+ New ${esc(E.label||'')}</button>`:''}<button class="btn btn-o" id="osCsv" type="button">Export CSV</button></div></div>
  ${m.top?m.top(ctx,list):''}
  <div class="sa-bar"><label class="sr" for="osTQ">Search ${esc(m.name)}</label><input id="osTQ" class="sa-q" type="search" placeholder="Search ${esc(m.name.toLowerCase())}…" value="${esc(v.dataset.q||'')}">${sts.length>1?`<div class="filters" role="group" aria-label="Filter by status" style="margin:0">${['All',...sts].map(s=>`<button class="chipb" type="button" aria-pressed="${s===st}" data-st="${esc(s)}">${esc(s)} <small>${s==='All'?rows.length:rows.filter(r=>r.status===s).length}</small></button>`).join('')}</div>`:''}</div>
  ${list.length?`<div class="tbl"><table><thead><tr>${m.cols.map(c=>`<th>${esc(c.l)}</th>`).join('')}<th><span class="sr">Open</span></th></tr></thead><tbody>${list.map(r=>`<tr data-id="${esc(r.id)}" tabindex="0" class="os-row">${m.cols.map(c=>`<td>${fmt(c,r)}</td>`).join('')}<td>›</td></tr>`).join('')}</tbody></table></div>`:`<div class="empty"><h3>No ${esc(m.name.toLowerCase())} found</h3><p class="help">Try another filter${E.fields&&!m.noAdd?' or create one':''}.</p></div>`}`;
  const rr=()=>R.table(m,v);
  $('#osTQ',v).oninput=ev=>{v.dataset.q=ev.target.value;rr();const i=$('#osTQ',v);i.focus();i.setSelectionRange(i.value.length,i.value.length)};
  $$('[data-st]',v).forEach(b=>b.onclick=()=>{v.dataset.st=b.dataset.st;rr()});
  $$('.os-row',v).forEach(tr=>{const o=()=>detail(e,rows.find(r=>r.id===tr.dataset.id),rr);tr.onclick=o;tr.onkeydown=ev=>{if(ev.key==='Enter')o()}});
  const n=$('#osNew',v);if(n)n.onclick=()=>addForm(e,rr);$('#osCsv',v).onclick=()=>csv(e,['id',...m.cols.map(c=>c.k).filter(k=>k!=='id'),'status'].filter((x,i,a)=>a.indexOf(x)===i),list);m.bind&&m.bind(ctx,v)},
 kanban(m,v){const e=m.entity,E=ent(e),rows=S.data[e]||[];const cols=m.stages||Object.keys(E.flow||{});
  v.innerHTML=`<div class="os-head"><div><h1 class="os-h1">${esc(m.name)}</h1>${m.desc?`<p class="help">${esc(m.desc)}</p>`:''}</div><div class="os-hb">${E.fields?`<button class="btn btn-p" id="osNew" type="button">+ New ${esc(E.label||'')}</button>`:''}</div></div>
  <div class="os-kb">${cols.map(c=>{const it=rows.filter(r=>r.status===c);return`<section class="os-col" aria-label="${esc(c)}"><h3>${esc(c)} <small>${it.length}</small></h3>${it.map(r=>`<article class="os-card" data-id="${esc(r.id)}" tabindex="0"><b>${esc(r[E.title||'name'])}</b><small>${esc(r.id)}${m.sub?' · '+esc(m.sub(r)):''}</small>${flowNext(e,c).length?`<div class="os-mv">${flowNext(e,c).map(n=>`<button type="button" class="chipb" data-mv="${esc(n)}">→ ${esc(n)}</button>`).join('')}</div>`:''}</article>`).join('')||'<p class="help" style="padding:6px">Empty</p>'}</section>`}).join('')}</div>`;
  const rr=()=>R.kanban(m,v);$$('.os-card',v).forEach(c=>{const r=rows.find(x=>x.id===c.dataset.id);c.onclick=ev=>{const b=ev.target.closest('[data-mv]');if(b){ev.stopPropagation();if(setStatus(e,r,b.dataset.mv)){toast(r.id+' → '+b.dataset.mv);rr()}return}detail(e,r,rr)};c.onkeydown=ev=>{if(ev.key==='Enter')detail(e,r,rr)}});
  const n=$('#osNew',v);if(n)n.onclick=()=>addForm(e,rr)},
 calendar(m,v){const rows=(S.data[m.entity]||[]).filter(r=>r[m.dateKey]);const d=v.dataset.m?new Date(v.dataset.m+'-01T12:00'):new Date();const y=d.getFullYear(),mo=d.getMonth();const first=new Date(y,mo,1).getDay(),days=new Date(y,mo+1,0).getDate();const ym=`${y}-${String(mo+1).padStart(2,'0')}`;
  const cells=[];for(let i=0;i<first;i++)cells.push('<div class="os-cd os-o"></div>');for(let i=1;i<=days;i++){const ds=`${ym}-${String(i).padStart(2,'0')}`;const it=rows.filter(r=>r[m.dateKey]===ds);cells.push(`<div class="os-cd${ds===today()?' os-today':''}"><b>${i}</b>${it.map(r=>`<button type="button" class="os-ev" data-id="${esc(r.id)}">${esc(r[ent(m.entity).title||'name'])}</button>`).join('')}</div>`)}
  v.innerHTML=`<div class="os-head"><h1 class="os-h1">${esc(m.name)}</h1><div class="os-hb"><button class="btn btn-o" id="osPrev" type="button" aria-label="Previous month">‹</button><b style="min-width:150px;text-align:center">${d.toLocaleString(undefined,{month:'long',year:'numeric'})}</b><button class="btn btn-o" id="osNext" type="button" aria-label="Next month">›</button><button class="btn btn-g" id="osIcs" type="button">Export .ics</button></div></div>
  <div class="os-cal">${['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].map(x=>`<div class="os-dh">${x}</div>`).join('')}${cells.join('')}</div><h3 class="sa-h">Agenda</h3>${rows.filter(r=>r[m.dateKey].startsWith(ym)).sort((a,b)=>a[m.dateKey]<b[m.dateKey]?-1:1).map(r=>`<div class="card os-ag"><b>${esc(r[m.dateKey])}</b> ${esc(r[ent(m.entity).title||'name'])} ${r.status?`<span class="os-st">${esc(r.status)}</span>`:''}</div>`).join('')||'<p class="help">Nothing scheduled this month.</p>'}`;
  const mv=k=>{const n=new Date(y,mo+k,1);v.dataset.m=`${n.getFullYear()}-${String(n.getMonth()+1).padStart(2,'0')}`;R.calendar(m,v)};$('#osPrev',v).onclick=()=>mv(-1);$('#osNext',v).onclick=()=>mv(1);
  $$('.os-ev',v).forEach(b=>b.onclick=()=>detail(m.entity,rows.find(r=>r.id===b.dataset.id),()=>R.calendar(m,v)));
  $('#osIcs',v).onclick=()=>{const L=['BEGIN:VCALENDAR','VERSION:2.0','PRODID:-//MoveMatch//OS//EN'];rows.forEach(r=>{const dt=r[m.dateKey].replace(/-/g,'');L.push('BEGIN:VEVENT','UID:'+r.id+'@movematch','DTSTART;VALUE=DATE:'+dt,'SUMMARY:'+(r[ent(m.entity).title||'name']||r.id),'END:VEVENT')});L.push('END:VCALENDAR');const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([L.join('\r\n')],{type:'text/calendar'}));a.download=CFG.id+'-calendar.ics';a.click();log('Exported calendar')}},
 checklist(m,v){const lists=S.data[m.entity];const all=lists.flatMap(l=>l.items);const done=all.filter(i=>i.done).length;
  v.innerHTML=`<div class="os-head"><h1 class="os-h1">${esc(m.name)}</h1><div class="os-hb"><b>${Math.round(done/Math.max(all.length,1)*100)}% complete</b></div></div><div class="prog" style="margin-bottom:18px"><i style="width:${done/Math.max(all.length,1)*100}%"></i></div><div class="grid g3">${lists.map((l,li)=>`<div class="card"><h3 style="font-size:17px">${esc(l.name)}</h3>${l.items.map((it,ii)=>`<label class="chk"><input type="checkbox" data-c="${li}.${ii}"${it.done?' checked':''}><span>${esc(it.t)}${it.due?` <small class="help">· due ${esc(it.due)}</small>`:''}</span></label>`).join('')}<form class="os-addi" data-l="${li}" style="display:flex;gap:6px;margin-top:8px"><label class="sr" for="ai${li}">Add task</label><input id="ai${li}" class="os-in" placeholder="Add a task"><button class="btn btn-o" style="min-height:38px">Add</button></form></div>`).join('')}</div>`;
  $$('[data-c]',v).forEach(c=>c.onchange=()=>{const[a,b]=c.dataset.c.split('.');const it=lists[a].items[b];it.done=c.checked;log((c.checked?'Completed':'Reopened')+' task',it.t);save();R.checklist(m,v)});
  $$('.os-addi',v).forEach(f=>f.onsubmit=e=>{e.preventDefault();const i=f.querySelector('input');if(!i.value.trim())return;lists[f.dataset.l].items.push({t:i.value.trim(),done:false});log('Added task',i.value);save();R.checklist(m,v)})},
 custom(m,v){m.render(ctx,v)}};
/* ---------- router ---------- */
function render(){const id=(location.hash||'').slice(1);const m=CFG.modules.find(x=>x.id===id)||CFG.modules[0];const v=$('#osView');
 $$('#osNav .sa-link').forEach(a=>{const on=a.dataset.m===m.id;a.classList.toggle('on',on);if(on)a.setAttribute('aria-current','page');else a.removeAttribute('aria-current');a.classList.toggle('sa-locked',!can(a.dataset.m))});
 root.classList.remove('open');$('#osMenu').setAttribute('aria-expanded','false');
 if(!can(m.id)){v.innerHTML=`<div class="empty" style="margin-top:30px"><h2>No permission</h2><p class="help">The <b>${esc(role().name)}</b> role cannot open <b>${esc(m.name)}</b>. Switch role at the top to continue.</p></div>`;return}
 if(v.dataset.mod!==m.id){v.dataset.mod=m.id;delete v.dataset.q;delete v.dataset.st;delete v.dataset.m}
 R[m.type](m,v);document.title=`${m.name} · ${CFG.title} | MoveMatch`}
ctx.R=R;render();
})();
