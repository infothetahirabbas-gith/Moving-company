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
if(pf){let cat='all';const f=()=>{const q=($('#pSearch')||{}).value?.toLowerCase()||'',st=($('#pSt')||{}).value||'',ty=($('#pTy')||{}).value||'',ck=$$('[name=pChk]:checked').map(x=>x.value),z=($('#pZip')||{}).value||'';
  if($('#pZip'))$('#pZip').closest('.fld').classList.toggle('bad',!!z&&!/^\d{5}$/.test(z));let n=0;
  $$('.pcard').forEach(c=>{const s=(cat==='all'||c.dataset.cat.split(' ').includes(cat))&&(!q||c.textContent.toLowerCase().includes(q))&&(!st||c.dataset.st.split(' ').some(x=>x===st||x==='ALL'))&&(!ty||c.dataset.ty===ty)&&ck.every(k=>(c.dataset.chk||'').split('|').includes(k));c.classList.toggle('out',!s);n+=s});$('#pEmpty').hidden=!!n};
 pf.onclick=e=>{const b=e.target.closest('button');if(!b)return;$$('button',pf).forEach(x=>x.setAttribute('aria-pressed',x===b));cat=b.dataset.c;f()};
 ['#pSearch','#pSt','#pTy','#pZip'].forEach(s=>{const el=$(s);if(el)el.addEventListener('input',f)});$$('[name=pChk]').forEach(x=>x.onchange=f);
 const cl=$('#pClr');if(cl)cl.onclick=()=>{['#pSearch','#pSt','#pTy','#pZip'].forEach(s=>{const el=$(s);if(el)el.value=''});$$('[name=pChk]').forEach(x=>x.checked=false);f()};
 const pre=pf.dataset.pre;if(pre){const b=$(`[data-c="${pre}"]`,pf);b&&b.click()}}
