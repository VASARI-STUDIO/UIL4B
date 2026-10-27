// The small pictures that sell the two Pro documents: the first three pages of
// the design system book, or of the brand guidelines, drawn from the person's
// own system, in the template they have picked. This file lays out the default
// templates (Specification, Presentation); proPreviewTemplates.js lays out the rest.
//
// ─────────────────────────────────────────────────────────────────────────────
// WHAT THESE ARE, AND WHAT THEY ARE NOT
// ─────────────────────────────────────────────────────────────────────────────
// A preview is a RASTER IMAGE, never the document. The pages are drawn straight
// onto a canvas at thumbnail size (book 120×170, guidelines 160×90 CSS px, at a
// device-pixel ratio of 1) and encoded to WebP. There is no text layer and no
// HTML anywhere near the DOM, so a free account that opens the inspector finds
// an <img> of a few kilobytes and nothing to lift. The full document is only
// built when Export runs, and that path checks the plan first.
//
// For a free account the blur is BAKED INTO THE PIXELS before encoding. Removing
// a CSS class in devtools reveals nothing, because there is no sharp version in
// the page to reveal.
//
// THE HONEST LIMIT. The generators ship in the client bundle and the Pro check
// is client-side (ExportPanel.runExport), so this deters casual copying and is
// not protection. Real protection needs the document built on a server.
//
// Like utils/styleGuideRaster.js, the layout is a pure function returning draw
// operations, so the composition is testable without a DOM; only
// renderProPreviews touches a canvas.
import { readDesign, contrast, inkFor } from './styleGuideExport.js'
import { drawOps } from './styleGuideRaster.js'
import { readLogo } from './brandLogo.js'
import { previewTemplate } from './proPreviewKey.js'
import { font, colours, buildTemplatePreviewPages } from './proPreviewTemplates.js'

// Pages are authored at four times the thumbnail so type reads in familiar
// pixels, then drawn at PREVIEW_SCALE. The thumbnail is what lands in the page.
export const PREVIEW_SCALE = 0.25
export const BOOK_PAGE = Object.freeze({ width: 480, height: 680 })
export const GUIDELINES_PAGE = Object.freeze({ width: 640, height: 360 })
// Thumbnail sizes in CSS pixels: what the <img> is created and displayed at.
export const THUMB_SIZE = Object.freeze({
  book: Object.freeze({ width: 120, height: 170 }),
  guidelines: Object.freeze({ width: 160, height: 90 }),
})
export const BLUR_PX = 6

const INK = '#111318'
const MUTED = '#5F5F69'
const HAIRLINE = '#E3E4E8'
const PAPER = '#FFFFFF'
// ── Layout ──────────────────────────────────────────────────────────────────

