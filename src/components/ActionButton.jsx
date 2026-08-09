import { useEffect, useRef, useState } from 'react'
import { CheckIcon, AlertIcon } from './Icons'
import { announceAction } from './ActionNotice'

/**
 * ActionButton — 动作四态标准件（版4，记-31）
 *
 * idle → pending → done → idle，或 idle → pending → error。
 * 立此件之由：全应用动作皆瞬时跳变，用户按下後不知是否受理。
 * 取 loader-buttons 之纪律不取其装饰——其半数为 WebGL 摆件，入不了
 * 家讳6（弹簧不出手势域）与「静为常」。此处只留一条：**动作有态，
 * 态有缘由与下一步**。
 *
 * 判准三事（皆死校门二所管）：
 *   1. 只动 transform / opacity / 色变；不动 width、height（故 pending
 *      之标签与 idle 等长时不跳宽，长短不一时由调用方给 minWidth）。
 *   2. 循环用 --motion-loop（linear），驻留用 --motion-hold。
 *   3. error 之标签必是**下一步**（「重试导入」而非「导入失败」），
 *      缘由另由 `error` 文字出，与 notice 同规格（病2 不刊项）。
 *
 * 成之归属（记-32）：`done` 一态活不过关掉表单的那一下，故成功之信另托
 * ActionNotice——它挂在应用根上，卸载不及于它。`onAction` 之**返回值即确认语**；
 * 不返者退用 doneLabel。败则相反：缘由与重试钮同在此处，不外送。
 *
 * @param {() => Promise<string|void>} onAction - 抛出即入 error 态，其 message 作缘由；
 *                                                返回之字符串即报出去的确认语
 * @param {string} label      - idle 之标签
 * @param {string} pendingLabel
 * @param {string} doneLabel
 * @param {string} retryLabel - error 之标签，必为动词
 */
export function ActionButton({
  onAction, label, pendingLabel, doneLabel, retryLabel,
  variant = 'btn-primary', icon = null, disabled = false, className = '',
}) {
  const [state, setState] = useState('idle')
  const [cause, setCause] = useState(null)
  const holdTimer = useRef(null)
  /* 同步动作在一帧内跑完，`state` 尚未回到闭包便已再点一次——重复提交之闸
     须在 ref 上，不在 state 上（记-32）。 */
  const running = useRef(false)

  useEffect(() => () => clearTimeout(holdTimer.current), [])

  const run = async () => {
    if (running.current) return
    running.current = true
    clearTimeout(holdTimer.current)
    setState('pending')
    setCause(null)
    try {
      const notice = await onAction()
      announceAction(typeof notice === 'string' ? notice : (doneLabel ?? label))
      setState('done')
      holdTimer.current = setTimeout(() => setState('idle'), HOLD_MS)
    } catch (err) {
      setCause(err?.message || null)
      setState('error')
    } finally {
      running.current = false
    }
  }

  const face = {
    idle: { text: label, mark: icon },
    pending: { text: pendingLabel ?? label, mark: <span className="act-spin" aria-hidden="true" /> },
    done: { text: doneLabel ?? label, mark: <CheckIcon size={15} sw={2} /> },
    error: { text: retryLabel ?? label, mark: <AlertIcon size={15} /> },
  }[state]

  return (
    <>
      {state === 'error' && cause && <span className="act-cause" role="alert">{cause}</span>}
      <button
        type="button"
        onClick={run}
        disabled={disabled || state === 'pending'}
        aria-busy={state === 'pending'}
        className={`btn ${variant} ${state === 'idle' ? '' : `is-${state}`} ${className}`}
      >
        {face.mark}
        {face.text}
      </button>
    </>
  )
}

/* 完成态之驻留：够读完「已导入 42 张」，短于会让人以为没成功。
   不入底本——CSS 无消费者，那是 JS 计时不是 CSS 值（记-31）。 */
const HOLD_MS = 1600
