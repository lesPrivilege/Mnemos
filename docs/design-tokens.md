# Mnemos Design Tokens — Claude Design Constraint Sheet

This is the step-1 input of the Claude Design relay protocol (see
`docs/roadmap-maturity.md`, "Claude Design 接力協議"). Read this document cold,
with no other context, before touching a prototype. It names every token you
are allowed to reference, explains the composition rules, states what's
already decided (not open for re-litigation), and flags what's still a known
gap.

**If you are Claude Design building the single-file HTML prototype for M1b's
redesign round: the hard constraint in the final section is not a suggestion.
Read it before you write any CSS.**

---

## 1. Full token table

Source of truth: `src/styles/tokens.css`. All values below are read directly
from that file — do not substitute your own palette or guess intermediate
values. "Same" in the dark column means the token is theme-invariant (defined
once, not overridden in `:root.dark`).

### Color primitives

| Name | Role | Light | Dark |
|---|---|---|---|
| `--bg` | Page background | `oklch(96.5% 0.012 80)` | `oklch(16% 0.014 250)` |
| `--bg-card` | Card / panel surface | `oklch(99% 0.006 80)` | `oklch(20% 0.016 250)` |
| `--bg-raised` | Raised surface (hover states, progress tracks) | `oklch(94% 0.016 80)` | `oklch(24% 0.018 250)` |
| `--bg-sunken` | Recessed background (body wrapper) | `oklch(92.5% 0.018 80)` | `oklch(13% 0.012 250)` |
| `--border` | Default border | `oklch(86% 0.018 80)` | `oklch(30% 0.018 250)` |
| `--border-soft` | Subtle border (dividers, card edges) | `oklch(91% 0.015 80)` | `oklch(26% 0.014 250)` |
| `--border-strong` | Emphasized border | `oklch(72% 0.025 80)` | `oklch(42% 0.022 250)` |
| `--ink` | Primary text | `oklch(22% 0.022 80)` | `oklch(95% 0.008 250)` |
| `--ink-2` | Secondary text | `oklch(48% 0.020 80)` | `oklch(76% 0.012 250)` |
| `--ink-3` | Tertiary text (labels, captions) | `oklch(66% 0.014 80)` | `oklch(58% 0.014 250)` |
| `--ink-4` | Quaternary text (faintest, disabled-adjacent) | `oklch(78% 0.012 80)` | `oklch(42% 0.016 250)` |
| `--accent` | Primary accent (ochre) | `oklch(56% 0.13 60)` | `oklch(74% 0.13 65)` |
| `--accent-soft` | Accent tint background | `oklch(94% 0.038 60)` | `oklch(28% 0.06 50)` |
| `--accent-line` | Accent border/underline weight | `oklch(78% 0.07 60)` | `oklch(44% 0.10 60)` |
| `--teal` | Answer / reading semantic color | `oklch(50% 0.09 195)` | `oklch(74% 0.10 195)` |
| `--teal-soft` | Teal tint background | `oklch(94% 0.025 195)` | `oklch(26% 0.05 195)` |
| `--teal-line` | Teal border/underline weight | `oklch(78% 0.06 195)` | `oklch(44% 0.08 195)` |
| `--good` | Success semantic | `oklch(54% 0.11 155)` | `oklch(74% 0.13 155)` |
| `--good-soft` | Success tint background | `oklch(94% 0.030 155)` | `oklch(24% 0.05 155)` |
| `--warn` | Warning semantic | `oklch(58% 0.13 70)` | `oklch(76% 0.13 75)` |
| `--warn-soft` | Warning tint background | `oklch(94% 0.035 70)` | `oklch(26% 0.05 75)` |
| `--danger` | Error/destructive semantic | `oklch(54% 0.16 28)` | `oklch(72% 0.15 28)` |
| `--danger-soft` | Error tint background | `oklch(94% 0.030 28)` | `oklch(26% 0.06 28)` |
| `--plum` | SM-2 "hard" rating accent | `oklch(48% 0.10 320)` | `oklch(72% 0.12 320)` |
| `--rate-hard` | SM-2 "hard" rating text | `oklch(48% 0.12 100)` | `oklch(66% 0.12 100)` |
| `--rate-hard-soft` | SM-2 "hard" rating tint background | `oklch(93% 0.035 100)` | `oklch(26% 0.05 100)` |

