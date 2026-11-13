# Recall — Coding, SQL, and Goals & Habits

A mobile-first, local-first revision and goal-tracking app hosted on GitHub Pages.

**Live site:** https://chamanthi000.github.io/leetcode-revision/

## Revision workflow

- **Coding:** Save LeetCode problems with title/number suggestions, difficulty, patterns, complexity, notes, mistakes, solution links, flashcards, and review history.
- **SQL:** Track SQL interview questions, browse DataLemur and StrataScratch tutorials, review the SQL 50, and study 14 interview patterns with interactive recall prompts.
- **Data Structures:** All 11 topics have structured interview guides matching Arrays’ eight-chapter layout, with public reference content separate from editable private notes and individual recall ratings. The nine additional guides contain 170 operation entries, 99 fundamentals, 125 patterns with invariants and limitations, 119 executable Python templates, and 180 ordered practice entries. See [DSA guide maintenance](DSA_GUIDES.md).
- **Strings FAANG reference:** Eight independently collapsible learning chapters: 53 Python operations, 18 fundamentals, 33 patterns, 39 copyable Python templates and 44 interview problems. Navigation, copy controls, mobile layouts, and personal-note review are shared with the Arrays guide.
- **Complexity reference:** Pattern recognition, time complexity, and space complexity.
- **Goals & Habits:** Editable daily plans, habit streaks (daily/weekday/weekly), future to-dos, monthly goals, and a compact Settings panel for cloud sync and backups.

DSA Revision intentionally ends at **Union Find**. Older extra notebooks are hidden from the topic list, navigation, search and counts, but their private notes and sync/backup records are preserved. Refresh the website on each device to load this shared display rule; an already-open or offline page may still show an older version.

### Understanding progress numbers

- **Saved:** Records in your Coding or SQL notebook; saving a problem does **not** mean it was solved.
- **Solved:** Records explicitly marked with the "I solved this problem" checkbox or Solved button.
- **Revised:** Distinct saved problems with at least one recorded revision.
- **Total revisions:** All recorded practice sessions, including repeat reviews of the same problem.
- **Due for revision:** Only solved problems that have a scheduled review date on or before the current local date.
- **Practice garden:** Counts recorded revision sessions by day, not newly saved records.
- New solved problems are first scheduled for a review the following day.

### Pattern recall

Open a Data Structure notebook or the SQL pattern guide and choose **Need practice** or **I remembered**. These ratings save to your browser, keep a review history, and schedule another recall check in 1, 3, 7, or 14 days depending on progress.

## Data safety and privacy

- Coding problems, SQL problems, Data Structure notes, concept ratings, goals, and habits are saved to browser localStorage first.
- Optional **Google sign-in** privately syncs records between devices through Firebase Firestore. Firestore rules restrict access to each signed-in account. A blocked popup may fall back to redirect-based sign-in.
- Each edit is first saved in browser localStorage. With the **same Google account on every device**, Firebase then synchronizes Coding/SQL problems, data-structure notebooks (including Arrays), concept reviews, goals, habits, dated plans, future tasks, and monthly goals.
- Cloud writes now use Firestore transactions: stale or same-timestamp conflicting edits cannot silently overwrite a newer cloud version. Divergent local/cloud copies are kept in local conflict archives for review.
- **Private cloud version history:** on a successful update, the prior cloud record is retained periodically in a separate per-record history document under your signed-in account. Up to 12 historical versions per record are kept, subject to a size cap. These typed history documents are excluded from problem totals and never published to GitHub.
- The **Download cloud version history** button appears on Coding and Goals. This exports a private JSON of previous cloud versions. Keep this download in a personal, access-controlled location; it is a version-history archive, not the ordinary one-click full-account restore format.
- Failed cloud writes display a warning and retry after reconnection (or when the signed-in page is reopened). Browser persistence remains primary while offline; Firestore transactions require a live connection. Do **not** assume a pending edit has synced until the status confirms a cloud write.
- The Goals & Habits page's **Settings, sync & backups** panel has full JSON export of current data, guarded import, restore preview, and before-restore safety download.
- The normal restore path merges imported records instead of clearing unrelated records. Matching record IDs are replaced by the selected imported version after confirmation; inspect the preview.
- Automatic versions are retained in IndexedDB on that device (up to 20 snapshots). Periodically download a backup to a private location to protect against lost devices or browser data clearing.
- The public GitHub repository is for application source. **Do not put private notes, passwords, or a GitHub token in this public repository.** The obsolete public-GitHub notes-sync interface was removed.

**Notifications:** Browser reminders work while the Goals & Habits page is open. They are not reliable background push notifications when the page or browser is closed. Export upcoming deadlines to a calendar with alarms for offline reminders.


### How to keep every device aligned

1. On each iPhone, iPad, and desktop browser, open [Recall](https://chamanthi000.github.io/leetcode-revision/) and **sign in to the same Google email**. Verify the small signed-in email label. Different accounts do not automatically share notes.
2. Edit and save normally. **Saved on device** means only the local copy is confirmed; **Syncing to cloud** means the remote save is still pending; **Synced to private cloud** means Firebase acknowledged it. If offline, keep the local copy and reopen the site after reconnecting to sync.
3. Under **Goals & Habits → Settings, sync & backups**, use **Back up everything** periodically to download a full restorable JSON. **Download cloud history** gives separate older-version archives. Store files somewhere private outside the browser (iCloud Drive, private Google Drive, etc.).
4. If an unexpected version appears, check **Version conflict copies** before changing that record again. Recall does not promise automatic merging of two simultaneously edited versions of the same note; it preserves recoverable copies instead.
5. The public learning-guide code updates across all devices after GitHub Pages deploys. Personal notes are **not** stored in the public GitHub repository, and view-only preferences are not necessarily synced.

**Limits:** The website cannot guarantee instantaneous off-device saves while offline, or permanent survival of every failure scenario. Automatic IndexedDB snapshots live on the current device; private Firebase keeps the latest server copy plus bounded history when Google sign-in is connected. A downloaded external backup remains the best independent safety copy.

## Automated tests

Runs on pushes and pull requests via `.github/workflows/recall-regression.yml`:

```bash
node --test leetcode-revision/tests/recall.test.mjs
```

This test suite covers syntax, element references, solved/due counters, revision heatmap, weekly habits, concept-review persistence, backup restore merges, safe sync integration, and accessible controls. It additionally verifies the full Strings guide structure and nonduplicated private-note storage. The regression workflow also executes `python3 leetcode-revision/tests/strings-guide-validation.py` to compile and exercise Strings examples and algorithm templates.

The separate Chromium smoke test checks layout overflow and readable body text on 390px iPhone, 820px iPad, and 1280px desktop viewports. It also creates and reloads fixture problems, solved/revised records, SQL concept ratings, and weekly habits in an isolated test browser:

```bash
npm install --no-save playwright@1.56.1
npx playwright install --with-deps chromium
node leetcode-revision/tests/browser-smoke.mjs
```

Browser smoke tests run on Ubuntu 24.04 in CI. They do not replace testing on physical Safari or with a real signed-in Google account.

## Hosting

GitHub Pages deploys from the `main` branch of `Chamanthi000/Chamanthi000.github.io`. The site entry point is `leetcode-revision/index.html`. If an iPhone continues showing older counters shortly after deployment, open the site with a new query parameter (for example, `?v=latest#coding`) to avoid a cached HTML page.
