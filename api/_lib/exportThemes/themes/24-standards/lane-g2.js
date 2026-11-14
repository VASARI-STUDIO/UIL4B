// Theme 24, Standards, lane g2: the six logo pages (logo, logo-versions, clear-space, min-size, logo-grounds, logo-misuse).
// Each page is a drawing of the logo, measured in x by the theme's own device: dimension lines with slash ends, crop ticks round a
// drawing and the x-ruler lighting up the page's one hero. Nothing is numbered (spec 1, never-do 2) except folios and measurements.
// Every colour is a role or a brand colourway, every size is read from ctx.logo; brand strings are printed whole through A().
import { toOklch, fromOklch, hexToRgb } from '../../engine/color.js';
import { quietImg } from './photo-focus.js';
import { A, G, f2, pad3, xOf, fx, half, roles, wrap, loadFont, blk, fill, dimH, dimV, cropTicks, ruler, tab, head, page, colourwayFor, span } from './helpers.js';

const WORD = ['no', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve'];
const Word = (n) => { const w = WORD[n] || String(n); return w[0].toUpperCase() + w.slice(1); };
const pg = (ctx, id) => ctx.pages.find((q) => q.id === id);
const same = (a, b) => String(a).toLowerCase() === String(b).toLowerCase();
const WN = { 100: 'Thin', 200: 'Extra Light', 300: 'Light', 400: 'Regular', 500: 'Medium', 600: 'Semibold', 700: 'Bold', 800: 'Extra Bold', 900: 'Black' };
const bodyFont = (ctx) => loadFont((ctx.faces.find((f) => f.role === 'body' && f.weight === 400 && f.style !== 'italic') || ctx.faces.find((f) => f.role === 'body')).stem);

// the logo (showcase) or the theme's slot frame (slot edition), at a width; a frame too small for its label is left bare
function mark(ctx, id, w, cw, label) {
  const g = ctx.logo.geos[id], h = (w * g.h) / g.w;
  if (ctx.edition === 'slot') {
    const col = ctx.brand.logo.colourways[cw].name, lab = label && w >= 120 && h >= 30;
    return `<div class="slot-box c-micro${lab ? '' : ' g2-bare'}" style="width:${f2(w)}px;height:${f2(h)}px;color:${col}">${lab ? A(label) : ''}</div>`;
  }
  return `<div class="logo-box">${ctx.logo.svg(id, { colourway: cw, width: f2(w) })}</div>`;
}
const placed = (x, y, w, h, inner) => blk(f2(x), f2(y), f2(w), f2(h), '', inner);

// a brand colour's name from its hex (colours, then tones), so a caption says "Hull", never a hex
const nameOf = (ctx, hex) => ([...ctx.colours, ...ctx.tones].find((c) => same(c.hex, hex)) || { name: hex.toUpperCase() }).name;
const listAnd = (xs) => (xs.length <= 1 ? xs.join('') : `${xs.slice(0, -1).join(', ')} and ${xs[xs.length - 1]}`);
// the colours a colourway prints the primary in, in part order, once each ("Hull and Rope")
function inksOf(ctx, key) {
  const cw = ctx.brand.logo.colourways[key], hexes = [];
  for (const p of ctx.logo.geos.colour.parts) { const h = cw[p.role] || cw.name; if (!hexes.some((x) => same(x, h))) hexes.push(h); }
  return listAnd(hexes.map((h) => nameOf(ctx, h)));
}

export const css = () => `
.pg .g2-ex{font-family:var(--body);font-size:17px;line-height:24px;font-weight:400}
.pg .g2-reg{display:flex;justify-content:space-between;white-space:nowrap}
.pg .g2-reg .val{line-height:20px}
.pg .g2-bare{padding:0}
.pg .g2-cell{display:flex;align-items:center;justify-content:center}
.pg .g2-cell>svg.g2-bars{position:absolute;left:0;top:0}
.pg .g2-cell>div{position:relative}
.pg .g2-rot{transform:rotate(-8deg)}
.pg .g2-boxed{display:flex;padding:12px}
.pg .g2-band{overflow:hidden}
.pg .g2-band>img,.pg .g2-band>.photo-slot{position:absolute;left:0;top:0;width:100%;height:100%}
.pg .g2-band>.photo-slot{box-sizing:border-box}
.pg .g2-on{position:absolute;display:flex;align-items:center}
`;

export const guidelines = {
  // ---- logo: the primary in full colour across nine columns, measured (width, height and, in the showcase, cap height); the idea
  // it is drawn from set in the brand's body face beneath it, with the drawing's facts beside ----
  logo(ctx) {
    const R = roles(ctx), B = ctx.brand, L = ctx.logo, p = pg(ctx, 'logo'), sn = p.section.n, slot = ctx.edition === 'slot';
    const geo = L.geos.colour, cw = colourwayFor(ctx, R.ground);
    let LW = span(9), LH = (LW * geo.h) / geo.w;
    if (LH > 200) { LH = 200; LW = (LH * geo.w) / geo.h; }
    const LX = 56, LY = 248, k = LW / geo.w;
    const idea = wrap(bodyFont(ctx), B.logo.idea, 17, span(6)), IY = Math.round(LY + LH + 72), IH = idea.length * 24;
    const TX = G.col[7], TW = G.R - TX;
    const rows = slot ? [] : [['Wordmark', A(B.logo.showcase.wordmark)], ['Drawn in', `${A(B.fonts.display.family)} ${WN[ctx.weights.logo] || ctx.weights.logo}`], ['Proportion', `${(geo.w / geo.h).toFixed(2)} : 1`]];
    const table = rows.map(([a, b], i) => fill(TX, IY + i * 32, TW, 1, i ? R.hair : R.ink) + blk(TX, IY + i * 32 + 6, TW, 20, 'c-body g2-reg', `<span>${a}</span><span>${b}</span>`, `color:${R.ink}`)).join('')
      + (rows.length ? fill(TX, IY + rows.length * 32, TW, 1, R.hair) : '');
    const body = head(ctx, 'logo')
      + blk(56, 88, 380, 24, 'c-title', A(p.title), `color:${R.ink}`, 'h1')
      + blk(56, 120, 380, 60, 'c-body', `The primary logo in full colour, and the idea it is drawn from. The ${WORD[L.versions.length - 1]} other versions on the pages after this one all come from it.`, `color:${R.quiet}`, 'p')
      + placed(LX, LY, LW, LH, mark(ctx, 'colour', LW, cw, `Logo, ${fx(ctx, LW)} wide`))
      + blk(56, IY, span(6), IH + 4, 'g2-ex', A(B.logo.idea), `color:${R.ink}`, 'p')
      + table + tab(ctx, sn);
    const cap = (L.geo.cap || 0) * k;
    let svg = dimH(ctx, { x1: LX, x2: LX + LW, y: LY - 20, label: fx(ctx, LW), col: R.ink, qcol: R.quiet, obj: LY })
      + dimV(ctx, { x: 40, y1: LY, y2: LY + LH, label: fx(ctx, LH), col: R.ink, qcol: R.quiet, obj: LX, labelAt: 34 });
    if (!slot && cap > 0 && cap < LH) svg += dimV(ctx, { x: LX + LW + 16, y1: LY, y2: LY + cap, label: `${fx(ctx, cap)} cap height`, col: R.ink, qcol: R.quiet, obj: LX + LW, right: true, labelY: LY + cap / 2 + 4 });
    svg += ruler(ctx, { uid: 'g2l', live: [LX, LX + LW] });
    return page(ctx, 'logo', { bg: R.ground, body, svg });
  },

  // ---- logo-versions: the three lockups drawn at one scale on one baseline, each measured; beneath, the full logo in its four
  // colourways, each drawn on its own ground at the size of its clear zone, the zone marked with crop ticks ----
  'logo-versions'(ctx) {
    const R = roles(ctx), B = ctx.brand, L = ctx.logo, p = pg(ctx, 'logo-versions'), sn = p.section.n, cws = B.logo.colourways;
    const onG = colourwayFor(ctx, R.ground), lock = ['horizontal', 'stacked', 'symbol'], TW = 216, GAP = 48, HMAX = 148;
    // one scale for the three: the largest at which none passes HMAX tall and the row (each item at least TW wide for its text) fits the content width
    let s = Math.min(...lock.map((id) => HMAX / L.geos[id].h));
    const rowW = (sc) => lock.reduce((a, id) => a + Math.max(L.geos[id].w * sc, TW), 0) + GAP * (lock.length - 1);
    while (rowW(s) > G.W && s > 0.01) s *= 0.98;
    const LB = 248 + HMAX, hmax = Math.max(...lock.map((id) => L.geos[id].h * s));
    let x = G.L, body = '', svg = '', first = null, last = null;
    for (const id of lock) {
      const g = L.geos[id], lw = g.w * s, lh = g.h * s, cw = Math.max(lw, TW);
      body += placed(x, LB - lh, lw, lh, mark(ctx, id, lw, onG, L.labels[id]))
        + blk(x, LB + 24, cw, 20, 'c-name nw', A(L.labels[id]), `color:${R.ink}`, 'h2')
        + blk(x, LB + 44, cw, 60, 'c-body', A(B.logo.when[id] || ''), `color:${R.quiet}`, 'p');
      svg += dimH(ctx, { x1: x, x2: x + lw, y: LB - hmax - 20, label: fx(ctx, lw), col: R.ink, qcol: R.quiet, obj: LB - lh });
      if (first === null) first = x;
      last = x + lw; x += cw + GAP;
    }
    // the four colourways of the primary: a plate as wide as three columns, the logo inside it with its clear space on every side
    const ways = ['colour', 'mono-dark', 'mono-light', 'reversed'].filter((k) => cws[k]), u = L.geo.unit / L.geo.height;
    const pw = span(3), lh = pw / (L.geo.aspect + 2 * u), lw = lh * L.geo.aspect, X = u * lh, ph = lh + 2 * X, PY = 552;
    ways.forEach((k, i) => {
      const px = G.col[i * 3], cw = cws[k], bare = same(cw.ground, R.ground);
      body += (bare ? '' : fill(px, PY, pw, f2(ph), cw.ground))
        + placed(px + X, PY + X, lw, lh, mark(ctx, k, lw, k, L.labels[k]))
        + blk(px, Math.round(PY + ph + 16), pw, 20, 'c-name nw', A(L.labels[k]), `color:${R.ink}`, 'h2')
        + blk(px, Math.round(PY + ph + 36), pw, 60, 'c-body', A(B.logo.when[k] || ''), `color:${R.quiet}`, 'p');
      svg += cropTicks(px, PY, pw, ph, R.quiet);
    });
    body = head(ctx, 'logo-versions')
      + blk(56, 88, 380, 24, 'c-title', A(p.title), `color:${R.ink}`, 'h1')
      + blk(56, 120, 380, 60, 'c-body', `${Word(L.versions.length)} versions of one drawing. Above, the three lockups at one scale; below, the full logo in its ${WORD[ways.length]} colourways, each on its ground with its clear space.`, `color:${R.quiet}`, 'p')
      + body + tab(ctx, sn);
    svg += ruler(ctx, { uid: 'g2v', live: [first, last] });
    return page(ctx, 'logo-versions', { bg: R.ground, body, svg });
  },

  // ---- clear-space: the logo inside its clear zone, drawn as large as the sheet allows; two chains of dimensions (across the top
  // and down the right) give the margin, the logo and the margin again in x. The left column holds the margin at real sizes ----
  'clear-space'(ctx) {
    const R = roles(ctx), L = ctx.logo, p = pg(ctx, 'clear-space'), sn = p.section.n, m = L.minSize;
    const u = L.geo.unit / L.geo.height, a = L.geo.aspect, share = L.clearShare, cw = colourwayFor(ctx, R.ground);
    const ZL = G.col[3], ZRW = G.R - ZL - 72, ZMH = 440;
    const lh = Math.min(ZRW / (a + 2 * u), ZMH / (1 + 2 * u)), lw = lh * a, c = u * lh, ZW = lw + 2 * c, ZH = lh + 2 * c;
    const ZX = ZL, ZY = Math.round(232 + (ZMH - ZH) / 2), LX = ZX + c, LY = ZY + c;
    const one = (v) => (Math.round(v * 10) / 10).toFixed(1).replace(/\.0$/, '');
    const rows = [["Of the logo's height", `${share}%`], ['On this page', fx(ctx, c)], [`At ${m.screenPx} px wide`, `${one((m.screenPx / a) * u)} px`], [`At ${m.printMm} mm wide`, `${one((m.printMm / a) * u)} mm`]];
    const TY = G.bottom - rows.length * 32;
    const body = head(ctx, 'clear-space')
      + blk(56, 88, 226, 24, 'c-title', A(p.title), `color:${R.ink}`, 'h1')
      + blk(56, 120, 226, 120, 'c-body', `Keep the margin round the logo empty on all four sides: no type, no edge, no other mark. It is ${share}% of the logo's height deep.`, `color:${R.quiet}`, 'p')
      + rows.map(([k, v], i) => fill(56, TY + i * 32, 226, 1, i ? R.hair : R.ink) + blk(56, TY + i * 32 + 6, 226, 20, 'c-body g2-reg', `<span>${k}</span><span>${v}</span>`, `color:${R.ink}`)).join('')
      + fill(56, G.bottom, 226, 1, R.hair)
      // the zone's edge, a 1 px quiet line drawn on the boundary nothing may cross
      + fill(f2(ZX), ZY, f2(ZW), f2(ZH), 'transparent', `border:1px solid ${R.quiet}`)
      + placed(LX, LY, lw, lh, mark(ctx, 'colour', lw, cw, `Logo, ${fx(ctx, lw)} wide`))
      + tab(ctx, sn);
    const smallC = c < 8 * xOf(ctx);
    const hy = ZY - 20, vx = ZX + ZW + 20;
    let svg = '';
    // across the top: margin, logo, margin (a margin under 8x carries its label over its line)
    svg += dimH(ctx, { x1: ZX, x2: LX, y: hy, label: fx(ctx, c), col: R.ink, qcol: R.quiet, obj: ZY, above: smallC })
      + dimH(ctx, { x1: LX, x2: LX + lw, y: hy, label: fx(ctx, lw), col: R.ink, qcol: R.quiet, obj: LY })
      + dimH(ctx, { x1: LX + lw, x2: ZX + ZW, y: hy, label: fx(ctx, c), col: R.ink, qcol: R.quiet, obj: ZY, above: smallC });
    // down the right: margin, logo, margin, labels to the right of the line
    svg += dimV(ctx, { x: vx, y1: ZY, y2: LY, label: fx(ctx, c), col: R.ink, qcol: R.quiet, obj: ZX + ZW, right: true, labelY: ZY + c / 2 + 4 })
      + dimV(ctx, { x: vx, y1: LY, y2: LY + lh, label: fx(ctx, lh), col: R.ink, qcol: R.quiet, obj: LX + lw, right: true, labelY: LY + lh / 2 + 4 })
      + dimV(ctx, { x: vx, y1: LY + lh, y2: ZY + ZH, label: fx(ctx, c), col: R.ink, qcol: R.quiet, obj: ZX + ZW, right: true, labelY: LY + lh + c / 2 + 4 });
    svg += ruler(ctx, { uid: 'g2c', live: [ZX, ZX + ZW] });
    return page(ctx, 'clear-space', { bg: R.ground, body, svg });
  },

  // ---- min-size: two rows drawn at actual size, a pixel to the pixel and a millimetre to the millimetre. Each row starts with the
  // smallest the logo may be set and doubles twice; the ruler lights up the smallest on screen ----
  'min-size'(ctx) {
    const R = roles(ctx), L = ctx.logo, p = pg(ctx, 'min-size'), sn = p.section.n, m = L.minSize, a = L.geo.aspect, cw = colourwayFor(ctx, R.ground);
    const mm = 96 / 25.4, steps = [1, 2, 4], GAP = 96;
    const rowsD = [
      { title: 'On screen', line: `Never narrower than ${m.screenPx} px.`, unit: 'px', v: m.screenPx, px: m.screenPx, h: `${m.screenH} px` },
      { title: 'In print', line: `Never narrower than ${m.printMm} mm.`, unit: 'mm', v: m.printMm, px: m.printMm * mm, h: `${m.printH} mm` },
    ];
    let y = 216, body = '', svg = '';
    for (const r of rowsD) {
      const top = y + 56, bh = (4 * r.px) / a, base = Math.round(top + bh);
      body += blk(56, y, 400, 16, 'c-head nw', r.title, `color:${R.ink}`, 'h2')
        + blk(56, y + 20, 400, 20, 'c-body nw', r.line, `color:${R.quiet}`, 'p');
      let x = G.L;
      steps.forEach((k, i) => {
        const w = r.px * k, h = w / a, lab = `${half(r.v * k)} ${r.unit}`;
        body += placed(x, base - h, w, h, mark(ctx, 'colour', w, cw, `Logo, ${lab}`));
        svg += dimH(ctx, { x1: x, x2: x + w, y: base + 16, label: lab, col: i ? R.quiet : R.ink, qcol: R.quiet, obj: base });
        if (!i) svg += dimV(ctx, { x: x + w + 16, y1: base - h, y2: base, label: r.h, col: R.ink, qcol: R.quiet, obj: x + w, right: true, labelY: base - h / 2 + 4 });
        x += w + GAP;
      });
      y = base + 72;
    }
    body = head(ctx, 'min-size')
      + blk(56, 88, 380, 24, 'c-title', A(p.title), `color:${R.ink}`, 'h1')
      + blk(56, 120, 380, 60, 'c-body', 'Drawn at actual size: a pixel to the pixel, a millimetre to the millimetre. The first in each row is the smallest allowed; each after it doubles.', `color:${R.quiet}`, 'p')
      + body + tab(ctx, sn);
    svg += ruler(ctx, { uid: 'g2m', live: [G.L, G.L + m.screenPx] });
    return page(ctx, 'min-size', { bg: R.ground, body, svg });
  },

  // ---- logo-grounds: a stack of fields bled off the right edge, one for each ground the logo may sit on (a photograph first, the page's
  // own ground last), the logo at one width on each; a ruled register on the left names each field level with it ----
  'logo-grounds'(ctx) {
    const R = roles(ctx), B = ctx.brand, L = ctx.logo, p = pg(ctx, 'logo-grounds'), sn = p.section.n, cws = B.logo.colourways, keys = Object.keys(cws);
    // one colourway per ground: full colour and reversed first, then the brand's own, then the monos; the page's ground goes last
    const order = ['colour', 'reversed', ...keys.filter((k) => !['colour', 'reversed', 'mono-dark', 'mono-light'].includes(k)), 'mono-dark', 'mono-light'].filter((k) => cws[k]);
    const grounds = [];
    for (const k of order) if (!grounds.some((g) => same(g.hex, cws[k].ground))) grounds.push({ hex: cws[k].ground, key: k });
    grounds.sort((g1, g2) => (same(g1.hex, R.ground) ? 1 : 0) - (same(g2.hex, R.ground) ? 1 : 0));
    const gs = grounds.slice(0, 5), shot = B.imagery.shots.find((s) => s.photo) || B.imagery.shots[0], photoKey = cws['mono-light'] ? 'mono-light' : gs[0].key;
    const bands = [{ photo: true, key: photoKey }, ...gs];
    const BX = 486, Y0 = 216, BH = (G.bottom - Y0) / bands.length, PAD = 56;
    const LW = Math.min(352, BH * 0.44 * L.geo.aspect), LH = LW / L.geo.aspect;
    const tabMid = G.top + (sn - 1) * G.tabPitch + G.tabH / 2;
    let body = '', inv = false;
    bands.forEach((b, i) => {
      const y = Y0 + i * BH, mid = y + BH / 2;
      if (b.photo) {
        // the tab sits on the photograph's dark edge or a dark slot, so it turns to the ground colour
        if (tabMid >= y && tabMid < y + BH) inv = true;
        body += `<div class="a g2-band" style="left:${BX}px;top:${f2(y)}px;width:${ctx.size.w - BX}px;height:${f2(BH)}px;background:${R.dark}">`
          + (shot.photo ? quietImg(ctx, shot, ctx.size.w - BX, BH) : ctx.photo(shot.id, { slotNote: false, style: `border:1.5px dashed ${R.darkQuiet}` })) + '</div>';
      } else {
        body += fill(BX, f2(y), ctx.size.w - BX, f2(BH), b.hex);
        if (tabMid >= y && tabMid < y + BH && same(b.hex, R.dark)) inv = true;
      }
      body += placed(BX + PAD, mid - LH / 2, LW, LH, mark(ctx, 'colour', LW, b.key, `Logo, ${fx(ctx, LW)} wide`));
      // the register row: a rule level with the field's top edge, the ground's name and what the logo is printed in, centred on the field
      const name = b.photo ? 'On a photo' : `On ${nameOf(ctx, b.hex)}`;
      const text = b.photo ? (B.logo.when[b.key] || `${L.labels[b.key] || ''}.`) : `Logo in ${inksOf(ctx, b.key)}.`;
      body += fill(56, f2(y), BX - 56, 1, i ? R.hair : R.ink)
        + blk(56, Math.round(mid - 30), BX - 80, 20, 'c-name nw', A(name), `color:${R.ink}`, 'h2')
        + blk(56, Math.round(mid - 10), BX - 80, 40, 'c-body', A(text), `color:${R.quiet}`, 'p');
    });
    body = head(ctx, 'logo-grounds')
      + blk(56, 88, 380, 24, 'c-title', A(p.title), `color:${R.ink}`, 'h1')
      + blk(56, 120, 380, 60, 'c-body', `The logo on every ground it may sit on: ${WORD[gs.length]} brand colours and a photograph. Each field takes the colourway drawn for it, at one width.`, `color:${R.quiet}`, 'p')
      + body + fill(56, G.bottom, BX - 56, 1, R.ink) + tab(ctx, sn, { inverted: inv });
    // the ruler runs on the page ground under the last field
    const svg = ruler(ctx, { uid: 'g2g', live: [BX + PAD, BX + PAD + LW] });
    return page(ctx, 'logo-grounds', { bg: R.ground, body, svg });
  },

  // ---- logo-misuse: a register of six wrong drawings. Each is done as it would be done wrong, framed in crop ticks and struck through,
  // with the rule beside it and what was changed, measured ----
  'logo-misuse'(ctx) {
    const R = roles(ctx), B = ctx.brand, L = ctx.logo, p = pg(ctx, 'logo-misuse'), sn = p.section.n, slot = ctx.edition === 'slot';
    const a = L.geo.aspect, cwKey = colourwayFor(ctx, R.ground), cw = B.logo.colourways[cwKey];
    const DX = G.col[3], DW = span(3), RY = 88, RH = 104, CH = 80, NX = G.col[6], MX = G.col[9];
    const lw = Math.min(184, 44 * a), lh = lw / a;
    // a colour that is not the brand's: the field's hue turned 150 degrees, at a middle lightness
    const f = toOklch(R.field), wrong = fromOklch(0.55, Math.max(0.12, f.C), (f.H + 150) % 360);
    const shadow = hexToRgb(R.ink).join(','), SH = 6, BAR = 6, cols = B.colours;
    const svgOf = (w, h, fillHex) => {
      if (slot) return `<div class="slot-box g2-bare" style="width:${f2(w)}px;height:${f2(h)}px;color:${fillHex || cw.name}"></div>`;
      let s = L.svg('colour', { colourway: cwKey, width: f2(w), fill: fillHex });
      if (Math.abs(h - (w / a)) > 0.5) s = s.replace(/height="[\d.]+"/, `height="${f2(h)}"`).replace('<svg ', '<svg preserveAspectRatio="none" ');
      return `<div class="logo-box">${s}</div>`;
    };
    const bars = `<svg class="g2-bars" width="${DW}" height="${CH}" aria-hidden="true">${Array.from({ length: Math.ceil(DW / BAR) }, (_, i) => `<rect x="${i * BAR}" y="0" width="${BAR}" height="${CH}" fill="${cols[i % cols.length].hex}"/>`).join('')}</svg>`;
    const items = [
      ['Stretched', 'Scale it from a corner, so the width and height change together.', 'Drawn at 120% of its width and 70% of its height.', svgOf(lw * 1.2, lh * 0.7)],
      ['Recoloured', `Use a version from page ${pad3(ctx.pageNo('logo-versions'))}, in its own colours.`, `Printed in <span class="val">${A(wrong)}</span>, a colour from outside the palette.`, svgOf(lw, lh, wrong)],
      ['Rotated', 'Set it level with the page and upright.', 'Turned 8° anticlockwise.', `<div class="g2-rot">${svgOf(lw, lh)}</div>`],
      ['Effects', 'Print it flat: no shadow, glow or bevel.', `A shadow set ${fx(ctx, SH)} down and ${fx(ctx, SH)} to the right.`, `<div style="filter:drop-shadow(${SH}px ${SH}px 3px rgba(${shadow},0.45))">${svgOf(lw, lh)}</div>`],
      ['Busy ground', 'Put it on a flat brand colour or a quiet part of a photograph.', `Laid over bars of all ${WORD[cols.length] || cols.length} brand colours, each ${fx(ctx, BAR)} wide.`, null],
      ['Outlined or boxed', 'Leave it open: no box, frame or keyline round it.', `Boxed in a ${fx(ctx, 2)} keyline, ${fx(ctx, 12)} off the logo.`, `<div class="g2-boxed" style="border:2px solid ${cw.name}">${svgOf(lw - 40, (lw - 40) / a)}</div>`],
    ];
    let body = '', svg = '';
    items.forEach(([name, rule, meas, art], i) => {
      const y = RY + i * RH, cy = y + 12;
      const inner = art === null ? `${bars}<div>${svgOf(lw, lh)}</div>` : `<div>${art}</div>`;
      body += fill(DX, y, G.R - DX, 1, i ? R.hair : R.ink)
        + `<div class="a g2-cell" style="left:${DX}px;top:${cy}px;width:${DW}px;height:${CH}px">${inner}</div>`
        + blk(NX, y + 12, span(3), 20, 'c-name nw', name, `color:${R.ink}`, 'h2')
        + blk(NX, y + 32, span(3), 60, 'c-body', rule, `color:${R.ink}`, 'p')
        + blk(MX, y + 12, span(3), 80, 'c-body', meas, `color:${R.quiet}`, 'p');
      // the strike: corner to corner across the drawing, inside its crop ticks
      svg += cropTicks(DX, cy, DW, CH, R.quiet)
        + `<path d="M${DX} ${cy}L${DX + DW} ${cy + CH}M${DX} ${cy + CH}L${DX + DW} ${cy}" stroke="${R.ink}" stroke-width="1.5" fill="none"/>`;
    });
    body = head(ctx, 'logo-misuse')
      + blk(56, 88, 226, 24, 'c-title', A(p.title), `color:${R.ink}`, 'h1')
      + blk(56, 120, 226, 140, 'c-body', `${Word(items.length)} ways the logo goes wrong. Each is drawn as it would be done, struck through, and measured against the file.`, `color:${R.quiet}`, 'p')
      + blk(56, G.bottom - 60, 226, 60, 'c-body', 'Take the logo from the logo folder and place it as supplied. Change its size only.', `color:${R.ink}`, 'p')
      + body + fill(DX, RY + items.length * RH, G.R - DX, 1, R.ink) + tab(ctx, sn);
    svg += ruler(ctx, { uid: 'g2x', live: [DX, DX + DW] });
    return page(ctx, 'logo-misuse', { bg: R.ground, body, svg });
  },
};
