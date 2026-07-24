export default function EmptyState({ title, hint }) {
  return (
    <div className="empty">
      <div className="msg">{title}</div>
      <div className="motto-zh">{hint}</div>
    </div>
  )
}
