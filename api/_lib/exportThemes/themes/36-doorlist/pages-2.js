// Theme 36, Doorlist: pages 8 to 16 (Logo: the mark, versions, space and size, misuse; Colour: palette, tints, pairs, values). 16:9 only.
// Families (none repeated beside it, none shared with Flyleaf, Set Square or Dispatch in the same role): PP print and press (mark), TR ticket roll (versions), CR clear ring (space),
// VT void tickets (misuse), RG record rings (palette), WS wristband stack (tints), RB run-on band (pairs), FC full-height columns (values).
// The mark is whatever the engine draws (ctx.logo): the showcase draws it, a slot draws the engine's frame. Encore's words come from showcase.js through copy(); a fallback here is neutral.
// Colour names in a slot come through ctx.real(), as Dispatch does.
import { ratio, hexToRgb } from '../../engine/color.js';
import { groundsOf, tones, mix, at, hr, fill, svgAt, field, measure, word, page, n1, pad, PHOTO_NOTE } from './kit.js';
import { copy } from './showcase.js';
import { photo } from './photos.js';

const slotOn = (ctx) => ctx.edition === 'slot';
const realOf = (ctx, s) => (typeof ctx.real === 'function' ? ctx.real(s) : String(s));
const own = (ctx, s) => ctx.esc(realOf(ctx, s));
const nt = (ctx, s) => `<span class="nt">${ctx.esc(s)}</span>`;
const H1 = (txt, x = 48, y = 48, w = 640) => at(x, y, w, 48, `<h1 class="h1">${txt}</h1>`);
const cws = (ctx) => (ctx.brand.logo && ctx.brand.logo.colourways) || {};
const cwKey = (ctx, key, fb = 'colour') => (cws(ctx)[key] ? key : fb);

// a logo version at width w: { w, h, html }. Showcase: the mark in a colourway (or one flat fill); slot: the engine's slot frame in `color`.
function logoAt(ctx, id, w, o = {}) {
  const g = ctx.logo.geos[id], h = (w * g.h) / g.w;
  const html = slotOn(ctx) ? ctx.logo.html(id, { width: w, color: o.color }) : ctx.logo.svg(id, { width: w, colourway: o.colourway || ctx.logo.colourwayOf(id), fill: o.fill });
  return { w, h, html };
}
// the widest a version can be drawn inside a box
const fitW = (ctx, id, bw, bh) => { const g = ctx.logo.geos[id]; return Math.min(bw, (bh * g.w) / g.h); };
// the brand's colours without the label tones, duplicates dropped
function colours(ctx) {
  const seen = new Set();
  return ctx.colours.filter((c) => c.role !== 'label').filter((c) => { const h = c.hex.toLowerCase(); if (seen.has(h)) return false; seen.add(h); return true; });
}
const ROLES = ['action', 'text', 'ink', 'panel'];
const coloursBy = (ctx) => colours(ctx).sort((a, b) => { const r = (c) => { const i = ROLES.indexOf(c.role); return i < 0 ? 9 : i; }; return r(a) - r(b) || b.share - a.share; });
const nameOf = (ctx, hex) => { const c = [...ctx.colours, ...(ctx.tones || [])].find((x) => x.hex && x.hex.toLowerCase() === String(hex).toLowerCase()); return c && c.name ? own(ctx, c.name) : String(hex).toUpperCase(); };

