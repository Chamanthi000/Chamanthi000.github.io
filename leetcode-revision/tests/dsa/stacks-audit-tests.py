"""Functional, brute-force and resource-depth checks for every stack template."""
import ast
import itertools
import json
import random
import unittest
from pathlib import Path
GUIDE=json.loads(Path(__file__).with_name('stacks-guide.json').read_text())

# Audit regressions execute final canonical code, selected by semantic identity.
_audit_titles = {'Validate bracket-only text': 'Validate bracket-only text', 'Min stack with per-height minima': 'Min stack with per-height minima', 'Integer reverse Polish evaluation': 'Integer reverse Polish evaluation', 'Next strictly greater right indices': 'Next strictly greater right indices', 'Previous strictly smaller indices': 'Previous strictly smaller indices', 'Circular next strictly greater values': 'Circular next strictly greater values', 'Largest histogram rectangle': 'Largest histogram rectangle', 'Sum of subarray minimums with explicit ties': 'Sum of subarray minimums with explicit ties', 'Remove adjacent runs of k equal characters': 'Remove adjacent runs of k equal characters', 'Smallest number after k digit deletions': 'Smallest number after k digit deletions', 'Equal-speed asteroid collision survivors': 'Equal-speed asteroid collision survivors', 'Longest valid parentheses substring length': 'Longest valid parentheses substring length', 'Decode nested repeat contexts': 'Decode nested repeat contexts', 'Stack-based graph reachability order': 'Iterative LIFO graph reachability order', 'Online stock span with compressed blocks': 'Online stock span by compressed groups', 'Recursive-style DFS preorder with iterator frames': 'Exact recursive-style graph DFS using iterator frames'}
_canonical = {row[0]: row for row in GUIDE['templates']}
GUIDE['templates'] = [[title, *_canonical[canonical][1:]] for title, canonical in _audit_titles.items()]
COVERED = set()
EXPECTED_CALLS = set()
INVOKED = set()

def tracked(index, name, function):
    def call(*args, **kwargs):
        result = function(*args, **kwargs)
        INVOKED.add((index, name))
        return result
    return call

def template(index):
    entry = GUIDE['templates'][index]
    tree = ast.parse(chr(10).join(entry[3]))
    ns = {}
    exec(compile(tree, entry[0], 'exec'), ns)
    algorithms = [node for node in tree.body
                  if isinstance(node, (ast.FunctionDef, ast.ClassDef))
                  and node.name not in {'Node', 'RandomNode', '_CacheNode'}]
    assert algorithms, ('no algorithm entrypoint', entry[0])
    for node in algorithms:
        if isinstance(node, ast.FunctionDef):
            EXPECTED_CALLS.add((index, node.name))
            ns[node.name] = tracked(index, node.name, ns[node.name])
        else:
            cls = ns[node.name]
            for method in node.body:
                if isinstance(method, ast.FunctionDef):
                    name = node.name + '.' + method.name
                    EXPECTED_CALLS.add((index, name))
                    setattr(cls, method.name, tracked(index, name, getattr(cls, method.name)))
    COVERED.add(index)
    return ns

