// Reader panels — TOC, highlights, bookmarks, settings
// Shared shell with slide-from-left animation
import { S } from '../../lib/strings'

export function TocPanel({ toc, onJump }) {
  return (
    <div className="reader-panel-inner">
      <div className="panel-header">{S.readerPanels.tocHeader}</div>
      {toc.length === 0 ? (
        <div className="panel-empty">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" style={{ color: 'var(--ink-4)', marginBottom: 8 }}>
            <path d="M3 7h18M3 12h12M3 17h6" />
          </svg>
          <div>{S.readerPanels.tocEmpty}</div>
        </div>
      ) : toc.map((item, i) => (
        <button key={i}
          onClick={() => onJump(item.id)}
          className="w-full text-left px-3 py-2 hover:bg-bg-raised transition-colors"
          style={{ paddingLeft: `${(item.level - 1) * 12 + 12}px` }}>
          <span className="font-zh text-[13px] text-ink truncate block">{item.text}</span>
        </button>
      ))}
    </div>
  )
}

export function HighlightsPanel({ highlights, onDelete }) {
  return (
    <div className="reader-panel-inner">
      <div className="panel-header">{S.readerPanels.highlightsHeader(highlights.length)}</div>
      {highlights.length === 0 ? (
        <div className="panel-empty">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" style={{ color: 'var(--ink-4)', marginBottom: 8 }}>
            <path d="M12 20h9M16.5 3.5a2.121 2.121 0 013 3L7 19l-4 1 1-4L16.5 3.5z" />
          </svg>
          <div>{S.readerPanels.highlightsEmpty}</div>
        </div>
      ) : highlights.map(h => (
        <div key={h.id} className="px-3 py-3 border-b group" style={{ borderColor: 'var(--border-soft)' }}>
          <div className="font-zh text-[13px] text-ink leading-relaxed"
            style={{ borderLeft: '3px solid var(--accent)', paddingLeft: 8 }}>
            {h.selectedText}
          </div>
          {h.note && <div className="font-zh text-[11px] text-ink-2 mt-2 italic">{h.note}</div>}
          <div className="flex items-center justify-between mt-2">
            <span className="font-mono text-[9px] text-ink-4">
              {new Date(h.createdAt).toLocaleDateString()}
            </span>
            <button onClick={() => onDelete(h.id)}
              className="text-[11px] text-ink-3 hover:text-danger px-1.5 py-0.5 rounded transition-colors">
              {S.readerPanels.delete}
            </button>
          </div>
        </div>
      ))}
    </div>
  )
}

