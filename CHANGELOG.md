# Changelog

## v1.4.0 — 2026-07-05

Phase B 視覺重定調：token 系統換血、AppShell 底部 tab bar、三模塊首頁與核心頁
restyle。取代兩個月前「打開即 Demo」的舊語彙。

### Token 系統

- 色彩全值改：硃砂 accent（hue 38）與洋緋 danger（hue 15）雙管分色，accent 退出
  評分行/錯題/警示等一切語義場景，只留鈐印身份、due/進度/streak 數字、active tab
- 字體軸改「內容 vs chrome」：`--font-zh` 內容宋體、`--font-ui` 全部 chrome 不分
  文種（換 Noto Sans SC）、`--font-disp` 換 Source Serif 4；Inter/Instrument Serif
  退場
- 評分行統一：重來=洋緋、困難=赭黃、記住=墨底紙字、容易=綠
- 新增 `--motion-slow`（420ms，翻卡/圖表/進度）；圓角收窄一檔
- 三層 surface token（`--surface-chrome-*`/`--surface-raised`/`--surface-overlay`）
  正式落地，AppShell 底部 tab bar 已消費

### AppShell

- 底部 tab bar 取代頂部分段 tab；L0 常駐 / L1 push 隱 tab / L2 會話全屏接管
- L2 會話內容直排 `--bg`，去卡套卡；「答」硃印替代 ANSWER 角標
- 記憶/練習/閱讀首頁 hero 卡片點擊統一導向活動總覽；streak/正確率改純 mono
  文字行（去圖標徽章）

### 清理

- Home/Activity/DeckDetail/SetDetail/Reader 遺留英文標籤（DUE/DONE/TOTAL/
  PROGRESS/ACCURACY/TOC 等）全部清理為純中文
- 移除死路由 `/reading`、死 CSS（舊頂部 tab 殘留）、HeroSection 未渲染的死屬性
- Settings 新增「載入示例內容包」入口（自撰中性學術示例：deck/題庫/文檔各一份）

### 修復

- 底部 tab bar 曾比設計稿厚近 30%（多餘 logo 行 + 強制 min-height）
- 錯題本/收藏/解答自評頁的類型徽章與按鈕配色遷移不完整
- 長標題/長麵包屑導致頂欄換行、頁碼計數器擠壓換行
- Hero 卡片點擊一度只在練習 tab 生效

### 數據說明

- 無存儲層改動、無新增字段

## v1.3.0 — 2026-07-02

五個功能閉環：自動備份、Anki 導入、SRS 學習步驟、每日提醒、錯題/高亮→閃卡。

### 自動備份

- 每日自動將完整備份寫入設備存儲（Documents/Mnemos/）
- Settings 新增自動備份開關、狀態行、立即備份按鈕
- 保留最近 7 份自動備份，超出自動刪除
- 備份文件包含閱讀文檔 bodies（IndexedDB）

### 導入 UX 清理

- Anki 導出的 .txt/.csv 文件直接導入閃卡 tab（自動識別 header 指令、HTML、cloze）
- 新增「恢復 · RESTORE」專用 tab，支持完整/僅記憶/僅練習備份
- Settings 備份卡新增「恢復備份」按鈕
- 練習備份支持合併/替換兩種模式
- 制卡指南補充 Anki 導入說明

### SRS 學習步驟 + 頑固卡

- 新卡片需兩次成功回憶才進入排程（記住→3 張後再現→畢業；容易首看即畢業）
- 失敗的學習卡片在 session 內重排（~3 張後），不再等到明天
- 成熟卡片失敗 8 次標記為頑固卡（leech）並暫停
- 暫停卡片不出現在待複習計數中，Browse 中可手動暫停/恢復
- 複習 UI 顯示「學習中 · 1/2」標記，記住按鈕顯示「稍後」而非「1d」

### 每日複習提醒

- 本地通知提醒，預測未來 7 天每天的到期卡片數量
- 可配置提醒時間，開啟時請求通知權限
- 權限拒絕時顯示 danger 提示並回退開關
- App 啟動和恢復時自動重新排程

### 學習閉環

- 錯題本新增「生成閃卡」按鈕，將當前篩選的錯題轉為閃卡
- 閱讀器高亮面板新增「生成閃卡」，帶 note 的高亮用 note 做正面
- 通過 router state 傳遞預填卡片，走現有 MD 預覽+導入流程
- 重複生成時自動去重（按正面文字匹配）

### 數據說明

- 新增 localStorage 鍵：`mnemos-auto-backup-*`、`mnemos-reminder-*`
- 新增卡片字段：`lapses`（失敗次數）、`suspended`（暫停）、`leech`（頑固卡）
- 舊數據兼容：新字段全部帶 `??` 默認值

## v1.2.0 — 2026-07-02

Polish round 3：數據安全修復 + 核心 SRS 行為修正 + 統一 UI 對話框。

### 數據安全（P0）

- 備份導出現在包含 IndexedDB 中的閱讀文檔內容（`bodies` 字段）
- 完整備份導入：自動識別 `{version, flashcard, quiz, reading}` 格式，顯示各模塊計數預覽
- 練習備份導入：識別 `{questions, progress, starred}` 格式，合併進度（已有進度不覆蓋）
- 舊格式 `{decks, cards}` 閃卡備份仍然兼容
- Import 頁 JSON 路由統一：文件選擇和拖放走同一個 `detectImportKind` 分發