export const guidelines = {
  // ---- 8 The mark (PP, print and press): the hand at the door on the left, the mark at 400 on Night ----
  mark(ctx) {
    const G = groundsOf(ctx), E = ctx.esc, slot = slotOn(ctx), t = tones(ctx, G.night);
    const pic = slot
      ? field(ctx, 0, 0, 640, 672, G.red, at(48, 596, 544, 48, nt(ctx, PHOTO_NOTE)))
      : at(0, 0, 640, 672, photo(ctx, 'IMG-02', { w: 640, h: 672, fx: 0.5, fy: 0.45 }));
    const lg = logoAt(ctx, 'symbol', 400, { colourway: cwKey(ctx, 'colour'), color: t.ink });
    const body = slot ? nt(ctx, 'Your mark, SVG.') : '';
    const text = `<div class="h2">${E(copy(ctx, 'page.mark.title', 'The mark as drawn.'))}</div><div class="b" style="margin-top:10px;font-size:15px;line-height:22px;color:var(--quiet)">${E(copy(ctx, 'page.mark.text', 'Use the mark as drawn. Never redraw, stretch or recolour it.'))}</div>`;
    const cap = slot ? '' : at(744, 640, 480, 18, `<span class="m q">${E(copy(ctx, 'page.mark.cap', ''))}</span>`);
    return page(ctx, 'mark', G.night, pic + H1('The mark', 744, 40, 480) + at(744, 96, lg.w, lg.h, lg.html) + (slot ? at(744, 506, 480, 16, body) : '')
      + hr(744, 524, 488, 'var(--hair)') + at(744, 540, 488, 96, text) + cap);
  },

  // ---- 9 Versions (TR, ticket roll): five tickets torn off a roll, the first and last cut by the page edges, one lockup on its own pair ----
  versions(ctx) {
    const G = groundsOf(ctx), E = ctx.esc, g = G.stage, t = tones(ctx, g), W = 296, H = 200, Y = 232, X0 = (1280 - 5 * W) / 2;
    const defs = [
      { id: 'colour', key: 'mono-light', fb: 'Dark ground', mw: 216, mh: 120 },
      { id: 'stacked', key: 'colour', fb: 'Light ground', mw: 216, mh: 124 },
      { id: 'horizontal', key: 'reversed', fb: 'Signal ground', mw: 232, mh: 100 },
      { id: 'symbol', key: 'on-stage', fb: 'Second dark', mw: 96, mh: 96, alt: 'mono-light' },
      { id: 'colour', key: 'mono-dark', fb: 'One colour', mw: 216, mh: 120 },
    ];
    let out = '', labels = '';
    defs.forEach((d, i) => {
      const key = cwKey(ctx, d.key, d.alt || 'colour'), cw = cws(ctx)[key] || {}, ground = cw.ground || G.stock, gt = tones(ctx, ground);
      const x = X0 + i * W, w = fitW(ctx, d.id, d.mw, d.mh), lg = logoAt(ctx, d.id, w, { colourway: key, color: gt.ink });
      out += field(ctx, x, Y, W, H, ground, at((W - lg.w) / 2, (H - lg.h) / 2, lg.w, lg.h, lg.html), ratio(ground, g) < 1.6 ? `box-shadow:inset 0 0 0 1px ${t.hair}` : '');
      const lx = Math.max(48, Math.min(x + 24, 1232 - 132));
      labels += at(lx, 464, 132, 64, `<div class="lb">${E(copy(ctx, `page.versions.${i}`, d.fb))}</div><div class="cap" style="margin-top:4px;line-height:16px;font-size:12px">${nameOf(ctx, gt.ink)} on ${nameOf(ctx, ground)}</div>`);
    });
    // the tear lines between tickets: 2 px dashes, 6 on 6 off, with a notch top and bottom
    let perf = '';
    for (let k = 1; k < 5; k++) {
      const x = X0 + k * W;
      perf += svgAt(x - 8, Y - 8, 16, H + 16, `<line x1="8" y1="8" x2="8" y2="${H + 8}" stroke="${g}" stroke-width="2" stroke-dasharray="6 6"/><circle cx="8" cy="8" r="8" fill="${g}"/><circle cx="8" cy="${H + 8}" r="8" fill="${g}"/>`);
    }
    const lead = at(48, 108, 560, 48, `<div class="b">${E(copy(ctx, 'page.versions.text', 'Each version is made for one ground. Use the one that fits the ground; never put one on another.'))}</div>`);
    return page(ctx, 'versions', g, H1('Versions') + lead + out + perf + labels + hr(48, 580, 1184, 'var(--hair)')
      + at(48, 594, 900, 18, '<span class="cap q">Each ticket is drawn at the size it is shown, on the ground it is made for.</span>'));
  },

  // ---- 10 Space and size (CR, clear ring): the mark in a ring of clear space on Door red, and the smallest it is set on a wristband at actual size ----
  space(ctx) {
    const G = groundsOf(ctx), g = G.red, t = tones(ctx, g), E = ctx.esc, M = measure(ctx);
    const S = 256, q = S / 4, cx = 340, cy = 336, half = S / 2 + q, R = half * Math.SQRT2;
    const lg = logoAt(ctx, 'symbol', S, { colourway: cwKey(ctx, 'mono-dark'), color: t.ink });
    const ring = svgAt(0, 0, 1280, 672, `<circle cx="${cx}" cy="${cy}" r="${n1(R)}" fill="none" stroke="${t.ink}" stroke-width="1"/>`
      + `<rect x="${cx - half + .5}" y="${cy - half + .5}" width="${half * 2 - 1}" height="${half * 2 - 1}" fill="none" stroke="${t.ink}" stroke-width="1" stroke-dasharray="4 4"/>`
      + `<path d="M${cx - half} ${cy - half - 14}V${cy - half - 4}M${cx - S / 2} ${cy - half - 14}V${cy - half - 4}M${cx - half} ${cy - half - 9}H${cx - S / 2}" stroke="${t.ink}" stroke-width="1" fill="none"/>`);
    const dim = at(cx - S / 2 + 8, cy - half - 21, 60, 16, '<span class="m">g</span>');
    const rx = 760, min = ctx.logo.minSize, mw = min.screenPx, bandY = 296;
    const bt = tones(ctx, G.stock), bl = logoAt(ctx, 'colour', mw, { colourway: cwKey(ctx, 'colour'), color: bt.ink });
    const band = field(ctx, rx, bandY, 472, 94, G.stock, at(24, (94 - bl.h) / 2, bl.w, bl.h, bl.html))
      + fill(rx, bandY, 472, 94, 'transparent', `border:1px solid ${t.ink}`);
    const words = at(rx, 152, 472, 72, `<div class="b" style="color:${t.ink}">${E(copy(ctx, 'page.space.text', 'Clear space: g on every side, where g is a quarter of the tile. Nothing enters the ring.'))}</div>`);
    const small = at(rx, 428, 472, 16, '<span class="lb">Smallest</span>') + word(M, rx, 528, `${min.screenPx} px`, 72, { style: `color:${t.ink}` })
      + at(rx, 552, 472, 40, `<div class="m13">on screen</div><div class="m13" style="margin-top:2px">${min.printMm} mm in print</div>`);
    return page(ctx, 'space', g, at(rx, 48, 472, 52, `<h1 class="h1" style="font-size:${n1(Math.min(40, M.fit('Space and size', 472, 40) * 0.97))}px;line-height:52px">Space and size</h1>`) + ring + dim + at(cx - S / 2, cy - S / 2, lg.w, lg.h, lg.html) + words
      + at(rx, 262, 472, 16, '<span class="lb">Wristband, 25 mm deep, actual size</span>') + band + hr(rx, 412, 472, t.ink) + small);
  },

  // ---- 11 Misuse (VT, void tickets): six tickets stamped void, the misuse above the tear and the reason below ----
  misuse(ctx) {
    const G = groundsOf(ctx), g = G.night, E = ctx.esc, st = tones(ctx, G.stock), slot = slotOn(ctx), W = 184, H = 320, Y = 184;
    const reasons = [
      copy(ctx, 'page.misuse.0', 'Mirrored.'), copy(ctx, 'page.misuse.1', 'Stretched.'), copy(ctx, 'page.misuse.2', 'Rotated.'),
      `${nameOf(ctx, G.red)} on ${nameOf(ctx, G.stage)}, small.`, copy(ctx, 'page.misuse.4', 'Outline only.'), copy(ctx, 'page.misuse.5', 'Over a face in a photo.'),
    ];
    const outline = (html) => (slot ? html : html.replace(/fill="[^"]*"/g, `fill="none" stroke="${st.ink}" stroke-width="1.5" vector-effect="non-scaling-stroke"`));
    const win = (i) => {
      const cw = cwKey(ctx, 'colour'), ink = st.ink;
      if (i === 0) { const l = logoAt(ctx, 'colour', 120, { colourway: cw, color: ink }); return { l, style: 'transform:scaleX(-1)' }; }
      if (i === 1) { const l = logoAt(ctx, 'symbol', 84, { colourway: cw, color: ink }); return { l, style: 'transform:scaleX(1.7)' }; }
      if (i === 2) { const l = logoAt(ctx, 'colour', 120, { colourway: cw, color: ink }); return { l, style: 'transform:rotate(-16deg)' }; }
      if (i === 3) { const l = logoAt(ctx, 'colour', 64, { colourway: cw, fill: G.red, color: G.red }); return { l, style: '', bg: G.stage }; }
      if (i === 4) { const l = logoAt(ctx, 'colour', 128, { colourway: cw, color: ink }); return { l: { ...l, html: outline(l.html) }, style: '' }; }
      const l = logoAt(ctx, 'colour', 120, { colourway: cwKey(ctx, 'mono-light'), color: tones(ctx, G.stage).ink }); return { l, style: '', photo: true };
    };
    let out = '';
    for (let i = 0; i < 6; i++) {
      const x = 48 + i * 200, w = win(i), bg = w.bg || null;
      let inner = fill(80, 16, 24, 24, G.red, 'border-radius:50%');
      const wf = w.photo
        ? (slot ? fill(12, 56, 160, 160, mix(G.stage, G.night, 0.5)) : at(12, 56, 160, 160, photo(ctx, 'IMG-01', { w: 160, h: 160, fx: 0.38, fy: 0.78, zoom: 3 })))
        : fill(12, 56, 160, 160, bg || 'transparent', `border:1px solid ${bg ? bg : 'var(--hair)'}`);
      inner += wf + at(12 + (160 - w.l.w) / 2, 56 + (160 - w.l.h) / 2, w.l.w, w.l.h, `<div style="width:${n1(w.l.w)}px;height:${n1(w.l.h)}px;${w.style}">${w.l.html}</div>`);
      inner += svgAt(0, 255, W, 2, `<line x1="0" y1="1" x2="${W}" y2="1" stroke="${st.ink}" stroke-width="2" stroke-dasharray="6 6"/>`)
        + at(16, 276, 152, 16, '<span class="lb">Void</span>');
      out += field(ctx, x, Y, W, H, G.stock, inner)
        + at(x, Y + H + 20, W, 80, `<div class="m q">${pad(i + 1)}</div><div class="b" style="font-size:15px;line-height:22px;margin-top:4px">${reasons[i].includes('<') ? reasons[i] : E(reasons[i])}</div>`);
    }
    const lead = at(48, 108, 700, 28, `<div class="b" style="color:var(--quiet)">${E(copy(ctx, 'page.misuse.text', 'Six ways the mark goes wrong. Each one is void.'))}</div>`);
    return page(ctx, 'misuse', g, H1('Misuse') + lead + out);
  },

  // ---- 13 Palette (RG, record rings): each colour a ring of the record, its area its share of use; the labels are led in by 1 px lines that change ink as they cross the rings ----
  palette(ctx) {
    const G = groundsOf(ctx), g = G.stock, t = tones(ctx, g), E = ctx.esc;
    const lum = (h) => ratio(h, '#000000');
    const all = colours(ctx), first = all.find((c) => c.role === 'action') || all[0];
    const cs = [first, ...all.filter((c) => c !== first).sort((a, b) => lum(b.hex) - lum(a.hex))];
    const tot = cs.reduce((a, c) => a + (c.share || 0), 0) || 1, CX = 944, CY = 336, RMAX = 336;
    let cum = 0;
    const rings = cs.map((c) => { cum += (c.share || 0) / tot; return { c, R: RMAX * Math.sqrt(cum) }; });
    rings.forEach((r, i) => { r.r = i ? rings[i - 1].R : 0; r.rm = (r.R + r.r) / 2; r.i = i; });
    // slots down the left, nearest the middle line to the rings with the least room
    const n = cs.length, ys = cs.map((_, i) => (n === 1 ? 336 : 104 + (i * 456) / (n - 1))), free = ys.map((y, i) => i);
    [...rings].sort((a, b) => a.rm - b.rm).forEach((r) => {
      free.sort((a, b) => Math.abs(ys[a] - CY) - Math.abs(ys[b] - CY));
      const s = free.shift(), dy = ys[s] - CY;
      r.slot = s; r.y = ys[s];
      r.rr = Math.min(r.R - 6, Math.max(r.r + 6, r.rm, Math.abs(dy) + 6));
      r.py = Math.abs(dy) < r.rr ? dy : Math.sign(dy || 1) * r.rr * 0.8;
    });
    const edge = (hex) => ratio(hex, g) < 1.3;
    let svg = '';
    [...rings].reverse().forEach((r) => { svg += `<circle cx="${CX}" cy="${CY}" r="${n1(r.R)}" fill="${r.c.hex}"${edge(r.c.hex) ? ` stroke="${t.ink}" stroke-width="1"` : ''}/>`; });
    let lines = '', text = '';
    rings.forEach((r) => {
      const y = r.y, py = r.py, ly = CY + py, ink0 = t.ink;
      const x = (rad) => CX - Math.sqrt(Math.max(rad * rad - py * py, 0));
      const pinX = x(r.rr);
      const entry = x(r.R);
      if (Math.abs(ly - y) > 0.5) lines += fill(560, y, 24, 1, ink0) + fill(584, Math.min(y, ly), 1, Math.abs(ly - y) + 1, ink0) + fill(584, ly, entry - 584, 1, ink0);
      else lines += fill(560, ly, entry - 560, 1, ink0);
      for (let j = rings.length - 1; j >= r.i; j--) {
        const a = x(rings[j].R), b = j === r.i ? pinX : x(rings[j].r);
        lines += fill(a, ly, Math.max(b - a, 0), 1, tones(ctx, rings[j].c.hex).ink);
      }
      svg += `<circle cx="${n1(pinX)}" cy="${n1(ly)}" r="3.5" fill="${tones(ctx, r.c.hex).ink}"/>`;
      const c = r.c, rgb = hexToRgb(c.hex).join(' '), pct = Math.round(((c.share || 0) / tot) * 100);
      const lands = c.lands ? `<div class="b" style="font-size:14px;line-height:20px;margin-top:6px;max-width:500px;color:var(--quiet)">${own(ctx, c.lands)}</div>` : '';
      text += at(48, y - 14, 500, 110, `<div class="h2" style="line-height:26px">${own(ctx, c.name)}</div><div class="m13" style="margin-top:4px">${c.hex.toUpperCase()}&nbsp;&nbsp;&nbsp;${rgb}&nbsp;&nbsp;&nbsp;${pct}%</div>${lands}`);
    });
    return page(ctx, 'palette', g, svgAt(0, 0, 1280, 672, svg) + lines + text + at(48, 40, 520, 16, '<span class="lb">Rings sized by share of use</span>'));
  },

  // ---- 14 Tints (WS, wristband stack): a stack of wristbands for each hue, one band to a step, each counted in as the door counts a list ----
  tints(ctx) {
    const G = groundsOf(ctx), g = G.night, t = tones(ctx, g), E = ctx.esc;
    const hues = coloursBy(ctx).filter((c) => c.ramp && Object.keys(c.ramp).length && (c.role !== 'ground' || ctx.colours.length <= 3)).slice(0, 3);
    const n = hues.length || 1, gap = 16, cw = (1184 - (n - 1) * gap) / n;
    let out = '';
    hues.forEach((h, k) => {
      const x = 48 + k * (cw + gap), keys = Object.keys(h.ramp), N = keys.length, sh = Math.min(48, Math.floor(496 / N));
      const base = (keys.find((q) => String(h.ramp[q]).toLowerCase() === h.hex.toLowerCase()) || keys[Math.floor(N / 2)]);
      out += at(x, 40, cw, 56, `<div class="h2" style="line-height:26px">${own(ctx, h.name)}</div><div class="m13 q" style="margin-top:4px">Base ${E(base)}, ${h.hex.toUpperCase()}</div>`);
      out += hr(x, 104, cw, 'var(--ink)', 2);
      keys.forEach((q, j) => {
        const hex = String(h.ramp[q]), y = 112 + j * sh, bt = tones(ctx, hex), mine = q === base;
        const key = mine ? `<span class="hlbar" style="background:${G.red};color:${tones(ctx, G.red).ink};outline:2px solid ${bt.ink};outline-offset:1px;margin-left:0;font:600 13px/22px var(--body)">${E(q)}</span>` : `<span class="m13">${E(q)}</span>`;
        out += field(ctx, x, y, cw, sh, hex,
          at(16, (sh - 22) / 2, 80, 22, key, { style: 'line-height:22px' }) + at(112, (sh - 16) / 2, 120, 16, `<span class="m">${hex.toUpperCase()}</span>`)
          + at(cw - 96, (sh - 18) / 2, 80, 18, `<span class="m13" style="display:block;text-align:right">${mine ? 'In: ' : ''}${j + 1} of ${N}</span>`),
          `box-shadow:inset 0 0 0 1px ${t.hair}`);
      });
    });
    return page(ctx, 'tints', g, out + at(48, 644, 900, 18, `<span class="cap q">${E(copy(ctx, 'page.tints.text', 'The bar marks the colour itself. Every other step is its tint or shade, counted in.'))}</span>`));
  },

  // ---- 15 Pairs (RB, run-on band): six full-height fields, one pair each, with one line run on across all six ----
  pairs(ctx) {
    const G = groundsOf(ctx), g = G.stage, M = measure(ctx), E = ctx.esc;
    const seen = new Set(), pool = ctx.pairs.filter((p) => { const k = `${p.fgHex}|${p.bgHex}`.toLowerCase(); if (seen.has(k)) return false; seen.add(k); return true; });
    pool.sort((a, b) => (b.ratio < 4.5 ? 1 : 0) - (a.ratio < 4.5 ? 1 : 0));
    const picked = [], used = new Set();
    for (const p of pool) if (picked.length < 6 && !used.has(p.bgHex.toLowerCase())) { picked.push(p); used.add(p.bgHex.toLowerCase()); }
    for (const p of pool) if (picked.length < 6 && !picked.includes(p)) picked.push(p);
    const rej = new Set(picked.map((p) => `${p.fgHex}|${p.bgHex}`.toLowerCase()));
    for (const p of ctx.unusedPairs || []) { const k = `${p.fgHex}|${p.bgHex}`.toLowerCase(); if (picked.length < 6 && !rej.has(k)) { rej.add(k); picked.push({ ...p, use: 'Not used for text' }); } }
    // no two neighbours on one ground
    for (let i = 1; i < picked.length; i++) if (picked[i].bgHex === picked[i - 1].bgHex) { const j = picked.findIndex((q, k) => k > i && q.bgHex !== picked[i - 1].bgHex); if (j > 0) [picked[i], picked[j]] = [picked[j], picked[i]]; }
    const N = picked.length || 1, FW = 1280 / N, line = E(copy(ctx, 'page.pairs.line', 'Read this line.'));
    const size = Math.min(150, M.fit(line.replace(/&[a-z#0-9]+;/g, 'x'), 1184, 150));
    const out = picked.map((p, i) => {
      const x = i * FW, r = p.ratio, floor = p.minSize || (r >= 4.5 ? 0 : r >= 3 ? 24 : 999), bad = floor >= 999;
      const left = at(24, 40, FW - 40, 80, `<div class="h2" style="font-size:16px;line-height:20px">${nameOf(ctx, p.fgHex)} on ${nameOf(ctx, p.bgHex)}</div>`)
        + at(24, 128, FW - 40, 80, `<div class="cap" style="font-size:12px;line-height:16px">${own(ctx, p.use)}</div>`);
      const run = word(M, 48 - x, 360, line, size, { style: `color:${p.fgHex};${bad ? 'text-decoration:line-through;text-decoration-thickness:4px' : ''}` });
      const foot = at(24, 584, FW - 40, 56, `<div class="m13">${p.ratioText}:1</div><div class="m" style="margin-top:4px">${bad ? 'Not for text' : floor ? `${floor} px and up` : 'Any size'}</div>`);
      return field(ctx, x, 0, i === N - 1 ? 1280 - x : FW, 672, p.bgHex, left + `<div data-contrast="demo">${run}</div>` + foot);
    }).join('');
    return page(ctx, 'pairs', g, out);
  },

  // ---- 16 Values (FC, full-height columns): every colour a column to the top and foot of the page, its values set at the foot ----
  values(ctx) {
    const G = groundsOf(ctx), g = G.night, E = ctx.esc;
    const M = measure(ctx), allShare = colours(ctx).reduce((q, c) => q + (c.share || 0), 0), cs = coloursBy(ctx).slice(0, 5), N = cs.length || 1, FW = 1280 / N, hasCmyk = cs.some((c) => Array.isArray(c.cmyk) && c.cmyk.length === 4);
    // the colour's share of the book as a big numeral in the empty middle of the column, in the tone that reads on the colour at 24 px and up
    const numeral = (c, cw, px) => { const pct = Math.round(((c.share || 0) / allShare) * 100), size = Math.min(150, M.fit(String(pct), cw, 150)); return word(M, px, 440, String(pct), size, { style: `color:${tones(ctx, c.hex).soft}` }) + at(px, 452, cw, 16, '<span class="lb q">% of use</span>'); };
    const out = cs.map((c, i) => {
      const x = i * FW, w = i === N - 1 ? 1280 - x : FW, rgb = hexToRgb(c.hex).join(' '), pad0 = i === 0 ? 48 : 32;
      const lands = c.lands ? `<div class="b" style="font-size:14px;line-height:20px;max-width:${n1(w - pad0 - 32)}px">${own(ctx, c.lands)}</div>` : '';
      const rS = (ratio(c.hex, G.stock)).toFixed(1), rN = (ratio(c.hex, G.night)).toFixed(1);
      const vals = `<div class="m13">${c.hex.toUpperCase()}</div><div class="m13" style="margin-top:4px">RGB ${rgb}</div>`
        + (hasCmyk ? `<div class="m13" style="margin-top:4px">CMYK ${Array.isArray(c.cmyk) ? c.cmyk.join(' ') : 'Not set'}</div>` : '')
        + `<div class="m13" style="margin-top:4px;white-space:normal;line-height:16px">${rS}:1 on ${nameOf(ctx, G.stock)}</div><div class="m13" style="margin-top:4px;white-space:normal;line-height:16px">${rN}:1 on ${nameOf(ctx, G.night)}</div>`;
      return field(ctx, x, 0, w, 672, c.hex,
        at(pad0, 88, w - pad0 - 32, 100, `<h2 class="h1" style="font-size:${N > 4 ? 24 : 36}px;overflow-wrap:anywhere">${own(ctx, c.name)}</h2>`) + at(pad0, 232, w - pad0 - 32, 160, lands)
        + (allShare > 0 ? numeral(c, w - pad0 - 32, pad0) : '') + hr(pad0, 484, w - pad0 - 32, 'var(--ink)') + at(pad0, 500, w - pad0 - 32, 150, vals)
        + at(pad0, 40, 60, 16, `<span class="m q">${pad(i + 1)}</span>`));
    }).join('');
    return page(ctx, 'values', g, out);
  },
};

// shared with pages-a4a.js and pages-a4b.js (the A4 edition)
export { logoAt, fitW, colours, coloursBy, own, cwKey, cws, nameOf as colourName };
