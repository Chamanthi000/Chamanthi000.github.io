/* Device notifications only: this worker does not schedule background reminders. */
(()=>{'use strict';
 const inFlight=new Set(),sent=new Set();
 let registration;
 const ios=()=>/iPad|iPhone|iPod/.test(navigator.userAgent)||(navigator.platform==='MacIntel'&&navigator.maxTouchPoints>1);
 const installed=()=>navigator.standalone===true||window.matchMedia('(display-mode: standalone)').matches;
 function ready(){
  if(!registration){
   registration=(async()=>{
    if(!('serviceWorker' in navigator))return null;
    const reg=await navigator.serviceWorker.register('./reminder-sw.js',{scope:'./',updateViaCache:'none'});
    if(reg.active)return reg;
    return await Promise.race([navigator.serviceWorker.ready,new Promise((_,reject)=>setTimeout(()=>reject(Error('Notification setup timed out. Reload and try again.')),10000))]);
   })().catch(error=>{registration=null;throw error});
  }
  return registration;
 }
 function status(){
  if(ios()&&!installed())return 'iPhone / iPad: in Safari, tap Share → Add to Home Screen, then open Recall from that icon and enable alerts. Use Calendar alarms for closed-app reminders.';
  if(!('Notification' in window))return 'This browser does not support system notifications. Use Calendar alarms below.';
  if(Notification.permission==='denied')return 'Notifications are blocked. Allow Recall in browser/site settings and device notification settings, then reload.';
  if(Notification.permission==='granted')return 'Permission allowed on this device. Test an alert below. Browser reminders need this page running; Calendar alarms work when Recall is closed.';
  return 'Enable alerts on each device, then test one. Browser reminders need the page running. Use Calendar alarms for closed-app reminders.';
 }
 async function show(title,body,key,{test=false}={}){
  if(!('Notification' in window)||Notification.permission!=='granted')return false;
  let stored=false;try{stored=!!localStorage.getItem(key)}catch{}
  if(!test&&(stored||sent.has(key)||inFlight.has(key)))return false;
  inFlight.add(key);
  try{
   const reg=await ready();
   if(reg)await reg.showNotification(title,{body,tag:key,data:{url:new URL('./goals.html#dailyChecklist',location.href).href}});
   else {
    const n=new Notification(title,{body,tag:key});
    n.onclick=()=>{window.focus();document.getElementById('dailyChecklist')?.scrollIntoView();n.close()};
   }
   if(!test){sent.add(key);try{localStorage.setItem(key,'1')}catch{}}
   return true;
  }catch(error){
   const el=document.getElementById('dailyNotifyStatus');
   if(el)el.textContent='Alert failed: '+error.message+' Use Calendar alarms or retry the test.';
   return false;
  }finally{inFlight.delete(key)}
 }
 window.RecallNotifications={show,status,async enable(){
  if(ios()&&!installed())return false;
  if(!('Notification' in window))return false;
  // Permission must be requested directly from the button gesture, before awaits.
  const permission=Notification.permission==='default'?await Notification.requestPermission():Notification.permission;
  if(permission!=='granted')return false;
  return show('Recall reminders are ready','Test alert. Keep Recall open for browser reminders, or import Calendar alarms for alerts when it is closed.','recall-notification-test',{test:true});
 }};
 // Register early; no fetch handler or offline cache can stale the synced notebooks.
 if('serviceWorker' in navigator)ready().catch(()=>{});
})();
