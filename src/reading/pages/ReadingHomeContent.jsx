// ReadingHomeContent — thin wrapper for Home tab (no topbar)
import { useReadingHome } from '../hooks/useReadingHome'
import ReadingHomeBody from './ReadingHomeBody'
import { SearchIcon } from '../../components/Icons'
import { getDocumentsByCollection } from '../lib/storage'
import { useConfirm, ConfirmSheet } from '../../components/ConfirmSheet'
import { S } from '../../lib/strings'

export default function ReadingHomeContent() {
  const { confirmState, confirm } = useConfirm()
  const h = useReadingHome({ confirmFn: confirm })
  const hasDocs = h.collections.some(col => getDocumentsByCollection(col.id).length > 0)
  const showSearch = hasDocs || h.query.trim()

  return (
    <div className="p-[18px] pb-8 flex flex-col gap-4">
      {showSearch && (
        <div className="relative">
          <div className="search" style={{ margin: 0 }}>
            <SearchIcon size={16} />
            <input value={h.query} onChange={e => h.setQuery(e.target.value)} placeholder={S.readingHomeContent.searchPlaceholder} />
          </div>
        </div>
      )}

      <ReadingHomeBody h={h} />
      <ConfirmSheet state={confirmState} />
    </div>
  )
}
