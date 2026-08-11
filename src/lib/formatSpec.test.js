// 契约门：prompt 模板 ↔ 解析器互证
// PROMPT_TEMPLATE / VOCAB_PROMPT_TEMPLATE 的「## 示例」段必须能被 mdParser 正常解析成卡片；
// QUIZ_PROMPT_TEMPLATE 的 JSON 示例必须能被 questionParser 正常解析成题目；
// READING_PROMPT_TEMPLATE 必须覆盖阅读渲染依赖的标题层级与公式记号。
// 任一模板改动导致解析失败，此文件应先于人工核对报错。
import { describe, expect, it } from 'vitest'
import { PROMPT_TEMPLATE, VOCAB_PROMPT_TEMPLATE, QUIZ_PROMPT_TEMPLATE, READING_PROMPT_TEMPLATE } from './formatSpec'
import { parseMdToCards } from './mdParser'
import { parseQuestionsJson } from '../quiz/lib/questionParser'

const EXAMPLE_MARKER = '## 示例\n\n'

function extractExampleSection(template) {
  const idx = template.indexOf(EXAMPLE_MARKER)
  if (idx === -1) throw new Error('模板缺少 "## 示例" 段')
  return template.slice(idx + EXAMPLE_MARKER.length)
}

function extractJsonArray(template) {
  const start = template.indexOf('[')
  if (start === -1) throw new Error('模板缺少 JSON 数组')
  let depth = 0
  for (let i = start; i < template.length; i++) {
    if (template[i] === '[') depth++
    else if (template[i] === ']') {
      depth--
      if (depth === 0) return template.slice(start, i + 1)
    }
  }
  throw new Error('JSON 数组未闭合')
}

describe('PROMPT_TEMPLATE 示例 ↔ mdParser', () => {
  it('解析出正确张数的卡片，front/back 均非空', () => {
    const { cards } = parseMdToCards(extractExampleSection(PROMPT_TEMPLATE), 'fallback')
    expect(cards).toHaveLength(2)
    for (const card of cards) {
      expect(card.front.trim()).not.toBe('')
      expect(card.back.trim()).not.toBe('')
    }
  })
})

describe('VOCAB_PROMPT_TEMPLATE 示例 ↔ mdParser', () => {
  it('解析出卡片，背面保留搭配与派生内容（未被引用块吞并）', () => {
    const { cards } = parseMdToCards(extractExampleSection(VOCAB_PROMPT_TEMPLATE), 'fallback')
    expect(cards).toHaveLength(1)
    const [card] = cards
    expect(card.front.trim()).not.toBe('')
    expect(card.back.trim()).not.toBe('')
    expect(card.back).toContain('搭配')
    expect(card.back).toContain('派生')
  })
})

describe('QUIZ_PROMPT_TEMPLATE JSON 示例 ↔ questionParser', () => {
  it('解析出无错误、subject 非 unknown、choice 题 options 以字母前缀开头', () => {
    const jsonText = extractJsonArray(QUIZ_PROMPT_TEMPLATE)
    const parsed = JSON.parse(jsonText) // 先验证示例本身就是合法 JSON
    const { questions, errors } = parseQuestionsJson(JSON.stringify(parsed))

    expect(errors).toEqual([])
    expect(questions).toHaveLength(2)
    for (const q of questions) {
      expect(q.subject).not.toBe('unknown')
    }
    const choiceQuestion = questions.find(q => q.type === 'choice')
    expect(choiceQuestion).toBeDefined()
    for (const opt of choiceQuestion.options) {
      expect(opt).toMatch(/^[A-Z]\.\s/)
    }
  })
})

describe('READING_PROMPT_TEMPLATE', () => {
  it('包含标题层级与 LaTeX 公式记号', () => {
    expect(READING_PROMPT_TEMPLATE).toContain('# ')
    expect(READING_PROMPT_TEMPLATE).toContain('## ')
    expect(READING_PROMPT_TEMPLATE).toContain('### ')
    expect(READING_PROMPT_TEMPLATE).toContain('$$')
  })
})
