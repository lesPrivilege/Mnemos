import { Link, useSearchParams } from 'react-router-dom'
import TodayHomeContent from './TodayHomeContent'
import MaterialsHomeContent from './MaterialsHomeContent'
import { SearchIcon, SettingsIcon, MnemosMark } from '../components/Icons'
import { S } from '../lib/strings'

export default function Home() {
  const [searchParams] = useSearchParams()
  // 旧 ?tab= 链接仍直达资料分类；新一级入口只认 今日／资料／活动。
  const showMaterials = searchParams.get('view') === 'materials' || searchParams.has('tab')

  return (
    <div className="page-fill">
      {/* Topbar */}
      <header className="topbar">
        <h1>
          <MnemosMark size={20} accent="var(--accent)" />
          Mnemos
        </h1>
        <div className="tb-actions">
          <Link to="/search" className="tb-btn" aria-label={S.home.search}><SearchIcon size={18} /></Link>
          <Link to="/settings" className="tb-btn" aria-label={S.home.settings}><SettingsIcon size={18} /></Link>
        </div>
      </header>

      <main className="home-scroll">
        {showMaterials ? <MaterialsHomeContent /> : <TodayHomeContent />}
      </main>
    </div>
  )
}
