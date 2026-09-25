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

// A community prompt's `tags` is ONE comma-separated STRING — what
// buildCommunityPromptRecord writes and what firestore.rules requires. Admin
// reads and writes it only through these two: its card used to call `.join`
// and `.map` on the string and crashed on the first tagged submission. An
// array is still accepted on read, for any document an earlier admin edit
// saved in that shape. Case is kept (parseTags above lowercases for search).
export function promptTagList(tags) {
  const parts = Array.isArray(tags) ? tags : String(tags || '').split(',')
  return parts.map((t) => String(t).trim()).filter(Boolean)
}

export function promptTagString(tags) {
  return promptTagList(tags).join(', ')
}
