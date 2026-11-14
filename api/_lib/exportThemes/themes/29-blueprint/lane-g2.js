// Theme 29 (Blueprint), lane g2: the logo pages (logo, logo-versions, clear-space, min-size, logo-grounds, logo-misuse).
// Each is a drawing sheet doing a drafter's job: a general arrangement of the mark, a schedule of versions, a clearance detail, an enlarged
// detail at minimum size, a finishes sheet for grounds, and a sheet of voided details. Every logo is placed and measured by its ink (lane-g2-ink.js),
// never its declared box, so a redline or a clear zone is true to the artwork. Redlines print only true sizes of what is drawn on this sheet.
import { esc as A } from '../../engine/brand.js';
import { capHeight } from '../../engine/logo.js';
import { loadFont } from '../../engine/nodeFont.js';
import { wrap, fitW, displayStem } from './measure.js';
import { sheet, reds, detailTag, PX, ZX, ZY, r1 } from './lane-g1-sheet.js';
import { placePhoto, artDoc, isCourier } from './scenes.js';
import { inkOf } from './lane-g2-ink.js';

const CHIVO = 'Chivo-400';
const mm = (px) => px / PX;
// a size in mm or px as a drawing prints it: whole when it is within a twentieth of whole, else to one place
const fmt = (v) => (Math.abs(v - Math.round(v)) < 0.05 ? String(Math.round(v)) : v.toFixed(1));
const stemOf = (ctx, role, w) => (ctx.faces.find((f) => f.role === role && f.weight === w && f.style !== 'italic') || ctx.faces.find((f) => f.role === role)).stem;
const linesOf = (stem, text, size, w) => wrap(stem, text, size, w - 6).length;
function lead(ctx) {
  const t = ctx.brand.type.scale.find((x) => x.token === 'lead') || { size: 24, line: 32 };
  return { size: t.size, line: Math.round(t.line < 4 ? t.line * t.size : t.line) };
}
const colourOf = (ctx, hex) => ctx.colours.find((c) => c.hex.toUpperCase() === String(hex).toUpperCase());
const notes = (x, y, w, items, gap = 12) => `<div class="a" style="left:${r1(x)}px;top:${r1(y)}px;width:${r1(w)}px;display:flex;flex-direction:column;gap:${gap}px">${items.map((t, i) => `<div style="display:grid;grid-template-columns:24px 1fr"><span class="c-mono" style="line-height:20px">${i + 1}</span><p class="c-note">${A(t)}</p></div>`).join('')}</div>`;
const svgLayer = (s) => `<svg class="a" style="left:0;top:0" width="1587" height="1123" viewBox="0 0 1587 1123" fill="none" aria-hidden="true">${s}</svg>`;

// A logo drawn at k px per logo unit with its ink's top left at (inkX, inkY), in the coordinates of org (a field's corner, or the page).
// Returns the markup and the ink rectangle in those same coordinates.
function logoAt(ctx, id, k, inkX, inkY, opts = {}) {
  const g = ctx.logo.geos[id], i = inkOf(ctx, id), w = r1(g.w * k), kk = w / g.w;
  const x = inkX - i.x1 * kk, y = inkY - i.y1 * kk;
  const html = `<div class="a g2l" style="left:${r1(x)}px;top:${r1(y)}px;width:${w}px">${ctx.logo.html(id, { width: w, ...opts })}</div>`;
  return { html, w, k: kk, ink: { x1: inkX, y1: inkY, x2: inkX + i.w * kk, y2: inkY + i.h * kk, w: i.w * kk, h: i.h * kk } };
}
// the scale that fits a version's ink inside maxW by maxH
const fitK = (ctx, id, maxW, maxH) => { const i = inkOf(ctx, id); return Math.min(maxW / i.w, maxH / i.h); };

// drafting marks round an artwork: an L bracket at each ink corner, 6 px clear of it
function corners(I, stroke = 'var(--ink)') {
  const a = 14, o = 6, P = [[I.x1 - o, I.y1 - o, 1, 1], [I.x2 + o, I.y1 - o, -1, 1], [I.x2 + o, I.y2 + o, -1, -1], [I.x1 - o, I.y2 + o, 1, -1]];
  return P.map(([x, y, sx, sy]) => `<path d="M${r1(x + sx * a)} ${r1(y)}H${r1(x)}V${r1(y + sy * a)}" stroke="${stroke}" stroke-width="1"/>`).join('');
}
// a centre line, the drafter's long and short dash, broken where it would cross the artwork
const centre = (x1, y1, x2, y2) => `<path d="M${r1(x1)} ${r1(y1)}L${r1(x2)} ${r1(y2)}" stroke="var(--quiet)" stroke-width="1" stroke-dasharray="22 5 4 5"/>`;

