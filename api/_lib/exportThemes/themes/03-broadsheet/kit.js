// Brand kit PDFs for theme 03 (Broadsheet): the 2-page read-me, the palette sheet, the type specimen and the photography sheets.
// Pages are 1280 x 720 .pg front pages (styles in css-bookkit.js, classes start k-). Every value comes from ctx.
import { A, edition } from './helpers.js';

const rgbOf = (ctx, hex) => { const [r, g, b] = ctx.C.hexToRgb(hex); return `rgb(${r}, ${g}, ${b})`; };
const hair = (ctx, hex) => (hex.toLowerCase() === ctx.roles.light.surface.toLowerCase() ? ';box-shadow:inset 0 0 0 1px var(--hair)' : '');

// an inner kit page: the running head over the action rule, then the body, folio in the head
function page(ctx, id, title, inner, { no, of }) {
  return `<section class="pg pg--std pg--k" data-page="${id}"><div class="hd"><span class="nm">${A(ctx.brand.name)}</span><span class="tt">${A(title)}</span><span class="fo">${no} of ${of}</span></div>${inner}</section>`;
}

export function readMe(ctx) {
  const B = ctx.brand, slot = ctx.edition === 'slot';
  const folders = [
    ['01 Logo', slot ? 'A labelled slot frame and a note on where the approved files go.' : 'Each version as SVG and PDF, and PNG at 512, 1024 and 2048 px, transparent.'],
    ['02 Colour', 'The palette for Adobe (.ase), CSS and JSON, and a one-page swatch sheet.'],
    ['03 Type', 'A specimen sheet, and the faces with their links and licence.'],
    ['04 Icons', 'Sixteen interface icons (Lucide, ISC licence) drawn in the brand stroke.'],
    ['05 Imagery', B.imagery.shots.some((s) => s.photo) ? 'The photography direction and shot list, and the photos.' : 'The photography direction and shot list.'],
  ];
  const how = [
    ['Start with the logo.', slot ? 'Drop the approved files into the logo folders, then follow the clear space and minimum size in the guidelines.' : 'Use the full-colour version on light grounds and the reversed version on dark ones. The guidelines show every ground.'],
    ['Take colour from the files.', 'Open the .ase in Adobe, paste the CSS, or read the JSON. Do not pick colours from a screenshot.'],
    ['Install the faces.', 'The links in fonts.md go to Google Fonts. All three faces are SIL OFL 1.1, free for commercial use.'],
  ];
  const p1 = `<section class="pg pg--cover pg--k" data-page="read-me-1">
<div class="ears"><span>Brand kit</span><span>${A(edition(ctx))}</span><span>${A(ctx.date)}</span><span>${A(B.city)}</span></div>
<div class="k-mast"><span class="k-name">${A(B.name)}</span><span class="k-sub">Read me</span></div><div class="rule2"></div>
<h1 class="k-head">${A(B.lines.primary).replace('. ', '.<br>')}</h1>
<div class="k-cols"><div class="k-l"><p class="lead">${A(B.description)}</p><ul class="k-folders">${folders.map(([n, t]) => `<li><b>${A(n)}</b><span>${A(t)}</span></li>`).join('')}</ul></div>
<div class="k-r"><h2 class="h3">How to use it</h2><ol class="k-how">${how.map(([a, t], i) => `<li><span class="num">${i + 1}</span><p><b>${A(a)}</b> ${A(t)}</p></li>`).join('')}</ol></div></div></section>`;
  const f = B.fonts;
  const strip = ctx.colours.slice().sort((x, y) => y.share - x.share).map((c) => `<li style="flex:${Math.max(c.share, 0.1)}"><i style="background:${c.hex}${hair(ctx, c.hex)}"></i><p class="cap"><b>${A(c.name)}</b><span class="k-mono">${A(c.hex)}</span></p></li>`).join('');
  const p2 = page(ctx, 'read-me-2', 'The brand on one page', `<div class="k-brand"><div class="k-top3"><div class="k-logo">${ctx.logo.html('colour', { width: 360, label: 'Your logo goes here' })}</div>
<ul class="k-lines">${[B.lines.primary, ...B.lines.others].map((l, i) => `<li class="${i ? '' : 'is-first'}">${A(l)}</li>`).join('')}</ul>
<div class="k-faces"><p><span class="k-aa disp">Aa</span><span class="cap"><b>${A(f.display.family)}</b>Display, ${f.display.weights.join(', ')}</span></p><p><span class="k-aa k-aa--body">Aa</span><span class="cap"><b>${A(f.body.family)}</b>Body, ${f.body.weights.join(', ')}</span></p></div></div>
<ul class="k-strip">${strip}</ul></div>`, { no: 2, of: 2 });
  return [p1, p2];
}

