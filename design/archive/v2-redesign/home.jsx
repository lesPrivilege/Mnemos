/* eslint-disable */
// ════════════════════════════════════════════════
// Mnemos · Home (3 tabs) + shared subsections
// ════════════════════════════════════════════════
const { useState, useMemo } = React;

const HeroSection = ({ tab, onActivity }) => {
  // numbers vary by tab
  const cfg = {
    practice: { lbl: "本周 · THIS WEEK", main: 142, mainLab: "DONE", mainZh: "完成", side: [
      { num: "78%", lab: "ACCURACY", zh: "正确率", t: "teal" },
      { num: 31, lab: "WRONG", zh: "错题", t: "accent" },
    ], bars: DATA.weekPractice, accent: "accent" },
    recall: { lbl: "今日 · TODAY", main: 23, mainLab: "DUE", mainZh: "待复习", side: [
      { num: 142, lab: "REVIEWED", zh: "已复习", t: "teal" },
      { num: 7, lab: "STREAK", zh: "连续", t: "accent" },
    ], bars: DATA.weekRecall, accent: "accent" },
    reading: { lbl: "本周 · THIS WEEK", main: 184, mainLab: "MIN", mainZh: "分钟", side: [
      { num: 8, lab: "DOCS", zh: "文档", t: "teal" },
      { num: 24, lab: "HIGHLIGHTS", zh: "高亮", t: "accent" },
    ], bars: DATA.weekReadMin, accent: "teal" },
  }[tab];
  const max = Math.max(...cfg.bars, 1);
  const today = 4; // 周五
  const days = ["一","二","三","四","五","六","日"];
  return (
    <div className="hero" onClick={onActivity}>
      <div className="hero-tap-hint">↗ ACTIVITY</div>
      <div className="hero-head">
        <div className="lbl">{cfg.lbl}</div>
        <div className="streak"><Icon name="flame" size={11}/> 7 日</div>
      </div>
      <div className="hero-row">
        <div className="hero-col">
          <div className={"num " + cfg.accent}>{cfg.main}</div>
          <div className="label">{cfg.mainLab}</div>
          <div className="zh-label">{cfg.mainZh}</div>
        </div>
        <div className="hero-divider"/>
        {cfg.side.map((s,i) => (
          <div key={i} className="hero-col">
            <div className={"num " + s.t}>{s.num}</div>
            <div className="label">{s.lab}</div>
            <div className="zh-label">{s.zh}</div>
          </div>
        ))}
      </div>
      <div className="hero-chart">
        {cfg.bars.map((v,i) => {
          const h = Math.max(2, Math.round((v/max) * 22));
          const cls = i === today ? "today" : (v === 0 ? "empty" : (cfg.accent === "teal" ? "teal" : ""));
          return (
            <div key={i} className={"hero-bar " + cls}>
              <div className="b" style={{height: h + "px"}}/>
              <div className="day">{days[i]}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

const ContinueCard = ({ tab, onClick, onDismiss }) => {
  const cfg = {
    practice: { glyph: "→", name: "高等数学(一) · 第二章", stat: "继续 · 第 14 / 32 题", pct: 0.44 },
    recall:   { glyph: "→", name: "线性代数·核心定理", stat: "继续 · 还有 23 张待复习", pct: 0.41 },
    reading:  { glyph: "→", name: "导数与微分", stat: "继续阅读 · 微积分·教科书", pct: 0.62 },
  }[tab];
  return (
    <div className="deck continue" onClick={onClick}>
      <div className="deck-spine"><div className="glyph">{cfg.glyph}</div></div>
      <div className="deck-meta">
        <div className="deck-name">{cfg.name}</div>
        <div className="deck-stats">{cfg.stat}</div>
      </div>
      <div className="deck-cta">
        <div className="deck-progress-tiny">
          <svg viewBox="0 0 36 36" width="36" height="36">
            <circle cx="18" cy="18" r="15" fill="none" stroke="var(--bg-raised)" strokeWidth="2.5"/>
            <circle cx="18" cy="18" r="15" fill="none" stroke="var(--accent)" strokeWidth="2.5"
              strokeDasharray={`${cfg.pct * 94.2} 100`} strokeLinecap="round"
              transform="rotate(-90 18 18)"/>
            <text x="18" y="20.5" textAnchor="middle" fontSize="9" fontFamily="var(--font-mono)" fill="var(--ink-2)" fontWeight="600">{Math.round(cfg.pct*100)}</text>
          </svg>
        </div>
        <button className="deck-dismiss" onClick={(e) => { e.stopPropagation(); onDismiss && onDismiss(); }}><Icon name="x" size={14}/></button>
      </div>
    </div>
  );
};

const DeckCard = ({ d, onClick }) => {
  const cls = spineClass(d.id);
  return (
    <div className="deck" onClick={onClick}>
      <div className={"deck-spine " + cls}><div className="glyph">{d.glyph}</div></div>
      <div className="deck-meta">
        <div className="deck-name">
          {d.name}
          {d.pinned && <span className="deck-pin">◆</span>}
        </div>
        <div className="deck-stats">
          {d.due > 0 ? <span className="due">{d.due} 待复习</span> : <span className="ok">已学完</span>}
          <span className="dot">·</span>
          <span>{d.mastered}/{d.total}</span>
          {d.newCards > 0 && <><span className="dot">·</span><span>{d.newCards} 新</span></>}
        </div>
      </div>
      <div className="deck-cta">
        {d.due > 0 ? (
          <button className="cta-pill" onClick={(e)=>{e.stopPropagation(); onClick();}}>
            复习 <span className="arr">→</span>
          </button>
        ) : (
          <span className="cta-done"><Icon name="check" size={14} stroke={2}/></span>
        )}
      </div>
    </div>
  );
};

const SubjectCard = ({ s, onClick }) => {
  const cls = spineClass(s.id + "p");
  return (
    <div className="deck" onClick={onClick}>
      <div className={"deck-spine " + cls}><div className="glyph">{s.glyph}</div></div>
      <div className="deck-meta">
        <div className="deck-name">
          {s.name}
          {s.pinned && <span className="deck-pin">◆</span>}
        </div>
        <div className="deck-stats">
          <span>{s.done}/{s.total}</span>
          <span className="dot">·</span>
          <span className="ok">{Math.round(s.accuracy*100)}%</span>
          {s.wrongCount > 0 && <><span className="dot">·</span><span className="due">{s.wrongCount} 错</span></>}
        </div>
      </div>
      <div className="deck-cta">
        {s.due > 0 ? (
          <button className="cta-pill teal">练习 <span className="arr">→</span></button>
        ) : (
          <span className="cta-done"><Icon name="check" size={14} stroke={2}/></span>
        )}
      </div>
    </div>
  );
};

const CollectionCard = ({ c, onClick }) => {
  const cls = spineClass(c.id + "r");
  return (
    <div className="deck" onClick={onClick}>
      <div className={"deck-spine " + cls}><div className="glyph">{c.glyph}</div></div>
      <div className="deck-meta">
        <div className="deck-name">{c.name}</div>
        <div className="deck-stats">
          <span>{c.readCount}/{c.docCount} 读完</span>
          <span className="dot">·</span>
          <span>{c.totalMinutes} 分钟</span>
        </div>
      </div>
      <div className="deck-cta">
        <button className="cta-pill">阅读 <span className="arr">→</span></button>
      </div>
    </div>
  );
};

// Bottom action row (import / new)
const BottomActions = ({ items }) => (
  <div style={{padding: "0 16px 16px", display: "flex", gap: 8}}>
    {items.map((it,i) => (
      <button key={i} className="btn btn-ghost btn-block" onClick={it.onClick}>
        <Icon name={it.icon} size={14}/> {it.label}
      </button>
    ))}
  </div>
);

// Brand header (page top)
const BrandHeader = ({ subtitle, onSearch, onSettings, onImport }) => (
  <div className="topbar" style={{paddingTop: 4}}>
    <div style={{display: "flex", alignItems: "center", gap: 10, minWidth: 0, flex: 1}}>
      <MnemosMark size={22}/>
      <div style={{minWidth: 0}}>
        <div style={{fontFamily: "var(--font-disp)", fontSize: 18, color: "var(--ink)", lineHeight: 1, letterSpacing: 0}}>Mnemos</div>
        <div style={{fontFamily: "var(--font-disp)", fontSize: 10, fontStyle: "italic", color: "var(--ink-3)", letterSpacing: 0.04, marginTop: 1}}>memoria principium</div>
      </div>
    </div>
    <div className="tb-actions">
      <button className="tb-btn" onClick={onSearch}><Icon name="search" size={17}/></button>
      <button className="tb-btn" onClick={onImport}><Icon name="import" size={17}/></button>
      <button className="tb-btn" onClick={onSettings}><Icon name="settings" size={17}/></button>
    </div>
  </div>
);

const TabsHead = ({ tab, setTab, placement = "top" }) => {
  const tabs = [
    { id: "practice", zh: "练习", en: "PRACTICE" },
    { id: "recall",   zh: "记忆", en: "RECALL" },
    { id: "reading",  zh: "阅读", en: "READING" },
  ];
  return (
    <div className="tabs-head" style={placement === "bottom" ? { margin: "8px 16px 0", flexShrink: 0 } : null}>
      {tabs.map(t => (
        <button key={t.id} className={"tabs-tab " + (tab === t.id ? "on" : "")} onClick={() => setTab(t.id)}>
          <span className="zh">{t.zh}</span>
          <span className="en">{t.en}</span>
        </button>
      ))}
    </div>
  );
};

// Sort header
const SortRow = ({ sort, setSort, options }) => (
  <div style={{display: "flex", gap: 6, padding: "0 16px", alignItems: "center"}}>
    <span style={{fontFamily: "var(--font-mono)", fontSize: 9, letterSpacing: 0.16, color: "var(--ink-3)", textTransform: "uppercase", marginRight: 4}}>排序</span>
    {options.map(o => (
      <button key={o.id} className={"chip " + (sort === o.id ? "on" : "")} onClick={() => setSort(o.id)}>{o.label}</button>
    ))}
  </div>
);

// ─── Home ───
const HomeScreen = ({ tab, setTab, nav, theme, onTheme, tabPlacement }) => {
  const [sort, setSort] = useState("recent");
  const [continueDismissed, setContinueDismissed] = useState({});

  const Practice = (
    <div style={{display: "flex", flexDirection: "column", gap: 14}}>
      <HeroSection tab="practice" onActivity={() => nav("activity")}/>
      {!continueDismissed.practice && <ContinueCard tab="practice" onClick={() => nav("quiz")} onDismiss={() => setContinueDismissed(s => ({...s, practice: true}))}/>}
      <SortRow sort={sort} setSort={setSort} options={[{id: "recent", label: "最近"}, {id: "name", label: "名称"}, {id: "due", label: "待做"}]}/>
      <div style={{display: "flex", flexDirection: "column", gap: 8, padding: "0 16px"}}>
        {DATA.subjects.map(s => <SubjectCard key={s.id} s={s} onClick={() => nav("setdetail", s)}/>)}
      </div>
    </div>
  );

  const Recall = (
    <div style={{display: "flex", flexDirection: "column", gap: 14}}>
      <HeroSection tab="recall" onActivity={() => nav("activity")}/>
      {!continueDismissed.recall && <ContinueCard tab="recall" onClick={() => nav("review", DATA.decks[0])} onDismiss={() => setContinueDismissed(s => ({...s, recall: true}))}/>}
      <SortRow sort={sort} setSort={setSort} options={[{id: "recent", label: "最近"}, {id: "name", label: "名称"}, {id: "due", label: "待复习"}]}/>
      <div style={{display: "flex", flexDirection: "column", gap: 8, padding: "0 16px"}}>
        {DATA.decks.map(d => <DeckCard key={d.id} d={d} onClick={() => nav("deckdetail", d)}/>)}
      </div>
    </div>
  );

  const Reading = (
    <div style={{display: "flex", flexDirection: "column", gap: 14}}>
      <HeroSection tab="reading" onActivity={() => nav("activity")}/>
      {!continueDismissed.reading && <ContinueCard tab="reading" onClick={() => nav("reader", { docId: "doc2", collectionId: "c1" })} onDismiss={() => setContinueDismissed(s => ({...s, reading: true}))}/>}
      <SortRow sort={sort} setSort={setSort} options={[{id: "recent", label: "最近"}, {id: "name", label: "名称"}, {id: "unread", label: "未读"}]}/>
      <div style={{display: "flex", flexDirection: "column", gap: 8, padding: "0 16px"}}>
        {DATA.collections.map(c => <CollectionCard key={c.id} c={c} onClick={() => nav("collectiondetail", c)}/>)}
      </div>
    </div>
  );

  const body = { practice: Practice, recall: Recall, reading: Reading }[tab];
  const bottomBar = { practice: [{ icon: "import", label: "导入题库", onClick: () => nav("import") }],
                      recall: [{ icon: "import", label: "导入卡组", onClick: () => nav("import") }, { icon: "plus", label: "新建卡组" }],
                      reading: [{ icon: "import", label: "导入文档", onClick: () => nav("import") }, { icon: "plus", label: "新建集合" }],
                    }[tab];
  return (
    <>
      <StatusBar/>
      <BrandHeader onSearch={() => nav("search")} onImport={() => nav("import")} onSettings={() => nav("settings")}/>
      {tabPlacement === "top" && <TabsHead tab={tab} setTab={setTab}/>}
      <div className="phone-screen-scroll" style={{padding: "12px 0 8px"}}>
        {body}
      </div>
      <BottomActions items={bottomBar}/>
      {tabPlacement === "bottom" && <TabsHead tab={tab} setTab={setTab} placement="bottom"/>}
    </>
  );
};

window.HeroSection = HeroSection; window.HomeScreen = HomeScreen; window.DeckCard = DeckCard;
window.SubjectCard = SubjectCard; window.CollectionCard = CollectionCard; window.BrandHeader = BrandHeader;
window.TabsHead = TabsHead; window.BottomActions = BottomActions; window.ContinueCard = ContinueCard;
