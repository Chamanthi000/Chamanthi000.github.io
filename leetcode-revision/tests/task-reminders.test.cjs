const test=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs'),path=require('node:path');
const source=file=>fs.readFileSync(path.join(__dirname,'..',file),'utf8');
function calendar(){const c={window:{},Date,TextEncoder};vm.runInNewContext(source('task-calendar.js'),c);return c.window.RecallTaskCalendar;}
test('calendar has before/start/end alarms, skips completed and untimed tasks, and escapes content',()=>{
 const {text,count}=calendar().build([{date:'2026-11-16',tasks:[{id:'a',name:'Read, test; 🐕\nNext',start:'09:00',end:'10:00'},{id:'b',name:'DONE',done:true,start:'09:00'},{id:'c',name:'UNTIMED'}]}],+new Date('2026-11-16T07:00:00'));
 assert.equal(count,3);assert.match(text,/TRIGGER:-PT30M/);assert.equal((text.match(/BEGIN:VALARM/g)||[]).length,4);assert.ok(!text.includes('DONE'));assert.ok(!text.includes('UNTIMED'));assert.match(text,/Read\\, test\\;/);assert.match(text,/Did you finish/);assert.match(text,/Plan tomorrow/);
 for(const line of text.split('\r\n'))assert.ok(Buffer.byteLength(line)<=75);
 const expected=new Date('2026-11-16T09:00:00').toISOString().replace(/[-:]/g,'').replace('.000','');assert.ok(text.includes('DTSTART:'+expected));
});
test('calendar skips past starts but retains upcoming completion, no past-day alarms',()=>{
 const api=calendar();assert.equal(api.build([{date:'2026-11-16',tasks:[{id:'a',name:'Active',start:'09:00',end:'11:00'}]}],+new Date('2026-11-16T10:00:00')).count,2);
 assert.equal(api.build([{date:'2026-11-15',tasks:[]}],+new Date('2026-11-16T10:00:00')).count,0);
});
function notifications({failure=false,permission='granted',mobile=false}={}){
 const stored=new Map(),calls=[],el={};let fail=failure;
 const c={window:{matchMedia:()=>({matches:false})},navigator:{userAgent:mobile?'iPhone':'Desktop',serviceWorker:{register:async()=>({active:true,showNotification:async(...args)=>{calls.push(args);if(fail)throw Error('blocked')}})}},Notification:{permission},location:{href:'https://example.com/leetcode-revision/goals.html'},URL,setTimeout,document:{getElementById:()=>el},localStorage:{getItem:k=>stored.get(k),setItem:(k,v)=>stored.set(k,v)}};
 c.window.Notification=c.Notification;vm.runInNewContext(source('task-notifications.js'),c);
 return {api:c.window.RecallNotifications,stored,calls,el,recover:()=>fail=false};
}
test('service-worker notification is delivered once and recorded only on success',async()=>{
 const n=notifications();assert.equal(await n.api.show('task','body','a'),true);assert.equal(await n.api.show('task','body','a'),false);assert.equal(n.calls.length,1);assert.equal(n.stored.get('a'),'1');
});
test('failed notifications can retry, and denied permission sends nothing',async()=>{
 const n=notifications({failure:true});assert.equal(await n.api.show('task','body','a'),false);assert.equal(n.stored.has('a'),false);n.recover();assert.equal(await n.api.show('task','body','a'),true);
 const blocked=notifications({permission:'denied'});assert.equal(await blocked.api.show('task','body','a'),false);assert.equal(blocked.calls.length,0);
});
test('iPhone browser receives installation guidance instead of false success',async()=>{
 const n=notifications({mobile:true});assert.match(n.api.status(),/Add to Home Screen/);assert.equal(await n.api.enable(),false);
});
function daily(clock,records){
 const elements=new Map(),alerts=[],intervals=[];
 const element=id=>{if(!elements.has(id))elements.set(id,{value:'',style:{},dataset:{},addEventListener(type,listener){this['on'+type]=listener},reset(){},setAttribute(){},scrollIntoView(){}});return elements.get(id)};
 const RealDate=Date;class Clock extends RealDate{constructor(...a){super(...(a.length?a:[clock]))}static now(){return +new RealDate(clock)}}
 const c={window:{RecallGoals:{getHabits:()=>records,saveHabits:update=>update(records)},RecallNotifications:{status:()=>'',show:(...a)=>alerts.push(a)},addEventListener(){}},document:{getElementById:element,querySelector:()=>null,addEventListener(){}},Date:Clock,localStorage:{getItem:()=>null,setItem(){}},location:{search:''},URLSearchParams,setInterval:f=>intervals.push(f),setTimeout};
 vm.runInNewContext(source('daily-checklist.js'),c);
 return {elements,element,alerts,checklist:c.window.RecallDailyChecklist,tick:()=>intervals[0]()};
}
test('today reminders run while tomorrow or recurring template is being edited',()=>{
 const records=[{id:'__recall_daily_template_v1',recordType:'dailyTemplate',tasks:[]},{id:'__recall_daily_2026-11-16',tasks:[{id:'a',name:'Study',start:'09:00',end:'10:00'}]}];
 const d=daily('2026-11-16T08:40:00',records);d.alerts.length=0;d.elements.get('dailyDate').onchange({target:{value:'2026-11-17'}});assert.equal(d.alerts[0][0],'Upcoming task · Study');
 d.alerts.length=0;d.elements.get('dailyTemplateMode').onclick();d.tick();assert.equal(d.alerts[0][0],'Upcoming task · Study');
});
test('midnight pre-reminder is scheduled on previous day and completed tasks stay quiet',()=>{
 const d=daily('2026-11-16T23:50:00',[{id:'__recall_daily_template_v1',tasks:[]},{id:'__recall_daily_2026-11-17',tasks:[{id:'a',name:'Early',start:'00:10'},{id:'b',name:'Done',start:'00:10',done:true}]}]);assert.ok(d.alerts.some(a=>a[0]==='Upcoming task · Early'));assert.ok(!d.alerts.some(a=>a[0].includes('Done')));
});
test('completion reminders survive short suspension, but stale tasks do not flood alerts',()=>{
 const d=daily('2026-11-16T10:15:00',[{id:'__recall_daily_template_v1',tasks:[]},{id:'__recall_daily_2026-11-16',tasks:[{id:'a',name:'Recent',end:'10:00'},{id:'b',name:'Old',end:'09:00'}]}]);assert.equal(d.alerts.length,1);assert.equal(d.alerts[0][0],'Did you finish? · Recent');
});
test('Plan tomorrow loads Saturday and Sunday weekend tasks and Monday weekday tasks',()=>{
 for(const [clock,date,weekend] of [
  ['2026-11-20T22:00:00','2026-11-21',true],
  ['2026-11-21T22:00:00','2026-11-22',true],
  ['2026-11-22T22:00:00','2026-11-23',false]
 ]){
  const {elements}=daily(clock,[]);
  elements.get('dailyOpenTomorrow').onclick();
  assert.equal(elements.get('dailyDate').value,date);
  const tasks=elements.get('dailyTasks').innerHTML;
  if(weekend){
   assert.match(tasks,/2 PM – 5 PM/);
   assert.match(tasks,/Dinner &amp; résumé prep/);
   assert.match(tasks,/5 PM – 9 PM/);
   assert.doesNotMatch(tasks,/Othot work|Breakfast/);
  }else{
   assert.match(tasks,/Othot work/);
   assert.doesNotMatch(tasks,/Dinner &amp; résumé prep/);
  }
 }
});
test('saved weekend dates take precedence over recurring defaults',()=>{
 const records=[
  {id:'__recall_daily_2026-11-21',tasks:[{id:'custom',name:'Saturday appointment'}]}
 ];
 const {elements}=daily('2026-11-20T22:00:00',records);
 elements.get('dailyPlanTomorrow').onclick();
 assert.match(elements.get('dailyTasks').innerHTML,/Saturday appointment/);
 assert.doesNotMatch(elements.get('dailyTasks').innerHTML,/weekend_drive/);
 elements.get('dailyWeekendTemplateMode').onclick();
 assert.equal(elements.get('dailyHeading').textContent,'Recurring weekend template');
 assert.match(elements.get('dailyTasks').innerHTML,/weekend_drive/);
});
test('editing the weekend template saves its own record and leaves the weekday template intact',()=>{
 const weekday={id:'__recall_daily_template_v1',tasks:[{id:'study',name:'Study'}]};
 const records=[weekday];
 const {elements,element,checklist}=daily('2026-11-20T22:00:00',records);
 elements.get('dailyWeekendTemplateMode').onclick();
 const name=element('dailyNewName');
 name.value='Weekend errands';
 elements.get('dailyAddForm').onsubmit({preventDefault(){}});
 const weekend=records.find(record=>record.id==='__recall_daily_weekend_template_v1');
 assert.equal(weekend.recordType,'dailyTemplate');
 assert.ok(weekend.tasks.some(task=>task.name==='Weekend errands'));
 assert.equal(weekday.tasks.length,1);
 const result=checklist.addSuggested('2026-11-22',[{id:'sort',name:'Review sorting',reviewTopicId:'sorting'}]);
 assert.equal(result.added,1);
 const sunday=records.find(record=>record.date==='2026-11-22');
 assert.ok(sunday.tasks.some(task=>task.name==='Weekend errands'));
 assert.ok(sunday.tasks.some(task=>task.id==='weekend_drive'));
 assert.doesNotMatch(JSON.stringify(weekend.tasks),/Review sorting/);
});
