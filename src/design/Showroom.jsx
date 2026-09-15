import { useEffect, useRef, useState } from 'react'
import { HighlightsPanel, TocPanel } from '../reading/components/ReaderPanels'
import { renderDoc, extractToc } from '../reading/lib/renderDoc'
import { createMemoryAdapter } from './adapter'
import reading from './fixtures/reading.md?raw'

const states = [['ready', '阅读正文'], ['empty', '空资料'], ['long', '长标题'], ['repeat', '重复摘句'], ['formula', '公式'], ['plain', '无笔记摘录'], ['noted', '已有笔记'], ['failed', '保存失败'], ['missing', '来源失效']]
const quote = '记住结论并不等于能够解释结论。'
const title = '线性变换与面积'
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
    <footer className="showroom-footer">MX-01 · {typeof __MNEMOS_BUILD__ === 'undefined' ? '测试' : `${__MNEMOS_BUILD__.version} / ${__MNEMOS_BUILD__.commit}`} · 原创 fixture / 2026-09-16 · 产品持久来源关联待 MX-02</footer>
  </div>
}

function ReadingScene({ scenario, layout }) {
  const [html, setHtml] = useState('')
  const [renderError, setRenderError] = useState(false)
  const [selection, setSelection] = useState(null)
  const [highlights, setHighlights] = useState(() => ['plain', 'noted', 'repeat', 'failed', 'missing'].includes(scenario) ? [{ id: 'excerpt-seed', selectedText: quote, note: scenario === 'plain' ? '' : '为什么知道结论还不足以解释它？', createdAt: date, paragraph: 5 }] : [])
  const [draft, setDraft] = useState(null)
  const [error, setError] = useState('')
  const [saved, setSaved] = useState(null)
  const [notice, setNotice] = useState('')
  const article = useRef(null)
  const editor = useRef(null)
  const returnTarget = useRef(null)
  const savedLock = useRef(false)
  const adapter = useRef(null)
  if (!adapter.current) adapter.current = createMemoryAdapter({ failOnce: scenario === 'failed' })
  useEffect(() => {
    let active = true
    renderDoc(reading.replace(/^# .*\n/, '')).then(value => { if (active) setHtml(value) }).catch(() => { if (active) setRenderError(true) })
    return () => { active = false }
  }, [])
  useEffect(() => { if (draft) editor.current?.focus() }, [draft?.id])
  useEffect(() => {
    if (scenario !== 'formula' || !html) return
    const heading = article.current?.querySelector('#一次拉伸')
    if (heading) { heading.tabIndex = -1; heading.focus(); heading.scrollIntoView({ block: 'start' }) }
  }, [html, scenario])
  function selectText() {
    const selected = window.getSelection()
    if (!selected?.rangeCount || selected.isCollapsed) return
    const range = selected.getRangeAt(0)
    if (!article.current?.contains(range.commonAncestorContainer)) return
    const paragraphs = [...article.current.querySelectorAll('p')]
    const paragraph = paragraphs.findIndex(p => p.contains(range.startContainer))
    setSelection({ selectedText: selected.toString(), paragraph })
  }
  function excerpt(value) {
    const item = { ...value, id: `excerpt-${highlights.length}-${Date.now()}`, createdAt: date, note: '' }
    setHighlights(list => [...list, item]); setSelection(null); setNotice('摘录已保存到本场景。')
  }
  function edit(item, event) {
    returnTarget.current = event.currentTarget
    savedLock.current = false
    setSaved(null); setError(''); setDraft({ id: item.id, front: item.note || '', back: item.selectedText, paragraph: item.paragraph, deck: '线性代数' })
  }
  function close() { setDraft(null); setError(''); returnTarget.current?.focus() }
  function save(event) {
    event.preventDefault()
    if (savedLock.current) return
    try {
      const card = adapter.current.save(draft)
      savedLock.current = true; setSaved(card); setDraft(null); setError(''); setNotice('卡片已保存到本场景。'); returnTarget.current?.focus()
    } catch (failure) { setError(failure.message) }
  }
  function source() {
    if (scenario === 'missing') { setNotice('原文已不可用，摘句仍保留在卡片中。'); return }
    const target = article.current?.querySelectorAll('p')[saved.paragraph]
    if (!target) { setNotice('此摘句没有可用段落定位。'); return }
    target.tabIndex = -1; target.focus(); target.scrollIntoView({ block: 'center' }); setNotice('已返回摘句所在段落。')
  }
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
      {draft && <form className="showroom-editor" onSubmit={save} onKeyDown={event => { if (event.key === 'Escape') close() }} aria-label="卡片草稿">
        <h2>卡片草稿</h2><label>问题<textarea ref={editor} required value={draft.front} onChange={e => setDraft({ ...draft, front: e.target.value })}/></label>
        <label>答案<textarea required value={draft.back} onChange={e => setDraft({ ...draft, back: e.target.value })}/></label>
        <label>卡组<select value={draft.deck} onChange={e => setDraft({ ...draft, deck: e.target.value })}><option>线性代数</option><option>阅读摘录</option></select></label>
        {error && <p role="alert">{error}</p>}<div className="showroom-actions"><button type="submit" className="primary">{error ? '重试保存' : '保存卡片'}</button><button type="button" onClick={close}>取消</button></div>
      </form>}
      {saved && <section className="showroom-saved" aria-label="已保存卡片"><h2>{saved.front}</h2><p>{saved.back}</p><p>卡组：{saved.deck}</p><button onClick={source}>查看原文</button></section>}
      <p className="showroom-notice" role="status">{notice}</p>
    </aside>
  </main>
}
