const plan=[["Legs A · Glutes + Quads",[["Smith Machine Squats",3,10,"6–10"],["Bulgarian Split Squats",2,10,"8–12 / leg"],["Cable Pull-Throughs",3,10,"10–15"],["Single-Leg Dumbbell Calf Raises",3,10,"10–15 / leg"]],[["Cable Crunch",2,12],["Reverse Crunch",2,12],["Cable Woodchop",1,10]]],["Back + Biceps",[["Assisted Pull-Ups / Lat Pulldowns",3,10,"6–10"],["Chest-Supported Dumbbell Rows",3,10,"8–12"],["Single-Arm Dumbbell Rows",2,10,"10–12 / arm"],["Incline Dumbbell Biceps Curls",2,10,"10–12"]],[["Pallof Press",2,10],["Side Plank",1,30],["Dead Bug",1,8]]],["Legs B · Glutes + Hamstrings",[["Smith Machine Romanian Deadlifts",3,10,"6–10"],["Dumbbell Reverse Lunges",2,10,"8–12 / leg"],["Sliding Hamstring Curls",3,10,"8–15"],["Standing Cable Hip Abductions",2,15,"12–20 / leg"]],[["Cable Crunch",2,12],["Reverse Crunch",2,12],["Cable Woodchop",1,10]]],["Shoulders + Arms",[["Dumbbell Shoulder Press",3,10,"6–10"],["Dumbbell Lateral Raises",3,15,"12–20"],["Reverse Cable Flys",2,12,"12–15"],["Dumbbell Hammer Curls",3,10,"8–12"],["Overhead Cable Triceps Extensions",3,12,"10–15"],["Rope Triceps Pushdowns",2,12,"10–15"]],[["Pallof Press",2,10],["Side Plank",1,30],["Dead Bug",1,8]]]];
const today=()=>new Date().toLocaleDateString('en-CA');
const $=id=>document.getElementById(id);
const storage=window.RecallWorkoutSync;
let state=storage.load();
let baseline=storage.parts(state);
const sid=()=>String(state.current);
const current=()=>state.sessions[sid()]||(state.sessions[sid()]={date:today(),sets:{},weights:{}});
const save=()=>{
 try{
  const changed=storage.save(state,baseline);
  baseline=storage.parts(state);
  storage.notice('');
  storage.publish(changed);
 }catch{
  storage.notice('Workout device save failed. Export your data before leaving.');
 }
};
const escapeHtml=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const customFor=category=>(state.custom[sid()]||[]).filter(x=>x.category===category);
const all=()=>[...plan[state.current][1].map((x,i)=>['s'+i,...x]),...plan[state.current][2].map((x,i)=>['c'+i,...x]),...customFor('strength').map(x=>[x.id,x.name,x.sets,x.reps]),...customFor('core').map(x=>[x.id,x.name,x.sets,x.reps])];
const setId=(id,i)=>id+'-'+i;
function previousExercise(name,id){
 const wanted=name.trim().toLowerCase();
 for(let i=state.history.length-1;i>=0;i--){
  const h=state.history[i];if(!h.session)continue;
  const day=plan.findIndex(p=>p[0]===h.name);
  const candidates=[];
  if(day>=0){plan[day][1].forEach((e,j)=>candidates.push({id:'s'+j,name:e[0]}));plan[day][2].forEach((e,j)=>candidates.push({id:'c'+j,name:e[0]}))}
  (h.exercises||[]).forEach(x=>candidates.push(x));
  const matched=candidates.find(x=>x.name.trim().toLowerCase()===wanted);
  if(!matched)continue;
  const ss=h.session;
  const entries=Object.entries(ss.sets||{}).filter(([k,v])=>k.startsWith(matched.id+'-')&&v?.done);
  const weights=entries.map(([,v])=>Number(v.weight)).filter(n=>Number.isFinite(n)&&n>0);
  const normal=ss.weights?.[matched.id]?.normal,max=ss.weights?.[matched.id]?.max,reps=ss.weights?.[matched.id]?.reps;
  if(!entries.length&&!normal&&!max)continue;
  return {date:h.date,sets:entries.map(([k,v])=>[id+k.slice(matched.id.length),v]),normal,max,reps,peak:weights.length?Math.max(...weights):null};
 }
 return null;
}
function renderList(container,items,prefix){
 const session=current();
 $(container).innerHTML=items.map((e,i)=>{
  const id=e[4]||prefix+i,name=e[0],n=e[1],range=e[3]||e[2]+(name==='Side Plank'?' seconds / side':' reps'),w=session.weights[id]||{},link=state.links[name]||'',prev=previousExercise(name,id),isCustom=Boolean(e[4]);
  const seconds=name==='Side Plank';
  const previousText=prev?('Last workout ('+prev.date+'): '+(prev.normal?'working '+prev.normal+' lb · ':'')+(prev.max?'highest '+prev.max+' lb':prev.peak?'highest '+prev.peak+' lb':'weight not logged')+(prev.reps?' · '+prev.reps+(seconds?' sec':' reps'):'')):'No previous completed workout logged';
  const reps=w.reps??e[2];
  const setChecks=Array.from({length:n},(_,j)=>{const k=setId(id,j),v=session.sets[k]||{};return '<label class="setRow '+(v.done?'done':'')+'"><input type="checkbox" data-set="'+k+'" '+(v.done?'checked':'')+'> Set '+(j+1)+' completed</label>'}).join('');
  return '<article class="exercise"><div class="exerciseHead"><div><strong>'+escapeHtml(name)+'</strong><small>'+n+' sets · '+escapeHtml(range)+'</small><small style="display:block;margin-top:6px;color:#9a477a;font-weight:700">'+escapeHtml(previousText)+'</small></div>'+(isCustom?'<button type="button" data-remove="'+escapeHtml(id)+'">Remove</button>':'')+'</div><div>'+setChecks+'</div><div class="fields"><label>'+(seconds?'Seconds per side':'Reps (for this exercise)')+'<select class="field" data-exreps="'+id+'">'+Array.from({length:61},(_,v)=>'<option value="'+v+'" '+(Number(reps)===v?'selected':'')+'>'+v+'</option>').join('')+'</select></label><label>Normal working weight (lb)<input type="number" min="0" step=".5" data-normal="'+id+'" value="'+escapeHtml(w.normal??'')+'"></label><label>Highest weight today (lb)<input type="number" min="0" step=".5" data-max="'+id+'" value="'+escapeHtml(w.max??'')+'"></label></div><div class="url"><input type="url" aria-label="Exercise video URL for '+escapeHtml(name)+'" placeholder="Paste exercise video URL" data-url="'+escapeHtml(name)+'" value="'+escapeHtml(link)+'"><a '+(link?'href="'+escapeHtml(/^https?:\/\//i.test(link)?link:'#')+'" target="_blank" rel="noopener noreferrer"':'href="#"')+'>Watch ↗</a></div></article>'
 }).join('')
}
function updateProgress(){const s=current();const ids=all().flatMap(x=>Array.from({length:x[2]},(_,i)=>setId(x[0],i)));const completed=ids.filter(k=>s.sets[k]?.done).length;$('count').textContent=completed+' / '+ids.length+' sets completed';$('progress').style.width=(completed/ids.length*100)+'%';$('finish').disabled=completed!==ids.length;$('status').textContent=completed===ids.length?'Ready to finish':'In progress';}
function render(){const d=state.current;$('workoutName').textContent=plan[d][0];$('dayLabel').textContent=['DAY 1 · MONDAY','DAY 2 · TUESDAY','DAY 3 · THURSDAY','DAY 4 · FRIDAY'][d];$('nextHint').textContent='Next: '+plan[(d+1)%4][0]+' · Rest days stay free for recovery.';renderList('strength',[...plan[d][1],...customFor('strength').map(x=>[x.name,x.sets,x.reps,x.reps+' reps',x.id])],'s');renderList('core',[...plan[d][2],...customFor('core').map(x=>[x.name,x.sets,x.reps,x.reps+' reps',x.id])],'c');updateProgress();$('history').textContent=state.history.length?state.history.slice(-6).reverse().map(h=>h.date+' — '+h.name).join(' | '):'No finished sessions yet.'}
$('addExercise').onsubmit=e=>{e.preventDefault();const name=$('newExercise').value.trim(),sets=Number($('newSets').value),reps=Number($('newReps').value);if(!name||!Number.isInteger(sets)||sets<1||sets>10||!Number.isInteger(reps)||reps<1||reps>60)return;state.custom[sid()] ||= [];state.custom[sid()].push({id:'x'+Date.now().toString(36)+Math.random().toString(36).slice(2,7),name,sets,reps,category:$('newCategory').value});save();$('addExercise').reset();render()};
document.addEventListener('click',e=>{const id=e.target.dataset?.remove;if(!id)return;if(!confirm('Remove this exercise from this day? Existing completed workout history will be preserved.'))return;state.custom[sid()]=(state.custom[sid()]||[]).filter(x=>x.id!==id);save();render()});
document.addEventListener('change',e=>{const t=e.target,s=current();if(t.dataset.exreps){const id=t.dataset.exreps;s.weights[id] ||= {};s.weights[id].reps=Number(t.value);save()}else if(t.dataset.set){const k=t.dataset.set;s.sets[k]={...s.sets[k],done:t.checked};save();t.closest('label').classList.toggle('done',t.checked);updateProgress()}else if(t.dataset.reps){const k=t.dataset.reps;s.sets[k]={...(s.sets[k]||{}),reps:Number(t.value)};save()}else if(t.dataset.weight){const k=t.dataset.weight;s.sets[k]={...(s.sets[k]||{reps:10}),weight:t.value};save()}else if(t.dataset.normal||t.dataset.max){const id=t.dataset.normal||t.dataset.max;s.weights[id] ||= {};s.weights[id][t.dataset.normal?'normal':'max']=t.value;save()}else if(t.dataset.url){const v=t.value.trim();if(v&&!/^https?:\/\//i.test(v)){alert('Use a full https:// URL');return}state.links[t.dataset.url]=v;save();render()}});
$('previous').onclick=()=>{state.current=(state.current+3)%4;save();render()};
$('next').onclick=()=>{state.current=(state.current+1)%4;save();render()};
$('finish').onclick=()=>{if($('finish').disabled)return;const d=state.current;state.history.push({id:crypto.randomUUID(),finishedAt:new Date().toISOString(),date:today(),name:plan[d][0],exercises:[...plan[d][1].map((e,i)=>({id:'s'+i,name:e[0]})),...plan[d][2].map((e,i)=>({id:'c'+i,name:e[0]})),...(state.custom[sid()]||[]).map(e=>({id:e.id,name:e.name}))],session:JSON.parse(JSON.stringify(current()))});delete state.sessions[sid()];state.current=(d+1)%4;save();render();window.scrollTo({top:0,behavior:'smooth'})};
$('export').onclick=()=>{const blob=new Blob([JSON.stringify(state,null,2)],{type:'application/json'});const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='recall-workouts-'+today()+'.json';a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000)};
$('import').onchange=async e=>{
 const file=e.target.files[0];
 if(!file)return;
 try{
  const data=storage.normalize(JSON.parse(await file.text()));
  if(!confirm('Replace your workout data with this backup? This change can sync to your other devices.'))return;
  state=data;save();render();
 }catch(err){alert(err.message)}
 finally{e.target.value=''}
};
storage.onUpdate(next=>{
 // Preserve an active input and apply the latest saved data when editing ends.
 const input=document.activeElement;
 if(input?.matches('#strength input:not([type=checkbox]), #core input:not([type=checkbox]), #strength select, #core select')){
  input.addEventListener('blur',()=>setTimeout(refresh,0),{once:true});
  return;
 }
 apply(next);
});
function apply(next){
 if(JSON.stringify([...storage.parts(next)])===JSON.stringify([...baseline]))return;
 state=next;baseline=storage.parts(next);render();
}
function refresh(){
 try{apply(storage.read())}catch{storage.notice('Workout data could not be read. Export your current data before leaving.')}
}
render();
