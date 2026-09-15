const closeHandlers = []
export function registerOverlayClose(handler) {
  closeHandlers.push(handler)
  return () => { const index = closeHandlers.indexOf(handler); if (index >= 0) closeHandlers.splice(index, 1) }
}
export function closeTopOverlay() {
  const close = closeHandlers.at(-1)
  if (!close) return false
  close()
  return true
}
