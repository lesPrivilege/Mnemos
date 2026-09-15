# Mnemos · Courtwork Design 消费索引

2026-09-16 · 固定来源，不复制 Courtwork 的工单状态或业务语义。

## 消费路线

问题 → 已读报告／精确原文 → 行为与状态 → Mnemos grammar → specimen → 本地裁决。

来源承担不同职责：CW Design/Atlas 提供结构与工艺；UX Polish 提供微交互；Skin/Review 提供职责隔离；Mnemos 现有源码决定真实能力与数字；外部官方文档只补实现机制。

## 一、按问题取材

| 问题 | 首选来源 | Mnemos 消费 | 不移植 |
|---|---|---|---|
| 丰富控件如何不拼贴 | CW-03 Atlas；CW-02 Scout | 统一语义→解剖→动效；MG 注册 | Agent 权限、批准、工具状态 |
| 摘录工具条与来源面 | CW-05 UX Polish PX04/06/08 | selection 连续、placement 驱动、焦点与返回 | 聊天消息壳、固定朝向动画、悬浮即展开 |
| 轻量而有手感 | CW-04/05；UP-01/02 | 一组 object motion，CSS 与 Motion 有界比较 | 所有区域 spring、全屏 glass |
| 日期范围与投影 | CW-03 Projection | 真实日志→heatmap/明细，口径一致 | 未测量的掌握率/retention、为了复杂而画图谱 |
| 色系与语义 | CW-07/08/09 + MN-04 | Dystopia 谱系，brand/判断/danger/focus 分离 | 把 Slate 默认冒称 Dystopia；把 Review 业务语义照搬 |
| 图形与状态样板 | CW-11 Brand | 几何单源、多尺寸、主题/偏好、导出 manifest | Courtwork 的 L 标志、八个 Agent 动词 |
| 发布面的表现力 | CW-12/13 | 同组件独立展示入口；固定截图/fixture 来源 | 把演示当真产品统计、把营销导航搬入应用 |
| 缺少新奇局部 | CW-02 Scout 的 Motion donor 路径 | 定点浏览 60fps / transitions.dev / beUI，记录时序再本地实现 | 把旧 Scout 线索写成本轮已实测；复制第三方录屏/作品 |

## 二、读取的仓库来源

### Mnemos 产品底本

