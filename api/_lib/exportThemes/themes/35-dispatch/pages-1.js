// Theme 35, Dispatch: pages 1 to 7 (cover, contents, the Brand opener, who we are, voice, words, the Logo opener).
// Kerbside's words come from showcase.js through copy(); a fallback here is neutral. A slot is set at its real size as ghost type with one mono note.
import { SECTIONS, fullFolio, timeOf, pad, groundsOf, tones, onTone, markTone, mix, at, hr, vr, fill, svgAt, field, measure, word, ghost, ghostRule, isGhost, PHOTO_NOTE, MARK, codeOf, consign, page, n1 } from './kit.js';
import { barcodeRects } from './barcode.js';
import { copy } from './showcase.js';
import { photo } from './photos.js';

const sec = (open) => SECTIONS.find((s) => s.open === open);
// the Signal ground and the Asphalt ground of this palette
const P = (ctx) => groundsOf(ctx).primary, A = (ctx) => groundsOf(ctx).ink;
const logoHtml = (ctx, id, opts) => { try { return ctx.logo.html(id, opts); } catch (e) { const { colourway, ...rest } = opts; return ctx.logo.html(id, rest); } };

// ---- the opener, family SC "sort label" ----
function opener(ctx, open) {
  const s = sec(open), n = fullFolio(open), G = groundsOf(ctx), M = measure(ctx), E = ctx.esc;
  const ground = s.n % 2 ? G.primary : G.ink, sq = s.n % 2 ? G.ink : G.primary;
  const t = tones(ctx, ground), tq = tones(ctx, sq);
  const cell = (i, label, value) => at(48 + i * 362.7 + (i ? 20 : 0), 68, 320, 56, `<div class="lb">${label}</div><div class="h2" style="margin-top:6px">${value}</div>`);
  const top = hr(48, 48, 1088) + hr(48, 144, 1088) + vr(48 + 362.7, 52, 92) + vr(48 + 725.4, 52, 92)
    + cell(0, 'Sort to', `Bay ${s.n}`) + cell(1, 'Section', `${s.n} of 7`) + cell(2, 'Due', timeOf(n));
  const size = M.fit(s.name, 1088, 232);
  const middle = word(M, 48, 480, E(s.name), size)
    + field(ctx, 1008, 168, 128, 128, sq, at(12, 10, 104, 16, '<span class="lb">Bay</span>') + at(12, 22, 104, 100, `<span class="d" style="font-size:96px;color:${s.n % 2 ? onTone(ctx, G.primary, sq) : onTone(ctx, G.ink, sq)}">${s.n}</span>`, { style: 'text-align:right' }));
  const rows = s.pages.map(([id, name], i) => {
    const y = 540 + i * 28, last = i === s.pages.length - 1;
    return at(48, y, 512, 28, `<span class="m q" style="position:absolute;left:0;top:6px">${pad(fullFolio(id))}</span><span style="position:absolute;left:48px;top:0;font:600 15px/28px var(--body)">${E(name)}</span><span class="m13" style="position:absolute;right:0;top:5px">${timeOf(fullFolio(id))}</span>`)
      + (last ? '' : hr(48, y + 27, 512, 'var(--hair)', 1));
  }).join('');
  const code = codeOf(ctx, open);
  const bottom = hr(48, 528, 1088) + hr(48, 668, 1088) + rows
    + svgAt(0, 0, 1280, 720, barcodeRects(code, 592, 540, 544, 96, { colour: t.ink })) + at(592, 644, 400, 16, `<span class="m">${E(code)}</span>`);
  return page(ctx, open, ground, top + middle + bottom);
}