// the clear-space unit read in words: the cap height when the logo's unit is the cap height of the face it is outlined in
function unitWords(ctx) {
  const face = ctx.faces.find((x) => x.role === 'display' && x.style !== 'italic' && x.weight === ctx.weights.logo) || ctx.faces.find((x) => x.role === 'display');
  const cap = capHeight(loadFont(face.stem), 100), u = ctx.logo.geo.unit;
  return Math.abs(u / cap - 1) < 0.01 ? 'x is the cap height of the name' : 'x is the logo’s clear-space unit';
}

// the colourways that put the logo on a brand colour: one per ground, preferring the full colour and reversed versions, in palette order
function grounds(ctx) {
  const CW = ctx.brand.logo.colourways, keys = Object.keys(CW);
  const pref = [...['colour', 'reversed'].filter((k) => CW[k]), ...keys.filter((k) => !ctx.logo.versions.includes(k)), ...keys.filter((k) => ['mono-dark', 'mono-light'].includes(k))];
  const seen = new Map();
  for (const k of pref) { const c = colourOf(ctx, CW[k].ground); if (c && !seen.has(c.hex.toUpperCase())) seen.set(c.hex.toUpperCase(), { key: k, cw: CW[k], colour: c }); }
  return ctx.colours.map((c) => seen.get(c.hex.toUpperCase())).filter(Boolean).slice(0, 6);
}
// the colours a colourway draws the logo in, by name, the name's colour first
function inkNames(ctx, cw) {
  const hexes = [...new Set([cw.name, ...Object.entries(cw).filter(([k]) => k !== 'ground' && k !== 'name').map(([, v]) => v)].map((h) => String(h).toUpperCase()))];
  return hexes.map((h) => (colourOf(ctx, h) || { name: h }).name);
}
const andList = (a) => (a.length < 2 ? a.join('') : `${a.slice(0, -1).join(', ')} and ${a.at(-1)}`);

// the phone's screen on the kitchen bench: the brand's reversed ground, its horizontal logo and its primary line in the display face
function phoneScreen(ctx, aspect) {
  const B = ctx.brand, rev = B.logo.colourways.reversed, W = 390, H = Math.round(W / aspect), stem = displayStem(ctx), M = 32;
  const lw = fitW(ctx, 'horizontal', 190, 40), lh = (lw * ctx.logo.geos.horizontal.h) / ctx.logo.geos.horizontal.w;
  const size = [56, 52, 48, 44, 40, 36].find((s) => wrap(stem, B.lines.primary, s, W - 2 * M, -0.01).length <= 4) || 36;
  const n = wrap(stem, B.lines.primary, size, W - 2 * M, -0.01).length, lhh = Math.round(size * 1.05);
  const inner = `<div class="a" style="inset:0;background:${rev.ground};color:${rev.name}"></div>
<div class="a" style="left:${M}px;top:${96}px;width:${lw}px;color:${rev.name}">${ctx.logo.html('horizontal', { width: lw, colourway: 'reversed', color: rev.name, label: 'Logo' })}</div>
<p class="a bd" style="left:${M}px;top:${r1(H - 120 - n * lhh)}px;width:${W - 2 * M}px;font-size:${size}px;line-height:${lhh}px;white-space:normal;color:${rev.name}">${A(B.lines.primary)}</p>`;
  return { inner, w: W, h: H, lh };
}
// the back of a business card in the full colour colourway, the logo centred on its ground
function cardBack(ctx, aspect) {
  const cw = ctx.brand.logo.colourways.colour, W = 900, H = Math.round(W / aspect), i = inkOf(ctx, 'colour'), k = Math.min(420 / i.w, 150 / i.h);
  const P = logoAt(ctx, 'colour', k, (W - i.w * k) / 2, (H - i.h * k) / 2, { colourway: 'colour', color: cw.name, label: 'Logo' });
  return { inner: `<div class="a" style="inset:0;background:${cw.ground};color:${cw.name}"></div>${P.html}`, w: W, h: H };
}

