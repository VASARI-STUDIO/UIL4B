// Theme 24, Standards: the kit under the A4 style guide. The page is the measured manual at 794 x 1123: a running head with a 1 px rule, one dark thumb tab cut into the right edge,
// the x-ruler along the foot, hairline-ruled registers, dimension lines with slash ticks, and every size quoted in x (the brand's spacing base). Public Sans carries the chrome;
// the brand's faces appear only as the work. No shadow, no radius. Text is measured with the fonts' own metrics, so a page that cannot hold its content throws and the route leaves it out.
import { loadFont } from '../../engine/nodeFont.js';
import { PAGE, r1, sum, pageSection, stacker, headLabel, SLOT_MIN_H, logoArt } from '../../engine/guide-layout.js';
import { A, f2, pad3, xOf, half, roles, stxt } from './helpers.js';

export const { X0, XR, CW, COL, COLW } = PAGE;
// the lowest y content reaches, the height of a section header (its rule, its line and the gap under it), and the y of the foot ruler
export const BOT = 1040, SUBH = 36, RY = 1083;
export const NAME = { cover: 'Cover', logo: 'Logo', colour: 'Colour', ruler: 'Proportion', applied: 'Applied', type: 'Type', contrast: 'Contrast', tokens: 'Tokens', usage: 'Usage' };
export const CH = { 400: 'PublicSans-400', 600: 'PublicSans-600' };
export const cap1 = (s) => (s ? s[0].toUpperCase() + s.slice(1) : s);
export const pad2 = (n) => String(n || 0).padStart(2, '0');
export const pct = (s) => `${+((s ?? 0) * 100).toFixed(1)}%`;
const NUMBER_WORDS = ['No', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten'];
export const numberWord = (n) => NUMBER_WORDS[n] || String(n);
const WEIGHT_NAMES = { 100: 'Thin', 200: 'Extralight', 300: 'Light', 400: 'Regular', 500: 'Medium', 600: 'Semibold', 700: 'Bold', 800: 'Extrabold', 900: 'Black' };
export const weightName = (w) => WEIGHT_NAMES[w] || String(w);
export const listAnd = (xs) => (xs.length <= 1 ? xs.join('') : `${xs.slice(0, -1).join(', ')} and ${xs[xs.length - 1]}`);
export const longDate = (iso) => new Date(iso + 'T00:00:00Z').toLocaleDateString('en-AU', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });

// ---- measuring (the fonts' own advances and kerning, the way the browser sets a line) ----
export function tw(stem, text, size, track = 0) {
  const font = loadFont(stem);
  let x = 0, prev = null;
  for (const ch of String(text).replace(/\u00a0/g, ' ')) {
    const g = font.charToGlyph(ch);
    if (prev) { try { x += (font.getKerningValue(prev, g) * size) / font.unitsPerEm; } catch { /* no kerning table */ } }
    x += (g.advanceWidth * size) / font.unitsPerEm + track * size;
    prev = g;
  }
  return x;
}
// the lines a text takes in a box: greedy at the browser's own breaks, and a single run wider than the box counts the lines it will fold into (overflow-wrap:anywhere), so no text throws
export function nLines(stem, text, size, w, st = 1) {
  const wide = (s) => tw(stem, s, size) * st * 1.04;
  const fold = (s) => Math.max(0, Math.ceil(wide(s) / w) - 1);
  let n = 1, cur = '';
  for (const word of String(text).split(' ')) {
    const t = cur ? `${cur} ${word}` : word;
    if (cur && wide(t) > w) { n += fold(cur); n += 1; cur = word; } else cur = t;
  }
  return n + fold(cur);
}
export const stemOf = (ctx, role, weight) => {
  const fs = ctx.faces.filter((f) => f.role === role && f.style !== 'italic');
  const f = fs.find((x) => x.weight === weight) || fs.reduce((a, b) => (a && Math.abs(a.weight - weight) <= Math.abs(b.weight - weight) ? a : b), null);
  return f ? f.stem : CH[400];
};
// the lines of a sentence in a box, and the height they take
export const para = (text, w, { size = 13, lh = 20, stem = CH[400] } = {}) => ({ n: nLines(stem, text, size, w), h: nLines(stem, text, size, w) * lh });

