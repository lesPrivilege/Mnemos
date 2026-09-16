import { Link, useSearchParams } from 'react-router-dom'
import { getCard } from '../lib/storage'
import { loadQuestions } from '../quiz/lib/storage'
import { getDocument } from '../reading/lib/storage'
import { buildQuizRoute } from '../quiz/lib/routes'
import ActivityHistory from '../components/ActivityHistory'
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


export default function Activity() {
  const [params, setParams] = useSearchParams()
  const from = params.get('from') || ''
  const to = params.get('to') || ''
  const returnTo = `/activity${params.size ? `?${params}` : ''}`
  function recordLink(entry) {
    let title, route
    if (entry.module === 'recall') {
      const card = getCard(entry.itemId)
      if (card) { title = card.front || '卡片'; route = `/browse/${encodeURIComponent(card.deckId)}?card=${encodeURIComponent(card.id)}` }
    } else if (entry.module === 'practice' && !entry.legacy) {
      const question = loadQuestions().find(item => item.id === entry.itemId)
      if (question) { title = question.question || question.id; route = buildQuizRoute(question.type === 'choice' ? 'quiz' : 'quiz-review', question.subject, { qid: question.id }) }
    } else if (entry.module === 'reading') {
      const doc = getDocument(entry.docId)
      if (doc) { title = doc.title; route = `/reading/doc/${encodeURIComponent(doc.id)}` }
    }
    const label = { recall: '记忆', practice: '练习', reading: '阅读' }[entry.module]
    return route ? <Link to={route} state={{ returnTo }}>{label} · {title}</Link> : <span>{label} · {entry.legacy ? '旧记录无资料定位' : '原资料已不可用'}</span>
  }
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

          <ActivityHistory days={getHeatmapData().days} initialFrom={from} initialTo={to} renderEntry={recordLink} onRangeChange={(start, end) => {
            const next = new URLSearchParams(params)
            if (start) next.set('from', start); else next.delete('from')
            if (end) next.set('to', end); else next.delete('to')
            setParams(next, { replace: true })
          }} />

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
