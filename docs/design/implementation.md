# Mnemos · 串行施工单

2026-09-16 · MX-00…MX-06 为本包提案编号，不是已有 GitHub PR 号。

## 纲要

[基线与写权](#一基线与写权) · [施工顺序](#二施工顺序) · [首单](#三首单mx-00--mx-01) · [完整闭环](#四首个产品闭环mx-02) · [验证与交付](#五验证与交付)

## 一、基线与写权

Mnemos 阅读基线 `13628e7eb5a946045661401bfa4e53c00f92be1e`。Courtwork 参考快照 `f76dd7ec9f6cef845f67360cc0a22768ae309ca6`。开工先核对本地 HEAD、未提交更改、现行 `CLAUDE.md`、`docs/design-kanli.md`、`docs/design-collation.md`、相关 roadmap 与实现；发生更新时按最新源码校正本包落点，不覆盖本地进展。

本轮产物是设计/索引/施工文档；GitHub 未写入，应用未构建或运行，未采集新截图。仓库 `CLAUDE.md` 明定未经明确请求不 push，本包不改变该规则。

施工一个作者串行；独立审校者不参与该轮实现。每轮先记录语义和必要的规范递修，再动组件、token 与测试。旧 collate 基线只能收缩，不用扩豁免来迎合新皮肤。`design/` 中的历史 HTML 和 README 暖色截图不当作现行视觉验收基线。

代码落点均是施工范围建议；只对已读取源码陈述现状。没有读取的辅助模块先只读展开，不按本文臆造接口。备份合同、调度与数据迁移只有新能力确需时才做最小相邻变更。

## 二、施工顺序

| 单元 | 交付 | 范围 | 退出条件 |
|---|---|---|---|
| MX-00 入账 | Design 入口、来源清单、规则递修记录、grammar 注册 | 本包 `docs/design/`；README/CLAUDE/roadmap 增加短指针；kanli/collation 只改明确条款 | 来源可定位；无双份 token 权威；未启动未选整站重构 |
| MX-01 样板底座 | 独立启动、合成 fixture、主题/偏好/重置、首个真实组件 | 提议 `design.html` 与 `src/design/`，复用 bounded presentational scene；必要的 Vite 构建配置 | 不读写生产存储，不启动 App 的备份/提醒；使用共享组件与真实状态 |
| MX-02 阅读闭环 | 选区工具条、局部制卡、source link、返回恢复 | Reader、ReaderPanels、现有 Import/卡片存储接缝、卡片内嵌 source 字段（裁定 59）、备份接线 | 保存卡片后重启仍能回到来源；失败不丢稿；返回恢复原位 |
| MX-03 复习手感 | 显答、评价轨、回执、真实撤销、触觉 | Review 与 ReviewCard；完整现有 undo/requeue 回归 | quality/SM-2/learning 语义不变；重复输入不双写；可中断 |
| MX-04 资料与本次学习 | 搜索强化、多选、托盘、排序与继续 | Home/资料、Search、类型化 plan store | 不改 due；拖拽有按钮/键盘替代；失效条目不误认 |
| MX-05 活动与参数 | 日期筛选、热图/明细联动；可选阅读参数预览 | Activity、derive 投影、Settings/reader settings 的最小切片 | 真实口径，零/缺失分离；字号预览取消可恢复 |
| MX-06 推广与展示 | 全局一致性收口、明暗/移动/宽屏证据、文案与发布样板 | 已实现 grammar；必要时做导入预检小单 | 同一产品组件生成样板；来源/状态/测试范围随展示件登记 |

MX-01 先跑一个完整场景骨架；MX-02 才是有价值的第一个产品节点。不能为了把 grammar 表填满而让所有单元同时施工。

## 三、首单：MX-00 + MX-01

### 3.1 入账动作

将本包 `docs/design/` 放入仓库同路径。README 与 CLAUDE 只新增“UX / Motion 样板间”索引，并回连已有 kanli/collation；不将本包复制到另一套 AGENT-RULES 或 skill。roadmap 用一条 programme 加上述编号，不重复长文。

在 `design-collation.md` 新增本轮记录：用户授权 Mnemos 作为 UX、motion、taste 样板间；准许 grammar 驱动小型本地功能；CW 是 donor，Mnemos 底本继续为数值权威。正式记录号由现行文末分配，不猜测“记-XX”。

为宽屏并置、主运动组和局部浮层材质实验明确写下适用面及恢复条件。实验例外不得静默变成生产默认。普通交互、调度、备份、现代中文与无应用内 LLM 的边界不变。

### 3.2 独立启动而不是简单加路由

现有 `App.jsx` 在 mount 时执行 `maybeRunAutoBackup()` 与 `initReminders()`，并挂载主产品壳。**不能只加一个 `#/design` 然后继续初始化真实 App。** 独立 `design.html` 直接加载样板入口，不 import 会启动生产行为的应用根。

样板先用纯内存 adapter；需要刷新继续的实验再用专属、可清除的 namespace。所有样板动作通过显式 adapter，不允许引用模块级生产存储单例。默认 fixture 是独立数据，不加载用户库，不发通知、不自动备份、不记入真实活动。

Reader/Review 当前直接导入部分存储函数，并不是已有可注入页面。先在首场景边界提取最小展示/交互组件，让产品容器和样板容器各自接线；不以此为由重写全仓为新状态框架。移动/宽屏、showroom/学习面消费同一组件。

样板壳只提供场景、状态、主题、减弱动态、重置。动画速度只影响检验回放，不改变持久化与业务事件的时钟。不得通过自动延迟模拟一个不存在的后端。

### 3.3 首轮静态构成

展示“文档与摘录”一条主链：资料行、阅读正文、选区工具、摘录列表、卡片草稿、保存回执。宽屏比较两种布局：单栏局部面 vs 原文/摘录并置；相同内容、颜色、字体、按钮与状态，只有结构变量不同。

颜色使用现有 Dystopia 底本；不从 CW 当前默认 CSS 大片拷值。图标沿现有 Icons；不用品牌 L 符号代替 Mnemos 图标。

至少准备空资料、长标题、重复摘句、公式、无笔记摘录、已有笔记摘录、保存失败、来源失效八类状态。样板内容可以取包内原创 reading fixture，复杂场景描述见 `fixtures/scenarios.json`；其 JSON 是样板场景合同，不是既有题库或备份导入格式。

### 3.4 首轮不做

不改 SM-2、不替换路由、不升级 React/Capacitor、不全量引入 UI kit、不新增账号/模型/同步，不把独立样板设置插进主导航；不先做全局重命名、所有页面重排或完整设计系统包发布。

## 四、首个产品闭环：MX-02

完成以下连贯路径后才讨论“看起来成熟”：

1. 导入/打开原创阅读材料，在重复句中的第二处做摘录，给摘录写问题。
2. 进入局部制卡面，确认问题、答案与卡组。模拟一次保存失败，输入与原位置仍保留；重试后卡片与来源关联有明确结果。
3. 从新卡片查看来源，定位到正确的第二处而非全文首次匹配；关闭来源回到刚才卡片。
4. 刷新/重启，卡片与来源关系仍在；旧数据没有来源关系也能正常打开。
5. 修改或删除原材料，回跳给出断链或候选定位，保留摘句；不静默导航到错误材料。
6. 导出备份并在隔离空间恢复，来源关系保留；旧备份导入仍通过既有合同。

随后 MX-03 接入实际显答/评价/撤销，形成“阅读→摘录→卡片→复习→原文”的完整闭环。

### 最小相邻源码

| 已读取落点 | 现状 | 施工切片 |
|---|---|---|
| `src/reading/pages/Reader.jsx` | selection、高亮保存、百分比复位；制卡跳 Import 预填 | 先整理选区/返回上下文；再接局部面与 source link |
| `src/reading/lib/highlights.js` | id/docId/selectedText/contextSnippet/textOffset/length/note | 重用已有 identity；新增字段有具体消费者再加入 |
| `src/reading/components/ReaderPanels.jsx` | 三类面板与导出/制卡动作 | 共用 overlay/toolbar anatomy；不做第四套抽屉 |
| `src/pages/Review.jsx` | 1/2/4/5、learning/requeue、前态与日志 | 显示层不能接管调度；完整读完 undo 后才改 |
| `src/App.jsx` | HashRouter 与 mount 副作用 | 样板独立入口；产品主入口继续稳定 |
| `src/styles/tokens.css` | 色/字/圆角/motion 唯一底本 | 添加语义 alias 时先写消费者，不新增另一套数值表 |

相邻触碰时同步修正已见的局部矛盾：ReaderPanels 的高亮日期使用 `text-ink-4`，而 kanli 明定 ink-4 不入文字位；换成可读的文字 token，并在对应状态验证。不把这条源码观察扩大成已完成全应用视觉审计。

## 五、验证与交付

### 5.1 工程与数据

沿现有命令：

```sh
npm ci
npm run check
npm run collate:selftest
```

`npm run check` 已包含 lint、vitest、collate 与 build。依赖 spike 后更新 lockfile，并比较增量体积；具体 Motion/React Aria 版本在采用那一轮固定，不能把访问文档日期当安装版本。

新增测试分别覆盖：样板启动零生产副作用；保存失败/重试；真实 ID 映射；旧备份；来源消失；double-submit；学习重排与撤销；独立 namespace 清理；路由/焦点返回。不能只断言 class 名与元素存在。

### 5.2 可见行为

按 grammar 验收矩阵记录同一 fixture 的静态状态和完整操作。浏览器确认 overlay 遮挡、focus、IME、selection、200% 文字、偏好回退；Android 真机确认 Back、系统文本选择、触觉、WebView、长列表与应用切后台再回来。桌面模拟触屏不等同真机。

独立审校保留“做了什么、观察到什么、通过/失败/未执行”三个字段；作者不能以自己的截图代替独立接受。无录屏或无设备的项目保持未执行，交下一轮补，不编造 pass。

### 5.3 每轮回执

```text
MX-ID / source HEAD / changed paths
User path / fixture / local data scope
Grammar IDs and canonical precedent
New state or persisted fields / backup impact
Source-to-consumer mapping / dependency delta
Check results / browser evidence / native-device evidence
Failures / reversibility / next bounded slice
```

每个视觉样板有删除测试：关掉动效是否仍能完成任务；删除装饰是否丢失必要意义；换成朴素控件是否更清楚。只有保留下来的差异进入下一轮。
