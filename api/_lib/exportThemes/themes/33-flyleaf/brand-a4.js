// Theme 33, Flyleaf, slice 5b: the A4 portrait edition (794 x 1123) of all 31 pages, built to Circular Minimalist 14 and 15.
// Every page is a portrait design, not a squeezed 16:9: the title and a line of text across the top third (y 112 to 300), the specimen or photograph across the lower two thirds
// (y 330 to the foot), openers split (the top 55 percent in the section colour, the page list on the darkest colour below), photographs in 3:4 crops, mockups when the showcase has them on.
// index.js wires each page here in front of the 16:9 one: a portrait ctx gets this function, a 16:9 ctx keeps its own.
import { shareByWeight, typeLadder, grade, logoFacts } from '../../engine/styleguide.js';
import { rampBase, hexToRgb, ratio } from '../../engine/color.js';
import {
  SECTIONS, refOf, tones, varsOf, ghost, geo, measure, own, standIn, realOf, at, hr, mono, page, bare, field, groundsOf, hslOf, n1, pad2, folioOf, logoAr, strike, creditHtml, rule4, mockupsOn,
} from './kit.js';
import { colours, edged, rowList, pageRows, leafOf } from './brand-a.js';
import { fitIn, facesOf, weightsOf } from './brand-b.js';
import { pic, darkest } from './brand-s2.js';
import { photo } from './photos.js';
import { warp, flat } from './mockups.js';
import { copy, isShowcase } from './showcase.js';
import { coverArt, posterArt, bookmarkArt, webArt, phoneArt, letterArt, cardArt, storyArt } from './art.js';

const Z = 330; // the specimen starts here
const WEIGHT_NAMES = { 100: 'Thin', 200: 'Extralight', 300: 'Light', 400: 'Regular', 500: 'Medium', 600: 'Semibold', 700: 'Bold', 800: 'Extrabold', 900: 'Black' };
const isNeutral = (c) => { const [, s, l] = hslOf(c.hex); return s < 26 && l >= 90; };

// the top third: reference and title on the left, one line of what the page shows on the right
function top(ctx, id, line, { title = true } = {}) {
  const K = geo(ctx), R = refOf(ctx, id), E = ctx.esc;
  return (title ? at(K.L, 112, 320, null, `<div class="m">${R.ref}</div><h2 class="d ti">${E(R.title)}</h2>`) : '')
    + (line ? at(400, 122, K.W - K.R - 400, null, `<p class="b tp">${E(line)}</p>`) : '');
}
// the running head over fields: each slot reads in the ink of the ground under it
function head4(ctx, id, gs) {
  const K = geo(ctx), R = refOf(ctx, id), E = ctx.esc;
  const slot = (x, w, g, html, align = '') => at(x, K.T, w, 14, `<span class="m i">${html}</span>`, { style: `${varsOf(tones(ctx, g))};${align}` });
  return slot(K.x(1), 210, gs[0], own(ctx, ctx.brand.name)) + slot(K.x(3), 210, gs[1], R.secTitle ? E(R.secTitle) : '')
    + slot(K.x(5), 150, gs[2], /\.0$/.test(R.ref) ? '' : R.ref ? `${R.ref} ${E(R.title)}` : E(R.title)) + slot(K.W - K.R - 60, 60, gs[3], pad2(folioOf(ctx, id)), 'text-align:right');
}
const big = (x, y, w, text, size, { lh = 1, colour = '', track = -0.02, style = '' } = {}) =>
  at(x, y, w, null, `<div class="d" style="font-size:${n1(size)}px;line-height:${lh};white-space:normal;letter-spacing:${track}em;${colour ? `color:${colour};` : ''}${style}">${text}</div>`);
const small = (txt, size = 13) => `<div class="b" style="font-size:${size}px;line-height:1.45">${txt}</div>`;

// ---- openers: the top 55 percent in the section colour, the page list on the darkest colour (the surface if the leaf is the darkest) ----
function opener4(ctx, id) {
  const K = geo(ctx), R = refOf(ctx, id), s = R.sec, leaf = leafOf(ctx, s.n), M = measure(ctx), num = `${s.n}.0`;
  const dk = darkest(ctx), low = ratio(leaf, '#000000') <= ratio(dk, '#000000') + 0.01 ? ctx.roles.light.surface : dk;
  const split = Math.round(K.H * 0.55), size = 160, drop = M.ink('0123456789.').drop * size, base = split - 36 - drop;
  const numBox = at(K.L, base - size * M.base, K.W - K.L - K.R, size, num, { cls: 'd', style: `font-size:${size}px;letter-spacing:-0.02em;text-align:right;color:var(--ink)` });
  const title = at(K.L, 280, 600, null, `<div class="d" style="font-size:44px;line-height:1.08;letter-spacing:-0.01em;white-space:normal"><div>Section</div><div style="color:var(--quiet)">${R.title}</div></div>`);
  const top55 = field(ctx, 0, 0, K.W, split, leaf, numBox + title, '');
  const rows = pageRows(s);
  const list = field(ctx, 0, split, K.W, K.H - split, low, at(K.L, 40, 200, 14, mono('In this section')) + hr(K.L, 64, K.W - K.L - K.R) + rowList(ctx, K.L, 64, K.W - K.L - K.R, rows, 44), '');
  return `<section class="pg fl" data-page="${id}" style="${varsOf(tones(ctx, low))}">${top55}${list}${rule4(ctx, K)}${creditHtml(ctx, K, low)}</section>`;
}

