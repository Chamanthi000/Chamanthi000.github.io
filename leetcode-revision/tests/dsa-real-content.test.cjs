'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const {chromium} = require(process.env.DSA_PLAYWRIGHT_MODULE || 'playwright');
const root = path.resolve(__dirname, '..');
const topics = ['hash-maps','linked-lists','stacks','queues','trees','heaps','graphs','tries','union-find'];
(async()=>{
 const browser = await chromium.launch({headless:true,executablePath:process.env.DSA_CHROMIUM_EXECUTABLE});
 try {
  const context = await browser.newContext({viewport:{width:1280,height:900}});
  const errors=[];
  await context.route('**/*', async route=>{
   const url=new URL(route.request().url());
   if(url.hostname !== 'recall-dsa.test') return route.fulfill({status:204,body:''});
   let file=url.pathname==='/'?'index.html':decodeURIComponent(url.pathname.slice(1));
   if(file.includes('..'))return route.fulfill({status:404,body:''});
   const full=path.join(root,file);
   if(!fs.existsSync(full)||!fs.statSync(full).isFile())return route.fulfill({status:404,body:''});
   let body=fs.readFileSync(full);
   if(file==='index.html') {
    // Isolated preview: never invoke production account or cloud sync.
    body=body.toString().replace(/<script type="module" src="[^"]*firebase-sync[^"]*"><[/]script>/,'');
   }
   const ext=path.extname(file);
   return route.fulfill({contentType:({'.html':'text/html','.js':'application/javascript','.css':'text/css','.json':'application/json'}[ext]||'application/octet-stream'),body});
  });
  const page=await context.newPage();page.setDefaultTimeout(15000);
  page.on('pageerror',error=>errors.push(error.message));
  await page.goto('http://recall-dsa.test/#coding');
  await page.locator('#dsToggle').click();
  assert.equal(await page.locator('.ds-topic').count(),11);
  for(const id of topics){
   const data=JSON.parse(fs.readFileSync(path.join(root,id+'-guide.json'),'utf8'));
   await page.locator('[data-nav-id="'+id+'"]').click();
   const topic=page.locator('.ds-topic[data-id="'+id+'"]');
   assert.equal(await topic.locator('.ag-section').count(),8,id+' eight sections');
   assert.equal(await topic.locator('.ag-pattern').count(),data.patterns.length,id+' pattern count');
   assert.equal(await topic.locator('[data-ds-copy]').count(),data.templates.length+data.fundamentals.length,id+' copy controls');
   await topic.locator('[data-ag-open="dg-'+id+'-memorize"]').click();
   assert.equal(await topic.locator('[data-ag-section="dg-'+id+'-memorize"]').getAttribute('open'),'');
   await topic.locator('[data-ag-collapse-all]').click();
  }
  const ids=await page.locator('[id]').evaluateAll(nodes=>nodes.map(n=>n.id));
  assert.equal(ids.length,new Set(ids).size,'unique full-site ids');
  fs.mkdirSync(path.join(root,'output/playwright'),{recursive:true});
  await page.locator('[data-nav-id="graphs"]').click();
  await page.locator('.ds-topic[data-id="graphs"]').screenshot({path:path.join(root,'output/playwright/dsa-real-desktop.png')});
  await page.setViewportSize({width:375,height:812});
  for(const id of topics){
   await page.locator('[data-nav-id="'+id+'"]').click();
   const topic=page.locator('.ds-topic[data-id="'+id+'"]');
   await topic.locator('[data-ag-open="dg-'+id+'-patterns"]').click();
   await topic.locator('.ag-pattern').first().locator('summary').click();
   assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+2),id+' no mobile overflow');
   await topic.locator('[data-ag-collapse-all]').click();
  }
  await page.locator('[data-nav-id="trees"]').click();
  await page.locator('.ds-topic[data-id="trees"]').screenshot({path:path.join(root,'output/playwright/dsa-real-mobile.png')});
  assert.deepEqual(errors,[],'no uncaught full-site preview errors');
  console.log('PASS: real full-index preview, 11 topics, all 9 new guides/72 sections, exact real-content counts, unique ids, desktop + 375px mobile navigation/layout, no page errors. Firebase disabled; all network intercepted.');
 }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
