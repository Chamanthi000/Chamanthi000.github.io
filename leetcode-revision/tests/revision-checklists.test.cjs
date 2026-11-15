'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const source=require('../revision-checklists.js');
const plan=require('../revision-planner-core.js');
const TODAY='2026-11-14';
test('every built-in DSA topic receives a distinct meaningful checklist',()=>{
 const ids=['arrays','strings','hash-maps','linked-lists','stacks','queues','trees','heaps','graphs','tries','union-find','sorting'];
 for(const id of ids){
  const p=source.get({id,title:id},0);
  assert.ok(p.checks.length>=6,id+' check count');
  assert.ok(p.checks.some(c=>c.id==='code'),id+' needs a blind-coding exercise');
  assert.equal(p.checks.filter(x=>x.id==='complexity').length,1,id+' explains complexity');
  assert.ok(p.checks.some(x=>x.id==='recognize'),id+' needs pattern recognition');
  assert.ok(p.checks.every(c=>c.label.length>=45),id+' checklist should be actionable');
 }
 assert.notEqual(source.get({id:'graphs',title:'Graphs'}).checks[1].label,
  source.get({id:'hash-maps',title:'Hash Maps'}).checks[1].label);
});
test('sorting covers named algorithms, tradeoffs, stability and rotating blind coding',()=>{
 const a=source.get({id:'manual:sorting-techniques',title:'Sorting techniques'},0);
 const lines=a.checks.map(x=>x.label).join(' ').toLowerCase();
 for(const technique of ['bubble','selection','insertion','merge','quick','stability','space','in-place'])assert.ok(lines.includes(technique),technique);
 for(const unlearned of ['heap sort','counting','radix'])assert.ok(!lines.includes(unlearned),'do not schedule unstudied '+unlearned);
 assert.match(a.challenge,/Insertion Sort/);
 assert.match(source.get({id:'manual:sorting-techniques',title:'Sorting techniques'},1).challenge,/Selection Sort/);
 assert.match(source.get({id:'manual:sorting-techniques',title:'Sorting techniques'},2).challenge,/Bubble Sort/);
 assert.match(source.get({id:'manual:sorting-techniques',title:'Sorting techniques'},3).challenge,/Merge Sort/);
 assert.match(source.get({id:'manual:sorting-techniques',title:'Sorting techniques'},4).challenge,/Quick Sort/);
});
test('unknown new personal topics get safe generic tasks, without leaking notes into source',()=>{
 const other=source.get({id:'custom-dsa-superprivate',title:'My private topic',notes:'secret never put into public guide'});
 assert.equal(other.checks.length,6);
 assert.equal(JSON.stringify(other).includes('secret never'),false);
});
test('good recall and honest blind code success extend only after all checklist items',()=>{
 const initial=plan.progressFor('sorting','Sorting techniques',null,'studied',TODAY);
 const items=source.get({id:'sorting',title:'Sorting techniques'}).checks;
 const pass=plan.assessmentFor('sorting','Sorting techniques',initial,{items,checked:items.map(x=>x.id),
  memorized:'yes',codeBlind:'yes',challenge:'Merge Sort'},'2026-11-17');
 assert.equal(pass.nextReview,'2026-11-24');
 assert.equal(pass.history.at(-1).result,'remembered');
 assert.equal(pass.history.at(-1).codeBlind,'yes');
 assert.equal(pass.history.at(-1).checked.length,items.length);
 assert.equal(pass.focus,'maintain');
});
test('memorized but unable to code schedules focused coding practice tomorrow',()=>{
 const items=source.get({id:'arrays',title:'Arrays'}).checks;
 const next=plan.assessmentFor('arrays','Arrays',null,{items,checked:items.map(x=>x.id),memorized:'yes',codeBlind:'no',challenge:'Two Sum'},TODAY);
 assert.equal(next.nextReview,'2026-11-15');
 assert.equal(next.focus,'blind-coding');
 assert.equal(next.stage,0);
 assert.equal(next.history.at(-1).codeBlind,'no');
});
test('can code but cannot explain algorithm schedules memory-focused review',()=>{
 const items=source.get({id:'graphs',title:'Graphs'}).checks;
 const next=plan.assessmentFor('graphs','Graphs',null,{items,checked:items.map(x=>x.id),
  memorized:'no',codeBlind:'yes',challenge:'BFS'},TODAY);
 assert.equal(next.nextReview,'2026-11-15');
 assert.equal(next.focus,'algorithm-recall');
});
test('both failures schedule recall and coding, partial checklist cannot be mastered',()=>{
 const items=source.get({id:'sorting',title:'Sorting techniques'}).checks;
 const weak=plan.assessmentFor('sorting','Sorting techniques',null,{items,checked:[],memorized:'no',codeBlind:'no'},TODAY);
 assert.equal(weak.nextReview,'2026-11-15');
 assert.equal(weak.focus,'steps-and-coding');
 assert.equal(weak.history.at(-1).missing.length,items.length);
 const incomplete=plan.assessmentFor('sorting','Sorting techniques',null,{items,checked:[items[0].id],
  memorized:'yes',codeBlind:'yes'},TODAY);
 assert.equal(incomplete.nextReview,'2026-11-17');
 assert.equal(incomplete.focus,'unfinished-checkpoints');
 assert.equal(incomplete.history.at(-1).result,'practice');
});
test('incomplete assessments never create a fake completed review',()=>{
 const items=source.get({id:'trees',title:'Trees'}).checks;
 for(const invalid of [{memorized:null,codeBlind:'yes'},{memorized:'yes',codeBlind:null}]){
  assert.throws(()=>plan.assessmentFor('trees','Trees',null,{items,checked:[],...invalid},TODAY),/Answer both/);
 }
 const good=plan.assessmentFor('trees','Trees',null,{items,checked:[],memorized:'no',codeBlind:'no'},TODAY);
 assert.throws(()=>plan.assessmentFor('trees','Trees',good,{items,checked:[],memorized:'yes',codeBlind:'yes'},TODAY),/Already reviewed/);
});
test('previous history and custom checkpoints survive assessments with fresh future review date',()=>{
 const items=source.get({id:'sorting',title:'Sorting techniques'}).checks;
 const old={recordType:plan.RECORD_TYPE,topicId:'sorting',startedOn:'2026-11-11',
  history:[{day:'2026-11-12',result:'remembered'}],extraReviewChecks:[{id:'custom-1',label:'Remember noncomparison sort constraints'}],
  reviewDraft:{date:TODAY,memorized:'yes',codeBlind:'no',checked:[]},myMetadata:'keep'};
 const next=plan.assessmentFor('sorting','Sorting techniques',old,{items:[...items,...old.extraReviewChecks],checked:items.map(x=>x.id),
  memorized:'yes',codeBlind:'no',challenge:'Quick Sort'},TODAY);
 assert.equal(next.history.length,2);
 assert.deepEqual(next.extraReviewChecks,old.extraReviewChecks);
 assert.equal(next.myMetadata,'keep');
 assert.equal(next.reviewDraft,null);
 assert.equal(next.history.at(-1).missing[0],'custom-1');
});

test('passing a previously failed challenge consolidates after three days before expanding to seven',()=>{
 const items=source.get({id:'manual:sorting-techniques',title:'Sorting techniques'}).checks;
 const attempt=plan.assessmentFor('sorting','Sorting techniques',null,{items,checked:items.map(x=>x.id),
  memorized:'yes',codeBlind:'no',challenge:'Merge Sort'},TODAY);
 const recovered=plan.assessmentFor('sorting','Sorting techniques',attempt,{items,checked:items.map(x=>x.id),
  memorized:'yes',codeBlind:'yes',challenge:'Merge Sort'},'2026-11-15');
 assert.equal(recovered.nextReview,'2026-11-18');
 assert.equal(recovered.stage,0);
 const consolidated=plan.assessmentFor('sorting','Sorting techniques',recovered,{items,checked:items.map(x=>x.id),
  memorized:'yes',codeBlind:'yes',challenge:'Quick Sort'},'2026-11-18');
 assert.equal(consolidated.nextReview,'2026-11-25');
 assert.equal(consolidated.stage,1);
});
