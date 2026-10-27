// The design system book, "Specification": a graphics-standards manual. Full-bleed
// section dividers, then numbered specification pages on one 12-column A4 grid.
// A template returns strings; the generator owns every fact on the page.

import { esc } from '../shared.js'

function cover({ d, projectName, field, fieldInk, iso, year }) {
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

/** A numbered content page with a running foot. `folio` is the printed page
 *  number; the cover and section openings carry none, as in any bound book. */
function frame(ctx, inner, { section = '', folio = null, cls = '' } = {}) {
  return `<section class="pg ${cls}">
  ${inner}
  ${folio === null ? '' : `<footer class="foot"><span>${esc(section)}</span><span class="folio">${folio}</span></footer>`}
</section>`
}

/** A full-bleed section opening: one dominant mass, an oversized numeral, and
 *  the section abstract. The Swiss/NASA move, and the thing that paces the book. */
function opening(ctx, { num, title, abstract, field, ink }) {
  return `<section class="pg pg-open" style="background:${field};color:${ink}">
  <div class="open-num">${esc(num)}</div>
  <div class="open-foot">
    <h2 class="open-title">${esc(title)}</h2>
    <p class="open-abs">${esc(abstract)}</p>
  </div>
</section>`
}

/**
 * One grid, held on every page. Sizes are in pt because this is a print
 * document and pt is the unit the page is actually measured in.
 */
function css({ d }) {
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

export default Object.freeze({
  id: 'specification',
  // The ids of the sections the generator builds, in the order this template
  // lays them out.
  sectionOrder: Object.freeze(['colour', 'typography', 'tokens']),
  cover,
  frame,
  opening,
  css,
})
