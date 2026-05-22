# Mnemos — 间隔重复记忆 · 题库练习 · Markdown 阅读

三天独立完成，vibe coding（OpenCode + MiMo）。

[Download APK (v1.0.0, 37MB)](https://github.com/lesPrivilege/Mnemos/releases/tag/v1.0.0)

<p align="center">
  <img src="assets/screenshots/overview-dark.jpg" width="86%" alt="Mnemos 界面总览" />
</p>

React 18 · Vite 6 · Tailwind 3 · Capacitor 8 · marked + KaTeX + DOMPurify

SM-2 驱动闪卡复习、选择题/解答题练习、内建 markdown 阅读器，三个模块统一切换，localStorage 持久化，无后端依赖。

架构上 Mnemos 不做 LLM API 集成，只消费结构化输入：闪卡用 markdown，题库用 JSON，阅读用 .md/.tex。内容生成由外部 CLI 与本地 skill 完成（reading-companion、md-cleaner 等），应用层只负责呈现、调度与交互。这个边界让应用逻辑不随模型迭代折旧，结构化文档也不绑定具体 LLM 客户端。

## 架构补充说明

Mnemos 在架构上做了一个明确选择：不在程序内集成 LLM API，只消费结构化输入。

闪卡的 markdown、题库的 JSON、阅读的文档——这些内容的生成、整理、结构化工作，全部由外部的 CLI 工具与本地 skill 完成。Mnemos 只负责呈现、调度与用户交互。

这个分工带来几个结果：

- 应用层逻辑稳定，不随模型迭代或 prompt 调整而折旧
- 内容生成的复杂度（context 组装、prompt 工程、输出校验）被隔离在外部工具中
- 结构化文档本身作为持久产出，独立于任何具体 LLM 客户端存在

这个设计最初的动机是务实的——在程序里集成 LLM API 比较麻烦，外部化省事。但实践下来发现，这个边界划分恰好让应用层具备了对抗模型层变化的抗折旧能力。

## 技术栈

React 18 · Vite 6 · Tailwind 3 · Capacitor 8 · marked + KaTeX + DOMPurify

## 三个模块

| 模块 | 入口 | 功能 |
|------|------|------|
| 记忆 | Home tab 1 | SM-2 闪卡复习、卡组管理、撤销 |
| 练习 | Home tab 2 | 选择题/解答题、错题本、收藏 |
| 阅读 | Home tab 3 | 文档导入/管理/全屏阅读、高亮、书签 |

## 开发

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

## 项目结构

```
Mnemos/
├── assets/
│   └── screenshots/              # 真机截图与暗/浅色总览图
├── design/                       # hi-fi 原型（v2 redesign, activity dashboard）
├── public/                       # 静态 HTML 入口
├── scripts/                      # icon gen, splash gen, import helpers, ic_foreground.svg
├── src/
│   ├── lib/                      # flashcard 核心（sm2, scheduler, storage, renderMarkdown...）
│   ├── quiz/
│   │   ├── components/
│   │   └── lib/                  # quiz 引擎、题目解析、storage
│   ├── reading/
│   │   ├── components/           # ReaderPanels, ReaderToolbar
│   │   ├── hooks/
│   │   ├── lib/                  # renderDoc, highlights, bookmarks, stats, importer, storage
│   │   ├── pages/                # CollectionDetail, Reader, ReadingHome...
│   │   └── styles/
│   ├── pages/                    # Home, DeckDetail, Review, Import, Settings, QuizPage...
│   ├── components/               # ReviewCard, CardEditor, HeroSection, ErrorBoundary, Icons
│   └── styles/                   # index.css（OKLCH 设计系统）+ markdown.css
├── android/                      # Capacitor Android wrapper
├── index.html                    # Vite 入口
├── capacitor.config.json
├── tailwind.config.js
├── vite.config.js
└── package.json
```

## 数据存储

| Namespace | Keys | 用途 |
|-----------|------|------|
| `mnemos-*` | data, daily-limit, review-log, theme, home-tab | flashcard + UI |
| `examprep-*` | questions, progress, starred, last-session | quiz |
| `reading-*` | collections, documents, highlights, bookmarks, stats, settings | reading |

## 导入格式

- **闪卡**：结构化 markdown（`# 科目 ## 章节 - 正面 缩进背面`）
- **题库**：`questions.json`（choice + review 题型）
- **阅读**：`.md` / `.tex` / `.txt`

## 附录：真机截图

Mnemos 已打包为可安装的 Android App。下列总览图来自真机比例截图，覆盖记忆、练习、阅读、活动、导入、制卡提示和设置等核心工作流。

<p align="center">
  <img src="assets/screenshots/overview-dark.jpg" width="86%" alt="Mnemos dark mode screenshot overview" />
</p>

<p align="center">
  <img src="assets/screenshots/overview-light.jpg" width="86%" alt="Mnemos light mode screenshot overview" />
</p>
