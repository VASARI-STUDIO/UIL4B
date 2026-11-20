// The book as PNGs, in the browser: the half of the book export that runs on the
// reader's machine. The layout (which pages exist, where every line of type sits)
// is Pro and is built on the server (api/_lib/bookPages.js, `export=document` with
// format `book-png`), which answers with plain draw operations. This file never
// plans a page. It does three things:
//
//   1. measureBookFaces(design)  loads the kit's fonts and measures them, so the server can wrap
//                                text to the real glyph widths (the table readBookMetrics checks)
//   2. paintBookPng(book)        draws the server's operations on canvases, one page at a time
//   3. zips the PNGs and returns the Blob
//
// Client-only: it uses canvas and the DOM, and must not import anything from api/.
// The names and keys it shares with the server (the font stacks, the metrics key, the
// file name) are held equal by tests/unit/book-raster.test.js.

import { readBook } from './bookModel.js'

// ── Fonts: the strings the server's operations name ─────────────────────────

const FALLBACK_STACK = 'system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif'
const MONO_STACK = 'ui-monospace, SFMono-Regular, Menlo, Consolas, "Liberation Mono", monospace'

/** A canvas font string: the kit's family first, then a stack that still reads. */
export const face = (weight, px, family) => `${weight} ${px}px "${family}", ${FALLBACK_STACK}`
export const mono = (weight, px) => `${weight} ${px}px ${MONO_STACK}`

// ── Drawing ─────────────────────────────────────────────────────────────────

function roundedPath(ctx, x, y, w, h, r) {
  const radius = Math.min(r, w / 2, h / 2)
  ctx.beginPath()
  ctx.moveTo(x + radius, y)
  ctx.arcTo(x + w, y, x + w, y + h, radius)
  ctx.arcTo(x + w, y + h, x, y + h, radius)
  ctx.arcTo(x, y + h, x, y, radius)
  ctx.arcTo(x, y, x + w, y, radius)
  ctx.closePath()
}

/** The start and end of a CSS-angle gradient across a box (0deg points up, clockwise). */
export function gradientLine({ x, y, w, h, angle }) {
  const rad = (angle * Math.PI) / 180
  const dx = Math.sin(rad)
  const dy = -Math.cos(rad)
  const length = Math.abs(w * dx) + Math.abs(h * dy)
  const cx = x + w / 2
  const cy = y + h / 2
  return { x0: cx - (dx * length) / 2, y0: cy - (dy * length) / 2, x1: cx + (dx * length) / 2, y1: cy + (dy * length) / 2 }
}

export function drawBookOps(ctx, ops) {
  for (const o of ops) {
    if (o.op === 'rect') {
      ctx.fillStyle = o.fill
      if (o.radius) { roundedPath(ctx, o.x, o.y, o.w, o.h, o.radius); ctx.fill() } else ctx.fillRect(o.x, o.y, o.w, o.h)
    } else if (o.op === 'strokeRect') {
      ctx.strokeStyle = o.stroke
      ctx.lineWidth = 1
      if (o.radius) { roundedPath(ctx, o.x + 0.5, o.y + 0.5, o.w - 1, o.h - 1, o.radius); ctx.stroke() } else ctx.strokeRect(o.x + 0.5, o.y + 0.5, o.w - 1, o.h - 1)
    } else if (o.op === 'line') {
      // A rule sits on a whole authored pixel, which is two whole device pixels at 2x.
      ctx.strokeStyle = o.stroke
      ctx.lineWidth = 1
      ctx.setLineDash(o.dash || [])
      ctx.beginPath()
      ctx.moveTo(o.x1, o.y1 + 0.5)
      ctx.lineTo(o.x2, o.y2 + 0.5)
      ctx.stroke()
      ctx.setLineDash([])
    } else if (o.op === 'gradient') {
      const { x0, y0, x1, y1 } = gradientLine(o)
      const fill = ctx.createLinearGradient(x0, y0, x1, y1)
      for (const s of o.stops) fill.addColorStop(Math.min(1, Math.max(0, s.position / 100)), s.color)
      ctx.fillStyle = fill
      if (o.radius) { roundedPath(ctx, o.x, o.y, o.w, o.h, o.radius); ctx.fill() } else ctx.fillRect(o.x, o.y, o.w, o.h)
    } else if (o.op === 'text') {
      ctx.fillStyle = o.fill
      ctx.font = o.font
      ctx.textAlign = o.align || 'left'
      ctx.textBaseline = 'alphabetic'
      const spaced = o.letterSpacing && 'letterSpacing' in ctx
      if (spaced) ctx.letterSpacing = `${o.letterSpacing}px`
      if (o.tabular) {
        // Canvas has no font-variant-numeric, so figures that must line up (a swatch index)
        // are set one to a cell, each as wide as the face zero.
        const pitch = ctx.measureText('0').width
        ctx.textAlign = 'center'
        ;[...o.text].forEach((ch, i) => ctx.fillText(ch, o.x + pitch * (i + 0.5), o.y))
      } else ctx.fillText(o.text, o.x, o.y)
      if (spaced) ctx.letterSpacing = '0px'
    }
  }
}

