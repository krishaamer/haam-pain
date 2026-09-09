const $ = s => document.querySelector(s);
const esc = (s='') => String(s).replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#039;','"':'&quot;'}[c]));
const fmtDelta = v => `${v>=0?'+':''}${v.toFixed(1)}`;

async function loadData(){
  const manifest=await fetch('/data/toronto-neighbourhoods-index.json').then(r=>r.json());
  const parts=await Promise.all(manifest.shards.map(s=>fetch(`/data/${s}`).then(r=>r.json())));
  return {meta:manifest.meta,neighbourhoods:parts.flat()};
}

function rankedSignals(data){
  return data.neighbourhoods.flatMap(n=>n.signals.map(s=>({...s,neighbourhood:n}))).filter(s=>s.evidence?.length>=2&&s.confidence>=3.5).sort((a,b)=>b.localScore-a.localScore);
}

function statsHtml(items){return items.map(([v,l])=>`<div class="stat"><strong>${esc(v)}</strong><span>${esc(l)}</span></div>`).join('');}

function renderIndex(data){
  const ranked=rankedSignals(data), cats=[...new Set(ranked.map(s=>s.category))].sort();
  $('#localStats').innerHTML=statsHtml([[data.neighbourhoods.length,'researched neighbourhoods'],[ranked.length,'ranked local signals'],[cats.length,'pain categories'],[ranked[0]?.localScore.toFixed(1)||'—','top local score']]);
  $('#footerMeta').textContent=`${data.meta.geography} / researched ${data.meta.researchedAt}.`;
  const cell=(n,cat)=>{
    const sig=n.signals.filter(s=>s.category===cat&&s.evidence?.length>=2&&s.confidence>=3.5).sort((a,b)=>b.localPain-a.localPain)[0];
    if(!sig)return '<span class="heat-cell empty" title="Insufficient evidence">·</span>';
    const level=Math.max(1,Math.min(5,Math.round(sig.localPain)));
    return `<a class="heat-cell h${level}" href="/canada/toronto/neighbourhoods/${esc(n.slug)}" title="${esc(sig.title)}: local pain ${sig.localPain.toFixed(1)}, over-index ${fmtDelta(sig.overIndex)}">${sig.localPain.toFixed(1)}</a>`;
  };
  $('#localHeatmap').innerHTML=`<div class="heat-row heat-head"><span>Neighbourhood</span>${cats.map(c=>`<span>${esc(c)}</span>`).join('')}</div>${data.neighbourhoods.map(n=>`<div class="heat-row"><a class="heat-name" href="/canada/toronto/neighbourhoods/${esc(n.slug)}">${esc(n.name)}</a>${cats.map(c=>cell(n,c)).join('')}</div>`).join('')}`;
  $('#neighbourhoodGrid').innerHTML=data.neighbourhoods.map(n=>{
    const top=[...n.signals].filter(s=>s.evidence?.length>=2&&s.confidence>=3.5).sort((a,b)=>b.localScore-a.localScore)[0];
    return `<a class="market-card" href="/canada/toronto/neighbourhoods/${esc(n.slug)}"><span class="card-kicker">CITY ID ${n.officialId} · ${esc(n.designation)}</span><h3>${esc(n.name)}</h3><p>${esc(n.summary)}</p><div class="card-meta"><span>${esc(n.archetype)}<br>${top?esc(top.title):'Insufficient evidence'}</span><span class="card-score">${top?top.localScore.toFixed(1):'—'}</span></div></a>`;
  }).join('');
  $('#localLeaders').innerHTML=ranked.slice(0,14).map((s,i)=>`<a class="leader-row" href="/canada/toronto/neighbourhoods/${esc(s.neighbourhood.slug)}"><span class="rank">${String(i+1).padStart(2,'0')}</span><span class="place">${esc(s.neighbourhood.name)}</span><span class="pain-name">${esc(s.title)} <small>· ${fmtDelta(s.overIndex)} vs Toronto</small></span><span class="score">${s.localScore.toFixed(1)}</span></a>`).join('');
}

