// Theme 34, Set Square: pages 24 to 31, in the order they are built (slice 4 built 31 only; 24, 26, 27, 28 and 30 are listed in 05_slice_log.md). 16:9 only (A4 is a later slice).
// Families: TB title block (contact, the title block enlarged to the page).
import { copy } from './showcase.js';
import {
  tones, groundsOf, refOf, at, hr, vr, fill, svgAt, sheet, ghost, isGhost, geo, n1, dim, asArt, mockupsOn, field, voidField, leaf, mix, varsOf, leader,
} from './kit.js';
import { measure, word, PHOTO_NOTE, PHONE_NOTE, ghostRule } from './kit.js';
import { ratio } from '../../engine/color.js';
import { logoFacts } from '../../engine/styleguide.js';
import { guidelines as p1 } from './pages-1.js';
import { guidelines as p3 } from './pages-3.js';
import { photo } from './photos.js';
import { warp, areaOnPage } from './mockups.js';

const slotOn = (ctx) => ctx.edition === 'slot';
export const heavy = (ctx) => `font-family:var(--display);font-weight:${ctx.weights.heading};letter-spacing:-.03em`;
// the wordmark (or a ghosted "Your wordmark") with its top-left at x, y and width w, in colour `c`; returns { h, html }
export function markAt(ctx, M, x, y, w, c, quiet, kind = 'colour') {
  if (slotOn(ctx)) {
    const size = M.fit('Your wordmark', w, 400);
    return { h: M.cap * size * 1.4, html: word(M, x, y + M.cap * size, 'Your wordmark', size, { style: `color:${quiet}` }) };
  }
  const h = w / ctx.logo.geo.aspect;
  return { h, html: at(x, y, w, h, ctx.logo.html(kind, { width: w, colourway: kind, color: c }), { style: `color:${c}` }) };
}
// art drawn at its own size on its own ground, with the tones of that ground
export const artBox = (ctx, w, h, ground, inner) => `<div style="position:absolute;left:0;top:0;width:${w}px;height:${h}px;background:${ground};${varsOf(tones(ctx, ground))};color:var(--ink)">${inner}</div>`;