export function sheets(ctx) {
  const B = ctx.brand, f = B.fonts, T = B.type, D = B.imagery.direction;
  const row = (c) => `<tr><td><span class="k-chip" style="background:${c.hex}${hair(ctx, c.hex)}"></span></td><td class="k-n">${A(c.name)}</td><td class="k-v"><span>${A(c.hex)}</span><span>${A(rgbOf(ctx, c.hex))}</span><span>${A(c.oklch || ctx.C.oklchString(c.hex))}</span></td><td>${A(c.lands)}</td></tr>`;
  const palette = page(ctx, 'palette', 'Colour', `<table class="k-tbl"><thead><tr><th></th><th>Name</th><th>HEX, RGB, OKLCH</th><th>Where it lands</th></tr></thead><tbody>${ctx.colours.map(row).join('')}${ctx.tones.map(row).join('')}</tbody></table><p class="cap k-note">Ask your printer for a proof; no print values are given here.</p>`, { no: 1, of: 1 });
  const alpha = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ abcdefghijklmnopqrstuvwxyz 0123456789';
  const face = (cls, fam, role, w, style) => `<div class="k-face"><p class="k-face__aa ${cls}" style="${style}">Aa</p><p class="k-face__n">${A(fam)}</p><p class="cap">${role}. Weights ${w.join(', ')}. SIL OFL 1.1.</p><p class="k-face__al" style="${style}">${alpha}</p></div>`;
  const typefaces = page(ctx, 'typefaces', 'Typefaces', `<div class="k-faces2">${face('disp', f.display.family, 'Display, for headlines', f.display.weights, 'font-family:var(--display)')}${face('', f.body.family, 'Body, for reading text, labels and captions', f.body.weights, 'font-family:var(--body)')}</div>
<div class="k-spec"><p class="headline k-spec__h">${A(T.sample.headline)}</p><p class="txt">${A(T.sample.paragraph)}</p></div><p class="cap k-note">${A(f.mono.family)} is for a hex, a token or a code string only. Links and licence notes are in fonts.md.</p>`, { no: 1, of: 1 });
  const rows = [['Subject', D.subject], ['Light', D.light], ['Crop', D.crop], ['Colour', D.colour], ['People', D.people]];
  const photo1 = page(ctx, 'photography-1', 'Photography direction', `<dl class="k-dir">${rows.map(([k, v]) => `<div><dt>${k}</dt><dd>${A(v)}</dd></div>`).join('')}</dl>`, { no: 1, of: 2 });
  const shots = B.imagery.shots.map((s, i) => `<figure class="k-shot">${ctx.photo(s.id, { cls: 'k-shot__f', pos: '50% 50%' })}<figcaption class="cap"><b>${i + 1}. ${A(s.caption || s.alt || ctx.cap(s.id))}</b>${s.photo ? `Photo: ${A(s.credit)}.` : 'Art-directed slot.'}</figcaption></figure>`).join('');
  const photo2 = page(ctx, 'photography-2', 'Shot list', `<div class="k-shots">${shots}</div>`, { no: 2, of: 2 });
  return { palette: [palette], typefaces: [typefaces], photography: [photo1, photo2] };
}
