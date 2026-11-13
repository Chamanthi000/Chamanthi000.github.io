"""Run: python3 trees-template-tests.py. Deterministic, standard-library tests."""
import ast
import json
from pathlib import Path
import random
import unittest

DATA = json.loads(Path(__file__).with_name('trees-guide.json').read_text())
USED = set()

def namespace(name):
    row = next(t for t in DATA['templates'] if t[0] == name)
    code = '\n'.join(row[3])
    ast.parse(code)
    ns = {}
    exec(compile(code, name, 'exec'), ns)
    USED.add(name)
    return ns

def signature(root):
    out, stack = [], [root]
    while stack:
        node = stack.pop()
        if node is None:
            out.append(None)
        else:
            out.append(node.val)
            stack.extend((node.right, node.left))
    return out

def random_tree(Node, rng, n, unique=False):
    if not n:
        return None, []
    nodes = [Node(i if unique else rng.randrange(-5, 6)) for i in range(n)]
    slots = [(nodes[0], 'left'), (nodes[0], 'right')]
    for node in nodes[1:]:
        parent, side = slots.pop(rng.randrange(len(slots)))
        setattr(parent, side, node)
        slots.extend(((node, 'left'), (node, 'right')))
    return nodes[0], nodes

def walk(root):
    if root is None:
        return [], [], []
    lp, li, lo = walk(root.left)
    rp, ri, ro = walk(root.right)
    return [root.val]+lp+rp, li+[root.val]+ri, lo+ro+[root.val]

def inorder(root):
    stack, values = [], []
    while stack or root is not None:
        while root is not None:
            stack.append(root)
            root = root.left
        root = stack.pop()
        values.append(root.val)
        root = root.right
    return values

def bst(Node, values):
    root = None
    for value in values:
        if root is None:
            root = Node(value)
            continue
        current = root
        while current.val != value:
            side = 'left' if value < current.val else 'right'
            if getattr(current, side) is None:
                setattr(current, side, Node(value))
                break
            current = getattr(current, side)
    return root

def chain(Node, n, value=1):
    root = None
    for _ in range(n):
        root = Node(value, root)
    return root