/** The book's first three pages: cover, colour specimen, contrast matrix. */
export function buildBookPreviewPages(design, { projectName = 'Design System' } = {}) {
  const d = readDesign(design)
  const palette = colours(d)
  const base = d.base || palette[0]
  const { width: W, height: H } = BOOK_PAGE
  const M = 40

  // 1. Cover — the seed colour as a full-bleed field, the name set in the
  // heading face.
  const cover = [
    { op: 'rect', x: 0, y: 0, w: W, h: H, fill: PAPER },
    { op: 'rect', x: 0, y: 0, w: W, h: 330, fill: base },
    { op: 'text', text: 'DESIGN SYSTEM BOOK', x: M, y: 388, font: font(600, 15, d.body), fill: MUTED, letterSpacing: 2 },
    { op: 'text', text: projectName, x: M, y: 450, font: font(d.headingWeight, 46, d.heading), fill: INK, maxWidth: W - M * 2 },
    { op: 'text', text: `${d.heading} · ${d.body}`, x: M, y: 490, font: font(400, 17, d.body), fill: MUTED, maxWidth: W - M * 2 },
  ]
  palette.slice(0, 8).forEach((hex, i, all) => {
    const gap = 8
    const w = (W - M * 2 - gap * (all.length - 1)) / all.length
    cover.push({ op: 'rect', x: M + i * (w + gap), y: H - 96, w, h: 36, fill: hex, radius: 4 })
  })

  // 2. Colour specimen — full-bleed blocks, each with the ink that passes on it.
  const specimen = [{ op: 'rect', x: 0, y: 0, w: W, h: H, fill: PAPER }]
  specimen.push({ op: 'text', text: 'Colour', x: M, y: 80, font: font(d.headingWeight, 34, d.heading), fill: INK })
  const blocks = palette.slice(0, 5)
  const top = 120
  const blockH = (H - top) / blocks.length
  blocks.forEach((hex, i) => {
    const y = top + i * blockH
    const ink = inkFor(hex).ink
    specimen.push({ op: 'rect', x: 0, y, w: W, h: blockH, fill: hex })
    specimen.push({ op: 'text', text: hex, x: M, y: y + blockH - 28, font: font(600, 20, d.body), fill: ink })
    specimen.push({ op: 'text', text: `${contrast(hex, ink)}:1`, x: W - M, y: y + blockH - 28, font: font(400, 16, d.body), fill: ink, align: 'right' })
  })

  // 3. Contrast matrix — every colour set against every other.
  const matrix = [{ op: 'rect', x: 0, y: 0, w: W, h: H, fill: PAPER }]
  matrix.push({ op: 'text', text: 'Contrast matrix', x: M, y: 80, font: font(d.headingWeight, 34, d.heading), fill: INK })
  const set = palette.slice(0, 6)
  const grid = W - M * 2
  const cell = grid / set.length
  set.forEach((bg, row) => {
    set.forEach((fg, col) => {
      const x = M + col * cell
      const y = 130 + row * cell
      matrix.push({ op: 'rect', x, y, w: cell, h: cell, fill: bg })
      if (row !== col) {
        matrix.push({ op: 'text', text: 'Aa', x: x + 10, y: y + cell / 2 + 8, font: font(700, 22, d.body), fill: fg, maxWidth: cell - 12 })
      }
    })
  })
  matrix.push({ op: 'line', x1: M, y1: 130 + set.length * cell + 24, x2: W - M, y2: 130 + set.length * cell + 24, stroke: HAIRLINE })

  return [
    { id: 'cover', title: 'cover', ...BOOK_PAGE, ops: cover },
    { id: 'colour', title: 'colour specimen', ...BOOK_PAGE, ops: specimen },
    { id: 'contrast', title: 'contrast matrix', ...BOOK_PAGE, ops: matrix },
  ]
}

/** The guidelines' first three pages: cover, swatches, logo on every ground. */
export function buildGuidelinesPreviewPages(design, { projectName = 'Design System', logo = null } = {}) {
  const d = readDesign(design)
  const palette = colours(d)
  const base = d.base || palette[0]
  const { width: W, height: H } = GUIDELINES_PAGE
  const M = 44

  const cover = [
    { op: 'rect', x: 0, y: 0, w: W, h: H, fill: base },
    { op: 'text', text: 'BRAND GUIDELINES', x: M, y: 70, font: font(600, 15, d.body), fill: inkFor(base).ink, letterSpacing: 2 },
    { op: 'text', text: projectName, x: M, y: H - 70, font: font(d.headingWeight, 64, d.heading), fill: inkFor(base).ink, maxWidth: W - M * 2 },
  ]

  const swatches = [{ op: 'rect', x: 0, y: 0, w: W, h: H, fill: PAPER }]
  swatches.push({ op: 'text', text: 'Colour', x: M, y: 74, font: font(d.headingWeight, 32, d.heading), fill: INK })
  const row = palette.slice(0, 6)
  const gap = 12
  const w = (W - M * 2 - gap * (row.length - 1)) / row.length
  row.forEach((hex, i) => {
    const x = M + i * (w + gap)
    swatches.push({ op: 'rect', x, y: 110, w, h: 150, fill: hex, radius: 8 })
    if (contrast(hex, PAPER) < 1.35) swatches.push({ op: 'strokeRect', x, y: 110, w, h: 150, stroke: HAIRLINE, radius: 8 })
    swatches.push({ op: 'text', text: hex, x, y: 290, font: font(600, 14, d.body), fill: INK, maxWidth: w })
  })

  // The logo on paper, on ink and on the brand colour. With no logo uploaded the
  // grounds carry the name set in the heading face, which is as far as the
  // preview can honestly go: the real document says which pages it leaves out.
  const grounds = [PAPER, INK, base]
  const tileGap = 14
  const tileW = (W - M * 2 - tileGap * 2) / 3
  const logoPage = [{ op: 'rect', x: 0, y: 0, w: W, h: H, fill: PAPER }]
  logoPage.push({ op: 'text', text: 'Logo', x: M, y: 74, font: font(d.headingWeight, 32, d.heading), fill: INK })
  grounds.forEach((fill, i) => {
    const x = M + i * (tileW + tileGap)
    const ink = inkFor(fill).ink
    logoPage.push({ op: 'rect', x, y: 110, w: tileW, h: 180, fill, radius: 8 })
    if (fill === PAPER) logoPage.push({ op: 'strokeRect', x, y: 110, w: tileW, h: 180, stroke: HAIRLINE, radius: 8 })
    if (logo) {
      logoPage.push({ op: 'image', x: x + 24, y: 140, w: tileW - 48, h: 120 })
    } else {
      logoPage.push({ op: 'text', text: projectName, x: x + 16, y: 210, font: font(d.headingWeight, 22, d.heading), fill: ink, maxWidth: tileW - 32 })
    }
  })

  return [
    { id: 'cover', title: 'cover', ...GUIDELINES_PAGE, ops: cover },
    { id: 'swatches', title: 'swatches', ...GUIDELINES_PAGE, ops: swatches },
    { id: 'logo', title: 'logo on every ground', ...GUIDELINES_PAGE, ops: logoPage },
  ]
}

