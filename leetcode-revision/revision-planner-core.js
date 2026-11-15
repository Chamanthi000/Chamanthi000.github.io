/* Recall: short, topic-level spaced revision. Pure functions; no private notes leave the browser. */
(function(root){
'use strict';
const RECORD_TYPE='dsaTopicReview',PREFIX='__recall_review_topic_v1_';
const INTERVALS=[3,7,14,30,60,90];
const datePattern=/^\d{4}-\d{2}-\d{2}$/;
function dayKey(value=new Date()){
 const d=value instanceof Date?value:new Date(value);
 if(!Number.isFinite(d.getTime()))return '';
 return [d.getFullYear(),String(d.getMonth()+1).padStart(2,'0'),String(d.getDate()).padStart(2,'0')].join('-');
}
function validDay(value){
 if(typeof value!=='string'||!datePattern.test(value))return false;
 const d=new Date(value+'T12:00:00Z');
 return !Number.isNaN(d.getTime())&&d.toISOString().slice(0,10)===value;
}
function plusDays(value,n){
 if(!validDay(value))return '';
 const d=new Date(value+'T12:00:00Z');
 d.setUTCDate(d.getUTCDate()+n);
 return d.toISOString().slice(0,10);
}
function titleKey(value){return String(value||'').trim().replace(/\s+/g,' ').toLocaleLowerCase();}
function recordId(topicId){return PREFIX+encodeURIComponent(String(topicId));}
function noteText(item){
 const value=item?.id==='arrays'&&item.arrayMergeVersion===1?item.arrayIntegratedNotes:
  item?.id==='strings'&&item.stringMergeVersion===1?item.stringIntegratedNotes:item?.notes;
 return typeof value==='string'?value:'';
}
function dateFromRecord(value,today){
 const raw=String(value?.updatedAt||value?.createdAt||'').slice(0,10);
 return validDay(raw)?(raw>today?today:raw):today;
}
// These are the same eleven section identities visible in DSA Revision.
// Other historical records stay in storage, but cannot become planner topics.
const BUILTIN_SECTIONS=Object.freeze([
 ['arrays','Arrays'],['strings','Strings'],['hash-maps','Hash Maps & Sets'],
 ['linked-lists','Linked Lists'],['stacks','Stacks'],['queues','Queues & Deques'],
 ['trees','Trees & BSTs'],['heaps','Heaps & Priority Queues'],
 ['graphs','Graphs'],['tries','Tries'],['union-find','Union Find']
]);
const BUILTIN_NAMES=new Map(BUILTIN_SECTIONS);
function isVisibleSection(row){
 return !!row&&!row.deleted&&typeof row.id==='string'&&
  (BUILTIN_NAMES.has(row.id)||row.customTopic===true);
}
function revisionSections(noteRows){
 const records=new Map();
 for(const item of Array.isArray(noteRows)?noteRows:[]){
  if(!item||typeof item.id!=='string')continue;
  const previous=records.get(item.id);
  if(!previous||String(item.updatedAt||'')>String(previous.updatedAt||''))records.set(item.id,item);
 }
 // DSA Revision always displays these eleven guides, even before notes exist.
 // Respect an explicit tombstone: an archived/deleted guide is not due.
 const visible=[];
 for(const [id,title] of BUILTIN_SECTIONS){
  const row=records.get(id);
  if(row?.deleted)continue;
  visible.push({...row,id,title:typeof row?.title==='string'&&row.title.trim()?row.title:title});
 }
 for(const row of records.values()){
  if(!isVisibleSection(row)||BUILTIN_NAMES.has(row.id)||typeof row.title!=='string'||!row.title.trim())continue;
  visible.push(row);
 }
 return visible;
}
function collectTopics(noteRows,progressRows,today=dayKey()){
 if(!validDay(today))throw Error('A valid local planning date is required');
 const sections=revisionSections(noteRows);
 const states=new Map((progressRows||[]).filter(x=>x&&x.recordType===RECORD_TYPE&&!x.deleted)
  .map(x=>[String(x.topicId),x]));
 const counts=new Map();
 for(const row of sections){
  const name=titleKey(row.title);
  counts.set(name,(counts.get(name)||0)+1);
 }
 const manualByTitle=new Map([...states.values()]
  .filter(row=>String(row.topicId||'').startsWith('manual:')&&row.title)
  .map(row=>[titleKey(row.title),row]));
 const topics=[];
 for(const row of sections){
  const directId=String(row.id),key=titleKey(row.title);
  const legacyManual=states.has(directId)||counts.get(key)!==1?null:manualByTitle.get(key);
  const id=legacyManual?String(legacyManual.topicId):directId,progress=states.get(id);
  const hasNotes=!!noteText(row).trim();
  // Never manufacture reminders from orphaned progress. A topic is scheduled
  // only if its CURRENT DSA section has notes or a matching tracked review.
  if(!hasNotes&&!progress)continue;
  const initial=dateFromRecord(row,today);
  const started=validDay(progress?.startedOn)?progress.startedOn:initial;
  const next=validDay(progress?.nextReview)?progress.nextReview:plusDays(started,INTERVALS[0]);
  topics.push({id,title:row.title,startedOn:started,nextReview:next,
   stage:Math.max(0,Math.min(5,Number(progress?.stage)||0)),hasNotes,
   estimated:!progress,reviewCount:Array.isArray(progress?.history)?progress.history.length:0,
   record:progress||null,sectionId:directId});
 }
 return topics.sort((a,b)=>a.nextReview.localeCompare(b.nextReview)||a.stage-b.stage||a.title.localeCompare(b.title));
}
function planDays(topics,today=dayKey(),length=8,limit=2){
 if(!validDay(today))throw Error('Invalid planning date');
 const days=Array.from({length},(_,i)=>({date:plusDays(today,i),items:[]}));
 for(const topic of [...topics].sort((a,b)=>a.nextReview.localeCompare(b.nextReview)||a.stage-b.stage||a.title.localeCompare(b.title))){
  const due=validDay(topic.nextReview)?topic.nextReview:today;
  const slot=days.find(d=>d.date>=due&&d.items.length<limit);
  if(slot)slot.items.push({...topic,overdue:due<slot.date,scheduledFor:slot.date});
 }
 return days;
}
function progressFor(topicId,title,old,action,today=dayKey(),now=new Date().toISOString()){
 if(!validDay(today))throw Error('Invalid review date');
 const id=String(topicId||'');if(!id)throw Error('Missing topic identity');
 const prev=old&&old.recordType===RECORD_TYPE?old:null;
 const started=action==='studied'?today:(validDay(prev?.startedOn)?prev.startedOn:today);
 const history=Array.isArray(prev?.history)?prev.history.slice(-119):[];
 if(action==='studied'){
  return {...prev,id:recordId(id),recordType:RECORD_TYPE,topicId:id,title:String(title),startedOn:started,stage:0,
   nextReview:plusDays(today,INTERVALS[0]),history,updatedAt:now};
 }
 if(action!=='remembered'&&action!=='practice')throw Error('Unknown review action');
 // Same-day double-taps must not silently move the next review further away.
 if(history.some(entry=>entry.day===today))throw Error('Already reviewed this topic today');
 const stage=action==='practice'?0:Math.min(5,(Math.max(0,Number(prev?.stage)||0))+1);
 history.push({day:today,result:action});
 return {...prev,id:recordId(id),recordType:RECORD_TYPE,topicId:id,title:String(title),startedOn:started,stage,
  nextReview:plusDays(today,action==='practice'?1:INTERVALS[stage]),history,updatedAt:now};
}
// Persist review assessment separately from personal DSA notes. A checkbox alone
// never means mastery, and remembering steps is distinct from coding unaided.
function assessmentFor(topicId,title,old,assessment,today=dayKey(),now=new Date().toISOString()){
 if(!validDay(today))throw Error('Invalid review date');
 const id=String(topicId||'');if(!id)throw Error('Missing topic identity');
 const prev=old&&old.recordType===RECORD_TYPE?old:null;
 const history=Array.isArray(prev?.history)?prev.history.slice(-119):[];
 if(history.some(entry=>entry.day===today))throw Error('Already reviewed this topic today');
 if(!assessment||!['yes','no'].includes(assessment.memorized)||!['yes','no'].includes(assessment.codeBlind))
  throw Error('Answer both memory and no-peeking coding questions.');
 const items=Array.isArray(assessment.items)?assessment.items.filter(x=>x&&typeof x.id==='string'&&x.id.length<150).slice(0,30):[];
 if(items.length<2)throw Error('No review checklist was provided');
 const chosen=new Set(Array.isArray(assessment.checked)?assessment.checked.filter(x=>typeof x==='string'):[]);
 const covered=items.filter(x=>chosen.has(x.id)).map(x=>x.id);
 const missing=items.filter(x=>!chosen.has(x.id)).map(x=>x.id);
 const allCovered=missing.length===0;
 const memoryOk=assessment.memorized==='yes',codeOk=assessment.codeBlind==='yes';
 const fullPass=memoryOk&&codeOk&&allCovered;
 const recovered=history.at(-1)?.result==='practice';
 const stage=fullPass?(recovered?0:Math.min(5,Math.max(0,Number(prev?.stage)||0)+1)):0;
 const nextDays=fullPass?INTERVALS[stage]:(memoryOk&&codeOk?3:1);
 const focus=!memoryOk&& !codeOk?'steps-and-coding':!memoryOk?'algorithm-recall':!codeOk?'blind-coding':!allCovered?'unfinished-checkpoints':'maintain';
 history.push({day:today,result:fullPass?'remembered':'practice',memorized:assessment.memorized,
  codeBlind:assessment.codeBlind,checked:covered,missing,challenge:String(assessment.challenge||'').slice(0,130),focus});
 return {...prev,id:recordId(id),recordType:RECORD_TYPE,topicId:id,title:String(title),stage,
  startedOn:validDay(prev?.startedOn)?prev.startedOn:today,nextReview:plusDays(today,nextDays),
  focus,history,reviewDraft:null,updatedAt:now};
}
function manualId(name){return 'manual:'+titleKey(name).replace(/\s+/g,'-');}
const api={RECORD_TYPE,PREFIX,INTERVALS,dayKey,validDay,plusDays,recordId,noteText,isVisibleSection,revisionSections,collectTopics,planDays,progressFor,assessmentFor,manualId,titleKey};
root.RecallRevisionPlan=api;
if(typeof module==='object'&&module.exports)module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
