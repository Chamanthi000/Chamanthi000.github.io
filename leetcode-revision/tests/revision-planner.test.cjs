'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),plan=require('../revision-planner-core.js');
const TODAY='2026-11-14',sample=(id,title,date)=>({id,title,notes:'My private notes',createdAt:date+'T10:00:00.000Z',updatedAt:date+'T10:00:00.000Z'});
test('notes suggest study but do not count as a completed review',()=>{
 const topics=plan.collectTopics([sample('sorting','Sorting techniques',TODAY)],[],TODAY);
 assert.equal(topics.length,1);
 assert.equal(topics[0].nextReview,'2026-11-17');
 assert.equal(topics[0].reviewCount,0);
 assert.equal(topics[0].estimated,true);
 assert.deepEqual(plan.planDays(topics,TODAY,8,2)[3].items.map(x=>x.title),['Sorting techniques']);
});
test('quick review expands spacing, difficult reviews return tomorrow',()=>{
 const initial=plan.progressFor('sorting','Sorting techniques',null,'studied',TODAY);
 assert.equal(initial.nextReview,'2026-11-17');
 assert.equal(initial.stage,0);
 const remembered=plan.progressFor('sorting','Sorting techniques',initial,'remembered','2026-11-17');
 assert.equal(remembered.nextReview,'2026-11-24');
 assert.equal(remembered.stage,1);
 const repeated=plan.progressFor('sorting','Sorting techniques',remembered,'remembered','2026-11-24');
 assert.equal(repeated.nextReview,'2026-12-08');
 assert.equal(repeated.stage,2);
 const difficult=plan.progressFor('sorting','Sorting techniques',repeated,'practice','2026-12-08');
 assert.equal(difficult.nextReview,'2026-12-09');
 assert.equal(difficult.stage,0);
 assert.deepEqual(difficult.history.map(x=>x.result),['remembered','remembered','practice']);
});
test('cannot count same-day accidental double-tap as another completed revision',()=>{
 const first=plan.progressFor('arrays','Arrays',null,'remembered',TODAY);
 assert.throws(()=>plan.progressFor('arrays','Arrays',first,'remembered',TODAY),/Already reviewed/);
});
test('no user notes or explicit study means no fake completed topics',()=>{
 const topics=plan.collectTopics([sample('arrays','Arrays',TODAY),{id:'stacks',title:'Stacks',notes:'',updatedAt:TODAY+'T10:00:00.000Z'}],[],TODAY);
 assert.deepEqual(topics.map(x=>x.id),['arrays']);
});
test('manual studied sorting stays scheduled without requiring fabricated notes',()=>{
 const record=plan.progressFor(plan.manualId('Sorting Techniques'),'Sorting Techniques',null,'studied',TODAY);
 const topics=plan.collectTopics([],[record],TODAY);
 assert.deepEqual(topics.map(x=>x.title),['Sorting Techniques']);
 assert.equal(topics[0].nextReview,'2026-11-17');
 assert.equal(topics[0].estimated,false);
});
test('editing notes after a completed review does not reset the user-confirmed due date',()=>{
 const reviewed=plan.progressFor('arrays','Arrays',null,'remembered','2026-11-12');
 const afterEdit=plan.collectTopics([sample('arrays','Arrays','2026-11-14')],[reviewed],TODAY);
 assert.equal(afterEdit[0].nextReview,'2026-11-19');
 assert.equal(afterEdit[0].reviewCount,1);
});
test('up to two short topics daily and overdue items are carried safely',()=>{
 const notes=Array.from({length:7},(_,i)=>sample('topic-'+i,'Topic '+i,'2026-11-01'));
 const topics=plan.collectTopics(notes,[],TODAY),days=plan.planDays(topics,TODAY,7,2);
 assert.deepEqual(days.slice(0,4).map(x=>x.items.length),[2,2,2,1]);
 assert.deepEqual(days.flatMap(x=>x.items.map(y=>y.id)).sort(),topics.map(x=>x.id).sort());
 assert.ok(days[0].items.every(t=>t.overdue));
});
test('short interval calculation uses calendar days without time-zone drift',()=>{
 assert.equal(plan.plusDays('2026-03-07',3),'2026-03-10');
 assert.equal(plan.plusDays('2026-12-31',1),'2027-01-01');
 assert.equal(plan.validDay('2026-02-30'),false);
});
test('sorting and special imported IDs get distinct, safe cloud record IDs',()=>{
 assert.notEqual(plan.recordId('a/b'),plan.recordId('a%2Fb'));
 assert.equal(plan.recordId('a/b').includes('/'),false);
});
test('custom topics and migrated note fields are eligible without exposing note text',()=>{
 const rows=[{id:'arrays',title:'Arrays',notes:'old',arrayMergeVersion:1,arrayIntegratedNotes:'new notes',updatedAt:'2026-11-12T01:00:00Z'},
 {id:'strings',title:'Strings',notes:'',stringMergeVersion:1,stringIntegratedNotes:'',updatedAt:'2026-11-12T01:00:00Z'},
 {id:'custom-dsa-sorting',title:'Sorting techniques',customTopic:true,notes:'Learned merge sort',updatedAt:'2026-11-14T01:00:00Z'}];
 const topics=plan.collectTopics(rows,[],TODAY);
 assert.deepEqual(topics.map(x=>x.id),['arrays','custom-dsa-sorting']);
 assert.equal(JSON.stringify(topics).includes('Learned merge sort'),false);
});

test('manual Sorting review history is reused when private Sorting notes are added later',()=>{
 const manual=plan.progressFor(plan.manualId('Sorting techniques'),'Sorting techniques',null,'studied',TODAY);
 const notebook=sample('custom-dsa-sorting','Sorting techniques','2026-11-15');
 const topics=plan.collectTopics([notebook],[manual],'2026-11-16');
 assert.equal(topics.length,1,'manual reminder and private notebook form one topic');
 assert.equal(topics[0].id,manual.topicId);
 assert.equal(topics[0].nextReview,'2026-11-17');
 assert.equal(topics[0].estimated,false);
 assert.equal(topics[0].hasNotes,true);
});
