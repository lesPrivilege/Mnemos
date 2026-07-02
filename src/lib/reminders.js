// Daily review reminder — local notifications with predicted due counts.
// Native-only: every entry point early-returns when !isNative().
import { LocalNotifications } from '@capacitor/local-notifications'
import { App } from '@capacitor/app'
import { isNative } from './platform'
import { loadData } from './storage'
import { isRecall } from './cardUtils'
import { formatLocalDate } from './dateUtils'
import { isInWrongBook } from '../quiz/lib/quizEngine'

const ENABLED_KEY = 'mnemos-reminder-enabled'
const TIME_KEY = 'mnemos-reminder-time'
const CHANNEL_ID = 'mnemos-reminders'
const NOTIF_IDS = { start: 9001, count: 7 } // 9001–9007

let _listener = null

export function isEnabled() {
  return localStorage.getItem(ENABLED_KEY) === 'true'
}

export function getReminderTime() {
  return localStorage.getItem(TIME_KEY) || '20:00'
}

export function setReminderTime(time) {
  localStorage.setItem(TIME_KEY, time)
}

/**
 * Request notification permission and enable reminders.
 * @returns {Promise<boolean>} whether permission was granted
 */
export async function enableReminders() {
  if (!isNative()) return false
  try {
    const perm = await LocalNotifications.checkPermissions()
    let granted = perm.display === 'granted'
    if (!granted) {
      const req = await LocalNotifications.requestPermissions()
      granted = req.display === 'granted'
    }
    if (!granted) return false
    localStorage.setItem(ENABLED_KEY, 'true')
    await resyncReminders()
    return true
  } catch {
    return false
  }
}

/**
 * Disable reminders and cancel all pending notifications.
 */
export async function disableReminders() {
  localStorage.setItem(ENABLED_KEY, 'false')
  if (!isNative()) return
  try { await cancelAll() } catch { /* silent */ }
}

/**
 * Cancel then reschedule the next 7 days of reminders.
 * Called on app launch and on resume.
 */
export async function resyncReminders() {
  if (!isNative()) return
  try {
    await cancelAll()
    if (!isEnabled()) return

    const perm = await LocalNotifications.checkPermissions()
    if (perm.display !== 'granted') return

    await ensureChannel()

    const time = getReminderTime()
    const [hh, mm] = time.split(':').map(Number)
    const now = new Date()
    const wrongBookSize = getWrongBookSize()
    const dueCounts = computeDueCounts()

    const notifications = []
    for (let i = 0; i < NOTIF_IDS.count; i++) {
      const day = new Date(now)
      day.setDate(day.getDate() + i)
      const dateStr = formatLocalDate(day)
      const count = dueCounts.get(dateStr) || 0
      if (count === 0) continue

      // Skip today's slot if the time already passed
      if (i === 0) {
        const slotTime = new Date(now)
        slotTime.setHours(hh, mm, 0, 0)
        if (now >= slotTime) continue
      }

      const scheduleAt = new Date(day)
      scheduleAt.setHours(hh, mm, 0, 0)

      let body = `${count} 张卡片待复习`
      if (wrongBookSize > 0) body += ` · 错题 ${wrongBookSize}`

      notifications.push({
        id: NOTIF_IDS.start + i,
        title: 'Mnemos · 今日复习',
        body,
        schedule: { at: scheduleAt },
        channelId: CHANNEL_ID,
        smallIcon: 'ic_stat_icon',
        largeIcon: 'ic_launcher',
      })
    }

    if (notifications.length > 0) {
      await LocalNotifications.schedule({ notifications })
    }
  } catch { /* silent */ }
}

// ── Internal helpers ──────────────────────────────────

async function cancelAll() {
  const ids = Array.from({ length: NOTIF_IDS.count }, (_, i) => ({
    id: NOTIF_IDS.start + i,
  }))
  try { await LocalNotifications.cancel({ notifications: ids }) } catch { /* silent */ }
}

async function ensureChannel() {
  try {
    await LocalNotifications.createChannel({
      id: CHANNEL_ID,
      name: '复习提醒',
      importance: 3,
      visibility: 1,
      vibration: true,
    })
  } catch { /* channel may already exist */ }
}

/**
 * Compute predicted flashcard due counts for the next 7 days.
 * Day D counts recall-type, non-suspended cards with dueDate <= D.
 * @returns {Map<string, number>} dateStr → count
 */
function computeDueCounts() {
  const data = loadData()
  const today = new Date()
  const counts = new Map()

  for (let i = 0; i < NOTIF_IDS.count; i++) {
    const day = new Date(today)
    day.setDate(day.getDate() + i)
    const dateStr = formatLocalDate(day)
    const count = data.cards.filter(c =>
      isRecall(c) && !c.suspended && c.dueDate <= dateStr
    ).length
    counts.set(dateStr, count)
  }
  return counts
}

function getWrongBookSize() {
  try {
    const raw = localStorage.getItem('examprep-progress')
    if (!raw) return 0
    const progress = JSON.parse(raw)
    return Object.values(progress).filter(p => isInWrongBook(p)).length
  } catch { return 0 }
}

/**
 * Wire into App.jsx: call once on mount (delayed) and on resume.
 * Returns a cleanup function to remove the app-state listener.
 */
export function initReminders() {
  if (!isNative()) return () => {}

  const delayed = setTimeout(() => { resyncReminders() }, 5000)

  const listener = App.addListener('appStateChange', ({ isActive }) => {
    if (isActive) resyncReminders()
  })

  _listener = listener
  return () => {
    clearTimeout(delayed)
    listener.then(l => l.remove()).catch(() => {})
  }
}
