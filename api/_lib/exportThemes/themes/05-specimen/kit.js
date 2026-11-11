// Brand kit PDFs for theme 05, Catalogue: the 2-page read-me, palette sheet, type specimen and photography sheets, 794 x 1123.
// Styles are in css-bookkit.js (cssBookKit, wired through cssBook in css-book.js, classes start kk-, every rule scoped under .kk-pg).
// Every page is an open sheet from the gate (call number top left, rod hole at the foot), the call number being the kit file or
// folder the sheet belongs to. Each page carries one piece of the catalogue's furniture: the cabinet's drawer fronts for the
// folders, guide-card tabs for the colours and the faces, printed cards at 5 : 3 in a drawer for the palette, the card's
// indentions and See references for the photography rules, and the shelf list for the shots. Every value comes from ctx.
import { A } from './helpers.js';
import { hole, pull, inkOn, rgbCss, tracings } from './guidelines-k.js';

// the ink a printed card or tab carries on its own colour, registered with the contrast check
const onColour = (ctx, hex, size, what) => { const ink = inkOn(ctx, hex); ctx.pair(ink, hex, { size, what }); return ink; };
// a drawer label holder: the frame and its two screws, the label slid in
const holder = (inner, cls = '') => `<span class="kk-hold ${cls}"><i class="kk-screw"></i><span class="kk-lab">${inner}</span><i class="kk-screw"></i></span>`;

// a kit sheet: the gate's open sheet with the kit file as its call number, the kit as the run head and the folio as n of m
function sheet(ctx, id, call, title, inner, { no, of }, cls = '') {
  return `<section class="pg k-sheet kk-pg ${cls}" data-page="${id}">
<header class="k-hd"><div><span class="k-call k-mono">${A(call)}</span><h1 class="k-ttl">${title}</h1></div><p class="k-rh">${A(ctx.brand.name)} brand kit</p></header>
<div class="kk-body">${inner}</div>
<footer class="k-ft">${hole(16)}<span class="k-fo"><span class="num">${no}</span> of <span class="num">${of}</span></span></footer></section>`;
}

export function readMe(ctx) {
  const B = ctx.brand, slot = ctx.edition === 'slot', f = B.fonts;
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
    ['Install the faces.', 'The links in fonts.md go to Google Fonts. All faces are SIL OFL 1.1, free for commercial use.'],
  ];

  // page 1: the kit's cabinet. One drawer per folder, its label carrying the folder name and what is filed in it; the three
  // steps to start are entries at the card's indentions, and the contact is the line at the foot
  const drawers = folders.map(([n, t]) => `<li class="kk-dr">${holder(`<b class="kk-mono kk-fold">${A(n)}</b><span class="kk-fdesc">${A(t)}</span>`)}${pull}</li>`).join('');
  const steps = how.map(([a, t], i) => `<li class="kk-step"><span class="k-disp kk-sn num">${i + 1}</span><p class="kk-st"><b>${A(a)}</b> ${A(t)}</p></li>`).join('');
  const p1 = `<p class="k-disp kk-big">${A(B.name)} brand kit</p>
<p class="kk-lead">${A(B.description)}${B.version ? ' ' + A(ctx.versionLine) + '.' : ''}</p>
<div class="kk-cab"><ol class="kk-drs" aria-label="Folders in the kit">${drawers}</ol><span class="kk-plinth"></span></div>
<ol class="kk-steps">${steps}</ol>
<p class="kk-trace">Questions about these files: ${A(B.contact.owner)}, ${A(B.contact.email)}.</p>`;

  // page 2: the main entry. The logo heads it, the lines are set at the first and second indention, the two faces sit under
  // their drawer labels, and the colours stand as guide cards in the colour drawer, each tab as wide as the colour's share
  const lines = [B.lines.primary, ...B.lines.others].map((l, i) => `<li class="k-disp ${i ? 'kk-l2' : 'kk-l1'}">${A(l)}</li>`).join('');
  const cs = ctx.colours.slice().sort((x, y) => y.share - x.share);
  const tabs = cs.map((c, i) => {
    const ink = onColour(ctx, c.hex, 13, `kit colour tab ${c.hex}`);
    return `<li class="kk-ct ph-tight" style="flex:${Math.max(c.share, 0.12)};background:${c.hex};color:${ink};--h:${208 - i * 20}px"><b>${A(c.name)}</b><span class="kk-mono">${A(c.hex)}</span></li>`;
  }).join('');
  const p2 = `<div class="kk-entry"><div class="kk-logo">${ctx.logo.html('colour', { width: 280, label: 'Your logo goes here' })}</div><ul class="kk-lines ph-tight">${lines}</ul></div>
<div class="kk-faces ph-tight">
<div class="kk-fc kk-fc--d">${holder(`<b>${A(f.display.family)}</b>`)}<p class="kk-fspec">Display, ${A(f.display.weights.join(', '))}</p><p class="k-disp kk-fsd">${A(B.lines.primary)}</p></div>
<div class="kk-fc kk-fc--b">${holder(`<b>${A(f.body.family)}</b>`)}<p class="kk-fspec">Body, ${A(f.body.weights.join(', '))}</p><p class="kk-fsb">${A(B.type.sample.paragraph)}</p></div>
</div>
<div class="kk-cdrw"><ol class="kk-cts" aria-label="Colours by share of a page">${tabs}</ol><div class="kk-cfront">${holder('<b class="kk-mono">02 Colour</b>')}${pull}</div></div>`;
  return [
    sheet(ctx, 'read-me-1', '00 Read me.pdf', 'Read me', p1, { no: 1, of: 2 }, 'kk-rm1'),
    sheet(ctx, 'read-me-2', '00 Read me.pdf', 'The brand on one page', p2, { no: 2, of: 2 }, 'kk-rm2'),
  ];
}

