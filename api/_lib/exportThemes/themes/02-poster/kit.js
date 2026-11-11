// Brand kit PDFs for theme 02, Ticket: the 2-page read me, the palette sheet, the type specimen and the two photography sheets.
// Same document as the guidelines: 1280 x 720 open pages on Stock with the gate's head (page name left, "n of N" right), and the
// ticket's parts as edge devices: the perforation as a rule (vertical between a body and a stub column, horizontal between rows),
// serials that are real sequences (the kit's folder numbers, the steps, the shots), fact fields label over value. The palette sheet
// is a colour page, so its colours stand as roll lengths, each torn above its values stub. Photography is the queue at night (Night,
// two pages of six). Styles are in css-bookkit.js (classes tk2-). Every value comes from ctx; no hex is written here.
import { A } from './helpers.js';
import { perf, fields, serial, inkOn, holeOn, edgeOn, bySize, NUM } from './gate.js';

const rgbOf = (ctx, hex) => { const [r, g, b] = ctx.C.hexToRgb(hex); return `rgb(${r}, ${g}, ${b})`; };
// text printed on a colour takes the ink that reads on it; the pair is logged with the build's contrast list
const inkFor = (ctx, hex, what) => { const fg = inkOn(ctx, hex); ctx.pair(fg, hex, { size: 12, what: `kit ${what} ${hex}` }); return fg; };
// the open page's perforated rules: holes in the quiet tone of the ground they sit on
const holes = (ctx, night) => (night ? ctx.roles.dark : ctx.roles.light).quiet;
const hr = (ctx, night = false, cls = '') => `<div class="tk2-hr ${cls}" aria-hidden="true">${perf(holes(ctx, night), { d: 3, p: 9, dir: 'h' })}</div>`;
const vr = (ctx, night = false) => perf(holes(ctx, night), { d: 3, p: 9 });

// a kit page: the gate's head with the page name and "n of N", then the work. night: the queue at night (Night ground)
function page(id, title, inner, { no, of, night = false, cls = '' }) {
  return `<section class="pg tk tk2${night ? ' tk2-night' : ''} ${cls}" data-page="${id}"><header class="tk-hd"><span>${A(title)}</span><span class="num">${no} of ${of}</span></header>${inner}</section>`;
}

export function readMe(ctx) {
  const B = ctx.brand, slot = ctx.edition === 'slot', V = B.version, f = B.fonts;
  // the kit's own folders, numbered as they are on disk (01 Logo to 05 Imagery): the serial is the folder number
  const folders = [
    ['Logo', slot ? 'A labelled slot frame and a note on where the approved files go.' : 'Each version as SVG and PDF, and PNG at 512, 1024 and 2048 px, transparent.'],
    ['Colour', 'The palette for Adobe (.ase), CSS and JSON, and a one-page swatch sheet.'],
    ['Type', 'A specimen sheet, and the faces with their links and licence.'],
    ['Icons', 'Sixteen interface icons (Lucide, ISC licence) drawn in the brand stroke.'],
    ['Imagery', B.imagery.shots.some((s) => s.photo) ? 'The photography direction and shot list, and the photos.' : 'The photography direction and shot list.'],
  ];
  const how = [
    ['Start with the logo.', slot ? 'Drop the approved files into the three logo folders, then follow the clear space and minimum size in the guidelines.' : 'Use the full-colour version on light grounds. The guidelines show the version for every other ground.'],
    ['Take colour from the files.', 'Open the .ase in Adobe, paste the CSS, or read the JSON. Do not pick colours from a screenshot.'],
    ['Install the faces.', 'The links in fonts.md go to Google Fonts. All three faces are SIL OFL 1.1, free for commercial use.'],
  ];
  // page 1: the kit's name is the one large thing; the three steps run down a stub column beyond a perforation;
  // under a torn edge the five folders stand as a pad of stubs, each its folder number
  const steps = how.map(([a, t], i) => `<li>${i ? hr(ctx) : ''}<span class="tk-sn tk2-step__n">${i + 1}</span><p><b>${A(a)}</b> ${A(t)}</p></li>`).join('');
  const pad = folders.map(([n, t], i) => `<li class="tk2-fold">${i ? vr(ctx) : ''}<span class="tk2-fold__n num">${String(i + 1).padStart(2, '0')}</span><b class="disp tk2-fold__t">${A(n)}</b><p>${A(t)}</p></li>`).join('');
  const p1 = `<div class="tk2-rm"><div class="tk2-rm__body"><h1 class="disp tk2-rm__name">${A(B.name)}<br>brand kit</h1><p class="tk2-lead">${A(B.description)}${V ? ` ${A(ctx.versionLine)}.` : ''}</p></div>
<div class="tk2-rm__stub">${vr(ctx)}<h2 class="tk-h3">How to use it</h2><ol class="tk2-steps">${steps}</ol></div></div>
<div class="tk2-padw">${hr(ctx)}<h2 class="tk-h3">What is here</h2><ol class="tk2-pad">${pad}</ol></div>`;

  // page 2: the brand's lines as event lines down the body, each its serial, the first at full size; the stub carries the logo and
  // the two faces; along the foot the colours as one roll, each length its share of a page, torn between colours
  const lines = [B.lines.primary, ...B.lines.others].map((l, i) => `<li class="tk2-ev${i === 0 ? ' tk2-ev--lead' : ''}">${i ? hr(ctx) : ''}<span class="tk-sn">${serial(i + 1)}</span><p class="disp">${A(l)}</p></li>`).join('');
  const faces = [[f.display, 'Display', 'disp'], [f.body, 'Body', 'tk2-aa--body']].map(([x, role, cls]) => `<div class="tk2-face"><span class="tk2-aa ${cls}" aria-hidden="true">Aa</span>${fields([[role, A(x.family)], ['Weights', `<span class="num">${x.weights.join(', ')}</span>`]], 'tk2-ff')}</div>`).join('');
  const strip = bySize(ctx).map((c, i) => `<li class="tk2-strip__c${edgeOn(ctx, c.hex)}" style="flex:${Math.max(c.share, 0.14)} 1 0;background:${c.hex};color:${inkFor(ctx, c.hex, 'strip')}">${i ? perf(holeOn(ctx, c.hex), { d: 4, p: 10 }) : ''}<b>${A(c.name)}</b><span class="tk2-mono">${A(c.hex)}</span></li>`).join('');
  const p2 = `<div class="tk2-one"><ol class="tk2-evs">${lines}</ol>
<div class="tk2-one__stub">${vr(ctx)}<div class="tk2-one__logo">${ctx.logo.html('colour', { width: 300, color: 'var(--ink)', label: 'Your logo goes here' })}</div><div class="tk2-faces">${faces}</div></div></div>
<ul class="tk2-strip">${strip}</ul>`;
  return [page('read-me-1', 'Read me', p1, { no: 1, of: 2, cls: 'tk2--rm' }), page('read-me-2', 'The brand on one page', p2, { no: 2, of: 2, cls: 'tk2--one' })];
}

