# Mnemos

間隔重複記憶 + 題庫練習 + 閱讀。SM-2 算法驅動閃卡複習，支持選擇題/解答題練習，內建 markdown 文檔閱讀器。

[Download APK (v1.0.0, 36MB)](https://github.com/lesPrivilege/Mnemos/releases/tag/v1.0.0)

## 真機截圖

Mnemos 已打包為可安裝的 Android App。下列截圖來自真機運行版本，覆蓋記憶、練習、閱讀、導入、制卡提示和設置等核心工作流。

<p align="center">
  <img src="assets/screenshots/app-home-recall.jpg" width="30%" alt="Recall home" />
  <img src="assets/screenshots/app-home-practice.jpg" width="30%" alt="Practice home" />
  <img src="assets/screenshots/app-home-reading.jpg" width="30%" alt="Reading home" />
</p>

<p align="center">
  <img src="assets/screenshots/app-quiz-detail.jpg" width="30%" alt="Quiz detail" />
  <img src="assets/screenshots/app-quiz-question.jpg" width="30%" alt="Quiz question" />
  <img src="assets/screenshots/app-deck-detail.jpg" width="30%" alt="Deck detail" />
</p>

<p align="center">
  <img src="assets/screenshots/app-import-json.jpg" width="30%" alt="Import JSON" />
  <img src="assets/screenshots/app-import-markdown.jpg" width="30%" alt="Import markdown" />
  <img src="assets/screenshots/app-prompt-guide.jpg" width="30%" alt="Prompt guide" />
</p>

<p align="center">
  <img src="assets/screenshots/app-import-doc.jpg" width="30%" alt="Import document" />
  <img src="assets/screenshots/app-settings.jpg" width="30%" alt="Settings" />
</p>

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
Mnemos/
├── assets/
│   └── screenshots/              # 11 張真機截圖
├── design/                       # hi-fi 原型（v2 redesign, activity dashboard）
├── public/                       # 靜態 HTML 入口
├── scripts/                      # icon gen, splash gen, import helpers, ic_foreground.svg
├── src/
│   ├── lib/                      # flashcard 核心（sm2, scheduler, storage, renderMarkdown...）
│   ├── quiz/
│   │   ├── components/
│   │   └── lib/                  # quiz 引擎、題目解析、storage
│   ├── reading/
│   │   ├── components/           # ReaderPanels, ReaderToolbar
│   │   ├── hooks/
│   │   ├── lib/                  # renderDoc, highlights, bookmarks, stats, importer, storage
│   │   ├── pages/                # CollectionDetail, Reader, ReadingHome...
│   │   └── styles/
│   ├── pages/                    # Home, DeckDetail, Review, Import, Settings, QuizPage...
│   ├── components/               # ReviewCard, CardEditor, HeroSection, ErrorBoundary, Icons
│   └── styles/                   # index.css（OKLCH 設計系統）+ markdown.css
├── android/                      # Capacitor Android wrapper
├── index.html                    # Vite 入口
├── capacitor.config.json
├── tailwind.config.js
├── vite.config.js
└── package.json
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

