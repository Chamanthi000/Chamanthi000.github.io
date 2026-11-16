(() => {
'use strict';
const key = 'recall-goals-habits-v1';
const legacyKey = 'recall-workouts-v1';
const type = 'workoutEntry';
const legacyStamp = '1970-01-01T00:00:00.000Z';
const empty = () => ({version:1,current:0,sessions:{},history:[],links:{},custom:{}});
const object = value => value && typeof value === 'object' && !Array.isArray(value);
const day = value => /^[0-3]$/.test(value);
const newer = (a,b) => String(a?.updatedAt || '') > String(b?.updatedAt || '');
const isWorkout = row => row?.recordType === type && typeof row.id === 'string' && row.id.startsWith('workout-');
const notice = message => {
 const node = document.getElementById('workoutDeviceStatus');
 node.textContent = message;
 node.hidden = !message;
};
function normalize(value) {
 if(!object(value) || value.version !== 1 || !object(value.sessions) || !Array.isArray(value.history)){
  throw Error('Invalid workout backup');
 }
 const next = empty();
 if(day(value.current))next.current = Number(value.current);
 for(const [id,session] of Object.entries(value.sessions)){
  if(day(id) && object(session)){
   next.sessions[id] = {...session,sets:object(session.sets)?session.sets:{},weights:object(session.weights)?session.weights:{}};
  }
 }
 next.history = value.history.filter(row => typeof row?.name === 'string' && typeof row.date === 'string').map(row => ({
  ...row,
  exercises:Array.isArray(row.exercises)?row.exercises.filter(item => typeof item?.id === 'string' && typeof item.name === 'string'):[]
 }));
 next.links = Object.fromEntries(Object.entries(object(value.links)?value.links:{}).filter(([,url])=>typeof url==='string'));
 for(const [id,exercises] of Object.entries(object(value.custom)?value.custom:{})){
  if(day(id) && Array.isArray(exercises)){
   next.custom[id] = exercises.filter(item => /^(?:x[a-z0-9]+|[sc][0-9]+)$/.test(item?.id || '') && typeof item.name === 'string'
    && ['strength','core'].includes(item.category) && Number.isInteger(item.sets) && item.sets >= 1 && item.sets <= 10
    && Number.isInteger(item.reps) && item.reps >= 1 && item.reps <= 60
    && (item.baseId === undefined || /^[sc][0-9]+$/.test(item.baseId))
    && (item.range === undefined || typeof item.range === 'string')
    && (item.deleted === undefined || typeof item.deleted === 'boolean'));
  }
 }
 return next;
}
function readEnvelope() {
 const data = JSON.parse(localStorage.getItem(key) ?? '{}');
 if(!object(data) || (data.habits !== undefined && !Array.isArray(data.habits)))throw Error('Invalid Recall device storage');
 return {...data,habits:data.habits ?? []};
}
function persist(envelope) {
 const encoded = JSON.stringify(envelope);
 localStorage.setItem(key,encoded);
 if(localStorage.getItem(key) !== encoded)throw Error('Workout save could not be verified');
}
function payloads(state) {
 const result = new Map();
 const add = (kind,identity,value) => {
  const id = 'workout-'+kind+'-'+encodeURIComponent(JSON.stringify(identity));
  result.set(id,JSON.stringify({kind,identity,value}));
 };
 add('selection','current',state.current);
 for(const [id,session] of Object.entries(state.sessions)){
  if(Object.keys(session.sets).length || Object.keys(session.weights).length)add('session',id,session);
 }
 for(const [id,exercises] of Object.entries(state.custom)){
  for(const item of exercises)add('exercise',[id,item.id],item);
 }
 for(const [name,url] of Object.entries(state.links))if(url)add('link',name,url);
 const counts = new Map();
 for(const item of state.history){
  // Old exports lack IDs. Use their contents plus occurrence count so importing
  // the same backup twice does not duplicate sessions.
  const text = item.id ? '' : JSON.stringify(item);
  let hash = 0xcbf29ce484222325n;
  for(const char of text)hash = BigInt.asUintN(64,(hash ^ BigInt(char.codePointAt(0))) * 0x100000001b3n);
  const base = item.id || hash.toString(36);
  const count = counts.get(base) || 0;
  counts.set(base,count+1);
  add('history',[base,count],item);
 }
 return result;
}
function read(envelope = readEnvelope()) {
 const next = empty();
 for(const row of envelope.habits.filter(isWorkout)){
  if(row.deleted)continue;
  const {kind,identity,value} = JSON.parse(row.payload);
  if(kind === 'selection')next.current = value;
  if(kind === 'session' && day(identity))next.sessions[identity] = value;
  if(kind === 'exercise' && Array.isArray(identity) && day(identity[0]))(next.custom[identity[0]] ||= []).push(value);
  if(kind === 'link')Object.defineProperty(next.links,identity,{value,enumerable:true,configurable:true,writable:true});
  if(kind === 'history')next.history.push(value);
 }
 const normalized = normalize(next);
 normalized.history.sort((a,b) => a.date.localeCompare(b.date) || String(a.finishedAt||'').localeCompare(String(b.finishedAt||'')));
 return normalized;
}
function migration() {
 const envelope = readEnvelope();
 if(envelope.workoutsMigrated)return read(envelope);
 const raw = localStorage.getItem(legacyKey);
 if(raw === null)return read(envelope);
 const legacy = normalize(JSON.parse(raw));
 const rows = new Map(envelope.habits.map(row => [row.id,row]));
 for(const [id,payload] of payloads(legacy)){
  if(!rows.has(id))rows.set(id,{id,recordType:type,payload,createdAt:legacyStamp,updatedAt:legacyStamp});
 }
 persist({...envelope,habits:[...rows.values()],workoutsMigrated:true});
 return read();
}
function save(state,baseline) {
 const envelope = readEnvelope();
 const rows = new Map(envelope.habits.map(row => [row.id,row]));
 const next = payloads(state);
 const changed = [];
 for(const id of new Set([...baseline.keys(),...next.keys()])){
  const payload = next.get(id);
  if(payload === baseline.get(id))continue;
  const prior = rows.get(id);
  const stamp = new Date(Math.max(Date.now(),(Date.parse(prior?.updatedAt)||0)+1)).toISOString();
  const row = {id,recordType:type,createdAt:prior?.createdAt || stamp,updatedAt:stamp,
   ...(payload === undefined?{deleted:true}:{payload})};
  rows.set(id,row);
  changed.push(row);
 }
 if(changed.length)persist({...envelope,habits:[...rows.values()]});
 return changed;
}
function publish(items) {
 if(items.length)window.dispatchEvent(new CustomEvent('recall-cloud-local',{detail:{kind:'habits',items}}));
}
let update = () => {};
window.RecallLocal = kind => {
 if(kind !== 'habits')return [];
 try{return readEnvelope().habits}catch{return []}
};
window.addEventListener('recall-cloud-data',event => {
 if(event.detail?.kind !== 'habits' || !Array.isArray(event.detail.items))return;
 try{
  const envelope = readEnvelope();
  const rows = new Map(envelope.habits.map(row => [row.id,row]));
  for(const row of event.detail.items){
   const prior = rows.get(row.id);
   if(!prior || newer(row,prior))rows.set(row.id,row);
  }
  const merged = {...envelope,habits:[...rows.values()]};
  const next = read(merged);
  if(JSON.stringify(envelope)!==JSON.stringify(merged))persist(merged);
  update(next);
 }catch{
  notice('Incoming workout data could not be applied. Your device copy is still available for export.');
 }
});
window.addEventListener('storage',event => {
 if(event.key !== key)return;
 try{update(read())}catch{notice('Workout device storage could not be read.')}
});
window.RecallWorkoutSync = {
 normalize,parts:payloads,read,save,publish,notice,onUpdate:callback=>{update=callback},
 load(){
  try{return migration()}catch{
   notice('Workout device storage could not be migrated. Export your workout data before leaving.');
   try{return normalize(JSON.parse(localStorage.getItem(legacyKey)))}catch{return empty()}
  }
 }
};
})();
