// The brand guidelines, "Grid": an editorial grid laid out landscape, dense and made to
// be read on screen or printed and pinned up. Six columns with a hairline in each gutter
// between filled columns (newspaper style; the grid is never drawn as empty lines), a
// masthead strip on every slide, and content in spans of two to four columns. A slide holds
// two to three topics and two text sizes outside the masthead. The chrome (Schibsted
// Grotesk) carries the masthead, headings and captions; the user's own faces carry the
// front-page name and the specimens. The template composes the whole deck (`slides`).

import { esc, safeHex, inkName, fitTitle, clampTitle, chromeFor, specimenScale } from '../shared.js'
import { mixHex } from '../roles.js'
import { guidelineNotes, unitMm } from './notes.js'

const CHROME = Object.freeze({ family: 'Schibsted Grotesk', weights: '400 900', file: 'schibsted-grotesk-latin.woff2' })

// 273 mm (the slide less a 12 mm margin each side) in points.
const MEASURE = 774
const COVER_STEPS = Object.freeze([72, 54, 40])
// What the scale table has to fit, in mm: the height under its head, the specimen column's width, a row's padding and its row text.
const SCALE_FIT = Object.freeze({ roomMm: 102, widthMm: 106, padMm: 3.05, textMm: 3.8, lineHeight: 1.15 })

// The notes gathered on one slide, so they point at the logo slide rather than "this page".
const WORDS = Object.freeze({ mark: 'the logo slide', ground: 'on the logo slide', drawn: 'on the logo slide', swatch: 'row' })

const pad = (n) => String(n).padStart(2, '0')
const fam = (name) => `'${esc(name)}',system-ui,sans-serif`
const faceStyle = (family, weight, spacing = 0) => `font-family:${fam(family)};font-weight:${weight};letter-spacing:${Number(spacing) || 0}em`

/** The slides after the cover, in order: [{ id, title }]. The cover's contents list reads the same plan. */
function plan(ctx) {
  const out = [{ id: 'colour', title: ctx.slots.length ? 'Colour and type' : 'Typography' }]
  if (ctx.d.logo) out.push({ id: 'logo', title: 'Logo' })
  out.push({ id: 'scale', title: 'The scale' }, { id: 'notes', title: 'Usage notes' }, { id: 'scope', title: 'Scope' })
  return out
}

/** One topic: a heading under a rule, then its body, in a span of the six columns. */
const topic = (title, span, body, cls = '') => `<div class="tp ${cls}" style="grid-column:span ${span}">
    <h2 class="tp-h">${esc(title)}</h2>${body}
  </div>`

/** One inner slide: the masthead (project name, section, slide number) then the topics. */
function slide(ctx, n, section, cls, topics) {
  return `<section class="sl gd ${cls}">
  <header class="mh"><span class="mh-name">${esc(ctx.projectName)}</span><span class="mh-sec">${esc(section)}</span><span class="mh-num">${pad(n)}</span></header>
  <div class="gd-body">${topics.join('')}</div>
</section>`
}

/** The spans of `count` topics across the six columns. */
const spans = (count) => (count >= 3 ? 2 : count === 2 ? 3 : 6)

/* ── cover ───────────────────────────────────────────────────────────────── */

