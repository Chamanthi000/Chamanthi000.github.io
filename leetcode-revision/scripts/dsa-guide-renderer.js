/* Public reference only. This source is bundled with validated JSON at build time. */
(() => {
  'use strict';
  const topics = /*__DSA_GUIDE_DATA__*/[];
  const escape = value => String(value ?? '').replace(/[&<>"']/g, char => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[char]));
  const big = value => escape(value).replace(/\bO\([^)]*\)/g, match => '<span class="ag-big-o">' + match + '</span>');
  const number = index => String(index + 1).padStart(2, '0');
  const snippet = (lines, label) => '<div class="ds-code-card ag-code"><div class="ds-code-bar"><span>' + escape(label) + '</span><button type="button" data-ds-copy aria-label="Copy Python code">Copy</button></div><pre><code>' + escape(lines.join('\n')) + '</code></pre></div>';
  const facts = (time, space) => '<div class="ag-facts"><span><b>Time</b> ' + big(time) + '</span><span><b>Space</b> ' + big(space) + '</span></div>';
  const detail = (title, index, body, id = '') => '<details class="ag-detail"' + (id ? ' id="' + escape(id) + '"' : '') + '><summary><span class="ag-number">' + number(index) + '</span><strong>' + escape(title) + '</strong><span class="ag-chevron" aria-hidden="true">⌄</span></summary><div class="ag-detail-body">' + body + '</div></details>';
  const sectionNames = [
    ['operations', 'Operations', 'REFERENCE', 'Python operations', 'State the operation, representation, and complexity assumptions.'],
    ['fundamentals', 'Fundamentals', 'FUNDAMENTALS', 'Concepts with code, complexity and traps', 'Explain the model, then inspect a runnable Python example.'],
    ['patterns', 'Patterns', 'MUST LEARN', 'Patterns and correctness invariants', 'Learn CORE first. Check the assumptions before applying a familiar technique.'],
    ['recognize', 'Recognition', 'DECISION TREE', 'How to recognize a pattern', 'Use the cue, then test the recommendation against a counterexample.'],
    ['edges', 'Edge cases', 'TEST WELL', 'Edge cases checklist', 'Choose concrete cases that challenge your algorithm assumptions.'],
    ['interview', 'Interview tips', 'INTERVIEW SKILL', 'Mistakes and interview habits', 'Make boundaries, invariants, and complexity accounting explicit.'],
    ['memorize', 'Memorize', 'RECALL', 'Recall rules and copy-ready templates', 'Reconstruct the reasoning. Check each template contract before adapting it.'],
    ['practice', 'Practice', 'PROVE MASTERY', 'Deliberate practice', 'Work in order; hide the pattern name before attempting a problem.']
  ];

  function model(variables) {
    if (typeof variables === 'string') return escape(variables);
    const items = Array.isArray(variables) ? variables : Object.entries(variables);
    return items.map(entry => Array.isArray(entry)
      ? '<b>' + escape(entry[0]) + '</b>: ' + escape(entry[1]) : escape(entry)).join('<br>');
  }

  const paragraph = (label, value) => value ? '<p><b>' + escape(label) + ':</b> ' + escape(value) + '</p>' : '';
  const recall = (prompt, answer) => '<details class="dg-recall"><summary>' + escape(prompt) + '</summary><div class="ag-detail-body">' + answer + '</div></details>';
  function render(data) {
    const prefix = 'dg-' + data.id + '-';
    const templateId = name => prefix + 'template-' + data.templates.findIndex(row => row[0] === name);
    const sectionIds = sectionNames.map(([key]) => prefix + key);
    const section = (index, body) => {
      const [, , kind, title, description] = sectionNames[index];
      const id = sectionIds[index];
      return '<details class="ag-section" data-ag-section="' + escape(id) + '" id="' + escape(id) + '" aria-labelledby="' + escape(id) + '-heading"><summary class="ag-section-toggle"><div class="ag-section-head"><span class="ag-kicker">' + number(index) + ' · ' + kind + '</span><h3 id="' + escape(id) + '-heading">' + (index === 7 ? data.practice.length + ' problems in deliberate order' : title) + '</h3><p>' + description + '</p></div><span class="ag-section-chevron" aria-hidden="true">⌄</span></summary><div class="ag-section-content">' + body + '</div></details>';
    };
    const output = ['<article class="ag dg" data-dg-topic="' + escape(data.id) + '" aria-label="' + escape(data.title) + ' revision guide"><header class="ag-hero"><div class="ag-hero-label">' + escape(data.title) + ' · INTERVIEW PLAYBOOK</div><h2>' + escape(data.title) + '</h2><p>' + escape(data.subtitle) + '</p><div class="ag-stats">' + ['operations', 'fundamentals', 'patterns', 'templates'].map(key => '<span>' + data[key].length + ' ' + key + '</span>').join('') + '</div></header>'];
    output.push('<nav class="ag-nav" aria-label="' + escape(data.title) + ' guide section navigation">' + sectionNames.map(([, label], index) => '<button type="button" data-ag-open="' + escape(sectionIds[index]) + '" aria-controls="' + escape(sectionIds[index]) + '">' + number(index) + ' · ' + label + '</button>').join('') + '</nav><div class="ag-actions"><button type="button" data-ag-expand-all>Expand all sections</button><button type="button" data-ag-collapse-all>Collapse all sections</button></div>');
    const groups = [...new Set(data.operations.map(row => row[0]))];
    output.push(section(0, '<p class="ag-model"><b>Complexity model:</b><br>' + model(data.variables) + '</p>' + groups.map(group => {
      const rows = data.operations.map((row, index) => ({row, index})).filter(item => item.row[0] === group);
      return '<details class="ag-op-group"><summary><strong>' + escape(group) + '</strong><span>' + rows.length + ' operations</span></summary><div class="ag-op-list">' + rows.map(({row, index}) => {
        const extra = data.operationExamples?.[index];
        return '<details class="ag-op-item"><summary><code>' + escape(row[1]) + '</code><span class="ag-pill">' + big(row[3]) + '</span></summary><div class="ag-detail-body">' + paragraph('Operation', row[2]) + facts(row[3], row[4]) + paragraph('Caveat / mistake', row[5]) + (extra ? snippet(extra.code, 'Executable operation example') + paragraph('Result', extra.result) + paragraph('Interview use', extra.use) + paragraph('Mutation / allocation', extra.mutation) : '') + '</div></details>';
      }).join('') + '</div></details>';
    }).join('')));
    output.push(section(1, data.fundamentals.map((row, index) => {
      const extra = data.fundamentalDetails?.[index];
      return detail(row[0], index, '<p>' + escape(row[1]) + '</p>' + (extra ? paragraph('Why', extra.why) + paragraph('When to use', extra.use) : '') + snippet(row[2], 'Python example') + (extra ? paragraph('Input / output', extra.result) + paragraph('Revealing edge', extra.edge) + paragraph('Takeaway', extra.takeaway) : '') + facts(row[3], row[4]) + paragraph('Common trap', row[5]));
    }).join('')));
    output.push(section(2, '<div class="ag-tiers"><span>CORE: essential</span><span>IMPORTANT: common extensions</span><span>ADVANCED / SPECIALIST: stretch</span></div><div class="ag-pattern-grid">' + data.patterns.map((row, index) => '<details class="ag-pattern" id="' + escape(prefix + 'pattern-' + index) + '"><summary><span class="ag-tier ' + (row[1] === 'CORE' ? 'is-core' : '') + '">' + escape(row[1]) + '</span><strong>' + escape(row[0]) + '</strong><span class="ag-chevron" aria-hidden="true">⌄</span></summary><div class="ag-pattern-body"><p><b>Recognize:</b> ' + escape(row[2]) + '</p><p><b>Approach:</b> ' + escape(row[3]) + '</p>' + facts(row[4], row[5]) + '<p><b>Practice:</b> ' + escape(row[6]) + '</p><p class="ag-warning"><b>Trap:</b> ' + escape(row[7]) + '</p><p><b>Correctness invariant:</b> ' + escape(row[8]) + '</p><p><b>When not applicable:</b> ' + escape(row[9]) + '</p>' + (data.patternDetails?.[index] ? '<h4>Steps</h4><ol>' + data.patternDetails[index].steps.map(step => '<li>' + escape(step) + '</li>').join('') + '</ol><div class="dg-template-links">' + data.patternDetails[index].templates.map(name => '<button type="button" data-dg-target="' + escape(templateId(name)) + '" aria-controls="' + escape(templateId(name)) + '">Open template: ' + escape(name) + '</button>').join('') + '</div>' + paragraph('Related patterns', data.patternDetails[index].related) + paragraph('Variations', data.patternDetails[index].variations) : '') + '</div></details>').join('') + '</div>'));
    output.push(section(3, (data.decisionProcess ? '<h4>1–3 minute decision process</h4><ol class="dg-decision">' + data.decisionProcess.map(step => '<li>' + escape(step) + '</li>').join('') + '</ol>' : '') + '<div class="ag-recognition">' + data.recognize.map(row => '<div class="ag-cue"><p>' + escape(row[0]) + '</p><b>→ ' + escape(row[1]) + '</b><small>' + escape(row[2]) + '</small></div>').join('') + '</div><h4 class="ag-subhead">' + data.contrasts.length + ' frequently confused pairs</h4><div class="ag-contrasts">' + data.contrasts.map(row => '<div><b>' + escape(row[0]) + '</b><p>' + escape(row[1]) + '</p></div>').join('') + '</div>'));
    output.push(section(4, '<div class="ag-edge-grid">' + data.edges.map((row, index) => '<div class="ag-edge"><span>' + number(index) + '</span><h4>' + escape(row[0]) + '</h4><p>' + escape(row[1]) + '</p><small>' + escape(row[2]) + '</small></div>').join('') + '</div>'));
    output.push(section(5, '<h4 class="ag-subhead">' + data.mistakes.length + ' traps and Python gotchas</h4><div class="ag-tip-grid">' + data.mistakes.map(row => '<div class="ag-tip"><b>' + escape(row[0]) + '</b><p>' + escape(row[1]) + '</p></div>').join('') + '</div><h4 class="ag-subhead">' + data.impress.length + ' habits that stand out</h4><ol class="ag-impress">' + data.impress.map(row => '<li><b>' + escape(row[0]) + '</b><span>' + escape(row[1]) + '</span></li>').join('') + '</ol>'));
    output.push(section(6, '<h4 class="ag-subhead">' + data.memory.length + ' rules for active recall</h4><p>Say the invariant or formula before revealing the explanation.</p><div class="ag-memory-grid">' + data.memory.map((row, index) => '<div class="ag-memory"><span>' + number(index) + '</span><b>' + escape(row[0]) + '</b>' + recall('Reveal rule and reasoning', '<code>' + escape(row[1]) + '</code><p>' + escape(row[2]) + '</p>') + '</div>').join('') + '</div><h4 class="ag-subhead">' + data.templates.length + ' Python templates to reconstruct</h4>' + data.templates.map((row, index) => {
      const extra = data.templateDetails?.[index];
      return detail(row[0], index, '<p>Reconstruct this template on paper first. State its preconditions and invariant.</p>' + (extra ? paragraph('Pattern', extra.pattern) + paragraph('Preconditions', extra.preconditions) : '') + recall('Reveal Python template and explanation', snippet(row[3], 'Python template') + facts(row[1], row[2]) + paragraph('Contract and adaptation', row[4]) + (extra ? paragraph('Memorable observation', extra.observation) : '')), prefix + 'template-' + index);
    }).join('')));
    output.push(section(7, '<div class="dg-mastery"><b>Mastery rubric · repeat without notes</b><ol><li>Recognize: name the clue and reject one tempting wrong pattern.</li><li>Explain: derive brute force, invariant, correctness, and constraints.</li><li>Implement: write runnable code unaided and test a revealing boundary.</li><li>Transfer: state time / auxiliary / output costs and solve a changed variant.</li></ol><p>After a failed attempt, diagnose the exact gap, rebuild tomorrow, then revisit in a week. A memorized answer alone is not mastery.</p></div><ol class="ag-practice">' + data.practice.map((row, index) => '<li><b>' + escape(row[0]) + '</b><span>' + recall('Reveal patterns, insight, and target', paragraph('Primary pattern', row[1]) + (data.practiceDetails?.[index] ? paragraph('Secondary pattern', data.practiceDetails[index].secondary) + paragraph('Key insight', data.practiceDetails[index].insight) : '') + paragraph('Optimized complexity', row[3]) + paragraph('Key trap', row[4])) + '</span><em>' + escape(row[2]) + '</em></li>').join('') + '</ol><div class="ag-last"><b>Final self-test:</b> Can I explain brute force, the optimized invariant, a failing edge case, and final complexity without notes?</div>'));
    if (data.sources) output.push('<footer class="ag-sources"><h4>Sources and review limits</h4><ul>' + data.sources.map(source => '<li><a href="' + escape(source.url) + '" target="_blank" rel="noopener noreferrer">' + escape(source.title) + '</a> — ' + escape(source.note) + '</li>').join('') + '</ul><p>Original public synthesis. Private notes have not been compared or merged. Paid-course completeness and real-account sync are not implied.</p></footer>');
    output.push('</article>');
    return { html: output.join(''), searchText: JSON.stringify(data).toLowerCase(), sectionIds,
      stats: Object.fromEntries(['operations', 'fundamentals', 'patterns', 'templates', 'practice'].map(key => [key, data[key].length])) };
  }
  const registry = Object.create(null);
  for (const topic of topics) registry[topic.id] = render(topic);
  window.RecallDSAGuides = registry;
})();
