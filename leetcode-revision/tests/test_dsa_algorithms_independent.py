"""Independent deterministic cross-checks against small brute-force oracles."""
import json
import random
import unittest
from collections import Counter, deque
from pathlib import Path
ROOT = Path(__file__).resolve().parent.parent

def load(topic, title):
    data = json.loads((ROOT / 'data/dsa' / (topic + '-guide.json')).read_text())
    row = next(row for row in data['templates'] if row[0] == title)
    namespace = {}
    exec(compile(chr(10).join(row[3]), title, 'exec'), namespace)
    return namespace

class IndependentAlgorithmTests(unittest.TestCase):
    def test_scc_against_pairwise_reachability(self):
        f = load('graphs', 'Iterative Kosaraju strongly connected components')['strongly_connected_components']
        rng = random.Random(411)
        for n in range(8):
            for _ in range(30):
                adj = [[v for v in range(n) if rng.randrange(4) == 0] for u in range(n)]
                count, labels = f(adj)
                reach = []
                for start in range(n):
                    seen, stack = {start}, [start]
                    while stack:
                        for v in adj[stack.pop()]:
                            if v not in seen:
                                seen.add(v); stack.append(v)
                    reach.append(seen)
                self.assertEqual(count, len(set(labels)))
                for u in range(n):
                    for v in range(n):
                        self.assertEqual(labels[u] == labels[v], v in reach[u] and u in reach[v])

    def test_bridges_against_removing_each_multigraph_edge(self):
        f = load('graphs', 'Iterative bridges with edge IDs')['bridges']
        rng = random.Random(412)
        def components(n, edges, skip=-1):
            adj = [[] for _ in range(n)]
            for i, (u, v) in enumerate(edges):
                if i != skip:
                    adj[u].append(v); adj[v].append(u)
            seen, total = set(), 0
            for start in range(n):
                if start in seen: continue
                total += 1; seen.add(start); stack = [start]
                while stack:
                    for v in adj[stack.pop()]:
                        if v not in seen: seen.add(v); stack.append(v)
            return total
        self.assertEqual(f(0, []), [])
        for n in range(1, 8):
            for _ in range(40):
                edges = [(rng.randrange(n), rng.randrange(n)) for i in range(rng.randrange(15))]
                base = components(n, edges)
                want = {i for i in range(len(edges)) if components(n, edges, i) > base}
                self.assertEqual(set(f(n, edges)), want)

    def test_zero_one_bfs_against_relaxation_oracle(self):
        f = load('graphs', '0–1 BFS with stale-entry protection')['zero_one_bfs']
        rng = random.Random(413)
        for n in range(1, 9):
            for _ in range(35):
                adj = [[(v, rng.randrange(2)) for v in range(n) if rng.randrange(4) == 0] for u in range(n)]
                source = rng.randrange(n)
                want = [float('inf')] * n; want[source] = 0
                for i in range(n-1):
                    for u in range(n):
                        for v, weight in adj[u]: want[v] = min(want[v], want[u] + weight)
                self.assertEqual(f(adj, source), want)

    def test_cooldown_schedule_feasibility_and_optimal_length(self):
        f = load('heaps', 'Construct a uniform-cooldown schedule')['cooldown_schedule']
        rng = random.Random(414)
        for _ in range(300):
            tasks = [rng.choice('abcd') for i in range(rng.randrange(22))]
            cooldown = rng.randrange(7)
            schedule = f(tasks, cooldown)
            self.assertEqual(Counter(x for x in schedule if x is not None), Counter(tasks))
            last = {}
            for i, task in enumerate(schedule):
                if task is None: continue
                if task in last: self.assertGreater(i-last[task], cooldown)
                last[task] = i
            counts = Counter(tasks)
            maximum = max(counts.values(), default=0)
            tied = sum(v == maximum for v in counts.values())
            optimum = max(len(tasks), (maximum-1)*(cooldown+1)+tied) if tasks else 0
            self.assertEqual(len(schedule), optimum)

    def test_trie_board_search_against_per_word_bruteforce(self):
        f = load('tries', 'Iterative Word Search II with trie pruning')['find_board_words']
        rng = random.Random(415)
        def exists(board, word):
            if not word: return True
            rows, cols = len(board), len(board[0]) if board else 0
            def visit(r, c, index, seen):
                if not (0 <= r < rows and 0 <= c < cols) or (r,c) in seen or board[r][c] != word[index]: return False
                if index == len(word)-1: return True
                return any(visit(r+dr,c+dc,index+1,seen|{(r,c)}) for dr,dc in ((1,0),(-1,0),(0,1),(0,-1)))
            return any(visit(r,c,0,set()) for r in range(rows) for c in range(cols))
        for _ in range(150):
            rows, cols = rng.randrange(4), rng.randrange(4)
            board = [[rng.choice('ab') for c in range(cols)] for r in range(rows)]
            words = [''.join(rng.choice('ab') for j in range(rng.randrange(6))) for i in range(15)]
            before = [row[:] for row in board]
            actual = f(board, words)
            self.assertEqual(set(actual), {word for word in words if exists(board, word)})
            self.assertEqual(len(actual), len(set(actual)))
            self.assertEqual(board, before)

if __name__ == '__main__':
    unittest.main()
