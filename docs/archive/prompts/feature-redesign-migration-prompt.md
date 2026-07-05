# Implementation Prompt — Redesign Migration + Preview Demo (self-contained, one-pass)

You are working in the **Mnemos** repo. Port the approved Phase B redesign into
the real component stack, in one continuous run. Inputs: the Phase B full
prototype HTML (placed at `design/handoff/phase-b-full.html` — single source of
visual truth) and the approved token ruling (values embedded in that file's
token block; five rulings + riders summarized below so this prompt stands alone).

**Branch:** `feat/redesign-migration` off `main`.

## Workflow policy (tiered — replaces subagent-per-task)

Single implementer agent carries the whole branch; orchestrator reviews diffs
directly. Independent review agents ONLY for: Commit 1 (token swap), the
AppShell commit, and one final holistic pass. Dispatch with exact file lists +
digests; no exploratory reading. Mock/sample data anywhere must be
self-authored neutral academic text — never real book excerpts.

## Approved rulings being implemented (do not re-litigate)

1. 硃砂 accent hue 38 / danger hue 15；accent 退出一切語義場景（僅：鈐印身份、
   due/進度/streak 數字、active tab）。
2. 行動＝墨：主 CTA 與評分「记住」墨底紙字；評分行 重来=danger / 困难=rate-hard
   / 记住=墨 / 容易=good。
3. 字體軸「內容 vs chrome」：--font-zh=內容宋體；--font-ui=全部 chrome 不分文種
   （值補入 Noto Sans SC）；--font-disp=Source Serif 4（詞標+展示數字）；
   --font-mono=真數據不變。
4. L2 容器紀律：會話內容直排 --bg，無卡套卡；角標語彙刪，「答」硃印替代。
5. --motion-slow: 420ms 新增。

Riders（驗收條款）: (a) 全部 text-on-soft 色對雙主題過 WCAG AA，交對比度表；
(b) 分隔線一律 1px + --border-soft，禁 0.5px；(c) 字體政策修訂寫進
docs/design-tokens.md §6（Commit 4 分類表改「內容 vs chrome」軸）。

## Commits (suggested order; split further if a step exceeds ~400 lines diff)

1. `feat: swap token values to Phase B ruling` — tokens.css 全值替換（照
   prototype token 塊逐值抄，雙主題）+ `@fontsource/source-serif-4` 進、
   `@fontsource/instrument-serif` 退 + --motion-slow。此筆過獨立 review。
2. `docs: revise font classification policy` — design-tokens.md §6 修訂 +
   對應 CSS 類（中文 chrome 標籤/按鈕/tab 改 --font-ui）。
3. `feat: AppShell — bottom tab bar and three-layer chrome rules` — 底部 tab
   取代頂部 tab；L0 tab 常駐 / L1 push 隱 tab / L2 全屏接管（Reader 現有模式
   推廣到 Review/Quiz 會話）；useBackButton 每層行為核對；URL 直達可重建。
   此筆過獨立 review。
4-N. `feat: restyle <module> per phase-b` — 按 記憶 / 練習 / 閱讀 / 系統 分批,
   逐幀對照 prototype；每批 `npm run check` + 真瀏覽器目測。前瞻三頁（導圖/
   onboarding/內容包）**不在本輪實現**——它們是設計資產，功能未到；只留
   prototype 為將來的 spec。
N+1. `feat: seed demo content pack` — 自撰示例 deck/題庫/文檔各一小份,
   Settings 或首開空態提供「載入示例」入口（onboarding 雛形）。
N+2. `docs: refresh README screenshots` — 真機/模擬器雙主題總覽圖重拍,
   替換 assets/screenshots 兩張；README 若有描述過時處順手校（不重寫）。
N+3. `docs: archive migration prompt, mark roadmap` — 本文件入 archive；
   roadmap-maturity M1b 劃線。

## Out of scope

前瞻三頁的功能實現；GitHub Pages 部署（另輪決定）；i18n；任何存儲層改動。

## Verify before finishing

`npm run check` 每筆綠；對比度表交付；雙主題真瀏覽器全頁走查（含 L2 三會話的
chrome 接管與返回行為）；Android WebView 至少一次真機/模擬器啟動確認字體與
髮絲線渲染；`git status` 乾淨。
