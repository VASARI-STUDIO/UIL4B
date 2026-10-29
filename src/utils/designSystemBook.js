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

import { contrast, grade, inkFor, typeLadder } from './styleGuideExport.js'
import { readBook } from './bookModel.js'
import { roleLabel, slotLandsBook, slotPlaced } from './paletteRoles.js'
import { colorName } from './paletteNames.js'
import { esc, orderSections, fitTitle, MAX_SLOTS } from './exportTemplates/shared.js'
import { deriveRoles, hexToOklch, isNeutral, mixHex } from './exportTemplates/roles.js'
import { readLogo } from './brandLogo.js'
import { BOOK_TEMPLATES } from './exportTemplates/book/index.js'
import { bookTokens } from './bookTokens.js'

const DEFAULT_TEMPLATE = 'specification'

// Kept as a name of this module for the callers and tests that already import it
// from here. The reader itself lives in bookModel.js (see the note there).
export { readBook, bookTokens }

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

/* ── the document ────────────────────────────────────────────────────────── */

/**
 * The complete design system book as one self-contained HTML document.
 *
 * There is no `watermark` option and that is deliberate: the book is the Pro
 * export, so there is no free variant of it to mark. The free tier keeps the
 * style guide, which carries its credit line. A gate that produces a degraded
 * paid artefact teaches the user that the paid thing is worse.
 */
