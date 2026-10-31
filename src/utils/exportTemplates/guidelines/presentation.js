// The brand guidelines, "Presentation": a 16:9 deck of mostly empty slides, the brand
// shown at work, and the specifications at the back. The front of the deck is the cover,
// the description, the mark, its clear space, the palette as a field of colour and one
// type specimen; the appendix holds the colour values, the type scale and the logo facts;
// the scope page closes it. Everything that is read is set in the user's own faces; the
// template's chrome (Instrument Sans) carries one small line per slide (the section on the
// left, the slide number on the right) and the small labels. The template composes the
// whole deck (`slides`); the generator hands it the facts and the logo geometry.

import { esc, safeHex, inkName, fitTitle, clampTitle, chromeFor, specimenScale, systemSentence, glyphStrip } from '../shared.js'
import { mixHex, softInk } from '../roles.js'
import { unitMm } from './notes.js'

const CHROME = Object.freeze({ family: 'Instrument Sans', weights: '400 700', file: 'instrument-sans-latin.woff2' })

const LABEL = 'Brand guidelines'
const SLIDE_MM = 297
// 267 mm (the slide less a 15 mm margin each side) in points.
const COVER_FIT = Object.freeze({ steps: Object.freeze([110, 84, 64, 48, 36]), maxLines: 2, measure: 757 })
// The description on its own slide: 240 mm measure, the largest step that holds it in five lines.
const LINE_FIT = Object.freeze({ steps: Object.freeze([44, 36, 30, 26, 22, 18]), maxLines: 5, measure: 680 })
// The type slide's heading sentence, 240 mm measure.
const TYPE_FIT = Object.freeze({ steps: Object.freeze([54, 44, 36, 30, 24]), maxLines: 3, measure: 680 })
// The generator keeps at most this many characters of the description, so a text this long may end mid-word.
const DESCRIPTION_CAP = 280
// The cover carries the description's first sentence only when it is this short.
const COVER_SENTENCE_MAX = 140
// The primary colour's name on the primary field of the colour slide: 5/12 of the slide less its padding (98.75 mm), or the whole width alone.
const FIELD_SHARE = 5 / 12
const FIELD_PAD_MM = 25
const NAME_FIT = Object.freeze({ steps: Object.freeze([48, 38, 30, 24]), maxLines: 2, measure: 280 })
const NAME_FIT_SOLO = Object.freeze({ steps: Object.freeze([96, 72, 54, 40]), maxLines: 2, measure: 757 })
// How the strips beside the primary are labelled: with up to WIDE_MAX of them each is wide
// enough for horizontal text; past that the labels run up the strip, and past HEX_MAX the hex
// stays in the appendix.
const WIDE_MAX = 7
const HEX_MAX = 9
// The clear-space drawing: the mark's height in mm, bounded so the box fits the slide.
const CLEAR_SPACE_MARK_MM = 40
const CLEAR_SPACE_WIDTH_MM = 240
// The colour table is one column up to TWO_COLUMN_FROM colours, two after.
const TWO_COLUMN_FROM = 8
// What the scale table has to fit, in mm: the height under its head, the specimen column's width, a row's padding and its row text.
const SCALE_FIT = Object.freeze({ roomMm: 116, widthMm: 107, padMm: 3.7, textMm: 4.2, lineHeight: 1.1 })

