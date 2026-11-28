// Theme 36, Doorlist: pages 25 to 31 (In use: digital, print, social; Close: on one page, contact; the openers are in pages-1.js). 16:9 only.
// Families: QD queue at the door (digital), AT actual ticket (print), SG story and grid (social), OL one list (summary), LC last call (contact).
// Encore's words come from showcase.js through copy(); a fallback here is neutral. A slot is set at its real size as ghost type with one mono note; a photo slot is a colour field
// with the mark's disc ghosted at 120 percent of its height, cut by the right edge, and the engine's one photograph note. Mockups (the phone, the wristband, the marquee) show in the
// showcase only (meta.mockups); every mockup page has its own flat layout for when they are off.
import { groundsOf, tones, mix, at, hr, vr, fill, svgAt, field, measure, word, baseTop, ghost, ghostRule, isGhost, hl, PHOTO_NOTE, nameOf as cust, page, n1, pad, varsOf } from './kit.js';
import { copy } from './showcase.js';
import { photo } from './photos.js';
import { warp, warpStrip, flat } from './mockups.js';

const slotOn = (ctx) => ctx.edition === 'slot';
const mockupsOn = (ctx) => !!(ctx.theme && ctx.theme.mockups === true) && !slotOn(ctx);
const nt = (ctx, s) => `<span class="nt">${ctx.esc(s)}</span>`;
const gl = (ctx, line) => ghostRule(ctx, line, '');
const H1 = (txt, x = 48, y = 48, w = 640, size = 0) => at(x, y, w, 48, `<h1 class="h1"${size ? ` style="font-size:${size}px"` : ''}>${txt}</h1>`);
const lab = (ctx, x, y, w, s, q = false) => at(x, y, w, 16, `<span class="lb${q ? ' q' : ''}">${ctx.esc(s)}</span>`);
const mono = (ctx, x, y, w, s, q = false) => at(x, y, w, 18, `<span class="m13${q ? ' q' : ''}">${ctx.esc(s)}</span>`);
// the headline slot of type.sample.headline, or the showcase line
const headline = (ctx, key, fb, ghostText) => { const v = copy(ctx, 'type.sample.headline'); return !slotOn(ctx) ? ctx.esc(copy(ctx, key, fb)) : isGhost(ctx, v) ? gl(ctx, ghostText) : ctx.esc(v); };
const HEAD_NOTE = 'Your headline, 5 to 8 words. Example: Fresh bread, warm by six.';

// the mark, drawn (showcase) or the engine's frame (slot)
const symbol = (ctx, w, color) => (slotOn(ctx) ? ctx.logo.html('symbol', { width: w, color }) : ctx.logo.svg('symbol', { width: w, colourway: ctx.logo.colourwayOf('symbol') }));

// A photo slot: a field of colour, cropped the way the photograph would be, the disc ghosted at 120 percent of the slot's height and cut by its right edge, one mono note.
function slotPic(ctx, x, y, w, h, ground, note = PHOTO_NOTE, ny = h - 56) {
  const t = tones(ctx, ground), r = h * 0.6;
  const disc = svgAt(0, 0, w, h, `<circle cx="${n1(w)}" cy="${n1(h / 2)}" r="${n1(r)}" fill="${mix(ground, t.ink, 0.04)}"/>`);
  return field(ctx, x, y, w, h, ground, disc + (note ? at(24, ny, w - 48, 40, nt(ctx, note)) : ''));
}
// a pseudo QR block (modules in ink on the paper): finder squares at three corners, the rest from a fixed seed. Decorative: it carries no data.
function qr(size, ink, paper) {
  const N = 25, m = size / N; let s = 7, out = `<rect width="${size}" height="${size}" fill="${paper}"/>`;
  const rnd = () => { s = (s * 1103515245 + 12345) & 0x7fffffff; return s / 0x7fffffff; };
  const inFinder = (i, j) => (i < 8 && j < 8) || (i > N - 9 && j < 8) || (i < 8 && j > N - 9);
  for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) if (!inFinder(i, j) && rnd() < 0.5) out += `<rect x="${n1(i * m)}" y="${n1(j * m)}" width="${n1(m + 0.4)}" height="${n1(m + 0.4)}" fill="${ink}"/>`;
  for (const [fx, fy] of [[0, 0], [N - 7, 0], [0, N - 7]]) {
    out += `<rect x="${fx * m}" y="${fy * m}" width="${7 * m}" height="${7 * m}" fill="${ink}"/><rect x="${(fx + 1) * m}" y="${(fy + 1) * m}" width="${5 * m}" height="${5 * m}" fill="${paper}"/><rect x="${(fx + 2) * m}" y="${(fy + 2) * m}" width="${3 * m}" height="${3 * m}" fill="${ink}"/>`;
  }
  return `<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" style="display:block" aria-hidden="true">${out}</svg>`;
}
// bars for a ticket stub, from a fixed seed
function bars(w, h, ink) {
  let s = 11, x = 0, out = '';
  const rnd = () => { s = (s * 1103515245 + 12345) & 0x7fffffff; return s / 0x7fffffff; };
  while (x < w - 2) { const bw = 1 + Math.floor(rnd() * 3); if (rnd() < 0.62) out += `<rect x="${x}" y="0" width="${bw}" height="${h}" fill="${ink}"/>`; x += bw + 1 + Math.floor(rnd() * 2); }
  return `<svg width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" style="display:block" aria-hidden="true">${out}</svg>`;
}
const demo = (html, w, h, bg, t, extra = '') => `<div data-contrast="demo" style="position:absolute;left:0;top:0;width:${w}px;height:${h}px;background:${bg};${varsOf(t)};color:${t.ink};overflow:hidden;${extra}">${html}</div>`;

