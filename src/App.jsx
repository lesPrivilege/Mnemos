import { HashRouter, Link, Routes, Route, useLocation } from 'react-router-dom'
import { useEffect } from 'react'
import ErrorBoundary from './components/ErrorBoundary'
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
import { S } from './lib/strings'

const bottomTabs = [
  { key: 'quiz', label: S.home.practiceZh, to: '/?tab=quiz', icon: <Icon d="M5 5h5v5H5zM14 5h5v5h-5zM5 14h5v5H5zM14 14h5v5h-5z" /> },
  { key: 'flashcard', label: S.home.recallZh, to: '/?tab=flashcard', icon: <Icon d="M7 5h10a2 2 0 012 2v10M5 7h10a2 2 0 012 2v10H7a2 2 0 01-2-2z" /> },
  { key: 'reading', label: S.home.readingZh, to: '/?tab=reading', icon: <Icon d="M5 5h7a3 3 0 013 3v11a3 3 0 00-3-3H5zM19 5h-4a3 3 0 00-3 3" /> },
]

function AppShell() {
  const location = useLocation()
  const params = new URLSearchParams(location.search)
  const activeTab = params.get('tab') || sessionStorage.getItem('mnemos-home-tab') || 'flashcard'
  const showBottomTabs = location.pathname === '/'

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
          <div className="bottom-tabs-indicator" aria-hidden="true" />
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
      </ErrorBoundary>
    </HashRouter>
  )
}