// the three printed pieces, drawn flat at the size the photograph's areas have (quote 794 x 1106, cards 840 x 549)
export function printArt(ctx) {
  const G = groundsOf(ctx), M = measure(ctx), slot = slotOn(ctx), E = ctx.esc, paper = [G.panel, G.surface, G.raised].reduce((a, b) => (ratio(b, '#000000') > ratio(a, '#000000') ? b : a)), tp = tones(ctx, paper), tb = tones(ctx, G.ink);
  const line = (k, fb) => E(copy(ctx, `page.print.quote.${k}`, fb));
  const col = slot ? tp.quiet : tp.ink;
  const mk = markAt(ctx, M, 64, 64, 250, tp.ink, tp.quiet);
  const quote = artBox(ctx, 794, 1106, paper,
    mk.html
    + at(494, 70, 236, 24, `<span class="m i" style="font-size:18px;line-height:24px;display:block;text-align:right">${slot ? '<span style="color:var(--quiet)">'+E(copy(ctx, 'page.print.ref', 'Reference number'))+'</span>' : line(0, '')}</span>`)
    + at(64, 176, 666, 84, `<div style="${heavy(ctx)};font-size:76px;line-height:84px">${E(copy(ctx, 'page.print.doc', 'Document'))}</div>`)
    + hr(64, 292, 666, tp.ink)
    + at(64, 316, 120, 20, `<span class="lb" style="font-size:15px">${E(copy(ctx, 'page.print.label.0', 'Subject'))}</span>`)
    + at(64, 344, 666, 80, `<div style="font-family:var(--display);font-weight:${ctx.weights.heading};font-size:34px;line-height:40px;letter-spacing:-.01em;color:${col}">${line(1, 'What this document is about')}</div>`)
    + hr(64, 464, 666, tp.hair)
    + at(64, 488, 160, 20, `<span class="lb" style="font-size:15px">${E(copy(ctx, 'page.print.label.1', 'Figure'))}</span>`)
    + at(64, 520, 666, 160, `<div style="${heavy(ctx)};font-size:60px;line-height:64px;white-space:normal;color:${col}">${line(2, 'The one figure that matters.')}</div>`)
    + fill(64, 628, 120, 8, slot ? tp.dim : G.primary)
    + hr(64, 704, 666, tp.hair)
    + at(64, 728, 160, 20, `<span class="lb" style="font-size:15px">${E(copy(ctx, 'page.print.label.2', 'Date'))}</span>`)
    + at(64, 756, 666, 80, `<div style="font-family:var(--display);font-weight:${ctx.weights.heading};font-size:34px;line-height:40px;letter-spacing:-.01em;color:${col}">${line(3, 'Date: day, date, time.')}</div>`)
    + hr(64, 1010, 666, tp.ink)
    + at(64, 1030, 666, 24, `<span class="m" style="font-size:16px;line-height:24px;color:${tp.quiet}">${E(copy(ctx, 'page.hoarding.line', 'Your name and contact line'))}</span>`));
  const mf = markAt(ctx, M, 72, 72, 380, tb.ink, tb.quiet, kindFor(ctx, G.ink));
  const front = artBox(ctx, 840, 549, G.ink, mf.html + fill(72, 410, 120, 10, G.primary)
    + at(72, 450, 760, 36, `<span class="m" style="font-size:30px;line-height:36px;color:${tb.ink}">${E(copy(ctx, 'page.print.url', 'Your web address'))}</span>`));
  const val = (path, fb) => { const v = copy(ctx, path); return isGhost(ctx, v) ? { g: true, s: fb } : { g: false, s: E(v) }; };
  const P = val('applications.card.person', 'Your name'), R = val('applications.card.role', 'Role'), C = val('applications.card.contact', 'Your email');
  const person = P.s, role = R.s, mail = C.s, ink = (o) => (o.g ? tp.quiet : tp.ink);
  
  const back = artBox(ctx, 840, 549, paper,
    at(72, 72, 740, 100, `<div style="${heavy(ctx)};font-size:92px;line-height:100px;color:${ink(P)}">${person}</div>`)
    + at(72, 192, 696, 56, `<div style="font-family:var(--body);font-size:44px;line-height:52px;color:${ink(R)}">${role}</div>`)
    + fill(72, 290, 120, 10, slot ? tp.dim : G.primary)
    + at(72, 440, 760, 48, `<span class="m" style="font-size:38px;line-height:48px;color:${ink(C)}">${mail}</span>`));
  return { quote: { html: quote, w: 794, h: 1106 }, front: { html: front, w: 840, h: 549 }, back: { html: back, w: 840, h: 549 } };
}
// the logo version drawn for a ground: the colourway the brand lists for that ground hex, else full colour
export const kindFor = (ctx, hex) => { const g = logoFacts(ctx).grounds.find((x) => x.groundHex.toLowerCase() === hex.toLowerCase()); return g && ctx.logo.geos[g.key] ? g.key : 'colour'; };

// a story drawn at w x h on its own ground (top 15 percent kept clear of the notch and the app's bar): headline, a bar, the mark at the foot
export function storyArt(ctx, ground, k, w, h) {
  const M = measure(ctx), t = tones(ctx, ground), E = ctx.esc, G = groundsOf(ctx);
  const v = copy(ctx, `applications.social.${k}`), txt = isGhost(ctx, v) ? 'Your line, 3 to 4 words.' : E(v), quiet = isGhost(ctx, v);
  const mk = markAt(ctx, M, w * 0.09, h * 0.84, w * 0.4, t.ink, t.quiet, kindFor(ctx, ground));
  return { w, h, html: artBox(ctx, w, h, ground,
    at(w * 0.09, h * 0.16, w * 0.82, h * 0.4, `<div style="${heavy(ctx)};font-size:${n1(w * 0.145)}px;line-height:1;text-wrap:balance;white-space:normal;color:${quiet ? t.quiet : t.ink}">${txt}</div>`)
    + fill(w * 0.09, h * 0.62, w * 0.22, Math.max(4, w * 0.025), t.dim) + mk.html) };
}

