import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  clearAllProgress, clearQuestions,
  deleteSubject, clearSubjectProgress, getStorageStats,
  getSubjectList, exportData as exportQuizData,
} from '../quiz/lib/storage'
import { getSubjectDisplayName } from '../quiz/lib/subjectNames'
import { SUBJECT_HUE } from '../quiz/lib/subjectMeta'
import {
  DAILY_LIMIT_KEY,
  clearAllFlashcardData,
  clearAllFlashcardProgress,
  exportData as exportFlashcardData,
} from '../lib/storage'
import { getAllDeckStats } from '../lib/scheduler'
import { localToday } from '../lib/dateUtils'
import { buildFullBackup } from '../lib/fullBackup'
import { exportReadingData, clearReadingStats, clearAllReadingData } from '../reading/lib/backup'
import { getCollections, getDocuments } from '../reading/lib/storage'
import { getAllHighlights } from '../reading/lib/highlights'
import { getAllBookmarks } from '../reading/lib/bookmarks'
import { getReadingStats } from '../reading/lib/stats'
import { BackIcon, SunIcon, MoonIcon, DownloadIcon, MnemosMark } from '../components/Icons'
import { useBackButton } from '../lib/useBackButton'
import { downloadBlob } from '../lib/utils'
import { isNative } from '../lib/platform'
import { getAutoBackupConfig, setEnabled, runBackupNow } from '../lib/autoBackup'
import { isEnabled, getReminderTime, setReminderTime, enableReminders, disableReminders, resyncReminders } from '../lib/reminders'
import { useToast, Toast } from '../components/Toast'
import pkg from '../../package.json'

function ActionRow({ title, detail, action, tone = 'danger', confirm, onClick, disabled }) {
  return (
    <div className="settings-action">
      <div className="settings-action-copy">
        <span className="settings-action-title">{title}</span>
        {detail && <span className="settings-action-detail">{detail}</span>}
      </div>
      <button
        type="button"
        onClick={onClick}
        disabled={disabled}
        className={`settings-action-btn ${tone} ${confirm ? 'confirm' : ''}`}
      >
        {action}
      </button>
    </div>
  )
}

function BackupButton({ primary, children, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={primary ? 'settings-backup-btn primary' : 'settings-backup-btn'}
    >
      <DownloadIcon size={16} />
      <span>{children}</span>
    </button>
  )
}

