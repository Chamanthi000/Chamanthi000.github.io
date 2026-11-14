"""Validate source-embedded Strings interview Python examples and core FAANG templates."""
import ast
import contextlib
import io
import json
import pathlib
import re
import random
import itertools
import sys
from collections import Counter
from functools import lru_cache

root = pathlib.Path(__file__).resolve().parents[1]
js = (root / "string-interview-guide.js").read_text(encoding="utf-8")
match = re.search(r"^const d=(.*);$", js, re.MULTILINE)
assert match, "Missing Strings guide payload"
data = json.loads(match.group(1))
assert len(data["operations"]) >= 45
assert len(data["fundamentals"]) >= 15
assert len(data["patterns"]) >= 25
assert len(data["templates"]) >= 25
assert len(data["practice"]) >= 30

for name in ("fundamentals", "templates"):
    for index, entry in enumerate(data[name], 1):
        lines = entry[2] if name == "fundamentals" else entry[3]
        code = "\n".join(lines)
        try:
            ast.parse(code)
        except SyntaxError as exc:
            raise AssertionError(f"{name} #{index} ({entry[0]}) syntax: {exc}") from exc
        if name == "fundamentals":
            with contextlib.redirect_stdout(io.StringIO()):
                exec(compile(code, "<fundamental>", "exec"), {})

# Each template must resolve its own imports/helpers; no shared execution namespace.
env = {}
required_codes = set()
called_codes = set()
for index, entry in enumerate(data["templates"]):
    assert len(entry) == 5 and entry[4]
    namespace = {}
    code = "\n".join(entry[3])
    exec(compile(code, f"<string-template-{index}>", "exec"), namespace)
    for node in ast.parse(code).body:
        if isinstance(node, (ast.FunctionDef, ast.ClassDef)):
            assert node.name not in env
            value = namespace[node.name]
            env[node.name] = value
            if isinstance(node, ast.FunctionDef):
                required_codes.add(value.__code__)
            else:
                for method in node.body:
                    if isinstance(method, ast.FunctionDef):
                        required_codes.add(getattr(value, method.name).__code__)
EXPECTED = set("is_palindrome valid_palindrome reverse_chars is_anagram group_anagrams first_unique find_anagrams permutation_in_string longest_unique longest_k_distinct min_window replacement_length is_subsequence longest_palindrome one_delete_palindrome encode_runs valid_brackets remove_pairs longest_balanced_binary even_vowel_substring kmp z_function Trie word_break edit_distance lcs_length longest_pal_subseq count_palindromes phone_combos smallest_unique_subsequence repeated_windows all_occurrences remove_k_duplicates generate_parentheses partition_palindromes min_palindrome_cuts manacher_longest rabin_karp aho_corasick".split())
assert set(env) == EXPECTED, "Add explicit functional coverage for every new/renamed template"
assert all(len(x) == 10 and x[8] and x[9] for x in data["patterns"])

def profile(frame, event, arg):
    if event == "call" and frame.f_code in required_codes:
        called_codes.add(frame.f_code)
sys.setprofile(profile)

