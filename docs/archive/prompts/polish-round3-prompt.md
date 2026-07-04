# Implementation Prompt — Mnemos Polish, Round 3 (self-contained)

You are working in the **Mnemos** repo (Capacitor + React SRS flashcard / quiz /
reading app). This round targets defects found in a full architecture/logic review.
Every claim below was verified against the code on `integration/polish+iteration`.

**Baseline:** land `integration/polish+iteration` on `main` first (see
`docs/integration-verify-handoff.md`), then cut one branch per item off `main`.

## Hard rules (from `CLAUDE.md`)

1. **Read the file before editing.** Minimal incremental edits; match existing style.
2. **One logical change = one commit**, message `type: description`
   (feat / fix / tweak / chore / refactor). Each commit must build alone.
3. **Commit only after `npm run build` passes.** Don't batch.
4. **Stage specific files only** — no `git add -A` / `git add .`. **Never push.**
5. **Low coupling:** storage namespaces stay isolated (`mnemos-*`, `examprep-*`,
   `reading-*`). No new cross-module imports except at the page level
   (`Import.jsx` / `Settings.jsx` already import all three modules — that's the
   permitted integration point).

## Data-safety rules (items 1 and 5 touch persisted data)

- Never destroy existing user data. Migrations/format changes must be one-time,
  idempotent, guarded.
- Read old → write new → only then remove old. On write failure keep the old copy
  and surface a warning.
- New backup file formats must still accept every old format.

---

## Item 1 — Backup/restore round-trip is broken (P0, data loss)
**Branch:** `fix/backup-restore-roundtrip` — three commits.

Settings offers four export buttons, but restore is broken for three of the four.
Verified defects:

**(a) Reading document bodies are silently missing from every backup.**
Doc bodies moved to IndexedDB (`reading-doc-bodies` store, `src/lib/idb.js`), but
`exportReadingData()` in `src/reading/lib/backup.js` only exports the six
localStorage keys in `ALL_KEYS`. A "仅导出阅读" or "完整备份" file contains document
metadata with **no content**; restoring on a fresh device yields empty documents
(`getDocumentContent` falls back to the long-gone `doc.content`).

*Fix:* make `exportReadingData()` async: iterate `getDocuments()`, gather bodies via
`getDocumentContent(id)`, include as `data.bodies = { [docId]: content }`.
`importReadingData` / `mergeReadingData` become async too: write bodies back with
`idbSet(BODY_STORE, id, body)` and ensure each restored doc has `hasBody: true` and
no embedded `content`. Update the callers in `Settings.jsx` (`handleExportReading`,
`handleExportAll`) and `Import.jsx` to await. Old backup files without `bodies` must
still import (metadata-only, no crash).
Commit: `fix: include reading doc bodies in backup export/import`

**(b) Backup restore routing in `Import.jsx` is broken three ways.**
Verified against the code:
- `handleJsonBackupFile` (the flashcard-backup file handler) is **defined but never
  wired to any input** — dead code. The json tab's tap-to-select input uses
  `handleJsonFile`, which only runs `parseQuestionsJson` with no backup fallback. On
  a phone (no drag-and-drop) there is **no way to restore even a flashcard backup**.
- The dropzone (`handleFileDrop`) does have a `parseImportData` fallback, but it's
  only reached when `parseQuestionsJson` **throws** — and it only throws on invalid
  JSON. Any valid-JSON backup file parses "successfully" into 0 questions and shows
  an empty quiz preview instead. The fallback is unreachable for its purpose.
- Even if a full backup (`{ version, exportedAt, flashcard, quiz, reading }`)
  reached `parseImportData`, `normalizeData` (`src/lib/storage.js`) requires and
  returns **only** top-level `{decks, cards}` — so the `jsonPreviewData.quiz` /
  `jsonPreviewData.reading` branches in `handleConfirmJsonBackup` are unreachable
  dead code.

*Fix:* add a single shape-detection function used by both the file input and the
dropzone (e.g. `detectImportKind(parsedJson)` in `Import.jsx`): question array /
single question → quiz-question preview; `{questions, ...}` quiz backup → (c);
`{decks, cards}` → flashcard-backup preview; `{version, flashcard, ...}` →
full-backup preview. For full backups keep `flashcard`/`quiz`/`reading` intact in
preview state (normalize only the flashcard part), show per-module counts, and on
confirm run all three restores — flashcard `importData`/`mergeData`, quiz
`importQuizData`/`mergeQuizData`, reading `importReadingData`/`mergeReadingData`
(async, from (a)). Delete the dead `handleJsonBackupFile` or wire the new routing
through it. Merge mode must not lose the quiz/reading payloads.
Commit: `fix: route and restore all backup file shapes in Import`

**(c) A quiz-only backup has no restore path.**
`exportQuizData` produces `{ questions, progress, starred }`, but
`parseQuestionsJson` accepts only a question array / single question — dropping the
file in Import shows an empty preview, and nothing ever restores `progress`.
Additionally `mergeImportData` (`src/quiz/lib/storage.js`) ignores `progress`
entirely.

