// The style-guide export: a saved design → a document someone can hand to a
// client or a developer without editing it first.
//
// WHY IT IS A DOCUMENT, NOT A DUMP. Every tool here can already copy CSS. What
// nobody can do in ten seconds is produce the *artefact* — a paginated,
// titled, explained style guide with the colours shown at usable size, the type
// ladder set in the real families, and the contrast evidence written down. That
// is the thing worth paying for, so this generates a booklet: A4 pages, print
// styles, a cover, and one section per part of the system.
//
// SELF-CONTAINED BY CONSTRUCTION. The output has no external stylesheet, no
// script, and no image request. The only network reference is the Google Fonts
// @import for the user's own families, and the document states its fallbacks so
// it still reads correctly offline or behind a blocked font host.
//
// Pure functions over a plain design object — no React, no DOM — so the whole
// document is unit-testable as a string.

import { SITE_ORIGIN } from './routeMeta.js'

/** WCAG relative luminance for an #rrggbb string. */
function luminance(hex) {
  const c = [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16) / 255)
    .map(v => (v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4)))
  return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]
}

/** Contrast ratio between two #rrggbb strings, to 2dp. */
export function contrast(a, b) {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x)
  return +((hi + 0.05) / (lo + 0.05)).toFixed(2)
}

/** The ink that reads best on a given fill, and the evidence for choosing it. */
export function inkFor(hex) {
  const onWhite = contrast(hex, '#FFFFFF')
  const onBlack = contrast(hex, '#000000')
  return onBlack >= onWhite
    ? { ink: '#000000', ratio: onBlack, label: 'black' }
    : { ink: '#FFFFFF', ratio: onWhite, label: 'white' }
}

/** WCAG grade for a ratio at normal text size. */
export function grade(ratio) {
  if (ratio >= 7) return 'AAA'
  if (ratio >= 4.5) return 'AA'
  if (ratio >= 3) return 'AA Large'
  return 'Fail'
}

const esc = (s) => String(s ?? '')
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;')

const isHex = (v) => typeof v === 'string' && /^#[0-9a-fA-F]{6}$/.test(v)

/**
 * Normalise whatever the design context holds into exactly what the document
 * needs. Saved designs come from many tool versions, so every field is treated
 * as untrusted: a half-written palette produces a shorter guide, never a broken
 * one, and never a page of "undefined".
 */
export function readDesign(design) {
  const palette = (design?.palette?.colors || [])
    .filter(isHex).map(c => c.toUpperCase())
  const base = isHex(design?.palette?.base) ? design.palette.base.toUpperCase() : palette[0] || null
  const heading = design?.fonts?.heading?.family || 'Inter'
  const body = design?.fonts?.body?.family || 'Inter'
  const ts = design?.typeScale || {}
  return {
    palette,
    base,
    heading,
    headingWeight: Number(ts.headingWeight) || design?.fonts?.heading?.weight || 700,
    body,
    bodyWeight: design?.fonts?.body?.weight || 400,
    baseSize: Number(ts.base) > 0 ? Number(ts.base) : 16,
    ratio: Number(ts.ratio) > 1 ? Number(ts.ratio) : 1.25,
    lineHeight: Number(ts.lineHeight) > 0 ? Number(ts.lineHeight) : 1.5,
  }
}

const STEPS = [
  { name: 'Display', exp: 5 }, { name: 'Heading 1', exp: 4 }, { name: 'Heading 2', exp: 3 },
  { name: 'Heading 3', exp: 2 }, { name: 'Lead', exp: 1 }, { name: 'Body', exp: 0 },
  { name: 'Small', exp: -1 }, { name: 'Caption', exp: -2 },
]

/** The type ladder as data — reused by both the HTML and Markdown documents so
 *  the two can never describe different scales. */
export function typeLadder({ baseSize, ratio }) {
  return STEPS.map(s => ({
    ...s,
    px: Math.round(baseSize * Math.pow(ratio, s.exp) * 10) / 10,
  }))
}

