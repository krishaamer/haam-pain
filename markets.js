const WEIGHT_LABELS = {pain:'Pain',economics:'Economics',founderFit:'Founder fit',distribution:'Distribution',insightGap:'Insight gap',solutionLeverage:'Leverage',market:'Market',validation:'Validation'};
const $ = s => document.querySelector(s);
const esc = (s='') => String(s).replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#039;','"':'&quot;'}[c]));

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

async function loadAtlas() {
  const text = await fetch('/data/markets.json').then(r => { if(!r.ok) throw new Error(`Market data ${r.status}`); return r.text(); });
  return parseLooseJson(text);
}

function scoreOpportunity(o, weights) {
  const base = Object.entries(weights).reduce((sum,[key,w]) => sum + ((o.dimensions?.[key] || 0) / 5 * w), 0);
  const score = base - (o.riskPenalty || 0);
  const priority = score * (.85 + .03 * (o.confidence || 3));
  return {...o, baseScore:base, score, priorityScore:priority};
}

function cityStats(city, atlas) {
  if (!city.opportunities) return {count:city.opportunityCount || 0, topTitle:city.topOpportunity || 'Research in progress', topScore:city.topScore || 0, opportunities:[]};
  const ops = city.opportunities.map(o => scoreOpportunity(o, atlas.weights)).sort((a,b)=>b.priorityScore-a.priorityScore);
  return {count:ops.length, topTitle:ops[0]?.title || 'Research in progress', topScore:ops[0]?.priorityScore || 0, opportunities:ops};
}

function allCities(atlas) {
  return atlas.countries.flatMap(country => country.cities.map(city => ({...city, countryName:country.name, countrySlug:country.slug, stats:cityStats(city, atlas)})));
}

function statHtml(items) {
  return items.map(([value,label])=>`<div class="stat"><strong>${esc(value)}</strong><span>${esc(label)}</span></div>`).join('');
}

function cityCard(city, atlas) {
  const s = cityStats(city, atlas);
  return `<a class="market-card" href="${esc(city.path)}">
    <span class="card-kicker">${esc(city.market)}</span>
    <h3>${esc(city.name)}</h3>
    <p>${esc(city.summary)}</p>
    <div class="card-meta"><span>${s.count} ranked opportunities<br>${esc(s.topTitle)}</span><span class="card-score">${s.topScore.toFixed(1)}</span></div>
  </a>`;
}

function renderGlobal(atlas) {
  const cities = allCities(atlas);
  const total = cities.reduce((sum,c)=>sum+c.stats.count,0);
  document.title = 'HAAM Pain - market atlas';
  $('#geoEyebrow').textContent = `MARKET ATLAS / ${atlas.researchedAt}`;
  $('#geoTitle').innerHTML = 'Where does it<br><em>hurt most?</em>';
  $('#geoLede').textContent = 'The same scoring system applied city by city. Country pages summarize only places we have actually researched, not an entire nation by extrapolation.';
  $('#geoStats').innerHTML = statHtml([[atlas.countries.length,'countries'],[cities.length,'cities'],[total,'ranked opportunities'],['1 system','comparable scores']]);
  $('#geoContent').innerHTML = atlas.countries.map(country => `<section class="country-group">
    <div class="country-title"><div><p class="eyebrow">${country.cities.length} RESEARCHED ${country.cities.length===1?'CITY':'CITIES'}</p><h2>${esc(country.name)}</h2></div><p>${esc(country.summary)} <a href="/${esc(country.slug)}/">Country page →</a></p></div>
    <div class="market-grid">${country.cities.map(c=>cityCard(c,atlas)).join('')}</div>
  </section>`).join('');
  const leaders = [...cities].sort((a,b)=>b.stats.topScore-a.stats.topScore);
  $('#leaderboard').innerHTML = leaders.map((c,i)=>`<a class="leader-row" href="${esc(c.path)}"><span class="rank">${String(i+1).padStart(2,'0')}</span><span class="place">${esc(c.name)} <small>· ${esc(c.countryName)}</small></span><span class="pain-name">${esc(c.stats.topTitle)}</span><span class="score">${c.stats.topScore.toFixed(1)}</span></a>`).join('');
}

function renderCountry(atlas, countrySlug) {
  const country = atlas.countries.find(c=>c.slug===countrySlug);
  if (!country) throw new Error('Unknown country');
  const cities = country.cities.map(city=>({...city,stats:cityStats(city,atlas)}));
  const total = cities.reduce((sum,c)=>sum+c.stats.count,0);
  document.title = `HAAM Pain - ${country.name}`;
  $('#geoEyebrow').textContent = `${country.name.toUpperCase()} / RESEARCHED CITIES`;
  $('#geoTitle').innerHTML = `${esc(country.name)}<br><em>pain map.</em>`;
  $('#geoLede').textContent = country.summary;
  $('#geoStats').innerHTML = statHtml([[cities.length,'researched cities'],[total,'ranked opportunities'],[Math.max(...cities.map(c=>c.stats.topScore)).toFixed(1),'highest priority'],[atlas.researchedAt,'research date']]);
  $('#geoContent').innerHTML = `<section class="country-group"><div class="country-title"><div><p class="eyebrow">CITY PAGES</p><h2>Research</h2></div><p>These are city-level samples. We do not treat them as nationally representative.</p></div><div class="market-grid">${country.cities.map(c=>cityCard(c,atlas)).join('')}</div></section>`;
  const opps = cities.flatMap(c=>c.stats.opportunities.map(o=>({...o,city:c}))).sort((a,b)=>b.priorityScore-a.priorityScore).slice(0,12);
  if (opps.length) $('#leaderboard').innerHTML = opps.map((o,i)=>`<a class="leader-row" href="${esc(o.city.path)}"><span class="rank">${String(i+1).padStart(2,'0')}</span><span class="place">${esc(o.city.name)}</span><span class="pain-name">${esc(o.title)}</span><span class="score">${o.priorityScore.toFixed(1)}</span></a>`).join('');
  else $('#leaderboard').innerHTML = cities.map((c,i)=>`<a class="leader-row" href="${esc(c.path)}"><span class="rank">${String(i+1).padStart(2,'0')}</span><span class="place">${esc(c.name)}</span><span class="pain-name">${esc(c.stats.topTitle)}</span><span class="score">${c.stats.topScore.toFixed(1)}</span></a>`).join('');
}

async function init() {
  const atlas = await loadAtlas();
  const parts = location.pathname.split('/').filter(Boolean);
  if (document.body.dataset.page === 'markets') renderGlobal(atlas);
  else renderCountry(atlas, parts[0]);
  $('#footerMeta').textContent = `Research updated ${atlas.researchedAt}. Scores are hypotheses, not market forecasts.`;
}

init().catch(err => {
  console.error(err);
  $('#geoContent').innerHTML = `<p class="geo-note">Could not load market research: ${esc(err.message)}</p>`;
});
