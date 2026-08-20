import { HashRouter, Link, Routes, Route, useLocation } from 'react-router-dom'
import { useEffect } from 'react'
import ErrorBoundary from './components/ErrorBoundary'
import NotFoundPage from './components/NotFoundPage'
import { maybeRunAutoBackup } from './lib/autoBackup'
import { initReminders } from './lib/reminders'
import Home from './pages/Home'
import ImportPage from './pages/Import'
import DeckDetail from './pages/DeckDetail'
import Review from './pages/Review'
import Browse from './pages/Browse'
import QuizPage from './pages/QuizPage'
import QuizReview from './pages/QuizReview'
import Wrong from './pages/Wrong'
import Starred from './pages/Starred'
import Search from './pages/Search'
import PromptGuide from './pages/PromptGuide'
import Settings from './pages/Settings'
import Activity from './pages/Activity'
import SetDetail from './pages/SetDetail'
import Reader from './reading/pages/Reader'
import CollectionDetail from './reading/pages/CollectionDetail'
import { Icon } from './components/Icons'
import { ActionNotice } from './components/ActionNotice'
import { S } from './lib/strings'

const bottomTabs = [
  { key: 'today', label: S.home.todayTab, to: '/', icon: <Icon d="M5 12l4 4L19 6" /> },
  { key: 'materials', label: S.home.materialsTab, to: '/?view=materials', icon: <Icon d="M5 5h7a3 3 0 013 3v11a3 3 0 00-3-3H5zM19 5h-4a3 3 0 00-3 3" /> },
  { key: 'activity', label: S.home.activityTab, to: '/activity', icon: <Icon d="M5 18V11M12 18V6M19 18V9" /> },
]

function AppShell() {
  const location = useLocation()
  const params = new URLSearchParams(location.search)
  const activeTab = location.pathname === '/activity'
    ? 'activity'
    : location.pathname === '/' && (params.get('view') === 'materials' || params.has('tab'))
      ? 'materials'
      : 'today'
  const showBottomTabs = location.pathname === '/' || location.pathname === '/activity'

  return (
    <>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/deck/:id" element={<DeckDetail />} />
        <Route path="/review/:id" element={<Review />} />
        <Route path="/browse/:id" element={<Browse />} />
        <Route path="/quiz/:subject" element={<QuizPage />} />
        <Route path="/quiz-review/:subject" element={<QuizReview />} />
        <Route path="/set/:subject" element={<SetDetail />} />
        <Route path="/wrong" element={<Wrong />} />
        <Route path="/starred" element={<Starred />} />
        <Route path="/search" element={<Search />} />
        <Route path="/import" element={<ImportPage />} />
        <Route path="/prompt-guide" element={<PromptGuide />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="/activity" element={<Activity />} />
        <Route path="/reading/doc/:id" element={<Reader />} />
        <Route path="/collection/:id" element={<CollectionDetail />} />
        {/* 兜底路由（记-31）：无此径者旧渲染空白——不留下一步之死端（病2 不刊）。
            NotFoundPage 早已在册，只是从未接到路由表上。 */}
        <Route path="*" element={
          <NotFoundPage
            title={S.error.notFoundTitle}
            hint={S.error.notFoundHint}
            action={{ label: S.error.backHome, onClick: () => { window.location.hash = '#/' } }}
          />
        } />
      </Routes>
      {showBottomTabs && (
        <nav className="bottom-tabs" aria-label="主导航">
          <div className="bottom-tabs-row">
            {bottomTabs.map((tab) => (
              <Link
                key={tab.key}
                to={tab.to}
                className={`bottom-tab ${activeTab === tab.key ? 'on' : ''}`}
                aria-current={activeTab === tab.key ? 'page' : undefined}
              >
                {tab.icon}
                <span>{tab.label}</span>
              </Link>
            ))}
          </div>
        </nav>
      )}
    </>
  )
}

export default function App() {
  useEffect(() => {
    maybeRunAutoBackup()
    const cleanup = initReminders()
    return cleanup
  }, [])

  return (
    <HashRouter>
      <ErrorBoundary>
        <AppShell />
        {/* 动作确认之活区（记-32）：发起它的表单关掉之後它还在，故挂于此，
            不挂在任一屏内。 */}
        <ActionNotice />
      </ErrorBoundary>
    </HashRouter>
  )
}
