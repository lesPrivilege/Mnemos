# Implementation Prompt — Pre-Design Cleanup: R4+1 + String Externalization (self-contained)

You are working in the **Mnemos** repo. Two mechanical chores that must land
before the visual re-grounding (roadmap-maturity M1b): (1) remove the big-record
localStorage dual-write left by R4; (2) externalize all user-visible strings
into one flat module, as the i18n reserve. Zero behavior change, zero visual
change.

**Branch:** `chore/predesign-cleanup` off `main`.

## Hard rules (from `CLAUDE.md`)

Read files before editing; minimal incremental edits. One logical change = one
commit, `type: description`; `npm run check` green before each commit. Stage
specific files only. Never push.

## Commit 1 — `refactor: remove big-record localStorage dual-write (R4+1)`

- `src/lib/bigStore.js`: at the `TODO(R4+1)` marker, stop writing big records to
  localStorage in `setCached`. Return shape must stay `{ ok: true } | { ok:
  false, error }` — IDB writes are async fire-and-forget, so `setCached` now
  returns `{ ok: true }` unconditionally (quota errors are a localStorage
  concept; keep the `label` config field for error surfaces that may return
  in R5+, note this in a comment).
- **Keep the hydrate migration path intact** — devices that have never run an
  R4 build must still migrate localStorage → IDB on first boot. Only the
  write-back on save is removed.
- After a successful IDB write of a migrated/saved record, delete the stale
  localStorage copy (`removeKey`) — one-time cleanup so stale copies can't be
  resurrected as "newer-looking" data by future code.
- Update tests: dual-write assertions become stale-copy-deleted assertions.
- `docs/backup-format.md`: replace the dual-write-window paragraph with the
  final state (big records: IDB only; migration read path retained
  indefinitely).

## Commits 2-6 — `refactor: externalize user-visible strings (<area>)`

New `src/lib/strings.js`: one flat exported object, grouped by domain, keys in
English, values the exact current strings (byte-identical — tests asserting
message text must keep passing with the constant imported, not duplicated):

```js
export const S = {
  common: { confirm: '确认', cancel: '取消', /* … */ },
  review: { again: '重来', /* … */ },
  storage: { quotaFlashcard: '请导出备份后清理数据', /* … */ },
  // …
}
```

Scope — INCLUDE: JSX text nodes, aria-labels, placeholders, Toast/ConfirmSheet
messages, error strings returned to UI (incl. the `label` strings passed to
`saveJson`/bigStore in lib files), notification copy in `reminders.js`.
EXCLUDE: console.warn/log, code comments, data-derived names (subject/deck
names), date formatting, and `PromptGuide.jsx` long-form guide content + the
prompt templates in `formatSpec.js` (they are product content, not chrome —
note them in the final commit body as deliberately excluded).

Split by area, one commit each, `npm run check` between: (2) `src/lib` +
`src/components`, (3) flashcard pages, (4) quiz pages + `src/quiz`,
(5) reading module, (6) `Settings.jsx` + `Import.jsx` (largest two, last so
earlier commits stay small).

Mixed-language labels like `热力 · HEATMAP` move as single strings — do NOT
split or restructure them; M1b's subtraction audit will edit them in
`strings.js` later (that is the point of this round).

## Verify before finishing

`npm run check` green. Audit: `grep -rnP '[\x{4e00}-\x{9fff}]' src --include='*.jsx' --include='*.js' | grep -v strings.js | grep -v test | grep -v PromptGuide | grep -v formatSpec` — remaining hits should be only comments and deliberate exclusions; list them in the final commit body.