function cover(ctx) {
  const { projectName, d, slots, year } = ctx
  // One line is preferred; two lines only when no step keeps the name whole on one.
  const one = fitTitle(projectName, { steps: COVER_STEPS, maxLines: 1, measure: MEASURE })
  const fit = !one.clamp && !one.broken ? one : fitTitle(projectName, { steps: COVER_STEPS, maxLines: 2, measure: MEASURE })
  const opts = { maxLines: fit.lines > 1 || fit.clamp ? 2 : 1, measure: MEASURE }
  const shown = clampTitle(projectName, fit.size, opts)
  const primary = slots[0]
  const frame = d.logo
    ? `<div class="cv-frame">${ctx.markImg({ cls: 'gd-mark-cover', alt: `${projectName} logo` })}</div>`
    : primary
      ? `<div class="cv-frame cv-swatch" style="background:${safeHex(primary.hex, 'GrayText')};color:${safeHex(primary.ink, 'CanvasText')}"><b>${esc(primary.name)}</b><span>${esc(primary.role)}, ${esc(primary.hex)}</span></div>`
      : ''
  const contents = plan(ctx).map((p, i) => `<li><span>${esc(p.title)}</span><span class="num">${pad(i + 2)}</span></li>`).join('')
  const stand = d.description ? `<p class="cv-stand">${esc(d.description)}</p>` : ''
  const full = fit.clamp ? `<p class="cv-full">${esc(projectName)}</p>` : ''
  const side = `${stand}<h2 class="tp-h cv-toc-h">Contents</h2><ol class="cv-toc">${contents}</ol>${full}`
  return `<section class="sl gd gd-cover">
  <header class="mh mh-cover">
    <div class="mh-line"><span>Brand guidelines</span><span class="num">${esc(year)}</span></div>
    <h1 class="mh-title${fit.clamp ? ' is-clamped' : ''}" style="font-size:${fit.size}pt;${faceStyle(d.heading, d.headingWeight, d.headingSpacing)}">${esc(shown)}</h1>
  </header>
  <div class="gd-body gd-front">
    ${frame ? `<div class="tp" style="grid-column:span 4">${frame}</div><div class="tp cv-side" style="grid-column:span 2">${side}</div>` : `<div class="tp cv-side" style="grid-column:span 6">${side}</div>`}
  </div>
</section>`
}

/* ── colour and type ─────────────────────────────────────────────────────── */

// A chip's size as a share of its row: the primary largest, neutrals smallest.
const CHIP_MM = { primary: 0.85, accent: 0.62, neutral: 0.5 }

function colourTable(ctx) {
  // Rows share the height the slide has: 18 mm at most (few colours), about 7.7 mm at thirteen. A palette
  // longer than that is cut to its first thirteen, and a line under the table says so (6 mm of the height).
  const cut = ctx.d.palette.length > ctx.slots.length
  const row = Math.min(18, (cut ? 94 : 100) / Math.max(1, ctx.slots.length))
  const rows = ctx.slots.map((s) => {
    const chip = (row * (CHIP_MM[s.kind] || 0.62)).toFixed(1)
    return `<tr class="${s.kind === 'primary' ? 'is-primary' : ''}">
      <td class="ct-chip"><i style="width:${chip}mm;height:${chip}mm;background:${safeHex(s.hex, 'GrayText')}"></i></td>
      <th scope="row">${esc(s.name)}</th>
      <td class="mu">${esc(s.role)}</td>
      <td class="num">${esc(s.hex)}</td>
      <td class="num">${esc(inkName(s.ink))} ${esc(s.ratio)}:1 ${esc(s.grade)}</td>
      <td class="mu">${esc(s.lands)}</td>
    </tr>`
  }).join('')
  // The chip column is as wide as the primary's chip (the largest) plus a 2.5 mm gap before the name.
  const chipCol = Math.max(11, row * CHIP_MM.primary + 2.5)
  return `<table class="ct" style="--row:${row.toFixed(1)}mm">
    <colgroup><col style="width:${chipCol.toFixed(1)}mm"><col style="width:40mm"><col style="width:25mm"><col style="width:19mm"><col style="width:32mm"><col></colgroup>
    <thead><tr><th scope="col"></th><th scope="col">Colour</th><th scope="col">Role</th><th scope="col">Hex</th><th scope="col">Reads with</th><th scope="col">Where it lands</th></tr></thead>
    <tbody>${rows}</tbody>
  </table>${cut ? `<p class="ct-note">The first ${ctx.slots.length} of ${ctx.d.palette.length} colours are shown.</p>` : ''}`
}

function faceBlock(ctx, face) {
  const { d } = ctx
  const family = d[face.key]
  const weight = d[`${face.key}Weight`]
  const style = faceStyle(family, weight, d[`${face.key}Spacing`])
  return `<div class="face">
    <p class="face-role">${esc(face.role)}</p>
    <p class="face-aa" style="${style}">Aa</p>
    <p class="face-name">${esc(family)}, weight ${esc(weight)}</p>
    <p class="face-set" style="font-family:${fam(family)};font-weight:${weight}">ABCDEFGHIJKLMNOPQRSTUVWXYZ<br>abcdefghijklmnopqrstuvwxyz<br>0123456789</p>
  </div>`
}

