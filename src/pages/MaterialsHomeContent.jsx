import { useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { FlashcardHomeContent } from './FlashcardHomeContent'
import { QuizHomeContent } from './QuizHomeContent'
import ReadingHomeContent from '../reading/pages/ReadingHomeContent'
import { S } from '../lib/strings'

const kinds = ['flashcard', 'quiz', 'reading']

export default function MaterialsHomeContent() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const initial = searchParams.get('kind') || searchParams.get('tab') || sessionStorage.getItem('mnemos-material-kind')
  const [kind, setKind] = useState(kinds.includes(initial) ? initial : 'flashcard')

  const choose = (next) => {
    setKind(next)
    sessionStorage.setItem('mnemos-material-kind', next)
    navigate(`/?view=materials&kind=${next}`, { replace: true })
  }

  return (
    <div className="materials-home">
      <div className="materials-switch" aria-label={S.home.materialsFilter}>
        {kinds.map((key) => (
          <button key={key} onClick={() => choose(key)} aria-pressed={kind === key} className={kind === key ? 'on' : ''}>
            {S.home.materialKinds[key]}
          </button>
        ))}
      </div>
      <div className="materials-content">
        {kind === 'flashcard' && <FlashcardHomeContent />}
        {kind === 'quiz' && <QuizHomeContent />}
        {kind === 'reading' && <ReadingHomeContent />}
      </div>
    </div>
  )
}