// the home page drawn at w x h (a real viewport): nav, hero photograph with the headline on the plain wall and a Brick button, then the services
export function siteArt(ctx, w, h) {
  const G = groundsOf(ctx), M = measure(ctx), E = ctx.esc, slot = slotOn(ctx), wide = w >= 1000, mid = w >= 700;
  const paper = [G.panel, G.surface, G.raised].reduce((a, b) => (ratio(b, '#000000') > ratio(a, '#000000') ? b : a)), tp = tones(ctx, paper);
  const pad = wide ? 80 : mid ? 56 : 28, navH = wide ? 88 : 72, heroH = wide ? 520 : mid ? 520 : 440, hd = wide ? 76 : mid ? 60 : 44, tt = tones(ctx, slot ? G.ink : G.surface);
  const hv = copy(ctx, 'page.web.hero', 'Your headline'), bv = copy(ctx, 'page.web.body', 'One line about what you offer.');
  const mk = markAt(ctx, M, pad, (navH - (wide ? 40 : 32)) / 2 - 2, wide ? 180 : 140, tp.ink, tp.quiet, kindFor(ctx, paper));
  const nav = wide ? [0, 1, 2].map((i) => at(w - pad - 520 + i * 180, 32, 170, 24, `<span style="font:400 18px/24px var(--body);color:${tp.ink}">${E(copy(ctx, `page.web.nav.${i}`, ['Page one', 'Page two', 'Page three'][i]))}</span>`)).join('')
    : at(w - pad - 28, navH / 2 - 8, 28, 16, `<div style="height:2px;background:${tp.ink};margin-top:2px"></div><div style="height:2px;background:${tp.ink};margin-top:8px"></div>`);
  const hero = slot ? voidField(ctx, 0, 0, w, heroH, G.ink, '') : photo(ctx, 'finished', { w, h: heroH, fx: 0.3, fy: 0.45 });
  const bw = wide ? 280 : 240, bt = tones(ctx, G.primary);
  const text = at(pad, wide ? 72 : 56, wide ? 760 : w - 2 * pad, 300, `<div style="${heavy(ctx)};font-size:${hd}px;line-height:1.02;white-space:normal;text-wrap:balance;color:${tt.ink}">${E(hv)}</div>`
    + `<div style="font:400 ${wide ? 24 : 20}px/1.4 var(--body);color:${tt.ink};margin-top:24px;max-width:${wide ? 600 : 420}px">${E(bv)}</div>`)
    + at(pad, heroH - (wide ? 120 : 96), bw, wide ? 64 : 56, `<div style="height:100%;background:${G.primary};color:${bt.ink};font:700 ${wide ? 22 : 20}px/${wide ? 64 : 56}px var(--body);text-align:center">${E(copy(ctx, 'page.web.button', 'Button'))}</div>`);
  const svc = [0, 1, 2].map((i) => {
    const x = wide ? pad + i * 440 : pad, y = wide ? navH + heroH + 56 : navH + heroH + 40 + i * (mid ? 88 : 80), n = E(copy(ctx, `page.web.nav.${i}`, ['Page one', 'Page two', 'Page three'][i]));
    return hr(x, y, wide ? 400 : w - 2 * pad, tp.ink) + at(x, y + 16, 60, 20, `<span class="m" style="font-size:16px">0${i + 1}</span>`) + at(x + 72, y + 12, 320, 40, `<span style="${heavy(ctx)};font-size:${wide ? 32 : 28}px;line-height:40px;color:${tp.ink}">${n}</span>`);
  }).join('');
  return { w, h, html: artBox(ctx, w, h, paper, mk.html + nav + at(0, navH, w, heroH, hero + text, { style: 'overflow:hidden' }) + svc) };
}

// a leader that ends in a Plaster tag (it has to read over a photograph)
export function tagLeader(ctx, x1, y1, x2, y2, l1, l2, g) {
  const t = tones(ctx, g), w = 176, h = 40;
  return svgAt(0, 0, ctx.size.w, ctx.size.h, `<path d="M${n1(x1)} ${n1(y1)}L${n1(x2)} ${n1(y2)}" stroke="${t.ink}" stroke-width="1" fill="none"/><circle cx="${n1(x1)}" cy="${n1(y1)}" r="3" fill="${t.dim}" stroke="${g}" stroke-width="1.5"/>`)
    + field(ctx, x2 < x1 ? x2 - w : x2, y2 - h / 2, w, h, g, `<span class="lb i" style="position:absolute;left:12px;top:3px">${l1}</span><span class="m" style="position:absolute;left:12px;top:20px">${l2}</span>`, 'box-shadow:0 0 0 1px ' + t.hair);
}

