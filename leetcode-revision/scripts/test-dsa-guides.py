#!/usr/bin/env python3
"""Run canonical and audit suites against public JSON in disposable co-located storage."""
from pathlib import Path
import shutil
import subprocess
import sys
import tempfile
ROOT = Path(__file__).resolve().parent.parent
TOPICS = ('arrays','strings','hash-maps','linked-lists','stacks','queues','trees','heaps','graphs','tries','union-find')

def main():
    # Suites intentionally load adjacent JSON. Stage matching public content and
    # tests together, keeping executable tests and private state out of public data.
    with tempfile.TemporaryDirectory(prefix='recall-dsa-algorithms-') as folder:
        directory = Path(folder)
        shutil.copyfile(ROOT / 'tests/dsa/call_coverage.py', directory / 'call_coverage.py')
        for topic in TOPICS:
            source = ROOT / 'data/dsa' / (topic + '-guide.json')
            test = ROOT / 'tests/dsa' / (topic + '-template-tests.py')
            if not source.is_file() or not test.is_file():
                raise SystemExit('Missing content/test: ' + topic)
            shutil.copyfile(source, directory / source.name)
            shutil.copyfile(test, directory / test.name)
            audit = ROOT / 'tests/dsa' / (topic + '-audit-tests.py')
            shutil.copyfile(audit, directory / audit.name)
        for topic in TOPICS:
            print('=== ' + topic + ' algorithms ===', flush=True)
            for suffix in ['-template-tests.py', '-audit-tests.py']:
                result = subprocess.run([sys.executable, str(directory / (topic + suffix))], cwd=directory)
                if result.returncode:
                    raise SystemExit(result.returncode)
    print('PASS: all 11 canonical functional suites and 11 audit regression suites against published JSON')

if __name__ == '__main__': main()
