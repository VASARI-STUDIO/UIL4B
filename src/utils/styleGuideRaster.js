// The style guide as an image — a single A4 sheet, PNG or JPEG.
//
// ─────────────────────────────────────────────────────────────────────────────
// WHY DRAW IT RATHER THAN RASTERISE THE HTML
// ─────────────────────────────────────────────────────────────────────────────
// The obvious route is html2canvas or an SVG <foreignObject>. Both were wrong
// here:
//
//   • <foreignObject> → canvas silently drops webfonts in several browsers and
//     taints the canvas the moment anything external is referenced, so the
//     download either fails or comes out in Times New Roman. A style guide that
//     misrepresents the user's typography is worse than no image.
//   • html2canvas is a ~200KB dependency that reimplements a layout engine
//     approximately.
//
// This document is not arbitrary HTML. It is a known structure over known data
// (palette, type ladder, contrast grades), so drawing it directly is exact,
// dependency-free and deterministic — the same design always yields the same
// pixels, which is also what makes it testable.
//
// ─────────────────────────────────────────────────────────────────────────────
// WHY ONE SHEET, NOT THE HTML VERSION'S FOUR PAGES
// ─────────────────────────────────────────────────────────────────────────────
// An image export is for pasting into a deck, a Slack thread or a handoff
// ticket. Four separate PNGs would need a zip (another dependency) and nobody
// pastes four images. The four-page booklet already exists as HTML → print to
// PDF. This is the one-sheet summary that answers "what does this system look
// like" at a glance.
//
// THE LAYOUT IS A PURE FUNCTION returning draw operations. Canvas only appears
// in drawOps/renderStyleGuideImage, so the composition can be unit-tested
// without a DOM. See tests/unit/style-guide-raster.test.js.
// Explicit .js: Vite resolves either form, but `node --test` (which runs the
// layout tests directly against this file) will not. Matches the convention
// already used by colorHandoff.js, paletteAdjust.js and the rest.
import { readDesign, typeLadder, contrast, inkFor, grade } from './styleGuideExport.js'

// A4 at 96dpi. The sheet is authored at these dimensions and scaled up at draw
// time, so every measurement below reads in familiar CSS pixels.
export const A4 = Object.freeze({ width: 794, height: 1123 })
export const MARGIN = 56

const INK = '#111318'
const MUTED = '#5F5F69'
const HAIRLINE = '#E3E4E8'
const PAPER = '#FFFFFF'

const round = (n) => Math.round(n * 100) / 100

// ── Layout ──────────────────────────────────────────────────────────────────

/**
 * Compose the sheet as an ordered list of draw operations.
 *
 * Ops are deliberately primitive — rect, text, line — so drawOps stays a dumb
 * interpreter and every layout decision is here, in testable arithmetic.
 */
