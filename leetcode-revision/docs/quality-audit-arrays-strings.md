# Arrays and Strings quality audit

This report adapts the substantive audit findings to the reconciled canonical sources in `data/dsa/`. The full upstream enrichment and added algorithms remain; equivalent additions share one implementation. See [quality-reconciliation.md](quality-reconciliation.md) for final counts, interfaces, validation and limits.

## Eight-section review coverage

| Public section | Arrays review | Strings review |
| --- | --- | --- |
| 1. Operations | Corrected list resize, pop, deletion/replacement temporary memory, custom-sort key cost; bounded the heading to common operations. | Reviewed all 53 entries; corrected empty-pattern conservative search bounds, fragment-count costs of join, numeric conversion, isascii, replacement and signature hashing caveats. |
| 2. Fundamentals | Reviewed/executed all examples; clarified row-container copies, corrected stale window-skeleton prose, added worked signed-prefix trace. | Reviewed/executed all examples; clarified canonical equivalence, added worked abba boundary trace; assert Unicode demonstrations' actual output. |
| 3. Patterns | All 36 now have substantive displayed invariant/applicability fields; separated water-container proof from sorted-sum reasoning; fixed heap/output/sort accounting. | All 33 existing invariant/limit fields now render; corrected frequency-window, stored alphabet, group-key, matching, DP and automaton costs and related-problem overreach. |
| 4. Recognition and contrasts | Clarified sorting/3Sum vs pair-scan cost, mutation/quickselect, frequency-heap memory, and allocator vs algorithm workspace. | Reviewed all recognition cues; retained accurate ones; improved canonical-signature comparison and eliminated unrelated practice analogies in patterns. |
| 5. Edge cases | Reviewed all existing cases; added exact domain guarantees for Floyd, colors and positive-only windows. | Reviewed all 26 cases; made intentionally different empty-pattern conventions explicit. |
| 6. Interview mistakes and habits | Retained correct habits; added resize/slice-deletion trap; replaced stale hardcoded counts with data-derived headings. | Retained accurate habits; replaced an unrelated private-note editing tip with the full-casefold vs per-character-lowercase trap. |
| 7. Recall and templates | Reviewed all 12 recall rules and functionally tested all 37 canonical templates; added displayed input/output/mutation/precondition contracts; fixed duplicate-degenerate quickselect. | Reviewed all 19 recall rules and functionally tested all 44 canonical templates, including every Trie method; strengthened every displayed contract; repaired minimum-cover memory, group-size validation and automaton output storage. |
| 8. Practice | Reviewed titles, difficulty and sequence; removed the duplicate 3Sum entry (32 distinct problems remain). | Reviewed 44 practice entries; retained order/difficulty; corrected group-anagram and Word Break complexity labels to match implementations. |

## Concrete issues and applied changes

### Arrays

- Slice deletion previously promised O(1) auxiliary memory. CPython temporarily saves the removed references before decref; general partial deletion uses O(k) recycle storage, while deletion of the whole list uses a clear fast path. Slice replacement also needs removed-reference storage and may materialize the replacement iterable. Resize/backing-array peaks are described separately rather than hidden behind “in place.”
- End pop() was called unconditionally worst-case O(1). It is amortized O(1); occasional shrink/reallocation can relocate references. Append/extend/insert/insort similarly distinguish ordinary algorithm state, growth and resize peaks. Single-index deletion is specifically distinguished: inspected CPython 3.13 shifts in place without shrinking capacity, unlike pop() or slice deletion.
- A random pivot did **not** make the old two-way <= pivot quickselect expected linear on duplicates: an all-equal array still discarded one position per partition. Replaced it with an iterative three-way partition, discarding the entire equal block; expected O(n), worst O(n²), input mutation retained and documented.
- Callback *time* was incorrectly reused as first-feasible-search *space*. It now states constant search state plus the callback's own workspace. Window-deque output and interval-sort workspace are counted explicitly. Heap time uses log(k+1) so k=1 is not mislabeled zero work.
- A worked [1,-1,1], target 1 trace explains why prefix frequencies find three subarrays and why positive-only shrinking is unsafe for signed inputs.

### Strings

- Existing ten-field pattern records hid their invariant and non-applicability fields in the legacy renderer. Both guides now display these fields using their existing escaping mechanism, alongside the richer shared renderer.
- Minimum cover claimed target-alphabet space while retaining every observed text type in have. The implementation now tracks target characters only, achieving O(u_t) working state plus returned-slice storage. Last-seen/replacement maps explicitly retain O(u) **seen** types; replacement budget k is not an alphabet-size bound.
- Group-anagram costs now include W words, including empty words, and key construction/hash costs: expected O(W+N log(L+1)) with sorted keys and O(W+N) grouping/key storage. Variable-length count signatures are not constant-time hashes.
- Verified Rabin–Karp did O(m) slice/comparison work for **true matches**, not just collisions. Its fixed base/modulus gives no randomized-input guarantee. Costs now use O(n+m+mH), where H includes real hits; repeated identical text/pattern can genuinely be quadratic.
- Aho–Corasick copied inherited suffix-output arrays into descendants, contradicting the trie-state-only memory claim. It now follows output links, preserving duplicate-pattern matches without inherited output copies. The sparse failure-link construction is conservatively bounded by expected-hash O(W+P*L+n+z), not universally linear preprocessing; storage is O(P+W+z). Completed transition tables are identified as a separate alphabet/memory tradeoff.
- Edit/LCS costs include empty-prefix row initialization: O((n+1)(m+1)) time, O(m+1) working memory. Word Break includes dictionary ingestion/hashing and Python slice costs; the cubic bound is explicitly conservative and expected-hash-based.
- remove_k_duplicates no longer silently treats nonpositive group sizes as “delete everything”: k<1 raises ValueError; k=1 removes every character. All other preconditions remain explicit rather than pretending the examples validate arbitrary input.
- Unicode palindrome policies, returned slices, RLE ambiguity for digit characters, empty matching conventions, duplicate keywords, and no-normalization assumptions are stated in callable contracts. The existing correct Unicode examples were retained and given semantic output assertions, not merely compilation checks.

## Meaningful gaps filled

The main additions are missing reasoning/contracts and behavioral verification, not algorithm counts: 36 array invariant/applicability pairs, explicit template contracts across the retained and upstream-added algorithms, two concrete worked traces, a missing functional Group Anagrams test, all-template execution guards, randomized independent oracles, output-size accounting, and source-backed CPython memory distinctions. Correct interview habits, recall rules and practice entries were preserved rather than cosmetically rewritten.

## Reconciled validation and contracts

Run `python3 leetcode-revision/scripts/test-dsa-guides.py` from the repository root. It runs the complete canonical topic suites and the ported audit regressions. Templates execute in fresh namespaces; the primary suites require actual calls to every public algorithm function/method, not namespace creation. Counts are derived from the final JSON.

The fallback scripts retain their original template subsets and are checked against canonical rows; canonical suites also test every upstream addition. Frequency windows include the initial O(m) slice in peak space, and zero-column prefix tables count row/header allocation. The trie Word Break addition includes dictionary-entry work even for empty words.
