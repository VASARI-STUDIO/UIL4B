// The brand guidelines, "Presentation": a 16:9 deck, one point per slide.
// A template returns strings; the generator owns every fact on the page. Every colour
// here is a role the generator hands over (paper, ink, muted, rule) or a mix of them;
// the template's chrome (Instrument Sans) carries the folio and the small labels, and
// the user's own faces carry everything that is read.

import { esc, safeHex, fitTitle, clampTitle, chromeFor } from '../shared.js'
import { mixHex, softInk } from '../roles.js'

const CHROME = Object.freeze({ family: 'Instrument Sans', weights: '400 700', file: 'instrument-sans-latin.woff2' })

// 267 mm (the slide less a 15 mm margin each side) in points.
const COVER_FIT = Object.freeze({ steps: Object.freeze([60, 46, 34]), maxLines: 2, measure: 757 })

const LABEL = 'Brand guidelines'

function cover(ctx) {
  const { d, field, fieldInk: ink, year, projectName } = ctx
  const fit = fitTitle(projectName, COVER_FIT)
  const shown = clampTitle(projectName, fit.size, COVER_FIT)
  const soft = softInk(ink, field, ctx.contrast)
  const rest = d.palette.filter(c => c !== field)
  const band = rest.length ? `<div class="cv-band">${rest.map(c => `<i style="background:${safeHex(c, 'GrayText')}"></i>`).join('')}</div>` : ''
  const top = d.logo ? ctx.markImg({ cls: 'mk-cover', alt: `${projectName} logo` }) : LABEL
  // A name cut for the cover is printed whole in the foot.
  const foot = fit.clamp ? esc(projectName) : d.logo ? LABEL : ''
  return `<section class="sl sl-cover" style="background:${safeHex(field, 'Canvas')};color:${safeHex(ink, 'CanvasText')};--soft:${safeHex(soft, 'CanvasText')}">
  <div class="cv-top">
    <span class="cv-mark">${top}</span>
    <span class="cv-year">${esc(year)}</span>
  </div>
  <h1 class="cv-title${fit.clamp ? ' is-clamped' : ''}" style="font-size:${fit.size}pt">${esc(shown)}</h1>
  <div class="cv-foot">
    <span class="cv-name">${foot}</span>
    <span>${ctx.sections.map(s => esc(s.title)).join(' · ')}</span>
  </div>
  ${band}
</section>`
}

/**
 * One grid, held on every spread. 297 × 167mm is 16:9 to a tenth of a
 * millimetre, and it is declared as an exact @page size so the printed PDF is a
 * deck rather than a landscape A4 with bands down the sides.
 */
