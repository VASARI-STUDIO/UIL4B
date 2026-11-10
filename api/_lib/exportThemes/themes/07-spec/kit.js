// Brand kit PDFs for theme 07 (Specification): the 2-page read-me, palette sheet, type specimen and photography sheet, 794 x 1123.
// Laid out as a standards document: numbered clauses (1.1, 2.3) down a left column, hairline rules, one idea per page.
// Styles are in css-bookkit.js (cssBookKit, wired through cssBook in css-book.js, classes k-). Every value comes from ctx.
import { A, mono } from './helpers.js';
import { cssNum } from '../../engine/escape.js';

const rgbOf = (ctx, hex) => { const [r, g, b] = ctx.C.hexToRgb(hex); return `rgb(${r}, ${g}, ${b})`; };
const onColour = (ctx, hex) => { const L = ctx.roles.light, pick = ctx.ratio(L.text, hex) >= ctx.ratio(L.surface, hex) ? L.text : L.surface; ctx.pair(pick, hex, { size: 13, what: `kit swatch ${hex}` }); return pick; };
const hair = (ctx, hex) => (hex.toLowerCase() === ctx.roles.light.surface.toLowerCase() ? ';box-shadow:inset 0 0 0 1px var(--rule)' : '');
// a numbered clause: number, label, then the content
const cl = (n, label, inner, cls = '') => `<li class="k-cl ${cls}"><span class="k-cl__n num">${n}</span><span class="k-cl__l">${A(label)}</span><div class="k-cl__c">${inner}</div></li>`;

// a kit page: running head with the title and the folio, then one subject
function page(ctx, id, title, inner, { no, of, note = '' }) {
  const head = `<div class="hd"><span>${A(title)}</span><span>${A(ctx.brand.name)} brand kit <span class="num k-fo">${no} of ${of}</span></span></div>`;
  return `<section class="pg pg--std pg--k" data-page="${id}">${head}${inner}${note ? `<p class="foot">${note}</p>` : ''}</section>`;
}

export function readMe(ctx) {
  const B = ctx.brand, slot = ctx.edition === 'slot', f = B.fonts;
  const folders = [
    ['Logo', slot ? 'A labelled slot frame and a note on where the approved files go.' : 'Each version as SVG and PDF, and PNG at 512, 1024 and 2048 px, transparent.'],
    ['Colour', 'The palette for Adobe (.ase), CSS and JSON, and a one-page swatch sheet.'],
    ['Type', 'A specimen sheet, and the faces with their links and licence.'],
    ['Icons', 'Sixteen interface icons (Lucide, ISC licence) drawn in the brand stroke.'],
    ['Imagery', B.imagery.shots.some((s) => s.photo) ? 'The photography direction and shot list, and the photos.' : 'The photography direction and shot list.'],
  ];
  const how = [
    ['Start with the logo.', slot ? 'Drop the approved files into the logo folders, then follow the clear space and minimum size in the guidelines.' : 'Use the full-colour version on light grounds and the reversed version on dark ones. The guidelines show every ground.'],
    ['Take colour from the files.', 'Open the .ase in Adobe, paste the CSS, or read the JSON. Do not pick colours from a screenshot.'],
    ['Install the faces.', 'The links in fonts.md go to Google Fonts. All faces are SIL OFL 1.1, free for commercial use.'],
  ];
  const p1 = `<h1 class="t k-title">${A(B.name)} brand kit</h1><p class="lede">${A(B.description)}${B.version ? ' ' + A(ctx.versionLine) + '.' : ''}</p>
<h2 class="k-h"><span class="num">1</span>What is here</h2><ul class="k-cls">${folders.map(([n, t], i) => cl(`1.${i + 1}`, n, `<p>${A(t)}</p>`)).join('')}</ul>
<h2 class="k-h"><span class="num">2</span>How to use it</h2><ul class="k-cls">${how.map(([a, t], i) => cl(`2.${i + 1}`, a, `<p>${A(t)}</p>`)).join('')}</ul>
<p class="foot">Questions about these files: ${A(B.contact.owner)}, ${A(B.contact.email)}.</p>`;
  const list = ctx.colours.slice().sort((x, y) => y.share - x.share);
  const bar = list.map((c) => `<li style="flex:${Math.max(c.share, 0.04)};background:${c.hex}${hair(ctx, c.hex)}"></li>`).join('');
  const rows = list.map((c, i) => `<tr><td class="num">3.${i + 1}</td><td><i class="k-chip" style="background:${c.hex}${hair(ctx, c.hex)}"></i>${A(c.name)}</td><td>${A(c.lands)}</td><td class="r">${mono(c.hex)}</td></tr>`).join('');
  const p2 = `<div class="k-logo">${ctx.logo.html('colour', { width: 340, label: 'Your logo goes here' })}</div>
<ul class="k-lines">${[B.lines.primary, ...B.lines.others].map((l, i) => `<li class="${i ? '' : 'is-first'}">${A(l)}</li>`).join('')}</ul>
<h2 class="k-h"><span class="num">3</span>Colour</h2><ul class="k-bar">${bar}</ul>
<table class="st k-tab"><colgroup><col style="width:44px"><col style="width:150px"><col><col style="width:96px"></colgroup><tbody>${rows}</tbody></table>
<h2 class="k-h"><span class="num">4</span>Type</h2><ul class="k-cls">${cl('4.1', f.display.family, `<p>Display, ${f.display.weights.join(', ')}. For headlines.</p><p class="k-samp k-samp--d">${A(B.lines.primary)}</p>`)}${cl('4.2', f.body.family, `<p>Body, ${f.body.weights.join(', ')}. For reading text, labels and captions.</p><p class="k-samp">${A(B.type.sample.paragraph)}</p>`)}</ul>`;
  return [page(ctx, 'read-me-1', 'Read me', p1, { no: 1, of: 2 }), page(ctx, 'read-me-2', 'The brand on one page', p2, { no: 2, of: 2 })];
}