export function buildDesignSystemBook(design, { projectName = 'Design System', date = new Date(), template = DEFAULT_TEMPLATE, fontData = null } = {}) {
  // The id is only a lookup key; the layout is the module in BOOK_TEMPLATES.
  const tpl = Object.hasOwn(BOOK_TEMPLATES, template) ? BOOK_TEMPLATES[template] : BOOK_TEMPLATES[DEFAULT_TEMPLATE]
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
  // The page roles and the per-colour facts, worked out once so every template
  // paints from the same numbers.
  const roles = deriveRoles(d.palette, { contrast, primary: d.base || d.palette[0] })
  const slots = buildSlots(d, roles)
  const fit = fitTitle(projectName, tpl.titleFit)
  // What a template may read: the resolved book model and the facts computed above.
  // `fontData(file)` is the server's reader for a chrome font (null in the browser).
  // `logo` is the uploaded mark, or null.
  // `white` and `black` are the two fixed grounds a contrast matrix adds to the palette.
  const ctx = { d, projectName, field, fieldInk, iso, year, slots, roles, fit, ladder, tokens, contrast, grade, fontData, white: '#FFFFFF', black: '#000000', logo: readLogo(design) }

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
  // `opts` go to the template's frame (a template reads `cls` to dress a page).
  const addNumbered = (inner, section, leaf = null, opts = {}) => {
    folio += 1
    if (leaf) contents.push({ title: leaf, folio, sub: true })
    add(tpl.frame(ctx, inner, { section, folio, ...opts }))
    return folio
  }
  // A template's page hook returns one page or a list: { inner, leaf, ...frameOpts }.
  const addPages = (list, section) => {
    for (const { inner, leaf = null, ...opts } of [].concat(list || [])) addNumbered(inner, section, leaf, opts)
  }
  const addOpening = (num, title, abstract, bg, ink) => {
    // Only a numbered template shows section numerals.
    const label = tpl.numbered ? num : ''
    if (tpl.openings === false) {
      // No opening page: the contents entry points at the section's first page.
      contents.push({ num: label, title, folio: folio + 1 })
      return
    }
    // An opening that must fall on a right-hand (odd) page leaves the page before
    // it blank, folio only, which still counts as a page.
    if (tpl.openOnRecto && (folio + 1) % 2 === 0) {
      folio += 1
      add(tpl.frame(ctx, '', { section: '', folio, cls: 'pg-blank' }))
    }
    folio += 1
    contents.push({ num: label, title, folio })
    add(tpl.opening(ctx, { num: label, title, abstract, field: bg, ink, folio }))
  }

  // ── 1 · front matter: the cover, or whatever the template puts before the contents
  const front = tpl.front ? [].concat(tpl.front(ctx)) : [tpl.cover(ctx)]
  front.forEach(add)

  // ── 2 · contents (rendered last, placed here) ───────────────────────────
  const contentsSlot = pages.length
  add('')
  folio = front.length + 1 // the front matter and the contents are numbered in roman; the body continues the count

  // Each section adds its own pages; the template decides their order.
  const sections = {}

  // ── colour ──────────────────────────────────────────────────────────────
  sections.colour = () => {
    if (hasPalette) {
      const sys = systemName(d.harmony)
      addOpening(
        '01', 'Colour',
        `${d.palette.length} ${d.palette.length === 1 ? 'colour' : 'colours'} built on ${article(sys)} ${sys} system, each with the ink that reads on it and the ratio that proves it.`,
        field, fieldInk,
      )
      if (tpl.swatches) {
        addPages(tpl.swatches(ctx, slots), 'Colour')
      } else {
        let seen = 0
        balancedChunk(d.palette, BANDS_PER_PAGE).forEach((group, gi) => {
          addNumbered(colourBands(d, group, seen, gi === 0), 'Colour', gi === 0 ? 'The palette' : null)
          seen += group.length
        })
      }
      if (tpl.matrix) addPages(tpl.matrix(ctx, slots), 'Colour')
      else addNumbered(matrixPage(d), 'Colour', 'Contrast matrix')
    }

    if (d.gradient) {
      addNumbered(gradientPage(d), 'Colour', 'The gradient')
    }
  }

  // ── typography ──────────────────────────────────────────────────────────
  sections.typography = () => {
    addOpening(
      '02', 'Typography',
      `${d.heading} for headings, ${d.body} for reading, on a ${d.ratio} scale from ${d.baseSize}px.`,
      '#111114', '#FFFFFF',
    )
    if (tpl.typography) {
      addPages(tpl.typography(ctx), 'Typography')
    } else {
      addNumbered(familiesPage(d), 'Typography', 'The families')
      addNumbered(scalePage(d, ladder), 'Typography', 'The scale')
    }
  }

  // ── tokens ──────────────────────────────────────────────────────────────
  sections.tokens = () => {
    const tokenField = d.palette[1] || d.palette[0] || '#111114'
    addOpening(
      '03', 'Tokens',
      `${tokens.length} custom properties: the whole system as code, ready to paste into a stylesheet.`,
      tokenField, inkFor(tokenField).ink,
    )
    balancedChunk(tokens, tpl.tokensPerPage || TOKENS_PER_PAGE).forEach((group, gi) => {
      addNumbered(tokensPage(group, gi === 0, tokens.length), 'Tokens', gi === 0 ? 'Custom properties' : null)
    })
  }

  for (const id of orderSections(Object.keys(sections), tpl.sectionOrder)) sections[id]()

  // ── colophon ────────────────────────────────────────────────────────────
  // Listed at the top level with no section number. It belongs to the book
  // rather than to a section, and filing it under "03 · Tokens" said it was
  // part of the token chapter, which it is not.
  folio += 1
  const colophonTitle = tpl.colophonTitle || 'Colophon'
  contents.push({ num: '', title: colophonTitle, folio })
  add(tpl.frame(ctx, tpl.colophon ? tpl.colophon(ctx) : colophonPage(d, projectName, iso), { section: colophonTitle, folio }))

  // Section openings are the only entries in the contents: a contents page that
  // lists every leaf is an index, and an index of eleven pages is noise.
  const contentsData = { d, projectName, contents, tokens, iso, folio: front.length + 1 }
  pages[contentsSlot] = tpl.contents ? tpl.contents(ctx, contentsData) : contentsPage(contentsData)

  return `<!doctype html>
<html lang="en-AU">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(projectName)} | Design System</title>
<meta name="description" content="The colour, typography and token specification for ${esc(projectName)}.">
${fontHref}
<style>
${tpl.css(ctx)}
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

/** The colours as slot objects, the one shape every template reads. `kind` is the
 *  palette's primary (slot 0), a neutral (OKLCH chroma under the neutral line) or an
 *  accent; `tints` is the colour at 80, 60, 40 and 20% over `roles.paper`. */
function buildSlots(d, roles) {
  return d.palette.slice(0, MAX_SLOTS).map((hex, i) => {
    const { ink, ratio } = inkFor(hex)
    const ok = hexToOklch(hex)
    return {
      i,
      hex,
      rgb: rgbOf(hex),
      hsl: hslOf(hex),
      oklch: `oklch(${(ok.l * 100).toFixed(1)}% ${ok.c.toFixed(3)} ${Math.round(ok.h)})`,
      name: colorName(hex),
      role: roleLabel(d.harmony, i),
      kind: i === 0 ? 'primary' : isNeutral(hex) ? 'neutral' : 'accent',
      ink,
      ratio,
      grade: grade(ratio),
      lands: slotLandsBook(i),
      placed: slotPlaced(i),
      tints: [80, 60, 40, 20].map((pct) => ({ pct, hex: mixHex(hex, roles.paper, pct / 100) })),
    }
  })
}

/* ── pages ───────────────────────────────────────────────────────────────── */

const ROMAN = ['i', 'ii', 'iii', 'iv', 'v', 'vi']

function contentsPage({ d, projectName, contents, tokens, iso, folio = 2 }) {
  const rows = contents.map(c => `<li${c.sub ? ' class="is-sub"' : ''}>
    <span class="ct-num">${c.sub ? '' : esc(c.num)}</span>
    <span class="ct-title">${esc(c.title)}</span>
    <span class="ct-dot"></span>
    <span class="ct-folio">${c.folio}</span>
  </li>`).join('')
  return `<section class="pg pg-contents">
  <div class="ct-grid">
    <div class="ct-main">
      <h2 class="ct-h">Contents</h2>
      <ol class="ct-list">${rows}</ol>
    </div>
    <aside class="ct-aside">
      <p class="lbl">About this book</p>
      <p>This is the specification for <b>${esc(projectName)}</b>: the colour, typography and token decisions behind the interface, written down so they can be applied consistently and checked.</p>
      <p>Every contrast figure in it was measured, not estimated. Nothing here is illustrative: each value is the value the system actually holds.</p>
      <dl class="ct-facts">
        <div><dt>Colours</dt><dd>${d.palette.length}</dd></div>
        <div><dt>Type steps</dt><dd>8</dd></div>
        <div><dt>Tokens</dt><dd>${tokens.length}</dd></div>
        <div><dt>Issued</dt><dd>${esc(iso)}</dd></div>
      </dl>
    </aside>
  </div>
  <footer class="foot"><span>Contents</span><span class="folio">${ROMAN[folio - 1] || folio}</span></footer>
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
        <p class="bd-lands">${esc(slotLandsBook(idx))}</p>
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
      if (row === col) return '<td class="mx-self">–</td>'
      const r = contrast(row, col)
      // Weight, not colour, carries the pass/fail. The book must never use a
      // colour to mean "status" — the colours here are the SUBJECT, and a green
      // tick beside a swatch would read as the swatch being green.
      const [cls, word] = r >= 4.5 ? ['mx-pass', 'Pass'] : r >= 3 ? ['mx-mid', 'Large'] : ['mx-fail', 'Fail']
      return `<td class="${cls}">${r}<span class="mx-w">${word}</span></td>`
    }).join('')
    return `<tr><th scope="row"><span class="dot" style="background:${row}"></span>${esc(row)}</th>${cells}</tr>`
  }).join('')
  const capped = d.palette.length > MATRIX_MAX
  return `<div class="pg-body">
    <header class="pg-head">
      <h3>Contrast matrix</h3>
      <p class="lede">Every pair in the palette, measured. Read a row as the background and a column as the text on it. The figure is the same either way.</p>
    </header>
    <table class="mx">
      <thead><tr><th scope="col"><span class="mx-corner">bg ╲ fg</span></th>${head}</tr></thead>
      <tbody>${rows}</tbody>
    </table>
    <div class="key">
      <span><b>Pass</b> reads as normal text, 4.5:1 or more</span>
      <span><b>Large</b> reads as large text only, 3:1 or more</span>
      <span><b>Fail</b> is a fill, not a text pair</span>
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
      <h3>The scale</h3>
      <p class="lede">A ${d.ratio} ratio from a ${d.baseSize}px base. Each row is set in the face and size it specifies.</p>
    </header>
    <table class="tb tb-scale">
      <colgroup><col style="width:28mm"><col style="width:20mm"><col style="width:22mm"><col style="width:18mm"><col></colgroup>
      <thead><tr><th>Step</th><th>Size</th><th>rem</th><th>Leading</th><th>Specimen</th></tr></thead>
      <tbody>${rows}</tbody>
    </table>
    <p class="note">Specimens above 44px are shown reduced so the row fits the page; the size column is always the true value. Body copy sets at ${d.lineHeight} leading, headings tighten to 1.15, which is what stops a two-line heading reading as two separate lines.</p>
  </div>`
}

