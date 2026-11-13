# Recall bounded data-safety repair

Source-only implementation and synthetic verification, 2026-11-13. Inspected all three existing backup/sync scripts and the regression tests before editing.

## Files changed

- `firebase-sync.js`: guarded restore transactions, exact predecessor history, account/session isolation, verified conflict archival, safer snapshot delivery, truthful sync status, server reads, and complete private history export.
- `backup-all.js`: fresh confirmation-time reads, verified persistent recovery originals, selected-record merge, preview/concurrent-edit protection, local write/readback/rollback checks, honest download wording, and recovery read/export access.
- `auto-backup.js`: strict source reads, exact raw originals in snapshots, commit/readback verification before retention pruning, full-value duplicate comparison, and truthful failure/download wording.
- `tests/data-safety-mocks.mjs`: synthetic browser/storage/Firestore/IndexedDB adapters. Firebase imports are replaced with adapters before executing the actual production script. No live imports or requests occur.
- `tests/data-safety-restore.test.mjs`, `tests/data-safety-sync.test.mjs`, `tests/data-safety-auto.test.mjs`: executable production-function coverage.
- `DATA_SAFETY_REPORT.md`: this report and app-owner handoff.

No shared existing tests, app/content/HTML/CSS, Git state, authentication, configuration, or cloud/user records were modified. No dependency installation, deployment, private-data inspection, or note consolidation was performed. Tests use isolated synthetic in-memory data. Existing Firebase initialization configuration was left unchanged; no credential values are reproduced here.

## Restore behavior

1. Preview records the separate device and server versions and the signed-in session generation. Version-1 archives still retain categories missing from the older format. Duplicate import identities and ambiguous existing device identities stop the operation rather than consolidate records.
2. Confirmation rereads device storage and server records. Any imported ID changed since preview on either side is skipped; unique and unrelated records stay intact. Only selected imported records that need restoration receive a new edit timestamp. Unrelated records retain their original values and timestamps.
3. Before restore writes, an independent `recall-before-restore-*` localStorage entry is written and read back byte-for-byte. It contains a compatible full backup plus `originals.localStorage` with exact raw values (including missing keys and the goals/habits envelope), and `originals.cloud` with separate server records and private histories. A failed write/readback stops restoration. Copies are not automatically deleted.
4. A safety download is also requested. A browser click cannot establish that a file was saved, so no message claims a verified download.
5. Cloud restoration submits only changed imported records through `writeWithHistory`, with an expected prior value or expected absence and a pinned account/session. Each transaction reads current data and history before writing. Concurrent divergent state returns a recoverable conflict and is not overwritten. Every changed restored predecessor is archived in the same transaction, bypassing the usual 30-minute history sampling interval. If the exact predecessor cannot fit in the existing history byte limit, the restore transaction fails without replacing it.
6. Device state is read again after asynchronous cloud work. Edits made while transactions ran are preserved. Local writes touch only changed collection keys, preserve goals/habits envelope fields, check the observed raw value before writing, and verify readback. On failure, completed writes are rolled back only while they still contain this restore's own value. Incomplete rollback and partial server completion are reported explicitly; the verified recovery copy remains available.

`RecallCloud.restoreAll(payload, options)` retains its numeric count result. Unsafe one-argument writes now fail: callers must supply `expected` and the current `sessionToken`. Optional `results` receives per-record outcomes. The manual restore caller is updated. `readAll()` retains its record-kind result and pending overlay; `{serverOnly:true}` excludes that overlay, and `{includeHistory:true}` adds original private histories for recovery/export.

`window.RecallBackupSafety.keys()`, `.read(key)`, and `.download(key)` provide recovery discovery, inspection, and download after reload. They never apply or clear records. The compatible top-level backup arrays remain usable by the existing importer; separate raw originals and history are retained for deliberate recovery rather than automatically replayed.

## Sync, conflicts, and backup status

