// Theme 32, Dieline, lane kt: the brand kit PDFs (readMe and sheets). Every kit sheet is one of the printed inserts packed with the brand's pack,
// laid flat with its die: the read-me is a leaflet folded in three, the start-here sheet is the pack's back panel with the kind's closures,
// the swatch sheet a pad of tear-off strips, the type specimen a swing tag, the photography direction a sleeve band, the shot list a map fold,
// and the icon sheet a sticker sheet of kiss-cut rounds. Colours come by role and share, sizes by measure, so nothing here names a brand.
// The engine prints `sheets().icons` as 04 Icons/Icons.pdf, so the icon sheet is not part of the read-me.
import { icon, iconSet } from '../../engine/components.js';
import { Pg, KIT, px, disp, para, paraH, fitDisplay, dispText, fitAll, note, mono, inner, panel, neighbour, weightName, listAnd, L, esc, measure, TRACK } from './lane-kt-lib.js';
import { allocate, pathLine, fillPath } from './geom.js';
import { focusOf, creditOf } from './lane-fix-focus.js';

const pct = (s) => `${Math.round(s * 100)}%`;
// a rectangle's outline as a path, for die lines that are not a single edge
const rect = (x, y, w, h) => `M${x} ${y}H${x + w}V${y + h}H${x}Z`;

// ---------------------------------------------------------------- read me

// 001: the leaflet folded in three, opened out. The first panel is printed in the front colour and carries the kit's name; the other two are
// unprinted board with what each folder holds
function readMe1(ctx) {
  const P = new Pg(ctx, 'read-me'), { R, B } = P, hex = R.front.hex, tx = R.textOn(hex), gi = R.groundText, lc = R.lineOn(hex), gc = R.ghost;
  // a roll fold: the cover panel is the widest, the two that fold in under it narrower
  const y0 = 96, y1 = 912, xs = [40, 440, 740, 1040], n = iconSet(ctx).length, real = B.imagery.shots.filter((s) => s.photo).length;
  P.field(40, y0, xs[1] - 40, y1 - y0, hex);
  P.line(L('cut', 40, y0 + 0.75, xs[1], y0 + 0.75, lc), L('cut', 40, y1 - 0.75, xs[1], y1 - 0.75, lc), L('cut', 40.75, y0, 40.75, y1, lc), L('fold', xs[1] - 0.75, y0, xs[1] - 0.75, y1, lc));
  P.line(L('cut', xs[1], y0 + 0.75, 1040, y0 + 0.75, gc), L('cut', xs[1], y1 - 0.75, 1040, y1 - 0.75, gc), L('fold', xs[2], y0, xs[2], y1, gc), L('cut', 1039.25, y0, 1039.25, y1, gc));
  // the cover panel: the kit's name at the head, what the brand is at the foot
  const cw = xs[1] - 40 - 80;
  dispText(P, 80, 136, cw, `${B.name} brand kit`, [104, 96, 88, 80, 72, 64, 56, 48, 44, 40, 36, 32], 4, tx.ink);
  const dh = paraH(ctx, cw, B.description);
  para(P, 80, y1 - 40 - dh, cw, B.description, { col: tx.ink });
  // the two inside panels: the five folders, three and two
  const folders = [
    ['01 Logo', P.slot ? 'A slot frame at the logo’s proportion, and a note on where the approved files go.' : 'Every version as SVG and PDF, and as PNG at 512, 1024 and 2048 px wide.'],
    ['02 Colour', 'The palette as ASE for Adobe, CSS and JSON, and the swatch sheet.'],
    ['03 Type', 'The type specimen, and fonts.md with each face’s weights, link and licence.'],
    ['04 Icons', `${n} SVG icons drawn in the brand’s stroke, and the icon sheet.`],
    ['05 Imagery', `The photography direction and the shot list${real ? ', and the photographs' : ''}.`],
  ];
  const fw = xs[2] - xs[1] - 80, ts = fitDisplay(ctx, folders.map((f) => f[0]).sort((a, b) => b.length - a.length)[0], [24, 22, 20], fw, 1).size;
  [[0, 3, xs[1] + 40], [3, 5, xs[2] + 40]].forEach(([a, b, x]) => {
    let y = 136;
    folders.slice(a, b).forEach(([name, text]) => {
      P.text(x, y, fw, ts, 'disp', esc(name), disp(ts, ts, gi.ink)); y += ts + 12;
      y += para(P, x, y, fw, text, { col: gi.ink }) + 48;
    });
  });
  // the foot of the last panel: the version, and the one print caution
  const vh = paraH(ctx, fw, 'Ask your printer for a proof before a print run.', { size: 14, lh: 20 });
  P.text(xs[2] + 40, y1 - 40 - vh - 28, fw, 24, 'b-body b-med', esc(ctx.versionLine), `color:${gi.ink}`);
  para(P, xs[2] + 40, y1 - 40 - vh, fw, 'Ask your printer for a proof before a print run.', { cls: 'b-small', size: 14, lh: 20, col: gi.quiet });
  return P.html(hex);
}

