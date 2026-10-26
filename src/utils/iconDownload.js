// The formats the icon customiser can hand over as a file, and the browser-side
// work to make a PNG. Pure of React so the rules are testable on their own.
//
// The stored value is one of the ids below. An unknown stored value (a format
// that a later build removed, or a hand-edited cache) falls back to SVG.

/** localStorage key; follows the account (see utils/accountSync.js). */
export const DOWNLOAD_FORMAT_KEY = 'vs-icon-download-format'

/** Longest side a PNG is drawn at. iOS Safari caps a canvas near 16.7M pixels. */
export const PNG_MAX_PX = 2048

export const DEFAULT_DOWNLOAD_FORMAT = 'svg'

/** Menu order: the vector first, then the raster scales of the Size control. */
export const DOWNLOAD_FORMATS = Object.freeze([
  { id: 'svg', kind: 'svg', scale: 0, mark: 'Any size' },
  { id: 'png1', kind: 'png', scale: 1, mark: '1x' },
  { id: 'png2', kind: 'png', scale: 2, mark: '2x' },
  { id: 'png4', kind: 'png', scale: 4, mark: '4x' },
])

const BY_ID = new Map(DOWNLOAD_FORMATS.map(f => [f.id, f]))

export function isDownloadFormat(id) {
  return BY_ID.has(id)
}

export function readDownloadFormat(storage) {
  try {
    const raw = (storage || localStorage).getItem(DOWNLOAD_FORMAT_KEY)
    return BY_ID.has(raw) ? raw : DEFAULT_DOWNLOAD_FORMAT
  } catch { return DEFAULT_DOWNLOAD_FORMAT }
}

export function writeDownloadFormat(id, storage) {
  if (!BY_ID.has(id)) return
  try { (storage || localStorage).setItem(DOWNLOAD_FORMAT_KEY, id) } catch { /* private mode / quota: non-fatal */ }
}

/**
 * One format as it stands at a given Size: the pixel edge it would draw, whether
 * that is over the cap (the row is shown, greyed), and the words for it.
 */
export function describeFormat(id, size) {
  const f = BY_ID.get(id) || BY_ID.get(DEFAULT_DOWNLOAD_FORMAT)
  if (f.kind === 'svg') {
    return { ...f, px: 0, over: false, label: 'SVG', short: 'SVG', mark: f.mark, name: 'SVG' }
  }
  const want = Math.max(1, Math.round(Number(size) || 0)) * f.scale
  const over = want > PNG_MAX_PX
  const px = Math.min(want, PNG_MAX_PX)
  return {
    ...f,
    px,
    over,
    label: `PNG ${px}px`,
    short: 'PNG',
    mark: over ? `Over ${PNG_MAX_PX}px` : f.mark,
    name: `PNG, ${px} pixels`,
  }
}

/**
 * The format the button acts on right now. A remembered scale that is over the
 * cap at this Size steps down to the biggest one that still fits, for this
 * render only: the stored choice is left alone, so it returns when Size drops.
 */
export function effectiveFormat(id, size) {
  const want = describeFormat(id, size)
  if (!want.over) return want
  const fits = DOWNLOAD_FORMATS
    .filter(f => f.kind === 'png' && f.scale < want.scale)
    .map(f => describeFormat(f.id, size))
    .filter(f => !f.over)
  return fits.length ? fits[fits.length - 1] : describeFormat('png1', size)
}

/** `<name>.svg`, `<name>-96px.png`; the name is cleaned the way it always was. */
export function downloadFileName(iconName, format) {
  const base = (iconName || 'icon').replace(/[^\w.-]+/g, '-')
  return format.kind === 'svg' ? `${base}.svg` : `${base}-${format.px}px.png`
}

/**
 * Draw SVG markup (with width and height already set) into a transparent PNG.
 * Rejects when the browser cannot decode it or cannot encode the canvas.
 */
export async function svgToPngBlob(svgText) {
  const svgUrl = URL.createObjectURL(new Blob([svgText], { type: 'image/svg+xml' }))
  try {
    const img = new Image()
    img.src = svgUrl
    await img.decode()
    const w = img.naturalWidth || 0
    const h = img.naturalHeight || 0
    if (!w || !h) throw new Error('svg has no size')
    const canvas = document.createElement('canvas')
    canvas.width = w
    canvas.height = h
    const ctx = canvas.getContext('2d')
    if (!ctx) throw new Error('no canvas context')
    ctx.drawImage(img, 0, 0, w, h)
    return await new Promise((resolve, reject) => {
      canvas.toBlob(b => (b ? resolve(b) : reject(new Error('png encode failed'))), 'image/png')
    })
  } finally {
    URL.revokeObjectURL(svgUrl)
  }
}

/** Hand a blob to the browser as a file download. */
export function saveBlobAs(blob, fileName) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = fileName
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
