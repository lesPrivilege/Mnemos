# Mnemos 成熟度 Roadmap — 從 Demo 到可發布產品

> 與 docs/roadmap-long-term.md 並行：那份管地基（測試/存儲/重構），這份管「成熟」——
> 解耦邊界、品味、系統集成、以及發布後的少量線上能力。
> 產品定位一句話：**AI-native 時代的閃卡——學習文檔由 LLM 在外部產出，Mnemos 是它的
> 最佳消費端。** 體量小、功能簡單，都不是瓶頸；品味和實用性是全部競爭力。

## 判斷前提

Demo 和成熟產品的差別不在功能量，在邊界是否存在。下面每一節都是一條「越晚做越貴」
的邊界——每加一個頁面都在加深耦合。反過來，功能本身（widget、分享、同步）都是邊界
在位後的薄實現。

---

## M1 — 設計語言解耦：token 三層

現有 CSS 變量（`--bg-raised`、`--danger`）只有一層。正式化為：

```
primitive   --gray-900, --blur-20          原始值，只被 semantic 引用
semantic    --surface-chrome, --ink-2      角色命名，組件唯一消費層
component   tab bar / sheet / card         只用 semantic，零硬編碼
```

- **表面材質提升為一等 token**：`--surface-chrome`（bar 類）/ `--surface-raised`
  （卡片）/ `--surface-overlay`（sheet），各自封裝背景+模糊+邊框+陰影組合。
  液態玻璃在 web 層 = `backdrop-filter: blur() saturate()` 的一種 surface 實現。
  材質抽象在位後，跟進 Liquid Glass / Material You 只改 token 定義文件。
- **動效 token**：`--motion-quick` / `--motion-gentle` + 全局尊重
  `prefers-reduced-motion`。清理散落的內聯 `transition: 120ms`（StructureTree 等）。

### M1b — 視覺重定調（與 token 化同批，2026-07 補充）

背景判斷：現有 UX 為兩個月前 Claude Design 交付，其風格語彙（mono 雙語標籤、
深色卡片、accent 點綴）已因大量湧現而俗套化，「打開即 Demo」。token 化若只整理
現值，等於把俗套凍結成契約。因此 M1 同批做重定調：

- **錨點：Apple HIG 的原則層，不是控件皮**。層級靠字號字重、深度吝嗇、控件讓位
  內容。不在 WebView 仿真 iOS 控件外觀（假 native 是恐怖谷）。字階採 Dynamic
  Type 比例邏輯（接 M4 動態字體）、間距 4/8 網格、材質只留 chrome 一層模糊。
  中文排版精度是 HIG 未覆蓋、Mnemos 可建立身份的地方。參照系：iA Writer / Bear
  / Things——無可模仿的風格特徵，只有難以模仿的執行精度。
- **減法審計**：雙語標籤只留有信息量處（如評分按鈕），餘降純中文；mono 字體收縮
  到真數據場景（數字/日期/統計）；裝飾漸變與圖標密度砍半。細節打磨度允許不均勻
  ——關鍵路徑 98 分，次要處敢於樸素。
- **字符串外置**（i18n 預留的正確形式）：用戶可見文案收進 `src/lib/strings.js`
  平面模塊（含 lib 層的 quota 錯誤文案），不引 i18n 框架。換語言 = 換文件。
- **首開體驗**：命名與 icon 已撐得住，首屏必須接住——splash 到首幀無白閃無跳動
  （M4 已列），Home 首屏是產品的臉，重定調的驗收以「冷啟動第一眼不像 Demo」為準。

### Claude Design 接力協議（M1b 完成後啟動）

1. **盤點 brief**：全頁面/全狀態清單 + 新 tokens + 反俗套約束（禁用其默認語彙、
   給定參照物）+ HIG 原則摘要。
2. **Claude Design**：單文件 HTML prototype，硬約束**只准用 brief 給定的 token
   變量名**，禁自帶調色板。
3. **CLI**：翻譯成真組件棧的純渲染預覽（`/design-preview` 路由，真組件 + mock
   數據、零業務邏輯），輸出構建後 HTML 截面。
4. **回傳批改**，兩方傳 HTML 收斂 2-3 輪。工作模式沿用 `design/v2-redesign`。

依賴順序：M1 token 減法審計 → 接力啟動（否則 Claude Design 拿到的仍是俗套
token 表）。啟動前提：功能盤完（P2 導圖、R4+1 等在跑事項收尾）。

- 產出：`src/styles/tokens.css` + `docs/design-tokens.md` + `src/lib/strings.js`
  + 盤點 brief（給 Claude Design 的約束輸入，導圖 mock 那輪就能用上）。

