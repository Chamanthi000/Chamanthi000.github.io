"""Validate source-embedded Strings interview Python examples and core FAANG templates."""
import ast
import contextlib
import io
import json
import pathlib
import re

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

env = {}
for entry in data["templates"]:
    exec("\n".join(entry[3]), env)

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

print(
    f"PASS: {len(data['fundamentals'])} executable fundamentals; "
    f"{len(data['templates'])} compiled Python templates; "
    f"{len(data['patterns'])} algorithm families and functional edge cases"
)
