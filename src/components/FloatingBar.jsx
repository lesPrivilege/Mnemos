// FloatingBar — fixed overlay action bar for detail screens.
// Renders children in a compact raised bar anchored to the app shell.
export default function FloatingBar({ children }) {
  return (
    <div
      className="fixed left-1/2 z-30 flex flex-col gap-2"
      style={{
        width: 'min(calc(100% - 24px), 456px)',
        transform: 'translateX(-50%)',
        bottom: 'max(12px, env(safe-area-inset-bottom))',
        padding: '12px 14px',
        borderRadius: 'var(--r-xl)',
        background: 'var(--surface-chrome-bg)',
        backdropFilter: 'var(--surface-chrome-blur)',
        WebkitBackdropFilter: 'var(--surface-chrome-blur)',
        border: '1px solid var(--border-soft)',
        boxShadow: 'none',
      }}
    >
      {children}
    </div>
  )
}
