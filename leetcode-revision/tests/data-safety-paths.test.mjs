import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {browser,firebase,item,empty,deferred,flush,source} from './data-safety-mocks.mjs';

const owner=(kind='coding')=>'users/account-A/'+(['structures','concepts'].includes(kind)?'coding':kind);
const path=(id,kind='coding')=>owner(kind)+'/'+id;
const mapped=(id,kind='coding')=>'recall-key-v1-'+kind+'-'+createHash('sha256').update(JSON.stringify([kind,id])).digest('hex');
const history=(id,kind='coding')=>'recall-history-'+kind+'-'+encodeURIComponent(id).slice(0,900);
const priorHistory=(id,kind='coding')=>({recordType:'syncBackup',originKind:kind,originId:id,custom:'keep existing history',versions:[{archivedAt:'2024-01-01',value:item(id,'original archive')}]});
const notes='  <tag> & "quotes"\n\n    keep indentation and trailing spaces  \nUnicode é é 😀';
const record=(id,stamp='2026-02-01')=>({...item(id,notes,stamp),number:42,customMetadata:{id:'nested/original',recordType:'custom',values:['a/b','a%2Fb','\ud800'],flag:false},legacyOriginal:'  untouched  '});
const copies=[{id:'original-conflict',kind:'coding',recordId:'a/b',device:record('a/b'),cloud:item('a/b','original conflict')}];
const writeFailure=(stage)=>[{kind:'coding',code:'unknown',stage}];
const unchanged=(f,b,before,local)=>{
 assert.deepEqual([...f.store],before);assert.equal(f.writes.length,0);
 assert.deepEqual(b.rows('coding'),[local]);assert.deepEqual(b.rows('conflicts'),copies);
 assert.equal(f.cloud.pendingCount,1);
};

test('strict mock reproduces the original raw coding a/b document-reference diagnostic',async()=>{
 const b=browser(),execute=b.execute;let sdk;
 b.execute=(code,extra={})=>{sdk=extra.sdk||sdk;return execute(code,extra)};
 await firebase(b);
 const code=source('firebase-sync.js'),start=code.indexOf('const HISTORY_PREFIX='),stop=code.indexOf('const historyButton=',start);
 const {safeWriteError}=b.execute(code.slice(start,stop)+'return {safeWriteError};');
 assert.throws(()=>sdk.doc(owner(),'a/b'),error=>{
  assert.deepEqual({...safeWriteError(error,'document-reference')},{code:'invalid-argument',stage:'document-reference',reason:'invalid-document-path'});return true;
 });
 for(const id of ['', '.', '..', '__reserved__', 'a/b/c', 'x'.repeat(1501), '\ud800'])assert.throws(()=>sdk.doc(owner(),id),{code:'invalid-argument'});
 assert.equal(sdk.doc(owner(),'42'),path('42'));
});

test('new slash ID uses the exact versioned SHA-256 segment and keeps all device fields and conflicts',async()=>{
 const b=browser({conflicts:copies}),f=await firebase(b);await f.auth();const value=record('a/b'),reads=[];
 f.controls.read=collection=>reads.push(collection);
 f.local('coding',[value]);await b.runTimers(180);
 assert.deepEqual(reads,[owner()]);assert.deepEqual(f.writes,[{key:path(mapped(value.id)),value}]);
 assert.equal(f.writes[0].key.split('/').length,4);assert.equal(f.cloud.pendingCount,0);assert.deepEqual(f.cloud.writeErrors,[]);
 assert.deepEqual(b.rows('coding'),[value]);assert.deepEqual(b.rows('conflicts'),copies);
 assert.deepEqual((await f.cloud.readAll({serverOnly:true})).coding,[value]);
});

