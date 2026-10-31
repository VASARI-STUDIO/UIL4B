// The public name a member posts under in the community, chosen once.
//
// Shared by every tool that submits to the review queue (Palette Builder,
// Gradient Generator), so the rule for what a handle may be lives in one place.
// Pure apart from the two storage helpers at the bottom, which take the storage
// as an argument so they can be exercised without a browser.
export const HANDLE_KEY = 'vs-community-handle'

// Normalise before matching so leetspeak (sh1t), separators (f_u_c_k) and
// repeated-character padding (shiiit) all collapse to the same stem that is
// tested against the blocklist. Numbers and underscores stay legal in the
// handle itself.
function normaliseForFilter(raw) {
  return String(raw).toLowerCase()
    .replace(/[!|1]/g, 'i')
    .replace(/3/g, 'e')
    .replace(/[4@]/g, 'a')
    .replace(/0/g, 'o')
    .replace(/[$5]/g, 's')
    .replace(/7/g, 't')
    .replace(/[^a-z]/g, '')     // drop separators, remaining digits, symbols
    .replace(/(.)\1+/g, '$1')   // collapse repeated-character padding
}

const HANDLE_BLOCK = [
  'fuck', 'shit', 'cunt', 'bitch', 'asshole', 'nigger', 'nigga', 'faggot', 'fag',
  'retard', 'rape', 'slut', 'whore', 'dick', 'cock', 'pussy', 'bastard', 'wanker',
  'twat', 'bollocks', 'spic', 'chink', 'kike', 'tranny', 'nazi', 'porn', 'anal', 'cum',
]

/** A plain-language reason the handle is not allowed, or null when it is fine. */
export function handleProblem(raw) {
  const h = String(raw).trim()
  if (h.length < 3) return 'Handle must be at least 3 characters.'
  if (h.length > 20) return 'Handle must be 20 characters or fewer.'
  if (!/^[a-zA-Z0-9_]+$/.test(h)) return 'Use only letters, numbers and underscores.'
  const norm = normaliseForFilter(h)
  if (HANDLE_BLOCK.some(w => norm.includes(w))) return 'Please choose a different handle.'
  return null
}

function resolveStorage(storage) {
  return storage || (typeof localStorage !== 'undefined' ? localStorage : null)
}

/** The handle this browser has stored, or '' when there is none. */
export function readStoredHandle(storage) {
  try { return resolveStorage(storage)?.getItem(HANDLE_KEY) || '' } catch { return '' }
}

export function writeStoredHandle(handle, storage) {
  try { resolveStorage(storage)?.setItem(HANDLE_KEY, handle) } catch { /* private mode */ }
}
