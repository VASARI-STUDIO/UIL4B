// Theme 33, Flyleaf: the brand guidelines, pages 1 to 16 (cover, contents, every section opener, 1 Brand, 2 Logo, 3 Colour), at 16:9 and A4 portrait.
// Each size is its own arrangement (K.portrait); every page is absolute boxes on the grid in kit.js. Brand copy the user still writes goes through ctx.esc() so the slot
// edition shows its placeholder; the words the project supplied (name, colour names, roles, uses) are read whole with own(). Nothing slices a brand string.
import { grade, shareByWeight } from '../../engine/styleguide.js';
import { hexToRgb, rgbToHex, rampBase, ratio } from '../../engine/color.js';
import { logoFacts } from '../../engine/styleguide.js';
import {
  SECTIONS, refOf, fullFolio, pad2, tones, varsOf, geo, measure, own, standIn, realOf, at, hr, vr, mono, strike, page, bare, textCol, field, groundsOf, hslOf, n1, mix,
} from './kit.js';

// ---- shared pieces ----
// the palette's own colours, biggest share first, a colour that repeats an earlier hex dropped
export const colours = (ctx) => {
  const seen = new Set();
  return [...ctx.colours].sort((a, b) => b.share - a.share).filter((c) => { const h = c.hex.toLowerCase(); if (seen.has(h)) return false; seen.add(h); return true; });
};
// the leaf a section opens on: the palette's strongest colours in turn (the colour opener is the primary)
export function leafOf(ctx, n) {
  const G = groundsOf(ctx), panel = (ctx.colours.find((c) => c.role === 'panel') || {}).hex || G.ink;
  const order = [panel, G.accent, G.primary, G.ink, panel, G.accent, G.primary];
  // the Brand opener on a near-white panel is thin: it takes the ink ground, like the contents page, so the openers run across a range of weight
  if (n === 1 && ratio(panel, ctx.roles.light.surface) < 1.3) return G.ink;
  return order[(n - 1) % order.length];
}
// a display word on an exact baseline: the box sits so the baseline of the first line falls at `base`
export const word = (ctx, M, x, base, text, size, { w, colour = '', cls = '', track } = {}) => {
  const tr = track != null ? track : size > 40 ? -0.02 : 0;
  return at(x, base - size * M.base, w, size, text, { cls: `d ${cls}`, style: `font-size:${n1(size)}px;letter-spacing:${tr}em;${colour ? `color:${colour};` : ''}` });
};
// a list of rows (reference, title, folio) with a hairline between them
export function rowList(ctx, x, y, w, rows, rowH) {
  return rows.map((r, i) => at(x, y + i * rowH, w, rowH, `<span class="m" style="width:44px;flex:none">${r.ref}</span><span class="m i" style="flex:1;min-width:0">${r.title}</span><span class="m">${pad2(r.folio)}</span>`, { style: 'display:flex;align-items:center;gap:8px' })
    + (i < rows.length - 1 ? hr(x, y + (i + 1) * rowH, w) : '')).join('');
}
// a field the colour of the page would read as empty: it takes a hairline edge in the page's own hair tone
export const edged = (ctx, hex) => (ratio(hex, ctx.roles.light.surface) < 1.15 ? `box-shadow:inset 0 0 0 .5px ${tones(ctx, ctx.roles.light.surface).hair};` : '');
// the failing ground a misuse cell draws on: the palette pair that fails (under 3:1) but still shows, else a stand-in a step off the page ground
function failingGround(ctx, t) {
  let best = null;
  for (const a of ctx.colours) for (const b of ctx.colours) {
    const r = ratio(a.hex, b.hex);
    if (a.hex.toLowerCase() !== b.hex.toLowerCase() && r < 3 && (!best || r > best.r)) best = { fg: a.hex, bg: b.hex, r };
  }
  return best || { fg: mix(t.ground, t.ink, 0.22), bg: t.ground, r: 0 };
}
export const pageRows = (s) => s.pages.map((p, i) => ({ ref: `${s.n}.${i + 1}`, title: p[1], folio: fullFolio(p[0]) }));

