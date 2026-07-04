# Implementation Prompt — Swipe Rating + Haptic Feedback (self-contained)

You are working in the **Mnemos** repo. Add swipe-to-rate gestures to the flashcard
review screen and haptic feedback at key moments. Gestures are pure web (touch
events); haptics via the Capacitor plugin, native-only.

**Branch:** `feat/gestures-haptics` off `main`.

## Hard rules (from `CLAUDE.md`)

Read files before editing; minimal incremental edits. One logical change = one
commit, `type: description`; `npm run build` green before each commit. Stage
specific files only. Never push.

## Context (read first)

- `src/pages/Review.jsx` + `src/components/ReviewCard.jsx` — flip on tap, rate
  buttons call `handleRate(quality)`; card content areas are vertically scrollable
  (`overflowY: auto`) — the gesture must not break vertical scrolling.
- `src/lib/platform.js` — `isNative()`; `src/lib/autoBackup.js` — native-only
  module pattern.
- `src/pages/QuizPage.jsx` — submit/next flow (haptics touchpoint only, no
  gestures).

## Commit 1 — `chore: add @capacitor/haptics`

`npm install @capacitor/haptics` (^8 to match), `npx cap sync android`. Commit
package files + legitimate sync output only.

## Commit 2 — `feat: swipe-to-rate on the review card`

In `Review.jsx` (state/handlers) + `ReviewCard.jsx` (transform target):

- Active **only when `flipped`** (front side keeps tap-to-flip untouched).
- Touch handling on the card wrapper: record start point; a gesture becomes a
  horizontal swipe only when `|dx| > 24 && |dx| > 2·|dy|` — until then do nothing,
  so vertical scrolling inside the answer works untouched. Once horizontal intent
  locks, follow the finger: card `translateX(dx) rotate(dx/40deg)`, no transition
  during drag.
- Visual affordance while dragging: an overlay label fading in with distance —
  left = 重来 in `--danger` tint, right = 记住 in `--accent` tint (mirror the
  rate-button palette).
- Release: `|dx| ≥ 96` (or ≥ 30% of card width, whichever smaller) commits —
  animate the card off-screen (~180ms), then call `handleRate(1)` (left) or
  `handleRate(4)` (right); below threshold → spring back (~150ms transition).
- Undo, requeue, learning-step logic all flow through the existing `handleRate` —
  zero changes there. The swipe is strictly an input alternative to two of the
  four buttons (困难/容易 stay button-only; that's intentional — don't add
  vertical swipes).
- Mouse events not needed (touch-first app); keyboard shortcuts unchanged.

## Commit 3 — `feat: haptic feedback at key interactions`

New `src/lib/haptics.js` — thin wrapper, every function early-returns on
`!isNative()`, all failures silent:

```js
hapticLight()    // ImpactStyle.Light
hapticMedium()   // ImpactStyle.Medium
hapticSuccess()  // NotificationType.Success
hapticWarning()  // NotificationType.Warning
```

Touchpoints (keep it restrained — haptics that fire constantly get disabled
mentally by the user):
- Review: card flip → light; rate commit (button or swipe) → light; swipe crossing
  the commit threshold while dragging → light (once per crossing); session
  complete (done screen mount) → success; leech-suspension toast → warning.
- Quiz: answer submit → light; wrong answer → warning (single, not on every
  render); quiz set complete → success.
- Nothing elsewhere (no haptics on navigation, toggles, imports).

## Verification

1. `npm run build` green per commit; web dev server unaffected (no plugin calls,
   swipe still works as pure touch, or is simply inert without touch input).
2. Device: answer side — slow horizontal drag shows label + follows finger;
   release short of threshold springs back; past threshold flies off and rates
   correctly (check SM-2 write + undo toast); vertical scroll inside a long answer
   never triggers the swipe; front side tap still flips.
3. Swipe-rated cards: undo restores exactly like button-rated; Again-swipe
   requeues with the learning-step behavior intact.
4. Haptics fire at listed moments only; disable-check: web build silent.

## Out of scope

- Swipe on quiz screens; configurable gesture mapping; a Settings haptics toggle
  (add later only if the defaults annoy in practice).
