# Public DSA content schema

Store each public guide in <topic>-guide.json, for example hash-maps-guide.json. Fields: id, title, subtitle (one-sentence mental model), variables (complexity symbol definitions and model assumptions), operations, fundamentals, patterns, recognize, contrasts, edges, mistakes, impress, memory, templates, practice.
Arrays for each field:
operations: [group, pythonSyntax, operationDescription, time, auxiliarySpace, caveat]
fundamentals: [title, clearExplanation, arrayOfPythonCodeLines, time, space, trap]
patterns: [name, CORE|IMPORTANT|ADVANCED|SPECIALIST, recognitionCue, optimizedApproach, time, space, practiceProblemNames, trap, correctnessInvariant, whenNotToUse]
recognize: [problemCue, recommendedPattern, assumptionOrCounterexample]
contrasts: [frequentlyConfusedPair, practicalDistinction]
edges: [caseName, concreteInputOrScenario, expectedBehaviorOrCheck]
mistakes: [mistakeName, preciseCorrection]
impress: [interviewHabit, concreteReasoningMove]
memory: [label, formulaOrRule, explanation]
templates: [name, time, space, arrayOfRunnablePythonCodeLines, contractAndAdaptation]
practice: [LC numberAndName, pattern, difficulty, optimizedComplexity, keyTrap]

Match Arrays' eight-section structure: Operations; Fundamentals; Patterns; Recognition + contrasts; Edge cases; Interview tips + pitfalls; Recall formulas + copy-ready templates; Deliberate practice. Aim substantial but proportional: roughly 15-30 operations (fewer for a small API), 9-15 fundamentals, 12-22 patterns (8-12 for narrowly scoped Trie/DSU), 12-20 recognition cues, 6-10 contrasts, 12-18 edge cases, 12-18 mistakes, 8-12 interview habits, 10-15 recall rules, 10-18 executable templates (8-12 narrow topics), 15-25 ordered practice problems. Avoid filler to hit counts. No copied paid-course content or unsupported 'all algorithms/optimal universally' claims.

Python 3.10+ compatible, standard library only. Every template must be standalone: include imports, Node definitions etc if needed (duck-typing LeetCode nodes is OK if contract explicit, but define helper classes for runnable examples where possible). No placeholders, pseudocode, ellipses or unimplemented functions. Fundamentals also syntactically valid snippets. State preconditions, output contract, mutation, directed vs undirected, weighted vs unweighted, identity vs value. Use expected/amortized qualification, distinguish auxiliary/output and recursion space. Python arbitrary integer costs can be noted globally; count hashing cost for long strings. Depth > ~1000 needs iterative alternatives, never advise globally raising recursion limit. Avoid stale heapq maxheap APIs (use negative numeric keys). Tuples in heaps need tie-breaking counter for unorderable nodes. Return empty inputs consistently; invalid arguments use ValueError when relevant.

Validate code using scripts/build-dsa-guides.py, execute each topic-template-tests.py suite and rerun the shared build, renderer, storage, desktop and mobile tests before publication. Keep personal notes and credentials out of public content.
