# Mnemos 長生命週期 Roadmap

> 定位：個人長期使用為主，保留對外發布（含 iOS）的可能性。體量不是瓶頸，數據安全與可維護性是。
> 本文檔是後續迭代的 prompt 源：每輪迭代從這裡取一個條目，展開成 feature prompt（沿用 docs/feature-*-prompt.md 的模式）。

## 現狀快照（2026-07，v1.3.0）

- ~11k 行 JS/JSX，112 commits，三模塊（flashcard / quiz / reading）邊界清晰
- 存儲：三套獨立的 localStorage 封裝（`mnemos-*` / `examprep-*` / `reading-*`）+ IndexedDB（僅 reading bodies）
- 測試：僅 `ankiParser.test.js` 一個文件，且 package.json 無 test script
- 無 TypeScript、無 lint、無 CI
- 已有優勢：外部化 LLM 邊界（見 mnemos-review-2026-05-18.md）、formatSpec 單一事實源、逐層防禦的 parser

## 指導原則

1. **數據 > 功能 > 美觀。** 個人長期使用工具的最大風險是靜默數據丟失，其次是不敢改代碼。
2. **不推翻已驗證的邊界。** 應用層不集成 LLM API 的決策保持不變；重構只發生在應用層內部。
3. **每輪迭代可獨立交付。** 沿用現有工作流：一個 prompt → 一個分支 → build 過 → 提交。不做跨數週的長分支。
4. **重構跟著功能走。** 除 Phase 1 的基建外，不做純重構專項；改到哪個文件順手還哪裡的債。

---

## Phase 1 — 地基 ✅ 完成（2026-07-04，R1+R2）

長生命週期的前提是「敢改」。當前 11k 行零測試、零類型、零 lint，每次改動靠人肉回歸。

### 1.1 測試基建 ✅ R1
- 引入 vitest（與 vite 同生態，零配置），`package.json` 加 `"test": "vitest run"`
- 現有 `ankiParser.test.js` 接入
- **優先覆蓋純函數核心**（性價比最高、最怕回歸的部分）：
  - `sm2.js` — 調度算法，錯了直接毀複習節奏
  - `scheduler.js` — 到期判定 / 學習步驟 / leech 邏輯（v1.3.0 剛加的學習步驟狀態機最需要）
  - `mdParser.js` / `questionParser.js` — 兩個格式守門人
  - `quizEngine.js` — 六種練習模式的過濾邏輯
  - `dateUtils.js` — 時區 / 跨日邊界
- UI 不寫測試；頁面回歸繼續靠人肉

### 1.2 Lint + 格式化 ✅ R1
- eslint（flat config）+ prettier，只開 error 級規則，不追求風格潔癖
- `npm run check` = lint + test + build，作為每次提交前的門檻

### 1.3 數據層加固（最重要的一項）✅ R2（feat/data-hardening：隔離區 + Settings 恢復入口 + schema version + docs/backup-format.md）
當前風險：localStorage 是主存儲，容量 ~5MB 且可能被系統清理；`JSON.parse` 失敗時靜默返回空數據（`loadData` 的 catch 返回 `getDefaultData()`），用戶視角等於數據全丟。
- **損壞不靜默**：parse 失敗時保留原始字符串到備份 key，並在 UI 顯示恢復入口，而不是返回空默認值
- **schema version 字段**：三套存儲各自的頂層數據加 `version`，為未來遷移留鉤子（現在加成本最低）
- **導出格式凍結**：把完整備份的 JSON 結構寫成文檔（docs/backup-format.md），視為對外契約——這是十年後還能讀回數據的保證

## Phase 2 — 存儲統一（共享層 ✅ R3 完成；IndexedDB 遷移 = R4 待做）

三套 storage 封裝（`src/lib/storage.js` 309 行、`src/quiz/lib/storage.js` 388 行、`src/reading/lib/storage.js` + storageUtils）各自實現了 load/save/quota 處理，模式重複。

- ✅ **抽出共享層** `src/lib/store.js`（R3，refactor/storage-layer）：統一 load/save/quota/容錯，三模塊 + reviewLog/activity/autoBackup/reviewSession/reminders 全部收編，事件流數據獲得隔離保護。R4 遷移範圍已凍結在該分支末筆 commit body 的 audit 清單
- **主數據漸進遷移到 IndexedDB**：`idb.js` 已有現成的 KV 封裝。順序：quiz questions（單 key 最大，最容易撞 quota）→ flashcard cards → 其餘小 key 留 localStorage。每步都走「雙寫一個版本 → 確認 → 切讀」的保守路徑
- 遷移完成後，自動備份（autoBackup）改為統一從新層導出，消除 fullBackup/backup.js 裡對兩種存儲的特判