// ---- 26: the web hero (1440 x 900) and the phone pass (390 x 844), drawn at their own sizes and scaled by the page ----
function webArt(ctx, G, M) {
  const slot = slotOn(ctx), g = G.night, t = tones(ctx, g), E = ctx.esc, W = 1440, Hh = 900, tr = tones(ctx, G.red);
  const head = headline(ctx, 'page.digital.head', '', 'Your headline, up to 8 words.');
  const sub = slot ? gl(ctx, 'Your line, one sentence.') : E(copy(ctx, 'page.digital.sub', ''));
  const btn = slot ? gl(ctx, 'Your action') : E(copy(ctx, 'page.digital.button', ''));
  const nm = cust(ctx) || 'Your name';
  let h = fill(0, 0, W, 56, G.stage) + [0, 1, 2].map((i) => `<div class="a" style="left:${24 + i * 28}px;top:20px;width:16px;height:16px;border-radius:50%;background:${mix(G.stage, G.stock, 0.3)}"></div>`).join('')
    + fill(360, 12, 720, 32, mix(G.stage, G.stock, 0.1))
    + svgAt(0, 56, W, 844, `<circle cx="1330" cy="560" r="330" fill="${slot ? mix(g, t.ink, 0.1) : G.red}"/>`)
    + word(M, 72, 150, E(nm), Math.min(52, M.fit(nm, 500, 52)))
    + ['Home', 'About', 'Contact'].map((s, i) => at(940 + i * 140, 120, 120, 28, `<span style="font:600 22px/28px var(--body);color:var(--ink)">${s}</span>`)).join('')
    + hr(72, 182, 1296, t.hair, 2)
    + at(72, 220, 900, 320, head, { cls: 'big', style: 'font-size:84px;line-height:.95;text-wrap:balance' })
    + at(72, 570, 760, 80, sub, { style: `font:400 34px/44px var(--body);color:var(--quiet)` })
    + at(72, 700, 440, 100, btn, { style: `background:${G.red};color:${tr.ink};--quiet:${tr.ink};--soft:${tr.ink};--ink:${tr.ink};font:600 34px/100px var(--body);padding:0 36px;white-space:nowrap` });
  return demo(h, W, Hh, g, t);
}
function phoneArt(ctx, G, M) {
  const g = G.night, t = tones(ctx, g), E = ctx.esc, c = (k) => E(copy(ctx, `page.digital.pass.${k}`, ''));
  const h = lab(ctx, 24, 72, 200, cust(ctx)) + at(166, 70, 200, 18, `<span class="m13" style="display:block;text-align:right">${E(copy(ctx, 'page.print.ticket.no', ''))}</span>`) + hr(24, 104, 342, t.hair, 2)
    + at(24, 124, 342, 160, c('title'), { cls: 'big', style: 'font-size:64px;line-height:.95' })
    + lab(ctx, 24, 316, 342, copy(ctx, 'page.digital.pass.label', ''), true)
    + at(24, 340, 342, 40, hl(ctx, c('name'), 'font:600 28px/40px var(--body);display:inline-block'), { style: 'padding-left:6px' })
    + at(24, 406, 342, 28, `<span style="font:600 22px/28px var(--body)">${c('date')}</span>`) + at(24, 438, 342, 24, `<span style="font:400 18px/24px var(--body);color:var(--quiet)">${c('admit')}</span>`)
    + at(82, 500, 226, 226, qr(202, G.night, G.stock), { style: `background:${G.stock};padding:12px` })
    + at(24, 756, 342, 16, `<span class="lb q" style="display:block;text-align:center">Show this at the door</span>`);
  return demo(h, 390, 844, g, t);
}

