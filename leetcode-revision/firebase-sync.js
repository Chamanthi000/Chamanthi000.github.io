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
const state={user:null,ready:false,unsub:[],pending:new Map(),timers:new Map(),retries:new Map(),writeErrors:new Map(),snapshots:{coding:[],sql:[],goals:[],habits:[],structures:[],concepts:[]},initial:new Set(),epoch:0,confirmed:new Set(),subscriptionErrors:new Map(),blocked:new Map(),localFailure:false,localFailures:new Set(),conflicts:new Set(),resolvingKinds:new Set(),conflictDetails:[],conflictReviewHasResult:false,conflictReviewEpoch:-1,deviceOwner:null,accountPaused:false,accountPauseReason:'',obsoleteCleanup:new Set()};
const kinds=['coding','sql','goals','habits','structures','concepts'];
const page=location.pathname.endsWith('journal.html')?['habits']:location.pathname.endsWith('goals.html')?['goals','habits']:location.pathname.endsWith('sql-pattern-guide.html')?['concepts']:['coding','sql','structures','concepts'];
const statusText=s=>{if(status)status.textContent=s;window.dispatchEvent(new CustomEvent('recall-cloud-status',{detail:{message:s}}))};
function idOf(kind,item){return String(item.id||(kind==='coding'?item.number:'')||(kind==='sql'?item.title?.trim().toLowerCase():''));}
// Structure notebooks share the authorized coding collection; typed records stay separate.
function list(kind,session){return collection(db,'users',session?.uid||state.user.uid,kind==='structures'||kind==='concepts'?'coding':kind)}
function prepare(kind,item){return kind==='structures'?{...item,recordType:'structure'}:kind==='concepts'?{...item,recordType:'conceptReview'}:item}
function cloudDocId(kind,item){return kind==='structures'?'structure-'+idOf(kind,item):kind==='concepts'?'concept-'+idOf(kind,item):idOf(kind,item)}
const LOCAL_KEYS={coding:'recall-notes-v1',sql:'recall-sql-v1',goals:'recall-goals-habits-v1',habits:'recall-goals-habits-v1',structures:'recall-structures-v1',concepts:'recall-concept-reviews-v1'};
function deviceRecords(kind){
 const raw=localStorage.getItem(LOCAL_KEYS[kind]),parsed=raw===null?null:JSON.parse(raw);
 const rows=kind==='goals'||kind==='habits'?parsed?.[kind]:parsed;
 if(raw!==null&&!Array.isArray(rows))throw Error('Invalid device storage');
 return kind==='structures'?(rows||[]).filter(x=>!isEmptyDeletedLegacySorting(x)):(rows||[]);
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
// Suppress only the opaque, repetitive reference-stage message in the main
// status line. Keep the failure in writeErrors, the pending record on device,
 // and automatic retries; never report the cloud as confirmed prematurely.
const isUnclassifiedReferenceRetry=entry=>entry.code==='unknown'&&entry.stage==='document-reference'&&!entry.reason;
const writeFailure=()=>{
 const actionable=[...state.writeErrors.values()].filter(error=>!isUnclassifiedReferenceRetry(error));
 return actionable.length?'Cloud save failed · Retrying automatically · '+actionable.map(({kind,code,stage,reason})=>kind+': '+code+(stage?' · stage: '+stage:'')+(reason?' · reason: '+reason:'')+' · '+(WRITE_REASON_ACTIONS.get(reason)||WRITE_ERROR_ACTIONS.get(code))).join(' · '):'';
};
function syncStatus(){
 if(state.accountPaused){statusText(state.accountPauseReason);updateConflictReviewBox();return}
 updateConflictReviewBox();
 const failure=subscriptionFailure(),write=writeFailure();
 const report=message=>statusText(message+(write?' · '+write:''));
 if(state.localFailure){report('⚠ Device save failed · Export a backup before leaving'+(failure?' · '+failure:''));return}
 if(failure){report('⚠ '+failure);return}
 if(state.blocked.size||state.conflicts.size){report('⚠ Conflicts · Device copies retained; review or export conflict copies');return}
 if(typeof navigator!=='undefined'&&navigator.onLine===false){report('Offline · Cloud changes waiting for reconnection');return}
 if(write){statusText('⚠ '+write+' · Device copy retained');return}
 if(state.pending.size){statusText([...state.writeErrors.values()].some(isUnclassifiedReferenceRetry)?'Saved on device · Cloud not confirmed · Retry pending':'✓ Saved on device · Waiting for cloud acknowledgement');return}
 if(page.every(k=>state.confirmed.has(k)))statusText('✓ Cloud confirmed · Server acknowledged current notebooks');
 else statusText('Waiting · Cached data or remaining notebooks need server acknowledgement');
}

const HISTORY_PREFIX='recall-history-',HISTORY_LIMIT=12,HISTORY_INTERVAL_MS=30*60*1000,HISTORY_BYTES_LIMIT=450000;
// Keep write diagnostics with these helpers so the HISTORY_PREFIX test slice is standalone.
const WRITE_ERROR_ACTIONS=new Map([
 ['permission-denied','Check account permissions for cloud saves.'],
 ['unauthenticated','Sign in again to retry cloud saves.'],
 ['unavailable','Check your network connection and retry.'],
 ['deadline-exceeded','Check your network connection and retry.'],
 ['resource-exhausted','Check cloud quota or try again later.'],
 ['invalid-argument','Check the record format before retrying.'],
 ['unknown','Try again; if this continues, refresh or sign in again.']
]);
const WRITE_STAGES=new Set(['document-reference','target-read','history-read','history-write','record-write','transaction-commit']);
const WRITE_REASON_ACTIONS=new Map([
 ['nested-arrays','Check record schema: arrays cannot directly contain arrays.'],
 ['undefined-field','Check record schema: undefined fields are unsupported.'],
 ['record-too-large','Review record size limits before retrying.'],
 ['record-too-deep','Review record nesting depth before retrying.'],
 ['invalid-document-path','Review document path construction before retrying.'],
 ['reserved-field-name','Review reserved field names in the record schema.'],
 ['unsupported-value','Review unsupported values in the record schema.'],
 ['unknown-format','Check the record format; the error template was not recognized.'],
 ['target-id-collision','A different cloud document owns this ID. Save was stopped to protect both records.'],
 ['history-id-collision','Saved history belongs to another record; original versions were protected.'],
 ['duplicate-cloud-identity','Multiple cloud documents share this record ID; originals were preserved for review.'],
 ['server-scan-unconfirmed','Cloud lookup was not acknowledged by the server; the device copy is retained.'],
 ['client-type-error','A browser code error interrupted sync; your device copy is retained.'],
 ['client-reference-error','A required browser function is unavailable; reload this page to load the latest sync code.'],
 ['client-uri-error','A record identifier could not be encoded; your device copy is retained.']
]);
function writeErrorCode(error){
 const code=typeof error?.code==='string'?error.code.replace(/^firestore\//,''):'unknown';
 return WRITE_ERROR_ACTIONS.has(code)?code:'unknown';
}
function invalidArgumentReason(error){
 // Match SDK/server templates at the start, never keywords in private values or notes.
 const message=typeof error?.message==='string'?error.message:'';
 if(message==='Cloud document path is invalid; save stopped.')return 'invalid-document-path';
 const data=/^Function (?:setDoc|updateDoc|addDoc|Transaction\.(?:set|update)|WriteBatch\.(?:set|update))\(\) called with invalid data(?: \(via `toFirestore\(\)`\))?\. (.*)$/s.exec(message)?.[1];
 if(data){
  if(/^Nested arrays are not supported(?:$| \(found )/.test(data))return 'nested-arrays';
  if(/^Unsupported field value: undefined(?:$| \(found )/.test(data))return 'undefined-field';
  if(/^Document fields cannot begin and end with "__"(?:$| \(found )/.test(data))return 'reserved-field-name';
  if(/^Unsupported field value: /.test(data))return 'unsupported-value';
  return 'unknown-format';
 }
 if(/^Document '[\s\S]+' cannot be written because its size \([\d,]+ bytes\) exceeds the maximum allowed size of [\d,]+ bytes\.$/.test(message)||/^The value of property "[\s\S]+" is longer than [\d,]+ bytes\.$/.test(message))return 'record-too-large';
 // The explicit Firestore SDK depth template is distinct from the server's
 // ambiguous "invalid nested entity" message, which can have other causes.
 if(/^Value for argument "(?:data|document)" is not a valid Firestore document\. Input object is deeper than \d+ levels or contains a cycle\.$/.test(message))return 'record-too-deep';
 if(/^Invalid document reference\. Document references must have an even number of segments, but [\s\S]+ has \d+\.$/.test(message)||/^Invalid segment \([\s\S]*\)\. Paths must not contain \/\/ in them\.$/.test(message)||/^Function (?:doc|collection)\(\) cannot be called with an empty path\.$/.test(message))return 'invalid-document-path';
 return 'unknown-format';
}
function writeErrorDetails(error){
 const details={code:writeErrorCode(error)};
 if(WRITE_STAGES.has(error?.stage))details.stage=error.stage;
 if((details.code==='invalid-argument'||details.code==='unknown')&&WRITE_REASON_ACTIONS.has(error?.reason))details.reason=error.reason;
 return details;
}
function safeWriteError(error,stage){
 const code=writeErrorCode(error),details={code};
 if(WRITE_STAGES.has(stage))details.stage=stage;
 const safeGuards=new Map([
  ['Cloud document identity mismatch; save stopped.','target-id-collision'],
  ['Cloud history identity mismatch; save stopped.','history-id-collision'],
  ['Multiple cloud documents match this record; save stopped.','duplicate-cloud-identity'],
  ['Server record lookup was not acknowledged; save stopped.','server-scan-unconfirmed']
 ]);
 const guardReason=safeGuards.get(error?.message);
 if(guardReason)details.reason=guardReason;
 else if(code==='invalid-argument')details.reason=invalidArgumentReason(error);
 else if(code==='unknown'&&error?.name==='TypeError')details.reason='client-type-error';
 else if(code==='unknown'&&error?.name==='ReferenceError')details.reason='client-reference-error';
 else if(code==='unknown'&&error?.name==='URIError')details.reason='client-uri-error';
 // Preserve only these fixed application guard messages, never an SDK message/cause.
 const safeMessages=['Account changed; operation stopped.','Previous cloud version could not be archived; restore stopped.','Cloud document identity mismatch; save stopped.','Cloud history identity mismatch; save stopped.','Multiple cloud documents match this record; save stopped.','Server record lookup was not acknowledged; save stopped.'];
 const safe=new Error(safeMessages.find(message=>message===error?.message)||'Cloud save failed.');
 return Object.assign(safe,details);
}
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
// Keep identity/path helpers in the standalone HISTORY_PREFIX test slice.
function isMember(kind,item){return kind==='structures'?item.recordType==='structure':kind==='concepts'?item.recordType==='conceptReview':kind==='coding'?item.recordType!=='structure'&&item.recordType!=='conceptReview'&&item.recordType!=='syncBackup':item.recordType!=='syncBackup'}
function isEmptyDeletedLegacySorting(item){
 // Only this precise empty, deleted pre-guide stub is obsolete. Never infer
 // that a document with notes, review fields or unknown properties is trash.
 if(!item||item.id!=='sorting'||item.deleted!==true)return false;
 if(item.recordType!=null&&item.recordType!=='structure')return false;
 if(!['sorting','sorting techniques','sorting algorithms'].includes(String(item.title||'').trim().toLowerCase()))return false;
 if(item.notes!=null&&(typeof item.notes!=='string'||item.notes.trim()))return false;
 const allowed=new Set(['id','title','notes','deleted','createdAt','updatedAt','recordType','customTopic']);
 return Object.keys(item).every(k=>allowed.has(k))&&item.customTopic!==true;
}
async function cleanupObsoleteSorting(session,documentId){
 const path=doc(list('structures',session),checkedDocumentId(documentId));
 await runTransaction(db,async tx=>{
  assertSession(session);
  const current=await tx.get(path);
  assertSession(session);
  if(!current.exists()||!isEmptyDeletedLegacySorting(current.data()))return;
  // Transaction rechecks the CURRENT cloud record so concurrent edits survive.
  tx.delete(path);
 });
}

function wellFormedId(id){return ![...id].some(c=>c.codePointAt(0)>=0xd800&&c.codePointAt(0)<=0xdfff)}
function validDocumentId(id){return typeof id==='string'&&id.length>0&&!id.includes('/')&&id!=='.'&&id!=='..'&&!/^__.*__$/s.test(id)&&wellFormedId(id)&&new TextEncoder().encode(id).length<=1500}
function checkedDocumentId(id){
 if(!validDocumentId(id))throw Object.assign(Error('Cloud document path is invalid; save stopped.'),{code:'invalid-argument'});
 return id;
}
const AMBIGUOUS_PATH_MESSAGE='Multiple cloud documents match a legacy record; copies retained; review required.';
function hasAmbiguousUnsafeRecords(kind,rows){
 const seen=new Set();
 for(const row of rows){
  if(validDocumentId(cloudDocId(kind,row)))continue;
  const id=idOf(kind,row);if(seen.has(id))return true;seen.add(id);
 }
 return false;
}
async function safeDocumentId(kind,value,session){
 // JSON escapes lone surrogates before UTF-8 encoding, preserving their identity.
 const digest=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(JSON.stringify([kind,idOf(kind,value)])));
 assertSession(session);
 return checkedDocumentId('recall-key-v1-'+kind+'-'+Array.from(new Uint8Array(digest),byte=>byte.toString(16).padStart(2,'0')).join(''));
}
async function resolveDocumentId(kind,value,owner,session,forceScan=false,excludedIds=new Set()){
 const legacy=cloudDocId(kind,value);
 if(validDocumentId(legacy)&&!forceScan)return legacy;
 // Use a confirmed, owner-scoped server scan before remapping a legacy ID.
 // An unrelated note may already occupy both the original ID and the first
 // deterministic fallback. Never overwrite that note or guess from cache.
 const snapshot=await getDocsFromServer(owner);
 assertSession(session);
 if(snapshot.metadata?.fromCache!==false||snapshot.metadata?.hasPendingWrites!==false)throw Error('Server record lookup was not acknowledged; save stopped.');
 const matches=snapshot.docs.filter(document=>{const row=document.data();return isMember(kind,row)&&idOf(kind,row)===idOf(kind,value)});
 if(matches.length>1)throw Error('Multiple cloud documents match this record; save stopped.');
 if(matches.length){
  const match=checkedDocumentId(matches[0].id);
  if(excludedIds.has(match))throw Error('Cloud identity changed during verification; save stopped.');
  return match;
 }
 const occupied=new Set(snapshot.docs.map(document=>document.id));
 const baseId=await safeDocumentId(kind,value,session);
 for(let attempt=0;attempt<12;attempt++){
  const candidate=checkedDocumentId(attempt===0?baseId:baseId+'-'+attempt);
  if(!occupied.has(candidate)&&!excludedIds.has(candidate))return candidate;
 }
 throw Error('No verified safe document path is available; save stopped.');
}
async function writeWithHistory(kind,value,options={}){
 const session=options.session||(state.user?captureSession():null);
 assertSession(session);
 let operation='document-reference';
 try{
 const owner=list(kind,session);
 let physicalId=await resolveDocumentId(kind,value,owner,session);
 const collidingIds=new Set();
 for(;;){
 assertSession(session);
 const ref=doc(owner,checkedDocumentId(physicalId));
 // Preserve every existing encodable history key, including legacy truncation.
 // Unpaired surrogates had no usable encodeURIComponent history key.
 const backupId=wellFormedId(idOf(kind,value))?historyId(kind,value):HISTORY_PREFIX+await safeDocumentId(kind,value,session);
 assertSession(session);
 const backupRef=doc(owner,checkedDocumentId(backupId));
 operation='transaction-commit';
 try{return await runTransaction(db,async tx=>{
  // All reads precede every write; concurrent tabs retry against fresh server state.
  assertSession(session);
  operation='target-read';
  const current=await tx.get(ref);
  assertSession(session);
  const old=current.exists()?current.data():null;
  // Check identity before unchanged/conflict handling: unrelated documents are
  // never overwritten, archived, or presented as this record's remote version.
  if(old&&(!isMember(kind,old)||idOf(kind,old)!==idOf(kind,value)))throw Error('Cloud document identity mismatch; save stopped.');
  const oldClean=old?withoutRecordType(old):null;
  if(old&&sameRecord(oldClean,value)){operation='transaction-commit';return {result:'unchanged'}}
  const oldStamp=String(old?.updatedAt||old?.createdAt||'');
  const incomingStamp=String(value.updatedAt||value.createdAt||'');
  const guarded=Object.prototype.hasOwnProperty.call(options,'expected');
  if((guarded&&!sameRecord(oldClean,options.expected))||(!guarded&&old&&(oldStamp>incomingStamp||(oldStamp===incomingStamp&&!sameRecord(oldClean,value))))){
   operation='transaction-commit';
   return {result:'remote-newer',previous:oldClean};
  }
  if(old)operation='history-read';
  const history=old?await tx.get(backupRef):null;
  assertSession(session);
  let archived=false;
  if(old){
   if(history.exists()&&(history.data()?.recordType!=='syncBackup'||history.data().originKind!==kind||history.data().originId!==idOf(kind,value)))throw Error('Cloud history identity mismatch; save stopped.');
   const previousHistory=Array.isArray(history?.data()?.versions)?history.data().versions:[];
   const last=previousHistory[previousHistory.length-1];
   const now=Date.now();
   if(options.forceHistory||!last||now-Date.parse(last.archivedAt)>=HISTORY_INTERVAL_MS){
    const versions=cappedHistory([...previousHistory,{archivedAt:new Date(now).toISOString(),value:oldClean}]);
    if(versions.length&&versions[versions.length-1].value&&sameRecord(versions[versions.length-1].value,oldClean)){
     operation='history-write';
     tx.set(backupRef,{...history.data(),recordType:'syncBackup',originKind:kind,originId:idOf(kind,value),updatedAt:new Date(now).toISOString(),versions});
     archived=true;
    }
   }
  }
  if(options.forceHistory&&old&&!archived)throw Error('Previous cloud version could not be archived; restore stopped.');
  assertSession(session);
  operation='record-write';
  tx.set(ref,prepare(kind,value));
  operation='transaction-commit';
  return {result:'saved',archived};
 });}catch(error){
  // Firestore document IDs are shared across coding, structures and concepts.
  // A wrong-kind occupant can sit at the original ID *or* at an older hashed
  // fallback. Recheck the server for every collision, with a bounded number
  // of candidate IDs, before retrying an identity-guarded transaction.
  if(error?.message==='Cloud document identity mismatch; save stopped.'&&collidingIds.size<12){
   collidingIds.add(physicalId);
   operation='document-reference';
   const nextId=await resolveDocumentId(kind,value,owner,session,true,collidingIds);
   if(collidingIds.has(nextId))throw error;
   physicalId=nextId;
   continue;
  }
  throw error;
 }
 }
 }catch(error){throw safeWriteError(error,operation)}
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
// Recovery copies are append-only history, not evidence of unresolved divergence.
// This compact control appears only when a live conflict still needs verification.
const conflictReviewBox=document.createElement('div');
conflictReviewBox.id='recallConflictReviewBox';
conflictReviewBox.hidden=true;
conflictReviewBox.style.cssText='margin:8px 0 14px;padding:12px;border:1px solid #d9e6d9;border-radius:11px;background:#f7faf5;color:#315940;font:13px/1.55 -apple-system,BlinkMacSystemFont,"DM Sans",sans-serif;';
const reviewConflictButton=document.createElement('button');
reviewConflictButton.id='reviewRecallConflicts';
reviewConflictButton.type='button';
reviewConflictButton.textContent='Review remaining conflict and compare versions';
reviewConflictButton.style.cssText='display:block;max-width:100%;min-height:42px;padding:10px 13px;border:1px solid #bed2c2;border-radius:9px;background:#fff;color:#28573c;font-size:13px;font-weight:700;cursor:pointer;white-space:normal;text-align:left;';
const reviewConflictMessage=document.createElement('span');
reviewConflictMessage.id='reviewRecallConflictsStatus';
reviewConflictMessage.setAttribute('role','status');
reviewConflictMessage.style.cssText='display:block;margin:6px 0 0;font-size:12px;';
const conflictCompareList=document.createElement('div');
conflictCompareList.id='recallConflictCompareList';
conflictCompareList.style.cssText='display:grid;gap:12px;margin-top:10px;';
conflictReviewBox.append(reviewConflictButton,reviewConflictMessage,conflictCompareList);
const reviewTile=status?.closest('.tile');
if(reviewTile)reviewTile.appendChild(conflictReviewBox);
else if(status?.parentElement)status.insertAdjacentElement('afterend',conflictReviewBox);
function updateConflictReviewBox(){
 if(!state.user||state.accountPaused){conflictReviewBox.hidden=true;return}
 const count=state.conflicts.size+state.blocked.size;
 conflictReviewBox.hidden=count===0;
 if(count&&!reviewConflictButton.disabled&&!state.conflictReviewHasResult)reviewConflictMessage.textContent=count+' records awaiting verification (includes historical conflict snapshots). Select Review to identify any current differences; backups are preserved.';
}
function contentEquivalent(a,b){
 if(!a||!b)return a===b;
 // Sync timestamps and the Firestore type marker are not study content.
 const clean=value=>{const copy={...value};delete copy.recordType;delete copy.updatedAt;delete copy.createdAt;return copy};
 return sameRecord(clean(a),clean(b));
}
async function verifyArchivedConflictCopies(){
 if(!state.user||state.accountPaused)throw Error('Sign in with the original account before reviewing conflicts.');
 const session=captureSession(),archives=window.RecallSyncConflicts.read();
 if(!archives.length){state.conflicts.clear();syncStatus();return {resolved:0,unresolved:0,total:0}}
 const checks=new Map(),uniqueKinds=[...new Set(archives.map(row=>row.kind))];
 for(const kind of uniqueKinds){
  if(!kinds.includes(kind))throw Error('Unrecognized conflict category; preserve the archive.');
  const snapshot=await getDocsFromServer(list(kind,session));
  assertSession(session);
  if(snapshot.metadata?.fromCache!==false||snapshot.metadata?.hasPendingWrites!==false)throw Error('Server confirmation required; originals retained.');
  const remoteDocs=snapshot.docs.filter(x=>isMember(kind,x.data())).map(x=>({physicalId:x.id,value:x.data()}));
  const remote=remoteDocs.map(x=>x.value),local=deviceRecords(kind);
  checks.set(kind,{local,remote,remoteDocs});
 }
 assertSession(session);
 const latest=window.RecallSyncConflicts.read(),scanned=new Set(archives.map(row=>row.id));
 const unresolved=new Set(),details=new Map();let resolved=0;
 for(const row of latest){
  const key=row.kind+':'+row.recordId,check=checks.get(row.kind);
  if(!scanned.has(row.id)||!check||state.pending.has(key)||state.blocked.has(key)||state.writeErrors.has(key)){
   unresolved.add(key);details.set(key,{kind:row.kind,recordId:row.recordId,device:null,cloud:null,reviewable:false,
    issue:'Cloud write still pending or recovery confirmation unavailable'});continue
  }
  const device=check.local.filter(x=>idOf(row.kind,x)===row.recordId);
  const remoteDocs=check.remoteDocs.filter(x=>idOf(row.kind,x.value)===row.recordId);
  const remote=remoteDocs.map(x=>x.value);
  // Unique matching live copies (or acknowledged absence on both sides) can
  // prove a historical conflict no longer needs a warning. No records are edited.
  if((device.length===1&&remote.length===1&&contentEquivalent(device[0],remote[0]))||(device.length===0&&remote.length===0))resolved++;
  else {
   unresolved.add(key);
   details.set(key,{kind:row.kind,recordId:row.recordId,device:device.length===1?withoutRecordType(device[0]):null,
    deviceCopies:device.length>1?device.map(withoutRecordType):[],
    cloud:remote.length===1?withoutRecordType(remote[0]):null,
    cloudCopies:remote.length>1?remoteDocs.map(x=>({physicalId:x.physicalId,value:withoutRecordType(x.value)})).sort((a,b)=>a.physicalId.localeCompare(b.physicalId)):[],
    duplicateDevice:device.length>1,duplicateCloud:remote.length>1,
    reviewable:(device.length>=1&&device.length<=20&&remote.length<=100)||(device.length===0&&remote.length===1),
    issue:device.length>1?'Multiple versions on this device; choose which one to keep and archive every original':remote.length>1?'Multiple cloud copies of the same topic; save the device version and archive every cloud original':device.length===0?'Missing device record':remote.length===0?'Missing cloud record':'Different content'});
  }
 }
 assertSession(session);
 state.conflictDetails=[...details.values()];
 state.conflicts.clear();for(const key of unresolved)state.conflicts.add(key);
 syncStatus();
 return {resolved,unresolved:unresolved.size,total:latest.length};
}

function compareFieldNames(device,cloud){
 const keys=new Set([...Object.keys(device||{}),...Object.keys(cloud||{})]);
 return [...keys].filter(key=>!sameRecord(device?.[key],cloud?.[key])).slice(0,18);
}
function renderConflictComparisons(){
 conflictCompareList.replaceChildren();
 const make=(tag,text,css='')=>{
  const el=document.createElement(tag);
  el.textContent=text;
  if(css)el.style.cssText=css;
  return el;
 };
 for(const record of state.conflictDetails){
  const card=make('section','');
  card.style.cssText='border:1px solid #d9e5dc;background:white;border-radius:10px;padding:12px;min-width:0;';
  const title=make('strong',record.kind+' · '+record.recordId,'font-size:13px;overflow-wrap:anywhere;');
  const explanation=make('p',record.issue+' · Original snapshots remain in the conflict backup.','font-size:12px;color:#57735c;margin:5px 0 9px;');
  card.append(title,explanation);
  if(!record.reviewable){
   card.append(make('p','This record cannot be safely selected automatically. Export its conflict copies and review the originals.','font-size:12px;'));
   conflictCompareList.append(card);continue;
  }
  const different=compareFieldNames(record.device,record.cloud);
  if(record.duplicateCloud||record.duplicateDevice)card.append(make('p',
   (record.duplicateDevice?record.deviceCopies.length+' device copies. ':'1 device copy. ')+
   (record.duplicateCloud?record.cloudCopies.length+' cloud copies. ':record.cloud?'1 cloud copy. ':'No cloud copy. ')+
   'Choose the device copy to keep. All other originals will be saved as recovery history.',
   'font-size:12px;color:#31553f;margin:5px 0;'));
  else card.append(make('p','Different fields: '+(different.length?different.join(', '):'record presence'),'font-size:12px;overflow-wrap:anywhere;'));
  const detail=make('details','');
  detail.style.cssText='margin:8px 0;';
  const summary=make('summary','Compare full current versions','font-size:13px;cursor:pointer;font-weight:700;padding:6px 0;');
  detail.append(summary);
  const deviceVersions=record.duplicateDevice?record.deviceCopies.map((copy,i)=>['Device copy '+(i+1),copy]):[['On this device',record.device]];
  const cloudVersions=record.duplicateCloud?record.cloudCopies.map((copy,i)=>['Cloud copy '+(i+1)+' ('+copy.physicalId+')',copy.value]):[['In Firebase cloud',record.cloud]];
  const versions=[...deviceVersions,...cloudVersions];
  for(const [label,value] of versions){
   const heading=make('strong',label,'font-size:12px;display:block;margin-top:8px;');
   const full=make('pre',value===null?'No current record':JSON.stringify(value,null,2),'font:12px/1.5 ui-monospace,monospace;overflow:auto;max-height:250px;background:#f7faf7;border:1px solid #e0eae1;padding:10px;border-radius:8px;white-space:pre-wrap;overflow-wrap:anywhere;');
   detail.append(heading,full);
  }
  card.append(detail);
  const actions=make('div','');
  actions.style.cssText='display:flex;gap:8px;flex-wrap:wrap;margin-top:10px;';
  const addChoice=(choice,label,deviceIndex=null)=>{
   const button=make('button',label);
   button.type='button';
   button.style.cssText='min-height:40px;border:1px solid #b4cdbb;border-radius:8px;background:#e9f3ea;color:#275c42;font-size:12px;font-weight:700;padding:8px 12px;cursor:pointer;';
   button.addEventListener('click',async()=>{
    if(button.disabled)return;
    button.disabled=true;
    reviewConflictMessage.textContent='Checking both versions and preserving backups before resolving…';
    try{
     const outcome=await resolveReviewedConflict(record.kind,record.recordId,choice,record,deviceIndex);
     if(outcome.cancelled){button.disabled=false;reviewConflictMessage.textContent='No change made. Both copies are still available for comparison.';return}
     reviewConflictMessage.textContent='✓ Conflict selection saved and checked. Refreshing the website…';
     location.reload();
    }catch(e){
     reviewConflictMessage.textContent='Could not safely complete the selection. The conflict remains and both originals are retained. If another device edited this note, review the latest versions again.';
     button.disabled=false;
    }
   });
   actions.append(button);
  };
  if(record.duplicateDevice)record.deviceCopies.forEach((_,i)=>addChoice('device','Use device copy '+(i+1)+' · preserve other versions',i));
  else if(record.device)addChoice('device',record.duplicateCloud?'Use device version · archive '+record.cloudCopies.length+' duplicates':record.cloud?'Use device version':'Save device copy to cloud');
  if(record.cloud&&!record.duplicateCloud&&!record.duplicateDevice)addChoice('cloud',record.device?'Use cloud version':'Restore cloud copy to device');
  card.append(actions);
  conflictCompareList.append(card);
 }
 if(state.conflictDetails.length){
  const exportButton=make('button','Download conflict copies before choosing');
  exportButton.type='button';
  exportButton.style.cssText='border:1px solid #b4cdbb;border-radius:8px;background:white;color:#28573c;font-weight:700;font-size:12px;padding:10px;';
  exportButton.addEventListener('click',()=>window.RecallSyncConflicts.download());
  conflictCompareList.prepend(exportButton);
 }
}
async function readLiveConflict(kind,recordId,session){
 if(!kinds.includes(kind)||!recordId)throw Error('Invalid conflict identity.');
 const snapshot=await getDocsFromServer(list(kind,session));
 assertSession(session);
 if(snapshot.metadata?.fromCache!==false||snapshot.metadata?.hasPendingWrites!==false)throw Error('The cloud read is not confirmed.');
 const remoteDocs=snapshot.docs.filter(x=>isMember(kind,x.data())&&idOf(kind,x.data())===recordId)
  .map(x=>({physicalId:x.id,value:x.data()})).sort((a,b)=>a.physicalId.localeCompare(b.physicalId));
 const local=deviceRecords(kind).filter(row=>idOf(kind,row)===recordId);
 return {device:local.length===1?withoutRecordType(local[0]):null,deviceCopies:local.map(withoutRecordType),
  cloud:remoteDocs.length===1?withoutRecordType(remoteDocs[0].value):null,cloudCopies:remoteDocs};
}
function replaceDeviceConflictRecord(kind,recordId,value,expected){
 const storageKey=LOCAL_KEYS[kind],raw=localStorage.getItem(storageKey);
 if(raw===null)throw Error('Device storage missing; no changes made.');
 const parsed=JSON.parse(raw),envelope=kind==='habits'||kind==='goals';
 if(envelope&&(!parsed||typeof parsed!=='object'||Array.isArray(parsed)))throw Error('Invalid device envelope.');
 const values=envelope?parsed[kind]:parsed;
 if(!Array.isArray(values))throw Error('Invalid device notebook.');
 const original=values.filter(row=>idOf(kind,row)===recordId);
 const expectedRows=Array.isArray(expected)?expected:expected?[expected]:[];
 if(original.length!==expectedRows.length||original.some((row,i)=>!sameRecord(row,expectedRows[i])))throw Error('Device record changed since review.');
 // Collapse only this logical identity; retain all other topics, goals and
 // original order. Every replaced device alternative was archived beforehand.
 let inserted=false;
 const updated=[];
 for(const row of values){
  if(idOf(kind,row)===recordId){if(!inserted){updated.push(value);inserted=true;}}
  else updated.push(row);
 }
 if(!inserted)updated.push(value);
 const encoded=JSON.stringify(envelope?{...parsed,[kind]:updated}:updated);
 localStorage.setItem(storageKey,encoded);
 if(localStorage.getItem(storageKey)!==encoded)throw Error('Device save could not be verified.');
}
// A confirmed duplicate-ID scan may find several physical Firestore documents for
// one logical DSA topic. Do not arbitrarily choose an original or delete it.
// Atomically turn each original into a private history record at its SAME path,
// then create a single new active record using the device's exact note content.
// Resolve multiple physical cloud copies OR multiple local copies without
// discarding a version. All cloud originals become hidden, downloadable
// version-history documents in the SAME atomic transaction as the new canonical.
async function resolveDuplicateCloudCopies(kind,recordId,selected,live,session,selectedOriginal){
 assertSession(session);
 const originals=live.cloudCopies,localCopies=live.deviceCopies;
 if(localCopies.length<1||localCopies.length>20||originals.length>100||
    (localCopies.length<2&&originals.length<2))throw Error('No safely reviewable duplicates found.');
 if(idOf(kind,selected)!==recordId||!localCopies.some(x=>sameRecord(x,selectedOriginal)))throw Error('Device record identity changed.');
 const owner=list(kind,session),baseId=await safeDocumentId(kind,selected,session);
 const suffix=baseId.slice('recall-key-v1-'.length);
 const legacyId=cloudDocId(kind,selected);
 const canonicalId=checkedDocumentId(!originals.length&&validDocumentId(legacyId)?legacyId:'recall-choice-v1-'+suffix);
 const originalIds=new Set(),archiveDate=new Date().toISOString(),prepared=[];
 for(const original of originals){
  const physicalId=checkedDocumentId(original.physicalId);
  if(originalIds.has(physicalId)||physicalId===canonicalId)throw Error('Cloud physical identities are ambiguous.');
  originalIds.add(physicalId);
  if(!isMember(kind,original.value)||idOf(kind,original.value)!==recordId)throw Error('Cloud record identity changed.');
  const archive={recordType:'syncBackup',originKind:kind,originId:recordId,
   originPhysicalId:physicalId,updatedAt:archiveDate,reason:'duplicate-record-recovery',
   versions:[{archivedAt:archiveDate,value:original.value}]};
  if(new TextEncoder().encode(JSON.stringify(archive)).length>700000)throw Error('Cloud record is too large to safely archive; export and review first.');
  prepared.push({physicalId,original:original.value,archive});
 }
 // Preserve all distinct local alternatives before changing one device record.
 for(const local of localCopies)if(!archiveConflict(kind,local,selectedOriginal))throw Error('One or more device alternatives could not be archived.');
 // Additionally preserve all current remote/cloud pairs on this device.
 for(const item of prepared)if(!archiveConflict(kind,selectedOriginal,withoutRecordType(item.original)))throw Error('One or more cloud recovery copies could not be archived.');
 const localHistory=localCopies.length>1?{
  recordType:'syncBackup',originKind:kind,originId:recordId,updatedAt:archiveDate,
  reason:'duplicate-device-recovery',versions:localCopies.map(value=>({archivedAt:archiveDate,value}))
 }:null;
 if(localHistory&&new TextEncoder().encode(JSON.stringify(localHistory)).length>700000)throw Error('Device alternatives are too large for a safe cloud archive.');
 const canonicalRef=doc(owner,canonicalId),backupRefs=prepared.map(x=>doc(owner,x.physicalId));
 const localHistoryRef=localHistory?doc(owner,checkedDocumentId('recall-device-history-v1-'+suffix)):null;
 await runTransaction(db,async tx=>{
  assertSession(session);
  // Read *every* target first. Firestore retries this callback if another tab
  // edits any of these documents; a changed original aborts the transaction.
  const refs=[canonicalRef,...backupRefs,...(localHistoryRef?[localHistoryRef]:[])];
  const snapshots=await Promise.all(refs.map(ref=>tx.get(ref)));
  assertSession(session);
  if(snapshots[0].exists())throw Error('Recovery destination is already occupied.');
  for(let i=0;i<prepared.length;i++){
   if(!snapshots[i+1].exists()||!sameRecord(snapshots[i+1].data(),prepared[i].original))
    throw Error('A cloud original changed during recovery; no records were written.');
  }
  if(localHistoryRef&&snapshots[snapshots.length-1].exists())throw Error('Device-version history destination already occupied.');
  for(let i=0;i<prepared.length;i++)tx.set(backupRefs[i],prepared[i].archive);
  if(localHistoryRef)tx.set(localHistoryRef,localHistory);
  tx.set(canonicalRef,prepare(kind,selected));
 });
 assertSession(session);
}

async function resolveReviewedConflict(kind,recordId,choice,reviewed,deviceIndex=null){
 const key=kind+':'+recordId;
 if(!state.user||state.accountPaused||!state.conflicts.has(key)||state.blocked.has(key)||
    state.pending.has(key)||state.writeErrors.has(key)||state.localFailure||!['device','cloud'].includes(choice))throw Error('Conflict is not ready for a safe selection.');
 if(!window.RecallSyncConflicts.read().some(row=>row.kind===kind&&row.recordId===recordId))throw Error('Verified conflict archive is missing.');
 const session=captureSession(),live=await readLiveConflict(kind,recordId,session);
 if(!sameRecord(live.device,reviewed.device)||!sameRecord(live.cloud,reviewed.cloud))throw Error('The current versions have changed; review again.');
 if(reviewed.duplicateDevice){
  if(choice!=='device'||!sameRecord(live.deviceCopies,reviewed.deviceCopies)||!Number.isInteger(deviceIndex)||
    deviceIndex<0||deviceIndex>=live.deviceCopies.length)throw Error('The device alternatives changed or no version was selected.');
 }else if(live.deviceCopies.length>1)throw Error('The device alternatives changed; review again.');
 if(reviewed.duplicateCloud){
  if(choice!=='device'||live.cloudCopies.length<2||
     !sameRecord(live.cloudCopies.map(x=>({physicalId:x.physicalId,value:withoutRecordType(x.value)})),reviewed.cloudCopies))
    throw Error('The duplicate cloud records changed; review again.');
 }else if(live.cloudCopies.length>1)throw Error('New duplicate cloud records require review.');
 const chosenDevice=choice==='device'?live.deviceCopies[reviewed.duplicateDevice?deviceIndex:0]:null;
 if(!((choice==='device'&&chosenDevice)||(choice==='cloud'&&live.cloud)))throw Error('The selected version is missing.');
 if(!reviewed.duplicateDevice&&!reviewed.duplicateCloud&&!live[choice])throw Error('The selected copy is missing.');
 const multiple=reviewed.duplicateDevice||reviewed.duplicateCloud;
 const prompt=multiple?'Use the selected DEVICE copy for '+kind+' · '+recordId+'? Archive '+live.deviceCopies.length+' device and '+live.cloudCopies.length+' cloud version(s), then retain one current topic?':
   choice==='device'?'Use the DEVICE version to replace the cloud version?':'Use the CLOUD version to replace this device copy?';
 if(!confirm(prompt+' Both originals will be retained in recovery history. Export your conflict copies first if desired.'))return {cancelled:true};
 if(state.resolvingKinds.has(kind))throw Error('Conflict resolution is already active for this notebook.');
 state.resolvingKinds.add(kind);
 try{
 if(!archiveConflict(kind,chosenDevice||live.device,live.cloud))throw Error('Could not confirm a permanent recovery copy.');
 const selected=choice==='device'?{...chosenDevice,updatedAt:new Date().toISOString()}:live.cloud;
 // Read back the device's notebook before touching Firestore. Any failure keeps
 // cloud data untouched and makes the operation safely retryable.
 const storageKey=LOCAL_KEYS[kind],original=localStorage.getItem(storageKey);
 if(original===null)throw Error('Device storage missing.');
 localStorage.setItem(storageKey,original);
 if(localStorage.getItem(storageKey)!==original)throw Error('Device storage readback failed.');
 if(multiple){
  await resolveDuplicateCloudCopies(kind,recordId,selected,live,session,chosenDevice);
 }else if(choice==='device'){
  const outcome=await writeWithHistory(kind,selected,{session,expected:live.cloud,forceHistory:!!live.cloud});
  if(outcome.result==='remote-newer')throw Error('Cloud record changed before the selection could be applied.');
 }
 assertSession(session);
 // Another tab's local edit must not be overwritten: verify every original
 // version still matches the snapshots taken at the start.
 replaceDeviceConflictRecord(kind,recordId,selected,live.deviceCopies);
 await verifyArchivedConflictCopies();
 if(state.conflicts.has(key))throw Error('The server and device could not be verified as matching.');
 return {resolved:true,kind,recordId,kept:choice};
 }finally{state.resolvingKinds.delete(kind)}
}

reviewConflictButton.addEventListener('click',async()=>{
 if(reviewConflictButton.disabled)return;
 reviewConflictButton.disabled=true;
 reviewConflictMessage.textContent='Checking current device and server copies without changing any notes…';
 try{
  const result=await verifyArchivedConflictCopies();
  state.conflictReviewHasResult=true;
  reviewConflictMessage.textContent=result.unresolved
   ?result.unresolved+' current record group(s) need a decision. Compare both live versions below; older recovery copies remain saved.'
   :'✓ No current differences found. Original recovery copies remain available.';
  renderConflictComparisons();
 }catch(e){state.conflictReviewHasResult=true;reviewConflictMessage.textContent='Verification could not finish. No versions were changed; check network and sign-in.';conflictCompareList.replaceChildren()}
 finally{reviewConflictButton.disabled=false;updateConflictReviewBox()}
});

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
 verify(){return verifyArchivedConflictCopies()},
 async inspect(){await verifyArchivedConflictCopies();return state.conflictDetails.map(row=>({...row}))},
 resolve(kind,recordId,choice,deviceIndex=null){
  const row=state.conflictDetails.find(record=>record.kind===kind&&record.recordId===recordId);
  if(!row||!row.reviewable)throw Error('Review the current device and cloud versions before resolving this conflict.');
  return resolveReviewedConflict(kind,recordId,choice,row,deviceIndex);
 },
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
  if(kind==='structures'&&isEmptyDeletedLegacySorting(item))continue;
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
    syncStatus();maybeAutoVerifyArchivedConflicts();return;
   }
   if(state.pending.get(key)===value){state.pending.delete(key);state.writeErrors.delete(key)}
   state.retries.delete(key);
   if(state.localFailure||state.subscriptionErrors.size||state.writeErrors.size||state.blocked.size||state.conflicts.size||state.pending.size)syncStatus();
   else statusText('✓ Cloud confirmed · Server acknowledged save'+(outcome.archived?' · Previous version archived':''));
   maybeAutoVerifyArchivedConflicts();
  }catch(e){
   if(session.epoch!==state.epoch||session.uid!==state.user?.uid)return;
   const count=(state.retries.get(key)||0)+1;state.retries.set(key,count);
   if(state.pending.get(key)===value)arm(key,Math.min(60000,1000*2**Math.min(count,6)));
   // Only the current queued version can report a failure; never expose exception text.
   if(state.pending.get(key)===value)state.writeErrors.set(key,{kind:kinds.includes(kind)?kind:'unknown',...writeErrorDetails(e)});
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
function maybeAutoVerifyArchivedConflicts(){
 // Do not classify an unfinished device-to-cloud edit as a lasting conflict.
 // Check once the initial subscriptions and all queued writes are acknowledged.
 if(state.resolvingKinds.size||state.conflictReviewEpoch===state.epoch||!state.user||state.accountPaused||!state.conflicts.size||
    state.pending.size||state.writeErrors.size||state.localFailure||state.subscriptionErrors.size||
    !page.every(k=>state.confirmed.has(k)))return;
 state.conflictReviewEpoch=state.epoch;
 void verifyArchivedConflictCopies().then(()=>updateConflictReviewBox()).catch(()=>{
  reviewConflictMessage.textContent='Cannot verify old conflicts right now. Copies retained.';
  updateConflictReviewBox();
 });
}
async function setup(user){
for(const u of state.unsub)u();for(const timer of state.timers.values())clearTimeout(timer);
state.epoch++;state.obsoleteCleanup.clear();state.resolvingKinds.clear();state.conflictReviewEpoch=-1;state.conflictReviewHasResult=false;state.conflictDetails=[];conflictCompareList.replaceChildren();state.conflicts.clear();state.timers.clear();state.retries.clear();state.writeErrors.clear();state.unsub=[];state.pending.clear();state.initial.clear();state.confirmed.clear();state.subscriptionErrors.clear();state.blocked.clear();
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
if(login)login.hidden=true;if(logout)logout.hidden=false;statusText('Waiting · Connecting to cloud…');syncStatus();
for(const kind of page){
 let terminated=false;
 const unsub=onSnapshot(list(kind,session),{includeMetadataChanges:true},snapshot=>{
  if(terminated||session.epoch!==state.epoch||session.uid!==state.user?.uid)return;
  // A transaction replacing duplicated cloud documents may emit an interim
  // snapshot before its Promise resolves. Do not let that snapshot overwrite
  // device alternatives while they are being archived and consolidated.
  if(state.resolvingKinds.has(kind))return;
  const acknowledged=!snapshot.metadata?.fromCache&&!snapshot.metadata?.hasPendingWrites;
  if(acknowledged&&kind==='structures'){
   // Delete only an empty, already-deleted legacy record from the authenticated
   // owner's cloud collection. Recheck in a transaction before any deletion.
   for(const old of snapshot.docs){
    if(!isEmptyDeletedLegacySorting(old.data()))continue;
    const key=session.uid+':'+old.id;
    if(state.obsoleteCleanup.has(key)||state.pending.has('structures:sorting'))continue;
    state.obsoleteCleanup.add(key);
    Promise.resolve().then(()=>cleanupObsoleteSorting(session,old.id)).catch(()=>{
     state.obsoleteCleanup.delete(key);
    });
   }
  }
  const remote=snapshot.docs.map(x=>x.data()).filter(x=>isMember(kind,x)&&!isEmptyDeletedLegacySorting(x));
  // Do not collapse two server originals into one apparent record or replace
  // the device copy while a legacy physical-path ambiguity needs review.
  if(hasAmbiguousUnsafeRecords(kind,remote)){
   state.confirmed.delete(kind);state.subscriptionErrors.set(kind,AMBIGUOUS_PATH_MESSAGE);syncStatus();return;
  }
  if(state.subscriptionErrors.get(kind)===AMBIGUOUS_PATH_MESSAGE)state.subscriptionErrors.delete(kind);
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
  // Only after every displayed subscription has a server acknowledgement may
  // we recheck historical conflicts. The recheck scans every archived kind,
  // including Habits when the user is viewing Coding.
  maybeAutoVerifyArchivedConflicts();
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
function retryCloudSync(){
 if(!state.user||state.accountPaused)return;
 if(state.subscriptionErrors.size){
  // Listener failures are terminal. Re-subscribe under a new epoch so stale
  // callbacks cannot apply data; setup rebuilds pending writes from device copies.
  return setup(state.user);
 }
 syncStatus();for(const key of state.pending.keys())arm(key,0);
}
const retrySyncButton=document.createElement('button');
retrySyncButton.id='recallRetrySync';retrySyncButton.type='button';
retrySyncButton.textContent='Retry cloud sync';
retrySyncButton.style.cssText='margin:6px 0;padding:8px 12px;border:1px solid #bed2c2;border-radius:9px;background:#fff;color:#28573c;cursor:pointer;';
retrySyncButton.hidden=true;
(status?.parentElement||document.body).appendChild(retrySyncButton);
retrySyncButton.addEventListener('click',retryCloudSync);
window.addEventListener('recall-cloud-status',()=>{
 retrySyncButton.hidden=!state.user||state.accountPaused||!(state.pending.size||state.subscriptionErrors.size||state.writeErrors.size);
});
window.addEventListener('online',retryCloudSync);
window.addEventListener('offline',()=>{if(state.user)syncStatus()});
document.addEventListener('visibilitychange',()=>{if(!document.hidden)retryCloudSync()});
window.RecallCloud={
  get user(){return state.user},
  sync(kind,items){if(state.user)putLocal(kind,items)},
  get ready(){return initialized},
  get pendingCount(){return state.pending.size},
  retry:retryCloudSync,
  // Detached, read-only diagnostics: no record keys, account details or exception messages.
  get writeErrors(){return Object.freeze([...state.writeErrors.values()].map(({kind,...error})=>Object.freeze({kind,...writeErrorDetails(error)})))},
  downloadCloudHistory,
  // Full cloud read across all record types (concepts share the coding collection).
  get sessionToken(){return state.user?state.user.uid+':'+state.epoch:null},
  async readAll(options={}){
    if(!state.user)throw new Error('Sign in with Google before exporting your cloud data.');
    const session=captureSession();
    const entries=await Promise.all(kinds.map(async kind=>{
      const snapshot=await getDocsFromServer(list(kind,session));
      assertSession(session);
      if(hasAmbiguousUnsafeRecords(kind,snapshot.docs.map(x=>x.data()).filter(x=>isMember(kind,x))))throw Error(AMBIGUOUS_PATH_MESSAGE);
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
