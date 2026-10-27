// The design system book, "Atlas": a colour atlas. The palette is the cover, every
// colour is a full-bleed plate with its values, its tints and where it paints, and a
// pairings page tests each colour against the others. Values are set in Martian Mono;
// headings are the user's own face. There are no section openings: the plates are
// the sections.

import { esc, safeHex, inkName, fitTitle, chromeFor } from '../shared.js'
import { mixHex, hexToOklch } from '../roles.js'

const CHROME = Object.freeze({ family: 'Martian Mono', weights: '100 800', file: 'martian-mono-latin.woff2' })

// A role label arrives in capitals ("ALTERNATIVE 1"); set it as a sentence ("Alternative 1").
const sentenceCase = (text) => { const t = String(text).toLowerCase(); return t.charAt(0).toUpperCase() + t.slice(1) }

// Band weights on the cover: the primary 3, accents 2, neutrals 1.
const WEIGHT = { primary: 3, accent: 2, neutral: 1 }
const MM_TO_PT = 72 / 25.4
const BAND_STEPS = Object.freeze([44, 34, 26, 22])
// How many other colours a plate names as reading on it.
const READS_MAX = 6
const PAIRS_WIDTH_MM = 172
// A tint closer than this (distance in OKLab) to the paper is left out: it would print as blank paper.
const TINT_MIN_DISTANCE = 0.02

/** Distance between two hex colours in OKLab. */
function distance(a, b) {
  const x = hexToOklch(a)
  const y = hexToOklch(b)
  const ax = x.c * Math.cos(x.h * Math.PI / 180)
  const ay = x.c * Math.sin(x.h * Math.PI / 180)
  const bx = y.c * Math.cos(y.h * Math.PI / 180)
  const by = y.c * Math.sin(y.h * Math.PI / 180)
  return Math.hypot(x.l - y.l, ax - bx, ay - by)
}

/** The plates' order: the primary, then the accents, then the neutrals. */
const plateOrder = (slots) => [
  ...slots.filter((s) => s.kind === 'primary'),
  ...slots.filter((s) => s.kind === 'accent'),
  ...slots.filter((s) => s.kind === 'neutral'),
]

function cover(ctx) {
  const { slots, fieldInk, projectName, roles, d, iso } = ctx
  const order = plateOrder(slots)
  const bands = order.map((s) => `<i style="background:${safeHex(s.hex, 'GrayText')};flex:${WEIGHT[s.kind]} 1 0"></i>`).join('')
  const total = order.reduce((n, s) => n + WEIGHT[s.kind], 0)
  const primaryMm = total ? 210 * WEIGHT.primary / total : 210
  // The title sits on the primary band when it fits there whole, at 44, 34 or 26 pt;
  // otherwise it sits in a paper box over the bands, the one case that needs one.
  // The band is narrow, so it tries a fourth, smaller step and a wide average advance (a
  // bold grotesque sets nearer 0.58 em than 0.52) before giving up on it.
  const onBand = fitTitle(projectName, { ...atlas.titleFit, steps: BAND_STEPS, advance: 0.58, measure: (primaryMm - 20) * MM_TO_PT })
  const useBand = slots.length > 0 && !onBand.clamp && !onBand.broken
  const fit = useBand ? onBand : ctx.fit
  const facts = `<p class="at-facts">${d.palette.length} ${d.palette.length === 1 ? 'colour' : 'colours'}<br>Issued ${esc(iso)}</p>`
  const text = `<h1 class="at-title${fit.clamp ? ' is-clamped' : ''}" style="font-size:${fit.size}pt">${esc(projectName)}</h1>${facts}`
  const boxStyle = `background:${roles.paper};color:${roles.ink}`
  return `<section class="pg pg-cover">
  <div class="at-bands">${bands}</div>
  ${useBand
    ? `<div class="at-on" style="width:${primaryMm.toFixed(1)}mm;color:${safeHex(fieldInk, 'CanvasText')}">${text}</div>`
    : `<div class="at-box" style="${boxStyle}">${text}</div>`}
</section>`
}

