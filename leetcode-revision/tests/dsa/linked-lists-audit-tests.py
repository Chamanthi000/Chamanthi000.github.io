"""Identity, mutation, restoration and boundary tests for every list template."""
import ast
import json
import random
import unittest
from pathlib import Path
GUIDE=json.loads(Path(__file__).with_name('linked-lists-guide.json').read_text())

# Audit regressions execute final canonical code, selected by semantic identity.
_audit_titles = {'Iterative full reversal': 'Iterative full reversal', 'Remove nth node from end': 'Remove nth node from end', 'Stable merge two sorted disjoint lists': 'Stable merge two sorted disjoint lists', 'Floyd cycle entrance by identity': 'Floyd cycle entrance by identity', 'Acyclic intersection by pointer switching': 'Acyclic intersection by pointer switching', 'Reverse a validated inclusive segment': 'Reverse a validated inclusive segment', 'Reverse complete k-groups': 'Reverse complete k-groups', 'Stable partition around a value': 'Stable partition around a value', 'Palindrome with exact link restoration': 'Palindrome with exact link restoration', 'Reorder outside-in by weaving': 'Reorder outside-in by weaving', 'Interleaved deep copy with random pointers': 'Interleaved deep copy with random pointers', 'Heap merge k sorted disjoint lists': 'Heap merge k sorted disjoint lists', 'Add reversed base-10 digit chains': 'Add reversed base-10 digit chains', 'Two-pass read-only random-pointer clone': 'Read-only random-pointer clone with identity map', 'LRU cache with hash index and doubly linked sentinels': 'LRU cache with sentinel doubly linked order'}
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
                  and node.name not in {'Node', 'RandomNode', '_CacheNode', 'DNode'}]
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

def build(cls, values):
    nodes=[cls(x) for x in values]
    for a,b in zip(nodes,nodes[1:]): a.next=b
    return (nodes[0] if nodes else None),nodes

def walk(head):
    nodes=[]
    seen=set()
    while head is not None:
        if id(head) in seen: raise AssertionError('unexpected cycle')
        seen.add(id(head)); nodes.append(head); head=head.next
    return nodes

