"""Static canonical content and fallback gates for all 11 topics; does not execute algorithms.

Run with Python 3.10+ and the standard library:
    python3 -m unittest discover -s tests -p 'test_dsa_content_quality.py' -v
"""
import importlib.util
import json
from pathlib import Path
import re
import tempfile
import unittest
import sys

from guide_fixtures import TOPICS, guide
legacy_guide = guide

ROOT = Path(__file__).resolve().parent.parent
LEGACY_FILES = {'arrays': 'array-interview-guide.js', 'strings': 'string-interview-guide.js'}
ALL_TOPICS = TOPICS
spec = importlib.util.spec_from_file_location('dsa_quality_build', ROOT / 'scripts/build-dsa-guides.py')
build = importlib.util.module_from_spec(spec)
spec.loader.exec_module(build)


def load_content(topic, directory=None):
    if directory is None:
        return json.loads((ROOT / "data/dsa" / f"{topic}-guide.json").read_text())
    if topic not in LEGACY_FILES:
        path = directory / f'{topic}-guide.json'
        try:
            return json.loads(path.read_text(encoding='utf-8'))
        except (ValueError, OSError) as error:
            raise ValueError(f'{topic} ({path.name}): {error}') from error
    source = (directory / LEGACY_FILES[topic]).read_text(encoding='utf-8')
    marker = re.search(r'\bconst\s+d\s*=\s*', source)
    if marker is None:
        raise ValueError(f'{topic}: missing embedded const d JSON')
    try:
        data, end = json.JSONDecoder().raw_decode(source[marker.end():])
    except ValueError as error:
        raise ValueError(f'{topic}: invalid embedded const d JSON: {error}') from error
    if not source[marker.end() + end:].lstrip().startswith(';'):
        raise ValueError(f'{topic}: expected a semicolon after embedded const d JSON')
    return data


def validate_content(data, topic):
    if topic not in LEGACY_FILES:
        return build.validate_guide(data, topic)
    if not isinstance(data, dict):
        build.fail(topic, 'expected an object')
    widths = dict(build.ROWS)
    if topic == 'arrays':
        # Preserve the existing embedded format; also allow a complete category
        # to adopt the extended Strings/shared contract without fixing counts.
        for key, legacy_width in [('patterns', 8), ('templates', 4), ('practice', 3)]:
            rows = data.get(key)
            if not (isinstance(rows, list) and rows and isinstance(rows[0], list)
                    and len(rows[0]) == build.ROWS[key]):
                widths[key] = legacy_width
    build.validate_rows(data, topic, widths)
    return data


def fixture(topic):
    return legacy_guide(topic) if topic in LEGACY_FILES else guide(topic)


class PublicContentQualityTests(unittest.TestCase):
    def test_fallback_rows_match_final_canonical_content(self):
        for topic, filename in LEGACY_FILES.items():
            canonical = load_content(topic)
            fallback = load_content(topic, ROOT)
            for field in build.ROWS:
                key = (lambda row: row[1]) if field == 'operations' else (lambda row: row[0])
                rows = {key(row): row for row in canonical[field]}
                for row in fallback[field]:
                    self.assertEqual(row, rows[key(row)], (topic, field, key(row)))
            self.assertTrue(fallback['templates'])

    def test_invocation_guard_rejects_compile_only_and_partial_calls(self):
        previous = sys.getprofile()
        try:
            spec = importlib.util.spec_from_file_location('coverage_probe', ROOT / 'tests/dsa/call_coverage.py')
            guard = importlib.util.module_from_spec(spec)
            spec.loader.exec_module(guard)
            data = {'templates': [['Two independent API calls', 'O(1)', 'O(1)',
                                  ['def first(): return 1', 'def second(): return 2'], 'Read only.']]}
            namespace = guard.load_template(data['templates'][0])
            with self.assertRaisesRegex(AssertionError, 'Missing actual algorithm calls'):
                guard.verify(data)
            self.assertEqual(namespace['first'](), 1)
            with self.assertRaisesRegex(AssertionError, 'second'):
                guard.verify(data)
            self.assertEqual(namespace['second'](), 2)
            guard.verify(data)
        finally:
            sys.setprofile(previous)

    def test_all_eleven_topics_required_categories_titles_and_python(self):
        self.assertEqual(ALL_TOPICS, (
            'arrays', 'strings', 'hash-maps', 'linked-lists', 'stacks', 'queues',
            'trees', 'heaps', 'graphs', 'tries', 'union-find',
        ))
        self.assertEqual(build.TOPICS, TOPICS)
        for topic in ALL_TOPICS:
            with self.subTest(topic=topic):
                data = load_content(topic)
                self.assertIs(validate_content(data, topic), data)


