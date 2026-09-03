// The design system book — the Pro export.
//
// WHAT THIS IS, AND WHY IT IS NOT THE STYLE GUIDE.
// utils/styleGuideExport.js produces a four-page handout: correct, useful, and
// free (with a credit line). This produces a BOOK — a paginated, numbered,
// gridded specification manual of the kind a studio charges for. The difference
// is not length. It is that a book has a cover, a contents, section openings,
// a running foot, a folio, and one consistent grid holding every page; those
// six things are most of what separates an artefact from a dump.
//
// THE FORMAT DECISION. There is no PDF library in this project and adding one
// would make the book WORSE, not better. jsPDF and pdf-lib cannot set the
// user's own Google font without fetching and embedding a TTF at runtime, and
// the html2canvas route rasterises the type — a type specimen printed as a
// bitmap is precisely the "generic dump" this task exists to avoid. The
// browser's own print engine embeds the real webfont, keeps the text vector,
// selectable and searchable, and costs zero bytes of bundle. So the book is one
// self-contained HTML document with a true A4 print layout, and the app drives
// window.print() over it. See components/DesignBookPanel.jsx.
//
// SELF-CONTAINED BY CONSTRUCTION, like its sibling: no external stylesheet, no
// script, no image request. The only network reference is the Google Fonts link
// for the user's own families, and the colophon states the fallback stack so
// the book still reads correctly offline or behind a blocked font host.
//
// THE REFERENCES, AND WHAT EACH ONE DECIDED.
//  · NASA Graphics Standards Manual (Danne & Blackburn, 1976) — the section
//    openings. Each section opens on a full-bleed field carrying an oversized
//    numeral, and the specimen runs full-bleed BEFORE the specification table,
//    so the colour is experienced at size before it is described in figures.
//    The colour pages are stacked specification BANDS, not a grid of cards.
//  · designsystems.com, "Color" — what a swatch must carry. A chip with a hex
//    under it is not documentation: every colour here states a name, a semantic
//    role, hex/RGB/HSL, and the ink that reads on it with the measured ratio.
//  · Müller-Brockmann, Grid Systems — one 12-column grid, held on every page,
//    with deliberate asymmetric spans rather than centred blocks.
//  · The 20–35 page brand-manual convention — the book lands in that range and
//    carries a contents page, which is the clearest single "book" signal.
//
// Pure functions over a plain design object — no React, no DOM — so the whole
// document is unit-testable as a string. The contrast maths is imported from
// styleGuideExport.js rather than reimplemented, so the two documents can never
// state different ratios for the same pair.

import { contrast, grade, inkFor, readDesign, typeLadder } from './styleGuideExport.js'
import { roleLabel } from './paletteRoles.js'
import { colorName } from './paletteNames.js'

const esc = (s) => String(s ?? '')
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;')

const isHex = (v) => typeof v === 'string' && /^#[0-9a-fA-F]{6}$/.test(v)

/** #rrggbb → "R, G, B". */
function rgbOf(hex) {
  const [r, g, b] = [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16))
  return `${r}, ${g}, ${b}`
}

/** #rrggbb → "H, S%, L%". Own implementation so this module stays DOM-free and
 *  does not drag the colour-format module's parsing surface into the export. */
function hslOf(hex) {
  const [r, g, b] = [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16) / 255)
  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  const l = (max + min) / 2
  const d = max - min
  let h = 0
  let s = 0
  if (d !== 0) {
    s = d / (1 - Math.abs(2 * l - 1))
    if (max === r) h = ((g - b) / d) % 6
    else if (max === g) h = (b - r) / d + 2
    else h = (r - g) / d + 4
    h *= 60
    if (h < 0) h += 360
  }
  return `${Math.round(h)}, ${Math.round(s * 100)}%, ${Math.round(l * 100)}%`
}

// How many specification bands sit on one colour page. Five, because five is
// what the harmony engine generates and the overwhelmingly common palette — so
// the ordinary case fills exactly one page, with the band still tall enough to
// read the colour rather than merely identify it.
const BANDS_PER_PAGE = 5
// Token lines per page. The listing is monospace at a fixed leading, so this is
// a measured fit rather than a guess.
const TOKENS_PER_PAGE = 34
// The contrast matrix is square, so it grows quadratically. Past eight colours
// the cells stop being legible at A4, and the book says so rather than
// shrinking the type until the evidence is unreadable.
const MATRIX_MAX = 8

function chunk(list, size) {
  const out = []
  for (let i = 0; i < list.length; i += size) out.push(list.slice(i, i + size))
  return out
}

/**
 * Chunk into the same NUMBER of pages as a plain chunk would, but spread evenly
 * across them.
 *
 * A plain chunk of six colours at five-per-page produces a page of five and a
 * page of ONE — a full page carrying a single band, which is the most obviously
 * unfinished thing a book can do. This produces three and three.
 */
function balancedChunk(list, max) {
  if (list.length <= max) return [list]
  const pages = Math.ceil(list.length / max)
  return chunk(list, Math.ceil(list.length / pages))
}

/** "a" or "an" for the word that follows. The abstract reads "a analogous
 *  system" without it, which is the kind of thing that makes a paid document
 *  look machine-written. */
const article = (word) => (/^[aeiou]/i.test(String(word)) ? 'an' : 'a')

/**
 * Everything the book needs, normalised. Built ON TOP of readDesign() so the
 * palette/type reading is shared with the style guide, then extended with the
 * fields a book uses and the guide does not: the colour system that produced
 * the palette, the letter-spacing, and the gradient.
 *
 * Every field is treated as untrusted. A half-written design produces a shorter
 * book, never a broken one, and never a page of "undefined".
 */
