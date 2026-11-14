/* Zero-dependency regression tests. Run: node --test leetcode-revision/tests/recall.test.mjs */
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

function runTests(read,test,assert){
const index=read('index.html'),goals=read('goals.html'),concept=read('concept-revision.js'),backup=read('backup-all.js'),firebase=read('firebase-sync.js'),auto=read('auto-backup.js'),css=read('revision-readability.css'),sqlGuide=read('sql-pattern-guide.html'),arrayGuide=read('array-interview-guide.js'),arrayStyles=read('array-interview-guide.css'),dsRevision=read('data-structure-revision.js');
const scripts=html=>[...html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g)].map(x=>x[1]).filter(Boolean);
const code=scripts(index).find(x=>x.includes('function renderHeat(data)'));
const goalCode=scripts(goals).find(x=>x.includes('function streak(h)'));
const ids=html=>new Set([...html.matchAll(/\bid="([^"]+)"/g)].map(x=>x[1]));
const dateKey=(d=new Date())=>[d.getFullYear(),String(d.getMonth()+1).padStart(2,'0'),String(d.getDate()).padStart(2,'0')].join('-');

test('Every DSA topic has a separate private Extra notes panel without a note migration',()=>{
 for(const token of ['ds-extra-notes','<h3>Extra notes</h3>','data-notes-read-id','EXTRA_OPEN_KEY','renderPersonalNotes(item)','guideView.innerHTML=renderTopic(item)'])assert.ok(dsRevision.includes(token),token);
 assert.ok(dsRevision.includes("el.closest('.ds-topic').querySelector('.ds-note-count')"));
 assert.ok(dsRevision.includes("if(item.id==='strings')return preservedStringMarkup(item,personal)"));
});

test('Every inline and standalone app script parses',()=>{
 for(const html of [index,goals,sqlGuide])for(const script of scripts(html))assert.doesNotThrow(()=>new Function(script));
 for(const s of ['data-structure-revision.js','array-interview-guide.js','string-interview-guide.js','concept-revision.js','daily-checklist.js','future-todos.js','monthly-goals.js','backup-all.js','auto-backup.js'])assert.doesNotThrow(()=>new Function(read(s)));
});

test('All static document references exist and no duplicate backup script loads',()=>{
 for(const html of [index,goals]){
  const known=ids(html),used=[...html.matchAll(/\$\('([^']+)'\)/g)].map(x=>x[1]);
  const missing=[...new Set(used.filter(x=>!known.has(x)))];
  assert.deepEqual(missing,[]);
 }
 assert.equal((index.match(/<script[^>]*src="\.\/auto-backup\.js/g)||[]).length,1);
 assert.ok(index.includes('id="solvedCount"'));
 assert.ok(index.includes('id="revisedCount"'));
 assert.ok(index.includes('id="total"'));
});

test('Arrays guide covers interview requirements without replacing user notes',()=>{
 const fakeWindow={};
 new Function('window',arrayGuide)(fakeWindow);
 const g=fakeWindow.RecallArrayGuide;
 assert.ok(g&&g.html);
 assert.ok(g.stats.operations>=35);
 assert.ok(g.stats.fundamentals>=12);
 assert.ok(g.stats.patterns>=20);
 assert.ok(g.stats.templates>=15);
 for(const id of ['ag-operations','ag-fundamentals','ag-patterns','ag-recognize','ag-edges','ag-interview','ag-memorize','ag-practice']){
  assert.ok(g.html.includes('id="'+id+'"'),id);
 }
 assert.equal((g.html.match(/<details\b/g)||[]).length,(g.html.match(/<\/details>/g)||[]).length);
 assert.ok(g.html.includes('data-ds-copy'));
 assert.ok(g.html.includes('freq = {0: 1}'));
 assert.ok(index.includes('array-interview-guide.css'));
 assert.ok(index.indexOf('array-interview-guide.js') < index.indexOf('data-structure-revision.js'));
 assert.ok(dsRevision.includes("if(item.id==='arrays')return preservedArrayMarkup(item,personal)"));
 assert.ok(dsRevision.includes('const personal=personalNotes(item)'));
 assert.ok(arrayStyles.includes('@media(max-width:760px)'));
 assert.ok(arrayStyles.includes('overflow-x:auto'));
 assert.equal((g.html.match(/class="ag-section" data-ag-section=/g)||[]).length,8);
 assert.ok(g.html.includes('data-ag-expand-all'));
 assert.ok(g.html.includes('data-ag-collapse-all'));
 assert.ok(g.html.includes('data-ag-open="ag-operations"'));
 assert.ok(dsRevision.includes("arrayIntegratedNotes"));
 assert.ok(dsRevision.includes("ARRAY_ARCHIVE_KEY"));
 assert.ok(dsRevision.includes("verified.at(-1)?.notes!==existing"));
 assert.ok(dsRevision.includes("function renderPersonalNotes(item)"));
 assert.ok(arrayStyles.includes('ag-section-toggle'));
});


test('Strings guide supplies collapsible interview reference while preserving private notes',()=>{
 const source=read('string-interview-guide.js'),target={};
 new Function('window',source)(target);
 const guide=target.RecallStringGuide;
 assert.ok(guide?.html,'Strings reference must render');




 const data=JSON.parse(source.match(/^const d=(.*);\n\nconst escape=/m)[1]);
 for(const key of ['operations','fundamentals','patterns','templates'])assert.equal(guide.stats[key],data[key].length);
 assert.ok(data.practice.length>0);
 assert.ok(guide.html.includes('Invariant:')&&guide.html.includes('Not applicable / limits:'));
 for(const id of ['sg-operations','sg-fundamentals','sg-patterns','sg-recognize','sg-edges','sg-interview','sg-memorize','sg-practice'])assert.ok(guide.html.includes('id="'+id+'"'),id);
 assert.equal((guide.html.match(/<details class="ag-section" data-ag-section="sg-/g)||[]).length,8);
 assert.equal((guide.html.match(/<details\b/g)||[]).length,(guide.html.match(/<\/details>/g)||[]).length);
 for(const token of ['data-ag-open="sg-operations"','data-ag-expand-all','data-ag-collapse-all','data-ds-copy','class="ag-practice"'])assert.ok(guide.html.includes(token),token);
 assert.ok(index.includes('string-interview-guide.js'));
 assert.ok(index.indexOf('string-interview-guide.js')<index.indexOf('data-structure-revision.js'));
 for(const name of ['preservedStringMarkup','stringIntegratedNotes','STRING_ARCHIVE_KEY','stringOpenSections','downloadStringBackup'])assert.ok(dsRevision.includes(name),name);
 assert.ok(dsRevision.includes('function renderPersonalNotes(item)'));
 assert.ok(guide.html.includes('KMP')&&guide.html.includes('casefold')&&guide.html.includes('Minimum Window Substring'));
});
test('DSA ends at Union Find without deleting hidden private records',()=>{
 const prefix='const presets=';
 const raw=dsRevision.slice(dsRevision.indexOf(prefix)+prefix.length).split(';')[0];
 const presets=JSON.parse(raw);
 assert.equal(presets.length,11);
 assert.equal(presets.at(-1).id,'union-find');
 const line=dsRevision.split(String.fromCharCode(10)).find(text=>text.startsWith('const isVisibleTopic='));
 assert.ok(line,'Display must have an explicit canonical-topic predicate');
 const visible=new Function('presetRank',line+'return isVisibleTopic;')(new Map(presets.map((item,i)=>[item.id,i])));
 for(const item of presets)assert.equal(visible(item),true);
 assert.equal(visible({id:'custom-old',notes:'Keep this private text'}),false,'legacy hidden records stay hidden');
 assert.equal(visible({id:'custom-dsa-example',title:'Binary Search',customTopic:true}),true,'custom topics appear');
 assert.equal(visible({id:'custom-dsa-example',title:'Binary Search',customTopic:true,deleted:true}),false);
 assert.equal(visible({id:'graphs',deleted:true}),false);
 assert.ok(dsRevision.includes('records.filter(x=>isVisibleTopic(x)&&'));
 assert.ok(dsRevision.includes('records.filter(isVisibleTopic)'));
 assert.ok(dsRevision.includes('window.RecallStructures=()=>records'));
 assert.ok(dsRevision.includes("detail:{kind:'structures',items:records}"));
 assert.ok(dsRevision.includes('id="dsAddTopicForm"'));
 assert.ok(dsRevision.includes('data-ds-rename-topic'));
 assert.ok(dsRevision.includes('function commitTopicChange('));
 assert.ok(!dsRevision.includes('data-remove='));
});

test('Due means solved AND scheduled, never just saved',()=>{
 const snippet=code.match(/function due\(n\)\{[^}]*\}/)?.[0];
 assert.ok(snippet);
 const due=new Function('today',snippet+'return due;')(()=> '2026-11-12');
 assert.equal(due({nextReview:'2026-11-10'}),false);
 assert.equal(due({solved:false,nextReview:'2026-11-10'}),false);
 assert.equal(due({solved:true,nextReview:'2026-11-12'}),true);
 assert.equal(due({solved:true,nextReview:'2026-11-13'}),false);
 assert.equal(due({solved:true}),false);
});

test('Revision heatmap counts revision events rather than saved rows',()=>{
 const start=code.indexOf('function renderHeat(data){'),stop=code.indexOf('\nfunction setMode(m)',start);
 assert.ok(start>=0&&stop>start);
 const heat={innerHTML:'',setAttribute(){}};
 const renderHeat=new Function('$','esc','day','revisionDates',code.slice(start,stop)+'return renderHeat;')(id=>id==='heatGrid'?heat:null,x=>x,x=>String(x).slice(0,10),x=>x.revisionHistory||[]);
 const d=dateKey();
 renderHeat([{createdAt:d,revisionHistory:[d+'T01:00:00Z',d+'T02:00:00Z']},{createdAt:d,revisionHistory:[]}]);
 assert.ok(heat.innerHTML.includes(d+' · 2 revisions'));
 assert.ok(!heat.innerHTML.includes(d+' · 3 revisions'));
});

test('Weekly habit streak and weekly completion use the whole calendar week',()=>{
 const start=goalCode.indexOf('function streak(h){'),stop=goalCode.indexOf('function due(h,date){',start);
 assert.ok(start>=0&&stop>start);
 const shift=n=>{const d=new Date();d.setDate(d.getDate()+n);return dateKey(d)};
 const helpers=new Function('dateShift','today',goalCode.slice(start,stop)+'return {streak,weekStart,completedFor,toggleHabitDate};')(shift,()=>dateKey());
 const week=helpers.weekStart(dateKey()),previous=new Date(week+'T12:00:00');previous.setDate(previous.getDate()-7);
 const habit={frequency:'weekly',dates:[week,dateKey(previous)]};
 assert.equal(helpers.streak(habit),2);
 assert.equal(helpers.completedFor(habit,dateKey()),true);
 helpers.toggleHabitDate(habit);
 assert.equal(helpers.completedFor(habit,dateKey()),false);
});

test('SQL and DSA concept ratings persist locally and become due again',()=>{
 const values=new Map(),events={},storage={getItem:k=>values.get(k)||null,setItem:(k,v)=>values.set(k,v)};
 const document={querySelectorAll:()=>[],addEventListener(){},getElementById:()=>null};
 const CustomEvent=class {constructor(type,detail){this.type=type;this.detail=detail?.detail}};
 const boot=()=>{const win={listeners:{},addEventListener(k,fn){(this.listeners[k]??=[]).push(fn)},dispatchEvent(e){(this.listeners[e.type]||[]).forEach(f=>f(e))}};new Function('document','window','localStorage','CustomEvent',concept)(document,win,storage,CustomEvent);return win};
 const first=boot();
 assert.equal(first.RecallConceptReview('sql:01','review'),true);
 assert.equal(first.RecallConceptReview('sql:01','confident'),true);
 const second=boot();
 assert.equal(second.RecallConcepts()[0].history.length,2);
 assert.equal(second.RecallConceptReady('sql:01'),false);
 assert.ok(index.includes('concept-revision.js'));
 assert.ok(sqlGuide.includes('window.RecallLocal=kind=>kind==="concepts"'));
});

test('Manual backups include all record types and require a preview',()=>{
 for(const key of ['coding','sql','goals','habits','structures','concepts','conflicts'])assert.ok(backup.includes(key+":'recall-"));
 assert.ok(backup.includes('backupRestorePreview'));
 assert.ok(backup.includes('const previous=Object.fromEntries'));
 assert.ok(backup.includes('recall-before-restore-'));
 assert.ok(auto.includes('recall-concept-reviews-v1'));
 assert.ok(auto.includes('recall-sync-conflicts-v1'));
});

test('Restoring an older archive merges instead of deleting new categories',async()=>{
 const db=new Map([
 ['recall-notes-v1',JSON.stringify([{id:'1',number:1,title:'Existing problem'}])],
 ['recall-sql-v1','[]'],
 ['recall-structures-v1',JSON.stringify([{id:'strings',notes:'Keep these notes'}])],
 ['recall-concept-reviews-v1',JSON.stringify([{id:'sql:01',history:[]}])],
 ['recall-sync-conflicts-v1','[]'],
 ['recall-goals-habits-v1',JSON.stringify({goals:[],habits:[]})]
 ]);
 const elements={},out=[];
 for(const id of ['backupEverything','backupStatus','restoreEverything','backupRestoreFile','backupRestorePreview','backupRestoreSummary','confirmRestore','cancelRestore'])elements[id]={hidden:true,disabled:false,textContent:'',files:[],value:'',click(){},style:{}};
 const storage={getItem:k=>db.get(k)??null,setItem:(k,v)=>db.set(k,v),removeItem:k=>db.delete(k)};
 const document={getElementById:id=>elements[id],createElement:()=>({style:{},click(){},remove(){}}),body:{appendChild(){}}};
 const location={reload(){out.push('reloaded')}};
 const URL={createObjectURL:()=> 'blob:test',revokeObjectURL(){}};
 const Blob=class {constructor(parts){this.text=parts.join('')}};
 new Function('document','window','localStorage','setTimeout','confirm','alert','Blob','URL','location',backup)(document,{},storage,()=>0,()=>true,()=>{},Blob,URL,location);
 const old={format:'recall-full-backup',version:1,coding:[{id:'2',number:2,title:'Imported problem'}],sql:[],goals:[],habits:[]};
 elements.backupRestoreFile.files=[{size:1000,text:async()=>JSON.stringify(old)}];
 await elements.backupRestoreFile.onchange({target:elements.backupRestoreFile});
 assert.equal(elements.backupRestorePreview.hidden,false);
 assert.equal(JSON.parse(db.get('recall-notes-v1')).length,1);
 await elements.confirmRestore.onclick();
 assert.equal(JSON.parse(db.get('recall-notes-v1')).length,2);
 assert.equal(JSON.parse(db.get('recall-structures-v1'))[0].notes,'Keep these notes');
 assert.equal(JSON.parse(db.get('recall-concept-reviews-v1')).length,1);
 assert.deepEqual(out,['reloaded']);
});

test('Private cloud transactions preserve older versions and reject stale or tied edits',async()=>{
 assert.ok(firebase.includes('runTransaction'));
 assert.ok(firebase.includes("recordType!=='syncBackup'"));
 assert.ok(firebase.includes('metadata?.fromCache'));
 const start=firebase.indexOf('const HISTORY_PREFIX=');
 const stop=firebase.indexOf('const historyButton=',start);
 assert.ok(start>0&&stop>start,'Cloud versioning helpers must exist');
 const store=new Map();
 const runTransaction=async (_db,fn)=>{
  const staged=new Map();
  const tx={
   get:async key=>({exists:()=>store.has(key),data:()=>store.get(key)}),
   set:(key,value)=>{staged.set(key,value)}
  };
  const result=await fn(tx);
  for(const [key,value] of staged)store.set(key,structuredClone(value));
  return result;
 };
 const fakeDoc=(collectionName,id)=>collectionName+'/'+id;
 const helpers=new Function('db','doc','list','cloudDocId','idOf','prepare','runTransaction','document','window','collection','getDocs','statusText','state',
  firebase.slice(start,stop)+'return {writeWithHistory,historyId,sameRecord,cappedHistory};')(
   {},fakeDoc,()=> 'coding',(kind,v)=>'structure-'+v.id,(kind,v)=>v.id,
   (kind,v)=>({...v,recordType:'structure'}),runTransaction,{}, {},()=>{},()=>{},()=>{},{}
  );
 const first={id:'arrays',title:'Arrays',notes:'first preserved version',updatedAt:'2026-11-13T15:00:00.000Z'};
 const second={...first,notes:'edited on iPad',updatedAt:'2026-11-13T15:01:00.000Z'};
 assert.equal((await helpers.writeWithHistory('structures',first)).result,'saved');
 assert.equal(store.get('coding/structure-arrays').notes,first.notes);
 assert.equal((await helpers.writeWithHistory('structures',second)).result,'saved');
 assert.equal(store.get('coding/structure-arrays').notes,second.notes);
 const history=store.get('coding/'+helpers.historyId('structures',second));
 assert.equal(history.recordType,'syncBackup');
 assert.equal(history.versions.length,1);
 assert.equal(history.versions[0].value.notes,first.notes);
 const stale={...first,notes:'outdated phone edit',updatedAt:'2026-11-13T15:00:30.000Z'};
 assert.equal((await helpers.writeWithHistory('structures',stale)).result,'remote-newer');
 assert.equal(store.get('coding/structure-arrays').notes,second.notes,'Stale write must not overwrite cloud');
 const tie={...second,notes:'different edit with same timestamp'};
 assert.equal((await helpers.writeWithHistory('structures',tie)).result,'remote-newer');
 assert.equal(store.get('coding/structure-arrays').notes,second.notes,'Equal timestamps should not silently overwrite');
 assert.equal((await helpers.writeWithHistory('structures',second)).result,'unchanged');
 assert.equal(store.get('coding/'+helpers.historyId('structures',second)).versions.length,1,'Do not create duplicate versions');
 const many=Array.from({length:30},(_,i)=>({archivedAt:new Date(1000+i*3600000).toISOString(),value:{notes:'v'+i}}));
 assert.equal(helpers.cappedHistory(many).length,12);
});

test('Private sync has retry, conflict archive, and mobile redirect fallback',()=>{
 assert.ok(firebase.includes('archiveConflict(kind'));
 assert.ok(firebase.includes('recall-sync-conflicts-v1'));
 assert.ok(firebase.includes('await signInWithRedirect(auth,provider)'));
 assert.ok(firebase.includes('Cloud save failed · Retrying automatically'));
 assert.ok(index.includes('downloadCloudHistory'));
 assert.ok(goals.includes('downloadCloudHistory'));
 assert.ok(firebase.includes('downloadCloudHistory'));
 assert.ok(firebase.includes('includeMetadataChanges:true'));
 assert.ok(firebase.includes('writeWithHistory(kind,value)'));
 assert.ok(firebase.includes('recordType===\'conceptReview\''));
 assert.ok(!index.includes('github_pat_'));
 assert.ok(!index.includes('data/notes.json'));
});

test('Readable controls and layouts exist for phone and keyboard',()=>{
 assert.ok(index.includes('row.onkeydown'));
 assert.ok(index.includes('tabindex="0"'));
 assert.ok(index.includes('type="checkbox" id="solved"'));
 assert.ok(goals.includes('id="settingsSection"'));
 assert.ok(goals.includes('id="downloadConflictCopies"'));
 assert.ok(css.includes('.concept-rate'));
 assert.ok(css.includes('@media(max-width:700px)'));
 assert.ok(css.includes(':focus-visible'));
 assert.ok(css.includes('prefers-reduced-motion'));
});
}

runTests(name=>readFileSync(new URL('../'+name,import.meta.url),'utf8'),test,assert);
