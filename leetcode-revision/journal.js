/* Recall Journal — private on-device entries; habits sync uses existing account-scoped Firestore rules.
   Every entry is typed, so the Goals & Habits page never treats it as a habit. */
(()=>{'use strict';
const KEY='recall-goals-habits-v1',TYPE='journalEntry',PREFIX='journal-',FIELDS=['good','learned','improve','tomorrow','more'],MOODS=new Set(['rough','low','okay','good','great']);
const $=id=>document.getElementById(id);
const iso=(d=new Date())=>[d.getFullYear(),String(d.getMonth()+1).padStart(2,'0'),String(d.getDate()).padStart(2,'0')].join('-');
const validDay=date=>{if(typeof date!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(date))return false;const d=new Date(date+'T12:00:00Z');return !Number.isNaN(d.getTime())&&d.toISOString().slice(0,10)===date};
const compare=(a,b)=>String(a?.updatedAt||a?.createdAt||'').localeCompare(String(b?.updatedAt||b?.createdAt||''));
let selected=iso(),cloudTimer=null,isLoading=false,localProblem=false,typing=false;
function readEnvelope(){
 const raw=localStorage.getItem(KEY);
 if(raw===null)return {goals:[],habits:[]};
 const data=JSON.parse(raw);
 if(!data||typeof data!=='object'||Array.isArray(data)||(data.goals!==undefined&&!Array.isArray(data.goals))||(data.habits!==undefined&&!Array.isArray(data.habits)))throw Error('Saved Recall data is not in the expected format');
 return data;
}
function entry(date,rows){
 const matches=(rows||[]).filter(r=>r?.recordType===TYPE&&r.id===PREFIX+date&&!r.deleted);
 return matches.sort((a,b)=>compare(b,a))[0]||null;
}
function allEntries(rows){
 const byDate=new Map();
 for(const x of Array.isArray(rows)?rows:[]){
  if(x?.recordType!==TYPE||x.deleted||!validDay(x.date)||x.id!==PREFIX+x.date)continue;
  if(!FIELDS.some(k=>String(x[k]||'').trim())&&!MOODS.has(x.mood))continue;
  const previous=byDate.get(x.date);
  if(!previous||compare(x,previous)>0)byDate.set(x.date,x);
 }
 return [...byDate.values()].sort((a,b)=>b.date.localeCompare(a.date));
}
function saveStatus(message,failed=false){$('journalSave').textContent=message;$('journalSave').style.color=failed?'#aa5050':'';document.querySelector('.saveDot').style.background=failed?'#cb7373':'#80b793'}
function valueFromEditor(){
 const form=$('journalForm'),next={};
 for(const key of FIELDS){next[key]=String(form.elements.namedItem(key)?.value||'').slice(0,key==='more'?4000:800)}
 const checked=document.querySelector('input[name="mood"]:checked');
 next.mood=MOODS.has(checked?.value)?checked.value:'';
 return next;
}
function hasContent(x){return FIELDS.some(k=>String(x?.[k]||'').trim())||MOODS.has(x?.mood)}
function displayDate(date){
 const d=new Date(date+'T12:00:00');return d.toLocaleDateString('en-US',{weekday:'short',month:'short',day:'numeric',year:'numeric'});
}
function saveLocal(){
 if(isLoading)return;
 let envelope,existing;
 try{
  envelope=readEnvelope();existing=entry(selected,envelope.habits);
  const fields=valueFromEditor();
  if(!hasContent(fields)&&!existing){saveStatus('Nothing written yet · entries save as you type');return}
  const record={...existing,id:PREFIX+selected,recordType:TYPE,date:selected,...fields,createdAt:existing?.createdAt||new Date().toISOString(),updatedAt:new Date().toISOString()};
  const habits=[...(envelope.habits||[])],ix=habits.findIndex(x=>x?.id===record.id);
  if(ix>=0)habits[ix]=record;else habits.push(record);
  const payload=JSON.stringify({...envelope,habits});
  localStorage.setItem(KEY,payload);
  if(localStorage.getItem(KEY)!==payload)throw Error('Device save could not be verified');
  localProblem=false;saveStatus('✓ Saved on this device · cloud sync status above');
  renderRecent();
  clearTimeout(cloudTimer);
  cloudTimer=setTimeout(()=>{
   try{const latest=readEnvelope();window.dispatchEvent(new CustomEvent('recall-cloud-local',{detail:{kind:'habits',items:latest.habits}}))}
   catch{saveStatus('⚠ Unable to send journal to cloud · export a backup',true)}
  },650);
 }catch(error){
  localProblem=true;saveStatus('⚠ Device save failed · export your journal before closing',true);
  window.dispatchEvent(new CustomEvent('recall-device-save-failed',{detail:{kind:'habits',message:'Journal could not be written to local storage'}}));
 }
}
function loadDay(date){
 if(!validDay(date)||date>iso())return;
 clearTimeout(cloudTimer);
 if(!isLoading&&typing)saveLocal();
 selected=date;isLoading=true;
 let record=null;
 try{record=entry(date,readEnvelope().habits);localProblem=false}
 catch{localProblem=true;saveStatus('⚠ Journal device storage unreadable · export a backup',true)}
 $('journalDate').value=date;$('journalDate').max=iso();
 $('journalNext').disabled=date>=iso();
 for(const key of FIELDS){const input=$('journalForm').elements.namedItem(key);if(input)input.value=String(record?.[key]||'')}
 for(const radio of document.querySelectorAll('input[name="mood"]'))radio.checked=radio.value===record?.mood;
 if(record?.more)document.querySelector('.optionalThoughts').open=true;
 else document.querySelector('.optionalThoughts').open=false;
 saveStatus(localProblem?'⚠ Device storage needs attention · export backup':record?'✓ Saved entry · you can edit it anytime':'Nothing written yet · entries save as you type',localProblem);
 isLoading=false;typing=false;renderRecent();
}
function excerpt(r){
 const text=FIELDS.map(x=>String(r[x]||'').trim()).find(Boolean);
 return (text||'Mood check-in').slice(0,145);
}
function renderRecent(){
 let records=[];
 try{records=allEntries(readEnvelope().habits)}catch{saveStatus('⚠ Could not read previous entries · export backup',true)}
 $('journalCount').textContent=records.length+' '+(records.length===1?'entry':'entries');
 const node=$('journalRecent');node.replaceChildren();
 if(!records.length){const empty=document.createElement('div');empty.className='empty';empty.textContent='Your journal starts with one honest sentence. No pressure.';node.append(empty);return}
 for(const r of records.slice(0,30)){
  const button=document.createElement('button');button.type='button';button.className='recentDay';button.dataset.journalDay=r.date;
  const body=document.createElement('span'),title=document.createElement('strong'),description=document.createElement('small'),arrow=document.createElement('span');
  title.textContent=displayDate(r.date)+(MOODS.has(r.mood)?' · '+({rough:'😣',low:'😕',okay:'😐',good:'🙂',great:'✨'}[r.mood]):'');
  description.textContent=excerpt(r);arrow.className='arrow';arrow.textContent='›';
  body.append(title,description);button.append(body,arrow);node.append(button);
 }
}
function move(delta){
 const date=new Date(selected+'T12:00:00');date.setDate(date.getDate()+delta);
 loadDay(iso(date));
}
function applyRemote(items){
 if(!Array.isArray(items))return;
 try{
  const envelope=readEnvelope(),habits=Array.isArray(envelope.habits)?envelope.habits:[];
  const combined=new Map(habits.filter(x=>x?.id).map(x=>[x.id,x]));
  for(const row of items){
   if(!row?.id||typeof row.id!=='string')continue;
   const previous=combined.get(row.id);
   if(!previous||compare(row,previous)>0)combined.set(row.id,row);
   // If tied but unequal, retain this device's version. The common Firebase
   // sync code archives matching cloud conflicts for safe human review.
  }
  const next=JSON.stringify({...envelope,habits:[...combined.values()]});
  if(next!==JSON.stringify(envelope)){
   localStorage.setItem(KEY,next);
   if(localStorage.getItem(KEY)!==next)throw Error('Cloud merge could not be verified');
  }
  if(!typing&&!localProblem)loadDay(selected);else renderRecent();
 }catch{
  saveStatus('⚠ Cloud journal copy could not be safely applied · local copy kept',true);
  window.dispatchEvent(new CustomEvent('recall-device-save-failed',{detail:{kind:'habits',message:'Journal cloud merge was not saved'}}));
 }
}
function exportEntries(){
 let data;
 try{data=allEntries(readEnvelope().habits)}catch{saveStatus('⚠ Cannot read journal to export · check device storage',true);return}
 const payload=JSON.stringify({format:'recall-journal-backup-v1',exportedAt:new Date().toISOString(),entries:data},null,2);
 const blob=new Blob([payload],{type:'application/json'}),url=URL.createObjectURL(blob),a=document.createElement('a');
 a.href=url;a.download='recall-journal-'+iso()+'.json';document.body.append(a);a.click();a.remove();
 setTimeout(()=>URL.revokeObjectURL(url),1500);
 saveStatus('Journal backup exported · your entries remain saved.');
}
$('journalDate').max=iso();
$('journalDate').addEventListener('change',e=>loadDay(e.target.value));
$('journalPrev').addEventListener('click',()=>move(-1));
$('journalNext').addEventListener('click',()=>move(1));
$('journalRecent').addEventListener('click',e=>{
 const button=e.target.closest('[data-journal-day]');if(!button)return;
 loadDay(button.dataset.journalDay);window.scrollTo({top:0,behavior:'smooth'});
});
$('journalForm').addEventListener('submit',e=>e.preventDefault());
$('journalForm').addEventListener('input',()=>{typing=true;saveLocal()});
$('journalForm').addEventListener('change',()=>{typing=true;saveLocal()});
$('journalMoods').addEventListener('change',()=>{typing=true;saveLocal()});
$('journalExport').addEventListener('click',exportEntries);
window.addEventListener('recall-cloud-data',e=>{if(e.detail?.kind==='habits')applyRemote(e.detail.items)});
window.addEventListener('storage',e=>{if(e.key===KEY&&!typing)loadDay(selected)});
window.addEventListener('focus',()=>{if(!typing)renderRecent()});
// The same typed journal records are stored in the existing, private habits
// collection. We do not request a new public Firestore collection or alter
// authorization rules; other habits/goals always remain in their envelope.
window.RecallLocal=kind=>kind==='habits'?readEnvelope().habits:[];
window.RecallJournal={getEntries:()=>allEntries(readEnvelope().habits),saveLocal,loadDay};
loadDay(selected);
})();