### Shadows

| Name | Role | Light | Dark |
|---|---|---|---|
| `--shadow-sm` | Minimal lift (buttons, chips) | `0 1px 2px oklch(22% 0.02 80 / 0.04)` | `0 1px 2px #0008` |
| `--shadow-md` | Card-level lift | `0 1px 2px oklch(22% 0.02 80 / 0.04), 0 8px 28px oklch(22% 0.02 80 / 0.045)` | `0 1px 3px #0008, 0 6px 24px #0006` |
| `--shadow-lg` | Overlay/floating-bar lift | `0 2px 6px oklch(22% 0.02 80 / 0.06), 0 20px 48px oklch(22% 0.02 80 / 0.07)` | `0 4px 12px #000a, 0 16px 40px #0008` |

Dark-mode shadows intentionally use flat hex-alpha (`#0008` etc.), not oklch
— existing pre-token-era values, left as-is rather than force-converted for
this pass.

### Code-syntax tokens

Used by the in-app code/prompt-template rendering (`CardEditor.jsx` toolbar,
`PromptGuide.jsx`, any `<pre>`/code block). Not general-purpose UI colors —
do not repurpose these for chrome.

| Name | Role | Light | Dark |
|---|---|---|---|
| `--code-bg` | Code block background | `oklch(95% 0.012 80)` | `oklch(13% 0.012 250)` |
| `--code-border` | Code block border | `oklch(89% 0.014 80)` | `oklch(26% 0.014 250)` |
| `--tk-key` | Syntax: keys/keywords | `oklch(48% 0.14 320)` | `oklch(74% 0.14 320)` |
| `--tk-str` | Syntax: strings | `oklch(48% 0.11 155)` | `oklch(74% 0.11 155)` |
| `--tk-num` | Syntax: numbers | `oklch(48% 0.08 65)` | `oklch(76% 0.13 60)` |
| `--tk-com` | Syntax: comments | `oklch(58% 0.04 80)` | `oklch(54% 0.014 250)` |
| `--tk-fn` | Syntax: functions | `oklch(48% 0.13 195)` | `oklch(74% 0.11 240)` |
| `--tk-op` | Syntax: operators | `oklch(48% 0.06 80)` | `oklch(85% 0.010 250)` |

### Radii

| Name | Role | Value (both themes) |
|---|---|---|
| `--r-sm` | Small radius (chips, tags) | `8px` |
| `--r-md` | Default radius (buttons, cards, rows) | `12px` |
| `--r-lg` | Large radius (sheets, larger cards) | `16px` |
| `--r-xl` | Extra-large radius (floating bar) | `22px` |

### Fonts

| Name | Role | Value (both themes) |
|---|---|---|
| `--font-zh` | Chinese body/UI text | `'Noto Serif SC', 'Songti SC', Georgia, serif` |
| `--font-disp` | Display/wordmark serif (topbar `h1`, non-`.zh` variant) | `'Instrument Serif', 'Noto Serif SC', Georgia, serif` |
| `--font-ui` | Latin UI chrome (labels, buttons, nav) | `'Inter', system-ui, -apple-system, sans-serif` |
| `--font-mono` | True data only — numbers/dates/counts/percentages/code | `'JetBrains Mono', ui-monospace, monospace` |

These four are the **entire** font palette. See section 6 for the
classification policy that decides which of the four applies to a given
piece of text — this is a decided policy, not a per-prototype judgment call.

### Type scale

