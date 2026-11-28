// Theme 35, Dispatch: pages 26 to 28 and 30 to 31 (In use: digital, print, social; Close: summary, contact; the two openers, 25 and 29, are in pages-1.js). 16:9 only.
// Families (none repeated beside it): TK tracking (digital), AS actual size (print), SQ story sequence (social), RT route (summary), DL delivered (contact).
// Kerbside's words come from showcase.js through copy(); a fallback here is neutral. A slot is set at its real size as ghost type with one mono note.
// Mockups: with meta.mockups on, pages 26 and 27 warp real page art into the photographs (IMG-06 phone screen, IMG-07 docket and sticker sheet). With them off (and in a slot)
// each page has its own flat layout, so no page depends on a photograph to hold together.
import { fullFolio, timeOf, pad, groundsOf, tones, onTone, mix, at, hr, vr, fill, svgAt, field, measure, word, ghostRule, PHOTO_NOTE, MARK, page, n1, varsOf, codeOf } from './kit.js';
import { copy } from './showcase.js';
import { photo } from './photos.js';
import { warp, flat, areaOnPage } from './mockups.js';
import { barcodeRects } from './barcode.js';
import { ratio } from '../../engine/color.js';

const slotOn = (ctx) => ctx.edition === 'slot';
const mockupsOn = (ctx) => !!(ctx.theme && ctx.theme.mockups === true) && !slotOn(ctx);
const H1 = (txt, x = 48, y = 68, w = 640) => at(x, y, w, 52, `<h1 class="h1">${txt}</h1>`);
const lab = (x, y, w, s, cls = '') => at(x, y, w, 16, `<span class="lb ${cls}">${s}</span>`);
// a logo version at width w: the mark in the showcase, the engine's slot frame in a slot. { w, h, html }
function logoAt(ctx, id, w, o = {}) {
  const g = ctx.logo.geos[id], h = (w * g.h) / g.w;
  const html = slotOn(ctx) ? ctx.logo.html(id, { width: w, color: o.color }) : ctx.logo.svg(id, { width: w, colourway: o.colourway || ctx.logo.colourwayOf(id), fill: o.fill });
  return { w, h, html };
}
// a photo slot: a colour field with the UIL4B mark cropped at the right, and one mono note
export function slotPic(ctx, x, y, w, h, ground, note, style = '', noteY = 14) {
  const hh = h * 1.15, ww = hh * MARK.w / MARK.h, c = mix(ground, tones(ctx, ground).ink, 0.12);
  const mark = svgAt(w - ww * 0.62, -h * 0.08, ww, hh, `<g fill="${c}" transform="scale(${n1(hh / MARK.h)})">${MARK.paths.map((d) => `<path d="${d}"/>`).join('')}</g>`);
  return field(ctx, x, y, w, h, ground, mark + (note ? at(16, noteY, w - 32, 40, `<span class="nt">${ctx.esc(note)}</span>`) : ''), style);
}
const ghostLine = (ctx, s) => `<span style="color:var(--quiet)">${ctx.esc(s)}</span>`;
// art drawn on a ground of its own: one absolute box carrying that ground's tones. `demo` marks it for the contrast check as a mockup (a photograph shades it)
const artBox = (ctx, ground, w, h, inner, demo) => `<div ${demo ? 'data-contrast="demo" ' : ''}style="position:absolute;left:0;top:0;width:${w}px;height:${h}px;background:${ground};${varsOf(tones(ctx, ground))};color:var(--ink);overflow:hidden">${inner}</div>`;
const barcode = (code, x, y, w, h, colour) => svgAt(0, 0, 1280, 720, barcodeRects(code, x, y, w, h, { colour }));
const nt = (x, y, w, s) => at(x, y, w, 48, `<span class="nt">${s}</span>`);

