import { HashRouter, Routes, Route } from 'react-router-dom'
import { useEffect } from 'react'
import ErrorBoundary from './components/ErrorBoundary'
import { maybeRunAutoBackup } from './lib/autoBackup'
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
import ReadingHome from './reading/pages/ReadingHome'
import Reader from './reading/pages/Reader'
import CollectionDetail from './reading/pages/CollectionDetail'

export default function App() {
  useEffect(() => { maybeRunAutoBackup() }, [])

  return (
    <HashRouter>
      <ErrorBoundary>
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
        <Route path="/reading" element={<ReadingHome />} />
        <Route path="/reading/doc/:id" element={<Reader />} />
        <Route path="/collection/:id" element={<CollectionDetail />} />
      </Routes>
      </ErrorBoundary>
    </HashRouter>
  )
}
