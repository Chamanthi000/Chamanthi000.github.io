# Recall — Coding, SQL, and Goals & Habits

A mobile-first, local-first revision and goal-tracking app hosted on GitHub Pages.

**Live site:** https://chamanthi000.github.io/leetcode-revision/

## Revision workflow

- **Coding:** Save LeetCode problems with title/number suggestions, difficulty, patterns, complexity, notes, mistakes, solution links, flashcards, and review history.
- **SQL:** Track SQL interview questions, browse DataLemur and StrataScratch tutorials, review the SQL 50, and study 14 interview patterns with interactive recall prompts.
- **Data Structures:** Editable notebooks with formatted reading mode and individual recall ratings.
- **Complexity reference:** Pattern recognition, time complexity, and space complexity.
- **Goals & Habits:** Editable daily plans, habit streaks (daily/weekday/weekly), future to-dos, monthly goals, and a compact Settings panel for cloud sync and backups.

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
- Failed cloud writes display a warning and automatically retry. If a remote record differs from an older local copy, a conflict archive is retained on that device for downloading and comparison.
- The Goals & Habits page's **Settings, sync & backups** panel has full JSON export, guarded import, restore preview, and before-restore safety download.
- The normal restore path merges imported records instead of clearing unrelated records. Matching record IDs are replaced by the selected imported version after confirmation; inspect the preview.
- Automatic versions are retained in IndexedDB on that device (up to 20 snapshots). Periodically download a backup to a private location to protect against lost devices or browser data clearing.
- The public GitHub repository is for application source. **Do not put private notes, passwords, or a GitHub token in this public repository.** The obsolete public-GitHub notes-sync interface was removed.

**Notifications:** Browser reminders work while the Goals & Habits page is open. They are not reliable background push notifications when the page or browser is closed. Export upcoming deadlines to a calendar with alarms for offline reminders.

## Automated tests

Runs on pushes and pull requests via `.github/workflows/recall-regression.yml`:

```bash
node --test leetcode-revision/tests/recall.test.mjs
```

This test suite covers syntax, element references, solved/due counters, revision heatmap, weekly habits, concept-review persistence, backup restore merges, safe sync integration, and accessible controls.

The separate Chromium smoke test checks layout overflow and readable body text on 390px iPhone, 820px iPad, and 1280px desktop viewports. It also creates and reloads fixture problems, solved/revised records, SQL concept ratings, and weekly habits in an isolated test browser:

```bash
npm install --no-save playwright@1.56.1
npx playwright install --with-deps chromium
node leetcode-revision/tests/browser-smoke.mjs
```

Browser smoke tests run on Ubuntu 24.04 in CI. They do not replace testing on physical Safari or with a real signed-in Google account.

## Hosting

GitHub Pages deploys from the `main` branch of `Chamanthi000/Chamanthi000.github.io`. The site entry point is `leetcode-revision/index.html`. If an iPhone continues showing older counters shortly after deployment, open the site with a new query parameter (for example, `?v=latest#coding`) to avoid a cached HTML page.
