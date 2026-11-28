// Theme 35, Dispatch: the A4 portrait edition (794 x 1123), pages 1 to 31. index.js wires each page here in front of its 16:9 twin: a portrait ctx gets this function, a 16:9 ctx keeps its own.
// The consignment stays: margins 40, six columns of 104 with 18 gutters (x 40 to 754), the tear-off strip at the foot (kit.js stubA4: the perforation at y 1027, the page time,
// the barcode laid flat, the mark; on Free the credit above the mark). Heavy 4 px rules carry the structure, 1 px rules the minor rows. Every page is composed for portrait:
// nothing is a squeezed 16:9 page, nothing is rotated. Kerbside's words come from showcase.js through copy(); a fallback here is neutral.
import { ratio, hexToRgb } from '../../engine/color.js';
import {
  SECTIONS, fullFolio, timeOf, pad, groundsOf, tones, onTone, markTone, mix, at, hr, vr, fill, svgAt, field, measure, word, ghost, ghostRule, isGhost, PHOTO_NOTE, MARK, codeOf, page, n1,
} from './kit.js';
import { logoAt, coloursBy, shareSizes, own } from './pages-2.js';
import { barcodeRects } from './barcode.js';
import { copy } from './showcase.js';
import { photo } from './photos.js';
import { typeLadder } from '../../engine/styleguide.js';
import { warp, flat, areaOnPage } from './mockups.js';
import { panelArt, PAW, PAH, chip } from './pages-3.js';
import { slotPic, phoneArt, heroArt, docketArt, sheetArt, PW as PHW, PH as PHH, DW, DH } from './pages-4.js';
import { guidelines as all } from './index.js';

const L = 40, R = 754, CW = 714;
const slotOn = (ctx) => ctx.edition === 'slot';
const sec = (open) => SECTIONS.find((s) => s.open === open);
const logoHtml = (ctx, id, opts) => { try { return ctx.logo.html(id, opts); } catch (e) { const { colourway, ...rest } = opts; return ctx.logo.html(id, rest); } };
const H1 = (txt, x = L, y = 56, w = 560, size = 44) => at(x, y, w, Math.round(size * 1.1), `<h1 class="h1" style="font-size:${size}px">${txt}</h1>`);
// the three-cell head of a consignment: label caps over a mono value
const cells = (items, y = 54) => items.map(([l, v], i) => at(L + i * 238 + (i ? 16 : 0), y, 214, 36, `<div class="lb">${l}</div><div class="m13">${v}</div>`)).join('') + vr(L + 238, y, 34) + vr(L + 476, y, 34);

// ---- the opener, family SC "sort label": three bands split by 4 px rules. The name at 152 px, the bay square at the top right, the manifest, the barcode at full width ----
function opener(ctx, open) {
  const s = sec(open), n = fullFolio(open), G = groundsOf(ctx), M = measure(ctx), E = ctx.esc;
  const ground = s.n % 2 ? G.primary : G.ink, sq = s.n % 2 ? G.ink : G.primary, t = tones(ctx, ground);
  const cell = (i, label, value) => at(L + i * 238 + (i ? 20 : 0), 58, 210, 56, `<div class="lb">${label}</div><div class="h2" style="margin-top:6px">${value}</div>`);
  const top = hr(L, 40, CW) + hr(L, 120, CW) + vr(L + 238, 44, 76) + vr(L + 476, 44, 76) + cell(0, 'Sort to', `Bay ${s.n}`) + cell(1, 'Section', `${s.n} of 7`) + cell(2, 'Due', timeOf(n));
  const size = Math.min(152, M.fit(s.name, CW, 152));
  const num = s.n % 2 ? onTone(ctx, G.primary, sq) : onTone(ctx, G.ink, sq);
  const middle = field(ctx, R - 168, 152, 168, 168, sq, at(14, 12, 140, 16, '<span class="lb">Bay</span>') + at(14, 30, 140, 124, `<span class="d" style="font-size:124px;color:${num}">${s.n}</span>`, { style: 'text-align:right' }))
    + word(M, L, 540, E(s.name), size);
  const rows = s.pages.map(([id, name], i) => {
    const y = 604 + i * 28, last = i === s.pages.length - 1;
    return at(L, y, CW, 28, `<span class="m q" style="position:absolute;left:0;top:6px">${pad(fullFolio(id))}</span><span style="position:absolute;left:48px;top:0;font:600 15px/28px var(--body)">${E(name)}</span><span class="m13" style="position:absolute;right:0;top:5px">${timeOf(fullFolio(id))}</span>`)
      + (last ? '' : hr(L, y + 27, CW, 'var(--hair)', 1));
  }).join('');
  const code = codeOf(ctx, open);
  const bottom = hr(L, 588, CW) + rows + svgAt(0, 0, 794, 1123, barcodeRects(code, L, 756, CW, 120, { colour: t.ink })) + at(L, 888, 400, 16, `<span class="m">${E(code)}</span>`) + hr(L, 936, CW);
  return page(ctx, open, ground, top + middle + bottom);
}

// ---- 1 Cover (LB): the wordmark at the full measure, "10:00" over a Signal field and "12:00" in an Asphalt field that bleeds to the edge ----
function cover(ctx) {
  const G = groundsOf(ctx), t = tones(ctx, G.primary), M = measure(ctx), E = ctx.esc, slot = slotOn(ctx);
  const ver = String(ctx.versionLine || 'Version 1.0, November 2026');
  const head = hr(L, 40, CW) + cells([['Consignment', E(copy(ctx, 'page.code', 'BRAND00'))], ['Items', ctx.skeleton ? '7 pages' : '31 pages'], ['Version', E(ver.replace(/^Version\s+/, ''))]]);
  let mark;
  if (!slot) {
    const g = ctx.logo.geo, s = CW / g.width;
    mark = at(L, 330 - g.cap * s, CW, g.height * s, logoHtml(ctx, 'colour', { width: CW, colourway: 'on-signal' }));
  } else {
    const size = M.fit('Your wordmark', CW, 300);
    mark = word(M, L, 330, 'Your wordmark', size, { style: 'color:var(--soft)' }) + at(L, 350, 600, 16, '<span class="nt">Your logo, SVG.</span>');
  }
  const size = Math.min(M.fit('10:00', 666, 280), M.fit('12:00', 666, 280));
  const a = copy(ctx, 'page.cover.a', ''), b = copy(ctx, 'page.cover.b', '');
  const start = at(L, 388, 600, 16, '<span class="lb">Start</span>') + (a ? at(L, 408, 600, 28, `<div class="h2">${E(a)}</div>`) : '') + word(M, L, 604, '10:00', size);
  const finish = field(ctx, L, 660, 754, 262, G.ink,
    at(24, 18, 600, 16, '<span class="lb">Finish</span>') + (b ? at(24, 38, 600, 28, `<div class="h2">${E(b)}</div>`) : '') + word(M, 24, 236, '12:00', size, { style: `color:${onTone(ctx, G.primary, G.ink)}` }));
  const foot = hr(L, 940, CW) + at(L, 958, CW, 32, `<span class="h2">${E(copy(ctx, 'page.cover.title', 'Brand guidelines.'))}</span><span class="m13" style="margin-left:24px">${E(ver)}</span>`, { style: 'display:flex;align-items:baseline' });
  return page(ctx, 'cover', G.primary, head + mark + start + finish + foot);
}

// ---- 2 Contents (RL): the route runs down the page, y 96 to 960, one tick a page, one stop a section, the names to its right ----
function contents(ctx) {
  const G = groundsOf(ctx), t = tones(ctx, G.ink), M = measure(ctx), E = ctx.esc, X = 300, Y = (k) => 96 + k * 28.8;
  const stops = SECTIONS.map((s) => { const n = fullFolio(s.open); return { s, n, last: n + s.pages.length, y: Y(n - 1) }; });
  let ticks = '';
  for (let k = 0; k < 31; k++) ticks += `<rect x="${X + 4}" y="${n1(Y(k) - 1)}" width="14" height="2" fill="${t.ink}"/>`;
  const route = svgAt(0, 0, 794, 1000, `<rect x="${X}" y="96" width="8" height="864" fill="${G.primary}"/>${ticks}`, 'draw');
  const marks = svgAt(0, 0, 794, 1000, stops.map((p) => `<path d="M${X + 4} ${n1(p.y)}H${X + 36}" stroke="${t.hair}" stroke-width="1"/><circle cx="${X + 4}" cy="${n1(p.y)}" r="12" fill="${t.ink}"/><circle cx="${X + 4}" cy="${n1(p.y)}" r="5" fill="${G.primary}"/>`).join(''));
  const names = stops.map((p) => {
    const rng = p.last - p.n ? `${p.n} to ${p.last}` : String(p.n);
    return at(X + 44, p.y - 16, 380, 54, `<div class="h2" style="font-size:24px">${E(p.s.name)}</div><div style="margin-top:2px;white-space:nowrap"><span class="m13">${timeOf(p.n)}</span><span class="cap q" style="margin-left:10px">${rng}</span></div>`)
      + `<div data-contrast="demo">${word(M, X - 40 - 140, p.y + 0.35 * 72, String(p.s.n), 72, { w: 140, style: `text-align:right;color:${t.soft}` })}</div>`;
  }).join('');
  const ends = at(X + 44, 84, 120, 18, '<span class="m13 q">10:00</span>') + at(X + 44, 950, 120, 18, '<span class="m13 q">12:00</span>');
  const head = hr(L, 40, 210) + at(L, 52, 250, 44, '<h1 class="h1" style="font-size:38px">Contents</h1>') + at(L, 120, 190, 100, '<span class="cap q">Each tick is a page. Each stop is a section. The route takes two hours.</span>');
  return page(ctx, 'contents', G.ink, head + route + marks + names + ends);
}