export default function Settings() {
  const navigate = useNavigate()
  const { goBack } = useBackButton()
  const [showConfirm, setShowConfirm] = useState(null)
  const [subjectConfirm, setSubjectConfirm] = useState(null)
  const [storageStats, setStorageStats] = useState(null)
  const [subjects, setSubjects] = useState([])
  const { toast, showToast } = useToast()
  const [autoBackup, setAutoBackup] = useState(() => isNative() ? getAutoBackupConfig() : null)
  const [reminderOn, setReminderOn] = useState(() => isNative() && isEnabled())
  const [reminderTime, setReminderTimeState] = useState(() => isNative() ? getReminderTime() : '20:00')
  const [reminderError, setReminderError] = useState(null)
  const [nextReminder, setNextReminder] = useState(null)

  const [dark, setDark] = useState(() => {
    const legacy = localStorage.getItem('mini-srs-theme')
    const current = localStorage.getItem('mnemos-theme')
    return current === 'dark' || (!current && legacy === 'dark') ||
      (!current && !legacy && window.matchMedia('(prefers-color-scheme: dark)').matches)
  })

  useEffect(() => {
    document.documentElement.classList.toggle('dark', dark)
    localStorage.setItem('mnemos-theme', dark ? 'dark' : 'light')
  }, [dark])

  // Flashcard state
  const [flashcardStats, setFlashcardStats] = useState(null)
  const [readingInfo, setReadingInfo] = useState(null)
  const [dailyLimit, setDailyLimit] = useState(() => {
    const v = localStorage.getItem(DAILY_LIMIT_KEY)
    return v ?? ''
  })

  useEffect(() => {
    if (dailyLimit === '' || dailyLimit === null) {
      localStorage.removeItem(DAILY_LIMIT_KEY)
    } else {
      localStorage.setItem(DAILY_LIMIT_KEY, dailyLimit)
    }
  }, [dailyLimit])

  const refreshReminderStatus = async () => {
    if (!isNative()) return
    try {
      const { LocalNotifications } = await import('@capacitor/local-notifications')
      const pending = await LocalNotifications.getPending()
      const notifs = pending.notifications || []
      if (notifs.length > 0) {
        const next = notifs.sort((a, b) => a.id - b.id)[0]
        const at = new Date(next.schedule?.at)
        const bodyMatch = next.body?.match(/(\d+)\s*张/)
        setNextReminder({ at, count: bodyMatch ? parseInt(bodyMatch[1]) : 0 })
      } else {
        setNextReminder(null)
      }
    } catch { setNextReminder(null) }
  }

  const refresh = () => {
    setStorageStats(getStorageStats())
    setSubjects(getSubjectList())
    setFlashcardStats(getAllDeckStats())
    if (isNative()) setAutoBackup(getAutoBackupConfig())
    const rStats = getReadingStats()
    setReadingInfo({
      collections: getCollections().length,
      documents: getDocuments().length,
      highlights: getAllHighlights().length,
      bookmarks: getAllBookmarks().length,
      totalMinutes: rStats.totalMinutes,
      docsCompleted: rStats.docsCompleted,
    })
    refreshReminderStatus()
  }

  useEffect(() => { refresh() }, [])

  const flashcardTotal = flashcardStats?.reduce((s, d) => s + d.totalCards, 0) || 0
  const flashcardDue = flashcardStats?.reduce((s, d) => s + d.dueCount, 0) || 0

  const handleExportFlashcard = () => {
    const json = exportFlashcardData()
    const blob = new Blob([json], { type: 'application/json' })
    downloadBlob(blob, `mnemos-backup-${localToday()}.json`)
  }

  const handleExportReading = async () => {
    const data = await exportReadingData()
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    downloadBlob(blob, `mnemos-reading-${localToday()}.json`)
  }

  const handleExportQuiz = () => {
    const json = exportQuizData()
    const blob = new Blob([json], { type: 'application/json' })
    downloadBlob(blob, `mnemos-quiz-${localToday()}.json`)
  }

  const handleExportAll = async () => {
    const merged = await buildFullBackup()
    const blob = new Blob([JSON.stringify(merged, null, 2)], { type: 'application/json' })
    downloadBlob(blob, `mnemos-full-backup-${localToday()}.json`)
  }

  const handleClearProgress = () => {
    if (showConfirm === 'progress') {
      clearAllProgress()
      setShowConfirm(null)
      refresh()
    } else {
      setShowConfirm('progress')
    }
  }

  const handleClearFlashcardProgress = () => {
    if (showConfirm === 'flashcard-progress') {
      clearAllFlashcardProgress()
      setShowConfirm(null)
      refresh()
    } else {
      setShowConfirm('flashcard-progress')
    }
  }

  const handleClearFlashcards = () => {
    if (showConfirm === 'flashcards') {
      clearAllFlashcardData()
      localStorage.removeItem(DAILY_LIMIT_KEY)
      setDailyLimit('')
      setShowConfirm(null)
      refresh()
      navigate('/')
    } else {
      setShowConfirm('flashcards')
    }
  }

  const handleClearQuestions = () => {
    if (showConfirm === 'questions') {
      clearQuestions()
      clearAllProgress()
      setShowConfirm(null)
      refresh()
      navigate('/')
    } else {
      setShowConfirm('questions')
    }
  }

  const handleDeleteSubject = (subject) => {
    if (subjectConfirm === `delete-${subject}`) {
      deleteSubject(subject)
      setSubjectConfirm(null)
      refresh()
    } else {
      setSubjectConfirm(`delete-${subject}`)
    }
  }

  const handleClearSubjectProgress = (subject) => {
    if (subjectConfirm === `clear-${subject}`) {
      clearSubjectProgress(subject)
      setSubjectConfirm(null)
      refresh()
    } else {
      setSubjectConfirm(`clear-${subject}`)
    }
  }

  return (
    <div className="page-fill">
      {/* Topbar */}
      <header className="topbar">
        <button onClick={goBack} className="tb-btn">
          <BackIcon />
        </button>
        <h1 className="flex-1 font-zh text-[17px] font-medium text-ink pl-1">设置</h1>
      </header>

      <main className="flex-1 overflow-y-auto p-[18px] flex flex-col gap-4">
        {/* Appearance */}
        <div className="settings-card">
          <div className="lbl">外观 · APPEARANCE</div>
          <div className="seg">
            <button onClick={() => setDark(false)} className={!dark ? 'on' : ''}>
              <SunIcon size={16} /> Light
            </button>
            <button onClick={() => setDark(true)} className={dark ? 'on' : ''}>
              <MoonIcon size={16} /> Dark
            </button>
          </div>
        </div>

        {/* Recall module */}
        <section className="settings-card settings-module">
          <div className="lbl">记忆 · RECALL</div>
          <div className="settings-metrics">
            <div><span>{flashcardStats?.length || 0}</span><em>卡组</em></div>
            <div><span>{flashcardTotal}</span><em>卡片</em></div>
            <div><span style={{ color: 'var(--accent)' }}>{flashcardDue}</span><em>待复习</em></div>
          </div>
          <div className="settings-field">
            <div>
              <span className="settings-field-title">每日上限</span>
              <span className="settings-field-hint">限定记忆卡当天复习数量</span>
            </div>
            <input type="number" value={dailyLimit} onChange={(e) => setDailyLimit(e.target.value)}
              placeholder="不限" min="1"
              className="settings-field-input" />
          </div>
          <div className="settings-action-group">
            <div className="settings-action-group-title">数据</div>
            <ActionRow
              title="重置记忆进度"
              detail="保留卡组、卡片和收藏，重新开始排程"
              action={showConfirm === 'flashcard-progress' ? '确认重置' : '重置'}
              confirm={showConfirm === 'flashcard-progress'}
              onClick={handleClearFlashcardProgress}
              disabled={!flashcardTotal}
            />
            <ActionRow
              title="删除全部记忆卡"
              detail="删除所有卡组和卡片"
              action={showConfirm === 'flashcards' ? '确认删除' : '删除'}
              confirm={showConfirm === 'flashcards'}
              onClick={handleClearFlashcards}
              disabled={!flashcardTotal}
            />
          </div>
          {(showConfirm === 'flashcard-progress' || showConfirm === 'flashcards') && (
            <div className="settings-confirm-note">
              此操作只影响记忆卡模块，请确认是否继续？
            </div>
          )}
        </section>

        {/* Reminder */}
        {isNative() && (
          <section className="settings-card settings-module">
            <div className="lbl">提醒 · REMINDER</div>
            <div className="settings-action">
              <div className="settings-action-copy">
                <span className="settings-action-title">每日复习提醒</span>
                <span className="settings-action-detail">有到期卡片时按时提醒</span>
              </div>
              <button type="button" onClick={async () => {
                if (reminderOn) {
                  await disableReminders()
                  setReminderOn(false)
                  setNextReminder(null)
                  setReminderError(null)
                } else {
                  setReminderError(null)
                  const ok = await enableReminders()
                  if (ok) {
                    setReminderOn(true)
                    refreshReminderStatus()
                  } else {
                    setReminderError('通知权限被拒绝，请在系统设置中开启')
                  }
                }
              }}
                className={`settings-action-btn ${reminderOn ? 'confirm' : ''}`}
                style={reminderOn ? { background: 'var(--accent)', color: '#fff', border: 'none' } : {}}>
                {reminderOn ? '开启' : '关闭'}
              </button>
            </div>
            {reminderOn && (
              <div className="settings-field">
                <div>
                  <span className="settings-field-title">提醒时间</span>
                </div>
                <input type="time" value={reminderTime}
                  onChange={async (e) => {
                    const t = e.target.value
                    setReminderTimeState(t)
                    setReminderTime(t)
                    await resyncReminders()
                    refreshReminderStatus()
                  }}
                  className="settings-field-input" />
              </div>
            )}
            {reminderError && (
              <div className="font-zh text-xs" style={{ color: 'var(--danger)' }}>{reminderError}</div>
            )}
            {reminderOn && nextReminder && (
              <div className="kv-row">
                <span className="k">下次提醒</span>
                <span className="v">
                  {nextReminder.at.toLocaleDateString('zh-CN', { month: 'numeric', day: 'numeric' })}{' '}
                  {nextReminder.at.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}
                  {nextReminder.count > 0 && ` · ${nextReminder.count} 张`}
                </span>
              </div>
            )}
            {reminderOn && !nextReminder && (
              <div className="kv-row">
                <span className="k">状态</span>
                <span className="v" style={{ color: 'var(--ink-3)' }}>暂无待复习卡片，未安排提醒</span>
              </div>
            )}
          </section>
        )}

        {/* Practice module */}
        {storageStats && (
          <section className="settings-card settings-module">
            <div className="lbl">练习 · PRACTICE</div>
            <div className="settings-metrics">
              <div><span>{storageStats.totalQuestions}</span><em>题目</em></div>
              <div><span>{storageStats.totalProgress}</span><em>已练习</em></div>
              <div><span>{storageStats.totalStarred}</span><em>收藏</em></div>
            </div>
            <div className="settings-action-group">
              <div className="settings-action-group-title">科目</div>
              {subjects.length > 0 ? subjects.map(subject => {
                const subjStats = storageStats?.bySubject[subject]
                const hue = SUBJECT_HUE[subject] || 0
                const progressCount = storageStats?.progressBySubject[subject] || 0

                return (
                  <div key={subject} className="settings-subject-row">
                    <div style={{
                      width: 4, height: 36, borderRadius: 2,
                      background: `oklch(60% 0.10 ${60 + hue * 55})`,
                      flexShrink: 0,
                    }} />
                    <div className="settings-subject-copy">
                      <span>{getSubjectDisplayName(subject)}</span>
                      <em>{subjStats ? `${subjStats.total}题` : ''}{progressCount > 0 && ` · ${progressCount}条进度`}</em>
                    </div>
                    <div className="settings-subject-actions">
                      {progressCount > 0 && (
                        <button onClick={() => handleClearSubjectProgress(subject)}
                          className={`settings-action-btn warn ${subjectConfirm === `clear-${subject}` ? 'confirm' : ''}`}>
                          {subjectConfirm === `clear-${subject}` ? '确认重置' : '重置'}
                        </button>
                      )}
                      <button onClick={() => handleDeleteSubject(subject)}
                        className={`settings-action-btn danger ${subjectConfirm === `delete-${subject}` ? 'confirm' : ''}`}>
                        {subjectConfirm === `delete-${subject}` ? '确认删除' : '删除'}
                      </button>
                    </div>
                  </div>
                )
              }) : (
                <div className="settings-empty-note">暂无题库</div>
              )}
            </div>
            <div className="settings-action-group">
              <div className="settings-action-group-title">数据</div>
              <ActionRow
                title="重置练习进度"
                detail="保留题库和收藏，只清空答题记录"
                action={showConfirm === 'progress' ? '确认重置' : '重置'}
                confirm={showConfirm === 'progress'}
                onClick={handleClearProgress}
                disabled={!storageStats.totalProgress}
              />
              <ActionRow
                title="删除全部题库"
                detail="删除所有题目、进度和继续练习记录"
                action={showConfirm === 'questions' ? '确认删除' : '删除'}
                confirm={showConfirm === 'questions'}
                onClick={handleClearQuestions}
                disabled={!storageStats.totalQuestions}
              />
            </div>
            {subjectConfirm && (
              <div className="settings-confirm-note">
                此操作只影响该科目，请确认是否继续？
              </div>
            )}
            {(showConfirm === 'progress' || showConfirm === 'questions') && (
              <div className="settings-confirm-note">
                此操作只影响练习模块，请确认是否继续？
              </div>
            )}
          </section>
        )}

        {/* Reading module */}
        {readingInfo && (
          <section className="settings-card settings-module">
            <div className="lbl">阅读 · READING</div>
            <div className="settings-metrics">
              <div><span>{readingInfo.collections}</span><em>文集</em></div>
              <div><span>{readingInfo.documents}</span><em>文档</em></div>
              <div><span>{readingInfo.totalMinutes}</span><em>分钟</em></div>
            </div>
            <div className="kv-row">
              <span className="k">高亮</span>
              <span className="v">{readingInfo.highlights}</span>
            </div>
            <div className="kv-row">
              <span className="k">书签</span>
              <span className="v">{readingInfo.bookmarks}</span>
            </div>
            {readingInfo.docsCompleted > 0 && (
              <div className="kv-row">
                <span className="k">读完</span>
                <span className="v">{readingInfo.docsCompleted}</span>
              </div>
            )}
            <div className="settings-action-group">
              <div className="settings-action-group-title">数据</div>
              <ActionRow
                title="重置阅读统计"
                detail="保留文集、文档、高亮和书签"
                action={showConfirm === 'reading-stats' ? '确认重置' : '重置'}
                confirm={showConfirm === 'reading-stats'}
                disabled={!readingInfo.totalMinutes && !readingInfo.docsCompleted}
                onClick={() => {
                  if (showConfirm === 'reading-stats') {
                    clearReadingStats()
                    setShowConfirm(null)
                    refresh()
                  } else {
                    setShowConfirm('reading-stats')
                  }
                }}
              />
              <ActionRow
                title="删除全部阅读数据"
                detail="删除文集、文档、高亮、书签和阅读设置"
                action={showConfirm === 'reading-all' ? '确认删除' : '删除'}
                confirm={showConfirm === 'reading-all'}
                disabled={!readingInfo.collections && !readingInfo.documents}
                onClick={() => {
                  if (showConfirm === 'reading-all') {
                    clearAllReadingData()
                    setShowConfirm(null)
                    refresh()
                  } else {
                    setShowConfirm('reading-all')
                  }
                }}
              />
            </div>
            {(showConfirm === 'reading-stats' || showConfirm === 'reading-all') && (
              <div className="settings-confirm-note">
                此操作只影响阅读模块，请确认是否继续？
              </div>
            )}
          </section>
        )}

        {/* Data export */}
        <section className="settings-card settings-module">
          <div className="lbl">备份 · BACKUP</div>
          <div className="settings-backup-list">
            <BackupButton primary onClick={handleExportAll}>完整备份</BackupButton>
            <BackupButton onClick={handleExportFlashcard}>仅导出记忆</BackupButton>
            <BackupButton onClick={handleExportQuiz}>仅导出练习</BackupButton>
            <BackupButton onClick={handleExportReading}>仅导出阅读</BackupButton>
          </div>
          {autoBackup && (
            <div className="settings-action-group" style={{ marginTop: 12 }}>
              <div className="settings-action-group-title">自动备份</div>
              <div className="settings-action">
                <div className="settings-action-copy">
                  <span className="settings-action-title">每日自动备份</span>
                  <span className="settings-action-detail">自动保存完整备份到设备存储</span>
                </div>
                <button type="button" onClick={() => {
                  setEnabled(!autoBackup.enabled)
                  setAutoBackup(prev => ({ ...prev, enabled: !prev.enabled }))
                }}
                  className={`settings-action-btn ${autoBackup.enabled ? 'confirm' : ''}`}
                  style={autoBackup.enabled ? { background: 'var(--accent)', color: '#fff', border: 'none' } : {}}>
                  {autoBackup.enabled ? '开启' : '关闭'}
                </button>
              </div>
              {autoBackup.status && (
                <div className="kv-row">
                  <span className="k">上次备份</span>
                  <span className="v" style={{ color: autoBackup.status.ok ? 'var(--good)' : 'var(--danger)' }}>
                    {new Date(autoBackup.status.at).toLocaleDateString('zh-CN', { month: 'numeric', day: 'numeric' })}{' '}
                    {new Date(autoBackup.status.at).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}
                    {' · '}{autoBackup.status.ok ? '成功' : '失败'}
                  </span>
                </div>
              )}
              {autoBackup.status?.ok && (
                <div className="kv-row">
                  <span className="k">位置</span>
                  <span className="v font-mono text-[11px]">{autoBackup.status.dir}/Mnemos/</span>
                </div>
              )}
              {autoBackup.status && !autoBackup.status.ok && (
                <div className="font-zh text-xs" style={{ color: 'var(--danger)' }}>{autoBackup.status.error}</div>
              )}
              <ActionRow
                title="立即备份"
                detail="跳过 20 小时间隔，马上备份"
                action="备份"
                tone="warn"
                onClick={async () => {
                  const result = await runBackupNow()
                  setAutoBackup(getAutoBackupConfig())
                  if (!result.ok) showToast(`备份失败: ${result.error}`)
                  else showToast('备份成功')
                }}
              />
            </div>
          )}
          <div className="settings-action-group" style={{ marginTop: 12 }}>
            <ActionRow
              title="恢复备份"
              detail="从备份文件恢复数据"
              action="恢复"
              tone="warn"
              onClick={() => navigate('/import?tab=restore')}
            />
          </div>
        </section>

        {/* About */}
        <div className="settings-card">
          <div className="lbl">关于 · ABOUT</div>
          <div className="flex flex-col items-center gap-2 py-3.5">
            <MnemosMark size={36} accent="var(--accent)" />
            <div className="font-display text-[26px] tracking-wide text-ink">Mnemos</div>
            <div className="font-mono text-[10px] text-ink-3 tracking-[0.18em]">VERSION {pkg.version}</div>
          </div>
          <div className="kv-row">
            <span className="k">间隔算法</span>
            <span className="v">SM-2</span>
          </div>
          <div className="kv-row">
            <span className="k">显示字体</span>
            <span className="v">Instrument · Noto Serif SC</span>
          </div>
        </div>
      </main>
      <Toast message={toast} />
    </div>
  )
}