export function readBook(design) {
  const base = readDesign(design)
  const harmony = typeof design?.palette?.harmony === 'string' ? design.palette.harmony : 'auto'
  const ts = design?.typeScale || {}

  // Gradient stops resolve against the palette exactly as GradientGenerator
  // does (a null stop colour means "the palette colour in this slot"). If they
  // cannot resolve to two distinct colours the book simply has no gradient
  // page — it does not invent one.
  const rawStops = Array.isArray(design?.gradient?.stops) ? design.gradient.stops : []
  const stops = rawStops
    .map((s, i) => ({
      color: isHex(s?.color) ? s.color.toUpperCase() : (base.palette[i] || null),
      position: Number.isFinite(Number(s?.position)) ? Math.round(Number(s.position)) : null,
    }))
    .filter(s => s.color && s.position !== null)
    .sort((a, b) => a.position - b.position)
  const hasGradient = stops.length >= 2 && new Set(stops.map(s => s.color)).size >= 2

  return {
    ...base,
    harmony,
    headingSpacing: Number(ts.headingSpacing) || 0,
    bodySpacing: Number(ts.bodySpacing) || 0,
    gradient: hasGradient
      ? {
        stops,
        angle: Number.isFinite(Number(design?.gradient?.angle)) ? Math.round(Number(design.gradient.angle)) : 135,
        type: typeof design?.gradient?.type === 'string' ? design.gradient.type : 'Linear',
      }
      : null,
  }
}

/**
 * The CSS custom properties the book documents, as {name, value} pairs.
 *
 * Deliberately generated here rather than imported from exportBuilder.js: that
 * module emits a formatted stylesheet string, and the book needs the tokens as
 * DATA so it can set the name and the value in different columns and paginate
 * them. Same values, one presentation each.
 */
export function bookTokens(d) {
  const rows = []
  d.palette.forEach((hex, i) => {
    rows.push({ name: `--color-${slugRole(d.harmony, i)}`, value: hex })
  })
  rows.push({ name: '--font-heading', value: `"${d.heading}", system-ui, sans-serif` })
  rows.push({ name: '--font-body', value: `"${d.body}", system-ui, sans-serif` })
  rows.push({ name: '--font-weight-heading', value: String(d.headingWeight) })
  rows.push({ name: '--font-weight-body', value: String(d.bodyWeight) })
  rows.push({ name: '--font-size-base', value: `${d.baseSize}px` })
  rows.push({ name: '--type-ratio', value: String(d.ratio) })
  rows.push({ name: '--line-height-body', value: String(d.lineHeight) })
  if (d.headingSpacing) rows.push({ name: '--letter-spacing-heading', value: `${d.headingSpacing}em` })
  if (d.bodySpacing) rows.push({ name: '--letter-spacing-body', value: `${d.bodySpacing}em` })
  typeLadder(d).forEach((s) => {
    rows.push({ name: `--font-size-${s.name.toLowerCase().replace(/\s+/g, '-')}`, value: `${s.px}px` })
  })
  if (d.gradient) {
    const stops = d.gradient.stops.map(s => `${s.color} ${s.position}%`).join(', ')
    rows.push({
      name: '--gradient-brand',
      value: `linear-gradient(${d.gradient.angle}deg, ${stops})`,
    })
  }
  return rows
}

/** A role label reduced to a CSS-safe token segment, uniquely. */
function slugRole(harmony, index) {
  const slug = roleLabel(harmony, index)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
  return slug || `colour-${index + 1}`
}

/* ── page furniture ──────────────────────────────────────────────────────── */

/** A numbered content page with a running foot. `folio` is the printed page
 *  number; the cover and section openings carry none, as in any bound book. */
function page(inner, { section = '', folio = null, cls = '' } = {}) {
  return `<section class="pg ${cls}">
  ${inner}
  ${folio === null ? '' : `<footer class="foot"><span>${esc(section)}</span><span class="folio">${folio}</span></footer>`}
</section>`
}

/** A full-bleed section opening: one dominant mass, an oversized numeral, and
 *  the section abstract. The Swiss/NASA move, and the thing that paces the book. */
function opening(num, title, abstract, field, ink) {
  return `<section class="pg pg-open" style="background:${field};color:${ink}">
  <div class="open-num">${esc(num)}</div>
  <div class="open-foot">
    <h2 class="open-title">${esc(title)}</h2>
    <p class="open-abs">${esc(abstract)}</p>
  </div>
</section>`
}

/* ── the document ────────────────────────────────────────────────────────── */

/**
 * The complete design system book as one self-contained HTML document.
 *
 * There is no `watermark` option and that is deliberate: the book is the Pro
 * export, so there is no free variant of it to mark. The free tier keeps the
 * style guide, which carries its credit line. A gate that produces a degraded
 * paid artefact teaches the user that the paid thing is worse.
 */
