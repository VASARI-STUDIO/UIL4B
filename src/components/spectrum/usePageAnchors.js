import { useEffect, useRef } from 'react'
import { useLocation, useNavigationType } from 'react-router-dom'
import { getLenis } from '../../hooks/useSmoothScroll'

// Anchors that older links and bookmarks still use, mapped to the sections that
// replaced them.
export const OLD_ANCHORS = {
  bench: 'bookmarks',
  specimens: 'exports',
  index: 'proof',
}

// How long an arriving hash waits for the page to finish loading its sections,
// and how many consecutive frames the target must hold still to count as settled.
const ARRIVAL_DEADLINE_MS = 6000
const SETTLED_FRAMES = 3
// Input that means the visitor has taken over the scroll position.
const TAKEOVER_EVENTS = ['wheel', 'touchstart', 'keydown', 'pointerdown']

// Scrolls to a section through Lenis (falling back to the browser) and moves
// focus to its heading, so a keyboard or screen reader user lands where the page
// has scrolled to. `immediate` skips the glide, for a hash the page arrives on.
// Returns false when the id is not on the page.
export function jumpToSection(id, { immediate = false } = {}) {
  const el = document.getElementById(id)
  if (!el) return false
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

// A page that arrives with a hash (`/home#plans` from another page, or a fresh
// load of it) cannot jump straight away: the sections below the first screen
// are code-split, and until each one arrives its place is an empty box of an
// estimated height, so a scroll now would land on the placeholder and drift as
// the real sections push it down. This waits until no placeholder is left, the
// fonts are in and the target has held still, then scrolls and focuses once.
// Gives up quietly if the sections never arrive. Returns a cancel function.
function landArrivingHash(id) {
  let raf = 0
  let fontsReady = !document.fonts
  if (document.fonts) document.fonts.ready.then(() => { fontsReady = true }, () => { fontsReady = true })
  const deadline = performance.now() + ARRIVAL_DEADLINE_MS
  let lastTop = null
  let still = 0

  const stop = () => {
    cancelAnimationFrame(raf)
    TAKEOVER_EVENTS.forEach((name) => window.removeEventListener(name, stop))
  }
  TAKEOVER_EVENTS.forEach((name) => window.addEventListener(name, stop, { passive: true }))

  const frame = () => {
    const el = document.getElementById(id)
    const loaded = !!el && fontsReady && !document.querySelector('[data-deferred-hold]')
    if (loaded) {
      // Measured against the document, so the scroll position does not move it.
      const top = el.getBoundingClientRect().top + window.scrollY
      still = top === lastTop ? still + 1 : 0
      lastTop = top
      if (still >= SETTLED_FRAMES || performance.now() >= deadline) {
        stop()
        jumpToSection(id, { immediate: true })
        return
      }
    } else if (performance.now() >= deadline) {
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
  // Back and forward restore the scroll position they left, so only a first
  // load (the router's initial entry) or a pushed link counts as an arrival.
  const arriving = useRef(navType !== 'POP' || key === 'default')

  useEffect(() => {
    const rewriteOld = () => {
      const old = OLD_ANCHORS[window.location.hash.slice(1)]
      if (!old) return null
      window.history.replaceState(window.history.state, '', `${window.location.pathname}${window.location.search}#${old}`)
      return old
    }
    let cancelArrival = () => {}
    const arrive = () => {
      const id = rewriteOld() || decodeHash(window.location.hash)
      cancelArrival()
      if (id) cancelArrival = landArrivingHash(id)
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
    window.addEventListener('hashchange', arrive)
    document.addEventListener('click', onClick)
    return () => {
      cancelArrival()
      window.removeEventListener('hashchange', arrive)
      document.removeEventListener('click', onClick)
    }
  }, [])
}
