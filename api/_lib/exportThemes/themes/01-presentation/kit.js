// Brand kit PDFs for theme 01: the 2-page read-me, the palette sheet, the type specimen and the photography sheet.
// Pages are 1280 x 720 .pg slides (styles in css-bookkit.js, classes start k-). Every value comes from ctx.
import { A, fit } from './helpers.js';

const rgbOf = (ctx, hex) => { const [r, g, b] = ctx.C.hexToRgb(hex); return `rgb(${r}, ${g}, ${b})`; };
const onColour = (ctx, hex) => { const L = ctx.roles.light, pick = ctx.ratio(L.text, hex) >= ctx.ratio(L.surface, hex) ? L.text : L.surface; ctx.pair(pick, hex, { size: 13, what: `kit swatch ${hex}` }); return pick; };
const hair = (ctx, hex) => (hex.toLowerCase() === ctx.roles.light.surface.toLowerCase() ? ';box-shadow:inset 0 0 0 1px var(--hair)' : '');

// a kit page: running head, one idea, folio
function page(ctx, id, title, inner, { no, of, cls = '' }) {
  return `<section class="pg pg--k ${cls}" data-page="${id}"><div class="hd"><span>${A(title)}</span><span>${A(ctx.brand.name)} brand kit</span></div>${inner}<span class="fo">${no} of ${of}</span></section>`;
}

export function readMe(ctx) {
  const B = ctx.brand, slot = ctx.edition === 'slot', V = ctx.brand.version;
  const folders = [
    ['01 Logo', slot ? 'A labelled slot frame and a note on where the approved files go.' : `Each version as SVG and PDF, and PNG at 512, 1024 and 2048 px, transparent.`],
    ['02 Colour', 'The palette for Adobe (.ase), CSS and JSON, and a one-page swatch sheet.'],
    ['03 Type', 'A specimen sheet, and the faces with their links and licence.'],
    ['04 Icons', 'Sixteen interface icons (Lucide, ISC licence) drawn in the brand stroke.'],
    ['05 Imagery', B.imagery.shots.some((s) => s.photo) ? 'The photography direction and shot list, and the photos.' : 'The photography direction and shot list.'],
  ];
  const how = [
    ['Start with the logo.', slot ? 'Drop the approved files into the three logo folders, then follow the clear space and minimum size in the guidelines.' : 'Use the full-colour version on light grounds and the reversed version on dark ones. The guidelines show every ground.'],
    ['Take colour from the files.', 'Open the .ase in Adobe, paste the CSS, or read the JSON. Do not pick colours from a screenshot.'],
    ['Install the faces.', 'The links in fonts.md go to Google Fonts. All three faces are SIL OFL 1.1, free for commercial use.'],
  ];
  const p1 = `<div class="k-read"><div class="k-read__h"><h1 class="disp k-title">${A(B.name)} brand kit</h1><p class="lead">${A(B.description)} ${V ? A(ctx.versionLine) + '.' : ''}</p></div>
<div class="k-read__c"><div><h2 class="h3">What is here</h2><ul class="k-folders">${folders.map(([n, t]) => `<li><b>${A(n)}</b><span>${A(t)}</span></li>`).join('')}</ul></div>
<div><h2 class="h3">How to use it</h2><ol class="k-how">${how.map(([a, t], i) => `<li><span class="num">${i + 1}</span><p><b>${A(a)}</b> ${A(t)}</p></li>`).join('')}</ol></div></div></div>`;
  const strip = ctx.colours.slice().sort((x, y) => y.share - x.share).map((c) => `<li style="flex:${c.share}"><i style="background:${c.hex}${hair(ctx, c.hex)}"></i><p class="cap"><b>${A(c.name)}</b><span class="k-mono">${A(c.hex)}</span></p></li>`).join('');
  const f = B.fonts;
  const p2 = `<div class="k-brand"><div class="k-brand__top"><div class="k-brand__logo">${ctx.logo.html('colour', { width: 340, label: 'Your logo goes here' })}</div>
<ul class="k-lines">${[B.lines.primary, ...B.lines.others].map((l, i) => `<li class="${i ? '' : 'is-first'}">${A(l)}</li>`).join('')}</ul>
<div class="k-faces"><p><span class="k-aa disp">Aa</span><span class="cap"><b>${A(f.display.family)}</b>Display, ${f.display.weights.join(', ')}</span></p><p><span class="k-aa k-aa--body">Aa</span><span class="cap"><b>${A(f.body.family)}</b>Body, ${f.body.weights.join(', ')}</span></p></div></div>
<ul class="k-strip">${strip}</ul></div>`;
  return [page(ctx, 'read-me-1', 'Read me', p1, { no: 1, of: 2 }), page(ctx, 'read-me-2', 'The brand on one page', p2, { no: 2, of: 2 })];
}