## M2 — Chrome 與內容解耦：AppShell

原則：**路由是唯一事實源，Home 排版只是殼之一。**

- tab bar / FloatingBar / 頂欄收斂為 AppShell 層；頁面組件不感知殼的存在。
  未來 iOS 換原生 tab bar、iPad 換 sidebar、bar 懸浮半透明——只動殼。
- 驗收標準：**每個頁面可從 URL 冷啟動直達且狀態完整。** 這是 widget、通知 action、
  Shortcuts、Spotlight、分享擴展的共同前提。question deep link 已有，補齊全量。
- 與 roadmap-long-term Phase 3 拆大文件同批做（順手，避免二次過火）。

## M3 — 格式即 API

不集成 LLM 的架構決策，意味着對外接口就是文件格式。把格式當 API 對待：

- **內容分發包**：一個 deck / 題庫 / 文檔集的自包含文件（`.mnemos` 或帶 manifest
  的 zip），version + 類型 + 元信息。三個用途：示例內容包（onboarding）、用戶間
  分享、未來線上內容索引的載體。備份格式（roadmap-long-term Phase 1.3）是其子集。
- **URL scheme 正式契約**：`mnemos://review/:deckId`、`mnemos://import?src=...`。
  通知「直接開始複習」、widget 點擊、外部工具喚起全靠它。
- **事件流 schema 化**：reviewLog/activity 已是雛形；定義正式 event schema 後，
  統計、熱力圖、widget 數據、未來成就系統全部派生，不再各頁自算。
- **Prompt 模板即產品面**：PromptGuide 升級為「複製即用」的模板庫（按 chatbot /
  CLI 場景分組，含 formatSpec 的最新契約）。這是 AI-native 定位的正門——用戶的
  第一個 deck 應該在十分鐘內從任意 LLM 產出。

## M4 — 品味清單（穿插，每輪 1-2 條）

不是功能，是質感。全部小改動，累積成「成熟感」：

- 動態字體（Dynamic Type / 系統字號縮放），現在是固定 px
- VoiceOver / TalkBack 過一遍複習主流程；評分按鈕語義標籤
- 場景恢復推廣到 quiz / reading（reviewSession 模式已驗證）
- 空/錯/載入三態全頁面覆蓋審計（EmptyState 已有，查漏）
- 首幀體驗：splash → 首屏無白閃、無佈局跳動
- 觸覺反饋語彙表：哪類操作用哪檔 haptic，寫成一頁規範（已有 haptics.js，缺規範)
- 文案審校：全部用戶可見文案過一遍，統一語氣（克制、不賣萌、不感嘆號）

## M5 — 系統集成（M1-M3 在位後的薄實現）

- iOS/Android widget：今日到期數 + 一鍵進入複習（讀事件流派生數據，點擊走 URL scheme）
- 通知 action：「開始複習」不經過 Home
- 分享擴展：任意 app 選中文本 → 分享到 Mnemos → 進入導入流
- App Shortcuts / Spotlight：deck 名可搜索直達

## M6 — 線上能力（發布後，可選，刻意小）

原則：**local-first 不動搖，線上只做「可有可無但有了更好」的薄層**，無賬號系統、
無自建後端優先：

- **跨設備同步**：iCloud Drive / 系統文件同步承載備份文件，應用只做衝突提示
  （最後寫入勝 + 手動恢復），不做實時同步引擎。
- **內容包索引**：一個靜態託管的 JSON 索引（GitHub Pages 級別），指向社區/官方
  內容包下載。應用內只是一個「瀏覽 → 下載 → 導入」頁。無上傳、無評論、無賬號。
- **模板庫在線更新**：PromptGuide 的模板從靜態 JSON 拉取最新版，離線用內置版。
- 明確不做：實時協作、雲端 SRS 狀態同步、社交功能、自建 API 服務。

## 與 roadmap-long-term 的合流

| 本文檔 | 依賴 | 建議插入點 |
|---|---|---|
| M1 tokens | 無 | 隨時可做，導圖 mock 前最佳 |
| M2 AppShell | 無 | 與 Phase 3 拆大文件同批 |
| M3 格式契約 | Phase 1.3 備份格式 | Phase 2 之後 |
| M4 品味清單 | 無 | 穿插，同 Phase 4 polish 池合併 |
| M5 系統集成 | M1-M3 + Phase 5 iOS | 發布輪 |
| M6 線上能力 | M3 內容包格式 | 發布後按需 |

完成條目在本文檔劃掉並註明版本號。
