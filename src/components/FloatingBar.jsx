// FloatingBar — fixed overlay action bar for detail screens.
// Renders children in a pill-shaped bar anchored to the bottom of the viewport.
export default function FloatingBar({ children }) {
  return (
    <div
      className="fixed left-3 right-3 z-30 flex flex-col gap-2"
      style={{
        bottom: 'max(12px, env(safe-area-inset-bottom))',
        padding: '12px 14px',
        borderRadius: 'var(--r-xl)',
        background: 'color-mix(in oklch, var(--bg-card) 85%, transparent)',
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
        border: '1px solid var(--border-soft)',
        boxShadow: 'var(--shadow-lg)',
      }}
    >
      {children}
    </div>
  )
}
