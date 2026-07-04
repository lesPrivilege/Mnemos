// User-visible string constants — i18n reserve.
// One flat object, grouped by domain, assembled from per-domain modules in
// ./strings/. Values are byte-identical copies of the strings previously
// inlined across src/lib and src/components; this file does not change any
// behavior or visible copy, only where it lives.
// See docs/feature-predesign-cleanup-prompt.md for the externalization plan.

import { common } from './strings/common'
import { review } from './strings/review'
import { cardEditor } from './strings/cardEditor'
import { error } from './strings/error'
import { structure } from './strings/structure'
import { storage } from './strings/storage'
import { reviewLog } from './strings/reviewLog'
import { reviewSession } from './strings/reviewSession'
import { autoBackup } from './strings/autoBackup'
import { reminders } from './strings/reminders'
import { activity } from './strings/activity'
import { browse } from './strings/browse'
import { deckDetail } from './strings/deckDetail'
import { flashcardHome } from './strings/flashcardHome'
import { home } from './strings/home'
import { search } from './strings/search'
import { starred } from './strings/starred'
import { wrong } from './strings/wrong'
import { quiz } from './strings/quiz'
import { quizHome } from './strings/quizHome'
import { quizPage } from './strings/quizPage'
import { quizReview } from './strings/quizReview'
import { quizEngine } from './strings/quizEngine'
import { questionParser } from './strings/questionParser'
import { quizStorage } from './strings/quizStorage'
import { setDetail } from './strings/setDetail'
import { readerPanels } from './strings/readerPanels'
import { reader } from './strings/reader'
import { readingHome } from './strings/readingHome'
import { readingHomeBody } from './strings/readingHomeBody'
import { readingHomePage } from './strings/readingHomePage'
import { readingHomeContent } from './strings/readingHomeContent'
import { collectionDetail } from './strings/collectionDetail'
import { bookmarks } from './strings/bookmarks'
import { exportHighlights } from './strings/exportHighlights'
import { readingStats } from './strings/readingStats'
import { readingStorage } from './strings/readingStorage'
import { settings } from './strings/settings'
import { importStrings } from './strings/import'

export const S = {
  common,
  review,
  cardEditor,
  error,
  structure,
  storage,
  reviewLog,
  reviewSession,
  autoBackup,
  reminders,
  activity,
  browse,
  deckDetail,
  flashcardHome,
  home,
  search,
  starred,
  wrong,
  quiz,
  quizHome,
  quizPage,
  quizReview,
  quizEngine,
  questionParser,
  quizStorage,
  setDetail,
  readerPanels,
  reader,
  readingHome,
  readingHomeBody,
  readingHomePage,
  readingHomeContent,
  collectionDetail,
  bookmarks,
  exportHighlights,
  readingStats,
  readingStorage,
  settings,
  import: importStrings,
}
