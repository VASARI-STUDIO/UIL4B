// Theme 33, Flyleaf, slice 4 (the Circular pass): pages 23 (Grid), 30 (On one page) and 31 (Contact) at 16:9. Pages 22, 25 and 29 (openers) are kept as built.
// Pages 24, 26, 27 and 28 (the mockup pages) are still the as-built flat pages: see 11_slice_log.md, slice 4, for what is left. A4 portrait is slice 5 (`wide`).
// Every spec number is scaled by 2/3. Colour, names, values, faces and the grid come from the engine; only the showcase copy is Margin's.
import {
  tones, varsOf, geo, own, realOf, at, hr, mono, page, field, groundsOf, n1,
} from './kit.js';
import { guidelines as A, colours, edged } from './brand-a.js';
import { pic } from './brand-s2.js';
import { copy, isShowcase } from './showcase.js';

const wide = (id, fn) => (ctx) => (geo(ctx).portrait ? A[id](ctx) : fn(ctx));
const SX = 427; // the specimen area starts here (640 on the 1920 spec)

// a contact field: the engine's placeholder at the real size of the copy, or the project's own words when it has written them (as brand-d.js)
function slot(ctx, path, value, size) {
  const E = ctx.esc, en = ctx.placeholders && ctx.placeholders.entries.find((x) => x.path === path);
  const css = `font-size:${size}px;line-height:1.2;white-space:normal;letter-spacing:-0.01em`;
  if (!en) return `<div class="d wc" style="${css}">${E(value)}</div>`;
  return `<div class="d wc" style="${css}"><span class="ph-b ph-b--real" data-ph="${path}"><span class="ph-l">${E(en.label)}</span><span class="ph-w">${E(en.what)}</span><span class="ph-m">${E(en.length)}.${en.first ? ` e.g. &quot;${E(en.example)}&quot;` : ''}</span></span></div>`;
}

