# Implementation Prompt — Import UX Cleanup + Land Anki Import (self-contained)

You are working in the **Mnemos** repo. Two intertwined problems in the import
experience:

1. **Routing/UX conflation.** `Import.jsx` now smart-routes any JSON by shape
   (`detectImportKind`: questions / quiz-backup / flashcard-backup / full-backup),
   but this only hangs off the 做题 · JSON tab, whose copy claims it's for
   questions.json only. Backup restore therefore has **no discoverable entry** —
   Settings has four export buttons and zero restore affordance; users find restore
   only by accident, by dropping a backup on the quiz tab.
2. **Anki import never landed.** Branch `feat/anki-text-import` (6 commits off an
   older main) contains a complete, tested parser — `src/lib/ankiParser.js` with
   `parseAnkiToCards(content, deckName)`, header directives (#separator/#html/...),
   CSV/TSV tokenizer, HTML→markdown, cloze→front/back, plus vitest tests — but was
   never merged and never wired into any UI. The 闪卡 tab still accepts `.md` only.

**Branch:** `feat/import-ux-cleanup` off `main`.

## Hard rules (from `CLAUDE.md`)

Read files before editing; minimal incremental edits. One logical change = one
commit, `type: description`; `npm run build` green before each commit. Stage
specific files only. Never push. Preserve existing 中文 copy style.

## Target UX — the entry → parser mapping to implement

| Entry | Accepts | Parser | Preview |
|---|---|---|---|
| 做题 tab | questions.json (array / single / chapter-split) | `parseQuestionsJson` | 题库统计 preview |
| 闪卡 tab | .md, **.txt/.csv/.tsv (Anki export)**, paste | content-sniff → `parseAnkiToCards` or `parseMdToCards` | MD 卡片 preview |
| 阅读 tab | .md/.tex/.txt, paste | `readFileAsDocument` | 文档 preview |
| **恢复 tab (new)** | any backup .json (完整 / 记忆 / 练习) | `detectImportKind` routing | per-kind backup preview |
| Settings 备份卡 | 「恢复备份」button → `/import?tab=restore` | — | — |

JSON shape-routing stays **global** as defensive behavior (a backup dropped on the
做题 tab must still route correctly — never show it as 0 questions), but the
canonical, discoverable path is the 恢复 tab + Settings button.

## Commit 1 — `chore: merge feat/anki-text-import parser`

Merge branch `feat/anki-text-import` (or rebase it onto main first if the merge is
noisy — it only touches `package.json`, `package-lock.json`,
`src/lib/ankiParser.js`, `src/lib/ankiParser.test.js`). It adds vitest as a dev
dependency; ensure `npx vitest run` passes and add a `"test": "vitest run"` script
if the branch didn't. Build must stay green.

## Commit 2 — `feat: wire Anki text/CSV import into the flashcard tab`

In `Import.jsx`, 闪卡 tab:
- File input + dropzone accept `.md,.txt,.csv,.tsv`.
- Content sniffing for non-.md files (and as fallback for .md): if the text starts
  with an Anki header directive (`#separator:` etc.) **or** the first non-empty
  line contains a tab with ≥2 fields → `parseAnkiToCards(content, defaultName)`;
  otherwise → `parseMdToCards`. The paste path (`handlePasteSubmit`) gets the same
  sniff.
- `parseAnkiToCards` returns the minimal card shape
  `{ front, back, type, chapter, section }` (+ deck name handling — read the
  function before wiring); reuse the existing MD preview screen unchanged (dedup,
  deck-name field, skip-duplicates toggle must all work for Anki cards too).
- Empty-parse toast: extend the existing copy to mention Anki (e.g. 「未识别到卡片。
  支持 MD 列表、Anki 导出的 txt/csv，或纯文本按“正面换行背面”成组输入。」).

## Commit 3 — `feat: dedicated backup-restore entry`

- Add a fourth tab 恢复 · RESTORE to `Import.jsx` (`?tab=restore` supported in the
  initial-tab logic). Content: an intro card (「恢复备份 · RESTORE」— 支持完整备份 /
  仅记忆 / 仅练习 backup 文件，说明合并 vs 替换), a dropzone accepting `.json` that
  feeds `routeJsonImport`, and a hint that auto-backup files live in
  `Documents/Mnemos/`（native only — reuse `isNative()` for that hint line）.
- Settings 备份 · BACKUP card: add a 「恢复备份」 row/button navigating to
  `/import?tab=restore`.
- Quiz-backup preview currently supports merge only; add the merge/替换全部 seg
  (replace = `importQuizData(JSON.stringify(data))` after the shared destructive
  confirm), consistent with the other backup previews.

## Commit 4 — `tweak: sync import tab copy with actual behavior`

- 做题 tab: FORMAT card stays questions-only (backup mentions, if any, removed —
  point to the 恢复 tab instead).
- 闪卡 tab: FILE dropzone ext line → `.MD · .TXT · .CSV`; 支持格式 card gains an
  Anki row (「Anki 导出」/「txt / csv，含 cloze」); textarea placeholder unchanged.
- 恢复 tab: list the three accepted backup kinds explicitly.
- `PromptGuide` (制卡指南): add a short section noting direct Anki-export import is
  supported, so the guide doesn't imply MD is the only path.

## Commit 5 (optional, only if time allows) — `refactor: split Import.jsx preview screens`

`Import.jsx` is ~900 lines with five inline preview screens. Extract each preview
(`QuizPreview`, `BackupPreview`, `FullBackupPreview`, `MdPreview`,
`ReadingPreview`) into `src/components/import/`. Pure moves, no behavior change.
Skip if any earlier commit ran into complications — don't rush a refactor.

## Verification

1. `npm run build` + `npx vitest run` green after each commit.
2. Anki: export a small deck from Anki as txt (with and without header directives,
   with an HTML field and a cloze note) → import via 闪卡 tab file picker and via
   paste → preview counts correct, cloze becomes front/back, HTML renders as
   markdown; plain MD import unchanged.
3. Restore: Settings → 恢复备份 → lands on 恢复 tab → pick a full backup → correct
   preview; also drop a quiz-only backup and a flashcard-only backup on the 恢复
   tab → each routes to its own preview; quiz backup replace mode works.
4. Defensive routing: drop a full backup on the 做题 tab → still routes to the
   full-backup preview (not an empty questions preview).
5. Copy check: no tab promises a format it doesn't handle; no tab omits one it does.
