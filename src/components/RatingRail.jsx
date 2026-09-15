import { useState } from 'react'
import { S } from '../lib/strings'
const ratings = [[1, S.review.again], [2, S.review.hard], [4, S.review.remember], [5, S.review.easy]]
export default function RatingRail({ disabled, onRate }) {
  const [preview, setPreview] = useState(2)
  return <div className="rating-controls">
    <div className="rate">
      {ratings.map(([quality, label]) => <button key={quality} aria-label={label} aria-keyshortcuts={String(quality)} disabled={disabled} className="rate-btn" onClick={() => onRate(quality)}><span>{label}</span><span className="k">{quality}</span></button>)}
    </div>
    <details className="rating-preview">
      <summary>滑动预选评价</summary>
      <label>预选：{ratings[preview][1]}<input aria-label="预选评价" aria-valuetext={ratings[preview][1]} type="range" min="0" max="3" step="1" value={preview} disabled={disabled} onChange={e => setPreview(Number(e.target.value))}/></label>
      <button className="btn btn-ghost" disabled={disabled} onClick={() => onRate(ratings[preview][0])}>确认{ratings[preview][1]}</button>
    </details>
  </div>
}
