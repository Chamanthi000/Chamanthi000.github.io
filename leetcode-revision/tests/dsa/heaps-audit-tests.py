"""Run: python3 heaps-template-tests.py. Tests all code loaded from JSON."""
import ast
from collections import Counter
from fractions import Fraction
import itertools
import json
from pathlib import Path
import random
import unittest
import sys

DATA = json.loads(Path(__file__).with_name('heaps-guide.json').read_text())

# Audit regressions execute final canonical code, selected by semantic identity.
_audit_titles = {'Exact top k largest values': 'Exact top k largest values', 'Streaming kth largest': 'Streaming kth largest', 'Top frequent words with lexical ties': 'Top frequent words with lexical ties', 'Merge sorted iterables': 'Merge sorted iterables', 'Merge k disjoint linked lists': 'Merge k disjoint linked lists', 'Exact integer streaming median': 'Exact integer streaming median', 'Dijkstra with tie-safe stale records': 'Dijkstra with tie-safe stale records', 'Minimum rooms for half-open intervals': 'Minimum rooms for half-open intervals', 'Construct a uniform-cooldown schedule': 'Construct a uniform-cooldown schedule', 'Reorganize string without equal neighbors': 'Reorganize string without equal neighbors', 'Smallest range covering sorted lists': 'Smallest range covering sorted lists', 'K smallest pair sums from sorted arrays': 'K smallest pair sums from sorted arrays', 'Versioned mutable priority queue with compaction': 'Versioned mutable priority queue with compaction'}
_canonical = {row[0]: row for row in DATA['templates']}
DATA['templates'] = [[title, *_canonical[canonical][1:]] for title, canonical in _audit_titles.items()]
# Coverage records calls to actual algorithm entrypoints, not exec/compilation.
CALLED, CODE_TARGETS = set(), {}

def entrypoints(tree):
    for item in tree.body:
        if isinstance(item, ast.FunctionDef):
            yield None, item.name
        elif isinstance(item, ast.ClassDef) and item.name != 'Node':
            for method in item.body:
                if isinstance(method, ast.FunctionDef) and (
                        not method.name.startswith('_') or method.name in ('__init__', '__len__')):
                    yield item.name, method.name

def target_id(template, owner, name):
    return template, (owner + '.' if owner else '') + name

EXPECTED = {
    target_id(row[0], owner, name)
    for row in DATA['templates']
    for owner, name in entrypoints(ast.parse(chr(10).join(row[3])))
}

def observe_call(frame, event, arg):
    if event == 'call':
        target = CODE_TARGETS.get(frame.f_code)
        if target is not None:
            CALLED.add(target)


def namespace(name):
    row = next(t for t in DATA['templates'] if t[0] == name)
    code = '\n'.join(row[3])
    ast.parse(code)
    ns = {}
    exec(compile(code, name, 'exec'), ns)
    for owner, function_name in entrypoints(ast.parse(code)):
        function = ns[function_name] if owner is None else getattr(ns[owner], function_name)
        CODE_TARGETS[function.__code__] = target_id(name, owner, function_name)
    return ns