function colourSlide(ctx, n, notes) {
  const hasColour = ctx.slots.length > 0
  const faces = notes.faces.map((f) => faceBlock(ctx, f)).join('')
  const type = topic('Typography', hasColour ? 2 : 6, `<div class="faces${hasColour ? '' : ' faces-wide'}">${faces}</div>`)
  return slide(ctx, n, hasColour ? 'Colour and type' : 'Typography', 'gd-colour', hasColour
    ? [topic('Colour', 4, colourTable(ctx)), type]
    : [type])
}

/* ── logo ────────────────────────────────────────────────────────────────── */

/** The clear space as drawn on the logo slide: a mark height that keeps the zone inside two columns. */
function clearSpaceDrawn(ctx) {
  const aspect = ctx.d.logo?.aspect
  if (!aspect) return null
  return ctx.clearSpaceAt(Math.min(30, 80 / (aspect + 1)))
}

function logoSlide(ctx, n) {
  const { grounds } = ctx
  const facts = ctx.logoFacts.map(([k, v]) => `<dt>${esc(k)}</dt><dd>${esc(v)}</dd>`).join('')
  const tiles = grounds.map((g) => `<div class="tile${g.border ? ' tile-edge' : ''}" style="background:${safeHex(g.bg, 'Canvas')}">
      ${ctx.markImg({ cls: 'gd-mark-tile' })}<span style="color:${safeHex(g.soft, 'CanvasText')}">${esc(g.label)}</span>
    </div>`).join('')
  const parts = [
    ['The mark', `<div class="stage">${ctx.markImg({ cls: 'gd-mark', alt: `${ctx.projectName} logo` })}</div><dl class="kv">${facts}</dl>`],
    ['On grounds', `<div class="tiles">${tiles}</div><p class="cap">The same artwork on every ground. No reversed version has been drawn.</p>`],
  ]
  const cs = clearSpaceDrawn(ctx)
  if (cs) {
    parts.push(['Clear space', `<div class="stage"><div class="zone" style="width:${(cs.boxWidth + 0.5).toFixed(1)}mm;height:${(cs.boxHeight + 0.5).toFixed(1)}mm;padding:${cs.x.toFixed(1)}mm">
      <span class="xs xs-a" style="width:${cs.x.toFixed(1)}mm;height:${cs.x.toFixed(1)}mm">X</span>
      <span class="xs xs-b" style="width:${cs.x.toFixed(1)}mm;height:${cs.x.toFixed(1)}mm">X</span>
      <span class="mbox" style="width:${cs.markWidth.toFixed(1)}mm;height:${cs.markHeight.toFixed(1)}mm">${ctx.markImg({ cls: 'gd-mark-cs', height: `${cs.markHeight.toFixed(1)}mm` })}</span>
    </div></div><p class="cap">X is half the height of the mark.${unitMm(cs.x) ? ` At this size X is ${unitMm(cs.x)}.` : ''}</p>`])
  }
  return slide(ctx, n, 'Logo', 'gd-logo', parts.map(([title, body]) => topic(title, spans(parts.length), body)))
}

/* ── the scale ───────────────────────────────────────────────────────────── */

function scaleSlide(ctx, n) {
  const { d, ladder } = ctx
  // One share of true size for every specimen: 100% when the ladder fits, else the largest that does.
  const { k, label } = specimenScale(ladder, SCALE_FIT)
  const rows = ladder.map((s) => {
    const heading = s.exp >= 1
    return `<tr><th scope="row">${esc(s.name)}</th><td class="num">${s.px}px</td><td class="num">${heading ? 1.15 : d.lineHeight}</td>
      <td class="sp" style="font-size:${(s.px * k).toFixed(1)}px;${faceStyle(heading ? d.heading : d.body, heading ? d.headingWeight : d.bodyWeight)}">${esc(s.name)}</td></tr>`
  }).join('')
  const table = `<table class="sc">
    <colgroup><col style="width:30mm"><col style="width:20mm"><col style="width:20mm"><col></colgroup>
    <thead><tr><th scope="col">Step</th><th scope="col">Size</th><th scope="col">Leading</th><th scope="col">${esc(label)}</th></tr></thead>
    <tbody>${rows}</tbody></table>`
  const facts = [['Base size', `${d.baseSize}px`], ['Ratio', String(d.ratio)], ['Body leading', String(d.lineHeight)], ['Heading leading', '1.15'], ['Headings', d.heading], ['Body', d.body]]
  const kv = `<dl class="kv">${facts.map(([k, v]) => `<dt>${esc(k)}</dt><dd>${esc(v)}</dd>`).join('')}</dl>`
  return slide(ctx, n, 'The scale', 'gd-scale', [topic('Steps', 4, table), topic('Set in', 2, kv)])
}

