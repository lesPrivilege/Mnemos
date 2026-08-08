import { useRef, useState } from 'react'
import { CheckIcon, AlertIcon } from './Icons'

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
 * @param {() => Promise<any>} onAction - 抛出即入 error 态；其 message 作缘由
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

  const run = async () => {
    if (state === 'pending') return
    clearTimeout(holdTimer.current)
    setState('pending')
    setCause(null)
    try {
      await onAction()
      setState('done')
      holdTimer.current = setTimeout(() => setState('idle'), HOLD_MS)
    } catch (err) {
      setCause(err?.message || null)
      setState('error')
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
      {state === 'error' && cause && <span className="act-cause">{cause}</span>}
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
