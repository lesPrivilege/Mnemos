# Implementation Prompt — Learning Loop: 错题→闪卡 & 高亮→闪卡 (self-contained)

You are working in the **Mnemos** repo. Close the loop between the three modules:
turn quiz wrong-book questions and reading highlights into flashcards, without any
new cross-module lib imports — pages are the integration point, and the write path
stays the existing flashcard `addCard`.

**Branch:** `feat/learning-loop` off `main`.

## Hard rules (from `CLAUDE.md`)

Read files before editing; minimal incremental edits. One logical change = one
commit, `type: description`; `npm run build` green before each commit. Stage
specific files only. Never push. **No module-lib cross-imports** — quiz/reading
pages may import flashcard page routes only via navigation; the card data travels
through router state.

## Mechanism (shared by both features)

**Do NOT round-trip through markdown text.** `parseMdToCards` is line-based;
question stems with newlines, options, or display math would be mangled. Instead,
source pages build an array of minimal card objects — the same shape
`parseAnkiToCards` emits: `{ front, back, type: 'recall', chapter, section }` —
and navigate to Import with them:

```js
navigate('/import', { state: { prefillCards: cards, prefillDeckName: name } })
```

## Commit 1 — `feat: Import accepts prefilled card previews via router state`

In `src/pages/Import.jsx`:
- On mount (`useLocation().state`), if `prefillCards` is a non-empty array: set
  `mdPreview({ cards, defaultName: prefillDeckName })` and `mdDeckName` exactly as
  `processMd` does — the existing MD preview screen (deck-name field, dedup
  detection, skip-duplicates toggle, confirm via `addCard` loop) renders unchanged.
- Clear the router state after consuming it (`navigate(..., { replace: true })` or
  equivalent) so back/refresh doesn't re-trigger the preview.
- No UI changes otherwise. Verify a normal MD paste still works.

## Commit 2 — `feat: generate flashcards from the wrong book`

In `src/pages/Wrong.jsx`:
- Add a 「生成闪卡」 button (topbar action or above the list, follow the page's
  existing affordances), enabled when the current filtered list is non-empty. It
  converts **the currently displayed wrong questions** (subject filter respected)
  to cards:
  - choice: `front` = question stem + blank line + options joined with newlines;
    `back` = `正确答案：{answer}` + blank line + explanation (if any).
  - review: `front` = question stem; `back` = answer or explanation
    (`q.answer || q.explanation`), matching how QuizReview shows reference answers.
  - `chapter` = q.chapter, `section` = q.section.
- Default deck name: `错题 · {getSubjectDisplayName(subject)}` (or `错题本` when
  unfiltered).
- Navigate with `prefillCards`. Existing dedup-by-front handles re-generation —
  regenerating next week only imports new wrong questions into the same deck.

## Commit 3 — `feat: generate flashcards from reading highlights`

In the Reader's highlights panel (`src/reading/components/ReaderPanels.jsx` /
`src/reading/pages/Reader.jsx` — read both, wire where the export-highlights action
lives):
- Add 「生成闪卡」 alongside the existing highlight export affordance, enabled when
  the doc has highlights. Conversion per highlight:
  - has a `note` → `front` = note (the user's own cue/question), `back` =
    selectedText;
  - no note → `front` = selectedText, `back` = contextSnippet (or empty if none).
  - Append a source line to `back`: `——《{doc.title}》`.
  - `chapter` = doc title, `section` = ''.
- Default deck name: `阅读 · {doc.title}`.
- Same navigation. Note: leaving the Reader triggers `endSession()` — confirm that
  navigating to Import doesn't double-fire or lose the reading session stats.

## Verification

1. `npm run build` green per commit; `npx vitest run` green.
2. Wrong book: seed a few wrong questions (choice + review) → 生成闪卡 → preview
   shows correct fronts/backs (options present, LaTeX intact in preview render) →
   confirm → deck created, cards reviewable. Regenerate → duplicates detected,
   skip-duplicates imports only new ones.
3. Highlights: doc with a noted highlight and a bare one → 生成闪卡 → noted one has
   note as front; bare one has text as front, snippet+source as back → confirm →
   deck created.
4. Router state hygiene: after confirming (or cancelling) a prefilled preview,
   navigating back / refreshing Import does not resurrect the preview; plain MD
   paste and file import unchanged.
5. Generated cards behave as normal new cards in review (learning steps apply).

## Out of scope

- Per-question / per-highlight selection UI (batch-all first; selection can come
  later if batches feel too coarse).
- Auto-sync (regenerate on wrong-book change) — manual trigger only.
- Backlink from card to source question/highlight.
