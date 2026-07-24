import { BackIcon } from './Icons'
import { useBackButton } from '../lib/useBackButton'
import { S } from '../lib/strings'

// 错误态之下一步（病2）：断链页保留顶栏与返回径，不留死端
export default function NotFoundPage({ title, hint, action }) {
  const { goBack } = useBackButton()
  return (
    <div className="page-fixed" style={{ background: 'var(--bg)' }}>
      <div className="topbar">
        <button className="tb-btn" onClick={() => goBack()} aria-label={S.common.back}>
          <BackIcon />
        </button>
      </div>
      <div className="page-scroll">
        <div className="empty">
          <div className="msg">{title}</div>
          {hint && <div className="motto-zh">{hint}</div>}
          <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
            {action && (
              <button className="btn btn-primary" onClick={action.onClick}>{action.label}</button>
            )}
            <button className="btn btn-ghost" onClick={() => goBack()}>
              {S.common.backAction}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