for(const kind of ['coding','sql','goals','habits','structures','concepts'])test(kind+' reuses the unique existing physical document and legacy history key',async()=>{
 const b=browser({conflicts:copies}),f=await firebase(b);await f.auth();const id='legacy/a/b',physical='original-physical-id';
 const marker=kind==='structures'?{recordType:'structure'}:kind==='concepts'?{recordType:'conceptReview'}:{};
 const old={...record(id,'2026-01-01'),...marker},next={...record(id),...marker};
 const h=priorHistory(id,kind);f.store.set(path(physical,kind),old);f.store.set(path(history(id,kind),kind),h);
 // Same logical ID in another typed record must not make this match ambiguous.
 const unrelated=kind==='structures'?{...old,recordType:'conceptReview'}:{...old,recordType:'structure'};
 if(['coding','structures','concepts'].includes(kind))f.store.set(path('other-kind',kind),unrelated);
 const reads=[];f.controls.read=collection=>reads.push(collection);
 f.local(kind,[next]);await b.runTimers(180);
 assert.deepEqual(reads,[owner(kind)]);assert.deepEqual(f.store.get(path(physical,kind)),next);
 assert.equal(f.store.has(path(mapped(id,kind),kind)),false);
 assert.deepEqual(f.writes.map(x=>x.key),[path(history(id,kind),kind),path(physical,kind)]);
 assert.deepEqual(f.store.get(path(history(id,kind),kind)).versions.map(v=>v.value),[h.versions[0].value,record(id,'2026-01-01')]);
 assert.equal(f.store.get(path(history(id,kind),kind)).custom,h.custom);
 if(['coding','structures','concepts'].includes(kind))assert.deepEqual(f.store.get(path('other-kind',kind)),unrelated);
 assert.deepEqual(b.rows(kind),[next]);assert.deepEqual(b.rows('conflicts'),copies);
});

test('mapped edits preserve conflict originals and remote-newer guards exactly',async()=>{
 const b=browser({conflicts:copies}),f=await firebase(b);await f.auth();const local=record('a/b'),remote={...record('a/b','2026-03-01'),notes:'  newer cloud\n  '};
 f.store.set(path('legacy-physical'),remote);f.local('coding',[local]);await b.runTimers(180);
 assert.equal(f.writes.length,0);assert.equal(f.cloud.pendingCount,0);
 assert.deepEqual(b.rows('conflicts').slice(0,1),copies);
 assert.deepEqual(b.rows('conflicts')[1].device,local);assert.deepEqual(b.rows('conflicts')[1].cloud,remote);
 assert.deepEqual(f.store.get(path('legacy-physical')),remote);
});

for(const occupant of [record('different-logical-id'),{...record('a/b'),recordType:'structure'},{...record('a/b'),recordType:'syncBackup'}])test('fallback target collision stops before conflict or history handling: '+(occupant.recordType||'id'),async()=>{
 const b=browser({conflicts:copies}),f=await firebase(b);await f.auth();const local=record('a/b');
 f.store.set(path(mapped(local.id)),occupant);const before=structuredClone([...f.store]);
 f.local('coding',[local]);await b.runTimers(180);
 unchanged(f,b,before,local);assert.deepEqual(f.cloud.writeErrors,writeFailure('target-read'));
 const results=[];
 await assert.rejects(f.cloud.restoreAll({coding:[local]},{expected:empty(),sessionToken:f.cloud.sessionToken,results}),/^Error: Cloud document identity mismatch; save stopped\.$/);
 assert.deepEqual(results,[]);unchanged(f,b,before,local);
});

test('ordinary valid path collision also stops rather than treating another kind as a conflict',async()=>{
 const b=browser({conflicts:copies}),f=await firebase(b);await f.auth();const local=record('42');
 f.store.set(path('42'),{...local,recordType:'structure'});const before=structuredClone([...f.store]);
 f.controls.read=()=>{throw Error('ordinary paths must not scan')};f.local('coding',[local]);await b.runTimers(180);
 unchanged(f,b,before,local);assert.deepEqual(f.cloud.writeErrors,writeFailure('target-read'));
});

for(const change of [{originKind:'sql'},{originId:'unrelated'},{recordType:'structure'},{originKind:undefined,originId:undefined}])test('existing history origin must match before any target/history write: '+JSON.stringify(change),async()=>{
 const b=browser({conflicts:copies}),f=await firebase(b);await f.auth();const local=record('a/b'),old=record(local.id,'2026-01-01');
 f.store.set(path(mapped(local.id)),old);f.store.set(path(history(local.id)),{...priorHistory(local.id),...change});
 const before=structuredClone([...f.store]);f.local('coding',[local]);await b.runTimers(180);
 unchanged(f,b,before,local);assert.deepEqual(f.cloud.writeErrors,writeFailure('history-read'));
 await assert.rejects(f.cloud.restoreAll({coding:[local]},{expected:{coding:[old]},sessionToken:f.cloud.sessionToken}),/^Error: Cloud history identity mismatch; save stopped\.$/);
 unchanged(f,b,before,local);
});

