"""Run: python3 union-find-template-tests.py (Python 3.10+, standard library)."""
import ast
import copy
import itertools
import json
import random
import unittest
from collections import deque
from pathlib import Path

DATA = json.loads(Path(__file__).with_name('union-find-guide.json').read_text())

def fresh(index):
    namespace = {}
    code = '\n'.join(DATA['templates'][index][3])
    exec(compile(ast.parse(code),f'dsu_template_{index}','exec'),namespace)
    return namespace

def groups(n, edges):
    adj = [[] for _ in range(n)]
    for u,v in edges:
        adj[u].append(v)
        adj[v].append(u)
    labels = [-1]*n
    count = 0
    for start in range(n):
        if labels[start] != -1:
            continue
        labels[start] = count
        stack = [start]
        while stack:
            for v in adj[stack.pop()]:
                if labels[v] == -1:
                    labels[v] = count
                    stack.append(v)
        count += 1
    return labels

def island_sizes(grid):
    rows, cols = len(grid), len(grid[0]) if grid else 0
    used = set()
    sizes = []
    for r in range(rows):
        for c in range(cols):
            if grid[r][c] != 1 or (r,c) in used:
                continue
            stack = [(r,c)]
            used.add((r,c))
            size = 0
            while stack:
                x,y = stack.pop()
                size += 1
                for nx,ny in ((x+1,y),(x-1,y),(x,y+1),(x,y-1)):
                    if 0 <= nx < rows and 0 <= ny < cols and grid[nx][ny] == 1 and (nx,ny) not in used:
                        used.add((nx,ny))
                        stack.append((nx,ny))
            sizes.append(size)
    return sizes