export function sheets(ctx) {
  const B = ctx.brand, f = B.fonts, T = B.type, D = B.imagery.direction;
  const bands = ctx.colours.map((c, i) => {
    const fg = onColour(ctx, c.hex), rgb = rgbOf(ctx, c.hex), ok = c.oklch || ctx.C.oklchString(c.hex);
    return `<li class="k-band" style="flex:${Math.max(Math.sqrt(c.share), 0.3).toFixed(2)};background:${c.hex};color:${fg}${hair(ctx, c.hex)}"><span class="k-band__n num">1.${i + 1}</span><div><h2>${A(c.name)}</h2><p>${A(c.lands)}</p></div><p class="k-mono">${A(c.hex)}<br>${A(rgb)}<br>${A(ok)}</p></li>`;
  }).join('');
  const palette = page(ctx, 'palette', 'Colour', `<h1 class="t k-title">${A(B.name)} palette</h1><ul class="k-bands">${bands}</ul>`, { no: 1, of: 1, note: 'HEX, RGB and OKLCH for each colour. Ask your printer for a proof; no print values are given here.' });
  const alpha = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ abcdefghijklmnopqrstuvwxyz 0123456789';
  const face = (n, cls, fam, note, w, style) => cl(n, fam, `<p class="k-note">${A(note)} Weights ${w.join(', ')}. SIL OFL 1.1.</p><p class="k-face__aa ${cls}" style="${style}">Aa</p><p class="k-face__al" style="${style}">${alpha}</p>`, 'k-cl--face');
  const scale = T.scale.slice(1, 6).map((s, i) => `<tr><td class="num">2.${i + 1}</td><td class="num">${s.size} px, ${s.weight}</td><td><span class="k-spl" style="font-family:var(--${s.face === 'display' ? 'display' : 'body'});font-weight:${s.weight};font-size:${s.size}px;line-height:1.1">${A(s.face === 'display' ? (s.size >= 60 ? B.name.split(' ')[0] : B.lines.primary) : T.sample.caption)}</span></td></tr>`).join('');
  const typefaces = page(ctx, 'typefaces', 'Typefaces', `<h1 class="t k-title">Typefaces</h1><h2 class="k-h"><span class="num">1</span>The faces</h2><ul class="k-cls">${face('1.1', 'disp', f.display.family, 'Display, 24 px and over.', f.display.weights, `font-family:var(--display);font-weight:${cssNum(f.display.weights[0])}`)}${face('1.2', '', f.body.family, 'Body, for reading text.', f.body.weights, 'font-family:var(--body);font-weight:500')}</ul>
<h2 class="k-h"><span class="num">2</span>The scale</h2><table class="st k-tab k-scale"><colgroup><col style="width:44px"><col style="width:120px"><col></colgroup><tbody>${scale}</tbody></table>`, { no: 1, of: 1, note: `${mono(f.mono.family)} is for a hex, a token or a code string only. Links and licence notes are in fonts.md.` });
  const dir = [['Subject', D.subject], ['Light', D.light], ['Crop', D.crop], ['Colour', D.colour], ['People', D.people]];
  const photo1 = page(ctx, 'photography-1', 'Photography', `<h1 class="t k-title">Photography direction</h1><h2 class="k-h"><span class="num">1</span>Direction</h2><ul class="k-cls">${dir.map(([k, v], i) => cl(`1.${i + 1}`, k, `<p>${A(v)}</p>`)).join('')}</ul>
<h2 class="k-h"><span class="num">2</span>Do and don't</h2><ul class="k-cls">${B.imagery.rules.map((r, i) => cl(`2.${i + 1}`, `Rule ${i + 1}`, `<div class="k-dd"><p><b>Do</b>${A(r.do)}</p><p><b>Don't</b>${A(r.dont)}</p></div>`)).join('')}</ul>`, { no: 1, of: 2 });
  const shots = B.imagery.shots.map((s, i) => `<figure class="k-shot">${ctx.photo(s.id, { cls: 'k-shot__f', pos: '50% 50%' })}<figcaption class="cap"><b><span class="num">${i + 1}</span> ${A(s.caption || s.alt || s.id.charAt(0).toUpperCase() + s.id.slice(1))}</b>${s.photo ? `Photo: ${A(s.credit)}.` : 'Art-directed slot.'}</figcaption></figure>`).join('');
  const photo2 = page(ctx, 'photography-2', 'Shot list', `<h1 class="t k-title">Shot list</h1><div class="k-shots">${shots}</div>`, { no: 2, of: 2 });
  return { palette: [palette], typefaces: [typefaces], photography: [photo1, photo2] };
}
