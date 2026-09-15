import { loadJson, saveJson } from './store'
const KEY = 'mnemos-study-plan'
const KINDS = ['deck', 'subject', 'collection', 'document']
export const planKey = item => JSON.stringify([item.kind, item.id, ...(item.unresolved ? ['unresolved'] : [])])
export function normalizePlan(value) {
  const seen = new Set()
  const items = (Array.isArray(value?.items) ? value.items : []).filter(item => {
    if (!KINDS.includes(item?.kind) || typeof item.id !== 'string' || !item.id) return false
    const key = planKey(item)
    if (seen.has(key)) return false
    seen.add(key); return true
  }).map(({ kind, id, unresolved }) => ({ kind, id, ...(unresolved ? { unresolved: true } : {}) }))
  return { version: 1, planId: value?.planId || crypto.randomUUID(), items, cursor: items.some(item => planKey(item) === value?.cursor) ? value.cursor : items[0] ? planKey(items[0]) : null, updatedAt: value?.updatedAt || null }
}
export function loadPlan() { return normalizePlan(loadJson(KEY, null)) }
export function savePlan(value) {
  const next = { ...normalizePlan(value), updatedAt: new Date().toISOString() }
  const result = saveJson(KEY, next, { label: '本次学习未保存' })
  if (!result.ok) throw new Error(result.error || '本次学习保存失败。')
  return next
}
export function addToPlan(plan, refs) { return savePlan({ ...plan, items: [...plan.items, ...refs] }) }
export function movePlanItem(plan, key, target) {
  const items = [...plan.items]
  const index = items.findIndex(item => planKey(item) === key)
  if (index < 0 || target < 0 || target >= items.length) return plan
  const [item] = items.splice(index, 1); items.splice(target, 0, item)
  return savePlan({ ...plan, items })
}
export function removePlanItem(plan, key) { return savePlan({ ...plan, items: plan.items.filter(item => planKey(item) !== key) }) }
export function restorePlan(value, { merge = false, maps = {} } = {}) {
  const incoming = normalizePlan(value)
  if (!merge) return savePlan(incoming)
  const translated = incoming.items.map(item => {
    if (item.kind === 'subject') return item
    const mapping = maps[{ deck: 'deckIds', collection: 'collectionIds', document: 'documentIds' }[item.kind]]
    return mapping?.[item.id] ? { ...item, id: mapping[item.id] } : { ...item, unresolved: true }
  })
  const current = loadPlan()
  let cursor = current.cursor
  const items = current.items.map(item => {
    if (!item.unresolved) return item
    const index = incoming.items.findIndex(ref => ref.kind === item.kind && ref.id === item.id)
    const replacement = index >= 0 ? translated[index] : null
    if (!replacement || replacement.unresolved) return item
    if (cursor === planKey(item)) cursor = planKey(replacement)
    return replacement
  })
  return savePlan({ ...current, cursor, items: [...items, ...translated] })
}
