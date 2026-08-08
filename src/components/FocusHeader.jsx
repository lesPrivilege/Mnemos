import { Link } from 'react-router-dom'
import { ArrowRIcon } from './Icons'

/**
 * FocusHeader — 焦点行（版1，记-31）；记忆与练习两首页共用。
 *
 * 取代 HeroSection 之三数字盒。旧件之 `metrics[]` 三列 API 是指标通胀的
 * **制度**：给了三个格，页面就会去凑三个数，凑出来的多半是「总数」这类
 * 不支持决策之量（用户不会因为「总数 3」做任何事）。今只收一个主数、
 * 一句分解、一个去处——凑不出第二个数就是对的。
 *
 * @param {string} label  - 语境（「今日」「本周」「本卡组」）
 * @param {number|string} value - 唯一主数
 * @param {string} unit   - 主数之量词（「张待复习」）
 * @param {string} [sub]  - 一句分解；无可分解者不给
 * @param {{to: string, label: string}} [cta] - 唯一主行动
 */
export function FocusHeader({ label, value, unit, sub, cta }) {
  return (
    <div className="focus">
      <span className="lbl">{label}</span>
      <div className="focus-main">
        <div className="focus-num">
          <span className="n">{value}</span>
          <span className="u">{unit}</span>
        </div>
        {cta && (
          <Link to={cta.to} className="focus-cta">
            {cta.label}
            <ArrowRIcon size={15} />
          </Link>
        )}
      </div>
      {sub && <div className="focus-sub">{sub}</div>}
    </div>
  )
}

/**
 * ForecastStrip — 未来七日到期分布。
 *
 * 旧周条无轴标亦无数值，只是一排高低不同的块；记号谱问「表达了何处未
 * 表达之事实」，答不出。今直标数值（Vercel「prefer direct labels to
 * legends」）并补轴标，柱色由 --accent-line 提至 --ink-3——旧值对底 2.6，
 * 低于图形 3:1，真正可读的其实只有柱高。
 *
 * @param {{slots: Array, total: number, max: number}} data - derive.forecast7()
 * @param {string[]} labels - 周日→周六之七个字，由调用方从 strings 取
 */
export function ForecastStrip({ data, labels, title, formatTotal }) {
  const { slots, total, max } = data
  return (
    <div className="forecast">
      <div className="forecast-head">
        <span className="t">{title}</span>
        <span className="m">{formatTotal ? formatTotal(total) : total}</span>
      </div>
      <div className="fc-row">
        {slots.map((s) => (
          <div
            key={s.dow}
            className={`fc-col${s.isToday ? ' today' : ''}${s.count === 0 ? ' zero' : ''}`}
          >
            <span className="v">{s.count === 0 ? '·' : s.count}</span>
            <span className="b" style={{ height: barHeight(s.count, max) }} />
          </div>
        ))}
      </div>
      <div className="fc-axis">
        {slots.map((s) => (
          <span key={s.dow} className={s.isToday ? 'today' : ''}>{labels[s.dow]}</span>
        ))}
      </div>
    </div>
  )
}

/* 零者留一线以示「此格有其位而无其量」，非隐去——隐去会读作缺格。 */
function barHeight(count, max) {
  if (count === 0) return 2
  return Math.max(6, Math.round((count / max) * 32))
}