export function buildDesignSystemBook(design, { projectName = 'Design System', date = new Date() } = {}) {
  const d = readBook(design)
  const ladder = typeLadder(d)
  const tokens = bookTokens(d)
  const iso = date.toISOString().slice(0, 10)
  const year = iso.slice(0, 4)

  // The cover field is the project's own primary. With no palette saved the
  // book still has a cover — it falls back to ink, rather than to a grey box
  // that looks like a rendering failure.
  const field = d.base || '#111114'
  const fieldInk = inkFor(field).ink
  const hasPalette = d.palette.length > 0

  const fontHref = googleFontHref(d)

  // ── contents ────────────────────────────────────────────────────────────
  // Built as data first so the folios in the contents list can never drift from
  // the folios printed on the pages. Every page is pushed through one counter.
  const pages = []
  let folio = 0
  const contents = []
  const add = (html) => pages.push(html)
  // `leaf` is the contents entry for this page. Continuation pages pass none —
  // a contents that lists "Custom properties" three times is an index, not a
  // contents, and it tells the reader nothing the first entry did not.
  const addNumbered = (inner, section, leaf = null) => {
    folio += 1
    if (leaf) contents.push({ title: leaf, folio, sub: true })
    add(page(inner, { section, folio }))
    return folio
  }
  const addOpening = (num, title, abstract, bg, ink) => {
    folio += 1
    contents.push({ num, title, folio })
    add(opening(num, title, abstract, bg, ink))
  }

  // ── 1 · cover ───────────────────────────────────────────────────────────
  add(coverPage({ d, projectName, field, fieldInk, iso, year }))

  // ── 2 · contents (rendered last, placed here) ───────────────────────────
  const contentsSlot = pages.length
  add('')
  folio = 2 // the cover is i, the contents ii; the body starts its count at 3

  // ── colour ──────────────────────────────────────────────────────────────
  if (hasPalette) {
    const sys = systemName(d.harmony)
    addOpening(
      '01', 'Colour',
      `${d.palette.length} ${d.palette.length === 1 ? 'colour' : 'colours'} built on ${article(sys)} ${sys} system, each with the ink that reads on it and the ratio that proves it.`,
      field, fieldInk,
    )
    let seen = 0
    balancedChunk(d.palette, BANDS_PER_PAGE).forEach((group, gi) => {
      addNumbered(colourBands(d, group, seen, gi === 0), 'Colour', gi === 0 ? 'The palette' : null)
      seen += group.length
    })
    addNumbered(matrixPage(d), 'Colour', 'Contrast matrix')
  }

  if (d.gradient) {
    addNumbered(gradientPage(d), 'Colour', 'The gradient')
  }

  // ── typography ──────────────────────────────────────────────────────────
  addOpening(
    '02', 'Typography',
    `${d.heading} for headings, ${d.body} for reading, on a ${d.ratio} scale from ${d.baseSize}px.`,
    '#111114', '#FFFFFF',
  )
  addNumbered(familiesPage(d), 'Typography', 'The families')
  addNumbered(scalePage(d, ladder), 'Typography', 'The scale')

  // ── tokens ──────────────────────────────────────────────────────────────
  const tokenField = d.palette[1] || d.palette[0] || '#111114'
  addOpening(
    '03', 'Tokens',
    `${tokens.length} custom properties — the whole system as code, ready to paste into a stylesheet.`,
    tokenField, inkFor(tokenField).ink,
  )
  balancedChunk(tokens, TOKENS_PER_PAGE).forEach((group, gi) => {
    addNumbered(tokensPage(group, gi === 0, tokens.length), 'Tokens', gi === 0 ? 'Custom properties' : null)
  })

  // ── colophon ────────────────────────────────────────────────────────────
  // Listed at the top level with no section number. It belongs to the book
  // rather than to a section, and filing it under "03 — Tokens" said it was
  // part of the token chapter, which it is not.
  folio += 1
  contents.push({ num: '', title: 'Colophon', folio })
  add(page(colophonPage(d, projectName, iso), { section: 'Colophon', folio }))

  // Section openings are the only entries in the contents: a contents page that
  // lists every leaf is an index, and an index of eleven pages is noise.
  pages[contentsSlot] = contentsPage({ d, projectName, contents, tokens, iso })

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(projectName)} — Design System</title>
<meta name="description" content="The colour, typography and token specification for ${esc(projectName)}.">
${fontHref}
<style>
${bookCss(d)}
</style>
</head>
<body>
<article class="bk">
${pages.join('\n')}
</article>
</body>
</html>`
}

/** The Google Fonts link for the user's own families, at the weights the book
 *  actually sets. Ascending order, deduped — Google rejects anything else. */
function googleFontHref(d) {
  const families = [d.heading, d.body].filter((v, i, a) => a.indexOf(v) === i)
  if (!families.length) return ''
  const weights = [...new Set([400, 500, 700, Number(d.headingWeight) || 700, Number(d.bodyWeight) || 400])]
    .filter(w => w >= 100 && w <= 900)
    .sort((a, b) => a - b)
    .join(';')
  const param = families
    .map(f => `family=${encodeURIComponent(f).replace(/%20/g, '+')}:wght@${weights}`)
    .join('&')
  return `<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin><link href="https://fonts.googleapis.com/css2?${param}&display=swap" rel="stylesheet">`
}

const SYSTEM_NAMES = {
  auto: 'tonal', complement: 'complementary', analogous: 'analogous',
  triadic: 'triadic', split: 'split-complementary', tetradic: 'tetradic',
  monochromatic: 'monochromatic', custom: 'custom',
}
function systemName(harmony) {
  return SYSTEM_NAMES[harmony] || 'tonal'
}

/* ── pages ───────────────────────────────────────────────────────────────── */

function coverPage({ d, projectName, field, fieldInk, iso, year }) {
  // The palette runs full-bleed across the foot of the cover: the system
  // applied, not a legend of it.
  //
  // The BASE is excluded, and that is not a tidy-up — the cover field already
  // IS the base, so including it painted an invisible first segment and the
  // band read as starting a fifth of the way in, like a misaligned rule. The
  // field is the primary; the band is the rest of the system.
  const rest = d.palette.filter(c => c !== field)
  const band = rest.length
    ? rest.map(c => `<i style="background:${c}"></i>`).join('')
    : ''
  return `<section class="pg pg-cover" style="background:${field};color:${fieldInk}">
  <div class="cv-top">
    <span class="cv-mark">Design System</span>
    <span class="cv-year">${esc(year)}</span>
  </div>
  <h1 class="cv-title">${esc(projectName)}</h1>
  <div class="cv-bottom">
    <dl class="cv-meta">
      <div><dt>Primary</dt><dd>${esc(d.base || '—')}</dd></div>
      <div><dt>Type</dt><dd>${esc(d.heading)} · ${esc(d.body)}</dd></div>
      <div><dt>Issued</dt><dd>${esc(iso)}</dd></div>
    </dl>
    ${band ? `<div class="cv-band">${band}</div>` : ''}
  </div>
