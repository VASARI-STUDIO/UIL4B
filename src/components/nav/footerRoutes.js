// WHERE THE SITE FOOTER RENDERS: SpectrumFooter is the one footer. It closes every page in the
// app shell (projects, settings, checkout, community, the reading and legal pages, the 404).
// The Create tools fill the screen and end without one, except the Icon and Emoji libraries,
// which owe a licence notice for the sets on screen and carry it in the footer's `notice` row.
// Full-screen views (login, onboarding, maintenance, a library's `?view=full` window) have none.
//
// Covers /create/icons, everything beneath it (the Groups tab and its detail views) and /create/emoji.
export function toolCarriesCredits(pathname) {
  const path = (pathname || '/').toLowerCase().replace(/\/+$/, '') || '/'
  return path === '/create/emoji' || path === '/create/icons' || path.startsWith('/create/icons/')
}

// The sales close ("Save time, and save your mind" and Open the toolkit) belongs on the marketing
// and reading pages only. Inside the app (projects, settings, checkout, community, the libraries,
// the 404) the footer is links and small print.
const SALES_CLOSE_ROUTES = new Set([
  '/plans', '/mobile', '/tools', '/discover', '/learn', '/info', '/sitemap',
  '/privacy', '/terms', '/credits', '/roadmap',
])
export function footerClosesSale(pathname) {
  const path = (pathname || '/').toLowerCase().replace(/\/+$/, '') || '/'
  return SALES_CLOSE_ROUTES.has(path) || path.startsWith('/learn/') || path.startsWith('/discover/')
}

// The dashboard is drawn dark in both themes, so its footer takes the dark tokens too.
export function footerTheme(pathname) {
  const path = (pathname || '/').toLowerCase().replace(/\/+$/, '') || '/'
  return path === '/projects' ? 'dark' : undefined
}