Ratio ≈1.2 (minor third), stepping from `--text-base: 1rem`. `rem` units so
the whole scale responds to root font-size / OS Dynamic-Type setting. **Not
yet wired into any component** — these are named steps for Claude Design and
later implementation rounds to build against, not values already in use in
the shipped app today.

| Name | Value | Approx px (16px root) |
|---|---|---|
| `--text-xs` | `0.694rem` | ~11.1px |
| `--text-sm` | `0.833rem` | ~13.3px |
| `--text-base` | `1rem` | 16px |
| `--text-lg` | `1.2rem` | ~19.2px |
| `--text-xl` | `1.44rem` | ~23px |
| `--text-2xl` | `1.728rem` | ~27.6px |
| `--text-3xl` | `2.074rem` | ~33.2px |

| Name | Value |
|---|---|
| `--leading-tight` | `1.2` |
| `--leading-normal` | `1.5` |
| `--leading-relaxed` | `1.7` |

### Spacing (4/8 grid)

8-step scale, 4px to 64px. Mostly 4/8 multiples, with a 12px half-step at
`--sp-3` for the tight in-between cases that recur throughout the existing
codebase's hand-picked px values.

| Name | Value |
|---|---|
| `--sp-1` | `4px` |
| `--sp-2` | `8px` |
| `--sp-3` | `12px` |
| `--sp-4` | `16px` |
| `--sp-5` | `24px` |
| `--sp-6` | `32px` |
| `--sp-7` | `48px` |
| `--sp-8` | `64px` |

### Motion

| Name | Value | Covers |
|---|---|---|
| `--motion-quick` | `120ms cubic-bezier(0.2, 0, 0, 1)` | Micro-interactions (100-200ms range) |
| `--motion-gentle` | `240ms cubic-bezier(0.2, 0, 0, 1)` | Sheet/panel movements (240ms+ range) |

Shared ease matches the iOS/Material "standard decelerate" curve already
implied by the hand-picked cubic-beziers elsewhere in `index.css`. See
section 5 for the gap between these two tokens and the 17 sites still
hardcoded outside them.

### Surfaces

| Name | Role | Light | Dark |
|---|---|---|---|
| `--surface-chrome-bg` | Translucent bar background (FloatingBar) | `color-mix(in oklch, var(--bg-card) 85%, transparent)` | Same expression, resolves against dark's own `--bg-card` |
| `--surface-chrome-blur` | Backdrop blur for chrome bars | `blur(8px)` | Same |
| `--surface-chrome-border` | Border for chrome bars | `var(--border-soft)` | Same (theme-relative via the primitive) |
| `--surface-raised` | Raised-surface alias | `var(--bg-raised)` | Same (theme-relative via the primitive) |
| `--surface-overlay` | Overlay/sheet-surface alias | `var(--bg-card)` | Same (theme-relative via the primitive) |

See section 3 for what these compose and why the calibration matters.

---

## 2. The three-layer rule

`tokens.css` is explicitly structured as three layers (see the file's own
header comment):

```
1. Primitives   — raw color/shadow/radius/font values
2. Scales       — type / spacing / motion
3. Surfaces     — composite semantics built from primitives
```

- **Primitives** are the raw building blocks: `--bg`, `--ink`, `--accent`,
  `--shadow-md`, `--r-md`, `--font-ui`, etc. These carry no semantic
  composition — they're the palette.
- **Scales** are systematic step sequences derived from a ratio or grid, not
  individually hand-picked: the type scale (`--text-*`, minor-third ratio),
  the spacing grid (`--sp-*`, 4/8-based), and the two motion durations
  (`--motion-*`).
- **Surfaces** are multi-property composites built by referencing primitives
  — `--surface-chrome-bg` composes `--bg-card` through `color-mix()`;
  `--surface-raised` and `--surface-overlay` alias `--bg-raised` /
  `--bg-card` directly (see section 3 for why the composition depth differs
  between these).

