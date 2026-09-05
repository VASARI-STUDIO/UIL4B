// THE BRAND GUIDELINES — the second Pro document.
//
// ─────────────────────────────────────────────────────────────────────────────
// THE FOUNDER'S ASK, 2026-09-05
// ─────────────────────────────────────────────────────────────────────────────
// “for our enhanced exporting system … i want multiple export variations for
// premium users”, with reference material at UI Examples/Brand kit examples.
//
// The references are not token files and they are not a longer style guide. They
// are PRESENTATION-QUALITY BRAND GUIDELINES: landscape spreads with a cover, a
// running rail of section markers, a rationale paragraph beside every page
// title, swatches carrying a NAME as well as a hex, boxed alphabet grids, logo
// pages, and a clear-space rule drawn with X measurements.
//
// ─────────────────────────────────────────────────────────────────────────────
// WHY THIS IS A SECOND DOCUMENT AND NOT A SETTING ON THE FIRST
// ─────────────────────────────────────────────────────────────────────────────
// utils/designSystemBook.js already ships and is very good at its job: a 12-page
// A4 PORTRAIT specification manual — bands, a contrast matrix, a token listing,
// a colophon. It is the thing an engineer implements from. What it is not is the
// thing you present, and the founder's references are unambiguously the latter.
//
// So “multiple export variations” is answered with a genuinely different
// document rather than the same pages at another paper size, and Pro now offers
// a real choice:
//
//   book        A4 portrait · specification · what the system IS, measured
//   guidelines  16:9 landscape · presentation · how the brand is USED, argued
//
// The distinction is visible on the page, not just in the description. The book
// sets full-width specification bands, mono figures and a running foot; this
// sets named swatch cards, a section rail, boxed alphabet grids, and a rationale
// column beside every title. Neither is a reflow of the other.
//
// ─────────────────────────────────────────────────────────────────────────────
// THE HONEST SCOPE LINE, WHICH IS THE HARD PART OF THIS ITEM
// ─────────────────────────────────────────────────────────────────────────────
// Both references lean on things UIL4B does not hold. The rule applied here,
// page by page:
//
//  · LOGO PAGES — built, but only from a logo the user actually uploaded (see
//    utils/brandLogo.js). With no logo the section does not exist at all and the
//    closing page names, by title, the pages that are missing and why. A logo
//    section drawn around a placeholder mark would be the single most dishonest
//    thing this document could do.
//
//  · LOGO COLOUR VARIATIONS — the references show a mark reversed to white on a
//    dark ground. We do NOT generate that. Recolouring someone's artwork
//    invents a lockup they never approved, and for most marks it is simply
//    wrong. What this document does instead is the useful half: it places the
//    mark AS SUPPLIED on paper, on ink and on every brand colour, and states
//    plainly that a mark which does not hold on a ground needs a reversed
//    version this document has not invented. That turns the page from a claim
//    into a check, which is what a designer actually wants from it.
//
//  · CLEAR SPACE — drawn, because the geometry is real: the box is measured from
//    the uploaded mark's own aspect ratio. The RULE (X = half the mark's height)
//    is the document's stated default rather than a decision the brand has made,
//    and the page says so in those words. See CLEAR_SPACE_RATIO in brandLogo.js.
//
//  · PHOTOGRAPHIC MOCK-UPS — the tote bag, the lanyard, the card in a hand, the
//    monitor on a desk. NOT BUILT, AND NOT FAKED. There is no imagery in this
//    product to build them from, and generating some would repeat the
//    imagery-rights problem already blocking [fonts-in-use-surface] in
//    src/data/pipeline.js. The honest substitute is the “In use” page, which
//    applies the real palette and the real faces to real type — the Hook
//    reference's own “make it yours” page, which needs no photography to be a
//    genuine application spread.
//
//  · TONE OF VOICE, MOTION, ICONOGRAPHY RULES — not in the system, so not in the
//    document. Named on the closing page instead of silently absent.
//
// ─────────────────────────────────────────────────────────────────────────────
// THE REFERENCES, AND WHAT EACH ONE DECIDED
// ─────────────────────────────────────────────────────────────────────────────
//  · OpenPay (by SlabPixel) — the page anatomy. A rail carrying the mark, the
//    section markers with the current one lit, and the year; then a page title
//    on the left with TWO short rationale columns beside it; then a hairline and
//    the content. Also the boxed alphabet grid, which is the single most
//    recognisable thing on its typography spread.
//  · DSC Labs, “Mini Brand Identity Guidelines” — the numbered section openings
//    (“01 Logo”) with the leaf pages listed beneath a hairline, and the swatch
//    that carries its NAME and its hex INSIDE the colour rather than in a
//    caption under it. That naming is why utils/paletteNames.js is imported: a
//    swatch with only a hex on it is a value, and a swatch with a name on it is
//    a brand decision.
//  · Hook — the “make it yours” spread: one phrase set on every palette colour
//    at once. It is an application page that is completely truthful, because it
//    is made of nothing but the colour and the type the user chose. It is the
//    page that let this document have an application section without inventing a
//    single photograph.
//
// 16:9 rather than A4, because the references are decks and because it is the
// clearest possible signal that this is not the book at another size. The
// browser's own print engine makes the PDF, for the reasons stated at length in
// utils/designSystemBook.js — it embeds the user's real webfont and keeps the
// type vector and selectable, which no client-side PDF library or canvas raster
// can do.
//
// Pure functions over a plain design object — no React, no DOM — so the whole
// document is unit-testable as a string. Contrast maths is imported rather than
// reimplemented, so this document and the book can never state different ratios
// for the same pair.

