/* Recall full-site export and guarded merge restore. No credentials are exported. */
(()=>{'use strict';
const $=id=>document.getElementById(id),button=$('backupEverything'),status=$('backupStatus'),restore=$('restoreEverything'),input=$('backupRestoreFile');
if(!button)return;
const preview=$('backupRestorePreview'),confirmButton=$('confirmRestore'),cancelButton=$('cancelRestore');
const KEYS={coding:'recall-notes-v1',sql:'recall-sql-v1',goals:'recall-goals-habits-v1',habits:'recall-goals-habits-v1',structures:'recall-structures-v1',concepts:'recall-concept-reviews-v1',conflicts:'recall-sync-conflicts-v1'};
const KINDS=Object.keys(KEYS),STORAGE_KEYS=[...new Set(Object.values(KEYS))];
const readable=kind=>kind==='structures'?'Data structure notebooks':kind==='concepts'?'Pattern reviews':kind.charAt(0).toUpperCase()+kind.slice(1);
const identity=(kind,item)=>String(item?.id||(kind==='coding'?item?.number:kind==='sql'?item?.title?.trim().toLowerCase():'')||'');
const canonical=(value,root=false)=>Array.isArray(value)?value.map(x=>canonical(x)):value&&typeof value==='object'?Object.fromEntries(Object.keys(value).filter(k=>!root||k!=='recordType').sort().map(k=>[k,canonical(value[k])])):value;
const same=(a,b)=>JSON.stringify(canonical(a,true))===JSON.stringify(canonical(b,true));
const find=(data,kind,id)=>(data[kind]||[]).find(x=>identity(kind,x)===id)||null;
function localState(){
 // Read failures and malformed data must abort, rather than turn private records into empty arrays.
 const previous=Object.fromEntries(STORAGE_KEYS.map(k=>[k,localStorage.getItem(k)]));
 const parsed=Object.fromEntries(STORAGE_KEYS.map(k=>[k,previous[k]===null?null:JSON.parse(previous[k])]));
 const records={};
 for(const kind of KINDS){
  const v=parsed[KEYS[kind]],rows=kind==='goals'||kind==='habits'?v?.[kind]:v;
  if(v!==null&&!Array.isArray(rows))throw Error('Invalid device storage for '+kind+'. Export/recover the original data before restoring.');
  const ids=new Set();
  for(const item of rows||[]){const id=identity(kind,item);if(!id||ids.has(id))throw Error('Ambiguous device record identities in '+kind+'. Restore was not started.');ids.add(id)}
  records[kind]=rows||[];
 }
 return {raw:previous,records};
}
function merged(kind,base,other,preferOther=false){
 const records=new Map(base.map(item=>[identity(kind,item),item]));
 for(const item of other){const id=identity(kind,item),old=records.get(id);
  if(!old||preferOther||String(item.updatedAt||item.createdAt||'')>String(old.updatedAt||old.createdAt||''))records.set(id,item);
 }
 return [...records.values()];
}
function payloadFrom(device,cloud){
 const data={format:'recall-full-backup',version:2,exportedAt:new Date().toISOString(),source:cloud?'Cloud and this device':'This device only'};
 for(const kind of KINDS)data[kind]=merged(kind,device.records[kind],cloud?.[kind]||[]);
 // Preserve both divergent originals even when the compatible top-level merge chooses one.
 data.originals={localStorage:device.raw,cloud:cloud||null};
 return data;
}
function validate(data){
 if(!data||data.format!=='recall-full-backup'||![1,2].includes(data.version))throw Error('This is not a compatible Recall full backup.');
 for(const key of KINDS){
  if(data[key]===undefined){if(data.version===1||key==='conflicts'){data[key]=[];continue}throw Error('Missing '+key+' from the backup')}
  if(!Array.isArray(data[key])||data[key].length>50000)throw Error('Invalid '+key+' in backup');
  const ids=new Set();
  for(const item of data[key]){
   const id=identity(key,item);
   if(!item||typeof item!=='object'||Array.isArray(item)||!id||ids.has(id))throw Error('Invalid or duplicate record in '+key);
   ids.add(id);
  }
 }
 return data;
}
const counts=data=>KINDS.map(k=>readable(k)+': '+data[k].length).join(' · ');
function download(data,name){
 const blob=new Blob([JSON.stringify(data,null,2)],{type:'application/json;charset=utf-8'}),url=URL.createObjectURL(blob),a=document.createElement('a');
 a.href=url;a.download=name;a.style.display='none';document.body.appendChild(a);a.click();
 setTimeout(()=>{URL.revokeObjectURL(url);a.remove()},60000);
}
const account=()=>window.RecallCloud?.user?(window.RecallCloud.sessionToken||window.RecallCloud.user.uid):null;
function checkAccount(token){if(token!==account())throw Error('Account changed. Preview the backup again.');}
async function current(){
 const token=account();let cloud=null;
 if(token){
  if(typeof window.RecallCloud.readAll!=='function')throw Error('Cloud sync is not ready.');
  cloud=await window.RecallCloud.readAll({serverOnly:true,includeHistory:true});checkAccount(token);
 }
 const device=localState();
 return {token,device,cloud,payload:payloadFrom(device,cloud)};
}
// Recovery access is additive; it never applies or clears data. App owners can surface it in Settings.
window.RecallBackupSafety={
 keys(){return Array.from({length:localStorage.length},(_,i)=>localStorage.key(i)).filter(k=>k?.startsWith('recall-before-restore-'))},
 read(key){
  if(!key?.startsWith('recall-before-restore-'))throw Error('Invalid recovery key.');
  const raw=localStorage.getItem(key);if(raw===null)throw Error('Recovery copy is unavailable.');
  return JSON.parse(raw);
 },
 download(key){download(this.read(key),key+'.json');status.textContent='Recovery download requested. Verify the file exists in your private folder.'}
};
function durableSafety(before){
 const key='recall-before-restore-'+Date.now()+'-'+Math.random().toString(36).slice(2);
 const encoded=JSON.stringify(before.payload);
 // setItem is synchronous; a separate readback verifies storage before any record changes.
 localStorage.setItem(key,encoded);
 if(localStorage.getItem(key)!==encoded)throw Error('Before-restore recovery copy could not be verified. No restore was started.');
 return key;
}
button.onclick=async()=>{
 button.disabled=true;button.textContent='Preparing backup…';status.textContent='Gathering local and server records…';
 try{
  const {payload:data,token}=await current();checkAccount(token);
  download(data,'recall-complete-backup-'+new Date().toISOString().slice(0,10)+'.json');
  status.textContent='Backup download requested: '+counts(data)+'. '+(token?'Device and server originals included.':'Local device only.')+' Confirm the file exists in your private folder; this page cannot verify a download.';
 }catch(e){status.textContent='⚠ Backup failed: '+(e.message||e)+'. Nothing was changed.'}
 finally{button.disabled=false;button.textContent='Back up everything ↓'}
};
let pending=null,restoring=false,previewSerial=0;
if(restore&&input){
 restore.onclick=()=>input.click();
 input.onchange=async e=>{
  if(restoring)return;
  const serial=++previewSerial,file=e.target.files?.[0];e.target.value='';if(!file)return;
  pending=null;
  try{
   if(file.size>30*1024*1024)throw Error('Backup exceeds the 30 MB safety limit.');
   const data=validate(JSON.parse(await file.text())),existing=await current();
   if(serial!==previewSerial)return;
   pending={data,existing};
   if(preview){
    preview.hidden=false;
    const summary=$('backupRestoreSummary');
    if(summary)summary.textContent='Restore preview: '+counts(data)+'. Unique records stay. Matching imported records replace only versions unchanged since this preview; later edits are skipped. Exact device/server originals will be saved and read back on this device before any writes.';
   }
   if(confirmButton)confirmButton.hidden=false;if(cancelButton)cancelButton.hidden=false;
   status.textContent='Backup inspected. Review and confirm the merge. No records changed.';
  }catch(e){if(serial!==previewSerial)return;pending=null;if(preview)preview.hidden=true;status.textContent='⚠ Could not preview backup: '+(e.message||e)}
 };
}
if(cancelButton)cancelButton.onclick=()=>{if(restoring)return;previewSerial++;pending=null;if(preview)preview.hidden=true;if(confirmButton)confirmButton.hidden=true;cancelButton.hidden=true;status.textContent='Restore canceled. No records changed.'};
if(confirmButton)confirmButton.onclick=async()=>{
 if(!pending||restoring)return;
 const selected=pending;
 if(!confirm('Merge this backup? Matching unchanged records use the imported version. Newer edits and unrelated records stay. An exact recovery copy must be saved and verified on this device first.'))return;
 restoring=true;confirmButton.disabled=true;status.textContent='Reading current records and verifying recovery copy…';
 let recoveryKey='',cloudStarted=false;
 try{
  const before=await current();checkAccount(selected.existing.token);
  recoveryKey=durableSafety(before);
  // A download is supplementary; the verified browser recovery copy is the prerequisite.
  try{download(before.payload,recoveryKey+'.json')}catch{}
  const changes={},now=new Date().toISOString();let skipped=0;
  for(const kind of KINDS){
   changes[kind]=[];
   for(const incoming of selected.data[kind]){
    const id=identity(kind,incoming),local=find(before.device.records,kind,id),remote=find(before.cloud||{},kind,id);
    if(!same(local,find(selected.existing.device.records,kind,id))||!same(remote,find(selected.existing.cloud||{},kind,id))){skipped++;continue}
    if(same(local,incoming)&&(!before.token||kind==='conflicts'||same(remote,incoming)))continue;
    changes[kind].push({...incoming,updatedAt:kind==='conflicts'?incoming.updatedAt:now});
   }
  }
  let results=[];
  if(before.token){
   checkAccount(before.token);cloudStarted=true;
   await window.RecallCloud.restoreAll(changes,{expected:before.cloud,sessionToken:before.token,results});
   checkAccount(before.token);
   for(const result of results)if(result.result==='remote-newer'){
    changes[result.kind]=changes[result.kind].filter(x=>identity(result.kind,x)!==result.id);skipped++;
   }
  }
  // Async transactions can take time. Preserve device edits made while they ran, too.
  const latest=localState(),updated={};let changed=0;
  for(const kind of KINDS){
   const accepted=changes[kind].filter(item=>{
    const id=identity(kind,item),unchanged=same(find(latest.records,kind,id),find(before.device.records,kind,id));
    if(!unchanged)skipped++;return unchanged;
   });
   updated[kind]=merged(kind,latest.records[kind],accepted,true);changed+=accepted.length;
  }
  const writes=new Map();
  for(const kind of ['coding','sql','structures','concepts','conflicts']){
   // Conflict archival during cloud restore may have appended records: merge the latest list.
   if(!same(latest.records[kind],updated[kind]))writes.set(KEYS[kind],JSON.stringify(updated[kind]));
  }
  if(!same(latest.records.goals,updated.goals)||!same(latest.records.habits,updated.habits))writes.set(KEYS.goals,JSON.stringify({...JSON.parse(latest.raw[KEYS.goals]||'{}'),goals:updated.goals,habits:updated.habits}));
  const written=[];
  try{
   checkAccount(before.token);
   for(const [key,value] of writes){
    if(localStorage.getItem(key)!==latest.raw[key])throw Error('Device data changed during restore.');
    localStorage.setItem(key,value);written.push([key,value]);
    if(localStorage.getItem(key)!==value)throw Error('Device write could not be verified.');
   }
  }catch(e){
   let rollbackFailed=false;
   for(const [key,value] of written.reverse())try{
    if(localStorage.getItem(key)!==value){rollbackFailed=true;continue}
    if(latest.raw[key]===null)localStorage.removeItem(key);else localStorage.setItem(key,latest.raw[key]);
    if(localStorage.getItem(key)!==latest.raw[key])rollbackFailed=true;
   }catch{rollbackFailed=true}
   throw Error('Device restore failed'+(rollbackFailed?' and rollback was incomplete':' and device writes were rolled back')+'. Recovery copy: '+recoveryKey+'. '+e.message);
  }
  status.textContent='Merge completed on device: '+changed+' imported records; '+skipped+' changed/conflicting records skipped. Recovery copy verified in device storage: '+recoveryKey+'. Safety download requested; verify the file yourself.';
  pending=null;if(preview)preview.hidden=true;
  alert(status.textContent+' The page will reload.');location.reload();
 }catch(e){
  status.textContent='⚠ Restore stopped: '+(e.message||e)+(recoveryKey?' Recovery copy retained on device: '+recoveryKey+'.':' No restore writes were started.')+(cloudStarted?' Some server transactions may have completed; export/review before retrying.':'');
 }finally{restoring=false;confirmButton.disabled=false}
};
})();
