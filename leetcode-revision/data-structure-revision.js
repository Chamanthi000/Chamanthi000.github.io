/* Recall editable data-structure notes. Never puts personal notes in public GitHub. */
(()=>{'use strict';
const KEY='recall-structures-v1',STAMP='2026-11-12T00:00:00.000Z',ARRAY_ARCHIVE_KEY='recall-arrays-legacy-archive-v1',ARRAY_OPEN_KEY='recall-arrays-open-v1',STRING_OPEN_KEY='recall-strings-open-v1',STRING_ARCHIVE_KEY='recall-strings-legacy-archive-v1',DSA_OPEN_KEY='recall-dsa-guides-open-v1',EXTRA_OPEN_KEY='recall-dsa-extra-notes-open-v1';
const presets=[{"id":"arrays","title":"Arrays","notes":""},{"id":"strings","title":"Strings","notes":""},{"id":"hash-maps","title":"Hash Maps & Sets","notes":""},{"id":"linked-lists","title":"Linked Lists","notes":""},{"id":"stacks","title":"Stacks","notes":""},{"id":"queues","title":"Queues & Deques","notes":""},{"id":"trees","title":"Trees & BSTs","notes":""},{"id":"heaps","title":"Heaps & Priority Queues","notes":""},{"id":"graphs","title":"Graphs","notes":""},{"id":"tries","title":"Tries","notes":""},{"id":"union-find","title":"Union Find","notes":""}];
const LEGACY_DEFAULTS={"strings":"1. REVERSE A STRING\n\nBuilt-in reversal: Python's [::-1]\nExample: reversed_text = text[::-1]\n\nTwo-pointer approach:\nConvert the string into a mutable sequence of characters, then swap characters from both ends moving toward the center. Use two pointers: left starts at the first character and right at the last. Swap the characters at left and right, move both pointers inward, and repeat until they meet or cross. Finally, rebuild the string from the character sequence.\n\nPython example:\nchars = list(text)\nleft, right = 0, len(chars) - 1\nwhile left < right:\n    chars[left], chars[right] = chars[right], chars[left]\n    left += 1\n    right -= 1\nresult = ''.join(chars)\n\nTime complexity: O(n), where n is the length of the string. We must visit every character to reverse the string.\nSpace: O(n) for a new Python string / mutable character list.\n\n2. PALINDROME\n\nThe key insight is that a palindrome reads the same forwards and backwards. We can use string reversal:\n• Reverse the string.\n• Compare the reversed string with the original.\n• If they're equal, it's a palindrome.\n\nAlternative: two pointers — one at the start and one at the end. Move them toward each other while comparing characters. If any pair differs, it isn't a palindrome.\n\nTime: O(n).\nSpace: O(n) for reversal, or O(1) auxiliary for a two-pointer comparison.\n\n3. ANAGRAM\n\nTwo strings are anagrams if they contain the same characters with the same frequencies, just rearranged.\n• First check if the strings have different lengths — if so, they can't be anagrams.\n• Count the frequency of each character in the first string.\n• For each character in the second string, decrement its count.\n• If we encounter a character that doesn't exist in our count or goes below zero, they're not anagrams.\n\nTime complexity: O(n) for strings of equal length (using average O(1) hash operations).\nSpace: O(k), where k is the number of distinct characters stored.\n\n4. STRING COMPRESSION\n\nExamples:\n• \"aaabbc\" → \"a3b2c1\"\n• \"aabbccdd\" → \"a2b2c2d2\"\n• \"abc\" → \"a1b1c1\"\n\nThis demonstrates the consecutive-counting pattern, a common string-processing technique. Track when characters change as you iterate through the string:\n• Handle the edge case of an empty string.\n• Initialize a counter to 1 (for the first character).\n• Iterate through the string starting from the second character.\n• If the current character equals the previous one, increment the counter.\n• If it's different, add the previous character and its count to the result, then reset the counter.\n• Don't forget to add the last group after the loop.\n\nTime: O(n), assuming efficient output joining.\nSpace: O(n) for the new compressed string.\n\nSTRING REMINDER\nPython strings are immutable, so convert them to a list before making in-place-style changes.","linked-lists":"You have a playlist with 100 songs. You want to add a new song at position 10. With an array, you must shift 90 songs one position to the right to make room. That's 90 copy operations just to insert one item. Arrays store elements in contiguous memory, so inserting in the middle requires moving everything after it.\n\nLinked lists solve this problem by storing elements differently. Instead of keeping everything in one continuous block, linked lists scatter elements throughout memory and connect them with pointers.\n\nA linked list stores elements in nodes. Each node contains two parts: the data itself and a pointer to the next node.\n\nPYTHON EXAMPLE\nclass Node:\n    def __init__(self, data):\n        self.data = data\n        self.next = None\n\n# Creating three nodes\nhead = Node(1)\nsecond = Node(2)\nthird = Node(3)\n\n# Linking them together\nhead.next = second\nsecond.next = third\n# third.next is None (null) by default\n\n# This creates: 1 -> 2 -> 3 -> None\n\nYou can access any node in a linked list by traversing from the first node to that node, but in arrays you can use an index.\n\nWHEN TO CHOOSE ARRAYS\n• You need to access elements by index frequently.\n• You're accessing elements sequentially (cache helps).\n• Memory overhead matters (linked-list nodes require additional pointers and allocation overhead).\n• You need binary search (requires sorting and random access).\n• The size is fixed or grows predictably at the end.\n\nWHEN TO CHOOSE LINKED LISTS\n• You frequently insert or delete at the beginning.\n• Size varies dramatically and unpredictably.\n• You can't allocate contiguous memory for large arrays.\n• You maintain pointers to nodes for quick modification.\n• You're building more complex structures (trees and graphs can use node-based designs).\n\nCOMPLEXITY REMINDER\n• Indexing / finding a position: O(n).\n• Add/remove at head: O(1).\n• Insert/delete after a known node: O(1).\n• Insertion at position 10 is still O(n) if you first need to traverse to find that position.","queues":"A queue is different from a regular list where you can access any position. With a queue, you only interact with the front and back. This restriction isn't a limitation — it's the point. The constraint ensures FIFO order.\n\nA queue defines what operations you can do — enqueue at the back, dequeue from the front. This makes it an abstract data type. You can implement these operations using different underlying structures like arrays or linked lists. Both maintain FIFO order, but differ in how they handle adding and removing items.\n\nTHE QUEUE CONTRACT\n• Items come out in the same order they went in.\n• You can only add to the back.\n• You can only remove from the front.\n• You can look at the front without removing it.\n\nYou can't access items in the middle. You can't remove from the back. If you want the third item, you must remove the first two items to reach it.\n\nPython tip: collections.deque supports O(1) enqueue (append), dequeue (popleft), and peek (deque[0]). Removing the first item of a Python list using pop(0) is O(n)."};
const guides={};
const topicMeta={"arrays":{"icon":"[ ]","group":"Data Structures","desc":""},"strings":{"icon":"Aa","group":"Data Structures","desc":""},"hash-maps":{"icon":"#","group":"Data Structures","desc":""},"linked-lists":{"icon":"↝","group":"Data Structures","desc":""},"stacks":{"icon":"▥","group":"Data Structures","desc":""},"queues":{"icon":"⇥","group":"Data Structures","desc":""},"trees":{"icon":"Y","group":"Data Structures","desc":""},"heaps":{"icon":"△","group":"Data Structures","desc":""},"graphs":{"icon":"◎","group":"Data Structures","desc":""},"tries":{"icon":"T","group":"Data Structures","desc":""},"union-find":{"icon":"∪","group":"Data Structures","desc":""}};
const container=document.getElementById('foundationCourse');
if(!container)return;
const style=document.createElement('style');style.textContent="\n.ds-revision{margin:0 0 17px;background:#fff;border:1px solid #dfe9df;border-radius:16px;overflow:hidden;box-shadow:0 4px 14px #285d4609}\n.ds-toggle{display:flex;align-items:center;justify-content:space-between;gap:12px;width:100%;padding:17px 20px;border:0;background:linear-gradient(110deg,#f1f7ef,#fbfdf9);text-align:left;color:#2a533d;min-height:72px}\n.ds-heading{display:flex;align-items:center;gap:12px}.ds-mark{display:grid;place-items:center;width:39px;height:39px;flex:none;border-radius:12px;background:#e0ede0;font-size:20px}.ds-toggle strong{display:block;font:800 15px 'Plus Jakarta Sans',sans-serif}.ds-toggle small{display:block;margin-top:4px;color:#708978;font-size:12px;font-weight:500}.ds-arrow{font-size:20px;transform:rotate(0);transition:transform .2s}.ds-revision.expanded .ds-arrow{transform:rotate(180deg)}\n.ds-body{padding:18px 20px 20px;border-top:1px solid #e6eee6}.ds-toolbar{display:flex;gap:10px;flex-wrap:wrap;margin-bottom:10px}.ds-search,.ds-new-title{border:1px solid #dbe6dc;border-radius:10px;padding:11px 12px;min-width:0;flex:1;font:inherit;background:#fbfdfa;outline-offset:2px}.ds-search{flex:1 1 230px}.ds-add-row{display:flex;gap:8px;align-items:center;flex:1 1 300px;min-width:0}.ds-add-row button{white-space:nowrap}.ds-list{display:grid;gap:9px;margin-top:13px}.ds-topic{border:1px solid #e2eae0;border-radius:12px;overflow:hidden;background:#fff}.ds-topic[open]{border-color:#c6dcca;box-shadow:0 3px 14px #355f4312}.ds-topic summary{display:flex;align-items:center;gap:10px;list-style:none;cursor:pointer;padding:14px 15px;min-height:49px}.ds-topic summary::-webkit-details-marker{display:none}.ds-topic summary:focus-visible,.ds-toggle:focus-visible{outline:3px solid #9ac8a7;outline-offset:-3px}.ds-topic-symbol{font-size:15px;color:#69a482}.ds-topic[open] .ds-topic-symbol{transform:rotate(90deg)}.ds-topic-name{font-weight:800;color:#31533e;flex:1}.ds-note-count{font-size:11px;color:#809487}.ds-editor{padding:0 14px 14px}.ds-note-input{display:block;width:100%;min-height:245px;max-height:650px;resize:vertical;padding:15px;border:1px solid #dce5da;border-radius:11px;font:13px/1.65 ui-monospace,SFMono-Regular,Consolas,monospace;color:#304f3b;background:#fbfcfa;white-space:pre-wrap;tab-size:4}.ds-meta{display:flex;justify-content:space-between;gap:10px;align-items:center;flex-wrap:wrap;margin-top:9px;font-size:11px;color:#7e9183}.ds-delete{border:0;background:none;color:#a24e55;text-decoration:underline;padding:5px 2px;font-size:11px}.ds-empty{font-size:12px;color:#869c8b;padding:12px}.sql .ds-revision{display:none}@media(max-width:700px){.ds-body{padding:13px}.ds-toggle{padding:14px}.ds-add-row{flex-basis:100%}.ds-add-row button{padding:11px}.ds-note-input{min-height:220px;font-size:12px}}";document.head.appendChild(style);
const panel=document.createElement('section');panel.id='dataStructureRevision';panel.className='ds-revision';
panel.innerHTML='<button class="ds-toggle" type="button" id="dsToggle" aria-expanded="false" aria-controls="dsBody"><span class="ds-heading"><span class="ds-mark" aria-hidden="true">▦</span><span><strong>Data Structure Revision</strong><small>Personal notes · editable topic notebooks · saved automatically</small></span></span><span class="ds-arrow" aria-hidden="true">⌄</span></button><div class="ds-body" id="dsBody" hidden><div class="ds-toolbar"><input class="ds-search" id="dsSearch" type="search" placeholder="Search DSA topics, patterns, code, traps…" aria-label="Search DSA notes"></div><div class="ds-meta"><span id="dsSummary">Revision topics</span><span class="ds-meta-actions"><span id="dsStatus" role="status">Saved on this device</span><button class="ds-collapse-all" type="button" id="dsCollapseAll">Collapse all</button></span></div><nav class="ds-topic-nav" id="dsTopicNav" aria-label="DSA revision topics"></nav><div class="ds-list" id="dsList"></div></div>';
container.insertAdjacentElement('afterend',panel);
const scrollBehavior=()=>window.matchMedia?.('(prefers-reduced-motion: reduce)').matches?'auto':'smooth';
function focusDestination(target){const summary=target?.querySelector(':scope > summary');if(summary){summary.focus({preventScroll:true});summary.scrollIntoView({behavior:scrollBehavior(),block:'start'});}}
panel.addEventListener('click',async e=>{
 const templateLink=e.target.closest('[data-dg-target]');
 if(templateLink){
   const guide=templateLink.closest('.dg'),target=[...guide.querySelectorAll('[id]')].find(node=>node.id===templateLink.dataset.dgTarget);
   if(target){for(let node=target;node&&node!==guide;node=node.parentElement)if(node.matches('details')){if(node.dataset.agSection)setGuideSectionOpen(node,true);else node.open=true;}focusDestination(target);}
   return;
 }
 const navigation=e.target.closest('[data-ag-open]');
 if(navigation){
   const id=navigation.dataset.agOpen;
   const guide=navigation.closest('.ag'),section=[...guide.querySelectorAll('.ag-section[data-ag-section]')].find(x=>x.dataset.agSection===id);
   if(section){setGuideSectionOpen(section,true);focusDestination(section);}
   return;
 }
 if(e.target.closest('[data-ag-expand-all]')){
   for(const section of e.target.closest('.ag').querySelectorAll('.ag-section[data-ag-section]'))setGuideSectionOpen(section,true);
   return;
 }
 if(e.target.closest('[data-ag-collapse-all]')){
   for(const section of e.target.closest('.ag').querySelectorAll('.ag-section[data-ag-section]'))setGuideSectionOpen(section,false);
   return;
 }
 if(e.target.closest('[data-ag-download]')){downloadArrayBackup();return;}
 if(e.target.closest('[data-ag-consolidate]')){await consolidateArrayNotes();return;}
 if(e.target.closest('[data-ag-restore]')){restoreArrayNotes();return;}
 if(e.target.closest('[data-sg-download]')){downloadStringBackup();return;}
 if(e.target.closest('[data-sg-consolidate]')){await consolidateStringNotes();return;}
 if(e.target.closest('[data-sg-restore]')){restoreStringNotes();return;}
 const btn=e.target.closest('[data-ds-copy]');
 if(!btn)return;
 const code=btn.closest('.ds-code-card')?.querySelector('code')?.textContent||'';
 if(!code)return;
 try{
   await navigator.clipboard.writeText(code);
   const old=btn.textContent;btn.textContent='Copied ✓';
   setTimeout(()=>btn.textContent=old,1200);
 }catch{btn.textContent='Copy unavailable';btn.setAttribute('aria-label','Copy unavailable. Select the code to copy manually.');}
});
const $=id=>document.getElementById(id),escape=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const arrayOpenSections=new Set((()=>{try{const value=JSON.parse(localStorage.getItem(ARRAY_OPEN_KEY)||'[]');return Array.isArray(value)?value.filter(x=>typeof x==='string'&&/^ag-[a-z-]+$/.test(x)):[]}catch{return []}})());
function storeArrayOpen(){try{localStorage.setItem(ARRAY_OPEN_KEY,JSON.stringify([...arrayOpenSections]))}catch{}}
const stringOpenSections=new Set((()=>{try{const items=JSON.parse(localStorage.getItem(STRING_OPEN_KEY)||'[]');return Array.isArray(items)?items.filter(id=>typeof id==='string'&&/^sg-[a-z-]+$/.test(id)):[]}catch{return []}})());
function storeStringOpen(){try{localStorage.setItem(STRING_OPEN_KEY,JSON.stringify([...stringOpenSections]))}catch{}}
const dsaGuide=id=>Object.prototype.hasOwnProperty.call(window.RecallDSAGuides||{},id)?window.RecallDSAGuides[id]:null;
const dsaSectionNames=['operations','fundamentals','patterns','recognize','edges','interview','memorize','practice'];
const validDSASections=new Set(presets.filter(topic=>!['arrays','strings'].includes(topic.id)&&dsaGuide(topic.id)?.html).flatMap(topic=>dsaSectionNames.map(name=>'dg-'+topic.id+'-'+name)));
const DSA_NESTED_KEY='recall-dsa-guides-nested-v1';
const nestedPreferences=(()=>{try{const value=JSON.parse(localStorage.getItem(DSA_NESTED_KEY)||'{}');return value&&typeof value==='object'&&!Array.isArray(value)?value:{}}catch{return {}}})();
function prepareNestedPreferences(view){
 for(const guide of view.querySelectorAll('.dg[data-dg-topic]')){
  const topic=guide.dataset.dgTopic,known=presets.some(item=>item.id===topic);if(!known)continue;
  const nodes=[...guide.querySelectorAll('details:not(.ag-section)')];
  const saved=Array.isArray(nestedPreferences[topic])?nestedPreferences[topic]:[];
  const occurrences=new Map();
  for(const node of nodes){const label=node.querySelector(':scope > summary')?.textContent.trim()||'',base=node.id||label;const count=occurrences.get(base)||0;occurrences.set(base,count+1);const key=node.id||base+'#'+count;node.dataset.dgNested=key;node.open=saved.includes(key);}
 }
}
function saveNestedPreference(node){
 const guide=node.closest('.dg[data-dg-topic]');if(!guide||!panel.contains(node)||!node.hasAttribute('data-dg-nested'))return;
 const topic=guide.dataset.dgTopic,nodes=[...guide.querySelectorAll('details[data-dg-nested]')];
 nestedPreferences[topic]=nodes.filter(item=>item.open).map(item=>item.dataset.dgNested);
 const safe=Object.fromEntries(presets.filter(item=>Array.isArray(nestedPreferences[item.id])).map(item=>[item.id,nestedPreferences[item.id].filter(key=>typeof key==='string'&&key.length<2000).slice(0,2000)]));
 try{localStorage.setItem(DSA_NESTED_KEY,JSON.stringify(safe))}catch{}
}
// View-only preferences: opening a panel never modifies note fields or timestamps.
const extraOpenTopics=new Set((()=>{try{const items=JSON.parse(localStorage.getItem(EXTRA_OPEN_KEY)||'[]');return Array.isArray(items)?items.filter(id=>presets.some(topic=>topic.id===id)):[]}catch{return []}})());
function storeExtraOpen(){try{localStorage.setItem(EXTRA_OPEN_KEY,JSON.stringify([...extraOpenTopics]))}catch{}}
const dsaOpenSections=new Set((()=>{try{const items=JSON.parse(localStorage.getItem(DSA_OPEN_KEY)||'[]');return Array.isArray(items)?items.filter(id=>validDSASections.has(id)):[]}catch{return []}})());
function storeDSAOpen(){try{localStorage.setItem(DSA_OPEN_KEY,JSON.stringify([...dsaOpenSections]))}catch{}}
function guideSectionState(id){
 if(validDSASections.has(id))return [dsaOpenSections,storeDSAOpen];
 if(/^sg-[a-z-]+$/.test(id))return [stringOpenSections,storeStringOpen];
 if(/^ag-[a-z-]+$/.test(id))return [arrayOpenSections,storeArrayOpen];
 return null;
}
function setGuideSectionOpen(section,open){
 const state=guideSectionState(section.dataset.agSection);if(!state)return;
 section.open=open;
 if(open)state[0].add(section.dataset.agSection);else state[0].delete(section.dataset.agSection);
 state[1]();
}
panel.addEventListener('toggle',e=>{
 const section=e.target;
 if(section?.matches?.('.ds-extra-notes[data-extra-id]')){if(!panel.contains(section))return;if(section.open)extraOpenTopics.add(section.dataset.extraId);else extraOpenTopics.delete(section.dataset.extraId);storeExtraOpen();return;}
 if(section?.matches?.('.dg details[data-dg-nested]')){saveNestedPreference(section);return;}
 if(!section?.matches?.('.ag > details.ag-section[data-ag-section], .ds-extra-notes .ag-private-notes[data-ag-section]'))return;
 // Ignore pending toggle events from a view replaced by search/cloud rendering.
 if(!panel.contains(section))return;
 const state=guideSectionState(section.dataset.agSection);if(!state)return;
 const [set,store]=state;
 if(section.open)set.add(section.dataset.agSection);
 else set.delete(section.dataset.agSection);
 store();
},true);
const read=()=>{try{const p=JSON.parse(localStorage.getItem(KEY)||'[]');return Array.isArray(p)?p.filter(x=>x&&typeof x.id==='string'&&typeof x.title==='string'):[]}catch{return []}};
let records=read(),cloudTimer=null;const editingIds=new Set();
for(const d of presets)if(!records.some(x=>x.id===d.id))records.push({...d,createdAt:STAMP,updatedAt:STAMP});
const presetRank=new Map(presets.map((p,i)=>[p.id,i]));
// Fixed public topic scope; retain every hidden record for private sync/backups.
const isVisibleTopic=item=>presetRank.has(item.id)&&!item.deleted;
const sorted=items=>items.slice().sort((a,b)=>{const ar=presetRank.has(a.id)?presetRank.get(a.id):9999,br=presetRank.has(b.id)?presetRank.get(b.id):9999;return ar-br||a.title.localeCompare(b.title)});
const personalNotes=item=>{
 const arrayMigrated=item?.id==='arrays'&&item?.arrayMergeVersion===1;
 const stringMigrated=item?.id==='strings'&&item?.stringMergeVersion===1;
 const notes=String(arrayMigrated?item.arrayIntegratedNotes||'':stringMigrated?item.stringIntegratedNotes||'':item?.notes||'');
 return LEGACY_DEFAULTS[item?.id]&&notes===LEGACY_DEFAULTS[item.id]?'':notes;
};
const preservedArrayMarkup=(item,personal)=>{
 const migrated=item?.arrayMergeVersion===1;
 const privateOpen=arrayOpenSections.has('ag-private')?' open':'';
 const privateHtml=personal?'<details class="ag-section ag-private-notes" data-ag-section="ag-private"'+privateOpen+'><summary class="ag-section-toggle"><div class="ag-section-head"><span class="ag-kicker">PRIVATE · SAVED ON YOUR ACCOUNT</span><h3>Your personal Arrays notes · preserved verbatim</h3><p>The full text is retained in this guide. Review it against the reference; use Edit my notes to make changes.</p></div><span class="ag-section-chevron" aria-hidden="true">⌄</span></summary><div class="ag-section-content"><div class="ds-personal-notes">'+readable(personal)+'</div><details class="ag-raw-archive"><summary><strong>View exact saved text (unformatted)</strong></summary><pre>'+escape(personal)+'</pre></details>'+(migrated&&item.arrayLegacyBackup&&item.arrayLegacyBackup!==personal?'<details class="ag-raw-archive"><summary><strong>View original pre-consolidation archive</strong></summary><pre>'+escape(item.arrayLegacyBackup)+'</pre></details>':'')+'</div></details>':'';
 const manager=personal&&!migrated?'<div class="ag-consolidate"><strong>Safely consolidate your old Arrays notes</strong><p>Your original text is shown in the section above, without being added to public GitHub. The reference guide cannot automatically prove every old detail is duplicated. Review before moving it out of the old notes field; an archive and reversible copy will be kept.</p><div class="ag-consolidate-actions"><button type="button" data-ag-download>Download original notes</button><button type="button" data-ag-consolidate>Archive & consolidate old notes</button></div></div>':migrated?'<div class="ag-consolidate is-done"><strong>Personal notes consolidated</strong><p>The old notes field is clear. Every original character remains in your private additions and an archived copy. You can undo this.</p><div class="ag-consolidate-actions"><button type="button" data-ag-download>Download archive</button><button type="button" data-ag-restore>Restore old notes field</button></div></div>':'<p class="ag-empty-private">No existing personal Arrays notes found on this device yet. If you saved notes on another device, sign in with the same Google account to load them. Nothing has been deleted.</p>';
 return privateHtml+manager;
};
const preservedStringMarkup=(item,personal)=>{
 const migrated=item?.stringMergeVersion===1;
 const privateOpen=stringOpenSections.has('sg-private')?' open':'';
 const privateHtml=personal?'<details class="ag-section ag-private-notes sg-private-notes" data-ag-section="sg-private"'+privateOpen+'><summary class="ag-section-toggle"><div class="ag-section-head"><span class="ag-kicker">PRIVATE · SAVED ON YOUR ACCOUNT</span><h3>Your personal Strings notes · preserved verbatim</h3><p>The full text is retained in this guide. Review it against the reference; use Edit my notes to make changes.</p></div><span class="ag-section-chevron" aria-hidden="true">⌄</span></summary><div class="ag-section-content"><div class="ds-personal-notes">'+readable(personal)+'</div><details class="ag-raw-archive"><summary><strong>View exact saved text (unformatted)</strong></summary><pre>'+escape(personal)+'</pre></details>'+(migrated&&item.stringLegacyBackup&&item.stringLegacyBackup!==personal?'<details class="ag-raw-archive"><summary><strong>View original pre-consolidation archive</strong></summary><pre>'+escape(item.stringLegacyBackup)+'</pre></details>':'')+'</div></details>':'';
 const manager=personal&&!migrated?'<div class="ag-consolidate"><strong>Safely consolidate your old Strings notes</strong><p>Your original text is shown in the section above, without being added to public GitHub. The reference guide cannot automatically prove every old detail is duplicated. Review before moving it out of the old notes field; an archive and reversible copy will be kept.</p><div class="ag-consolidate-actions"><button type="button" data-sg-download>Download original notes</button><button type="button" data-sg-consolidate>Archive & consolidate old notes</button></div></div>':migrated?'<div class="ag-consolidate is-done"><strong>Personal notes consolidated</strong><p>The old notes field is clear. Every original character remains in your private additions and an archived copy. You can undo this.</p><div class="ag-consolidate-actions"><button type="button" data-sg-download>Download archive</button><button type="button" data-sg-restore>Restore old notes field</button></div></div>':'<p class="ag-empty-private">No existing personal Strings notes found on this device yet. If you saved notes on another device, sign in with the same Google account to load them. Nothing has been deleted.</p>';
 return privateHtml+manager;
};
const topicGuide=item=>String(dsaGuide(item?.id)?.html||guides[item?.id]||'');
const hasRevisionGuide=item=>!!(item.id==='arrays'&&window.RecallArrayGuide?.html||item.id==='strings'&&window.RecallStringGuide?.html||dsaGuide(item.id)?.html);
function renderTopic(item){
 const isArrayGuide=item?.id==='arrays'&&!!window.RecallArrayGuide?.html;
 const isStringGuide=item?.id==='strings'&&!!window.RecallStringGuide?.html;
 const legacyGuide=isArrayGuide||isStringGuide;
 const generatedGuide=!!dsaGuide(item?.id)?.html;
 const customGuide=legacyGuide||generatedGuide;
 let core=generatedGuide?dsaGuide(item.id).html:isArrayGuide?window.RecallArrayGuide.html:isStringGuide?window.RecallStringGuide.html:topicGuide(item);
 // Keep the legacy identity/classes for original browser/API consumers while enriched sections use dg IDs.
 if(generatedGuide&&legacyGuide){const prefix=isArrayGuide?'ag-':'sg-';core=core.replace('class="ag dg"','class="ag dg'+(isStringGuide?' sg':'')+'"');for(const name of dsaSectionNames){const from='dg-'+item.id+'-'+name,to=prefix+name;core=core.replaceAll('"'+from+'"','"'+to+'"').replaceAll('"'+from+'-heading"','"'+to+'-heading"');}}
 if(isStringGuide&&!generatedGuide)core=core.replaceAll('ag-pattern-','sg-pattern-');
 const personal=personalNotes(item);
 const opened=customGuide?core.replace(/<details class="ag-section" data-ag-section="([a-z-]+)"[^>]*>/g,(all,id)=>guideSectionState(id)?.[0].has(id)?all.replace('>',' open>'):all):core;
 const finalGuide=customGuide?opened:readable(core);
 const coreHtml=core?'<section class="ds-core-guide"><div class="ds-guide-kicker">REVISE FROM MEMORY</div>'+finalGuide+'</section>':'';
 return coreHtml;
}
function renderPersonalNotes(item){
 const personal=personalNotes(item);
 if(item.id==='arrays')return preservedArrayMarkup(item,personal);
 if(item.id==='strings')return preservedStringMarkup(item,personal);
 const generatedGuide=!!dsaGuide(item.id)?.html;
 const personalHtml=personal?'<section class="ds-personal-notes"><div class="ds-guide-kicker">YOUR SAVED NOTES</div>'+(generatedGuide?'<pre class="dg-private-text">'+escape(personal)+'</pre>':readable(personal))+'</section>':'';
 return personalHtml||'<p class="ag-empty-private">No extra notes yet. Add your own reminders, examples, and mistakes here.</p>';
}
function readable(notes){
 const lines=String(notes||'').replace(/\r\n?/g,'\n').split('\n'),parts=[];
 let paragraph=[],bullets=[],code=[],sectionOpen=false,currentClass='is-detail';
 const majorHeadings=new Set([
  'RECALL FIRST','ONE-MINUTE CHEATSHEET','MENTAL MODEL','PYTHON OPERATIONS','PYTHON TOOLKIT',
  'RECOGNITION CLUES','CORE PATTERNS','TEMPLATE BANK','COMPLEXITY TO SAY','COMPLEXITY SNAPSHOT',
  'COMMON TRAPS','MUST-SOLVE PRACTICE','INTERVIEW NARRATION','SELF-TEST'
 ]);
 const inlineBigO=value=>escape(value).replace(/\bO\([^)]*\)/g,m=>'<span class="ds-big-o">'+m+'</span>');
 const sectionClass=text=>{
   if(text==='RECALL FIRST')return 'is-recall is-quick';
   if(text==='ONE-MINUTE CHEATSHEET')return 'is-cheatsheet is-quick';
   if(text==='SELF-TEST')return 'is-selftest is-quick';
   if(text==='MENTAL MODEL')return 'is-model';
   if(text==='PYTHON OPERATIONS'||text==='PYTHON TOOLKIT')return 'is-functions is-quick';
   if(text==='RECOGNITION CLUES')return 'is-clues is-quick';
   if(text==='CORE PATTERNS')return 'is-patterns is-quick';
   if(text==='TEMPLATE BANK')return 'is-template is-quick';
   if(text==='COMPLEXITY TO SAY'||text==='COMPLEXITY SNAPSHOT')return 'is-complexity is-quick';
   if(text==='COMMON TRAPS')return 'is-traps is-quick';
   if(text==='MUST-SOLVE PRACTICE')return 'is-practice is-quick';
   if(text==='INTERVIEW NARRATION')return 'is-narration';
   return 'is-detail';
 };
 const kindLabel=cls=>{
   if(cls.includes('is-recall'))return 'Recall';
   if(cls.includes('is-cheatsheet'))return '60 sec';
   if(cls.includes('is-model'))return 'Understand';
   if(cls.includes('is-functions'))return 'Functions';
   if(cls.includes('is-clues'))return 'Recognize';
   if(cls.includes('is-patterns'))return 'Patterns';
   if(cls.includes('is-template'))return 'Code';
   if(cls.includes('is-complexity'))return 'Big-O';
   if(cls.includes('is-traps'))return 'Watch out';
   if(cls.includes('is-practice'))return 'Practice';
   if(cls.includes('is-narration'))return 'Interview';
   if(cls.includes('is-selftest'))return 'Test yourself';
   return 'Deep dive';
 };
 const renderBullets=()=>{
   if(!bullets.length)return;
   if(currentClass.includes('is-functions')){
     parts.push('<div class="ds-operation-list">'+bullets.map(s=>{
       const chunks=s.split(/\s+—\s+/);
       const first=chunks.shift()||'';
       const complexity=chunks.length&&/\bO\(/.test(chunks[chunks.length-1])?chunks.pop():'';
       const meaning=chunks.join(' — ');
       return '<div class="ds-operation-row"><code>'+escape(first)+'</code><span>'+inlineBigO(meaning)+'</span><b>'+inlineBigO(complexity)+'</b></div>';
     }).join('')+'</div>');
   } else if(currentClass.includes('is-clues')){
     parts.push('<div class="ds-clue-list">'+bullets.map(s=>{
       const split=s.split(/\s*→\s*/);
       return '<div class="ds-clue"><span>'+inlineBigO(split.shift()||'')+'</span>'+(split.length?'<b>'+inlineBigO(split.join(' → '))+'</b>':'')+'</div>';
     }).join('')+'</div>');
   } else if(currentClass.includes('is-recall')||currentClass.includes('is-selftest')){
     const icon=currentClass.includes('is-selftest')?'✓':'?';
     parts.push('<div class="ds-question-list">'+bullets.map(s=>'<div class="ds-question"><span>'+icon+'</span><p>'+inlineBigO(s)+'</p></div>').join('')+'</div>');
   } else if(currentClass.includes('is-cheatsheet')){
     parts.push('<div class="ds-cheat-grid">'+bullets.map(s=>'<div class="ds-cheat-item"><span>•</span><p>'+inlineBigO(s)+'</p></div>').join('')+'</div>');
   } else if(currentClass.includes('is-complexity')){
     parts.push('<div class="ds-metric-list">'+bullets.map(s=>{
       const chunks=s.split(/\s+—\s+/);
       const label=chunks.shift()||s, value=chunks.join(' — ');
       return '<div class="ds-metric-row"><span>'+inlineBigO(label)+'</span>'+(value?'<b>'+inlineBigO(value)+'</b>':'')+'</div>';
     }).join('')+'</div>');
   } else if(currentClass.includes('is-traps')){
     parts.push('<div class="ds-warning-list">'+bullets.map(s=>'<div class="ds-warning-row"><span>!</span><p>'+inlineBigO(s)+'</p></div>').join('')+'</div>');
   } else if(currentClass.includes('is-practice')){
     parts.push('<div class="ds-practice-list">'+bullets.map((s,i)=>{
       const chunks=s.split(/\s+—\s+/),name=chunks.shift()||s,why=chunks.join(' — ');
       return '<div class="ds-practice-row"><span>'+(i+1)+'</span><div><b>'+escape(name)+'</b>'+(why?'<p>'+inlineBigO(why)+'</p>':'')+'</div></div>';
     }).join('')+'</div>');
   } else if(currentClass.includes('is-patterns')){
     parts.push('<div class="ds-pattern-list">'+bullets.map(s=>'<div class="ds-pattern-row"><span>→</span><p>'+inlineBigO(s)+'</p></div>').join('')+'</div>');
   } else {
     parts.push('<ul>'+bullets.map(s=>'<li>'+inlineBigO(s)+'</li>').join('')+'</ul>');
   }
   bullets=[];
 };
 const flushParagraph=()=>{if(paragraph.length){parts.push('<p>'+inlineBigO(paragraph.join(' '))+'</p>');paragraph=[]}};
 const flushCode=()=>{if(code.length){parts.push('<div class="ds-code-card"><div class="ds-code-bar"><span>Python template</span><button type="button" data-ds-copy>Copy</button></div><pre><code>'+escape(code.join('\n'))+'</code></pre></div>');code=[]}};
 const flush=()=>{flushParagraph();renderBullets();flushCode()};
 const openSection=text=>{
   if(sectionOpen)parts.push('</section>');
   currentClass=sectionClass(text);
   parts.push('<section class="ds-guide-block '+currentClass+'"><div class="ds-section-head"><span class="ds-section-kind">'+kindLabel(currentClass)+'</span><h4>'+escape(text)+'</h4></div>');
   sectionOpen=true;
 };
 for(const value of lines){
   const text=value.trim();
   if(!text){flush();continue}
   const upper=/^[A-Z][A-Z0-9 /&:().+\-]{3,}$/.test(text);
   const fact=/^(Time(?: complexity)?|Space(?: complexity)?|Complexity|Key insight|Interview tip|Watch(?: out)?|Reminder)\s*:\s*(.+)$/i.exec(text);
   const example=/^(Example|Examples|Python example)\s*:\s*(.*)$/i.exec(text);
   const bullet=/^(?:[•*\-]\s+)(.+)$/.exec(text);
   const isCode=/^(?:\s{2,}(?![•*\-])|class\s|def\s|while\s|if\s|elif\s|else:|for\s|from\s|import\s|return\s|#\s|@\w+|[A-Za-z_]\w*\s*=|[A-Za-z_]\w*\.[A-Za-z_]\w*\(|[A-Za-z_]\w*\[[^\]]+\]\s*=)/.test(value);
   if(upper&&majorHeadings.has(text)){flush();openSection(text)}
   else if(upper){flush();if(!sectionOpen)openSection('MENTAL MODEL');parts.push('<h5 class="ds-subhead">'+escape(text)+'</h5>')}
   else if(fact){flush();parts.push('<div class="ds-fact"><strong>'+escape(fact[1])+'</strong><span>'+inlineBigO(fact[2])+'</span></div>')}
   else if(example){flush();parts.push('<div class="ds-example"><strong>'+escape(example[1])+'</strong>'+(example[2]?'<span>'+inlineBigO(example[2])+'</span>':'')+'</div>')}
   else if(bullet){flushParagraph();flushCode();bullets.push(bullet[1])}
   else if(isCode){flushParagraph();renderBullets();code.push(value)}
   else{renderBullets();flushCode();paragraph.push(text)}
 }
 flush();if(sectionOpen)parts.push('</section>');
 return parts.join('')||'<p class="ds-no-notes">No notes yet. Select <strong>Edit notes</strong> to write your first concept.</p>';
}

function arrayRecord(){return records.find(x=>x.id==='arrays'&&!x.deleted)}
function downloadArrayBackup(){
 const item=arrayRecord();if(!item)return;
 const content=JSON.stringify({format:'recall-array-notes-backup',version:1,createdAt:new Date().toISOString(),record:item},null,2);
 try{
   const blob=new Blob([content],{type:'application/json'});
   const url=URL.createObjectURL(blob),a=document.createElement('a');
   a.href=url;a.download='recall-arrays-saved-notes-'+new Date().toISOString().slice(0,10)+'.json';
   document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),30000);
   $('dsStatus').textContent='Backup file prepared · Keep it somewhere private';
 }catch(e){$('dsStatus').textContent='⚠ Download unavailable · Your existing notes were not changed';}
}
async function consolidateArrayNotes(){
 const item=arrayRecord();if(!item||item.arrayMergeVersion===1)return;
 const existing=String(item.notes||'');if(!existing.trim()){$('dsStatus').textContent='No old Arrays notes to consolidate';return;}
 const user=window.RecallCloud?.user;
 if(user&&typeof window.RecallCloud.readAll==='function'){
   try{
     const cloud=await window.RecallCloud.readAll();
     const remote=(cloud.structures||[]).find(x=>x.id==='arrays');
     if(remote&&(String(remote.updatedAt||'')>String(item.updatedAt||'')||
       (String(remote.updatedAt||'')===String(item.updatedAt||'')&&String(remote.notes||'')!==existing))){
       $('dsStatus').textContent='⚠ Newer or different cloud notes detected · Refresh and review before consolidating';
       return;
     }
   }catch(e){$('dsStatus').textContent='⚠ Cannot verify latest cloud notes · No changes made';return;}
 }
 if(!confirm('Archive and consolidate old Arrays notes? The entire original text will remain inside the new guide and in a recoverable archive. Your old notes field will be cleared, but no text will be discarded. Download a backup first if you want an extra copy.'))return;
 const archived={version:1,archivedAt:new Date().toISOString(),notes:existing,record:{...item}};
 try{
   const old=JSON.parse(localStorage.getItem(ARRAY_ARCHIVE_KEY)||'[]');
   const all=(Array.isArray(old)?old:[]).concat([archived]).slice(-10);
   localStorage.setItem(ARRAY_ARCHIVE_KEY,JSON.stringify(all));
   const verified=JSON.parse(localStorage.getItem(ARRAY_ARCHIVE_KEY)||'[]');
   if(verified.at(-1)?.notes!==existing)throw Error('Backup did not verify');
 }catch(e){$('dsStatus').textContent='⚠ Could not verify backup · Old notes unchanged';return;}
 const before={...item};
 item.arrayIntegratedNotes=existing;
 item.arrayLegacyBackup=existing;
 item.arrayMergeVersion=1;
 item.notes='';
 item.updatedAt=new Date().toISOString();
 if(!saveLocal()){
   Object.keys(item).forEach(k=>delete item[k]);Object.assign(item,before);
   $('dsStatus').textContent='⚠ Save failed · Original notes restored in memory';
   return;
 }
 $('dsStatus').textContent='✓ Old notes field archived · All text preserved in Arrays guide';
 cloudSend();render();
}
function restoreArrayNotes(){
 const item=arrayRecord();if(!item||item.arrayMergeVersion!==1)return;
 if(!confirm('Restore the previous Arrays notes field? Your archived copy remains available.'))return;
 const prev={...item};
 item.notes=String(item.arrayIntegratedNotes||item.arrayLegacyBackup||'');
 item.arrayMergeVersion=0;
 item.updatedAt=new Date().toISOString();
 if(!saveLocal()){Object.keys(item).forEach(k=>delete item[k]);Object.assign(item,prev);return;}
 $('dsStatus').textContent='✓ Original Arrays notes field restored';
 cloudSend();render();
}

function stringRecord(){return records.find(x=>x.id==='strings'&&!x.deleted)}
function downloadStringBackup(){
 const item=stringRecord();if(!item)return;
 const content=JSON.stringify({format:'recall-string-notes-backup',version:1,createdAt:new Date().toISOString(),record:item},null,2);
 try{
   const blob=new Blob([content],{type:'application/json'});
   const url=URL.createObjectURL(blob),a=document.createElement('a');
   a.href=url;a.download='recall-strings-saved-notes-'+new Date().toISOString().slice(0,10)+'.json';
   document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),30000);
   $('dsStatus').textContent='Backup file prepared · Keep it somewhere private';
 }catch(e){$('dsStatus').textContent='⚠ Download unavailable · Your existing notes were not changed';}
}
async function consolidateStringNotes(){
 const item=stringRecord();if(!item||item.stringMergeVersion===1)return;
 const existing=String(item.notes||'');if(!existing.trim()){$('dsStatus').textContent='No old Strings notes to consolidate';return;}
 const user=window.RecallCloud?.user;
 if(user&&typeof window.RecallCloud.readAll==='function'){
   try{
     const cloud=await window.RecallCloud.readAll();
     const remote=(cloud.structures||[]).find(x=>x.id==='strings');
     if(remote&&(String(remote.updatedAt||'')>String(item.updatedAt||'')||
       (String(remote.updatedAt||'')===String(item.updatedAt||'')&&String(remote.notes||'')!==existing))){
       $('dsStatus').textContent='⚠ Newer or different cloud notes detected · Refresh and review before consolidating';
       return;
     }
   }catch(e){$('dsStatus').textContent='⚠ Cannot verify latest cloud notes · No changes made';return;}
 }
 if(!confirm('Archive and consolidate old Strings notes? The entire original text will remain inside the new guide and in a recoverable archive. Your old notes field will be cleared, but no text will be discarded. Download a backup first if you want an extra copy.'))return;
 const archived={version:1,archivedAt:new Date().toISOString(),notes:existing,record:{...item}};
 try{
   const old=JSON.parse(localStorage.getItem(STRING_ARCHIVE_KEY)||'[]');
   const all=(Array.isArray(old)?old:[]).concat([archived]).slice(-10);
   localStorage.setItem(STRING_ARCHIVE_KEY,JSON.stringify(all));
   const verified=JSON.parse(localStorage.getItem(STRING_ARCHIVE_KEY)||'[]');
   if(verified.at(-1)?.notes!==existing)throw Error('Backup did not verify');
 }catch(e){$('dsStatus').textContent='⚠ Could not verify backup · Old notes unchanged';return;}
 const before={...item};
 item.stringIntegratedNotes=existing;
 item.stringLegacyBackup=existing;
 item.stringMergeVersion=1;
 item.notes='';
 item.updatedAt=new Date().toISOString();
 if(!saveLocal()){
   Object.keys(item).forEach(k=>delete item[k]);Object.assign(item,before);
   $('dsStatus').textContent='⚠ Save failed · Original notes restored in memory';
   return;
 }
 $('dsStatus').textContent='✓ Old notes field archived · All text preserved in Strings guide';
 cloudSend();render();
}
function restoreStringNotes(){
 const item=stringRecord();if(!item||item.stringMergeVersion!==1)return;
 if(!confirm('Restore the previous Strings notes field? Your archived copy remains available.'))return;
 const prev={...item};
 item.notes=String(item.stringIntegratedNotes||item.stringLegacyBackup||'');
 item.stringMergeVersion=0;
 item.updatedAt=new Date().toISOString();
 if(!saveLocal()){Object.keys(item).forEach(k=>delete item[k]);Object.assign(item,prev);return;}
 $('dsStatus').textContent='✓ Original Strings notes field restored';
 cloudSend();render();
}