/**
 * The complete style guide as one self-contained HTML document.
 *
 * `watermark` is the free-tier credit line. It is a visible footer on every
 * page rather than a hidden flag, because a watermark you cannot see is not a
 * watermark — and because the free tier is genuinely allowed to ship this, it
 * just carries attribution.
 */
export function buildStyleGuideHtml(design, { projectName = 'Design System', watermark = true, date = new Date() } = {}) {
  const d = readDesign(design)
  const ladder = typeLadder(d)
  const fontParam = [d.heading, d.body]
    .filter((v, i, a) => a.indexOf(v) === i)
    .map(f => `family=${encodeURIComponent(f).replace(/%20/g, '+')}:wght@400;700`)
    .join('&')

  const swatch = (hex, i) => {
    const { ink, ratio, label } = inkFor(hex)
    return `<figure class="sw">
      <div class="sw-chip" style="background:${hex};color:${ink}">
        <span class="sw-role">${i === 0 ? 'Primary' : `Colour ${i + 1}`}</span>
        <span class="sw-hex">${hex}</span>
      </div>
      <figcaption>
        <b>${hex}</b>
        <span>${label} text · ${ratio}:1 · ${grade(ratio)}</span>
      </figcaption>
    </figure>`
  }

  const typeRow = (s) => `<tr>
    <th scope="row">${esc(s.name)}</th>
    <td class="num">${s.px}px</td>
    <td class="num">${(s.px / 16).toFixed(3).replace(/\.?0+$/, '')}rem</td>
    <td class="spec" style="font-size:${Math.min(s.px, 56)}px;font-family:'${esc(s.exp >= 1 ? d.heading : d.body)}',system-ui,sans-serif;font-weight:${s.exp >= 1 ? d.headingWeight : d.bodyWeight};line-height:1.15">Ag</td>
  </tr>`

  const pairs = d.palette.slice(0, 4).map(hex => {
    const r = contrast(hex, '#FFFFFF')
    return `<tr><th scope="row"><span class="dot" style="background:${hex}"></span>${hex} on white</th><td class="num">${r}:1</td><td>${grade(r)}</td></tr>`
  }).join('')

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(projectName)} — Style Guide</title>
${fontParam ? `<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin><link href="https://fonts.googleapis.com/css2?${fontParam}&display=swap" rel="stylesheet">` : ''}
<style>
  :root{--ink:#101014;--mut:#5F5F69;--line:#E4E4E8;--page:#fff;--accent:${d.base || '#101014'}}
  *{box-sizing:border-box}
  html{-webkit-text-size-adjust:100%}
  body{margin:0;background:#F4F4F6;color:var(--ink);
    font-family:'${esc(d.body)}',system-ui,-apple-system,Segoe UI,sans-serif;
    font-size:${d.baseSize}px;line-height:${d.lineHeight}}
  h1,h2,h3{font-family:'${esc(d.heading)}',system-ui,sans-serif;font-weight:${d.headingWeight};line-height:1.1;margin:0 0 .4em}
  .page{position:relative;width:210mm;min-height:297mm;margin:16px auto;padding:22mm 20mm 26mm;
    background:var(--page);box-shadow:0 2px 18px rgba(16,16,20,.10)}
  .eyebrow{font-size:11px;letter-spacing:.16em;text-transform:uppercase;color:var(--mut);margin:0 0 10px}
  .cover{display:flex;flex-direction:column;justify-content:center}
  .cover h1{font-size:clamp(40px,7vw,68px)}
  .cover .rule{height:6px;width:120px;background:var(--accent);margin:18px 0 22px}
  .cover dl{display:grid;grid-template-columns:auto 1fr;gap:6px 18px;margin:28px 0 0;font-size:13px}
  .cover dt{color:var(--mut)}
  .cover dd{margin:0;font-weight:600}
  .lede{font-size:1.05em;color:var(--mut);max-width:62ch}
  .sw-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:14px;margin:18px 0 0}
  .sw{margin:0}
  .sw-chip{aspect-ratio:4/3;border-radius:10px;border:1px solid rgba(0,0,0,.08);
    display:flex;flex-direction:column;justify-content:space-between;padding:10px}
  .sw-role{font-size:10px;letter-spacing:.1em;text-transform:uppercase;opacity:.85}
  .sw-hex{font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:13px;font-weight:700}
  .sw figcaption{display:flex;flex-direction:column;gap:2px;margin-top:7px;font-size:11px;color:var(--mut)}
  .sw figcaption b{color:var(--ink);font-family:ui-monospace,Menlo,monospace}
  table{width:100%;border-collapse:collapse;margin-top:14px;font-size:13px}
  th,td{text-align:left;padding:9px 8px;border-bottom:1px solid var(--line);vertical-align:middle}
  thead th{font-size:10px;letter-spacing:.1em;text-transform:uppercase;color:var(--mut)}
  .num{font-family:ui-monospace,Menlo,monospace;white-space:nowrap}
  .spec{text-align:right;overflow:hidden;white-space:nowrap}
  .dot{display:inline-block;width:11px;height:11px;border-radius:50%;margin-right:8px;vertical-align:-1px;border:1px solid rgba(0,0,0,.1)}
  .note{margin-top:26px;padding:14px 16px;border-left:3px solid var(--accent);background:#FAFAFB;font-size:12.5px;color:var(--mut)}
  .foot{position:absolute;left:20mm;right:20mm;bottom:12mm;display:flex;justify-content:space-between;
    font-size:10px;color:var(--mut);border-top:1px solid var(--line);padding-top:8px}
  @media print{
    body{background:#fff}
    .page{margin:0;box-shadow:none;page-break-after:always}
    .page:last-child{page-break-after:auto}
    @page{size:A4;margin:0}
  }
</style>
</head>
<body>

<section class="page cover">
  <p class="eyebrow">Design System</p>
  <h1>${esc(projectName)}</h1>
  <div class="rule"></div>
  <p class="lede">The colour, typography and contrast decisions behind this interface — written down so they can be applied consistently, and checked.</p>
  <dl>
    <dt>Primary</dt><dd>${d.base || '—'}</dd>
    <dt>Colours</dt><dd>${d.palette.length}</dd>
    <dt>Headings</dt><dd>${esc(d.heading)}</dd>
    <dt>Body</dt><dd>${esc(d.body)}</dd>
    <dt>Scale</dt><dd>${d.baseSize}px · ${d.ratio}</dd>
    <dt>Generated</dt><dd>${date.toISOString().slice(0, 10)}</dd>
  </dl>
  <div class="foot"><span>${esc(projectName)} — Style Guide</span><span>${watermark ? 'Made with UIL4B' : ''}</span></div>
</section>

<section class="page">
  <p class="eyebrow">01 — Colour</p>
  <h2>The palette</h2>
  <p class="lede">Every colour is shown with the text colour that reads on it and the measured contrast ratio, so a choice made here is already checked.</p>
  ${d.palette.length ? `<div class="sw-grid">${d.palette.map(swatch).join('')}</div>` : '<p class="note">No colours saved yet — build a palette and export again.</p>'}
  <div class="note"><strong>How to read this.</strong> Ratios are measured against WCAG 2.2 §1.4.3. AA needs 4.5:1 for normal text and 3:1 for large; AAA needs 7:1. A swatch marked Fail is a fill, not a text colour.</div>
  <div class="foot"><span>Colour</span><span>${watermark ? 'Made with UIL4B' : '2'}</span></div>
</section>

<section class="page">
  <p class="eyebrow">02 — Typography</p>
  <h2>The scale</h2>
  <p class="lede">A ${d.ratio} ratio from a ${d.baseSize}px base. Headings set in ${esc(d.heading)}, body in ${esc(d.body)}.</p>
  <table>
    <thead><tr><th>Step</th><th>Size</th><th>rem</th><th style="text-align:right">Specimen</th></tr></thead>
    <tbody>${ladder.map(typeRow).join('')}</tbody>
  </table>
  <div class="note"><strong>Line height</strong> ${d.lineHeight} on body copy. Headings tighten to 1.1, which is what keeps a multi-line heading from reading as separate lines.</div>
  <div class="foot"><span>Typography</span><span>${watermark ? 'Made with UIL4B' : '3'}</span></div>
</section>

<section class="page">
  <p class="eyebrow">03 — Evidence</p>
  <h2>Contrast</h2>
  <p class="lede">The measurements behind the palette, so an accessibility question has an answer rather than an opinion.</p>
  <table>
    <thead><tr><th>Pair</th><th>Ratio</th><th>Grade</th></tr></thead>
    <tbody>${pairs || '<tr><td colspan="3">No colours saved yet.</td></tr>'}</tbody>
  </table>
  <div class="note">Measured with the WCAG 2.2 relative-luminance formula. These figures are reproducible: the same two hex values always give the same ratio.</div>
  <div class="foot"><span>Evidence</span><span>${watermark ? 'Made with UIL4B — uil4b.com' : '4'}</span></div>
</section>

</body>
</html>`
}

/**
 * The same guide as Markdown, for Notion and Google Docs — both of which import
 * Markdown cleanly and neither of which imports a styled HTML page without
 * mangling it. Deliberately the same content in the same order as the HTML, so
 * the two documents are the same guide in two formats rather than two guides.
 */
export function buildStyleGuideMarkdown(design, { projectName = 'Design System', watermark = true, date = new Date() } = {}) {
  const d = readDesign(design)
  const ladder = typeLadder(d)
  const lines = [
    `# ${projectName} — Style Guide`,
    '',
    `Generated ${date.toISOString().slice(0, 10)}`,
    '',
    '| | |',
    '|---|---|',
    `| Primary | ${d.base || '—'} |`,
    `| Colours | ${d.palette.length} |`,
    `| Headings | ${d.heading} |`,
    `| Body | ${d.body} |`,
    `| Scale | ${d.baseSize}px · ${d.ratio} |`,
    '',
    '## 01 — Colour',
    '',
    'Each colour with the text colour that reads on it and the measured contrast ratio.',
    '',
    '| Colour | Hex | Text | Ratio | Grade |',
    '|---|---|---|---|---|',
  ]
  d.palette.forEach((hex, i) => {
    const { ratio, label } = inkFor(hex)
    lines.push(`| ${i === 0 ? 'Primary' : `Colour ${i + 1}`} | \`${hex}\` | ${label} | ${ratio}:1 | ${grade(ratio)} |`)
  })
  if (!d.palette.length) lines.push('| — | — | — | — | — |')
  lines.push(
    '',
    '> Ratios follow WCAG 2.2 §1.4.3 — AA needs 4.5:1 for normal text and 3:1 for large; AAA needs 7:1.',
    '',
    '## 02 — Typography',
    '',
    `A ${d.ratio} ratio from a ${d.baseSize}px base. Headings in ${d.heading}, body in ${d.body}.`,
    '',
    '| Step | Size | rem |',
    '|---|---|---|',
    ...ladder.map(s => `| ${s.name} | ${s.px}px | ${(s.px / 16).toFixed(3).replace(/\.?0+$/, '')}rem |`),
    '',
    `Line height ${d.lineHeight} on body copy; headings tighten to 1.1.`,
    '',
    '## 03 — Evidence',
    '',
    '| Pair | Ratio | Grade |',
    '|---|---|---|',
    ...d.palette.slice(0, 4).map(hex => {
      const r = contrast(hex, '#FFFFFF')
      return `| \`${hex}\` on white | ${r}:1 | ${grade(r)} |`
    }),
  )
  if (watermark) lines.push('', '---', '', `Made with [UIL4B](${SITE_ORIGIN})`)
  return `${lines.join('\n')}\n`
}