// ---- 26: the tracking screen (390 x 850, the proportion of the phone's glass) and the web hero (1440 x 900) ----
export const PW = 390, PH = 850;
export function phoneArt(ctx, G, M, demo) {
  const g = G.surface, E = ctx.esc, sig = G.primary;
  const title = copy(ctx, 'page.digital.phone.title', 'Your update, one line.'), body = copy(ctx, 'page.digital.phone.body', 'The detail, in one sentence.');
  const size = Math.min(60, M.fit(title, 330 * 1.7, 60));
  const evs = [0, 1, 2].map((i) => [copy(ctx, `page.digital.t.${i}`, ['10:00', '11:00', '12:00'][i]), copy(ctx, `page.digital.ev.${i}`, `Step ${i + 1}`)]);
  const rows = evs.map(([tm, ev], i) => {
    const y = 596 + i * 56;
    return at(28, y, 84, 28, `<span class="m20" style="line-height:28px">${E(tm)}</span>`) + (i < 2 ? fill(117, y + 14, 6, 56, sig) : '') + fill(110, y + 4, 20, 20, i === 2 ? sig : G.ink, 'border-radius:50%')
      + at(148, y, 214, 28, `<span style="font:600 22px/28px var(--body)">${E(ev)}</span>`);
  }).join('');
  const code = codeOf(ctx, 'digital');
  const inner = field(ctx, 0, 92, PW, 300, sig, lab(28, 28, 334, 'Status') + at(28, 60, 334, 220, E(title), { cls: 'd', style: `font-size:${n1(size)}px;line-height:.98;white-space:normal;text-wrap:balance` }))
    + at(28, 420, 334, 100, `<div class="b" style="font-size:24px;line-height:32px">${E(body)}</div>`)
    + hr(28, 560, 334, 'var(--ink)', 4) + rows
    + at(28, 772, 334, 18, `<span class="m13">${E(code)}</span>`) + barcode(code, 28, 794, 334, 32, G.ink);
  return { html: artBox(ctx, g, PW, PH, inner, demo), w: PW, h: PH };
}
export const HW = 1440, HH = 900;
export function heroArt(ctx, G) {
  const g = G.surface, t = tones(ctx, g), E = ctx.esc, slot = slotOn(ctx);
  const head = slot ? '<span style="color:var(--quiet)">Your headline, up to 8 words.</span>' : E(copy(ctx, 'lines.primary', 'Your headline'));
  const body = slot ? '<span style="color:var(--quiet)">Your sentence for the page, in the reading face.</span>' : E(copy(ctx, 'page.digital.body', 'A sentence about what you do, in the reading face.'));
  const lg = logoAt(ctx, 'colour', 220, slot ? { color: t.ink } : { colourway: 'colour' });
  const nav = [0, 1, 2].map((i) => copy(ctx, `page.digital.nav.${i}`, ['About', 'Prices', 'Contact'][i]));
  const photoBox = slot ? slotPic(ctx, 900, 96, 540, 804, G.ink, null) : at(900, 96, 540, 804, photo(ctx, 'IMG-02', { w: 540, h: 804, fx: 0.5, fy: 0.62 }), { style: 'overflow:hidden' });
  const inner = at(72, 98 - 24 - lg.h, lg.w, lg.h, lg.html) + nav.map((s, i) => at(560 + i * 150, 30, 140, 28, `<span style="font:600 22px/28px var(--body)">${E(s)}</span>`)).join('')
    + hr(0, 96, 1440, 'var(--ink)', 8) + photoBox
    + at(72, 156, 780, 440, head, { cls: 'd', style: 'font-size:124px;line-height:.94;white-space:normal;text-wrap:balance' })
    + at(72, 628, 700, 96, `<div class="b" style="font-size:30px;line-height:42px;max-width:none">${body}</div>`)
    + field(ctx, 72, 760, 330, 84, G.primary, at(0, 26, 330, 32, `<span style="display:block;text-align:center;font:600 28px/32px var(--body)">${E(copy(ctx, 'page.digital.btn', 'Call to action'))}</span>`));
  return { html: artBox(ctx, g, HW, HH, inner, false), w: HW, h: HH };
}