// the rule under a composition: the showcase's own line, or in a slot a ghost line with one mono note
export const ruleOf = (ctx, i) => (slotOn(ctx)
  ? ghostRule(ctx, ['Your rule for the cover.', 'Your rule for type in use.', 'Your rule for print.'][i], 'One sentence, 12 words or fewer. Example: The wordmark sits top left, 896 wide.')
  : ctx.esc(copy(ctx, `page.compositions.${i}`, ['What goes on the cover, and how large.', 'Where the headline hangs, and at what size.', 'What a printed piece carries.'][i])));

// the five plates of page 30 at 960 x 600: [sheet code, name, art]
export function summaryPlates(ctx, PW = 960, PH = 600) {
    const G = groundsOf(ctx), M = measure(ctx), slot = slotOn(ctx);
    const seen = new Set(), cols = ctx.colours.filter((c) => c.role !== 'label').filter((c) => { const h = c.hex.toLowerCase(); if (seen.has(h)) return false; seen.add(h); return true; }).slice(0, 5);
    const paper = [G.panel, G.surface, G.raised].reduce((a, b) => (ratio(b, '#000000') > ratio(a, '#000000') ? b : a)), tp = tones(ctx, paper), ti = tones(ctx, G.ink);
    const mk = markAt(ctx, M, 180, 240, 600, tp.ink, tp.quiet, kindFor(ctx, paper));
    const plates = [
      ['L-01', 'The mark', artBox(ctx, PW, PH, paper, mk.html)],
      ['C-01', 'The palette', artBox(ctx, PW, PH, G.ink, cols.map((c, i) => `<div style="position:absolute;left:${i * 192}px;top:0;width:192px;height:${PH}px;background:${c.hex}"><span class="m" style="position:absolute;left:16px;bottom:20px;font-size:26px;color:${tones(ctx, c.hex).ink}">${c.hex.toUpperCase()}</span></div>`).join(''))],
      ['T-01', 'The type', artBox(ctx, PW, PH, G.ink, at(64, 56, 840, 440, `<div class="d" style="font-size:420px;line-height:1;color:${ti.ink}">Aa</div>`))],
      ['A-01', 'The brand in the field', slot ? voidField(ctx, 0, 0, PW, PH, G.primary, '') : photo(ctx, 'midjob', { w: PW, h: PH, fx: 0.3, fy: 0.5 })],
      ['U-01', 'The finished room', slot ? voidField(ctx, 0, 0, PW, PH, G.accent, '') : photo(ctx, 'finished', { w: PW, h: PH, fx: 0.4, fy: 0.5 })],
    ];
    return plates;
}