class HeapTemplates(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.previous_profile = sys.getprofile()
        sys.setprofile(observe_call)

    @classmethod
    def tearDownClass(cls):
        sys.setprofile(cls.previous_profile)

    def test_schema_and_all_code(self):
        self.assertEqual(DATA['id'], 'heaps')
        for field in ('title', 'subtitle', 'variables'):
            self.assertIsInstance(DATA[field], str)
            self.assertTrue(DATA[field])
        widths = dict(operations=6, fundamentals=6, patterns=10, recognize=3,
                      contrasts=2, edges=3, mistakes=2, impress=2, memory=3,
                      templates=5, practice=5)
        for field, width in widths.items():
            self.assertTrue(DATA[field])
            for row in DATA[field]:
                self.assertEqual(len(row), width, (field, row[0]))
                for i, cell in enumerate(row):
                    if (field, i) in (('fundamentals', 2), ('templates', 3)):
                        self.assertTrue(cell)
                        self.assertTrue(all(isinstance(line, str) for line in cell))
                        code = '\n'.join(cell)
                        ast.parse(code)
                        compiled = compile(code, row[0], 'exec')
                        if field == 'fundamentals':
                            exec(compiled, {})
                    else:
                        self.assertIsInstance(cell, str)
                        self.assertTrue(cell)
        self.assertEqual(len({t[0] for t in DATA['templates']}), len(DATA['templates']))
        for row in DATA['patterns']:
            self.assertIn(row[1], ('CORE', 'IMPORTANT', 'ADVANCED', 'SPECIALIST'))

    def test_heapify_height_bound(self):
        # Independently check the node-height counting lemma for incomplete last levels.
        for n in range(1, 201):
            heights = [0] * n
            for i in reversed(range(n)):
                children = [heights[j] for j in (2*i+1, 2*i+2) if j < n]
                heights[i] = 1 + max(children) if children else 0
            for depth in range(1, n.bit_length()):
                self.assertLessEqual(sum(h >= depth for h in heights), n // (2 ** depth))
            self.assertLess(sum(heights), n)

    def test_top_k(self):
        f = namespace('Exact top k largest values')['top_k']
        self.assertEqual(f([], 0), [])
        for a, k in (([], 1), ([1], -1), ([1], 2)):
            with self.assertRaises(ValueError):
                f(a, k)
        rng = random.Random(50)
        examples = [[4]*8, [-3], list(range(20)), list(reversed(range(20)))]
        examples += [[rng.randrange(-20, 21) for _ in range(rng.randrange(30))] for _ in range(100)]
        for a in examples:
            for k in range(len(a)+1):
                before = a[:]
                self.assertEqual(f(a, k), sorted(a, reverse=True)[:k])
                self.assertEqual(a, before)

    def test_stream_kth(self):
        cls = namespace('Streaming kth largest')['KthLargest']
        with self.assertRaises(ValueError):
            cls(0)
        q = cls(3, [4, 5, 8, 2])
        self.assertEqual([q.add(x) for x in [3, 5, 10, 9, 4]], [4, 5, 5, 8, 8])
        rng = random.Random(51)
        for k in (1, 2, 7, 50):
            q, seen = cls(k), []
            for _ in range(200):
                value = rng.randrange(-10, 11)
                seen.append(value)
                expected = sorted(seen, reverse=True)[k-1] if len(seen)>=k else None
                self.assertEqual(q.add(value), expected)
                self.assertLessEqual(len(q.heap), k)

    def test_frequency(self):
        f = namespace('Top frequent words with lexical ties')['frequent_words']
        self.assertEqual(f([], 0), [])
        self.assertEqual(f(['b', 'a', 'b', 'a'], 2), ['a', 'b'])
        for k in (-1, 2):
            with self.assertRaises(ValueError):
                f(['a'], k)
        rng = random.Random(52)
        for _ in range(120):
            words = [rng.choice(['a', 'aa', 'b', 'c', 'xy']) for _ in range(rng.randrange(60))]
            counts = Counter(words)
            for k in range(len(counts)+1):
                self.assertEqual(f(iter(words), k), sorted(counts, key=lambda word: (-counts[word], word))[:k])

    def test_merge_iterables(self):
        f = namespace('Merge sorted iterables')['merge_sorted']
        self.assertEqual(f([]), [])
        self.assertEqual(f([[], [], []]), [])
        self.assertEqual(f([iter([1, 3]), iter([1, 2])]), [1, 1, 2, 3])
        rng = random.Random(53)
        for _ in range(150):
            streams = [sorted(rng.randrange(-5, 6) for _ in range(rng.randrange(15)))
                       for _ in range(rng.randrange(12))]
            before = [row[:] for row in streams]
            self.assertEqual(f(streams), sorted(itertools.chain.from_iterable(streams)))
            self.assertEqual(streams, before)

    def test_merge_nodes(self):
        ns = namespace('Merge k disjoint linked lists')
        Node, f = ns['Node'], ns['merge_lists']
        self.assertIsNone(f([]))
        self.assertIsNone(f([None, None]))
        rng = random.Random(54)
        for _ in range(120):
            lists = [sorted(rng.randrange(-3, 4) for _ in range(rng.randrange(12)))
                     for _ in range(rng.randrange(10))]
            heads, identities = [], set()
            for values in lists:
                head = None
                for value in reversed(values):
                    head = Node(value, head)
                    identities.add(id(head))
                heads.append(head)
            merged, seen, values = f(heads), set(), []
            while merged is not None:
                self.assertNotIn(id(merged), seen, 'cycle or duplicate output node')
                seen.add(id(merged))
                values.append(merged.val)
                merged = merged.next
            self.assertEqual(seen, identities)
            self.assertEqual(values, sorted(itertools.chain.from_iterable(lists)))

    def test_median(self):
        cls = namespace('Exact integer streaming median')['MedianStream']
        q = cls()
        with self.assertRaises(ValueError):
            q.median()
        for value in (True, 1.5, '1'):
            with self.assertRaises(ValueError):
                q.add(value)
        q.add(10**30)
        q.add(10**30+1)
        self.assertEqual(q.median(), Fraction(2*10**30+1, 2))
        rng = random.Random(55)
        q, seen = cls(), []
        for _ in range(1000):
            value = rng.randrange(-100, 101)
            seen.append(value)
            q.add(value)
            ordered = sorted(seen)
            middle = len(ordered)//2
            expected = ordered[middle] if len(ordered)%2 else Fraction(ordered[middle-1]+ordered[middle], 2)
            self.assertEqual(q.median(), expected)
            self.assertIn(len(q.lower)-len(q.upper), (0, 1))
            if q.upper:
                self.assertLessEqual(-q.lower[0], q.upper[0])

    def test_dijkstra(self):
        f = namespace('Dijkstra with tie-safe stale records')['dijkstra']
        s, a, b = object(), object(), object()
        self.assertEqual(f({s: [(a, 5), (b, 1)], b: [(a, 1)], a: [(s, 0)]}, s), {s: 0, a: 2, b: 1})
        self.assertEqual(f({}, s), {s: 0})
        self.assertEqual(f({s: [(a, 0)], a: [(s, 0)]}, s), {s: 0, a: 0})
        for weight in (-1, float('inf'), float('nan')):
            with self.assertRaises(ValueError):
                f({a: [(b, weight)]}, s)
        # Equal priorities with unorderable objects cannot compare the node fields.
        self.assertEqual(f({s: [(a, 1), (b, 1)]}, s), {s: 0, a: 1, b: 1})
        rng = random.Random(56)
        for _ in range(160):
            n = rng.randrange(1, 15)
            adj = {i: [(j, rng.randrange(10)) for j in range(n) if rng.random()<.2] for i in range(n)}
            dist = {0: 0}
            for _ in range(n-1):
                for v, edges in adj.items():
                    if v in dist:
                        for u, w in edges:
                            candidate = dist[v]+w
                            if candidate < dist.get(u, float('inf')):
                                dist[u] = candidate
            self.assertEqual(f(adj, 0), dist)

    def test_rooms(self):
        f = namespace('Minimum rooms for half-open intervals')['min_rooms']
        self.assertEqual(f([]), 0)
        self.assertEqual(f([(0, 1), (1, 2), (2, 2)]), 1)
        self.assertEqual(f([(1, 1), (2, 2)]), 0)
        self.assertEqual(f([(0, 10), (0, 10), (2, 3)]), 3)
        with self.assertRaises(ValueError):
            f([(3, 2)])
        rng = random.Random(57)
        for _ in range(150):
            intervals = []
            for _ in range(rng.randrange(20)):
                start = rng.randrange(-5, 6)
                intervals.append((start, start+rng.randrange(7)))
            expected = max((sum(a<=t<b for a, b in intervals) for t in range(-5, 13)), default=0)
            before = intervals[:]
            self.assertEqual(f(intervals), expected)
            self.assertEqual(intervals, before)

    def test_cooldown(self):
        f = namespace('Construct a uniform-cooldown schedule')['cooldown_schedule']
        self.assertEqual(f([], 2), [])
        self.assertEqual(f('AAA', 2), ['A', None, None, 'A', None, None, 'A'])
        with self.assertRaises(ValueError):
            f([None], 1)
        with self.assertRaises(ValueError):
            f('AB', -1)
        def verify(tasks, cooldown):
            before = list(tasks)
            result = f(tasks, cooldown)
            self.assertEqual(tasks, before)
            self.assertEqual(Counter(x for x in result if x is not None), Counter(tasks))
            last = {}
            for time, task in enumerate(result):
                if task is not None:
                    if task in last:
                        self.assertGreaterEqual(time-last[task], cooldown+1)
                    last[task] = time
            counts = Counter(tasks)
            if not counts:
                expected = 0
            else:
                maximum = max(counts.values())
                tied = sum(value == maximum for value in counts.values())
                expected = max(len(tasks), (maximum-1)*(cooldown+1)+tied)
            self.assertEqual(len(result), expected, (tasks, cooldown, result))
        # Exhaustive small frequency distributions cover greedy scheduling ties.
        for amounts in itertools.product(range(4), repeat=4):
            tasks = [char for char, count in zip('ABCD', amounts) for _ in range(count)]
            for cooldown in range(4):
                verify(tasks, cooldown)
        a, b = object(), object()
        verify([a, a, b, b], 2)
        verify(['A', 'A'], 100000)
        # Idle expansion must consume a constant-space iterator, not a gap-sized list.
        from unittest.mock import patch
        import itertools as std_itertools
        seen_gaps = []
        def counted_repeat(value, amount):
            seen_gaps.append(amount)
            return std_itertools.repeat(value, amount)
        with patch.dict(f.__globals__, repeat=counted_repeat):
            self.assertEqual(len(f('AAA', 1000)), 2003)
        self.assertEqual(seen_gaps, [1000, 1000])

    def test_reorganize(self):
        f = namespace('Reorganize string without equal neighbors')['reorganize']
        self.assertEqual(f(''), '')
        self.assertEqual(f('aaab'), '')
        for amounts in itertools.product(range(5), repeat=3):
            text = ''.join(char*count for char, count in zip('abc', amounts))
            result = f(text)
            possible = not text or max(Counter(text).values()) <= (len(text)+1)//2
            if possible:
                self.assertEqual(Counter(result), Counter(text), text)
                self.assertTrue(all(a != b for a, b in zip(result, result[1:])), result)
            else:
                self.assertEqual(result, '')

    def test_smallest_range(self):
        f = namespace('Smallest range covering sorted lists')['smallest_range']
        self.assertIsNone(f([]))
        self.assertIsNone(f([[1], []]))
        self.assertEqual(f([[4,10,15,24,26], [0,9,12,20], [5,18,22,30]]), (20, 24))
        rng = random.Random(58)
        for _ in range(200):
            lists = [sorted(rng.randrange(-5, 6) for _ in range(rng.randrange(1, 5)))
                     for _ in range(rng.randrange(1, 5))]
            ranges = [(min(values), max(values)) for values in itertools.product(*lists)]
            expected = min(ranges, key=lambda pair: (pair[1]-pair[0], pair[0]))
            before = [row[:] for row in lists]
            self.assertEqual(f(lists), expected)
            self.assertEqual(lists, before)

    def test_pairs(self):
        f = namespace('K smallest pair sums from sorted arrays')['smallest_pairs']
        self.assertEqual(f([], [1], 2), [])
        self.assertEqual(f([1], [2], 0), [])
        self.assertEqual(f([1], [2], 10), [[1, 2]])
        with self.assertRaises(ValueError):
            f([1], [2], -1)
        rng = random.Random(59)
        for _ in range(200):
            a = sorted(rng.randrange(-5, 6) for _ in range(rng.randrange(10)))
            b = sorted(rng.randrange(-5, 6) for _ in range(rng.randrange(10)))
            k = rng.randrange(25)
            choices = sorted((x+y, i, j) for i, x in enumerate(a) for j, y in enumerate(b))[:k]
            expected = [[a[i], b[j]] for _, i, j in choices]
            self.assertEqual(f(a, b, k), expected)

    def test_mutable_priority(self):
        cls = namespace('Versioned mutable priority queue with compaction')['MutablePriorityQueue']
        q = cls()
        with self.assertRaises(IndexError):
            q.pop()
        self.assertFalse(q.remove('absent'))
        # Unique serials make equally prioritized unorderable dict payloads safe.
        a, b = object(), object()
        q.set(a, 1, {'id': 'a'})
        q.set(b, 1, {'id': 'b'})
        self.assertEqual(q.pop(), (a, 1, {'id': 'a'}))
        self.assertEqual(q.pop(), (b, 1, {'id': 'b'}))
        # Replacing a live key gets a new FIFO position among equal priorities.
        q.set(a, 1, {'version': 'old'})
        q.set(b, 1, {'version': 'b'})
        q.set(a, 1, {'version': 'new'})
        self.assertEqual(q.pop(), (b, 1, {'version': 'b'}))
        self.assertEqual(q.pop(), (a, 1, {'version': 'new'}))
        with self.assertRaises(IndexError):
            q.pop()
        rng = random.Random(60)
        q, model, serial = cls(), {}, 0
        for _ in range(5000):
            key = rng.randrange(80)
            choice = rng.random()
            if choice < .6:
                priority = rng.randrange(-10, 11)
                payload = {'version': serial}
                q.set(key, priority, payload)
                model[key] = (priority, serial, payload)
                serial += 1
            elif choice < .8:
                expected = key in model
                self.assertEqual(q.remove(key), expected)
                model.pop(key, None)
            elif model:
                best = min(model, key=lambda task: model[task][:2])
                priority, _, payload = model.pop(best)
                self.assertEqual(q.pop(), (best, priority, payload))
            else:
                with self.assertRaises(IndexError):
                    q.pop()
            self.assertEqual(len(q), len(model))
            self.assertLessEqual(len(q.heap), 2*len(q)+16)
        while model:
            best = min(model, key=lambda task: model[task][:2])
            priority, _, payload = model.pop(best)
            self.assertEqual(q.pop(), (best, priority, payload))
        with self.assertRaises(IndexError):
            q.pop()
        # Adversarial single pop: n small-priority stale entries precede all n live entries.
        # No rebuild threshold is crossed (H=2n <= 2a+16), so ONE pop drains n stale
        # heap entries, each with a logarithmic sift, before returning the live minimum.
        q, n = cls(), 2000
        for key in range(n):
            q.set(key, key, {'old': key})
        for key in range(n):
            q.set(key, n+key, {'new': key})
        self.assertEqual((len(q.heap), len(q)), (2*n, n))
        self.assertEqual(q.pop(), (0, n, {'new': 0}))
        self.assertEqual((len(q.heap), len(q)), (n-1, n-1))
        # Repeated replacement of one live key must compact, not retain all history.
        q = cls()
        for version in range(10000):
            q.set('same', -version, {'version': version})
            self.assertLessEqual(len(q.heap), 18)
        self.assertEqual(q.pop(), ('same', -9999, {'version': 9999}))
        self.assertEqual(len(q), 0)

    def test_zz_every_template_executed(self):
        self.assertEqual({name for name, _ in CALLED}, {row[0] for row in DATA['templates']})
        self.assertEqual(CALLED, EXPECTED, 'Missing actual function/method calls: ' + repr(EXPECTED-CALLED))

if __name__ == '__main__':
    unittest.main(verbosity=2)
