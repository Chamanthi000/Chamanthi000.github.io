import test from 'node:test';
import assert from 'node:assert/strict';
import {browser,indexedDb,source,item,KEYS} from './data-safety-mocks.mjs';
const boot=b=>{const idb=indexedDb(b);b.execute(source('auto-backup.js'),{indexedDB:idb.indexedDB});return idb};

test('automatic snapshots commit and read back exact originals; duplicate records do not create extra versions',async()=>{
 const b=browser({coding:[item('a')]}),idb=boot(b);await b.runTimers(1800);
 assert.equal(idb.rows.size,1);const row=[...idb.rows.values()][0];assert.deepEqual(row.payload.coding,[item('a')]);
 assert.equal(row.payload.originals.localStorage[KEYS.coding],b.values.get(KEYS.coding));
 b.window.dispatchEvent({type:'focus'});await b.runTimers(1800);assert.equal(idb.rows.size,1);
 b.save('coding',[item('a','edit')]);b.window.dispatchEvent({type:'recall-cloud-local'});await b.runTimers(1800);assert.equal(idb.rows.size,2);
 assert.match(b.elements.autoBackupStatus.textContent,/Auto backup updated/);
});

for(const mode of ['read','malformed','shape','abort','silent'])test('automatic snapshot '+mode+' failure never claims backup success or prunes recovery history',async()=>{
 const b=browser({coding:[item('a')]}),idb=boot(b);await b.runTimers(1800);assert.equal(idb.rows.size,1);
 b.save('coding',[item('a','changed')]);
 if(mode==='read')b.fault.get=k=>k===KEYS.coding;
 if(mode==='malformed')b.values.set(KEYS.coding,'invalid');
 if(mode==='shape')b.values.set(KEYS.coding,'{}');
 if(mode==='abort')idb.control.abort=true;
 if(mode==='silent')idb.control.dropAdd=true;
 b.window.dispatchEvent({type:'focus'});await b.runTimers(1800);
 assert.equal(idb.rows.size,1);assert.equal([...idb.rows.values()][0].payload.coding[0].notes,'original');
 assert.match(b.elements.autoBackupStatus.textContent,/unavailable/);assert.doesNotMatch(b.elements.autoBackupStatus.textContent,/normal app saves still work/);
});

test('automatic snapshots retain the bounded latest 20 committed versions and download remains a request',async()=>{
 const b=browser(),idb=boot(b);
 for(let i=0;i<23;i++){b.save('coding',[item('a','version '+i)]);b.window.dispatchEvent({type:'focus'});await b.runTimers(1800)}
 assert.equal(idb.rows.size,20);assert.equal([...idb.rows.values()][0].payload.coding[0].notes,'version 3');
 b.elements.autoBackupVersions.value=String([...idb.rows.keys()].at(-1));await b.elements.autoBackupDownload.onclick();
 assert.equal(b.downloads.length,1);assert.match(b.elements.autoBackupStatus.textContent,/cannot verify a download/);
});
