"""Observe actual algorithm calls; compiling a namespace never satisfies coverage."""
import ast
import sys

EXPECTED = set()
CALLED = set()
TARGETS = {}


def load_template(row):
    tree = ast.parse('\n'.join(row[3]))
    namespace = {}
    exec(compile(tree, row[0], 'exec'), namespace)
    for node in tree.body:
        entries = []
        if isinstance(node, ast.FunctionDef) and not node.name.startswith('_'):
            entries.append((node.name, namespace[node.name]))
        elif isinstance(node, ast.ClassDef):
            # Plain structural Node records are fixtures, not algorithms.
            methods = [n for n in node.body if isinstance(n, ast.FunctionDef)]
            if all(n.name == '__init__' for n in methods):
                continue
            for method in methods:
                if not method.name.startswith('_') or method.name in {'__init__', '__iter__', '__next__', '__len__'}:
                    entries.append((node.name + '.' + method.name, getattr(namespace[node.name], method.name)))
        for name, function in entries:
            target = row[0], name
            EXPECTED.add(target)
            TARGETS[function.__code__] = target
    return namespace


def observe(frame, event, arg):
    if event == 'call' and frame.f_code in TARGETS:
        CALLED.add(TARGETS[frame.f_code])


def verify(guide):
    required = {row[0] for row in guide['templates']}
    assert {name for name, _ in EXPECTED} == required, 'Every final template must be loaded by a behavioral test'
    assert CALLED == EXPECTED, 'Missing actual algorithm calls: ' + repr(sorted(EXPECTED - CALLED))
    print(f'PASS invocation guard: {len(required)} templates, {len(EXPECTED)} public functions/methods actually called')


sys.setprofile(observe)
