import { useEffect, useRef, useState } from 'react'
import { ArrowLIcon, FlameIcon, SparkIcon } from '../components/Icons'
import { getActivityDashboard, getHeatmapData } from '../lib/activity'
import { useBackButton } from '../lib/useBackButton'
import { S } from '../lib/strings'

function percent(done, total) {
  if (!total) return '0%'
  return `${Math.round((done / total) * 100)}%`
}

function intensity(day, max) {
  if (!day.total) return 0
  return Math.max(1, Math.ceil((day.total / max) * 4))
}

function ringPath(value, radius, color) {
  const circumference = 2 * Math.PI * radius
  const progress = Math.max(0, Math.min(1, value))
  return (
    <>
      <circle cx="100" cy="100" r={radius} fill="none" stroke="var(--bg-raised)" strokeWidth="14" />
      {progress > 0 && (
        <circle
          cx="100"
          cy="100"
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth="14"
          strokeDasharray={`${circumference * progress} ${circumference}`}
          strokeLinecap="round"
          transform="rotate(-90 100 100)"
        />
      )}
    </>
  )
}

function ActivityRings({ today, targets }) {
  const recall = Math.min(1, today.recall / targets.recall)
  const practice = Math.min(1, today.practice / targets.practice)
  const reading = Math.min(1, today.reading / targets.reading)
  const percentValue = Math.round(((recall + practice + reading) / 3) * 100)

  return (
    <section className="activity-section activity-rings-card">
      <div className="activity-section-head">
        <div className="section-title">{S.activity.todayTitle}</div>
        <span>{percentValue}%</span>
      </div>
      <div className="activity-rings">
        <svg className="activity-ring-svg" viewBox="0 0 200 200" aria-label={S.activity.todayCompletionAria(percentValue)}>
          {ringPath(recall, 86, 'var(--accent)')}
          {ringPath(practice, 66, 'var(--teal)')}
          {ringPath(reading, 46, 'var(--good)')}
          <text x="100" y="96" textAnchor="middle" fontFamily="var(--font-disp)" fontSize="38" fill="var(--ink)">{percentValue}</text>
          <text x="100" y="116" textAnchor="middle" fontFamily="var(--font-ui)" fontSize="10" fill="var(--ink-3)" letterSpacing="1">{S.activity.percentLabel}</text>
        </svg>
      </div>
      <div className="activity-ring-stats">
        <div className="col"><span className="dot recall" /><span className="num">{today.recall}</span><span className="zh">{S.activity.recallRingLabel}{targets.recall}</span></div>
        <div className="col"><span className="dot practice" /><span className="num">{today.practice}</span><span className="zh">{S.activity.practiceRingLabel}{targets.practice}</span></div>
        <div className="col"><span className="dot read" /><span className="num">{today.reading}<span>m</span></span><span className="zh">{S.activity.readingRingLabel}{targets.reading}</span></div>
      </div>
    </section>
  )
}

function ModuleRow({ name, meta, value, max, tone }) {
  return (
    <div className="activity-module">
      <div>
        <div className="activity-module-name">{name}</div>
        <div className="activity-module-meta">{meta}</div>
      </div>
      <div className="activity-module-meter">
        <span className={`activity-module-fill ${tone}`} style={{ width: `${value > 0 && max ? Math.max(6, (value / max) * 100) : 0}%` }} />
      </div>
      <span className="activity-module-value">{value}</span>
    </div>
  )
}

const HEATMAP_LEVELS = [
  'var(--bg-raised)',
  'color-mix(in oklch, var(--accent) 25%, var(--bg-raised))',
  'color-mix(in oklch, var(--accent) 50%, var(--bg-raised))',
  'color-mix(in oklch, var(--accent) 75%, var(--bg-raised))',
  'var(--accent)',
]
const DAY_LABELS_SHORT = S.activity.dayLabelsShort

// Parse 'YYYY-MM-DD' as local date (new Date(str) would parse as UTC and
// shift the weekday in negative-offset timezones)
function localWeekday(dateStr) {
  const [y, m, d] = dateStr.split('-').map(Number)
  return new Date(y, m - 1, d).getDay()
}

