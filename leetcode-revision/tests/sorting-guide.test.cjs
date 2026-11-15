'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),{execFileSync}=require('node:child_process');
const guide=require('../sorting-interview-guide.js'),plan=require('../revision-planner-core.js');
test('Sorting reference includes the five studied algorithms in the user-supplied order',()=>{
 assert.deepEqual(guide.algorithms.map(x=>x.name),['Insertion Sort','Selection Sort','Bubble Sort','Merge Sort','Quick Sort']);
 assert.equal((guide.html.match(/class="sort-algorithm"/g)||[]).length,5);
 for(const item of guide.algorithms){
  assert.ok(item.steps.length>=6,item.name+' complete steps');
  for(const word of ['core','recall','analogy','analogyText','when','cue','proof','code'])assert.ok(item[word]?.length>(word==='analogy'?5:20),item.name+' '+word);
  assert.ok(item.complexity.length>=4,item.name+' complexity cases');
  assert.ok(guide.html.includes(item.analogy),item.name+' visible analogy');
  assert.ok(guide.html.includes(item.recall.replace(/&/g,'&amp;')),item.name+' memory mnemonic');
 }
 assert.match(guide.html,/Studied Nov 14, 2026/i);
 assert.ok(guide.html.includes('FINAL MEMORY TRICKS'));
 assert.ok(guide.html.includes('INTERVIEW COMPARISON'));
});
test('complexities reflect the studied reference without confusing optimized variants',()=>{
 const data=Object.fromEntries(guide.algorithms.map(x=>[x.id,x]));
 for(const id of ['insertion','selection','bubble','merge','quick'])assert.ok(data[id]);
 assert.equal(data.insertion.best,'O(n)');
 assert.equal(data.selection.best,'O(n²)');
 assert.equal(data.bubble.best,'O(n)*');
 assert.match(data.bubble.proof,/swapped flag/);
 assert.equal(data.merge.worst,'O(n log n)');
 assert.equal(data.merge.space,'O(n)');
 assert.equal(data.quick.worst,'O(n²)');
 assert.match(data.quick.space,/O\(n\) worst/);
 assert.match(data.selection.proof,/n−1 swaps/);
});
test('all five optional Python templates sort duplicate, ordered, reversed, empty and singleton arrays',()=>{
 const source=guide.algorithms.map(x=>x.code).join('\n\n');
 const inputs=[[],[1],[5,3,8,2,4],[9,7,5,3,1],[1,1,1,1],[4,2,4,1,3,2],[0,-7,5,-2,9,0],Array.from({length:24},(_,i)=>((i*13)%17)-8)];
 const harness=[
  source,
  'import json',
  'cases='+JSON.stringify(inputs),
  'for fn in [insertion_sort,selection_sort,bubble_sort,merge_sort,quick_sort]:',
  '    for original in cases:',
  '        a=original[:]',
  '        result=fn(a)',
  '        assert result==sorted(original),(fn.__name__,original,result)',
  '        if fn.__name__=="merge_sort":',
  '            assert a==original,"Merge Sort template should not mutate input"',
  '        else:',
  '            assert a==result,"in-place algorithm returned wrong data"',
  'print("SORT TEMPLATES PASS")'
 ].join('\n');
 const output=execFileSync('python3',['-c',harness],{encoding:'utf8',timeout:15000});
 assert.match(output,/SORT TEMPLATES PASS/);
});
test('Sorting study date enters spaced revision without rewriting notes or marking mastery',()=>{
 const row={id:'sorting-algorithms',title:'Sorting Algorithms',notes:'',studiedOn:'2026-11-14',createdAt:'2026-11-12T00:00:00Z',updatedAt:'2026-11-12T00:00:00Z'};
 const topics=plan.collectTopics([row],[],'2026-11-14');
 assert.equal(topics.length,1);
 assert.equal(topics[0].id,'sorting-algorithms');
 assert.equal(topics[0].nextReview,'2026-11-17');
 assert.equal(topics[0].hasNotes,false);
 assert.equal(topics[0].reviewCount,0);
 assert.deepEqual(plan.planDays(topics,'2026-11-14')[3].items.map(x=>x.title),['Sorting Algorithms']);
 assert.equal(row.notes,'');
});
test('a pre-existing user review date takes precedence over the original study date',()=>{
 const row={id:'sorting-algorithms',title:'Sorting Algorithms',notes:'',studiedOn:'2026-11-14'};
 const done=plan.progressFor('sorting-algorithms','Sorting Algorithms',null,'studied','2026-11-15');
 const topics=plan.collectTopics([row],[done],'2026-11-15');
 assert.equal(topics.length,1);assert.equal(topics[0].nextReview,'2026-11-18');
 assert.equal(topics[0].estimated,false);
});
