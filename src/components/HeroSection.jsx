/**
 * HeroSection — shared dashboard hero used by both flashcard and quiz tabs.
 *
 * Props:
 *   label     – string
 *   right     – optional { text, color } for the streak/accuracy line
 *   metrics   – array of { value, zhLabel, accent? }
 *   chartData – array of { count, isToday, label }
 *   chartColor – "" | "teal" | "good"
 *   cta       – optional { to?, onClick?, label, count } primary action
 */
import { Link, useNavigate } from 'react-router-dom'

function HeroMetrics({ metrics }) {
  return (
    <div className="hero-row">
      {metrics.map((m, i) => (
        <div key={i} style={{ display: 'contents' }}>
          {i > 0 && <div className="hero-divider" />}
          <div className="hero-col">
            <span className={`num ${m.accent ? 'accent' : ''}`}>{m.value}</span>
            <span className="zh-label">{m.zhLabel}</span>
          </div>
        </div>
      ))}
    </div>
  )
}

function HeroChart({ data, color, chartMax }) {
  const max = chartMax ?? Math.max(1, ...data.map(d => d.count))
  return (
    <div className="hero-chart">
      {data.map((d, i) => (
        <div key={i} className={`hero-bar ${color} ${d.count === 0 ? 'empty' : ''} ${d.isToday ? 'today' : ''}`}>
          <div className="b" style={{ height: d.count === 0 ? 2 : Math.max(4, Math.min(24, (d.count / max) * 32)) }} />
          <span className="day">{d.label}</span>
        </div>
      ))}
    </div>
  )
}

export function HeroSection({ label, right, metrics, chartData, chartColor, chartMax, to, cta }) {
  const navigate = useNavigate()
  const Root = to ? Link : 'div'
  return (
    <Root className={`hero ${to ? 'hero-link' : ''}`} {...(to ? { to } : {})}>
      <div className="hero-head">
        <span className="lbl">{label}</span>
        {right && <span className="streak" style={{ color: right.color }}>{right.text}</span>}
      </div>
      <HeroMetrics metrics={metrics} />
      <HeroChart data={chartData} color={chartColor} chartMax={chartMax} />
      {cta && (
        <button type="button" className="hero-cta" onClick={(e) => {
          // Hero itself may also be a Link (`to`); stop the tap from
          // bubbling into it so the CTA's own destination wins.
          e.stopPropagation()
          e.preventDefault()
          if (cta.to) navigate(cta.to)
          else cta.onClick?.()
        }}>
          <span>{cta.label}</span>
          {cta.count != null && <span className="hero-cta-count">{cta.count}</span>}
        </button>
      )}
    </Root>
  )
}
