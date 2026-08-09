# iOS 平台行为契约

**性质** 平台契约，非第二视觉底本。色、字、字阶、圆角、间距、动效时长一律不在此文出值——唯一底本仍是 `src/styles/tokens.css`，设计常法在 [`design-kanli.md`](design-kanli.md) 与 [`design-collation.md`](design-collation.md)。本文只答一件事：**Apple 平台的行为公法落到 Mnemos 现行架构上，是什么、缺什么、何处须裁。**

**牌记** 立于 2026-08-09；基线 `main` / `d75a2d8`（阶段 A 之後）；Mnemos 1.5.0；React 18 + Vite 6 + Capacitor 8.3.1；HIG 引文访问日期 2026-08-09。施工单见 [`ios-native-readiness-handoff.md`](ios-native-readiness-handoff.md) 阶段 B。

**读法** 本文所载多为**未经真机验证之推论**，各条自署证据等级：

| 记号 | 义 |
|---|---|
| 〔码〕 | 由本仓源码读出，可复核 |
| 〔文〕 | 由官方文档读出，附链接与访问日期 |
| 〔推〕 | 由前两者推得，**未在 iOS 上跑过**，须真机销账 |

阶段 C（Capacitor iOS 工程）本轮**未做**：本机只有 Command Line Tools，无 Xcode、无 Simulator、无 CocoaPods，而 Capacitor 8 之 iOS 明载 "Xcode 26.0+ is required"〔文〕。故本文所有〔推〕条目一律待验，不得引作已验事实。

---

## 一、来源与访问日期

皆 2026-08-09 访问。Apple HIG 页面为前端渲染，`WebFetch` 只取得标题，正文经浏览器取得——此为取证方法之记，非结论。