class StackTests(unittest.TestCase):
    def test_all_templates(self):
        f=template(0)['valid_brackets']
        for text,expected in [('',True),('([]{})',True),('([)]',False),('(',False),(')',False)]: self.assertEqual(f(text),expected)
        with self.assertRaises(ValueError): f('a')
        obj=template(1)['MinStack']()
        for method in (obj.pop,obj.top,obj.get_min):
            with self.assertRaises(IndexError): method()
        for x in [2,1,1,0]: obj.push(x)
        self.assertEqual(obj.get_min(),0); self.assertEqual(obj.pop(),0); self.assertEqual(obj.get_min(),1)
        self.assertEqual(obj.pop(),1); self.assertEqual(obj.get_min(),1); self.assertEqual(obj.top(),1)
        f=template(2)['eval_rpn']
        for tokens,expected in [(['8','3','-'],5),(['-7','3','/'],-2),(['7','-3','/'],-2),(['-7','-3','/'],2),(['2','1','+','3','*'],9),([str(10**400),'3','/'],10**400//3)]: self.assertEqual(f(tokens),expected)
        for tokens in ([],['1','2'],['+'],['a'],['1','0','/']):
            with self.assertRaises(ValueError): f(tokens)
        ng=template(3)['next_greater_indices']; ps=template(4)['previous_smaller_indices']; circ=template(5)['circular_next_greater']
        area=template(6)['largest_rectangle']; minima=template(7)['sum_subarray_minimums']
        self.assertEqual(ng([2,2,3]),[2,2,-1]); self.assertEqual(ps([2,2,3]),[-1,-1,1])
        self.assertEqual(circ([7]),[-1]); self.assertEqual(area([2,1,5,6,2,3]),10); self.assertEqual(minima([2,2,2]),12)
        with self.assertRaises(ValueError): area([-1])
        with self.assertRaises(ValueError): minima([1],0)
        rng=random.Random(31)
        for n in range(9):
            for _ in range(40):
                a=[rng.randrange(-2,5) for _ in range(n)]; original=a[:]
                expected=[next((j for j in range(i+1,n) if a[j]>a[i]),-1) for i in range(n)]
                self.assertEqual(ng(a),expected)
                self.assertEqual(ps(a),[next((j for j in range(i-1,-1,-1) if a[j]<a[i]),-1) for i in range(n)])
                self.assertEqual(circ(a),[next((a[(i+j)%n] for j in range(1,n) if a[(i+j)%n]>a[i]),-1) for i in range(n)])
                total=sum(min(a[i:j]) for i in range(n) for j in range(i+1,n+1))
                self.assertEqual(minima(a),total); self.assertEqual(minima(a,7),total%7)
                nonnegative=[abs(x) for x in a]
                best=max([0]+[min(nonnegative[i:j])*(j-i) for i in range(n) for j in range(i+1,n+1)])
                self.assertEqual(area(nonnegative),best); self.assertEqual(a,original)
        cancel=template(8)['remove_adjacent_k']
        self.assertEqual(cancel('deeedbbcccbdaa',3),'aa'); self.assertEqual(cancel('abba',2),''); self.assertEqual(cancel('',2),''); self.assertEqual(cancel('abc',1),'')
        with self.assertRaises(ValueError): cancel('a',0)
        remove=template(9)['remove_k_digits']
        self.assertEqual(remove('1432219',3),'1219'); self.assertEqual(remove('10200',1),'200'); self.assertEqual(remove('10',2),'0'); self.assertEqual(remove('',0),'0')
        for n in range(7):
            for _ in range(30):
                number=''.join(str(rng.randrange(10)) for _ in range(n)); k=rng.randrange(n+1)
                options=[''.join(number[i] for i in kept).lstrip('0') or '0' for kept in itertools.combinations(range(n),n-k)]
                expected=min(options,key=lambda s:(len(s),s))
                self.assertEqual(remove(number,k),expected)
        for number,k in [('12',3),('12',-1),('1x',1)]:
            with self.assertRaises(ValueError): remove(number,k)
        collide=template(10)['asteroid_collision']
        for a,expected in [([],[]),([5,10,-5],[5,10]),([8,-8],[]),([10,2,-5],[10]),([-2,-1,1,2],[-2,-1,1,2]),([1,2,3,-5],[-5])]: self.assertEqual(collide(a),expected)
        with self.assertRaises(ValueError): collide([0])
        for _ in range(200):
            a=[rng.choice([-3,-2,-1,1,2,3]) for _ in range(12)]; reference=a[:]
            while True:
                i=next((i for i in range(len(reference)-1) if reference[i]>0>reference[i+1]),None)
                if i is None: break
                left,right=reference[i:i+2]
                replacement=[] if left==-right else ([left] if left>-right else [right])
                reference[i:i+2]=replacement
            self.assertEqual(collide(a),reference)
        longest=template(11)['longest_valid_parentheses']
        self.assertEqual(longest(')()())'),4); self.assertEqual(longest(''),0)
        with self.assertRaises(ValueError): longest('(a)')
        for n in range(9):
            for chars in itertools.product('()',repeat=n):
                text=''.join(chars); best=0
                for i in range(n):
                    balance=0
                    for j in range(i,n):
                        balance+=1 if text[j]=='(' else -1
                        if balance<0: break
                        if balance==0: best=max(best,j-i+1)
                self.assertEqual(longest(text),best)
        decode=template(12)['decode_repeats']
        for text,expected in [('', ''),('abc','abc'),('3[a2[c]]','accaccacc'),('2[abc]3[cd]ef','abcabccdcdcdef'),('2[]',''),('10[a]','a'*10),('1['*2000+'x'+']'*2000,'x')]: self.assertEqual(decode(text),expected)
        for text in ('0[a]','[a]','2[a','2a','a]','12','2[3]','2[a]1','-1[a]'):
            with self.assertRaises(ValueError): decode(text)
        dfs=template(13)['dfs_order']
        self.assertEqual(dfs({},0),[0]); self.assertEqual(dfs({0:[1,2],1:[0,2],2:[2]},0),[0,1,2])
        adjacency={i:[i+1] for i in range(5000)}
        self.assertEqual(dfs(adjacency,0),list(range(5001)))
        # Plateaus distinguish histogram maximum from contribution ownership.
        self.assertEqual(area([2,2]),4)
        self.assertEqual(area([1,2,2]),4)
        self.assertEqual(minima([2,2]),6)
        for n in range(7):
            for a in itertools.product([0,1,2],repeat=n):
                expected=sum(min(a[i:j]) for i in range(n) for j in range(i+1,n+1))
                self.assertEqual(minima(a),expected)
                self.assertEqual(area(a),max([0]+[min(a[i:j])*(j-i) for i in range(n) for j in range(i+1,n+1)]))
        Spanner=template(14)['StockSpanner']
        obj=Spanner()
        self.assertEqual([obj.next(x) for x in [100,80,60,70,60,75,85]], [1,1,1,2,1,4,6])
        for prices in ([2,2,2],list(range(300)),list(range(300,0,-1)),[rng.randrange(10) for _ in range(500)]):
            obj=Spanner(); expected=[]
            for i,x in enumerate(prices):
                j=i-1
                while j>=0 and prices[j]<=x: j-=1
                expected.append(i-j)
            self.assertEqual([obj.next(x) for x in prices],expected)
            self.assertTrue(all(a[0]>b[0] for a,b in zip(obj.stack,obj.stack[1:])))
        frames=template(15)['recursive_style_dfs']
        graph={'s':['a','b'],'a':['b','c']}
        self.assertEqual(dfs(graph,'s'),['s','a','c','b'])
        self.assertEqual(frames(graph,'s'),['s','a','b','c'])
        self.assertEqual(frames({},None),[None])
        self.assertEqual(frames({0:[None,0],None:[0]},0),[0,None])
        self.assertEqual(frames(adjacency,0),list(range(5001)))
        def recursive_reference(graph,start):
            seen=set(); order=[]
            def visit(node):
                seen.add(node); order.append(node)
                for neighbor in graph.get(node,()):
                    if neighbor not in seen: visit(neighbor)
            visit(start)
            return order
        for _ in range(200):
            graph={i:[j for j in range(8) if rng.randrange(4)==0] for i in range(8)}
            expected=recursive_reference(graph,0)
            self.assertEqual(frames(graph,0),expected)
            self.assertEqual(set(dfs(graph,0)),set(expected))
        # Neighbor iterables need not be reversible or reusable.
        graph={0:iter([1,2]),1:iter([2]),2:iter([0])}
        self.assertEqual(frames(graph,0),[0,1,2])
        self.assertEqual(template(6)['maximal_rectangle']([list('11'), list('11')]), 4)
        self.assertEqual(template(7)['sum_subarray_ranges']([1,2,3]), 4)
        self.assertEqual(COVERED,set(range(len(GUIDE['templates']))))
        self.assertEqual(INVOKED, EXPECTED_CALLS, 'every algorithm and class method must actually run successfully')

    def test_schema_and_code(self):
        widths={'operations':6,'fundamentals':6,'patterns':10,'recognize':3,'contrasts':2,'edges':3,'mistakes':2,'impress':2,'memory':3,'templates':5,'practice':5}
        for field,width in widths.items():
            for row in GUIDE[field]: self.assertEqual(len(row),width,(field,row[0]))
        for row in GUIDE['fundamentals']: exec(compile(ast.parse(chr(10).join(row[2])),row[0],'exec'),{})
        for row in GUIDE['templates']: compile(ast.parse(chr(10).join(row[3])),row[0],'exec')
if __name__=='__main__': unittest.main(verbosity=2)
