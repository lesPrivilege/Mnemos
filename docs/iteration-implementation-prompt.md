# Implementation Prompt — Mnemos Iteration Pass (self-contained)

You are working in the **Mnemos** repo (Capacitor + React SRS flashcard / quiz /
reading app). This pass implements the larger feature/architecture items deferred
from the polish pass. They are bigger and riskier than the polish fixes — several
touch persisted data — so treat each numbered item as its own branch + review unit.
This prompt is self-contained; it does not depend on any external planning docs.

## Hard rules (from `CLAUDE.md`)

1. **Read the file before editing.** Minimal incremental edits; match existing style.
2. **One logical change = one commit.** A multi-commit feature is fine, but each
   commit must build and stand alone.
3. **Commit message:** `type: description` (feat / fix / tweak / chore / refactor).
4. **Commit only after `npm run build` passes.** Build is the gate; don't batch.
5. **Stage specific files only** — no `git add -A` / `git add .`.
6. **Never push.** Local commits only. **One branch per item below** (off `main`),
   so the modules stay independently mergeable.
7. **Low coupling is a requirement.** Storage namespaces stay isolated
   (`mnemos-*`, `examprep-*`, `reading-*`). Do not add cross-module imports. The
   *only* permitted shared new code is a generic, dependency-free IndexedDB key-value
   helper at `src/lib/idb.js` (see item 2) — generic enough that each module owns its
   own store names and never reaches into another's data.

## Data-safety rules (apply to every item that migrates storage)
- Never destroy existing user data. Migrations must be one-time, idempotent, and
  guarded (detect "already migrated" and skip).
- Read old → write new → only then remove old, in that order. If a write fails
  (quota / IndexedDB unavailable), keep the old copy and surface a warning.
- Provide a graceful fallback when IndexedDB is unavailable (Capacitor WebView has it,
  but code defensively): fall back to the existing localStorage path.

---

## Item 1 — Reading: persist & repaint highlights on reload  (highest value, do first)
**Branch:** `feat/reading-highlight-persist`
**Problem:** highlights are painted only at creation time. On reload,
`getHighlightsByDoc` repopulates the sidebar but the document body is never re-marked,
so the colored text disappears until re-highlighted — the feature reads as broken.