// ---- 27: the wristband (1200 x 250, a red band with the details) and the ticket at actual size ----
function bandArt(ctx, G, M) {
  const g = G.red, t = tones(ctx, g), E = ctx.esc, c = (k) => E(copy(ctx, `page.print.band.${k}`, ''));
  const nm = cust(ctx) || 'Your name';
  const h = word(M, 56, 170, E(nm), Math.min(150, M.fit(nm, 520, 150)))
    + vr(640, 36, 178, t.ink, 3)
    + at(680, 40, 480, 36, `<span class="lb" style="font-size:26px;line-height:36px">${c('date')}</span>`)
    + at(680, 92, 500, 44, `<span style="font:600 34px/44px var(--body)">${c('place')}</span>`)
    + at(680, 148, 500, 36, `<span style="font:400 28px/36px var(--body)">${c('kind')}</span>`)
    + at(680, 196, 500, 32, `<span class="m" style="font-size:24px;line-height:32px">${E(copy(ctx, 'page.print.ticket.no', ''))}</span>`);
  return demo(h, 1200, 250, g, t);
}
function ticket(ctx, G, M, x, y) {
  const slot = slotOn(ctx), E = ctx.esc, W = 454, Hh = 189, SW = 104, tn = tones(ctx, G.night), tr = tones(ctx, G.red), c = (k) => E(copy(ctx, `page.print.ticket.${k}`, ''));
  const nm = cust(ctx) || 'Your name';
  const body = slot
    ? lab(ctx, 16, 14, 300, 'Admit one') + at(16, 38, 316, 44, `<div class="d" style="font-size:${n1(Math.min(40, M.fit(nm, 316, 40)))}px;line-height:44px">${E(nm)}</div>`)
      + at(16, 92, 316, 56, `<div class="b" style="font-size:14px;line-height:18px">${gl(ctx, 'Your event, date and place')}</div>`) + at(16, 154, 316, 22, nt(ctx, 'Your event, the date and the place. One line each.'))
    : lab(ctx, 16, 14, 300, `Admit one. ${copy(ctx, 'page.print.ticket.kind', '')}`)
      + word(M, 16, 80, E(nm), Math.min(48, M.fit(nm, 316, 48)))
      + at(16, 96, 316, 20, `<span style="font:600 14px/20px var(--body)">${c('date')}</span>`)
      + at(16, 118, 316, 18, `<span style="font:400 13px/18px var(--body);color:var(--quiet)">${c('place')}</span>`)
      + at(16, 146, 120, 22, hl(ctx, c('doors'), 'font:600 13px/22px var(--body);display:inline-block'), { style: `padding-left:6px;${varsOf(tr)}` })
      + at(190, 148, 140, 18, `<span class="m13" style="display:block;text-align:right">${c('no')}</span>`);
  // "Admit" is the wider word: fit it to the stub's inner width (76) so it never runs past the stub's right edge
  const az = n1(Math.min(20, M.fit('Admit', SW - 28, 20)));
  const stub = at(W - SW, 0, SW, Hh, at(14, 18, SW - 28, 40, `<span class="d" style="font-size:${az}px;line-height:22px;display:block">Admit</span><span class="d" style="font-size:${az}px;line-height:22px;display:block">one</span>`)
    + at(14, 100, SW - 28, 60, bars(SW - 28, 60, tr.ink)) + at(14, 164, SW - 28, 16, `<span class="m" style="font-size:10px;line-height:16px">${slot ? '' : c('no')}</span>`), { style: `background:${G.red};${varsOf(tr)}` });
  const perf = `<div class="a" style="left:${W - SW - 1}px;top:0;width:2px;height:${Hh}px;background:repeating-linear-gradient(to bottom,${G.stock} 0 6px,transparent 6px 12px)"></div>`;
  const notch = [0, Hh].map((yy) => `<div class="a" style="left:${W - SW - 9}px;top:${yy - 9}px;width:18px;height:18px;border-radius:50%;background:${G.stock}"></div>`).join('');
  return at(x, y, W, Hh, body + stub + perf + notch, { style: `background:${G.night};${varsOf(tn)};color:${tn.ink};overflow:hidden` });
}

