import importlib.util
import json
from pathlib import Path
import subprocess
import tempfile
import unittest
from unittest.mock import patch

from guide_fixtures import TOPICS, guide, write_guides

ROOT = Path(__file__).resolve().parent.parent
spec = importlib.util.spec_from_file_location('dsa_build', ROOT / 'scripts/build-dsa-guides.py')
build = importlib.util.module_from_spec(spec)
spec.loader.exec_module(build)


class SchemaTests(unittest.TestCase):
    def test_all_topics_and_variable_representations(self):
        for topic in TOPICS:
            for variables in ['n is input length', ['n = length', 'Expected hashing costs'], [['n', 'length']], {'n': 'length'}]:
                data = guide(topic)
                data['variables'] = variables
                self.assertIs(build.validate_guide(data, topic), data)

    def test_rejects_missing_fields_and_wrong_rows(self):
        for key in ('title', 'subtitle', 'variables', *build.ROWS):
            with self.subTest(key=key):
                data = guide('trees')
                del data[key]
                with self.assertRaises(ValueError):
                    build.validate_guide(data, 'trees')
        for key in build.ROWS:
            data = guide('trees')
            data[key][0].pop()
            with self.assertRaisesRegex(ValueError, key):
                build.validate_guide(data, 'trees')

    def test_rejects_bad_types_ids_tiers_and_python(self):
        cases = [('id', 'other'), ('title', ''), ('variables', {}), ('operations', []), ('practice', [['too short']]), ('privateNotes', 'must not be bundled')]
        for key, value in cases:
            data = guide('trees')
            data[key] = value
            with self.assertRaises(ValueError):
                build.validate_guide(data, 'trees')
        for field, column, value in [('patterns', 1, 'UNKNOWN'), ('edges', 2, {'html': 'unsafe'}), ('templates', 3, ['def broken(']), ('fundamentals', 2, ['return 3']), ('templates', 3, [42]), ('templates', 3, ['type Alias = int'])]:
            data = guide('trees')
            data[field][0][column] = value
            with self.assertRaises(ValueError):
                build.validate_guide(data, 'trees')

    def test_optional_metadata_alignment_contract_and_links(self):
        import copy
        original = guide('trees')
        for key in build.SUPPLEMENTAL:
            data = copy.deepcopy(original)
            data[key] = []
            with self.assertRaises(ValueError): build.validate_guide(data, 'trees')
            data = copy.deepcopy(original)
            data[key][0]['privateMetadata'] = 'no'
            with self.assertRaises(ValueError): build.validate_guide(data, 'trees')
            data = copy.deepcopy(original)
            first = next(iter(data[key][0]))
            data[key][0][first] = ''
            with self.assertRaises(ValueError): build.validate_guide(data, 'trees')
        for key, field, value in [('patternDetails', 'templates', ['not a template']), ('operationExamples', 'code', ['not python!'])]:
            data = copy.deepcopy(original)
            data[key][0][field] = value
            with self.assertRaises(ValueError): build.validate_guide(data, 'trees')
        for url in ['javascript:alert(1)', 'https://user:password@example.org', 'http://example.org']:
            data = copy.deepcopy(original)
            data['sources'][0]['url'] = url
            with self.assertRaises(ValueError): build.validate_guide(data, 'trees')
        data = copy.deepcopy(original)
        for key in [*build.SUPPLEMENTAL, 'decisionProcess', 'sources']: del data[key]
        build.validate_guide(data, 'trees')


    def test_rejects_unusable_or_duplicate_template_titles(self):
        for title in ['', '   ', '...', '123', '---', 'Template', 'Template #2', 'TODO', 'TBD']:
            with self.subTest(title=title):
                data = guide('trees')
                data['templates'][0][0] = title
                with self.assertRaisesRegex(ValueError, 'templates'):
                    build.validate_guide(data, 'trees')
        data = guide('trees')
        data['templates'][1][0] = '  ' + data['templates'][0][0].upper() + '  '
        with self.assertRaisesRegex(ValueError, 'duplicate template title'):
            build.validate_guide(data, 'trees')

    def test_rejects_empty_code_and_explicit_ast_placeholders(self):
        for field, column in [('fundamentals', 2), ('templates', 3)]:
            for code in [['', '# no statements'], ['def unfinished():', '    ...'],
                         ['def unfinished():', '    return ...'],
                         ['raise NotImplementedError'], ['raise NotImplementedError("pending")']]:
                with self.subTest(field=field, code=code):
                    data = guide('trees')
                    data[field][0][column] = code
                    with self.assertRaisesRegex(ValueError, field):
                        build.validate_guide(data, 'trees')

    def test_accepts_literal_placeholder_words_and_valid_ellipsis_syntax(self):
        data = guide('trees')
        data['templates'][0][0] = 'Template for 2D prefix sums'
        data['patternDetails'][0]['templates'][0] = 'Template for 2D prefix sums'
        data['templates'][0][3] = [
            '# ... and NotImplementedError describe text, not a code stub',
            'from typing import Callable',
            'class Node:', '    pass',
            'def identity(values: tuple[int, ...], callback: Callable[..., int]):',
            '    message = "... NotImplementedError TODO"',
            '    try:', '        return values[...]',
            '    except NotImplementedError:', '        return NotImplemented',
        ]
        self.assertIs(build.validate_guide(data, 'trees'), data)

