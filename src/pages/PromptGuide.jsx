import { useState } from 'react'
import { PROMPT_TEMPLATE, VOCAB_PROMPT_TEMPLATE } from '../lib/formatSpec'
import { BackIcon, CopyIcon, CheckIcon } from '../components/Icons'
import { useBackButton } from '../lib/useBackButton'

const TEMPLATES = {
  general: { label: '通用知识', template: PROMPT_TEMPLATE },
  vocab: { label: '单词制卡', template: VOCAB_PROMPT_TEMPLATE },
}

export default function PromptGuide() {
  const { goBack } = useBackButton()
  const [tab, setTab] = useState('general')
  const [copied, setCopied] = useState(false)

  const current = TEMPLATES[tab].template

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(current)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      const ta = document.createElement('textarea')
      ta.value = current
      document.body.appendChild(ta)
      ta.select()
      document.execCommand('copy')
      document.body.removeChild(ta)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  const lines = current.split('\n')

  return (
    <div className="page-fill">
      <header className="topbar">
        <button onClick={goBack} className="tb-btn">
          <BackIcon />
        </button>
        <h1 className="flex-1 font-zh text-[17px] font-medium text-ink pl-1">制卡指南</h1>
      </header>

      <main className="flex-1 overflow-y-auto p-[18px] flex flex-col gap-4">
        <p className="text-[13px] text-ink-2 leading-[1.8] font-zh tracking-[0.02em]">
          复制下方 prompt 给任意 AI（Claude · GPT · DeepSeek · Kimi），附上学习材料，即可得到可导入的 .md。
        </p>

        <div className="settings-card">
          <div className="lbl">也可以直接导入 Anki 导出</div>
          <div className="text-[13px] text-ink-2 leading-[1.7] font-zh">
            闪卡 tab 支持 Anki 导出的 .txt / .csv 文件，自动识别 header 指令、HTML 字段和 cloze 挖空。
            无需转换为 Markdown。
          </div>
        </div>

        <div className="seg">
          {Object.entries(TEMPLATES).map(([key, t]) => (
            <button key={key} onClick={() => setTab(key)} className={tab === key ? 'on' : ''}>
              {t.label}
            </button>
          ))}
        </div>

        <button onClick={handleCopy}
          className={`w-full inline-flex items-center justify-center gap-1.5 py-2.5 rounded-md font-body text-sm font-medium active:scale-[0.97] transition-transform
            ${copied ? '' : 'bg-ink text-bg'}`}
          style={copied ? { background: 'var(--accent-soft)', color: 'var(--accent)', border: '1px solid var(--accent-line)' } : {}}>
          {copied ? <><CheckIcon size={16} /> 已复制</> : <><CopyIcon size={16} /> 复制 Prompt</>}
        </button>

        <div className="rounded-md p-3.5 font-mono text-[11px] leading-[1.7] text-ink-2 whitespace-pre-wrap max-h-[320px] overflow-y-auto relative"
          style={{ background: 'var(--bg-sunken)', border: '1px solid var(--border-soft)' }}>
          {lines.map((line, i) => (
            <div key={i}>
              <span className="text-ink-4 select-none mr-2.5">{String(i+1).padStart(2,'0')}</span>
              {line.startsWith('##') ? <span className="text-accent">{line}</span> : line}
            </div>
          ))}
        </div>

        <div className="text-center text-[11px] text-ink-3 font-zh tracking-[0.04em]">
          导入时 · 选择文件或粘贴
        </div>
      </main>
    </div>
  )
}
