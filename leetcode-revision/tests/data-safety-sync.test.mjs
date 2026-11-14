import test from 'node:test';
import assert from 'node:assert/strict';
import {browser,firebase,item,KEYS,empty,deferred,flush,source} from './data-safety-mocks.mjs';
const path=id=>'users/account-A/coding/'+id;
const writeError=(code,message='synthetic write failure')=>Object.assign(new Error(message),{code});
const statuses=b=>b.events.filter(e=>e.type==='recall-cloud-status').map(e=>e.detail.message);
// Existing injected read failures now have a known stage; unrecognized invalid arguments
// deliberately carry unknown-format. Non-invalid codes still have no reason property.
const readFailure=(code,kind='coding')=>({kind,code,stage:'target-read',...(code==='invalid-argument'?{reason:'unknown-format'}:{})});

// Extend only the synthetic SDK boundaries; the production write path runs unchanged.
async function diagnosticFirebase(b,fault={}){
 const execute=b.execute;
 b.execute=(code,extra={})=>{
  if(!extra.sdk)return execute(code,extra);
  const original=extra.sdk,sdk={...original,
   doc(...args){fault.reference?.(...args);return original.doc(...args)},
   runTransaction(db,callback){
    fault.start?.();
    return original.runTransaction(db,tx=>callback({...tx,set(...args){fault.write?.(...args);return tx.set(...args)}}));
   }
  };
  return execute(code,{...extra,sdk});
 };
 try{return await firebase(b)}finally{b.execute=execute}
}
const secret='private-note-text private@example.invalid credential-secret';
const secretPath='projects/private-project/databases/(default)/documents/users/private-account/coding/private-record-id';
const secretField='private-field-path';
const noSecrets=value=>assert.doesNotMatch(JSON.stringify(value),/private-|credential-secret/);
const sdkData=(reason,method='Transaction.set')=>'Function '+method+'() called with invalid data. '+reason+' (found in field '+secretField+' in document '+secretPath+')';
const nestedMessage=sdkData('Nested arrays are not supported');
const largeMessage="Document '"+secretPath+"' cannot be written because its size (1,200,058 bytes) exceeds the maximum allowed size of 1,048,576 bytes.";
const pathMessage='Invalid document reference. Document references must have an even number of segments, but '+secretPath+'/private-child has 5.';

for(const [reason,message,guidance] of [
 ['nested-arrays',nestedMessage,/record schema.*arrays/i],
 ['undefined-field',sdkData('Unsupported field value: undefined'),/undefined fields/i],
 ['reserved-field-name',sdkData('Document fields cannot begin and end with "__"'),/reserved field names/i],
 ['unsupported-value',sdkData('Unsupported field value: a custom '+secret+' object'),/unsupported values/i],
 ['record-too-large',largeMessage,/record size/i],
 ['record-too-large','The value of property "'+secretField+'" is longer than 1048487 bytes.',/record size/i],
 ['record-too-deep','Value for argument "data" is not a valid Firestore document. Input object is deeper than 20 levels or contains a cycle.',/nesting depth/i],
 ['invalid-document-path',pathMessage,/document path/i],
 ['invalid-document-path','Invalid segment ('+secretPath+'//private-child). Paths must not contain // in them.',/document path/i],
 ['invalid-document-path','Function doc() cannot be called with an empty path.',/document path/i],
 ['unknown-format','Unrecognized SDK format: '+secret,/record format/i]
])test('invalid-argument template reports only safe '+reason+' guidance: '+message.split(' ')[0],async()=>{
 const retained={id:'retained',kind:'coding',recordId:'retained-id',device:item('retained-id',secret),cloud:item('retained-id','older')};
 const b=browser({conflicts:[retained]}),f=await firebase(b);await f.auth();const record=item('private-record-id',secret);
 f.controls.beforeGet=()=>{throw Object.assign(writeError('firestore/invalid-argument',message),{stage:secret,reason:secret,cause:{notes:secret}})};
 f.local('coding',[record]);await b.runTimers(180);f.emit('sql');
 assert.deepEqual(f.cloud.writeErrors,[{kind:'coding',code:'invalid-argument',stage:'target-read',reason}]);
 const diagnostic=f.cloud.writeErrors[0];assert.ok(Object.isFrozen(diagnostic));
 assert.throws(()=>{diagnostic.stage='record-write'},TypeError);assert.throws(()=>{diagnostic.reason='unsupported-value'},TypeError);
 const warning=b.elements.firebaseStatus.textContent;
 assert.match(warning,/Conflicts.*Cloud save failed · Retrying automatically/);assert.match(warning,guidance);
 assert.ok(warning.includes('stage: target-read'));assert.ok(warning.includes('reason: '+reason));
 noSecrets([statuses(b),f.cloud.writeErrors]);
 assert.equal(f.cloud.pendingCount,1);assert.deepEqual(b.rows('coding'),[record]);assert.deepEqual(b.rows('conflicts'),[retained]);assert.equal(f.writes.length,0);
 f.controls.beforeGet=null;await b.runTimers(2000);
 assert.equal(f.cloud.pendingCount,0);assert.deepEqual(f.store.get(path(record.id)),record);assert.deepEqual(b.rows('conflicts'),[retained]);assert.deepEqual(f.cloud.writeErrors,[]);
});

test('invalid argument matching ignores generic note text and template words embedded in SDK values',async()=>{
 for(const message of [
  secret+' invalid document nested arrays undefined maximum depth',
  'invalid document '+secret,
  'Nested arrays are not supported in my '+secret,
  'Unsupported field value: undefined '+secret,
  'Property '+secretField+' contains an invalid nested entity.',
  sdkData('Data must be an object, but it was: "invalid document '+secret+'"'),
  sdkData('Data must be an object, but it was: "'+nestedMessage+'"'),
  sdkData('Nested arrays are not supported by this '+secret),
  sdkData('Unrecognized error in '+secret+' '+pathMessage),
  undefined,null,42,{toString(){throw Error('must not stringify private value')}}
 ]){
  const b=browser(),f=await firebase(b);await f.auth();
  f.controls.beforeGet=()=>{throw {code:'invalid-argument',message,stage:'history-write',reason:'nested-arrays'}};
  f.local('coding',[item('private-record-id',secret)]);await b.runTimers(180);
  assert.deepEqual(f.cloud.writeErrors,[readFailure('invalid-argument')]);noSecrets([statuses(b),f.cloud.writeErrors]);
 }
});

