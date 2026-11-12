/* Recall monthly goals: compact expandable, editable per-month goal list. */
(()=>{'use strict';
const api=window.RecallGoals,$=id=>document.getElementById(id);
if(!api||!$('monthlySection'))return;
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const currentMonth=()=>new Date().getFullYear()+'-'+String(new Date().getMonth()+1).padStart(2,'0');
let month=currentMonth(),editing=null,showDone=true;
const getAll=()=>api.getHabits().filter(t=>t.recordType==='monthlyGoal'&&!t.deleted);
const forMonth=()=>getAll().filter(t=>t.month===month).sort((a,b)=>Number(a.done)-Number(b.done)||String(a.createdAt||'').localeCompare(String(b.createdAt||'')));
function save(change){
 api.saveHabits(records=>change(records));
 render();
}
function render(){
 const all=forMonth(),done=all.filter(t=>t.done).length;
 $('monthlyMonth').value=month;
 $('monthlyCount').textContent=done+'/'+all.length+' complete';
 $('monthlySubtitle').textContent=all.length?'Your '+new Date(month+'-15T12:00:00').toLocaleDateString('en-US',{month:'long',year:'numeric'})+' priorities':'Set priorities for '+new Date(month+'-15T12:00:00').toLocaleDateString('en-US',{month:'long',year:'numeric'});
 $('monthlyFill').style.width=(all.length?Math.round(done*100/all.length):0)+'%';
 $('monthlyDoneToggle').textContent=showDone?'Hide completed':'Show completed';
 const items=all.filter(t=>showDone||!t.done);
 $('monthlyItems').innerHTML=items.length?items.map(t=>'<div class="futureRow '+(t.done?'futureDone':'')+'">'+
  '<input type="checkbox" data-month-check="'+esc(t.id)+'" '+(t.done?'checked':'')+' aria-label="Mark '+esc(t.name)+' '+(t.done?'not complete':'complete')+'">'+
  '<div class="futureText"><div class="futureName">'+esc(t.name)+'</div>'+(t.details?'<div class="futureDate">'+esc(t.details)+'</div>':'')+'</div>'+
  '<button class="btn secondary small" type="button" data-month-action="edit" data-id="'+esc(t.id)+'">Edit</button></div>'+
 (editing===t.id?'<form data-month-edit="'+esc(t.id)+'" class="futureEdit">'+
  '<label class="label">Goal<input class="field" name="title" maxlength="160" required value="'+esc(t.name)+'"></label>'+
  '<label class="label">Details / milestones<textarea class="field" name="details" rows="2" placeholder="What does success look like?">'+esc(t.details||'')+'</textarea></label>'+
  '<div class="futureActions"><button class="btn small" type="submit">Save</button><button class="btn danger small" type="button" data-month-action="delete" data-id="'+esc(t.id)+'">Delete</button><button class="btn secondary small" type="button" data-month-action="edit" data-id="'+esc(t.id)+'">Cancel</button></div></form>':'')).join(''):'<p class="note" style="padding:12px 3px">No goals in this view. Add one below.</p>';
}
$('monthlyMonth').addEventListener('change',e=>{if(/^\d{4}-\d{2}$/.test(e.target.value)){month=e.target.value;editing=null;render()}});
$('monthlyToday').onclick=()=>{month=currentMonth();editing=null;render()};
$('monthlyDoneToggle').onclick=()=>{showDone=!showDone;render()};
$('monthlyAdd').addEventListener('submit',e=>{
 e.preventDefault();const name=$('monthlyNewName').value.trim(),details=$('monthlyNewDetails').value.trim();if(!name)return;
 const now=new Date().toISOString(),id='monthly_'+Date.now().toString(36)+'_'+Math.random().toString(36).slice(2,8);
 save(items=>items.push({id,recordType:'monthlyGoal',month,name,details,done:false,createdAt:now,updatedAt:now}));
 $('monthlyAdd').reset();$('monthlyMessage').textContent='✓ Saved to this month and cloud-sync queue.';
});
$('monthlyItems').addEventListener('change',e=>{
 const c=e.target.closest('[data-month-check]');if(!c)return;
 save(items=>{const t=items.find(t=>t.id===c.dataset.monthCheck);if(t){t.done=c.checked;t.updatedAt=new Date().toISOString()}});
});
$('monthlyItems').addEventListener('click',e=>{
 const btn=e.target.closest('[data-month-action]');if(!btn)return;const id=btn.dataset.id,act=btn.dataset.monthAction;
 if(act==='edit'){editing=editing===id?null:id;render()}
 else if(act==='delete'){
  if(!confirm('Delete this monthly goal?'))return;
  save(items=>{const t=items.find(t=>t.id===id);if(t){t.deleted=true;t.updatedAt=new Date().toISOString()}});
  editing=null;render();
 }
});
$('monthlyItems').addEventListener('submit',e=>{
 const form=e.target.closest('[data-month-edit]');if(!form)return;e.preventDefault();
 const name=form.elements.title.value.trim(),details=form.elements.details.value.trim();if(!name)return;
 save(items=>{const t=items.find(t=>t.id===form.dataset.monthEdit);if(t){t.name=name;t.details=details;t.updatedAt=new Date().toISOString()}});
 editing=null;render();
});
window.addEventListener('recall-cloud-data',e=>{if(e.detail?.kind==='habits')render()});
window.addEventListener('recall-cloud-local',e=>{if(e.detail?.kind==='habits')render()});
render();
})();