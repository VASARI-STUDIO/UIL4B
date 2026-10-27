// The design system book, "Monograph": an editorial book. One idea per page,
// mirrored margins, a running head, text and specimen in conversation. The chrome
// (running head, folios, margin notes, the colophon) is Literata at 11 pt or
// smaller; every heading, the cover and every specimen is the user's own face,
// and the ground is the user's own paper.
//
// A page is a 156 mm measure split into a 110 mm text column and a 40 mm margin
// column with a 6 mm gap. Recto pages (odd folios) put the margin column on the
// outer right edge; verso pages mirror it, so a printed spread reads as a book.

import { esc, safeHex, inkName, paletteLayout, chromeFor, clampTitle } from '../shared.js'
import { mixHex } from '../roles.js'

const CHROME = Object.freeze({ family: 'Literata', weights: '200 900', file: 'literata-latin.woff2' })

// The most colours the matrix lays out; past this the cells stop being legible.
const MATRIX_MAX = 8
// The longest run of neutrals one shared page carries (two columns of six).
const NEUTRALS_PER_PAGE = 12

const side = (folio) => (folio % 2 === 1 ? 'rt' : 'vs')
const dl = (rows) => `<dl class="kv">${rows.map(([k, v]) => `<div><dt>${esc(k)}</dt><dd>${esc(v)}</dd></div>`).join('')}</dl>`
const roleName = (role) => String(role).toLowerCase()

/** A page: running head (project name on a verso, section on a recto), the body, and the folio on the outer edge. */
function frame(ctx, inner, { section = '', folio = null, cls = '' } = {}) {
  const s = side(folio ?? 1)
  const head = cls.includes('pg-blank') ? '' : `<header class="rh"><span>${esc(s === 'vs' ? ctx.projectName : section)}</span></header>`
  // The shared gradient and token pages bring their own .pg-body; wrapping it again
  // would seat the inner grid in the first column, the 40 mm margin on a verso.
  const body = !inner ? '' : inner.startsWith('<div class="pg-body">') ? inner : `<div class="pg-body">${inner}</div>`
  return `<section class="pg ${s} ${cls}">
  ${head}
  ${body}
  ${folio === null ? '' : `<footer class="foot"><span class="folio">${folio}</span></footer>`}
</section>`
}

// Cover title: sizes in pt, largest first, in the 110 mm text column (312 pt).
const TITLE_FIT = Object.freeze({ steps: Object.freeze([40, 32, 26]), maxLines: 3, measure: 312 })

/** The project name set in the user's heading face; a name too long for three lines is cut at a whole word. */
const title = (ctx, size, cls) =>
  `<h1 class="${cls}" style="font-size:${size}pt">${esc(clampTitle(ctx.projectName, size, TITLE_FIT))}</h1>`

function front(ctx) {
  const { fit, field, logo, projectName } = ctx
  const mark = logo ? `<img class="cv-logo" src="${esc(logo.src)}" alt="${esc(projectName)} mark">` : ''
  const cover = `<section class="pg rt pg-cover">
  <div class="cv">
    ${title(ctx, fit.size, 'cv-title')}
    <i class="cv-sq" style="background:${safeHex(field, 'CanvasText')}"></i>
  </div>
  ${mark}
</section>`
  // The half-title: the name alone, smaller than the cover, on the next right-hand page
  // (page 3), with the back of the cover left blank.
  const blank = '<section class="pg vs pg-blank"></section>'
  const half = `<section class="pg rt pg-half">
  <div class="cv">${title(ctx, Math.max(18, Math.round(fit.size * 0.6)), 'cv-title')}</div>
</section>`
  return [cover, blank, half]
}

/** A section opening: its title alone, on a right-hand page (the generator leaves the page before it blank). */
function opening(ctx, { title: text, folio }) {
  return `<section class="pg rt pg-open">
  <div class="cv"><h2 class="op-title">${esc(text)}</h2></div>
  <footer class="foot"><span class="folio">${folio}</span></footer>
</section>`
}

