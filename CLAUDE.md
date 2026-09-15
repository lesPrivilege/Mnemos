# Mnemos

Capacitor + React SRS flashcard / quiz / reading app.

## 设计与书面（刊例）

1. 界面工作从 `~/Projects/Deswrit kit/03-刊例.md`；本项目槽位（宗、讳表、善本、行款、声部、槽位预留）在 [docs/design-kanli.md](docs/design-kanli.md)，裁定入 [docs/design-collation.md](docs/design-collation.md)（改必有记，拒准同档）。
2. 中文书面输出从 `~/Projects/Deswrit kit/01-凡例.md`。
3. 色、字号、圆角、缓动、时长字面量禁入组件——唯一底本 `src/styles/tokens.css`；`npm run collate` 死校，并入 `npm run check`。
4. 实施者不自验：每轮交付前由非实施 agent 持刊例附录乙审书状对读。
5. 新功能开工前四问（声部预算、行款可著录、记号携义、态俱全），答不出者不开工。

## Git Rules

1. **One logical change = one commit.** Never mix unrelated features in a single commit.
2. **Commit message format:** `type: description` — types: `feat`, `fix`, `tweak`, `chore`, `docs`, `refactor`.
3. **Commit after build passes.** Don't batch — commit each change as soon as `vite build` succeeds.
4. **Never push without explicit user request.** No auto-push.
5. **Stage specific files** — no `git add -A` or `git add .`.

## UX / Motion 样板间

[Design](docs/design/README.md) · [刊例](docs/design-kanli.md) · [裁定](docs/design-collation.md)。独立预览入口：`/design.html`。