export function BookmarksPanel({ bookmarks, onJump, onDelete, onAddBookmark, onExportHighlights, onGenerateFlashcards }) {
  const hasHighlights = onExportHighlights != null
  const canGenerateFlashcards = onGenerateFlashcards != null
  return (
    <div className="reader-panel-inner">
      <div className="panel-header">{S.readerPanels.bookmarksHeader(bookmarks.length)}</div>

      {/* Add bookmark button */}
      <button onClick={() => onAddBookmark?.()}
        className="w-full flex items-center gap-2 px-3 py-2.5 text-left text-[13px] font-body text-ink-2 hover:bg-bg-raised transition-colors border-b"
        style={{ borderColor: 'var(--border-soft)' }}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"><path d="M12 5v14M5 12h14" /></svg>
        {S.readerPanels.addBookmark}
      </button>

      {bookmarks.length === 0 ? (
        <div className="panel-empty">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" style={{ color: 'var(--ink-4)', marginBottom: 8 }}>
            <path d="M19 21l-7-5-7 5V5a2 2 0 012-2h10a2 2 0 012 2z" />
          </svg>
          <div>{S.readerPanels.bookmarksEmpty}</div>
        </div>
      ) : bookmarks.map(bm => (
        <div key={bm.id}
          className="px-3 py-2 hover:bg-bg-raised cursor-pointer flex items-center justify-between group"
          onClick={() => onJump(bm)}>
          <div className="flex-1 min-w-0">
            <div className="font-zh text-[13px] text-ink truncate">{bm.title}</div>
            <div className="font-mono text-[10px] text-ink-3">{bm.scrollPct}%</div>
          </div>
          <button onClick={(e) => { e.stopPropagation(); onDelete(bm.id) }}
            className="text-[11px] text-ink-3 hover:text-danger px-1.5 py-0.5 rounded transition-colors">
            {S.readerPanels.delete}
          </button>
        </div>
      ))}

      {/* Export highlights */}
      {(hasHighlights || canGenerateFlashcards) && (
        <div className="border-t" style={{ borderColor: 'var(--border-soft)', marginTop: 'auto' }}>
          {canGenerateFlashcards && (
            <button onClick={() => onGenerateFlashcards?.()}
              className="w-full flex items-center gap-2 px-3 py-2.5 text-left text-[13px] font-body text-ink-2 hover:bg-bg-raised transition-colors">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"><path d="M12 5v14M5 12h14" /></svg>
              {S.readerPanels.generateFlashcards}
            </button>
          )}
          {hasHighlights && (
            <button onClick={() => onExportHighlights?.()}
              className="w-full flex items-center gap-2 px-3 py-2.5 text-left text-[13px] font-body text-ink-2 hover:bg-bg-raised transition-colors">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"><path d="M12 4v12M6 10l6-6 6 6M4 20h16" /></svg>
              {S.readerPanels.exportHighlightsAction}
            </button>
          )}
        </div>
      )}
    </div>
  )
}

export function SettingsPanel({ settings, onUpdate }) {
  return (
    <div className="reader-panel-inner" style={{ left: 'auto', right: 0, width: 220, paddingTop: 52 }}>
      <div className="panel-header">{S.readerPanels.settingsHeader}</div>
      <SettingRow label={S.readerPanels.fontSizeLabel}>
        <button onClick={() => onUpdate({ fontSize: Math.max(14, settings.fontSize - 1) })}
          className="btn btn-ghost" style={{ padding: '4px 8px' }}>A-</button>
        <span className="font-mono text-xs text-ink w-8 text-center">{settings.fontSize}</span>
        <button onClick={() => onUpdate({ fontSize: Math.min(24, settings.fontSize + 1) })}
          className="btn btn-ghost" style={{ padding: '4px 8px' }}>A+</button>
      </SettingRow>
      <SettingRow label={S.readerPanels.lineHeightLabel}>
        <button onClick={() => onUpdate({ lineHeight: Math.max(1.4, +(settings.lineHeight - 0.1).toFixed(1)) })}
          className="btn btn-ghost" style={{ padding: '4px 8px' }}>-</button>
        <span className="font-mono text-xs text-ink w-8 text-center">{settings.lineHeight}</span>
        <button onClick={() => onUpdate({ lineHeight: Math.min(2.2, +(settings.lineHeight + 0.1).toFixed(1)) })}
          className="btn btn-ghost" style={{ padding: '4px 8px' }}>+</button>
      </SettingRow>
      <SettingRow label={S.readerPanels.marginsLabel}>
        <button onClick={() => onUpdate({ margins: Math.max(12, settings.margins - 4) })}
          className="btn btn-ghost" style={{ padding: '4px 8px' }}>-</button>
        <span className="font-mono text-xs text-ink w-8 text-center">{settings.margins}</span>
        <button onClick={() => onUpdate({ margins: Math.min(40, settings.margins + 4) })}
          className="btn btn-ghost" style={{ padding: '4px 8px' }}>+</button>
      </SettingRow>
    </div>
  )
}

function SettingRow({ label, children }) {
  return (
    <div className="flex items-center justify-between px-3 py-2">
      <span className="font-zh text-xs text-ink-3">{label}</span>
      <div className="flex items-center gap-2">{children}</div>
    </div>
  )
}
