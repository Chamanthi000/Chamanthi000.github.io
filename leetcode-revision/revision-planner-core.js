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
function collectTopics(noteRows,progressRows,today=dayKey()){
 if(!validDay(today))throw Error('A valid local planning date is required');
 const states=new Map((progressRows||[]).filter(x=>x&&x.recordType===RECORD_TYPE&&!x.deleted).map(x=>[String(x.topicId),x]));
 const notes=new Map();
 for(const item of Array.isArray(noteRows)?noteRows:[]){
  if(!item||item.deleted||!item.id||!item.title||!noteText(item).trim())continue;
  const id=String(item.id),previous=notes.get(id);
  if(!previous||String(item.updatedAt||'')>String(previous.updatedAt||''))notes.set(id,item);
 }
 const all=new Map();
 const titleCounts=new Map();
 for(const item of notes.values()){const title=titleKey(item.title);titleCounts.set(title,(titleCounts.get(title)||0)+1);}
 const manualByTitle=new Map([...states.values()].filter(row=>String(row.topicId||'').startsWith('manual:')).map(row=>[titleKey(row.title),row]));
 for(const item of notes.values()){
  const directId=String(item.id),key=titleKey(item.title);
  // A manually tracked subject and newly created private notebook with the same
  // unambiguous title are one study topic. Retain the manual review schedule.
  const manual=states.has(directId)||titleCounts.get(key)!==1?null:manualByTitle.get(key);
  const id=manual?String(manual.topicId):directId,progress=states.get(id);
  const initial=dateFromRecord(item,today),started=validDay(progress?.startedOn)?progress.startedOn:initial;
  const next=validDay(progress?.nextReview)?progress.nextReview:plusDays(started,INTERVALS[0]);
  all.set(id,{id,title:item.title,startedOn:started,nextReview:next,stage:Math.max(0,Math.min(5,Number(progress?.stage)||0)),
   hasNotes:true,estimated:!progress,reviewCount:Array.isArray(progress?.history)?progress.history.length:0,record:progress||null});
 }
 for(const progress of states.values()){
  const id=String(progress.topicId||'');if(!id||all.has(id))continue;
  // Explicitly registered topics without notes are still legitimate study items.
  const started=validDay(progress.startedOn)?progress.startedOn:today;
  const next=validDay(progress.nextReview)?progress.nextReview:plusDays(started,INTERVALS[0]);
  all.set(id,{id,title:String(progress.title||id),startedOn:started,nextReview:next,
    stage:Math.max(0,Math.min(5,Number(progress.stage)||0)),hasNotes:false,estimated:false,
    reviewCount:Array.isArray(progress.history)?progress.history.length:0,record:progress});
 }
 return [...all.values()].sort((a,b)=>a.nextReview.localeCompare(b.nextReview)||a.stage-b.stage||a.title.localeCompare(b.title));
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
function manualId(name){return 'manual:'+titleKey(name).replace(/\s+/g,'-');}
const api={RECORD_TYPE,PREFIX,INTERVALS,dayKey,validDay,plusDays,recordId,noteText,collectTopics,planDays,progressFor,manualId,titleKey};
root.RecallRevisionPlan=api;
if(typeof module==='object'&&module.exports)module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
