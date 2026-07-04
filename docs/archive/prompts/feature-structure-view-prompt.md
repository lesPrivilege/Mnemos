# Implementation Prompt — Mastery Stats (P0) + Structure View (P1) (self-contained)

You are working in the **Mnemos** repo. Two stages, two branches, P1 depends on P0
— **land P0 on `main` first**, then cut P1.

Decisions already made (don't re-litigate): tree outline only, no graphical
mindmap; **three mastery tiers** (弱/中/稳); flashcard + quiz modules only, reading
excluded; view is read-only + navigation.

## Hard rules (from `CLAUDE.md`)

Read files before editing; minimal incremental edits. One logical change = one
commit, `type: description`; `npm run build` green before each commit. Stage
specific files only. Never push. No cross-module lib imports — flashcard mastery
lives in `src/lib/`, quiz mastery in `src/quiz/lib/`; pages compose them.

---

# Stage P0 — `feat/mastery-stats` off `main`

## Commit 1 — `feat: card mastery model in src/lib/cardStats.js`

```js
export function mastery(card)        // → 0..1
export function masteryTier(value)   // → 'weak' | 'mid' | 'solid'
export function tierCounts(cards)    // → { weak, mid, solid, new: n } (recall cards only)
```

Model constraints (exact weights are yours, document them in a header comment):
- `repetitions === 0` → 0 (new, tier reported separately as `new`, not 弱 — a
  card never seen isn't "weak").
- Monotonically increasing in `repetitions` (saturating, e.g. by rep 5–6) and in
  `easiness` (normalize from the 1.3 floor); decreasing in `lapses ?? 0`.
- Suspended cards count normally (a leech IS weak knowledge — that's signal).
- Tier thresholds: weak < 0.35 ≤ mid < 0.7 ≤ solid — constants exported so P1 and
  any future consumer share them.
- Reference cards (non-recall, see `cardUtils.isRecall`) are excluded from
  `tierCounts` — they have no mastery.

## Commit 2 — `feat: question mastery tier in src/quiz/lib/questionStats.js`

Quiz has no SM-2; derive the tier from progress (reuse `isInWrongBook` from
`quizEngine` for consistency with round-3's single definition):

- no progress / status `todo` → `'new'`
- in wrong book (`isInWrongBook`) → `'weak'`
- answered, `rightStreak >= 2` → `'solid'`
- otherwise → `'mid'`

Export `questionTier(prog)` and `tierCountsForQuestions(questions, progress)`.

## Commit 3 — `feat: mastery tier indicators in card/question lists`

Small, immediate value ahead of P1:
- `Browse.jsx` card rows: a tier dot (red/ochre/green via `--danger`/`--accent`/
  `--good`; hollow or `--ink-3` for `new`) — tiny, before or after existing meta,
  follow the row's visual rhythm.
- `DeckDetail.jsx` stats area: add tier counts (弱 N · 中 N · 稳 N) where the
  existing counts live, mono style.
- No new screens; keep it subtle.

**P0 verification:** build green; hand-check a few cards (new card → new; freshly
lapsed leech → weak; old high-EF card → solid); quiz tier matches wrong-book
membership everywhere it's shown.

**Land P0 on `main`, then:**

---

# Stage P1 — `feat/structure-view` off `main` (after P0 lands)

## Commit 1 — `feat: collapsible structure view component`

`src/components/StructureTree.jsx` — pure-DOM collapsible tree, module-agnostic
(receives data, renders, calls back):

```jsx
<StructureTree
  nodes={[ { id, label, count, tiers: {weak,mid,solid,new}, children: [...] } ]}
  onLeafTap={(node) => ...}
/>
```

- Node row: chevron (rotates on collapse/expand, chapter level starts expanded,
  section level starts collapsed), label, count in mono, and a **stacked tier
  bar** (thin, full-width under the row or right-aligned fixed width): segments
  proportional to weak/mid/solid in `--danger`/`--accent`/`--good`, `new` as
  `--bg-raised`. The stacked distribution says more than a single aggregate dot.
- Tap chevron/row toggles children; tap a leaf (no children) fires `onLeafTap`.
- Collapse state is component-local `useState` (session-only, no persistence).
- Style: follow existing list/card idioms (`settings-card`/row patterns, `--ink-3`
  metadata, mono counts). No animation library — CSS transitions only.

## Commit 2 — `feat: structure view in DeckDetail`

- View toggle (列表 ⇄ 结构) using the existing seg control pattern, near where the
  card list starts. Default stays 列表.
- Build nodes from the deck's cards: chapter → section (cards with empty section
  hang directly under their chapter; empty chapter groups under 未分类). Tier data
  from P0's `tierCounts`.
- Leaf tap → `Browse` filtered to that chapter/section. Read `Browse.jsx` first:
  if it lacks chapter/section filter params, add query-param support
  (`?chapter=...&section=...`) as part of this commit.

## Commit 3 — `feat: structure view in SetDetail`

- Same toggle on the quiz subject page; nodes chapter → section from questions
  (`section` field, may be empty → same 未分类 handling), tiers from
  `tierCountsForQuestions`.
- Leaf tap → practice that slice: `QuizPage` currently filters by `chapter` only —
  add `section` support to `getQuizQuestions` (one more filter line) and a
  `?section=` param to `QuizPage`/`QuizReview`, then navigate with both params.
  Chapter-only entry points keep working (section absent = no section filter).

**P1 verification:** build + vitest green; deck with 3 chapters × sections renders
correct counts and tier bars, collapse/expand smooth on device; leaf taps land on
correctly filtered Browse / correctly scoped quiz session; a deck with no
chapter/section data degrades to a flat 未分类 list without errors; list view and
all existing entries unchanged.

## Out of scope

Graphical mindmap (P2 — parked indefinitely per decision); reading module; collapse
persistence; editing anything from the tree.
