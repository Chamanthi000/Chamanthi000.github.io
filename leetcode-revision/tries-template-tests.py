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

if __name__ == '__main__':
    unittest.main(verbosity=2)
