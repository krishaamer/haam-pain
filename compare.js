const DIMENSIONS = {
  pain:'Pain', economics:'Economics', founderFit:'Founder fit', distribution:'Distribution',
  insightGap:'Insight gap', solutionLeverage:'Leverage', market:'Market', validation:'Validation'
};
const CATEGORY_LABELS = {
  Housing:'housing / property', Family:'family / care', Finance:'financial protection', Business:'business / compliance',
  Health:'health / care navigation', Work:'work / career', Civic:'public systems / rights', Mobility:'mobility', Education:'education'
};
const $ = s => document.querySelector(s);
const esc = (s='') => String(s).replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#039;','"':'&quot;'}[c]));
const mean = xs => xs.length ? xs.reduce((a,b)=>a+b,0)/xs.length : 0;
const pp = v => `${Math.round(v*100)}pp`;

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

function scoreOpportunity(o, weights) {
  const base = Object.entries(weights).reduce((sum,[key,w])=>sum+((o.dimensions?.[key]||0)/5*w),0);
  const score = base-(o.riskPenalty||0);
  const priority = score*(.85+.03*(o.confidence||3));
  return {...o, baseScore:base, score, priorityScore:priority, evidence:o.evidence||[], riskNotes:o.riskNotes||[]};
}

async function loadToronto(weights) {
  const manifest = await loadJson('/data/index.json');
  const chunks = await Promise.all(manifest.shards.map(name=>loadJson(`/data/${name}`)));
  return chunks.flat().map(o=>scoreOpportunity(o,weights));
}

async function loadCities(atlas) {
  const toronto = await loadToronto(atlas.weights);
  return atlas.countries.flatMap(country => country.cities.map(city => {
    const raw = city.slug==='toronto' ? toronto : (city.opportunities||[]).map(o=>scoreOpportunity(o,atlas.weights));
    return {
      ...city,
      countryName:country.name,
      countrySlug:country.slug,
      opportunities:[...raw].sort((a,b)=>b.priorityScore-a.priorityScore)
    };
  })).filter(c=>c.opportunities.length);
}

function metrics(city) {
  const ops=city.opportunities;
  const dimensions={};
  Object.keys(DIMENSIONS).forEach(k=>dimensions[k]=mean(ops.map(o=>o.dimensions?.[k]||0)));
  const counts={};
  ops.forEach(o=>counts[o.category]=(counts[o.category]||0)+1);
  const categoryShares={};
  Object.entries(counts).forEach(([k,v])=>categoryShares[k]=v/ops.length);
  return {
    ...city,
    dimensions,
    categoryShares,
    avgRisk:mean(ops.map(o=>o.riskPenalty||0)),
    avgConfidence:mean(ops.map(o=>o.confidence||0)),
    avgPriority:mean(ops.map(o=>o.priorityScore)),
    top:ops[0],
    count:ops.length
  };
}

function buildBaseline(cities) {
  const categories=[...new Set(cities.flatMap(c=>Object.keys(c.categoryShares)))].sort();
  const categoryShares={};
  categories.forEach(cat=>categoryShares[cat]=mean(cities.map(c=>c.categoryShares[cat]||0)));
  const dimensions={};
  Object.keys(DIMENSIONS).forEach(k=>dimensions[k]=mean(cities.map(c=>c.dimensions[k])));
  return {categories,categoryShares,dimensions,avgRisk:mean(cities.map(c=>c.avgRisk))};
}

function signature(city, baseline) {
  const ranked=baseline.categories.map(cat=>({cat,share:city.categoryShares[cat]||0,base:baseline.categoryShares[cat]||0,delta:(city.categoryShares[cat]||0)-(baseline.categoryShares[cat]||0)})).sort((a,b)=>b.delta-a.delta);
  return ranked[0] || {cat:'Other',share:0,base:0,delta:0};
}

function dimensionSignature(city, baseline) {
  return Object.keys(DIMENSIONS).map(key=>({key,value:city.dimensions[key],base:baseline.dimensions[key],delta:city.dimensions[key]-baseline.dimensions[key]})).sort((a,b)=>b.delta-a.delta)[0];
}

function issueShapeSimilarity(a,b,baseline) {
  const dimDistance=mean(Object.keys(DIMENSIONS).map(k=>Math.abs(a.dimensions[k]-b.dimensions[k])/5));
  const catDistance=baseline.categories.reduce((sum,cat)=>sum+Math.abs((a.categoryShares[cat]||0)-(b.categoryShares[cat]||0)),0)/2;
  return Math.max(0,Math.min(100,Math.round((1-(dimDistance*.55+catDistance*.45))*100)));
}

function cityOption(c){return `<option value="${esc(c.slug)}">${esc(c.name)} · ${esc(c.countryName)}</option>`;}
function categoryCopy(cat){return CATEGORY_LABELS[cat] || cat.toLowerCase();}