// ── Fonts: loading ──────────────────────────────────────────────────────────

// How long a render waits for one family stylesheet before it draws in the fallback.
const FONT_WAIT_MS = 6000
// The one deadline over the whole font step. A .woff2 that never arrives (so
// document.fonts.load never settles) must not hold the export, and the panel
// with it, for ever.
export const BOOK_FONT_DEADLINE_MS = 8000

/**
 * Load the kit faces and wait for them, for at most `deadlineMs` in all.
 * Resolves the families that did NOT arrive (empty when all did), so the
 * colophon can say so instead of claiming a face the pages are not set in. A
 * family still loading at the deadline counts as missing. Never rejects: a font
 * that cannot load is a fallback, not a failed export. `fontApi`
 * ({ loadFont, verifyFontLoaded }) can be injected; it defaults to the Google
 * Fonts helpers.
 */
export async function ensureBookFonts(d, { deadlineMs = BOOK_FONT_DEADLINE_MS, fontApi } = {}) {
  if (typeof document === 'undefined' || !document.fonts?.load) return []
  const families = [...new Set([d.heading, d.body])]
  const weights = [...new Set([400, 500, 600, 700, d.headingWeight, d.bodyWeight])]
  const finished = new Set()
  const failed = new Set()
  const timers = []
  const after = (ms) => new Promise((resolve) => { timers.push(setTimeout(resolve, ms)) })

  const work = (async () => {
    try {
      const { loadFont, verifyFontLoaded } = fontApi || await import('./googleFonts')
      await Promise.all(families.map(async (family) => {
        try {
          await Promise.race([Promise.resolve(loadFont(family, weights)).catch(() => null), after(FONT_WAIT_MS)])
          await Promise.all(weights.map((w) => Promise.resolve().then(() => document.fonts.load(face(w, 24, family))).catch(() => null)))
          const check = family === d.heading ? d.headingWeight : d.bodyWeight
          if ((await verifyFontLoaded(family, check, { timeout: 1500 })) === 'failed') failed.add(family)
        } catch { /* a family that errors is a fallback, not a failed export */ }
        finished.add(family)
      }))
    } catch { families.forEach((family) => finished.add(family)) /* the helper module would not load: draw in the fallback */ }
  })()

  await Promise.race([work, after(Math.max(0, deadlineMs))])
  timers.forEach(clearTimeout)
  return families.filter((family) => failed.has(family) || !finished.has(family))
}

// ── Measuring ───────────────────────────────────────────────────────────────

// The characters the table carries an advance for: printable ASCII and the marks the
// book copy and a project name are likely to use, by code point. Anything else is
// estimated by the server (0.55em, 0.62em in monospace), so a missing character is a
// slightly loose line, never a failure.
const MARK_CODES = [
  0xa0, 0xb0, 0xb1, 0xb7, 0xd7, 0xf7, 0x2013, 0x2014, 0x2018, 0x2019, 0x201c, 0x201d, 0x2022, 0x2026,
  0x2192, 0x2190, 0x2191, 0x2193, 0x2713, 0xa9, 0xae, 0x2122, 0xbd, 0xbc, 0xbe,
  0xe0, 0xe1, 0xe2, 0xe4, 0xe7, 0xe8, 0xe9, 0xea, 0xeb, 0xed, 0xee, 0xef, 0xf1, 0xf3, 0xf4, 0xf6, 0xfa, 0xfb, 0xfc,
  0xc0, 0xc1, 0xc9, 0xd1, 0xd6, 0xdc,
]
export const METRICS_CHARSET = [
  ...Array.from({ length: 95 }, (_, i) => String.fromCharCode(32 + i)),
  ...MARK_CODES.map((c) => String.fromCharCode(c)),
]
const FONT_SIZE = 100
const DIGITS = '0123456789'
// What the server accepts for a family in a key (api/_lib/bookPages.js readBookMetrics).
const FAMILY_OK = /^[A-Za-z0-9 _.-]{1,80}$/

/** The key of one face in the table: its weight and family, or `:mono`. Same as the server metricsKey. */
export const metricsKey = (weight, family) => `${weight}|${family ?? ':mono'}`

const round4 = (n) => Math.round(n * 10000) / 10000