// ---- openers ----
// The section number sits on the foot margin and the section name above it. Old-style figures drop below the baseline (and some rise above the cap height), so both are
// placed from the glyph outlines: the lowest any figure goes (0 to 9, so the number sits on one baseline on every opener) rests on the margin, and the name stands a fixed
// gap above the top of this opener's own number. No face can make the two meet.
export function opener(ctx, id, { behind = '', rowsInk = false } = {}) {
  const K = geo(ctx), R = refOf(ctx, id), s = R.sec, leaf = leafOf(ctx, s.n), M = measure(ctx), num = `${s.n}.0`;
  const size = Math.min(0.33 * K.H, M.fit(num, K.W - K.L - K.R, 999));
  const nameH = 30, gap = 20, base = K.H - K.Bm - M.ink('0123456789.').drop * size, nameY = base - M.ink(num).top * size - gap - nameH;
  const lx = K.portrait ? K.x(3) : K.x(9), lw = K.W - K.R - lx;
  const rows = rowsInk ? pageRows(s).map((r, i, a) => at(lx, K.T + i * 30, lw, 30, `<span class="m i" style="width:44px;flex:none">${r.ref}</span><span class="m i" style="flex:1;min-width:0">${r.title}</span><span class="m i">${pad2(r.folio)}</span>`, { style: 'display:flex;align-items:center;gap:8px' })
    + (i < a.length - 1 ? hr(lx, K.T + (i + 1) * 30, lw) : '')).join('') : rowList(ctx, lx, K.T, lw, pageRows(s), 30);
  const body = `${behind}${word(ctx, M, K.L - size * 0.04, base, num, size)}${at(K.L, nameY, K.span(1, K.portrait ? 4 : 6), nameH, s.name, { cls: 'd', style: 'font-size:24px;line-height:30px;letter-spacing:0' })}${rows}${hr(lx, K.T, lw)}`;
  return bare(ctx, id, { ground: leaf, body });
}