// 002: the pack's back panel, where a pack prints its instructions: the logo at the head, three first steps at the foot, closures by kind.
// The colours and faces are noted on the unprinted board past the fold
function readMe2(ctx) {
  const P = new Pg(ctx, 'start-here'), { R, B, kind } = P, hex = R.back.hex, tx = R.textOn(hex), gi = R.groundText, W = ctx.weights;
  const x1 = 756, { y0, y1 } = P, ins = inner(kind, y0, y1);
  panel(P, { x0: 0, x1, y0, y1, hex, l: 'bleed', r: 'fold', role: 'back' });
  neighbour(P, x1, 1080, y0, y1);
  // the logo, as large as the panel's head allows
  const g = ctx.logo.geo, aspect = g.aspect || g.width / g.height, lw = Math.round(Math.min(440, 168 * aspect)), lh = lw / aspect;
  P.text(40, ins.top + 8, lw, lh, 'kt-logo', ctx.logo.html('colour', { width: lw, colourway: R.colourwayOn(hex), label: 'Your logo goes here', color: tx.ink }));
  // three steps, standing on the panel's foot
  const steps = [
    ['Start with the logo.', P.slot ? 'Put the approved files in 01 Logo, then keep the clear space and minimum size in the guidelines.' : 'Take the files from 01 Logo. The guidelines show which version goes on which ground.'],
    ['Take colour from the files.', 'Open the ASE in Adobe, paste the CSS or read the JSON. Never pick a colour from a screenshot.'],
    ['Install the faces.', 'fonts.md links each face on Google Fonts, with its licence.'],
  ];
  const sw = 204, sx = [40, 276, 512], hs = steps.map(([a, t]) => 56 + 16 + paraH(ctx, sw, a, { weight: W.medium }) + 4 + paraH(ctx, sw, t, { size: 14, lh: 20 }));
  const top = ins.bot - 8 - Math.max(...hs);
  steps.forEach(([a, t], i) => {
    let y = top; const x = sx[i];
    P.text(x, y, sw, 56, 'disp', String(i + 1), disp(56, 56, tx.ink)); y += 72;
    y += para(P, x, y, sw, a, { cls: 'b-body b-med', weight: W.medium, col: tx.ink }) + 4;
    para(P, x, y, sw, t, { cls: 'b-small', size: 14, lh: 20, col: tx.ink });
  });
  // the board: every colour by share with its value, then the three faces
  const bx = 796, bw = 244, lcG = R.ghost;
  let y = ins.top + 8;
  P.text(bx, y, bw, 24, 'b-body b-med', 'Colours', `color:${gi.ink}`); y += 36;
  R.order.forEach((c) => {
    P.field(bx, y + 2, 16, 16, c.hex);
    if (R.isGround(c.hex)) P.line(`<rect x="${bx + 0.5}" y="${y + 2.5}" width="15" height="15" fill="none" stroke="${lcG}" stroke-width="1"/>`);
    P.text(bx + 28, y, bw - 28, 20, 'b-small b-med', esc(c.name), `color:${gi.ink}`);
    P.text(bx + 28, y + 20, bw - 28, 16, '', `${mono(c.hex)}`, `color:${gi.ink}`);
    y += 48;
  });
  y += 24;
  const f = B.fonts;
  P.text(bx, y, bw, 24, 'b-body b-med', 'Typefaces', `color:${gi.ink}`); y += 32;
  [[f.display.family, 'Headlines'], [f.body.family, 'Reading text'], [f.mono.family, 'Values']].forEach(([fam, use]) => {
    y += para(P, bx, y, bw, fam, { cls: 'b-small b-med', size: 14, lh: 20, weight: W.medium, col: gi.ink });
    P.text(bx, y, bw, 20, 'cap', esc(use), `color:${gi.quiet}`); y += 32;
  });
  return P.html(hex);
}

