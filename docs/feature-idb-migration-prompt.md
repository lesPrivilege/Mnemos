# Implementation Prompt — Big-Record IndexedDB Migration (R4, self-contained)

You are working in the **Mnemos** repo. Goal: move the two largest persisted
records — quiz `examprep-questions` and flashcard `mnemos-data` — from
localStorage to IndexedDB, killing the ~5MB quota ceiling. Conservative path:
**hydrate-to-memory cache keeps every existing sync API unchanged; dual-write for
one release before localStorage writes stop.** All other keys stay where they are
(R3's final commit body has the frozen inventory).

**Branch:** `feat/idb-big-records` off `main` (verify `refactor/storage-layer`
is merged into `main` first; if not, stop and say so).

## Hard rules (from `CLAUDE.md`)

Read files before editing; minimal incremental edits. One logical change = one
commit, `type: description`; `npm run check` green before each commit (12 test
files / 79 tests are the safety net). Stage specific files only. Never push.

## Architecture (read before coding)

- `src/lib/idb.js` — existing KV helper, DB `mnemos` v1, one store
  (`reading-doc-bodies`). Its own header comment documents how to add a store:
  bump `DB_VERSION`, add `createObjectStore` in `onupgradeneeded`.
- `src/lib/store.js` — R3 primitive; sync `loadJson`/`saveJson` used by all
  storage modules.
- Key constraint: `loadQuestions()` / `loadData()` are **sync** and called all
  over pages. Do NOT async-ify call sites. Instead:

```
bigStore.js (new)
  hydrate()            async, called once before first render
                       per key: IDB value → cache; else localStorage value →
                       cache + write-back to IDB (migration); else fallback
                       corrupt/invalid at any stage → quarantine + fallback
  getCached(key)       sync read from cache (throws if hydrate not run — fail
                       loud in dev, never ship a silent empty state)
  setCached(key, val)  sync cache update + async IDB put + (transition period)
                       localStorage write via saveJson so quota behavior and
                       backups keep working; returns saveJson's { ok } result
```

- Boot gate in `src/main.jsx`: `hydrate().finally(() => root.render(...))`.
  If IDB is unavailable (`idb.js` resolves null — e.g. private mode), hydrate
  falls back to localStorage-only cache: app works exactly as today. No spinner
  UI: hydration of two keys is fast; the splash screen already covers it.

## Commits

**Commit 1 — `chore: add fake-indexeddb dev dependency`**
Tests use `vi.stubGlobal` localStorage, no jsdom IDB. Add `fake-indexeddb`
(devDependency only — the no-new-runtime-deps rule stands) and wire it in test
setup for the new test files.

**Commit 2 — `feat: kv object store in idb.js`**
`DB_VERSION` → 2, add generic `'kv'` store per the file's own instructions.
Existing `reading-doc-bodies` untouched; verify upgrade path from v1 in a test
(open v1 db with data, reopen at v2, data intact).

**Commit 3 — `feat: bigStore hydrate-cache over idb kv`**
`src/lib/bigStore.js` + tests: fresh install (no data anywhere), migration
(localStorage only → lands in IDB, localStorage copy retained), steady state
(IDB wins over stale localStorage), corrupt IDB value → quarantine + localStorage
fallback, IDB unavailable → localStorage-only mode, setCached round-trip.

**Commit 4 — `feat: quiz questions on bigStore`**
`loadQuestions`/`saveQuestions` delegate to bigStore (`examprep-questions` only;
progress/starred/session stay sync-small on localStorage). Public API and return
shapes unchanged; existing quiz storage tests must stay green with hydrate called
in their setup.

**Commit 5 — `feat: flashcard data on bigStore`**
Same treatment for `mnemos-data` in `src/lib/storage.js`, keeping the version
wrapper + `normalizeData` exactly as-is (validation runs on hydrate and save).
Boot gate lands in this commit (`main.jsx`).

**Commit 6 — `docs: note dual-write window in backup-format.md`**
One paragraph: v1.4 dual-writes big records to both backends; localStorage
copies become stale-acceptable in the following release, after which
`saveJson`-to-localStorage for these two keys is removed (leave a `TODO(R4+1)`
marker at the write site). Backups are unaffected — they read through the same
loaders.

## Explicitly out of scope

Async-ifying any page; moving progress/starred/reading-* keys; removing the
localStorage dual-write (next release); any UI change.

## Verify before finishing

`npm run check` green. Manual: existing data in localStorage → boot → devtools
shows both backends populated, app state identical; clear localStorage big keys
only → reboot → data still there (served from IDB); Settings backup export
still contains full data.
