// 题目解析器
// 支持 questions.json 格式导入

// source 推断：根据文件路径或 subject 字段
function inferSource(item, filePath) {
  if (item.source) return item.source
  const subj = item.subject || ''
  if (subj.includes('computer-organization') || filePath?.includes('computer-organization')) return '王道计组'
  if (subj.includes('data-structure') || filePath?.includes('data-structure')) return '王道数据结构'
  if (subj.includes('operating-system') || filePath?.includes('operating-system')) return '王道操作系统'
  if (subj.includes('computer-network') || filePath?.includes('computer-network')) return '王道计网'
  return 'unknown'
}

// chapter 标准化：统一为 "第X章 标题" 格式
function normalizeChapter(item) {
  if (item.chapter && item.chapter.startsWith('第')) return item.chapter
  const raw = item.chapter || ''
  // 尝试从 "2 数据的表示和运算" 格式转换
  const match = raw.match(/^(\d+)\s+(.+)$/)
  if (match) return `第${match[1]}章 ${match[2]}`
  return raw
}

// section 提取：从 id 的 chXX-名称 段解析，或直接用 item.section
function inferSection(item) {
  if (item.section) return item.section
  // 从 id 解析：ch02-数据的表示-choice001 → "数据的表示"
  const match = item.id?.match(/^ch\d+-(.+?)-(?:choice|review)\d+$/)
  if (match) return match[1]
  return ''
}

/**
 * 解析 questions.json 格式的题目
 * @param {string} jsonString - JSON 字符串
 * @param {string} filePath - 文件路径（用于推断 source）
 * @returns {{ questions: Question[], errors: string[] }}
 */
export function parseQuestionsJson(jsonString, filePath) {
  const raw = JSON.parse(jsonString)
  const questions = []
  const errors = []

  // 支持单个题目或题目数组
  const items = Array.isArray(raw) ? raw : [raw]

  for (const item of items) {
    // 验证必需字段
    if (!item.id) {
      errors.push(`跳过无效题目: 缺少 id`)
      continue
    }

    if (!item.type) {
      errors.push(`跳过题目 ${item.id}: 缺少 type`)
      continue
    }

    // 向后兼容：旧类型映射到新类型
    if (item.type === 'calculation' || item.type === 'coding' || item.type === 'essay') {
      item.type = 'review'
    }

    // 验证类型
    if (!['choice', 'review'].includes(item.type)) {
      errors.push(`跳过题目 ${item.id}: 未知类型 "${item.type}"`)
      continue
    }

    // 转换为标准格式
    const question = {
      id: item.id,
      source: inferSource(item, filePath),
      subject: item.subject || 'unknown',
      chapter: normalizeChapter(item),
      section: inferSection(item),
      type: item.type,
      question: item.question || '',
      options: normalizeOptions(item.options),
      answer: item.answer || '',
      explanation: item.explanation || '',
      solution_path: item.solution_path || item.tags?.image || null,
    }

    // 保留上游传递的元数据（exam years, origin, frequency, number 等）
    const metadata = {}
    if (item.number != null) metadata.number = item.number
    if (item.tags) {
      if (item.tags.origin) metadata.origin = item.tags.origin
      if (item.tags.exam_years?.length) metadata.exam_years = item.tags.exam_years
      if (item.tags.frequency) metadata.frequency = item.tags.frequency
      // 捕获 tags 中其他未来可能新增的字段
      for (const k of Object.keys(item.tags)) {
        if (!['origin', 'exam_years', 'frequency', 'image'].includes(k)) {
          metadata[k] = item.tags[k]
        }
      }
    }
    if (Object.keys(metadata).length > 0) question.metadata = metadata

    // 验证选择题必须有选项
    if (question.type === 'choice' && (!question.options || question.options.length === 0)) {
      errors.push(`警告: 选择题 ${question.id} 没有选项`)
    }

    questions.push(question)
  }

  return { questions, errors }
}

/**
 * 标准化选项格式
 */
function normalizeOptions(options) {
  if (!options || !Array.isArray(options)) return []
  return options.map(opt => opt.replace(/\s*-\s*$/, '').trim())
}

/**
 * 获取题目统计信息
 */
export function getQuestionsStats(questions) {
  const byType = {}
  const bySubject = {}
  const bySource = {}

  for (const q of questions) {
    byType[q.type] = (byType[q.type] || 0) + 1
    bySubject[q.subject] = (bySubject[q.subject] || 0) + 1
    bySource[q.source] = (bySource[q.source] || 0) + 1
  }

  return { total: questions.length, byType, bySubject, bySource }
}