**Spec**
- **Anchor model** (`src/reading/lib/highlights.js`): in `addHighlight`, also store a
  robust anchor. Compute and persist `textOffset` (character index of the selection
  start within the document's rendered plain text) and `length`. Keep `selectedText`
  + `contextSnippet` as a fallback anchor (nth-occurrence match) if the offset drifts
  after a re-render. Existing highlights without these fields must still work via the
  fallback — don't break old data.
- **Repaint** (new `src/reading/lib/highlightAnchor.js` + `Reader.jsx`): after
  `renderDoc` sets the container HTML, call `repaintHighlights(container, highlights)`:
  for each highlight, resolve a DOM `Range` from `textOffset`/`length` (walk text
  nodes accumulating length), else fall back to locating `selectedText` by occurrence.
  Wrap the range in `<mark data-hl-id="…">` reusing the per-text-node TreeWalker
  approach already in `Reader.jsx` (so multi-element ranges paint too).
- **Idempotency:** before repainting, remove any existing `mark[data-hl-id]` (unwrap),
  or guard so a highlight is never double-wrapped on re-render.
- **Delete:** deleting a highlight unwraps its `<mark data-hl-id>` from the DOM, not
  just the sidebar.
- **Files:** `reading/lib/highlights.js`, new `reading/lib/highlightAnchor.js`,
  `reading/pages/Reader.jsx`.

---

## Item 2 — Reading: move document bodies to IndexedDB  (biggest change)
**Branch:** `feat/reading-idb-bodies`  · do **after** item 1.
**Problem:** full document `content` is stored in `reading-documents` in localStorage.
A few large books exceed the ~5MB origin quota; `storageUtils.save` then warns and
**silently drops the write** — imported books or progress vanish with no error.

**Spec**
- **Generic helper** `src/lib/idb.js`: a tiny Promise-based key-value wrapper over
  IndexedDB (one DB, a store name passed in). No external dependencies. `get(store,
  key)`, `set(store, key, val)`, `del(store, key)`, `keys(store)`. This is the one
  shared piece allowed by the coupling rule.
- **Split metadata vs body** (`reading/lib/storage.js`): keep metadata (id,
  collectionId, title, format, createdAt, lastReadAt, scrollPct) in localStorage
  `reading-documents`. Store `content` in IndexedDB store `reading-doc-bodies` keyed
  by doc id. `getDocument` stays synchronous for metadata; add async
  `getDocumentContent(id)`. `addDocument` writes metadata sync + body async;
  `deleteDocument` / `deleteCollection` also delete bodies.
- **Migration:** on reading-module init, detect documents whose metadata still embeds
  `content`, move each body to IndexedDB, then strip `content` from the localStorage
  record. One-time, guarded, idempotent.
- **Ripple:** `Reader.jsx` and `reading/lib/search.js` must load bodies via the async
  API (`searchDocuments` becomes async — update its callers to await). Keep the 300ms
  debounce; consider a small in-memory content cache to avoid re-reading IDB per query.
- **Fallback:** if IndexedDB is unavailable, retain the current localStorage-embedded
  path so nothing breaks.

---

## Item 3 — Quiz: self-rating for review-type questions  (high value)
**Branch:** `feat/quiz-review-self-rating`
**Problem:** `submitAnswer` returns `correct: null` for `type: 'review'` (self-graded),
so these questions never update status and never enter the wrong-book or due rotation.
Open-ended study questions are effectively untracked.

**Spec**
- **`quizEngine.js`:** stop auto-recording review questions on reveal. `submitAnswer`
  for `type: 'review'` should return the reference answer/explanation but **not** call
  `recordAttempt` with null. Recording happens on the user's self-rating.
- **`QuizPage.jsx`:** for review questions, after revealing the reference answer, show
  two buttons — 会了 / 不会 — calling `markQuestion(id, true | false)` (the existing
  `recordAttempt` path). Then they flow into `wrong` and `due` modes exactly like
  choice questions (`getWrongQuestions` / `isDueForReview` already key off status).
- **Files:** `quiz/lib/quizEngine.js`, `pages/QuizPage.jsx`. Keep it inside the quiz
  module — no flashcard SRS imports.

---

## Item 4 — Flashcard: storage durability  (smaller; quick win)
**Branch:** `feat/flashcard-storage-guard`
**Problem:** `src/lib/storage.js` loads and rewrites the whole `cards` array on every
review with no quota guard (unlike `reviewLog.js`). Cards are small, so a full IDB
migration is not yet warranted — just make writes safe.

**Spec**
- Wrap the localStorage writes in `src/lib/storage.js` in a `QuotaExceededError`
  guard mirroring `reviewLog.js` (warn / don't corrupt state; re-throw other errors).
- *Optional, only if decks are already large:* migrate card bodies to IndexedDB via
  the same `src/lib/idb.js` helper from item 2, store `mnemos-card-bodies`. Keep this
  behind its own commit and skip unless there's a demonstrated quota problem.

---

## Optional refinements (do only if time remains; each its own commit)
- **Quiz due ladder by streak** (`quizEngine.js` `isDueForReview`): index the interval
  ladder by `wrongStreak` rather than raw `attempts`, so well-known items graduate out.
  Keep it self-contained — do **not** adopt the flashcard SM-2.

## Out of scope (deferred until the mindmap code is on a branch)
- Mindmap polish, the shared `src/lib/cardStats.js` mastery helper, and the richer
  `mastery()` model (EF/reps-weighted). These only make sense once `src/mindmap/`
  exists in the tree. Leave them for a later pass.

## Verification
- After each commit: `npm run build` passes.
- Item 1: highlight text, fully reload the app/doc — the marks reappear in the body;
  delete one and it disappears from both body and sidebar; a pre-existing (no-offset)
  highlight still repaints via the fallback.
- Item 2: import a large book (multi-MB), confirm it persists across reload; existing
  localStorage docs migrate once and still open; search returns results; with
  IndexedDB disabled the app still works.
- Item 3: answer a review question, self-rate 不会, confirm it appears in the
  wrong-book and resurfaces in `due` mode; 会了 removes it from the wrong-book.
- Item 4: writing under quota pressure warns instead of throwing; no data loss.
- End per branch: `git log --oneline` shows clean commits, build green, and the branch
  touches only its module's files (plus `src/lib/idb.js` for items 1-2/4 as noted).

If the code has drifted from any description, prefer the code reality, make the
minimal correct change, and note the deviation in the commit body.