- Conflict archival returns success/failure and verifies persistent readback. Failed archival retains the device version in snapshot delivery and retains pending transaction conflicts for retry. It never authorizes a remote replacement of an unarchived copy.
- Conflict identity includes complete versions, so distinct edits with tied timestamps retain separate copies. Existing copies are not silently evicted at the previous 100-copy cap. Quota failure blocks replacement and reports a conflict; it does not prune old recovery data.
- Snapshot delivery rereads disk before dispatch. Another tab's persisted edits are retained or archived before replacement. Unreadable storage is not replaced with cloud data. Post-dispatch verification checks what the receiving app actually persisted, and failures remain tracked separately for each notebook.
- Every async cloud read/write captures the UID and auth generation. References remain pinned to that UID, and checks run after awaits and inside transaction callbacks. An account switch stops remaining work, pending-state cleanup, and stale snapshot delivery. A transaction already submitted may finish for its original account; it never becomes a write to the next account.
- Because existing app storage is shared across accounts, a verified `recall-device-owner-v1` marker prevents automatic migration/overwrite when signing into a different account. Owner-storage failures pause automatic sync with a storage-failure message. Export and explicitly previewed restore remain available. The marker and notes are never automatically cleared.
- Waiting/queued, syncing, offline, failed device/cloud save, conflicts, and server-confirmed states are distinguished. Cached snapshots or snapshots with `hasPendingWrites` cannot produce a cloud-confirmed status. Resolved transactions can acknowledge their completed save. Other notebook failures cannot erase a device-storage failure.
- History downloads now read histories from coding, SQL, goals, and habits; structures/concepts remain in their existing typed coding collection. Account changes discard in-flight history export results.
- Automatic IndexedDB snapshots retain the existing 20-version policy. Source read/parse failures abort instead of creating a misleading empty snapshot. Snapshot writes await transaction completion and exact readback before pruning older versions. A hash match alone cannot suppress a distinct record payload. Failure messages no longer assert that ordinary device saves still work.

## Executed verification

Native Node executable: `node` (v26.5.0). No packages installed.

| Command | Final result |
| --- | --- |
| `node --test leetcode-revision/tests/recall.test.mjs` | PASS: 13 tests, 0 failures, 0 skipped |
| `node --test leetcode-revision/tests/data-safety-*.test.mjs` | PASS: 51 tests, 0 failures, 0 skipped |
| `node --test leetcode-revision/tests/recall.test.mjs leetcode-revision/tests/data-safety-*.test.mjs` | PASS: 64 tests, 0 failures, 0 skipped |
| `git diff --check -- leetcode-revision/firebase-sync.js leetcode-revision/backup-all.js leetcode-revision/auto-backup.js` | PASS: no whitespace errors; read-only inspection |

The initial `node --test ...` invocation failed because this environment's default `node` resolves to Bun, whose `node:test` shim rejected that runner invocation. Native Node was already installed and all final runs used it. An intermediate reload test failed because its mock kept two document runtimes/listeners alive; it was corrected to construct a fresh document with shared persisted storage, and passed. Neither issue was suppressed or skipped. The shared original regression test file was not edited; no outdated textual assertion currently fails.

Focused coverage exercises fresh/exact recovery, recovery quota/readback failures, malformed reads, duplicate identities, preservation of unrelated and newly added records, post-preview device/server edits, edits during transactions, exact-prior and absent-record server races, tied timestamps, mandatory restore history, oversized predecessors, partial server completion, rollback/incomplete rollback, failed conflict archives, preservation of over 100 distinct conflicts, offline/online retry, acknowledgement timing, pending edits during awaits, stale auth callbacks and reads, same-UID auth generations, switched-account writes, owner persistence/failure, complete history export, recovery export access, IndexedDB commit/abort/readback failure, and 20-version retention. Transaction callback replay is simulated; these adapters are not a Firestore emulator.

## App-owner coordination and remaining limits

