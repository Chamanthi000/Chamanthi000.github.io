/* Recall: lightweight revision planner, synchronized as private habit records. */
(()=>{'use strict';
const core=window.RecallRevisionPlan,api=window.RecallGoals,root=document.getElementById('revisionPlanner');
if(!core||!api||!root)return;
const $=id=>document.getElementById(id);
const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let cloudNotes=[],cloudSession='',cloudBusy=false,cloudFailedSession='',cloudRetryAt=0,lastDay='',lastTopics=[],lastPlan=[],activeReviewId=null;
const dateLabel=date=>new Date(date+'T12:00:00').toLocaleDateString('en-US',{weekday:'short',month:'short',day:'numeric'});
function localNotes(){
 try{
  const rows=JSON.parse(localStorage.getItem('recall-structures-v1')||'[]');
  return Array.isArray(rows)?rows:[];
 }catch{return []}
}
function noteRows(){
 const combined=new Map();
 for(const row of cloudNotes){
  if(!row||typeof row.id!=='string')continue;
  const current=combined.get(row.id);
  if(!current||String(row.updatedAt||'')>String(current.updatedAt||''))combined.set(row.id,row);
 }
 // The user selected this device as the authority for their current DSA notes.
 // Don't let an older or conflicted cloud copy redefine a local topic's study date.
 for(const row of localNotes()){
  if(!row||typeof row.id!=='string')continue;
  if(core.noteText(row).trim()||!combined.has(row.id))combined.set(row.id,row);
 }
 return [...combined.values()];
}
function reviewRecords(){return api.getHabits().filter(row=>row?.recordType===core.RECORD_TYPE&&!row.deleted)}
function currentTopics(){return core.collectTopics(noteRows(),reviewRecords(),core.dayKey())}
function showStatus(message,error=false){$('rpStatus').textContent=message;$('rpStatus').dataset.error=String(error)}
function saveRecord(record){
 let result=false;
 try{
  result=api.saveHabits(habits=>{
   const i=habits.findIndex(item=>item.id===record.id);
   if(i>=0)habits[i]=record;else habits.push(record);
  })!==false;
 }catch{result=false}
 return result;
}
function checklistFor(topic){
 const index=topic.reviewCount||0;
 const base=window.RecallReviewChecklists?.get(topic,index)||{challenge:'Representative algorithm',
  checks:[{id:'recognize',label:'Recall when to use this technique.'},{id:'code',label:'Attempt code without looking.'}]};
 const last=topic.record?.history?.at?.(-1);
 // When a challenge was failed, revisit that exact algorithm instead of
 // accidentally rotating to a new one at the next-day follow-up.
 const retry=last?.result==='practice'&&last.challenge?last.challenge:null;
 const challenge=retry||base.challenge;
 const checks=base.checks.map(point=>point.id==='code'&&retry?
  {...point,label:point.label.replace(base.challenge,challenge)}:point);
 const extras=Array.isArray(topic.record?.extraReviewChecks)?topic.record.extraReviewChecks.filter(x=>x?.id&&x?.label).slice(0,15):[];
 const all=[...checks,...extras];
 if(last?.result==='practice'){
  const priorities=new Set(last.missing||[]);
  if(last.memorized==='no'){priorities.add('methods');priorities.add('trace');}
  if(last.codeBlind==='no')priorities.add('code');
  // Missed checkpoints are first next time, but no checklist content disappears.
  all.sort((a,b)=>Number(priorities.has(b.id))-Number(priorities.has(a.id)));
 }
 return {...base,challenge,checks:all};
}
function focusText(focus){
 return ({'algorithm-recall':'Focus next: reconstruct the algorithm steps from memory.',
 'blind-coding':'Focus next: write the code without opening the solution.',
 'steps-and-coding':'Focus next: recall the steps, then implement from scratch.',
 'unfinished-checkpoints':'Focus next: cover any checklist items you missed.',
 'maintain':'Strong recall and coding. Keep it fresh with a later review.'})[focus]||'';
}
function assessmentMarkup(topic){
 const checklist=checklistFor(topic),old=topic.record,draft=old?.reviewDraft?.date===core.dayKey()&&old.reviewDraft.challenge===checklist.challenge?old.reviewDraft:null;
 const checked=new Set(draft?.checked||[]),memory=draft?.memorized||'',code=draft?.codeBlind||'';
 const prompts=checklist.checks.map((point,i)=>
  '<label class="rpCheck"><input type="checkbox" data-rp-check="'+esc(point.id)+'" '+(checked.has(point.id)?'checked':'')+'><span><b>'+String(i+1)+'.</b> '+esc(point.label)+'</span></label>').join('');
 const question=(name,title,value)=>'<fieldset class="rpQuestion"><legend>'+esc(title)+'</legend><div class="rpRadioRow">'+
  ['yes','no'].map(choice=>'<label><input type="radio" name="'+name+'" data-rp-answer="'+name+'" value="'+choice+'" '+(value===choice?'checked':'')+'><span>'+ (choice==='yes'?'Yes, without help':'Not yet')+'</span></label>').join('')+'</div></fieldset>';
 return '<form class="rpAssessment" data-rp-assessment="'+esc(topic.id)+'">'+
  '<div class="rpAssessmentHead"><div><strong>Quick topic recall</strong><p>Try from memory first. Tick what you really covered, not what you only read.</p></div><span>~5–12 min</span></div>'+
  '<div class="rpCheckList">'+prompts+'</div>'+
  '<div class="rpCustom"><label for="rpCustom-'+encodeURIComponent(topic.id)+'">One extra thing to remember (optional)</label>'+
  '<div><input id="rpCustom-'+encodeURIComponent(topic.id)+'" data-rp-custom-input maxlength="130" placeholder="e.g. Stable vs unstable sorting"><button type="button" data-rp-add-custom>Add</button></div></div>'+
  '<div class="rpDivider"></div>'+
  question('memorized','Can you explain the algorithm steps without seeing your notes?',memory)+
  question('codeBlind','Can you write the selected code without looking at notes or a solution?',code)+
  '<p class="rpDecisionHelp">Both yes + all checkpoints covered → longer interval. Any “Not yet” → targeted review tomorrow. Unchecked checkpoints → short follow-up.</p>'+
  '<div class="rpAssessmentActions"><button type="submit">Save review & schedule next</button><button type="button" class="rpSecondary" data-rp-close>Close</button></div></form>';
}
function rowMarkup(t,allowMark){
 const noteState=t.estimated?'Based on your latest notes':'Based on your review history';
 const open=allowMark&&activeReviewId===t.id;
 return '<article class="rpItem"><div class="rpInfo"><strong>'+esc(t.title)+'</strong>'+
  '<small>'+esc(noteState)+' · ~5–12 min'+(t.overdue?' · Due earlier':'')+'</small>'+
  (t.record?.focus&&t.record.focus!=='maintain'?'<small>'+esc(focusText(t.record.focus))+'</small>':'')+'</div>'+
  (allowMark?'<div class="rpItemActions"><button type="button" data-rp-open="'+esc(t.id)+'" aria-expanded="'+String(open)+'">'+(open?'Hide review':'Start quick review')+'</button></div>':'')+
  (open?assessmentMarkup(t):'')+
  (!allowMark?'<details class="rpPreview"><summary>See what to cover</summary><ol>'+
   checklistFor(t).checks.map(check=>'<li>'+esc(check.label)+'</li>').join('')+
   '</ol><p>At review time, assess memory and blind coding separately.</p></details>':'')+'</article>';
}
function render(){
 const day=core.dayKey(),tomorrow=core.plusDays(day,1),topics=currentTopics(),planned=core.planDays(topics,day,8,2);
 lastDay=day;lastTopics=topics;lastPlan=planned;
 const today=planned[0].items,next=planned[1].items;
 $('rpTodayDate').textContent=dateLabel(day);
 $('rpTomorrowDate').textContent=dateLabel(tomorrow);
 $('rpTodayItems').innerHTML=today.length?today.map(t=>rowMarkup(t,true)).join(''):'<p class="rpEmpty">Nothing due. Keep learning!</p>';
 $('rpTomorrowItems').innerHTML=next.length?next.map(t=>rowMarkup(t,false)).join(''):'<p class="rpEmpty">Nothing scheduled tomorrow.</p>';
 const later=planned.slice(2).filter(day=>day.items.length);
 $('rpUpcoming').innerHTML=later.length?later.map(day=>'<span class="rpFuture"><b>'+esc(dateLabel(day.date))+'</b> · '+day.items.map(t=>esc(t.title)).join(', ')+'</span>').join(''):'<span class="rpEmpty">No further reviews scheduled this week.</span>';
 const names=new Set(topics.map(item=>core.titleKey(item.title)));
 $('rpTopicOptions').innerHTML=[...topics.map(t=>t.title),'Sorting techniques'].filter((x,i,arr)=>arr.findIndex(t=>core.titleKey(t)===core.titleKey(x))===i).map(title=>'<option value="'+esc(title)+'"></option>').join('');
 $('rpTomorrowChecklist').disabled=next.length===0||!window.RecallDailyChecklist;
 $('rpTomorrowChecklist').textContent=next.length?'Add '+next.length+' to tomorrow’s checklist':'No reviews to add tomorrow';
 $('rpSummary').textContent=topics.length+' tracked topic'+(topics.length===1?'':'s')+' · '+today.length+' for today · '+next.length+' for tomorrow';
 const waiting=topics.filter(t=>t.nextReview<=day).length-today.length;
 $('rpCarryover').textContent=waiting>0?waiting+' more due topic'+(waiting===1?'':'s')+' will roll into the next free day.':'At most two five-minute reviews are suggested per day.';
}
function reviewRecord(id){return reviewRecords().find(row=>row.topicId===id)}
function baseRecord(topic){
 return reviewRecord(topic.id)||{id:core.recordId(topic.id),recordType:core.RECORD_TYPE,topicId:topic.id,title:topic.title,startedOn:topic.startedOn,stage:0,history:[]};
}
function openReview(id){
 const topic=lastTopics.find(t=>t.id===id);
 if(!topic){showStatus('This topic is not available in your saved revisions.',true);return false;}
 activeReviewId=activeReviewId===id?null:id;
 render();
 if(activeReviewId){
  const target=[...document.querySelectorAll('[data-rp-assessment]')].find(el=>el.dataset.rpAssessment===id);
  target?.scrollIntoView({block:'nearest',behavior:'auto'});
  if(!target)showStatus('This topic is not in today’s two scheduled reviews. It remains in your upcoming plan.');
 }
 return true;
}
function saveDraft(id,update){
 const topic=lastTopics.find(t=>t.id===id);
 if(!topic)return false;
 const list=checklistFor(topic),previous=baseRecord(topic),today=core.dayKey();
 const draft=previous.reviewDraft?.date===today&&previous.reviewDraft?.challenge===list.challenge?
  {...previous.reviewDraft}: {date:today,challenge:list.challenge,checked:[],memorized:null,codeBlind:null};
 update(draft);
 const next={...previous,reviewDraft:draft,updatedAt:new Date().toISOString()};
 if(!saveRecord(next)){showStatus('Review progress could not be saved on this device. Keep your backup.',true);return false;}
 render();
 return true;
}
function submitAssessment(id){
 const topic=lastTopics.find(t=>t.id===id);
 if(!topic){showStatus('Topic no longer available.',true);return}
 const checklist=checklistFor(topic),old=baseRecord(topic),draft=old.reviewDraft;
 if(!draft||draft.date!==core.dayKey()||draft.challenge!==checklist.challenge||
  !['yes','no'].includes(draft.memorized)||!['yes','no'].includes(draft.codeBlind)){
  showStatus('Answer both questions about recall and writing code without notes.',true);return;
 }
 let next;
 try{
  next=core.assessmentFor(id,topic.title,old,{items:checklist.checks,checked:draft.checked,
   memorized:draft.memorized,codeBlind:draft.codeBlind,challenge:checklist.challenge},core.dayKey());
 }catch(error){showStatus(error.message||'Could not finish the review.',true);return}
 if(!saveRecord(next)){showStatus('Could not save the assessment. Nothing was marked reviewed.',true);return}
 activeReviewId=null;
 window.RecallDailyChecklist?.markRevisionAssessed?.(id,core.dayKey());
 render();
 const last=next.history.at(-1);
 const message=last.focus==='maintain'?'All covered, algorithm remembered, and code written from memory.':
  last.focus==='blind-coding'?'You remember the algorithm; next time focus on writing it unaided.':
  last.focus==='algorithm-recall'?'Next time reconstruct the steps before coding.':
  last.focus==='unfinished-checkpoints'?'Next time finish the unchecked concepts.':
  'Next time practice both the algorithm steps and blind coding.';
 showStatus('✓ Saved. '+message+' Next review: '+dateLabel(next.nextReview)+'.');
}
$('rpTodayItems').addEventListener('click',e=>{
 const open=e.target.closest('[data-rp-open]');if(open){openReview(open.dataset.rpOpen);return}
 const close=e.target.closest('[data-rp-close]');if(close){activeReviewId=null;render();return}
 const add=e.target.closest('[data-rp-add-custom]');
 if(add){
  const form=add.closest('[data-rp-assessment]'),topicId=form?.dataset.rpAssessment,input=form?.querySelector('[data-rp-custom-input]');
  const label=String(input?.value||'').trim();
  if(!topicId||!label||label.length>130){showStatus('Enter a short checklist point (up to 130 characters).',true);return}
  const topic=lastTopics.find(t=>t.id===topicId),old=baseRecord(topic),extras=Array.isArray(old.extraReviewChecks)?old.extraReviewChecks:[];
  if(extras.length>=15){showStatus('The personal checklist has reached its 15-item limit.',true);return}
  const id='custom-'+Date.now().toString(36)+'-'+Math.random().toString(36).slice(2,7);
  if(!saveRecord({...old,extraReviewChecks:[...extras,{id,label}],updatedAt:new Date().toISOString()})){
   showStatus('Could not save the personal checklist point.',true);return}
  render();showStatus('Your personal checkpoint was saved for future reviews.');
 }
});
$('rpTodayItems').addEventListener('change',e=>{
 const form=e.target.closest('[data-rp-assessment]');if(!form)return;
 const id=form.dataset.rpAssessment;
 if(e.target.matches('[data-rp-check]')){
  const point=e.target.dataset.rpCheck,checked=e.target.checked;
  saveDraft(id,draft=>{const ids=new Set(draft.checked||[]);if(checked)ids.add(point);else ids.delete(point);draft.checked=[...ids]});
 }else if(e.target.matches('[data-rp-answer]')){
  const name=e.target.dataset.rpAnswer,value=e.target.value;
  if(['memorized','codeBlind'].includes(name)&&['yes','no'].includes(value))saveDraft(id,draft=>{draft[name]=value});
 }
});
$('rpTodayItems').addEventListener('submit',e=>{
 const form=e.target.closest('[data-rp-assessment]');if(!form)return;
 e.preventDefault();submitAssessment(form.dataset.rpAssessment);
});
$('rpStudiedForm').addEventListener('submit',e=>{
 e.preventDefault();
 const raw=$('rpStudyInput').value.trim().replace(/\s+/g,' ');
 if(!raw||raw.length>90){showStatus('Enter a topic name (up to 90 characters).',true);return}
 const existing=lastTopics.find(t=>core.titleKey(t.title)===core.titleKey(raw));
 const id=existing?.id||core.manualId(raw);
 const old=reviewRecords().find(row=>row.topicId===id);
 let next;
 try{next=core.progressFor(id,existing?.title||raw,old,'studied',core.dayKey())}
 catch{showStatus('Could not schedule this topic.',true);return}
 if(!saveRecord(next)){showStatus('Could not save the study date to this device. Please export a backup.',true);return}
 $('rpStudyInput').value='';
 render();showStatus('✓ '+next.title+' studied today. First short review: '+dateLabel(next.nextReview)+' (3 days later).');
});
$('rpTomorrowChecklist').addEventListener('click',()=>{
 const items=lastPlan[1]?.items||[];
 if(!items.length||!window.RecallDailyChecklist){showStatus('No tomorrow reviews are available to add.',true);return}
 const target=core.plusDays(core.dayKey(),1);
 const records=items.map(topic=>({id:'rp-'+encodeURIComponent(topic.id),name:'Revise '+topic.title+' · 5 min',start:'',end:'',reviewTopicId:topic.id}));
 const result=window.RecallDailyChecklist.addSuggested(target,records);
 if(result?.saved){showStatus(result.added?'Added '+result.added+' short revision task(s) to tomorrow’s editable checklist.':'Those revision tasks are already on tomorrow’s checklist.');}
 else showStatus('Could not save tomorrow’s checklist. Existing tasks are unchanged.',true);
});
async function refreshFromCloud(){
 const cloud=window.RecallCloud,token=cloud?.sessionToken;
 if(!token||cloudBusy||token===cloudSession||(token===cloudFailedSession&&Date.now()<cloudRetryAt))return;
 cloudBusy=true;
 try{
  const snapshot=await cloud.readAll({serverOnly:true});
  if(cloud.sessionToken!==token)return;
  // Read-only: never merge or overwrite notes on this device.
  cloudNotes=Array.isArray(snapshot.structures)?snapshot.structures:[];
  cloudSession=token;cloudFailedSession='';cloudRetryAt=0;
  render();
 }catch{
  cloudFailedSession=token;cloudRetryAt=Date.now()+60000;
  showStatus('Using this device’s saved notes for now. The cloud topic list could not be verified; your notes were not changed.',false);
 }finally{cloudBusy=false}
}
function refresh(){render();refreshFromCloud()}
window.addEventListener('recall-cloud-data',e=>{if(e.detail?.kind==='habits')render()});
window.addEventListener('recall-cloud-status',()=>{if(window.RecallCloud?.sessionToken!==cloudSession)refreshFromCloud()});
window.addEventListener('storage',e=>{if(['recall-structures-v1','recall-goals-habits-v1'].includes(e.key))render()});
window.addEventListener('focus',refresh);
document.addEventListener('visibilitychange',()=>{if(!document.hidden)refresh()});
setInterval(()=>{if(core.dayKey()!==lastDay)render()},60000);
window.RecallRevisionPlanner={render,openReviewFromChecklist(id,date){
 if(date!==core.dayKey())return false;
 if(activeReviewId!==id)openReview(id);
 document.getElementById('revisionPlanner')?.scrollIntoView({block:'start',behavior:'smooth'});
 return true;
}};
render();
refreshFromCloud();
})();