export function readMe(ctx) { return [readMe1(ctx), readMe2(ctx)]; }

// ---------------------------------------------------------------- swatch sheet (02 Colour)

// a pad of tear-off strips, one a colour, each as tall as its colour's share of a page; the share is printed on the strip's tear-off tab
function swatchSheet(ctx) {
  const P = new Pg(ctx, 'palette'), { R } = P, gi = R.groundText, cs = R.order.slice(0, 8), rest = R.order.slice(8);
  const x0 = 40, x1 = 1040, tab = 904, top = 128, total = 672, hs = allocate(cs.map((c) => c.share), total, 72);
  // the column names, once, above the pad
  const cols = { name: 80, hex: 456, rgb: 576, ok: 712, share: 936 };
  [['Colour', cols.name, 200], ['HEX', cols.hex, 100], ['RGB', cols.rgb, 120], ['OKLCH', cols.ok, 176], ['Share', cols.share, 80]].forEach(([s, x, w]) => P.text(x, 96, w, 20, 'cap', esc(s), `color:${gi.quiet}`));
  let y = top;
  cs.forEach((c, i) => {
    const h = hs[i], tx = R.textOn(c.hex), lc = R.lineOn(c.hex), mid = y + h / 2;
    P.field(x0, y, x1 - x0, h, c.hex);
    P.line(L(i ? 'seal' : 'cut', x0, y + 0.75, x1, y + 0.75, lc), L('cut', x0 + 0.75, y, x0 + 0.75, y + h, lc), L('cut', x1 - 0.75, y, x1 - 0.75, y + h, lc), L('seal', tab, y + 8, tab, y + h - 8, lc));
    if (i === cs.length - 1) P.line(L('cut', x0, y + h - 0.75, x1, y + h - 0.75, lc));
    // the name grows with the strip, so the largest share reads first
    const sizes = [64, 56, 48, 40, 32, 28, 24, 20].filter((s) => s <= h - 32), f = fitDisplay(ctx, c.name, sizes.length ? sizes : [20], 340, 1, { k: 1 });
    P.text(cols.name, mid - f.lh / 2, 340, f.lh, 'disp', esc(c.name), disp(f.size, f.lh, tx.ink));
    const [r, g, b] = ctx.C.hexToRgb(c.hex), ok = (c.oklch || ctx.C.oklchString(c.hex)).replace(/^oklch\(|\)$/g, '');
    // a colour with cmyk lifts its three values and sets the CMYK on a second line from the HEX column
    const km = ctx.C.cmykOf(c), vy = km ? mid - 15 : mid - 8;
    [[c.hex, cols.hex, 100], [`${r} ${g} ${b}`, cols.rgb, 120], [ok, cols.ok, 176]].forEach(([v, x, w]) => P.text(x, vy, w, 16, '', mono(v), `color:${tx.ink}`));
    if (km) P.text(cols.hex, mid + 5, 396, 16, '', mono(km), `color:${tx.ink}`);
    // the share steps down until it sits inside its column, clear of the frame line
    let ss = Math.min(40, h - 32); while (ss > 20 && measure(ctx, 'display', ctx.weights.heading, pct(c.share), ss) > 84) ss -= 2;
    P.text(cols.share, mid - ss / 2, 88, ss, 'disp', pct(c.share), `${disp(ss, ss, tx.ink)};font-variant-numeric:tabular-nums`);
    y += h;
  });
  // under the pad: the files, the order and the print caution
  const ny = top + total + 40, nw = 296;
  note(P, 40, ny, nw, 'Files', '', gi.ink, { html: { s: `${mono(ctx.slug + '-palette.ase')} for Adobe, ${mono('.css')} for code and ${mono('.json')} for anything else.`, plain: `${ctx.slug}-palette.ase for Adobe, .css for code and .json for anything else.` } });
  note(P, 372, ny, nw, 'Order', 'Top to bottom by share of a page, the largest first. Each strip is as tall as its share.', gi.ink);
  note(P, 704, ny, nw, 'Print', rest.length ? `These values are for screens; ask your printer for a proof. Also in the palette: ${rest.map((c) => `${c.name} ${c.hex}`).join(', ')}.` : 'These values are for screens. Ask your printer for a proof before a run.', gi.ink);
  return P.html('all');
}