import { grade, inkFor, readDesign, typeLadder } from './styleGuideExport.js'
import { roleLabel } from './paletteRoles.js'
import { colorName } from './paletteNames.js'
import { clearSpace, readLogo, LOGO_DEPENDENT_PAGES } from './brandLogo.js'

const esc = (s) => String(s ?? '')
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;')

/** Swatch cards per spread. Five is what the harmony engine generates, so the
 *  ordinary palette fills exactly one row of the grid. */
const SWATCHES_PER_PAGE = 5
/** Tiles on an “In use” spread. Six is two rows of three at a size where the
 *  type on them is still being READ rather than merely seen. */
const IN_USE_PER_PAGE = 6
/** How tall the mark is drawn on the clear-space page, in mm. The X measurement
 *  is derived from it, so it is a constant rather than a magic number. */
const CLEAR_SPACE_MARK_MM = 34

function chunk(list, size) {
  const out = []
  for (let i = 0; i < list.length; i += size) out.push(list.slice(i, i + size))
  return out
}

/**
 * Same NUMBER of pages a plain chunk gives, spread evenly across them — lifted
 * in intent from designSystemBook.js's balancedChunk for the same reason: six
 * colours at five-per-page otherwise makes a spread carrying ONE card, which is
 * the most obviously unfinished thing a presentation can do.
 */
function balanced(list, max) {
  if (list.length <= max) return [list]
  const pages = Math.ceil(list.length / max)
  return chunk(list, Math.ceil(list.length / pages))
}

/**
 * The class that makes the LAST tile of a three-column grid span the cells its
 * row would otherwise leave empty.
 *
 * A palette of five in a three-wide grid leaves one blank cell in the second
 * row, and a blank cell at the end of a grid is the clearest possible signal
 * that a document was assembled by a machine that ran out of content. Spanning
 * is a compositional decision - the grid keeps its rhythm and the row still
 * closes - and it costs one class rather than a second layout.
 */
function fillRow(index, total, columns = 3) {
  const remainder = total % columns
  if (!remainder || index !== total - 1) return ''
  return remainder === 1 ? ' is-span3' : ' is-span2'
}

/**
 * Everything the document needs, normalised, with the logo resolved.
 *
 * Built on readDesign() so the palette and type reading is shared with the style
 * guide and the book. Every field is untrusted: a half-written design produces a
 * shorter document, never a broken one.
 */
export function readGuidelines(design) {
  const base = readDesign(design)
  const harmony = typeof design?.palette?.harmony === 'string' ? design.palette.harmony : 'auto'
  const ts = design?.typeScale || {}
  return {
    ...base,
    harmony,
    headingSpacing: Number(ts.headingSpacing) || 0,
    bodySpacing: Number(ts.bodySpacing) || 0,
    logo: readLogo(design),
  }
}

const SYSTEM_NAMES = {
  auto: 'tonal', complement: 'complementary', analogous: 'analogous',
  triadic: 'triadic', split: 'split-complementary', tetradic: 'tetradic',
  monochromatic: 'monochromatic', custom: 'custom',
}
const systemName = (h) => SYSTEM_NAMES[h] || 'tonal'

/** The mark, always in an <img> and never as inline markup — see the security
 *  note at the top of utils/brandLogo.js. `alt` is empty on decorative
 *  repetitions so a screen reader is not read the same wordmark nine times. */
function markImg(logo, { cls = '', alt = '', height = '' } = {}) {
  if (!logo) return ''
  const style = height ? ` style="height:${height}"` : ''
  return `<img class="mk ${cls}" src="${esc(logo.src)}" alt="${esc(alt)}"${style}>`
}

/* ── the sections ─────────────────────────────────────────────────────────── */

/**
 * Which sections this design can actually fill, in order, NUMBERED AFTER the
 * decision rather than before it.
 *
 * This is the mechanism the honest-scope line runs on. With no logo there is no
 * logo section, and Colour is then “01”, not a “02” sitting under a chapter that
 * does not exist — a numbering gap is exactly the tell that a document was
 * assembled from a fixed template and had a piece removed.
 */
export function guidelineSections(d) {
  const sections = []
  if (d.logo) {
    sections.push({
      id: 'logo',
      title: 'Logo',
      abstract: 'The mark as supplied, checked on every ground the system provides, and the space it is entitled to keep.',
      leaves: ['The mark', 'On grounds', 'Clear space'],
    })
  }
  if (d.palette.length) {
    sections.push({
      id: 'colour',
      title: 'Colour',
      abstract: `${d.palette.length} ${d.palette.length === 1 ? 'colour' : 'colours'} on ${systemName(d.harmony)} relationships, each named, specified, and shown carrying real type.`,
      leaves: ['The palette', 'In use'],
    })
  }
  sections.push({
    id: 'type',
    title: 'Typography',
    abstract: `${d.heading} for headings and ${d.body} for reading, set out character by character and step by step.`,
    leaves: d.heading === d.body ? ['The typeface', 'The scale'] : ['Headline face', 'Body face', 'The scale'],
  })
  return sections.map((s, i) => ({ ...s, num: String(i + 1).padStart(2, '0') }))
}

/* ── page furniture ───────────────────────────────────────────────────────── */

/**
 * The rail across the top of every content spread: the mark (or the project
 * name when there is none), the section markers with the current one lit, and
 * the folio. Straight from OpenPay — it is what makes a set of pages read as one
 * document rather than a stack of exports.
 */
