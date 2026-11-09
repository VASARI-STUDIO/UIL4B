// Brand kit PDFs for theme 04: the 2-page read-me, the palette sheet, the type specimen and the photography sheets.
// Pages are 1123 x 794 .pg sheets in the standards layout (running head, title column, work), styled in css-bookkit.js, classes start k-.
// Every value comes from ctx.
import { A, clauses } from './helpers.js';
import { drawing, drawKind, SHOT_KEY } from './book.js';
import { cssNum } from '../../engine/escape.js';

const rgbOf = (ctx, hex) => { const [r, g, b] = ctx.C.hexToRgb(hex); return `${r}, ${g}, ${b}`; };
const onColour = (ctx, hex) => { const L = ctx.roles.light, pick = ctx.ratio(L.text, hex) >= ctx.ratio(L.surface, hex) ? L.text : L.surface; ctx.pair(pick, hex, { size: 13, what: `kit swatch ${hex}` }); return pick; };
const hair = (ctx, hex) => (hex.toLowerCase() === ctx.roles.light.surface.toLowerCase() ? ';box-shadow:inset 0 0 0 1px var(--hair)' : '');

// a kit page: ruled running head with "n of N", a 250 px title column (title, lead, clauses) and the work to its right
function page(ctx, id, { section, title, lead, rules = [], work, no, of, cls = '' }) {
  const ref = `${no}`;
  return `<section class="pg pg--k ${cls}" data-page="${id}"><div class="hd"><span>${A(ctx.brand.name)} brand kit</span><span>${A(section)}</span><span class="fo num">${no} of ${of}</span></div>
<div class="k-body"><div class="k-side"><h2>${A(title)}</h2><p class="lead">${lead}</p>${rules.length ? clauses(ref, rules) : ''}</div><div class="k-work">${work}</div></div></section>`;
}

export function readMe(ctx) {
  const B = ctx.brand, slot = ctx.edition === 'slot', V = B.version;
  const folders = [
    ['Logo', slot ? 'A labelled slot frame and a note on where the approved files go.' : 'Each version as SVG and PDF, and PNG at 512, 1024 and 2048 px, transparent.'],
    ['Colour', 'The palette for Adobe (.ase), CSS and JSON, and a one-page swatch sheet.'],
    ['Type', 'A specimen sheet, and the faces with their links and licence.'],
    ['Icons', 'Sixteen interface icons (Lucide, ISC licence) drawn in the brand stroke.'],
    ['Imagery', B.imagery.shots.some((s) => s.photo) ? 'The photography direction and shot list, and the photos.' : 'The photography direction and shot list.'],
  ];
  const how = [
    `<b>Start with the logo.</b> ${slot ? 'Drop the approved files into the three logo folders, then follow the clear space and minimum size in the guidelines.' : 'Use the full-colour version on light grounds and the reversed version on dark ones. The guidelines show every ground.'}`,
    '<b>Take colour from the files.</b> Open the .ase in Adobe, paste the CSS, or read the JSON. Do not pick colours from a screenshot.',
    '<b>Install the faces.</b> The links in fonts.md go to Google Fonts. All three faces are SIL OFL 1.1, free for commercial use.',
  ];
  const w1 = `<h3 class="k-h3">What is here</h3><ul class="k-folders">${folders.map(([n, t], i) => `<li><span class="num k-no">1.${how.length + i + 1}</span><b class="disp">${A(n)}</b><span class="k-fd">${A(t)}</span></li>`).join('')}</ul>`;
  const p1 = page(ctx, 'read-me-1', { section: '1 Read me', title: `${B.name} brand kit`, lead: `${A(B.description)}${V ? ` ${A(ctx.versionLine)}.` : ''}`, rules: how, work: w1, no: 1, of: 2 });

  const f = B.fonts;
  const strip = ctx.colours.slice().sort((x, y) => y.share - x.share).map((c) => `<li style="flex:${Math.max(c.share, 0.12)} 1 0"><i style="background:${c.hex}${hair(ctx, c.hex)}"></i><p class="cap"><b>${A(c.name)}</b><span class="k-mono">${A(c.hex)}</span></p></li>`).join('');
  // the work is keyed like the manual: each block takes the next clause number after the title column's
  const ck = (n, inner, cls = '') => `<div class="k-kd ${cls}"><span class="num k-no">2.${B.personality.length + n}</span><div>${inner}</div></div>`;
  const w2 = `${ck(1, `<div class="k-tiles"><div class="k-tile k-tile--light">${ctx.logo.html('colour', { width: 260, label: 'Your logo goes here' })}</div><div class="k-tile k-tile--dark">${ctx.logo.html('reversed', { width: 260, label: 'Your logo goes here' })}</div></div>`)}
${ck(2, `<ul class="k-lines"><li class="disp">${A(B.lines.primary)}</li>${B.lines.others.map((l) => `<li class="disp">${A(l)}</li>`).join('')}</ul>`)}
${ck(3, `<div class="k-faces"><p><span class="k-aa disp" aria-hidden="true">Aa</span><span class="cap"><b>${A(f.display.family)}</b>Display, ${f.display.weights.join(', ')}</span></p><p><span class="k-aa k-aa--body" aria-hidden="true">Aa</span><span class="cap"><b>${A(f.body.family)}</b>Body, ${f.body.weights.join(', ')}</span></p></div>`, 'k-kd--faces')}
${ck(4, `<ul class="k-strip">${strip}</ul><p class="cap k-note">Widths show each colour's share of a page, with a minimum so every name can be read.</p>`)}`;
  const p2 = page(ctx, 'read-me-2', { section: '2 The brand on one page', title: 'The brand on one page', lead: `${A(B.product)}`, rules: B.personality.map((x) => `<b>${A(x.trait)}.</b> ${A(x.means)}`), work: w2, no: 2, of: 2 });
  return [p1, p2];
}

