"""Run: python3 graphs-template-tests.py (Python 3.10+, standard library)."""
import ast
import copy
import itertools
import json
import random
import unittest
from collections import deque
from pathlib import Path

DATA = json.loads(Path(__file__).with_name('graphs-guide.json').read_text())

def fresh(index):
    namespace = {}
    code = '\n'.join(DATA['templates'][index][3])
    exec(compile(ast.parse(code), f'graph_template_{index}', 'exec'), namespace)
    return namespace

def reach(adj, start):
    seen, stack = {start}, [start]
    while stack:
        for v in adj[stack.pop()]:
            if v not in seen:
                seen.add(v)
                stack.append(v)
    return seen

def component_count(n, edges, omit=None):
    adj = [[] for _ in range(n)]
    for i, (u, v) in enumerate(edges):
        if i != omit:
            adj[u].append(v)
            adj[v].append(u)
    seen = set()
    count = 0
    for u in range(n):
        if u not in seen:
            seen |= reach(adj, u)
            count += 1
    return count

class GraphTemplates(unittest.TestCase):
    def test_schema_and_all_fundamentals(self):
        sizes = {'operations': 6, 'fundamentals': 6, 'patterns': 10,
                 'recognize': 3, 'contrasts': 2, 'edges': 3, 'mistakes': 2,
                 'impress': 2, 'memory': 3, 'templates': 5, 'practice': 5}
        for key, size in sizes.items():
            self.assertTrue(DATA[key], key)
            self.assertTrue(all(len(row) == size for row in DATA[key]), key)
        for i, row in enumerate(DATA['fundamentals']):
            code = '\n'.join(row[2])
            exec(compile(ast.parse(code), f'fundamental_{i}', 'exec'), {})
        for i in range(len(DATA['templates'])):
            fresh(i)

    def test_bfs_path(self):
        f = fresh(0)['bfs_path']
        adj = [[1, 2, 1], [3], [3], [], []]
        saved = copy.deepcopy(adj)
        dist, path = f(adj, 0, 3)
        self.assertEqual(dist, [0, 1, 1, 2, -1])
        self.assertEqual(len(path)-1, dist[3])
        self.assertEqual(path[0], 0)
        self.assertEqual(path[-1], 3)
        self.assertTrue(all(v in adj[u] for u, v in zip(path, path[1:])))
        self.assertEqual(f(adj, 0, 4)[1], [])
        self.assertEqual(f(adj, 0, 0)[1], [0])
        self.assertEqual(adj, saved)
        for source, target in [(-1, 0), (0, 5)]:
            with self.assertRaises(ValueError):
                f(adj, source, target)
        with self.assertRaises(ValueError):
            f([], 0, 0)
        chain = [[i+1] if i < 4999 else [] for i in range(5000)]
        self.assertEqual(f(chain, 0, 4999)[0][-1], 4999)

    def test_component_labels(self):
        f = fresh(1)['component_labels']
        self.assertEqual(f([]), (0, []))
        self.assertEqual(f([[], [], []]), (3, [0, 1, 2]))
        count, labels = f([[1, 1], [0, 0], [2], []])
        self.assertEqual(count, 3)
        self.assertEqual(labels[0], labels[1])
        self.assertNotEqual(labels[1], labels[2])
        rng = random.Random(10)
        for n in range(1, 9):
            for _ in range(15):
                adj = [[] for _ in range(n)]
                for u in range(n):
                    for v in range(u, n):
                        if rng.random() < .22:
                            adj[u].append(v)
                            adj[v].append(u)
                count, labels = f(adj)
                self.assertEqual(count, len(set(labels)))
                for u in range(n):
                    reachable = reach(adj, u)
                    for v in range(n):
                        self.assertEqual(labels[u] == labels[v], v in reachable)

    def test_multisource_grid(self):
        f = fresh(2)['nearest_sources']
        grid = [[0, 0, 1], [0, 0, 0]]
        saved = copy.deepcopy(grid)
        self.assertEqual(f(grid, [(0,0), (0,0), (1,2)]), [[0,1,-1],[1,1,0]])
        self.assertEqual(f([[0,1,0]], [(0,0)]), [[0,-1,-1]])
        self.assertEqual(f([[0]], []), [[-1]])
        self.assertEqual(f([], []), [])
        self.assertEqual(f([[]], []), [[]])
        self.assertEqual(grid, saved)
        for bad_grid, sources in [([[0], []], []), ([[1]], [(0,0)]), ([], [(0,0)]), ([[0]], [(-1,0)])]:
            with self.assertRaises(ValueError):
                f(bad_grid, sources)

    def test_directed_cycle_frames(self):
        f = fresh(3)['has_directed_cycle']
        self.assertFalse(f([]))
        self.assertFalse(f([[1,2],[3],[3],[]]))
        self.assertFalse(f([[1,1],[]]))
        self.assertTrue(f([[0]]))
        self.assertTrue(f([[],[2],[1]]))
        rng = random.Random(11)
        topo = fresh(4)['topological_order']
        for n in range(8):
            for _ in range(30):
                adj = [[v for v in range(n) if rng.random() < .2] for u in range(n)]
                self.assertEqual(f(adj), topo(adj) is None)
        chain = [[i+1] if i < 4999 else [] for i in range(5000)]
        self.assertFalse(f(chain))
        chain[-1].append(0)
        self.assertTrue(f(chain))

    def test_topological_order(self):
        f = fresh(4)['topological_order']
        self.assertEqual(f([]), [])
        self.assertIsNone(f([[1],[0]]))
        self.assertIsNone(f([[],[1]]))
        adj = [[1,1,2],[3],[3],[],[]]
        saved = copy.deepcopy(adj)
        order = f(adj)
        self.assertEqual(set(order), set(range(5)))
        position = {u:i for i,u in enumerate(order)}
        self.assertTrue(all(position[u] < position[v] for u,row in enumerate(adj) for v in row))
        self.assertEqual(adj, saved)

    def test_bipartite(self):
        f = fresh(5)['bipartite_colors']
        self.assertEqual(f([]), [])
        self.assertIsNone(f([[0]]))
        self.assertIsNone(f([[1,2],[0,2],[0,1]]))
        adj = [[1],[0], [3,3], [2,2], []]
        color = f(adj)
        self.assertTrue(all(color[u] != color[v] for u,row in enumerate(adj) for v in row))
        rng = random.Random(12)
        for n in range(1, 7):
            for _ in range(25):
                adj = [[] for _ in range(n)]
                for u in range(n):
                    for v in range(u,n):
                        if rng.random() < .2:
                            adj[u].append(v)
                            adj[v].append(u)
                possible = any(all(bits[u] != bits[v] for u,row in enumerate(adj) for v in row)
                               for bits in itertools.product((0,1), repeat=n))
                self.assertEqual(f(adj) is not None, possible)

    def test_dijkstra(self):
        f = fresh(6)['dijkstra']
        inf = float('inf')
        adj = [[(1,10),(2,1)], [(3,1)], [(1,1),(2,0)], [], []]
        saved = copy.deepcopy(adj)
        self.assertEqual(f(adj,0), [0,2,1,3,inf])
        self.assertEqual(adj,saved)
        for graph, source in [([],0), ([[]],-1), ([[(0,-1)]],0), ([[(1,0)]],0)]:
            with self.assertRaises(ValueError):
                f(graph,source)
        rng = random.Random(13)
        bf = fresh(8)['bellman_ford']
        for n in range(1,9):
            for _ in range(30):
                adj = [[] for _ in range(n)]
                edges = []
                for u in range(n):
                    for v in range(n):
                        if rng.random() < .2:
                            w = rng.randrange(10)
                            adj[u].append((v,w))
                            edges.append((u,v,w))
                self.assertEqual(f(adj,0), bf(n,edges,0))

    def test_zero_one_bfs(self):
        f = fresh(7)['zero_one_bfs']
        self.assertEqual(f([[(1,1),(2,0)],[],[(1,0)]],0), [0,0,0])
        self.assertEqual(f([[(0,0)],[]],0), [0,float('inf')])
        for graph, source in [([],0), ([[(0,2)]],0), ([[(1,0)]],0), ([[]],1)]:
            with self.assertRaises(ValueError):
                f(graph,source)
        rng = random.Random(14)
        dij = fresh(6)['dijkstra']
        for n in range(1,9):
            for _ in range(30):
                adj = [[(v,rng.randrange(2)) for v in range(n) if rng.random() < .25] for u in range(n)]
                saved = copy.deepcopy(adj)
                self.assertEqual(f(adj,0), dij(adj,0))
                self.assertEqual(adj,saved)

    def test_bellman_ford(self):
        f = fresh(8)['bellman_ford']
        self.assertEqual(f(3,[(0,1,2),(0,2,5),(2,1,-4)],0), [0,1,5])
        self.assertEqual(f(2,[(1,1,-1)],0), [0,float('inf')])
        self.assertEqual(f(1,[],0),[0])
        for n, edges, source in [(0,[],0),(2,[(0,1,0),(1,1,-1)],0),(1,[(0,1,1)],0),(-1,[],0)]:
            with self.assertRaises(ValueError):
                f(n,edges,source)
        edges = [(0,1,-2),(1,2,3)]
        saved = edges[:]
        self.assertEqual(f(3,edges,0),[0,-2,1])
        self.assertEqual(edges,saved)

    def test_dag_shortest_paths(self):
        f = fresh(9)['dag_shortest_paths']
        bf = fresh(8)['bellman_ford']
        self.assertEqual(f([[(1,-5)],[],[]],0),[0,-5,float('inf')])
        for graph, source in [([],0), ([[]],-1), ([[],[(1,0)]],0)]:
            with self.assertRaises(ValueError):
                f(graph,source)
        rng = random.Random(15)
        for n in range(1,10):
            for _ in range(25):
                adj = [[] for _ in range(n)]
                edges = []
                for u in range(n):
                    for v in range(u+1,n):
                        if rng.random() < .35:
                            w = rng.randrange(-10,11)
                            edges.append((u,v,w))
                            adj[u].append((v,w))
                self.assertEqual(f(adj,0),bf(n,edges,0))

    def test_floyd_warshall(self):
        f = fresh(10)['floyd_warshall']
        inf = float('inf')
        self.assertEqual(f(0,[]),[])
        self.assertEqual(f(3,[(0,1,9),(0,1,2),(1,2,-3)]), [[0,2,-1],[inf,0,-3],[inf,inf,0]])
        for n, edges in [(-1,[]),(2,[(0,2,1)]),(2,[(1,1,-1)])]:
            with self.assertRaises(ValueError):
                f(n,edges)
        rng = random.Random(16)
        dij = fresh(6)['dijkstra']
        for n in range(1,8):
            for _ in range(15):
                adj = [[] for _ in range(n)]
                edges = []
                for u in range(n):
                    for v in range(n):
                        if rng.random() < .25:
                            w = rng.randrange(8)
                            edges.append((u,v,w))
                            adj[u].append((v,w))
                self.assertEqual(f(n,edges),[dij(adj,u) for u in range(n)])

    def test_prim_weight(self):
        f = fresh(11)['prim_weight']
        self.assertEqual(f([]),0)
        self.assertEqual(f([[(0,-10)]]),0)
        self.assertIsNone(f([[],[]]))
        self.assertEqual(f([[(1,-4),(1,2)],[(0,-4),(0,2)]]),-4)
        rng = random.Random(17)
        for n in range(1,6):
            for _ in range(25):
                edges = [(u,v,rng.randrange(-3,7)) for u in range(n) for v in range(u+1,n) if rng.random() < .6]
                adj = [[] for _ in range(n)]
                for u,v,w in edges:
                    adj[u].append((v,w))
                    adj[v].append((u,w))
                totals = []
                for subset in itertools.combinations(edges,n-1):
                    if component_count(n,[(u,v) for u,v,w in subset]) == 1:
                        totals.append(sum(w for u,v,w in subset))
                expected = min(totals) if totals else (0 if n == 1 else None)
                self.assertEqual(f(adj),expected)

    def test_kosaraju(self):
        f = fresh(12)['strongly_connected_components']
        self.assertEqual(f([]),(0,[]))
        rng = random.Random(18)
        for n in range(1,9):
            for _ in range(30):
                adj = [[v for v in range(n) if rng.random() < .2] for u in range(n)]
                count, labels = f(adj)
                reachable = [reach(adj,u) for u in range(n)]
                self.assertEqual(count,len(set(labels)))
                for u in range(n):
                    for v in range(n):
                        self.assertEqual(labels[u] == labels[v], v in reachable[u] and u in reachable[v])
        chain = [[i+1] if i < 4999 else [] for i in range(5000)]
        self.assertEqual(f(chain)[0],5000)

    def test_bridges_multigraph(self):
        f = fresh(13)['bridges']
        self.assertEqual(f(0,[]),[])
        self.assertEqual(f(2,[(0,1),(0,1),(0,0)]),[])
        self.assertEqual(set(f(4,[(0,1),(1,2),(2,0),(2,3)])),{3})
        for n,edges in [(-1,[]),(2,[(-1,0)]),(2,[(0,2)])]:
            with self.assertRaises(ValueError):
                f(n,edges)
        rng = random.Random(19)
        for n in range(1,8):
            for _ in range(30):
                edges = [(rng.randrange(n),rng.randrange(n)) for i in range(rng.randrange(12))]
                saved = edges[:]
                baseline = component_count(n,edges)
                expected = {i for i in range(len(edges)) if component_count(n,edges,i) > baseline}
                self.assertEqual(set(f(n,edges)),expected)
                self.assertEqual(edges,saved)
        edges = [(i,i+1) for i in range(4999)]
        self.assertEqual(len(f(5000,edges)),4999)

    def test_resource_state_bfs(self):
        f = fresh(14)['shortest_with_eliminations']
        self.assertEqual(f([],0),-1)
        self.assertEqual(f([[]],0),-1)
        self.assertEqual(f([[0]],0),0)
        self.assertEqual(f([[1]],0),-1)
        self.assertEqual(f([[1]],1),0)
        self.assertEqual(f([[0,1,0]],0),-1)
        self.assertEqual(f([[0,1,0]],1),2)
        grid = [[0,1,0],[0,1,0],[0,0,0]]
        saved = copy.deepcopy(grid)
        self.assertEqual(f(grid,0),4)
        self.assertEqual(f(grid,1000000),4)
        self.assertEqual(grid,saved)
        for grid,k in [([[0]],-1),([[0]],0.5),([[0],[]],0),([[2]],1)]:
            with self.assertRaises(ValueError):
                f(grid,k)
        # Independent layer-set state oracle over every 2x3 binary board.
        for bits in itertools.product((0,1),repeat=6):
            grid = [list(bits[:3]),list(bits[3:])]
            for k in range(3):
                left = k-grid[0][0]
                layer = {(0,0,left)} if left >= 0 else set()
                visited = set(layer)
                expected, distance = -1, 0
                while layer:
                    if any((r,c) == (1,2) for r,c,b in layer):
                        expected = distance
                        break
                    nxt = set()
                    for r,c,b in layer:
                        for nr,nc in ((r+1,c),(r-1,c),(r,c+1),(r,c-1)):
                            if 0 <= nr < 2 and 0 <= nc < 3:
                                state = (nr,nc,b-grid[nr][nc])
                                if state[2] >= 0 and state not in visited:
                                    nxt.add(state)
                    visited |= nxt
                    layer = nxt
                    distance += 1
                self.assertEqual(f(grid,k),expected)


