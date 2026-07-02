// Full-backup builder — assembles all three modules' data into one object.
// Integration point: imports from flashcard (mnemos-*), quiz (examprep-*),
// and reading (reading-*) modules. Same permission as Import.jsx / Settings.jsx.
import { exportData as exportFlashcardData } from './storage'
import { exportData as exportQuizData } from '../quiz/lib/storage'
import { exportReadingData } from '../reading/lib/backup'

/**
 * Build a full backup object containing all app data.
 * @returns {Promise<{version: number, exportedAt: string, flashcard: object, quiz: object, reading: object}>}
 */
export async function buildFullBackup() {
  const flashcardJson = exportFlashcardData()
  const quizJson = exportQuizData()
  const reading = await exportReadingData()
  return {
    version: 1,
    exportedAt: new Date().toISOString(),
    flashcard: JSON.parse(flashcardJson),
    quiz: JSON.parse(quizJson),
    reading,
  }
}
