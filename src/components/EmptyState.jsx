export default function EmptyState({ title, hint, icon, centered = false, children }) {
  return (
    <div className={`empty${centered ? ' empty-centered' : ''}`}>
      {icon && <span className="ic" aria-hidden="true">{icon}</span>}
      <div className="msg">{title}</div>
      <div className="motto-zh">{hint}</div>
      {children}
    </div>
  )
}
