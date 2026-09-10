const ECONOMIC_MODEL = (() => {
  const esc = (s='') => String(s).replace(/[&<>'\"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#039;','"':'&quot;'}[c]));
  const waitFor = (selector, timeout=5000) => new Promise((resolve,reject)=>{
    const found=document.querySelector(selector); if(found) return resolve(found);
    const obs=new MutationObserver(()=>{const el=document.querySelector(selector);if(el){obs.disconnect();resolve(el)}});
    obs.observe(document.documentElement,{childList:true,subtree:true});
    setTimeout(()=>{obs.disconnect();reject(new Error(`Timed out waiting for ${selector}`))},timeout);
  });
  async function json(url){const r=await fetch(url);if(!r.ok)throw new Error(`${url}: ${r.status}`);return r.json();}
  const avgRange = r => r && Number.isFinite(Number(r.low)) && Number.isFinite(Number(r.high)) ? (Number(r.low)+Number(r.high))/2 : null;
  const pct = v => `${Math.round(v*100)}%`;
  const money = (v,c='USD') => {
    if(!Number.isFinite(v)) return 'Not modeled';
    const s=c==='CAD'?'C$':c==='GBP'?'£':c==='EUR'?'€':c==='TWD'?'NT$':'$';
    return s+Intl.NumberFormat('en',{notation:'compact',maximumFractionDigits:1}).format(v);
  };
  const moneyExact = (v,c='USD') => {
    if(!Number.isFinite(v)) return '–';
    const s=c==='CAD'?'C$':c==='GBP'?'£':c==='EUR'?'€':c==='TWD'?'NT$':'$';
    return s+Intl.NumberFormat('en',{maximumFractionDigits:0}).format(v);
  };
  const niceStep = v => v>=100000?5000:v>=20000?1000:v>=5000?500:100;

  function parseNumberToken(token){
    const m=String(token).trim().toLowerCase().match(/([0-9]+(?:\.[0-9]+)?)\s*(k|m)?/);
    if(!m)return null;
    const n=Number(m[1]);
    return m[2]==='m'?n*1000000:m[2]==='k'?n*1000:n;
  }
  function priceFromWtp(text=''){
    const t=String(text).replace(/,/g,'').toLowerCase();
    const nums=[...t.matchAll(/([0-9]+(?:\.[0-9]+)?\s*[km]?)/g)].map(m=>parseNumberToken(m[1])).filter(Number.isFinite);
    if(!nums.length)return null;
    let value=nums.length>1?(nums[0]+nums[1])/2:nums[0];
    if(/\/mo\b|per month|monthly/.test(t)) value*=12;
    else if(/\/week\b|per week|weekly/.test(t)) value*=52;
    else if(!(/\/yr\b|per year|annual|yearly/.test(t))) return null;
    return value;
  }
  function exposureFor(e){
    const econ=e.economics||{};
    const hours=Number(econ.annualTimeLostMidHours)||((avgRange(econ.timeLostHours)||0)*(Number(econ.frequencyPerYear)||1));
    const hourly=avgRange(econ.professionalHourlyValue);
    const labor=hours&&hourly?hours*hourly:null;
    const risk=avgRange(econ.moneyAtRisk);
    if(labor&&risk){
      if(labor>=risk)return {value:labor,note:'Uses annual time exposure × modeled hourly value. Existing money-at-risk is not added, avoiding likely double counting.'};
      return {value:risk,note:'Uses the existing modeled money-at-risk range because it exceeds the labor-time proxy. Costs are not added together.'};
    }
    if(labor)return {value:labor,note:'Uses annual time exposure × modeled hourly value.'};
    if(risk)return {value:risk,note:'Uses the existing modeled money-at-risk range as the current annual exposure proxy.'};
    return {value:null,note:'No credible monetary exposure is modeled yet. Add time × value or a money-at-risk range before using the value output.'};
  }
  function calculate(exposure,params){
    const effective=params.addressable*params.success*params.adoption;
    const recoverable=Number.isFinite(exposure)?exposure*effective:null;
    const ratio=Number.isFinite(recoverable)&&params.price>0?recoverable/params.price:null;
    const breakEven=Number.isFinite(exposure)&&exposure>0?params.price/exposure:null;
    return {effective,recoverable,ratio,breakEven};
  }
  function scenarioCard(name,params,exposure,currency){
    const x=calculate(exposure,params);
    return `<button class="econ-scenario" type="button" data-preset="${esc(name.toLowerCase())}"><small>${esc(name)}</small><strong>${money(x.recoverable,currency)}</strong><span>${pct(x.effective)} effective coverage</span></button>`;
  }
  function taskRows(e){
    const work=e.workflow||[];
    if(!work.length)return '<p class="econ-note">No task decomposition recorded yet.</p>';
    return work.map((w,i)=>`<div class="econ-task"><span>${String(i+1).padStart(2,'0')}</span><div><strong>${esc(w.step)}</strong><small>${esc(w.owner||'')}</small></div><p>${esc(w.friction||'')}</p></div>`).join('');
  }

  async function loadEpisode(id){
    const idx=await json('/data/episodes-index.json');
    const file=idx.files.find(f=>f.endsWith(`/${id}.json`))||idx.files.find(f=>f.endsWith(`${id}.json`));
    if(!file)throw new Error('No episode data file for this route');
    return json('/data/'+file);
  }

  async function initEpisode(){
    if(document.body.dataset.episodePage!=='episode')return;
    const hero=await waitFor('.episode-detail-hero');
    const id=location.pathname.split('/').filter(Boolean).pop();
    const [e,config]=await Promise.all([loadEpisode(id),json('/data/economic-model.json')]);
    const econ=e.economics||{},currency=econ.currency||'USD';
    const exposure=exposureFor(e);
    const wtpPrice=priceFromWtp(e.buyer?.wtp||'');
    const fallbackPrice=Number.isFinite(exposure.value)?exposure.value*Number(config.defaultPriceShareOfExposure||.1):1000;
    const startPrice=Math.max(niceStep(fallbackPrice),wtpPrice||fallbackPrice);
    const state={...config.presets.base,price:startPrice,preset:'base'};
    const maxPrice=Math.max(1000,Math.round((exposure.value||startPrice*10)*.5/niceStep(exposure.value||startPrice*10))*niceStep(exposure.value||startPrice*10));
    const section=document.createElement('section');section.className='economic-model';
    section.innerHTML=`
      <div class="econ-head">
        <div><small>SCENARIO, NOT PREDICTION</small><h2>What could this be worth?</h2><p>Change a few assumptions. The model shows how much of today's pain could realistically become recoverable value.</p></div>
        <div class="econ-basis"><small>Pain exposure proxy</small><strong>${money(exposure.value,currency)}/yr</strong><span>${esc(exposure.note)}</span></div>
      </div>
      <div class="econ-output" aria-live="polite">
        <article><small>Effective pain coverage</small><strong id="econCoverage">–</strong><p>addressable × success × actual use</p></article>
        <article><small>Recoverable value</small><strong id="econRecoverable">–</strong><p>customer-level annual value</p></article>
        <article><small>Assumed annual price</small><strong id="econPriceOutput">–</strong><p>${wtpPrice?'from current WTP hypothesis':'10% value placeholder'}</p></article>
        <article><small>Value / price</small><strong id="econRatio">–</strong><p>before implementation costs</p></article>
      </div>
      <div class="econ-thesis" id="econThesis"></div>
      <details class="econ-controls-wrap">
        <summary>Change assumptions</summary>
        <div class="econ-scenarios">
          ${scenarioCard('Conservative',{...config.presets.conservative,price:startPrice},exposure.value,currency)}
          ${scenarioCard('Base',{...config.presets.base,price:startPrice},exposure.value,currency)}
          ${scenarioCard('Upside',{...config.presets.upside,price:startPrice},exposure.value,currency)}
        </div>
        <div class="econ-controls">
          <label><span>Addressable workflow <b id="addressableVal"></b></span><input id="addressable" type="range" min="0" max="100" step="5"></label>
          <label><span>Intervention success <b id="successVal"></b></span><input id="success" type="range" min="0" max="100" step="5"></label>
          <label><span>Workflow adoption <b id="adoptionVal"></b></span><input id="adoption" type="range" min="0" max="100" step="5"></label>
          <label><span>Assumed annual price <b id="priceVal"></b></span><input id="price" type="range" min="0" max="${maxPrice}" step="${niceStep(exposure.value||startPrice*10)}"></label>
        </div>
        <div class="econ-tasks">
          <div class="econ-subhead"><div><small>TASK MODEL</small><h3>Where the pain actually happens</h3></div><p>Current v1 treats workflow steps as an equal-weight proxy because per-step time has not yet been measured. Replace this with observed task time as field evidence arrives.</p></div>
          <div class="econ-task-list">${taskRows(e)}</div>
        </div>
        <div class="econ-formula"><code>effective coverage = addressable workflow × intervention success × workflow adoption</code><code>recoverable value = pain exposure × effective coverage</code></div>
      </details>`;
    const anchor=document.querySelector('.episode-simple-story')||document.querySelector('.simple-story')||hero;
    anchor.insertAdjacentElement('afterend',section);
    document.querySelector('.episode-scoreboard')?.classList.add('econ-demoted');

    const controls={addressable:section.querySelector('#addressable'),success:section.querySelector('#success'),adoption:section.querySelector('#adoption'),price:section.querySelector('#price')};
    const setInputs=()=>{
      controls.addressable.value=Math.round(state.addressable*100);
      controls.success.value=Math.round(state.success*100);
      controls.adoption.value=Math.round(state.adoption*100);
      controls.price.value=Math.min(maxPrice,Math.round(state.price));
    };
    const update=()=>{
      const x=calculate(exposure.value,state);
      section.querySelector('#econCoverage').textContent=pct(x.effective);
      section.querySelector('#econRecoverable').textContent=money(x.recoverable,currency)+'/yr';
      section.querySelector('#econPriceOutput').textContent=money(state.price,currency)+'/yr';
      section.querySelector('#econRatio').textContent=Number.isFinite(x.ratio)?`${x.ratio.toFixed(1)}×`:'–';
      section.querySelector('#addressableVal').textContent=pct(state.addressable);
      section.querySelector('#successVal').textContent=pct(state.success);
      section.querySelector('#adoptionVal').textContent=pct(state.adoption);
      section.querySelector('#priceVal').textContent=moneyExact(state.price,currency);
      const hurdle=Number(config.valueHurdleMultiple||3);
      const hurdleCoverage=Number.isFinite(exposure.value)&&exposure.value>0?(state.price*hurdle)/exposure.value:null;
      let thesis='Add credible economic exposure before using this model.';
      if(Number.isFinite(x.breakEven)){
        const breakText=x.breakEven>1?'more than 100% effective coverage, so the current price cannot break even':'at least '+pct(x.breakEven)+' effective coverage to break even';
        const hurdleText=hurdleCoverage>1?`The ${hurdle}× customer-value hurdle is impossible at this price under the current exposure proxy.`:`A ${hurdle}× customer-value hurdle needs ${pct(hurdleCoverage)} effective coverage.`;
        const baseText=`Current assumptions imply ${pct(x.effective)} and ${Number.isFinite(x.ratio)?x.ratio.toFixed(1)+'× value-to-price':'no value-to-price result'}.`;
        thesis=`At ${moneyExact(state.price,currency)}/yr, this needs ${breakText}. ${hurdleText} ${baseText}`;
      }
      section.querySelector('#econThesis').innerHTML=`<small>WHAT MUST BE TRUE</small><strong>${esc(thesis)}</strong>`;
      section.querySelectorAll('.econ-scenario').forEach(b=>b.classList.toggle('active',b.dataset.preset===state.preset));
    };
    setInputs();update();
    ['addressable','success','adoption'].forEach(k=>controls[k].addEventListener('input',()=>{state[k]=Number(controls[k].value)/100;state.preset='custom';update()}));
    controls.price.addEventListener('input',()=>{state.price=Number(controls.price.value);state.preset='custom';update()});
    section.querySelectorAll('.econ-scenario').forEach(btn=>btn.addEventListener('click',()=>{
      const key=btn.dataset.preset;Object.assign(state,config.presets[key]);state.preset=key;setInputs();update();
    }));
  }
  return {init:initEpisode};
})();
window.addEventListener('DOMContentLoaded',()=>ECONOMIC_MODEL.init().catch(err=>console.warn('Economic model skipped:',err)));
