import { useEffect, useRef, useState } from 'react'
import { S } from '../lib/strings'

/* 混色取 oklab 而非 oklch：oklch 走极坐标，accent（hue 30）与 bg-raised
   （hue 240 之极低彩度）之间要插值 hue，途经紫区——实测四档全泛蓝紫。
   oklab 走直角坐标，无 hue 可插，色相不飘（记-31）。 */
const HEATMAP_LEVELS = [
  'var(--bg-raised)',
  'color-mix(in oklab, var(--accent) 25%, var(--bg-raised))',
  'color-mix(in oklab, var(--accent) 50%, var(--bg-raised))',
  'color-mix(in oklab, var(--accent) 75%, var(--bg-raised))',
  'var(--accent)',
]
const DAY_LABELS_SHORT = S.activity.dayLabelsShort

// Parse 'YYYY-MM-DD' as local date (new Date(str) would parse as UTC and
// shift the weekday in negative-offset timezones)
function localWeekday(dateStr) {
  const [y, m, d] = dateStr.split('-').map(Number)
  return new Date(y, m - 1, d).getDay()
}

export default function ActivityHistory({ days, initialFrom = '', initialTo = '', onRangeChange, renderEntry }) {
  const [from, setFrom] = useState(initialFrom)
  const [to, setTo] = useState(initialTo)
  useEffect(() => { setFrom(initialFrom); setTo(initialTo) }, [initialFrom, initialTo])
  const savedScroll = useRef(null)
  const selectedDate = from === to ? from : ''
  const invalid = from && to && from > to
  const filtered = !invalid && (from || to) ? days.filter(day => (!from || day.date >= from) && (!to || day.date <= to)) : []
  function changeRange(start, end) {
    if (savedScroll.current === null) savedScroll.current = scrollerRef.current?.scrollLeft || 0
    setFrom(start); setTo(end); onRangeChange?.(start, end)
  }
  function selectDate(date) { changeRange(date, date) }
  function clear() {
    setFrom(''); setTo(''); onRangeChange?.('', '')
    if (scrollerRef.current && savedScroll.current !== null) scrollerRef.current.scrollLeft = savedScroll.current
    savedScroll.current = null
  }
  const scrollerRef = useRef(null)

  // Newest week visible by default
  useEffect(() => {
    const el = scrollerRef.current
    if (el) el.scrollLeft = el.scrollWidth
  }, [])

  // Align columns to real weeks: pad the first column so row index === weekday (Sun→Sat)
  const offset = days.length ? localWeekday(days[0].date) : 0
  const padded = [...Array(offset).fill(null), ...days]
  const weeks = []
  for (let i = 0; i < padded.length; i += 7) {
    weeks.push(padded.slice(i, i + 7))
  }

  // Intensity levels based on fixed thresholds against daily targets (20 recall + 20 practice + 30 reading = 70)
  const level = (total) => {
    if (total === 0) return 0
    if (total < 15) return 1
    if (total < 35) return 2
    if (total < 55) return 3
    return 4
  }

  // Month label above a week iff its month differs from the previous week's
  const MONTH_NAMES = S.activity.monthNames
  const monthOf = (week) => {
    const first = week.find(Boolean)
    return first ? Number(first.date.slice(5, 7)) : null
  }
  const monthLabels = weeks.map((week, wi) => {
    const month = monthOf(week)
    if (month == null) return null
    if (wi === 0 || month !== monthOf(weeks[wi - 1])) return MONTH_NAMES[month]
    return null
  })

  return (
    <section className="act-section activity-section">
      <div className="activity-section-head">
        <div className="section-title">{S.activity.heatmapTitle}</div>
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--text-2xs)', color: 'var(--ink-3)' }}>{S.activity.heatmapDays}</span>
      </div>
      <div className="activity-date-picker">
        <label htmlFor="activity-date">{S.activity.datePickerLabel}</label>
        <select
          id="activity-date"
          value={selectedDate}
          onChange={(event) => selectDate(event.target.value)}
          aria-label={S.activity.datePickerLabel}
        >
          <option value="">{S.activity.datePickerPlaceholder}</option>
          {days.map(day => <option key={day.date} value={day.date}>{day.date}</option>)}
        </select>
      </div>
      <div className="activity-range">
        <label>开始日期<input type="date" value={from} onChange={event => changeRange(event.target.value, to)}/></label>
        <label>结束日期<input type="date" value={to} onChange={event => changeRange(from, event.target.value)}/></label>
        <button className="btn btn-ghost" disabled={!from && !to} onClick={clear}>清除筛选</button>
      </div>
      <div ref={scrollerRef} className="activity-heatmap-scroll" aria-hidden="true" style={{ overflowX: 'auto', paddingBottom: 4 }}>
        <div style={{ display: 'inline-flex', flexDirection: 'column', gap: 2, minWidth: weeks.length * 14 + 20 }}>
          {/* Month labels */}
          <div style={{ display: 'flex', gap: 2, paddingLeft: 18 }}>
            {monthLabels.map((label, i) => (
              <div key={i} style={{ width: 14, fontFamily: 'var(--font-mono)', fontSize: 'var(--text-2xs)', color: 'var(--ink-3)', textAlign: 'center' }}>
                {label || ''}
              </div>
            ))}
          </div>
          {/* Grid rows */}
          <div style={{ display: 'flex', gap: 2 }}>
            {/* Day labels */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 2, width: 16, flexShrink: 0 }}>
              {DAY_LABELS_SHORT.map((label, i) => (
                <div key={i} style={{ height: 14, fontFamily: 'var(--font-mono)', fontSize: 'var(--text-2xs)', color: 'var(--ink-3)', display: 'flex', alignItems: 'center', justifyContent: i % 2 === 1 ? 'center' : 'flex-end' }}>
                  {i % 2 === 1 ? label : ''}
                </div>
              ))}
            </div>
            {/* Cells */}
            {weeks.map((week, wi) => (
              <div key={wi} style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                {Array.from({ length: 7 }, (_, di) => {
                  const day = week[di]
                  if (!day) return <div key={di} style={{ width: 14, height: 14 }} />
                  const lv = level(day.total)
                  return (
                    <div key={di}
                      className={`activity-heatmap-cell${filtered.some(item => item.date === day.date) ? ' selected' : ''}`}
                      onClick={() => selectDate(day.date)}
                      style={{
                        background: HEATMAP_LEVELS[lv],
                      }}
                      title={S.activity.cellTitle(day)}
                    />
                  )
                })}
              </div>
            ))}
          </div>
        </div>
      </div>
      <div className="activity-filter-result" aria-live="polite">
        {invalid ? <p role="alert">结束日期不能早于开始日期。</p> : from || to ? <>
          <p>{filtered.length ? `当前窗口内：${filtered.length} 天` : '所选范围不在当前 90 天记录窗口内。'}</p>
          {filtered.length > 0 && <><p>— 表示该模块当天没有可用记录。</p><div className="activity-table-scroll" role="region" aria-label="活动明细，可横向滚动" tabIndex={0}><table><caption>每日活动记录</caption><thead><tr><th>日期</th><th>记忆次数</th><th>练习次数</th><th>阅读分钟</th></tr></thead><tbody>{filtered.map(day => <tr key={day.date}><th scope="row">{day.date}</th>{['recall', 'practice', 'reading'].map(kind => <td key={kind}>{day.recorded?.[kind] ? day[kind] : '—'}</td>)}</tr>)}</tbody></table></div></>}
          {renderEntry && filtered.some(day => day.entries?.length) && <details><summary>查看所选日期的记录与资料</summary><ul className="activity-entry-list">{filtered.flatMap(day => (day.entries || []).map((entry, index) => <li key={`${day.date}-${entry.id || index}`}><span>{day.date} · </span>{renderEntry(entry)}</li>))}</ul></details>}
        </> : <p>选择一天或日期范围查看明细。</p>}
      </div>
    </section>
  )
}
