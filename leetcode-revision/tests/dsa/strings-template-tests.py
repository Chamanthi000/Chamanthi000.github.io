"""Execute all JSON templates with ordinary, boundary, adversarial and differential cases."""
import ast,contextlib,io,json,pathlib,random,itertools,collections
D=json.loads(pathlib.Path(__file__).with_name('strings-guide.json').read_text());
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
    ns={};code='\n'.join(t[3]);ast.parse(code);exec(compile(code,t[0],'exec'),ns);NS.append(ns)

# Each fundamental's displayed result is checked, not merely executed.
fundamental_checks = ["stdout=='1 2\\n2\\n'","stdout=='ABC\\n'","stdout=='bcd ef\\n'","stdout=='True\\n'","stdout=='olleh\\n'","stdout=='True\\nbb\\n'","stdout=='True\\nTrue\\n'","stdout=='a3b2c1\\n'","stdout=='False\\nTrue\\n'","stdout=='ab\\nbc\\ncd\\n'","stdout=='3 1 2\\n'","stdout=='2\\n'","stdout=='[]\\n'","stdout=='4\\n'","stdout=='1\\n'","stdout=='False\\nTrue\\n'","stdout==\"['a', 'b']\\n['', 'a', '', 'b', '']\\n\"","stdout==\"['ban', 'ana', 'nan', 'ana']\\n\""]
for f,check in zip(D['fundamentals'],fundamental_checks):
    env={};out=io.StringIO()
    with contextlib.redirect_stdout(out):exec('\n'.join(f[2]),env)
    assert eval(check,dict(env,stdout=out.getvalue())),(f[0],check,out.getvalue())

checks=0;covered=set()
def test(i,fn,args,expected,normalize=lambda x:x):
    global checks
    got=NS[i][fn](*args);assert normalize(got)==expected,(i,fn,args,got,expected)
    checks+=1;covered.add(i)
for e in D['operationExamples']: exec('\n'.join(e['code']),{})
for f in D['fundamentals']:
    with contextlib.redirect_stdout(io.StringIO()):exec('\n'.join(f[2]),{})
for s,ans in [('abba',True),('',True),('abc',False)]:test(0,'is_palindrome',(s,),ans)
for s,ans in [('A man, a plan, a canal: Panama',True),('',True),('race a car',False)]:test(1,'valid_palindrome',(s,),ans)
for s in ['abc','','aa']:test(2,'reverse_chars',(list(s),),list(s[::-1]))
for a,b,ans in [('anagram','nagaram',True),('','',True),('aab','ab',False)]:test(3,'is_anagram',(a,b),ans)
norm=lambda groups:{tuple(sorted(g)) for g in groups}
test(4,'group_anagrams',(['eat','tea','tan','ate','nat'],),{('ate','eat','tea'),('nat','tan')},norm);test(4,'group_anagrams',([],),set(),norm);test(4,'group_anagrams',(['',''],),{('','')},norm)
for s,ans in [('leetcode',0),('',-1),('aabb',-1)]:test(5,'first_unique',(s,),ans)
test(6,'find_anagrams',('cbaebabacd','abc'),[0,6]);test(6,'find_anagrams',('','a'),[]);test(6,'find_anagrams',('aaaa','aa'),[0,1,2])
for a,b,ans in [('ab','eidbaooo',True),('','',True),('aa','ab',False)]:test(7,'permutation_in_string',(a,b),ans)
for s,ans in [('abcabcbb',3),('',0),('abba',2)]:test(8,'longest_unique',(s,),ans)
for s,k,ans in [('eceba',2,3),('',0,0),('aaab',1,3)]:test(9,'longest_k_distinct',(s,k),ans)
for s,t,ans in [('ADOBECODEBANC','ABC','BANC'),('abc','',''),('AAAB','AAB','AAB')]:test(10,'min_window',(s,t),ans)
for s,k,ans in [('AABABBA',1,4),('',0,0),('AAAA',0,4)]:test(11,'replacement_length',(s,k),ans)
for a,b,ans in [('abc','ahbgdc',True),('','',True),('axc','ahbgdc',False)]:test(12,'is_subsequence',(a,b),ans)
for s,ans in [('cbbd','bb'),('',''),('aaaa','aaaa')]:test(13,'longest_palindrome',(s,),ans)
for s,ans in [('abca',True),('',True),('deeee',True),('abc',False)]:test(14,'one_delete_palindrome',(s,),ans)
for s,ans in [('aaabbc','a3b2c1'),('',''),('a'*12,'a12')]:test(15,'encode_runs',(s,),ans)
for s,ans in [('([])',True),('',True),('([)]',False),(']',False)]:test(16,'valid_brackets',(s,),ans)
for s,ans in [('abbaca','ca'),('',''),('abba','')]:test(17,'remove_pairs',(s,),ans)
for s,ans in [('0101',4),('',0),('1111',0)]:test(18,'longest_balanced_binary',(s,),ans)
for s,ans in [('eleetminicoworoep',13),('',0),('bbb',3)]:test(19,'even_vowel_substring',(s,),ans)
for i,fn in [(20,'kmp'),(31,'all_occurrences'),(37,'rabin_karp')]:
    for text,pat,ans in [('ababcabc','abc',[2,5]),('','',[0]),('aaaaa','aaa',[0,1,2]),('ab','abc',[])]:test(i,fn,(text,pat),ans)
