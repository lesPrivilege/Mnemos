/**
 * HeroSection — shared dashboard hero used by both flashcard and quiz tabs.
 *
 * Props:
 *   label     – string, e.g. "今日 · TODAY"
 *   right     – array of { icon, text } for the streak/star area
 *   metrics   – array of { value, label, zhLabel, accent? }
 *   chartData – array of { count, isToday, label }
 *   chartColor – "" | "teal" | "good"
 *   cta       – optional { to, label, count } primary action
 */
import { Link } from 'react-router-dom'

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
  if (!right) right = []
  const Root = to ? Link : 'div'
  const CtaRoot = cta?.to ? Link : 'button'
  return (
    <Root className={`hero ${to ? 'hero-link' : ''}`} {...(to ? { to } : {})}>
      <div className="hero-head">
        <span className="lbl">{label}</span>
        <div className="hero-head-right">
          {right.map((r, i) => (
            <span key={i} className={`streak ${r.warn ? 'warn' : ''}`}>
              {r.icon}
              <span>{r.text}</span>
            </span>
          ))}
        </div>
      </div>
      <HeroMetrics metrics={metrics} />
      <HeroChart data={chartData} color={chartColor} chartMax={chartMax} />
      {cta && (
        <CtaRoot className="hero-cta" {...(cta.to ? { to: cta.to } : { type: 'button', onClick: cta.onClick })}>
          <span>{cta.label}</span>
          {cta.count != null && <span className="hero-cta-count">{cta.count}</span>}
        </CtaRoot>
      )}
    </Root>
  )
}