assert env["is_palindrome"]("racecar")
assert not env["is_palindrome"]("hello")
assert env["valid_palindrome"]("A man, a plan, a canal: Panama")
assert env["reverse_chars"](list("abc")) == list("cba")
assert env["is_anagram"]("listen", "silent")
assert not env["is_anagram"]("aab", "ab")
assert env["first_unique"]("leetcode") == 0
assert env["find_anagrams"]("cbaebabacd", "abc") == [0, 6]
assert env["permutation_in_string"]("ab", "eidbaooo")
assert not env["permutation_in_string"]("ab", "eidboaoo")
assert env["longest_unique"]("abcabcbb") == 3
assert env["longest_k_distinct"]("eceba", 2) == 3
assert env["min_window"]("ADOBECODEBANC", "ABC") == "BANC"
assert env["min_window"]("", "ABC") == ""
assert env["replacement_length"]("AABABBA", 1) == 4
assert env["is_subsequence"]("ace", "abcde")
assert not env["is_subsequence"]("aec", "abcde")
assert env["longest_palindrome"]("babad") in ("bab", "aba")
assert env["longest_palindrome"]("cbbd") == "bb"
assert env["one_delete_palindrome"]("abca")
assert not env["one_delete_palindrome"]("abc")
assert env["encode_runs"]("aaabbc") == "a3b2c1"
assert env["valid_brackets"]("([])")
assert not env["valid_brackets"]("([)]")
assert env["remove_pairs"]("abbaca") == "ca"
assert env["longest_balanced_binary"]("0101") == 4
assert env["even_vowel_substring"]("eleetminicoworoep") == 13
assert env["kmp"]("aaaa", "aa") == [0, 1, 2]
assert env["z_function"]("aaaa") == [0, 3, 2, 1]
trie = env["Trie"]()
trie.insert("apple")
assert trie.search("apple") and trie.starts_with("app") and not trie.search("app")
assert env["word_break"]("leetcode", ["leet", "code"])
assert not env["word_break"]("catsandog", ["cats", "dog", "sand", "and", "cat"])
assert env["edit_distance"]("horse", "ros") == 3
assert env["lcs_length"]("abcde", "ace") == 3
assert env["longest_pal_subseq"]("bbbab") == 4
assert env["count_palindromes"]("aaa") == 6
assert len(env["phone_combos"]("23")) == 9
assert env["smallest_unique_subsequence"]("cbacdcbc") == "acdb"
assert set(env["repeated_windows"]("AAAAACCCCCAAAAACCCCCCAAAAAGGGTTT")) == {
    "AAAAACCCCC", "CCCCCAAAAA"
}
assert env["all_occurrences"]("aaaa", "aa") == [0, 1, 2]
assert env["remove_k_duplicates"]("deeedbbcccbdaa", 3) == "aa"
assert len(env["generate_parentheses"](3)) == 5
assert env["partition_palindromes"]("aab") == [["a","a","b"],["aa","b"]]
assert env["min_palindrome_cuts"]("aab") == 1
assert env["manacher_longest"]("babad") in ("bab","aba")
assert env["manacher_longest"]("cbbd") == "bb"
assert env["manacher_longest"]("") == ""
assert env["rabin_karp"]("aaaa", "aa") == [0, 1, 2]
matches=set(env["aho_corasick"]("ushers",["he","she","his","hers"]))
assert {(2,0),(1,1),(2,3)} <= matches

# Previously group_anagrams was only compiled, never called.
words = ["eat", "tea", "", "", "éa", "aé", "eat", "tan"]
groups = env["group_anagrams"](words)
assert groups == [["eat", "tea", "eat"], ["", ""], ["éa", "aé"], ["tan"]]
assert env["group_anagrams"]([]) == []
assert words == ["eat", "tea", "", "", "éa", "aé", "eat", "tan"]

# Executable Unicode examples must actually demonstrate a combining code point,
# not the literal six-character sequence backslash-u-0-3-0-1.
for index in (0, 15):
    output = io.StringIO()
    with contextlib.redirect_stdout(output):
        exec("\n".join(data["fundamentals"][index][2]), {})
    assert output.getvalue().splitlines() == (["1 2", "2"] if index == 0 else ["False", "True"])

rng = random.Random(4801)
f = env

def subsequences(s):
    return {"".join(s[i] for i in range(len(s)) if mask >> i & 1) for mask in range(1 << len(s))}

def parts(s):
    if not s: return [[]]
    return [[s[:i]] + tail for i in range(1,len(s)+1) if s[:i] == s[:i][::-1] for tail in parts(s[i:])]

def reduced(s, k):
    while True:
        for i in range(len(s)-k+1):
            if len(set(s[i:i+k])) == 1:
                s = s[:i]+s[i+k:]
                break
        else: return s

def cover_oracle(s, t):
    if not t: return ""
    target = Counter(t)
    candidates = [(j-i, i, s[i:j]) for i in range(len(s)) for j in range(i+1,len(s)+1) if not target-Counter(s[i:j])]
    return min(candidates)[2] if candidates else ""