// ---- 4 Who we are (PD): the photograph at its 3:4 crop bleeds top and right; the proof stamp below the headline; three rows across the foot ----
function who(ctx) {
  const G = groundsOf(ctx), E = ctx.esc, slot = slotOn(ctx), PW = 434, PH = 579, PX = 794 - PW;
  const desc = copy(ctx, 'description');
  const h1 = slot && isGhost(ctx, desc) ? ghostRule(ctx, 'What the brand is, in one sentence.', '15 to 25 words. Example: Bellbird Bakery bakes bread and pastries for Hobart homes and cafes.') : E(desc);
  const head = at(L, 56, 300, 330, `<h1 class="h1" style="font-size:36px;display:-webkit-box;-webkit-line-clamp:7;-webkit-box-orient:vertical;overflow:hidden">${h1}</h1>`);
  const how = slot ? ghostRule(ctx, 'How it works, in one sentence.', '1 sentence. Example: You order by 4 pm and it is at your door before six.') : E(copy(ctx, 'how'));
  const items = [[copy(ctx, 'page.who.what', 'What it does'), ghost(ctx, copy(ctx, 'product'), 'product')], [copy(ctx, 'page.who.howl', 'How'), how], [copy(ctx, 'page.who.for', 'Who for'), ghost(ctx, copy(ctx, 'audience'), 'audience')]];
  let rows = hr(L, 624, CW) + hr(L, 936, CW);
  items.forEach(([l, v], i) => {
    const y = 628 + i * 103;
    rows += at(L, y + 16, 150, 16, `<span class="lb">${E(l)}</span>`) + at(200, y + 12, 554, 80, `<div class="b">${v}</div>`) + (i ? hr(L, y - 1, CW, 'var(--hair)', 1) : '');
  });
  const stamp = hr(L, 444, 270) + at(L, 458, 270, 16, '<span class="lb">Proof of delivery</span>') + at(L, 480, 270, 20, `<span class="m13">${timeOf(fullFolio('who'))}</span>`) + hr(L, 540, 270, 'var(--ink)', 1) + at(L, 548, 270, 16, '<span class="lb q">Received by</span>');
  let pic, cap;
  if (!slot) {
    pic = at(PX, 0, PW, PH, photo(ctx, 'IMG-01', { w: PW, h: PH, fx: 0.5, fy: 0.5 }));
    cap = E(copy(ctx, 'page.who.caption', ''));
  } else {
    const hh = Math.round(PH * 1.2), ww = hh * MARK.w / MARK.h, c = markTone(ctx, G.primary);
    const mark = svgAt(24, -(hh - PH) / 2, ww, hh, `<g fill="${c}" transform="scale(${n1(hh / MARK.h)})">${MARK.paths.map((d) => `<path d="${d}"/>`).join('')}</g>`);
    pic = field(ctx, PX, 0, PW, PH, G.primary, mark + at(24, 24, PW - 48, 40, `<span class="nt">${E(PHOTO_NOTE)}</span>`));
    cap = ghostRule(ctx, 'A caption: what it shows, a time, a place.', 'One line. Example: Sourdough, 800 g. 12 Elm Street, Sandy Bay.');
  }
  const label = `<div class="a" style="left:${PX + 16}px;bottom:${1123 - PH + 24}px;width:${PW - 32}px;background:${G.surface};border:4px solid ${G.ink};padding:10px 14px;color:${G.ink}"><div class="cap" style="color:${G.ink}">${cap}</div></div>`;
  return page(ctx, 'who', G.panel, head + stamp + rows + pic + label);
}

// ---- 5 Voice (AN): the message at 60 px with three underlines, then the notes as three numbered rows ----
function voice(ctx) {
  const G = groundsOf(ctx), E = ctx.esc, slot = slotOn(ctx);
  let msg;
  if (!slot) {
    msg = E(copy(ctx, 'page.voice.message', ''));
    for (let k = 0; k < 3; k++) {
      const sp = E(copy(ctx, `page.voice.span.${k}`, ''));
      if (sp) msg = msg.replace(sp, `<span class="dn" style="margin-right:8px;position:relative;top:9px">${k + 1}</span><span class="u">${sp}</span>`);
    }
  } else msg = ghostRule(ctx, 'A real message your brand sends, with a time and a place.', 'About 12 words. Example: Out of the oven at 4:10. At 12 Elm Street by 6.');
  const body = hr(L, 40, CW) + at(L, 76, CW, 380, `<p class="big" style="font-size:56px;line-height:68px;text-wrap:pretty">${msg}</p>`);
  const sg = (v, path, text) => (v == null ? ghostRule(ctx, text, '') : ghost(ctx, v, path, text, { what: false }));
  let notes = '';
  for (let i = 0; i < 3; i++) {
    const y = 500 + i * 150, pers = (ctx.brand.personality || [])[i] || {};
    const q = slot ? sg(pers.trait, `personality.${i}.trait`, 'A quality') : E(copy(ctx, `page.voice.q.${i}`, ''));
    const txt = slot ? sg(pers.means, `personality.${i}.means`, 'How it shows up, in one sentence.') : E(copy(ctx, `page.voice.note.${i}`, ''));
    notes += hr(L, y, CW) + at(L, y + 22, 24, 24, `<span class="dn">${i + 1}</span>`) + at(L + 36, y + 20, 200, 80, `<div class="h2">${q}</div>`) + at(300, y + 22, 454, 110, `<div class="b">${txt}</div>`);
  }
  return page(ctx, 'voice', G.panel, body + notes);
}

// ---- 6 Words (SR): the boilerplate, then "Send" over "Return to sender" as two stacked columns of three rows ----
function words(ctx) {
  const G = groundsOf(ctx), E = ctx.esc;
  const boiler = ghost(ctx, copy(ctx, 'voice.boilerplate25'), 'voice.boilerplate25', 'The brand in about 25 words.');
  const head = hr(L, 40, CW) + at(L, 72, CW, 220, `<p class="big" style="font-size:30px;line-height:38px">${boiler}</p>`);
  const col = (y0, label, key, strike) => {
    let out = at(L, y0, 400, 16, `<span class="lb">${label}</span>`) + hr(L, y0 + 20, CW, strike ? 'var(--hair)' : 'var(--ink)', strike ? 1 : 4);
    for (let i = 0; i < 3; i++) {
      const y = y0 + 24 + i * 96, v = copy(ctx, `voice.writeThis.${i}.${key}`);
      out += at(L, y + 30, 36, 16, `<span class="m q">${pad(i + 1)}</span>`) + at(L + 44, y + 22, CW - 44, 70, `<div class="h2 ${strike ? 'rl' : ''}">${ghost(ctx, v, `voice.writeThis.${i}.${key}`)}</div>`) + (i < 2 ? hr(L, y + 96, CW, 'var(--hair)', 1) : '');
    }
    return out;
  };
  return page(ctx, 'words', G.surface, head + hr(L, 300, CW) + col(316, 'Send', 'write', false) + col(654, 'Return to sender', 'not', true));
}

// ---- 8 The mark (DT): the mark at 560 wide; its kerb leaves as an 8 px route that turns and runs down into the tear-off strip ----
function mark(ctx) {
  const G = groundsOf(ctx), g = G.primary, M = measure(ctx), slot = slotOn(ctx), W = 560, X = L, E = ctx.esc;
  let html, h, stepY, ghostSize;
  if (!slot) {
    const lg = logoAt(ctx, 'colour', W, { colourway: 'on-signal' }), geo = ctx.logo.geo, sc = W / ctx.logo.geos.colour.w;
    html = lg.html; h = lg.h; stepY = geo.T ? (geo.cap + geo.gap + 1.5 * geo.T) * sc : h / 2;
  } else { const size = M.fit('Your wordmark', W, 400); h = M.cap * size; stepY = h / 2; ghostSize = size; }
  const Y = 360 - stepY, tipY = 360;
  const mk = slot ? word(M, X, Y + h, 'Your wordmark', ghostSize, { style: 'color:var(--soft)' }) + at(X, Y + h + 20, 500, 16, '<span class="nt">Your mark, SVG.</span>') : at(X, Y, W, h, html);
  const route = fill(X + W - 2, tipY - 4, 12, 8, 'var(--ink)') + fill(X + W, tipY - 4, 8, 1123 - tipY + 4, 'var(--ink)');
  const head = hr(L, 40, CW) + H1('The mark');
  const note = at(L, 676, 500, 130, `<div class="h2">${E(copy(ctx, 'page.mark.title', 'The mark as drawn.'))}</div><div class="b" style="margin-top:10px">${E(copy(ctx, 'page.mark.text', 'Use the mark as drawn. Never redraw, stretch or recolour it.'))}</div>`);
  const sym = slot ? '' : (() => { const s = logoAt(ctx, 'symbol', 72 * ctx.logo.geos.symbol.w / ctx.logo.geos.symbol.h, { colourway: 'on-signal' }); return at(L, 848, s.w, s.h, s.html); })();
  const foot = hr(L, 628, 560) + sym + at(L, slot ? 848 : 848 + 72 + 12, 360, 16, `<span class="lb">${E(ctx.logo.labels.symbol || 'Symbol')}</span>`);
  return page(ctx, 'mark', g, head + mk + route + foot + note);
}

