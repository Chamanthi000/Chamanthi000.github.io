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

test('Every inline and standalone app script parses',()=>{
 for(const html of [index,goals,sqlGuide])for(const script of scripts(html))assert.doesNotThrow(()=>new Function(script));
 for(const s of ['data-structure-revision.js','array-interview-guide.js','concept-revision.js','daily-checklist.js','future-todos.js','monthly-goals.js','backup-all.js','auto-backup.js'])assert.doesNotThrow(()=>new Function(read(s)));
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
 assert.ok(dsRevision.includes('isArrayGuide?core:readable(core)'));
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
 assert.ok(dsRevision.includes("const personalHtml=!isArrayGuide&&personal"));
 assert.ok(arrayStyles.includes('ag-section-toggle'));
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

test('Private sync has retry, conflict archive, and mobile redirect fallback',()=>{
 assert.ok(firebase.includes('archiveConflict(kind'));
 assert.ok(firebase.includes('recall-sync-conflicts-v1'));
 assert.ok(firebase.includes('await signInWithRedirect(auth,provider)'));
 assert.ok(firebase.includes('Cloud save failed · Retrying automatically'));
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