function tokensPage(group, first, total) {
  const rows = group.map(t => `<tr><td class="tk-n">${esc(t.name)}</td><td class="tk-v">${esc(t.value)}</td></tr>`).join('')
  return `<div class="pg-body">
    <header class="pg-head">
      ${first ? `<h3>Custom properties</h3><p class="lede">All ${total} tokens, named for the role each colour plays rather than the colour it happens to be, so a palette change does not orphan the name.</p>` : '<h3 class="cont">Custom properties <span>continued</span></h3>'}
    </header>
    <table class="tk">${rows}</table>
  </div>`
}

function colophonPage(d, projectName, iso) {
  return `<div class="pg-body">
    <header class="pg-head">
      <h3>How this book was made</h3>
    </header>
    <div class="cl-grid">
      <div>
        <p class="lbl">Method</p>
        <p>Contrast is the WCAG 2.2 relative-luminance ratio (§1.4.3). AA needs 4.5:1 for normal text and 3:1 for large; AAA needs 7:1. Every figure is reproducible: the same two hex values always give the same ratio.</p>
        <p class="lbl">Typefaces</p>
        <p>Headings set in ${esc(d.heading)} at ${d.headingWeight}, body in ${esc(d.body)} at ${d.bodyWeight}. Both fall back to <code>system-ui</code>, then the platform sans, so this document reads correctly offline or behind a blocked font host.</p>
      </div>
      <div>
        <p class="lbl">What this book covers</p>
        <p>Colour, typography and tokens: the decisions this system actually holds.</p>
        <p class="lbl">What it does not</p>
        <p>A full identity manual would also carry logo construction, imagery direction, tone of voice and applied examples. Those are not in this book because they are not in the system: this document specifies only what was really designed, and states the boundary rather than filling it with placeholders.</p>
      </div>
    </div>
    <div class="cl-foot">
      <span class="cl-name">${esc(projectName)}</span>
      <span>Issued ${esc(iso)}</span>
      <span>Set from the system it describes</span>
    </div>
  </div>`
}
