# Implementation Prompt — Automatic Local Backup (self-contained)

You are working in the **Mnemos** repo (Capacitor 8 + React SRS flashcard / quiz /
reading app). All data lives in localStorage + IndexedDB inside the WebView; today
the only safeguard is manual export from Settings. This feature adds a daily
automatic snapshot written to the device filesystem, with retention and a small
Settings surface.

**Branch:** `feat/auto-backup` off `main`.

## Hard rules (from `CLAUDE.md`)

1. Read the file before editing. Minimal incremental edits; match existing style.
2. One logical change = one commit, `type: description`. Each commit builds alone
   (`npm run build`). Stage specific files only. Never push.
3. Storage namespaces stay isolated. This feature needs one new **integration
   module** that imports all three modules' export functions — that is permitted,
   with the same status as `Import.jsx`/`Settings.jsx` (document this in a comment
   at the top of the new module).

## Context you need (read these first)

- `src/pages/Settings.jsx` — `handleExportAll` builds the full-backup object
  `{ version, exportedAt, flashcard, quiz, reading }` from `exportFlashcardData()`,
  `exportQuizData()`, and the (now async, bodies-included) `exportReadingData()`.
- `src/lib/platform.js` — `isNative()` helper.
- `src/components/` toast/confirm from the shared-dialogs round; Settings uses them.
- `package.json` — Capacitor plugins currently installed: app, splash-screen.
  **`@capacitor/filesystem` is NOT installed.**

## Commit 1 — `chore: add @capacitor/filesystem`

`npm install @capacitor/filesystem` (pin to the ^8 major to match the other
Capacitor packages), then `npx cap sync android`. Commit `package.json`,
`package-lock.json`, and whatever `android/` files the sync legitimately touches
(inspect the diff; don't commit unrelated noise).

## Commit 2 — `refactor: extract full-backup builder into src/lib/fullBackup.js`

Extract the backup-object assembly out of `Settings.jsx` into a new
`src/lib/fullBackup.js`:

```js
export async function buildFullBackup() // → { version, exportedAt, flashcard, quiz, reading }
```

`Settings.jsx handleExportAll` becomes a thin caller (build → blob → downloadBlob).
Behavior identical — verify the manual 完整备份 file is byte-equivalent in structure
to before.

## Commit 3 — `feat: daily auto-backup to device storage`

New module `src/lib/autoBackup.js` (native-only; every entry point early-returns
when `!isNative()`):

- **Trigger:** `maybeRunAutoBackup()` called once from an `useEffect` in `App.jsx`.
  Read `mnemos-auto-backup-enabled` (default `'true'`) and
  `mnemos-last-auto-backup` (`{ at, ok, error?, path? }` JSON). If disabled, or the
  last successful run is < 20h ago, return. Otherwise schedule the actual work with
  a ~5s `setTimeout` so app startup isn't blocked.
- **Write:** `await buildFullBackup()` → JSON string → write with
  `Filesystem.writeFile` to `Directory.Documents`, path
  `Mnemos/mnemos-auto-YYYY-MM-DD.json` (`recursive: true`, UTF-8). One file per
  local day — same-day rerun overwrites. If writing to `Documents` throws
  (permission/scoped-storage differences across Android versions), fall back to
  `Directory.Data` with the same path and record which directory succeeded.
- **Retention:** after a successful write, `readdir` the backup folder, keep the 7
  newest `mnemos-auto-*.json` by filename, delete the rest. Deletion failures are
  non-fatal.
- **Status:** persist `{ at: Date.now(), ok, error?, dir, path }` to
  `mnemos-last-auto-backup` on every attempt, success or failure. Never throw out
  of the scheduler; never show a toast on success (silent background work). No
  status writes on the web platform.

## Commit 4 — `feat: auto-backup controls in Settings`

In the 备份 · BACKUP card of `Settings.jsx` (native only — hide the whole block when
`!isNative()`):

- Toggle row 「自动备份」 with hint 「每日自动保存完整备份到设备存储」, wired to
  `mnemos-auto-backup-enabled`. Reuse the existing settings row/segment styling.
- Status line: 上次自动备份 `M月D日 HH:mm` · 成功/失败; on failure show the error
  text in the existing muted/danger style. Show the target folder
  (`Documents/Mnemos/` or the fallback) so the user knows where to find files.
- Button 「立即备份」 → runs the same write path immediately (bypasses the 20h
  check), then refreshes the status line; failure shows an error toast.

Restore needs **no new UI**: the snapshots are ordinary full-backup files and import
through the existing Import flow. Verify on device that the system file picker can
select a file from the backup folder and the full-backup preview appears.

## Verification

1. `npm run build` green after each commit.
2. On device (or emulator): fresh launch → within ~10s a backup file appears under
   `Documents/Mnemos/`; relaunch immediately → no second write (20h guard);
   「立即备份」 forces one; toggle off → relaunch → no write.
3. Seed 8 days of fake files in the folder → next run keeps the newest 7.
4. Pick the newest auto-backup file in the Import page → full-backup preview shows
   correct per-module counts → restore round-trips (spot-check a reading doc body).
5. Web dev server (`npm run dev`): no filesystem calls, no status writes, Settings
   hides the auto-backup block, no console errors.

## Out of scope (note, don't implement)

- Cloud sync / off-device copies.
- Backup encryption.
- Restore-from-list UI inside Settings (import flow covers it).
