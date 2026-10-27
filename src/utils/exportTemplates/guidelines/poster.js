// The brand guidelines, "Poster": a 16:9 deck made to be projected. One word, one
// colour or one mark per slide, at the largest size it fits. Every large word is set
// in the user's own heading face; the template's chrome (Big Shoulders Display) carries
// only the section name and the slide number, at 24 pt. A slide's subject takes at
// least two thirds of the slide. The template composes the whole deck (`slides`);
// the generator hands it the facts and the logo geometry.

import { esc, safeHex, inkName, fitTitle, clampTitle, chromeFor } from '../shared.js'
import { mixHex, softInk } from '../roles.js'

const CHROME = Object.freeze({ family: 'Big Shoulders Display', weights: '100 900', file: 'big-shoulders-display-latin.woff2' })

// 269 mm (the slide less a 14 mm safe area each side) in points.
const MEASURE = 762
const COVER_FIT = Object.freeze({ steps: Object.freeze([120, 92, 64, 48]), maxLines: 2, measure: MEASURE })
const NAME_FIT = Object.freeze({ steps: Object.freeze([96, 72, 54]), maxLines: 2, measure: MEASURE })
const FAMILY_FIT = Object.freeze({ steps: Object.freeze([140, 110, 88, 68, 52]), maxLines: 2, measure: MEASURE })
const WEIGHT = { primary: 3, accent: 2, neutral: 1 }
const BAND_AREA_MM = 269
// A band this wide or wider carries its own "where it lands" line.
const BAND_TEXT_MM = 28

const pad = (n) => String(n).padStart(2, '0')
const fam = (name) => `'${esc(name)}',system-ui,sans-serif`

/** The project name set in the user's heading face, cut at a whole word when it needs more than `maxLines`. */
function titleBlock(text, fit, opts, cls) {
  const shown = clampTitle(text, fit.size, opts)
  return `<h2 class="${cls}${fit.clamp ? ' is-clamped' : ''}" style="font-size:${fit.size}pt">${esc(shown)}</h2>`
}

/** One slide: the section name and the slide number in the chrome, then the subject. */
function slide(n, section, { bg, fg, cls = '', body }) {
  return `<section class="sl sl-poster ${cls}" style="background:${safeHex(bg, 'Canvas')};color:${safeHex(fg, 'CanvasText')}">
  <header class="pn-top"><span class="pn-sec">${esc(section)}</span><span class="pn-num">${pad(n)}</span></header>
  ${body}
</section>`
}

function cover(ctx) {
  const { projectName, field, fieldInk, year, d } = ctx
  const fit = fitTitle(projectName, COVER_FIT)
  const mark = d.logo ? ctx.markImg({ cls: 'pn-cover-mark', alt: `${projectName} logo` }) : ''
  return `<section class="sl sl-poster sl-cover" style="background:${safeHex(field, 'Canvas')};color:${safeHex(fieldInk, 'CanvasText')}">
  <header class="pn-top"><span class="pn-sec">${mark || 'Brand guidelines'}</span><span class="pn-num">${esc(year)}</span></header>
  ${titleBlock(projectName, fit, COVER_FIT, 'cv-title')}
</section>`
}

function colourSlide(ctx, s, n) {
  const soft = softInk(s.ink, s.hex, ctx.contrast)
  const fit = fitTitle(s.name, NAME_FIT)
  const facts = [
    ['Role', s.role],
    ['Hex', s.hex],
    ['Ink', `${inkName(s.ink)}, ${s.ratio}:1, ${s.grade}`],
    ['Where it lands', s.lands],
  ]
  return slide(n, 'Colour', {
    bg: s.hex, fg: s.ink, cls: 'sl-colour',
    body: `<dl class="pn-facts" style="--soft:${safeHex(soft, 'CanvasText')}">${facts.map(([k, v]) => `<div><dt>${esc(k)}</dt><dd>${esc(v)}</dd></div>`).join('')}</dl>
  ${titleBlock(s.name, fit, NAME_FIT, 'pn-name')}`,
  })
}

