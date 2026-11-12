// Load the SDK dynamically so a missing module is reported on screen.
const status=document.getElementById('firebaseStatus');
const login=document.getElementById('firebaseLogin');
const logout=document.getElementById('firebaseLogout');
const show=s=>{if(status)status.textContent=s;};
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
const [{initializeApp},{getAuth,GoogleAuthProvider,signInWithPopup,signInWithRedirect,getRedirectResult,signOut,onAuthStateChanged},{getFirestore,collection,doc,setDoc,onSnapshot}]=await Promise.all([
  import(base+'firebase-app.js'),import(base+'firebase-auth.js'),import(base+'firebase-firestore.js')
]);
const app=initializeApp({apiKey:"AIzaSyCmIM8dCDg9H8D52ZXYPGxEpTV85pBciDQ",authDomain:"recall-46335.firebaseapp.com",projectId:"recall-46335",storageBucket:"recall-46335.firebasestorage.app",messagingSenderId:"611507493769",appId:"1:611507493769:web:708b8c892c47aed721df58"});
const auth=getAuth(app),db=getFirestore(app),provider=new GoogleAuthProvider();
const state={user:null,ready:false,unsub:[],pending:new Map(),timers:new Map(),snapshots:{coding:[],sql:[],goals:[],habits:[]},initial:new Set()};
const kinds=['coding','sql','goals','habits'];
const page=location.pathname.endsWith('goals.html')?['goals','habits']:['coding','sql'];
const statusText=s=>{if(status)status.textContent=s;};
function idOf(kind,item){return String(item.id||(kind==='coding'?item.number:'')||(kind==='sql'?item.title?.trim().toLowerCase():''));}
function list(kind){return collection(db,'users',state.user.uid,kind)}
function send(kind){window.dispatchEvent(new CustomEvent('recall-cloud-data',{detail:{kind,items:state.snapshots[kind]}}))}
function putLocal(kind,items){if(!state.user)return;const snapshot=state.snapshots[kind]||[];const cloudIds=new Map(snapshot.map(x=>[idOf(kind,x),x]));for(const item of items){const id=idOf(kind,item);if(!id)continue;const old=cloudIds.get(id);if(!old||String(item.updatedAt||item.createdAt||'')>String(old.updatedAt||old.createdAt||'')){queue(kind,item)}}}
function queue(kind,item){if(!state.user)return;const key=kind+':'+idOf(kind,item);const earlier=state.pending.get(key);if(!earlier||String(item.updatedAt||'')>=String(earlier.updatedAt||''))state.pending.set(key,item);statusText('Saved on this device · Cloud syncing…');clearTimeout(state.timers.get(key));state.timers.set(key,setTimeout(async()=>{const value=state.pending.get(key);if(!value)return;try{await setDoc(doc(list(kind),idOf(kind,value)),value);if(state.pending.get(key)===value)state.pending.delete(key);statusText(state.pending.size?'Saved locally · Cloud syncing…':'✓ All changes saved to cloud')}catch(e){statusText('⚠ Cloud save failed: '+e.message+' · Keep this device data');console.error(e)}},180))}
async function setup(user){
for(const u of state.unsub)u();state.unsub=[];state.pending.clear();state.initial.clear();state.user=user;state.ready=!!user;
if(!user){statusText('Saved on this device · Sign in to sync all devices');if(login)login.hidden=false;if(logout)logout.hidden=true;return}
if(login)login.hidden=true;if(logout)logout.hidden=false;statusText('Connecting live cloud sync…');
for(const kind of page){
const unsub=onSnapshot(list(kind),async snapshot=>{
const remote=snapshot.docs.map(x=>x.data());state.snapshots[kind]=remote;
if(!state.initial.has(kind)){
state.initial.add(kind);
const existing=window.RecallLocal?.(kind)||[];
// Migrate existing browser data only if newer than cloud copy. Never discard local records.
const byId=new Map(remote.map(x=>[idOf(kind,x),x]));
for(const item of existing){const cloud=byId.get(idOf(kind,item));if(!cloud||String(item.updatedAt||item.createdAt||'')>String(cloud.updatedAt||cloud.createdAt||''))queue(kind,item)}
}
const pendingIds=new Set([...state.pending.keys()].filter(k=>k.startsWith(kind+':')).map(k=>k.slice(kind.length+1)));
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
    show(diagnostic('auth/popup-blocked'));
  }else{show(diagnostic(e.code)+' '+(e.message||''))}
}};initialized=true;window.dispatchEvent(new Event('recall-firebase-ready'));show('Firebase ready · Sign in with Google to enable cloud sync');
if(logout)logout.onclick=()=>signOut(auth);
window.addEventListener('recall-cloud-local',e=>{const {kind,items}=e.detail||{};if(!kinds.includes(kind))return;if(!state.user){statusText('Saved on this device · Sign in for cloud sync');return}putLocal(kind,items)});
window.RecallCloud={get user(){return state.user},sync(kind,items){if(state.user)putLocal(kind,items)},get ready(){return initialized}};

}catch(e){console.error('Firebase initialization failed:',e);show('⚠ Firebase could not load: '+e.message+'. Try refreshing or disabling blockers.');window.dispatchEvent(new Event('recall-firebase-error'));if(login)login.disabled=false}
}
boot();
