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
   const u=new URL(route.request().url());
   if(u.hostname!=='sorting.test')return route.fulfill({status:204,body:''});
   const file=u.pathname==='/'?'index.html':u.pathname.slice(1);
   if(file.includes('..'))return route.fulfill({status:404,body:''});
   const full=path.join(root,file);
   if(!fs.existsSync(full))return route.fulfill({status:404,body:''});
   let body=fs.readFileSync(full);
   if(file==='index.html')body=body.toString().replace(/<script type="module" src="[^"]*firebase-sync[^"]*"><\/script>/,'');
   return route.fulfill({body,contentType:({'.html':'text/html','.js':'application/javascript','.css':'text/css'}[path.extname(file)]||'text/plain')});
  });
  const page=await context.newPage(),errors=[];
  page.on('pageerror',err=>errors.push(err.message));
  await page.addInitScript(()=>{
   if(!localStorage.getItem('sort-test-seeded')){
    localStorage.setItem('recall-structures-v1',JSON.stringify([
     {id:'arrays',title:'Arrays',notes:'ORIGINAL ARRAY NOTES -- do not edit',updatedAt:'2026-11-10T00:00:00Z'},
     {id:'custom-dsa-my-notes',title:'My Custom Topic',customTopic:true,notes:'CUSTOM SAFE',updatedAt:'2026-11-10T00:00:00Z'}
    ]));
    localStorage.setItem('sort-test-seeded','yes');
   }
  });
  await page.goto('http://sorting.test/#coding');
  await page.locator('#dsToggle').click();
  const section=page.locator('[data-id="sorting"]');
  assert.equal(await section.count(),1);
  assert.match(await page.locator('#dsSummary').textContent(),/^13 revision topics/); // 12 builtins + custom
  const record=await page.evaluate(()=>window.RecallStructures().find(x=>x.id==='sorting'));
  assert.equal(record.studiedOn,'2026-11-14');
  assert.equal(record.notes,'');
  assert.equal(await section.locator('.sort-algorithm').count(),5);
  const titles=await section.locator('.sort-alg-title strong').allTextContents();
  assert.deepEqual(titles,['Insertion Sort','Selection Sort','Bubble Sort','Merge Sort','Quick Sort']);
  await page.locator('[data-nav-id="sorting"]').click();
  const insertion=section.locator('[data-sort-algorithm="insertion"]');
  assert.equal(await insertion.evaluate(el=>el.open),true);
  assert.match(await insertion.textContent(),/playing cards/i);
  assert.equal(await insertion.locator('.sort-steps li').count(),6);
  assert.match(await insertion.locator('.sort-proof').textContent(),/n\(n−1\)\/2/);
  const quick=section.locator('[data-sort-algorithm="quick"]');
  await quick.locator(':scope > summary').click();
  assert.equal(await quick.evaluate(el=>el.open),true);
  assert.match(await quick.textContent(),/reference pencil/i);
  assert.match(await quick.textContent(),/O\(n²\)/);
  assert.equal(await section.locator('.sort-table').count(),7);
  const practice=quick.locator('.sort-practice');
  await practice.locator(':scope > summary').click();
  assert.match(await practice.locator('code').textContent(),/def quick_sort/);
  await page.locator('#dsSearch').fill('sorting exam papers by score');
  assert.equal(await page.locator('.ds-topic').count(),1,'public analogy should be searchable');
  assert.equal(await page.locator('.ds-topic').getAttribute('data-id'),'sorting');
  await page.locator('#dsSearch').fill('');
  await page.locator('[data-nav-id="sorting"]').click();
  await section.locator('.ds-extra-notes > summary').click();
  await section.locator('[data-edit-id]').click();
  const privateText='  Review: I can explain pivots <5> & stable merge.\nMy own example  ';
  await section.locator('textarea[data-ds-id="sorting"]').fill(privateText);
  await section.locator('[data-edit-id]').click();
  assert.equal(await page.evaluate(()=>window.RecallStructures().find(x=>x.id==='sorting').notes),privateText);
  assert.equal(await section.locator('.ds-extra-notes script').count(),0,'private text safely escaped');
  assert.equal(await page.evaluate(()=>window.RecallStructures().find(x=>x.id==='sorting').studiedOn),'2026-11-14');
  await page.reload();
  if(await page.locator('#dsBody').isHidden())await page.locator('#dsToggle').click();
  assert.equal(await page.locator('[data-id="sorting"] textarea').inputValue(),privateText,'private text retained verbatim after reload');
  assert.equal(await page.evaluate(()=>window.RecallStructures().find(x=>x.id==='arrays').notes),'ORIGINAL ARRAY NOTES -- do not edit');
  assert.equal(await page.evaluate(()=>window.RecallStructures().find(x=>x.id==='custom-dsa-my-notes').notes),'CUSTOM SAFE');
  await page.locator('[data-nav-id="sorting"]').click();
  await page.locator('[data-id="sorting"] [data-sort-algorithm="merge"] > summary').click();
  const measure=await page.locator('[data-id="sorting"] .sort-guide').evaluate(el=>({width:el.clientWidth,scroll:el.scrollWidth}));
  assert.ok(measure.scroll<=measure.width+3,'Sorting guide overflow: '+JSON.stringify(measure));
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+4),'page horizontal overflow');
  assert.deepEqual(errors,[]);
  await context.close();
 }
 console.log('PASS: five Sorting algorithms, public analogies, complexity, code, search, private note edit/sync safety, study-date retention, mobile/iPad/desktop layout');
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exitCode=1});