function rail(ctx, activeId, folio) {
  const marks = ctx.sections.map(s =>
    `<span class="${s.id === activeId ? 'is-on' : ''}">${esc(s.title)}</span>`).join('')
  const mark = ctx.d.logo
    ? markImg(ctx.d.logo, { cls: 'mk-rail' })
    : `<span class="rail-name">${esc(ctx.projectName)}</span>`
  return `<header class="rail">
    <span class="rail-mark">${mark}</span>
    <nav class="rail-secs">${marks}</nav>
    <span class="rail-folio">${String(folio).padStart(2, '0')}</span>
  </header>`
}

/**
 * A content spread: rail, then the title with its rationale columns, then a
 * hairline, then the body.
 *
 * `notes` is an ARRAY because the reference sets two short columns rather than
 * one wide paragraph, and because two columns force the rationale to be two
 * distinct thoughts instead of one that ran long.
 */
function spread(ctx, { section, title, notes = [], body, folio, cls = '' }) {
  return `<section class="sl ${cls}">
  ${rail(ctx, section, folio)}
  <div class="hd">
    <h2 class="hd-title">${esc(title)}</h2>
    <div class="hd-notes">${notes.map(n => `<p>${esc(n)}</p>`).join('')}</div>
  </div>
  <div class="bd">${body}</div>
</section>`
}

/**
 * A full-bleed section opening: the oversized numeral, the title, the leaf pages
 * listed under a hairline (DSC), the abstract at the foot, and the palette run
 * full-height down the right edge.
 *
 * THE FIELD ON THE RIGHT IS NOT DECORATION, and it is the answer to a real
 * problem found by rendering the page rather than by reading it. Both references
 * fill the opening with a large piece of artwork - a gradient, a colour field -
 * and without one this page was a title in the top-left corner above two thirds
 * of empty ground, which reads as a template with a picture missing. We cannot
 * invent artwork. What we CAN do is what the book already does on its cover: run
 * the system itself full-bleed. The bands are the user's real palette at a size
 * you can judge, so the graphic is the brand rather than a stand-in for it.
 */
function opening(section, field, ink, palette) {
  const leaves = section.leaves.map(l => `<li>${esc(l)}</li>`).join('')
  // The GROUND is dropped from its own field. This is the defect
  // designSystemBook.js already records on its cover band: when the page is
  // painted in the primary and the primary is also the first band, that band is
  // invisible and the field reads as starting a fifth of the way down, like a
  // misaligned rule. The colour opening is painted in the primary, so on that
  // page the field is everything the primary is not.
  const bands = palette.filter(c => c !== field)
  const field_ = bands.length
    ? `<div class="op-field" aria-hidden="true">${bands.map(c => `<i style="background:${c}"></i>`).join('')}</div>`
    : ''
  return `<section class="sl sl-open" style="background:${field};color:${ink}">
  <div class="op-left">
    <p class="op-head"><span class="op-num">${esc(section.num)}</span> ${esc(section.title)}</p>
    <ul class="op-leaves">${leaves}</ul>
    <p class="op-abs">${esc(section.abstract)}</p>
  </div>
  ${field_}
</section>`
}

/* ── logo pages ───────────────────────────────────────────────────────────── */

function markPage(ctx, folio) {
  const { logo } = ctx.d
  const facts = [
    ['Format', logo.type === 'image/svg+xml' ? 'SVG — vector' : logo.type.replace('image/', '').toUpperCase()],
    logo.width && logo.height ? ['Supplied at', `${Math.round(logo.width)} × ${Math.round(logo.height)}`] : null,
    logo.aspect ? ['Proportion', `${logo.aspect.toFixed(2)} : 1`] : null,
  ].filter(Boolean)
  return spread(ctx, {
    section: 'logo',
    title: 'The mark',
    notes: [
      'This is the artwork as supplied, reproduced without alteration. Nothing on this page has been redrawn, recoloured or retraced.',
      logo.type === 'image/svg+xml'
        ? 'It is vector artwork, so it holds at any size — from a favicon to a building.'
        : 'It is a raster file, so there is a size past which it will soften. Supply vector artwork for anything printed large.',
    ],
    body: `<div class="mk-stage">${markImg(logo, { cls: 'mk-hero', alt: `${ctx.projectName} logo` })}</div>
      <dl class="facts">${facts.map(([k, v]) => `<div><dt>${esc(k)}</dt><dd>${esc(v)}</dd></div>`).join('')}</dl>`,
    folio,
  })
}

/**
 * The mark on every ground the system provides.
 *
 * THE CAUTION ON THIS PAGE IS THE POINT OF THE PAGE. The references show a
 * reversed white version on the dark tile; we show the SAME artwork on every
 * ground, because inventing a reversed lockup is inventing brand artwork. So the
 * page reads as a test rather than a specification, and says so.
 */
function groundsPage(ctx, folio) {
  const { logo, palette } = ctx.d
  const grounds = [
    { bg: '#FFFFFF', label: 'Paper', border: true },
    { bg: '#111114', label: 'Ink' },
    ...palette.slice(0, 4).map((hex, i) => ({ bg: hex, label: roleLabel(ctx.d.harmony, i) })),
  ]
  const tiles = grounds.map((g, i) => `<div class="gr${g.border ? ' gr-edge' : ''}${fillRow(i, grounds.length)}" style="background:${g.bg}">
      ${markImg(logo, { cls: 'mk-tile' })}
      <span class="gr-label" style="color:${inkFor(g.bg).ink}">${esc(g.label)}</span>
    </div>`).join('')
  return spread(ctx, {
    section: 'logo',
    title: 'On grounds',
    notes: [
      'The same artwork on paper, on ink and on each brand colour. Read it as a test: the mark is approved on a ground only where it still reads.',
      'No reversed or single-colour version has been generated. Where the mark fails a ground below, that variant needs drawing — this document has not invented one for you.',
    ],
    body: `<div class="grounds">${tiles}</div>`,
    folio,
  })
}

