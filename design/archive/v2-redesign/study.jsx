/* eslint-disable */
// ════════════════════════════════════════════════
// Mnemos · Review (flashcard) + Quiz screens
// ════════════════════════════════════════════════
const { useState: useStateRV } = React;

const ReviewScreen = ({ d, onBack, nav }) => {
  const [idx, setIdx] = useStateRV(0);
  const [flipped, setFlipped] = useStateRV(false);
  const [done, setDone] = useStateRV(false);
  const [stats, setStats] = useStateRV({ again: 0, hard: 0, good: 1, easy: 0, correct: 1 });

  const cards = [
    { front: "矩阵乘法的可行性条件？", back: "若 A 为 m×n，B 为 p×q，乘积 AB 存在的充要条件是 n=p，结果为 m×q 矩阵。" },
    { front: "行列式按行展开的公式？", back: "|A| = Σ aᵢⱼ · Aᵢⱼ，其中 Aᵢⱼ 为代数余子式。" },
    { front: "线性无关的判定？", back: "向量组 α₁,…,αₙ 线性无关 ⟺ k₁α₁+…+kₙαₙ=0 仅有零解。" },
  ];
  const total = d?.due || 23;
  const card = cards[idx % cards.length];

  const rate = (kind) => {
    setStats(s => ({...s, [kind]: s[kind] + 1, correct: s.correct + (kind !== "again" ? 1 : 0)}));
    if (idx + 1 >= 3) { setDone(true); return; }
    setIdx(i => i + 1); setFlipped(false);
  };

  if (done) {
    return (
      <>
        <StatusBar/>
        <Topbar onBack={onBack} right={<button className="tb-btn"><Icon name="x" size={18}/></button>}/>
        <div className="done-wrap">
          <div className="done-mark"><Icon name="check" size={32} stroke={2}/></div>
          <div className="done-title">Mnēmosúnē</div>
          <div className="done-zh">本组复习完毕</div>
          <div className="done-stats">
            <span><span className="v">{stats.again+stats.hard+stats.good+stats.easy}</span> 已复习</span>
            <span className="sep">·</span>
            <span style={{color: "var(--good)"}}><span className="v" style={{color: "var(--good)"}}>{Math.round(stats.correct/(stats.again+stats.hard+stats.good+stats.easy)*100)}%</span> 正确率</span>
          </div>
          <div className="done-grid">
            <div className="cell again"><span className="num">{stats.again}</span>重来</div>
            <div className="cell hard"><span className="num">{stats.hard}</span>困难</div>
            <div className="cell good"><span className="num">{stats.good}</span>记住</div>
            <div className="cell easy"><span className="num">{stats.easy}</span>容易</div>
          </div>
          <div style={{display: "flex", gap: 8, width: "100%", marginTop: 14}}>
            <button className="btn btn-ghost btn-block" onClick={onBack}>返回卡组</button>
            <button className="btn btn-primary btn-block" onClick={() => { setDone(false); setIdx(0); setStats({ again: 0, hard: 0, good: 0, easy: 0, correct: 0 }); }}>再来一组</button>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <StatusBar/>
      <Topbar onBack={onBack} right={<button className="tb-btn"><Icon name="x" size={18}/></button>}/>
      <div className="rv-progress"><div className="bar" style={{width: ((idx+1)/3*100) + "%"}}/></div>
      <div className="rv-meta">
        <div className="crumb">{d?.name || "线性代数·核心定理"}<span className="div">·</span>第一章</div>
        <div className="pos"><span className="now">{idx+1}</span> / 3</div>
      </div>
      <div className="rv-card-wrap">
        <div className={"rv-card " + (flipped ? "flipped" : "")} onClick={() => setFlipped(true)}>
          <div className="corner"><span className="num">{idx+1}</span><span>· {flipped ? "VERSO" : "RECTO"}</span></div>
          <button className="star-btn" onClick={(e) => e.stopPropagation()}><Icon name="star" size={16}/></button>
          <div className="body">
            {!flipped ? (
              <div className="front-q">{card.front}</div>
            ) : (
              <>
                <div className="echo">{card.front}</div>
                <div className="reverso">REVERSO</div>
                <div className="back-a">{card.back}</div>
              </>
            )}
          </div>
          <div className="ornament"/>
        </div>
        {!flipped ? (
          <div className="rv-flip-hint">轻点翻面 · TAP TO FLIP</div>
        ) : (
          <div className="rate">
            <button className="rate-btn rate-again" onClick={() => rate("again")}>重来<span className="iv">&lt; 1m</span></button>
            <button className="rate-btn rate-hard" onClick={() => rate("hard")}>困难<span className="iv">6m</span></button>
            <button className="rate-btn rate-good" onClick={() => rate("good")}>记住<span className="iv">1d</span></button>
            <button className="rate-btn rate-easy" onClick={() => rate("easy")}>容易<span className="iv">4d</span></button>
          </div>
        )}
      </div>
    </>
  );
};

// ─── Quiz ───
const QuizScreen = ({ s, onBack }) => {
  const data = QUIZ_DATA.s1;
  const [idx, setIdx] = useStateRV(0);
  const [picked, setPicked] = useStateRV(null);
  const [submitted, setSubmitted] = useStateRV(false);
  const [starred, setStarred] = useStateRV(false);
  const [score, setScore] = useStateRV({ correct: 0, total: 0 });
  const [done, setDone] = useStateRV(false);
  const q = data.questions[idx];

  const submit = () => {
    if (!picked) return;
    setSubmitted(true);
    setScore(sc => ({ correct: sc.correct + (picked === q.correct ? 1 : 0), total: sc.total + 1 }));
  };
  const next = () => {
    if (idx + 1 >= data.questions.length) { setDone(true); return; }
    setIdx(i => i + 1); setPicked(null); setSubmitted(false); setStarred(false);
  };

  if (done) {
    return (
      <>
        <StatusBar/>
        <Topbar onBack={onBack} right={<button className="tb-btn"><Icon name="x" size={18}/></button>}/>
        <div className="done-wrap">
          <div className="done-mark" style={{background: "var(--teal-soft)", borderColor: "var(--teal-line)", color: "var(--teal)"}}><Icon name="check" size={32} stroke={2}/></div>
          <div className="done-title">一组练毕</div>
          <div className="done-zh">{data.chapter}</div>
          <div className="done-stats">
            <span><span className="v">{score.total}</span> 题</span>
            <span className="sep">·</span>
            <span><span className="v" style={{color: "var(--good)"}}>{score.correct}</span> 正确</span>
            <span className="sep">·</span>
            <span><span className="v" style={{color: "var(--good)"}}>{Math.round(score.correct/score.total*100)}%</span> 正确率</span>
          </div>
          <div style={{display: "flex", gap: 8, width: "100%", marginTop: 18}}>
            <button className="btn btn-ghost btn-block">错题回顾</button>
            <button className="btn btn-primary btn-block" onClick={() => { setDone(false); setIdx(0); setPicked(null); setSubmitted(false); setScore({correct: 0, total: 0}); }}>再来一组</button>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <StatusBar/>
      <Topbar onBack={onBack} right={
        <>
          <button className="tb-btn" onClick={() => setStarred(!starred)} style={{color: starred ? "var(--accent)" : null}}>
            <Icon name={starred ? "starf" : "star"} size={17}/>
          </button>
          <button className="tb-btn"><Icon name="more" size={17}/></button>
        </>
      }/>
      <div className="rv-progress"><div className="bar teal" style={{width: ((idx+1)/data.questions.length*100) + "%"}}/></div>
      <div className="rv-meta">
        <div className="crumb">{data.name}<span className="div">·</span>{data.chapter}</div>
        <div className="pos"><span className="now">{idx+1}</span> / {data.questions.length}</div>
      </div>
      <div className="rv-card-wrap">
        <div className="qa-card">
          <div className="corner">
            <span className="num">{idx+1}</span><span>· 选择题 · 单选</span>
          </div>
          <div className="qa-stem">{q.stem}</div>
          <div className="qa-options">
            {q.options.map(o => {
              let cls = "qa-opt";
              if (!submitted && picked === o.k) cls += " picked";
              if (submitted && o.k === q.correct) cls += " correct";
              if (submitted && picked === o.k && picked !== q.correct) cls += " wrong";
              if (submitted && o.k !== q.correct && picked !== o.k) cls += " faded";
              return (
                <button key={o.k} className={cls} disabled={submitted} onClick={() => setPicked(o.k)}>
                  <span className="qa-mark">{o.k}</span>
                  <span className="qa-text">{o.t}</span>
                </button>
              );
            })}
          </div>
          {submitted && (
            <div className="qa-explain">
              <strong>解析 · </strong>{q.explanation}
            </div>
          )}
        </div>
        <div style={{padding: "0"}}>
          {!submitted ? (
            <button className="btn btn-primary btn-block" disabled={!picked} onClick={submit}
              style={!picked ? {opacity: 0.4, cursor: "not-allowed"} : null}>
              提交答案
            </button>
          ) : (
            <button className="btn btn-primary btn-block" onClick={next}>
              {idx + 1 >= data.questions.length ? "完成 →" : "下一题 →"}
            </button>
          )}
        </div>
      </div>
    </>
  );
};

window.ReviewScreen = ReviewScreen; window.QuizScreen = QuizScreen;
