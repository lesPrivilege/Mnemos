# Mnemos

間隔重複記憶 + 題庫練習 + 閱讀。SM-2 算法驅動閃卡複習，支持選擇題/解答題練習，內建 markdown 文檔閱讀器。

[Download APK (v1.0.0, 36MB)](https://github.com/lesPrivilege/Mnemos/releases/tag/v1.0.0)

## 設計判斷

Mnemos 在架構上做了一個明確選擇：**不在程序內集成 LLM API，只消費結構化輸入**。

閃卡的 markdown 結構、題庫的 JSON、閱讀的文檔——這些內容的生成、整理、結構化工作，全部由外部的 CLI 工具與本地 skill 完成（reading-companion、md-cleaner 等）。Mnemos 只負責**呈現、調度與用戶交互**。

這個分工帶來幾個結果：

- 應用層邏輯穩定，不隨模型迭代或 prompt 調整而折舊
- 內容生成的複雜度（context 組裝、prompt 工程、輸出校驗）被隔離在外部工具中
- 結構化文檔本身作為持久產出，獨立於任何具體 LLM 客戶端存在

這個設計最初的動機是務實的——在程序裡集成 LLM API 比較麻煩，外部化省事。但實踐下來發現，這個邊界劃分恰好讓應用層具備了對模型層變化的抗折舊能力。

## 技術棧

React 18 · Vite 6 · Tailwind 3 · Capacitor 8 · marked + KaTeX + DOMPurify

## 三個模塊

| 模塊 | 入口 | 功能 |
|------|------|------|
| 記憶 | Home tab 1 | SM-2 閃卡複習、卡組管理、撤銷 |
| 練習 | Home tab 2 | 選擇題/解答題、錯題本、收藏 |
| 閱讀 | Home tab 3 | 文檔導入/管理/全屏閱讀、高亮、書籤 |

## 開發

```bash
npm install
npm run dev          # http://localhost:5173
npm run build        # production build → dist/
```

## 打包 APK

```bash
~/Scripts/build-mnemos-apk
# → android/app/build/outputs/apk/debug/app-debug.apk
```

## 項目結構

```
src/
  lib/               flashcard 核心（storage, sm2, scheduler, renderMarkdown...）
  quiz/lib/          quiz 核心（quizEngine, storage, questionParser）
  reading/lib/       reading 核心（storage, renderDoc, highlights, bookmarks, stats）
  pages/             UI 頁面（Home, DeckDetail, Review, Browse, Import, Settings...）
  components/        共享組件（ReviewCard, CardEditor, HeroSection, ErrorBoundary, Icons）
  styles/            index.css（OKLCH 設計系統）+ markdown.css
```

## 數據存儲

| Namespace | Keys | 用途 |
|-----------|------|------|
| `mnemos-*` | data, daily-limit, review-log, theme, home-tab | flashcard + UI |
| `examprep-*` | questions, progress, starred, last-session | quiz |
| `reading-*` | collections, documents, highlights, bookmarks, stats, settings | reading |

## 導入格式

- **閃卡**：結構化 markdown（`# 科目 ## 章節 - 正面 縮進背面`）
- **題庫**：`questions.json`（choice + review 題型）
- **閱讀**：`.md` / `.tex` / `.txt`