test(21,'z_function',('aaaaa',),[0,4,3,2,1]);test(21,'z_function',('',),[]);test(21,'z_function',('abacaba',),[0,0,1,0,3,0,1])
trie=NS[22]['Trie']();trie.insert('apple');assert trie.search('apple') and not trie.search('app') and trie.starts_with('app');trie.insert('');assert trie.search('');trie.insert('é');assert trie.search('é') and not trie.search('x');checks+=3;covered.add(22)
for text,words,ans in [('leetcode',['leet','code'],True),('',[],True),('catsandog',['cats','dog','sand','and','cat'],False)]:test(23,'word_break',(text,words),ans)
for a,b,ans in [('horse','ros',3),('','abc',3),('same','same',0)]:test(24,'edit_distance',(a,b),ans)
for a,b,ans in [('abcde','ace',3),('','x',0),('abc','def',0)]:test(25,'lcs_length',(a,b),ans)
for s,ans in [('bbbab',4),('',0),('cbbd',2)]:test(26,'longest_pal_subseq',(s,),ans)
for s,ans in [('aaa',6),('',0),('abba',6)]:test(27,'count_palindromes',(s,),ans)
test(28,'phone_combos',('23',),{'ad','ae','af','bd','be','bf','cd','ce','cf'},set);test(28,'phone_combos',('',),[]);test(28,'phone_combos',('9',),list('wxyz'))
for s,ans in [('cbacdcbc','acdb'),('',''),('bbcaac','bac')]:test(29,'smallest_unique_subsequence',(s,),ans)
test(30,'repeated_windows',('AAAAACCCCCAAAAACCCCCCAAAAAGGGTTT',),{'AAAAACCCCC','CCCCCAAAAA'},set);test(30,'repeated_windows',('',),[]);test(30,'repeated_windows',('aaaa',2),{'aa'},set)
for s,k,ans in [('deeedbbcccbdaa',3,'aa'),('',3,''),('abcd',1,'')]:test(32,'remove_k_duplicates',(s,k),ans)
test(33,'generate_parentheses',(3,),{'((()))','(()())','(())()','()(())','()()()'},set);test(33,'generate_parentheses',(0,),['']);test(33,'generate_parentheses',(1,),['()'])
normparts=lambda out:{tuple(p) for p in out}
test(34,'partition_palindromes',('aab',),{('a','a','b'),('aa','b')},normparts);test(34,'partition_palindromes',('',),[[]]);test(34,'partition_palindromes',('aa',),{('a','a'),('aa',)},normparts)
for s,ans in [('aab',1),('',0),('abba',0)]:test(35,'min_palindrome_cuts',(s,),ans)
for s,ans in [('cbbd','bb'),('',''),('aaaa','aaaa')]:test(36,'manacher_longest',(s,),ans)
for text,pats in [('ahishers',['he','she','his','hers']),('',[]),('aaaa',['a','aa','aa',''])]:
    expected=sorted((i,j) for j,p in enumerate(pats) if p for i in range(len(text)-len(p)+1) if text[i:i+len(p)]==p)
    test(38,'aho_corasick',(text,pats),expected,sorted)