class SupplementalContract(unittest.TestCase):
    def test_aligned_metadata_and_executed_examples(self):
        import contextlib
        import io
        aligned = {
            'operations': ('operationExamples', ('code','result','use','mutation')),
            'fundamentals': ('fundamentalDetails', ('why','use','result','edge','takeaway')),
            'patterns': ('patternDetails', ('steps','templates','related','variations')),
            'templates': ('templateDetails', ('pattern','preconditions','observation')),
            'practice': ('practiceDetails', ('insight','secondary')),
        }
        names = {row[0] for row in DATA['templates']}
        pattern_names = {row[0] for row in DATA['patterns']}
        self.assertEqual(len(names), len(DATA['templates']))
        covered = set()
        for base,(supplement,fields) in aligned.items():
            self.assertEqual(len(DATA[base]), len(DATA[supplement]), supplement)
            for i,item in enumerate(DATA[supplement]):
                for field in fields:
                    self.assertIn(field,item,(supplement,i))
                    self.assertTrue(item[field],(supplement,i,field))
                if base == 'patterns':
                    self.assertTrue(set(item['templates']) <= names)
                    covered.update(item['templates'])
                if base == 'templates':
                    self.assertIn(item['pattern'], pattern_names)
        self.assertEqual(covered,names)
        for i,item in enumerate(DATA['operationExamples']):
            with self.subTest(operation=i):
                output = io.StringIO()
                with contextlib.redirect_stdout(output):
                    exec(compile(ast.parse('\n'.join(item['code'])),f'operation_{i}','exec'),{})
                self.assertEqual(output.getvalue().strip(),item['result'])
        self.assertGreaterEqual(len(DATA['decisionProcess']),4)
        for source in DATA['sources']:
            self.assertTrue(all(source.get(k) for k in ('title','url','note')))
            self.assertTrue(source['url'].startswith('https://'))

