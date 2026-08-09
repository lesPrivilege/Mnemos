# iOS 原生规范接入与技术 Spike · Claude Code 施工 handoff

> **性质**：自包含施工单，不是设计底本，不是验收结论。界面权威仍为
> `src/styles/tokens.css`、`docs/design-kanli.md` 与 `docs/design-collation.md`；
> Apple 平台行为以施工时复核的官方文档为公法。
>
> **角色边界**：Claude Code 负责施工、测试与举证；不得自判“验收通过”。Codex
> 不参与本轮实现，待 Claude Code 交付 commit 与证据包后独立验收。
>
> **基线牌记**：2026-08-09；`main` / `2155bd0`；Mnemos `1.5.0`；
> React 18 + Vite 6 + Capacitor 8。若开工时 HEAD 已变化，先重读差量并在实施报告中
> 写明新基线，不得机械套用行号。

## 一、任务一句话

在不启动 SwiftUI 全量重写、不把 WebView 伪装成 iOS 控件的前提下，先修 R2 验收
暴露的三项真实缺口，建立 Apple 官方规范到 Mnemos 架构的可追踪契约，生成并跑通
Capacitor iOS 技术 Spike，以真机构建与三条主链路证据判断 Hybrid 是否足够；只做
证据明确要求的窄幅平台修正。

## 二、完成定义

本轮完成不等于“已有可发布 iOS 版”。完成须同时具备：

1. R2 三项遗留有回归测试且行为修正。
2. `docs/ios-platform-contract.md` 写清官方规范、Mnemos 映射、例外与复议门。
3. 仓库具备可重复生成、同步和编译的 Capacitor iOS 工程；若环境阻断，须停在明确
   阻断点，不得以 mock、网页截图或口头断言代替。
4. iOS Simulator 或真机至少跑通记忆、练习、阅读三条主链路；证据携 commit、设备、
   OS、主题、文字尺寸与状态。
5. `npm run check` 全绿，iOS 构建命令全绿；原有 Android/Web 行为无回退。
6. Claude Code 只声明“Ready for independent acceptance”，不写“已验收”“可发布”。

## 三、本轮明确不做

- 不做 SwiftUI 全量重写，也不建立第二套业务逻辑、调度算法、解析器或存储实现。
- 不做原生 `TabView` 包 WebView 的正式产品架构；本轮只收集是否需要它的证据。
- 不用 CSS 临摹 UIKit/SwiftUI 控件皮，不因 iOS 引入一套平行主题或组件分支。
- 不改 Mnemos 的宗、字轨、Dystopia 声部或中文排版身份来换取“像 Apple”。
- 不做 App Store 上架、签名、TestFlight、推送、iCloud 同步、Widget、Shortcuts、
  Spotlight 或分享扩展。
- 不借本轮顺手重构无关页面、全量 TypeScript 化、换路由器、换构建工具。
- 不 push；除非用户另行明示，也不创建 PR。

## 四、必须使用与必须重读的 skill / 规范

### 4.1 Claude Code 施工侧

开工前按次序完整阅读：

1. 仓库 `CLAUDE.md`。
2. `~/Projects/Deswrit kit/03-刊例.md` 与 `01-凡例.md`。
3. `docs/design-kanli.md`、`docs/design-collation.md`。
4. `docs/roadmap-long-term.md` Phase 1–5 与 `docs/roadmap-maturity.md` M1–M5。
5. Apple Design skill：
   `/Users/lesprivilege/.codex/skills/apple-design/SKILL.md`。

若 Claude Code 环境不能读取该 skill，不得停工；本 handoff 已把本轮所需约束写全，
但须在实施报告中登记“skill 不可读”及采用的替代来源。

Apple Design skill 在本轮的强制落点：

- 反馈从按下开始；不得用人为延时伪装异步。
- 手势跟手、可中断、路径对称；系统边缘返回手势优先于自定义横滑。
- 弹簧只用于有手势动量的物体；状态切换、数据区不得 bounce。
- 触觉只在裁决、提交、警示等有因果的时刻触发，并与视觉同帧。
- Reduce Motion 不是“无反馈”，而是去位移、去弹性，改短淡变或硬切。
- Dynamic Type、VoiceOver、键盘与手势替代路径从组件定义时进入，不在发布前补票。
- 取 Apple 之行为、结构与公法，不取签名形；与项目家讳二一致。