**MN-01 · [README.md](https://github.com/lesPrivilege/Mnemos/blob/13628e7eb5a946045661401bfa4e53c00f92be1e/README.md)**  
产品边界、模块、可靠性与旧截图时点。读取范围：全文。

**MN-02 · [CLAUDE.md](https://github.com/lesPrivilege/Mnemos/blob/13628e7eb5a946045661401bfa4e53c00f92be1e/CLAUDE.md)**  
现行设计入口、提交与禁止自动推送。读取范围：全文。

**MN-03 · [docs/design-kanli.md](https://github.com/lesPrivilege/Mnemos/blob/13628e7eb5a946045661401bfa4e53c00f92be1e/docs/design-kanli.md)**  
宗、家讳、底本与版式；延展必须显式落账。读取范围：本轮返回片段：宗至行款著录语。

**MN-04 · [src/styles/tokens.css](https://github.com/lesPrivilege/Mnemos/blob/13628e7eb5a946045661401bfa4e53c00f92be1e/src/styles/tokens.css)**  
Dystopia 精确 OKLCH、字轨、圆角、时长。读取范围：1–200 行请求；已返回色值、字体、字阶、间距、动效与表面前段。

**MN-05 · [package.json](https://github.com/lesPrivilege/Mnemos/blob/13628e7eb5a946045661401bfa4e53c00f92be1e/package.json)**  
React 18、HashRouter 相关依赖、Haptics 与既有门禁。读取范围：全文。

**MN-06 · [src/App.jsx](https://github.com/lesPrivilege/Mnemos/blob/13628e7eb5a946045661401bfa4e53c00f92be1e/src/App.jsx)**  
三入口与独立样板启动边界；App 挂载自动备份及提醒。读取范围：全文。

**MN-07 · [src/reading/pages/Reader.jsx](https://github.com/lesPrivilege/Mnemos/blob/13628e7eb5a946045661401bfa4e53c00f92be1e/src/reading/pages/Reader.jsx)**  
选择、高亮、复位、预填制卡及来源文字。读取范围：1–310 行。

**MN-08 · [src/reading/lib/highlights.js](https://github.com/lesPrivilege/Mnemos/blob/13628e7eb5a946045661401bfa4e53c00f92be1e/src/reading/lib/highlights.js)**  
现有 highlight 数据结构。读取范围：全文。

**MN-09 · [src/reading/components/ReaderPanels.jsx](https://github.com/lesPrivilege/Mnemos/blob/13628e7eb5a946045661401bfa4e53c00f92be1e/src/reading/components/ReaderPanels.jsx)**  
目录、高亮、书签及制卡入口。读取范围：全文。

**MN-10 · [src/pages/Review.jsx](https://github.com/lesPrivilege/Mnemos/blob/13628e7eb5a946045661401bfa4e53c00f92be1e/src/pages/Review.jsx)**  
四档真实 quality、learning/requeue 与撤销前态。读取范围：1–155 行。

### Courtwork donor

**CW-01 · [engineering/design/README.md](https://github.com/lesPrivilege/Courtwork/blob/f76dd7ec9f6cef845f67360cc0a22768ae309ca6/engineering/design/README.md)**  
Design 研究与产品、语义、实现的分层。读取范围：全文。

**CW-02 · [engineering/design/scout/README.md](https://github.com/lesPrivilege/Courtwork/blob/f76dd7ec9f6cef845f67360cc0a22768ae309ca6/engineering/design/scout/README.md)**  
按问题消费来源与素材边界。读取范围：全文。

**CW-03 · [engineering/design/atlas/README.md](https://github.com/lesPrivilege/Courtwork/blob/f76dd7ec9f6cef845f67360cc0a22768ae309ca6/engineering/design/atlas/README.md)**  
Projection / Control → anatomy → visual grammar。读取范围：1–160 行请求；返回至 Projection 段后部。

**CW-04 · [engineering/research/ux-polish-2026-09-08/README.md](https://github.com/lesPrivilege/Courtwork/blob/f76dd7ec9f6cef845f67360cc0a22768ae309ca6/engineering/research/ux-polish-2026-09-08/README.md)**  
材质、层级、联调片段边界。读取范围：全文。

**CW-05 · [engineering/research/ux-polish-2026-09-08/index.md](https://github.com/lesPrivilege/Courtwork/blob/f76dd7ec9f6cef845f67360cc0a22768ae309ca6/engineering/research/ux-polish-2026-09-08/index.md)**  
选择工具条、浮层、退出、焦点返回、motion 参数纪律。读取范围：全文。

**CW-06 · [engineering/design/se-control-one-shot-2026-09-11/scout-digest.md](https://github.com/lesPrivilege/Courtwork/blob/f76dd7ec9f6cef845f67360cc0a22768ae309ca6/engineering/design/se-control-one-shot-2026-09-11/scout-digest.md)**  
渐进披露路径与历史裁决边界。读取范围：1–160 行请求；返回 L0/L1 与 L2 前段。

**CW-07 · [engineering/design/skin-injection-2026-09-10/README.md](https://github.com/lesPrivilege/Courtwork/blob/f76dd7ec9f6cef845f67360cc0a22768ae309ca6/engineering/design/skin-injection-2026-09-10/README.md)**  
Dystopia 是独立候选 preset；不是当前默认。读取范围：全文。

**CW-08 · [engineering/design/skin-injection-2026-09-10/skin-constitution.md](https://github.com/lesPrivilege/Courtwork/blob/f76dd7ec9f6cef845f67360cc0a22768ae309ca6/engineering/design/skin-injection-2026-09-10/skin-constitution.md)**  
skin 与 review、danger、focus、chart 分离。读取范围：全文。

**CW-09 · [engineering/design/skin-injection-2026-09-10/specimen-proposals.md](https://github.com/lesPrivilege/Courtwork/blob/f76dd7ec9f6cef845f67360cc0a22768ae309ca6/engineering/design/skin-injection-2026-09-10/specimen-proposals.md)**  
Dystopia cold ash / graphite 尚待冻结值来源。读取范围：全文。

**CW-10 · [app/web/styles.css](https://github.com/lesPrivilege/Courtwork/blob/f76dd7ec9f6cef845f67360cc0a22768ae309ca6/app/web/styles.css)**  
当前默认 lead-gray，不可当成 Dystopia。读取范围：1–180 行。

**CW-11 · [brand/README.md](https://github.com/lesPrivilege/Courtwork/blob/f76dd7ec9f6cef845f67360cc0a22768ae309ca6/brand/README.md)**  
原始 SVG → renderer → specimen / exports 的资产工艺。读取范围：1–100 行。

**CW-12 · [site/README.md](https://github.com/lesPrivilege/Courtwork/blob/f76dd7ec9f6cef845f67360cc0a22768ae309ca6/site/README.md)**  
产品实物与发布样板固定来源、分入口与重采图。读取范围：全文。

**CW-13 · [site/src/site.css](https://github.com/lesPrivilege/Courtwork/blob/f76dd7ec9f6cef845f67360cc0a22768ae309ca6/site/src/site.css)**  
发布层独立 namespace 的例子。读取范围：1–120 行。

## 三、本轮补核的官方实现资料

**UP-01 · [Motion · Layout animation](https://motion.dev/docs/react-layout-animations)**  
共享对象、可中断布局转场与 transform；只做局部依赖候选。访问日：2026-09-16；本包未安装依赖。

**UP-02 · [Motion · MotionConfig](https://motion.dev/docs/react-motion-config)**  
显式 reducedMotion=user；默认不是自动尊重用户设置。访问日：2026-09-16；本包未安装依赖。

**UP-03 · [React Aria · Drag and Drop](https://react-aria.adobe.com/dnd)**  
拖拽的鼠标、触屏、键盘、读屏路径。访问日：2026-09-16；本包未安装依赖。

**UP-04 · [React Aria](https://react-aria.adobe.com/)**  
触控、焦点、浮层与可访问交互候选。访问日：2026-09-16；本包未安装依赖。

**UP-05 · [Chrome · Same-document view transitions](https://developer.chrome.com/docs/web-platform/view-transitions/same-document)**  
页级增强与 reduced-motion 回退；不能成为运行前提。访问日：2026-09-16；本包未安装依赖。

## 四、资产复用

本包没有复制二进制图、录屏、字体或第三方设计资产。CW 自有 SVG 的几何与源码工艺可参考；实际采用单件时补上原路径、commit、文件 hash、适用许可/NOTICE、修改范围与消费者。第三方许可逐件保留，不能以仓库总许可代替。

CW Scout 的画廊和 motion 站点是行为线索；沿其已登记边界，记录原链接、作者、场景和时序，不镜像作品。图库目录不是代码依赖名单。品牌资产不直接充当通用控件图标。

新增来源不再写泛泛“值得借鉴”。每条只填：

```text
source → exact locus → behavioral observation → local semantic owner
→ grammar ID → implementation lead → disposition → evidence
```

`ignore / specimen / donor / canonical candidate` 表示来源消费状态；实现是否完成、是否验收另记。`canonical candidate` 不能被作者自动改成已采纳。

## 五、事实与提案边界

本轮做了仓库文本与指定源码片段复核、官方文档补核、来源映射和施工切分。没有对 Mnemos 做浏览器/真机视觉审计，没有运行应用测试，也没有提交或 push。完整来源记录和读取范围见 `sources.json`；新增文件自身的链接/结构校验见交付根目录 `validation.json`。

已明确解决的来源错位：CW 的当前 lead-gray 不等于 Dystopia 数值定本；Mnemos 已有 OKLCH 色值不应被截图取色覆盖；CW 原生 ES module 的禁依赖条款不约束 Mnemos 的 React 实现；CW Review 不等于学习复习；历史暖色截图不证明当前效果。