class AddedGraphVariants(unittest.TestCase):
    def test_eventual_safety_exhaustive(self):
        f=fresh(15)['eventual_safe_nodes']
        self.assertEqual(f([]),[])
        self.assertEqual(f([[1,1],[]]),[0,1])
        # A path of V edges exists iff some reachable walk contains a cycle.
        for flags in itertools.product((0,1),repeat=9):
            adj=[[v for v in range(3) if flags[3*u+v]] for u in range(3)]
            expected=[]
            for start in range(3):
                frontier={start}
                for _ in range(3):
                    frontier={v for u in frontier for v in adj[u]}
                if not frontier:
                    expected.append(start)
            self.assertEqual(f(adj),expected)

    def test_snapshot_budget_with_negative_cycles(self):
        f=fresh(16)['bounded_shortest_paths']
        self.assertEqual(f(3,[(0,1,1),(1,2,1),(0,2,10)],0,1),[0,1,10])
        self.assertEqual(f(3,[(0,1,1),(1,2,1),(0,2,10)],0,2),[0,1,2])
        self.assertEqual(f(1,[(0,0,-1)],0,4),[-4])
        self.assertEqual(f(2,iter([(0,1,7)]),0,0),[0,float('inf')])
        rng=random.Random(615)
        for _ in range(100):
            n=4
            edges=[(rng.randrange(n),rng.randrange(n),rng.randrange(-3,6)) for _ in range(7)]
            for budget in range(5):
                best=[float('inf')]*n
                def walk(u,cost,left):
                    best[u]=min(best[u],cost)
                    if left:
                        for a,b,w in edges:
                            if a==u:
                                walk(b,cost+w,left-1)
                walk(0,0,budget)
                saved=edges[:]
                self.assertEqual(f(n,edges,0,budget),best)
                self.assertEqual(edges,saved)
        for args in [(0,[],0,1),(2,[],0,-1),(2,[(0,2,1)],0,1)]:
            with self.assertRaises(ValueError):f(*args)

    def test_minimax_threshold_oracle(self):
        f=fresh(17)['minimum_effort']
        self.assertIsNone(f([]));self.assertIsNone(f([[]]))
        self.assertEqual(f([[7]]),0)
        self.assertEqual(f([[1,2,2],[3,8,2],[5,3,5]]),2)
        with self.assertRaises(ValueError):f([[1],[]])
        rng=random.Random(616)
        for _ in range(100):
            grid=[[rng.randrange(-5,6) for _ in range(3)] for _ in range(3)]
            expected=None
            for limit in range(11):
                seen={(0,0)};stack=[(0,0)]
                while stack:
                    r,c=stack.pop()
                    for a,b in ((r+1,c),(r-1,c),(r,c+1),(r,c-1)):
                        if 0<=a<3 and 0<=b<3 and (a,b) not in seen and abs(grid[a][b]-grid[r][c])<=limit:
                            seen.add((a,b));stack.append((a,b))
                if (2,2) in seen:
                    expected=limit;break
            saved=copy.deepcopy(grid)
            self.assertEqual(f(grid),expected);self.assertEqual(grid,saved)

    def test_dense_prim_matches_explicit_graph(self):
        f=fresh(18)['manhattan_mst'];prim=fresh(11)['prim_weight']
        self.assertEqual(f([]),0);self.assertEqual(f([(1,2)]),0)
        self.assertEqual(f([(0,0),(0,0)]),0)
        self.assertEqual(f([(0,0),(2,2),(3,10),(5,2),(7,0)]),20)
        rng=random.Random(617)
        for n in range(9):
            for _ in range(12):
                pts=[(rng.randrange(-4,5),rng.randrange(-4,5)) for _ in range(n)]
                adj=[[(v,abs(x-a)+abs(y-b)) for v,(a,b) in enumerate(pts) if u!=v] for u,(x,y) in enumerate(pts)]
                saved=pts[:]
                self.assertEqual(f(pts),prim(adj));self.assertEqual(pts,saved)

    def test_dag_counts_and_large_integer(self):
        f=fresh(19)['dag_path_counts']
        self.assertEqual(f([[1,2],[3],[3],[],[]],0),[1,1,1,2,0])
        self.assertEqual(f([[1,1],[]],0),[1,2])
        self.assertEqual(f([[]],0,1),[0])
        for adj,source,mod in [([],0,None),([[0]],0,None),([[],[1]],0,None),([[]],0,0)]:
            with self.assertRaises(ValueError):f(adj,source,mod)
        rng=random.Random(618)
        for _ in range(100):
            adj=[[v for v in range(u+1,7) if rng.random()<.4] for u in range(7)]
            expected=[0]*7
            def visit(u):
                expected[u]+=1
                for v in adj[u]:visit(v)
            visit(0)
            self.assertEqual(f(adj,0),expected)
            self.assertEqual(f(adj,0,3),[x%3 for x in expected])
        adj=[[i+1,i+1] for i in range(1200)]+[[]]
        self.assertEqual(f(adj,0)[-1],2**1200)


