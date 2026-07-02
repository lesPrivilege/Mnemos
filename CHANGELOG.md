# Changelog

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