- HTML owners must update cache-version query strings for the three changed assets on all loading pages. No HTML was edited in this task.
- Settings should expose the recovery API, exact `originals` inspection, and deliberate comparison/selection of divergent device/server/history versions. The current compatible importer consumes top-level arrays, so it does not automatically restore raw storage envelopes or replay all historical documents. Automatic consolidation remains inappropriate.
- Settings also needs an explicit account-switch/review flow or account-scoped local storage. Until then, automatic sync pauses for a different device owner. The first sign-in can bind previously unowned legacy storage, whose historical account cannot be inferred. This patch does not claim to determine ownership of legacy notes.
- App-side save failures that emit no event cannot always be observed by the sync script. Existing app save surfaces must continue reporting their own failures. The goals cloud-data listener performs an unguarded localStorage write; the sync layer now verifies the outcome, but app owners should guard that listener and retain truthful render/save feedback. No app-side files were changed.
- Browser localStorage has no atomic multi-key transaction or cross-tab compare-and-set. This repair rereads/checks values and preserves recovery originals, but cannot eliminate an inter-tab write between a check and set without cooperation from all app writers. Cross-store device/cloud restoration is intentionally not claimed atomic; partial completion is recoverable and reported.
- Browser-managed localStorage/IndexedDB can be cleared or evicted and cannot establish permanent storage or physical-disk durability. A verified local readback is not an externally verified backup. Recovery and conflict entries consume quota; a failure stops replacement rather than deleting old copies. Exported files must be independently checked and kept private.
- Signed-in full exports and restore previews require server reads and fail when unavailable; automatic local snapshots and signed-out device exports remain separate. No live Firebase connectivity, rules, real-account data, physical-device behavior, download completion, browser rendering, or deployment was tested or claimed. Other workers' content/UI verification remains separate.

## Independent review remediation — 2026-11-13

The independent review found two reproducible medium status/contract defects. Parent authorized a narrow follow-up limited to firebase-sync.js and tests/data-safety-sync.test.mjs (plus reports). Both are now fixed:

1. Equal-time divergent persisted/cloud versions retain the device version in delivered output, while both exact versions remain in the verified conflict archive. This matches the real concept-revision.js listener's strictly-newer merge policy and reports Conflicts, not a fictitious device-save failure. A production-listener test removes the adapter's unconditional writer; another test verifies that an actual concept-storage failure still reports Device save failed.
2. Terminal snapshot subscription errors invalidate server confirmation and persist by notebook kind. Unrelated snapshots, queued-write starts, successful transactions, and transaction failure/retry cannot clear the error. Dead-listener callbacks are ignored. A new auth/session setup creates replacement subscriptions and clears old errors; stale epoch/UID callbacks cannot contaminate it. Terminal rules/permission failures are not automatically retried; status explicitly requests refresh or sign-in to reconnect.

No restore guard, transaction history, conflict payload, account pinning, or offline retry behavior was removed. backup-all.js and auto-backup.js were not edited in this follow-up.

Four new executable tests were added first. Pre-fix sync run: 28 pass / 3 fail (the genuine storage-failure protection case already passed). Post-fix sync run: 31 pass / 0 fail. Full requested suite:

```sh
node --test leetcode-revision/tests/recall.test.mjs leetcode-revision/tests/data-safety-*.test.mjs leetcode-revision/tests/recovery-ui.test.mjs
```

Result: **77 passed, 0 failed, 0 skipped** (13 original + 55 safety + 9 recovery UI). Native Node syntax checking and scoped git diff --check also passed. Both original independent reproduction scripts were rerun: tied concept records retain device/view and exactly one conflict copy with Conflicts status; an unrelated healthy snapshot preserves the SQL subscription failure.

Final firebase-sync.js SHA-256: fb58b25160a17a381adbddb21ffdc7b9ac2ca747692360078b21b93673375917. The executable safety regressions retain the reproduction cases. The integrator owns HTML/cache references; its v4 references passed the full-suite cache check. No HTML, authentication, private data, Git state, publishing, or network writes were touched in this follow-up. Initial synthetic-only/live-SDK/storage/durability limitations remain.
