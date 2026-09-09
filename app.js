const DIMENSIONS = {
  pain: 'Pain', economics: 'Economics', founderFit: 'Founder fit', distribution: 'Distribution',
  insightGap: 'Insight gap', solutionLeverage: 'Leverage', market: 'Market', validation: 'Validation'
};

const state = { data: null, category: 'All', query: '', sort: 'priorityScore' };
const $ = s => document.querySelector(s);
const esc = (s='') => String(s).replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#039;','"':'&quot;'}[c]));
const pct = v => Math.max(0,Math.min(100,v/5*100));
const tier = score => score>=82?'top':score>=76?'strong':'test';
const short = title => title.split(' ').slice(0,2).map(w=>w[0]).join('').toUpperCase();

function parseLooseJson(text) {
  let out='', inString=false, escaped=false;
  for (const c of text) {
    if (inString) {
      if (escaped) escaped=false;
      else if (c==='\\') escaped=true;
      else if (c==='"') inString=false;
      else if (c==='\n' || c==='\r') { out += c==='\n' ? '\\n' : ''; continue; }
    } else if (c==='"') inString=true;
    out += c;
  }
  return JSON.parse(out);
}

async function loadJson(url) {
  const text = await fetch(url).then(r=>{ if(!r.ok) throw new Error(`${url} returned ${r.status}`); return r.text(); });
  return parseLooseJson(text);
}

function normalizeOpportunity(o, weights) {
  const base = Object.entries(weights).reduce((sum,[key,w])=>sum+((o.dimensions?.[key]||0)/5*w),0);
  const score = base-(o.riskPenalty||0);
  const priority = score*(.85+.03*(o.confidence||3));
  return {
    ...o,
    baseScore: Number.isFinite(o.baseScore)?o.baseScore:base,
    score: Number.isFinite(o.score)?o.score:score,
    priorityScore: Number.isFinite(o.priorityScore)?o.priorityScore:priority,
    founderReturn: Number.isFinite(o.founderReturn)?o.founderReturn:Math.round(priority),
    evidence:o.evidence||[], riskNotes:o.riskNotes||[]
  };
}

function pathContext() {
  const parts = location.pathname.split('/').filter(Boolean);
  if (parts.length>=2 && parts[0]!=='markets') return {countrySlug:parts[0],citySlug:parts[1]};
  return {countrySlug:'canada',citySlug:'toronto'};
}

async function loadLegacyToronto(context) {
  const manifest = await loadJson('/data/index.json');
  const chunks = await Promise.all(manifest.shards.map(name=>loadJson(`/data/${name}`)));
  const meta = {...manifest.meta,countrySlug:context.countrySlug||'canada',countryName:'Canada',citySlug:'toronto',summary:'Expensive, fragmented decisions dominate: condos, childcare, renovations, eldercare and newcomer career conversion.'};
  return {meta,opportunities:chunks.flat().map(o=>normalizeOpportunity(o,meta.weights))};
}

async function loadCityData(context) {
  if (!context.citySlug || context.citySlug==='toronto') return loadLegacyToronto(context);
  const atlas = await loadJson('/data/markets.json');
  const country = atlas.countries.find(c=>c.slug===context.countrySlug);
  const city = country?.cities.find(c=>c.slug===context.citySlug);
  if (!country || !city || !city.opportunities) throw new Error('Unknown or unresearched city');
  const meta = {market:city.market,researchedAt:atlas.researchedAt,weights:atlas.weights,countrySlug:country.slug,countryName:country.name,citySlug:city.slug,summary:city.summary};
  return {meta,opportunities:city.opportunities.map(o=>normalizeOpportunity(o,atlas.weights))};
}

async function init() {
  const context = pathContext();
  state.data = await loadCityData(context);
  renderHero(); renderTopPick(); renderChips(); renderWeights(); renderScatter(); renderRanking();
  $('#search')?.addEventListener('input',e=>{state.query=e.target.value.toLowerCase();renderRanking();});
  $('#sort')?.addEventListener('change',e=>{state.sort=e.target.value;renderRanking();});
  $('#dialogClose')?.addEventListener('click',()=>$('#detailDialog').close());
  $('#detailDialog')?.addEventListener('click',e=>{
    const r=e.target.getBoundingClientRect();
    if(e.target===$('#detailDialog')&&(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)) e.target.close();
  });
}

function ranked(){return [...state.data.opportunities].sort((a,b)=>b.priorityScore-a.priorityScore);}

