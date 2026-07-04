export const questionParser = {
  skipMissingId: '跳过无效题目: 缺少 id',
  skipMissingType: (id) => `跳过题目 ${id}: 缺少 type`,
  skipUnknownType: (id, type) => `跳过题目 ${id}: 未知类型 "${type}"`,
  noOptionsWarning: (id) => `警告: 选择题 ${id} 没有选项`,
}
