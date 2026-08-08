/**
 * MasteryMeter — 熟练度计（记号谱，记-25）
 *
 * 一记一义：**已稳固之比例**。替旧「弱·中·稳·新四态点」四色堆叠条——
 * 其 mid 占 accent（判例四所禁），weak 占 danger（弱是熟练度末档，非错），
 * 且四档在 3px 上本不可辨（暗纸相邻实测 稳/中 2.99、中/弱 1.21）。
 *
 * 「弱 N」不入此计——那是另一个问题（有几张要人动手），由行内文字与
 * 告警图标承载，以形不以色。
 *
 * 同产物内只此一份实体（底3 变体登记）：卡组行与结构树共用。
 */
export function MasteryMeter({ ratio, width }) {
  const pct = Math.round(Math.max(0, Math.min(1, ratio)) * 100)
  return (
    <div className="meter" style={width ? { width, flexShrink: 0 } : undefined}>
      <i style={{ width: `${pct}%` }} />
    </div>
  )
}