class ListTests(unittest.TestCase):
    def test_all_templates(self):
        ns=template(0); cls=ns['Node']; reverse=ns['reverse']
        for values in ([],[1],[1,2],list(range(5000))):
            head,nodes=build(cls,values)
            self.assertEqual(walk(reverse(head)),nodes[::-1])
        ns=template(1); cls=ns['Node']; f=ns['remove_nth']
        for size in range(1,9):
            for n in range(1,size+1):
                head,nodes=build(cls,range(size))
                expected=nodes[:size-n]+nodes[size-n+1:]
                self.assertEqual(walk(f(head,n)),expected)
        for n in (-1,0,4):
            head,nodes=build(cls,[1,2,3]); links=[x.next for x in nodes]
            with self.assertRaises(ValueError): f(head,n)
            self.assertEqual([x.next for x in nodes],links)
        with self.assertRaises(ValueError): f(None,1)
        ns=template(2); cls=ns['Node']; f=ns['merge_sorted']
        self.assertIsNone(f(None,None))
        a,an=build(cls,[1,1,3]); b,bn=build(cls,[1,2,4])
        self.assertEqual(walk(f(a,b)),[an[0],an[1],bn[0],bn[1],an[2],bn[2]])
        ns=template(3); cls=ns['Node']; f=ns['cycle_entry']
        self.assertIsNone(f(None))
        head,nodes=build(cls,[1,1,1]); self.assertIsNone(f(head))
        for entry in range(3):
            head,nodes=build(cls,[1,1,1]); nodes[-1].next=nodes[entry]
            self.assertIs(f(head),nodes[entry])
        a=cls(0); a.next=a; self.assertIs(f(a),a)
        ns=template(4); cls=ns['Node']; f=ns['intersection']
        self.assertIsNone(f(None,None))
        a,an=build(cls,[1,2]); b,bn=build(cls,[1,2]); self.assertIsNone(f(a,b))
        shared,sn=build(cls,[3,4]); an[-1].next=shared; bn[-1].next=shared
        links=[x.next for x in an+bn+sn]
        self.assertIs(f(a,b),shared); self.assertIs(f(shared,shared),shared)
        self.assertIsNone(f(None,a)); self.assertEqual([x.next for x in an+bn+sn],links)
        ns=template(5); cls=ns['Node']; f=ns['reverse_between']
        for size in range(1,9):
            for left in range(1,size+1):
                for right in range(left,size+1):
                    head,nodes=build(cls,range(size))
                    self.assertEqual(walk(f(head,left,right)),nodes[:left-1]+nodes[left-1:right][::-1]+nodes[right:])
        for left,right in [(0,2),(2,1),(1,4)]:
            head,nodes=build(cls,[1,2,3]); links=[x.next for x in nodes]
            with self.assertRaises(ValueError): f(head,left,right)
            self.assertEqual([x.next for x in nodes],links)
        with self.assertRaises(ValueError): f(None,1,1)
        ns=template(6); cls=ns['Node']; f=ns['reverse_k_group']
        for size in range(10):
            for k in range(1,12):
                head,nodes=build(cls,range(size)); expected=[]
                for i in range(0,size,k):
                    group=nodes[i:i+k]; expected.extend(group[::-1] if len(group)==k else group)
                self.assertEqual(walk(f(head,k)),expected)
        with self.assertRaises(ValueError): f(None,0)
        ns=template(7); cls=ns['Node']; f=ns['partition']; rng=random.Random(9)
        for size in range(20):
            values=[rng.randrange(5) for _ in range(size)]
            head,nodes=build(cls,values)
            self.assertEqual(walk(f(head,2)),[x for x in nodes if x.val<2]+[x for x in nodes if x.val>=2])
        ns=template(8); cls=ns['Node']; f=ns['is_palindrome']
        for values in ([],[1],[1,2],[1,1],[1,2,1],[1,2,2,1],[1,2,3,1],list(range(5000))):
            head,nodes=build(cls,values); links=[x.next for x in nodes]
            self.assertEqual(f(head),values==values[::-1]); self.assertEqual(walk(head),nodes)
            self.assertEqual([x.next for x in nodes],links)
        ns=template(9); cls=ns['Node']; f=ns['reorder']
        for size in range(20):
            head,nodes=build(cls,range(size)); expected=[]; lo,hi=0,size-1
            while lo<=hi:
                expected.append(nodes[lo]); lo+=1
                if lo<=hi: expected.append(nodes[hi]); hi-=1
            self.assertEqual(walk(f(head)),expected)
        ns=template(10); cls=ns['RandomNode']; f=ns['copy_random']
        self.assertIsNone(f(None))
        for size in (1,2,9):
            head,nodes=build(cls,range(size))
            for i,x in enumerate(nodes): x.random=nodes[(i*3)%size] if i%3 else None
            if size==1: nodes[0].random=nodes[0]
            links=[x.next for x in nodes]; randoms=[x.random for x in nodes]
            clones=walk(f(head)); self.assertEqual([x.val for x in clones],list(range(size)))
            self.assertTrue(set(nodes).isdisjoint(clones))
            self.assertEqual([x.next for x in nodes],links); self.assertEqual([x.random for x in nodes],randoms)
            for i,x in enumerate(clones):
                expected=clones[nodes.index(randoms[i])] if randoms[i] is not None else None
                self.assertIs(x.random,expected)
        ns=template(11); cls=ns['Node']; f=ns['merge_k']
        self.assertIsNone(f([])); self.assertIsNone(f([None,None]))
        heads=[]; all_nodes=[]
        for values in ([1,1,4],[1,3,4],[],[2,6]):
            head,nodes=build(cls,values); heads.append(head); all_nodes.extend(nodes)
        out=walk(f(heads)); self.assertEqual([x.val for x in out],[1,1,1,2,3,4,4,6]); self.assertEqual(set(out),set(all_nodes))
        ns=template(12); cls=ns['Node']; f=ns['add_numbers']
        for a,b in [([],[]),([9,9],[1]),([0],[0]),([2,4,3],[5,6,4]),([1],[])]:
            ah,an=build(cls,a); bh,bn=build(cls,b); links=[x.next for x in an+bn]
            out=walk(f(ah,bh)); number=lambda digits: sum(x*10**i for i,x in enumerate(digits))
            self.assertEqual(number([x.val for x in out]),number(a)+number(b))
            self.assertTrue(set(out).isdisjoint(an+bn)); self.assertEqual([x.next for x in an+bn],links)
        for value in (-1,10,1.5):
            with self.assertRaises(ValueError): f(cls(value),None)
        # finally restores aliases even when overloaded comparison aborts.
        ns=template(8); cls=ns['Node']; palindrome=ns['is_palindrome']
        class BadComparison:
            def __ne__(self, other): raise RuntimeError('comparison failed')
        for values in ([BadComparison(),0,0,1], [1,BadComparison(),0,1]):
            head,nodes=build(cls,values); links=[x.next for x in nodes]
            with self.assertRaises(RuntimeError): palindrome(head)
            self.assertEqual([x.next for x in nodes],links)
            self.assertEqual(walk(head),nodes)
        # Two-pass clone never writes source links and shares payload objects only.
        ns=template(13); cls=ns['RandomNode']; clone=ns['copy_random_map']
        self.assertIsNone(clone(None))
        for size in range(1,16):
            payloads=[[i] for i in range(size)]
            head,nodes=build(cls,payloads)
            for node in nodes: node.random=rng.choice(nodes+[None])
            links=[x.next for x in nodes]; randoms=[x.random for x in nodes]
            copies=walk(clone(head)); self.assertTrue(set(nodes).isdisjoint(copies))
            self.assertEqual([x.next for x in nodes],links)
            self.assertEqual([x.random for x in nodes],randoms)
            for i,node in enumerate(copies):
                self.assertIs(node.val,payloads[i])
                self.assertIs(node.random, copies[nodes.index(randoms[i])] if randoms[i] is not None else None)
        class ReadOnlyNode:
            def __init__(self, val, next=None):
                self._val,self._next=val,next
            @property
            def val(self): return self._val
            @property
            def next(self): return self._next
            @property
            def random(self): return self
        readonly=ReadOnlyNode(1,ReadOnlyNode(2))
        copied=walk(clone(readonly))
        self.assertEqual([x.val for x in copied],[1,2])
        for node in copied: self.assertIs(node.random,node)
        # Interleaving also copies topology, not nested mutable payloads.
        ns=template(10); payload=[]; original=ns['RandomNode'](payload)
        copied=ns['copy_random'](original)
        self.assertIsNot(copied,original); self.assertIs(copied.val,payload)
        self.assertIsNone(original.next)
        # LRU reference model and both-direction sentinel/map invariants.
        from collections import OrderedDict
        Cache=template(14)['LRUCache']
        with self.assertRaises(ValueError): Cache(-1)
        for capacity in (0,1,2,7):
            cache=Cache(capacity); reference=OrderedDict()
            for _ in range(500):
                key=rng.randrange(10)
                if rng.randrange(3)==0:
                    expected=reference.pop(key) if key in reference else -1
                    if expected != -1: reference[key]=expected
                    self.assertEqual(cache.get(key, -1),expected)
                else:
                    value=rng.choice([None,0,5,9])
                    reference.pop(key,None)
                    if capacity:
                        reference[key]=value
                        if len(reference)>capacity: reference.popitem(last=False)
                    self.assertIsNone(cache.put(key,value))
                order=[]; node=cache.left; visited=set()
                while node is not cache.right:
                    self.assertNotIn(id(node),visited); visited.add(id(node))
                    self.assertIs(node.next.prev,node)
                    node=node.next
                    if node is not cache.right:
                        order.append(node.key)
                        self.assertIs(cache.nodes[node.key],node)
                        self.assertEqual(node.value,reference[node.key])
                self.assertEqual(order,list(reference))
                self.assertEqual(set(cache.nodes),set(reference))
                self.assertLessEqual(len(cache.nodes),capacity)
            self.assertEqual(cache.get('absent', -1),-1)
        cache=Cache(2)
        cache.put('A',1); cache.put('B',2); self.assertEqual(cache.get('A', -1),1)
        cache.put('C',3); self.assertEqual(cache.get('B', -1),-1)
        cache.put('A',0); cache.put('D',4)
        self.assertEqual(cache.get('C', -1),-1); self.assertEqual(cache.get('A', -1),0)
        cache.put('A',-1); self.assertEqual(cache.get('A', -1),-1)
        self.assertEqual(COVERED,set(range(len(GUIDE['templates']))))
        self.assertEqual(INVOKED, EXPECTED_CALLS, 'every algorithm and class method must actually run successfully')

    def test_schema_and_code(self):
        widths={'operations':6,'fundamentals':6,'patterns':10,'recognize':3,'contrasts':2,'edges':3,'mistakes':2,'impress':2,'memory':3,'templates':5,'practice':5}
        for field,width in widths.items():
            for row in GUIDE[field]: self.assertEqual(len(row),width,(field,row[0]))
        for row in GUIDE['fundamentals']: exec(compile(ast.parse(chr(10).join(row[2])),row[0],'exec'),{})
        for row in GUIDE['templates']: compile(ast.parse(chr(10).join(row[3])),row[0],'exec')

if __name__=='__main__': unittest.main(verbosity=2)