// ---- 9 Versions (LS): two shelves of label stock at 1 px to 1 mm: the decal alone, then the bag, the label and the sticker ----
function versions(ctx) {
  const G = groundsOf(ctx), g = G.panel, t = tones(ctx, g), E = ctx.esc, cws = ctx.brand.logo.colourways;
  const items = [
    { x: L, w: 480, h: 320, id: 'colour', key: 'mono-light', mw: 360, shelf: 520 },
    { x: L, w: 352, h: 264, id: 'horizontal', key: 'on-signal', mw: 288, shelf: 900 },
    { x: 470, w: 100, h: 150, id: 'stacked', key: 'colour', mw: 72, shelf: 900 },
    { x: 650, w: 60, h: 60, id: 'symbol', key: 'reversed', mw: 36, shelf: 900 },
  ];
  const names = ['Sign', 'Panel', 'Label', 'Sticker'];
  const out = items.map((it, i) => {
    const key = cws[it.key] ? it.key : 'colour', cw = cws[key], top = it.shelf - it.h;
    const gt = tones(ctx, cw.ground), lg = logoAt(ctx, it.id, it.mw, { colourway: key, color: gt.ink });
    const inner = at((it.w - lg.w) / 2, (it.h - lg.h) / 2, lg.w, lg.h, lg.html);
    const cap = at(it.x, it.shelf + 20, 200, 40, `<div class="lb">${E(copy(ctx, `page.versions.${i}`, names[i]))}</div><div class="m" style="margin-top:2px">${it.w} x ${it.h} mm</div>`)
      + at(it.x, it.shelf + 62, 220, 16, `<span class="m q">${E(String(key).replace(/-/g, ' '))}</span>`);
    return field(ctx, it.x, top, it.w, it.h, cw.ground, inner, `box-shadow:inset 0 0 0 1px ${t.hair}`) + cap;
  }).join('');
  const head = hr(L, 40, CW) + H1('Versions') + at(570, 204, 184, 140, `<div class="b">${E(copy(ctx, 'page.versions.text', 'Each version has a ground it is made for. Shown at one pixel to one millimetre.'))}</div>`);
  return page(ctx, 'versions', g, head + out + hr(L, 520, CW) + hr(L, 900, CW));
}

// ---- 10 Space and size (QZ): the quiet zone hatched in the accent at the top, the ladder of widths, the smallest set big ----
function space(ctx) {
  const G = groundsOf(ctx), g = G.surface, t = tones(ctx, g), E = ctx.esc, M = measure(ctx), Y0 = 212;
  const r = ctx.logo.geo.unit / ctx.logo.geos.colour.w, W = Math.floor((CW - 2) / (1 + 2 * r)), sc = W / ctx.logo.geos.colour.w, c = ctx.logo.geo.unit * sc;
  const lg = logoAt(ctx, 'colour', W, { colourway: 'colour', color: t.ink }), bw = W + 2 * c, bh = lg.h + 2 * c;
  const hatch = svgAt(L, Y0, bw, bh, `<defs><pattern id="ds-qz" width="8" height="8" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><path d="M0 0V8" stroke="${G.primary}" stroke-width="1"/></pattern></defs>`
    + `<path fill-rule="evenodd" fill="url(#ds-qz)" d="M0 0H${n1(bw)}V${n1(bh)}H0Z M${n1(c)} ${n1(c)}V${n1(c + lg.h)}H${n1(c + W)}V${n1(c)}Z"/>`
    + `<rect x=".5" y=".5" width="${n1(bw - 1)}" height="${n1(bh - 1)}" fill="none" stroke="${t.ink}" stroke-width="1"/><rect x="${n1(c + .5)}" y="${n1(c + .5)}" width="${n1(W - 1)}" height="${n1(lg.h - 1)}" fill="none" stroke="${t.hair}" stroke-width="1" stroke-dasharray="4 4"/>`);
  const dm = svgAt(L, Y0 - 28, c, 16, `<path d="M.5 0V12M${n1(c - .5)} 0V12M0 6H${n1(c)}" stroke="${t.ink}" stroke-width="1" fill="none"/>`) + at(L + c + 8, Y0 - 32, 40, 16, '<span class="m">c</span>');
  const min = ctx.logo.minSize, mw = min.screenPx, widths = [300, 180, mw], yL = Y0 + bh + 72;
  let x = L, ladder = hr(L, yL, CW), tallest = 0;
  const parts = widths.map((w) => logoAt(ctx, 'colour', w, { colourway: 'colour', color: t.ink }));
  parts.forEach((s) => { tallest = Math.max(tallest, s.h); });
  const YB = yL + 40 + tallest;
  widths.forEach((w, i) => { const s = parts[i]; ladder += at(x, YB - s.h, s.w, s.h, s.html) + at(x, YB + 10, 200, 16, `<span class="m${i === 2 ? '' : ' q'}">${w} px${i === 2 ? ', smallest' : ''}</span>`); x += w + 56; });
  const yS = YB + 88;
  const small = hr(L, yS, CW) + at(L, yS + 20, 360, 16, '<span class="lb">Smallest</span>') + word(M, L, yS + 20 + 16 + 24 + 88, `${min.screenPx} px`, 120)
    + at(L + 400, yS + 20 + 16 + 24 + 88 - 40, 240, 40, `<div class="m13">on screen</div><div class="m13" style="margin-top:2px">${min.printMm} mm in print</div>`);
  const head = hr(L, 40, CW) + H1('Space and size') + at(L, 116, 560, 44, `<div class="b">${E(copy(ctx, 'page.space.text', 'Quiet zone: c on every side, where c is the height of a capital letter in the name.'))}</div>`);
  return page(ctx, 'space', g, head + hatch + at(L + c, Y0 + c, W, lg.h, lg.html) + dm + ladder + small);
}

// ---- 11 Misuse (EX): EX-01 large and struck, the other five as rows below it ----
function misuse(ctx) {
  const G = groundsOf(ctx), g = G.ink, E = ctx.esc, W = G.surface;
  const lab = (i, fb) => E(copy(ctx, `page.misuse.${i}`, fb));
  const fallback = ['Reversed.', 'Stretched.', 'Rotated.', 'Recoloured.', 'Outline only.', 'On a busy background.'];
  const tf = [null, 'transform:scaleX(1.55)', 'transform:rotate(-14deg)', '', '', ''];
  const body = (i, w) => {
    const id = i === 0 ? 'stacked' : 'colour';
    const o = i === 3 ? { fill: '#7C4DFF', color: '#7C4DFF' } : { color: tones(ctx, W).ink, colourway: 'colour' };
    const lg = logoAt(ctx, id, w, o);
    const wrap = i === 4 ? 'ex-ol' : '', st = i === 0 ? 'transform:scaleX(-1)' : tf[i];
    return { lg, html: `<div class="${wrap}" style="width:${n1(lg.w)}px;height:${n1(lg.h)}px;${st || ''}">${lg.html}</div>` };
  };
  const FH = 340, big = body(0, 300);
  const first = field(ctx, L, 120, CW, FH, W, at((CW - big.lg.w) / 2, (FH - big.lg.h) / 2, big.lg.w, big.lg.h, big.html))
    + svgAt(L, 120, CW, FH, `<path d="M24 ${FH - 24}L${CW - 24} 24" stroke="${G.primary}" stroke-width="4" fill="none"/>`)
    + at(L, 476, 80, 16, '<span class="m">EX-01</span>') + at(L, 496, CW, 30, `<div class="h2">${lab(0, fallback[0])}</div>`);
  const stripes = Array.from({ length: 24 }, (_, k) => `<path d="M${k * 12 - 96} 96L${k * 12} 0" stroke="${k % 3 ? G.ink : G.primary}" stroke-width="${k % 3 ? 3 : 5}"/>`).join('');
  const rows = [1, 2, 3, 4, 5].map((i, k) => {
    const y = 548 + k * 84, b = body(i, 96), tw = 150, th = 72;
    const inner = at((tw - b.lg.w) / 2, (th - b.lg.h) / 2, b.lg.w, b.lg.h, b.html);
    const thumb = field(ctx, L, y + 6, tw, th, W, i === 5 ? `<svg class="a" style="left:0;top:0" width="${tw}" height="${th}" aria-hidden="true">${stripes}</svg>${inner}` : inner, 'overflow:hidden');
    return hr(L, y, CW, 'var(--hair)', 1) + thumb + at(L + tw + 24, y + 14, 80, 16, `<span class="m">EX-0${i + 1}</span>`) + at(L + tw + 24, y + 34, CW - tw - 24, 40, `<div class="h2" style="font-size:18px">${lab(i, fallback[i])}</div>`);
  }).join('') + hr(L, 968, CW, 'var(--hair)', 1);
  return page(ctx, 'misuse', g, hr(L, 40, CW) + at(L, 60, 640, 40, '<h1 class="h1" style="font-size:32px;line-height:40px">Misuse</h1>') + first + rows);
}

