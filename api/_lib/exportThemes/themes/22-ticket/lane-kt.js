// Theme 22, Ticket, lane kt: the brand kit PDFs (readMe and sheets). Every kit page is the same roll ticket on the bar top as the guidelines:
// the stub names the kit, its folder and the sheet, the serial counts the kit's pages in the order the engine prints them, and the barcode
// encodes the brand and that serial ("encore-k004"). Each sheet prints its one thing on the ticket body and its notes in the dark zone.
// The engine prints no icon PDF yet, so the icon sheet is the read-me's third page; sheets() also returns it as `icons` for when it does.
// Every class here starts kt-.
import { A, px, T, PAGE, device, roles, barcodeRects, slugOf, fitLines, textWidth, trackOf, longDate, weightName, listAnd } from './helpers.js';
import { icon, iconSet } from '../../engine/components.js';
import { hasPlate, plateWindow, plateAlt } from './plates.js';

// ---------------------------------------------------------------- the kit's pages, in print order (the serial is the position here)

const KIT = [
  ['read-me', '00 Read me', 'Read me'],
  ['start-here', '00 Read me', 'Start here'],
  ['icons', '04 Icons', 'Icon sheet'],
  ['palette', '02 Colour', 'Swatch sheet'],
  ['typefaces', '03 Type', 'Type specimen'],
  ['photography-1', '05 Imagery', 'Photography direction'],
  ['photography-2', '05 Imagery', 'Shot list'],
];
const serialOf = (id) => String(KIT.findIndex((k) => k[0] === id) + 1).padStart(3, '0');
const codeOf = (ctx, id) => `${slugOf(ctx)}-k${serialOf(id)}`;

// the stub: the guidelines' fixed slots, with the kit in the document slot and the folder in the section slot
function kitStub(ctx, R, id) {
  const B = ctx.brand, [, folder, title] = KIT.find((k) => k[0] === id), serial = serialOf(id), code = codeOf(ctx, id);
  const slot = (y, cls, text) => `<div class="st ${cls}" style="top:${y}px">${A(text)}</div>`;
  let h = slot(72, 'c13 b', B.name) + slot(90, 'c12', `Brand kit ${B.version.number}`) + slot(200, 'c13 b', folder) + slot(218, 'c12 two', title);
  h += slot(330, 'c13 b', 'No.') + `<div class="st serial" style="top:348px">${serial}</div>`;
  const bc = barcodeRects(code, T.inX, 420, T.inW, 24, R.fieldInk);
  return h + `<svg class="bc" role="img" aria-label="Barcode, ${A(code)}" viewBox="0 0 ${PAGE.w} ${PAGE.h}" width="${PAGE.w}" height="${PAGE.h}">${bc.svg}</svg>` + slot(444, 'mono12', code);
}
function kitPage(ctx, R, id, { segments, body = '', zone = '' } = {}) {
  return `<section class="pg kt" data-page="${id}" style="--ink:${R.fieldInk};--field:${R.field}">${device(R, { segments })}<div class="ct">${body}${kitStub(ctx, R, id)}${zone}</div></section>`;
}

// ---------------------------------------------------------------- pieces