function renderHero(){
  const ops=state.data.opportunities, top=ranked()[0];
  const avgPain=ops.reduce((s,o)=>s+o.dimensions.pain,0)/ops.length;
  const high=ops.filter(o=>o.priorityScore>=80).length;
  const meta=state.data.meta;
  document.title=`HAAM Pain - ${meta.market} opportunity radar`;
  const eyebrow=$('.hero .eyebrow'); if(eyebrow) eyebrow.textContent=`${meta.market.toUpperCase()} / SEPTEMBER 2026`;
  const lede=$('#cityLede'); if(lede&&meta.summary) lede.textContent=meta.summary;
  const rankingTitle=$('#rankingTitle'); if(rankingTitle) rankingTitle.textContent=`${ops.length} pains worth testing`;
  const countryLink=$('#countryLink'); if(countryLink){countryLink.href=`/${meta.countrySlug}/`;countryLink.textContent=meta.countryName;}
  $('#heroStats').innerHTML=`<div class="stat"><strong>${ops.length}</strong><span>opportunities</span></div><div class="stat"><strong>${avgPain.toFixed(1)}/5</strong><span>average pain</span></div><div class="stat"><strong>${high}</strong><span>priority ≥ 80</span></div><div class="stat"><strong>${top.priorityScore.toFixed(1)}</strong><span>top priority</span></div>`;
  $('#footerMeta').textContent=`${meta.market} / researched ${meta.researchedAt}. Scores are hypotheses.`;
}

function renderTopPick(){
  const o=ranked()[0];
  $('#topPick').innerHTML=`<div class="top-pick-side"><small>PRIORITY SCORE / 100</small><div class="score">${o.priorityScore.toFixed(1)}</div><small>${esc(o.category)} / CONFIDENCE ${o.confidence.toFixed(1)}/5</small></div><div class="top-pick-body"><span class="rank-label">#01 CURRENT LEADER</span><h2>${esc(o.title)}</h2><p>${esc(o.wedge)}</p><button data-id="${esc(o.id)}">Inspect the evidence</button></div>`;
  $('#topPick button').addEventListener('click',()=>openDetail(o.id));
}

function renderChips(){
  const categories=['All',...new Set(state.data.opportunities.map(o=>o.category))];
  $('#chips').innerHTML=categories.map(c=>`<button class="chip ${c===state.category?'active':''}" data-category="${esc(c)}">${esc(c)}</button>`).join('');
  $('#chips').querySelectorAll('button').forEach(btn=>btn.addEventListener('click',()=>{state.category=btn.dataset.category;renderChips();renderRanking();}));
}

function renderWeights(){const w=state.data.meta.weights;$('#weights').innerHTML=Object.entries(w).map(([k,v])=>`<div class="weight"><strong>${v}</strong><span>${esc(DIMENSIONS[k]||k)}</span></div>`).join('');}

function renderRanking(){
  let ops=state.data.opportunities.filter(o=>{const categoryOk=state.category==='All'||o.category===state.category;const hay=`${o.title} ${o.wedge} ${o.buyer} ${o.category}`.toLowerCase();return categoryOk&&hay.includes(state.query);});
  const s=state.sort;
  if(s==='riskPenalty') ops.sort((a,b)=>a.riskPenalty-b.riskPenalty||b.priorityScore-a.priorityScore);
  else if(s==='founderReturn') ops.sort((a,b)=>b.founderReturn-a.founderReturn);
  else if(s==='confidence') ops.sort((a,b)=>b.confidence-a.confidence);
  else if(DIMENSIONS[s]) ops.sort((a,b)=>b.dimensions[s]-a.dimensions[s]);
  else ops.sort((a,b)=>b[s]-a[s]);
  if(!ops.length){$('#rankList').innerHTML='<div class="empty">No pains match that filter.</div>';return;}
  const overallRank=new Map(ranked().map((o,i)=>[o.id,i+1]));
  $('#rankList').innerHTML=ops.map(o=>`<article class="rank-row" tabindex="0" role="button" data-id="${esc(o.id)}" aria-label="Open ${esc(o.title)} details"><span class="rank-num">${String(overallRank.get(o.id)).padStart(2,'0')}</span><div class="rank-title">${esc(o.title)}<span>${esc(o.category)} · ${esc(o.priceHypothesis)}</span></div><span class="priority-pill ${tier(o.priorityScore)}"><span class="metric-strong">${o.priorityScore.toFixed(1)}</span></span><span class="metric-small">${o.dimensions.pain.toFixed(1)}</span><span class="metric-small">${o.dimensions.economics.toFixed(1)}</span><span class="metric-small">${o.dimensions.founderFit.toFixed(1)}</span><span class="metric-small">${o.confidence.toFixed(1)} / 5</span></article>`).join('');
  $('#rankList').querySelectorAll('.rank-row').forEach(row=>{const open=()=>openDetail(row.dataset.id);row.addEventListener('click',open);row.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();open();}});});
}

