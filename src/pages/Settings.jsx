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
import { discardQuarantined, getQuarantinedRaw, listQuarantined } from '../lib/quarantine'
import { isNative } from '../lib/platform'
import { getAutoBackupConfig, setEnabled, runBackupNow } from '../lib/autoBackup'
import { isEnabled, getReminderTime, setReminderTime, enableReminders, disableReminders, resyncReminders } from '../lib/reminders'
import { seedDemoContent } from '../lib/demoContent'
import { useToast, Toast } from '../components/Toast'
import { useConfirm, ConfirmSheet } from '../components/ConfirmSheet'
import { S } from '../lib/strings'
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

function Switch({ checked, onChange, label }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      className="settings-switch"
      onClick={() => onChange(!checked)}
    />
  )
}

function formatBytes(bytes) {
  if (bytes < 1024) return `${bytes} B`
  return `${(bytes / 1024).toFixed(1)} KB`
}

function quarantineFilename(entry) {
  const safeKey = entry.key.replace(/[^a-z0-9._-]+/gi, '-')
  const date = entry.quarantinedAt ? entry.quarantinedAt.slice(0, 10) : localToday()
  return `mnemos-quarantine-${safeKey}-${date}.txt`
}

export default function Settings() {
  const navigate = useNavigate()
  const { goBack } = useBackButton()
  const { confirmState, confirm } = useConfirm()
  const [showConfirm, setShowConfirm] = useState(null)
  const [subjectConfirm, setSubjectConfirm] = useState(null)
  const [storageStats, setStorageStats] = useState(null)
  const [subjects, setSubjects] = useState([])
  const [quarantined, setQuarantined] = useState([])
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
    setQuarantined(listQuarantined())
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

  const handleExportQuarantined = (entry) => {
    const raw = getQuarantinedRaw(entry.key)
    if (raw == null) {
      showToast(S.settings.quarantineMissing)
      refresh()
      return
    }
    const blob = new Blob([raw], { type: 'text/plain;charset=utf-8' })
    downloadBlob(blob, quarantineFilename(entry))
  }

  const handleDiscardQuarantined = async (entry) => {
    const ok = await confirm({
      title: S.settings.discardQuarantineTitle,
      message: S.settings.discardQuarantineMessage(entry.key),
      confirmLabel: S.settings.confirmDiscard,
    })
    if (!ok) return
    discardQuarantined(entry.key)
    setQuarantined(listQuarantined())
    showToast(S.settings.quarantineDiscarded)
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
      navigate('/?tab=flashcard')
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
      navigate('/?tab=quiz')
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

  const handleSeedDemoContent = () => {
    const result = seedDemoContent()
    refresh()
    showToast(S.settings.demoContentAddedToast(result.total))
  }

  return (
    <div className="page-fill">
      {/* Topbar */}
      <header className="topbar">
        <button onClick={goBack} className="tb-btn">
          <BackIcon />
        </button>
        <h1 className="flex-1 font-zh text-[17px] font-medium text-ink pl-1">{S.settings.title}</h1>
      </header>

      <main className="flex-1 overflow-y-auto p-[18px] flex flex-col gap-4">
        {/* Appearance */}
        <div className="settings-card">
          <div className="lbl">{S.settings.appearanceHeading}</div>
          <div className="seg">
            <button onClick={() => setDark(false)} className={!dark ? 'on' : ''}>
              <SunIcon size={16} /> Light
            </button>
            <button onClick={() => setDark(true)} className={dark ? 'on' : ''}>
              <MoonIcon size={16} /> Dark
            </button>
          </div>
        </div>

        <section className="settings-card settings-module">
          <div className="lbl">{S.settings.demoContentHeading}</div>
          <ActionRow
            title={S.settings.demoContentTitle}
            detail={S.settings.demoContentDetail}
            action={S.settings.demoContentAction}
            tone="neutral"
            onClick={handleSeedDemoContent}
          />
        </section>

        {/* Recall module */}
        <section className="settings-card settings-module">
          <div className="lbl">{S.settings.recallHeading}</div>
          <div className="settings-metrics">
            <div><span>{flashcardStats?.length || 0}</span><em>{S.settings.decksLabel}</em></div>
            <div><span>{flashcardTotal}</span><em>{S.settings.cardsLabel}</em></div>
            <div><span style={{ color: 'var(--accent)' }}>{flashcardDue}</span><em>{S.settings.dueLabel}</em></div>
          </div>
          <div className="settings-field">
            <div>
              <span className="settings-field-title">{S.settings.dailyLimitTitle}</span>
              <span className="settings-field-hint">{S.settings.dailyLimitHint}</span>
            </div>
            <input type="number" value={dailyLimit} onChange={(e) => setDailyLimit(e.target.value)}
              placeholder={S.settings.dailyLimitPlaceholder} min="1"
              className="settings-field-input" />
          </div>
          <div className="settings-action-group">
            <div className="settings-action-group-title">{S.settings.dataGroupTitle}</div>
            <ActionRow
              title={S.settings.resetFlashcardProgressTitle}
              detail={S.settings.resetFlashcardProgressDetail}
              action={showConfirm === 'flashcard-progress' ? S.settings.confirmReset : S.settings.reset}
              confirm={showConfirm === 'flashcard-progress'}
              onClick={handleClearFlashcardProgress}
              disabled={!flashcardTotal}
            />
            <ActionRow
              title={S.settings.deleteAllFlashcardsTitle}
              detail={S.settings.deleteAllFlashcardsDetail}
              action={showConfirm === 'flashcards' ? S.settings.confirmDelete : S.settings.delete}
              confirm={showConfirm === 'flashcards'}
              onClick={handleClearFlashcards}
              disabled={!flashcardTotal}
            />
          </div>
          {(showConfirm === 'flashcard-progress' || showConfirm === 'flashcards') && (
            <div className="settings-confirm-note">
              {S.settings.flashcardModuleConfirmNote}
            </div>
          )}
        </section>

        {/* Reminder */}
        {isNative() && (
          <section className="settings-card settings-module">
            <div className="lbl">{S.settings.reminderHeading}</div>
            <div className="settings-action">
              <div className="settings-action-copy">
                <span className="settings-action-title">{S.settings.dailyReminderTitle}</span>
                <span className="settings-action-detail">{S.settings.dailyReminderDetail}</span>
              </div>
              <Switch checked={reminderOn} label={S.settings.dailyReminderTitle} onChange={async (next) => {
                if (!next) {
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
                    setReminderError(S.settings.notificationDenied)
                  }
                }
              }} />
            </div>
            {reminderOn && (
              <div className="settings-field">
                <div>
                  <span className="settings-field-title">{S.settings.reminderTimeTitle}</span>
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
                <span className="k">{S.settings.nextReminderLabel}</span>
                <span className="v">
                  {nextReminder.at.toLocaleDateString('zh-CN', { month: 'numeric', day: 'numeric' })}{' '}
                  {nextReminder.at.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}
                  {nextReminder.count > 0 && S.settings.reminderCountSuffix(nextReminder.count)}
                </span>
              </div>
            )}
            {reminderOn && !nextReminder && (
              <div className="kv-row">
                <span className="k">{S.settings.statusLabel}</span>
                <span className="v" style={{ color: 'var(--ink-3)' }}>{S.settings.noReminderScheduled}</span>
              </div>
            )}
          </section>
        )}

        {/* Practice module */}
        {storageStats && (
          <section className="settings-card settings-module">
            <div className="lbl">{S.settings.practiceHeading}</div>
            <div className="settings-metrics">
              <div><span>{storageStats.totalQuestions}</span><em>{S.settings.questionsLabel}</em></div>
              <div><span>{storageStats.totalProgress}</span><em>{S.settings.practicedLabel}</em></div>
              <div><span>{storageStats.totalStarred}</span><em>{S.settings.starredLabel}</em></div>
            </div>
            <div className="settings-action-group">
              <div className="settings-action-group-title">{S.settings.subjectsGroupTitle}</div>
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
                      <em>{subjStats ? S.settings.subjectTotalSuffix(subjStats.total) : ''}{progressCount > 0 && S.settings.subjectProgressSuffix(progressCount)}</em>
                    </div>
                    <div className="settings-subject-actions">
                      {progressCount > 0 && (
                        <button onClick={() => handleClearSubjectProgress(subject)}
                          className={`settings-action-btn warn ${subjectConfirm === `clear-${subject}` ? 'confirm' : ''}`}>
                          {subjectConfirm === `clear-${subject}` ? S.settings.confirmReset : S.settings.reset}
                        </button>
                      )}
                      <button onClick={() => handleDeleteSubject(subject)}
                        className={`settings-action-btn danger ${subjectConfirm === `delete-${subject}` ? 'confirm' : ''}`}>
                        {subjectConfirm === `delete-${subject}` ? S.settings.confirmDelete : S.settings.delete}
                      </button>
                    </div>
                  </div>
                )
              }) : (
                <div className="settings-empty-note">{S.settings.emptySubjectsNote}</div>
              )}
            </div>
            <div className="settings-action-group">
              <div className="settings-action-group-title">{S.settings.dataGroupTitle}</div>
              <ActionRow
                title={S.settings.resetPracticeProgressTitle}
                detail={S.settings.resetPracticeProgressDetail}
                action={showConfirm === 'progress' ? S.settings.confirmReset : S.settings.reset}
                confirm={showConfirm === 'progress'}
                onClick={handleClearProgress}
                disabled={!storageStats.totalProgress}
              />
              <ActionRow
                title={S.settings.deleteAllQuestionsTitle}
                detail={S.settings.deleteAllQuestionsDetail}
                action={showConfirm === 'questions' ? S.settings.confirmDelete : S.settings.delete}
                confirm={showConfirm === 'questions'}
                onClick={handleClearQuestions}
                disabled={!storageStats.totalQuestions}
              />
            </div>
            {subjectConfirm && (
              <div className="settings-confirm-note">
                {S.settings.subjectModuleConfirmNote}
              </div>
            )}
            {(showConfirm === 'progress' || showConfirm === 'questions') && (
              <div className="settings-confirm-note">
                {S.settings.practiceModuleConfirmNote}
              </div>
            )}
          </section>
        )}

        {/* Reading module */}
        {readingInfo && (
          <section className="settings-card settings-module">
            <div className="lbl">{S.settings.readingHeading}</div>
            <div className="settings-metrics">
              <div><span>{readingInfo.collections}</span><em>{S.settings.collectionsLabel}</em></div>
              <div><span>{readingInfo.documents}</span><em>{S.settings.documentsLabel}</em></div>
              <div><span>{readingInfo.totalMinutes}</span><em>{S.settings.minutesLabel}</em></div>
            </div>
            <div className="kv-row">
              <span className="k">{S.settings.highlightsLabel}</span>
              <span className="v">{readingInfo.highlights}</span>
            </div>
            <div className="kv-row">
              <span className="k">{S.settings.bookmarksLabel}</span>
              <span className="v">{readingInfo.bookmarks}</span>
            </div>
            {readingInfo.docsCompleted > 0 && (
              <div className="kv-row">
                <span className="k">{S.settings.finishedLabel}</span>
                <span className="v">{readingInfo.docsCompleted}</span>
              </div>
            )}
            <div className="settings-action-group">
              <div className="settings-action-group-title">{S.settings.dataGroupTitle}</div>
              <ActionRow
                title={S.settings.resetReadingStatsTitle}
                detail={S.settings.resetReadingStatsDetail}
                action={showConfirm === 'reading-stats' ? S.settings.confirmReset : S.settings.reset}
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
                title={S.settings.deleteAllReadingTitle}
                detail={S.settings.deleteAllReadingDetail}
                action={showConfirm === 'reading-all' ? S.settings.confirmDelete : S.settings.delete}
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
                {S.settings.readingModuleConfirmNote}
              </div>
            )}
          </section>
        )}

        {/* Data export */}
        <section className="settings-card settings-module">
          <div className="lbl">{S.settings.backupHeading}</div>
          <div className="settings-backup-list">
            <BackupButton primary onClick={handleExportAll}>{S.settings.fullBackup}</BackupButton>
            <BackupButton onClick={handleExportFlashcard}>{S.settings.exportFlashcardOnly}</BackupButton>
            <BackupButton onClick={handleExportQuiz}>{S.settings.exportQuizOnly}</BackupButton>
            <BackupButton onClick={handleExportReading}>{S.settings.exportReadingOnly}</BackupButton>
          </div>
          {autoBackup && (
            <div className="settings-action-group" style={{ marginTop: 12 }}>
              <div className="settings-action-group-title">{S.settings.autoBackupGroupTitle}</div>
              <div className="settings-action">
                <div className="settings-action-copy">
                  <span className="settings-action-title">{S.settings.dailyAutoBackupTitle}</span>
                  <span className="settings-action-detail">{S.settings.dailyAutoBackupDetail}</span>
                </div>
                <Switch checked={autoBackup.enabled} label={S.settings.dailyAutoBackupTitle} onChange={(next) => {
                  setEnabled(next)
                  setAutoBackup(prev => ({ ...prev, enabled: next }))
                }} />
              </div>
              {autoBackup.status && (
                <div className="kv-row">
                  <span className="k">{S.settings.lastBackupLabel}</span>
                  <span className="v" style={{ color: autoBackup.status.ok ? 'var(--good)' : 'var(--danger)' }}>
                    {new Date(autoBackup.status.at).toLocaleDateString('zh-CN', { month: 'numeric', day: 'numeric' })}{' '}
                    {new Date(autoBackup.status.at).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}
                    {' · '}{autoBackup.status.ok ? S.settings.backupOk : S.settings.backupFailed}
                  </span>
                </div>
              )}
              {autoBackup.status?.ok && (
                <div className="kv-row">
                  <span className="k">{S.settings.locationLabel}</span>
                  <span className="v font-mono text-[11px]">{autoBackup.status.dir}/Mnemos/</span>
                </div>
              )}
              {autoBackup.status && !autoBackup.status.ok && (
                <div className="font-zh text-xs" style={{ color: 'var(--danger)' }}>{autoBackup.status.error}</div>
              )}
              <ActionRow
                title={S.settings.backupNowTitle}
                detail={S.settings.backupNowDetail}
                action={S.settings.backupNowAction}
                tone="warn"
                onClick={async () => {
                  const result = await runBackupNow()
                  setAutoBackup(getAutoBackupConfig())
                  if (!result.ok) showToast(S.settings.backupNowFailedToast(result.error))
                  else showToast(S.settings.backupNowSuccessToast)
                }}
              />
            </div>
          )}
          <div className="settings-action-group" style={{ marginTop: 12 }}>
            <ActionRow
              title={S.settings.restoreBackupTitle}
              detail={S.settings.restoreBackupDetail}
              action={S.settings.restoreBackupAction}
              tone="warn"
              onClick={() => navigate('/import?tab=restore')}
            />
          </div>
          {quarantined.length > 0 && (
            <div className="settings-action-group settings-quarantine" style={{ marginTop: 12 }}>
              <div>
                <div className="settings-quarantine-title">{S.settings.quarantineDetectedTitle(quarantined.length)}</div>
                <div className="settings-quarantine-detail">
                  {S.settings.quarantineDetail}
                </div>
              </div>
              {quarantined.map((entry) => (
                <div key={entry.key} className="settings-quarantine-entry">
                  <div className="settings-quarantine-copy">
                    <span>{entry.key}</span>
                    <em>
                      {entry.quarantinedAt
                        ? new Date(entry.quarantinedAt).toLocaleString('zh-CN', {
                            month: 'numeric',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })
                        : S.settings.quarantineTimeUnknown}{' '}
                      · {formatBytes(entry.size)}
                    </em>
                  </div>
                  <div className="settings-quarantine-actions">
                    <button
                      type="button"
                      className="settings-action-btn warn"
                      onClick={() => handleExportQuarantined(entry)}
                    >
                      {S.settings.exportAction}
                    </button>
                    <button
                      type="button"
                      className="settings-action-btn danger"
                      onClick={() => handleDiscardQuarantined(entry)}
                    >
                      {S.settings.discardAction}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* About */}
        <div className="settings-card">
          <div className="lbl">{S.settings.aboutHeading}</div>
          <div className="flex flex-col items-center gap-2 py-3.5">
            <MnemosMark size={36} accent="var(--accent)" />
            <div className="font-display text-[26px] tracking-wide text-ink">Mnemos</div>
            <div className="font-body text-[10px] text-ink-3 tracking-[0.18em]">VERSION <span className="font-mono">{pkg.version}</span></div>
          </div>
          <div className="kv-row">
            <span className="k">{S.settings.intervalAlgorithmLabel}</span>
            <span className="v">SM-2</span>
          </div>
          <div className="kv-row">
            <span className="k">{S.settings.displayFontLabel}</span>
            <span className="v">{S.settings.displayFontValue}</span>
          </div>
        </div>
      </main>
      <Toast message={toast} />
      <ConfirmSheet state={confirmState} />
    </div>
  )
}
