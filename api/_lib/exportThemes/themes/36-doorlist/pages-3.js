// Theme 36, Doorlist: pages 17 to 24 (Type: typefaces, scale, in use, type rules; Layout: grid, compositions; the openers are in pages-1.js). 16:9 only.
// Families: CS cropped specimen (faces), BL bill (scale), PW poster on a wall (in use), PT photo strips (type rules), LR ledger rows (grid), TF taped to the floor (compositions).
// Encore's words come from showcase.js through copy(); a fallback here is neutral. A slot is set at its real size as ghost type with one mono note; photo slots are colour fields.
import { typeLadder } from '../../engine/styleguide.js';
import { groundsOf, tones, onTone, mix, at, hr, fill, field, measure, word, baseTop, ghostRule, isGhost, hl, PHOTO_NOTE, nameOf as cust, page, n1, pad, fullFolio, varsOf } from './kit.js';
import { copy } from './showcase.js';
import { photo } from './photos.js';
import { warp, areaOnPage } from './mockups.js';
import { guidelines as pages1 } from './pages-1.js';
import { guidelines as pages2 } from './pages-2.js';

const slotOn = (ctx) => ctx.edition === 'slot';
const mockupsOn = (ctx) => !!(ctx.theme && ctx.theme.mockups === true) && !slotOn(ctx);
const nt = (ctx, s) => `<span class="nt">${ctx.esc(s)}</span>`;
const gl = (ctx, line) => ghostRule(ctx, line, '');
const H1 = (txt, x = 48, y = 48, w = 640) => at(x, y, w, 48, `<h1 class="h1">${txt}</h1>`);
const weightsOf = (ctx, role) => [...new Set(ctx.faces.filter((f) => f.role === role && f.style !== 'italic').map((f) => f.weight))].sort((a, b) => a - b).slice(0, 4);
const realOf = (ctx, s) => (typeof ctx.real === 'function' ? ctx.real(s) : String(s));
const cname = (ctx, hex) => { const c = [...ctx.colours, ...(ctx.tones || [])].find((x) => x.hex && x.hex.toLowerCase() === String(hex).toLowerCase()); return c && c.name ? ctx.esc(realOf(ctx, c.name)) : String(hex).toUpperCase(); };
// a page drawn as art inside another page (its section becomes a div, named so the harness does not count it as a page)
const asArt = (html, name) => html.replace(/^<section class="pg dl" data-page="[^"]*" style="/, `<div class="pg dl" data-page="${name}" style="break-after:auto;break-inside:auto;position:relative;width:1280px;height:720px;`).replace(/<\/section>$/, '</div>');
// the headline slot of type.sample.headline: the user's words, or ghost type (the mono note goes elsewhere on the page)
const headline = (ctx, fb) => { const v = copy(ctx, 'type.sample.headline'); return !slotOn(ctx) ? ctx.esc(fb) : isGhost(ctx, v) ? gl(ctx, 'Your headline, up to 6 words.') : ctx.esc(v); };
const HEAD_NOTE = 'Your headline, 5 to 8 words. Example: Fresh bread, warm by six.';

// ---- 20: the poster, drawn at A2 portrait (900 x 1273) ----
const PW = 900, PH = 1273;
function posterArt(ctx, G, M) {
  const slot = slotOn(ctx), E = ctx.esc, g = G.night, t = tones(ctx, g), X = 64, W = PW - 128, c = (k) => E(copy(ctx, `page.use.poster.${k}`, ''));
  let h = '';
  if (slot) {
    h += at(X, 64, W, 40, `<span class="lb" style="font-size:28px;line-height:40px">${E(cust(ctx))}</span>`) + hr(X, 120, W, t.ink, 4)
      + at(X, 200, W, 700, headline(ctx, ''), { cls: 'big', style: 'font-size:150px;line-height:1;text-wrap:balance' });
  } else {
    const s1 = Math.min(300, M.fit(copy(ctx, 'page.use.poster.l1', ''), W, 300)), s2 = Math.min(300, M.fit(copy(ctx, 'page.use.poster.l2', ''), W, 300));
    const s3 = Math.min(90, M.fit(copy(ctx, 'page.use.poster.l3', ''), W, 90)), s4 = Math.min(90, M.fit(copy(ctx, 'page.use.poster.l4', ''), W, 90));
    let y = 170;
    const b1 = y + M.cap * s1, b2 = b1 + 44 + M.cap * s2, b3 = b2 + 76 + M.cap * s3, b4 = b3 + 36 + M.cap * s4;
    h += at(X, 64, W, 40, `<span class="lb" style="font-size:28px;line-height:40px">${c('top')}</span>`) + hr(X, 120, W, t.ink, 4)
      + word(M, X, b1, c('l1'), s1) + word(M, X, b2, c('l2'), s2) + word(M, X, b3, c('l3'), s3) + word(M, X, b4, c('l4'), s4)
      + fill(0, 900, PW, 170, G.red) + word(M, X, 900 + 85 + M.cap * 120 / 2, c('phrase'), Math.min(120, M.fit(copy(ctx, 'page.use.poster.phrase', ''), W, 120)), { style: `color:${tones(ctx, G.red).ink}` })
      + hr(X, 1150, W, t.ink, 4) + at(X, 1168, W, 48, `<span style="font:600 36px/48px var(--body);color:var(--ink)">${c('foot')}</span>`);
  }
  return `<div data-contrast="demo" style="position:absolute;left:0;top:0;width:${PW}px;height:${PH}px;background:${g};${varsOf(t)};color:${t.ink}">${h}</div>`;
}

