/* eslint-disable */
// ════════════════════════════════════════════════
// Mnemos · Reader (immersive, side panels, tap-toggle)
// ════════════════════════════════════════════════
const { useState: useStateRD, useEffect: useEffectRD, useRef: useRefRD } = React;

const ReaderScreen = ({ docId = "doc2", onBack }) => {
  const doc = DOC_CONTENT[docId] || DOC_CONTENT.doc2;
  const [chromeVisible, setChromeVisible] = useStateRD(true);
  const [panel, setPanel] = useStateRD(null); // null | toc | highlight | bookmark
  const [showSettings, setShowSettings] = useStateRD(false);
  const [fontSize, setFontSize] = useStateRD("中");
  const [lineH, setLineH] = useStateRD("正常");
  const [margin, setMargin] = useStateRD("中");
  const [hlFab, setHlFab] = useStateRD(null); // {x, y}
  const [highlights, setHighlights] = useStateRD([
    { id: "h1", paraIdx: 2, text: "瞬时速度", time: "今天 09:08" },
    { id: "h2", paraIdx: 3, text: "越来越小的区间上的平均变化率", time: "今天 09:11" },
    { id: "h3", paraIdx: 11, text: "乘积法则 (uv)' = u'v + uv'", time: "今天 09:36" },
  ]);
  const [flashIdx, setFlashIdx] = useStateRD(null);
  const [toast, setToast] = useStateRD(null);
  const [progress, setProgress] = useStateRD(0.62);
  const scrollRef = useRefRD(null);

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(null), 1400); };

  const onProseTap = (e) => {
    if (e.target.closest(".hl")) return; // selection click handled
    if (panel) { setPanel(null); return; }
    setChromeVisible(v => !v);
    setShowSettings(false);
  };

  // simulate selection — clicking a paragraph long shows fab
  const simulateSelection = (e, paraIdx) => {
    e.stopPropagation();
    const r = e.currentTarget.getBoundingClientRect();
    const phone = e.currentTarget.closest(".phone-screen-inner").getBoundingClientRect();
    setHlFab({ x: r.left + r.width/2 - phone.left, y: r.bottom - phone.top + 8, paraIdx, text: "选中文字示例片段" });
  };

  const saveHighlight = () => {
    if (!hlFab) return;
    const newH = { id: "h" + Date.now(), paraIdx: hlFab.paraIdx, text: hlFab.text, time: "刚刚" };
    setHighlights(arr => [newH, ...arr]);
    setFlashIdx(hlFab.paraIdx);
    setTimeout(() => setFlashIdx(null), 600);
    setHlFab(null);
    showToast("已保存高亮");
    setPanel("highlight");
    setChromeVisible(true);
  };

  const fontSizes = { "小": 14, "中": 15, "大": 17 };
  const lineHs = { "紧": 1.7, "正常": 1.95, "松": 2.2 };
  const margins = { "窄": 16, "中": 28, "宽": 40 };

  return (
    <div style={{position: "relative", flex: 1, display: "flex", flexDirection: "column", overflow: "hidden", background: "var(--bg)"}}>
      <StatusBar/>

      {/* tiny progress pill, persistent */}
      {!chromeVisible && (
        <div className="rd-progress-pill">
          <span>{Math.round(progress*100)}%</span>
          <div className="bar-mini"><div className="fill" style={{width: (progress*100)+"%"}}/></div>
        </div>
      )}

      {/* Top bar */}
      <div className={"rd-topbar " + (chromeVisible ? "" : "hidden")}>
        <button className="tb-btn" onClick={onBack}><Icon name="back" size={18}/></button>
        <div className="ttl">{doc.title}</div>
        <button className="tb-btn"><Icon name="more" size={17}/></button>
      </div>

      {/* Prose */}
      <div ref={scrollRef} className="phone-screen-scroll" onClick={onProseTap} style={{padding: 0}}>
        <div className="reader-prose" style={{
          fontSize: fontSizes[fontSize] + "px",
          lineHeight: lineHs[lineH],
          padding: `${chromeVisible ? "70px" : "40px"} ${margins[margin]}px 100px`,
          transition: "padding 240ms",
        }}>
          <h1>{doc.title}</h1>
          <div className="author">{doc.author}</div>
          {doc.paras.map((p, i) => {
            if (p.type === "h2") return <h2 key={i} id={p.id}>{p.text.replace(/^§ /, "").replace(/^[\d.]+\s*/, "")}</h2>;
            if (p.type === "quote") return <blockquote key={i}>{p.text}</blockquote>;
            if (p.type === "code") {
              return (
                <pre key={i} className="code-block">
                  <span className="code-block-head">{p.lang}</span>
                  {p.lines.map((ln, li) => (
                    <div key={li}><span className="ln">{li+1}</span>{ln.tokens.map((tk, ti) => tk.length === 0 ? null : <span key={ti} className={"tk-" + tk[0]}>{tk[1]}</span>)}</div>
                  ))}
                </pre>
              );
            }
            // paragraph with optional highlights
            let content = p.text;
            const parts = [];
            let rest = content;
            const hls = (p.hl || []).slice();
            // also include saved highlights for this paraIdx
            highlights.forEach(h => { if (h.paraIdx === i && !hls.includes(h.text)) hls.push(h.text); });

            const flash = flashIdx === i;
            // Render with each hl wrapped
            let nodes = [content];
            hls.forEach(h => {
              const next = [];
              nodes.forEach(n => {
                if (typeof n !== "string") { next.push(n); return; }
                const idx = n.indexOf(h);
                if (idx === -1) { next.push(n); return; }
                next.push(n.slice(0, idx));
                next.push(<span key={"hl-"+i+"-"+h.length+"-"+idx} className={"hl " + (flash ? "flash" : "")} onDoubleClick={(e)=>simulateSelection(e,i)}>{h}</span>);
                next.push(n.slice(idx + h.length));
              });
              nodes = next;
            });
            return (
              <p key={i} onContextMenu={(e)=>{e.preventDefault(); simulateSelection(e,i);}}>{nodes}</p>
            );
          })}
        </div>
      </div>

      {/* Highlight FAB */}
      {hlFab && (
        <button className="hl-fab" style={{left: hlFab.x, top: Math.min(hlFab.y, 600)}} onClick={saveHighlight}>
          <Icon name="highlight" size={12}/> 保存高亮 <span className="arr">↵</span>
        </button>
      )}

      {/* Settings expansion */}
      {showSettings && chromeVisible && (
        <div className="rd-settings-row" onClick={(e)=>e.stopPropagation()}>
          <div className="lbl"><Icon name="type" size={10} style={{verticalAlign: "middle", marginRight: 4}}/> 字号</div>
          <div className="seg">{["小","中","大"].map(o => <button key={o} className={fontSize===o?"on":""} onClick={()=>setFontSize(o)}>{o}</button>)}</div>
          <div className="lbl"><Icon name="spacing" size={10} style={{verticalAlign: "middle", marginRight: 4}}/> 行距</div>
          <div className="seg">{["紧","正常","松"].map(o => <button key={o} className={lineH===o?"on":""} onClick={()=>setLineH(o)}>{o}</button>)}</div>
          <div className="lbl"><Icon name="margin" size={10} style={{verticalAlign: "middle", marginRight: 4}}/> 边距</div>
          <div className="seg">{["窄","中","宽"].map(o => <button key={o} className={margin===o?"on":""} onClick={()=>setMargin(o)}>{o}</button>)}</div>
        </div>
      )}

      {/* Bottom toolbar */}
      <div className={"rd-toolbar " + (chromeVisible ? "" : "hidden")}>
        <button className={"rd-tool " + (panel === "toc" ? "on" : "")} onClick={()=>{setPanel(panel==="toc"?null:"toc"); setShowSettings(false);}}><Icon name="list" size={17}/></button>
        <button className={"rd-tool " + (panel === "highlight" ? "on" : "")} onClick={()=>{setPanel(panel==="highlight"?null:"highlight"); setShowSettings(false);}}><Icon name="highlight" size={17}/></button>
        <button className={"rd-tool " + (panel === "bookmark" ? "on" : "")} onClick={()=>{setPanel(panel==="bookmark"?null:"bookmark"); setShowSettings(false);}}><Icon name="bookmark" size={17}/></button>
        <button className={"rd-tool " + (showSettings ? "on" : "")} onClick={()=>setShowSettings(s=>!s)}><Icon name="settings" size={17}/></button>
      </div>

      {/* Side panels overlay */}
      <div className={"rd-overlay " + (panel ? "on" : "")} onClick={() => setPanel(null)}/>

      <div className={"rd-panel " + (panel === "toc" ? "open" : "")}>
        <div className="rd-panel-head">
          <div><h3>目录</h3><div className="sub">TABLE OF CONTENTS</div></div>
          <button className="tb-btn" onClick={() => setPanel(null)}><Icon name="x" size={16}/></button>
        </div>
        <div className="rd-panel-body">
          {doc.sections.map((s, i) => (
            <div key={i} className={"rd-toc-item l" + s.level + (s.id === "s4" ? " cur" : "")}>{s.title}</div>
          ))}
        </div>
      </div>

      <div className={"rd-panel " + (panel === "highlight" ? "open" : "")}>
        <div className="rd-panel-head">
          <div><h3>高亮 <span style={{color: "var(--ink-3)", fontWeight: 400, fontSize: 12}}>{highlights.length}</span></h3><div className="sub">HIGHLIGHTS</div></div>
          <button className="tb-btn" onClick={() => setPanel(null)}><Icon name="x" size={16}/></button>
        </div>
        <div className="rd-panel-body">
          {highlights.map(h => (
            <div key={h.id} className="rd-hl-item">
              <div className="hl-meta">{h.time} · § 2.{h.paraIdx > 7 ? "2" : "1"}</div>
              <div className="hl-text">{h.text}</div>
            </div>
          ))}
        </div>
      </div>

      <div className={"rd-panel " + (panel === "bookmark" ? "open" : "")}>
        <div className="rd-panel-head">
          <div><h3>书签 <span style={{color: "var(--ink-3)", fontWeight: 400, fontSize: 12}}>{doc.bookmarks.length}</span></h3><div className="sub">BOOKMARKS</div></div>
          <button className="tb-btn" onClick={() => setPanel(null)}><Icon name="x" size={16}/></button>
        </div>
        <div className="rd-panel-body">
          {doc.bookmarks.map(b => (
            <div key={b.id} className="rd-hl-item" style={{borderLeft: "2px solid var(--teal)"}}>
              <div className="hl-meta">{b.time}</div>
              <div style={{fontFamily: "var(--font-zh)", fontSize: 12, color: "var(--ink)"}}>{b.snippet}</div>
            </div>
          ))}
          <button className="btn btn-ghost btn-block" style={{marginTop: 12}} onClick={() => showToast("已添加书签")}>
            <Icon name="plus" size={13}/> 在当前位置添加书签
          </button>
        </div>
        <div className="rd-panel-foot">
          <button className="btn btn-ghost btn-block" onClick={() => showToast("已导出高亮")}>
            <Icon name="export" size={13}/> 导出高亮 · MARKDOWN
          </button>
        </div>
      </div>

      {toast && <div className="toast">{toast}</div>}

      {/* Hint to test selection */}
      {chromeVisible && !hlFab && !panel && (
        <div style={{position: "absolute", bottom: 64, left: "50%", transform: "translateX(-50%)", fontFamily: "var(--font-mono)", fontSize: 9, color: "var(--ink-4)", letterSpacing: 0.16, textTransform: "uppercase", pointerEvents: "none"}}>
          双击段落 · 模拟选词
        </div>
      )}
    </div>
  );
};

window.ReaderScreen = ReaderScreen;