// ---- 13 Palette (LP): the colours as full-width fields stacked down the page, each as tall as its share of use, split by 4 px rules ----
function palette(ctx) {
  const G = groundsOf(ctx), g = G.panel;
  const cs = [...ctx.colours].filter((c) => c.role !== 'label').sort((a, b) => b.share - a.share), tot = cs.reduce((a, c) => a + c.share, 0) || 1;
  const Y = 44, HH = 944, hs = shareSizes(cs.map((c) => c.share), HH, 104);
  let out = '', y = Y;
  cs.forEach((c, i) => {
    const rgb = hexToRgb(c.hex).join(' '), pct = ((c.share / tot) * 100).toFixed(1), h = hs[i], big = h >= 150;
    const lands = c.lands && big ? `<div class="b" style="font-size:14px;line-height:20px;margin-top:6px;max-width:520px">${own(ctx, c.lands)}</div>` : '';
    out += field(ctx, L, y, CW, h, c.hex, at(24, 20, CW - 150, 90, `<div class="h2">${own(ctx, c.name)}</div>${lands}`)
      + at(CW - 96, 20, 72, 18, `<span class="m13" style="display:block;text-align:right">${pct}%</span>`)
      + at(24, h - 44, CW - 48, 36, `<div class="m13">${c.hex.toUpperCase()}</div><div class="m13" style="margin-top:2px">${rgb}</div>`));
    y += h;
  });
  let rules = hr(L, Y - 4, CW) + hr(L, Y + HH, CW) + vr(L - 4, Y - 4, HH + 8, 'var(--ink)', 4) + vr(R, Y - 4, HH + 8, 'var(--ink)', 4);
  y = Y; cs.slice(0, -1).forEach((c, i) => { y += hs[i]; rules += hr(L, y - 2, CW); });
  return page(ctx, 'palette', g, out + rules);
}

// ---- 14 Tints (BY): a row of bays for each colour, the step number painted at the top of each bay ----
function tints(ctx) {
  const G = groundsOf(ctx), g = G.ink, t = tones(ctx, g);
  const cs = coloursBy(ctx).filter((c) => c.role !== 'ground' || ctx.colours.length <= 3).slice(0, 3);
  const steps = Object.keys(cs[0].ramp), bg = 8, bw = (CW - (steps.length - 1) * bg) / steps.length, rh = 296, bayH = 232;
  const rows = cs.map((c, r) => {
    const y = 48 + r * (rh + 8), base = String(c.ramp && Object.entries(c.ramp).find(([, v]) => String(v).toLowerCase() === c.hex.toLowerCase())?.[0]);
    const label = at(L, y, CW, 40, `<span class="h2" style="display:inline-block;overflow:hidden;vertical-align:baseline">${own(ctx, c.name)}</span><span class="m13 q" style="margin-left:14px">Base ${base}</span>`);
    const bays = steps.map((k, j) => {
      const hex = String(c.ramp[k]), x = L + j * (bw + bg), mine = k === base;
      return field(ctx, x, y + 44, bw, bayH, hex, at(6, 10, bw - 8, 22, `<span class="h2" style="font-size:16px">${k}</span>`) + at(6, bayH - 26, bw - 4, 16, `<span class="m" style="font-size:10px;letter-spacing:0">${hex.toUpperCase()}</span>`),
        mine ? `outline:3px solid ${t.ink};outline-offset:3px` : '');
    }).join('');
    return label + bays;
  }).join('');
  const foot = hr(L, 944, CW, 'var(--ink)') + at(L, 958, CW, 18, '<span class="cap q">Ten steps from light to dark. The ringed bay is the colour itself.</span>');
  return page(ctx, 'tints', g, rows + foot);
}

