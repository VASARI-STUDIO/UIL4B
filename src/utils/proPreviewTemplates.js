// The strip's pages for the templates other than the default: the cover and the next
// two pages of Monograph, Atlas, Poster and Grid, drawn from the person's own palette,
// type and name. Each template keeps its own composition (Monograph's mirrored margins
// and margin notes, Atlas's weighted bands and full-bleed plates, Poster's one colour per
// slide, Grid's masthead and columns) and takes its paper, ink, muted and rule from
// deriveRoles, the same function the real documents read.
//
// Pure layout, like proPreviews.js: every function returns draw operations, so the
// compositions are testable without a canvas. Pages are authored at four times the
// thumbnail, in the same units the documents use (mm and pt), scaled to the page width.
// The default templates (Specification, Presentation) are laid out in proPreviews.js.
import { readDesign, contrast, inkFor, typeLadder } from './styleGuideExport.js'
import { deriveRoles, isNeutral, mixHex, softInk } from './exportTemplates/roles.js'
import { fitTitle, titleWidth, paletteLayout, MAX_SLOTS } from './exportTemplates/shared.js'
import { colorName } from './paletteNames.js'

// A neutral ramp for a system with no palette yet, so the layout still reads.
export const NEUTRALS = ['#D9DBE1', '#B4B8C2', '#8B90A0', '#5F5F69', '#111318']

export const font = (weight, size, family) => `${weight} ${size}px ${JSON.stringify(family)}`
// Generic stacks go in unquoted, so the canvas reads them as keywords.
const serif = (weight, size) => `${weight} ${size}px Georgia, serif`
const mono = (weight, size) => `${weight} ${size}px ui-monospace, Menlo, Consolas, monospace`

export const colours = (d) => (d.palette.length ? d.palette : NEUTRALS)