test('specific schema reasons win only at the SDK reason position, and only for invalid-argument',async()=>{
 for(const [code,message,reason] of [
  ['invalid-argument',sdkData('Unsupported field value: "'+pathMessage+' '+nestedMessage+'"'),'unsupported-value'],
  ['invalid-argument',sdkData('Unsupported field value: undefined','setDoc'),'undefined-field'],
  ['invalid-argument',nestedMessage.replace('invalid data.','invalid data (via `toFirestore()`).'),'nested-arrays'],
  ['permission-denied',nestedMessage,undefined],['unknown',largeMessage,undefined]
 ]){
  const b=browser(),f=await firebase(b);await f.auth();f.controls.beforeGet=()=>{throw writeError(code,message)};
  f.local('coding',[item('a')]);await b.runTimers(180);
  assert.deepEqual(f.cloud.writeErrors,[{kind:'coding',code,stage:'target-read',...(reason?{reason}:{})}]);noSecrets([statuses(b),f.cloud.writeErrors]);
 }
});

for(const stage of ['document-reference','target-read','history-read','history-write','record-write','transaction-commit'])test(stage+' failure keeps exact pending, local, cloud and history copies',async()=>{
 const b=browser(),fault={},f=await diagnosticFirebase(b,fault);await f.auth();
 const previous=item('private-record-id','previous '+secret),record=item(previous.id,secret,'2026-02-01');
 const historyKey=path('recall-history-coding-'+record.id),history={recordType:'syncBackup',originKind:'coding',originId:record.id,versions:[{archivedAt:'2025-01-01',value:item(record.id,'archived '+secret)}]};
 f.store.set(path(record.id),previous);f.store.set(historyKey,history);
 const message=stage==='document-reference'?pathMessage:stage==='transaction-commit'?largeMessage:nestedMessage;
 const fail=()=>{throw writeError('invalid-argument',message)};
 if(stage==='document-reference')fault.reference=fail;
 if(stage.endsWith('-read'))f.controls.beforeGet=key=>{if((key===historyKey)===(stage==='history-read'))fail()};
 if(stage.endsWith('-write'))fault.write=key=>{if((key===historyKey)===(stage==='history-write'))fail()};
 if(stage==='transaction-commit')f.controls.beforeCommit=fail;
 f.local('coding',[record]);await b.runTimers(180);
 const reason=stage==='document-reference'?'invalid-document-path':stage==='transaction-commit'?'record-too-large':'nested-arrays';
 assert.deepEqual(f.cloud.writeErrors,[{kind:'coding',code:'invalid-argument',stage,reason}]);
 noSecrets([statuses(b),f.cloud.writeErrors]);assert.equal(f.cloud.pendingCount,1);assert.deepEqual(b.rows('coding'),[record]);assert.deepEqual((await f.cloud.readAll()).coding,[record]);
 assert.deepEqual(f.store.get(path(record.id)),previous);assert.deepEqual(f.store.get(historyKey),history);assert.equal(f.writes.length,0);
 fault.reference=fault.write=f.controls.beforeGet=f.controls.beforeCommit=null;await b.runTimers(2000);
 assert.equal(f.cloud.pendingCount,0);assert.deepEqual(f.cloud.writeErrors,[]);assert.deepEqual(f.store.get(path(record.id)),record);
 assert.deepEqual(f.store.get(historyKey).versions.map(v=>v.value),[history.versions[0].value,previous]);
});

test('second document reference construction failure also reports document-reference',async()=>{
 const b=browser(),f=await diagnosticFirebase(b,{reference:(_collection,id)=>{if(id.startsWith('recall-history-'))throw writeError('invalid-argument',pathMessage)}});await f.auth();
 const record=item('a',secret);f.local('coding',[record]);await b.runTimers(180);
 assert.deepEqual(f.cloud.writeErrors,[{kind:'coding',code:'invalid-argument',stage:'document-reference',reason:'invalid-document-path'}]);
 assert.equal(f.cloud.pendingCount,1);assert.deepEqual(b.rows('coding'),[record]);assert.equal(f.writes.length,0);noSecrets([statuses(b),f.cloud.writeErrors]);
});

for(const outcome of ['saved','unchanged','remote-newer'])test('late transaction rejection after '+outcome+' is classified as commit and retains the pending version',async()=>{
 const b=browser(),f=await firebase(b);await f.auth();const record=item('a',secret),gate=deferred();
 if(outcome!=='saved')f.store.set(path('a'),outcome==='unchanged'?record:item('a','server','2026-02-01'));
 const before=structuredClone([...f.store]);f.controls.beforeCommit=()=>gate.promise;
 f.local('coding',[record]);const running=b.runTimers(180);await flush();assert.equal(f.cloud.pendingCount,1);assert.deepEqual(f.cloud.writeErrors,[]);
 gate.reject(writeError('invalid-argument',largeMessage));await running;
 assert.deepEqual(f.cloud.writeErrors,[{kind:'coding',code:'invalid-argument',stage:'transaction-commit',reason:'record-too-large'}]);
 assert.equal(f.cloud.pendingCount,1);assert.deepEqual(b.rows('coding'),[record]);assert.deepEqual([...f.store],before);assert.equal(f.writes.length,0);assert.deepEqual(b.rows('conflicts'),[]);noSecrets([statuses(b),f.cloud.writeErrors]);
});

