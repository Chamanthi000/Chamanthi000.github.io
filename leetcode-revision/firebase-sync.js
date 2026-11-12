// Load the SDK dynamically so a missing module is reported on screen.
const status=document.getElementById('firebaseStatus');
const login=document.getElementById('firebaseLogin');
const logout=document.getElementById('firebaseLogout');
const show=s=>{if(status)status.textContent=s;};
// Show the actual signed-in account on Coding, SQL, Goals and guide pages.
const accountLabel=document.createElement('small');
accountLabel.id='recallSignedInEmail';
accountLabel.setAttribute('aria-live','polite');
accountLabel.style.cssText='display:block;font:500 11px/1.35 -apple-system,BlinkMacSystemFont,"DM Sans",sans-serif;color:#708474;max-width:230px;overflow-wrap:anywhere;text-align:right;margin:4px 0;';
accountLabel.textContent='Not signed in';
const accountHost=login?.closest('.topActions')||logout?.closest('.topActions');
if(accountHost){
 const group=document.createElement('div');
 group.style.cssText='display:flex;flex-direction:column;align-items:flex-end;min-width:0;max-width:100%;';
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
const [{initializeApp},{getAuth,GoogleAuthProvider,signInWithPopup,signInWithRedirect,getRedirectResult,signOut,onAuthStateChanged},{getFirestore,collection,doc,setDoc,onSnapshot,getDocs}]=await Promise.all([
  import(base+'firebase-app.js'),import(base+'firebase-auth.js'),import(base+'firebase-firestore.js')
]);
const app=initializeApp({apiKey:"AIzaSyCmIM8dCDg9H8D52ZXYPGxEpTV85pBciDQ",authDomain:"recall-46335.firebaseapp.com",projectId:"recall-46335",storageBucket:"recall-46335.firebasestorage.app",messagingSenderId:"611507493769",appId:"1:611507493769:web:708b8c892c47aed721df58"});
const auth=getAuth(app),db=getFirestore(app),provider=new GoogleAuthProvider();
const state={user:null,ready:false,unsub:[],pending:new Map(),timers:new Map(),retries:new Map(),snapshots:{coding:[],sql:[],goals:[],habits:[],structures:[],concepts:[]},initial:new Set()};
const kinds=['coding','sql','goals','habits','structures','concepts'];
const page=location.pathname.endsWith('goals.html')?['goals','habits']:location.pathname.endsWith('sql-pattern-guide.html')?['concepts']:['coding','sql','structures','concepts'];
const statusText=s=>{if(status)status.textContent=s;window.dispatchEvent(new CustomEvent('recall-cloud-status',{detail:{message:s}}))};
function idOf(kind,item){return String(item.id||(kind==='coding'?item.number:'')||(kind==='sql'?item.title?.trim().toLowerCase():''));}
// Structure notebooks share the authorized coding collection; typed records stay separate.
function list(kind){return collection(db,'users',state.user.uid,kind==='structures'||kind==='concepts'?'coding':kind)}
function isMember(kind,item){return kind==='structures'?item.recordType==='structure':kind==='concepts'?item.recordType==='conceptReview':kind==='coding'?item.recordType!=='structure'&&item.recordType!=='conceptReview':true}
function prepare(kind,item){return kind==='structures'?{...item,recordType:'structure'}:kind==='concepts'?{...item,recordType:'conceptReview'}:item}
function cloudDocId(kind,item){return kind==='structures'?'structure-'+idOf(kind,item):kind==='concepts'?'concept-'+idOf(kind,item):idOf(kind,item)}
function send(kind){window.dispatchEvent(new CustomEvent('recall-cloud-data',{detail:{kind,items:state.snapshots[kind]}}))}

const CONFLICT_KEY='recall-sync-conflicts-v1';
function archiveConflict(kind,device,cloud){
 if(!device||!cloud)return;
 const clean=item=>{const x={...item};delete x.recordType;return x};
 if(JSON.stringify(clean(device))===JSON.stringify(clean(cloud)))return;
 try{
  const records=JSON.parse(localStorage.getItem(CONFLICT_KEY)||'[]');
  const list=Array.isArray(records)?records:[];
  const id=kind+':'+idOf(kind,device)+':'+String(device.updatedAt||'')+':'+String(cloud.updatedAt||'');
  if(list.some(x=>x.id===id))return;
  list.push({id,kind,recordId:idOf(kind,device),savedAt:new Date().toISOString(),device:clean(device),cloud:clean(cloud)});
  localStorage.setItem(CONFLICT_KEY,JSON.stringify(list.slice(-100)));
  window.dispatchEvent(new CustomEvent('recall-sync-conflict',{detail:{kind,count:list.length}}));
  statusText('⚠ Different versions detected · Copy saved in Settings > Conflict copies');
 }catch(e){statusText('⚠ Version conflict: export a full backup before editing further');console.error('Cannot archive Recall conflict',e)}
}
window.RecallSyncConflicts={
 read(){try{return JSON.parse(localStorage.getItem(CONFLICT_KEY)||'[]')}catch{return []}},
 download(){
  const data=this.read();
  if(!data.length){statusText('No version conflict copies on this device');return}
  const blob=new Blob([JSON.stringify({format:'recall-conflict-copies',version:1,exportedAt:new Date().toISOString(),records:data},null,2)],{type:'application/json'}),url=URL.createObjectURL(blob),a=document.createElement('a');
  a.href=url;a.download='recall-conflict-copies-'+new Date().toISOString().slice(0,10)+'.json';document.body.appendChild(a);a.click();a.remove();
  setTimeout(()=>URL.revokeObjectURL(url),30000);
 }
};
const conflictButton=document.getElementById('downloadConflictCopies');
if(conflictButton)conflictButton.addEventListener('click',()=>window.RecallSyncConflicts.download());

function putLocal(kind,items){if(!state.user)return;const snapshot=state.snapshots[kind]||[];const cloudIds=new Map(snapshot.map(x=>[idOf(kind,x),x]));for(const item of items){const id=idOf(kind,item);if(!id)continue;const old=cloudIds.get(id);if(old&&String(old.updatedAt||old.createdAt||'')>String(item.updatedAt||item.createdAt||''))archiveConflict(kind,item,old);if(!old||String(item.updatedAt||item.createdAt||'')>String(old.updatedAt||old.createdAt||'')){queue(kind,item)}}}
function arm(key,delay){
 clearTimeout(state.timers.get(key));
 state.timers.set(key,setTimeout(async()=>{
  const value=state.pending.get(key);
  if(!value||!state.user)return;
  const kindName=key.slice(0,key.indexOf(':')),remote=state.snapshots[kindName]?.find(x=>idOf(kindName,x)===idOf(kindName,value));
  if(remote&&String(remote.updatedAt||'')>String(value.updatedAt||'')){archiveConflict(kindName,value,remote);state.pending.delete(key);return}
  const sep=key.indexOf(':'),kind=key.slice(0,sep);
  try{
   await setDoc(doc(list(kind),cloudDocId(kind,value)),prepare(kind,value));
   if(state.pending.get(key)===value)state.pending.delete(key);
   state.retries.delete(key);
   statusText(state.pending.size?'✓ Saved on device · Cloud syncing…':'✓ All changes saved to cloud');
  }catch(e){
   const count=(state.retries.get(key)||0)+1;state.retries.set(key,count);
   if(state.pending.get(key)===value)arm(key,Math.min(60000,1000*2**Math.min(count,6)));
   statusText('⚠ Cloud save failed · Retrying automatically. Local copy retained.');
   console.error('Recall cloud sync retry:',e);
  }
 },delay));
}
function queue(kind,item){
 if(!state.user)return;
 const key=kind+':'+idOf(kind,item);
 const earlier=state.pending.get(key);
 if(!earlier||String(item.updatedAt||'')>=String(earlier.updatedAt||''))state.pending.set(key,item);
 statusText('✓ Saved on device · Syncing to cloud…');
 state.retries.set(key,0);arm(key,180);
}

async function setup(user){
for(const u of state.unsub)u();for(const timer of state.timers.values())clearTimeout(timer);state.timers.clear();state.retries.clear();state.unsub=[];state.pending.clear();state.initial.clear();state.user=user;state.ready=!!user;displayAccount(user);
if(!user){statusText('Saved on this device · Sign in to sync all devices');if(login)login.hidden=false;if(logout)logout.hidden=true;return}
if(login)login.hidden=true;if(logout)logout.hidden=false;statusText('Connecting live cloud sync…');
for(const kind of page){
const unsub=onSnapshot(list(kind),async snapshot=>{
const remote=snapshot.docs.map(x=>x.data()).filter(x=>isMember(kind,x));state.snapshots[kind]=remote;
if(!state.initial.has(kind)){
state.initial.add(kind);
const existing=window.RecallLocal?.(kind)||[];
// Migrate existing browser data only if newer than cloud copy. Never discard local records.
const byId=new Map(remote.map(x=>[idOf(kind,x),x]));
for(const item of existing){const cloud=byId.get(idOf(kind,item));if(!cloud||String(item.updatedAt||item.createdAt||'')>String(cloud.updatedAt||cloud.createdAt||''))queue(kind,item)}
}
const pendingIds=new Set([...state.pending.keys()].filter(k=>k.startsWith(kind+':')).map(k=>k.slice(kind.length+1)));
for(const item of window.RecallLocal?.(kind)||[]){const cloud=remote.find(x=>idOf(kind,x)===idOf(kind,item));if(cloud&&!pendingIds.has(idOf(kind,item))&&String(cloud.updatedAt||'')>String(item.updatedAt||''))archiveConflict(kind,item,cloud)}
const output=new Map(remote.map(x=>[idOf(kind,x),x]));
for(const item of window.RecallLocal?.(kind)||[]){const id=idOf(kind,item),old=output.get(id);if(pendingIds.has(id)||(!old&&!state.initial.has(kind)))output.set(id,item)}
state.snapshots[kind]=[...output.values()];send(kind);
if(!state.pending.size)statusText('✓ Live sync connected · '+(user.email||'Google account'));
},e=>{statusText('⚠ Sync error: '+e.message+'. Check Firestore rules.');console.error(e)});
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
window.addEventListener('recall-cloud-local',e=>{const {kind,items}=e.detail||{};if(!kinds.includes(kind))return;if(!state.user){statusText('Saved on this device · Sign in for cloud sync');return}putLocal(kind,items)});
window.addEventListener('online',()=>{if(!state.user)return;for(const key of state.pending.keys())arm(key,0)});
window.RecallCloud={
  get user(){return state.user},
  sync(kind,items){if(state.user)putLocal(kind,items)},
  get ready(){return initialized},
  // Full cloud read across all record types (concepts share the coding collection).
  async readAll(){
    if(!state.user)throw new Error('Sign in with Google before exporting your cloud data.');
    const entries=await Promise.all(kinds.map(async kind=>{
      const snapshot=await getDocs(list(kind));
      const byId=new Map(snapshot.docs.map(x=>x.data()).filter(x=>isMember(kind,x)).map(x=>[idOf(kind,x),x]));
      for(const [key,item] of state.pending){
        if(key.startsWith(kind+':'))byId.set(idOf(kind,item),item);
      }
      return [kind,[...byId.values()]];
    }));
    return Object.fromEntries(entries);
  },
  async restoreAll(payload){
    if(!state.user)throw new Error('Sign in to restore the backup to the cloud.');
    let count=0;
    for(const kind of kinds){
      const items=Array.isArray(payload[kind])?payload[kind]:[];
      for(let i=0;i<items.length;i+=20){
        await Promise.all(items.slice(i,i+20).map(item=>setDoc(doc(list(kind),cloudDocId(kind,item)),prepare(kind,item))));
        count+=Math.min(20,items.length-i);
      }
    }
    return count;
  }
};

}catch(e){console.error('Firebase initialization failed:',e);show('⚠ Firebase could not load: '+e.message+'. Try refreshing or disabling blockers.');window.dispatchEvent(new Event('recall-firebase-error'));if(login)login.disabled=false}
}
boot();
