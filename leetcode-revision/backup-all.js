/* Recall full-site offline backup and restore.
   Backup contains only application records. Never export GitHub tokens or auth credentials. */
(()=>{'use strict';
const button=document.getElementById('backupEverything');
const status=document.getElementById('backupStatus');
const restore=document.getElementById('restoreEverything');
const input=document.getElementById('backupRestoreFile');
if(!button)return;
const KEYS={coding:'recall-notes-v1',sql:'recall-sql-v1',goals:'recall-goals-habits-v1',habits:'recall-goals-habits-v1'};
const KINDS=['coding','sql','goals','habits'];
function localRecords(kind){
 try{
  const value=JSON.parse(localStorage.getItem(KEYS[kind])||'null');
  if(kind==='goals'||kind==='habits')return Array.isArray(value?.[kind])?value[kind]:[];
  return Array.isArray(value)?value:[];
 }catch{return []}
}
function identity(kind,item){
 return String(item.id||(kind==='coding'?item.number||item.title:kind==='sql'?item.title?.trim().toLowerCase():'')||'');
}
function newest(local,remote){
 const map=new Map();
 for(const item of local){const id=identity(this,item);if(id)map.set(id,item)}
 for(const item of remote){
  const id=identity(this,item);
  if(!id)continue;
  const older=map.get(id);
  const rTime=String(item.updatedAt||item.createdAt||'');
  const lTime=String(older?.updatedAt||older?.createdAt||'');
  if(!older||rTime>=lTime)map.set(id,item);
 }
 return [...map.values()];
}
function buildPayload(cloud){
 const output={format:'recall-full-backup',version:1,exportedAt:new Date().toISOString(),source:cloud?'Firebase + browser':'browser only'};
 for(const kind of KINDS)output[kind]=newest.call(kind,localRecords(kind),Array.isArray(cloud?.[kind])?cloud[kind]:[]);
 return output;
}
function counts(data){return KINDS.map(k=>k+': '+data[k].length).join(', ')}
button.onclick=async()=>{
 button.disabled=true;button.textContent='Preparing backup…';
 status.textContent='Gathering all your saved revision notes, goals, habits and daily checklists…';
 try{
  let cloud=null;
  if(window.RecallCloud?.user){
   if(typeof window.RecallCloud.readAll!=='function')throw new Error('Cloud export is not ready. Refresh and try again.');
   cloud=await window.RecallCloud.readAll();
  }
  const payload=buildPayload(cloud);
  const text=JSON.stringify(payload,null,2);
  const blob=new Blob([text],{type:'application/json;charset=utf-8'});
  const url=URL.createObjectURL(blob);
  const a=document.createElement('a');a.href=url;
  a.download='recall-complete-backup-'+new Date().toISOString().slice(0,10)+'.json';
  a.style.display='none';document.body.appendChild(a);a.click();
  setTimeout(()=>{URL.revokeObjectURL(url);a.remove()},60000);
  status.textContent='✓ Backup prepared ('+counts(payload)+'). '+(cloud?'Cloud and browser records included.':'Only this browser was included. Sign in with Google for all-device cloud records.')+' Keep the downloaded file in a private folder such as iCloud Drive.';
 }catch(err){status.textContent='Backup failed: '+(err?.message||err)+'. No records were deleted.'}
 finally{button.disabled=false;button.textContent='Back up everything ↓'}
};
if(restore&&input){
 restore.onclick=()=>input.click();
 input.onchange=async e=>{
  const file=e.target.files?.[0];if(!file)return;
  try{
   if(file.size>30*1024*1024)throw Error('Backup file is unusually large (over 30 MB).');
   const payload=JSON.parse(await file.text());
   if(payload.format!=='recall-full-backup'||payload.version!==1||KINDS.some(k=>!Array.isArray(payload[k])))throw Error('Not a compatible Recall full backup.');
   const count=KINDS.reduce((a,k)=>a+payload[k].length,0);
   if(!confirm('Restore '+count+' records from this backup? Existing records with the same IDs may be replaced. This cannot be undone without another backup.'))return;
   const now=new Date().toISOString();
   const updated=Object.fromEntries(KINDS.map(k=>[k,payload[k].map(x=>({...x,updatedAt:now}))]));
   // Restore browser copies first so users never lose the file's records if cloud is unavailable.
   localStorage.setItem(KEYS.coding,JSON.stringify(updated.coding));
   localStorage.setItem(KEYS.sql,JSON.stringify(updated.sql));
   localStorage.setItem(KEYS.goals,JSON.stringify({goals:updated.goals,habits:updated.habits}));
   let cloudWarning='';
   if(window.RecallCloud?.user){
    status.textContent='Restoring your records to Firebase…';
    try{await window.RecallCloud.restoreAll(updated)}catch(err){cloudWarning=' Cloud restore was incomplete: '+(err?.message||err)+'.'}
   }else cloudWarning=' Sign in with Google on both sections to sync the restored local records.';
   status.textContent='✓ '+count+' records restored locally.'+cloudWarning;
   alert(status.textContent+' The page will reload.');
   location.reload();
  }catch(err){status.textContent='Restore failed: '+(err?.message||err)}
  finally{e.target.value=''}
 };
}
})();