class UnionFindTemplates(unittest.TestCase):
    def test_schema_and_all_fundamentals(self):
        sizes = {'operations':6,'fundamentals':6,'patterns':10,'recognize':3,
                 'contrasts':2,'edges':3,'mistakes':2,'impress':2,'memory':3,
                 'templates':5,'practice':5}
        for key,size in sizes.items():
            self.assertTrue(DATA[key],key)
            self.assertTrue(all(len(row) == size for row in DATA[key]),key)
        for i,row in enumerate(DATA['fundamentals']):
            code = '\n'.join(row[2])
            exec(compile(ast.parse(code),f'fundamental_{i}','exec'),{})
        for i in range(len(DATA['templates'])):
            fresh(i)

    def test_balanced_dsu(self):
        DSU = fresh(0)['DSU']
        self.assertEqual(DSU(0).components,0)
        dsu = DSU(6)
        self.assertEqual(dsu.component_size(0),1)
        self.assertTrue(dsu.union(0,1))
        self.assertFalse(dsu.union(1,0))
        self.assertFalse(dsu.union(2,2))
        self.assertEqual(dsu.components,5)
        self.assertEqual(dsu.component_size(1),2)
        for n in [-1,1.5]:
            with self.assertRaises(ValueError):
                DSU(n)
        for x in [-1,6,1.5]:
            with self.assertRaises(ValueError):
                dsu.find(x)
        rng = random.Random(40)
        dsu = DSU(20)
        model = list(range(20))
        for _ in range(1000):
            a,b = rng.randrange(20),rng.randrange(20)
            old_a,old_b = model[a],model[b]
            merged = old_a != old_b
            self.assertEqual(dsu.union(a,b),merged)
            if merged:
                model = [old_a if value == old_b else value for value in model]
            self.assertEqual(dsu.components,len(set(model)))
            for i in range(20):
                self.assertEqual(dsu.component_size(i),model.count(model[i]))
                self.assertEqual(dsu.find(a) == dsu.find(i),model[a] == model[i])
        dsu = DSU(10000)
        for i in range(9999):
            dsu.union(i,i+1)
        self.assertEqual(dsu.component_size(9999),10000)

    def test_undirected_stats(self):
        f = fresh(1)['undirected_stats']
        self.assertEqual(f(0,[]),(0,[]))
        self.assertEqual(f(5,[(0,1)]),(4,[]))
        self.assertEqual(f(3,[(0,1),(1,2),(0,2),(1,1),(0,1)]),(1,[2,3,4]))
        with self.assertRaises(ValueError):
            f(2,[(-1,1)])
        rng = random.Random(41)
        for n in range(1,9):
            for _ in range(30):
                edges = [(rng.randrange(n),rng.randrange(n)) for i in range(rng.randrange(15))]
                prefix, redundant = [], []
                for index,(u,v) in enumerate(edges):
                    labels = groups(n,prefix)
                    if labels[u] == labels[v]:
                        redundant.append(index)
                    prefix.append((u,v))
                self.assertEqual(f(n,edges),(len(set(groups(n,edges))),redundant))

    def test_kruskal(self):
        f = fresh(2)['kruskal']
        self.assertEqual(f(0,[]),(0,[]))
        self.assertEqual(f(1,[(0,0,-3)]),(0,[]))
        self.assertIsNone(f(3,[(0,1,1)]))
        self.assertEqual(f(2,[(0,1,2),(0,1,-4)])[0],-4)
        for n,edges in [(-1,[]),(1,[(0,1,0)]),(2,[(-1,1,1)])]:
            with self.assertRaises(ValueError):
                f(n,edges)
        rng = random.Random(42)
        for n in range(1,6):
            for _ in range(35):
                edges = [(u,v,rng.randrange(-4,8)) for u in range(n) for v in range(u+1,n) if rng.random() < .65]
                saved = edges[:]
                totals = [sum(w for u,v,w in subset)
                          for subset in itertools.combinations(edges,n-1)
                          if len(set(groups(n,[(u,v) for u,v,w in subset]))) == 1]
                result = f(n,edges)
                self.assertEqual(edges,saved)
                if not totals:
                    self.assertIsNone(result)
                else:
                    total,chosen = result
                    self.assertEqual(total,min(totals))
                    self.assertEqual(len(chosen),n-1)
                    self.assertTrue(all(edge in edges for edge in chosen))
                    self.assertEqual(len(set(groups(n,[(u,v) for u,v,w in chosen]))),1)

    def test_account_identity(self):
        f = fresh(3)['merge_accounts']
        self.assertEqual(f([]),[])
        accounts = [['John','a@x','b@x'],['John','c@x'],['John','b@x','d@x','b@x'],['Mary'],['Mary']]
        saved = copy.deepcopy(accounts)
        self.assertEqual(f(accounts),[['John','a@x','b@x','d@x'],['John','c@x'],['Mary'],['Mary']])
        self.assertEqual(accounts,saved)
        # Transitive identity and same display name without identity.
        self.assertEqual(f([['A','x'],['A','y'],['A','x','y']]),[['A','x','y']])
        self.assertEqual(f([['Same','x'],['Same','z']]),[['Same','x'],['Same','z']])
        # Compatible-name assumption relaxed deterministically to earliest name.
        self.assertEqual(f([['First','x'],['Later','x']]),[['First','x']])
        with self.assertRaises(ValueError):
            f([[]])
        rng = random.Random(43)
        for _ in range(100):
            accounts = [['Name']+rng.sample(['a','b','c','d','e','f'],rng.randrange(4)) for i in range(rng.randrange(10))]
            edges = [(i,j) for i in range(len(accounts)) for j in range(i) if set(accounts[i][1:]) & set(accounts[j][1:])]
            labels = groups(len(accounts),edges)
            expected = []
            for label in sorted(set(labels)):
                indices = [i for i,x in enumerate(labels) if x == label]
                emails = sorted({e for i in indices for e in accounts[i][1:]})
                expected.append(['Name']+emails)
            self.assertEqual(f(accounts),expected)

    def test_strict_threshold_queries(self):
        f = fresh(4)['limited_paths']
        self.assertEqual(f(0,[],[]),[])
        self.assertEqual(f(2,[(0,1,5)],[(0,1,5),(0,1,6),(1,1,-100)]),[False,True,True])
        self.assertEqual(f(1,[],[(0,0,-1)]),[True])
        for n,edges,queries in [(1,[(0,1,2)],[]),(1,[],[(-1,0,2)]),(-1,[],[])]:
            with self.assertRaises(ValueError):
                f(n,edges,queries)
        rng = random.Random(44)
        for n in range(1,10):
            for _ in range(20):
                edges = [(rng.randrange(n),rng.randrange(n),rng.randrange(-2,7)) for i in range(20)]
                queries = [(rng.randrange(n),rng.randrange(n),rng.randrange(-3,8)) for i in range(12)]
                saved_edges,saved_queries = edges[:],queries[:]
                expected = []
                for u,v,limit in queries:
                    labels = groups(n,[(a,b) for a,b,w in edges if w < limit])
                    expected.append(labels[u] == labels[v])
                self.assertEqual(f(n,edges,queries),expected)
                self.assertEqual(edges,saved_edges)
                self.assertEqual(queries,saved_queries)
        self.assertEqual(f(2,iter([(0,1,0)]),iter([(0,1,1)])),[True])

    def test_island_additions(self):
        f = fresh(5)['island_counts']
        self.assertEqual(f(0,0,[]),[])
        self.assertEqual(f(2,3,[(0,0),(0,0),(1,2),(0,1),(0,2)]),[1,1,2,2,1])
        for rows,cols,adds in [(-1,2,[]),(1,2,[(-1,0)]),(1,2,[(0,2)]),(0,0,[(0,0)])]:
            with self.assertRaises(ValueError):
                f(rows,cols,adds)
        rng = random.Random(45)
        for rows in range(1,5):
            for cols in range(1,5):
                for _ in range(10):
                    adds = [(rng.randrange(rows),rng.randrange(cols)) for i in range(20)]
                    saved = adds[:]
                    grid = [[0]*cols for _ in range(rows)]
                    expected = []
                    for r,c in adds:
                        grid[r][c] = 1
                        expected.append(len(island_sizes(grid)))
                    self.assertEqual(f(rows,cols,adds),expected)
                    self.assertEqual(adds,saved)

    def test_largest_flip(self):
        f = fresh(6)['largest_after_flip']
        self.assertEqual(f([]),0)
        self.assertEqual(f([[]]),0)
        self.assertEqual(f([[0]]),1)
        self.assertEqual(f([[1]]),1)
        self.assertEqual(f([[1,1],[1,0]]),4)
        for grid in [[[1],[]],[[2]]]:
            with self.assertRaises(ValueError):
                f(grid)
        for rows,cols in [(1,4),(2,3),(3,3)]:
            for bits in itertools.product((0,1),repeat=rows*cols):
                grid = [list(bits[r*cols:(r+1)*cols]) for r in range(rows)]
                saved = copy.deepcopy(grid)
                expected = max(island_sizes(grid),default=0)
                for r in range(rows):
                    for c in range(cols):
                        if grid[r][c] == 0:
                            grid[r][c] = 1
                            expected = max(expected,max(island_sizes(grid),default=0))
                            grid[r][c] = 0
                self.assertEqual(f(grid),expected)
                self.assertEqual(grid,saved)

    def test_rollback_dsu(self):
        D = fresh(7)['RollbackDSU']
        d = D(5)
        original = d.snapshot()
        self.assertTrue(d.union(0,1))
        middle = d.snapshot()
        self.assertFalse(d.union(0,1))
        self.assertEqual(d.snapshot(),middle)
        d.union(2,3)
        d.union(1,2)
        self.assertEqual(d.components,2)
        before = d.parent[:]
        d.find(3)
        self.assertEqual(d.parent,before)  # No compression.
        d.rollback(middle)
        self.assertEqual(d.components,4)
        self.assertEqual(d.find(0),d.find(1))
        self.assertNotEqual(d.find(2),d.find(3))
        d.rollback(original)
        self.assertEqual(d.parent,list(range(5)))
        self.assertEqual(d.size,[1]*5)
        for token in [-1,100,1.5]:
            with self.assertRaises(ValueError):
                d.rollback(token)
        with self.assertRaises(ValueError):
            d.find(-1)
        with self.assertRaises(ValueError):
            D(-1)
        rng = random.Random(46)
        d = D(12)
        model = list(range(12))
        snapshots = []
        for _ in range(1200):
            action = rng.randrange(4)
            if action == 0:
                snapshots.append((d.snapshot(),model[:]))
            elif action == 1 and snapshots:
                token,model = snapshots.pop()
                d.rollback(token)
            else:
                a,b = rng.randrange(12),rng.randrange(12)
                old_a,old_b = model[a],model[b]
                self.assertEqual(d.union(a,b),old_a != old_b)
                model = [old_a if value == old_b else value for value in model]
            self.assertEqual(d.components,len(set(model)))
            for i in range(12):
                self.assertEqual(d.size[d.find(i)],model.count(model[i]))
                self.assertEqual(d.find(0) == d.find(i),model[0] == model[i])
        self.assertEqual(D(0).snapshot(),0)

    def test_parity_constraints(self):
        D = fresh(8)['ParityDSU']
        d = D(4)
        self.assertIsNone(d.relation(0,1))
        self.assertTrue(d.constrain(0,1,1))
        self.assertTrue(d.constrain(1,2,1))
        self.assertEqual(d.relation(0,2),0)
        state = (d.parent[:],d.size[:],d.xor_to_parent[:])
        self.assertFalse(d.constrain(0,2,1))
        self.assertEqual((d.parent,d.size,d.xor_to_parent),state)
        self.assertTrue(d.constrain(0,2,0))
        self.assertFalse(d.constrain(3,3,1))
        self.assertTrue(d.constrain(3,3,0))
        for a,b,p in [(-1,0,0),(0,4,1),(0,1,2)]:
            with self.assertRaises(ValueError):
                d.constrain(a,b,p)
        with self.assertRaises(ValueError):
            D(-1)
        rng = random.Random(47)
        for _ in range(25):
            n = 10
            d = D(n)
            adj = [[] for _ in range(n)]
            def oracle(a,b):
                todo = deque([(a,0)])
                seen = {a}
                while todo:
                    u,p = todo.popleft()
                    if u == b:
                        return p
                    for v,w in adj[u]:
                        if v not in seen:
                            seen.add(v)
                            todo.append((v,p^w))
                return None
            for step in range(100):
                a,b,p = rng.randrange(n),rng.randrange(n),rng.randrange(2)
                known = oracle(a,b)
                accepted = known is None or known == p
                self.assertEqual(d.constrain(a,b,p),accepted)
                if accepted:
                    adj[a].append((b,p))
                    adj[b].append((a,p))
                for u in range(n):
                    self.assertEqual(d.relation(a,u),oracle(a,u))


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


