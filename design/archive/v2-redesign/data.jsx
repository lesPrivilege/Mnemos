/* eslint-disable */
// ════════════════════════════════════════════════
// Mnemos · Mock data — 3 subsystems with realistic Chinese content
// ════════════════════════════════════════════════

const DATA = {
  // ─── Recall · 卡组 ───
  decks: [
    {
      id: "d1", name: "线性代数·核心定理", glyph: "线", pinned: true,
      total: 142, mastered: 58, due: 23, newCards: 7,
      lastReviewed: "今天 09:22",
      chapters: [
        { name: "第一章 · 矩阵与行列式", cards: 28, sections: [
          { name: "1.1 矩阵基本运算", cards: [
            { front: "矩阵乘法的可行性条件？", back: "若 A 为 m×n，B 为 p×q，乘积 AB 存在的充要条件是 n=p，结果为 m×q 矩阵。", starred: true },
            { front: "矩阵加法满足交换律吗？", back: "满足。同型矩阵的加法满足交换律与结合律。" },
            { front: "矩阵乘法是否满足交换律？", back: "一般不满足。即 AB ≠ BA。仅在特定条件下（如对角矩阵之间）成立。" },
          ]},
          { name: "1.2 行列式性质", cards: [
            { front: "行列式按行展开的公式？", back: "|A| = Σ aᵢⱼ · Aᵢⱼ，其中 Aᵢⱼ 为代数余子式。" },
            { front: "行列式何时为零？", back: "当矩阵存在两行（列）相等、成比例，或有一行（列）全为零时，行列式为零。", starred: true },
          ]},
        ]},
        { name: "第二章 · 向量空间", cards: 34, sections: [
          { name: "2.1 线性相关与无关", cards: [
            { front: "线性无关的判定？", back: "向量组 α₁,…,αₙ 线性无关 ⟺ k₁α₁+…+kₙαₙ=0 仅有零解。" },
          ]},
          { name: "2.2 基与维数", cards: []},
        ]},
        { name: "第三章 · 特征值与特征向量", cards: 22 },
        { name: "第四章 · 二次型", cards: 18 },
      ],
    },
    { id: "d2", name: "数学分析·极限与连续", glyph: "数", total: 96, mastered: 96, due: 0, newCards: 0, lastReviewed: "昨天 21:14" },
    { id: "d3", name: "古典文献学", glyph: "古", total: 64, mastered: 24, due: 12, newCards: 8, lastReviewed: "3天前" },
    { id: "d4", name: "拉丁语·变格", glyph: "拉", total: 88, mastered: 31, due: 5, newCards: 0, lastReviewed: "1周前" },
  ],

  // ─── Practice · 题库 ───
  subjects: [
    { id: "s1", name: "高等数学(一)", glyph: "高", pinned: true,
      total: 218, done: 142, accuracy: 0.78, wrongCount: 31, starredCount: 12, due: 18,
      chapters: [
        { name: "第一章 · 函数、极限与连续", total: 32, done: 28, hasReview: true },
        { name: "第二章 · 一元函数微分学", total: 45, done: 30 },
        { name: "第三章 · 一元函数积分学", total: 38, done: 22 },
        { name: "第四章 · 多元函数微分学", total: 41, done: 12 },
        { name: "第五章 · 多元函数积分学", total: 36, done: 0 },
        { name: "第六章 · 无穷级数", total: 26, done: 0 },
      ],
    },
    { id: "s2", name: "线性代数", glyph: "线", total: 124, done: 58, accuracy: 0.82, wrongCount: 14, starredCount: 6, due: 6 },
    { id: "s3", name: "概率论与数理统计", glyph: "概", total: 96, done: 12, accuracy: 0.67, wrongCount: 4, starredCount: 0, due: 0 },
  ],

  // ─── Reading · 阅读集合 ───
  collections: [
    { id: "c1", name: "微积分·教科书", glyph: "微", docCount: 14, readCount: 8, totalMinutes: 312,
      docs: [
        { id: "doc1", title: "第一章 · 函数与极限", format: "MD", words: 4820, progress: 1.0, lastRead: "今天" },
        { id: "doc2", title: "第二章 · 导数与微分", format: "MD", words: 5240, progress: 0.62, lastRead: "今天" },
        { id: "doc3", title: "第三章 · 中值定理与导数应用", format: "MD", words: 6120, progress: 0.34, lastRead: "昨天" },
        { id: "doc4", title: "第四章 · 不定积分", format: "MD", words: 4980, progress: 0.0, lastRead: "—" },
        { id: "doc5", title: "第五章 · 定积分及其应用", format: "MD", words: 5640, progress: 0.0, lastRead: "—" },
      ],
    },
    { id: "c2", name: "数学史·读本", glyph: "史", docCount: 6, readCount: 6, totalMinutes: 184 },
    { id: "c3", name: "算法导论·选篇", glyph: "算", docCount: 9, readCount: 2, totalMinutes: 76 },
  ],

  // Activity (last 90 days, fake)
  activity: (() => {
    const out = [];
    let seed = 12345;
    const rand = () => { seed = (seed * 9301 + 49297) % 233280; return seed / 233280; };
    for (let i = 89; i >= 0; i--) {
      const dow = i % 7;
      const weekendDip = (dow === 0 || dow === 6) ? 0.5 : 1;
      out.push({
        d: i,
        recall:   Math.round(rand() * 30 * weekendDip),
        practice: Math.round(rand() * 18 * weekendDip),
        readMin:  Math.round(rand() * 45 * weekendDip),
      });
    }
    return out;
  })(),

  // Today's targets
  targets: { recall: 30, practice: 15, readMin: 30 },
  todayProgress: { recall: 23, practice: 11, readMin: 28 },

  // weekly bars (this week, 7 days)
  weekRecall: [12, 18, 8, 22, 14, 19, 11],   // 周一..周日
  weekPractice: [4, 7, 3, 8, 5, 6, 2],
  weekReadMin: [22, 35, 14, 41, 18, 28, 12],
};

