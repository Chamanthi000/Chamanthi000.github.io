import test from 'node:test';
import assert from 'node:assert/strict';
import {browser,manual,archive,item,KEYS,empty,firebase,deferred} from './data-safety-mocks.mjs';
const safety=b=>[...b.values].filter(([k])=>k.startsWith('recall-before-restore-'));

test('fresh exact durable originals precede all restore writes; unrelated/unique records retain timestamps and fields',async()=>{
 const original=item('a'),unrelated=item('keep','untouched','2025-01-01'),b=browser({coding:[original,unrelated],structures:[item('strings')]});
 const m=manual(b);await m.preview(archive({coding:[item('a','import'),item('new','new import')]}));
 assert.equal(safety(b).length,0);assert.deepEqual(b.rows('coding'),[original,unrelated]);
 // A different tab adds an unrelated record after preview.
 const extra=item('after-preview','new device record');b.save('coding',[original,unrelated,extra]);
 const exact=Object.fromEntries(b.values);let verified=false;
 const get=b.storage.getItem.bind(b.storage);b.storage.getItem=k=>{const v=get(k);if(k.startsWith('recall-before-restore-')&&v)verified=true;return v};
 const set=b.storage.setItem.bind(b.storage);b.storage.setItem=(k,v)=>{if(k===KEYS.coding)assert.ok(verified,'recovery readback before modification');set(k,v)};
 await m.confirm();
 assert.deepEqual(b.rows('coding').find(x=>x.id==='keep'),unrelated);
 assert.deepEqual(b.rows('coding').find(x=>x.id==='after-preview'),extra);
 assert.equal(b.rows('coding').find(x=>x.id==='a').notes,'import');
 assert.equal(b.rows('coding').length,4);assert.equal(b.rows('structures')[0].id,'strings');
 assert.equal(JSON.parse(b.values.get(KEYS.goals)).extra,'preserved envelope');
 const saved=JSON.parse(safety(b)[0][1]);
 for(const key of Object.values(KEYS))assert.equal(saved.originals.localStorage[key],exact[key]);
 assert.equal(b.location.reloaded,1);assert.match(b.elements.backupStatus.textContent,/download requested/);
 assert.doesNotMatch(b.elements.backupStatus.textContent,/was downloaded/);
});

test('same-ID edits since preview are protected while new imports merge',async()=>{
 const b=browser({coding:[item('a')]}),m=manual(b);
 await m.preview(archive({coding:[item('a','import'),item('new')]}));
 const changed=item('a','edited during preview','2026-02-01');b.save('coding',[changed]);
 await m.confirm();assert.deepEqual(b.rows('coding').find(x=>x.id==='a'),changed);
 assert.equal(b.rows('coding').find(x=>x.id==='new').notes,'original');
 assert.match(b.elements.backupStatus.textContent,/1 changed\/conflicting records skipped/);
});

for(const mode of ['throw','silent','read-failure'])test('failed durable recovery '+mode+' aborts before local or cloud writes',async()=>{
 const b=browser({coding:[item('a')]}),f=await firebase(b);await f.auth();
 const m=manual(b);await m.preview(archive({coding:[item('a','import')]}));
 const baseline=b.values.get(KEYS.coding);
 if(mode==='throw')b.fault.set=k=>k.startsWith('recall-before-restore-');
 if(mode==='silent')b.fault.silent=k=>k.startsWith('recall-before-restore-');
 if(mode==='read-failure')b.fault.get=k=>k.startsWith('recall-before-restore-');
 await m.confirm();assert.equal(f.writes.length,0);assert.equal(b.values.get(KEYS.coding),baseline);assert.equal(b.location.reloaded,0);
 assert.match(b.elements.backupStatus.textContent,/Restore stopped/);
});

