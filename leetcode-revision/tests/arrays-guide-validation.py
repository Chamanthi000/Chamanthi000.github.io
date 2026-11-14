"""Functionally exercise every public Arrays template in a fresh namespace."""
import ast
import bisect
from collections import Counter, deque
import contextlib
import io
import itertools
import json
import math
import pathlib
import random
import re
import sys

ROOT = pathlib.Path(__file__).resolve().parents[1]
source = (ROOT / "array-interview-guide.js").read_text(encoding="utf-8")
data = json.loads(re.search(r"^const d=(.*);$", source, re.M)[1])
assert all(len(x) == 6 for x in data["operations"] + data["fundamentals"])
assert all(len(x) == 5 and x[4] for x in data["templates"])
assert all(len(x) == 10 and x[8] and x[9] for x in data["patterns"])
assert len({x[0] for x in data["practice"]}) == len(data["practice"])
for entry in data["fundamentals"]:
    with contextlib.redirect_stdout(io.StringIO()):
        exec(compile("\n".join(entry[2]), entry[0], "exec"), {})

functions = {}
required_codes = set()
called_codes = set()
for index, entry in enumerate(data["templates"]):
    namespace = {}
    code = "\n".join(entry[3])
    tree = ast.parse(code)
    exec(compile(code, f"<array-template-{index}>", "exec"), namespace)
    for node in tree.body:
        if isinstance(node, ast.FunctionDef):
            assert node.name not in functions
            functions[node.name] = namespace[node.name]
            required_codes.add(namespace[node.name].__code__)
EXPECTED = set("two_sum pair_sorted remove_value max_k_sum min_len_positive count_sum_k product_except_self lower_bound first_feasible merge max_subarray next_greater window_max place_1_to_n top_k prefix_2d sort_colors merge_sorted longest_consecutive majority find_duplicate three_sum search_rotated range_add top_k_frequent lis_length max_product next_permutation trap min_jumps kth_largest rectangle_sum".split())
assert set(functions) == EXPECTED, "Update functional coverage for every added/renamed template"

def profile(frame, event, arg):
    if event == "call" and frame.f_code in required_codes:
        called_codes.add(frame.f_code)
sys.setprofile(profile)
f = functions
rng = random.Random(9137)

assert functions['rectangle_sum'](functions['prefix_2d']([[1,2],[3,4]]),0,0,2,2) == 10

# Missing/boundary return conventions and preconditions.
assert f["two_sum"]([], 0) == []
assert f["pair_sorted"]([], 0) is None
assert f["max_subarray"]([]) is None and f["max_product"]([]) is None
assert f["majority"]([]) is None
assert f["min_len_positive"]([], 1) == 0
assert f["prefix_2d"]([]) == [[0]]
assert f["prefix_2d"]([[], []]) == [[0], [0], [0]]
assert f["range_add"](0, []) == []
assert f["min_jumps"]([]) == 0
assert f["kth_largest"]([], 1) is None
assert f["window_max"]([1], 0) == []
assert f["max_k_sum"]([1], 2) is None
assert f["first_feasible"](7, 7, lambda _: True) == 7
assert f["merge"]([[2, 2], [1, 2]]) == [[1, 2]]

