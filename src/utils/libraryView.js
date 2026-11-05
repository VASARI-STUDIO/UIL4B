// The full-screen view of a library page: the same page with no site nav and no
// footer, so it can sit in a window of its own beside the work it feeds.
//
// It is a query flag, `?view=full`, and not a second route. A route would need
// its own row in the route-meta table, the sitemap and the prerender list, and
// would have to be kept out of the index separately; the flag shares the page's
// path, so everything that is true of the page (admin-only, not indexed) stays
// true of the view. The list state lives in the hash (`#website`, `#all`) and the
// flag lives in the query, so the two never collide.
export const FULL_VIEW_PARAM = 'view'
export const FULL_VIEW_VALUE = 'full'

// `search` is `location.search`: '' or '?a=b'.
export function isFullView(search) {
  return new URLSearchParams(search || '').get(FULL_VIEW_PARAM) === FULL_VIEW_VALUE
}

// The address of the same page in the full-screen view. Other query parameters
// and the hash (the list the visitor is reading) come along.
export function fullViewHref(pathname, search, hash) {
  const params = new URLSearchParams(search || '')
  params.set(FULL_VIEW_PARAM, FULL_VIEW_VALUE)
  return `${pathname}?${params.toString()}${hash || ''}`
}

// The address of the same page with the nav and footer back: the flag removed,
// everything else kept.
export function normalViewHref(pathname, search, hash) {
  const params = new URLSearchParams(search || '')
  params.delete(FULL_VIEW_PARAM)
  const query = params.toString()
  return `${pathname}${query ? `?${query}` : ''}${hash || ''}`
}

// Which pages have a full-screen view. Matched on the normalised path the app
// shell already uses (lower case, no trailing slash).
const FULL_VIEW_PATHS = new Set(['/discover/prompts'])

export function hasFullView(pathname) {
  return FULL_VIEW_PATHS.has(String(pathname || '').toLowerCase().replace(/\/+$/, '') || '/')
}

// True when this address should render without the site chrome.
export function wantsFullView(pathname, search) {
  return hasFullView(pathname) && isFullView(search)
}