// ---- 24: the page art on a sheet of A4 landscape, 1280 x 905, the page centred with a paper margin ----
const SW = 1280, SH = 905;
const sheetArt = (html) => `<div data-contrast="demo" style="position:absolute;left:0;top:0;width:${SW}px;height:${SH}px;background:#FAF8F3"><div style="position:absolute;left:50px;top:120px;width:1180px;height:664px;overflow:hidden"><div style="width:1280px;height:720px;transform:scale(.9219);transform-origin:0 0">${html}</div></div></div>`;

// ---- 19: the bill ----
function scalePage(ctx) {
  const G = groundsOf(ctx), g = G.red, t = tones(ctx, g), M = measure(ctx), E = ctx.esc, W = ctx.weights, L = typeLadder(ctx), n = L.length;
  const rows = L.map((s, i) => {
    const text = copy(ctx, `page.scale.${i}`, s.use), disp = s.face === 'display';
    const size = disp ? Math.min(s.size, M.fit(text, 990, s.size)) : s.size, cap = disp ? M.cap : 0.66;
    return { s, text, disp, size, h: cap * size, d: 0.24 * size };
  });
  const b0 = 208, free = 624 - b0 - rows.slice(1).reduce((a, r) => a + r.h, 0) - rows.slice(0, -1).reduce((a, r) => a + r.d, 0), gap = Math.min(72, free / (n - 1));
  let out = at(48, 56, 600, 16, '<span class="lb">Type scale</span>') + at(198, 56, 900, 16, `<span class="m">${E(copy(ctx, 'page.scale.note', 'Largest first, each at its own size.'))}</span>`);
  let b = b0;
  rows.forEach((r, i) => {
    if (i) { out += hr(48, b - r.h - gap / 2 - 4 + 0, 1184, t.hair); }
    const lh = Math.round(r.size * 1.3);
    out += r.disp ? word(M, 48, b, E(r.text), r.size)
      : at(48, baseTop(b, r.size, lh), 1000, lh, E(r.text), { style: `font:${r.s.weight} ${n1(r.size)}px/${lh}px var(--body);color:var(--ink);white-space:nowrap` });
    out += at(1098, b - 22, 134, 36, `<span class="m" style="display:block">${E(r.s.token)}</span><span class="m" style="display:block;margin-top:2px">${n1(r.size)} / ${r.s.lineRatio}</span>`);
    if (i < n - 1) b += r.d + gap + rows[i + 1].h;
  });
  return page(ctx, 'scale', g, out);
}

