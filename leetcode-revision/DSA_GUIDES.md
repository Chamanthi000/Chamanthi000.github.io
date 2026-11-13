# Public DSA guide integration

The nine new guides use the existing Arrays `.ag` components and eight major sections. Arrays and Strings keep their original reference data and archive functions. Public content and private editable records remain separate.

## Sources and static build

- Content sources include the nine root `<topic>-guide.json` files and their `<topic>-template-tests.py` files. The integration does not modify these.
- `scripts/dsa-guide-renderer.js` owns the shared HTML renderer.
- `scripts/build-dsa-guides.py` validates content and produces `dsa-interview-guides.js`. Commit/deploy that generated asset with the site when the owner is ready; no deployment is performed here.
- `index.html` loads the generated bundle before `data-structure-revision.js`. Runtime uses ordinary scripts, with no fetch, package manager, backend, or build service required by GitHub Pages.

Run the strict production build after editing content:

```sh
python3 scripts/build-dsa-guides.py
python3 scripts/build-dsa-guides.py --check
```

For development with an explicitly incomplete content set only:

```sh
python3 scripts/build-dsa-guides.py --allow-partial
python3 scripts/build-dsa-guides.py --allow-partial --check
```

Partial builds skip missing files only. Invalid present files always fail. Validation finishes before replacing the output, so a failed build preserves the previous bundle. The strict default reports every missing topic. `--check` also rejects a stale or missing generated asset.

Content can later move without changing runtime behavior:

```sh
python3 scripts/build-dsa-guides.py --data-dir content/dsa
```

For future asset changes, update the corresponding `index.html` cache-busting query strings along with the generated asset.

## Data contract

See `DSA_GUIDE_SPEC.md` for the complete tuple field definitions. The builder enforces all required fields, topic/filename identity, nonempty rows, tuple widths, scalar strings, valid tiers, and Python 3.10 grammar/compilation for every fundamental and template. Unknown top-level fields are rejected so record metadata or private-note fields cannot silently enter the public bundle. It does not execute content code during a build; the topic executable template tests provide algorithm correctness evidence.

`variables` accepts prose, a list of rules, `[symbol, definition]` pairs, or an object mapping symbols to definitions. Other fields follow the spec exactly. Content is plain text; embedded markup and URLs are displayed as escaped text. The generated script escapes `<` and JavaScript line separators in the embedded payload, and the renderer escapes every data value before inserting HTML. Existing Arrays/Strings external links keep `target="_blank" rel="noopener noreferrer"`.

All counts come from data. Patterns include recognition, approach, time, space, practice, traps, correctness invariants, and applicability limits. Templates include code, costs, and their contract/adaptation. Practice includes difficulty, optimized complexity, and the key trap.

## State and private notes

- Existing record key: `recall-structures-v1`, with the same record objects and cloud events.
- Existing section keys: `recall-arrays-open-v1` and `recall-strings-open-v1` remain independent.
- New section key: `recall-dsa-guides-open-v1`. Only known sections for loaded public preset guides are accepted. Section IDs are `dg-<topic>-<section>`; pattern IDs are `dg-<topic>-pattern-<index>`.
- New public sections begin collapsed on a fresh device. A user's saved open sections are restored. Expand/collapse/navigation affect only the clicked article.
- New guides display saved private text in a separate plain-text block and edit the original `notes` field. They never archive, clear, consolidate, or add migration metadata to notes. Arrays/Strings keep their prior opt-in archival behavior.
- Only the eleven built-in topics are visible, in canonical order ending with Union Find. Extra/custom notebooks are excluded from cards, navigation, search and summary counts on every load and cloud merge; the add/delete-custom controls are absent. Their original records, notes, timestamps and metadata remain intact in private device/cloud storage and backups. Nothing is automatically deleted or migrated. Updated website code applies after each device loads or refreshes the deployed site; already-open/offline pages cannot update instantly.
- Missing/empty public bundles leave private notes available. Storage exceptions do not block reading public guides.

## Integration checks

No dependencies are installed by these checks. All synthetic JSON is written only to isolated temporary directories, never over real guide content.

```sh
python3 -m unittest discover -s tests -p 'test_*.py' -v
node tests/dsa-renderer.test.cjs
node --check scripts/dsa-guide-renderer.js
node --check dsa-interview-guides.js
node --check data-structure-revision.js
node --check array-interview-guide.js
node --check string-interview-guide.js
```

Use a real Node executable for `--check`. On this machine `node` first resolves to a Bun shim; `/opt/homebrew/bin/node` provides Node's syntax-only check.

Optional automated browser suite, using an already available Playwright module and Chromium:

```sh
DSA_PLAYWRIGHT_MODULE=/path/to/existing/playwright \
DSA_CHROMIUM_EXECUTABLE=/path/to/existing/chromium \
node tests/dsa-browser.test.cjs
```

With a normal local Playwright installation, `node tests/dsa-browser.test.cjs` suffices; `DSA_CHROMIUM_EXECUTABLE` is optional. If no module is available, the browser script reports a skip. It intercepts all page requests, requires no listening server, and uses disposable browser profiles and synthetic notes. It checks actual DOM rendering, section scopes and reload persistence, keyboard operation, copy delegation, all-topic search, note editing/preservation, fixed topic scope and hidden-record preservation, two-device cloud merge/reload, mobile layout, missing/empty registry, and denied storage. `DSA_SCREENSHOT=1` optionally writes `output/playwright/dsa-mobile.png`.

The full-index isolated preview test uses actual guide content and local website files while disabling production Firebase and intercepting every request. Run tests/dsa-real-content.test.cjs with the same Playwright environment variables. It checks all eleven topics, real-content counts, navigation, unique IDs, desktop and 375px mobile layouts, and saves preview screenshots under output/playwright. Use disposable browser storage; never seed real private notes.
