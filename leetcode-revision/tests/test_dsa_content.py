"""Production public content coverage and execution audit; no user state or network."""
import contextlib
import importlib.util
import io
import json
from pathlib import Path
import subprocess
import sys
import unittest
ROOT = Path(__file__).resolve().parent.parent
spec = importlib.util.spec_from_file_location('dsa_build', ROOT / 'scripts/build-dsa-guides.py')
build = importlib.util.module_from_spec(spec)
spec.loader.exec_module(build)

class ProductionContentTests(unittest.TestCase):
    def test_all_eleven_complete_and_all_public_examples_execute(self):
        counts = {}
        for topic in build.TOPICS:
            path = ROOT / 'data/dsa' / (topic + '-guide.json')
            data = build.validate_guide(json.loads(path.read_text()), topic)
            for field in [*build.SUPPLEMENTAL, 'decisionProcess', 'sources']:
                self.assertIn(field, data, topic + ' missing ' + field)
            counts[topic] = {key:len(data[key]) for key in ['operations','fundamentals','patterns','templates','practice']}
            covered = {name for entry in data['patternDetails'] for name in entry['templates']}
            self.assertTrue(covered <= {row[0] for row in data['templates']})
            self.assertEqual(len(data['patternDetails']),len(data['patterns']))
            for name, lines in [('operation '+str(i),entry['code']) for i,entry in enumerate(data['operationExamples'])] + [('fundamental '+str(i),row[2]) for i,row in enumerate(data['fundamentals'])]:
                with self.subTest(topic=topic,example=name):
                    result=subprocess.run([sys.executable,'-c','\n'.join(lines)],capture_output=True,text=True,timeout=8)
                    self.assertEqual(result.returncode,0,result.stderr)
            # Definitions execute in fresh namespaces; workers exercise algorithm behavior separately.
            for row in data['templates']:
                with self.subTest(topic=topic,template=row[0]):
                    result=subprocess.run([sys.executable,'-c','\n'.join(row[3])],capture_output=True,text=True,timeout=8)
                    self.assertEqual(result.returncode,0,result.stderr)
        print('PUBLIC GUIDE COUNTS '+json.dumps(counts,sort_keys=True))

if __name__ == '__main__': unittest.main()