// ---- the page's colours: theme 24's roles, plus the few the guide needs (cached on the ctx) ----
function palette(ctx) {
  if (ctx._ga24) return ctx._ga24;
  const R = { ...roles(ctx) }, g = R.ground, ok = (h) => ctx.C.isHex(h);
  R.q = R.quietOn(g);
  // the one outline: the hairline when it can be seen on the ground, else the quiet colour
  R.edge = ok(R.hair) && ctx.ratio(R.hair, g) >= 1.5 ? R.hair : R.q;
  R.near = (hex) => ctx.ratio(hex, g) < 1.5;
  const act = ctx.colours.find((c) => c.role === 'action');
  R.action = act ? act.hex : ctx.roles.light.action;
  // text on a coloured object: ink, the ground or the dark field's ink, whichever has the higher ratio (and passes)
  R.onColour = (bg, size = 13, weight = 400) => {
    const best = [R.ink, R.ground, R.darkInk].reduce((a, b) => (ctx.ratio(b, bg) > ctx.ratio(a, bg) ? b : a));
    const pick = ctx.textOn(bg, { size, weight, prefer: best });
    ctx.pair(pick, bg, { size, weight, what: '(Standards text on an object)' });
    return pick;
  };
  // the logo colourway to use on a ground: one drawn on that ground, else the colourway whose name colour reads best on it
  R.colourwayOn = (bg) => {
    const cw = ctx.brand.logo.colourways, keys = Object.keys(cw);
    return keys.find((k) => cw[k].ground.toLowerCase() === bg.toLowerCase()) || keys.reduce((a, b) => (ctx.ratio(cw[b].name, bg) > ctx.ratio(cw[a].name, bg) ? b : a));
  };
  return (ctx._ga24 = R);
}
export function kit(ctx) {
  const B = ctx.brand, d = B.fonts.display, R = palette(ctx);
  return {
    B, R, d, X: xOf(ctx), st: (d.stretch || 100) / 100,
    S: { disp: stemOf(ctx, 'display', ctx.weights.heading), body: stemOf(ctx, 'body', 400), mono: B.fonts.mono ? stemOf(ctx, 'mono', 400) : CH[400] },
  };
}
// the logo at a width; in the slot edition a frame too short to hold its word is drawn without the word (the page names it instead)
// This theme draws the placeholder mark larger than the shared frame does: about 40% of the slot's width, never more than 80% of its height,
// and without the "Your logo" line (the page names the slot instead). The frame itself is the shared one, untouched.
// o.h draws the slot taller than the logo's own proportion (a long name makes a very shallow frame); o.seat sits the mark on the frame's foot.
const bigMark = (html, w, h, own, seat) => {
  if (!html.includes('class="logo-slot"')) return html;
  const mw = Math.min(w * 0.4, h * 0.8 * (323.61 / 200)), mh = mw * (200 / 323.61);
  if (own) html = html.replace(/(class="logo-slot"[^>]*?height:)[\d.]+px/, (m, a) => `${a}${h}px`);
  if (seat) html = html.replace('justify-content:center', 'justify-content:flex-end');
  return html.replace(/(viewBox="0 0 323\.61 200" )width="[^"]*" height="[^"]*"/, (m, a) => `${a}width="${mw.toFixed(1)}" height="${mh.toFixed(1)}"`).replace(/<span[^>]*>Your logo<\/span>/, '');
};
export const art = (ctx, id, w, { h: own, seat, ...o } = {}) => {
  const g = ctx.logo.geos[id], h = own || (w * g.h) / g.w;
  if (ctx.edition !== 'slot') return logoArt(ctx, id, w, o);
  return bigMark(own || h < SLOT_MIN_H - 0.5 ? ctx.logo.html(id, { width: r1(w), ...o, label: '' }) : logoArt(ctx, id, w, o), w, h, !!own, seat);
};
// a length in x, to the half
export const inX = (K, px) => `${half(px / K.X)}x`;

