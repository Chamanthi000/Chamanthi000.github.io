#!/usr/bin/env python3
"""Run exact worker tests against public JSON in a disposable co-located directory."""
from pathlib import Path
import shutil
import subprocess
import sys
import tempfile
ROOT = Path(__file__).resolve().parent.parent
TOPICS = ('arrays','strings','hash-maps','linked-lists','stacks','queues','trees','heaps','graphs','tries','union-find')

def main():
    # Authoring tests intentionally load adjacent JSON. Preserve them byte-for-byte,
    # but keep executable tests out of production data and never copy private state.
    with tempfile.TemporaryDirectory(prefix='recall-dsa-algorithms-') as folder:
        directory = Path(folder)
        for topic in TOPICS:
            source = ROOT / 'data/dsa' / (topic + '-guide.json')
            test = ROOT / 'tests/dsa' / (topic + '-template-tests.py')
            if not source.is_file() or not test.is_file():
                raise SystemExit('Missing content/test: ' + topic)
            shutil.copyfile(source, directory / source.name)
            shutil.copyfile(test, directory / test.name)
        for topic in TOPICS:
            print('=== ' + topic + ' algorithms ===', flush=True)
            result = subprocess.run([sys.executable, str(directory / (topic + '-template-tests.py'))], cwd=directory)
            if result.returncode:
                raise SystemExit(result.returncode)
    print('PASS: all 11 worker functional suites against published JSON')

if __name__ == '__main__': main()
