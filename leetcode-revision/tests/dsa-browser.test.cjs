/* Optional browser checks. Use an existing Playwright install; installs nothing. */
'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
let chromium;
try {
  ({ chromium } = require(process.env.DSA_PLAYWRIGHT_MODULE || 'playwright'));
} catch {
  console.log('SKIP browser checks: set DSA_PLAYWRIGHT_MODULE to an existing Playwright module.');
  process.exit(0);
}
const root = path.resolve(__dirname, '..');
const temporary = fs.mkdtempSync(path.join(os.tmpdir(), 'recall-browser-'));
const topics = ['hash-maps', 'linked-lists', 'stacks', 'queues', 'trees', 'heaps', 'graphs', 'tries', 'union-find'];
const KEY = 'recall-structures-v1';
const OPEN = 'recall-dsa-guides-open-v1';
const privateText = '  PRIVATE fixture <tag> & "quotes"\n\n    keep indentation and trailing spaces  ';
const seed = [
  { id: 'arrays', title: 'Arrays', notes: 'Arrays original notes', createdAt: '2026-01-01', updatedAt: '2026-01-02', extraMetadata: 'keep me' },
  { id: 'strings', title: 'Strings', notes: '', stringMergeVersion: 1, stringIntegratedNotes: 'Strings archived additions', stringLegacyBackup: 'Strings original archive', updatedAt: '2026-01-03' },
  ...topics.map(id => ({ id, title: id, notes: privateText, updatedAt: '2026-01-04' })),
  { id: 'custom-existing', title: 'Existing notebook', notes: privateText + ' Hidden legacy text', updatedAt: '2026-01-05', customMetadata: { keep: true } },
  { id: 'custom-deleted', title: 'Old removed notebook', notes: 'Retain tombstone history', deleted: true, updatedAt: '2026-01-06' }
];
const files = new Map([
  ['/arrays.js', path.join(root, 'array-interview-guide.js')],
  ['/strings.js', path.join(root, 'string-interview-guide.js')],
  ['/revision.js', path.join(root, 'data-structure-revision.js')],
  ['/guides.css', path.join(root, 'array-interview-guide.css')],
  ['/guides.js', path.join(temporary, 'guides.js')]
]);
let browser;
const errors = [];
async function run() {
  execFileSync('python3', [path.join(__dirname, 'guide_fixtures.py'), '--output-dir', temporary]);
  execFileSync('python3', [path.join(root, 'scripts/build-dsa-guides.py'), '--data-dir', temporary, '--output', path.join(temporary, 'guides.js')]);
  const index = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
  assert.ok(index.indexOf('./dsa-interview-guides.js?') < index.indexOf('./data-structure-revision.js?'), 'static bundle must load before revision app');
  // Intercept every request: no listening socket, server, or external network.
  const serve = route => {
    const url = new URL(route.request().url());
    if (url.pathname === '/') {
      const mode = url.searchParams.get('mode');
      const guideScript = ['missing', 'all-missing'].includes(mode) ? '' : '<script src="/guides.js' + (mode === 'empty' ? '?empty=1' : '') + '"></script>';
      const legacyScripts = mode === 'all-missing' ? '' : '<script src="/arrays.js"></script><script src="/strings.js"></script>';
      return route.fulfill({ contentType: 'text/html; charset=utf-8', body: '<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="/guides.css"></head><body class="rev-index"><div id="foundationCourse"></div>' + legacyScripts + guideScript + '<script src="/revision.js"></script></body></html>' });
    } else if (url.pathname === '/guides.js' && url.searchParams.has('empty')) {
      return route.fulfill({ contentType: 'application/javascript', body: 'window.RecallDSAGuides = Object.create(null);' });
    } else if (files.has(url.pathname)) {
      return route.fulfill({ contentType: url.pathname.endsWith('.css') ? 'text/css' : 'application/javascript', body: fs.readFileSync(files.get(url.pathname)) });
    } else {
      return route.fulfill({ status: 404, body: '' });
    }
  };
  const base = 'http://recall-dsa.test';
  browser = await chromium.launch({ headless: true, ...(process.env.DSA_CHROMIUM_EXECUTABLE ? { executablePath: process.env.DSA_CHROMIUM_EXECUTABLE } : {}) });
  async function newContext(options) {
    const context = await browser.newContext(options);
    await context.route('**/*', serve);
    return context;
  }
  const context = await newContext({ viewport: { width: 1280, height: 900 } });
  const page = await context.newPage();
  page.setDefaultTimeout(10000);
  page.on('pageerror', error => errors.push(error.message));
  // Only synthetic browser storage, in a disposable context. No real app data.
  await page.addInitScript(({ seed, key, open }) => {
    if (!localStorage.getItem('fixture-seeded')) {
      localStorage.setItem(key, JSON.stringify(seed));
      localStorage.setItem('fixture-seeded', 'yes');
      localStorage.setItem(open, JSON.stringify(['dg-unknown-patterns', 'dg-trees-bogus', {}, 'ag-operations']));
      localStorage.setItem('recall-arrays-open-v1', '["ag-operations"]');
      localStorage.setItem('recall-strings-open-v1', '["sg-edges"]');
    }
  }, { seed, key: KEY, open: OPEN });
  await page.goto(base);
  await page.locator('#dsToggle').click();
  assert.equal(await page.locator('.ds-topic').count(), 11);
  const canonicalIds = ['arrays','strings',...topics];
  assert.deepEqual(await page.locator('.ds-topic').evaluateAll(nodes=>nodes.map(node=>node.dataset.id)),canonicalIds);
  assert.equal(await page.locator('.dg > .ag-section').count(), 72);
  assert.equal(await page.locator('.dg > .ag-section[open]').count(), 0);
  assert.equal(await page.locator('.dg img, .dg script').count(), 0);
  assert.equal(await page.locator('[data-id="hash-maps"] .ds-note-count').textContent(), 'Revision guide + notes');
  assert.equal(await page.locator('[data-id="hash-maps"] .dg-private-text').textContent(), privateText);
  assert.deepEqual(await page.evaluate(() => window.RecallStructures()), seed);
  assert.equal(await page.locator('[data-ag-section="ag-operations"]').getAttribute('open'), '');
  assert.equal(await page.locator('[data-ag-section="sg-edges"]').getAttribute('open'), '');
  const ids = await page.locator('[id]').evaluateAll(elements => elements.map(element => element.id));
  assert.equal(new Set(ids).size, ids.length);

  const topic = id => page.locator('.ds-topic[data-id="' + id + '"]');
  await page.locator('[data-nav-id="hash-maps"]').click();
  await topic('hash-maps').locator('[data-ag-open="dg-hash-maps-patterns"]').click();
  assert.equal(await topic('hash-maps').locator('.ag-section[open]').count(), 1);
  await topic('hash-maps').locator('[data-ag-expand-all]').click();
  await page.waitForFunction(() => document.querySelectorAll('[data-id="hash-maps"] .ag-section[open]').length === 8);
  assert.equal(await page.locator('.dg > .ag-section[open]').count(), 8);
  let saved = JSON.parse(await page.evaluate(key => localStorage.getItem(key), OPEN));
  assert.equal(saved.length, 8);
  assert.ok(saved.every(id => id.startsWith('dg-hash-maps-')));
  assert.equal(await page.evaluate(() => localStorage.getItem('recall-arrays-open-v1')), '["ag-operations"]');
  assert.equal(await page.evaluate(() => localStorage.getItem('recall-strings-open-v1')), '["sg-edges"]');
  await page.locator('[data-nav-id="trees"]').click();
  await topic('trees').locator('[data-ag-open="dg-trees-edges"]').click();
  await page.locator('[data-nav-id="hash-maps"]').click();
  await topic('hash-maps').locator('[data-ag-collapse-all]').click();
  await page.waitForFunction(() => document.querySelectorAll('[data-id="hash-maps"] .ag-section[open]').length === 0);
  assert.equal(await topic('trees').locator('.ag-section[open]').count(), 1);
  await page.reload();
  await page.locator('#dsToggle').click();
  assert.equal(await topic('trees').locator('.ag-section[open]').count(), 1);
  assert.equal(await topic('hash-maps').locator('.ag-section[open]').count(), 0);
  // Native details keyboard control follows the same persisted topic state.
  await page.locator('[data-nav-id="trees"]').click();
  await topic('trees').locator('[data-ag-section="dg-trees-operations"] > summary').focus();
  await page.keyboard.press('Enter');
  await page.waitForFunction(() => JSON.parse(localStorage.getItem('recall-dsa-guides-open-v1')).includes('dg-trees-operations'));

  for (const id of topics) {
    await page.locator('#dsSearch').fill(id + ' invariant');
    assert.equal(await page.locator('.ds-topic').count(), 1, 'search must cover every public guide');
    assert.equal(await page.locator('.ds-topic').getAttribute('data-id'), id);
  }
  await page.locator('#dsSearch').fill('');
  await page.locator('[data-nav-id="hash-maps"]').click();
  await topic('hash-maps').locator('[data-edit-id]').click();
  const edited = privateText + '\nEdited only in fixture';
  await topic('hash-maps').locator('textarea').fill(edited);
  await topic('hash-maps').locator('[data-edit-id]').click();
  assert.equal(await topic('hash-maps').locator('.dg-private-text').textContent(), edited);
  const changed = await page.evaluate(() => window.RecallStructures());
  assert.deepEqual(changed.find(item => item.id === 'trees'), seed.find(item => item.id === 'trees'));
  assert.equal(changed.find(item => item.id === 'hash-maps').notes, edited);
  assert.ok(!('arrayMergeVersion' in changed.find(item => item.id === 'hash-maps')));
  assert.equal(await page.evaluate(() => localStorage.getItem('recall-arrays-legacy-archive-v1')), null);
  assert.equal(await page.evaluate(() => localStorage.getItem('recall-strings-legacy-archive-v1')), null);
  // Existing delegation copies the exact runnable code text, not escaped HTML.
  await page.evaluate(() => Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText: async text => { window.fixtureCopied = text; } } }));
  await topic('hash-maps').locator('[data-ag-open="dg-hash-maps-memorize"]').click();
  await topic('hash-maps').locator('[data-ag-section="dg-hash-maps-memorize"] .ag-detail > summary').first().click();
  const code = await topic('hash-maps').locator('[data-ag-section="dg-hash-maps-memorize"] code').last().textContent();
  await topic('hash-maps').locator('[data-ag-section="dg-hash-maps-memorize"] [data-ds-copy]').first().click();
  assert.equal(await page.evaluate(() => window.fixtureCopied), code);

  // The fixed DSA list ends at Union Find; hidden records stay intact.
  assert.equal(await page.locator('[data-nav-id="custom-existing"]').count(), 0);
  assert.equal(await page.locator('[data-id="custom-existing"]').count(), 0);
  assert.equal(await page.locator('#dsAdd, #dsNewTitle, [data-remove]').count(), 0);
  assert.equal(await page.locator('.ds-topic').last().getAttribute('data-id'), 'union-find');
  assert.equal(await page.locator('[data-nav-id]').last().getAttribute('data-nav-id'), 'union-find');
  assert.deepEqual(await page.evaluate(() => window.RecallStructures().find(item => item.id === 'custom-existing')), seed.find(item => item.id === 'custom-existing'));
  await page.locator('#dsSearch').fill('Existing notebook');
  assert.equal(await page.locator('.ds-topic').count(), 0);
  await page.locator('#dsSearch').fill('');
  assert.equal(await page.locator('.ds-topic').count(), 11);
  assert.match(await page.locator('#dsSummary').textContent(), /^11 data structures/);

  // Cloud merge remains event-based and preserves unrelated private fields.
  const remote = { id: 'trees', title: 'trees', notes: 'Cloud fixture only', updatedAt: '2099-01-01', customMetadata: 'preserved' };
  await page.evaluate(item => window.dispatchEvent(new CustomEvent('recall-cloud-data', { detail: { kind: 'structures', items: [item] } })), remote);
  assert.deepEqual(await page.evaluate(() => window.RecallStructures().find(item => item.id === 'trees')), remote);
  assert.equal(await page.evaluate(() => window.RecallStructures().find(item => item.id === 'strings').stringLegacyBackup), 'Strings original archive');

  // Old cloud-only extra sections must not reappear or lose their notes.
  const cloudExtra = {id:'legacy-dynamic-programming',title:'Dynamic Programming',notes:'Private legacy cloud notes',updatedAt:'2099-02-01',customMetadata:{preserve:true}};
  const updatedHidden = {...seed.find(item=>item.id==='custom-existing'),notes:privateText+' New remote hidden version',updatedAt:'2099-03-01'};
  await page.evaluate(()=>window.addEventListener('recall-cloud-local',event=>{window.fixtureSyncRecords=event.detail.items;}));
  await page.evaluate(items => window.dispatchEvent(new CustomEvent('recall-cloud-data',{detail:{kind:'structures',items}})), [cloudExtra,updatedHidden]);
  assert.deepEqual(await page.evaluate(()=>window.fixtureSyncRecords.find(item=>item.id==='custom-existing')),updatedHidden);
  assert.deepEqual(await page.locator('.ds-topic').evaluateAll(nodes=>nodes.map(node=>node.dataset.id)),canonicalIds);
  assert.deepEqual(await page.evaluate(()=>window.RecallStructures().find(item=>item.id==='custom-deleted')),seed.find(item=>item.id==='custom-deleted'));
  await page.locator('#dsSearch').fill('New remote hidden version');
  assert.equal(await page.locator('.ds-topic').count(),0);
  await page.locator('#dsSearch').fill('');

  assert.equal(await page.locator('.ds-topic').count(),11);
  assert.equal(await page.locator('.ds-topic').last().getAttribute('data-id'),'union-find');
  assert.equal(await page.locator('[data-nav-id="legacy-dynamic-programming"]').count(),0);
  assert.deepEqual(await page.evaluate(() => window.RecallStructures().find(item=>item.id==='legacy-dynamic-programming')),cloudExtra);
  await page.reload();
  await page.locator('#dsToggle').click();
  assert.equal(await page.locator('.ds-topic').count(),11);
  assert.deepEqual(await page.evaluate(() => window.RecallStructures().find(item=>item.id==='legacy-dynamic-programming')),cloudExtra);
  const sharedRecords = await page.evaluate(()=>window.RecallStructures());
  const secondDevice = await newContext({viewport:{width:820,height:1180}});
  const secondPage = await secondDevice.newPage();
  secondPage.on('pageerror',error=>errors.push(error.message));
  await secondPage.goto(base);
  await secondPage.locator('#dsToggle').click();
  await secondPage.evaluate(items=>window.dispatchEvent(new CustomEvent('recall-cloud-data',{detail:{kind:'structures',items}})), sharedRecords);
  assert.equal(await secondPage.locator('.ds-topic').count(),11);
  assert.equal(await secondPage.locator('[data-nav-id]').last().getAttribute('data-nav-id'),'union-find');
  assert.deepEqual(await secondPage.evaluate(()=>window.RecallStructures().find(item=>item.id==='legacy-dynamic-programming')),cloudExtra);
  assert.deepEqual(await secondPage.evaluate(()=>window.RecallStructures().find(item=>item.id==='custom-existing')),updatedHidden);
  assert.deepEqual(await secondPage.locator('.ds-topic').evaluateAll(nodes=>nodes.map(node=>node.dataset.id)),canonicalIds);
  await secondPage.reload();
  await secondPage.locator('#dsToggle').click();
  assert.equal(await secondPage.locator('.ds-topic').count(),11);
  assert.equal(await secondPage.locator('.ds-topic').last().getAttribute('data-id'),'union-find');
  assert.match(await secondPage.locator('#dsSummary').textContent(), /^11 data structures/);
  await secondDevice.close();

  await page.setViewportSize({ width: 375, height: 812 });
  await page.locator('[data-nav-id="hash-maps"]').click();
  await topic('hash-maps').locator('[data-ag-expand-all]').click();
  const size = await topic('hash-maps').locator('.ag').evaluate(element => ({ width: element.clientWidth, content: element.scrollWidth }));
  assert.ok(size.content <= size.width + 1, `mobile guide overflows: ${JSON.stringify(size)}`);
  assert.equal(await topic('hash-maps').locator('.ag-pattern-grid').evaluate(element => getComputedStyle(element).gridTemplateColumns.split(' ').length), 1);
  // Optional review artifact follows the Playwright skill's project convention.
  if (process.env.DSA_SCREENSHOT) {
    const destination = path.join(root, 'output/playwright');
    fs.mkdirSync(destination, { recursive: true });
    await page.screenshot({ path: path.join(destination, 'dsa-mobile.png'), fullPage: true });
  }
  await context.close();

  for (const mode of ['empty', 'missing', 'all-missing']) {
    const fallback = await newContext();
    const target = await fallback.newPage();
    target.on('pageerror', error => errors.push(error.message));
    await target.addInitScript(({ key, notes }) => localStorage.setItem(key, JSON.stringify(notes)), { key: KEY, notes: seed });
    await target.goto(base + '/?mode=' + mode);
    await target.locator('#dsToggle').click();
    assert.equal(await target.locator('.dg').count(), 0);
    assert.deepEqual(await target.evaluate(() => window.RecallStructures()), seed);
    await target.locator('[data-nav-id="trees"]').click();
    await target.locator('[data-id="trees"] [data-edit-id]').click();
    assert.equal(await target.locator('[data-id="trees"] textarea').inputValue(), privateText);
    await fallback.close();
  }
  // Storage denial must not prevent reading guides or editing in memory.
  const denied = await newContext();
  const deniedPage = await denied.newPage();
  deniedPage.on('pageerror', error => errors.push(error.message));
  await deniedPage.addInitScript(() => {
    Storage.prototype.getItem = () => { throw new DOMException('Fixture storage unavailable'); };
    Storage.prototype.setItem = () => { throw new DOMException('Fixture storage unavailable'); };
  });
  await deniedPage.goto(base);
  await deniedPage.locator('#dsToggle').click();
  await deniedPage.locator('[data-nav-id="trees"]').click();
  await deniedPage.locator('[data-id="trees"] [data-ag-expand-all]').click();
  assert.equal(await deniedPage.locator('[data-id="trees"] .ag-section[open]').count(), 8);
  await denied.close();
  assert.deepEqual(errors, []);
  console.log('PASS: browser notes/editing, scoped state and reload, search all nine guides, keyboard/copy, hidden-note preservation, two-device cloud merge/reload, mobile, empty/missing/all-missing guides, denied storage.');
}
run().catch(error => { console.error(error); process.exitCode = 1; }).finally(async () => {
  if (browser) await browser.close();
  fs.rmSync(temporary, { recursive: true, force: true });
});
