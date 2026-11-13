'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {chromium}=require(process.env.DSA_PLAYWRIGHT_MODULE||'playwright');const root=path.resolve(__dirname,'..');
(async()=>{const browser=await chromium.launch({headless:true,executablePath:process.env.DSA_CHROMIUM_EXECUTABLE});try{
 for(const viewport of [{width:393,height:852},{width:834,height:1194},{width:1440,height:900}]){
 const context=await browser.newContext({viewport,acceptDownloads:true,reducedMotion:'reduce'}),errors=[];
 await context.route('**/*',route=>{const url=new URL(route.request().url());if(url.hostname!=='recall.test')return route.fulfill({status:204,body:''});const file=url.pathname==='/'?'goals.html':url.pathname.slice(1);if(file.includes('..'))return route.fulfill({status:404,body:''});const full=path.join(root,file);if(!fs.existsSync(full))return route.fulfill({status:404,body:''});let body=fs.readFileSync(full);if(file==='goals.html')body=body.toString().replace(/<script type="module" src="[^"]*firebase-sync[^"]*"><[/]script>/,'');return route.fulfill({body,contentType:({'.html':'text/html','.js':'application/javascript','.css':'text/css'}[path.extname(file)]||'text/plain')});});
 const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));
 const raw='  <img src=x onerror=alert(1)> & original  '+String.fromCharCode(10)+'Unicode é é';
 const recovery={format:'recall-full-backup',version:2,originals:{localStorage:{'recall-structures-v1':raw,'recall-sql-v1':null},cloud:{structures:[{id:'arrays',notes:raw}],histories:[{recordType:'syncBackup',versions:[{notes:'before'}]}]}}};
 await page.addInitScript(({recovery})=>{if(!localStorage.getItem('recovery-fixture')){localStorage.setItem('recall-before-restore-fixture',JSON.stringify(recovery));localStorage.setItem('recall-device-owner-v1','account-A');localStorage.setItem('recall-structures-v1',JSON.stringify([{id:'arrays',notes:'current fixture'}]));localStorage.setItem('recovery-fixture','yes')}}, {recovery});
 await page.goto('http://recall.test/');await page.locator('#settingsSection > summary').click();
 await page.locator('#recallRecoveryReview > summary').focus();await page.keyboard.press('Enter');
 assert.equal(await page.locator('#recoveryCopies option').count(),1);
 const before=await page.evaluate(()=>Object.fromEntries(Object.keys(localStorage).filter(k=>k.startsWith('recall-')).map(k=>[k,localStorage.getItem(k)])));
 await page.locator('#reviewRecoveryCopy').click();assert.deepEqual(JSON.parse(await page.locator('#recoveryOriginalDevice').textContent()),recovery.originals.localStorage);assert.equal(await page.locator('#recoveryComparison img').count(),0);assert.ok((await page.locator('#recoveryOriginalCloud').textContent()).includes('syncBackup'));
 assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+2),'no recovery mobile overflow');
 await page.locator('#downloadRecoveryCopy').click();assert.ok((await page.locator('#recoveryReviewStatus').textContent()).includes('download requested'));
 await page.locator('#closeRecoveryComparison').click();assert.equal(await page.locator('#recoveryComparison').isHidden(),true);assert.equal(await page.locator('#recoveryOriginalDevice').textContent(),'');
 await page.reload();await page.locator('#settingsSection > summary').click();await page.locator('#recallRecoveryReview > summary').click();assert.equal(await page.locator('#recoveryCopies option').count(),1);
 await page.evaluate(()=>{window.RecallCloud={user:{uid:'account-B'},sessionToken:'B:1',readAll:async options=>({structures:[{id:'remote',notes:'server only'}],options})};window.dispatchEvent(new CustomEvent('recall-cloud-status',{detail:{message:'Account differs from device owner'}}));});
 assert.equal(await page.locator('#deviceOwnerReview').isVisible(),true);assert.match(await page.locator('#deviceOwnerReviewStatus').textContent(),/Automatic sync is paused/);
 await page.locator('#exportOwnerDevice').click();assert.match(await page.locator('#recoveryReviewStatus').textContent(),/Separate device review export requested/);await page.locator('#exportOwnerCloud').click();assert.match(await page.locator('#recoveryReviewStatus').textContent(),/Separate server review export requested/);
 const after=await page.evaluate(()=>Object.fromEntries(Object.keys(localStorage).filter(k=>k.startsWith('recall-')).map(k=>[k,localStorage.getItem(k)])));assert.deepEqual(after,before,'review/export never changes records or owner');
 await page.evaluate(()=>{window.RecallCloud.user={uid:'account-A'};window.dispatchEvent(new CustomEvent('recall-cloud-status',{detail:{message:'same account'}}));});assert.equal(await page.locator('#deviceOwnerReview').isHidden(),true);
 await page.evaluate(()=>{const api=window.RecallCloud;api.user={uid:'account-B'};api.readAll=async()=>{api.sessionToken='C:2';return {structures:[]}};window.dispatchEvent(new CustomEvent('recall-cloud-status',{detail:{message:'mismatch'}}));});await page.locator('#exportOwnerCloud').click();assert.match(await page.locator('#recoveryReviewStatus').textContent(),/Account changed; export was discarded/);
 assert.deepEqual(errors,[]);await context.close();
 }
 console.log('PASS: recovery discover/reload/exact escaped compare/private export/no mutation, wrong-owner export-only flow/account-race guard, all3 responsive viewports. No Firebase.');
}finally{await browser.close()}})().catch(error=>{console.error(error);process.exitCode=1});