const at = (x, y, cls, html, style = '', w = null) => `<div class="a ${cls}" style="left:${px(x)};top:${px(y)};${w ? `width:${px(w)};` : ''}${style}">${html}</div>`;
// a block whose last line sits on the body's bottom line (y 460), so copy of any length grows upward from the ticket's foot
const foot = (x, w, cls, html, style = '', bottom = 460) => `<div class="a ${cls}" style="left:${px(x)};bottom:${px(PAGE.h - bottom)};width:${px(w)};${style}">${html}</div>`;
// a brand string set in the display face: the size is fitted by measure (a cap), the text is printed whole and the browser wraps it.
// The measure is taken 8% inside the box: a wide face (Archivo at 125) renders a few per cent wider than its calibrated advances.
function fitText(ctx, text, { x, y, w, max, min, maxLines, color, step = 2 }) {
  // fitLines counts lines only, so a single word wider than the box would pass: each size is also checked line by line
  const track = trackOf(ctx), mw = w * 0.92, ok = (g) => g.lines.length <= maxLines && g.lines.every((l) => textWidth(ctx, 'display', l, g.size, track) <= mw);
  let f = null;
  for (let s = max; s >= min && !f; s -= step) { const g = fitLines(ctx, text, { w: mw, max: s, min: s, maxLines, track }); if (ok(g)) f = g; }
  f = f || fitLines(ctx, text, { w: mw, max: min, min, maxLines, track });
  const lh = Math.round(f.size * 0.92 * 100) / 100;
  return { html: `<div class="a disp kt-fit" style="left:${px(x)};top:${px(y)};width:${px(w)};font-size:${f.size}px;line-height:${lh}px;letter-spacing:${track}em;color:${color}">${A(text)}</div>`, size: f.size, height: lh * f.lines.length };
}
// the largest display size, max down to min in 2 px steps, at which every one of these fixed strings fits w on one line
function fitAll(ctx, strs, w, max, min) {
  for (let s = max; s >= min; s -= 2) if (strs.every((t) => textWidth(ctx, 'display', t, s, trackOf(ctx)) <= w * 0.98)) return s;
  return min;
}
// the dark zone's text box (y 532 to 688): the body's column pairs and the stub column, or n equal columns across the body
const ZONE = { y: 532, pairs: [72, 368, 664].map((x) => ({ x, w: 272 })), stub: { x: T.inX, w: T.inW } };
const across = (n) => { const w = (864 - (n - 1) * 24) / n; return Array.from({ length: n }, (_, i) => ({ x: 72 + i * (w + 24), w })); };
// a dark-zone note: the name in paper, the text in the measured quiet colour
const note = (c, name, html) => at(c.x, ZONE.y, 'kt-note', `<p class="c15 b paper">${A(name)}</p><p class="c13 qt">${html}</p>`, '', c.w);
const mono = (s) => `<span class="m">${A(s)}</span>`;

// ---------------------------------------------------------------- read me

