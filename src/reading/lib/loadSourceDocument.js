import { getDocument, getDocumentContent } from './storage'
export async function loadSourceDocument(id) {
  const document = getDocument(id)
  if (!document) return null
  return { ...document, content: await getDocumentContent(id) }
}