### SRS 核心行為

- 「重來」評分後卡片重新排入本次複習末尾（relearning step），不再等到明天
- 撤銷 Again 評分：正確移除末尾追加的副本
- 中途退出複習：Home 繼續卡片顯示剩餘數量（非掛載時的初始數量）

### 練習模塊

- 多選題支持：自動檢測多字母答案（如 `ABD`），切換為多選模式，提交時排序比對
- 錯題本判定統一：單一 `isInWrongBook()` 規則（錯過且未連續對 2 次）應用於 Home 計數、錯題練習模式、錯題本頁面

### 統計修復

- 活動連續天數：改用 90 天窗口計算，跨月不再斷連
- 閱讀時長：殺死 Reader 後重開不再累積天量分鐘數（heartbeat + 180 分鐘上限）
- 閱讀進度持久化：節流至 ~1 秒一次（trailing write），卸載時 flush；文檔完成只計數一次

### UI 對話框

- 提取共享 `Toast` + `ConfirmSheet` 組件（`useToast` / `useConfirm` hook）
- 全部 `alert()` → toast 提示，全部 `confirm()` → ConfirmSheet（destructive 操作紅色語氣）
- `saveData` / `saveQuestions` / `saveProgress` / `saveStarred` 返回 `{ok, error}`，配額滿時上報而非靜默

### 修復

- `mergeImportData` 現在合併練習進度（之前完全忽略 `progress`）
- `saveStarred` 加配額保護（之前無 try/catch）

## v1.1.0 — 2026-05-04

Reading 模塊合入 + 三 tab UX 統一 + 閱讀器重設計。

### Reading 模塊

- 文檔管理：集合 CRUD、置頂、排序（創建/最近）
- 文檔導入：文件選擇/拖放/貼上（.md/.tex/.txt）
- 全屏閱讀器：TOC 導航、滾動進度記憶、進度條
- 高亮劃線：選中文字保存高亮，側欄管理，markdown 導出（按 TOC 標題分組）
- 書籤：保存閱讀位置，一鍵跳轉，面板內添加/刪除
- 閱讀統計：閱讀時長、完成數、連續天數、週視圖
- 全文搜索（300ms debounce）
- 閱讀設置：字號/行距/邊距即時調整（底部欄展開）
- Home 第三 tab：「閱讀 · READING」
- 路由：`/reading`、`/collection/:id`、`/reading/doc/:id`

### UX 統一

- 三 tab 底部 bar：左 ghost 導入，右 primary 新建
- 一級卡片：全部 `.deck` + spine + glyph，統一點擊導航
- 二級頁面：dd-head → filters → card-list → dd-cta → dd-secondary 統一架構
- Continue card：三 tab 統一 `.deck` 佈局，右側 ✕ dismiss
- 卡片右側 CTA pill：記憶[复习→]、練習[练习→]、閱讀[阅读→]，各有獨立語義
- 刪除按鈕：三 tab 統一 `opacity-40 hover:opacity-100`
- 刪除確認：全部加「此操作不可撤销」
- 完成頁面返回按鈕：統一 `goBack`（返回上級）
- 記憶 tab 加「繼續複習」卡片（Review 中斷 session 保存）
- Reading collection 加 pin（置頂）
- Reading HeroSection 週視圖（閱讀分鐘數 7 日 chart）

### 閱讀器重設計

- 頂欄簡化為 back + 標題，功能按鈕全部移至底部欄
- 底部功能欄：[TOC] [高亮] [書籤] [設置]，點擊內容區統一切換顯示/隱藏
- 滑動不再觸發 bar 顯示，沉浸閱讀不打斷
- 設置點擊在底部欄上方展開字號/行距/邊距
- 默認進入時 bar 隱藏，沉浸閱讀優先
- iPad 全屏適配（內容區 max-width: 680px 限制行長）
- 書籤面板內：添加書籤 + 導出高亮

### 返回導航

- `useBackButton` 重構為宣告式 route tree，新增路由只需一行
- 層級對稱：`/review/:id` → `/deck/:id` → `/` / `/reading/doc/:id` → `/collection/:id` → `/`
- 硬體返回走明確 parent 而非瀏覽器歷史

### 清理

- 移除 `typescript` devDep — `capacitor.config.ts` → `.json`
- 移除 `mergeQuestionFiles`、`validateQuestion`、`getQuestionProgress`、`resetProgress` dead export
- 刪除 `moveCollectionUp`/`moveCollectionDown`（reading 改用 pin）
- 刪除 `.cta-done`、`.line-clamp-3` 死 CSS
- 移除 Import 頁「即将推出」禁用按鈕
- 移除 `issues.md`、`ROADMAP.md`、`PROJECT_PROMPT.md`（已過期）
- Reading sort chip 簡化為「創建」「最近」

### 修復

- 高亮 snippet 從 DOM textContent 提取
- 文件導入失敗 alert（原靜默吞錯）
- 側滑返回不再疊加 listener（ref 替代 useEffect deps）
- Reader `useEffect` dep `navigate` → `goBack`
- Reader 滾動恢復加 `requestAnimationFrame`
- 高亮觸摸延遲 150→50ms，保存後閃一下選中文字
- SetDetail 導入連結補 `?tab=json`

## v1.0.0 — 2026-05-03

正式發行版。全量 OCR 題庫流水線 + 時間線修復 + 全面 audit + UI 精煉。