export const guidelines = {
  cover(ctx) {
    const K = geo(ctx), G = groundsOf(ctx), M = measure(ctx), t = tones(ctx, G.surface), name = realOf(ctx, ctx.brand.name), stand = standIn(ctx);
    const lx = K.portrait ? K.W - 220 : Math.round(K.x(9) - K.gut / 2), room = lx - K.L - 24;
    // the name runs on under the leaf: sized about a tenth wider than the room, so the leaf's edge cuts it and the two read as one gesture
    const size = Math.max(64, M.fit(name, room * 1.1, K.portrait ? 250 : 330)), base = K.H - K.Bm - 16;
    const ph = (ctx.placeholders && ctx.placeholders.entries.find((e) => e.path === 'name')) || null;
    const note = stand && ph ? `<span class="m">${ctx.esc(ph.label)}, ${ctx.esc(ph.length)}</span>` : '';
    const nameBox = at(K.L, base - size * M.base - 6, lx - K.L, size * 1.1, own(ctx, ctx.brand.name), { cls: 'd clip', style: `font-size:${n1(size)}px;letter-spacing:-0.02em;${stand ? 'color:var(--quiet);' : ''}` });
    const body = `${at(lx, 0, K.W - lx, K.H, '', { style: `background:${G.primary}` })}${at(K.L, K.T, 300, 14, '<span class="m i">Brand guidelines</span>')}${at(K.L, K.T + 18, 300, 14, `<span class="m">${ctx.esc(ctx.versionLine)}</span>`)}${nameBox}${note ? at(K.L, base - size * 0.72 - 40, lx - K.L, 14, note) : ''}`;
    return bare(ctx, 'cover', { ground: G.surface, body, creditOn: G.primary });
  },

  contents(ctx) {
    const K = geo(ctx), cols = [[1, 2, 3], [4, 5, 6, 7]];
    const x0 = K.portrait ? K.x(1) : K.x(5), colW = K.portrait ? K.span(1, 3) : K.span(1, 4), x1 = K.portrait ? K.x(4) : K.x(9);
    const y0 = K.portrait ? 300 : K.y0, avail = K.y1 - y0;
    const rowsOf = (ns) => ns.reduce((a, n) => a + SECTIONS[n - 1].pages.length, 0);
    const need = (ns) => ns.length * 2.5 + rowsOf(ns); // a heading is 1.9 rows tall, and a section leaves 0.6 of a row after it
    const rowH = Math.min(44, Math.floor(avail / Math.max(need(cols[0]), need(cols[1]))));
    const out = cols.map((ns, ci) => {
      let y = y0; const x = ci ? x1 : x0;
      return ns.map((n) => {
        const s = SECTIONS[n - 1], hh = Math.round(rowH * 1.9);
        const head = hr(x, y, colW) + at(x, y, colW, hh, `<span class="m i" style="width:${K.portrait ? 40 : 48}px;flex:none">${n}.0</span><span class="d" style="font-size:${Math.round(rowH * (K.portrait ? 0.82 : 0.9))}px;letter-spacing:-0.01em;flex:1">${s.name}</span><span class="m">${pad2(fullFolio(s.open))}</span>`, { style: 'display:flex;align-items:center;gap:8px' });
        const rows = rowList(ctx, x, y + hh, colW, pageRows(s), rowH);
        y += hh + s.pages.length * rowH + Math.round(rowH * 0.6);
        return head + rows;
      }).join('');
    }).join('');
    return page(ctx, 'contents', { body: textCol(ctx, 'contents', 'Seven sections, and the page each one opens on.') + out });
  },

  'open-brand': (ctx) => opener(ctx, 'open-brand'),
  'open-logo': (ctx) => opener(ctx, 'open-logo'),
  'open-colour': (ctx) => opener(ctx, 'open-colour'),
  'open-type': (ctx) => opener(ctx, 'open-type'),
  'open-layout': (ctx) => opener(ctx, 'open-layout'),
  'open-use': (ctx) => opener(ctx, 'open-use'),
  'open-close': (ctx) => opener(ctx, 'open-close'),

  who(ctx) {
    const K = geo(ctx), B = ctx.brand, E = ctx.esc, e = K.ex;
    const items = [['Description', B.description, 0.46], ['What it does', B.product, 0.27], ['Who it serves', B.audience, 0.27]];
    const gap = 0;
    let y = e.y; const out = [];
    const rows = K.portrait ? items : items;
    rows.forEach(([label, v, share], i) => {
      const h = Math.round((e.h - 0) * share);
      out.push(hr(e.x, y, e.w) + at(e.x, y + 14, 200, 14, mono(label)) + at(K.portrait ? e.x : e.x, y + 40, K.portrait ? e.w : e.w, h - 52, `<div class="d wc" style="font-size:${i === 0 ? (K.portrait ? 38 : 40) : (K.portrait ? 30 : 30)}px;line-height:1.28;white-space:normal;letter-spacing:-0.01em">${E(v)}</div>`));
      y += h + gap;
    });
    return page(ctx, 'who', { body: textCol(ctx, 'who', 'What the brand is, what it does and who it is for.') + out.join('') });
  },

  voice(ctx) {
    const K = geo(ctx), B = ctx.brand, E = ctx.esc, e = K.ex, list = (B.personality || []).slice(0, 4), n = Math.max(list.length, 1), h = e.h / n;
    const tw = K.portrait ? K.span(1, 3) : K.span(1, 4), mx = K.portrait ? K.x(4) : e.x + K.span(1, 4) + K.gut, mw = K.portrait ? K.span(1, 3) : K.span(1, 4);
    const out = list.map((p, i) => {
      const y = e.y + i * h;
      // A4 with up to three traits: the trait word runs the full width of the row, large, and its "in practice" text sits under it on the right-hand columns
      if (K.portrait && n <= 3) {
        const size = Math.min(72, Math.floor((h - 36 - 100 - 22) / 1.05)), tH = Math.max(88, Math.round(size * 1.1)), px = K.x(3);
        return hr(e.x, y, e.w) + at(e.x, y + 14, 80, 14, mono(pad2(i + 1))) + at(e.x, y + 36, e.w, tH, `<div class="d tr" style="font-size:${size}px;line-height:1.05;white-space:normal;letter-spacing:-0.02em">${E(p.trait)}</div>`)
          + at(px, y + 36 + tH, e.x + e.w - px, h - 36 - tH - 12, `<div class="m" style="margin-bottom:8px">In practice</div><div class="b" style="font-size:${K.body}px;line-height:1.5">${E(p.means)}</div>`);
      }
      return hr(e.x, y, e.w) + at(e.x, y + 14, 80, 14, mono(pad2(i + 1))) + at(e.x, y + 36, tw, h - 44, `<div class="d" style="font-size:${K.portrait ? 40 : 52}px;line-height:1.05;white-space:normal;letter-spacing:-0.02em">${E(p.trait)}</div>`)
        + at(mx, y + 14, mw, h - 22, `<div class="m" style="margin-bottom:8px">In practice</div><div class="b" style="font-size:${K.body}px;line-height:1.5">${E(p.means)}</div>`);
    }).join('');
    return page(ctx, 'voice', { body: textCol(ctx, 'voice', 'The qualities that shape how the brand behaves and what it writes.') + out });
  },

  words(ctx) {
    const K = geo(ctx), V = ctx.brand.voice, E = ctx.esc, e = K.ex, rows = (V.writeThis || []).slice(0, 3), n = Math.max(rows.length, 1);
    // A4: the 25 words are the large thing at the foot of the page (a block of 270 px from the foot up), and the pairs share the room above it
    const half = (e.w - K.gut) / 2, rh = K.portrait ? Math.floor((e.h - 26 - 14 - 270) / n) : 112, top = e.y;
    const head = at(e.x, top, half, 14, mono('Write this')) + at(e.x + half + K.gut, top, half, 14, mono('Not this'));
    const body = rows.map((r, i) => {
      const y = top + 26 + i * rh;
      return hr(e.x, y, e.w) + at(e.x, y + 12, half, rh - 18, `<div class="d wc" style="font-size:${K.portrait ? 24 : 22}px;line-height:1.25;white-space:normal;letter-spacing:0">${E(r.write)}</div>`)
        + at(e.x + half + K.gut, y + 12, half, rh - 18, `<div class="d strk wc" style="font-size:${K.portrait ? 24 : 22}px;line-height:1.25;white-space:normal;letter-spacing:0;color:var(--quiet)">${E(r.not)}</div>`);
    }).join('');
    const by = K.portrait ? K.y1 - 270 - 14 : top + 26 + n * rh;
    const boiler = hr(e.x, by + 14, e.w) + at(e.x, by + 30, e.w, 14, mono('The brand in 25 words')) + at(e.x, by + 56, K.portrait ? e.w : K.span(5, 12) - 40, K.y1 - by - 56, `<div class="d wc" style="font-size:${K.portrait ? 40 : 30}px;line-height:1.28;white-space:normal;letter-spacing:-0.01em">${E(V.boilerplate25)}</div>`);
    return page(ctx, 'words', { body: textCol(ctx, 'words', 'Lines the brand would write, the weaker ones they replace, and the brand in a breath.') + head + body + boiler });
  },

  mark(ctx) {
    const K = geo(ctx), G = groundsOf(ctx), t = tones(ctx, G.surface), E = ctx.esc, e = K.ex;
    // the mark is cropped by the page edge and kept clear of the text column: it starts under the running head (A4: under the text) and runs off the right and foot (A4: both sides and the foot)
    const L = ctx.logo, ar = L.geo.symbolAspect, bw = K.portrait ? 1400 : 1150, bh = bw / ar, bx = K.portrait ? -300 : 520, by = K.portrait ? 392 : K.T + 34;
    const logo = at(bx, by, bw, bh, L.html('symbol', { width: bw, color: t.ink }), { style: `color:${t.ink};--wm:.35` });
    const idea = at(K.tx.x, K.tx.y + (K.portrait ? 150 : 170), K.portrait ? K.span(1, 3) : K.tx.w, null, `<div class="m" style="margin-bottom:8px">The idea</div><div class="b" style="font-size:${K.body}px;line-height:1.5">${E(ctx.brand.logo.idea)}</div>`);
    return page(ctx, 'mark', { body: logo + textCol(ctx, 'mark', 'The mark, cut by the edge of the page so it reads as a part of something larger.') + idea });
  },

  versions(ctx) {
    const K = geo(ctx), G = groundsOf(ctx), F = logoFacts(ctx), E = ctx.esc;
    const seen = new Set(), picks = [];
    for (const g of F.grounds) { const h = g.groundHex.toLowerCase(); if (!seen.has(h)) { seen.add(h); picks.push(g); } }
    const four = picks.slice(0, 4), top = K.T + 34;
    const x0 = K.portrait ? 0 : K.x(5) - K.gut / 2, w = K.W - x0, hh = K.H - top;
    const cw = K.portrait ? w / 2 : w / 2, ch = K.portrait ? (hh - 270) / 2 : hh / 2, y0 = K.portrait ? top + 270 : top;
    const cells = four.map((g, i) => {
      const cx = x0 + (i % 2) * cw, cy = y0 + Math.floor(i / 2) * ch, t = tones(ctx, g.groundHex), lw = Math.min(cw * 0.5, 230);
      const when = ctx.brand.logo.when && ctx.brand.logo.when[g.key];
      const ground = (ctx.colours.find((c) => c.hex.toLowerCase() === g.groundHex.toLowerCase()) || {}).name;
      const inner = `<div class="a" style="left:${n1(cw / 2 - lw / 2)}px;top:${n1(ch * 0.36)}px;color:${t.ink}">${ctx.logo.html('colour', { width: lw, colourway: g.key, color: t.ink })}</div>`
        + `<div class="a" style="left:20px;bottom:18px;right:16px"><div class="m i">${E(g.label)}</div><div class="m">${ground ? own(ctx, ground) : ''} ${g.groundHex.toUpperCase()}</div>${when ? `<div class="ph-tight m w" style="margin-top:4px">${E(when)}</div>` : ''}</div>`;
      return field(ctx, cx, cy, cw + (i % 2 ? 0 : 0.5), ch + 0.5, g.groundHex, inner, edged(ctx, g.groundHex));
    }).join('');
    return page(ctx, 'versions', { body: (K.portrait ? textCol(ctx, 'versions', 'The logo on each ground it is drawn for.') : textCol(ctx, 'versions', 'The logo on each ground it is drawn for.')) + cells });
  },

  space(ctx) {
    const K = geo(ctx), G = groundsOf(ctx), t = tones(ctx, G.surface), F = logoFacts(ctx), L = ctx.logo, e = K.ex;
    const half = K.portrait ? K.span(1, 3) : K.span(1, 4), rx = K.portrait ? K.x(4) : e.x + half + K.gut;
    // the clear space: the logo's cap height on every side
    const LW = K.portrait ? 220 : 250, LH = LW / L.geo.aspect, u = Math.max(8, L.geo.unit * (LW / L.geo.width));
    const bx = e.x + (half - LW) / 2, by = e.y + (K.portrait ? 40 : 90);
    const rect = (x, y, w, h, st) => at(x, y, w, h, '', { style: `border:.5px ${st} var(--${st === 'dashed' ? 'quiet' : 'hair'})` });
    const diagram = rect(bx - u, by - u, LW + 2 * u, LH + 2 * u, 'dashed') + rect(bx, by, LW, LH, 'solid') + at(bx, by, LW, LH, L.html('colour', { width: LW, color: t.ink }), { style: `color:${t.ink}` })
      + vr(bx - u, by + LH + u + 6, 14) + vr(bx, by + LH + u + 6, 14) + hr(bx - u, by + LH + u + 13, u)
      + at(bx - u, by + LH + u + 20, 260, 14, mono(`x = ${F.unitText}`))
      + at(e.x, by + LH + u + 52, half, 14, mono('Clear space'));
    // the size ladder: six sizes from the smallest the logo goes, only that one named in ink
    const min = F.min.screenPx, fs = [1, 1.25, 1.5, 2, 2.5, 3], ws = fs.map((f) => Math.round(min * f));
    if (K.portrait) {
      // A4: the clear-space drawing is as large as the page leaves it, set to the right edge with its note in the strip to its left; the six sizes sit under it as three
      // rows of two on a shared baseline, at the foot of the page
      const ur = L.geo.unit / L.geo.width, ar = L.geo.aspect, sz = ws.map((w) => ({ w, h: w / ar })), rowHs = [0, 2, 4].map((i) => Math.max(sz[i].h, sz[i + 1].h));
      const cell = 8 + 14 + 22, head = 34, Hl = head + rowHs.reduce((a, h) => a + h + cell, 0);
      const LW2 = Math.max(200, Math.min((e.h - Hl - 36 - head - 44) / (1 / ar + 2 * ur), (e.w - 150) / (1 + 2 * ur))), u2 = ur * LW2, LH2 = LW2 / ar;
      const DW = LW2 + 2 * u2, DH = LH2 + 2 * u2, x0 = e.x + e.w - DW, y0 = e.y + head, bx2 = x0 + u2, by2 = y0 + u2;
      const dia = at(e.x, e.y, e.w, 14, mono('Clear space')) + hr(e.x, e.y + 20, e.w)
        + rect(x0, y0, DW, DH, 'dashed') + rect(bx2, by2, LW2, LH2, 'solid') + at(bx2, by2, LW2, LH2, L.html('colour', { width: LW2, color: t.ink }), { style: `color:${t.ink}` })
        + vr(x0, y0 + DH + 6, 14) + vr(bx2, y0 + DH + 6, 14) + hr(x0, y0 + DH + 13, u2)
        + at(x0, y0 + DH + 22, DW, 14, mono(`x = ${F.unitText}`))
        + at(e.x, y0, x0 - e.x - 16, 40, `<div class="m i">x</div><div class="m w" style="margin-top:4px">${F.unitText}, on every side</div>`);
      const lt = e.y + e.h - Hl, cw2 = (e.w - K.gut) / 2;
      let ly = lt + head; const lad = [at(e.x, lt, e.w, 14, mono('Sizes')) + hr(e.x, lt + 20, e.w)];
      [0, 2, 4].forEach((i, r) => {
        [i, i + 1].forEach((k, c) => {
          const cx = e.x + c * (cw2 + K.gut);
          lad.push(at(cx, ly + rowHs[r] - sz[k].h, sz[k].w, sz[k].h, L.html('colour', { width: sz[k].w, color: t.ink }), { style: `color:${t.ink}` }) + at(cx, ly + rowHs[r] + 8, cw2, 14, `<span class="m${k === 0 ? ' i' : ''}">${k === 0 ? `Minimum ${sz[k].w} px` : `${sz[k].w} px`}</span>`));
        });
        ly += rowHs[r] + cell;
      });
      return page(ctx, 'space', { body: textCol(ctx, 'space', 'How much room the logo keeps clear, and how small it goes.') + dia + lad.join('') });
    }
    const rows = ws.map((w) => ({ w, h: w / L.geo.aspect })), gap = Math.max(22, Math.min(64, (e.h - (K.portrait ? 60 : 110) - rows.reduce((a, r) => a + r.h, 0)) / (ws.length - 1))), total = rows.reduce((a, r) => a + r.h, 0) + gap * (rows.length - 1);
    let y = e.y + (K.portrait ? 40 : 70); const ladder = [];
    rows.forEach((r, i) => {
      ladder.push(at(rx, y, r.w, r.h, L.html('colour', { width: r.w, color: t.ink }), { style: `color:${t.ink}` }) + at(rx + half - 110, y + r.h / 2 - 7, 110, 14, `<span class="m${i === 0 ? ' i' : ''}" style="display:block;text-align:right">${i === 0 ? `Minimum ${r.w} px` : `${r.w} px`}</span>`));
      y += r.h + gap;
    });
    const lab = at(rx, e.y, half, 14, mono('Sizes')) + hr(rx, e.y + 20, half);
    return page(ctx, 'space', { body: textCol(ctx, 'space', 'How much room the logo keeps clear, and how small it goes.') + diagram + lab + ladder.join('') });
  },

  misuse(ctx) {
    const K = geo(ctx), G = groundsOf(ctx), t = tones(ctx, G.surface), L = ctx.logo, e = K.ex;
    const cols = K.portrait ? 2 : 3, rowsN = K.portrait ? 3 : 2, gap = K.portrait ? 14 : 16, cap = 26;
    const cw = (e.w - gap * (cols - 1)) / cols, ch = (e.h - gap * (rowsN - 1)) / rowsN - cap;
    // the placeholder (slot edition) is the square-ish mark, drawn to fill its slot: the wordmark's wide frame would leave it small. The theme css sets its opacity.
    const slot = ctx.edition === 'slot', lid = slot ? 'symbol' : 'colour';
    const lw = slot ? Math.min(cw * 0.46, ch * 0.62 * L.geo.symbolAspect, 170) : Math.min(cw * 0.52, 200), lh = lw / (slot ? L.geo.symbolAspect : L.geo.aspect);
    // a recolour that is plainly another colour: the inverse of the primary, pulled toward the ink until it carries 3:1 on the ground
    const [r, g, b] = hexToRgb(G.primary);
    let off = rgbToHex([255 - r, 255 - g, 255 - b]);
    for (let f = 0.1; ratio(off, t.ground) < 3 && f <= 1; f += 0.1) off = mix(off, t.ink, f);
    const fg = failingGround(ctx, t);
    const logoAt = (colour, st = '') => `<div class="a" style="left:${n1(cw / 2 - lw / 2)}px;top:${n1(ch / 2 - lh / 2)}px;color:${colour};${st}">${L.html(lid, { width: lw, color: colour })}</div>`;
    const crowd = [[-0.6, -0.9], [0.9, 0.7]].map(([dx, dy]) => `<div class="a" style="left:${n1(cw / 2 - lw / 2 + (dx > 0 ? lw + 4 : -lw * 0.6 - 4))}px;top:${n1(ch / 2 - lh / 2 + (dy > 0 ? 6 : -6))}px;width:${n1(lw * 0.6)}px;height:${n1(lh)}px;background:${t.hair}"></div>`).join('');
    const items = [
      ['Do not stretch', t.ground, logoAt(t.ink, 'transform:scaleX(1.5);transform-origin:center')],
      ['Do not recolour', t.ground, logoAt(off)],
      ['Do not outline', t.ground, `<div class="a" style="left:${n1(cw / 2 - lw / 2 - 8)}px;top:${n1(ch / 2 - lh / 2 - 8)}px;width:${n1(lw + 16)}px;height:${n1(lh + 16)}px;border:1px solid ${t.ink}"></div>${logoAt(t.ink)}`],
      ['Do not rotate', t.ground, logoAt(t.ink, 'transform:rotate(-14deg)')],
      ['Do not use on a ground it fails on', fg.bg, logoAt(fg.fg)],
      ['Do not crowd it', t.ground, crowd + logoAt(t.ink)],
    ];
    const cells = items.map(([label, gnd, inner], i) => {
      const x = e.x + (i % cols) * (cw + gap), y = e.y + Math.floor(i / cols) * (ch + cap + gap);
      const strikeLine = `<svg class="a" style="left:0;top:0" width="${n1(cw)}" height="${n1(ch)}" viewBox="0 0 ${n1(cw)} ${n1(ch)}" aria-hidden="true"><line x1="0" y1="${n1(ch)}" x2="${n1(cw)}" y2="0" stroke="${t.quiet}" stroke-width="1" vector-effect="non-scaling-stroke"/></svg>`;
      return at(x, y, cw, ch, `${inner}${strikeLine}`, { cls: 'wm', style: `background:${gnd};border:.5px solid ${t.hair};overflow:hidden` }) + at(x, y + ch + 8, cw, 14, mono(label));
    }).join('');
    return page(ctx, 'misuse', { body: textCol(ctx, 'misuse', 'Six ways the logo is never drawn.') + cells });
  },

  palette(ctx) {
    const K = geo(ctx), cs = colours(ctx), E = ctx.esc, top = K.T + 34, M = measure(ctx);
    const hasCmyk = (c) => Array.isArray(c.cmyk) && c.cmyk.length === 4;
    const shares = cs.map((c) => c.share);
    const sizes = shareByWeight(K.portrait ? K.H - top : K.W, shares, K.portrait ? 132 : 150, 0);
    let p = 0;
    const fields = cs.map((c, i) => {
      const t = tones(ctx, c.hex), s = sizes[i], pos = p; p += s;
      const rgb = hexToRgb(c.hex).join(' '), cmyk = hasCmyk(c) ? c.cmyk.join(' ') : '';
      const lines = `<div class="m i">${c.hex.toUpperCase()}</div><div class="m">RGB ${rgb}</div>${cmyk ? `<div class="m">CMYK ${cmyk}</div>` : ''}`;
      const edge = edged(ctx, c.hex), role = `<div class="m">${own(ctx, c.roleText)}</div>`;
      // the biggest field carries its name large in the display face, the values in mono beneath it
      const bigSize = Math.round(Math.min(K.portrait ? 104 : 76, M.fit(realOf(ctx, c.name), (K.portrait ? K.W - K.L - K.R : s - 32), 999)));
      if (K.portrait) {
        if (i === 0) return field(ctx, 0, top + pos, K.W, s, c.hex, `<div class="a" style="left:${K.L}px;top:18px;right:${K.R}px">${role}</div><div class="a" style="left:${K.L}px;bottom:24px;right:${K.R}px"><div class="d" style="font-size:${bigSize}px;line-height:1;letter-spacing:-0.02em;margin-bottom:14px">${own(ctx, c.name)}</div>${lines}</div>`, edge);
        return field(ctx, 0, top + pos, K.W, s, c.hex, `<div class="a" style="left:${K.L}px;top:18px;right:${K.R}px">${role}</div><div class="a d" style="left:${K.L}px;bottom:20px;width:${K.span(1, 3)}px;font-size:26px;line-height:1.05;white-space:normal;letter-spacing:0">${own(ctx, c.name)}</div><div class="a" style="left:${K.x(4)}px;bottom:20px">${lines}</div>`, edge);
      }
      if (i === 0) return field(ctx, pos, top, s, K.H - top, c.hex, `<div class="a" style="left:16px;top:16px;right:12px">${role}</div><div class="a" style="left:16px;bottom:${K.Bm - 40}px;right:12px"><div class="d" style="font-size:${bigSize}px;line-height:1;letter-spacing:-0.02em;margin-bottom:14px">${own(ctx, c.name)}</div>${lines}</div>`, edge);
      return field(ctx, pos, top, s, K.H - top, c.hex, `<div class="a" style="left:16px;top:16px;right:12px">${role}</div><div class="a" style="left:16px;bottom:${K.Bm - 40}px;right:12px"><div class="d" style="font-size:20px;line-height:1.1;white-space:normal;letter-spacing:0;margin-bottom:10px">${own(ctx, c.name)}</div>${lines}</div>`, edge);
    }).join('');
    return page(ctx, 'palette', { body: fields });
  },

  tints(ctx) {
    const K = geo(ctx), cs = colours(ctx), E = ctx.esc, e = K.portrait ? { ...K.ex, y: 268, h: K.y1 - 268 } : K.ex;
    // each colour is a block: its caption on its own row, then the steps. A4 sets the ten steps as two rows of five so each step has room for its name and hex.
    const steps = Object.keys(cs[0].ramp), rowsOf = K.portrait ? 2 : 1, perRow = steps.length / rowsOf, sw = e.w / perRow;
    const pitch = Math.floor(e.h / cs.length), capH = 26, nameH = K.portrait ? 14 : 28, gapR = 8, tickH = 8;
    const sh = Math.max(14, Math.min(64, (pitch - capH - 14 - rowsOf * (nameH + tickH + 6) - (rowsOf - 1) * gapR) / rowsOf));
    const out = cs.map((c, i) => {
      const y = e.y + i * pitch, base = String(rampBase(c.hex));
      const cells = steps.map((k, j) => {
        const rw = Math.floor(j / perRow), x = (j % perRow) * sw, top = rw * (sh + 6 + nameH + tickH + gapR);
        const hex = String(c.ramp[k]).toUpperCase(), mine = k === base;
        return `<div class="a" style="left:${n1(x)}px;top:${n1(top)}px;width:${n1(sw + 0.5)}px;height:${n1(sh)}px;background:${c.ramp[k]};${edged(ctx, c.ramp[k])}"></div>`
          + `<div class="a" style="left:${n1(x)}px;top:${n1(top + sh + 6)}px;width:${n1(sw)}px"><span class="m${mine ? ' i' : ''}">${k}</span>${K.portrait ? ` <span class="m">${hex}</span>` : `<br><span class="m">${hex}</span>`}</div>`
          + (mine ? `<div class="a" style="left:${n1(x)}px;top:${n1(top + sh + 6 + nameH + 2)}px;width:${n1(Math.min(sw, 28))}px;height:0;border-top:1px solid var(--ink)"></div>` : '');
      }).join('');
      return at(e.x, y, e.w, 14, `<span class="m i">${own(ctx, c.name)}</span> <span class="m">${c.hex.toUpperCase()}</span>`) + at(e.x, y + capH, e.w, pitch - capH, cells);
    }).join('');
    return page(ctx, 'tints', { body: textCol(ctx, 'tints', 'Each colour in ten steps, the brand colour marked on its own step.') + out });
  },

  pairs(ctx) {
    const K = geo(ctx), G = groundsOf(ctx), e = K.ex, E = ctx.esc, t = tones(ctx, G.ink);
    const used = ctx.pairs.map((p) => ({ fg: p.fgHex, bg: p.bgHex, r: p.ratioText, g: grade(p.ratio), use: own(ctx, p.use), ok: true }));
    const seen = new Set(), bad = [];
    for (const p of ctx.unusedPairs) { const k = [p.fgHex, p.bgHex].map((h) => h.toLowerCase()).sort().join('|'); if (p.fgHex.toLowerCase() === p.bgHex.toLowerCase() || seen.has(k)) continue; seen.add(k); bad.push({ fg: p.fgHex, bg: p.bgHex, r: p.ratioText, g: grade(p.ratio), use: 'Do not use', ok: false }); }
    const list = [...used, ...bad].slice(0, 12), n = list.length, cols = K.portrait ? 3 : 4, rowsN = Math.ceil(n / cols), gap = K.portrait ? 14 : 16;
    // a failing pair is drawn smaller than a pair in use, so a row of failing pairs is shorter than a row with one in use: each row takes the height its tiles need, and the
    // tiles are as tall as the area allows (a row's caption is 50 px under its tallest tile)
    const cw = (e.w - gap * (cols - 1)) / cols, rowOf = (i) => Math.floor(i / cols), small = 0.62;
    const fac = Array.from({ length: rowsN }, (_, r) => (list.some((p, i) => rowOf(i) === r && p.ok) ? 1 : small)), capH = 50, gapMin = 24;
    const th = Math.min(K.portrait ? 170 : 150, (e.h - capH * rowsN - gapMin * (rowsN - 1)) / fac.reduce((a, b) => a + b, 0));
    const gapR = rowsN > 1 ? Math.min(56, (e.h - fac.reduce((a, f) => a + f * th + capH, 0)) / (rowsN - 1)) : 0;
    const rowTop = fac.map((_, r) => fac.slice(0, r).reduce((a, f) => a + f * th + capH + gapR, 0));
    const aa = Math.round(Math.max(44, Math.min(64, th * 0.34)));
    const cells = list.map((p, i) => {
      const x = e.x + (i % cols) * (cw + gap), y = e.y + rowTop[rowOf(i)];
      // a failing pair is drawn smaller, struck by one hairline (in the ink that reads on that ground), and named "Do not use" with its ratio in the page ink
      const h = p.ok ? Math.round(th) : Math.round(th * small), strikeInk = tones(ctx, p.bg).ink;
      const tile = at(x, y, cw, h, `<div class="a d" style="left:16px;top:${p.ok ? 12 : 8}px;font-size:${p.ok ? aa : Math.round(aa * 0.6)}px;letter-spacing:0;color:${p.fg}">Aa</div>${p.ok ? '' : strike(cw, h, strikeInk)}`, { style: `background:${p.bg};border:.5px solid ${t.hair};overflow:hidden` });
      const cap = p.ok ? `<div class="m i">${p.r}:1 ${p.g}</div><div class="m" style="white-space:normal">${p.use}</div>` : `<div class="m i">Do not use</div><div class="m i">${p.r}:1 ${p.g}</div>`;
      return tile + at(x, y + h + 8, cw, 30, cap);
    }).join('');
    return page(ctx, 'pairs', { ground: G.ink, body: textCol(ctx, 'pairs', 'Every text and ground pair, with its contrast. A struck pair is never used for text.') + cells });
  },

  values(ctx) {
    const K = geo(ctx), cs = colours(ctx), e = K.ex, E = ctx.esc, hasCmyk = cs.some((c) => Array.isArray(c.cmyk) && c.cmyk.length === 4);
    const widths = K.portrait ? [230, 96, 90, 126, 116] : [230, 120, 100, 150, 130]; if (hasCmyk) widths.push(110);
    const sum = widths.reduce((a, b) => a + b, 0), f = e.w / sum, cw = widths.map((w) => w * f);
    const xs = cw.reduce((a, w, i) => (a.push(i ? a[i - 1] + cw[i - 1] : e.x), a), []);
    const heads = ['Name', 'Role', 'HEX', 'RGB', 'HSL', 'CMYK'].slice(0, widths.length);
    const head = heads.map((h, i) => at(xs[i] + (i === 0 ? 40 : 0), e.y, cw[i], 14, mono(h))).join('') + hr(e.x, e.y + 26, e.w);
    const rh = Math.min(K.portrait ? 104 : 64, Math.floor((e.h - 40) / cs.length));
    const rows = cs.map((c, i) => {
      const y = e.y + 26 + i * rh, v = [own(ctx, c.name), own(ctx, c.roleText), c.hex.toUpperCase(), hexToRgb(c.hex).join(' '), hslOf(c.hex).join(' '), hasCmyk && Array.isArray(c.cmyk) ? c.cmyk.join(' ') : ''];
      return at(e.x, y + rh / 2 - 12, 28, 24, '', { style: `background:${c.hex};border:.5px solid ${tones(ctx, ctx.roles.light.surface).hair}` })
        + v.slice(0, widths.length).map((s, j) => at(xs[j] + (j === 0 ? 40 : 0), y + rh / 2 - 9, cw[j] - (j === 0 ? 44 : 8), 18, j === 0 ? `<span class="b" style="font-size:${K.body + 1}px;white-space:nowrap">${s}</span>` : `<span class="m${j === 2 ? ' i' : ''}">${s}</span>`)).join('')
        + hr(e.x, y + rh, e.w);
    }).join('');
    return page(ctx, 'values', { body: textCol(ctx, 'values', 'Every colour with the values to build it. HSL is in degrees and percent.') + head + rows });
  },
};