export function buildStyleGuideLayout(design, { projectName = 'Design System', watermark = true, date = new Date() } = {}) {
  const d = readDesign(design)
  const ops = []
  const contentWidth = A4.width - MARGIN * 2
  let y = MARGIN

  ops.push({ op: 'rect', x: 0, y: 0, w: A4.width, h: A4.height, fill: PAPER })

  // ── Masthead ──────────────────────────────────────────────────────────────
  // The seed colour becomes a full-bleed rule at the top: the single most
  // recognisable thing about a system, visible in a thumbnail.
  if (d.base) {
    ops.push({ op: 'rect', x: 0, y: 0, w: A4.width, h: 10, fill: d.base })
    y += 10
  }

  ops.push({
    op: 'text', text: 'STYLE GUIDE', x: MARGIN, y: y + 18,
    font: `600 11px ${JSON.stringify(d.body)}`, fill: MUTED, letterSpacing: 2,
  })
  y += 42

  ops.push({
    op: 'text', text: projectName, x: MARGIN, y: y + 30,
    font: `${d.headingWeight} 34px ${JSON.stringify(d.heading)}`, fill: INK,
    maxWidth: contentWidth,
  })
  y += 54

  ops.push({
    op: 'text',
    text: `${d.heading} · ${d.body} · ${d.baseSize}px base · ${d.ratio} scale`,
    x: MARGIN, y: y + 14,
    font: `400 12px ${JSON.stringify(d.body)}`, fill: MUTED, maxWidth: contentWidth,
  })
  y += 34

  ops.push({ op: 'line', x1: MARGIN, y1: y, x2: A4.width - MARGIN, y2: y, stroke: HAIRLINE })
  y += 36

  // ── Palette ───────────────────────────────────────────────────────────────
  ops.push({
    op: 'text', text: 'Colour', x: MARGIN, y: y + 14,
    font: `${d.headingWeight} 16px ${JSON.stringify(d.heading)}`, fill: INK,
  })
  y += 30

  const swatches = d.palette.slice(0, 12)
  if (swatches.length) {
    // Fill the width exactly: a trailing gap on the right reads as a mistake in
    // a document whose whole job is looking considered.
    const perRow = Math.min(6, swatches.length)
    const gap = 10
    const cellW = (contentWidth - gap * (perRow - 1)) / perRow
    const cellH = 96

    swatches.forEach((hex, i) => {
      const col = i % perRow
      const row = Math.floor(i / perRow)
      const x = MARGIN + col * (cellW + gap)
      const top = y + row * (cellH + gap + 26)

      ops.push({ op: 'rect', x, y: top, w: cellW, h: cellH, fill: hex, radius: 8 })
      // A near-white swatch is invisible on white paper without an edge.
      if (contrast(hex, PAPER) < 1.35) {
        ops.push({ op: 'strokeRect', x, y: top, w: cellW, h: cellH, stroke: HAIRLINE, radius: 8 })
      }

      // The hex sits INSIDE the swatch in whichever ink actually passes on it —
      // the same inkFor() the HTML guide uses, so the two agree.
      ops.push({
        op: 'text', text: hex, x: x + 10, y: top + cellH - 12,
        font: `600 11px ${JSON.stringify(d.body)}`, fill: inkFor(hex).ink,
      })

      // Contrast evidence under each swatch: the number, and what it passes.
      const onWhite = contrast(hex, '#FFFFFF')
      ops.push({
        op: 'text', text: `${round(onWhite)}:1 on white · ${grade(onWhite)}`,
        x, y: top + cellH + 16,
        font: `400 10px ${JSON.stringify(d.body)}`, fill: MUTED, maxWidth: cellW,
      })
    })

    const rows = Math.ceil(swatches.length / perRow)
    y += rows * (cellH + gap + 26) + 14
  } else {
    ops.push({
      op: 'text', text: 'No palette saved yet.', x: MARGIN, y: y + 12,
      font: `400 12px ${JSON.stringify(d.body)}`, fill: MUTED,
    })
    y += 34
  }

  ops.push({ op: 'line', x1: MARGIN, y1: y, x2: A4.width - MARGIN, y2: y, stroke: HAIRLINE })
  y += 36

  // ── Type ladder ───────────────────────────────────────────────────────────
  ops.push({
    op: 'text', text: 'Typography', x: MARGIN, y: y + 14,
    font: `${d.headingWeight} 16px ${JSON.stringify(d.heading)}`, fill: INK,
  })
  y += 30

  const ladder = typeLadder(d)
  const labelW = 96
  for (const step of ladder) {
    // Cap the drawn size so Display cannot run off the sheet on an aggressive
    // ratio — the LABEL still states the true size, so the document stays
    // truthful even where it is not to scale.
    const drawn = Math.min(step.px, 40)
    const rowH = Math.max(24, drawn * 1.25)
    if (y + rowH > A4.height - MARGIN - 40) break   // never overflow the page

    ops.push({
      op: 'text', text: step.name, x: MARGIN, y: y + rowH * 0.72,
      font: `600 10px ${JSON.stringify(d.body)}`, fill: MUTED, maxWidth: labelW - 8,
    })
    ops.push({
      op: 'text', text: `${round(step.px)}px`, x: MARGIN + labelW - 34, y: y + rowH * 0.72,
      font: `400 10px ${JSON.stringify(d.body)}`, fill: MUTED,
    })
    ops.push({
      op: 'text', text: 'The quick brown fox',
      x: MARGIN + labelW, y: y + rowH * 0.72,
      font: `${step.exp > 0 ? d.headingWeight : d.bodyWeight} ${drawn}px ${JSON.stringify(step.exp > 0 ? d.heading : d.body)}`,
      fill: INK, maxWidth: contentWidth - labelW,
    })
    y += rowH + 6
  }

  // ── Footer ────────────────────────────────────────────────────────────────
  const footY = A4.height - MARGIN + 8
  ops.push({ op: 'line', x1: MARGIN, y1: footY - 22, x2: A4.width - MARGIN, y2: footY - 22, stroke: HAIRLINE })
  ops.push({
    op: 'text',
    text: date.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }),
    x: MARGIN, y: footY,
    font: `400 10px ${JSON.stringify(d.body)}`, fill: MUTED,
  })
  if (watermark) {
    // Free exports carry the credit; Pro exports are clean. Same policy as the
    // HTML guide, read from the live entitlement by the caller.
    ops.push({
      op: 'text', text: 'Made with UIL4B — uil4b.com', x: A4.width - MARGIN, y: footY,
      font: `400 10px ${JSON.stringify(d.body)}`, fill: MUTED, align: 'right',
    })
  }

  return ops
}

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