test('legacy truncated history collisions stop without changing either history or target',async()=>{
 const id='a/'.repeat(500),other=id+'different',b=browser({conflicts:copies}),f=await firebase(b);await f.auth();const local=record(id);
 assert.equal(history(id),history(other));f.store.set(path(mapped(id)),record(id,'2026-01-01'));f.store.set(path(history(id)),priorHistory(other));
 const before=structuredClone([...f.store]);f.local('coding',[local]);await b.runTimers(180);
 unchanged(f,b,before,local);assert.deepEqual(f.cloud.writeErrors,writeFailure('history-read'));
});

test('ambiguous same-kind logical matches reject without selecting a physical document',async()=>{
 const b=browser({conflicts:copies}),f=await firebase(b);await f.auth();const local=record('a/b');
 f.store.set(path('first'),record(local.id,'2026-01-01'));f.store.set(path('second'),record(local.id,'2025-01-01'));
 const before=structuredClone([...f.store]);f.local('coding',[local]);await b.runTimers(180);
 unchanged(f,b,before,local);assert.deepEqual(f.cloud.writeErrors,writeFailure('document-reference'));
 await assert.rejects(f.cloud.restoreAll({coding:[local]},{expected:empty(),sessionToken:f.cloud.sessionToken}),/^Error: Multiple cloud documents match this record; save stopped\.$/);
 unchanged(f,b,before,local);
});

test('identity changed after scan is rechecked transactionally before unchanged or conflict decisions',async()=>{
 const b=browser({conflicts:copies}),f=await firebase(b);await f.auth();const local=record('a/b'),intruder=record('unrelated','2027-01-01');
 f.store.set(path('original'),record(local.id,'2026-01-01'));
 f.controls.beforeGet=key=>{if(key===path('original'))f.store.set(key,intruder)};
 f.local('coding',[local]);await b.runTimers(180);
 unchanged(f,b,[[path('original'),intruder]],local);assert.deepEqual(f.cloud.writeErrors,writeFailure('target-read'));
});

for(const metadata of [{fromCache:true,hasPendingWrites:false},{fromCache:false,hasPendingWrites:true},{}])test('unacknowledged server scan cannot authorize a fallback: '+JSON.stringify(metadata),async()=>{
 const b=browser({conflicts:copies}),f=await firebase(b);await f.auth();const local=record('a/b');f.controls.readMetadata=metadata;
 f.local('coding',[local]);await b.runTimers(180);unchanged(f,b,[],local);
 await assert.rejects(f.cloud.restoreAll({coding:[local]},{expected:empty(),sessionToken:f.cloud.sessionToken}),/^Error: Server record lookup was not acknowledged; save stopped\.$/);
 f.controls.readMetadata=undefined;await b.runTimers(2000);
 assert.deepEqual(f.store.get(path(mapped(local.id))),local);assert.equal(f.cloud.pendingCount,0);
});

test('failed server scan retains safe diagnostics and retries without guessing absence',async()=>{
 const b=browser({conflicts:copies}),f=await firebase(b);await f.auth();const local=record('a/b');
 f.controls.read=()=>{throw Object.assign(Error('private note and account details'),{code:'permission-denied'})};
 f.local('coding',[local]);await b.runTimers(180);unchanged(f,b,[],local);
 assert.deepEqual(f.cloud.writeErrors,[{kind:'coding',code:'permission-denied',stage:'document-reference'}]);
 assert.doesNotMatch(b.elements.firebaseStatus.textContent,/private note/);
 f.controls.read=null;f.store.set(path('existing-after-retry'),record(local.id,'2026-01-01'));await b.runTimers(2000);
 assert.deepEqual(f.store.get(path('existing-after-retry')),local);assert.equal(f.store.has(path(mapped(local.id))),false);
});