// ---------------------------------------------------------------- type specimen (03 Type)

// a swing tag: the display face's name is printed large on the tag, its alphabet at the tag's foot; the body face, its weights and a
// paragraph sit on the board beside it, the mono at the board's foot
function typeSheet(ctx) {
  const P = new Pg(ctx, 'typefaces'), { R, B } = P, hex = R.flap.hex, tx = R.textOn(hex), gi = R.groundText, lc = R.lineOn(hex), W = ctx.weights, f = B.fonts;
  const x0 = 40, x1 = 600, yt = 96, ch = 56, yb = 912, hole = { x: 320, y: 140 };
  P.field(x0, yt + ch, x1 - x0, yb - yt - ch, hex);
  P.line(fillPath(`M${x0} ${yt + ch + 4}V${yt + ch}L${x0 + ch} ${yt}H${x1 - ch}L${x1} ${yt + ch}V${yt + ch + 4}Z`, hex));
  P.line(pathLine('cut', `M${x0 + 0.75} ${yb - 0.75}V${yt + ch}L${x0 + ch} ${yt + 0.75}H${x1 - ch}L${x1 - 0.75} ${yt + ch}V${yb - 0.75}Z`, lc));
  // the punched hole and its reinforcing ring
  P.line(`<circle cx="${hole.x}" cy="${hole.y}" r="13" fill="${R.ground.hex}" stroke="${lc}" stroke-width="1.5"/>`, pathLine('seal', `M${hole.x - 26} ${hole.y}a26 26 0 1 0 52 0a26 26 0 1 0 -52 0`, lc));
  const tw = 480, tx0 = 80;
  let y = 208;
  y += dispText(P, tx0, y, tw, f.display.family, [200, 176, 160, 144, 128, 112, 96, 88, 80, 72, 64, 56, 48], 2, tx.ink, { k: 0.88 }) + 16;
  const stretch = f.display.stretch && f.display.stretch !== 100 ? `, at ${f.display.stretch}% width` : '';
  para(P, tx0, y, tw, `Display. ${weightName(W.heading)} ${W.heading}${stretch}. Headlines and the one big line on a piece; never reading text or buttons.`, { cls: 'b-small', size: 14, lh: 20, col: tx.ink });
  const sets = ['ABCDEFGHIJKLMNOPQRSTUVWXYZ', 'abcdefghijklmnopqrstuvwxyz', '0123456789 .,:;!?&@'], as = fitAll(ctx, sets, tw, 48, 18), al = Math.round(as * 1.1);
  P.text(tx0, yb - 40 - al * 3, tw, al * 3, 'disp kt-al', sets.map((s) => `<span>${esc(s)}</span>`).join(''), disp(as, al, tx.ink));
  // the board: the body face at work
  const bx = 640, bw = 400, ws = f.body.weights;
  let by = 136;
  P.text(bx, by, bw, 40, 'b-body', esc(f.body.family), `font-size:32px;line-height:40px;font-weight:${ws[ws.length - 1]};color:${gi.ink}`); by += 52;
  ws.forEach((w) => { P.text(bx, by, bw, 28, 'b-body', `${weightName(w)} ${w}`, `font-size:20px;line-height:28px;font-weight:${w};color:${gi.ink}`); by += 28; });
  by += 12;
  by += para(P, bx, by, bw, `Body. Reading text, labels and buttons, in ${listAnd(ws.map(weightName))}.`, { cls: 'b-small', size: 14, lh: 20, col: gi.quiet }) + 40;
  para(P, bx, by, bw, B.type.sample.paragraph, { col: gi.ink });
  // the board's foot: the mono, for literal values only, and the licence
  const lic = 'Every face is under the SIL Open Font License 1.1. The links are in fonts.md.', lh = paraH(ctx, bw, lic, { size: 14, lh: 20 });
  const my = yb - 40 - lh - 24 - 24 - 28;
  P.text(bx, my, bw, 24, 'b-body b-med', esc(f.mono.family), `color:${gi.ink}`);
  P.text(bx, my + 28, bw, 16, 'mono', `Values only, as in ${esc(R.front.hex)}`, `color:${gi.ink}`);
  para(P, bx, yb - 40 - lh, bw, lic, { cls: 'b-small', size: 14, lh: 20, col: gi.quiet });
  return P.html(hex);
}

// ---------------------------------------------------------------- photography direction (05 Imagery)

