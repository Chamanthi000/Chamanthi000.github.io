/* Local calendar export: contains only the user's chosen checklist, never a server upload. */
(()=>{'use strict';
 const escape=value=>String(value??'').replace(/\\/g,'\\\\').replace(/\r\n|\r|\n/g,'\\n').replace(/;/g,'\\;').replace(/,/g,'\\,');
 const stamp=value=>new Date(value).toISOString().replace(/[-:]/g,'').replace(/\.\d{3}Z$/,'Z');
 const time=(day,clock)=>/^\d{2}:\d{2}$/.test(clock||'')&&Number(clock.slice(0,2))<24&&Number(clock.slice(3))<60?+new Date(day+'T'+clock+':00'):NaN;
 function fold(line){
  let result='',bytes=0;
  for(const char of line){const size=new TextEncoder().encode(char).length;if(bytes+size>75){result+='\r\n ';bytes=1}result+=char;bytes+=size}
  return result;
 }
 function build(days,now=Date.now()){
  const lines=['BEGIN:VCALENDAR','VERSION:2.0','PRODID:-//Recall//Daily task alarms//EN','CALSCALE:GREGORIAN'];
  let count=0;
  const event=(id,title,start,end,alarms)=>{
   count++;lines.push('BEGIN:VEVENT','UID:'+escape(id)+'@recall-chamanthi','DTSTAMP:'+stamp(now),'DTSTART:'+stamp(start),'DTEND:'+stamp(end),'SUMMARY:'+escape(title),'DESCRIPTION:'+escape('Open Recall to answer Yes / No. Calendar changes do not update Recall. https://chamanthi000.github.io/leetcode-revision/goals.html#dailyChecklist'),'URL:https://chamanthi000.github.io/leetcode-revision/goals.html#dailyChecklist');
   for(const [trigger,label] of alarms)lines.push('BEGIN:VALARM','ACTION:DISPLAY','TRIGGER:'+trigger,'DESCRIPTION:'+escape(label),'END:VALARM');
   lines.push('END:VEVENT');
  };
  for(const {date,tasks} of days){
   for(const t of tasks){
    if(t.done)continue;
    const start=time(date,t.start),end=time(date,t.end);
    if(Number.isFinite(start)&&start>now)event(date+'-'+t.id+'-start',t.name,start,Number.isFinite(end)&&end>start?end:start+60000,[['-PT30M','In 30 minutes: '+t.name],['PT0S','Starting now: '+t.name]]);
    if(Number.isFinite(end)&&end>now)event(date+'-'+t.id+'-finish','Did you finish? '+t.name,end,end+60000,[['PT0S','Open Recall to answer Yes / No: '+t.name]]);
   }
   const plan=time(date,'22:00');
   if(plan>now)event(date+'-plan','Plan tomorrow in Recall',plan,plan+5*60000,[['PT0S','Open Recall to plan tomorrow.']]);
  }
  lines.push('END:VCALENDAR');
  return {count,text:lines.map(fold).join('\r\n')+'\r\n'};
 }
 window.RecallTaskCalendar={build,download(days){
  const result=build(days);
  if(!result.count)return false;
  const url=URL.createObjectURL(new Blob([result.text],{type:'text/calendar;charset=utf-8'}));
  const a=document.createElement('a');a.href=url;a.download='recall-task-alarms-'+days[0].date+'.ics';document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),30000);
  return true;
 }};
})();
