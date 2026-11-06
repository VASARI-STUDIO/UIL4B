// Brand kit PDFs for theme 08, Riso: the 2-page read me, the palette sheet, the type specimen and the photography sheets.
// The same document as the guidelines: open pages of the paper (Wall) with the gate's running head, and every figure a printed sheet
// with a registration cross at each corner and its job line (the drums it really prints, from the hexes used, and the paper).
// Composites and one- or two-drum sheets only (separations stay on the cover, logo and type pages). Styles are in css-bookkit.js
// (classes start rk-); the gate's classes (r-) are used as they are. Every value comes from ctx.
import { A, fit } from './helpers.js';
import { corners, drums, drumNo, paper, byRole, inkOn, readInk, Word, isSurface, pc } from './guidelines-r.js';
import { cssNum } from '../../engine/escape.js';

const hx = (h) => String(h).toLowerCase();
const drumOf = (ctx, hex) => drums(ctx).find((c) => hx(c.hex) === hx(hex));
const toneOf = (ctx, hex) => ctx.tones.find((t) => hx(t.hex) === hx(hex));

// the job line: each drum the sheet prints, in drum order, named in its own ink where that reads, then what it carries; whatever
// is in the paper's colour is the paper showing through; a tone that is no drum is named as it is
function job(ctx, uses, extra = '') {
  const D = drums(ctx), p = paper(ctx), by = new Map(), through = [], other = [];
  for (const [hex, what] of uses) {
    const c = drumOf(ctx, hex), t = toneOf(ctx, hex);
    if (c) { if (!by.has(c)) by.set(c, []); if (!by.get(c).includes(what)) by.get(c).push(what); } else if (isSurface(ctx, hex) || hx(hex) === hx(p.hex)) through.push(what); else if (t) other.push([t.name, what]);
  }
  const used = D.filter((c) => by.has(c)), n = used.length;
  const parts = used.map((c) => `<span class="rk-jd"><i class="rk-sw" style="background:${c.hex}"></i><b style="color:${readInk(ctx, c.hex)}">Drum ${drumNo(ctx, c)} ${A(c.name)}</b>: ${by.get(c).join(', ')}.</span>`);
  const show = through.length ? ` <span>The paper shows through for ${through.join(', ')}.</span>` : '';
  const rest = other.map(([nm, what]) => ` <span>${A(nm)}: ${what}.</span>`).join('');
  return `<p class="rk-job"><span class="rk-jn">${Word(n)} drum${n === 1 ? '' : 's'} on ${A(p.name)}.</span> ${parts.join(' ')}${show}${rest}${extra}</p>`;
}

// a kit page: the gate's running head (the kit's name left, "n of N" right), then the page's own flow between the margins
function page(ctx, id, { no, of, inner, cls = '' }) {
  return `<section class="pg r-pg rk-pg ${cls}" data-page="${id}"><div class="r-hd"><span>${A(ctx.brand.name)}, brand kit</span><span class="num">${no} of ${of}</span></div><div class="rk-in">${inner}</div></section>`;
}
// a printed sheet: the paper edged by a hairline, a cross at each corner in the ink that shows on it
const sheet = (ctx, inner, cls = '', col = ctx.roles.light.text) => `<div class="r-sheet rk-sh ${cls}">${corners(col)}${inner}</div>`;
const fact = (label, value, cls = '') => `<div class="rk-f ${cls}"><p class="rk-f__l">${label}</p><p class="rk-f__v">${value}</p></div>`;

