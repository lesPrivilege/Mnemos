import { Link, useLocation, useSearchParams } from 'react-router-dom'
import StudyTray from '../components/StudyTray'
import TodayHomeContent from './TodayHomeContent'
import MaterialsHomeContent from './MaterialsHomeContent'
import { SearchIcon, SettingsIcon, MnemosMark } from '../components/Icons'
import { S } from '../lib/strings'

export default function Home() {
  const location = useLocation()
  const [searchParams] = useSearchParams()
  // 旧 ?tab= 链接仍直达资料分类；新一级入口只认 今日／资料／活动。
  const showMaterials = searchParams.get('view') === 'materials' || searchParams.has('tab')
  const returnTo = `${location.pathname}${location.search}`

  return (
    <div className="page-fill">
      {/* Topbar */}
      <header className="topbar">
        <h1>
          <MnemosMark size={20} accent="var(--accent)" />
          Mnemos
        </h1>
        <div className="tb-actions">
          <Link to="/search" state={{ returnTo }} className="tb-btn" aria-label={S.home.search}><SearchIcon size={18} /></Link>
          <Link to="/settings" state={{ returnTo }} className="tb-btn" aria-label={S.home.settings}><SettingsIcon size={18} /></Link>
        </div>
      </header>

      <main className="home-scroll">
        <StudyTray/>
        {showMaterials ? <MaterialsHomeContent /> : <TodayHomeContent />}
      </main>
    </div>
  )
}
