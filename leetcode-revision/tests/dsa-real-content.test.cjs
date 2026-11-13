'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const {chromium} = require(process.env.DSA_PLAYWRIGHT_MODULE || 'playwright');
const root = path.resolve(__dirname, '..');
const topics = ['arrays','strings','hash-maps','linked-lists','stacks','queues','trees','heaps','graphs','tries','union-find'];
const destination=process.env.DSA_SCREENSHOT_DIR || path.join(root,'output/playwright');
(async()=>{
 const browser=await chromium.launch({headless:true,executablePath:process.env.DSA_CHROMIUM_EXECUTABLE});
 const report=[];
 try {
  for(const device of [{name:'mobile',width:393,height:852,touch:true},{name:'tablet',width:834,height:1194,touch:true},{name:'desktop',width:1440,height:900,touch:false}]){
   const context=await browser.newContext({viewport:{width:device.width,height:device.height},hasTouch:device.touch,isMobile:device.name==='mobile',reducedMotion:'reduce'});
   const errors=[];
   await context.route('**/*',async route=>{
    const url=new URL(route.request().url());
    if(url.hostname!=='recall-dsa.test')return route.fulfill({status:204,body:''});
    const file=url.pathname==='/'?'index.html':decodeURIComponent(url.pathname.slice(1));
    if(file.includes('..'))return route.fulfill({status:404,body:''});
    const full=path.join(root,file);
    if(!fs.existsSync(full)||!fs.statSync(full).isFile())return route.fulfill({status:404,body:''});
    let body=fs.readFileSync(full);
    if(file==='index.html')body=body.toString().replace(/<script type="module" src="[^"]*firebase-sync[^"]*"><[/]script>/,'');
    return route.fulfill({contentType:({'.html':'text/html','.js':'application/javascript','.css':'text/css','.json':'application/json'}[path.extname(file)]||'application/octet-stream'),body});
   });
   const page=await context.newPage();page.setDefaultTimeout(15000);page.on('pageerror',error=>errors.push(error.message));
   await page.goto('http://recall-dsa.test/#coding');
   await page.evaluate(()=>Object.defineProperty(navigator,'clipboard',{configurable:true,value:{writeText:async text=>window.fixtureCopied=text}}));
   await page.locator('#dsToggle')[device.touch?'tap':'click']();
   assert.equal(await page.locator('.ds-topic').count(),11);
   for(const id of topics){
    const data=JSON.parse(fs.readFileSync(path.join(root,'data/dsa',id+'-guide.json'),'utf8'));
    await page.locator('[data-nav-id="'+id+'"]')[device.touch?'tap':'click']();
    const topic=page.locator('.ds-topic[data-id="'+id+'"]'),guide=topic.locator('.dg');
    assert.equal(await guide.count(),1,id+' enriched registry preferred');
    const sections=guide.locator(':scope > .ag-section:not(.ag-private-notes)');
    assert.equal(await sections.count(),8);
    assert.equal(await guide.locator('details.ag-op-item').count(),data.operations.length);
    assert.equal(await guide.locator('.ag-pattern').count(),data.patterns.length);
    assert.equal(await guide.locator('[data-ds-copy]').count(),data.operations.length+data.fundamentals.length+data.templates.length);
    assert.equal(await guide.locator('[data-dg-target]').count(),data.patternDetails.reduce((n,item)=>n+item.templates.length,0));
    // Every major summary is a native keyboard/touch target, independently toggleable.
    for(let i=0;i<8;i++){const summary=sections.nth(i).locator(':scope > summary');if(device.touch)await summary.tap();else{await summary.focus();await page.keyboard.press('Enter');}assert.equal(await sections.nth(i).evaluate(el=>el.open),true);if(device.touch)await summary.tap();else await page.keyboard.press('Enter');assert.equal(await sections.nth(i).evaluate(el=>el.open),false);}
    await guide.locator('[data-ag-expand-all]').click();assert.equal(await sections.evaluateAll(nodes=>nodes.filter(n=>n.open).length),8);
    await guide.locator('.ag-pattern > summary').first().click();
    const link=guide.locator('[data-dg-target]').first(),target=await link.getAttribute('data-dg-target');
    await link.click();assert.equal(await page.evaluate(()=>document.activeElement.parentElement.id),target);
    const template=guide.locator('[id="'+target+'"]');assert.equal(await template.evaluate(el=>el.open),true);
    assert.equal(await template.locator('.dg-recall').evaluate(el=>el.open),false,'active-recall answer hidden');
    await template.locator('.dg-recall > summary').click();
    await template.locator('[data-ds-copy]').click();
    assert.equal(await page.evaluate(()=>window.fixtureCopied),await template.locator('.ag-code code').textContent());
    await guide.locator('.ag-op-group > summary').first().click();await guide.locator('.ag-op-item > summary').first().click();
    await guide.locator('.ag-detail > summary').first().click();
    assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+2),device.name+' '+id+' no page overflow');
    const pre=template.locator('pre');assert.equal(await pre.evaluate(el=>getComputedStyle(el).overflowX),'auto');
    await guide.locator('[data-ag-collapse-all]').click();assert.equal(await sections.evaluateAll(nodes=>nodes.filter(n=>n.open).length),0);
   }
   const ids=await page.locator('[id]').evaluateAll(nodes=>nodes.map(n=>n.id));assert.equal(ids.length,new Set(ids).size);
   // Saved chapter preferences survive refresh; a new topic never inherits another topic's state.
   await page.locator('[data-nav-id="trees"]').click();await page.locator('[data-ag-open="dg-trees-edges"]').click();
   await page.reload();await page.locator('#dsToggle').click();await page.locator('[data-nav-id="trees"]').click();assert.equal(await page.locator('#dg-trees-edges').evaluate(el=>el.open),true);
   for(const id of topics){const data=JSON.parse(fs.readFileSync(path.join(root,'data/dsa',id+'-guide.json')));await page.locator('#dsSearch').fill(data.operationExamples[0].use);assert.ok((await page.locator('[data-id="'+id+'"]').count())===1,'supplemental text searchable');}
   await page.locator('#dsSearch').fill('');await page.locator('[data-nav-id="graphs"]').click();
   fs.mkdirSync(destination,{recursive:true});await page.locator('.ds-topic[data-id="graphs"] > summary').scrollIntoViewIfNeeded();await page.screenshot({path:path.join(destination,'dsa-real-'+device.name+'.png')});
   await page.locator('[data-ag-open="dg-graphs-patterns"]').click();if(!await page.locator('#dg-graphs-pattern-0').evaluate(el=>el.open))await page.locator('#dg-graphs-pattern-0 > summary').click();await page.locator('#dg-graphs-pattern-0 > summary').scrollIntoViewIfNeeded();await page.screenshot({path:path.join(destination,'dsa-pattern-'+device.name+'.png')});
   assert.deepEqual(errors,[]);report.push({device:device.name,width:device.width,height:device.height,topics:11,result:'PASS'});await context.close();
  }
  console.log(JSON.stringify({result:'PASS',report,limits:'All requests intercepted; Firebase disabled; no physical Safari or real account testing.'},null,2));
 } finally {await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