## Phase 3 — 大文件拆解 + 漸進 TypeScript（背景進行，不設專項輪）

- **Import.jsx（839 行）**：按 tab 拆成 ImportFlashcards / ImportQuiz / ImportRestore 三個子組件 + 共享的文件讀取 hook。這是改動頻率最高的頁面（每次加導入格式都碰它），拆解回報最大
- **Settings.jsx（610 行）**：按卡片分區拆子組件（BackupCard / ReminderCard / DataCard…）
- **DeckDetail / Review（563/458 行）**：低優先，等下次功能觸碰時順手拆
- **TypeScript 策略**：不做全量遷移。開 `allowJs` + `checkJs: false`，僅新文件用 .ts/.tsx；核心純函數庫（sm2 / scheduler / parsers / quizEngine）在寫測試時順手轉 .ts——類型即文檔，這幾個文件是最需要文檔的。UI 組件永遠不強制轉

## Phase 4 — Polish 清單（穿插進行，每輪 1-2 條）

按「日常使用摩擦」排序，非窮舉，用時再補：

1. **性能基線**：卡片 / 題目量增長後（>5k 卡）列表頁虛擬化（Browse / SetDetail 先做）；React.lazy 按模塊分包（reading 的 KaTeX 已 lazy，路由級也拆）
2. **統一組件語彙**：Toast / ConfirmSheet / EmptyState 已有，梳理各頁面自行實現的 loading / error 態，收斂到共享組件
3. **可達性**：評分按鈕 / FloatingBar 的觸控目標 ≥44px 覆核；深色模式對比度過一遍
4. **iPad / 橫屏**：reading 已做 max-width 適配，flashcard 複習頁和 quiz 頁補齊
5. **交互一致性**：三模塊的返回手勢、長按、滑動語彙統一（useBackButton 已共享，手勢層面對齊）
6. **空狀態 → 引導**：EmptyState 加「怎麼獲得內容」的入口（指向 PromptGuide / Import）——這同時是未來 onboarding 的雛形

## Phase 5 — 發布路徑（有意願時啟動，前置依賴 Phase 1-2）

### 5.1 iOS
- 首選 **Capacitor iOS**（`npx cap add ios`），不是原生重寫——現有 web 層直接複用，成本集中在：
  - Filesystem / LocalNotifications / Haptics 插件的 iOS 行為驗證（自動備份寫 Documents 的路徑語義不同）
  - safe area / 鍵盤 / 滑動返回手勢與 iOS 系統手勢的衝突
  - App Store 審核要素：隱私聲明（純本地無網絡採集，反而簡單）、導出合規
- 原生重寫（SwiftUI）只在 Capacitor 性能或體驗確實不可接受時考慮，且屆時 Phase 1 凍結的備份格式就是兩端的數據互通契約
- 前置：Phase 1.3 必須完成（發布給他人 = 數據丟失不可接受）；CI 加 GitHub Actions 跑 `npm run check`

### 5.2 對外發布補課清單（啟動時展開成 prompt）
- Onboarding：首次啟動的三模塊介紹 + 示例內容包（一個示例 deck / 題庫 / 文檔）
- 外部化工作流的門檻：提供「不用 CLI 也能上手」的路徑——PromptGuide 已是雛形，補充可直接複製的 chatbot prompt 模板
- i18n：僅在確有需求時做，先繁/簡，不預先架構
- 錯誤上報：保持無網絡採集原則，改為本地錯誤日誌 + 用戶手動導出

## 明確不做

- 應用內集成 LLM API（架構邊界，見複盤文檔）
- 雲同步 / 賬號系統（local-first；跨設備需求用備份文件 + 未來 iCloud/文件同步方案解決）
- 全量 TypeScript 遷移、換框架、換構建工具
- 為發布而發布的功能（社交、排行榜、統計分享）

## 排期建議

| 輪次 | 內容 | 產出 |
|---|---|---|
| ~~R1~~ ✅ | Phase 1.1 + 1.2 | vitest + 62 用例 + lint + `npm run check` |
| ~~R2~~ ✅ | Phase 1.3 | 隔離區 + schema version + backup-format.md（74 用例） |
| ~~R3~~ ✅ | Phase 2 存儲共享層 | store.js 統一六處實現（79 用例） |
| R4 | Phase 2 IndexedDB 遷移（quiz 先行） | 雙寫 → 切讀 |
| R5+ | Phase 3/4 穿插，跟功能走 | 每輪 1-2 條 polish |
| 待定 | Phase 5 | 有發布意願時展開 |

每輪照舊：從本文檔取條目 → 寫 feature prompt → 分支開發 → `npm run check` → 合併。完成的條目在本文檔劃掉並註明版本號。
