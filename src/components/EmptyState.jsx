export default function EmptyState({ icon, title, hint }) {
  return (
    <div className="empty">
      <div className="empty-icon">{icon}</div>
      <div className="msg">{title}</div>
      <div className="motto-zh">{hint}</div>
    </div>
  )
}