// ── Drawing ─────────────────────────────────────────────────────────────────

// How long a draw waits for the system's faces before it draws in the fallback.
const FONT_WAIT_MS = 800

/**
 * Wait briefly for the system's own faces, so a preview is set in them. Resolves
 * `{ settled, ready }`: `settled` is false when the wait ran out with a face still
 * downloading, and `ready` resolves when every face has finished (loaded or failed).
 * Besides the heading and body weights it asks for the ones the templates draw with:
 * regular for the chrome labels, and 600 (Poster) and 700 (Grid) in the body face.
 */
async function settleFonts(d) {
  if (typeof document === 'undefined' || !document.fonts?.load) return { settled: true, ready: Promise.resolve() }
  const faces = [...new Set([
    font(d.headingWeight, 24, d.heading), font(400, 24, d.heading),
    font(d.bodyWeight, 16, d.body), font(400, 16, d.body), font(600, 16, d.body), font(700, 16, d.body),
  ])]
  // A face that fails to load will never arrive, so a failure counts as finished.
  const ready = Promise.all(faces.map((f) => Promise.resolve(document.fonts.load(f)).catch(() => null))).then(() => {})
  let timer
  const settled = await Promise.race([
    ready.then(() => true),
    new Promise((resolve) => { timer = setTimeout(() => resolve(false), FONT_WAIT_MS) }),
  ])
  clearTimeout(timer)
  return { settled, ready }
}

function loadImage(src) {
  return new Promise((resolve) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = () => resolve(null)
    img.src = src
  })
}

function drawPage(ctx, page, logoImage) {
  for (const o of page.ops) {
    if (o.op !== 'image') { drawOps(ctx, [o]); continue }
    if (!logoImage) continue
    // Fit inside the box without distorting, centred.
    const k = Math.min(o.w / logoImage.naturalWidth, o.h / logoImage.naturalHeight) || 1
    const w = logoImage.naturalWidth * k
    const h = logoImage.naturalHeight * k
    ctx.drawImage(logoImage, o.x + (o.w - w) / 2, o.y + (o.h - h) / 2, w, h)
  }
}

// Whether the canvas will honour `ctx.filter`. Safari has been the holdout, and
// assigning an unsupported filter silently does nothing, so read it back.
function filterSupported(ctx) {
  if (!('filter' in ctx)) return false
  ctx.filter = `blur(${BLUR_PX}px)`
  const ok = ctx.filter === `blur(${BLUR_PX}px)`
  ctx.filter = 'none'
  return ok
}

/**
 * Return a new canvas holding a blurred copy of `source`. The blur is applied to
 * pixels, so nothing sharper survives anywhere. Edges are padded first so the
 * blur does not fade the page into transparency at its border.
 */