export function sheets(ctx) {
  const B = ctx.brand, f = B.fonts, T = B.type, D = B.imagery.direction;
  // palette sheet: swatches in proportion of their share
  const sw = ctx.colours.map((c) => {
    const fg = onColour(ctx, c.hex), rgb = rgbOf(ctx, c.hex), ok = c.oklch || ctx.C.oklchString(c.hex);
    return `<li style="flex:${Math.max(c.share, 0.12)};background:${c.hex};color:${fg}${hair(ctx, c.hex)}"><p class="k-sw__n">${A(c.name)}</p><p class="k-sw__l">${A(c.lands)}</p><p class="k-sw__v"><span>${A(c.hex)}</span><span>${A(rgb)}</span><span>${A(ok)}</span></p></li>`;
  }).join('');
  const palette = page(ctx, 'palette', 'Colour', `<h1 class="disp k-title k-title--sm">${A(B.name)} palette</h1><ul class="k-swatches">${sw}</ul><p class="cap k-note">HEX, RGB and OKLCH for each colour. Ask your printer for a proof; no print values are given here.</p>`, { no: 1, of: 1 });
  // type specimen
  const alpha = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ abcdefghijklmnopqrstuvwxyz 0123456789';
  const face = (cls, fam, role, w, style) => `<div class="k-face"><p class="k-face__aa ${cls}" style="${style}">Aa</p><p class="k-face__n">${A(fam)}</p><p class="cap">${role}. Weights ${w.join(', ')}. SIL OFL 1.1.</p><p class="k-face__al" style="${style}">${alpha}</p></div>`;
  const typefaces = page(ctx, 'typefaces', 'Typefaces', `<div class="k-faces2">${face('disp', f.display.family, 'Display, for headlines', f.display.weights, `font-family:var(--display);font-stretch:${f.display.stretch || 100}%;font-weight:${f.display.weights[f.display.weights.length - 1]}`)}${face('', f.body.family, 'Body, for reading text, labels and captions', f.body.weights, 'font-family:var(--body);font-weight:500')}</div>
<div class="k-spec"><p class="disp k-spec__h">${A(T.sample.headline)}</p><p class="k-spec__p">${A(T.sample.paragraph)}</p></div><p class="cap k-note">${A(f.mono.family)} is for a hex, a token or a code string only. Links and licence notes are in fonts.md.</p>`, { no: 1, of: 1 });
  // photography: direction, then the shot list
  const rows = [['Subject', D.subject], ['Light', D.light], ['Crop', D.crop], ['Colour', D.colour], ['People', D.people]];
  const photo1 = page(ctx, 'photography-1', 'Photography', `<h1 class="disp k-title k-title--sm">Photography direction</h1><dl class="k-dir">${rows.map(([k, v]) => `<div><dt>${k}</dt><dd>${A(v)}</dd></div>`).join('')}</dl>`, { no: 1, of: 2 });
  const shots = B.imagery.shots.map((s) => `<figure class="k-shot">${ctx.photo(s.id, { cls: 'k-shot__f', pos: '50% 50%' })}<figcaption class="cap"><b>${A(s.caption || s.alt || s.id)}</b>${s.photo ? `Photo: ${A(s.credit)}.` : 'Art-directed slot.'}</figcaption></figure>`).join('');
  const photo2 = page(ctx, 'photography-2', 'Shot list', `<h1 class="disp k-title k-title--sm">Shot list</h1><div class="k-shots">${shots}</div>`, { no: 2, of: 2 });
  return { palette: [palette], typefaces: [typefaces], photography: [photo1, photo2] };
}
