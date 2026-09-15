// The showroom owns this memory only. No production store or clock is imported.
export function createMemoryAdapter({ failOnce = false } = {}) {
  let sequence = 0
  let rejectNext = failOnce
  const cards = []
  return {
    save(draft) {
      if (rejectNext) {
        rejectNext = false
        throw new Error('保存失败，输入已保留。请重试。')
      }
      const card = { ...draft, id: `specimen-card-${++sequence}` }
      cards.push(card)
      return card
    },
    list: () => cards.map(card => ({ ...card })),
  }
}
