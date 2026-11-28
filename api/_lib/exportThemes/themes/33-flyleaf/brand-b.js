// Theme 33, Flyleaf: the brand guidelines, pages 17 to 24 (4 Type: opener, typefaces, scale, in use, rules; 5 Layout: opener, grid, compositions), at 16:9 and A4 portrait.
// Same contract as brand-a.js: absolute boxes on the grid in kit.js, a size is its own arrangement (K.portrait), every text colour from tones() of the ground it sits on, brand copy
// the user writes through ctx.esc() (the slot edition shows its placeholder), words the project supplied through own(). The type scale, the faces and the page grid are the
// project's own (ctx.brand.type, ctx.faces, ctx.gridMeasures); nothing here invents a size, a name or a caption.
import { typeLadder } from '../../engine/styleguide.js';
import { ratio } from '../../engine/color.js';
import {
  refOf, tones, varsOf, geo, measure, own, realOf, at, hr, mono, page, bare, textCol, field, groundsOf, n1, mix, pad2,
} from './kit.js';
import { word, leafOf, edged, opener } from './brand-a.js';

const WEIGHT_NAMES = { 100: 'Thin', 200: 'Extralight', 300: 'Light', 400: 'Regular', 500: 'Medium', 600: 'Semibold', 700: 'Bold', 800: 'Extrabold', 900: 'Black' };
// the largest size (up to max) at which s fits in w, in the face with this stem (glyph by glyph: the shaper throws on some digits)
export function fitIn(ctx, stem, s, w, max, track = 0) {
  const font = ctx.loadFont(stem), upm = font.unitsPerEm;
  const width = [...String(s)].reduce((a, ch) => a + font.charToGlyph(ch).advanceWidth * 100 / upm, 0) + track * 100 * [...String(s)].length;
  return Math.min(max, (w / Math.max(width, 1)) * 100);
}
export const facesOf = (ctx, role) => ctx.faces.filter((f) => f.role === role && f.style !== 'italic');
export const weightsOf = (ctx, role) => [...new Set(facesOf(ctx, role).map((f) => f.weight))].sort((a, b) => a - b).slice(0, 4);
// a step of the scale as it is drawn: display steps are cut in the heading weight (as the engine's own pages draw them)
const weightOf = (ctx, t) => (t.face === 'display' ? ctx.weights.heading : t.weight);
const stepCss = (ctx, t) => `font-family:var(--${t.face === 'display' ? 'display' : 'body'});font-weight:${weightOf(ctx, t)};font-size:${t.size}px;line-height:${t.lineRatio};${t.face === 'display' && t.size > 40 ? 'letter-spacing:-0.02em;' : ''}`;
const hexName = (ctx, hex) => { const c = ctx.colours.find((x) => x.hex.toLowerCase() === hex.toLowerCase()); return c ? own(ctx, c.name) : ''; };

// ---- the type opener: the ink ground, one glyph of the display face at 120 percent of the page height, cut by the edges, the usual opener drawn over it ----
function openType(ctx) {
  const K = geo(ctx), s = refOf(ctx, 'open-type').sec, leaf = leafOf(ctx, s.n), t = tones(ctx, leaf), M = measure(ctx);
  // the glyph is a step off the ground, as far as the ink still carries 4.5:1 across it (all text on this page is the ink, which has to read on the ground and on the glyph)
  let f = 0.16, gl = mix(t.ground, t.ink, f);
  while (ratio(t.ink, gl) < 4.5 && f > 0.02) { f -= 0.02; gl = mix(t.ground, t.ink, f); }
  if (ratio(t.ink, gl) < 4.5) gl = t.ground;
  const S = (1.2 * K.H) / M.cap, base = 1.05 * K.H, gx = K.portrait ? -0.2 * K.W : 0.3 * K.W;
  return opener(ctx, 'open-type', { behind: word(ctx, M, gx, base, 'Aa', S, { colour: gl }), rowsInk: true });
}

