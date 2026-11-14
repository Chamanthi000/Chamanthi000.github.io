"""Fresh-namespace functional and adversarial tests for every hash-map template."""
import ast
import json
import random
import unittest
from collections import Counter
from pathlib import Path

GUIDE = json.loads(Path(__file__).with_name('hash-maps-guide.json').read_text())

# Audit regressions execute final canonical code, selected by semantic identity.
_audit_titles = {'Two Sum with prior indices': 'Two Sum with prior indices', 'Multiset equality': 'Multiset equality', 'Group anagrams by sorted signature': 'Group anagrams by sorted signature', 'Isomorphic sequences': 'Isomorphic sequences', 'Count exact-sum nonempty subarrays': 'Count exact-sum nonempty subarrays', 'Longest exact-sum range length': 'Longest exact-sum range length', 'Count sums divisible by nonzero k': 'Count sums divisible by nonzero k', 'Longest unique contiguous segment': 'Longest unique contiguous segment', 'Exactly k distinct subarrays': 'Exactly k distinct subarrays', 'Longest consecutive integer run': 'Longest consecutive integer run', 'Top k frequent with stable frequency ties': 'Top k frequent with stable frequency ties', 'Unique randomized set': 'Unique randomized set'}
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

class HashMapTests(unittest.TestCase):
    def test_all_templates(self):
        ns = template(0)
        f = ns['two_sum']
        self.assertEqual(f([], 0), [])
        self.assertEqual(f([3], 6), [])
        self.assertEqual(f([3, 3], 6), [0, 1])
        self.assertEqual(f([0, 4], 4), [0, 1])
        self.assertEqual(f([2, 4], 9), [])
        f = template(1)['same_multiset']
        self.assertTrue(f([], []))
        self.assertTrue(f([1, 2, 1], [2, 1, 1]))
        self.assertFalse(f('ab', 'aab'))
        f = template(2)['group_anagrams']
        self.assertEqual(f([]), [])
        self.assertEqual(f(['eat','tea','a','aa','','']), [['eat','tea'],['a'],['aa'],['','']])
        self.assertEqual(f(['é','é']), [['é'], ['é']])
        f = template(3)['isomorphic']
        for a,b,expected in [('', '', True), ('egg','add',True), ('ab','aa',False), ('aa','ab',False), ('a','',False)]:
            self.assertEqual(f(a,b), expected)
        count = template(4)['count_sum_k']
        longest = template(5)['longest_sum_k']
        divisible = template(6)['count_divisible']
        unique = template(7)['longest_unique']
        exact = template(8)['exactly_k_distinct']
        run = template(9)['longest_consecutive']
        self.assertEqual(count([0,0,0],0),6)
        self.assertEqual(unique('abba'),2)
        self.assertEqual(run([100,4,200,1,3,2,1]),4)
        self.assertEqual(run([1]*1000+list(range(1000))),1000)
        with self.assertRaises(ValueError): divisible([1],0)
        with self.assertRaises(ValueError): exact([], -1)
        rng = random.Random(42)
        for size in range(9):
            for _ in range(30):
                a = [rng.randrange(-2,3) for _ in range(size)]
                original = a[:]
                spans = [a[i:j] for i in range(size) for j in range(i+1,size+1)]
                target = rng.randrange(-3,4)
                self.assertEqual(count(a,target),sum(sum(s)==target for s in spans))
                self.assertEqual(longest(a,target),max([len(s) for s in spans if sum(s)==target] or [0]))
                modulus = rng.choice([-3,-1,1,2,3])
                self.assertEqual(divisible(a,modulus),sum(sum(s)%modulus==0 for s in spans))
                self.assertEqual(unique(a),max([len(s) for s in spans if len(set(s))==len(s)] or [0]))
                k = rng.randrange(5)
                self.assertEqual(exact(a,k),sum(len(set(s))==k for s in spans))
                values = set(a)
                reference = 0
                for start in values:
                    length = 0
                    while start+length in values:
                        length += 1
                    reference = max(reference, length)
                self.assertEqual(run(a),reference)
                self.assertEqual(a,original)
        top = template(10)['top_k_frequent']
        self.assertEqual(top([],0),[])
        self.assertEqual(top([2,1,2,1,3],2),[2,1])
        self.assertEqual(top(iter([4,4,2]),1),[4])
        for bad in (-1,4):
            with self.assertRaises(ValueError): top([1,2,3],bad)
        for _ in range(100):
            a=[rng.randrange(7) for _ in range(30)]
            expected=sorted(Counter(a), key=lambda x: (-a.count(x), a.index(x)))
            k=rng.randrange(len(expected)+1)
            self.assertEqual(top(a,k),expected[:k])
        cls=template(11)['RandomizedSet']
        obj=cls(seed=7)
        with self.assertRaises(ValueError): obj.get_random()
        expected=set()
        for _ in range(500):
            x=rng.randrange(20)
            if rng.randrange(2):
                self.assertEqual(obj.insert(x),x not in expected)
                expected.add(x)
            else:
                self.assertEqual(obj.remove(x),x in expected)
                expected.discard(x)
            self.assertEqual(set(obj.items),expected)
            self.assertEqual(len(obj.items),len(expected))
            self.assertEqual(obj.position,{x:i for i,x in enumerate(obj.items)})
            if expected: self.assertIn(obj.get_random(),expected)
        for x in list(expected): self.assertTrue(obj.remove(x))
        self.assertFalse(obj.remove(99))
        with self.assertRaises(ValueError): obj.get_random()
        # Expensive/colliding keys change costs, not equality correctness.
        class CollisionKey:
            def __init__(self, value): self.value = value
            def __hash__(self): return 0
            def __eq__(self, other):
                return isinstance(other, CollisionKey) and self.value == other.value
        keys = [CollisionKey(x) for x in [1, 2, 1, 3]]
        self.assertEqual(template(7)['longest_unique'](keys), 3)
        self.assertTrue(template(1)['same_multiset'](keys, keys[::-1]))
        self.assertFalse(template(3)['isomorphic'](keys, ['a','a','a','b']))
        self.assertEqual(template(2)['group_anagrams'](['']*1000), [['']*1000])
        self.assertEqual(count([1,-1,0],0),3)
        self.assertEqual(longest([1,-1,1,-1],0),4)
        self.assertEqual(exact([1,2,2],0),0)
        self.assertEqual(exact([1,2,2],1),4)
        self.assertEqual(len({1, True, 1.0}),1)
        self.assertEqual(COVERED,set(range(len(GUIDE['templates']))))
        self.assertEqual(INVOKED, EXPECTED_CALLS, 'every algorithm and class method must actually run successfully')

    def test_schema_and_all_code(self):
        lengths={'operations':6,'fundamentals':6,'patterns':10,'recognize':3,'contrasts':2,'edges':3,'mistakes':2,'impress':2,'memory':3,'templates':5,'practice':5}
        for field,width in lengths.items():
            self.assertTrue(GUIDE[field])
            for row in GUIDE[field]: self.assertEqual(len(row),width,(field,row[0]))
        for row in GUIDE['fundamentals']:
            ns={}
            exec(compile(ast.parse(chr(10).join(row[2])),row[0],'exec'),ns)
        for row in GUIDE['templates']:
            compile(ast.parse(chr(10).join(row[3])),row[0],'exec')

if __name__=='__main__': unittest.main(verbosity=2)