class IdentityCloneTests(unittest.TestCase):
    def test_clone_equal_values_cycles_and_independence(self):
        ns=fresh(20);Node=ns['GraphNode'];f=ns['clone_graph']
        self.assertIsNone(f(None))
        a,b,c=Node(7),Node(7),Node(8)
        a.neighbors=[a,b,b];b.neighbors=[c];c.neighbors=[a]
        cloned=f(a)
        self.assertIsNot(cloned,a);self.assertEqual(cloned.value,7)
        self.assertIs(cloned.neighbors[0],cloned)
        cb=cloned.neighbors[1]
        self.assertIs(cb,cloned.neighbors[2]);self.assertIsNot(cb,cloned)
        self.assertEqual(cb.value,cloned.value)
        self.assertIs(cb.neighbors[0].neighbors[0],cloned)
        cb.neighbors.clear();self.assertEqual(b.neighbors,[c])
        self.assertEqual(a.neighbors,[a,b,b])
        nodes=[Node(i) for i in range(5000)]
        for u,v in zip(nodes,nodes[1:]):u.neighbors.append(v)
        current=f(nodes[0]);count=1
        while current.neighbors:
            current=current.neighbors[0];count+=1
        self.assertEqual(count,5000)

if __name__ == '__main__':
    unittest.main(verbosity=2)
