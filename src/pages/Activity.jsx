import { useEffect, useRef, useState } from 'react'
import { CheckIcon } from '../components/Icons'
import { FocusHeader } from '../components/FocusHeader'
import { getActivityDashboard, getHeatmapData } from '../lib/activity'
import { S } from '../lib/strings'

function percent(done, total) {
  if (!total) return '0%'
  return `${Math.round((done / total) * 100)}%`
}

/**
 * 一行一模块（记-31）——替旧三同心环。
 * 环是 Apple 之签名形，家讳一（借古／借他人之形须证今义）证不出：同一组
 * 数在环上要三次视觉解码（哪一圈是哪个模块、缺口多大、中心数从何来），
 * 在行上一次就读完，且行可标数、可标目标、可比长短。
 */
function ProgressRow({ name, value, target, unit, tone, meta, scaleOnly }) {
  /* target 有两义：日目标（可达成，故报「/N」与达标记）与比例尺
     （只为定长短，不可报）。二者不分即成假目标（记-31）。 */
  const ratio = target > 0 ? Math.min(1, value / target) : 0
  const reached = !scaleOnly && target > 0 && value >= target
  return (
    <div className="act-row">
      <span className="k">{name}</span>
      <span className="track">
        <span className={`fill ${tone}`} style={{ width: `${Math.max(ratio * 100, value > 0 ? 3 : 0)}%` }} />
      </span>
      <span className="v">
        {value}{unit}
        {!scaleOnly && target > 0 && <span className="t">/{target}</span>}
        {reached && <CheckIcon size={11} sw={2.4} />}
      </span>
      {meta && <span className="m">{meta}</span>}
    </div>
  )
}

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

function HeatmapGrid() {
  const { days } = getHeatmapData()
  const [selectedDate, setSelectedDate] = useState('')
  const scrollerRef = useRef(null)
  const selected = days.find(day => day.date === selectedDate) || null

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
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--text-2xs)', color: 'var(--ink-3)' }}>{S.activity.heatmapDays}</span>
      </div>
      <div className="activity-date-picker">
        <label htmlFor="activity-date">{S.activity.datePickerLabel}</label>
        <select
          id="activity-date"
          value={selectedDate}
          onChange={(event) => setSelectedDate(event.target.value)}
          aria-label={S.activity.datePickerLabel}
        >
          <option value="">{S.activity.datePickerPlaceholder}</option>
          {days.map(day => <option key={day.date} value={day.date}>{day.date}</option>)}
        </select>
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
                      className="activity-heatmap-cell"
                      onClick={() => setSelectedDate(selected?.date === day.date ? '' : day.date)}
                      style={{
                        width: 14, height: 14, borderRadius: 'var(--r-md)',
                        background: HEATMAP_LEVELS[lv],
                        cursor: 'pointer',
                        border: selected?.date === day.date ? '1px solid var(--ink)' : '1px solid var(--border-soft)',
                        boxShadow: selected?.date === day.date ? '0 0 0 1px var(--bg), 0 0 0 2px var(--ink)' : 'none',
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
      {/* Detail line */}
      <div className="activity-detail" aria-live="polite" style={{ marginTop: selected ? 8 : 0, fontFamily: 'var(--font-mono)', fontSize: 'var(--text-xs)', color: 'var(--ink-2)', display: 'flex', gap: 8, alignItems: 'center' }}>
        {selected && <>
          <span>{selected.date}</span>
          <span style={{ color: 'var(--ink-4)' }}>·</span>
          <span>{S.activity.recallDetailPrefix}{selected.recall}</span>
          <span style={{ color: 'var(--ink-4)' }}>·</span>
          <span>{S.activity.practiceDetailPrefix}{selected.practice}</span>
          <span style={{ color: 'var(--ink-4)' }}>·</span>
          <span>{S.activity.readingDetailPrefix}{selected.reading} min</span>
        </>}
      </div>
    </section>
  )
}

export default function Activity() {
  const data = getActivityDashboard()
  const maxModule = Math.max(1, data.totals.recall, data.totals.practice, data.totals.reading)

  return (
    <div className="page-fixed primary-tab-screen">
      <header className="topbar">
        <h1 className="zh">{S.activity.pageTitle}</h1>
      </header>

      <main className="page-scroll">
        <div className="activity-content">
          {/* 焦点：连续天数是这一屏唯一会改变行为的数——其余是回顾。
              旧此处三数并列（活跃天数／本周／总活动量），皆无下一步。 */}
          <FocusHeader
            label={S.activity.streakLabel}
            value={data.streak}
            unit={S.activity.streakUnit}
            sub={S.activity.streakSub(data.monthActiveDays, data.weekActiveDays)}
          />

          <section className="act-section">
            <div className="act-section-head">
              <span className="t">{S.activity.todayTitle}</span>
              <span className="m">{S.activity.targetNote}</span>
            </div>
            <ProgressRow name={S.activity.recallName} value={data.today.recall}
              target={data.targets.recall} unit="" tone="recall" />
            <ProgressRow name={S.activity.practiceName} value={data.today.practice}
              target={data.targets.practice} unit="" tone="practice" />
            <ProgressRow name={S.activity.readingName} value={data.today.reading}
              target={data.targets.reading} unit={S.activity.minuteUnit} tone="reading" />
          </section>

          <HeatmapGrid />

          <section className="act-section">
            <div className="act-section-head">
              <span className="t">{S.activity.modulesTitle}</span>
              <span className="m">{S.activity.thisMonth}</span>
            </div>
            <ProgressRow name={S.activity.recallName} value={data.totals.recall}
              target={maxModule} scaleOnly unit="" tone="recall"
              meta={S.activity.correctRatePrefix(percent(data.totals.recallCorrect, data.totals.recall))} />
            <ProgressRow name={S.activity.practiceName} value={data.totals.practice}
              target={maxModule} scaleOnly unit="" tone="practice"
              meta={S.activity.correctRatePrefix(percent(data.totals.practiceCorrect, data.totals.practice))} />
            <ProgressRow name={S.activity.readingName} value={data.totals.reading}
              target={maxModule} scaleOnly unit={S.activity.minuteUnit} tone="reading" />
          </section>
        </div>
      </main>
    </div>
  )
}
