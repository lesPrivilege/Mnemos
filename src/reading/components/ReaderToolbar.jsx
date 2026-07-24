// Reader toolbar — simplified: back + title only.
// All function buttons moved to the bottom bar.
import { BackIcon } from '../../components/Icons'

export default function ReaderToolbar({ title, showBars, onBack }) {
  return (
    <div className="topbar" style={{
      transition: 'opacity var(--motion-mid), transform var(--motion-mid)',
      opacity: showBars ? 1 : 0,
      transform: showBars ? 'translateY(0)' : 'translateY(-100%)',
      pointerEvents: showBars ? 'auto' : 'none',
      zIndex: 5,
    }}>
      <button onClick={onBack} className="tb-btn"><BackIcon /></button>
      <span className="tb-text" style={{ flex: 1, textAlign: 'center' }}>{title}</span>
      <div style={{ width: 32 }} />
    </div>
  )
}
