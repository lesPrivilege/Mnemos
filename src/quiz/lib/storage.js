// localStorage 读写封装
// namespace: examprep-*

const STORAGE_KEYS = {
  QUESTIONS: 'examprep-questions',
  PROGRESS: 'examprep-progress',
  STARRED: 'examprep-starred',
  LAST_SESSION: 'examprep-last-session',
}

// ── Questions ──────────────────────────────────────────────────────

export function loadQuestions() {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.QUESTIONS)
    return raw ? JSON.parse(raw) : []
  } catch { return [] }
}

export function saveQuestions(questions) {
  try {
    localStorage.setItem(STORAGE_KEYS.QUESTIONS, JSON.stringify(questions))
    return { ok: true }
  } catch (e) {
    if (e.name === 'QuotaExceededError' || e.code === 22) {
      console.warn('Quiz: storage full — questions not saved')
      return { ok: false, error: '储存空间已满，题目未保存' }
    }
    throw e
  }
}

export function addQuestions(newQuestions) {
  const existing = loadQuestions()
  const ids = new Set(existing.map(q => q.id))
  const added = [], duplicates = []
  for (const q of newQuestions) {
    if (ids.has(q.id)) duplicates.push(q.id)
    else { existing.push(q); added.push(q) }
  }
  const result = saveQuestions(existing)
  return { added: added.length, duplicates: duplicates.length, saveError: result.ok ? null : result.error }
}

export function clearQuestions() {
  saveQuestions([])
  clearLastSession()
}

// ── Progress ───────────────────────────────────────────────────────

function defaultProgress() {
  return {
    attempts: 0,
    last_attempt: 0,
    status: 'todo',       // todo | correct | wrong
    correct_count: 0,
    wrong_count: 0,
    wrongStreak: 0,       // 连续错误次数（错题本进出判定）
    rightStreak: 0,       // 连续正确次数
  }
}

export function loadProgress() {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.PROGRESS)
    return raw ? JSON.parse(raw) : {}
  } catch { return {} }
}

export function saveProgress(progress) {
  try {
    localStorage.setItem(STORAGE_KEYS.PROGRESS, JSON.stringify(progress))
    return { ok: true }
  } catch (e) {
    if (e.name === 'QuotaExceededError' || e.code === 22) {
      console.warn('Quiz: storage full — progress not saved')
      return { ok: false, error: '储存空间已满，进度未保存' }
    }
    throw e
  }
}

export function recordAttempt(questionId, correct) {
  const progress = loadProgress()
  const now = Math.floor(Date.now() / 1000)

  if (!progress[questionId]) progress[questionId] = defaultProgress()
  const prog = progress[questionId]

  prog.attempts++
  prog.last_attempt = now

  if (correct === true) {
    prog.status = 'correct'
    prog.correct_count++
    prog.rightStreak++
    prog.wrongStreak = 0
  } else if (correct === false) {
    prog.status = 'wrong'
    prog.wrong_count++
    prog.wrongStreak++
    prog.rightStreak = 0
  }

  saveProgress(progress)
  return prog
}

export function clearAllProgress() { saveProgress({}) }

// ── Starred (收藏) ────────────────────────────────────────────────

export function loadStarred() {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.STARRED)
    return raw ? JSON.parse(raw) : []
  } catch { return [] }
}

export function saveStarred(ids) {
  try {
    localStorage.setItem(STORAGE_KEYS.STARRED, JSON.stringify(ids))
    return { ok: true }
  } catch (e) {
    if (e.name === 'QuotaExceededError' || e.code === 22) {
      console.warn('Quiz: storage full — starred not saved')
      return { ok: false, error: '储存空间已满，收藏未保存' }
    }
    throw e
  }
}

export function toggleStar(questionId) {
  const ids = loadStarred()
  const idx = ids.indexOf(questionId)
  if (idx >= 0) ids.splice(idx, 1)
  else ids.push(questionId)
  saveStarred(ids)
  return idx < 0 // true = starred
}

export function isStarred(questionId) {
  return loadStarred().includes(questionId)
}

// ── Last Session (继续练习) ───────────────────────────────────────

export function saveLastSession(session) {
  localStorage.setItem(STORAGE_KEYS.LAST_SESSION, JSON.stringify({
    ...session,
    timestamp: Date.now(),
  }))
}

export function loadLastSession() {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.LAST_SESSION)
    return raw ? JSON.parse(raw) : null
  } catch { return null }
}

export function clearLastSession() {
  localStorage.removeItem(STORAGE_KEYS.LAST_SESSION)
}

function clearLastSessionIfSubjectIn(subjects) {
  const set = subjects instanceof Set ? subjects : new Set(subjects)
  const session = loadLastSession()
  if (session && set.has(session.subject)) clearLastSession()
}

// ── Statistics ─────────────────────────────────────────────────────

export function getSubjectStats(subject) {
  const questions = loadQuestions()
  const progress = loadProgress()
  const filtered = subject ? questions.filter(q => q.subject === subject) : questions

  let total = filtered.length, done = 0, correct = 0, wrong = 0
  for (const q of filtered) {
    const s = progress[q.id]?.status || 'todo'
    if (s !== 'todo') done++
    if (s === 'correct') correct++
    if (s === 'wrong') wrong++
  }
  return { total, done, correct, wrong, todo: total - done, accuracy: done > 0 ? correct / done : 0 }
}

