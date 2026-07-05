import { useState, useRef, useMemo, useEffect } from 'react'
import { useNavigate, useSearchParams, useLocation, Link } from 'react-router-dom'
import { addQuestions, importData as importQuizData, mergeImportData as mergeQuizData, loadStarred, saveStarred, loadProgress, saveProgress } from '../quiz/lib/storage'
import { parseQuestionsJson, getQuestionsStats } from '../quiz/lib/questionParser'
import { getSubjectDisplayName } from '../quiz/lib/subjectNames'
import { addDeck, addCard, getDeck, getCards, getDecks, importData, mergeData, loadData } from '../lib/storage'
import { parseMdToCards } from '../lib/mdParser'
import { parseAnkiToCards } from '../lib/ankiParser'
import { getCollections, addCollection, addDocument } from '../reading/lib/storage'
import { importReadingData, mergeReadingData } from '../reading/lib/backup'
import { readFileAsDocument, ACCEPT as READING_ACCEPT } from '../reading/lib/importer'
import { BackIcon, UploadIcon, PasteIcon } from '../components/Icons'
import { useBackButton } from '../lib/useBackButton'
import { isNative } from '../lib/platform'
import { useToast, Toast } from '../components/Toast'
import { useConfirm, ConfirmSheet } from '../components/ConfirmSheet'
import { S } from '../lib/strings'

