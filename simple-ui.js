function simplifyEpisodeDetails(){
  if(document.body.dataset.episodePage!=='episode')return;
  const root=document.querySelector('#episodeDetail');
  const detailSection=[...root.querySelectorAll(':scope > .section')].find(s=>s.querySelector('.episode-grid'));
  const mechanismSection=[...root.querySelectorAll(':scope > .section')].find(s=>s.querySelector('.mechanism-chain'));
  const attack=root.querySelector(':scope > .attack-plan');
  if(!detailSection||!mechanismSection||!attack||root.querySelector('.simple-deep'))return;
  const disclosure=document.createElement('details');
  disclosure.className='simple-secondary simple-deep';
  disclosure.innerHTML='<summary>More details</summary><div class="simple-deep-body"></div>';
  mechanismSection.before(disclosure);
  const body=disclosure.querySelector('.simple-deep-body');
  body.append(mechanismSection,attack,detailSection);
}
window.addEventListener('load',()=>setTimeout(simplifyEpisodeDetails,0));