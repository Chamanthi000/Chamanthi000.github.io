'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {chromium}=require(process.env.DSA_PLAYWRIGHT_MODULE||'playwright');
const root=path.resolve(__dirname,'..'),key='recall-structures-v1',openKey='recall-dsa-extra-notes-open-v1';
const topics=['arrays','strings','hash-maps','linked-lists','stacks','queues','trees','heaps','graphs','tries','union-find'];
const original='  Private <img src=x onerror=alert(1)> & "quotes"\n\n    indent and trailing spaces  ';
const seed=topics.map(id=>({id,title:id,notes:original,updatedAt:'2026-01-01',metadata:{preserve:id}}));
seed[0]={...seed[0],notes:'',arrayMergeVersion:1,arrayIntegratedNotes:original,arrayLegacyBackup:'Original Arrays archive'};
seed[1]={...seed[1],notes:'',stringMergeVersion:1,stringIntegratedNotes:original,stringLegacyBackup:'Original Strings archive'};
seed.push({id:'hidden-topic',title:'Hidden topic',notes:'HIDDEN_ONLY_TEXT',updatedAt:'2026-01-01',custom:{keep:true}},{id:'deleted-topic',title:'Deleted topic',notes:'tombstone',deleted:true});
function serve(route){
    const url=new URL(route.request().url());if(url.hostname!=='extra-notes.test')return route.fulfill({status:204,body:''});
    const file=url.pathname==='/'?'index.html':url.pathname.slice(1);if(file.includes('..'))return route.fulfill({status:404,body:''});
    const full=path.join(root,file);if(!fs.existsSync(full)||!fs.statSync(full).isFile())return route.fulfill({status:404,body:''});
    let body=fs.readFileSync(full);if(file==='index.html')body=body.toString().replace(/<script type="module" src="[^"]*firebase-sync[^"]*"><[/]script>/,'');
    return route.fulfill({body,contentType:({'.html':'text/html','.js':'application/javascript','.css':'text/css'}[path.extname(file)]||'text/plain')});
   }
