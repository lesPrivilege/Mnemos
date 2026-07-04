# Activity Dashboard · Design Brief

## 功能定位

純讀取聚合儀表板，不寫入任何數據，不與三個模塊耦合。
入口：首頁 hero（三個 tab 的週視圖）點擊進入 `/activity`。

## 現有數據源

三個模塊各自記錄了可聚合的時間序列，均為 `{ date, count }` 結構：

| 模塊 | 數據源 | 聚合維度 |
|------|--------|---------|
| 記憶 | `mnemos-review-log.entries[]`（timestamp + quality 1/2/4/5） | 每日複習次數、正確率 |
| 練習 | `examprep-progress`（last_attempt + status correct/wrong） | 每日做題數、正確率 |
| 閱讀 | `reading-stats.sessions[]`（startedAt + minutesRead） | 每日閱讀分鐘數 |

## 需要的視覺元素

1. **時間軸摘要** — 本月/本週的總活動量概覽
2. **按日分解** — 每天一個單元，顏色深淺代表活動量
3. **按模塊分解** — 記憶/練習/閱讀三條線
4. **連續天數** — 三個模塊取聯集（任一模塊有活動即計入）

## 兩種視覺方向（請各出一個方案）

### A. 月曆熱力圖

類似 GitHub contribution graph / Duolingo 月曆。本月每天一個格子，顏色深淺 = 當天總活動量。點擊某天展開下方明細。下方三條摘要：記憶 N 次、練習 N 題、閱讀 N 分鐘。

參考：Duolingo streak calendar、GitHub contribution graph、Kindle reading insights

### B. 圓環進度

類似 Apple Fitness 三環。三個圓環分別代表記憶/練習/閱讀，環的完成度對應每日/每週目標。環內顯示數字。下方可滑動切換日/週/月視圖。

參考：Apple Fitness rings、Oura Readiness score

## 約束

- 只讀聚合，無寫入操作
- 首頁 hero 點擊進入（三個 tab 共用一個入口）
- 數據已存在，不需要新建存儲 key
- 頁面獨立路由 `/activity`，不修改現有三 tab 邏輯

## 不做

- 目標設定/每日計劃（需要寫入）
- 日程安排（需要獨立 CRUD）
- 模塊內 drill-down（已有各自詳情頁）