*Fix:* detect the `{questions, progress, starred}` shape in the Import parse chain →
route to a quiz-backup preview (counts of questions/progress/starred, merge/replace
toggle). Merge: `addQuestions` + merge starred (existing behavior) + merge progress
(copy entries whose id has no existing progress; keep local on conflict). Replace:
existing `importData`.
Commit: `fix: restore quiz backups including practice progress`

**Verify:** full round-trip — create data in all three modules incl. a highlighted
reading doc → 完整备份 → clear all three modules from Settings → import the file
(replace) → decks/cards/SM-2 state, questions+progress+starred, collections/docs
**with readable bodies**, highlights/bookmarks all back. Repeat with merge mode into
non-empty data. Import an old-format flashcard-only backup to confirm no regression.

---

## Item 2 — Again-rated cards vanish from the session (P1, core SRS behavior)
**Branch:** `feat/review-again-requeue`

**Problem:** `sm2()` with quality=1 sets `interval=1` → `dueDate` tomorrow, and
`Review.jsx` simply advances. A failed card is gone until tomorrow — the user rates
"重来" and never gets to retry it. In any serious SRS, failed cards re-enter the
current session (relearning step).

**Fix (session-local requeue, no schema change):** in `handleRate`, when
`quality === 1`, append the card to the end of the queue:
`setDueCards(prev => [...prev, card])` while still advancing `currentIndex`.
The SM-2 write stays as-is (each failure applies its E-penalty). The session
completes only when the queue is exhausted, so every card ends the session with a
passing rating. Notes:
- Progress denominator (`dueCards.length`) grows on failure — acceptable, it reflects
  remaining work.
- Stats keep counting per rating event (again can exceed card count; correct-rate
  formula unchanged).
- **Undo:** record `requeued: true` in `lastRef` for Again ratings; `handleUndo` must
  then also drop the appended copy (`setDueCards(prev => prev.slice(0, -1))`) before
  stepping back. Verify undo of both Again and non-Again ratings.
- Daily-limit interaction: requeued copies are session-local, they don't re-enter
  `getDueCards`; no change needed.

Commit: `feat: requeue Again-rated cards to the end of the session`

**Second (small) commit — stale continue-card count:** the unmount cleanup saves
`dueCount: cards.length` (mount-time closure) — quit after rating 15/20 and Home
says "20 张待复习". Track rated count in a ref and save the remaining count.
Commit: `fix: continue-review card shows remaining count`

**Verify:** fail two cards mid-deck → they reappear at the end and the session only
finishes after they pass; undo an Again rating → queue shrinks back; quit mid-deck →
continue card shows the true remaining count.

---

## Item 3 — Multi-answer choice questions are unanswerable (P1)
**Branch:** `fix/quiz-multi-answer-select`

**Problem:** the engine grades multi-letter answers order-insensitively
(`submitAnswer` norms `expected`/`given` to sorted letter sets — see
`src/quiz/lib/quizEngine.js`), but `QuizPage.jsx` is strictly single-select:
`selectedAnswer` holds one letter, clicking an option replaces it, and the
post-submit highlight uses `letter === currentQuestion.answer`. For a question with
`answer: "ABD"` the user can never submit a correct answer, and the correct-answer
highlight never shows.