export function sheets(ctx) {
  const B = ctx.brand, f = B.fonts, T = B.type, D = B.imagery.direction;
  // palette sheet: bands stacked, height in proportion to share with a minimum
  const band = (c, i) => {
    const fg = onColour(ctx, c.hex), ok = c.oklch || ctx.C.oklchString(c.hex);
    return `<li style="flex:${Math.max(c.share * 100, 1)} 1 56px;background:${c.hex};color:${fg}${hair(ctx, c.hex)}"><span class="num k-sw__k">1.${B.tones.length + 2 + i}</span><div class="k-sw__t"><p class="k-sw__n disp">${A(c.name)}</p><p class="k-sw__l">${A(c.lands)}</p></div><p class="k-sw__v"><span>${A(c.hex)}</span><span>${A(rgbOf(ctx, c.hex))}</span><span>${A(ok)}</span></p></li>`;
  };
  const tone = (t) => `<li><i style="background:${t.hex};box-shadow:inset 0 0 0 1px var(--hair)"></i><p class="cap"><b>${A(t.name)}</b>${A(t.hex)}. ${A(t.lands)}</p></li>`;
  const palette = page(ctx, 'palette', { section: '1 Colour', title: `${B.name} palette`, lead: 'Five colours, each in proportion to its share of a page. Two tones carry the quiet text and the rules.', rules: [...B.tones.map((t) => `<b>${A(t.name)}</b> ${A(t.hex)}. ${A(t.lands)}`), 'HEX, RGB and OKLCH for each colour. Ask your printer for a proof; no print values are given here.'], work: `<ul class="k-bands">${ctx.colours.map(band).join('')}</ul>`, no: 1, of: 1 });

  // type specimen
  const alpha = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ<br>abcdefghijklmnopqrstuvwxyz<br>0123456789';
  const face = (cls, fam, role, w, style, n) => `<div class="k-face"><p class="k-face__aa ${cls}" style="${style}" aria-hidden="true">Aa</p><div><p class="k-face__n"><span class="num k-no">1.${n}</span> ${A(fam)}</p><p class="cap">${role}. Weights ${w.join(', ')}. SIL OFL 1.1.</p><p class="k-face__al" style="${style}">${alpha}</p></div></div>`;
  const dispW = cssNum(f.display.weights[f.display.weights.length - 1]);
  const typefaces = page(ctx, 'typefaces', {
    section: '1 Typefaces', title: 'Typefaces', lead: `${A(f.display.family)} sets the time and the line you read first. ${A(f.body.family)} carries everything after it.`,
    rules: [A(T.rules[0].do), A(T.rules[5].do), `${A(f.mono.family)} is for a hex, a token or a code string only. Links and licence notes are in fonts.md.`],
    work: `<div class="k-faces2">${face('disp', f.display.family, 'Display, for times and headlines', f.display.weights, `font-family:var(--display);font-weight:${dispW}`, 4)}${face('', f.body.family, 'Body, for reading text, labels and captions', f.body.weights, 'font-family:var(--body);font-weight:500', 5)}</div>
<div class="k-spec"><span class="num k-no">1.6</span><p class="disp k-spec__h">${A(T.sample.headline)}</p><p class="k-spec__p">${A(T.sample.paragraph)}</p></div>`, no: 1, of: 1,
  });

  // photography: direction, then the shot list
  const rows = [['Subject', D.subject], ['Light', D.light], ['Crop', D.crop], ['Colour', D.colour], ['People', D.people]];
  // the photo direction as clause sheets: the direction keyed 1.n, the shot list keyed 2.n, each shot drawn in the manual's line style until photographs are licensed
  const none = B.imagery.shots.some((s) => !s.photo), nR = B.imagery.rules.length;
  const noPhotos = none ? `<p class="k-nophoto">No photographs ship with this kit yet. These pages are the direction a photographer works to; the frames on the shot list are line drawings, not pictures.</p>` : '';
  const photo1 = page(ctx, 'photography-1', { section: '1 Photo direction', title: 'Photo direction', lead: 'Five calls decide whether a picture belongs. Check a photo against each before it is used.', rules: B.imagery.rules.map((r) => A(r.do)), work: `<dl class="k-dir">${rows.map(([k, v], i) => `<div><dt><span class="num">1.${nR + i + 1}</span> ${k}</dt><dd>${A(v)}</dd></div>`).join('')}</dl>${noPhotos}`, no: 1, of: 2 });
  const shots = B.imagery.shots.map((s, i) => {
    const key = `1.${Math.min(SHOT_KEY[s.id] || (i % nR) + 1, nR)}`;
    const f = s.photo ? ctx.photo(s.id, { cls: 'k-shot__f' }) : `<div class="k-shot__f is-draw" role="img" aria-label="Line drawing: ${A(s.slot)}">${drawing(drawKind(s, i), `2.${nR + i + 1}`)}</div>`;
    return `<figure class="k-shot">${f}<figcaption class="cap"><b>${A(ctx.cap(s.id))}</b>${s.photo ? `Photo: ${A(s.credit)}.` : `Illustration. Must meet ${key}.`}</figcaption></figure>`;
  }).join('');
  const photo2 = page(ctx, 'photography-2', { section: '2 Shot list', title: 'Shot list', lead: `Six frames cover the crossing.${none ? ' Until photographs are licensed, each is drawn.' : ''} Never do any of these:`, rules: B.imagery.rules.map((r) => A(r.dont)), work: `<div class="k-shots">${shots}</div>`, no: 2, of: 2 });
  return { palette: [palette], typefaces: [typefaces], photography: [photo1, photo2] };
}
