export const activity = {
  back: '返回',
  pageTitle: '活动',
  /* 焦点行：连续天数是这一屏唯一会改变行为的数——其余是回顾（记-31）。
     旧此处三数并列（活跃天数／本周／总活动量），皆无下一步。 */
  streakLabel: '连续',
  streakUnit: ' 天',
  streakSub: (activeDays, weekTotal) => `本月活跃 ${activeDays} 天 · 本周 ${weekTotal} 次`,
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
}