export const a4 = {
  // 1 Cover: the name over the top of a 3:4 world, the photograph bleeding across the lower part
  cover(ctx) {
    const K = geo(ctx), G = groundsOf(ctx), M = measure(ctx), name = realOf(ctx, ctx.brand.name), stand = standIn(ctx);
    const size = Math.max(64, M.fit(name, K.W - K.L - K.R + 20, 250)), py = 452, base = py - 36;
    const ph = (ctx.placeholders && ctx.placeholders.entries.find((e) => e.path === 'name')) || null;
    const note = stand && ph ? `<span class="m">${ctx.esc(ph.label)}, ${ctx.esc(ph.length)}</span>` : '';
    const nameBox = at(K.L - 6, base - size * M.base - 4, K.W - K.L, size * 1.1, own(ctx, ctx.brand.name), { cls: 'd', style: `font-size:${n1(size)}px;letter-spacing:-0.02em;${stand ? 'color:var(--quiet);' : ''}` });
    const show = isShowcase(ctx);
    const img = show ? at(0, py, K.W, K.H - py, photo(ctx, 'paperbacks', { w: K.W, h: K.H - py, fx: 0.5, fy: 0.62, alt: 'Five plain paperbacks stacked on linen' })) : at(0, py, K.W, K.H - py, '', { style: `background:${G.primary}` });
    const body = `${nameBox}${img}${at(K.L, K.T, 300, 14, '<span class="m i">Brand guidelines</span>')}${at(K.L, K.T + 18, 300, 14, `<span class="m">${ctx.esc(ctx.versionLine)}</span>`)}${note ? at(K.L, base - size * 0.72 - 40, 500, 14, note) : ''}`;
    return bare(ctx, 'cover', { ground: G.surface, body, creditOn: show ? G.surface : G.primary });
  },

  // 2 Contents: the darkest ground, a giant word in the top third and the seven sections in two columns
  contents(ctx) {
    const K = geo(ctx), M = measure(ctx), g = darkest(ctx), cw = 316, xs = [K.L, K.L + cw + 26], rowH = 24, headH = 34;
    const cols = [[1, 2, 3], [4, 5, 6, 7]];
    const out = cols.map((ns, ci) => {
      let y = Z; const x = xs[ci];
      return ns.map((n) => {
        const s = SECTIONS[n - 1];
        const hd = hr(x, y, cw) + at(x, y + 6, cw, headH, `<span class="m i" style="width:34px;flex:none">${n}.0</span><span class="d" style="flex:1;font-size:20px;letter-spacing:-0.01em">${s.name}</span><span class="m">${pad2(s.pages.length ? pageRows(s)[0].folio - 1 : 0)}</span>`, { style: 'display:flex;align-items:center;gap:8px' });
        const rows = pageRows(s).map((r, i) => at(x, y + headH + 8 + i * rowH, cw, rowH, `<span class="m" style="width:34px;flex:none">${r.ref}</span><span class="m i" style="flex:1">${r.title}</span><span class="m">${pad2(r.folio)}</span>`, { style: 'display:flex;align-items:center;gap:8px' })).join('');
        y += headH + 8 + s.pages.length * rowH + 34;
        return hd + rows;
      }).join('');
    }).join('');
    const size = Math.round(Math.min(190, M.fit('Contents', K.W - K.L - K.R, 999)));
    return page(ctx, 'contents', { ground: g, body: at(K.L - 4, 118, K.W - K.L, size * 1.05, 'Contents', { cls: 'd', style: `font-size:${size}px;letter-spacing:-0.02em;line-height:1` }) + out });
  },

  'open-brand': (ctx) => opener4(ctx, 'open-brand'),
  'open-logo': (ctx) => opener4(ctx, 'open-logo'),
  'open-colour': (ctx) => opener4(ctx, 'open-colour'),
  'open-type': (ctx) => opener4(ctx, 'open-type'),
  'open-layout': (ctx) => opener4(ctx, 'open-layout'),
  'open-use': (ctx) => opener4(ctx, 'open-use'),
  'open-close': (ctx) => opener4(ctx, 'open-close'),

  // 1.1 Who we are: the 3:4 photograph on the left of the lower part, the three answers beside it, the headline across the foot
  who(ctx) {
    const K = geo(ctx), E = ctx.esc, pw = 400, ph = 533, px = K.L, py = Z;
    const img = at(px, py, pw, ph, pic(ctx, 'proofs', { w: pw, h: ph, fx: 0.34, fy: 0.5, alt: 'An editor marking printed proofs with a pencil' }), { style: 'overflow:hidden' });
    const items = [['Description', copy(ctx, 'description')], ['What it does', copy(ctx, 'product')], ['Who it serves', copy(ctx, 'audience')]];
    const cx = px + pw + 24, cwid = K.W - K.R - cx, ih = ph / 3;
    const cols = items.map(([l, v], i) => hr(cx, py + i * ih, cwid) + at(cx, py + i * ih + 10, cwid, ih - 14, `<div class="m" style="margin-bottom:8px">${l}</div>${small(E(v), 12.5)}`)).join('');
    const head = big(K.L - 2, py + ph + 36, K.W - K.L - K.R, E(copy(ctx, 'lines.primary')), 62, { lh: 1.0 });
    return page(ctx, 'who', { body: top(ctx, 'who', 'What the brand is, what it does and who it is for.') + img + cols + head });
  },

  // 1.2 Voice: on the ink ground, three trait words at 96 px in rows, the practice text under each
  voice(ctx) {
    const K = geo(ctx), E = ctx.esc, g = groundsOf(ctx).ink;
    const list = [0, 1, 2].map((i) => ({ trait: copy(ctx, `personality.${i}.trait`), means: copy(ctx, `personality.${i}.means`) })).filter((p) => p.trait != null);
    const rh = Math.floor((K.y1 - Z + 20) / Math.max(list.length, 1));
    const out = list.map((p, i) => {
      const y = Z + i * rh;
      return hr(K.L, y, K.W - K.L - K.R) + at(K.L, y + 14, 60, 14, mono(pad2(i + 1)))
        + big(K.L - 2, y + 36, K.W - K.L - K.R, ghost(ctx, p.trait, `personality.${i}.trait`, 'A quality'), 88) + at(400, y + 164, 322, rh - 170, `${isShowcase(ctx) ? '<div class="m" style="margin-bottom:8px">In practice</div>' : ''}${small(ghost(ctx, p.means, `personality.${i}.means`, null), 13.5)}`);
    }).join('');
    return page(ctx, 'voice', { ground: g, body: top(ctx, 'voice', 'The qualities that shape how the brand behaves and what it writes.') + out });
  },

  // 1.3 Words: the boilerplate large, then three write-this and not-this pairs
  words(ctx) {
    const K = geo(ctx), E = ctx.esc, V = ctx.brand.voice, w = K.W - K.L - K.R;
    copy(ctx, 'voice.boilerplate25');
    const rows = [0, 1, 2].map((i) => V.writeThis && V.writeThis[i]).filter(Boolean), show = isShowcase(ctx);
    const boiler = at(K.L, Z, w, 300, `<div class="m" style="margin-bottom:14px">The brand in 25 words</div><div class="d" style="font-size:38px;line-height:1.14;white-space:normal;letter-spacing:-0.015em">${E(V.boilerplate25)}</div>`);
    const half = (w - 24) / 2, ty = 700, rh = 88;
    const pairs = at(K.L, ty, half, 14, mono('Write this')) + at(K.L + half + 24, ty, half, 14, mono('Not this')) + rows.map((r, i) => {
      const y = ty + 28 + i * rh;
      return hr(K.L, y, w) + at(K.L, y + 14, half, rh - 18, `<div class="d wc" style="font-size:20px;line-height:1.2;white-space:normal;letter-spacing:0">${E(r.write)}</div>`)
        + at(K.L + half + 24, y + 14, half, rh - 18, `<div class="d wc" style="font-size:${show ? 18 : 20}px;line-height:1.2;white-space:${show ? 'nowrap' : 'normal'};letter-spacing:0;color:var(--quiet);text-decoration:line-through;text-decoration-color:var(--quiet)">${E(r.not)}</div>`);
    }).join('');
    return page(ctx, 'words', { body: top(ctx, 'words', 'Lines the brand would write, the weaker ones they replace, and the brand in a breath.') + boiler + pairs });
  },

  // 2.1 The mark: the wordmark across the lower two thirds, cut by both edges
  mark(ctx) {
    const K = geo(ctx), G = groundsOf(ctx), t = tones(ctx, G.surface), L = ctx.logo, bw = 900, bh = bw / logoAr(ctx), bx = -53, by = 700 - bh / 2;
    const logo = at(bx, by, bw, bh, L.html('colour', { width: bw, color: t.ink }), { cls: 'lf', style: `color:${t.ink};--wm:${isShowcase(ctx) ? 1 : 0.35}` });
    const idea = at(400, 190, 322, null, `<div class="m" style="margin-bottom:8px">The idea</div>${small(ctx.esc(copy(ctx, 'logo.idea')), 13.5)}`);
    return page(ctx, 'mark', { body: logo + top(ctx, 'mark', 'The mark, cut by the edge of the page so it reads as a part of something larger.') + idea });
  },

  // 2.2 Versions: four fields, two by two, bleeding to the sides and the foot
  versions(ctx) {
    const K = geo(ctx), F = logoFacts(ctx), E = ctx.esc, seen = new Set(), picks = [];
    for (const g of F.grounds) { const h = g.groundHex.toLowerCase(); if (!seen.has(h)) { seen.add(h); picks.push(g); } }
    const four = picks.slice(0, 4), cw = K.W / 2, ch = (K.H - Z) / 2;
    const cells = four.map((g, i) => {
      const cx = (i % 2) * cw, cy = Z + Math.floor(i / 2) * ch, t = tones(ctx, g.groundHex), lw = ctx.edition === 'slot' ? Math.min(cw * 0.75, ch * 1.05) : Math.min(cw * 0.5, 190);
      const when = ctx.brand.logo.when && ctx.brand.logo.when[g.key], ground = (ctx.colours.find((c) => c.hex.toLowerCase() === g.groundHex.toLowerCase()) || {}).name;
      const cap = isShowcase(ctx) && i === 0 ? copy(ctx, 'page.versions.caption') : when;
      const inner = `<div class="a lf" style="width:${n1(lw)}px;height:${n1(lw / logoAr(ctx))}px;left:${n1(ctx.edition === 'slot' ? cw / 2 - lw / 2 : i % 2 ? 40 : 64)}px;top:${n1(ctx.edition === 'slot' ? ch / 2 - lw / logoAr(ctx) / 2 : ch * 0.2)}px;color:${t.ink}">${ctx.logo.html('colour', { width: lw, colourway: g.key, color: t.ink })}</div>`
        + `<div class="a" style="left:${i % 2 ? 40 : 64}px;bottom:24px;right:24px"><div class="m i">${E(g.label)}</div><div class="m">${ground ? own(ctx, ground) : ''} ${g.groundHex.toUpperCase()}</div>${cap ? `<div class="ph-tight m w" style="margin-top:4px">${E(cap)}</div>` : ''}</div>`;
      return field(ctx, cx, cy, cw + 1, ch + 1, g.groundHex, inner, edged(ctx, g.groundHex));
    }).join('');
    return page(ctx, 'versions', { body: top(ctx, 'versions', 'The logo on each ground it is drawn for.') + cells });
  },

  // 2.3 Space and size: one dominant rung, the clear space beside the small ladder
  space(ctx) {
    const K = geo(ctx), G = groundsOf(ctx), t = tones(ctx, G.surface), F = logoFacts(ctx), L = ctx.logo, E = ctx.esc, ar = logoAr(ctx), min = Math.max(32, F.min.screenPx);
    const slot = ctx.edition === 'slot', lw0 = slot ? 440 : 460, lh0 = lw0 / ar;
    const bigRung = at(K.L, slot ? 190 : Z + 12, lw0, lh0, L.html('colour', { width: lw0, color: t.ink }), { cls: 'lf', style: `color:${t.ink}` }) + at(K.L + lw0 + 20, (slot ? 190 : Z + 12) + lh0 * (slot ? 0.92 : 1) - 14, 160, 14, `<span class="m i">${lw0} px</span>`);
    const LW = 200, LH = LW / ar, u = Math.max(6, L.geo.unit * (LW / L.geo.width)), bx = K.L + u, by = 640;
    const rect = (x, y, w, h, st) => at(x, y, w, h, '', { style: `border:.5px ${st} var(--${st === 'dashed' ? 'quiet' : 'hair'})` });
    const dia = at(K.L, by - u - 30, 200, 14, mono('Clear space')) + rect(bx - u, by - u, LW + 2 * u, LH + 2 * u, 'dashed') + rect(bx, by, LW, LH, 'solid') + at(bx, by, LW, LH, L.html('colour', { width: LW, color: t.ink }), { cls: 'lf', style: `color:${t.ink}` })
      + at(K.L, by + LH + u + 14, 280, 14, mono(`x = ${F.unitText}`));
    const smallest = copy(ctx, 'page.space.smallest', `Smallest: ${F.min.printMm} mm in print, ${F.min.screenPx} px on screen.`);
    const ws = [210, 150, Math.max(110, Math.round(min * 1.3)), min], rowBase = K.y1 - 36; let x = 400;
    const lad = at(400, by - u - 30, 200, 14, mono('Sizes')) + ws.map((w, i) => {
      const last = i === 3, h = w / ar, y = slot ? [616, 782, 898, 1000][i] : i < 2 ? by + 40 + (i ? 70 : 0) : by + 40 + (i === 2 ? 140 : 190);
      void x;
      return at(400, y + (i === 0 ? 0 : 0), w, h, L.html('colour', { width: w, color: t.ink }), { cls: 'lf', style: `color:${t.ink};opacity:${last ? 1 : 0.35}` }) + at(400 + w + 14, y + h / 2 - 7, 120, 14, `<span class="m${last ? ' i' : ''}">${last ? `Minimum ${w} px` : `${w} px`}</span>`);
    }).join('');
    void rowBase;
    return page(ctx, 'space', { body: top(ctx, 'space', smallest) + bigRung + dia + lad });
  },

  // 2.4 Misuse: six cells, two by three
  misuse(ctx) {
    const K = geo(ctx), G = groundsOf(ctx), t = tones(ctx, G.raised), L = ctx.logo, e = { x: K.L, y: Z, w: K.W - K.L - K.R, h: K.y1 - Z };
    const cols = 2, rowsN = 3, gap = 14, cap = 26, cw = (e.w - gap) / 2, ch = (e.h - gap * 2) / 3 - cap;
    const slot = ctx.edition === 'slot', lid = slot ? 'symbol' : 'colour';
    const lw = slot ? Math.min(cw * 0.4, ch * 0.62 * L.geo.symbolAspect, 150) : Math.min(cw * 0.5, 190), lh = lw / (slot ? L.geo.symbolAspect : L.geo.aspect);
    const inv = ctx.colours.map((c) => c.hex).find((h) => ratio(h, t.ground) >= 3 && ratio(h, t.ground) < 6 && h.toLowerCase() !== G.ink.toLowerCase()) || t.quiet;
    const fg = (() => { let best = null; for (const a of ctx.colours) for (const b of ctx.colours) { const r = ratio(a.hex, b.hex); if (a.hex.toLowerCase() !== b.hex.toLowerCase() && r < 3 && (!best || r > best.r)) best = { fg: a.hex, bg: b.hex, r }; } return best || { fg: t.hair, bg: t.ground }; })();
    const logoAt = (colour, st = '') => `<div class="a" style="left:${n1(cw / 2 - lw / 2)}px;top:${n1(ch / 2 - lh / 2)}px;color:${colour};${st}">${L.html(lid, { width: lw, color: colour })}</div>`;
    const crowd = [[-0.6, -0.9], [0.9, 0.7]].map(([dx, dy]) => `<div class="a" style="left:${n1(cw / 2 - lw / 2 + (dx > 0 ? lw + 4 : -lw * 0.6 - 4))}px;top:${n1(ch / 2 - lh / 2 + (dy > 0 ? 6 : -6))}px;width:${n1(lw * 0.6)}px;height:${n1(lh)}px;background:${t.hair}"></div>`).join('');
    const items = [
      ['Do not stretch', t.ground, logoAt(t.ink, 'transform:scaleX(1.5);transform-origin:center')], ['Do not recolour', t.ground, logoAt(inv)],
      ['Do not outline', t.ground, `<div class="a" style="left:${n1(cw / 2 - lw / 2 - 8)}px;top:${n1(ch / 2 - lh / 2 - 8)}px;width:${n1(lw + 16)}px;height:${n1(lh + 16)}px;border:1px solid ${t.ink}"></div>${logoAt(t.ink)}`],
      ['Do not rotate', t.ground, logoAt(t.ink, 'transform:rotate(-14deg)')], ['Do not use on a ground it fails on', fg.bg, logoAt(fg.fg)], ['Do not crowd it', t.ground, crowd + logoAt(t.ink)],
    ];
    const cells = items.map(([label, gnd, inner], i) => {
      const x = e.x + (i % cols) * (cw + gap), y = e.y + Math.floor(i / cols) * (ch + cap + gap);
      const slash = `<svg class="a" style="left:0;top:0" width="${n1(cw)}" height="${n1(ch)}" viewBox="0 0 ${n1(cw)} ${n1(ch)}" aria-hidden="true"><line x1="0" y1="${n1(ch)}" x2="${n1(cw)}" y2="0" stroke="${G.primary}" stroke-width="1" vector-effect="non-scaling-stroke"/></svg>`;
      return at(x, y, cw, ch, `${inner}${slash}`, { cls: 'wm', style: `background:${gnd};border:.5px solid ${t.hair};overflow:hidden` }) + at(x, y + ch + 8, cw, 14, mono(label));
    }).join('');
    return page(ctx, 'misuse', { ground: G.raised, body: top(ctx, 'misuse', 'Six ways the logo is never drawn.') + cells });
  },

  // 3.1 Palette: the lead colour across the top half with the title on it, the others stacked under it, each as tall as its share
  palette(ctx) {
    const K = geo(ctx), M = measure(ctx), cs = colours(ctx), G = groundsOf(ctx), E = ctx.esc;
    const lead = cs.find((c) => c.hex.toLowerCase() === G.primary.toLowerCase()) || cs[0], rest = cs.filter((c) => c !== lead), hL = 500;
    const lines = (c) => { const cm = Array.isArray(c.cmyk) && c.cmyk.length === 4 ? `<div class="m">CMYK ${c.cmyk.join(' ')}</div>` : ''; return `<div class="m i">${c.hex.toUpperCase()}</div><div class="m">RGB ${hexToRgb(c.hex).join(' ')}</div>${cm}`; };
    // heights follow the square root of each share (so a small colour still shows its name), and sum to the room under the lead
    const sq = rest.map((c) => Math.sqrt(Math.max(c.share || 1, 1))), sqt = sq.reduce((a, b) => a + b, 0), sizes = sq.map((v) => (K.H - hL) * v / sqt); let y = hL;
    const cells = rest.map((c, i) => {
      const s = sizes[i], o = field(ctx, 0, y, K.W, s + 0.5, c.hex, `<div class="a" style="left:${K.L}px;top:14px;right:${K.R}px"><span class="m">${own(ctx, c.roleText)}</span></div><div class="a d" style="left:${K.L}px;bottom:16px;width:300px;font-size:26px;line-height:1.05;white-space:normal;letter-spacing:0">${own(ctx, c.name)}</div><div class="a" style="left:${K.x(4)}px;bottom:16px">${lines(c)}</div>`, edged(ctx, c.hex));
      y += s; return o;
    }).join('');
    const bsz = Math.round(Math.min(150, M.fit(realOf(ctx, lead.name), K.W - K.L - K.R, 999)));
    const leadHtml = at(K.L, 112, 320, null, `<div class="m">3.1</div><h2 class="d ti">Palette</h2>`) + at(400, 122, 322, null, `<p class="b tp">${E('The colours of the brand, the lead colour first, with the values to build each one.')}</p>`)
      + `<div class="a" style="left:${K.L}px;right:${K.R}px;bottom:${K.H - hL + 24}px"><div class="d" style="font-size:${bsz}px;line-height:1;letter-spacing:-0.02em;white-space:normal;margin-bottom:14px">${own(ctx, lead.name)}</div><div class="m w" style="margin-bottom:8px">${own(ctx, lead.roleText)}</div>${lines(lead)}</div>`;
    const corner = rest.length ? rest[rest.length - 1].hex : lead.hex;
    return bare(ctx, 'palette', { ground: lead.hex, body: leadHtml + cells + head4(ctx, 'palette', [lead.hex, lead.hex, lead.hex, lead.hex]), creditOn: corner });
  },

  // 3.2 Tints: a full-width ramp for each colour, ten steps, the brand's own row taller
  tints(ctx) {
    const K = geo(ctx), cs = colours(ctx), steps = Object.keys(cs[0].ramp), G = groundsOf(ctx), y0 = 300, y1 = K.H - 28, capH = 22, gap = 10, sw = K.W / steps.length;
    const wt = cs.map((c) => (c.hex.toLowerCase() === G.primary.toLowerCase() ? 1.7 : 1)), wsum = wt.reduce((a, b) => a + b, 0), unit = (y1 - y0) / wsum;
    let ry = y0;
    const out = cs.map((c, i) => {
      const pitch = unit * wt[i], y = ry, sh = pitch - capH - gap, base = String(rampBase(c.hex)); ry += pitch;
      const cells = steps.map((k, j) => {
        const hex = String(c.ramp[k]).toUpperCase(), mine = k === base;
        return field(ctx, j * sw, y + capH, sw + 0.5, sh, c.ramp[k], `<div class="a" style="left:7px;top:8px"><span class="m i">${k}${mine ? ' *' : ''}</span></div><div class="a" style="left:7px;bottom:8px"><span class="m${mine ? ' i' : ''}" style="font-size:8.5px">${hex}</span></div>${mine ? `<div class="a" style="left:7px;right:7px;bottom:24px;border-top:1px solid var(--ink)"></div>` : ''}`, edged(ctx, c.ramp[k]));
      }).join('');
      return at(K.L, y + 2, 600, 14, `<span class="m i">${own(ctx, c.name)}</span> <span class="m">${c.hex.toUpperCase()}</span>`) + cells;
    }).join('');
    return page(ctx, 'tints', { body: top(ctx, 'tints', 'Each colour in ten steps. The brand colour is marked with a star on its own step.') + out });
  },

  // 3.3 Pairs: every pair as a circle with an Aa, on the dark ground
  pairs(ctx) {
    const K = geo(ctx), g = darkest(ctx), t = tones(ctx, g);
    const used = ctx.pairs.map((p) => ({ fg: p.fgHex, bg: p.bgHex, r: p.ratioText, g: grade(p.ratio), use: own(ctx, p.use), ok: true }));
    const seen = new Set(), bad = [];
    for (const p of ctx.unusedPairs) { const k = [p.fgHex, p.bgHex].map((h) => h.toLowerCase()).sort().join('|'); if (p.fgHex.toLowerCase() === p.bgHex.toLowerCase() || seen.has(k)) continue; seen.add(k); bad.push({ fg: p.fgHex, bg: p.bgHex, r: p.ratioText, g: grade(p.ratio), use: 'Do not use', ok: false }); }
    const list = [...used, ...bad].slice(0, 20), n = list.length, cols = 4, rows = Math.ceil(n / cols), aw = K.W - K.L - K.R, ah = K.H - 56 - Z, pw = aw / cols, ph = ah / rows;
    const dia = Math.floor(Math.min(pw - 22, ph - 46, 140));
    const cells = list.map((p, i) => {
      const cx = K.L + (i % cols) * pw, cy = Z + Math.floor(i / cols) * ph, aa = Math.round(dia * 0.4), edge = p.bg.toLowerCase() === g.toLowerCase() ? `box-shadow:inset 0 0 0 .5px ${t.hair};` : '';
      const circle = at(cx, cy, dia, dia, `<div class="a d" style="left:0;right:0;top:${n1(dia / 2 - aa * 0.55)}px;text-align:center;font-size:${aa}px;line-height:1;letter-spacing:0;color:${p.fg}">Aa</div>${p.ok ? '' : strike(dia, dia, tones(ctx, p.bg).ink)}`, { style: `background:${p.bg};border-radius:50%;overflow:hidden;${edge}` }).replace('class="a "', `class="a" ${p.ok ? '' : 'data-contrast="demo"'}`);
      const cap = p.ok ? `<div class="m i">${p.r}:1 ${p.g}</div><div class="m" style="white-space:normal">${p.use}</div>` : `<div class="m i">Do not use</div><div class="m">${p.r}:1 ${p.g}</div>`;
      return circle + at(cx, cy + dia + 8, pw - 10, 30, cap);
    }).join('');
    return page(ctx, 'pairs', { ground: g, body: top(ctx, 'pairs', 'Every text and ground pair, with its contrast. A slashed pair is never used for text.') + cells });
  },

  // 3.4 Values: the table, then the palette as one full-width band of bars, each as wide as its share
  values(ctx) {
    const K = geo(ctx), cs = colours(ctx), hasCmyk = cs.some((c) => Array.isArray(c.cmyk) && c.cmyk.length === 4);
    const e = { x: K.L, y: Z, w: K.W - K.L - K.R }, widths = [150, 96, 70, 104, 84]; if (hasCmyk) widths.push(90);
    const sum = widths.reduce((a, b) => a + b, 0), f = e.w / sum, cw = widths.map((w) => w * f), xs = cw.reduce((a, w, i) => (a.push(i ? a[i - 1] + cw[i - 1] : e.x), a), []);
    const heads = ['Name', 'Role', 'HEX', 'RGB', 'HSL', 'CMYK'].slice(0, widths.length);
    const head = heads.map((h, i) => at(xs[i] + (i === 0 ? 36 : 0), e.y, cw[i], 14, mono(h))).join('') + hr(e.x, e.y + 26, e.w);
    const rh = 52, hair = tones(ctx, ctx.roles.light.surface).hair;
    const rows = cs.map((c, i) => {
      const y = e.y + 26 + i * rh, v = [own(ctx, c.name), own(ctx, c.roleText), c.hex.toUpperCase(), hexToRgb(c.hex).join(' '), hslOf(c.hex).join(' '), hasCmyk && Array.isArray(c.cmyk) ? c.cmyk.join(' ') : ''];
      return at(e.x, y + rh / 2 - 11, 24, 22, '', { style: `background:${c.hex};border:.5px solid ${hair}` })
        + v.slice(0, widths.length).map((s, j) => at(xs[j] + (j === 0 ? 36 : 0), y + rh / 2 - 8, cw[j] - (j === 0 ? 38 : 4), 18, j === 0 ? `<span class="b" style="font-size:14.5px;white-space:nowrap">${s}</span>` : `<span class="m${j === 2 ? ' i' : ''}" style="${j === 1 ? 'white-space:nowrap' : ''}">${s}</span>`)).join('') + hr(e.x, y + rh, e.w);
    }).join('');
    const by = e.y + 26 + cs.length * rh + 40, bh = K.H - by - (ctx.skeleton ? 76 : 0);
    const tot = cs.reduce((a, c) => a + (c.share || 1), 0), fl = cs.map((c) => Math.max((c.share || 1) / tot, 0.1)), ft = fl.reduce((a, b) => a + b, 0);
    let px = 0;
    const bars = cs.map((c, i) => { const w = K.W * fl[i] / ft, o = at(px, by, w + 0.5, bh, '', { style: `background:${c.hex};${edged(ctx, c.hex)}` }); px += w; return o; }).join('');
    return page(ctx, 'values', { body: top(ctx, 'values', 'Every colour with the values to build it. HSL is in degrees and percent. The bars show how much of a page each one takes.') + head + rows + bars });
  },

  // 4.1 Typefaces: the two faces named in the top third, the glyph set in eight short lines across the lower part
  faces(ctx) {
    const K = geo(ctx), E = ctx.esc, aw = K.W - K.L - K.R, ah = K.y1 - Z - 10;
    const dFace = facesOf(ctx, 'display')[0] || ctx.faces[0], stem = dFace.stem;
    const lines = ['ABCDEFGH', 'IJKLMNOP', 'QRSTUVWX', 'YZabcdef', 'ghijklmn', 'opqrstuv', 'wxyz0123', '456789&?'];
    const size = Math.floor(Math.min(ah / (lines.length * 1.06), ...lines.map((l) => fitIn(ctx, stem, l, aw, 100, 0))));
    const set = at(K.L, Z, aw, ah, lines.map((l) => `<div style="font-family:var(--display);font-weight:${ctx.weights.heading};font-size:${size}px;line-height:1.06;white-space:nowrap">${l.replace('&', '&amp;')}</div>`).join(''));
    const info = [['display', 'Display', 122], ['body', 'Body', 212]].map(([role, label, y]) => {
      const fam = ctx.brand.fonts[role].family, ws = weightsOf(ctx, role);
      return hr(400, y, K.W - K.R - 400) + at(400, y + 10, K.W - K.R - 400, null, `<div class="m" style="margin-bottom:6px">${label}</div><div style="font-family:var(--${role});font-weight:${role === 'display' ? ctx.weights.heading : ctx.weights.regular};font-size:26px;line-height:1.1;white-space:nowrap;margin-bottom:6px">${E(fam)}</div><div class="m w">${ws.map((w) => `${w} ${WEIGHT_NAMES[w] || ''}`).join(', ')}</div>`);
    }).join('');
    return page(ctx, 'faces', { body: top(ctx, 'faces', null) + at(K.L, 170, 300, null, `<p class="b tp">${E('The two faces the brand sets in, the weights it uses and every character they carry.')}</p>`) + info + set });
  },

  // 4.2 Scale: each step set in one sentence at its own size, the steps the pages use in ink
  scale(ctx) {
    const K = geo(ctx), E = ctx.esc, g = darkest(ctx), L = typeLadder(ctx), ay = 300, ah = K.H - 36 - ay, text = copy(ctx, 'page.scale.text', 'Aa Bb Cc 0123 Dd Ee');
    const used = new Set(['headline', 'body', 'caption']), wts = L.map((s) => s.line + 34), tot = wts.reduce((a, b) => a + b, 0), aw = K.W - K.L - K.R;
    let y = ay;
    const rows = L.map((s, i) => {
      const h = ah * wts[i] / tot, ry = y; y += h;
      const on = used.has(s.token) || L.length <= 3, colour = on ? 'var(--ink)' : 'var(--quiet)', fit = Math.min(s.size, h - 34, aw / (text.length * 0.5));
      return hr(K.L, ry, aw) + at(K.L, ry + 8, aw, 14, `<span class="m i">${E(s.name)}</span> <span class="m">${s.size} / ${s.line} px, ${s.face === 'display' ? ctx.weights.heading : s.weight}</span>`)
        + at(K.L, ry + 26, aw, h - 26, `<div style="font-family:var(--${s.face === 'display' ? 'display' : 'body'});font-weight:${s.face === 'display' ? ctx.weights.heading : s.weight};font-size:${n1(fit)}px;line-height:1;white-space:nowrap;color:${colour};${s.face === 'display' && s.size > 40 ? 'letter-spacing:-0.02em;' : ''}">${E(text)}</div>`, { style: 'display:flex;align-items:center' });
    }).join('');
    return page(ctx, 'scale', { ground: g, body: top(ctx, 'scale', 'Every step of the type scale, set in one line. The steps the pages use are in ink.') + rows });
  },

  // 4.3 In use: a 3:4 crop of the train photograph bleeding right and down, the headline in the dark top third
  hierarchy(ctx) {
    const K = geo(ctx), E = ctx.esc, g = darkest(ctx), L = typeLadder(ctx), head = copy(ctx, 'type.sample.headline'), para = copy(ctx, 'type.sample.paragraph');
    const px = 231, py = 373, pw = K.W - px, ph = K.H - py;
    const img = at(px, py, pw, ph, pic(ctx, 'train', { w: pw, h: ph, fx: 0.64, fy: 0.5, alt: 'A reader on a train seat holding an open pocket book' }), { style: 'overflow:hidden' });
    const slotEd = !isShowcase(ctx), text = big(K.L - 2, 112, slotEd ? 330 : 660, E(head), slotEd ? 34 : 58, { lh: 1.02 }) + (slotEd ? at(400, 112, K.W - K.R - 400, null, small(E(para), 14)) : at(K.L, 250, 330, null, small(E(para), 14)));
    const side = at(K.L, py + 8, 150, 40, `<div class="m i">${L.length ? E((L.find((s) => s.token === 'headline') || L[0]).name) : ''}</div><div class="m i">Set on the quiet half of the photograph</div>`);
    return page(ctx, 'hierarchy', { ground: g, body: img + text + side });
  },

  // 4.4 Type rules: six crops in two columns, each with its rule set above it
  'type-rules'(ctx) {
    const K = geo(ctx), E = ctx.esc, L = ctx.roles.light, show = isShowcase(ctx);
    copy(ctx, 'type.rules.0.do');
    const rules = (ctx.brand.type.rules || []).slice(0, 6), n = Math.max(rules.length, 1);
    const crops = [
      { id: 'train', fx: 0.22, fy: 0.5, ink: L.surface, line: 0, at: 'left:16px;top:16px;width:150px' },
      { id: 'paperbacks', fx: 0.5, fy: 0.3, ink: L.text, line: 1, at: 'left:16px;top:16px;width:250px' },
      { id: 'proofs', fx: 0.9, fy: 0.5, ink: L.surface, line: 2, at: 'right:14px;top:16px;width:120px;text-align:right' },
      { id: 'train', fx: 0.0, fy: 0.45, ink: L.surface, line: 3, at: 'left:16px;top:16px;width:190px;font-size:28px' },
      { id: 'paperbacks', fx: 0.5, fy: 0.08, ink: L.text, line: 0, at: 'left:16px;top:16px;width:250px' },
      { id: 'proofs', zoom: 1.7, fx: 0.98, fy: 0.9, ink: L.surface, line: 1, at: 'left:16px;top:16px;width:250px' },
    ];
    const sample = [0, 1, 2, 3].map((i) => copy(ctx, `applications.social.${i}`));
    const gw = K.W - K.L - K.R, cw = (gw - 16) / 2, rh = show ? 44 : 96, z0 = show ? Z : Z - 130, rowP = (K.y1 - z0 + 10) / 3, ih = rowP - rh - 14;
    const cells = crops.slice(0, n).map((c, i) => {
      const x = K.L + (i % 2) * (cw + 16), y = z0 + Math.floor(i / 2) * rowP, r = rules[i];
      const over = show ? `<div class="a d" style="font-size:22px;line-height:1.04;letter-spacing:-0.01em;white-space:normal;color:${c.ink};${c.at}">${E(sample[c.line % 4] || '')}</div>` : '';
      const img = at(x, y + rh, cw, ih, pic(ctx, c.id, { w: cw, h: ih, fx: c.fx, fy: c.fy, zoom: c.zoom, alt: 'A crop of the brand photograph' }) + over, { style: 'overflow:hidden' });
      return at(x, y, cw, rh - 6, `<span class="m" style="width:22px;flex:none">${pad2(i + 1)}</span><span class="b" style="font-size:12px;line-height:1.3;color:var(--ink)">${E(r ? r.do : '')}</span>`, { style: 'display:flex;gap:6px;align-items:flex-start' }) + img;
    }).join('');
    return page(ctx, 'type-rules', { body: top(ctx, 'type-rules', 'How to set type over the brand photographs. Each crop shows its rule kept.') + cells });
  },

  // 5.1 Grid: the slide grid drawn large over a real page, the two A4 grids small under it, the steps and the figures beside them
  grid(ctx) {
    const K = geo(ctx), G = ctx.gridMeasures, E = ctx.esc, g0 = groundsOf(ctx), show = isShowcase(ctx);
    const colW = (pw, n) => n1((pw - 2 * G.margin - (n - 1) * G.gutter) / n), half = Math.max(1, Math.round(G.columns / 2));
    const SW = 1280, SH = 720, bw = K.W - K.L - K.R, bh = bw * SH / SW, by = Z + 24, aw = 120, ah = aw * G.page.h / G.page.w;
    const lineC = 'rgba(255,255,255,.55)', fillC = 'rgba(255,255,255,.14)';
    const frame = (x, y, w, h, pw, n, rws, inner, lc = lineC, fc = fillC) => {
      const k = w / pw, m = G.margin * k, gu = G.gutter * k, c = (w - 2 * m - (n - 1) * gu) / n;
      const cols = Array.from({ length: n }, (_, i) => at(x + m + i * (c + gu), y + m, c, h - 2 * m, '', { style: `background:${fc};border-left:.5px solid ${lc};border-right:.5px solid ${lc}` })).join('');
      const rs = Array.from({ length: rws + 1 }, (_, i) => at(x + m, y + m + i * ((h - 2 * m) / rws), w - 2 * m, 0, '', { style: `border-top:.5px solid ${lc}` })).join('');
      return at(x, y, w, h, inner, { style: 'border:.5px solid var(--hair);background:var(--g);overflow:hidden' }) + cols + rs;
    };
    const head = copy(ctx, 'type.sample.headline');
    const box = pic(ctx, 'train', { w: bw, h: bh, fx: 0.5, fy: 0.5, alt: 'A reader on a train seat, with the slide grid drawn over it' })
      + (show ? `<div class="a d" style="left:${n1(G.margin * bw / SW)}px;top:${n1(bh * 0.2)}px;width:${n1(bw * 0.4)}px;font-size:${n1(80 * bw / SW)}px;line-height:1.02;letter-spacing:-0.02em;white-space:normal;color:#F1F1EC">${E(head)}</div>` : '');
    const mk = G.margin * bw / SW, ck = (bw - 2 * mk - (G.columns - 1) * G.gutter * bw / SW) / G.columns;
    const dims = hr(K.L, by - 12, mk) + hr(K.L + mk, by - 12, ck) + at(K.L, by - 36, bw, 14, mono(`Margin ${G.margin}, column ${colW(SW, G.columns)}, gutter ${G.gutter}`));
    const label = (x, y, a, b, w = 220) => at(x, y, w, 30, `<div class="m i">${a}</div><div class="m">${b}</div>`);
    const sy = by + bh + 56;
    const smalls = [[K.L, G.columns], [K.L + aw + 24, half]].map(([x, n]) => frame(x, sy, aw, ah, G.page.w, n, 8, '', 'var(--hair)', 'var(--wash)') + label(x, sy + ah + 6, 'A4 page', `${n} columns`, aw + 20)).join('');
    const steps = [['Step 1: Margins', `The margin is ${G.margin} px on every side. Nothing but a full-bleed field crosses it.`], ['Step 2: Columns', `${G.columns} columns across, or ${half} when the layout is simple. Each column is ${colW(G.page.w, G.columns)} px on the page.`], ['Step 3: Gutters', `${G.gutter} px between columns. A row is ${G.base} px, the base unit of the type.`]];
    const sx = K.L + 2 * aw + 24 + 36, sw = K.W - K.R - sx;
    const stepsHtml = steps.map(([a, b], i) => at(sx, sy + i * 78, sw, 74, `<div class="m i" style="margin-bottom:6px">${a}</div>${small(E(b), 12)}`)).join('');
    const rows = [['Page', `${G.page.w} x ${G.page.h} px`], ['Margin', `${G.margin} px`], ['Columns', `${G.columns}`], ['Gutter', `${G.gutter} px`], ['Base unit', `${G.base} px`]];
    const table = rows.map(([a, v], i) => hr(400, 128 + i * 30, K.W - K.R - 400) + at(400, 128 + i * 30 + 8, K.W - K.R - 400, 14, `<span class="m">${a}</span><span class="m i" style="float:right">${v}</span>`)).join('');
    return page(ctx, 'grid', { ground: g0.raised, body: top(ctx, 'grid', null) + at(K.L, 170, 300, null, `<p class="b tp">${E('The page grid: columns, gutter and margin, drawn on a slide over a real page, and on an A4 page.')}</p>`) + table + dims + frame(K.L, by, bw, bh, SW, G.columns, 4, box) + smalls + stepsHtml });
  },

  // 5.2 Compositions: the flat-lay photograph (the cover, a poster and a bookmark warped in) across the lower two thirds
  compositions(ctx) {
    const K = geo(ctx), line = 'The cover, a poster and a bookmark, set from the brand colours, type and photographs.';
    if (mockupsOn(ctx)) {
      const fr = { left: 0, top: Z, w: K.W, h: K.H - Z, fx: 0.498, fy: 0.5 };
      const body = at(0, Z, K.W, K.H - Z, photo(ctx, 'flatlay', { w: K.W, h: K.H - Z, fx: fr.fx, fy: fr.fy, alt: 'A closed book, a bookmark and a sheet on a paper ground' }), { style: 'overflow:hidden' })
        + warp(ctx, 'IMG-05', 'sheet', fr, posterArt(ctx)) + warp(ctx, 'IMG-05', 'book', fr, coverArt(ctx)) + warp(ctx, 'IMG-05', 'bookmark', fr, bookmarkArt(ctx));
      return page(ctx, 'compositions', { body: top(ctx, 'compositions', line) + body });
    }
    const g = darkest(ctx), base = 840, gap = 34, items = [['Cover', coverArt(ctx), 210], ['Poster', posterArt(ctx), 300], ['Bookmark', bookmarkArt(ctx), 84]];
    let x = K.L;
    const out = items.map(([n, art, w]) => { const f = flat(art, x, base - art.h * w / art.w, w); const o = f.html + at(x, base + 10, w + 40, 30, `<div class="m i">${n}</div>`); x += w + gap; return o; }).join('');
    return page(ctx, 'compositions', { ground: g, body: top(ctx, 'compositions', line) + out });
  },

  // 6.1 Digital: the laptop across the width, the phone photograph bleeding off the foot
  digital(ctx) {
    const K = geo(ctx), line = 'The web page and the phone page, built from the brand colour, type and photographs.';
    if (mockupsOn(ctx)) {
      const lf = { left: 0, top: Z, w: K.W, h: 350, fx: 0.5, fy: 0.5, zoom: 1.15 }, pf = { left: K.L, top: Z + 370, w: 300, h: K.H - Z - 370, fx: 0.53, fy: 0.5 };
      const body = at(0, Z, K.W, 350, photo(ctx, 'laptop', { w: K.W, h: 350, fx: lf.fx, fy: lf.fy, zoom: lf.zoom, alt: 'A laptop on a stone plinth' }), { style: 'overflow:hidden' }) + warp(ctx, 'IMG-06', 'screen', lf, webArt(ctx), { glass: true })
        + at(pf.left, pf.top, pf.w, pf.h, photo(ctx, 'phone', { w: pf.w, h: pf.h, fx: pf.fx, fy: pf.fy, alt: 'A hand holding a phone' }), { style: 'overflow:hidden' }) + warp(ctx, 'IMG-09', 'screen', pf, phoneArt(ctx), { glass: true })
        + at(400, pf.top + 20, 322, 90, `<div class="m i" style="margin-bottom:6px">Web layout</div><div class="m w" style="margin-bottom:14px">1280 px wide, a header, the line and one button</div><div class="m i" style="margin-bottom:6px">Phone layout</div><div class="m w">390 px wide, the same page, stacked</div>`);
      return page(ctx, 'digital', { body: top(ctx, 'digital', line) + body });
    }
    const g = darkest(ctx), web = webArt(ctx), ph = phoneArt(ctx), ww = K.W - K.L - K.R, y = Z + 10, f1 = flat(web, K.L, y, ww), pw = 150, py = y + f1.h + 40, f2 = flat(ph, K.L, py, pw);
    const body = f1.html + at(K.L, y + f1.h + 8, 400, 30, `<div class="m i">Web page, 1280 px layout</div>`) + f2.html + at(K.L + pw + 40, py, 322, 60, `<div class="m i">Phone, 390 px layout</div><div class="m w" style="margin-top:6px">The same page for a phone: the photograph, the line and one button.</div>`);
    return page(ctx, 'digital', { ground: g, body: top(ctx, 'digital', line) + body });
  },

  // 6.2 Print: the stationery photograph bleeding down the lower part
  print(ctx) {
    const K = geo(ctx), line = 'A business card, front and back, and a letterhead, each at its true proportion. The contact lines are the owner\'s to write.';
    if (mockupsOn(ctx)) {
      const fr = { left: 0, top: Z, w: K.W, h: K.H - Z, fx: 0.5, fy: 0.5 };
      const body = at(0, Z, K.W, K.H - Z, photo(ctx, 'stationery', { w: K.W, h: K.H - Z, fx: fr.fx, fy: fr.fy, alt: 'A letterhead and two business cards on a grey ground' }), { style: 'overflow:hidden' })
        + warp(ctx, 'IMG-07', 'sheet', fr, letterArt(ctx)) + warp(ctx, 'IMG-07', 'card-a', fr, cardArt(ctx, 'front')) + warp(ctx, 'IMG-07', 'card-b', fr, cardArt(ctx, 'back'));
      return page(ctx, 'print', { body: top(ctx, 'print', line) + body });
    }
    const g = darkest(ctx), sheet = letterArt(ctx), a = cardArt(ctx, 'front'), b = cardArt(ctx, 'back'), y = Z + 10, sw = 340, f0 = flat(sheet, K.L, y, sw), cx = K.L + sw + 34, cw = K.W - K.R - cx;
    const f1 = flat(a, cx, y, cw), f2 = flat(b, cx, y + f1.h + 44, cw);
    const body = f0.html + f1.html + f2.html + at(K.L, y + f0.h + 8, sw, 30, `<div class="m i">Letterhead</div><div class="m">A4, 210 x 297 mm</div>`) + at(cx, y + f1.h + 6, cw, 30, `<div class="m i">Card, front</div><div class="m">85 x 55 mm</div>`) + at(cx, y + f1.h + 44 + f2.h + 6, cw, 30, `<div class="m i">Card, back</div><div class="m">85 x 55 mm</div>`);
    return page(ctx, 'print', { ground: g, body: top(ctx, 'print', line) + body });
  },

  // 6.3 Social: two phones, each with a story
  social(ctx) {
    const K = geo(ctx), g = darkest(ctx), line = 'Two stories: a photograph or a colour field, one line, the name.';
    const pw = 270, gap = 56, y = Z + 8, on = mockupsOn(ctx), b = on ? 8 : 0, sw = pw - 2 * b, k = sw / 390, sh = 844 * k, ph = sh + 2 * b, x0 = (K.W - 2 * pw - gap) / 2 + 12;
    const picks = [0, 2], names = ['Plum', 'Oatmeal'];
    const body = picks.map((si, i) => {
      const x = x0 + i * (pw + gap), art = storyArt(ctx, si), cap = (yy) => at(x, yy, pw, 30, `<div class="m i">Story ${i + 1}</div><div class="m">${names[i]}</div>`);
      if (!on) return flat(art, x, y, pw).html + cap(y + 844 * pw / 390 + 10);
      const dev = at(x, y, pw, ph, '', { style: `background:#0e0e0f;border-radius:${n1(pw * 0.16)}px;box-shadow:inset 0 0 0 1px rgba(255,255,255,.16),0 22px 34px -16px rgba(0,0,0,.7)` })
        + at(x - 1.5, y + ph * 0.2, 1.5, 22, '', { style: 'background:#2a2a2c;border-radius:1px' }) + at(x + pw, y + ph * 0.18, 1.5, 38, '', { style: 'background:#2a2a2c;border-radius:1px' })
        + `<div class="a" style="left:${n1(x + b)}px;top:${n1(y + b)}px;width:${n1(sw)}px;height:${n1(sh)}px;border-radius:${n1(pw * 0.16 - b)}px;overflow:hidden;isolation:isolate">`
        + `<div style="position:absolute;left:0;top:0;width:390px;height:844px;transform:scale(${n1(k * 1000) / 1000});transform-origin:0 0">${art.html}</div>`
        + at(sw * 0.5 - sw * 0.14, sw * 0.045, sw * 0.28, sw * 0.075, '', { style: `background:#0e0e0f;border-radius:${n1(sw * 0.04)}px` })
        + `<div class="a" style="left:0;top:0;width:100%;height:100%;mix-blend-mode:screen;background:linear-gradient(112deg,rgba(255,255,255,.13) 0,rgba(255,255,255,.04) 34%,rgba(255,255,255,0) 35%)"></div></div>`;
      return dev + cap(y + ph + 12);
    }).join('');
    return page(ctx, 'social', { ground: g, body: top(ctx, 'social', line) + body });
  },

  // 7.1 On one page: a 2 x 4 flush mosaic bleeding to the sides and the foot
  summary(ctx) {
    const K = geo(ctx), G = groundsOf(ctx), E = ctx.esc, cs = colours(ctx), L = ctx.logo, y0 = Z - 10, cw = K.W / 2, ch = (K.H - y0) / 4;
    const cell = (i, ground, inner, extra = '') => field(ctx, (i % 2) * cw, y0 + Math.floor(i / 2) * ch, cw + 0.5, ch + 0.5, ground, inner, `overflow:hidden;${edged(ctx, ground)}${extra}`);
    const photoCell = (i, id, fx, fy, alt) => at((i % 2) * cw, y0 + Math.floor(i / 2) * ch, cw + 0.5, ch + 0.5, pic(ctx, id, { w: cw + 0.5, h: ch + 0.5, fx, fy, alt }), { style: 'overflow:hidden' });
    const cap = (name, hex) => `<div class="a" style="left:${K.L - 24}px;bottom:14px;right:12px"><div class="m i">${name}</div><div class="m">${hex.toUpperCase()}</div></div>`;
    const t0 = tones(ctx, G.surface), lw = Math.min(cw * 0.5, 190);
    const mark = cell(0, G.surface, `<div class="a lj" style="left:${n1(cw / 2 - lw / 2)}px;top:${n1(ch / 2 - lw / L.geo.aspect / 2)}px;color:var(--ink)">${L.html('colour', { width: lw, color: t0.ink })}</div>`);
    const sh = cs.map((c) => Math.max(c.share || 1, 0)), tot = sh.reduce((x, y) => x + y, 0), fl = cs.map((_, i) => Math.max(sh[i] / tot, 0.14)), ft = fl.reduce((x, y) => x + y, 0);
    let px = 0;
    const strip = cell(1, G.surface, cs.map((c) => {
      const w = cw * fl[cs.indexOf(c)] / ft, tt = tones(ctx, c.hex), o = at(px, 0, w + 0.5, ch + 0.5, `<div class="a" style="left:8px;bottom:12px;right:4px">${w >= 84 ? `<div class="m i" style="font-size:8.5px;white-space:nowrap;overflow:hidden">${own(ctx, c.name)}</div>` : ''}<div class="m" style="font-size:8.5px">${c.hex.toUpperCase()}</div></div>`, { style: `background:${c.hex};${varsOf(tt)}` }); px += w; return o;
    }).join(''), 'border:none;');
    const aa = cell(2, G.ink, `<div class="a d" style="left:24px;top:${n1(-ch * 0.06)}px;font-size:${n1(ch * 0.95)}px;line-height:1;letter-spacing:-0.02em">Aa</div>${cap(E(realOf(ctx, ctx.brand.fonts.display.family)), G.ink)}`);
    const line = cell(5, G.ink, `<div class="a" style="left:28px;top:26px;right:24px"><div class="d" style="font-size:34px;line-height:1.05;letter-spacing:-0.02em;white-space:normal">${E(copy(ctx, 'lines.primary'))}</div></div>`);
    const f1 = cell(6, G.primary, cap(own(ctx, (ctx.colours.find((c) => c.hex.toLowerCase() === G.primary.toLowerCase()) || { name: '' }).name), G.primary));
    const f2 = isShowcase(ctx) ? photoCell(7, 'margin-note', 0.5, 0.6, 'A pencil note in the margin of a book') : cell(7, G.surface, cap(own(ctx, (ctx.colours.find((c) => c.hex.toLowerCase() === G.surface.toLowerCase()) || { name: '' }).name), G.surface));
    const body = mark + strip + aa + photoCell(3, 'train', 0.7, 0.5, 'A reader on a train seat') + photoCell(4, 'paperbacks', 0.5, 0.45, 'Five plain paperbacks on linen') + line + f1 + f2;
    return page(ctx, 'summary', { ground: G.ink, body: top(ctx, 'summary', 'The brand on one page: the mark, the colours, the type, the photographs and the line.') + body, creditOn: G.surface });
  },

  // 7.2 Contact: the statement across the top third on the primary colour, the owner, email and version in rows below
  contact(ctx) {
    const K = geo(ctx), G = groundsOf(ctx), B = ctx.brand, E = ctx.esc;
    const slot = (path, value, size) => {
      const en = ctx.placeholders && ctx.placeholders.entries.find((x) => x.path === path), css = `font-size:${size}px;line-height:1.2;white-space:normal;letter-spacing:-0.01em`;
      if (!en) return `<div class="d wc" style="${css}">${E(value)}</div>`;
      return `<div class="d wc" style="${css}"><span class="ph-b ph-b--real" data-ph="${path}"><span class="ph-l">${E(en.label)}</span><span class="ph-w">${E(en.what)}</span><span class="ph-m">${E(en.length)}.${en.first ? ` e.g. &quot;${E(en.example)}&quot;` : ''}</span></span></div>`;
    };
    const head = copy(ctx, 'page.contact.headline', 'Ask before you change the mark.');
    const body = isShowcase(ctx) ? copy(ctx, 'page.contact.body') : `Write to the owner with the file and where it will run. ${ctx.versionLine}`;
    const rows = [['Owner', slot('contact.owner', B.contact.owner, 22)], ['Email', slot('contact.email', B.contact.email, 22)], ['Version', `<div class="d" style="font-size:22px;line-height:1.2;letter-spacing:-0.01em">${E(ctx.versionLine)}</div>`]];
    const col = rows.map(([l, h], i) => hr(K.L, 620 + i * 160, K.W - K.L - K.R) + at(K.L, 620 + i * 160 + 12, 200, 14, mono(l)) + at(400, 620 + i * 160 + 10, K.W - K.R - 400, 90, h)).join('');
    const t = big(K.L - 2, 150, 660, E(head), 70, { lh: 1.02 }) + at(K.L, 420, 380, null, `<div class="b" style="font-size:15px;line-height:1.5">${E(body)}</div>`);
    return page(ctx, 'contact', { ground: G.primary, body: t + col });
  },
};