export function readMe(ctx) {
  const B = ctx.brand, slot = ctx.edition === 'slot', f = B.fonts, L = ctx.roles.light, act = byRole(ctx, 'action') || drums(ctx)[0];
  const folders = [
    ['Logo', slot ? 'A labelled slot frame and a note on where the approved files go.' : 'Each version as SVG and PDF, and PNG at 512, 1024 and 2048 px, transparent.'],
    ['Colour', 'The palette for Adobe (.ase), CSS and JSON, and a one-page swatch sheet.'],
    ['Type', 'A specimen sheet, and the faces with their links and licence.'],
    ['Icons', 'Sixteen interface icons (Lucide, ISC licence) drawn in the brand stroke.'],
    ['Imagery', B.imagery.shots.some((s) => s.photo) ? 'The photography direction and shot list, and the photos.' : 'The photography direction and shot list.'],
  ];
  const how = [
    ['Start with the logo.', slot ? 'Drop the approved files into the three logo folders, then follow the clear space and minimum size in the guidelines.' : 'Use the full-colour version on light grounds and the reversed version on dark ones. The guidelines show every ground.'],
    ['Take colour from the files.', 'Open the .ase in Adobe, paste the CSS, or read the JSON. Do not pick colours from a screenshot.'],
    ['Install the faces.', 'The links in fonts.md go to Google Fonts. All three faces are SIL OFL 1.1, free for commercial use.'],
  ];
  // page 1: the kit's name large; the docket (what is here) as a printed sheet with its job line; the three steps across the foot
  const numInk = readInk(ctx, act.hex);
  const docket = sheet(ctx, `<h2 class="r-tg__h">What is here</h2><ol class="rk-dk">${folders.map(([n, t], i) => `<li><span class="rk-dk__n num" style="color:${numInk}">0${i + 1}</span><p class="rk-dk__t">${A(n)}</p><p class="rk-dk__d">${A(t)}</p></li>`).join('')}</ol>`, 'rk-sh--dk');
  const p1 = page(ctx, 'read-me-1', {
    no: 1, of: 2, cls: 'rk-pg--r1',
    inner: `<div class="rk-top"><h1 class="rk-h1">${A(B.name)} brand kit</h1><p class="r-lead">${A(B.description)}</p>`
      + `<div class="rk-fs">${fact('Version', A(ctx.versionLine))}${fact('Contact', `${A(B.contact.owner)}, ${A(B.contact.email)}`)}</div></div>`
      + `<figure class="rk-fig rk-fig--dk">${docket}<figcaption>${job(ctx, [[numInk, 'the folder numbers'], [L.text, 'the folder names'], [L.quiet, 'what each holds']])}</figcaption></figure>`
      + `<div class="rk-how"><h2 class="r-tg__h">How to use it</h2><ol>${how.map(([a, t], i) => `<li><span class="rk-how__n num">${i + 1}</span><p class="rk-how__a">${A(a)}</p><p class="rk-how__t">${A(t)}</p></li>`).join('')}</ol></div>`,
  });

  // page 2: the brand on one composite sheet (the logo and its lines) beside the voice, the product and the faces; the colours
  // across the foot, each as wide as its share of a page
  const sorted = ctx.colours.slice().sort((x, y) => y.share - x.share);
  const strip = `<div class="rk-strip">${sorted.map((c) => `<i class="${isSurface(ctx, c.hex) ? 'r-hair' : ''}" style="flex:${Math.max(c.share, 0.04)} 1 0;background:${c.hex}"></i>`).join('')}</div>`
    + `<ul class="rk-names">${sorted.map((c) => `<li><i class="rk-sw ${isSurface(ctx, c.hex) ? 'r-hair' : ''}" style="background:${c.hex}"></i><span class="rk-names__n">${A(c.name)}</span> <span class="r-mono">${A(c.hex)}</span></li>`).join('')}</ul>`;
  const logo = `<div class="rk-logo">${ctx.logo.html('colour', { width: fit(ctx, 'colour', 360, 132), label: 'Your logo goes here' })}</div>`;
  const lines = `<div class="rk-one__w"><p class="disp rk-line">${A(B.lines.primary)}</p><ul class="rk-lines">${B.lines.others.map((l) => `<li class="disp">${A(l)}</li>`).join('')}</ul></div>`;
  const faces = `<div class="rk-faces"><p class="rk-face"><span class="rk-aa disp" aria-hidden="true">Aa</span><span class="rk-face__n">${A(f.display.family)}</span><span class="rk-face__d">Display, ${f.display.weights.join(', ')}, roman and italic</span></p>`
    + `<p class="rk-face"><span class="rk-aa rk-aa--body" aria-hidden="true">Aa</span><span class="rk-face__n">${A(f.body.family)}</span><span class="rk-face__d">Body, ${f.body.weights.join(', ')}</span></p></div>`;
  const side = `<div class="rk-side">${fact('Voice', `<span class="rk-traits">${B.personality.map((x) => `<span>${A(x.trait)}.</span>`).join(' ')}</span>`)}${fact('Product', A(B.product))}${faces}</div>`;
  const p2 = page(ctx, 'read-me-2', {
    no: 2, of: 2, cls: 'rk-pg--r2',
    inner: `<div class="rk-top"><h1 class="r-h1">On one page</h1></div>`
      + `<div class="rk-r2">${`<figure class="rk-fig rk-fig--one">${sheet(ctx, `${logo}${lines}`, 'rk-sh--one')}</figure>`}${side}</div>`
      + `<div class="rk-foot"><h2 class="r-tg__h">Colour</h2>${strip}<p class="rk-note">Widths show each colour's share of a page, with a minimum so every name can be read.</p></div>`,
  });
  return [p1, p2];
}