const MM_PT = 72 / 25.4
const KIND_WORD = { primary: 'Primary', accent: 'Accent', neutral: 'Neutral' }
const rgbOf = (hex) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16)).join(' ')
const inkWord = (ink) => (/^#0+$/.test(ink) ? 'Black' : 'White')

/** Greedy line breaks by average advance. A word longer than a line stays whole; the canvas squeezes it to its maxWidth. */
function wrapLines(text, size, measure, maxLines, advance = 0.52) {
  const cap = Math.max(1, Math.floor(measure / (size * advance)))
  const lines = []
  let line = ''
  for (const word of String(text ?? '').trim().split(/\s+/).filter(Boolean)) {
    const next = line ? `${line} ${word}` : word
    if (!line || titleWidth(next) <= cap) { line = next; continue }
    lines.push(line)
    line = word
  }
  if (line) lines.push(line)
  if (lines.length <= maxLines) return lines
  const kept = lines.slice(0, maxLines)
  kept[maxLines - 1] = `${kept[maxLines - 1]}…`
  return kept
}

/** The name set at the first step that fits: { size (pt), lines, clamp, broken }. Steps, measure and size share one unit. */
function setTitle(name, { steps, maxLines, measure, advance = 0.52 }) {
  const fit = fitTitle(name, { steps, maxLines, measure, advance })
  return { ...fit, lines: wrapLines(name, fit.size, measure, maxLines, advance) }
}

/** What every template reads: the colours as slots, the page roles, and the size of a unit. */
function groundFor(design, size, mmAcross) {
  const d = readDesign(design)
  const palette = colours(d)
  const primary = d.base || palette[0]
  const slots = palette.slice(0, MAX_SLOTS).map((hex, i) => ({
    i,
    hex,
    kind: i === 0 ? 'primary' : isNeutral(hex) ? 'neutral' : 'accent',
    ink: inkFor(hex).ink,
    ratio: inkFor(hex).ratio,
    name: colorName(hex),
  }))
  const k = size.width / mmAcross
  return {
    d, slots, primary, W: size.width, H: size.height, k,
    pt: k / MM_PT,
    roles: deriveRoles(palette, { contrast, primary }),
    head: (s) => font(d.headingWeight, s, d.heading),
    body: (w, s) => font(w, s, d.body),
  }
}

const page = (g, id, title, ops) => ({ id, title, width: g.W, height: g.H, ops })

/* ── Monograph: an editorial book ─────────────────────────────────────────── */

function monograph(g, { projectName }) {
  const { slots, roles, W, H, k, pt } = g
  const inner = 22 * k
  const text = 110 * k
  const note = 40 * k
  const gap = 6 * k
  const wide = text + gap + note
  const paper = { op: 'rect', x: 0, y: 0, w: W, h: H, fill: roles.paper }
  const runningHead = (label) => ({ op: 'text', text: label, x: inner, y: 12 * k + 6 * pt, font: serif(400, 8 * pt), fill: roles.muted, letterSpacing: 0.4 })
  const folio = (n) => ({ op: 'text', text: String(n), x: inner + text, y: H - 12 * k, font: serif(400, 8 * pt), fill: roles.muted, align: 'right' })

  // Cover: the name in the heading face on the paper, a square of the seed colour under it.
  const title = setTitle(projectName, { steps: [40, 32, 26], maxLines: 3, measure: 312 })
  const size = title.size * pt
  const cover = [paper]
  title.lines.forEach((line, i) => cover.push({ op: 'text', text: line, x: inner, y: 113 * k + size * 0.9 + i * size * 1.1, font: g.head(size), fill: roles.ink, maxWidth: text }))
  cover.push({ op: 'rect', x: inner, y: 113 * k + title.lines.length * size * 1.1 + 10 * k, w: 30 * k, h: 30 * k, fill: g.primary })

  // The palette: the primary on a row of its own, the rest three to a row.
  const palette = [paper, runningHead('The palette'), folio(2)]
  palette.push({ op: 'text', text: 'The palette', x: inner, y: 28 * k + 21 * pt * 0.9, font: g.head(21 * pt), fill: roles.ink })
  let y = 28 * k + 21 * pt + 9 * k
  const colGap = 5 * k
  const colW = (wide - colGap * 2) / 3
  for (const row of paletteLayout(slots.length, 'monograph')) {
    let rowH = 0
    row.forEach(({ i, span }, c) => {
      const s = slots[i]
      const w = span > 1 ? wide : colW
      const x = inner + (span > 1 ? 0 : c * (colW + colGap))
      const chipH = span > 1 ? 30 * k : 11 * k
      palette.push({ op: 'rect', x, y, w, h: chipH, fill: s.hex })
      palette.push({ op: 'strokeRect', x, y, w, h: chipH, stroke: roles.rule })
      const ty = y + chipH + 1.6 * k
      palette.push({ op: 'text', text: KIND_WORD[s.kind].toLowerCase(), x, y: ty + 7, font: serif(400, 7 * pt), fill: roles.muted, letterSpacing: 0.3 })
      palette.push({ op: 'text', text: s.name, x, y: ty + 7 + 12, font: g.head(10.5 * pt), fill: roles.ink, maxWidth: w })
      palette.push({ op: 'text', text: s.hex, x, y: ty + 7 + 12 + 10, font: serif(400, 8 * pt), fill: roles.ink })
      rowH = Math.max(rowH, chipH + 1.6 * k + 33)
    })
    y += rowH + 4.5 * k
  }

  // A colour page: the plate and its tints in the text column, the colour's facts in the margin.
  const plate = (s, n) => {
    const ops = [paper, runningHead(s.name), folio(n)]
    const top = 28 * k
    ops.push({ op: 'rect', x: inner, y: top, w: text, h: 150 * k, fill: s.hex })
    ops.push({ op: 'strokeRect', x: inner, y: top, w: text, h: 150 * k, stroke: roles.rule })
    const tintY = top + 150 * k + 6 * k
    const gapT = 2 * k
    const tw = (text - gapT * 4) / 5
    ;[100, 80, 60, 40, 20].forEach((pct, t) => {
      const x = inner + t * (tw + gapT)
      ops.push({ op: 'rect', x, y: tintY, w: tw, h: 20 * k, fill: pct === 100 ? s.hex : mixHex(s.hex, roles.paper, pct / 100) })
      ops.push({ op: 'text', text: `${pct}%`, x, y: tintY + 20 * k + 9, font: serif(400, 7 * pt), fill: roles.muted })
    })
    const mx = inner + text + gap
    ops.push({ op: 'text', text: KIND_WORD[s.kind].toLowerCase(), x: mx, y: top + 8, font: serif(400, 7 * pt), fill: roles.muted, letterSpacing: 0.3 })
    ops.push({ op: 'text', text: s.name, x: mx, y: top + 8 + 16, font: g.head(13 * pt), fill: roles.ink, maxWidth: note })
    ;[['Hex', s.hex], ['RGB', rgbOf(s.hex)], ['Ink', `${inkWord(s.ink)}, ${s.ratio}:1`]].forEach(([label, value], r) => {
      const ry = top + 54 + r * 24
      ops.push({ op: 'line', x1: mx, y1: ry, x2: mx + note, y2: ry, stroke: roles.rule })
      ops.push({ op: 'text', text: label, x: mx, y: ry + 9, font: serif(400, 7 * pt), fill: roles.muted })
      ops.push({ op: 'text', text: value, x: mx, y: ry + 19, font: serif(400, 8 * pt), fill: roles.ink, maxWidth: note })
    })
    return ops
  }

  return [
    page(g, 'cover', 'cover', cover),
    page(g, 'palette', 'palette', palette),
    page(g, 'plate', 'primary colour', plate(slots[0], 3)),
  ]
}

/* ── Atlas: a colour atlas ────────────────────────────────────────────────── */

const BAND_WEIGHT = { primary: 3, accent: 2, neutral: 1 }
const plateOrder = (slots) => [
  ...slots.filter((s) => s.kind === 'primary'),
  ...slots.filter((s) => s.kind === 'accent'),
  ...slots.filter((s) => s.kind === 'neutral'),
]

function atlas(g, { projectName }) {
  const { d, slots, roles, W, H, k, pt } = g
  const order = plateOrder(slots)
  const m = 14 * k

  // Cover: the palette is the cover, one full-height band per colour, wider for the primary.
  const total = order.reduce((n, s) => n + BAND_WEIGHT[s.kind], 0)
  const cover = []
  let x = 0
  order.forEach((s) => {
    const w = W * BAND_WEIGHT[s.kind] / total
    cover.push({ op: 'rect', x, y: 0, w: w + 1, h: H, fill: s.hex })
    x += w
  })
  // The name sits on the primary band when it fits there whole, else in a paper box over the bands.
  const primaryMm = 210 * BAND_WEIGHT.primary / total
  const onBand = setTitle(projectName, { steps: [44, 34, 26, 22], maxLines: 3, measure: (primaryMm - 20) * MM_PT, advance: 0.58 })
  const fits = !onBand.clamp && !onBand.broken
  const size = onBand.size * pt
  const base = fits ? { x: 10 * k, w: primaryMm * k - 20 * k, ink: order[0].ink } : { x: m + 10 * k, w: 100 * k, ink: roles.ink }
  if (!fits) cover.push({ op: 'rect', x: m, y: m, w: 120 * k, h: onBand.lines.length * size * 1.1 + 34 * k, fill: roles.paper })
  const topY = fits ? m : m + 10 * k
  onBand.lines.forEach((line, i) => cover.push({ op: 'text', text: line, x: base.x, y: topY + size * 0.9 + i * size * 1.1, font: g.head(size), fill: base.ink, maxWidth: base.w }))
  cover.push({ op: 'text', text: `${d.palette.length} ${d.palette.length === 1 ? 'colour' : 'colours'}`, x: base.x, y: fits ? H - m : topY + onBand.lines.length * size * 1.1 + 12 * k, font: mono(400, 7 * pt), fill: base.ink })

  // A plate: the colour full bleed with its role and name, its values, and its tints.
  const plate = (s) => {
    const edge = mixHex(s.ink, s.hex, 0.45)
    const ops = [{ op: 'rect', x: 0, y: 0, w: W, h: H, fill: s.hex }]
    ops.push({ op: 'text', text: KIND_WORD[s.kind], x: m, y: m + 8 * pt, font: mono(400, 8 * pt), fill: s.ink })
    ops.push({ op: 'text', text: s.name, x: m, y: m + 8 * pt + 14 * k + 44 * pt * 0.9, font: g.head(44 * pt), fill: s.ink, maxWidth: 170 * k })
    const tintH = 14 * k
    const tintY = H - 16 * k - tintH - 12
    const gapT = 2 * k
    const tw = (W - m * 2 - gapT * 4) / 5
    ;[100, 80, 60, 40, 20].forEach((pct, t) => {
      const tx = m + t * (tw + gapT)
      ops.push({ op: 'rect', x: tx, y: tintY, w: tw, h: tintH, fill: pct === 100 ? s.hex : mixHex(s.hex, roles.paper, pct / 100) })
      ops.push({ op: 'strokeRect', x: tx, y: tintY, w: tw, h: tintH, stroke: edge })
      ops.push({ op: 'text', text: `${pct}%`, x: tx, y: tintY + tintH + 10, font: mono(400, 7 * pt), fill: s.ink })
    })
    const half = (W - m * 2 - 4 * k) / 2
    ;[['Hex', s.hex], ['RGB', rgbOf(s.hex)], ['Ink', `${inkWord(s.ink)}, ${s.ratio}:1`]].forEach(([label, value], r) => {
      const ry = tintY - 16 - (2 - r) * 17
      ops.push({ op: 'line', x1: m, y1: ry, x2: m + half, y2: ry, stroke: edge })
      ops.push({ op: 'text', text: label, x: m, y: ry + 12, font: mono(400, 7.5 * pt), fill: s.ink })
      ops.push({ op: 'text', text: value, x: m + half, y: ry + 12, font: mono(400, 7.5 * pt), fill: s.ink, align: 'right', maxWidth: half * 0.7 })
    })
    return ops
  }

  // The first two plates; with one colour the second repeats it.
  return [
    page(g, 'cover', 'cover', cover),
    page(g, 'plate', 'colour plate', plate(order[0] || slots[0])),
    page(g, 'plate-next', 'colour plate', plate(order[1] || order[0] || slots[0])),
  ]
}

/* ── Poster: a deck of one word per slide ─────────────────────────────────── */

function poster(g, { projectName, logo }) {
  const { slots, W, H, k, pt } = g
  const m = 14 * k
  const label = (text, x, ink, align) => ({ op: 'text', text, x, y: m + 12, font: g.body(600, 14), fill: ink, letterSpacing: 1.5, align })

  const field = g.primary
  const fieldInk = inkFor(field).ink
  const cover = [{ op: 'rect', x: 0, y: 0, w: W, h: H, fill: field }]
  cover.push(logo ? { op: 'image', x: m, y: m, w: 40 * k * 3, h: 40 * k } : label('BRAND GUIDELINES', m, fieldInk))
  const title = setTitle(projectName, { steps: logo ? [92, 64, 48] : [120, 92, 64, 48], maxLines: 2, measure: 762 })
  const size = title.size * pt
  const last = H - m * 1.5
  title.lines.forEach((line, i) => cover.push({ op: 'text', text: line, x: m, y: last - (title.lines.length - 1 - i) * size, font: g.head(size), fill: fieldInk, maxWidth: W - m * 2 }))

  // A colour slide: the colour full bleed, its facts at the top, its name at the largest size that fits.
  const colourSlide = (s, n) => {
    const soft = softInk(s.ink, s.hex, contrast)
    const ops = [{ op: 'rect', x: 0, y: 0, w: W, h: H, fill: s.hex }, label('COLOUR', m, s.ink), label(String(n).padStart(2, '0'), W - m, s.ink, 'right')]
    ;[['Role', KIND_WORD[s.kind]], ['Hex', s.hex], ['Ink', `${inkWord(s.ink)}, ${s.ratio}:1`]].forEach(([key, value], r) => {
      const y = m + 44 + r * 20
      ops.push({ op: 'text', text: key, x: m, y, font: g.body(400, 11), fill: soft })
      ops.push({ op: 'text', text: value, x: m + 80, y, font: g.body(600, 11), fill: s.ink })
    })
    const name = setTitle(s.name, { steps: [96, 72, 54], maxLines: 2, measure: 762 })
    const nsize = name.size * pt
    name.lines.forEach((line, i) => ops.push({ op: 'text', text: line, x: m, y: last - (name.lines.length - 1 - i) * nsize, font: g.head(nsize), fill: s.ink, maxWidth: W - m * 2 }))
    return ops
  }
  const at = (i) => slots[i] || slots[0]

  return [
    page(g, 'cover', 'cover', cover),
    page(g, 'colour', 'colour slide', colourSlide(at(0), 1)),
    page(g, 'colour-next', 'colour slide', colourSlide(at(1), 2)),
  ]
}

/* ── Grid: an editorial grid ──────────────────────────────────────────────── */

const CHIP_SHARE = { primary: 0.85, accent: 0.62, neutral: 0.5 }

function grid(g, { projectName, logo }) {
  const { d, slots, roles, W, H, k, pt } = g
  const M = 12 * k
  const gut = 6 * k
  const col = (W - M * 2 - gut * 5) / 6
  const colX = (i) => M + i * (col + gut)
  const span = (n) => n * col + (n - 1) * gut
  const mast = 18 * k
  const small = (weight, size) => g.body(weight, size)
  const paper = { op: 'rect', x: 0, y: 0, w: W, h: H, fill: roles.paper }

  // A topic: a rule, then its heading, in a run of columns.
  const topic = (ops, title, x, y, w) => {
    ops.push({ op: 'line', x1: x, y1: y, x2: x + w, y2: y, stroke: roles.ink })
    ops.push({ op: 'text', text: title, x, y: y + 16, font: small(700, 11), fill: roles.ink })
    return y + 24
  }
  const masthead = (section, n) => [
    paper,
    { op: 'text', text: projectName, x: M, y: M + 6, font: small(700, 10), fill: roles.ink, maxWidth: span(3) },
    { op: 'text', text: section, x: colX(3), y: M + 6, font: small(400, 10), fill: roles.muted },
    { op: 'text', text: String(n).padStart(2, '0'), x: W - M, y: M + 6, font: small(400, 10), fill: roles.muted, align: 'right' },
    { op: 'line', x1: M, y1: mast + 4, x2: W - M, y2: mast + 4, stroke: roles.rule },
  ]
  const body = mast + gut + 4

  // Cover: the masthead, the name across the full width, then a swatch (or the logo) beside the contents.
  const cover = [paper]
  cover.push({ op: 'text', text: 'Brand guidelines', x: M, y: M + 6, font: small(700, 10), fill: roles.ink })
  // One line is preferred; two only when no step keeps the name whole on one.
  const one = fitTitle(projectName, { steps: [72, 54, 40], maxLines: 1, measure: 774 })
  const title = setTitle(projectName, { steps: [72, 54, 40], maxLines: !one.clamp && !one.broken ? 1 : 2, measure: 774 })
  const size = title.size * pt
  title.lines.forEach((line, i) => cover.push({ op: 'text', text: line, x: M, y: M + 18 + size * 0.9 + i * size * 1.05, font: g.head(size), fill: roles.ink, maxWidth: W - M * 2 }))
  const ruleY = M + 18 + title.lines.length * size * 1.05 + 6
  cover.push({ op: 'rect', x: M, y: ruleY, w: W - M * 2, h: 2, fill: g.primary })
  const frameY = ruleY + 14
  const frameH = H - M - frameY
  const primary = slots[0]
  if (logo) {
    cover.push({ op: 'image', x: M, y: frameY, w: span(4), h: frameH })
  } else {
    cover.push({ op: 'rect', x: M, y: frameY, w: span(4), h: frameH, fill: primary.hex })
    cover.push({ op: 'text', text: primary.name, x: M + 12, y: frameY + frameH - 28, font: small(700, 14), fill: primary.ink, maxWidth: span(4) - 24 })
    cover.push({ op: 'text', text: `${KIND_WORD.primary}, ${primary.hex}`, x: M + 12, y: frameY + frameH - 12, font: small(400, 10), fill: primary.ink })
  }
  const sideX = colX(4)
  let sy = topic(cover, 'Contents', sideX, frameY, span(2))
  ;['Colour and type', 'The scale', 'Usage notes', 'Scope'].forEach((row, r) => {
    const y = sy + r * 20
    cover.push({ op: 'line', x1: sideX, y1: y - 12, x2: sideX + span(2), y2: y - 12, stroke: roles.rule })
    cover.push({ op: 'text', text: row, x: sideX, y, font: small(400, 10), fill: roles.ink })
    cover.push({ op: 'text', text: String(r + 2).padStart(2, '0'), x: sideX + span(2), y, font: small(400, 10), fill: roles.muted, align: 'right' })
  })

  // Colour and type: a table of every colour across four columns, the two faces across two.
  const colour = masthead('Colour and type', 2)
  const ty = topic(colour, 'Colour', M, body, span(4))
  const row = Math.min(18 * k, (H - M - ty) / Math.max(1, slots.length))
  slots.forEach((s, r) => {
    const y = ty + r * row
    const chip = row * CHIP_SHARE[s.kind]
    colour.push({ op: 'rect', x: M, y: y + (row - chip) / 2, w: chip, h: chip, fill: s.hex })
    const text = Math.min(11, Math.max(6, row * 0.42))
    const baseline = y + row / 2 + text * 0.35
    colour.push({ op: 'text', text: s.name, x: M + row * CHIP_SHARE.primary + 6, y: baseline, font: small(700, text), fill: roles.ink, maxWidth: span(2) })
    colour.push({ op: 'text', text: KIND_WORD[s.kind], x: colX(2) + 10, y: baseline, font: small(400, text), fill: roles.muted })
    colour.push({ op: 'text', text: s.hex, x: colX(3) + 10, y: baseline, font: small(400, text), fill: roles.ink })
    colour.push({ op: 'line', x1: M, y1: y + row, x2: M + span(4), y2: y + row, stroke: roles.rule })
  })
  const faceX = colX(4)
  let fy = topic(colour, 'Typography', faceX, body, span(2))
  ;[['Headings', d.heading, d.headingWeight, g.head(44)], ['Body', d.body, d.bodyWeight, g.body(d.bodyWeight, 44)]].forEach(([role, family, weight, aa]) => {
    colour.push({ op: 'text', text: role, x: faceX, y: fy + 4, font: small(400, 9), fill: roles.muted })
    colour.push({ op: 'text', text: 'Aa', x: faceX, y: fy + 46, font: aa, fill: roles.ink })
    colour.push({ op: 'text', text: `${family}, weight ${weight}`, x: faceX, y: fy + 62, font: small(400, 9), fill: roles.ink, maxWidth: span(2) })
    fy += 86
  })

  // The scale: every step set in its own face, with its name and size beside it.
  const scale = masthead('The scale', 3)
  const sy2 = topic(scale, 'The scale', M, body, span(6))
  const ladder = typeLadder(d)
  const room = H - M - sy2
  const natural = ladder.reduce((sum, s) => sum + s.px * 1.15 + 8, 0)
  const f = Math.min(1, room / natural)
  let y = sy2
  ladder.forEach((s) => {
    const px = Math.max(6, s.px * f)
    y += px * 1.15 + 8 * f
    scale.push({ op: 'text', text: `${s.name} · ${s.px}px`, x: M, y, font: small(400, 9), fill: roles.muted })
    scale.push({ op: 'text', text: s.name, x: colX(2), y, font: s.exp >= 1 ? g.head(px) : g.body(d.bodyWeight, px), fill: roles.ink, maxWidth: span(4) })
    scale.push({ op: 'line', x1: M, y1: y + 4, x2: W - M, y2: y + 4, stroke: roles.rule })
  })

  return [
    page(g, 'cover', 'cover', cover),
    page(g, 'colour', 'colour and type', colour),
    page(g, 'scale', 'the scale', scale),
  ]
}

const BUILDERS = {
  book: { monograph: [210, monograph], atlas: [210, atlas] },
  guidelines: { poster: [297, poster], grid: [297, grid] },
}

/**
 * The strip's three pages for a template other than the row's default, or null when
 * the template is the default (proPreviews.js lays that one out). `size` is the page
 * box in authoring pixels; `logo` is the uploaded mark, drawn where the template does.
 */
export function buildTemplatePreviewPages(kind, template, design, { projectName = 'Design System', logo = null, size } = {}) {
  const row = Object.hasOwn(BUILDERS, kind) ? BUILDERS[kind] : null
  const entry = row && Object.hasOwn(row, template) ? row[template] : null
  if (!entry || !size) return null
  const [mmAcross, build] = entry
  return build(groundFor(design, size, mmAcross), { projectName, logo })
}