function contents(ctx, { contents: list, tokens, iso, folio }) {
  const rows = list.map((c) => `<li${c.sub ? ' class="is-sub"' : ''}>
      <span class="ct-title">${esc(c.title)}</span><span class="ct-dot"></span><span class="ct-folio">${c.folio}</span>
    </li>`).join('')
  const d = ctx.d
  return `<section class="pg ${side(folio)} pg-contents">
  <header class="rh"><span>${esc(side(folio) === 'vs' ? ctx.projectName : 'Contents')}</span></header>
  <div class="pg-body">
    <div class="pg-head"><h2 class="ct-h">Contents</h2></div>
    <ol class="ct-list tx">${rows}</ol>
    <aside class="mg ct-aside">${dl([['Colours', d.palette.length], ['Type steps', 8], ['Tokens', tokens.length], ['Issued', iso]])}</aside>
  </div>
  <footer class="foot"><span class="folio">${folio}</span></footer>
</section>`
}

/** The tint strip under a plate: the colour, then 80, 60, 40 and 20% of it over paper. */
function tints(s) {
  const all = [{ pct: 100, hex: s.hex }, ...s.tints]
  return `<div class="tint">${all.map((t) => `<span><i style="background:${safeHex(t.hex, 'GrayText')}"></i>${t.pct}%</span>`).join('')}</div>`
}

/** What the margin column says about one colour. */
function specs(s) {
  return `<p class="role">${esc(roleName(s.role))}</p>
    <p class="nm">${esc(s.name)}</p>
    ${dl([
    ['Hex', s.hex], ['RGB', s.rgb], ['HSL', s.hsl], ['OKLCH', s.oklch],
    ['Ink', `${inkName(s.ink)}, ${s.ratio}:1, ${s.grade}`],
  ])}
    <p class="lands"><b>Where it lands</b>${esc(s.lands)}</p>`
}

function swatches(ctx, slots) {
  const { d } = ctx
  const pages = []
  const rows = paletteLayout(slots.length, 'monograph').map((row) => `<div class="ov-row">${row.map(({ i, span }) => {
    const s = slots[i]
    return `<div class="ov-cell${span > 1 ? ' is-primary' : ''}" style="grid-column:span ${span}">
        <i class="ov-chip" style="background:${safeHex(s.hex, 'GrayText')}"></i>
        <p class="role">${esc(roleName(s.role))}</p>
        <p class="nm">${esc(s.name)}</p>
        <p class="hx">${esc(s.hex)}</p>
        <p class="lands">${esc(s.lands)}</p>
      </div>`
  }).join('')}</div>`).join('')
  const cut = d.palette.length > slots.length
  pages.push({
    leaf: 'The palette',
    inner: `<header class="pg-head"><h3>The palette</h3>
      <p class="lede">Each colour with its role in the system and the place it paints.</p></header>
    <div class="wide ov">${rows}</div>
    ${cut ? `<p class="note">The first ${slots.length} of ${d.palette.length} colours are shown. All ${d.palette.length} are listed in Tokens.</p>` : ''}`,
  })

  // One colour to a page for the primary and the accents.
  for (const s of slots.filter((x) => x.kind !== 'neutral')) {
    pages.push({
      leaf: s.name,
      inner: `<div class="rw">
      <div class="tx"><i class="plate" style="background:${safeHex(s.hex, 'GrayText')}"></i>${tints(s)}</div>
      <div class="mg">${specs(s)}</div>
    </div>`,
    })
  }

  // Neutrals share pages as a list of 20 mm chips.
  const neutrals = slots.filter((x) => x.kind === 'neutral')
  for (let start = 0; start < neutrals.length; start += NEUTRALS_PER_PAGE) {
    const group = neutrals.slice(start, start + NEUTRALS_PER_PAGE)
    pages.push({
      leaf: start === 0 ? 'Neutrals' : null,
      inner: `<header class="pg-head">${start === 0
    ? '<h3>Neutrals</h3><p class="lede">The quiet colours: grounds, text and rules.</p>'
    : '<h3 class="cont">Neutrals <span>continued</span></h3>'}</header>
    <div class="wide chips">${group.map((s) => `<div class="chip">
        <i style="background:${safeHex(s.hex, 'GrayText')}"></i>
        <div><p class="role">${esc(roleName(s.role))}</p><p class="nm">${esc(s.name)}</p>
        <p class="hx">${esc(s.hex)} &middot; ${s.ratio}:1 ${esc(s.grade)}</p><p class="lands">${esc(s.lands)}</p></div>
      </div>`).join('')}</div>`,
    })
  }
  return pages
}