for _ in range(250):
    a = [rng.randrange(-3, 4) for _ in range(rng.randrange(9))]
    original = a[:]
    n = len(a)
    target = rng.randrange(-5, 6)
    sums = [sum(a[i:j]) for i in range(n) for j in range(i+1, n+1)]
    pair_exists = any(a[i]+a[j] == target for i in range(n) for j in range(i+1, n))
    result = f["two_sum"](a, target)
    assert bool(result) == pair_exists
    if result:
        i, j = result
        assert 0 <= i < j < n and a[i]+a[j] == target
    ordered = sorted(a)
    pair = f["pair_sorted"](ordered, target)
    assert (pair is not None) == pair_exists
    if pair:
        i, j = pair
        assert 0 <= i < j < n and ordered[i]+ordered[j] == target
    assert f["lower_bound"](ordered, target) == bisect.bisect_left(ordered, target)
    compact = a[:]
    retained = f["remove_value"](compact, target)
    assert compact[:retained] == [x for x in a if x != target] and len(compact) == n
    assert f["count_sum_k"](a, target) == sums.count(target)
    assert f["max_subarray"](a) == (max(sums) if sums else None)
    assert f["max_product"](a) == (max(math.prod(a[i:j]) for i in range(n) for j in range(i+1, n+1)) if a else None)
    assert f["product_except_self"](a) == [math.prod(a[:i]+a[i+1:]) for i in range(n)]
    assert f["next_greater"](a) == [next((a[j] for j in range(i+1, n) if a[j] > x), -1) for i, x in enumerate(a)]
    for k in range(-1, n+2):
        windows = [a[i:i+k] for i in range(n-k+1)] if 1 <= k <= n else []
        assert f["max_k_sum"](a, k) == (max(map(sum, windows)) if windows else None)
        assert f["window_max"](a, k) == list(map(max, windows))
        assert sorted(f["top_k"](a, k)) == (ordered[max(0,n-k):] if k > 0 else [])
        selected = f["top_k_frequent"](a, k)
        counts = Counter(a)
        assert len(selected) == max(0, min(k, len(counts))) and len(set(selected)) == len(selected)
        assert sorted((counts[x] for x in selected), reverse=True) == sorted(counts.values(), reverse=True)[:max(0,k)]
        work = a[:]
        assert f["kth_largest"](work, k) == (ordered[-k] if 1 <= k <= n else None)
        assert sorted(work) == ordered
    triples = {tuple(sorted(c)) for c in itertools.combinations(a, 3) if sum(c) == 0}
    got = f["three_sum"](a)
    assert {tuple(c) for c in got} == triples and len(got) == len(triples)
    values = set(a)
    consecutive = max((next((length for length in range(1,n+2) if x+length not in values), n+1) for x in values), default=0)
    assert f["longest_consecutive"](a) == consecutive
    lis = 0
    for mask in range(1 << n):
        seq = [a[i] for i in range(n) if mask >> i & 1]
        if all(x < y for x, y in zip(seq, seq[1:])): lis = max(lis, len(seq))
    assert f["lis_length"](a) == lis
    placed = a[:]
    assert f["place_1_to_n"](placed) is placed
    assert Counter(placed) == Counter(a)
    assert all(placed[x-1] == x for x in a if 1 <= x <= n)
    assert a == original, "Read-only templates changed input"

    positive = [x+4 for x in a]
    threshold = rng.randrange(1, 20)
    lengths = [j-i for i in range(n) for j in range(i+1,n+1) if sum(positive[i:j]) >= threshold]
    assert f["min_len_positive"](positive, threshold) == min(lengths, default=0)
    assert f["first_feasible"](-10, 10, lambda x: x >= threshold-10) == threshold-10
    colors = [rng.randrange(3) for _ in range(n)]
    before = colors[:]
    assert f["sort_colors"](colors) is colors and colors == sorted(before)
    left, right = sorted(a[:n//2]), sorted(a[n//2:])
    dest = left + [0]*len(right)
    assert f["merge_sorted"](dest, len(left), right, len(right)) is dest
    assert dest == ordered and right == sorted(a[n//2:])
    majority_value = rng.randrange(4)
    majority_input = a + [majority_value]*(n+1)
    rng.shuffle(majority_input)
    assert f["majority"](majority_input) == majority_value
    unique = sorted(set(a))
    pivot = rng.randrange(len(unique)) if unique else 0
    rotated = unique[pivot:] + unique[:pivot]
    for x in unique + [99]:
        assert f["search_rotated"](rotated, x) == (rotated.index(x) if x in rotated else -1)
    heights = [abs(x) for x in a]
    water = sum(max(0, min(max(heights[:i+1]), max(heights[i:]))-x) for i,x in enumerate(heights))
    assert f["trap"](heights) == water
    jumps = [None]*n
    if n: jumps[0] = 0
    for i in range(n):
        if jumps[i] is None: continue
        for j in range(i+1, min(n, i+heights[i]+1)):
            jumps[j] = min(jumps[j], jumps[i]+1) if jumps[j] is not None else jumps[i]+1
    assert f["min_jumps"](heights) == (0 if n < 2 else -1 if jumps[-1] is None else jumps[-1])

for n in range(1, 20):
    for duplicate in range(1, n+1):
        a = list(range(1, n+1)) + [duplicate]
        rng.shuffle(a)
        before = a[:]
        assert f["find_duplicate"](a) == duplicate and a == before
# A two-way <= partition made equal arrays quadratic despite randomized pivots.
assert f["kth_largest"]([7]*20000, 10000) == 7
for n in range(7):
    for a in itertools.product(range(2), repeat=n):
        permutations = sorted(set(itertools.permutations(a)))
        expected = permutations[(permutations.index(a)+1) % len(permutations)]
        work = list(a)
        assert f["next_permutation"](work) is work and tuple(work) == expected
for _ in range(100):
    rows, cols = rng.randrange(5), rng.randrange(5)
    if not rows: cols = 0
    g = [[rng.randrange(-3,4) for _ in range(cols)] for _ in range(rows)]
    before = [row[:] for row in g]
    p = f["prefix_2d"](g)
    for r1 in range(rows+1):
        for r2 in range(r1, rows+1):
            for c1 in range(cols+1):
                for c2 in range(c1, cols+1):
                    assert p[r2][c2]-p[r1][c2]-p[r2][c1]+p[r1][c1] == sum(g[r][c] for r in range(r1,r2) for c in range(c1,c2))
    assert g == before
    n = rng.randrange(1,10)
    updates = []
    expected = [0]*n
    for _ in range(12):
        left = rng.randrange(n); right = rng.randrange(left,n); delta = rng.randrange(-3,4)
        updates.append((left,right,delta))
        for i in range(left,right+1): expected[i] += delta
    assert f["range_add"](n, updates) == expected
    intervals = [[rng.randrange(6), rng.randrange(6)] for _ in range(10)]
    intervals = [sorted(pair) for pair in intervals]
    before = [pair[:] for pair in intervals]
    result = f["merge"](intervals)
    # Independent overlap-component oracle, not a second sorted scan.
    components = []
    todo = intervals[:]
    while todo:
        low, high = todo.pop()
        changed = True
        while changed:
            changed = False
            for pair in todo[:]:
                if pair[0] <= high and pair[1] >= low:
                    low, high = min(low,pair[0]), max(high,pair[1])
                    todo.remove(pair); changed = True
        components.append([low,high])
    assert result == sorted(components) and intervals == before
sys.setprofile(None)
assert required_codes <= called_codes, "A template was only compiled/defined, not called"
print(f"PASS: {len(data['fundamentals'])} executable fundamentals; all {len(data['templates'])} templates functionally called; seeded randomized/brute-force, mutation and duplicate stress checks")
