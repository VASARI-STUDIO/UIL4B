// DOM helpers every converter mode shares. Kept apart from utils/mediaEncode.js,
// which is DOM-free on purpose so its numbers can be unit-tested as numbers.
import { useCallback } from 'react'
import useExportGate from '../../hooks/useExportGate'
import { getLenis } from '../../hooks/useSmoothScroll'

export function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error('Could not decode image'))
    img.src = src
  })
}

// Reduced motion, mirroring useHomeMotion's source of truth: AppearanceContext
// writes html[data-reduced-motion] and the app treats that toggle as
// authoritative (a visitor may deliberately opt back into motion), so only fall
// back to the OS query when the attribute is missing.
export function prefersReducedMotion() {
  const attr = document.documentElement.getAttribute('data-reduced-motion')
  if (attr === 'true') return true
  if (attr === 'false') return false
  return window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false
}

// The height of everything pinned to the top of the viewport: the app header,
// and the sticky tool toolbar under it once it has stuck. Scrolling a node to
// its own offsetTop would park it underneath both.
export function stickyTopOffset() {
  const bar = document.querySelector('[data-tool-toolbar]')
  if (bar) return (parseFloat(getComputedStyle(bar).top) || 0) + bar.offsetHeight
  const nav = document.querySelector('.pnav')
  return nav ? nav.getBoundingClientRect().height : 0
}

/** Scroll the page so `top` (a document y) sits under the sticky chrome. */
export function scrollDocTo(top) {
  const reduced = prefersReducedMotion()
  // Lenis owns the scroll position whenever smooth scrolling is on; a raw
  // window.scrollTo would desync its virtual position. Reduced motion never
  // instantiates it.
  const lenis = getLenis()
  if (lenis) lenis.scrollTo(top, reduced ? { immediate: true } : undefined)
  else window.scrollTo({ top, behavior: reduced ? 'auto' : 'smooth' })
}

// Where the run result is revealed. At this width and below the bench is one
// column: the result sits under the frame strip or the source, the settings
// under it, and the run's action bar is pinned to the bottom of the screen —
// so a result can land above or below what the visitor is looking at.
export const REVEAL_QUERY = '(max-width: 960px)'
const REVEAL_GAP = 12

/**
 * Bring a finished run's result into view on a one-column bench. Does nothing
 * when the result is already fully visible between the sticky toolbar and the
 * pinned action bar, or on a two-column bench where it sits beside the panel.
 * Honours reduced motion (an instant jump instead of a smooth scroll).
 */
export function revealResult(node) {
  if (!node || !node.isConnected) return
  if (!window.matchMedia?.(REVEAL_QUERY).matches) return
  const top = stickyTopOffset()
  const actionbar = node.closest('.fc-bench')?.querySelector('.fc-actionbar')
  const bottom = window.innerHeight - (actionbar ? actionbar.getBoundingClientRect().height : 0)
  const r = node.getBoundingClientRect()
  if (r.top >= top && r.bottom <= bottom) return
  scrollDocTo(Math.max(0, r.top + window.scrollY - top - REVEAL_GAP))
}

// THE RAW DOWNLOAD. The account gate is NOT here, and that is deliberate:
// calling this directly skips the gate, so do not — go through
// useGatedDownload below, which every mode that hands over a file uses.
function triggerDownload(blobOrUrl, filename) {
  const url = typeof blobOrUrl === 'string' ? blobOrUrl : URL.createObjectURL(blobOrUrl)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  if (typeof blobOrUrl !== 'string') URL.revokeObjectURL(url)
}

/**
 * A file needs a free account; converting and previewing never do.
 *
 * RETURNS WHETHER THE FILE ACTUALLY LEFT. It used to return undefined, and
 * every caller ignored it: `gatedDownload(...)` then `toast('Downloaded ZIP
 * with N images')` on the next line, unawaited. For a visitor with no account
 * the gate opens a signup dialog and the download never happens — so the
 * success toast rendered BEHIND the dialog, telling them a file they did not
 * get had arrived. A dismissed gate is not a failure and says nothing; it is
 * the visitor's own answer, and the dialog already explained itself.
 * tests/user-sim/98-converter-honest-toasts.spec.js holds this.
 */
export function useGatedDownload() {
  const requireExportAccount = useExportGate()
  return useCallback(async (blobOrUrl, filename, reason) => {
    if (!(await requireExportAccount(reason))) return false
    triggerDownload(blobOrUrl, filename)
    return true
  }, [requireExportAccount])
}