function matrix(ctx, slots) {
  const cols = slots.slice(0, MATRIX_MAX).map((s) => s.hex)
  const axes = [...cols, ctx.white, ctx.black]
  const head = axes.map((c) => `<th scope="col"><i class="dot" style="background:${safeHex(c, 'GrayText')}"></i><span>${esc(c.replace('#', ''))}</span></th>`).join('')
  const rows = cols.map((row) => `<tr><th scope="row"><i class="dot" style="background:${safeHex(row, 'GrayText')}"></i>${esc(row)}</th>${axes.map((col) => {
    if (row === col) return '<td class="mx-self">&mdash;</td>'
    const r = ctx.contrast(row, col)
    const [cls, word] = r >= 4.5 ? ['mx-pass', 'Pass'] : r >= 3 ? ['mx-mid', 'Large'] : ['mx-fail', 'Fail']
    return `<td class="${cls}">${r}<span>${word}</span></td>`
  }).join('')}</tr>`).join('')
  const capped = ctx.d.palette.length > MATRIX_MAX
  return [{
    leaf: 'Contrast matrix',
    inner: `<header class="pg-head"><h3>Contrast matrix</h3>
      <p class="lede">Every pair measured. Read a row as the background and a column as the text on it.</p></header>
    <table class="wide mx"><thead><tr><th scope="col"><span>bg / text</span></th>${head}</tr></thead><tbody>${rows}</tbody></table>
    <p class="mg key"><b>Pass</b> reads as normal text, 4.5:1 or more. <b>Large</b> reads as large text only, 3:1 or more. <b>Fail</b> is a fill, not a text pair.</p>
    ${capped ? `<p class="note">The matrix shows the first ${MATRIX_MAX} colours. Each colour page gives its own reading ink and ratio.</p>` : ''}`,
  }]
}

function typography(ctx) {
  const { d, ladder } = ctx
  const family = (role, name, weight, spacing) => `<div class="rw fm">
      <div class="tx"><p class="fm-name" style="font-family:'${esc(name)}',system-ui,sans-serif;font-weight:${weight};letter-spacing:${spacing || 0}em">${esc(name)}</p>
      <p class="fm-set" style="font-family:'${esc(name)}',system-ui,sans-serif;font-weight:${weight}">ABCDEFGHIJKLMNOPQRSTUVWXYZ<br>abcdefghijklmnopqrstuvwxyz<br>0123456789 &amp; ., : ; ! ? ( ) &ndash; @ # % $</p></div>
      <div class="mg"><p class="role">${esc(role)}</p>${dl([['Weight', weight], ['Tracking', spacing ? `${spacing}em` : 'normal']])}</div>
    </div>`
  const scale = ladder.map((s) => {
    const heading = s.exp >= 1
    return `<div class="rw st">
      <div class="tx"><p class="sp" style="font-size:${Math.min(s.px, 44)}px;font-family:'${esc(heading ? d.heading : d.body)}',system-ui,sans-serif;font-weight:${heading ? d.headingWeight : d.bodyWeight}">${esc(s.name)}</p></div>
      <div class="mg"><p class="hx">${esc(s.name)} &middot; ${s.px}px</p><p class="hx">${(s.px / 16).toFixed(3).replace(/\.?0+$/, '')}rem &middot; ${heading ? 1.15 : d.lineHeight}</p></div>
    </div>`
  }).join('')
  return [
    {
      leaf: 'The families',
      inner: `<header class="pg-head"><h3>The families</h3>
      <p class="lede">Two faces carry the system. The colophon states the fallbacks.</p></header>
    ${family('Headings', d.heading, d.headingWeight, d.headingSpacing)}${family('Body', d.body, d.bodyWeight, d.bodySpacing)}`,
    },
    {
      leaf: 'The scale',
      inner: `<header class="pg-head"><h3>The scale</h3>
      <p class="lede">A ${d.ratio} ratio from a ${d.baseSize}px base. Each step is set in its own face.</p></header>
    ${scale}
    <p class="note">Steps above 44px are shown reduced to fit; the size beside each step is the true value.</p>`,
    },
  ]
}

