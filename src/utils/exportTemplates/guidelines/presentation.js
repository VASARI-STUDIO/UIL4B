// The brand guidelines, "Presentation": a 16:9 deck, one point per slide.
// A template returns strings; the generator owns every fact on the page.

import { esc } from '../shared.js'

function cover(ctx) {
  const { d, field, fieldInk: ink, year } = ctx
  const rest = d.palette.filter(c => c !== field)
  const band = rest.length ? `<div class="cv-band">${rest.map(c => `<i style="background:${c}"></i>`).join('')}</div>` : ''
  return `<section class="sl sl-cover" style="background:${field};color:${ink}">
  <div class="cv-top">
    <span class="cv-mark">${ctx.mark}</span>
    <span class="cv-year">${esc(year)}</span>
  </div>
  <h1 class="cv-title">Brand <br>Guidelines</h1>
  <div class="cv-foot">
    <span>${esc(ctx.projectName)}</span>
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
function css({ d }) {
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

export default Object.freeze({
  id: 'presentation',
  // The ids of the sections the generator builds, in the order this template
  // lays them out.
  sectionOrder: Object.freeze(['logo', 'colour', 'type']),
  cover,
  css,
})
