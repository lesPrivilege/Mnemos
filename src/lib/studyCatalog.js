import { getDecks } from './storage'
import { loadQuestions } from '../quiz/lib/storage'
import { getSubjectDisplayName } from '../quiz/lib/subjectNames'
import { getCollections, getDocuments } from '../reading/lib/storage'
import { planKey } from './studyPlan'
export function studyCatalog() {
  return [
    ...getDecks().map(item => ({ kind: 'deck', id: item.id, title: item.name, label: '卡组', route: `/deck/${encodeURIComponent(item.id)}` })),
    ...[...new Set(loadQuestions().map(q => q.subject))].filter(Boolean).map(id => ({ kind: 'subject', id, title: getSubjectDisplayName(id), label: '题集', route: `/set/${encodeURIComponent(id)}` })),
    ...getCollections().map(item => ({ kind: 'collection', id: item.id, title: item.name, label: '合集', route: `/collection/${encodeURIComponent(item.id)}` })),
    ...getDocuments().map(item => ({ kind: 'document', id: item.id, title: item.title, label: '文档', route: `/reading/doc/${encodeURIComponent(item.id)}` })),
  ]
}
export function resolvePlanItem(item, catalog) {
  const found = !item.unresolved && catalog.find(candidate => planKey(candidate) === planKey(item))
  return found || { ...item, title: item.id, label: '资料不可用', missing: true }
}
