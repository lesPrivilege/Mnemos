import { useParams, useNavigate } from 'react-router-dom'
import { useState, useEffect, useRef } from 'react'
import { getCollection, getDocumentsByCollection, addDocument, deleteDocument, deleteCollection, toggleCollectionPin } from '../lib/storage'
import { readFileAsDocument } from '../lib/importer'
import { BackIcon, UploadIcon, PlusIcon, TrashIcon, MoreIcon, PinIcon } from '../../components/Icons'
import { useBackButton } from '../../lib/useBackButton'
import NotFoundPage from '../../components/NotFoundPage'
import { useToast, Toast } from '../../components/Toast'
import { useConfirm, ConfirmSheet } from '../../components/ConfirmSheet'
import { S } from '../../lib/strings'
import { pressable } from '../../lib/a11y'
import { useOverlayFocus } from '../../lib/useOverlayFocus'

export default function CollectionDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { goBack } = useBackButton()
  const { toast, showToast } = useToast()
  const { confirmState, confirm } = useConfirm()
  const fileInputRef = useRef(null)

  const [col, setCol] = useState(null)
  const [docs, setDocs] = useState([])
  const [sortBy, setSortBy] = useState('recent')
  const [showNewDoc, setShowNewDoc] = useState(false)
  const [newDocTitle, setNewDocTitle] = useState('')
  const [newDocContent, setNewDocContent] = useState('')
  const [showMenu, setShowMenu] = useState(false)
  const menuTriggerRef = useRef(null)
  const menuRef = useRef(null)
  const [documentMutation, setDocumentMutation] = useState(null)
  const documentMutationRef = useRef(false)

  useOverlayFocus({
    open: showMenu,
    overlayRef: menuRef,
    triggerRef: menuTriggerRef,
    onEscape: () => setShowMenu(false),
  })

  const beginDocumentMutation = (next) => {
    if (documentMutationRef.current) return false
    documentMutationRef.current = true
    setDocumentMutation(next)
    return true
  }

  const endDocumentMutation = () => {
    documentMutationRef.current = false
    setDocumentMutation(null)
  }

  const refresh = () => {
    setCol(getCollection(id))
    setDocs(getDocumentsByCollection(id))
  }

  useEffect(() => { refresh() }, [id])

  // ── Continue doc ─────────────────────────────────────

  const continueDoc = docs.length > 0
    ? docs.reduce((best, d) => {
        const t = d.lastReadAt || d.createdAt
        const bestT = best.lastReadAt || best.createdAt
        return t > bestT ? d : best
      })
    : null

  // ── Sort ───────────────────────────────────────────

  const sorted = [...docs]
  if (sortBy === 'title') {
    sorted.sort((a, b) => a.title.localeCompare(b.title))
  } else if (sortBy === 'created') {
    sorted.sort((a, b) => b.createdAt.localeCompare(a.createdAt))
  } else {
    // recent: by lastReadAt descending (unread docs first via createdAt fallback)
    sorted.sort((a, b) => (b.lastReadAt || b.createdAt).localeCompare(a.lastReadAt || a.createdAt))
  }

  // ── Handlers ───────────────────────────────────────

  const handleFileImport = async (e) => {
    const input = e.target
    const file = e.target.files?.[0]
    if (!file) return
    if (!beginDocumentMutation({ type: 'import' })) {
      input.value = ''
      return
    }
    let parsed
    try {
      parsed = await readFileAsDocument(file)
    } catch {
      showToast(S.collectionDetail.importFailedToast)
      input.value = ''
      endDocumentMutation()
      return
    }
    try {
      await addDocument(id, parsed.title, parsed.content, parsed.format)
      refresh()
    } catch {
      showToast(S.collectionDetail.saveFailedToast)
    } finally {
      input.value = ''
      endDocumentMutation()
    }
  }

  const handleAddDocument = async (e) => {
    e.preventDefault()
    if (!newDocTitle.trim() || !newDocContent.trim() || !beginDocumentMutation({ type: 'add' })) return
    try {
      await addDocument(id, newDocTitle.trim(), newDocContent.trim(), 'md')
      setNewDocTitle('')
      setNewDocContent('')
      setShowNewDoc(false)
      refresh()
    } catch {
      showToast(S.collectionDetail.saveFailedToast)
    } finally {
      endDocumentMutation()
    }
  }

  const handleDeleteDocument = async (docId) => {
    if (!beginDocumentMutation({ type: 'delete', docId })) return
    try {
      const ok = await confirm({ title: S.collectionDetail.deleteDocTitle, message: S.collectionDetail.deleteDocMessage, confirmLabel: S.collectionDetail.confirmDelete })
      if (!ok) return
      await deleteDocument(docId)
      refresh()
    } catch {
      showToast(S.collectionDetail.deleteFailedToast)
    } finally {
      endDocumentMutation()
    }
  }

  const handleTogglePin = () => {
    setShowMenu(false)
    toggleCollectionPin(id)
    refresh()
  }

  const handleDeleteCollection = async () => {
    setShowMenu(false)
    const ok = await confirm({ title: S.collectionDetail.deleteCollectionTitle, message: S.collectionDetail.deleteCollectionMessage(col?.name), confirmLabel: S.collectionDetail.confirmDelete, returnFocus: menuTriggerRef.current })
    if (!ok) return
    deleteCollection(id)
    navigate('/?tab=reading')
  }

  // ── Not found ──────────────────────────────────────

  if (!col) {
    return <NotFoundPage title={S.collectionDetail.notFound} />
  }

  return (
    <div className="page-fill">
      {/* Topbar */}
      <header className="topbar" style={showMenu ? { zIndex: 50, pointerEvents: 'none' } : undefined}>
        <button onClick={goBack} className="tb-btn" inert={showMenu ? '' : undefined} aria-label={S.common.back}><BackIcon /></button>
        <h1 className="flex-1 font-zh text-xl font-medium text-ink truncate pl-1" aria-hidden={showMenu ? 'true' : undefined}>{col.name}</h1>
        <div className="tb-actions">
          <div className="relative">
            <button ref={menuTriggerRef} onClick={() => setShowMenu(o => !o)} className="tb-btn" inert={showMenu ? '' : undefined} aria-label={S.common.moreActions} aria-expanded={showMenu}>
              <MoreIcon />
            </button>
            {showMenu && (
              <>
                <div ref={menuRef} className="absolute right-0 top-9 z-20 min-w-[168px] rounded-md bg-bg-card border border-border-soft overflow-hidden"
                  role="group" aria-label={S.common.moreActions}
                  style={{ border: '1px solid var(--border-soft)', pointerEvents: 'auto' }}>
                  <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
                    <li><button onClick={handleTogglePin}
                      className="w-full flex items-center gap-2.5 px-3 py-2.5 text-left text-md font-body text-ink-2 hover:bg-bg-raised hover:text-ink transition-colors">
                      <PinIcon size={15} /> {col.pinned ? S.collectionDetail.unpinCollection : S.collectionDetail.pinCollection}
                    </button></li>
                    <li><button onClick={handleDeleteCollection}
                      className="w-full flex items-center gap-2.5 px-3 py-2.5 text-left text-md font-body text-danger hover:bg-bg-raised transition-colors">
                      <TrashIcon size={15} /> {S.collectionDetail.deleteCollection}
                    </button></li>
                  </ul>
                </div>
              </>
            )}
          </div>
        </div>
      </header>

      {showMenu && (
        <button tabIndex="-1" className="menu-backdrop fixed inset-0 z-40 cursor-default" onClick={() => setShowMenu(false)} aria-label={S.collectionDetail.closeMenu} />
      )}

      <main className="flex-1 overflow-y-auto" inert={showMenu ? '' : undefined}>
        {/* Stats */}
        <div style={{ padding: '14px 0 0' }}>
          <div className="dd-head">
            <div className="dd-meta">
              <span>{docs.length}{S.collectionDetail.docsCountSuffix}</span>
            </div>
          </div>
        </div>

        {/* Sort chips */}
        <div style={{ padding: '10px 0 0' }}>
          <div className="filters">
            {[{ key: 'recent', label: S.collectionDetail.recentSort }, { key: 'title', label: S.collectionDetail.titleSort }, { key: 'created', label: S.collectionDetail.createdSort }].map(s => (
              <button key={s.key} onClick={() => setSortBy(s.key)} className={`chip ${sortBy === s.key ? 'on' : ''}`} aria-pressed={sortBy === s.key}>
                {s.label}
              </button>
            ))}
          </div>
        </div>

        {/* Document list */}
        <div style={{ padding: '8px 0 24px' }}>
          {docs.length === 0 ? (
            <div className="empty">
              <div className="msg">{S.collectionDetail.emptyDocs}</div>
              <div className="motto-zh">{S.collectionDetail.emptyDocsHint}</div>
            </div>
          ) : (
            <div className="card-list">
              {sorted.map(doc => (
                <div key={doc.id} className="card-row group"
                  onClick={() => navigate(`/reading/doc/${doc.id}?col=${encodeURIComponent(id)}`)}
                  {...pressable(() => navigate(`/reading/doc/${doc.id}?col=${encodeURIComponent(id)}`))}>
                  <span className="dot-bullet" />
                  <span className="front" style={{ fontFamily: 'var(--font-ui)' }}>{doc.title}</span>
                  <span className="font-body text-2xs text-ink-3 shrink-0">
                    {documentMutation?.type === 'delete' && documentMutation.docId === doc.id
                      ? S.collectionDetail.deleting
                      : doc.format.toUpperCase()}
                  </span>
                  <button onClick={(e) => { e.stopPropagation(); handleDeleteDocument(doc.id) }}
                    disabled={Boolean(documentMutation)}
                    aria-busy={documentMutation?.type === 'delete' && documentMutation.docId === doc.id}
                    aria-label={S.collectionDetail.deleteDocAction(doc.title)}
                    className="hidden group-hover:inline-flex group-focus-within:inline-flex items-center justify-center w-6 h-6 rounded text-ink-3 hover:text-danger transition-colors">
                    <TrashIcon size={14} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* New document form */}
        {showNewDoc && (
          <div className="mx-[18px] mb-4 p-4 rounded-md border bg-bg-card flex flex-col gap-3"
            style={{ borderColor: 'var(--border-soft)' }}>
            <div className="font-zh text-2xs text-ink-3 tracking-wider">{S.collectionDetail.newDocHeading}</div>
            <input value={newDocTitle} onChange={e => setNewDocTitle(e.target.value)} disabled={Boolean(documentMutation)}
              placeholder={S.collectionDetail.docTitlePlaceholder} autoFocus
              className="w-full py-[9px] px-3 rounded-md border bg-bg text-ink font-zh text-md outline-none focus:border-accent"
              style={{ borderColor: 'var(--border)' }} />
            <textarea value={newDocContent} onChange={e => setNewDocContent(e.target.value)} disabled={Boolean(documentMutation)}
              placeholder={S.collectionDetail.docContentPlaceholder} rows={6}
              className="w-full p-3 rounded-md border bg-bg text-ink font-zh text-md outline-none focus:border-accent resize-none"
              style={{ borderColor: 'var(--border)' }} />
            <div className="flex gap-2 justify-end">
              <button type="button" onClick={() => setShowNewDoc(false)} disabled={Boolean(documentMutation)} className="btn btn-ghost">{S.collectionDetail.cancel}</button>
              <button onClick={handleAddDocument}
                disabled={Boolean(documentMutation) || !newDocTitle.trim() || !newDocContent.trim()}
                aria-busy={documentMutation?.type === 'add'}
                className="btn btn-primary disabled:opacity-40">
                {documentMutation?.type === 'add' ? S.collectionDetail.saving : S.collectionDetail.create}
              </button>
            </div>
          </div>
        )}
      </main>

      {/* Fixed bottom bar */}
      <div className="flex-shrink-0 px-[18px] pb-[14px] flex flex-col gap-2" inert={showMenu ? '' : undefined} style={{ background: 'var(--bg)' }}>
        <div className="dd-cta" style={{ margin: 0 }}>
          {continueDoc ? (
            <button className="dd-cta-main" onClick={() => navigate(`/reading/doc/${continueDoc.id}?col=${encodeURIComponent(id)}`)}>
              <div className="left">
                <span className="lead">{continueDoc.title}</span>
                <span className="sub">{S.collectionDetail.continueReadingSuffix}</span>
              </div>
              <span className="arr">→</span>
            </button>
          ) : (
            <div className="dd-cta-main" style={{ opacity: 0.5, cursor: 'default' }}>
              <div className="left">
                <span className="lead">{S.collectionDetail.emptyDocsLead}</span>
                <span className="sub">{S.collectionDetail.importFirstSuffix}</span>
              </div>
            </div>
          )}
        </div>
        <div className="dd-secondary" style={{ margin: 0 }}>
          <button onClick={() => fileInputRef.current?.click()} disabled={Boolean(documentMutation)}
            aria-busy={documentMutation?.type === 'import'} className="dd-action">
            <UploadIcon size={18} /><span className="lab">{documentMutation?.type === 'import' ? S.collectionDetail.importing : S.collectionDetail.importAction}</span>
          </button>
          <button onClick={() => setShowNewDoc(v => !v)} disabled={Boolean(documentMutation)} className="dd-action">
            <PlusIcon size={18} /><span className="lab">{S.collectionDetail.newAction}</span>
          </button>
        </div>
      </div>

      <input ref={fileInputRef} type="file" accept=".md,.tex,.txt" onChange={handleFileImport}
        disabled={Boolean(documentMutation)} className="hidden" />
      <Toast message={toast} />
      <ConfirmSheet state={confirmState} />
    </div>
  )
}