test('unsafe empty, dot, reserved, overlong and unpaired-surrogate IDs get valid deterministic segments',async()=>{
 for(const id of ['', '.', '..', '__reserved__', 'x'.repeat(1501), 'é'.repeat(751), '\ud800', '\ud801', '\udc00']){
  const b=browser(),f=await firebase(b);await f.auth();const local=item(id);
  f.local('coding',[local]);
  if(!id)f.emit('coding'); // Existing initial snapshot reconciliation can queue a legacy empty identity.
  await b.runTimers(180);
  assert.deepEqual(f.cloud.writeErrors,[],JSON.stringify(id));assert.deepEqual(f.store.get(path(mapped(id))),local);
  assert.equal(f.writes.length,1);assert.equal(f.writes[0].key.split('/').length,4);
 }
});

test('slash, percent, Unicode forms and lone surrogates never alias logical or physical identities',async()=>{
 const ids=['a/b','a%2Fb','a%252Fb','a/b/','a//b','a/é','a/e\u0301','a/\ud800','a/\ud801','a/\udc00','a/\ufffd','a/😀'];
 const b=browser(),f=await firebase(b);await f.auth();const rows=ids.map(id=>record(id));f.local('coding',rows);await b.runTimers(180);
 const paths=ids.map(id=>path(id.includes('/')?mapped(id):id));assert.equal(new Set(paths).size,ids.length);
 assert.equal(f.store.size,ids.length);paths.forEach((key,i)=>assert.deepEqual(f.store.get(key),rows[i]));
 assert.deepEqual(b.rows('coding'),rows);assert.equal(f.cloud.pendingCount,0);
 // Lone-surrogate history must hash JSON too; URI encoding cannot represent it.
 const lone=ids.find(id=>id.endsWith('\ud800')),edited={...record(lone,'2026-03-01'),notes:'newer'};
 f.local('coding',[edited]);await b.runTimers(180);
 const backup=f.store.get(path('recall-history-'+mapped(lone)));
 assert.equal(backup.originId,lone);assert.deepEqual(backup.versions[0].value,record(lone));
});

for(const operation of ['read','hash'])for(const change of ['other-account','same-account-new-epoch'])test('account change while awaiting '+operation+' stops all writes: '+change,async()=>{
 const b=browser({conflicts:copies}),f=await firebase(b);await f.auth();const local=record('a/b'),gate=deferred(),entered=deferred();
 f.controls[operation]=()=>{entered.resolve();return gate.promise};
 f.local('coding',[local]);const running=b.runTimers(180);await entered.promise;
 if(change==='other-account')await f.auth('account-B');else{await f.auth(null);await f.auth()}
 const status=b.elements.firebaseStatus.textContent;gate.resolve();await running;
 assert.equal(f.writes.length,0);assert.equal(f.store.size,0);assert.equal(f.cloud.pendingCount,0);
 assert.deepEqual(b.rows('coding'),[local]);assert.deepEqual(b.rows('conflicts'),copies);
 assert.equal(b.elements.firebaseStatus.textContent,status);assert.deepEqual(f.cloud.writeErrors,[]);
});

for(const operation of ['read','hash'])test('restore awaiting '+operation+' rejects account switch and never writes another account',async()=>{
 const b=browser(),f=await firebase(b);await f.auth();const gate=deferred(),entered=deferred();
 f.controls[operation]=()=>{entered.resolve();return gate.promise};
 const restoring=f.cloud.restoreAll({coding:[record('a/b')]},{expected:empty(),sessionToken:f.cloud.sessionToken});
 await entered.promise;await f.auth('account-B');gate.resolve();await assert.rejects(restoring,/Account changed; operation stopped/);
 assert.equal(f.writes.length,0);assert.equal(f.store.size,0);
});

test('normal numeric and valid document locations and history IDs remain byte-for-byte unchanged',async()=>{
 for(const value of [item(42),{number:42,notes},item('a%2Fb'),item('é'),item('e\u0301'),item('😀'),item('x'.repeat(1500))]){
  const b=browser(),f=await firebase(b);await f.auth();const id=String(value.id||value.number),old={...value,updatedAt:'2026-01-01'},next={...value,updatedAt:'2026-02-01'};
  f.store.set(path(id),old);f.store.set(path(history(id)),priorHistory(id));
  f.controls.read=()=>{throw Error('valid ID must not scan')};f.controls.hash=()=>{throw Error('valid ID must not hash')};
  f.local('coding',[next]);await b.runTimers(180);
  assert.deepEqual(f.cloud.writeErrors,[]);assert.deepEqual(f.writes.map(w=>w.key),[path(history(id)),path(id)]);
  assert.deepEqual(f.store.get(path(id)),next);assert.deepEqual(f.store.get(path(history(id))).versions.at(-1).value,old);
 }
});

