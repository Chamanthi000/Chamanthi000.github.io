/* AlgoMonster Core Patterns exercises. Difficulty and time are study estimates. */
(function(root){
const topics = [
  ["Binary Search", [
    ["Exact match and first true", 35, [
      ["binary_search_intro", "Binary Search", "Easy", "Implement exact lookup and test a missing target and a singleton."],
      ["binary_search_boundary", "First True", "Easy", "Find the first true in a false-to-true sequence. Test all true and all false."],
    ]],
    ["Lower bound and duplicates", 40, [
      ["binary_search_first_element_not_smaller_than_target", "First Element Not Smaller Than Target", "Easy", "Find the first index with a value at least as large as the target."],
      ["binary_search_duplicates", "First Occurrence", "Easy", "Adapt the lower bound to find the first exact match and reject a missing target."],
    ]],
    ["Last true and integer roots", 30, [
      ["sqrt", "Integer Square Root", "Easy", "Find the last integer whose square fits. Test zero, perfect squares, and adjacent non-squares."],
    ]],
    ["Search on an implicit boundary", 55, [
      ["min_in_rotated_sorted_array", "Minimum in Rotated Sorted Array", "Medium", "Use the right endpoint to decide which half contains the pivot."],
      ["peak_of_mountain_array", "Peak of a Mountain Array", "Medium", "Use the slope between adjacent elements to decide which half contains the peak."],
    ]],
    ["Search on the answer", 60, [
      ["newspapers_split", "Newspapers Split", "Hard", "Search for the smallest feasible maximum workload. Write the greedy feasibility check and explain why it is monotonic."],
    ]],
  ]],
  ["Two Pointers", [
    ["Read and write pointers", 40, [
      ["remove_duplicates", "Remove Duplicates", "Easy", "Compact unique elements in place and return the new length."],
      ["move_zeros", "Move Zeros", "Easy", "Preserve the order of nonzero values while moving zeros to the end."],
    ]],
    ["Pointers approaching each other", 35, [
      ["two_sum_sorted", "Two Sum Sorted", "Easy", "Use sorted order to justify discarding one endpoint."],
      ["valid_palindrome", "Valid Palindrome", "Easy", "Skip punctuation and compare normalized characters."],
    ]],
    ["Fast and slow pointers", 40, [
      ["middle_of_linked_list", "Middle of a Linked List", "Easy", "Trace the fast pointer on odd and even lengths."],
      ["linked_list_cycle", "Linked List Cycle", "Easy", "Explain why pointers moving at different speeds meet inside a cycle."],
    ]],
    ["A fixed gap", 40, [
      ["remove_nth_from_end", "Remove N-th Node from End of Linked List", "Medium", "Use a dummy node and preserve a gap to remove the target in one pass."],
    ]],
    ["Greedy endpoint moves", 50, [
      ["container_with_most_water", "Container With Most Water", "Medium", "Prove why advancing the shorter side is safe."],
      ["get_maximum_score", "Teleporter Arrays", "Hard", "Track the best segment between shared values and choose the better path at each crossing."],
    ]],
  ]],
  ["Sliding Window", [
    ["Fixed-length windows", 40, [
      ["subarray_sum_fixed", "Subarray Sum - Fixed", "Easy", "Update the running sum by adding the new value and subtracting the one leaving."],
      ["find_all_anagrams", "Find All Anagrams in a String", "Medium", "Maintain frequency counts over a window the pattern's length."],
    ]],
    ["Longest valid window", 40, [
      ["subarray_sum_longest", "Sliding Window - Longest", "Medium", "Shrink while the sum violates the bound and explain why the positive values matter."],
      ["longest_substring_without_repeating_characters", "Longest Substring without Repeating Characters", "Medium", "Shrink to remove duplicates and track the longest valid length."],
    ]],
    ["Shortest valid window", 40, [
      ["subarray_sum_shortest", "Sliding Window - Shortest", "Medium", "Shrink while the sum qualifies and record the minimum length."],
    ]],
    ["Repeated values and distance", 30, [
      ["least_consecutive_cards_to_match", "Least Consecutive Cards to Match", "Medium", "Track the previous index for each value and minimize the span."],
    ]],
    ["Cover a target multiset", 60, [
      ["minimum_window_substring", "Minimum Window Substring", "Hard", "Count satisfied requirements and shrink while all required occurrences are covered."],
    ]],
  ]],
  ["Prefix Sums", [
    ["Range sums", 30, [
      ["range_sum_query_immutable", "Range Sum Query - Immutable", "Easy", "Build a leading-zero prefix array and calculate inclusive range sums."],
    ]],
    ["Exact target sums", 45, [
      ["subarray_sum", "Subarray Sum Equals Target", "Medium", "Count prior prefix sums equal to the current sum minus the target. Test negative values and a zero target."],
    ]],
    ["Prefix and suffix products", 40, [
      ["product_of_array_except_self", "Product of Array Except Self", "Medium", "Combine left and right products and test one and two zeros."],
    ]],
    ["Choose the invariant", 30, [
      ["subarray_sum", "Subarray Sum Equals Target", "Medium", "Re-solve with an array containing negative values and explain why the running-count approach works."],
    ]],
    ["Recall and test", 25, [
      ["range_sum_query_immutable", "Range Sum Query - Immutable", "Easy", "Write the range formula from memory and test first-element and full-array ranges."],
    ]],
  ]],
  ["Tree DFS", [
    ["Return information from children", 40, [
      ["tree_max_depth", "Max Depth of A Tree", "Easy", "Return subtree height and check empty and skewed trees."],
      ["invert_binary_tree", "Invert Binary Tree", "Easy", "Swap children once per node and check a one-sided tree."],
    ]],
    ["Pass information down", 35, [
      ["visible_tree_node", "Visible Tree Node", "Easy", "Carry the maximum value on the path and decide whether the current node is visible."],
    ]],
    ["Combine results bottom-up", 45, [
      ["balanced_binary_tree", "Balanced Binary Tree", "Easy", "Return height and detect imbalance without revisiting subtrees."],
      ["subtree_of_another_tree", "Subtree of Another Tree", "Easy", "Distinguish finding a candidate root from checking structural equality."],
    ]],
    ["Combine information from both branches", 50, [
      ["lowest_common_ancestor", "Lowest Common Ancestor", "Medium", "Handle nodes splitting across branches and cases where one node is the ancestor."],
    ]],
    ["Build and encode trees", 70, [
      ["construct-binary-tree-from-preorder-and-inorder-traversal", "Reconstruct Binary Tree from Preorder and Inorder Traversal", "Medium", "Choose roots using preorder and use inorder to divide each subtree."],
      ["serializing_tree", "Serializing and Deserializing Binary Tree", "Hard", "Encode null children and verify a serialize/deserialize round trip."],
    ]],
  ]],
  ["Binary Search Trees", [
    ["Validate ancestor bounds", 40, [
      ["valid_bst", "Validate Binary Search Tree", "Medium", "Carry strict lower and upper bounds inherited from ancestors."],
    ]],
    ["Insert one node", 30, [
      ["insert_into_bst", "Insert Into BST", "Medium", "Follow comparisons to the missing child and preserve the returned root."],
    ]],
    ["Find the split point", 35, [
      ["lowest_common_ancestor_on_bst", "Lowest Common Ancestor of a Binary Search Tree", "Medium", "Locate the node where the two search paths separate or one ends."],
    ]],
    ["Trace the search path", 30, [
      ["insert_into_bst", "Insert Into BST", "Medium", "Implement the iterative version and trace insertion into an empty tree."],
    ]],
    ["Recall the invariant", 30, [
      ["valid_bst", "Validate Binary Search Tree", "Medium", "Re-solve from memory with a counterexample that satisfies local comparisons but violates an ancestor bound."],
    ]],
  ]],
  ["Tree BFS", [
    ["Level-order traversal", 35, [
      ["binary_tree_level_order_traversal", "Binary Tree Level Order Traversal", "Medium", "Take a queue-size snapshot before processing each level."],
    ]],
    ["Find the first leaf", 25, [
      ["binary_tree_min_depth", "Binary Tree Min Depth", "Easy", "Return at the first leaf, including when a node has just one child."],
    ]],
    ["Choose what to output by level", 35, [
      ["binary_tree_right_side_view", "Binary Tree Right Side View", "Medium", "Record the rightmost node of each level without visiting any node twice."],
    ]],
    ["Alternate directions", 35, [
      ["binary_tree_zig_zag_traversal", "Binary Tree ZigZag Level Order Traversal", "Medium", "Keep queue order consistent and alternate how each level is emitted."],
    ]],
    ["Recall queue state", 30, [
      ["binary_tree_level_order_traversal", "Binary Tree Level Order Traversal", "Medium", "Re-code from memory, tracing a sparse tree level by level."],
    ]],
  ]],
  ["Backtracking", [
    ["Choose and undo", 40, [
      ["letter_combinations_of_phone_number", "Generate All Phone Number Combinations", "Medium", "Build one character per digit and undo each choice."],
      ["subsets_backtracking", "Subsets", "Medium", "Enumerate subsets by progressing through indices."],
    ]],
    ["Track additional state", 45, [
      ["generate_parentheses", "Generate All Valid Parentheses", "Medium", "Track open and closed counts and prune invalid prefixes."],
      ["permutations", "General All Permutations", "Medium", "Track used positions and undo them after each branch."],
    ]],
    ["Prune invalid choices", 40, [
      ["palindrome_partitioning", "Partition a String Into Palindromes", "Medium", "Recurse only on palindromic prefixes, preserving the chosen pieces."],
    ]],
    ["Reuse choices without duplicates", 40, [
      ["combination_sum", "Combination Sum", "Medium", "Track remaining sum and restrict index movement to avoid reorderings."],
    ]],
    ["Memoize repeated suffixes", 65, [
      ["word_break", "Word Break", "Medium", "Memoize by the starting index of the remaining suffix."],
      ["decode_ways", "Num Ways to Decode a Message", "Medium", "Handle zero and validate two-digit choices before recursing."],
      ["coin-change-backtracking", "Min Coins to Make Change", "Medium", "Memoize the remaining amount and represent impossible states explicitly."],
    ]],
  ]],
  ["Graph Traversal", [
    ["Distances and visited sets", 40, [
      ["shortest_path_unweight", "Unweighted Shortest Path", "Easy", "Use BFS depth as distance and mark nodes on enqueue."],
      ["flood_fill", "Flood Fill", "Easy", "Replace the connected region and handle identical old and new colors."],
    ]],
    ["Traverse connected components", 40, [
      ["number_of_islands", "Number of Islands", "Medium", "Count one island per traversal from previously unseen land."],
    ]],
    ["Clone identity and edges", 40, [
      ["clone_graph", "Clone Graph", "Medium", "Map original nodes to clones before traversing neighbors so cycles are safe."],
    ]],
    ["Multi-source BFS", 50, [
      ["walls_and_gates", "Walls and Gates / Zombie in Matrix", "Medium", "Start from every gate and expand outward by distance."],
    ]],
    ["Reverse the edges mentally", 50, [
      ["pacific_atlantic_water_flow", "Pacific Atlantic Water Flow", "Medium", "Traverse uphill from each ocean and intersect the reachable sets."],
    ]],
  ]],
  ["Implicit Graphs", [
    ["Generate moves on demand", 40, [
      ["knight_shortest_path", "Knight Minimum Moves", "Medium", "Generate legal knight offsets and use BFS for minimum moves."],
    ]],
    ["Encode states and avoid dead ends", 45, [
      ["open_the_lock", "Open the Lock", "Medium", "Encode dial states and generate wrapped neighbors while skipping dead ends."],
    ]],
    ["Transform words", 60, [
      ["word_ladder", "Word Ladder", "Hard", "Generate one-letter changes and compute shortest transformation length."],
    ]],
    ["Search board configurations", 60, [
      ["sliding_puzzle", "Sliding Puzzle", "Hard", "Encode the board compactly and swap zero only with adjacent positions."],
    ]],
    ["Recall without hints", 40, [
      ["open_the_lock", "Open the Lock", "Medium", "Re-code BFS from memory and test a dead start, the start as goal, and an unreachable goal."],
    ]],
  ]],
  ["Topological Sort", [
    ["Dependencies and cycle detection", 40, [
      ["task_scheduling", "Task Scheduling", "Medium", "Use indegrees to determine whether every task can run."],
    ]],
    ["Find a valid order", 40, [
      ["task_scheduling_2", "Task Scheduling 2", "Medium", "Return a full dependency order or detect a cycle."],
      ["course_schedule", "Course Schedule", "Medium", "Rephrase course prerequisites as directed edges and validate edge direction."],
    ]],
    ["Check uniqueness", 45, [
      ["sequence_reconstruction", "Reconstructing Sequence", "Medium", "Check whether exactly one node is available at each step."],
    ]],
    ["Infer edges from input", 60, [
      ["alien_dictionary", "Alien Dictionary", "Hard", "Use first mismatches to build edges, reject invalid prefixes, and detect cycles."],
    ]],
    ["Recall dependency tests", 35, [
      ["task_scheduling_2", "Task Scheduling 2", "Medium", "Re-code from memory and test multiple sources, disconnected nodes, and a cycle."],
    ]],
  ]],
  ["Weighted Graphs", [
    ["Nonnegative shortest paths", 50, [
      ["dijkstra_intro", "Dijkstra's Algorithm | Shortest Path in a Weighted Graph", "Medium", "Trace priority-queue relaxation and skip stale entries."],
    ]],
    ["Rebuild shortest paths", 35, [
      ["dijkstra_intro", "Dijkstra's Algorithm | Shortest Path in a Weighted Graph", "Medium", "Keep predecessor information and test an unreachable node."],
    ]],
    ["Minimum spanning trees", 50, [
      ["mst_forest", "Minimum Spanning Tree | Forests", "Medium", "Trace edge selection without creating a cycle."],
    ]],
    ["Disconnected graphs", 40, [
      ["mst_forest", "Minimum Spanning Tree | Forests", "Medium", "Explain what a minimum spanning forest returns when there is no single spanning tree."],
    ]],
    ["Pick the right objective", 35, [
      ["dijkstra_intro", "Dijkstra's Algorithm | Shortest Path in a Weighted Graph", "Medium", "Compare shortest distances from one source with the edge set that minimizes total connecting cost."],
    ]],
  ]],
  ["Heaps", [
    ["Top K", 50, [
      ["k_closest_points", "K Closest Points", "Medium", "Use squared distance and bound the heap to K elements."],
      ["kth_largest_element_in_an_array", "Kth Largest Element in an Array", "Medium", "Maintain the K largest values and read the smallest of that group."],
    ]],
    ["Merge sorted streams", 55, [
      ["merge_k_sorted_lists", "Merge K Sorted Lists", "Hard", "Place only each list's current head in the heap and handle equal keys."],
    ]],
    ["Select from ordered rows", 45, [
      ["kth_smallest_element_in_a_sorted_matrix", "Kth Smallest Element in a Sorted Matrix", "Medium", "Advance within rows after popping the current minimum."],
    ]],
    ["Choose the current best repeatedly", 50, [
      ["reorganize_string", "Reorganize String", "Medium", "Pick frequent characters while avoiding adjacent repeats."],
      ["ugly_number_ii", "Ugly Number", "Medium", "Generate ordered candidates and avoid pushing duplicates."],
    ]],
    ["Balance two heaps", 50, [
      ["median_of_data_stream", "Median of Data Stream", "Hard", "Maintain size and ordering invariants and read the median for both parities."],
    ]],
  ]],
  ["One-Dimensional DP", [
    ["Define the state and base cases", 40, [
      ["climbing_stairs", "Climbing Stairs", "Easy", "Derive the result for a stair from the two ways to reach it."],
      ["nth_tribonacci_number", "N-th Tribonacci Number", "Easy", "Write the three-term transition and reduce storage to the needed prior states."],
    ]],
    ["Choose take or skip", 40, [
      ["house_robber", "house robber", "Medium", "Compare taking the current value with skipping it."],
      ["min_cost_climbing_stairs", "Min Cost Climbing Stairs", "Easy", "Define whether your state means standing on or leaving a step."],
    ]],
    ["Model time jumps", 50, [
      ["minimum_cost_for_tickets", "Minimum Cost For Tickets", "Medium", "Compare passes by shifting to the next uncovered travel date."],
    ]],
    ["Optimize over earlier states", 55, [
      ["longest_increasing_subsequence", "Longest Increasing Subsequence", "Medium", "Define the best subsequence ending at each index."],
      ["largest_divisible_subset", "Largest Divisible Subset", "Medium", "Sort values and record predecessors to reconstruct a solution."],
    ]],
    ["Try transitions of different lengths", 50, [
      ["partition_array_for_maximum_sum", "Partition Array for Maximum Sum", "Medium", "Track the maximum inside a candidate block while considering each possible final block length."],
      ["divisor_game", "Divisor Game", "Easy", "Check small DP states before explaining the parity shortcut."],
    ]],
  ]],
  ["Grid DP", [
    ["Count paths", 40, [
      ["robot_unique_path", "robot paths", "Medium", "Count paths from top and left with correct boundary initialization."],
      ["unique_paths_ii", "Unique Paths with Obstacles", "Medium", "Make obstacles contribute zero and handle a blocked start or end."],
    ]],
    ["Minimize path cost", 40, [
      ["minimal_path_sum", "Minimum Path Sum", "Medium", "Accumulate minimum costs and handle missing predecessors."],
      ["triangle", "Triangle", "Medium", "Use the actual neighbors of each cell and compare top-down and bottom-up formulations."],
    ]],
    ["Find the largest square", 45, [
      ["maximal_square", "Maximal Square", "Medium", "Use the limiting neighbor among top, left, and diagonal."],
    ]],
    ["Work backward from the goal", 60, [
      ["dungeon_game", "Dungeon Game", "Hard", "Compute minimum required health on entry, keeping it at least one."],
    ]],
    ["Reuse the grid recurrence", 35, [
      ["unique_paths_ii", "Unique Paths with Obstacles", "Medium", "Re-solve using one row and test an obstacle in the first row."],
    ]],
  ]],
  ["Two-Sequence DP", [
    ["Match or skip", 40, [
      ["longest_common_subsequence", "Longest Common Subsequence", "Medium", "Define a state over two prefixes and distinguish matches from skips."],
    ]],
    ["Delete String", 40, [
      ["delete_string", "Delete String", "Medium", "Minimize the cost to make two strings equal by deleting from either prefix, using each character’s assigned cost."],
    ]],
    ["Insert, delete, or replace", 55, [
      ["edit_distance", "Edit Distance", "Medium", "Map each operation to a move in the table and initialize empty prefixes."],
    ]],
    ["Count matches", 55, [
      ["distinct_subsequences", "Distinct Subsequences", "Hard", "Count ways to form a target prefix and handle the empty target."],
    ]],
    ["Reconstruct an answer", 60, [
      ["shortest_common_supersequence", "Shortest Common Supersequence", "Hard", "Recover a shortest sequence while preserving both input orders."],
    ]],
  ]],
  ["Knapsack DP", [
    ["Track achievable weights", 40, [
      ["knapsack_weight_only", "Weight-Only knapsack", "Medium", "Build reachable sums while respecting each item's availability."],
      ["partition_equal_subset_sum", "Partition Equal Subset Sum", "Medium", "Reduce partitioning to reaching half the total and update capacity backward."],
    ]],
    ["Count choices with signs", 45, [
      ["target_sum", "Target Sum", "Medium", "Track how many ways each signed sum can be reached, including duplicate zero choices."],
    ]],
    ["Allow repeated items", 50, [
      ["coin_change_ii", "Coin Change II", "Medium", "Count unordered combinations by looping through denominations first."],
      ["coin_change", "Coin Change, Optimization", "Medium", "Minimize coin count and preserve an explicit unreachable value."],
    ]],
    ["Use weights and values", 55, [
      ["knapsack_intro", "0/1 Knapsack Practice Problem", "Medium", "Store maximum value at each capacity and avoid using an item twice."],
      ["perfect_squares", "Perfect Squares", "Medium", "Treat each square number as an unlimited choice in a minimum-count DP."],
    ]],
    ["Handle finite multiplicities", 55, [
      ["bounded_knapsack", "Bounded Knapsack", "Hard", "Respect item counts and compare the transition with 0/1 and unbounded cases."],
    ]],
  ]],
  ["Advanced DP", [
    ["Solve over substrings", 45, [
      ["palindromic_substrings", "Palindromic Substrings", "Medium", "Use the inner substring to decide whether a larger interval is a palindrome."],
      ["longest_palindromic_subsequence", "Longest Palindromic Subsequence", "Medium", "Expand matching ends or skip one end while keeping a valid interval."],
    ]],
    ["Model the opponent", 50, [
      ["coin_game", "Coin Game", "Hard", "Define what a state means for the current player and test small games by hand."],
    ]],
    ["Follow a dependency order", 60, [
      ["longest_increasing_path_in_a_matrix", "Longest Increasing Path in a Matrix", "Hard", "Use strictly increasing edges to justify memoized DFS."],
      ["longest_string_chain", "Longest String Chain", "Medium", "Evaluate shorter predecessors before longer words."],
    ]],
    ["Combine tree states", 45, [
      ["house_robber_iii", "House Robber III", "Medium", "Return take and skip values for each subtree."],
    ]],
    ["Track visited subsets", 65, [
      ["bitmask_dp", "Bitmask DP", "Hard", "Represent a subset in a mask and trace one transition by hand."],
      ["min_cost_to_visit_every_node", "Minimum Cost to Visit Every Node", "Hard", "Track the visited set and current node while minimizing cost."],
    ]],
  ]],
  ["Union-Find", [
    ["Build find and union", 40, [
      ["dsu_problem_intro", "DSU Introductory Problem", "Easy", "Trace a sequence of union and connectivity queries using representatives."],
    ]],
    ["Count components and their sizes", 45, [
      ["dsu_set_size", "Size of Connected Components", "Medium", "Store size on the root and update it only when components actually merge."],
      ["number_of_connected_components", "Number of Connected Components", "Medium", "Decrease the component count only when roots differ."],
    ]],
    ["Merge records by shared keys", 50, [
      ["dsu_account_merge", "Merge User Accounts", "Medium", "Use shared email addresses to connect accounts and group results by root."],
    ]],
    ["Reverse deletions", 55, [
      ["umbristan", "Umbristan | Reverse Union Find", "Hard", "Process removals backward as additions and track the changing connectivity."],
    ]],
    ["Recall with compression", 35, [
      ["dsu_problem_intro", "DSU Introductory Problem", "Easy", "Re-code path compression and union by size from memory."],
    ]],
  ]],
  ["Tries", [
    ["Insert and traverse prefixes", 40, [
      ["autocomplete", "Autocomplete", "Medium", "Walk to the prefix node and enumerate valid completions."],
    ]],
    ["Track counts", 35, [
      ["prefix_count", "Prefix Count", "Medium", "Maintain per-prefix counts and distinguish terminal nodes from prefix nodes."],
    ]],
    ["Search with wildcards", 45, [
      ["design_add_and_search_words_data_structure", "Add and Search Words Data Structure", "Medium", "Branch only when processing a wildcard and check terminal state at the end."],
    ]],
    ["Combine a trie and grid DFS", 60, [
      ["word_search_ii", "Word Search II", "Hard", "Prune grid paths by prefix and restore visited cells after exploration."],
    ]],
    ["Recall implementation", 30, [
      ["autocomplete", "Autocomplete", "Medium", "Rebuild insertion and search without notes, then test an exact word and a missing prefix."],
    ]],
  ]],
  ["Intervals", [
    ["Sort and merge ranges", 40, [
      ["merge_intervals", "Merge Intervals", "Medium", "Sort by start and maintain a single merged interval."],
      ["meeting_rooms", "Meeting Rooms", "Easy", "Check overlap between adjacent meetings in start-time order."],
    ]],
    ["Insert into a sorted set of intervals", 40, [
      ["insert_interval", "Insert Interval", "Medium", "Preserve the ranges before and after the merged span."],
    ]],
    ["Count simultaneous ranges", 45, [
      ["meeting_rooms_ii", "Meeting Rooms II", "Medium", "Track the earliest ending active meeting and reuse rooms at valid boundaries."],
    ]],
    ["Choose by finishing time", 50, [
      ["non_overlapping_intervals", "Non-overlapping Intervals", "Medium", "Keep the interval that finishes first and count removals."],
      ["minimum_number_of_arrows_to_burst_balloons", "Minimum Number of Arrows to Burst Balloons", "Medium", "Group balloons by a shared endpoint, checking inclusive boundaries."],
    ]],
    ["Partition a string with last appearances", 40, [
      ["partition_labels", "Partition Labels", "Medium", "Extend each partition to the farthest last occurrence reached so far."],
    ]],
  ]],
  ["Stacks and Deques", [
    ["Augment stack state", 35, [
      ["min_stack", "Min Stack", "Medium", "Update the current minimum through duplicate minima and pops."],
    ]],
    ["Track next greater values", 45, [
      ["daily_temperatures", "Daily Temperatures", "Medium", "Store unresolved indices and compute distances when they can be popped."],
      ["next_greater_element_ii", "Next Greater Element II", "Medium", "Use a second pass to handle wraparound."],
    ]],
    ["Maintain a monotonic deque", 55, [
      ["sliding_window_maximum", "Sliding Window Maximum", "Hard", "Remove stale indices at one end and dominated values at the other."],
    ]],
    ["Find boundaries for each bar", 60, [
      ["largest_rectangle_in_histogram", "Largest Rectangle in Histogram", "Hard", "Compute width when a bar is popped and flush the remaining bars."],
    ]],
    ["Parse signs and nesting", 60, [
      ["basic_calculator", "Basic Calculator", "Hard", "Keep the sign and running result through nested parentheses."],
    ]],
  ]],
  ["Data Structure Design", [
    ["Implement recency", 55, [
      ["lru_cache", "LRU Cache", "Medium", "Use a map and doubly linked list to update access and evict in constant time."],
    ]],
    ["Test state transitions", 35, [
      ["lru_cache", "LRU Cache", "Medium", "Test updating an existing key, repeated access, and a capacity of one."],
    ]],
    ["Build a range query tree", 50, [
      ["range_max", "Range Maximum Query", "Medium", "Combine child maxima and trace a query that crosses the midpoint."],
    ]],
    ["Handle range boundaries", 45, [
      ["range_max", "Range Maximum Query", "Medium", "Test single-element, full-range, and partial queries against a direct maximum."],
    ]],
    ["Traverse a BST with stacks", 55, [
      ["closest_bst_values_ii", "Closest BST Values II", "Hard", "Generate predecessor and successor candidates and choose the closer value each step."],
    ]],
  ]],
  ["Greedy and Sweep Lines", [
    ["Find a valid starting point", 45, [
      ["gas_station", "Gas Station", "Medium", "Track total feasibility and explain why a failing running sum lets you skip starts."],
    ]],
    ["Count during a merge", 55, [
      ["count_of_smaller_numbers_after_self", "Count of Smaller Numbers After Self", "Hard", "Carry original indices and count right-half elements that move ahead."],
    ]],
    ["Track the visible skyline", 60, [
      ["skyline_problem", "The Skyline Problem", "Hard", "Process building edges and emit a point only when the active maximum changes."],
    ]],
    ["Compute covered area", 65, [
      ["rectangle_area_ii", "Union Area of Rectangles", "Hard", "Sweep across coordinates and multiply each strip width by the union of covered heights."],
    ]],
    ["Revisit a proof", 30, [
      ["gas_station", "Gas Station", "Medium", "Re-code from memory and explain the restart rule using a concrete counterexample."],
    ]],
  ]],
  ["Math and Sparse Matrices", [
    ["Sieve composites", 40, [
      ["nth_prime", "N-th prime", "Medium", "Mark multiples beginning at each prime's square and choose a sufficient search bound."],
    ]],
    ["Test counting and boundaries", 30, [
      ["nth_prime", "N-th prime", "Medium", "Trace the first few primes and check that one is never counted."],
    ]],
    ["Multiply only contributing entries", 45, [
      ["sparse_matrix_multiplication", "Sparse Matrix Multiplication", "Medium", "Index nonzero terms by the shared dimension and accumulate only matching products."],
    ]],
    ["Verify the matrix shape", 30, [
      ["sparse_matrix_multiplication", "Sparse Matrix Multiplication", "Medium", "Test a rectangular example and a row with no nonzero factors."],
    ]],
    ["Mix and recall", 35, [
      ["mixed-speedrun", "Mixed Review Speedrun", "Mixed", "Pick two practice patterns and explain the clue, invariant, and time complexity for each."],
    ]],
  ]],
];
root.RecallCodingCurriculum = topics;
})(typeof window === "undefined" ? globalThis : window);