</section>`
}

function contentsPage({ d, projectName, contents, tokens, iso }) {
  const rows = contents.map(c => `<li${c.sub ? ' class="is-sub"' : ''}>
    <span class="ct-num">${c.sub ? '' : esc(c.num)}</span>
    <span class="ct-title">${esc(c.title)}</span>
    <span class="ct-dot"></span>
    <span class="ct-folio">${c.folio}</span>
  </li>`).join('')
  return `<section class="pg pg-contents">
  <div class="ct-grid">
    <div class="ct-main">
      <p class="lbl">Contents</p>
      <ol class="ct-list">${rows}</ol>
    </div>
    <aside class="ct-aside">
      <p class="lbl">About this book</p>
      <p>This is the specification for <b>${esc(projectName)}</b> — the colour, typography and token decisions behind the interface, written down so they can be applied consistently and checked.</p>
      <p>Every contrast figure in it was measured, not estimated. Nothing here is illustrative: each value is the value the system actually holds.</p>
      <dl class="ct-facts">
        <div><dt>Colours</dt><dd>${d.palette.length}</dd></div>
        <div><dt>Type steps</dt><dd>8</dd></div>
        <div><dt>Tokens</dt><dd>${tokens.length}</dd></div>
        <div><dt>Issued</dt><dd>${esc(iso)}</dd></div>
      </dl>
    </aside>
  </div>
  <footer class="foot"><span>Contents</span><span class="folio">ii</span></footer>
