# Implementation Prompt — Review Heatmap on Activity Page (self-contained)

You are working in the **Mnemos** repo. Add a GitHub-style activity heatmap to the
Activity page, driven entirely by existing data. Pure view-layer work, no schema
changes, no new dependencies.

**Branch:** `feat/activity-heatmap` off `main`.

## Hard rules (from `CLAUDE.md`)

Read files before editing; minimal incremental edits. One logical change = one
commit, `type: description`; `npm run build` green before each commit. Stage
specific files only. Never push.

## Context (read first)

- `src/lib/activity.js` — `getActivityDashboard()` aggregates recall (review log),
  practice (review log / progress fallback), reading (sessions) into per-day
  entries; since the round-3 streak fix it already builds an activity set over a
  trailing 90-day window (the sources retain 90 days — that is the natural heatmap
  window, don't try to exceed it).
- `src/pages/Activity.jsx` — current dashboard layout.
- Theme tokens in `src/styles/index.css` (`--accent`, `color-mix` patterns used
  elsewhere).

## Commit 1 — `feat: expose 90-day daily totals from activity lib`

In `activity.js`, extend the trailing-90-day pass to produce and return (via
`getActivityDashboard()` or a dedicated `getHeatmapData()`) an array of
`{ date, recall, practice, reading, total }` for each of the last 90 days
(missing days = zeros), plus a `maxTotal`. Reuse the existing source-reading
helpers — no duplicate parsing logic. Keep the current month-scoped fields
untouched (chart/totals consumers unchanged).

## Commit 2 — `feat: heatmap grid on Activity page`

- Pure CSS-grid rendering (no library): columns = weeks (≈13), rows = 7 (Sun→Sat
  to match the existing week charts' 日→六 convention), cell ≈ 12–14px rounded
  squares, horizontally scrollable if needed on narrow screens with the newest
  week visible by default.
- Intensity: 5 levels (0 + quartiles of nonzero totals, or fixed thresholds
  against the daily targets in `activity.js TARGETS` — pick one, note it in the
  commit body). Colors: `var(--bg-raised)` for zero, then 4 steps of
  `color-mix(in oklch, var(--accent) N%, var(--bg-raised))` — verify legibility in
  both themes.
- Sparse labels: month names above the first week of each month; 一/三/五 row
  labels on the left, mono font, `--ink-3`.
- Tap a cell → a small detail line below the grid (not a modal): date + 记忆 N ·
  练习 N · 阅读 N min. Tap again or tap another cell to switch.
- Placement: its own settings-card-style section on the Activity page, below the
  today/summary section, above per-module breakdowns (read the page and fit its
  visual rhythm — lbl header 「热力 · HEATMAP」).

## Verification

1. `npm run build` green per commit.
2. Seeded data renders correct intensities; empty state (new user) renders an
   all-zero grid without errors; today is the last cell.
3. Both themes legible; tap detail correct; page scroll performance fine (90 cells
   is trivial, but confirm no re-render storm from the tap state).
4. Existing Activity content (streak,週 totals, module cards) unchanged.

## Out of scope

- Ranges beyond 90 days (sources prune at 90); per-module heatmap toggles;
  export/share image.
