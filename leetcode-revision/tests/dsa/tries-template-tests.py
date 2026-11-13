"""Run: python3 tries-template-tests.py (Python 3.10+, standard library)."""
import ast
import copy
import itertools
import json
import random
import unittest
from collections import Counter
from pathlib import Path

DATA = json.loads(Path(__file__).with_name('tries-guide.json').read_text())

def fresh(index):
    namespace = {}
    code = '\n'.join(DATA['templates'][index][3])
    exec(compile(ast.parse(code), f'trie_template_{index}', 'exec'), namespace)
    return namespace

def board_has(board, word):
    if not word:
        return True
    rows, cols = len(board), len(board[0]) if board else 0
    def dfs(r, c, index, used):
        if board[r][c] != word[index]:
            return False
        if index+1 == len(word):
            return True
        used.add((r,c))
        for nr,nc in ((r+1,c),(r-1,c),(r,c+1),(r,c-1)):
            if 0 <= nr < rows and 0 <= nc < cols and (nr,nc) not in used:
                if dfs(nr,nc,index+1,used):
                    used.remove((r,c))
                    return True
        used.remove((r,c))
        return False
    return any(dfs(r,c,0,set()) for r in range(rows) for c in range(cols))

class TrieTemplates(unittest.TestCase):
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

    def test_basic_trie(self):
        Trie = fresh(0)['Trie']
        trie = Trie()
        self.assertFalse(trie.search(''))
        self.assertTrue(trie.starts_with(''))
        trie.insert('apple')
        self.assertTrue(trie.search('apple'))
        self.assertFalse(trie.search('app'))
        self.assertTrue(trie.starts_with('app'))
        self.assertFalse(trie.starts_with('ax'))
        self.assertNotIn('x',trie.root.children['a'].children)
        trie.insert('app')
        trie.insert('app')
        trie.insert('')
        self.assertTrue(trie.search('app'))
        self.assertTrue(trie.search(''))
        for word in ['λ', 'é', 'e\u0301', 'A', 'a.b']:
            trie.insert(word)
            self.assertTrue(trie.search(word))
        self.assertFalse(trie.search('a'))
        long = 'x'*5000
        trie.insert(long)
        self.assertTrue(trie.search(long))
        self.assertFalse(trie.search(long[:-1]))
        self.assertTrue(trie.starts_with(long[:-1]))
        other = Trie()
        self.assertFalse(other.search('app'))
        self.assertEqual(other.root.children,{})

    def test_counted_multiset_erase(self):
        CountTrie = fresh(1)['CountTrie']
        trie = CountTrie()
        self.assertEqual(trie.count_prefix(''),0)
        self.assertFalse(trie.erase(''))
        for word in ['app','app','apple','']:
            trie.insert(word)
        self.assertEqual(trie.count_prefix(''),4)
        self.assertEqual(trie.count_equal('app'),2)
        self.assertEqual(trie.count_prefix('app'),3)
        self.assertFalse(trie.erase('ap'))
        self.assertEqual(trie.count_prefix(''),4)
        self.assertTrue(trie.erase('app'))
        self.assertEqual(trie.count_equal('app'),1)
        self.assertTrue(trie.erase('app'))
        self.assertEqual(trie.count_prefix('app'),1)
        self.assertEqual(trie.count_equal('apple'),1)
        self.assertTrue(trie.erase('apple'))
        self.assertEqual(trie.root.children,{})
        self.assertTrue(trie.erase(''))
        self.assertEqual(trie.count_prefix(''),0)
        rng = random.Random(30)
        model = Counter()
        words = ['', 'a','ab','aba','abb','b','ba','λ']
        for _ in range(1500):
            word = rng.choice(words)
            if rng.random() < .55:
                trie.insert(word)
                model[word] += 1
            else:
                expected = model[word] > 0
                self.assertEqual(trie.erase(word),expected)
                if expected:
                    model[word] -= 1
            for query in words:
                self.assertEqual(trie.count_equal(query),model[query])
                self.assertEqual(trie.count_prefix(query),sum(c for w,c in model.items() if w.startswith(query)))
        deep = 'z'*5000
        trie.insert(deep)
        self.assertTrue(trie.erase(deep))
        self.assertEqual(trie.count_prefix('z'),0)

    def test_wildcard_matching(self):
        f = fresh(2)['wildcard_match']
        self.assertFalse(f([],''))
        self.assertTrue(f([''],''))
        self.assertFalse(f(['a'],''))
        self.assertTrue(f(['bad','dad','mad'],'.ad'))
        self.assertFalse(f(['bad'],'b.'))
        self.assertTrue(f(['a.b'],'a.b'))
        self.assertFalse(f(['ab'],'a.b'))
        words = ['', 'a','ab','aba','abb','bba','λa']
        for length in range(5):
            for chars in itertools.product('ab.',repeat=length):
                pattern = ''.join(chars)
                expected = any(len(word) == length and all(p == '.' or p == c for p,c in zip(pattern,word)) for word in words)
                self.assertEqual(f(words,pattern),expected,pattern)
        self.assertTrue(f(['x'*5000],'.'*5000))
        self.assertEqual(words,['', 'a','ab','aba','abb','bba','λa'])

    def test_prefix_enumeration(self):
        f = fresh(3)['completions']
        words = ['', 'cat','car','cat','app','apple','λa']
        saved = words[:]
        for prefix in ['', 'ca','cat','app','λ','missing']:
            out = f(words,prefix)
            self.assertEqual(set(out),{w for w in words if w.startswith(prefix)})
            self.assertEqual(len(out),len(set(out)))
        self.assertEqual(f([],''),[])
        self.assertEqual(f(words,'cat'),['cat'])
        self.assertEqual(words,saved)
        long = 'a'*5000
        self.assertEqual(f([long],''),[long])
        self.assertEqual(f([long],long),[long])
        # A trie branch that is also terminal must keep the path correct on sibling exit.
        self.assertEqual(set(f(['a','ab','abc','ac','b','ba'],'')),{'a','ab','abc','ac','b','ba'})

    def test_shortest_root_replacement(self):
        f = fresh(4)['replace_roots']
        roots = ['cat','bat','rat']
        self.assertEqual(f(roots,'the cattle was rattled by the battery'),'the cat was rat by the bat')
        self.assertEqual(f(['a','ab','abc'],'abcd abc'),'a a')
        self.assertEqual(f([], ' x  y\t z\n'),'x y z')
        self.assertEqual(f(['A'],'a Apple A'),'a A A')
        self.assertEqual(f(['x'],''),'')
        self.assertEqual(f(['λ'],'λabc'),'λ')
        self.assertEqual(roots,['cat','bat','rat'])
        with self.assertRaises(ValueError):
            f([''],'abc')
        self.assertEqual(f(['a'*5000],'a'*5001),'a'*5000)

    def test_word_break_dp(self):
        f = fresh(5)['word_break']
        self.assertTrue(f('',[]))
        self.assertFalse(f('x',[]))
        self.assertFalse(f('x',['']))
        self.assertTrue(f('leetcode',['leet','code']))
        self.assertFalse(f('catsandog',['cats','dog','sand','and','cat']))
        self.assertTrue(f('abcd',['abc','ab','cd']))
        self.assertTrue(f('λaλa',['λa']))
        self.assertTrue(f('a'*5000,['a']))
        rng = random.Random(31)
        choices = ['a','b','ab','ba','aaa','bb','']
        for _ in range(500):
            text = ''.join(rng.choice('ab') for _ in range(rng.randrange(10)))
            words = rng.sample(choices,rng.randrange(len(choices)+1))
            saved = words[:]
            reachable = [True]+[False]*len(text)
            for end in range(1,len(text)+1):
                reachable[end] = any(reachable[start] and text[start:end] in words for start in range(end))
            self.assertEqual(f(text,words),reachable[-1])
            self.assertEqual(words,saved)

    def test_binary_xor(self):
        f = fresh(6)['max_pair_xor']
        self.assertEqual(f([],1),0)
        self.assertEqual(f([7],3),0)
        self.assertEqual(f([7,7],3),0)
        self.assertEqual(f([3,10,5,25,2,8],5),28)
        self.assertEqual(f([0,7],3),7)
        for nums,bits in [([8],3),([-1],3),([1.5],3),([],0),([],1.5)]:
            with self.assertRaises(ValueError):
                f(nums,bits)
        rng = random.Random(32)
        for bits in range(1,9):
            for _ in range(60):
                nums = [rng.randrange(1 << bits) for i in range(rng.randrange(15))]
                saved = nums[:]
                expected = max((a^b for i,a in enumerate(nums) for b in nums[i+1:]),default=0)
                self.assertEqual(f(nums,bits),expected)
                self.assertEqual(nums,saved)
        self.assertEqual(f([0,1 << 100],101),1 << 100)

    def test_iterative_board_search(self):
        f = fresh(7)['find_board_words']
        board = [list('oaan'),list('etae'),list('ihkr'),list('iflv')]
        words = ['oath','pea','eat','rain','oath']
        saved_board, saved_words = copy.deepcopy(board), words[:]
        out = f(board,words)
        self.assertEqual(set(out),{'oath','eat'})
        self.assertEqual(len(out),2)
        self.assertEqual(board,saved_board)
        self.assertEqual(words,saved_words)
        self.assertEqual(f([],['','a']),[''])
        self.assertEqual(f([[]],['a']),[])
        self.assertEqual(set(f([['a','b']],['a','ab','aba','ba',''])),{'a','ab','ba',''})
        self.assertEqual(f([['λ']],['λ','λλ']),['λ'])
        for bad in [[['a'],[]],[['ab']],[[1]]]:
            with self.assertRaises(ValueError):
                f(bad,['a'])
        # No recursion dependence even for a 1500-cell single word path.
        self.assertEqual(f([list('a'*1500)],['a'*1500]),['a'*1500])
        rng = random.Random(33)
        candidates = [''.join(p) for length in range(5) for p in itertools.product('ab',repeat=length)]
        for _ in range(100):
            board = [[rng.choice('ab') for _ in range(3)] for _ in range(2)]
            words = rng.sample(candidates,15)
            expected = {w for w in words if board_has(board,w)}
            out = f(board,words)
            self.assertEqual(set(out),expected)
            self.assertEqual(len(out),len(set(out)))


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


