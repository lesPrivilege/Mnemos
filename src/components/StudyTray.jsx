import { useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import ContextDialog from './ContextDialog'
import { addToPlan, loadPlan, movePlanItem, planKey, removePlanItem, savePlan } from '../lib/studyPlan'
import { resolvePlanItem, studyCatalog } from '../lib/studyCatalog'

const productionService = { load: loadPlan, save: savePlan, add: addToPlan, move: movePlanItem, remove: removePlanItem }

export default function StudyTray({ service = productionService, catalogProvider = studyCatalog }) {
  const [plan, setPlan] = useState(service.load)
  const [catalog, setCatalog] = useState(catalogProvider)
  const [open, setOpen] = useState(false)
  const [selected, setSelected] = useState(new Set())
  const [filter, setFilter] = useState('')
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [dragged, setDragged] = useState(null)
  const rows = useRef(new Map())
  const navigate = useNavigate()
  const location = useLocation()
  const current = plan.items.find(item => planKey(item) === plan.cursor)
  const resolved = current && resolvePlanItem(current, catalog)
  function mutate(action, message) {
    try { const next = action(); setPlan(next); setError(''); setNotice(message); return true }
    catch (error) { setError(error.message || '本次学习保存失败。'); return false }
  }
  function moveItem(key, index) {
    if (mutate(() => service.move(plan, key, index), '顺序已保存')) rows.current.get(key)?.focus()
  }
  function openPicker() { setCatalog(catalogProvider()); setSelected(new Set()); setFilter(''); setOpen(true) }
  function continueItem(item) {
    const target = resolvePlanItem(item, catalogProvider())
    if (target.missing) { setCatalog(catalogProvider()); return }
    if (mutate(() => service.save({ ...plan, cursor: planKey(item) }), '已保存本次位置')) navigate(target.route, { state: { returnTo: `${location.pathname}${location.search}` } })
  }
  return <section className="study-tray" aria-label="本次学习">
    <div className="study-tray-heading"><h2>本次学习 <span>{plan.items.length} 项</span></h2><button className="btn btn-ghost" onClick={openPicker}>加入资料</button></div>
    {resolved && <div className="study-current"><span>当前：{resolved.title}{resolved.missing ? '（不可用）' : ''}</span><button className="btn btn-primary" disabled={resolved.missing} onClick={() => continueItem(current)}>继续</button></div>}
    {current && plan.items.findIndex(item => planKey(item) === plan.cursor) < plan.items.length - 1 && <button className="btn btn-ghost" onClick={() => { const index = plan.items.findIndex(item => planKey(item) === plan.cursor); mutate(() => service.save({ ...plan, cursor: planKey(plan.items[index + 1]) }), '已移到下一项') }}>下一项</button>}
    {plan.items.length > 0 && <details><summary>展开顺序</summary><ol>{plan.items.map((item, index) => {
      const key = planKey(item); const target = resolvePlanItem(item, catalog)
      return <li key={key} tabIndex={-1} ref={node => { if (node) rows.current.set(key, node); else rows.current.delete(key) }} onDragOver={event => event.preventDefault()} onDrop={event => { event.preventDefault(); if (dragged) moveItem(dragged, index); setDragged(null) }}>
        <div><button className="study-drag" draggable onDragStart={event => { event.dataTransfer.setData('text/plain', key); event.dataTransfer.effectAllowed = 'move'; setDragged(key) }} onDragEnd={() => setDragged(null)} aria-label={`拖动 ${target.title}`}>拖动</button><span>{target.label} · {target.title}</span>{key === plan.cursor && <span> · 当前</span>}</div>
        <div className="study-row-actions"><button disabled={index === 0} aria-label={`上移 ${target.title}`} onClick={() => moveItem(key, index - 1)}>上移</button><button disabled={index === plan.items.length - 1} aria-label={`下移 ${target.title}`} onClick={() => moveItem(key, index + 1)}>下移</button><button disabled={target.missing} onClick={() => continueItem(item)}>从此处继续</button><button aria-label={`移除 ${target.title}`} onClick={() => mutate(() => service.remove(plan, key), '已从本次学习移除')}>移除</button></div>
      </li>
    })}</ol></details>}
    {error && <p role="alert">{error}</p>}<p role="status">{notice}</p>
    <ContextDialog open={open} title="加入本次学习" onClose={() => setOpen(false)}>
      <div className="study-picker"><label>查找资料<input value={filter} onChange={e => setFilter(e.target.value)}/></label>
      <ul>{catalog.filter(item => item.title?.toLowerCase().includes(filter.toLowerCase())).map(item => <li key={planKey(item)}><label><input type="checkbox" disabled={plan.items.some(ref => planKey(ref) === planKey(item))} checked={selected.has(planKey(item))} onChange={e => setSelected(previous => { const next = new Set(previous); if (e.target.checked) next.add(planKey(item)); else next.delete(planKey(item)); return next })}/>{item.label} · {item.title}{plan.items.some(ref => planKey(ref) === planKey(item)) ? '（已加入）' : ''}</label></li>)}</ul>
      {error && <p role="alert">{error}</p>}
      <button className="btn btn-primary" disabled={!selected.size} onClick={() => { if (mutate(() => service.add(plan, catalog.filter(item => selected.has(planKey(item)))), '已加入本次学习')) setOpen(false) }}>加入 {selected.size} 项</button></div>
    </ContextDialog>
  </section>
}
