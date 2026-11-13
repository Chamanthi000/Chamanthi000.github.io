"""Small synthetic public-content fixtures; never write into the real content directory."""
import argparse
import json
from pathlib import Path

TOPICS = ('hash-maps', 'linked-lists', 'stacks', 'queues', 'trees', 'heaps', 'graphs', 'tries', 'union-find')


def guide(topic):
    def value(field):
        return f'{topic} {field} </script><img src=x onerror=alert(1)> & "quoted" \'single\''
    code = [f'# {value("python comment")}', 'def echo(value):', '    return value']
    return {
        'id': topic, 'title': value('title'), 'subtitle': value('subtitle'),
        'variables': value('variables'),
        'operations': [[value('group'), value('syntax'), value('description'), 'O(n)', 'O(1)', value('caveat')]],
        'fundamentals': [[value('fundamental'), value('explanation'), code, 'O(n)', 'O(1)', value('fundamental trap')]],
        'patterns': [[value('pattern'), 'CORE', value('cue'), value('approach'), 'O(n)', 'O(1)', value('problem names'), value('pattern trap'), value('invariant'), value('not applicable')]],
        'recognize': [[value('recognition cue'), value('recommendation'), value('counterexample')]],
        'contrasts': [[value('pair'), value('distinction')]],
        'edges': [[value('case'), value('input'), value('check')]],
        'mistakes': [[value('mistake'), value('correction')]],
        'impress': [[value('habit'), value('reasoning')]],
        'memory': [[value('recall label'), value('rule'), value('recall explanation')]],
        'templates': [[value('template'), 'O(n)', 'O(1)', code, value('contract')], [value('second template'), 'O(n)', 'O(1)', code, value('second contract')]],
        'practice': [[value('LC 1 problem'), value('practice pattern'), 'Easy', value('optimized complexity'), value('practice trap')]],
    }


def write_guides(directory):
    directory.mkdir(parents=True, exist_ok=True)
    for topic in TOPICS:
        (directory / f'{topic}-guide.json').write_text(json.dumps(guide(topic)), encoding='utf-8')


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--output-dir', type=Path, required=True)
    args = parser.parse_args()
    # Caller owns a disposable, isolated directory, never the public content root.
    if args.output_dir.resolve() == Path(__file__).resolve().parent.parent:
        parser.error('fixture output must be an isolated temporary directory')
    write_guides(args.output_dir)
