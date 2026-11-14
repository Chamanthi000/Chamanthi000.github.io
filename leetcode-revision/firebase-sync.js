// Load the SDK dynamically so a missing module is reported on screen.
const status=document.getElementById('firebaseStatus');
const login=document.getElementById('firebaseLogin');
const logout=document.getElementById('firebaseLogout');
const show=s=>{if(status)status.textContent=s;};
// Show the actual signed-in account on Coding, SQL, Goals and guide pages.
const accountLabel=document.createElement('small');
accountLabel.id='recallSignedInEmail';
accountLabel.setAttribute('aria-live','polite');
accountLabel.style.cssText='display:block;font:500 11px/1.35 -apple-system,BlinkMacSystemFont,"DM Sans",sans-serif;color:#708474;max-width:180px;overflow-wrap:anywhere;text-align:right;margin:2px 0;';
accountLabel.textContent='Not signed in';
const accountHost=login?.closest('.topActions')||logout?.closest('.topActions');
if(accountHost){
 const group=document.createElement('div');
 group.style.cssText='display:flex;flex-direction:column;align-items:flex-end;gap:2px;min-width:0;max-width:100%;';
 // Keep the email directly beneath the sign-in/sign-out control on iPhone.
 if(login)group.appendChild(login);
 if(logout)group.appendChild(logout);
 group.appendChild(accountLabel);
 accountHost.appendChild(group);
}else{
 const parent=logout?.parentElement||login?.parentElement||status?.parentElement;
 if(parent)parent.appendChild(accountLabel);
 accountLabel.style.textAlign='left';
}
function displayAccount(user){
 accountLabel.textContent=user?.email?'Signed in: '+user.email:'Not signed in';
 accountLabel.title=user?.email?'Cloud notes belong to '+user.email+'. Use this same account on every device.':'Sign in with the same Google email on every device to sync notes.';
}
const diagnostic=code=>{
  if(code==='auth/unauthorized-domain')return 'Google sign-in blocked: add chamanthi000.github.io to Firebase Authentication → Settings → Authorized domains.';
  if(code==='auth/operation-not-allowed')return 'Google sign-in is not enabled in Firebase Authentication → Sign-in method.';
  if(code==='auth/popup-blocked')return 'Your browser blocked the Google sign-in popup. Allow popups for chamanthi000.github.io and retry.';
  if(code==='auth/popup-closed-by-user')return 'Google sign-in was closed before completion. Click Sign in to retry.';
  if(code==='auth/network-request-failed')return 'Network request failed. Check your connection, content blockers, or VPN and try again.';
  if(code==='auth/unauthorized-continue-uri')return 'Sign-in redirect domain is unauthorized in Firebase.';
  return 'Google sign-in failed ('+(code||'unknown error')+'). Check browser settings and Firebase Authentication.';
};
let initialized=false;
let requestLogin=null;
if(login)login.addEventListener('click',async()=>{
  show('Opening Google sign-in…');
  if(!initialized){show('Firebase is still loading or blocked. Please refresh and check your browser content blockers.');return}
  try{await requestLogin()}catch(e){show('Sign-in error: '+(e.message||e))}
});
async function boot(){
try{
show('Loading Firebase…');
const base='https://www.gstatic.com/firebasejs/13.2.0/';
const [{initializeApp},{getAuth,GoogleAuthProvider,signInWithPopup,signInWithRedirect,getRedirectResult,signOut,onAuthStateChanged},{getFirestore,collection,doc,onSnapshot,getDocsFromServer,runTransaction}]=await Promise.all([
  import(base+'firebase-app.js'),import(base+'firebase-auth.js'),import(base+'firebase-firestore.js')
]);
const app=initializeApp({apiKey:"AIzaSyCmIM8dCDg9H8D52ZXYPGxEpTV85pBciDQ",authDomain:"recall-46335.firebaseapp.com",projectId:"recall-46335",storageBucket:"recall-46335.firebasestorage.app",messagingSenderId:"611507493769",appId:"1:611507493769:web:708b8c892c47aed721df58"});
const auth=getAuth(app),db=getFirestore(app),provider=new GoogleAuthProvider();
const state={user:null,ready:false,unsub:[],pending:new Map(),timers:new Map(),retries:new Map(),writeErrors:new Map(),snapshots:{coding:[],sql:[],goals:[],habits:[],structures:[],concepts:[]},initial:new Set(),epoch:0,confirmed:new Set(),subscriptionErrors:new Map(),blocked:new Map(),localFailure:false,localFailures:new Set(),conflicts:new Set(),deviceOwner:null,accountPaused:false,accountPauseReason:''};
const kinds=['coding','sql','goals','habits','structures','concepts'];
const page=location.pathname.endsWith('goals.html')?['goals','habits']:location.pathname.endsWith('sql-pattern-guide.html')?['concepts']:['coding','sql','structures','concepts'];
const statusText=s=>{if(status)status.textContent=s;window.dispatchEvent(new CustomEvent('recall-cloud-status',{detail:{message:s}}))};
function idOf(kind,item){return String(item.id||(kind==='coding'?item.number:'')||(kind==='sql'?item.title?.trim().toLowerCase():''));}
// Structure notebooks share the authorized coding collection; typed records stay separate.
function list(kind,session){return collection(db,'users',session?.uid||state.user.uid,kind==='structures'||kind==='concepts'?'coding':kind)}
function isMember(kind,item){return kind==='structures'?item.recordType==='structure':kind==='concepts'?item.recordType==='conceptReview':kind==='coding'?item.recordType!=='structure'&&item.recordType!=='conceptReview'&&item.recordType!=='syncBackup':item.recordType!=='syncBackup'}
function prepare(kind,item){return kind==='structures'?{...item,recordType:'structure'}:kind==='concepts'?{...item,recordType:'conceptReview'}:item}
function cloudDocId(kind,item){return kind==='structures'?'structure-'+idOf(kind,item):kind==='concepts'?'concept-'+idOf(kind,item):idOf(kind,item)}
const LOCAL_KEYS={coding:'recall-notes-v1',sql:'recall-sql-v1',goals:'recall-goals-habits-v1',habits:'recall-goals-habits-v1',structures:'recall-structures-v1',concepts:'recall-concept-reviews-v1'};
function deviceRecords(kind){
 const raw=localStorage.getItem(LOCAL_KEYS[kind]),parsed=raw===null?null:JSON.parse(raw);
 const rows=kind==='goals'||kind==='habits'?parsed?.[kind]:parsed;
 if(raw!==null&&!Array.isArray(rows))throw Error('Invalid device storage');
 return rows||[];
}
function deviceHas(kind,items){
 try{const rows=deviceRecords(kind);return items.every(item=>rows.some(x=>idOf(kind,x)===idOf(kind,item)&&sameRecord(x,item)))}catch{return false}
}
function verifyDevice(kind,items){
 if(deviceHas(kind,items))state.localFailures.delete(kind);else state.localFailures.add(kind);
 state.localFailure=state.localFailures.size>0;
}
function send(kind){
 // Disk may contain another tab's edit that the app's in-memory accessor has not seen.
 // Never dispatch a replacement until every different persisted copy is retained or archived.
 let stored;
 try{stored=deviceRecords(kind)}catch{
  state.localFailures.add(kind);state.localFailure=true;
  statusText('⚠ Device storage unreadable · Cloud records were not applied; export before leaving');return;
 }
 const output=new Map(state.snapshots[kind].map(x=>[idOf(kind,x),x]));
 for(const item of stored){
  const id=idOf(kind,item),candidate=output.get(id);
  if(!candidate){output.set(id,item);queue(kind,item)}
  else if(!sameRecord(item,candidate)){
   const localStamp=String(item.updatedAt||item.createdAt||''),candidateStamp=String(candidate.updatedAt||candidate.createdAt||'');
   if(localStamp>candidateStamp){
    output.set(id,item);queue(kind,item);
   }else{
    const archived=holdConflict(kind,item,candidate);
    // App merge listeners retain tied device versions. Keep that output contract;
    // both divergent versions stay in the verified conflict archive.
    if(!archived||localStamp===candidateStamp)output.set(id,item);
   }
  }
 }
 state.snapshots[kind]=[...output.values()];
 window.dispatchEvent(new CustomEvent('recall-cloud-data',{detail:{kind,items:state.snapshots[kind]}}));
 verifyDevice(kind,state.snapshots[kind]);
 if(state.localFailure)statusText('⚠ Device save failed · Export a backup before leaving');
}
const subscriptionFailure=()=>state.subscriptionErrors.size?'Cloud sync failed · '+[...state.subscriptionErrors].map(([kind,message])=>kind+': '+message).join(' · ')+' · Refresh or sign in again to reconnect':'';
const WRITE_ERROR_ACTIONS=new Map([
 ['permission-denied','Check account permissions for cloud saves.'],
 ['unauthenticated','Sign in again to retry cloud saves.'],
 ['unavailable','Check your network connection and retry.'],
 ['deadline-exceeded','Check your network connection and retry.'],
 ['resource-exhausted','Check cloud quota or try again later.'],
 ['invalid-argument','Check the record format before retrying.'],
 ['unknown','Try again; if this continues, refresh or sign in again.']
]);
function writeErrorCode(error){
 const code=typeof error?.code==='string'?error.code.replace(/^firestore\//,''):'unknown';
 return WRITE_ERROR_ACTIONS.has(code)?code:'unknown';
}
const writeFailure=()=>state.writeErrors.size?'Cloud save failed · Retrying automatically · '+[...state.writeErrors.values()].map(({kind,code})=>kind+': '+code+' · '+WRITE_ERROR_ACTIONS.get(code)).join(' · '):'';
function syncStatus(){
 if(state.accountPaused){statusText(state.accountPauseReason);return}
 const failure=subscriptionFailure(),write=writeFailure();
 const report=message=>statusText(message+(write?' · '+write:''));
 if(state.localFailure){report('⚠ Device save failed · Export a backup before leaving'+(failure?' · '+failure:''));return}
 if(failure){report('⚠ '+failure);return}
 if(state.blocked.size||state.conflicts.size){report('⚠ Conflicts · Device copies retained; review or export conflict copies');return}
 if(typeof navigator!=='undefined'&&navigator.onLine===false){report('Offline · Cloud changes waiting for reconnection');return}
 if(write){statusText('⚠ '+write+' · Device copy retained');return}
 if(state.pending.size){statusText('✓ Saved on device · Waiting for cloud acknowledgement');return}
 if(page.every(k=>state.confirmed.has(k)))statusText('✓ Cloud confirmed · Server acknowledged current notebooks');
 else statusText('Waiting · Cached data or remaining notebooks need server acknowledgement');
}

const HISTORY_PREFIX='recall-history-',HISTORY_LIMIT=12,HISTORY_INTERVAL_MS=30*60*1000,HISTORY_BYTES_LIMIT=450000;
const withoutRecordType=item=>{const out={...item};delete out.recordType;return out};
function sameRecord(a,b){
 const normalize=(value,root=false)=>{
  if(Array.isArray(value))return value.map(x=>normalize(x));
  if(value&&typeof value==='object')return Object.fromEntries(Object.keys(value).filter(key=>!root||key!=='recordType').sort().map(key=>[key,normalize(value[key])]));
  return value;
 };
 return JSON.stringify(normalize(a,true))===JSON.stringify(normalize(b,true));
}
function historyId(kind,item){return HISTORY_PREFIX+kind+'-'+encodeURIComponent(idOf(kind,item)).slice(0,900)}
function cappedHistory(entries){
 const out=entries.slice(-HISTORY_LIMIT);
 while(out.length&&new TextEncoder().encode(JSON.stringify(out)).length>HISTORY_BYTES_LIMIT)out.shift();
 return out;
}
function captureSession(){return {uid:state.user?.uid,epoch:state.epoch}}
function assertSession(session){
 if(session&&(!session.uid||session.uid!==state.user?.uid||session.epoch!==state.epoch))throw Error('Account changed; operation stopped.');
}
async function writeWithHistory(kind,value,options={}){
 const session=options.session||(state.user?captureSession():null);
 assertSession(session);
 const ref=doc(list(kind,session),cloudDocId(kind,value));
 const backupRef=doc(list(kind,session),historyId(kind,value));
 return runTransaction(db,async tx=>{
  // All reads precede every write; concurrent tabs retry against fresh server state.
  assertSession(session);
  const current=await tx.get(ref);
  assertSession(session);
  const old=current.exists()?current.data():null;
  const oldClean=old?withoutRecordType(old):null;
  if(old&&sameRecord(oldClean,value))return {result:'unchanged'};
  const oldStamp=String(old?.updatedAt||old?.createdAt||'');
  const incomingStamp=String(value.updatedAt||value.createdAt||'');
  const guarded=Object.prototype.hasOwnProperty.call(options,'expected');
  if((guarded&&!sameRecord(oldClean,options.expected))||(!guarded&&old&&(oldStamp>incomingStamp||(oldStamp===incomingStamp&&!sameRecord(oldClean,value))))){
   return {result:'remote-newer',previous:oldClean};
  }
  const history=old?await tx.get(backupRef):null;
  assertSession(session);
  let archived=false;
  if(old){
   const previousHistory=Array.isArray(history?.data()?.versions)?history.data().versions:[];
   const last=previousHistory[previousHistory.length-1];
   const now=Date.now();
   if(options.forceHistory||!last||now-Date.parse(last.archivedAt)>=HISTORY_INTERVAL_MS){
    const versions=cappedHistory([...previousHistory,{archivedAt:new Date(now).toISOString(),value:oldClean}]);
    if(versions.length&&versions[versions.length-1].value&&sameRecord(versions[versions.length-1].value,oldClean)){
     tx.set(backupRef,{recordType:'syncBackup',originKind:kind,originId:idOf(kind,value),updatedAt:new Date(now).toISOString(),versions});
     archived=true;
    }
   }
  }
  if(options.forceHistory&&old&&!archived)throw Error('Previous cloud version could not be archived; restore stopped.');
  assertSession(session);
  tx.set(ref,prepare(kind,value));
  return {result:'saved',archived};
 });
}
async function downloadCloudHistory(){
 if(!state.user){statusText('Sign in with Google to download private cloud version history');return}
 const session=captureSession();
 try{
  statusText('Preparing private cloud version-history download…');
  const snapshots=await Promise.all(['coding','sql','goals','habits'].map(kind=>getDocsFromServer(collection(db,'users',session.uid,kind))));
  assertSession(session);
  const versions=snapshots.flatMap(snapshot=>snapshot.docs.map(x=>x.data()).filter(x=>x.recordType==='syncBackup'));
  const file={format:'recall-cloud-version-history',version:1,exportedAt:new Date().toISOString(),versions};
  const blob=new Blob([JSON.stringify(file,null,2)],{type:'application/json'});
  const url=URL.createObjectURL(blob),a=document.createElement('a');
  a.href=url;a.download='recall-private-cloud-history-'+new Date().toISOString().slice(0,10)+'.json';
  document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),30000);
  statusText('Cloud history download requested · '+versions.length+' record histories · Verify the file exists in your private folder');
 }catch(e){if(session.epoch===state.epoch&&session.uid===state.user?.uid)statusText('⚠ Could not download cloud history: '+(e.message||e));}
}
const historyButton=document.getElementById('downloadCloudHistory');
if(historyButton)historyButton.addEventListener('click',downloadCloudHistory);


const CONFLICT_KEY='recall-sync-conflicts-v1';
function archiveConflict(kind,device,cloud){
 if(sameRecord(device,cloud))return true;
 try{
  const raw=localStorage.getItem(CONFLICT_KEY),records=raw===null?[]:JSON.parse(raw);
  if(!Array.isArray(records))throw Error('Invalid conflict storage');
  // Include the complete versions in identity: tied timestamps can contain multiple edits.
  const entry={kind,recordId:idOf(kind,device||cloud),device:device?withoutRecordType(device):null,cloud:cloud?withoutRecordType(cloud):null};
  const id=JSON.stringify([state.user?.uid||'',kind,entry.recordId,entry.device,entry.cloud]);
  if(records.some(x=>x.id===id))return true;
  records.push({...entry,id,savedAt:new Date().toISOString()});
  const encoded=JSON.stringify(records);
  // Never evict an unreviewed recovery copy merely to fit another one.
  localStorage.setItem(CONFLICT_KEY,encoded);
  if(localStorage.getItem(CONFLICT_KEY)!==encoded)throw Error('Conflict readback failed');
  window.dispatchEvent(new CustomEvent('recall-sync-conflict',{detail:{kind,count:records.length}}));
  return true;
 }catch(e){statusText('⚠ Conflict archive failed · Device version retained; export before editing');return false}
}
window.RecallSyncConflicts={
 read(){
  try{const data=JSON.parse(localStorage.getItem(CONFLICT_KEY)||'[]');if(!Array.isArray(data))throw Error('Invalid conflict storage');return data}
  catch(e){statusText('⚠ Conflict storage unavailable · Export device records before leaving');throw e}
 },
 download(){
  let data;try{data=this.read()}catch{return}
  if(!data.length){statusText('No version conflict copies on this device');return}
  const blob=new Blob([JSON.stringify({format:'recall-conflict-copies',version:1,exportedAt:new Date().toISOString(),records:data},null,2)],{type:'application/json'}),url=URL.createObjectURL(blob),a=document.createElement('a');
  a.href=url;a.download='recall-conflict-copies-'+new Date().toISOString().slice(0,10)+'.json';document.body.appendChild(a);a.click();a.remove();
  statusText('Conflict download requested · Verify the file exists in your private folder');
  setTimeout(()=>URL.revokeObjectURL(url),30000);
 }
};
const conflictButton=document.getElementById('downloadConflictCopies');
if(conflictButton)conflictButton.addEventListener('click',()=>window.RecallSyncConflicts.download());

function holdConflict(kind,device,cloud){
 const key=kind+':'+idOf(kind,device||cloud);
 state.conflicts.add(key);
 if(!archiveConflict(kind,device,cloud)){state.blocked.set(key,device);return false}
 state.blocked.delete(key);return true;
}
function putLocal(kind,items){
 if(!state.user||!Array.isArray(items))return;
 if(state.accountPaused){syncStatus();return}
 verifyDevice(kind,items);
 const cloudIds=new Map((state.snapshots[kind]||[]).map(item=>[idOf(kind,item),item]));
 for(const item of items){
  const id=idOf(kind,item);if(!id)continue;
  const old=cloudIds.get(id);
  const localStamp=String(item.updatedAt||item.createdAt||''),remoteStamp=String(old?.updatedAt||old?.createdAt||'');
  if(old&&remoteStamp>=localStamp&&!sameRecord(item,old)){
   holdConflict(kind,item,old);continue;
  }
  if(!old||localStamp>remoteStamp)queue(kind,item);
 }
 syncStatus();
}
function arm(key,delay){
 clearTimeout(state.timers.get(key));
 const session=captureSession();
 state.timers.set(key,setTimeout(async()=>{
  if(session.epoch!==state.epoch||session.uid!==state.user?.uid)return;
  const value=state.pending.get(key);
  if(!value)return;
  if(typeof navigator!=='undefined'&&navigator.onLine===false){syncStatus();return}
  const kind=key.slice(0,key.indexOf(':'));
  try{
   if(state.subscriptionErrors.size||state.writeErrors.size)syncStatus();
   else statusText(state.localFailure?'⚠ Device save failed · Cloud syncing…':'Syncing · Waiting for server acknowledgement');
   const outcome=await writeWithHistory(kind,value);
   assertSession(session);
   if(outcome.result==='remote-newer'){
    if(!holdConflict(kind,value,outcome.previous)){syncStatus();return}
    // Only release this version, never a newer edit queued during the transaction.
    if(state.pending.get(key)===value){state.pending.delete(key);state.writeErrors.delete(key)}
    state.retries.delete(key);
    if(!state.pending.has(key)){
     state.snapshots[kind]=(state.snapshots[kind]||[]).filter(item=>idOf(kind,item)!==idOf(kind,value));
     if(outcome.previous)state.snapshots[kind].push(outcome.previous);
     send(kind);
    }
    syncStatus();return;
   }
   if(state.pending.get(key)===value){state.pending.delete(key);state.writeErrors.delete(key)}
   state.retries.delete(key);
   if(state.localFailure||state.subscriptionErrors.size||state.writeErrors.size||state.blocked.size||state.conflicts.size||state.pending.size)syncStatus();
   else statusText('✓ Cloud confirmed · Server acknowledged save'+(outcome.archived?' · Previous version archived':''));
  }catch(e){
   if(session.epoch!==state.epoch||session.uid!==state.user?.uid)return;
   const count=(state.retries.get(key)||0)+1;state.retries.set(key,count);
   if(state.pending.get(key)===value)arm(key,Math.min(60000,1000*2**Math.min(count,6)));
   // Only the current queued version can report a failure; never expose exception text.
   if(state.pending.get(key)===value)state.writeErrors.set(key,{kind:kinds.includes(kind)?kind:'unknown',code:writeErrorCode(e)});
   syncStatus();
  }
 },delay));
}
function queue(kind,item){
 if(!state.user||state.accountPaused)return;
 const key=kind+':'+idOf(kind,item),earlier=state.pending.get(key);
 if(!earlier||String(item.updatedAt||'')>=String(earlier.updatedAt||''))state.pending.set(key,JSON.parse(JSON.stringify(item)));
 state.retries.set(key,0);arm(key,180);
}
async function setup(user){
for(const u of state.unsub)u();for(const timer of state.timers.values())clearTimeout(timer);
state.epoch++;state.timers.clear();state.retries.clear();state.writeErrors.clear();state.unsub=[];state.pending.clear();state.initial.clear();state.confirmed.clear();state.subscriptionErrors.clear();state.blocked.clear();
state.snapshots=Object.fromEntries(kinds.map(k=>[k,[]]));state.user=user;state.ready=!!user;displayAccount(user);
if(!user){statusText('Cloud signed out · Device storage is separate');if(login)login.hidden=false;if(logout)logout.hidden=true;return}
// Device records are shared by the app. Never silently migrate one account's notes to another.
try{
 const persisted=localStorage.getItem('recall-device-owner-v1'),owner=persisted||state.deviceOwner;
 state.deviceOwner=owner||user.uid;
 if(!persisted){localStorage.setItem('recall-device-owner-v1',state.deviceOwner);if(localStorage.getItem('recall-device-owner-v1')!==state.deviceOwner)throw Error('Owner readback failed');}
 state.accountPaused=state.deviceOwner!==user.uid;
 state.accountPauseReason='⚠ Account differs from device owner · Automatic sync paused; export and review account data';
}catch{state.accountPaused=true;state.accountPauseReason='⚠ Device account storage failed · Automatic sync paused; export before leaving'}
if(state.accountPaused){syncStatus();if(login)login.hidden=true;if(logout)logout.hidden=false;return}
try{for(const copy of window.RecallSyncConflicts.read())state.conflicts.add(copy.kind+':'+copy.recordId)}
catch{state.blocked.set('conflict-storage',null)}
const session=captureSession();
if(login)login.hidden=true;if(logout)logout.hidden=false;statusText('Waiting · Connecting to cloud…');
for(const kind of page){
 let terminated=false;
 const unsub=onSnapshot(list(kind,session),{includeMetadataChanges:true},snapshot=>{
  if(terminated||session.epoch!==state.epoch||session.uid!==state.user?.uid)return;
  const remote=snapshot.docs.map(x=>x.data()).filter(x=>isMember(kind,x));
  const acknowledged=!snapshot.metadata?.fromCache&&!snapshot.metadata?.hasPendingWrites;
  if(acknowledged)state.confirmed.add(kind);else state.confirmed.delete(kind);
  state.snapshots[kind]=remote;
  const existing=window.RecallLocal?.(kind)||[];
  state.initial.add(kind);
  const output=new Map(remote.map(x=>[idOf(kind,x),x]));
  for(const item of existing){
   const id=idOf(kind,item),key=kind+':'+id,cloud=output.get(id);
   const localStamp=String(item.updatedAt||item.createdAt||''),cloudStamp=String(cloud?.updatedAt||cloud?.createdAt||'');
   if(!cloud||localStamp>cloudStamp){
    output.set(id,item);
    // Cache absence is not proof that this record is missing on the server.
    if(acknowledged)queue(kind,item);
   }else if(!sameRecord(item,cloud)){
    if(!holdConflict(kind,item,cloud)||state.pending.has(key))output.set(id,item);
   }
  }
  for(const [key,item] of state.pending)if(key.startsWith(kind+':'))output.set(idOf(kind,item),item);
  state.snapshots[kind]=[...output.values()];send(kind);syncStatus();
 },e=>{
  if(session.epoch!==state.epoch||session.uid!==state.user?.uid)return;
  // Firestore listener errors are terminal; another notebook or completed write
  // cannot establish that this subscription is healthy again.
  terminated=true;state.confirmed.delete(kind);
  state.subscriptionErrors.set(kind,e?.message||String(e));syncStatus();
 });
 state.unsub.push(unsub);
}}
onAuthStateChanged(auth,setup);
getRedirectResult(auth).catch(e=>statusText(diagnostic(e.code)+' '+(e.message||'')));
requestLogin=async()=>{try{await signInWithPopup(auth,provider)}catch(e){
  if(e.code==='auth/popup-blocked'||e.code==='auth/operation-not-supported-in-this-environment'){
    statusText('Popup sign-in unavailable. Switching to Google redirect…');
    try{await signInWithRedirect(auth,provider)}catch(error){statusText(diagnostic(error.code)+' '+(error.message||''))}
  }else{statusText(diagnostic(e.code)+' '+(e.message||''))}
}};initialized=true;window.dispatchEvent(new Event('recall-firebase-ready'));show('Firebase ready · Sign in with Google to enable cloud sync');
if(logout)logout.onclick=()=>signOut(auth);
window.addEventListener('recall-cloud-local',e=>{
 const {kind,items}=e.detail||{};if(!kinds.includes(kind)||!Array.isArray(items))return;
 if(!state.user){verifyDevice(kind,items);statusText(state.localFailure?'⚠ Device save failed · Export before leaving':'✓ Saved on device · Sign in for cloud sync');return}
 putLocal(kind,items);
});
window.addEventListener('online',()=>{if(!state.user)return;syncStatus();for(const key of state.pending.keys())arm(key,0)});
window.addEventListener('offline',()=>{if(state.user)syncStatus()});
document.addEventListener('visibilitychange',()=>{if(!document.hidden&&state.user&&state.pending.size){for(const key of state.pending.keys())arm(key,0)}});
window.RecallCloud={
  get user(){return state.user},
  sync(kind,items){if(state.user)putLocal(kind,items)},
  get ready(){return initialized},
  get pendingCount(){return state.pending.size},
  // Detached, read-only diagnostics: no record keys, account details or exception messages.
  get writeErrors(){return Object.freeze([...state.writeErrors.values()].map(({kind,code})=>Object.freeze({kind,code})))},
  downloadCloudHistory,
  // Full cloud read across all record types (concepts share the coding collection).
  get sessionToken(){return state.user?state.user.uid+':'+state.epoch:null},
  async readAll(options={}){
    if(!state.user)throw new Error('Sign in with Google before exporting your cloud data.');
    const session=captureSession();
    const entries=await Promise.all(kinds.map(async kind=>{
      const snapshot=await getDocsFromServer(list(kind,session));
      assertSession(session);
      const byId=new Map(snapshot.docs.map(x=>x.data()).filter(x=>isMember(kind,x)).map(x=>[idOf(kind,x),x]));
      if(!options.serverOnly)for(const [key,item] of state.pending){
        if(key.startsWith(kind+':'))byId.set(idOf(kind,item),item);
      }
      return [kind,[...byId.values()],snapshot.docs.map(x=>x.data()).filter(x=>x.recordType==='syncBackup')];
    }));
    assertSession(session);
    const result=Object.fromEntries(entries.map(([kind,rows])=>[kind,rows]));
    if(options.includeHistory)result.history=entries.filter(([kind])=>!['structures','concepts'].includes(kind)).flatMap(([kind,,versions])=>versions.map(value=>({collection:kind,value})));
    return result;
  },
  async restoreAll(payload,options={}){
    if(!state.user)throw new Error('Sign in to restore the backup to the cloud.');
    const session=captureSession();
    if(options.sessionToken!==this.sessionToken||!options.expected)throw Error('Fresh restore preview and prior versions are required.');
    let count=0;
    for(const kind of kinds){
      for(const item of Array.isArray(payload[kind])?payload[kind]:[]){
        assertSession(session);
        const id=idOf(kind,item);
        if(!id)throw Error('Restore record has no identity.');
        const prior=(options.expected[kind]||[]).find(x=>idOf(kind,x)===id)||null;
        const outcome=await writeWithHistory(kind,item,{session,expected:prior,forceHistory:true});
        assertSession(session);
        if(outcome.result==='remote-newer'){
          if(!holdConflict(kind,item,outcome.previous))throw Error('Restore conflict could not be archived; device data was not replaced.');
        }else count++;
        options.results?.push({kind,id,...outcome});
      }
    }
    return count;
  }
};

}catch(e){console.error('Firebase initialization failed:',e);show('⚠ Firebase could not load: '+e.message+'. Try refreshing or disabling blockers.');window.dispatchEvent(new Event('recall-firebase-error'));if(login)login.disabled=false}
}
boot();