// Document content for reader
const DOC_CONTENT = {
  doc2: {
    title: "第二章 · 导数与微分",
    author: "数学分析讲义 · 第三版",
    sections: [
      { id: "s1", level: 1, title: "§ 2.1 导数的概念" },
      { id: "s2", level: 2, title: "2.1.1 引例：瞬时速度" },
      { id: "s3", level: 2, title: "2.1.2 导数的定义" },
      { id: "s4", level: 1, title: "§ 2.2 求导法则" },
      { id: "s5", level: 2, title: "2.2.1 函数的和、差、积、商" },
      { id: "s6", level: 2, title: "2.2.2 复合函数的导数" },
      { id: "s7", level: 1, title: "§ 2.3 高阶导数" },
    ],
    paras: [
      { type: "h2", id: "s1", text: "§ 2.1 导数的概念" },
      { type: "p", text: "导数是微分学的核心概念。它描述函数在某一点处的变化率，是连接代数与几何的桥梁。从物理直觉出发，导数对应于瞬时速度；从几何直觉出发，导数对应于切线斜率。这两种解释虽然源自不同的领域，却殊途同归地指向同一个数学结构。" },
      { type: "h2", id: "s2", text: "2.1.1 引例：瞬时速度" },
      { type: "p", text: "设质点沿直线运动，其位置函数为 s = f(t)。在时间区间 [t₀, t₀ + Δt] 内，质点的平均速度为 v̄ = [f(t₀+Δt) − f(t₀)] / Δt。当 Δt → 0 时，平均速度的极限值即为质点在 t₀ 时刻的瞬时速度。", hl: ["瞬时速度"] },
      { type: "p", text: "这一极限过程蕴含了导数的本质：用越来越小的区间上的平均变化率，去逼近某一点的瞬时变化率。", hl: ["越来越小的区间上的平均变化率"] },
      { type: "h2", id: "s3", text: "2.1.2 导数的定义" },
      { type: "p", text: "设函数 f(x) 在点 x₀ 的某邻域内有定义。若极限 limΔx→0 [f(x₀+Δx) − f(x₀)] / Δx 存在，则称 f(x) 在 x₀ 处可导，该极限值称为 f(x) 在 x₀ 处的导数，记作 f'(x₀)。" },
      { type: "quote", text: "可导必连续，连续未必可导。" },
      { type: "p", text: "上述命题揭示了可导性与连续性之间的深刻关系。一个经典反例是 f(x) = |x| 在 x = 0 处连续但不可导——此处函数图像存在尖角，左右导数不相等。" },
      { type: "code", lang: "PYTHON", lines: [
        { tokens: [["com", "# 数值微分：用差商逼近导数"]] },
        { tokens: [["key", "def"], ["op", " "], ["fn", "derivative"], ["op", "(f, x, h="], ["num", "1e-7"], ["op", "):"]] },
        { tokens: [["op", "    "], ["key", "return"], ["op", " (f(x + h) - f(x - h)) / ("], ["num", "2"], ["op", " * h)"]] },
        { tokens: [[]] },
        { tokens: [["com", "# 计算 sin 在 π/4 处的导数 ≈ cos(π/4) ≈ 0.707"]] },
        { tokens: [["fn", "import"], ["op", " "], ["fn", "math"]] },
        { tokens: [["fn", "print"], ["op", "(derivative(math.sin, math.pi / "], ["num", "4"], ["op", "))"], ["op", "  "], ["com", "# → 0.7071067..."]] },
      ]},
      { type: "h2", id: "s4", text: "§ 2.2 求导法则" },
      { type: "p", text: "求导是一项机械化的操作。一旦掌握基本初等函数的导数公式与若干求导法则，几乎任何由初等函数构成的表达式都可以求导。这一结论被形式化为「初等函数在其定义区间上可导」。" },
      { type: "h2", id: "s5", text: "2.2.1 函数的和、差、积、商" },
      { type: "p", text: "设 u(x), v(x) 在 x 处可导，则：和差法则 (u ± v)' = u' ± v'；乘积法则 (uv)' = u'v + uv'；商法则 (u/v)' = (u'v − uv') / v²，v ≠ 0。乘积法则常被表述为「左导右不导，加上左不导右导」，便于记忆。", hl: ["乘积法则 (uv)' = u'v + uv'"] },
      { type: "h2", id: "s6", text: "2.2.2 复合函数的导数" },
      { type: "p", text: "若 y = f(u)，u = g(x)，且二者均可导，则复合函数 y = f(g(x)) 关于 x 可导，其导数为 dy/dx = (dy/du)(du/dx)。这一公式称为链式法则，是求导运算中最重要也最常用的工具。" },
      { type: "h2", id: "s7", text: "§ 2.3 高阶导数" },
      { type: "p", text: "若导函数 f'(x) 仍可导，其导数 f''(x) 称为 f 的二阶导数；以此类推，可定义任意阶的导数 f⁽ⁿ⁾(x)。在物理学中，位置的二阶导数为加速度；在几何学中，二阶导数的符号决定了函数图像的凹凸性。" },
    ],
    bookmarks: [
      { id: "bm1", paraIdx: 4, snippet: "导数的定义", time: "今天 09:14" },
      { id: "bm2", paraIdx: 11, snippet: "求导法则", time: "今天 09:38" },
    ],
  },
};

