'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {chromium}=require(process.env.DSA_PLAYWRIGHT_MODULE||'playwright');
const root=path.resolve(__dirname,'..');
(async()=>{
 const browser=await chromium.launch({headless:true,executablePath:process.env.DSA_CHROMIUM_EXECUTABLE});
 try{
  for(const viewport of [{width:390,height:844},{width:820,height:1180},{width:1440,height:900}]){
   const ctx=await browser.newContext({viewport,acceptDownloads:true,reducedMotion:'reduce'});
   await ctx.route('**/*',route=>{
    const u=new URL(route.request().url());
    if(u.hostname!=='journal.test')return route.fulfill({status:204,body:''});
    const file=u.pathname==='/'?'journal.html':u.pathname.slice(1);
    if(file==='firebase-sync.js')return route.fulfill({body:'',contentType:'application/javascript'});
    if(file.includes('..'))return route.fulfill({status:404,body:''});
    const full=path.join(root,file);
    if(!fs.existsSync(full))return route.fulfill({status:404,body:''});
    return route.fulfill({body:fs.readFileSync(full),contentType:({'.html':'text/html','.js':'application/javascript','.css':'text/css'}[path.extname(file)]||'text/plain')});
   });
   const page=await ctx.newPage(),errors=[];
   page.on('pageerror',e=>errors.push(e.message));
   await page.addInitScript(()=>{
    if(!localStorage.getItem('journal-test-seeded')){
     localStorage.setItem('recall-goals-habits-v1',JSON.stringify({
      goals:[{id:'goal-keep',name:'Be a confident driver'}],
      habits:[{id:'habit-keep',name:'Walk Lucas',frequency:'daily'}],
      savedFlag:'preserve'
     }));
     localStorage.setItem('journal-test-seeded','true');
    }
   });
   await page.goto('https://journal.test/journal.html');
   assert.match(await page.title(),/Journal/);
   assert.equal(await page.locator('#journalForm [data-journal-field]').count(),5);
   assert.equal(await page.locator('nav a[aria-current="page"]').count(),1);
   assert.equal(await page.locator('#journalRecent .empty').count(),1);
   await page.locator('textarea[name="good"]').fill('I enjoyed the walk with Lucas');
   await page.locator('textarea[name="learned"]').fill('Learned when to use Insertion Sort');
   await page.locator('textarea[name="improve"]').fill('I checked my phone during deep work');
   await page.locator('textarea[name="tomorrow"]').fill('Put my phone away before coding');
   await page.locator('#journalMoods label:has(input[value="good"])').click();
   let envelope=await page.evaluate(()=>JSON.parse(localStorage.getItem('recall-goals-habits-v1')));
   assert.deepEqual(envelope.goals,[{id:'goal-keep',name:'Be a confident driver'}]);
   assert.equal(envelope.habits.filter(h=>h.recordType!=='journalEntry').length,1);
   assert.equal(envelope.savedFlag,'preserve');
   const entries=envelope.habits.filter(h=>h.recordType==='journalEntry');
   assert.equal(entries.length,1);
   assert.equal(entries[0].learned,'Learned when to use Insertion Sort');
   assert.equal(entries[0].improve,'I checked my phone during deep work');
   assert.equal(entries[0].mood,'good');
   assert.match(await page.locator('#journalSave').textContent(),/Saved on this device/);
   assert.equal(await page.locator('#journalRecent .recentDay').count(),1);
   // Each day has its own editable journal; navigation and reload must preserve both.
   await page.locator('#journalPrev').click();
   await page.locator('textarea[name="learned"]').fill('Practiced driving safely');
   assert.equal(await page.locator('#journalRecent .recentDay').count(),2);
   await page.reload();
   assert.equal(await page.locator('textarea[name="learned"]').inputValue(),'Learned when to use Insertion Sort','today is the default view after reload');
   await page.locator('#journalPrev').click();
   assert.equal(await page.locator('textarea[name="learned"]').inputValue(),'Practiced driving safely','earlier entries must remain editable');
   await page.locator('#journalNext').click();
   assert.equal(await page.locator('textarea[name="good"]').inputValue(),'I enjoyed the walk with Lucas');
   assert.equal(await page.locator('textarea[name="improve"]').inputValue(),'I checked my phone during deep work');
   await page.locator('textarea[name="improve"]').fill('I spent too long on low-priority tasks');
   const downloadWait=page.waitForEvent('download');
   await page.locator('#journalExport').click();
   const download=await downloadWait;
   assert.match(download.suggestedFilename(),/^recall-journal-\d{4}-\d\d-\d\d\.json$/);
   // Simulate another signed-in device returning a newer journal entry.
   await page.evaluate(()=>{
    const d=window.RecallJournal.getEntries()[0];
    window.dispatchEvent(new CustomEvent('recall-cloud-data',{detail:{kind:'habits',items:[
     {...d,learned:'Cloud-completed reflections',updatedAt:'2099-01-01T00:00:00.000Z'}
    ]}}));
   });
   envelope=await page.evaluate(()=>JSON.parse(localStorage.getItem('recall-goals-habits-v1')));
   assert.equal(envelope.habits.find(h=>h.recordType==='journalEntry'&&h.date===envelope.habits.find(x=>x.recordType==='journalEntry').date).learned,'Cloud-completed reflections');
   assert.equal(envelope.goals.length,1);
   assert.equal(envelope.habits.filter(h=>h.recordType!=='journalEntry').length,1);
   assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+6),'no horizontal scrolling');
   assert.deepEqual(errors,[]);
   await ctx.close();
  }
  console.log('PASS: journal entry prompts, local autosave, cross-date edit, reload, export, cloud merge, goals/habits preserved, mobile/tablet/desktop');
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exitCode=1});