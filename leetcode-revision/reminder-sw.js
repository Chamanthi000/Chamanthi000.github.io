/* Notifications only. No fetch interception, cached notebooks, or timer promises. */
self.addEventListener('install',event=>event.waitUntil(self.skipWaiting()));
self.addEventListener('activate',event=>event.waitUntil(self.clients.claim()));
self.addEventListener('notificationclick',event=>{
 event.notification.close();
 const target=new URL('./goals.html#dailyChecklist',self.registration.scope);
 event.waitUntil((async()=>{
  const windows=await self.clients.matchAll({type:'window',includeUncontrolled:true});
  for(const client of windows){
   if(new URL(client.url).pathname===target.pathname){await client.focus();return;}
  }
  await self.clients.openWindow(target.href);
 })());
});