const sort=$('#pSort');if(sort)sort.onchange=()=>{const g=$('#pGrid'),cs=$$('.pcard',g);cs.sort((a,b)=>sort.value==='name'?a.dataset.n.localeCompare(b.dataset.n):sort.value==='checks'?b.dataset.ch-a.dataset.ch:a.dataset.i-b.dataset.i).forEach(c=>g.appendChild(c))};
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
/* ===== V5 interactions ===== */
(()=>{const $=(s,r=document)=>r.querySelector(s),$$=(s,r=document)=>[...r.querySelectorAll(s)];const money=n=>'$'+(Math.round(n/10)*10).toLocaleString();
const rows=(el,r)=>el.innerHTML=r.map(x=>`<div><span>${x[0]}</span><b>${x[1]}</b></div>`).join('');
const toast=(m,c)=>window.mmToast&&mmToast(m,c);
/* moving day */
const mdN=$('#mdNext');if(mdN){let i=0;const li=$$('#mdSteps li');mdN.onclick=()=>{if(i>=li.length-1)return;li[i].className='d';i++;li[i].className='c';$('#mdStatus').textContent=li[i].textContent;$('#mdProg').style.width=((i+1)/li.length*100)+'%';if(i===li.length-1)mdN.disabled=true};
 $$('[data-md]').forEach(c=>c.onchange=()=>{const n=$$('[data-md]:checked').length,t=$$('[data-md]').length;toast(`${n} of ${t} items checked`,'var(--info)')});
 const cv=$('#sig'),cx=cv.getContext('2d');let d=false;cx.lineWidth=2.5;cx.lineCap='round';cx.strokeStyle='#102A43';const pos=e=>{const r=cv.getBoundingClientRect(),p=e.touches?e.touches[0]:e;return[(p.clientX-r.left)*cv.width/r.width,(p.clientY-r.top)*cv.height/r.height]};
 const st=e=>{d=true;cx.beginPath();cx.moveTo(...pos(e))},mv=e=>{if(!d)return;e.preventDefault();cx.lineTo(...pos(e));cx.stroke();cv.dataset.signed=1},en=()=>d=false;
 ['mousedown','touchstart'].forEach(t=>cv.addEventListener(t,st));['mousemove','touchmove'].forEach(t=>cv.addEventListener(t,mv,{passive:false}));['mouseup','mouseleave','touchend'].forEach(t=>cv.addEventListener(t,en));
 $('#sigClr').onclick=()=>{cx.clearRect(0,0,cv.width,cv.height);delete cv.dataset.signed};$('#sigOk').onclick=()=>{if(!cv.dataset.signed){toast('Please sign first','var(--err)');return}toast('Delivery confirmed and signed (demo)')}}
/* access */
const ac=$('#acc');if(ac){const run=()=>{const fl=+$('#acFl').value||0,el=$('#acEl').value,carry=+$('#acCarry').value||0,door=+$('#acDoor').value||32,park=$('#acPark').value,r=[];
 r.push(['Stairs',el==='none'&&fl>0?`${fl} flight(s) — stair charge likely`:'None / elevator']);if(el==='res')r.push(['Elevator','Reservation needed — book a window']);
 r.push(['Long carry',carry>75?`${carry} ft — long-carry fee likely`:'Within normal range']);r.push(['Doorway',door<30?`${door}" — large items may need disassembly`:'OK for most furniture']);
 r.push(['Parking',{drive:'No issue',street:'Reserve curb space',permit:'Get a city permit',none:'Shuttle truck likely'}[park]]);if($('#acCoi').checked)r.push(['COI','Request from your mover 3–5 days ahead']);if($('#acDock').checked)r.push(['Loading dock','Book a dock time window']);rows($('#acOut'),r)};ac.addEventListener('input',run);ac.addEventListener('change',run);run()}
/* multi-stop */
const ms=$('#msList');if(ms){const S=[['Pickup','Chicago, IL','Household'],['Delivery','Denver, CO','Household']];const draw=()=>{ms.innerHTML=S.map((s,i)=>`<li><i>${i+1}</i><div style="flex:1"><b>${s[0]} — ${s[1]}</b><span>${s[2]||'—'}</span></div>${S.length>2?`<button class="ibtn" data-rm="${i}" aria-label="Remove stop">×</button>`:''}</li>`).join('');rows($('#msSum'),[['Stops',S.length],['Pickups',S.filter(s=>s[0].includes('ickup')).length],['Deliveries',S.filter(s=>!s[0].includes('ickup')).length],['Extra-stop fees (typical)',money(Math.max(0,S.length-2)*120)]])};
 ms.onclick=e=>{const b=e.target.closest('[data-rm]');if(b){S.splice(+b.dataset.rm,1);draw()}};$('#msAdd').onsubmit=e=>{e.preventDefault();const l=$('#msLoc').value.trim();if(!l){$('#msLoc').closest('.fld').classList.add('bad');return}S.splice(S.length-1,0,[$('#msT').value,l,$('#msItems').value]);e.target.reset();draw()};draw()}
/* offers */
const of=$('#offers');if(of)of.onclick=e=>{const c=e.target.closest('.card');if(!c)return;const h=$('[data-hist]',c);
 if(e.target.closest('[data-counter]')){const v=+$('input',c).value,p=+c.dataset.p;if(!v||v>=p){toast('Enter a counteroffer below the current price','var(--warn)');return}h.insertAdjacentHTML('beforeend',`<li class="d"><i></i>You countered: $${v.toLocaleString()}</li>`);const np=Math.round((v+p)/2/10)*10;setTimeout(()=>{c.dataset.p=np;$('[data-price]',c).textContent='$'+np.toLocaleString();h.insertAdjacentHTML('beforeend',`<li class="c"><i></i>Provider revised: $${np.toLocaleString()} (v2)</li>`)},900)}
 if(e.target.closest('[data-acc]')){$$('.card',of).forEach(x=>$$('button',x).forEach(b=>b.disabled=true));h.insertAdjacentHTML('beforeend',`<li class="d"><i></i>Accepted at $${(+c.dataset.p).toLocaleString()}</li>`);toast('Offer accepted (demo) — a booking needs provider confirmation')}};
/* capacity */
const cf=$('#cxF');if(cf){cf.onclick=e=>{const b=e.target.closest('button');if(!b)return;$$('button',cf).forEach(x=>x.setAttribute('aria-pressed',x===b));$$('.cx').forEach(c=>c.hidden=b.dataset.x!=='All'&&c.dataset.k!==b.dataset.x)};$('#cxL').onclick=e=>{const b=e.target.closest('[data-req]');if(b){b.textContent='Requested';b.disabled=true;toast('Capacity request sent (demo)')}}}
/* relocation services */
const rs=$$('[data-rs]');if(rs.length){const upd=()=>{const s=rs.filter(x=>x.checked).map(x=>x.dataset.rs);$('#rsSel').textContent=s.length?'Added to your project: '+s.join(', '):'';try{localStorage.setItem('mm_rs',JSON.stringify(s))}catch(e){}};rs.forEach(x=>x.onchange=upd)}
/* green */
const gr=$('[data-calc=green]');if(gr){const run=()=>{const d=+$('[name=dist]',gr).value||0,f=+$('[name=truck]',gr).value,re=$('[name=reuse]',gr).checked,dn=$('[name=donate]',gr).checked;let kg=d*f*1.0;if(dn)kg*=.85;const box=re?0:60;rows($('.cOut',gr),[['Transport CO₂',Math.round(kg).toLocaleString()+' kg'],['Packaging',re?'Reusable crates — minimal':box+' cardboard boxes'],['Donation effect',dn?'≈15% smaller load':'—'],['Trees to offset (approx.)',Math.ceil(kg/21)+' trees/yr']])};gr.addEventListener('input',run);gr.addEventListener('change',run);run()}
/* international */
const ic=$('#intC');if(ic){const D={Canada:['Passport','Detailed inventory (Form BSF186)','Proof of residence change'],'United Kingdom':['Passport & visa','Transfer of Residence (ToR01) relief','Inventory list'],Australia:['Passport & visa','Unaccompanied Personal Effects statement','Biosecurity declaration'],Germany:['Passport & residence permit','Customs inventory list','Proof of de-registration in US'],UAE:['Passport & residence visa','Packing list (English/Arabic)','Customs declaration'],Pakistan:['Passport / CNIC/NICOP','Baggage declaration','Detailed packing list'],India:['Passport & visa','Transfer of Residence declaration','Baggage rules form'],Mexico:['Passport & visa','Menaje de casa list (Spanish)','Consulate certification']};
 const run=()=>{$('#intDocs').innerHTML=D[ic.value].map(x=>`<label class="chk"><input type="checkbox">${x}</label>`).join('');const v=+$('#intV').value||0,[rate,sym]=$('#intCur').value.split('|');const lo=(v*7+1800)*rate,hi=(v*11+2600)*rate;$('#intEst').textContent=`${sym}${Math.round(lo).toLocaleString()} – ${sym}${Math.round(hi).toLocaleString()}`};ic.onchange=run;$('#intV').oninput=run;$('#intCur').onchange=run;run()}
/* enterprise */
const eb=$('#entB');if(eb)eb.onclick=e=>{const b=e.target.closest('.ea');if(!b)return;const tr=b.closest('tr'),s=$('.es',tr);s.textContent=b.dataset.a;s.classList.toggle('v',b.dataset.a==='Approved');$$('.ea',tr).forEach(x=>x.disabled=true);toast(`${tr.cells[0].textContent}: ${b.dataset.a} (demo)`)};
/* pricing studio */
const ps=$('#ps');if(ps){const g=k=>+($('#ps_'+k)||$('#pj_'+k)).value||0;let ver=0;const run=()=>{const h=Math.max(g('minh'),+$('#pj_h').value||0),m=+$('#pj_m').value||1,lab=g('rate')*m*h,mi=g('mile')*(+$('#pj_d').value||0),st=g('stairs')*(+$('#pj_s').value||0),ca=g('carry')*Math.floor((+$('#pj_c').value||0)/50);let sub=lab+g('truck')+mi+st+ca;const pk=$('#pj_p').checked?sub*g('peak')/100:0;sub+=pk;const dc=sub*g('disc')/100;
 rows($('#psRows'),[['Labor ('+m+' × '+h+'h)',money(lab)],['Truck fee',money(g('truck'))],['Mileage',money(mi)],['Stairs',money(st)],['Long carry',money(ca)],['Peak uplift',money(pk)],['Discount','−'+money(dc)]]);$('#psTot').textContent=money(sub-dc)};
 document.querySelector('.calc').addEventListener('input',run);$('#psPub').onclick=()=>{ver++;$('#psVer').textContent=`Rule set v${ver} published (demo) — existing quotes keep their original version.`;toast('Pricing rules v'+ver+' published (demo)')};run()}
/* box labels */
const bl=$('#blF');if(bl){let n=0;bl.onsubmit=e=>{e.preventDefault();const k=Math.min(60,+$('#blN').value||1),r=$('#blR').value,c=$('#blC').value,fr=$('#blFr').checked,of=$('#blOF').checked;let h='';for(let i=0;i<k;i++){n++;h+=`<div class="card lbl-card" style="border:2px solid var(--navy);text-align:center"><b style="font:800 40px var(--fh);color:var(--navy)">#${String(n).padStart(3,'0')}</b><div style="font-weight:700;font-size:20px;margin:6px 0">${r.toUpperCase()}</div>${c?`<div class="help" style="margin:0">${c.replace(/</g,'&lt;')}</div>`:''}<div style="margin-top:8px">${fr?'<span class="sample" style="font-size:14px">FRAGILE</span> ':''}${of?'<span class="bdg v" style="font-size:14px">OPEN FIRST</span>':''}</div><div class="help" style="margin:8px 0 0;font-family:monospace">MM-BOX-${String(n).padStart(3,'0')}</div></div>`}$('#blOut').insertAdjacentHTML('beforeend',h);toast(k+' labels added')}}
/* referral */
const rl=$('#refL');if(rl){let c;try{c=localStorage.getItem('mm_ref')}catch(e){}if(!c){c='MM'+Math.random().toString(36).slice(2,8).toUpperCase();try{localStorage.setItem('mm_ref',c)}catch(e){}}rl.value=location.origin+'/?ref='+c;$('#refC').onclick=()=>{rl.select();(navigator.clipboard?navigator.clipboard.writeText(rl.value):Promise.resolve(document.execCommand('copy'))).then(()=>toast('Referral link copied'))}}
})();
/* ===== V7 interactions ===== */
(function(){
const $=(s,r=document)=>r.querySelector(s),$$=(s,r=document)=>[...r.querySelectorAll(s)];
const LS={get:(k,d)=>{try{return JSON.parse(localStorage.getItem('mm7_'+k))??d}catch(e){return d}},set:(k,v)=>{try{localStorage.setItem('mm7_'+k,JSON.stringify(v))}catch(e){}}};
const money=n=>'$'+Math.round(n).toLocaleString();
/* generic tabs (learn seasons, my-move) */
$$('[role=tablist]').forEach(tl=>{if(tl.dataset.v7)return;tl.dataset.v7=1;const tabs=$$('[role=tab]',tl);tabs.forEach((t,i)=>{t.addEventListener('click',()=>sel(i));t.addEventListener('keydown',e=>{if(e.key==='ArrowRight')sel((i+1)%tabs.length,1);if(e.key==='ArrowLeft')sel((i-1+tabs.length)%tabs.length,1)})});function sel(i,f){tabs.forEach((t,j)=>{t.setAttribute('aria-selected',i===j);t.tabIndex=i===j?0:-1;const p=document.getElementById(t.getAttribute('aria-controls'));if(p)p.hidden=i!==j});if(f)tabs[i].focus()}});
/* recently visited */
const rv=LS.get('recent',[]).filter(r=>r.u!==location.pathname);if(document.title&&!/404/.test(location.pathname)){rv.unshift({u:location.pathname,t:document.title.split('|')[0].trim()});LS.set('recent',rv.slice(0,8))}
/* ---- My Moving Space ---- */
if($('#mmDate')){
 const st=LS.get('space',{date:'',name:'',lists:{},rooms:[['Kitchen',0,30],['Living room',0,20],['Bedroom',0,15],['Bathroom',0,6]],exp:[],budget:3000,sched:[['8:00','Crew arrives'],['12:00','Truck loaded'],['17:00','Delivery window']],em:{}});
 const save=()=>{LS.set('space',st);score()};
 $('#mmDate').value=st.date;$('#mmName').value=st.name;$('#exB').value=st.budget;
 $('#mmDate').onchange=e=>{st.date=e.target.value;save();tl()};$('#mmName').oninput=e=>{st.name=e.target.value;save()};
 $$('[data-mmlist]').forEach(c=>{const id=c.dataset.mmlist,b=$$('input',c);const v=st.lists[id]||[];b.forEach((x,i)=>{x.checked=!!v[i];x.onchange=()=>{st.lists[id]=b.map(y=>y.checked);upd();save()}});function upd(){const n=b.filter(y=>y.checked).length;$('.mm-cnt',c).textContent=n+'/'+b.length;$('.prog i',c).style.width=(n/b.length*100)+'%'}upd()});
 function rooms(){$('#mmRooms').innerHTML=st.rooms.map((r,i)=>`<div class="card"><div style="display:flex;justify-content:space-between"><b>${r[0].replace(/</g,'&lt;')}</b><button class="btn btn-g" style="min-height:30px;padding:0 8px" data-rdel="${i}" aria-label="Remove ${r[0]}">×</button></div><p class="help">${r[1]} of ${r[2]} boxes packed</p><div class="prog"><i style="width:${r[2]?Math.min(100,r[1]/r[2]*100):0}%"></i></div><div style="display:flex;gap:6px;margin-top:10px"><button class="btn btn-o" data-r="${i}" data-d="-1" aria-label="One fewer packed">−</button><button class="btn btn-s" data-r="${i}" data-d="1" aria-label="One more packed">+ Packed</button><label class="sr" for="rt${i}">Total boxes</label><input id="rt${i}" type="number" min="0" value="${r[2]}" data-rt="${i}" style="width:70px;border:1.5px solid var(--n3);border-radius:8px;padding:0 6px"></div></div>`).join('');
  $$('[data-r]').forEach(b=>b.onclick=()=>{const r=st.rooms[b.dataset.r];r[1]=Math.max(0,Math.min(r[2],r[1]+ +b.dataset.d));rooms();save()});$$('[data-rt]').forEach(b=>b.onchange=()=>{st.rooms[b.dataset.rt][2]=Math.max(0,+b.value||0);rooms();save()});$$('[data-rdel]').forEach(b=>b.onclick=()=>{st.rooms.splice(b.dataset.rdel,1);rooms();save()})}
 $('#mmRoomAdd').onsubmit=e=>{e.preventDefault();const v=$('#mmRoomN').value.trim();if(!v)return;st.rooms.push([v,0,10]);$('#mmRoomN').value='';rooms();save()};
 function exp(){const tot=st.exp.reduce((a,x)=>a+x[1],0);$('#exT').innerHTML=st.exp.map((x,i)=>`<tr><td>${x[0].replace(/</g,'&lt;')}</td><td>${x[2]}</td><td>${money(x[1])}</td><td><button class="btn btn-g" style="min-height:30px" data-xdel="${i}" aria-label="Delete">×</button></td></tr>`).join('')||'<tr><td colspan="4" class="help">No expenses yet.</td></tr>';$('#exTot').textContent=money(tot)+' of '+money(st.budget);$('#exBar').style.width=Math.min(100,st.budget?tot/st.budget*100:0)+'%';const c={};st.exp.forEach(x=>c[x[2]]=(c[x[2]]||0)+x[1]);$('#exCats').innerHTML=Object.entries(c).map(([k,v])=>`<div><span>${k}</span><b>${money(v)}</b></div>`).join('')||'<div><span>Remaining</span><b>'+money(st.budget)+'</b></div>';$$('[data-xdel]').forEach(b=>b.onclick=()=>{st.exp.splice(b.dataset.xdel,1);exp();save()})}
 $('#mmExpF').onsubmit=e=>{e.preventDefault();const d=$('#exD'),a=$('#exA');let ok=1;[d,a].forEach(f=>{const bad=!f.value||(f===a&&+f.value<0);f.closest('.fld').classList.toggle('err',bad);if(bad)ok=0});if(!ok)return;st.exp.push([d.value,+a.value,$('#exC').value]);d.value=a.value='';exp();save()};
 $('#exB').onchange=e=>{st.budget=+e.target.value||0;exp();save()};
 function sched(){$('#mmSched').innerHTML=st.sched.map((s,i)=>`<div style="display:flex;gap:8px;margin-bottom:8px"><label class="sr" for="sc${i}">Time</label><input id="sc${i}" value="${s[0]}" data-st="${i}" style="width:80px;border:1.5px solid var(--n3);border-radius:8px;padding:8px"><label class="sr" for="sd${i}">Task</label><input id="sd${i}" value="${s[1].replace(/"/g,'&quot;')}" data-sd="${i}" style="flex:1;min-width:0;border:1.5px solid var(--n3);border-radius:8px;padding:8px"></div>`).join('');$$('[data-st]').forEach(x=>x.oninput=()=>{st.sched[x.dataset.st][0]=x.value;save()});$$('[data-sd]').forEach(x=>x.oninput=()=>{st.sched[x.dataset.sd][1]=x.value;save()})}
 $('#mmSchedAdd').onclick=()=>{st.sched.push(['',''] );sched();save()};
 $$('[data-em]').forEach(x=>{x.value=st.em[x.dataset.em]||'';x.oninput=()=>{st.em[x.dataset.em]=x.value;save()}});
 const TL=[[56,'Set budget & research movers','/movers/'],[42,'Compare quotes','/get-quotes/'],[35,'Book your mover','/get-quotes/'],[28,'Start packing spare rooms','/tools/packing-calculator/'],[21,'Change of address & utilities',''],[14,'Confirm building access & elevator','/building-access/'],[7,'Pack essentials box',''],[2,'Confirm crew & arrival window',''],[0,'Moving day','/moving-day/']];
 const days=()=>st.date?Math.ceil((new Date(st.date+'T12:00')-new Date())/864e5):null;
 function tl(){const d=days();$('#mmTL').innerHTML=TL.map((t,i)=>{const due=d!==null&&d<=t[0];return`<li class="${due?'on':''}"><i>${i+1}</i><div><b>${t[0]?t[0]+' days before':'Moving day'} — ${t[1]}</b>${d!==null&&st.date?`<p class="help">${new Date(new Date(st.date+'T12:00')-t[0]*864e5).toLocaleDateString()}</p>`:''}${t[2]?`<a class="link" href="${t[2]}">Open ›</a>`:''}</div></li>`}).join('');$('#mmDays').textContent=d===null?'Set your moving date':d>0?d+' days to go':d===0?'Moving day!':'Moved '+(-d)+' days ago';
  const nx=TL.filter(t=>d===null||d<=t[0]+7).slice(d===null?0:-3).slice(0,3);$('#mmNext').innerHTML=(d===null?TL.slice(0,3):TL.filter(t=>t[0]<=Math.max(d,0)+14&&t[0]>=Math.max(d,0)-1).slice(0,3).concat(TL).slice(0,3)).map(t=>`<div class="card"><small class="help">${t[0]} days before</small><h3 style="font-size:17px;margin:4px 0 10px">${t[1]}</h3>${t[2]?`<a class="btn btn-o" href="${t[2]}">Start</a>`:''}</div>`).join('');void nx}
 $('#mmRec').innerHTML=[['Compare quotes','/get-quotes/'],['Packing calculator','/tools/packing-calculator/'],['Avoid scams','/learn/scams/'],['Room planner','/room-planner/']].map(r=>`<a class="card" href="${r[1]}"><b>${r[0]}</b> ›</a>`).join('');
 function score(){let t=0,n=0;Object.values(st.lists).forEach(v=>v.forEach(x=>{n++;if(x)t++}));const tc=$$('[data-mmlist] input').length;const rp=st.rooms.reduce((a,r)=>a+r[1],0),rt=st.rooms.reduce((a,r)=>a+r[2],0);const p=Math.round(((tc?t/tc:0)*0.6+(rt?rp/rt:0)*0.3+(st.date?0.1:0))*100);$('#mmArc').style.strokeDashoffset=314-314*p/100;$('#mmPct').textContent=p+'%'}
 $('#mmShare').onclick=async()=>{const txt=`My move${st.name?': '+st.name:''}${st.date?' on '+st.date:''} — planned with MoveMatch`;try{if(navigator.share){await navigator.share({title:'My move',text:txt,url:location.origin+'/my-move/'});return}}catch(e){return}try{await navigator.clipboard.writeText(txt+' '+location.origin+'/my-move/');window.mmToast&&mmToast('Copied to clipboard')}catch(e){window.mmToast&&mmToast(txt)}};
 $('#mmExport').onclick=()=>{const L=[`MoveMatch — My Moving Space`,`Plan: ${st.name||'-'}`,`Moving date: ${st.date||'-'}`,`Readiness: ${$('#mmPct').textContent}`,'','PACKING'];st.rooms.forEach(r=>L.push(`- ${r[0]}: ${r[1]}/${r[2]} boxes`));L.push('','EXPENSES');st.exp.forEach(x=>L.push(`- ${x[0]} (${x[2]}): ${money(x[1])}`));L.push('','MOVING DAY');st.sched.forEach(s=>L.push(`- ${s[0]} ${s[1]}`));const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([L.join('\n')],{type:'text/plain'}));a.download='my-move-plan.txt';a.click()};
 $('#mmReset').onclick=()=>{if(confirm('Clear your saved moving plan on this device?')){localStorage.removeItem('mm7_space');location.reload()}};
 rooms();exp();sched();tl();score();
}
/* ---- Learn widgets ---- */
if($('#eqE')){const f=()=>{const e=+$('#eqE').value||0,a=+$('#eqA').value||0;$('#eqOut').innerHTML=`<tr><td>Non-binding</td><td>${money(a)} <span class="help">(actual cost)</span></td></tr><tr><td>Binding</td><td>${money(e)}</td></tr><tr><td>Binding not-to-exceed</td><td>${money(Math.min(e,a))}</td></tr>`};$('#eqE').oninput=$('#eqA').oninput=f;f()}
if($('#vlW')){const f=()=>{const w=+$('#vlW').value||0,v=+$('#vlV').value||0;$('#vlOut').innerHTML=`<div><span>Released value (≈ $0.60/lb)</span><b>${money(w*0.6)}</b></div><div><span>Full value protection (up to)</span><b>${money(v)}</b></div>`};$('#vlW').oninput=$('#vlV').oninput=f;f()}
if($('#scamX')){const b=$$('#scamX input'),f=()=>{const n=b.filter(x=>x.checked).length;$('#scamOut').textContent=n===0?'No red flags selected.':n<3?`${n} red flag${n>1?'s':''} — ask questions and get it in writing.`:`${n} red flags — we strongly suggest choosing another mover.`;$('#scamOut').style.color=n>=3?'#B42318':n?'#7a4a08':''};b.forEach(x=>x.onchange=f);f()}
if($('#glQ')){$('#glQ').oninput=e=>{const q=e.target.value.toLowerCase();let n=0;$$('.gl').forEach(g=>{const m=g.textContent.toLowerCase().includes(q);g.hidden=!m;n+=m});$('#glE').hidden=!!n}}
/* ---- Room planner ---- */
if($('#rpRoom')){const FURN=$$('[data-furn]').map(b=>{const[w,d]=b.querySelector('small').textContent.match(/\d+/g).map(Number);return[b.querySelector('span').textContent,w,d]});
 let items=LS.get('room',[]),selI=-1;const room=$('#rpRoom');
 function scale(){return Math.min((room.parentElement.clientWidth-28)/(+$('#rpW').value*12),420/(+$('#rpL').value*12))}
 function draw(){const s=scale(),W=+$('#rpW').value*12,L=+$('#rpL').value*12;room.style.width=W*s+'px';room.style.height=L*s+'px';room.style.backgroundSize=`${12*s}px ${12*s}px`;
  room.innerHTML=items.map((it,i)=>{const w=(it.r?it.d:it.w)*s,h=(it.r?it.w:it.d)*s;return`<div tabindex="0" data-i="${i}" role="button" aria-label="${it.n} at ${Math.round(it.x/12)} ft, ${Math.round(it.y/12)} ft" style="position:absolute;left:${it.x*s}px;top:${it.y*s}px;width:${w}px;height:${h}px;background:${i===selI?'#14B8A6':'#D9F5F1'};border:2px solid #0F8F81;border-radius:4px;font:600 11px Inter,sans-serif;color:#102A43;display:grid;place-items:center;overflow:hidden;cursor:move;text-align:center">${it.n}</div>`}).join('');
  $$('[data-i]',room).forEach(el=>{el.onpointerdown=e=>{selI=+el.dataset.i;const it=items[selI],sx=e.clientX,sy=e.clientY,ox=it.x,oy=it.y;el.setPointerCapture(e.pointerId);el.onpointermove=m=>{it.x=Math.max(0,Math.min(W-(it.r?it.d:it.w),ox+(m.clientX-sx)/s));it.y=Math.max(0,Math.min(L-(it.r?it.w:it.d),oy+(m.clientY-sy)/s));el.style.left=it.x*s+'px';el.style.top=it.y*s+'px'};el.onpointerup=()=>{el.onpointermove=null;LS.set('room',items);draw();room.querySelector(`[data-i="${selI}"]`)?.focus()}};
   el.onkeydown=e=>{const it=items[+el.dataset.i],st=e.shiftKey?12:3;const mv={ArrowLeft:[-st,0],ArrowRight:[st,0],ArrowUp:[0,-st],ArrowDown:[0,st]}[e.key];selI=+el.dataset.i;if(mv){e.preventDefault();it.x=Math.max(0,it.x+mv[0]);it.y=Math.max(0,it.y+mv[1])}else if(e.key==='r'||e.key==='R')it.r=!it.r;else if(e.key==='Delete'||e.key==='Backspace'){items.splice(selI,1);selI=-1}else return;LS.set('room',items);draw();room.querySelector(`[data-i="${selI}"]`)?.focus()}});
  const area=items.reduce((a,i)=>a+i.w*i.d,0)/144;$('#rpInfo').textContent=`Grid squares = 1 ft · ${items.length} items · ${Math.round(area/(W*L/144)*100)}% of floor covered`}
 $$('[data-furn]').forEach((b,i)=>b.onclick=()=>{const f=FURN[i];items.push({n:f[0],w:f[1],d:f[2],x:0,y:0,r:false});selI=items.length-1;LS.set('room',items);draw()});
 $('#rpClear').onclick=()=>{items=[];LS.set('room',items);draw()};$('#rpW').oninput=$('#rpL').oninput=draw;addEventListener('resize',draw);draw();
 const fit=()=>{const D=+$('#ftD').value,H=+$('#ftH').value,d=[+$('#ftW').value,+$('#ftDp').value,+$('#ftIH').value].sort((a,b)=>a-b);const ok=d[0]<D&&d[1]<H||d[0]<H&&d[1]<D;const o=$('#ftOut');o.textContent=ok?`✓ Likely fits — the item's ${d[0]}″ × ${d[1]}″ side passes through a ${D}″ × ${H}″ door.`:`✗ Probably won't fit upright. Consider removing legs, the door, or hoisting.`;o.style.color=ok?'#0F8F81':'#B42318'};$$('#ftD,#ftH,#ftW,#ftDp,#ftIH').forEach(x=>x.oninput=fit);fit()}
})();
/* ===== V8 interactions: palette, search, saved, map, loading guide ===== */
(function(){
const $=(s,r=document)=>r.querySelector(s),$$=(s,r=document)=>[...r.querySelectorAll(s)];
const LS={get:(k,d)=>{try{return JSON.parse(localStorage.getItem('mm8_'+k))??d}catch(e){return d}},set:(k,v)=>{try{localStorage.setItem('mm8_'+k,JSON.stringify(v))}catch(e){}}};
const esc=s=>String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
let IDX=null;const idx=()=>IDX?Promise.resolve(IDX):fetch('/search-index.json').then(r=>r.json()).then(j=>IDX=j).catch(()=>IDX=[]);
const kind=u=>u.startsWith('/services/')?'Services':u.startsWith('/movers/')?'Movers':u.startsWith('/tools/')||/room-planner|box-labels|my-move/.test(u)?'Tools':/learn|guide|blog|checklist|map/.test(u)?'Guides':'Company';
const score=(it,q)=>{const t=it.t.toLowerCase(),d=(it.d||'').toLowerCase();let s=0;q.split(/\s+/).filter(Boolean).forEach(w=>{if(t.includes(w))s+=t.startsWith(w)?6:4;else if(d.includes(w))s+=1;else s-=10});return s};
const find=(q,n)=>IDX.map(i=>[i,score(i,q)]).filter(x=>x[1]>0).sort((a,b)=>b[1]-a[1]).slice(0,n).map(x=>x[0]);
/* command palette */
const pal=document.createElement('div');pal.className='pal';pal.hidden=true;pal.innerHTML='<div class="pal-bd" data-x></div><div class="pal-box" role="dialog" aria-modal="true" aria-label="Search"><div class="iw"><input id="palQ" type="search" placeholder="Search pages, services, tools…" aria-label="Search" autocomplete="off" role="combobox" aria-expanded="true" aria-controls="palL"></div><ul id="palL" role="listbox"></ul><p class="help pal-ft">↑↓ to move · Enter to open · Esc to close</p></div>';document.body.appendChild(pal);
let sel=0,res=[];const q=$('#palQ',pal),L=$('#palL',pal);
const recent=()=>{try{return JSON.parse(localStorage.getItem('mm7_recent'))||[]}catch(e){return[]}};
function draw(){const v=q.value.trim().toLowerCase();res=v?find(v,8):recent().slice(0,6).map(r=>({u:r.u,t:r.t,d:'Recently visited'}));if(!v&&!res.length)res=[{u:'/get-quotes/',t:'Get free quotes',d:'Start here'},{u:'/my-move/',t:'My Moving Space',d:'Your plan'}];sel=Math.min(sel,res.length-1);L.innerHTML=res.length?res.map((r,i)=>`<li role="option" id="po${i}" aria-selected="${i===sel}"><a href="${r.u}"><b>${esc(r.t)}</b><small>${esc(r.d||'')}</small></a></li>`).join(''):`<li class="help" style="padding:14px">No results. <a href="/search/?q=${encodeURIComponent(v)}">Open full search</a></li>`;q.setAttribute('aria-activedescendant',res.length?'po'+sel:'')}
function open(){pal.hidden=false;document.body.style.overflow='hidden';q.value='';sel=0;idx().then(draw);draw();setTimeout(()=>q.focus(),10)}
function close(){pal.hidden=true;document.body.style.overflow=''}
q.addEventListener('input',()=>{sel=0;draw()});
q.addEventListener('keydown',e=>{if(e.key==='ArrowDown'){e.preventDefault();sel=Math.min(res.length-1,sel+1);draw()}else if(e.key==='ArrowUp'){e.preventDefault();sel=Math.max(0,sel-1);draw()}else if(e.key==='Enter'){e.preventDefault();if(res[sel])location.href=res[sel].u;else location.href='/search/?q='+encodeURIComponent(q.value)}});
pal.addEventListener('click',e=>{if(e.target.dataset.x!==undefined)close()});
document.addEventListener('keydown',e=>{if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='k'){e.preventDefault();pal.hidden?open():close()}else if(e.key==='Escape'&&!pal.hidden)close()});
const op=$('#openPal');if(op)op.addEventListener('click',e=>{if(location.pathname==='/search/')return;e.preventDefault();open()});
/* search page */
if($('#srQ')){let cat='All';const qq=$('#srQ'),run=()=>{const v=qq.value.trim().toLowerCase();if(!v){$('#srR').innerHTML='';$('#srN').textContent='Type to search '+IDX.length+' pages.';$('#srE').hidden=true;return}let r=find(v,60);if(cat!=='All')r=r.filter(i=>kind(i.u)===cat);$('#srN').textContent=r.length+' result'+(r.length===1?'':'s')+' for “'+qq.value+'”';$('#srE').hidden=!!r.length;$('#srR').innerHTML=r.map(i=>`<a class="card sres hov" href="${i.u}"><small class="help">${kind(i.u)} · ${i.u}</small><h3>${esc(i.t)}</h3><p class="help">${esc(i.d||'')}</p></a>`).join('');history.replaceState(null,'','/search/?q='+encodeURIComponent(qq.value))};
 idx().then(()=>{qq.value=new URLSearchParams(location.search).get('q')||'';run()});qq.addEventListener('input',run);$('#srF').addEventListener('submit',e=>{e.preventDefault();run()});
 $$('#srCat button').forEach(b=>b.onclick=()=>{$$('#srCat button').forEach(x=>x.setAttribute('aria-pressed',x===b));cat=b.dataset.k;run()});qq.focus()}
/* saved + recently viewed providers */
const saved=()=>LS.get('saved',[]);
function syncHearts(){const s=saved();$$('[data-save]').forEach(b=>{const on=s.includes(b.dataset.save);b.setAttribute('aria-pressed',on);b.textContent=b.classList.contains('heart')?(on?'♥':'♡'):(on?'♥ Saved':'♡ Save')})}
document.addEventListener('click',e=>{const b=e.target.closest('[data-save]');if(!b)return;e.preventDefault();let s=saved();const id=b.dataset.save;s=s.includes(id)?s.filter(x=>x!==id):[...s,id];LS.set('saved',s);syncHearts();window.mmToast&&mmToast(s.includes(id)?'Saved to your shortlist':'Removed from shortlist');if($('#svList'))renderSaved()});
syncHearts();
const pm=location.pathname.match(/^\/movers\/profile\/([^/]+)\//);if(pm){const sb=$('[data-save]');if(sb){const r=LS.get('rv',[]).filter(x=>x!==sb.dataset.save);r.unshift(sb.dataset.save);LS.set('rv',r.slice(0,6))}}
function renderSaved(){const P=JSON.parse($('#provData').textContent),by=id=>P.find(p=>p.id===id),card=p=>`<div class="card"><div style="display:flex;gap:12px;align-items:center"><span class="plogo" style="position:static">${p.i}</span><div><span class="sample">Sample</span><h3 style="font-size:17px;margin:4px 0 0"><a href="${p.u}">${esc(p.n)}</a></h3></div></div><p class="help">${esc(p.area)} · ${esc(p.svc)}</p><div style="display:flex;gap:8px"><a class="btn btn-p" href="/get-quotes/">Get quote</a><button class="btn btn-g" data-save="${p.id}" type="button">♥ Saved</button></div></div>`;
 const s=saved().map(by).filter(Boolean);$('#svList').innerHTML=s.map(card).join('');$('#svE').hidden=!!s.length;
 const r=LS.get('rv',[]).map(by).filter(Boolean);$('#rvList').innerHTML=r.map(p=>`<a class="card hov" href="${p.u}"><b>${esc(p.n)}</b><small class="help">${esc(p.area)}</small></a>`).join('');$('#rvE').hidden=!!r.length;syncHearts()}
if($('#svList')){renderSaved();try{const sp=JSON.parse(localStorage.getItem('mm7_space'));if(sp&&(sp.name||sp.date))$('#svPlan').textContent=`${sp.name||'My move'}${sp.date?' — moving on '+new Date(sp.date+'T12:00').toLocaleDateString():''}`}catch(e){}
 $('#rvPages').innerHTML=recent().slice(0,6).map(r=>`<a class="al" href="${r.u}">${esc(r.t)}<span>›</span></a>`).join('')||'<p class="help">No pages visited yet.</p>'}
/* notifications: reminders from plan date */
if($('#ntList')){let sp=null;try{sp=JSON.parse(localStorage.getItem('mm7_space'))}catch(e){}const T=[[42,'Compare quotes and shortlist movers','/get-quotes/'],[28,'Book your mover','/get-quotes/'],[21,'Start packing rooms you rarely use','/tools/packing-calculator/'],[14,'Change your address and book utilities','/my-move/'],[7,'Pack a first-night essentials box','/my-move/'],[2,'Confirm crew arrival time','/moving-day/']];
 if(!sp||!sp.date){$('#ntList').innerHTML='<div class="empty"><h3>No moving date set</h3><p class="help">Set your date in My Moving Space and reminders will appear here.</p><a class="btn btn-p" href="/my-move/">Set my moving date</a></div>'}
 else{const d=new Date(sp.date+'T12:00'),now=new Date();$('#ntList').innerHTML=T.map(t=>{const due=new Date(d-t[0]*864e5),past=due<now;return`<div class="card nrow${past?' due':''}"><span class="ib">${past?'!':'⏰'}</span><div style="flex:1"><b>${t[1]}</b><p class="help" style="margin:0">${past?'Due ':'Scheduled '}${due.toLocaleDateString()} · ${t[0]} days before your move</p></div><a class="btn btn-o" href="${t[2]}">Open</a></div>`}).join('')}}
/* feedback via email app */
if($('#fbF'))$('#fbF').addEventListener('submit',e=>{e.preventDefault();const m=$('#fbM');const bad=m.value.trim().length<3;m.closest('.fld').classList.toggle('err',bad);if(bad){m.focus();return}const r=($('input[name=fbR]:checked')||{}).value||'not rated';location.href='mailto:hello@movematch.com?subject='+encodeURIComponent('Website feedback: '+$('#fbT').value)+'&body='+encodeURIComponent(`Rating: ${r}/5\n\n${m.value}\n\nReply to: ${$('#fbE').value||'-'}`);window.mmToast&&mmToast('Opening your email app…')});
$$('#fbF .chipb input').forEach(i=>i.addEventListener('change',()=>$$('#fbF .chipb').forEach(l=>l.setAttribute('aria-pressed',l.querySelector('input').checked))));
/* truck loading zones */
const LZ=['Zone 1 — cab end: heaviest items first. Appliances, dressers, boxed books. Keep weight low and centred.','Zone 2: long items standing upright along the walls — mattresses, sofas on end, bed frames, tabletops.','Zone 3: boxes in tiers, heavy at the bottom, light on top. Build tight walls floor to ceiling and strap each tier.','Zone 4 — by the door: things you need first. Essentials box, tools, cleaning kit, vacuum.'];
$$('.lz').forEach(g=>{const f=()=>{$('#lzOut').textContent=LZ[g.dataset.z];$$('.lz rect').forEach(r=>r.style.opacity='.55');g.querySelector('rect').style.opacity='1'};g.addEventListener('click',f);g.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();f()}})});
/* US map */
if($('#umR')){let F=null,T=null;const name=b=>b.getAttribute('aria-label');const up=()=>{$$('.stt').forEach(b=>{b.classList.toggle('f',b.dataset.s===F);b.classList.toggle('t',b.dataset.s===T);b.setAttribute('aria-pressed',b.dataset.s===F||b.dataset.s===T)});const fb=F&&$(`.stt[data-s="${F}"]`),tb=T&&$(`.stt[data-s="${T}"]`);$('#umF').textContent=fb?name(fb):'Select a state';$('#umT').textContent=tb?name(tb):F?'Now select destination':'—';$('#umK').textContent=F&&T?(F===T?'Within one state':'Interstate move'):'—';$('#umGo').href='/get-quotes/'+(F&&T?'?from='+F+'&to='+T:'')};
 $$('.stt').forEach(b=>b.onclick=()=>{if(!F||(F&&T)){F=b.dataset.s;T=null}else T=b.dataset.s;up()});$('#umR').onclick=()=>{F=T=null;up()};up()}
})();
/* ===== V10: real accounts & database ===== */
(function(){
const $=(s,r=document)=>r.querySelector(s),$$=(s,r=document)=>[...r.querySelectorAll(s)];
const post=(u,d)=>fetch(u,{method:'POST',headers:{'content-type':'application/json'},credentials:'same-origin',body:JSON.stringify(d)}).then(async r=>({ok:r.ok,status:r.status,j:await r.json().catch(()=>({}))}));
const sr=$('#sr');if(sr&&$('#sCo')){const qr=new URLSearchParams(location.search).get('role');if(qr&&[...sr.options].some(o=>o.value===qr))sr.value=qr;const f=()=>{$('#sCo').hidden=sr.value==='customer';$('#sc').required=sr.value!=='customer'};sr.onchange=f;f()}
$$('form[data-api]').forEach(f=>f.addEventListener('submit',async e=>{e.preventDefault();const err=$('.api-err',f);err.hidden=true;let ok=true;
 $$('[required]',f).forEach(x=>{const g=x.type==='email'?/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(x.value):x.type==='checkbox'?x.checked:x.minLength>0?x.value.length>=x.minLength:x.value.trim().length>0;x.closest('.fld')&&x.closest('.fld').classList.toggle('bad',!g);if(!g&&ok){ok=false;x.focus()}});if(!ok)return;
 const b=$('button[type=submit]',f);b.classList.add('loading');b.disabled=true;const d={};$$('[name]',f).forEach(x=>d[x.name]=x.value);if(f.dataset.api==='reset'){d.t=new URLSearchParams(location.search).get('t')||'';if(d.password!==d.password2){err.textContent='Passwords do not match.';err.hidden=false;b.classList.remove('loading');b.disabled=false;return}}
 const r=await post('/api/'+f.dataset.api,d).catch(()=>({ok:false,j:{error:'Network error — try again.'}}));b.classList.remove('loading');b.disabled=false;
 if(!r.ok){err.textContent=r.j.error||'Something went wrong.';err.hidden=false;err.classList.toggle('pend',r.j.status==='pending');return}
 if(r.j.done){f.innerHTML=`<div class="notice info" role="status"><div>${r.j.message}</div></div><a class="btn btn-p" href="/login/">Go to log in</a>`;return}
 if(r.j.pending){f.innerHTML=`<div class="notice info" role="status"><div><b>Application received — pending approval.</b><br>${r.j.message}</div></div><a class="btn btn-o" href="/">Back to homepage</a>`;return}
 const next=new URLSearchParams(location.search).get('next');location.href=next&&next.startsWith('/')&&!next.startsWith('//')?next:r.j.home||'/'}));
/* header: show account state */
fetch('/api/me',{credentials:'same-origin'}).then(r=>r.ok?r.json():null).then(j=>{if(!j||!j.user)return;$$('a[href="/login/"]').forEach(a=>{a.textContent='My dashboard';a.href=j.home});$$('a[href="/signup/"]').forEach(a=>{a.textContent='Log out';a.href='#';a.onclick=e=>{e.preventDefault();post('/api/logout',{}).then(()=>location.href='/')}})}).catch(()=>{});
/* quote wizard → database */
const ref=$('#wRef');if(ref){new MutationObserver(()=>{const v=ref.textContent;if(!v||ref.dataset.sent===v)return;ref.dataset.sent=v;let d=null;try{d=JSON.parse(localStorage.getItem('mm_req_'+v))}catch(e){}if(!d)return;try{const ph=JSON.parse(localStorage.getItem('mm_quote_photos')||'[]');if(ph.length)d.photos=ph}catch(e){}
 post('/api/quotes',{data:d}).then(r=>{if(r.ok&&r.j.ref){try{localStorage.setItem('mm_req_'+r.j.ref,JSON.stringify(d))}catch(e){}ref.dataset.sent=r.j.ref;ref.textContent=r.j.ref;try{localStorage.removeItem('mm_quote_photos')}catch(e){}window.mmToast&&mmToast(r.j.duplicate?'You already sent this request — reference '+r.j.ref:'Request saved — reference '+r.j.ref)}else window.mmToast&&mmToast('Saved on this device only (server unavailable).','var(--warn)')})}).observe(ref,{childList:true,characterData:true,subtree:true})}
/* track: check server */
const tk=$('#trackForm');if(tk)tk.addEventListener('submit',async()=>{const v=$('#tRef').value.trim().toUpperCase();if(!/^MM-[A-Z0-9]{4,8}$/.test(v))return;const r=await fetch('/api/track?ref='+encodeURIComponent(v)).catch(()=>null);if(!r||!r.ok)return;const j=await r.json();const q=j.request;$('#tOut').innerHTML=`<div class="notice info"><div><b>Request ${q.ref} found.</b><br>Route: ${String(q.frm||'').replace(/</g,'&lt;')} → ${String(q.dest||'').replace(/</g,'&lt;')}. Status: <b>${q.status}</b> · received ${new Date(q.created_at).toLocaleDateString()}.</div></div>`});
})();
;(function(){const $=(q,r=document)=>r.querySelector(q),$$=(q,r=document)=>[...r.querySelectorAll(q)],money=n=>'$'+(Math.round(n/10)*10).toLocaleString();
/* stage 08 tools */
const GEO={"New York, NY":[40.71,-74.01],"Brooklyn, NY":[40.68,-73.94],"Los Angeles, CA":[34.05,-118.24],"San Diego, CA":[32.72,-117.16],"San Francisco, CA":[37.77,-122.42],"San Jose, CA":[37.34,-121.89],"Sacramento, CA":[38.58,-121.49],"Chicago, IL":[41.88,-87.63],"Houston, TX":[29.76,-95.37],"Dallas, TX":[32.78,-96.8],"Austin, TX":[30.27,-97.74],"San Antonio, TX":[29.42,-98.49],"Fort Worth, TX":[32.76,-97.33],"Phoenix, AZ":[33.45,-112.07],"Scottsdale, AZ":[33.49,-111.93],"Tucson, AZ":[32.22,-110.97],"Philadelphia, PA":[39.95,-75.17],"Pittsburgh, PA":[40.44,-80],"Atlanta, GA":[33.75,-84.39],"Miami, FL":[25.76,-80.19],"Orlando, FL":[28.54,-81.38],"Tampa, FL":[27.95,-82.46],"Jacksonville, FL":[30.33,-81.66],"Seattle, WA":[47.61,-122.33],"Spokane, WA":[47.66,-117.43],"Denver, CO":[39.74,-104.99],"Colorado Springs, CO":[38.83,-104.82],"Boston, MA":[42.36,-71.06],"Washington, DC":[38.91,-77.04],"Baltimore, MD":[39.29,-76.61],"Nashville, TN":[36.16,-86.78],"Memphis, TN":[35.15,-90.05],"Charlotte, NC":[35.23,-80.84],"Raleigh, NC":[35.78,-78.64],"Las Vegas, NV":[36.17,-115.14],"Portland, OR":[45.52,-122.68],"Minneapolis, MN":[44.98,-93.27],"Salt Lake City, UT":[40.76,-111.89],"Kansas City, MO":[39.1,-94.58],"St. Louis, MO":[38.63,-90.2],"Columbus, OH":[39.96,-83],"Cleveland, OH":[41.5,-81.69],"Detroit, MI":[42.33,-83.05],"Indianapolis, IN":[39.77,-86.16],"Milwaukee, WI":[43.04,-87.91],"New Orleans, LA":[29.95,-90.07],"Oklahoma City, OK":[35.47,-97.52],"Albuquerque, NM":[35.08,-106.65],"Boise, ID":[43.62,-116.2],"Honolulu, HI":[21.31,-157.86],"Anchorage, AK":[61.22,-149.9],"Richmond, VA":[37.54,-77.44],"Louisville, KY":[38.25,-85.76],"Omaha, NE":[41.26,-95.93],"Charleston, SC":[32.78,-79.93]};
const geoFind=v=>{v=(v||'').trim().toLowerCase();const k=Object.keys(GEO).find(c=>c.toLowerCase()===v||c.toLowerCase().split(',')[0]===v);return k?[k,GEO[k]]:null};
const hav=(a,b)=>{const R=3958.8,r=x=>x*Math.PI/180,dl=r(b[0]-a[0]),dn=r(b[1]-a[1]);const h=Math.sin(dl/2)**2+Math.cos(r(a[0]))*Math.cos(r(b[0]))*Math.sin(dn/2)**2;return 2*R*Math.asin(Math.sqrt(h))};
const T8={
 distance:r=>{const a=geoFind($('[name=from]',r).value),b=geoFind($('[name=to]',r).value);if(!a||!b)return[['Status','Pick both cities from the list (e.g. "Denver, CO")']];if(a[0]===b[0])return[['Status','Origin and destination are the same']];const ab=(a[0].slice(-2)==='HI'||a[0].slice(-2)==='AK'||b[0].slice(-2)==='HI'||b[0].slice(-2)==='AK');const line=hav(a[1],b[1]),road=line*1.2;const days=Math.max(1,Math.ceil(road/450));return[['Route',a[0]+' → '+b[0]],['Straight-line distance',Math.round(line).toLocaleString()+' mi'],['Estimated driving distance',ab?'Not drivable — needs sea/air freight':'≈ '+Math.round(road).toLocaleString()+' mi'],['Driving time (55 mph avg)',ab?'—':'≈ '+Math.round(road/55)+' hours'],['Driving days at 450 mi/day',ab?'—':days+' day'+(days>1?'s':'')],['Move type',a[0].slice(-2)===b[0].slice(-2)?(road<100?'Local':'Long-distance in-state'):'Interstate']]},
 savings:r=>{const v=n=>+($(`[name=${n}]`,r)||{}).value||0;const base=v('base');if(!base)return[['Status','Enter a baseline quote amount']];const opts=[['offpeak','Move in off-peak season (Oct–Apr)',.12],['weekday','Move on a weekday mid-month',.07],['declutter','Declutter 20% of items',.12],['selfpack','Pack yourself',.15],['flex','Flexible delivery window',.06],['compare','Compare 3+ quotes',.1]];let left=base,list=[];opts.forEach(o=>{const c=$(`[name=${o[0]}]`,r);if(c&&c.checked){const s=left*o[2];left-=s;list.push([o[1],'− '+money(s)])}});return[...list,['Baseline',money(base)],['Indicative new cost',money(left)],['Indicative saving',money(base-left)+' ('+Math.round((1-left/base)*100)+'%)']]},
 insurance:r=>{const v=n=>+($(`[name=${n}]`,r)||{}).value||0;const w=v('weight'),val=v('value'),ded=+$('[name=ded]',r).value;if(!w||!val)return[['Status','Enter shipment weight and declared value']];const rel=w*0.6;const full=val*(ded===0?.01:ded===250?.0085:.007);return[['Released value (basic, no extra charge)','Up to '+money(rel)+' total (60¢/lb)'],['Full value protection (indicative)',money(full*.8)+' – '+money(full*1.2)],['Deductible chosen',ded?money(ded):'None'],['Coverage gap under released value',money(Math.max(0,val-rel))],['Note','Valuation is not insurance; ask your mover for written terms']]},
 furniture:r=>{const n=k=>+($(`[name=${k}]`,r)||{}).value||0;const W=n('iw'),H=n('ih'),D=n('id'),dw=n('dw'),dh=n('dh'),hw=n('hw');if(!W||!H||!D||!dw||!dh)return[['Status','Enter item and doorway measurements (inches)']];const pad=1;const fits=[[W,H],[D,H],[W,D],[H,W],[D,W]].some(([a,b])=>a+pad<=dw&&b+pad<=dh);const diag=Math.sqrt(D*D+H*H);const tilt=!fits&&Math.min(W,D)+pad<=dw&&diag<=dh+Math.min(W,D);const hall=hw?(Math.min(W,D)+pad<=hw?'Fits the hallway width':'Too wide for the hallway on its narrowest side'):'Not checked';return[['Doorway',fits?'✓ Fits upright or on its side':tilt?'Tight — likely fits if tilted/angled':'✗ Will not fit without disassembly'],['Smallest face',Math.min(W,D)+'″ × '+H+'″'],['Diagonal depth',diag.toFixed(1)+'″'],['Hallway',hall],['Advice',fits?'Wrap and protect door frames':'Remove legs/doors, or ask about hoisting']]}
};
$$('[data-t8]').forEach(r=>{const f=T8[r.dataset.t8],o=$('.cOut',r);const run=()=>{o.innerHTML=f(r).map(x=>`<div><span>${x[0]}</span><b>${x[1]}</b></div>`).join('')};r.addEventListener('input',run);r.addEventListener('change',run);run();const ex=$('[data-export]',r);if(ex)ex.onclick=()=>{const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([$$('div',o).map(d=>d.children[0].textContent+': '+d.children[1].textContent).join('\n')],{type:'text/plain'}));a.download='movematch-'+r.dataset.t8+'.txt';a.click()};try{const k='mm_t8_'+r.dataset.t8,s=JSON.parse(localStorage.getItem(k)||'{}');$$('input,select',r).forEach(i=>{if(i.name&&s[i.name]!=null){i.type==='checkbox'?i.checked=s[i.name]:i.value=s[i.name]}});run();r.addEventListener('change',()=>{const d={};$$('input,select',r).forEach(i=>{if(i.name)d[i.name]=i.type==='checkbox'?i.checked:i.value});localStorage.setItem(k,JSON.stringify(d))})}catch(e){}});

})();

