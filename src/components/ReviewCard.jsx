import { useEffect, useId, useRef } from 'react'
import { useRenderedMarkdown } from '../lib/useRenderedMarkdown'
import '../styles/markdown.css'

export default function ReviewCard({ card, flipped, onFlip }) {
  const frontHtml = useRenderedMarkdown(card.front)
  const backHtml = useRenderedMarkdown(card.back)
  const answerId = useId()
  const answerRef = useRef(null)
  const revealRef = useRef(null)
  const wasFlipped = useRef(false)

  useEffect(() => {
    if (flipped) answerRef.current?.focus({ preventScroll: true })
    else if (wasFlipped.current) revealRef.current?.focus({ preventScroll: true })
    wasFlipped.current = flipped
  }, [flipped, card.id])

  return (
    <div className="rv-card-wrap">
      <article className="rv-card rv-reveal">
        <div className="front-q card-content" dangerouslySetInnerHTML={{ __html: frontHtml }} />
        <button className="btn btn-ghost rv-reveal-button"
          ref={revealRef} aria-expanded={flipped} aria-controls={answerId}
          onClick={() => onFlip?.(!flipped)}>
          {flipped ? '收起答案' : '显示答案'}
        </button>
        <section id={answerId} hidden={!flipped} ref={answerRef} tabIndex={-1} aria-label="答案">
          <div className="rv-rule" aria-hidden="true" />
          <div className="rv-answer-label">答案</div>
          <div className="back-a card-content" dangerouslySetInnerHTML={{ __html: backHtml }} />
        </section>
      </article>
    </div>
  )
}