</section>`
}

/**
 * A colour specification page: stacked full-width bands, each one the colour at
 * a size you can actually judge, with its specification set beside it.
 *
 * Bands rather than a grid of cards, on purpose. Equal rounded cards are the
 * house style of every template on the internet and they flatten hierarchy; a
 * band reads as a standard, which is what this is.
 */
function colourBands(d, group, offset, first) {
  const bands = group.map((hex, i) => {
    const idx = offset + i
    const { ink, ratio, label } = inkFor(hex)
    return `<div class="bd">
      <div class="bd-chip" style="background:${hex};color:${ink}">
        <span class="bd-idx">${String(idx + 1).padStart(2, '0')}</span>
      </div>
      <div class="bd-id">
        <p class="bd-role">${esc(roleLabel(d.harmony, idx))}</p>
        <p class="bd-name">${esc(colorName(hex))}</p>
      </div>
      <dl class="bd-spec">
        <div><dt>HEX</dt><dd>${esc(hex)}</dd></div>
        <div><dt>RGB</dt><dd>${rgbOf(hex)}</dd></div>
        <div><dt>HSL</dt><dd>${hslOf(hex)}</dd></div>
      </dl>
      <dl class="bd-spec bd-ink">
        <div><dt>Ink</dt><dd>${esc(label)}</dd></div>
        <div><dt>Ratio</dt><dd>${ratio}:1</dd></div>
        <div><dt>Grade</dt><dd>${grade(ratio)}</dd></div>
      </dl>
    </div>`
  }).join('')
  return `<div class="pg-body">
    <header class="pg-head">
      <p class="lbl">01 — Colour</p>
      ${first
    ? `<h3>The palette</h3><p class="lede">Each colour with its role in the ${esc(systemName(d.harmony))} system, its values in three notations, and the ink that reads on it.</p>`
    : '<h3 class="cont">The palette <span>continued</span></h3>'}
    </header>
    <div class="bands">${bands}</div>
  </div>`
}

/**
 * The contrast matrix — every palette colour measured against every other, plus
 * paper and ink. This is the page that cannot be faked and that no template
 * carries: it is the evidence behind the palette rather than a picture of it.
 */
function matrixPage(d) {
  const cols = d.palette.slice(0, MATRIX_MAX)
  const axes = [...cols, '#FFFFFF', '#000000']
  const head = axes.map(c => `<th scope="col"><span class="dot" style="background:${c}"></span><span class="mx-h">${esc(c.replace('#', ''))}</span></th>`).join('')
  const rows = cols.map(row => {
    const cells = axes.map(col => {
      if (row === col) return '<td class="mx-self">—</td>'
      const r = contrast(row, col)
      // Weight, not colour, carries the pass/fail. The book must never use a
      // colour to mean "status" — the colours here are the SUBJECT, and a green
      // tick beside a swatch would read as the swatch being green.
      return `<td class="${r >= 4.5 ? 'mx-pass' : r >= 3 ? 'mx-mid' : 'mx-fail'}">${r}</td>`
    }).join('')
    return `<tr><th scope="row"><span class="dot" style="background:${row}"></span>${esc(row)}</th>${cells}</tr>`
  }).join('')
  const capped = d.palette.length > MATRIX_MAX
  return `<div class="pg-body">
    <header class="pg-head">
      <p class="lbl">01 — Colour</p>
      <h3>Contrast matrix</h3>
      <p class="lede">Every pair in the palette, measured. Read a row as the background and a column as the text on it — the figure is the same either way.</p>
    </header>
    <table class="mx">
      <thead><tr><th scope="col"><span class="mx-corner">bg ╲ fg</span></th>${head}</tr></thead>
      <tbody>${rows}</tbody>
    </table>
    <div class="key">
      <span><b>Bold</b> passes AA for normal text (4.5:1)</span>
      <span><b>Medium</b> passes AA for large text only (3:1)</span>
      <span><b>Light</b> is a fill, not a text pair</span>
    </div>
    ${capped ? `<p class="note">The matrix shows the first ${MATRIX_MAX} colours. Past eight the cells stop being legible at this size, so the remaining colours are specified on the palette pages and measured against paper and ink there.</p>` : ''}
  </div>`
}

function gradientPage(d) {
  const g = d.gradient
  const css = `linear-gradient(${g.angle}deg, ${g.stops.map(s => `${s.color} ${s.position}%`).join(', ')})`
  const rows = g.stops.map((s, i) => `<tr>
    <th scope="row"><span class="dot" style="background:${s.color}"></span>Stop ${i + 1}</th>
    <td class="num">${esc(s.color)}</td>
    <td class="num">${s.position}%</td>
  </tr>`).join('')
  return `<div class="pg-body">
    <header class="pg-head">
      <p class="lbl">01 — Colour</p>
      <h3>The gradient</h3>
      <p class="lede">A ${esc(g.type.toLowerCase())} blend at ${g.angle}°, specified by stop so it can be rebuilt exactly rather than eyeballed.</p>
    </header>
    <div class="gr-spec" style="background:${css}"></div>
    <table class="tb">
      <thead><tr><th>Stop</th><th>Colour</th><th>Position</th></tr></thead>
      <tbody>${rows}</tbody>
    </table>
    <pre class="code">background: ${esc(css)};</pre>
  </div>`
}

/**
 * The type families page — the specimen. The families are shown at display size
 * in their own faces with the full character set beneath, because the only way
 * to judge a typeface is to look at it set, not to read its name.
 */
function familiesPage(d) {
  const spec = (role, family, weight, spacing) => `<div class="fm">
    <div class="fm-head">
      <p class="lbl">${esc(role)}</p>
      <dl class="fm-meta">
        <div><dt>Weight</dt><dd>${weight}</dd></div>
        <div><dt>Tracking</dt><dd>${spacing ? `${spacing}em` : 'normal'}</dd></div>
      </dl>
    </div>
    <p class="fm-name" style="font-family:'${esc(family)}',system-ui,sans-serif;font-weight:${weight};letter-spacing:${spacing || 0}em">${esc(family)}</p>
    <p class="fm-set" style="font-family:'${esc(family)}',system-ui,sans-serif;font-weight:${weight}">ABCDEFGHIJKLMNOPQRSTUVWXYZ<br>abcdefghijklmnopqrstuvwxyz<br>0123456789 &amp; ., : ; ! ? &ldquo; &rdquo; ( ) &ndash; &mdash; @ # % &euro; &pound; $</p>
  </div>`
  return `<div class="pg-body">
    <header class="pg-head">
      <p class="lbl">02 — Typography</p>
      <h3>The families</h3>
      <p class="lede">Two faces carry the system. Every fallback is stated in the colophon, so the document degrades predictably rather than arbitrarily.</p>
    </header>
    ${spec('Headings', d.heading, d.headingWeight, d.headingSpacing)}
    ${spec('Body', d.body, d.bodyWeight, d.bodySpacing)}
  </div>`
}

/**
 * The type scale — each step SET AT ITS OWN SIZE, which is the specimen, with
 * the figures beside it. A table of numbers is a spec; a table of numbers whose
 * rows are typeset at the size they describe is a specimen.
 */
function scalePage(d, ladder) {
  const rows = ladder.map((s) => {
    const isHeading = s.exp >= 1
    // Clamped so a large ratio cannot push a row off the page. 44px is not a
    // taste call: the widest step label is nine characters, and at 44px even a
    // wide face (0.75em average advance) sets it in 78mm against the 84mm the
    // specimen column has. The first cut of this clamped at 62px and printed
    // "Displa" and "Headin" — a type specimen with the type cut off.
    //
    // The TRUE size is always the number in the column beside it, which is the
    // authoritative figure; the specimen illustrates it, and the note says so.
    const shown = Math.min(s.px, 44)
    return `<tr>
      <th scope="row">${esc(s.name)}</th>
      <td class="num">${s.px}px</td>
      <td class="num">${(s.px / 16).toFixed(3).replace(/\.?0+$/, '')}rem</td>
      <td class="num">${isHeading ? 1.15 : d.lineHeight}</td>
      <td class="sp" style="font-size:${shown}px;font-family:'${esc(isHeading ? d.heading : d.body)}',system-ui,sans-serif;font-weight:${isHeading ? d.headingWeight : d.bodyWeight}">${esc(s.name)}</td>
    </tr>`
  }).join('')
  return `<div class="pg-body">
    <header class="pg-head">
      <p class="lbl">02 — Typography</p>
      <h3>The scale</h3>
      <p class="lede">A ${d.ratio} ratio from a ${d.baseSize}px base. Each row is set in the face and size it specifies.</p>
    </header>
    <table class="tb tb-scale">
      <colgroup><col style="width:28mm"><col style="width:20mm"><col style="width:22mm"><col style="width:18mm"><col></colgroup>
      <thead><tr><th>Step</th><th>Size</th><th>rem</th><th>Leading</th><th>Specimen</th></tr></thead>
      <tbody>${rows}</tbody>
    </table>
    <p class="note">Specimens above 44px are shown reduced so the row fits the page; the size column is always the true value. Body copy sets at ${d.lineHeight} leading, headings tighten to 1.15 — which is what stops a two-line heading reading as two separate lines.</p>
  </div>`
}

function tokensPage(group, first, total) {
  const rows = group.map(t => `<tr><td class="tk-n">${esc(t.name)}</td><td class="tk-v">${esc(t.value)}</td></tr>`).join('')
  return `<div class="pg-body">
    <header class="pg-head">
      <p class="lbl">03 — Tokens</p>
      ${first ? `<h3>Custom properties</h3><p class="lede">All ${total} tokens, named for the role each colour plays rather than the colour it happens to be — so a palette change does not orphan the name.</p>` : '<h3 class="cont">Custom properties <span>continued</span></h3>'}
    </header>
    <table class="tk">${rows}</table>
  </div>`
}

function colophonPage(d, projectName, iso) {
  return `<div class="pg-body">
    <header class="pg-head">
      <p class="lbl">Colophon</p>
      <h3>How this book was made</h3>
    </header>
    <div class="cl-grid">
      <div>
        <p class="lbl">Method</p>
        <p>Contrast is the WCAG 2.2 relative-luminance ratio (§1.4.3). AA needs 4.5:1 for normal text and 3:1 for large; AAA needs 7:1. Every figure is reproducible — the same two hex values always give the same ratio.</p>
        <p class="lbl">Typefaces</p>
        <p>Headings set in ${esc(d.heading)} at ${d.headingWeight}, body in ${esc(d.body)} at ${d.bodyWeight}. Both fall back to <code>system-ui</code>, then the platform sans, so this document reads correctly offline or behind a blocked font host.</p>
      </div>
      <div>
        <p class="lbl">What this book covers</p>
        <p>Colour, typography and tokens — the decisions this system actually holds.</p>
        <p class="lbl">What it does not</p>
        <p>A full identity manual would also carry logo construction, imagery direction, tone of voice and applied examples. Those are not in this book because they are not in the system: this document specifies only what was really designed, and states the boundary rather than filling it with placeholders.</p>
      </div>
    </div>
    <div class="cl-foot">
      <span>${esc(projectName)}</span>
      <span>Issued ${esc(iso)}</span>
      <span>Set from the system it describes</span>
    </div>
  </div>`
}

/* ── the stylesheet ──────────────────────────────────────────────────────── */

/**
 * One grid, held on every page. Sizes are in pt because this is a print
 * document and pt is the unit the page is actually measured in.
 */
function bookCss(d) {
  return `  :root{
    --ink:#111114; --mut:#6A6A74; --line:#DCDCE2; --hair:#EDEDF1; --paper:#fff;
    --m:19mm;
    --head:'${esc(d.heading)}',system-ui,-apple-system,'Segoe UI',sans-serif;
    --body:'${esc(d.body)}',system-ui,-apple-system,'Segoe UI',sans-serif;
    --mono:ui-monospace,SFMono-Regular,'SF Mono',Menlo,Consolas,monospace;
  }
  *{box-sizing:border-box}
  html{-webkit-text-size-adjust:100%}
  body{margin:0;background:#E8E8EC;color:var(--ink);font-family:var(--body);
    font-size:9.5pt;line-height:1.55;-webkit-font-smoothing:antialiased}
  .bk{display:block}

  /* A fixed page. Exact height rather than min-height, so a page break can
     never land mid-band and the book paginates identically on every printer. */
  .pg{position:relative;width:210mm;height:297mm;padding:var(--m);
    background:var(--paper);margin:6mm auto;overflow:hidden;
    box-shadow:0 1px 14px rgba(17,17,20,.13)}
  .pg-body{height:100%;display:flex;flex-direction:column}

  h1,h2,h3{font-family:var(--head);font-weight:${d.headingWeight};margin:0;line-height:1.08}
  p{margin:0 0 1em}
  .lbl{font-family:var(--body);font-size:7pt;font-weight:600;letter-spacing:.18em;
    text-transform:uppercase;color:var(--mut);margin:0 0 3mm}
  .lede{font-size:9.5pt;color:var(--mut);max-width:78mm;margin:2mm 0 0}
  .num,code,.tk-n,.tk-v,.code{font-family:var(--mono);font-variant-numeric:tabular-nums}

  .pg-head{margin-bottom:7mm;flex:0 0 auto}
  .pg-head h3{font-size:21pt;letter-spacing:-.01em}
  .pg-head h3.cont span{font-weight:400;color:var(--mut)}

  .foot{position:absolute;left:var(--m);right:var(--m);bottom:11mm;
    display:flex;justify-content:space-between;align-items:baseline;
    font-size:7pt;letter-spacing:.1em;text-transform:uppercase;color:var(--mut);
    border-top:.4pt solid var(--line);padding-top:2.5mm}
  .folio{font-family:var(--mono);letter-spacing:0;font-size:8pt;color:var(--ink)}

  /* ── cover ──────────────────────────────────────────────────────────── */
  .pg-cover{display:flex;flex-direction:column;justify-content:space-between;padding:var(--m)}
  .cv-top{display:flex;justify-content:space-between;font-size:7.5pt;
    letter-spacing:.2em;text-transform:uppercase;opacity:.82}
  /* The title sits LOW, above the specification block, with the open field
     above it. Vertically centring it read as a slide; a cover is a composition
     and the mass belongs off-centre. */
  .cv-title{font-size:52pt;letter-spacing:-.025em;max-width:15ch;
    align-self:flex-start;margin:auto 0 14mm}
  .cv-bottom{display:flex;flex-direction:column;gap:6mm}
  .cv-meta{display:flex;gap:12mm;margin:0;font-size:8pt}
  .cv-meta dt{letter-spacing:.14em;text-transform:uppercase;opacity:.7;font-size:7pt;margin-bottom:1mm}
  .cv-meta dd{margin:0;font-family:var(--mono)}
  /* Full bleed: the band cancels the page padding and runs edge to edge, so it
     reads as the system applied to the cover rather than a swatch strip laid
     on it. */
  .cv-band{display:flex;height:11mm;margin:0 calc(-1 * var(--m)) calc(-1 * var(--m))}
  .cv-band i{flex:1}

  /* ── contents ───────────────────────────────────────────────────────── */
  .ct-grid{display:grid;grid-template-columns:1fr 62mm;gap:16mm;height:100%;align-content:start}
  .ct-list{list-style:none;margin:0;padding:0}
  .ct-list li{display:flex;align-items:baseline;gap:4mm;padding:4.5mm 0;
    border-bottom:.4pt solid var(--hair)}
  .ct-list li:first-child{border-top:.8pt solid var(--ink)}
  /* Sub-entries are the leaf pages. Without them a three-section book has a
     three-line contents and two thirds of a blank page; with them the contents
     is also USEFUL, which is what a contents is for. */
  .ct-list li.is-sub{padding:2.4mm 0;border-bottom:none}
  .ct-list li.is-sub+li:not(.is-sub){border-top:.4pt solid var(--hair);margin-top:3mm}
  .ct-num{font-family:var(--mono);font-size:8pt;color:var(--mut);width:8mm;flex:0 0 8mm}
  .ct-title{font-family:var(--head);font-size:15pt;font-weight:${d.headingWeight}}
  .is-sub .ct-title{font-family:var(--body);font-size:9pt;font-weight:400;
    color:var(--mut);padding-left:2mm}
  .is-sub .ct-folio{font-size:8pt;color:var(--mut)}
  .ct-dot{flex:1;border-bottom:.4pt dotted var(--line);transform:translateY(-1mm)}
  .ct-folio{font-family:var(--mono);font-size:9pt}
  .ct-aside{font-size:8.5pt;color:var(--mut)}
  .ct-aside b{color:var(--ink)}
  .ct-facts{margin:6mm 0 0;border-top:.8pt solid var(--ink);padding-top:3mm}
  .ct-facts div{display:flex;justify-content:space-between;padding:1.6mm 0;
    border-bottom:.4pt solid var(--hair)}
  .ct-facts dt{font-size:7.5pt;letter-spacing:.1em;text-transform:uppercase}
  .ct-facts dd{margin:0;font-family:var(--mono);color:var(--ink)}

  /* ── section opening ────────────────────────────────────────────────── */
  .pg-open{display:flex;flex-direction:column;justify-content:space-between}
  .open-num{font-family:var(--head);font-weight:${d.headingWeight};
    font-size:150pt;line-height:.82;letter-spacing:-.04em;opacity:.9}
  .open-title{font-size:34pt;letter-spacing:-.02em}
  .open-abs{font-size:11pt;max-width:110mm;margin:4mm 0 0;opacity:.86;line-height:1.4}

  /* ── colour bands ───────────────────────────────────────────────────── */
  .bands{display:flex;flex-direction:column}
  /* A FIXED band height, not a stretching one. Stretching made a page holding
     a single colour blow that one band up to fill 250mm — the chip became an
     absurd column and every label sank to the foot. A specification row is a
     fixed object; a short page simply ends early, as a page in a book does. */
  .bd{display:grid;grid-template-columns:46mm 1fr 37mm 31mm;gap:5mm;
    align-items:center;height:42mm;
    border-top:.4pt solid var(--line);padding:3mm 0}
  .bd:first-child{border-top:.8pt solid var(--ink)}
  .bd-chip{display:flex;align-items:flex-end;padding:2.5mm;height:100%}
  .bd-idx{font-family:var(--mono);font-size:8pt;opacity:.75}
  .bd-id{display:flex;flex-direction:column;justify-content:center}
  .bd-role{font-size:7pt;letter-spacing:.16em;text-transform:uppercase;color:var(--mut);margin:0 0 1.5mm}
  .bd-name{font-family:var(--head);font-size:13pt;font-weight:${d.headingWeight};margin:0;line-height:1.1}
  .bd-spec{margin:0;display:flex;flex-direction:column;justify-content:center;gap:1.4mm}
  .bd-spec div{display:flex;justify-content:space-between;gap:2.5mm;font-size:7.5pt;
    border-bottom:.4pt solid var(--hair);padding-bottom:1mm}
  .bd-spec dt{color:var(--mut);letter-spacing:.08em}
  .bd-spec dd{margin:0;font-family:var(--mono);white-space:nowrap}

  /* ── matrix ─────────────────────────────────────────────────────────── */
  .mx{width:100%;border-collapse:collapse;font-size:7.5pt;table-layout:fixed}
  .mx th,.mx td{padding:4.6mm 1mm;text-align:center;border-bottom:.4pt solid var(--hair)}
  .mx thead th{border-bottom:.8pt solid var(--ink);font-weight:600;color:var(--mut)}
  .mx-h{font-family:var(--mono);font-size:6.5pt;display:block;margin-top:1mm}
  .mx-corner{font-size:6.5pt;color:var(--mut)}
  .mx tbody th{text-align:left;font-family:var(--mono);font-weight:400;white-space:nowrap}
  .mx td{font-family:var(--mono);font-variant-numeric:tabular-nums}
  /* Pass/fail is carried by WEIGHT, never by colour: the colours on this page
     are the subject, so a red or green cell would read as a property of the
     swatch rather than of the measurement. */
  .mx-pass{font-weight:700;color:var(--ink)}
  .mx-mid{font-weight:500;color:#4A4A55}
  .mx-fail{font-weight:400;color:#A6A6B0}
  .mx-self{color:var(--line)}
  .dot{display:inline-block;width:2.6mm;height:2.6mm;margin-right:1.6mm;
    vertical-align:-.3mm;border:.4pt solid rgba(0,0,0,.16)}
  /* Pushed to the foot: a key floating directly under a short table, with a
     third of a page blank beneath it, reads as the page having run out. */
  .key{display:flex;flex-wrap:wrap;gap:2mm 8mm;margin-top:auto;padding-top:3mm;
    border-top:.4pt solid var(--line);font-size:7.5pt;color:var(--mut)}
  .key b{color:var(--ink)}

  /* ── gradient ───────────────────────────────────────────────────────── */
  .gr-spec{height:62mm;width:100%;margin-bottom:7mm}

  /* ── tables ─────────────────────────────────────────────────────────── */
  .tb{width:100%;border-collapse:collapse;font-size:8.5pt}
  .tb th,.tb td{text-align:left;padding:3mm 2mm;border-bottom:.4pt solid var(--hair);vertical-align:middle}
  .tb thead th{font-size:7pt;letter-spacing:.14em;text-transform:uppercase;color:var(--mut);
    border-bottom:.8pt solid var(--ink);padding-bottom:2mm}
  .tb .ar{text-align:right}
  /* Fixed layout with a declared colgroup: the specimen column then has a KNOWN
     width to be clamped against, instead of an auto-width cell that quietly
     clipped the specimen it exists to show. */
  .tb-scale{table-layout:fixed}
  .tb-scale th,.tb-scale td{padding:4.4mm 2mm}
  .tb-scale td.sp{text-align:left;white-space:nowrap;overflow:hidden;line-height:1.1}
  .tb-scale th[scope=row]{font-weight:600;white-space:nowrap}

  /* ── families ───────────────────────────────────────────────────────── */
  .fm{border-top:.8pt solid var(--ink);padding:5mm 0 7mm;flex:1 1 0;display:flex;flex-direction:column}
  .fm-head{display:flex;justify-content:space-between;align-items:flex-start}
  .fm-meta{display:flex;gap:8mm;margin:0}
  .fm-meta div{text-align:right}
  .fm-meta dt{font-size:7pt;letter-spacing:.14em;text-transform:uppercase;color:var(--mut)}
  .fm-meta dd{margin:0;font-family:var(--mono);font-size:8.5pt}
  .fm-name{font-size:40pt;line-height:1.05;margin:2mm 0 5mm}
  .fm-set{font-size:12pt;line-height:1.7;margin:0;color:#2E2E38;word-break:break-word}

  /* ── tokens ─────────────────────────────────────────────────────────── */
  .tk{width:100%;border-collapse:collapse;font-size:8pt}
  .tk td{padding:1.9mm 2mm;border-bottom:.4pt solid var(--hair);vertical-align:top}
  .tk tr:first-child td{border-top:.8pt solid var(--ink)}
  .tk-n{width:64mm;color:var(--ink);white-space:nowrap}
  .tk-v{color:var(--mut);word-break:break-all}
  .code{background:#F6F6F8;border-left:1.2pt solid var(--ink);padding:3mm 4mm;
    font-size:8pt;margin:6mm 0 0;white-space:pre-wrap;word-break:break-all}

  /* ── notes + colophon ───────────────────────────────────────────────── */
  .note{margin-top:auto;padding:3.5mm 4mm;border-left:1.2pt solid var(--ink);
    background:#F7F7F9;font-size:8pt;color:var(--mut)}
  .cl-grid{display:grid;grid-template-columns:1fr 1fr;gap:12mm;font-size:8.5pt;color:var(--mut)}
  .cl-grid .lbl{margin-top:5mm}
  .cl-grid div>.lbl:first-child{margin-top:0}
  /* No rule of its own: the running foot draws one 8mm below, and two
     horizontal rules that close together read as a mistake rather than a
     structure. The space does the separating. */
  .cl-foot{margin-top:auto;display:flex;justify-content:space-between;
    padding-bottom:6mm;font-size:7.5pt;
    letter-spacing:.1em;text-transform:uppercase;color:var(--mut)}

  @media print{
    body{background:#fff}
    .pg{margin:0;box-shadow:none;break-after:page;page-break-after:always}
    .pg:last-child{break-after:auto;page-break-after:auto}
    @page{size:A4;margin:0}
  }`
}
