# Implementation Prompt — Current-State UX Atlas for Design Handoff (self-contained)

You are working in the **Mnemos** repo. Produce ONE self-contained HTML file:
`design/handoff/current-state-atlas.html`. It is the "what exists today" input
for the upcoming Claude Design re-grounding round — a static, lightweight map of
every screen and key state, drawn fresh against the current app. It shows UX
structure; it is explicitly NOT a pixel-perfect clone and NOT a base for the
redesign (the old prototypes in `design/` are deliberately not part of this
handoff — do not reference or reuse them).

**Branch:** `chore/design-preview` off `main` (after `feat/design-tokens` is
merged — verify `src/styles/tokens.css` exists on `main` first; stop if not).

## Hard rules (from `CLAUDE.md`)

One logical change = one commit, `type: description`; `npm run check` green
before each commit (the atlas is static HTML — check still must pass). Never
push.

## Constraints

- **Single file**, no external requests: inline a copy of the token definitions
  from `src/styles/tokens.css` (both `:root` and `:root.dark`) at the top;
  reference ONLY `var(--*)` token names for every color/radius/shadow/font/
  spacing/motion value. Zero hex codes, zero hardcoded px where a token exists.
  System font fallbacks are fine (do not embed webfonts; note the real stacks
  in a comment).
- **Static**: no JS except one theme toggle (adds/removes `.dark` on root) and
  nothing else. No routing, no state, no interactivity simulation.
- **Structural fidelity**: read the real page JSX/CSS to get hierarchy, spacing
  rhythm, and component anatomy right; approximate rather than clone decorative
  detail. Mock data must be realistic (real-looking deck names, CJK content,
  LaTeX shown as plain text placeholder — do not inline KaTeX).
- Layout: vertical atlas, one section per screen, each section = phone-width
  (390px) frame + a caption line (screen name, route, notable states shown).
  Group by module: 记忆 / 练习 / 阅读 / 系统.

## Screens & states to cover (each once, plus listed variants)

记忆: Home-记忆 tab（含 FloatingBar）、DeckDetail（含结构视图展开态）、Review
正面 / 背面+评分条 / 「学习中 · 1/2」标记、Browse（含 leech 暂停行）、卡片空态。
练习: Home-练习 tab、SetDetail、QuizPage 选择题作答前/答错解析、QuizPage 解答题
自评、Wrong 错题本（含「生成闪卡」入口）。
阅读: Home-阅读 tab、Reader 沉浸态（chrome 隐藏）、Reader chrome 显示态（底部
工具栏+设置面板展开）、高亮面板。
系统: Activity（环+热力图）、Import（闪卡 tab + 恢复 tab）、Settings（含隔离区
危险行的出现态）、空态页一例、PromptGuide 首屏。

约 20 帧。Both themes are covered by the toggle — do not duplicate frames.

## Commits

1. `feat: atlas skeleton — tokens inline, frame grid, 记忆 module screens`
2. `feat: atlas 练习 + 阅读 module screens`
3. `feat: atlas 系统 screens + states pass`（补齐所有 listed variants，逐帧对照
   真 app 核对结构，commit body 列出任何有意省略）

## Verify before finishing

Open the file directly in a browser (no server): all frames render, theme
toggle flips everything, zero console errors, zero network requests (devtools
Network tab empty), grep the file for `#[0-9a-fA-F]{3,8}` and `oklch(` outside
the inlined token block — both must return nothing.