// ---- 15 Pairs (RD): six full-bleed rows, one ground each, the same line read at five sizes ----
function pairs(ctx) {
  const G = groundsOf(ctx), g = G.ink, M = measure(ctx), E = ctx.esc;
  const nameOf = (hex) => { const c = [...ctx.colours, ...(ctx.tones || [])].find((x) => x.hex && x.hex.toLowerCase() === String(hex).toLowerCase()); return c && c.name ? own(ctx, c.name) : String(hex).toUpperCase(); };
  const seen = new Set(), pool = ctx.pairs.filter((p) => { const k = `${p.fgHex}|${p.bgHex}`.toLowerCase(); if (seen.has(k)) return false; seen.add(k); return true; });
  pool.sort((a, b) => (b.ratio < 4.5 ? 1 : 0) - (a.ratio < 4.5 ? 1 : 0));
  const picked = [], used = new Set();
  for (const p of pool) { if (picked.length < 6 && !used.has(p.bgHex.toLowerCase())) { picked.push(p); used.add(p.bgHex.toLowerCase()); } }
  for (const p of pool) if (picked.length < 6 && !picked.includes(p)) picked.push(p);
  const rej = new Set(picked.map((p) => `${p.fgHex}|${p.bgHex}`.toLowerCase()));
  for (const p of ctx.unusedPairs) { const k = `${p.fgHex}|${p.bgHex}`.toLowerCase(); if (picked.length < 6 && !rej.has(k)) { rej.add(k); picked.push({ ...p, use: 'Not used for text' }); } }
  const RH = Math.min(156, Math.floor(936 / picked.length));
  for (let i = 1; i < picked.length; i++) if (picked[i].bgHex === picked[i - 1].bgHex) { const j = picked.findIndex((q, k) => k > i && q.bgHex !== picked[i - 1].bgHex && (!picked[i + 1] || q.bgHex !== picked[i + 1].bgHex || k === i + 1)); if (j > 0) [picked[i], picked[j]] = [picked[j], picked[i]]; }
  const sample = E(copy(ctx, 'page.pairs.sample', 'Sample')), sizes = [64, 40, 24, 16, 12];
  const out = picked.map((p, i) => {
    const y = 48 + i * RH, bg = p.bgHex, r = p.ratio;
    const floor = p.minSize || (r >= 4.5 ? 0 : r >= 3 ? 24 : 999);
    let x = L, items = '';
    for (const s of sizes) {
      const w = M.width(sample.replace(/&[a-z#0-9]+;/g, 'x'), s), bad = s < floor;
      const el = word(M, x, RH - 26, sample, s, { style: `color:${p.fgHex};${bad ? `text-decoration:line-through;text-decoration-thickness:${s > 30 ? 3 : 2}px` : ''}` });
      items += bad ? `<div data-contrast="demo">${el}</div>` : el;
      x += w + 24;
    }
    const left = at(L, 14, 430, 60, `<div class="h2" style="font-size:16px;line-height:19px">${nameOf(p.fgHex)} on ${nameOf(bg)}</div><div class="cap" style="font-size:12px;line-height:16px;margin-top:6px">${own(ctx, p.use)}</div>`);
    const ratioT = at(R - 200, 14, 200, 60, `<div class="d" style="font-size:30px;line-height:34px;text-align:right">${p.ratioText}:1</div><div class="m" style="text-align:right;margin-top:6px">${floor ? (floor >= 999 ? 'Not for text' : `From ${floor} px`) : 'Any size'}</div>`);
    return field(ctx, 0, y, 794, RH, bg, left + items + ratioT) + (i ? hr(0, y - 1, 794, 'var(--g)', 2) : '');
  }).join('');
  return page(ctx, 'pairs', g, at(L, 14, 360, 18, '<span class="lb">Pairs, read at five sizes</span>') + at(R - 330, 14, 330, 18, '<span class="cap q" style="display:block;text-align:right">A size below a pair\'s floor is struck.</span>') + out);
}

// ---- 16 Values (DK): a docket, one row to each colour: item, chip, name and use, HEX over RGB (and CMYK), the ratio on White ----
function values(ctx) {
  const G = groundsOf(ctx), g = G.surface, t = tones(ctx, g), E = ctx.esc;
  const cs = coloursBy(ctx), hasCmyk = cs.some((c) => Array.isArray(c.cmyk) && c.cmyk.length === 4);
  const rh = Math.min(148, Math.floor(640 / cs.length)), Y0 = 232, chip = Math.min(72, rh - 28);
  const head = hr(L, 40, CW) + cells([['Consignment', E(copy(ctx, 'page.code', 'BRAND00'))], ['Items', `${cs.length} colours`], ['Due', timeOf(fullFolio('values'))]]) + H1('Values', L, 108, 400);
  const cap = [['Item', L], ['Colour', 84], ['Use', 168], ['HEX', 440]].map(([l, x]) => at(x, Y0 - 24, 200, 16, `<span class="lb">${l}</span>`)).join('')
    + at(R - 140, Y0 - 24, 140, 16, '<span class="lb" style="display:block;text-align:right">Ratio on White</span>') + hr(L, Y0 - 4, CW);
  const rows = cs.map((c, i) => {
    const y = Y0 + i * rh, rgb = hexToRgb(c.hex).join(' '), rr = ratio(c.hex, G.surface), cy = y + rh / 2;
    return (i < cs.length - 1 ? hr(L, y + rh - 1, CW, 'var(--hair)', 1) : '')
      + at(L, cy - 9, 40, 18, `<span class="m q">${String(i + 1).padStart(2, '0')}</span>`)
      + fill(84, cy - chip / 2, chip, chip, c.hex, `box-shadow:inset 0 0 0 1px ${t.hair}`)
      + at(168, cy - 34, 252, 68, `<div class="h2">${own(ctx, c.name)}</div>${c.lands ? `<div class="cap" style="margin-top:4px;line-height:16px;font-size:12px">${own(ctx, c.lands)}</div>` : ''}`)
      + at(440, cy - (hasCmyk ? 32 : 24), 180, hasCmyk ? 64 : 48, `<div class="d" style="font-size:24px;line-height:28px">${c.hex.toUpperCase()}</div><div class="m13" style="margin-top:4px">${rgb}</div>${hasCmyk ? `<div class="m13">${Array.isArray(c.cmyk) ? c.cmyk.join(' ') : 'Not set'}</div>` : ''}`)
      + at(R - 100, cy - 12, 100, 24, `<span class="m13" style="display:block;text-align:right">${(Math.floor(rr * 10) / 10).toFixed(1)}:1</span>`);
  }).join('');
  const yE = Y0 + cs.length * rh;
  const foot = hr(L, yE, CW) + at(L, yE + 20, 200, 36, `<div class="lb">Colours</div><div class="m13">${cs.length}</div>`) + at(L + 238, yE + 20, 200, 36, `<div class="lb">Due</div><div class="m13">${timeOf(fullFolio('values'))}</div>`)
    + hr(L + 476, yE + 80, 238, 'var(--ink)', 1) + at(L + 476, yE + 88, 238, 16, '<span class="lb q">Received by</span>');
  return page(ctx, 'values', g, head + cap + rows + foot);
}

// ================= pages 17 to 31 =================
const mockupsOn = (ctx) => !!(ctx.theme && ctx.theme.mockups === true) && !slotOn(ctx);
const lab = (x, y, w, s, cls = '') => at(x, y, w, 16, `<span class="lb ${cls}">${s}</span>`);
const nt = (x, y, w, s) => at(x, y, w, 48, `<span class="nt">${s}</span>`);
const ghostLine = (ctx, s) => `<span style="color:var(--quiet)">${ctx.esc(s)}</span>`;
const weightsOf = (ctx, role) => [...new Set(ctx.faces.filter((f) => f.role === role && f.style !== 'italic').map((f) => f.weight))].sort((a, b) => a - b).slice(0, 5);
// how many lines a string takes when wrapped on its words at a size, in the display face (null when one word is wider than the box)
function wrapLines(M, txt, w, size) {
  let lines = 1, cur = '';
  for (const wd of String(txt).split(/\s+/)) {
    if (M.width(wd, size) > w) return null;
    const t2 = cur ? `${cur} ${wd}` : wd;
    if (cur && M.width(t2, size) > w) { lines++; cur = wd; } else cur = t2;
  }
  return lines;
}
// the biggest size at which the line, wrapped on its words, sits inside w x h (every word on one line, the lines no taller than h)
function fitWrap(M, txt, w, h, max, min = 16) {
  for (let z = max; z > min; z -= 1) { const n = wrapLines(M, txt, w, z); if (n && n * z * 0.98 <= h) return z; }
  return min;
}
// a page drawn as art inside another page (its section becomes a div, named so the harness does not take it for the page itself)
const asArt = (html, name) => html.replace(/^<section class="pg ds" data-page="[^"]*" style="/, `<div class="pg ds" data-page="${name}" style="break-after:auto;break-inside:auto;position:relative;width:794px;height:1123px;`).replace(/<\/section>$/, '</div>');

// ---- 18 Typefaces (WL): the two times huge and joined by the route, the figure set under them, then the three faces as three rows ----
function faces(ctx) {
  const G = groundsOf(ctx), g = G.panel, t = tones(ctx, g), M = measure(ctx), E = ctx.esc, B = ctx.brand, W = ctx.weights;
  const mono = (B.fonts.mono && B.fonts.mono.family) || 'IBM Plex Mono';
  const set = [
    { lab: 'Display', fam: B.fonts.display.family, css: `font-family:var(--display);font-weight:${W.heading};letter-spacing:-.02em`, size: 76, ws: [W.heading] },
    { lab: 'Reading', fam: B.fonts.body.family, css: `font-family:var(--body);font-weight:${W.regular || 400}`, size: 68, ws: weightsOf(ctx, 'body') },
    { lab: 'Values', fam: mono, css: 'font-family:var(--mono);font-weight:400', size: 52, ws: [400] },
  ];
  const A = '10:00', Z = '12:00', FIG = '0123456789';
  const size = Math.min(M.fit(A, CW, 300), M.fit(Z, CW, 300)), fs = Math.min(96, M.fit(FIG, CW, 96));
  const b1 = 138 + M.cap * size, bar = b1 + 24, b2 = bar + 8 + 24 + M.cap * size, b3 = b2 + 36 + M.cap * fs;
  const specimen = word(M, L, b1, E(A), size) + fill(L, bar, CW, 8, G.primary) + fill(R - 8, bar - 8, 8, 24, G.primary)
    + word(M, L, b2, E(Z), size) + word(M, L, b3, FIG, fs, { style: `color:${t.quiet}` })
    + at(L, b3 + 14, CW, 16, `<span class="m">${E(B.fonts.display.family)}, width 125, weight ${W.heading}, tabular figures</span>`);
  const Y0 = Math.max(b3 + 56, 628), rh = Math.min(128, Math.floor((992 - Y0) / 3));
  const rows = set.map((s, i) => {
    const y = Y0 + i * rh, note = copy(ctx, `page.faces.${i}`, `Weights ${s.ws.join(', ')}.`);
    return hr(L, y, CW, i ? 'var(--hair)' : 'var(--ink)', i ? 1 : 4) + at(L, y + 16, 160, 16, `<span class="lb">${s.lab}</span>`)
      + at(L, y + 36, 190, rh - 40, 'Aa', { cls: 'd', style: `${s.css};font-size:${s.size}px;line-height:${s.size}px;letter-spacing:${i ? '0' : '-.02em'}` })
      + at(250, y + 18, R - 250, rh - 24, `<div class="h2" style="font-size:21px">${E(s.fam)}</div><div class="b" style="margin-top:8px">${E(note)}</div>`);
  }).join('');
  const head = hr(L, 40, CW) + H1('Typefaces', L, 54, 520, 40) + at(L + 480, 62, 234, 18, '<span class="lb q" style="display:block;text-align:right">Times and figures</span>');
  return page(ctx, 'faces', g, head + specimen + rows);
}

// ---- 19 Scale (TL): a tracking timeline running down the page. One event per step, largest first, each set at its own size and wrapped on its words ----
function scale(ctx) {
  const G = groundsOf(ctx), g = G.ink, t = tones(ctx, g), M = measure(ctx), E = ctx.esc, W = ctx.weights, TW = R - 72;
  const lad = typeLadder(ctx), n = lad.length, top = 132, bot = 992, sig = onTone(ctx, G.primary, g, 4.5);
  const steps = lad.map((s, i) => {
    const txt = copy(ctx, `page.scale.${i}`, s.use), disp = s.face === 'display', size = s.size, lh = Math.round(s.line);
    const lines = disp ? Math.max(1, wrapLines(M, txt, TW, size) || 1) : Math.max(1, Math.ceil(M.width(txt, size) * 0.82 / TW));
    return { s, i, txt, disp, size, lh, lines, h: 38 + lines * lh + 26 };
  });
  const gap = Math.max(0, (bot - top - steps.reduce((a, s) => a + s.h, 0)) / Math.max(1, n - 1));
  let y = top, out = fill(40, top, 4, bot - top, sig);
  steps.forEach(({ s, i, txt, disp, size, lh, lines, h }) => {
    const css = `font-family:var(--${disp ? 'display' : 'body'});font-weight:${disp ? W.heading : s.weight};font-size:${size}px;line-height:${lh}px;white-space:normal;${disp ? 'letter-spacing:-.02em;text-wrap:balance;' : ''}`;
    out += (i ? hr(72, y - gap / 2, TW, 'var(--hair)', 1) : '') + fill(34, y + 8, 16, 16, sig)
      + at(72, y + 8, 120, 18, `<span class="m13">${E(copy(ctx, `page.scale.t.${i}`, pad(i + 1)))}</span>`)
      + at(R - 260, y + 8, 260, 18, `<span class="m" style="display:block;text-align:right">${E(s.token)}  ${s.size} / ${s.lineRatio}</span>`)
      + at(72, y + 38, TW, lines * lh + 4, E(txt), { style: css });
    y += h + gap;
  });
  const head = hr(L, 40, CW) + H1('Scale', 72, 54, 300, 40) + at(400, 60, 354, 44, `<div class="b">${E(copy(ctx, 'page.scale.note', 'Each step is set at its own size. Largest first.'))}</div>`);
  return page(ctx, 'scale', g, head + out);
}

// ---- 20 In use (KS): the trike's box panel at the top (a portrait crop of the photograph), the same line on a Signal band below ----
function hierarchy(ctx) {
  const G = groundsOf(ctx), g = G.primary, M = measure(ctx), E = ctx.esc, slot = slotOn(ctx), W = ctx.weights, FH = 600;
  let top;
  if (mockupsOn(ctx)) {
    const frame = { left: 0, top: 0, w: 794, h: FH, fx: 0.51, fy: 0.372, zoom: 1 };
    top = at(0, 0, 794, FH, photo(ctx, 'IMG-05', { w: 794, h: FH, fx: frame.fx, fy: frame.fy }), { style: 'overflow:hidden' })
      + warp(ctx, 'IMG-05', 'panel', frame, { html: panelArt(ctx, G, M), w: PAW, h: PAH });
  } else {
    const f = flat({ html: panelArt(ctx, G, M), w: PAW, h: PAH }, L, 40, CW);
    const rows = [['Panel', '16 : 9'], ['Headline', `${E(ctx.brand.fonts.display.family)} ${W.heading}`], ['Ground', G.ink.toUpperCase()]];
    const info = rows.map(([l, v], i) => hr(L + i * 238 + (i ? 16 : 0), 474, 214, i ? 'var(--hair)' : 'var(--ink)', i ? 1 : 4) + at(L + i * 238 + (i ? 16 : 0), 490, 214, 40, `<span class="lb">${l}</span><br><span class="m13">${v}</span>`)).join('');
    top = field(ctx, 0, 0, 794, FH, G.panel, f.html + info + (slot ? at(L, 548, CW, 40, `<span class="nt">${E(PHOTO_NOTE)}</span>`) : ''));
  }
  const line = copy(ctx, 'page.use.line', 'Your headline'), ghostTxt = 'Your headline, up to 6 words.';
  const size = slot ? Math.min(88, fitWrap(M, ghostTxt, CW, 150, 88)) : fitWrap(M, line, CW, 250, 150);
  const band = slot
    ? at(L, 664, CW, 250, ghostRule(ctx, ghostTxt, '1 line, up to 6 words. Example: Fresh bread, before seven.'), { cls: 'big', style: `font-size:${size}px;line-height:1.02` })
    : at(L, 664, CW, 250, E(line), { cls: 'd', style: `font-size:${size}px;line-height:.98;white-space:normal;text-wrap:balance` });
  const bandHead = at(L, 622, 400, 16, `<span class="lb">Headline</span><span class="m" style="margin-left:16px">${Math.round(size)} px, weight ${W.heading}</span>`)
    + at(R - 200, 622, 200, 16, `<span class="lb">Body</span><span class="m" style="margin-left:16px">${E(typeLadder(ctx).find((s) => s.token === 'body')?.size || 15)} px</span>`);
  const body = at(L, 944, CW, 44, `<div class="b">${E(copy(ctx, 'page.use.body', 'Body copy, set in the reading face.'))}</div>`);
  return page(ctx, 'hierarchy', g, top + hr(0, FH, 794, 'var(--ink)', 4) + bandHead + band + body);
}

// ---- 21 Type rules (PF): one pass at full width, two fails side by side under it ----
function typeRules(ctx) {
  const G = groundsOf(ctx), g = G.panel, t = tones(ctx, g), M = measure(ctx), E = ctx.esc, slot = slotOn(ctx);
  const sample = copy(ctx, 'page.rules.sample', 'Your headline.');
  const txt = (x, y, w, size, col) => at(x, y, w, size * 1.1, E(sample), { cls: 'd', style: `font-size:${n1(size)}px;line-height:1;color:${col}` });
  const frames = [
    { x: L, y: 124, w: CW, h: 396, pass: true, id: 'IMG-08', f: { fx: 0.5, fy: 0.5 }, art: txt(32, 32, 650, Math.min(104, M.fit(sample, 650, 104)), t.ink), ground: G.ink },
    { x: L, y: 656, w: 347, h: 200, pass: false, id: 'IMG-01', f: { fx: 0.55, fy: 0.33 }, art: txt(16, 70, 315, Math.min(44, M.fit(sample, 315, 44)), G.surface), ground: G.ink },
    { x: L + 367, y: 656, w: 347, h: 200, pass: false, id: 'IMG-08', f: { fx: 0.5, fy: 0.1, zoom: 1.5 }, art: txt(16, 18, 315, Math.min(44, M.fit(sample, 315, 44)), G.primary), ground: G.ink },
  ];
  const caps = [
    ['Pass.', copy(ctx, 'page.rules.0', 'Set the line on open space, never across the subject.'), L, 536, CW],
    ['Fail.', copy(ctx, 'page.rules.1', 'Across the subject.'), L, 872, 347],
    ['Fail.', copy(ctx, 'page.rules.2', 'A light accent colour on a photo drops below 3:1 on light patches.'), L + 367, 872, 347],
  ];
  const pics = frames.map((fr, i) => {
    const pic = slot ? slotPic(ctx, fr.x, fr.y, fr.w, fr.h, fr.ground, i === 0 ? PHOTO_NOTE : 'Your photograph.')
      : at(fr.x, fr.y, fr.w, fr.h, `<div data-contrast="demo">${photo(ctx, fr.id, { w: fr.w, h: fr.h, ...fr.f })}</div>${fr.art}`, { style: 'overflow:hidden' });
    return pic + chip(ctx, fr.x + 12, fr.y + fr.h - 36, fr.pass ? 'Pass' : 'Fail', fr.pass ? G.ink : G.primary);
  }).join('');
  const notes = caps.map(([l, s, x, y, w]) => at(x, y, w, 96, `<span class="lb">${l}</span><div class="b" style="margin-top:6px">${E(s)}</div>`)).join('');
  return page(ctx, 'type-rules', g, hr(L, 40, CW) + H1('Type rules', L, 56, 560, 40) + pics + notes + hr(L, 618, CW));
}

// ---- 23 Grid (CB): the brand's column bands down the whole page, the page's own measures read off them in one row ----
function grid(ctx) {
  const G = groundsOf(ctx), g = G.surface, t = tones(ctx, g), tp = tones(ctx, G.panel), E = ctx.esc, Mg = ctx.gridMeasures || {};
  const n = Mg.columns || 12, gu = Mg.gutter || 16, cw = (CW - (n - 1) * gu) / n, X = (i) => L + i * (cw + gu), span = (a, b) => (b - a + 1) * (cw + gu) - gu;
  const Y0 = 40, BH = 816, rows = 8, rh = BH / rows, nsz = cw >= 56 ? 40 : Math.max(18, Math.round(cw * 0.5));
  const bands = Array.from({ length: n }, (_, i) => fill(X(i), Y0, cw, BH, G.panel) + at(X(i), Y0 + 8, cw, nsz + 4, String(i + 1), { cls: 'd', style: `font-size:${nsz}px;line-height:${nsz + 4}px;text-align:center;color:${tp.quiet};letter-spacing:-.02em` })).join('');
  const rowsHr = Array.from({ length: rows + 1 }, (_, r) => hr(L, Y0 + r * rh - (r === rows ? 1 : 0), CW, t.hair, 1)).join('');
  const a = Math.min(7, n) - 1, b0 = Math.min(7, n - 1);
  const sig = field(ctx, X(0), Y0 + rh * 1, span(0, a), rh * 2, G.primary, at(20, rh * 2 - 38, span(0, a) - 40, 20, `<span class="lb">${a + 1} column${a ? 's' : ''}</span>`) + at(20, 14, span(0, a) - 40, 52, `<h1 class="h1">${E(copy(ctx, 'page.grid.title', 'Grid'))}</h1>`) + at(20, 72, span(0, a) - 40, 40, `<div class="b">${E(copy(ctx, 'page.grid.0', 'One idea to a block.'))}</div>`));
  const ink = field(ctx, X(b0), Y0 + rh * 4, span(b0, n - 1), rh * 2, G.ink, at(20, rh * 2 - 38, span(b0, n - 1) - 40, 20, `<span class="lb">${n - b0} column${n - b0 === 1 ? '' : 's'}</span>`) + at(20, 14, span(b0, n - 1) - 40, 90, `<div class="h2">${E(copy(ctx, 'page.grid.1', 'The rest of the page.'))}</div>`));
  const vals = [['Columns', String(n)], ['Column', `${n1(cw)} px`], ['Gutter', `${gu} px`], ['Margin', '40 px'], ['Base', `${Mg.base || 4} px`], ['Row', `${n1(rh)} px`]];
  const read = vals.map(([l, v], i) => at(L + i * (CW / 6), Y0 + BH + 20, CW / 6 - 10, 70, `<span class="lb">${l}</span><div class="h2" style="margin-top:4px;font-size:19px">${E(v)}</div>`)).join('');
  return page(ctx, 'grid', g, bands + rowsHr + sig + ink + read);
}

// ---- 24 Compositions (PS): the shelf photograph (a landscape crop, full bleed) with pages 1, 13 and 26 on its labels, then the same three pages large; flat, three plates stepping down ----
function compositions(ctx) {
  const G = groundsOf(ctx), E = ctx.esc, COMPOSE = [['cover', 'Cover'], ['palette', 'Palette'], ['digital', 'Digital']];
  const arts = COMPOSE.map(([id, name]) => ({ id, name, no: fullFolio(id), html: asArt(all[id](ctx), `art-${id}`) }));
  // the label stock (1280 x 760): the portrait page set upright at 680 tall, white stock either side
  const label = (a) => `<div data-contrast="demo" style="position:absolute;left:0;top:0;width:1280px;height:760px;background:${G.surface}"><div style="position:absolute;left:399.5px;top:40px;width:481px;height:680px;overflow:hidden;box-shadow:0 0 0 3px ${mix(G.surface, G.ink, 0.25)}"><div style="width:794px;height:1123px;transform:scale(.6055);transform-origin:0 0">${a.html}</div></div></div>`;
  const sub = copy(ctx, 'page.compositions.note', `Pages ${arts.map((a) => a.no).join(', ')}, set on label stock.`);
  const g = G.ink, t = tones(ctx, g);
  const cap = (a, x, y) => at(x, y, 222, 40, `<span class="lb">${E(a.name)}</span><br><span class="m13">${pad(a.no)}/31, ${timeOf(a.no)}</span>`);
  if (mockupsOn(ctx)) {
    const FH = 450, frame = { left: 0, top: 0, w: 794, h: FH, fx: 0.504, fy: 0.5, zoom: 1 };
    let body = at(0, 0, 794, FH, photo(ctx, 'IMG-03', { w: 794, h: FH, fx: frame.fx, fy: frame.fy }), { style: 'overflow:hidden' });
    arts.forEach((a, i) => {
      const area = ['label-a', 'label-b', 'label-c'][i];
      body += warp(ctx, 'IMG-03', area, frame, { html: label(a), w: 1280, h: 760 });
      const q = areaOnPage(ctx, 'IMG-03', area, frame).quad, cx = (q[0][0] + q[1][0]) / 2, by = Math.max(q[2][1], q[3][1]);
      body += field(ctx, cx - 56, by + 14, 112, 24, G.ink, at(0, 4, 112, 16, `<span class="m" style="display:block;text-align:center">${pad(a.no)} ${E(a.name)}</span>`));
    });
    const K = 0.28, xs = [L, 286, 532];
    const plates = arts.map((a, i) => at(xs[i], 614, 222, 314, `<div data-contrast="demo" style="width:794px;height:1123px;transform:scale(${K});transform-origin:0 0">${a.html}</div>`, { style: `overflow:hidden;box-shadow:0 0 0 2px ${t.ink}` }) + cap(a, xs[i], 944)).join('');
    const head = hr(L, 470, CW) + lab(L, 484, 300, 'Layout') + H1('Compositions', L, 502, 600, 44) + at(L, 562, CW, 24, `<span class="m13">${E(sub)}</span>`);
    return page(ctx, 'compositions', g, body + head + plates);
  }
  // flat: Asphalt ground, the three pages at 38 percent stepping down the page, the first in front so each stub stays in sight
  const K = 0.38, PW = Math.round(794 * K), PH = Math.round(1123 * K), xs = [L, 246, 452], ys = [208, 330, 452];
  const plates = [2, 1, 0].map((i) => at(xs[i], ys[i], PW, PH, `<div data-contrast="demo" style="width:794px;height:1123px;transform:scale(${K});transform-origin:0 0">${arts[i].html}</div>`, { style: `overflow:hidden;box-shadow:0 0 0 2px ${t.ink}` })).join('');
  const caps = arts.map((a, i) => cap(a, xs[i], ys[i] + PH + 12)).join('');
  const head = hr(L, 40, CW) + H1('Compositions', L, 56, 600, 44) + at(L, 124, 460, 44, `<div class="b">${E(sub)}</div>`) + at(R - 200, 62, 200, 18, '<span class="m13 q" style="display:block;text-align:right">Shown at 38 percent</span>');
  return page(ctx, 'compositions', g, head + plates + caps);
}

// ---- 26 Digital (TK): the phone in a portrait crop of the photograph at the top, the web hero at 32 percent below it, the specs beside ----
function digital(ctx) {
  const G = groundsOf(ctx), g = G.panel, t = tones(ctx, g), M = measure(ctx), E = ctx.esc, slot = slotOn(ctx), FH = 600;
  let top;
  if (mockupsOn(ctx)) {
    const frame = { left: 0, top: 0, w: 794, h: FH, fx: 0.55, fy: 0.485, zoom: 1 };
    top = at(0, 0, 794, FH, photo(ctx, 'IMG-06', { w: 794, h: FH, fx: frame.fx, fy: frame.fy }), { style: 'overflow:hidden' })
      + warp(ctx, 'IMG-06', 'screen', frame, phoneArt(ctx, G, M, true), { glass: true });
  } else {
    const pw = 260, ph = Math.round(pw * PHH / PHW), x = 440, y = Math.round((FH - ph) / 2), ring = `border-radius:30px;box-shadow:0 0 0 6px ${G.panel}`;
    const sg = ratio(tones(ctx, G.primary).ink, G.primary) >= 5.2 ? G.primary : G.ink;
    const phone = slot ? slotPic(ctx, x, y, pw, ph, sg, 'Your screen. Example: the page or app where customers meet you.', ring) : flat(phoneArt(ctx, G, M, false), x, y, pw, ring).html;
    top = field(ctx, 0, 0, 794, FH, G.ink, phone + lab(L, 40, 200, 'Phone', 'q') + at(L, 58, 200, 18, '<span class="m13 q">390 x 844</span>'));
  }
  const K = 0.32, hero = flat(heroArt(ctx, G), L, 672, 1440 * K, `box-shadow:0 0 0 1px ${t.ink}`);
  const specs = [['Hero', '1440 x 900'], ['Phone', '390 x 844'], ['Button', 'Signal, ink type']];
  const X = 544, w = R - X;
  const right = H1('Digital', X, 616, w, Math.min(40, Math.floor(M.fit('Digital', w, 40))))
    + specs.map(([l, v], i) => hr(X, 700 + i * 60, w, i ? 'var(--hair)' : 'var(--ink)', i ? 1 : 4) + at(X, 714 + i * 60, w, 40, `<span class="lb">${l}</span><br><span class="m13">${E(v)}</span>`)).join('')
    + (slot ? nt(X, 892, w, E('Your headline, up to 8 words. Example: Warm by six, every day.')) : '');
  return page(ctx, 'digital', g, top + hr(0, FH, 794) + lab(L, 636, 200, 'Web') + at(L + 1440 * K - 200, 634, 200, 18, '<span class="m13 q" style="display:block;text-align:right">Shown at 32 percent</span>') + hero.html + right);
}

// ---- 27 Print (AS): the docket at actual size beside the stickers (or the photograph of both), then the headline and the specs ----
function printPage(ctx) {
  const G = groundsOf(ctx), g = G.surface, t = tones(ctx, g), M = measure(ctx), E = ctx.esc, slot = slotOn(ctx), FH = 690;
  let top;
  if (mockupsOn(ctx)) {
    const frame = { left: 0, top: 0, w: 794, h: FH, fx: 0.5, fy: 0.5107, zoom: 1 };
    top = at(0, 0, 794, FH, photo(ctx, 'IMG-07', { w: 794, h: FH, fx: frame.fx, fy: frame.fy }), { style: 'overflow:hidden' })
      + warp(ctx, 'IMG-07', 'docket', frame, docketArt(ctx, G, M, 580, true)) + warp(ctx, 'IMG-07', 'sheet', frame, sheetArt(ctx, G, true));
    [['docket', 'A6 docket'], ['sheet', 'Stickers']].forEach(([area, name]) => {
      const q = areaOnPage(ctx, 'IMG-07', area, frame).quad, cx = (q[0][0] + q[1][0]) / 2, by = Math.max(q[2][1], q[3][1]);
      top += field(ctx, cx - 56, by + 14, 112, 24, G.ink, at(0, 4, 112, 16, `<span class="m" style="display:block;text-align:center">${name}</span>`));
    });
  } else {
    const dk = flat(docketArt(ctx, G, M, DH, false), L, 66, DW, `box-shadow:0 0 0 1px ${slot ? t.ink : tones(ctx, G.panel).ink}`);
    if (slot) {
      top = dk.html + slotPic(ctx, 457, 0, 337, FH, G.panel, PHOTO_NOTE) + nt(L, 66 + DH + 14, DW, E('Your address, as it prints on a docket. Example: 12 Smith Street, Suburb STATE 0000.'));
    } else {
      const sh = flat(sheetArt(ctx, G, false), 454, 66, 300, `box-shadow:0 0 0 1px ${tones(ctx, G.panel).ink}`);
      top = field(ctx, 0, 0, 794, FH, G.panel, '') + dk.html + sh.html + lab(454, 66 + sh.h + 16, 300, 'Sticker sheet') + at(454, 66 + sh.h + 34, 300, 18, '<span class="m13">Six die-cut discs, 49 mm</span>');
    }
  }
  const rows = [['Size', 'A6, 105 x 148 mm'], ['Shown', '96 dpi, actual size'], ['Stock', 'White, uncoated']];
  const low = H1('Print', L, 722, 320, 44) + word(M, L, 960, 'A6', Math.min(190, M.fit('A6', 300, 190)), { style: `color:${t.soft}` })
    + rows.map(([l, v], i) => hr(430, 724 + i * 76, R - 430, i ? 'var(--hair)' : 'var(--ink)', i ? 1 : 4) + at(430, 742 + i * 76, R - 430, 40, `<span class="lb">${l}</span><br><span class="m13">${E(v)}</span>`)).join('');
  return page(ctx, 'print', g, top + hr(0, FH, 794) + low);
}

// ---- 28 Social (SQ): three stories 214 x 380 stepping down the page, joined by a Signal route from the foot of one time band to the head of the next ----
function storyA4(ctx, G, M, i, x, y) {
  const E = ctx.esc, slot = slotOn(ctx), SW_ = 214, SH_ = 380, bh = 104, band = bh - 24;
  const ev = { t: copy(ctx, `page.social.t.${i}`, ['10:00', '11:00', '12:00'][i]), line: copy(ctx, `page.social.line.${i}`, 'Your line.') };
  const ground = i === 1 ? G.ink : G.primary, tcol = onTone(ctx, G.primary, ground, 4.5);
  const line = slot ? 'Your line, 2 to 3 words.' : ev.line, area = i === 0 ? 150 : band;
  const sz = fitWrap(M, line, SW_ - 32, area, slot ? 26 : 56);
  const lineHtml = (h, top) => at(16, top, SW_ - 32, h, slot ? ghostLine(ctx, line) : E(line), { cls: 'd', style: `font-size:${n1(sz)}px;line-height:.98;white-space:normal;color:${slot ? 'var(--quiet)' : 'var(--ink)'};display:flex;align-items:flex-end` });
  const time = (col) => at(16, 0, SW_ - 32, 52, `<span class="d" style="font-size:36px;line-height:52px;color:${col}">${E(ev.t)}</span>`);
  if (i === 0) return field(ctx, x, y, SW_, SH_, ground, time('var(--ink)') + lineHtml(area, SH_ - 20 - area));
  const pic = slot ? slotPic(ctx, x, y, SW_, SH_, G.ink, i === 1 ? PHOTO_NOTE : 'Your photograph.', '', 72)
    : at(x, y, SW_, SH_, photo(ctx, i === 1 ? 'IMG-04' : 'IMG-02', { w: SW_, h: SH_, fx: 0.5, fy: i === 1 ? 0.5 : 0.6 }), { style: 'overflow:hidden' });
  return pic + field(ctx, x, y, SW_, 52, ground, time(tcol)) + field(ctx, x, y + SH_ - bh, SW_, bh, ground, lineHtml(band, 12));
}
function social(ctx) {
  const G = groundsOf(ctx), g = G.panel, t = tones(ctx, g), M = measure(ctx), E = ctx.esc, slot = slotOn(ctx);
  const X = [L, 290, 540], Y = [160, 346, 532], W_ = 214, H_ = 380;
  const route = fill(254, Y[0] + 24, 143 + 2, 4, G.primary) + fill(395, Y[0] + 24, 4, Y[1] - Y[0] - 24, G.primary)
    + fill(504, Y[1] + 24, 143 + 2, 4, G.primary) + fill(645, Y[1] + 24, 4, Y[2] - Y[1] - 24, G.primary)
    + [[397, Y[1]], [647, Y[2]]].map(([cx, cy]) => svgAt(cx - 12, cy - 12, 24, 24, `<circle cx="12" cy="12" r="12" fill="${t.ink}"/><circle cx="12" cy="12" r="5" fill="${G.primary}"/>`)).join('');
  const stories = X.map((x, i) => storyA4(ctx, G, M, i, x, Y[i])).join('');
  const head = hr(L, 40, CW) + lab(L, 54, 200, 'Stories') + at(L, 74, 220, 44, `<span class="m13">3 frames, 9 : 16</span>`);
  const left = hr(L, 596, W_) + H1('Social', L, 612, W_, Math.floor(M.fit('Social', W_, 44))) + at(L, 668, W_, 90, `<div class="b">${E(copy(ctx, 'page.social.note', 'Stories, 9 : 16. Keep the line inside the frame.'))}</div>`)
    + at(L, 770, W_, 18, '<span class="m13 q">1080 x 1920</span>');
  const right = slot ? nt(540, 54, W_, E('Your line, 2 to 3 words. Example: Fresh bread, before seven.')) : '';
  return page(ctx, 'social', g, head + route + stories + left + right);
}

// ---- 30 On one page (RT): the whole identity strung along one route that climbs the page from the depot to the drop ----
const GXA = [40, 96, 180, 300, 400, 500, 580, 660, 720, 754], GYA = [40, 120, 210, 330, 450, 540, 630, 720, 790, 870, 950, 1000];
function summary(ctx) {
  const G = groundsOf(ctx), g = G.ink, t = tones(ctx, g), M = measure(ctx), E = ctx.esc, slot = slotOn(ctx), gc = mix(g, t.ink, 0.2);
  const grid = svgAt(0, 0, 794, 1027, GXA.map((x) => `<path d="M${x} 0V1027" stroke="${gc}" stroke-width="1"/>`).join('') + GYA.map((y) => `<path d="M0 ${y}H794" stroke="${gc}" stroke-width="1"/>`).join(''));
  const sig = onTone(ctx, G.primary, g, 3);
  const route = svgAt(0, 0, 794, 1027, `<path d="M96 950H300V790H500V630H660V330" fill="none" stroke="${G.primary}" stroke-width="8" stroke-linejoin="miter"/>`
    + [[96, 950], [300, 790], [500, 630], [660, 450]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="14" fill="${g}" stroke="${G.primary}" stroke-width="8"/>`).join('')
    + `<circle cx="660" cy="330" r="22" fill="${G.primary}"/><circle cx="660" cy="330" r="8" fill="${g}"/>`);
  // each stop label sits on a plate of the page's ground, so a street line never runs through its type
  const stop = (x, y, id, name) => field(ctx, x - 4, y - 2, Math.min(112, 794 - 40 - x + 4), 42, g, lab(4, 2, 100, E(name)) + at(4, 20, 100, 18, `<span class="m q">${pad(fullFolio(id))}, ${timeOf(fullFolio(id))}</span>`));
  const lg = logoAt(ctx, 'colour', 190, slot ? { color: t.ink } : { colourway: 'reversed' });
  const lineTxt = copy(ctx, 'page.summary.line', 'Your line.');
  const lineEl = slot ? at(L, 80, 600, 220, slot ? ghostRule(ctx, 'Your line.', '1 line, up to 6 words. Example: Fresh bread, before seven.') : '', { cls: 'big', style: 'font-size:56px;line-height:1.05;white-space:normal' })
    : at(L, 82, CW, 220, E(lineTxt), { cls: 'd', style: `font-size:${fitWrap(M, lineTxt, CW, 200, 120)}px;line-height:.98;white-space:normal;color:${sig}` });
  const pic = slot ? slotPic(ctx, 96, 604, 240, 168, G.panel, PHOTO_NOTE) : at(96, 604, 240, 168, photo(ctx, 'IMG-01', { w: 240, h: 168, fx: 0.5, fy: 0.4 }), { style: 'overflow:hidden' });
  const cols = ctx.colours.filter((c) => c.role !== 'label'), seen = new Set(), chips = cols.filter((c) => { const h = c.hex.toLowerCase(); return seen.has(h) ? false : (seen.add(h), true); }).slice(0, 4);
  const chipEls = chips.map((c, i) => fill(556 + (i % 2) * 46, 404 + Math.floor(i / 2) * 46, 42, 42, c.hex, `box-shadow:0 0 0 1px ${t.ink}`)).join('');
  const stops = stop(96, 970, 'mark', 'Mark') + stop(316, 806, 'who', 'Photograph') + stop(516, 646, 'faces', 'Type') + stop(676, 466, 'palette', 'Colour');
  const aa = word(M, 352, 612, 'Aa', 130, { style: `color:${t.ink}` });
  const foot = hr(404, 868, 350) + H1('On one page', 404, 884, 350, 34) + at(404, 934, 350, 44, '<span class="cap q">Mark, photograph, type, colour and line, in the order a customer meets them.</span>');
  return page(ctx, 'summary', g, grid + route + lineEl + at(L, 56, 300, 16, '<span class="lb q">The line</span>') + at(96, 950 - 36 - lg.h, lg.w, lg.h, lg.html) + pic + aa + chipEls + stops + foot);
}

// ---- 31 Contact (DL): delivered. The time at the full measure, the rule, the ask, and a signature line ----
function contact(ctx) {
  const G = groundsOf(ctx), g = G.primary, M = measure(ctx), E = ctx.esc, slot = slotOn(ctx);
  const ver = String(ctx.versionLine || 'Version 1.0, November 2026');
  const size = Math.min(280, M.fit('12:00', CW, 280)), base = 150 + M.cap * size, ry = base + 40;
  const head = hr(L, 40, CW) + at(L, 54, 214, 40, `<div class="lb">Status</div><div class="h2" style="margin-top:4px">${E(copy(ctx, 'page.contact.status', 'Delivered.'))}</div>`)
    + at(L + 254, 54, 214, 40, `<div class="lb">Version</div><div class="m13" style="margin-top:4px">${E(ver.replace(/^Version\s+/, ''))}</div>`);
  const big = word(M, L, base, '12:00', size) + hr(L, ry, CW);
  const y = ry + 44;
  const email = ghostRule(ctx, 'Your contact email.', 'Who to ask before changing the mark. 1 address. Example: brand@yourname.example');
  const ask = at(L, y, CW, 24, `<span class="lb">${E(copy(ctx, 'page.contact.headline', 'Ask before you change the mark.'))}</span>`)
    + (slot ? at(L, y + 30, 560, 90, email, { cls: 'big', style: 'font-size:28px;line-height:1.2;white-space:normal' })
      : at(L, y + 32, CW, 36, `<span class="h2" style="font-size:30px">${E(copy(ctx, 'contact.email', 'brand@example.com'))}</span>`) + at(L, y + 84, 520, 44, `<div class="b">${E(copy(ctx, 'page.contact.body', 'Write to the owner with the file and where it will run.'))}</div>`));
  const ys = 790;
  const sign = lab(L, ys, 300, 'Received by') + hr(L, ys + 56, 420, 'var(--ink)', 2) + at(L, ys + 68, 420, 18, '<span class="m q">Signature, then the time</span>');
  return page(ctx, 'contact', g, head + big + ask + sign + at(L, 952, CW, 18, `<span class="m">${E(ver)}</span>`));
}

export const a4 = {
  cover,
  contents,
  'open-brand': (ctx) => opener(ctx, 'open-brand'),
  who,
  voice,
  words,
  'open-logo': (ctx) => opener(ctx, 'open-logo'),
  mark,
  versions,
  space,
  misuse,
  'open-colour': (ctx) => opener(ctx, 'open-colour'),
  palette,
  tints,
  pairs,
  values,
  'open-type': (ctx) => opener(ctx, 'open-type'),
  faces,
  scale,
  hierarchy,
  'type-rules': typeRules,
  'open-layout': (ctx) => opener(ctx, 'open-layout'),
  grid,
  compositions,
  'open-use': (ctx) => opener(ctx, 'open-use'),
  digital,
  print: printPage,
  social,
  'open-close': (ctx) => opener(ctx, 'open-close'),
  summary,
  contact,
};
