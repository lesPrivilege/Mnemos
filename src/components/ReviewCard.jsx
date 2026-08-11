import { useRenderedMarkdown } from '../lib/useRenderedMarkdown'
import { S } from '../lib/strings'
import { pressable } from '../lib/a11y'
import '../styles/markdown.css'

export default function ReviewCard({ card, flipped, onFlip, swipeOffset }) {
  const frontHtml = useRenderedMarkdown(card.front)
  const backHtml = useRenderedMarkdown(card.back)

  const absDx = Math.abs(swipeOffset || 0)
  const showLabel = flipped && absDx > 24
  const labelOpacity = Math.min(1, (absDx - 24) / 72)

  return (
    <div className="rv-card-wrap">
      <div className="rv-card flip-card"
        aria-expanded={flipped}
        onClick={() => { if (!swipeOffset) onFlip?.(!flipped) }}
        {...pressable(() => { if (!swipeOffset) onFlip?.(!flipped) })}>
        <div className={`flip-inner ${flipped ? 'flipped' : ''}`}>
          {/* FRONT */}
          <div className="flip-face">
            <div className="body">
              <div className="front-q card-content"
                dangerouslySetInnerHTML={{ __html: frontHtml }} />
            </div>
            <div className="rv-flip-hint">{S.review.showAnswerHint}</div>
          </div>

          {/* Back keeps the prompt above the answer without exposing pattern labels. */}
          <div className="flip-face flip-back-face">
            <span className="rv-seal">答</span>
            <div className="body back">
              <div className="front-q card-content"
                dangerouslySetInnerHTML={{ __html: frontHtml }} />
              <div className="rv-rule" aria-hidden="true" />
              <div className="back-a card-content"
                dangerouslySetInnerHTML={{ __html: backHtml }} />
            </div>
          </div>
        </div>

        {/* Swipe overlay labels */}
        {showLabel && swipeOffset < 0 && (
          <div aria-hidden="true" style={{
            position: 'absolute', inset: 0, display: 'flex', alignItems: 'center',
            justifyContent: 'flex-start', paddingLeft: 24, borderRadius: 'var(--r-lg)',
            background: `color-mix(in oklch, var(--danger-critical) ${Math.round(labelOpacity * 15)}%, transparent)`,
            pointerEvents: 'none', zIndex: 10,
          }}>
            <span style={{ color: 'var(--danger-critical)', fontWeight: 500, fontSize: 'var(--text-2xl)', opacity: labelOpacity }}>{S.review.again}</span>
          </div>
        )}
        {showLabel && swipeOffset > 0 && (
          <div aria-hidden="true" style={{
            position: 'absolute', inset: 0, display: 'flex', alignItems: 'center',
            justifyContent: 'flex-end', paddingRight: 24, borderRadius: 'var(--r-lg)',
            background: `color-mix(in oklch, var(--ink) ${Math.round(labelOpacity * 10)}%, transparent)`,
            pointerEvents: 'none', zIndex: 10,
          }}>
            <span style={{ color: 'var(--ink)', fontWeight: 500, fontSize: 'var(--text-2xl)', opacity: labelOpacity }}>{S.review.remember}</span>
          </div>
        )}
      </div>

    </div>
  )
}
