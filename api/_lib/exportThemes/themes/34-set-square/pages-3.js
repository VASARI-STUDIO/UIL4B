// Theme 34, Set Square: pages 18 to 21 and 23 (Type: typefaces, scale, in use, type rules; Layout: grid). 16:9 only (A4 is a later slice).
// Families: TG tile setout (typefaces, one glyph to a module), SR stair (scale, each step a tread rising to the right, line heights dimensioned),
// HB hoarding (in use, the headline on the blank board), IS inspection pairs (type rules, pass and fail crops stamped), FG full-scale grid (the page's own grid, drawn).
import { copy } from './showcase.js';
import { typeLadder } from '../../engine/styleguide.js';
import {
  tones, groundsOf, measure, at, hr, vr, fill, svgAt, dim, sheet, field, voidField, mix, n1, PHOTO_NOTE, varsOf, leader, ghost, asArt,
} from './kit.js';
import { photo } from './photos.js';
import { guidelines as p1 } from './pages-1.js';
import { warp, areaOnPage } from './mockups.js';
import { mockupsOn } from './kit.js';

const slotOn = (ctx) => ctx.edition === 'slot';
const facesOf = (ctx, role) => ctx.faces.filter((f) => f.role === role && f.style !== 'italic');
const weightsOf = (ctx, role) => [...new Set(facesOf(ctx, role).map((f) => f.weight))].sort((a, b) => a - b).slice(0, 5);
const weightOf = (ctx, t) => (t.face === 'display' ? ctx.weights.heading : t.weight);
const stepCss = (ctx, t) => `font-family:var(--${t.face === 'display' ? 'display' : 'body'});font-weight:${weightOf(ctx, t)};font-size:${t.size}px;line-height:${t.line}px;${t.face === 'display' && t.size > 40 ? 'letter-spacing:-0.02em;' : ''}white-space:nowrap;`;
const H1 = (txt, x = 64, y = 96, w = 480) => at(x, y, w, 52, `<h1 class="d h1" style="line-height:48px">${txt}</h1>`);
const NOTE = (txt, x, y, w) => at(x, y, w, 60, `<div class="b">${txt}</div>`);

// Page 4 as it sets on the A4 portrait grid (7 columns of text under a 3:4 photograph): drawn at 794 x 1123 for the grid page to ghost inside its A4 drawing.
export function a4Page4(ctx, tp) {
  const G = groundsOf(ctx), M = ctx.gridMeasures, B = ctx.brand, slot = slotOn(ctx);
  const m = M.margin, cw = M.col, gu = M.gutter, span = (n) => n * cw + (n - 1) * gu, colX = (i) => m + i * (cw + gu);
  const pw = span(8), ph = Math.round(pw * 4 / 3), tx = colX(8), tw = span(4);
  const pic = slot ? voidField(ctx, 0, 0, pw, ph, G.ink, '') : photo(ctx, 'midjob', { w: pw, h: ph, fx: 0.22, fy: 0.5 });
  const cols = [['A-01.1', 'Description', B.description, 'description', 'What the brand is, in one sentence.'], ['A-01.2', 'What it does', B.product, 'product', 'What a customer does with it.'], ['A-01.3', 'Who it serves', B.audience, 'audience', 'Who it is for, and what they want.']];
  const lead = (c) => at(tx, m + 36, tw, 280, `<div class="d" style="font-size:22px;line-height:28px;white-space:normal;letter-spacing:-.01em">${ghost(ctx, c[2], c[3], c[4], { what: false })}</div>`);
  const low = (c, i) => at(colX(i * 6), m + ph + 56, span(6), 220, `<div class="b" style="max-width:none">${ghost(ctx, c[2], c[3], c[4], { what: false, example: false })}</div>`);
  const lab = (x, y, w, c) => at(x, y, w, 20, `<span class="m i">${c[0]}</span><span class="lb" style="margin-left:12px">${c[1]}</span>`) + hr(x, y - 8, w, 'var(--ink)');
  const body = at(m, m, pw, ph, pic, { style: 'overflow:hidden' }) + lab(tx, m + 8, tw, cols[0]) + lead(cols[0])
    + lab(colX(0), m + ph + 24, span(6), cols[1]) + low(cols[1], 0) + lab(colX(6), m + ph + 24, span(6), cols[2]) + low(cols[2], 1)
    + hr(m, 1067, 794 - 2 * m, 'var(--ink)') + at(m, 1075, 400, 16, `<span class="m i">${ctx.esc(ctx.brand.name)} brand guidelines</span>`);
  return `<div class="pg ss" data-page="art-a4" style="${varsOf(tp)};break-after:auto;break-inside:auto;width:794px;height:1123px">${body}</div>`;
}

