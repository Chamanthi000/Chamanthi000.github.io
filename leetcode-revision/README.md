# Recall — Coding + SQL Revision Studio

A responsive GitHub Pages learning notebook for LeetCode coding and SQL interview preparation.

## Website
When GitHub Pages is enabled for the `main` branch, root folder, open:
https://chamanthi000.github.io/leetcode-revision/

**If this URL shows a 404**, confirm repository Settings → Pages → Build and deployment → Deploy from a branch → `main` → `/(root)`. Deployment has not yet been independently verified.

## Learning
- Switch between **Coding** and **SQL** with top navigation.
- Coding includes title/number suggestions from a public LeetCode catalog, difficulty, patterns, a time-complexity dropdown, space complexity, data structures, insight, approach, edge cases, and LeetCode links.
- SQL supports titles, difficulty, source platform, joins, CTEs, window functions, query text, insights, mistakes, and problem URLs. There is no universal SQL practice-problem numbering system, so enter the title manually.
- See saved problem counts by difficulty, patterns and problems per pattern, a 182-day green activity heatmap (newly saved problems), revision counts and due reviews.
- **Flashcards:** Reveal your notes and swipe left for Needs Practice or right for Confident. Desktop buttons and keyboard arrows also work. Each rating saves an ISO date-time revision event, mastery status and next review date.
- Tap **Revised** in the library or editor to record a review without changing confidence.
- Responsive editor and revision cards designed for iPhone and iPad portrait and landscape.

## Storage and privacy
Data is saved immediately to localStorage: coding in `recall-notes-v1` and SQL in `recall-sql-v1`.
For GitHub persistence, click **Sync** and enter a fine-grained token scoped to this repository with **Contents: read and write**. The browser holds the token in memory only for the current page session, and syncs to:
- `data/notes.json` (coding)
- `data/sql-notes.json` (SQL)

**This repository is public. Synced notes and SQL queries are publicly readable.** Use a private-repository backend if you require private notes. Avoid putting credentials or sensitive data in notes.

A public LeetCode catalog powers autocomplete; if that resource is unavailable, entering details manually still works. Problem counts are based on saved notes, not an authenticated LeetCode accepted-submission feed.