// ---- placing things ----
export const at = (x, y, html, { w, cls = '', style = '' } = {}) => `<div class="a ${cls}" style="left:${r1(x)}px;top:${r1(y)}px;${w != null ? `width:${r1(w)}px;` : ''}${style}">${html}</div>`;
export const rect = (x, y, w, h, style = '', inner = '', cls = '') => `<div class="a ${cls}" style="left:${r1(x)}px;top:${r1(y)}px;width:${r1(w)}px;height:${r1(h)}px;${style}">${inner}</div>`;
// a 1 px rule
export const hr = (x, y, w, col) => rect(x, y, w, 1, `background:${col}`);
// an object: its fill, and a 1 px outline (drawn inside, so it never moves the contents) when asked or when the fill is close to the ground in tone
export const obj = (K, x, y, w, h, hex, inner = '', { frame = false, style = '' } = {}) => rect(x, y, w, h, `background:${hex};${frame || K.R.near(hex) ? `outline:1px solid ${K.R.edge};outline-offset:-1px;` : ''}${style}`, inner);
// a section header: an ink rule, the number, the name, and a note at the right
export function sec(K, x, y, w, no, name, note = '') {
  const nameW = 40 + tw(CH[600], name, 12), room = w - nameW - 24;
  return hr(x, y, w, K.R.ink)
    + at(x, y + 8, `<span class="ga-no">${A(no)}</span>${A(name)}`, { cls: 'ga-h' })
    + (note && room > 40 ? at(x + w - room, y + 8, A(note), { w: room, cls: 'ga-r ga-q ga-e', style: 'text-align:right' }) : '');
}
export const catNo = (ctx, id, i) => `${pad2(ctx.pageNo(id))}.${i}`;
// a register: rows ruled with hairlines, a key in the first column and a value in the second. rows: [[key, valueHtml, height]]
export function register(K, x, y, w, rows, { kw = 88 } = {}) {
  let yy = y, out = '';
  for (const [k, v, h] of rows) {
    out += hr(x, yy, w, K.R.edge) + at(x, yy + 4, A(k), { w: kw - 8, cls: 'ga-r ga-q', style: 'line-height:20px' }) + at(x + kw, yy + 4, v, { w: w - kw });
    yy += h;
  }
  return out + hr(x, yy, w, K.R.edge);
}

// ---- the foot ruler: a tick every x, longer at 4x and 16x, a label every 16x ----
function footRuler(K) {
  const x = K.X, R = K.R, n = Math.floor(CW / x), t = { h: '', q: '', i: '' };
  for (let k = 0; k <= n; k++) {
    const px = X0 + k * x, cls = k % 16 === 0 ? 'i' : k % 4 === 0 ? 'q' : 'h', hgt = cls === 'i' ? 10 : cls === 'q' ? 6 : 3;
    t[cls] += `M${f2(px + 0.5)} ${RY}v${-hgt}`;
  }
  let out = `<path d="${t.h}" stroke="${R.q}" stroke-opacity=".5" stroke-width="1" fill="none"/><path d="${t.q}" stroke="${R.q}" stroke-width="1" fill="none"/><path d="${t.i}" stroke="${R.ink}" stroke-width="1" fill="none"/>`
    + `<rect x="${X0}" y="${RY}" width="${n * x + 1}" height="1" fill="${R.ink}"/>`;
  for (let k = 0; k <= n; k += 16) out += stxt(X0 + k * x + 0.5, RY + 17, String(k), { anchor: 'middle', col: R.q, w: 400 });
  return out + stxt(X0 + n * x + 5, RY + 17, 'x', { col: R.q, w: 400 });
}