export const guidelines = {
  // The general arrangement: the mark large on its own ground, centre lines and corner marks to the edge of its ink, the two overall sizes in red,
  // and its idea in the brand's own words under the drawing.
  logo(ctx) {
    const B = ctx.brand, L = ctx.logo, cw = B.logo.colourways.colour, Ld = lead(ctx), bstem = stemOf(ctx, 'body', 400);
    const F = { x: 40, y: 40, w: ZX[6] - 40, h: ZY[4] - 40 };
    const i = inkOf(ctx, 'colour'), k = fitK(ctx, 'colour', 820, 330);
    const P = logoAt(ctx, 'colour', k, (F.w - i.w * k) / 2, (F.h - i.h * k) / 2, { colourway: 'colour', color: cw.name, label: 'Your logo goes here' });
    const I = { x1: F.x + P.ink.x1, y1: F.y + P.ink.y1, x2: F.x + P.ink.x2, y2: F.y + P.ink.y2, w: P.ink.w, h: P.ink.h };
    const cx = (I.x1 + I.x2) / 2, cy = (I.y1 + I.y2) / 2;
    // the width is dimensioned just under the ink, so its extension lines stay short and read as the artwork's own; the centre line below
    // starts clear of its value
    const DW = 48;
    let svg = corners(I);
    svg += centre(F.x + 32, cy, I.x1 - 32, cy) + centre(I.x2 + 32, cy, F.x + F.w - 32, cy) + centre(cx, F.y + 32, cx, I.y1 - 32);
    if (F.y + F.h - 32 - (I.y2 + DW + 40) > 48) svg += centre(cx, I.y2 + DW + 40, cx, F.y + F.h - 32);
    svg += `<path d="M${r1(F.x + F.w) + 0.5} 40V${r1(F.y + F.h)}M40 ${r1(F.y + F.h) + 0.5}H${r1(F.x + F.w) + 1}" stroke="var(--ink)" stroke-width="1"/>`;
    const R = reds();
    R.dim([I.x1, I.y2], [I.x2, I.y2], [0, 1], { d: DW, value: fmt(mm(I.w)) });
    R.dim([I.x2, I.y1], [I.x2, I.y2], [1, 0], { d: F.x + F.w - I.x2 + 28, value: fmt(mm(I.h)), place: 'side' });
    // the idea, in the brand's body face at its lead size, stepped down only until it fits above the title block
    const IW = ZX[5] - 64, top = 828, size = [Ld.size, 22, 20, 18, 16].find((s) => linesOf(bstem, B.logo.idea, s, IW) * Math.round(s * 1.35) <= 947 - top) || 16;
    const html = `<div class="fld" style="left:40px;top:40px;width:${r1(F.w)}px;height:${r1(F.h)}px;background:${cw.ground};color:${cw.name}">${P.html}</div>${svgLayer(svg)}${R.svg()}
<span class="a c-label" style="left:64px;top:${top - 28}px">The idea</span><p class="a bn" style="left:64px;top:${top}px;width:${r1(IW)}px;font:400 ${size}px/${Math.round(size * 1.35)}px var(--body);color:var(--b-text);text-wrap:pretty">${A(B.logo.idea)}</p>
<h3 class="a c-head" style="left:${r1(ZX[6] + 24)}px;top:${top - 32}px">${A(L.labels.colour)}</h3><p class="a c-note" style="left:${r1(ZX[6] + 24)}px;top:${top - 4}px;width:329px">${A(B.logo.when.colour || '')} Drawn here at ${fmt(mm(I.w))} mm wide, measured to the edge of the artwork.</p>`;
    return sheet(ctx, 'logo', { drawing: 'The logo', scale: '[1:1], sizes in mm' }, html);
  },

  // The versions schedule: the four colourways of the primary logo as fields edge to edge across the top, then the three lockups drawn at one
  // scale on one datum, so their proportions compare true. Each version carries its detail tag and the brand's own line on when to use it.
  'logo-versions'(ctx) {
    const L = ctx.logo, B = ctx.brand, CW = B.logo.colourways;
    const topIds = ['colour', 'mono-dark', 'mono-light', 'reversed'].filter((id) => L.versions.includes(id));
    const FW = 1507 / topIds.length, FH = 300;
    let html = '', svg = '', n = 0;
    const title = (x, y, id, w) => detailTag(x + 14, y + 14, ++n) + `<h3 class="a c-head nw" style="left:${r1(x + 40)}px;top:${r1(y + 3)}px">${A(L.labels[id])}</h3><p class="a c-note" style="left:${r1(x + 40)}px;top:${r1(y + 32)}px;width:${r1(w - 40)}px">${A(B.logo.when[id] || '')}</p>`;
    topIds.forEach((id, j) => {
      const key = L.colourwayOf(id), cw = CW[key], fx = 40 + j * FW, i = inkOf(ctx, id), k = fitK(ctx, id, FW - 116, 112);
      const P = logoAt(ctx, id, k, (FW - i.w * k) / 2, (FH - i.h * k) / 2, { colourway: key, color: cw.name, label: L.labels[id] });
      html += `<div class="fld" style="left:${r1(fx)}px;top:40px;width:${r1(FW)}px;height:${FH}px;background:${cw.ground};color:${cw.name}">${P.html}</div>`;
      if (j) svg += `<path d="M${Math.round(fx) + 0.5} 40V${40 + FH}" stroke="var(--ink)" stroke-width="1"/>`;
      html += title(fx + 24, 40 + FH + 24, id, FW - 48);
    });
    svg += `<path d="M40 ${40 + FH + 0.5}H1547" stroke="var(--ink)" stroke-width="1.5"/>`;
    // the lockups: one scale for all three, shrunk until each column holds its note
    const low = ['horizontal', 'stacked', 'symbol'].filter((id) => L.versions.includes(id)), inks = low.map((id) => inkOf(ctx, id));
    const AW = 1459, NW = 300, GMIN = 72, GY = 792;
    let k = 248 / Math.max(...inks.map((i) => i.h));
    const colsAt = (kk) => inks.map((i) => Math.max(i.w * kk, NW));
    while (k > 0.05 && colsAt(k).reduce((a, b) => a + b, 0) + GMIN * (low.length - 1) > AW) k *= 0.98;
    const cols = colsAt(k), gap = Math.min(160, (AW - cols.reduce((a, b) => a + b, 0)) / Math.max(1, low.length - 1));
    let x = 64;
    html += `<span class="a c-label" style="left:64px;top:${GY - 16 - Math.max(...inks.map((i) => i.h * k)) - 40}px">Lockups, drawn at one scale on one datum</span>`;
    low.forEach((id, j) => {
      const i = inks[j], cw = CW[L.colourwayOf(id)];
      const P = logoAt(ctx, id, k, x, GY - 16 - i.h * k, { colourway: L.colourwayOf(id), color: cw.name, label: L.labels[id] });
      html += P.html + title(x, GY + 24, id, Math.min(cols[j], 360));
      x += cols[j] + gap;
    });
    svg += `<path d="M64 ${GY + 0.5}H1523" stroke="var(--ink)" stroke-width="1"/>`;
    return sheet(ctx, 'logo-versions', { drawing: 'Logo versions', scale: 'Not to scale' }, `${html}${svgLayer(svg)}`);
  },

  // A clearance detail: the zone round the ink hatched as a drafter hatches a keep-clear area, its edge a phantom line, the unit x dimensioned
  // in red at its true drawn size. Detail 2 holds the horizontal lockup, the one in this title block, to the same unit.
  'clear-space'(ctx) {
    const L = ctx.logo, B = ctx.brand, cw = B.logo.colourways.colour, u = L.geo.unit;
    const i1 = inkOf(ctx, 'colour'), share = Math.round((u / i1.h) * 100);
    let svg = `<defs><pattern id="g2-hatch" width="9" height="9" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><path d="M0 0V9" stroke="var(--hair)" stroke-width="1"/></pattern></defs>`, html = '';
    const R = reds();
    // one drawing: the logo with its ink at (x, y), the zone x clear of it on every side
    const draw = (id, k, x, y, n, dims) => {
      const P = logoAt(ctx, id, k, x + u * k, y + u * k, { colourway: 'colour', color: cw.name, label: n === 1 ? 'Your logo goes here' : 'Logo' }), I = P.ink, X = u * P.k;
      const Z = { x1: I.x1 - X, y1: I.y1 - X, x2: I.x2 + X, y2: I.y2 + X };
      svg += `<path d="M${r1(Z.x1)} ${r1(Z.y1)}H${r1(Z.x2)}V${r1(Z.y2)}H${r1(Z.x1)}ZM${r1(I.x1)} ${r1(I.y1)}V${r1(I.y2)}H${r1(I.x2)}V${r1(I.y1)}Z" fill="url(#g2-hatch)" fill-rule="evenodd"/>`;
      svg += `<rect x="${r1(I.x1)}" y="${r1(I.y1)}" width="${r1(I.w)}" height="${r1(I.h)}" stroke="var(--quiet)" stroke-width="1"/>`;
      svg += `<rect x="${r1(Z.x1)}" y="${r1(Z.y1)}" width="${r1(Z.x2 - Z.x1)}" height="${r1(Z.y2 - Z.y1)}" stroke="var(--ink)" stroke-width="1" stroke-dasharray="18 4 4 4 4 4"/>`;
      // the unit drawn as a square in each corner of the zone, marked x
      for (const [qx, qy] of [[Z.x1, Z.y1], [I.x2, Z.y1], [I.x2, I.y2], [Z.x1, I.y2]]) {
        svg += `<rect x="${r1(qx)}" y="${r1(qy)}" width="${r1(X)}" height="${r1(X)}" fill="var(--film)" stroke="var(--ink)" stroke-width="1"/>`;
        html += `<span class="a c-mono" style="left:${r1(qx)}px;top:${r1(qy + X / 2 - 8)}px;width:${r1(X)}px;text-align:center">x</span>`;
      }
      if (dims) {
        R.dim([Z.x1, Z.y2], [Z.x2, Z.y2], [0, 1], { d: 28, value: fmt(mm(Z.x2 - Z.x1)) });
        R.dim([Z.x2, Z.y1], [Z.x2, Z.y2], [1, 0], { d: 28, value: fmt(mm(Z.y2 - Z.y1)), place: 'side' });
        R.dim([Z.x1, Z.y1], [Z.x1 + X, Z.y1], [0, -1], { d: 20, value: fmt(mm(X)) });
      }
      // the title sits under the width dimension when there is one, never on it
      const ty = Z.y2 + (dims ? 64 : 32);
      html += P.html + detailTag(Z.x1 + 14, ty + 14, n) + `<h3 class="a c-head nw" style="left:${r1(Z.x1 + 40)}px;top:${r1(ty + 3)}px">${A(L.labels[id])}</h3>`;
      return Z;
    };
    const k1 = Math.min(840 / (i1.w + 2 * u), 400 / (i1.h + 2 * u));
    const Z1 = draw('colour', k1, 96, 104, 1, true);
    // detail 2 as wide as detail 1 where the height left allows it, set midway in that height
    const ih = inkOf(ctx, 'horizontal'), top2 = Z1.y2 + 140, room = 947 - 56 - top2;
    const k2 = Math.min(840 / (ih.w + 2 * u), Math.min(260, room) / (ih.h + 2 * u)), H2 = (ih.h + 2 * u) * k2;
    draw('horizontal', k2, 96, top2 + Math.max(0, (room - H2) / 2), 2, false);
    const items = [
      `${unitWords(ctx)}, ${share}% of the logo’s height. Keep x clear on all four sides.`,
      'Measure from the edge of the artwork, not from the box round it.',
      'Nothing enters the zone: no type, no edges, no other logos.',
      'Every version keeps the same x. Detail 2 is the horizontal lockup, as it sits in this title block.',
    ];
    html += `<h3 class="a c-head" style="left:${r1(ZX[6] + 24)}px;top:64px">General notes</h3>${notes(ZX[6] + 24, 102, 329, items, 16)}`;
    return sheet(ctx, 'clear-space', { drawing: 'Clear space', scale: '[1:1], sizes in mm' }, `${svgLayer(svg)}<div class="g2-tab">${R.svg()}</div>${html}`);
  },

  // Minimum size: the logo at its smallest print and screen widths, drawn at actual size, and the print one circled and enlarged as detail A,
  // dimensioned with its real sizes the way an enlarged detail is.
  'min-size'(ctx) {
    const L = ctx.logo, B = ctx.brand, cw = B.logo.colourways.colour, m = L.minSize, g = L.geos.colour, i = inkOf(ctx, 'colour');
    const R = reds(), opts = { colourway: 'colour', color: cw.name };
    let svg = '', html = '';
    // print: the box is printMm wide, so the ink is printMm x (ink / box) on a sheet printed at A3
    const kP = (m.printMm * PX) / g.w, pw = i.w * kP, ph = i.h * kP, pmW = mm(pw), pmH = mm(ph);
    // the detail circle is wide enough to hold the logo and both its dimensions, its top and left on the sheet's margin
    const cr = Math.max(Math.hypot(pw, ph) / 2 + 72, pw / 2 + 84), ccx = 64 + cr, ccy = 64 + cr;
    const P1 = logoAt(ctx, 'colour', kP, ccx - pw / 2, ccy - ph / 2, { ...opts, label: 'Logo' }), I1 = P1.ink;
    R.dim([I1.x1, I1.y1], [I1.x2, I1.y1], [0, -1], { d: 24, value: fmt(pmW) });
    R.dim([I1.x2, I1.y1], [I1.x2, I1.y2], [1, 0], { d: 24, value: fmt(pmH), place: 'side' });
    svg += `<circle cx="${r1(ccx)}" cy="${r1(ccy)}" r="${r1(cr)}" stroke="var(--ink)" stroke-width="1" stroke-dasharray="10 5"/>`;
    const ta = -Math.PI / 4, tx = ccx + (cr + 36) * Math.cos(ta), ty = ccy + (cr + 36) * Math.sin(ta);
    svg += `<path d="M${r1(ccx + cr * Math.cos(ta))} ${r1(ccy + cr * Math.sin(ta))}L${r1(tx - 14 * Math.cos(ta))} ${r1(ty - 14 * Math.sin(ta))}" stroke="var(--ink)" stroke-width="1"/>`;
    html += P1.html + detailTag(tx, ty, 'A');
    const capY = ccy + cr + 32;
    html += `<h3 class="a c-head" style="left:64px;top:${r1(capY)}px">Smallest in print</h3><p class="a c-note" style="left:64px;top:${r1(capY + 28)}px;width:330px">${fmt(pmW)} mm wide, ${fmt(pmH)} mm high. Print this sheet at A3, actual size, and the logo here measures ${fmt(pmW)} mm.</p>`;
    // screen: the box is screenPx wide, drawn at one CSS px to the px
    const kS = m.screenPx / g.w, sw = i.w * kS, sh = i.h * kS, sy = capY + 160;
    const P2 = logoAt(ctx, 'colour', kS, I1.x1, sy + 40, { ...opts, label: 'Logo' }), I2 = P2.ink;
    R.dim([I2.x1, I2.y1], [I2.x2, I2.y1], [0, -1], { d: 24, value: `${fmt(sw)} px` });
    R.dim([I2.x2, I2.y1], [I2.x2, I2.y2], [1, 0], { d: 24, value: `${fmt(sh)} px`, place: 'side' });
    html += P2.html + `<h3 class="a c-head" style="left:64px;top:${r1(I2.y2 + 32)}px">Smallest on screen</h3><p class="a c-note" style="left:64px;top:${r1(I2.y2 + 60)}px;width:330px">${fmt(sw)} px wide, ${fmt(sh)} px high, at one CSS pixel to the pixel.</p>`;
    // the schedule: the print minimum beside the screen one, each with the clear space it carries at that size, on the foot of the sheet
    const xP = mm(L.geo.unit * kP), xS = L.geo.unit * kS, AX = ZX[2] + 96, C1 = AX + 400, C2 = AX + 640, RP = 36;
    const rows = [
      ['Logo width', `${fmt(pmW)} mm`, `${fmt(sw)} px`],
      ['Logo height', `${fmt(pmH)} mm`, `${fmt(sh)} px`],
      ['Clear space x at this size', `${fmt(xP)} mm`, `${fmt(xS)} px`],
      ['Logo and clear space together', `${fmt(pmW + 2 * xP)} × ${fmt(pmH + 2 * xP)} mm`, `${fmt(sw + 2 * xS)} × ${fmt(sh + 2 * xS)} px`],
    ];
    const ST = Math.round(947 - 76 - rows.length * RP);
    html += `<h3 class="a c-head nw" style="left:${r1(AX)}px;top:${ST}px">Minimum sizes, print and screen</h3>`;
    svg += `<path d="M${r1(AX)} ${ST + 32.5}H1523" stroke="var(--ink)" stroke-width="1.5"/>`;
    html += `<span class="a c-label" style="left:${r1(C1)}px;top:${ST + 48}px">Print</span><span class="a c-label" style="left:${r1(C2)}px;top:${ST + 48}px">Screen</span>`;
    rows.forEach(([t, a, b], j) => {
      const y = ST + 76 + j * RP;
      html += `<p class="a c-note nw" style="left:${r1(AX)}px;top:${y + 8}px">${t}</p><p class="a c-note nw" style="left:${r1(C1)}px;top:${y + 8}px"><span class="v">${a}</span></p><p class="a c-note nw" style="left:${r1(C2)}px;top:${y + 8}px"><span class="v">${b}</span></p>`;
      svg += `<path d="M${r1(AX)} ${y + 0.5}H1523" stroke="var(--hair)" stroke-width="1"/>`;
    });
    // detail A: the print logo enlarged by a whole number, as large as the room above the schedule holds, its value clear of the frame,
    // set on the schedule's left edge and midway down that room
    const AWd = 1435 - AX, N = Math.max(2, Math.min(16, Math.floor(Math.min(AWd / pw, 400 / ph))));
    const eh = ph * N, ex = AX, room = ST - 56 - 64, block = 58 + eh + 48 + 56, ey = 64 + Math.max(0, (room - block) / 2) + 58;
    const P3 = logoAt(ctx, 'colour', kP * N, ex, ey, { ...opts, label: 'Your logo goes here' }), I3 = P3.ink;
    R.dim([I3.x1, I3.y1], [I3.x2, I3.y1], [0, -1], { d: 32, value: fmt(pmW) });
    R.dim([I3.x2, I3.y1], [I3.x2, I3.y2], [1, 0], { d: 32, value: fmt(pmH), place: 'side' });
    svg += corners(I3);
    const ay = I3.y2 + 48;
    html += P3.html + detailTag(ex + 14, ay + 14, 'A') + `<h3 class="a c-head nw" style="left:${r1(ex + 40)}px;top:${r1(ay + 3)}px">Detail A, smallest in print</h3><p class="a c-note nw" style="left:${r1(ex + 40)}px;top:${r1(ay + 32)}px">Enlarged <span class="v">${N}:1</span>. The sizes are the logo’s own at ${fmt(pmW)} mm.</p>`;
    svg += `<path d="M${r1(ex + 40)} ${r1(ay + 27)}H${r1(ex + 340)}" stroke="var(--ink)" stroke-width="1.5"/>`;
    return sheet(ctx, 'min-size', { drawing: 'Minimum size', scale: `[1:1], detail A [${N}:1]` }, `${svgLayer(svg)}${R.svg()}${html}`);
  },

  // A finishes sheet for grounds: the logo on a photograph of the brand at work fills the left of the sheet, and each brand colour it may sit on
  // is a field down the right edge, scheduled by name, hex and the colours the logo takes on it.
  'logo-grounds'(ctx) {
    const L = ctx.logo, B = ctx.brand, G = grounds(ctx), ml = B.logo.colourways['mono-light'] || B.logo.colourways.reversed, mlKey = B.logo.colourways['mono-light'] ? 'mono-light' : 'reversed';
    const cr = isCourier(ctx), id = cr ? 'kerb-crossing-phone' : 'room-kitchen-phone', sc = ctx.sceneInfo(id), q = sc.quads[0];
    const box = { x: 40, y: 40, w: ZX[5] - 40, h: 931 };
    const P = placePhoto(ctx, id, { 'screen-phone': artDoc(ctx, phoneScreen(ctx, q.aspect)) }, box, { focus: cr ? [560, 520] : [760, 560], alt: cr ? `${B.name} on a phone, held at a city crossing` : `${B.name} on a phone on a kitchen bench at dusk` });
    // the logo on the dark stone, right of the phone and below the keys: the quietest dark part of the picture
    const i = inkOf(ctx, mlKey), k = cr ? fitK(ctx, mlKey, 190, 70) : fitK(ctx, mlKey, 300, 96), a = P.map(cr ? [735, 500] : [880, 880]);
    // in the slot edition the photograph is an empty light frame, so the logo slot is drawn in ink
    const W = logoAt(ctx, mlKey, k, a[0], a[1], { colourway: mlKey, color: ctx.edition === 'slot' ? 'var(--ink)' : ml.name, label: 'Logo' });
    let html = P.html + W.html;
    html += `<div class="a g2-film" style="left:64px;bottom:176px;width:360px"><h3 class="c-head">On a photograph</h3><p class="c-note">${A(L.labels[mlKey])}. ${A(B.logo.when[mlKey] || '')}</p></div>`;
    // the fields: one per ground, stacked to the frame
    const FX = ZX[6], FW = 1547 - FX, FH = 931 / G.length;
    let svg = `<path d="M${Math.round(FX) + 0.5} 40V971" stroke="var(--ink)" stroke-width="1"/>`;
    G.forEach(({ key, cw, colour }, j) => {
      const fy = 40 + j * FH, kk = fitK(ctx, 'colour', FW - 96, Math.min(FH * 0.42, 104)), ii = inkOf(ctx, 'colour');
      const F = logoAt(ctx, 'colour', kk, (FW - ii.w * kk) / 2, (FH - ii.h * kk) / 2, { colourway: key, color: cw.name, label: 'Logo' });
      html += `<div class="fld" style="left:${r1(FX)}px;top:${r1(fy)}px;width:${r1(FW)}px;height:${r1(FH)}px;background:${cw.ground};color:${cw.name}">${F.html}</div>`;
      if (j) svg += `<path d="M${r1(FX)} ${Math.round(fy) + 0.5}H1547" stroke="var(--ink)" stroke-width="1"/>`;
      const lab = L.labels[key] ? `${L.labels[key]}. ` : '';
      html += `<h3 class="a c-head" style="left:${r1(ZX[5] + 24)}px;top:${r1(fy + 20)}px;width:140px">On ${A(colour.name)}</h3><span class="a c-mono" style="left:${r1(ZX[5] + 24)}px;top:${r1(fy + 46)}px">${A(colour.hex.toUpperCase())}</span><p class="a c-note" style="left:${r1(ZX[5] + 24)}px;top:${r1(fy + 70)}px;width:140px">${A(`${lab}Logo in ${andList(inkNames(ctx, cw))}.`)}</p>`;
    });
    return sheet(ctx, 'logo-grounds', { drawing: 'Grounds', scale: 'Not to scale' }, `${html}${svgLayer(svg)}`);
  },

  // Voided details: each misuse drawn and struck through corner to corner in ink, the way a drafter voids a detail. The busy ground is the one
  // photograph, a workbench with the brand's card on it; the other five are a schedule down the right.
  'logo-misuse'(ctx) {
    const L = ctx.logo, B = ctx.brand, cw = B.logo.colourways.colour, i = inkOf(ctx, 'colour');
    const cr = isCourier(ctx), id = cr ? 'kerb-crossing-phone' : 'bench-cards-offcuts', sc = ctx.sceneInfo(id), back = sc.surfaces.indexOf('card-back');
    const box = { x: 40, y: 40, w: ZX[4] - 40, h: 931 };
    // a courier brand's busy ground is the zebra crossing beside the phone; the joiner's bench stays with the brand it fits
    const P = cr ? placePhoto(ctx, id, { 'screen-phone': artDoc(ctx, phoneScreen(ctx, sc.quads[0].aspect)) }, box, { focus: [512, 600], alt: `${B.name} on a phone, held at a city crossing` })
      : placePhoto(ctx, id, { 'card-back': artDoc(ctx, cardBack(ctx, sc.quads[back].aspect)) }, box, { scale: 1, focus: [box.w / 2, box.h / 2], alt: `${B.name}’s card on a workbench among shavings` });
    const void_ = (x1, y1, x2, y2, w = 1.5) => `<path d="M${r1(x1)} ${r1(y1)}L${r1(x2)} ${r1(y2)}M${r1(x2)} ${r1(y1)}L${r1(x1)} ${r1(y2)}" stroke="var(--ink)" stroke-width="${w}"/>`;
    // the busy ground: the logo centred on the curled shavings at the top of the bench (scene px about 470, 70), where the grain, the curls
    // and their shadows all cross it
    const kb = cr ? fitK(ctx, 'colour', 170, 56) : fitK(ctx, 'colour', 400, 110), c = P.map(cr ? [880, 350] : [470, 70]), bw = i.w * kb, bh = i.h * kb;
    const Bz = logoAt(ctx, 'colour', kb, c[0] - bw / 2, Math.max(box.y + 24, c[1] - bh / 2), { colourway: 'colour', color: cw.name, label: 'Logo' });
    let svg = void_(Bz.ink.x1 - 16, Bz.ink.y1 - 16, Bz.ink.x2 + 16, Bz.ink.y2 + 16, 2), html = P.html + Bz.html;
    const cap = (n, t, c) => `<div style="display:grid;grid-template-columns:40px 1fr;align-items:start"><span class="c-mono" style="width:28px;height:28px;border:1px solid var(--ink);border-radius:50%;text-align:center;line-height:26px">${n}</span><div><h3 class="c-head">${t}</h3><p class="c-note" style="margin-top:4px">${c}</p></div></div>`;
    // the caption stands under the logo it describes (beside the phone on a courier's crossing), not at the foot of the picture
    const capAt = cr ? `left:${r1(P.map([765, 0])[0])}px;top:${r1(Bz.ink.y2 + 40)}px;width:${r1(box.x + box.w - P.map([765, 0])[0] - 16)}px` : `left:64px;top:${r1(Bz.ink.y2 + 40)}px;width:360px`;
    html += `<div class="a g2-film" style="${capAt}">${cap(1, 'Busy ground', 'Never on a busy photograph. Use mono light on a quiet part of one.')}</div>`;
    // a hue opposite the brand's action, as dark as it is or darker, so the wrong colour reads as wrong
    const o = ctx.C.toOklch(ctx.roles.light.action), wrong = ctx.C.fromOklch(Math.min(o.L, 0.5), Math.max(o.C, 0.1), (o.H + 180) % 360);
    const rgb = ctx.C.hexToRgb(cw.name).join(',');
    const RX = ZX[4], RH = 931 / 5, DW = 300, DH = RH - 64, w = r1(Math.min(220, (DH * 0.8 * i.w) / i.h, DW / 1.4));
    const box0 = (inner, sty = '') => `<div class="a" style="left:0;top:0;width:${DW}px;height:${DH}px;display:flex;align-items:center;justify-content:center"><div class="g2l" style="width:${w}px;color:${cw.name};${sty}">${inner}</div></div>`;
    const rows = [
      ['Stretched', 'Never squash or stretch it. Scale it evenly, both ways at once.', box0(L.forMisuse(w, { fill: cw.name }), 'transform:scale(1.4,0.66)')],
      ['Recoloured', 'Never recolour it. Use a colourway from the versions sheet.', box0(L.forMisuse(w, { fill: wrong }), `color:${wrong}`)],
      ['Rotated', 'Never tilt or turn it. It sits level with the page.', box0(L.forMisuse(w, { fill: cw.name }), 'transform:rotate(-12deg)')],
      ['Effects', 'No shadows, glows or bevels. The logo is flat colour.', box0(L.forMisuse(w, { fill: cw.name }), `filter:drop-shadow(6px 7px 4px rgba(${rgb},.5))`)],
      ['Outlined or boxed', 'No outlines, boxes or frames round it.', box0(L.forMisuse(w - 40, { fill: cw.name }), `outline:2px solid ${cw.name};outline-offset:14px;width:${w - 40}px`)],
    ];
    rows.forEach(([t, c, inner], j) => {
      const y = 40 + j * RH, dx = RX + 72, dy = y + 32;
      if (j) svg += `<path d="M${RX} ${Math.round(y) + 0.5}H1547" stroke="var(--ink)" stroke-width="1"/>`;
      html += `<div class="a" style="left:${r1(dx)}px;top:${r1(dy)}px;width:${DW}px;height:${r1(DH)}px">${inner}</div>`;
      svg += void_(dx, dy, dx + DW, dy + DH);
      html += detailTag(RX + 24 + 14, y + 32 + 14, j + 2) + `<h3 class="a c-head" style="left:${r1(ZX[6] + 24)}px;top:${r1(y + 32)}px">${t}</h3><p class="a c-note" style="left:${r1(ZX[6] + 24)}px;top:${r1(y + 60)}px;width:329px">${c}</p>`;
    });
    svg += `<path d="M${Math.round(RX) + 0.5} 40V971" stroke="var(--ink)" stroke-width="1"/>`;
    return sheet(ctx, 'logo-misuse', { drawing: 'Misuse', scale: 'Not to scale' }, `${html}${svgLayer(svg)}`);
  },
};

export function css() {
  return `.pg .g2l>svg{display:block;overflow:visible}
.pg .g2-tab .rv{background:var(--film);padding:2px 4px;margin:-2px -4px}
.pg .g2-film{background:var(--film);padding:12px 16px;display:flex;flex-direction:column;gap:4px}
`;
}
