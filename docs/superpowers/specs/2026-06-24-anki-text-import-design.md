# Anki 纯文本/CSV 导入 — 设计文档

- 日期：2026-06-24
- 范围：Phase 1（纯文本 / CSV）。`.apkg` 为 Phase 2，另起一轮 spec→plan。
- 定位：迁移通道（底层兼容）。主推仍是制卡指南 prompt 产出的 LLM-native Markdown 闪卡。

## 1. 背景与目标

Mnemos 的闪卡当前只能通过 `parseMdToCards`（Markdown）导入。用户有存量 Anki 卡组，需要一条迁移通道。本轮支持 Anki「导出 → Notes in Plain Text」产出的 `.txt` 与 `.csv`，覆盖含/不含 `#` 头部指令两种版本。

**非目标（Phase 2）**：`.apkg`（ZIP + SQLite-WASM + 媒体）。本轮遇到 `.apkg` 仅提示「即将支持」，不引入任何新运行时依赖。

成功标准：
- 一个真实的 Anki `.txt`/`.csv` 导出文件能解析为正确的正/背面卡片并落入指定卡组。
- HTML 字段被转为 Mnemos 可读的 Markdown，而非裸标签噪声。
- Cloze 笔记转为可复习的正/背面卡。
- 解析器有单元测试覆盖。

## 2. 模块边界

新文件 `src/lib/ankiParser.js`，导出纯函数：

```
parseAnkiToCards(content, deckName) → { cards, deckName, stats }
```

- **纯函数**：字符串进、对象出。不读写 localStorage、不依赖 React，便于单测。
- `cards`：与 `parseMdToCards` 输出**同形**，每张为
  `{ id, deckId:'', front, back, type:'recall', chapter, section, easiness, interval, repetitions, dueDate, createdAt, updatedAt }`。
  同形是关键设计决定——可零改动复用 `Import.jsx` 现有的 `mdPreview` 预览屏、`dedup` 去重逻辑、`handleConfirmMd` 落库流程（其内部已是 `addCard(deck.id, card.front, card.back, card.type, card.chapter, card.section)`）。
- `stats`：`{ total, cloze, imagesDropped, tagsDropped, skipped }`，供预览页提示。
- `deckName`：从 deck 列推断的建议卡组名（可被用户在预览页覆盖），无则回退到传入的 `deckName`。

## 3. 解析逻辑

### a. 头部指令（现代 Anki 2.1.55+）
识别以 `#` 开头的指令行，大小写不敏感：
- `#separator:` — `tab`/`comma`/`semicolon`/`pipe`/`colon`/`space`，或字面单字符。
- `#html:true|false`
- `#deck column:N`（1-indexed）
- `#tags column:N`
- `#notetype column:N`
- `#columns:Front Back …`
- `#guid column:N`

无头部时按旧版 TSV 处理。

### b. 分隔符
优先 `#separator:`；否则嗅探首条数据行（tab 优先，其次逗号）；默认 tab。

### c. CSV 引号
支持 `"…"` 包裹、双写转义 `""`、字段内嵌换行（一条记录可跨物理行）。手写小型状态机，不引第三方 CSV 库。

### d. 列映射
剔除元数据列（notetype/deck/tags/guid）后，第 1 内容列 → `front`，第 2 → `back`。多字段笔记的剩余内容列以分隔线并入 `back`。

### e. HTML → Markdown
当 `#html:true`（或未声明但检测到标签）时：
- `<br>`、`<br/>` → 换行
- `<b>`/`<strong>` → `**…**`；`<i>`/`<em>` → `*…*`
- `<div>`、`<p>` → 换行边界
- 解码 HTML 实体（`&nbsp;`→空格，`&lt;`/`&gt;`/`&amp;`/`&quot;`/`&#39;` 等）
- `<img src="x">` → 占位 `[图片: x]`（文本导出不含媒体文件，计入 `stats.imagesDropped`；Phase 2 才有真图）
- 其余未知标签：剥除，保留文字

### f. Cloze
含 `{{cN::答案::提示}}` 或 `{{cN::答案}}` 的笔记：
- `front` = 句子，挖空处显示提示文本或 `[…]`
- `back` = 完整句，答案揭示
- 一张笔记 → 一张卡（不按 cloze 序号拆多张，简化），计入 `stats.cloze`

### g. Deck → 章节
- 有 `#deck column`：按 `Parent::Child::…` 拆分，第一段 → `chapter`，第二段 → `section`，更深层并入 `section`。
- 无：`chapter` 取 `deckName`，与现有 MD 行为一致；`section` 留空。

### h. Tags
Mnemos 无 tag 概念 → 丢弃并计数（`stats.tagsDropped`，预览页如实显示「忽略 N 个标签」）。

## 4. UI 集成

在「闪卡·MD」tab 底部新增紧凑卡片「**从 Anki 迁移**」（次级入口，体现主次）：
- 独立 file input，`accept=".txt,.csv"`，一行说明文案。
- `handleFileDrop` 扩展：当 `importTab === 'md'` 且扩展名为 `.txt`/`.csv` → 走 Anki 解析器；`.md` → 现有 `processMd`。
- 解析成功 → 复用现有 `mdPreview` 预览屏；额外展示一行 stats（cloze 数 / 忽略图片 / 忽略标签 / 跳过坏行）。
- 主 MD dropzone 不动。

落库走现有 `handleConfirmMd`（含去重、可选 skipDup、目标卡组）。

## 5. 错误处理

- 空文件 / 无记录 → `alert('未识别到 Anki 卡片')`。
- 坏行最佳努力跳过，计入 `stats.skipped`；预览页若 `skipped > 0` 显示警告条。
- `.apkg` 文件 → 提示「.apkg 即将支持，请先在 Anki 中导出为纯文本/CSV」。

## 6. 测试

项目当前零测试基建（`package.json` 仅 dev/build/preview）。本模块为纯逻辑，引入 **vitest**（与 vite 同源、极轻）仅服务于 `ankiParser.js`：
- `package.json` 加 devDep `vitest` 与 `"test": "vitest"` 脚本。
- **TDD：先写测试再写实现。**
- 覆盖用例：tab 分隔、comma 分隔、引号转义与内嵌换行、`#` 头部全集、无头部旧 TSV、`#html:true` 的 HTML→MD、cloze（带/不带提示）、deck `::` 层级拆分、tags 丢弃计数、`<img>` 占位、空输入、坏行跳过。

## 7. 文件清单

- 新增 `src/lib/ankiParser.js`
- 新增 `src/lib/ankiParser.test.js`
- 改 `src/pages/Import.jsx`（次级入口 + `.txt/.csv` 路由 + stats 展示）
- 改 `package.json`（vitest devDep + test 脚本）

## 8. 已定默认（可后续推翻）

- 多字段笔记：第 2 列及之后并入 `back`。
- deck 层级 → `chapter`/`section`。
- Cloze：一笔记一卡，不按序号拆分。
- `<img>` → 文本占位，不尝试取媒体（Phase 2 处理）。
