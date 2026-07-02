import { useState, useRef, useMemo, useEffect } from 'react'
import { useNavigate, useSearchParams, Link } from 'react-router-dom'
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
    try { parsed = JSON.parse(jsonString) } catch { showToast('导入失败: JSON 格式错误'); return }
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
        showToast('导入失败: 无法识别的 JSON 格式')
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
        const ok = await confirm({ title: '替换全部', message: '替换全部会覆盖当前所有练习数据，此操作不可撤销。', confirmLabel: '确认替换' })
        if (!ok) return
        importQuizData(JSON.stringify(quizBackupData))
        showToast(`导入完成！题目: ${previewData.length}`)
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
          showToast(`导入完成！新增: ${result.added}，重复跳过: ${result.duplicates}，合并进度: ${merged}`)
        } else {
          showToast(`导入完成！新增: ${result.added}，重复跳过: ${result.duplicates}`)
        }
      }
    } else {
      const result = addQuestions(previewData)
      showToast(`导入完成！新增: ${result.added}，重复跳过: ${result.duplicates}`)
    }
    reset()
    navigate('/')
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
      showToast('未识别到卡片。支持 MD 列表、Anki 导出的 txt/csv，或纯文本按「正面换行背面」成组输入。')
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
    showToast(`导入完成！卡组: ${deck.name}，卡片: ${cardsToImport.length}${skipDup && dedup.count > 0 ? `，跳过重复: ${dedup.count}` : ''}`)
    reset()
    navigate(mdTargetDeck ? `/deck/${mdTargetDeck.id}` : '/')
  }

  const handleConfirmJsonBackup = async () => {
    const isFull = !!fullBackupPreview
    const data = isFull ? fullBackupPreview : jsonPreviewData
    if (!data) return
    if (jsonMode === 'replace') {
      const ok = await confirm({ title: '替换全部', message: '替换全部会覆盖当前所有数据，此操作不可撤销。', confirmLabel: '确认替换' })
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
    navigate('/')
  }

  // ---- Reading handlers ----
  const processReadingFile = async (file) => {
    try {
      const doc = await readFileAsDocument(file)
      setReadingPreview(doc)
      setReadingCollections(getCollections())
    } catch {
      showToast('导入失败')
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
        showToast('请选择或创建一个集合')
        return
      }
    }

    addDocument(colId, readingPreview.title, readingPreview.content, readingPreview.format)
    showToast(`导入完成！文档: ${readingPreview.title}，格式: ${readingPreview.format.toUpperCase()}`)
    reset()
    navigate('/reading')
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
          <h1 className="flex-1 font-zh text-[17px] font-medium text-ink pl-1">{quizBackupData ? '练习备份预览' : 'JSON 导入预览'}</h1>
        </header>
        <main className="flex-1 overflow-y-auto p-[18px] flex flex-col gap-4">
          {quizBackupData && (
            <div className="settings-card">
              <div className="lbl">导入方式</div>
              <div className="seg">
                <button onClick={() => setJsonMode('merge')} className={jsonMode === 'merge' ? 'on' : ''}>合并数据</button>
                <button onClick={() => setJsonMode('replace')} className={jsonMode === 'replace' ? 'on' : ''}>替换全部</button>
              </div>
              {jsonMode === 'replace' && (
                <div className="rounded-md p-3 font-zh text-xs leading-relaxed"
                  style={{ background: 'var(--danger-soft)', color: 'var(--danger)', border: '1px solid color-mix(in oklch, var(--danger) 25%, transparent)' }}>
                  替换全部会覆盖当前所有练习数据。确认导入前还会再次询问。
                </div>
              )}
            </div>
          )}
          <div className="settings-card">
            <div className="lbl">题库统计</div>
            <div className="kv-row"><span className="k">总题数</span><span className="v">{stats.total}</span></div>
            {Object.entries(stats.byType).map(([type, count]) => (
              <div key={type} className="kv-row">
                <span className="k">{type === 'choice' ? '选择' : '解答'}</span>
                <span className="v">{count}</span>
              </div>
            ))}
          </div>
          <div className="settings-card">
            <div className="lbl">科目分布</div>
            {Object.entries(stats.bySubject).map(([subject, count]) => (
              <div key={subject} className="kv-row">
                <span className="k">{getSubjectDisplayName(subject)}</span>
                <span className="v">{count} 题</span>
              </div>
            ))}
          </div>
          {errors.length > 0 && (
            <div className="settings-card" style={{ borderColor: 'color-mix(in oklch, var(--warn) 30%, transparent)' }}>
              <div className="lbl" style={{ color: 'var(--warn)' }}>警告 ({errors.length})</div>
              <div className="max-h-40 overflow-y-auto">
                {errors.slice(0, 10).map((err, i) => <div key={i} className="font-zh text-xs text-ink-2 py-1">{err}</div>)}
              </div>
            </div>
          )}
          <div className="grid grid-cols-2 gap-2">
            <button onClick={reset}
              className="btn btn-ghost btn-block">
              取消
            </button>
            <button onClick={handleConfirmJson}
              className="btn btn-primary btn-block">
              确认导入
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
          <h1 className="flex-1 font-zh text-[17px] font-medium text-ink pl-1">JSON 导入预览</h1>
        </header>
        <main className="flex-1 overflow-y-auto p-[18px] flex flex-col gap-4">
          <div className="settings-card">
            <div className="lbl">导入方式</div>
            <div className="seg">
              <button onClick={() => setJsonMode('merge')} className={jsonMode === 'merge' ? 'on' : ''}>
                合并数据
              </button>
              <button onClick={() => setJsonMode('replace')} className={jsonMode === 'replace' ? 'on' : ''}>
                替换全部
              </button>
            </div>
            <div className="kv-row">
              <span className="k">当前卡组</span>
              <span className="v">{currentDecks}</span>
            </div>
            <div className="kv-row">
              <span className="k">当前卡片</span>
              <span className="v">{currentCards}</span>
            </div>
            <div className="kv-row">
              <span className="k">导入卡组</span>
              <span className="v" style={{ color: 'var(--accent)' }}>{importedDecks}</span>
            </div>
            <div className="kv-row">
              <span className="k">导入卡片</span>
              <span className="v" style={{ color: 'var(--accent)', fontWeight: 600 }}>{importedCards}</span>
            </div>
            {jsonMode === 'replace' && (
              <div className="rounded-md p-3 font-zh text-xs leading-relaxed"
                style={{ background: 'var(--danger-soft)', color: 'var(--danger)', border: '1px solid color-mix(in oklch, var(--danger) 25%, transparent)' }}>
                替换全部会覆盖当前所有卡组和卡片。确认导入前还会再次询问。
              </div>
            )}
          </div>
          <div className="grid grid-cols-2 gap-2">
            <button onClick={reset}
              className="btn btn-ghost btn-block">
              取消
            </button>
            <button onClick={handleConfirmJsonBackup}
              className="btn btn-primary btn-block">
              确认导入
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
          <h1 className="flex-1 font-zh text-[17px] font-medium text-ink pl-1">完整备份预览</h1>
        </header>
        <main className="flex-1 overflow-y-auto p-[18px] flex flex-col gap-4">
          <div className="settings-card">
            <div className="lbl">导入方式</div>
            <div className="seg">
              <button onClick={() => setJsonMode('merge')} className={jsonMode === 'merge' ? 'on' : ''}>合并数据</button>
              <button onClick={() => setJsonMode('replace')} className={jsonMode === 'replace' ? 'on' : ''}>替换全部</button>
            </div>
            {jsonMode === 'replace' && (
              <div className="rounded-md p-3 font-zh text-xs leading-relaxed"
                style={{ background: 'var(--danger-soft)', color: 'var(--danger)', border: '1px solid color-mix(in oklch, var(--danger) 25%, transparent)' }}>
                替换全部会覆盖当前所有数据。确认导入前还会再次询问。
              </div>
            )}
          </div>
          {fcDecks > 0 && (
            <div className="settings-card">
              <div className="lbl">记忆 · RECALL</div>
              <div className="kv-row"><span className="k">卡组</span><span className="v" style={{ color: 'var(--accent)' }}>{fcDecks}</span></div>
              <div className="kv-row"><span className="k">卡片</span><span className="v" style={{ color: 'var(--accent)' }}>{fcCards}</span></div>
            </div>
          )}
          {qCount > 0 && (
            <div className="settings-card">
              <div className="lbl">练习 · PRACTICE</div>
              <div className="kv-row"><span className="k">题目</span><span className="v" style={{ color: 'var(--accent)' }}>{qCount}</span></div>
              {qProgress > 0 && <div className="kv-row"><span className="k">进度</span><span className="v" style={{ color: 'var(--accent)' }}>{qProgress}</span></div>}
            </div>
          )}
          {rCols > 0 && (
            <div className="settings-card">
              <div className="lbl">阅读 · READING</div>
              <div className="kv-row"><span className="k">文集</span><span className="v" style={{ color: 'var(--accent)' }}>{rCols}</span></div>
              <div className="kv-row"><span className="k">文档</span><span className="v" style={{ color: 'var(--accent)' }}>{rDocs}</span></div>
            </div>
          )}
          <div className="grid grid-cols-2 gap-2">
            <button onClick={reset} className="btn btn-ghost btn-block">取消</button>
            <button onClick={handleConfirmJsonBackup} className="btn btn-primary btn-block">确认导入</button>
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
          <h1 className="flex-1 font-zh text-[17px] font-medium text-ink pl-1">MD 导入预览</h1>
        </header>
        <main className="flex-1 overflow-y-auto p-[18px] flex flex-col gap-4">
          <div className="settings-card">
            <div className="lbl">{mdTargetDeck ? '导入到卡组' : '卡组名称'}</div>
            <input value={mdDeckName} onChange={(e) => setMdDeckName(e.target.value)}
              disabled={!!mdTargetDeck}
              className="w-full py-[9px] px-3 rounded-md border bg-bg text-ink font-zh text-sm outline-none focus:border-accent"
              style={{ borderColor: 'var(--border)', opacity: mdTargetDeck ? 0.72 : 1 }} />
            <div className="kv-row"><span className="k">解析卡片</span><span className="v">{mdPreview.cards.length}</span></div>
            {dedup.count > 0 && (
              <>
                <div className="kv-row"><span className="k">重复卡片</span><span className="v" style={{ color: 'var(--warn)' }}>{dedup.count}</span></div>
                <div className="seg">
                  <button onClick={() => setSkipDup(true)} className={skipDup ? 'on' : ''}>跳过重复</button>
                  <button onClick={() => setSkipDup(false)} className={!skipDup ? 'on' : ''}>全部导入</button>
                </div>
              </>
            )}
            <div className="kv-row"><span className="k">将导入</span><span className="v" style={{ color: 'var(--accent)', fontWeight: 600 }}>{skipDup ? dedup.filtered.length : mdPreview.cards.length}</span></div>
          </div>
          <div className="settings-card">
            <div className="lbl">卡片预览</div>
            <div className="preview-list max-h-60 overflow-y-auto">
              {mdPreview.cards.slice(0, 10).map((card, i) => (
                <div key={i} className="it">
                  <span className="n">{String(i + 1).padStart(2, '0')}</span>
                  {card.front}
                </div>
              ))}
              {mdPreview.cards.length > 10 && (
                <div className="it" style={{ borderColor: 'var(--border)', color: 'var(--ink-3)', fontFamily: 'var(--font-mono)', fontSize: 11 }}>
                  <span className="n">···</span>还有 {mdPreview.cards.length - 10} 张
                </div>
              )}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <button onClick={reset}
              className="btn btn-ghost btn-block">
              取消
            </button>
            <button onClick={handleConfirmMd}
              className="btn btn-primary btn-block">
              确认导入
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
          <h1 className="flex-1 font-zh text-[17px] font-medium text-ink pl-1">阅读文档预览</h1>
        </header>
        <main className="flex-1 overflow-y-auto p-[18px] flex flex-col gap-4">
          <div className="settings-card">
            <div className="lbl">文档信息</div>
            <div className="kv-row"><span className="k">标题</span><span className="v">{readingPreview.title}</span></div>
            <div className="kv-row"><span className="k">格式</span><span className="v">{readingPreview.format.toUpperCase()}</span></div>
            <div className="kv-row"><span className="k">大小</span><span className="v">{readingPreview.content.length} 字符</span></div>
          </div>

          <div className="settings-card">
            <div className="lbl">导入到集合</div>
            <select value={readingCollection} onChange={e => setReadingCollection(e.target.value)}
              className="w-full py-[9px] px-3 rounded-md border bg-bg text-ink font-zh text-sm outline-none focus:border-accent"
              style={{ borderColor: 'var(--border)' }}>
              <option value="">选择集合...</option>
              {readingCollections.map(c => (
                <option key={c.id} value={c.id}>{c.icon} {c.name}</option>
              ))}
            </select>
            <div className="mt-2 flex items-center gap-2">
              <span className="font-zh text-[11px] text-ink-3">或新建</span>
              <input value={readingNewColName} onChange={e => setReadingNewColName(e.target.value)}
                placeholder="新集合名称"
                className="flex-1 py-[6px] px-2 rounded border bg-bg text-ink font-zh text-xs outline-none focus:border-accent"
                style={{ borderColor: 'var(--border)' }} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <button onClick={reset} className="btn btn-ghost btn-block">取消</button>
            <button onClick={handleConfirmReading} className="btn btn-primary btn-block">确认导入</button>
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
        <h1 className="flex-1 font-zh text-[17px] font-medium text-ink pl-1">导入</h1>
      </header>

      <main className="flex-1 overflow-y-auto p-[18px] flex flex-col gap-4">
        {/* Tab toggle */}
        <div className="seg">
          <button onClick={() => setImportTab('json')} className={importTab === 'json' ? 'on' : ''}>
            做题 · JSON
          </button>
          <button onClick={() => setImportTab('md')} className={importTab === 'md' ? 'on' : ''}>
            闪卡 · MD
          </button>
          <button onClick={() => setImportTab('reading')} className={importTab === 'reading' ? 'on' : ''}>
            阅读 · DOC
          </button>
          <button onClick={() => setImportTab('restore')} className={importTab === 'restore' ? 'on' : ''}>
            恢复 · RESTORE
          </button>
        </div>

        {importTab === 'json' ? (
          <>
            <div className="settings-card">
              <div className="lbl">做题导入 · PRACTICE</div>
              <div className="kv-row"><span className="k">目标</span><span className="v">按科目与章节练习</span></div>
              <div className="kv-row"><span className="k">内容</span><span className="v">选择题 / 解答题</span></div>
              <div className="kv-row"><span className="k">导入后</span><span className="v">进入练习模块</span></div>
            </div>
            <div className="settings-card">
              <div className="lbl">文件导入 · FILE</div>
              <div onClick={() => fileInputRef.current?.click()}
                onDragOver={handleDropzoneDragOver} onDragLeave={handleDropzoneDragLeave} onDrop={handleDropzoneDrop}
                className={`dropzone ${dragging ? 'dragging' : ''}`}>
                <div className="icon"><UploadIcon size={18} /></div>
                <div className="label">点击选择 · 或拖入文件</div>
                <div className="ext">.JSON</div>
              </div>
            </div>
            <div className="settings-card">
              <div className="lbl">支持格式 · FORMAT</div>
              <div className="kv-row"><span className="k">questions.json</span><span className="v">题库文件</span></div>
              <div className="kv-row"><span className="k">按章节拆分</span><span className="v">JSON 文件</span></div>
            </div>
            <div className="settings-card">
              <div className="lbl">题目类型 · TYPES</div>
              <div className="grid grid-cols-2 gap-2">
                <div className="text-center p-3 rounded-md" style={{ background: 'var(--bg-raised)' }}><div className="font-zh text-xs text-ink mt-1">选择</div></div>
                <div className="text-center p-3 rounded-md" style={{ background: 'var(--bg-raised)' }}><div className="font-zh text-xs text-ink mt-1">解答</div></div>
              </div>
            </div>
            <input ref={fileInputRef} type="file" accept=".json" onChange={handleJsonFile} className="hidden" />
          </>
        ) : importTab === 'reading' ? (
          <>
            <div className="settings-card">
              <div className="lbl">阅读导入 · READING</div>
              <div className="kv-row"><span className="k">目标</span><span className="v">长文阅读与标注</span></div>
              <div className="kv-row"><span className="k">内容</span><span className="v">文档 / 讲义 / 笔记</span></div>
              <div className="kv-row"><span className="k">导入后</span><span className="v">放入阅读集合</span></div>
            </div>
            <div className="settings-card">
              <div className="lbl">文件导入 · FILE</div>
              <div onClick={() => fileInputRef.current?.click()}
                onDragOver={handleDropzoneDragOver} onDragLeave={handleDropzoneDragLeave} onDrop={handleDropzoneDrop}
                className={`dropzone ${dragging ? 'dragging' : ''}`}>
                <div className="icon"><UploadIcon size={18} /></div>
                <div className="label">点击选择 · 或拖入文件</div>
                <div className="ext">.MD · .TEX · .TXT</div>
              </div>
            </div>
            <div className="settings-card">
              <div className="lbl">粘贴内容</div>
              <textarea className="textarea" value={pasteMd} onChange={(e) => setPasteMd(e.target.value)}
                placeholder="直接粘贴 Markdown 内容" />
              <button onClick={handleReadingPaste} disabled={!pasteMd.trim()}
                className="inline-flex items-center justify-center gap-1.5 py-2.5 rounded-md font-body text-sm font-medium active:scale-[0.97] transition-transform disabled:opacity-40"
                style={{ background: 'var(--accent-soft)', color: 'var(--accent)', border: '1px solid var(--accent-line)' }}>
                <PasteIcon size={16} /> 预览文档
              </button>
            </div>
            <div className="settings-card">
              <div className="lbl">支持格式 · FORMAT</div>
              <div className="kv-row"><span className="k">Markdown</span><span className="v">.md</span></div>
              <div className="kv-row"><span className="k">LaTeX</span><span className="v">.tex</span></div>
              <div className="kv-row"><span className="k">纯文本</span><span className="v">.txt</span></div>
            </div>
            <input ref={fileInputRef} type="file" accept={READING_ACCEPT} onChange={handleReadingFile} className="hidden" />
          </>
        ) : importTab === 'restore' ? (
          <>
            <div className="settings-card">
              <div className="lbl">恢复备份 · RESTORE</div>
              <div className="kv-row"><span className="k">目标</span><span className="v">恢复完整备份 / 仅记忆 / 仅练习</span></div>
              <div className="kv-row"><span className="k">来源</span><span className="v">Settings 导出的备份文件</span></div>
              <div className="kv-row"><span className="k">模式</span><span className="v">合并数据 或 替换全部</span></div>
            </div>
            <div className="settings-card">
              <div className="lbl">文件导入 · FILE</div>
              <div onClick={() => fileInputRef.current?.click()}
                onDragOver={handleDropzoneDragOver} onDragLeave={handleDropzoneDragLeave} onDrop={handleDropzoneDrop}
                className={`dropzone ${dragging ? 'dragging' : ''}`}>
                <div className="icon"><UploadIcon size={18} /></div>
                <div className="label">点击选择 · 或拖入备份文件</div>
                <div className="ext">.JSON</div>
              </div>
            </div>
            <div className="settings-card">
              <div className="lbl">支持格式 · FORMAT</div>
              <div className="kv-row"><span className="k">完整备份</span><span className="v">记忆 + 练习 + 阅读</span></div>
              <div className="kv-row"><span className="k">仅记忆</span><span className="v">卡组和卡片</span></div>
              <div className="kv-row"><span className="k">仅练习</span><span className="v">题目、进度和收藏</span></div>
            </div>
            {isNative() && (
              <div className="text-[13px] text-ink-3 leading-relaxed font-zh text-center py-2 tracking-[0.04em]">
                自动备份文件位于 Documents/Mnemos/
              </div>
            )}
            <input ref={fileInputRef} type="file" accept=".json" onChange={handleJsonFile} className="hidden" />
          </>
        ) : (
          <>
            <div className="settings-card">
              <div className="lbl">闪卡导入 · RECALL</div>
              <div className="kv-row"><span className="k">目标</span><span className="v">间隔复习与主动回忆</span></div>
              <div className="kv-row"><span className="k">内容</span><span className="v">正面 / 背面卡片</span></div>
              <div className="kv-row"><span className="k">导入后</span><span className="v">{mdTargetDeck ? `追加到「${mdTargetDeck.name}」` : '生成卡组'}</span></div>
            </div>
            <div className="settings-card">
              <div className="lbl">文件导入 · FILE</div>
              <div onClick={() => fileInputRef.current?.click()}
                onDragOver={handleDropzoneDragOver} onDragLeave={handleDropzoneDragLeave} onDrop={handleDropzoneDrop}
                className={`dropzone ${dragging ? 'dragging' : ''}`}>
                <div className="icon"><UploadIcon size={18} /></div>
                <div className="label">点击选择 · 或拖入文件</div>
                <div className="ext">.MD · .TXT · .CSV</div>
              </div>
            </div>
            <div className="settings-card">
              <div className="lbl">粘贴内容</div>
              <textarea className="textarea" value={pasteMd} onChange={(e) => setPasteMd(e.target.value)}
                placeholder="# 章节&#10;## 小节&#10;* 正面&#10;  * 背面要点&#10;&#10;也支持 Anki 导出的 txt/csv 格式" />
              <button onClick={handlePasteSubmit} disabled={!pasteMd.trim()}
                className="inline-flex items-center justify-center gap-1.5 py-2.5 rounded-md font-body text-sm font-medium active:scale-[0.97] transition-transform disabled:opacity-40"
                style={{ background: 'var(--accent-soft)', color: 'var(--accent)', border: '1px solid var(--accent-line)' }}>
                <PasteIcon size={16} /> 解析并预览
              </button>
            </div>
            <div className="settings-card">
              <div className="lbl">支持格式 · FORMAT</div>
              <div className="kv-row"><span className="k">Markdown</span><span className="v">.md 列表</span></div>
              <div className="kv-row"><span className="k">Anki 导出</span><span className="v">txt / csv，含 cloze</span></div>
              <div className="kv-row"><span className="k">纯文本</span><span className="v">正面换行背面</span></div>
            </div>
            <input ref={fileInputRef} type="file" accept=".md,.txt,.csv,.tsv" onChange={handleMdFile} className="hidden" />
          </>
        )}

        {importTab === 'md' && (
          <div className="text-[13px] text-ink-2 leading-relaxed font-zh text-center py-2 tracking-[0.04em]">
            不知如何准备？ <Link to="/prompt-guide" style={{ color: 'var(--accent)' }}>查看制卡指南 →</Link>
          </div>
        )}
        {importTab === 'reading' && (
          <div className="text-[13px] text-ink-3 leading-relaxed font-zh text-center py-2 tracking-[0.04em]">
            导入后可在「阅读」模块管理
          </div>
        )}
      </main>
      <Toast message={toast} />
      <ConfirmSheet state={confirmState} />
    </div>
  )
}
