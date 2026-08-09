import { useSyncExternalStore } from 'react'

/**
 * 动作确认 — 成之可感知与可宣布（记-32）
 *
 * 立此件之由：新建卡组、导入题库、新建集合三处，皆在 `onAction` 之内就把表单
 * 关掉，ActionButton 随之卸载——`done` 一态有其形而从未落地。同步动作更甚，
 * 连 pending 都来不及画。成功之信，遂只剩「列表里多了一行」这一件旁证，辅助
 * 技术无从得知。
 *
 * 故确认之寿命必须长于发起它的表单：它出于表单之外，挂在应用根上，一处而已。
 * 三处不各自打补丁（记号谱「动作四态」之外不另立记号）。
 *
 * 只司「成」。「败」留在按钮旁（`.act-cause`，role=alert）——那里尚有下一步可按，
 * 缘由须与重试钮同在。
 */

const HOLD_MS = 4000 // 够读完一句确认语；短于此，辅助技术尚未宣读完即消失

let message = null
let timer = null
const listeners = new Set()

function emit() {
  for (const listener of listeners) listener()
}

function subscribe(listener) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

function snapshot() {
  return message
}

/** 报一句确认语。空串或 null 即撤下当前确认。 */
export function announceAction(text) {
  message = text || null
  clearTimeout(timer)
  if (message) {
    timer = setTimeout(() => {
      message = null
      emit()
    }, HOLD_MS)
  }
  emit()
}

/**
 * 活区。空时仍留在 DOM 内——活区须先在、後变，方得宣读；故以 opacity 隐，
 * 不以 display:none 除（後者连同无障碍树一并摘掉）。
 */
export function ActionNotice() {
  const text = useSyncExternalStore(subscribe, snapshot, snapshot)
  return (
    <div className="toast act-notice" role="status" aria-live="polite" aria-atomic="true">
      {text}
    </div>
  )
}