for a,b,ans in [('ab#c','ad#c',True),('','###',True),('a#c','b',False)]:test(39,'backspace_equal',(a,b),ans)
for s,ans in [(')()())',4),('',0),('(()',2)]:test(40,'longest_valid_parentheses',(s,),ans)
for s,ans in [('banana','ana'),('',''),('aaaa','aaa'),('abc','')]:test(41,'longest_duplicate_substring',(s,),ans)
rng=random.Random(91)
for _ in range(300):
    s=''.join(rng.choice('abc') for _ in range(rng.randrange(10)))
    pat=''.join(rng.choice('abc') for _ in range(rng.randrange(5)))
    starts=[0] if not pat else [i for i in range(len(s)-len(pat)+1) if s[i:i+len(pat)]==pat]
    for i,fn in [(20,'kmp'),(31,'all_occurrences'),(37,'rabin_karp')]:test(i,fn,(s,pat),starts)
    subs=[s[i:j] for i in range(len(s)) for j in range(i+1,len(s)+1)]
    pals=[x for x in subs if x==x[::-1]]
    best=max(map(len,pals),default=0)
    for i,fn in [(13,'longest_palindrome'),(36,'manacher_longest')]:
        result=NS[i][fn](s); assert len(result)==best and result==result[::-1] and result in s;checks+=1;covered.add(i)
    test(27,'count_palindromes',(s,),len(pals))
    test(8,'longest_unique',(s,),max((len(x) for x in subs if len(set(x))==len(x)),default=0))
    z=[0]+[next((j for j in range(len(s)-i) if s[j]!=s[i+j]),len(s)-i) for i in range(1,len(s))] if s else []
    test(21,'z_function',(s,),z)
    for k in range(3):
        test(9,'longest_k_distinct',(s,k),max((len(x) for x in subs if len(set(x))<=k),default=0))
        bestrep=max((len(x) for x in subs if len(x)-max(collections.Counter(x).values())<=k),default=0)
        test(11,'replacement_length',(s,k),bestrep)
    duplicates=[x for x in subs if sum(s.startswith(x,i) for i in range(len(s)))>=2]
    got=NS[41]['longest_duplicate_substring'](s)
    assert len(got)==max(map(len,duplicates),default=0);checks+=1
    want=collections.Counter(pat)
    valid=[(len(x),i,x) for i in range(len(s)) for j in range(i+1,len(s)+1) if (x:=s[i:j]) and not (want-collections.Counter(x))]
    expected=min(valid)[2] if pat and valid else ''
    test(10,'min_window',(s,pat),expected)
for text,words,answer in [('leetcode',['leet','code'],True),('',[],True),('catsandog',['cats','dog','sand','and','cat'],False),('éé',['é'],True),('a'*1000+'b',['a','aa','aaa'],False)]: test(42,'word_break_trie',(text,words),answer)

# Automaton suffix outputs, duplicates and Unicode checked against exact scanning.
for _ in range(150):
 text=''.join(rng.choice('abé') for _ in range(rng.randrange(12)))
 pats=[''.join(rng.choice('abé') for _ in range(rng.randrange(5))) for _ in range(rng.randrange(8))]
 expected=sorted((i,j) for j,p in enumerate(pats) if p for i in range(len(text)-len(p)+1) if text[i:i+len(p)]==p)
 test(38,'aho_corasick',(text,pats),expected,sorted)
 test(42,'word_break_trie',(text,pats),NS[23]['word_break'](text,pats))
# Interval palindrome DP and lexicographic stack compared with brute subsequences.
for _ in range(80):
 text=''.join(rng.choice('abc') for _ in range(rng.randrange(8)))
 seqs=[''.join(text[i] for i in range(len(text)) if mask>>i&1) for mask in range(1<<len(text))]
 test(26,'longest_pal_subseq',(text,),max(len(x) for x in seqs if x==x[::-1]))
 wanted=set(text)
 test(29,'smallest_unique_subsequence',(text,),min(x for x in seqs if len(x)==len(wanted) and set(x)==wanted))


for text,expected in [('banana','ana'),('',''),('aaaa','aaa'),('abc','')]:test(43,'longest_duplicate_rolling',(text,),expected)
# Forced collisions prove equality is checked, not assumed from hashes.
for text in ['abcdabcx','abcxyz','abacabadabacaba','éxéyéx']:
 baseline=NS[41]['longest_duplicate_substring'](text)
 test(43,'longest_duplicate_rolling',(text,1,1,1),len(baseline),len)
for _ in range(150):
 text=''.join(rng.choice('abc') for _ in range(rng.randrange(14)))
 test(43,'longest_duplicate_rolling',(text,),len(NS[41]['longest_duplicate_substring'](text)),len)
assert covered==set(range(len(NS))),set(range(len(NS)))-covered
print(f"PASS strings: {len(NS)} templates, {checks} runtime assertions; {len(D['operationExamples'])} operation examples; {len(D['fundamentals'])} fundamentals executed")
