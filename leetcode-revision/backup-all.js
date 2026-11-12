/* Recall full-site export and guarded restore. Never includes credentials or public GitHub data. */
(()=>{'use strict';
const $=id=>document.getElementById(id),button=$('backupEverything'),status=$('backupStatus'),restore=$('restoreEverything'),input=$('backupRestoreFile');
if(!button)return;
const preview=$('backupRestorePreview'),confirmButton=$('confirmRestore'),cancelButton=$('cancelRestore');
const KEYS={coding:'recall-notes-v1',sql:'recall-sql-v1',goals:'recall-goals-habits-v1',habits:'recall-goals-habits-v1',structures:'recall-structures-v1',concepts:'recall-concept-reviews-v1',conflicts:'recall-sync-conflicts-v1'};
const KINDS=Object.keys(KEYS);
const readable=kind=>kind==='structures'?'Data structure notebooks':kind==='concepts'?'Pattern reviews':kind.charAt(0).toUpperCase()+kind.slice(1);
const localRecords=kind=>{try{const v=JSON.parse(localStorage.getItem(KEYS[kind])||'null');return kind==='goals'||kind==='habits'?Array.isArray(v?.[kind])?v[kind]:[]:Array.isArray(v)?v:[]}catch{return []}};
const identity=(kind,item)=>String(item?.id||(kind==='coding'?item?.number:kind==='sql'?item?.title?.trim().toLowerCase():'')||'');
function merged(kind,base,other,preferOther=false){
 const records=new Map();
 for(const item of base){const id=identity(kind,item);if(id)records.set(id,item)}
 for(const item of other){const id=identity(kind,item);if(!id)continue;
  const old=records.get(id),fresh=String(item.updatedAt||item.createdAt||''),older=String(old?.updatedAt||old?.createdAt||'');
  if(!old||preferOther||fresh>older)records.set(id,item);
 }
 return [...records.values()];
}
function payloadFrom(cloud){
 const data={format:'recall-full-backup',version:2,exportedAt:new Date().toISOString(),source:cloud?'Cloud and this device':'This device only'};
 for(const kind of KINDS)data[kind]=merged(kind,localRecords(kind),Array.isArray(cloud?.[kind])?cloud[kind]:[]);
 return data;
}
function validate(data){
 if(!data||data.format!=='recall-full-backup'||![1,2].includes(data.version))throw Error('This is not a compatible Recall full backup.');
 for(const key of KINDS){
  if(data[key]===undefined){if(data.version===1||key==='conflicts'){data[key]=[];continue}throw Error('Missing '+key+' from the backup')}
  if(!Array.isArray(data[key])||data[key].length>50000)throw Error('Invalid '+key+' in backup');
  if(data[key].some(item=>!item||typeof item!=='object'||!identity(key,item)))throw Error('Invalid record in '+key);
 }
 return data;
}
const counts=data=>KINDS.map(k=>readable(k)+': '+data[k].length).join(' · ');
function download(data,name){
 const blob=new Blob([JSON.stringify(data,null,2)],{type:'application/json;charset=utf-8'}),url=URL.createObjectURL(blob),a=document.createElement('a');
 a.href=url;a.download=name;a.style.display='none';document.body.appendChild(a);a.click();
 setTimeout(()=>{URL.revokeObjectURL(url);a.remove()},60000);
}
async function current(){
 if(window.RecallCloud?.user){if(typeof window.RecallCloud.readAll!=='function')throw Error('Cloud sync is not ready. Refresh this page and try again.');return payloadFrom(await window.RecallCloud.readAll())}
 return payloadFrom(null);
}
button.onclick=async()=>{
 button.disabled=true;button.textContent='Preparing backup…';status.textContent='Gathering local and cloud records…';
 try{
  const data=await current();
  download(data,'recall-complete-backup-'+new Date().toISOString().slice(0,10)+'.json');
  status.textContent='✓ Backup prepared: '+counts(data)+'. '+(window.RecallCloud?.user?'Device and cloud records included.':'Local device only. Sign in for cloud records.')+' Keep your copy in a private folder.';
 }catch(e){status.textContent='⚠ Backup failed: '+(e.message||e)+'. Nothing was changed.'}
 finally{button.disabled=false;button.textContent='Back up everything ↓'}
};
let pending=null;
if(restore&&input){
 restore.onclick=()=>input.click();
 input.onchange=async e=>{
  const file=e.target.files?.[0];e.target.value='';if(!file)return;
  try{
   if(file.size>30*1024*1024)throw Error('Backup exceeds the 30 MB safety limit.');
   const data=validate(JSON.parse(await file.text()));
   const existing=await current(),old=KINDS.map(kind=>({kind,n:data[kind].length,shared:data[kind].filter(item=>existing[kind].some(x=>identity(kind,x)===identity(kind,item))).length}));
   pending={data,existing};
   if(preview){
    preview.hidden=false;
    const summary=$('backupRestoreSummary');
    if(summary)summary.textContent='Restore preview: '+old.map(x=>readable(x.kind)+' '+x.n+' ('+x.shared+' matching IDs)').join(' · ')+'. Existing unique records will be kept. Matching IDs from the selected backup will replace current versions.';
   }
   if(confirmButton)confirmButton.hidden=false;
   if(cancelButton)cancelButton.hidden=false;
   status.textContent='Backup inspected. Review the counts and confirm the merge below. No records have changed yet.';
  }catch(e){pending=null;if(preview)preview.hidden=true;if(confirmButton)confirmButton.hidden=true;if(cancelButton)cancelButton.hidden=true;status.textContent='⚠ Could not preview backup: '+(e.message||e)}
 };
}
if(cancelButton)cancelButton.onclick=()=>{pending=null;if(preview)preview.hidden=true;if(confirmButton)confirmButton.hidden=true;cancelButton.hidden=true;status.textContent='Restore canceled. No records changed.'};
if(confirmButton)confirmButton.onclick=async()=>{
 if(!pending)return;
 const {data,existing}=pending;
 if(!confirm('Merge this backup into Recall? All nonmatching records will be preserved, but matching records will use the imported version. A safety backup will download first.'))return;
 confirmButton.disabled=true;status.textContent='Preparing safety copy and merging records…';
 try{
  const before=existing;
  download(before,'recall-before-restore-'+new Date().toISOString().replace(/[:.]/g,'-')+'.json');
  const now=new Date().toISOString(),updated={};
  for(const kind of KINDS){
   const incoming=data[kind].map(x=>({...x,updatedAt:now}));
   updated[kind]=merged(kind,existing[kind],incoming,true);
  }
  // Stage all previous values in memory; roll back local writes if any setItem fails.
  const previous=Object.fromEntries([...new Set(Object.values(KEYS))].map(k=>[k,localStorage.getItem(k)]));
  try{
   for(const kind of ['coding','sql','structures','concepts','conflicts'])localStorage.setItem(KEYS[kind],JSON.stringify(updated[kind]));
   localStorage.setItem(KEYS.goals,JSON.stringify({goals:updated.goals,habits:updated.habits}));
  }catch(e){
   for(const [key,value] of Object.entries(previous))try{if(value===null)localStorage.removeItem(key);else localStorage.setItem(key,value)}catch{}
   throw Error('Local storage could not complete the restore. Original records were retained where possible.');
  }
  let warning='';
  if(window.RecallCloud?.user){try{await window.RecallCloud.restoreAll(updated)}catch(e){warning=' Cloud restore was incomplete: '+(e.message||e)+'. Check your sign-in and retry when online.'}}
  else warning=' Sign in on each page with the same account to sync imported data.';
  const n=KINDS.reduce((sum,k)=>sum+updated[k].length,0);
  status.textContent='✓ Merge completed locally ('+n+' records). A before-restore safety copy was downloaded.'+warning;
  pending=null;if(preview)preview.hidden=true;
  alert(status.textContent+' The page will reload.');
  location.reload();
 }catch(e){status.textContent='⚠ Restore failed: '+(e.message||e)+'. Check the downloaded safety copy.'}
 finally{confirmButton.disabled=false}
};
})();
