"""Execute every array template from JSON, plus examples and differential checks."""
import ast, contextlib, io, json, pathlib, random, itertools, math, bisect
D=json.loads(pathlib.Path(__file__).with_name('arrays-guide.json').read_text())

# Normalized tuple shapes and rich row-aligned content are hard requirements.
for key,width in [('operations',6),('fundamentals',6),('patterns',10),('recognize',3),('contrasts',2),('edges',3),('mistakes',2),('impress',2),('memory',3),('templates',5),('practice',5)]:
    assert all(len(row)==width for row in D[key]),key
for extra,base,keys in [('operationExamples','operations',{'code','result','use','mutation'}),('fundamentalDetails','fundamentals',{'why','use','result','edge','takeaway'}),('patternDetails','patterns',{'steps','templates','related','variations'}),('templateDetails','templates',{'pattern','preconditions','observation'}),('practiceDetails','practice',{'insight','secondary'})]:
    assert len(D[extra])==len(D[base]),extra
    assert all(keys<=row.keys() and all(row[k] for k in keys) for row in D[extra]),extra
names={t[0] for t in D['templates']}
assert len(names)==len(D['templates'])
assert all(set(p['templates'])<=names for p in D['patternDetails'])
assert {name for p in D['patternDetails'] for name in p['templates']}==names
assert len({p[0].split()[1] for p in D['practice']})==len(D['practice'])
assert D['decisionProcess'] and all(all(source.get(k) for k in ['title','url','note']) for source in D['sources'])
for key,index in [('fundamentals',2),('templates',3)]:
    for row in D[key]:ast.parse('\n'.join(row[index]),feature_version=(3,10))
for row in D['operationExamples']:ast.parse('\n'.join(row['code']),feature_version=(3,10))

NS=[]
for t in D['templates']:
    ns={}; code='\n'.join(t[3]); ast.parse(code); exec(compile(code,t[0],'exec'),ns); NS.append(ns)

# Each fundamental's displayed result is checked, not merely executed.
fundamental_checks = ["stdout=='30\\n'","stdout=='0 4\\n1 7\\n2 9\\n9\\n7\\n4\\n'","nums==[0,1,2,3] and last==4","middle==[4,6,8] and reverse_copy==[10,8,6,4,2]","a==[1,4] and removed==2","a==[[9],[2,3]] and independent==a and independent[0] is not a[0]","ordered==[(1,'x'),(2,'b'),(2,'a')] and nums==[1,2,3]","i==1 and found","freq=={2:2,5:1,7:1} and stdout=='duplicate 2\\n'","subarray==[2,3] and subsequence==[1,3] and subset=={1,4}","grid==[[0,1,2,3],[1,2,3,4],[2,3,4,5]]","prefix==[0,3,2,6,8] and answer==3","a==[1,3,12,0,0] and write==3","left==3 and total==1"]
for f,check in zip(D['fundamentals'],fundamental_checks):
    env={};out=io.StringIO()
    with contextlib.redirect_stdout(out):exec('\n'.join(f[2]),env)
    assert eval(check,dict(env,stdout=out.getvalue())),(f[0],check,out.getvalue())

checks=0; covered=set()
def test(i,fn,args,expected,normalize=lambda x:x):
    global checks
    got=NS[i][fn](*args)
    assert normalize(got)==expected,(i,fn,args,got,expected)
    checks+=1; covered.add(i)
def raises(i,fn,args):
    global checks
    try: NS[i][fn](*args)
    except ValueError: checks+=1; covered.add(i)
    else: raise AssertionError((i,'expected ValueError'))
for e in D['operationExamples']: exec('\n'.join(e['code']),{})
for f in D['fundamentals']:
    with contextlib.redirect_stdout(io.StringIO()): exec('\n'.join(f[2]),{})
test(0,'two_sum',([2,7,11],9),[0,1]);test(0,'two_sum',([],0),[]);test(0,'two_sum',([3,3],6),[0,1])
test(1,'pair_sorted',([1,2,4],6),(1,2));test(1,'pair_sorted',([],1),None);test(1,'pair_sorted',([3,3],6),(0,1))
for arr,val,exp in [([3,2,3],3,[2]),([],1,[]),([0,0,1,0],0,[1])]:
    n=NS[2]['remove_value'](arr,val);assert arr[:n]==exp;checks+=1;covered.add(2)
