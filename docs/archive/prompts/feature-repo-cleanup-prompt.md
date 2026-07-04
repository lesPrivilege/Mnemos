# Implementation Prompt — Repo Cleanup: docs 歸檔 + 舊 prototype 收納 (self-contained)

You are working in the **Mnemos** repo. Housekeeping round: commit the pending
working-tree changes, archive delivered/superseded docs, tuck away consumed
design prototypes, remove one piece of flagged dead code. Nothing is deleted
from history — moves only, `git mv` so renames track.

**Branch:** work directly on `main` (housekeeping, no feature branch needed) —
but each commit must still pass `npm run check` before the next.

## Hard rules (from `CLAUDE.md`)

One logical change = one commit, `type: description`. Stage specific files —
especially here, where the working tree has unrelated pending edits. Never push.

## Commit 1 — `docs: sanitize atlas reading-module sample text`

The modified `design/handoff/current-state-atlas.html` is a user manual edit
(replaced reading-frame sample text with neutral content). Commit it as-is —
do NOT review, rewrite, or "improve" the content of this file; stage and
commit only.

## Commit 2 — `docs: update roadmap-maturity M1b progress`

Commit the pending `docs/roadmap-maturity.md` edits as-is.

## Commit 3 — `docs: add design brief v2, archive superseded briefs`

- Create `docs/archive/` with a one-paragraph `README.md`: "delivered
  implementation prompts and superseded briefs; kept for the workflow record,
  no longer active."
- Add (untracked → tracked): `docs/design-brief-m1b-v2.md` stays in `docs/`
  (active). `docs/design-brief-m1b-addendum.md` → `docs/archive/`
  (superseded by v2). `docs/design-brief-m1b.md` → `docs/archive/`.
- `docs/design-mindmap-brief.md` → `docs/archive/` (P0/P1 shipped; P2 folded
  into brief v2's forward-drawn pages).

## Commit 4 — `docs: archive delivered implementation prompts`

Move into `docs/archive/prompts/`: every `feature-*-prompt.md` (all delivered),
`polish-round*.md`, `integration-verify-handoff*.md`,
`iteration-implementation-prompt.md`, `import-ux-cleanup-prompt.md`,
`stage-release-verification.md`, and the `docs/superpowers/` directory (early
workflow artifacts). Untracked ones get added directly at the archive path.
Stays in `docs/` (active set): `roadmap-long-term.md`, `roadmap-maturity.md`,
`backup-format.md`, `design-tokens.md`, `design-brief-m1b-v2.md`, and this
cleanup prompt (archive it in the round's final commit instead).

## Commit 5 — `chore: archive consumed design prototypes`

`design/mnemos-v2.html`, `design/mnemos-v2-prototype.html`,
`design/v2-redesign/`, `design/activity-dashboard-brief.md` →
`design/archive/`. These were consumed by earlier rounds and are explicitly
out of scope for the current redesign (brief v2 says do not reference) —
moving them makes that structural. `design/handoff/` stays.

## Commit 6 — `chore: remove dead updateBookmark export, ignore .claude`

- Delete the unreferenced `updateBookmark` export in
  `src/reading/lib/bookmarks.js` (flagged by an earlier review; verify it is
  still unreferenced before removing).
- Add `.claude/` to `.gitignore` (local settings, not repo content).

## Final commit — `docs: archive repo-cleanup prompt`

Move this file itself to `docs/archive/prompts/`.

## Verify before finishing

`npm run check` green. `git status` clean except intentionally untracked
files. `ls docs/` shows only the five active docs + `archive/`. No source
file outside Commit 6's two touches was modified.
