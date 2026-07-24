# Design Tokens — 指针件

**性质** 影刻指针，非权威。本文件曾为 Claude Design 约束单（Phase B 暖调值），2026-07-24 查明与底本漂移（对勘三处：bg 光/hue、accent 记法、radii 全档），依刊例第三条以讹论，降格为本指针（判例七，见 `docs/design-collation.md`）。

**牌记** 降格于 feat/kanli-adoption 轮；降格前全文见 git 史（最后修订提交 42c282f）。

## 真值所在

| 求何 | 见何处 |
|---|---|
| 一切 token 现值（色/字/字阶/间距/圆角/动效/表面） | `src/styles/tokens.css` —— 唯一底本，直接读文件 |
| 三层规则、字轨政策、声部预算、行款著录语 | `docs/design-kanli.md` |
| 顶栏不透明、双语减法、字轨、朱声部等既判裁定 | `docs/design-collation.md` 判例册 |
| token 对对比度实测表 | `docs/contrast-table.md`（死校产出，携牌记） |
| 死校门禁 | `scripts/collate/`，`npm run collate` |

原型与设计稿引用 token 时，只准引用底本中的变量名，缺则以「token 提案」形式回报，不得自带字面量——此约束沿自本文件旧版第 8 节，现由死校机器执行。