/* ── usage notes and scope ───────────────────────────────────────────────── */

/** [title, notes[]] pairs as run-in headed paragraphs. */
const noteBlocks = (items) => items.filter(([, notes]) => notes.length)
  .map(([title, notes]) => `<h3>${esc(title)}</h3>${notes.map((t) => `<p>${esc(t)}</p>`).join('')}`).join('')

function notesSlide(ctx, n, notes) {
  const cs = clearSpaceDrawn(ctx)
  const groups = []
  if (ctx.d.logo) {
    groups.push(['Logo', [['The mark', notes.mark], ['On grounds', notes.grounds], ...(cs ? [['Clear space', notes.clearSpace(cs.x)]] : [])]])
  }
  if (ctx.slots.length) groups.push(['Colour', [['The palette', notes.palette]]])
  groups.push(['Typography', [...notes.faces.map((f) => [f.role, f.notes]), ['The scale', notes.scale]]])
  const span = spans(groups.length)
  return slide(ctx, n, 'Usage notes', `gd-notes${ctx.d.logo ? '' : ' gd-notes-roomy'}`, groups.map(([title, items]) => topic(title, span, `<div class="nt${groups.length === 2 ? ' nt-two' : groups.length === 1 ? ' nt-three' : ''}">${noteBlocks(items)}</div>`)))
}

function scopeSlide(ctx, n, notes) {
  const { covers, absent } = ctx.scope
  const list = (items, cls = '') => `<ul class="sl-list${cls}">${items.map((c) => `<li>${esc(c)}</li>`).join('')}</ul>`
  return slide(ctx, n, 'Scope', 'gd-scope', [
    topic('Scope', 2, `<div class="nt">${notes.scope.map((t) => `<p>${esc(t)}</p>`).join('')}</div>`),
    topic('In this document', 2, list(covers)),
    topic('Not in this document', 2, list(absent, ' sl-absent')),
  ])
}

/** The deck after the cover. Slide numbers are the real slide numbers (the cover is 1). */
function slides(ctx) {
  const notes = guidelineNotes(ctx.d, ctx.slots, WORDS)
  const build = {
    colour: (n) => colourSlide(ctx, n, notes),
    logo: (n) => logoSlide(ctx, n),
    scale: (n) => scaleSlide(ctx, n),
    notes: (n) => notesSlide(ctx, n, notes),
    scope: (n) => scopeSlide(ctx, n, notes),
  }
  return plan(ctx).map((p, i) => build[p.id](i + 2))
}

/* ── style ───────────────────────────────────────────────────────────────── */