// Quiz data
const QUIZ_DATA = {
  s1: {
    name: "高等数学(一)",
    chapter: "第二章 · 一元函数微分学",
    questions: [
      {
        id: "q1", type: "choice",
        stem: "设函数 f(x) = x² · sin(1/x), x ≠ 0; f(0) = 0。下列叙述正确的是：",
        options: [
          { k: "A", t: "f(x) 在 x = 0 处不连续。" },
          { k: "B", t: "f(x) 在 x = 0 处连续但不可导。" },
          { k: "C", t: "f(x) 在 x = 0 处可导但 f'(x) 在 x = 0 处不连续。" },
          { k: "D", t: "f(x) 在 x = 0 处的二阶导数存在。" },
        ],
        correct: "C",
        explanation: "由定义计算 f'(0) = limₓ→0 x · sin(1/x) = 0 存在；但 f'(x) = 2x·sin(1/x) − cos(1/x), x ≠ 0，limₓ→0 cos(1/x) 不存在。故选 C。",
      },
      {
        id: "q2", type: "choice",
        stem: "若 f(x) 在 [a,b] 上连续，在 (a,b) 内可导，且 f(a) = f(b)，则由罗尔定理可知：",
        options: [
          { k: "A", t: "至少存在一点 ξ ∈ (a,b) 使 f'(ξ) = 0。" },
          { k: "B", t: "f(x) 在 (a,b) 内恒等于常数。" },
          { k: "C", t: "f'(x) 在 (a,b) 内有界。" },
          { k: "D", t: "f(x) 在 (a,b) 内单调。" },
        ],
        correct: "A",
        explanation: "罗尔定理的结论：若 f 满足三个条件（连续、可导、端点等值），则至少存在一点导数为零，即水平切线必然存在。",
      },
    ],
  },
};

window.DATA = DATA;
window.DOC_CONTENT = DOC_CONTENT;
window.QUIZ_DATA = QUIZ_DATA;
