/* Recall: lightweight revision planner, synchronized as private habit records. */
(()=>{'use strict';
const core=window.RecallRevisionPlan,api=window.RecallGoals,root=document.getElementById('revisionPlanner');
if(!core||!api||!root)return;
const $=id=>document.getElementById(id);
const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let cloudNotes=[],cloudSession='',cloudBusy=false,cloudFailedSession='',cloudRetryAt=0,lastDay='',lastTopics=[],lastPlan=[];
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
function rowMarkup(t,allowMark){
 const noteState=t.estimated?'Based on when you last edited notes':'Based on your completed reviews';
 return '<article class="rpItem"><div class="rpInfo"><strong>'+esc(t.title)+'</strong>'+
  '<small>'+esc(noteState)+' · ~5 min'+(t.overdue?' · Due earlier':'')+'</small></div>'+
  (allowMark?'<div class="rpItemActions"><button type="button" data-rp-action="remembered" data-rp-id="'+esc(t.id)+'">✓ Remembered</button><button type="button" class="rpSecondary" data-rp-action="practice" data-rp-id="'+esc(t.id)+'">Need practice</button></div>':'')+
 '</article>';
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
function reviewed(id,result){
 const topic=lastTopics.find(t=>t.id===id);
 if(!topic){showStatus('This topic has changed. Refresh the planner and try again.',true);return false}
 const previous=reviewRecords().find(row=>row.topicId===id);
 const initial=previous||{recordType:core.RECORD_TYPE,startedOn:topic.startedOn,stage:0,history:[]};
 let next;
 try{next=core.progressFor(id,topic.title,initial,result,core.dayKey())}
 catch(e){showStatus(e.message==='Already reviewed this topic today'?'You already reviewed this topic today. The next date is scheduled.':'Could not update the review.',true);return false}
 if(!saveRecord(next)){showStatus('Could not save this review. Keep your notes and back up your Goals & Habits data.',true);return false}
 render();
 showStatus(result==='practice'?'Saved: revisit '+topic.title+' tomorrow.':'Saved: '+topic.title+' is scheduled again on '+dateLabel(next.nextReview)+'.');
 return true;
}
$('rpTodayItems').addEventListener('click',e=>{
 const button=e.target.closest('[data-rp-action]');
 if(button)reviewed(button.dataset.rpId,button.dataset.rpAction);
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
window.RecallRevisionPlanner={render,markFromChecklist(id,date){
 // Checking an explicitly linked daily revision item counts as a completed review.
 // Only today's task can advance the schedule; a historic checkbox cannot
 // backdate or silently reorder the spaced-repetition history.
 if(date!==core.dayKey())return false;
 return reviewed(id,'remembered');
}};
render();
refreshFromCloud();
})();
