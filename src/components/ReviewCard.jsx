import { useRenderedMarkdown } from '../lib/useRenderedMarkdown'
import '../styles/markdown.css'

export default function ReviewCard({ card, index, total, flipped, onFlip }) {
  const frontHtml = useRenderedMarkdown(card.front)
  const backHtml = useRenderedMarkdown(card.back)

  const pos = String(index + 1).padStart(2, '0')

  return (
    <div className="rv-card-wrap">
      <div className="rv-card flip-card" onClick={() => onFlip?.(!flipped)}>
        <div className={`flip-inner ${flipped ? 'flipped' : ''}`}>
          {/* FRONT */}
          <div className="flip-face">
            <span className="corner">
              <span className="num">{pos}</span>
              <span>QUESTION</span>
            </span>
            <div className="body">
              <div className="front-q card-content" style={{ maxHeight: '40vh', overflowY: 'auto' }}
                dangerouslySetInnerHTML={{ __html: frontHtml }} />
            </div>
            <div className="ornament" />
          </div>

          {/* BACK — REVERSO pattern: echo front, divider, then answer */}
          <div className="flip-face flip-back-face">
            <span className="corner">
              <span className="num">{pos}</span>
              <span>ANSWER</span>
            </span>
            <div className="body back">
              <div className="card-content font-zh text-[16px] text-ink-2" style={{ maxHeight: '20vh', overflowY: 'auto' }}
                dangerouslySetInnerHTML={{ __html: frontHtml }} />
              <div className="divider-srs">
                <span>REVERSO</span>
              </div>
              <div className="back-a card-content" style={{ maxHeight: '35vh', overflowY: 'auto' }}
                dangerouslySetInnerHTML={{ __html: backHtml }} />
            </div>
            <div className="ornament" />
          </div>
        </div>
      </div>

      {!flipped && (
        <div className="rv-flip-hint">轻点翻面 · TAP TO FLIP</div>
      )}
    </div>
  )
}