export const guidelines = {
  // ---- 24 Compositions (SB): pages 1, 20 and 27 drawn small at 1:3.5 on one datum, each with its width, a scale bar and one rule ----
  compositions(ctx) {
    const G = groundsOf(ctx), g = G.surface, t = tones(ctx, g), E = ctx.esc, K = 1 / 3.5, W = 1280, H = 720, w = Math.round(W * K), h = Math.round(H * K);
    const xs = [64, 64 + w + 27, 64 + 2 * (w + 27)], Y = 216, base = Y + h;
    const arts = [['cover', p1.cover], ['hierarchy', p3.hierarchy], ['print', guidelines.print]];
    const names = [['A-00', 'Cover'], ['T-03', 'In use'], ['U-02', 'Print']];
    const paper = G.panel;
    const plates = arts.map(([id, fn], i) => at(xs[i], Y, w, h, `<div style="width:${W}px;height:${H}px;transform:scale(${K});transform-origin:0 0" data-contrast="demo">${asArt(fn(ctx), `art-${id}`)}</div>`, { style: `background:${paper};overflow:hidden;box-shadow:0 0 0 1px ${t.ink}` })).join('');
    const dims = xs.map((x) => dim(ctx, 'h', x, Y - 22, w, W, { ground: g, ext: 4 })).join('') + dim(ctx, 'v', xs[2] + w + 26, Y, h, H, { ground: g, ext: 4 });
    const datum = at(64, base + 18, 1152, 2, '', { style: `background:${t.ink}` }) + at(1100, base + 24, 116, 16, '<span class="m" style="display:block;text-align:right">FFL 0.00</span>');
    const notes = xs.map((x, i) => hr(x, base + 52, w, 'var(--ink)') + at(x, base + 62, 90, 16, `<span class="m i">${names[i][0]}</span>`) + at(x + 56, base + 62, w - 56, 16, `<span class="lb i">${names[i][1]}</span>`)
      + at(x, base + 92, w - 8, 110, `<div class="b" style="font-size:15px">${ruleOf(ctx, i)}</div>`)).join('');
    // the scale bar: 0 to 1280 px at 1:3.5, in four segments
    const bx = 64, by = 618, seg = w / 4;
    const bar = svgAt(bx, by - 8, w, 20, Array.from({ length: 4 }, (_, i) => `<rect x="${n1(i * seg) + 0.5}" y="0.5" width="${n1(seg) - 1}" height="6" fill="${i % 2 ? 'none' : t.ink}" stroke="${t.ink}" stroke-width="1"/>`).join(''))
      + [0, 640, 1280].map((v, i) => at(i === 0 ? bx : i === 1 ? bx + w / 2 - 30 : bx + w - 60, by + 2, 60, 16, `<span class="m" style="display:block;text-align:${i === 0 ? 'left' : i === 2 ? 'right' : 'center'}">${v}</span>`)).join('')
      + at(bx + w + 27, by - 9, 400, 16, `<span class="m i">1:3.5</span><span class="m" style="margin-left:12px">${E(copy(ctx, 'page.compositions.scale', 'Each sheet is 1280 by 720 px.'))}</span>`);
    const head = at(64, 88, 700, 52, '<h1 class="d h1" style="line-height:48px">Compositions</h1>');
    return sheet(ctx, 'compositions', { ground: g, body: head + plates + dims + datum + notes + bar });
  },

  // ---- 26 Digital (EL): three elevations of the home page on one datum at 40 percent (1440, 768 and 390 wide), each dimensioned, the hero a real photograph ----
  digital(ctx) {
    const G = groundsOf(ctx), g = G.panel, t = tones(ctx, g), K = 0.4, DY = 560;
    const devs = [['Desktop', 1440, 900, 64], ['Tablet', 768, 1024, 688], ['Phone', 390, 844, 1043]];
    const d = (dir, x, y, len, v) => dim(ctx, dir, x, y, len, v, { ground: g, ext: 4 });
    const body = at(64, 88, 480, 52, '<h1 class="d h1" style="line-height:48px">Digital</h1>')
      + devs.map(([n, w, h, x], i) => {
        const dw = Math.round(w * K), dh = Math.round(h * K), a = siteArt(ctx, w, h);
        return at(x, DY - dh, dw, dh, `<div style="width:${w}px;height:${h}px;transform:scale(${K});transform-origin:0 0" data-contrast="demo">${a.html}</div>`, { style: `overflow:hidden;box-shadow:0 0 0 1px ${t.ink}` })
          + d('h', x, DY + 36, dw, w) + d('v', x + dw + 16, DY - dh, dh, h)
          + at(x, DY + 62, dw + 20, 16, `<span class="m i">U-01.${i + 1}</span><span class="lb" style="margin-left:12px">${n}</span>`);
      }).join('')
      + at(64, DY, 1152, 2, '', { style: `background:${t.ink}` }) + at(900, DY + 8, 116, 16, '<span class="m" style="display:block;text-align:right">FFL 0.00</span>');
    return sheet(ctx, 'digital', { ground: g, body });
  },

  // ---- 27 Print (FL): the stationery on the plywood offcut. Showcase: IMG-07 full bleed, the quote and both card faces warped onto it, named by leaders. Otherwise
  // (a real export, or the mockups off): the same pieces flat at 1.8 px to the millimetre on Plaster, dimensioned in mm ----
  print(ctx) {
    const G = groundsOf(ctx), g = G.surface, E = ctx.esc, A = printArt(ctx);
    if (mockupsOn(ctx) && !slotOn(ctx)) {
      const frame = { left: 0, top: 0, w: 1280, h: 648, fx: 0.5, fy: 0.4966, zoom: 1 };
      const sq = areaOnPage(ctx, 'IMG-07', 'sheet', frame).quad, ca = areaOnPage(ctx, 'IMG-07', 'card-a', frame).quad, cb = areaOnPage(ctx, 'IMG-07', 'card-b', frame).quad;
      const body = at(0, 0, 1280, 648, photo(ctx, 'stationery', { w: 1280, h: 648, fx: frame.fx, fy: frame.fy }), { style: 'overflow:hidden' })
        + warp(ctx, 'IMG-07', 'sheet', frame, A.quote) + warp(ctx, 'IMG-07', 'card-a', frame, A.front) + warp(ctx, 'IMG-07', 'card-b', frame, A.back)
        + tagLeader(ctx, ca[0][0], (ca[0][1] + ca[3][1]) / 2, ca[0][0] - 36, (ca[0][1] + ca[3][1]) / 2, E(copy(ctx, 'page.print.tag.card', 'Business card')), '90 x 55 mm', g)
        + tagLeader(ctx, sq[1][0], sq[1][1] + 120, sq[1][0] + 64, sq[1][1] + 120, E(copy(ctx, 'page.print.tag.quote', 'Document')), 'A4, 210 x 297 mm', g);
      return sheet(ctx, 'print', { ground: g, body, grid: false });
    }
    const K = 1.8, aw = Math.round(210 * K), ah = Math.round(297 * K), cw = Math.round(90 * K), ch = Math.round(55 * K), t = tones(ctx, g);
    const ax = 760, ay = 96, cx = 448, cy = 96, cy2 = cy + ch + 16;
    const piece = (a, x, y, w, h) => at(x, y, w, h, `<div style="width:${a.w}px;height:${a.h}px;transform:scale(${w / a.w},${h / a.h});transform-origin:0 0" data-contrast="demo">${a.html}</div>`, { style: `overflow:hidden;box-shadow:0 0 0 1px ${t.ink}` });
    const d = (dir, x, y, len, v) => dim(ctx, dir, x, y, len, v, { ground: g, ext: 4 });
    const body = at(64, 88, 340, 52, '<h1 class="d h1" style="line-height:48px">Print</h1>')
      + at(64, 148, 300, 110, `<div class="b">${E(copy(ctx, 'page.print.note', 'The mark sits at the top left. Each piece carries one line of news and nothing else.'))}</div>`)
      + piece(A.quote, ax, ay, aw, ah) + piece(A.front, cx, cy, cw, ch) + piece(A.back, cx, cy2, cw, ch)
      + d('h', ax, ay - 14, aw, '210 mm') + d('v', ax + aw + 24, ay, ah, '297 mm') + d('h', cx, cy - 14, cw, '90 mm') + d('v', cx + cw + 24, cy, ch, '55 mm') + d('v', cx + cw + 24, cy2, ch, '55 mm')
      + at(cx, cy2 + ch + 24, 220, 60, '<div class="m w">Front and back, 350 gsm uncoated board.</div>')
      + [['U-02.1', 'Card, front', '90 x 55 mm'], ['U-02.2', 'Card, back', '90 x 55 mm'], ['U-02.3', copy(ctx, 'page.print.tag.quote', 'Document'), '210 x 297 mm']].map(([c, n, v], i) => hr(64, 424 + i * 40, 320) + at(64, 436 + i * 40, 70, 16, `<span class="m i">${c}</span>`) + at(140, 436 + i * 40, 150, 16, `<span class="lb i">${n}</span>`) + at(290, 436 + i * 40, 94, 16, `<span class="m" style="display:block;text-align:right">${v}</span>`)).join('') + hr(64, 544, 320);
    return sheet(ctx, 'print', { ground: g, body });
  },

  // ---- 28 Social (PH): a story on a phone in a hand. Showcase: IMG-06 with the story warped into the glass, two more stories flat beside it, 1080 x 1920 dimensioned.
  // Otherwise (a real export, or the mockups off): a Brick field with a flat story on it ----
  social(ctx) {
    const G = groundsOf(ctx), g = G.ink, t = tones(ctx, g), E = ctx.esc, FW = 240, FH = 427, xs = [704, 976], Y = 160, on = mockupsOn(ctx) && !slotOn(ctx);
    const frame = { left: 0, top: 0, w: 640, h: 648, fx: 0.5, fy: 0.4653, zoom: 1 };
    const place = (a, x, y, w, h) => at(x, y, w, h, `<div style="width:${a.w}px;height:${a.h}px;transform:scale(${w / a.w},${h / a.h});transform-origin:0 0" data-contrast="demo">${a.html}</div>`, { style: 'overflow:hidden' });
    let scene;
    if (on) {
      scene = at(0, 0, 640, 648, photo(ctx, 'phone', { w: 640, h: 648, fx: frame.fx, fy: frame.fy }), { style: 'overflow:hidden' })
        + warp(ctx, 'IMG-06', 'screen', frame, storyArt(ctx, G.primary, 0, 390, 844), { glass: true })
        + field(ctx, 64, 0, 372, 28, g, '<span class="m i" style="position:absolute;left:12px;top:6px">U-03.1  Story on a phone, 390 x 844 px</span>');
    } else {
      scene = voidField(ctx, 0, 0, 640, 648, G.primary, PHONE_NOTE) + place(storyArt(ctx, G.surface, 0, 540, 960), 185, 72, 270, 480);
    }
    const flats = [[G.accent, 1], [G.surface, 2]].map(([c, k], i) => place(storyArt(ctx, c, k, 540, 960), xs[i], Y, FW, FH)).join('');
    const d = (dir, x, y, len, v) => dim(ctx, dir, x, y, len, v, { ground: g, ext: 4 });
    const dims = xs.map((x) => d('h', x, Y - 16, FW, '1080')).join('') + d('v', xs[0] - 24, Y, FH, '1920') + d('v', xs[1] + FW + 24, Y, FH, '1920');
    const caps = xs.map((x, i) => hr(x, Y + FH + 14, FW, 'var(--ink)') + at(x, Y + FH + 22, FW, 16, `<span class="m i">U-03.${i + 2}</span><span class="lb" style="margin-left:12px">Story, 1080 x 1920 px</span>`)).join('');
    const head = at(704, 72, 400, 52, '<h1 class="d h1" style="line-height:48px">Social</h1>');
    return sheet(ctx, 'social', { ground: g, body: head + flats + dims + caps + scene });
  },

  // ---- 30 On one page (AX): the mark, palette, type and two photographs exploded on a stair at 30 degrees, each plate set on the floor plane and dropped to the datum ----
  summary(ctx) {
    const G = groundsOf(ctx), g = G.surface, t = tones(ctx, g), M = measure(ctx), E = ctx.esc, slot = slotOn(ctx), S = 0.21, PW = 960, PH = 600, STEP = 216, RISE = 78, F0 = 440, E0 = 64 + 0.866 * S * PH, DATUM = 620;
    const plates = summaryPlates(ctx, PW, PH);
    const pt = (i, u, v) => [E0 + i * STEP + 0.866 * S * (u - v), F0 - i * RISE + 0.5 * S * (u + v)];
    const body = plates.map(([code, name, art], i) => {
      const a = [pt(i, 0, 0), pt(i, PW, 0), pt(i, PW, PH), pt(i, 0, PH)], P = (q) => q.map((p) => `${n1(p[0])},${n1(p[1])}`).join(' '), b = pt(i, PW, PH);
      const slab = svgAt(0, 0, 1280, 720, `<polygon points="${P(a.map((p) => [p[0], p[1] + 7]))}" fill="${t.ink}"/><path d="M${n1(b[0])} ${n1(b[1] + 7)}V${DATUM}" stroke="${t.dim}" stroke-width="1" stroke-dasharray="4 4" fill="none"/><circle cx="${n1(b[0])}" cy="${DATUM}" r="2.5" fill="${t.dim}"/>`);
      const face = at(0, 0, PW, PH, `<div data-contrast="demo" style="position:absolute;left:0;top:0;width:${PW}px;height:${PH}px">${art}</div>`, { style: `transform:matrix(${0.866 * S},${0.5 * S},${-0.866 * S},${0.5 * S},${n1(pt(i, 0, 0)[0])},${n1(pt(i, 0, 0)[1])});transform-origin:0 0;overflow:hidden;box-shadow:0 0 0 ${1 / S}px ${t.ink}` });
      return slab + face + at(b[0] - 100, DATUM + 8, 200, 34, `<div class="m i" style="text-align:center">${code}</div><div class="lb" style="text-align:center">${E(name)}</div>`);
    }).join('');
    const head = at(64, 88, 560, 52, '<h1 class="d h1" style="line-height:48px">On one page</h1>')
      + at(64, 152, 300, 80, `<div class="b">${E(copy(ctx, 'page.summary.note', 'Mark, palette, type and two photographs, drawn on one page.'))}</div>`);
    return sheet(ctx, 'summary', { ground: g, body: head + body + hr(64, DATUM, 1152, 'var(--ink)') + at(1100, DATUM - 22, 116, 16, '<span class="m" style="display:block;text-align:right">FFL 0.00</span>') });
  },

  // ---- 31 Contact (TB): the title block enlarged to the page, cells in Plaster at 30 percent, the email in the big cell ----
  contact(ctx) {
    const G = groundsOf(ctx), g = G.ink, t = tones(ctx, g), E = ctx.esc, B = ctx.brand, K = geo(ctx), R = refOf(ctx, 'contact');
    const X0 = 64, X1 = 1216, Y0 = 312, Y1 = 640, rowY = [Y0, Y0 + 96, Y0 + 192], line = t.hair;
    const rev = String(ctx.versionLine || 'Version 1.0, November 2026').replace(/^Version/, 'Rev');
    const email = isGhost(ctx, copy(ctx, 'contact.email')) ? ghostRule(ctx, 'Your contact email', 'Who to ask before changing the mark.') : ghost(ctx, copy(ctx, 'contact.email'), 'contact.email', 'Your contact email', { what: false });
    const head = at(64, 96, 760, 120, `<h1 class="d h1" style="white-space:normal">${E(copy(ctx, 'page.contact.headline', 'Questions about the brand? Ask before you change it.'))}</h1>`);
    const cell = (x, y, w, label, val, mono = true) => at(x + 16, y + 14, w - 32, 70, `<div class="lb">${label}</div><div class="${mono ? 'm i' : 'b'}" style="margin-top:6px;font-size:15px;line-height:22px">${val}</div>`);
    const cols = [[X0, 448], [448, 736], [736, 928], [928, 1216]];
    const rows1 = [['Project', `${E(ctx.real ? ctx.real(B.name) : B.name)} brand guidelines`], ['Sheet', E(R.title)], ['Sheet no.', R.sheet], ['Scale', '1:1']];
    const top = cols.map(([a, b], i) => cell(a, rowY[0], b - a, rows1[i][0], rows1[i][1])).join('');
    const mid = cell(X0, rowY[1], 640, 'Issue', E(rev)) + cell(704, rowY[1], 512, 'Status', 'Issued for use');
    const big = at(X0 + 16, rowY[2] + 6, 1120, 84, `<div class="lb">Questions about the mark</div><div class="d" style="font-size:40px;line-height:48px;white-space:normal;letter-spacing:-.02em;margin-top:0">${email}</div>`);
    const frame = svgAt(0, 0, K.W, K.H, `<g stroke="${line}" stroke-width="1" fill="none"><rect x="${X0 + 0.5}" y="${Y0 + 0.5}" width="${X1 - X0}" height="288"/><path d="M${X0} ${Y0 + 96.5}H${X1}M${X0} ${Y0 + 192.5}H${X1}M448.5 ${Y0}V${Y0 + 96}M736.5 ${Y0}V${Y0 + 96}M928.5 ${Y0}V${Y0 + 96}M704.5 ${Y0 + 96}V${Y0 + 192}"/></g>`);
    return sheet(ctx, 'contact', { ground: g, body: head + frame + top + mid + big });
  },
};