function clearSpacePage(ctx, folio, cs) {
  return spread(ctx, {
    section: 'logo',
    title: 'Clear space',
    notes: [
      `Keep a margin of X on every side of the mark, where X is half the height of the mark itself. At the size drawn here that is ${cs.x.toFixed(0)}mm.`,
      'This is the default rule this document applies, not a decision already taken. Replace it if your mark asks for more room — but replace it deliberately.',
    ],
    body: `<div class="cs-stage">
      <div class="cs-box" style="width:${cs.boxWidth.toFixed(1)}mm;height:${cs.boxHeight.toFixed(1)}mm;padding:${cs.x.toFixed(1)}mm">
        <span class="cs-x cs-x-top" style="width:${cs.x.toFixed(1)}mm;height:${cs.x.toFixed(1)}mm">X</span>
        <span class="cs-x cs-x-left" style="width:${cs.x.toFixed(1)}mm;height:${cs.x.toFixed(1)}mm">X</span>
        ${markImg(ctx.d.logo, { cls: 'mk-cs', height: `${cs.markHeight.toFixed(1)}mm` })}
      </div>
    </div>
    <p class="cs-rule">X = ½ the height of the mark</p>`,
    folio,
  })
}

/* ── colour pages ─────────────────────────────────────────────────────────── */

/**
 * Named swatch cards — the DSC move. The name and the hex both sit INSIDE the
 * colour, in the ink measured to read on it, because a chip with a caption
 * underneath is a value and a chip carrying a name is a decision.
 */
function palettePage(ctx, group, offset, first, folio) {
  const cards = group.map((hex, i) => {
    const idx = offset + i
    const { ink, ratio } = inkFor(hex)
    return `<figure class="sw" style="background:${hex};color:${ink}">
      <figcaption class="sw-top">
        <span class="sw-role">${esc(roleLabel(ctx.d.harmony, idx))}</span>
        <span class="sw-name">${esc(colorName(hex))}</span>
      </figcaption>
      <dl class="sw-spec">
        <div><dt>Hex</dt><dd>${esc(hex)}</dd></div>
        <div><dt>Reads with</dt><dd>${ink === '#000000' ? 'black' : 'white'} · ${ratio}:1</dd></div>
      </dl>
    </figure>`
  }).join('')
  return spread(ctx, {
    section: 'colour',
    title: first ? 'The palette' : 'The palette, continued',
    notes: first
      ? [
        `Every colour carries a name as well as a value. Say “${colorName(group[0])}” in a review and the decision survives; say the hex and it does not.`,
        'The ink noted on each card is the one measured to read on it, at the ratio printed beside it. Nothing here was estimated.',
      ]
      : ['The remainder of the palette, specified identically.'],
    body: `<div class="swatches">${cards}</div>`,
    folio,
  })
}

/**
 * “In use” — the application spread, made of nothing but the user's own colour
 * and type.
 *
 * This is the page that replaces the references' photographic mock-ups. It is
 * the Hook “make it yours” reading: one phrase set on every colour at once, in
 * the real heading face, in the measured ink. Every pixel of it is derived from
 * the saved design, which is exactly why it can be in a paid document while a
 * tote bag cannot.
 */
function inUsePage(ctx, group, first, folio) {
  const phrase = ctx.projectName
  const tiles = group.map((hex, i) => {
    const { ink, ratio } = inkFor(hex)
    return `<div class="use${fillRow(i, group.length)}" style="background:${hex};color:${ink}">
      <p class="use-set">${esc(phrase)}</p>
      <p class="use-meta">${esc(hex)} · ${ratio}:1 · ${esc(grade(ratio))}</p>
    </div>`
  }).join('')
  return spread(ctx, {
    section: 'colour',
    title: first ? 'In use' : 'In use, continued',
    notes: [
      `The name set in ${ctx.d.heading} on each colour, in the ink that reads on it. This is the palette doing its actual job rather than sitting in a row of chips.`,
      'There is no photography in this document. A mock-up of a tote bag would be an illustration of a brand nobody has made yet; these tiles are the real system.',
    ],
    body: `<div class="uses">${tiles}</div>`,
    folio,
  })
}

/* ── type pages ───────────────────────────────────────────────────────────── */

const UPPER = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('')
const LOWER = 'abcdefghijklmnopqrstuvwxyz'.split('')
const FIGURES = '0123456789'.split('')

/** The boxed alphabet grid — OpenPay's signature. Ten columns, hairline cells,
 *  set in the real face; the last row runs short and is left short, because a
 *  grid padded to squareness stops being a character set. */
function alphabet(chars, family, weight) {
  const cells = chars.map(c => `<span>${esc(c)}</span>`).join('')
  return `<div class="alpha" style="font-family:'${esc(family)}',system-ui,sans-serif;font-weight:${weight}">${cells}</div>`
}

function facePage(ctx, { role, family, weight, spacing, folio, notes }) {
  return spread(ctx, {
    section: 'type',
    title: role,
    notes,
    body: `<div class="tf">
      <div class="tf-left">
        <p class="tf-eyebrow">Typeface</p>
        <p class="tf-name" style="font-family:'${esc(family)}',system-ui,sans-serif;font-weight:${weight};letter-spacing:${spacing || 0}em">${esc(family)}</p>
        <p class="tf-ag" style="font-family:'${esc(family)}',system-ui,sans-serif;font-weight:${weight}">Ag</p>
      </div>
      <div class="tf-right">
        <p class="tf-lbl">Uppercase</p>
        ${alphabet(UPPER, family, weight)}
        <p class="tf-lbl">Lowercase</p>
        ${alphabet(LOWER, family, weight)}
        <p class="tf-lbl">Figures</p>
        ${alphabet(FIGURES, family, weight)}
      </div>
    </div>`,
    folio,
  })
}