test('cloud restore writes only selected changed imports, forces history and skips post-preview server changes',async()=>{
 const a=item('a'),keep=item('keep'),b=browser({coding:[a,keep]}),f=await firebase(b);await f.auth();
 f.store.set('users/account-A/coding/a',a);f.store.set('users/account-A/coding/keep',keep);
 const m=manual(b);await m.preview(archive({coding:[item('a','import'),item('new')]}));
 const newer=item('a','server edit after preview','2026-03-01');f.store.set('users/account-A/coding/a',newer);
 await m.confirm();
 assert.deepEqual(f.store.get('users/account-A/coding/a'),newer);
 assert.deepEqual(f.store.get('users/account-A/coding/keep'),keep);
 assert.ok(f.store.has('users/account-A/coding/new'));
 assert.deepEqual(f.writes.map(x=>x.key),['users/account-A/coding/new']);
 const saved=JSON.parse(safety(b)[0][1]);assert.deepEqual(saved.originals.cloud.coding.find(x=>x.id==='a'),newer);
});

test('server race is guarded by exact prior value; rejected import is recoverable and device copy is preserved',async()=>{
 const a=item('a'),b=browser({coding:[a]}),f=await firebase(b);await f.auth();f.store.set('users/account-A/coding/a',a);
 const m=manual(b);await m.preview(archive({coding:[item('a','import')]}));
 const race=item('a','server race with same timestamp');
 f.controls.beforeGet=async key=>{if(key.endsWith('/a')){f.store.set(key,race);f.controls.beforeGet=null}};
 await m.confirm();
 assert.deepEqual(f.store.get('users/account-A/coding/a'),race);assert.deepEqual(b.rows('coding'),[a]);
 assert.equal(f.writes.length,0);
 const conflicts=b.rows('conflicts');assert.equal(conflicts.length,1);assert.equal(conflicts[0].device.notes,'import');assert.equal(conflicts[0].cloud.notes,race.notes);
});

test('device edits made during cloud transaction are not overwritten by local restore commit',async()=>{
 const a=item('a'),b=browser({coding:[a]}),f=await firebase(b);await f.auth();f.store.set('users/account-A/coding/a',a);
 const m=manual(b);await m.preview(archive({coding:[item('a','import')]}));
 const edited=item('a','edit while transaction running','2027-01-01');
 f.controls.beforeGet=async()=>{b.save('coding',[edited]);f.controls.beforeGet=null};
 await m.confirm();assert.deepEqual(b.rows('coding'),[edited]);
 assert.equal(f.store.get('users/account-A/coding/a').notes,'import');
 const h=[...f.store.values()].find(x=>x.recordType==='syncBackup');assert.deepEqual(h.versions.at(-1).value,a);
});

test('local partial failure rolls back own completed writes and retains exact recovery',async()=>{
 const a=item('a'),s=item('s'),b=browser({coding:[a],sql:[s]}),m=manual(b);
 await m.preview(archive({coding:[item('a','import')],sql:[item('s','import')]}));
 b.fault.set=k=>k===KEYS.sql;await m.confirm();
 assert.deepEqual(b.rows('coding'),[a]);assert.deepEqual(b.rows('sql'),[s]);assert.equal(safety(b).length,1);
 assert.match(b.elements.backupStatus.textContent,/rolled back/);assert.equal(b.location.reloaded,0);
});

test('incomplete rollback is reported explicitly and recovery is retained',async()=>{
 const b=browser({coding:[item('a')],sql:[item('s')]}),m=manual(b);
 await m.preview(archive({coding:[item('a','import')],sql:[item('s','import')]}));let sawSql=false;
 b.fault.set=k=>{if(k===KEYS.sql){sawSql=true;return true}return sawSql&&k===KEYS.coding};await m.confirm();
 assert.equal(safety(b).length,1);assert.match(b.elements.backupStatus.textContent,/rollback was incomplete/);
});