class BuildTests(unittest.TestCase):
    def setUp(self):
        self.temporary = tempfile.TemporaryDirectory(prefix='recall-dsa-test-')
        self.directory = Path(self.temporary.name)
        self.output = self.directory / 'bundle.js'

    def tearDown(self):
        self.temporary.cleanup()

    def cli(self, *args):
        return subprocess.run(['python3', str(ROOT / 'scripts/build-dsa-guides.py'), '--data-dir', str(self.directory), '--output', str(self.output), *args], capture_output=True, text=True)

    def test_strict_missing_files_and_explicit_empty_partial(self):
        self.output.write_text('previous bundle')
        result = self.cli()
        self.assertNotEqual(result.returncode, 0)
        self.assertIn('missing guide files', result.stderr)
        self.assertEqual(self.output.read_text(), 'previous bundle')
        self.assertEqual(self.cli('--allow-partial').returncode, 0)
        self.assertIn('const topics = [];', self.output.read_text())

    def test_complete_reproducible_build_and_stale_check(self):
        write_guides(self.directory)
        self.assertEqual(self.cli().returncode, 0)
        first = self.output.read_bytes()
        self.assertEqual(self.cli('--check').returncode, 0)
        self.assertEqual(self.cli().returncode, 0)
        self.assertEqual(self.output.read_bytes(), first)
        self.assertNotIn('</script>', self.output.read_text())
        self.assertIn('\\u003c/script>', self.output.read_text())
        self.output.write_text('stale')
        self.assertNotEqual(self.cli('--check').returncode, 0)

    def test_invalid_present_file_is_not_skipped_or_overwritten(self):
        self.output.write_text('previous bundle')
        path = self.directory / 'trees-guide.json'
        for invalid in ['{invalid json', json.dumps({'id': 'trees'})]:
            path.write_text(invalid)
            result = self.cli('--allow-partial')
            self.assertNotEqual(result.returncode, 0)
            self.assertEqual(self.output.read_text(), 'previous bundle')


    def test_failed_replacement_keeps_previous_bundle_and_cleans_temporary(self):
        self.output.write_text('previous bundle')
        with patch.object(Path, 'replace', side_effect=OSError('simulated replacement failure')):
            with self.assertRaisesRegex(OSError, 'simulated replacement failure'):
                build.write_bundle(self.output, 'new bundle')
        self.assertEqual(self.output.read_text(), 'previous bundle')
        self.assertEqual(list(self.directory.iterdir()), [self.output])

    def test_failed_write_keeps_previous_bundle_and_cleans_temporary(self):
        self.output.write_text('previous bundle')
        create_temporary = tempfile.NamedTemporaryFile

        def failing_temporary(**kwargs):
            handle = create_temporary(**kwargs)

            def fail_write(value):
                raise OSError('simulated write failure')

            handle.write = fail_write
            return handle

        with patch.object(build.tempfile, 'NamedTemporaryFile', side_effect=failing_temporary):
            with self.assertRaisesRegex(OSError, 'simulated write failure'):
                build.write_bundle(self.output, 'new bundle')
        self.assertEqual(self.output.read_text(), 'previous bundle')
        self.assertEqual(list(self.directory.iterdir()), [self.output])

if __name__ == '__main__':
    unittest.main()
