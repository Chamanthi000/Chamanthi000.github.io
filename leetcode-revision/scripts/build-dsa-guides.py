#!/usr/bin/env python3
"""Validate public DSA JSON and emit a self-contained static browser bundle."""
import argparse
import ast
import json
from pathlib import Path
import tempfile

ROOT = Path(__file__).resolve().parent.parent
TOPICS = (
    "arrays", "strings", "hash-maps", "linked-lists", "stacks", "queues", "trees", "heaps",
    "graphs", "tries", "union-find",
)
ROWS = {
    "operations": 6, "fundamentals": 6, "patterns": 10, "recognize": 3,
    "contrasts": 2, "edges": 3, "mistakes": 2, "impress": 2,
    "memory": 3, "templates": 5, "practice": 5,
}
SUPPLEMENTAL = {
    "operationExamples": ("operations", {"code", "result", "use", "mutation"}),
    "fundamentalDetails": ("fundamentals", {"why", "use", "result", "edge", "takeaway"}),
    "patternDetails": ("patterns", {"steps", "templates", "related", "variations"}),
    "templateDetails": ("templates", {"pattern", "preconditions", "observation"}),
    "practiceDetails": ("practice", {"insight", "secondary"}),
}
MARKER = "/*__DSA_GUIDE_DATA__*/[]"


def fail(where, message):
    raise ValueError(f"{where}: {message}")


def text(value, where, allow_blank=False):
    if not isinstance(value, str) or (not allow_blank and not value.strip()):
        fail(where, "expected a nonempty string")


def validate_code(lines, where):
    if not isinstance(lines, list) or not lines:
        fail(where, "expected nonempty Python code lines")
    for index, line in enumerate(lines):
        text(line, f"{where}[{index}]", allow_blank=True)
    try:
        code = "\n".join(lines)
        compile(ast.parse(code, filename=where, feature_version=(3, 10)), where, "exec")
    except (SyntaxError, ValueError) as error:
        fail(where, f"invalid Python: {error}")


def validate_guide(data, topic):
    if not isinstance(data, dict):
        fail(topic, "expected an object")
    unknown = set(data) - {"id", "title", "subtitle", "variables", *ROWS, *SUPPLEMENTAL, "decisionProcess", "sources"}
    if unknown:
        fail(topic, "unknown fields outside the public content contract: " + ", ".join(sorted(unknown)))
    if topic not in TOPICS:
        fail(topic, "unsupported public preset topic")
    if data.get("id") != topic:
        fail(topic + ".id", "must match the topic filename")
    for key in ("title", "subtitle"):
        text(data.get(key), f"{topic}.{key}")
    # Support prose, individual rules, or named symbol definitions. Workers can
    # choose the representation that makes their complexity model clearest.
    variables = data.get("variables")
    if isinstance(variables, str):
        text(variables, topic + ".variables")
    elif isinstance(variables, dict) and variables:
        for symbol, definition in variables.items():
            text(symbol, topic + ".variables symbol")
            text(definition, topic + ".variables." + symbol)
    elif isinstance(variables, list) and variables:
        for index, entry in enumerate(variables):
            where = f"{topic}.variables[{index}]"
            if isinstance(entry, list) and len(entry) == 2:
                for part in entry:
                    text(part, where)
            else:
                text(entry, where)
    else:
        fail(topic + ".variables", "expected model assumptions or symbol definitions")
    for key, width in ROWS.items():
        rows = data.get(key)
        if not isinstance(rows, list) or not rows:
            fail(f"{topic}.{key}", "expected a nonempty array")
        for index, row in enumerate(rows):
            where = f"{topic}.{key}[{index}]"
            if not isinstance(row, list) or len(row) != width:
                fail(where, f"expected exactly {width} fields")
            for column, value in enumerate(row):
                field = f"{where}[{column}]"
                if (key, column) in (("fundamentals", 2), ("templates", 3)):
                    validate_code(value, field)
                else:
                    text(value, field)
            if key == "patterns" and row[1] not in ("CORE", "IMPORTANT", "ADVANCED", "SPECIALIST"):
                fail(where + "[1]", "unknown pattern tier")
    template_names = [row[0] for row in data["templates"]]
    if len(set(template_names)) != len(template_names):
        fail(topic + ".templates", "template names must be unique")
    for key, (aligned, fields) in SUPPLEMENTAL.items():
        if key not in data:
            continue
        entries = data[key]
        if not isinstance(entries, list) or len(entries) != len(data[aligned]):
            fail(topic + "." + key, "must align one-for-one with " + aligned)
        for i, entry in enumerate(entries):
            where = f"{topic}.{key}[{i}]"
            if not isinstance(entry, dict) or set(entry) != fields:
                fail(where, "expected exactly " + ", ".join(sorted(fields)))
            for field, value in entry.items():
                if field == "code":
                    validate_code(value, where + ".code")
                elif field in ("steps", "templates"):
                    if not isinstance(value, list) or not value:
                        fail(where + "." + field, "expected a nonempty list")
                    for item in value:
                        text(item, where + "." + field)
                        if field == "templates" and item not in template_names:
                            fail(where + ".templates", "unknown template name: " + item)
                else:
                    text(value, where + "." + field)
    if "decisionProcess" in data:
        if not isinstance(data["decisionProcess"], list) or not data["decisionProcess"]:
            fail(topic + ".decisionProcess", "expected nonempty steps")
        for step in data["decisionProcess"]:
            text(step, topic + ".decisionProcess")
    if "sources" in data:
        if not isinstance(data["sources"], list) or not data["sources"]:
            fail(topic + ".sources", "expected nonempty sources")
        from urllib.parse import urlparse
        for source in data["sources"]:
            if not isinstance(source, dict) or set(source) != {"title", "url", "note"}:
                fail(topic + ".sources", "expected title, url, note only")
            for value in source.values():
                text(value, topic + ".sources")
            url = urlparse(source["url"])
            if url.scheme != "https" or not url.netloc or url.username or url.password:
                fail(topic + ".sources", "expected public HTTPS URL without credentials")
    return data


