from call_coverage import load_template, verify
"""Identity, mutation, restoration and boundary tests for every list template."""
import ast
import json
import random
import unittest
from pathlib import Path
GUIDE=json.loads(Path(__file__).with_name('linked-lists-guide.json').read_text())
COVERED=set()
def template(i):
    row = GUIDE['templates'][i]
    ns = load_template(row)
    COVERED.add(i)
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
        ns=template(13); cls=ns['Node']; middle=ns['second_middle']
        for size in range(12):
            head,nodes=build(cls,range(size)); links=[x.next for x in nodes]
            self.assertIs(middle(head),nodes[size//2] if size else None)
            self.assertEqual([x.next for x in nodes],links)
        ns=template(14); cls=ns['Node']
        for size in range(20):
            for _ in range(15):
                vals=[rng.randrange(5) for _ in range(size)]
                head,nodes=build(cls,vals)
                self.assertEqual(walk(ns['remove_values'](head,2)),[x for x in nodes if x.val!=2])
                vals.sort(); head,nodes=build(cls,vals)
                expected=[x for i,x in enumerate(nodes) if i==0 or x.val!=nodes[i-1].val]
                self.assertEqual(walk(ns['keep_one_per_run'](head)),expected)
                head,nodes=build(cls,vals)
                expected=[x for x in nodes if vals.count(x.val)==1]
                self.assertEqual(walk(ns['remove_duplicate_runs'](head)),expected)
        ns=template(15); cls=ns['Node']; rotate=ns['rotate_right']
        for size in range(12):
            for k in [0,1,2,11,10**9]:
                head,nodes=build(cls,range(size)); shift=k%size if size else 0
                self.assertEqual(walk(rotate(head,k)),nodes[-shift:]+nodes[:-shift] if shift else nodes)
        head,nodes=build(cls,[1,2]); links=[x.next for x in nodes]
        with self.assertRaises(ValueError): rotate(head,-1)
        self.assertEqual([x.next for x in nodes],links)
        ns=template(16); cls=ns['Node']; sort=ns['sort_list']
        for size in list(range(35))+[5000]:
            vals=[rng.randrange(-10,11) for _ in range(size)]
            head,nodes=build(cls,vals)
            self.assertEqual(walk(sort(head)),sorted(nodes,key=lambda x:x.val))
            self.assertEqual([x.val for x in nodes],vals)
        ns=template(17); cls=ns['RandomNode']; copy=ns['copy_random_map']
        self.assertIsNone(copy(None))
        for size in [1,2,12]:
            head,nodes=build(cls,range(size))
            for x in nodes: x.random=rng.choice(nodes+[None])
            links=[x.next for x in nodes]; targets=[x.random for x in nodes]
            out=walk(copy(head)); self.assertEqual([x.val for x in out],list(range(size)))
            self.assertTrue(set(out).isdisjoint(nodes))
            for i,x in enumerate(out):
                self.assertIs(x.random,out[nodes.index(targets[i])] if targets[i] is not None else None)
            self.assertEqual([x.next for x in nodes],links)
            self.assertEqual([x.random for x in nodes],targets)
        head=cls(1); head.random=cls(2)
        with self.assertRaises(ValueError): copy(head)
        self.assertIsNone(head.next)
        cache=template(18)['LRUCache']
        with self.assertRaises(ValueError): cache(-1)
        for capacity in range(5):
            obj=cache(capacity); model={}
            missing=object()
            for _ in range(500):
                key=rng.randrange(8)
                if rng.randrange(2):
                    value=rng.choice([None,0,3,False])
                    obj.put(key,value)
                    model.pop(key,None); model[key]=value
                    if len(model)>capacity: del model[next(iter(model))]
                else:
                    expected=model.get(key,missing)
                    self.assertIs(obj.get(key,missing),expected)
                    if key in model: value=model.pop(key); model[key]=value
                self.assertEqual(set(obj.nodes),set(model))
                seen=[]; cur=obj.left
                while cur is not obj.right:
                    nxt=cur.next; self.assertIs(nxt.prev,cur)
                    cur=nxt
                    if cur is not obj.right: seen.append(cur.key)
                    self.assertLessEqual(len(seen),capacity)
                self.assertEqual(seen,list(model))
                self.assertEqual({k:v.value for k,v in obj.nodes.items()},model)
        self.assertEqual(COVERED,set(range(len(GUIDE['templates']))))

    def test_schema_and_code(self):
        widths={'operations':6,'fundamentals':6,'patterns':10,'recognize':3,'contrasts':2,'edges':3,'mistakes':2,'impress':2,'memory':3,'templates':5,'practice':5}
        for field,width in widths.items():
            for row in GUIDE[field]: self.assertEqual(len(row),width,(field,row[0]))
        for row in GUIDE['fundamentals']: exec(compile(ast.parse(chr(10).join(row[2])),row[0],'exec'),{})
        for row in GUIDE['templates']: compile(ast.parse(chr(10).join(row[3])),row[0],'exec')


    def test_aligned_details_and_executable_examples(self):
        pairs={'operations':('operationExamples',['code','result','use','mutation']),
               'fundamentals':('fundamentalDetails',['why','use','result','edge','takeaway']),
               'patterns':('patternDetails',['steps','templates','related','variations']),
               'templates':('templateDetails',['pattern','preconditions','observation']),
               'practice':('practiceDetails',['insight','secondary'])}
        names={row[0] for row in GUIDE['templates']}
        self.assertEqual(len(names),len(GUIDE['templates']))
        patterns={row[0] for row in GUIDE['patterns']}
        referenced=set()
        for base,(supplement,fields) in pairs.items():
            self.assertEqual(len(GUIDE[base]),len(GUIDE[supplement]))
            for i,detail in enumerate(GUIDE[supplement]):
                for field in fields:
                    self.assertIn(field,detail,(supplement,i))
                    self.assertTrue(detail[field],(supplement,i,field))
                if supplement=='patternDetails':
                    self.assertTrue(set(detail['templates'])<=names)
                    referenced.update(detail['templates'])
                if supplement=='templateDetails':
                    self.assertIn(detail['pattern'],patterns)
        self.assertEqual(referenced,names)
        for i,entry in enumerate(GUIDE['operationExamples']):
            ns={}
            exec(compile(ast.parse(chr(10).join(entry['code'])),'operation '+str(i),'exec'),ns)
            self.assertEqual(repr(ns['result']),entry['result'],i)
        for i,row in enumerate(GUIDE['fundamentals']):
            ns={}
            exec(compile(ast.parse(chr(10).join(row[2])),row[0],'exec'),ns)
            self.assertEqual(repr(ns['result']),GUIDE['fundamentalDetails'][i]['result'],row[0])
        self.assertTrue(GUIDE['decisionProcess'])
        for source in GUIDE['sources']:
            self.assertTrue(source['title']); self.assertTrue(source['note'])
            self.assertTrue(source['url'].startswith('https://'))

if __name__=='__main__':
    result = unittest.main(verbosity=2, exit=False)
    if not result.result.wasSuccessful():
        raise SystemExit(1)
    verify(GUIDE)
