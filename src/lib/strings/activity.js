export const activity = {
  back: '返回',
  pageTitle: '活动',
  /* 焦点行：连续天数是这一屏唯一会改变行为的数——其余是回顾（记-31）。
     旧此处三数并列（活跃天数／本周／总活动量），皆无下一步。 */
  streakLabel: '连续',
  streakUnit: ' 天',
  /* 副句两数同为「天」。旧作「本周 N 次」，而那个 N 是记忆次数＋练习次数＋
     阅读分钟之和——三个量纲相加後挂一个单位，读者无从还原（记-32）。 */
  streakSub: (monthActiveDays, weekActiveDays) =>
    `本月活跃 ${monthActiveDays} 天 · 近 7 日 ${weekActiveDays} 天`,
  todayTitle: '今日',
  targetNote: '对每日目标',
  minuteUnit: ' 分钟',
  modulesTitle: '模块',
  thisMonth: '本月',
  recallName: '记忆',
  practiceName: '练习',
  readingName: '阅读',
  correctRatePrefix: (pct) => `正确率 ${pct}`,
  /* 热力图 */
  heatmapTitle: '热力',
  heatmapDays: '90 天',
  dayLabelsShort: ['日', '一', '二', '三', '四', '五', '六'],
  monthNames: ['', '1月', '2月', '3月', '4月', '5月', '6月', '7月', '8月', '9月', '10月', '11月', '12月'],
  recallDetailPrefix: '记忆 ',
  practiceDetailPrefix: '练习 ',
  readingDetailPrefix: '阅读 ',
  /* 格之提示语：分模块出，各带各的单位——旧作「日期: 7」，那个 7 同是三量纲之和。 */
  cellTitle: (day) =>
    `${day.date}：记忆 ${day.recall} · 练习 ${day.practice} · 阅读 ${day.reading} 分钟`,
}