test(3,'max_k_sum',([1,3,-2,4],2),4);test(3,'max_k_sum',([],0),None);test(3,'max_k_sum',([-5,-2,-9],1),-2)
test(4,'min_len_positive',([2,3,1,2,4,3],7),2);test(4,'min_len_positive',([],3),0);test(4,'min_len_positive',([1,1],3),0)
test(5,'count_sum_k',([1,1,1],2),2);test(5,'count_sum_k',([],0),0);test(5,'count_sum_k',([0,0],0),3)
test(6,'product_except_self',([1,2,3,4],),[24,12,8,6]);test(6,'product_except_self',([],),[]);test(6,'product_except_self',([0,1,0],),[0,0,0])
test(7,'lower_bound',([1,3,3],3),1);test(7,'lower_bound',([],3),0);test(7,'lower_bound',([1,2],9),2)
test(8,'first_feasible',(1,10,lambda x:x>=7),7);test(8,'first_feasible',(4,4,lambda x:True),4);test(8,'first_feasible',(-4,0,lambda x:x>=-3),-3)
test(9,'merge',([[4,5],[1,3],[3,4]],),[[1,5]]);test(9,'merge',([],),[]);test(9,'merge',([[1,1],[2,2]],),[[1,1],[2,2]])
test(10,'max_subarray',([1,-2,3,4],),7);test(10,'max_subarray',([],),None);test(10,'max_subarray',([-5,-2,-4],),-2)
test(11,'next_greater',([2,1,3],),[3,3,-1]);test(11,'next_greater',([],),[]);test(11,'next_greater',([2,2,1],),[-1,-1,-1])
test(12,'window_max',([1,3,-1,-3,5,3,6,7],3),[3,3,5,5,6,7]);test(12,'window_max',([],1),[]);test(12,'window_max',([2,2,2],2),[2,2])
test(13,'place_1_to_n',([3,4,-1,1],),[1,-1,3,4]);test(13,'place_1_to_n',([],),[]);test(13,'place_1_to_n',([2,2,0],),[2,2,0])
test(14,'top_k',([3,1,5,5],2),[5,5],sorted);test(14,'top_k',([],2),[]);test(14,'top_k',([3,1],9),[1,3],sorted)
for grid in [[],[[]],[[1,-2,3],[4,5,6]]]:
    p=NS[15]['prefix_2d'](grid);r=len(grid);c=len(grid[0]) if r else 0
    test(15,'rectangle_sum',(p,0,0,r,c),sum(map(sum,grid)))
