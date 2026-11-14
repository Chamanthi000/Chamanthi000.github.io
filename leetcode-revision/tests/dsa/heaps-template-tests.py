from call_coverage import load_template, verify
"""Run: python3 heaps-template-tests.py. Tests all code loaded from JSON."""
import ast
from collections import Counter
from fractions import Fraction
import itertools
import json
from pathlib import Path
import random
import unittest

DATA = json.loads(Path(__file__).with_name('heaps-guide.json').read_text())
USED = set()

def namespace(name):
    row = next(row for row in DATA['templates'] if row[0] == name)
    ns = load_template(row)
    USED.add(name)
    return ns

class HeapTemplates(unittest.TestCase):
    def test_supplemental_alignment_and_operation_outputs(self):
        import contextlib
        import io
        fields = {'operationExamples': ('operations', ('code','result','use','mutation')),
                  'fundamentalDetails': ('fundamentals', ('why','use','result','edge','takeaway')),
                  'patternDetails': ('patterns', ('steps','templates','related','variations')),
                  'templateDetails': ('templates', ('pattern','preconditions','observation')),
                  'practiceDetails': ('practice', ('insight','secondary'))}
        names = {row[0] for row in DATA['templates']}
        mapped = set()
        for field, (base, keys) in fields.items():
            self.assertEqual(len(DATA[field]), len(DATA[base]), field)
            for entry in DATA[field]:
                self.assertEqual(set(entry), set(keys), field)
                self.assertTrue(all(entry[key] for key in keys), (field, entry))
        for entry in DATA['patternDetails']:
            self.assertTrue(set(entry['templates']) <= names)
            mapped.update(entry['templates'])
        self.assertEqual(mapped, names)
        for row, entry in zip(DATA['operations'], DATA['operationExamples']):
            with self.subTest(operation=row[1]):
                code = '\n'.join(entry['code'])
                ast.parse(code)
                output = io.StringIO()
                with contextlib.redirect_stdout(output):
                    exec(compile(code, row[1], 'exec'), {})
                self.assertEqual(output.getvalue().strip(), entry['result'])
        self.assertGreaterEqual(len(DATA['decisionProcess']), 3)
        for source in DATA['sources']:
            self.assertEqual(set(source), {'title','url','note'})
            self.assertTrue(source['url'].startswith('https://'))

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

    def test_optimal_merge_cost(self):
        from functools import lru_cache
        f = namespace('Optimal nonnegative merge cost')['merge_cost']
        self.assertEqual(f([]), 0)
        self.assertEqual(f([7]), 0)
        self.assertEqual(f([2,3,7]), 17)
        for bad in ([-1], [float('nan')], [float('inf')]):
            with self.assertRaises(ValueError):
                f(bad)
        @lru_cache(None)
        def oracle(values):
            if len(values)<2:
                return 0
            return min(values[i]+values[j]+oracle(tuple(sorted(
                [v for index,v in enumerate(values) if index not in (i,j)]+[values[i]+values[j]])))
                for i in range(len(values)) for j in range(i+1,len(values)))
        rng=random.Random(241)
        for _ in range(100):
            values=[rng.randrange(8) for _ in range(rng.randrange(7))]
            before=values[:]
            self.assertEqual(f(values),oracle(tuple(sorted(values))))
            self.assertEqual(values,before)

    def test_offline_covering_intervals(self):
        f=namespace('Offline minimum covering intervals')['minimum_intervals']
        self.assertEqual(f([], [1,1]), [-1,-1])
        self.assertEqual(f([(1,4),(2,4),(3,6),(4,4)], [2,3,4,5]), [3,3,1,4])
        self.assertEqual(f([(0,10),(2,2)], [10,2,2,11]), [11,1,1,-1])
        self.assertEqual(f([], []), [])
        with self.assertRaises(ValueError):
            f([(2,1)], [1])
        rng=random.Random(242)
        for _ in range(300):
            intervals=[tuple(sorted((rng.randrange(-8,9),rng.randrange(-8,9)))) for _ in range(rng.randrange(20))]
            queries=[rng.randrange(-10,11) for _ in range(rng.randrange(20))]
            expected=[min((b-a+1 for a,b in intervals if a<=q<=b),default=-1) for q in queries]
            before=(intervals[:],queries[:])
            self.assertEqual(f(intervals,queries),expected)
            self.assertEqual((intervals,queries),before)

    def test_eligible_capital(self):
        f=namespace('Maximum capital from eligible projects')['maximize_capital']
        self.assertEqual(f(2,0,[0,1,1],[1,2,3]),4)
        self.assertEqual(f(99,5,[0,0],[0,-1]),5)
        self.assertEqual(f(0,0,[0],[100]),0)
        self.assertEqual(f(2,0,[1],[100]),0)
        for args in ((-1,0,[],[]),(1,0,[0],[])):
            with self.assertRaises(ValueError):
                f(*args)
        def oracle(k,capital,requirements,profits,used=0):
            best=capital
            if not k:
                return best
            for i,(required,profit) in enumerate(zip(requirements,profits)):
                if not (used>>i)&1 and required<=capital:
                    best=max(best,oracle(k-1,capital+profit,requirements,profits,used|(1<<i)))
            return best
        rng=random.Random(243)
        for _ in range(200):
            n=rng.randrange(7)
            requirements=[rng.randrange(7) for _ in range(n)]
            profits=[rng.randrange(-2,6) for _ in range(n)]
            k,capital=rng.randrange(5),rng.randrange(4)
            before=(requirements[:],profits[:])
            self.assertEqual(f(k,capital,requirements,profits),oracle(k,capital,requirements,profits))
            self.assertEqual((requirements,profits),before)

    def test_zz_every_template_executed(self):
        self.assertEqual(USED, {t[0] for t in DATA['templates']})

if __name__ == '__main__':
    result = unittest.main(verbosity=2, exit=False)
    if not result.result.wasSuccessful():
        raise SystemExit(1)
    verify(DATA)
