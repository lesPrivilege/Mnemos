import { ArrowLIcon, FlameIcon, SparkIcon } from '../components/Icons'
import { getActivityDashboard } from '../lib/activity'
import { useBackButton } from '../lib/useBackButton'

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
        <div className="section-title">今日 · TODAY</div>
        <span>{percentValue}%</span>
      </div>
      <div className="activity-rings">
        <svg className="activity-ring-svg" viewBox="0 0 200 200" aria-label={`今日完成度 ${percentValue}%`}>
          {ringPath(recall, 86, 'var(--accent)')}
          {ringPath(practice, 66, 'var(--teal)')}
          {ringPath(reading, 46, 'var(--good)')}
          <text x="100" y="96" textAnchor="middle" fontFamily="var(--font-disp)" fontSize="38" fill="var(--ink)">{percentValue}</text>
          <text x="100" y="116" textAnchor="middle" fontFamily="var(--font-mono)" fontSize="9" fill="var(--ink-3)" letterSpacing="2">PERCENT</text>
        </svg>
      </div>
      <div className="activity-ring-stats">
        <div className="col"><span className="dot recall" /><span className="num">{today.recall}</span><span className="lab">RECALL</span><span className="zh">记忆 · {targets.recall}</span></div>
        <div className="col"><span className="dot practice" /><span className="num">{today.practice}</span><span className="lab">PRACTICE</span><span className="zh">练习 · {targets.practice}</span></div>
        <div className="col"><span className="dot read" /><span className="num">{today.reading}<span>m</span></span><span className="lab">READING</span><span className="zh">阅读 · {targets.reading}</span></div>
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

export default function Activity() {
  const { goBack } = useBackButton()
  const data = getActivityDashboard()
  const maxModule = Math.max(1, data.totals.recall, data.totals.practice, data.totals.reading)

  return (
    <div className="page-fill">
      <header className="topbar">
        <button onClick={goBack} className="tb-btn" aria-label="返回"><ArrowLIcon size={18} /></button>
        <h1 className="zh">活动</h1>
        <div className="tb-actions">
          <span className="tb-text">本月</span>
        </div>
      </header>

      <main className="page-scroll">
        <div className="activity-content">
        <div className="activity-hero">
          <div className="activity-hero-head">
            <span className="lbl">MONTH · 本月</span>
            <span className="streak"><FlameIcon size={14} />{data.streak} 日连续</span>
          </div>
          <div className="activity-hero-grid">
            <div>
              <span className="num accent">{data.activeDays}</span>
              <span className="label">ACTIVE DAYS</span>
              <span className="zh-label">活跃天数</span>
            </div>
            <div>
              <span className="num">{data.weekTotals.total}</span>
              <span className="label">THIS WEEK</span>
              <span className="zh-label">本周活动</span>
            </div>
            <div>
              <span className="num">{data.totals.total}</span>
              <span className="label">TOTAL</span>
              <span className="zh-label">总活动量</span>
            </div>
          </div>
        </div>

        <ActivityRings today={data.today} targets={data.targets} />

        <section className="activity-section activity-calendar-card">
          <div className="activity-section-head">
            <div className="section-title">月历 · CALENDAR</div>
            <span>{data.days.length} 天</span>
          </div>
          <div className="activity-calendar">
            {data.days.map((day) => (
              <div key={day.date} className={`activity-day l${intensity(day, data.maxDayTotal)}`} title={`${day.date}: ${day.total}`}>
                <span>{Number(day.date.slice(-2))}</span>
              </div>
            ))}
          </div>
        </section>

        <section className="activity-section activity-modules-card">
          <div className="activity-section-head">
            <div className="section-title">模块 · MODULES</div>
            <span><SparkIcon size={13} /> 只读聚合</span>
          </div>
          <div className="activity-modules">
            <ModuleRow
              name="记忆"
              meta={`正确率 ${percent(data.totals.recallCorrect, data.totals.recall)}`}
              value={data.totals.recall}
              max={maxModule}
              tone="recall"
            />
            <ModuleRow
              name="练习"
              meta={`正确率 ${percent(data.totals.practiceCorrect, data.totals.practice)}`}
              value={data.totals.practice}
              max={maxModule}
              tone="practice"
            />
            <ModuleRow
              name="阅读"
              meta="分钟"
              value={data.totals.reading}
              max={maxModule}
              tone="reading"
            />
          </div>
        </section>

        <section className="activity-section activity-recent-card">
          <div className="activity-section-head">
            <div className="section-title">最近 · RECENT</div>
            <span>7 天</span>
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