export function getChapterStats(subject) {
  const questions = loadQuestions()
  const progress = loadProgress()
  const filtered = subject ? questions.filter(q => q.subject === subject) : questions
  const chapters = {}

  for (const q of filtered) {
    const ch = q.chapter || '未分类'
    if (!chapters[ch]) chapters[ch] = { total: 0, done: 0, correct: 0, wrong: 0, choice: 0, review: 0 }
    const s = progress[q.id]?.status || 'todo'
    chapters[ch].total++
    if (s !== 'todo') chapters[ch].done++
    if (s === 'correct') chapters[ch].correct++
    if (s === 'wrong') chapters[ch].wrong++
    if (q.type === 'choice') chapters[ch].choice++
    else chapters[ch].review++
  }
  return chapters
}

export function getSubjectList() {
  return [...new Set(loadQuestions().map(q => q.subject))].sort()
}

export function getChapterList(subject) {
  const stats = getChapterStats(subject)
  return Object.entries(stats).map(([name, s]) => ({
    name, ...s, accuracy: s.done > 0 ? s.correct / s.done : 0,
  }))
}

// ── Export / Import ────────────────────────────────────────────────

export function exportData() {
  return JSON.stringify({
    questions: loadQuestions(),
    progress: loadProgress(),
    starred: loadStarred(),
    exportedAt: new Date().toISOString(),
  }, null, 2)
}

export function importData(jsonString) {
  const data = JSON.parse(jsonString)
  if (data.questions) saveQuestions(data.questions)
  if (data.progress) saveProgress(data.progress)
  if (data.starred) saveStarred(data.starred)
  return {
    questions: data.questions?.length || 0,
    progress: Object.keys(data.progress || {}).length,
    starred: data.starred?.length || 0,
  }
}

export function mergeImportData(jsonString) {
  const data = JSON.parse(jsonString)
  let starredMerged = 0
  let progressMerged = 0
  if (data.questions) {
    const r = addQuestions(data.questions)
    if (data.starred) {
      const existing = loadStarred()
      const newStarred = data.starred.filter(id => !existing.includes(id))
      saveStarred([...existing, ...newStarred])
      starredMerged = newStarred.length
    }
    if (data.progress) {
      const progress = loadProgress()
      for (const [id, prog] of Object.entries(data.progress)) {
        if (!progress[id]) { progress[id] = prog; progressMerged++ }
      }
      saveProgress(progress)
    }
    return { questions: r.added, duplicates: r.duplicates, starred: starredMerged, progress: progressMerged }
  }
  return { questions: 0, duplicates: 0, starred: 0, progress: 0 }
}

// ── Subject management ──────────────────────────────────────────────

export function deleteSubject(subject) {
  const questions = loadQuestions()
  const progress = loadProgress()
  const starred = loadStarred()

  const subjectIds = new Set(
    questions.filter(q => q.subject === subject).map(q => q.id)
  )

  const remaining = questions.filter(q => q.subject !== subject)
  saveQuestions(remaining)

  for (const id of subjectIds) delete progress[id]
  saveProgress(progress)

  const remainingStarred = starred.filter(id => !subjectIds.has(id))
  saveStarred(remainingStarred)

  clearLastSessionIfSubjectIn([subject])

  return { removed: subjectIds.size }
}

export function deleteSubjects(subjects) {
  const set = new Set(subjects)
  const questions = loadQuestions()
  const progress = loadProgress()
  const starred = loadStarred()

  const removedIds = new Set(
    questions.filter(q => set.has(q.subject)).map(q => q.id)
  )

  saveQuestions(questions.filter(q => !set.has(q.subject)))

  for (const id of removedIds) delete progress[id]
  saveProgress(progress)

  saveStarred(starred.filter(id => !removedIds.has(id)))

  clearLastSessionIfSubjectIn(set)

  return { removed: removedIds.size }
}

export function deleteQuestion(id) {
  return deleteQuestions([id])
}

export function deleteQuestions(ids) {
  const set = new Set(ids)
  const questions = loadQuestions()
  const progress = loadProgress()
  const starred = loadStarred()

  saveQuestions(questions.filter(q => !set.has(q.id)))

  for (const id of set) delete progress[id]
  saveProgress(progress)

  saveStarred(starred.filter(id => !set.has(id)))

  return { removed: set.size }
}

export function clearSubjectProgress(subject) {
  const questions = loadQuestions()
  const progress = loadProgress()

  for (const q of questions) {
    if (q.subject === subject) delete progress[q.id]
  }
  saveProgress(progress)
}

export function getStorageStats() {
  const questions = loadQuestions()
  const progress = loadProgress()
  const starred = loadStarred()

  // Per-subject breakdown
  const bySubject = {}
  for (const q of questions) {
    if (!bySubject[q.subject]) {
      bySubject[q.subject] = { total: 0, choice: 0, review: 0 }
    }
    bySubject[q.subject].total++
    if (q.type === 'choice') bySubject[q.subject].choice++
    else bySubject[q.subject].review++
  }

  // Progress counts per subject
  const progressBySubject = {}
  for (const q of questions) {
    if (progress[q.id]) {
      progressBySubject[q.subject] = (progressBySubject[q.subject] || 0) + 1
    }
  }

  // Storage size estimation
  const jsonSize = (obj) => new Blob([JSON.stringify(obj)]).size
  const questionsSize = jsonSize(questions)
  const progressSize = jsonSize(progress)
  const starredSize = jsonSize(starred)
  const totalSize = questionsSize + progressSize + starredSize

  return {
    totalQuestions: questions.length,
    totalProgress: Object.keys(progress).length,
    totalStarred: starred.length,
    bySubject,
    progressBySubject,
    storage: {
      questionsSize,
      progressSize,
      starredSize,
      totalSize,
    },
  }
}