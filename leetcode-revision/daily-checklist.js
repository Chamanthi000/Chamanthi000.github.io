/* Recall: editable recurring daily checklist and in-page reminders.
   Daily records live alongside habits for compatibility with existing Firebase sync. */
(()=>{'use strict';
const api=window.RecallGoals;
const $=id=>document.getElementById(id);
if(!api||!$('dailyChecklist'))return;
const PREFIX='__recall_daily_',TEMPLATE=PREFIX+'template_v1';
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
const liveHabits=()=>api.getHabits().filter(h=>!h.deleted&&!h.recordType);
const findRecord=id=>api.getHabits().find(h=>h.id===id&&!h.deleted);
const template=()=>{const r=findRecord(TEMPLATE);return r&&Array.isArray(r.tasks)?copy(r.tasks):copy(defaults)};
let selected=isoDate(),editing=null,templateMode=false,lastDate=isoDate(),notifyBusy=false;
function getTasks(){
 if(templateMode)return template();
 const r=findRecord(PREFIX+selected);
 return r&&Array.isArray(r.tasks)?copy(r.tasks):template();
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
function isDone(t,tasks){const h=linkOf(t,tasks);return h?(h.dates||[]).includes(selected):!!t.done}
function writeTasks(tasks,extra){
 const id=templateMode?TEMPLATE:PREFIX+selected,now=new Date().toISOString(),previous=findRecord(id);
 const rec={...previous,id,recordType:templateMode?'dailyTemplate':'dailyDay',date:templateMode?'':selected,tasks:copy(tasks),updatedAt:now};
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
function render(){
 const tasks=getTasks(),done=templateMode?0:tasks.filter(t=>isDone(t,tasks)).length;
 const pct=templateMode?0:(tasks.length?Math.round(done/tasks.length*100):0);
 $('dailyHeading').textContent=templateMode?'Recurring daily template':'Daily checklist';
 $('dailyDesc').textContent=templateMode?'Change your default routine here. Edits apply to new or uncustomized days.':'Today starts fresh from your template. Edit any day without changing other days.';
 $('dailyDate').value=selected;
 $('dailyDateBox').hidden=templateMode;
 $('dailyGoToday').hidden=templateMode;
 $('dailyTemplateMode').textContent=templateMode?'← Back to checklist':'Edit recurring template';
 $('dailyStats').textContent=templateMode?tasks.length+' template tasks':done+' / '+tasks.length+' completed';
 $('dailyPercent').textContent=templateMode?'':pct+'%';
 $('dailyFill').style.width=pct+'%';
 $('dailyProgress').setAttribute('aria-valuenow',pct);
 const now=Date.now();
 $('dailyTasks').innerHTML=tasks.map((t,i)=>{
  const h=linkOf(t,tasks),checked=!templateMode&&isDone(t,tasks),status=statusFor(t,tasks);
  const time=t.start||t.end?formatTime(t.start)+' – '+formatTime(t.end):'No set time';
  const pending=!templateMode&&taskEnded(t)&&!checked&&t.response!=='no';
  const linkId=Object.prototype.hasOwnProperty.call(t,'linkedHabitId')?t.linkedHabitId:(h?.id||'');
  const before=localTime(selected,t.start);
  const until=!templateMode&&selected===isoDate()&&Number.isFinite(before)&&now<before&&before-now<=30*60000;
  return '<div class="dailyRow '+(checked?'dailyDone':'')+'">'+
    (templateMode?'<span aria-hidden="true" class="dailyBullet">☰</span>':'<input class="dailyTick" type="checkbox" data-day-action="check" data-task="'+esc(t.id)+'" id="dailyTask'+i+'" '+(checked?'checked':'')+' aria-label="Complete '+esc(t.name)+'">')+
    '<div class="dailyMain"><label '+(templateMode?'':'for="dailyTask'+i+'"')+' class="dailyName">'+esc(t.name)+'</label>'+
    '<div class="dailyTime">'+esc(time)+(h?' · ↔ '+esc(h.name):'')+(status?' · '+esc(status):'')+(until?' · Coming up soon':'')+'</div>'+
    (pending?'<div class="dailyQuestion"><span>Did you complete this task?</span><button class="btn small" type="button" data-day-action="yes" data-task="'+esc(t.id)+'">Yes ✓</button><button class="btn secondary small" type="button" data-day-action="no" data-task="'+esc(t.id)+'">No</button></div>':'')+
    '</div><button class="btn secondary small" type="button" data-day-action="edit" data-task="'+esc(t.id)+'" aria-label="Edit '+esc(t.name)+'">Edit</button></div>'+
    (editing===t.id?'<form class="dailyTaskEditor" data-edit-task="'+esc(t.id)+'"><label class="label">Task<input class="field" name="taskName" required maxlength="160" value="'+esc(t.name)+'"></label>'+
    '<div class="dailyFormGrid"><label class="label">Start time<input class="field" type="time" name="taskStart" value="'+esc(t.start||'')+'"></label>'+
    '<label class="label">End time<input class="field" type="time" name="taskEnd" value="'+esc(t.end||'')+'"></label></div>'+
    '<label class="label">Link to existing habit<select class="field" name="taskHabit">'+options(linkId)+'</select></label>'+
    '<div class="dailyEditActions"><button class="btn small" type="submit">Save</button>'+
    '<button class="btn secondary small" type="button" data-day-action="up" data-task="'+esc(t.id)+'" '+(i===0?'disabled':'')+'>↑</button>'+
    '<button class="btn secondary small" type="button" data-day-action="down" data-task="'+esc(t.id)+'" '+(i===tasks.length-1?'disabled':'')+'>↓</button>'+
    '<button class="btn danger small" type="button" data-day-action="delete" data-task="'+esc(t.id)+'">Remove</button>'+
    '<button class="btn secondary small" type="button" data-day-action="edit" data-task="'+esc(t.id)+'">Cancel</button></div></form>':'');
 }).join('')||'<div class="empty">No tasks for this day. Add one below.</div>';
 $('dailyAddHabit').innerHTML=options();
}
function recordResponse(id,complete){
 if(templateMode)return;
 const tasks=getTasks(),t=tasks.find(x=>x.id===id);
 if(!t)return;
 const h=linkOf(t,tasks);
 t.done=complete;t.response=complete?'yes':'no';
 writeTasks(tasks,(habits,now)=>{
  if(!h)return;
  const linked=habits.find(x=>x.id===h.id);
  if(!linked)return;
  const dates=new Set(linked.dates||[]);
  if(complete)dates.add(selected);else dates.delete(selected);
  linked.dates=[...dates].sort();linked.updatedAt=now;
 });
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
 else if(action==='up'&&i>0)[tasks[i-1],tasks[i]]=[tasks[i],tasks[i-1]];
 else if(action==='down'&&i<tasks.length-1)[tasks[i+1],tasks[i]]=[tasks[i],tasks[i+1]];
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
 t.name=name;t.start=start;t.end=end;t.linkedHabitId=form.elements.taskHabit.value;
 editing=null;writeTasks(tasks);
});
$('dailyAddForm').addEventListener('submit',e=>{
 e.preventDefault();
 const name=$('dailyNewName').value.trim(),start=$('dailyNewStart').value,end=$('dailyNewEnd').value;
 if(!name)return;
 if(start&&end&&localTime(selected,end)<=localTime(selected,start)){alert('End time must be after start time.');return}
 const tasks=getTasks();
 tasks.push({id:'task_'+Date.now().toString(36)+'_'+Math.random().toString(36).slice(2,7),name,start,end,linkedHabitId:$('dailyAddHabit').value,done:false});
 writeTasks(tasks);$('dailyAddForm').reset();$('dailyAddDetails').open=false;
});
$('dailyTemplateMode').onclick=()=>{templateMode=!templateMode;editing=null;$('dailyAddDetails').open=false;render()};
$('dailyGoToday').onclick=()=>{selected=isoDate();editing=null;render();checkReminders()};
$('dailyDate').onchange=e=>{if(/^\d{4}-\d{2}-\d{2}$/.test(e.target.value)){selected=e.target.value;editing=null;render();checkReminders()}};
const alertKey=(day,task,event)=>'recall-notify-v2:'+day+':'+task+':'+event;
function browserNotify(title,body,key){
 if(!('Notification' in window)||Notification.permission!=='granted'||localStorage.getItem(key))return;
 try{
  const n=new Notification(title,{body,tag:key});
  n.onclick=()=>{window.focus();$('dailyChecklist').scrollIntoView({behavior:'smooth'});n.close()};
  localStorage.setItem(key,'1');
 }catch(e){console.warn('Notification not available:',e)}
}
function checkPlanPrompt(){
 const now=new Date(),day=isoDate(now),key='recall-night-plan-v1:'+day;
 const isTime=now.getHours()>=22;
 const show=!templateMode&&selected===day&&isTime&&!localStorage.getItem(key);
 $('dailyPlanBanner').hidden=!show;
 if(show)browserNotify('Plan tomorrow ✨','Review and edit tomorrow’s daily checklist before bed.',alertKey(day,'tomorrow','plan'));
}
$('dailyPlanTomorrow').onclick=()=>{
 const current=isoDate(),next=new Date();next.setDate(next.getDate()+1);
 selected=isoDate(next);
 localStorage.setItem('recall-night-plan-v1:'+current,'1');
 editing=null;
 $('dailyPlanBanner').hidden=true;
 $('dailyAddDetails').open=false;
 render();
 $('dailyChecklist').scrollIntoView({behavior:'smooth',block:'start'});
};
function checkReminders(){
 const current=isoDate();
 if(current!==lastDate){
  if(selected===lastDate)selected=current;
  lastDate=current;editing=null;
 }
 if(!document.querySelector('.dailyTaskEditor')&&!document.activeElement?.closest?.('#dailyAddDetails'))render();
 checkPlanPrompt();
 if(templateMode||selected!==current)return;
 const now=Date.now(),tasks=getTasks();
 for(const t of tasks){
  const start=localTime(current,t.start),end=localTime(current,t.end);
  if(Number.isFinite(start)&&now>=start-30*60000&&now<start){
   const left=Math.max(1,Math.ceil((start-now)/60000));
   browserNotify('Upcoming task · '+t.name,'Starts in '+left+' minutes at '+formatTime(t.start),alertKey(current,t.id,'before'));
  }
  if(Number.isFinite(end)&&now>=end&&now<end+2*60000&&!isDone(t,tasks)&&t.response!=='no'){
   browserNotify('Did you finish? · '+t.name,'Open your checklist to answer Yes or No.',alertKey(current,t.id,'after'));
  }
 }
}
$('dailyNotify').onclick=async()=>{
 if(!('Notification' in window)){
  $('dailyNotifyStatus').textContent='System notifications are not supported in this browser. In-page completion questions still work.';return;
 }
 try{
  let p=Notification.permission;
  if(p==='default')p=await Notification.requestPermission();
  $('dailyNotifyStatus').textContent=p==='granted'?'Notifications enabled while this page is open. For closed-app alerts, use an external reminder service.':p==='denied'?'Notifications blocked. Allow them in your browser/device settings.':'System notifications are not enabled. In-page reminders still work.';
  checkReminders();
 }catch(err){$('dailyNotifyStatus').textContent='This browser may require installing the website to your Home Screen before enabling notifications.'}
};
function setStatus(){
 const support='Notification' in window,perm=support?Notification.permission:'unsupported';
 $('dailyNotifyStatus').textContent=perm==='granted'?'Notifications enabled while this page stays open.':'On-screen Yes / No prompts work when you open this page. Reliable notifications with the browser closed require a separate push service or calendar alarms.';
 $('dailyNotify').textContent=perm==='granted'?'Notifications enabled ✓':'Enable browser notifications';
 $('dailyNotify').disabled=perm==='granted';
}
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
  selected=plan.date;templateMode=false;editing=null;
  if(!writeTasks(plan.tasks)){description.textContent='Device save failed. Check storage space and try again.';return}
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
