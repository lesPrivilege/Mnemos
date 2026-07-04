# Implementation Prompt — SRS Kernel: Learning Steps + Leech Handling (self-contained)

You are working in the **Mnemos** repo. This round upgrades the flashcard SRS core
toward mature-SRS behavior (Anki-like), while deliberately **keeping day-granularity
scheduling** — no minute-level dueAt, no card state machine, no data migration.
Everything is additive fields with defaults.

**Branch:** `feat/srs-learning-steps` off `main`.

## Hard rules (from `CLAUDE.md`)

Read files before editing; minimal incremental edits. One logical change = one
commit, `type: description`; `npm run build` green before each commit. Stage
specific files only. Never push.

## Data-safety rules

- New card fields are **optional with defaults** (`lapses ?? 0`,
  `suspended ?? false`, `leech ?? false`) — old cards must work untouched, exactly
  like `starred ?? false` is handled today in `src/lib/storage.js`.
- Backup import (`mergeData`) must carry the new fields through with the same
  `??` defaults.

## Context (read first)

- `src/lib/sm2.js` — SM-2; quality Again=1/Hard=2/Good=4/Easy=5; Again resets reps,
  interval 1.
- `src/pages/Review.jsx` — session queue; Again already requeues the card to the
  **end** of the session queue (with undo support via `lastRef.requeued`).
- `src/lib/scheduler.js` — `getDueCards`, `getDeckStats`, `getAllDeckStats`.
- `src/lib/storage.js` — card CRUD, `addCard` defaults, `mergeData`.
- `src/pages/Browse.jsx`, `src/pages/DeckDetail.jsx` — card list UIs.

## Commit 1 — `feat: in-session learning step for new cards`

**Problem:** a brand-new card rated 记住 once is gone until tomorrow. Mature SRS
requires a card to be recalled twice before it graduates to the review schedule.

**Design (session-local, no schema change):** in `Review.jsx`:

- Track per-session pass counts in a ref: `passesRef = useRef(new Map())`
  (cardId → successful passes this session).
- A card is **in learning** if `card.repetitions === 0` (new or lapsed-and-reset).
- On rating a learning card with quality ≥ 4 (记住/容易):
  - First success → do **not** write SM-2 yet; increment its pass count and
    **reinsert the card ~3 positions ahead** (`min(currentIndex + 3, queue end)`),
    not at the very end, so the second look comes after a short gap.
  - Second success → graduate: apply `sm2()` and persist as today. 容易 on the
    *first* pass graduates immediately (skip the second step) — one-touch pass for
    trivially easy cards.
- Hard (2) on a learning card: counts as a failed step — treat like Again below but
  without incrementing `lapses` (commit 2).
- Again (1) on any card: existing behavior (SM-2 reset write + requeue) stays, but
  change the requeue insertion from queue-end to the same `currentIndex + 3` rule
  so failed cards return promptly in long sessions.
- **Undo** must handle the new cases: restore pass count and remove the reinserted
  copy. Extend the `lastRef` payload (`{ requeued, reinsertedAt, passDelta }`) and
  reverse exactly what was done. Test undo of: first-pass Good on a new card,
  graduation pass, Again requeue.
- Review-log entries (`addReviewEntry`) fire per rating event, unchanged.
- `reviewAll` (cram) mode: learning-step logic applies only to `repetitions === 0`
  cards there too; no other change.

The done screen's counts keep counting rating events. Progress denominator grows on
reinsertion — already the case for Again requeue, acceptable.

## Commit 2 — `feat: lapse counter and leech flagging`

- `sm2()` callers: when quality === 1 is applied to a card with
  `repetitions > 0` (a true lapse, not a failed learning step), increment
  `lapses = (card.lapses ?? 0) + 1` in the same `updateCard` write. Cleanest: have
  `sm2()` return the field (pass current lapses in) or handle it in `handleRate` —
  pick whichever keeps `sm2.js` pure; document the choice in the commit body.
- When `lapses` reaches **8**: set `leech: true, suspended: true` in the same
  write, and show a toast in the review session (「卡片已标记为顽固卡并暂停 · LEECH」),
  with the shared toast, not blocking the flow.
- Undo of a lapse rating must also restore `lapses`/`leech`/`suspended` (extend the
  `prevSM2` snapshot in `getCardSM2`/`restoreCardSM2` to include the three fields).

## Commit 3 — `feat: suspended cards excluded from scheduling, manageable in Browse`

- `scheduler.js`: `getDueCards` excludes `suspended`; `getDeckStats` /
  `getAllDeckStats` exclude suspended cards from `dueCount` and
  `futureDistribution` (they still count in `total`).
- `Browse.jsx` card rows: suspended cards render dimmed with a 「已暂停」 tag; leech
  cards get a 「LEECH」 tag (accent/warn tone). Row action (or the existing card
  action pattern in Browse/DeckDetail — follow whichever menu/affordance exists) to
  暂停/恢复 a card; resuming a leech clears `suspended` but keeps `leech` and
  `lapses` (re-suspend happens at the next multiple of 4 lapses after 8 — Anki-like
  half-threshold repeat).
- `DeckDetail.jsx` stats row: show suspended count if > 0 (「暂停 N」), so cards
  don't silently disappear from review without explanation.

## Commit 4 — `tweak: surface learning state in the review UI`

Small affordances so the new mechanics are legible:
- During review, learning cards (repetitions === 0) show a subtle 「学习中 · LEARNING
  1/2」 or 「2/2」 marker near the chapter crumb (pass count from `passesRef`).
- Rating-button interval labels: for a learning card's first pass, 记住 shows
  「稍后」 instead of 「1d」 (it reinserts, doesn't schedule); 容易 keeps its real
  interval since it graduates immediately. `predictInterval` gains the context it
  needs — keep the change local to `Review.jsx`.

## Verification

1. `npm run build` green after each commit; `npx vitest run` still green.
2. New card: 记住 → reappears ~3 cards later marked 2/2 → 记住 again → session ends
   without it; check localStorage: repetitions 1, due tomorrow. 容易 on first look →
   graduates immediately.
3. Undo each: first-pass Good (pass count reverts, copy removed), graduation,
   Again.
4. Lapse a mature card (repetitions > 0) 8 times across ratings → toast fires, card
   suspended, gone from due counts, visible dimmed in Browse with LEECH tag →
   恢复 → due again → 4 more lapses → re-suspended.
5. Old data untouched: cards without the new fields review normally; export →
   import round-trip preserves lapses/suspended/leech.
6. Full manual review run (advance, flip, rate, undo, complete) — no regression.

## Out of scope (note, don't implement)

- Minute-level learning steps / dueAt timestamps — deliberate non-goal this round.
- FSRS — separate future project.
- Per-deck daily limits and configurable step counts — later, once this settles.