### 4.2 Codex 独立验收侧

Codex 验收时至少使用：

- `apple-design`：审导航、手势、动效、触觉、Dynamic Type 与 reduced motion。
- `browser:control-in-app-browser`：构建并实测 Web/Hybrid 视觉与交互，不以源码代页面。
- `review-animations`：仅当本轮触及 Home 横滑、Review 滑评或新增手势/动效时使用。

Codex 不读取 Claude Code 的“自评结论”作为事实，只读取 diff、命令输出、真实页面与
证据包；发现问题按 P0–P3 报告。除非用户另行要求，Codex 验收时不顺手修复。

## 五、官方来源清单

施工时只用 Apple、Capacitor 官方一手资料；每个会改变架构或行为的结论须在
`docs/ios-platform-contract.md` 就近链接来源并写访问日期。不得用 Dribbble、博客、
Medium、模板或其他 app 截图代公法。

- [Apple Human Interface Guidelines](https://developer.apple.com/design/human-interface-guidelines)
- [Design principles](https://developer.apple.com/design/human-interface-guidelines/design-principles)
- [Layout](https://developer.apple.com/design/human-interface-guidelines/layout)
- [Tab bars](https://developer.apple.com/design/human-interface-guidelines/tab-bars)
- [Accessibility](https://developer.apple.com/design/human-interface-guidelines/accessibility)
- [Apple Design Resources](https://developer.apple.com/design/resources/)
- [SwiftUI Navigation](https://developer.apple.com/documentation/swiftui/navigation)
- [NavigationStack](https://developer.apple.com/documentation/swiftui/navigationstack)
- [Capacitor iOS official guide](https://capacitorjs.com/docs/ios)

凡 Apple 新系统的视觉材料、命名或 API 在施工时已更新，以当日官方现行为准；不得把
本 handoff 的日期当永久版本号。变化若影响既定设计，只登记差异与提案，不擅改宗或
底本。

## 六、开工前四问

Claude Code 在第一份实施报告开头逐项回答；答不出者不开 UI 工：

1. **声部预算何在**：iOS 平台态是否只消费现有墨、accent、danger、warn、good？
   新平台状态若需新色，为什么现有语义槽不足？
2. **行款是否可著录**：safe area、系统键盘、状态栏介入后，手机单栏与四级栏宽如何
   仍符合 `docs/design-kanli.md` §五？
3. **记号携何义**：任何新增 SF Symbol、状态图标或原生 chrome 表达了何处未表达的
   事实？只是“更像 iOS”者不得上。
4. **态是否俱全**：空、错、载、溢、焦点、键盘、VoiceOver、Dynamic Type、Reduce
   Motion、离线、后台恢复分别如何验证？

## 七、施工阶段与提交边界

### 阶段 A · 收口 R2 三项遗留

先修已由独立验收确认的三项；不得把它们埋进 iOS 大提交。

#### A1 · 连续天数统一口径

现状：`src/lib/activity.js` 的 `activeDays` 由记忆、练习、阅读三源组成，但 `streak`
只调用 `deriveStreak(events)`，故阅读当天可出现“今日阅读 1 分钟 / 本月活跃 N 天 /
连续 0 天”。旧练习进度兜底也可能被漏算。

行为契约：

- 活跃日定义为当日记忆次数、练习次数或阅读分钟任一大于零。
- 今日尚未活动不立即断掉截至昨日的连续；今日已有任一模块活动则计入今天。
- 同日多事件只算一天；本地日界，不取 UTC。
- 页面与派生层不得各自再造算法。选择一个可复用的跨模块活跃日输入，使活动页、未来
  Widget 与其他消费者同源。
- 为“仅阅读”“仅旧练习兜底”“跨三模块”“今日未动”“时区日界”补测试。

#### A2 · 本周量纲不可混加

现状：`weekTotals.total` 把记忆次数、练习次数与阅读分钟相加，再显示成“本周 N 次”。

行为契约：

- 不同量纲不得相加后挂单一“次”。
- 焦点副句可分别成句，或改用本周活跃天数等同量纲事实；必须回答真实问题且不重造
  指标盒。
- 记忆/练习仍用次数，阅读仍用分钟；测试锁住文案和数据契约。

#### A3 · 动作状态必须可感知

现状：新建卡组、导入题库、新建集合的 `onAction` 在 `ActionButton` 进入 `done` 前立即
关闭表单，成功态被卸载；同步动作通常连 pending 都来不及显示。

行为契约：

- 不给同步动作添加人为等待，不用 spinner 戏剧化瞬时操作。
- 异步操作在真实等待期间显示 pending，阻止重复提交但不锁死其他导航。
- 成功必须有可感知、可被辅助技术宣布的确认；不能只依赖 1600ms 自动消失的短态。
- 错误同时给原因与下一步，焦点留在可重试位置；不得清空用户输入。
- 三个调用点同义同形；由一个共享契约解决，不逐页打补丁。
- 补组件测试，至少覆盖同步成功、异步成功、失败重试、卸载与重复点击。

**建议提交**：`fix: 收口活动口径与动作状态三缺`。只 stage 此逻辑涉及文件；构建绿后
立即提交。

### 阶段 B · 建立 iOS 平台契约

新增 `docs/ios-platform-contract.md`。它是平台行为契约，不是第二视觉底本；色、字、
圆角、动效取值不得复制 `tokens.css`。

文档至少包含：

1. **来源与访问日期**：逐项链接本 handoff §五的一手资料。
2. **Hybrid 与 Native 的词义**：Capacitor 单 WKWebView、原生壳、SwiftUI 重写三者边界。
3. **导航映射**：练习、记忆、阅读三顶级区域；路由、深链、返回与状态恢复如何映射。
4. **Tab Bar 决策**：默认稳定可见；Review/Quiz/Reader 是否属沉浸式例外，逐屏回答
   “为何隐藏、如何返回、如何保持所属 Tab”。不得沿用现状而不作判断。
5. **系统手势优先级**：iOS leading-edge back 与 Home 自定义横滑、Review 滑评、
   Reader 文本选择的冲突表；每个手势必须有按钮替代。
6. **安全区与键盘**：顶部、Home Indicator、横竖变化、软键盘、硬件键盘、输入焦点、
   sheet 高度与滚动职责。
7. **字体与缩放**：保留 Mnemos 字轨的范围；Dynamic Type 如何影响 chrome、内容、
   数学、代码与自带仿宋；至少支持 200% 放大不丢功能。
8. **无障碍**：VoiceOver 名称/值/提示、阅读顺序、焦点恢复、Switch Control、Full
   Keyboard Access、非色线索、触控尺寸。
9. **主题与材质**：Light/Dark 同版异纸；Reduce Motion、Reduce Transparency、
   Increase Contrast 的降级；不新增整面玻璃拟态。
10. **触觉语汇**：轻＝人裁落点，中＝确认，警＝错误/leech；无视觉或文案替代时不得
    单独以触觉传义。
11. **生命周期与本地优先**：冷启动、后台/前台、进程终止恢复、离线、导入导出、
    Filesystem 路径语义；不得引入网络采集。
12. **决策门**：哪些可在 Web 层修，哪些须 Capacitor 插件，哪些只有原生壳/SwiftUI
    才能满足；为后两类写触发证据，不先写实现。

若以上结论改变现行常法，在 `docs/design-collation.md` 新增一条“改何 · 据何 · 判准 ·
证据”的校勘记，并同步 `docs/design-kanli.md` 对应槽位。纯平台映射不改常法者只留在
平台契约，避免规则重复。

**建议提交**：`docs: 立 iOS 平台行为契约与决策门`。

### 阶段 C · Capacitor iOS 技术 Spike

#### C1 · 环境与依赖

- 先记录 `node --version`、`npm --version`、`xcodebuild -version`、可用 Simulator、
  macOS 与 Xcode 版本。
- 当前基线未安装 `@capacitor/ios`、无 `ios/` 目录。安装与 `@capacitor/core` 同 major、
  兼容当前 CLI 的官方版本，并更新 `package.json` / `package-lock.json`。
- 使用官方 Capacitor iOS 流程生成工程；不得手写一个貌似可用的 Xcode 项目。
- 运行 Web build 后再 sync；记录实际使用的命令。若需 CocoaPods、Swift Package
  Manager、Xcode license 或网络授权，按环境正规请求，不绕过。
- 首次生成后先原样编译，再改配置；原样都不能编译时不得进入 UI 修正。

#### C2 · 平台配置

- `appId` 保持 `com.lesprivilege.mnemos`，名称保持 `Mnemos`。
- 启动底色、图标与 Web 首帧同源；native 层不能消费 CSS 时，生成脚本须以注释牌记
  指向 `tokens.css`，不得复制无出处常数。
- 审核 Filesystem、Haptics、Local Notifications、Splash Screen 在 iOS 的官方支持和
  权限语义；未验证的插件不得写“支持”。
- 不启用任意远程 server URL，不改变 local-first、无账号、无应用内 LLM 的边界。
- 不为 Spike 配正式签名、生产证书或 App Store 能力。

#### C3 · 编译证据

- `npm run build`
- `npx cap sync ios`
- 用 `xcodebuild -list` 发现实际 project/workspace 与 scheme，不猜路径。
- 对 iOS Simulator 做 Debug build，`CODE_SIGNING_ALLOWED=NO`；记录完整命令和退出码。
- 若能启动 Simulator，记录设备与 OS；若不能，只能报告“编译已过、运行证据缺失”，
  不得以浏览器代 Simulator。

**建议提交**：`chore: 建立 Capacitor iOS 技术 Spike`。生成文件与依赖为一笔，不与
后续行为修正混合。

### 阶段 D · 只修 Spike 证实的问题

先列证据，再改代码。允许的修正范围：

- safe area、状态栏、Home Indicator 与键盘遮挡。
- iOS leading-edge 系统返回与 Home 横滑冲突；系统手势优先，边缘区域不得被自定义
  手势抢占。若 Capacitor 单 WebView 根本没有原生返回栈，须据实记录，不伪称已支持。
- 输入框聚焦、键盘升降、滚动容器、Reader 文本选择。
- 主题首帧、后台恢复、深链冷启动和所属 Tab 恢复。
- 真实触控目标、VoiceOver 语义、Reduce Motion/Transparency/Contrast 降级。
- iOS 插件的窄适配层；业务层不得出现平台分支。

不得因为看到 iOS 就把所有 toolbar、sheet、tab、list 改成仿原生 CSS。若证据表明只有
原生 TabView/NavigationStack 才能满足独立栈、系统返回或辅助功能，停止编码，新增
`docs/ios-native-shell-decision.md`，列：

- 当前 Hybrid 做不到什么；
- 用户可感知后果；
- 最小原生壳与 SwiftUI 全量重写各自边界、成本和数据契约；
- 继续 Hybrid / 原生壳 / SwiftUI 三案；
- 推荐案与可推翻它的证据。

这份决策书交用户裁定。本轮无权越门实施原生壳或 SwiftUI 重写。

阶段 D 按一个逻辑问题一笔提交；提交信息用 `fix:` 或 `feat:`，不得把多个平台问题揉成
“iOS polish”。每笔先跑相关测试与 build。

### 阶段 E · 证据包与交付

新增 `docs/ios-r0-evidence.md`，性质署“批次证据，非底本”，至少包含：

- base / head SHA、依赖版本、macOS、Xcode、Simulator/设备与 iOS 版本；
- 本轮提交表与每笔职责；
- 命令、退出码和未消警告；
- 三主链路的步骤、fixture 与结果；
- 每张书影的 SHA、fixture、视口/设备、主题、文字尺寸、Reduce Motion 状态；
- VoiceOver / 键盘 / 手势 / safe area / 生命周期矩阵；
- 与 Android/Web 的回归矩阵；
- 未完成项与阻断；
- Hybrid 继续成立或进入原生壳决策门的证据，不写最终裁定。

书影只能来自真实构建、Simulator 或设备；浏览器截图须明标 Web，不冒 iOS 真迹。不得用
HTML mock、拼图或生成图当运行证据。

## 八、必验场景矩阵

### 8.1 三条主链路

| 链路 | 必验步骤 | 关键状态 |
|---|---|---|
| 记忆 | 首页 → 卡组 → 翻面 → 评分 → 撤销 → 完成 | 系统返回、滑评替代钮、触觉因果、事件只记一次 |
| 练习 | 首页 → 科目 → 选择/提交 → 解析 → 下一题 → 完成 | 键盘、错误态、收藏/删除、完成关系式 |
| 阅读 | 首页 → 集合 → 文档 → 选择文字 → 高亮/书签 → 返回 | 文本选择、侧栏/面板、滚动恢复、阅读会话落账 |

### 8.2 平台态

- Light / Dark；冷启动首帧不得先白后暗。
- 默认文字、200% 放大、至少一档 Accessibility Size；无水平裁切、按钮不消失。
- Reduce Motion 开/关；关闭位移动效后反馈仍可理解。
- Increase Contrast / Reduce Transparency 能测则测；不能测写明环境限制。
- 软键盘与硬件键盘；输入焦点可见，关闭键盘后布局复位。
- leading-edge swipe、Home 横滑、Review 滑评、Reader 文本选择互不抢夺。
- 前台 → 后台 → 前台；进程终止 → 冷启动；选中 Tab 与可恢复会话不串模块。
- 飞行模式/断网；核心功能无网络仍完整。
- iPhone 小屏与当前主尺寸；若有 iPad Simulator，至少保证不破版，不擅自复活横向编排。

### 8.3 无障碍

- 所有图标按钮有可理解名称；无“按钮，未命名”。
- 行即入口使用真实语义；自定义手势有屏上操作替代。
- 错误不只靠颜色；原因与下一步均可读。
- 焦点顺序与视觉顺序一致；push、sheet、错误出现与关闭后的焦点有归处。
- 44pt 触控目标按最终渲染框丈量，不以 CSS 声明代落点。

## 九、测试与门禁

Claude Code 交付前运行并原样记录：

```bash
npm run lint
npm run test
npm run collate
npm run collate:selftest
npm run build
npx cap sync ios
```

iOS 构建命令先通过 `xcodebuild -list` 发现后写入证据，不在本 handoff 猜定。新增或修改
门禁须配阴性对照，证明它能红。以下任一发生即不得交“Ready”：

- 测试数下降且无书面理由；
- collate 基线新增；
- 生成产物或书影无牌记；
- iOS 工程只能靠未提交的本机手改构建；
- 为过编译关闭数据保护、权限、类型检查或测试；
- 以 Web 浏览器代 iOS 运行证据；
- 工作树含与本轮无关的用户改动。

## 十、Git 纪律

- 开工先 `git status --short --branch`，保护已有改动；不 reset、不 checkout 覆盖用户工作。
- 一逻辑一 commit；每笔 build 绿后即提交。
- 只 stage 明确文件，禁 `git add .` / `git add -A`。
- 提交时显式限路径；并作环境不得带走他人 staged 文件。
- 不 rebase、不 squash 他人历史；不 push。
- 建议使用 `codex/ios-native-readiness-r0` 或用户指定分支；若直接在用户分支施工，实施
  报告必须说明。

建议提交序：

1. `fix: 收口活动口径与动作状态三缺`
2. `docs: 立 iOS 平台行为契约与决策门`
3. `chore: 建立 Capacitor iOS 技术 Spike`
4. `fix: …`（每个真机证实的平台问题各一笔）
5. `docs: 录 iOS R0 实测证据`

## 十一、停止条件

遇以下情况停止当前阶段，保留已完成的独立提交并向用户报告，不扩大权限或范围：

- 需要开发者账号、签名证书、付费服务、生产权限或真实通知 entitlement。
- 需要上传用户文件、备份或任何敏感数据到外部服务。
- 官方规范与项目既判发生实质冲突，且不能通过窄适配同时满足。
- 只有原生 TabView/NavigationStack 或 SwiftUI 重写才能满足核心行为。
- Xcode、Simulator、依赖下载或许可证阻断，正规授权后仍不可用。
- 发现存储迁移或备份契约未稳定，继续会威胁历史数据。
- 施工范围将超过本 handoff 所列目录或触及无关架构。

阻断报告须写：已完成 commit、阻断复现、尝试过的安全动作、需要用户裁定的单一问题。
不得把“尚未真机验证”写成“推测可行”。

## 十二、Claude Code 最终交付格式

最终消息必须按下列格式，事实先于判断：

```markdown
Ready for independent acceptance

Base: <sha>
Head: <sha>
Branch: <branch>

Commits:
- <sha> <subject> — <scope>

Changed:
- <file/dir> — <what and why>

Verification:
- npm run check — <exit/result>
- npm run collate:selftest — <exit/result>
- npx cap sync ios — <exit/result>
- xcodebuild … — <exit/result>
- Simulator/device — <model, OS, flows actually run>

Evidence:
- docs/ios-r0-evidence.md
- <real screenshot paths, if any>

Known limits / blocked:
- <truthful list; “none” only if genuinely none>

Not done:
- No push
- No App Store signing/release
- No SwiftUI/native-shell implementation

Requested next action:
- Codex independent acceptance against docs/ios-native-readiness-handoff.md
```

不得写“Codex 应该会通过”“所有视觉已验”之类代验语。

## 十三、Codex 独立验收规程

用户把 Claude Code 的 Base、Head、Branch 与证据路径交回后，Codex 才开始。验收顺序：

1. 核对工作树、提交边界与 handoff 基线漂移。
2. 逐 commit 读 diff，重点看数据口径、存储、平台分支、手势与无障碍。
3. 独立重跑 Web 全门禁、collate 阴性对照、Capacitor sync 与 iOS build。
4. 用真实构建复现三主链路；不复用 Claude Code 的判断，只把其证据当线索。
5. 以 Apple Design skill 对读系统手势优先、反馈延迟、可中断性、路径对称、触觉因果、
   Dynamic Type、Reduce Motion 与辅助技术。
6. 用刊例附录乙全表作活校；不刊项任一未过则不写定。
7. 输出 findings first，附文件与行号；最后给“通过 / 有条件通过 / 不通过”。

Codex 的最低独立复现：

- 仅阅读活动当天连续数不为 0；混合模块的本周文案无量纲错误。
- 三种 ActionButton 路径的成功、失败、重试可感知且不丢输入。
- 375×812 与至少一档较大文字的明暗三首页、活动、详情、完成页无裁切。
- iOS safe area、键盘、返回/横滑冲突与 Reader 文本选择有真实运行证据。
- 未命名按钮、纯色传义、无替代手势、未尊重 Reduce Motion 任一出现即记不刊。

只有 Codex 独立验收通过，用户再决定是否合并、push 或进入 iOS 原生壳决策轮。

## 十四、源文件快照（漂移提示）

开工时若下列 SHA-1 已变化，Claude Code 须重读新文件并在实施报告登记差异；此表只作
漂移提示，不赋予 handoff 高于现行底本的权威：

```text
e92f06edc62d3899613b89f39de8009ee57a8161  CLAUDE.md
83e504ee8d05cd320911b0c3f2b758ddc58e3942  docs/design-kanli.md
305de487f0f5eda7f747e7bc95868280b4e56eb0  docs/design-collation.md
4ec735e13dd42d5c862e660644cf19759a160570  docs/roadmap-long-term.md
ab266bec2b628243764387e2f16128c64c3702a4  docs/roadmap-maturity.md
1a632fa895f94e5c0d02bc62209eaf63a852f1bb  src/styles/tokens.css
108a04df5bf18adb119772d2a81e4dec7eb79ed6  package.json
fae64368c959ce5430c21afa324226015f8aee0b  capacitor.config.json
e37e415a02908c6dbe4291c3af6588218620dbfa  apple-design/SKILL.md
```

---

施工至此止于举证；验收另起一造。