/* quote photos */
;(function(){const inp=document.getElementById('wPh');if(!inp)return;const L=document.getElementById('wPhL');let P=[];try{P=JSON.parse(localStorage.getItem('mm_quote_photos')||'[]')}catch(e){}
const draw=()=>{L.innerHTML=P.map((s,i)=>`<span style="position:relative"><img src="${s}" alt="Item photo ${i+1}" style="width:80px;height:80px;object-fit:cover;border-radius:8px"><button type="button" data-i="${i}" aria-label="Remove photo ${i+1}" style="position:absolute;top:-6px;right:-6px;border-radius:50%;width:24px;height:24px;border:0;background:#102A43;color:#fff">×</button></span>`).join('');try{localStorage.setItem('mm_quote_photos',JSON.stringify(P))}catch(e){}};
L.onclick=e=>{const b=e.target.closest('[data-i]');if(b){P.splice(+b.dataset.i,1);draw()}};
inp.onchange=()=>{[...inp.files].slice(0,3-P.length).forEach(f=>{if(!/^image\//.test(f.type))return;const im=new Image();im.onload=()=>{const k=Math.min(1,640/Math.max(im.width,im.height)),c=document.createElement('canvas');c.width=im.width*k;c.height=im.height*k;c.getContext('2d').drawImage(im,0,0,c.width,c.height);P.push(c.toDataURL('image/jpeg',.6));URL.revokeObjectURL(im.src);draw()};im.src=URL.createObjectURL(f)});inp.value=''};draw();

})();
