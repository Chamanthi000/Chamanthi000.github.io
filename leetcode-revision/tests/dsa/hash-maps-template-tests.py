"""Fresh-namespace functional and adversarial tests for every hash-map template."""
import ast
import json
import random
import unittest
from collections import Counter
from pathlib import Path

GUIDE = json.loads(Path(__file__).with_name('hash-maps-guide.json').read_text())
COVERED = set()

def template(index):
    entry = GUIDE['templates'][index]
    ns = {}
    exec(compile(ast.parse(chr(10).join(entry[3])), entry[0], 'exec'), ns)
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
        duplicate=template(12)['contains_duplicate']
        for a,expected in [([],False),([1],False),([1,2,1],True),([0,False],True)]:
            self.assertEqual(duplicate(a),expected)
        with self.assertRaises(TypeError): duplicate([[1]])
        ns=template(13); unique_overlap=ns['unique_intersection']; overlap=ns['multiset_intersection']
        self.assertEqual(unique_overlap([2,1,2,3],[2,2,3]),[2,3])
        self.assertEqual(overlap([2,1,2,2,3],[2,2,3]),[2,2,3])
        self.assertEqual(overlap([],[]),[])
        self.assertEqual(unique_overlap(iter([2,1,2]),iter([1,2])),[2,1])
        join=template(14)['four_sum_count']
        self.assertEqual(join([0,0],[0],[0,0],[0]),4)
        self.assertEqual(join([], [0],[0],[0]),0)
        atmost=template(15)['longest_at_most_k']
        self.assertEqual(atmost([],0),0)
        self.assertEqual(atmost([1,2,2],1),2)
        self.assertEqual(atmost([1,2],0),0)
        with self.assertRaises(ValueError): atmost([], -1)
        window=template(16)['minimum_window']
        for text,target,expected in [('ADOBECODEBANC','ABC','BANC'),('aa','aa','aa'),('ab','aa',''),('','a',''),('a','',''),('abxba','ab','ab')]:
            self.assertEqual(window(text,target),expected)
        for size in range(8):
            for _ in range(30):
                a=[rng.randrange(4) for _ in range(size)]; original=a[:]
                b=[rng.randrange(4) for _ in range(size+1)]
                self.assertEqual(duplicate(a),len(a)!=len(set(a)))
                self.assertEqual(unique_overlap(a,b),list(dict.fromkeys(x for x in a if x in b)))
                self.assertEqual(Counter(overlap(a,b)),Counter(a)&Counter(b))
                k=rng.randrange(4)
                spans=[a[i:j] for i in range(size) for j in range(i+1,size+1)]
                self.assertEqual(atmost(a,k),max([len(x) for x in spans if len(set(x))<=k] or [0]))
                text=''.join(map(str,a)); target=''.join(str(rng.randrange(4)) for _ in range(3))
                need=Counter(target); best=''
                for i in range(len(text)):
                    for j in range(i+1,len(text)+1):
                        candidate=text[i:j]
                        if not (need-Counter(candidate)) and (not best or len(candidate)<len(best)):
                            best=candidate
                self.assertEqual(window(text,target),best)
                self.assertEqual(a,original)
        for _ in range(100):
            populations=[[rng.randrange(-2,3) for _ in range(rng.randrange(5))] for _ in range(4)]
            a,b,c,d=populations
            self.assertEqual(join(a,b,c,d),sum(w+x+y+z==0 for w in a for x in b for y in c for z in d))
        self.assertEqual(COVERED,set(range(len(GUIDE['templates']))))

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

if __name__=='__main__': unittest.main(verbosity=2)
