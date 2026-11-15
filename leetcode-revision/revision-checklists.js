/* Topic-specific interview recall cues, adapted from the public Recall DSA guides.
   Private personal notes and review answers are never embedded in this public source. */
(function(root){'use strict';
const common=(recognize,methods,trace,complexity,pitfall,code)=>[
 {id:'recognize',label:recognize},
 {id:'methods',label:methods},
 {id:'trace',label:trace},
 {id:'complexity',label:complexity},
 {id:'pitfall',label:pitfall},
 {id:'code',label:code}
];
const guides={
 'sorting-algorithms':{
  checks:[
   {id:'recognize',label:'Choose among the five you studied: nearly sorted, fewer writes, adjacent swaps, stable/guaranteed sort, or fast average partitioning.'},
   {id:'insertion',label:'Insertion Sort: select a key, compare backward, shift larger values, then insert into the sorted prefix.'},
   {id:'selection',label:'Selection Sort: find min_idx in the unsorted portion and swap once to grow the sorted prefix.'},
   {id:'bubble',label:'Bubble Sort: compare neighboring pairs, swap when needed, grow the right suffix, and use the early-stop flag.'},
   {id:'merge',label:'Merge Sort: split into halves, merge sorted fronts, and explain stability and O(n) array buffer.'},
   {id:'quick',label:'Quick Sort: choose a pivot, partition left/right, recurse, and explain the O(n²) bad-pivot case.'},
   {id:'complexity',label:'Compare best/average/worst time, auxiliary space, stability and in-place behavior for these five techniques.'},
   {id:'edge',label:'Explain nearly sorted, reverse sorted, duplicates, equal-value ties and off-by-one boundaries.'},
   {id:'code',label:'Implement one selected algorithm blind, then compare your Python template with the reference.'}
  ],
  codes:['Insertion Sort with shifting','Selection Sort with min_idx','Bubble Sort with early stop','Merge Sort with stable merge','Quick Sort with in-place partition']
 },
 'arrays':{checks:common(
  'Identify when to use two pointers, sliding window, prefix sums, or binary search.',
  'Recall Two Sum (hashing vs sorted two pointers), fixed/variable windows, and prefix-sum frequency.',
  'Trace the invariant on an example (window bounds, read/write index, or prefix count).',
  'Say O(n) vs O(n log n) vs O(n²) and any extra memory or slicing cost.',
  'Test empty arrays, duplicates, negative numbers, and off-by-one boundaries.',
  'Implement today’s array pattern without notes.'
 ),codes:['Two Sum without reusing an index','Fixed-length sliding window','Subarray Sum Equals K with negatives','Sorted two-pointer pair sum','Lower-bound binary search','In-place remove value']},
 'strings':{checks:common(
  'Recognize anagrams, palindromes, substring windows, or subsequence requirements.',
  'Recall Counter/frequency signatures and last-seen or frequency-window methods.',
  'Trace left/right and character counts; tell a substring from a subsequence.',
  'Explain why repeated concatenation can cost more; count window/extra memory.',
  'Check repeated characters, empty inputs, Unicode assumptions, and equality ties.',
  'Implement today’s string technique from memory.'
 ),codes:['Palindrome two-pointer check','Group Anagrams by signature','Longest substring without repeating characters','Find Anagram Permutations with fixed window','Minimum cover window']},
 'hash-maps':{checks:common(
  'Choose set, dict, Counter, or prefix-frequency map based on what must be remembered.',
  'Recall complement lookup, frequency accounting, canonical grouping, and prefix sums.',
  'State lookup-before-insert and when first index versus count must be retained.',
  'Explain expected O(1) hash operations, O(u) space, and hashing/comparison assumptions.',
  'Check duplicate pairs, zeros, absent keys, and unhashable keys.',
  'Implement today’s map/set algorithm without seeing notes.'
 ),codes:['Two Sum with complement before insert','Count subarrays with sum K (prefix Counter)','Group Anagrams using signatures','Longest substring without repeats','Frequency-based duplicate/multiset comparison']},
 'linked-lists':{checks:common(
  'Recognize reversals, nth-from-end, midpoint, cycles, and sorted-chain merging.',
  'Recall dummy heads, slow/fast pointers, gap pointers, and Floyd’s cycle entry.',
  'Dry-run next-pointer changes and name what stays connected after each step.',
  'Explain O(n) scans, O(1) pointer space, and when copies/recursion change space.',
  'Check empty/singleton lists, head removal, even midpoint, and cycle identity.',
  'Write a pointer-based template without notes.'
 ),codes:['Iterative reverse linked list','Remove nth node from end','Merge two sorted linked lists','Floyd cycle detection and entry','Reverse a linked-list segment']},
 'stacks':{checks:common(
  'Recognize LIFO parsing versus monotonic nearest-greater/smaller problems.',
  'Recall bracket validation, MinStack, RPN evaluation, and monotonic stack mechanics.',
  'Explain what indices remain in the stack and which comparisons cause pops.',
  'Say O(n) amortized push/pop overall and auxiliary stack space.',
  'Test equal values, empty stacks, malformed brackets, and tie handling.',
  'Code today’s stack technique from memory.'
 ),codes:['Valid Parentheses','Next Greater Element with monotonic stack','Min Stack','Evaluate Reverse Polish Notation','Largest Rectangle in Histogram']},
 'queues':{checks:common(
  'Distinguish FIFO BFS, monotonic deque, multi-source BFS, and 0–1 BFS.',
  'Recall enqueue/visit timing, level boundaries, and deque head/tail invariants.',
  'Trace one BFS layer or window maximum update step by step.',
  'Give O(V+E) or O(n) as appropriate; explain deque vs list.pop(0).',
  'Test visited-on-enqueue, duplicates, unreachable states, and deque expiry.',
  'Implement today’s queue/deque template blind.'
 ),codes:['BFS shortest path using deque','Sliding Window Maximum deque','Multi-source grid BFS','Binary-tree level order','Shortest subarray ≥ K with negatives']},
 'trees':{checks:common(
  'Recognize inorder BST ordering, subtree summaries, LCA, and height-based questions.',
  'Recall DFS traversals, BST ancestor bounds, diameter, and kth-smallest.',
  'Trace return values across a parent/children example; distinguish edge vs node length.',
  'Explain O(n) traversal, recursion depth O(h), and skewed BST worst case.',
  'Check null, skewed, duplicate keys, ancestor LCA, and identity vs equal values.',
  'Recreate today’s tree algorithm from memory.'
 ),codes:['Iterative inorder traversal','Validate BST with bounds','Diameter using postorder heights','Lowest Common Ancestor','Kth smallest BST element']},
 'graphs':{checks:common(
  'Decide BFS, DFS, topological ordering, 0–1 BFS, Dijkstra, or components from problem clues.',
  'Recall visited/frontier invariants; distinguish directed, weighted, and grid graphs.',
  'Trace one frontier update and explain why first discovery or minimum extraction is correct.',
  'State O(V+E) for adjacency-list traversal and heap costs for weighted paths.',
  'Check disconnected graphs, self-loops, duplicate edges, negative weights, and cycles.',
  'Write today’s graph algorithm from scratch.'
 ),codes:['BFS shortest path in unweighted graph','DFS connected components','Kahn topological sort','Dijkstra nonnegative weights','Grid multi-source BFS']},
 'heaps':{checks:common(
  'Identify Top-K, kth-in-stream, K-way merge, and scheduling/priority problems.',
  'Recall heapq min-root, max-heap via negative keys, heapify, heappush/replace.',
  'Trace the invariant: root is worst retained candidate or best frontier.',
  'Know O(n) heapify, O(log k) updates, O(k) heap, and sorting alternatives.',
  'Check k=0, duplicates, tie-breaking for unorderable payloads, and stale entries.',
  'Implement today’s heap pattern without looking.'
 ),codes:['Top K largest using bounded min-heap','Streaming kth largest','K-way merge sorted iterables','Top K frequent words/elements','Heapify plus repeated extraction']},
 'tries':{checks:common(
  'Recognize exact word vs prefix search, autocomplete, and wildcard matching.',
  'Recall terminal flags, children maps, counted insert/delete, and DFS enumeration.',
  'Trace insert, search, startsWith and the shared prefix for two words.',
  'State O(L) operations for key length L plus output enumeration costs.',
  'Check prefixes that are not words, duplicates, erase, and missing branches.',
  'Write a trie insert/search/prefix or selected variant blind.'
 ),codes:['Trie insert/search/startsWith','Counted trie with safe erase','Wildcard dot search','Prefix completion enumeration']},
 'union-find':{checks:common(
  'Identify incremental undirected connectivity, components, redundant edges, or Kruskal MST.',
  'Recall parent roots, union-by-size/rank, and path compression.',
  'Trace 3 unions and a find; explain why only roots are merged.',
  'Explain amortized inverse-Ackermann cost and component tracking.',
  'Check already-connected vertices, duplicate edges, isolated nodes, and failed unions.',
  'Code DSU with path compression and union by size from memory.'
 ),codes:['DSU class with find and union-by-size','Kruskal minimum spanning tree','Count connected components','Redundant Connection']},
 'dynamic-programming':{checks:common(
  'Identify overlapping subproblems and a meaningful minimal state.',
  'Recall the transition, base cases, and top-down vs bottom-up choice.',
  'Trace at least one state and prove why dependencies are ready.',
  'Count states × transition work, and table/rolling-memory cost.',
  'Check empty input, impossible cases, and off-by-one initialization.',
  'Write one complete DP recurrence as runnable code without notes.'
 ),codes:['Climbing Stairs memoized vs tabulated','Coin Change minimum coins','0/1 Knapsack','Longest Increasing Subsequence']},
 'backtracking':{checks:common(
  'Recognize exhaustive generation, validity constraints, and pruning.',
  'Recall choose → recurse → undo with complete state restoration.',
  'Trace a branch and identify the decision tree and stopping condition.',
  'Explain exponential branching, stack depth, and output-sensitive cost.',
  'Check duplicates, empty result, mutable path aliasing, and invalid states.',
  'Write one backtracking template blind.'
 ),codes:['Subsets','Permutations','Combination Sum','N-Queens']},
 'binary-search':{checks:common(
  'Recognize a monotone true/false predicate or sorted search space.',
  'Recall lower/upper bound conventions and binary search on answer.',
  'Trace lo/hi and why the interval never loses the answer.',
  'Explain O(log n) predicate checks times each predicate’s cost.',
  'Test all-false/all-true, duplicates, boundaries, and midpoint progress.',
  'Write lower bound or search-on-answer without looking.'
 ),codes:['Lower-bound binary search','Binary search on answer with feasible(mid)','Find first true index']}
};
function get(topic,reviewIndex=0){
 const name=String(topic?.title||'').trim(),id=String(topic?.id||'');
 const key=Object.prototype.hasOwnProperty.call(guides,id)?id:
  /sort/i.test(name)?'sorting-algorithms':/dynami[c ]+program|(^|\b)dp(\b|$)/i.test(name)?'dynamic-programming':
  /backtrack|recursion/i.test(name)?'backtracking':/binary search/i.test(name)?'binary-search':null;
 const fallback=common(
  'Explain what problem clues make this technique useful and what alternatives exist.',
  'Recall the important variants or operations you recorded in your notes.',
  'Trace a small example and state the invariant before looking at the solution.',
  'Explain time and space complexity and any assumptions behind the bound.',
  'Test one boundary input and recall a common mistake.',
  'Write a representative solution from a blank editor without peeking.'
 );
 const selected=guides[key]||{checks:fallback,codes:['Your representative algorithm']};
 const num=Number.isFinite(Number(reviewIndex))?Math.max(0,Math.floor(Number(reviewIndex))):0;
 const challenge=selected.codes[num%selected.codes.length];
 return {name:name||'this topic',challenge,checks:selected.checks.map(x=>({
  id:x.id,label:x.id==='code'?x.label.replace(/from scratch|without notes|without looking|blind\.?$/i,'from memory')+ ' Challenge: '+challenge+'.':x.label
 }))};
}
const api={get};
root.RecallReviewChecklists=api;
if(typeof module==='object'&&module.exports)module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
