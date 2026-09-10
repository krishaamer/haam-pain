const STORY = (() => {
  const esc = (s='') => String(s).replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#039;','"':'&quot;'}[c]));
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
  const money=(v,c='USD')=>{if(v==null)return'–';const s=c==='CAD'?'C$':c==='GBP'?'£':c==='EUR'?'€':c==='TWD'?'NT$':'$';return s+Intl.NumberFormat('en',{notation:'compact',maximumFractionDigits:1}).format(v)};
  const moneyRange=(r,c='USD')=>r?`${money(r.low,c)}–${money(r.high,c)}`:'Not modeled';
  const spine=(steps, cls='')=>`<div class="story-spine ${cls}">${steps.map((s,i)=>`<div class="story-node ${s.kind||''}"><div class="story-step"><b>${i+1}</b>${esc(s.label)}</div><strong>${esc(s.title||'')}</strong>${s.text?`<p>${esc(s.text)}</p>`:''}</div>`).join('')}</div>`;
  const panel=(title,meta,body,summary='')=>`<section class="story-panel"><div class="story-panel-head"><strong>${esc(title)}</strong><span>${esc(meta)}</span></div>${body}${summary}</section>`;
  const summary=(leftLabel,left,rightLabel,right)=>`<div class="story-summary"><div><small>${esc(leftLabel)}</small><strong>${esc(left)}</strong></div><div><small>${esc(rightLabel)}</small><p>${esc(right)}</p></div></div>`;

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
    const story=spine([
      {label:'Pain moment',title:o.painMoment||o.title,text:o.currentWorkaround?`Current response: ${o.currentWorkaround}`:'',kind:'trigger'},
      {label:'Why it persists',title:o.currentWorkaround||'Existing solution is fragmented',text:o.whyNow||'',kind:'mechanism'},
      {label:'Commercial wedge',title:o.wedge||o.title,text:`Buyer: ${o.buyer||'identified buyer'} · ${o.priceHypothesis||'price to validate'}`,kind:'economics'},
      {label:'First test',title:o.firstPaidTest||o.firstTest||'Run a paid manual test',text:'Evidence should move from desk research to paid behavior.',kind:'action'}
    ]);
    const el=document.createElement('div'); el.className='episode-story-wrap';
    el.innerHTML=panel('Why this opportunity leads',`${o.category||'Opportunity'} · causal read`,story,summary('Decision','Does the buyer pay for the wedge?','If yes','Deepen into an intervention-ready pain episode.'));
    top.insertAdjacentElement('afterend',el);
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
    const story=spine([
      {label:'Work breaks here',title:o.painMoment||o.title,text:`Pain ${o.dimensions?.pain?.toFixed?.(1)||o.dimensions?.pain||'–'}/5 · frequency ${o.dimensions?.frequency?.toFixed?.(1)||o.dimensions?.frequency||'–'}/5`,kind:'trigger'},
      {label:'Economic mechanism',title:`Failure cost ${o.dimensions?.failureCost||'–'}/5`,text:`Economic leverage ${o.dimensions?.economicLeverage||'–'}/5. ${o.riskNotes?.[0]||''}`,kind:'mechanism'},
      {label:'Buyer + offer',title:o.buyer||'Budget owner',text:`${o.wedge||''} ${o.priceHypothesis?`· ${o.priceHypothesis}`:''}`,kind:'economics'},
      {label:'Evidence to collect',title:o.firstTest||'Run a workflow-level test',text:isIntersection?'Validate the city-specific adjustment with local artifacts before treating it as local evidence.':'Measure whether the intervention changes cycle time, cost, or quality.',kind:'action'}
    ]);
    const el=document.createElement('div');el.className='industry-story';
    el.innerHTML=panel(isIntersection?'How this intersection could work':'Sector story',isIntersection?'direct industry evidence → local validation':'pain → leverage → buyer → test',story);
    const anchor=document.querySelector('.composite-warning')||document.querySelector('.industry-hero');anchor.insertAdjacentElement('afterend',el);
  }

  async function loadEpisodes(){
    const idx=await loadJson('/data/episodes-index.json');const eps=await Promise.all(idx.files.map(f=>loadJson('/data/'+f)));return{idx,eps};
  }

  async function enhanceEpisodeList(){
    const list=await waitFor('#episodeList');const {idx,eps}=await loadEpisodes();
    const top=[...eps].sort((a,b)=>(b.scores?.actionability||0)-(a.scores?.actionability||0))[0];
    const story=spine([
      {label:'Trigger',title:top.trigger,text:`Actor: ${top.actor?.role}`,kind:'trigger'},
      {label:'Hidden mechanism',title:top.mechanism,text:`Archetype: ${idx.archetypes[top.archetype]?.title||top.archetype}`,kind:'mechanism'},
      {label:'Economic exposure',title:moneyRange(top.economics?.moneyAtRisk,top.economics?.currency),text:`Buyer: ${top.buyer?.role} · ${top.buyer?.wtp}`,kind:'economics'},
      {label:'Next experiment',title:top.intervention?.offer,text:top.experiment?.success,kind:'action'}
    ]);
    const el=document.createElement('div');el.className='episode-story-wrap';el.innerHTML=panel('Current strongest story',`${top.scores?.actionability} action · ${top.scores?.informationGain} info gain`,story,summary('Research question',idx.archetypes[top.archetype]?.diagnosticQuestion||top.mechanism,'Decision rule',`Success: ${top.experiment?.success} Kill: ${top.experiment?.kill}`));
    document.querySelector('.episode-hero').insertAdjacentElement('afterend',el);
    list.querySelectorAll('.episode-row').forEach(row=>{const id=row.getAttribute('href')?.split('/').pop();const e=eps.find(x=>x.id===id);if(!e)return;const title=row.querySelector('h3');if(title&&!row.querySelector('.story-tag')) title.insertAdjacentHTML('afterend',`<span class="story-tag">${esc(idx.archetypes[e.archetype]?.title||e.archetype)}</span>`)});
  }

  async function enhanceEpisodeDetail(){
    const hero=await waitFor('.episode-detail-hero');
    const id=location.pathname.split('/').filter(Boolean).pop();const {idx,eps}=await loadEpisodes();const e=eps.find(x=>x.id===id);if(!e)return;
    const econ=e.economics||{},cur=econ.currency||'USD';
    const story=spine([
      {label:'Trigger',title:e.trigger,text:`${e.actor?.role} is trying to ${e.job?.toLowerCase?.()||e.job}`,kind:'trigger'},
      {label:'What they feel',title:e.surfaceComplaint,text:`They often attribute it to: ${e.believedCause}`,kind:'risk'},
      {label:'What we think is happening',title:e.mechanism,text:idx.archetypes[e.archetype]?.title||e.archetype,kind:'mechanism'},
      {label:'Why it matters',title:moneyRange(econ.moneyAtRisk,cur),text:`${econ.annualTimeLostMidHours?`${econ.annualTimeLostMidHours}h annual time exposure · `:''}${e.buyer?.roiLogic||''}`,kind:'economics'},
      {label:'What to test',title:e.intervention?.offer,text:`${e.intervention?.price||''} · success: ${e.experiment?.success||''}`,kind:'action'}
    ],'five');
    const el=document.createElement('div');el.className='episode-storyline';el.innerHTML=panel('Causal story',`${idx.archetypes[e.archetype]?.title||e.archetype} · ${e.scores?.actionability} action`,story,`<div class="episode-bridge"><span>Common explanation</span><b>${esc(e.believedCause)}</b><i>→</i><span>Research hypothesis</span><b>${esc(e.mechanism)}</b></div>`);
    hero.insertAdjacentElement('afterend',el);

    const actorBlock=[...document.querySelectorAll('.episode-block')].find(x=>x.querySelector('.eyebrow')?.textContent.includes('ACTORS'));
    if(actorBlock){actorBlock.querySelector('ul')?.remove();actorBlock.insertAdjacentHTML('beforeend',`<div class="actor-network">${(e.actors||[]).map(a=>`<div class="actor-card"><strong>${esc(a.role)}</strong><span>${esc(a.incentive)}</span><small>Power: ${esc(a.power)}</small></div>`).join('')}</div>`)}
    const claimBlock=[...document.querySelectorAll('.episode-block')].find(x=>x.querySelector('.eyebrow')?.textContent.includes('CLAIM'));
    if(claimBlock&&!claimBlock.querySelector('.evidence-legend')) claimBlock.querySelector('.eyebrow')?.insertAdjacentHTML('afterend','<div class="evidence-legend"><span class="status measured">measured</span><span class="status reported">reported</span><span class="status inferred">inferred</span><span class="status hypothesized">hypothesized</span></div>');

    const related=eps.filter(x=>x.id!==e.id&&(x.archetype===e.archetype||x.industry===e.industry)).sort((a,b)=>(b.scores?.actionability||0)-(a.scores?.actionability||0)).slice(0,4);
    if(related.length){const section=document.createElement('section');section.className='section story-section';section.innerHTML=`<div class="section-head"><div><p class="eyebrow">CONNECTIONS</p><h2>Same mechanism, other contexts</h2></div><p class="section-note">Use these as counterfactuals. What stays invariant, and what changes with industry or geography?</p></div><div class="archetype-episode-grid">${related.map(r=>`<a href="/episodes/${esc(r.id)}"><span class="episode-kicker">${esc(r.geography?.city||'Cross-market')} · ${esc(r.industry)}</span><h3>${esc(r.title)}</h3><p>${esc(r.mechanism)}</p><strong>${r.scores?.actionability} action · ${r.scores?.informationGain} info</strong></a>`).join('')}</div>`;document.querySelector('#episodeDetail').append(section)}
  }

  async function enhanceExperiments(){
    const list=await waitFor('#experimentList');const {idx,eps}=await loadEpisodes();const top=[...eps].sort((a,b)=>(b.scores?.informationGain||0)-(a.scores?.informationGain||0))[0];
    const body=spine([
      {label:'Uncertainty',title:top.mechanism,text:idx.archetypes[top.archetype]?.diagnosticQuestion||'',kind:'mechanism'},
      {label:'Evidence needed',title:top.experiment?.artifactRequest,text:`Sample: ${top.experiment?.sample}`,kind:'trigger'},
      {label:'Intervention',title:top.intervention?.offer,text:top.intervention?.price,kind:'economics'},
      {label:'Decision rule',title:`Success: ${top.experiment?.success}`,text:`Kill: ${top.experiment?.kill}`,kind:'action'}
    ]);
    const el=document.createElement('div');el.className='episode-story-wrap';el.innerHTML=panel('Highest-value next learning',`${top.scores?.informationGain} information gain`,body);
    document.querySelector('.episode-hero').insertAdjacentElement('afterend',el);
    list.classList.add('story-section');
  }

  async function init(){
    try{
      const p=location.pathname.replace(/\/$/,'')||'/';
      if(document.body.dataset.episodePage==='episode') return enhanceEpisodeDetail();
      if(document.body.dataset.episodePage==='episodes') return enhanceEpisodeList();
      if(document.body.dataset.episodePage==='experiments') return enhanceExperiments();
      if(document.body.dataset.page==='industry'||document.body.dataset.page==='industry-city') return enhanceIndustry();
      if(document.querySelector('#topPick') && (p==='/' || p.split('/').filter(Boolean).length===2)) return enhanceCity();
    }catch(err){console.warn('Story enhancement skipped:',err)}
  }
  return {init};
})();
window.addEventListener('DOMContentLoaded',()=>STORY.init());