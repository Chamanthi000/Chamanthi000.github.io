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
 const element=id=>{if(!elements.has(id))elements.set(id,{value:'',style:{},dataset:{},addEventListener(){},setAttribute(){},scrollIntoView(){}});return elements.get(id)};
 const RealDate=Date;class Clock extends RealDate{constructor(...a){super(...(a.length?a:[clock]))}static now(){return +new RealDate(clock)}}
 const c={window:{RecallGoals:{getHabits:()=>records},RecallNotifications:{status:()=>'',show:(...a)=>alerts.push(a)},addEventListener(){}},document:{getElementById:element,querySelector:()=>null,addEventListener(){}},Date:Clock,localStorage:{getItem:()=>null,setItem(){}},location:{search:''},URLSearchParams,setInterval:f=>intervals.push(f),setTimeout};
 vm.runInNewContext(source('daily-checklist.js'),c);
 return {elements,alerts,tick:()=>intervals[0]()};
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