// ---- 1 Cover ----
function cover(ctx) {
  const G = groundsOf(ctx), t = tones(ctx, G.primary), M = measure(ctx), E = ctx.esc, slot = ctx.edition === 'slot';
  const ver = String(ctx.versionLine || 'Version 1.0, November 2026');
  const cell = (x, label, val) => at(x, 62, 300, 36, `<div class="lb">${label}</div><div class="m13">${val}</div>`);
  const head = hr(48, 48, 1088) + cell(48, 'Consignment', E(consign(ctx))) + vr(352, 62, 34) + cell(368, 'Items', ctx.skeleton ? '7 pages' : '31 pages') + vr(672, 62, 34) + cell(688, 'Version', E(ver.replace(/^Version\s+/, '')));
  let mark;
  if (!slot) {
    const g = ctx.logo.geo, s = 1088 / g.width;
    mark = at(48, 280 - g.cap * s, 1088, g.height * s, logoHtml(ctx, 'colour', { width: 1088, colourway: 'on-signal' }));
  } else {
    const nm = (typeof ctx.real === 'function' ? ctx.real(ctx.brand.name) : String(ctx.brand.name || '')) || 'Your wordmark', size = M.fit(nm, 1088, 400);
    mark = word(M, 48, 280, E(nm), size) + at(48, 300, 600, 16, '<span class="nt">Your logo, SVG, replaces the name.</span>');
  }
  const size = Math.min(M.fit('10:00', 504, 280), M.fit('12:00', 504, 280));
  const a = copy(ctx, 'page.cover.a', ''), b = copy(ctx, 'page.cover.b', '');
  const left = at(48, 368, 520, 16, '<span class="lb">Start</span>') + (a ? at(48, 388, 520, 28, `<div class="h2">${E(a)}</div>`) : '') + word(M, 48, 568, '10:00', size);
  const right = field(ctx, 592, 352, 592, 248, G.ink,
    at(24, 16, 520, 16, '<span class="lb">Finish</span>') + (b ? at(24, 36, 520, 28, `<div class="h2">${E(b)}</div>`) : '') + word(M, 24, 216, '12:00', size, { style: `color:${onTone(ctx, G.primary, G.ink)}` }));
  const foot = hr(48, 600, 1136) + at(48, 622, 760, 32, `<span class="h2">${E(copy(ctx, 'page.cover.title', 'Brand guidelines.'))}</span><span class="m13" style="margin-left:24px">${E(ver)}</span>`, { style: 'display:flex;align-items:baseline' })
    + svgAt(0, 0, 1280, 720, barcodeRects(codeOf(ctx, 'cover'), 824, 614, 312, 40, { colour: t.ink }));
  return page(ctx, 'cover', G.primary, head + mark + left + right + foot);
}

// ---- 2 Contents ----
function contents(ctx) {
  const G = groundsOf(ctx), t = tones(ctx, G.ink), E = ctx.esc;
  const X = (min) => 48 + min * 9.07;
  const stops = SECTIONS.map((s) => { const n = fullFolio(s.open); return { s, n, last: n + s.pages.length, x: X((n - 1) * 4) }; });
  let ticks = '';
  for (let k = 0; k < 31; k++) ticks += `<rect x="${n1(X(k * 4) - 1)}" y="364" width="2" height="14" fill="${t.ink}"/>`;
  const route = svgAt(48, 0, 1088, 400, `<g transform="translate(-48 0)"><rect x="48" y="356" width="1088" height="8" fill="${G.primary}"/>${ticks}</g>`, 'draw');
  const marks = svgAt(0, 0, 1280, 720, stops.map((p, i) => `<path d="M${n1(p.x)} 360V${i % 2 ? 488 : (i === stops.length - 1 ? 168 : 232)}" stroke="${t.hair}" stroke-width="1"/><circle cx="${n1(p.x)}" cy="360" r="12" fill="${t.ink}"/><circle cx="${n1(p.x)}" cy="360" r="5" fill="${G.primary}"/>`).join(''));
  const names = stops.map((p, i) => {
    const up = i % 2 === 0, right = i === stops.length - 1, w = 150;
    const x = right ? p.x - 14 - w : p.x + 14, y = up ? (right ? 168 : 232) : 438;
    const rng = p.last - p.n ? `${p.n} to ${p.last}` : String(p.n);
    return at(x, y, w, 50, `<div class="h2">${E(p.s.name)}</div><div style="margin-top:2px;white-space:nowrap"><span class="m13">${timeOf(p.n)}</span><span class="cap q" style="margin-left:10px">${rng}</span></div>`, { style: right ? 'text-align:right' : '' });
  }).join('');
  const ends = at(48, 388, 120, 18, '<span class="m13 q">10:00</span>') + at(1016, 388, 120, 18, '<span class="m13 q">12:00</span>', { style: 'text-align:right' });
  const head = at(48, 96, 700, 48, '<h1 class="h1">Contents</h1>');
  const foot = hr(48, 668, 1088) + at(48, 632, 800, 22, '<span class="cap q">Each tick is a page. Each stop is a section. The route takes two hours.</span>');
  return page(ctx, 'contents', G.ink, head + route + marks + names + ends + foot);
}

