/**
 * Markdown parser — rules mirror formatSpec.js PROMPT_TEMPLATE
 */
import { localToday } from './dateUtils'

export function parseMdToCards(mdContent, deckName) {
  const lines = mdContent.split('\n')
  const cards = []

  let extractedDeckName = null
  for (const line of lines) {
    const h1 = matchHeading(line)
    if (h1?.level === 1 && h1.text) { extractedDeckName = h1.text; break }
  }

  let currentH2 = ''
  let currentH3 = ''
  let currentItem = ''
  let currentBody = ''

  function makeCard(front, back = '', chapter = currentH2 || deckName, section = currentH3) {
    return {
      id: crypto.randomUUID(),
      deckId: '',
      front: front.trim(),
      back: back.trim(),
      type: 'recall',
      chapter: chapter || deckName,
      section,
      easiness: 2.5,
      interval: 0,
      repetitions: 0,
      dueDate: localToday(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }
  }

  function flush() {
    if (currentItem.trim()) {
      cards.push(makeCard(currentItem, currentBody))
    }
    currentItem = ''
    currentBody = ''
  }

  for (const line of lines) {
    const heading = matchHeading(line)
    const bulletMatch = line.match(/^(?:[-*+•]\s*|\d+[.)]\s+)(.+)/)
    const isIndented = /^[ \t]/.test(line) && line.trim().length > 0
    const isEmpty = line.trim() === ''

    if (heading?.level === 1) {
      continue
    }

    if (heading?.level === 2) {
      flush()
      currentH2 = heading.text
      currentH3 = ''
      continue
    }

    if (heading?.level === 3) {
      flush()
      currentH3 = heading.text
      continue
    }

    if (bulletMatch && !isIndented) {
      flush()
      currentItem = bulletMatch[1].trim()
      continue
    }

    if (isIndented) {
      if (currentItem) {
        currentBody += (currentBody ? '\n' : '') + line.trim()
      }
      continue
    }

    if (isEmpty) {
      continue
    }

    // Plain text line after a bullet — treat as body continuation
    if (currentItem) {
      currentBody += (currentBody ? '\n' : '') + line.trim()
    }
  }

  flush()
  if (cards.length > 0) return { cards, deckName: extractedDeckName }

  return parseLooseText(lines, deckName, extractedDeckName)
}

function matchHeading(line) {
  const match = line.match(/^(#{1,3})\s*(.+)$/)
  if (!match) return null
  return {
    level: match[1].length,
    text: match[2].trim(),
  }
}

function createLooseCard(front, back, chapter, section, deckName) {
  return {
    id: crypto.randomUUID(),
    deckId: '',
    front: front.trim(),
    back: back.trim(),
    type: 'recall',
    chapter: chapter || deckName,
    section,
    easiness: 2.5,
    interval: 0,
    repetitions: 0,
    dueDate: localToday(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }
}

function cleanPromptPrefix(text) {
  return text.replace(/^(?:Q|A|问|答|问题|答案|正面|背面)\s*[:：]\s*/i, '').trim()
}

function parseInlinePair(line) {
  const match = line.match(/^(.{1,80}?)[：:]\s*(.+)$/)
  if (!match) return null
  if (/^(?:Q|A|问|答|问题|答案|正面|背面)$/i.test(match[1].trim())) return null
  return {
    front: match[1].trim(),
    back: match[2].trim(),
  }
}

function parseLooseText(lines, deckName, extractedDeckName) {
  const cards = []
  let currentH2 = ''
  let currentH3 = ''
  let block = []

  function flushBlock() {
    const content = block.map(line => line.trim()).filter(Boolean)
    block = []
    if (content.length === 0) return

    if (content.length > 2 && content.length % 2 === 0 && content.every(line => line.length <= 120)) {
      for (let i = 0; i < content.length; i += 2) {
        cards.push(createLooseCard(
          cleanPromptPrefix(content[i]),
          cleanPromptPrefix(content[i + 1]),
          currentH2,
          currentH3,
          deckName
        ))
      }
      return
    }

    if (content.length > 1) {
      cards.push(createLooseCard(
        cleanPromptPrefix(content[0]),
        content.slice(1).map(cleanPromptPrefix).join('\n'),
        currentH2,
        currentH3,
        deckName
      ))
      return
    }

    const inlinePair = parseInlinePair(content[0])
    if (inlinePair) {
      cards.push(createLooseCard(inlinePair.front, inlinePair.back, currentH2, currentH3, deckName))
    } else {
      block = content
    }
  }

  function flushSingleLinePairs() {
    const content = block.map(line => line.trim()).filter(Boolean)
    block = []
    for (let i = 0; i < content.length; i += 2) {
      const front = cleanPromptPrefix(content[i])
      const back = cleanPromptPrefix(content[i + 1] || '')
      if (front) cards.push(createLooseCard(front, back, currentH2, currentH3, deckName))
    }
  }

  for (const line of lines) {
    const heading = matchHeading(line)
    const isEmpty = line.trim() === ''

    if (heading?.level === 1) {
      continue
    }

    if (heading?.level === 2) {
      flushBlock()
      flushSingleLinePairs()
      currentH2 = heading.text
      currentH3 = ''
      continue
    }

    if (heading?.level === 3) {
      flushBlock()
      flushSingleLinePairs()
      currentH3 = heading.text
      continue
    }

    if (isEmpty) {
      flushBlock()
      continue
    }

    const trimmed = line.trim()
    const inlinePair = parseInlinePair(trimmed)
    if (inlinePair) {
      flushBlock()
      cards.push(createLooseCard(inlinePair.front, inlinePair.back, currentH2, currentH3, deckName))
      continue
    }

    block.push(trimmed)
  }

  flushBlock()
  flushSingleLinePairs()
  return { cards, deckName: extractedDeckName }
}