for(const physical of ['existing-physical',mapped('a/b')])test('fresh second device and reload read/edit the same mapped record: '+physical,async()=>{
 const original=record('a/b','2026-01-01');let store=[[path(physical),original]],values;
 for(let visit=0;visit<2;visit++){
  const b=browser();if(values){b.values.clear();for(const [k,v] of values)b.values.set(k,v)}
  const f=await firebase(b);for(const [key,value] of store)f.store.set(key,structuredClone(value));await f.auth();
  assert.deepEqual((await f.cloud.readAll({serverOnly:true})).coding,[store.find(([key])=>key===path(physical))[1]]);
  f.emit('coding');const next=record('a/b','2026-0'+(visit+2)+'-01');f.local('coding',[next]);await b.runTimers(180);
  assert.deepEqual(f.store.get(path(physical)),next);assert.equal(f.cloud.pendingCount,0);
  assert.equal([...f.store.values()].filter(v=>v.recordType!=='syncBackup').length,1);assert.deepEqual(b.rows('coding'),[next]);
  store=structuredClone([...f.store]);values=[...b.values];
 }
});

test('mapped restore preserves the exact optimistic guard and forced history',async()=>{
 const b=browser({conflicts:copies}),f=await firebase(b);await f.auth();const old=record('a/b','2026-01-01'),next=record('a/b');
 f.store.set(path('original'),old);const results=[];
 await f.cloud.restoreAll({coding:[next]},{expected:{coding:[old]},sessionToken:f.cloud.sessionToken,results});
 assert.equal(results[0].result,'saved');assert.deepEqual(f.store.get(path('original')),next);
 assert.deepEqual(f.store.get(path(history(next.id))).versions[0].value,old);assert.deepEqual(b.rows('conflicts'),copies);
 const staleResults=[];await f.cloud.restoreAll({coding:[record('a/b','2026-04-01')]},{expected:{coding:[old]},sessionToken:f.cloud.sessionToken,results:staleResults});
 assert.equal(staleResults[0].result,'remote-newer');assert.deepEqual(f.store.get(path('original')),next);
});

test('newer queued unsafe-ID edit survives completion of the older scan',async()=>{
 const b=browser(),f=await firebase(b);await f.auth();const gate=deferred();f.controls.read=()=>gate.promise;
 f.local('coding',[record('a/b')]);const running=b.runTimers(180);await flush();
 const next=record('a/b','2026-03-01');f.local('coding',[next]);gate.resolve();await running;
 assert.equal(f.cloud.pendingCount,1);assert.deepEqual(b.rows('coding'),[next]);f.controls.read=null;await b.runTimers(180);
 assert.equal(f.cloud.pendingCount,0);assert.deepEqual(f.store.get(path(mapped(next.id))),next);
});


test('ambiguous unsafe originals cannot be collapsed by readAll or replace device data in listeners',async()=>{
 const local=record('a/b'),first=record('a/b','2026-01-01'),second={...record('a/b','2026-03-01'),notes:'other server original'};
 const b=browser({coding:[local],conflicts:copies}),f=await firebase(b);await f.auth();
 f.store.set(path('first'),first);f.store.set(path('second'),second);
 const before=structuredClone([...f.store]);
 assert.doesNotThrow(()=>f.emit('coding'));
 assert.deepEqual(b.rows('coding'),[local]);assert.deepEqual(b.rows('conflicts'),copies);
 assert.deepEqual([...f.store],before);assert.equal(f.writes.length,0);
 assert.match(b.elements.firebaseStatus.textContent,/Multiple cloud documents match a legacy record/);
 await assert.rejects(f.cloud.readAll({serverOnly:true}),/Multiple cloud documents match a legacy record/);
 await assert.rejects(f.cloud.readAll(),/Multiple cloud documents match a legacy record/);
 assert.deepEqual([...f.store],before);assert.equal(f.writes.length,0);
});