const pad = (n) => String(n).padStart(2, '0')
const fam = (name) => `'${esc(name)}',system-ui,sans-serif`
// A sentence end: a full stop, ! or ?, any closing quote or bracket after it, then a space or the end.
const SENTENCE_END = /[.!?]["')\]”’]*(?=\s|$)/g

/**
 * The description as it may be shown whole. A text the generator cut at its cap and
 * left unfinished is trimmed back to its last sentence end, or failing that to its
 * last whole word with an ellipsis; a text that ends properly, or is shorter than the
 * cap, is returned as written.
 */
function wholeDescription(text) {
  const t = String(text || '').trim()
  if (t.length < DESCRIPTION_CAP || /[.!?]["')\]”’]*$/.test(t)) return t
  let end = -1
  for (const m of t.matchAll(SENTENCE_END)) end = m.index + m[0].length
  if (end > 0) return t.slice(0, end)
  const word = t.slice(0, t.lastIndexOf(' ')).replace(/[\s,;:–—-]+$/, '')
  return `${word || t}…`
}

/** The description's first sentence, or '' when it is too long for the cover. */
function coverSentence(text) {
  const t = wholeDescription(text)
  const first = t.match(/^[\s\S]*?[.!?]["')\]”’]*(?=\s|$)/)?.[0] || t
  return first.length <= COVER_SENTENCE_MAX ? first : ''
}

const spacing = (v) => (Number.isFinite(Number(v)) ? Number(v) : 0)

/** The one chrome line of a slide: the section on the left and the slide number on the right. */
function chrome(left, n, { box = '', color = '' } = {}) {
  const style = [box, color && `color:${color}`].filter(Boolean).join(';')
  return `<div class="ch"${style ? ` style="${style}"` : ''}><span>${left}</span>${n ? `<span class="ch-folio">${pad(n)}</span>` : ''}</div>`
}

/** A slide on the paper: its chrome line, then the body. */
function paperSlide(ctx, n, left, cls, body) {
  const { paper, ink } = ctx.roles
  const soft = softInk(ink, paper, ctx.contrast)
  return `<section class="sl ${cls}" style="--soft:${safeHex(soft, 'CanvasText')}">
  ${chrome(esc(left), n)}
  ${body}
</section>`
}

/* ── cover ───────────────────────────────────────────────────────────────── */

function cover(ctx) {
  const { d, field, fieldInk: ink, year, projectName } = ctx
  const fit = fitTitle(projectName, COVER_FIT)
  const shown = clampTitle(projectName, fit.size, COVER_FIT)
  const soft = softInk(ink, field, ctx.contrast)
  // With a mark the label moves to the right, beside the year.
  const left = d.logo ? ctx.markImg({ cls: 'mk-cover', alt: `${projectName} logo` }) : LABEL
  const right = d.logo ? `${LABEL} · ${esc(year)}` : esc(year)
  const sentence = coverSentence(d.description)
  const desc = sentence ? `<p class="cv-desc">${esc(sentence)}</p>` : ''
  // A name cut for the cover is printed whole beneath it.
  const full = fit.clamp ? `<p class="cv-full">${esc(projectName)}</p>` : ''
  return `<section class="sl sl-cover" style="background:${safeHex(field, 'Canvas')};color:${safeHex(ink, 'CanvasText')};--soft:${safeHex(soft, 'CanvasText')}">
  <div class="ch"><span>${left}</span><span>${right}</span></div>
  <h1 class="cv-title${fit.clamp ? ' is-clamped' : ''}" style="font-size:${fit.size}pt">${esc(shown)}</h1>
  ${desc}${full}
</section>`
}

/* ── the front of the deck ───────────────────────────────────────────────── */

/** The description set large in the heading face: the one thing on the slide. */
function lineSlide(ctx, n) {
  const text = wholeDescription(ctx.d.description)
  const fit = fitTitle(text, LINE_FIT)
  const shown = clampTitle(text, fit.size, LINE_FIT)
  return paperSlide(ctx, n, ctx.projectName, 'sl-line', `<p class="ln" style="font-size:${fit.size}pt">${esc(shown)}</p>`)
}

/** The first three grounds that differ, in the order the generator lists them. */
function threeGrounds(grounds) {
  const seen = new Set()
  const out = []
  for (const g of grounds) {
    const key = String(g.bg).toUpperCase()
    if (seen.has(key)) continue
    seen.add(key)
    out.push(g)
    if (out.length === 3) break
  }
  return out
}

/** The mark large on the paper, then on paper, ink and the primary, labelled; nothing about the file. */
function markSlide(ctx, n) {
  const tiles = threeGrounds(ctx.grounds)
  const cells = tiles.map((g) => `<div class="gt${g.border ? ' gt-edge' : ''}" style="background:${safeHex(g.bg, 'Canvas')}">
      ${ctx.markImg({ cls: 'mk-tile' })}
      <span class="gt-lb" style="color:${safeHex(g.soft, 'CanvasText')}">${esc(g.label)}</span>
    </div>`).join('')
  const caption = `${ctx.notes.mark[0] || ''} ${ctx.notes.grounds[1] || ''}`.trim()
  return paperSlide(ctx, n, 'Logo', 'sl-mark', `<div class="mk-stage">${ctx.markImg({ cls: 'mk-hero', alt: `${ctx.projectName} logo` })}</div>
  <div class="gts" style="grid-template-columns:repeat(${tiles.length},1fr)">${cells}</div>
  <p class="cap">${esc(caption)}</p>`)
}

/** The keep-out box drawn on the paper, with the rule beneath; '' when the file states no proportions. */
function clearSpaceSlide(ctx, n) {
  const logo = ctx.d.logo
  const h = Math.min(CLEAR_SPACE_MARK_MM, CLEAR_SPACE_WIDTH_MM / ((logo.aspect || 1) + 1))
  const cs = ctx.clearSpaceAt(h)
  if (!cs) return ''
  const unit = unitMm(cs.x)
  const rule = `X = ½ the height of the mark${unit ? `, ${unit} at the size drawn` : ''}. This is the default rule, not a decision already taken.`
  const x = `width:${cs.x.toFixed(1)}mm;height:${cs.x.toFixed(1)}mm`
  return paperSlide(ctx, n, 'Logo · Clear space', 'sl-cs', `<div class="cs-stage">
    <div class="cs-box" style="width:${cs.boxWidth.toFixed(1)}mm;height:${cs.boxHeight.toFixed(1)}mm;padding:${cs.x.toFixed(1)}mm">
      <span class="cs-x cs-x-top" style="${x}">X</span>
      <span class="cs-x cs-x-left" style="${x}">X</span>
      ${ctx.markImg({ cls: 'mk-cs', height: `${cs.markHeight.toFixed(1)}mm` })}
    </div>
  </div>
  <p class="cs-rule">${esc(rule)}</p>`)
}

/** What a colour field carries at its foot: the name, the hex (when there is room) and where it lands, in the colour's own ink. */
function colourLabel(ctx, s, { hex = true } = {}) {
  return `<div class="lb">
      <b class="lb-name">${esc(s.name)}</b>${hex ? `<span class="lb-hex">${esc(s.hex)}</span>` : ''}<span class="lb-lands">${esc(s.lands)}</span>
    </div>`
}

/** The palette at work: the primary as a field with its own name on it, the rest as full-height strips. */
function colourSlide(ctx, n) {
  const [primary, ...rest] = ctx.slots
  const solo = rest.length === 0
  const tall = rest.length > WIDE_MAX
  const paint = (s) => `background:${safeHex(s.hex, 'GrayText')};color:${safeHex(s.ink, 'CanvasText')};--soft:${safeHex(softInk(s.ink, s.hex, ctx.contrast), 'CanvasText')}`
  const spec = solo ? NAME_FIT_SOLO : NAME_FIT
  const fit = fitTitle(primary.name, spec)
  const shown = clampTitle(primary.name, fit.size, spec)
  const strips = rest.map((s) => `<div class="cl-strip" style="${paint(s)}">${colourLabel(ctx, s, { hex: !tall || rest.length <= HEX_MAX })}</div>`).join('')
  const box = solo ? '' : `right:auto;width:${(SLIDE_MM * FIELD_SHARE - FIELD_PAD_MM).toFixed(2)}mm`
  // The slide number sits in the primary field when there are strips, so it never lands across a seam.
  return `<section class="sl sl-colour${tall ? ' is-tall' : ''}">
  ${chrome('Colour', n, { box, color: safeHex(softInk(primary.ink, primary.hex, ctx.contrast), 'CanvasText') })}
  <div class="cl-main${solo ? ' is-solo' : ''}" style="${paint(primary)}">
    <h2 class="cl-name${fit.clamp ? ' is-clamped' : ''}" style="font-size:${fit.size}pt">${esc(shown)}</h2>
    ${colourLabel(ctx, primary)}
  </div>
  ${rest.length ? `<div class="cl-strips">${strips}</div>` : ''}
</section>`
}

/** The system in its two faces: the heading sentence large, the body sentence at reading size. */
function typeSlide(ctx, n) {
  const { d } = ctx
  const head = systemSentence(d, 'heading')
  const fit = fitTitle(head, TYPE_FIT)
  const shown = clampTitle(head, fit.size, TYPE_FIT)
  const faces = d.heading !== d.body
    ? `${d.heading} ${d.headingWeight}, ${d.body} ${d.bodyWeight}`
    : d.headingWeight === d.bodyWeight ? `${d.heading} ${d.headingWeight}` : `${d.heading} ${d.headingWeight} and ${d.bodyWeight}`
  return paperSlide(ctx, n, `Type · ${faces}`, 'sl-type', `<div class="ty">
    <h2 class="ty-head" style="font-size:${fit.size}pt;letter-spacing:${spacing(d.headingSpacing)}em">${esc(shown)}</h2>
    <p class="ty-body" style="font-family:${fam(d.body)};font-weight:${d.bodyWeight};line-height:${d.lineHeight};letter-spacing:${spacing(d.bodySpacing)}em">${esc(systemSentence(d, 'body'))}</p>
  </div>`)
}

/* ── the appendix ────────────────────────────────────────────────────────── */

/** One colour table: every value the colour slide leaves out. `compact` folds the role under the name. */
function colourTable(ctx, slots, compact) {
  const near = (hex) => ctx.contrast(hex, ctx.roles.paper) < 1.5
  const rows = slots.map((s) => `<tr>
      <td><i class="sq${near(s.hex) ? ' sq-edge' : ''}" style="background:${safeHex(s.hex, 'GrayText')}"></i></td>
      <th scope="row">${esc(s.name)}${compact ? `<span class="ap-role">${esc(s.role)}</span>` : ''}</th>
      ${compact ? '' : `<td>${esc(s.role)}</td>`}
      <td class="fig">${esc(s.hex)}</td>
      <td class="fig">${esc(inkName(s.ink))} ${esc(s.ratio)}:1</td>
      <td class="fig">${esc(s.grade)}</td>
      <td>${esc(s.lands)}</td>
    </tr>`).join('')
  const cols = compact ? [7, 31, 19, 23, 13] : [9, 46, 40, 24, 32, 22]
  return `<table class="ap">
      <colgroup>${cols.map((w) => `<col style="width:${w}mm">`).join('')}<col></colgroup>
      <thead><tr><th></th><th>Name</th>${compact ? '' : '<th>Role</th>'}<th>Hex</th><th>Reads with</th><th>Grade</th><th>Where it lands</th></tr></thead>
      <tbody>${rows}</tbody>
    </table>`
}

function colourValuesSlide(ctx, n) {
  const { slots } = ctx
  const two = slots.length >= TWO_COLUMN_FROM
  const half = Math.ceil(slots.length / 2)
  const cut = ctx.d.palette.length > slots.length ? `<p class="cap">The first ${slots.length} of ${ctx.d.palette.length} colours are shown.</p>` : ''
  const body = two
    ? `<div class="ap-cols">${colourTable(ctx, slots.slice(0, half), true)}${colourTable(ctx, slots.slice(half), true)}</div>`
    : colourTable(ctx, slots, false)
  return paperSlide(ctx, n, 'Appendix · Colour values', 'sl-ap', `${body}${cut}`)
}

/** The type scale and the character set of each face. */
function typeScaleSlide(ctx, n) {
  const { d, ladder } = ctx
  // One share of true size for every specimen: 100% when the ladder fits, else the largest that does.
  const { k, label } = specimenScale(ladder, SCALE_FIT)
  const rows = ladder.map((s) => {
    const heading = s.exp >= 1
    return `<tr>
      <th scope="row">${esc(s.name)}</th>
      <td class="fig">${s.px}px</td>
      <td class="fig">${heading ? 1.15 : d.lineHeight}</td>
      <td class="sp" style="font-size:${(s.px * k).toFixed(1)}px;font-family:${fam(heading ? d.heading : d.body)};font-weight:${heading ? d.headingWeight : d.bodyWeight}">${esc(s.name)}</td>
    </tr>`
  }).join('')
  const faces = [['Headings', d.heading, d.headingWeight], ['Body', d.body, d.bodyWeight]]
    .filter(([, family, weight], i, all) => all.findIndex(([, f, w]) => f === family && w === weight) === i)
  const sets = faces.map(([role, family, weight]) => `<div class="gl-set">
        <p class="cap">${esc(role)}: ${esc(family)} ${esc(weight)}</p>
        ${glyphStrip(`font-family:${fam(family)};font-weight:${weight}`)}
      </div>`).join('')
  return paperSlide(ctx, n, 'Appendix · Type', 'sl-ap', `<div class="ap-type">
    <table class="ap ap-scale">
      <colgroup><col style="width:28mm"><col style="width:20mm"><col style="width:20mm"><col></colgroup>
      <thead><tr><th>Step</th><th>Size</th><th>Leading</th><th>${esc(label)}</th></tr></thead>
      <tbody>${rows}</tbody>
    </table>
    <div class="gl-sets">${sets}</div>
  </div>`)
}

/** What is known about the supplied file, as the generator reads it. */
function logoFactsSlide(ctx, n) {
  const facts = ctx.logoFacts.map(([k, v]) => `<div><dt>${esc(k)}</dt><dd>${esc(v)}</dd></div>`).join('')
  const note = ctx.notes.mark[1] ? `<p class="lf-note">${esc(ctx.notes.mark[1])}</p>` : ''
  return paperSlide(ctx, n, 'Appendix · Logo', 'sl-lf', `<dl class="lf">${facts}</dl>${note}`)
}

/* ── scope ───────────────────────────────────────────────────────────────── */

/** What this document covers and what it does not: always the last slide. */
function scopeSlide(ctx, n) {
  const { covers, absent } = ctx.scope
  const list = (items, cls = '') => `<ul class="sc-list${cls}">${items.map((c) => `<li>${esc(c)}</li>`).join('')}</ul>`
  return paperSlide(ctx, n, 'Scope', 'sl-scope', `<h2 class="sc-h">Scope</h2>
  <p class="sc-note">${esc(ctx.notes.scope.join(' '))}</p>
  <div class="sc-grid">
    <div><p class="sc-lbl">In this document</p>${list(covers)}</div>
    <div><p class="sc-lbl">Not in this document</p>${list(absent, ' sc-absent')}</div>
  </div>`)
}

/** The whole deck after the cover. A slide with no data is skipped and the slide numbers close up. */
function slides(ctx) {
  const { d, slots } = ctx
  const plan = [
    d.description && lineSlide,
    d.logo && markSlide,
    d.logo && clearSpaceSlide,
    slots.length && colourSlide,
    typeSlide,
    slots.length && colourValuesSlide,
    typeScaleSlide,
    d.logo && logoFactsSlide,
    scopeSlide,
  ].filter(Boolean)
  const out = []
  for (const make of plan) {
    // The cover is slide 1; a slide that comes back empty takes no number.
    const html = make(ctx, out.length + 2)
    if (html) out.push(html)
  }
  return out
}

/** The leaves this deck has, so the scope page describes it. */
function leaves(section, d) {
  if (section.id === 'logo') return ['The mark', 'On grounds', ...(d.logo?.aspect ? ['Clear space'] : []), 'Logo facts']
  if (section.id === 'colour') return ['The palette', 'Colour values']
  if (section.id === 'type') return [d.heading === d.body ? 'The typeface' : 'Headline and body faces', 'The scale and character set']
  return undefined
}

/**
 * One grid, held on every slide. 297 × 167mm is 16:9 to a tenth of a
 * millimetre, and it is declared as an exact @page size so the printed PDF is a
 * deck rather than a landscape A4 with bands down the sides.
 */
function css(ctx) {
  const { d, roles } = ctx
  const { paper, ink, muted, rule } = roles
  const desk = mixHex(muted, paper, 0.16)
  const shade = mixHex(ink, desk, 0.16)
  const wash = mixHex(ink, paper, 0.05)
  return `${chromeFor(CHROME, ctx.fontData)}
  :root{
    --ink:${ink}; --line:${rule}; --wash:${wash}; --paper:${paper}; --desk:${desk}; --shade:${shade};
    --m:15mm;
    --head:${fam(d.heading)};
    --body:${fam(d.body)};
    --chrome:'Instrument Sans',system-ui,-apple-system,'Segoe UI',sans-serif;
  }
  *{box-sizing:border-box}
  html{-webkit-text-size-adjust:100%;-webkit-print-color-adjust:exact;print-color-adjust:exact}
  body{margin:0;background:var(--desk);color:var(--ink);font-family:var(--body);
    font-size:9pt;line-height:1.45;font-variant-numeric:lining-nums;-webkit-font-smoothing:antialiased}

  /* Exact height, never min-height: a page break landing mid-grid would
     repaginate differently on every printer. The top padding clears the chrome line. */
  .sl{position:relative;width:297mm;height:167mm;padding:21mm var(--m) 14mm;
    background:var(--paper);margin:6mm auto;overflow:hidden;
    display:flex;flex-direction:column;box-shadow:0 1px 14px var(--shade);break-inside:avoid}
  h1,h2{font-family:var(--head);font-weight:${d.headingWeight};margin:0;line-height:1.05;overflow-wrap:anywhere;hyphens:auto}
  p,dl,ul,figure{margin:0}

  /* The chrome face: the one line each slide carries, and the small labels. */
  .ch,.cap,.cs-rule,.cs-x,.gt-lb,.lb-hex,.lb-lands,.ap thead th,.ap .fig,.ap-role,.lf dt,.sc-lbl{
    font-family:var(--chrome);font-variant-numeric:tabular-nums lining-nums;letter-spacing:.02em}
  .ch{position:absolute;top:9mm;left:var(--m);right:var(--m);z-index:1;display:flex;justify-content:space-between;
    align-items:flex-start;gap:10mm;font-size:8pt;line-height:1.2;color:var(--soft)}
  .ch span:first-child{min-width:0;overflow-wrap:anywhere}
  .ch-folio{flex:none}
  .cap{flex:none;font-size:7.5pt;line-height:1.4;color:var(--soft);max-width:230mm}

  /* ── cover ──────────────────────────────────────────────────────────── */
  /* Set LOW and large, and it is the project's name. A centred title reads as a
     slide; a cover is a composition and the mass belongs off the middle. The clamp is
     a backstop: clampTitle has already cut the name at a whole word. */
  .sl-cover{justify-content:flex-end}
  .mk-cover{display:block;height:7mm;width:auto;max-width:60mm;object-fit:contain;object-position:left center}
  .cv-title{letter-spacing:-.03em;line-height:.98;padding-bottom:.14em;
    display:-webkit-box;-webkit-box-orient:vertical;-webkit-line-clamp:2;overflow:hidden}
  .cv-title.is-clamped{padding-bottom:0;line-height:1.12}
  .cv-desc{margin-top:5mm;max-width:215mm;font-size:12pt;line-height:1.4;color:var(--soft);
    display:-webkit-box;-webkit-box-orient:vertical;-webkit-line-clamp:3;overflow:hidden}
  .cv-full{margin-top:4mm;max-width:215mm;font-size:12pt;line-height:1.3;color:var(--soft);overflow-wrap:anywhere}

  /* ── the line ───────────────────────────────────────────────────────── */
  .sl-line{justify-content:center}
  .ln{font-family:var(--head);font-weight:${d.headingWeight};max-width:240mm;
    letter-spacing:-.02em;line-height:1.2;padding-bottom:.1em;overflow-wrap:anywhere}

  /* ── logo ───────────────────────────────────────────────────────────── */
  .mk{display:block;max-width:100%}
  .sl-mark{padding-bottom:12mm}
  .mk-stage{flex:1 1 auto;min-height:0;display:flex;align-items:center;justify-content:center}
  .mk-hero{max-height:50mm;max-width:150mm;width:auto;height:auto;object-fit:contain}
  .gts{display:grid;gap:5mm;flex:none;height:30mm}
  .gt{position:relative;display:flex;align-items:center;justify-content:center;padding:5mm;border:.25mm solid transparent}
  .gt-edge{border-color:var(--line)}
  .mk-tile{max-height:13mm;max-width:70%;width:auto;object-fit:contain}
  .gt-lb{position:absolute;left:3mm;bottom:2.5mm;font-size:7.5pt}
  .sl-mark .cap{margin-top:4mm}
  .cs-stage{flex:1 1 auto;min-height:0;display:flex;align-items:center;justify-content:center}
  .cs-box{position:relative;display:flex;align-items:center;justify-content:center;
    outline:.25mm dashed var(--soft);outline-offset:0}
  .mk-cs{width:auto;max-width:100%;object-fit:contain}
  /* The X markers sit ON the keep-out band they measure, which is the only
     placement that makes the measurement self-evident. */
  .cs-x{position:absolute;display:flex;align-items:center;justify-content:center;
    background:var(--wash);font-size:7.5pt;color:var(--soft)}
  .cs-x-top{top:0;left:0}
  .cs-x-left{left:0;top:50%;transform:translateY(-50%)}
  .cs-rule{flex:none;margin-top:4mm;font-size:7.5pt;color:var(--soft);text-align:center}

  /* ── colour ─────────────────────────────────────────────────────────── */
  /* The slide is the palette: the primary is a field of five twelfths, the rest run full height beside it. */
  .sl-colour{flex-direction:row;padding:0}
  .cl-main{flex:0 0 ${(FIELD_SHARE * 100).toFixed(3)}%;min-width:0;display:flex;flex-direction:column;padding:21mm ${FIELD_PAD_MM - 15}mm 14mm var(--m)}
  .cl-main.is-solo{flex:1 1 auto;padding-right:var(--m)}
  .cl-name{margin-top:auto;margin-bottom:8mm;letter-spacing:-.025em;line-height:1;padding-bottom:.14em;
    display:-webkit-box;-webkit-box-orient:vertical;-webkit-line-clamp:2;overflow:hidden}
  .cl-name.is-clamped{padding-bottom:0;line-height:1.12}
  .cl-strips{flex:1 1 0;min-width:0;display:flex}
  .cl-strip{flex:1 1 0;min-width:0;display:flex;flex-direction:column;justify-content:flex-end;padding:21mm 3.5mm 14mm;overflow:hidden}
  .lb{display:flex;flex-direction:column;gap:1mm;font-size:7.5pt;line-height:1.35;min-width:0}
  .lb-name{font-family:var(--body);font-weight:600;font-size:9pt;line-height:1.2;overflow-wrap:anywhere}
  .lb-hex{color:var(--soft)}
  .lb-lands{color:var(--soft);overflow-wrap:anywhere}
  /* Past seven strips each is too narrow for a line of text, so the label runs up it (read from the bottom). */
  .is-tall .cl-strip{padding:21mm 2mm 14mm}
  .is-tall .lb{writing-mode:vertical-rl;transform:rotate(180deg);gap:1.2mm;align-self:center;max-height:112mm}
  .is-tall .lb>*{white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-height:112mm}
  .is-tall .lb-name{font-size:7.5pt;line-height:1.3}

  /* ── type ───────────────────────────────────────────────────────────── */
  .sl-type{justify-content:flex-end}
  .ty-head{letter-spacing:-.02em;line-height:1.1;max-width:240mm;padding-bottom:.1em}
  .ty-body{margin-top:8mm;max-width:160mm;font-size:14pt;overflow-wrap:anywhere}

  /* ── appendix ───────────────────────────────────────────────────────── */
  .ap{width:100%;border-collapse:collapse;table-layout:fixed;font-size:8pt;line-height:1.35}
  .ap th,.ap td{text-align:left;font-weight:400;padding:1.6mm 2mm 1.6mm 0;border-bottom:.25mm solid var(--line);vertical-align:middle;overflow-wrap:anywhere}
  .ap thead th{font-size:7.5pt;color:var(--soft);border-bottom-color:var(--ink)}
  .ap tbody tr:last-child th,.ap tbody tr:last-child td{border-bottom:0}
  .ap th[scope=row]{font-weight:600}
  .ap .fig{font-size:7.5pt}
  .ap-role{display:block;font-size:7pt;font-weight:400;color:var(--soft)}
  .sq{display:block;width:5mm;height:5mm}
  .sq-edge{box-shadow:inset 0 0 0 .25mm var(--line)}
  .ap-cols{display:grid;grid-template-columns:1fr 1fr;gap:8mm}
  .ap-type{display:grid;grid-template-columns:1fr 78mm;gap:10mm;min-height:0;flex:1 1 auto}
  .ap-scale td.sp{white-space:nowrap;overflow:hidden;line-height:1.1;font-size:inherit}
  .ap-scale td,.ap-scale th{padding-right:2mm}
  .gl-sets{display:flex;flex-direction:column;gap:7mm;min-width:0}
  .gl-set{padding-top:2mm;border-top:.25mm solid var(--line)}
  .sl-ap .cap{margin-top:4mm}
  .lf{display:flex;flex-direction:column;max-width:150mm}
  .lf div{display:flex;justify-content:space-between;align-items:baseline;gap:10mm;padding:3mm 0;border-bottom:.25mm solid var(--line)}
  .lf dt{font-size:7.5pt;color:var(--soft)}
  .lf dd{margin:0;font-size:13pt}
  .lf-note{margin-top:5mm;max-width:150mm;font-size:10pt;line-height:1.5;color:var(--soft)}

  /* ── scope ──────────────────────────────────────────────────────────── */
  .sc-h{font-size:28pt;letter-spacing:-.02em;line-height:1.2;padding-bottom:.08em}
  .sc-note{margin-top:2mm;font-size:10pt;color:var(--soft)}
  .sc-grid{display:grid;grid-template-columns:1fr 1.35fr;gap:14mm;margin-top:8mm;min-height:0}
  .sc-lbl{font-size:7.5pt;color:var(--soft);margin-bottom:2mm}
  .sc-list{list-style:none;margin:0;padding:0;font-size:9.5pt;line-height:1.4}
  .sc-list li{padding:2mm 0;border-top:.25mm solid var(--line);overflow-wrap:anywhere}
  .sc-absent li{color:var(--soft)}

  @media print{
    body{background:none}
    .sl{margin:0;box-shadow:none;break-after:page;page-break-after:always}
    .sl:last-child{break-after:auto;page-break-after:auto}
    @page{size:297mm 167mm;margin:0}
  }`
}

export default Object.freeze({
  id: 'presentation',
  // The ids of the sections the generator builds, in the order this template
  // lays them out.
  sectionOrder: Object.freeze(['logo', 'colour', 'type']),
  leaves,
  cover,
  slides,
  css,
})
