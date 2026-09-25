// WHERE THE SITE FOOTER RENDERS — on /, /plans, /mobile and the reading and
// legal pages, never on app pages. The App design draws no footer under a
// tool, a library or the workspace, so every other route returns nothing here. `/` and `/home` render
// SpectrumFooter themselves and never mount this component.
export const FOOTER_ROUTES = new Set([
  '/plans', '/mobile',
  '/learn', '/principles', '/help', '/info', '/sitemap',
  '/privacy', '/terms', '/credits',
])

export function footerShowsOn(pathname) {
  const path = (pathname || '/').toLowerCase().replace(/\/+$/, '') || '/'
  return FOOTER_ROUTES.has(path) || path.startsWith('/learn/')
}
