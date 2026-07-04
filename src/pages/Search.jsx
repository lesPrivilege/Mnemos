import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useBackButton } from '../lib/useBackButton'
import { loadQuestions } from '../quiz/lib/storage'
import { getSubjectDisplayName } from '../quiz/lib/subjectNames'
import { getCards, getDecks } from '../lib/storage'
import RenderMarkdown from '../quiz/components/RenderMarkdown'
import { BackIcon, SearchIcon } from '../components/Icons'
import { S } from '../lib/strings'
import '../styles/markdown.css'

export default function Search() {
  const navigate = useNavigate()
  const { goBack } = useBackButton()
  const [query, setQuery] = useState('')
  const [quizResults, setQuizResults] = useState([])
  const [flashcardResults, setFlashcardResults] = useState([])
  const [allQuestions, setAllQuestions] = useState([])
  const [allCards, setAllCards] = useState([])
  const debounceRef = useRef(null)

  useEffect(() => {
    const questions = loadQuestions()
    setAllQuestions(questions)
    const decks = getDecks()
    const cards = []
    for (const d of decks) {
      for (const c of getCards(d.id)) {
        cards.push({ ...c, deckName: d.name })
      }
    }
    setAllCards(cards)
  }, [])

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      if (!query.trim()) { setQuizResults([]); setFlashcardResults([]); return }
      const q = query.trim().toLowerCase()
      setQuizResults(allQuestions.filter(item =>
        (item.question || '').toLowerCase().includes(q) ||
        (item.id || '').toLowerCase().includes(q)
      ).slice(0, 30))
      setFlashcardResults(allCards.filter(card =>
        (card.front || '').toLowerCase().includes(q) ||
        (card.back || '').toLowerCase().includes(q)
      ).slice(0, 30))
    }, 300)
    return () => clearTimeout(debounceRef.current)
  }, [query, allQuestions, allCards])

  const quizGrouped = {}
  for (const q of quizResults) {
    const key = `${q.subject}|||${q.chapter || S.search.uncategorized}`
    if (!quizGrouped[key]) quizGrouped[key] = { subject: q.subject, chapter: q.chapter || S.search.uncategorized, items: [] }
    quizGrouped[key].items.push(q)
  }

  const hasResults = quizResults.length > 0 || flashcardResults.length > 0

  return (
    <div className="page-fill">
      <div className="topbar">
        <button className="tb-btn" onClick={() => goBack()} aria-label="Back"><BackIcon /></button>
        <div className="search" style={{ margin: 0, flex: 1 }}>
          <SearchIcon size={16} />
          <input value={query} onChange={e => setQuery(e.target.value)}
            placeholder={S.search.placeholder} autoFocus />
        </div>
      </div>

      <main className="flex-1 overflow-y-auto p-[18px]">
        {query.trim() && !hasResults && (
          <div className="text-center text-ink-3 py-8 font-zh tracking-[0.04em]">{S.search.noResults}</div>
        )}

        {/* Quiz results */}
        {quizResults.length > 0 && (
          <div className="mb-4">
            <div className="section-title" style={{ marginBottom: 10 }}>{S.search.quizTitle} <span className="ml-1 text-ink-2" style={{ fontSize: 11, letterSpacing: 0 }}>{quizResults.length}</span></div>
            {Object.values(quizGrouped).map(group => (
              <div key={`q-${group.subject}|||${group.chapter}`} className="mb-3">
                <div className="text-xs text-ink-3 font-mono mb-1.5">
                  {getSubjectDisplayName(group.subject)} · {group.chapter}
                </div>
                <div className="flex flex-col gap-1.5">
                  {group.items.map(q => (
                    <div key={q.id} className="bg-bg-card rounded-lg p-3 border cursor-pointer" style={{ borderColor: 'var(--border-soft)' }}
                      onClick={() => navigate(q.type === 'choice' ? `/quiz/${q.subject}?chapter=${encodeURIComponent(q.chapter)}` : `/quiz-review/${q.subject}?chapter=${encodeURIComponent(q.chapter)}`)}>
                      <div className="text-sm text-ink card-content line-clamp-2"><RenderMarkdown content={q.question || q.id} /></div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Flashcard results */}
        {flashcardResults.length > 0 && (
          <div className="mb-4">
            <div className="section-title" style={{ marginBottom: 10 }}>{S.search.flashcardTitle} <span className="ml-1 text-ink-2" style={{ fontSize: 11, letterSpacing: 0 }}>{flashcardResults.length}</span></div>
            <div className="flex flex-col gap-1.5">
              {flashcardResults.map(card => (
                <div key={card.id} className="bg-bg-card rounded-lg p-3 border cursor-pointer" style={{ borderColor: 'var(--border-soft)' }}
                  onClick={() => navigate(`/deck/${card.deckId}`)}>
                  <div className="text-xs text-ink-3 font-mono mb-1">{card.deckName}</div>
                  <div className="text-sm text-ink card-content line-clamp-1">{card.front}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {!query.trim() && (
          <div className="text-center text-ink-3 py-8">
            <div className="text-sm">{S.search.promptTitle}</div>
            <div className="text-xs mt-1 text-ink-4">{S.search.promptHint}</div>
          </div>
        )}
      </main>
    </div>
  )
}
