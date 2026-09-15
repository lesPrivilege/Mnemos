import { useEffect, useRef, useState } from 'react'
import { HighlightsPanel, TocPanel } from '../reading/components/ReaderPanels'
import { renderDoc, extractToc } from '../reading/lib/renderDoc'
import CardDraftEditor from '../components/CardDraftEditor'
import SourceLens from '../components/SourceLens'
import { fingerprintText, captureTextSelection } from '../reading/lib/sourceAnchor'
import { createMemoryAdapter } from './adapter'
import reading from './fixtures/reading.md?raw'

const states = [['ready', '阅读正文'], ['empty', '空资料'], ['long', '长标题'], ['repeat', '重复摘句'], ['formula', '公式'], ['plain', '无笔记摘录'], ['noted', '已有笔记'], ['failed', '保存失败'], ['missing', '来源失效']]
const quote = '记住结论并不等于能够解释结论。'
const title = '线性变换与面积'
const fixtureDecks = [{ id: 'fixture-linear', name: '线性代数' }, { id: 'fixture-reading', name: '阅读摘录' }]
const loadFixtureDocument = async () => ({ title, content: reading.replace(/^# .*\n/, ''), format: 'md' })
const missingFixtureDocument = async () => null
const date = '2026-09-16T03:00:00+08:00'

export default function Showroom() {
  const [scenario, setScenario] = useState('ready')
  const [version, setVersion] = useState(0)
  const [theme, setTheme] = useState('light')
  const [reduced, setReduced] = useState(false)
  const [layout, setLayout] = useState('parallel')
  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark')
    return () => document.documentElement.classList.remove('dark')
  }, [theme])
  return <div className="showroom" data-reduced={reduced}>
    <header className="showroom-header"><div><p>Mnemos · UX / Motion 样板间</p><h1>从原文长出一张卡片</h1><p>合成材料 · 仅在内存中操作，刷新即清除</p></div>
      <div className="showroom-controls">
        <label>场景<select value={scenario} onChange={e => setScenario(e.target.value)}>{states.map(([id, label]) => <option key={id} value={id}>{label}</option>)}</select></label>
        <label>外观<select value={theme} onChange={e => setTheme(e.target.value)}><option value="light">浅色</option><option value="dark">深色</option></select></label>
        <label>布局<select value={layout} onChange={e => setLayout(e.target.value)}><option value="parallel">原文与摘录并置</option><option value="single">单栏局部面</option></select></label>
        <label className="showroom-check"><input type="checkbox" checked={reduced} onChange={e => setReduced(e.target.checked)}/>减弱动态</label>
        <button onClick={() => setVersion(v => v + 1)}>重置场景</button>
      </div>
    </header>
    <ReadingScene key={`${scenario}-${version}`} scenario={scenario} layout={layout}/>
    <footer className="showroom-footer">MX-02 · {typeof __MNEMOS_BUILD__ === 'undefined' ? '测试' : `${__MNEMOS_BUILD__.version} / ${__MNEMOS_BUILD__.commit}`} · 原创 fixture / 2026-09-16 · 共享编辑与来源组件 · 样板数据不写入用户库</footer>
  </div>
}

function ReadingScene({ scenario, layout }) {
  const [html, setHtml] = useState('')
  const [renderError, setRenderError] = useState(false)
  const [selection, setSelection] = useState(null)
  const [highlights, setHighlights] = useState(() => ['plain', 'noted', 'repeat', 'failed', 'missing'].includes(scenario) ? [{ id: 'excerpt-seed', selectedText: quote, note: scenario === 'plain' ? '' : '为什么知道结论还不足以解释它？', createdAt: date, paragraph: 5 }] : [])
  const [draft, setDraft] = useState(null)
  const [sourceOpen, setSourceOpen] = useState(false)
  const [saved, setSaved] = useState(null)
  const [notice, setNotice] = useState('')
  const article = useRef(null)
  const returnTarget = useRef(null)
  const adapter = useRef(null)
  if (!adapter.current) adapter.current = createMemoryAdapter({ failOnce: scenario === 'failed' })
  useEffect(() => {
    let active = true
    renderDoc(reading.replace(/^# .*\n/, '')).then(value => { if (active) setHtml(value) }).catch(() => { if (active) setRenderError(true) })
    return () => { active = false }
  }, [])
  useEffect(() => {
    if (scenario !== 'formula' || !html) return
    const heading = article.current?.querySelector('#一次拉伸')
    if (heading) { heading.tabIndex = -1; heading.focus(); heading.scrollIntoView({ block: 'start' }) }
  }, [html, scenario])
  function selectText() {
    const captured = captureTextSelection(article.current)
    if (!captured) return
    const range = window.getSelection().getRangeAt(0)
    const paragraphs = [...article.current.querySelectorAll('p')]
    setSelection({ ...captured, paragraph: paragraphs.findIndex(p => p.contains(range.startContainer)) })
  }
  function excerpt(value) {
    const item = { ...value, id: `excerpt-${highlights.length}-${Date.now()}`, createdAt: date, note: '' }
    setHighlights(list => [...list, item]); setSelection(null); setNotice('摘录已保存到本场景。')
  }
  async function edit(item, event) {
    returnTarget.current = event.currentTarget
    const paragraph = article.current?.querySelectorAll('p')[item.paragraph]
    let offset = item.textOffset
    const text = article.current?.textContent || ''
    if (offset == null && paragraph) {
      const range = document.createRange(); range.selectNodeContents(article.current); range.setEnd(paragraph, 0)
      offset = range.toString().length
    }
    const source = { version: 1, kind: 'document', id: 'fixture-doc', quote: item.selectedText,
      textOffset: offset ?? 0, length: item.selectedText.length, contentFingerprint: await fingerprintText(text) }
    setSaved(null); setDraft({ id: crypto.randomUUID(), front: item.note || '', back: item.selectedText,
      source, deckId: 'fixture-linear', deckName: '线性代数' })
  }
  function close() { setDraft(null); returnTarget.current?.focus() }
  function savedCard(card) { setSaved(card); setDraft(null); setNotice('卡片已保存到本场景。'); returnTarget.current?.focus() }
  if (scenario === 'empty') return <main className="showroom-empty"><h2>还没有阅读材料</h2><p>选择“阅读正文”场景，体验摘录与制卡。</p></main>
  return <main className={`showroom-scene ${layout}`}>
    <section className="showroom-reading" aria-label="原文">
      <div className="showroom-document"><span>阅读材料</span><h2>{scenario === 'long' ? `${title}：从两个独立方向的伸缩理解行列式、面积变化与退化情形的一份长标题阅读材料` : title}</h2></div>
      {scenario !== 'missing' && <details><summary>目录</summary><TocPanel toc={extractToc(html)} onJump={id => { const node = document.getElementById(id); if (node) { node.tabIndex = -1; node.focus(); node.scrollIntoView() } }}/></details>}
      {scenario === 'missing' ? <p>这份材料已不可用。已保存的摘句仍可编辑和制卡。</p> : renderError ? <p role="alert">正文载入失败，请重置场景。</p> : !html ? <p role="status">正在排版正文…</p> : <article ref={article} className="md-content showroom-article" onMouseUp={selectText} onTouchEnd={selectText} onKeyUp={selectText} dangerouslySetInnerHTML={{ __html: html }}/>}
      {selection && <div className="showroom-selection" role="region" aria-label="选区操作"><p>{selection.selectedText}</p><button onClick={() => excerpt(selection)}>保存选中摘录</button><button onClick={() => setSelection(null)}>取消选择</button></div>}
      {scenario !== 'missing' && <details className="showroom-paragraphs"><summary>按段落摘录（键盘与触屏替代）</summary>{html && [...new DOMParser().parseFromString(html, 'text/html').querySelectorAll('p')].map((p, index) => <button key={index} onClick={() => excerpt({ selectedText: p.textContent, paragraph: index })}>{p.textContent}</button>)}</details>}
    </section>
    <aside className="showroom-excerpts" aria-label="摘录与卡片">
      <HighlightsPanel highlights={highlights} onDelete={id => { setHighlights(items => items.filter(item => item.id !== id)); setNotice('摘录已移除。') }}/>
      {highlights.map((item, index) => <button className="showroom-create" key={item.id} onClick={event => edit(item, event)}>将摘录 {index + 1} 制成卡片</button>)}
      {draft && <section className="showroom-editor"><h2>卡片草稿</h2><CardDraftEditor key={draft.id} initialDraft={draft} decks={fixtureDecks} onSave={value => adapter.current.save(value)} onSaved={savedCard} onCancel={close}/></section>}
      {saved && <section className="showroom-saved" aria-label="已保存卡片"><h2>{saved.front}</h2><p>{saved.back}</p><p>卡组：{fixtureDecks.find(deck => deck.id === saved.deckId)?.name || saved.deckName}</p><button onClick={() => setSourceOpen(true)}>查看原文</button></section>}
      <SourceLens source={saved?.source} open={sourceOpen} onClose={() => setSourceOpen(false)} loadDocument={scenario === 'missing' ? missingFixtureDocument : loadFixtureDocument}/>
      <p className="showroom-notice" role="status">{notice}</p>
    </aside>
  </main>
}