function HeatmapGrid() {
  const { days } = getHeatmapData()
  const [selected, setSelected] = useState(null)
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
    <section className="activity-section" style={{ background: 'var(--bg-card)', borderRadius: 'var(--r-lg)', border: '1px solid var(--border-soft)', padding: '14px' }}>
      <div className="activity-section-head" style={{ marginBottom: 10 }}>
        <div className="section-title">{S.activity.heatmapTitle}</div>
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--ink-3)' }}>{S.activity.heatmapDays}</span>
      </div>
      <div ref={scrollerRef} style={{ overflowX: 'auto', paddingBottom: 4 }}>
        <div style={{ display: 'inline-flex', flexDirection: 'column', gap: 2, minWidth: weeks.length * 14 + 20 }}>
          {/* Month labels */}
          <div style={{ display: 'flex', gap: 2, paddingLeft: 18 }}>
            {monthLabels.map((label, i) => (
              <div key={i} style={{ width: 14, fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--ink-3)', textAlign: 'center' }}>
                {label || ''}
              </div>
            ))}
          </div>
          {/* Grid rows */}
          <div style={{ display: 'flex', gap: 2 }}>
            {/* Day labels */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 2, width: 16, flexShrink: 0 }}>
              {DAY_LABELS_SHORT.map((label, i) => (
                <div key={i} style={{ height: 14, fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--ink-3)', display: 'flex', alignItems: 'center', justifyContent: i % 2 === 1 ? 'center' : 'flex-end' }}>
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
                      onClick={() => setSelected(selected?.date === day.date ? null : day)}
                      style={{
                        width: 14, height: 14, borderRadius: 3,
                        background: HEATMAP_LEVELS[lv],
                        cursor: 'pointer',
                        border: selected?.date === day.date ? '1.5px solid var(--ink)' : '1px solid var(--border-soft)',
                      }}
                      title={`${day.date}: ${day.total}`}
                    />
                  )
                })}
              </div>
            ))}
          </div>
        </div>
      </div>
      {/* Detail line */}
      {selected && (
        <div style={{ marginTop: 8, fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--ink-2)', display: 'flex', gap: 8, alignItems: 'center' }}>
          <span>{selected.date}</span>
          <span style={{ color: 'var(--ink-4)' }}>·</span>
          <span>{S.activity.recallDetailPrefix}{selected.recall}</span>
          <span style={{ color: 'var(--ink-4)' }}>·</span>
          <span>{S.activity.practiceDetailPrefix}{selected.practice}</span>
          <span style={{ color: 'var(--ink-4)' }}>·</span>
          <span>{S.activity.readingDetailPrefix}{selected.reading} min</span>
        </div>
      )}
    </section>
  )
}

export default function Activity() {
  const { goBack } = useBackButton()
  const data = getActivityDashboard()
  const maxModule = Math.max(1, data.totals.recall, data.totals.practice, data.totals.reading)

  return (
    <div className="page-fixed">
      <header className="topbar">
        <button onClick={goBack} className="tb-btn" aria-label={S.activity.back}><ArrowLIcon size={18} /></button>
        <h1 className="zh">{S.activity.pageTitle}</h1>
        <div className="tb-actions">
          <span className="tb-text">{S.activity.thisMonth}</span>
        </div>
      </header>

      <main className="page-scroll">
        <div className="activity-content">
        <div className="activity-hero">
          <div className="activity-hero-head">
            <span className="lbl">{S.activity.monthLabel}</span>
            <span className="streak"><FlameIcon size={14} />{data.streak}{S.activity.streakSuffix}</span>
          </div>
          <div className="activity-hero-grid">
            <div>
              <span className="num accent">{data.activeDays}</span>
              <span className="zh-label">{S.activity.activeDaysLabel}</span>
            </div>
            <div>
              <span className="num">{data.weekTotals.total}</span>
              <span className="zh-label">{S.activity.thisWeekLabel}</span>
            </div>
            <div>
              <span className="num">{data.totals.total}</span>
              <span className="zh-label">{S.activity.totalLabel}</span>
            </div>
          </div>
        </div>

        <ActivityRings today={data.today} targets={data.targets} />

        <section className="activity-section activity-calendar-card">
          <div className="activity-section-head">
            <div className="section-title">{S.activity.calendarTitle}</div>
            <span>{data.days.length}{S.activity.calendarDaysSuffix}</span>
          </div>
          <div className="activity-calendar">
            {data.days.map((day) => (
              <div key={day.date} className={`activity-day l${intensity(day, data.maxDayTotal)}`} title={`${day.date}: ${day.total}`}>
                <span>{Number(day.date.slice(-2))}</span>
              </div>
            ))}
          </div>
        </section>

        <HeatmapGrid />

        <section className="activity-section activity-modules-card">
          <div className="activity-section-head">
            <div className="section-title">{S.activity.modulesTitle}</div>
            <span style={{ fontFamily: 'var(--font-zh)' }}><SparkIcon size={13} />{S.activity.readonlyAggregate}</span>
          </div>
          <div className="activity-modules">
            <ModuleRow
              name={S.activity.recallName}
              meta={S.activity.correctRatePrefix(percent(data.totals.recallCorrect, data.totals.recall))}
              value={data.totals.recall}
              max={maxModule}
              tone="recall"
            />
            <ModuleRow
              name={S.activity.practiceName}
              meta={S.activity.correctRatePrefix(percent(data.totals.practiceCorrect, data.totals.practice))}
              value={data.totals.practice}
              max={maxModule}
              tone="practice"
            />
            <ModuleRow
              name={S.activity.readingName}
              meta={S.activity.minutesLabel}
              value={data.totals.reading}
              max={maxModule}
              tone="reading"
            />
          </div>
        </section>

        <section className="activity-section activity-recent-card">
          <div className="activity-section-head">
            <div className="section-title">{S.activity.recentTitle}</div>
            <span>{S.activity.recentDaysLabel}</span>
          </div>
          <div className="activity-recent">
            {data.days.slice(-7).map((day) => (
              <div key={day.date} className="activity-recent-day">
                <div className="activity-recent-date">{Number(day.date.slice(-2))}</div>
                <div className="activity-recent-bars">
                  <span className="recall" style={{ height: day.recall ? `${Math.max(3, Math.min(36, day.recall * 6))}px` : 0 }} />
                  <span className="practice" style={{ height: day.practice ? `${Math.max(3, Math.min(36, day.practice * 6))}px` : 0 }} />
                  <span className="reading" style={{ height: day.reading ? `${Math.max(3, Math.min(36, day.reading))}px` : 0 }} />
                </div>
              </div>
            ))}
          </div>
        </section>
        </div>
      </main>
    </div>
  )
}
