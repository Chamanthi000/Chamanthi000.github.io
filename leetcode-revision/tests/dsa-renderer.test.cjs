/* node tests/dsa-renderer.test.cjs (Node built-ins and Python stdlib only). */
'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const vm = require('node:vm');
const { execFileSync } = require('node:child_process');
const root = path.resolve(__dirname, '..');
const temporary = fs.mkdtempSync(path.join(os.tmpdir(), 'recall-renderer-'));
const escape = value => value.replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
try {
  execFileSync('python3', [path.join(__dirname, 'guide_fixtures.py'), '--output-dir', temporary]);
  const modelExamples = ['n = length', ['n = length', 'Expected hashing costs'], [['n', 'length']], { n: 'length' }];
  for (const [index, filename] of fs.readdirSync(temporary).entries()) {
    const filepath = path.join(temporary, filename);
    const data = JSON.parse(fs.readFileSync(filepath));
    data.variables = modelExamples[index % modelExamples.length];
    fs.writeFileSync(filepath, JSON.stringify(data));
  }
  const output = path.join(temporary, 'guides.js');
  execFileSync('python3', [path.join(root, 'scripts/build-dsa-guides.py'), '--data-dir', temporary, '--output', output]);
  const context = { window: {} };
  vm.runInNewContext(fs.readFileSync(output, 'utf8'), context);
  const registry = context.window.RecallDSAGuides;
  assert.equal(Object.keys(registry).length, 9);
  const ids = [];
  function fields(value) {
    if (typeof value === 'string') return [value];
    return Object.values(value).flatMap(fields);
  }
  for (const [topic, guide] of Object.entries(registry)) {
    const input = JSON.parse(fs.readFileSync(path.join(temporary, topic + '-guide.json')));
    assert.equal(guide.searchText, JSON.stringify(input).toLowerCase());
    assert.equal(guide.sectionIds.length, 8);
    assert.equal((guide.html.match(/class="ag-section"/g) || []).length, 8);
    assert.equal((guide.html.match(/data-ag-open=/g) || []).length, 8);
    assert.equal((guide.html.match(/data-ds-copy/g) || []).length, 3);
    assert.equal(guide.stats.templates, 2);
    assert.ok(!/<details[^>]*\sopen(?:\s|>)/.test(guide.html));
    assert.ok(!/<(?:img|script)\b/i.test(guide.html));
    for (const value of fields(input)) assert.ok(guide.html.includes(escape(value)), `${topic}: omitted/unescaped ${value}`);
    for (const id of guide.sectionIds) {
      assert.ok(guide.html.includes(`id="${id}"`));
      assert.ok(guide.html.includes(`data-ag-section="${id}"`));
      assert.ok(guide.html.includes(`aria-labelledby="${id}-heading"`));
    }
    ids.push(...Array.from(guide.html.matchAll(/\bid="([^"]+)"/g), match => match[1]));
  }
  for (const filename of ['array-interview-guide.js', 'string-interview-guide.js']) vm.runInNewContext(fs.readFileSync(path.join(root, filename), 'utf8'), context);
  for (const guide of [context.window.RecallArrayGuide, context.window.RecallStringGuide]) {
    ids.push(...Array.from(guide.html.matchAll(/\bid="([^"]+)"/g), match => match[1]));
    for (const link of guide.html.matchAll(/<a\b[^>]+>/g)) {
      assert.match(link[0], /href="https:\/\//);
      assert.match(link[0], /target="_blank"/);
      assert.match(link[0], /rel="noopener noreferrer"/);
    }
  }
  assert.equal(new Set(ids).size, ids.length, 'IDs must be unique across all 11 guide articles');
  const empty = { window: {} };
  vm.runInNewContext(fs.readFileSync(path.join(root, 'scripts/dsa-guide-renderer.js'), 'utf8'), empty);
  assert.equal(Object.keys(empty.window.RecallDSAGuides).length, 0);
  console.log('PASS: nine synthetic guides, every data field escaped/rendered, dynamic counts, unique IDs, closed sections, safe links, empty registry.');
} finally {
  fs.rmSync(temporary, { recursive: true, force: true });
}