export const guidelines = {
  // ---- 18 Typefaces (TG): tile setout, one glyph per module ----
  faces(ctx) {
    const G = groundsOf(ctx), g = G.surface, t = tones(ctx, g), E = ctx.esc, B = ctx.brand;
    const X0 = 352, Y0 = 72, S = 96;
    const set = [...'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz&?'];
    const cells = set.map((ch, i) => {
      const cx = X0 + (i % 9) * S, cy = Y0 + Math.floor(i / 9) * S, plumb = ch === 'l';
      const glyph = at(cx, cy, S, S, ch === '&' ? '&amp;' : ch, { cls: 'd', style: `font-size:64px;line-height:${S}px;text-align:center;letter-spacing:0;${plumb ? `color:${t.dim};` : ''}` });
      const line = plumb ? svgAt(cx, cy, S, S, `<path d="M${S / 2} 0V${S - 6}" stroke="${t.dim}" stroke-width="1" fill="none"/><circle cx="${S / 2}" cy="${S - 4}" r="2.5" fill="${t.dim}"/>`) : '';
      return line + glyph;
    }).join('');
    const roles = [['display', 'Display', 264], ['body', 'Body', 408]].map(([role, label, y]) => {
      const fam = B.fonts[role].family, ws = weightsOf(ctx, role);
      return at(64, y, 270, 16, `<span class="m i">${label}</span>`) + hr(64, y - 8, 272, 'var(--ink)')
        + at(64, y + 24, 272, 32, `<span class="d h2" style="font-size:24px;${role === 'body' ? `font-family:var(--body);font-weight:${ctx.weights.regular};letter-spacing:0` : ''}">${E(fam)}</span>`)
        + at(64, y + 60, 272, 16, `<span class="m">Weights ${ws.join(' ')}</span>`);
    }).join('');
    const digits = at(64, 552, 272, 40, `<span style="font-family:var(--body);font-size:24px;line-height:32px;letter-spacing:.04em;white-space:nowrap;font-variant-numeric:tabular-nums">0123456789</span>`)
      + hr(64, 544, 272, 'var(--ink)') + at(64, 600, 272, 16, '<span class="m">One glyph to a 96 px module.</span>');
    const body = H1('Typefaces', 64, 88, 272) + NOTE('Two faces, set one glyph to a module. The l hangs its plumb line.', 64, 148, 250) + roles + digits + cells;
    return sheet(ctx, 'faces', { ground: g, body });
  },

  // ---- 19 Scale (SR): a stair in elevation; each step a tread rising to the right, line heights dimensioned ----
  scale(ctx) {
    const G = groundsOf(ctx), g = G.panel, t = tones(ctx, g), E = ctx.esc;
    const L = typeLadder(ctx).reverse(), n = L.length, X0 = 64, W = 1152, tw = W / n, base = 648, t0 = 498, t1 = 318, rise = n > 1 ? (t0 - t1) / (n - 1) : 0;
    const top = (i) => t0 - i * rise;
    let path = `M${X0} ${base}V${n1(top(0))}`;
    for (let i = 0; i < n; i++) path += `${i ? `V${n1(top(i))}` : ''}H${n1(X0 + (i + 1) * tw)}`;
    const stair = svgAt(0, 0, 1280, 720, `<path d="${path}V${base}Z" fill="${t.wash}" stroke="none"/><path d="${path}" stroke="var(--ink)" stroke-width="2" fill="none"/>`
      + Array.from({ length: n - 1 }, (_, i) => `<path d="M${n1(X0 + (i + 1) * tw) + 0.5} ${n1(top(i + 1))}V${base}" stroke="var(--hair)" stroke-width="1" fill="none"/>`).join(''));
    const phrase = copy(ctx, 'page.scale.tread', 'Aa');
    const steps = L.map((s, i) => {
      const x = X0 + i * tw, y = top(i), lh = s.line, est = s.size * 0.52 * phrase.length;
      const txt = !slotOn(ctx) && est <= tw - 36 ? E(phrase) : 'Aa';
      const sample = at(x + 12, y - lh - 6, tw - 30, lh, txt, { style: stepCss(ctx, s) });
      const d = lh >= 44 ? dim(ctx, 'v', x + tw - 10, y - lh - 6, lh, lh, { ground: g, ext: 3 }) : '';
      const label = at(x + 12, y + 14, tw - 20, 52, `<span class="m i" style="display:block">${E(s.name)}</span><span class="m" style="display:block">${s.size} / ${s.line} px</span><span class="m" style="display:block">${weightOf(ctx, s)}</span>`);
      return sample + d + label;
    }).join('');
    const body = stair + steps + H1('Scale', 64, 88, 400) + NOTE('Each step stands at its real size. The dimension beside it is its line height.', 64, 148, 340)
      + at(1100, base - 22, 116, 16, '<span class="m" style="display:block;text-align:right">FFL 0.00</span>');
    return sheet(ctx, 'scale', { ground: g, body, gridOpts: { y1: 648 } });
  },

  // ---- 20 In use (HB): the headline on the blank hoarding board ----
  hierarchy(ctx) {
    const G = groundsOf(ctx), g = G.surface, M = measure(ctx), E = ctx.esc;
    const frame = { left: 0, top: 0, w: 1280, h: 648, fx: 0.5, fy: 0.5, zoom: 1 };
    const tab = field(ctx, 64, 0, 340, 28, g, '<span class="m i" style="position:absolute;left:12px;top:6px">T-03  Type on a hoarding, board 2400 x 1080 mm</span>');
    let body;
    if (mockupsOn(ctx) && !slotOn(ctx)) {
      const head = copy(ctx, 'page.hoarding.headline', 'Your headline'), line = copy(ctx, 'page.hoarding.line', '');
      const aw = 1200, ah = 540, ht = tones(ctx, g);
      const art = `<div style="position:absolute;left:0;top:0;width:${aw}px;height:${ah}px;background:${g};color:${ht.ink}">`
        + `<div style="position:absolute;left:72px;top:64px;width:900px;font-family:var(--display);font-weight:${ctx.weights.heading};font-size:116px;line-height:1.02;letter-spacing:-.035em;white-space:normal">${E(head)}</div>`
        + `<div style="position:absolute;left:72px;top:388px;width:160px;height:8px;background:${G.primary}"></div>`
        + `<div style="position:absolute;left:72px;top:424px;width:1000px;font-family:var(--body);font-size:34px;line-height:44px">${E(line)}</div></div>`;
      body = at(0, 0, 1280, 648, photo(ctx, 'hoarding', { w: 1280, h: 648, fx: 0.5, fy: 0.5 }), { style: 'overflow:hidden' }) + warp(ctx, 'IMG-05', 'board', frame, { html: art, w: aw, h: ah });
    } else {
      const q = areaOnPage(ctx, 'IMG-05', 'board', frame).quad, xs = q.map((p) => p[0]), ys = q.map((p) => p[1]);
      const bx = Math.min(...xs), by = Math.min(...ys), bw = Math.max(...xs) - bx, bh = Math.max(...ys) - by;
      const ht = tones(ctx, g);
      const text = `<div class="d" style="position:absolute;left:32px;top:28px;width:${n1(bw - 64)}px;font-size:56px;line-height:1.05;white-space:normal;color:${ht.quiet}">Your headline, up to 8 words.</div>`
        + `<div style="position:absolute;left:32px;bottom:24px;width:90px;height:6px;background:${ht.dim}"></div>`;
      body = voidField(ctx, 0, 0, 1280, 648, G.ink, PHOTO_NOTE) + field(ctx, bx, by, bw, bh, g, text);
    }
    return sheet(ctx, 'hierarchy', { ground: g, body: body + tab, grid: false });
  },

  // ---- 21 Type rules (IS): inspection pairs. Each rule is a pass and a fail crop at 400 x 180, the failure marked in Brick (hatch, redline, dimension) and stamped ----
  'type-rules'(ctx) {
    const G = groundsOf(ctx), g = G.surface, t = tones(ctx, g), E = ctx.esc, B = ctx.brand;
    const rules = (B.type.rules || []).slice(0, 3), slot = slotOn(ctx);
    const head = slot ? 'Your headline' : E(copy(ctx, 'type.sample.headline', 'Your headline'));
    const W = 400, H = 180, leafOf = [G.ink, G.primary, G.accent];
    // the wall is Plaster-toned in the photo, so type on a photo is the brand ink; on a slot field it is that field's own ink
    const frames = [{ fx: 0.5, fy: 0.5, zoom: 1 }, { fx: 0.5, fy: 0.5, zoom: 1 }, { fx: 0.2, fy: 0.3, zoom: 1.4 }];
    const line = (x, y, w, h, c, extra = '') => `<div class="a" style="left:${x}px;top:${y}px;width:${w}px;height:${h}px;${extra}"></div>`;
    const hatch = (id, x, y, w, h, c) => svgAt(x, y, w, h, `<defs><pattern id="${id}" width="8" height="8" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><path d="M0 0V8" stroke="${c}" stroke-width="1.5"/></pattern></defs><rect width="${w}" height="${h}" fill="url(#${id})" opacity=".8"/>`);
    const text = (x, y, size, w, col, s = head) => at(x, y, w, size * 3, s, { cls: 'd', style: `font-size:${size}px;line-height:1;color:${col};white-space:normal;letter-spacing:-.025em` });
    // one crop: its art (clipped to the crop) and its page-level marks (dimensions) kept apart
    const crop = (i, ok, x, y) => {
      const ink = slot ? tones(ctx, leafOf[i]).ink : G.ink, red = slot ? ink : t.dim, id = `ssh${i}${ok ? 'p' : 'f'}`;
      const pic = slot ? voidField(ctx, 0, 0, W, H, leafOf[i], 'Your photograph.', i === 0 && !ok ? { noteY: 36 } : {}) : photo(ctx, 'finished', { w: W, h: H, ...frames[i] });
      let art = '', marks = '';
      if (i === 0) {
        const hy = ok ? 22 : 100;
        art = (ok ? '' : hatch(id, 0, 144, W, 36, red)) + line(0, 144, W, 0, red, `border-top:1px dashed ${red}`) + text(24, hy, 34, 300, ink);
        marks = '';
      } else if (i === 1) {
        const hy = ok ? 24 : 78, hx = ok ? 24 : 70;
        art = (ok ? line(24, 0, 0, 24, red, `border-left:1px solid ${red}`) : '') + text(hx, hy, 34, 300, ink);
        marks = dim(ctx, 'v', x + 12, y, hy, hy, { ground: g, ext: 4 });
      } else {
        art = ok ? text(40, 22, 34, 300, ink) : text(40, 20, 44, 340, ink) + text(40, 122, 16, 340, ink);
        marks = ok ? dim(ctx, 'v', x + 12, y + 22, 34, 34, { ground: g, ext: 4 }) + dim(ctx, 'v', x + 12, y + 56, 34, 34, { ground: g, ext: 4 })
          : dim(ctx, 'v', x + 12, y + 20, 44, 44, { ground: g, ext: 4 }) + dim(ctx, 'v', x + 12, y + 64, 44, 44, { ground: g, ext: 4 }) + dim(ctx, 'v', x + 12, y + 122, 16, 16, { ground: g, ext: 4 });
      }
      const tab = at(W - 72, 0, 72, 26, `<span class="m" style="display:block;line-height:26px;text-align:center;font-weight:700;letter-spacing:.08em;color:${ok ? tones(ctx, G.ink).ink : tones(ctx, G.primary).ink}">${ok ? 'PASS' : 'FAIL'}</span>`, { style: `background:${ok ? G.ink : G.primary}` });
      const frame = ok ? `0 0 0 1px ${t.ink}` : `0 0 0 3px ${t.dim}`;
      return at(x, y, W, H, `${pic}${art}${tab}`, { style: `overflow:hidden;isolation:isolate;box-shadow:${frame}` }) + marks.replace(/class="m dm" style="/g, `class="m dm" style="background:${g};`);
    };
    const rows = [0, 1, 2].map((i) => {
      const y0 = 72 + i * 192, r = rules[i];
      return hr(64, y0, 1152) + at(64, y0 + 14, 80, 16, `<span class="m i">T-04.${i + 1}</span>`)
        + at(64, y0 + 44, 300, 110, `<div class="d h2" style="font-size:24px;line-height:1.2">${r ? E(r.do) : ''}</div>`)
        + crop(i, true, 392, y0 + 6) + crop(i, false, 816, y0 + 6);
    }).join('');
    const dims = dim(ctx, 'h', 392, 62, W, W, { ground: g, ext: 4 }) + dim(ctx, 'h', 816, 62, W, W, { ground: g, ext: 4 });
    return sheet(ctx, 'type-rules', { ground: g, body: H1('Type rules', 64, 12, 300) + rows + dims, gridOpts: { y0: 72 } });
  },

  // ---- 23 Grid (FG): the slide's own grid drawn large, the A4 page's grid smaller, page 4 ghosted in both, dimensioned on every side ----
  grid(ctx) {
    const G = groundsOf(ctx), g = G.panel, paper = G.surface, t = tones(ctx, g), tp = tones(ctx, paper), M = ctx.gridMeasures, E = ctx.esc;
    const line = mix(paper, tp.ink, 0.34), tint = mix(paper, tp.dim, 0.09);
    // the slide: 1280 x 720 at 62 percent, its 12 x 6 module grid over a ghosted page 4
    const k = 0.62, X = 112, Y = 150, PW = 1280, PH = 720, w = PW * k, h = PH * k, gx = 64, gy = 72, mod = 96, gx1 = 1216, gy1 = 648;
    const slide = at(X, Y, w, h, `<div style="width:${PW}px;height:${PH}px;transform:scale(${k});transform-origin:0 0;opacity:${slotOn(ctx) ? 0.9 : 0.55}" data-contrast="demo">${asArt(p1.who(ctx), 'art-slide')}</div>`, { style: `background:${paper};overflow:hidden` });
    let sl = `<path fill-rule="evenodd" fill="${tint}" d="M0 0H${n1(w)}V${n1(h)}H0ZM${n1(gx * k)} ${n1(gy * k)}V${n1(gy1 * k)}H${n1(gx1 * k)}V${n1(gy * k)}Z"/><g stroke="${line}" stroke-width="1" fill="none">`;
    for (let i = 0; i <= 12; i++) sl += `<path d="M${n1((gx + i * mod) * k) + 0.5} ${n1(gy * k)}V${n1(gy1 * k)}"/>`;
    for (let j = 0; j <= 6; j++) sl += `<path d="M${n1(gx * k)} ${n1((gy + j * mod) * k) + 0.5}H${n1(gx1 * k)}"/>`;
    sl += `</g><rect x="${n1(gx * k) + 0.5}" y="${n1(gy * k) + 0.5}" width="${n1((gx1 - gx) * k)}" height="${n1((gy1 - gy) * k)}" fill="none" stroke="${tp.dim}" stroke-width="1"/>`;
    const slideOver = svgAt(X, Y, w, h, sl) + at(X, Y, w, h, '', { style: `box-shadow:0 0 0 1px ${t.ink}` })
      + field(ctx, X + gx * k, Y + gy * k, mod * k, mod * k, paper, '<span class="dm" style="position:absolute;left:0;right:0;top:50%;margin-top:-8px;text-align:center">96 x 96</span>', `box-shadow:inset 0 0 0 2px ${tp.dim}`);
    const sd = (dir, x, y, len, v) => dim(ctx, dir, x, y, len, v, { ground: g, ext: 5 });
    const slideDims = sd('h', X, Y - 24, w, PW) + sd('v', X - 24, Y, h, PH)
      + sd('h', X, Y + h + 26, gx * k, gx) + sd('h', X + gx * k, Y + h + 26, (gx1 - gx) * k, gx1 - gx) + sd('h', X + gx1 * k, Y + h + 26, (PW - gx1) * k, PW - gx1)
      + sd('v', X + w + 22, Y, gy * k, gy) + sd('v', X + w + 22, Y + gy * k, (gy1 - gy) * k, gy1 - gy) + sd('v', X + w + 22, Y + gy1 * k, (PH - gy1) * k, PH - gy1);
    // the A4 page: 794 x 1123 at 28 percent, its 12 columns over a ghosted page 4
    const PW2 = M.page.w, PH2 = M.page.h, k2 = 0.28, w2 = PW2 * k2, h2 = PH2 * k2, X2 = 1216 - w2, Y2 = 150, m2 = M.margin, c2 = M.col, g2 = M.gutter;
    const a4 = at(X2, Y2, w2, h2, `<div style="width:${PW2}px;height:${PH2}px;transform:scale(${k2});transform-origin:0 0;opacity:${slotOn(ctx) ? 0.9 : 0.55}" data-contrast="demo">${a4Page4(ctx, tp)}</div>`, { style: `background:${paper};overflow:hidden` });
    let cs = `<path fill-rule="evenodd" fill="${tint}" d="M0 0H${n1(w2)}V${n1(h2)}H0ZM${n1(m2 * k2)} ${n1(m2 * k2)}V${n1((PH2 - m2) * k2)}H${n1((PW2 - m2) * k2)}V${n1(m2 * k2)}Z"/>`;
    for (let i = 0; i < M.columns; i++) cs += `<rect x="${n1((m2 + i * (c2 + g2)) * k2) + 0.5}" y="${n1(m2 * k2)}" width="${n1(c2 * k2)}" height="${n1((PH2 - 2 * m2) * k2)}" fill="${line}" fill-opacity=".22" stroke="${line}" stroke-width="1"/>`;
    const a4Over = svgAt(X2, Y2, w2, h2, cs) + at(X2, Y2, w2, h2, '', { style: `box-shadow:0 0 0 1px ${t.ink}` });
    const a4Dims = sd('h', X2, Y2 - 24, w2, PW2) + sd('v', X2 - 24, Y2, h2, PH2);
    const gapX = X2 + (m2 + c2 + g2 / 2) * k2, tip = Y2 + (PH2 - m2) * k2 - 6;
    const a4Leader = leader(ctx, gapX, tip, gapX, Y2 + h2 + 26, `Column ${n1(c2)}, gutter ${g2}`);
    // the schedule: both grids side by side
    const rows = [['', 'Slide', 'A4'], ['Page', `${PW} x ${PH}`, `${PW2} x ${PH2}`], ['Margin', `${gx} | ${gy}`, `${m2}`], ['Columns', '12', `${M.columns}`], ['Module | col', `${mod}`, `${n1(c2)}`], ['Gutter', '0', `${g2}`], ['Base unit', '24', `${M.base}`]];
    const TX = 944, TY = 520, RH = 17;
    const table = rows.map((r, i) => hr(TX, TY + i * RH, 272, i ? 'var(--hair)' : 'var(--ink)')
      + at(TX, TY + i * RH + 1, 90, RH, `<span class="m${i ? '' : ' i'}">${r[0]}</span>`, { style: "line-height:16px" }) + at(TX + 90, TY + i * RH + 1, 98, RH, `<span class="m i" style="display:block;text-align:right">${r[1]}</span>`, { style: "line-height:16px" }) + at(TX + 188, TY + i * RH + 1, 84, RH, `<span class="m i" style="display:block;text-align:right">${r[2]}</span>`, { style: "line-height:16px" })).join('') + hr(TX, TY + rows.length * RH, 272, 'var(--ink)');
    const labels = at(X, 96, 560, 18, '<span class="m i">G-01.1</span><span class="lb" style="margin-left:12px">Slide, 12 x 6 modules, drawn at 62 percent</span>')
      + at(X2 - 24, 96, 300, 18, '<span class="m i">G-01.2</span><span class="lb" style="margin-left:12px">A4 page, 12 columns, 28 percent</span>');
    const head = H1('Grid', 64, 14, 200) + at(236, 32, 560, 44, `<div class="b">${E(copy(ctx, 'page.grid.note', 'Every page is drawn on one of two grids. Page 4 sits ghosted inside each.'))}</div>`);
    return sheet(ctx, 'grid', { ground: g, body: head + labels + slide + slideOver + slideDims + a4 + a4Over + a4Dims + a4Leader + table });
  },
};
