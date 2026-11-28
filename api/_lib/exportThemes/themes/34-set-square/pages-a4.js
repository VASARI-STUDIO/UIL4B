// Theme 34, Set Square: the A4 portrait edition (794 x 1123) of all 31 pages. index.js wires each page here in front of its 16:9 twin: a portrait ctx gets this function.
// The sheet stays a drawing sheet: a 7 x 10 module grid of 96 px (x 61, y 60 to 1020), the tick ruler, the two-row title block at the foot (kit.js titleBlock), dimension
// lines that state what is really on the page, the datum (an opener stands its name on y 840) and the plumb line. Nothing is rotated except the axonometric on 30.
import { copy } from './showcase.js';
import { photo } from './photos.js';
import { hexToRgb, rampBase, ratio } from '../../engine/color.js';
import { logoFacts, typeLadder } from '../../engine/styleguide.js';
import {
  SECTIONS, refOf, sheetsOf, pad2, fullFolio, tones, groundsOf, geo, measure, own, standIn, realOf, at, hr, vr, fill, svgAt, dim, sheet, leaf, field, word, ghost, isGhost,
  mix, voidField, PHOTO_NOTE, PHONE_NOTE, ghostRule, n1, leader, varsOf, asArt, mockupsOn, dimBg,
} from './kit.js';
import { markAt as markAt2, shareSizes } from './pages-2.js';
import { markAt as markAt4, printArt, storyArt, siteArt, artBox, kindFor, heavy, tagLeader, summaryPlates, ruleOf, guidelines as p4 } from './pages-4.js';
import { guidelines as p1 } from './pages-1.js';
import { guidelines as p3, a4Page4 } from './pages-3.js';
import { warp, areaOnPage, flat } from './mockups.js';

