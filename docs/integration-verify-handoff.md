# Handoff — Verify & Land the Integration Branch

Everything from the polish + iteration + review-screen rounds is consolidated on one
branch: **`integration/polish+iteration`** (cut from `main`, all merges already
resolved, tree clean, no conflict markers). Your job: build it, run the functional
checks, and if green, land it on `main` and clean up. **Do not push** unless the user
asks.

## What's on the branch (13 logical changes)
```
fix: Hard rating no longer resets card progress
chore: remove dead quiz parser/storage functions
fix: multi-answer choice grading ignores order
fix: handle storage quota on quiz writes
fix: continue-reading picks most recently read doc
fix: robust highlight painting across elements
feat: persist and repaint highlights on reload
feat: move reading document bodies to IndexedDB
feat: self-rating for review questions via quiz engine
docs: note DB_VERSION bump requirement for new IDB stores
fix: don't resurrect a review session after completion
fix: keep the answer visible after undo
fix: allow undoing the final card's rating
```
One conflict was hand-resolved during integration: in `src/reading/pages/Reader.jsx`,
the inline multi-element paint fallback was dropped because that logic now lives in
`highlightAnchor.wrapRange`, with painting driven by `repaintHighlights` on a
`useEffect`. Re-confirm this path works (highlight checks below).

## Step 1 — Build
```
git checkout integration/polish+iteration
npm install        # if needed
npm run build      # MUST pass — this is the gate
```
(There is no test suite on this branch — vitest lives on `feat/anki-text-import`, not
here — so verification is build + manual.)

## Step 2 — Functional checks
**Flashcard**
- Rate a card **Hard** → `repetitions`/`interval` are kept, not reset; **Again** still resets.
- Finish a deck, go Home → **no** phantom "继续复习" card. Quit mid-deck → continue card shows.
- Undo a rating → the card stays flipped to its **answer**. Undo the **final** card from
  the done screen ("撤销上一张") → it returns, flipped, stats decremented.

**Quiz**
- A choice answer `AC` and `CA` both grade correct.
- A **review** question: reveal, self-rate 不会 → appears in the wrong-book and `due`
  rotation; 会了 → leaves the wrong-book.
- A large import doesn't throw (quota guard).

**Reading**
- Highlight text, fully reload the doc → marks **repaint** in the body; delete one →
  gone from body and sidebar; highlight across a paragraph/bold boundary → it paints.
- Import a multi-MB book → persists across reload; an existing localStorage doc
  migrates once and still opens; search returns results.
- "继续阅读" on Home points at the **most recently** read doc.

## Step 3 — Land on main (only if Step 1 & 2 pass)
```
git checkout main
git merge --ff-only integration/polish+iteration   # main is an ancestor → fast-forwards
```
Then delete the now-merged branches:
```
git branch -d polish/sm2-quiz-reading-fixes feat/reading-idb-bodies \
  feat/quiz-review-self-rating feat/reading-highlight-persist \
  polish/review-screen-fixes integration/polish+iteration
git branch -D feat/flashcard-storage-guard   # empty (no commits), force-delete
```
**Leave `feat/anki-text-import` alone** — Tasks 6–7 are still open there; it'll need a
rebase onto the new `main` later.

If the build or any check fails, stop, fix on the integration branch (one commit per
fix), and re-run — don't land a red branch on `main`.
