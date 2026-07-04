# Design Brief — Mnemos 視覺重定調（M1b Redesign Round）

交付對象：Claude Design。連同本文件一起交付的還有兩份輸入：
**docs/design-tokens.md**（token 約束書，其第 8 節硬約束優先於本文件一切內容）、
**design/handoff/current-state-atlas.html**（現狀圖譜，~22 幀）。舊 prototype
（design/ 下其餘文件）刻意不在交付範圍內——不要去找、不要參考。

## 0. 一句話任務

在給定 token 系統內，把一個「打開即 AI demo」的界面重畫成一件克制但有承載力的
經典單品。調色板、字體、圓角、陰影都已定死（tokens），你的工作面在：排版層級、
密度節奏、留白、組件形態、以及對「已知缺口」清單的逐項設計裁決。

## 1. 產品語境（設計需要知道的最小集）

Mnemos 是 AI-native 時代的學習工具：**學習內容由 LLM 在應用外產出**（結構化
markdown / JSON），應用本身是這些內容的最佳消費端——SM-2 閃卡複習、題庫練習、
markdown 閱讀三模塊。Local-first，無後端無賬號。用戶是長期日常使用者，工具的
使用摩擦直接決定學習堅持率——這是「克制」的產品理由，不只是審美偏好。

## 2. 參照系與反參照系

**身份錨點**：應用 icon（scripts/ic_foreground.svg，隨 atlas 附截圖）。它是純
`--ink` + `--accent` 二色構成，已定案不重做——prototype 的氣質向 icon 對齊：
墨 + 赭石、襯線、無漸變。如果某個設計方向讓 icon 顯得格格不入，錯的是方向。

**參照系**：iA Writer、Bear、Things。共同點：幾乎沒有可被模仿的風格特徵，只有
難以模仿的執行精度。層級靠字號字重而非顏色框線；深度（陰影/模糊）用得吝嗇；
控件讓位於內容。**中文排版精度是本產品可建立身份、而參照系未覆蓋的地方**——
`--font-zh`（Noto Serif SC）的正文節奏、標點懸掛、字距是主戰場。

**反參照系（禁用語彙）**：mono 小字+拉字距的 `中文 · ENGLISH` 雙語標籤（已被
系統性刪除，見 tokens 文檔第 6 節，禁止不帶書面理由地重新引入）；裝飾性漸變；
每個角落均勻打磨的「均質感」——關鍵路徑（複習卡片、閱讀正文、答題）做到 98 分，
次要處（設置、關於）敢於樸素，不均勻本身是判斷力的痕跡。

**不要仿真 iOS 控件外觀**。HIG 取原則層（清晰、讓位、克制的深度），不取控件皮
——WebView 裡的假 native 是恐怖谷。

## 3. 設計裁決清單（必須逐項給出決定並記錄理由)

tokens 文檔第 7 節列出的四個「雙語相鄰」缺口，這輪由你裁決：

1. `HeroSection` 的 `label`（英文）字段——刪除 / 保留 / 重構,一處決定覆蓋 19 站點
2. Home tab bar 的 `.en` 副標（PRACTICE/RECALL/READING）——全 app 最高可見度
3. Activity 的獨立英文 stat 標籤（ACTIVE DAYS 等 ~6 處）
4. Reader 的 `TOC` tab 標籤

每項在 prototype 註釋中寫一行裁決理由。傾向刪，但這是你的決定權。

## 4. 覆蓋範圍

**現有頁面**（以 atlas 的 ~22 幀為準，逐幀重畫）：記憶（Home tab、DeckDetail
含結構視圖、Review 三態、Browse 含 leech 行、空態）、練習（Home tab、SetDetail、
QuizPage 三態、Wrong）、閱讀（Home tab、Reader 沉浸/chrome 雙態、高亮面板）、
系統（Activity、Import 雙 tab、Settings 含隔離區行、PromptGuide 首屏）。

**前瞻頁面**（規劃已定案、趁本輪一次畫出，避免將來風格斷層）：

- **導圖視圖**：DeckDetail/SetDetail 的大綱⇄導圖切換；橫向樹、節點三檔掌握度
  着色（--danger/--accent/--good 語義）、fit 控件。移動端豎屏優先。
- **首開 onboarding**：三模塊引導 + 示例內容包入口，冷啟動第一屏。本輪重定調
  的驗收場景就是「冷啟動第一眼不像 demo」。
- **內容包瀏覽頁**：瀏覽→下載→導入單頁（未來靜態索引的消費端），列表 + 詳情
  兩態即可。

## 5. AppShell 佈局約束（畫法要求，不是頁面）

chrome（tab bar / 頂欄 / FloatingBar）與頁面內容必須在結構上可分離：頁面內容
區不得依賴特定殼形態的尺寸或位置。原因：後續 iOS 可能換原生 tab bar、iPad 換
sidebar。prototype 裡用同一套頁面內容演示至少兩種殼形態（手機底部 tab、iPad
sidebar）各一幀即可證明分離成立。

## 6. 交付格式

單文件 HTML prototype：內聯 tokens（從 design-tokens.md 第 1 節表格複製）、
只准引用 `var(--*)` token 名、雙主題（`.dark` 切換）、手機幀 390px 寬、每幀帶
標題與裁決註釋。無 JS 交互模擬（主題切換除外），交互用註釋說明。遇到 token
缺口，按 tokens 文檔第 8 節要求以「token 提案」形式顯式標注，禁止內聯字面值
繞過。

## 7. 接力後續（供知悉）

你交付 prototype 後：CLI 將其翻譯為真組件棧的 `/design-preview` 純渲染路由，
輸出構建後 HTML 回傳給你對照批改，預期收斂 2-3 輪。你的裁決註釋和 token 提案
是每輪 diff 的錨點——寫清楚，後面省三輪。
