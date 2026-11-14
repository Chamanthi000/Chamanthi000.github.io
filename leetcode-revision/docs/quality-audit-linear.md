# Content quality audit: hashing, linked lists and stacks

This report adapts the substantive audit findings to the reconciled canonical sources in `data/dsa/`. The full upstream enrichment and added algorithms remain; equivalent additions share one implementation. See [quality-reconciliation.md](quality-reconciliation.md) for final counts, interfaces, validation and limits.

## 1. Eight-section review coverage

All rows in all eight public sections were reviewed, including existing correct material retained without cosmetic rewrites. The data schema and eight-section presentation remain unchanged.

| Topic | Operations | Fundamentals | Patterns | Recognition + contrasts | Edge cases | Mistakes + interview habits | Recall + templates | Practice |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Hash Maps & Sets | Reviewed; added arbitrary set removal and its bounds | Reviewed; refined composite-key costs, empty-word overhead, equality semantics; added worked prefix trace | Reviewed; corrected grouping cost and window cue/live-state bound | Reviewed; distinguished access order and insertion order, random vs arbitrary removal | Reviewed; empty strings and cross-type equal keys | Reviewed; retained correct habits, added missing per-item-work trap | Reviewed all 17; corrected stated bounds, retained executable algorithms | Reviewed all 20 names/difficulties and algorithm claims; aligned anagram/window/remainder bounds |
| Linked Lists | Reviewed; retained explicit known-predecessor vs traversal costs, identity deletion caveats | Reviewed; added alias-sensitive restoration trace and LRU state model | Reviewed; strengthened restoration and added LRU/read-only clone patterns | Reviewed; clone tradeoffs, recency recognition, exception restoration | Reviewed; comparison exceptions, zero-capacity caches, shared mutable payloads | Reviewed; strengthened restore-before-return/exception habit, retained ownership/node-conservation advice | Reviewed all 19; palindrome now uses finally, added map clone and LRU | Reviewed all 22, including newly added 146 LRU Cache and its concrete eviction trace |
| Stacks | Reviewed; retained amortized list bounds and shallow-copy contracts | Reviewed; explicit histogram plateau and minimum-ownership traces | Reviewed; corrected equal-height invariant and graph applicability; added online stock spans | Reviewed; exact recursive DFS vs reachability, equality/expiry distinctions | Reviewed; cross-edge ordering counterexample added; existing boundaries retained | Reviewed; corrected falsey index-zero width expression, retained amortization and output-cost habits | Reviewed all 20; added stock-span and iterator-frame DFS templates | Reviewed all 23; retained accurate difficulty/complexity progression and matched reachability examples to preorder/islands rather than inorder |

## 2. Original issues and applied corrections

### Hash Maps & Sets

- A composite key's outer length does not bound member hash cost. The variables/fundamentals now distinguish fresh-string hashes, cached string hashes, repeated tuple hashing and nested/member costs. Existing collision and arbitrary-integer qualifications remain.
- Anagram grouping's former sum(l log l) bound omitted per-word work: n empty words still take O(n) time and references. Fundamentals, pattern, template and practice now consistently state O(n + sum(l log(max(2,l)))) expected time and O(L+n) storage.
- The distinct-window cue incorrectly mixed fixed-size windows with distinctness constraints. It now states at-most/exactly-k distinct ranges; live-state space is O(min(u,k+1)), including the temporary entering key.
- Added the prefix-frequency trace [1,-1,0], k=0: contributions 0,1,2, total 3. It explains both the repeated-boundary set failure and query-after-publish empty-range overcount.
- Added Python's equal cross-type key example: 1, True and 1.0 occupy one entry. Added the missing set.pop operation, distinguished arbitrary from uniform-random/LIFO, and qualified sparse-table scan cost.

### Linked Lists

- The former palindrome implementation restored ordinary mismatches but stranded rewired links if overloaded value comparison raised. Comparison now runs inside try/finally; exact original links are restored on True, False and comparison exceptions. Topology-mutating comparison and concurrent observation remain explicitly outside the contract.
- A worked four-node identity trace explains every reversal/comparison/restoration boundary, rather than only stating that restoration occurs.
- The random-pointer interleaving template contained an unused singly-linked Node definition; removed it. Its temporary-mutation/payload-aliasing assumptions remain clear. The new map alternative explicitly copies node topology, not arbitrary nested payloads; mutable payload aliasing is tested for both approaches.
- Existing correct qualifications were retained: O(1) singly-linked splice requires a known predecessor; locating it is linear; copy-next deletion changes identity/value semantics; shared-tail inputs violate destructive merge preconditions; recursion counts as auxiliary space.

### Stacks

- Histogram wording incorrectly promised every popped bar its maximal span despite retaining equal heights. For [2,2], the later bar gets width 1 and the earlier bar eventually gets width 2. The invariant and concrete trace now match the actual strict-pop implementation.
- The histogram recall warning used a falsey-index expression: index 0 must not become -1. It now uses stack[-1] if stack else -1.
- Added the [2,2] minimum-contribution trace: 2+4=6 with rightmost ownership; symmetric strict boundaries give 8, symmetric nonstrict boundaries give 4.
- Mark-all-siblings-on-push does not reproduce recursive DFS discovery order on a graph with cross edges. The existing algorithm is now accurately labeled stack-based reachability, with a concrete s/a/b/c counterexample. A separate neighbor-iterator-frame template reproduces recursive visited-DFS preorder without recursion-depth dependence.

## 3. Significant justified gaps filled

- **146 LRU Cache:** previously mentioned only briefly in linked-list operations. Added a complete hash-index plus doubly-linked-sentinel implementation, recency/map invariants, count-capacity semantics, overwrite and zero-capacity cases, recognition/recall and practice. Lookup is expected O(1), updates expected amortized O(1), not a worst-case guarantee. Hashing recognition points to the linked-list template instead of duplicating it.
- **Read-only random-pointer cloning:** interleaving requires temporary write permission. Added the standard two-pass identity-map option with O(n) auxiliary plus O(n) output, explicit internal-target assumptions and no source-link writes.
- **901 Online Stock Span:** previously only a practice reference. Added compressed (price,span) blocks, the <= equality rule and O(q) aggregate / O(1) amortized / O(q) single-call worst-case explanation.
- **Recursive-style graph DFS frames:** provides a usable alternative exactly where the reachability stack's ordering disclaimer matters. Its ordered-iterable and iterator-storage contracts are explicit.

## Reconciled validation and contracts

Run `python3 leetcode-revision/scripts/test-dsa-guides.py` from the repository root. It runs the complete canonical topic suites and the ported audit regressions. Templates execute in fresh namespaces; the primary suites require actual calls to every public algorithm function/method, not namespace creation. Counts are derived from the final JSON.

The upstream LRU keeps its optional miss-default API (`None` by default), and the read-only clone rejects external random targets with `ValueError`. Both copy strategies retain payload references. The distinct reachability and iterator-frame DFS implementations retain their own ordering contracts.
