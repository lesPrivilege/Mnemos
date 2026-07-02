// ReadingHome — full page with topbar
import { useBackButton } from '../../lib/useBackButton'
import { useReadingHome } from '../hooks/useReadingHome'
import ReadingHomeBody from './ReadingHomeBody'
import { BackIcon, SearchIcon } from '../../components/Icons'
import { useConfirm, ConfirmSheet } from '../../components/ConfirmSheet'

export default function ReadingHome() {
  const { goBack } = useBackButton()
  const { confirmState, confirm } = useConfirm()
  const h = useReadingHome({ confirmFn: confirm })

  return (
    <div className="page-fill">
      <header className="topbar">
        <button onClick={goBack} className="tb-btn"><BackIcon /></button>
        <h1 className="flex-1 font-zh text-[17px] font-medium text-ink pl-1">阅读</h1>
        <div className="tb-actions">
          <button onClick={() => h.setQuery(q => q ? '' : ' ')} className="tb-btn"><SearchIcon size={18} /></button>
        </div>
      </header>

      {h.query !== '' && (
        <div className="px-[18px] pt-2 pb-1">
          <div className="search" style={{ margin: 0 }}>
            <SearchIcon size={16} />
            <input value={h.query} onChange={e => h.setQuery(e.target.value)} placeholder="搜索文档标题或内容" autoFocus />
          </div>
        </div>
      )}

      <main className="flex-1 overflow-y-auto p-[18px] flex flex-col gap-4">
        <ReadingHomeBody h={h} />
      </main>
      <ConfirmSheet state={confirmState} />
    </div>
  )
}
