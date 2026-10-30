// WHERE THE SITE FOOTER RENDERS — on /, /plans, /mobile and the reading and
// legal pages, never on app pages. The App design draws no footer under a
// tool, a library or the workspace, so every other route returns nothing here. `/` and `/home` render
// SpectrumFooter themselves and never mount this component.
export const FOOTER_ROUTES = new Set([
  '/plans', '/mobile', '/tools',
  '/learn', '/learn/principles', '/learn/help', '/info', '/sitemap',
  '/privacy', '/terms', '/credits',
])

export function footerShowsOn(pathname) {
  const path = (pathname || '/').toLowerCase().replace(/\/+$/, '') || '/'
  return FOOTER_ROUTES.has(path) || path.startsWith('/learn/')
}

// The Icon and Emoji libraries close with the sales pages' ending (a close, the
// spectrum strip, then SpectrumFooter) instead of the plain app footer, which
// draws nothing under a tool. Covers /create/icons, everything beneath it
// (the Groups tab and its detail views) and /create/emoji.
export function toolWearsSpectrumFooter(pathname) {
  const path = (pathname || '/').toLowerCase().replace(/\/+$/, '') || '/'
  return path === '/create/emoji' || path === '/create/icons' || path.startsWith('/create/icons/')
}
