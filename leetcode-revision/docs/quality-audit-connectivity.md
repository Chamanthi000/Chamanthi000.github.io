# Connectivity content quality audit

This report adapts the substantive audit findings to the reconciled canonical sources in `data/dsa/`. The full upstream enrichment and added algorithms remain; equivalent additions share one implementation. See [quality-reconciliation.md](quality-reconciliation.md) for final counts, interfaces, validation and limits.

## Eight-section review coverage

Each cell records the completed review, including sections where sound existing material was retained.

| Topic | Operations | Fundamentals | Patterns | Recognition + contrasts | Edge cases | Mistakes + interview habits | Recall + templates | Practice |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Graphs | Reviewed representations, multiplicity, queues and heaps; clarified Boolean matrices | Reviewed all examples and space claims; added executable negative-edge trace | Reviewed all 17; separated bounded walks from unrestricted Bellman–Ford, corrected SCC invariant and MST costs | Reviewed all cues; added simple/multigraph logarithm distinction | Reviewed all; distinguished three empty-grid return contracts | Reviewed all; retained correct enqueue, state, edge-ID and mutation advice | Reviewed all 21 templates; aligned weight, iterable, output and grid contracts | Reviewed all 23; retained correct identities/difficulties and aligned minimax/budget bounds |
| Tries | Reviewed all APIs; included empty-key constant work and aggregate updates | Reviewed all examples; added duplicate/erase count trace | Reviewed all; added delta aggregates and corrected cache, board and string costs | Reviewed all; added overwrite-vs-occurrence distinction and aggregate cue | Reviewed all; corrected distinct-position XOR convention | Reviewed all; retained Unicode, branching, depth, deletion and ranking warnings | Reviewed all 12 final templates, consolidating MapSum and cached suggestions with upstream versions | Reviewed all 15; aligned suggestions, Map Sum, board and segmentation costs |
| Union Find | Reviewed initialization, root metadata, amortization and rollback | Reviewed all examples; added successful/redundant-union trace | Reviewed all; corrected rollback partition invariant | Reviewed all; retained directed/path/semantic-root limits | Reviewed all; retained strict-limit, duplicate-activation and rollback cases | Reviewed all; reinforced single-operation versus sequence bounds | Reviewed all 12 templates; corrected account ordering work, parity validation and rollback bounds | Reviewed all 18; retained correct algorithms/difficulties and advanced-variant caveats |

## Original issues and applied corrections

### Graphs

- Lazy heaps were already correctly charged for duplicate entries, but simple-graph versus multigraph assumptions were not explicit. E counts multiplicity; only a simple graph justifies replacing log(E+2) by O(log(V+2)). A Boolean matrix also loses multiplicity.
- The Bellman–Ford pattern mixed unrestricted negative-edge paths and edge-budget walks. It now distinguishes the unrestricted cycle-rejecting routine from snapshot relaxation, whose bounded negative-cycle walks have finite answers. Initialization is included in O(VE+V).
- Clarified source-reachable versus disconnected negative cycles and whole-graph cycle rejection. Single-source Bellman–Ford ignores unreachable negative cycles; Floyd rejects any negative cycle; DAG routines reject cycles even in unreachable components. Added cross-template regressions.
- The SCC transpose-pass invariant now explicitly identifies a source SCC of the remaining original condensation, which cannot escape to another remaining SCC in the transpose.
- Corrected the weight-domain fundamental example’s auxiliary space: its illustrative weight lists occupy O(E), although all() itself needs O(1) extra space.
- Empty-column grids still incur row validation and, for nearest-source BFS, returned row headers. Updated costs and made differing empty-grid returns explicit.
- Clarified returned arrays versus additional working space, reusable adjacency rows, finite-real preconditions, floating-point limitations, and the inverse-Ackermann symbol used in Kruskal costs.
- Preserved all 21 templates, including eventual safety, snapshot bounded relaxation, minimax grid Dijkstra, implicit dense Manhattan Prim, and DAG path counts. Existing randomized/oracle tests remain intact.

### Tries

- Empty strings are supported, so literal lookup/update is O(L+1), not zero work at L=0. Output size includes one result slot per word, including the empty word.
- Corrected the XOR edge-case text: the template queries only earlier positions and therefore uses distinct positions for N>=2; singleton returns 0 by convention.
- Distinguished static-cache one-prefix queries from every prefix of a typed word. Restarting at root can cost quadratic prefix traversal; incremental traversal plus reference output costs O(L(1+k)). Sorting includes string-comparison cost; retained strings/cache references are included in storage bounds.
- Board search includes scanning even for an empty-word-only dictionary, uses D=min(Lmax,RC), and separates path-local storage from retained dictionary text and returned references. No board-sized visited array is allocated.
- Added tested Map Sum: overwrites propagate new-old delta through root and key-prefix nodes; empty keys/prefixes, negative/zero values and retained zero-value branches are documented. This fills the implementation gap for practice item 677.
- Added tested static top-k prefix suggestions: sorted distinct vocabulary, root cache, Unicode code-point order, isolated returned lists and explicit no-update contract. This fills the implementation gap for the existing cache pattern and practice item 1268.

### Union Find

- Explained inverse-Ackermann amortized sequence work versus logarithmic single-operation balanced-tree work and no-compression rollback/parity finds.
- Python history-list resizing is not worst-case constant. Rollback distinguishes worst-case pointer traversal from amortized history growth/shrink, and states the maximum active successful-merge record count.
- Corrected the time-segment invariant: DSU stores the induced partition, not active edges. Integer snapshot range validation cannot recognize a stale token reused after branching.
- Removed an unnecessary account-group root sort. The dictionary is populated in earliest-account order, so insertion order supplies the promised order. This makes the implementation match its bound even with many no-email accounts; regressions cover 3,000 singleton accounts and merged groups with nontrivial roots.
- Parity constraints reject non-integer 1.0 before XOR arithmetic; previously it passed membership validation and failed later with TypeError.

## Reconciled validation and contracts

Run `python3 leetcode-revision/scripts/test-dsa-guides.py` from the repository root. It runs the complete canonical topic suites and the ported audit regressions. Templates execute in fresh namespaces; the primary suites require actual calls to every public algorithm function/method, not namespace creation. Counts are derived from the final JSON.

Cached suggestions retain upstream support for k=0. MapSum overwrites propagate deltas and support empty keys/prefixes. Upstream offline mixed-update rollback, duplicate-deletion handling, exact rational potentials, identity graph cloning and bounded XOR queries remain present and functionally tested.
