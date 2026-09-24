// DOM helpers every converter mode shares. Kept apart from utils/mediaEncode.js,
// which is DOM-free on purpose so its numbers can be unit-tested as numbers.
import { useCallback } from 'react'
import useExportGate from '../../hooks/useExportGate'

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