class AddedDSUVariants(unittest.TestCase):
    def test_reverse_deletions_against_rebuilding(self):
        f=fresh(9)['components_after_deletions']
        self.assertEqual(f(3,[(0,1),(1,2)],[0,0,1]),[2,2,3])
        self.assertEqual(f(2,[(0,1),(0,1)],[0,1]),[1,2])
        self.assertEqual(f(0,[],[]),[])
        self.assertEqual(f(3,[],[]),[])
        for args in [(2,[(0,2)],[]),(2,[(0,1)],[-1]),(2,[],[0])]:
            with self.assertRaises(ValueError):f(*args)
        rng=random.Random(622)
        for _ in range(150):
            n=6;edges=[(rng.randrange(n),rng.randrange(n)) for _ in range(10)]
            deletions=[rng.randrange(len(edges)) for _ in range(15)]
            alive=set(range(len(edges)));expected=[]
            for eid in deletions:
                alive.discard(eid)
                expected.append(len(set(groups(n,[edges[i] for i in alive]))))
            saved=edges[:],deletions[:]
            self.assertEqual(f(n,iter(edges),iter(deletions)),expected)
            self.assertEqual((edges,deletions),saved)

    def test_offline_dynamic_multiplicity_and_random_oracle(self):
        from collections import Counter
        f=fresh(10)['offline_dynamic_connectivity']
        ops=[('query',0,1),('add',0,1),('add',1,0),('remove',0,1),('query',0,1),('remove',1,0),('query',0,1)]
        self.assertEqual(f(2,ops),[False,True,False])
        self.assertEqual(f(0,[]),[])
        self.assertEqual(f(1,[('query',0,0),('add',0,0),('remove',0,0),('query',0,0)]),[True,True])
        for n,ops in [(2,[('remove',0,1)]),(2,[('bad',0,1)]),(2,[('query',-1,0)])]:
            with self.assertRaises(ValueError):f(n,ops)
        rng=random.Random(623)
        for _ in range(75):
            n=7;counts=Counter();ops=[];expected=[]
            for step in range(80):
                u,v=rng.randrange(n),rng.randrange(n);edge=tuple(sorted((u,v)))
                kind=rng.choice(['add','remove','query'])
                if kind=='remove' and counts[edge]==0:kind='add'
                ops.append((kind,u,v))
                if kind=='add':counts[edge]+=1
                elif kind=='remove':counts[edge]-=1
                else:
                    labels=groups(n,[e for e,count in counts.items() if count])
                    expected.append(labels[u]==labels[v])
            saved=ops[:]
            self.assertEqual(f(n,iter(ops)),expected);self.assertEqual(ops,saved)
        # Scheduling recursion is logarithmic, even for a long time axis.
        self.assertEqual(f(1,[('query',0,0)]*5000),[True]*5000)

    def test_exact_ratio_orientation_and_contradictions(self):
        from fractions import Fraction
        T=fresh(11)['RatioDSU'];t=T(5)
        self.assertIsNone(t.relation(0,1))
        self.assertTrue(t.constrain(0,1,2));self.assertTrue(t.constrain(1,2,3))
        self.assertEqual(t.relation(0,2),Fraction(6))
        self.assertEqual(t.relation(2,0),Fraction(1,6))
        self.assertTrue(t.constrain(3,2,'5/2')) # smaller first root attaches to larger second root
        self.assertEqual(t.relation(3,0),Fraction(5,12))
        saved=copy.deepcopy(t.__dict__)
        self.assertFalse(t.constrain(0,2,7));self.assertEqual(t.__dict__,saved)
        self.assertTrue(t.constrain(4,4,1));self.assertFalse(t.constrain(4,4,2))
        for args in [(0,1,0),(0,1,-1),(-1,0,2)]:
            with self.assertRaises(ValueError):t.constrain(*args)
        rng=random.Random(624)
        for _ in range(50):
            values=[Fraction(rng.randrange(1,10),rng.randrange(1,10)) for _ in range(12)]
            t=T(12);edges=[]
            for _ in range(35):
                a,b=rng.randrange(12),rng.randrange(12)
                self.assertTrue(t.constrain(a,b,values[a]/values[b]));edges.append((a,b))
                labels=groups(12,edges)
                for u in range(12):
                    for v in range(12):
                        expected=values[u]/values[v] if labels[u]==labels[v] else None
                        self.assertEqual(t.relation(u,v),expected)

if __name__ == '__main__':
    unittest.main(verbosity=2)
