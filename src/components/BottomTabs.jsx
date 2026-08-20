import { useLayoutEffect, useRef } from 'react'
import { Link } from 'react-router-dom'

// Keep the no-ResizeObserver path deliberately generous. The live path below
// reports the border-box height, which already includes the safe-area padding
// and any Dynamic Type growth applied to the nav.
const FALLBACK_BLOCK_SIZE = 'calc(96px + env(safe-area-inset-bottom, 0px))'

function reportBlockSize(root, nav) {
  const height = Math.ceil(nav.getBoundingClientRect().height)
  root.style.setProperty(
    '--bottom-tabs-block-size',
    Number.isFinite(height) && height > 0 ? `${height}px` : FALLBACK_BLOCK_SIZE,
  )
}

export default function BottomTabs({ activeTab, tabs, visible = true }) {
  const navRef = useRef(null)

  useLayoutEffect(() => {
    const nav = navRef.current
    const root = nav?.ownerDocument.getElementById('root')

    if (!root || !visible) {
      root?.style.removeProperty('--bottom-tabs-block-size')
      return undefined
    }

    let active = true
    const update = () => {
      if (active) reportBlockSize(root, nav)
    }
    const observer = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(update)
    const visualViewport = window.visualViewport

    update()
    observer?.observe(nav)
    window.addEventListener('resize', update)
    visualViewport?.addEventListener('resize', update)

    return () => {
      active = false
      observer?.disconnect()
      window.removeEventListener('resize', update)
      visualViewport?.removeEventListener('resize', update)
      root.style.removeProperty('--bottom-tabs-block-size')
    }
  }, [visible])

  if (!visible) return null

  return (
    <nav ref={navRef} className="bottom-tabs" aria-label="主导航">
      <div className="bottom-tabs-row">
        {tabs.map((tab) => (
          <Link
            key={tab.key}
            to={tab.to}
            className={`bottom-tab ${activeTab === tab.key ? 'on' : ''}`}
            aria-current={activeTab === tab.key ? 'page' : undefined}
          >
            {tab.icon}
            <span>{tab.label}</span>
          </Link>
        ))}
      </div>
    </nav>
  )
}