function topCard(city) {
  const o=city.top;
  return `<a class="pair-top-card" href="${esc(city.path)}">
    <div class="pair-top-score">${o.priorityScore.toFixed(1)}</div>
    <div><span>${esc(o.category)} · ${esc(city.name)}</span><h3>${esc(o.title)}</h3><p>${esc(o.wedge)}</p></div>
  </a>`;
}

function renderPair(a,b,baseline) {
  const similarity=issueShapeSimilarity(a,b,baseline);
  const sigA=signature(a,baseline), sigB=signature(b,baseline);
  const catDiff=baseline.categories.map(cat=>({cat,diff:(a.categoryShares[cat]||0)-(b.categoryShares[cat]||0)})).sort((x,y)=>Math.abs(y.diff)-Math.abs(x.diff))[0];
  const dimDiff=Object.keys(DIMENSIONS).map(key=>({key,diff:a.dimensions[key]-b.dimensions[key]})).sort((x,y)=>Math.abs(y.diff)-Math.abs(x.diff))[0];
  const catHigh=catDiff.diff>=0?a:b, catLow=catDiff.diff>=0?b:a;
  const dimHigh=dimDiff.diff>=0?a:b, dimLow=dimDiff.diff>=0?b:a;
  const riskHigh=a.avgRisk>=b.avgRisk?a:b, riskLow=a.avgRisk>=b.avgRisk?b:a;

  $('#pairHeadline').innerHTML=`<div class="similarity"><strong>${similarity}%</strong><span>research-shape similarity</span></div><div><p class="eyebrow">${esc(a.name.toUpperCase())} × ${esc(b.name.toUpperCase())}</p><h3>${similarity>=80?'More alike than different.':similarity>=65?'Similar systems, different pressure points.':'Distinct pain profiles.'}</h3><p>The similarity score blends average scoring dimensions with category mix. It is a comparison of this research set, not a city-quality index.</p></div>`;

  const insights=[
    `<strong>${esc(catHigh.name)}</strong> has ${pp(Math.abs(catDiff.diff))} more <b>${esc(categoryCopy(catDiff.cat))}</b> opportunities in its researched mix than ${esc(catLow.name)}.`,
    `<strong>${esc(dimHigh.name)}</strong> averages ${Math.abs(dimDiff.diff).toFixed(1)} points higher on <b>${esc(DIMENSIONS[dimDiff.key].toLowerCase())}</b> than ${esc(dimLow.name)}.`,
    `<strong>${esc(a.name)}</strong> over-indexes most on <b>${esc(categoryCopy(sigA.cat))}</b>; <strong>${esc(b.name)}</strong> over-indexes on <b>${esc(categoryCopy(sigB.cat))}</b>.`,
    Math.abs(a.avgRisk-b.avgRisk)<.25 ? `The two samples carry almost the same average risk penalty (${a.avgRisk.toFixed(1)} vs ${b.avgRisk.toFixed(1)}).` : `<strong>${esc(riskHigh.name)}</strong> carries the higher average risk penalty (${riskHigh.avgRisk.toFixed(1)} vs ${riskLow.avgRisk.toFixed(1)}), implying more trust, regulatory or operational burden in the current wedges.`
  ];
  $('#pairInsights').innerHTML=insights.map((text,i)=>`<article><span>${String(i+1).padStart(2,'0')}</span><p>${text}</p></article>`).join('');
  $('#topAKicker').textContent=`${a.name.toUpperCase()} / CURRENT LEADER`;
  $('#topBKicker').textContent=`${b.name.toUpperCase()} / CURRENT LEADER`;
  $('#topA').innerHTML=topCard(a); $('#topB').innerHTML=topCard(b);

  $('#dimensionCompare').innerHTML=Object.keys(DIMENSIONS).map(key=>{
    const av=a.dimensions[key], bv=b.dimensions[key];
    return `<div class="dim-row"><span class="dim-name">${esc(DIMENSIONS[key])}</span><div class="dim-city"><b>${av.toFixed(1)}</b><div class="dim-track"><i style="width:${av/5*100}%"></i></div><small>${esc(a.name)}</small></div><div class="dim-city second"><b>${bv.toFixed(1)}</b><div class="dim-track"><i style="width:${bv/5*100}%"></i></div><small>${esc(b.name)}</small></div><span class="dim-delta ${Math.abs(av-bv)>=.35?'notable':''}">${av===bv?'=':`${av>bv?'+':'−'}${Math.abs(av-bv).toFixed(1)}`}</span></div>`;
  }).join('');
}