| 来源 | 用于本文何节 |
|---|---|
| [Human Interface Guidelines](https://developer.apple.com/design/human-interface-guidelines) | 全篇总纲 |
| [Design principles](https://developer.apple.com/design/human-interface-guidelines/design-principles) | §十二 决策门之判准 |
| [Layout](https://developer.apple.com/design/human-interface-guidelines/layout) | §六 安全区、§七 字体缩放 |
| [Tab bars](https://developer.apple.com/design/human-interface-guidelines/tab-bars) | §四 Tab Bar 决策 |
| [Accessibility](https://developer.apple.com/design/human-interface-guidelines/accessibility) | §七、§八、§九 |
| [Apple Design Resources](https://developer.apple.com/design/resources/) | §四 图标尺寸（本轮未取用） |
| [SwiftUI Navigation](https://developer.apple.com/documentation/swiftui/navigation) | §十二 |
| [NavigationStack](https://developer.apple.com/documentation/swiftui/navigationstack) | §三、§十二 |
| [Capacitor iOS](https://capacitorjs.com/docs/ios) | §二、§十一 |
| [Capacitor Configuration](https://capacitorjs.com/docs/config) | §六、§十一 |
| [Capacitor App plugin](https://capacitorjs.com/docs/apis/app) | §五 返回、§十一 生命周期 |

Apple 现行 HIG 通篇以 **Liquid Glass** 描述 chrome 材质（Tab bars 页 2026-06-08 改版）。此为平台现行之貌，**Mnemos 不取**——家讳2「WebView 仿真 iOS/Material 控件外观」正禁此事。本文取其**行为公法**（tab 何时可见、状态如何保留、触控多大、动效如何降级），不取其签名形。

---

## 二、Hybrid 与 Native 的词义

三者边界须先说定，否则「要不要上原生」这句话无法讨论。

| 名 | 所指 | 数据契约 | 本轮态度 |
|---|---|---|---|
| **Hybrid（现行）** | 单一 `WKWebView` 承载全部 UI 与业务；原生层只出插件（Filesystem、Haptics、LocalNotifications、SplashScreen、App）。`ios/App/App.xcworkspace`〔文〕 | 唯一实现，唯一存储（localStorage + IndexedDB） | 默认案 |
| **原生壳** | 原生 `UITabBarController`／SwiftUI `TabView` 承三顶级区，每区一个 `WKWebView`；业务逻辑仍在 Web 层 | 仍唯一实现；须新增壳↔Web 的路由与状态桥 | 须证据方开 |
| **SwiftUI 全量重写** | 界面与业务皆 Swift | **两套实现**；备份格式成为两端唯一互通契约 | 本轮无权实施 |

判据一句：**只有当「原生壳能做到而单 WebView 做不到」的事，用户能感知、且无法以窄适配补上时，才越门。**「更像 iOS」不是理由（家讳2）。

---

## 三、导航映射

现行路由为 `HashRouter`，三顶级区由 `Home` 一屏内的三个 tab pane 承载，非三条独立栈。〔码：`src/App.jsx`、`src/pages/Home.jsx`〕

| 概念 | Apple 侧 | Mnemos 现行 | 差 |
|---|---|---|---|
| 顶级区 | Tab bar 三项，各自保有导航状态〔文〕 | `Home` 内 `tab` state（0/1/2），持久于 `sessionStorage['mnemos-home-tab']` + `?tab=` 查询串〔码〕 | 三区**共用一条历史栈**，非三条 |
| 推入详情 | `NavigationStack` 每 tab 一条，返回即出栈〔文〕 | `navigate('/deck/:id')`，全应用一条 hash 历史 | 从 A 区进详情、切到 B 区、再返回，栈之所属不明 |
| 返回 | 系统 Back 按钮 + leading-edge swipe〔文〕 | `useBackButton` 之**声明式父路由表**：由 `ROUTES` 逐对指定 child→parent〔码：`src/lib/useBackButton.js:9`〕 | 返回是「跳到父」，不是「出栈」；因此不依赖历史，反而更稳 |
| 深链 | `NavigationStack(path:)` 可编程恢复〔文〕 | hash URL 即深链；`?tab=` 恢复所属 tab〔码：`Home.jsx:25`〕 | 深链恢复 tab 已有，**冷启动是否恢复，未验**〔推〕 |
| 状态恢复 | 系统按 tab 各保其栈〔文〕 | 会话另存（`loadReviewSession`、`loadLastSession`）；滚动位置未见持久化〔码〕 | 见 §十一 |

**Apple 之要求**：tab bar 「preserv[es] the current navigation state within each section」〔文，Tab bars〕。Mnemos 现行是**近似**——切 tab 保住的是「哪个 tab」，不是「该 tab 里走到第几层」。因为三区之详情皆推到同一条历史上，切 tab 时详情已经不在屏上了。

**判**：此差是否要治，须由真机上「从卡组详情返回是否回到记忆 tab」这条实测回答〔推〕。不先写实现。

---

## 四、Tab Bar 决策（逐屏）

HIG 之两条正文：

> "Make sure the tab bar is visible when people navigate to different sections of your app. If you hide the tab bar, people can forget which area of the app they're in. The exception is when a modal view covers the tab bar, because a modal is temporary and self-contained."

> "Don't disable or hide tab bar buttons, even when their content is unavailable."

〔文，Tab bars，2026-08-09〕

Mnemos 现行：底栏只在 `location.pathname === '/'` 时渲染〔码：`src/App.jsx:36`〕。即**除首页外全部隐藏**。逐屏对判：

| 屏 | 现行底栏 | 是否属 HIG 之「modal」例外 | 判 |
|---|---|---|---|
| 记忆／练习／阅读首页 | 在 | — | 合 |
| 复习会话 `/review/:id` | 隐 | **是**——全屏、自足、有明确终点（完成屏）与退出（返回钮）。判例五已裁会话直排、去卡套卡，同宗 | 合，留 |
| 练习会话 `/quiz/:subject` | 隐 | 同上 | 合，留 |
| 阅读器 `/reading/doc/:id` | 隐 | **存疑**——阅读非一次性任务，可长可短，且用户在文档间穿行的时间可能长于任一会话。它更像「区内深层」而非「临时模态」 | **待裁**，见下 |
| 卡组详情、集合详情、科目详情 | 隐 | **否**——这是区内的下一层，不是模态。HIG 正面禁此 | **不合**，待裁 |
| 活动、设置、导入、搜索 | 隐 | 否，但它们不属任一顶级区 | 见下 |

**四类之判准**（本文所立，待真机校）：

1. **会话类**（复习、练习）——隐，合例外。理由可一句陈述：有始有终、有唯一退出、退出即回原区。
2. **区内深层**（卡组／集合／科目详情）——HIG 曰不当隐。然 Mnemos 之返回不是「出栈」而是「跳父」〔码〕，父即该区首页，**所属区从未丢失**。故「忘记身在何区」这一 HIG 所虑之害，在此架构下是否成立，须实测〔推〕。**不先改**。
3. **阅读器**——本文不判。它同时具备会话之全屏与深层之久留，两种归类各有理，且真正的判据是「用户中断阅读後回到哪里」，只有实测能答。
4. **跨区工具**（活动、设置、导入、搜索）——不属任一顶级区，隐底栏正确；HIG 所谓「哪个 tab 高亮」在此本无答案。

**已合之一处**：底栏三项从不禁用、从不按内容有无增减〔码：`bottomTabs` 为常量表〕，合「Don't disable or hide tab bar buttons」。空态由 `EmptyState` 解释，亦合 "If a section is empty, explain why its content is unavailable"〔文〕。

**不采**：HIG 之 More tab、badge、Liquid Glass 材质、iPadOS 之 tab↔sidebar 互换。前二无今义（三区不会溢出、无「critical information」可徽），後二属签名形与横向编排，横向已拒（记-21，拒准同档）。

---

## 五、系统手势优先级

**先记一件由源码读出的事实，它比本节其余各条都要紧。**

`useBackButton` 之原生返回，挂在 `App.addListener('backButton')` 上〔码：`src/lib/useBackButton.js:105`〕。Capacitor 官方文档载：

> "Listen for the hardware back button event (**Android only**)."

〔文，Capacitor App plugin，2026-08-09〕

**故 Mnemos 现行之原生返回契约整个是 Android 的。** iOS 无硬件返回键，亦不发此事件；`App.exitApp()` 之退出路径在 iOS 上不适用（且 iOS 不许应用自杀）。iOS 上唯一的返回入口是各屏顶栏那颗 `.tb-btn`〔码：如 `src/pages/Activity.jsx:176`〕。

leading-edge swipe 之实情〔推〕：

- 单 `WKWebView` 无原生导航栈，故**系统级 swipe-back 本无可返之处**。
- `WKWebView.allowsBackForwardNavigationGestures` 若开，返回的是**网页历史**，而 Mnemos 之返回是「跳父」而非「回退」——二者在多数屏并不同义（例：`/review/:id` 之父是 `/deck/:id`，而网页历史上一条可能是 `/`）。Capacitor 配置表未暴露此项〔文，Capacitor Configuration〕。
- 结论：**iOS 上大概率既没有系统返回手势，也没有可替它的东西。** 这不是「须优化」，是「缺一条主路径」。

冲突表（皆〔推〕，待实测填「实况」一列）：

| 手势 | 区域 | 与之竞争者 | 现行处置 | 屏上替代 |
|---|---|---|---|---|
| iOS leading-edge back | 左沿 ~20pt | Home 三 tab 横滑（`onTouchStart/Move/End`，阈 8px，锁轴後 `preventDefault`〔码：`Home.jsx:42-75`〕） | **未处置**——横滑起手点不排除左沿 | 底栏三项即 tab 之替代，合「Offer alternatives to gestures」〔文〕 |
| iOS leading-edge back | 左沿 | Review 滑评 | 未处置 | 评分四钮恒在，替代已足 |
| iOS leading-edge back | 左沿 | Reader 文本选择 | 未处置 | 选择另有长按路径 |
| Home 横滑 | tab 视口 | 纵向滚动 | 已处置：8px 迟滞後锁轴，锁 y 则不拦〔码〕 | 底栏 |
| Reader 文本选择 | 正文 | 页面滚动 | 系统默认 | 无（选择本身即替代不了的） |

**本文所裁**：一切自定义横滑，其**起手点若落在 leading edge 之内，须让位于系统**——此为 HIG「Prefer system gestures and behaviors people are already familiar with」〔文，Accessibility〕之直接推论。实现待 iOS 实测确认系统手势确实存在；若实测证明单 WebView 根本收不到系统返回手势，则本条无对象，改记入 §十二 决策门之触发证据，**不得伪称已支持**。

**已合**：每个手势皆有屏上替代（tab 横滑↔底栏、滑评↔评分钮）。此合 HIG「if you use a swipe gesture to dismiss a view, also make a button available」〔文〕。

---

## 六、安全区与键盘

现行〔码〕：

- `index.html:5` 已有 `viewport-fit=cover`——`env(safe-area-inset-*)` 方生效之前提，已具。
- 顶栏 `padding: env(safe-area-inset-top, 0px) 18px 0`〔`index.css:37`〕。
- 底栏 `padding: 9px 0 calc(8px + env(safe-area-inset-bottom, 0px))`〔`index.css:1293`〕。
- 页面滚动区 `padding-bottom: calc(96px + env(safe-area-inset-bottom, 0px))`〔`index.css:1350`〕。
- 浮动栏 `padding: 20px 18px max(20px, env(safe-area-inset-bottom))`〔`index.css:167`〕。

即**四处 chrome 已接安全区，落点齐全**。这是 Android 刘海屏一轮的遗产，iOS 可直接受用〔推：值是否恰当须真机量〕。

**须裁之一处**：`capacitor.config.json` 未设 `ios.contentInset`，其默认为 `'never'`〔文，Capacitor Configuration〕。`'never'` 表示 WKWebView 之 `UIScrollView` 不自动让开安全区——由 CSS `env()` 自行负责。Mnemos 既已全用 `env()`，`'never'` 是**正确的默认**，不改。若改为 `'always'` 反而会与 CSS 双重让让，出双倍留白。此条记之，防日后有人「顺手打开」。

键盘（皆〔推〕）：

- 软键盘升起时 iOS 之行为与 Android 不同（Android 多走 `resize`，iOS 走 `viewport` 偏移），`.page-fixed` 一类固定高度容器可能被顶出视口。三处受影响之屏已知：新建卡组表单、导入 JSON 文本域、新建文档表单。
- 硬件键盘：Full Keyboard Access 须验 Tab 序与焦点环。`:focus-visible` 全局已有〔码：`index.css:31`，记-27〕。
- 键盘收起後布局须复位；输入焦点须始终可见。
- **未装 `@capacitor/keyboard` 插件**〔码：`package.json`〕。是否需要，由实测定，不预装。

方向：横向已拒（记-21，主令），iOS 同判——仅保不破版，不做编排。HIG「Aim to support both portrait and landscape orientations」〔文，Layout〕与此冲突，然此为项目既判，属**已登记之背离**，见 §十二。

---

## 七、字体与缩放

**保留 Mnemos 字轨全体**（design-kanli §五「字轨四声」）。HIG 曰 "Default to the platform's system font before a custom face"〔apple-design §15〕；Mnemos 之字轨是宗之一部（宋治界面、仿宋治内容、Times 展示、mono 数据），属**已登记之背离**——理由在册（判例三、记-10），不因平台而动摇。

可用之公法：

| HIG 之数 | 值 | Mnemos 现况 |
|---|---|---|
| iOS 默认正文字号 | 17 pt〔文〕 | `--text-xl` = 1rem = 16px 为内容阅读锚〔码：tokens.css〕。低于 17pt，**待裁**〔推〕 |
| iOS 最小字号 | 11 pt〔文〕 | `--text-2xs` = 0.625rem = 10px，**低于最小值**〔码〕。用于微标／kicker／mono-mini |
| 放大 | "at least 200 percent"〔文〕 | 字阶已全数 rem 起（记-16），**Dynamic Type 就绪**；200% 是否不丢功能，未验〔推〕 |
| 对比度 | ≤17pt 全字重 4.5:1；18pt 3:1；粗体 3:1〔文〕 | 死校门三逐对算 WCAG AA，两纸全 PASS〔码：`docs/contrast-table.md`〕。**门之限度仍在**：校 token 不校落点（记-28） |

**两处须真机裁**〔推〕：

1. `--text-2xs`（10px）低于 iOS 最小 11pt。它承微标与 mono 计数，非正文。HIG 之最小值针对「custom type styles」之可读性；10px 之 mono 数字在 3× 屏是否可读，目验方知。**不先改**——改字阶是全库接线，代价大于本轮所知之害。
2. Dynamic Type 在 WKWebView 内不自动生效：iOS 的文字大小设置不改 WebView 的 `rem` 基准，除非应用显式桥接。**故「rem 就绪」不等于「Dynamic Type 已支持」**——这是记-16 自述「Dynamic Type 就绪」一语的边界，此处写明，防日后误读为已达成。真实支持须 `-webkit-text-size-adjust` 或原生桥，两者皆待实测後裁。

---

## 八、无障碍

HIG 之数〔文，Accessibility，2026-08-09〕：

- iOS/iPadOS 控件默认 **44×44 pt**，最小 **28×28 pt**。
- 「about 12 points of padding around elements that include a bezel」「about 24 points... For elements without a bezel」。
- "Convey information with more than color alone."
- "Offer alternatives to gestures."
- "Minimize use of time-boxed interface elements. Views and controls that auto-dismiss on a timer can be problematic for people who need longer to process information... **Prefer dismissing views with an explicit action.**"

对 Mnemos 之落点：

| 条 | 现况 | 判 |
|---|---|---|
| 44pt 触控 | roadmap Phase 4.3 列为待覆核；评分钮与 FloatingBar 未逐个丈量 | **待验**，须按**最终渲染框**量，不以 CSS 声明代落点（记-23 之教训） |
| 非色线索 | 已立为常法：danger 之识别须「2px 重描边＋恒在图标＋明确动词，缺一即讹」（记-25） | 合 |
| 手势替代 | 见 §五表末列 | 合 |
| VoiceOver 名 | 图标钮已带 `aria-label`〔码：`Home.jsx:89`、`Activity.jsx:176`〕；全屏覆盖率未查 | **待验** |
| 焦点顺序 | `pressable()` 已使九处 div 行入 Tab 序（记-14）；语义级 Link 归一列 M4 未做〔码〕 | 已知缺口，在册 |
| 自动消失之态 | **新引一处**：`ActionNotice` 4000ms 後自撤，`ActionButton` 之 `done` 1600ms 後回 idle〔码：`src/components/ActionNotice.jsx`、`ActionButton.jsx`〕 | **不合此条，须登记**，见下 |

**登记一处本轮自造之背离**（记-32 之代价）：动作确认签定时自撤，正是 HIG 所谓 time-boxed element。缓解有二——① 确认之**持久载体是列表里新出现的那一行**，签只是宣告，非唯一信号；② 签以 `role="status"` `aria-live="polite"` 出，辅助技术在其存续期内必宣读一次。然「Prefer dismissing views with an explicit action」并未因此满足。**处置**：本轮不改（改则须引入可关闭之持久通知，是新记号，须走记号谱），登记为待裁项，随 VoiceOver 实测批一并判——若实测显示 4 秒不足以宣读完一句中文确认语，则此项升为不刊。

**不取**：Assistive Access 优化、Accessibility Nutrition Labels、Music Haptics、字幕／音频描述——Mnemos 无音视频，无 App Store 上架（本轮明确不做）。

---

## 九、主题与材质

- Light／Dark 已两纸皆备，冷启动首帧即着纸，无闪变（记-11）〔码：`main.jsx`〕。iOS 冷启动首帧待真机验〔推〕。
- `prefers-color-scheme` 之外，另须应对三档系统偏好〔文，apple-design §14〕：

| 偏好 | Apple 之要求 | Mnemos 现况 |
|---|---|---|
| `prefers-reduced-motion` | "reducing automatic and repetitive animations"；具体手法：收紧弹簧、动效跟手、避 z 轴、以淡变代位移、避进出模糊〔文〕 | 部分已有（记-27 于原型内补齐）；**全屏覆盖率未查**〔推〕。项目既有家讳6（弹簧不出手势域）与「静为常」，与此条同向 |
| `prefers-reduced-transparency` | 半透明转实底、去模糊〔文〕 | `backdrop-blur` 全库唯 `--surface-chrome-*` 一处（design-kanli §二临文不讳）。**未接此媒体查询**〔码〕 |
| `prefers-contrast` | 「near-solid backgrounds with a defined, contrasting border」〔文〕 | 未接〔码〕 |

**判**：後二者各只需一条媒体查询，落点唯一（chrome blur、边框），代价极小。然本轮无 iOS 可验其生效，**列为阶段 D 之候选，不盲改**——改了无从证明它有效，即违「不以未验之事入簿」。

**不取**：Liquid Glass 整面材质、玻璃拟态（国讳）、iOS 风格的分组表格样式。

---

## 十、触觉语汇

`src/lib/haptics.js` 现有四式〔码〕：`Light` / `Medium` impact、`Success` / `Warning` notification。design-kanli §八「触觉声部」槽位载：轻＝人裁，中＝确认，警＝警示，「缺规范，成一页表」。

本文补其表，判准取 apple-design §13 之三事（因果、同帧、有用）：

| 档 | Capacitor 调用 | 何时 | 何时**不**触发 |
|---|---|---|---|
| 轻 | `Impact(Light)` | 人裁落点：评分四钮按下、收藏、高亮标记 | 一切滚动、切 tab、导航 |
| 中 | `Impact(Medium)` | 提交：会话完成、导入成功、新建成功 | 每次输入、每行渲染 |
| 成 | `Notification(Success)` | 与「中」互斥择一，不叠 | — |
| 警 | `Notification(Warning)` | 错误、leech 卡告警 | 仅是「没有内容」之空态 |

**两条硬规**：

1. **触觉不得单独传义**（HIG「Convey information with more than color alone」之同型推论）——无视觉或文案同时表达者，不得只震。
2. **须与视觉同帧**〔文，apple-design §13 Harmony〕。现行 `haptics.js` 之调用为 `await` 之 Promise，与 React 渲染不同步〔码〕；iOS 上是否可感知地滞後，**待实测**〔推〕。

iOS 之支持面待验：`@capacitor/haptics` 于 iOS 走 `UIFeedbackGenerator`，须真机（Simulator 无触觉硬件）。**Simulator 跑不出触觉证据**，此为已知取证缺口。

---

## 十一、生命周期与本地优先

| 事 | Apple／Capacitor 侧 | Mnemos 现行 | 待验〔推〕 |
|---|---|---|---|
| 冷启动 | SplashScreen 插件；首帧底色 | `capacitor.config.json` 之 `SplashScreen.backgroundColor: "#F6F7F8"` 为**明纸值写死**，暗纸用户冷启动先明後暗〔码〕 | iOS 首帧闪变；此病 Android 已记（记-04），iOS 同源 |
| 前後台 | `appStateChange` / `pause` / `resume`〔文〕 | `reminders.js` 已用 `@capacitor/app`〔码〕 | 後台返回後会话是否续、滚动位是否留 |
| 进程终止 | — | 会话另存于 storage〔码〕 | 冷启动是否恢复所属 tab 与可续会话 |
| 深链 | `getLaunchUrl()` / `appUrlOpen`〔文〕 | **未接**〔码〕；`?tab=` 只在应用内生效 | 冷启动带 URL 之行为 |
| 离线 | — | 全应用无网络采集，local-first，无账号，无应用内 LLM（架构边界） | 飞行模式核心功能应完整 |
| 存储 | — | localStorage（小 key）+ IndexedDB（`mnemos-data`、reading doc bodies）〔码：`src/lib/idb.js`〕 | **iOS 之 WKWebView 有存储清理策略**，与 Android 不同；备份路径语义亦不同 |
| 导入导出 | `@capacitor/filesystem` | 自动备份写 Documents〔码：`autoBackup.js`〕 | iOS 之 Documents 语义、可见性与 iCloud 备份纳入与否 |

**存储一条须特别记**：记忆项已立「IDB 改动须真浏览器烟测，`fake-indexeddb` 不证 WebView 平价」。iOS 之 WKWebView 是**第三个引擎**（Android WebView、桌面 Chrome 之外），其 IndexedDB 配额与清理策略未验。此为进入发布路径前的硬前置，不因本轮未做而消失。

**不引入**：远程 server URL、网络采集、iCloud 同步、推送、Widget、Shortcuts、Spotlight、分享扩展——皆本轮明确不做，且前四项触及架构边界。

---

## 十二、决策门

三档，各写触发证据，不写实现。

### 甲 · Web 层可修（默认）

- safe area 值之微调、键盘遮挡、滚动容器、焦点可见。
- `prefers-reduced-transparency` / `prefers-contrast` 两条媒体查询。
- 触控目标补足 44pt。
- VoiceOver 名之补全。
- 自定义横滑让位 leading edge（若该手势确实存在）。

**判准**：改动只落在 `src/`，无平台分支，Android/Web 行为不回退。

### 乙 · 须 Capacitor 插件或原生配置

- SplashScreen 底色随纸（须 native 层，CSS 不可达；生成脚本以注释牌记指 `tokens.css`，不复制无出处常数——记-04 之既定工法）。
- 键盘行为（若 CSS 不能解，则 `@capacitor/keyboard`）。
- 深链冷启动（`getLaunchUrl`）。
- 触觉与视觉同帧（若实测确有可感知滞後）。

**判准**：Web 层已试而不可达，且插件为官方件、其 iOS 支持已在文档中查实——「未验证的插件不得写『支持』」。

### 丙 · 只有原生壳／SwiftUI 才能满足（**须停工，交用户裁定**）

触发证据（任一成立即停，新增 `docs/ios-native-shell-decision.md`）：

1. **三区各自的导航栈**——实测证明「切 tab 後返回，回不到原区所在之层」，且此在单 WebView 内无法以路由表补上。
2. **系统 leading-edge 返回**——实测证明单 WKWebView 收不到系统返回手势，且用户确实因此找不到出路（不是「不够 iOS」，是「走不出去」）。§五所载之「返回契约整个是 Android 的」〔码〕即此门之首条候选证据，但**尚不足以越门**：iOS 上顶栏返回钮仍在，路径未断。须真机证明其不足。
3. **辅助技术**——VoiceOver 或 Switch Control 在单 WebView 内无法达成 HIG 所要求的焦点与栈语义。

**HIG 之判准可引者**〔文，Design principles〕：Familiarity 曰「Only break a familiar pattern if you can prove it's better — then test it, don't assume」。此句两面用——它既拦「因为像 iOS 所以照抄」，也拦「因为是我们的风格所以不改」。两边都要证据。

### 已登记之背离（非缺陷，有据在册）

| 背离 | Apple 侧 | 据 |
|---|---|---|
| 不用系统字体 | "Default to the platform's system font before a custom face" | 字轨四声属宗（判例三、记-10） |
| 不做横向编排 | "Aim to support both portrait and landscape orientations" | 记-21 主令，拒准同档；仅保不破版 |
| 不取 Liquid Glass／不仿控件皮 | HIG 现行材质语汇 | 家讳2；取行为不取签名形 |
| 确认签定时自撤 | "Prefer dismissing views with an explicit action" | 记-32；缓解与待裁见 §八 |

---

## 十三、本文之限度

1. 除〔码〕〔文〕两类外，**全篇未在 iOS 上跑过一次**。阶段 C 未做，原因见牌记。
2. HIG 引文取自 2026-08-09 之现行页。Apple 改版频繁（Tab bars 页 2026-06-08 方改），日後复核须重取，不得以本文日期当永久版本号。
3. 本文不改常法。§四、§五、§七、§八所载凡与现行底本冲突者，一律只**登记差异与提案**，改常法须走 `docs/design-collation.md` 之「改何 · 据何 · 判准 · 证据」并同步 `design-kanli.md` 槽位。本轮**未新增校勘记**——因所有平台结论皆待验，无一够格入簿。
4. 本文不是验收结论。
