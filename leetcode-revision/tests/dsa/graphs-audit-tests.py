"""Run: python3 graphs-template-tests.py (Python 3.10+, standard library)."""
import ast
import copy
import itertools
import json
import random
import sys
import unittest
from collections import deque
from pathlib import Path

DATA = json.loads(Path(__file__).with_name('graphs-guide.json').read_text())

# Audit regressions execute final canonical code, selected by semantic identity.
_audit_titles = {'BFS distances and one shortest path': 'BFS distances and one shortest path', 'Undirected connected-component labels': 'Undirected connected-component labels', 'Multi-source grid BFS with walls': 'Multi-source grid BFS with walls', 'Directed cycle detection with active DFS frames': 'Directed cycle detection with active DFS frames', 'Kahn topological order': 'Kahn topological order', 'Bipartite coloring over all components': 'Bipartite coloring over all components', 'Lazy-heap Dijkstra': 'Lazy-heap Dijkstra', '0–1 BFS with stale-entry protection': '0–1 BFS with stale-entry protection', 'Bellman–Ford with reachable-cycle rejection': 'Bellman–Ford with reachable-cycle rejection', 'DAG shortest paths with negative edges': 'DAG shortest paths with negative edges', 'Floyd–Warshall all pairs': 'Floyd–Warshall all pairs', 'Prim minimum spanning tree weight': 'Prim minimum spanning tree weight', 'Iterative Kosaraju strongly connected components': 'Iterative Kosaraju strongly connected components', 'Iterative bridges with edge IDs': 'Iterative bridges with edge IDs', 'Obstacle-elimination expanded-state BFS': 'Obstacle-elimination expanded-state BFS', 'Reverse terminal elimination for eventual safety': 'Reverse terminal elimination for eventual safety', 'Snapshot relaxation with an edge budget': 'Snapshot relaxation with an edge budget', 'Minimax Dijkstra on grid heights': 'Minimax Dijkstra on grid heights', 'Dense implicit Prim for Manhattan points': 'Dense implicit Prim for Manhattan points', 'Count directed DAG paths without enumerating them': 'Count directed DAG paths without enumerating them'}
_canonical = {row[0]: row for row in DATA['templates']}
DATA['templates'] = [[title, *_canonical[canonical][1:]] for title, canonical in _audit_titles.items()]

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
    @classmethod
    def setUpClass(cls):
        # Compilation alone never counts as functional coverage. Record actual calls
        # to every top-level function, or public API of the main template class.
        cls.called = set()
        cls.required = set()
        for index, template in enumerate(DATA['templates']):
            tree = ast.parse('\n'.join(template[3]))
            functions = [node for node in tree.body if isinstance(node, ast.FunctionDef)]
            if functions:
                names = [node.name for node in functions]
            else:
                main = [node for node in tree.body if isinstance(node, ast.ClassDef)][-1]
                names = [main.name + '.' + node.name for node in main.body
                         if isinstance(node, ast.FunctionDef) and
                         (not node.name.startswith('_') or node.name == '__init__')]
            cls.required.update((f'graph_template_{index}', name) for name in names)
        cls.previous_profile = sys.getprofile()

        def record(frame, event, arg):
            if event == 'call' and frame.f_code.co_filename.startswith('graph_template_'):
                name = frame.f_code.co_name
                instance = frame.f_locals.get('self')
                if instance is not None:
                    name = type(instance).__name__ + '.' + name
                cls.called.add((frame.f_code.co_filename, name))
        sys.setprofile(record)

    @classmethod
    def tearDownClass(cls):
        sys.setprofile(cls.previous_profile)
        missing = cls.required - cls.called
        if missing:
            raise AssertionError(f'Templates not functionally exercised: {sorted(missing)}')

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
        for grid,k in [([[0]],-1),([[0],[]],0),([[2]],1)]:
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

    def test_eventual_safety(self):
        f = fresh(15)['eventual_safe_nodes']
        self.assertEqual(f([[1,2],[2,3],[5],[0],[5],[],[]]), [2,4,5,6])
        self.assertEqual(f([]), [])
        rng = random.Random(510)
        for n in range(1,7):
            for _ in range(30):
                adj = [[v for v in range(n) if rng.randrange(5)==0] for u in range(n)]
                def bad(u, path):
                    if u in path: return True
                    return any(bad(v,path|{u}) for v in adj[u])
                self.assertEqual(f(adj), [u for u in range(n) if not bad(u,set())])

    def test_bounded_paths(self):
        f = fresh(16)['bounded_shortest_paths']
        rng = random.Random(511)
        for _ in range(90):
            n, budget = rng.randrange(1,6), rng.randrange(5)
            edges = [(u,v,rng.randrange(-5,6)) for u in range(n) for v in range(n) if rng.randrange(4)==0]
            want = [float('inf')]*n; want[0]=0
            frontier=[(0,0)]
            for step in range(budget):
                frontier=[(v,cost+w) for x,cost in frontier for u,v,w in edges if u==x]
                for v,cost in frontier: want[v]=min(want[v],cost)
            self.assertEqual(f(n,edges,0,budget),want)
        with self.assertRaises(ValueError): f(2,[],0,-1)

    def test_grid_minimax(self):
        f = fresh(17)['minimum_effort']
        self.assertIsNone(f([])); self.assertEqual(f([[8]]),0)
        self.assertEqual(f([[1,2,2],[3,8,2],[5,3,5]]),2)
        rng = random.Random(512)
        for _ in range(90):
            rows,cols=rng.randrange(1,4),rng.randrange(1,4)
            grid=[[rng.randrange(-9,10) for c in range(cols)] for r in range(rows)]
            thresholds={0}|{abs(grid[r][c]-grid[nr][nc]) for r in range(rows) for c in range(cols) for nr,nc in [(r+1,c),(r,c+1)] if nr<rows and nc<cols}
            for threshold in sorted(thresholds):
                seen,stack={(0,0)},[(0,0)]
                while stack:
                    r,c=stack.pop()
                    for nr,nc in [(r+1,c),(r-1,c),(r,c+1),(r,c-1)]:
                        if 0<=nr<rows and 0<=nc<cols and (nr,nc) not in seen and abs(grid[r][c]-grid[nr][nc])<=threshold:
                            seen.add((nr,nc));stack.append((nr,nc))
                if (rows-1,cols-1) in seen: break
            self.assertEqual(f(grid),threshold)

    def test_manhattan_dense_mst(self):
        f=fresh(18)['manhattan_mst'];rng=random.Random(513)
        for n in range(9):
            for _ in range(20):
                points=[(rng.randrange(-5,6),rng.randrange(-5,6)) for i in range(n)]
                edges=sorted((abs(points[u][0]-points[v][0])+abs(points[u][1]-points[v][1]),u,v) for u in range(n) for v in range(u))
                parent=list(range(n));want=0
                def root(x):
                    while parent[x]!=x: x=parent[x]
                    return x
                for w,u,v in edges:
                    a,b=root(u),root(v)
                    if a!=b: parent[a]=b;want+=w
                self.assertEqual(f(points),want)

    def test_dag_count_paths(self):
        f=fresh(19)['dag_path_counts'];rng=random.Random(514)
        for n in range(1,9):
            for _ in range(25):
                adj=[[v for v in range(u+1,n) for repeat in range(rng.randrange(3))] for u in range(n)]
                want=[0]*n;stack=[0]
                while stack:
                    u=stack.pop();want[u]+=1;stack.extend(adj[u])
                self.assertEqual(f(adj,0),want)
                self.assertEqual(f(adj,0,7),[x%7 for x in want])
                self.assertEqual(f(adj,0,1),[0]*n)
        with self.assertRaises(ValueError): f([[0]],0)
        with self.assertRaises(ValueError): f([[]],0,0)

    def test_weighted_multigraph_and_global_cycle_contracts(self):
        adj = [[(1, 5), (1, 2), (0, 0)], [], [(2, -1)]]
        # Dijkstra validates the entire graph, not only reachable edges.
        with self.assertRaises(ValueError):
            fresh(6)['dijkstra'](adj, 0)
        self.assertEqual(fresh(8)['bellman_ford'](3, [(0,1,5),(0,1,2),(2,2,-1)], 0), [0,2,float('inf')])
        with self.assertRaises(ValueError):
            fresh(10)['floyd_warshall'](3, [(0,1,2),(2,2,-1)])
        with self.assertRaises(ValueError):
            fresh(9)['dag_shortest_paths']([[(1,-2)], [], [(2,0)]], 0)
        self.assertEqual(fresh(16)['bounded_shortest_paths'](2, [(0,1,0),(1,1,-2)], 0, 4), [0,-6])
        self.assertEqual(fresh(11)['prim_weight']([[(1,3),(1,-2),(0,-100)],[(0,3),(0,-2)]]), -2)
        self.assertEqual(fresh(19)['dag_path_counts']([[1,1,2],[2],[]],0), [1,2,3])
        self.assertEqual(fresh(2)['nearest_sources']([[],[]],[]), [[],[]])
        self.assertEqual(fresh(14)['shortest_with_eliminations']([[],[]],0), -1)
        self.assertIsNone(fresh(17)['minimum_effort']([[],[]]))

if __name__ == '__main__':
    unittest.main(verbosity=2)
