import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { PROMPT_TEMPLATE, VOCAB_PROMPT_TEMPLATE, QUIZ_PROMPT_TEMPLATE, READING_PROMPT_TEMPLATE } from '../lib/formatSpec'
import { BackIcon, CopyIcon, CheckIcon, XIcon } from '../components/Icons'
import { useBackButton } from '../lib/useBackButton'
import { S } from '../lib/strings'

const TABS = ['general', 'vocab', 'quiz', 'reading']

const TEMPLATES = {
  general: PROMPT_TEMPLATE,
  vocab: VOCAB_PROMPT_TEMPLATE,
  quiz: QUIZ_PROMPT_TEMPLATE,
  reading: READING_PROMPT_TEMPLATE,
}

export default function PromptGuide() {
  const { goBack } = useBackButton()
  const [searchParams, setSearchParams] = useSearchParams()
  const tabParam = searchParams.get('tab')
  const tab = TABS.includes(tabParam) ? tabParam : 'general'
  const [copyState, setCopyState] = useState('idle') // 'idle' | 'copied' | 'failed'

  const setTab = (key) => {
    setSearchParams(key === 'general' ? {} : { tab: key }, { replace: true })
    setCopyState('idle')
  }

  const current = TEMPLATES[tab]

  const flashCopyState = (state) => {
    setCopyState(state)
    setTimeout(() => setCopyState('idle'), 2000)
  }

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(current)
      flashCopyState('copied')
      return
    } catch {
      // fall through to legacy fallback below
    }
    let ok = false
    try {
      const ta = document.createElement('textarea')
      ta.value = current
      document.body.appendChild(ta)
      ta.select()
      ok = document.execCommand('copy')
      document.body.removeChild(ta)
    } catch {
      // ok stays false
    }
    flashCopyState(ok ? 'copied' : 'failed')
  }

  const lines = current.split('\n')

  return (
    <div className="page-fill">
      <header className="topbar">
        <button onClick={goBack} className="tb-btn" aria-label={S.common.back}>
          <BackIcon />
        </button>
        <h1 className="flex-1 font-zh text-xl font-medium text-ink pl-1">{S.promptGuide.title}</h1>
      </header>

      <main className="flex-1 overflow-y-auto p-[18px] flex flex-col gap-4">
        <p className="text-md text-ink-2 leading-[1.8] font-zh tracking-[0.02em]">
          {S.promptGuide.intro}
        </p>

        <div className="seg">
          {TABS.map((key) => (
            <button key={key} onClick={() => setTab(key)} className={tab === key ? 'on' : ''} aria-pressed={tab === key}>
              {S.promptGuide.tabs[key]}
            </button>
          ))}
        </div>

        {(tab === 'general' || tab === 'vocab') && (
          <div className="settings-card">
            <div className="lbl">{S.promptGuide.ankiCardLabel}</div>
            <div className="text-md text-ink-2 leading-[1.7] font-zh">
              {S.promptGuide.ankiCardBody}
            </div>
          </div>
        )}

        <button onClick={handleCopy}
          className={`w-full inline-flex items-center justify-center gap-1.5 py-2.5 rounded-md font-body text-md font-medium active:scale-[0.97] transition-transform
            ${copyState === 'idle' ? 'bg-ink text-bg' : ''}`}
          style={
            copyState === 'copied' ? { background: 'var(--accent-soft)', color: 'var(--accent)', border: '1px solid var(--accent-line)' }
            : copyState === 'failed' ? { background: 'var(--danger-soft)', color: 'var(--danger)', border: '1px solid color-mix(in oklch, var(--danger) 25%, transparent)' }
            : {}
          }>
          {copyState === 'copied' ? <><CheckIcon size={16} /> {S.promptGuide.copied}</>
            : copyState === 'failed' ? <><XIcon size={16} /> {S.promptGuide.copyFailed}</>
            : <><CopyIcon size={16} /> {S.promptGuide.copyPrompt}</>}
        </button>

        <p className="text-xs text-ink-3 font-zh leading-[1.6] tracking-[0.02em]">
          {S.promptGuide.pasteHint[tab]}{S.promptGuide.placeholderNote[tab]}
        </p>

        <div className="rounded-md p-3.5 font-mono text-xs leading-[1.7] text-ink-2 whitespace-pre-wrap max-h-[320px] overflow-y-auto relative"
          style={{ background: 'var(--bg-sunken)', border: '1px solid var(--border-soft)' }}>
          {lines.map((line, i) => (
            <div key={i}>
              <span className="text-ink-4 select-none mr-2.5">{String(i+1).padStart(2,'0')}</span>
              {line.startsWith('##') ? <span className="text-ink">{line}</span> : line}
            </div>
          ))}
        </div>

        <div className="settings-card">
          <div className="lbl">{S.promptGuide.whyTitle}</div>
          <div className="text-md text-ink-2 leading-[1.7] font-zh">
            {S.promptGuide.whyBody}
          </div>
        </div>

        <div className="text-center text-xs text-ink-3 font-zh tracking-[0.04em]">
          {S.promptGuide.footerNote}
        </div>
      </main>
    </div>
  )
}