export const guidelines = {
  'open-type': openType,

  faces(ctx) {
    const K = geo(ctx), e = K.ex, E = ctx.esc, bh = Math.floor(e.h / 2);
    const SET = ['ABCDEFGHIJKLMNOPQRSTUVWXYZ', 'abcdefghijklmnopqrstuvwxyz', '0123456789 &amp;!?.,:;\'&quot;()-+/@#%'];
    const blocks = [['display', 'Display'], ['body', 'Body']].map(([role, label], i) => {
      const fam = ctx.brand.fonts[role].family, fc = facesOf(ctx, role), ws = weightsOf(ctx, role), y = e.y + i * bh, stem = (fc[0] || ctx.faces[0]).stem;
      const css = `font-family:var(--${role});`;
      const nameSize = Math.floor(fitIn(ctx, stem, fam, e.w, K.portrait ? 84 : 76, role === 'display' ? -0.02 : 0));
      const name = at(e.x, y + 34, e.w, Math.round(nameSize * 1.12), E(fam), { style: `${css}font-weight:${role === 'display' ? ctx.weights.heading : ctx.weights.regular};font-size:${nameSize}px;line-height:1.1;white-space:nowrap;letter-spacing:${role === 'display' && nameSize > 40 ? '-0.02em' : '0'}` });
      const y2 = y + 34 + Math.round(nameSize * 1.12) + 18, csz = K.portrait ? 24 : 22;
      const sets = (x, w, yy) => at(x, yy, w, csz * 1.4 * 3, SET.map((l) => `<div style="${css}font-weight:${ws[0]};font-size:${csz}px;line-height:1.4;white-space:nowrap">${l}</div>`).join(''));
      const aaSize = K.portrait ? 56 : 64, cellW = Math.min(150, (K.portrait ? e.w : (e.w - K.gut) / 2) / Math.max(ws.length, 1));
      const wx = K.portrait ? e.x : e.x + (e.w + K.gut) / 2;
      const weights = ws.map((w, k) => at(wx + k * cellW, y2, cellW, aaSize + 26, `<div style="${css}font-weight:${w};font-size:${aaSize}px;line-height:1;margin-bottom:10px">Aa</div><div class="m i">${w} ${WEIGHT_NAMES[w] || ''}</div>`)).join('');
      const charY = K.portrait ? y2 + aaSize + 40 : y2;
      return hr(e.x, y, e.w) + at(e.x, y + 12, 200, 14, mono(label)) + name + weights + sets(e.x, K.portrait ? e.w : (e.w - K.gut) / 2, charY);
    }).join('');
    return page(ctx, 'faces', { body: textCol(ctx, 'faces', 'The two faces the brand sets in, the weights it uses and every character they carry.') + blocks });
  },

  scale(ctx) {
    const K = geo(ctx), e = K.ex, E = ctx.esc, L = typeLadder(ctx), metaW = K.portrait ? 140 : 160, useW = K.portrait ? 160 : 190;
    const head = at(e.x, e.y, metaW, 14, mono('Step')) + at(e.x + metaW, e.y, 200, 14, mono('Sample')) + at(e.x + e.w - useW, e.y, useW, 14, `<span class="m" style="display:block;text-align:right">Use</span>`) + hr(e.x, e.y + 24, e.w);
    // a step's row is as tall as its line plus a fixed margin, so the biggest steps have the most room; together the rows fill the example area
    const y0 = e.y + 24, wts = L.map((t) => t.line + 44), tot = wts.reduce((a, b) => a + b, 0);
    let y = y0;
    const rows = L.map((t, i) => {
      const h = Math.round((e.h - 24) * wts[i] / tot), ry = y; y += h;
      return (i < L.length - 1 ? hr(e.x, ry + h, e.w) : '')
        + at(e.x, ry, metaW, h, `<div><div class="m i">${E(t.name)}</div><div class="m">${t.size} / ${t.line} px</div><div class="m">${weightOf(ctx, t)}</div></div>`, { style: 'display:flex;align-items:center' })
        + at(e.x + metaW, ry, e.w - metaW - useW - 12, h, `<div style="${stepCss(ctx, t)}white-space:nowrap">Aa Bb Cc 0123</div>`, { style: 'display:flex;align-items:center' })
        + at(e.x + e.w - useW, ry, useW, h, `<span class="m w" style="display:block;text-align:right">${E(t.use || '')}</span>`, { style: 'display:flex;align-items:center;justify-content:flex-end' });
    }).join('');
    return page(ctx, 'scale', { body: textCol(ctx, 'scale', 'The type scale, each step drawn at its real size, with its line height and weight.') + head + rows });
  },

  hierarchy(ctx) {
    const K = geo(ctx), G = groundsOf(ctx), e = K.ex, B = ctx.brand, E = ctx.esc, L = typeLadder(ctx), W = ctx.weights;
    const head = L.find((t) => t.token === 'headline') || L[Math.min(1, L.length - 1)], para = L.find((t) => t.token === 'body') || L[Math.floor(L.length / 2)], cap = L.find((t) => t.token === 'caption') || L[L.length - 1];
    const pad = 40, sw = e.w, sh = e.h, surface = ctx.roles.light.surface;
    // a page composition on the dark ground: the sheet is the brand surface, and the three samples sit on it at the real size of their steps
    const hw = K.portrait ? sw - 2 * pad : Math.round(sw * 0.64), pw = K.portrait ? Math.round(sw * 0.62) : 380;
    const sheet = field(ctx, e.x, e.y, sw, sh, surface,
      at(pad, pad, hw, null, `<div class="d wc" style="${stepCss(ctx, head)}white-space:normal;font-weight:${W.heading}">${E(B.type.sample.headline)}</div>`)
      + at(sw - pad - pw, Math.round(sh * (K.portrait ? 0.42 : 0.5)), pw, null, `<div class="b wc" style="${stepCss(ctx, para)}">${E(B.type.sample.paragraph)}</div>`)
      + at(pad, sh - pad - 90, K.portrait ? Math.round(sw * 0.5) : 300, 90, `<div class="b wc" style="${stepCss(ctx, cap)}">${E(B.type.sample.caption)}</div>`, { style: 'display:flex;align-items:flex-end' }));
    const spec = [['Headline', head], ['Paragraph', para], ['Caption', cap]].map(([l, t], i) => `<div style="margin-bottom:12px"><div class="m i">${l}</div><div class="m">${E(t.name)}, ${t.size} / ${t.line} px, ${weightOf(ctx, t)}</div></div>`).join('');
    const specAt = K.portrait ? at(K.x(4), K.tx.y + 6, K.span(4, 6), null, spec) : at(K.tx.x, K.tx.y + 190, K.tx.w, null, spec);
    return page(ctx, 'hierarchy', { ground: G.ink, body: textCol(ctx, 'hierarchy', 'A headline, a paragraph and a caption set in the brand styles on one sheet.') + specAt + sheet });
  },

  'type-rules'(ctx) {
    const K = geo(ctx), e = K.ex, E = ctx.esc, rules = (ctx.brand.type.rules || []).slice(0, 6), n = Math.max(rules.length, 1);
    const numW = K.portrait ? 32 : 40, half = (e.w - numW - K.gut) / 2, x2 = e.x + numW + half + K.gut, rh = (e.h - 26) / n;
    const head = at(e.x + numW, e.y, half, 14, mono('Do')) + at(x2, e.y, half, 14, mono('Do not'));
    const rows = rules.map((r, i) => {
      const y = e.y + 26 + i * rh;
      return hr(e.x, y, e.w) + at(e.x, y + 12, numW, 14, mono(pad2(i + 1)))
        + at(e.x + numW, y + 10, half, rh - 14, `<div class="b wc" style="font-size:${K.portrait ? 17 : 16}px;line-height:1.4">${E(r.do)}</div>`)
        + at(x2, y + 10, half, rh - 14, `<div class="b strk wc" style="font-size:${K.portrait ? 17 : 16}px;line-height:1.4;color:var(--quiet)">${E(r.dont)}</div>`);
    }).join('');
    return page(ctx, 'type-rules', { body: textCol(ctx, 'type-rules', 'What to do with the type, and what to leave alone. The struck line is never done.') + head + rows });
  },

  'open-layout': (ctx) => opener(ctx, 'open-layout'),

  grid(ctx) {
    const K = geo(ctx), e = K.ex, G = ctx.gridMeasures, E = ctx.esc;
    // one drawing of the brand grid on a page of pw x ph (the margin, gutter and column count are the brand's), at scale k; dims puts the measures above it
    const draw = (x, y, pw, ph, k, dims) => {
      const m = G.margin * k, g = G.gutter * k, c = ((pw - 2 * G.margin - (G.columns - 1) * G.gutter) / G.columns) * k;
      const cols = Array.from({ length: G.columns }, (_, i) => at(x + m + i * (c + g), y + m, c, ph * k - 2 * m, '', { style: 'background:var(--wash);border-left:.5px solid var(--hair);border-right:.5px solid var(--hair)' })).join('');
      const d = dims ? at(x, y - 34, m, 14, mono(G.margin)) + at(x + m, y - 34, c, 14, mono(n1((pw - 2 * G.margin - (G.columns - 1) * G.gutter) / G.columns))) + at(x + m + c, y - 34, g + 40, 14, mono(G.gutter))
        + hr(x, y - 14, m) + hr(x + m, y - 14, c) + hr(x + m + c, y - 14, g) : '';
      return at(x, y, pw * k, ph * k, '', { style: 'border:.5px solid var(--hair)' }) + cols + d;
    };
    const k1 = K.portrait ? 0.55 : Math.min(0.45, (e.h - 34 - 40) / G.page.h), w1 = G.page.w * k1, h1 = G.page.h * k1, gx = e.x + w1 + (K.portrait ? 24 : 40), gw = e.x + e.w - gx;
    const SW = 1280, SH = 720, k2 = gw / SW, h2 = SH * k2, top = e.y + 34 + 34;
    const colW = (pw) => n1((pw - 2 * G.margin - (G.columns - 1) * G.gutter) / G.columns);
    const rows = [['Page', `${G.page.w} x ${G.page.h} px`], ['Margin', `${G.margin} px`], ['Columns', `${G.columns} columns, ${colW(G.page.w)} px each`], ['Gutter', `${G.gutter} px`], ['Base unit', `${G.base} px`]];
    const table = rows.map(([a, v], i) => hr(gx, top + h2 + 56 + i * 30, gw) + at(gx, top + h2 + 56 + i * 30 + 8, gw, 14, `<span class="m">${a}</span><span class="m i" style="float:right">${v}</span>`)).join('');
    const body = at(e.x, e.y, w1, 14, mono('A4 page')) + draw(e.x, top, G.page.w, G.page.h, k1, true)
      + at(e.x, top + h1 + 10, w1 + 40, 14, mono(`${G.page.w} x ${G.page.h} px, drawn at ${Math.round(k1 * 100)}%`))
      + at(gx, e.y, gw, 14, mono('Slide, 16:9')) + draw(gx, top, SW, SH, k2, false)
      + at(gx, top + h2 + 10, gw, 14, mono(`${SW} x ${SH} px, ${G.columns} columns, ${colW(SW)} px each`))
      + table;
    return page(ctx, 'grid', { body: textCol(ctx, 'grid', 'The page grid: columns, gutter and margin, drawn on a page and on a slide.') + body });
  },

  compositions(ctx) {
    const K = geo(ctx), e = K.ex, G = groundsOf(ctx), M = measure(ctx), name = realOf(ctx, ctx.brand.name);
    const surface = ctx.roles.light.surface, st = tones(ctx, surface), ink = (h) => tones(ctx, h);
    const block = (hex) => (ratio(hex, surface) >= 1.15 ? hex : ink(surface).hair);
    // flat stand-ins for text: a bar is a line of type, never copy
    const bars = (x, y, w, n, h, gap, colour, last = 0.6) => Array.from({ length: n }, (_, i) => at(x, y + i * (h + gap), i === n - 1 ? w * last : w, h, '', { style: `background:${colour}` })).join('');
    const nm = (x, y, w, size, colour = '') => at(x, y, w, size * 1.15, own(ctx, ctx.brand.name), { cls: 'd clip', style: `font-size:${n1(size)}px;line-height:1.1;letter-spacing:-0.02em;${colour ? `color:${colour};` : ''}` });
    const poster = (x, y, w, h) => { const m = w * 0.09, size = Math.min(h * 0.16, M.fit(name, w - 2 * m, 999)); return field(ctx, x, y, w, h, G.primary, bars(m, m, w - 2 * m, 3, h * 0.012, h * 0.012, 'var(--ink)', 0.45) + hr(m, h - m - size * 1.15 - 12, w - 2 * m) + nm(m, h - m - size * 1.15, w - 2 * m, size), edged(ctx, G.primary)); };
    const sheet = (x, y, w, h) => { const m = w * 0.1, size = h * 0.034; return field(ctx, x, y, w, h, surface, nm(m, m, w * 0.5, size) + bars(m, m + h * 0.08, w * 0.7, 2, h * 0.04, h * 0.012, 'var(--ink)', 0.55)
      + bars(w * 0.3, m + h * 0.24, w * 0.6, 7, h * 0.008, h * 0.014, 'var(--quiet)', 0.5) + at(m, h * 0.62, w - 2 * m, h * 0.28, '', { style: `background:${block(G.accent === G.primary ? G.panel : G.accent)}` }), `border:.5px solid ${st.hair};`); };
    const slide = (x, y, w, h) => { const m = h * 0.1, size = h * 0.09; return field(ctx, x, y, w, h, G.ink, nm(m, m, w * 0.5, size) + bars(m, m + size * 1.9, w * 0.5, 2, h * 0.07, h * 0.03, 'var(--ink)', 0.6) + at(w * 0.68, 0, w * 0.32, h, '', { style: `background:${G.primary === G.ink ? G.accent : G.primary}` }), edged(ctx, G.ink)); };
    const list = [['Poster', G.primary, poster], ['Page', surface, sheet], ['Slide', G.ink, slide]];
    const cap = (x, y, w, [label, hex]) => at(x, y, w, 30, `<div class="m i">${label}</div><div class="m">${hexName(ctx, hex)} ${hex.toUpperCase()}</div>`);
    let out;
    if (K.portrait) {
      // A4: the slide runs across the top, the poster and the page below it at the proportion of a sheet, and the grounds are keyed in the column beside them
      const sw = e.w, sh = Math.round(sw * 9 / 16), ph = 320, pw = Math.round(ph / 1.414), py = e.y + sh + 24, kx = e.x + 2 * pw + 14 + 28;
      out = slide(e.x, e.y, sw, sh) + poster(e.x, py, pw, ph) + sheet(e.x + pw + 14, py, pw, ph)
        + [list[0], list[1], list[2]].map((it, i) => cap(kx, py + i * 52, e.x + e.w - kx, it)).join('');
    } else {
      // 16:9: the poster tall on the left; the slide above the page on the right, each with its ground under it
      const pw = 354, ph = 500, rx = e.x + pw + 32, rw = e.w - pw - 32, sh = Math.round(rw * 9 / 16), gy = e.y + sh + 66, gh = e.y + e.h - 36 - gy, gw = Math.round(gh / 1.414);
      out = poster(e.x, e.y, pw, ph) + cap(e.x, e.y + ph + 8, pw, list[0])
        + slide(rx, e.y, rw, sh) + cap(rx, e.y + sh + 8, rw, list[2])
        + sheet(rx, gy, gw, gh) + cap(rx, gy + gh + 8, rw, list[1]);
    }
    return page(ctx, 'compositions', { body: textCol(ctx, 'compositions', 'A poster, a page and a slide, drawn flat from the brand colours and type.') + out });
  },
};
