// Theme 35, Dispatch: pages 8 to 16 (Logo: the mark, versions, space and size, misuse; Colour: palette, tints, pairs, values). 16:9 only.
// Families (none repeated beside it): DT direction of travel (mark), LS label stock (versions), QZ quiet zone (space), EX exception report (misuse),
// LP label proportion (palette), BY bays (tints), RD reading distance (pairs), DK docket (values).
// Kerbside's words come from showcase.js through copy(); a fallback here is neutral. A slot is set at its real size as ghost type with one mono note.
import { ratio, hexToRgb } from '../../engine/color.js';
import { timeOf, fullFolio, groundsOf, tones, onTone, mix, at, hr, vr, fill, svgAt, field, measure, word, page, n1, codeOf, consign } from './kit.js';
import { copy } from './showcase.js';

export const realOf = (ctx, s) => (typeof ctx.real === 'function' ? ctx.real(s) : String(s));
export const own = (ctx, s) => ctx.esc(realOf(ctx, s));
const slotOn = (ctx) => ctx.edition === 'slot';
const H1 = (txt, x = 48, y = 68, w = 640) => at(x, y, w, 52, `<h1 class="h1">${txt}</h1>`);

// a logo version at width w: the mark in the showcase, the engine's slot frame in a slot. { w, h, html }
export function logoAt(ctx, id, w, o = {}) {
  const g = ctx.logo.geos[id], h = (w * g.h) / g.w;
  const html = slotOn(ctx)
    ? ctx.logo.html(id, { width: w, color: o.color })
    : ctx.logo.svg(id, { width: w, colourway: o.colourway || ctx.logo.colourwayOf(id), fill: o.fill });
  return { w, h, html };
}
// the brand's colours: the ground (White) last, the rest in the order action, text, panel, then by share
const ROLES = ['action', 'text', 'panel'];
export function coloursBy(ctx) {
  const seen = new Set(), rank = (c) => { const i = ROLES.indexOf(c.role); return i < 0 ? 9 : i; };
  return [...ctx.colours].filter((c) => c.role !== 'label').sort((a, b) => rank(a) - rank(b) || b.share - a.share)
    .filter((c) => { const h = c.hex.toLowerCase(); if (seen.has(h)) return false; seen.add(h); return true; });
}
export const nameOf = (ctx, hex) => { const c = [...ctx.colours, ...(ctx.tones || [])].find((x) => x.hex && x.hex.toLowerCase() === String(hex).toLowerCase()); return c && c.name ? own(ctx, c.name) : String(hex).toUpperCase(); };
// whole-pixel sizes along a length, by share, none under `min`; the last takes the rounding
export function shareSizes(shares, len, min) {
  const n = shares.length, fixed = new Array(n).fill(false); let out = [];
  for (let k = 0; k <= n; k++) {
    const free = shares.reduce((a, v, i) => a + (fixed[i] ? 0 : v), 0) || 1, room = len - min * fixed.filter(Boolean).length;
    out = shares.map((v, i) => (fixed[i] ? min : (room * v) / free));
    const bad = out.findIndex((w, i) => !fixed[i] && w < min);
    if (bad < 0) break; fixed[bad] = true;
  }
  out = out.map(Math.round); out[n - 1] += len - out.reduce((a, b) => a + b, 0);
  return out;
}