export const guidelines = {
  // ---- 18 Typefaces (CS, cropped specimen): the display face's name at 240, cut by the right edge, its glyphs and the three faces under it ----
  faces(ctx) {
    const G = groundsOf(ctx), g = G.stock, M = measure(ctx), E = ctx.esc, B = ctx.brand, W = ctx.weights;
    const dn = String(B.fonts.display.family), bn = String(B.fonts.body.family), mn = 'DM Mono';
    const size = Math.min(240, M.fit(dn, 1330, 240));
    const set = [['Display', dn, [W.heading]], ['Reading', bn, weightsOf(ctx, 'body')], ['Values', mn, [400]]];
    const lines = ['ABCDEFGHIJKLMNOPQRSTUVWXYZ', 'abcdefghijklmnopqrstuvwxyz 0123456789'];
    let out = at(48, 56, 400, 16, '<span class="lb">Typefaces</span>') + at(648, 56, 584, 16, `<span class="m">Display, weight ${W.heading}</span>`)
      + word(M, 48, 288, E(dn), size);
    lines.forEach((ln, i) => { out += word(M, 48, 384 + i * 40, ln, Math.min(32, M.fit(ln, 1184, 32))); });
    out += hr(48, 480, 1184, 'var(--ink)');
    set.forEach(([lab, fam, ws], i) => {
      const y = 496 + i * 40;
      out += (i ? hr(48, y - 4, 560, 'var(--hair)') : '') + at(48, y + 6, 90, 16, `<span class="lb">${lab}</span>`)
        + at(150, y + 4, 200, 24, `<span style="font:600 16px/24px var(--body)">${E(fam)}</span>`) + at(380, y + 6, 228, 16, `<span class="m">${ws.join(', ')}</span>`);
    });
    const para = copy(ctx, 'page.faces.text', `${dn} sets headlines and names. ${bn} sets reading and small print. ${mn} sets values only.`);
    out += at(648, 496, 584, 96, `<div class="b">${E(para)}</div>`);
    return page(ctx, 'faces', g, out);
  },

  scale: scalePage,

  // ---- 20 In use (PW, poster on a wall): the poster pasted on a laneway wall, a Night panel beside it ----
  hierarchy(ctx) {
    const G = groundsOf(ctx), g = G.night, M = measure(ctx), E = ctx.esc, slot = slotOn(ctx), W = ctx.weights, L = typeLadder(ctx);
    const frame = { left: 0, top: 0, w: 848, h: 672, fx: 0.365, fy: 0.5, zoom: 1 };
    const pa = posterArt(ctx, G, M);
    let left;
    if (mockupsOn(ctx)) left = at(0, 0, 848, 672, photo(ctx, 'IMG-05', { w: 848, h: 672, fx: frame.fx, fy: frame.fy }), { style: 'overflow:hidden' }) + warp(ctx, 'IMG-05', 'poster', frame, { html: pa, w: PW, h: PH });
    else {
      const ph = 576, pw = ph * PW / PH, k = ph / PH, st = G.stage;
      left = field(ctx, 0, 0, 848, 672, st, '') + at((848 - pw) / 2, 48, pw, ph, `<div style="width:${PW}px;height:${PH}px;transform:scale(${k.toFixed(5)});transform-origin:0 0">${pa}</div>`, { style: `overflow:hidden;box-shadow:0 0 0 1px ${tones(ctx, st).hair}` });
    }
    const head = L.find((s) => s.token === 'headline') || L[1], body = L.find((s) => s.token === 'body') || L[L.length - 3];
    const rowsT = [['Ground', `${cname(ctx, G.night)}, ${G.night.toUpperCase()}`], ['Names', `${E(B_fam(ctx))} ${W.heading}, fitted to the width`], ['Phrase', `${cname(ctx, G.red)}, ${G.red.toUpperCase()}`], ['Small print', `${body.size} px, ${E(ctx.brand.fonts.body.family)}`]];
    const info = rowsT.map(([l, v], i) => hr(896, 372 + i * 64, 336, i ? 'var(--hair)' : 'var(--ink)') + at(896, 386 + i * 64, 336, 40, `<span class="lb">${l}</span><br><span class="m13">${v}</span>`)).join('');
    const note = slot ? at(896, 292, 336, 56, nt(ctx, HEAD_NOTE)) : '';
    const text = at(896, 148, 336, 120, `<div class="b">${E(copy(ctx, 'page.use.text', 'A poster is read from a distance. Set the names large, light one phrase, keep the rest small.'))}</div>`);
    return page(ctx, 'hierarchy', g, left + at(896, 56, 336, 16, '<span class="lb">Poster, A2</span>') + H1('In use', 896, 84, 336) + text + note + info);
  },

  // ---- 21 Type rules (PT, photo strips): one line set three ways, each a crop of the room with the rule and the verdict under it ----
  'type-rules'(ctx) {
    const G = groundsOf(ctx), g = G.stage, t = tones(ctx, g), M = measure(ctx), E = ctx.esc, slot = slotOn(ctx), tn = tones(ctx, G.night);
    const sample = headline(ctx, copy(ctx, 'page.rules.sample', 'Your headline.'));
    const rule = (i, path, fb, what) => (slot ? ghostRule(ctx, what, '') : E(copy(ctx, `page.rules.${i}`, fb)));
    const strips = [
      { y: 96, ok: true, f: { fx: 0.5, fy: 0.12 }, ground: G.night, col: G.stock, x: 24, rule: slot ? copy(ctx, 'type.rules.0.do') : '', path: 'type.rules.0.do', what: 'A habit to keep.' },
      { y: 272, ok: false, f: { fx: 0.5, fy: 0.55 }, ground: G.stage, col: G.stock, x: 340, rule: slot ? copy(ctx, 'type.rules.0.dont') : '', path: 'type.rules.0.dont', what: 'A habit to avoid.' },
      { y: 448, ok: false, f: { fx: 0.5, fy: 0.27 }, ground: G.red, col: mix(G.red, G.night, 0.14), x: 24, rule: slot ? copy(ctx, 'type.rules.1.dont') : '', path: 'type.rules.1.dont', what: 'A habit to avoid.' },
    ];
    let out = H1('Type rules', 48, 40, 400).replace('class="h1"', 'class="h1" style="font-size:28px"') + at(498, 52, 734, 24, `<span class="cap" style="color:var(--quiet)">${E(copy(ctx, 'page.rules.text', 'One line, set three ways. Only the first is let in.'))}</span>`);
    strips.forEach((s, i) => {
      const size = Math.min(44, M.fit('Doors at 8. You are on the list.', 600, 44));
      const type = at(s.x, 36, 760, 52, `<div class="d" style="font-size:${size}px;line-height:52px;color:${s.col}">${sample}</div>`);
      const pic = slot ? field(ctx, 0, 0, 1184, 120, s.ground, type + (i === 0 ? at(24, 96, 700, 16, nt(ctx, PHOTO_NOTE)) : ''), `box-shadow:inset 0 0 0 1px ${t.hair}`)
        : at(0, 0, 1184, 120, `<div data-contrast="demo">${photo(ctx, 'IMG-01', { w: 1184, h: 120, ...s.f })}${type}</div>`, { style: 'overflow:hidden' });
      const verdict = s.ok ? hl(ctx, 'In') : '<span class="lb q">Turned away</span>';
      const cap = at(0, 120, 1184, 40, at(16, 8, 940, 24, `<span class="b" style="font-size:15px;line-height:24px">${slot ? ghostRule(ctx, s.what, '') : rule(i, s.path, '', s.what)}</span>`) + at(1050, 8, 134, 24, verdict, { style: 'line-height:24px' }), { style: `background:${G.night};${varsOf(tn)}` });
      out += at(48, s.y, 1184, 160, pic + cap, { style: 'overflow:hidden' });
    });
    return page(ctx, 'type-rules', g, out);
  },

  // ---- 23 Grid (LR, ledger rows): the fifteen rows ruled like a list, the eight columns laid over them ----
  grid(ctx) {
    const G = groundsOf(ctx), g = G.stock, t = tones(ctx, g), E = ctx.esc, gm = ctx.gridMeasures || {};
    const gu = gm.gutter || 16, base = gm.base || 4, n = 8, cw = (1184 - (n - 1) * gu) / n, X = (i) => 48 + i * (cw + gu), span = (a, b) => (b - a + 1) * (cw + gu) - gu, band = mix(g, t.ink, 0.035);
    let out = '';
    for (let i = 0; i < n; i++) out += fill(X(i), 48, cw, 576, band) + at(X(i) + 6, 12, cw, 22, i === 3 ? `<span class="m q">${pad(i + 1)}</span>` : hl(ctx, `<span class="m" style="color:inherit">${pad(i + 1)}</span>`), { style: 'line-height:22px' });
    for (let r = 1; r <= 14; r++) out += (r > 1 ? hr(0, 48 * (r - 1), 1280, t.hair) : '') + at(16, 48 * (r - 1) + 16, 28, 16, `<span class="m q">${pad(r)}</span>`);
    out += hr(0, 624, 1280, t.hair);
    out += at(X(0), 60, span(0, 2), 48, '<h1 class="h1">Grid</h1>') + at(X(0), 144, span(0, 2), 96, `<div class="b">${E(copy(ctx, 'page.grid.text', 'Fifteen rows of 48, ruled like a list. Text sits on rows 2 to 13; photographs stop at row 14.'))}</div>`);
    out += field(ctx, X(4), 96, span(4, 7), 192, G.red, at(20, 16, 400, 16, '<span class="lb">4 columns, 4 rows</span>') + at(20, 152, 500, 20, `<span class="m">x ${n1(X(4))}, width ${n1(span(4, 7))} px</span>`));
    out += field(ctx, X(0), 384, span(0, 2), 192, G.night, at(20, 16, 300, 16, '<span class="lb">3 columns, 4 rows</span>') + at(20, 152, 380, 20, `<span class="m">x ${n1(X(0))}, width ${n1(span(0, 2))} px</span>`));
    out += at(X(4), 396, span(4, 7), 72, `<div class="b">${E(copy(ctx, 'page.grid.row', 'Row 15 is the list row. It sits on every page.'))}</div>`);
    const vals = [['Columns', String(n)], ['Column', `${n1(cw)} px`], ['Gutter', `${gu} px`], ['Margin', '48 px'], ['Rows', '15 of 48 px'], ['Base', `${base} px`]];
    vals.forEach(([l, v], i) => { out += at(48 + i * 200, 632, 190, 32, `<span class="lb q" style="display:inline-block;width:70px">${l}</span><span class="m13">${v}</span>`, { style: 'line-height:32px' }); });
    const over = at(8, 685, 40, 22, hl(ctx, '15', 'font:400 13px/22px var(--mono);letter-spacing:.02em'), { style: `${varsOf(tones(ctx, groundsOf(ctx).stock))};line-height:22px;padding-left:6px` });
    return page(ctx, 'grid', g, out, over);
  },

  // ---- 24 Compositions (TF, taped to the floor): pages 1 and 13 printed on two of the three sheets on the stage floor; flat, pages 1, 13 and 19 at 3:10 on Stage ----
  compositions(ctx) {
    const G = groundsOf(ctx), E = ctx.esc;
    const art = (id, name, fn) => ({ id, name, no: fullFolio(id), html: asArt(fn(ctx), `art-${id}`) });
    if (mockupsOn(ctx)) {
      const arts = [art('cover', 'You', pages1.cover), art('palette', 'Palette', pages2.palette)], frame = { left: 0, top: 0, w: 1280, h: 672, fx: 0.5, fy: 0.5, zoom: 1 };
      let body = at(0, 0, 1280, 672, photo(ctx, 'IMG-07', { w: 1280, h: 672, fx: frame.fx, fy: frame.fy }), { style: 'overflow:hidden' });
      arts.forEach((a, i) => {
        const area = ['sheet1', 'sheet2'][i];
        body += warp(ctx, 'IMG-07', area, frame, { html: sheetArt(a.html), w: SW, h: SH });
        const q = areaOnPage(ctx, 'IMG-07', area, frame).quad, cx = (q[0][0] + q[1][0]) / 2, by = Math.max(q[2][1], q[3][1]);
        body += field(ctx, cx - 70, by + 22, 140, 24, G.night, at(0, 4, 140, 16, `<span class="m" style="display:block;text-align:center">${pad(a.no)} ${E(a.name)}</span>`));
      });
      const card = field(ctx, 48, 48, 520, 112, G.night, at(20, 16, 480, 16, '<span class="lb">Layout</span>') + at(20, 36, 480, 52, '<h1 class="h1">Compositions</h1>') + at(20, 84, 480, 20, `<span class="m13">${E(copy(ctx, 'page.compositions.text', `Pages ${arts.map((a) => a.no).join(' and ')}, printed and taped to the stage floor.`))}</span>`));
      return page(ctx, 'compositions', G.night, body + card);
    }
    const arts = [art('cover', 'You', pages1.cover), art('palette', 'Palette', pages2.palette), art('scale', 'Scale', scalePage)], g = G.stage, t = tones(ctx, g), K = 0.3, PWd = 384, PHt = 216, Y = 304;
    const tape = mix(g, t.ink, 0.5);
    let out = H1('Compositions', 48, 48, 600) + at(48, 112, 640, 48, `<div class="b">${E(copy(ctx, 'page.compositions.text', `Pages ${arts.map((a) => a.no).join(', ')}, each with its list row.`))}</div>`);
    arts.forEach((a, i) => {
      const x = 48 + i * (PWd + 16);
      out += at(x, Y, PWd, PHt, `<div data-contrast="demo" style="width:1280px;height:720px;transform:scale(${K});transform-origin:0 0">${a.html}</div>`, { style: `overflow:hidden;box-shadow:0 0 0 1px ${t.hair}` })
        + fill(x - 8, Y - 10, 56, 18, tape) + fill(x + PWd - 48, Y - 10, 56, 18, tape)
        + at(x, Y + PHt + 24, PWd, 40, `<span class="lb">${E(a.name)}</span><br><span class="m13">${pad(a.no)} of 31</span>`);
    });
    return page(ctx, 'compositions', g, out);
  },
};
function B_fam(ctx) { return ctx.brand.fonts.display.family; }

// shared with the A4 edition
export { posterArt, PW as POSTER_W, PH as POSTER_H };