export function readMe(ctx) {
  const B = ctx.brand, R = roles(ctx), slot = ctx.edition === 'slot', n = iconSet(ctx).length;
  const real = B.imagery.shots.filter((s) => s.photo).length;

  // 001: the kit's name is the one thing on the ticket; what each folder holds runs along the bar top
  const title = fitText(ctx, `${B.name} brand kit`, { x: 72, y: 72, w: 864, max: 128, min: 56, maxLines: 2, color: R.fieldInk });
  const body1 = title.html + foot(72, 760, 'c24 ink kt-lead', A(B.description));
  const folders = [
    ['01 Logo', slot ? 'A slot frame at the logo’s proportion, and where the approved files go.' : 'Every version as SVG and PDF, and PNG at 512, 1024 and 2048 px wide.'],
    ['02 Colour', 'The palette as ASE for Adobe, CSS and JSON, and the swatch sheet.'],
    ['03 Type', 'The type specimen, and fonts.md with each face’s weights, link and licence.'],
    ['04 Icons', `${n} SVG icons in the brand’s stroke. Their sheet is page 3 of this read me.`],
    ['05 Imagery', `The photography direction and the shot list${real ? ', and the photos.' : '.'}`],
  ];
  const cols = across(5);
  const zone1 = folders.map(([f, t], i) => note(cols[i], f, A(t))).join('')
    + at(ZONE.stub.x, ZONE.y, 'kt-note', `<p class="c15 b paper">Version ${A(B.version.number)}</p><p class="c13 qt">Issued ${A(longDate(B.version.date))}</p>`, '', ZONE.stub.w);
  const p1 = kitPage(ctx, R, 'read-me', { body: body1, zone: zone1 });

  // 002: the logo is printed on the ticket, and the three first steps sit at its foot; the palette and the faces run along the bar top
  const g = ctx.logo.geo, lw = Math.round(Math.min(420, 150 * g.width / g.height));
  const logo = at(72, 72, 'kt-logo', ctx.logo.html('colour', { width: lw, colourway: R.colourwayOn(R.field), label: 'Your logo goes here', color: R.fieldInk }), `width:${lw}px`);
  const steps = [
    ['Start with the logo.', slot ? 'Put the approved files in 01 Logo, then follow the clear space and minimum size in the guidelines.' : 'Take the files from 01 Logo. The guidelines show which version goes on which ground.'],
    ['Take colour from the files.', 'Open the .ase in Adobe, paste the CSS or read the JSON. Never pick a colour from a screenshot.'],
    ['Install the faces.', 'fonts.md links each face on Google Fonts. All of them are under the SIL Open Font License 1.1.'],
  ];
  const body2 = logo + steps.map(([a, t], i) => foot(ZONE.pairs[i].x, 248, 'kt-step', `<p class="disp kt-n ink">${i + 1}</p><p class="c15 b ink">${A(a)}</p><p class="c13 ink">${A(t)}</p>`)).join('');
  const cs = [...ctx.colours].sort((a, b) => b.share - a.share), pc = across(Math.min(cs.length, 4));
  const chips = cs.slice(0, 8).map((c, i) => {
    const col = pc[i % pc.length], edge = R.nearTable(c.hex) ? `;box-shadow:inset 0 0 0 1px ${R.edge}` : '';
    return at(col.x, ZONE.y + Math.floor(i / pc.length) * 48, 'kt-chip', `<i style="background:${c.hex}${edge}"></i><span><b class="c13 b paper">${A(c.name)}</b>${mono(c.hex)}</span>`, '', col.w);
  }).join('');
  const f = B.fonts;
  const faces = at(ZONE.stub.x, ZONE.y, 'kt-note', `<p class="c15 b paper">Typefaces</p><p class="c13 qt">${A(f.display.family)} for headlines, ${A(f.body.family)} for reading, ${A(f.mono.family)} for values.</p>`, '', ZONE.stub.w);
  const p2 = kitPage(ctx, R, 'start-here', { body: body2, zone: chips + faces });

  return [p1, p2, iconSheet(ctx, R)];
}

// ---------------------------------------------------------------- icon sheet (04 Icons)

function iconSheet(ctx, R) {
  const set = iconSet(ctx), S = ctx.iconStyle, n = set.length, big = 208;
  // the brand's first icon at size, so the stroke can be read; then the whole set at 32 px with the file names
  let body = at(72, 72, 'kt-ico ink', icon(ctx, set[0], big), `width:${big}px;height:${big}px`)
    + foot(72, 248, 'kt-ico-n', `<p>${mono(set[0] + '.svg')}</p><p class="c13 ink">Shown at ${big} px. Drawn at 24 px with a ${S.stroke} px stroke.</p>`);
  const gx = 368, gw = 568, cols = Math.max(4, Math.ceil(n / 4)), rows = Math.ceil(n / cols), pitchX = gw / cols, pitchY = 388 / rows;
  body += set.map((name, i) => at(gx + (i % cols) * pitchX, 72 + Math.floor(i / cols) * pitchY, 'kt-cell', `<span class="ink">${icon(ctx, name, 32)}</span>${mono(name)}`, '', pitchX - 12)).join('');
  const radius = ctx.brand.ui.radius.control, P = ZONE.pairs;
  const zone = note(P[0], 'Stroke and corners', `${A(S.stroke)} px at 24 px, with ${A(S.join)} joins and ${A(S.cap)} ends, to match the ${A(radius)} px corner on the brand’s controls.`)
    + note(P[1], 'Colour', 'Each file draws in currentColor, so an icon takes the colour of the text beside it.')
    + note(P[2], 'Files', `${n} SVG files in ${mono('04 Icons/svg')}, each 24 by 24 px.`)
    + note(ZONE.stub, 'Licence', `Lucide, ISC licence. The notice is in ${mono('LICENSE.txt')}.`);
  return kitPage(ctx, R, 'icons', { body, zone });
}