// ---- 27: the A6 docket (397 x 559 at 96 dpi) and the sticker sheet (528 x 771) ----
export const DW = 397, DH = 559;
export function docketArt(ctx, G, M, h, demo) {
  const g = G.surface, E = ctx.esc, slot = slotOn(ctx), dy = h - DH;
  const v = (key, fb, ph) => (slot ? ghostLine(ctx, ph) : E(copy(ctx, key, fb)));
  const code = slot ? codeOf(ctx, 'print') : copy(ctx, 'page.print.code', codeOf(ctx, 'print'));
  const due = copy(ctx, 'page.print.due', '12:00'), size = Math.min(110, M.fit(due, 317, 110));
  const inner = hr(24, 24, 349) + lab(24, 38, 200, 'Consignment') + at(24, 56, 349, 18, `<span class="m13">${E(code)}</span>`)
    + hr(24, 90, 349, 'var(--hair)', 1) + lab(24, 102, 200, 'From')
    + at(24, 122, 349, 48, `<div style="font:400 16px/24px var(--body)">${v('page.print.from', 'Address line, suburb', 'Your address')}</div>`)
    + hr(24, 178, 349, 'var(--hair)', 1) + lab(24, 190, 200, 'To')
    + at(24, 210, 349, 52, `<div style="font:600 19px/26px var(--body)">${v('page.print.to', 'Address line, suburb', 'Your address')}</div>`)
    + hr(24, 274, 349, 'var(--ink)', 4)
    + lab(24, 290, 160, 'Booked') + at(24, 308, 160, 24, `<span class="m20">${slot ? ghostLine(ctx, '00:00') : E(copy(ctx, 'page.print.booked', '09:00'))}</span>`)
    + lab(212, 290, 160, slot ? 'Handled by' : 'Rider') + at(212, 308, 160, 24, `<span class="m20">${slot ? ghostLine(ctx, '0') : E(copy(ctx, 'page.print.rider', '1'))}</span>`)
    + field(ctx, 24, 346, 349, 112 + dy, G.primary, lab(16, 14, 200, 'Due by') + word(M, 16, 112 + dy - 16, E(due), size))
    + barcode(code, 24, 474 + dy, 349, 46, G.ink) + at(24, 526 + dy, 349, 18, `<span class="m">${E(code)}</span>`);
  return { html: artBox(ctx, g, DW, h, inner, demo), w: DW, h };
}
export const SW = 528, SH = 771, DISCS = [[146, 162], [384, 162], [146, 384], [384, 384], [146, 609], [384, 609]];
export function sheetArt(ctx, G, demo) {
  const g = G.surface, t = tones(ctx, g), slot = slotOn(ctx), r = 98;
  const discs = DISCS.map(([cx, cy], i) => {
    if (slot) return svgAt(cx - r, cy - r, 2 * r, 2 * r, `<circle cx="${r}" cy="${r}" r="${r - 1}" fill="${mix(g, t.ink, 0.08)}" stroke="${t.hair}" stroke-width="2" stroke-dasharray="6 6"/>`);
    const s = logoAt(ctx, 'symbol', 92 * ctx.logo.geos.symbol.w / ctx.logo.geos.symbol.h, { colourway: i % 2 ? 'reversed' : 'on-signal' });
    return fill(cx - r, cy - r, 2 * r, 2 * r, i % 2 ? G.ink : G.primary, 'border-radius:50%') + at(cx - s.w / 2, cy - s.h / 2, s.w, s.h, s.html);
  }).join('');
  return { html: artBox(ctx, g, SW, SH, discs, demo), w: SW, h: SH };
}