/** Every colour as a band, widths weighted (primary 3, accents 2, neutrals 1). */
function summarySlide(ctx, n) {
  const slots = ctx.slots
  const total = slots.reduce((sum, s) => sum + WEIGHT[s.kind], 0)
  const wide = (s) => BAND_AREA_MM * WEIGHT[s.kind] / total >= BAND_TEXT_MM
  const bands = slots.map((s) => `<div class="pn-band" style="flex:${WEIGHT[s.kind]} 1 0;background:${safeHex(s.hex, 'GrayText')};color:${safeHex(s.ink, 'CanvasText')}">${wide(s)
    ? `<b>${esc(s.name)}</b><span class="pn-hex">${esc(s.hex)}</span><span>${esc(s.lands)}</span>`
    : `<span class="pn-hex">${esc(s.hex)}</span>`}</div>`).join('')
  const rest = slots.filter((s) => !wide(s))
  const list = rest.length
    ? `<ul class="pn-list">${rest.map((s) => `<li><i style="background:${safeHex(s.hex, 'GrayText')}"></i><b>${esc(s.name)}</b> ${esc(s.hex)}<span>${esc(s.lands)}</span></li>`).join('')}</ul>`
    : ''
  return slide(n, 'Colour', { bg: ctx.roles.paper, fg: ctx.roles.ink, cls: 'sl-bands', body: `<div class="pn-bands">${bands}</div>${list}` })
}

function markSlide(ctx, n) {
  const facts = ctx.logoFacts.map(([k, v]) => `${esc(k)} ${esc(v)}`).join(', ')
  return slide(n, 'The mark', {
    bg: ctx.roles.paper, fg: ctx.roles.ink, cls: 'sl-mark',
    body: `<div class="pn-stage">${ctx.markImg({ cls: 'pn-mark', alt: `${ctx.projectName} logo` })}</div><p class="pn-cap">The artwork as supplied. ${facts}.</p>`,
  })
}

function groundSlide(ctx, g, n) {
  return slide(n, 'On grounds', {
    bg: g.bg, fg: g.ink, cls: 'sl-ground',
    body: `<div class="pn-stage">${ctx.markImg({ cls: 'pn-mark pn-mark-s' })}</div><p class="pn-cap">${esc(g.label)}. No reversed or single-colour version has been drawn.</p>`,
  })
}

function clearSpaceSlide(ctx, n) {
  const logo = ctx.d.logo
  const h = Math.min(50, 250 / ((logo.aspect || 1) + 1))
  const cs = ctx.clearSpaceAt(h)
  if (!cs) return ''
  const accent = (ctx.slots.find((s) => s.kind === 'accent') || ctx.slots[0] || { hex: ctx.field, ink: ctx.fieldInk })
  return slide(n, 'Clear space', {
    bg: ctx.roles.paper, fg: ctx.roles.ink, cls: 'sl-cs',
    body: `<div class="pn-stage"><div class="pn-zone" style="padding:${cs.x.toFixed(1)}mm;background:${safeHex(accent.hex, 'GrayText')};color:${safeHex(accent.ink, 'CanvasText')}">
      <span class="pn-x" style="width:${cs.x.toFixed(1)}mm;height:${cs.x.toFixed(1)}mm">X</span>
      <span class="pn-markbox" style="background:${safeHex(ctx.roles.paper, 'Canvas')}">${ctx.markImg({ cls: 'pn-mark-cs', height: `${cs.markHeight.toFixed(1)}mm` })}</span>
    </div></div><p class="pn-cap">X is half the height of the mark. This is the default rule this document applies, not a decision already taken.</p>`,
  })
}

function typeSlide(ctx, f, n, dark) {
  const fit = fitTitle(f.family, FAMILY_FIT)
  const bg = dark ? ctx.roles.ink : ctx.roles.paper
  const fg = dark ? ctx.roles.paper : ctx.roles.ink
  const soft = softInk(fg, bg, ctx.contrast)
  return slide(n, 'Typography', {
    bg, fg, cls: 'sl-type',
    body: `<div class="pn-fam" style="font-family:${fam(f.family)};font-weight:${f.weight}">${titleBlock(f.family, fit, FAMILY_FIT, 'pn-famname')}
      <p class="pn-set">ABCDEFGHIJKLMNOPQRSTUVWXYZ<br>abcdefghijklmnopqrstuvwxyz 0123456789</p></div>
    <p class="pn-cap" style="color:${safeHex(soft, 'CanvasText')}">${esc(f.role)}, weight ${esc(f.weight)}</p>`,
  })
}

function scaleSlide(ctx, n) {
  const { d, ladder } = ctx
  const rows = ladder.map((s) => {
    const heading = s.exp >= 1
    return `<tr><th scope="row">${esc(s.name)}</th><td>${s.px}px</td><td>${heading ? 1.15 : d.lineHeight}</td>
      <td class="sp" style="font-size:${Math.min(s.px, 34)}px;font-family:${fam(heading ? d.heading : d.body)};font-weight:${heading ? d.headingWeight : d.bodyWeight}">${esc(s.name)}</td></tr>`
  }).join('')
  return slide(n, 'The scale', {
    bg: ctx.roles.paper, fg: ctx.roles.ink, cls: 'sl-scale',
    body: `<table class="pn-scale"><thead><tr><th>Step</th><th>Size</th><th>Leading</th><th>Specimen</th></tr></thead><tbody>${rows}</tbody></table>`,
  })
}

