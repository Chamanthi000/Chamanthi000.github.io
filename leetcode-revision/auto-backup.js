/* Recall local recovery snapshots: automatic, private, versioned IndexedDB copies.
   This is an on-device recovery layer, NOT an external/cloud backup.
   The existing Firebase sync remains the cross-device store when signed in. */
(()=>{'use strict';
const status=document.getElementById('autoBackupStatus'),button=document.getElementById('downloadAutoBackup');
// Run autosaves from Coding, SQL and Goals pages, with optional recovery UI.
const DB='recall-local-recovery-v1',STORE='snapshots';
const KEYS={coding:'recall-notes-v1',sql:'recall-sql-v1',goals:'recall-goals-habits-v1',habits:'recall-goals-habits-v1'};
const KINDS=['coding','sql','goals','habits'];
let dbPromise=null,timeout=null,previousText='';
const localRecords=kind=>{
 try{const value=JSON.parse(localStorage.getItem(KEYS[kind])||'null');
  return kind==='habits'||kind==='goals'?Array.isArray(value?.[kind])?value[kind]:[]:Array.isArray(value)?value:[];
 }catch{return []}
};
function readPayload(){
 const payload={format:'recall-full-backup',version:1,exportedAt:new Date().toISOString(),source:'automatic local recovery'};
 for(const k of KINDS)payload[k]=localRecords(k);
 return payload;
}
function open(){
 if(!('indexedDB' in window))return Promise.reject(Error('IndexedDB unavailable'));
 if(dbPromise)return dbPromise;
 dbPromise=new Promise((resolve,reject)=>{
  const req=indexedDB.open(DB,1);
  req.onupgradeneeded=()=>{if(!req.result.objectStoreNames.contains(STORE))req.result.createObjectStore(STORE,{keyPath:'savedAt'})};
  req.onsuccess=()=>resolve(req.result);
  req.onerror=()=>reject(req.error||Error('Backup storage unavailable'));
 });
 dbPromise.catch(()=>dbPromise=null);return dbPromise;
}
function saveSnapshot(db,payload){
 return new Promise((resolve,reject)=>{
  const t=db.transaction(STORE,'readwrite'),store=t.objectStore(STORE);
  store.put({savedAt:payload.exportedAt,payload});
  const keys=store.getAllKeys();
  keys.onsuccess=()=>{const all=(keys.result||[]).sort().reverse();for(const key of all.slice(7))store.delete(key)};
  t.oncomplete=resolve;t.onerror=()=>reject(t.error||Error('Write failed'));t.onabort=()=>reject(t.error||Error('Write aborted'));
 });
}
function mostRecent(db){
 return new Promise((resolve,reject)=>{
  const request=db.transaction(STORE,'readonly').objectStore(STORE).openCursor(null,'prev');
  request.onsuccess=()=>resolve(request.result?.value||null);
  request.onerror=()=>reject(request.error||Error('Read failed'));
 });
}
async function snapshot(){
 try{
  const payload=readPayload();
  const content=JSON.stringify(KINDS.map(k=>payload[k]));
  if(content===previousText)return;
  const db=await open();
  await saveSnapshot(db,payload);
  previousText=content;
  if(status)status.textContent='✓ Automatic local recovery copy updated '+new Date().toLocaleTimeString('en-US',{hour:'numeric',minute:'2-digit'})+'. Google cloud sync works separately when signed in.';
  if(button)button.disabled=false;
 }catch(e){
  if(status)status.textContent='Automatic recovery copy unavailable on this device. Use Back up everything to save a file.';
  console.warn('Recall recovery backup:',e);
 }
}
function queue(){clearTimeout(timeout);timeout=setTimeout(snapshot,300)}
for(const event of ['recall-cloud-local','recall-cloud-data'])window.addEventListener(event,queue);
window.addEventListener('focus',queue);
document.addEventListener('visibilitychange',()=>{if(!document.hidden)queue()});
if(button)button.onclick=async()=>{
 try{
  const latest=await mostRecent(await open());
  if(!latest){if(status)status.textContent='No local recovery copy yet. Try again after saving a task.';return}
  const url=URL.createObjectURL(new Blob([JSON.stringify(latest.payload,null,2)],{type:'application/json'}));
  const a=document.createElement('a');a.href=url;
  a.download='recall-auto-recovery-'+latest.savedAt.slice(0,10)+'.json';document.body.appendChild(a);a.click();a.remove();
  setTimeout(()=>URL.revokeObjectURL(url),30000);
  if(status)status.textContent='✓ Recovery file downloaded. Keep it in a private folder such as iCloud Drive.';
 }catch(e){if(status)status.textContent='Could not download local recovery copy: '+(e?.message||e)}
};
if(button)button.disabled=true;
queue();
})();