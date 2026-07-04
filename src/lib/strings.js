// User-visible string constants — i18n reserve.
// One flat object, grouped by domain. Values are byte-identical copies of the
// strings previously inlined across src/lib and src/components; this file
// does not change any behavior or visible copy, only where it lives.
// See docs/feature-predesign-cleanup-prompt.md for the externalization plan.

export const S = {
  common: {
    confirmOperation: '确认操作',
    confirm: '确认',
    cancel: '取消',
    undo: '撤销',
  },
  review: {
    again: '重来',
    remember: '记住',
    flipHint: '轻点翻面 · TAP TO FLIP',
  },
  cardEditor: {
    edit: '编辑',
    preview: '预览',
    frontPlaceholder: '正面 · 问题',
    backPlaceholder: '背面 · 答案',
    save: '保存',
    add: '添加',
    cancel: '取消',
    tableTemplate: '| 列1 | 列2 |\n| --- | --- |\n| ',
  },
  error: {
    boundaryTitle: '出错了',
    reload: '重新加载',
  },
  structure: {
    empty: '暂无数据',
  },
  storage: {
    quotaFlashcard: '请导出备份后清理数据',
    genericUnsaved: '数据未保存',
    quotaFull: (detail) => `储存空间已满，${detail}`,
  },
  reviewLog: {
    unsaved: '复习日志未保存',
  },
  reviewSession: {
    unsaved: '复习会话未保存',
  },
  autoBackup: {
    statusUnsaved: '自动备份状态未保存',
  },
  reminders: {
    dueBody: (count) => `${count} 张卡片待复习`,
    wrongBookSuffix: (size) => ` · 错题 ${size}`,
    title: 'Mnemos · 今日复习',
    channelName: '复习提醒',
  },
}
