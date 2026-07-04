# Handoff — Verify & Land Polish Round 3

Six branches off `main`, all building green individually. Your job: consolidate them
on one integration branch, build, run the functional checks, and if green, land on
`main` and clean up. **Do not push** unless the user asks.

## Branches (merge in this order)

```
fix/backup-restore-roundtrip           2 commits
feat/review-again-requeue              1 commit
fix/quiz-multi-answer-select           1 commit
refactor/wrong-book-single-definition  1 commit
fix/stats-integrity                    3 commits
refactor/shared-dialogs                6 commits   ← merge LAST
```

`refactor/shared-dialogs` goes last because it touches the most files and overlaps
with earlier branches. Expected conflict hotspots:
- `src/pages/Import.jsx` — backup-roundtrip rewrote the parse/routing chain;
  shared-dialogs converted its alert/confirm calls. Resolve by keeping the new
  routing logic with toast/confirm calls layered on top.
- `src/pages/QuizPage.jsx` — multi-answer select vs dialog conversion.
- `src/pages/QuizHomeContent.jsx` — wrong-book definition vs dialog conversion.
Resolve conflicts by hand; no conflict markers may remain.

## Step 1 — Integrate

```
git checkout main && git checkout -b integration/polish-round3
git merge --no-ff <branch>   # in the order above, resolving as needed
npm run build                # after EVERY merge, not just at the end
```

## Step 2 — Static checks

- `grep -rn "alert(\|confirm(" src/` → only the documented `window.confirm`
  backward-compat fallback in `useReadingHome.js` may remain; nothing else.
- `grep -rn "<<<<<<<\|>>>>>>>" src/` → empty.
- **Open item from round 3 planning:** confirm quiz-backup **progress restore**
  made it in — importing a `{questions, progress, starred}` file must restore
  progress (merge: copy entries with no local progress). If it was dropped from
  `fix/backup-restore-roundtrip`, implement it now as one commit on the
  integration branch: `fix: restore quiz backup practice progress`.

## Step 3 — Functional checks (dev server or device build)

**Backup round-trip (P0 — the critical one):**
1. Seed all three modules: a deck with reviewed cards, a quiz subject with some
   attempts + a starred question, a reading collection with a doc + highlight.
2. Settings → 完整备份. Inspect the JSON: reading section must contain a `bodies`
   map with document content.
3. Clear all three modules from Settings. Import the backup via the Import page
   **file picker (tap, not drag)** → full-backup preview with per-module counts →
   confirm (replace).
4. Verify: cards + SM-2 state back; questions + progress + starred back (错题/进度
   counts non-zero); reading doc opens **with content** and highlight repaints.
5. Repeat import in merge mode into non-empty data — no duplicates, nothing lost.
6. Import an old-format flashcard-only backup (`{decks, cards}`) — still works.

**Review requeue:** start a review, rate two cards 重来 → they reappear at the end;
session completes only after they pass; undo an Again rating → appended copy
removed; quit mid-deck → Home continue-card shows remaining (not initial) count.

**Multi-answer quiz:** a question with `answer: "AB"` accepts {B,A} as correct,
partial selection grades wrong, all correct options highlight after submit;
single-answer questions behave exactly as before.

**Wrong book consistency:** answer a question wrong, then right once → it must
appear/disappear consistently in all three places: home 错题 count, 错题 practice
mode, and the Wrong page (should still be present in all three until 2 straight
correct).

**Stats:** reader scrolling smooth (no per-frame jank), progress restores after
reload, doc completion counts once; kill app in reader, reopen → reading minutes
sane (≤ cap), not inflated by the gap.

**Dialogs:** spot-check one destructive flow per module (deck delete, subject
delete, doc delete) → ConfirmSheet with danger tone, original 中文 copy preserved,
cancel path works; import success/failure paths show toasts, no native dialogs.

## Step 4 — Land & clean up

If everything is green:
```
git checkout main
git merge --no-ff integration/polish-round3
npm run build
git branch -d integration/polish-round3 \
  fix/backup-restore-roundtrip feat/review-again-requeue \
  fix/quiz-multi-answer-select refactor/wrong-book-single-definition \
  fix/stats-integrity refactor/shared-dialogs
```
Do not push. Report: merge conflicts encountered and how resolved, any check that
failed, and whether the quiz-progress-restore gap (Step 2) needed a new commit.
