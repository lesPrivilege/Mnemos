# Implementation Prompt — Data Layer Hardening (R2, self-contained)

You are working in the **Mnemos** repo. Goal: silent data loss becomes impossible.
Three deliverables: (1) corrupted storage is preserved and surfaced, never silently
replaced with empty defaults; (2) all persisted top-level structures carry a schema
`version`; (3) the backup format is frozen as a documented contract. No new
dependencies. No behavior change for healthy data.

**Branch:** `feat/data-hardening` off `main`.

## Hard rules (from `CLAUDE.md`)

Read files before editing; minimal incremental edits. One logical change = one
commit, `type: description`; `npm run check` green before each commit (lint + 62
existing tests + build). Stage specific files only. Never push.

## Context (read first)

- `src/lib/storage.js` — flashcard store (`mnemos-data`). `loadData()` catch →
  returns `getDefaultData()` — **this is the silent-loss bug.**
- `src/quiz/lib/storage.js` — quiz store (`examprep-*`, 4 keys), same
  catch-returns-fallback pattern in `loadQuestions()` etc.
- `src/reading/lib/storageUtils.js` — shared `load(key, fallback)` for reading
  (`reading-*` keys), same pattern.
- `src/lib/fullBackup.js` — full backup already has `version: 1`; module-level
  exports (`storage.js exportData`, quiz `exportData`, `reading/lib/backup.js
  exportReadingData`) have none.
- `src/pages/Settings.jsx` — backup card lives here (recovery entry goes near it).
- Do NOT restructure the three storage modules into a shared layer — that is R3
  (roadmap Phase 2). Keep changes local; it's fine that the three modules get
  similar small additions.

## Commit 1 — `feat: quarantine corrupted storage instead of returning defaults`

New tiny module `src/lib/quarantine.js`:

- `quarantine(key, raw, err)` — copy the unparseable raw string to
  `mnemos-quarantine::<key>` with `{ raw, quarantinedAt, error: err.message }`
  (stringify; if even that write fails, swallow — never throw from the failure
  path). Record the key in an index key `mnemos-quarantine-index` (array of key
  names, deduped).
- `listQuarantined()` → `[{ key, quarantinedAt, error, size }]`.
- `getQuarantinedRaw(key)` / `discardQuarantined(key)`.

Wire it into all three load paths (`storage.js loadData`, quiz storage loaders,
reading `storageUtils.load`): in the catch, if `raw` was non-null (i.e. data
existed but didn't parse — distinguish from "key absent"), call `quarantine()`
before returning the fallback. JSON that parses but fails shape checks
(`normalizeData`) counts as corrupt too.

Unit tests (`src/lib/quarantine.test.js`): corrupt JSON → quarantined + fallback
returned; absent key → no quarantine entry; quarantine index dedupes; discard
removes both entry and index record.

## Commit 2 — `feat: quarantine recovery entry in Settings`

In Settings' data/backup card area: when `listQuarantined()` is non-empty, show a
danger-toned row — "检测到 N 份受损数据" with per-entry lines (key, date, size)
and two actions: **导出**（download the raw string as
`mnemos-quarantine-<key>-<date>.txt`; reuse the existing file-save path used by
backup export）and **丢弃**（`ConfirmSheet` first）. No repair attempt in-app —
the raw export is for external (LLM-assisted) repair and re-import. Hidden
entirely when empty; zero visual footprint for healthy users.

## Commit 3 — `feat: schema version on persisted stores`

- Flashcard `mnemos-data`: `saveData` writes `{ version: 1, decks, cards }`;
  `loadData`/`normalizeData` accepts both versioned and legacy (no `version`)
  shapes — legacy is upgraded in memory and rewritten versioned on next save. No
  eager migration pass.
- Quiz: keys are flat arrays/objects today; wrap is invasive — instead add a
  standalone marker key `examprep-schema-version` = `1`. Same for reading:
  `reading-schema-version` = `1`. (Wrapping those stores properly is R3's job;
  the marker gives future migrations something to dispatch on.)
- Module exports gain versions: flashcard `exportData` → include `version: 1`;
  quiz `exportData` → add `version: 1`; `exportReadingData` → add `version: 1`.
  All corresponding import paths accept both versioned and legacy payloads
  (tests: round-trip current export, and import a legacy fixture).
- `fullBackup` stays `version: 1` but now embeds versioned module payloads.

## Commit 4 — `docs: freeze backup format as contract`

`docs/backup-format.md`: document the full-backup JSON shape field by field
(top level, `flashcard.{version,decks[],cards[]}` with card SM-2 fields,
`quiz.{version,questions,progress,starred}`, `reading.{version,reading-*,bodies}`),
the versioning policy (additive changes don't bump; shape changes bump + importer
keeps reading all prior versions), and the compatibility promise: **any backup
ever produced must import into any future version.** Note the quarantine export
format at the bottom.

## Out of scope

Shared storage layer, IndexedDB migration (both R3/R4), auto-repair of corrupted
JSON, cloud anything.

## Verify before finishing

`npm run check` green; manually: seed `localStorage['mnemos-data'] = '{oops'` in
devtools → app boots with empty state, Settings shows the quarantine row, export
produces the raw string, discard clears it.
