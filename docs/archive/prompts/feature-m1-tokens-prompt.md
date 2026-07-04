# Implementation Prompt — M1 Tokens + M1b Subtraction Audit (self-contained)

You are working in the **Mnemos** repo. Groundwork for the visual re-grounding
(roadmap-maturity M1/M1b): formalize the token system into three layers, add the
missing token families (surface / motion / type scale / spacing), and run a
conservative subtraction pass on the style vocabulary that reads as
"AI-generated demo". This round is NOT a redesign — the parchment/graphite
oklch palette and serif identity are good and stay untouched. Claude Design
gets the redesign later, constrained by the tokens this round produces.

**Branch:** `feat/design-tokens` off `main`.

## Hard rules (from `CLAUDE.md`)

Read files before editing; minimal incremental edits. One logical change = one
commit, `type: description`; `npm run check` green before each commit. Stage
specific files only. Never push.

## Context (read first)

- `src/styles/index.css` — `:root` + `:root.dark` blocks hold all tokens today
  (~50 vars, 372 usages). Names are already quasi-semantic (`--bg-card`,
  `--ink-2`) — do NOT rename them; 372-site churn is not this round.
- 313 inline `style={{}}` blocks across JSX — many hardcode transitions,
  sizes, mono-font styling. Full cleanup is out of scope; only tokenize what
  commits 3-4 touch anyway.
- `src/lib/strings.js` — flat 713-line module from the previous round. Commit 0
  splits it before the audit edits it.

## Commit 0 — `refactor: split strings.js into per-domain modules`

`src/lib/strings/` directory, one file per top-level group (or sensible
cluster), barrel-exported from `src/lib/strings.js` so all call sites are
untouched. Zero string edits in this commit — pure file moves; the audit
commits below need small files to edit reviewably.

## Commit 1 — `feat: three-layer token structure in tokens.css`

New `src/styles/tokens.css`, imported at the top of `index.css`. Move the
existing `:root` / `:root.dark` var blocks there unchanged, then add:

- **Type scale** (Dynamic Type-ready): `--text-xs/sm/base/lg/xl/2xl/3xl` in
  `rem`, ratio ≈1.2, `--text-base: 1rem`. Also `--leading-tight/normal/relaxed`.
  Do not convert components yet — the scale exists so Claude Design and later
  rounds have named steps.
- **Spacing**: `--sp-1` (4px) … `--sp-8` (64px), 4/8 grid.
- **Motion**: `--motion-quick: 120ms cubic-bezier(0.2, 0, 0, 1)` and
  `--motion-gentle: 240ms cubic-bezier(0.2, 0, 0, 1)`. Plus a global
  `@media (prefers-reduced-motion: reduce)` rule zeroing transition/animation
  durations.
- **Surfaces** (composite semantics, both themes):
  `--surface-chrome` (bars: translucent bg + `backdrop-filter` blur token),
  `--surface-raised` (cards), `--surface-overlay` (sheets/modals). Compose from
  existing primitives; where a surface needs multiple properties define
  `--surface-chrome-bg`, `--surface-chrome-blur`, `--surface-chrome-border`.

## Commit 2 — `refactor: adopt motion and surface tokens`

- Replace every hardcoded `transition: … <N>ms` in CSS and inline JSX styles
  (grep `transition`) with the motion tokens. StructureTree's inline 120/150ms
  are known instances.
- Convert the tab bar / topbar / FloatingBar / sheet backgrounds to the surface
  tokens. Pixel-identical output is the acceptance bar — this commit changes
  where values live, not how anything looks.

## Commit 3 — `tweak: subtraction audit — bilingual labels`

In `src/lib/strings/` only (no component logic changes). The
`中文 · ENGLISH` mono-label pattern is the loudest "AI demo" tell. Policy:

- KEEP the English half only where it carries real information or rhythm:
  the four rate buttons, brand/wordmark surfaces, PromptGuide title.
- DROP the English half everywhere it is decorative echo: section heads
  (`热力 · HEATMAP` → `热力`), stat labels (`ACTIVE DAYS` under a number that
  already has a Chinese label), hero cards, empty states.
- Produce the full before/after list in the commit body. When in doubt, drop —
  Claude Design can reintroduce deliberately later.
- Unify the 14 English-only `aria-label`s (Back/Close etc., flagged last round)
  into Chinese via strings modules in this commit.

## Commit 4 — `tweak: subtraction audit — mono font scope`

Mono (`--font-mono`) retreats to true data: numbers, dates, counts, streaks,
code. It leaves: section-head labels, buttons, nav, prose captions (become
`--font-ui` or `--font-zh`). Grep `font-mono` (Tailwind class) and
`var(--font-mono)` (CSS/inline); classify each site in the commit body as
kept-data / converted. Expect mostly CSS + className edits; visual diff is
intentional here (this is the one commit that may change appearance) — screenshot
the main five pages both themes before/after and eyeball for breakage.

## Commit 5 — `docs: design-tokens.md — Claude Design constraint sheet`

The handoff artifact (roadmap-maturity M1b protocol step 1 input). Contents:
full token table (name / role / light / dark value), the three-layer rule,
surface composition rules, type scale + spacing grid, motion policy, the
subtraction decisions from commits 3-4 with rationale, and the hard constraint
paragraph: prototypes may ONLY reference these token names; no new colors, no
new fonts, no reintroduction of dropped bilingual labels without written
rationale per label.

## Out of scope

Renaming existing token vars; converting components to the type scale;
touching the 313 inline styles beyond motion/mono/surface sites; any palette
change; AppShell (M2); the redesign itself.

## Verify before finishing

`npm run check` green per commit. Dev-server visual pass on Home / Review /
QuizPage / Reader / Activity in both themes: commits 1-2 pixel-identical
(toggle `prefers-reduced-motion` to confirm the zeroing rule), commits 3-4
show only the intended label/font changes, no layout breakage.
