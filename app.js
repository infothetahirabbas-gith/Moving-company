(()=>{
const $=(s,r=document)=>r.querySelector(s),$$=(s,r=document)=>[...r.querySelectorAll(s)];
const RM=matchMedia('(prefers-reduced-motion: reduce)').matches;
const today=new Date().toISOString().split('T')[0];
const money=n=>'$'+(Math.round(n/10)*10).toLocaleString();
const store={get(k){try{return JSON.parse(localStorage.getItem(k))}catch(e){return null}},set(k,v){try{localStorage.setItem(k,JSON.stringify(v))}catch(e){}}};
let lastFocus=null;

/* toast */
let tt;window.mmToast=(m,c)=>{const t=$('#toast');if(!t)return;t.textContent=m;t.style.borderLeftColor=c||'var(--ok)';t.classList.add('on');clearTimeout(tt);tt=setTimeout(()=>t.classList.remove('on'),4200)};

/* announcement */
const ann=$('#ann');if(ann){if(store.get('mm_ann'))ann.classList.add('hide');$('#annX').onclick=()=>{ann.classList.add('hide');store.set('mm_ann',1)}}

/* header */
const hdr=$('#hdr'),mbar=$('#mbar');
addEventListener('scroll',()=>{hdr.classList.toggle('scr',scrollY>8);mbar&&mbar.classList.toggle('on',scrollY>500)},{passive:true});

/* mega menus */
const mb=$$('.nav>li>button');
const closeM=x=>mb.forEach(b=>{if(b!==x){b.setAttribute('aria-expanded','false');$('#'+b.getAttribute('aria-controls')).classList.remove('open')}});
mb.forEach(b=>{const m=$('#'+b.getAttribute('aria-controls')),li=b.parentElement;let t;
 const open=()=>{closeM(b);b.setAttribute('aria-expanded','true');m.classList.add('open')},close=()=>{b.setAttribute('aria-expanded','false');m.classList.remove('open')};
 b.onclick=()=>b.getAttribute('aria-expanded')==='true'?close():open();
 const hv=matchMedia('(hover:hover)').matches;
 li.addEventListener('mouseenter',()=>{if(hv){clearTimeout(t);t=setTimeout(open,60)}});
 li.addEventListener('mouseleave',()=>{if(hv){clearTimeout(t);t=setTimeout(close,160)}});
 b.addEventListener('keydown',e=>{if(e.key==='ArrowDown'){e.preventDefault();open();$('a',m).focus()}});
 m.addEventListener('keydown',e=>{const ls=$$('a',m),i=ls.indexOf(document.activeElement);if(e.key==='ArrowDown'){e.preventDefault();ls[(i+1)%ls.length].focus()}if(e.key==='ArrowUp'){e.preventDefault();ls[(i-1+ls.length)%ls.length].focus()}});
});
document.addEventListener('click',e=>{if(!e.target.closest('.nav'))closeM()});
document.addEventListener('keydown',e=>{if(e.key==='Escape'){const o=mb.find(b=>b.getAttribute('aria-expanded')==='true');closeM();o&&o.focus();$$('.modal.open,.drawer.open').forEach(closeOv)}});

/* overlays */
function openOv(el){lastFocus=document.activeElement;el.classList.add('open');el.setAttribute('aria-hidden','false');document.body.style.overflow='hidden';setTimeout(()=>{const f=$('input,select,textarea,a,button:not(.xbtn)',el.querySelector('.dlg,.pn'));(f||$('.xbtn',el)).focus()},60)}
function closeOv(el){if(!el||!el.classList.contains('open'))return;el.classList.remove('open');el.setAttribute('aria-hidden','true');if(!$$('.modal.open,.drawer.open').length)document.body.style.overflow='';lastFocus&&lastFocus.focus()}
window.mmOpen=openOv;window.mmClose=closeOv;
document.addEventListener('click',e=>{const c=e.target.closest('[data-close]');if(c)closeOv(c.closest('.modal,.drawer'))});
document.addEventListener('keydown',e=>{if(e.key!=='Tab')return;const o=$('.modal.open .dlg,.drawer.open .pn');if(!o)return;const f=$$('a,button,input,select,textarea',o).filter(x=>x.offsetParent&&!x.disabled);if(!f.length)return;const a=f[0],z=f[f.length-1];if(e.shiftKey&&document.activeElement===a){e.preventDefault();z.focus()}else if(!e.shiftKey&&document.activeElement===z){e.preventDefault();a.focus()}});
const bg=$('#burger');if(bg)bg.onclick=()=>{openOv($('#drawer'));bg.setAttribute('aria-expanded','true')};
$('#drawer')&&$('#drawer').addEventListener('click',e=>{if(e.target.closest('[data-close]'))bg.setAttribute('aria-expanded','false')});

/* locations + autocomplete */
const PLACES=["New York, NY","Brooklyn, NY","Los Angeles, CA","San Diego, CA","San Francisco, CA","San Jose, CA","Sacramento, CA","Chicago, IL","Houston, TX","Dallas, TX","Austin, TX","San Antonio, TX","Fort Worth, TX","Phoenix, AZ","Scottsdale, AZ","Tucson, AZ","Philadelphia, PA","Pittsburgh, PA","Atlanta, GA","Miami, FL","Orlando, FL","Tampa, FL","Jacksonville, FL","Seattle, WA","Spokane, WA","Denver, CO","Colorado Springs, CO","Boston, MA","Washington, DC","Baltimore, MD","Nashville, TN","Memphis, TN","Charlotte, NC","Raleigh, NC","Las Vegas, NV","Portland, OR","Minneapolis, MN","Salt Lake City, UT","Kansas City, MO","St. Louis, MO","Columbus, OH","Cleveland, OH","Detroit, MI","Indianapolis, IN","Milwaukee, WI","New Orleans, LA","Oklahoma City, OK","Albuquerque, NM","Boise, ID","Honolulu, HI","Anchorage, AK","Richmond, VA","Louisville, KY","Omaha, NE","Charleston, SC"];
window.mmPlaces=PLACES;
const validLoc=v=>{v=(v||'').trim();return /^\d{5}$/.test(v)||PLACES.some(c=>c.toLowerCase()===v.toLowerCase())||/^[a-z .'-]{2,},\s?[a-z]{2}$/i.test(v)};
function ac(inp){const ul=document.createElement('ul');ul.setAttribute('role','listbox');ul.id=inp.id+'-l';ul.hidden=true;inp.parentElement.appendChild(ul);
 inp.setAttribute('role','combobox');inp.setAttribute('aria-autocomplete','list');inp.setAttribute('aria-expanded','false');inp.setAttribute('aria-controls',ul.id);let idx=-1,it=[];
 const pin='<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#52606D" stroke-width="2"><path d="M12 21s-7-6.5-7-12a7 7 0 0114 0c0 5.5-7 12-7 12z"/><circle cx="12" cy="9" r="2.5"/></svg>';
 const show=()=>{const v=inp.value.trim().toLowerCase();it=v?PLACES.filter(c=>c.toLowerCase().includes(v)).slice(0,6):[];if(/^\d{3,5}$/.test(v))it=[inp.value.trim()+' (ZIP code)'].concat(it);idx=-1;ul.innerHTML=it.map((c,i)=>`<li role="option" id="${ul.id}${i}">${pin}${c}</li>`).join('');ul.hidden=!it.length;inp.setAttribute('aria-expanded',!!it.length)};
 const pick=c=>{inp.value=c.replace(' (ZIP code)','');ul.hidden=true;inp.setAttribute('aria-expanded','false');inp.closest('.fld').classList.remove('bad');inp.dispatchEvent(new Event('change',{bubbles:true}))};
 inp.addEventListener('input',show);
 inp.addEventListener('keydown',e=>{if(ul.hidden)return;if(e.key==='ArrowDown'||e.key==='ArrowUp'){e.preventDefault();idx=(idx+(e.key==='ArrowDown'?1:-1)+it.length)%it.length;$$('li',ul).forEach((l,i)=>l.setAttribute('aria-selected',i===idx));inp.setAttribute('aria-activedescendant',ul.id+idx)}else if(e.key==='Enter'&&idx>-1){e.preventDefault();pick(it[idx])}else if(e.key==='Escape'){ul.hidden=true;e.stopPropagation()}});
 ul.addEventListener('mousedown',e=>{const l=e.target.closest('li');if(l){e.preventDefault();pick(l.textContent)}});
 inp.addEventListener('blur',()=>setTimeout(()=>{ul.hidden=true;inp.setAttribute('aria-expanded','false')},120));}
$$('[data-ac]').forEach(ac);
$$('input[type=date]').forEach(d=>d.min=today);
const mark=(el,ok)=>{const f=el.closest('.fld');f&&f.classList.toggle('bad',!ok);el.setAttribute('aria-invalid',!ok);return ok};
const emailOk=v=>/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v);
document.addEventListener('input',e=>{const f=e.target.closest('.fld.bad');if(f){f.classList.remove('bad');e.target.removeAttribute('aria-invalid')}});

/* hero quote form (2-step) */
const hf=$('#heroForm');
if(hf){const saved=store.get('mm_hero')||{};$$('[name]',hf).forEach(x=>{if(saved[x.name])x.value=saved[x.name]});
 hf.addEventListener('input',()=>{const o={};$$('[name]',hf).forEach(x=>o[x.name]=x.value);store.set('mm_hero',o)});
 const steps=$$('.hstep',hf),bars=$$('.qsteps i',hf);let s=0;
 const go=n=>{s=n;steps.forEach((x,i)=>x.hidden=i!==n);bars.forEach((b,i)=>b.classList.toggle('on',i<=n));$('#hsLbl').textContent=`Step ${n+1} of 2`;$('#hSub').firstChild.textContent=n?'Get My Free Moving Quotes ':'Continue ';const f=$('input,select',steps[n]);f&&n&&f.focus()};
 hf.onsubmit=e=>{e.preventDefault();
  if(s===0){const a=mark($('#hFrom'),validLoc($('#hFrom').value)),b=mark($('#hTo'),validLoc($('#hTo').value)),c=mark($('#hDate'),!!$('#hDate').value&&$('#hDate').value>=today);if(!(a&&b&&c)){$('.fld.bad input',hf).focus();return}go(1);return}
  const btn=$('button[type=submit]',hf);if(btn.classList.contains('loading'))return;btn.classList.add('loading');
  const o={};$$('[name]',hf).forEach(x=>o[x.name]=x.value);store.set('mm_quote_seed',o);
  setTimeout(()=>{location.href=hf.getAttribute('action')},350)};
 $('#hBack')&&($('#hBack').onclick=()=>go(0));go(0);}

/* global data-goto city/service seed */
document.addEventListener('click',e=>{const a=e.target.closest('[data-seed]');if(a){const seed=store.get('mm_quote_seed')||{};Object.assign(seed,JSON.parse(a.dataset.seed));store.set('mm_quote_seed',seed)}});

/* QUOTE WIZARD */
const wz=$('#wizard');
if(wz){const ws=$$('.ws',wz),N=ws.length-1,lis=$$('.wside li');let cur=0;
 const draft=store.get('mm_quote_draft')||{},seed=store.get('mm_quote_seed')||{};
 const map={from:'from',to:'to',date:'date',type:'mtype',prop:'prop'};
 Object.entries(seed).forEach(([k,v])=>{const el=wz.querySelector(`[name="${map[k]||k}"]`);if(el&&v&&!el.value)el.value=v});
 Object.entries(draft.f||{}).forEach(([k,v])=>{const el=wz.querySelector(`[name="${k}"]`);if(!el)return;if(el.type==='checkbox'||el.type==='radio'){$$(`[name="${k}"]`,wz).forEach(x=>x.checked=[].concat(v).includes(x.value))}else el.value=v});
 if(seed.svc){$$('[name=extras]',wz).forEach(x=>{if(x.value===seed.svc)x.checked=true})}
 const inv=draft.inv||{};$$('.it',wz).forEach(r=>{const k=r.dataset.k;if(inv[k]!=null)$('output',r).textContent=inv[k]});
 const collect=()=>{const f={};$$('[name]',wz).forEach(x=>{if(x.type==='checkbox'){if(!f[x.name])f[x.name]=[];if(x.checked)f[x.name].push(x.value)}else if(x.type==='radio'){if(x.checked)f[x.name]=x.value}else f[x.name]=x.value});const i={};$$('.it',wz).forEach(r=>i[r.dataset.k]=+$('output',r).textContent);return{f,inv:i}};
 const save=()=>store.set('mm_quote_draft',{...collect(),step:cur});
 wz.addEventListener('input',save);wz.addEventListener('change',save);
 wz.addEventListener('click',e=>{const b=e.target.closest('.qty button');if(!b)return;const o=$('output',b.parentElement);o.textContent=Math.max(0,+o.textContent+(+b.dataset.d));save()});
 const show=n=>{cur=n;ws.forEach((x,i)=>x.classList.toggle('on',i===n));lis.forEach((l,i)=>{l.classList.toggle('cur',i===n);l.classList.toggle('done',i<n)});
  $('#wProg').style.width=(Math.min(n,N)/N*100)+'%';$('#wStep').textContent=n<N?`Step ${n+1} of ${N}`:'Request complete';
  $('#wBack').style.visibility=n>0&&n<N?'visible':'hidden';$('#wNext').textContent=n===N-1?'Submit request':n===N?'Go to homepage':'Continue';
  if(n===N-1)review();save();const f=$('input:not([type=checkbox]):not([type=radio]),select',ws[n]);if(f&&n)setTimeout(()=>f.focus({preventScroll:true}),80);
  wz.scrollIntoView({behavior:RM?'auto':'smooth',block:'start'})};
 const v=n=>{const s=ws[n];let ok=true;
  $$('[data-ac]',s).forEach(x=>{if(!mark(x,validLoc(x.value)))ok=false});
  $$('input[type=date][required]',s).forEach(x=>{if(!mark(x,!!x.value&&x.value>=today))ok=false});
  $$('input[type=email]',s).forEach(x=>{if(!mark(x,emailOk(x.value)))ok=false});
  $$('input[required]:not([type=date]):not([type=email]):not([type=checkbox]):not([data-ac])',s).forEach(x=>{if(!mark(x,x.value.trim().length>1))ok=false});
  $$('[data-req-radio]',s).forEach(g=>{const c=$$('input',g).some(x=>x.checked);g.closest('.fld').classList.toggle('bad',!c);if(!c)ok=false});
  const cons=$('#wCons',s);if(cons){$('#wConsE').style.display=cons.checked?'none':'block';if(!cons.checked)ok=false}
  if(!ok){const b=$('.fld.bad input,.fld.bad select',s);b&&b.focus()}return ok};
 const review=()=>{const {f,inv}=collect();const items=Object.entries(inv).filter(x=>x[1]).map(x=>x[1]+' × '+x[0]).join(', ');
  $('#wRev').innerHTML=[['From',f.from],['To',f.to],['Date',(f.date||'')+' · '+(f.flex||'')],['Move type',f.mtype],['Property',(f.prop||'')+(f.rooms?' · '+f.rooms+' rooms':'')],['Access',[f.accessFrom,f.accessTo].filter(Boolean).join(' → ')],['Inventory',items||'Not specified'],['Packing',f.packing],['Storage',f.storage],['Specialty items',(f.special||[]).join(', ')||'None'],['Extra services',(f.extras||[]).join(', ')||'None'],['Contact',[f.name,f.email,f.phone].filter(Boolean).join(' · ')],['Contact by',f.pref]].map(r=>`<div><span>${r[0]}</span><b>${r[1]||'—'}</b></div>`).join('')};
 let busy=false;
 $('#wNext').onclick=()=>{if(cur===N){location.href='/';return}if(!v(cur))return;
  if(cur===N-1){if(busy)return;busy=true;const b=$('#wNext');b.classList.add('loading');
   const data=collect(),key=JSON.stringify(data.f.email+data.f.from+data.f.to+data.f.date);const prev=store.get('mm_sub_keys')||[];
   setTimeout(()=>{b.classList.remove('loading');busy=false;
    if(prev.includes(key)){mmToast('You already saved this exact request.','var(--warn)')}
    const ref='MM-'+Date.now().toString(36).toUpperCase().slice(-6);$('#wRef').textContent=ref;
    store.set('mm_req_'+ref,data);prev.push(key);store.set('mm_sub_keys',prev);localStorage.removeItem('mm_quote_draft');localStorage.removeItem('mm_quote_seed');
    show(N)},900);return}
  show(cur+1)};
 $('#wBack').onclick=()=>show(Math.max(0,cur-1));
 lis.forEach((l,i)=>l.addEventListener('click',()=>{if(i<cur)show(i)}));
 show(Math.min(draft.step||0,N-1));if(!draft.step)window.scrollTo(0,0);
}

/* cost calculator */
$$('[data-calc=cost]').forEach(root=>{
 const base=[[420,3],[620,4],[900,5.5],[1300,7],[1850,9],[2400,10]],exP={packing:[.35,2],storage:[160,0],specialty:[280,1],assembly:[140,1]};
 const q=s=>$(s,root);
 const run=()=>{const p=q('[name=cProp]').selectedIndex,d=+q('[name=cDist]').value,acc=+(q('.cAccess [aria-pressed=true]')||{dataset:{v:0}}).dataset.v;
  q('.cDistV').textContent=d.toLocaleString();let [b,h]=base[p];const tr=d<=60?d*3.2:d<=600?190+(d-60)*1.45:975+(d-600)*.85,ac=b*[0,.12,.25][acc];let ex=0,eh=0;
  $$('.cExtra [aria-pressed=true]',root).forEach(x=>{const v=exP[x.dataset.v];ex+=v[0]<1?b*v[0]:v[0];eh+=v[1]});
  const dv=q('[name=cDate]').value,dt=dv?new Date(dv+'T12:00'):new Date(),m=dt.getMonth(),dw=dt.getDay(),se=(m>=4&&m<=8?.15:0)+(dw===0||dw===6||dt.getDate()>=28?.08:0);
  const t=(b+tr+ac+ex)*(1+se),big=q('.cRange');big.textContent=`${money(t*.85)} – ${money(t*1.2)}`;if(!RM){big.classList.remove('pulse');void big.offsetWidth;big.classList.add('pulse')}
  q('.cHrs').textContent=`Approx. ${Math.round(h+eh+(d<=60?d/25:d/50))} working hours`;
  q('.cRows').innerHTML=`<div>Property<b>${q('[name=cProp]').selectedOptions[0].text}</b></div><div>Distance &amp; travel<b>${money(tr)}</b></div><div>Access conditions<b>${money(ac)}</b></div><div>Added services<b>${money(ex)}</b></div><div>Date &amp; season<b>${se?'+'+Math.round(se*100)+'%':'Standard'}</b></div>`;
  q('.cMeter').style.width=Math.min(100,20+se*300)+'%'};
 $$('.cAccess .opt',root).forEach(b=>b.onclick=()=>{$$('.cAccess .opt',root).forEach(x=>x.setAttribute('aria-pressed',x===b));run()});
 $$('.cExtra .opt',root).forEach(b=>b.onclick=()=>{b.setAttribute('aria-pressed',b.getAttribute('aria-pressed')!=='true');run()});
 $$('input,select',root).forEach(x=>x.addEventListener('input',run));run();});

/* generic small calculators */
$$('[data-calc]').forEach(root=>{const t=root.dataset.calc,o=$('.cOut',root);if(!o)return;
 const val=n=>+($(`[name=${n}]`,root)||{}).value||0;
 const fns={
  packing:()=>{const r=val('rooms'),k=val('kitchen'),f=$('[name=fragile]',root).checked?1.25:1;return[['Small boxes',Math.round((r*6+k*10)*f)],['Medium boxes',Math.round(r*5*f)],['Large boxes',r*3],['Dish-pack boxes',k*3],['Wardrobe boxes',Math.ceil(r/2)],['Packing tape (rolls)',Math.ceil(r*1.5)],['Packing paper (lb)',Math.round((r*3+k*6)*f)],['Bubble wrap (ft)',Math.round(r*20*f)]]},
  box:()=>{const s=val('size'),p=val('people'),mult=[.6,1,1.5,2.1,2.8][s]*(1+(p-1)*.12);return[['Small (1.5 cu ft)',Math.round(25*mult)],['Medium (3 cu ft)',Math.round(20*mult)],['Large (4.5 cu ft)',Math.round(10*mult)],['Extra-large (6 cu ft)',Math.round(5*mult)],['Wardrobe',Math.round(3*mult)],['Total boxes',Math.round(63*mult)]]},
  volume:()=>{const items=$$('.qty output',root).map(x=>+x.textContent),cf=[35,70,60,30,20,40,3];let tot=items.reduce((a,n,i)=>a+n*cf[i],0);const truck=tot<=400?'10 ft truck':tot<=800?'15 ft truck':tot<=1200?'20 ft truck':'26 ft truck';return[['Estimated volume',tot+' cu ft'],['Estimated weight',(tot*7).toLocaleString()+' lb'],['Suggested truck',truck]]},
  storage:()=>{const r=val('rooms'),m=val('months'),c=$('[name=climate]',root).checked;const unit=r<=1?'5×10 ft':r<=2?'10×10 ft':r<=3?'10×15 ft':r<=4?'10×20 ft':'10×30 ft';const base=[0,90,140,190,240,320][Math.min(5,r)]*(c?1.3:1);return[['Recommended unit',unit],['Typical monthly range',money(base*.8)+' – '+money(base*1.25)],['Estimated total ('+m+' mo)',money(base*m)],['Climate control',c?'Included':'Not included']]},
  budget:()=>{const s=$$('input[type=number]',root).reduce((a,x)=>a+(+x.value||0),0);return[['Subtotal',money(s)],['Contingency (10%)',money(s*.1)],['Total budget',money(s*1.1)]]},
  date:()=>{const v=$('[name=mdate]',root).value;if(!v)return[['Choose a date','—']];const d=new Date(v+'T12:00'),m=d.getMonth(),w=d.getDay(),dd=d.getDate();const peak=m>=4&&m<=8,wk=w===0||w===6,me=dd>=25||dd<=3;const sc=100-(peak?30:0)-(wk?15:0)-(me?20:0);return[['Season',peak?'Peak (May–Sep)':'Off-peak'],['Day of week',wk?'Weekend — higher demand':'Weekday — better availability'],['Month timing',me?'Month end/start — busiest':'Mid-month — quieter'],['Demand score',sc+' / 100 '+(sc>=75?'(great)':sc>=50?'(fair)':'(busy)')]]}
 };
 if(!fns[t])return;const run=()=>{o.innerHTML=fns[t]().map(r=>`<div><span>${r[0]}</span><b>${r[1]}</b></div>`).join('')};
 root.addEventListener('input',run);root.addEventListener('click',e=>{const b=e.target.closest('.qty button');if(b){const out=$('output',b.parentElement);out.textContent=Math.max(0,+out.textContent+(+b.dataset.d));run()}});run();
 const ex=$('[data-export]',root);if(ex)ex.onclick=()=>{const txt=$$('div',o).map(d=>d.textContent.replace(/(\D)(\$)/,'$1: $2')).join('\n');const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([txt],{type:'text/plain'}));a.download='movematch-'+t+'.txt';a.click()};
});

/* checklist with saving */
$$('[data-checklist]').forEach(root=>{const k='mm_ck_'+root.dataset.checklist,s=store.get(k)||{};const cbs=$$('input[type=checkbox]',root);
 const upd=()=>{const n=cbs.filter(c=>c.checked).length;const p=$('.ckp',root);if(p){p.querySelector('i').style.width=(n/cbs.length*100)+'%';$('.ckn',root).textContent=`${n} of ${cbs.length} done`}};
 cbs.forEach((c,i)=>{c.checked=!!s[i];c.onchange=()=>{s[i]=c.checked;store.set(k,s);upd()}});upd()});

/* provider filter + compare */
const pf=$('#pFilt');
if(pf){pf.onclick=e=>{const b=e.target.closest('button');if(!b)return;$$('button',pf).forEach(x=>x.setAttribute('aria-pressed',x===b));let n=0;
 $$('.pcard').forEach(c=>{const s=b.dataset.c==='all'||c.dataset.cat.split(' ').includes(b.dataset.c);c.classList.toggle('out',!s);if(s){n++;RM||c.animate([{opacity:0,transform:'translateY(14px)'},{opacity:1,transform:'none'}],{duration:320,easing:'ease-out'})}});
 $('#pEmpty').hidden=!!n};
 const pre=pf.dataset.pre;if(pre){const b=$(`[data-c="${pre}"]`,pf);b&&b.click()}}
const sort=$('#pSort');if(sort)sort.onchange=()=>{const g=$('#pGrid'),cs=$$('.pcard',g);cs.sort((a,b)=>sort.value==='name'?a.dataset.n.localeCompare(b.dataset.n):sort.value==='checks'?b.dataset.ch-a.dataset.ch:a.dataset.i-b.dataset.i).forEach(c=>g.appendChild(c))};
const ps=$('#pSearch');if(ps)ps.oninput=()=>{const v=ps.value.toLowerCase();let n=0;$$('.pcard').forEach(c=>{const s=c.textContent.toLowerCase().includes(v);c.classList.toggle('out',!s);n+=s});$('#pEmpty').hidden=!!n};
const cmpSel=new Set(store.get('mm_cmp')||[]);
const updCmp=()=>{const bar=$('#cmpbar');$$('[data-cmp]').forEach(c=>c.checked=cmpSel.has(c.dataset.cmp));if(bar){$('#cmpTxt').textContent=cmpSel.size+' selected';bar.classList.toggle('on',cmpSel.size>0)}store.set('mm_cmp',[...cmpSel]);window.mmRenderCmp&&mmRenderCmp([...cmpSel])};
document.addEventListener('change',e=>{const c=e.target.closest('[data-cmp]');if(!c)return;if(c.checked){if(cmpSel.size>=3){c.checked=false;mmToast('You can compare up to 3 providers.','var(--warn)');return}cmpSel.add(c.dataset.cmp)}else cmpSel.delete(c.dataset.cmp);updCmp()});
updCmp();
$('#cmpClear')&&($('#cmpClear').onclick=()=>{cmpSel.clear();updCmp()});

/* tabs */
$$('[role=tablist]').forEach(tl=>{const tabs=$$('[role=tab]',tl);const sel=t=>tabs.forEach(x=>{const on=x===t;x.setAttribute('aria-selected',on);x.tabIndex=on?0:-1;$('#'+x.getAttribute('aria-controls')).hidden=!on});
 tabs.forEach((t,i)=>{t.onclick=()=>sel(t);t.onkeydown=e=>{const j=e.key==='ArrowRight'?i+1:e.key==='ArrowLeft'?i-1:null;if(j==null)return;const n=tabs[(j+tabs.length)%tabs.length];sel(n);n.focus()}})});

/* carousel */
$$('[data-carousel]').forEach(w=>{const tr=$('.rv-track',w),items=$$('.rv',tr),pg=$('.pgs',w.parentElement);let i=0,tm;
 const per=()=>innerWidth<=640?1:innerWidth<=960?2:3;
 const go=n=>{const max=Math.max(0,items.length-per());i=n>max?0:n<0?max:n;tr.style.transform=`translateX(${-i*(items[0].offsetWidth+22)}px)`;pg.innerHTML=Array.from({length:max+1},(_,k)=>`<button aria-label="Slide ${k+1}" ${k===i?'aria-current="true"':''} data-k="${k}"></button>`).join('')};
 pg.onclick=e=>{const b=e.target.closest('button');b&&go(+b.dataset.k)};
 $('.rvP',w.parentElement).onclick=()=>go(i-1);$('.rvN',w.parentElement).onclick=()=>go(i+1);
 let sx=null;w.addEventListener('touchstart',e=>sx=e.touches[0].clientX,{passive:true});w.addEventListener('touchend',e=>{if(sx==null)return;const dx=e.changedTouches[0].clientX-sx;if(Math.abs(dx)>40)go(i+(dx<0?1:-1));sx=null});
 new IntersectionObserver(([en])=>{clearInterval(tm);if(en.isIntersecting&&!RM)tm=setInterval(()=>go(i+1),5500)}).observe(w);
 w.addEventListener('mouseenter',()=>clearInterval(tm));addEventListener('resize',()=>go(i));go(0)});

/* FAQ */
document.addEventListener('click',e=>{const b=e.target.closest('.qa button');if(!b)return;const q=b.closest('.qa'),o=!q.classList.contains('open');q.classList.toggle('open',o);b.setAttribute('aria-expanded',o)});
const fq=$('#faqQ');if(fq)fq.oninput=()=>{const v=fq.value.toLowerCase();let n=0;$$('.qa').forEach(q=>{const s=q.textContent.toLowerCase().includes(v);q.hidden=!s;n+=s});$('#faqEmpty').hidden=!!n};

/* generic forms */
$$('form[data-form]').forEach(f=>f.addEventListener('submit',e=>{e.preventDefault();let ok=true;
 $$('[required]',f).forEach(x=>{const good=x.type==='email'?emailOk(x.value):x.type==='checkbox'?x.checked:x.value.trim().length>0;if(!mark(x,good)&&ok){ok=false;x.focus()}});
 if(f.dataset.form==='signup'){const p=$('[name=password]',f);if(p&&p.value.length<8){mark(p,false);ok=false}}
 if(!ok)return;const b=$('button[type=submit],button:not([type])',f);b.classList.add('loading');
 setTimeout(()=>{b.classList.remove('loading');const msg=f.dataset.msg||'Saved.';const box=$('.fdone',f.parentElement);if(box){f.hidden=true;box.hidden=false;box.focus()}else mmToast(msg);store.set('mm_form_'+f.dataset.form,Date.now())},800)}));

/* track my move demo */
const tk=$('#trackForm');if(tk)tk.onsubmit=e=>{e.preventDefault();const r=$('#tRef').value.trim().toUpperCase();const ok=/^MM-[A-Z0-9]{4,8}$/.test(r);mark($('#tRef'),ok);if(!ok)return;const d=store.get('mm_req_'+r);
 $('#tOut').hidden=false;$('#tOut').innerHTML=d?`<div class="notice info"><div><b>Request ${r} found in this browser.</b><br>Route: ${d.f.from} → ${d.f.to}. Status: <b>Request saved</b> — tracking milestones appear once a provider confirms your booking.</div></div>`:`<div class="notice"><div><b>No booking found for ${r}.</b><br>Check the reference, or <a class="link" href="/get-quotes/">start a new request</a>.</div></div>`};

/* cookie prefs */
const ck=$('#ckBtn');if(ck)ck.onclick=()=>openOv($('#ckModal'));
const cks=$('#ckSave');if(cks)cks.onclick=()=>{store.set('mm_ck',{a:$('#ckA').checked,m:$('#ckM').checked});closeOv($('#ckModal'));mmToast('Cookie preferences saved')};
const ckb=$('#ckBanner');if(ckb&&!store.get('mm_ck')){setTimeout(()=>ckb.hidden=false,900);$('#ckAcc').onclick=()=>{store.set('mm_ck',{a:true,m:false});ckb.hidden=true};$('#ckRej').onclick=()=>{store.set('mm_ck',{a:false,m:false});ckb.hidden=true};$('#ckMore').onclick=()=>{ckb.hidden=true;openOv($('#ckModal'))}}

/* newsletter */
const nw=$('#fnews');if(nw)nw.onsubmit=e=>{e.preventDefault();const i=$('input',nw);if(!emailOk(i.value)){i.focus();mmToast('Enter a valid email address','var(--err)');return}nw.reset();mmToast('Subscribed to moving tips — thank you!')};

/* reveal + counters */
const io=new IntersectionObserver(es=>es.forEach(e=>{if(!e.isIntersecting)return;e.target.classList.add('in');io.unobserve(e.target)}),{threshold:.12,rootMargin:'0px 0px -40px 0px'});
$$('.rv-in,.tl').forEach(el=>RM?el.classList.add('in'):io.observe(el));

/* hero parallax */
const hb=$('.hero .hbg img');if(hb&&!RM){let tk2=false;addEventListener('scroll',()=>{if(tk2)return;tk2=true;requestAnimationFrame(()=>{const y=Math.min(scrollY,800);hb.style.transform=`scale(1.08) translateY(${y*.18}px)`;tk2=false})},{passive:true})}
/* pause van when off-screen */
const van=$('.hero .road');if(van)new IntersectionObserver(([e])=>$$('.van,.lane,.trees,.van *',van).forEach(x=>x.style.animationPlayState=e.isIntersecting?'running':'paused')).observe(van);

$$('[data-year]').forEach(x=>x.textContent=new Date().getFullYear());
})();
/* ===== V4 interactions ===== */
(()=>{const $=(s,r=document)=>r.querySelector(s),$$=(s,r=document)=>[...r.querySelectorAll(s)];
const money=n=>'$'+(Math.round(n/10)*10).toLocaleString();const RM=matchMedia('(prefers-reduced-motion: reduce)').matches;
const st={get(k){try{return JSON.parse(localStorage.getItem(k))}catch(e){return null}},set(k,v){try{localStorage.setItem(k,JSON.stringify(v))}catch(e){}}};
const rows=(el,r)=>el.innerHTML=r.map(x=>`<div><span>${x[0]}</span><b>${x[1]}</b></div>`).join('');
/* small marketplace calcs */
const C={container:r=>{const s=+$('[name=size]',r).value,w=+$('[name=weeks]',r).value||1,h=$('[name=help]',r).checked;const size=['8 ft','12 ft','16 ft','2 × 16 ft'][s];const base=[350,480,620,1150][s];return[['Container size',size],['Rental ('+w+' wk)',money(base+w*45*(s+1))],['Loading help',h?money(280):'Not added'],['Indicative total',money(base+w*45*(s+1)+(h?280:0))]]},
truck:r=>{const s=+$('[name=size]',r).value,m=+$('[name=miles]',r).value||0,o=$('[name=oneway]',r).checked;const t=['10 ft','15 ft','20 ft','26 ft'][s],day=[30,40,50,60][s];const est=o?day*Math.max(1,Math.ceil(m/400))*6+m*.6:day+m*0.99;return[['Suggested truck',t],['Mileage',m+' mi'],['Fuel estimate',money(m/10*3.6)],['Indicative rental',money(est)],['Coverage','Shown at booking']]},
labor:r=>{const c=+$('[name=crew]',r).value||1,h=Math.max(2,+$('[name=hours]',r).value||2),t=$$('[name=task]:checked',r).map(x=>x.value);return[['Crew',c+' helpers'],['Hours',h+' (2-hr minimum)'],['Tasks',t.join(', ')||'None selected'],['Indicative cost',money(c*h*45)+' – '+money(c*h*65)]]}};
$$('[data-calc]').forEach(r=>{const f=C[r.dataset.calc];if(!f)return;const o=$('.cOut',r);const run=()=>rows(o,f(r));r.addEventListener('input',run);run()});
/* methods comparison */
const mt=$('[data-methods]');if(mt){const run=()=>{const s=+$('#mmSize').value,d=+$('#mmDist').value||1,base=[600,900,1300,1800,2500][s]*(d>100?1.8+d/900:1+d/120);
 const M=[['Full-service',1,'Low','Included','Optional','Fixed date'],['Container',.6,'High','You pack','Included options','Flexible'],['Labor only',.3,'Medium','Optional','No','Fixed date'],['Truck rental',.22,'Very high','You pack','No','Flexible'],['Moving + storage',1.2,'Low','Included','Included','Two dates']];
 $('#mmBody').innerHTML=M.map(m=>`<tr><th scope="row">${m[0]}</th><td><b>${money(base*m[1]*.85)} – ${money(base*m[1]*1.2)}</b></td><td>${m[2]}</td><td>${m[3]}</td><td>${m[4]}</td><td>${m[5]}</td><td><a class="btn btn-p" style="min-height:36px" href="/get-quotes/">Quotes</a></td></tr>`).join('')};mt.addEventListener('input',run);run()}
/* package builder */
const pk=$('#pkg');if(pk){let tier='standard';const mult={economy:.8,standard:1,premium:1.6};
 const run=()=>{const on=$$('[data-pkg]:checked',pk),ids=on.map(x=>x.dataset.pkg),m=+$('#pkgM').value||1;let tot=0,warn=[];
  const r=on.map(x=>{let p=+x.dataset.price*mult[tier];if(x.dataset.pkg==='storage')p*=m;tot+=p;(x.dataset.dep||'').split(',').filter(Boolean).forEach(d=>{if(!ids.includes(d))warn.push(`${x.closest('label').querySelector('b').textContent} needs ${d}`)});return[x.closest('label').querySelector('b').textContent,money(p)]});
  rows($('#pkgRows'),r.length?r:[['No services selected','—']]);$('#pkgTot').textContent=money(tot);$('#pkgWarn').textContent=warn.length?'⚠ '+warn.join('; '):'';
  $('#pkgGo').dataset.seed=JSON.stringify({svc:ids.join(', ')});st.set('mm_pkg',{ids,tier})};
 $$('[data-tier]',pk).forEach(b=>b.onclick=()=>{tier=b.dataset.tier;$$('[data-tier]',pk).forEach(x=>x.setAttribute('aria-pressed',x===b));run()});
 pk.addEventListener('input',run);pk.addEventListener('change',run);run()}
/* project timeline */
const ps=$('#projSteps');if(ps){const S=st.get('mm_proj')||[['Packing service','Cedar & Crate Packers',13,null],['Storage collection','SafeKeep Storage',14,0],['Main move','Awaiting provider',14,0],['Delivery from storage','SafeKeep Storage',20,1],['Furniture assembly','Harbor Line Movers',21,3]];
 const draw=()=>{ps.innerHTML=S.map((s,i)=>`<li><i>${i+1}</i><div style="flex:1"><b>${s[0]}</b><span>${s[1]} · Apr ${s[2]}${s[3]!=null?' · after step '+(s[3]+1):''}</span></div><button class="ibtn" data-mv="${i}" aria-label="Move ${s[0]} one day later">+1d</button></li>`).join('');st.set('mm_proj',S)};
 ps.onclick=e=>{const b=e.target.closest('[data-mv]');if(!b)return;const i=+b.dataset.mv;S[i][2]++;let moved=[];S.forEach((s,j)=>{if(s[3]!=null&&S[s[3]][2]>s[2]){s[2]=S[s[3]][2];moved.push(s[0])}});
  for(let k=0;k<3;k++)S.forEach(s=>{if(s[3]!=null&&S[s[3]][2]>s[2]){s[2]=S[s[3]][2];moved.push(s[0])}});draw();mmToast(moved.length?'Rescheduled — dependent steps updated: '+[...new Set(moved)].join(', '):'Rescheduled '+S[i][0],'var(--info)')};draw();
 const iv=$('#invite');iv.onsubmit=e=>{e.preventDefault();const em=$('#invE').value;if(!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(em)){$('#invE').closest('.fld').classList.add('bad');return}$('#invList').insertAdjacentHTML('beforeend',`<li class="d"><i></i>${em} — ${$('#invR').value} (invite pending)</li>`);iv.reset()}}
/* kpi counters */
$$('[data-count]').forEach(el=>{const T=+el.dataset.count;if(RM){el.textContent=T;return}const t0=performance.now();(function f(t){const k=Math.min(1,(t-t0)/1200);el.textContent=Math.round(T*(1-Math.pow(1-k,3)));if(k<1)requestAnimationFrame(f)})(t0)});
/* customer dashboard */
document.addEventListener('click',e=>{const a=e.target.closest('[data-accept]');if(!a)return;const p=a.dataset.accept;$$('[data-accept]').forEach(b=>{b.disabled=true;b.textContent=b===a?'Accepted (demo)':'Not selected'});const mp=$('#dMainProv');if(mp){mp.textContent=p;$('#dMainSt').textContent='Quote accepted · awaiting payment'}mmToast('Quote accepted (demo). A real booking needs provider confirmation and payment.','var(--info)')});
const inv=$('#diBody');if(inv){const I=st.get('mm_inv')||[['Sofa','Living room',1,40,false],['Queen bed','Bedroom',1,60,false],['Dishes box','Kitchen',4,3,true]];
 const draw=()=>{inv.innerHTML=I.map((x,i)=>`<tr><td>${x[0]}</td><td>${x[1]}</td><td>${x[2]}</td><td>${x[2]*x[3]} cu ft</td><td>${x[4]?'<span class="p">Fragile</span>':'—'}</td><td><button class="btn btn-g" style="min-height:34px" data-rm="${i}" aria-label="Remove ${x[0]}">Remove</button></td></tr>`).join('');const v=I.reduce((a,x)=>a+x[2]*x[3],0);$('#diTot').textContent=`${I.reduce((a,x)=>a+x[2],0)} items · ${v} cu ft · approx. ${(v*7).toLocaleString()} lb`;st.set('mm_inv',I)};
 inv.onclick=e=>{const b=e.target.closest('[data-rm]');if(b){I.splice(+b.dataset.rm,1);draw()}};
 $('#diAdd').onclick=()=>{const n=$('#diN').value.trim();if(!n){$('#diN').closest('.fld').classList.add('bad');$('#diN').focus();return}I.push([n,$('#diR').value,+$('#diQ').value||1,+$('#diV').value||1,$('#diF').checked]);$('#diN').value='';draw()};
 $('#diExp').onclick=()=>{const t='MoveMatch inventory report\n\n'+I.map(x=>`${x[1]} | ${x[0]} | qty ${x[2]} | ${x[2]*x[3]} cu ft${x[4]?' | FRAGILE':''}`).join('\n')+'\n\n'+$('#diTot').textContent;const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([t],{type:'text/plain'}));a.download='inventory-report.txt';a.click()};draw()}
const mf=$('#msgF');if(mf)mf.onsubmit=e=>{e.preventDefault();const v=$('#msgI').value.trim();if(!v)return;$('#msgList').insertAdjacentHTML('beforeend',`<div class="review" style="background:#E7F8F5"><b>You</b><span>${v.replace(/</g,'&lt;')}</span></div>`);$('#msgI').value=''};
/* kanban */
const kb=$('#kanban');if(kb){const cols=$$('.kcol',kb);const cnt=()=>cols.forEach(c=>$('.kc',c).textContent=$$('.kcard',c).length);let drag=null;
 kb.addEventListener('dragstart',e=>{drag=e.target.closest('.kcard');drag&&(drag.style.opacity=.5)});kb.addEventListener('dragend',()=>{drag&&(drag.style.opacity=1);drag=null;cnt()});
 cols.forEach(c=>{c.addEventListener('dragover',e=>{e.preventDefault();c.style.background='#F5F7FA'});c.addEventListener('dragleave',()=>c.style.background='#fff');c.addEventListener('drop',e=>{e.preventDefault();c.style.background='#fff';if(drag){c.appendChild(drag);mmAudit&&mmAudit('Lead moved to '+$('b',c).firstChild.textContent)}})});
 kb.addEventListener('click',e=>{const b=e.target.closest('.kmv');if(!b)return;const card=b.closest('.kcard'),i=cols.indexOf(card.parentElement),n=cols[Math.max(0,Math.min(cols.length-1,i+(+b.dataset.d)))];n.appendChild(card);RM||card.animate([{transform:'scale(.95)',opacity:.4},{transform:'none',opacity:1}],{duration:250});cnt()});cnt()}
/* dispatch with conflict prevention */
const dp=$('#disp');if(dp){const S=[['Apr 14','Chris W.','Crew B (2)','20 ft Truck #2']];const draw=()=>$('#sched').innerHTML=S.map(s=>`<tr><td>${s[0]}</td><td>${s[1]}</td><td>${s[2]}</td><td>${s[3]}</td></tr>`).join('');
 dp.onsubmit=e=>{e.preventDefault();const j=$('#dJ').value.split(' — ')[0],d=$('#dD').value,c=$('#dC').value,t=$('#dT').value,m=$('#dispMsg');let err='';
  if(c.includes('on leave')&&d==='Apr 15')err='Crew C is on leave on Apr 15.';else if(t.includes('maintenance'))err='Truck #3 is in maintenance.';else if(S.some(s=>s[0]===d&&s[2]===c))err=`${c} is already booked on ${d}.`;else if(S.some(s=>s[0]===d&&s[3]===t))err=`${t} is already booked on ${d}.`;else if(S.some(s=>s[1]===j))err=`${j} is already scheduled.`;
  if(err){m.innerHTML=`<span class="p">✕ Blocked: ${err}</span>`;return}S.push([d,j,c,t]);draw();m.innerHTML='<span class="y">✓ Assigned without conflicts.</span>';mmAudit&&mmAudit(`Job ${j} assigned to ${c} / ${t} on ${d}`)};draw()}
/* quote builder versions */
const qb=$('#qb');if(qb){const V=[];const tot=()=>{const g=k=>+$('#qb_'+k).value||0;return g('labor')+g('truck')+g('pack')+g('extra')+g('prot')-g('disc')};const draw=()=>{$('#qbTot').textContent=money(tot());$('#qbVer').innerHTML=V.length?V.map((v,i)=>`<div><span>v${i+1} · ${v[1]}</span><b>${money(v[0])}</b></div>`).join(''):'<div><span>No saved versions</span><b>—</b></div>'};
 qb.addEventListener('input',draw);$('#qbSave').onclick=()=>{V.push([tot(),$('#qbT').value]);draw();mmToast('Quote version v'+V.length+' saved (demo)')};draw()}
/* admin */
window.mmAudit=t=>{const a=$('#audit');if(!a)return;const d=new Date();a.insertAdjacentHTML('afterbegin',`<tr><td>${d.toTimeString().slice(0,5)}</td><td>you (demo)</td><td>${t}</td></tr>`)};
const vq=$('#vq');if(vq)vq.onclick=e=>{const b=e.target.closest('.vact');if(!b)return;const tr=b.closest('tr'),s=$('.vst',tr);s.textContent=b.dataset.a;s.classList.toggle('v',b.dataset.a==='Verified');$$('.vact',tr).forEach(x=>x.disabled=true);mmAudit(`${tr.cells[0].textContent} — ${tr.cells[1].textContent}: ${b.dataset.a}`);mmToast(`${tr.cells[0].textContent}: ${b.dataset.a} (demo)`)};
})();
