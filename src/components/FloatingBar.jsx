import { useLayoutEffect, useRef } from 'react'

// FloatingBar — fixed overlay action bar for detail screens.
// Reports its live block size to the owning shell so scroll content can clear
// the overlay even when Dynamic Type or translated labels make it taller.
export default function FloatingBar({ children, ...props }) {
  const barRef = useRef(null)

  useLayoutEffect(() => {
    const bar = barRef.current
    const shell = bar?.closest('.page-fill, .page-fixed')
    if (!bar || !shell) return undefined

    const reportBlockSize = () => {
      shell.style.setProperty('--floating-bar-block-size', `${Math.ceil(bar.getBoundingClientRect().height)}px`)
    }

    reportBlockSize()
    const observer = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(reportBlockSize)
    observer?.observe(bar)
    window.addEventListener('resize', reportBlockSize)

    return () => {
      observer?.disconnect()
      window.removeEventListener('resize', reportBlockSize)
      shell.style.removeProperty('--floating-bar-block-size')
    }
  }, [])

  return (
    <div ref={barRef} className="floating-bar" {...props}>
      {children}
    </div>
  )
}