export function sheets(ctx) {
  const B = ctx.brand, f = B.fonts, T = B.type, D = B.imagery.direction, L = ctx.roles.light;
  const Dr = drums(ctx), p = paper(ctx);

  // palette: one printed sheet laid out as the ink order. A colour bar down the sheet's edge, each colour exactly as tall as its
  // share; beside it a band of solid per drum in drum order, its name, use and values printed out of the solid in whichever of the
  // text and ground colours reads; the rest of the sheet is the paper, unprinted, with its share large. The tones close the page.
  const ok = (c) => c.oklch || ctx.C.oklchString(c.hex);
  const rgb = (c) => { if (c.rgb) return c.rgb; const [r, g, b] = ctx.C.hexToRgb(c.hex); return `rgb(${r}, ${g}, ${b})`; };
  const vals = (c) => `<dl class="rk-vals">${[['HEX', c.hex], ['RGB', rgb(c)], ['OKLCH', ok(c)]].map(([k, v]) => `<div><dt>${k}</dt><dd class="r-mono">${A(v)}</dd></div>`).join('')}</dl>`;
  const order = [...Dr, p];
  const bar = `<div class="rk-bar" aria-hidden="true">${order.map((c) => `<i class="${isSurface(ctx, c.hex) ? 'r-hair' : ''}" style="flex:${c.share} 1 0;background:${c.hex}"></i>`).join('')}</div>`;
  const band = (c) => {
    const fg = inkOn(ctx, c.hex);
    ctx.pair(fg, c.hex, { size: 12, what: `kit palette band ${c.hex}` });
    return `<li class="rk-band" style="background:${c.hex};color:${fg}"><div><p class="rk-band__d">Drum ${drumNo(ctx, c)}</p><h2 class="rk-band__n">${A(c.name)}</h2><p class="rk-band__l">${A(ctx.cap(c.role))}. ${A(c.lands)}</p></div>`
      + `<div class="rk-band__r"><p class="rk-band__s num">${pc(c)}%</p>${vals(c)}</div></li>`;
  };
  const paperPart = `<div class="rk-pp"><div><p class="r-ps__d">Paper</p><h2 class="rk-band__n">${A(p.name)}</h2><p class="rk-band__l rk-q">${A(ctx.cap(p.role))}. It takes no ink. ${A(p.lands)}</p>${vals(p)}</div><p class="rk-pp__s num">${pc(p)}%</p></div>`;
  const colourSheet = sheet(ctx, `${bar}<div class="rk-ink"><ol class="rk-bands">${Dr.map(band).join('')}</ol>${paperPart}</div>`, 'rk-sh--pal');
  const tones = `<ul class="rk-tones">${B.tones.map((t) => `<li><p class="rk-tones__n"><i class="rk-sw ${isSurface(ctx, t.hex) ? 'r-hair' : ''}" style="background:${t.hex}"></i>${A(t.name)} <span class="r-mono">${A(t.hex)}</span></p><p class="rk-tones__l">${A(t.lands)}</p></li>`).join('')}</ul>`;
  const palUses = [...Dr.map((c) => [c.hex, `the ${A(c.name)} band`]), [L.text, 'the paper\'s words']];
  const palette = page(ctx, 'palette', {
    no: 1, of: 1, cls: 'rk-pg--pal',
    inner: `<div class="rk-top"><h1 class="r-h1">Colour</h1><p class="r-lead">${Word(ctx.colours.length)} colours, each in proportion to its share of a page. Two tones carry the quiet text and the panels.</p></div>`
      + `<figure class="rk-fig rk-fig--pal">${colourSheet}<figcaption>${job(ctx, palUses)}</figcaption></figure>`
      + `<div class="rk-pal-foot"><h2 class="r-tg__h">Text tones</h2>${tones}<p class="rk-note">HEX, RGB and OKLCH for each colour. Ask your printer for a proof; no print values are given here.</p></div>`,
  });

  // typefaces: the display face very large, roman beside italic, its alphabet under it; then the body face beside the sample
  // pulled as a one-drum test print; the mono rule at the foot
  const alpha = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ<br>abcdefghijklmnopqrstuvwxyz<br>0123456789';
  const dw = cssNum(f.display.weights[f.display.weights.length - 1]);
  const dispFace = `<div class="rk-dface"><p class="rk-dface__aa disp" aria-hidden="true">Aa <span class="it">Aa</span></p><div class="rk-dface__m"><h2 class="rk-face__nn">${A(f.display.family)}</h2><p class="rk-face__dd">Display, for headlines and artist names. Weight ${f.display.weights.join(', ')}, roman and italic. SIL OFL 1.1.</p><p class="rk-al disp" style="font-weight:${dw}">${alpha}</p></div></div>`;
  const bodyFace = `<div class="rk-bface"><p class="rk-bface__aa" aria-hidden="true">Aa</p><h2 class="rk-face__nn">${A(f.body.family)}</h2><p class="rk-face__dd">Body, for reading text, labels and captions. Weights ${f.body.weights.join(', ')}. SIL OFL 1.1.</p><p class="rk-al rk-al--body">${alpha}</p>`
    + `<p class="rk-mono-rule">${A(f.mono.family)} is for a hex, a token or a code string only. Links and licence notes are in <span class="r-mono">fonts.md</span>.</p></div>`;
  const spec = sheet(ctx, `<p class="disp rk-spec__h">${A(T.sample.headline)}</p><p class="rk-spec__p">${A(T.sample.paragraph)}</p><p class="rk-spec__c">${A(T.sample.caption)}</p>`, 'rk-sh--spec');
  const typefaces = page(ctx, 'typefaces', {
    no: 1, of: 1, cls: 'rk-pg--type',
    inner: `<div class="rk-top"><h1 class="r-h1">Typefaces</h1><p class="r-lead">${A(T.rules[0].do)}</p></div>${dispFace}`
      + `<div class="rk-trow">${bodyFace}<figure class="rk-fig rk-fig--spec">${spec}<figcaption>${job(ctx, [[L.text, 'the headline and the paragraph'], [L.quiet, 'the caption']])}</figcaption></figure></div>`,
  });

  // photography 1: the first call (the subject) large, the other four as two columns of text; then do and do not as a two-drum
  // sheet, the good pull in Ink beside the waste in the action ink
  const calls = [['Subject', D.subject], ['Light', D.light], ['Crop', D.crop], ['Colour', D.colour], ['People', D.people]];
  const act = byRole(ctx, 'action') || Dr[0], notInk = readInk(ctx, act.hex);
  const dd = sheet(ctx, `<div class="rk-dd__h"><h2 class="r-tg__h">Do</h2><h2 class="r-tg__h" style="color:${notInk}">Do not</h2></div><ul class="rk-dd">${B.imagery.rules.map((r) => `<li><p>${A(r.do)}</p><p style="color:${notInk}">${A(r.dont)}</p></li>`).join('')}</ul>`, 'rk-sh--dd');
  const photo1 = page(ctx, 'photography-1', {
    no: 1, of: 2, cls: 'rk-pg--ph1',
    inner: `<div class="rk-top"><h1 class="r-h1">Photography direction</h1><p class="r-lead">Five calls decide whether a picture belongs. Check a photo against each before it is used.</p></div>`
      + `<div class="rk-call rk-call--lead"><p class="rk-f__l">${calls[0][0]}</p><p class="disp rk-call__big">${A(calls[0][1])}</p></div>`
      + `<div class="rk-calls">${calls.slice(1).map(([k, v]) => `<div class="rk-call"><p class="rk-f__l">${k}</p><p class="rk-call__t">${A(v)}</p></div>`).join('')}</div>`
      + `<figure class="rk-fig rk-fig--dd">${dd}<figcaption>${job(ctx, [[L.text, 'what to do'], [notInk, 'what not to do']])}</figcaption></figure>`,
  });

  // photography 2: the shot list as a print plan, the frames imposed on one press sheet (the first large, then two, then three, so
  // the sheet is not a grid of equal tiles); each slot marked with the drum or drums that carry it. A slot the accent's own use names
  // (the brand's words, read with ctx.real) sits on that drum's plate; every caption is in the text ink. No drum prints over a photo.
  const S = B.imagery.shots, ink = L.text, inkC = drumOf(ctx, ink), acc = byRole(ctx, 'accent');
  const re = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const plated = (s) => !!(acc && acc.lands && new RegExp(`\\b${re(s.id)}s?\\b`, 'i').test(ctx.real(acc.lands)));
  const mark = (c) => `<span class="rk-dm"><i class="rk-sw" style="background:${c.hex}"></i><span class="num">${drumNo(ctx, c)}</span></span>`;
  const rowsOf = [[0], [1, 2], [3, 4, 5]];
  const shot = (s, i) => {
    const pl = plated(s), ds = [inkC, pl ? acc : null].filter(Boolean).sort((a, b) => drumNo(ctx, a) - drumNo(ctx, b));
    return `<li class="rk-shot"><div class="rk-shot__f${pl ? ' rk-shot__f--pl' : ''}"${pl ? ` style="background:${acc.hex}"` : ''}>${ctx.photo(s.id, { cls: 'rk-shot__ph' })}</div>`
      + `<p class="rk-shot__c"><span class="rk-shot__n num">${i + 1}</span><span class="rk-shot__t">${A(ctx.cap(s.id))}. <span class="rk-q">${s.photo ? `Photo: ${A(s.credit)}.` : 'Art-directed slot.'}</span></span><span class="rk-shot__d" aria-label="Drums ${ds.map((c) => drumNo(ctx, c)).join(' and ')}">${ds.map(mark).join('')}</span></p></li>`;
  };
  // the impositions: shots past the first six run on in rows of three
  const rows = []; let at = 0;
  for (const r of rowsOf) { if (at >= S.length) break; rows.push(S.slice(at, at + r.length)); at += r.length; }
  while (at < S.length) { rows.push(S.slice(at, at + 3)); at += 3; }
  let k = 0;
  const imposed = rows.map((row, r) => `<ol class="rk-imp rk-imp--${Math.min(r, 2)}" style="grid-template-columns:${row.length === 1 ? 'minmax(0,1fr)' : row.length === 2 ? 'minmax(0,3fr) minmax(0,2fr)' : 'minmax(0,2fr) minmax(0,3fr) minmax(0,2fr)'}">${row.map((s) => shot(s, k++)).join('')}</ol>`).join('');
  const shotUses = [[ink, 'every number and caption']];
  if (acc && S.some(plated)) shotUses.push([acc.hex, `the plate under shot ${S.map((s, i) => (plated(s) ? i + 1 : 0)).filter(Boolean).join(' and ')}`]);
  const photo2 = page(ctx, 'photography-2', {
    no: 2, of: 2, cls: 'rk-pg--ph2',
    inner: `<div class="rk-top"><h1 class="r-h1">Shot list</h1><p class="r-lead">${Word(S.length)} frames. Each slot says what to shoot and the light to shoot it in.</p></div>`
      + `<figure class="rk-fig rk-fig--shots">${sheet(ctx, imposed, 'rk-sh--shots')}<figcaption>${job(ctx, shotUses, ' <span class="rk-jn">Each photograph keeps its own colour: no drum prints over it.</span>')}</figcaption></figure>`,
  });
  return { palette: [palette], typefaces: [typefaces], photography: [photo1, photo2] };
}
