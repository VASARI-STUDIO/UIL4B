// Theme 35, Dispatch: pages 18 to 24 (Type: typefaces, scale, in use, type rules; Layout: grid, compositions; the Layout opener is in pages-1.js). 16:9 only.
// Families (none repeated beside it): WL width ladder (faces), TL tracking timeline (scale), KS kerb split (in use), PF placement frames (type rules), CB column bands (grid),
// PS parcel shelf (compositions). Kerbside's words come from showcase.js through copy(); a fallback here is neutral. A slot is set at its real size as ghost type with one mono note.
// Only Archivo wdth 125 / wght 800 is bundled, so every display line is that one width; the width ladder on page 18 says so and draws no other width.
import { typeLadder } from '../../engine/styleguide.js';
import { fullFolio, timeOf, pad, groundsOf, tones, onTone, mix, at, hr, vr, fill, svgAt, field, measure, word, ghostRule, isGhost, PHOTO_NOTE, MARK, page, n1, varsOf } from './kit.js';
import { copy } from './showcase.js';
import { photo } from './photos.js';
import { warp, flat, areaOnPage } from './mockups.js';
import { guidelines as pages1 } from './pages-1.js';
import { guidelines as pages2 } from './pages-2.js';
import { guidelines as all } from './index.js';

const slotOn = (ctx) => ctx.edition === 'slot';
const mockupsOn = (ctx) => !!(ctx.theme && ctx.theme.mockups === true) && !slotOn(ctx);
const H1 = (txt, x = 48, y = 68, w = 640) => at(x, y, w, 52, `<h1 class="h1">${txt}</h1>`);
const weightsOf = (ctx, role) => [...new Set(ctx.faces.filter((f) => f.role === role && f.style !== 'italic').map((f) => f.weight))].sort((a, b) => a - b).slice(0, 5);
// a page drawn as art inside another page (its section becomes a div, named so the harness does not take it for the page itself)
const asArt = (html, name) => html.replace(/^<section class="pg ds" data-page="[^"]*" style="/, `<div class="pg ds" data-page="${name}" style="break-after:auto;break-inside:auto;position:relative;width:1280px;height:720px;`).replace(/<\/section>$/, '</div>');
// a photo slot: a colour field with the UIL4B mark cropped at the right, and one mono note
function slotPic(ctx, x, y, w, h, ground, note) {
  const G = groundsOf(ctx), hh = h * 1.15, ww = hh * MARK.w / MARK.h, c = mix(ground, tones(ctx, ground).ink, 0.12);
  const mark = svgAt(w - ww * 0.62, -h * 0.08, ww, hh, `<g fill="${c}" transform="scale(${n1(hh / MARK.h)})">${MARK.paths.map((d) => `<path d="${d}"/>`).join('')}</g>`);
  return field(ctx, x, y, w, h, ground, mark + (note ? at(16, 14, w - 32, 40, `<span class="nt">${ctx.esc(note)}</span>`) : ''));
}
export const chip = (ctx, x, y, text, ground) => field(ctx, x, y, 72, 24, ground, at(0, 4, 72, 16, `<span class="lb" style="display:block;text-align:center">${text}</span>`));

// ---- 20: the headline set on the trike's box panel, drawn at the panel's own proportion (1200 x 667) ----
export const PAW = 1200, PAH = 667;
export function panelArt(ctx, G, M) {
  const slot = slotOn(ctx), ga = G.ink, ta = tones(ctx, ga), acc = onTone(ctx, G.primary, ga, 4.5), E = ctx.esc;
  const head = copy(ctx, 'page.use.panel', 'Your headline'), W = PAW - 144;
  const size = Math.min(240, M.fit(head, 1.85 * W, 240));
  let logo = '';
  if (!slot) { try { logo = ctx.logo.svg('colour', { width: 380, colourway: 'reversed' }); } catch (e) { logo = ''; } }
  return `<div data-contrast="demo" style="position:absolute;left:0;top:0;width:${PAW}px;height:${PAH}px;background:${ga};${varsOf(ta)};color:${ta.ink}">`
    + `<div class="d" style="position:absolute;left:72px;top:64px;width:${W}px;font-size:${n1(size)}px;line-height:.94;white-space:normal;text-wrap:balance;color:${slot ? ta.soft : acc}">${E(head)}</div>`
    + (logo ? `<div style="position:absolute;left:72px;bottom:56px;width:380px">${logo}</div>` : `<div style="position:absolute;left:72px;bottom:56px;width:240px;height:12px;background:${ta.soft}"></div>`)
    + '</div>';
}