function closingSlide(ctx, n) {
  const { covers, absent } = ctx.scope
  return slide(n, 'Scope', {
    bg: ctx.roles.paper, fg: ctx.roles.ink, cls: 'sl-scope',
    body: `<div class="pn-cols"><div><h3>In this document</h3><ul>${covers.map((c) => `<li>${esc(c)}</li>`).join('')}</ul></div>
      <div><h3>Not in this document</h3><ul>${absent.map((c) => `<li>${esc(c)}</li>`).join('')}</ul></div></div>`,
  })
}

/** The whole deck after the cover. Slide numbers are the real slide numbers (the cover is 1). */
function slides(ctx) {
  let n = 1
  const next = () => { n += 1; return n }
  const out = []
  const plateOrder = [...ctx.slots.filter((s) => s.kind === 'primary'), ...ctx.slots.filter((s) => s.kind === 'accent'), ...ctx.slots.filter((s) => s.kind === 'neutral')]
  plateOrder.forEach((s) => out.push(colourSlide(ctx, s, next())))
  if (ctx.slots.length) out.push(summarySlide(ctx, next()))
  if (ctx.d.logo) {
    out.push(markSlide(ctx, next()))
    ctx.grounds.forEach((g) => out.push(groundSlide(ctx, g, next())))
    const cs = clearSpaceSlide(ctx, n + 1)
    if (cs) { next(); out.push(cs) }
  }
  const d = ctx.d
  const one = d.heading === d.body
  out.push(typeSlide(ctx, { family: d.heading, weight: d.headingWeight, role: one ? 'The typeface' : 'Headline face' }, next(), false))
  if (!one) out.push(typeSlide(ctx, { family: d.body, weight: d.bodyWeight, role: 'Body face' }, next(), true))
  out.push(scaleSlide(ctx, next()))
  out.push(closingSlide(ctx, next()))
  return out
}