// ---- 4 Who we are ----
function who(ctx) {
  const G = groundsOf(ctx), E = ctx.esc, slot = ctx.edition === 'slot';
  const desc = copy(ctx, 'description');
  const h1 = slot && isGhost(ctx, desc) ? ghostRule(ctx, 'What the brand is, in one sentence.', '15 to 25 words. Example: Bellbird Bakery bakes bread and pastries for Hobart homes and cafes.') : E(desc);
  const head = at(48, 96, 608, 232, `<h1 class="h1" style="display:-webkit-box;-webkit-line-clamp:5;-webkit-box-orient:vertical;overflow:hidden">${h1}</h1>`, { style: slot && isGhost(ctx, desc) ? '' : '' });
  const how = slot ? ghostRule(ctx, 'How it works, in one sentence.', '1 sentence. Example: You order by 4 pm and it is at your door before six.') : E(copy(ctx, 'how'));
  const prod = ghost(ctx, copy(ctx, 'product'), 'product');
  const aud = ghost(ctx, copy(ctx, 'audience'), 'audience');
  const items = [[copy(ctx, 'page.who.what', 'What it does'), prod], [copy(ctx, 'page.who.howl', 'How'), how], [copy(ctx, 'page.who.for', 'Who for'), aud]];
  let rows = hr(48, 352, 608) + hr(48, 640, 608);
  items.forEach(([l, v], i) => {
    const y = 356 + i * 96 - (i ? 0 : 0);
    rows += at(48, y + 16, 150, 16, `<span class="lb">${E(l)}</span>`) + at(200, y + 12, 456, 72, `<div class="b">${v}</div>`) + (i ? hr(48, 352 + i * 96, 608, 'var(--hair)', 1) : '');
  });
  let pic, cap;
  if (!slot) {
    pic = at(704, 0, 480, 720, photo(ctx, 'IMG-01', { w: 480, h: 720, fx: 0.5, fy: 0.5 }));
    cap = E(copy(ctx, 'page.who.caption', ''));
  } else {
    const hh = 864, ww = hh * MARK.w / MARK.h, c = markTone(ctx, G.primary);
    const mark = svgAt(24, -72, ww, hh, `<g fill="${c}" transform="scale(${n1(hh / MARK.h)})">${MARK.paths.map((d) => `<path d="${d}"/>`).join('')}</g>`);
    pic = field(ctx, 704, 0, 480, 720, G.primary, mark + at(24, 24, 432, 40, `<span class="nt">${E(PHOTO_NOTE)}</span>`));
    cap = ghostRule(ctx, 'A caption: what it shows, a time, a place.', 'One line. Example: Sourdough, 800 g. 12 Elm Street, Sandy Bay.');
  }
  const label = `<div class="a" style="left:720px;bottom:24px;width:448px;background:${G.surface};border:4px solid ${G.ink};padding:10px 14px;color:${G.ink}"><div class="cap" style="color:${G.ink}">${cap}</div></div>`;
  return page(ctx, 'who', G.panel, head + rows + pic + label);
}