class TreeTemplates(unittest.TestCase):
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

    def test_schema_all_code(self):
        self.assertEqual(DATA['id'], 'trees')
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

    def test_traversals(self):
        ns = namespace('Iterative DFS traversal orders')
        Node, f = ns['Node'], ns['traversals']
        self.assertEqual(f(None), ([], [], []))
        rng = random.Random(30)
        for n in range(60):
            root, _ = random_tree(Node, rng, n)
            before = signature(root)
            self.assertEqual(f(root), walk(root))
            self.assertEqual(signature(root), before)
        self.assertEqual(f(chain(Node, 3000)), ([1]*3000, [1]*3000, [1]*3000))

    def test_metrics(self):
        ns = namespace('Height balance and diameter in one pass')
        Node, f = ns['Node'], ns['tree_metrics']
        self.assertEqual(f(None), (0, True, 0))
        self.assertEqual(f(Node(0)), (1, True, 0))
        def oracle(root):
            if root is None:
                return 0, True, 0
            lh, lb, ld = oracle(root.left)
            rh, rb, rd = oracle(root.right)
            return 1+max(lh, rh), lb and rb and abs(lh-rh)<=1, max(ld, rd, lh+rh)
        rng = random.Random(31)
        for n in range(100):
            root, _ = random_tree(Node, rng, n)
            self.assertEqual(f(root), oracle(root))
        self.assertEqual(f(chain(Node, 3000)), (3000, False, 2999))

    def test_search_insert(self):
        ns = namespace('BST search and unique insertion')
        Node, search, insert = ns['Node'], ns['search_bst'], ns['insert_bst']
        self.assertIsNone(search(None, 0))
        rng = random.Random(32)
        root, expected = None, set()
        for _ in range(300):
            value = rng.randrange(-100, 101)
            root = insert(root, value)
            expected.add(value)
            self.assertEqual(inorder(root), sorted(expected))
            found = search(root, value)
            self.assertEqual(found.val, value)
            before = signature(root)
            same = insert(root, value)
            self.assertIs(same, root)
            self.assertEqual(signature(root), before)
        self.assertIsNone(search(root, 1000))

    def test_validate(self):
        ns = namespace('Validate strict BST')
        Node, f = ns['Node'], ns['validate_bst']
        self.assertTrue(f(None))
        self.assertTrue(f(Node(0)))
        self.assertFalse(f(Node(10, None, Node(15, Node(6)))))
        self.assertFalse(f(Node(2, Node(2))))
        self.assertTrue(f(Node('b', Node('a'), Node('z'))))
        self.assertTrue(f(bst(Node, range(2200))))
        rng = random.Random(33)
        for _ in range(150):
            root, _ = random_tree(Node, rng, rng.randrange(30))
            values = inorder(root)
            self.assertEqual(f(root), all(a < b for a, b in zip(values, values[1:])))

    def test_kth(self):
        ns = namespace('Kth smallest by inorder')
        Node, f = ns['Node'], ns['kth_smallest']
        for root, k in ((None, 1), (Node(1), 0), (Node(1), 2)):
            with self.assertRaises(ValueError):
                f(root, k)
        rng = random.Random(34)
        for _ in range(40):
            values = rng.sample(range(-100, 100), rng.randrange(1, 35))
            root = bst(Node, values)
            for k, value in enumerate(sorted(values), 1):
                self.assertEqual(f(root, k), value)
        self.assertEqual(f(bst(Node, range(2200)), 2200), 2199)

    def test_delete(self):
        ns = namespace('Iterative BST deletion')
        Node, f = ns['Node'], ns['delete_bst']
        self.assertIsNone(f(None, 1))
        self.assertIsNone(f(Node(1), 1))
        child = Node(2)
        self.assertIs(f(Node(1, None, child), 1), child)
        # Successor is deep and itself has a right child.
        root = Node(5, Node(2), Node(9, Node(6, None, Node(7)), Node(10)))
        root = f(root, 5)
        self.assertEqual(inorder(root), [2, 6, 7, 9, 10])
        rng = random.Random(35)
        for _ in range(45):
            values = rng.sample(range(-100, 100), 45)
            root, expected = bst(Node, values), set(values)
            for value in values+[1000]:
                root = f(root, value)
                expected.discard(value)
                self.assertEqual(inorder(root), sorted(expected))

    def test_lca_general(self):
        ns = namespace('General tree LCA with presence checks')
        Node, f = ns['Node'], ns['lca']
        a, b, absent = Node(7), Node(7), Node(7)
        root = Node(7, a, b)
        self.assertIs(f(root, a, b), root)
        self.assertIs(f(root, a, a), a)
        self.assertIs(f(root, root, b), root)
        self.assertIsNone(f(root, a, absent))
        self.assertIsNone(f(None, a, b))
        self.assertIsNone(f(root, None, b))
        rng = random.Random(36)
        for _ in range(70):
            root, nodes = random_tree(Node, rng, rng.randrange(1, 50))
            parents = {root: None}
            for node in nodes:
                for child in (node.left, node.right):
                    if child is not None:
                        parents[child] = node
            for _ in range(10):
                p, q = rng.choice(nodes), rng.choice(nodes)
                ancestors, current = set(), p
                while current is not None:
                    ancestors.add(current)
                    current = parents[current]
                current = q
                while current not in ancestors:
                    current = parents[current]
                self.assertIs(f(root, p, q), current)

    def test_lca_bst(self):
        ns = namespace('BST LCA by existing keys')
        Node, f = ns['Node'], ns['bst_lca']
        root = bst(Node, [6, 2, 8, 0, 4, 7, 9, 3, 5])
        self.assertIs(f(root, 2, 8), root)
        self.assertIs(f(root, 2, 4), root.left)
        self.assertEqual(f(root, 5, 3).val, 4)
        self.assertEqual(f(root, 3, 3).val, 3)
        self.assertIsNone(f(root, 2, 100))
        self.assertIsNone(f(None, 1, 1))
        deep = bst(Node, range(2200))
        self.assertEqual(f(deep, 2100, 2199).val, 2100)

    def test_root_leaf_sum(self):
        ns = namespace('Root-to-leaf path sum')
        Node, f = ns['Node'], ns['has_path_sum']
        self.assertFalse(f(None, 0))
        self.assertTrue(f(Node(0), 0))
        self.assertFalse(f(Node(5, Node(1)), 5))
        self.assertTrue(f(Node(5, Node(-7)), -2))
        def sums(node, total=0):
            if node is None:
                return []
            total += node.val
            if node.left is None and node.right is None:
                return [total]
            return sums(node.left, total)+sums(node.right, total)
        rng = random.Random(37)
        for _ in range(120):
            root, _ = random_tree(Node, rng, rng.randrange(40))
            expected = sums(root)
            for target in range(-12, 13):
                self.assertEqual(f(root, target), target in expected)
        self.assertTrue(f(chain(Node, 3000), 3000))

    def test_count_paths(self):
        ns = namespace('Count downward target-sum paths')
        Node, f = ns['Node'], ns['count_paths']
        self.assertEqual(f(None, 0), 0)
        self.assertEqual(f(Node(0, Node(0), Node(0)), 0), 5)
        self.assertEqual(f(chain(Node, 3, 0), 0), 6)
        def from_node(node, target, running=0):
            if node is None:
                return 0
            running += node.val
            return int(running == target)+from_node(node.left, target, running)+from_node(node.right, target, running)
        rng = random.Random(38)
        for _ in range(120):
            root, nodes = random_tree(Node, rng, rng.randrange(35))
            target = rng.randrange(-8, 9)
            self.assertEqual(f(root, target), sum(from_node(node, target) for node in nodes))
        self.assertEqual(f(chain(Node, 3000, 0), 0), 3000*3001//2)

    def test_max_path(self):
        ns = namespace('Maximum nonempty path sum')
        Node, f = ns['Node'], ns['max_path_sum']
        self.assertIsNone(f(None))
        self.assertEqual(f(Node(-3, Node(-8), Node(-2))), -2)
        self.assertEqual(f(Node(-10, Node(9), Node(20, Node(15), Node(7)))), 42)
        rng = random.Random(39)
        for _ in range(120):
            root, nodes = random_tree(Node, rng, rng.randrange(1, 30))
            adj = {node: [] for node in nodes}
            for node in nodes:
                for child in (node.left, node.right):
                    if child is not None:
                        adj[node].append(child)
                        adj[child].append(node)
            expected = float('-inf')
            for start in nodes:
                stack = [(start, None, 0)]
                while stack:
                    node, parent, value = stack.pop()
                    value += node.val
                    expected = max(expected, value)
                    stack.extend((child, node, value) for child in adj[node] if child is not parent)
            self.assertEqual(f(root), expected)
        self.assertEqual(f(chain(Node, 3000)), 3000)

    def test_codec(self):
        ns = namespace('Iterative integer tree codec')
        Node, encode, decode = ns['Node'], ns['serialize'], ns['deserialize']
        self.assertEqual(encode(None), '[null]')
        self.assertIsNone(decode('[null]'))
        self.assertNotEqual(encode(Node(1, Node(2))), encode(Node(1, None, Node(2))))
        for bad in ('', '[]', '{}', '[null,null]', '[1]', '[1,null]', '[1,null,null,null]',
                    '[true,null,null]', '[1.0,null,null]', '["1",null,null]', 'not json'):
            with self.assertRaises(ValueError, msg=bad):
                decode(bad)
        with self.assertRaises(ValueError):
            encode(Node(True))
        rng = random.Random(40)
        for n in range(80):
            root, nodes = random_tree(Node, rng, n)
            text = encode(root)
            rebuilt = decode(text)
            self.assertEqual(signature(rebuilt), signature(root))
            self.assertEqual(encode(rebuilt), text)
            if root is not None:
                self.assertIsNot(root, rebuilt)
        root = chain(Node, 3000, 10**30)
        self.assertEqual(signature(decode(encode(root))), signature(root))

    def test_reconstruct(self):
        ns = namespace('Reconstruct from preorder and inorder')
        Node, f = ns['Node'], ns['build_tree']
        self.assertIsNone(f([], []))
        for pre, ino in (([1], []), ([1, 1], [1, 1]), ([1], [2]), ([1, 2, 3], [3, 1, 2])):
            with self.assertRaises(ValueError):
                f(pre, ino)
        rng = random.Random(41)
        for n in range(100):
            root, _ = random_tree(Node, rng, n, unique=True)
            pre, ino, _ = walk(root)
            before = pre[:], ino[:]
            self.assertEqual(signature(f(pre, ino)), signature(root))
            self.assertEqual((pre, ino), before)
        n = 3000
        rebuilt = f(list(range(n)), list(range(n)))
        self.assertEqual(inorder(rebuilt), list(range(n)))
        self.assertIsNone(rebuilt.left)

    def test_balanced_build(self):
        ns = namespace('Sorted array to balanced BST')
        f = ns['balanced_bst']
        self.assertIsNone(f([]))
        for bad in ([1, 1], [2, 1]):
            with self.assertRaises(ValueError):
                f(bad)
        def check(node):
            if node is None:
                return 0
            a, b = check(node.left), check(node.right)
            self.assertLessEqual(abs(a-b), 1)
            return 1+max(a, b)
        for n in (1, 2, 3, 10, 100, 5000):
            values = list(range(n))
            root = f(values)
            self.assertEqual(inorder(root), values)
            self.assertLessEqual(check(root), n.bit_length())
            self.assertEqual(values, list(range(n)))

    def test_invert(self):
        ns = namespace('Invert a binary tree in place')
        Node, f = ns['Node'], ns['invert']
        self.assertIsNone(f(None))
        left, right = Node(2), Node(3)
        root = Node(1, left, right)
        self.assertIs(f(root), root)
        self.assertIs(root.left, right)
        self.assertIs(root.right, left)
        rng = random.Random(42)
        for n in range(70):
            root, _ = random_tree(Node, rng, n)
            before = signature(root)
            self.assertIs(f(f(root)), root)
            self.assertEqual(signature(root), before)
        root = chain(Node, 3000)
        before = signature(root)
        f(f(root))
        self.assertEqual(signature(root), before)

    def test_level_frontier(self):
        ns = namespace('Binary tree levels')
        Node, f = ns['Node'], ns['levels']
        self.assertEqual(f(None), [])
        self.assertEqual(f(Node(0)), [[0]])
        self.assertEqual(f(Node(1, Node(2, None, Node(4)), Node(3))), [[1],[2,3],[4]])
        self.assertEqual(f(chain(Node, 3000)), [[1]]*3000)

    def test_paired_shape_and_mirror(self):
        ns = namespace('Paired equality and mirror checks')
        Node, same, symmetric = ns['Node'], ns['same_tree'], ns['symmetric']
        self.assertTrue(same(None, None))
        self.assertFalse(same(Node(1), None))
        self.assertFalse(same(Node(1, Node(2)), Node(1, None, Node(2))))
        self.assertTrue(symmetric(None))
        self.assertTrue(symmetric(Node(0, Node(2, Node(3)), Node(2, None, Node(3)))))
        self.assertFalse(symmetric(Node(0, Node(2, Node(3)), Node(2, Node(3)))))
        self.assertTrue(same(chain(Node, 3000), chain(Node, 3000)))
        rng = random.Random(232)
        for n in range(60):
            root, _ = random_tree(Node, rng, n)
            def clone(node, mirror=False):
                if node is None:
                    return None
                a, b = clone(node.left, mirror), clone(node.right, mirror)
                return Node(node.val, b, a) if mirror else Node(node.val, a, b)
            self.assertTrue(same(root, clone(root)))
            self.assertTrue(same(root, clone(root, True), mirror=True))

    def test_lazy_iterator(self):
        ns = namespace('Lazy BST iterator')
        Node, cls = ns['Node'], ns['BSTIterator']
        it = cls(None)
        self.assertFalse(it.has_next())
        with self.assertRaises(StopIteration):
            next(it)
        rng = random.Random(233)
        for _ in range(100):
            values = rng.sample(range(-100, 100), rng.randrange(50))
            root = bst(Node, values)
            before = signature(root)
            it = cls(root)
            self.assertEqual(list(it), sorted(values))
            self.assertFalse(it.has_next())
            with self.assertRaises(StopIteration):
                next(it)
            self.assertEqual(signature(root), before)
        self.assertEqual(list(cls(bst(Node, range(2500)))), list(range(2500)))

    def test_floor_ceiling_successor(self):
        ns = namespace('BST floor ceiling and strict successor')
        Node, f, successor = ns['Node'], ns['floor_ceiling'], ns['successor']
        self.assertEqual(f(None, 1), (None, None))
        self.assertIsNone(successor(None, 1))
        rng = random.Random(234)
        for _ in range(100):
            values = rng.sample(range(-50, 51), rng.randrange(30))
            root = bst(Node, values)
            before = signature(root)
            for key in range(-55, 56):
                self.assertEqual(f(root, key), (max((v for v in values if v <= key), default=None),
                                               min((v for v in values if v >= key), default=None)))
                self.assertEqual(successor(root, key), min((v for v in values if v > key), default=None))
            self.assertEqual(signature(root), before)

    def test_reroot_distances(self):
        from collections import deque
        f = namespace('Reroot all-node distance sums')['distance_sums']
        self.assertEqual(f(0, []), [])
        self.assertEqual(f(1, []), [0])
        self.assertEqual(f(6, [(0,1),(0,2),(2,3),(2,4),(2,5)]), [8,12,6,10,10,10])
        for n, edges in ((-1,[]),(2,[]),(2,[(0,0)]),(4,[(0,1),(1,2),(2,0)]),(3,[(0,1),(0,1)]),(2,[(0,2)])):
            with self.assertRaises(ValueError):
                f(n, edges)
        rng = random.Random(235)
        for n in range(1, 80):
            edges = [(i,rng.randrange(i)) for i in range(1,n)]
            adj = [[] for _ in range(n)]
            for u,v in edges:
                adj[u].append(v)
                adj[v].append(u)
            expected = []
            for start in range(n):
                distance, q = {start:0}, deque([start])
                while q:
                    u = q.popleft()
                    for v in adj[u]:
                        if v not in distance:
                            distance[v] = distance[u]+1
                            q.append(v)
                expected.append(sum(distance.values()))
            self.assertEqual(f(n, iter(edges)), expected)
        n=3000
        self.assertEqual(f(n, ((i-1,i) for i in range(1,n))),
                         [i*(i+1)//2+(n-1-i)*(n-i)//2 for i in range(n)])

    def test_zz_every_template_executed(self):
        self.assertEqual(USED, {t[0] for t in DATA['templates']})

if __name__ == '__main__':
    unittest.main(verbosity=2)
