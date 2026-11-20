/* Recall: editable recurring daily checklist and in-page reminders.
   Daily records live alongside habits for compatibility with existing Firebase sync. */
(()=>{'use strict';
const api=window.RecallGoals;
const codingPractice=window.RecallCodingPractice;
const codingFallbackId='__recall_coding_practice';
const scheduleStart='2026-11-19';
const weekdaySlots=[
 {id:'class',name:'Coding Practice',start:'16:00',end:'20:00',match:/\bcoding practice\b|^(coding class|leetcode( practice)?|dsa practice)$/},
 {id:'assignment',name:'Class Homework',start:'07:00',end:'09:00',match:/\b(class homework|coding homework|coding class (assignment|homework)|coding assignment|class assignment|leetcode homework)\b/}
];
const $=id=>document.getElementById(id);
if(!api||!$('dailyChecklist'))return;
const weekendTemplateButton=$('dailyWeekendTemplateMode');
const PREFIX='__recall_daily_',TEMPLATE=PREFIX+'template_v1',WEEKEND_TEMPLATE=PREFIX+'weekend_template_v1';
const defaults=[
{id:'exercise',name:'Gym / run with Lucas',start:'05:00',end:'06:00'},
{id:'morningcare',name:'Shower, skincare & red light',start:'06:00',end:'07:00'},
{id:'breakfast',name:'Breakfast, matcha, plan & Lucas walk',start:'07:00',end:'08:00'},
{id:'othot',name:'Othot work',start:'08:00',end:'16:00'},
{id:'feed',name:'Feed Lucas',start:'16:00',end:'16:15'},
{id:'lucaswalk',name:'Lucas walk',start:'17:00',end:'17:30'},
{id:'driving',name:'Driving / SQL / résumé',start:'17:00',end:'19:00'},
{id:'class',name:'Coding class',start:'19:00',end:'21:00'},
{id:'nightcare',name:'Skincare & household tasks',start:'21:00',end:'21:30'},
{id:'assignment',name:'Coding class assignment',start:'21:30',end:'23:30'}
];
const isoDate=(d=new Date())=>[d.getFullYear(),String(d.getMonth()+1).padStart(2,'0'),String(d.getDate()).padStart(2,'0')].join('-');
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const copy=tasks=>(tasks||[]).map(t=>({...t}));
const normalize=s=>String(s||'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();
const localTime=(date,clock)=>{
  if(!/^\d{2}:\d{2}$/.test(clock||''))return NaN;
  const [hours,minutes]=clock.split(':').map(Number);
  if(hours>23||minutes>59)return NaN;
  const d=new Date(date+'T12:00:00');
  d.setHours(hours,minutes,0,0);
  return +d;
};
const formatTime=s=>{
  if(!/^\d{2}:\d{2}$/.test(s||''))return 'No time';
  const [hours,minutes]=s.split(':').map(Number);
  return ((hours+11)%12+1)+(minutes?':'+String(minutes).padStart(2,'0'):'')+(hours>=12?' PM':' AM');
};
// Stable chronological order; end-only tasks use their end time, untimed tasks come last.
function sortTasks(tasks){
 const minutes=clock=>{
  if(!/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(clock||''))return Infinity;
  const [hours,mins]=clock.split(':').map(Number);return hours*60+mins;
 };
 const time=t=>{const start=minutes(t.start);return Number.isFinite(start)?start:minutes(t.end)};
 return copy(tasks).sort((a,b)=>{const x=time(a),y=time(b);return x===y?0:x<y?-1:1});
}
const liveHabits=()=>api.getHabits().filter(h=>!h.deleted&&!h.recordType);
const findRecord=id=>api.getHabits().find(h=>h.id===id&&!h.deleted);
function isWeekend(date){
 const day=new Date(date+'T12:00:00').getDay();
 return day===0||day===6;
}
function findSlot(tasks,slot){
 return tasks.find(task=>slot.match.test(normalize(task.name)))||tasks.find(task=>task.id===slot.id);
}
function weekdaySchedule(tasks){
 for(const slot of weekdaySlots){
  const task=findSlot(tasks,slot);
  if(!task){
   tasks.push({id:slot.id,name:slot.name,start:slot.start,end:slot.end});
   continue;
  }
  const habit=linkOf(task,tasks);
  if(habit)task.linkedHabitId=habit.id;
  Object.assign(task,{name:slot.name,start:slot.start,end:slot.end});
 }
 return sortTasks(tasks);
}
function template(id,applyWeekdaySchedule=true){
 const record=findRecord(id);
 if(id===TEMPLATE){
  const tasks=sortTasks(record?.tasks||defaults);
  return applyWeekdaySchedule&&!record?.weekdayScheduleUpdated?weekdaySchedule(tasks):tasks;
 }
 if(Array.isArray(record?.tasks))return sortTasks(record.tasks);
 const weekdayRecord=findRecord(TEMPLATE);
 let weekdayTasks=template(TEMPLATE,false);
 // An uncustomized weekend still uses the previous hours for these two slots.
 if(Array.isArray(weekdayRecord?.weekendCodingSlots)){
  const ids=new Set(weekdaySlots.map(slot=>findSlot(weekdayTasks,slot)?.id));
  weekdayTasks=[...weekdayTasks.filter(task=>!ids.has(task.id)),...copy(weekdayRecord.weekendCodingSlots)];
 }
 const tasks=weekdayTasks.filter(t=>t.id!=='othot'&&t.id!=='driving'&&normalize(t.name)!=='othot work');
 const breakfast=tasks.find(t=>t.id==='breakfast'&&t.name===defaults.find(t=>t.id==='breakfast').name);
 if(breakfast)breakfast.name='Matcha, plan & Lucas walk';
 return sortTasks([
  ...tasks,
  {id:'weekend_drive',name:'Drive',start:'14:00',end:'17:00'},
  {id:'weekend_dinner_resume',name:'Dinner & résumé prep',start:'17:00',end:'21:00'}
 ]);
}
let selected=isoDate(),editing=null,templateMode=null,lastDate=isoDate();
function getTasks(){
 return templateMode?template(templateMode):tasksForDate(selected);
}
function linkOf(t,tasks){
 const habits=liveHabits();
 if(Object.prototype.hasOwnProperty.call(t,'linkedHabitId'))return habits.find(h=>h.id===t.linkedHabitId)||null;
 const name=normalize(t.name);
 if(!name)return null;
 let matches=habits.filter(h=>normalize(h.name)===name);
 if(matches.length===1)return matches[0];
 // Unambiguous multiword habit names may match a longer checklist label.
 matches=habits.filter(h=>{const n=normalize(h.name);return n.length>=8&&n.split(' ').length>=2&&name.split(' ').join(' ').includes(n)});
 if(matches.length===1)return matches[0];
 // Match short, common names only for unchanged tasks from the initial template.
 // Avoid guessing if two existing habits fit: the task editor lets the user choose.
 const original=defaults.find(x=>x.id===t.id);
 if(!original||normalize(original.name)!==name)return null;
 const aliases={
  exercise:['gym','workout','exercise','run','running','fitness'],
  morningcare:['skincare','skin care','red light'],
  breakfast:['breakfast','matcha'],
  othot:['work','othot','othot work'],
  feed:['feed lucas','feed dog','dog feeding'],
  lucaswalk:['dog walk','walk dog','lucas walk'],
  driving:['driving','sql','resume','career preparation'],
  class:['coding class','coding practice','leetcode','dsa practice'],
  nightcare:['skincare','night skincare','household chores'],
  assignment:['coding assignment','class assignment','leetcode homework']
 };
 const names=aliases[t.id]||[];
 matches=habits.filter(h=>names.includes(normalize(h.name)));
 return matches.length===1?matches[0]:null;
}
function isDone(t,tasks){return doneOnDate(t,tasks,selected)}
function storedTasks(tasks){
 return sortTasks(tasks.filter(t=>t.id!==codingFallbackId).map(({study,...task})=>task));
}
function writeTasks(tasks,extra,attempt){
 const id=templateMode||PREFIX+selected,now=new Date().toISOString(),previous=findRecord(id);
 const rec={...previous,id,recordType:templateMode?'dailyTemplate':'dailyDay',date:templateMode?'':selected,tasks:storedTasks(tasks),updatedAt:now};
 if(templateMode===TEMPLATE){
  rec.weekendCodingSlots=previous?.weekendCodingSlots||weekdaySlots.map(slot=>findSlot(previous?.tasks||defaults,slot)).filter(Boolean);
  rec.weekdayScheduleUpdated=true;
 }else if(!templateMode&&selected>=scheduleStart&&!isWeekend(selected))rec.weekdayScheduleUpdated=true;
 if(attempt)rec.codingPractice=attempt;
 const saved=api.saveHabits(habits=>{
  const ix=habits.findIndex(h=>h.id===id);
  if(ix>=0)habits[ix]=rec;else habits.push(rec);
  if(extra)extra(habits,now);
 });
 render();
 return saved!==false;
}
function options(selectedId=''){
 return '<option value="">Not linked to habit</option>'+liveHabits().map(h=>'<option value="'+esc(h.id)+'" '+(selectedId===h.id?'selected':'')+'>'+esc(h.name)+'</option>').join('');
}
function statusFor(t,tasks){
 if(templateMode)return '';
 if(isDone(t,tasks))return '✓ Done';
 if(t.response==='no')return 'Not completed';
 return '';
}
function taskEnded(t){
 const end=localTime(selected,t.end);
 return selected===isoDate()&&Number.isFinite(end)&&Date.now()>=end;
}
function studyDetails(study,descriptionId,today){
 if(!study)return '';
 const problems=study.problems.map(([slug,title,difficulty,instruction])=>
  '<li><a href="https://algo.monster/problems/'+esc(slug)+'" target="_blank" rel="noopener">'+esc(title)+'</a> · '+esc(difficulty)+
  '<div>'+esc(study.review?'Re-solve from memory and explain the approach and complexity.':instruction)+'</div></li>'
 ).join('');
 return '<div class="dailyStudy" id="'+descriptionId+'"><strong>'+esc(study.topic)+' · '+esc(study.title)+'</strong>'+
  '<span class="dailyStudyTime"> · About '+study.minutes+' min</span><ul>'+problems+'</ul>'+
  '<div>Tick when you can explain the pattern and code the assigned problems. The day is complete only when this task is checked.</div>'+
  (selected>today?'<div>Preview. Finish any earlier assignment to stay on this schedule.</div>':'')+'</div>';
}
function render(){
 const tasks=getTasks(),done=templateMode?0:tasks.filter(t=>isDone(t,tasks)).length;
 const pct=templateMode||!tasks.length?0:done===tasks.length?100:Math.min(99,Math.round(done/tasks.length*100));
 const today=isoDate();
 $('dailyHeading').textContent=templateMode===WEEKEND_TEMPLATE?'Recurring weekend template':templateMode?'Recurring weekday template':'Daily checklist';
 $('dailyDesc').textContent=templateMode?'Tasks sort automatically by time. Template edits apply to new or uncustomized days.':'Tasks sort automatically by time; untimed tasks appear last. Edit any day without changing other days.'+(codingPractice&&selected<codingPractice.start?' Weekday Coding Practice starts Monday, November 23.':'');
 $('dailyDate').value=selected;
 $('dailyDateBox').hidden=templateMode;
 $('dailyGoToday').hidden=templateMode;
 $('dailyOpenTomorrow').hidden=templateMode;
 $('dailyTemplateMode').hidden=templateMode===WEEKEND_TEMPLATE;
 if(weekendTemplateButton){
  weekendTemplateButton.hidden=templateMode===TEMPLATE;
  weekendTemplateButton.textContent=templateMode?'← Back to checklist':'Edit weekend template';
 }
 $('dailyTemplateMode').textContent=templateMode?'← Back to checklist':'Edit weekday template';
 $('dailyStats').textContent=templateMode?tasks.length+' template tasks':done+' / '+tasks.length+' completed';
 $('dailyPercent').textContent=templateMode?'':pct+'%';
 $('dailyFill').style.width=pct+'%';
 $('dailyProgress').setAttribute('aria-valuenow',pct);
 const now=Date.now();
 $('dailyTasks').innerHTML=tasks.map((t,i)=>{
  const h=linkOf(t,tasks),checked=!templateMode&&isDone(t,tasks),status=statusFor(t,tasks);
  const studyId='dailyStudy'+i, futureStudy=t.study&&selected>today;
  const time=t.start||t.end?formatTime(t.start)+' – '+formatTime(t.end):'No set time';
  const pending=!templateMode&&taskEnded(t)&&!checked&&t.response!=='no';
  const linkId=Object.prototype.hasOwnProperty.call(t,'linkedHabitId')?t.linkedHabitId:(h?.id||'');
  const before=localTime(selected,t.start);
  const until=!templateMode&&selected===isoDate()&&Number.isFinite(before)&&now<before&&before-now<=30*60000;
  return '<div class="dailyRow '+(checked?'dailyDone':'')+'">'+
    (templateMode?'<span aria-hidden="true" class="dailyBullet">☰</span>':'<input class="dailyTick" type="checkbox" data-day-action="check" data-task="'+esc(t.id)+'" id="dailyTask'+i+'" '+(checked?'checked':'')+' '+(t.study?'aria-describedby="'+studyId+'" ':'')+(futureStudy?'disabled ':'')+'aria-label="Complete '+esc(t.name)+'">')+
    '<div class="dailyMain"><label '+(templateMode?'':'for="dailyTask'+i+'"')+' class="dailyName">'+esc(t.name)+'</label>'+
    '<div class="dailyTime">'+esc(time)+(h?' · ↔ '+esc(h.name):'')+(status?' · '+esc(status):'')+(until?' · Coming up soon':'')+'</div>'+(t.notes?'<div class="dailyTaskNote">'+esc(t.notes)+'</div>':'')+studyDetails(t.study,studyId,today)+
    (pending?'<div class="dailyQuestion"><span>Did you complete this task?</span><button class="btn small" type="button" data-day-action="yes" data-task="'+esc(t.id)+'">Yes ✓</button><button class="btn secondary small" type="button" data-day-action="no" data-task="'+esc(t.id)+'">No</button></div>':'')+
    '</div>'+(t.id===codingFallbackId?'':'<button class="btn secondary small" type="button" data-day-action="edit" data-task="'+esc(t.id)+'" aria-label="Edit '+esc(t.name)+'">Edit</button>')+'</div>'+
    (editing===t.id?'<form class="dailyTaskEditor" data-edit-task="'+esc(t.id)+'"><label class="label">Task<input class="field" name="taskName" required maxlength="160" value="'+esc(t.name)+'"></label>'+
    '<div class="dailyFormGrid"><label class="label">Start time<input class="field" type="time" name="taskStart" value="'+esc(t.start||'')+'"></label>'+
    '<label class="label">End time<input class="field" type="time" name="taskEnd" value="'+esc(t.end||'')+'"></label></div>'+
    '<label class="label">Notes<textarea class="field" name="taskNotes" maxlength="1000" placeholder="Add a note for this task">'+esc(t.notes||'')+'</textarea></label>'+
    '<label class="label">Link to existing habit<select class="field" name="taskHabit">'+options(linkId)+'</select></label>'+
    '<div class="dailyEditActions"><button class="btn small" type="submit">Save</button>'+
    '<button class="btn danger small" type="button" data-day-action="delete" data-task="'+esc(t.id)+'">Remove</button>'+
    '<button class="btn secondary small" type="button" data-day-action="edit" data-task="'+esc(t.id)+'">Cancel</button></div></form>':'');
 }).join('')||'<div class="empty">No tasks for this day. Add one below.</div>';
 $('dailyAddHabit').innerHTML=options();
}
function recordResponse(id,complete){
 if(templateMode)return;
 const tasks=getTasks(),t=tasks.find(x=>x.id===id);
 if(!t||t.study&&selected>isoDate())return;
 // Checking a revision reminder must never mean “I can code it from memory”.
 // Open the topic's actual assessment instead of silently recording mastery.
 if(complete&&t.reviewTopicId&&selected===isoDate()&&window.RecallRevisionPlanner?.openReviewFromChecklist){
  render();
  window.RecallRevisionPlanner.openReviewFromChecklist(t.reviewTopicId,selected);
  return;
 }
 const h=linkOf(t,tasks);
 t.done=complete;t.response=complete?'yes':'no';
 writeTasks(tasks,(habits,now)=>{
  if(!h)return;
  const linked=habits.find(x=>x.id===h.id);
  if(!linked)return;
  const dates=new Set(linked.dates||[]);
  if(complete)dates.add(selected);else dates.delete(selected);
  linked.dates=[...dates].sort();linked.updatedAt=now;
 },t.study?{id:t.study.id,done:complete,response:t.response}:null);
}
$('dailyTasks').addEventListener('change',e=>{
 const tick=e.target.closest('[data-day-action="check"]');
 if(tick)recordResponse(tick.dataset.task,tick.checked);
});
$('dailyTasks').addEventListener('click',e=>{
 const b=e.target.closest('[data-day-action]');if(!b)return;
 const action=b.dataset.dayAction,id=b.dataset.task;
 if(action==='check')return;
 if(action==='yes'||action==='no'){recordResponse(id,action==='yes');return}
 if(action==='edit'){editing=editing===id?null:id;render();return}
 const tasks=getTasks(),i=tasks.findIndex(x=>x.id===id);
 if(i<0)return;
 if(action==='delete'){if(!confirm('Remove this task from '+(templateMode?'the recurring template':'this day')+'?'))return;tasks.splice(i,1)}
 else return;
 editing=null;writeTasks(tasks);
});
$('dailyTasks').addEventListener('submit',e=>{
 const form=e.target.closest('[data-edit-task]');if(!form)return;e.preventDefault();
 const tasks=getTasks(),t=tasks.find(x=>x.id===form.dataset.editTask);
 if(!t)return;
 const name=form.elements.taskName.value.trim(),start=form.elements.taskStart.value,end=form.elements.taskEnd.value;
 if(!name)return;
 if(start&&end&&localTime(selected,end)<=localTime(selected,start)){alert('End time must be after start time.');return}
 t.name=name;t.start=start;t.end=end;t.notes=form.elements.taskNotes.value.trim();t.linkedHabitId=form.elements.taskHabit.value;
 editing=null;writeTasks(tasks);
});
$('dailyAddForm').addEventListener('submit',e=>{
 e.preventDefault();
 const name=$('dailyNewName').value.trim(),start=$('dailyNewStart').value,end=$('dailyNewEnd').value,notes=$('dailyNewNotes').value.trim();
 if(!name)return;
 if(start&&end&&localTime(selected,end)<=localTime(selected,start)){alert('End time must be after start time.');return}
 const tasks=getTasks();
 tasks.push({id:'task_'+Date.now().toString(36)+'_'+Math.random().toString(36).slice(2,7),name,start,end,notes,linkedHabitId:$('dailyAddHabit').value,done:false});
 writeTasks(tasks);$('dailyAddForm').reset();$('dailyAddDetails').open=false;
});
// Add suggestions to a specific dated checklist without changing its template
// or replacing any hand-edited tasks. This is opt-in from the review planner.
window.RecallDailyChecklist={
 markRevisionAssessed(topicId,date){
  if(date!==isoDate())return false;
  const id=PREFIX+date,previous=findRecord(id);
  if(!previous||!Array.isArray(previous.tasks))return false;
  const tasks=copy(previous.tasks);
  const item=tasks.find(t=>t.reviewTopicId===topicId);
  if(!item)return false;
  item.done=true;item.response='yes';
  const now=new Date().toISOString(),record={...previous,tasks:sortTasks(tasks),updatedAt:now};
  const saved=api.saveHabits(habits=>{
   const index=habits.findIndex(x=>x.id===id);
   if(index>=0)habits[index]=record;
  })!==false;
  if(saved&&selected===date&&!templateMode)render();
  return saved;
 },
 addSuggested(date,suggestions){
  if(!/^\d{4}-\d{2}-\d{2}$/.test(date)||!Array.isArray(suggestions))return {saved:false,added:0};
  const existing=findRecord(PREFIX+date),tasks=tasksForDate(date);
  let added=0;
  for(const item of suggestions){
   if(!item?.id||!item?.name||!item.reviewTopicId||tasks.some(t=>t.id===item.id||t.reviewTopicId===item.reviewTopicId))continue;
   tasks.push({...item,linkedHabitId:'',done:false});added++;
  }
  if(!added)return {saved:true,added:0};
  const now=new Date().toISOString(),id=PREFIX+date;
  const record={...existing,id,date,recordType:'dailyDay',tasks:storedTasks(tasks),updatedAt:now};
  if(date>=scheduleStart&&!isWeekend(date))record.weekdayScheduleUpdated=true;
  const saved=api.saveHabits(habits=>{
   const i=habits.findIndex(h=>h.id===id);
   if(i>=0)habits[i]=record;else habits.push(record);
  })!==false;
  if(saved&&selected===date&&!templateMode)render();
  return {saved,added:saved?added:0};
 }
};
function toggleTemplate(id){
 templateMode=templateMode===id?null:id;
 editing=null;
 $('dailyAddDetails').open=false;
 render();
}
$('dailyTemplateMode').onclick=()=>toggleTemplate(TEMPLATE);
if(weekendTemplateButton)weekendTemplateButton.onclick=()=>toggleTemplate(WEEKEND_TEMPLATE);
$('dailyGoToday').onclick=()=>{selected=isoDate();editing=null;render();checkReminders()};
$('dailyDate').onchange=e=>{if(/^\d{4}-\d{2}-\d{2}$/.test(e.target.value)){selected=e.target.value;editing=null;render();checkReminders()}};
const alertKey=(day,task,event)=>'recall-notify-v2:'+day+':'+task+':'+event;
function browserNotify(title,body,key){
 return window.RecallNotifications?.show(title,body,key);
}
function tasksForDate(date){
 const r=findRecord(PREFIX+date);
 const weekend=isWeekend(date);
 let tasks;
 if(Array.isArray(r?.tasks)){
  tasks=sortTasks(r.tasks);
  if(!weekend&&date>=scheduleStart&&!r.weekdayScheduleUpdated)tasks=weekdaySchedule(tasks);
 }else tasks=template(weekend?WEEKEND_TEMPLATE:TEMPLATE,date>=scheduleStart);
 if(!codingPractice||date<codingPractice.start||weekend)return tasks;
 const records=api.getHabits().filter(h=>!h.deleted&&h.recordType==='dailyDay'&&h.codingPractice);
 const study=codingPractice.assignmentFor(date,isoDate(),records);
 const practice=findSlot(tasks,weekdaySlots[0]);
 const response=r?.codingPractice?.id===study.id?r.codingPractice.response:'';
 if(practice){
  practice.study=study;
  practice.response=response;
  return tasks;
 }
 return sortTasks([...tasks,{id:codingFallbackId,name:'Coding Practice',linkedHabitId:'',study,response}]);
}
function doneOnDate(t,tasks,date){
 if(t.study)return t.study.done;
 const h=linkOf(t,tasks);return h?(h.dates||[]).includes(date):!!t.done;
}
function checkPlanPrompt(){
 const now=new Date(),day=isoDate(now),key='recall-night-plan-v1:'+day;
 const isTime=now.getHours()>=22;
 const show=!templateMode&&selected===day&&isTime&&!localStorage.getItem(key);
 $('dailyPlanBanner').hidden=!show;
 if(isTime&&!localStorage.getItem(key))browserNotify('Plan tomorrow ✨','Review and edit tomorrow’s daily checklist before bed.',alertKey(day,'tomorrow','plan'));
}
$('dailyPlanTomorrow').onclick=()=>{
 const current=isoDate(),next=new Date();next.setDate(next.getDate()+1);
 selected=isoDate(next);
 templateMode=null;
 localStorage.setItem('recall-night-plan-v1:'+current,'1');
 editing=null;
 $('dailyPlanBanner').hidden=true;
 $('dailyAddDetails').open=false;
 render();
 $('dailyChecklist').scrollIntoView({behavior:'smooth',block:'start'});
};
$('dailyOpenTomorrow').onclick=$('dailyPlanTomorrow').onclick;
function checkReminders(){
 const current=isoDate();
 if(current!==lastDate){
  if(selected===lastDate)selected=current;
  lastDate=current;editing=null;
 }
 if(!document.querySelector('.dailyTaskEditor')&&!document.activeElement?.closest?.('#dailyAddDetails'))render();
 checkPlanPrompt();
 // Scheduling follows actual dates, independently of the date/template being edited.
 const now=Date.now(),tomorrow=new Date(current+'T12:00:00');tomorrow.setDate(tomorrow.getDate()+1);
 for(const date of [current,isoDate(tomorrow)]){
  const tasks=tasksForDate(date);
  for(const t of tasks){
   if(doneOnDate(t,tasks,date))continue;
   const start=localTime(date,t.start),end=localTime(date,t.end);
   if(Number.isFinite(start)&&now>=start-30*60000&&now<start){
    const left=Math.max(1,Math.ceil((start-now)/60000));
    browserNotify('Upcoming task · '+t.name,'Starts in '+left+' minutes at '+formatTime(t.start),alertKey(date,t.id,'before:'+t.start));
   }
   if(Number.isFinite(end)&&now>=end&&now<end+30*60000&&t.response!=='no'){
    browserNotify('Did you finish? · '+t.name,'Open your checklist to answer Yes or No.',alertKey(date,t.id,'after:'+t.end));
   }
  }
 }
}
$('dailyNotify').onclick=async()=>{
 try{
  const shown=await window.RecallNotifications.enable();
  setStatus();
  if(shown)$('dailyNotifyStatus').textContent='Test alert sent. If you did not see it, check device notification settings and Focus / Do Not Disturb. Browser reminders need Recall running; use Calendar alarms when closed.';
  else if('Notification' in window&&Notification.permission==='granted')$('dailyNotifyStatus').textContent='The test alert could not be sent. Reload and retry, or use Calendar alarms.';
  checkReminders();
 }catch(error){$('dailyNotifyStatus').textContent='Could not enable alerts. '+error.message+' Try Calendar alarms below.'}
};
function setStatus(){
 $('dailyNotifyStatus').textContent=window.RecallNotifications.status();
 const granted='Notification' in window&&Notification.permission==='granted';
 $('dailyNotify').textContent=granted?'Send test notification':'Enable & test notifications';
 $('dailyNotify').disabled=false;
}
$('dailyCalendar').onclick=()=>{
 if(templateMode){$('dailyCalendarStatus').textContent='Return to the checklist and select a date first.';return}
 const days=[],length=$('dailyCalendarRange').value==='week'?7:1;
 for(let i=0;i<length;i++){
  const d=new Date(selected+'T12:00:00');d.setDate(d.getDate()+i);const date=isoDate(d),tasks=tasksForDate(date);
  days.push({date,tasks:tasks.map(t=>({...t,done:doneOnDate(t,tasks,date)}))});
 }
 const saved=window.RecallTaskCalendar.download(days);
 $('dailyCalendarStatus').textContent=saved?'File downloaded — import it into Apple Calendar (Mac) or Google Calendar (web), then enable Calendar notifications on your phone. Check an imported event’s alerts. This is a snapshot: after edits, remove the old imported events and import a fresh file; it does not sync automatically.':'No future timed tasks or planning reminders in this date range. Select today or a future date.';
};
window.addEventListener('focus',setStatus);
// Private, one-time checklist link: the schedule stays in the link, never in public source.
function readSharedPlan(){
 const raw=new URLSearchParams(location.search).get('dailyPlan');
 if(!raw||raw.length>12000)return null;
 try{
  const p=JSON.parse(raw);
  if(p.v!==1||typeof p.date!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(p.date)||isoDate(new Date(p.date+'T12:00:00'))!==p.date)return null;
  if(!Array.isArray(p.tasks)||p.tasks.length<1||p.tasks.length>30)return null;
  const tasks=p.tasks.map((entry,i)=>{
   if(!Array.isArray(entry)||entry.length!==3)return null;
   const [start,end,rawName]=entry,name=typeof rawName==='string'?rawName.trim():'';
   if(!name||name.length>160||typeof start!=='string'||typeof end!=='string')return null;
   if((start&&!Number.isFinite(localTime(p.date,start)))||(end&&!Number.isFinite(localTime(p.date,end))))return null;
   if(!start&&!end||start&&end&&localTime(p.date,end)<=localTime(p.date,start))return null;
   return {id:'shared_'+p.date+'_'+i,name,start,end,done:false};
  });
  return tasks.every(Boolean)?{date:p.date,tasks}:null;
 }catch{return null}
}
function setupSharedPlan(){
 const plan=readSharedPlan();
 if(!plan)return;
 const banner=document.createElement('div');
 banner.id='dailyImportBanner';
 banner.setAttribute('role','region');
 banner.setAttribute('aria-label','Import shared daily plan');
 banner.style.cssText='display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap;padding:14px 16px;margin:15px 0;border:1px solid #e7bad1;border-radius:13px;background:#fff0f7';
 const message=document.createElement('div');
 const heading=document.createElement('strong');
 const day=new Date(plan.date+'T12:00:00').toLocaleDateString('en-US',{weekday:'long',month:'long',day:'numeric',year:'numeric'});
 heading.textContent='Plan ready for '+day;
 const description=document.createElement('div');
 description.textContent=plan.tasks.length+' tasks · Review and save to your private checklist. Your recurring template stays unchanged.';
 description.style.cssText='font-size:12px;margin-top:3px;color:#88627a;line-height:1.5';
 message.append(heading,description);
 const button=document.createElement('button');
 button.type='button';button.className='btn small';button.textContent='Save this plan';
 button.onclick=()=>{
  if(findRecord(PREFIX+plan.date)&&!confirm('Replace the existing checklist for '+day+'? Your recurring template and other days will not change.'))return;
  selected=plan.date;templateMode=null;editing=null;
  const tasks=selected>=scheduleStart&&!isWeekend(selected)?weekdaySchedule(copy(plan.tasks)):plan.tasks;
  if(!writeTasks(tasks)){description.textContent='Device save failed. Check storage space and try again.';return}
  const params=new URLSearchParams(location.search);params.delete('dailyPlan');
  const clean=location.pathname+(params.toString()?'?'+params.toString():'')+location.hash;
  try{history.replaceState(history.state,'',clean)}catch{}
  banner.remove();
  $('dailyChecklist').scrollIntoView({block:'start',behavior:'smooth'});
 };
 banner.append(message,button);
 const panel=$('dailyChecklist');
 panel.insertBefore(banner,panel.children[1]||null);
}
setupSharedPlan();
window.addEventListener('recall-cloud-local',e=>{if(e.detail?.kind==='habits')render()});
window.addEventListener('recall-cloud-data',e=>{if(e.detail?.kind==='habits')setTimeout(()=>{render();checkReminders()},0)});
window.addEventListener('focus',checkReminders);
document.addEventListener('visibilitychange',()=>{if(!document.hidden)checkReminders()});
setInterval(checkReminders,30000);
setStatus();render();checkReminders();
})();
