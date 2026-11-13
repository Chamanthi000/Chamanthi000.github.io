# Recovery review app handoff — 2026-11-13

Changed goals.html, index.html, sql-pattern-guide.html; added recovery-review.js, tests/recovery-ui.test.mjs and tests/recovery-browser.test.cjs. Backup and sync modules are separate from this UI change.

Settings now exposes RecallBackupSafety.keys/read/download. A read-only exact-original comparison presents saved raw device storage, current raw storage, and separate saved server originals/private history via textContent and JSON escaping. No content is applied, replayed, cleared or consolidated. Closing clears the rendered private comparison, not underlying records. Downloads are described as requests, never verified physical files. All originals remain in their private browser storage unless the user deliberately downloads them.

An explicit different-device-owner panel explains automatic sync pause and offers separate device-original export, signed-in server-only export, and recovery review. It never resets owner markers or clears storage. Server-only export pins sessionToken across reads and discards results on account change. Signing out and returning to the original account remains the non-destructive resumption path; legacy unowned storage cannot establish historical ownership.

Goals cloud events now ignore unrelated categories, preserve the current other collection and envelope extras, catch storage reads/parse/write failures, verify readback, and retain the old in-memory view on failure with a persistent failure summary rather than success. Multi-key/cross-tab atomicity remains outside this focused change.

All existing loading pages cache-bust firebase-sync.js, backup-all.js, auto-backup.js to 20261113-data-safety-v4. New recovery asset cache-busted.

CI verification commands:
- node --test leetcode-revision/tests/recovery-ui.test.mjs
- node leetcode-revision/tests/recovery-browser.test.cjs (same Playwright module/browser env as dsa-real-content)

Verification: 9 new Node tests PASS, combined canonical14+reviewed data-safety55+new9=78 PASS with0fail/0skip. Real Chromium recovery suite uses actual goals HTML/scripts, intercepted requests, disposable synthetic originals and stub signed-in accessor; validates reload discovery/exact strings/inert markup/export-only/no record mutation/account race and no overflow at393x852/834x1194/1440x900. No live Firebase/private-user/physical-device verification.