// ---------------------------------------------------------------- sheets

export function sheets(ctx) {
  const B = ctx.brand, R = roles(ctx), f = B.fonts, P = ZONE.pairs, W = ctx.weights;

  // swatch sheet (02 Colour): the body printed as one strip of tear-off colour tickets, largest share first, each with its values
  const cs = [...ctx.colours].sort((a, b) => b.share - a.share), strip = cs.slice(0, 6), rest = cs.slice(6);
  const xs = strip.map((_, i) => Math.round(T.x + (i * T.bodyW) / strip.length)).concat(T.x + T.bodyW);
  const segments = strip.map((c, i) => ({ x: xs[i], w: xs[i + 1] - xs[i], hex: c.hex }));
  let pbody = '';
  strip.forEach((c, i) => {
    const s = segments[i], padL = i === 0 ? 40 : 20, x = s.x + padL, w = s.w - padL - 20;
    const ink = R.inkOn(c.hex, 12, 400, `(Ticket kit swatch ${c.name})`);
    const name = fitText(ctx, c.name, { x, y: 72, w, max: 40, min: 20, maxLines: 2, color: ink });
    const [r, g, b] = ctx.C.hexToRgb(c.hex), ok = c.oklch || ctx.C.oklchString(c.hex);
    pbody += name.html + at(x, 72 + name.height + 12, 'c13 kt-lands', A(c.lands), `color:${ink}`, w)
      + foot(x, w, 'kt-vals', [['HEX', c.hex], ['RGB', `${r} ${g} ${b}`], ['OKLCH', ok.replace(/^oklch\(|\)$/g, '')], ...(ctx.C.cmykParts(c) ? [['CMYK', ctx.C.cmykParts(c).join(' ')]] : [])].map(([k, v]) => `<p class="c12 b">${k}</p><p class="m">${A(v)}</p>`).join(''), `color:${ink}`);
  });
  const pzone = note(P[0], 'Files', `${mono(ctx.slug + '-palette.ase')} for Adobe, ${mono('.css')} for code and ${mono('.json')} for anything else.`)
    + note(P[1], 'Order', 'Left to right by share of a page, the largest first. The values are the ones in the files.')
    + note(P[2], 'Print', 'These values are for screens. Ask your printer for a proof before a run.')
    + (rest.length ? note(ZONE.stub, 'Also in the palette', rest.map((c) => `${A(c.name)} ${mono(c.hex)}`).join(', ')) : '');
  const palette = kitPage(ctx, R, 'palette', { segments, body: pbody, zone: pzone });

  // type specimen (03 Type): the display face on the field, the body face on a paper ticket joined to it, the mono in the notes
  const split = 32 + 576, paperInk = R.table;
  ctx.pair(paperInk, R.paper, { size: 13, what: '(Ticket kit specimen on paper)' });
  const tsegs = [{ x: T.x, w: split - T.x, hex: R.field }, { x: split, w: T.perf - split, hex: R.paper }];
  const dw = split - 72 - 40, sets = ['ABCDEFGHIJKLMNOPQRSTUVWXYZ', 'abcdefghijklmnopqrstuvwxyz', '0123456789 .,:;!?&@'];
  const alSize = fitAll(ctx, sets, dw, 48, 20), alLh = Math.round(alSize * 1.08);
  const dname = fitText(ctx, f.display.family, { x: 72, y: 72, w: dw, max: 112, min: 40, maxLines: 1, color: R.fieldInk });
  let tbody = dname.html + at(72, 72 + dname.height + 8, 'c13 ink', `Display. ${A(weightName(W.heading))} ${W.heading}${f.display.stretch && f.display.stretch !== 100 ? `, at ${f.display.stretch}% width` : ''}.`, '', dw)
    + foot(72, dw, 'disp kt-al ink', sets.map((s) => `<span class="ln">${A(s)}</span>`).join(''), `font-size:${alSize}px;line-height:${alLh}px;letter-spacing:${trackOf(ctx)}em`);
  const bx = split + 40, bw = T.perf - 24 - bx;
  tbody += at(bx, 72, 'kt-bodyface', `<p class="c24 kt-bn" style="font-weight:600">${A(f.body.family)}</p>${f.body.weights.map((w) => `<p class="c20" style="font-weight:${w}">${weightName(w)} ${w}</p>`).join('')}`, `color:${paperInk}`, bw)
    + foot(bx, bw, 'c15', A(B.type.sample.paragraph), `color:${paperInk}`);
  const tzone = note(P[0], f.display.family, 'Headlines and the one big line on a piece. Never for reading text or buttons.')
    + note(P[1], f.body.family, `Reading text, labels and buttons, in ${listAnd(f.body.weights.map((w) => weightName(w)))}.`)
    + note(P[2], f.mono.family, `A hex, a token or a code string only, as in ${mono(cs[0].hex)}.`)
    + note(ZONE.stub, 'Licence', `SIL Open Font License 1.1. The links are in ${mono('fonts.md')}.`);
  const typefaces = kitPage(ctx, R, 'typefaces', { segments: tsegs, body: tbody, zone: tzone });

  // photography direction (05 Imagery): the subject is the one big line; light, crop, colour and people run along the bar top
  const D = B.imagery.direction;
  const subj = fitText(ctx, D.subject, { x: 72, y: 72, w: 864, max: 56, min: 30, maxLines: 4, color: R.fieldInk });
  // the lead picture sits right of the foot line, under the subject: the brand's first photograph, else the first stand-in plate
  const lead = B.imagery.shots.find((s) => s.photo) || B.imagery.shots.find((s) => hasPlate(ctx, s));
  const lx = 616, lw = 320, ly = Math.ceil(72 + subj.height + 24), lh = 460 - ly;
  const leadHtml = lead && lh >= 120 ? at(lx, ly, 'kt-shot', lead.photo ? ctx.photo(lead.id, { cls: 'kt-ph', style: `width:${px(lw)};height:${lh}px` })
    : `<div class="kt-ph kt-plate" role="img" aria-label="${A(plateAlt(lead))}" style="width:${px(lw)};height:${lh}px">${plateWindow(ctx, R, lead, lw, lh)}</div>`) : '';
  const photo1 = kitPage(ctx, R, 'photography-1', {
    body: subj.html + leadHtml + foot(72, lead && lh >= 120 ? 500 : 520, 'c15 ink', 'What to photograph. The four notes below say how.'),
    zone: [['Light', D.light], ['Crop', D.crop], ['Colour', D.colour]].map(([k, v], i) => note(P[i], k, A(v))).join('') + note(ZONE.stub, 'People', A(D.people)),
  });

  // shot list: every shot as a frame on the ticket, a photograph where there is one and the art-directed brief where there is not
  const shots = B.imagery.shots, gc = shots.length <= 6 ? 3 : 4, shown = shots.slice(0, gc * 2), fw = (864 - (gc - 1) * 24) / gc, capH = 38, fh = Math.floor((388 - 24 - 2 * (8 + capH)) / 2);
  const sbody = shown.map((s, i) => {
    const x = 72 + (i % gc) * (fw + 24), y = 72 + Math.floor(i / gc) * (fh + 8 + capH + 24);
    const plate = hasPlate(ctx, s), title = (/^([^:.]{2,40}):/.exec(s.slot || '') || [])[1];
    const cap = s.photo ? `<p class="c13 b">${A(s.caption || s.alt)}</p>${s.generated || !s.credit ? '' : `<p class="c12">Photo: ${A(s.credit)}</p>`}`
      : plate ? `<p class="c13 b">${A(title || 'Still to shoot')}</p><p class="c12">Stand-in. Still to shoot.</p>` : '<p class="c13 b">Still to shoot</p><p class="c12">The brief is in the frame.</p>';
    const pic = plate ? `<div class="kt-ph kt-plate" role="img" aria-label="${A(plateAlt(s))}" style="width:${px(fw)};height:${fh}px">${plateWindow(ctx, R, s, fw, fh)}</div>` : ctx.photo(s.id, { cls: 'kt-ph', style: `width:${px(fw)};height:${fh}px` });
    return at(x, y, 'kt-shot', pic + `<div class="kt-cap ink">${cap}</div>`, '', fw);
  }).join('');
  const nReal = shots.filter((s) => s.photo).length, rules = (B.imagery.rules || []).slice(0, 3);
  const szone = rules.map((r, i) => at(P[i].x, ZONE.y, `kt-note${ctx.edition === 'slot' ? ' ph-tight' : ''}`, `<p class="c13 b paper">Do</p><p class="c13 qt">${A(r.do)}</p><p class="c13 b paper kt-gap">Don’t</p><p class="c13 qt">${A(r.dont)}</p>`, '', P[i].w)).join('')
    + note(ZONE.stub, `${shots.length} shots`, `${nReal ? `${nReal} photographed, ` : ''}${shots.length - nReal} still to shoot.${shots.length > shown.length ? ` ${shown.length} are shown here.` : ''}`);
  const photo2 = kitPage(ctx, R, 'photography-2', { body: sbody, zone: szone });

  return { palette: [palette], typefaces: [typefaces], photography: [photo1, photo2], icons: [iconSheet(ctx, R)] };
}

