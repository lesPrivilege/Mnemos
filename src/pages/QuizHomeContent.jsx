import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { getSubjectStats, getSubjectList, getChapterList, loadLastSession, loadQuestions, loadProgress, deleteSubject, addQuestions, clearLastSession } from '../quiz/lib/storage'
import { isInWrongBook } from '../quiz/lib/quizEngine'
import { parseQuestionsJson } from '../quiz/lib/questionParser'
import { getSubjectDisplayName } from '../quiz/lib/subjectNames'
import { SUBJECT_HUE, SUBJECT_GLYPH } from '../quiz/lib/subjectMeta'
import { UploadIcon, SparkIcon, PlusIcon, PasteIcon } from '../components/Icons'
import { HeroSection } from '../components/HeroSection'
import EmptyState from '../components/EmptyState'

function getTimeAgo(ts) {
  const mins = Math.floor((Date.now() - ts) / 60000)
  if (mins < 1) return '刚刚'
  if (mins < 60) return `${mins}分钟前`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}小时前`
  const days = Math.floor(hours / 24)
  return `${days}天前`
}

function ContinueCard({ subjects, onDismiss }) {
  const session = loadLastSession()
  const navigate = useNavigate()
  if (!session) return null
  // Skip if the session's subject no longer exists (e.g. it was deleted)
  if (subjects && !subjects.includes(session.subject)) return null
  const ago = Math.floor((Date.now() - session.timestamp) / 60000)
  const timeStr = ago < 60 ? `${ago}分钟前` : ago < 1440 ? `${Math.floor(ago / 60)}小时前` : `${Math.floor(ago / 1440)}天前`

  return (
    <div className="deck group" onClick={() => navigate(session.route)}>
      <div className={`deck-spine h${SUBJECT_HUE[session.subject] || 0}`}>
        <span className="glyph">{SUBJECT_GLYPH[session.subject] || '继'}</span>
      </div>
      <div className="deck-meta">
        <div className="deck-name">
          {getSubjectDisplayName(session.subject)}
        </div>
        <div className="deck-stats">
          <span className="due">继续</span>
          <span className="dot">·</span>
          <span>{session.chapter || '上次练习'}</span>
          <span className="dot">·</span>
          <span>{timeStr}</span>
        </div>
      </div>
      <div className="deck-cta">
        <button onClick={(e) => { e.stopPropagation(); onDismiss?.() }}
          className="text-ink-3 hover:text-ink text-xs px-1">✕</button>
      </div>
    </div>
  )
}

function SubjectCard({ subject, onChange }) {
  const navigate = useNavigate()
  const stats = getSubjectStats(subject)
  const hue = SUBJECT_HUE[subject] || 0
  const glyph = SUBJECT_GLYPH[subject] || '学'
  const lastSession = loadLastSession()
  const isThisSubject = lastSession?.subject === subject
  const timeAgo = isThisSubject ? getTimeAgo(lastSession.timestamp) : null

  const typeCounts = { choice: 0, review: 0 }
  for (const ch of getChapterList(subject)) {
    typeCounts.choice += ch.choice
    typeCounts.review += ch.review
  }

  return (
    <div className="deck group" onClick={() => navigate(`/set/${subject}`)}>
      <div className={`deck-spine h${hue} mono`}>
        <span className="glyph">{glyph}</span>
      </div>
      <div className="deck-meta">
        <div className="deck-name">{getSubjectDisplayName(subject)}</div>
        <div className="deck-stats">
          {stats.wrong > 0 && <><span className="due">{stats.wrong}错</span><span className="dot">·</span></>}
          <span>{stats.total}题</span>
          {stats.done > 0 && <><span className="dot">·</span><span>{Math.round((stats.done / stats.total) * 100)}%</span></>}
          {timeAgo && <><span className="dot">·</span><span style={{ color: 'var(--accent)' }}>{timeAgo}</span></>}
        </div>
        <div style={{ display: 'flex', gap: 4, marginTop: 4 }}>
          {typeCounts.choice > 0 && (
            <span className="chip" style={{ fontSize: 10, padding: '2px 7px', pointerEvents: 'none' }}>
              选择 {typeCounts.choice}
            </span>
          )}
          {typeCounts.review > 0 && (
            <span className="chip" style={{ fontSize: 10, padding: '2px 7px', pointerEvents: 'none' }}>
              解答 {typeCounts.review}
            </span>
          )}
        </div>
      </div>
      <div className="deck-cta" style={{ gap: 6 }}>
        <button
          className="inline-flex items-center justify-center w-7 h-7 rounded-md text-ink-3 opacity-40 hover:opacity-100 hover:text-danger hover:bg-danger-soft transition-colors flex-shrink-0"
          onClick={(e) => {
            e.stopPropagation()
            if (confirm(`删除科目「${getSubjectDisplayName(subject)}」及其全部题目与进度？此操作不可撤销。`)) {
              deleteSubject(subject)
              onChange?.()
            }
          }}
          title="删除科目">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
            <path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13" />
          </svg>
        </button>
        {stats.total > 0 && (
          <button className="cta-pill" onClick={(e) => {
            e.stopPropagation()
            navigate(typeCounts.choice > 0 ? `/quiz/${subject}` : `/quiz-review/${subject}`)
          }}>
            练习<span className="arr">→</span>
          </button>
        )}
      </div>
    </div>
  )
}

const DAY_LABELS = ['日', '一', '二', '三', '四', '五', '六']

function getWeekStats() {
  const progress = loadProgress()
  const now = Math.floor(Date.now() / 1000)
  const weekAgo = now - 7 * 86400
  let doneThisWeek = 0
  let correctThisWeek = 0
  const dayCounts = Array(7).fill(0)

  for (const [qid, prog] of Object.entries(progress)) {
    if (!prog.last_attempt) continue
    const ts = prog.last_attempt
    if (ts >= weekAgo) {
      doneThisWeek++
      if (prog.status === 'correct') correctThisWeek++
      const dayIndex = new Date(ts * 1000).getDay()
      dayCounts[dayIndex]++
    }
  }

  const todayDow = new Date().getDay()
  const chart = DAY_LABELS.map((d, i) => ({
    d,
    n: dayCounts[i],
    today: i === todayDow,
  }))

  return {
    doneThisWeek,
    correctRate: doneThisWeek > 0 ? Math.round(correctThisWeek / doneThisWeek * 100) : 0,
    chart,
  }
}

export function QuizHomeContent() {
  const [subjects, setSubjects] = useState([])
  const [wrongCount, setWrongCount] = useState(0)
  const [totalQs, setTotalQs] = useState(0)
  const [weekStats, setWeekStats] = useState({ doneThisWeek: 0, correctRate: 0, chart: [] })
  const [showNewSubject, setShowNewSubject] = useState(false)
  const [newSubjectJson, setNewSubjectJson] = useState('')
  const isEmptyLibrary = subjects.length === 0

  const refresh = () => {
    setSubjects(getSubjectList())
    const progress = loadProgress()
    const questions = loadQuestions()
    setWrongCount(questions.filter(q => isInWrongBook(progress[q.id])).length)
    setTotalQs(questions.length)
    setWeekStats(getWeekStats())
  }

  useEffect(() => { refresh() }, [])

  const handleNewSubject = (e) => {
    e.preventDefault()
    if (!newSubjectJson.trim()) return
    try {
      const result = parseQuestionsJson(newSubjectJson)
      if (result.questions.length === 0) {
        alert('未识别到题目。请确认 JSON 格式是否正确。')
        return
      }
      const r = addQuestions(result.questions)
      alert(`导入完成！新增: ${r.added}，重复跳过: ${r.duplicates}`)
      setNewSubjectJson('')
      setShowNewSubject(false)
      refresh()
    } catch {
      alert('导入失败: JSON 格式错误')
    }
  }

  return (
    <div className="scr">
      {/* Hero */}
      <HeroSection
        label={isEmptyLibrary ? '准备 · READY' : '本周 · THIS WEEK'}
        right={isEmptyLibrary
          ? [{ icon: <UploadIcon size={14} />, text: '待导入' }]
          : [{ icon: <SparkIcon size={14} />, text: `正确率 ${weekStats.correctRate}%`, warn: true }]}
        metrics={isEmptyLibrary
          ? [
              { value: subjects.length, label: 'SETS', zhLabel: '题库', accent: true },
              { value: wrongCount, label: 'WRONG', zhLabel: '错题' },
              { value: totalQs, label: 'QUEST', zhLabel: '题目' },
            ]
          : [
              { value: wrongCount, label: 'WRONG', zhLabel: '错题', accent: true },
              { value: weekStats.doneThisWeek, label: 'DONE', zhLabel: '本周' },
              { value: totalQs, label: 'TOTAL', zhLabel: '总数' },
            ]}
        chartData={weekStats.chart.map(d => ({ count: d.n, isToday: d.today, label: d.d }))}
        chartColor="teal"
        to="/activity"
      />

      {/* Continue card */}
      <ContinueCard subjects={subjects} onDismiss={() => { clearLastSession(); refresh() }} />

      {/* Subject list header */}
      <div className="list-head">
        <div className="section-title" style={{ flex: 'none' }}>科目 · SUBJECTS</div>
        <span className="count">{subjects.length}</span>
      </div>

      {/* Subject list */}
      {subjects.length === 0 ? (
        <EmptyState
          icon={<PasteIcon size={48} />}
          title="暂无题库"
          hint="导入或新建题库即可开始"
        />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {subjects.map(s => (
            <SubjectCard key={s} subject={s} onChange={refresh} />
          ))}
        </div>
      )}

      {/* Bottom actions */}
      <div className="bottom-actions">
        {showNewSubject ? (
          <form onSubmit={handleNewSubject} className="col-span-2 flex flex-col gap-2">
            <textarea value={newSubjectJson} onChange={(e) => setNewSubjectJson(e.target.value)}
              placeholder='[&#10;  {"id":"...","type":"choice","subject":"...","chapter":"...","question":"...","options":["A.","B.","C.","D."],"answer":"C","explanation":"..."}&#10;]'
              className="w-full p-3 rounded-md border bg-bg-card text-ink font-mono text-xs outline-none focus:border-accent resize-none"
              style={{ borderColor: 'var(--border)', minHeight: 80 }} autoFocus />
            <div className="flex gap-2">
              <button type="button" onClick={() => { setShowNewSubject(false); setNewSubjectJson('') }}
                className="flex-1 py-2.5 rounded-md font-body text-sm border text-ink-2 active:scale-[0.97] transition-transform"
                style={{ borderColor: 'var(--border)' }}>取消</button>
              <button type="submit" disabled={!newSubjectJson.trim()}
                className="flex-1 py-2.5 rounded-md font-medium text-sm font-body bg-ink text-bg active:scale-[0.97] transition-transform disabled:opacity-40">
                导入
              </button>
            </div>
          </form>
        ) : (
          <>
            <Link to="/import?tab=json" className="btn btn-ghost">
              <UploadIcon size={16} /> 导入
            </Link>
            <button onClick={() => setShowNewSubject(true)} className="btn btn-primary">
              <PlusIcon size={16} /> 新建题库
            </button>
          </>
        )}
      </div>
    </div>
  )
}
