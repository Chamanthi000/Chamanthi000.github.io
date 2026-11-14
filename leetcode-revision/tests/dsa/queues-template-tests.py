from call_coverage import load_template, verify
"""Run: python3 queues-template-tests.py. No external dependencies."""
import ast
import copy
import heapq
import itertools
import json
from pathlib import Path
import random
import unittest
from collections import deque

DATA = json.loads(Path(__file__).with_name('queues-guide.json').read_text())
USED = set()

def namespace(name):
    row = next(row for row in DATA['templates'] if row[0] == name)
    ns = load_template(row)
    USED.add(name)
    return ns

class QueueTemplates(unittest.TestCase):
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
        self.assertEqual(DATA['id'], 'queues')
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
        for row in DATA['patterns']:
            self.assertIn(row[1], ('CORE', 'IMPORTANT', 'ADVANCED', 'SPECIALIST'))
        self.assertEqual(len({t[0] for t in DATA['templates']}), len(DATA['templates']))

    def test_shortest_path(self):
        f = namespace('Unweighted shortest path')['shortest_path']
        self.assertEqual(f({}, None, None), [None])
        self.assertEqual(f({}, 0, 2), [])
        adj = {0: [0, 1, 1, 3], 1: [2], 3: [4], 4: [2]}
        before = copy.deepcopy(adj)
        self.assertEqual(f(adj, 0, 2), [0, 1, 2])
        self.assertEqual(adj, before)
        rng = random.Random(11)
        for _ in range(60):
            n = rng.randrange(1, 12)
            graph = {i: [j for j in range(n) if rng.random() < .2] for i in range(n)}
            source, target = rng.randrange(n), rng.randrange(n)
            distance = {source: 0}
            q = deque([source])
            while q:
                v = q.popleft()
                for u in graph[v]:
                    if u not in distance:
                        distance[u] = distance[v] + 1
                        q.append(u)
            path = f(graph, source, target)
            if target not in distance:
                self.assertEqual(path, [])
            else:
                self.assertEqual((path[0], path[-1], len(path)-1), (source, target, distance[target]))
                self.assertTrue(all(v in graph[u] for u, v in zip(path, path[1:])))

    def test_levels(self):
        ns = namespace('Binary tree levels')
        Node, f = ns['Node'], ns['levels']
        self.assertEqual(f(None), [])
        self.assertEqual(f(Node(0)), [[0]])
        root = Node(1, Node(2, None, Node(4)), Node(3))
        self.assertEqual(f(root), [[1], [2, 3], [4]])
        chain = None
        for i in reversed(range(2500)):
            chain = Node(i, chain)
        self.assertEqual(f(chain), [[i] for i in range(2500)])

    def test_nearest_zero(self):
        f = namespace('Distance to nearest zero')['nearest_zero']
        self.assertEqual(f([]), [])
        self.assertEqual(f([[]]), [[]])
        self.assertEqual(f([[1, 1]]), [[-1, -1]])
        self.assertEqual(f([[0, 1, 1], [1, 1, 0]]), [[0, 1, 1], [1, 1, 0]])
        for bad in ([[0], [0, 1]], [[2]]):
            with self.assertRaises(ValueError):
                f(bad)
        rng = random.Random(12)
        for _ in range(80):
            rows, cols = rng.randrange(1, 6), rng.randrange(1, 6)
            grid = [[rng.randrange(2) for _ in range(cols)] for _ in range(rows)]
            before = copy.deepcopy(grid)
            zeros = [(r, c) for r in range(rows) for c in range(cols) if grid[r][c] == 0]
            expected = [[min((abs(r-a)+abs(c-b) for a, b in zeros), default=-1)
                         for c in range(cols)] for r in range(rows)]
            self.assertEqual(f(grid), expected)
            self.assertEqual(grid, before)

    def test_window_max(self):
        f = namespace('Sliding window maximum')['window_max']
        for a, k in (([], 1), ([1], 0), ([1], 2)):
            with self.assertRaises(ValueError):
                f(a, k)
        rng = random.Random(13)
        examples = [[5]*8, list(range(8)), list(range(8, 0, -1)), [-2]]
        examples += [[rng.randrange(-8, 9) for _ in range(rng.randrange(1, 20))] for _ in range(100)]
        for a in examples:
            for k in range(1, len(a)+1):
                original = a[:]
                self.assertEqual(f(a, k), [max(a[i:i+k]) for i in range(len(a)-k+1)])
                self.assertEqual(a, original)

    def test_dual_deques(self):
        f = namespace('Longest bounded-range window')['longest_bounded']
        self.assertEqual(f([], 0), 0)
        with self.assertRaises(ValueError):
            f([1], -1)
        rng = random.Random(14)
        for _ in range(200):
            a = [rng.randrange(-6, 7) for _ in range(rng.randrange(15))]
            limit = rng.randrange(8)
            expected = max((j-i for i in range(len(a)) for j in range(i+1, len(a)+1)
                            if max(a[i:j])-min(a[i:j]) <= limit), default=0)
            self.assertEqual(f(a, limit), expected, (a, limit))

    def test_shortest_prefix(self):
        f = namespace('Shortest threshold subarray with negatives')['shortest_at_least']
        for a, target, expected in (([], 0, -1), ([-5], 0, -1), ([0], 0, 1),
                                    ([2, -1, 2], 3, 3), ([84, -37, 32, 40, 95], 167, 3)):
            self.assertEqual(f(a, target), expected)
        rng = random.Random(15)
        for _ in range(500):
            a = [rng.randrange(-8, 9) for _ in range(rng.randrange(14))]
            target = rng.randrange(-10, 20)
            expected = min((j-i for i in range(len(a)) for j in range(i+1, len(a)+1)
                            if sum(a[i:j]) >= target), default=-1)
            self.assertEqual(f(a, target), expected, (a, target))

    def test_zero_one_bfs(self):
        f = namespace('Zero–one shortest distances')['zero_one_bfs']
        self.assertEqual(f({}, 's'), {'s': 0})
        self.assertEqual(f({'s': [('a', 1), ('b', 0)], 'b': [('a', 0)], 'a': [('s', 0)]}, 's'),
                         {'s': 0, 'a': 0, 'b': 0})
        with self.assertRaises(ValueError):
            f({99: [(100, 2)]}, 0)
        rng = random.Random(16)
        for _ in range(120):
            n = rng.randrange(1, 12)
            graph = {i: [(j, rng.randrange(2)) for j in range(n) if rng.random() < .25] for i in range(n)}
            expected, heap = {0: 0}, [(0, 0)]
            while heap:
                d, v = heapq.heappop(heap)
                if expected[v] != d:
                    continue
                for u, w in graph[v]:
                    if d+w < expected.get(u, float('inf')):
                        expected[u] = d+w
                        heapq.heappush(heap, (d+w, u))
            self.assertEqual(f(graph, 0), expected)

    def test_topological(self):
        f = namespace('Kahn topological order')['topological_order']
        self.assertEqual(f(0, []), [])
        self.assertEqual(f(1, [(0, 0)]), [])
        self.assertEqual(f(3, [(0, 1), (1, 0)]), [])
        for n, edges in ((-1, []), (1, [(0, 1)])):
            with self.assertRaises(ValueError):
                f(n, edges)
        rng = random.Random(17)
        for _ in range(80):
            n = rng.randrange(1, 20)
            edges = [(i, j) for i in range(n) for j in range(i+1, n) if rng.random() < .2]
            edges += edges[:3]
            order = f(n, edges)
            self.assertEqual(sorted(order), list(range(n)))
            position = {v: i for i, v in enumerate(order)}
            self.assertTrue(all(position[u] < position[v] for u, v in edges))

    def test_circular_queue(self):
        cls = namespace('Fixed-capacity circular queue')['CircularQueue']
        for k in (0, -1):
            with self.assertRaises(ValueError):
                cls(k)
        rng = random.Random(18)
        for k in (1, 2, 7):
            q, expected = cls(k), deque()
            for _ in range(1200):
                if rng.random() < .55:
                    value = rng.choice([None, 0, 1, -1])
                    allowed = len(expected) < k
                    self.assertEqual(q.enqueue(value), allowed)
                    if allowed:
                        expected.append(value)
                elif expected:
                    self.assertEqual(q.peek(), expected[0])
                    self.assertEqual(q.dequeue(), expected.popleft())
                else:
                    with self.assertRaises(IndexError):
                        q.dequeue()
                    with self.assertRaises(IndexError):
                        q.peek()
                self.assertEqual(len(q), len(expected))
                self.assertEqual(len(q.buffer), k)
            while expected:
                self.assertEqual(q.dequeue(), expected.popleft())
            self.assertTrue(all(x is None for x in q.buffer))

    def test_two_stack(self):
        cls = namespace('Queue using two stacks')['TwoStackQueue']
        q, expected = cls(), deque()
        with self.assertRaises(IndexError):
            q.peek()
        with self.assertRaises(IndexError):
            q.pop()
        rng = random.Random(19)
        for _ in range(3000):
            if not expected or rng.random() < .6:
                value = rng.randrange(100)
                q.push(value)
                expected.append(value)
            else:
                self.assertEqual(q.peek(), expected[0])
                self.assertEqual(q.pop(), expected.popleft())
            self.assertEqual(len(q), len(expected))
        while expected:
            self.assertEqual(q.pop(), expected.popleft())

    def test_recent(self):
        cls = namespace('Recent ordered event count')['RecentCounter']
        q = cls()
        self.assertEqual([q.ping(t) for t in (1, 100, 3001, 3002)], [1, 2, 3, 3])
        before = (q.last, list(q.times))
        with self.assertRaises(ValueError):
            q.ping(3000)
        self.assertEqual((q.last, list(q.times)), before)
        q = cls(0)
        self.assertEqual([q.ping(t) for t in (0, 0, 1)], [1, 2, 1])
        with self.assertRaises(ValueError):
            cls(-1)
        rng = random.Random(20)
        times, q, t = [], cls(8), 0
        for _ in range(400):
            t += rng.randrange(5)
            times.append(t)
            self.assertEqual(q.ping(t), sum(t-8 <= x <= t for x in times))

    def test_bipartite(self):
        f = namespace('Bipartite graph coloring')['bipartite']
        for adj, expected in (([], True), ([[]], True), ([[0]], False),
                              ([[1, 2], [0, 2], [0, 1]], False), ([[], [2], [1]], True)):
            self.assertEqual(f(adj), expected)
        with self.assertRaises(ValueError):
            f([[1]])
        rng = random.Random(21)
        for _ in range(90):
            n = rng.randrange(1, 8)
            edges = [(i, j) for i in range(n) for j in range(i, n) if rng.random() < .2]
            adj = [[] for _ in range(n)]
            for i, j in edges:
                adj[i].append(j)
                adj[j].append(i)
            expected = any(all(bits[i] != bits[j] for i, j in edges)
                           for bits in itertools.product((0, 1), repeat=n))
            self.assertEqual(f(adj), expected)

    def test_senate_index_queues(self):
        f = namespace('Round-robin senate index queues')['senate_winner']
        for bad in ('', 'X', 'RDX'):
            with self.assertRaises(ValueError):
                f(bad)
        def oracle(s):
            q, banned = deque(s), {'R': 0, 'D': 0}
            alive = {'R': s.count('R'), 'D': s.count('D')}
            while alive['R'] and alive['D']:
                actor = q.popleft()
                if banned[actor]:
                    banned[actor] -= 1
                    alive[actor] -= 1
                else:
                    banned['D' if actor == 'R' else 'R'] += 1
                    q.append(actor)
            return 'Radiant' if alive['R'] else 'Dire'
        for n in range(1, 10):
            for bits in itertools.product('RD', repeat=n):
                s = ''.join(bits)
                self.assertEqual(f(s), oracle(s), s)
        self.assertEqual(f('RD' * 10000), 'Radiant')

    def test_implicit_lock_states(self):
        f = namespace('Implicit lock-state shortest moves')['lock_moves']
        self.assertEqual(f('0000'), 0)
        self.assertEqual(f('0000', ['0000']), -1)
        self.assertEqual(f('0202', ['0201','0101','0102','1212','2002']), 6)
        self.assertEqual(f('1', ['9','1']), -1)
        self.assertEqual(f('5', ['1','9']), -1)
        for target in ('', 'x', '１２'):
            with self.assertRaises(ValueError):
                f(target)
        with self.assertRaises(ValueError):
            f('00', ['1'])
        for target in itertools.product('0123456789', repeat=2):
            target = ''.join(target)
            expected = sum(min(int(c), 10-int(c)) for c in target)
            self.assertEqual(f(target), expected)

    def test_two_ended_ring(self):
        cls = namespace('Fixed-capacity circular deque')['CircularDeque']
        for bad in (0, -1, 1.5, True):
            with self.assertRaises(ValueError):
                cls(bad)
        rng = random.Random(225)
        for capacity in (1, 2, 7):
            actual, expected = cls(capacity), deque()
            for _ in range(2500):
                operation = rng.randrange(4)
                value = rng.choice([None, 0, -1, 'x'])
                if operation < 2:
                    allowed = len(expected) < capacity
                    method = 'append' if operation == 0 else 'appendleft'
                    self.assertEqual(getattr(actual, method)(value), allowed)
                    if allowed:
                        getattr(expected, method)(value)
                else:
                    method = 'pop' if operation == 2 else 'popleft'
                    if expected:
                        self.assertEqual(getattr(actual, method)(), getattr(expected, method)())
                    else:
                        with self.assertRaises(IndexError):
                            getattr(actual, method)()
                self.assertEqual(len(actual), len(expected))
                retained = [actual.buffer[(actual.head+i)%capacity] for i in range(len(actual))]
                self.assertEqual(retained, list(expected))
            while expected:
                self.assertEqual(actual.popleft(), expected.popleft())
            self.assertTrue(all(x is None for x in actual.buffer))

    def test_zz_every_template_executed(self):
        self.assertEqual(USED, {t[0] for t in DATA['templates']})

if __name__ == '__main__':
    result = unittest.main(verbosity=2, exit=False)
    if not result.result.wasSuccessful():
        raise SystemExit(1)
    verify(DATA)
