/* Automatic browser snapshots for Recall. Keeps past versions of every major data collection.
   This does not upload personal data to public GitHub. Firebase provides separate live cloud sync. */
(()=>{'use strict';
const status=document.getElementById('autoBackupStatus')||{textContent:''};
const list=document.getElementById('autoBackupVersions')||{value:'',innerHTML:''};
const download=document.getElementById('autoBackupDownload')||{disabled:true,onclick:null};
// On Coding/SQL, run snapshots without the Goals page's backup-history controls.
const DB_NAME='recall-autobackups-v1',STORE='snapshots',MAX=20;
const KEYS={coding:'recall-notes-v1',sql:'recall-sql-v1',goals:'recall-goals-habits-v1',habits:'recall-goals-habits-v1',structures:'recall-structures-v1',concepts:'recall-concept-reviews-v1',conflicts:'recall-sync-conflicts-v1'};
const KINDS=Object.keys(KEYS);
let timer=null,running=false,resave=false;
const snapshotPayload=()=>{
 const raw=Object.fromEntries([...new Set(Object.values(KEYS))].map(k=>[k,localStorage.getItem(k)]));
 const parsed=Object.fromEntries(Object.entries(raw).map(([k,v])=>[k,v===null?null:JSON.parse(v)]));
 const records={};
 for(const kind of KINDS){
  const v=parsed[KEYS[kind]],rows=kind==='goals'||kind==='habits'?v?.[kind]:v;
  if(v!==null&&!Array.isArray(rows))throw Error('Invalid device storage for '+kind);
  records[kind]=rows||[];
 }
 return {format:'recall-full-backup',version:2,exportedAt:new Date().toISOString(),source:'automatic local version',...records,originals:{localStorage:raw}};
};
const fingerprint=payload=>{
 const raw=JSON.stringify(KINDS.map(k=>payload[k]));
 // FNV-1a fingerprint: only used to avoid identical duplicate snapshots.
 let h=2166136261;for(let i=0;i<raw.length;i++)h=Math.imul(h^raw.charCodeAt(i),16777619);
 return raw.length+'-'+(h>>>0).toString(16);
};
function openDb(){
 return new Promise((resolve,reject)=>{
  if(!('indexedDB' in window))return reject(Error('Browser storage not supported.'));
  const request=indexedDB.open(DB_NAME,1);
  request.onupgradeneeded=()=>{const db=request.result;db.createObjectStore(STORE,{keyPath:'id',autoIncrement:true})};
  request.onsuccess=()=>resolve(request.result);
  request.onerror=()=>reject(request.error||Error('Could not open backup storage.'));
 });
}
function transaction(db,mode,callback){
 return new Promise((resolve,reject)=>{
  const tx=db.transaction(STORE,mode);
  let result;
  tx.oncomplete=()=>resolve(result);
  tx.onerror=()=>reject(tx.error||Error('Backup storage failed.'));
  tx.onabort=()=>reject(tx.error||Error('Backup storage canceled.'));
  result=callback(tx.objectStore(STORE));
 });
}
function allRows(db){
 return new Promise((resolve,reject)=>{
  const tx=db.transaction(STORE,'readonly');
  const req=tx.objectStore(STORE).getAll();
  let rows;req.onsuccess=()=>{rows=req.result||[]};
  tx.oncomplete=()=>resolve(rows||[]);
  tx.onabort=()=>reject(tx.error||Error('Backup read canceled.'));
  req.onerror=()=>reject(req.error||Error('Backup history unavailable.'));
 });
}
function humanTime(d){return new Date(d).toLocaleString(undefined,{month:'short',day:'numeric',hour:'numeric',minute:'2-digit'})}
function formatCount(p){return KINDS.reduce((n,k)=>n+(p[k]?.length||0),0)}
function renderHistory(rows){
 const sorted=rows.slice().sort((a,b)=>b.id-a.id).slice(0,MAX);
 const previous=list.value;
 list.innerHTML=sorted.map(r=>'<option value="'+r.id+'">'+humanTime(r.createdAt)+' · '+formatCount(r.payload)+' records</option>').join('');
 if(sorted.some(r=>String(r.id)===previous))list.value=previous;
 download.disabled=!sorted.length;
}
async function refreshHistory(){
 const db=await openDb();
 try{
  const rows=await allRows(db);
  renderHistory(rows);
  if(rows.length){
   const latest=rows.reduce((a,b)=>!a||b.id>a.id?b:a,null);
   status.textContent='✓ Auto backup: '+humanTime(latest.createdAt)+'. '+rows.length+' saved versions on this device. Google sign-in enables separate Firebase cloud sync.';
  }else status.textContent='Your first automatic backup will be created after saving.';
 }finally{db.close()}
}
async function createSnapshot(){
 if(running){resave=true;return}
 running=true;
 try{
  const db=await openDb();
  try{
   const payload=snapshotPayload(),hash=fingerprint(payload);
   const rows=await allRows(db),previous=rows.reduce((a,b)=>!a||b.id>a.id?b:a,null);
   if(!previous||previous.hash!==hash||JSON.stringify(KINDS.map(k=>previous.payload[k]))!==JSON.stringify(KINDS.map(k=>payload[k]))){
    await transaction(db,'readwrite',store=>store.add({createdAt:payload.exportedAt,hash,payload}));
    const updated=await allRows(db);
    if(!updated.some(r=>JSON.stringify(r.payload)===JSON.stringify(payload)))throw Error('Backup readback failed; prior snapshots retained.');
    const surplus=updated.sort((a,b)=>b.id-a.id).slice(MAX);
    if(surplus.length)await transaction(db,'readwrite',store=>surplus.forEach(r=>store.delete(r.id)));
   }
   const latest=await allRows(db);renderHistory(latest);
   const last=latest.reduce((a,b)=>!a||b.id>a.id?b:a,null);
   status.textContent='✓ Auto backup updated '+humanTime(last.createdAt)+' · '+latest.length+' saved versions. Firebase sync is separate when signed in.';
  }finally{db.close()}
 }catch(e){status.textContent='⚠ Automatic local backup unavailable: '+(e?.message||e)+'. Device saving is unverified; use Back up everything for a separate file.';console.warn(e)}
 finally{
  running=false;
  if(resave){resave=false;enqueue()}
 }
}
function enqueue(){clearTimeout(timer);timer=setTimeout(createSnapshot,1800)}
async function downloadVersion(){
 const id=Number(list.value);
 if(!Number.isSafeInteger(id))return;
 try{
  const db=await openDb();
  let row;
  try{
   row=await new Promise((resolve,reject)=>{
    const tx=db.transaction(STORE,'readonly'),req=tx.objectStore(STORE).get(id);
    req.onsuccess=()=>resolve(req.result);
    req.onerror=()=>reject(req.error||Error('Could not load saved version.'));
   });
  }finally{db.close()}
  if(!row)return;
  const blob=new Blob([JSON.stringify(row.payload,null,2)],{type:'application/json'});
  const url=URL.createObjectURL(blob),a=document.createElement('a');
  a.href=url;a.download='recall-previous-version-'+row.createdAt.slice(0,19).replace(/[:T]/g,'-')+'.json';
  document.body.appendChild(a);a.click();
  status.textContent='Version download requested. Confirm the file exists; this page cannot verify a download.';
  setTimeout(()=>{URL.revokeObjectURL(url);a.remove()},60000);
 }catch(err){status.textContent='Could not download version: '+(err?.message||err)}
}
download.onclick=downloadVersion;
document.getElementById('autoBackupRefresh')?.addEventListener('click',()=>refreshHistory().catch(e=>status.textContent='Backup history unavailable: '+e.message));
window.addEventListener('recall-cloud-local',enqueue);
window.addEventListener('recall-cloud-data',enqueue);
window.addEventListener('focus',enqueue);
document.addEventListener('visibilitychange',()=>{if(!document.hidden)enqueue()});
enqueue();
})();