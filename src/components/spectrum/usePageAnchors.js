import { useEffect } from 'react'
import { getLenis } from '../../hooks/useSmoothScroll'

// Anchors that older links and bookmarks still use, mapped to the sections that
// replaced them.
export const OLD_ANCHORS = {
  bench: 'bookmarks',
  specimens: 'exports',
  index: 'proof',
}

// Scrolls to a section through Lenis (falling back to the browser) and moves
// focus to its heading, so a keyboard or screen reader user lands where the page
// has scrolled to. Returns false when the id is not on the page.
export function jumpToSection(id) {
  const el = document.getElementById(id)
  if (!el) return false
  const lenis = getLenis()
  if (lenis) lenis.scrollTo(el)
  else el.scrollIntoView({ block: 'start' })
  const heading = el.querySelector('h2') || el
  if (!heading.hasAttribute('tabindex') && heading.tabIndex < 0) heading.setAttribute('tabindex', '-1')
  heading.focus({ preventScroll: true })
  return true
}

// Redirects the old anchors on load and on hashchange, and turns every in-page
// `#id` link into a Lenis jump that focuses the section's h2.
export function usePageAnchors() {
  useEffect(() => {
    const redirect = () => {
      const old = OLD_ANCHORS[window.location.hash.slice(1)]
      if (!old) return
      window.history.replaceState(window.history.state, '', `${window.location.pathname}${window.location.search}#${old}`)
      jumpToSection(old)
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
    redirect()
    window.addEventListener('hashchange', redirect)
    document.addEventListener('click', onClick)
    return () => {
      window.removeEventListener('hashchange', redirect)
      document.removeEventListener('click', onClick)
    }
  }, [])
}
