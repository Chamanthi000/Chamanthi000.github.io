# DSA content quality reconciliation

The audited corrections were reconciled into the newer public JSON content, rather than replacing migrated files with the older sources. All eleven canonical guides remain under `data/dsa/`, and Union Find remains last. All upstream-only template additions, sources, decision steps, aligned supplemental objects, operation examples, active recall, real pattern-to-template links and eight-section controls were retained. Existing data-safety, recovery and source-verification documents remain unchanged.

## Merge decisions

Rows were matched by titles or semantic identity (including operation syntax and practice names), and changed fields were reconciled individually. Supplemental results/contracts were updated with the affected code while retaining the richer upstream explanations. The final set has one net template addition: iterative take/skip independent-set tree DP.

Equivalent audit additions reuse the upstream implementations: read-only random-pointer clone, LRU cache, compressed stock spans, stack reachability, exact iterator-frame DFS, lazy BST iterator, cached prefix suggestions and MapSum. Tests select these by title mapping, not historical offsets. The LRU retains optional miss defaults; the clone validates external random targets with ValueError; the iterator retains Python iteration; cached suggestions retain k=0. These choices preserve sound richer upstream APIs while porting the stronger adversarial cases and contracts.

The two longest-duplicate-substring templates remain distinct teaching implementations: a verified substring-key baseline and verified rolling hashes. Their code, function names and performance tradeoffs differ; they are not duplicate implementations under alternate titles.

## Substantive corrections retained

- Arrays: CPython list growth/shrink and slice recycle buffers; duplicate-safe three-way quickselect; visible invariants and preconditions; callback workspace, heap/output allocation and empty-column prefix-table accounting.
- Strings: target-only minimum-cover state; observed-alphabet window space, including initial slices; dictionary/key/empty-input DP costs; verified Rabin–Karp true-hit costs; Aho terminal-output links without inherited-output copies; invalid group-size rejection; Unicode and empty-match contracts.
- Hashing, linked lists and stacks: long/composite keys and empty words; exact palindrome restoration through finally, including comparison errors; read-only topology copying and payload aliasing; LRU invariants; histogram plateaus, minimum tie ownership, stock-span charging and exact DFS versus reachability semantics.
- Queues, trees and heaps: failing signed-window counterexample; deque charging trace; event-burst and lock preprocessing costs; take/skip DP, lazy iteration and output-sensitive paths; valid heapify height proof; allocation-aware heap bounds and constant-workspace idle generation.
- Graphs, tries and DSU: graph weight/cycle/multigraph and bounded-walk contracts; empty-grid/output costs; empty-key and cached-query storage; MapSum overwrite deltas; DSU amortized versus per-call bounds, earliest-account insertion ordering, rollback lifetimes/partitions and parity input validation.

## Final counts

| Topic | Operations | Fundamentals | Patterns | Templates | Practice |
| --- | ---: | ---: | ---: | ---: | ---: |
| Arrays | 41 | 15 | 36 | 37 | 32 |
| Strings | 53 | 19 | 33 | 44 | 44 |
| Hash Maps & Sets | 35 | 13 | 16 | 17 | 20 |
| Linked Lists | 18 | 13 | 21 | 19 | 22 |
| Stacks | 15 | 13 | 21 | 20 | 23 |
| Queues & Deques | 21 | 11 | 14 | 15 | 18 |
| Trees & BSTs | 20 | 14 | 17 | 21 | 26 |
| Heaps & Priority Queues | 22 | 11 | 15 | 16 | 20 |
| Graphs | 20 | 13 | 17 | 21 | 23 |
| Tries | 16 | 11 | 13 | 12 | 15 |
| Union Find | 15 | 12 | 10 | 12 | 18 |
| **Total** | **276** | **145** | **213** | **234** | **261** |

Practice rows are topic-specific, not globally unique problems. Fallback Arrays/Strings retain 31 and 39 templates; their overlapping rows match canonical content. The full canonical suites cover all final templates, including upstream-only additions.

## Validation

Commands are run from the repository root using real Node and existing Python/Playwright installations. No dependencies were installed.

- `python3 leetcode-revision/scripts/test-dsa-guides.py`: all eleven full canonical functional suites and eleven audit regression suites passed. Runtime guards observed all 234 final templates and 337 public algorithm function/method targets being called. Tests include independent/exhaustive/seeded randomized cases, exceptions, duplicates, deep inputs, identity/restoration and output isolation.
- Arrays and Strings fallback validators passed, including their runtime-call guards and canonical parity checks.
- `python3 -m unittest discover -s leetcode-revision/tests -p 'test_*.py' -v`: 32 checks passed, covering independent algorithms, schema/AST/title checks, fail-atomic writes, canonical/fallback parity and negative invocation probes.
- `/opt/homebrew/bin/node --test` on `recall.test.mjs`, `data-safety-*.test.mjs` and `recovery-ui.test.mjs`: 78 checks passed with synthetic adapters.
- Renderer checks passed for eleven synthetic guides, escaped fields, derived counts, controls, unique IDs, safe links and the empty registry. The generated bundle was rebuilt from the final canonical content and passes `build-dsa-guides.py --check`.

The existing `dsa-browser.test.cjs`, `dsa-real-content.test.cjs`, `recovery-browser.test.cjs` and `browser-smoke.mjs` all passed in real Chromium. These cover synthetic guide/storage fixtures, final published content at phone/tablet/desktop sizes, real pattern-template targets, recall/copy controls, recovery/export behavior and original application flows. All external requests were intercepted or blocked and storage was disposable. The sandbox initially prevented browser launch/localhost binding; the authorized local test rerun passed.

No unresolved semantic conflicts or failing local tests remain.

## Preservation and limits

Protected private/scope implementation and test files remain byte-identical to the starting upstream snapshot. No production data, real account storage, authentication or configuration was accessed. No commit, push or publication was performed. Cache/version publication verification remains separate. All worktree writers and test processes are stopped at completion.

Preconditions are not universal runtime validators. Numeric bounds use the stated arithmetic/hash model; long strings and arbitrary-sized integers add their documented costs. Random/property tests and invocation guards provide local evidence, not proofs of every input or branch. Browser checks use intercepted requests and disposable storage. No live deployment or real-account synchronization is claimed.
