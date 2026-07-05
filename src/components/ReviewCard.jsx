import { useRenderedMarkdown } from '../lib/useRenderedMarkdown'
import { S } from '../lib/strings'
import '../styles/markdown.css'

export default function ReviewCard({ card, index, flipped, onFlip, swipeOffset }) {
  const frontHtml = useRenderedMarkdown(card.front)
  const backHtml = useRenderedMarkdown(card.back)

  const pos = String(index + 1).padStart(2, '0')
  const absDx = Math.abs(swipeOffset || 0)
  const showLabel = flipped && absDx > 24
  const labelOpacity = Math.min(1, (absDx - 24) / 72)

  return (
    <div className="rv-card-wrap">
      <div className="rv-card flip-card" onClick={() => { if (!swipeOffset) onFlip?.(!flipped) }}>
        <div className={`flip-inner ${flipped ? 'flipped' : ''}`}>
          {/* FRONT */}
          <div className="flip-face">
            <span className="corner">
              <span className="num">{pos}</span>
              <span>问</span>
            </span>
            <div className="body">
              <div className="front-q card-content" style={{ maxHeight: '40vh', overflowY: 'auto' }}
                dangerouslySetInnerHTML={{ __html: frontHtml }} />
            </div>
            <div className="ornament" />
          </div>

          {/* Back keeps the prompt above the answer without exposing pattern labels. */}
          <div className="flip-face flip-back-face">
            <span className="corner">
              <span className="num">{pos}</span>
              <span>答</span>
            </span>
            <div className="body back">
              <div className="card-content font-zh text-[16px] text-ink-2" style={{ maxHeight: '20vh', overflowY: 'auto' }}
                dangerouslySetInnerHTML={{ __html: frontHtml }} />
              <div className="divider-srs" aria-hidden="true" />
              <div className="back-a card-content" style={{ maxHeight: '35vh', overflowY: 'auto' }}
                dangerouslySetInnerHTML={{ __html: backHtml }} />
            </div>
            <div className="ornament" />
          </div>
        </div>

        {/* Swipe overlay labels */}
        {showLabel && swipeOffset < 0 && (
          <div style={{
            position: 'absolute', inset: 0, display: 'flex', alignItems: 'center',
            justifyContent: 'flex-start', paddingLeft: 24, borderRadius: 'var(--r-lg)',
            background: `color-mix(in oklch, var(--danger) ${Math.round(labelOpacity * 15)}%, transparent)`,
            pointerEvents: 'none', zIndex: 10,
          }}>
            <span style={{ color: 'var(--danger)', fontWeight: 600, fontSize: 18, opacity: labelOpacity }}>{S.review.again}</span>
          </div>
        )}
        {showLabel && swipeOffset > 0 && (
          <div style={{
            position: 'absolute', inset: 0, display: 'flex', alignItems: 'center',
            justifyContent: 'flex-end', paddingRight: 24, borderRadius: 'var(--r-lg)',
            background: `color-mix(in oklch, var(--ink) ${Math.round(labelOpacity * 10)}%, transparent)`,
            pointerEvents: 'none', zIndex: 10,
          }}>
            <span style={{ color: 'var(--ink)', fontWeight: 600, fontSize: 18, opacity: labelOpacity }}>{S.review.remember}</span>
          </div>
        )}
      </div>

      {!flipped && (
        <div className="rv-flip-hint">{S.review.flipHint}</div>
      )}
    </div>
  )
}