function css(ctx) {
  const { d, roles } = ctx
  const { paper, ink, muted, rule } = roles
  const desk = mixHex(muted, paper, 0.16)
  const shade = mixHex(ink, desk, 0.16)
  return `${chromeFor(CHROME, ctx.fontData)}
  :root{
    --paper:${paper}; --ink:${ink}; --muted:${muted}; --rule:${rule}; --desk:${desk}; --shade:${shade};
    --head:${fam(d.heading)};
    --body:${fam(d.body)};
    --chrome:'Big Shoulders Display','Arial Narrow',system-ui,sans-serif;
    --m:14mm;
  }
  *{box-sizing:border-box}
  html{-webkit-text-size-adjust:100%;-webkit-print-color-adjust:exact;print-color-adjust:exact}
  body{margin:0;background:var(--desk);color:var(--ink);font-family:var(--body);font-size:12pt;line-height:1.4;font-variant-numeric:lining-nums}
  .sl{position:relative;width:297mm;height:167mm;padding:var(--m);margin:6mm auto;overflow:hidden;display:flex;flex-direction:column;
    background:var(--paper);box-shadow:0 1px 12px var(--shade);break-after:page;break-inside:avoid}
  h2,h3,p,dl,ul{margin:0}
  h2{font-family:var(--head);font-weight:${d.headingWeight};line-height:1;overflow-wrap:anywhere;hyphens:auto}
  .pn-top{display:flex;justify-content:space-between;align-items:flex-start;gap:8mm;flex:0 0 auto;font-family:var(--chrome);font-size:24pt;line-height:1.1}
  .pn-sec{min-width:0}
  .pn-num{flex:none;font-variant-numeric:tabular-nums lining-nums}
  .pn-cover-mark{display:block;height:40mm;width:auto;max-width:120mm;object-fit:contain;object-position:left top}
  .sl-cover .pn-sec{display:block}
  .sl-cover .cv-title{margin:auto 0 28mm;display:-webkit-box;-webkit-box-orient:vertical;-webkit-line-clamp:2;overflow:hidden;padding-bottom:.14em;letter-spacing:-.025em}
  .sl-cover .cv-title.is-clamped{padding-bottom:0;line-height:1.12}

  /* colour slides: the slide is the colour; the name sits low at the largest size it fits */
  .pn-facts{display:grid;grid-template-columns:repeat(4,1fr);gap:6mm;margin-top:auto;font-size:12pt}
  .pn-facts dt{font-size:8pt;color:var(--soft)}
  .pn-facts dd{margin:0;overflow-wrap:anywhere}
  .pn-name{margin-top:8mm;display:-webkit-box;-webkit-box-orient:vertical;-webkit-line-clamp:2;overflow:hidden;padding-bottom:.14em;letter-spacing:-.025em}
  .pn-name.is-clamped{padding-bottom:0;line-height:1.12}

  /* the summary: every colour as a band */
  .sl-bands{padding-bottom:var(--m)}
  .pn-bands{display:flex;height:88mm;margin-top:6mm;border:.25mm solid var(--rule)}
  .pn-band{min-width:0;padding:4mm 1.5mm;display:flex;flex-direction:column;justify-content:flex-end;gap:2mm;font-size:8pt;line-height:1.3;overflow:hidden}
  .pn-band b{font-family:var(--head);font-weight:${d.headingWeight};font-size:10pt;line-height:1.1;overflow-wrap:break-word}
  .pn-band span{overflow-wrap:break-word}
  .pn-band .pn-hex{white-space:nowrap;font-size:7pt;letter-spacing:-.01em}
  .pn-list{list-style:none;padding:0;margin-top:5mm;columns:3;column-gap:6mm;font-size:8pt;line-height:1.35}
  .pn-list li{break-inside:avoid;padding:0 0 1.6mm;overflow-wrap:anywhere}
  .pn-list i{display:inline-block;width:3mm;height:3mm;margin-right:1.6mm;vertical-align:-.4mm;border:.25mm solid var(--rule)}
  .pn-list span{display:block;color:var(--muted)}

  /* logo slides */
  .pn-stage{flex:1 1 auto;min-height:0;display:flex;align-items:center;justify-content:center}
  .pn-mark{display:block;max-height:83mm;max-width:240mm;width:auto;height:auto;object-fit:contain}
  .pn-mark-s{max-height:60mm}
  .pn-cap{flex:none;margin-top:4mm;font-size:12pt;max-width:220mm;overflow-wrap:anywhere}
  .pn-zone{position:relative;display:flex}
  .pn-markbox{display:flex;align-items:center;justify-content:center}
  .pn-mark-cs{display:block;width:auto;object-fit:contain}
  .pn-x{position:absolute;top:0;left:0;display:flex;align-items:center;justify-content:center;font-family:var(--chrome);font-size:24pt}

  /* typography */
  .pn-fam{flex:1 1 auto;min-height:0;display:flex;flex-direction:column;justify-content:center;gap:8mm}
  .pn-famname{font-family:inherit;font-weight:inherit;letter-spacing:-.025em;padding-bottom:.14em}
  .pn-set{font-size:20pt;line-height:1.3;overflow-wrap:anywhere}
  .pn-scale{width:100%;border-collapse:collapse;table-layout:fixed;font-size:10pt;margin-top:6mm}
  .pn-scale th,.pn-scale td{text-align:left;padding:1.8mm 2mm;border-bottom:.25mm solid var(--rule);font-weight:400;vertical-align:middle}
  .pn-scale thead th{color:var(--muted);border-bottom:.35mm solid var(--ink);font-size:8pt}
  .pn-scale th[scope=row]{font-weight:600;width:34mm}
  .pn-scale td{font-variant-numeric:tabular-nums lining-nums;width:24mm}
  .pn-scale td.sp{width:auto;white-space:nowrap;overflow:hidden;line-height:1.15;padding-bottom:2.4mm}

  /* scope */
  .pn-cols{display:grid;grid-template-columns:1fr 1.3fr;gap:14mm;margin-top:6mm;font-size:11pt;line-height:1.4}
  .pn-cols h3{font-family:var(--head);font-weight:${d.headingWeight};font-size:18pt;line-height:1.1;padding-bottom:2mm;border-bottom:.35mm solid var(--ink)}
  .pn-cols ul{list-style:none;padding:0}
  .pn-cols li{padding:2mm 0;border-bottom:.25mm solid var(--rule);overflow-wrap:anywhere}

  @media print{
    body{background:none}
    .sl{margin:0;box-shadow:none}
    .sl:last-child{break-after:auto}
    @page{size:297mm 167mm;margin:0}
  }`
}

export default Object.freeze({
  id: 'poster',
  sectionOrder: Object.freeze(['colour', 'logo', 'type']),
  cover,
  slides,
  css,
})