/** Notes: the colophon renamed for the genre. Labels sit in the margin, the text beside them. */
function colophon(ctx) {
  const { d, projectName, iso } = ctx
  const face = chromeFor(CHROME, ctx.fontData) ? ' Running heads, folios and notes are set in Literata.' : ''
  const note = (label, text) => `<div class="rw"><div class="mg"><p class="role">${esc(label)}</p></div><div class="tx"><p>${text}</p></div></div>`
  return `<header class="pg-head"><h3>Notes</h3></header>
    ${note('Method', 'Contrast is the WCAG 2.2 relative-luminance ratio (&sect;1.4.3). AA needs 4.5:1 for normal text and 3:1 for large; AAA needs 7:1. Every figure is reproducible: the same two hex values always give the same ratio.')}
    ${note('Typefaces', `Headings set in ${esc(d.heading)} at ${d.headingWeight}, body in ${esc(d.body)} at ${d.bodyWeight}. Both fall back to <code>system-ui</code>, then the platform sans, so this document reads correctly offline or behind a blocked font host.${face}`)}
    ${note('Scope', 'Colour, typography and tokens: the decisions this system actually holds. A full identity manual would also carry logo construction, imagery direction and applied examples; they are not here because they are not in the system.')}
    ${note('This book', `<span class="full">${esc(projectName)}</span><br>Issued ${esc(iso)}`)}`
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
    --chrome:'Literata',Georgia,'Iowan Old Style','Times New Roman',serif;
    --mono:ui-monospace,SFMono-Regular,'SF Mono',Menlo,Consolas,monospace;
    --inner:22mm; --edge:32mm; --text:110mm; --note:40mm; --gap:6mm;
  }
  *{box-sizing:border-box}
  html{-webkit-text-size-adjust:100%;-webkit-print-color-adjust:exact;print-color-adjust:exact}
  body{margin:0;background:var(--desk);color:var(--ink);font-family:var(--chrome);font-size:10pt;line-height:1.5}
  .bk{display:block}

  /* A fixed page with mirrored margins: odd folios are recto, even are verso. */
  .pg{position:relative;width:210mm;height:297mm;background:var(--paper);margin:8mm auto;overflow:hidden;
    box-shadow:0 1px 12px var(--shade);break-after:page;break-inside:avoid;padding:28mm 0 24mm}
  .pg.rt{padding-left:var(--inner);padding-right:var(--edge);--c-tx:1;--c-mg:2;--cols:var(--text) var(--note)}
  .pg.vs{padding-left:var(--edge);padding-right:var(--inner);--c-tx:2;--c-mg:1;--cols:var(--note) var(--text)}
  .pg-body{height:100%;display:grid;grid-template-columns:var(--cols);column-gap:var(--gap);
    grid-auto-rows:min-content;align-content:start;row-gap:0}
  .pg-body>*{min-width:0}
  .tx{grid-column:var(--c-tx)}
  .mg{grid-column:var(--c-mg)}
  .wide{grid-column:1/-1}
  .rw,.pg-head{grid-column:1/-1;display:grid;grid-template-columns:var(--cols);column-gap:var(--gap)}
  .rw>.tx,.rw>.mg,.pg-head>h2,.pg-head>h3,.pg-head>.lede{grid-row:1}

  /* The running head: small caps, no wider than .04em, cut at 90 mm. */
  .rh{position:absolute;top:12mm;width:90mm;font-family:var(--chrome);font-size:8pt;line-height:1.2;
    font-variant-caps:all-small-caps;letter-spacing:.04em;color:var(--muted)}
  .rh span{display:block;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
  .rt .rh{left:var(--inner)}
  .vs .rh{left:calc(var(--edge) + var(--note) + var(--gap))}
  .foot{position:absolute;bottom:12mm;width:20mm;font-family:var(--chrome);font-size:8pt;line-height:1.2;color:var(--muted)}
  .rt .foot{right:var(--edge);text-align:right}
  .vs .foot{left:var(--edge)}
  .folio{font-variant-numeric:lining-nums tabular-nums}
  .pg-blank .foot{bottom:12mm}

  h1,h2,h3{font-family:var(--head);font-weight:${d.headingWeight};margin:0;line-height:1.1}
  p{margin:0 0 1em}
  .pg-head{margin-bottom:9mm}
  .pg-head h3,.ct-h{font-family:var(--head);font-size:21pt;letter-spacing:-.01em;grid-column:var(--c-tx)}
  .pg-head h3.cont span{font-weight:400;color:var(--muted)}
  .pg-head .lede{grid-column:var(--c-mg);font-family:var(--chrome);font-size:8pt;line-height:1.45;color:var(--muted);margin:1.4mm 0 0}
  .note{grid-column:var(--c-mg);font-family:var(--chrome);font-size:8pt;line-height:1.45;color:var(--muted);margin:6mm 0 0}
  .key{font-family:var(--chrome);font-size:8pt;line-height:1.45;color:var(--muted);margin:6mm 0 0}
  .key b{color:var(--ink);font-weight:600}
  code,.tk-n,.tk-v,.code{font-family:var(--mono);font-size:8pt;font-variant-numeric:tabular-nums}

  /* ── cover, half-title, openings ───────────────────────────────────── */
  .cv{position:absolute;top:113mm;width:var(--text)}
  .rt .cv{left:var(--inner)}
  .vs .cv{left:calc(var(--edge) + var(--note) + var(--gap))}
  .cv-title{font-family:var(--head);font-weight:${d.headingWeight};line-height:1.1;letter-spacing:-.01em;
    overflow-wrap:anywhere;hyphens:auto;display:-webkit-box;-webkit-box-orient:vertical;-webkit-line-clamp:3;overflow:hidden;
    padding-bottom:.12em;margin:0 0 10mm}
  .pg-half .cv-title{margin:0}
  .cv-sq{display:block;width:30mm;height:30mm}
  .cv-logo{position:absolute;left:var(--inner);bottom:24mm;height:12mm;width:auto;max-width:var(--text);object-fit:contain}
  .op-title{font-family:var(--head);font-size:34pt;letter-spacing:-.02em;overflow-wrap:anywhere}

  /* ── contents ──────────────────────────────────────────────────────── */
  .ct-h{grid-row:1;margin:0 0 9mm}
  .ct-list{list-style:none;margin:0;padding:0;font-family:var(--chrome);font-size:10pt}
  .ct-list li{display:flex;align-items:baseline;gap:3mm;padding:2.4mm 0;border-top:.25mm solid var(--rule)}
  .ct-list li.is-sub{border-top:none;padding:.8mm 0 .8mm 5mm;font-size:8pt;color:var(--muted)}
  .ct-title{min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
  .ct-dot{flex:1;border-bottom:.25mm dotted var(--rule);transform:translateY(-.8mm)}
  .ct-folio{font-variant-numeric:lining-nums tabular-nums}
  .ct-aside{margin-top:1.4mm}

  /* ── margin notes: one size, 8 pt ──────────────────────────────────── */
  .mg{font-family:var(--chrome);font-size:8pt;line-height:1.45}
  .role{font-family:var(--chrome);font-size:8pt;font-variant-caps:all-small-caps;letter-spacing:.04em;color:var(--muted);margin:0 0 .6mm}
  .nm{font-family:var(--head);font-weight:${d.headingWeight};font-size:13pt;line-height:1.15;margin:0 0 3mm;overflow-wrap:anywhere}
  .hx{font-family:var(--chrome);font-size:8pt;font-variant-numeric:lining-nums tabular-nums;margin:0 0 .6mm}
  .kv{margin:0 0 4mm}
  .kv div{display:flex;flex-direction:column;border-top:.25mm solid var(--rule);padding:1mm 0 1.2mm}
  .kv dt{font-family:var(--chrome);font-size:7pt;font-variant-caps:all-small-caps;letter-spacing:.04em;color:var(--muted)}
  .kv dd{margin:0;font-family:var(--chrome);font-size:8pt;font-variant-numeric:lining-nums tabular-nums;overflow-wrap:anywhere}
  .lands{font-family:var(--chrome);font-size:8pt;line-height:1.4;color:var(--muted);margin:0}
  .lands b{display:block;font-weight:600;color:var(--ink)}

  /* ── palette overview and colour pages ─────────────────────────────── */
  .ov-row{display:grid;grid-template-columns:repeat(3,1fr);gap:0 5mm;margin-bottom:4.5mm}
  .ov-cell{min-width:0}
  .ov-chip,.plate,.tint i,.chip>i{outline:.25mm solid var(--rule);outline-offset:-.25mm}
  .ov-chip{display:block;height:11mm;margin-bottom:1.6mm}
  .ov-cell.is-primary .ov-chip{height:30mm}
  .ov-cell .nm{font-size:10.5pt;margin:0}
  .ov-cell p{margin:0}
  .ov-cell .lands{font-size:7pt}
  .plate{display:block;height:150mm;width:100%}
  .tint{display:flex;gap:2mm;margin-top:6mm}
  .tint span{flex:1;font-family:var(--chrome);font-size:7pt;color:var(--muted);font-variant-numeric:lining-nums tabular-nums}
  .tint i{display:block;height:20mm;margin-bottom:1.2mm}
  .chips{display:grid;grid-template-columns:1fr 1fr;gap:5mm 8mm}
  .chip{display:flex;gap:4mm;min-width:0}
  .chip>i{flex:0 0 20mm;height:20mm}
  .chip p{margin:0}
  .chip .nm{font-size:10.5pt}
  .chip .lands{font-size:7pt}

  /* ── matrix ────────────────────────────────────────────────────────── */
  .mx{width:100%;border-collapse:collapse;table-layout:fixed;font-family:var(--chrome);font-size:8pt}
  .mx th,.mx td{padding:2.2mm 0;text-align:center;border-bottom:.25mm solid var(--rule);font-weight:400}
  .mx thead th{border-bottom:.35mm solid var(--ink);color:var(--muted);font-size:7pt}
  .mx thead th span,.mx td span{display:block;font-size:7pt;color:var(--muted)}
  .mx tbody th{text-align:left;white-space:nowrap}
  .mx td{font-variant-numeric:lining-nums tabular-nums}
  .mx col:first-child{width:28mm}
  .mx-pass{font-weight:700!important}
  .mx-mid{font-weight:500!important}
  .mx-self{color:var(--rule)}
  .dot{display:inline-block;width:2.6mm;height:2.6mm;margin-right:1.4mm;vertical-align:-.3mm;border:.25mm solid var(--rule)}
  .mx thead .dot{display:block;margin:0 auto 1mm}

  /* ── type ──────────────────────────────────────────────────────────── */
  .fm{padding:5mm 0 6mm;border-top:.25mm solid var(--ink)}
  .fm-name{font-family:var(--head);font-size:28pt;line-height:1.1;margin:0 0 5mm;overflow-wrap:anywhere}
  .fm-set{font-family:var(--body);font-size:12pt;line-height:1.6;margin:0;overflow-wrap:anywhere}
  .st{padding:3mm 0;border-top:.25mm solid var(--rule);align-items:baseline}
  .sp{margin:0;line-height:1.15;white-space:nowrap;overflow:hidden}
  .st .mg{padding-top:1mm}

  /* ── gradient (the shared page) ────────────────────────────────────── */
  .gr-spec{grid-column:1/-1;height:62mm;margin-bottom:7mm;outline:.25mm solid var(--rule);outline-offset:-.25mm}
  .tb{grid-column:1/-1;width:100%;border-collapse:collapse;font-family:var(--chrome);font-size:8pt}
  .tb th,.tb td{text-align:left;padding:2.2mm 1mm;border-bottom:.25mm solid var(--rule);font-weight:400;vertical-align:middle}
  .tb thead th{border-bottom:.35mm solid var(--ink);color:var(--muted);font-size:7pt}
  .num{font-family:var(--mono);font-size:8pt;font-variant-numeric:lining-nums tabular-nums}

  /* ── tokens ────────────────────────────────────────────────────────── */
  .tk{grid-column:1/-1;width:100%;border-collapse:collapse}
  .tk td{padding:1.1mm 1mm;border-bottom:.25mm solid var(--rule);vertical-align:top;line-height:1.25}
  .tk tr:first-child td{border-top:.35mm solid var(--ink)}
  .tk-n{width:58mm;white-space:nowrap}
  .tk-v{color:var(--muted);word-break:break-all}
  .code{grid-column:1/-1;border-left:.5mm solid var(--ink);padding:3mm 4mm;margin:6mm 0 0;white-space:pre-wrap;word-break:break-all}

  /* ── notes ─────────────────────────────────────────────────────────── */
  .pg-body>.rw p{margin:0 0 4mm}
  .full{font-family:var(--head);font-weight:${d.headingWeight};font-size:12pt;overflow-wrap:anywhere}

  @media print{
    body{background:none}
    .pg{margin:0;box-shadow:none}
    .pg:last-child{break-after:auto}
    @page{size:A4;margin:0}
  }`
}

export default Object.freeze({
  id: 'monograph',
  numbered: false,
  openOnRecto: true,
  // The cover and the half-title come before the contents.
  front,
  titleFit: TITLE_FIT,
  // 28 rows of 8 pt leave the token pages room under the header.
  tokensPerPage: 30,
  sectionOrder: Object.freeze(['colour', 'typography', 'tokens']),
  colophonTitle: 'Notes',
  frame,
  opening,
  contents,
  swatches,
  matrix,
  typography,
  colophon,
  css,
})
