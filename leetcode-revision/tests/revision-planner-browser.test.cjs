'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {chromium}=require(process.env.DSA_PLAYWRIGHT_MODULE||'playwright');
const root=path.resolve(__dirname,'..');
(async()=>{
 const browser=await chromium.launch({headless:true,executablePath:process.env.DSA_CHROMIUM_EXECUTABLE});
 try{
  for(const viewport of [{width:390,height:844},{width:820,height:1180},{width:1440,height:900}]){
   const context=await browser.newContext({viewport,reducedMotion:'reduce'});
   await context.route('**/*',route=>{
    const url=new URL(route.request().url());
    if(url.hostname!=='revision.test')return route.fulfill({status:204,body:''});
    const file=url.pathname==='/'?'goals.html':url.pathname.slice(1);
    if(file.includes('..'))return route.fulfill({status:404,body:''});
    const full=path.join(root,file);
    if(!fs.existsSync(full))return route.fulfill({status:404,body:''});
    let body=fs.readFileSync(full);
    if(file==='goals.html')body=body.toString().replace(/<script type="module" src="[^"]*firebase-sync[^"]*"><\/script>/,'');
    return route.fulfill({body,contentType:({'.html':'text/html','.js':'application/javascript','.css':'text/css'}[path.extname(file)]||'text/plain')});
   });
   const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
   await page.addInitScript(()=>{
    const key='recall-structures-v1';
    if(!localStorage.getItem('rp-test-seeded')){
     const shift=n=>{const d=new Date();d.setDate(d.getDate()+n);return d.toISOString().slice(0,10)};
     const row=(id,title,days)=>({id,title,notes:'Private notes on '+title,createdAt:shift(days)+'T12:00:00.000Z',updatedAt:shift(days)+'T12:00:00.000Z'});
     localStorage.setItem(key,JSON.stringify([row('arrays','Arrays',-3),row('strings','Strings',-2),row('custom-dsa-sorting','Sorting techniques',0)]));
     localStorage.setItem('rp-test-seeded','true');
    }
   });
   await page.goto('http://revision.test/goals.html');
   assert.equal(await page.locator('#revisionPlanner').count(),1);
   assert.equal(await page.locator('#rpTodayItems .rpItem').count(),1);
   assert.match(await page.locator('#rpTodayItems').textContent(),/Arrays/);
   assert.match(await page.locator('#rpTomorrowItems').textContent(),/Strings/);
   assert.match(await page.locator('#rpUpcoming').textContent(),/Sorting techniques/);
   const notesBefore=await page.evaluate(()=>localStorage.getItem('recall-structures-v1'));
   // A conflicting, newer cloud note is a read-only reference, not a reason
   // to replace the preferred device's actual study date or note contents.
   await page.evaluate(()=>{
    window.RecallCloud={sessionToken:'simulated-authority-test',readAll:async()=>({
     structures:[{id:'arrays',title:'Arrays',notes:'unwanted remote revision',updatedAt:'2099-01-01T12:00:00.000Z'}]
    })};
    window.dispatchEvent(new CustomEvent('recall-cloud-status',{detail:{message:'Server confirmed'}}));
   });
   await page.waitForTimeout(30);
   assert.match(await page.locator('#rpTodayItems').textContent(),/Arrays/,'the device study date must remain authoritative');
   assert.equal(await page.evaluate(()=>localStorage.getItem('recall-structures-v1')),notesBefore);
   // Explicit checkbox completion on the daily plan counts as one true review.
   await page.evaluate(()=>{
    const date=window.RecallRevisionPlan.dayKey();
    window.RecallDailyChecklist.addSuggested(date,[{id:'rp-arrays',reviewTopicId:'arrays',name:'Revise Arrays · 5 min',start:'',end:''}]);
   });
   await page.locator('#dailyTasks [data-day-action="check"][data-task="rp-arrays"]').check();
   assert.match(await page.locator('#rpStatus').textContent(),/scheduled again/);
   const stored=await page.evaluate(()=>JSON.parse(localStorage.getItem('recall-goals-habits-v1')).habits);
   assert.equal(stored.filter(x=>x.recordType==='dsaTopicReview'&&x.topicId==='arrays').length,1);
   assert.equal(stored.find(x=>x.topicId==='arrays').history.length,1);
   assert.equal(await page.locator('#rpTodayItems .rpItem').count(),0);
   // Register a just-learned new topic even if it has no notes yet.
   await page.locator('#rpStudyInput').fill('Heap sort');
   await page.locator('#rpStudiedForm button').click();
   assert.match(await page.locator('#rpStatus').textContent(),/3 days later/);
   assert.match(await page.locator('#rpUpcoming').textContent(),/Heap sort/);
   // Tomorrow's plan stays editable and idempotent, with the regular template intact.
   await page.locator('#rpTomorrowChecklist').click();
   assert.match(await page.locator('#rpStatus').textContent(),/Added 1/);
   await page.locator('#rpTomorrowChecklist').click();
   assert.match(await page.locator('#rpStatus').textContent(),/already on tomorrow/);
   const tomorrow=await page.evaluate(()=>{
    const day=window.RecallRevisionPlan.plusDays(window.RecallRevisionPlan.dayKey(),1);
    return JSON.parse(localStorage.getItem('recall-goals-habits-v1')).habits.find(x=>x.id==='__recall_daily_'+day);
   });
   assert.equal(tomorrow.tasks.filter(x=>x.reviewTopicId==='strings').length,1);
   assert.ok(tomorrow.tasks.length>1,'existing routine template preserved');
   assert.equal(await page.evaluate(()=>localStorage.getItem('recall-structures-v1')),notesBefore,'read-only schedule never edits original study notes');
   await page.reload();
   assert.match(await page.locator('#rpUpcoming').textContent(),/Heap sort/);
   assert.equal(await page.locator('#rpTodayItems .rpItem').count(),0);
   assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+6),'no mobile or tablet horizontal overflow');
   assert.deepEqual(errors,[]);
   await context.close();
  }
  console.log('PASS: short DSA revision planning, real checklist completion, manual sorting, no duplicate tasks, reload, preserved notes, responsive mobile tablet desktop');
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