/** A page with a running foot (the section, and the folio). A plate passes its own ground and ink. */
function frame(ctx, inner, { section = '', folio = null, cls = '', bg = '', fg = '' } = {}) {
  const style = bg ? ` style="background:${safeHex(bg, 'Canvas')};color:${safeHex(fg, 'CanvasText')}"` : ''
  return `<section class="pg ${cls}"${style}>
  ${inner}
  ${folio === null ? '' : `<footer class="foot"><span>${esc(section)}</span><span class="folio">${folio}</span></footer>`}
</section>`
}

/** Other palette colours that pass AA as text on this plate, at most READS_MAX of them. */
function reads(ctx, s, slots) {
  return slots.filter((o) => o.i !== s.i && ctx.contrast(o.hex, s.hex) >= 4.5).slice(0, READS_MAX)
}

function plate(ctx, s, slots) {
  const ok = reads(ctx, s, slots)
  const tints = [{ pct: 100, hex: s.hex }, ...s.tints.filter((t) => distance(t.hex, ctx.roles.paper) >= TINT_MIN_DISTANCE)]
  const ink = inkName(s.ink)
  return {
    leaf: `${s.name} · ${s.hex}`,
    bg: s.hex,
    fg: s.ink,
    cls: 'pl',
    inner: `<div class="pl-in">
    <header><p class="pl-role">${esc(sentenceCase(s.role))}</p><h2 class="pl-name">${esc(s.name)}</h2></header>
    <div class="pl-data">
      <p class="pl-lands${s.placed ? '' : ' is-unplaced'}"><span>Where it lands</span>${esc(s.lands)}</p>
      <dl class="pl-vals">
        <div><dt>Hex</dt><dd>${esc(s.hex)}</dd></div>
        <div><dt>RGB</dt><dd>${esc(s.rgb)}</dd></div>
        <div><dt>HSL</dt><dd>${esc(s.hsl)}</dd></div>
        <div><dt>OKLCH</dt><dd>${esc(s.oklch)}</dd></div>
      </dl>
      <dl class="pl-vals">
        <div><dt>Ink</dt><dd>${ink}, ${s.ratio}:1, ${esc(s.grade)}</dd></div>
        <div><dt>Passes as text here</dt><dd>${ok.length
    ? ok.map((o) => `<span class="rd"><i style="background:${safeHex(o.hex, 'GrayText')}"></i>${esc(o.hex)}</span>`).join('')
    : `No other colour; use ${ink.toLowerCase()}`}</dd></div>
      </dl>
      <div class="pl-tints">${tints.map((t) => `<span><i style="background:${safeHex(t.hex, 'GrayText')}"></i>${t.pct}%</span>`).join('')}</div>
    </div>
  </div>`,
  }
}

function swatches(ctx, slots) {
  return plateOrder(slots).map((s) => plate(ctx, s, slots))
}

/** The pairings: every colour as a ground (rows) against every colour as text (columns).
 *  A pair that passes AA is drawn as a real tile; one that does not shows its ratio and nothing else. */
