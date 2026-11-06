import { useEffect, useLayoutEffect, useRef } from 'react'
import { useLocation, useNavigate, useNavigationType } from 'react-router-dom'
import { getLenis } from '../../hooks/useSmoothScroll'
import { requestSections } from '../home/useBelowFoldReady'

// Anchors that older links and bookmarks still use, mapped to the sections that
// replaced them.
export const OLD_ANCHORS = {
  bench: 'bookmarks',
  specimens: 'exports',
  index: 'proof',
}

// How long an arriving hash waits for the page to finish loading its sections,
// and how many consecutive frames the target must hold still to count as settled.
const ARRIVAL_DEADLINE_MS = 3000
const SETTLED_FRAMES = 3
// Input that means the visitor has taken over the scroll position.
const TAKEOVER_EVENTS = ['wheel', 'touchstart', 'keydown', 'pointerdown']

// True while a section above the element, or the element itself, is still an
// empty stand-in (DeferredSection marks them). Stand-ins below it do not move it.
function sectionsPending(el) {
  return [...document.querySelectorAll('[data-deferred-hold]')].some((hold) => (
    hold === el
    || hold.contains(el)
    || el.contains(hold)
    || (hold.compareDocumentPosition(el) & Node.DOCUMENT_POSITION_FOLLOWING) !== 0
  ))
}

// THE BROWSER'S OWN SCROLL TO A URL FRAGMENT, HELD BACK.
//
// A page that loads with `#plans` is scrolled by the browser to the element with
// that id as soon as it exists, which is the first stand-in or section React
// renders, and again when the load event fires. The sections above are still
// empty boxes then, so the browser lands on a position that moves the moment they
// arrive. With the fragment out of the URL it has nothing to scroll to (and with
// scroll restoration off, nothing to restore), so the page stays put at the top
// until landArrivingHash scrolls once, to the finished heading. The fragment goes
// back into the URL when that is done, or when the visitor takes the scroll over.
let held = null

// The fragment is dropped through the router, not history.replaceState, because
// the app's own route-change scroll (App.jsx, landOnHash) also reads the
// router's hash and scrolls to the first element it finds with that id, a
// stand-in included. With the router's hash empty that scroll has nothing to do.
// The way back writes the URL directly: the router has no use for the hash again.
function holdBrowserScroll(navigate) {
  const { pathname, search, hash } = window.location
  if (held || hash.length < 2) return
  held = { pathname, search, hash, restoration: window.history.scrollRestoration }
  window.history.scrollRestoration = 'manual'
  navigate({ pathname, search, hash: '' }, { replace: true })
}

function releaseBrowserScroll() {
  if (!held) return
  const { pathname, search, hash, restoration } = held
  held = null
  window.history.scrollRestoration = restoration
  // Only if the visitor is still on the same page with no fragment of its own.
  const { location } = window
  if (location.pathname === pathname && location.search === search && !location.hash) {
    window.history.replaceState(window.history.state, '', `${pathname}${search}${hash}`)
  }
}

// A reload keeps the history entry's state, so the router reports it as a
// back/forward return (no arrival, scroll left where the browser puts it). A
// reload started while a fragment was still being landed is marked in
// sessionStorage, and the reloaded document treats the fragment as an arrival
// again. Read once per document, when this module loads.
const RELAND_KEY = 'vs-reland-hash'
function takeRelandMark() {
  try {
    const mark = window.sessionStorage.getItem(RELAND_KEY)
    window.sessionStorage.removeItem(RELAND_KEY)
    return mark !== null && mark === window.location.hash && mark.length > 1
  } catch {
    return false
  }
}
let relandPending = typeof window !== 'undefined' && takeRelandMark()

/** Called just before a hard reload (the recovery for a chunk that failed to
 *  download, main.jsx). A fragment still being landed goes back into the URL,
 *  which the reload reads at that moment, and the reloaded page is told to land
 *  it again. */
export function prepareReload() {
  const hash = held ? held.hash : ''
  releaseBrowserScroll()
  if (hash.length < 2) return
  try { window.sessionStorage.setItem(RELAND_KEY, hash) } catch { /* the reloaded page keeps the browser's own scroll */ }
}

const currentHash = () => (held ? held.hash : window.location.hash)

// Scrolls to a section through Lenis (falling back to the browser) and moves
// focus to its heading, so a keyboard or screen reader user lands where the page
// has scrolled to. `immediate` skips the glide, for a hash the page arrives on.
// A section that is not there yet (it, or one above it, is a stand-in) is waited
// for, as an arriving hash waits, so the scroll happens once, on the finished
// page. Returns false when the id is not on the page.
export function jumpToSection(id, { immediate = false } = {}) {
  const el = document.getElementById(id)
  if (!el) return false
  if (!immediate && sectionsPending(el)) {
    landArrivingHash(id)
    return true
  }
  const lenis = getLenis()
  if (lenis) {
    if (immediate) {
      // Re-measure first: the sections that just mounted changed the page height.
      lenis.resize()
      lenis.scrollTo(el, { immediate: true, force: true })
    } else {
      lenis.scrollTo(el)
    }
  } else {
    el.scrollIntoView({ block: 'start', behavior: immediate ? 'instant' : 'auto' })
  }
  const heading = el.querySelector('h2') || el
  if (!heading.hasAttribute('tabindex') && heading.tabIndex < 0) heading.setAttribute('tabindex', '-1')
  heading.focus({ preventScroll: true })
  return true
}