test('transaction rejection before callback entry has a safe commit stage',async()=>{
 const b=browser(),f=await diagnosticFirebase(b,{start(){throw writeError('invalid-argument',largeMessage)}});await f.auth();
 f.local('coding',[item('a',secret)]);await b.runTimers(180);
 assert.deepEqual(f.cloud.writeErrors,[{kind:'coding',code:'invalid-argument',stage:'transaction-commit',reason:'record-too-large'}]);assert.equal(f.cloud.pendingCount,1);noSecrets([statuses(b),f.cloud.writeErrors]);
});

test('overlapping writes keep independent stages and reasons',async()=>{
 const b=browser(),f=await diagnosticFirebase(b,{write(key){if(key.endsWith('/sql/b'))throw writeError('invalid-argument',sdkData('Unsupported field value: undefined'))}});await f.auth();
 const a=item('a',secret,'2026-02-01'),other=item('b',secret),gate=deferred();f.store.set(path('a'),item('a','previous'));
 f.controls.beforeGet=key=>key.includes('recall-history-')?gate.promise:undefined;
 f.local('coding',[a]);const running=b.runTimers(180);await flush();f.local('sql',[other]);await b.runTimers(180);
 gate.reject(writeError('invalid-argument',nestedMessage));await running;
 assert.deepEqual(f.cloud.writeErrors,[{kind:'sql',code:'invalid-argument',stage:'record-write',reason:'undefined-field'},{kind:'coding',code:'invalid-argument',stage:'history-read',reason:'nested-arrays'}]);
 assert.equal(f.cloud.pendingCount,2);assert.deepEqual(b.rows('coding'),[a]);assert.deepEqual(b.rows('sql'),[other]);assert.equal(f.writes.length,0);noSecrets([statuses(b),f.cloud.writeErrors]);
});

test('SDK callback replay resets the operation stage for its new target read',async()=>{
 const b=browser(),f=await firebase(b);await f.auth();let reads=0;f.controls.replay=true;
 f.controls.beforeGet=()=>{if(++reads===2)throw writeError('invalid-argument',nestedMessage)};
 f.local('coding',[item('a')]);await b.runTimers(180);
 assert.deepEqual(f.cloud.writeErrors,[{kind:'coding',code:'invalid-argument',stage:'target-read',reason:'nested-arrays'}]);assert.equal(f.cloud.pendingCount,1);assert.equal(f.writes.length,0);
});

test('standalone history helper errors contain only safe metadata without retaining the SDK error',async()=>{
 const code=source('firebase-sync.js'),start=code.indexOf('const HISTORY_PREFIX='),stop=code.indexOf('const historyButton=',start);
 const raw=Object.assign(writeError('firestore/invalid-argument',nestedMessage),{cause:{notes:secret},stage:secret,reason:secret});
 const helpers=browser().execute(code.slice(start,stop)+'return {writeWithHistory,writeErrorDetails,safeWriteError};',{
  state:{},db:{},list:()=> 'coding',doc:(col,id)=>col+'/'+id,cloudDocId:(_kind,item)=>item.id,idOf:(_kind,item)=>item.id,prepare:(_kind,item)=>item,
  runTransaction:async()=>{throw raw}
 });
 await assert.rejects(helpers.writeWithHistory('coding',item('a')),error=>{
  assert.notEqual(error,raw);assert.deepEqual({...error},{code:'invalid-argument',stage:'transaction-commit',reason:'nested-arrays'});
  assert.equal(error.cause,undefined);assert.equal(error.message,'Cloud save failed.');noSecrets([error,error.message,error.stack,String(error)]);return true;
 });
 assert.deepEqual(helpers.writeErrorDetails({code:'unknown',stage:secret,reason:secret}),{code:'unknown'});
 assert.deepEqual(helpers.writeErrorDetails({code:'invalid-argument',stage:'__proto__',reason:'toString'}),{code:'invalid-argument'});
 assert.deepEqual(helpers.writeErrorDetails({code:'unavailable',reason:'nested-arrays'}),{code:'unavailable'});
 assert.deepEqual({...helpers.safeWriteError(secret,secret)},{code:'unknown'});
});

test('restoreAll rejects missing optimistic guard; every changed restored version has transaction history',async()=>{
 const b=browser(),f=await firebase(b);await f.auth();const a=item('a');f.store.set(path('a'),a);
 await assert.rejects(f.cloud.restoreAll({coding:[item('a','import')]}),/prior versions/);
 const options={expected:{coding:[a]},sessionToken:f.cloud.sessionToken,results:[]};
 await f.cloud.restoreAll({coding:[item('a','import','2026-02-01')]},options);
 const first=f.store.get(path('a'));
 await f.cloud.restoreAll({coding:[item('a','second restore','2026-02-02')]},{...options,expected:{coding:[first]}});
 const history=[...f.store.values()].find(x=>x.recordType==='syncBackup');
 assert.deepEqual(history.versions.map(v=>v.value),[a,first]);
 assert.ok(f.transactions.every(keys=>keys.includes(path('a'))&&keys.some(k=>k.includes('recall-history-'))));
});

test('exact guard rejects same-time divergent prior value and absent-record race without overwriting',async()=>{
 for(const expected of [item('a','preview'),null]){
  const b=browser(),f=await firebase(b);await f.auth();const remote=item('a','concurrent');f.store.set(path('a'),remote);const results=[];
  const n=await f.cloud.restoreAll({coding:[item('a','import')]},{expected:{coding:expected?[expected]:[]},sessionToken:f.cloud.sessionToken,results});
  assert.equal(n,0);assert.equal(results[0].result,'remote-newer');assert.deepEqual(f.store.get(path('a')),remote);assert.equal(b.rows('conflicts').length,1);
 }
});

test('oversized predecessor cannot be silently overwritten when restore history cannot retain it',async()=>{
 const b=browser(),f=await firebase(b);await f.auth();const a=item('a','x'.repeat(460000));f.store.set(path('a'),a);
 await assert.rejects(f.cloud.restoreAll({coding:[item('a','import')]},{expected:{coding:[a]},sessionToken:f.cloud.sessionToken}),/could not be archived/);
 assert.deepEqual(f.store.get(path('a')),a);assert.equal(f.writes.length,0);
});