class SyntheticContentQualityTests(unittest.TestCase):
    def test_accepts_all_supported_formats(self):
        for topic in ALL_TOPICS:
            with self.subTest(topic=topic):
                data = fixture(topic)
                self.assertIs(validate_content(data, topic), data)
        extended_arrays = legacy_guide('strings')
        self.assertIs(validate_content(extended_arrays, 'arrays'), extended_arrays)

    def test_rejects_missing_empty_or_malformed_categories(self):
        for topic in ALL_TOPICS:
            for key in build.ROWS:
                for value in [None, [], {}, 'content']:
                    with self.subTest(topic=topic, category=key, value=value):
                        data = fixture(topic)
                        if value is None:
                            del data[key]
                        else:
                            data[key] = value
                        with self.assertRaisesRegex(ValueError, f'{topic}.{key}'):
                            validate_content(data, topic)

    def test_rejects_malformed_rows_and_blank_text(self):
        for topic in ['arrays', 'strings', 'trees']:
            for key in build.ROWS:
                for change in ['width', 'blank text', 'non-string text']:
                    with self.subTest(topic=topic, category=key, change=change):
                        data = fixture(topic)
                        if change == 'width':
                            data[key][0].pop()
                        else:
                            data[key][0][0] = ' \t ' if change == 'blank text' else 42
                        with self.assertRaisesRegex(ValueError, key):
                            validate_content(data, topic)

    def test_rejects_blank_or_non_descriptive_template_titles(self):
        for topic in ALL_TOPICS:
            for title in ['', ' \t ', '...', '---', '123', 'Template', 'Template 1', 'Template #2', 'TODO', 'TBD']:
                with self.subTest(topic=topic, title=title):
                    data = fixture(topic)
                    data['templates'][0][0] = title
                    with self.assertRaisesRegex(ValueError, 'templates'):
                        validate_content(data, topic)

    def test_rejects_duplicate_titles_under_case_and_whitespace_normalization(self):
        for topic in ALL_TOPICS:
            with self.subTest(topic=topic):
                data = fixture(topic)
                data['templates'][0][0] = 'Prefix sum range query'
                data['templates'][1][0] = '  PREFIX\tSUM  range query\n'
                with self.assertRaisesRegex(ValueError, 'duplicate template title'):
                    validate_content(data, topic)

    def test_rejects_invalid_or_empty_python_in_both_code_categories(self):
        for topic in ['arrays', 'strings', 'trees']:
            for key, column in [('fundamentals', 2), ('templates', 3)]:
                for code in [[], [''], ['# only a comment'], [42], 'not code lines',
                             ['def broken('], ['return 1'], ['break'], ['type Alias = int']]:
                    with self.subTest(topic=topic, category=key, code=code):
                        data = fixture(topic)
                        data[key][0][column] = code
                        with self.assertRaisesRegex(ValueError, key):
                            validate_content(data, topic)

    def test_rejects_ast_placeholders_in_both_code_categories(self):
        stubs = [
            ['...'], ['unfinished = ...'],
            ['def unfinished():', '    ...'],
            ['def unfinished():', '    return ...'],
            ['def unfinished():', '    raise NotImplementedError'],
            ['def unfinished():', '    raise NotImplementedError("pending")'],
            ['import builtins', 'raise builtins.NotImplementedError("pending")'],
            ['class Solver:', '    def solve(self):', '        ...'],
            ['unfinished = values[lambda: ...]'],
        ]
        for topic in ['arrays', 'strings', 'trees']:
            for key, column in [('fundamentals', 2), ('templates', 3)]:
                for code in stubs:
                    with self.subTest(topic=topic, category=key, code=code):
                        data = fixture(topic)
                        data[key][0][column] = code
                        with self.assertRaisesRegex(ValueError, '(Ellipsis|NotImplementedError) code placeholder'):
                            validate_content(data, topic)

    def test_accepts_strings_comments_pass_and_legitimate_ellipsis_syntax(self):
        code = [
            'from typing import Callable',
            '# TODO: explain why "..." and "NotImplementedError" are plain text',
            'class Node:', '    pass',
            'def inspect(values: tuple[int, ...], callback: Callable[..., int]):',
            '    message = "... TODO FIXME NotImplementedError"',
            '    try:', '        return values[...]',
            '    except NotImplementedError:', '        return NotImplemented',
        ]
        for topic in ALL_TOPICS:
            data = fixture(topic)
            data['templates'][0][0] = 'Template for 2D prefix sums'
            data['patternDetails'][0]['templates'][0] = 'Template for 2D prefix sums'
            for key, column in [('fundamentals', 2), ('templates', 3)]:
                with self.subTest(topic=topic, category=key):
                    data[key][0][column] = code
                    self.assertIs(validate_content(data, topic), data)

    def test_static_gate_does_not_execute_or_establish_functional_correctness(self):
        for code in [['raise RuntimeError("the gate must not execute this")'],
                     ['def echo(value):', '    return None']]:
            data = guide('trees')
            data['templates'][0][3] = code
            self.assertIs(validate_content(data, 'trees'), data)

    def test_embedded_json_loading_without_executing_javascript(self):
        with tempfile.TemporaryDirectory(prefix='recall-content-quality-') as temporary:
            directory = Path(temporary)
            for topic, filename in LEGACY_FILES.items():
                data = fixture(topic)
                path = directory / filename
                path.write_text('(() => { const d=\n' + json.dumps(data) + ';\nthrow Error("do not execute"); })();', encoding='utf-8')
                self.assertEqual(load_content(topic, directory), data)
                for invalid in ['const other={};', 'const d={invalid};', 'const d={} + other;']:
                    with self.subTest(topic=topic, source=invalid):
                        path.write_text(invalid, encoding='utf-8')
                        with self.assertRaisesRegex(ValueError, topic):
                            load_content(topic, directory)

    def test_rejects_non_object_embedded_data(self):
        for topic in LEGACY_FILES:
            for data in [[], None, 'content']:
                with self.subTest(topic=topic, data=data):
                    with self.assertRaisesRegex(ValueError, 'expected an object'):
                        validate_content(data, topic)


if __name__ == '__main__':
    unittest.main()
