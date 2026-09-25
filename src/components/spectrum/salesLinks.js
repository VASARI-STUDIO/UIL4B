// Links from the marketing chrome (SpectrumNav, SpectrumFooter) to a SECTION of
// the sales page.
//
// The sales page is `/` and `/home` (App.jsx renders the same page on both).
// `/home` is the one that is the sales page for EVERYBODY — `/` hands a
// signed-in visitor to their projects — so it is where a section link from
// another marketing screen (/mobile, /plans) goes. On the sales page itself the
// link is a bare hash, which Lenis's anchor handling scrolls smoothly.
//
// The landing on arrival from another screen is `landOnHash()`, run once by
// SpectrumNav when it mounts (the nav is on every marketing screen).
import { getLenis } from '../../hooks/useSmoothScroll'

export const SALES_PATHS = new Set(['/', '/home'])

export const normPath = (p) => (p || '/').toLowerCase().replace(/\/+$/, '') || '/'

export const onSalesPage = (pathname) => SALES_PATHS.has(normPath(pathname))

/** `#bench` on the sales page, `/home#bench` anywhere else. */
export function salesHref(hash, pathname) {
  return onSalesPage(pathname) ? hash : `/home${hash}`
}

/**
 * Bring `location.hash`'s section to the top, after a route change has reset
 * the scroll (App.jsx). Two frames later, so it runs after that reset.
 *
 * resize() FIRST. Lenis clamps every scrollTo to the scroll limit it last
 * measured, and on arrival that is still the PREVIOUS page's height —
 * measured: /mobile → /home#pricing stopped dead at 1186px (the /mobile page's
 * own limit) with the section 7,800px further down.
 *
 * Returns a cancel function for an effect cleanup.
 */
export function landOnHash() {
  const id = window.location.hash.slice(1)
  if (!id) return () => {}
  let raf = requestAnimationFrame(() => {
    raf = requestAnimationFrame(() => {
      const el = document.getElementById(id)
      if (!el) return
      const lenis = getLenis()
      if (lenis) {
        lenis.resize()
        // Lenis reads the target's scroll-margin-top itself.
        lenis.scrollTo(el, { immediate: true, force: true })
      } else {
        el.scrollIntoView({ block: 'start' })
      }
    })
  })
  return () => cancelAnimationFrame(raf)
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
