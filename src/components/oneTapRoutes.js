// Where the Google One Tap prompt may load: the sign-in page and the two pages
// someone reaches on the way to paying. Everywhere else it stays off, so a
// visitor who is only browsing the tools gets no Google script and no prompt.
export const ONE_TAP_ROUTES = Object.freeze(['/login', '/plans', '/checkout'])

/** Whether One Tap may mount on `pathname` (case and trailing slash ignored). */
export function oneTapAllowed(pathname) {
  const path = String(pathname || '').toLowerCase().replace(/\/+$/, '') || '/'
  return ONE_TAP_ROUTES.includes(path)
}