export default function Import() {
  const navigate = useNavigate()
  const { goBack } = useBackButton()
  const { toast, showToast } = useToast()
  const { confirmState, confirm } = useConfirm()
  const [searchParams] = useSearchParams()
  const fileInputRef = useRef(null)
  const mdTargetDeckId = searchParams.get('deckId')
  const mdTargetDeck = mdTargetDeckId ? getDeck(mdTargetDeckId) : null
  const [importTab, setImportTab] = useState(() => {
    const tab = searchParams.get('tab')
    if (tab === 'md') return 'md'
    if (tab === 'reading') return 'reading'
    if (tab === 'restore') return 'restore'
    return 'json'
  })
  const [dragging, setDragging] = useState(false)
  const location = useLocation()

  // Consume prefilled cards from router state (e.g. from wrong book or highlights)
  useEffect(() => {
    const prefill = location.state?.prefillCards
    if (Array.isArray(prefill) && prefill.length > 0) {
      const deckName = location.state?.prefillDeckName || ''
      setMdPreview({ cards: prefill, defaultName: deckName })
      setMdDeckName(deckName)
      // Clear router state so back/refresh doesn't re-trigger
      navigate(location.pathname + location.search, { replace: true, state: {} })
    }
  }, [])

  // Reset scroll when tab changes (#root is the scroll container)
  useEffect(() => {
    document.getElementById('root')?.scrollTo(0, 0)
  }, [importTab])

  // ---- Reading import state ----
  const [readingPreview, setReadingPreview] = useState(null)
  const [readingCollection, setReadingCollection] = useState('')
  const [readingCollections, setReadingCollections] = useState([])
  const [readingNewColName, setReadingNewColName] = useState('')

  // ---- JSON (quiz) state ----
  const [previewData, setPreviewData] = useState(null)
  const [errors, setErrors] = useState([])

  // ---- MD (flashcard) state ----
  const [pasteMd, setPasteMd] = useState('')
  const [mdPreview, setMdPreview] = useState(null)
  const [mdDeckName, setMdDeckName] = useState('')
  const [jsonPreviewData, setJsonPreviewData] = useState(null)
  const [fullBackupPreview, setFullBackupPreview] = useState(null)
  const [quizBackupData, setQuizBackupData] = useState(null)
  const [jsonMode, setJsonMode] = useState('merge')
  const [skipDup, setSkipDup] = useState(false)

  const dedup = useMemo(() => {
    if (!mdPreview) return { count: 0, filtered: [] }
    const trimmedName = mdDeckName.trim() || mdPreview.defaultName
    const decks = getDecks()
    const existingDeck = mdTargetDeck || decks.find(d => d.name === trimmedName)
    const existingCards = existingDeck ? getCards(existingDeck.id) : []
    if (existingCards.length === 0) return { count: 0, filtered: mdPreview.cards }
    const existingFronts = new Set(existingCards.map(c => c.front.trim()))
    const duplicates = mdPreview.cards.filter(c => existingFronts.has(c.front.trim()))
    return {
      count: duplicates.length,
      filtered: mdPreview.cards.filter(c => !existingFronts.has(c.front.trim()))
    }
  }, [mdPreview, mdDeckName])

  // ---- Import shape detection ----
  function detectImportKind(parsed) {
    if (Array.isArray(parsed)) return { kind: 'questions', data: parsed }
    if (!parsed || typeof parsed !== 'object') return { kind: 'unknown' }
    // Full backup: { version, flashcard, quiz, reading }
    if (parsed.version && parsed.flashcard) return { kind: 'full-backup', data: parsed }
    // Quiz backup: { questions, progress, starred }
    if (Array.isArray(parsed.questions)) return { kind: 'quiz-backup', data: parsed }
    // Flashcard backup: { decks, cards }
    if (Array.isArray(parsed.decks) && Array.isArray(parsed.cards)) return { kind: 'flashcard-backup', data: parsed }
    // Single question object
    if (parsed.question || parsed.type) return { kind: 'questions', data: [parsed] }
    return { kind: 'unknown' }
  }

  function routeJsonImport(jsonString) {
    let parsed
    try { parsed = JSON.parse(jsonString) } catch { showToast(S.import.jsonParseError); return }
    const { kind, data } = detectImportKind(parsed)
    switch (kind) {
      case 'questions': {
        try {
          const result = parseQuestionsJson(jsonString)
          setPreviewData(result.questions)
          setErrors(result.errors)
        } catch {
          setPreviewData(Array.isArray(data) ? data : [data])
          setErrors([])
        }
        break
      }
      case 'quiz-backup': {
        setPreviewData(data.questions)
        setQuizBackupData(data)
        setErrors([])
        break
      }
      case 'flashcard-backup': {
        setJsonPreviewData(data)
        setJsonMode('merge')
        break
      }
      case 'full-backup': {
        setFullBackupPreview(data)
        setJsonMode('merge')
        break
      }
      default:
        showToast(S.import.unrecognizedJsonFormat)
    }
  }

  const handleFileDrop = (file) => {
    const ext = file.name.split('.').pop().toLowerCase()
    // reading-compatible formats (including .md when on reading tab)
    if (importTab === 'reading' && ['md', 'tex', 'txt'].includes(ext)) {
      processReadingFile(file)
      return
    }
    const reader = new FileReader()
    reader.onload = (ev) => {
      if (ext === 'json') {
        routeJsonImport(ev.target.result)
      } else if (['md', 'txt', 'csv', 'tsv'].includes(ext)) {
        processMd(ev.target.result, file.name.replace(/\.\w+$/i, ''))
      }
    }
    reader.readAsText(file)
  }

  const handleDropzoneDragOver = (e) => { e.preventDefault(); setDragging(true) }
  const handleDropzoneDragLeave = () => setDragging(false)
  const handleDropzoneDrop = (e) => {
    e.preventDefault()
    setDragging(false)
    const file = e.dataTransfer.files?.[0]
    if (file) handleFileDrop(file)
  }

  const reset = () => {
    setPreviewData(null)
    setErrors([])
    setMdPreview(null)
    setMdDeckName('')
    setPasteMd('')
    setJsonPreviewData(null)
    setFullBackupPreview(null)
    setQuizBackupData(null)
    setJsonMode('merge')
    setSkipDup(false)
    setReadingPreview(null)
    setReadingCollection('')
    setReadingNewColName('')
  }

  // ---- JSON handlers ----
  const handleJsonFile = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => routeJsonImport(ev.target.result)
    reader.readAsText(file)
    e.target.value = ''
  }

  const handleConfirmJson = async () => {
    if (!previewData || previewData.length === 0) return
    if (quizBackupData) {
      if (jsonMode === 'replace') {
        const ok = await confirm({ title: S.import.replaceAllTitle, message: S.import.replaceAllQuizMessage, confirmLabel: S.import.confirmReplace })
        if (!ok) return
        importQuizData(JSON.stringify(quizBackupData))
        showToast(S.import.importedQuestionsCount(previewData.length))
      } else {
        // Quiz backup: import questions, merge progress and starred
        const result = addQuestions(previewData)
        if (quizBackupData.starred) {
          const existing = loadStarred()
          const newStarred = quizBackupData.starred.filter(id => !existing.includes(id))
          saveStarred([...existing, ...newStarred])
        }
        if (quizBackupData.progress) {
          const progress = loadProgress()
          let merged = 0
          for (const [id, prog] of Object.entries(quizBackupData.progress)) {
            if (!progress[id]) { progress[id] = prog; merged++ }
          }
          saveProgress(progress)
          showToast(S.import.importSummaryWithMerge(result.added, result.duplicates, merged))
        } else {
          showToast(S.import.importSummary(result.added, result.duplicates))
        }
      }
    } else {
      const result = addQuestions(previewData)
      showToast(S.import.importSummary(result.added, result.duplicates))
    }
    reset()
    navigate('/?tab=quiz')
  }

  // ---- MD handlers (flashcard) ----
  const handleMdFile = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      processMd(ev.target.result, file.name.replace(/\.\w+$/i, ''))
    }
    reader.readAsText(file)
    e.target.value = ''
  }

  const handlePasteSubmit = () => {
    if (!pasteMd.trim()) return
    processMd(pasteMd, 'Pasted Notes')
  }

  const processMd = (content, defaultName) => {
    // Content sniffing: Anki directives or tab-delimited → parseAnkiToCards, else MD
    const isAnki = /^#(separator|html|tags column|deck column|notetype column|columns)\s*:/mi.test(content) ||
      (content.split('\n').find(l => l.trim() !== '') || '').split('\t').length >= 2
    const parser = isAnki ? parseAnkiToCards : parseMdToCards
    const { cards, deckName } = parser(content, defaultName)
    if (cards.length === 0) {
      showToast(S.import.noCardsDetected)
      return
    }
    setMdPreview({ cards, defaultName: deckName || defaultName })
    setMdDeckName(mdTargetDeck?.name || deckName || defaultName)
  }

  const handleConfirmMd = () => {
    if (!mdPreview || mdPreview.cards.length === 0) return
    const name = mdDeckName.trim() || mdPreview.defaultName
    const cardsToImport = skipDup ? dedup.filtered : mdPreview.cards
    const deck = mdTargetDeck || addDeck(name)
    for (const card of cardsToImport) {
      addCard(deck.id, card.front, card.back, card.type, card.chapter, card.section)
    }
    showToast(S.import.importedDeckSummary(deck.name, cardsToImport.length, skipDup && dedup.count > 0 ? S.import.skippedDuplicatesSuffix(dedup.count) : ''))
    reset()
    navigate(mdTargetDeck ? `/deck/${mdTargetDeck.id}` : '/?tab=flashcard')
  }

  const handleConfirmJsonBackup = async () => {
    const isFull = !!fullBackupPreview
    const data = isFull ? fullBackupPreview : jsonPreviewData
    if (!data) return
    if (jsonMode === 'replace') {
      const ok = await confirm({ title: S.import.replaceAllTitle, message: S.import.replaceAllDataMessage, confirmLabel: S.import.confirmReplace })
      if (!ok) return
      if (isFull) {
        importData(data.flashcard)
        if (data.quiz) importQuizData(JSON.stringify(data.quiz))
        if (data.reading) await importReadingData(data.reading)
      } else {
        importData(data)
      }
    } else {
      if (isFull) {
        mergeData(data.flashcard)
        if (data.quiz) mergeQuizData(JSON.stringify(data.quiz))
        if (data.reading) await mergeReadingData(data.reading)
      } else {
        mergeData(data)
      }
    }
    reset()
    navigate('/?tab=flashcard')
  }

  // ---- Reading handlers ----
  const processReadingFile = async (file) => {
    try {
      const doc = await readFileAsDocument(file)
      setReadingPreview(doc)
      setReadingCollections(getCollections())
    } catch {
      showToast(S.import.importFailed)
    }
  }

  const handleReadingFile = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    await processReadingFile(file)
    e.target.value = ''
  }

  const handleReadingPaste = () => {
    if (!pasteMd.trim()) return
    const fakeFile = new File([pasteMd], 'pasted.md', { type: 'text/markdown' })
    processReadingFile(fakeFile)
  }

  const handleConfirmReading = () => {
    if (!readingPreview) return
    let colId = readingCollection

    // Create new collection if needed
    if (!colId) {
      if (readingNewColName.trim()) {
        const col = addCollection(readingNewColName.trim())
        colId = col.id
      } else {
        showToast(S.import.selectOrCreateCollection)
        return
      }
    }

    addDocument(colId, readingPreview.title, readingPreview.content, readingPreview.format)
    showToast(S.import.importedDocSummary(readingPreview.title, readingPreview.format.toUpperCase()))
    reset()
    navigate('/?tab=reading')
  }

  // ---- Preview mode: JSON quiz ----
  if (previewData) {
    const stats = getQuestionsStats(previewData)
    return (
      <div className="page-fill">
        <header className="topbar">
          <button onClick={reset} className="tb-btn">
            <BackIcon />
          </button>
          <h1 className="flex-1 font-zh text-[17px] font-medium text-ink pl-1">{quizBackupData ? S.import.quizBackupPreviewTitle : S.import.jsonImportPreviewTitle}</h1>
        </header>
        <main className="flex-1 overflow-y-auto p-[18px] flex flex-col gap-4">
          {quizBackupData && (
            <div className="settings-card">
              <div className="lbl">{S.import.importModeHeading}</div>
              <div className="seg">
                <button onClick={() => setJsonMode('merge')} className={jsonMode === 'merge' ? 'on' : ''}>{S.import.mergeData}</button>
                <button onClick={() => setJsonMode('replace')} className={jsonMode === 'replace' ? 'on' : ''}>{S.import.replaceAll}</button>
              </div>
              {jsonMode === 'replace' && (
                <div className="rounded-md p-3 font-zh text-xs leading-relaxed"
                  style={{ background: 'var(--danger-soft)', color: 'var(--danger)', border: '1px solid color-mix(in oklch, var(--danger) 25%, transparent)' }}>
                  {S.import.replaceAllQuizNote}
                </div>
              )}
            </div>
          )}
          <div className="settings-card">
            <div className="lbl">{S.import.questionBankStatsHeading}</div>
            <div className="kv-row"><span className="k">{S.import.totalQuestionsLabel}</span><span className="v">{stats.total}</span></div>
            {Object.entries(stats.byType).map(([type, count]) => (
              <div key={type} className="kv-row">
                <span className="k">{type === 'choice' ? S.import.choiceTypeLabel : S.import.essayTypeLabel}</span>
                <span className="v">{count}</span>
              </div>
            ))}
          </div>
          <div className="settings-card">
            <div className="lbl">{S.import.subjectDistributionHeading}</div>
            {Object.entries(stats.bySubject).map(([subject, count]) => (
              <div key={subject} className="kv-row">
                <span className="k">{getSubjectDisplayName(subject)}</span>
                <span className="v">{S.import.countSuffix(count)}</span>
              </div>
            ))}
          </div>
          {errors.length > 0 && (
            <div className="settings-card" style={{ borderColor: 'color-mix(in oklch, var(--warn) 30%, transparent)' }}>
              <div className="lbl" style={{ color: 'var(--warn)' }}>{S.import.warningHeading(errors.length)}</div>
              <div className="max-h-40 overflow-y-auto">
                {errors.slice(0, 10).map((err, i) => <div key={i} className="font-zh text-xs text-ink-2 py-1">{err}</div>)}
              </div>
            </div>
          )}
          <div className="grid grid-cols-2 gap-2">
            <button onClick={reset}
              className="btn btn-ghost btn-block">
              {S.import.cancel}
            </button>
            <button onClick={handleConfirmJson}
              className="btn btn-primary btn-block">
              {S.import.confirmImport}
            </button>
          </div>
        </main>
        <Toast message={toast} />
        <ConfirmSheet state={confirmState} />
      </div>
    )
  }

  // ---- Preview mode: JSON backup ----
  if (jsonPreviewData) {
    const currentData = loadData()
    const importedDecks = jsonPreviewData.decks.length
    const importedCards = jsonPreviewData.cards.length
    const currentDecks = currentData.decks.length
    const currentCards = currentData.cards.length

    return (
      <div className="page-fill">
        <header className="topbar">
          <button onClick={reset} className="tb-btn">
            <BackIcon />
          </button>
          <h1 className="flex-1 font-zh text-[17px] font-medium text-ink pl-1">{S.import.jsonImportPreviewTitle}</h1>
        </header>
        <main className="flex-1 overflow-y-auto p-[18px] flex flex-col gap-4">
          <div className="settings-card">
            <div className="lbl">{S.import.importModeHeading}</div>
            <div className="seg">
              <button onClick={() => setJsonMode('merge')} className={jsonMode === 'merge' ? 'on' : ''}>
                {S.import.mergeData}
              </button>
              <button onClick={() => setJsonMode('replace')} className={jsonMode === 'replace' ? 'on' : ''}>
                {S.import.replaceAll}
              </button>
            </div>
            <div className="kv-row">
              <span className="k">{S.import.currentDecksLabel}</span>
              <span className="v">{currentDecks}</span>
            </div>
            <div className="kv-row">
              <span className="k">{S.import.currentCardsLabel}</span>
              <span className="v">{currentCards}</span>
            </div>
            <div className="kv-row">
              <span className="k">{S.import.importedDecksLabel}</span>
              <span className="v" style={{ color: 'var(--accent)' }}>{importedDecks}</span>
            </div>
            <div className="kv-row">
              <span className="k">{S.import.importedCardsLabel}</span>
              <span className="v" style={{ color: 'var(--accent)', fontWeight: 600 }}>{importedCards}</span>
            </div>
            {jsonMode === 'replace' && (
              <div className="rounded-md p-3 font-zh text-xs leading-relaxed"
                style={{ background: 'var(--danger-soft)', color: 'var(--danger)', border: '1px solid color-mix(in oklch, var(--danger) 25%, transparent)' }}>
                {S.import.replaceAllDecksNote}
              </div>
            )}
          </div>
          <div className="grid grid-cols-2 gap-2">
            <button onClick={reset}
              className="btn btn-ghost btn-block">
              {S.import.cancel}
            </button>
            <button onClick={handleConfirmJsonBackup}
              className="btn btn-primary btn-block">
              {S.import.confirmImport}
            </button>
          </div>
        </main>
        <Toast message={toast} />
        <ConfirmSheet state={confirmState} />
      </div>
    )
  }

  // ---- Preview mode: Full backup ----
  if (fullBackupPreview) {
    const data = fullBackupPreview
    const fcDecks = data.flashcard?.decks?.length || 0
    const fcCards = data.flashcard?.cards?.length || 0
    const qCount = data.quiz?.questions?.length || 0
    const qProgress = data.quiz?.progress ? Object.keys(data.quiz.progress).length : 0
    const rDocs = data.reading?.['reading-documents']?.length || 0
    const rCols = data.reading?.['reading-collections']?.length || 0

    return (
      <div className="page-fill">
        <header className="topbar">
          <button onClick={reset} className="tb-btn"><BackIcon /></button>
          <h1 className="flex-1 font-zh text-[17px] font-medium text-ink pl-1">{S.import.fullBackupPreviewTitle}</h1>
        </header>
        <main className="flex-1 overflow-y-auto p-[18px] flex flex-col gap-4">
          <div className="settings-card">
            <div className="lbl">{S.import.importModeHeading}</div>
            <div className="seg">
              <button onClick={() => setJsonMode('merge')} className={jsonMode === 'merge' ? 'on' : ''}>{S.import.mergeData}</button>
              <button onClick={() => setJsonMode('replace')} className={jsonMode === 'replace' ? 'on' : ''}>{S.import.replaceAll}</button>
            </div>
            {jsonMode === 'replace' && (
              <div className="rounded-md p-3 font-zh text-xs leading-relaxed"
                style={{ background: 'var(--danger-soft)', color: 'var(--danger)', border: '1px solid color-mix(in oklch, var(--danger) 25%, transparent)' }}>
                {S.import.replaceAllFullNote}
              </div>
            )}
          </div>
          {fcDecks > 0 && (
            <div className="settings-card">
              <div className="lbl">{S.import.recallHeading}</div>
              <div className="kv-row"><span className="k">{S.import.decksLabel}</span><span className="v" style={{ color: 'var(--accent)' }}>{fcDecks}</span></div>
              <div className="kv-row"><span className="k">{S.import.cardsLabel}</span><span className="v" style={{ color: 'var(--accent)' }}>{fcCards}</span></div>
            </div>
          )}
          {qCount > 0 && (
            <div className="settings-card">
              <div className="lbl">{S.import.practiceHeading}</div>
              <div className="kv-row"><span className="k">{S.import.questionsLabel}</span><span className="v" style={{ color: 'var(--accent)' }}>{qCount}</span></div>
              {qProgress > 0 && <div className="kv-row"><span className="k">{S.import.progressLabel}</span><span className="v" style={{ color: 'var(--accent)' }}>{qProgress}</span></div>}
            </div>
          )}
          {rCols > 0 && (
            <div className="settings-card">
              <div className="lbl">{S.import.readingHeading}</div>
              <div className="kv-row"><span className="k">{S.import.collectionsLabel}</span><span className="v" style={{ color: 'var(--accent)' }}>{rCols}</span></div>
              <div className="kv-row"><span className="k">{S.import.documentsLabel}</span><span className="v" style={{ color: 'var(--accent)' }}>{rDocs}</span></div>
            </div>
          )}
          <div className="grid grid-cols-2 gap-2">
            <button onClick={reset} className="btn btn-ghost btn-block">{S.import.cancel}</button>
            <button onClick={handleConfirmJsonBackup} className="btn btn-primary btn-block">{S.import.confirmImport}</button>
          </div>
        </main>
      </div>
    )
  }

  // ---- Preview mode: MD ----
  if (mdPreview) {
    return (
      <div className="page-fill">
        <header className="topbar">
          <button onClick={reset} className="tb-btn">
            <BackIcon />
          </button>
          <h1 className="flex-1 font-zh text-[17px] font-medium text-ink pl-1">{S.import.mdPreviewTitle}</h1>
        </header>
        <main className="flex-1 overflow-y-auto p-[18px] flex flex-col gap-4">
          <div className="settings-card">
            <div className="lbl">{mdTargetDeck ? S.import.importToDeckLabel : S.import.deckNameLabel}</div>
            <input value={mdDeckName} onChange={(e) => setMdDeckName(e.target.value)}
              disabled={!!mdTargetDeck}
              className="w-full py-[9px] px-3 rounded-md border bg-bg text-ink font-zh text-sm outline-none focus:border-accent"
              style={{ borderColor: 'var(--border)', opacity: mdTargetDeck ? 0.72 : 1 }} />
            <div className="kv-row"><span className="k">{S.import.parsedCardsLabel}</span><span className="v">{mdPreview.cards.length}</span></div>
            {dedup.count > 0 && (
              <>
                <div className="kv-row"><span className="k">{S.import.duplicateCardsLabel}</span><span className="v" style={{ color: 'var(--warn)' }}>{dedup.count}</span></div>
                <div className="seg">
                  <button onClick={() => setSkipDup(true)} className={skipDup ? 'on' : ''}>{S.import.skipDuplicates}</button>
                  <button onClick={() => setSkipDup(false)} className={!skipDup ? 'on' : ''}>{S.import.importAll}</button>
                </div>
              </>
            )}
            <div className="kv-row"><span className="k">{S.import.willImportLabel}</span><span className="v" style={{ color: 'var(--accent)', fontWeight: 600 }}>{skipDup ? dedup.filtered.length : mdPreview.cards.length}</span></div>
          </div>
          <div className="settings-card">
            <div className="lbl">{S.import.cardPreviewHeading}</div>
            <div className="preview-list max-h-60 overflow-y-auto">
              {mdPreview.cards.slice(0, 10).map((card, i) => (
                <div key={i} className="it">
                  <span className="n">{String(i + 1).padStart(2, '0')}</span>
                  {card.front}
                </div>
              ))}
              {mdPreview.cards.length > 10 && (
                <div className="it" style={{ borderColor: 'var(--border)', color: 'var(--ink-3)', fontSize: 11 }}>
                  <span className="n">{S.import.ellipsis}</span>{S.import.andMoreCardsSuffix(mdPreview.cards.length - 10)}
                </div>
              )}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <button onClick={reset}
              className="btn btn-ghost btn-block">
              {S.import.cancel}
            </button>
            <button onClick={handleConfirmMd}
              className="btn btn-primary btn-block">
              {S.import.confirmImport}
            </button>
          </div>
        </main>
        <Toast message={toast} />
        <ConfirmSheet state={confirmState} />
      </div>
    )
  }

  // ---- Preview mode: Reading document ----
  if (readingPreview) {
    return (
      <div className="page-fill">
        <header className="topbar">
          <button onClick={reset} className="tb-btn"><BackIcon /></button>
          <h1 className="flex-1 font-zh text-[17px] font-medium text-ink pl-1">{S.import.readingDocPreviewTitle}</h1>
        </header>
        <main className="flex-1 overflow-y-auto p-[18px] flex flex-col gap-4">
          <div className="settings-card">
            <div className="lbl">{S.import.docInfoHeading}</div>
            <div className="kv-row"><span className="k">{S.import.titleLabel}</span><span className="v">{readingPreview.title}</span></div>
            <div className="kv-row"><span className="k">{S.import.formatLabel}</span><span className="v">{readingPreview.format.toUpperCase()}</span></div>
            <div className="kv-row"><span className="k">{S.import.sizeLabel}</span><span className="v">{S.import.sizeCharsSuffix(readingPreview.content.length)}</span></div>
          </div>

          <div className="settings-card">
            <div className="lbl">{S.import.importToCollectionHeading}</div>
            <select value={readingCollection} onChange={e => setReadingCollection(e.target.value)}
              className="w-full py-[9px] px-3 rounded-md border bg-bg text-ink font-zh text-sm outline-none focus:border-accent"
              style={{ borderColor: 'var(--border)' }}>
              <option value="">{S.import.selectCollectionPlaceholder}</option>
              {readingCollections.map(c => (
                <option key={c.id} value={c.id}>{c.icon} {c.name}</option>
              ))}
            </select>
            <div className="mt-2 flex items-center gap-2">
              <span className="font-zh text-[11px] text-ink-3">{S.import.orCreateNewLabel}</span>
              <input value={readingNewColName} onChange={e => setReadingNewColName(e.target.value)}
                placeholder={S.import.newCollectionNamePlaceholder}
                className="flex-1 py-[6px] px-2 rounded border bg-bg text-ink font-zh text-xs outline-none focus:border-accent"
                style={{ borderColor: 'var(--border)' }} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <button onClick={reset} className="btn btn-ghost btn-block">{S.import.cancel}</button>
            <button onClick={handleConfirmReading} className="btn btn-primary btn-block">{S.import.confirmImport}</button>
          </div>
        </main>
        <Toast message={toast} />
        <ConfirmSheet state={confirmState} />
      </div>
    )
  }

  // ---- Import mode ----
  return (
    <div className="page-fill">
      <header className="topbar">
        <button onClick={goBack} className="tb-btn">
          <BackIcon />
        </button>
        <h1 className="flex-1 font-zh text-[17px] font-medium text-ink pl-1">{S.import.pageTitle}</h1>
      </header>

      <main className="flex-1 overflow-y-auto p-[18px] flex flex-col gap-4">
        {/* Tab toggle */}
        <div className="seg">
          <button onClick={() => setImportTab('json')} className={importTab === 'json' ? 'on' : ''}>
            {S.import.quizTabLabel}
          </button>
          <button onClick={() => setImportTab('md')} className={importTab === 'md' ? 'on' : ''}>
            {S.import.mdTabLabel}
          </button>
          <button onClick={() => setImportTab('reading')} className={importTab === 'reading' ? 'on' : ''}>
            {S.import.readingTabLabel}
          </button>
        </div>

        {importTab === 'json' ? (
          <>
            <div className="settings-card">
              <div className="lbl">{S.import.quizImportHeading}</div>
              <div className="kv-row"><span className="k">{S.import.targetLabel}</span><span className="v">{S.import.quizTargetValue}</span></div>
              <div className="kv-row"><span className="k">{S.import.contentLabel}</span><span className="v">{S.import.quizContentValue}</span></div>
              <div className="kv-row"><span className="k">{S.import.afterImportLabel}</span><span className="v">{S.import.quizAfterImportValue}</span></div>
            </div>
            <div className="settings-card">
              <div className="lbl">{S.import.fileImportHeading}</div>
              <div onClick={() => fileInputRef.current?.click()}
                onDragOver={handleDropzoneDragOver} onDragLeave={handleDropzoneDragLeave} onDrop={handleDropzoneDrop}
                className={`dropzone ${dragging ? 'dragging' : ''}`}>
                <div className="icon"><UploadIcon size={18} /></div>
                <div className="label">{S.import.clickOrDropFile}</div>
                <div className="ext">.JSON</div>
              </div>
            </div>
            <div className="settings-card">
              <div className="lbl">{S.import.supportedFormatHeading}</div>
              <div className="kv-row"><span className="k">questions.json</span><span className="v">{S.import.questionBankFileLabel}</span></div>
              <div className="kv-row"><span className="k">{S.import.splitByChapterLabel}</span><span className="v">{S.import.jsonFileLabel}</span></div>
            </div>
            <div className="settings-card">
              <div className="lbl">{S.import.questionTypesHeading}</div>
              <div className="grid grid-cols-2 gap-2">
                <div className="text-center p-3 rounded-md" style={{ background: 'var(--bg-raised)' }}><div className="font-zh text-xs text-ink mt-1">{S.import.choiceLabel}</div></div>
                <div className="text-center p-3 rounded-md" style={{ background: 'var(--bg-raised)' }}><div className="font-zh text-xs text-ink mt-1">{S.import.essayLabel}</div></div>
              </div>
            </div>
            <input ref={fileInputRef} type="file" accept=".json" onChange={handleJsonFile} className="hidden" />
          </>
        ) : importTab === 'reading' ? (
          <>
            <div className="settings-card">
              <div className="lbl">{S.import.readingImportHeading}</div>
              <div className="kv-row"><span className="k">{S.import.targetLabel}</span><span className="v">{S.import.readingTargetValue}</span></div>
              <div className="kv-row"><span className="k">{S.import.contentLabel}</span><span className="v">{S.import.readingContentValue}</span></div>
              <div className="kv-row"><span className="k">{S.import.afterImportLabel}</span><span className="v">{S.import.readingAfterImportValue}</span></div>
            </div>
            <div className="settings-card">
              <div className="lbl">{S.import.fileImportHeading}</div>
              <div onClick={() => fileInputRef.current?.click()}
                onDragOver={handleDropzoneDragOver} onDragLeave={handleDropzoneDragLeave} onDrop={handleDropzoneDrop}
                className={`dropzone ${dragging ? 'dragging' : ''}`}>
                <div className="icon"><UploadIcon size={18} /></div>
                <div className="label">{S.import.clickOrDropFile}</div>
                <div className="ext">.MD · .TEX · .TXT</div>
              </div>
            </div>
            <div className="settings-card">
              <div className="lbl">{S.import.pasteContentHeading}</div>
              <textarea className="textarea" value={pasteMd} onChange={(e) => setPasteMd(e.target.value)}
                placeholder={S.import.pasteMarkdownPlaceholder} />
              <button onClick={handleReadingPaste} disabled={!pasteMd.trim()}
                className="inline-flex items-center justify-center gap-1.5 py-2.5 rounded-md font-body text-sm font-medium active:scale-[0.97] transition-transform disabled:opacity-40"
                style={{ background: 'var(--accent-soft)', color: 'var(--accent)', border: '1px solid var(--accent-line)' }}>
                <PasteIcon size={16} /> {S.import.previewDoc}
              </button>
            </div>
            <div className="settings-card">
              <div className="lbl">{S.import.supportedFormatHeading}</div>
              <div className="kv-row"><span className="k">Markdown</span><span className="v">.md</span></div>
              <div className="kv-row"><span className="k">LaTeX</span><span className="v">.tex</span></div>
              <div className="kv-row"><span className="k">{S.import.plainTextLabel}</span><span className="v">.txt</span></div>
            </div>
            <input ref={fileInputRef} type="file" accept={READING_ACCEPT} onChange={handleReadingFile} className="hidden" />
          </>
        ) : importTab === 'restore' ? (
          <>
            <div className="settings-card">
              <div className="lbl">{S.import.restoreImportHeading}</div>
              <div className="kv-row"><span className="k">{S.import.targetLabel}</span><span className="v">{S.import.restoreTargetValue}</span></div>
              <div className="kv-row"><span className="k">{S.import.sourceLabel}</span><span className="v">{S.import.restoreSourceValue}</span></div>
              <div className="kv-row"><span className="k">{S.import.modeLabel}</span><span className="v">{S.import.restoreModeValue}</span></div>
            </div>
            <div className="settings-card">
              <div className="lbl">{S.import.fileImportHeading}</div>
              <div onClick={() => fileInputRef.current?.click()}
                onDragOver={handleDropzoneDragOver} onDragLeave={handleDropzoneDragLeave} onDrop={handleDropzoneDrop}
                className={`dropzone ${dragging ? 'dragging' : ''}`}>
                <div className="icon"><UploadIcon size={18} /></div>
                <div className="label">{S.import.clickOrDropBackupFile}</div>
                <div className="ext">.JSON</div>
              </div>
            </div>
            <div className="settings-card">
              <div className="lbl">{S.import.supportedFormatHeading}</div>
              <div className="kv-row"><span className="k">{S.import.fullBackupLabel}</span><span className="v">{S.import.fullBackupFormatsValue}</span></div>
              <div className="kv-row"><span className="k">{S.import.flashcardOnlyLabel}</span><span className="v">{S.import.flashcardOnlyValue}</span></div>
              <div className="kv-row"><span className="k">{S.import.quizOnlyLabel}</span><span className="v">{S.import.quizOnlyValue}</span></div>
            </div>
            {isNative() && (
              <div className="text-[13px] text-ink-3 leading-relaxed font-zh text-center py-2 tracking-[0.04em]">
                {S.import.autoBackupLocationNote}
              </div>
            )}
            <input ref={fileInputRef} type="file" accept=".json" onChange={handleJsonFile} className="hidden" />
          </>
        ) : (
          <>
            <div className="settings-card">
              <div className="lbl">{S.import.flashcardImportHeading}</div>
              <div className="kv-row"><span className="k">{S.import.targetLabel}</span><span className="v">{S.import.flashcardTargetValue}</span></div>
              <div className="kv-row"><span className="k">{S.import.contentLabel}</span><span className="v">{S.import.flashcardContentValue}</span></div>
              <div className="kv-row"><span className="k">{S.import.afterImportLabel}</span><span className="v">{mdTargetDeck ? S.import.appendToDeckSuffix(mdTargetDeck.name) : S.import.generateNewDeck}</span></div>
            </div>
            <div className="settings-card">
              <div className="lbl">{S.import.fileImportHeading}</div>
              <div onClick={() => fileInputRef.current?.click()}
                onDragOver={handleDropzoneDragOver} onDragLeave={handleDropzoneDragLeave} onDrop={handleDropzoneDrop}
                className={`dropzone ${dragging ? 'dragging' : ''}`}>
                <div className="icon"><UploadIcon size={18} /></div>
                <div className="label">{S.import.clickOrDropFile}</div>
                <div className="ext">.MD · .TXT · .CSV</div>
              </div>
            </div>
            <div className="settings-card">
              <div className="lbl">{S.import.pasteContentHeading}</div>
              <textarea className="textarea" value={pasteMd} onChange={(e) => setPasteMd(e.target.value)}
                placeholder={S.import.pasteFlashcardPlaceholder} />
              <button onClick={handlePasteSubmit} disabled={!pasteMd.trim()}
                className="inline-flex items-center justify-center gap-1.5 py-2.5 rounded-md font-body text-sm font-medium active:scale-[0.97] transition-transform disabled:opacity-40"
                style={{ background: 'var(--accent-soft)', color: 'var(--accent)', border: '1px solid var(--accent-line)' }}>
                <PasteIcon size={16} /> {S.import.parseAndPreview}
              </button>
            </div>
            <div className="settings-card">
              <div className="lbl">{S.import.supportedFormatHeading}</div>
              <div className="kv-row"><span className="k">Markdown</span><span className="v">{S.import.markdownListLabel}</span></div>
              <div className="kv-row"><span className="k">{S.import.ankiExportLabel}</span><span className="v">{S.import.ankiExportFormatValue}</span></div>
              <div className="kv-row"><span className="k">{S.import.plainTextLabel}</span><span className="v">{S.import.plainTextFrontBackValue}</span></div>
            </div>
            <input ref={fileInputRef} type="file" accept=".md,.txt,.csv,.tsv" onChange={handleMdFile} className="hidden" />
          </>
        )}

        {importTab === 'md' && (
          <div className="text-[13px] text-ink-2 leading-relaxed font-zh text-center py-2 tracking-[0.04em]">
            {S.import.notSureHowToPrepare}<Link to="/prompt-guide" style={{ color: 'var(--accent)' }}>{S.import.viewCardGuideLink}</Link>
          </div>
        )}
        {importTab === 'reading' && (
          <div className="text-[13px] text-ink-3 leading-relaxed font-zh text-center py-2 tracking-[0.04em]">
            {S.import.manageInReadingNote}
          </div>
        )}

        {/* Restore entry — persistent at bottom */}
        <div onClick={() => setImportTab('restore')}
          className="flex items-center justify-between p-3.5 rounded-md border cursor-pointer hover:bg-bg-raised transition-colors mt-auto"
          style={{ borderColor: 'var(--border-soft)', background: 'var(--bg-card)' }}>
          <div>
            <span className="font-zh text-[13px] text-ink-2">{S.import.restoreEntryLabel}</span>
            <span className="font-zh text-[11px] text-ink-3 ml-2">{S.import.restoreEntryDetail}</span>
          </div>
          <span className="text-ink-3 text-sm">›</span>
        </div>
      </main>
      <Toast message={toast} />
      <ConfirmSheet state={confirmState} />
    </div>
  )
}