export function bakeBlur(source, radius = BLUR_PX) {
  const pad = radius * 3
  const w = source.width
  const h = source.height
  const padded = document.createElement('canvas')
  padded.width = w + pad * 2
  padded.height = h + pad * 2
  const pctx = padded.getContext('2d')
  pctx.drawImage(source, 0, 0, padded.width, padded.height)
  pctx.drawImage(source, pad, pad)

  const blurred = document.createElement('canvas')
  blurred.width = padded.width
  blurred.height = padded.height
  const bctx = blurred.getContext('2d')
  if (filterSupported(bctx)) {
    bctx.filter = `blur(${radius}px)`
    bctx.drawImage(padded, 0, 0)
    bctx.filter = 'none'
  } else {
    // No canvas filter: shrink and enlarge twice with smoothing on. It is a
    // softer blur than the real one but just as destructive.
    bctx.imageSmoothingEnabled = true
    bctx.imageSmoothingQuality = 'high'
    let from = padded
    for (const k of [4, 2]) {
      const step = document.createElement('canvas')
      step.width = Math.max(1, Math.round(from.width / k))
      step.height = Math.max(1, Math.round(from.height / k))
      const sctx = step.getContext('2d')
      sctx.imageSmoothingEnabled = true
      sctx.imageSmoothingQuality = 'high'
      sctx.drawImage(from, 0, 0, step.width, step.height)
      from = step
    }
    bctx.drawImage(from, 0, 0, blurred.width, blurred.height)
  }

  const out = document.createElement('canvas')
  out.width = w
  out.height = h
  out.getContext('2d').drawImage(blurred, pad, pad, w, h, 0, 0, w, h)
  return out
}

const encode = (canvas) => new Promise((resolve, reject) => {
  canvas.toBlob(
    (blob) => (blob ? resolve(blob) : reject(new Error('A preview could not be encoded.'))),
    'image/webp',
    0.8,
  )
})

/**
 * Draw the first three pages of a Pro document as small images.
 *
 * `kind` is 'book' or 'guidelines'. `template` is the row's chosen template id: the
 * cover and the next two pages are drawn in that layout from the same design, and an
 * id that is not a live template of the row draws the default. With `blurred` the
 * blur is baked into the pixels. Resolves `[{ id, title, blob, width, height }]` in
 * page order. When the faces had not all arrived in time the array also carries
 * `stale: true` and `fontsReady` (a promise): those pages are drawn in a fallback face
 * and should not be cached.
 */
export async function renderProPreviews(design, kind, { projectName = 'Design System', blurred = true, template } = {}) {
  const d = readDesign(design)
  const fonts = await settleFonts(d)

  const chosen = previewTemplate(kind, template)
  const size = kind === 'guidelines' ? GUIDELINES_PAGE : BOOK_PAGE
  let logoImage = null
  let pages
  if (kind === 'guidelines') {
    const logo = readLogo(design)
    logoImage = logo ? await loadImage(logo.src) : null
    const withLogo = logoImage ? logo : null
    pages = buildTemplatePreviewPages(kind, chosen, design, { projectName, logo: withLogo, size })
      || buildGuidelinesPreviewPages(design, { projectName, logo: withLogo })
  } else {
    pages = buildTemplatePreviewPages(kind, chosen, design, { projectName, size })
      || buildBookPreviewPages(design, { projectName })
  }

  const out = []
  for (const page of pages) {
    const canvas = document.createElement('canvas')
    canvas.width = Math.round(page.width * PREVIEW_SCALE)
    canvas.height = Math.round(page.height * PREVIEW_SCALE)
    const ctx = canvas.getContext('2d')
    if (!ctx) throw new Error('This browser could not create a canvas to draw the preview.')
    ctx.scale(PREVIEW_SCALE, PREVIEW_SCALE)
    ctx.imageSmoothingQuality = 'high'
    drawPage(ctx, page, logoImage)
    const final = blurred ? bakeBlur(canvas) : canvas
    out.push({ id: page.id, title: page.title, blob: await encode(final), width: final.width, height: final.height })
  }
  // Drawn before every face arrived: the caller must not keep these, and can draw again on `fontsReady`.
  if (!fonts.settled) Object.assign(out, { stale: true, fontsReady: fonts.ready })
  return out
}
