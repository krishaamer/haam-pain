const STORY = (() => {
  const esc = (s='') => String(s).replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt',"'":'&#039;','"':'&quot;'}[c]));
  const waitFor = (selector, timeout=4000) => new Promise((resolve,reject)=>{
    const found=document.querySelector(selector); if(found) return resolve(found);
    const obs=new MutationObserver(()=>{const el=document.querySelector(selector);if(el){obs.disconnect();resolve(el)}});obs.observe(document.documentElement,{childList:true,subtree:true});
    setTimeout(()=>{obs.disconnect();reject(new Error(`Timed out waiting for ${selector}`))},timeout);
  });
  const parseLooseJson = text => {
    let out='', inString=false, escaped=false;
    for(const c of text){
      if(inString){if(escaped)escaped=false;else if(c==='\\')escaped=true;else if(c==='"')inString=false;else if(c==='\n'||c==='\r'){out+=c==='\n'?'\\n':'';continue;}}
      else if(c==='"')inString=true;
      out+=c;
    }
    return JSON.parse(out);
  };
  const loadJson = async url => {const r=await fetch(url);if(!r.ok) throw new Error(`${url}: ${r.status}`);return parseLooseJson(await r.text())};
  const money=(v,c='USD')=>{if(v==null)return'Not modeled';const s=c==='CAD'?'C$':c==='GBP'?'£':c==='EUR'?'€':c==='TWD'?'NT$':'$';return s+Intl.NumberFormat('en',{notation:'compact',maximumFractionDigits:1}).format(v)};
  const moneyRange=(r,c='USD')=>r?`${money(r.low,c)} - ${money(r.high,c)}`:'Not modeled';
  const card=(label,title,text,score='',href='')=>{
    const inner=`<small>${esc(label)}</small><h3>${esc(title||'')}</h3>${text?`<p>${esc(text)}</p>`:''}${score?`<div class="simple-score">${esc(score)}</div>`:''}`;
    return href?`<a class="simple-insight" href="${esc(href)}">${inner}</a>`:`<article class="simple-insight">${inner}</article>`;
  };
  const cards=(items)=>`<div class="simple-insights">${items.join('')}</div>`;

  async function loadCityOpportunityById(id){
    const parts=location.pathname.split('/').filter(Boolean),citySlug=parts.length>=2?parts[1]:'toronto',countrySlug=parts.length>=2?parts[0]:'canada';
    if(citySlug==='toronto' || location.pathname==='/'){
      const manifest=await loadJson('/data/index.json');
      const chunks=await Promise.all(manifest.shards.map(s=>loadJson('/data/'+s)));
      return chunks.flat().find(o=>o.id===id);
    }
    const atlas=await loadJson('/data/markets.json');
    const country=atlas.countries.find(c=>c.slug===countrySlug);const city=country?.cities.find(c=>c.slug===citySlug);
    return city?.opportunities?.find(o=>o.id===id);
  }

  async function enhanceCity(){
    const top=await waitFor('#topPick');
    const button=top.querySelector('[data-id]'); if(!button) return;
    const o=await loadCityOpportunityById(button.dataset.id); if(!o) return;
    const wrap=document.createElement('section');wrap.className='simple-story';
    wrap.innerHTML=`<div class="simple-story-head"><strong>Why this is interesting</strong><span>Start here</span></div>${cards([
      card('Problem',o.painMoment||o.title,`Buyer: ${o.buyer||'identified buyer'}`),
      card('Insight',o.wedge||o.title,o.currentWorkaround?`Today: ${o.currentWorkaround}`:(o.whyNow||'')),
      card('Test',o.firstPaidTest||o.firstTest||'Run a paid manual test',o.priceHypothesis||'Validate willingness to pay')
    ])}`;
    top.insertAdjacentElement('afterend',wrap);
  }

  async function loadIndustryOpportunity(slug,id){
    const manifest=await loadJson('/data/industries-index.json');
    const shards=await Promise.all(manifest.shards.map(s=>loadJson('/data/'+s)));
    return shards.flat().find(x=>x.slug===slug)?.opportunities?.find(o=>o.id===id);
  }

  async function enhanceIndustry(){
    const ranking=await waitFor('#industryRanking, #intersectionRanking');
    const first=ranking.querySelector('[data-id]'); if(!first) return;
    const p=location.pathname.split('/').filter(Boolean);const slug=p[0]==='industries'?p[1]:p[3];
    const o=await loadIndustryOpportunity(slug,first.dataset.id); if(!o) return;
    const isIntersection=document.body.dataset.page==='industry-city';
    const wrap=document.createElement('section');wrap.className='simple-story';
    wrap.innerHTML=`<div class="simple-story-head"><strong>${isIntersection?'Best local hypothesis':'Best current insight'}</strong><span>${isIntersection?'Needs local proof':'Direct industry research'}</span></div>${cards([
      card('Problem',o.painMoment||o.title,`Pain ${o.dimensions?.pain||'–'}/5 · frequency ${o.dimensions?.frequency||'–'}/5`),
      card('Insight',o.wedge||o.title,`Economic leverage ${o.dimensions?.economicLeverage||'–'}/5 · buyer: ${o.buyer||'identified buyer'}`),
      card('Test',o.firstTest||'Run a workflow-level test',isIntersection?'Collect local artifacts before treating this as city-specific evidence.':(o.priceHypothesis||'Measure whether the intervention changes cost, time, or quality.'))
    ])}`;
    const anchor=document.querySelector('.composite-warning')||document.querySelector('.industry-hero');anchor.insertAdjacentElement('afterend',wrap);
  }

  async function loadEpisodes(){
    const idx=await loadJson('/data/episodes-index.json');const eps=await Promise.all(idx.files.map(f=>loadJson('/data/'+f)));return{idx,eps};
  }

  async function enhanceEpisodeList(){
    await waitFor('#episodeList');const {idx,eps}=await loadEpisodes();
    const top=[...eps].sort((a,b)=>(b.scores?.actionability||0)-(a.scores?.actionability||0)).slice(0,3);
    const wrap=document.createElement('section');wrap.className='simple-story';
    wrap.innerHTML=`<div class="simple-story-head"><strong>Three worth opening</strong><span>Highest actionability</span></div>${cards(top.map(e=>card(idx.archetypes[e.archetype]?.title||e.industry,e.title,e.trigger,`${e.scores?.actionability} action · ${e.scores?.informationGain} learning`,`/episodes/${e.id}`)))}`;
    document.querySelector('.episode-hero').insertAdjacentElement('afterend',wrap);
  }

  async function enhanceEpisodeDetail(){
    const hero=await waitFor('.episode-detail-hero');
    const id=location.pathname.split('/').filter(Boolean).pop();const {idx,eps}=await loadEpisodes();const e=eps.find(x=>x.id===id);if(!e)return;
    const econ=e.economics||{},cur=econ.currency||'USD';
    const wrap=document.createElement('section');wrap.className='simple-story episode-simple-story';
    wrap.innerHTML=`<div class="simple-story-head"><strong>The useful version</strong><span>${e.scores?.actionability} actionability</span></div>${cards([
      card('Problem',e.surfaceComplaint,`${e.actor?.role} · trigger: ${e.trigger}`),
      card('Insight',e.mechanism,`${idx.archetypes[e.archetype]?.title||e.archetype} · exposure: ${moneyRange(econ.moneyAtRisk,cur)}`),
      card('Test',e.intervention?.offer,`${e.intervention?.price||''} · success: ${e.experiment?.success||''}`)
    ])}`;
    hero.insertAdjacentElement('afterend',wrap);

    const related=eps.filter(x=>x.id!==e.id&&(x.archetype===e.archetype||x.industry===e.industry)).sort((a,b)=>(b.scores?.actionability||0)-(a.scores?.actionability||0)).slice(0,3);
    if(related.length){const section=document.createElement('section');section.className='section simple-related';section.innerHTML=`<div class="section-head"><div><p class="eyebrow">SIMILAR PATTERN</p><h2>See this elsewhere</h2></div></div>${cards(related.map(r=>card(r.geography?.city||r.industry,r.title,r.mechanism,`${r.scores?.actionability} action`,`/episodes/${r.id}`)))}`;document.querySelector('#episodeDetail').append(section)}
  }

  async function enhanceExperiments(){
    await waitFor('#experimentList');const {idx,eps}=await loadEpisodes();const top=[...eps].sort((a,b)=>(b.scores?.informationGain||0)-(a.scores?.informationGain||0))[0];
    const wrap=document.createElement('section');wrap.className='simple-story';
    wrap.innerHTML=`<div class="simple-story-head"><strong>Best next experiment</strong><span>${top.scores?.informationGain} learning value</span></div>${cards([
      card('Question',idx.archetypes[top.archetype]?.diagnosticQuestion||top.mechanism,`Current hypothesis: ${top.mechanism}`),
      card('Test',top.intervention?.offer,`${top.experiment?.artifactRequest} · ${top.experiment?.sample}`),
      card('Decision',`Success: ${top.experiment?.success}`,`Kill if: ${top.experiment?.kill}`)
    ])}`;
    document.querySelector('.episode-hero').insertAdjacentElement('afterend',wrap);
  }

  async function init(){
    try{
      const p=location.pathname.replace(/\/$/,'')||'/';
      document.querySelectorAll('.story-panel,.episode-storyline,.industry-story,.episode-story-wrap').forEach(x=>x.remove());
      if(document.body.dataset.episodePage==='episode') return enhanceEpisodeDetail();
      if(document.body.dataset.episodePage==='episodes') return enhanceEpisodeList();
      if(document.body.dataset.episodePage==='experiments') return enhanceExperiments();
      if(document.body.dataset.page==='industry'||document.body.dataset.page==='industry-city') return enhanceIndustry();
      if(document.querySelector('#topPick') && (p==='/' || p.split('/').filter(Boolean).length===2)) return enhanceCity();
    }catch(err){console.warn('Simple insight enhancement skipped:',err)}
  }
  return {init};
})();
window.addEventListener('DOMContentLoaded',()=>STORY.init());