// Can this browser ENCODE AVIF from a canvas?
//
// Reading .avif files is a separate question and is not touched here. The
// problem is output: canvas.toBlob(cb, 'image/avif') is not an error where AVIF
// encoding is missing (Safari, older Firefox) — the browser quietly hands back a
// PNG, or null. A format picker that offers AVIF there lets someone choose it
// and then receive something else under an .avif name.
//
// So the check is a real encode of a tiny canvas, and it passes only when the
// blob exists AND reports `image/avif`. Asked once, remembered for the session.
//
// Explicit extension so `node --test` can import this module directly; Vite
// resolves it identically.

const AVIF = 'image/avif'

let settled = null // true | false once the probe has finished; null = not known yet
let pending = null // the in-flight probe, shared by every caller

/** The ids this module treats as AVIF output. */
export const isAvifFormat = (id) => id === AVIF

function probe() {
  return new Promise((resolve) => {
    try {
      if (typeof document === 'undefined') { resolve(false); return }
      const canvas = document.createElement('canvas')
      canvas.width = 2
      canvas.height = 2
      // A browser with no 2D context cannot encode anything; asking is cheap.
      if (!canvas.getContext('2d') || typeof canvas.toBlob !== 'function') { resolve(false); return }
      // A callback that never fires must not leave the answer "unknown" for ever.
      const timer = setTimeout(() => resolve(false), 3000)
      canvas.toBlob((blob) => {
        clearTimeout(timer)
        resolve(Boolean(blob) && blob.type === AVIF)
      }, AVIF)
    } catch {
      resolve(false)
    }
  })
}

/**
 * Resolves true only when this browser really encodes AVIF. Never rejects and
 * never throws; no canvas (SSR, tests, old engines) answers false. Memoised.
 */
export function canEncodeAvif() {
  if (!pending) {
    pending = probe().then((ok) => {
      settled = ok
      return ok
    })
  }
  return pending
}

/**
 * The answer if it is already known, else null. Lets a render read the result
 * synchronously on every visit after the first, so a returning visitor never
 * sees the picker change shape.
 */
export function avifEncodeKnown() {
  return settled
}

/**
 * Drops AVIF from a list of `{ id }` output formats unless it is confirmed.
 * Hidden while unknown (`avifOk` null/false): a chip that appears is better
 * than one that appears and then vanishes on a browser that cannot deliver it.
 */
export function withAvifIf(formats, avifOk) {
  return avifOk === true ? formats : formats.filter((f) => !isAvifFormat(f.id))
}

/**
 * A remembered, handed-over or otherwise inherited format id, made safe: an
 * AVIF choice that this browser cannot encode becomes `fallback`.
 */
export function usableFormat(id, avifOk, fallback) {
  return isAvifFormat(id) && avifOk !== true ? fallback : id
}

/** True when an encoded blob is the format that was asked for. */
export function blobMatches(blob, wantedType) {
  return Boolean(blob) && blob.type === wantedType
}

/** Test seam: forget the remembered answer. */
export function resetAvifSupportForTests() {
  settled = null
  pending = null
}
