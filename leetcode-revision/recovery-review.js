/* Private recovery review only. Never applies, clears, consolidates or replays records. */
(()=>{'use strict';
const host=document.getElementById('recallRecoveryReview');if(!host)return;
const $=id=>document.getElementById(id),KEYS=['recall-notes-v1','recall-sql-v1','recall-goals-habits-v1','recall-structures-v1','recall-concept-reviews-v1','recall-sync-conflicts-v1'];
const say=message=>{$('recoveryReviewStatus').textContent=message};

function refresh(){
 hideComparison();
 try{const keys=window.RecallBackupSafety?.keys();if(!keys)throw Error('Recovery reader is unavailable.');const select=$('recoveryCopies');select.replaceChildren();for(const key of keys.slice().sort().reverse()){const option=document.createElement('option');option.value=key;option.textContent=key;select.appendChild(option)}$('reviewRecoveryCopy').disabled=!keys.length;$('downloadRecoveryCopy').disabled=!keys.length;say(keys.length?keys.length+' recoverable before-restore copies on this device. Select one to inspect; nothing is automatically restored.':'No before-restore copies on this device. Copies appear only after a guarded restore creates one.');}
 catch(error){say('Recovery list unavailable: '+error.message)}
}
function compare(){
 try{const key=$('recoveryCopies').value;if(!key)throw Error('Select a recovery copy first.');const data=window.RecallBackupSafety.read(key);if(!data?.originals?.localStorage||typeof data.originals.localStorage!=='object')throw Error('This copy has no exact-original storage envelope. Download and inspect it privately.');
 const current=Object.fromEntries(KEYS.map(key=>[key,localStorage.getItem(key)]));const originals=data.originals.localStorage;
 // textContent keeps raw strings, indentation, markup and Unicode inert and exact.
 $('recoveryOriginalDevice').textContent=JSON.stringify(originals,null,2);$('recoveryCurrentDevice').textContent=JSON.stringify(current,null,2);$('recoveryOriginalCloud').textContent=JSON.stringify(data.originals.cloud??null,null,2);
 const changed=KEYS.filter(key=>originals[key]!==current[key]);$('recoveryComparison').hidden=false;say('Review only · '+changed.length+' storage keys differ from the saved originals. Exact raw strings are displayed as JSON (including null for absent values). No records were changed.');
 }catch(error){hideComparison();say('Cannot compare: '+error.message)}
}
$('refreshRecoveryCopies').addEventListener('click',refresh);$('reviewRecoveryCopy').addEventListener('click',compare);
$('downloadRecoveryCopy').addEventListener('click',()=>{try{const key=$('recoveryCopies').value;if(!key)throw Error('Select a copy first.');window.RecallBackupSafety.download(key);say('Private recovery download requested. Verify the downloaded file yourself; nothing was applied.')}catch(error){say('Download unavailable: '+error.message)}});
function hideComparison(){$('recoveryComparison').hidden=true;for(const id of ['recoveryOriginalDevice','recoveryCurrentDevice','recoveryOriginalCloud'])$(id).textContent='';}
$('recoveryCopies').addEventListener('change',hideComparison);
$('closeRecoveryComparison').addEventListener('click',()=>{hideComparison();$('reviewRecoveryCopy').focus()});
function accountReview(){
 const box=$('deviceOwnerReview');try{const owner=localStorage.getItem('recall-device-owner-v1'),user=window.RecallCloud?.user,mismatch=!!(owner&&user?.uid&&owner!==user.uid);box.hidden=!mismatch;if(mismatch)$('deviceOwnerReviewStatus').textContent='This browser belongs to a different signed-in account. Automatic sync is paused. Keep existing notes, export each side separately, and compare privately. Sign out and use the original account to resume its automatic sync. Never reset or clear browser storage to fix this.';}catch{box.hidden=false;$('deviceOwnerReviewStatus').textContent='Device ownership cannot be read. Automatic sync may be paused. Keep this page open, export device records, and review before switching accounts.';}}
async function exportSide(cloud){
 try{let payload;if(cloud){const api=window.RecallCloud,token=api?.sessionToken;if(!token)throw Error('Sign in to export the server account.');payload=await api.readAll({serverOnly:true,includeHistory:true});if(token!==api.sessionToken)throw Error('Account changed; export was discarded.');payload={format:'recall-account-review',source:'Signed-in server only',exportedAt:new Date().toISOString(),records:payload};}else{payload={format:'recall-device-review',source:'This device only',exportedAt:new Date().toISOString(),originals:{localStorage:Object.fromEntries(KEYS.map(key=>[key,localStorage.getItem(key)]))}};}
 const blob=new Blob([JSON.stringify(payload,null,2)],{type:'application/json'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=cloud?'recall-server-review.json':'recall-device-originals-review.json';a.hidden=true;document.body.appendChild(a);a.click();setTimeout(()=>{URL.revokeObjectURL(url);a.remove()},60000);say('Separate '+(cloud?'server':'device')+' review export requested. Verify and keep the file private. No records or owner marker changed.');
 }catch(error){say('Review export failed: '+error.message)}
}
$('exportOwnerDevice').addEventListener('click',()=>exportSide(false));$('exportOwnerCloud').addEventListener('click',()=>exportSide(true));$('reviewOwnerRecovery').addEventListener('click',()=>{refresh();host.open=true;$('recoveryCopies').focus()});
window.addEventListener('recall-cloud-status',accountReview);window.addEventListener('storage',accountReview);host.addEventListener('toggle',()=>{if(host.open)refresh();else hideComparison()});refresh();accountReview();
})();
