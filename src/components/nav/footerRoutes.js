// WHERE THE SITE FOOTER RENDERS — everywhere. SpectrumFooter closes every page and every tool,
// from the front door to the app shell and the Create tools; the only pages without it are the
// full-screen ones (the login and onboarding screens, the maintenance page and a library's
// `?view=full` window). So there is no route list to keep: a page that should have no footer is a
// page that renders outside the shell, not an entry here.
//
// What does vary is the small print. The Icon and Emoji libraries owe a licence notice for the sets
// on screen, and SpectrumFooter carries it in its `notice` row.
// Covers /create/icons, everything beneath it (the Groups tab and its detail views) and /create/emoji.
export function toolCarriesCredits(pathname) {
  const path = (pathname || '/').toLowerCase().replace(/\/+$/, '') || '/'
  return path === '/create/emoji' || path === '/create/icons' || path.startsWith('/create/icons/')
}
