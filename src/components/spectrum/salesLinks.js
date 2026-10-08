// Links from the marketing chrome (SpectrumNav, SpectrumFooter) to a SECTION of
// the sales page.
//
// The sales page is `/` and `/home` (App.jsx renders the same page on both).
// `/home` is the one that is the sales page for EVERYBODY — `/` hands a
// signed-in visitor to their projects — so it is where a section link from
// another marketing screen (/mobile, /plans) goes. On the sales page itself the
// link is a bare hash, which Lenis's anchor handling scrolls smoothly.
//
// Hash landing after route changes is handled centrally in App.jsx.

export const SALES_PATHS = new Set(['/', '/home'])

export const normPath = (p) => (p || '/').toLowerCase().replace(/\/+$/, '') || '/'

export const onSalesPage = (pathname) => SALES_PATHS.has(normPath(pathname))

/** `#bench` on the sales page, `/home#bench` anywhere else. */
export function salesHref(hash, pathname) {
  return onSalesPage(pathname) ? hash : `/home${hash}`
}

/**
 * Click handler wrapper for a router <Link> to `/home#section`. Lenis listens
 * for anchor clicks on window, and by the time the click bubbles there the
 * router has already pushed the new URL — so Lenis sees a same-page anchor,
 * looks for the section on the page that is still being left, and logs
 * "Target not found". The landing is landOnHash()'s job; Lenis is kept out.
 */
export function crossRouteHashClick(href, onClick) {
  if (!href.includes('#') || href.startsWith('#')) return onClick
  return (e) => { e.stopPropagation(); onClick?.(e) }
}