function scalePage(ctx, ladder, folio) {
  const d = ctx.d
  // Clamped for the same measured reason designSystemBook.js clamps: the
  // specimen column has a known width and an unclamped display step sets past
  // it, printing a type specimen with the type cut off. The px column beside it
  // is always the true value.
  const rows = ladder.map((s) => {
    const isHeading = s.exp >= 1
    return `<tr>
      <th scope="row">${esc(s.name)}</th>
      <td class="num">${s.px}px</td>
      <td class="num">${isHeading ? 1.15 : d.lineHeight}</td>
      <td class="sp" style="font-size:${Math.min(s.px, 34)}px;font-family:'${esc(isHeading ? d.heading : d.body)}',system-ui,sans-serif;font-weight:${isHeading ? d.headingWeight : d.bodyWeight}">${esc(s.name)}</td>
    </tr>`
  }).join('')
  return spread(ctx, {
    section: 'type',
    title: 'The scale',
    notes: [
      `Eight steps on a ${d.ratio} ratio from a ${d.baseSize}px base. Every row is set in the face and at the size it specifies.`,
      `Body copy sets at ${d.lineHeight} leading; headings tighten to 1.15, which is what stops a two-line heading reading as two separate lines.`,
    ],
    body: `<table class="scale">
      <thead><tr><th>Step</th><th>Size</th><th>Leading</th><th>Specimen</th></tr></thead>
      <tbody>${rows}</tbody>
    </table>`,
    folio,
  })
}

/* ── cover and closing ────────────────────────────────────────────────────── */

function coverPage(ctx, field, ink, year) {
  const d = ctx.d
  const rest = d.palette.filter(c => c !== field)
  const band = rest.length ? `<div class="cv-band">${rest.map(c => `<i style="background:${c}"></i>`).join('')}</div>` : ''
  return `<section class="sl sl-cover" style="background:${field};color:${ink}">
  <div class="cv-top">
    <span class="cv-mark">${d.logo ? markImg(d.logo, { cls: 'mk-cover', alt: `${ctx.projectName} logo` }) : esc(ctx.projectName)}</span>
    <span class="cv-year">${esc(year)}</span>
  </div>
  <h1 class="cv-title">Brand<br>Guidelines</h1>
  <div class="cv-foot">
    <span>${esc(ctx.projectName)}</span>
    <span>${ctx.sections.map(s => esc(s.title)).join(' · ')}</span>
  </div>
  ${band}
</section>`
}

/**
 * What this document covers and what it does not — always the last page.
 *
 * THE REASON IT IS ALWAYS PRESENT, and never conditional on something being
 * missing: a boundary that only appears when there is bad news reads as an
 * apology. Stated on every copy, it reads as the scope of the work, which is
 * what it is. The absent list is generated from the same facts that decided the
 * sections, so it cannot describe a document other than the one printed.
 */
function scopePage(ctx, folio) {
  const d = ctx.d
  const covers = ctx.sections.map(s => `<li>${esc(s.title)} — ${esc(s.leaves.join(', ').toLowerCase())}</li>`).join('')
  const absent = []
  if (!d.logo) {
    absent.push(`A logo section — ${LOGO_DEPENDENT_PAGES.join(', ')}. Add your logo in the export panel and these pages are generated from it.`)
  } else if (!d.logo.aspect) {
    absent.push('The clear-space rule. Your logo file states no dimensions, so the keep-out box could only have been drawn to a guessed proportion.')
  }
  absent.push('Reversed and single-colour versions of the mark. Recolouring supplied artwork invents a lockup nobody approved, so this document checks the mark on each ground instead of redrawing it.')
  absent.push('Photographic applications — signage, packaging, merchandise, a card in a hand. There is no imagery in this system to build them from, and inventing some would misrepresent a brand rather than document it.')
  absent.push('Tone of voice, motion and iconography rules. Those are brand decisions taken outside these tools, so this document does not speak for them.')
  return `<section class="sl sl-scope">
  ${rail(ctx, null, folio)}
  <div class="hd">
    <h2 class="hd-title">Scope</h2>
    <div class="hd-notes"><p>Everything below was generated from the system you built. Nothing in it is illustrative, and nothing in it is a placeholder.</p><p>The second column is as important as the first: a brand book that quietly omits what it cannot say is harder to trust than one that names it.</p></div>
  </div>
  <div class="bd sc-grid">
    <div>
      <p class="sc-lbl">In this document</p>
      <ul class="sc-list">${covers}</ul>
    </div>
    <div>
      <p class="sc-lbl">Not in this document</p>
      <ul class="sc-list sc-absent">${absent.map(a => `<li>${esc(a)}</li>`).join('')}</ul>
    </div>
  </div>
</section>`
}

/* ── the document ─────────────────────────────────────────────────────────── */

/**
 * The complete brand guidelines as one self-contained HTML document.
 *
 * There is no `watermark` option, for the same reason the book has none: this is
 * a Pro export, so there is no free variant to mark. A gate that hands over a
 * degraded paid artefact teaches the buyer that the paid thing is worse.
 */