export function sheets(ctx) {
  const B = ctx.brand, f = B.fonts, T = B.type, D = B.imagery.direction, K = B.contact;

  // palette: each colour a length of its roll standing on end, as wide as its share of a page (never under a fifth, so every value
  // fits), its serial and name at the head; torn across near the foot, the stub carries HEX, RGB and OKLCH as fact fields
  const cs = bySize(ctx);
  const col = (c, i) => {
    const fg = inkFor(ctx, c.hex, 'palette'), ok = c.oklch || ctx.C.oklchString(c.hex);
    const vals = fields([['HEX', A(c.hex), 'tk2-mono'], ['RGB', A(rgbOf(ctx, c.hex)), 'tk2-mono'], ['OKLCH', A(ok), 'tk2-mono']], 'tk2-ff tk2-ff--vals');
    return `<li class="tk2-col${edgeOn(ctx, c.hex)}${i === 0 ? ' tk2-col--lead' : ''}" style="flex:${Math.max(c.share, 0.2)} 1 0;background:${c.hex};color:${fg}">
<div class="tk2-col__body"><span class="tk-sn">${serial(i + 1, 2)}</span><b class="disp tk2-col__n">${A(c.name)}</b><p class="tk2-col__l">${A(c.lands)}</p></div>
<div class="tk2-col__stub">${perf(holeOn(ctx, c.hex), { d: 4, p: 10, dir: 'h' })}${vals}</div></li>`;
  };
  const tones = ctx.tones.map((t) => `<li><i class="tk-sw${edgeOn(ctx, t.hex)}" style="background:${t.hex}"></i><p><b>${A(t.name)}</b> <span class="tk2-mono">${A(t.hex)}</span> ${A(t.lands)}</p></li>`).join('');
  const nT = ctx.tones.length;
  const lead = `${NUM[cs.length] || cs.length} colours, each roll as wide as its share of a page. ${NUM[nT] || nT} tones carry the quiet text and the hover.`;
  const palette = page('palette', 'Colour', `<div class="tk2-pal__top"><h1 class="disp tk2-title">${A(B.name)} palette</h1><p class="tk2-lead">${A(lead)}</p></div>
<ol class="tk2-cols">${cs.map(col).join('')}</ol>
<div class="tk2-pal__foot">${hr(ctx)}<div><h2 class="tk-h3">Tones</h2><ul class="tk2-tones">${tones}</ul></div><p class="tk2-cap">HEX, RGB and OKLCH for each colour. Ask your printer for a proof; no print values are given here.</p></div>`, { no: 1, of: 1, cls: 'tk2--pal' });

  // type specimen: the display face is the body you keep, its Aa the large thing on the page, the sample set in it under a torn
  // edge; beyond the perforation the body face stands on the stub with its alphabet, and the mono note at the foot
  const alpha = 'ABCDEFGHIJKLM<br>NOPQRSTUVWXYZ<br>abcdefghijklm<br>nopqrstuvwxyz<br>0123456789';
  const ff = (x, role) => fields([['Face', A(x.family)], ['Role', role], ['Weights', `<span class="num">${x.weights.join(', ')}</span>`], ['Licence', 'SIL OFL 1.1']], 'tk2-ff tk2-ff--face');
  const typefaces = page('typefaces', 'Typefaces', `<div class="tk2-spec"><div class="tk2-spec__body">${ff(f.display, 'Display, for headlines and the event line')}
<div class="tk2-spec__d"><p class="disp tk2-spec__aa" aria-hidden="true">Aa</p><p class="disp tk2-spec__al">${alpha}</p></div>
<div class="tk2-spec__s">${hr(ctx)}<p class="disp tk2-spec__h">${A(T.sample.headline)}</p><p class="tk2-spec__p">${A(T.sample.paragraph)}</p></div></div>
<div class="tk2-spec__stub">${vr(ctx)}${ff(f.body, 'Body, for reading text, labels and captions')}<p class="tk2-spec__aa2" aria-hidden="true">Aa</p><p class="tk2-spec__al2">${alpha}</p>
<p class="tk2-cap tk2-spec__note">${A(f.mono.family)} is for a hex, a token or a code string only. Links and licence notes are in fonts.md.</p></div></div>`, { no: 1, of: 1, cls: `tk2--type${ctx.edition === 'slot' ? ' tk2--slot' : ''}` });

  // photography 1: the five calls as a run of serials down the body; beside them the title, then each rule a row, the do on the
  // body you keep and the don't on the stub side of its own perforation
  const calls = [['Subject', D.subject], ['Light', D.light], ['Crop', D.crop], ['Colour', D.colour], ['People', D.people]];
  const run = calls.map(([k, v], i) => `<li class="tk2-call${i === 0 ? ' tk2-call--lead' : ''}">${i ? hr(ctx, true) : ''}<span class="tk-sn">${serial(i + 1, 2)} ${k}</span><p>${A(v)}</p></li>`).join('');
  const rules = B.imagery.rules.map((r) => `<li class="tk2-rule">${hr(ctx, true)}<p class="tk2-rule__do">${A(r.do)}</p><p class="tk2-rule__dont">${vr(ctx, true)}${A(r.dont)}</p></li>`).join('');
  const photo1 = page('photography-1', 'Photography', `<div class="tk2-pd"><ol class="tk2-calls">${run}</ol>
<div class="tk2-pd__rules"><div class="tk2-pd__top"><h1 class="disp tk2-title">Photography direction</h1><p class="tk2-lead">Five calls decide whether a picture belongs. Check a photo against each before it is used.</p></div><div class="tk2-rule tk2-rule--hd"><h2 class="tk-h3">Do</h2><h2 class="tk-h3">${vr(ctx, true)}Don't</h2></div><ul>${rules}</ul></div></div>`, { no: 1, of: 2, night: true, cls: `tk2--pd${ctx.edition === 'slot' ? ' tk2--slot' : ''}` });

  // photography 2: the first shot is the lead, its slot the size of the page's body; the other five run down the stub column
  // beyond the perforation, each its serial, its slot, its name and its brief
  const [first, ...more] = B.imagery.shots;
  const credit = (s) => (s.photo ? `Photo: ${A(s.credit)}.` : 'Art-directed slot.');
  // each shot's name and credit on one line, its brief under it
  const cap = (s) => `<p class="tk2-shot__c"><b>${A(ctx.cap(s.id))}</b> ${credit(s)}</p><p class="tk2-shot__b">${A(s.slot)}</p>`;
  const lead1 = `<div class="tk2-sl__lead"><div class="tk2-sl__top"><h1 class="disp tk2-title">Shot list</h1><p class="tk2-lead">Six frames cover the night, from the queue to the walk home. Each slot says what to shoot and the light to shoot it in.</p></div>
<figure class="tk2-sl__fig"><div class="tk2-sl__ph">${ctx.photo(first.id, { style: 'width:100%;height:100%', slotNote: false })}</div><figcaption><span class="tk-sn tk2-sl__n">${serial(1)}</span><div>${cap(first)}</div></figcaption></figure></div>`;
  const rows = more.map((s, i) => `<li class="tk2-shot">${i ? hr(ctx, true) : ''}<span class="tk-sn tk2-shot__n">${serial(i + 2)}</span><div class="tk2-shot__ph">${ctx.photo(s.id, { style: 'width:100%;height:100%', slotNote: false })}</div><div class="tk2-shot__t">${cap(s)}</div></li>`).join('');
  const photo2 = page('photography-2', 'Shot list', `<div class="tk2-sl">${lead1}<div class="tk2-sl__stub">${vr(ctx, true)}<ol class="tk2-shots">${rows}</ol>${K ? `<p class="tk2-cap tk2-sl__ask">Questions about the kit go to ${A(K.owner)}, <span class="tk2-mono">${A(K.email)}</span>.</p>` : ''}</div></div>`, { no: 2, of: 2, night: true, cls: 'tk2--sl' });

  return { palette: [palette], typefaces: [typefaces], photography: [photo1, photo2] };
}