export function sheets(ctx) {
  const B = ctx.brand, f = B.fonts, T = B.type, D = B.imagery.direction;

  // palette: the colour drawer seen from above, one printed card per colour filed back to front, each card on its own stock
  // with its values as the call number. The action colour stands at the front, shown whole at 5 : 3, with its tracings
  const action = ctx.colours.find((c) => c.role === 'action') || ctx.colours[0];
  const filed = [...ctx.colours.filter((c) => c !== action).sort((a, b) => b.share - a.share), action];
  const cards = filed.map((c, i) => {
    const front = c === action, ink = onColour(ctx, c.hex, front ? 14 : 13, `kit palette card ${c.hex}`);
    const ok = c.oklch || ctx.C.oklchString(c.hex);
    return `<li class="kk-pc ${front ? 'kk-pc--front' : ''} ph-tight" style="background:${c.hex};color:${ink};z-index:${i + 1}">
<p class="kk-callno kk-mono"><span>${A(c.hex)}</span><span>${A(rgbCss(c))}</span><span>${A(ok)}</span></p>
<div class="kk-pch"><h2 class="k-disp kk-pcn">${A(c.name)}</h2><p class="kk-pcl">${A(c.lands)}</p></div>
${front ? `<p class="kk-pct">${tracings(ctx, c)}</p>${hole(20, 'kk-pchole')}` : ''}</li>`;
  }).join('');
  const palette = sheet(ctx, 'palette', '02 Colour', `${A(B.name)} palette`, `<div class="kk-pdrw"><ol class="kk-pcs">${cards}</ol></div>
<p class="kk-small">HEX, RGB and OKLCH for each colour. Ask your printer for a proof; no print values are given here.</p>`, { no: 1, of: 1 }, 'kk-pal');

  // typefaces: each face is a guide card in the type drawer, its family on the tab, its Aa and alphabet on the face; the scale
  // follows at its real sizes against the indention rule, each spec run in after its line
  const alpha = ['ABCDEFGHIJKLMNOPQRSTUVWXYZ', 'abcdefghijklmnopqrstuvwxyz', '0123456789'].map((s) => `<span>${s}</span>`).join(' ');
  const guide = (cls, fam, note, w, style) => `<div class="kk-gd ${cls}"><span class="kk-gtab"><span style="${style}">${A(fam)}</span></span>
<div class="kk-gface"><p class="kk-aa" style="${style}">Aa</p><div class="kk-gtx"><p class="kk-al" style="${style}">${alpha}</p><p class="kk-gnote">${A(note)} Weights ${A(w.join(', '))}. SIL OFL 1.1.</p></div></div></div>`;
  const scale = T.scale.slice(0, 5).map((s) => `<li><span class="kk-ss" style="font-family:var(--${s.face === 'display' ? 'display' : 'body'});font-weight:${s.weight};font-size:${s.size}px">${A(s.token === 'wordmark' ? B.name : s.face === 'display' ? B.lines.primary : T.sample.caption)}</span> <span class="kk-sp num">${s.size} px, ${s.weight}</span></li>`).join('');
  const typefaces = sheet(ctx, 'typefaces', '03 Type', 'Typefaces', `<div class="kk-tdrw">${guide('kk-gd--d', f.display.family, 'Display, 24 px and over.', f.display.weights, 'font-family:var(--display);font-weight:400')}${guide('kk-gd--b', f.body.family, 'Body, for reading text.', f.body.weights, 'font-family:var(--body);font-weight:500')}</div>
<ul class="kk-scale ph-tight">${scale}</ul>
<p class="kk-trace">${A(f.mono.family)} is for a hex, a token or a code string only. Links and licence notes are in fonts.md.</p>`, { no: 1, of: 1 }, 'kk-tf');

  // photography 1: the subject is the main entry, the light, crop, colour and people are its notes at the second indention.
  // Each rule is a numbered entry; what not to do is filed under it as a See reference back to that entry
  const notes = [['Light', D.light], ['Crop', D.crop], ['Colour', D.colour], ['People', D.people]].map(([k, v]) => `<p class="kk-note"><b>${k}.</b> ${A(v)}</p>`).join('');
  const rules = B.imagery.rules.map((r, i) => `<li class="kk-rule"><span class="k-disp kk-rn num">${i + 1}</span><p class="kk-do">${A(r.do)}</p><p class="kk-see"><span class="kk-dont">${A(r.dont)}</span> <b>See</b> <span class="num">${i + 1}</span>.</p></li>`).join('');
  const photo1 = sheet(ctx, 'photography-1', '05 Imagery/Photography.pdf', 'Photography direction', `<div class="kk-ent"><p class="kk-flab">Subject</p><p class="k-disp kk-subj">${A(D.subject)}</p><div class="kk-notes">${notes}</div></div>
${holder('<b>Do and don\'t</b>', 'kk-hold--h')}
<p class="kk-rlead">Each rule is an entry. What not to do is filed under it as a See reference, which sends you back to the rule.</p>
<ol class="kk-rules ph-tight">${rules}</ol>`, { no: 1, of: 2 }, 'kk-ph1');

  // photography 2: the shelf list. The shots stand on shelves in shelf order, each at its own width and height, with a label
  // holder on the shelf edge carrying its place and its caption
  const W = [1.55, 1, 1, 1.35, 0.85, 1], H = [100, 84, 92, 100, 78, 100];
  const shelves = [];
  for (let i = 0, k = 0; i < B.imagery.shots.length; k++) { const n = k % 2 ? 3 : 2; shelves.push(B.imagery.shots.slice(i, i + n).map((s, j) => [s, i + j])); i += n; }
  const shelf = (row) => `<div class="kk-shelf">${row.map(([s, i]) => `<figure class="kk-shot" style="flex:${W[i % W.length]}"><div class="kk-sl"><div class="kk-sh" style="height:${H[i % H.length]}%">${ctx.photo(s.id, { cls: 'kk-shot__f', pos: '50% 50%' })}</div></div>
<figcaption class="kk-scap">${holder(`<b class="num">${i + 1}</b>`)}<span class="kk-scapt">${s.photo ? `<b>${A(s.caption || s.alt || s.id)}</b> Photo: ${A(s.credit)}.` : 'Art-directed slot.'}</span></figcaption></figure>`).join('')}</div>`;
  const photo2 = sheet(ctx, 'photography-2', '05 Imagery/Photography.pdf', 'Shot list', `<div class="kk-shelves">${shelves.map(shelf).join('')}</div>`, { no: 2, of: 2 }, 'kk-ph2');

  return { palette: [palette], typefaces: [typefaces], photography: [photo1, photo2] };
}