// a sleeve band, opened out: it runs over the pack's top and under its base (the two folds), with its glued overlap at the foot.
// The subject is printed on the band; light, crop, colour and people are noted on the board, inside the pack's ghost outline
function photoDirection(ctx) {
  const P = new Pg(ctx, 'photography-1'), { R, B } = P, hex = R.side.hex, tx = R.textOn(hex), gi = R.groundText, lc = R.lineOn(hex), D = B.imagery.direction;
  const bx0 = 576, bx1 = 960, yt = 96, yb = 912, fa = 200, fb = 808, glue = 864;
  P.field(bx0, yt, bx1 - bx0, yb - yt, hex);
  P.line(L('cut', bx0 + 0.75, yt, bx0 + 0.75, yb, lc), L('cut', bx1 - 0.75, yt, bx1 - 0.75, yb, lc), L('cut', bx0, yt + 0.75, bx1, yt + 0.75, lc), L('cut', bx0, yb - 0.75, bx1, yb - 0.75, lc));
  P.line(L('fold', bx0, fa, bx1, fa, lc), L('fold', bx0, fb, bx1, fb, lc), L('seal', bx0 + 16, glue, bx1 - 16, glue, lc));
  // the pack the band goes round, as ghost on the board either side of it
  P.gh('fold', 'h', fa, 40, bx0); P.gh('fold', 'h', fb, 40, bx0); P.gh('fold', 'h', fa, bx1, 1040); P.gh('fold', 'h', fb, bx1, 1040);
  P.gh('cut', 'v', 40, fa, fb); P.gh('cut', 'v', 1040, fa, fb);
  // the subject on the band's face, between the folds
  const sw = bx1 - bx0 - 80;
  dispText(P, bx0 + 40, fa + 32, sw, D.subject, [56, 48, 44, 40, 36, 32, 28, 24, 22, 20], 20, tx.ink, { k: 1, maxH: fb - fa - 64 });
  // the four notes on the board, inside the pack's outline
  const nw = 456, notes = [['Light', D.light], ['Crop', D.crop], ['Colour', D.colour], ['People', D.people]].filter((n) => n[1]);
  const room = fb - fa - 64, size = notes.reduce((s, [, t]) => s + 28 + paraH(ctx, nw, t), 0) + (notes.length - 1) * 32 <= room ? 15 : 14;
  const lhh = size === 15 ? 24 : 20, hsum = notes.reduce((s, [, t]) => s + 28 + paraH(ctx, nw, t, { size, lh: lhh }), 0), gap = Math.min(72, Math.max(16, (room - hsum) / Math.max(1, notes.length - 1)));
  let y = fa + 32;
  notes.forEach(([k, t]) => { y += note(P, 80, y, nw, k, t, gi.ink, { size, lh: lhh }) + gap; });
  return P.html(hex);
}

// ---------------------------------------------------------------- shot list (05 Imagery)