export const guidelines = {
  // ---- 8 The mark (DT): the mark at 960 wide, its kerb leaving the tip as an 8 px route that runs into the stub ----
  mark(ctx) {
    const G = groundsOf(ctx), g = G.primary, t = tones(ctx, g), M = measure(ctx), slot = slotOn(ctx), W = 960, X = 48, E = ctx.esc;
    let html, h, stepY, ghostSize;
    if (!slot) {
      const lg = logoAt(ctx, 'colour', W, { colourway: 'on-signal' }), geo = ctx.logo.geo, sc = W / ctx.logo.geos.colour.w;
      html = lg.html; h = lg.h; stepY = geo.T ? (geo.cap + geo.gap + 1.5 * geo.T) * sc : h / 2;
    } else {
      const size = M.fit('Your wordmark', W, 400); h = M.cap * size; stepY = h / 2;
      html = null; ghostSize = size;
    }
    const Y = Math.max(176, 372 - stepY), tipY = Y + stepY;
    const mark = slot
      ? word(M, X, Y + h, 'Your wordmark', ghostSize, { style: 'color:var(--soft)' }) + at(X, Y + h + 20, 600, 16, '<span class="nt">Your mark, SVG.</span>')
      : at(X, Y, W, h, html);
    const route = fill(X + W - 2, tipY - 4, 1184 - (X + W - 2), 8, 'var(--ink)');
    const head = hr(48, 48, 1088) + H1('The mark');
    const note = at(48, 556, 560, 100, `<div class="h2">${E(copy(ctx, 'page.mark.title', 'The mark as drawn.'))}</div><div class="b" style="margin-top:10px">${E(copy(ctx, 'page.mark.text', 'Use the mark as drawn. Never redraw, stretch or recolour it.'))}</div>`);
    const sym = slot ? '' : (() => { const s = logoAt(ctx, 'symbol', 72 * ctx.logo.geos.symbol.w / ctx.logo.geos.symbol.h, { colourway: 'on-signal' }); return at(760, 568, s.w, s.h, s.html); })();
    const foot = hr(48, 528, 1088) + sym + at(760, slot ? 556 : 568 + 72 + 12, 360, 16, `<span class="lb">${E(ctx.logo.labels.symbol || 'Symbol')}</span>`);
    return page(ctx, 'mark', g, head + mark + route + foot + note);
  },

  // ---- 9 Versions (LS): four pieces of label stock at 1 px to 1 mm, standing on one shelf ----
  versions(ctx) {
    const G = groundsOf(ctx), g = G.panel, t = tones(ctx, g), E = ctx.esc, cws = ctx.brand.logo.colourways;
    const items = [
      { x: 48, w: 480, h: 320, id: 'colour', key: 'mono-light', mw: 360 },
      { x: 560, w: 352, h: 264, id: 'horizontal', key: 'on-signal', mw: 288 },
      { x: 944, w: 100, h: 150, id: 'stacked', key: 'colour', mw: 72 },
      { x: 1076, w: 60, h: 60, id: 'symbol', key: 'reversed', mw: 36 },
    ];
    const names = ['Sign', 'Panel', 'Label', 'Sticker'];
    const out = items.map((it, i) => {
      const key = cws[it.key] ? it.key : 'colour', cw = cws[key], top = 560 - it.h;
      const gt = tones(ctx, cw.ground), lg = logoAt(ctx, it.id, it.mw, { colourway: key, color: gt.ink });
      const inner = at((it.w - lg.w) / 2, (it.h - lg.h) / 2, lg.w, lg.h, lg.html);
      const cap = at(it.x, 580, 200, 40, `<div class="lb">${E(copy(ctx, `page.versions.${i}`, names[i]))}</div><div class="m" style="margin-top:2px">${it.w} x ${it.h} mm</div>`)
        + at(it.x, 624, 220, 16, `<span class="m q">${E(String(key).replace(/-/g, ' '))}</span>`);
      return field(ctx, it.x, top, it.w, it.h, cw.ground, inner, `box-shadow:inset 0 0 0 1px ${t.hair}`) + cap;
    }).join('');
    const head = hr(48, 48, 1088) + H1('Versions') + at(48, 124, 520, 44, `<div class="b">${E(copy(ctx, 'page.versions.text', 'Each version has a ground it is made for. Shown at one pixel to one millimetre.'))}</div>`);
    return page(ctx, 'versions', g, head + out + hr(48, 560, 1088));
  },

  // ---- 10 Space and size (QZ): the quiet zone hatched in the accent, and the smallest the mark is set ----
  space(ctx) {
    const G = groundsOf(ctx), g = G.surface, t = tones(ctx, g), E = ctx.esc, M = measure(ctx), W = 780, X0 = 48, Y0 = 188;
    const sc = W / ctx.logo.geos.colour.w, c = ctx.logo.geo.unit * sc, lg = logoAt(ctx, 'colour', W, { colourway: 'colour', color: t.ink });
    const bw = W + 2 * c, bh = lg.h + 2 * c;
    const hatch = svgAt(X0, Y0, bw, bh, `<defs><pattern id="ds-qz" width="8" height="8" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><path d="M0 0V8" stroke="${G.primary}" stroke-width="1"/></pattern></defs>`
      + `<path fill-rule="evenodd" fill="url(#ds-qz)" d="M0 0H${n1(bw)}V${n1(bh)}H0Z M${n1(c)} ${n1(c)}V${n1(c + lg.h)}H${n1(c + W)}V${n1(c)}Z"/>`
      + `<rect x=".5" y=".5" width="${n1(bw - 1)}" height="${n1(bh - 1)}" fill="none" stroke="${t.ink}" stroke-width="1"/><rect x="${n1(c + .5)}" y="${n1(c + .5)}" width="${n1(W - 1)}" height="${n1(lg.h - 1)}" fill="none" stroke="${t.hair}" stroke-width="1" stroke-dasharray="4 4"/>`);
    const dim = svgAt(X0, Y0 - 28, c, 16, `<path d="M.5 0V12M${n1(c - .5)} 0V12M0 6H${n1(c)}" stroke="${t.ink}" stroke-width="1" fill="none"/>`) + at(X0 + c + 8, Y0 - 32, 40, 16, '<span class="m">c</span>');
    // the ladder: the mark at three widths, the last the smallest
    const min = ctx.logo.minSize, mw = min.screenPx, widths = [240, 150, mw], YB = 636;
    let x = 48, ladder = '';
    widths.forEach((w, i) => {
      const s = logoAt(ctx, 'colour', w, { colourway: 'colour', color: t.ink });
      ladder += at(x, YB - s.h, s.w, s.h, s.html) + at(x, YB + 10, 200, 16, `<span class="m${i === 2 ? '' : ' q'}">${w} px${i === 2 ? ', smallest' : ''}</span>`);
      x += w + 56;
    });
    const rx = 760;
    const small = at(rx, 548, 360, 16, '<span class="lb">Smallest</span>') + word(M, rx, 626, `${min.screenPx} px`, 56)
      + at(rx + 240, 592, 140, 40, `<div class="m13">on screen</div><div class="m13" style="margin-top:2px">${min.printMm} mm in print</div>`);
    const head = hr(48, 48, 1088) + H1('Space and size') + at(48, 124, 640, 44, `<div class="b">${E(copy(ctx, 'page.space.text', 'Quiet zone: c on every side, where c is the height of a capital letter in the name.'))}</div>`);
    return page(ctx, 'space', g, head + hatch + at(X0 + c, Y0 + c, W, lg.h, lg.html) + dim + hr(48, 520, 1088) + ladder + small);
  },

  // ---- 11 Misuse (EX): an exception report. EX-01 struck out large, five more beside it ----
  misuse(ctx) {
    const G = groundsOf(ctx), g = G.ink, t = tones(ctx, g), E = ctx.esc, W = G.surface;
    const lab = (i, fb) => E(copy(ctx, `page.misuse.${i}`, fb));
    const fallback = ['Reversed.', 'Stretched.', 'Rotated.', 'Recoloured.', 'Outline only.', 'On a busy background.'];
    // the thumbnail ground for each exception: label stock (White), the busy one hatched
    const tf = [null, 'transform:scaleX(1.55)', 'transform:rotate(-14deg)', '', '', ''];
    const body = (i, w) => {
      const id = i === 0 ? 'stacked' : 'colour';
      const o = i === 3 ? { fill: '#7C4DFF', color: '#7C4DFF' } : { color: tones(ctx, W).ink, colourway: 'colour' };
      const lg = logoAt(ctx, id, w, o);
      const wrap = i === 4 ? 'ex-ol' : '', st = i === 0 ? 'transform:scaleX(-1)' : tf[i];
      return { lg, html: `<div class="${wrap}" style="width:${n1(lg.w)}px;height:${n1(lg.h)}px;${st || ''}">${lg.html}</div>` };
    };
    // EX-01 large
    const big = body(0, 480), BH = big.lg.h;
    const diag = svgAt(48, 120, 592, 400, `<path d="M16 384L576 16" stroke="${G.primary}" stroke-width="4" fill="none"/>`);
    const first = field(ctx, 48, 120, 592, 400, W, at((592 - big.lg.w) / 2, (400 - BH) / 2, big.lg.w, BH, big.html))
      + diag + at(48, 540, 80, 16, '<span class="m">EX-01</span>') + at(48, 562, 592, 60, `<div class="h2">${lab(0, fallback[0])}</div>`);
    const stripes = Array.from({ length: 24 }, (_, k) => `<path d="M${k * 12 - 96} 96L${k * 12} 0" stroke="${k % 3 ? G.ink : G.primary}" stroke-width="${k % 3 ? 3 : 5}"/>`).join('');
    const rows = [1, 2, 3, 4, 5].map((i, k) => {
      const y = 88 + k * 112, b = body(i, 112);
      const thumb = i === 5
        ? field(ctx, 704, y + 8, 160, 96, W, `<svg class="a" style="left:0;top:0" width="160" height="96" aria-hidden="true">${stripes}</svg>${at((160 - b.lg.w) / 2, (96 - b.lg.h) / 2, b.lg.w, b.lg.h, b.html)}`)
        : field(ctx, 704, y + 8, 160, 96, W, at((160 - b.lg.w) / 2, (96 - b.lg.h) / 2, b.lg.w, b.lg.h, b.html), 'overflow:hidden');
      return hr(704, y, 432, 'var(--hair)', 1) + thumb
        + at(884, y + 12, 80, 16, `<span class="m">EX-0${i + 1}</span>`) + at(884, y + 32, 252, 72, `<div class="h2" style="font-size:18px">${lab(i, fallback[i])}</div>`);
    }).join('') + hr(704, 648, 432, 'var(--hair)', 1);
    return page(ctx, 'misuse', g, hr(48, 48, 1088, 'var(--ink)') + at(48, 68, 640, 40, '<h1 class="h1" style="font-size:32px;line-height:40px">Misuse</h1>') + first + rows);
  },

  // ---- 13 Palette (LP): the colours as fields, each sized by its share of use, split by 4 px rules ----
  palette(ctx) {
    const G = groundsOf(ctx), g = G.panel, t = tones(ctx, g), E = ctx.esc;
    const cs = [...ctx.colours].filter((c) => c.role !== 'label').sort((a, b) => b.share - a.share), tot = cs.reduce((a, c) => a + c.share, 0) || 1;
    const X = 48, Y = 48, WW = 1088, HH = 624;
    const first = cs[0], rest = cs.slice(1), w0 = Math.round((WW * first.share) / tot);
    const hs = shareSizes(rest.map((c) => c.share), HH, 104);
    const one = (c, x, y, w, h, big) => {
      const rgb = hexToRgb(c.hex).join(' '), pct = ((c.share / tot) * 100).toFixed(1);
      const lands = c.lands ? `<div class="b" style="font-size:14px;line-height:20px;margin-top:6px;max-width:${Math.min(w - 48, 420)}px">${own(ctx, c.lands)}</div>` : '';
      return field(ctx, x, y, w, h, c.hex,
        at(24, 20, w - 120, 90, `<div class="h2">${own(ctx, c.name)}</div>${big ? lands : ''}`)
        + at(w - 96, 20, 72, 18, `<span class="m13" style="display:block;text-align:right">${pct}%</span>`)
        + at(24, h - 44, w - 48, 36, `<div class="m13">${c.hex.toUpperCase()}</div><div class="m13" style="margin-top:2px">${rgb}</div>`));
    };
    let out = one(first, X, Y, w0, HH, true), y = Y;
    rest.forEach((c, i) => { out += one(c, X + w0, y, WW - w0, hs[i], hs[i] >= 130); y += hs[i]; });
    let rules = hr(X, Y - 4, WW + 0) + hr(X, Y + HH, WW) + vr(X - 4, Y - 4, HH + 8, 'var(--ink)', 4) + vr(X + WW, Y - 4, HH + 8, 'var(--ink)', 4) + vr(X + w0 - 2, Y, HH, 'var(--ink)', 4);
    y = Y; rest.slice(0, -1).forEach((c, i) => { y += hs[i]; rules += hr(X + w0, y - 2, WW - w0); });
    return page(ctx, 'palette', g, out + rules);
  },

  // ---- 14 Tints (BY): a row of bays for each colour, the step number painted at the top of each bay ----
  tints(ctx) {
    const G = groundsOf(ctx), g = G.ink, t = tones(ctx, g), E = ctx.esc;
    const cs = coloursBy(ctx).filter((c) => c.role !== 'ground' || ctx.colours.length <= 3).slice(0, 3);
    const rh = 176, gap = 16, Y0 = 48, LW = 140, bg = 8;
    const steps = Object.keys(cs[0].ramp), bw = (1088 - LW - steps.length * bg) / steps.length;
    const rows = cs.map((c, r) => {
      const y = Y0 + r * (rh + gap), base = String(c.ramp && Object.entries(c.ramp).find(([, v]) => String(v).toLowerCase() === c.hex.toLowerCase())?.[0]);
      const label = at(48, y, LW, rh, `<div class="h2" style="overflow:hidden">${own(ctx, c.name)}</div><div class="m13 q" style="margin-top:6px">Base ${base}</div>`);
      const bays = steps.map((k, j) => {
        const hex = String(c.ramp[k]), x = 48 + LW + j * (bw + bg), mine = k === base;
        return field(ctx, x, y, bw, rh, hex, at(8, 10, bw - 16, 28, `<span class="h2">${k}</span>`) + at(8, rh - 26, bw - 12, 16, `<span class="m">${hex.toUpperCase()}</span>`),
          mine ? `outline:3px solid ${t.ink};outline-offset:3px` : '');
      }).join('');
      return label + bays;
    }).join('');
    const foot = hr(48, 636, 1088, 'var(--ink)') + at(48, 646, 700, 18, '<span class="cap q">Ten steps from light to dark. The ringed bay is the colour itself.</span>');
    return page(ctx, 'tints', g, rows + foot);
  },

  // ---- 15 Pairs (RD): six full-bleed rows, one ground each, the same line read at five sizes ----
  pairs(ctx) {
    const G = groundsOf(ctx), g = G.ink, t = tones(ctx, g), M = measure(ctx), E = ctx.esc;
    const seen = new Set(), pool = ctx.pairs.filter((p) => { const k = `${p.fgHex}|${p.bgHex}`.toLowerCase(); if (seen.has(k)) return false; seen.add(k); return true; });
    // six rows: grounds not yet seen first, and no two neighbours on the same ground
    // a pair with a floor (large type only) goes first, so the strike shows; the rest keep the deck's order
    pool.sort((a, b) => (b.ratio < 4.5 ? 1 : 0) - (a.ratio < 4.5 ? 1 : 0));
    const picked = []; const used = new Set();
    for (const p of pool) { if (picked.length < 6 && !used.has(p.bgHex.toLowerCase())) { picked.push(p); used.add(p.bgHex.toLowerCase()); } }
    for (const p of pool) if (picked.length < 6 && !picked.includes(p)) picked.push(p);
    // a deck with few pairs: top up with the combinations it rejects (measured, struck at every size)
    const rej = new Set(picked.map((p) => `${p.fgHex}|${p.bgHex}`.toLowerCase()));
    for (const p of ctx.unusedPairs) { const k = `${p.fgHex}|${p.bgHex}`.toLowerCase(); if (picked.length < 6 && !rej.has(k)) { rej.add(k); picked.push({ ...p, use: "Not used for text" }); } }
    const RH = Math.min(156, Math.floor(624 / picked.length));
    for (let i = 1; i < picked.length; i++) if (picked[i].bgHex === picked[i - 1].bgHex) { const j = picked.findIndex((q, k) => k > i && q.bgHex !== picked[i - 1].bgHex && (!picked[i + 1] || q.bgHex !== picked[i + 1].bgHex || k === i + 1)); if (j > 0) [picked[i], picked[j]] = [picked[j], picked[i]]; }
    const sample = E(copy(ctx, 'page.pairs.sample', 'Sample')), sizes = [64, 40, 24, 16, 12];
    const out = picked.map((p, i) => {
      const y = 48 + i * RH, bg = p.bgHex, pt = tones(ctx, bg), r = p.ratio;
      const floor = p.minSize || (r >= 4.5 ? 0 : r >= 3 ? 24 : 999);
      let x = 260, items = '';
      for (const s of sizes) {
        const w = M.width(sample.replace(/&[a-z#0-9]+;/g, 'x'), s), bad = s < floor;
        const el = word(M, x, RH - 28, sample, s, { style: `color:${p.fgHex};${bad ? `text-decoration:line-through;text-decoration-thickness:${s > 30 ? 3 : 2}px` : ''}` });
        items += bad ? `<div data-contrast="demo">${el}</div>` : el;
        x += w + 28;
      }
      const left = at(48, 14, 196, 76, `<div class="h2" style="font-size:16px;line-height:19px">${nameOf(ctx, p.fgHex)} on ${nameOf(ctx, bg)}</div><div class="cap" style="font-size:12px;line-height:16px;margin-top:6px">${own(ctx, p.use)}</div>`);
      const ratioT = at(1000, 14, 168, 76, `<div class="d" style="font-size:30px;line-height:34px;text-align:right">${p.ratioText}:1</div><div class="m" style="text-align:right;margin-top:6px">${floor ? (floor >= 999 ? 'Not for text' : `From ${floor} px`) : 'Any size'}</div>`);
      return field(ctx, 0, y, 1184, RH, bg, left + items + ratioT) + (i ? hr(0, y - 1, 1184, 'var(--g)', 2) : '');
    }).join('');
    return page(ctx, 'pairs', g, at(48, 14, 700, 18, '<span class="lb">Pairs, read at five sizes</span>') + out + at(48, 684, 900, 18, '<span class="cap q">A size below a pair\'s floor is struck.</span>'));
  },

  // ---- 16 Values (DK): a docket, one 112 px row to each colour ----
  values(ctx) {
    const G = groundsOf(ctx), g = G.surface, t = tones(ctx, g), E = ctx.esc, n = ctx.colours.filter((c) => c.role !== 'label').length;
    const cs = coloursBy(ctx), hasCmyk = cs.some((c) => Array.isArray(c.cmyk) && c.cmyk.length === 4);
    const rh = Math.min(112, Math.floor(448 / cs.length)), Y0 = 196, chip = Math.min(80, rh - 24);
    const cols = hasCmyk ? { hex: 520, rgb: 688, cmyk: 836, ratio: 980 } : { hex: 520, rgb: 704, ratio: 940 };
    const heads = [['Item', 48], ['Colour', 96], ['Use', 192], ['HEX', cols.hex], ['RGB', cols.rgb], hasCmyk ? ['CMYK', cols.cmyk] : null, ['Ratio on White', cols.ratio]].filter(Boolean);
    const head = hr(48, 48, 1088) + at(48, 62, 300, 36, `<div class="lb">Consignment</div><div class="m13">${E(consign(ctx))}</div>`)
      + vr(352, 62, 34) + at(368, 62, 300, 36, `<div class="lb">Items</div><div class="m13">${cs.length} colours</div>`)
      + vr(672, 62, 34) + at(688, 62, 300, 36, `<div class="lb">Due</div><div class="m13">${timeOf(fullFolio('values'))}</div>`)
      + H1('Values', 48, 104, 400);
    const cap = heads.map(([l, x]) => at(x, Y0 - 24, 200, 16, `<span class="lb">${l}</span>`)).join('') + hr(48, Y0 - 4, 1088);
    const rows = cs.map((c, i) => {
      const y = Y0 + i * rh, rgb = hexToRgb(c.hex).join(' '), rr = ratio(c.hex, G.surface), cy = y + rh / 2;
      const cell = (x, w, big, txt) => at(x, cy - 12, w, 24, `<span class="${big}">${txt}</span>`);
      return (i < cs.length - 1 ? hr(48, y + rh - 1, 1088, 'var(--hair)', 1) : '')
        + at(48, cy - 9, 40, 18, `<span class="m q">${String(i + 1).padStart(2, '0')}</span>`)
        + fill(96, cy - chip / 2, chip, chip, c.hex, `box-shadow:inset 0 0 0 1px ${t.hair}`)
        + at(192, cy - 34, 300, 68, `<div class="h2">${own(ctx, c.name)}</div>${c.lands ? `<div class="cap" style="margin-top:4px;line-height:16px;font-size:12px">${own(ctx, c.lands)}</div>` : ''}`)
        + at(cols.hex, cy - 14, 180, 28, `<span class="d" style="font-size:24px;line-height:28px">${c.hex.toUpperCase()}</span>`)
        + cell(cols.rgb, 160, 'm13', rgb)
        + (hasCmyk ? cell(cols.cmyk, 140, 'm13', Array.isArray(c.cmyk) ? c.cmyk.join(' ') : 'Not set') : '')
        + at(cols.ratio, cy - 12, 150, 24, `<span class="m13">${(Math.floor(rr * 10) / 10).toFixed(1)}:1</span>`);
    }).join('');
    return page(ctx, 'values', g, head + cap + rows + hr(48, Y0 + cs.length * rh, 1088));
  },
};
