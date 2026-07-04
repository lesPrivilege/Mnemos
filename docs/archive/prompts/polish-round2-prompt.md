# Implementation Prompt — Mnemos Polish, Round 2 (Review screen)

Self-contained. Three defects in the flashcard **review** experience — the
highest-traffic screen. Each confirmed against the current code on the integration
branch. Files: `src/pages/Review.jsx`, `src/components/ReviewCard.jsx`.

## Hard rules (from `CLAUDE.md`)
Read the file before editing; minimal incremental edits. One logical change = one
commit, `type: description`. Build (`npm run build`) must pass before each commit.
Stage specific files only. Never push. Work on a branch.

## 1. `fix: don't resurrect a review session after completion`
**Bug:** the mount `useEffect` in `Review.jsx` returns a cleanup that calls
`saveReviewSession(...)` whenever `cards.length > 0`. `cards` is the *initial* due
list (closure constant), so it's truthy for the whole session. When the user
**finishes** a deck (`dueCards` becomes `[]`, the separate effect clears the stored
session) and then navigates away, the cleanup runs and **re-saves a session** —
producing a phantom "继续复习" card on Home that opens into an empty review.

**Fix:** track completion and skip the save when complete. Add a ref (e.g.
`completedRef = useRef(false)`); set it `true` where the last card is rated
(`setDueCards([])`) and in the "clear on complete" effect. In the cleanup, guard:
`if (!completedRef.current && cards.length > 0) saveReviewSession(...)`. Verify:
finish a deck, go Home → no continue card; quit mid-deck → continue card still shows.

## 2. `fix: keep the answer visible after undo`
**Bug:** `ReviewCard.jsx` has `useEffect(() => { onFlip?.(false) }, [card.id])`,
force-resetting the flip whenever the card changes. On **undo**, `handleUndo` steps
`currentIndex` back and calls `setFlipped(true)` to re-show the answer — but the card
id change re-fires ReviewCard's effect, which immediately flips it back to the front.
The undone card shows its question instead of the answer the user was reconsidering.

**Fix:** remove the flip-reset `useEffect` from `ReviewCard.jsx` and let the parent
own flip state — `Review.jsx` already sets `flipped` on every transition (mount and
rate → `false`, undo → `true`), so no card-change path is left uncovered. Confirm a
normal advance still shows the front, and undo shows the back.

## 3. `fix: allow undoing the final card's rating`
**Bug:** rating the last card sets `dueCards = []` and renders the done screen, which
has no undo affordance; the keyboard Ctrl/Cmd+Z path calls `handleUndo`, but with
`dueCards` empty it restores the SM-2 data yet can't bring the card back into view.
Note `lastRef.current.removedCard` is already captured for exactly this but is
currently unused.

**Fix:** in `handleUndo`, when `dueCards.length === 0` and `last.removedCard` exists,
rebuild a one-card queue: `setDueCards([last.removedCard])`, `setCurrentIndex(0)`,
`setFlipped(true)` (in addition to the existing SM-2 restore + stats rollback). Add a
small "撤销上一张" button on the done screen, shown only when `lastRef.current` is set,
wired to `handleUndo`. Verify: rate the last card, undo from the done screen → the
card returns flipped to its answer with stats decremented.

## Verification
`npm run build` green after each commit. Manual: the three scenarios above, plus a
full normal review run (advance, rate, complete) to confirm no regression in flip or
progress behaviour.

## Out of scope (note, don't implement)
The import flows use native `alert()` (`pages/Import.jsx`, `QuizHomeContent.jsx`,
`reading/CollectionDetail.jsx`) while the Reader has a nicer toast. Converting those
to a shared toast is a worthwhile but larger consistency pass — leave for its own round.