// a map fold, opened out: a cover panel in the back colour counts the shots; the other panels hold one shot each, the photograph where there
// is one and a kiss-cut frame with the brief where there is not
function shotList(ctx) {
  const P = new Pg(ctx, 'photography-2'), { R, B } = P, hex = R.back.hex, tx = R.textOn(hex), gi = R.groundText, lc = R.lineOn(hex), gc = R.ghost;
  const shots = B.imagery.shots, shown = shots.slice(0, 6), n = shots.length, nReal = shots.filter((s) => s.photo).length;
  const yt = 96, yb = 912, cx1 = 340, gx0 = cx1, gx1 = 1040;
  P.field(40, yt, cx1 - 40, yb - yt, hex);
  P.line(L('cut', 40, yt + 0.75, cx1, yt + 0.75, lc), L('cut', 40, yb - 0.75, cx1, yb - 0.75, lc), L('cut', 40.75, yt, 40.75, yb, lc), L('fold', cx1 - 0.75, yt, cx1 - 0.75, yb, lc));
  const cols = Math.min(3, shown.length), rows = Math.ceil(shown.length / cols), pw = (gx1 - gx0) / cols, ph = (yb - yt) / rows;
  P.line(L('cut', gx0, yt + 0.75, gx1, yt + 0.75, gc), L('cut', gx0, yb - 0.75, gx1, yb - 0.75, gc), L('cut', gx1 - 0.75, yt, gx1 - 0.75, yb, gc));
  for (let c = 1; c < cols; c++) P.line(L('fold', gx0 + c * pw, yt, gx0 + c * pw, yb, gc));
  for (let r = 1; r < rows; r++) P.line(L('fold', gx0, yt + r * ph, gx1, yt + r * ph, gc));
  // the cover: the count is the one big thing; what is shot and what is still to shoot at its foot
  const cw = cx1 - 40 - 80;
  dispText(P, 80, 136, cw, `${n} shots`, [96, 88, 80, 72, 64, 56, 48, 40], 2, tx.ink);
  const foot = `${nReal ? `${nReal} photographed, ` : ''}${n - nReal} still to shoot.${n > shown.length ? ` The first ${shown.length} are on this sheet.` : ''} Each panel holds one shot.`;
  const fh = paraH(ctx, cw, foot);
  para(P, 80, yb - 40 - fh, cw, foot, { col: tx.ink });
  // the panels
  const pad = 28, iw = pw - 2 * pad;
  shown.forEach((s, i) => {
    const x = gx0 + (i % cols) * pw + pad, y0 = yt + Math.floor(i / cols) * ph + pad, inH = ph - 2 * pad;
    if (s.photo && !P.slot) {
      // the photograph takes the panel down to its caption
      const capH = 16 + paraH(ctx, iw, s.caption || s.alt, { size: 14, lh: 20, weight: ctx.weights.medium }) + (creditOf(s) ? 4 + paraH(ctx, iw, `Photo: ${creditOf(s)}`, { role: 'chrome', size: 14, lh: 20 }) : 0), imgH = Math.round(inH - capH);
      P.raw(`<div class="ph" style="left:${px(x)};top:${px(y0)};width:${px(iw)};height:${px(imgH)}">${ctx.photo(s.id, { pos: focusOf(s.id), style: 'position:absolute;left:0;top:0;width:100%;height:100%;outline:1px solid oklch(0 0 0 / .1);outline-offset:-1px' })}</div>`);
      let y = y0 + imgH + 16;
      y += para(P, x, y, iw, s.caption || s.alt, { cls: 'b-small b-med', size: 14, lh: 20, weight: ctx.weights.medium, col: gi.ink }) + 4;
      if (creditOf(s)) para(P, x, y, iw, `Photo: ${creditOf(s)}`, { cls: 'cap', role: 'chrome', size: 14, lh: 20, col: gi.quiet });
    } else {
      // an unshot panel: the whole panel is the kiss-cut frame the photograph will fill, with its brief written inside
      P.line(pathLine('seal', rect(x + 0.75, y0 + 0.75, iw - 1.5, inH - 1.5), gc));
      P.text(x + 20, y0 + 20, iw - 40, 20, 'cap', 'Still to shoot', `color:${gi.quiet}`);
      const brief = s.slot || s.alt || '', bw = iw - 40, room = inH - 52 - 20, big = paraH(ctx, bw, brief) <= room;
      para(P, x + 20, y0 + 52, bw, brief, { size: big ? 15 : 14, lh: big ? 24 : 20, col: gi.ink });
    }
  });
  return P.html(hex);
}

// ---------------------------------------------------------------- icon sheet (04 Icons)

// the largest grid of round kiss-cut stickers (columns from 3 up) that holds these icons in the box; null if even the densest does not
function iconGrid(n, w, h, maxCols) {
  for (let c = 3; c <= maxCols; c++) { const pw = w / c, ch = pw + 8, r = Math.ceil(n / c); if (r * ch <= h + 0.01) return { c, pw, ch }; }
  return null;
}
// each sticker is a round 32 px narrower than its column, with its file name 8 px under it and 16 px clear of the next row
function stickers(P, names, gx, gy, gw, gh, maxCols, tx, lc) {
  const g = iconGrid(names.length, gw, gh, maxCols), d = g.pw - 32, is = Math.max(24, Math.round(d * 0.4 / 2) * 2);
  names.forEach((name, i) => {
    const x = gx + (i % g.c) * g.pw, y = gy + Math.floor(i / g.c) * g.ch, cx = x + g.pw / 2, cy = y + d / 2;
    P.line(`<circle cx="${cx}" cy="${cy}" r="${d / 2 - 0.5}" fill="none" stroke="${lc}" stroke-width="1"/>`);
    P.text(cx - is / 2, cy - is / 2, is, is, 'kt-ico', icon(P.ctx, name, is), `color:${tx.ink}`);
    P.text(x + 4, y + d + 8, g.pw - 8, 16, 'kt-in', mono(name), `color:${tx.ink}`);
  });
}
// how many icons the first sheet's grid and each further sheet hold, at the densest grid allowed
const CAP1 = { w: 536, h: 576, cols: 5 }, CAPN = { w: 920, h: 576, cols: 8 };
const capOf = (C) => { const pw = C.w / C.cols, ch = pw + 8; return C.cols * Math.floor((C.h + 0.01) / ch); };