export const guidelines = {
  // 5.1 Grid (Horizon 08, grid construction): the 16:9 slide grid drawn large over a real Flyleaf page (In use), with the A4 grid on all columns and on half drawn small beside it.
  grid: wide('grid', (ctx) => {
    const K = geo(ctx), G = ctx.gridMeasures, E = ctx.esc, g0 = groundsOf(ctx), show = isShowcase(ctx);
    const colW = (pw, n) => n1((pw - 2 * G.margin - (n - 1) * G.gutter) / n);
    const half = Math.max(1, Math.round(G.columns / 2));
    const SW = 1280, SH = 720, bw = 640, bh = bw * SH / SW, by = 232, aw = 106, ah = aw * G.page.h / G.page.w, ax = K.W - K.R - aw;
    // a frame in hairlines: columns as washes with edge lines, row lines; over a photograph the lines are light, else they are the page's hair tone
    const lineC = 'rgba(255,255,255,.55)', fillC = 'rgba(255,255,255,.14)';
    const frame = (x, y, w, h, pw, n, rows, inner, lc = lineC, fc = fillC) => {
      const k = w / pw, m = G.margin * k, gu = G.gutter * k, c = (w - 2 * m - (n - 1) * gu) / n;
      const cols = Array.from({ length: n }, (_, i) => at(x + m + i * (c + gu), y + m, c, h - 2 * m, '', { style: `background:${fc};border-left:.5px solid ${lc};border-right:.5px solid ${lc}` })).join('');
      const rws = Array.from({ length: rows + 1 }, (_, i) => at(x + m, y + m + i * ((h - 2 * m) / rows), w - 2 * m, 0, '', { style: `border-top:.5px solid ${lc}` })).join('');
      return at(x, y, w, h, inner, { style: 'border:.5px solid var(--hair);background:var(--g);overflow:hidden' }) + cols + rws;
    };
    const head = copy(ctx, 'type.sample.headline');
    const photoBox = pic(ctx, 'train', { w: bw, h: bh, fx: 0.5, fy: 0.5, alt: 'A reader on a train seat, with the slide grid drawn over it' })
      + (show ? `<div class="a d" style="left:${n1(G.margin * bw / SW)}px;top:${n1(bh * 0.2)}px;width:${n1(bw * 0.4)}px;font-size:${n1(80 * bw / SW)}px;line-height:1.02;letter-spacing:-0.02em;white-space:normal;color:#F1F1EC">${E(head)}</div>` : '');
    const big = frame(SX, by, bw, bh, SW, G.columns, 4, photoBox);
    // one line of dimensions above the big frame: the margin and the column drawn as two ticks, then the figures in one run, so nothing overprints
    const mk = G.margin * bw / SW, ck = (bw - 2 * mk - (G.columns - 1) * G.gutter * bw / SW) / G.columns;
    const dims = hr(SX, by - 14, mk) + hr(SX + mk, by - 14, ck) + at(SX, by - 38, bw, 14, mono(`Margin ${G.margin}, column ${colW(SW, G.columns)}, gutter ${G.gutter}`));
    const label = (x, y, a, b) => at(x, y, 220, 30, `<div class="m i">${a}</div><div class="m">${b}</div>`);
    const small = [[ax, by, G.columns], [ax, by + ah + 62, half]].map(([x, y, n]) => frame(x, y, aw, ah, G.page.w, n, 8, '', 'var(--hair)', 'var(--wash)') + label(x, y + ah + 6, 'A4 page', `${n} columns`)).join('');
    const steps = [['Step 1: Margins', `The margin is ${G.margin} px on every side. Nothing but a full-bleed field crosses it.`], ['Step 2: Columns', `${G.columns} columns across, or ${half} when the layout is simple. Each column is ${colW(G.page.w, G.columns)} px on the page.`], ['Step 3: Gutters', `${G.gutter} px between columns. A row is ${G.base} px, the base unit of the type.`]];
    const cw = (K.W - K.R - SX - 2 * 24) / 3;
    const stepsHtml = steps.map(([a, b], i) => at(SX + i * (cw + 24), 107, cw, 70, `<div class="m i" style="margin-bottom:8px">${a}</div><div class="b" style="font-size:13px;line-height:1.45">${E(b)}</div>`)).join('');
    const rows = [['Page', `${G.page.w} x ${G.page.h} px`], ['Margin', `${G.margin} px`], ['Columns', `${G.columns}`], ['Gutter', `${G.gutter} px`], ['Base unit', `${G.base} px`]];
    const table = rows.map(([a, v], i) => hr(K.tx.x, 330 + i * 30, K.tx.w) + at(K.tx.x, 330 + i * 30 + 8, K.tx.w, 14, `<span class="m">${a}</span><span class="m i" style="float:right">${v}</span>`)).join('');
    const text = at(K.tx.x, K.tx.y, K.tx.w, null, `<div class="m">5.1</div><h2 class="d ti">Grid</h2><p class="b tp">${E('The page grid: columns, gutter and margin, drawn on a slide over a real page, and on an A4 page.')}</p>`);
    return page(ctx, 'grid', { ground: g0.raised, body: text + stepsHtml + dims + big + label(SX, by + bh + 8, 'Slide, 16:9', `${G.columns} columns, drawn over the In use page`) + small + table });
  }),

  // 7.1 On one page (Horizon 10, brand elements): a 4 x 2 mosaic of flush cells bleeding to the page edges: the mark, a palette strip, "Aa", two photographs, the line and two colour fields.
  summary: wide('summary', (ctx) => {
    const K = geo(ctx), G = groundsOf(ctx), E = ctx.esc, cs = colours(ctx), L = ctx.logo, y0 = 96, cw = K.W / 4, ch = (K.H - y0) / 2;
    const dark = [...ctx.colours].sort((a, b) => a.hex.localeCompare(b.hex))[0].hex;
    const cell = (i, ground, inner, extra = '') => {
      const x = (i % 4) * cw, y = y0 + Math.floor(i / 4) * ch;
      return field(ctx, x, y, cw + 0.5, ch + 0.5, ground, inner, `overflow:hidden;${edged(ctx, ground)}${extra}`);
    };
    const photo = (i, id, fx, fy, alt) => at((i % 4) * cw, y0 + Math.floor(i / 4) * ch, cw + 0.5, ch + 0.5, pic(ctx, id, { w: cw + 0.5, h: ch + 0.5, fx, fy, alt }), { style: 'overflow:hidden' });
    const cap = (name, hex) => `<div class="a" style="left:16px;bottom:14px;right:12px"><div class="m i">${name}</div><div class="m">${hex.toUpperCase()}</div></div>`;
    const t0 = tones(ctx, G.surface), ti = tones(ctx, G.ink);
    const lw = Math.min(cw * 0.6, 190);
    const mark = cell(0, G.surface, `<div class="a lj" style="left:${n1(cw / 2 - lw / 2)}px;top:${n1(ch / 2 - lw / L.geo.aspect / 2)}px;color:var(--ink)">${L.html('colour', { width: lw, color: t0.ink })}</div>`);
    // the palette's own tile: the colours as stacked bars with their share of the page (a floor of 12 percent so a small colour still shows its name)
    const sh = cs.map((c) => Math.max(c.share || 1, 0)), tot = sh.reduce((x, y) => x + y, 0), fl = cs.map((_, i) => Math.max(sh[i] / tot, 0.17)), ft = fl.reduce((x, y) => x + y, 0);
    let py = 0;
    const strip = cell(3, G.surface, cs.map((c, i) => {
      const h = ch * fl[i] / ft, tt = tones(ctx, c.hex), o = at(0, py, cw + 0.5, h + 0.5, `<div class="a" style="left:16px;top:50%;margin-top:-14px;right:12px"><div class="m i">${own(ctx, c.name)}</div><div class="m">${c.hex.toUpperCase()}</div></div>`, { style: `background:${c.hex};${varsOf(tt)}` }); py += h; return o;
    }).join(''), 'border:none;');
    const aa = cell(2, G.ink, `<div class="a d" style="left:20px;top:${n1(-ch * 0.06)}px;font-size:${n1(ch * 0.95)}px;line-height:1;letter-spacing:-0.02em">Aa</div>${cap(E(realOf(ctx, ctx.brand.fonts.display.family)), G.ink)}`);
    const line = cell(5, G.ink, `<div class="a" style="left:22px;top:24px;right:20px"><div class="d" style="font-size:34px;line-height:1.05;letter-spacing:-0.02em;white-space:normal">${E(copy(ctx, 'lines.primary'))}</div></div>`);
    const f1 = cell(6, G.primary, cap(own(ctx, (ctx.colours.find((c) => c.hex.toLowerCase() === G.primary.toLowerCase()) || { name: '' }).name), G.primary));
    const f2 = isShowcase(ctx) ? photo(7, 'margin-note', 0.5, 0.6, 'A pencil note in the margin of a book') : cell(7, G.surface, cap(own(ctx, (ctx.colours.find((c) => c.hex.toLowerCase() === G.surface.toLowerCase()) || { name: '' }).name), G.surface));
    const body = mark + photo(1, 'train', 0.7, 0.5, 'A reader on a train seat') + aa + strip + photo(4, 'paperbacks', 0.5, 0.45, 'Five plain paperbacks on linen') + line + f1 + f2;
    void dark; void ti;
    return page(ctx, 'summary', { ground: G.ink, body, creditOn: G.surface });
  }),

  // 7.2 Contact (statement, on the primary colour): the line at 72 px, the body under it, and the owner, email and version in a column on the right.
  contact: wide('contact', (ctx) => {
    const K = geo(ctx), G = groundsOf(ctx), B = ctx.brand, E = ctx.esc;
    const head = copy(ctx, 'page.contact.headline', 'Ask before you change the mark.');
    const body = isShowcase(ctx) ? copy(ctx, 'page.contact.body') : `Write to the owner with the file and where it will run. ${ctx.versionLine}`;
    const rx = 830, rw = K.W - K.R - rx, rh = 118, ry = 120;
    const rows = [['Owner', slot(ctx, 'contact.owner', B.contact.owner, 22)], ['Email', slot(ctx, 'contact.email', B.contact.email, 22)], ['Version', `<div class="d" style="font-size:22px;line-height:1.2;letter-spacing:-0.01em">${E(ctx.versionLine)}</div>`]];
    const col = rows.map(([l, h], i) => hr(rx, ry + i * rh, rw) + at(rx, ry + i * rh + 12, rw, 14, mono(l)) + at(rx, ry + i * rh + 38, rw, rh - 44, h)).join('');
    const t = at(K.L, 250, 700, null, `<div class="d" style="font-size:72px;line-height:1.02;letter-spacing:-0.02em;white-space:normal">${E(head)}</div>`)
      + at(K.L, 560, 520, null, `<div class="b" style="font-size:16px;line-height:1.5">${E(body)}</div>`);
    return page(ctx, 'contact', { ground: G.primary, body: t + col });
  }),
};
