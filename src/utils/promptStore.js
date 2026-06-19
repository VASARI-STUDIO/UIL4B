// Local persistence + tag helpers for the Prompt Library. Kept tiny and
// dependency-free so any prompt component can import without pulling in React.

const PROMPTS_KEY = 'vs-prompts'
const SAVED_IDS_KEY = 'vs-saved-prompt-ids'

export function getPrompts() {
  try { return JSON.parse(localStorage.getItem(PROMPTS_KEY) || '[]') }
  catch { return [] }
}

export function setPromptsStore(p) {
  try { localStorage.setItem(PROMPTS_KEY, JSON.stringify(p)) } catch { /* quota */ }
}

export function getSavedIds() {
  try { return new Set(JSON.parse(localStorage.getItem(SAVED_IDS_KEY) || '[]')) }
  catch { return new Set() }
}

export function setSavedIdsStore(ids) {
  try { localStorage.setItem(SAVED_IDS_KEY, JSON.stringify([...ids])) } catch { /* quota */ }
}

export function parseTags(tagStr) {
  if (!tagStr) return []
  return tagStr.split(',').map(t => t.trim().toLowerCase()).filter(Boolean)
}
