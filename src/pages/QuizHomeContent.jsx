import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  getSubjectStats, getSubjectList, loadLastSession,
  loadQuestions, loadProgress, addQuestions, clearLastSession,
} from '../quiz/lib/storage'
import { isInWrongBook } from '../quiz/lib/quizEngine'
import { parseQuestionsJson } from '../quiz/lib/questionParser'
import { getSubjectDisplayName } from '../quiz/lib/subjectNames'
import { UploadIcon, PlusIcon, ChevronRIcon, AlertIcon, XIcon } from '../components/Icons'
import { FocusHeader } from '../components/FocusHeader'
import { MasteryMeter } from '../components/MasteryMeter'
import { ActionButton } from '../components/ActionButton'
import EmptyState from '../components/EmptyState'
import { S } from '../lib/strings'

const Q = S.quizHome

function timeAgo(ts) {
  const mins = Math.floor((Date.now() - ts) / 60000)
  if (mins < 1) return Q.justNow
  if (mins < 60) return Q.minutesAgoSuffix(mins)
  const hours = Math.floor(mins / 60)
  if (hours < 24) return Q.hoursAgoSuffix(hours)
  return Q.daysAgoSuffix(Math.floor(hours / 24))
}

/**
 * 科目行——与卡组行同一行款（版3）：名、进度计、需人动手者几何、上次何时动过。
 * 旧行另挂「选择 N / 解答 N」两枚 chip 与一个行内「练习」钮：前者是同一事实
 * 的第二种说法（总数已在计内），後者与整行入口重复（判例八第三问）。皆删。
 */
function SubjectRow({ subject }) {
  const stats = getSubjectStats(subject)
  const last = loadLastSession()
  const ago = last?.subject === subject ? timeAgo(last.timestamp) : null
  const ratio = stats.total > 0 ? stats.done / stats.total : 0

  return (
    <Link to={`/set/${subject}`} className="deck">
      <span className="deck-glyph">{getSubjectDisplayName(subject).charAt(0)}</span>
      <span className="deck-meta">
        <span className="deck-name">{getSubjectDisplayName(subject)}</span>
        <MasteryMeter ratio={ratio} />
        <span className="deck-line">
          <span>{Q.progressLabel(stats.done, stats.total)}</span>
          {ago && <><span className="sep">·</span><span className="zh">{Q.practicedAgo(ago)}</span></>}
        </span>
      </span>
      <span className="deck-right">
        {stats.wrong > 0
          ? <span className="deck-due"><AlertIcon size={10} />{stats.wrong}</span>
          : <span className="deck-done">{Q.noWrong}</span>}
        <ChevronRIcon size={15} />
      </span>
    </Link>
  )
}

export function QuizHomeContent() {
  const [subjects, setSubjects] = useState([])
  const [wrongCount, setWrongCount] = useState(0)
  const [totalQs, setTotalQs] = useState(0)
  const [showNew, setShowNew] = useState(false)
  const [json, setJson] = useState('')
  const [session, setSession] = useState(null)
  const navigate = useNavigate()

  const refresh = () => {
    const list = getSubjectList()
    const progress = loadProgress()
    const questions = loadQuestions()
    setSubjects(list)
    setWrongCount(questions.filter((q) => isInWrongBook(progress[q.id])).length)
    setTotalQs(questions.length)
    const s = loadLastSession()
    setSession(s && list.includes(s.subject) ? s : null)
  }
  useEffect(refresh, [])

  const importJson = async () => {
    const result = parseQuestionsJson(json)
    if (result.questions.length === 0) throw new Error(Q.noQuestionsDetected)
    addQuestions(result.questions)
    setJson('')
    setShowNew(false)
    refresh()
  }

  const isEmpty = subjects.length === 0
  const firstSubject = subjects[0]

  /* 焦点：错题是这一屏唯一有「下一步」的数——错题清了才看总量。 */
  const hasWrong = wrongCount > 0
  const cta = hasWrong
    ? { to: '/wrong', label: Q.practiceWrongAction }
    : firstSubject
      ? { to: `/set/${firstSubject}`, label: Q.startPracticeAction }
      : null

  return (
    <div className="scr">
      <FocusHeader
        label={isEmpty ? Q.readyLabel : hasWrong ? Q.wrongLabel : Q.libraryLabel}
        value={isEmpty ? 0 : hasWrong ? wrongCount : totalQs}
        unit={isEmpty ? Q.emptyUnit : hasWrong ? Q.wrongUnit : Q.questionUnit}
        sub={!isEmpty && !hasWrong ? Q.allClearHint : null}
        cta={cta}
      />

      {session && (
        <div className="resume">
          <button className="resume-body" onClick={() => navigate(session.route)}>
            <span className="resume-name">{getSubjectDisplayName(session.subject)}</span>
            <span className="resume-meta">
              {Q.continuing}<span className="sep">·</span>
              {session.chapter || Q.lastPracticeFallback}
              <span className="sep">·</span>{timeAgo(session.timestamp)}
            </span>
          </button>
          <button className="resume-x" aria-label={Q.dismissContinue}
            onClick={() => { clearLastSession(); setSession(null) }}>
            <XIcon size={14} />
          </button>
        </div>
      )}

      <div className="list-head">
        <span className="t">{Q.subjectsHeading}<em>{subjects.length}</em></span>
        <Link to="/activity" className="list-link">{Q.activityLink}<ChevronRIcon size={12} /></Link>
      </div>

      {isEmpty ? (
        <EmptyState title={Q.emptySubjectsTitle} hint={Q.emptySubjectsHint} />
      ) : (
        <div className="rows">
          {subjects.map((s) => <SubjectRow key={s} subject={s} />)}
        </div>
      )}

      <div className="sub-actions">
        {showNew ? (
          <div className="new-subject">
            <textarea value={json} onChange={(e) => setJson(e.target.value)}
              placeholder={Q.jsonPlaceholder} autoFocus />
            <div className="new-subject-actions">
              <button type="button" className="btn btn-ghost"
                onClick={() => { setShowNew(false); setJson('') }}>{Q.cancel}</button>
              <ActionButton
                onAction={importJson}
                label={Q.importAction}
                pendingLabel={Q.importing}
                doneLabel={Q.imported}
                retryLabel={Q.importRetry}
                disabled={!json.trim()}
              />
            </div>
          </div>
        ) : (
          <>
            <Link to="/import?tab=json" className="btn btn-ghost">
              <UploadIcon size={15} />{Q.importAction}
            </Link>
            <button className="btn btn-ghost" onClick={() => setShowNew(true)}>
              <PlusIcon size={15} />{Q.newSubjectAction}
            </button>
          </>
        )}
      </div>
    </div>
  )
}