def load_guides(data_dir, allow_partial=False):
    guides, missing = [], []
    for topic in TOPICS:
        path = data_dir / f"{topic}-guide.json"
        if not path.is_file():
            missing.append(path.name)
            continue
        try:
            guide = json.loads(path.read_text(encoding="utf-8"))
        except (ValueError, OSError) as error:
            fail(path.name, str(error))
        guides.append(validate_guide(guide, topic))
    if missing and not allow_partial:
        fail("missing guide files", ", ".join(missing))
    return guides, missing


def bundle(guides):
    source = (ROOT / "scripts/dsa-guide-renderer.js").read_text(encoding="utf-8")
    if source.count(MARKER) != 1:
        fail("renderer", "expected exactly one data marker")
    payload = json.dumps(guides, ensure_ascii=False, separators=(",", ":"))
    # Safe even if this external script is later embedded into an HTML document.
    payload = payload.replace("<", "\\u003c").replace("\u2028", "\\u2028").replace("\u2029", "\\u2029")
    return "// Generated by scripts/build-dsa-guides.py; edit JSON or renderer source.\n" + source.replace(MARKER, payload)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--data-dir", type=Path, default=ROOT / "data/dsa")
    parser.add_argument("--output", type=Path, default=ROOT / "dsa-interview-guides.js")
    parser.add_argument("--allow-partial", action="store_true", help="development only: skip missing files")
    parser.add_argument("--check", action="store_true", help="validate and verify the bundle is up to date")
    args = parser.parse_args()
    try:
        guides, missing = load_guides(args.data_dir, args.allow_partial)
        result = bundle(guides)
        if args.check:
            if not args.output.is_file() or args.output.read_text(encoding="utf-8") != result:
                fail(str(args.output), "bundle is missing or stale; rebuild it")
        else:
            args.output.parent.mkdir(parents=True, exist_ok=True)
            with tempfile.NamedTemporaryFile(mode="w", encoding="utf-8", dir=args.output.parent, delete=False) as handle:
                handle.write(result)
                temporary = Path(handle.name)
            temporary.replace(args.output)
    except (ValueError, OSError) as error:
        parser.exit(1, f"DSA build failed: {error}\n")
    print(f"{'Checked' if args.check else 'Built'} {len(guides)}/{len(TOPICS)} guides: {args.output}")
    if missing:
        print("Development partial build; missing: " + ", ".join(missing))


if __name__ == "__main__":
    main()