test('malformed/unreadable local data aborts backups and restores, never silently exports empty arrays',async()=>{
 for(const mode of ['json','shape','read']){
  const b=browser({coding:[item('a')]}),m=manual(b);
  if(mode==='json')b.values.set(KEYS.coding,'broken JSON');
  if(mode==='shape')b.values.set(KEYS.coding,'{}');
  if(mode==='read')b.fault.get=k=>k===KEYS.coding;
  await m.export();assert.equal(b.downloads.length,0);assert.match(b.elements.backupStatus.textContent,/Backup failed/);
  await m.preview(archive({coding:[item('a','import')]}));assert.match(b.elements.backupStatus.textContent,/Could not preview/);assert.equal(safety(b).length,0);
 }
});

test('export retains divergent device and server originals and makes no download-verification claim',async()=>{
 const b=browser({coding:[item('a','device')]}),f=await firebase(b);await f.auth();f.store.set('users/account-A/coding/a',item('a','server'));
 // Capture the actual Blob produced by the actual export function.
 const blobs=[];b.execute('URL.createObjectURL=blob=>{blobs.push(blob);return "blob:synthetic"}',{blobs});
 const m=manual(b);await m.export();const data=JSON.parse(await blobs[0].text());
 assert.equal(JSON.parse(data.originals.localStorage[KEYS.coding])[0].notes,'device');
 assert.equal(data.originals.cloud.coding[0].notes,'server');
 assert.match(b.elements.backupStatus.textContent,/cannot verify a download/);
});

test('duplicate imported identities fail preview rather than silently selecting one',async()=>{
 const b=browser(),m=manual(b);await m.preview(archive({coding:[item('a','one'),item('a','two')]}));
 assert.match(b.elements.backupStatus.textContent,/duplicate/);assert.equal(safety(b).length,0);
});

test('account switch after preview stops restore before any write',async()=>{
 const b=browser(),f=await firebase(b);await f.auth();const m=manual(b);await m.preview(archive({coding:[item('new')]}));
 await f.auth('account-B');await m.confirm();assert.equal(f.writes.length,0);assert.equal(safety(b).length,0);assert.match(b.elements.backupStatus.textContent,/Account changed/);
});

test('durable recovery is readable and downloadable after a failed restore without clearing records',async()=>{
 const b=browser({coding:[item('a')]}),m=manual(b);await m.preview(archive({coding:[item('a','import')]}));
 b.fault.set=k=>k===KEYS.coding;await m.confirm();b.fault.set=null;
 const keys=b.window.RecallBackupSafety.keys();assert.equal(keys.length,1);
 assert.equal(b.window.RecallBackupSafety.read(keys[0]).coding[0].notes,'original');
 const before=b.values.get(KEYS.coding);b.window.RecallBackupSafety.download(keys[0]);
 assert.equal(b.values.get(KEYS.coding),before);assert.equal(b.downloads.length,2);
 assert.throws(()=>b.window.RecallBackupSafety.read(KEYS.coding),/Invalid recovery/);
});

test('ambiguous pre-existing IDs abort restore without auto-consolidating unrelated duplicates',async()=>{
 const originals=[item('same','first'),item('same','second')],b=browser({coding:originals}),m=manual(b);
 await m.preview(archive({sql:[item('new')]}));await m.confirm();
 assert.deepEqual(b.rows('coding'),originals);assert.equal(safety(b).length,0);assert.match(b.elements.backupStatus.textContent,/Ambiguous/);
});

test('restore reports partial cloud completion and retains recovery after later transaction failure',async()=>{
 const b=browser(),f=await firebase(b);await f.auth();const m=manual(b);await m.preview(archive({coding:[item('a'),item('b')]}));
 f.controls.beforeGet=async key=>{if(key.endsWith('/b'))throw Error('synthetic later failure')};await m.confirm();
 assert.ok(f.store.has('users/account-A/coding/a'));assert.ok(!f.store.has('users/account-A/coding/b'));assert.deepEqual(b.rows('coding'),[]);
 assert.equal(safety(b).length,1);assert.match(b.elements.backupStatus.textContent,/Some server transactions may have completed/);
});
