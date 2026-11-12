/* Recall reusable pattern recall with local-first persistence and cloud-compatible records. */
(()=>{'use strict';
const KEY='recall-concept-reviews-v1',STATUS='recall-concept-save-status';
const today=()=>new Date().toISOString().slice(0,10);
function days(n){const d=new Date();d.setDate(d.getDate()+n);return d.toISOString().slice(0,10)}
function read(){try{const data=JSON.parse(localStorage.getItem(KEY)||'[]');return Array.isArray(data)?data.filter(x=>x&&typeof x.id==='string'):[]}catch{return []}}
let entries=read(),lastError='';
const find=id=>entries.find(x=>x.id===id);
function notify(message){lastError=message;const box=document.getElementById(STATUS);if(box)box.textContent=message}
function broadcast(){window.dispatchEvent(new CustomEvent('recall-cloud-local',{detail:{kind:'concepts',items:entries}}))}
function persist(){try{localStorage.setItem(KEY,JSON.stringify(entries));notify('✓ Pattern reviews saved on this device');broadcast();return true}catch(e){notify('⚠ Pattern review save failed. Export a backup before leaving.');return false}}
function status(id){
 const record=find(id);
 if(!record)return 'Not reviewed yet';
 const count=(record.history||[]).length;
 return (record.rating==='confident'?'✓ Remembered':'↻ Needs practice')+' · '+count+' review'+(count===1?'':'s')+' · '+(record.nextReview>today()?'Next '+record.nextReview:'Ready today');
}
function ready(id){const record=find(id);return !record||!record.nextReview||record.nextReview<=today()}
function refresh(){
 for(const root of document.querySelectorAll('[data-concept-id]')){
  const target=root.querySelector('[data-concept-status]');
  if(target)target.textContent=status(root.dataset.conceptId);
 }
 const summary=document.getElementById('conceptReadySummary');
 if(summary){const ids=[...document.querySelectorAll('[data-concept-id]')].map(x=>x.dataset.conceptId);const readyCount=ids.filter(ready).length;summary.textContent=readyCount+' of '+ids.length+' patterns ready to practice'}
}
function review(id,rating){
 if(typeof id!=='string'||!id||!['review','confident'].includes(rating))return false;
 const previous=find(id),now=new Date().toISOString(),oldHistory=Array.isArray(previous?.history)?previous.history:[];
 const successful=(previous?.successStreak||0)+(rating==='confident'?1:0),streak=rating==='confident'?successful:0;
 const wait=rating==='confident'?(streak>=3?14:streak===2?7:3):1;
 const record={...previous,id,recordType:'conceptReview',rating,successStreak:streak,history:[...oldHistory,{at:now,rating}],nextReview:days(wait),updatedAt:now};
 entries=entries.filter(x=>x.id!==id).concat(record);
 const saved=persist();refresh();return saved;
}
function makeControls(root,id){
 if(root.querySelector('.concept-controls'))return;
 const target=root.classList.contains('ds-topic')?root.querySelector('.ds-meta'):root.querySelector('.pattern-body');
 if(!target)return;
 const box=document.createElement('div');box.className='concept-controls';
 const title=document.createElement('span');title.className='concept-prompt';title.textContent='Could you explain this pattern without looking?';
 const practice=document.createElement('button');practice.type='button';practice.className='concept-rate needs';practice.dataset.conceptRate='review';practice.textContent='↻ Need practice';
 const remembered=document.createElement('button');remembered.type='button';remembered.className='concept-rate remembered';remembered.dataset.conceptRate='confident';remembered.textContent='✓ I remembered';
 const badge=document.createElement('span');badge.className='concept-status';badge.dataset.conceptStatus='';badge.setAttribute('aria-live','polite');
 box.append(title,practice,remembered,badge);target.appendChild(box);
}
function mount(){
 for(const root of document.querySelectorAll('[data-concept-id]'))makeControls(root,root.dataset.conceptId);
 refresh();
}
document.addEventListener('click',e=>{
 const button=e.target.closest?.('[data-concept-rate]');if(!button)return;
 const root=button.closest('[data-concept-id]');if(!root)return;
 e.preventDefault();e.stopPropagation();review(root.dataset.conceptId,button.dataset.conceptRate);
});
window.addEventListener('recall-concept-render',mount);
window.addEventListener('recall-cloud-data',e=>{
 if(e.detail?.kind!=='concepts'||!Array.isArray(e.detail.items))return;
 const merged=new Map(entries.map(x=>[x.id,x]));
 for(const item of e.detail.items){if(!item||typeof item.id!=='string')continue;const prev=merged.get(item.id);if(!prev||String(item.updatedAt||'')>String(prev.updatedAt||''))merged.set(item.id,item)}
 const next=[...merged.values()],changed=JSON.stringify(next)!==JSON.stringify(entries);
 if(changed){entries=next;try{localStorage.setItem(KEY,JSON.stringify(entries))}catch{notify('⚠ Could not cache synced reviews locally')};refresh()}
 const remote=new Map(e.detail.items.map(x=>[x.id,x]));
 if(next.some(x=>!remote.has(x.id)||String(x.updatedAt||'')>String(remote.get(x.id)?.updatedAt||'')))broadcast();
});
window.RecallConcepts=()=>entries;
window.RecallConceptReady=ready;
window.RecallConceptReview=review;
window.RecallConceptRefresh=mount;
mount();
})();