// ---- 28: one story, 304 x 540, drawn at (x, y) on the page. kind: 'field' (Signal), 'photo' (Asphalt bands) or 'photo2' (Signal bands) ----
const eventOf = (ctx, i) => ({ t: copy(ctx, `page.social.t.${i}`, ['10:00', '11:00', '12:00'][i]), line: copy(ctx, `page.social.line.${i}`, 'Your line.') });
function story(ctx, G, M, i, x, y) {
  const E = ctx.esc, slot = slotOn(ctx), ev = eventOf(ctx, i), SW_ = 304, SH_ = 540;
  const ground = i === 1 ? G.ink : G.primary, tg = tones(ctx, ground);
  const tcol = onTone(ctx, G.primary, ground, 4.5);
  const line = slot ? 'Your line, 2 to 3 words.' : ev.line;
  // the biggest size at which the line, wrapped on its words, sits inside w x h (every word on one line, the lines no taller than h)
  const fitLine = (txt, w, h, max, min = 20) => {
    for (let z = max; z > min; z -= 1) {
      const words = String(txt).split(/\s+/); let lines = 1, cur = '', ok = true;
      for (const wd of words) { if (M.width(wd, z) > w) { ok = false; break; } const t2 = cur ? `${cur} ${wd}` : wd; if (cur && M.width(t2, z) > w) { lines++; cur = wd; } else cur = t2; }
      if (ok && lines * z * 0.98 <= h) return z;
    }
    return min;
  };
  const bh = 128, band = bh - 32, area = i === 0 ? 200 : band;
  const sz = fitLine(line, 256, area, slot ? 34 : 72);
  const lineHtml = (h, top) => at(20, top, 264, h, slot ? ghostLine(ctx, line) : E(line), { cls: 'd', style: `font-size:${n1(sz)}px;line-height:.98;white-space:normal;color:${slot ? 'var(--quiet)' : 'var(--ink)'};display:flex;align-items:flex-end` });
  const time = (col) => at(20, 0, 264, 56, `<span class="d" style="font-size:44px;line-height:56px;color:${col}">${E(ev.t)}</span>`);
  if (i === 0) return field(ctx, x, y, SW_, SH_, ground, time('var(--ink)') + lineHtml(area, SH_ - 24 - area));
  const pic = slot ? slotPic(ctx, x, y, SW_, SH_, G.ink, i === 1 ? PHOTO_NOTE : 'Your photograph.', '', 72)
    : at(x, y, SW_, SH_, photo(ctx, i === 1 ? 'IMG-04' : 'IMG-02', { w: SW_, h: SH_, fx: 0.5, fy: i === 1 ? 0.5 : 0.6 }), { style: 'overflow:hidden' });
  const top = field(ctx, x, y, SW_, 56, ground, time(tcol));
  const bot = field(ctx, x, y + SH_ - bh, SW_, bh, ground, lineHtml(band, 16));
  return pic + top + bot;
}

// ---- 30: the street grid of the route page: lines at uneven spacing, not a real map ----
const GX = [48, 96, 208, 296, 400, 544, 680, 820, 960, 1088, 1136], GY = [48, 120, 216, 320, 460, 540, 600, 672];