for _ in range(220):
    s = "".join(rng.choice("abé#") for _ in range(rng.randrange(9)))
    t = "".join(rng.choice("abé#") for _ in range(rng.randrange(5)))
    subs = [s[i:j] for i in range(len(s)) for j in range(i+1,len(s)+1)]
    pals = [x for x in subs if x == x[::-1]]
    sequences = subsequences(s)
    assert f["is_palindrome"](s) == (s == s[::-1])
    work = list(s)
    assert f["reverse_chars"](work) is work and work == list(s[::-1])
    assert f["is_anagram"](s,t) == (Counter(s) == Counter(t))
    expected = next((i for i,c in enumerate(s) if s.count(c) == 1), -1)
    assert f["first_unique"](s) == expected
    assert f["find_anagrams"](s,t) == ([i for i in range(len(s)-len(t)+1) if Counter(s[i:i+len(t)]) == Counter(t)] if t else [])
    assert f["longest_unique"](s) == max((len(x) for x in subs if len(set(x)) == len(x)), default=0)
    for k in range(5):
        assert f["longest_k_distinct"](s,k) == max((len(x) for x in subs if len(set(x)) <= k), default=0)
        assert f["replacement_length"](s,k) == max((len(x) for x in subs if len(x)-max(Counter(x).values()) <= k), default=0)
    assert f["min_window"](s,t) == cover_oracle(s,t)
    assert f["is_subsequence"](t,s) == (t in sequences)
    for name in ("longest_palindrome", "manacher_longest"):
        result = f[name](s)
        assert result == result[::-1] and result in s
        assert len(result) == max(map(len,pals), default=0)
    assert f["one_delete_palindrome"](s) == any(x == x[::-1] for x in [s]+[s[:i]+s[i+1:] for i in range(len(s))])
    assert f["count_palindromes"](s) == len(pals)
    assert f["longest_pal_subseq"](s) == max((len(x) for x in sequences if x == x[::-1]), default=0)
    assert f["lcs_length"](s,t) == max(map(len,sequences & subsequences(t)))
    @lru_cache(None)
    def distance(a,b):
        if not a or not b: return len(a)+len(b)
        if a[0] == b[0]: return distance(a[1:],b[1:])
        return 1+min(distance(a[1:],b),distance(a,b[1:]),distance(a[1:],b[1:]))
    assert f["edit_distance"](s,t) == distance(s,t)
    expected_parts = parts(s)
    assert f["partition_palindromes"](s) == expected_parts
    assert f["min_palindrome_cuts"](s) == min((max(0,len(x)-1) for x in expected_parts))
    starts = [i for i in range(len(s)-len(t)+1) if s[i:i+len(t)] == t] if t else [0]
    for name in ("kmp", "rabin_karp", "all_occurrences"):
        assert f[name](s,t) == starts
    expected_z = [0] if s else []
    for i in range(1,len(s)):
        length = 0
        while i+length < len(s) and s[length] == s[i+length]: length += 1
        expected_z.append(length)
    assert f["z_function"](s) == expected_z
    for k in range(-1,6):
        chunks = Counter(s[i:i+k] for i in range(len(s)-k+1)) if k > 0 else Counter()
        assert set(f["repeated_windows"](s,k)) == {x for x,c in chunks.items() if c > 1}
    for k in range(1,5): assert f["remove_k_duplicates"](s,k) == reduced(s,k)
    assert f["remove_pairs"](s) == reduced(s,2)
    candidates = [x for x in sequences if len(x) == len(set(s)) and set(x) == set(s)]
    assert f["smallest_unique_subsequence"](s) == min(candidates)
    vocab = ["a", "b", "ab", "é", "", t]
    @lru_cache(None)
    def segment(i):
        return i == len(s) or any(s.startswith(w,i) and segment(i+len(w)) for w in set(vocab) if w)
    assert f["word_break"](s,vocab) == segment(0)
    patterns = [t,"a","ab","b","",t]
    oracle = [(i,j) for j,p in enumerate(patterns) if p for i in range(len(s)-len(p)+1) if s[i:i+len(p)] == p]
    assert sorted(f["aho_corasick"](s,patterns)) == sorted(oracle)
    alphabet = set(s)
    trie = f["Trie"]()
    for word in vocab: trie.insert(word)
    for word in vocab+[s]:
        assert trie.search(word) == (word in vocab)
        assert trie.starts_with(word) == any(w.startswith(word) for w in vocab)
    # Prefix parity/balance have distinct alphabet policies.
    binary = "".join(rng.choice("01") for _ in s)
    binary_subs = [binary[i:j] for i in range(len(binary)) for j in range(i+1,len(binary)+1)]
    assert f["longest_balanced_binary"](binary) == max((len(x) for x in binary_subs if x.count("0") == x.count("1")), default=0)
    vowels = "".join(rng.choice("aeioux") for _ in s)
    vowel_subs = [vowels[i:j] for i in range(len(vowels)) for j in range(i+1,len(vowels)+1)]
    assert f["even_vowel_substring"](vowels) == max((len(x) for x in vowel_subs if all(x.count(v)%2 == 0 for v in "aeiou")), default=0)
    ascii_s = "".join(rng.choice("abAB09,. ") for _ in s)
    cleaned = "".join(c.lower() for c in ascii_s if c.isalnum())
    assert f["valid_palindrome"](ascii_s) == (cleaned == cleaned[::-1])
    lower_s = "".join(rng.choice("abc") for _ in s)
    lower_t = "".join(rng.choice("abc") for _ in t)
    assert f["permutation_in_string"](lower_t,lower_s) == any(Counter(lower_s[i:i+len(lower_t)]) == Counter(lower_t) for i in range(len(lower_s)-len(lower_t)+1))
    expected_rle = "".join(c+str(len(list(group))) for c,group in itertools.groupby(s))
    assert f["encode_runs"](s) == expected_rle