// the three pages that sit on the labels of page 24: the cover, the palette and page 26 (the page that exists nearest to it until Digital is built)
const COMPOSE = [['cover', 'Cover'], ['palette', 'Palette'], ['digital', 'Digital']];
const pageFn = (id) => (id === 'cover' ? pages1.cover : id === 'palette' ? pages2.palette : (all.digital || pages2.values));

export const guidelines = {
  // ---- 18 Typefaces (WL): the three faces, and one specimen: the two times and the figure set, huge, in the display face ----
  faces(ctx) {
    const G = groundsOf(ctx), g = G.panel, t = tones(ctx, g), M = measure(ctx), E = ctx.esc, B = ctx.brand, W = ctx.weights;
    const mono = (B.fonts.mono && B.fonts.mono.family) || 'IBM Plex Mono';
    const set = [
      { lab: 'Display', fam: B.fonts.display.family, css: `font-family:var(--display);font-weight:${W.heading};letter-spacing:-.02em`, size: 104, ws: [W.heading] },
      { lab: 'Reading', fam: B.fonts.body.family, css: `font-family:var(--body);font-weight:${W.regular || 400}`, size: 88, ws: weightsOf(ctx, 'body') },
      { lab: 'Values', fam: mono, css: 'font-family:var(--mono);font-weight:400', size: 64, ws: [400] },
    ];
    const left = set.map((s, i) => {
      const y = 168 + i * 168, note = copy(ctx, `page.faces.${i}`, `Weights ${s.ws.join(', ')}.`);
      return hr(48, y, 424) + at(48, y + 16, 200, 16, `<span class="lb">${s.lab}</span>`)
        + at(48, y + 36, 200, 120, 'Aa', { cls: 'd', style: `${s.css};font-size:${s.size}px;line-height:${s.size}px;letter-spacing:${i ? '0' : '-.02em'}` })
        + at(256, y + 36, 216, 120, `<div class="h2" style="font-size:19px">${E(s.fam)}</div><div class="b" style="margin-top:8px;font-size:14px;line-height:20px">${E(note)}</div>`);
    }).join('');
    // the specimen: the two times that frame every job, huge, joined by the route, and the full figure set under them. All Archivo width 125, weight 800, tabular
    const X = 520, RW = 616, A = '10:00', Z = '12:00', FIG = '0123456789';
    const size = Math.min(M.fit(A, RW, 300), M.fit(Z, RW, 300)), fs = M.fit(FIG, RW, 84);
    const b1 = 208 + M.cap * size, bar = b1 + 28, b2 = bar + 8 + 28 + M.cap * size, b3 = b2 + 32 + M.cap * fs;
    const specimen = word(M, X, b1, E(A), size) + fill(X, bar, RW, 8, G.primary) + fill(X + RW - 8, bar - 8, 8, 24, G.primary)
      + word(M, X, b2, E(Z), size) + word(M, X, b3, FIG, fs, { style: `color:${t.quiet}` })
      + at(X, b3 + 14, RW, 16, `<span class="m">${E(B.fonts.display.family)}, width 125, weight ${W.heading}, tabular figures</span>`);
    const head = hr(48, 48, 1088) + H1('Typefaces') + hr(X, 160, RW) + at(X, 172, RW, 16, '<span class="lb">Times and figures</span>');
    return page(ctx, 'faces', g, head + left + specimen);
  },

  // ---- 19 Scale (TL): a tracking timeline. One event per step of the scale, largest first, each set at its own size ----
  scale(ctx) {
    const G = groundsOf(ctx), g = G.ink, t = tones(ctx, g), E = ctx.esc, W = ctx.weights;
    const L = typeLadder(ctx), n = L.length, top = 150, bot = 656;
    const room = bot - top - 20 * (n - 1), total = L.reduce((a, s) => a + s.line, 0), k = Math.min(1, room / total);
    const sig = onTone(ctx, G.primary, g, 4.5), gap = (bot - top - total * k) / Math.max(1, n - 1);
    let y = top, out = fill(198, 48, 4, 624, sig);
    L.forEach((s, i) => {
      const lh = s.line * k, size = s.size * k, mid = y + lh / 2;
      const txt = copy(ctx, `page.scale.${i}`, s.use);
      const css = `font-family:var(--${s.face === 'display' ? 'display' : 'body'});font-weight:${s.face === 'display' ? W.heading : s.weight};font-size:${n1(size)}px;line-height:${n1(lh)}px;white-space:nowrap;${s.face === 'display' && size > 40 ? 'letter-spacing:-.02em;' : ''}`;
      out += (i ? hr(232, y - gap / 2, 904, 'var(--hair)', 1) : '')
        + at(48, mid - 9, 128, 18, `<span class="m13" style="display:block;text-align:right">${E(copy(ctx, `page.scale.t.${i}`, pad(i + 1)))}</span>`)
        + fill(192, mid - 8, 16, 16, sig)
        + at(232, y, 780, lh, E(txt), { style: `${css}overflow:hidden` })
        + at(1040, mid - 16, 96, 32, `<span class="m" style="display:block">${E(s.token)}</span><span class="m q" style="display:block">${s.size} / ${s.lineRatio}</span>`);
      y += lh + gap;
    });
    const head = hr(48, 48, 1088) + H1('Scale', 232, 68, 500)
      + at(560, 74, 480, 44, `<div class="b">${E(copy(ctx, 'page.scale.note', 'Each step is set at its own size. Largest first.'))}</div>`);
    return page(ctx, 'scale', g, head + out);
  },

  // ---- 20 In use (KS): the trike's box panel above, the same line on a Signal band below ----
  hierarchy(ctx) {
    const G = groundsOf(ctx), g = G.primary, t = tones(ctx, g), M = measure(ctx), E = ctx.esc, slot = slotOn(ctx), W = ctx.weights;
    const frame = { left: 0, top: 0, w: 1184, h: 432, fx: 0.5, fy: 0.3707, zoom: 1 };
    let top;
    if (mockupsOn(ctx)) {
      top = at(0, 0, 1184, 432, photo(ctx, 'IMG-05', { w: 1184, h: 432, fx: frame.fx, fy: frame.fy }), { style: 'overflow:hidden' })
        + warp(ctx, 'IMG-05', 'panel', frame, { html: panelArt(ctx, G, M), w: PAW, h: PAH });
    } else {
      const pw = 672, f = flat({ html: panelArt(ctx, G, M), w: PAW, h: PAH }, 48, 29, pw), tp = tones(ctx, G.panel);
      const rows = [['Panel', '16 : 9'], ['Headline', `${E(ctx.brand.fonts.display.family)} ${W.heading}`], ['Ground', G.ink.toUpperCase()]];
      const info = rows.map(([l, v], i) => hr(768, 56 + i * 64, 368, i ? 'var(--hair)' : 'var(--ink)', i ? 1 : 4) + at(768, 72 + i * 64, 368, 40, `<span class="lb">${l}</span><br><span class="m13">${v}</span>`)).join('');
      top = field(ctx, 0, 0, 1184, 432, G.panel, f.html + info + (slot ? at(768, 276, 368, 60, `<span class="nt">${E(PHOTO_NOTE)}</span>`) : ''));
    }
    const line = copy(ctx, 'page.use.line', 'Your headline');
    let band;
    if (slot) {
      const size = M.fit('Your headline, up to 6 words.', 940, 108);
      band = at(48, 560 - size * M.base, 1088, size + 60, ghostRule(ctx, 'Your headline, up to 6 words.', '1 line, up to 6 words. Example: Fresh bread, before seven.'), { cls: 'big', style: `font-size:${n1(size)}px;line-height:1;white-space:nowrap` });
    } else {
      band = word(M, 48, 560, E(line), M.fit(line, 1088, 108));
    }
    const size = Math.min(108, M.fit(slot ? 'Your headline, up to 6 words.' : line, slot ? 940 : 1088, 108));
    const bandHead = at(48, 452, 600, 16, `<span class="lb">Headline</span><span class="m" style="margin-left:16px">${Math.round(size)} px, weight ${W.heading}</span>`)
      + at(760, 452, 376, 16, `<span class="lb">Body</span><span class="m" style="margin-left:16px">${E(typeLadder(ctx).find((s) => s.token === 'body')?.size || 15)} px</span>`);
    const body = at(48, slot ? 640 : 604, 640, 44, `<div class="b">${E(copy(ctx, 'page.use.body', 'Body copy, set in the reading face.'))}</div>`);
    return page(ctx, 'hierarchy', g, top + hr(0, 432, 1184, 'var(--ink)', 4) + bandHead + band + body);
  },

  // ---- 21 Type rules (PF): placement frames. One pass, two fails ----
  'type-rules'(ctx) {
    const G = groundsOf(ctx), g = G.panel, t = tones(ctx, g), M = measure(ctx), E = ctx.esc, slot = slotOn(ctx);
    const sample = copy(ctx, 'page.rules.sample', 'Your headline.');
    const txt = (x, y, w, size, col) => at(x, y, w, size * 1.1, E(sample), { cls: 'd', style: `font-size:${n1(size)}px;line-height:1;color:${col}` });
    const frames = [
      { x: 48, y: 48, w: 672, h: 378, pass: true, id: 'IMG-08', f: { fx: 0.5, fy: 0.5 }, art: txt(32, 28, 600, Math.min(72, M.fit(sample, 600, 72)), t.ink), ground: G.ink },
      { x: 768, y: 48, w: 368, h: 207, pass: false, id: 'IMG-01', f: { fx: 0.55, fy: 0.33 }, art: txt(16, 78, 336, Math.min(44, M.fit(sample, 336, 44)), G.surface), ground: G.ink },
      { x: 768, y: 359, w: 368, h: 207, pass: false, id: 'IMG-08', f: { fx: 0.5, fy: 0.1, zoom: 1.5 }, art: txt(16, 20, 336, Math.min(44, M.fit(sample, 336, 44)), G.primary), ground: G.ink },
    ];
    const caps = [
      ['Pass.', copy(ctx, 'page.rules.0', 'Set the line on open space, never across the subject.'), 48, 442, 600],
      ['Fail.', copy(ctx, 'page.rules.1', 'Across the subject.'), 768, 267, 368],
      ['Fail.', copy(ctx, 'page.rules.2', 'A light accent colour on a photo drops below 3:1 on light patches.'), 768, 578, 368],
    ];
    const pics = frames.map((fr, i) => {
      const pic = slot ? slotPic(ctx, fr.x, fr.y, fr.w, fr.h, fr.ground, i === 0 ? PHOTO_NOTE : 'Your photograph.')
        : at(fr.x, fr.y, fr.w, fr.h, `<div data-contrast="demo">${photo(ctx, fr.id, { w: fr.w, h: fr.h, ...fr.f })}</div>${fr.art}`, { style: 'overflow:hidden' });
      return pic + chip(ctx, fr.x + 12, fr.y + fr.h - 36, fr.pass ? 'Pass' : 'Fail', fr.pass ? G.ink : G.primary);
    }).join('');
    const notes = caps.map(([l, s, x, y, w]) => at(x, y, w, 64, `<span class="lb">${l}</span><div class="b" style="margin-top:6px">${E(s)}</div>`)).join('');
    return page(ctx, 'type-rules', g, pics + notes + hr(48, 556, 672) + H1('Type rules', 48, 580, 672));
  },

  // ---- 23 Grid (CB): twelve column bands, the page's own measures read off them ----
  grid(ctx) {
    const G = groundsOf(ctx), g = G.surface, t = tones(ctx, g), tp = tones(ctx, G.panel), E = ctx.esc, M = ctx.gridMeasures || {};
    const n = M.columns || 12, gu = M.gutter || 16, cw = (1088 - (n - 1) * gu) / n, X = (i) => 48 + i * (cw + gu), span = (a, b) => (b - a + 1) * (cw + gu) - gu;
    const bands = Array.from({ length: n }, (_, i) => fill(X(i), 48, cw, 624, G.panel) + at(X(i), 56, cw, 52, String(i + 1), { cls: 'd', style: `font-size:48px;line-height:52px;text-align:center;color:${tp.quiet};letter-spacing:-.02em` })).join('');
    const rowsHr = Array.from({ length: 7 }, (_, r) => hr(48, 48 + r * 104 - (r === 6 ? 1 : 0), 1088, t.hair, 1)).join('');
    const a = Math.min(7, n) - 1, b0 = Math.min(7, n - 1);
    const sig = field(ctx, X(0), 152, span(0, a), 208, G.primary, at(20, 150, span(0, a) - 40, 40, `<span class="lb">${a + 1} column${a ? 's' : ''}</span>`) + at(20, 16, span(0, a) - 40, 52, `<h1 class="h1">${E(copy(ctx, 'page.grid.title', 'Grid'))}</h1>`) + at(20, 76, span(0, a) - 40, 40, `<div class="b">${E(copy(ctx, 'page.grid.0', 'One idea to a block.'))}</div>`));
    const ink = field(ctx, X(b0), 360, span(b0, n - 1), 208, G.ink, at(20, 150, span(b0, n - 1) - 40, 40, `<span class="lb">${n - b0} column${n - b0 === 1 ? '' : 's'}</span>`) + at(20, 16, span(b0, n - 1) - 40, 56, `<div class="h2">${E(copy(ctx, 'page.grid.1', 'The rest of the page.'))}</div>`));
    const vals = [['Columns', String(n)], ['Column', `${n1(cw)} px`], ['Gutter', `${gu} px`], ['Margin', '48 px'], ['Base', `${M.base || 4} px`], ['Row', '104 px']];
    const read = vals.map(([l, v], i) => at(48 + i * (1088 / vals.length), 584, 1088 / vals.length - 12, 70, `<span class="lb">${l}</span><div class="h2" style="margin-top:4px">${E(v)}</div>`)).join('');
    return page(ctx, 'grid', g, bands + rowsHr + sig + ink + read);
  },

  // ---- 24 Compositions (PS): pages 1, 13 and 26 printed on the three labels of the depot shelf; flat, they are the same three pages at 1:3 ----
  compositions(ctx) {
    const G = groundsOf(ctx), E = ctx.esc;
    const arts = COMPOSE.map(([id, name]) => ({ id, name, no: fullFolio(id), html: asArt(pageFn(id)(ctx), `art-${id}`) }));
    const label = (a) => `<div data-contrast="demo" style="position:absolute;left:0;top:0;width:1280px;height:760px;background:${G.surface}"><div style="position:absolute;left:50px;top:50px;width:1180px;height:660px;overflow:hidden"><div style="width:1280px;height:720px;transform:scale(.9219);transform-origin:0 0">${a.html}</div></div></div>`;
    const sub = copy(ctx, 'page.compositions.note', `Pages ${arts.map((a) => a.no).join(', ')}, set on label stock.`);
    if (mockupsOn(ctx)) {
      const frame = { left: 0, top: 0, w: 1184, h: 720, fx: 0.5, fy: 0.5, zoom: 1 };
      let body = at(0, 0, 1184, 720, photo(ctx, 'IMG-03', { w: 1184, h: 720, fx: 0.5, fy: 0.5 }), { style: 'overflow:hidden' });
      arts.forEach((a, i) => {
        const area = ['label-a', 'label-b', 'label-c'][i];
        body += warp(ctx, 'IMG-03', area, frame, { html: label(a), w: 1280, h: 760 });
        const q = areaOnPage(ctx, 'IMG-03', area, frame).quad, cx = (q[0][0] + q[1][0]) / 2, by = Math.max(q[2][1], q[3][1]);
        body += field(ctx, cx - 70, by + 18, 140, 24, G.ink, at(0, 4, 140, 16, `<span class="m" style="display:block;text-align:center">${pad(a.no)} ${E(a.name)}</span>`));
      });
      const card = field(ctx, 48, 48, 520, 128, G.surface, at(20, 16, 480, 16, '<span class="lb">Layout</span>') + at(20, 36, 480, 52, '<h1 class="h1">Compositions</h1>') + at(20, 92, 480, 24, `<span class="m13">${E(sub)}</span>`), `box-shadow:inset 0 0 0 4px ${G.ink}`);
      return page(ctx, 'compositions', G.ink, body + card);
    }
    // flat: Asphalt ground, the three pages at 1:3 stepping down the page, the first in front so each stub stays in sight
    const g = G.ink, t = tones(ctx, g), K = 1 / 3, PW = Math.round(1280 * K), PH = Math.round(720 * K), xs = [48, 378, 708], ys = [176, 256, 336];
    const plates = [2, 1, 0].map((i) => at(xs[i], ys[i], PW, PH, `<div data-contrast="demo" style="width:1280px;height:720px;transform:scale(${n1(K)});transform-origin:0 0">${arts[i].html}</div>`, { style: `overflow:hidden;box-shadow:0 0 0 2px ${t.ink}` })).join('');
    const caps = arts.map((a, i) => at(xs[i], ys[i] + PH + 12, 300, 40, `<span class="lb">${E(a.name)}</span><br><span class="m13">${pad(a.no)}/31, ${timeOf(a.no)}</span>`)).join('');
    const head = hr(48, 48, 1088) + H1('Compositions') + at(48, 124, 520, 44, `<div class="b">${E(sub)}</div>`)
      + word(measure(ctx), 700, 150, '1:3', 120, { style: `color:${t.soft}` });
    return page(ctx, 'compositions', g, head + plates + caps);
  },
};
