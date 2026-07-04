/* eslint-disable */
// ════════════════════════════════════════════════
// Mnemos · Detail screens — Deck / Set / Collection
// ════════════════════════════════════════════════
const { useState: useStateDD } = React;

// ─── DeckDetail ───
const DeckDetail = ({ d, nav, onBack }) => {
  const [openCh, setOpenCh] = useStateDD({ 0: true });
  const [openSec, setOpenSec] = useStateDD({});
  const pct = d.mastered / d.total;
  const allDone = d.mastered === d.total;
  return (
    <>
      <StatusBar/>
      <Topbar onBack={onBack} title={d.name} zh right={
        <>
          <button className="tb-btn"><Icon name="search" size={17}/></button>
          <button className="tb-btn"><Icon name="more" size={17}/></button>
        </>
      }/>
      <div className="phone-screen-scroll" style={{padding: "8px 0 16px", display: "flex", flexDirection: "column", gap: 14}}>
        <div className="dd-head">
          <div className="dd-meta">
            <span>共 {d.total} 张</span><span className="sep">·</span>
            <span>已掌握 {d.mastered}</span><span className="sep">·</span>
            <span>{Math.round(pct*100)}%</span>
            {d.lastReviewed && <><span className="sep">·</span><span>{d.lastReviewed}</span></>}
          </div>
          <div className="dd-progress"><div className="bar" style={{width: (pct*100) + "%"}}/></div>
        </div>
        <div style={{padding: "0 16px", display: "flex", flexDirection: "column", gap: 8}}>
          <button className={"dd-cta-main " + (allDone ? "disabled" : "")} onClick={() => !allDone && nav("review", d)}>
            <span className="left">
              <span className="lead">{allDone ? "已学完" : <><span className="num">{d.due}</span>张待复习</>}</span>
              <span className="sub">{allDone ? "ALL CAUGHT UP" : "TAP TO REVIEW"}</span>
            </span>
            <span className="arr">{allDone ? <Icon name="check" size={20} stroke={2}/> : "→"}</span>
          </button>
          <div className="dd-secondary">
            <button className="dd-action"><Icon name="eye" size={17}/><span className="lab">浏览</span></button>
            <button className="dd-action"><Icon name="rotate" size={17}/><span className="lab">全部复习</span></button>
            <button className="dd-action"><Icon name="import" size={17}/><span className="lab">导入</span></button>
            <button className="dd-action"><Icon name="plus" size={17}/><span className="lab">新卡片</span></button>
          </div>
        </div>
        <div style={{padding: "0 18px"}}>
          <div className="section-title">章节大纲 · CHAPTERS</div>
          <div style={{marginTop: 8}}>
            {(d.chapters || []).map((ch, i) => (
              <div key={i}>
                <div className="ch-row" onClick={() => setOpenCh(s => ({...s, [i]: !s[i]}))}>
                  <span className={"ch-caret " + (openCh[i] ? "open" : "")}>▸</span>
                  <span className="ch-name">{ch.name}</span>
                  <span className="ch-count">{ch.cards}</span>
                </div>
                {openCh[i] && (ch.sections || []).map((sec, j) => (
                  <div key={j}>
                    <div className="ch-row sec-row" onClick={() => setOpenSec(s => ({...s, [`${i}-${j}`]: !s[`${i}-${j}`]}))}>
                      <span className={"ch-caret " + (openSec[`${i}-${j}`] ? "open" : "")}>▸</span>
                      <span className="ch-name">{sec.name}</span>
                      <span className="ch-count">{sec.cards.length}</span>
                    </div>
                    {openSec[`${i}-${j}`] && sec.cards.map((c, k) => (
                      <div key={k} className="card-row">
                        <span className="dot-bullet"/>
                        <span className="front">{c.front}</span>
                        <Icon name={c.starred ? "starf" : "star"} size={13} stroke={1.4} className={c.starred ? "star-on" : "star-off"} style={{color: c.starred ? "var(--accent)" : "var(--ink-4)"}}/>
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  );
};

// ─── SetDetail (Practice subject) ───
const SetDetail = ({ s, nav, onBack }) => {
  const [openCh, setOpenCh] = useStateDD({ 1: true });
  const pct = s.done / s.total;
  return (
    <>
      <StatusBar/>
      <Topbar onBack={onBack} title={s.name} zh right={<>
        <button className="tb-btn"><Icon name="search" size={17}/></button>
        <button className="tb-btn"><Icon name="more" size={17}/></button>
      </>}/>
      <div className="phone-screen-scroll" style={{padding: "8px 0 16px", display: "flex", flexDirection: "column", gap: 14}}>
        <div className="dd-head">
          <div className="dd-meta">
            <span>共 {s.total} 题</span><span className="sep">·</span>
            <span>已做 {s.done}</span><span className="sep">·</span>
            <span style={{color: "var(--good)", fontWeight: 600}}>{Math.round(s.accuracy*100)}%</span>
            <span className="sep">·</span>
            <span style={{color: "var(--accent)", fontWeight: 600}}>{s.wrongCount} 错题</span>
          </div>
          <div className="dd-progress"><div className="bar teal" style={{width: (pct*100) + "%"}}/></div>
        </div>
        <div style={{padding: "0 16px", display: "flex", flexDirection: "column", gap: 8}}>
          <button className="dd-cta-main teal" onClick={() => nav("quiz", s)}>
            <span className="left">
              <span className="lead">开始练习</span>
              <span className="sub">CONTINUE FROM 第二章</span>
            </span>
            <span className="arr">→</span>
          </button>
          <div className="dd-secondary">
            <button className="dd-action"><Icon name="x" size={17}/><span className="lab">错题 {s.wrongCount}</span></button>
            <button className="dd-action"><Icon name="starf" size={16}/><span className="lab">收藏 {s.starredCount}</span></button>
            <button className="dd-action"><Icon name="import" size={17}/><span className="lab">导入</span></button>
            <button className="dd-action"><Icon name="export" size={17}/><span className="lab">导出</span></button>
          </div>
        </div>
        <div style={{padding: "0 18px"}}>
          <div className="section-title">章节 · CHAPTERS</div>
          <div style={{marginTop: 8}}>
            {(s.chapters || []).map((ch, i) => {
              const cp = ch.done / ch.total;
              return (
                <div key={i}>
                  <div className="ch-row" onClick={() => setOpenCh(s2 => ({...s2, [i]: !s2[i]}))}>
                    <span className={"ch-caret " + (openCh[i] ? "open" : "")}>▸</span>
                    <span className="ch-name">{ch.name}</span>
                    <div style={{display: "flex", alignItems: "center", gap: 8}}>
                      <span className="ch-count">{ch.done}/{ch.total}</span>
                      <div style={{width: 32, height: 3, background: "var(--bg-raised)", borderRadius: 2, overflow: "hidden"}}>
                        <div style={{width: (cp*100)+"%", height: "100%", background: "var(--teal)"}}/>
                      </div>
                    </div>
                  </div>
                  {openCh[i] && (
                    <div style={{padding: "4px 22px 8px", display: "flex", gap: 8, flexWrap: "wrap"}}>
                      <button className="btn btn-sm btn-accent" onClick={() => nav("quiz", s)}><Icon name="play" size={11}/> 选择题</button>
                      {ch.hasReview && <button className="btn btn-sm btn-ghost"><Icon name="pen" size={11}/> 解答题</button>}
                      <button className="btn btn-sm btn-ghost"><Icon name="x" size={11}/> 错题回顾</button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </>
  );
};

// ─── CollectionDetail ───
const CollectionDetail = ({ c, nav, onBack }) => {
  return (
    <>
      <StatusBar/>
      <Topbar onBack={onBack} title={c.name} zh right={<>
        <button className="tb-btn"><Icon name="search" size={17}/></button>
        <button className="tb-btn"><Icon name="more" size={17}/></button>
      </>}/>
      <div className="phone-screen-scroll" style={{padding: "8px 0 16px", display: "flex", flexDirection: "column", gap: 14}}>
        <div className="dd-head">
          <div className="dd-meta">
            <span>共 {c.docCount} 篇</span><span className="sep">·</span>
            <span>已读 {c.readCount}</span><span className="sep">·</span>
            <span>{c.totalMinutes} 分钟</span><span className="sep">·</span>
            <span style={{color: "var(--accent)"}}>24 高亮</span>
          </div>
        </div>
        <div style={{padding: "0 16px", display: "flex", flexDirection: "column", gap: 8}}>
          <button className="dd-cta-main" onClick={() => nav("reader", { docId: "doc2", collectionId: c.id })}>
            <span className="left">
              <span className="lead">继续阅读</span>
              <span className="sub">第二章 · 导数与微分 · 62%</span>
            </span>
            <span className="arr">→</span>
          </button>
          <div className="dd-secondary">
            <button className="dd-action"><Icon name="import" size={17}/><span className="lab">导入</span></button>
            <button className="dd-action"><Icon name="plus" size={17}/><span className="lab">新文档</span></button>
            <button className="dd-action"><Icon name="export" size={17}/><span className="lab">导出高亮</span></button>
            <button className="dd-action"><Icon name="stats" size={17}/><span className="lab">统计</span></button>
          </div>
        </div>
        <div style={{padding: "0 18px"}}>
          <div className="section-title">文档 · DOCUMENTS</div>
          <div style={{marginTop: 8}}>
            {(c.docs || []).map((doc, i) => (
              <div key={doc.id} className="doc-row" onClick={() => nav("reader", { docId: doc.id, collectionId: c.id })}>
                <span className={"doc-dot " + (doc.progress === 1 ? "read" : "")}/>
                <span className="doc-title">{doc.title}</span>
                <span className="doc-meta">{doc.progress > 0 && doc.progress < 1 ? Math.round(doc.progress*100) + "%" : (doc.progress === 1 ? "✓" : "")}</span>
                <span className="doc-fmt">{doc.format}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  );
};

window.DeckDetail = DeckDetail; window.SetDetail = SetDetail; window.CollectionDetail = CollectionDetail;