function saveLocal(){try{localStorage.setItem(KEY,JSON.stringify(records));return true}catch{$('dsStatus').textContent='⚠ Device storage unavailable';return false}}
saveLocal();
window.RecallStructures=()=>records;
function cloudSend(){window.dispatchEvent(new CustomEvent('recall-cloud-local',{detail:{kind:'structures',items:records}}))}
function persist(){if(!saveLocal())return;$('dsStatus').textContent='✓ Saved on device';clearTimeout(cloudTimer);cloudTimer=setTimeout(cloudSend,450)}
function render(preferredOpenId){
const active=document.activeElement,focusId=active?.dataset?.dsId,selection=focusId&&typeof active.selectionStart==='number'?[active.selectionStart,active.selectionEnd]:null;
const openId=typeof preferredOpenId==='string'?preferredOpenId:document.querySelector('.ds-topic[open]')?.dataset.id||'';
const q=$('dsSearch').value.trim().toLowerCase();
const show=sorted(records.filter(x=>isVisibleTopic(x)&&(x.title.toLowerCase().includes(q)||personalNotes(x).toLowerCase().includes(q)||(x.id==='arrays'&&String(window.RecallArrayGuide?.searchText||'').toLowerCase().includes(q))||(x.id==='strings'&&String(window.RecallStringGuide?.searchText||'').toLowerCase().includes(q))||String(dsaGuide(x.id)?.searchText||'').toLowerCase().includes(q))));
const allItems=sorted(records.filter(isVisibleTopic)),allCount=allItems.length,filled=allItems.filter(x=>personalNotes(x).trim()).length;
$('dsSummary').textContent=allCount+' data structures · '+filled+' with personal notes';
const groups=['Data Structures'];
$('dsTopicNav').innerHTML=allItems.map(item=>'<button class="ds-topic-chip '+(personalNotes(item).trim()?'has-notes':'')+'" type="button" data-nav-id="'+escape(item.id)+'">'+escape(item.title)+'</button>').join('');
$('dsList').innerHTML=show.map(item=>'<details class="ds-topic" data-concept-id="ds:'+escape(item.id)+'" data-id="'+escape(item.id)+'" '+(openId===item.id?'open':'')+'><summary><span class="ds-topic-symbol" aria-hidden="true">›</span><span class="ds-topic-name">'+escape(item.title)+'</span><span class="ds-note-count">'+(hasRevisionGuide(item)?'Revision guide'+(personalNotes(item).trim()?' + notes':''):(personalNotes(item).trim()?'Has notes':'Add notes'))+'</span></summary><div class="ds-editor"><div class="ds-readview" data-read-id="'+escape(item.id)+'"></div><div class="ds-meta ds-topic-review"></div><details class="ds-extra-notes ag" data-extra-id="'+escape(item.id)+'" id="ds-extra-notes-'+escape(item.id)+'" '+(extraOpenTopics.has(item.id)||editingIds.has(item.id)?'open':'')+'><summary class="ag-section-toggle"><div class="ag-section-head"><span class="ag-kicker">YOUR PERSONAL NOTEBOOK</span><h3>Extra notes</h3><p>Your reminders, examples, and mistakes for '+escape(item.title)+'.</p></div><span class="ag-section-chevron" aria-hidden="true">⌄</span></summary><div class="ag-section-content"><div class="ds-extra-readview" data-notes-read-id="'+escape(item.id)+'"></div><textarea class="ds-note-input" data-ds-id="'+escape(item.id)+'" aria-label="Notes for '+escape(item.title)+'" placeholder="Add your own revision notes here…" spellcheck="false"></textarea><div class="ds-meta"><button class="ds-edit-toggle btn secondary small" type="button" data-edit-id="'+escape(item.id)+'">Edit notes</button><span>Edits save automatically on this device. Sign in to sync.</span></div></div></details></div></details>').join('')||'<p class="ds-empty">No matching topics.</p>';
for(const el of $('dsList').querySelectorAll('textarea[data-ds-id]')){
const item=records.find(x=>x.id===el.dataset.dsId);if(!item)continue;el.value=personalNotes(item);
const block=el.closest('.ds-editor'),guideView=block.querySelector('[data-read-id]'),view=block.querySelector('[data-notes-read-id]'),extra=block.querySelector('.ds-extra-notes'),switcher=block.querySelector('[data-edit-id]');
function setEditing(flag){if(flag){extra.open=true;extraOpenTopics.add(item.id);storeExtraOpen();editingIds.add(item.id);}else editingIds.delete(item.id);el.hidden=!flag;view.hidden=flag;switcher.textContent=flag?'Done editing ✓':(personalNotes(item).trim()?'Edit my notes ✎':'Add my notes ＋');switcher.setAttribute('aria-pressed',String(flag));if(flag){el.focus();}}
guideView.innerHTML=renderTopic(item);prepareNestedPreferences(guideView);view.innerHTML=renderPersonalNotes(item);setEditing(editingIds.has(item.id));
switcher.addEventListener('click',()=>{const wasEditing=editingIds.has(item.id);setEditing(!wasEditing);if(wasEditing){view.innerHTML=renderPersonalNotes(item);cloudSend()}});
el.addEventListener('input',()=>{if(item.id==='arrays'&&item.arrayMergeVersion===1)item.arrayIntegratedNotes=el.value;else if(item.id==='strings'&&item.stringMergeVersion===1)item.stringIntegratedNotes=el.value;else item.notes=el.value;item.updatedAt=new Date().toISOString();persist();view.innerHTML=renderPersonalNotes(item);el.closest('.ds-topic').querySelector('.ds-note-count').textContent=hasRevisionGuide(item)?'Revision guide'+(el.value.trim()?' + notes':''):(el.value.trim()?'Has notes':'Add notes')});
el.addEventListener('blur',()=>{cloudSend();const active=records.filter(isVisibleTopic);$('dsSummary').textContent=active.length+' data structures · '+active.filter(x=>personalNotes(x).trim()).length+' with personal notes'});
}
for(const detail of $('dsList').querySelectorAll('.ds-topic'))detail.addEventListener('toggle',()=>{if(!detail.open||!panel.contains(detail))return;for(const other of $('dsList').querySelectorAll('.ds-topic[open]'))if(other!==detail)other.open=false;detail.scrollIntoView({block:'nearest',behavior:scrollBehavior()})});
for(const chip of $('dsTopicNav').querySelectorAll('[data-nav-id]'))chip.addEventListener('click',()=>{if($('dsSearch').value){$('dsSearch').value='';render();queueMicrotask(()=>document.querySelector('[data-id="'+CSS.escape(chip.dataset.navId)+'"]')?.setAttribute('open',''));return}const target=[...$('dsList').querySelectorAll('.ds-topic')].find(x=>x.dataset.id===chip.dataset.navId);if(target){target.open=true;target.scrollIntoView({block:'start',behavior:scrollBehavior()})}});
if(focusId){const el=[...$('dsList').querySelectorAll('textarea')].find(x=>x.dataset.dsId===focusId);if(el){el.closest('.ds-topic').open=true;el.focus();if(selection)el.setSelectionRange(...selection)}}
window.dispatchEvent(new Event('recall-concept-render'));
}
$('dsToggle').addEventListener('click',()=>{const open=$('dsBody').hidden;$('dsBody').hidden=!open;$('dsToggle').setAttribute('aria-expanded',String(open));panel.classList.toggle('expanded',open);if(open)render()});
$('dsSearch').addEventListener('input',render);
$('dsCollapseAll').addEventListener('click',()=>{for(const detail of $('dsList').querySelectorAll('.ds-topic[open]'))detail.open=false});
window.addEventListener('recall-cloud-data',e=>{
if(e.detail?.kind!=='structures'||!Array.isArray(e.detail.items))return;
const latest=new Map();
for(const item of [...e.detail.items,...records]){
if(!item||typeof item.id!=='string')continue;
const old=latest.get(item.id);if(!old||String(item.updatedAt||'')>String(old.updatedAt||''))latest.set(item.id,item);
}
const merged=[...latest.values()];const changed=JSON.stringify(merged)!==JSON.stringify(records);records=merged;
if(changed){saveLocal();render()}
if(e.detail.items.length!==merged.length||merged.some(item=>{const remote=e.detail.items.find(x=>x.id===item.id);return !remote||String(item.updatedAt||'')>String(remote.updatedAt||'')}))cloudSend();
});
render();
})();