The rule for prototypes and future components: **consume layer 3 (or layer
1/2 directly for simple cases) — never re-derive a surface's composition at
the call site.** If a card needs a background + border + shadow combination,
that combination should be named as a semantic surface token in `tokens.css`
itself, not assembled ad hoc in a component's inline styles or CSS class.

---

## 3. Surface composition rules

### `--surface-chrome-bg` / `--surface-chrome-blur` / `--surface-chrome-border`

These three compose the "floating chrome" look used by `FloatingBar.jsx`
(the bottom action bar on detail screens): a translucent, blurred pill
background with a soft border.

**These values are load-bearing, not placeholders.** `--surface-chrome-bg`
and `--surface-chrome-blur` were recalibrated in Commit 2 of this token
series specifically to match `FloatingBar.jsx`'s real, already-shipped
production values — `85%` alpha over `--bg-card`, `blur(8px)` — after an
earlier guess (`--bg` at 78% alpha + `blur(16px)`) was found to not match the
actual component once there was a real call site to check against. The
`color-mix(in oklch, var(--bg-card) 85%, transparent)` expression exists
specifically so the token stays *derived from* `--bg-card` as its single
source of truth, rather than duplicating a hardcoded oklch-alpha literal that
could drift out of sync with `--bg-card` later. If you change `--bg-card`,
this surface updates automatically; that's the point of the composition.

**`.topbar` currently does NOT use `--surface-chrome-bg`.** Its background
stays the opaque `--bg` primitive — only `backdrop-filter:
var(--surface-chrome-blur)` was tokenized on it. This is deliberate, tested,
and current, not an oversight. The reasoning, verbatim from the comment at
`src/styles/index.css` next to `.topbar` (added in Commit 2):

> Background stays opaque `var(--bg)`, not `--surface-chrome-bg` — tested
> empirically (Commit 2) by scrolling real content under the sticky header:
> the translucent token produces a visible color bleed-through that isn't
> there today. Only the blur radius is adopted here since it's still inert
> against an opaque background either way.