function css(ctx) {
  const { d, roles } = ctx
  const { paper, ink, muted, rule } = roles
  const desk = mixHex(muted, paper, 0.16)
  const shade = mixHex(ink, desk, 0.16)
  const hair = mixHex(ink, paper, 0.08)
  const wash = mixHex(ink, paper, 0.05)
  return `${chromeFor(CHROME, ctx.fontData)}
  :root{
    --ink:${ink}; --mut:${muted}; --line:${rule}; --hair:${hair}; --wash:${wash}; --paper:${paper}; --desk:${desk}; --shade:${shade};
    --m:15mm;
    --head:'${esc(d.heading)}',system-ui,-apple-system,'Segoe UI',sans-serif;
    --body:'${esc(d.body)}',system-ui,-apple-system,'Segoe UI',sans-serif;
    --chrome:'Instrument Sans',system-ui,-apple-system,'Segoe UI',sans-serif;
  }
  *{box-sizing:border-box}
  html{-webkit-text-size-adjust:100%;-webkit-print-color-adjust:exact;print-color-adjust:exact}
  body{margin:0;background:var(--desk);color:var(--ink);font-family:var(--body);
    font-size:9pt;line-height:1.5;font-variant-numeric:lining-nums;-webkit-font-smoothing:antialiased}

  /* Exact height, never min-height: a page break landing mid-grid would
     repaginate differently on every printer. */
  .sl{position:relative;width:297mm;height:167mm;padding:var(--m);
    background:var(--paper);margin:6mm auto;overflow:hidden;
    display:flex;flex-direction:column;box-shadow:0 1px 14px var(--shade);break-inside:avoid}
  h1,h2{font-family:var(--head);font-weight:${d.headingWeight};margin:0;line-height:1.05;overflow-wrap:anywhere;hyphens:auto}
  p{margin:0}

  /* The chrome face: folios, labels, table heads and figures. */
  .rail,.rail-folio,.cv-top,.cv-foot,.op-num,.op-leaves,.facts,.gr-label,.cs-x,.cs-rule,
  .sw-role,.sw-spec,.use-meta,.tf-eyebrow,.tf-lbl,.scale thead th,.scale td.num,.sc-lbl{
    font-family:var(--chrome);font-variant-numeric:tabular-nums lining-nums;letter-spacing:.02em}

  /* ── rail ───────────────────────────────────────────────────────────── */
  .rail{display:flex;align-items:center;gap:10mm;flex:0 0 auto;padding-bottom:3mm;font-size:7.5pt}
  .rail-mark{display:flex;align-items:center;flex:1 1 auto;min-width:0}
  .rail-name{font-family:var(--head);font-weight:${d.headingWeight};font-size:8pt;letter-spacing:.01em;
    min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
  .mk-rail{height:5mm;width:auto;max-width:40mm;object-fit:contain;object-position:left center}
  .rail-secs{display:flex;gap:6mm;flex:none;margin-left:auto;color:var(--mut)}
  .rail-secs .is-on{color:var(--ink);font-weight:600}
  /* The slide number sits in the foot, right. It is out of the rail's flow. */
  .rail-folio{position:absolute;right:var(--m);bottom:7mm;color:var(--mut);font-size:8pt}

  /* ── head ───────────────────────────────────────────────────────────── */
  .hd{display:grid;grid-template-columns:76mm 1fr;gap:10mm;flex:0 0 auto;
    border-top:.25mm solid var(--ink);padding-top:5mm;margin-bottom:7mm}
  .hd-title{font-size:19pt;letter-spacing:-.015em}
  /* Two columns, because the reference sets two short thoughts rather than one
     paragraph that ran long. */
  .hd-notes{display:grid;grid-template-columns:1fr 1fr;gap:8mm;font-size:7.5pt;
    line-height:1.5;color:var(--mut);max-width:150mm;margin-left:auto}
  .bd{flex:1 1 auto;min-height:0;display:flex;flex-direction:column}

  /* ── cover ──────────────────────────────────────────────────────────── */
  .sl-cover{justify-content:space-between}
  .cv-top{display:flex;justify-content:space-between;align-items:flex-start;font-size:8pt;color:var(--soft)}
  .mk-cover{height:7mm;width:auto;max-width:60mm;object-fit:contain;object-position:left center}
  /* Set LOW and large, and it is the project's name. A centred title reads as a
     slide; a cover is a composition and the mass belongs off the middle. The clamp is
     a backstop: clampTitle has already cut the name at a whole word. */
  .cv-title{margin:auto 0 6mm;letter-spacing:-.03em;line-height:.98;padding-bottom:.14em;
    display:-webkit-box;-webkit-box-orient:vertical;-webkit-line-clamp:2;overflow:hidden}
  .cv-title.is-clamped{padding-bottom:0;line-height:1.12}
  .cv-foot{display:flex;justify-content:space-between;align-items:flex-end;gap:10mm;font-size:8pt;
    color:var(--soft);padding-bottom:6mm}
  .cv-name{max-width:150mm;overflow-wrap:anywhere}
  .cv-foot span:last-child{margin-left:auto;text-align:right}
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
    letter-spacing:-.025em;line-height:1;overflow-wrap:anywhere}
  .op-num{font-size:22pt;letter-spacing:0;color:var(--soft);vertical-align:.85em;margin-right:3mm}
  .op-leaves{list-style:none;margin:7mm 0 auto;padding:4mm 0 0;max-width:70mm;
    border-top:.25mm solid currentColor;font-size:8pt;color:var(--soft)}
  .op-leaves li{padding:1.2mm 0}
  .op-abs{font-size:13.5pt;line-height:1.28;
    font-family:var(--head);font-weight:${d.headingWeight};letter-spacing:-.015em}
  /* Full-bleed: it cancels the page padding rather than sitting inside it, so
     the palette reads as the ground of the page and not as a swatch strip laid
     on top of one. */
  .op-field{position:absolute;top:0;right:0;bottom:0;width:34%;display:flex;flex-direction:column}
  .op-field i{flex:1}

  /* ── logo pages ─────────────────────────────────────────────────────── */
  .mk{display:block;max-width:100%}
  .mk-stage{flex:1 1 auto;display:flex;align-items:center;justify-content:center;
    border:.25mm solid var(--line);background:var(--wash);min-height:0}
  .mk-hero{max-height:56mm;max-width:150mm;width:auto;height:auto;object-fit:contain}
  .facts{display:flex;gap:14mm;margin:5mm 0 0;flex:0 0 auto}
  .facts dt{font-size:7.5pt;color:var(--mut);margin-bottom:1mm}
  .facts dd{margin:0;font-size:8.5pt}
  .grounds{display:grid;grid-template-columns:repeat(3,1fr);gap:4mm;flex:1 1 auto;min-height:0}
  /* See fillRow(): the last tile takes the cells its row would have left blank,
     rather than the grid ending on a hole. */
  .is-span2{grid-column:span 2}
  .is-span3{grid-column:span 3}
  .gr{position:relative;display:flex;align-items:center;justify-content:center;padding:6mm}
  .gr-edge{box-shadow:inset 0 0 0 .25mm var(--line)}
  .mk-tile{max-height:16mm;max-width:70%;width:auto;object-fit:contain}
  .gr-label{position:absolute;left:3mm;bottom:2.5mm;font-size:7pt}
  .cs-stage{flex:1 1 auto;display:flex;align-items:center;justify-content:center;min-height:0}
  .cs-box{position:relative;display:flex;align-items:center;justify-content:center;
    outline:.25mm dashed var(--ink);outline-offset:0}
  .mk-cs{width:auto;max-width:100%;object-fit:contain}
  /* The X markers sit ON the keep-out band they measure, which is the only
     placement that makes the measurement self-evident. */
  .cs-x{position:absolute;display:flex;align-items:center;justify-content:center;
    background:var(--wash);font-size:7.5pt;color:var(--mut)}
  .cs-x-top{top:0;left:0}
  .cs-x-left{left:0;top:50%;transform:translateY(-50%)}
  .cs-rule{flex:0 0 auto;margin-top:4mm;font-size:8pt;color:var(--mut);text-align:center}

  /* ── swatches ───────────────────────────────────────────────────────── */
  /* One row of cards up to six colours, two rows up to thirteen; the primary is the
     double-width card (paletteLayout sets each card's share as its flex-grow). */
  .swatches{display:flex;flex-direction:column;gap:4mm;flex:1 1 auto;min-height:0}
  .sw-row{display:flex;gap:4mm;flex:1 1 0;min-height:0}
  .sw{display:flex;flex-direction:column;justify-content:space-between;gap:2mm;margin:0;padding:4.5mm;min-width:0;overflow:hidden}
  .sw-top{display:flex;flex-direction:column;gap:1.5mm}
  .sw-role{font-size:7pt;color:var(--soft)}
  .sw-name{font-family:var(--head);font-weight:${d.headingWeight};font-size:12pt;line-height:1.1;overflow-wrap:anywhere}
  .sw-primary .sw-name{font-size:17pt}
  .sw-spec{margin:0;display:flex;flex-direction:column;gap:1.2mm}
  .sw-spec div{display:flex;justify-content:space-between;gap:3mm;font-size:7pt;line-height:1.35;
    border-top:.25mm solid var(--soft);padding-top:1.2mm}
  .sw-spec dt{color:var(--soft);flex:none}
  .sw-spec dd{margin:0;text-align:right;overflow-wrap:anywhere}
  .sw-spec .sw-lands{display:block}
  .sw-spec .sw-lands dd{text-align:left;margin-top:.4mm}

  /* ── in use ─────────────────────────────────────────────────────────── */
  .uses{display:grid;grid-template-columns:repeat(3,1fr);gap:4mm;flex:1 1 auto;min-height:0}
  .use{display:flex;flex-direction:column;justify-content:space-between;padding:5mm;min-width:0}
  .use-set{font-family:var(--head);font-weight:${d.headingWeight};font-size:17pt;
    line-height:1.05;letter-spacing:-.01em;overflow-wrap:anywhere}
  .use-meta{font-size:7pt;color:var(--soft)}

  /* ── typography ─────────────────────────────────────────────────────── */
  .tf{display:grid;grid-template-columns:82mm 1fr;gap:12mm;flex:1 1 auto;min-height:0}
  /* min-height:0 on both columns: a grid item defaults to min-height:auto, so
     without it a tall column pushes THROUGH the fixed page instead of being
     held by it, and a page that silently grows is a page that repaginates
     differently on every printer. */
  .tf-left{display:flex;flex-direction:column;min-width:0;min-height:0}
  .tf-eyebrow{font-size:7.5pt;color:var(--mut)}
  .tf-name{font-size:22pt;line-height:1.1;margin:2mm 0 0;overflow-wrap:anywhere}
  /* The specimen fills what the name leaves and is CENTRED in it rather than
     pinned to the foot - pinned, it sat under a band of empty paper that read
     as the column having failed to fill. */
  .tf-ag{flex:1 1 auto;min-height:0;display:flex;align-items:center;
    font-size:92pt;line-height:.86;letter-spacing:-.035em;overflow:hidden}
  .tf-right{display:flex;flex-direction:column;min-width:0;min-height:0}
  .tf-lbl{font-size:7.5pt;color:var(--mut);margin:0 0 1.5mm}
  .tf-lbl:not(:first-child){margin-top:3.5mm}
  /* The boxed grid, OpenPay's signature. Fixed ten columns with hairline cells;
     the last row runs short and is LEFT short, because a character set padded
     out to a rectangle has stopped being a character set.
     THE CELL IS A FIXED HEIGHT, NOT A SQUARE. Square cells at ten columns across
     the 160mm right-hand column came out 16mm tall, so three grids stood 100mm
     over the page and both type spreads overflowed, measured in a browser, not
     guessed. A character grid is a reading object, so it is set at a reading
     size and the cell follows it. A face set at two weights shows each weight's
     whole character set in thirteen columns at a lower cell, so both fit. */
  .alpha{display:grid;grid-template-columns:repeat(10,1fr);
    border-top:.25mm solid var(--line);border-left:.25mm solid var(--line)}
  .alpha span{display:flex;align-items:center;justify-content:center;
    height:8mm;font-size:11pt;line-height:1;
    border-right:.25mm solid var(--line);border-bottom:.25mm solid var(--line)}
  .alpha-all{grid-template-columns:repeat(13,1fr)}
  .alpha-all span{height:7mm;font-size:10.5pt}
  .scale{width:100%;border-collapse:collapse;font-size:8pt;table-layout:fixed}
  .scale th,.scale td{text-align:left;padding:2.6mm 2mm;
    border-bottom:.25mm solid var(--hair);vertical-align:middle}
  .scale thead th{font-size:7.5pt;font-weight:400;color:var(--mut);border-bottom:.25mm solid var(--ink)}
  .scale th[scope=row]{font-weight:600;white-space:nowrap;width:34mm}
  .scale td.num{width:22mm}
  .scale td.sp{white-space:nowrap;overflow:hidden;line-height:1.1}

  /* ── scope ──────────────────────────────────────────────────────────── */
  .sc-grid{display:grid;grid-template-columns:1fr 1.35fr;gap:14mm}
  .sc-lbl{font-size:7.5pt;color:var(--mut);margin-bottom:3mm}
  .sc-list{list-style:none;margin:0;padding:0;font-size:8pt;line-height:1.45}
  .sc-list li{padding:2.6mm 0;border-top:.25mm solid var(--hair);overflow-wrap:anywhere}
  .sc-list li:first-child{border-top:.25mm solid var(--ink)}
  .sc-absent li{color:var(--mut)}

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
  cover,
  css,
})