for(const failure of ['quota','silent','corrupt'])test('snapshot conflict archive '+failure+' retains exact device copy',async()=>{
 const device=item('a','device'),cloud=item('a','server','2026-02-01'),b=browser({coding:[device]}),f=await firebase(b);await f.auth();f.store.set(path('a'),cloud);
 if(failure==='quota')b.fault.set=k=>k===KEYS.conflicts;
 if(failure==='silent')b.fault.silent=k=>k===KEYS.conflicts;
 if(failure==='corrupt')b.values.set(KEYS.conflicts,'corrupt');
 f.emit('coding');assert.deepEqual(b.rows('coding'),[device]);assert.match(b.elements.firebaseStatus.textContent,/Conflicts/);assert.equal(f.writes.length,0);
});

test('failed conflict archive during pending write does not release or send the unarchived device version',async()=>{
 const b=browser(),f=await firebase(b);await f.auth();const device=item('a','device'),cloud=item('a','server','2026-02-01');
 f.local('coding',[device]);f.store.set(path('a'),cloud);b.fault.set=k=>k===KEYS.conflicts;
 await b.runTimers(180);assert.equal(f.cloud.pendingCount,1);assert.deepEqual(b.rows('coding'),[device]);assert.deepEqual(f.store.get(path('a')),cloud);
 b.fault.set=null;b.window.dispatchEvent({type:'online'});await b.runTimers(0);
 assert.equal(f.cloud.pendingCount,0);assert.equal(b.rows('conflicts')[0].device.notes,'device');assert.equal(b.rows('coding')[0].notes,'server');
});

test('same-time device conflicts keep distinct recoverable copies without evicting old entries',async()=>{
 const b=browser({conflicts:Array.from({length:100},(_,i)=>({id:'old-'+i}))}),f=await firebase(b);await f.auth();f.store.set(path('a'),item('a','server','2026-03-01'));
 f.local('coding',[item('a','device one')]);await b.runTimers(180);
 f.local('coding',[item('a','device two')]);await b.runTimers(180);
 assert.equal(b.rows('conflicts').length,102);assert.equal(b.rows('conflicts')[100].device.notes,'device one');assert.equal(b.rows('conflicts')[101].device.notes,'device two');
});

test('cached or locally pending snapshots cannot report cloud confirmed; server metadata can',async()=>{
 const b=browser(),f=await firebase(b);await f.auth();
 for(const k of ['coding','sql'])f.emit(k,{fromCache:true,hasPendingWrites:false});
 assert.match(b.elements.firebaseStatus.textContent,/Waiting/);assert.doesNotMatch(b.elements.firebaseStatus.textContent,/Cloud confirmed/);
 for(const k of ['coding','sql'])f.emit(k,{fromCache:false,hasPendingWrites:true});
 assert.doesNotMatch(b.elements.firebaseStatus.textContent,/Cloud confirmed/);
 for(const k of ['coding','sql'])f.emit(k,{fromCache:false,hasPendingWrites:false});
 assert.match(b.elements.firebaseStatus.textContent,/Cloud confirmed/);
});

test('offline queues and online retries; acknowledgement is reported only after transaction completion',async()=>{
 const b=browser(),f=await firebase(b);await f.auth();b.navigator.onLine=false;f.local('coding',[item('a')]);await b.runTimers(180);
 assert.equal(f.cloud.pendingCount,1);assert.equal(f.writes.length,0);assert.match(b.elements.firebaseStatus.textContent,/Offline/);
 const gate=deferred();f.controls.beforeGet=()=>gate.promise;b.navigator.onLine=true;b.window.dispatchEvent({type:'online'});
 const running=b.runTimers(0);await flush();assert.match(b.elements.firebaseStatus.textContent,/Syncing/);assert.equal(f.writes.length,0);
 gate.resolve();await running;assert.equal(f.cloud.pendingCount,0);assert.match(b.elements.firebaseStatus.textContent,/Cloud confirmed/);
});

test('transaction failure retains queued changes and retries successfully',async()=>{
 const b=browser(),f=await firebase(b);await f.auth();f.controls.fail=true;f.local('coding',[item('a')]);await b.runTimers(180);
 assert.equal(f.cloud.pendingCount,1);assert.match(b.elements.firebaseStatus.textContent,/Cloud save failed/);
 assert.deepEqual(f.cloud.writeErrors,[{kind:'coding',code:'unknown',stage:'transaction-commit'}]);
 assert.deepEqual([...b.timers.values()].map(t=>t.delay),[2000]);
 await b.runTimers(2000);assert.deepEqual([...b.timers.values()].map(t=>t.delay),[4000]);
 f.controls.fail=false;await b.runTimers(4000);assert.equal(f.cloud.pendingCount,0);assert.ok(f.store.has(path('a')));
 assert.deepEqual(f.cloud.writeErrors,[]);assert.match(b.elements.firebaseStatus.textContent,/Cloud confirmed/);
});

