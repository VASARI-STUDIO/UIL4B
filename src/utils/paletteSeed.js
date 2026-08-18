// Where a surface OUTSIDE the palette tools gets "the colour this user is
// working on" from.
//
// Lives in a plain module rather than beside the component that uses it: a
// function exported alongside a component trips react-refresh/only-export-
// components and breaks fast refresh, which is the same reason src/config/
// plans.js exists apart from SubscriptionContext.
//
// PaletteBuilder writes a rolling log of the boards the user has worked
// through to `vs-palette-history` (newest first) so an accidental randomise is
// never destructive. Reading its head is the cheapest honest answer to "what
// colour does this person care about right now" without adding a context, a
// prop drill, or a write path into a page another workstream owns.

const HISTORY_KEY = 'vs-palette-history'
const BRAND_FALLBACK = '#0f6fff'

function cleanHex(value) {
  return typeof value === 'string' && /^#[0-9a-f]{6}$/i.test(value.trim())
    ? value.trim().toLowerCase()
    : null
}

// Returns { seed, source } — `source` exists so the UI can be honest about
// whose colour it is showing ("your seed" vs "the brand seed") instead of
// claiming personalisation it does not have.
export function resolvePaletteSeed(explicit) {
  const direct = cleanHex(explicit)
  if (direct) return { seed: direct, source: 'caller' }

  try {
    const raw = JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]')
    const last = Array.isArray(raw) ? raw[0] : null
    const fromHistory = cleanHex(last?.seed) || cleanHex(last?.colors?.[0])
    if (fromHistory) return { seed: fromHistory, source: 'history' }
  } catch { /* private mode, quota, or corrupt JSON — fall through */ }

  // Brand accent read from the live token, so it follows the theme rather than
  // freezing a hex into JS.
  try {
    const token = getComputedStyle(document.documentElement).getPropertyValue('--accent')
    const fromToken = cleanHex(token)
    if (fromToken) return { seed: fromToken, source: 'brand' }
  } catch { /* non-DOM environment */ }

  return { seed: BRAND_FALLBACK, source: 'brand' }
}