class AddedTrieVariants(unittest.TestCase):
    def test_offline_xor_against_scan(self):
        f=fresh(8)['offline_max_xor']
        self.assertEqual(f([0,1,2,3,4],[(3,1),(1,3),(5,6)],3),[3,3,7])
        self.assertEqual(f([],[(0,5)],1),[-1])
        self.assertEqual(f([0],[(0,-1),(0,0)],1),[-1,0])
        self.assertEqual(f([1],[],1),[])
        for args in [([-1],[],3),([8],[],3),([],[(-1,2)],3),([],[ (8,2)],3),([],[],0)]:
            with self.assertRaises(ValueError):f(*args)
        rng=random.Random(619)
        for _ in range(150):
            nums=[rng.randrange(32) for _ in range(rng.randrange(12))]
            queries=[(rng.randrange(32),rng.randrange(-2,35)) for _ in range(12)]
            expected=[max((x^v for v in nums if v<=limit),default=-1) for x,limit in queries]
            saved=nums[:],queries[:]
            self.assertEqual(f(iter(nums),iter(queries),5),expected)
            self.assertEqual((nums,queries),saved)

    def test_cached_suggestions_bruteforce_and_copy(self):
        T=fresh(9)['SuggestionTrie']
        words=['mobile','mouse','moneypot','monitor','mousepad','mouse','']
        t=T(words,3)
        self.assertEqual(t.suggest('mo'),['mobile','moneypot','monitor'])
        self.assertEqual(t.suggest('mou'),['mouse','mousepad'])
        self.assertEqual(t.suggest('missing'),[])
        self.assertEqual(t.suggest('')[0],'')
        out=t.suggest('mo');out.clear()
        self.assertEqual(len(t.suggest('mo')),3)
        self.assertEqual(T(['a'],0).suggest(''),[])
        with self.assertRaises(ValueError):T([], -1)
        rng=random.Random(620)
        vocabulary=[''.join(x) for n in range(5) for x in itertools.product('aλ',repeat=n)]
        for _ in range(50):
            words=[rng.choice(vocabulary) for _ in range(30)]
            for k in range(5):
                t=T(words,k)
                for prefix in vocabulary:
                    expected=sorted({w for w in words if w.startswith(prefix)})[:k]
                    self.assertEqual(t.suggest(prefix),expected)
        deep='a'*5000
        self.assertEqual(T([deep]).suggest(deep),[deep])

    def test_mapsum_overwrites_negative_and_empty_keys(self):
        T=fresh(10)['MapSum'];t=T()
        t.insert('apple',3);self.assertEqual(t.sum('ap'),3)
        t.insert('app',2);self.assertEqual(t.sum('ap'),5)
        t.insert('apple',2);self.assertEqual(t.sum('ap'),4)
        t.insert('',-7);self.assertEqual(t.sum(''),-3)
        self.assertEqual(t.sum('missing'),0)
        rng=random.Random(621);values={}
        vocabulary=['','a','ab','app','apple','λ','λa']
        t=T()
        for _ in range(500):
            key=rng.choice(vocabulary);value=rng.randrange(-8,9)
            t.insert(key,value);values[key]=value
            for prefix in vocabulary:
                self.assertEqual(t.sum(prefix),sum(v for k,v in values.items() if k.startswith(prefix)))
        deep='a'*5000;t.insert(deep,19);self.assertEqual(t.sum(deep),19)


class LongestPrefixTests(unittest.TestCase):
    def test_terminal_depth_empty_and_random(self):
        f=fresh(11)['longest_stored_prefix']
        self.assertEqual(f(['a','app','apple'],'applepie'),'apple')
        self.assertEqual(f(['a','app','apple'],'application'),'app')
        self.assertIsNone(f(['apple'],'app'))
        self.assertIsNone(f([],''))
        self.assertEqual(f([''],'anything'),'')
        self.assertEqual(f(['','λ','λa'],'λab'),'λa')
        rng=random.Random(625)
        vocabulary=[''.join(x) for n in range(5) for x in itertools.product('ab',repeat=n)]
        for _ in range(200):
            words=rng.sample(vocabulary,rng.randrange(len(vocabulary)))
            text=rng.choice(vocabulary)
            matches=[w for w in words if text.startswith(w)]
            expected=max(matches,key=len) if matches else None
            self.assertEqual(f(iter(words),text),expected)
        text='a'*5000
        self.assertEqual(f([text],text+'b'),text)

if __name__ == '__main__':
    unittest.main(verbosity=2)
