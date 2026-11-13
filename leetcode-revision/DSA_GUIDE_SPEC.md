# Public DSA guide schema

The eleven canonical topics are arrays,strings,hash-maps,linked-lists,stacks,queues,trees,heaps,graphs,tries,union-find (in this order). The interface ends at Union Find with no Add/delete notebook controls. Older extra private records remain in storage, sync, conflicts and exports; visibility is not a data migration.

Source JSON: data/dsa/<topic>-guide.json. Tests: tests/dsa/<topic>-template-tests.py. Build: python3 scripts/build-dsa-guides.py; deterministic check: same command with --check. Run all functional suites with python3 scripts/test-dsa-guides.py; the runner stages exact tests beside their JSON in temporary storage. Never edit the generated dsa-interview-guides.js by hand.

Required top-level strings: id (exact filename topic),title,subtitle. variables accepts nonempty prose,nonempty string rules,[symbol,definition] pairs,or a string-to-string definition object.

Tuple arrays (nonempty,exact widths; every scalar is a nonempty plain-text string):
- operations:[group,pythonSyntax,description,time,auxiliarySpace,caveat]
- fundamentals:[title,explanation,PythonCodeLines,time,space,trap]
- patterns:[name,CORE|IMPORTANT|ADVANCED|SPECIALIST,recognition,approach,time,space,practiceNames,trap,invariant,limits]
- recognize:[cue,recommendedPattern,whyAndException]
- contrasts:[confusedPair,practicalDistinction]
- edges:[caseName,concreteInput,expectedBehaviorAndIncorrectImplementationExposed]
- mistakes:[mistake,correction]
- impress:[interviewHabit,reasoningMove]
- memory:[label,formulaOrRule,explanation]
- templates:[uniqueName,time,space,PythonCodeLines,contractAndAdaptation]
- practice:[LCnumberAndName,primaryPattern,difficulty,optimizedComplexity,trap]

Supplemental arrays align one-for-one with their corresponding tuple arrays. Optional for legacy synthetic authoring fixtures; all are required by production content tests. Every supplied entry must contain exactly these nonempty fields:
- operationExamples[i]:{code:PythonCodeLines,result:string,use:string,mutation:string}
- fundamentalDetails[i]:{why:string,use:string,result:string,edge:string,takeaway:string}
- patternDetails[i]:{steps:nonemptyStringArray,templates:nonemptyExactTemplateNames,related:string,variations:string}
- templateDetails[i]:{pattern:string,preconditions:string,observation:string}
- practiceDetails[i]:{insight:string,secondary:string}
- decisionProcess:nonemptyStringArray (a timed1–3minute workflow)
- sources:nonemptyArray of {title:string,url:publicHTTPSURL,note:string}; no credentials in URLs.

Unknown top-level/supplemental fields are rejected,not silently ignored. All fields are escaped in HTML and indexed for search. Eight independent major chapters contain operations,fundamentals,patterns,recognition/contrasts,edges,interview,prompted recall/templates,and deliberate practice. Each individual operation/fundamental/pattern/template is nested-collapsible. Pattern template-name links must expand/focus the exact target; answers initially stay hidden for reconstruction. Include mastery rubric and honest source/review limits.

Python3.10+ grammar,standard library,standalone executable examples and definitions. No placeholder algorithms. Run examples and function-level ordinary,boundary,adversarial tests for every template,not compile alone. State assumptions/contracts/mutation/output,expected/amortized/worst costs,auxiliary versus persistent/output/recursive space,key hashing/comparison/big-int work,and limits. Prefer deep iterative alternatives over globally raising recursion limits. Newer Python has heapq max-heap APIs; negated-key templates retain3.10 compatibility. Paid-source completeness is not implied. Never place personal notes,owner markers,cloud originals,credentials or local backups in public JSON.
