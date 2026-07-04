# Implementation Prompt — Daily Review Reminder (self-contained)

You are working in the **Mnemos** repo (Capacitor 8 + React). Add a daily local
notification reminding the user to review, with real due counts, a configurable
time, and an on/off toggle. Native-only; the web build must be untouched
behaviorally.

**Branch:** `feat/daily-reminder` off `main`.

## Hard rules (from `CLAUDE.md`)

Read files before editing; minimal incremental edits. One logical change = one
commit, `type: description`; `npm run build` green before each commit. Stage
specific files only. Never push.

## Design constraints (decided — don't re-litigate)

- **Counts are computed at schedule time, not fire time.** Local notifications
  fire without the app running, so we pre-schedule the next 7 days on every app
  launch/resume, computing each day's predicted due count from current data. Any
  app open wipes and reschedules all 7 — staleness self-heals with normal usage.
- Predicted due count for day D = recall-type, non-suspended cards with
  `dueDate <= D` (overdue accumulates, so counts are monotonic-safe). Follow the
  `activity.js` pattern for reading data (integration module, reads
  `mnemos-data` via `loadData`).
- Days with count 0: **skip** — never notify when there's nothing due.
- Optional suffix: if the quiz wrong book is non-empty at schedule time
  (`isInWrongBook` over `examprep-progress`), append 「 · 错题 N」 to the body.
  Wrong-book size isn't predictable per-day; using the schedule-time value for all
  7 days is acceptable.

## Context (read first)

- `src/lib/platform.js` — `isNative()`.
- `src/lib/autoBackup.js` — the existing pattern for a native-only module invoked
  from `App.jsx` (status key, early returns, silent failure). Mirror its shape.
- `src/lib/scheduler.js`, `src/lib/storage.js` — due logic and `loadData`.
- `src/quiz/lib/quizEngine.js` — `isInWrongBook`.
- `src/pages/Settings.jsx` — settings rows/toggles; 备份 card for placement
  reference. `@capacitor/app` is already installed (App state listener).

## Commit 1 — `chore: add @capacitor/local-notifications`

`npm install @capacitor/local-notifications` (^8 to match other Capacitor
packages), `npx cap sync android`. Commit package files + legitimate `android/`
sync output only (inspect the diff). Note: Android 13+ requires the
`POST_NOTIFICATIONS` runtime permission — the plugin's `requestPermissions()`
handles the prompt; verify the manifest picked up the permission entry via sync.

## Commit 2 — `feat: reminder scheduling module`

New `src/lib/reminders.js` (native-only, every entry point early-returns on
`!isNative()`):

- Config in localStorage: `mnemos-reminder-enabled` (default `'false'` — opt-in,
  because it needs a permission prompt) and `mnemos-reminder-time` (default
  `'20:00'`).
- `export async function resyncReminders()`:
  1. Cancel all previously scheduled reminder notifications (use a fixed id range,
     e.g. ids 9001–9007, so cancel is deterministic:
     `LocalNotifications.cancel({ notifications: [...] })`).
  2. If disabled → done.
  3. Check permission (`checkPermissions`); if not granted → done (the Settings
     toggle owns requesting).
  4. On Android, ensure a notification channel once (`createChannel`, id
     `mnemos-reminders`, name 复习提醒, importance 3/default).
  5. For each of the next 7 days: compute the predicted flashcard due count for
     that date; skip 0; schedule id 9001+i at that date's HH:mm (skip today's slot
     if the time already passed). Title 「Mnemos · 今日复习」, body
     「N 张卡片待复习」+ optional 「 · 错题 M」.
- `export async function enableReminders()` — requests permission; returns whether
  granted; on grant persists enabled + calls `resyncReminders()`.
- `export function disableReminders()` — persists disabled + cancels.
- Wire `resyncReminders()` into `App.jsx`: once on mount (a few seconds delayed,
  alongside `maybeRunAutoBackup`'s pattern) and on `appStateChange` →
  `isActive: true` resume (via `@capacitor/app` `App.addListener`; remember to
  remove the listener on cleanup). Never throw; failures are silent.

## Commit 3 — `feat: reminder controls in Settings`

New 提醒 · REMINDER card in `Settings.jsx` (hidden when `!isNative()`), placed
after the Recall module card:

- Toggle 「每日复习提醒」, hint 「有到期卡片时按时提醒」. Turning on calls
  `enableReminders()`; if permission is denied show a danger-tone note
  (「通知权限被拒绝，请在系统设置中开启」) and revert the toggle.
- Time row: `<input type="time">` bound to `mnemos-reminder-time`, styled like the
  existing `settings-field-input`; changing it calls `resyncReminders()`.
- Status line: next scheduled reminder (read back via
  `LocalNotifications.getPending()`) — e.g. 「下次提醒 · 7月5日 20:00 · 12 张」, or
  「暂无待复习卡片，未安排提醒」 when nothing is scheduled.

## Verification

1. `npm run build` green per commit; web dev server: no plugin calls, Settings
   hides the card, no console errors.
2. Device: toggle on → system permission prompt → grant → status line shows next
   reminder; set time 2 minutes ahead, background the app → notification fires
   with the correct count; tap → app opens.
3. Deny permission path: toggle reverts with the danger note.
4. Zero-due path: with no due cards (and empty wrong book), no notification is
   scheduled; status line says so.
5. Resume resync: rate away today's due cards, background + resume the app →
   today's pending reminder is gone (counts recomputed).
6. Toggle off → `getPending()` empty.

## Out of scope

- Per-module reminder granularity, streak/nag notifications, notification actions
  (deep links beyond default open). Quiz-due prediction per day.
