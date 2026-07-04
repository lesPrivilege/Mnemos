# Design Brief 補遺 — 調色板解凍 + 兩段式發散協議

本文件修訂 `docs/design-brief-m1b.md`。衝突處以本補遺為準。

## 修訂一：調色板從「不動項」改為「裁決軸」

原 brief 及 design-tokens.md 第 8 節將調色板凍結。撤銷。理由：暖米底 + 赭石
+ 襯線的組合已成為「Claude 生成」的視覺簽名，兩個月間從品味引用折舊為模板味,
與本輪「脫離 AI demo 語彙」的目標直接衝突。

約束改為：**token 名與三層結構不變，值開放提案。** 雙主題成對給出；語義色
（good/warn/danger/rate-hard）保持可讀性對比；icon 構圖不變、兩色從新 token
重導出（scripts/gen-icons.mjs，splash 同步）——icon 的形是定案，色跟 token 走。

方向錨（傾向，非指令）：brief 已定「中文排版精度」為身份主戰場，色彩可向同一
身份靠攏——紙墨系（近白宣紙底、墨階、克制的印章色 accent）目前未被任何 AI
工具佔用。帶理由提案，可推翻此錨。

## 修訂二：兩段式協議（替代原 brief 第 7 節的直接出全稿）

### Phase A — 發散（本階段 token 值約束不生效）

產出 **三塊方向板**（direction boards），各為一個小 HTML：只畫 3-5 個關鍵幀
（Home、Review 卡片正反、Reader 正文、Activity 任選其二），每塊帶自己的完整
色彩/字階/密度提案與一段設計論述（這個方向是什麼、拒絕了什麼、為何撐得起
十年）。三塊必須**互相真正不同**——不是同一方案的三檔明度。

Phase A 仍然生效的硬約束（身份層，不是 token 層）：

- 內容取自 atlas，真數據真文案，不得虛構功能
- 反俗套清單（原 brief 第 2 節）全部有效
- icon 構圖為身份錨；中文排版精度為主戰場
- 不仿真 iOS 控件外觀
- 動效可以做（direction board 允許 JS/CSS 動效演示），但每個動效須標注
  將來收斂為哪個 motion token 檔位

### Gate — 人工裁決

用戶選定一個方向（或指定兩塊的雜交）。品味決策權在人，不在任何一方 agent。

### Phase B — 收斂（token 硬約束恢復全效）

被選方向先形式化為**完整 token 值提案**（沿用現有 token 名，逐個給新值,
含雙主題），經確認後寫回 tokens.css 成為新的第 8 節硬約束；然後才產出全量
24 幀 prototype，規則同原 brief 第 6 節（只准引用 token 名、缺口以 token
提案形式顯式標注）。原 brief 第 3 節的四項裁決清單、第 4 節前瞻頁面、第 5 節
AppShell 約束全部在 Phase B 交付。

### 後續回遷不變

Phase B 全稿 → CLI（或 Codex）翻譯為 /design-preview 真組件渲染 → 回傳批改，
收斂 2-3 輪。README 的對外預覽用回遷後的真機截圖，不用設計稿鏈接。

## 修訂三：導航架構（Phase A 即生效的結構決定）

原 brief 第 5 節只要求「殼可替換」，本節把導航形態定案，方向板直接按此畫：

**底部 tab bar 取代現行頂部 tab。** 三模塊切換是應用級模式切換,不是同層內容
分類；底部 tab 是 iOS 與 Android 的共同慣例。平台差異只在材質：iOS 向液態
玻璃靠（WebView 期用 `--surface-chrome` 近似，點到為止），Android 傳統不透明
底欄。形態同一,皮由 token 分派。

**三層深度規則**（全 app 一以貫之）：

- L0 模式根（三 tab 首頁）：tab bar 常駐
- L1 瀏覽層（DeckDetail/SetDetail/Browse/Activity/Import/Settings）：push
  進入，tab bar 隱藏，頂欄返回
- L2 沉浸層（Review 會話/Quiz 會話/Reader 正文）：全屏接管、chrome 全隱、
  自帶退出語彙（Reader 現有形態是基準，Review/Quiz 向它對齊）。核心體驗層,
  打磨度傾斜於此

轉場語彙按層綁定（L0→L1 push、L1→L2 takeover），Android 返回鍵/iOS 邊緣滑退
每層行為可預期，任何頁面 URL 冷啟動直達時導航棧可重建（M2 驗收標準）。

方向板（Phase A）至少一幀展示 L0 帶底部 tab 的形態；Phase B 全稿按三層規則
覆蓋全部頁面，並保留原 brief 第 5 節「同一內容 × 手機底欄/iPad sidebar 兩殼」
的分離證明。

## 經濟學說明（為何這樣切）

發散便宜在幀少（3-5 幀 × 3 方向 ≈ 一份全稿的工作量），收斂貴在幀多（24 幀 +
前瞻 3 頁）——所以自由給在幀少的階段，紀律給在幀多的階段。方向錯誤在 Phase A
被人工 gate 攔下的成本是一塊方向板；若按原協議直接出全稿，同樣的錯誤要返工
24 幀。