export function buildBrandGuidelines(design, { projectName = 'Design System', date = new Date() } = {}) {
  const d = readGuidelines(design)
  const sections = guidelineSections(d)
  const ctx = { d, projectName, sections }
  const iso = date.toISOString().slice(0, 10)
  const year = iso.slice(0, 4)

  const field = d.base || '#111114'
  const fieldInk = inkFor(field).ink
  const pages = [coverPage(ctx, field, fieldInk, year)]
  let folio = 0
  const push = (html) => pages.push(html)
  const numbered = (make) => { folio += 1; push(make(folio)) }

  for (const section of sections) {
    const openField = section.id === 'colour' ? field : '#111114'
    push(opening(section, openField, inkFor(openField).ink, d.palette))

    if (section.id === 'logo') {
      numbered((f) => markPage(ctx, f))
      numbered((f) => groundsPage(ctx, f))
      const cs = clearSpace(d.logo, CLEAR_SPACE_MARK_MM)
      if (cs) numbered((f) => clearSpacePage(ctx, f, cs))
    }

    if (section.id === 'colour') {
      let seen = 0
      balanced(d.palette, SWATCHES_PER_PAGE).forEach((group, gi) => {
        const offset = seen
        numbered((f) => palettePage(ctx, group, offset, gi === 0, f))
        seen += group.length
      })
      balanced(d.palette.slice(0, IN_USE_PER_PAGE * 2), IN_USE_PER_PAGE).forEach((group, gi) => {
        numbered((f) => inUsePage(ctx, group, gi === 0, f))
      })
    }

    if (section.id === 'type') {
      const one = d.heading === d.body
      numbered((f) => facePage(ctx, {
        role: one ? 'The typeface' : 'Headline face',
        family: d.heading,
        weight: d.headingWeight,
        spacing: d.headingSpacing,
        folio: f,
        notes: one
          ? [`${d.heading} carries the whole system, headings and reading alike — a single family held at different weights and sizes.`,
            'The full character set is printed so a substitution is obvious the moment one happens.']
          : [`${d.heading} sets the headings at ${d.headingWeight}. It is chosen to be recognised at a glance rather than read at length.`,
            'The full character set is printed so a substitution is obvious the moment one happens.'],
      }))
      if (!one) {
        numbered((f) => facePage(ctx, {
          role: 'Body face',
          family: d.body,
          weight: d.bodyWeight,
          spacing: d.bodySpacing,
          folio: f,
          notes: [`${d.body} sets everything meant to be read at length, at ${d.bodyWeight} and ${d.lineHeight} leading.`,
            'Judge it by the lowercase: that is where reading actually happens, and it is the half a specimen of capitals hides.'],
        }))
      }
      numbered((f) => scalePage(ctx, typeLadder(d), f))
    }
  }

  numbered((f) => scopePage(ctx, f))

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(projectName)} — Brand Guidelines</title>
<meta name="description" content="Brand guidelines for ${esc(projectName)} — logo, colour and typography, generated from the system itself.">
${fontLink(d)}
<style>
${guidelinesCss(d)}
</style>
</head>
<body>
<article class="gd">
${pages.join('\n')}
</article>
</body>
</html>`
}

/**
 * The Google Fonts link for the user's own families, at the weights this
 * document sets.
 *
 * Written locally rather than shared with designSystemBook.js on purpose. The
 * two documents set different weights, and importing the book's copy would drag
 * the whole 900-line book generator into this document's lazily-loaded chunk —
 * so somebody exporting guidelines would download a book generator they never
 * asked for. The style guide keeps its own for the same reason.
 */
function fontLink(d) {
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

/**
 * One grid, held on every spread. 297 × 167mm is 16:9 to a tenth of a
 * millimetre, and it is declared as an exact @page size so the printed PDF is a
 * deck rather than a landscape A4 with bands down the sides.
 */
function guidelinesCss(d) {
  return `  :root{
    --ink:#121216; --mut:#6C6C77; --line:#DEDEE4; --hair:#EEEEF2; --paper:#fff;
    --m:15mm;
    --head:'${esc(d.heading)}',system-ui,-apple-system,'Segoe UI',sans-serif;
    --body:'${esc(d.body)}',system-ui,-apple-system,'Segoe UI',sans-serif;
    --mono:ui-monospace,SFMono-Regular,'SF Mono',Menlo,Consolas,monospace;
  }
  *{box-sizing:border-box}
  html{-webkit-text-size-adjust:100%}
  body{margin:0;background:#E9E9ED;color:var(--ink);font-family:var(--body);
    font-size:9pt;line-height:1.5;-webkit-font-smoothing:antialiased}

  /* Exact height, never min-height: a page break landing mid-grid would
     repaginate differently on every printer. */
  .sl{position:relative;width:297mm;height:167mm;padding:var(--m);
    background:var(--paper);margin:6mm auto;overflow:hidden;
    display:flex;flex-direction:column;box-shadow:0 1px 14px rgba(18,18,22,.13)}
  h1,h2{font-family:var(--head);font-weight:${d.headingWeight};margin:0;line-height:1.05}
  p{margin:0}
  .num,.sw-spec dd,.facts dd{font-family:var(--mono);font-variant-numeric:tabular-nums}

  /* ── rail ───────────────────────────────────────────────────────────── */
  .rail{display:flex;align-items:center;gap:10mm;flex:0 0 auto;
    padding-bottom:3mm;font-size:6.5pt;letter-spacing:.16em;text-transform:uppercase}
  .rail-mark{display:flex;align-items:center;min-width:0}
  .rail-name{font-family:var(--head);font-weight:${d.headingWeight};letter-spacing:.04em;font-size:7.5pt}
  .mk-rail{height:5mm;width:auto;max-width:40mm;object-fit:contain;object-position:left center}
  .rail-secs{display:flex;gap:6mm;margin-left:auto;color:#B6B6C0}
  .rail-secs .is-on{color:var(--ink)}
  .rail-folio{font-family:var(--mono);letter-spacing:0;color:var(--mut);font-size:7.5pt}

  /* ── head ───────────────────────────────────────────────────────────── */
  .hd{display:grid;grid-template-columns:76mm 1fr;gap:10mm;flex:0 0 auto;
    border-top:.5pt solid var(--ink);padding-top:5mm;margin-bottom:7mm}
  .hd-title{font-size:19pt;letter-spacing:-.015em}
  /* Two columns, because the reference sets two short thoughts rather than one
     paragraph that ran long. */
  .hd-notes{display:grid;grid-template-columns:1fr 1fr;gap:8mm;font-size:7.5pt;
    line-height:1.5;color:var(--mut);max-width:150mm;margin-left:auto}
  .bd{flex:1 1 auto;min-height:0;display:flex;flex-direction:column}

  /* ── cover ──────────────────────────────────────────────────────────── */
  .sl-cover{justify-content:space-between}
  .cv-top{display:flex;justify-content:space-between;align-items:flex-start;
    font-size:7.5pt;letter-spacing:.2em;text-transform:uppercase;opacity:.9}
  .mk-cover{height:7mm;width:auto;max-width:60mm;object-fit:contain;object-position:left center}
  /* Set LOW and large. A centred title reads as a slide; a cover is a
     composition and the mass belongs off the middle. */
  .cv-title{font-size:64pt;letter-spacing:-.03em;margin:auto 0 6mm;line-height:.94}
  .cv-foot{display:flex;justify-content:space-between;font-size:7.5pt;
    letter-spacing:.14em;text-transform:uppercase;opacity:.85;padding-bottom:6mm}
  .cv-band{display:flex;height:8mm;position:absolute;left:0;right:0;bottom:0}
  .cv-band i{flex:1}

  /* ── section opening ────────────────────────────────────────────────── */
  /* The opening is one column of text against a full-bleed field. .sl is
     already a flex column, so the left block only has to push its two masses
     apart: the numbered title at the head, the abstract at the foot. */
  .sl-open{padding-right:0}
  .op-left{display:flex;flex-direction:column;justify-content:space-between;
    height:100%;width:58%;padding-right:10mm}
  .op-head{font-family:var(--head);font-weight:${d.headingWeight};font-size:46pt;
    letter-spacing:-.025em;line-height:1}
  .op-num{font-family:var(--mono);font-size:22pt;letter-spacing:0;opacity:.55;
    vertical-align:.85em;margin-right:3mm}
  .op-leaves{list-style:none;margin:7mm 0 auto;padding:4mm 0 0;max-width:70mm;
    border-top:.5pt solid currentColor;font-size:7.5pt;letter-spacing:.16em;
    text-transform:uppercase;opacity:.8}
  .op-leaves li{padding:1.2mm 0}
  .op-abs{font-size:13.5pt;line-height:1.28;opacity:.92;
    font-family:var(--head);font-weight:${d.headingWeight};letter-spacing:-.015em}
  /* Full-bleed: it cancels the page padding rather than sitting inside it, so
     the palette reads as the ground of the page and not as a swatch strip laid
     on top of one. */
  .op-field{position:absolute;top:0;right:0;bottom:0;width:34%;display:flex;flex-direction:column}
  .op-field i{flex:1}

  /* ── logo pages ─────────────────────────────────────────────────────── */
  .mk{display:block;max-width:100%}
  .mk-stage{flex:1 1 auto;display:flex;align-items:center;justify-content:center;
    border:.5pt solid var(--hair);background:#FAFAFC;min-height:0}
  .mk-hero{max-height:56mm;max-width:150mm;width:auto;height:auto;object-fit:contain}
  .facts{display:flex;gap:14mm;margin:5mm 0 0;flex:0 0 auto}
  .facts dt{font-size:6.5pt;letter-spacing:.16em;text-transform:uppercase;color:var(--mut);margin-bottom:1mm}
  .facts dd{margin:0;font-size:8.5pt}
  .grounds{display:grid;grid-template-columns:repeat(3,1fr);gap:4mm;flex:1 1 auto;min-height:0}
  /* See fillRow(): the last tile takes the cells its row would have left blank,
     rather than the grid ending on a hole. */
  .is-span2{grid-column:span 2}
  .is-span3{grid-column:span 3}
  .gr{position:relative;display:flex;align-items:center;justify-content:center;padding:6mm}
  .gr-edge{box-shadow:inset 0 0 0 .5pt var(--line)}
  .mk-tile{max-height:16mm;max-width:70%;width:auto;object-fit:contain}
  .gr-label{position:absolute;left:3mm;bottom:2.5mm;font-size:6pt;
    letter-spacing:.16em;text-transform:uppercase;opacity:.8}
  .cs-stage{flex:1 1 auto;display:flex;align-items:center;justify-content:center;min-height:0}
  .cs-box{position:relative;display:flex;align-items:center;justify-content:center;
    outline:.5pt dashed var(--ink);outline-offset:0}
  .mk-cs{width:auto;max-width:100%;object-fit:contain}
  /* The X markers sit ON the keep-out band they measure, which is the only
     placement that makes the measurement self-evident. */
  .cs-x{position:absolute;display:flex;align-items:center;justify-content:center;
    background:#EFEFF3;font-family:var(--mono);font-size:6.5pt;color:var(--mut)}
  .cs-x-top{top:0;left:0}
  .cs-x-left{left:0;top:50%;transform:translateY(-50%)}
  .cs-rule{flex:0 0 auto;margin-top:4mm;font-size:7pt;letter-spacing:.16em;
    text-transform:uppercase;color:var(--mut);text-align:center}

  /* ── swatches ───────────────────────────────────────────────────────── */
  .swatches{display:grid;grid-auto-flow:column;grid-auto-columns:1fr;gap:4mm;flex:1 1 auto;min-height:0}
  .sw{display:flex;flex-direction:column;justify-content:space-between;margin:0;padding:5mm}
  .sw-top{display:flex;flex-direction:column;gap:2mm}
  .sw-role{font-size:6pt;letter-spacing:.18em;text-transform:uppercase;opacity:.75}
  .sw-name{font-family:var(--head);font-weight:${d.headingWeight};font-size:12pt;line-height:1.1}
  .sw-spec{margin:0;display:flex;flex-direction:column;gap:1.6mm}
  .sw-spec div{display:flex;justify-content:space-between;gap:3mm;font-size:6.5pt;
    border-top:.5pt solid currentColor;padding-top:1.4mm;opacity:.85}
  .sw-spec dt{letter-spacing:.1em;text-transform:uppercase}
  .sw-spec dd{margin:0}

  /* ── in use ─────────────────────────────────────────────────────────── */
  .uses{display:grid;grid-template-columns:repeat(3,1fr);gap:4mm;flex:1 1 auto;min-height:0}
  .use{display:flex;flex-direction:column;justify-content:space-between;padding:5mm}
  .use-set{font-family:var(--head);font-weight:${d.headingWeight};font-size:17pt;
    line-height:1.05;letter-spacing:-.01em;word-break:break-word}
  .use-meta{font-family:var(--mono);font-size:6pt;letter-spacing:.06em;opacity:.85}

  /* ── typography ─────────────────────────────────────────────────────── */
  .tf{display:grid;grid-template-columns:82mm 1fr;gap:12mm;flex:1 1 auto;min-height:0}
  /* min-height:0 on both columns: a grid item defaults to min-height:auto, so
     without it a tall column pushes THROUGH the fixed page instead of being
     held by it, and a page that silently grows is a page that repaginates
     differently on every printer. */
  .tf-left{display:flex;flex-direction:column;min-width:0;min-height:0}
  .tf-eyebrow{font-size:6.5pt;letter-spacing:.18em;text-transform:uppercase;color:var(--mut)}
  .tf-name{font-size:22pt;line-height:1.1;margin:2mm 0 0;word-break:break-word}
  /* The specimen fills what the name leaves and is CENTRED in it rather than
     pinned to the foot — pinned, it sat under a band of empty paper that read
     as the column having failed to fill. */
  .tf-ag{flex:1 1 auto;min-height:0;display:flex;align-items:center;
    font-size:92pt;line-height:.86;letter-spacing:-.035em;overflow:hidden}
  .tf-right{display:flex;flex-direction:column;min-width:0;min-height:0}
  .tf-lbl{font-size:6.5pt;letter-spacing:.18em;text-transform:uppercase;color:var(--mut);margin:0 0 1.5mm}
  .tf-lbl:not(:first-child){margin-top:3.5mm}
  /* The boxed grid — OpenPay's signature. Fixed ten columns with hairline cells;
     the last row runs short and is LEFT short, because a character set padded
     out to a rectangle has stopped being a character set.
     THE CELL IS A FIXED HEIGHT, NOT A SQUARE. Square cells at ten columns across
     the 160mm right-hand column came out 16mm tall, so three grids stood 100mm
     over the page and both type spreads overflowed — measured in a browser, not
     guessed. A character grid is a reading object, so it is set at a reading
     size and the cell follows it. */
  .alpha{display:grid;grid-template-columns:repeat(10,1fr);
    border-top:.5pt solid var(--line);border-left:.5pt solid var(--line)}
  .alpha span{display:flex;align-items:center;justify-content:center;
    height:8mm;font-size:11pt;line-height:1;
    border-right:.5pt solid var(--line);border-bottom:.5pt solid var(--line)}
  .scale{width:100%;border-collapse:collapse;font-size:8pt;table-layout:fixed}
  .scale th,.scale td{text-align:left;padding:2.6mm 2mm;
    border-bottom:.5pt solid var(--hair);vertical-align:middle}
  .scale thead th{font-size:6.5pt;letter-spacing:.16em;text-transform:uppercase;
    color:var(--mut);border-bottom:.5pt solid var(--ink)}
  .scale th[scope=row]{font-weight:600;white-space:nowrap;width:34mm}
  .scale td.num{width:22mm}
  .scale td.sp{white-space:nowrap;overflow:hidden;line-height:1.1}

  /* ── scope ──────────────────────────────────────────────────────────── */
  .sc-grid{display:grid;grid-template-columns:1fr 1.35fr;gap:14mm}
  .sc-lbl{font-size:6.5pt;letter-spacing:.18em;text-transform:uppercase;
    color:var(--mut);margin-bottom:3mm}
  .sc-list{list-style:none;margin:0;padding:0;font-size:8pt;line-height:1.45}
  .sc-list li{padding:2.6mm 0;border-top:.5pt solid var(--hair)}
  .sc-list li:first-child{border-top:.5pt solid var(--ink)}
  .sc-absent li{color:var(--mut)}

  @media print{
    body{background:#fff}
    .sl{margin:0;box-shadow:none;break-after:page;page-break-after:always}
    .sl:last-child{break-after:auto;page-break-after:auto}
    @page{size:297mm 167mm;margin:0}
  }`
}