export function drawOps(ctx, ops) {
  for (const o of ops) {
    if (o.op === 'rect') {
      ctx.fillStyle = o.fill
      if (o.radius) { roundedPath(ctx, o.x, o.y, o.w, o.h, o.radius); ctx.fill() }
      else ctx.fillRect(o.x, o.y, o.w, o.h)
    } else if (o.op === 'strokeRect') {
      ctx.strokeStyle = o.stroke
      ctx.lineWidth = 1
      if (o.radius) { roundedPath(ctx, o.x, o.y, o.w, o.h, o.radius); ctx.stroke() }
      else ctx.strokeRect(o.x, o.y, o.w, o.h)
    } else if (o.op === 'line') {
      ctx.strokeStyle = o.stroke
      ctx.lineWidth = 1
      ctx.beginPath()
      // The half-pixel offset keeps a 1px hairline crisp instead of smeared
      // across two rows of pixels.
      ctx.moveTo(o.x1, o.y1 + 0.5)
      ctx.lineTo(o.x2, o.y2 + 0.5)
      ctx.stroke()
    } else if (o.op === 'text') {
      ctx.fillStyle = o.fill
      ctx.font = o.font
      ctx.textAlign = o.align || 'left'
      ctx.textBaseline = 'alphabetic'
      if (o.letterSpacing && 'letterSpacing' in ctx) ctx.letterSpacing = `${o.letterSpacing}px`
      ctx.fillText(o.text, o.x, o.y, o.maxWidth)
      if (o.letterSpacing && 'letterSpacing' in ctx) ctx.letterSpacing = '0px'
    }
  }
}

/**
 * Render the sheet and resolve a Blob.
 *
 * `scale` is a device-pixel multiplier: 2 gives a 1588×2246 image, which is
 * sharp on a retina screen and prints acceptably at A4.
 */
export function renderStyleGuideImage(design, {
  projectName = 'Design System', watermark = true, format = 'png', scale = 2, date = new Date(),
} = {}) {
  const canvas = document.createElement('canvas')
  canvas.width = Math.round(A4.width * scale)
  canvas.height = Math.round(A4.height * scale)
  const ctx = canvas.getContext('2d')
  if (!ctx) return Promise.reject(new Error('This browser could not create a canvas to draw the image.'))

  ctx.scale(scale, scale)
  // JPEG has no alpha, so an unpainted background comes out black. Paint the
  // paper explicitly rather than relying on the first layout op.
  ctx.fillStyle = PAPER
  ctx.fillRect(0, 0, A4.width, A4.height)

  drawOps(ctx, buildStyleGuideLayout(design, { projectName, watermark, date }))

  const mime = format === 'jpeg' ? 'image/jpeg' : 'image/png'
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error('The image could not be encoded.'))),
      mime,
      format === 'jpeg' ? 0.92 : undefined,
    )
  })
}
