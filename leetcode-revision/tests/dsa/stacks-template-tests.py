from call_coverage import load_template, verify
"""Functional, brute-force and resource-depth checks for every stack template."""
import ast
import itertools
import json
import random
import unittest
from pathlib import Path
GUIDE=json.loads(Path(__file__).with_name('stacks-guide.json').read_text())
COVERED=set()
def template(i):
    row = GUIDE['templates'][i]
    ns = load_template(row)
    COVERED.add(i)
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
        cls=template(14)['StockSpanner']
        obj=cls(); self.assertEqual([obj.next(x) for x in [100,80,60,70,60,75,85]],[1,1,1,2,1,4,6])
        obj=cls(); prices=[]
        for _ in range(500):
            price=rng.randrange(20); prices.append(price); span=0
            for old in reversed(prices):
                if old>price: break
                span+=1
            self.assertEqual(obj.next(price),span)
        distinct=template(15)['smallest_distinct_subsequence']
        self.assertEqual(distinct('cbacdcbc'),'acdb'); self.assertEqual(distinct(''),'')
        for size in range(9):
            for _ in range(30):
                text=''.join(rng.choice('abc') for _ in range(size)); required=set(text)
                options=[]
                for ids in itertools.combinations(range(size),len(required)):
                    candidate=''.join(text[i] for i in ids)
                    if set(candidate)==required: options.append(candidate)
                self.assertEqual(distinct(text),min(options))
        ns=template(16); cls=ns['TreeNode']; post=ns['postorder']
        self.assertEqual(post(None),[])
        root=cls(1,cls(2,cls(4)),cls(3)); self.assertEqual(post(root),[4,2,3,1])
        links=(root.left,root.right,root.left.left); post(root)
        self.assertEqual((root.left,root.right,root.left.left),links)
        root=None
        for i in range(5000): root=cls(i,root)
        self.assertEqual(post(root),list(range(5000)))
        calc=template(17)['calculate']
        for expression,expected in [('1 + 1',2),(' 2-1 + 2 ',3),('(1+(4+5+2)-3)+(6+8)',23),('-(3-(-2))',-5),('1--2',3),('--3',3),('1-(-(-2))',-1),('('+ '('*2000+'7'+')'*2000 +')',7)]:
            self.assertEqual(calc(expression),expected)
        for expression in ['', ' ', '()', '1 2','1(', '(1','1)', '1+','1a','2(3)','(1)(2)','1*2']:
            with self.assertRaises(ValueError): calc(expression)
        def expression(depth):
            if depth==0:
                value=rng.randrange(20)
                return str(value),value
            a,x=expression(depth-1); b,y=expression(depth-1)
            if rng.randrange(2): return '('+a+'-'+b+')',x-y
            return '-('+a+'+'+b+')',-(x+y)
        for _ in range(150):
            text,value=expression(4); self.assertEqual(calc(text),value)
        exact_dfs=template(18)['recursive_style_dfs']
        def recursive_reference(graph,start):
            seen=set(); order=[]
            def visit(v):
                seen.add(v); order.append(v)
                for w in graph.get(v,[]):
                    if w not in seen: visit(w)
            visit(start)
            return order
        graph={0:[1,2],1:[2,3],2:[4],3:[],4:[]}
        self.assertEqual(exact_dfs(graph,0),[0,1,2,4,3])
        self.assertEqual(exact_dfs({},0),[0])
        for _ in range(100):
            graph={v:[w for w in range(12) if rng.randrange(4)==0] for v in range(12)}
            self.assertEqual(exact_dfs(graph,0),recursive_reference(graph,0))
        self.assertEqual(exact_dfs({i:[i+1] for i in range(5000)},0),list(range(5001)))
        water=template(19)['trapped_water']
        self.assertEqual(water([0,1,0,2,1,0,1,3,2,1,2,1]),6)
        self.assertEqual(water([]),0)
        with self.assertRaises(ValueError): water([-1])
        matrix_area=template(6)['maximal_rectangle']; ranges=template(7)['sum_subarray_ranges']
        self.assertEqual(ranges([-2,1,-2]),9)
        self.assertEqual(matrix_area([]),0); self.assertEqual(matrix_area([[],[]]),0)
        self.assertEqual(matrix_area(['10100','10111','11111','10010']),6)
        for matrix in [[[1],[1,0]],[[2]],[[1.0]]]:
            with self.assertRaises(ValueError): matrix_area(matrix)
        for size in range(9):
            for _ in range(30):
                a=[rng.randrange(6) for _ in range(size)]; original=a[:]
                expected=sum(max(0,min(max(a[:i+1]),max(a[i:]))-x) for i,x in enumerate(a))
                self.assertEqual(water(a),expected)
                self.assertEqual(ranges(a),sum(max(a[i:j])-min(a[i:j]) for i in range(size) for j in range(i+1,size+1)))
                self.assertEqual(a,original)
        for rows in range(5):
            for cols in range(5):
                for _ in range(10):
                    matrix=[[rng.randrange(2) for _ in range(cols)] for _ in range(rows)]
                    best=0
                    for top in range(rows):
                        for bottom in range(top+1,rows+1):
                            for left in range(cols):
                                for right in range(left+1,cols+1):
                                    if all(matrix[i][j] for i in range(top,bottom) for j in range(left,right)):
                                        best=max(best,(bottom-top)*(right-left))
                    self.assertEqual(matrix_area(matrix),best)
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
