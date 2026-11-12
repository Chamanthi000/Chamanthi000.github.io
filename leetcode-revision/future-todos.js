/* Recall Future To-Dos — editable dated tasks, Firebase-compatible records and reminders. */
(()=>{'use strict';
const api=window.RecallGoals,section=document.getElementById('futureSection');
if(!api||!section)return;
const $=id=>document.getElementById(id);
const K='futureTask',today=()=>{const d=new Date();return [d.getFullYear(),String(d.getMonth()+1).padStart(2,'0'),String(d.getDate()).padStart(2,'0')].join('-')};
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const tasks=()=>api.getHabits().filter(x=>x.recordType===K&&!x.deleted);
const dueTomorrow=(deadline)=>{const d=new Date(today()+'T12:00:00');d.setDate(d.getDate()+1);return [d.getFullYear(),String(d.getMonth()+1).padStart(2,'0'),String(d.getDate()).padStart(2,'0')].join('-')===deadline};
const friendly=d=>new Date(d+'T12:00:00').toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'});
let editing=null,filter='pending';
function sorted(){return [...tasks()].sort((a,b)=>Number(a.done)-Number(b.done)||(a.deadline||'9999').localeCompare(b.deadline||'9999')||String(a.createdAt||'').localeCompare(String(b.createdAt||'')))}
function updateItem(id,change){
 api.saveHabits(items=>{
  const item=items.find(t=>t.id===id&&t.recordType===K&&!t.deleted);if(!item)return;
  Object.assign(item,change,{updatedAt:new Date().toISOString()});
 });render();
}
function render(){
 const all=sorted(),active=all.filter(t=>!t.done),due=active.filter(t=>dueTomorrow(t.deadline)),past=active.filter(t=>t.deadline<today());
 $('futureCount').textContent=active.length+' pending';
 $('futureSummary').textContent=due.length?due.length+' due tomorrow · '+past.length+' overdue':active.length+' tasks to plan ahead';
 $('futureDueBanner').hidden=!due.length;
 $('futureDueBanner').textContent=due.length?'⏰ Due tomorrow: '+due.map(t=>t.name).join(' · '):'';
 $('futureFilter').value=filter;
 const shown=all.filter(t=>filter==='all'||(filter==='done'?t.done:!t.done));
 $('futureItems').innerHTML=shown.map(t=>{
  const overdue=!t.done&&t.deadline<today(),tomorrow=!t.done&&dueTomorrow(t.deadline);
  const label=t.done?'Completed':overdue?'Overdue':tomorrow?'Tomorrow':'Due '+friendly(t.deadline);
  return '<div class="futureRow '+(t.done?'futureDone':'')+'">'+
   '<input type="checkbox" data-future-change="done" data-id="'+esc(t.id)+'" '+(t.done?'checked':'')+' aria-label="Mark '+esc(t.name)+' '+(t.done?'not done':'done')+'">'+
   '<div class="futureText"><div class="futureName">'+esc(t.name)+'</div><div class="futureDate '+(overdue?'futureLate':'')+'">'+esc(label)+' · '+esc(friendly(t.deadline))+'</div></div>'+
   '<button class="btn secondary small" data-future-action="edit" data-id="'+esc(t.id)+'">Edit</button></div>'+
   (editing===t.id?'<form class="futureEdit" data-future-edit="'+esc(t.id)+'">'+
    '<label class="label">Task<input name="task" class="field" required maxlength="160" value="'+esc(t.name)+'"></label>'+
    '<label class="label">Deadline<input name="deadline" type="date" class="field" required value="'+esc(t.deadline)+'"></label>'+
    '<div class="futureActions"><button class="btn small" type="submit">Save changes</button><button class="btn danger small" type="button" data-future-action="remove" data-id="'+esc(t.id)+'">Delete</button><button class="btn secondary small" type="button" data-future-action="edit" data-id="'+esc(t.id)+'">Cancel</button></div></form>':'');
 }).join('')||'<p class="note" style="padding:12px 3px">No '+(filter==='done'?'completed':'pending')+' future tasks. Add one below.</p>';
}
function icsEscape(s){return String(s||'').replace(/\\/g,'\\\\').replace(/,/g,'\\,').replace(/;/g,'\\;').replace(/\r?\n/g,'\\n')}
function calendarEvent(t){
 const stamp=t.deadline.replace(/-/g,'');
 const start=stamp+'T100000',end=stamp+'T103000';
 return ['BEGIN:VEVENT','UID:'+icsEscape(t.id)+'@recall-chamanthi','DTSTAMP:'+new Date().toISOString().replace(/[-:]/g,'').replace(/\.\d{3}/,''),
  'SUMMARY:'+icsEscape('Deadline: '+t.name),'DESCRIPTION:'+icsEscape('Recall Goals & Habits future to-do. Open https://chamanthi000.github.io/leetcode-revision/goals.html'),'DTSTART;TZID=America/Chicago:'+start,'DTEND;TZID=America/Chicago:'+end,'BEGIN:VALARM','ACTION:DISPLAY','DESCRIPTION:'+icsEscape('Due tomorrow: '+t.name),'TRIGGER:-P1D','END:VALARM','END:VEVENT'].join('\r\n');
}
function saveCalendar(){
 const list=tasks().filter(t=>!t.done&&/^\d{4}-\d{2}-\d{2}$/.test(t.deadline));
 if(!list.length){$('futureMessage').textContent='Add an upcoming deadline first.';return}
 const calendar=['BEGIN:VCALENDAR','VERSION:2.0','PRODID:-//Recall//Future Tasks//EN','CALSCALE:GREGORIAN','METHOD:PUBLISH',...list.map(calendarEvent),'END:VCALENDAR'].join('\r\n');
 const url=URL.createObjectURL(new Blob([calendar],{type:'text/calendar;charset=utf-8'}));
 const a=document.createElement('a');a.href=url;a.download='recall-future-deadlines.ics';document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),30000);
 $('futureMessage').textContent='Calendar file prepared. Import it into your phone calendar and allow alerts. If you change a deadline later, reimport the updated calendar file.';
}
$('futureFilter').addEventListener('change',e=>{filter=e.target.value;render()});
$('futureAdd').addEventListener('submit',e=>{
 e.preventDefault();
 const name=$('futureNewName').value.trim(),deadline=$('futureNewDate').value;
 if(!name||!/^\d{4}-\d{2}-\d{2}$/.test(deadline))return;
 const now=new Date().toISOString(),id='future_'+Date.now().toString(36)+'_'+Math.random().toString(36).slice(2,8);
 api.saveHabits(items=>items.push({id,recordType:K,name,deadline,done:false,createdAt:now,updatedAt:now}));
 $('futureAdd').reset();render();
 $('futureMessage').textContent='✓ Task saved. It will appear in your cloud records when Google sync is connected.';
});
$('futureItems').addEventListener('change',e=>{
 const b=e.target.closest('[data-future-change="done"]');
 if(b)updateItem(b.dataset.id,{done:b.checked});
});
$('futureItems').addEventListener('click',e=>{
 const b=e.target.closest('[data-future-action]');if(!b)return;
 if(b.dataset.futureAction==='edit'){editing=editing===b.dataset.id?null:b.dataset.id;render();return}
 if(b.dataset.futureAction==='remove'){
  if(!confirm('Delete this future task?'))return;
  updateItem(b.dataset.id,{deleted:true});editing=null;
 }
});
$('futureItems').addEventListener('submit',e=>{
 const form=e.target.closest('[data-future-edit]');if(!form)return;e.preventDefault();
 const name=form.elements.task.value.trim(),deadline=form.elements.deadline.value;
 if(!name||!/^\d{4}-\d{2}-\d{2}$/.test(deadline))return;
 updateItem(form.dataset.futureEdit,{name,deadline});editing=null;render();
});
$('futureCalendar').onclick=saveCalendar;
$('futureOpenButton').onclick=()=>{section.open=true;section.scrollIntoView({behavior:'smooth',block:'start'});$('futureNewName').focus({preventScroll:true})};
function reminderCheck(){
 render();
 if(!('Notification' in window)||Notification.permission!=='granted')return;
 const d=today(),now=new Date(),minutes=now.getHours()*60+now.getMinutes();
 // Day-before notification at the first opportunity after 9 AM; while page is open.
 if(minutes<9*60)return;
 for(const t of tasks()){
  if(t.done||!dueTomorrow(t.deadline))continue;
  const k='recall-future-reminder:'+d+':'+t.id;
  if(localStorage.getItem(k))continue;
  try{new Notification('Due tomorrow · '+t.name,{body:'Open Recall to prepare or mark it done.',tag:k});localStorage.setItem(k,'1')}catch{}
 }
}
window.addEventListener('recall-cloud-local',e=>{if(e.detail?.kind==='habits')render()});
window.addEventListener('recall-cloud-data',e=>{if(e.detail?.kind==='habits')setTimeout(()=>{render();reminderCheck()},0)});
window.addEventListener('focus',reminderCheck);
document.addEventListener('visibilitychange',()=>{if(!document.hidden)reminderCheck()});
setInterval(reminderCheck,60000);
render();reminderCheck();
})();