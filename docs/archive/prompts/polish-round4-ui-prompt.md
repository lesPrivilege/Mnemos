# Implementation Prompt — Polish Round 4: UI/Interaction (self-contained)

You are working in the **Mnemos** repo. Four items from on-device testing, each
verified against the code. One branch per item, off `main`.

## Hard rules (from `CLAUDE.md`)

Read files before editing; minimal incremental edits. One logical change = one
commit, `type: description`; `npm run build` green before each commit. Stage
specific files only. Never push.

---

## Item 1 — Starred/Wrong lists can't open the tapped question (P1, logic bug)
**Branch:** `feat/question-deep-link`

**Problem (verified):** `Starred.jsx` (line ~56) and `Wrong.jsx` (line ~111)
navigate item taps to `/quiz/{subject}?chapter=...` — that starts a **random
10-question chapter session**, not the tapped question. The user taps a starred
question, lands on an unrelated question, and the topbar star isn't lit because
it's literally a different question. There is no deep link to a specific question
anywhere.

**Fix:**
- `QuizPage.jsx`: support two new search params — `mode` (overrides the default
  `'random'`; accepts the engine modes incl. `starred` and `wrong`) and `qid`.
  Loading: call `getQuizQuestions` with that mode (pass `starredIds: loadStarred()`
  when mode is `starred`; **no `limit` slice** when `qid` is present — or limit
  after reordering); if `qid` is in the result, move it to the front; if not
  (edge: question no longer matches the mode), fetch it by id and prepend. Also
  add a 「收藏」 chip to `MODES` so starred practice is reachable in-page.
- `QuizReview.jsx`: read it first, mirror the same `mode`/`qid` handling for
  review-type questions.
- `Starred.jsx` item tap → `/quiz/{subject}?mode=starred&qid={id}` (choice) or
  `/quiz-review/{subject}?mode=starred&qid={id}` (review). `Wrong.jsx` item tap →
  same with `mode=wrong`.
- Keep the `chapter` param behavior for all existing entry points (SetDetail CTAs,
  chapter rows) — unchanged.

**Verify:** tap a starred choice question → it is the first question shown and the
topbar star is lit; rest of the session = other starred questions of that subject.
Same for a wrong-book item (mode=wrong) and a starred review question. Chapter
practice from SetDetail unchanged.

---

## Item 2 — 记住/困难 rating buttons are visually identical (P2)
**Branch:** `tweak/rate-button-colors`

**Problem (verified):** `src/styles/index.css` — `.rate-hard` uses `--warn`
(oklch hue 70) and `.rate-good` uses `--accent` (oklch hue 60), with near-identical
lightness/chroma in both themes (light: 58%/0.13/70 vs 56%/0.13/60; dark:
76%/0.13/75 vs 74%/0.13/65). Two adjacent ochres — only the border reads.

**Fix:** give the rate scale four clearly separated steps without touching the
global `--warn`/`--accent` tokens (they're used elsewhere). Add dedicated tokens
(e.g. `--rate-hard`, `--rate-hard-soft`) in both `:root` and `.dark`: shift the
hard hue to a distinctly yellower amber (hue ≈ 95–105) and differentiate lightness
from `.rate-good` by ≥ 8 points so the two are separable even for anomalous color
vision. The scale should read: 重来 red → 困难 amber → 记住 ochre → 容易 green.
Check both themes on device brightness extremes; keep text contrast ≥ 4.5:1
against the soft backgrounds.

**Verify:** screenshot light + dark; the four buttons are four unmistakably
different colors; no other UI element changed (grep for the new token usage —
only `.rate-hard`).

---

## Item 3 — Restore entry demoted from tab to bottom entry (P2)
**Branch:** `tweak/import-restore-entry`

**Problem:** 恢复 · RESTORE currently sits as a fourth seg tab parallel with the
three content types. Restoring a backup is a rare, categorically different action
from importing content — it doesn't deserve tab parity (user feedback from device
testing).

**Fix in `Import.jsx`:**
- Seg returns to three tabs (做题/闪卡/阅读).
- Add a quiet, persistent entry at the **bottom of the page** (below the tab
  content and hint text, visible on every tab without scrolling on a normal
  screen): a bordered row card — 「恢复备份 · RESTORE」 + chevron, muted tone.
  Tapping it switches to the existing restore view (keep the restore UI itself as
  is — dropzone, kind routing, previews).
- `?tab=restore` deep link (used by Settings 「恢复备份」) must keep working and
  land directly in the restore view; back from restore view returns to the tabs.
- JSON shape-routing on the three content tabs stays as defensive fallback.

**Verify:** three tabs render; bottom entry opens restore; Settings deep link still
lands in restore; back navigation sane; drop a backup on 做题 tab still routes to
backup preview.

---

## Item 4 — Shared floating action bar for detail screens (P2)
**Branch:** `feat/floating-action-bar`

**Problem:** detail screens (`DeckDetail.jsx`, `SetDetail.jsx`) end with a
full-width `flex-shrink-0` footer block for the primary CTAs. User feedback: on
long outlines the footer wants to be a floating overlay, not a docked slab — and
this should become the app's unified pattern for primary actions on scrolling
screens (native liquid-glass adaptation is a future concern, out of scope).

**Fix:**
- New shared component `src/components/FloatingBar.jsx`: fixed overlay at the
  bottom, inset from the edges (≈ 16px margins + `env(safe-area-inset-bottom)`),
  rounded (pill/lg radius), elevated (`--shadow-md`+), background `var(--bg-card)`
  with a soft border and slight translucency (`color-mix` with transparency +
  `backdrop-filter: blur(8px)` — test that the WebView handles it; if artifacts,
  fall back to opaque).
- Adopt in `DeckDetail.jsx` and `SetDetail.jsx`: CTA content unchanged, footer
  block replaced; the scroll container gets enough bottom padding that the last
  outline row is never hidden under the bar.
- Audit `Browse.jsx` and other secondary screens for the same docked-footer
  pattern; adopt where it applies, leave review/quiz session screens alone (their
  bottom bars are rating/answer controls, a different pattern).

**Verify:** long outline scrolls under the floating bar with the last row fully
reachable; safe-area respected on device; dark mode blur/translucency looks clean;
CTAs work unchanged.

---

## Order & noted-not-done

Suggested order: 1 → 2 → 3 → 4 (logic bug first). Independent branches.

Deferred by explicit decision: font slimming (default system font + optional
downloadable serif pack — separate round), native liquid-glass floating bar API.