for(const [code,action] of [
 ['permission-denied',/account permissions/i],['unauthenticated',/sign in again/i],
 ['unavailable',/network connection/i],['deadline-exceeded',/network connection/i],
 ['resource-exhausted',/quota/i],['invalid-argument',/record format/i],['unknown',/try again/i]
])for(const prefix of ['','firestore/'])test('write diagnostic is actionable and normalized for '+prefix+code,async()=>{
 const b=browser(),f=await firebase(b);await f.auth();const record=item('a');
 f.controls.beforeGet=()=>{throw writeError(prefix+code)};f.local('coding',[record]);await b.runTimers(180);
 const message=b.elements.firebaseStatus.textContent;
 assert.match(message,/^⚠ Cloud save failed · Retrying automatically/);assert.match(message,action);
 assert.ok(message.includes('coding: '+code));assert.doesNotMatch(message,/firestore\//);
 assert.deepEqual(f.cloud.writeErrors,[readFailure(code)]);
 assert.equal(f.cloud.pendingCount,1);assert.deepEqual(b.rows('coding'),[record]);assert.equal(f.writes.length,0);
});

test('write diagnostics allowlist codes and expose no exception text, record IDs, notes or emails',async()=>{
 const record=item('private-record-id','private-note-text'),privateText='private-record-id private-note-text private@example.invalid';
 for(const code of ['firestore/permission-denied','firestore/'+privateText,privateText,'toString','__proto__','firestore/firestore/unavailable',undefined,null,42]){
  const b=browser(),f=await firebase(b);await f.auth();
  f.controls.beforeGet=()=>{throw Object.assign(writeError(code,privateText),{recordId:record.id,notes:record.notes,email:'private@example.invalid'})};
  f.local('coding',[record]);await b.runTimers(180);
  const diagnostics=f.cloud.writeErrors,expected=code==='firestore/permission-denied'?'permission-denied':'unknown';
  assert.deepEqual(diagnostics,[readFailure(expected)]);
  assert.doesNotMatch(JSON.stringify([statuses(b),diagnostics]),/private-record-id|private-note-text|private@example\.invalid/);
  assert.ok(Object.isFrozen(diagnostics));assert.ok(Object.isFrozen(diagnostics[0]));
  assert.throws(()=>diagnostics.push({kind:'sql',code:'unknown'}),TypeError);
  assert.throws(()=>{diagnostics[0].code='unavailable'},TypeError);
  assert.throws(()=>{f.cloud.writeErrors=[]},TypeError);
  assert.deepEqual(f.cloud.writeErrors,[readFailure(expected)]);
 }
});

test('write diagnostics do not expose an unrecognized kind passed to the sync API',async()=>{
 const b=browser(),f=await firebase(b);await f.auth();
 f.controls.beforeGet=()=>{throw writeError('unavailable','private exception')};
 f.cloud.sync('private@example.invalid',[item('private-record-id','private-note-text')]);await b.runTimers(180);
 assert.deepEqual(f.cloud.writeErrors,[readFailure('unavailable','unknown')]);
 assert.doesNotMatch(JSON.stringify([statuses(b),f.cloud.writeErrors]),/private/);
});

for(const otherKind of ['coding','sql'])test('unrelated snapshots and successful '+otherKind+' write cannot mask a failed pending save',async()=>{
 const b=browser(),f=await firebase(b);await f.auth();f.emit('coding');f.emit('sql');const failed=item('a','still pending');
 f.controls.beforeGet=key=>{if(key===path('a'))throw writeError('permission-denied')};
 f.local('coding',[failed]);await b.runTimers(180);const start=statuses(b).length-1;
 f.emit('sql');f.emit('coding');
 f.local(otherKind,otherKind==='coding'?[failed,item('b')]:[item('b')]);await b.runTimers(180);
 assert.ok(f.store.has('users/account-A/'+otherKind+'/b'));assert.equal(f.cloud.pendingCount,1);
 assert.deepEqual(f.cloud.writeErrors,[readFailure('permission-denied')]);
 assert.deepEqual((await f.cloud.readAll()).coding.find(x=>x.id==='a'),failed);
 for(const message of statuses(b).slice(start)){
  assert.match(message,/Cloud save failed · Retrying automatically/);assert.match(message,/coding: permission-denied/);assert.doesNotMatch(message,/Cloud confirmed/);
 }
 f.controls.beforeGet=null;await b.runTimers(2000);
 assert.equal(f.cloud.pendingCount,0);assert.deepEqual(f.cloud.writeErrors,[]);assert.match(b.elements.firebaseStatus.textContent,/Cloud confirmed/);
});

test('recovery removes only the matching record error when multiple records fail',async()=>{
 const b=browser(),f=await firebase(b);await f.auth();const a=item('a'),other=item('b');
 f.controls.beforeGet=key=>{throw writeError(key===path('a')?'unavailable':'invalid-argument')};
 f.local('coding',[a,other]);await b.runTimers(180);
 assert.deepEqual(f.cloud.writeErrors,[readFailure('unavailable'),readFailure('invalid-argument')]);
 f.controls.beforeGet=key=>{if(key===path('a'))throw writeError('unavailable')};await b.runTimers(2000);
 assert.deepEqual(f.cloud.writeErrors,[readFailure('unavailable')]);assert.equal(f.cloud.pendingCount,1);
 assert.deepEqual(f.store.get(path('b')),other);assert.match(b.elements.firebaseStatus.textContent,/coding: unavailable/);
 f.controls.beforeGet=null;await b.runTimers(4000);assert.deepEqual(f.cloud.writeErrors,[]);assert.equal(f.cloud.pendingCount,0);
});

for(const outcome of ['unchanged','conflict'])test('matching pending '+outcome+' completion clears its write error',async()=>{
 const b=browser(),f=await firebase(b);await f.auth();const device=item('a');
 f.controls.beforeGet=()=>{throw writeError('unavailable')};f.local('coding',[device]);await b.runTimers(180);
 f.controls.beforeGet=null;f.store.set(path('a'),outcome==='unchanged'?device:item('a','newer server','2026-02-01'));
 if(outcome==='conflict'){
  b.fault.set=k=>k===KEYS.conflicts;await b.runTimers(2000);
  assert.equal(f.cloud.pendingCount,1);assert.deepEqual(f.cloud.writeErrors,[readFailure('unavailable')]);
  assert.match(b.elements.firebaseStatus.textContent,/Conflicts.*Cloud save failed/);
  b.fault.set=null;b.window.dispatchEvent({type:'online'});
 }
 await b.runTimers(2000);assert.equal(f.cloud.pendingCount,0);assert.deepEqual(f.cloud.writeErrors,[]);assert.equal(f.writes.length,0);
 assert.doesNotMatch(b.elements.firebaseStatus.textContent,/Cloud save failed/);
 if(outcome==='conflict')assert.deepEqual(b.rows('conflicts')[0].device,device);
});

for(const outcome of ['saved','unchanged','conflict'])test('older '+outcome+' completion cannot clear a newer queued version failure',async()=>{
 const b=browser(),f=await firebase(b);await f.auth();const first=item('a'),later=item('a','later edit','2026-03-01');
 f.controls.beforeGet=()=>{throw writeError('unavailable')};f.local('coding',[first]);await b.runTimers(180);
 f.controls.beforeGet=null;
 if(outcome!=='saved')f.store.set(path('a'),outcome==='unchanged'?first:item('a','server edit','2026-02-01'));
 const gate=deferred();f.controls.beforeCommit=()=>gate.promise;const running=b.runTimers(2000);await flush();
 f.controls.beforeCommit=null;f.controls.beforeGet=()=>{throw writeError('invalid-argument')};
 f.local('coding',[later]);await b.runTimers(180);gate.resolve();await running;
 assert.equal(f.cloud.pendingCount,1);assert.deepEqual(f.cloud.writeErrors,[readFailure('invalid-argument')]);
 assert.deepEqual((await f.cloud.readAll()).coding,[later]);assert.match(b.elements.firebaseStatus.textContent,/coding: invalid-argument/);
 f.controls.beforeGet=null;await b.runTimers(2000);
 assert.equal(f.cloud.pendingCount,0);assert.deepEqual(f.cloud.writeErrors,[]);assert.deepEqual(f.store.get(path('a')),later);
});

test('late failure of a replaced pending version cannot overwrite the current diagnostic',async()=>{
 const b=browser(),f=await firebase(b);await f.auth();const gate=deferred();
 f.controls.beforeGet=()=>gate.promise;f.local('coding',[item('a')]);const running=b.runTimers(180);await flush();
 f.controls.beforeGet=()=>{throw writeError('invalid-argument')};f.local('coding',[item('a','later','2026-02-01')]);await b.runTimers(180);
 gate.reject(writeError('permission-denied'));await running;
 assert.equal(f.cloud.pendingCount,1);assert.deepEqual(f.cloud.writeErrors,[readFailure('invalid-argument')]);
 assert.match(b.elements.firebaseStatus.textContent,/coding: invalid-argument/);assert.doesNotMatch(b.elements.firebaseStatus.textContent,/permission-denied/);
});

for(const settlement of ['resolve','reject'])test('write errors and late '+settlement+' callbacks are isolated across same-uid auth epochs',async()=>{
 const b=browser(),f=await firebase(b);await f.auth();
 f.controls.beforeGet=()=>{throw writeError('unavailable')};f.local('coding',[item('a')]);await b.runTimers(180);
 const staleTimer=[...b.timers.values()][0];
 f.controls.beforeGet=null;const gate=deferred();f.controls.beforeCommit=()=>gate.promise;const running=b.runTimers(2000);await flush();
 await f.auth(null);assert.deepEqual(f.cloud.writeErrors,[]);const signedOut=b.elements.firebaseStatus.textContent;
 await staleTimer.fn();assert.equal(b.elements.firebaseStatus.textContent,signedOut);
 await f.auth();assert.deepEqual(f.cloud.writeErrors,[]);
 f.controls.beforeCommit=null;f.controls.beforeGet=()=>{throw writeError('invalid-argument')};
 f.local('coding',[item('a','new session','2026-03-01')]);await b.runTimers(180);const current=b.elements.firebaseStatus.textContent;
 gate[settlement](writeError('permission-denied'));await running;
 assert.equal(f.cloud.pendingCount,1);assert.deepEqual(f.cloud.writeErrors,[readFailure('invalid-argument')]);
 assert.equal(b.elements.firebaseStatus.textContent,current);
 await f.auth();assert.deepEqual(f.cloud.writeErrors,[]);assert.doesNotMatch(b.elements.firebaseStatus.textContent,/Cloud save failed/);
});

test('localStorage failure is never masked by success from another notebook or server acknowledgement',async()=>{
 const b=browser(),f=await firebase(b);await f.auth();f.store.set(path('a'),item('a'));
 b.fault.set=k=>k===KEYS.coding;f.emit('coding');f.emit('sql');
 assert.match(b.elements.firebaseStatus.textContent,/Device save failed/);
 assert.deepEqual(b.rows('coding'),[]);
});

test('newer edit queued during awaited transaction survives earlier completion',async()=>{
 const b=browser(),f=await firebase(b);await f.auth();f.local('coding',[item('a','first')]);
 const gate=deferred();f.controls.beforeGet=()=>gate.promise;const running=b.runTimers(180);await flush();
 f.local('coding',[item('a','later','2026-02-01')]);gate.resolve();await running;
 assert.equal(f.cloud.pendingCount,1);assert.equal(b.rows('coding')[0].notes,'later');
 f.controls.beforeGet=null;await b.runTimers(180);assert.equal(f.cloud.pendingCount,0);assert.equal(f.store.get(path('a')).notes,'later');
});

test('account change inside transaction aborts later writes and old callbacks cannot affect new account',async()=>{
 const b=browser(),f=await firebase(b);await f.auth();const oldListener=f.listeners[0],a=item('a');f.store.set(path('a'),a);
 const gate=deferred();f.controls.beforeGet=()=>gate.promise;
 const restoring=f.cloud.restoreAll({coding:[item('a','import'),item('b')]},{expected:{coding:[a]},sessionToken:f.cloud.sessionToken});
 await flush();await f.auth('account-B');const status=b.elements.firebaseStatus.textContent;
 gate.resolve();await assert.rejects(restoring,/Account changed/);f.emitOld(oldListener);
 assert.equal(f.writes.length,0);assert.equal(b.elements.firebaseStatus.textContent,status);
 assert.match(status,/Automatic sync paused/);assert.deepEqual(b.rows('coding'),[]);
});

test('account switch after first committed restore never writes remaining imports to the new account',async()=>{
 const b=browser(),f=await firebase(b);await f.auth();let switched=false;
 f.controls.beforeCommit=async()=>{if(!switched){switched=true;await f.auth('account-B')}};
 await assert.rejects(f.cloud.restoreAll({coding:[item('a'),item('b')]},{expected:empty(),sessionToken:f.cloud.sessionToken}),/Account changed/);
 assert.deepEqual(f.writes.map(x=>x.key),[path('a')]);assert.ok(!f.store.has('users/account-B/coding/a'));assert.ok(!f.store.has('users/account-B/coding/b'));
});

test('server read and history export abort across auth change, with all paths pinned to original uid',async()=>{
 const b=browser(),f=await firebase(b);await f.auth();const gate=deferred(),paths=[];
 f.controls.read=async path=>{paths.push(path);await gate.promise};const reading=f.cloud.readAll({serverOnly:true});
 await flush();await f.auth('account-B');gate.resolve();await assert.rejects(reading,/Account changed/);
 assert.ok(paths.every(p=>p.startsWith('users/account-A/')));assert.equal(b.downloads.length,0);
});

test('server-only export includes remote prior versions rather than pending local versions',async()=>{
 const b=browser(),f=await firebase(b);await f.auth();const remote=item('a','server');f.store.set(path('a'),remote);f.local('coding',[item('a','pending','2026-02-01')]);
 assert.deepEqual((await f.cloud.readAll({serverOnly:true})).coding,[remote]);assert.equal((await f.cloud.readAll()).coding[0].notes,'pending');
});

test('unreadable persisted records are never replaced by a cloud event',async()=>{
 const device=item('a','on disk'),b=browser({coding:[device]}),f=await firebase(b);await f.auth();
 f.store.set(path('a'),item('a','cloud','2026-02-01'));b.values.set(KEYS.coding,'malformed private record');
 // Simulate an app whose initial JSON load fell back to an empty in-memory list.
 b.window.RecallLocal=()=>[];f.emit('coding');
 assert.equal(b.values.get(KEYS.coding),'malformed private record');assert.match(b.elements.firebaseStatus.textContent,/Device save failed/);
});

test('disk changes missing from the in-memory accessor are retained or durably archived before dispatch',async()=>{
 for(const stamp of ['2025-01-01','2027-01-01']){
  const disk=item('a','edit from another tab',stamp),b=browser({coding:[disk]}),f=await firebase(b);await f.auth();
  b.window.RecallLocal=()=>[];const cloud=item('a','server','2026-01-01');f.store.set(path('a'),cloud);
  b.fault.set=k=>k===KEYS.conflicts;f.emit('coding');assert.deepEqual(b.rows('coding'),[disk]);
 }
});

test('auth generation invalidates same-uid sign-out/sign-in continuations',async()=>{
 const b=browser(),f=await firebase(b);await f.auth();const gate=deferred();f.controls.read=()=>gate.promise;
 const read=f.cloud.readAll();await flush();await f.auth(null);await f.auth('account-A');gate.resolve();await assert.rejects(read,/Account changed/);
});

test('device owner survives script reload and prevents automatic cross-account migration',async()=>{
 const b=browser({coding:[item('a','account A device notes')]}),first=await firebase(b);await first.auth();
 const reloaded=browser();reloaded.values.clear();for(const [key,value] of b.values)reloaded.values.set(key,value);
 const second=await firebase(reloaded);await second.auth('account-B');second.local('coding',[item('a','attempted edit','2026-02-01')]);await reloaded.runTimers(180);
 assert.equal(second.writes.length,0);assert.match(reloaded.elements.firebaseStatus.textContent,/Automatic sync paused/);
});

test('transaction callbacks can replay without duplicate history or bypassing exact restore guards',async()=>{
 const a=item('a'),b=browser(),f=await firebase(b);await f.auth();f.store.set(path('a'),a);f.controls.replay=true;
 await f.cloud.restoreAll({coding:[item('a','import')]},{expected:{coding:[a]},sessionToken:f.cloud.sessionToken});
 const h=[...f.store.values()].find(x=>x.recordType==='syncBackup');assert.equal(h.versions.length,1);assert.deepEqual(h.versions[0].value,a);
});

test('history export and exact restore recovery read include all four cloud collections once',async()=>{
 const b=browser(),f=await firebase(b);await f.auth();
 for(const kind of ['coding','sql','goals','habits'])f.store.set('users/account-A/'+kind+'/history',{recordType:'syncBackup',originKind:kind,versions:[{value:item('saved-'+kind)}]});
 const data=await f.cloud.readAll({serverOnly:true,includeHistory:true});assert.equal(data.history.length,4);
 const blobs=[];b.execute('URL.createObjectURL=blob=>{blobs.push(blob);return "blob:synthetic"}',{blobs});
 await f.cloud.downloadCloudHistory();assert.equal(JSON.parse(await blobs[0].text()).versions.length,4);
 assert.match(b.elements.firebaseStatus.textContent,/download requested/);
});

test('history export discards results from an account that changed while reading',async()=>{
 const b=browser(),f=await firebase(b);await f.auth();const gate=deferred();f.controls.read=()=>gate.promise;
 const downloading=f.cloud.downloadCloudHistory();await flush();await f.auth('account-B');gate.resolve();await downloading;
 assert.equal(b.downloads.length,0);
});

test('existing conflict copies survive reload and stay visible in sync status',async()=>{
 const b=browser({conflicts:[{id:'retained',kind:'coding',recordId:'a',device:item('a','device'),cloud:item('a','cloud')}]}),f=await firebase(b);await f.auth();
 f.emit('coding');f.emit('sql');assert.match(b.elements.firebaseStatus.textContent,/Conflicts/);assert.equal(b.rows('conflicts').length,1);
});

test('account marker storage failures report storage failure and never unlock sync on repeated auth callback',async()=>{
 const b=browser({coding:[item('a')]}),f=await firebase(b);b.fault.silent=k=>k==='recall-device-owner-v1';await f.auth();
 assert.match(b.elements.firebaseStatus.textContent,/Device account storage failed/);await f.auth();f.local('coding',[item('a','edit')]);await b.runTimers(180);
 assert.equal(f.writes.length,0);assert.match(b.elements.firebaseStatus.textContent,/Automatic sync paused/);
});

test('optimistic guard compares nested fields literally while normalizing only the top-level type marker',async()=>{
 const a={...item('a'),metadata:{recordType:'preview'}},b=browser(),f=await firebase(b);await f.auth();
 const current={...a,metadata:{recordType:'changed'}};f.store.set(path('a'),current);const results=[];
 await f.cloud.restoreAll({coding:[item('a','import')]},{expected:{coding:[a]},sessionToken:f.cloud.sessionToken,results});
 assert.equal(results[0].result,'remote-newer');assert.deepEqual(f.store.get(path('a')),current);
});

async function actualConcepts(b){
 b.document.querySelectorAll=()=>[];
 b.execute(source('concept-revision.js'));
 const f=await firebase(b);
 // Keep the actual app's strictly-newer merge listener, not the mock's unconditional writer.
 b.window.listeners['recall-cloud-data'].pop();
 b.window.RecallLocal=kind=>kind==='concepts'?b.window.RecallConcepts():b.rows(kind);
 return f;
}

test('actual concept listener retains tied device output and reports a conflict, not a failed save',async()=>{
 const device={...item('ds:arrays','device'),recordType:'conceptReview'},remote={...item('ds:arrays','server'),recordType:'conceptReview'};
 const b=browser({concepts:[device]}),f=await actualConcepts(b);await f.auth();
 f.store.set(path('concept-ds:arrays'),remote);f.emit('coding');f.emit('sql');
 assert.deepEqual(b.rows('concepts'),[device]);assert.deepEqual(b.window.RecallConcepts(),[device]);
 const delivered=b.events.filter(e=>e.type==='recall-cloud-data'&&e.detail.kind==='concepts').at(-1);
 assert.deepEqual(delivered.detail.items,[device]);
 const copies=b.rows('conflicts');assert.equal(copies.length,1);
 assert.deepEqual(copies[0].device,item('ds:arrays','device'));assert.deepEqual(copies[0].cloud,item('ds:arrays','server'));
 assert.match(b.elements.firebaseStatus.textContent,/Conflicts/);assert.doesNotMatch(b.elements.firebaseStatus.textContent,/Device save failed/);
 assert.equal(f.cloud.pendingCount,0);assert.equal(f.writes.length,0);
});

test('actual concept listener write failure remains a device failure after a retained tie',async()=>{
 const device={...item('ds:arrays','device'),recordType:'conceptReview'},b=browser({concepts:[device]}),f=await actualConcepts(b);await f.auth();
 f.store.set(path('concept-ds:arrays'),{...device,notes:'tied server'});f.emit('coding');
 b.fault.set=k=>k===KEYS.concepts;
 f.store.set(path('concept-ds:arrays'),{...device,notes:'newer server',updatedAt:'2026-02-01'});f.emit('coding');f.emit('sql');
 assert.deepEqual(b.rows('concepts'),[device]);assert.match(b.elements.firebaseStatus.textContent,/Device save failed/);
 assert.equal(b.rows('conflicts').length,2);
});

test('terminal notebook error survives unrelated snapshots and successful writes until a fresh session',async()=>{
 const b=browser(),f=await firebase(b);await f.auth();f.emit('coding');f.emit('sql');
 const failed=f.listeners.find(l=>l.path.endsWith('/sql'));failed.error(new Error('synthetic permission-denied'));
 const statuses=()=>b.events.filter(e=>e.type==='recall-cloud-status').map(e=>e.detail.message);
 const start=statuses().length-1;
 f.emit('coding');f.local('coding',[item('a','saved with SQL listener unavailable')]);await b.runTimers(180);
 assert.equal(f.cloud.pendingCount,0);assert.equal(f.store.get(path('a')).notes,'saved with SQL listener unavailable');
 for(const message of statuses().slice(start)){assert.match(message,/Cloud sync failed/);assert.match(message,/sql.*permission-denied/);assert.doesNotMatch(message,/Cloud confirmed/)}
 // A terminal listener cannot revive itself through a stale callback.
 f.emit('sql');assert.match(b.elements.firebaseStatus.textContent,/Cloud sync failed/);
 await f.auth(null);const signedOut=b.elements.firebaseStatus.textContent;failed.error(new Error('stale callback'));
 assert.equal(b.elements.firebaseStatus.textContent,signedOut);
 await f.auth();f.emit('coding');f.emit('sql');
 assert.match(b.elements.firebaseStatus.textContent,/Cloud confirmed/);assert.doesNotMatch(b.elements.firebaseStatus.textContent,/Cloud sync failed/);
});

test('subscription failures remain per-kind and stale auth errors cannot poison a fresh session',async()=>{
 const b=browser(),f=await firebase(b);await f.auth();f.emit('coding');f.emit('sql');
 const sql=f.listeners.find(l=>l.path.endsWith('/sql')),concepts=f.listeners.at(-1);
 sql.error(new Error('SQL denied'));concepts.error(new Error('concepts denied'));f.emit('coding');
 assert.match(b.elements.firebaseStatus.textContent,/sql.*SQL denied/);assert.match(b.elements.firebaseStatus.textContent,/concepts.*concepts denied/);
 await f.auth();sql.error(new Error('old SQL denied'));concepts.error(new Error('old concepts denied'));f.emit('coding');f.emit('sql');
 assert.match(b.elements.firebaseStatus.textContent,/Cloud confirmed/);assert.doesNotMatch(b.elements.firebaseStatus.textContent,/denied/);
});
