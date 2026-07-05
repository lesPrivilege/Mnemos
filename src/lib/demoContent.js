import { localToday } from './dateUtils'
import { loadData, saveData } from './storage'
import { loadQuestions, saveQuestions } from '../quiz/lib/storage'
import { addCollection, addDocument, getCollections, getDocuments } from '../reading/lib/storage'

const NOW = '2026-07-05T00:00:00.000Z'
const DEMO_DECK_ID = 'demo-phase-b-memory'
const DEMO_READING_COLLECTION = '示例内容包'

const demoDeck = {
  id: DEMO_DECK_ID,
  name: '示例 · 学习方法',
  pinned: false,
  createdAt: NOW,
}

const demoCards = [
  {
    id: 'demo-card-active-recall',
    deckId: DEMO_DECK_ID,
    front: '什么是主动回忆？',
    back: '在看到答案前，先尝试从记忆中取回信息。它比重复阅读更能暴露薄弱点，也更容易形成可迁移的掌握。',
    type: 'recall',
    chapter: '记忆策略',
    section: '主动回忆',
  },
  {
    id: 'demo-card-spaced-review',
    deckId: DEMO_DECK_ID,
    front: '间隔复习为什么有效？',
    back: '遗忘开始后再取回，会给大脑一个更强的保存信号。复习间隔应随着掌握度逐步拉长。',
    type: 'recall',
    chapter: '记忆策略',
    section: '间隔复习',
  },
  {
    id: 'demo-card-good-prompt',
    deckId: DEMO_DECK_ID,
    front: '一张好卡片通常具备哪两个特征？',
    back: '问题足够具体，答案足够短。卡片应测试一个判断点，而不是要求背下一整段材料。',
    type: 'recall',
    chapter: '制卡原则',
    section: '最小信息',
  },
]

const demoQuestions = [
  {
    id: 'demo-q-choice-retrieval',
    type: 'choice',
    subject: 'learning-methods',
    chapter: '第1章 记忆策略',
    section: '主动回忆',
    question: '下面哪一种做法最符合主动回忆？',
    options: [
      'A. 反复重读划线句',
      'B. 合上材料后写出要点',
      'C. 只整理漂亮笔记',
      'D. 播放讲解视频作为背景音',
    ],
    answer: 'B',
    explanation: '主动回忆的关键是先取回，再校对。合上材料写要点能直接检验记忆是否可用。',
  },
  {
    id: 'demo-q-choice-cards',
    type: 'choice',
    subject: 'learning-methods',
    chapter: '第2章 制卡原则',
    section: '最小信息',
    question: '为什么闪卡更适合承载单一判断点？',
    options: [
      'A. 单点更容易评分和复习',
      'B. 单点一定比长答案更有趣',
      'C. 单点可以避免所有遗忘',
      'D. 单点不需要上下文',
    ],
    answer: 'A',
    explanation: '单一判断点能让“记住/困难/重来”的评分更稳定，也更容易定位薄弱处。',
  },
  {
    id: 'demo-q-review-transfer',
    type: 'review',
    subject: 'learning-methods',
    chapter: '第3章 迁移',
    section: '应用',
    question: '把一段教材转成闪卡前，先问哪三个问题？',
    answer: '这段材料要求我区分什么？哪些概念容易混淆？未来遇到题目时，我需要取回哪一句最短答案？',
    explanation: '先找到判断点，再写卡片。这样卡片服务于应用，而不是复刻原文。',
  },
]

const demoReadingTitle = '示例 · 如何把材料变成练习'
const demoReadingContent = `# 如何把材料变成练习

学习材料本身不是复习系统。一本书、一份讲义或一段聊天记录，只有被拆成可判断、可取回、可复盘的小单元后，才会进入长期记忆。

## 第一步：找判断点

读完一小节后，先不要急着摘抄。问自己：这里最容易被误解的区别是什么？如果明天需要解释给别人听，我必须取回哪一句话？

## 第二步：写成短问题

好问题通常很窄。它不要求你背下一整段，而是要求你完成一个动作：定义、比较、排序、判断原因，或给出一个例子。

## 第三步：让练习反过来修正文档

如果你连续答错同一类问题，说明原来的笔记还不够清楚。把错因写回材料，再生成下一轮卡片。这样阅读、练习和记忆会形成闭环。`

function makeCard(card) {
  return {
    ...card,
    easiness: 2.5,
    interval: 0,
    repetitions: 0,
    starred: false,
    lapses: 0,
    suspended: false,
    leech: false,
    dueDate: localToday(),
    createdAt: NOW,
    updatedAt: NOW,
  }
}

function seedFlashcards() {
  const data = loadData()
  let decks = 0
  let cards = 0

  if (!data.decks.some((deck) => deck.id === DEMO_DECK_ID)) {
    data.decks.push(demoDeck)
    decks = 1
  }

  const existingCardIds = new Set(data.cards.map((card) => card.id))
  for (const card of demoCards) {
    if (!existingCardIds.has(card.id)) {
      data.cards.push(makeCard(card))
      cards++
    }
  }

  if (decks || cards) saveData(data)
  return { decks, cards }
}

function seedQuestions() {
  const questions = loadQuestions()
  const existingIds = new Set(questions.map((question) => question.id))
  const additions = demoQuestions.filter((question) => !existingIds.has(question.id))
  if (additions.length) saveQuestions([...questions, ...additions])
  return { questions: additions.length }
}

function seedReading() {
  let collections = 0
  let documents = 0
  const existingCollections = getCollections()
  let collection = existingCollections.find((item) => item.name === DEMO_READING_COLLECTION)

  if (!collection) {
    collection = addCollection(DEMO_READING_COLLECTION, '书')
    collections = 1
  }

  const exists = getDocuments().some((doc) => (
    doc.collectionId === collection.id && doc.title === demoReadingTitle
  ))
  if (!exists) {
    addDocument(collection.id, demoReadingTitle, demoReadingContent, 'md')
    documents = 1
  }

  return { collections, documents }
}

export function seedDemoContent() {
  const flashcard = seedFlashcards()
  const quiz = seedQuestions()
  const reading = seedReading()
  return {
    ...flashcard,
    ...quiz,
    ...reading,
    total: flashcard.decks + flashcard.cards + quiz.questions + reading.collections + reading.documents,
  }
}