(async()=>{
 const browser=await chromium.launch({headless:true,executablePath:process.env.DSA_CHROMIUM_EXECUTABLE});
 try{
  for(const viewport of [{width:1280,height:900},{width:390,height:844}]){
   const context=await browser.newContext({viewport,reducedMotion:'reduce'}),errors=[];
   await context.route('**/*',serve);
   const page=await context.newPage();page.setDefaultTimeout(15000);page.on('pageerror',e=>errors.push(e.message));
   await page.addInitScript(({seed,key})=>{if(!localStorage.getItem('seeded')){localStorage.setItem(key,JSON.stringify(seed));localStorage.setItem('seeded','yes')}window.sent=[];window.addEventListener('recall-cloud-local',e=>window.sent.push(e.detail));},{seed,key});
   await page.goto('http://extra-notes.test/#coding');await page.locator('#dsToggle').click();
   assert.equal(await page.locator('.ds-extra-notes').count(),11);
   assert.deepEqual(await page.evaluate(()=>window.RecallStructures()),seed,'opening UI must not rewrite records');
   for(const id of topics){
    await page.locator('[data-nav-id="'+id+'"]').click();
    const topic=page.locator('.ds-topic[data-id="'+id+'"]'),extra=topic.locator('.ds-extra-notes');
    assert.equal(await extra.locator(':scope > summary h3').textContent(),'Extra notes');
    assert.equal(await extra.evaluate(el=>el.open),false,'scoped collapsed default '+id);
    const beforeToggle=await page.evaluate(()=>window.RecallStructures());
    await extra.locator(':scope > summary').focus();await page.keyboard.press('Enter');
    assert.equal(await extra.evaluate(el=>el.open),true);
    assert.deepEqual(await page.evaluate(()=>window.RecallStructures()),beforeToggle,'view preference does not edit notes');
    await topic.locator('[data-edit-id]').click();
    assert.equal(await topic.locator('textarea').inputValue(),original);
    assert.equal(await topic.locator('.ds-readview').isVisible(),true,'reference remains visible while editing');
    const edited=original+'\nExtra '+id;
    await topic.locator('textarea').fill(edited);
    if(id==='trees'){
     await topic.locator('textarea').evaluate(el=>el.setSelectionRange(3,8));
     await page.evaluate(()=>window.dispatchEvent(new CustomEvent('recall-cloud-data',{detail:{kind:'structures',items:[{id:'other-hidden-remote',title:'Other hidden remote',notes:'retain remote',updatedAt:'2098-01-01'}]}})));
     assert.equal(await topic.locator('.ds-extra-notes').evaluate(el=>el.open),true);
     assert.deepEqual(await topic.locator('textarea').evaluate(el=>[el.selectionStart,el.selectionEnd,document.activeElement===el]),[3,8,true]);
     assert.equal(await topic.locator('textarea').inputValue(),edited);
    }
    await topic.locator('[data-edit-id]').click();
    assert.equal(await topic.locator('textarea').isHidden(),true);
    const saved=await page.evaluate(id=>window.RecallStructures().find(x=>x.id===id),id);
    const field=id==='arrays'?'arrayIntegratedNotes':id==='strings'?'stringIntegratedNotes':'notes';
    assert.equal(saved[field],edited);
    assert.deepEqual(saved.metadata,{preserve:id});
    if(id==='arrays'){assert.equal(saved.notes,'');assert.equal(saved.arrayLegacyBackup,'Original Arrays archive');}
    if(id==='strings'){assert.equal(saved.notes,'');assert.equal(saved.stringLegacyBackup,'Original Strings archive');}
    assert.equal(await extra.locator('img,script').count(),0,'escaped private content');
    assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+2),'no overflow '+id);
   }
   await page.locator('[data-nav-id="graphs"]').click();
   if(process.env.DSA_SCREENSHOT_DIR){fs.mkdirSync(process.env.DSA_SCREENSHOT_DIR,{recursive:true});await page.locator('#ds-extra-notes-graphs').scrollIntoViewIfNeeded();await page.screenshot({path:path.join(process.env.DSA_SCREENSHOT_DIR,'extra-notes-'+viewport.width+'.png')});}
   await page.locator('[data-nav-id="trees"]').click();
   const trees=page.locator('[data-id="trees"]');
   await trees.locator('.ds-extra-notes > summary').click();
   assert.equal(await trees.locator('.concept-controls').isVisible(),true,'recall ratings remain accessible when Extra notes is closed');
   await page.waitForFunction(openKey=>!JSON.parse(localStorage.getItem(openKey)).includes('trees'),openKey);
   await page.reload();await page.locator('#dsToggle').click();
   for(const id of topics){assert.equal(await page.locator('#ds-extra-notes-'+id).evaluate(el=>el.open),id!=='trees');}
   assert.deepEqual(await page.evaluate(()=>window.RecallStructures().find(x=>x.id==='hidden-topic')),seed.at(-2));
   assert.deepEqual(await page.evaluate(()=>window.RecallStructures().find(x=>x.id==='deleted-topic')),seed.at(-1));
   await page.locator('#dsSearch').fill('Extra graphs');assert.equal(await page.locator('.ds-topic').count(),1);
   assert.equal(await page.locator('.ds-topic').getAttribute('data-id'),'graphs');
   await page.locator('#dsSearch').fill('HIDDEN_ONLY_TEXT');assert.equal(await page.locator('.ds-topic').count(),0);
   await page.locator('#dsSearch').fill('');await page.locator('[data-nav-id="trees"]').click();
   // A new isolated device receives the same full structures payload through the existing adapter.
   const second=await context.browser().newContext({viewport});await second.route('**/*',serve);
   const other=await second.newPage();await other.goto('http://extra-notes.test/#coding');
   const payload=await page.evaluate(()=>window.RecallStructures());
   await other.evaluate(items=>window.dispatchEvent(new CustomEvent('recall-cloud-data',{detail:{kind:'structures',items}})),payload);
   await other.locator('#dsToggle').click();await other.locator('[data-nav-id="graphs"]').click();await other.locator('#ds-extra-notes-graphs > summary').click();
   assert.ok((await other.locator('[data-id="graphs"] .dg-private-text').textContent()).endsWith('Extra graphs'));
   const remote={...payload.find(x=>x.id==='trees'),notes:'Remote extra note',updatedAt:'2099-01-01'};
   await page.evaluate(record=>window.dispatchEvent(new CustomEvent('recall-cloud-data',{detail:{kind:'structures',items:[record]}})),remote);
   assert.equal(await page.locator('[data-id="trees"] .dg-private-text').textContent(),'Remote extra note');
   await page.reload();assert.equal(await page.evaluate(()=>window.RecallStructures().find(x=>x.id==='trees').notes),'Remote extra note');

   // A custom notebook is editable, reload-safe and syncs without changing its ID.
   await page.locator('#dsToggle').click();
   await page.locator('#dsNewTopicTitle').fill('Binary Search Patterns');
   await page.locator('#dsAddTopicButton').click();
   const customId=await page.evaluate(()=>window.RecallStructures().find(x=>x.customTopic===true)?.id);
   assert.match(customId,/^custom-dsa-/);
   let custom=page.locator('.ds-topic[data-id="'+customId+'"]');
   assert.equal(await custom.locator('textarea').isVisible(),true,'new topic starts in edit mode');
   const customNotes='  Custom <script>alert(1)</script> & "quotes"\n\n    Python: left < right  ';
   await custom.locator('textarea').fill(customNotes);
   await custom.locator('[data-edit-id]').click();
   assert.equal(await page.evaluate(id=>window.RecallStructures().find(x=>x.id===id).notes,customId),customNotes);
   assert.equal(await custom.locator('script').count(),0,'notes are escaped');
   await custom.locator('[data-ds-rename-topic]').click();
   await custom.locator('[data-ds-title-form] input').fill('Two Pointers & Binary Search');
   await custom.locator('[data-ds-title-form] button[type="submit"]').click();
   custom=page.locator('.ds-topic[data-id="'+customId+'"]');
   assert.equal(await custom.locator('.ds-topic-name').textContent(),'Two Pointers & Binary Search');
   await page.reload();await page.locator('#dsToggle').click();
   custom=page.locator('.ds-topic[data-id="'+customId+'"]');
   assert.equal(await custom.locator('textarea').inputValue(),customNotes,'saved after reload');
   assert.equal(await custom.locator('.ds-topic-name').textContent(),'Two Pointers & Binary Search');
   await page.locator('#dsNewTopicTitle').fill('Two Pointers & Binary Search');
   await page.locator('#dsAddTopicButton').click();
   assert.match(await page.locator('#dsTopicFeedback').textContent(),/already exists/);
   assert.equal(await page.evaluate(()=>window.RecallStructures().filter(x=>x.customTopic===true).length),1);
   const updatedPayload=await page.evaluate(()=>window.RecallStructures());
   await other.evaluate(items=>window.dispatchEvent(new CustomEvent('recall-cloud-data',{detail:{kind:'structures',items}})),updatedPayload);
   const cloudCopy=other.locator('.ds-topic[data-id="'+customId+'"]');
   assert.equal(await cloudCopy.locator('.ds-topic-name').textContent(),'Two Pointers & Binary Search');
   assert.equal(await cloudCopy.locator('textarea').inputValue(),customNotes,'editable on a second device');
   assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+2),'no custom-topic overflow');
   assert.deepEqual(errors,[]);await second.close();await context.close();
  }
  for(const deny of [false,true]){
   const context=await browser.newContext({viewport:{width:390,height:844},reducedMotion:'reduce'});await context.route('**/*',serve);
   if(deny)await context.addInitScript(()=>{Storage.prototype.setItem=function(){throw Error('fixture storage denied')}});
   const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));await page.goto('http://extra-notes.test/#coding');await page.locator('#dsToggle').click();
   assert.equal(await page.locator('.ds-extra-notes').count(),11,'blank notebooks still have Extra notes');
   await page.locator('[data-nav-id="queues"]').click();await page.locator('#ds-extra-notes-queues > summary').click();await page.locator('[data-id="queues"] [data-edit-id]').click();
   assert.equal(await page.locator('[data-id="queues"] textarea').inputValue(),'');await page.locator('[data-id="queues"] textarea').fill('First extra note');
   assert.equal(await page.evaluate(()=>window.RecallStructures().find(x=>x.id==='queues').notes),'First extra note');
   if(deny)assert.match(await page.locator('#dsStatus').textContent(),/storage unavailable/);
   else{await page.locator('[data-id="queues"] textarea').fill('');await page.locator('[data-id="queues"] [data-edit-id]').click();assert.match(await page.locator('#dsSummary').textContent(),/0 with personal notes/);}
   assert.deepEqual(errors,[]);await context.close();
  }
  console.log('PASS: Custom DSA add/rename/save/reload/sync, and Extra notes on all 11 topics; desktop/mobile keyboard editing, exact text and archive preservation, reload/scoped preferences, search, hidden tombstones, two-device synthetic cloud delivery, no page errors.');
 }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1});