function css(ctx) {
  const { roles } = ctx
  const { paper, ink, muted, rule } = roles
  const desk = mixHex(muted, paper, 0.16)
  const shade = mixHex(ink, desk, 0.16)
  const wash = mixHex(ink, paper, 0.08)
  return `${chromeFor(CHROME, ctx.fontData)}
  :root{
    --paper:${paper}; --ink:${ink}; --muted:${muted}; --rule:${rule}; --desk:${desk}; --shade:${shade}; --wash:${wash}; --field:${safeHex(ctx.field, ink)};
    --chrome:'Schibsted Grotesk',system-ui,-apple-system,'Segoe UI',sans-serif;
    --m:12mm; --gap:6mm;
  }
  *{box-sizing:border-box}
  html{-webkit-text-size-adjust:100%;-webkit-print-color-adjust:exact;print-color-adjust:exact}
  body{margin:0;background:var(--desk);color:var(--ink);font-family:var(--chrome);font-size:8pt;line-height:1.35;font-variant-numeric:lining-nums}
  h1,h2,h3,p,dl,dd,ul,ol{margin:0}
  .num{font-variant-numeric:lining-nums}
  .mu{color:var(--muted)}

  /* a slide is 297 by 167 mm with a 12 mm margin; its two text sizes are --a and, where a slide has one, a display size */
  .sl{position:relative;width:297mm;height:167mm;padding:var(--m);margin:6mm auto;overflow:hidden;display:flex;flex-direction:column;
    background:var(--paper);box-shadow:0 1px 12px var(--shade);break-after:page;break-inside:avoid;--a:8pt;font-size:var(--a)}
  .gd-cover{--a:9pt}
  /* notes run to 10 pt where the slide has room: with the logo's three groups they only fit at 9 pt */
  .gd-notes{--a:9pt}
  .gd-notes-roomy{--a:10pt}
  .gd-scope{--a:10pt}

  /* the masthead: project name, section and slide number over a rule in the brand's field colour */
  .mh{flex:none;height:18mm;display:flex;align-items:flex-end;gap:8mm;padding-bottom:3mm;margin-bottom:5mm;border-bottom:.8mm solid var(--field,var(--ink));font-size:13pt;line-height:1.1}
  .mh-name{flex:1 1 auto;min-width:0;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;padding-bottom:.15em}
  .mh-sec{flex:none}
  .mh-num{flex:none;min-width:8mm;text-align:right;font-weight:600}

  /* six columns; a hairline sits in the middle of each gutter between filled columns */
  .gd-body{flex:1 1 auto;min-height:0;display:grid;grid-template-columns:repeat(6,minmax(0,1fr));column-gap:var(--gap);align-content:start}
  .tp{position:relative;min-width:0;min-height:0}
  .tp+.tp::before{content:'';position:absolute;left:calc(var(--gap) / -2 - .125mm);top:0;bottom:0;width:.25mm;background:var(--rule)}
  .tp-h{font-size:var(--a);font-weight:600;line-height:1.35;padding-top:2mm;margin-bottom:3mm;border-top:.35mm solid var(--ink)}
  .cap{margin-top:3mm;color:var(--muted);overflow-wrap:anywhere}
  .kv{display:grid;grid-template-columns:auto 1fr;gap:1mm 5mm;margin-top:3mm}
  .kv dt{color:var(--muted)}
  .kv dd{overflow-wrap:anywhere}

  /* cover */
  .mh-cover{height:auto;display:block;padding-bottom:4mm;margin-bottom:6mm;font-size:var(--a)}
  .mh-line{display:flex;justify-content:space-between;gap:8mm;margin-bottom:3mm;font-weight:600}
  .mh-title{line-height:1.02;font-size:72pt;letter-spacing:-.02em;overflow-wrap:anywhere;hyphens:auto;padding-bottom:.08em;
    display:-webkit-box;-webkit-box-orient:vertical;-webkit-line-clamp:2;overflow:hidden}
  .mh-title.is-clamped{line-height:1.12;padding-bottom:0}
  .gd-front{align-content:stretch}
  .gd-front>.tp{display:flex;flex-direction:column}
  .cv-frame{flex:1 1 auto;min-height:0;display:flex;align-items:center;justify-content:center;border:.25mm solid var(--rule);overflow:hidden}
  .gd-mark-cover{display:block;max-width:150mm;max-height:100%;width:auto;height:auto;object-fit:contain}
  .cv-swatch{align-items:flex-end;justify-content:space-between;flex-direction:row;padding:5mm;border:0}
  .cv-swatch b{font-size:12pt;font-weight:600;line-height:1.15;overflow-wrap:anywhere}
  .cv-swatch span{text-align:right}
  .cv-side{min-height:0;overflow:hidden;justify-content:flex-start}
  .cv-stand{font-size:12pt;line-height:1.35;margin-bottom:5mm;overflow-wrap:anywhere}
  .cv-toc-h{margin-top:auto}
  .cv-toc{list-style:none;padding:0}
  .cv-toc li{display:flex;justify-content:space-between;gap:4mm;padding:1mm 0;border-bottom:.25mm solid var(--rule)}
  .cv-full{margin-top:3mm;color:var(--muted);overflow-wrap:anywhere}

  /* the colour table: one row per colour, the primary taller than the rest */
  .ct{width:100%;border-collapse:collapse;table-layout:fixed}
  .ct th,.ct td{text-align:left;font-weight:400;padding:0 2mm 0 0;height:var(--row);vertical-align:middle;border-top:.25mm solid var(--rule);overflow-wrap:anywhere}
  .ct thead th{height:6mm;color:var(--muted);border-top:0;border-bottom:.35mm solid var(--ink)}
  .ct tbody th{font-weight:600}
  .ct-note{margin-top:1.5mm;color:var(--muted)}
  .ct tr.is-primary th,.ct tr.is-primary td{height:calc(var(--row) + 2mm)}
  .ct-chip i{display:block;border:.25mm solid var(--rule)}

  /* faces */
  .faces{display:flex;flex-direction:column;gap:5mm}
  .faces-wide{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));column-gap:var(--gap)}
  .face{min-width:0}
  .face-role{color:var(--muted)}
  .face-aa{font-size:54pt;line-height:1.05;margin:1mm 0}
  .face-name{font-weight:600;overflow-wrap:anywhere}
  .face-set{margin-top:1.5mm;overflow-wrap:anywhere}

  /* logo */
  .stage{height:62mm;display:flex;align-items:center;justify-content:center;border:.25mm solid var(--rule);overflow:hidden}
  .gd-mark{display:block;max-width:76mm;max-height:50mm;width:auto;height:auto;object-fit:contain}
  .tiles{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:2mm}
  .tile{height:29mm;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:2.5mm;padding:0 2mm}
  .tile-edge{border:.25mm solid var(--rule)}
  .gd-mark-tile{display:block;max-width:20mm;max-height:11mm;width:auto;height:auto;object-fit:contain}
  .zone{position:relative;display:flex;background:var(--wash);border:.25mm solid var(--ink)}
  .mbox{display:flex;align-items:center;justify-content:center;flex:none}
  .gd-mark-cs{display:block;width:100%;height:100%;object-fit:contain}
  .xs{position:absolute;display:flex;align-items:center;justify-content:center;border:.25mm solid var(--ink);background:var(--paper)}
  .xs-a{top:0;left:0}
  .xs-b{bottom:0;right:0}

  /* the scale */
  .sc{width:100%;border-collapse:collapse;table-layout:fixed}
  .sc th,.sc td{text-align:left;font-weight:400;padding:1.4mm 2mm 1.4mm 0;border-top:.25mm solid var(--rule);vertical-align:middle}
  .sc thead th{color:var(--muted);border-top:0;border-bottom:.35mm solid var(--ink)}
  .sc tbody th{font-weight:600}
  .sc td.sp{line-height:1.15;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}

  /* running text: notes and scope */
  .nt h3{font-size:var(--a);font-weight:600;margin:0 0 .8mm}
  .nt p{margin:0 0 2.4mm;line-height:1.38;overflow-wrap:anywhere}
  .nt h3:not(:first-child){margin-top:3.5mm}
  .nt-two{column-count:2;column-gap:var(--gap);column-rule:.25mm solid var(--rule)}
  .nt-three{column-count:3;column-gap:var(--gap);column-rule:.25mm solid var(--rule)}
  .nt-two h3,.nt-three h3{break-after:avoid}
  .nt-two p,.nt-three p{break-inside:avoid}
  .sl-list{list-style:none;padding:0}
  .sl-list li{padding:2mm 0;border-top:.25mm solid var(--rule);line-height:1.38;overflow-wrap:anywhere}
  .sl-list li:first-child{border-top:0;padding-top:0}
  .sl-absent li{color:var(--muted)}

  @media print{
    body{background:none}
    .sl{margin:0;box-shadow:none}
    .sl:last-child{break-after:auto}
    @page{size:297mm 167mm;margin:0}
  }
`
}

export default Object.freeze({
  id: 'grid',
  sectionOrder: Object.freeze(['colour', 'logo', 'type']),
  // One colour table; there is no "In use" slide.
  leaves: (section) => (section.id === 'colour' ? ['The palette'] : undefined),
  cover,
  slides,
  css,
})
