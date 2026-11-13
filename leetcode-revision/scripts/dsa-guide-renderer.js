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
  const detail = (title, index, body) => '<details class="ag-detail"><summary><span class="ag-number">' + number(index) + '</span><strong>' + escape(title) + '</strong><span class="ag-chevron" aria-hidden="true">⌄</span></summary><div class="ag-detail-body">' + body + '</div></details>';
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

  function render(data) {
    const prefix = 'dg-' + data.id + '-';
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
      const rows = data.operations.filter(row => row[0] === group);
      return '<details class="ag-op-group"><summary><strong>' + escape(group) + '</strong><span>' + rows.length + ' operations</span></summary><div class="ag-op-list">' + rows.map(row => '<div class="ag-op-item"><div class="ag-op-top"><code>' + escape(row[1]) + '</code><span class="ag-pill">' + big(row[3]) + '</span></div><p><b>' + escape(row[2]) + '</b> · ' + escape(row[5]) + '</p><small>Auxiliary space: ' + big(row[4]) + '</small></div>').join('') + '</div></details>';
    }).join('')));
    output.push(section(1, data.fundamentals.map((row, index) => detail(row[0], index, '<p>' + escape(row[1]) + '</p>' + snippet(row[2], 'Python example') + facts(row[3], row[4]) + '<p class="ag-warning"><b>Common trap:</b> ' + escape(row[5]) + '</p>')).join('')));
    output.push(section(2, '<div class="ag-tiers"><span>CORE: essential</span><span>IMPORTANT: common extensions</span><span>ADVANCED / SPECIALIST: stretch</span></div><div class="ag-pattern-grid">' + data.patterns.map((row, index) => '<details class="ag-pattern" id="' + escape(prefix + 'pattern-' + index) + '"><summary><span class="ag-tier ' + (row[1] === 'CORE' ? 'is-core' : '') + '">' + escape(row[1]) + '</span><strong>' + escape(row[0]) + '</strong><span class="ag-chevron" aria-hidden="true">⌄</span></summary><div class="ag-pattern-body"><p><b>Recognize:</b> ' + escape(row[2]) + '</p><p><b>Approach:</b> ' + escape(row[3]) + '</p>' + facts(row[4], row[5]) + '<p><b>Practice:</b> ' + escape(row[6]) + '</p><p class="ag-warning"><b>Trap:</b> ' + escape(row[7]) + '</p><p><b>Correctness invariant:</b> ' + escape(row[8]) + '</p><p><b>When not applicable:</b> ' + escape(row[9]) + '</p></div></details>').join('') + '</div>'));
    output.push(section(3, '<div class="ag-recognition">' + data.recognize.map(row => '<div class="ag-cue"><p>' + escape(row[0]) + '</p><b>→ ' + escape(row[1]) + '</b><small>' + escape(row[2]) + '</small></div>').join('') + '</div><h4 class="ag-subhead">' + data.contrasts.length + ' frequently confused pairs</h4><div class="ag-contrasts">' + data.contrasts.map(row => '<div><b>' + escape(row[0]) + '</b><p>' + escape(row[1]) + '</p></div>').join('') + '</div>'));
    output.push(section(4, '<div class="ag-edge-grid">' + data.edges.map((row, index) => '<div class="ag-edge"><span>' + number(index) + '</span><h4>' + escape(row[0]) + '</h4><p>' + escape(row[1]) + '</p><small>' + escape(row[2]) + '</small></div>').join('') + '</div>'));
    output.push(section(5, '<h4 class="ag-subhead">' + data.mistakes.length + ' traps and Python gotchas</h4><div class="ag-tip-grid">' + data.mistakes.map(row => '<div class="ag-tip"><b>' + escape(row[0]) + '</b><p>' + escape(row[1]) + '</p></div>').join('') + '</div><h4 class="ag-subhead">' + data.impress.length + ' habits that stand out</h4><ol class="ag-impress">' + data.impress.map(row => '<li><b>' + escape(row[0]) + '</b><span>' + escape(row[1]) + '</span></li>').join('') + '</ol>'));
    output.push(section(6, '<h4 class="ag-subhead">' + data.memory.length + ' rules for instant recall</h4><div class="ag-memory-grid">' + data.memory.map((row, index) => '<div class="ag-memory"><span>' + number(index) + '</span><b>' + escape(row[0]) + '</b><code>' + escape(row[1]) + '</code><p>' + escape(row[2]) + '</p></div>').join('') + '</div><h4 class="ag-subhead">' + data.templates.length + ' Python templates to write from memory</h4>' + data.templates.map((row, index) => detail(row[0], index, snippet(row[3], 'Python template') + facts(row[1], row[2]) + '<p><b>Contract and adaptation:</b> ' + escape(row[4]) + '</p>')).join('')));
    output.push(section(7, '<ol class="ag-practice">' + data.practice.map(row => '<li><b>' + escape(row[0]) + '</b><span>' + escape(row[1]) + '<br><b>Optimized complexity:</b> ' + big(row[3]) + '<br><b>Key trap:</b> ' + escape(row[4]) + '</span><em>' + escape(row[2]) + '</em></li>').join('') + '</ol><div class="ag-last"><b>Final self-test:</b> Can I explain brute force, the optimized invariant, a failing edge case, and final complexity without notes?</div>'));
    output.push('</article>');
    return { html: output.join(''), searchText: JSON.stringify(data).toLowerCase(), sectionIds,
      stats: Object.fromEntries(['operations', 'fundamentals', 'patterns', 'templates', 'practice'].map(key => [key, data[key].length])) };
  }
  const registry = Object.create(null);
  for (const topic of topics) registry[topic.id] = render(topic);
  window.RecallDSAGuides = registry;
})();