function renderScatter(){
  const ops=state.data.opportunities,W=1100,H=650,m={l:75,r:45,t:40,b:70};
  const x=v=>m.l+(v-2.5)/(5-2.5)*(W-m.l-m.r), y=v=>H-m.b-(v-2.5)/(5-2.5)*(H-m.t-m.b), ticks=[2.5,3,3.5,4,4.5,5];
  const grid=ticks.map(t=>`<line class="grid-line" x1="${x(t)}" y1="${m.t}" x2="${x(t)}" y2="${H-m.b}"/><line class="grid-line" x1="${m.l}" y1="${y(t)}" x2="${W-m.r}" y2="${y(t)}"/><text class="tick-label" x="${x(t)}" y="${H-m.b+23}" text-anchor="middle">${t}</text><text class="tick-label" x="${m.l-15}" y="${y(t)+3}" text-anchor="end">${t}</text>`).join('');
  const bubbles=[...ops].sort((a,b)=>a.priorityScore-b.priorityScore).map(o=>{const r=12+(o.dimensions.founderFit-2.5)*8;const fill=tier(o.priorityScore)==='top'?'var(--acid)':tier(o.priorityScore)==='strong'?'var(--cool)':'#c5c4bb';return `<g class="bubble" data-id="${esc(o.id)}" aria-label="${esc(o.title)}"><circle cx="${x(o.dimensions.economics)}" cy="${y(o.dimensions.pain)}" r="${r}" fill="${fill}" stroke="var(--ink)" stroke-width="1.2" opacity=".91"/><text class="bubble-text" x="${x(o.dimensions.economics)}" y="${y(o.dimensions.pain)}">${short(o.title)}</text></g>`;}).join('');
  $('#scatter').innerHTML=`<svg viewBox="0 0 ${W} ${H}" aria-hidden="true">${grid}<line class="axis-line" x1="${m.l}" y1="${H-m.b}" x2="${W-m.r}" y2="${H-m.b}"/><line class="axis-line" x1="${m.l}" y1="${m.t}" x2="${m.l}" y2="${H-m.b}"/><text class="axis-label" x="${(m.l+W-m.r)/2}" y="${H-22}" text-anchor="middle">ECONOMICS →</text><text class="axis-label" x="20" y="${H/2}" transform="rotate(-90 20 ${H/2})" text-anchor="middle">PAIN →</text>${bubbles}</svg>`;
  $('#scatter').querySelectorAll('.bubble').forEach(g=>g.addEventListener('click',()=>openDetail(g.dataset.id)));
}

function openDetail(id){
  const o=state.data.opportunities.find(x=>x.id===id),rank=ranked().findIndex(x=>x.id===id)+1;
  const dims=Object.entries(o.dimensions).map(([k,v])=>`<div class="dimension"><span>${esc(DIMENSIONS[k]||k)}</span><div class="bar"><i style="width:${pct(v)}%"></i></div><b>${v.toFixed(1)}</b></div>`).join('');
  const evidence=o.evidence.map(e=>`<li><a href="${esc(e.url)}" target="_blank" rel="noopener noreferrer">${esc(e.title||e.label||new URL(e.url).hostname)}</a><small>${esc(e.note||'')}</small></li>`).join('');
  const risks=(Array.isArray(o.riskNotes)?o.riskNotes:[o.riskNotes]).filter(Boolean).map(r=>`<li>${esc(r)}</li>`).join('');
  $('#detailContent').innerHTML=`<article class="detail"><span class="detail-kicker">#${String(rank).padStart(2,'0')} / ${esc(o.category)}</span><h2>${esc(o.title)}</h2><p>${esc(o.wedge)}</p><div class="detail-scoreline"><div><strong>${o.priorityScore.toFixed(1)}</strong><span>priority</span></div><div><strong>${o.score.toFixed(1)}</strong><span>score after risk</span></div><div><strong>${o.riskPenalty}</strong><span>risk penalty</span></div><div><strong>${o.founderReturn.toFixed(0)}</strong><span>founder return</span></div><div><strong>${o.confidence.toFixed(1)}/5</strong><span>confidence</span></div></div><div class="detail-block"><h3>Buyer</h3><p>${esc(o.buyer)}</p></div><div class="detail-block"><h3>Pain moment</h3><p>${esc(o.painMoment)}</p></div><div class="detail-block"><h3>Current workaround</h3><p>${esc(o.currentWorkaround)}</p></div><div class="detail-block"><h3>Why now</h3><p>${esc(o.whyNow)}</p></div><div class="detail-block"><h3>First paid test</h3><p>${esc(o.firstPaidTest)}</p></div><div class="detail-block"><h3>Price hypothesis</h3><p>${esc(o.priceHypothesis)}</p></div><div class="detail-block"><h3>Founder fit</h3><p>${esc(o.fitNote)}</p></div><div class="detail-block"><h3>Risks</h3><ul>${risks}</ul></div><div class="detail-block"><h3>Dimensions</h3><div class="dimension-bars">${dims}</div></div><div class="detail-block"><h3>Evidence</h3><ul class="evidence-list">${evidence}</ul></div></article>`;
  $('#detailDialog').showModal();
}

init().catch(err=>{console.error(err);document.body.innerHTML=`<main style="padding:10vw;font-family:sans-serif"><h1>Could not load the opportunity data.</h1><pre>${esc(err.message)}</pre></main>`;});