raises(15,'prefix_2d',([[1],[2,3]],));raises(15,'rectangle_sum',([[0]],0,0,1,1))
test(16,'sort_colors',([2,0,2,1,1,0],),[0,0,1,1,2,2]);test(16,'sort_colors',([],),[]);test(16,'sort_colors',([2,2,0],),[0,2,2])
test(17,'merge_sorted',([1,3,0,0],2,[2,4],2),[1,2,3,4]);test(17,'merge_sorted',([],0,[],0),[]);test(17,'merge_sorted',([0,0],0,[1,2],2),[1,2])
test(18,'longest_consecutive',([100,4,200,1,3,2],),4);test(18,'longest_consecutive',([],),0);test(18,'longest_consecutive',([1,1,2,2,3],),3)
test(19,'majority',([2,2,1,2],),2);test(19,'majority',([],),None);test(19,'majority',([8],),8)
test(20,'find_duplicate',([1,3,4,2,2],),2);test(20,'find_duplicate',([1,1],),1);test(20,'find_duplicate',([2,2,2,2,2],),2)
test(21,'three_sum',([-1,0,1,2,-1,-4],),[[-1,-1,2],[-1,0,1]]);test(21,'three_sum',([],),[]);test(21,'three_sum',([0,0,0,0],),[[0,0,0]])
test(22,'search_rotated',([4,5,6,7,0,1,2],0),4);test(22,'search_rotated',([],0),-1);test(22,'search_rotated',([1],2),-1)
test(23,'range_add',(5,[(1,3,2),(2,4,3)]),[0,2,5,5,3]);test(23,'range_add',(0,[]),[]);test(23,'range_add',(1,[(0,0,-2),(0,0,5)]),[3])
test(24,'top_k_frequent',([1,1,1,2,2,3],2),{1,2},set);test(24,'top_k_frequent',([],2),[]);test(24,'top_k_frequent',([1,2],0),[])
test(25,'lis_length',([10,9,2,5,3,7,101,18],),4);test(25,'lis_length',([],),0);test(25,'lis_length',([2,2,2],),1)
test(26,'max_product',([2,3,-2,4],),6);test(26,'max_product',([],),None);test(26,'max_product',([-2,0,-1],),0)
test(27,'next_permutation',([1,2,3],),[1,3,2]);test(27,'next_permutation',([],),[]);test(27,'next_permutation',([3,2,1],),[1,2,3]);test(27,'next_permutation',([1,1,5],),[1,5,1])
test(28,'trap',([0,1,0,2,1,0,1,3,2,1,2,1],),6);test(28,'trap',([],),0);test(28,'trap',([3,3,3],),0)
test(29,'min_jumps',([2,3,1,1,4],),2);test(29,'min_jumps',([],),0);test(29,'min_jumps',([3,2,1,0,4],),-1)
test(30,'kth_largest',([3,2,1,5,6,4],2),5);test(30,'kth_largest',([],1),None);test(30,'kth_largest',([7]*2000,1000),7)
test(31,'can_jump',([2,3,1,1,4],),True);test(31,'can_jump',([],),True);test(31,'can_jump',([3,2,1,0,4],),False)
test(32,'count_islands',([list('110'),list('001')],),2);test(32,'count_islands',([],),0);test(32,'count_islands',([list('1'*1500)],),1);raises(32,'count_islands',([['1'],[]],))
test(33,'rob',([2,7,9,3,1],),12);test(33,'rob',([],),0);test(33,'rob',([-2,-1],),0)
test(34,'subsets',([1,2],),{(),(1,),(2,),(1,2)},lambda x:{tuple(v) for v in x});test(34,'subsets',([],),[[]]);test(34,'subsets',([-1],),{(),(-1,)},lambda x:{tuple(v) for v in x})
test(35,'single_number',([4,1,2,1,2],),4);test(35,'single_number',([0],),0);test(35,'single_number',([-1,2,2],),-1)
test(36,'counting_sort',([3,-1,2,-1],-1,3),[-1,-1,2,3]);test(36,'counting_sort',([],0,0),[]);raises(36,'counting_sort',([8],0,2))
rng=random.Random(42)
for _ in range(250):
    arr=[rng.randrange(-4,5) for _ in range(rng.randrange(9))]
    target=rng.randrange(-5,6)
    brute=sum(sum(arr[i:j])==target for i in range(len(arr)) for j in range(i+1,len(arr)+1))
    test(5,'count_sum_k',(arr,target),brute)
    sums=[sum(arr[i:j]) for i in range(len(arr)) for j in range(i+1,len(arr)+1)]
    prods=[math.prod(arr[i:j]) for i in range(len(arr)) for j in range(i+1,len(arr)+1)]
    test(10,'max_subarray',(arr,),max(sums) if sums else None)
    test(26,'max_product',(arr,),max(prods) if prods else None)
    for k in range(1,len(arr)+1):
        test(30,'kth_largest',(arr.copy(),k),sorted(arr,reverse=True)[k-1])
        test(12,'window_max',(arr,k),[max(arr[i:i+k]) for i in range(len(arr)-k+1)])
    test(7,'lower_bound',(sorted(arr),target),bisect.bisect_left(sorted(arr),target))
    expected=[math.prod(arr[:i]+arr[i+1:]) for i in range(len(arr))]
    test(6,'product_except_self',(arr,),expected)

# Duplicate-heavy Quickselect must finish in one equal-band partition.
pivots=[]
old_random=NS[30]['randrange']
NS[30]['randrange']=lambda left,right: pivots.append((left,right)) or left
assert NS[30]['kth_largest']([7]*4000,2000)==7 and len(pivots)==1
NS[30]['randrange']=old_random;checks+=1
# Rectangle inclusion-exclusion: all subrectangles, including zero-area ranges.
g=[[1,-2,3],[4,0,-6]];p=NS[15]['prefix_2d'](g)
for r1 in range(3):
 for r2 in range(r1,3):
  for c1 in range(4):
   for c2 in range(c1,4):test(15,'rectangle_sum',(p,r1,c1,r2,c2),sum(sum(row[c1:c2]) for row in g[r1:r2]))
# Exhaustive lexicographic successor on short duplicate-containing permutations.
for values in [[],[1],[1,1,2],[0,1,2,3]]:
 perms=sorted(set(itertools.permutations(values)))
 for i,perm in enumerate(perms):test(27,'next_permutation',(list(perm),),list(perms[(i+1)%len(perms)]))

assert covered==set(range(len(NS))),set(range(len(NS)))-covered
print(f"PASS arrays: {len(NS)} templates, {checks} runtime assertions; {len(D['operationExamples'])} operation examples; {len(D['fundamentals'])} fundamentals executed")