// ---- the page: running head, the work, the thumb tab, the foot ruler ----
export function shell(ctx, id, body, svg = '') {
  const K = kit(ctx), B = ctx.brand, R = K.R, n = ctx.pageNo(id) || 0, sec1 = `${pad2(n)} ${NAME[id]}`;
  const secW = Math.max(...Object.values(NAME).map((v) => tw(CH[600], `00 ${v}`, 12))), secX = Math.min(COL[1] + 60, COL[2] - 16 - Math.ceil(secW));
  const left = headLabel(B.name, (s) => tw(CH[600], s, 12) <= secX - X0 - 24, 'brand standards');
  const ver = /^\d/.test(B.version.number) ? `Version ${B.version.number}` : String(B.version.number);
  const slots = [[X0, left], [secX, sec1]];
  if (COL[2] + tw(CH[600], ver, 12) + 12 <= XR - 60) slots.push([COL[2], ver]);
  const head = hr(X0, 56, CW, R.ink) + slots.map(([x, t]) => at(x, 32, A(t), { cls: 'ga-h' })).join('')
    + at(XR - 60, 32, pad3(n), { w: 60, cls: 'ga-h', style: 'text-align:right' });
  const tab = rect(770, 88 + (Math.max(1, n) - 1) * 70, 24, 66, `background:${R.dark};color:${R.darkInk}`, String(n), 'ga-tab');
  return pageSection(id, head + body + tab + `<svg class="ov" width="${PAGE.W}" height="${PAGE.H}" viewBox="0 0 ${PAGE.W} ${PAGE.H}" aria-hidden="true">${svg}${footRuler(K)}</svg>`);
}
// the page title (its number and name, 20/24) and one quiet sentence under it: the first candidate that sets in two lines, else the last
export function title(ctx, K, id, cands) {
  const list = Array.isArray(cands) ? cands : [cands], W = 520;
  const pick = list.find((s) => nLines(CH[400], s, 13, W) <= 2) ?? list[list.length - 1], n = nLines(CH[400], pick, 13, W);
  return {
    html: at(X0, 84, `<span class="ga-tno">${pad2(ctx.pageNo(id))}</span>${A(NAME[id])}`, { cls: 'ga-t' }) + at(X0 + 56, 116, A(pick), { w: W, cls: 'ga-n ga-q' }),
    top: 116 + n * 20 + 32,
  };
}
export const flow = stacker({ theme: 'Standards', bottom: BOT, gapStretch: 1.5 });

export function guideCss(ctx) {
  const W = ctx.weights, d = ctx.brand.fonts.display, m = ctx.brand.fonts.mono, R = palette(ctx);
  return `/* Standards style guide: A4 portrait. The measured manual of the 1123 x 794 pages at page scale. */
.pg .ga-h{font:600 12px/16px var(--chrome);white-space:nowrap}
.pg .ga-r{font:400 12px/16px var(--chrome);text-wrap:pretty}
.pg .ga-n{font:400 13px/20px var(--chrome);overflow-wrap:anywhere;text-wrap:pretty}
.pg .ga-m{font-family:var(--mono);font-weight:${m ? m.weights[0] : 400};font-size:12px;line-height:16px;font-variant-numeric:tabular-nums;white-space:nowrap}
.pg .ga-t{font:600 20px/24px var(--chrome);letter-spacing:-.005em;white-space:nowrap}
.pg .ga-tno{display:inline-block;width:56px;color:${R.q};font-weight:400}
.pg .ga-no{display:inline-block;width:40px;color:${R.q};font-weight:400}
.pg .ga-d{font-family:var(--display);font-weight:${W.heading};font-stretch:${d.stretch || 100}%;overflow-wrap:anywhere;text-wrap:balance}
.pg .ga-body{font:${W.regular} 13px/20px var(--body);overflow-wrap:anywhere;text-wrap:pretty}
.pg .ga-q{color:${R.q}}
.pg .ga-e{white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.pg .ga-wrap{white-space:normal;overflow-wrap:anywhere}
.pg .ga-spec{white-space:nowrap;overflow:hidden;text-overflow:ellipsis;color:var(--ink)}
.pg .ga-nw{white-space:nowrap}
.pg .ga-tab{font:600 13px/16px var(--chrome);text-align:center;padding-top:10px}
`;
}
export { sum };
