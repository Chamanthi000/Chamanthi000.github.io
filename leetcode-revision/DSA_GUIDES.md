# Public DSA interview guides

Eleven public guide sources live in `data/dsa/<topic>-guide.json`. Edit these maintainable JSON sources and `scripts/dsa-guide-renderer.js`, not generated `dsa-interview-guides.js`. Runtime uses the existing script architecture without fetch or package dependencies. Original Arrays/Strings scripts remain fallback APIs. Enriched content takes precedence, preserving legacy major section IDs, local preference keys, archive/edit handlers, record identities, review ratings and history.

## Build and verify

```sh
python3 scripts/build-dsa-guides.py
python3 scripts/build-dsa-guides.py --check
python3 scripts/test-dsa-guides.py
python3 -m unittest discover -s tests -p 'test_dsa_*.py' -v
node tests/dsa-renderer.test.cjs
node --test tests/recall.test.mjs
python3 tests/strings-guide-validation.py
node tests/dsa-browser.test.cjs
node tests/dsa-real-content.test.cjs
node tests/browser-smoke.mjs
node --test tests/recovery-ui.test.mjs tests/data-safety-*.test.mjs
node tests/recovery-browser.test.cjs
```

Python3.10+ grammar, tuple widths/types/tiers, all supplemental aligned metadata, exact template links, source HTTPS URLs and unknown-field rejection are validated before atomic bundle replacement. Supplemental fields are optional for older authoring fixtures; the production audit requires all of them. Code is compiled at build time, not executed by the builder. Independent algorithm suites and public-example audit execute it separately. No private-note fields belong in this schema. Failed builds leave the prior asset intact; `--check` rejects stale output. `--allow-partial` is development only, never deployment readiness.

Browser suites use disposable synthetic storage and intercepted network; actual full-index suite disables Firebase. To use existing installations set `DSA_PLAYWRIGHT_MODULE` and optionally `DSA_CHROMIUM_EXECUTABLE`. The synthetic browser suite reports an explicit skip if Playwright is absent; real-content tests require it. Real-content screenshots default to `output/playwright`; set `DSA_SCREENSHOT_DIR` for artifacts outside published source. Screenshots/test fixtures are not personal data.

## UI and safety boundaries

Each topic has eight independently collapsible chapters, nested individual operations/fundamentals/patterns/templates, hidden recall explanations and practice answers, scoped chapter actions, direct pattern-to-template expansion/focus, copy controls, mobile code scrolling and reduced-motion behavior. Search indexes every public field including supplemental examples/provenance. Chapter preference storage is view-only: Arrays `recall-arrays-open-v1`, Strings `recall-strings-open-v1`, other presets `recall-dsa-guides-open-v1`. Nested view-only preferences use `recall-dsa-guides-nested-v1`. Known loaded preset chapter IDs only are restored. Only canonical topics are displayed; older extras remain intact in storage, cloud sync, history and exports. No Add/delete notebook controls are offered.

Private notes remain in `recall-structures-v1` with their original identities and fields. Reading/updating public guides never automatically merges, clears or archives notes. Original opt-in Arrays/Strings archive and restore handlers remain available. No private account comparison has been performed. User notes were not loaded from Firebase or copied to repository files.

## Provenance

Original educational synthesis, not copied paid lessons. Python collections/heapq documentation is cross-checked; examples target Python3.10+, while newer Python versions also have public max-heap APIs. AlgoMonster Foundation's old root URL returns404; its moved public intro verifies memory/BigO/arrays/strings/linked-lists/queues/hash/stacks/sorting only, not graph/tree/trie/DSU modules. NeetCode150 public topic categories were rendered, not all solutions audited. Grokking public course overview was checked, paid lessons were not accessed. Per-topic sources state their exact relevance and limitations. See SOURCE_VERIFICATION.md.

Live Firebase, real Google account multi-device sync, physical iPhone/iPad Safari, deployment and private-note comparison require separate verification. Passing synthetic tests is not a claim those were tested.

## Final public coverage

All 11 topics: 276 operations, 145 fundamentals, 213 patterns, 234 runnable templates and 261 practice entries. Every operation/fundamental/pattern/template/practice entry retains aligned enrichment. Canonical source paths are `data/dsa/<topic>-guide.json`; `scripts/test-dsa-guides.py` runs the complete upstream behavioral suites plus audited regressions in disposable co-located storage. Actual-call guards reject compile-only coverage. See [docs/quality-reconciliation.md](docs/quality-reconciliation.md) for final counts and local verification. The earlier INTEGRATION_RESULT.md records the pre-reconciliation snapshot.

Release reconciliation preserves the latest canonical-only upstream display policy. The superseded nine root JSON/test pairs are relocated public educational sources, now enhanced under data/dsa and tests/dsa, not removed private records. Independent review status issues (retained concept conflicts and persistent listener errors) were remediated and regression-tested.