for n in range(6):
    actual = f["generate_parentheses"](n)
    oracle = set()
    for chars in itertools.product("()", repeat=2*n):
        balance = 0
        for c in chars:
            balance += 1 if c == "(" else -1
            if balance < 0: break
        else:
            if balance == 0: oracle.add("".join(chars))
    assert set(actual) == oracle and len(actual) == len(oracle)
    assert all(f["valid_brackets"](x) for x in actual)
assert not f["valid_brackets"]("a") and not f["valid_brackets"]("]")
assert f["valid_brackets"]("")
for digits in ("", "2", "79", "234"):
    mapping = {str(i+2):letters for i,letters in enumerate(["abc","def","ghi","jkl","mno","pqrs","tuv","wxyz"])}
    expected = ["".join(chars) for chars in itertools.product(*(mapping[d] for d in digits))] if digits else []
    assert f["phone_combos"](digits) == expected
assert f["generate_parentheses"](-1) == []
assert f["replacement_length"]("abc",-1) == 0
try:
    f["remove_k_duplicates"]("abc",0)
except ValueError:
    pass
else:
    raise AssertionError("Nonpositive group size must not silently delete all text")
# Deep suffix chains, duplicate and empty keywords: no inherited output copying.
patterns = ["a"*i for i in range(1,70)] + ["a", ""]
text = "a"*80
assert sorted(f["aho_corasick"](text,patterns)) == sorted((i,j) for j,p in enumerate(patterns) if p for i in range(len(text)-len(p)+1))
# Verified RK must charge true matches, not only false hash collisions.
assert f["rabin_karp"]("a"*300,"a"*100) == list(range(201))
assert f["kmp"]("a"*5000+"b","a"*100+"b") == [4900]
assert f["min_window"]("".join(chr(0x1000+i) for i in range(2000))+"aba","aa") == "aba"
sys.setprofile(None)
assert required_codes <= called_codes, "Every template function and Trie method must actually be called"
print(f"PASS: {len(data['fundamentals'])} executable fundamentals; all {len(data['templates'])} templates and Trie methods functionally called; seeded randomized/brute-force and Unicode/matching/window/DP checks")