**Fix:** in `QuizPage.jsx`, detect multi-answer via
`(q.answer || '').replace(/[^A-Za-z]/g, '').length > 1`. For those questions:
selection state becomes a Set of letters toggled by tap; submit sends the sorted
joined string; option highlighting checks membership in the answer's letter set
(apply set-membership for single-answer too — it's strictly more correct); show a
small "多选" tag next to the "选择 · CHOICE" corner label; submit button disabled
until ≥1 selected. Single-answer interaction must remain identical (tap = select one).

**Verify:** seed a multi-answer question — selecting the right letters in any order
grades correct, partial selection grades wrong and highlights all correct options;
single-answer flow unchanged; `npm run build` green.

---

## Item 4 — Three conflicting definitions of "错题" (P1, small)
**Branch:** `refactor/wrong-book-single-definition`

**Problem:** the wrong-book membership test exists in three incompatible versions:
- `quizEngine.getQuizQuestions` mode `'wrong'`: `progress.status === 'wrong'`
  (last attempt wrong);
- `quizEngine.getWrongQuestions` (Wrong.jsx page): `wrong_count > 0 && rightStreak < 2`
  (documented intent: leave after 2 straight correct);
- `QuizHomeContent` wrong counter: `status === 'wrong' && wrongStreak > 0`.

So the home count, the 错题 practice mode, and the 错题本 page each show different
sets: a question answered wrong then right once disappears from practice mode but
still sits in the wrong book.

**Fix:** export a single `isInWrongBook(prog)` from `quizEngine.js` implementing the
documented rule (`prog?.wrong_count > 0 && (prog.rightStreak || 0) < 2`) and use it
in all three places. Note in the commit body that 错题 practice mode now keeps
recovering questions until two consecutive correct answers.

Commit: `refactor: single wrong-book membership rule across quiz module`

---

## Item 5 — Stats integrity fixes (P2)
**Branch:** `fix/stats-integrity` — three commits.

**(a) Activity streak can't cross a month boundary.** `getActivityDashboard`
(`src/lib/activity.js`) builds `daysByDate` from `monthDays()` — **1st of the current
month to today** — and `getStreak` walks back through `activeDates` built from those
days only. On July 2 the streak maxes out at 2 regardless of June activity. *Fix:*
build the activity-date set over a trailing 90-day window (the review log and reading
sessions already retain 90 days; quiz progress fallback contributes what it has) and
feed that to `getStreak`; keep the month-scoped `days` array for the chart/totals.
Commit: `fix: activity streak counts across month boundaries`

**(b) Killed reading sessions inflate minutes.** `startSession`
(`src/reading/lib/stats.js`) finalizes a persisted session from a previous app kill
with `minutesRead` computed up to **now** — kill the app in the reader, reopen three
days later, and ~4300 minutes land in the stats. *Fix:* add a heartbeat — persist
`lastActiveAt` on the session (update from the Reader's scroll handler, throttled,
after (c)); `finalizeSession` ends the session at
`min(Date.now(), lastActiveAt + 5min)`; additionally cap a single session's
`minutesRead` (e.g. 180) as belt-and-braces.
Commit: `fix: cap recovered reading sessions at last activity`

**(c) Reader writes localStorage on every scroll frame.** `handleScroll` in
`src/reading/pages/Reader.jsx` calls `updateReadingProgress` (full parse+stringify of
`reading-documents`) per scroll event and re-fires `markDocCompleted()` continuously
at 100%. *Fix:* keep `setScrollPct` live but throttle the persistence to ~1/second
(trailing write) and flush on unmount; guard completion with a per-mount ref so it
fires once. This is also where the (b) heartbeat write belongs — same throttled tick.
Commit: `fix: throttle reading progress persistence`

**Verify:** streak spans a simulated month boundary (temporarily seed log entries);
kill/reopen reader → sane minutes; scrolling stays smooth and progress still restores
after reload; doc completion increments once.

---

## Item 6 — Replace native alert/confirm with shared toast + confirm (P2)
**Branch:** `refactor/shared-dialogs` — deferred from round 2, now in scope.

**Problem:** ~30 call sites use blocking native `alert()`/`confirm()` (Import.jsx,
DeckDetail, FlashcardHomeContent, QuizHomeContent, QuizPage, QuizReview, Wrong,
Starred, SetDetail, reading CollectionDetail/useReadingHome, and `alert` inside
`src/lib/storage.js:saveData`), while Review.jsx and Reader.jsx each have their own
inline toast. Inconsistent, ugly in the WebView, and `alert` in a storage lib is a
layering smell.

**Fix:**
1. Extract the existing toast pattern (Review/Reader) into a shared component/hook
   (e.g. `src/components/Toast.jsx` with a `useToast()` hook) and a
   `ConfirmSheet`/`ConfirmDialog` component matching the app's visual language
   (settings-card styling, danger tone for destructive actions). Convert Review.jsx
   and Reader.jsx to it first (behavior identical).
2. Convert call sites module by module (one commit per module: flashcard pages, quiz
   pages, reading pages, Import). `confirm(...)` → ConfirmSheet with explicit
   destructive copy; `alert(...)` → toast (info/success) or inline error note.
3. **Quota errors must reach the user:** `saveQuestions`/`saveProgress`
   (`src/quiz/lib/storage.js`) only `console.warn` on quota, yet `addQuestions`
   still reports "导入完成！新增: N" — a full device shows success while saving
   nothing. Make the save helpers return success/failure (and add the missing
   quota guard to `saveStarred`), propagate from `addQuestions`, and show an error
   toast instead of the success message. Move the `alert` out of
   `src/lib/storage.js:saveData` the same way (return status; callers toast).

**Verify:** every converted flow still completes (import, deletes with confirm,
resets); simulate quota (fill localStorage in devtools) → import reports failure.

---

## Suggested order

1 (data loss) → 2 (core SRS) → 3 → 4 → 5 → 6. Items are independent; keep branches
separately mergeable.

## Design notes — decide, don't silently implement

- **"全部复习" (cram) writes SM-2** for non-due cards (`Review.jsx` `reviewAll`),
  so cramming reshuffles the real schedule. Anki's cram mode doesn't. If this is
  unwanted, a follow-up could skip SM-2 writes (and review-log entries) when
  `reviewAll` is set — ask the user before changing it.
- **SM-2 Easy gives no interval benefit over Good** for the first two repetitions
  (both 1d then 6d; only E-factor differs). An Anki-style easy bonus / 4-day first
  interval is a possible tweak — out of scope, needs a product decision.
- `Import.jsx` is 623 lines with four inline preview screens — worth splitting into
  per-tab components in a future refactor round; don't mix into item 1 beyond what
  the fixes require.
