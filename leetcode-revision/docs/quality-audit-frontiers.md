# Quality audit: queues, trees and heaps

This report adapts the substantive audit findings to the reconciled canonical sources in `data/dsa/`. The full upstream enrichment and added algorithms remain; equivalent additions share one implementation. See [quality-reconciliation.md](quality-reconciliation.md) for final counts, interfaces, validation and limits.

## Eight-section review coverage

“Retained” means checked and correct, not omitted from review.

| Major section | Queues & Deques | Trees & BSTs | Heaps & Priority Queues |
| --- | --- | --- | --- |
| 1. Operations | Retained endpoint/interior, bounded, bulk, rotation, empty and concurrency contracts. Expanded list/deque comparison elsewhere. | Retained O(h) BST operations, iterative deletion and rank bounds; balance is not assumed. | Corrected amortized pop cost and list-shrink caveat; checked replace/pushpop, heapify, merge and lazy cleanup. |
| 2. Fundamentals | Added worked monotonic-deque trace and deterministic charging proof. | Added take/skip trace and output-sensitive path accounting; retained identity, global ordering, shape and recursion caveats. | Repaired heapify height-count proof; added valid-but-unsorted heap counterexample; aligned amortized update labels. |
| 3. Patterns | Expanded maximum/prefix-deque proofs, including discard of feasible fronts; retained correct BFS enqueue marking versus weighted relaxation. | Added parent-conditioned decision-state DP; checked metrics, paths, reconstruction, paired traversal and advanced rerooting boundaries. | Aligned pair-frontier bounds and compacted live/stale memory; retained nonnegative Dijkstra and greedy applicability limits. |
| 4. Recognition and contrasts | Replaced ineffective negative-number counterexample; explained list/head alternative and retained-reference/slot costs. | Added when take/skip is necessary rather than one scalar child optimum. | Retained verified recognition and alternative-selection rules; no cosmetic rewrite. |
| 5. Edge cases | Retained invalid capacity/window, ties, disconnected/self-loop, nonpositive threshold, zero-weight detour and inclusive cutoff cases; added duplicate-deadend regression. | Added empty-selection/all-negative DP distinction; retained deep chains, equal identities, invalid ranks, malformed codec and inconsistent traversals. | Added replacement ordering among equal-priority keys; retained empty inputs, exact medians, stale paths, zero cycles and interval conventions. |
| 6. Interview mistakes and habits | Retained correct enqueue-time marking, one-in/one-out amortization, expiry, capacity and synchronization guidance. | Added derivation of conditional child states; retained root replacement, one-arm gain, prefix undo and recursion-depth discipline. | Retained comparison, stale-entry, output, fairness and greedy-proof discipline; clarified and tested ambiguous tie contract. |
| 7. Recall rules and templates | Preserved all 15 templates; corrected event-count variables/burst bound and lock preprocessing cost. | Added explicit-frame take/skip DP and lazy inorder iterator, with contracts and matching recall rule. Depth-linear traversals remain iterative. | Preserved all 16 templates; eliminated gap-sized idle temporary, clarified FIFO update ties, retained single-pop/rebuild worst cases. |
| 8. Practice | Checked names, difficulties and applicability; aligned lock preprocessing and event-space bounds. | Added 337. House Robber III (Medium); retained traversal/BST/metrics/paths/codec progression. | Checked names/difficulties; aligned pair and amortized stream/median bounds; retained LC 3408 taskId tie-policy distinction. |

## Concrete issues corrected

### Queues and deques

- The claimed positive-only shrinking counterexample [2,-1,2] did not actually fail the usual shortest-threshold algorithm at target 3. Replaced it with [1,-1,3], target 3: the ordinary shrinking loop records length 3, removes 1, stops at sum 2, and misses the length-1 final [3].
- Expanded both monotonic-deque deletion arguments. A dominated tail is never useful again; a feasible prefix front cannot improve at a later endpoint. Each index enters once and leaves at most once. One update can still be linear in retained candidates.
- Added trace [4,2,5,3], window 3, with candidate indices [[0],[0,1],[2],[2,3]]. Teaching trace-copy costs are separated from the production linear-time algorithm.
- Distinguished BFS level width from peak retained event count. One recent-event ping may expire an entire earlier window despite constant amortized cost.
- Lock complexity now includes consuming all supplied deadend entries, including duplicates: expected O(D*d + 10^d*d^2) with string states. Preserved the already-correct string copy/hash factor.
- Expanded Python list/deque guidance: front shifting is linear, end operations amortized constant, and list/head avoids shifts but needs deliberate reference/slot reclamation.

### Trees and BSTs

- Filled tree-DP coverage gap: parent decisions constrain children, requiring (take, skip) rather than one unconditional optimum. Added iterative House Robber III template, recurrence, greedy counterexample, recognition, edge case and practice.
- Reconciled the audited iterator coverage with the upstream lazy BST iterator: O(h) initialization/one-call worst case, O(h+m) for m results, and linear total work over a full traversal. Exhaustion raises StopIteration; concurrent tree mutation is outside contract.
- Added comb-tree output example: n=Theta(h) but materialized root-to-leaf path length L=Theta(h^2). Visit count alone does not justify linear output-producing time.
- Retained and rechecked arbitrary versus balanced BST height, identity versus equal values, height/diameter units, auxiliary/output space, and explicit frames versus depth-linear Python recursion.

### Heaps and priority queues

- The original heapify illustration claimed at most n/2^(height+1) nodes at a given positive height without rounding. For n=16, the root of height 4 alone violates the 0.5-node claim. Replaced it with the valid aggregate lemma: at most floor(n/2^j) nodes have height at least j, so summed heights are less than n.
- Added valid heap [1,4,2,5,6,3]: index 1 is 4, while the second-smallest value is 2. Partial order does not imply sorted-array or rank-access guarantees.
- Corrected pop and related descriptions to distinguish logarithmic sift work from amortized Python list allocation. Retained correct lazy-update/rebuild and adversarial single-pop costs.
- Cooldown schedule previously allocated a gap-sized idle list in addition to returned output, contradicting O(u) auxiliary space for huge idle gaps. It now extends from constant-space itertools.repeat.
- Clarified replacement tie policy: oldest current set first; updating a key moves it behind already-live equal-priority entries. Added regression against executing the stale version.
- Aligned pair-enumeration explanations with actual heapify work and returned count: m=min(k,len(a)), q=min(k,len(a)*len(b)).

## Reconciled validation and contracts

Run `python3 leetcode-revision/scripts/test-dsa-guides.py` from the repository root. It runs the complete canonical topic suites and the ported audit regressions. Templates execute in fresh namespaces; the primary suites require actual calls to every public algorithm function/method, not namespace creation. Counts are derived from the final JSON.

The upstream iterator retains the Python `__iter__`/`__next__` protocol. Its short-prefix bound is O(h+m), and exhausted `next()` raises `StopIteration`. The independent-set DP uses explicit frames and allows the empty selection. Upstream rerooting, interval selection and capital/merge algorithms remain executable.