const slotOn = (ctx) => ctx.edition === 'slot';
const X0 = 61, Y0 = 60, X1 = 733, Y1 = 1020, MOD = 96, GW = X1 - X0;
const cx = (c) => X0 + c * MOD, ry = (r) => Y0 + r * MOD;
const H1 = (txt, x = X0, y = 84, w = 520, size) => at(x, y, w, 52, `<h1 class="d h1" style="line-height:${size ? n1(size * 1.05) : 48}px;${size ? `font-size:${size}px;` : ''}white-space:normal">${txt}</h1>`);
const NOTE = (ctx, key, fb, x, y, w) => at(x, y, w, 80, `<div class="b">${ctx.esc(copy(ctx, key, fb))}</div>`);
// a value in a dimension gap sits on the ground, so a grid line under it cannot lower its contrast
const d = (ctx, g) => (dir, x, y, len, v, ext = 5) => dim(ctx, dir, x, y, len, v, { ground: g, ext }).replace(/class="m dm" style="/g, `class="m dm" style="background:${g};`).replace(/class="m dm">/g, `class="m dm" style="background:${g}">`);
// the 16:9 pages are drawn inside A4 pages (23 and 24): a context whose sheet is 1280 x 720
const wide = (ctx) => { ctx.photosUsed = ctx.photosUsed || new Set(); ctx.photoWarnings = ctx.photoWarnings || []; return Object.assign(Object.create(ctx), { size: { w: 1280, h: 720 } }); };
const asWide = (html, name) => asArt(html, name).replace('break-after:auto;', 'break-after:auto;width:1280px;height:720px;');
const hexName = (ctx, hex) => { const c = ctx.colours.find((x) => x.hex.toLowerCase() === hex.toLowerCase()); return c ? own(ctx, c.name) : ''; };
const coloursBy = (ctx) => { const seen = new Set(); return [...ctx.colours].filter((c) => c.role !== 'label').sort((a, b) => b.share - a.share).filter((c) => { const h = c.hex.toLowerCase(); if (seen.has(h)) return false; seen.add(h); return true; }); };
const ROLE = { action: 'Dimensions and the one accent', text: 'Text and dark grounds', panel: 'Paper', ground: 'Every page', highlight: 'Timber signage and datum' };

// ---- DO: the datum opener. The section name at 112 px stands on the datum at y 840 with its cap height dimensioned; the section number stands over it as a ghost numeral at 700 px;
// the plumb line hangs from the top edge to a bob above the datum; the sheets are listed below ----
function opener(ctx, id) {
  const R = refOf(ctx, id), s = R.sec, ground = leaf(ctx, s.n), t = tones(ctx, ground), M = measure(ctx), size = 112, base = 840, cap = Math.round(M.cap * size);
  const rows = sheetsOf(s).map((p, i) => {
    const y = 876 + i * 36;
    return hr(X0, y, GW, i ? 'var(--hair)' : 'var(--ink)') + at(X0, y + 10, 70, 16, `<span class="m i">${p.sheet}</span>`) + fill(X0 + 84, y + 8, p.title.length * 9 + 14, 20, ground) + at(X0 + 90, y + 8, 400, 20, `<span class="lb i" style="font-size:15px;line-height:20px">${ctx.esc(p.title)}</span>`)
      + at(X1 - 60, y + 10, 60, 16, `<span class="m" style="display:block;text-align:right">${pad2(p.folio)}</span>`);
  }).join('');
  const body = at(X0, 96, 400, 16, `<span class="m i">Section ${s.n}.0</span>`) + at(X0, 116, 400, 20, `<span class="lb" style="font-size:13px">${R.sheet} to ${s.ser}-${pad2(s.pages.length)}</span>`)
    + `<div data-contrast="demo">${word(M, 52, 746, String(s.n), 700, { style: `color:${mix(ground, t.ink, 0.17)};font-variant-numeric:tabular-nums` })}</div>`
    + word(M, X0, base, ctx.esc(s.name), size) + dim(ctx, 'v', 40, base - cap, cap, cap, { ground, ext: 6 })
    + fill(X0, base, GW, 2, 'var(--ink)') + at(X1 - 200, base + 8, 200, 16, '<span class="m i" style="text-align:right;display:block">FFL 0.00</span>')
    + svgAt(680, 0, 40, 800, `<path d="M20.5 0V780" stroke="var(--ink)" stroke-width="1" fill="none"/><path d="M17 780H23V787L20 796L17 787Z" fill="${t.dim}"/>`)
    + rows;
  return sheet(ctx, id, { ground, body });
}

// ---- 2 Contents (PL): the plan in three rows, one room per section, sized by page count ----
function planA4(ctx, g, X, Y, PW, PH, rowsDef) {
  const t = tones(ctx, g), M = measure(ctx), total = SECTIONS.reduce((a, s) => a + s.pages.length, 0), counts = rowsDef.map((r) => r.reduce((a, s) => a + s.pages.length, 0)), cnt = counts.reduce((a, b) => a + b, 0);
  let y = Y, rooms = '', walls = '', doors = '', gaps = '';
  rowsDef.forEach((row, ri) => {
    const h = PH * counts[ri] / cnt; let x = X;
    row.forEach((s, si) => {
      const w = PW * s.pages.length / counts[ri], R = 52;
      walls += `<rect x="${n1(x)}" y="${n1(y)}" width="${n1(w)}" height="${n1(h)}"/>`;
      if (ri === 0 && si === row.length - 1) { const dx = x + w - 28 - R; gaps += `<rect x="${n1(dx)}" y="${n1(y - 4)}" width="${R}" height="8"/>`; doors += `<path d="M${n1(dx + R)} ${n1(y)}V${n1(y + R)}M${n1(dx)} ${n1(y)}A${R} ${R} 0 0 0 ${n1(dx + R)} ${n1(y + R)}"/>`; }
      else if (ri === rowsDef.length - 1 && si === 0) { const dx = x + 28; gaps += `<rect x="${n1(dx)}" y="${n1(y + h - 4)}" width="${R}" height="8"/>`; doors += `<path d="M${n1(dx)} ${n1(y + h)}V${n1(y + h - R)}M${n1(dx + R)} ${n1(y + h)}A${R} ${R} 0 0 0 ${n1(dx)} ${n1(y + h - R)}"/>`; }
      else if (si === 1) { const dy = y + h - 30 - R; gaps += `<rect x="${n1(x - 4)}" y="${n1(dy)}" width="8" height="${R}"/>`; doors += `<path d="M${n1(x)} ${n1(dy + R)}H${n1(x + R)}M${n1(x)} ${n1(dy)}A${R} ${R} 0 0 1 ${n1(x + R)} ${n1(dy + R)}"/>`; }
      const pad = w < 230 ? 16 : 24, narrow = w < 230;
      const list = sheetsOf(s).map((p) => `<div style="display:flex;gap:8px;height:20px;align-items:center"><span class="m i" style="width:36px;flex:none">${p.sheet}</span><span class="m" style="flex:1;min-width:0;overflow:hidden">${ctx.esc(p.title)}</span>${narrow ? '' : `<span class="m">${pad2(p.folio)}</span>`}</div>`).join('');
      rooms += at(x + pad, y + 22, w - 2 * pad, 40, `<div style="display:flex;align-items:baseline;gap:10px"><span class="d h2" style="font-size:24px">${s.name}</span><span class="m">${pad2(fullFolio(s.open))}</span></div>`)
        + at(x + pad, y + 66, w - 2 * pad, s.pages.length * 20, list) + word(M, x + w - 20 - 100, y + h - 20, pad2(s.pages.length), 64, { w: 100, style: 'text-align:right;color:var(--quiet)' });
      x += w;
    });
    y += h;
  });
  return svgAt(0, 0, ctx.size.w, ctx.size.h, `<g fill="none" stroke="var(--ink)" stroke-width="6" stroke-linejoin="miter">${walls}</g><g fill="${g}" stroke="none">${gaps}</g><g fill="none" stroke="var(--ink)" stroke-width="1.25">${doors}</g>`) + rooms;
}

// the cover's set-out: cap line, x-height and baseline carried to the margins, verticals at the wordmark's edges and the plumb, and the width as a large dimension
function coverSetout(ctx, G, top, base, W) {
  const c = tones(ctx, G.surface).dim, tp = Math.round(top), xh = Math.round(base - 0.68 * (base - top)), px = Math.round(X0 + 0.163 * W), dy = tp - 44, gap = 110, mid = X0 + W / 2;
  const tick = (x, y) => `<path d="M${x - 4} ${y + 4}L${x + 4} ${y - 4}"/>`;
  return svgAt(0, 0, 794, 1123, `<g stroke="${c}" stroke-width="1" fill="none" opacity=".6"><path d="M40 ${tp + 0.5}H${X1 + 40}M${X0 + 0.5} ${dy}V${base}M${X1 + 0.5} ${dy}V${base}M${px + 0.5} ${dy}V${base}"/><path d="M40 ${xh + 0.5}H${X1 + 40}" stroke-dasharray="5 5"/></g>`
    + `<g stroke="${c}" stroke-width="1" fill="none"><path d="M${X0} ${dy}H${mid - gap / 2}M${mid + gap / 2} ${dy}H${X1}"/>${tick(X0, dy)}${tick(X1, dy)}</g>`)
    + at(mid - gap / 2, dy - 18, gap, 36, `<span class="m" style="display:block;text-align:center;font-size:28px;line-height:36px;color:${c}">${W}</span>`);
}

export const a4 = {
  // ---- 1 Cover (DS): the title at 96 px, the wordmark standing on a datum at the sheet's width, the drawing key as three Plaster-toned cells ----
  cover(ctx) {
    const G = groundsOf(ctx), M = measure(ctx), E = ctx.esc, slot = slotOn(ctx), W = GW, base = 600;
    let mark, top, bottom;
    if (!slot) {
      const g = ctx.logo.geo, h = W / g.aspect, frac = g.top ? g.top / (g.top + g.cap) : 0.55;
      top = base - frac * h; bottom = top + h; mark = at(X0, top, W, h, ctx.logo.html('colour', { width: W, colourway: 'colour' }));
    } else {
      const size = M.fit('Your wordmark', W, 400);
      top = base - M.cap * size; bottom = base + 0.4 * M.cap * size;
      mark = word(M, X0, base, 'Your wordmark', size, { style: 'color:var(--quiet)' }) + at(X0, base + 56, 500, 16, '<span class="m">Your logo, SVG.</span>');
    }
    const key = [['Ink', G.ink], ['Dimension', G.primary], ['Datum', G.accent]].map(([l, hex], i) => {
      const x = X0 + i * 228;
      return field(ctx, x, 780, 216, 240, hex, at(16, 16, 184, 20, `<span class="lb i" style="font-size:13px">${l}</span>`) + at(16, 200, 184, 16, `<span class="m i">${hex.toUpperCase()}</span>`) + at(16, 218 - 0, 184, 16, `<span class="m">${hexName(ctx, hex)}</span>`));
    }).join('');
    const body = at(X0, 80, 672, 200, `<h1 class="d" style="font-size:96px;line-height:92px;white-space:normal;letter-spacing:-.035em">${E(copy(ctx, 'page.cover.title', 'Brand guidelines.'))}</h1>`)
      + at(X0, 288, 520, 60, `<div class="d h2" style="font-weight:${ctx.weights.regular}">${ghost(ctx, copy(ctx, 'lines.primary'), 'lines.primary')}</div>`)
      + coverSetout(ctx, G, top, base, W) + mark + (slot ? '' : dim(ctx, 'v', 764, Math.round(top), Math.round(bottom - top), Math.round(bottom - top), { ground: G.surface, ext: 6 }))
      + fill(X0, base, GW, 2, 'var(--ink)') + at(X1 - 200, base + 8, 200, 16, '<span class="m i" style="text-align:right;display:block">FFL 0.00</span>')
      + at(X0, 724, 600, 16, '<span class="m i">Drawing key</span>') + at(X0, 746, 560, 40, '<div class="m w">Sheets A Brand, L Logo, C Colour, T Type, G Grid, U In use, Z Close.</div>') + key;
    return sheet(ctx, 'cover', { ground: G.surface, body });
  },

  contents(ctx) {
    const G = groundsOf(ctx), g = G.panel, rowsDef = [SECTIONS.slice(0, 2), SECTIONS.slice(2, 4), SECTIONS.slice(4)], PY = 176, PH = 760;
    const body = H1('Contents', X0, 76) + at(X0, 132, 640, 16, '<span class="m">Seven rooms. A room is as big as the pages it holds.</span>')
      + planA4(ctx, g, X0, PY, GW, PH, rowsDef) + dim(ctx, 'h', X0, PY + PH + 30, GW, GW, { ground: g, ext: 6 }) + dim(ctx, 'v', 764, PY, PH, PH, { ground: g, ext: 6 });
    return sheet(ctx, 'contents', { ground: g, body });
  },

  'open-brand': (ctx) => opener(ctx, 'open-brand'),
  'open-logo': (ctx) => opener(ctx, 'open-logo'),
  'open-colour': (ctx) => opener(ctx, 'open-colour'),
  'open-type': (ctx) => opener(ctx, 'open-type'),
  'open-layout': (ctx) => opener(ctx, 'open-layout'),
  'open-use': (ctx) => opener(ctx, 'open-use'),
  'open-close': (ctx) => opener(ctx, 'open-close'),

  // ---- 4 Who (PS): the 3:4 crop bleeds off the right edge, the description set large beside it, two columns under ----
  who(ctx) {
    const G = groundsOf(ctx), B = ctx.brand, PX = 322, PY = 60, PW = 794 - PX, PH = Math.round(PW * 4 / 3), LY = PY + PH + 44;
    const pic = ctx.edition === 'showcase' ? photo(ctx, 'midjob', { w: PW, h: PH, fx: 0.22, fy: 0.5 }) : voidField(ctx, 0, 0, PW, PH, G.ink, PHOTO_NOTE);
    const lab = (x, y, w, code, name) => hr(x, y, w, 'var(--ink)') + at(x, y + 10, w, 20, `<span class="m i">${code}</span><span class="lb" style="margin-left:12px">${name}</span>`);
    const col = (y, code, name, v, path, ph) => lab(X0, y, 232, code, name) + at(X0, y + 40, 232, 200, `<div class="b">${ghost(ctx, v, path, ph, { what: false, example: false })}</div>`);
    const body = at(PX, PY, PW, PH, pic, { style: 'overflow:hidden' }) + H1('Who we are', X0, 84, 240, 34)
      + col(170, 'A-01.2', 'What it does', B.product, 'product', 'What a customer does with it.') + col(380, 'A-01.3', 'Who it serves', B.audience, 'audience', 'Who it is for, and what they want.')
      + at(X0, PY + PH - 44, 232, 32, `<div class="m w">3:4 crop, ${PW} x ${PH} px</div>`)
      + lab(X0, LY, GW, 'A-01.1', 'Description')
      + at(X0, LY + 44, GW, 240, `<div class="d" style="font-size:44px;line-height:48px;white-space:normal;letter-spacing:-.025em">${ghost(ctx, B.description, 'description', 'What the brand is, in one sentence.', { what: false })}</div>`)
      + dim(ctx, 'h', PX, 44, PW, PW, { ground: G.surface, ext: 5 }) + dim(ctx, 'v', PX - 20, PY, PH, PH, { ground: G.surface, ext: 5 });
    return sheet(ctx, 'who', { ground: G.surface, body, gridOpts: { y0: LY - 12 } });
  },

  // ---- 5 Voice (SP): three stepped elevations down the page, each word at up to 150 px on its own tread; the rises are dimensioned ----
  voice(ctx) {
    const G = groundsOf(ctx), g = G.surface, M = measure(ctx), B = ctx.brand, list = (B.personality || []).slice(0, 3), BH = 296, BY = 112, PITCH = 300;
    const tint = (f) => { const q = tones(ctx, g).quiet; let k = f, b = mix(g, G.accent, k); while (k > 0.02 && ratio(q, b) < 4.8) { k -= 0.02; b = mix(g, G.accent, k); } return b; };
    const bg = [0.16, 0.26, 0.36].map(tint);
    const fits = list.map((p, i) => M.fit(isGhost(ctx, p.trait) ? 'A quality' : String(p.trait), X1 - (X0 + 56 * i) - 60, 150) * (isGhost(ctx, p.trait) ? 0.88 : 1)), common = Math.min(...fits);
    const bands = list.map((p, i) => {
      const y = BY + i * PITCH, x = X0 + i * 56, w = X1 - x, ghosted = isGhost(ctx, p.trait), size = Math.max(56, ghosted ? fits[i] : common), cap = Math.round(M.cap * size), base = y + 52 + cap;
      const trait = ghost(ctx, p.trait, `personality.${i}.trait`, 'A quality', { what: false });
      return fill(x, y, w, BH, bg[i]) + hr(x, y, w, 'var(--ink)', 2) + vr(x, y, BH, 'var(--ink)')
        + at(x + 20, y + 18, 200, 16, `<span class="m i">A-02.${i + 1}</span><span class="lb" style="margin-left:12px">Clause</span>`)
        + word(M, x + 20, base, trait, size, { w: w - 40 })
        + at(x + 20, base + (ghosted ? 70 : 40), Math.min(w - 40, 520), 90, `<div class="b" style="font-size:20px;line-height:27px">${ghost(ctx, p.means, `personality.${i}.means`, 'How it shows up, in one or two sentences.', { what: false, example: false })}</div>`);
    }).join('');
    const rises = [0, 1].map((i) => dim(ctx, 'v', 36, BY + i * PITCH, PITCH, PITCH, { ground: g, ext: 5 })).join('');
    return sheet(ctx, 'voice', { ground: g, body: bands + rises + at(X0, 72, 640, 16, '<span class="m">Voice. Three clauses, each stepped in from the one above.</span>') });
  },

  // ---- 6 Words (RM): the boilerplate issued at 40 px, then three pairs: the issued line over the superseded line struck with a redline ----
  words(ctx) {
    const G = groundsOf(ctx), V = ctx.brand.voice, rows = (V.writeThis || []).slice(0, 3);
    const tri = (x, y) => svgAt(x, y, 20, 18, `<path d="M10 1L19 17H1Z" fill="none" stroke="var(--dim)" stroke-width="1.25"/>`) + at(x, y + 5, 20, 14, '<span class="dm" style="display:block;text-align:center;font-size:10px;line-height:14px">1</span>');
    const boiler = at(X0, 84, GW, 300, `<div class="d" style="font-size:46px;line-height:50px;white-space:normal;letter-spacing:-.025em">${ghost(ctx, V.boilerplate25, 'voice.boilerplate25', 'The brand in about 25 words.', { what: false })}</div>`);
    const out = rows.map((r, i) => {
      const y = 456 + i * 188;
      return hr(X0, y, GW, 'var(--ink)') + at(X0, y + 12, 200, 16, `<span class="m i">A-03.${i + 1}</span><span class="m" style="margin-left:12px">Issued</span>`)
        + at(X0, y + 36, GW, 50, `<div class="d" style="font-size:26px;line-height:31px;white-space:normal;letter-spacing:-.01em">${ghost(ctx, r.write, `voice.writeThis.${i}.write`, 'A line the brand writes.', { what: false, example: i === 0 })}</div>`)
        + hr(X0, y + 98, GW) + tri(X0, y + 112) + at(X0 + 32, y + 114, 200, 16, '<span class="m">Superseded</span>')
        + at(X0, y + 136, GW, 50, `<div class="d rl" style="font-size:26px;line-height:31px;white-space:normal;letter-spacing:-.01em;color:var(--quiet)">${ghost(ctx, r.not, `voice.writeThis.${i}.not`, 'The weaker line it replaces.', { what: false, example: false })}</div>`);
    }).join('');
    return sheet(ctx, 'words', { ground: G.surface, body: boiler + out });
  },

  // ---- 8 The mark (SO): the mark at 600 wide with its construction lines, the width as a ghost numeral standing on the foot ----
  mark(ctx) {
    const G = groundsOf(ctx), g = G.panel, t = tones(ctx, g), M = measure(ctx), W = 600, X = 96, Y = 350;
    const m = markAt2(ctx, M, t, X, Y, W), h = Math.round(m.h);
    const lines = svgAt(0, 0, 794, 1123, `<g stroke="${t.dim}" stroke-width="1" fill="none"><path d="M${X + 0.5} ${Y - 40}V${Y + h + 40}M${X + W + 0.5} ${Y - 40}V${Y + h + 40}M${X - 40} ${Y + 0.5}H${X + W + 40}M${X - 40} ${Y + h + 0.5}H${X + W + 40}"/><path d="M${X - 40} ${Y + h * 0.55}H${X + W + 40}" stroke-dasharray="4 4"/></g>`);
    const body = H1('The mark', X0, 76) + NOTE(ctx, 'page.mark.text', 'A plumb line hangs from the l. It is the one line we never draw crooked.', X0, 134, 360)
      + `<div data-contrast="demo">${word(M, 700 - M.width('600', 330), 1000, '600', 330, { style: `color:${mix(g, t.ink, 0.12)}` })}</div>`
      + lines + m.html + dim(ctx, 'h', X, Y - 40, W, W, { ground: g, ext: 6 }) + dim(ctx, 'v', X + W + 40, Y, h, h, { ground: g, ext: 6 })
      + at(X, Y + h + 52, 460, 40, '<div class="m w">Width, height and the line through the x-height, drawn in Brick.</div>');
    return sheet(ctx, 'mark', { ground: g, body });
  },

  // ---- 9 Versions (CO): four full-bleed courses, tallest for the most-used version, the mark at a size that follows the course; the page is 1123 tall, so the heights add up to it ----
  versions(ctx) {
    const M = measure(ctx), F = logoFacts(ctx), E = ctx.esc, seen = new Set(), picks = [];
    for (const g of F.grounds) { const h = g.groundHex.toLowerCase(); if (!seen.has(h)) { seen.add(h); picks.push(g); } }
    const hs = [449, 299, 225, 150], four = picks.slice(0, 4), ar = slotOn(ctx) ? 4 : ctx.logo.geo.aspect;
    let y = 0;
    const bands = four.map((g, i) => {
      const t = tones(ctx, g.groundHex), h = hs[i], by = y; y += h;
      const w = Math.round(Math.min(480, h * 1.2)), mh = w / ar;
      const m = markAt2(ctx, M, t, X0, (h - mh) / 2 + 6, w, ctx.logo && ctx.logo.geos && ctx.logo.geos[g.key] ? g.key : 'colour', t.ink);
      const when = ctx.brand.logo.when && ctx.brand.logo.when[g.key];
      return field(ctx, 0, by, 794, h + 0.5, g.groundHex, m.html
        + at(580, 20, 153, 16, `<span class="m i">L-02.${i + 1}</span>`) + at(580, 40, 153, 16, `<span class="lb i" style="font-size:13px">${E(g.label)}</span>`)
        + at(580, 60, 153, h - 70, `<div class="m w">${g.groundHex.toUpperCase()}${when ? `<br>${when}` : ''}</div>`));
    }).join('');
    const t0 = tones(ctx, four[0].groundHex), t3 = tones(ctx, four[3].groundHex);
    return `<section class="pg ss" data-page="versions" style="${varsOf(t0)}">${bands}${at(X0, 1123 - 30, 500, 16, `<span class="m" style="color:${t3.quiet}">Course heights ${hs.join(', ')} px: by how often the version is used.</span>`)}</section>`;
  },

  // ---- 10 Space and size (DC): the mark at its smallest, led to a detail circle at 1:5 ----
  space(ctx) {
    const G = groundsOf(ctx), g = G.surface, t = tones(ctx, g), tp = tones(ctx, G.panel), M = measure(ctx), F = logoFacts(ctx);
    const min = F.min.screenPx || 96, cxx = 397, cyy = 700, R = 300, ar = slotOn(ctx) ? 4 : ctx.logo.geo.aspect, lw = 400, lh = lw / ar, u = Math.round(lh * 0.5);
    const lx = cxx - lw / 2, ly = cyy - lh / 2, sy = 330;
    const small = markAt2(ctx, M, t, X0, sy, min);
    const clear = svgAt(0, 0, 794, 1123, `<defs><clipPath id="dc"><circle cx="${cxx}" cy="${cyy}" r="${R}"/></clipPath></defs><circle cx="${cxx}" cy="${cyy}" r="${R}" fill="${G.panel}" stroke="var(--ink)" stroke-width="2"/>`
      + `<g clip-path="url(#dc)" stroke="${t.dim}" stroke-width="1" fill="none" stroke-dasharray="4 4"><path d="M${lx - u} ${ly - u}H${lx + lw + u}V${ly + lh + u}H${lx - u}Z"/></g>`
      + `<path d="M${lx + 0.5} ${ly - u}V${ly + lh + u}M${lx + lw + 0.5} ${ly - u}V${ly + lh + u}M${lx - u} ${ly + 0.5}H${lx + lw + u}M${lx - u} ${ly + lh + 0.5}H${lx + lw + u}" stroke="var(--hair)" stroke-width="1" fill="none"/>`
      + `<path d="M${X0 + min} ${sy + 24}L${cxx - R * 0.72} ${cyy - R * 0.69}" stroke="var(--quiet)" stroke-width="1" fill="none"/>`);
    const m = markAt2(ctx, M, tp, lx, ly, lw);
    const sqs = [[lx - u, ly - u], [lx + lw, ly + lh]].map(([x, y]) => fill(x, y, u, u, 'none', `border:1px solid ${t.dim}`)).join('');
    const body = H1('Space and size', X0, 76) + NOTE(ctx, 'page.space.text', 'Smallest: 24 mm wide in print, 96 px on screen. Clear space: one bob height, b, on every side.', X0, 134, 300)
      + `<div data-contrast="demo">${word(M, 733 - M.width('24', 300), 330, '24', 300, { style: `color:${mix(g, t.ink, 0.12)}` })}</div>`
      + small.html + dim(ctx, 'h', X0, sy - 16, min, min, { ground: g, ext: 4 }) + at(X0, sy + 62, 320, 16, `<span class="m i">Minimum ${min} px</span>`)
      + clear + m.html + sqs
      + at(lx - u, ly + lh + u + 12, 300, 16, `<span class="m" style="color:${tp.quiet}">b = ${F.unitText || u + ' px'}, shown at 1:5</span>`);
    return sheet(ctx, 'space', { ground: g, body });
  },

  // ---- 11 Misuse (DL): a defects list, six rows of 146 ----
  misuse(ctx) {
    const G = groundsOf(ctx), g = G.panel, t = tones(ctx, g), M = measure(ctx), L = ctx.logo;
    const rows = [['Plumb line removed.', ''], ['Line at an angle.', 'transform:rotate(-8deg)'], ['Mark stretched.', 'transform:scaleX(1.6)'], ['Wrong ground.', ''], ['Outline added.', ''], ['Mark in a box.', '']];
    const out = rows.map(([label, st], i) => {
      const y = 140 + i * 146, thumbBg = i === 3 ? G.accent : g, tt = tones(ctx, thumbBg), w = 120, TW = 240, TH = 128;
      const ar = slotOn(ctx) ? 4 : L.geo.aspect, h = w / ar, ink = i === 3 ? G.primary : tt.ink;
      const logo = slotOn(ctx) ? word(M, 28, 64 + M.cap * 11, 'Your wordmark', 22, { style: 'color:var(--quiet)' }) : at((TW - w) / 2, TH / 2 - h / 2, w, h, L.html('colour', { width: w, color: ink }), { style: `color:${ink};${st};transform-origin:center` });
      const extra = i === 4 ? at(TW / 2 - w / 2 - 12, TH / 2 - h / 2 - 12, w + 24, h + 24, '', { style: `border:1px solid ${tt.ink}` }) : i === 5 ? at(10, 10, TW - 20, TH - 20, '', { style: `border:2px solid ${tt.ink}` }) : '';
      return hr(X0, y, GW, 'var(--ink)') + field(ctx, X0, y + 8, TW, TH, thumbBg, `${extra}${logo}`, `box-shadow:inset 0 0 0 1px ${t.hair};overflow:hidden`)
        + at(X0 + 272, y + 20, 200, 16, `<span class="m i">D-0${i + 1}</span>`) + at(X0 + 272, y + 44, 400, 64, `<span class="d h2" style="font-size:24px">${ctx.esc(copy(ctx, `page.misuse.${i}`, label))}</span>`)
        + at(X0 + 272, y + 106, 400, 16, '<span class="m">Defect, not to be built</span>')
        + at(X1 - 120, y + 20, 120, 24, `<span class="d" style="display:block;text-align:right;font-size:15px;line-height:24px;letter-spacing:0;color:${t.dim}">Rejected</span>`);
    }).join('');
    return sheet(ctx, 'misuse', { ground: g, body: H1('Misuse', X0, 64) + at(X0 + 272, 82, 400, 16, '<span class="m">Six ways the mark is never drawn.</span>') + out + hr(X0, 140 + 6 * 146, GW, 'var(--ink)'), gridOpts: { y0: 128 } });
  },

  // ---- 13 Palette (WS): the wall section laid across the page: full-width bands sized by share of use, chain-dimensioned at the right, names and values set large ----
  palette(ctx) {
    const G = groundsOf(ctx), g = G.panel, t = tones(ctx, g), M = measure(ctx), cs = coloursBy(ctx), n = cs.length, Y = 136, H = Y1 - Y, tot = cs.reduce((a, c) => a + c.share, 0);
    const hs = shareSizes(cs.map((c) => c.share / tot), H, Math.min(112, Math.floor((H * 0.6) / n)));
    let y = Y;
    const bands = cs.map((c, i) => {
      const ct = tones(ctx, c.hex), h = hs[i], by = y; y += h;
      const rgb = hexToRgb(c.hex).join(' '), cm = Array.isArray(c.cmyk) && c.cmyk.length === 4 ? c.cmyk.join(' ') : '';
      const hatch = i % 2 ? `<svg class="a" style="left:0;top:0;overflow:hidden" width="${GW}" height="${n1(h)}" aria-hidden="true"><path d="${Array.from({ length: Math.ceil((GW + h) / 16) }, (_, k) => `M${k * 16} 0L${k * 16 - h} ${n1(h)}`).join('')}" stroke="${mix(c.hex, ct.ink, 0.12)}" stroke-width="1" fill="none"/></svg>` : '';
      const low = ratio(ct.ink, c.hex) < 5.4, tab = low ? `background:${g};color:${t.ink};padding:0 6px;` : '';
      const size = Math.max(22, Math.min(M.fit(own(ctx, c.name), 330, 72), h - 76)), role = own(ctx, c.roleText) || ROLE[c.role] || '';
      const line = (px, lh, txt, ink) => `<div class="m ${ink ? 'i' : ''}" style="font-size:${px}px;line-height:${lh}px;text-align:right;${low ? '' : `color:${ink ? ct.ink : ct.quiet}`}"><span style="${tab}display:inline-block">${txt}</span></div>`;
      const inner = hatch + at(20, 14, 300, 16, `<span class="m i" style="${tab}display:inline-block">C-0${i + 1}  ${Math.round((c.share / tot) * 100)}%</span>`)
        + word(M, 20, 40 + M.cap * size, own(ctx, c.name), size, { style: `color:${ct.ink}` })
        + (h >= 150 ? at(20, h - 36, 300, 16, `<span class="m" style="${tab}${low ? '' : `color:${ct.quiet}`}display:inline-block">${role}</span>`) : '')
        + at(GW - 20 - 260, 14, 260, 90, line(26, 30, c.hex.toUpperCase(), true) + line(12, 18, `RGB ${rgb}`, false) + (cm ? line(12, 18, `CMYK ${cm}`, false) : ''));
      return field(ctx, X0, by, GW, h, c.hex, inner, `box-shadow:inset 0 0 0 .5px ${t.hair};overflow:hidden`) + dim(ctx, 'v', 764, by, h, h, { ground: g, ext: 6 });
    }).join('');
    return sheet(ctx, 'palette', { ground: g, body: bands + H1('Palette', X0, 60) + at(X0 + 230, 78, 440, 16, `<span class="m">${ctx.esc(copy(ctx, 'page.palette.caption', 'Plaster is the wall. Brick marks the measurements.'))}</span>`), gridOpts: { y0: 128 } });
  },

  // ---- 14 Tints (ST): a drawn schedule, a column of ten large chips to each colour, the base step ringed and called out by one Brick leader up the margin ----
  tints(ctx) {
    const G = groundsOf(ctx), g = G.panel, t = tones(ctx, g), M = measure(ctx), cs = coloursBy(ctx).slice(0, 6), n = cs.length;
    const steps = Object.keys(cs[0].ramp), SY = 176, sh = (Y1 - SY) / steps.length, PITCH = Math.floor((GW - 6) / n), CW = PITCH - 16;
    let call = '';
    const staffs = cs.map((c, i) => {
      const x = X0 + 3 + i * PITCH, base = String(rampBase(c.hex));
      const chip = (k, j) => {
        const hex = String(c.ramp[k]), ct = tones(ctx, hex), y = SY + j * sh, mine = k === base;
        return fill(x, y, CW, sh + 0.5, hex, `box-shadow:inset 0 0 0 .5px ${t.hair}`)
          + at(x + 10, y + 9, CW - 20, 16, `<span class="m" style="font-size:13px;color:${ct.ink}${mine ? ';text-decoration:underline' : ''}">${k}${mine ? ' BASE' : ''}</span>`)
          + at(x + 10, y + sh - 28, CW - 20, 16, `<span class="m" style="font-size:13px;color:${ct.ink}">${hex.toUpperCase()}</span>`);
      };
      const j = steps.indexOf(base), y = SY + j * sh, yc = y + sh / 2;
      const cells = steps.map((k, jj) => (jj === j ? '' : chip(k, jj))).join('');
      const ring = fill(x - 6, y - 6, CW + 12, sh + 12, g) + chip(base, j) + `<div class="a" style="left:${x - 6}px;top:${n1(y - 6)}px;width:${CW + 12}px;height:${n1(sh + 12)}px;border:2px solid var(--ink)"></div>`;
      if (i === n - 1) {
        const ex = x + CW + 6, gx = X1 - 2;
        call = svgAt(ex - 2, 118, gx - ex + 6, yc - 118 + 6, `<path d="M2 ${yc - 118 + 3}H${gx - ex + 2}V3" stroke="${t.dim}" stroke-width="1.5" fill="none"/><circle cx="2" cy="${yc - 118 + 3}" r="3" fill="${t.dim}"/>`)
          + at(X1 - 330, 62, 330, 56, `<div class="m" style="color:${t.dim};text-align:right">BASE STEP ${base}</div><div class="b" style="font-size:15px;line-height:20px;margin-top:2px;text-align:right">The colour itself. Lighter steps above it, darker below.</div>`);
      }
      return cells + ring + at(x, SY - 34, CW, 26, `<span class="d h2" style="font-size:${Math.max(12, Math.min(20, Math.round(M.fit(own(ctx, c.name), CW, 20))))}px;line-height:26px;white-space:nowrap">${own(ctx, c.name)}</span>`);
    }).join('');
    return sheet(ctx, 'tints', { ground: g, body: H1('Tints', X0, 64) + at(X0, 124, 360, 16, '<span class="m">Ten steps to a colour. The ringed chip is the colour itself.</span>') + staffs + call, gridOpts: { y0: 150 } });
  },

  // ---- 15 Pairs (SB): a sample board stood in two columns of four; failures hatched ----
  pairs(ctx) {
    const G = groundsOf(ctx), g = G.surface, t = tones(ctx, g);
    const used = ctx.pairs.map((p) => ({ fg: p.fgHex, bg: p.bgHex, r: p.ratioText, ok: true, use: own(ctx, p.use) }));
    const seen = new Set(), bad = [];
    for (const p of ctx.unusedPairs) { const k = [p.fgHex, p.bgHex].map((h) => h.toLowerCase()).sort().join('|'); if (p.fgHex.toLowerCase() === p.bgHex.toLowerCase() || seen.has(k)) continue; seen.add(k); bad.push({ fg: p.fgHex, bg: p.bgHex, r: p.ratioText, ok: false, use: 'Do not use' }); }
    const cards = [...used.slice(0, 6), ...bad].slice(0, 8);
    const paper = ratio(tones(ctx, G.panel).ink, G.panel) >= 7 && ratio(G.panel, '#000000') > ratio(G.panel, '#FFFFFF') ? G.panel : g;
    const out = cards.map((p, i) => {
      const w = 324, h = 208, x = X0 + (i % 2) * (w + 24), y = 124 + Math.floor(i / 2) * 224, ct = tones(ctx, p.bg), TH = 124;
      const hatch = p.ok ? '' : `<svg class="a" style="left:0;top:0;overflow:hidden" width="${w}" height="${TH}" aria-hidden="true"><path d="${Array.from({ length: 32 }, (_, k) => `M${k * 14} 0L${k * 14 - TH} ${TH}`).join('')}" stroke="${t.dim}" stroke-width="1" opacity=".5" fill="none"/></svg>`;
      const tile = field(ctx, 0, 0, w, TH, p.bg, `${hatch}${at(20, 14, 200, 72, `<span class="d" style="font-size:64px;line-height:64px;color:${p.fg};letter-spacing:-.03em">Aa</span>`)}${at(20, 94, w - 40, 16, `<span class="m" style="color:${p.fg}">${p.fg.toUpperCase()} on ${p.bg.toUpperCase()}</span>`)}`, 'overflow:hidden');
      const demo = p.ok ? tile : `<div data-contrast="demo">${tile}</div>`;
      const lab = at(20, 136, 100, 16, `<span class="m i">S-${String(i + 1).padStart(2, '0')}</span>`) + at(w - 140, 136, 120, 16, `<span class="m" style="display:block;text-align:right;color:${p.ok ? 'var(--ink)' : 'var(--dim)'}">${p.ok ? 'Pass' : 'Fail'} ${p.r}</span>`)
        + at(20, 160, w - 40, 40, `<div class="lb i" style="font-size:13px;line-height:18px;white-space:normal">${p.use}</div>`);
      return field(ctx, x, y, w, h, paper, demo + lab + svgAt(0, -4, w, 8, `<path d="M${w / 2 - 6} 4H${w / 2 + 6}" stroke="var(--ink)" stroke-width="2" fill="none"/>`), `box-shadow:0 0 0 1px ${t.hair};overflow:visible`);
    }).join('');
    return sheet(ctx, 'pairs', { ground: g, body: H1('Pairs', X0, 56, 200, 34) + at(X0 + 130, 66, 540, 16, '<span class="m i">Each pair pinned as it will be used. Hatched cards are rejected.</span>') + out, gridOpts: { y0: 108 } });
  },

  // ---- 16 Values (SC): a schedule led by a large swatch tab on every row, the HEX set big under the name, RGB and the ratios on the last line ----
  values(ctx) {
    const G = groundsOf(ctx), g = G.panel, t = tones(ctx, g), cs = coloursBy(ctx), M = measure(ctx), n = cs.length;
    const hasCmyk = cs.some((c) => Array.isArray(c.cmyk) && c.cmyk.length === 4), TY = 140, rh = Math.min(172, Math.floor(870 / n)), hs = Math.min(68, Math.round(rh * 0.4));
    const rows = cs.map((c, i) => {
      const y = TY + i * rh, ct = tones(ctx, c.hex), rgb = hexToRgb(c.hex).join(' '), th = rh - 10, tw = 190;
      const tag = `<svg class="a" style="left:0;top:0" width="${tw}" height="${th}" aria-hidden="true"><path d="M.5 .5H${tw - 36}L${tw - 0.5} ${th / 2}L${tw - 36} ${th - 0.5}H.5Z" fill="${c.hex}" stroke="${t.hair}" stroke-width="1"/></svg>`;
      const kv = (k, v) => `<span class="m" style="font-size:12px">${k} </span><span class="m i" style="font-size:12px;margin-right:16px">${v}</span>`;
      const lastLine = kv('RGB', rgb) + (hasCmyk && Array.isArray(c.cmyk) ? kv('CMYK', c.cmyk.join(' ')) : '') + kv('Plaster', `${(Math.round(ratio(c.hex, G.surface) * 10) / 10).toFixed(1)}:1`) + kv('White', `${(Math.round(ratio(c.hex, G.panel) * 10) / 10).toFixed(1)}:1`);
      return hr(X0, y, GW, i ? 'var(--hair)' : 'var(--ink)') + `<div class="a" style="left:${X0}px;top:${y + 5}px;width:${tw}px;height:${th}px">${tag}</div>`
        + at(X0 + 16, y + 5 + th / 2 - 10, 80, 20, `<span class="m" style="font-size:14px;line-height:20px;color:${ct.ink}">C-0${i + 1}</span>`)
        + at(X0 + 214, y + 14, 330, 32, `<span class="d h2" style="font-size:26px;line-height:32px">${own(ctx, c.name)}</span>`) + at(X0 + 214, y + 48, 440, 16, `<span class="m">${(own(ctx, c.roleText) || ROLE[c.role] || '')}</span>`)
        + word(M, X0 + 214, y + 76 + M.cap * hs, c.hex.toUpperCase(), hs, { style: 'font-variant-numeric:tabular-nums;letter-spacing:-.02em', track: -0.02 })
        + at(X0 + 214, y + rh - 34, GW - 214, 20, lastLine);
    }).join('');
    return sheet(ctx, 'values', { ground: g, body: H1(ctx.skeleton ? 'Tokens' : 'Values', X0, 64) + at(X0 + 230, 82, 440, 16, '<span class="m">Every value as written, HEX first.</span>') + rows + hr(X0, TY + n * rh, GW, 'var(--ink)'), gridOpts: { y0: 128 } });
  },

  // ---- 18 Typefaces (TG): the glyph tile setout on 7 columns, eight rows of 96 px from y 252; the two faces and the figures stand above it ----
  faces(ctx) {
    const G = groundsOf(ctx), g = G.surface, t = tones(ctx, g), E = ctx.esc, B = ctx.brand, S = 96, GY = 252, GX = X0;
    const set = [...'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz&?'];
    const cells = set.map((ch, i) => {
      const cx0 = GX + (i % 7) * S, cy0 = GY + Math.floor(i / 7) * S, plumb = ch === 'l';
      const glyph = at(cx0, cy0, S, S, ch === '&' ? '&amp;' : ch, { cls: 'd', style: `font-size:64px;line-height:${S}px;text-align:center;letter-spacing:0;${plumb ? `color:${t.dim};` : ''}` });
      const line = plumb ? svgAt(cx0, cy0, S, S, `<path d="M${S / 2} 0V${S - 6}" stroke="${t.dim}" stroke-width="1" fill="none"/><circle cx="${S / 2}" cy="${S - 4}" r="2.5" fill="${t.dim}"/>`) : '';
      return line + glyph;
    }).join('');
    const weightsOf = (role) => [...new Set(ctx.faces.filter((f) => f.role === role && f.style !== 'italic').map((f) => f.weight))].sort((a, b) => a - b).slice(0, 5);
    const roles = [['display', 'Display', 70], ['body', 'Body', 156]].map(([role, label, y]) => {
      const fam = B.fonts[role].family;
      return hr(397, y, 336, 'var(--ink)') + at(397, y + 8, 200, 16, `<span class="m i">${label}</span>`)
        + at(397, y + 28, 336, 32, `<span class="d h2" style="font-size:24px;${role === 'body' ? `font-family:var(--body);font-weight:${ctx.weights.regular};letter-spacing:0` : ''}">${E(fam)}</span>`)
        + at(397, y + 62, 336, 16, `<span class="m">Weights ${weightsOf(role).join(' ')}</span>`);
    }).join('');
    const digits = hr(X0, 188, 300, 'var(--ink)') + at(X0, 196, 300, 32, '<span style="font-family:var(--body);font-size:24px;line-height:32px;letter-spacing:.04em;white-space:nowrap;font-variant-numeric:tabular-nums">0123456789</span>')
      + at(X0, 230, 300, 16, '<span class="m">One glyph to a 96 px module.</span>');
    const body = H1('Typefaces', X0, 76, 320) + NOTE(ctx, 'page.faces.note', 'Two faces, set one glyph to a module. The l hangs its plumb line.', X0, 134, 300) + roles + digits + cells;
    return sheet(ctx, 'faces', { ground: g, body });
  },

  // ---- 19 Scale (SR): the stair runs down the page. Each tread is a type step standing at its real size, the treads step to the right as the size falls, line heights dimensioned ----
  scale(ctx) {
    const G = groundsOf(ctx), g = G.panel, t = tones(ctx, g), E = ctx.esc, L = typeLadder(ctx), n = L.length;
    const wOf = (s) => (s.face === 'display' ? ctx.weights.heading : s.weight);
    const css = (s) => `font-family:var(--${s.face === 'display' ? 'display' : 'body'});font-weight:${wOf(s)};font-size:${s.size}px;line-height:${s.line}px;${s.face === 'display' && s.size > 40 ? 'letter-spacing:-0.02em;' : ''}white-space:nowrap;`;
    const top0 = 196, base = 1004, sumLh = L.reduce((a, s) => a + s.line, 0), gap = n > 1 ? (base - 40 - top0 - sumLh) / (n - 1) : 0, step = GW / n;
    const tr = []; let y = top0;
    L.forEach((s, i) => { y += s.line + (i ? gap : 0); tr.push(y); });
    const xs = L.map((_, i) => X0 + i * step);
    let run = '';
    for (let i = 0; i < n; i++) run += `H${n1(i === n - 1 ? X1 : xs[i + 1])}${i < n - 1 ? `V${n1(tr[i + 1])}` : ''}`;
    const stair = svgAt(0, 0, ctx.size.w, ctx.size.h, `<path d="M${X0} ${base}V${n1(tr[0])}${run}V${base}Z" fill="${t.wash}" stroke="none"/><path d="M${X0} ${n1(tr[0])}${run}" stroke="var(--ink)" stroke-width="2" fill="none"/>`
      + tr.map((v, i) => (i ? `<path d="M${X0} ${n1(v) + 0.5}H${n1(xs[i])}" stroke="var(--hair)" stroke-width="1" stroke-dasharray="4 4" fill="none"/>` : '')).join(''));
    const phrase = copy(ctx, 'page.scale.tread', 'Aa');
    const rows = L.map((s, i) => {
      const x = xs[i], avail = X1 - 24 - (x + 12), est = s.size * 0.52 * phrase.length, txt = !slotOn(ctx) && est <= avail ? E(phrase) : 'Aa';
      const sample = at(x + 12, tr[i] - s.line - 4, avail, s.line, txt, { style: css(s) });
      const dm = s.line >= 36 ? dim(ctx, 'v', X1, tr[i] - s.line - 4, s.line, s.line, { ground: g, ext: 3 }) : '';
      const label = at(X0 + 12, tr[i] + 8, 150, 32, `<span class="m i" style="display:block">${E(s.name)}</span><span class="m" style="display:block">${s.size} / ${s.line} px  ${wOf(s)}</span>`);
      return sample + dm + label;
    }).join('');
    const body = stair + rows + H1('Scale', X0, 76, 300) + NOTE(ctx, 'page.scale.note', 'Each step stands at its real size. The dimension beside it is its line height.', X0, 134, 330)
      + hr(X0, base, GW, 'var(--ink)', 2) + at(X1 - 116, base + 6, 116, 16, '<span class="m" style="display:block;text-align:right">FFL 0.00</span>');
    return sheet(ctx, 'scale', { ground: g, body, gridOpts: { y1: base } });
  },

  // ---- 20 In use (HB): a portrait crop of the hoarding photograph (794 x 520, the whole board in frame), the headline warped onto it; under it the board drawn flat at 1:1.8
  // with its real measurements (2 mm to the art px) ----
  hierarchy(ctx) {
    const G = groundsOf(ctx), g = G.surface, E = ctx.esc, slot = slotOn(ctx), ht = tones(ctx, g), FW = 794, FH = 520;
    const frame = { left: 0, top: 0, w: FW, h: FH, fx: 0.5, fy: 0.5, zoom: 1 }, aw = 1200, ah = 540, on = mockupsOn(ctx) && !slot;
    const head = slot ? 'Your headline, up to 8 words.' : copy(ctx, 'page.hoarding.headline', 'Your headline'), line = slot ? '' : copy(ctx, 'page.hoarding.line', '');
    const art = `<div style="position:absolute;left:0;top:0;width:${aw}px;height:${ah}px;background:${g};color:${slot ? ht.quiet : ht.ink}">`
      + `<div style="position:absolute;left:72px;top:64px;width:900px;font-family:var(--display);font-weight:${ctx.weights.heading};font-size:116px;line-height:1.02;letter-spacing:-.035em;white-space:normal">${E(head)}</div>`
      + `<div style="position:absolute;left:72px;top:388px;width:160px;height:8px;background:${slot ? ht.dim : G.primary}"></div>`
      + (line ? `<div style="position:absolute;left:72px;top:424px;width:1000px;font-family:var(--body);font-size:34px;line-height:44px">${E(line)}</div>` : '') + '</div>';
    let top;
    if (on) top = at(0, 0, FW, FH, photo(ctx, 'hoarding', { w: FW, h: FH, fx: 0.5, fy: 0.5 }), { style: 'overflow:hidden' }) + warp(ctx, 'IMG-05', 'board', frame, { html: art, w: aw, h: ah });
    else {
      const q = areaOnPage(ctx, 'IMG-05', 'board', frame).quad, xs = q.map((p) => p[0]), ys = q.map((p) => p[1]), bx = Math.min(...xs), by = Math.min(...ys);
      top = voidField(ctx, 0, 0, FW, FH, G.ink, PHOTO_NOTE) + field(ctx, bx, by, Math.max(...xs) - bx, Math.max(...ys) - by, g, `<div class="d" style="position:absolute;left:20px;top:16px;right:20px;font-size:32px;line-height:1.05;white-space:normal;color:${ht.quiet}">Your headline, up to 8 words.</div>`);
    }
    const tab = field(ctx, X0, 0, 330, 28, g, '<span class="m i" style="position:absolute;left:12px;top:6px">T-03  Type on a hoarding, board 2400 mm wide</span>');
    const k = GW / aw, fy = 604, f = flat({ html: art, w: aw, h: ah }, X0, fy, GW, `box-shadow:0 0 0 1px ${ht.ink}`);
    const cell = (i, a, b) => hr(X0 + i * 168, 930, 156, 'var(--ink)') + at(X0 + i * 168, 938, 156, 16, `<span class="m">${a}</span>`) + at(X0 + i * 168, 956, 156, 18, `<span class="m i">${b}</span>`);
    const flatPart = at(X0, 548, 500, 18, '<span class="m i">T-03.1</span><span class="lb" style="margin-left:12px">The board, flat</span>') + f.html
      + dim(ctx, 'h', X0, fy - 16, GW, '2400 mm', { ground: g, ext: 4 }) + dim(ctx, 'v', X1 + 22, fy, Math.round(ah * k), '1080 mm', { ground: g, ext: 4 })
      + cell(0, 'Headline', `232 mm, weight ${ctx.weights.heading}`) + cell(1, 'Margin', '144 mm') + cell(2, 'Brick rule', '320 x 16 mm') + cell(3, 'Line', '68 mm');
    return sheet(ctx, 'hierarchy', { ground: g, body: top + tab + flatPart, gridOpts: { y0: 540 } });
  },

  // ---- 21 Type rules (IS): three rules stacked; under each, the pass and the fail crop side by side (324 x 170), the failure marked in Brick and stamped ----
  'type-rules'(ctx) {
    const G = groundsOf(ctx), g = G.surface, t = tones(ctx, g), E = ctx.esc, B = ctx.brand, rules = (B.type.rules || []).slice(0, 3), slot = slotOn(ctx);
    const head = slot ? 'Your headline' : E(copy(ctx, 'type.sample.headline', 'Your headline'));
    const W = 324, H = 170, leafOf = [G.ink, G.primary, G.accent];
    const frames = [{ fx: 0.5, fy: 0.5, zoom: 1 }, { fx: 0.5, fy: 0.5, zoom: 1 }, { fx: 0.2, fy: 0.3, zoom: 1.4 }];
    const line = (x, y, w, h, extra = '') => `<div class="a" style="left:${x}px;top:${y}px;width:${w}px;height:${h}px;${extra}"></div>`;
    const hatch = (id, x, y, w, h, c) => svgAt(x, y, w, h, `<defs><pattern id="${id}" width="8" height="8" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><path d="M0 0V8" stroke="${c}" stroke-width="1.5"/></pattern></defs><rect width="${w}" height="${h}" fill="url(#${id})" opacity=".8"/>`);
    const text = (x, y, size, w, col, s = head) => at(x, y, w, size * 3, s, { cls: 'd', style: `font-size:${size}px;line-height:1;color:${col};white-space:normal;letter-spacing:-.025em` });
    const crop = (i, ok, x, y) => {
      const ink = slot ? tones(ctx, leafOf[i]).ink : G.ink, red = slot ? ink : t.dim, id = `ssh${i}${ok ? 'p' : 'f'}`;
      const pic = slot ? voidField(ctx, 0, 0, W, H, leafOf[i], 'Your photograph.', i === 0 ? { noteY: ok ? 100 : 36 } : {}) : photo(ctx, 'finished', { w: W, h: H, ...frames[i] });
      let art = '', marks = '';
      if (i === 0) art = (ok ? '' : hatch(id, 0, 136, W, 34, red)) + line(0, 136, W, 0, `border-top:1px dashed ${red}`) + text(20, ok ? 18 : 84, 28, 260, ink);
      else if (i === 1) {
        const hy = ok ? 20 : 66, hx = ok ? 20 : 56;
        art = (ok ? line(20, 0, 0, 20, `border-left:1px solid ${red}`) : '') + text(hx, hy, 28, 260, ink);
        marks = dim(ctx, 'v', x + 12, y, hy, hy, { ground: g, ext: 4 });
      } else {
        art = ok ? text(28, 18, 28, 270, ink) : text(28, 14, 36, 280, ink) + text(28, 112, 16, 280, ink);
        marks = ok ? dim(ctx, 'v', x + 12, y + 18, 28, 28, { ground: g, ext: 4 }) + dim(ctx, 'v', x + 12, y + 46, 28, 28, { ground: g, ext: 4 })
          : dim(ctx, 'v', x + 12, y + 14, 36, 36, { ground: g, ext: 4 }) + dim(ctx, 'v', x + 12, y + 50, 36, 36, { ground: g, ext: 4 }) + dim(ctx, 'v', x + 12, y + 112, 16, 16, { ground: g, ext: 4 });
      }
      const tab = at(W - 72, 0, 72, 26, `<span class="m" style="display:block;line-height:26px;text-align:center;font-weight:700;letter-spacing:.08em;color:${ok ? tones(ctx, G.ink).ink : tones(ctx, G.primary).ink}">${ok ? 'PASS' : 'FAIL'}</span>`, { style: `background:${ok ? G.ink : G.primary}` });
      const frame = ok ? `0 0 0 1px ${t.ink}` : `0 0 0 3px ${t.dim}`;
      return at(x, y, W, H, `${pic}${art}${tab}`, { style: `overflow:hidden;isolation:isolate;box-shadow:${frame}` }) + marks.replace(/class="m dm" style="/g, `class="m dm" style="background:${g};`).replace(/class="m dm">/g, `class="m dm" style="background:${g}">`);
    };
    const RH = 282, Y = 150;
    const rows = [0, 1, 2].map((i) => {
      const y0 = Y + i * RH, r = rules[i];
      return hr(X0, y0, GW, 'var(--ink)') + at(X0, y0 + 12, 80, 16, `<span class="m i">T-04.${i + 1}</span>`)
        + at(X0 + 80, y0 + 10, GW - 80, 60, `<div class="d h2" style="font-size:24px;line-height:1.2">${r ? E(r.do) : ''}</div>`)
        + crop(i, true, X0, y0 + 92) + crop(i, false, X0 + W + 24, y0 + 92);
    }).join('');
    return sheet(ctx, 'type-rules', { ground: g, body: H1('Type rules', X0, 76, 400) + rows, gridOpts: { y0: 140 } });
  },

  // ---- 23 Grid (FG): the A4 page's own grid is the dominant drawing (54 percent, 12 columns over a ghosted page 4); the slide's 12 x 6 module grid sits smaller below it, the two compared in one schedule ----
  grid(ctx) {
    const G = groundsOf(ctx), g = G.panel, paper = G.surface, t = tones(ctx, g), tp = tones(ctx, paper), M = ctx.gridMeasures, E = ctx.esc, slot = slotOn(ctx);
    const line = mix(paper, tp.ink, 0.34), tint = mix(paper, tp.dim, 0.09), op = slot ? 0.9 : 0.55;
    const sd = (dir, x, y, len, v) => dim(ctx, dir, x, y, len, v, { ground: g, ext: 5 });
    // the A4 page
    const PW2 = M.page.w, PH2 = M.page.h, k2 = 0.54, w2 = PW2 * k2, h2 = PH2 * k2, X2 = 110, Y2 = 160, m2 = M.margin, c2 = M.col, g2 = M.gutter;
    const a4p = at(X2, Y2, w2, h2, `<div style="width:${PW2}px;height:${PH2}px;transform:scale(${k2});transform-origin:0 0;opacity:${op}" data-contrast="demo">${a4Page4(ctx, tp)}</div>`, { style: `background:${paper};overflow:hidden` });
    let cs = `<path fill-rule="evenodd" fill="${tint}" d="M0 0H${n1(w2)}V${n1(h2)}H0ZM${n1(m2 * k2)} ${n1(m2 * k2)}V${n1((PH2 - m2) * k2)}H${n1((PW2 - m2) * k2)}V${n1(m2 * k2)}Z"/>`;
    for (let i = 0; i < M.columns; i++) cs += `<rect x="${n1((m2 + i * (c2 + g2)) * k2) + 0.5}" y="${n1(m2 * k2)}" width="${n1(c2 * k2)}" height="${n1((PH2 - 2 * m2) * k2)}" fill="${line}" fill-opacity=".22" stroke="${line}" stroke-width="1"/>`;
    const a4Over = svgAt(X2, Y2, w2, h2, cs) + at(X2, Y2, w2, h2, '', { style: `box-shadow:0 0 0 1px ${t.ink}` });
    const a4Dims = sd('h', X2, Y2 - 22, w2, PW2) + sd('v', X2 - 24, Y2, h2, PH2);
    const gapX = X2 + (m2 + c2 + g2 / 2) * k2, tip = Y2 + (PH2 - m2) * k2 - 6;
    const a4Leader = leader(ctx, gapX, tip, gapX, Y2 + h2 + 26, `Column ${n1(c2)}, gutter ${g2}`);
    const side = at(X2 + w2 + 36, Y2, 733 - (X2 + w2 + 36), 20, '<span class="m i">G-01.2</span>')
      + at(X2 + w2 + 36, Y2 + 24, 733 - (X2 + w2 + 36), 60, `<span class="lb" style="font-size:13px;line-height:18px;white-space:normal;display:block">A4 page, 12 columns, drawn at 54 percent</span>`)
      + at(X2 + w2 + 36, Y2 + 96, 733 - (X2 + w2 + 36), 200, `<div class="b" style="font-size:14px;line-height:20px">${E(copy(ctx, 'page.grid.note', 'Every page is drawn on one of two grids. Page 4 sits ghosted inside each.'))}</div>`);
    // the column detail, in the empty right column: three columns and two gutters at 40 percent, dimensioned
    const kc = 0.4, cx = X2 + w2 + 36, cyy = 440, cwid = 3 * c2 * kc + 2 * g2 * kc;
    let cd = ''; for (let i = 0; i < 3; i++) cd += `<rect x="${n1(i * (c2 + g2) * kc) + 0.5}" y="0.5" width="${n1(c2 * kc)}" height="139" fill="${line}" fill-opacity=".22" stroke="${line}" stroke-width="1"/>`;
    const detail = at(cx, cyy - 52, 733 - cx, 16, '<span class="m i">G-01.3</span><span class="lb" style="margin-left:12px">Column detail</span>')
      + sd('h', cx, cyy - 16, cwid, n1(3 * c2 + 2 * g2)) + svgAt(cx, cyy, cwid, 140, cd)
      + at(cx, cyy + 156, 733 - cx, 60, `<div class="m w">3 columns of ${n1(c2)}, 2 gutters of ${g2}. Drawn at 40 percent.</div>`);
    // the slide
    const k = 0.19, X = 90, Y = 872, PW = 1280, PH = 720, w = PW * k, h = PH * k, gx = 64, gy = 72, mod = 96, gx1 = 1216, gy1 = 648;
    const slide = at(X, Y, w, h, `<div style="width:${PW}px;height:${PH}px;transform:scale(${k});transform-origin:0 0;opacity:${op}" data-contrast="demo">${asWide(p1.who(wide(ctx)), 'art-slide')}</div>`, { style: `background:${paper};overflow:hidden` });
    let sl = `<path fill-rule="evenodd" fill="${tint}" d="M0 0H${n1(w)}V${n1(h)}H0ZM${n1(gx * k)} ${n1(gy * k)}V${n1(gy1 * k)}H${n1(gx1 * k)}V${n1(gy * k)}Z"/><g stroke="${line}" stroke-width="1" fill="none">`;
    for (let i = 0; i <= 12; i++) sl += `<path d="M${n1((gx + i * mod) * k) + 0.5} ${n1(gy * k)}V${n1(gy1 * k)}"/>`;
    for (let j = 0; j <= 6; j++) sl += `<path d="M${n1(gx * k)} ${n1((gy + j * mod) * k) + 0.5}H${n1(gx1 * k)}"/>`;
    sl += '</g>';
    const slideOver = svgAt(X, Y, w, h, sl) + at(X, Y, w, h, '', { style: `box-shadow:0 0 0 1px ${t.ink}` });
    const slideDims = sd('h', X, Y - 18, w, PW) + sd('v', X - 22, Y, h, PH);
    const lab = at(X - 29, Y - 48, 330, 18, '<span class="m i">G-01.1</span><span class="lb" style="margin-left:12px">Slide, 12 x 6 modules, 19 percent</span>');
    // the schedule: both grids side by side
    const rows = [['', 'A4', 'Slide'], ['Page', `${PW2} x ${PH2}`, `${PW} x ${PH}`], ['Margin', `${m2}`, `${gx} | ${gy}`], ['Columns', `${M.columns}`, '12'], ['Module | col', `${n1(c2)}`, `${mod}`], ['Gutter', `${g2}`, '0'], ['Base unit', `${M.base}`, '24']];
    const TX = 400, TY = 872, RH = 20, TW = 333;
    const table = rows.map((r, i) => hr(TX, TY + i * RH, TW, i ? 'var(--hair)' : 'var(--ink)')
      + at(TX, TY + i * RH + 2, 110, RH, `<span class="m${i ? '' : ' i'}">${r[0]}</span>`, { style: 'line-height:16px' }) + at(TX + 110, TY + i * RH + 2, 112, RH, `<span class="m i" style="display:block;text-align:right">${r[1]}</span>`, { style: 'line-height:16px' })
      + at(TX + 222, TY + i * RH + 2, 111, RH, `<span class="m i" style="display:block;text-align:right">${r[2]}</span>`, { style: 'line-height:16px' })).join('') + hr(TX, TY + rows.length * RH, TW, 'var(--ink)');
    return sheet(ctx, 'grid', { ground: g, body: H1('Grid', X0, 64, 200) + a4p + a4Over + a4Dims + a4Leader + side + detail + lab + slide + slideOver + slideDims + table });
  },

  // ---- 24 Compositions (SB): the A4 cover, In use and Print at 1:3.8 on one datum, then the same three as slides at 1:6; each with its width, a true scale bar and one rule ----
  compositions(ctx) {
    const G = groundsOf(ctx), g = G.surface, t = tones(ctx, g), E = ctx.esc, paper = G.panel, A = printArt(ctx);
    const names = [['A-00', 'Cover'], ['T-03', 'In use'], ['U-02', 'Print']];
    const plate = (x, y, w, h, W, H, inner, id) => at(x, y, w, h, `<div style="width:${W}px;height:${H}px;transform:scale(${w / W});transform-origin:0 0" data-contrast="demo">${inner}</div>`, { style: `background:${paper};overflow:hidden;box-shadow:0 0 0 1px ${t.ink}` });
    const bar = (x, y, w, end, cap) => svgAt(x, y - 8, w, 20, Array.from({ length: 4 }, (_, i) => `<rect x="${n1(i * w / 4) + 0.5}" y="0.5" width="${n1(w / 4) - 1}" height="6" fill="${i % 2 ? 'none' : t.ink}" stroke="${t.ink}" stroke-width="1"/>`).join(''))
      + [0, end / 2, end].map((v, i) => at(i === 0 ? x : i === 1 ? x + w / 2 - 30 : x + w - 60, y + 2, 60, 16, `<span class="m" style="display:block;text-align:${i === 0 ? 'left' : i === 2 ? 'right' : 'center'}">${v}</span>`)).join('')
      + at(x + w + 24, y - 9, 400, 16, `<span class="m i">${cap[0]}</span><span class="m" style="margin-left:12px">${cap[1]}</span>`);
    // row A: portrait
    const wa = 209, ha = 296, xa = [X0, X0 + 231, X0 + 462], YA = 190;
    const artsA = [asArt(a4.cover(ctx), 'art-cover'), asArt(a4.hierarchy(ctx), 'art-hierarchy'), asArt(a4.print(ctx), 'art-print')];
    const platesA = artsA.map((h, i) => plate(xa[i], YA, wa, ha, 794, 1123, h)).join('');
    const dimsA = xa.map((x) => dim(ctx, 'h', x, YA - 18, wa, 794, { ground: g, ext: 4 })).join('') + dim(ctx, 'v', xa[2] + wa + 16, YA, ha, 1123, { ground: g, ext: 4 });
    const baseA = YA + ha;
    const notes = xa.map((x, i) => hr(x, baseA + 36, wa, 'var(--ink)') + at(x, baseA + 44, 60, 16, `<span class="m i">${names[i][0]}</span>`) + at(x + 56, baseA + 44, wa - 56, 16, `<span class="lb i">${names[i][1]}</span>`)
      + at(x, baseA + 70, wa - 8, 110, `<div class="b" style="font-size:14px;line-height:19px">${ruleOf(ctx, i)}</div>`)).join('');
    const rowA = at(X0, 140, 500, 18, '<span class="m i">Portrait</span><span class="lb" style="margin-left:12px">A4 sheets, 794 x 1123 px</span>')
      + at(X0, baseA + 8, GW, 2, '', { style: `background:${t.ink}` }) + at(X1 - 116, baseA + 14, 116, 16, '<span class="m" style="display:block;text-align:right">FFL 0.00</span>');
    // row B: the slides
    const wb = 213, hb = 120, xb = [X0, X0 + 229.5, X0 + 459], YB = 772, baseB = YB + hb;
    const artsB = [p1.cover(wide(ctx)), p3.hierarchy(wide(ctx)), p4.print(wide(ctx))].map((h, i) => plate(xb[i], YB, wb, hb, 1280, 720, asWide(h, `art-w${i}`))).join('');
    const dimsB = xb.map((x) => dim(ctx, 'h', x, YB - 18, wb, 1280, { ground: g, ext: 4 })).join('') + dim(ctx, 'v', xb[2] + wb + 16, YB, hb, 720, { ground: g, ext: 4 });
    const rowB = at(X0, 716, 500, 18, '<span class="m i">Landscape</span><span class="lb" style="margin-left:12px">Slides, 1280 x 720 px</span>') + at(X0, baseB + 8, GW, 2, '', { style: `background:${t.ink}` })
      + xb.map((x, i) => at(x, baseB + 18, wb, 16, `<span class="m i">${names[i][0]}</span><span class="lb" style="margin-left:12px">${names[i][1]}</span>`)).join('');
    const body = H1('Compositions', X0, 64, 520) + platesA + dimsA + rowA + notes + bar(X0, 686, wa, 794, ['1:3.8', E(copy(ctx, 'page.compositions.scale', 'Each sheet is 794 by 1123 px.'))])
      + artsB + dimsB + rowB + bar(X0, 958, wb, 1280, ['1:6', 'Each slide is 1280 by 720 px.']);
    return sheet(ctx, 'compositions', { ground: g, body });
  },

  // ---- 26 Digital (EL): the home page as elevations on two datums. The desktop stands on top at 44 percent with its true 1440 x 900; below it the tablet and phone at 36 percent
  // (768 x 1024 and 390 x 844) with a schedule of the three ----
  digital(ctx) {
    const G = groundsOf(ctx), g = G.panel, t = tones(ctx, g), dd = d(ctx, g);
    const devs = [['U-01.1', 'Desktop', 1440, 900, 0.44, X0, 564], ['U-01.2', 'Tablet', 768, 1024, 0.36, X0, 992], ['U-01.3', 'Phone', 390, 844, 0.36, 400, 992]];
    const elev = devs.map(([c, n, w, h, K, x, datum]) => {
      const dw = Math.round(w * K), dh = Math.round(h * K), a = siteArt(ctx, w, h);
      return at(x, datum - dh, dw, dh, `<div style="width:${w}px;height:${h}px;transform:scale(${K});transform-origin:0 0" data-contrast="demo">${a.html}</div>`, { style: `overflow:hidden;box-shadow:0 0 0 1px ${t.ink}` })
        + dd('h', x, datum - dh - 18, dw, w, 4) + dd('v', x + dw + 16, datum - dh, dh, h, 4)
        + at(x, datum + 8, 260, 16, `<span class="m i">${c}</span><span class="lb" style="margin-left:12px">${n}, ${Math.round(K * 100)} percent</span>`);
    }).join('');
    const datum = (y) => at(X0, y, GW, 2, '', { style: `background:${t.ink}` }) + at(X1 - 116, y + 8, 116, 16, '<span class="m" style="display:block;text-align:right">FFL 0.00</span>');
    const sch = [['U-01.1', 'Desktop', '1440 x 900 px'], ['U-01.2', 'Tablet', '768 x 1024 px'], ['U-01.3', 'Phone', '390 x 844 px']].map(([c, n, v], i) => hr(603, 623 + i * 52, 130, 'var(--ink)')
      + at(603, 631 + i * 52, 130, 16, `<span class="m i">${c}</span><span class="lb" style="margin-left:8px">${n}</span>`) + at(603, 649 + i * 52, 130, 16, `<span class="m">${v}</span>`)).join('') + hr(603, 623 + 3 * 52, 130, 'var(--ink)');
    return sheet(ctx, 'digital', { ground: g, body: H1('Digital', X0, 64, 300) + elev + datum(564) + datum(992) + sch });
  },

  // ---- 27 Print (FL): the stationery on the plywood offcut. Showcase: IMG-07 at a portrait crop (794 x 560) with the quote and both card faces warped onto it by the existing quads,
  // named by Plaster tags, and under it the same pieces flat at 1.1 px to the millimetre. Otherwise (a real export, or the mockups off): the flat pieces large, 1.9 px to the mm,
  // with a schedule ----
  print(ctx) {
    const G = groundsOf(ctx), g = G.surface, t = tones(ctx, g), E = ctx.esc, A = printArt(ctx), dd = d(ctx, g), on = mockupsOn(ctx) && !slotOn(ctx);
    const piece = (a, x, y, w, h) => at(x, y, w, h, `<div style="width:${a.w}px;height:${a.h}px;transform:scale(${w / a.w},${h / a.h});transform-origin:0 0" data-contrast="demo">${a.html}</div>`, { style: `overflow:hidden;box-shadow:0 0 0 1px ${t.ink}` });
    const rows = (x, y, w, step) => [['U-02.1', 'Card, front', '90 x 55 mm'], ['U-02.2', 'Card, back', '90 x 55 mm'], ['U-02.3', 'Quote', '210 x 297 mm']].map(([c, n, v], i) => hr(x, y + i * step, w, 'var(--ink)')
      + at(x, y + i * step + 8, 56, 16, `<span class="m i">${c}</span>`) + at(x + 62, y + i * step + 8, 90, 16, `<span class="lb i">${n}</span>`) + at(x, y + i * step + 8 + (step > 44 ? 18 : 0), w, 16, `<span class="m" style="display:block;text-align:right">${v}</span>`)).join('') + hr(x, y + 3 * step, w, 'var(--ink)');
    if (on) {
      const FH = 560, frame = { left: 0, top: 0, w: 794, h: FH, fx: 0.4, fy: 0.5, zoom: 1 };
      const sq = areaOnPage(ctx, 'IMG-07', 'sheet', frame).quad, cb = areaOnPage(ctx, 'IMG-07', 'card-b', frame).quad, tg = t.ink;
      const tag = (x, y, l1, l2) => field(ctx, x, y, 176, 40, g, `<span class="lb i" style="position:absolute;left:12px;top:3px">${l1}</span><span class="m" style="position:absolute;left:12px;top:20px">${l2}</span>`, `box-shadow:0 0 0 1px ${t.hair}`);
      const dot = (x, y) => `<circle cx="${n1(x)}" cy="${n1(y)}" r="3" fill="${t.dim}" stroke="${g}" stroke-width="1.5"/>`;
      const cx0 = cb[3][0] + 34, cy0 = cb[3][1], qx = sq[0][0], qy = sq[0][1] + 70;
      const leaders = svgAt(0, 0, 794, FH, `<path d="M${n1(cx0)} ${n1(cy0)}V${n1(cy0 + 60)}" stroke="${tg}" stroke-width="1" fill="none"/>${dot(cx0, cy0)}<path d="M${n1(qx)} ${n1(qy)}H${n1(qx - 52)}" stroke="${tg}" stroke-width="1" fill="none"/>${dot(qx, qy)}`)
        + tag(cx0 - 34, cy0 + 60, E(copy(ctx, 'page.print.tag.card', 'Business card')), '90 x 55 mm') + tag(qx - 52 - 176, qy - 20, E(copy(ctx, 'page.print.tag.quote', 'Quote')), 'A4, 210 x 297 mm');
      const top = at(0, 0, 794, FH, photo(ctx, 'stationery', { w: 794, h: FH, fx: frame.fx, fy: frame.fy }), { style: 'overflow:hidden' })
        + warp(ctx, 'IMG-07', 'sheet', frame, A.quote) + warp(ctx, 'IMG-07', 'card-a', frame, A.front) + warp(ctx, 'IMG-07', 'card-b', frame, A.back) + leaders
        + field(ctx, X0, 0, 330, 28, g, '<span class="m i" style="position:absolute;left:12px;top:6px">U-02  Stationery on plywood</span>');
      const K = 1.1, aw = Math.round(210 * K), ah = Math.round(297 * K), cw = Math.round(90 * K), ch = Math.round(55 * K), Y = 664, cX = 380;
      const flatPart = at(X0, 586, 520, 18, '<span class="m i">U-02.1</span><span class="lb" style="margin-left:12px">The pieces, flat, 1.1 px to the millimetre</span>')
        + piece(A.quote, X0, Y, aw, ah) + piece(A.front, cX, Y, cw, ch) + piece(A.back, cX, Y + ch + 38, cw, ch)
        + dd('h', X0, Y - 16, aw, '210 mm', 4) + dd('v', X0 + aw + 22, Y, ah, '297 mm', 4) + dd('h', cX, Y - 16, cw, '90 mm', 4) + dd('v', cX + cw + 22, Y, ch, '55 mm', 4) + dd('v', cX + cw + 22, Y + ch + 38, ch, '55 mm', 4)
        + rows(560, Y, 173, 52) + at(560, Y + 176, 173, 60, '<div class="m w">Front and back, 350 gsm uncoated board.</div>');
      return sheet(ctx, 'print', { ground: g, body: top + flatPart, gridOpts: { y0: 580 } });
    }
    const K = 1.9, aw = Math.round(210 * K), ah = Math.round(297 * K), cw = Math.round(90 * K), ch = Math.round(55 * K), Y = 232, ax = 300, cy2 = Y + ch + 44;
    const body = H1('Print', X0, 64, 340)
      + at(X0, 124, 520, 60, `<div class="b">${E(copy(ctx, 'page.print.note', 'The mark sits at the top left. Each piece carries one line of news and nothing else.'))}</div>`)
      + piece(A.quote, ax, Y, aw, ah) + piece(A.front, X0, Y, cw, ch) + piece(A.back, X0, cy2, cw, ch)
      + dd('h', ax, Y - 16, aw, '210 mm', 4) + dd('v', ax + aw + 24, Y, ah, '297 mm', 4) + dd('h', X0, Y - 16, cw, '90 mm', 4) + dd('v', X0 + cw + 20, Y, ch, '55 mm', 4) + dd('v', X0 + cw + 20, cy2, ch, '55 mm', 4)
      + at(X0, cy2 + ch + 24, 190, 60, '<div class="m w">Front and back, 350 gsm uncoated board.</div>')
      + (() => { // the card's trim, bleed and safe area, drawn at the same scale in the left column
        const bl = Math.round(3 * K), sf = Math.round(5 * K), sy = 620, W2 = cw + 2 * bl, H2 = ch + 2 * bl;
        return at(X0, sy - 36, 190, 16, '<span class="m i">U-02.4</span><span class="lb" style="margin-left:12px">Trim, bleed, safe</span>')
          + svgAt(X0, sy - bl, W2, H2, `<rect x=".5" y=".5" width="${W2 - 1}" height="${H2 - 1}" fill="none" stroke="${t.dim}" stroke-dasharray="3 3"/><rect x="${bl + 0.5}" y="${bl + 0.5}" width="${cw - 1}" height="${ch - 1}" fill="none" stroke="${t.ink}"/><rect x="${bl + sf + 0.5}" y="${bl + sf + 0.5}" width="${cw - 2 * sf - 1}" height="${ch - 2 * sf - 1}" fill="none" stroke="${t.dim}"/>`)
          + at(X0, sy + ch + bl + 12, 190, 60, '<div class="m w">Bleed 3 mm, dashed. Trim 90 x 55 mm. Safe area 5 mm inside the trim.</div>');
      })()
      + rows(X0, 836, GW, 40);
    return sheet(ctx, 'print', { ground: g, body });
  },

  // ---- 28 Social (PH): a story on a phone in a hand. IMG-06 is a portrait photograph, so it takes the left column (470 x 835) with the story warped into the glass; two flat stories
  // stand in the right column, 1080 x 1920 dimensioned. Otherwise (a real export, or the mockups off): a Brick field of the same size with a flat story on it ----
  social(ctx) {
    const G = groundsOf(ctx), g = G.ink, on = mockupsOn(ctx) && !slotOn(ctx), dd = d(ctx, g), PWd = 470, PHd = 835, FW = 200, FH = 356, SX = 533, ys = [150, 578];
    const place = (a, x, y, w, h) => at(x, y, w, h, `<div style="width:${a.w}px;height:${a.h}px;transform:scale(${w / a.w},${h / a.h});transform-origin:0 0" data-contrast="demo">${a.html}</div>`, { style: 'overflow:hidden' });
    const frame = { left: 0, top: 0, w: PWd, h: PHd, fx: 0.5, fy: 0.4653, zoom: 1 };
    const scene = on
      ? at(0, 0, PWd, PHd, photo(ctx, 'phone', { w: PWd, h: PHd, fx: frame.fx, fy: frame.fy }), { style: 'overflow:hidden' }) + warp(ctx, 'IMG-06', 'screen', frame, storyArt(ctx, G.primary, 0, 390, 844), { glass: true })
        + field(ctx, X0, 0, 372, 28, g, '<span class="m i" style="position:absolute;left:12px;top:6px">U-03.1  Story on a phone, 390 x 844 px</span>')
      : voidField(ctx, 0, 0, PWd, PHd, G.primary, PHONE_NOTE) + place(storyArt(ctx, G.surface, 0, 540, 960), 100, 150, 270, 480);
    const flats = [[G.accent, 1], [G.surface, 2]].map(([c, k], i) => place(storyArt(ctx, c, k, 540, 960), SX, ys[i], FW, FH)).join('');
    const dims = ys.map((y) => dd('h', SX, y - 16, FW, '1080', 4) + dd('v', SX - 26, y, FH, '1920', 4)).join('');
    const caps = ys.map((y, i) => hr(SX, y + FH + 12, FW, 'var(--ink)') + at(SX, y + FH + 20, FW, 16, `<span class="m i">U-03.${i + 2}</span><span class="lb" style="margin-left:12px">Story</span>`)).join('');
    const spec = [['Format', '1080 x 1920 px'], ['Kept clear at the top', '15 percent'], ['Mark', '40 percent of the width']].map(([a, b], i) => hr(X0, 868 + i * 36, 380, i ? 'var(--hair)' : 'var(--ink)')
      + at(X0, 878 + i * 36, 200, 16, `<span class="lb">${a}</span>`) + at(X0 + 180, 878 + i * 36, 200, 16, `<span class="m i" style="display:block;text-align:right">${b}</span>`)).join('') + hr(X0, 868 + 3 * 36, 380, 'var(--ink)');
    return sheet(ctx, 'social', { ground: g, body: scene + H1('Social', SX, 64, 200) + flats + dims + caps + spec });
  },

  // ---- 30 On one page (AX): the five plates on the stair at 30 degrees, drawn for portrait: smaller plates (15 percent), a long rise (150) so the stair climbs the page from the lower left
  // to the upper right, dashed drop lines to the datum at y 950 ----
  summary(ctx) {
    const G = groundsOf(ctx), g = G.surface, t = tones(ctx, g), E = ctx.esc, S = 0.15, PW = 960, PH = 600, STEP = 117, RISE = 150, F0 = 770, E0 = X0 + 0.866 * S * PH, DATUM = 950;
    const plates = summaryPlates(ctx, PW, PH), pt = (i, u, v) => [E0 + i * STEP + 0.866 * S * (u - v), F0 - i * RISE + 0.5 * S * (u + v)];
    const body = plates.map(([code, name, art], i) => {
      const a = [pt(i, 0, 0), pt(i, PW, 0), pt(i, PW, PH), pt(i, 0, PH)], P = (q) => q.map((p) => `${n1(p[0])},${n1(p[1])}`).join(' '), b = pt(i, PW, PH);
      const slab = svgAt(0, 0, 794, 1123, `<polygon points="${P(a.map((p) => [p[0], p[1] + 6]))}" fill="${t.ink}"/><path d="M${n1(b[0])} ${n1(b[1] + 6)}V${DATUM}" stroke="${t.dim}" stroke-width="1" stroke-dasharray="4 4" fill="none"/><circle cx="${n1(b[0])}" cy="${DATUM}" r="2.5" fill="${t.dim}"/>`);
      const face = at(0, 0, PW, PH, `<div data-contrast="demo" style="position:absolute;left:0;top:0;width:${PW}px;height:${PH}px">${art}</div>`, { style: `transform:matrix(${0.866 * S},${0.5 * S},${-0.866 * S},${0.5 * S},${n1(pt(i, 0, 0)[0])},${n1(pt(i, 0, 0)[1])});transform-origin:0 0;overflow:hidden;box-shadow:0 0 0 ${1 / S}px ${t.ink}` });
      return slab + face + at(b[0] - 56, DATUM + 8, 112, 50, `<div class="m i" style="text-align:center">${code}</div><div class="lb" style="text-align:center;line-height:14px">${E(name)}</div>`);
    }).join('');
    // the 30 degrees, drawn once: a horizontal and the floor line, with the arc
    const ax = X0, ay = 330, r = 70, ang = Math.PI / 6, ex = ax + 150 * Math.cos(ang), ey = ay + 150 * Math.sin(ang);
    const angle = svgAt(0, 0, 794, 1123, `<path d="M${ax} ${ay}H${ax + 150}" stroke="${t.ink}" stroke-width="1" stroke-dasharray="4 4" fill="none"/><path d="M${ax} ${ay}L${n1(ex)} ${n1(ey)}" stroke="${t.ink}" stroke-width="1" fill="none"/>`
      + `<path d="M${ax + r} ${ay}A${r} ${r} 0 0 1 ${n1(ax + r * Math.cos(ang))} ${n1(ay + r * Math.sin(ang))}" stroke="${t.dim}" stroke-width="1.5" fill="none"/>`) + at(ax + r + 10, ay + 8, 90, 16, '<span class="m">30 degrees</span>');
    // the stair dimensioned in the lower right: step across between the five drops, the rise between the last two base corners
    const dd = d(ctx, g), bx = (i) => n1(E0 + i * STEP + 0.866 * S * (PW - PH)), by = (i) => n1(F0 - i * RISE + 0.5 * S * (PW + PH) + 6);
    const stairDims = [0, 1, 2, 3].map((i) => dd('h', E0 + i * STEP + 0.866 * S * (PW - PH), 905, STEP, String(STEP), 4)).join('')
      + svgAt(0, 0, 794, 1123, `<g stroke="${t.dim}" stroke-width="1" stroke-dasharray="3 3" fill="none"><path d="M${bx(4)} ${by(4)}H700M${bx(3)} ${by(3)}H700"/></g>`)
      + dd('v', 694, by(4), RISE, String(RISE), 4)
      + at(430, 820, 100, 64, '<div class="m w">Plates 960 x 600, step 117 across and 150 up.</div>');
    const head = H1('On one page', X0, 64, 520)
      + at(X0, 124, 300, 80, `<div class="b">${E(copy(ctx, 'page.summary.note', 'Mark, palette, type and two photographs, stood on the stair at 30 degrees.'))}</div>`);
    return sheet(ctx, 'summary', { ground: g, body: head + angle + body + stairDims + hr(X0, DATUM, GW, 'var(--ink)') + at(X1 - 116, DATUM - 22, 116, 16, '<span class="m" style="display:block;text-align:right">FFL 0.00</span>') });
  },

  // ---- 31 Contact (TB): the title block grown to the page, 1 px Plaster cells at 30 percent in 120 px rows from y 348 to 1008; the headline at 56 px; the email at 44 px in the big cell ----
  contact(ctx) {
    const G = groundsOf(ctx), g = G.ink, t = tones(ctx, g), E = ctx.esc, B = ctx.brand, R = refOf(ctx, 'contact'), K = geo(ctx), Y0b = 348, RH = 120, XS = X0 + 432, Yb = Y0b + 3 * RH, Y1b = 1008;
    const rev = String(ctx.versionLine || 'Version 1.0, November 2026').replace(/^Version/, 'Rev');
    const email = isGhost(ctx, copy(ctx, 'contact.email')) ? ghostRule(ctx, 'Your contact email', 'Who to ask before changing the mark.') : ghost(ctx, copy(ctx, 'contact.email'), 'contact.email', 'Your contact email', { what: false });
    const cell = (x, y, w, label, val) => at(x + 16, y + 16, w - 32, 90, `<div class="lb">${label}</div><div class="m i" style="margin-top:8px;font-size:17px;line-height:24px">${val}</div>`);
    const cells = cell(X0, Y0b, 432, 'Project', `${E(ctx.real ? ctx.real(B.name) : B.name)} brand guidelines`) + cell(XS, Y0b, X1 - XS, 'Sheet no.', R.sheet)
      + cell(X0, Y0b + RH, 432, 'Sheet', E(R.title)) + cell(XS, Y0b + RH, X1 - XS, 'Scale', '1:1')
      + cell(X0, Y0b + 2 * RH, 432, 'Issue', E(rev)) + cell(XS, Y0b + 2 * RH, X1 - XS, 'Status', 'Issued for use');
    const big = at(X0 + 16, Yb + 16, GW - 32, 60, '<div class="lb">Questions about the mark</div>') + fill(X0 + 16, Y1b - 112, 96, 8, t.dim)
      + at(X0 + 16, Y1b - 88, GW - 32, 72, `<div class="d" style="font-size:44px;line-height:52px;white-space:normal;letter-spacing:-.02em">${email}</div>`);
    const frame = svgAt(0, 0, K.W, K.H, `<g stroke="${t.hair}" stroke-width="1" fill="none"><rect x="${X0 + 0.5}" y="${Y0b + 0.5}" width="${GW}" height="${Y1b - Y0b}"/><path d="M${X0} ${Y0b + RH + 0.5}H${X1}M${X0} ${Y0b + 2 * RH + 0.5}H${X1}M${X0} ${Yb + 0.5}H${X1}M${XS + 0.5} ${Y0b}V${Yb}"/></g>`);
    const head = at(X0, 96, GW, 190, `<h1 class="d h1" style="white-space:normal;font-size:56px;line-height:60px">${E(copy(ctx, 'page.contact.headline', 'Check the drawing before you build on it.'))}</h1>`);
    return sheet(ctx, 'contact', { ground: g, body: head + frame + cells + big });
  },
};