// ---- 31: the marquee face (1500 x 300, lit from behind: ink on the stock) ----
function marqueeArt(ctx, G, M) {
  const g = G.stock, t = tones(ctx, g), E = ctx.esc, tr = tones(ctx, G.red), line = copy(ctx, 'page.contact.marquee', ''), sub = copy(ctx, 'page.contact.marquee.sub', '');
  const size = Math.min(150, M.fit(line, 1060, 150));
  const longest = String(sub).split(/\s+/).reduce((a, w) => (M.fit(w, 216, 64) < M.fit(a, 216, 64) ? w : a), '');
  const ss = Math.min(64, longest ? M.fit(longest, 216, 64) : 64);
  const h = word(M, 64, 150 + M.cap * size / 2, E(line), size)
    + fill(1220, 0, 280, 300, G.red) + at(1220, 0, 280, 300, `<span class="d" style="font-size:${ss}px;line-height:${ss}px;color:${tr.ink};display:block;padding:92px 0 0 36px;white-space:normal">${E(sub)}</span>`)
    + hr(64, 262, 1060, t.ink, 6);
  return demo(h, 1500, 300, g, t);
}

export const guidelines = {
  // ---- 26 Digital (QD, queue at the door): the phone held up at the door on the left, the web hero flat on the right ----
  digital(ctx) {
    const G = groundsOf(ctx), g = G.night, M = measure(ctx), E = ctx.esc, slot = slotOn(ctx), t = tones(ctx, g);
    let left;
    if (slot) left = slotPic(ctx, 0, 0, 560, 672, G.red);
    else if (mockupsOn(ctx)) {
      const frame = { left: 0, top: 0, w: 560, h: 672, fx: 0.7, fy: 0.585, zoom: 2.3 };
      left = at(0, 0, 560, 672, photo(ctx, 'IMG-06', { w: 560, h: 672, fx: frame.fx, fy: frame.fy, zoom: frame.zoom }), { style: 'overflow:hidden' })
        + warp(ctx, 'IMG-06', 'screen', frame, { html: phoneArt(ctx, G, M), w: 390, h: 844 }, { glass: true });
    } else {
      const k = 0.7, pw = 390 * k, ph = 844 * k, px = (560 - pw) / 2, py = (672 - ph) / 2;
      left = field(ctx, 0, 0, 560, 672, G.stage, at(px - 8, py - 8, pw + 16, ph + 16, '', { style: `background:${G.night};border-radius:40px` })
        + at(px, py, pw, ph, `<div style="width:390px;height:844px;transform:scale(${k});transform-origin:0 0">${phoneArt(ctx, G, M)}</div>`, { style: 'overflow:hidden;border-radius:32px' })
        + at(px + pw / 2 - 40, py + 10, 80, 22, '', { style: `background:${G.night};border-radius:11px` }));
    }
    const hero = flat({ html: webArt(ctx, G, M), w: 1440, h: 900 }, 598, 96, 634);
    const cells = [['Web hero', '1440 x 900'], ['Phone', '390 x 844'], ['Button', 'Door red, ink label']];
    let out = left + H1('Digital', 598, 36, 634, 32) + hero.html + hr(598, 506, 634, 'var(--ink)');
    cells.forEach(([l, v], i) => { out += lab(ctx, 598 + i * 220, 520, 200, l, true) + mono(ctx, 598 + i * 220, 540, 200, v); });
    out += at(598, 584, 634, 48, slot ? nt(ctx, HEAD_NOTE) : `<div class="b" style="color:var(--ink)">${E(copy(ctx, 'page.digital.text', 'The hero says one thing, with one button in the action colour.'))}</div>`);
    return page(ctx, 'digital', g, out);
  },

  // ---- 27 Print (AT, actual ticket): the wristband on the left, the ticket at 120 x 50 mm (454 x 189 px) on the right ----
  print(ctx) {
    const G = groundsOf(ctx), g = G.stock, t = tones(ctx, g), M = measure(ctx), E = ctx.esc, slot = slotOn(ctx);
    let left;
    if (slot) left = slotPic(ctx, 0, 0, 640, 672, G.night);
    else if (mockupsOn(ctx)) {
      const frame = { left: 0, top: 0, w: 640, h: 672, fx: 0.585, fy: 0.64, zoom: 2.4 };
      left = at(0, 0, 640, 672, photo(ctx, 'IMG-03', { w: 640, h: 672, fx: frame.fx, fy: frame.fy, zoom: frame.zoom }), { style: 'overflow:hidden' })
        + warpStrip(ctx, 'IMG-03', 'band', frame, { html: bandArt(ctx, G, M), w: 1200, h: 250 });
    } else {
      const bw = 544, bh = bw * 250 / 1200;
      left = field(ctx, 0, 0, 640, 672, G.night, at(48, (672 - bh) / 2, bw, bh, `<div style="width:1200px;height:250px;transform:scale(${(bw / 1200).toFixed(5)});transform-origin:0 0">${bandArt(ctx, G, M)}</div>`, { style: 'overflow:hidden' })
        + at(48, (672 + bh) / 2 + 16, bw, 18, '<span class="m13 q">Wristband, 25 mm deep, laid flat</span>'));
    }
    const rows = [['Ticket', '120 x 50 mm, shown at actual size'], ['Wristband', '25 mm deep, the mark at 10 mm'], ['Ink and paper', `${G.night.toUpperCase()} on ${G.stock.toUpperCase()}`]];
    let out = left + H1('Print', 712, 36, 520, 32) + lab(ctx, 712, 104, 300, 'Ticket, actual size', true) + ticket(ctx, G, M, 712, 144)
      + mono(ctx, 712, 346, 454, '454 x 189 px at 96 dpi', true);
    rows.forEach(([l, v], i) => { out += hr(712, 392 + i * 48, 520, i ? 'var(--hair)' : 'var(--ink)') + lab(ctx, 712, 408 + i * 48, 140, l, true) + mono(ctx, 860, 406 + i * 48, 372, v); });
    out += at(712, 548, 520, 80, `<div class="b">${E(copy(ctx, 'page.print.text', 'Set the date large and keep the rest small. Light one line.'))}</div>`);
    return page(ctx, 'print', g, out);
  },

  // ---- 28 Social (SG, story and grid): one story at 9:16, six posts in a 3 x 2 grid ----
  social(ctx) {
    const G = groundsOf(ctx), g = G.stage, t = tones(ctx, g), M = measure(ctx), E = ctx.esc, slot = slotOn(ctx), tn = tones(ctx, G.night), tr = tones(ctx, G.red), ts = tones(ctx, G.stock);
    const lineG = 'Your line, 2 to 4 words.', nm = cust(ctx) || 'Your name';
    const bigAt = (x, y, w, h, html, size, tt, extra = '') => at(x, y, w, h, html, { cls: 'big', style: `font-size:${size}px;line-height:.94;text-wrap:balance;color:${tt.ink};${extra}` });
    // the story
    const sx = 48, sy = 48, sw = 324, sh = 576;
    const storyText = slot ? gl(ctx, lineG) : `${E(copy(ctx, 'page.social.story', '').split(' ').slice(0, 1).join(' '))}<br>${hl(ctx, E(copy(ctx, 'page.social.story', '').split(' ').slice(1).join(' ')))}`;
    let story;
    if (slot) story = field(ctx, sx, sy, sw, sh, G.night, svgAt(0, 0, sw, sh, `<circle cx="${sw}" cy="${sh / 2}" r="${n1(sh * 0.6)}" fill="${mix(G.night, tn.ink, 0.04)}"/>`) + lab(ctx, 24, 24, 200, nm) + bigAt(24, 392, 276, 150, storyText, 60, tn));
    else story = at(sx, sy, sw, sh, `<div data-contrast="demo">${photo(ctx, 'IMG-04', { w: sw, h: sh })}</div>` + at(24, 24, 200, 16, `<span class="lb" style="color:${G.stock}">${E(nm)}</span>`) + bigAt(24, 404, 276, 140, storyText, 52, { ink: G.stock }), { style: 'overflow:hidden' });
    // the posts
    const P = 192, gx = 624, gy = 112, G2 = 16;
    const post = (i, kind, a) => {
      const x = gx + (i % 3) * (P + G2), y = gy + Math.floor(i / 3) * (P + G2);
      if (kind === 'photo') return slot ? field(ctx, x, y, P, P, a.ground, svgAt(0, 0, P, P, `<circle cx="${P}" cy="${P / 2}" r="${P * 0.6}" fill="${mix(a.ground, tones(ctx, a.ground).ink, 0.04)}"/>`))
        : at(x, y, P, P, `<div data-contrast="demo">${photo(ctx, a.id, { w: P, h: P, fx: a.fx, fy: a.fy, zoom: a.zoom || 1 })}</div>`, { style: 'overflow:hidden' });
      const tt = tones(ctx, a.ground), txt = slot ? gl(ctx, lineG) : E(copy(ctx, `page.social.post.${a.k}`, ''));
      return field(ctx, x, y, P, P, a.ground, lab(ctx, 16, 16, 160, nm) + bigAt(16, 52, P - 32, P - 68, txt, a.size, tt, 'display:flex;align-items:flex-end'));
    };
    const posts = [
      post(0, 'photo', { id: 'IMG-02', fx: 0.5, fy: 0.45, ground: G.night }), post(1, 'photo', { id: 'IMG-08', fx: 0.62, fy: 0.7, zoom: 1.5, ground: G.red }), post(2, 'text', { k: 0, ground: G.red, size: 24 }),
      post(3, 'text', { k: 1, ground: G.night, size: 40 }), post(4, 'photo', { id: 'IMG-01', fx: 0.55, fy: 0.62, ground: G.night }), post(5, 'text', { k: 2, ground: G.stock, size: 26 }),
    ].join('');
    const spec = [['Story', '9:16, 1080 x 1920'], ['Post', '1:1, 1080 x 1080'], ['Line', '2 to 4 words']];
    let out = story + posts + H1('Social', 624, 36, 608, 32);
    spec.forEach(([l, v], i) => { out += hr(408, 112 + i * 64, 184, i ? 'var(--hair)' : 'var(--ink)') + lab(ctx, 408, 128 + i * 64, 184, l, true) + mono(ctx, 408, 148 + i * 64, 184, v); });
    out += at(408, 324, 184, 140, `<div class="b" style="font-size:15px;line-height:22px">${E(copy(ctx, 'page.social.text', 'Set one short line big. Light one post in six.'))}</div>`);
    out += slot ? at(624, 540, 608, 40, nt(ctx, PHOTO_NOTE)) : '';
    return page(ctx, 'social', g, out);
  },

  // ---- 30 On one page (OL, one list): the brand as six list rows, each marked in at its name ----
  summary(ctx) {
    const G = groundsOf(ctx), g = G.stock, t = tones(ctx, g), M = measure(ctx), E = ctx.esc, slot = slotOn(ctx);
    const rule = (i, fb) => E(copy(ctx, `page.summary.rule.${i}`, fb));
    const line = slot ? ghost(ctx, copy(ctx, 'lines.primary'), 'lines.primary', 'Your line, one sentence.', { what: false, example: false }) : E(copy(ctx, 'page.summary.line', ''));
    const voiceLines = slot ? gl(ctx, 'A line for a poster') : [0, 1, 2].map((i) => E(copy(ctx, `page.voice.${i}`, ''))).join('<br>');
    const chips = [G.red, G.night, G.stage, G.stock].map((c, i) => fill(i * 60, 0, 52, 72, c, `box-shadow:inset 0 0 0 1px ${t.hair}`)).join('');
    const rows = [
      { name: 'Mark', spec: at(0, 0, 72, 72, symbol(ctx, 72, t.ink)), fb: 'Used as drawn, on its own ground.' },
      { name: 'Colour', spec: `<div class="a" style="left:0;top:0;width:240px;height:72px">${chips}</div>`, fb: 'The palette, in its shares.' },
      { name: 'Type', spec: word(M, 0, 62, 'Aa', 72), fb: 'The faces, at the scale.' },
      { name: 'Photo', spec: slot ? slotPic(ctx, 0, 0, 240, 72, G.night, '') : photo(ctx, 'IMG-01', { w: 240, h: 72, fx: 0.5, fy: 0.55 }), fb: 'Your photograph, as briefed.', note: slot },
      { name: 'Line', spec: at(0, 4, 300, 64, `<div class="h2" style="line-height:26px">${line}</div>`), fb: 'The line that sums it up.' },
      { name: 'Voice', spec: at(0, 0, 300, 72, `<div class="${slot ? 'b' : 'big'}" style="font-size:20px;line-height:24px">${voiceLines}</div>`), fb: 'The words, in your voice.' },
    ];
    let out = hr(0, 48, 1280, 'var(--ink)', 2);
    rows.forEach((r, i) => {
      const y = 48 + i * 96;
      out += (i ? hr(0, y, 1280, 'var(--hair)') : '') + at(48, y + 38, 48, 20, `<span class="mono13 q">${pad(i + 1)}</span>`)
        + at(110, y + 30, 220, 36, `<div class="h2" style="line-height:36px">${hl(ctx, E(r.name))}</div>`)
        + at(348, y + 12, 320, 72, r.spec)
        + at(698, y + (r.note ? 10 : 36), 534, 24, `<div class="b">${rule(i, r.fb)}</div>`) + (r.note ? at(698, y + 38, 534, 52, nt(ctx, PHOTO_NOTE)) : '');
    });
    return page(ctx, 'summary', g, out);
  },

  // ---- 31 Contact (LC, last call): "Last call." big on the left, the contact rows under it, the marquee over the door on the right ----
  contact(ctx) {
    const G = groundsOf(ctx), g = G.night, t = tones(ctx, g), M = measure(ctx), E = ctx.esc, slot = slotOn(ctx);
    const big = [copy(ctx, 'page.contact.big.0', 'Last'), copy(ctx, 'page.contact.big.1', 'call.')];
    const size = Math.min(176, M.fit(big.reduce((a, b) => (b.length > a.length ? b : a), ''), 620, 176)), b1 = 56 + M.cap * size, b2 = b1 + size * 0.95;
    const email = slot ? gl(ctx, 'Your contact email.') : E(copy(ctx, 'page.contact.email', ''));
    const ver = E(copy(ctx, 'page.contact.version', String(ctx.versionLine || 'Version 1.0')));
    const rows = [
      ['Write to', at(198, 0, 490, 64, `<div class="d" style="font-size:${n1(Math.min(32, M.fit(slot ? 'Your contact email.' : copy(ctx, 'page.contact.email', ''), 430, 32)))}px;line-height:64px;white-space:normal">${email}</div>`)],
      ['Ask first', at(198, 0, 490, 64, slot ? `<div style="padding-top:10px">${nt(ctx, 'Who to ask before changing the mark.')}</div>` : `<div class="b" style="line-height:64px">${E(copy(ctx, 'page.contact.rule', ''))}</div>`)],
      ['Version', at(198, 0, 490, 64, `<div class="b" style="line-height:64px">${ver}</div>`)],
    ];
    let out = word(M, 48, b1, E(big[0]), size) + word(M, 48, b2, E(big[1]), size);
    rows.forEach(([l, v], i) => { out += at(48, 400 + i * 64, 640, 64, lab(ctx, 0, 24, 140, l, true) + v) + hr(48, 400 + i * 64, 640, i ? 'var(--hair)' : 'var(--ink)', i ? 1 : 2); });
    out += hr(48, 592, 640, 'var(--hair)');
    let right;
    if (slot) right = slotPic(ctx, 704, 0, 576, 672, G.red);
    else if (mockupsOn(ctx)) {
      const frame = { left: 704, top: 0, w: 576, h: 672, fx: 0.4, fy: 0.2, zoom: 2.2 };
      right = at(704, 0, 576, 672, photo(ctx, 'IMG-08', { w: 576, h: 672, fx: frame.fx, fy: frame.fy, zoom: frame.zoom }), { style: 'overflow:hidden' })
        + warp(ctx, 'IMG-08', 'marquee', frame, { html: marqueeArt(ctx, G, M), w: 1500, h: 300 });
    } else {
      const mw = 528, mh = mw / 5;
      right = field(ctx, 704, 0, 576, 672, G.stage, at(24, (672 - mh) / 2 - 24, mw, mh, `<div style="width:1500px;height:300px;transform:scale(${(mw / 1500).toFixed(5)});transform-origin:0 0">${marqueeArt(ctx, G, M)}</div>`, { style: 'overflow:hidden' })
        + at(24, (672 + mh) / 2 - 4, mw, 18, '<span class="m13 q">Marquee face, 3000 x 600 mm</span>'));
    }
    return page(ctx, 'contact', g, right + out);
  },
};

// shared with the A4 edition
export { webArt, phoneArt, bandArt, ticket, marqueeArt, qr, slotPic, symbol, demo };
