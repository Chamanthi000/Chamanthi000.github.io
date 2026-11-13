// Synthetic browser/Firebase/IndexedDB adapters. No network, credentials, or user storage.
import {readFileSync} from 'node:fs';
export const source=name=>readFileSync(new URL('../'+name,import.meta.url),'utf8');
export const KINDS=['coding','sql','goals','habits','structures','concepts','conflicts'];
export const KEYS={coding:'recall-notes-v1',sql:'recall-sql-v1',goals:'recall-goals-habits-v1',habits:'recall-goals-habits-v1',structures:'recall-structures-v1',concepts:'recall-concept-reviews-v1',conflicts:'recall-sync-conflicts-v1'};
export const empty=()=>Object.fromEntries(KINDS.map(k=>[k,[]]));
export const item=(id,notes='original',updatedAt='2026-01-01T00:00:00.000Z')=>({id,notes,updatedAt});
export const flush=async()=>{for(let i=0;i<30;i++)await Promise.resolve()};
export const deferred=()=>{let resolve,reject;const promise=new Promise((a,b)=>{resolve=a;reject=b});return {promise,resolve,reject}};
export function browser(records={}){
 const values=new Map(),events=[],downloads=[],timers=new Map(),elements={};let next=0;
 for(const kind of ['coding','sql','structures','concepts','conflicts'])values.set(KEYS[kind],JSON.stringify(records[kind]||[]));
 values.set(KEYS.goals,JSON.stringify({goals:records.goals||[],habits:records.habits||[],extra:'preserved envelope'}));
 const fault={get:null,set:null,silent:null};
 const storage={get length(){return values.size},key(i){return [...values.keys()][i]??null},getItem(k){if(fault.get?.(k))throw Error('synthetic read failure');return values.get(k)??null},setItem(k,v){if(fault.set?.(k,v))throw Error('synthetic quota failure');if(!fault.silent?.(k,v))values.set(k,String(v))},removeItem(k){if(fault.set?.(k,null))throw Error('synthetic remove failure');values.delete(k)}};
 const target=()=>({listeners:{},addEventListener(k,f){(this.listeners[k]??=[]).push(f)},dispatchEvent(e){events.push(e);for(const fn of this.listeners[e.type]||[])fn(e)}});
 const window=target(),document=target();
 for(const id of ['firebaseStatus','firebaseLogin','firebaseLogout','backupEverything','backupStatus','restoreEverything','backupRestoreFile','backupRestorePreview','backupRestoreSummary','confirmRestore','cancelRestore','autoBackupStatus','autoBackupVersions','autoBackupDownload','autoBackupRefresh'])elements[id]={textContent:'',hidden:true,disabled:false,files:[],value:'',innerHTML:'',style:{},addEventListener(k,f){this['on'+k]=f},closest(){return null},click(){},appendChild(){}};
 document.getElementById=id=>elements[id]||null;
 document.createElement=()=>({style:{},setAttribute(){},appendChild(){},click(){downloads.push(this.download)},remove(){}});
 document.body={appendChild(){}};
 const setTimeout=(fn,delay)=>{const id=++next;timers.set(id,{fn,delay});return id},clearTimeout=id=>timers.delete(id);
 const runTimers=async max=>{for(const [id,t] of [...timers])if(t.delay<=max){timers.delete(id);await t.fn()}await flush()};
 const rows=kind=>{const parsed=JSON.parse(storage.getItem(KEYS[kind])||'null');return kind==='goals'||kind==='habits'?parsed?.[kind]||[]:parsed||[]};
 const save=(kind,items)=>{if(kind==='goals'||kind==='habits'){const v=JSON.parse(storage.getItem(KEYS[kind])||'{}');v[kind]=items;storage.setItem(KEYS[kind],JSON.stringify(v))}else storage.setItem(KEYS[kind],JSON.stringify(items))};
 const navigator={onLine:true},location={pathname:'/index.html',reloaded:0,reload(){this.reloaded++}};
 class CustomEvent{constructor(type,options){this.type=type;this.detail=options?.detail}}
 const URL={createObjectURL:()=> 'blob:synthetic',revokeObjectURL(){}};
 const bindings={document,window,localStorage:storage,setTimeout,clearTimeout,confirm:()=>true,alert(){},URL,Blob,location,CustomEvent,Event:CustomEvent,navigator,console:{warn(){},error(){}}};
 function execute(code,extra={}){const env={...bindings,...extra};return new Function(...Object.keys(env),code)(...Object.values(env))}
 return {values,fault,storage,window,document,elements,events,downloads,timers,runTimers,rows,save,execute,navigator,location};
}
export function manual(b){
 b.execute(source('backup-all.js'));
 return {async preview(data){b.elements.backupRestoreFile.files=[{size:100,text:async()=>JSON.stringify(data)}];await b.elements.backupRestoreFile.onchange({target:b.elements.backupRestoreFile})},confirm:()=>b.elements.confirmRestore.onclick(),export:()=>b.elements.backupEverything.onclick()};
}
export const archive=data=>({format:'recall-full-backup',version:2,...empty(),...data});
export async function firebase(b){
 const store=new Map(),listeners=[],writes=[],transactions=[],controls={beforeGet:null,beforeCommit:null,read:null,fail:false,replay:false};let authCallback;
 const sdk={
  initializeApp:()=>({}),getAuth:()=>({}),getFirestore:()=>({}),GoogleAuthProvider:class{},
  signInWithPopup:async()=>{},signInWithRedirect:async()=>{},getRedirectResult:async()=>null,signOut:async()=>{},
  onAuthStateChanged:(_a,fn)=>{authCallback=fn},
  collection:(_db,...path)=>path.join('/'),doc:(col,id)=>col+'/'+id,
  onSnapshot:(path,_options,callback,error)=>{const l={path,callback,error,active:true};listeners.push(l);return ()=>{l.active=false}},
  getDocsFromServer:async path=>{if(controls.read)await controls.read(path);return snapshot(path)},
  async runTransaction(_db,fn){
   if(controls.fail)throw Error('synthetic unavailable');
   const staged=new Map(),tx={async get(key){if(controls.beforeGet)await controls.beforeGet(key);const value=structuredClone(store.get(key));return {exists:()=>value!==undefined,data:()=>value}},set(key,value){staged.set(key,structuredClone(value))}};
   if(controls.replay){controls.replay=false;await fn(tx);staged.clear()}
   const result=await fn(tx);if(controls.beforeCommit)await controls.beforeCommit();
   for(const [key,value] of staged){store.set(key,value);writes.push({key,value})}transactions.push([...staged.keys()]);return result;
  }
 };
 const snapshot=(path,metadata={fromCache:false,hasPendingWrites:false})=>({docs:[...store].filter(([key])=>key.startsWith(path+'/')&&!key.slice(path.length+1).includes('/')).map(([,value])=>({data:()=>structuredClone(value)})),metadata});
 b.window.RecallLocal=b.rows;
 b.window.addEventListener('recall-cloud-data',e=>{try{b.save(e.detail.kind,e.detail.items)}catch{}});
 const code=source('firebase-sync.js').replace(/import\(base\+'firebase-(?:app|auth|firestore)\.js'\)/g,'Promise.resolve(sdk)');
 b.execute(code,{sdk});await flush();
 return {store,listeners,writes,transactions,controls,cloud:b.window.RecallCloud,async auth(uid='account-A'){await authCallback(uid?{uid,email:'synthetic@example.invalid'}:null);await flush()},emit(kind,metadata){const col=['structures','concepts'].includes(kind)?'coding':kind;for(const l of listeners.filter(l=>l.active&&l.path.endsWith('/'+col)))l.callback(snapshot(l.path,metadata));},emitOld(l,metadata){l.callback(snapshot(l.path,metadata))},local(kind,items){b.save(kind,items);b.window.dispatchEvent({type:'recall-cloud-local',detail:{kind,items}})}};
}
// Minimal asynchronous IDB with commit/abort and readback faults, limited to the production API used.
export function indexedDb(b){
 const rows=new Map(),control={abort:false,dropAdd:false,failOpen:false};let id=0;
 const db={close(){},createObjectStore(){},transaction(_store,mode){
  const staged=new Map(rows),tx={error:null};
  const request=work=>{const req={};queueMicrotask(()=>{try{req.result=work();req.onsuccess?.()}catch(e){req.error=e;req.onerror?.()}});return req};
  tx.objectStore=()=>({getAll:()=>request(()=>structuredClone([...staged.values()])),get:key=>request(()=>structuredClone(staged.get(key))),add(value){if(!control.dropAdd)staged.set(++id,{...structuredClone(value),id});return {}},delete(key){staged.delete(key)}});
  queueMicrotask(()=>queueMicrotask(()=>{if(control.abort&&mode==='readwrite'){tx.error=Error('synthetic abort');tx.onabort?.()}else{if(mode==='readwrite'){rows.clear();for(const [key,val] of staged)rows.set(key,val)}tx.oncomplete?.()}}));return tx;
 }};
 const indexedDB={open(){const req={};queueMicrotask(()=>{if(control.failOpen){req.error=Error('synthetic IDB unavailable');req.onerror?.()}else{req.result=db;req.onsuccess?.()}});return req}};
 b.window.indexedDB=indexedDB;return {rows,control,indexedDB};
}