// ---------------------------------------------------------------- css (every rule under .pg.kt)

export function css() {
  return `
.pg.kt .kt-fit{margin:0}
.pg.kt .kt-lead{max-width:760px}
.pg.kt .kt-note p+p{margin-top:4px}
.pg.kt .kt-note .kt-gap{margin-top:8px}
.pg.kt .kt-logo svg{display:block}
.pg.kt .kt-step .kt-n{font-size:56px;line-height:56px;margin-bottom:12px}
.pg.kt .kt-step p+p{margin-top:4px}
.pg.kt .kt-chip{display:flex;gap:12px;align-items:flex-start}
.pg.kt .kt-chip i{flex:none;width:32px;height:32px}
.pg.kt .kt-chip span{display:flex;flex-direction:column;min-width:0}
.pg.kt .kt-chip .m{color:var(--quiet)}
.pg.kt .kt-ico svg{display:block}
.pg.kt .kt-ico-n p+p{margin-top:4px}
.pg.kt .kt-ico-n .m{color:var(--ink)}
.pg.kt .kt-cell{display:flex;flex-direction:column;gap:8px}
.pg.kt .kt-cell svg{display:block}
.pg.kt .kt-cell .m{color:var(--ink);white-space:nowrap}
.pg.kt .kt-vals p.m+p{margin-top:8px}
.pg.kt .kt-al .ln{display:block;white-space:nowrap}
.pg.kt .kt-bodyface p+p{margin-top:0}
.pg.kt .kt-bn{margin-bottom:12px}
.pg.kt .kt-shot img,.pg.kt .kt-shot .photo-slot{display:block}
.pg.kt .kt-plate{position:relative;overflow:hidden;isolation:isolate;display:block}
.pg.kt .kt-plate::after{content:'';position:absolute;inset:0;box-shadow:inset 0 0 0 1px oklch(0 0 0 / .1);pointer-events:none}
.pg.kt .photo-slot{box-sizing:border-box;border:1px dashed var(--ink);padding:8px;overflow:hidden;color:var(--ink);font:400 12px/16px var(--body)}
.pg.kt .kt-cap{margin-top:8px}
.pg.kt .kt-cap p+p{margin-top:4px}
`;
}