export const guidelines = {
  // ---- 26 Digital (TK): a phone showing a tracking update in the photograph, and the web hero at 0.36 ----
  digital(ctx) {
    const G = groundsOf(ctx), g = G.panel, t = tones(ctx, g), M = measure(ctx), E = ctx.esc, slot = slotOn(ctx);
    let left;
    if (mockupsOn(ctx)) {
      const frame = { left: 0, top: 0, w: 560, h: 720, fx: 0.55, fy: 0.48, zoom: 1.3 };
      left = at(0, 0, 560, 720, photo(ctx, 'IMG-06', { w: 560, h: 720, fx: frame.fx, fy: frame.fy, zoom: frame.zoom }), { style: 'overflow:hidden' })
        + warp(ctx, 'IMG-06', 'screen', frame, phoneArt(ctx, G, M, true), { glass: true });
    } else {
      const pw = 300, ph = Math.round(pw * PH / PW), x = 130, y = Math.round((720 - ph) / 2), ring = 'border-radius:34px;box-shadow:0 0 0 6px ' + G.panel;
      const sg = ratio(tones(ctx, G.primary).ink, G.primary) >= 5.2 ? G.primary : G.ink;
      const phone = slot ? slotPic(ctx, x, y, pw, ph, sg, 'Your screen. Example: the page or app where customers meet you.', ring)
        : flat(phoneArt(ctx, G, M, false), x, y, pw, ring).html;
      left = field(ctx, 0, 0, 560, 720, G.ink, phone + lab(48, 48, 200, 'Phone', 'q') + at(48, 66, 200, 18, '<span class="m13 q">390 x 844</span>'));
    }
    const hero = flat(heroArt(ctx, G), 608, 96, 518, `box-shadow:0 0 0 1px ${t.ink}`);
    const specs = [['Hero', '1440 x 900'], ['Phone', '390 x 844'], ['Button', 'Signal, ink type']];
    const right = hr(608, 48, 528) + lab(608, 62, 200, 'Web') + at(936, 60, 200, 18, '<span class="m13 q" style="display:block;text-align:right">Shown at 36 percent</span>')
      + hero.html + (slot ? nt(608, 432, 528, E('Your headline, up to 8 words. Example: Warm by six, every day.')) : '')
      + hr(608, 480, 528) + H1('Digital', 608, 500, 528)
      + specs.map(([l, v], i) => at(608 + i * 176, 578, 168, 44, `<span class="lb">${l}</span><br><span class="m13">${E(v)}</span>`)).join('')
      + hr(608, 566, 528, 'var(--hair)', 1);
    return page(ctx, 'digital', g, left + right);
  },

  // ---- 27 Print (AS): the A6 docket at actual size, and the same docket and a sheet of stickers on the bench ----
  print(ctx) {
    const G = groundsOf(ctx), g = G.surface, t = tones(ctx, g), M = measure(ctx), E = ctx.esc, slot = slotOn(ctx);
    const mock = mockupsOn(ctx);
    const dk = flat(docketArt(ctx, G, M, DH, false), 48, 80, DW, `box-shadow:0 0 0 1px ${t.ink}`);
    let right;
    if (mock) {
      const frame = { left: 704, top: 0, w: 480, h: 720, fx: 0.5, fy: 0.5, zoom: 1 };
      right = at(704, 0, 480, 720, photo(ctx, 'IMG-07', { w: 480, h: 720, fx: 0.5, fy: 0.5 }), { style: 'overflow:hidden' })
        + warp(ctx, 'IMG-07', 'docket', frame, docketArt(ctx, G, M, 580, true)) + warp(ctx, 'IMG-07', 'sheet', frame, sheetArt(ctx, G, true));
      [['docket', 'A6 docket'], ['sheet', 'Stickers']].forEach(([area, name]) => {
        const q = areaOnPage(ctx, 'IMG-07', area, frame).quad, cx = (q[0][0] + q[1][0]) / 2, by = Math.max(q[2][1], q[3][1]);
        right += field(ctx, cx - 56, by + 16, 112, 24, G.ink, at(0, 4, 112, 16, `<span class="m" style="display:block;text-align:center">${name}</span>`));
      });
    } else if (slot) {
      right = slotPic(ctx, 704, 0, 480, 720, G.panel, PHOTO_NOTE);
    } else {
      const sh = flat(sheetArt(ctx, G, false), 779, 112, 330, `box-shadow:0 0 0 1px ${tones(ctx, G.panel).ink}`);
      right = field(ctx, 704, 0, 480, 720, G.panel, '') + sh.html + at(779, 112 + sh.h + 20, 330, 40, '<span class="lb">Sticker sheet</span><br><span class="m13">Six die-cut discs, 49 mm</span>');
    }
    const rows = [['Size', 'A6, 105 x 148 mm'], ['Shown', '96 dpi, actual size'], ['Stock', 'White, uncoated']];
    const mid = H1('Print', 484, 80, 200) + word(M, 484, 330, 'A6', Math.min(190, M.fit('A6', 196, 190)), { style: `color:${t.soft}` })
      + rows.map(([l, v], i) => hr(484, 452 + i * 64, 196, i ? 'var(--hair)' : 'var(--ink)', i ? 1 : 4) + at(484, 468 + i * 64, 196, 40, `<span class="lb">${l}</span><br><span class="m13">${E(v)}</span>`)).join('')
      + (slot ? nt(48, 646, 397, E('Your address, as it prints on a docket. Example: 12 Smith Street, Suburb STATE 0000.')) : '');
    return page(ctx, 'print', g, hr(48, 48, 397) + lab(48, 58, 200, 'Docket') + dk.html + mid + right);
  },

  // ---- 28 Social (SQ): three stories joined by a Signal route at the height of their times ----
  social(ctx) {
    const G = groundsOf(ctx), g = G.panel, t = tones(ctx, g), M = measure(ctx), E = ctx.esc, slot = slotOn(ctx);
    const X = [48, 400, 752], Y = 132;
    const route = fill(48, 158, 1088, 4, G.primary) + svgAt(1096, 148, 40, 24, `<circle cx="20" cy="12" r="12" fill="${t.ink}"/><circle cx="20" cy="12" r="5" fill="${G.primary}"/>`);
    const head = hr(48, 48, 1088) + H1('Social', 48, 60, 400)
      + at(488, 64, 560, 44, `<div class="b">${E(copy(ctx, 'page.social.note', 'Stories, 9 : 16. Keep the line inside the frame.'))}</div>`)
      + (slot ? nt(1040 - 192, 64, 288, E('Your line, 2 to 3 words. Example: Fresh bread, before seven.')) : '');
    const stories = X.map((x, i) => story(ctx, G, M, i, x, Y)).join('');
    const side = at(1088, 560, 56, 112, `<span class="lb" style="display:block;transform-origin:0 0;transform:translate(0,112px) rotate(-90deg);width:112px">1080 x 1920</span>`);
    return page(ctx, 'social', g, head + route + stories + side);
  },

  // ---- 30 On one page (RT): the whole identity strung along one route from the depot to the drop ----
  summary(ctx) {
    const G = groundsOf(ctx), g = G.ink, t = tones(ctx, g), M = measure(ctx), E = ctx.esc, slot = slotOn(ctx);
    const grid = svgAt(0, 0, 1280, 720, GX.map((x) => `<path d="M${x} 0V720" stroke="${mix(g, t.ink, 0.2)}" stroke-width="1"/>`).join('') + GY.map((y) => `<path d="M0 ${y}H1184" stroke="${mix(g, t.ink, 0.2)}" stroke-width="1"/>`).join(''));
    const sig = onTone(ctx, G.primary, g, 3);
    const route = svgAt(0, 0, 1280, 720, `<path d="M96 600H400V460H680V320H960V120H1088" fill="none" stroke="${G.primary}" stroke-width="8" stroke-linejoin="miter"/>`
      + [[96, 600], [400, 460], [680, 320], [960, 120]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="14" fill="${g}" stroke="${G.primary}" stroke-width="8"/>`).join('')
      + `<circle cx="1088" cy="120" r="22" fill="${G.primary}"/><circle cx="1088" cy="120" r="8" fill="${g}"/>`);
    const stop = (x, y, id, name) => lab(x, y, 220, E(name)) + at(x, y + 18, 220, 18, `<span class="m q">${pad(fullFolio(id))}, ${timeOf(fullFolio(id))}</span>`);
    const lg = logoAt(ctx, 'colour', 240, slot ? { color: t.ink } : { colourway: 'reversed' });
    const line = slot ? ghostRule(ctx, 'Your line.', '1 line, up to 6 words. Example: Fresh bread, before seven.') : E(copy(ctx, 'page.summary.line', 'Your line.'));
    const lsize = slot ? 56 : Math.min(100, M.fit(copy(ctx, 'page.summary.line', 'Your line.'), 700, 100));
    const lineEl = slot ? at(48, 96, 760, 130, line, { cls: 'big', style: `font-size:56px;line-height:1.05;white-space:normal` }) : word(M, 48, 96 + lsize * M.cap, line, lsize, { style: `color:${sig}` });
    const pic = slot ? slotPic(ctx, 424, 288, 240, 160, G.panel, PHOTO_NOTE) : at(424, 288, 240, 160, photo(ctx, 'IMG-01', { w: 240, h: 160, fx: 0.5, fy: 0.4 }), { style: 'overflow:hidden' });
    const cols = ctx.colours.filter((c) => c.role !== 'label'), seen = new Set(), chips = cols.filter((c) => { const h = c.hex.toLowerCase(); return seen.has(h) ? false : (seen.add(h), true); }).slice(0, 4);
    const chipEls = chips.map((c, i) => fill(984 + (i % 2) * 64, 168 + Math.floor(i / 2) * 64, 56, 56, c.hex, `box-shadow:0 0 0 1px ${t.ink}`)).join('');
    const stops = stop(96, 624, 'mark', 'Mark') + stop(424, 480, 'who', 'Photograph') + stop(704, 340, 'faces', 'Type') + stop(984, 300, 'palette', 'Colour');
    const aa = word(M, 704, 296, 'Aa', 132, { style: `color:${t.ink}` });
    const foot = hr(720, 540, 416) + H1('On one page', 720, 560, 416) + at(720, 616, 416, 22, '<span class="cap q">Mark, photograph, type, colour and line, in the order a customer meets them.</span>');
    return page(ctx, 'summary', g, grid + route + lineEl + at(48, 70, 300, 16, '<span class="lb q">The line</span>') + at(96, 600 - 36 - lg.h, lg.w, lg.h, lg.html) + pic + aa + chipEls + stops + foot);
  },

  // ---- 31 Contact (DL): delivered. The time, the rule, and a signature line ----
  contact(ctx) {
    const G = groundsOf(ctx), g = G.primary, t = tones(ctx, g), M = measure(ctx), E = ctx.esc, slot = slotOn(ctx);
    const ver = String(ctx.versionLine || 'Version 1.0, November 2026');
    const size = Math.min(280, M.fit('12:00', 1088, 280));
    const email = ghostRule(ctx, 'Your contact email.', 'Who to ask before changing the mark. 1 address. Example: brand@yourname.example');
    const mail = slot ? at(608, 508, 528, 80, email, { cls: 'big', style: 'font-size:24px;line-height:1.2;white-space:normal' })
      : at(608, 508, 528, 32, `<span class="h2" style="font-size:28px">${E(copy(ctx, 'contact.email', 'brand@example.com'))}</span>`);
    const head = hr(48, 48, 1088) + at(48, 62, 300, 36, `<div class="lb">Status</div><div class="h2" style="margin-top:4px">${E(copy(ctx, 'page.contact.status', 'Delivered.'))}</div>`)
      + at(608, 62, 300, 36, `<div class="lb">Version</div><div class="m13" style="margin-top:4px">${E(ver.replace(/^Version\s+/, ''))}</div>`);
    const big = word(M, 48, 400, '12:00', size) + hr(48, 448, 1088);
    const sign = lab(48, 530, 300, 'Received by') + hr(48, 586, 512, 'var(--ink)', 2) + at(48, 598, 512, 18, `<span class="m q">Signature, then the time</span>`);
    const ask = at(608, 470, 528, 24, `<span class="lb">${E(copy(ctx, 'page.contact.headline', 'Ask before you change the mark.'))}</span>`) + mail
      + (slot ? '' : at(608, 556, 528, 44, `<div class="b">${E(copy(ctx, 'page.contact.body', 'Write to the owner with the file and where it will run.'))}</div>`));
    return page(ctx, 'contact', g, head + big + sign + ask + at(608, 640, 528, 18, `<span class="m">${E(ver)}</span>`));
  },
};