function matrix(ctx, slots) {
  const n = slots.length
  const size = Math.min(20, Math.floor((PAIRS_WIDTH_MM / n) * 10) / 10)
  let pass = 0
  let all = 0
  const chip = (hex) => `<i class="pr-chip" style="background:${safeHex(hex, 'GrayText')}"></i>`
  const head = slots.map((s) => `<div class="pr-h">${chip(s.hex)}</div>`).join('')
  const rows = slots.map((g) => `<div class="pr-h">${chip(g.hex)}</div>${slots.map((t) => {
    if (g.i === t.i) return '<div class="pt pt-self"></div>'
    const r = ctx.contrast(t.hex, g.hex)
    all += 1
    if (r >= 4.5) {
      pass += 1
      return `<div class="pt pt-ok" style="background:${safeHex(g.hex, 'GrayText')};color:${safeHex(t.hex, 'CanvasText')}"><b>Aa</b><span>${r}</span></div>`
    }
    return `<div class="pt pt-no"><span>${r}</span></div>`
  }).join('')}`).join('')
  const cut = ctx.d.palette.length > n
  return [{
    leaf: 'Pairings',
    inner: `<div class="pg-body">
    <header class="pg-head"><h3>Pairings</h3>
      <p class="lede">Each row is a ground and each column is text on it. A tile is drawn only where the pair passes AA for text, 4.5:1. Every other pair shows its ratio alone, so it is never read as usable.</p></header>
    <div class="pairs" style="--n:${n};--t:${size}mm"><div></div>${head}${rows}</div>
    <p class="pr-sum">${pass} of ${all} pairs pass AA.${cut ? ` The first ${n} of ${ctx.d.palette.length} colours are shown; all ${ctx.d.palette.length} are listed in Tokens.` : ''}</p>
  </div>`,
  }]
}

function typography(ctx) {
  const { d, ladder } = ctx
  const fam = (role, name, weight, spacing) => `<div class="fm">
      <p class="lbl">${esc(role)} &middot; ${weight}${spacing ? ` &middot; ${spacing}em` : ''}</p>
      <p class="fm-name" style="font-family:'${esc(name)}',system-ui,sans-serif;font-weight:${weight};letter-spacing:${spacing || 0}em">${esc(name)}</p>
      <p class="fm-set" style="font-family:'${esc(name)}',system-ui,sans-serif;font-weight:${weight}">ABCDEFGHIJKLMNOPQRSTUVWXYZ<br>abcdefghijklmnopqrstuvwxyz<br>0123456789 &amp; ., : ; ! ? ( ) @ # % $</p>
    </div>`
  const rows = ladder.map((s) => {
    const heading = s.exp >= 1
    return `<tr><th scope="row">${esc(s.name)}</th><td>${s.px}px</td><td>${(s.px / 16).toFixed(3).replace(/\.?0+$/, '')}rem</td><td>${heading ? 1.15 : d.lineHeight}</td>
      <td class="sp" style="font-size:${Math.min(s.px, 34)}px;font-family:'${esc(heading ? d.heading : d.body)}',system-ui,sans-serif;font-weight:${heading ? d.headingWeight : d.bodyWeight}">${esc(s.name)}</td></tr>`
  }).join('')
  return [{
    leaf: null,
    inner: `<div class="pg-body">
    <header class="pg-head"><h3>Typography</h3>
      <p class="lede">${esc(d.heading)} for headings, ${esc(d.body)} for reading, on a ${d.ratio} scale from ${d.baseSize}px. Steps above 34px are shown reduced; the size beside each step is the true value.</p></header>
    <div class="fms">${fam('Headings', d.heading, d.headingWeight, d.headingSpacing)}${fam('Body', d.body, d.bodyWeight, d.bodySpacing)}</div>
    <table class="tb-scale"><thead><tr><th>Step</th><th>Size</th><th>rem</th><th>Leading</th><th>Specimen</th></tr></thead><tbody>${rows}</tbody></table>
  </div>`,
  }]
}