// ---- 5 Voice ----
function voice(ctx) {
  const G = groundsOf(ctx), E = ctx.esc, slot = ctx.edition === 'slot';
  let msg;
  if (!slot) {
    msg = E(copy(ctx, 'page.voice.message', ''));
    for (let k = 0; k < 3; k++) {
      const sp = E(copy(ctx, `page.voice.span.${k}`, ''));
      if (sp) msg = msg.replace(sp, `<span class="dn" style="margin-right:10px;position:relative;top:7px">${k + 1}</span><span class="u">${sp}</span>`);
    }
  } else msg = ghostRule(ctx, 'A real message your brand sends, with a time and a place.', 'About 12 words. Example: Out of the oven at 4:10. At 12 Elm Street by 6.');
  const body = at(48, 96, 992, 300, `<p class="big" style="font-size:58px;line-height:68px;text-wrap:pretty">${msg}</p>`);
  const sg = (v, path, text) => (v == null ? ghostRule(ctx, text, '') : ghost(ctx, v, path, text, { what: false }));
  let notes = '';
  for (let i = 0; i < 3; i++) {
    const x = 48 + i * 384, pers = (ctx.brand.personality || [])[i] || {};
    const q = slot ? sg(pers.trait, `personality.${i}.trait`, 'A quality') : E(copy(ctx, `page.voice.q.${i}`, ''));
    const txt = slot ? sg(pers.means, `personality.${i}.means`, 'How it shows up, in one sentence.') : E(copy(ctx, `page.voice.note.${i}`, ''));
    notes += hr(x, 456, 320) + at(x, 476, 24, 24, `<span class="dn">${i + 1}</span>`) + at(x + 36, 474, 284, 30, `<div class="h2">${q}</div>`) + at(x, slot ? 548 : 520, 320, 100, `<div class="b">${txt}</div>`);
  }
  return page(ctx, 'voice', G.panel, body + notes);
}

// ---- 6 Words ----
function words(ctx) {
  const G = groundsOf(ctx), E = ctx.esc;
  const boiler = ghost(ctx, copy(ctx, 'voice.boilerplate25'), 'voice.boilerplate25', 'The brand in about 25 words.');
  const head = at(48, 96, 912, 200, `<p class="big" style="font-size:34px;line-height:42px">${boiler}</p>`) + hr(48, 320, 1088);
  const col = (x, label, key, strike) => {
    let out = at(x, 336, 400, 16, `<span class="lb">${label}</span>`) + hr(x, 356, 528, strike ? 'var(--hair)' : 'var(--ink)', strike ? 1 : 4);
    for (let i = 0; i < 3; i++) {
      const y = 360 + i * 96, v = copy(ctx, `voice.writeThis.${i}.${key}`);
      out += at(x, y + 30, 36, 16, `<span class="m q">${pad(i + 1)}</span>`) + at(x + 44, y + 22, 484, 70, `<div class="h2 ${strike ? 'rl' : ''}">${ghost(ctx, v, `voice.writeThis.${i}.${key}`)}</div>`) + (i < 2 ? hr(x, y + 96, 528, 'var(--hair)', 1) : '');
    }
    return out;
  };
  return page(ctx, 'words', G.surface, head + col(48, 'Send', 'write', false) + col(608, 'Return to sender', 'not', true));
}

export const guidelines = {
  cover,
  contents,
  'open-brand': (ctx) => opener(ctx, 'open-brand'),
  who,
  voice,
  words,
  'open-logo': (ctx) => opener(ctx, 'open-logo'),
  'open-colour': (ctx) => opener(ctx, 'open-colour'),
  'open-type': (ctx) => opener(ctx, 'open-type'),
  'open-layout': (ctx) => opener(ctx, 'open-layout'),
  'open-use': (ctx) => opener(ctx, 'open-use'),
  'open-close': (ctx) => opener(ctx, 'open-close'),
};