function measureFace(ctx, font) {
  ctx.font = font
  const w = {}
  for (const ch of METRICS_CHARSET) w[ch] = round4(ctx.measureText(ch).width / FONT_SIZE)
  let hang = 0
  for (const ch of DIGITS) hang = Math.max(hang, ctx.measureText(ch).actualBoundingBoxDescent || 0)
  return { w, d: Math.min(1, round4(hang / FONT_SIZE)) }
}

/**
 * The table of glyph advances the server lays the book out with: for each face the
 * book is set in (the heading and body families at the weights it uses, and the
 * monospace stack), each character advance in em and how far a digit hangs below
 * the baseline. Measured with the canvas, so the fonts must be loaded first.
 */
export function buildBookMetrics(d, ctx) {
  const weights = [...new Set([400, 500, 600, 700, d.headingWeight, d.bodyWeight])]
    .filter((w) => Number.isInteger(w) && w >= 100 && w <= 900 && w % 100 === 0)
  const fonts = {}
  for (const family of new Set([d.heading, d.body])) {
    if (typeof family !== 'string' || !FAMILY_OK.test(family)) continue
    for (const w of weights) fonts[metricsKey(w, family)] = measureFace(ctx, face(w, FONT_SIZE, family))
  }
  for (const w of [400, 500, 600, 700]) fonts[metricsKey(w, null)] = measureFace(ctx, mono(w, FONT_SIZE))
  return { fonts }
}

/**
 * Load the kit fonts, then measure them. Resolves { metrics, missingFonts }: the
 * table for the server, and the families that did not load (the colophon says so).
 * Never rejects over a font; a browser with no canvas throws, which the runner
 * reports as a failed export.
 */
export async function measureBookFaces(design, { fontApi, deadlineMs } = {}) {
  const d = readBook(design)
  const missingFonts = await ensureBookFonts(d, { fontApi, deadlineMs })
  const canvas = document.createElement('canvas')
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('This browser could not create a canvas to draw the book.')
  const metrics = buildBookMetrics(d, ctx)
  canvas.width = 0
  return { metrics, missingFonts }
}

// ── Painting ────────────────────────────────────────────────────────────────

/** `page-01.png`, with enough digits that the files sort in order. Same as the server pageFileName. */
export function pageFileName(index, total) {
  const digits = Math.max(2, String(total).length)
  return `page-${String(index + 1).padStart(digits, '0')}.png`
}

// A canvas is at most this many pixels on a side; the book is 1448 x 2048.
const MAX_SIDE = 4096

/** Throws an Error saying what is wrong unless the route answer for `book-png` holds what the painter needs. */
export function checkBookResponse(book) {
  const scale = Number(book?.scale)
  const ok = book && Array.isArray(book.pages) && book.pages.length > 0
    && Number(book.page?.width) > 0 && Number(book.page?.height) > 0
    && scale >= 1 && scale <= 4
    && Number(book.page.width) * scale <= MAX_SIDE && Number(book.page.height) * scale <= MAX_SIDE
    && typeof book.paper === 'string'
    && book.pages.every((p) => p && Array.isArray(p.ops))
  if (!ok) throw new Error('The book came back in a shape this browser could not draw.')
}

const toPng = (canvas) => new Promise((resolve, reject) => {
  canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error('A page of the book could not be encoded.'))), 'image/png')
})

/**
 * Draw the server pages and zip them as page-01.png, page-02.png and so on. PNGs
 * are already compressed, so the zip stores them as they are. One canvas is alive
 * at a time, which is what keeps a long book from holding tens of megabytes per page
 * at once. `book` is the route answer: { pages: [{ ops }], paper, page: { width, height }, scale }.
 */
export async function paintBookPng(book) {
  checkBookResponse(book)
  const { pages, paper, page, scale } = book
  const { default: JSZip } = await import('jszip')
  const zip = new JSZip()
  for (let i = 0; i < pages.length; i += 1) {
    const canvas = document.createElement('canvas')
    canvas.width = page.width * scale
    canvas.height = page.height * scale
    const ctx = canvas.getContext('2d')
    if (!ctx) throw new Error('This browser could not create a canvas to draw the book.')
    ctx.scale(scale, scale)
    ctx.imageSmoothingQuality = 'high'
    if ('fontKerning' in ctx) ctx.fontKerning = 'normal'
    if ('textRendering' in ctx) ctx.textRendering = 'geometricPrecision'
    // Paint the paper first so no page can come out transparent.
    ctx.fillStyle = paper
    ctx.fillRect(0, 0, page.width, page.height)
    drawBookOps(ctx, pages[i].ops)
    zip.file(pageFileName(i, pages.length), await toPng(canvas))
    canvas.width = 0
    canvas.height = 0
  }
  return zip.generateAsync({ type: 'blob', compression: 'STORE' })
}
