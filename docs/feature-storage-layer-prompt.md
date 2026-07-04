# Implementation Prompt — Shared Storage Layer (R3, self-contained)

You are working in the **Mnemos** repo. Goal: one storage primitive, consumed
everywhere. Today there are at least six independent load/save implementations:
`src/lib/storage.js` (flashcard), `src/quiz/lib/storage.js` (`loadJson`),
`src/reading/lib/storageUtils.js` (`load`/`save`), plus quarantine-less ad-hoc
copies in `reviewLog.js`, `activity.js`, `autoBackup.js`, `reviewSession.js`.
After this round: one `src/lib/store.js`, everything else is thin wrappers.
**No data migration, no key renames, no behavior change** — same keys, same
shapes, same fallbacks.

**Branch:** `refactor/storage-layer` off `main`.

## Hard rules (from `CLAUDE.md`)

Read files before editing; minimal incremental edits. One logical change = one
commit, `type: description`; `npm run check` green before each commit (11 test
files / 74 tests must stay green — they are the safety net for exactly this
refactor). Stage specific files only. Never push.

## Target API — `src/lib/store.js`

```js
loadJson(key, fallback, validate?)   // absent → fallback; corrupt/invalid →
                                     // quarantine(key, raw, err) then fallback
saveJson(key, value, { label }?)     // → { ok: true } | { ok: false, error }
                                     // quota error → warn + zh error string
                                     // (label used in the message), else rethrow
removeKey(key)
```

Implementation: lift quiz storage's `loadJson` (it is already the best version)
+ the shared quota handling. `store.js` imports `quarantine` — nothing else. Also
export `isPlainObject` and `isArray` validators so callers stop redefining them.

## Commits

**Commit 1 — `refactor: extract shared store.js primitive`**
Create `src/lib/store.js` + `src/lib/store.test.js` (absent key, corrupt →
quarantined, validate rejection → quarantined, quota simulation via a stubbed
`localStorage.setItem` throwing `QuotaExceededError`, remove).

**Commit 2 — `refactor: flashcard storage on store.js`**
`src/lib/storage.js` keeps its public API (`loadData`/`saveData`/`normalizeData`
/CRUD/export/import) and the version-wrapper logic, but load/save go through
`loadJson`/`saveJson`. Its quota message string must stay byte-identical
(existing UI copy). Existing `storage.test.js` stays green untouched — if a test
must change, the refactor changed behavior: stop and reconsider.

**Commit 3 — `refactor: quiz storage on store.js`**
Delete local `loadJson`/`isPlainObject`, delegate. Keep `writeSchemaVersion`
per-save behavior and all public functions unchanged.

**Commit 4 — `refactor: reading storageUtils on store.js`**
`storageUtils.load/save` become one-line delegates (keep `matchesFallbackShape`
as the validate arg; keep the schema-version side-write). Reading storage files
keep importing from `storageUtils` — do not touch them.

**Commit 5 — `refactor: ad-hoc loaders on store.js`**
`reviewLog.js`, `activity.js`, `autoBackup.js`, `reviewSession.js`: replace their
private `loadJson`/try-catch copies with `store.js`. Net effect: these four gain
quarantine protection they currently lack (that is the point — the review log and
activity data are irreplaceable history). `reminders.js`: check for the same
pattern and convert if present. Where these modules previously swallowed quota
errors silently, keep swallowing (they are background writers; no new UI), but
route through `saveJson` so the warn is uniform.

## Explicitly out of scope

IndexedDB migration (R4 — this round only makes R4 possible by giving it a
single choke point). Key renames. Wrapping quiz/reading stores in version
envelopes. Any UI change.

## Verify before finishing

`npm run check` green. Then grep-audit: `grep -rn "localStorage" src --include='*.js' --include='*.jsx' | grep -v store.js | grep -v quarantine.js | grep -v test`
— remaining direct uses should be only: trivial scalar keys (e.g.
`DAILY_LIMIT_KEY`, settings toggles), `idb.js` (different backend), and
`Settings.jsx` UI reads. List the remainder in the final commit body so R4 knows
the full inventory.