function renderNeighbourhood(data,slug){
  const n=data.neighbourhoods.find(x=>x.slug===slug); if(!n)throw new Error('Unknown neighbourhood');
  const signals=n.signals.filter(s=>s.evidence?.length>=2&&s.confidence>=3.5).sort((a,b)=>b.localScore-a.localScore);
  document.title=`HAAM Pain - ${n.name}, Toronto`;
  $('#localEyebrow').textContent=`TORONTO / ${n.designation.toUpperCase()}`;
  $('#localTitle').innerHTML=`${esc(n.name)}<br><em>pain map.</em>`;
  $('#localLede').textContent=n.summary;
  $('#localStats').innerHTML=statsHtml([[signals.length,'ranked local signals'],[signals[0]?.localScore.toFixed(1)||'—','top local score'],[signals[0]?fmtDelta(signals[0].overIndex):'—','top pain over-index'],[n.officialId,'Toronto neighbourhood ID']]);
  $('#localWarning').textContent=data.meta.warning;
  $('#footerMeta').textContent=`${n.name} / ${n.archetype}. Research updated ${data.meta.researchedAt}.`;
  $('#localRanking').innerHTML=signals.length?signals.map((s,i)=>`<article class="local-row" tabindex="0" role="button" data-id="${esc(s.id)}"><span class="local-rank">${String(i+1).padStart(2,'0')}</span><div><span class="local-cat">${esc(s.category)}</span><h3>${esc(s.title)}</h3><p>${esc(s.whyHere)}</p></div><div class="local-metrics"><strong>${s.localScore.toFixed(1)}</strong><span>local score</span><b>${fmtDelta(s.overIndex)}</b><span>vs Toronto pain</span><b>${s.geographicConcentration.toFixed(1)}/5</b><span>geo concentration</span></div></article>`).join(''):'<p>Insufficient evidence to rank local signals.</p>';
  $('#localRanking').querySelectorAll('.local-row').forEach(row=>row.addEventListener('click',()=>openSignal(n,signals.find(s=>s.id===row.dataset.id))));
  $('#dialogClose')?.addEventListener('click',()=>$('#localDialog').close());
}

function openSignal(n,s){
  const ev=s.evidence.map(e=>`<li><a href="${esc(e.url)}" target="_blank" rel="noopener noreferrer">${esc(e.title)}</a><small>${esc(e.note||'')}</small></li>`).join('');
  $('#localDetail').innerHTML=`<article class="detail"><span class="detail-kicker">${esc(n.name)} / ${esc(s.category)}</span><h2>${esc(s.title)}</h2><p>${esc(s.whyHere)}</p><div class="detail-scoreline"><div><strong>${s.localScore.toFixed(1)}</strong><span>local score</span></div><div><strong>${s.localPain.toFixed(1)}</strong><span>local pain</span></div><div><strong>${fmtDelta(s.overIndex)}</strong><span>vs Toronto</span></div><div><strong>${s.geographicConcentration.toFixed(1)}</strong><span>geo concentration</span></div><div><strong>${s.confidence.toFixed(1)}/5</strong><span>confidence</span></div></div><div class="detail-block"><h3>Parent city opportunity</h3><p>${esc(s.parentOpportunity)}</p></div><div class="detail-block"><h3>First paid test</h3><p>${esc(s.firstTest)}</p></div><div class="detail-block"><h3>Evidence</h3><ul class="evidence-list">${ev}</ul></div></article>`;
  $('#localDialog').showModal();
}

loadData().then(data=>{
  if(document.body.dataset.page==='neighbourhoods')renderIndex(data);
  else {const slug=location.pathname.split('/').filter(Boolean).pop();renderNeighbourhood(data,slug);}
}).catch(err=>{console.error(err);document.body.innerHTML=`<main style="padding:10vw"><h1>Could not load neighbourhood research.</h1><pre>${esc(err.message)}</pre></main>`;});