function css(ctx) {
  const { d, roles } = ctx
  const paper = roles.paper
  const ink = roles.ink
  const muted = roles.muted
  const rule = roles.rule
  const desk = mixHex(muted, paper, 0.16)
  const shade = mixHex(ink, desk, 0.16)
  return `${chromeFor(CHROME, ctx.fontData)}
  :root{
    --paper:${paper}; --ink:${ink}; --muted:${muted}; --rule:${rule}; --desk:${desk}; --shade:${shade};
    --head:'${esc(d.heading)}',system-ui,-apple-system,'Segoe UI',sans-serif;
    --body:'${esc(d.body)}',system-ui,-apple-system,'Segoe UI',sans-serif;
    --chrome:'Martian Mono',ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;
    --m:14mm;
  }
  *{box-sizing:border-box}
  html{-webkit-text-size-adjust:100%;-webkit-print-color-adjust:exact;print-color-adjust:exact}
  body{margin:0;background:var(--desk);color:var(--ink);font-family:var(--body);font-size:9.5pt;line-height:1.5}
  .bk{display:block}
  .pg{position:relative;width:210mm;height:297mm;padding:var(--m);background:var(--paper);margin:8mm auto;overflow:hidden;
    box-shadow:0 1px 12px var(--shade);break-after:page;break-inside:avoid}
  .pg-body{height:100%;display:flex;flex-direction:column}
  h1,h2,h3{font-family:var(--head);font-weight:${d.headingWeight};margin:0;line-height:1.1}
  p{margin:0 0 1em}
  .lbl{font-family:var(--chrome);font-size:7pt;color:var(--muted);margin:0 0 2.5mm}
  .lede{font-family:var(--body);font-size:9.5pt;color:var(--muted);max-width:120mm;margin:2.5mm 0 0}
  .pg-head{margin-bottom:8mm;flex:0 0 auto}
  .pg-head h3,.ct-h{font-size:21pt;letter-spacing:-.01em}
  .pg-head h3.cont span{font-weight:400;color:var(--muted)}
  code,.num,.tk-n,.tk-v,.code{font-family:var(--chrome);font-variant-numeric:tabular-nums}

  .foot{position:absolute;left:var(--m);right:var(--m);bottom:8mm;display:flex;justify-content:space-between;gap:8mm;
    font-family:var(--chrome);font-size:7pt;line-height:1.2;color:var(--muted)}
  .foot span:first-child{min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
  .pl .foot{color:inherit}
  .folio{font-variant-numeric:tabular-nums;flex:none}

  /* ── cover: the palette is the cover ───────────────────────────────── */
  .pg-cover{padding:0}
  .at-bands{position:absolute;inset:0;display:flex}
  .at-bands i{min-width:0}
  .at-on,.at-box{position:absolute;top:0;bottom:0;left:0;padding:var(--m) 10mm;display:flex;flex-direction:column;justify-content:space-between;overflow:hidden}
  .at-box{top:var(--m);bottom:auto;left:var(--m);width:120mm;padding:10mm;gap:14mm}
  .at-title{letter-spacing:-.02em;overflow-wrap:anywhere;hyphens:auto;display:-webkit-box;-webkit-box-orient:vertical;
    -webkit-line-clamp:3;overflow:hidden;padding-bottom:.12em}
  .at-facts{font-family:var(--chrome);font-size:7pt;line-height:1.5;margin:0}

  /* ── plates ────────────────────────────────────────────────────────── */
  .pl-in{position:absolute;inset:var(--m) var(--m) 16mm;display:flex;flex-direction:column;justify-content:space-between}
  .pl-role{font-family:var(--chrome);font-size:8pt;margin:0 0 3mm}
  .pl-name{font-size:44pt;letter-spacing:-.02em;max-width:170mm;overflow-wrap:anywhere;display:-webkit-box;
    -webkit-box-orient:vertical;-webkit-line-clamp:2;overflow:hidden;padding-bottom:.1em}
  .pl-data{display:grid;grid-template-columns:repeat(6,1fr);gap:7mm 4mm;height:92mm;align-content:end}
  .pl-lands{grid-column:1/-1;margin:0;font-family:var(--head);font-weight:${d.headingWeight};font-size:17pt;line-height:1.2;max-width:150mm}
  .pl-lands span{display:block;font-family:var(--chrome);font-weight:400;font-size:7pt;margin-bottom:1.5mm}
  /* A colour with no place in the interface says so at the values size, not as the plate's lead line. */
  .pl-lands.is-unplaced{font-family:var(--chrome);font-weight:400;font-size:7.5pt;line-height:1.5}
  .pl-vals{grid-column:span 3;margin:0;font-family:var(--chrome);font-size:7.5pt}
  .pl-vals div{display:flex;justify-content:space-between;gap:3mm;padding:1.1mm 0;border-top:.25mm solid color-mix(in srgb,currentColor 45%,transparent)}
  .pl-vals dt{flex:none}
  .pl-vals dd{margin:0;text-align:right;font-variant-numeric:tabular-nums;overflow-wrap:anywhere}
  .rd{display:inline-flex;align-items:center;gap:1mm;margin:0 0 0 2.5mm}
  .rd i,.pl-tints i,.pr-chip{display:block;border:.25mm solid color-mix(in srgb,currentColor 45%,transparent)}
  .rd i{width:2.6mm;height:2.6mm}
  .pl-tints{grid-column:1/-1;display:grid;grid-template-columns:repeat(5,1fr);gap:2mm;font-family:var(--chrome);font-size:7pt}
  .pl-tints i{height:14mm;margin-bottom:1.2mm}

  /* ── pairings ──────────────────────────────────────────────────────── */
  .pairs{display:grid;grid-template-columns:7mm repeat(var(--n),var(--t));grid-auto-rows:var(--t);gap:0}
  .pairs>.pr-h{display:flex;align-items:center;justify-content:center;height:var(--t)}
  .pr-chip{width:4.5mm;height:4.5mm;border-color:var(--rule)}
  .pt{display:flex;flex-direction:column;align-items:center;justify-content:center;border:.25mm solid var(--paper);
    font-family:var(--chrome);font-size:7pt;line-height:1.15;font-variant-numeric:tabular-nums;overflow:hidden}
  .pt b{font-family:var(--body);font-size:11pt;font-weight:${d.bodyWeight};line-height:1}
  .pt-no{color:var(--muted)}
  .pt-self{background:var(--rule)}
  .pr-sum{font-family:var(--chrome);font-size:7.5pt;color:var(--muted);margin:6mm 0 0;max-width:150mm}

  /* ── typography ────────────────────────────────────────────────────── */
  .fms{display:grid;grid-template-columns:1fr 1fr;gap:8mm;margin-bottom:8mm}
  .fm{border-top:.35mm solid var(--ink);padding-top:3mm;min-width:0}
  .fm-name{font-size:26pt;line-height:1.1;margin:0 0 4mm;overflow-wrap:anywhere}
  .fm-set{font-size:10pt;line-height:1.55;margin:0;overflow-wrap:anywhere}
  .tb-scale{width:100%;border-collapse:collapse;table-layout:fixed;font-family:var(--chrome);font-size:7.5pt}
  .tb-scale th,.tb-scale td{text-align:left;padding:2.6mm 1.5mm;border-bottom:.25mm solid var(--rule);font-weight:400;vertical-align:middle}
  .tb-scale thead th{color:var(--muted);border-bottom:.35mm solid var(--ink);font-size:7pt}
  .tb-scale th:nth-child(1){width:26mm}
  .tb-scale th:nth-child(2),.tb-scale th:nth-child(3),.tb-scale th:nth-child(4){width:19mm}
  .tb-scale td.sp{white-space:nowrap;overflow:hidden;line-height:1.1}

  /* ── gradient (the shared page) ────────────────────────────────────── */
  .gr-spec{height:62mm;width:100%;margin-bottom:7mm;outline:.25mm solid var(--rule);outline-offset:-.25mm}
  .tb{width:100%;border-collapse:collapse;font-family:var(--chrome);font-size:7.5pt}
  .tb th,.tb td{text-align:left;padding:2.6mm 1.5mm;border-bottom:.25mm solid var(--rule);font-weight:400;vertical-align:middle}
  .tb thead th{color:var(--muted);border-bottom:.35mm solid var(--ink);font-size:7pt}
  .dot{display:inline-block;width:2.6mm;height:2.6mm;margin-right:1.6mm;vertical-align:-.3mm;border:.25mm solid var(--rule)}

  /* ── contents, tokens, notes ───────────────────────────────────────── */
  .ct-grid{display:grid;grid-template-columns:1fr 56mm;gap:14mm;height:100%;align-content:start}
  .ct-h{margin:0 0 7mm}
  .ct-list{list-style:none;margin:0;padding:0}
  .ct-list li{display:flex;align-items:baseline;gap:4mm;padding:3.6mm 0;border-top:.25mm solid var(--rule)}
  .ct-list li:first-child{border-top:.35mm solid var(--ink)}
  .ct-list li.is-sub{padding:1.6mm 0;border-top:none}
  .ct-num{width:0;flex:0 0 0}
  .ct-title{font-family:var(--head);font-size:15pt;font-weight:${d.headingWeight}}
  .is-sub .ct-title{font-family:var(--chrome);font-size:7.5pt;font-weight:400;color:var(--muted);padding-left:3mm}
  .ct-dot{flex:1;border-bottom:.25mm dotted var(--muted);transform:translateY(-1mm)}
  .ct-folio{font-family:var(--chrome);font-size:8pt;font-variant-numeric:tabular-nums}
  .ct-aside{font-size:8.5pt;color:var(--muted)}
  .ct-aside b{color:var(--ink)}
  .ct-facts{margin:6mm 0 0;border-top:.35mm solid var(--ink)}
  .ct-facts div{display:flex;justify-content:space-between;padding:1.6mm 0;border-bottom:.25mm solid var(--rule)}
  .ct-facts dt{font-family:var(--chrome);font-size:7pt}
  .ct-facts dd{margin:0;font-family:var(--chrome);font-size:8pt;color:var(--ink)}
  .tk{width:100%;border-collapse:collapse;font-size:7.5pt}
  .tk td{padding:1.4mm 1.5mm;border-bottom:.25mm solid var(--rule);vertical-align:top;line-height:1.3}
  .tk tr:first-child td{border-top:.35mm solid var(--ink)}
  .tk-n{width:68mm;white-space:nowrap}
  .tk-v{color:var(--muted);word-break:break-all}
  .code{border-left:.5mm solid var(--ink);padding:3mm 4mm;font-size:7.5pt;margin:6mm 0 0;white-space:pre-wrap;word-break:break-all}
  .cl-grid{display:grid;grid-template-columns:1fr 1fr;gap:12mm;font-size:8.5pt;color:var(--muted)}
  .cl-grid .lbl{margin-top:5mm}
  .cl-grid div>.lbl:first-child{margin-top:0}
  .cl-foot{margin-top:auto;display:flex;justify-content:space-between;gap:6mm;padding-bottom:6mm;font-family:var(--chrome);font-size:7pt;color:var(--muted)}
  .cl-foot span{flex:none}
  .cl-foot .cl-name{flex:0 1 auto;min-width:0;overflow-wrap:anywhere}

  @media print{
    body{background:none}
    .pg{margin:0;box-shadow:none}
    .pg:last-child{break-after:auto}
    @page{size:A4;margin:0}
  }`
}

const atlas = Object.freeze({
  id: 'atlas',
  numbered: false,
  // No section openings: the plates are the sections.
  openings: false,
  // Cover title: sizes in pt, largest first. The measure is the 120 mm paper box less
  // its padding (100 mm); on the primary band the cover works out the band's own.
  titleFit: Object.freeze({ steps: Object.freeze([44, 34, 26]), maxLines: 3, measure: 283 }),
  sectionOrder: Object.freeze(['colour', 'typography', 'tokens']),
  cover,
  frame,
  swatches,
  matrix,
  typography,
  css,
})

export default atlas