function renderMix(cities,baseline) {
  const cats=[...baseline.categories].sort((a,b)=>baseline.categoryShares[b]-baseline.categoryShares[a]);
  $('#mixTable').style.setProperty('--cat-count',cats.length);
  $('#mixTable').innerHTML=`<div class="mix-head"><span>City</span>${cats.map(c=>`<span>${esc(c)}</span>`).join('')}</div>${cities.map(city=>`<a class="mix-row" href="${esc(city.path)}"><strong>${esc(city.name)}</strong>${cats.map(cat=>{const share=city.categoryShares[cat]||0;const intensity=Math.min(92,8+share*170);return `<span class="heat-cell" style="--heat:${intensity}%"><b>${share?Math.round(share*100):0}%</b></span>`;}).join('')}</a>`).join('')}`;
}

function renderSignatures(cities,baseline) {
  $('#signatureGrid').innerHTML=cities.map(city=>{
    const sig=signature(city,baseline), ds=dimensionSignature(city,baseline);
    const topTwo=city.opportunities.slice(0,2);
    return `<a class="signature-card" href="${esc(city.path)}"><span class="card-kicker">${esc(city.countryName)} · ${city.count} OPPORTUNITIES</span><h3>${esc(city.name)}</h3><div class="signature-label">${esc(sig.cat)}</div><p>${Math.round(sig.share*100)}% of this research set, ${sig.delta>=0?'+':''}${Math.round(sig.delta*100)}pp vs the equal-city atlas baseline.</p><div class="signature-dim"><span>Relative strength</span><b>${esc(DIMENSIONS[ds.key])} ${ds.delta>=0?'+':''}${ds.delta.toFixed(1)}</b></div><ol>${topTwo.map(o=>`<li>${esc(o.title)} <b>${o.priorityScore.toFixed(1)}</b></li>`).join('')}</ol></a>`;
  }).join('');
}

function renderMatrix(cities,baseline) {
  const sorted=[...cities].sort((a,b)=>b.top.priorityScore-a.top.priorityScore);
  $('#cityMatrix').innerHTML=`<div class="matrix-head"><span>City</span><span>Current leader</span><span>Top</span><span>Pain</span><span>Economics</span><span>Fit</span><span>Risk</span><span>Signature</span></div>${sorted.map(c=>{const sig=signature(c,baseline);return `<a class="matrix-row" href="${esc(c.path)}"><strong>${esc(c.name)}<small>${esc(c.countryName)}</small></strong><span>${esc(c.top.title)}</span><b>${c.top.priorityScore.toFixed(1)}</b><span>${c.dimensions.pain.toFixed(1)}</span><span>${c.dimensions.economics.toFixed(1)}</span><span>${c.dimensions.founderFit.toFixed(1)}</span><span>${c.avgRisk.toFixed(1)}</span><span>${esc(sig.cat)}</span></a>`;}).join('')}`;
}

function syncQuery(a,b) {
  const u=new URL(location.href); u.searchParams.set('a',a.slug); u.searchParams.set('b',b.slug); history.replaceState(null,'',u);
}

async function init() {
  const atlas=await loadJson('/data/markets.json');
  const rawCities=await loadCities(atlas);
  const cities=rawCities.map(metrics);
  const baseline=buildBaseline(cities);
  const bySlug=new Map(cities.map(c=>[c.slug,c]));
  const params=new URLSearchParams(location.search);
  let a=bySlug.get(params.get('a')) || bySlug.get('toronto') || cities[0];
  let b=bySlug.get(params.get('b')) || bySlug.get('london') || cities.find(c=>c.slug!==a.slug) || cities[0];
  if(a.slug===b.slug) b=cities.find(c=>c.slug!==a.slug)||b;

  const options=cities.map(cityOption).join('');
  $('#cityA').innerHTML=options; $('#cityB').innerHTML=options;
  $('#cityA').value=a.slug; $('#cityB').value=b.slug;

  const rerender=()=>{
    a=bySlug.get($('#cityA').value); b=bySlug.get($('#cityB').value);
    if(a.slug===b.slug){const replacement=cities.find(c=>c.slug!==a.slug);$('#cityB').value=replacement.slug;b=replacement;}
    syncQuery(a,b); renderPair(a,b,baseline);
  };
  $('#cityA').addEventListener('change',rerender); $('#cityB').addEventListener('change',rerender);
  $('#swapCities').addEventListener('click',()=>{const av=$('#cityA').value;$('#cityA').value=$('#cityB').value;$('#cityB').value=av;rerender();});

  renderPair(a,b,baseline); renderMix(cities,baseline); renderSignatures(cities,baseline); renderMatrix(cities,baseline);
  $('#footerMeta').textContent=`${cities.length} researched cities · updated ${atlas.researchedAt}. Comparisons describe the current research set.`;
}

init().catch(err=>{
  console.error(err);
  document.body.innerHTML=`<main style="padding:10vw;font-family:sans-serif"><h1>Could not load city comparisons.</h1><pre>${esc(err.message)}</pre></main>`;
});