function iconSheets(ctx) {
  const set = iconSet(ctx), S = ctx.iconStyle, R0 = new Pg(ctx, 'icons').R, hex = R0.front.hex;
  const first = set.slice(1), cap1 = capOf(CAP1), capN = capOf(CAPN), pages = [];
  const chunks = [first.slice(0, cap1)]; for (let i = cap1; i < first.length; i += capN) chunks.push(first.slice(i, i + capN));
  const total = chunks.length;
  chunks.forEach((names, k) => {
    const P = new Pg(ctx, k ? `icons-${k + 1}` : 'icons', { no: KIT.length + k, folder: '04 Icons', title: total > 1 ? `Icon sheet ${k + 1} of ${total}` : 'Icon sheet' });
    const { R } = P, tx = R.textOn(hex), lc = R.lineOn(hex), gi = R.groundText, yt = 96, yb = 752;
    P.field(40, yt, 1000, yb - yt, hex);
    P.line(pathLine('cut', rect(40.75, yt + 0.75, 998.5, yb - yt - 1.5), lc));
    if (!k) {
      // the first icon as the one big sticker, so the stroke can be read; a crack-back slit parts it from the rest
      const big = 160, cx = 232, cy = 344, r = 132;
      P.line(`<circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="${lc}" stroke-width="1.5"/>`, L('seal', 424, yt + 24, 424, yb - 24, lc));
      P.text(cx - big / 2, cy - big / 2, big, big, 'kt-ico', icon(ctx, set[0], big), `color:${tx.ink}`);
      P.text(80, cy + r + 32, 304, 16, '', mono(`${set[0]}.svg`), `color:${tx.ink}`);
      para(P, 80, cy + r + 56, 304, `Shown at ${big} px. Drawn at 24 px with a ${S.stroke} px stroke.`, { cls: 'b-small', size: 14, lh: 20, col: tx.ink });
      stickers(P, names, 464, 136, CAP1.w, CAP1.h, CAP1.cols, tx, lc);
    } else stickers(P, names, 80, 136, CAPN.w, CAPN.h, CAPN.cols, tx, lc);
    // under the sheet: stroke, colour, files and licence
    const ny = yb + 40, nw = 224, xs = [40, 299, 558, 816];
    note(P, xs[0], ny, nw, 'Stroke and corners', `${S.stroke} px at 24 px, with ${S.join} joins and ${S.cap} ends, to match the corners on the brand’s controls.`, gi.ink);
    note(P, xs[1], ny, nw, 'Colour', 'Each file draws in currentColor, so an icon takes the colour of the text beside it.', gi.ink);
    note(P, xs[2], ny, nw, 'Files', '', gi.ink, { html: { s: `${set.length} SVG files in ${mono('04 Icons')}, each 24 by 24 px.`, plain: `${set.length} SVG files in 04 Icons, each 24 by 24 px.` } });
    note(P, xs[3], ny, nw, 'Licence', '', gi.ink, { html: { s: `Lucide, under the ISC licence. The notice is in ${mono('LICENSE.txt')}.`, plain: 'Lucide, under the ISC licence. The notice is in LICENSE.txt.' } });
    pages.push(P.html(hex));
  });
  return pages;
}

// ---------------------------------------------------------------- sheets

export function sheets(ctx) {
  return { palette: [swatchSheet(ctx)], typefaces: [typeSheet(ctx)], photography: [photoDirection(ctx), shotList(ctx)], icons: iconSheets(ctx) };
}

// ---------------------------------------------------------------- css (every rule under .pg.kt)

export function css() {
  return `
.pg.kt .kt-logo svg{display:block}
.pg.kt .kt-ico svg{display:block}
.pg.kt .kt-in{text-align:center;white-space:nowrap}
.pg.kt .kt-al span{display:block;white-space:nowrap}
.pg.kt .photo-slot{box-sizing:border-box}
`;
}