If a redesign round is considering making the topbar translucent (a
reasonable thing to want — it would match `FloatingBar`'s language), know
that this was already tried and reverted for a concrete visual reason
(content bleed-through was visible against real scrolled content, not just
theoretically possible). A future attempt should re-test against real
content, not assume the prior test was wrong.

### `--surface-raised` / `--surface-overlay`

These are plain 1:1 aliases today — `var(--bg-raised)` and `var(--bg-card)`
respectively — not multi-property composites like `--surface-chrome-*`.
That's deliberate: the value of naming them is the *semantic name*, not the
property count. Call sites should say "give me the raised surface" / "give
me the overlay surface" rather than reaching for `--bg-raised` /`--bg-card`
directly, so that if a surface later needs a shadow or border bundled with
its color (the way `--surface-chrome-*` already bundles three properties),
that composition can happen in one place — here, in `tokens.css` — instead
of requiring an audit of every call site that used the primitive directly.

**Practical implication for prototypes:** always reach for `--surface-raised`
/ `--surface-overlay` / `--surface-chrome-*` over the underlying `--bg-*`
primitives when the intent is "this is a raised card" or "this is a floating
chrome bar" — even though today they resolve to the same computed value as
their primitive. The semantic name is the contract.

---

## 4. Type scale + spacing grid

(Full value tables are in section 1 above; this section is the compact
reference.)

**Type scale** — ratio ≈1.2 from a 1rem base:
`--text-xs 0.694rem` · `--text-sm 0.833rem` · `--text-base 1rem` ·
`--text-lg 1.2rem` · `--text-xl 1.44rem` · `--text-2xl 1.728rem` ·
`--text-3xl 2.074rem`

Line-heights: `--leading-tight 1.2` · `--leading-normal 1.5` ·
`--leading-relaxed 1.7`

**Spacing grid** — 4/8-based with one 12px half-step:
`--sp-1 4px` · `--sp-2 8px` · `--sp-3 12px` · `--sp-4 16px` ·
`--sp-5 24px` · `--sp-6 32px` · `--sp-7 48px` · `--sp-8 64px`

Neither scale is wired into any component yet — they exist in `tokens.css`
as the target vocabulary. A prototype is free to use them as the primary
sizing/spacing system; it does not need to match today's shipped app's
literal px values, since those predate this scale.

---

## 5. Motion policy

Two motion tokens exist:

- `--motion-quick` — `120ms cubic-bezier(0.2, 0, 0, 1)` — micro-interactions
- `--motion-gentle` — `240ms cubic-bezier(0.2, 0, 0, 1)` — sheet/panel moves

A global `prefers-reduced-motion` rule in `tokens.css` overrides every
animation/transition on the page to near-zero duration when the OS asks for
reduced motion, regardless of whether the site used a token or a hardcoded
duration:

```css
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
    scroll-behavior: auto !important;
  }
}
```

**Known gap: 17 CSS transition sites in `src/styles/index.css` are still
hardcoded at non-canonical durations**, because only these two motion tokens
exist today and several existing transitions don't cleanly map to either
120ms or 240ms. These were left untouched rather than force-fit. Full current
list (selector: hardcoded transition value):

| Selector | Hardcoded transition |
|---|---|
| `.btn` | `transform 100ms, background 140ms, border-color 140ms, color 140ms` |
| `.dropzone` | `border-color 140ms, background 140ms` |
| `.rv-progress .bar` | `width 200ms` |
| `.flip-inner` | `transform 480ms cubic-bezier(.4,.2,.2,1)` |
| `.rate-btn` | `transform 100ms, background 120ms` |
| `.deck` | `transform 140ms, border-color 140ms, background 140ms` |
| `.ch-row` | `background 110ms` |
| `.ch-caret` | `transform 180ms` |
| `.sec-row` | `background 110ms` |
| `.tabs-tab` | `color 180ms` |
| `.tabs-track` | `transform 360ms cubic-bezier(.2,.8,.2,1)` |
| `.hero-link` | `transform 120ms, border-color 140ms, background 140ms` |
| `.hero-bar .b` | `height 400ms cubic-bezier(.2,.8,.2,1)` |
| `.dd-progress .bar` | `width 400ms` |
| `.dd-cta-main` | `transform 100ms, opacity 140ms` |
| `.card-row` | `background 110ms` |
| `.qa-explain-caret` | `transform 180ms` |

Durations across these span roughly 100-480ms — wider than the two-token
range covers. This is a **known gap for a future round**, not an oversight:
Claude Design (or a future subtraction/adoption pass) could propose 1-2
additional motion tokens if the patterns above justify it — e.g., a
mid-range ~180ms token for hover-state color/background transitions, and/or
a slower ~400ms token for the larger transform animations (flip card, hero
bar chart entrance, progress bar fills). Do not invent new duration values ad
hoc in a prototype; if the existing two tokens don't fit, name the gap
explicitly rather than picking a third arbitrary number.

---

## 6. Subtraction decisions already in effect (Commits 3-4)

These are **decisions already made and shipped**, not proposals up for
re-litigation. A prototype should assume the app already looks like this.

### Bilingual-label subtraction (Commit `fe6c698`)

Policy applied: keep the English half of a `中文 · ENGLISH` mono-label pair
only where it carries real information or rhythm; drop it everywhere it's
decorative echo of the Chinese already present (default to drop when in
doubt).

**Actual result: 0 KEPT, 52 DROPPED.** Every single one of the 52 grepped
occurrences (across 16 files in `src/lib/strings/`) landed in the DROP
category under this policy — none qualified for KEEP in practice. Worth
stating honestly: the original planning assumption that "rate buttons should
keep English" did not reflect actual app state — the four SM-2 rating
buttons in `review.js` (again/remember/hard/easy) were *already*
Chinese-only with no bilingual suffix to begin with, so there was nothing to
evaluate there. The one brand/wordmark string with a bilingual-looking
pattern (`reminders.title = 'Mnemos · 今日复习'`, the OS notification title)
is mixed-case "Mnemos," not ALL-CAPS, so it didn't match the audit's grep
pattern and was correctly left untouched as out-of-scope for this pass, not
specially exempted.

Every dropped string went from `'中文 · ENGLISH'` shape to plain `'中文'`. For
the full before/after list (all 52 strings across `activity.js`,
`collectionDetail.js`, `deckDetail.js`, `flashcardHome.js`, `import.js`,
`quizHome.js`, `quizPage.js`, `quizReview.js`, `readerPanels.js`,
`readingHomeBody.js`, `review.js`, `search.js`, `setDetail.js`,
`settings.js`), see commit `fe6c698`'s full message — that list is the
canonical reference if a specific label's reintroduction is ever proposed
(see the hard-constraint paragraph in section 8).

The same commit also unified 14 English-only `aria-label`s ("Back", "Close
menu") to Chinese equivalents, for consistency with the rest of the app's
accessibility-label language.

### Mono-font retreat (Commits `d326a9e` + `7f23bdb`)

Policy applied: `--font-mono` retreats to true data only — numbers, dates,
counts, percentages, code. A short all-caps English category label sitting
next to a number (DUE/TOTAL/PROGRESS/etc.) is chrome describing the data, not
the data itself: the label converts away from mono, the adjacent number
stays mono.

**Actual result across 96 grepped sites** (42 CSS declarations in
`src/styles/index.css` + 54 inline JSX/JS sites): 53 sites kept mono (24 CSS
+ 29 JSX/JS — genuine data: position counters, percentages, SM-2 interval
predictions, version numbers, technical values like storage paths), 43
converted (18 CSS + 25 JSX/JS) to `--font-ui` (Latin chrome) or `--font-zh`
(Chinese chrome) depending on
the actual language of that specific piece of text. Highest-visibility
changes: the Home tab bar's English labels (PRACTICE/RECALL/READING) and
`HeroSection`'s English metric labels (SETS/DUE/TOTAL/etc., ~19 call sites)
both lost their monospace treatment and now render in `--font-ui`.

Several shared CSS classes held mixed-language or mixed-role content across
different call sites and needed per-element (not per-class) treatment — e.g.
`.rv-card .corner` / `.qa-card .corner` needed a JSX-level split so the
Chinese half of a mixed label renders `--font-zh` while the English half
inherits the new `--font-ui` ambient, rather than one blanket class change.
A follow-up commit (`7f23bdb`) replaced two remaining inline
`style={{fontFamily: ...}}` overrides (`DeckDetail.jsx`'s "PROGRESS",
`SetDetail.jsx`'s "ACCURACY") with a single structural CSS rule
(`.dd-progress-row > span:first-child`), matching an existing precedent
elsewhere in the codebase, so a future third call site in the same shape
gets the correct font automatically.

Visual verification was done with real seeded data (not just empty states)
across light and dark themes; no layout breakage was found — mono's narrower
metrics left more headroom, not less.

---

## 7. Known gap — bilingual-adjacent patterns NOT yet addressed

**This section exists because a prior code review of Commit 3 flagged that
omitting it would make the subtraction audit read as more complete than it
actually is. Do not skip it when reading this document — it is the single
most important thing for Claude Design to know before starting the
redesign.**

The Commit 3/4 subtraction audits above reached exactly **one** structural
pattern: the `"中文 · ENGLISH"` combined-string pattern living in
`src/lib/strings/`, findable by grepping for that literal string shape.
There are at least four other locations where an English label sits visually
adjacent to Chinese content in a way that reads the same way to a user, but
is structurally invisible to that grep because the English and Chinese
pieces are two separate JSX elements/props rather than one combined string.
**None of these have been touched by M1 or M1b.** They are explicitly named
here as candidates for a future subtraction round, or for Claude Design's own
judgment call during the redesign — not silently carried forward as if they
don't exist.

1. **`src/components/HeroSection.jsx`'s `metrics` prop shape** —
   `{ value, label, zhLabel, accent? }`. The `label` field (English, e.g.
   `SETS`/`DUE`/`TOTAL`/`DECKS`/`CARDS`/`COLS`/`MIN`/`DOCS`) renders in its
   own `<span className="label">` sitting immediately next to
   `<span className="zh-label">{zhLabel}</span>` — visually the same
   "English next to Chinese" pattern as the strings that got dropped in
   Commit 3, just not implemented as one combined string. Consumed by
   `QuizHomeContent.jsx`, `FlashcardHomeContent.jsx`,
   `src/reading/pages/ReadingHomeBody.jsx`, plus `Settings.jsx`'s own
   separate `.settings-metrics` blocks (not routed through `HeroSection` at
   all — a parallel implementation of the same visual idea). Roughly 19
   sites total, but the `HeroSection`/`QuizHomeContent`/
   `FlashcardHomeContent`/`ReadingHomeBody` sites all funnel through one
   shared component — deciding whether `label` should exist going forward
   (drop it, keep it, restyle it) in `HeroSection.jsx` itself would resolve
   the majority of this gap in one place, not 19 separate edits.
2. **`src/pages/Home.jsx`'s tab bar** — `.tabs-tab .en` spans render
   `PRACTICE`/`RECALL`/`READING` next to each tab's Chinese label. This is
   the app's primary, always-visible navigation — three instances of the
   pattern are on screen simultaneously on every single visit to Home, which
   makes it higher-stakes than most of what Commit 3 did touch.
3. **`src/pages/Activity.jsx`'s own separate stat-row labels** — e.g.
   `ACTIVE DAYS`, `THIS WEEK`, `TOTAL`, and the ring-stat labels `RECALL`/
   `PRACTICE`/`READING` (paired with their own `.zh` spans), roughly 6 more
   sites, not routed through `HeroSection` either.
4. **`src/reading/pages/Reader.jsx`'s TOC tab label** — the panel-tab array
   includes `{ key: 'toc', label: 'TOC' }` rendered next to Chinese panel
   chrome. Worth a specific double-check because this one may simply have
   been missed by the *original* string-externalization round (the one that
   predates this token series), not just skipped by this audit's narrower
   scope — i.e. it's possible this is a leftover from an earlier gap, not a
   new one.

If you are Claude Design and the redesign naturally resolves some or all of
these (e.g. by deciding `HeroSection` labels should disappear entirely, or
render differently), that is a legitimate design decision to make in the
prototype — but make it a decision, documented as such, not a silent
omission. If you are a future CLI/human session running another subtraction
round, this list is the starting scope.

---

## 8. Hard constraint

**Prototypes may ONLY reference the token names listed in section 1's
tables.** No new colors — every color used in a prototype must be one of the
named color/shadow/code-syntax tokens above, referenced by variable name, not
a new hex/oklch literal. No new fonts — the font palette is exactly
`--font-zh` / `--font-disp` / `--font-ui` / `--font-mono`, and which one
applies to a given piece of text follows the classification policy actually
applied in Commit 4 (section 6 above): true data (numbers/dates/counts/
percentages/code) gets `--font-mono`; Chinese chrome gets `--font-zh`; Latin
chrome gets `--font-ui`; `--font-disp` is reserved for the topbar's non-`.zh`
display heading. No reintroducing a bilingual label that was dropped in
Commit 3 without written rationale specific to that label — if a specific
reintroduction is proposed, the reviewer's reference for "what was dropped
and why" is `fe6c698`'s full commit message (the complete before/after list
is reproduced in section 6 above; the original commit message has the same
list plus the per-string commentary).

Any token gap encountered while building the prototype (needing a color,
spacing value, or motion duration this document doesn't name) should be
flagged back explicitly as a proposed *addition* to `tokens.css` — not
worked around with an inline literal. That's the entire point of the
constraint: it forces gaps to surface as visible token proposals instead of
disappearing into one-off prototype CSS.
