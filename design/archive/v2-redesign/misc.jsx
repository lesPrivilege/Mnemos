/* eslint-disable */
// ════════════════════════════════════════════════
// Mnemos · Activity dashboard + Import + Settings + Search + PromptGuide
// ════════════════════════════════════════════════
const { useState: useStateMS } = React;

// ─── Activity ───
const ActivityScreen = ({ onBack, layout = "rings" }) => {
  const days = DATA.activity;
  const today = days[days.length - 1];
  // level by total activity
  const lvl = (d) => {
    const t = d.recall + d.practice + d.readMin/3;
    if (t === 0) return 0;
    if (t < 8) return 1;
    if (t < 18) return 2;
    if (t < 30) return 3;
    return 4;
  };
  // last 35 days, oldest first
  const cells = days.slice(-35);
  const totals = days.reduce((a, d) => ({ recall: a.recall+d.recall, practice: a.practice+d.practice, readMin: a.readMin+d.readMin }), { recall: 0, practice: 0, readMin: 0 });

  // ring progress
  const r1 = Math.min(1, today.recall / DATA.targets.recall);
  const r2 = Math.min(1, today.practice / DATA.targets.practice);
  const r3 = Math.min(1, today.readMin / DATA.targets.readMin);
  const ring = (r, radius, color) => {
    const c = 2 * Math.PI * radius;
    return (<>
      <circle cx="100" cy="100" r={radius} fill="none" stroke="var(--bg-raised)" strokeWidth="14"/>
      <circle cx="100" cy="100" r={radius} fill="none" stroke={color} strokeWidth="14"
        strokeDasharray={`${c*r} ${c}`} strokeLinecap="round" transform="rotate(-90 100 100)"/>
    </>);
  };

  const dayLabels = ["一","二","三","四","五","六","日"];

  return (
    <>
      <StatusBar/>
      <Topbar onBack={onBack} title="活动 · ACTIVITY" right={<button className="tb-btn"><Icon name="calendar" size={17}/></button>}/>
      <div className="phone-screen-scroll" style={{padding: "8px 16px 24px", display: "flex", flexDirection: "column", gap: 18}}>

        {layout !== "heatmap" && (
          <div style={{background: "var(--bg-card)", border: "1px solid var(--border-soft)", borderRadius: 14, padding: "16px 12px"}}>
            <div style={{display: "flex", justifyContent: "space-between", alignItems: "baseline"}}>
              <div className="section-title" style={{flex: "0 0 auto", paddingRight: 12}}>今日 · TODAY</div>
            </div>
            <div className="act-rings">
              <svg className="act-ring-svg" viewBox="0 0 200 200">
                {ring(r1, 86, "var(--accent)")}
                {ring(r2, 66, "var(--teal)")}
                {ring(r3, 46, "var(--good)")}
                <text x="100" y="96" textAnchor="middle" fontFamily="var(--font-disp)" fontSize="38" fill="var(--ink)">{Math.round((r1+r2+r3)/3*100)}</text>
                <text x="100" y="116" textAnchor="middle" fontFamily="var(--font-mono)" fontSize="9" fill="var(--ink-3)" letterSpacing="2">PERCENT</text>
              </svg>
            </div>
            <div className="act-ring-stats">
              <div className="col"><span className="dot recall"/><span className="num">{today.recall}</span><span className="lab">RECALL</span><span className="zh">记忆 · {DATA.targets.recall}</span></div>
              <div className="col"><span className="dot practice"/><span className="num">{today.practice}</span><span className="lab">PRACTICE</span><span className="zh">练习 · {DATA.targets.practice}</span></div>
              <div className="col"><span className="dot read"/><span className="num">{today.readMin}<span style={{fontSize: 11, color: "var(--ink-3)", marginLeft: 2}}>m</span></span><span className="lab">READING</span><span className="zh">阅读 · {DATA.targets.readMin}</span></div>
            </div>
          </div>
        )}

        {layout !== "rings" && (
          <div style={{background: "var(--bg-card)", border: "1px solid var(--border-soft)", borderRadius: 14, padding: "16px 14px"}}>
            <div style={{display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 6}}>
              <div className="section-title" style={{flex: "0 0 auto", paddingRight: 12}}>近 5 周 · LAST 5 WEEKS</div>
              <div style={{fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--ink-3)", letterSpacing: 0.08}}>{days.filter(d => lvl(d) > 0).length} 天活跃</div>
            </div>
            <div style={{display: "flex", alignItems: "flex-start", gap: 8, padding: "8px 0"}}>
              <div style={{display: "flex", flexDirection: "column", gap: 3, marginTop: 2, flexShrink: 0}}>
                {dayLabels.map(l => <div key={l} style={{height: "calc((100% - 18px)/7)", minHeight: 14, fontFamily: "var(--font-zh)", fontSize: 9, color: "var(--ink-3)", display: "flex", alignItems: "center"}}>{l}</div>)}
              </div>
              <div className="heatmap" style={{flex: 1, gridTemplateColumns: "repeat(5, 1fr)", gap: 4}}>
                {/* render as 5 weeks of 7 days each, columns = weeks */}
                {[0,1,2,3,4,5,6].map(dow => (
                  cells.map((d, i) => i % 7 === dow ? (
                    <div key={`${dow}-${i}`} className={"heat-cell l" + lvl(d) + (d === today ? " today" : "")} style={{gridRow: dow + 1, gridColumn: Math.floor(i/7) + 1}} title={`Day ${i}`}/>
                  ) : null).filter(Boolean)
                ))}
              </div>
            </div>
            <div className="heat-legend" style={{justifyContent: "flex-end", marginTop: 8}}>
              <span>较少</span>
              <div className="lvl heat-cell"/>
              <div className="lvl heat-cell l1"/>
              <div className="lvl heat-cell l2"/>
              <div className="lvl heat-cell l3"/>
              <div className="lvl heat-cell l4"/>
              <span>较多</span>
            </div>
          </div>
        )}

        <div style={{background: "var(--bg-card)", border: "1px solid var(--border-soft)", borderRadius: 14, padding: "16px 14px"}}>
          <div className="section-title">90 天 · 90 DAYS</div>
          <div className="act-ring-stats" style={{gridTemplateColumns: "1fr 1fr 1fr", marginTop: 12}}>
            <div className="col"><span className="dot recall"/><span className="num">{totals.recall}</span><span className="lab">CARDS</span><span className="zh">复习卡片</span></div>
            <div className="col"><span className="dot practice"/><span className="num">{totals.practice}</span><span className="lab">QUESTIONS</span><span className="zh">练习题</span></div>
            <div className="col"><span className="dot read"/><span className="num">{Math.round(totals.readMin/60)}<span style={{fontSize: 11, color: "var(--ink-3)", marginLeft: 2}}>h</span></span><span className="lab">READING</span><span className="zh">阅读时长</span></div>
          </div>
        </div>

        <div style={{textAlign: "center", fontFamily: "var(--font-disp)", fontStyle: "italic", color: "var(--ink-3)", fontSize: 13, paddingTop: 6}}>
          memoria principium
        </div>
      </div>
    </>
  );
};

// ─── Import ───
const ImportScreen = ({ onBack }) => {
  const [tab, setTab] = useStateMS("quiz");
  return (
    <>
      <StatusBar/>
      <Topbar onBack={onBack} title="导入 · IMPORT"/>
      <div className="tabs-head" style={{margin: "8px 16px 0"}}>
        {[{id: "quiz", zh: "题库", en: "JSON"}, {id: "deck", zh: "卡组", en: "MARKDOWN"}, {id: "doc", zh: "文档", en: "DOC · MD"}].map(t => (
          <button key={t.id} className={"tabs-tab " + (tab === t.id ? "on" : "")} onClick={() => setTab(t.id)}>
            <span className="zh">{t.zh}</span><span className="en">{t.en}</span>
          </button>
        ))}
      </div>
      <div className="phone-screen-scroll" style={{padding: "14px 16px 16px", display: "flex", flexDirection: "column", gap: 14}}>
        <button className="dropzone">
          <div className="icon"><Icon name="import" size={18}/></div>
          <div className="label">{tab === "quiz" ? "选择题库 JSON 文件" : tab === "deck" ? "选择 Markdown 卡片文件" : "选择文档文件"}</div>
          <div className="ext">{tab === "quiz" ? ".JSON" : tab === "deck" ? ".MD" : ".DOC · .DOCX · .MD · .TXT"}</div>
        </button>
        <div style={{display: "flex", alignItems: "center", gap: 8}}>
          <div style={{flex: 1, height: 1, background: "var(--border-soft)"}}/>
          <span style={{fontFamily: "var(--font-mono)", fontSize: 9, color: "var(--ink-3)", letterSpacing: 0.16, textTransform: "uppercase"}}>或粘贴内容</span>
          <div style={{flex: 1, height: 1, background: "var(--border-soft)"}}/>
        </div>
        <textarea className="textarea" placeholder={
          tab === "quiz" ? '{\n  "name": "高等数学",\n  "questions": [...]\n}'
          : tab === "deck" ? "## 第一章\n\n### 卡片正面\n答案内容..."
          : "标题\n\n正文内容..."
        }/>
        <div style={{display: "flex", flexDirection: "column", gap: 6}}>
          <div style={{fontFamily: "var(--font-mono)", fontSize: 9, color: "var(--ink-3)", letterSpacing: 0.16, textTransform: "uppercase"}}>目标 · TARGET</div>
          <select style={{padding: "10px 12px", background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 10, fontSize: 13, color: "var(--ink)", fontFamily: "var(--font-zh)"}}>
            <option>{tab === "quiz" ? "高等数学(一)" : tab === "deck" ? "线性代数·核心定理" : "微积分·教科书"}</option>
            <option>新建...</option>
          </select>
        </div>
        {tab === "deck" && (
          <button className="btn btn-ghost btn-block" style={{justifyContent: "space-between"}}>
            <span style={{display: "flex", alignItems: "center", gap: 8}}><Icon name="info" size={13}/> 制卡提示词指南</span>
            <span>→</span>
          </button>
        )}
        <button className="btn btn-primary btn-block">导入</button>
      </div>
    </>
  );
};

// ─── Settings ───
const SettingsScreen = ({ onBack, theme, onTheme, onActivity }) => {
  return (
    <>
      <StatusBar/>
      <Topbar onBack={onBack} title="设置 · SETTINGS"/>
      <div className="phone-screen-scroll" style={{padding: "12px 16px 24px", display: "flex", flexDirection: "column", gap: 14}}>
        <div className="settings-card">
          <div className="lbl">外观 · APPEARANCE</div>
          <div className="seg">
            <button className={theme==="light"?"on":""} onClick={()=>onTheme("light")}><Icon name="sun" size={12}/> 浅色</button>
            <button className={theme==="dark"?"on":""} onClick={()=>onTheme("dark")}><Icon name="moon" size={12}/> 深色</button>
            <button onClick={()=>onTheme("system")}><Icon name="circle" size={12}/> 跟随</button>
          </div>
          <div className="kv-row"><span className="k">字体</span><span className="v">Noto Serif SC</span></div>
          <div className="kv-row"><span className="k">显示密度</span><span className="v">舒适</span></div>
        </div>

        <div className="settings-card">
          <div className="lbl">统计 · STATISTICS</div>
          <button className="btn btn-ghost btn-block" style={{justifyContent: "space-between"}} onClick={onActivity}>
            <span style={{display: "flex", alignItems: "center", gap: 8}}><Icon name="stats" size={14}/> 活动仪表板</span>
            <span>→</span>
          </button>
          <div className="kv-row"><span className="k">连续天数</span><span className="v" style={{color: "var(--accent)"}}>7 天</span></div>
          <div className="kv-row"><span className="k">总复习</span><span className="v">1,284 张</span></div>
          <div className="kv-row"><span className="k">总练习</span><span className="v">412 题</span></div>
          <div className="kv-row"><span className="k">总阅读</span><span className="v">28 小时</span></div>
        </div>

        <div className="settings-card">
          <div className="lbl">数据 · DATA</div>
          <button className="btn btn-ghost btn-block" style={{justifyContent: "space-between"}}>
            <span style={{display: "flex", alignItems: "center", gap: 8}}><Icon name="export" size={14}/> 导出全部数据</span>
            <span style={{fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--ink-3)"}}>.JSON</span>
          </button>
          <button className="btn btn-ghost btn-block" style={{justifyContent: "space-between"}}>
            <span style={{display: "flex", alignItems: "center", gap: 8}}><Icon name="import" size={14}/> 导入备份</span>
            <span>→</span>
          </button>
        </div>

        <div className="settings-card" style={{borderColor: "color-mix(in oklch, var(--danger) 18%, var(--border-soft))"}}>
          <div className="lbl" style={{color: "var(--danger)"}}>危险区 · DANGER ZONE</div>
          <button className="btn btn-block" style={{background: "var(--danger-soft)", color: "var(--danger)", border: "1px solid color-mix(in oklch, var(--danger) 22%, transparent)"}}>
            清除全部数据
          </button>
        </div>

        <div style={{textAlign: "center", padding: "12px 0 4px", display: "flex", flexDirection: "column", gap: 4, alignItems: "center"}}>
          <MnemosMark size={26}/>
          <div style={{fontFamily: "var(--font-disp)", fontSize: 14, color: "var(--ink-2)"}}>Mnemos · v2.0.0</div>
          <div style={{fontFamily: "var(--font-disp)", fontStyle: "italic", fontSize: 11, color: "var(--ink-3)"}}>memoria principium</div>
        </div>
      </div>
    </>
  );
};

// ─── Search ───
const SearchScreen = ({ onBack }) => {
  const [q, setQ] = useStateMS("矩阵");
  return (
    <>
      <StatusBar/>
      <Topbar onBack={onBack} title="" zh left={
        <div style={{flex: 1, position: "relative"}}>
          <input autoFocus value={q} onChange={(e)=>setQ(e.target.value)} placeholder="搜索题库 · 卡片 · 文档"
            style={{width: "100%", padding: "8px 12px 8px 32px", background: "var(--bg-raised)", border: "1px solid transparent", borderRadius: 10, fontSize: 13, outline: "none", fontFamily: "var(--font-zh)"}}/>
          <Icon name="search" size={14} style={{position: "absolute", left: 10, top: 9, color: "var(--ink-3)"}}/>
        </div>
      }/>
      <div className="phone-screen-scroll" style={{padding: "12px 12px 16px"}}>
        {q && (
          <>
            <div className="sr-section">
              <h4>记忆 · RECALL <span className="ct">2</span></h4>
              <div className="sr-item"><span className="sr-tag">卡片</span><div className="sr-body"><div className="sr-title">矩阵乘法的可行性条件？</div><div className="sr-snip">线性代数·核心定理 · 1.1</div></div></div>
              <div className="sr-item"><span className="sr-tag">卡片</span><div className="sr-body"><div className="sr-title"><mark>矩阵</mark>加法满足交换律吗？</div><div className="sr-snip">线性代数·核心定理 · 1.1</div></div></div>
            </div>
            <div className="sr-section">
              <h4>练习 · PRACTICE <span className="ct">3</span></h4>
              <div className="sr-item"><span className="sr-tag">题目</span><div className="sr-body"><div className="sr-title">设 <mark>矩阵</mark> A 为 3 阶方阵, det(A) = 2…</div><div className="sr-snip">线性代数 · 第二章</div></div></div>
              <div className="sr-item"><span className="sr-tag">题目</span><div className="sr-body"><div className="sr-title">求伴随<mark>矩阵</mark>的一般公式…</div><div className="sr-snip">线性代数 · 第三章</div></div></div>
            </div>
            <div className="sr-section">
              <h4>阅读 · READING <span className="ct">4</span></h4>
              <div className="sr-item"><span className="sr-tag">高亮</span><div className="sr-body"><div className="sr-title">…<mark>矩阵</mark>的初等变换不改变其秩…</div><div className="sr-snip">微积分·教科书 · 第二章 · 今天 09:11</div></div></div>
              <div className="sr-item"><span className="sr-tag">文档</span><div className="sr-body"><div className="sr-title">向量与<mark>矩阵</mark>的几何意义</div><div className="sr-snip">数学史·读本 · 6,420 字</div></div></div>
            </div>
          </>
        )}
      </div>
    </>
  );
};

// ─── PromptGuide (Markdown card generation) ───
const PromptGuideScreen = ({ onBack }) => {
  const [tab, setTab] = useStateMS("general");
  const blocks = tab === "general" ? [
    { lbl: "用途", body: "把任意学习材料（讲义 / 课文 / 笔记）转成「问 — 答」式的记忆卡片。" },
    { lbl: "提示词模板", body: "请将下列内容拆分为间隔重复用的卡片。每张卡片用 Markdown 标题表示问题，标题下的段落表示答案。要求：\n• 每张卡只覆盖一个原子知识点\n• 问题简洁、明确，避免「以下哪一项…」\n• 答案不超过两句话，含必要的公式与符号" },
    { lbl: "输出格式", body: "## 问题一\n答案一段。\n\n## 问题二\n答案一段。" },
  ] : [
    { lbl: "用途", body: "为词汇 / 术语生成结构化卡片，正面术语，背面包含释义、例句、记忆要点。" },
    { lbl: "提示词模板", body: "请将下列单词列表生成记忆卡片。每张卡正面为单词原形，背面为「释义 · 词性 · 例句」三段式：\n• 释义：精炼，避免循环定义\n• 词性：n. / v. / adj. 等英文缩写\n• 例句：原文中的实际语境" },
    { lbl: "输出格式", body: "## abrogate\n**v.** 废除（法律或正式协议）\n*The treaty was abrogated by mutual consent.*" },
  ];
  return (
    <>
      <StatusBar/>
      <Topbar onBack={onBack} title="制卡指南 · PROMPT GUIDE"/>
      <div className="tabs-head" style={{margin: "8px 16px 0"}}>
        {[{id: "general", zh: "通用知识", en: "GENERAL"}, {id: "vocab", zh: "单词制卡", en: "VOCABULARY"}].map(t => (
          <button key={t.id} className={"tabs-tab " + (tab === t.id ? "on" : "")} onClick={() => setTab(t.id)}>
            <span className="zh">{t.zh}</span><span className="en">{t.en}</span>
          </button>
        ))}
      </div>
      <div className="phone-screen-scroll" style={{padding: "14px 16px 18px", display: "flex", flexDirection: "column", gap: 10}}>
        {blocks.map((b, i) => (
          <div key={i} className="settings-card">
            <div className="lbl">{b.lbl}</div>
            <div style={{fontFamily: i === 1 || i === 2 ? "var(--font-mono)" : "var(--font-zh)", fontSize: i === 1 || i === 2 ? 11 : 13, lineHeight: 1.7, color: "var(--ink)", whiteSpace: "pre-wrap"}}>{b.body}</div>
            {i === 1 && <button className="btn btn-ghost btn-sm" style={{alignSelf: "flex-start"}}>复制提示词</button>}
          </div>
        ))}
      </div>
    </>
  );
};

window.ActivityScreen = ActivityScreen;
window.ImportScreen = ImportScreen;
window.SettingsScreen = SettingsScreen;
window.SearchScreen = SearchScreen;
window.PromptGuideScreen = PromptGuideScreen;
