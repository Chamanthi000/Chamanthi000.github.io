/* Real Chromium smoke tests across phone, iPad, desktop and reload persistence.
   Run: npm install --no-save playwright && npx playwright install chromium
        node leetcode-revision/tests/browser-smoke.mjs */
import { chromium } from 'playwright';
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, resolve, sep } from 'node:path';
import assert from 'node:assert/strict';

const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const mime={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json','.pdf':'application/pdf'};
const server=createServer(async(req,res)=>{
 try{
  const url=new URL(req.url,'http://localhost'),name=url.pathname==='/'?'index.html':decodeURIComponent(url.pathname.slice(1));
  const path=resolve(root,name);
  if(path!==root&&!path.startsWith(root+sep)){res.writeHead(403);return res.end('Forbidden')}
  const body=await readFile(path);
  const ext=Object.keys(mime).find(x=>path.endsWith(x));
  res.writeHead(200,{'Content-Type':mime[ext]||'application/octet-stream','Cache-Control':'no-store'});
  res.end(body);
 }catch{res.writeHead(404);res.end('Not found')}
});
const waitListen=()=>new Promise(ok=>server.listen(0,'127.0.0.1',ok));
await waitListen();
const origin='http://127.0.0.1:'+server.address().port;
const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
const report=[],capture=(name,result)=>report.push({name,result});
try{
 for(const device of [{name:'iPhone',width:390,height:844},{name:'iPad',width:820,height:1180},{name:'Desktop',width:1280,height:800}]){
  const context=await browser.newContext({viewport:{width:device.width,height:device.height},isMobile:device.name==='iPhone',hasTouch:device.name==='iPhone'});
  await context.route(/^https?:\/\/(?!127\.0\.0\.1)/,route=>route.abort());
  const page=await context.newPage();
  for(const [name,path] of [['Coding','/index.html'],['Goals','/goals.html'],['SQL Patterns','/sql-pattern-guide.html'],['Big O','/complexities.html']]){
   await page.goto(origin+path,{waitUntil:'domcontentloaded'});
   const metrics=await page.evaluate(()=>({documentWidth:document.documentElement.scrollWidth,viewport:innerWidth,fontSize:parseFloat(getComputedStyle(document.body).fontSize)}));
   assert.ok(metrics.documentWidth<=metrics.viewport+6,device.name+' '+name+' overflows horizontally by '+(metrics.documentWidth-metrics.viewport)+'px');
   assert.ok(metrics.fontSize>=15,device.name+' '+name+' renders undersized body text');
   capture(device.name+' '+name+' responsive layout','PASS');
  }
  await context.close();
 }
 const context=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
 await context.route(/^https?:\/\/(?!127\.0\.0\.1)/,route=>route.abort());
 const page=await context.newPage();
 await page.goto(origin+'/index.html',{waitUntil:'domcontentloaded'});
 await page.locator('#new').click();
 await page.locator('#number').fill('999');
 await page.locator('#title').fill('Fixture problem - no user data');
 await page.locator('#save').click();
 assert.equal(await page.locator('#total').innerText(),'1');
 assert.equal(await page.locator('#solvedCount').innerText(),'0');
 assert.equal(await page.locator('#due').innerText(),'0');
 await page.reload({waitUntil:'domcontentloaded'});
 assert.equal(await page.locator('#total').innerText(),'1');
 assert.equal(await page.locator('#due').innerText(),'0');
 capture('Problem saved and refreshed without invented due count','PASS');
 await page.locator('[data-solve]').first().click();
 assert.equal(await page.locator('#solvedCount').innerText(),'1');
 await page.locator('[data-revise]').first().click();
 assert.equal(await page.locator('#revisedCount').innerText(),'1');
 await page.reload({waitUntil:'domcontentloaded'});
 assert.equal(await page.locator('#solvedCount').innerText(),'1');
 assert.equal(await page.locator('#revisedCount').innerText(),'1');
 capture('Solved and revised flags persist through refresh','PASS');
 await page.goto(origin+'/sql-pattern-guide.html',{waitUntil:'domcontentloaded'});
 await page.locator('.pattern summary').first().click();
 await page.locator('.pattern .concept-rate.remembered').first().click();
 const status=await page.locator('.pattern .concept-status').first().innerText();
 assert.ok(status.includes('Remembered'));
 await page.reload({waitUntil:'domcontentloaded'});
 await page.locator('.pattern summary').first().click();
 assert.ok((await page.locator('.pattern .concept-status').first().innerText()).includes('Remembered'));
 capture('SQL concept rating saves and refreshes','PASS');
 await page.goto(origin+'/goals.html',{waitUntil:'domcontentloaded'});
 await page.locator('#newHabit').click();
 await page.locator('#name').fill('Fixture weekly habit');
 await page.locator('#frequency').selectOption('weekly');
 await page.locator('#editor button[type=submit]').click();
 await page.reload({waitUntil:'domcontentloaded'});
 assert.ok((await page.locator('#habitsMiniCount').innerText()).includes('1'));
 await page.locator('#settingsSection > summary').click();
 assert.ok(await page.locator('#backupEverything').isVisible());
 capture('Weekly goal persists and Settings expands','PASS');
 const plan={v:1,date:'2026-11-13',tasks:[['07:00','','Wake up'],['07:00','08:00','Breakfast and skincare'],['22:00','','Sleep']]};
 await page.goto(origin+'/goals.html?dailyPlan='+encodeURIComponent(JSON.stringify(plan)),{waitUntil:'domcontentloaded'});
 assert.equal(await page.locator('#dailyImportBanner').count(),1);
 await page.locator('#dailyImportBanner button').click();
 assert.equal(await page.locator('#dailyDate').inputValue(),'2026-11-13');
 assert.equal(await page.locator('#dailyTasks .dailyRow').count(),3);
 assert.equal(await page.locator('#dailyImportBanner').count(),0);
 const savedPlan=await page.evaluate(()=>JSON.parse(localStorage.getItem('recall-goals-habits-v1')));
 assert.equal(savedPlan.habits.find(h=>h.id==='__recall_daily_2026-11-13').tasks[0].name,'Wake up');
 assert.ok(!savedPlan.habits.some(h=>h.id==='__recall_daily_template_v1'));
 await page.reload({waitUntil:'domcontentloaded'});
 await page.locator('#dailyDate').fill('2026-11-13');
 await page.locator('#dailyDate').dispatchEvent('change');
 assert.equal(await page.locator('#dailyTasks .dailyRow').count(),3);
 capture('Shared plan saves only chosen date and persists after reload','PASS');
 const invalid={v:1,date:'2026-11-31',tasks:[['07:00','','Wrong date']]};
 await page.goto(origin+'/goals.html?dailyPlan='+encodeURIComponent(JSON.stringify(invalid)),{waitUntil:'domcontentloaded'});
 assert.equal(await page.locator('#dailyImportBanner').count(),0);
 capture('Malformed shared checklist is safely rejected','PASS');
 await context.close();
 console.log(JSON.stringify({result:'PASS',checks:report.length,report},null,2));
}catch(error){
 console.error(JSON.stringify({result:'FAIL',report,error:String(error),stack:error?.stack},null,2));
 process.exitCode=1;
}finally{
 await browser.close();
 await new Promise(ok=>server.close(ok));
}