function decodeHash(hash) {
  const raw = hash.slice(1)
  try { return decodeURIComponent(raw) } catch { return raw }
}

let cancelLanding = () => {}

// A page that arrives with a hash (`/home#plans` from another page, or a fresh
// load of it) cannot jump straight away: the sections below the first screen
// are code-split, and until each one arrives its place is an empty box, so a
// scroll now would land on the placeholder and drift as the real sections push
// it down. This asks for the sections, then waits until none above the target
// (or the target itself) is left as a placeholder, the fonts are in and the
// target has held still, and scrolls and focuses once. Past the deadline it
// scrolls to whatever is there. Gives up if the target is not on the page.
// Returns a cancel function.
function landArrivingHash(id) {
  cancelLanding()
  requestSections()
  let raf = 0
  let fontsReady = !document.fonts
  if (document.fonts) document.fonts.ready.then(() => { fontsReady = true }, () => { fontsReady = true })
  const deadline = performance.now() + ARRIVAL_DEADLINE_MS
  let lastTop = null
  let still = 0

  const stop = () => {
    cancelAnimationFrame(raf)
    TAKEOVER_EVENTS.forEach((name) => window.removeEventListener(name, stop))
    releaseBrowserScroll()
    if (cancelLanding === stop) cancelLanding = () => {}
  }
  cancelLanding = stop
  TAKEOVER_EVENTS.forEach((name) => window.addEventListener(name, stop, { passive: true }))

  const frame = () => {
    const el = document.getElementById(id)
    const late = performance.now() >= deadline
    const stillPending = el ? sectionsPending(el) : !!document.querySelector('[data-deferred-hold]')
    if (!el && !stillPending) {
      // Every section has arrived and none carries this id.
      stop()
      return
    }
    if (el && fontsReady && !stillPending) {
      // Measured against the document, so the scroll position does not move it.
      const top = el.getBoundingClientRect().top + window.scrollY
      still = top === lastTop ? still + 1 : 0
      lastTop = top
    }
    if (el && ((fontsReady && !stillPending && still >= SETTLED_FRAMES) || late)) {
      stop()
      jumpToSection(id, { immediate: true })
      return
    }
    if (late) {
      stop()
      return
    }
    raf = requestAnimationFrame(frame)
  }
  raf = requestAnimationFrame(frame)
  return stop
}

// Redirects the old anchors on load and on hashchange, lands and focuses a hash
// the page arrives on, and turns every in-page `#id` link into a Lenis jump that
// focuses the section's h2.
export function usePageAnchors() {
  const navType = useNavigationType()
  const { key } = useLocation()
  const navigate = useNavigate()
  // Back and forward restore the scroll position they left, so only a first
  // load (the router's initial entry) or a pushed link counts as an arrival.
  const reland = useRef(relandPending).current
  const arriving = useRef(navType !== 'POP' || key === 'default' || reland)

  // Before the first paint, so the browser has no fragment to scroll to. Only
  // the document's own first load has the browser scrolling to a fragment; a
  // link pushed inside the app does not.
  useLayoutEffect(() => {
    if (key === 'default' || reland) holdBrowserScroll(navigate)
    relandPending = false
    // eslint-disable-next-line react-hooks/exhaustive-deps -- first render only
  }, [])

  useEffect(() => {
    const rewriteOld = () => {
      const old = OLD_ANCHORS[currentHash().slice(1)]
      if (!old) return null
      if (held) {
        held.hash = `#${old}`
      } else {
        window.history.replaceState(window.history.state, '', `${window.location.pathname}${window.location.search}#${old}`)
      }
      return old
    }
    const arrive = () => {
      const id = rewriteOld() || decodeHash(currentHash())
      if (id) landArrivingHash(id)
    }
    const onHashChange = () => {
      // A hash typed or pushed by someone else replaces the one being held.
      releaseBrowserScroll()
      arrive()
    }
    const onClick = (e) => {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return
      const a = e.target.closest?.('a[href^="#"]')
      if (!a || a.closest('.spnav-menu')) return
      const raw = a.getAttribute('href').slice(1)
      const id = OLD_ANCHORS[raw] || raw
      if (!id || !document.getElementById(id)) return
      e.preventDefault()
      window.history.pushState(window.history.state, '', `${window.location.pathname}${window.location.search}#${id}`)
      jumpToSection(id)
    }

    if (arriving.current) arrive()
    else {
      // History navigation keeps its restored scroll; only an old anchor is fixed.
      const old = rewriteOld()
      if (old) jumpToSection(old)
    }
    window.addEventListener('hashchange', onHashChange)
    document.addEventListener('click', onClick)
    return () => {
      cancelLanding()
      releaseBrowserScroll()
      window.removeEventListener('hashchange', onHashChange)
      document.removeEventListener('click', onClick)
    }
  }, [])
}
