// Theme 21, Keynote: the kit under the A4 style guide. The page is the deck's own grammar at 794 x 1123: a full-bleed field in the reversed colourway across the head, a running
// head with a three-digit folio, the page's name set once in the brand's display face, and registers ruled under a 2 px ink bar. Colour is shown as whole fields that meet at straight
// edges. Instrument Sans carries the chrome; the brand's faces appear only as the work. No shadow, no gradient. Text is measured with the fonts' own metrics, so a page that cannot
// hold its content throws and the route leaves it out.
import { loadFont } from '../../engine/nodeFont.js';
import { esc as A } from '../../engine/brand.js';
import { PAGE, r1, sum, pageSection, stacker, logoArt } from '../../engine/guide-layout.js';

export const { X0, XR, CW, COL, COLW } = PAGE;
// the height of the head field, the lowest y content reaches, and the height of a section header (its bar, number and name, with the gap under it before the content's own 8 px)
export const SLAB = 160, BOT = 1042, SUBH = 32;
export const NAME = { cover: 'Cover', logo: 'Logo', colour: 'Colour', ruler: 'Proportion', applied: 'Applied', type: 'Type', contrast: 'Contrast', tokens: 'Tokens', usage: 'Usage' };
export const CH = { 400: 'InstrumentSans-400', 500: 'InstrumentSans-500', 600: 'InstrumentSans-600' };
const f2 = (n) => +(+n).toFixed(2);
export const cap1 = (s) => (s ? s[0].toUpperCase() + s.slice(1) : s);
export const pad2 = (n) => String(n || 0).padStart(2, '0');
export const pad3 = (n) => String(n || 0).padStart(3, '0');
export const pct = (s) => `${+((Number.isFinite(+s) ? +s : 0) * 100).toFixed(1)}%`;
const NUMBER_WORDS = ['No', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten'];
export const numberWord = (n) => NUMBER_WORDS[n] || String(n);
const WEIGHT_NAMES = { 100: 'Thin', 200: 'Extralight', 300: 'Light', 400: 'Regular', 500: 'Medium', 600: 'Semibold', 700: 'Bold', 800: 'Extrabold', 900: 'Black' };
export const weightName = (w) => WEIGHT_NAMES[w] || String(w);
export const listAnd = (xs) => (xs.length <= 1 ? xs.join('') : `${xs.slice(0, -1).join(', ')} and ${xs[xs.length - 1]}`);
export const longDate = (iso) => { if (!iso) return ''; const d = new Date(iso + 'T00:00:00Z'); return Number.isNaN(+d) ? String(iso) : d.toLocaleDateString('en-AU', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' }); };
// a length printed as the true size it is
export const px = (n) => `${+(+n).toFixed(1)} px`;
// a number that must be finite: the fallback stands when a token parses to nothing
export const num = (v, fallback) => (Number.isFinite(+v) && v !== null && v !== '' ? +v : fallback);

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
// the lines a text takes in a box: greedy at the browser's own breaks, and a single run wider than the box counts the lines it will fold into (overflow-wrap:anywhere), so no text throws.
// A slot edition's copy is a placeholder string until the file is finished; it is measured as the short label the compact form prints (set by kit(ctx), pages build one at a time)
let LAB = (s) => s;
export function nLines(stem, text, size, w, st = 1) {
  const wide = (s) => tw(stem, s, size) * st * 1.04;
  const fold = (s) => Math.max(0, Math.ceil(wide(s) / Math.max(1, w)) - 1);
  let n = 1, cur = '';
  for (const word of String(LAB(String(text))).split(' ')) {
    const t = cur ? `${cur} ${word}` : word;
    if (cur && wide(t) > w) { n += fold(cur); n += 1; cur = word; } else cur = t;
  }
  return n + fold(cur);
}
// text cut to at most `max` lines in a box: the whole text when it fits, else the words that do, ending in an ellipsis (a single word wider than the box is cut by letters)
export function clampText(stem, text, size, w, max, st = 1) {
  const s = String(text);
  if (nLines(stem, s, size, w, st) <= max) return s;
  const words = s.split(/\s+/);
  let n = words.length;
  while (n > 1 && nLines(stem, words.slice(0, n).join(' ') + '…', size, w, st) > max) n--;
  let out = words.slice(0, n).join(' ').replace(/[,;:\s]+$/, '');
  while (out.length > 1 && nLines(stem, out + '…', size, w, st) > max) out = out.slice(0, -1);
  return out + '…';
}
// a box that shows at most n lines and clips the rest with an ellipsis, whatever the browser's own breaks turn out to be
export const clampCss = (n) => `display:-webkit-box;-webkit-box-orient:vertical;-webkit-line-clamp:${n};overflow:hidden;white-space:normal;overflow-wrap:anywhere`;
// the colours of a palette with each hex once: a role that repeats an earlier colour's hex is added to that colour's role (and its share) rather than drawn as a second field
export function uniqueColours(F) {
  const out = [], seen = new Map();
  for (const f of F) {
    const k = String(f.hex).toLowerCase(), first = seen.get(k);
    if (!first) { const c = { ...f }; seen.set(k, c); out.push(c); continue; }
    if (f.role && !String(first.role).split(', ').includes(f.role)) first.role = first.role ? `${first.role}, ${f.role}` : f.role;
    if (typeof first.share === 'number' && typeof f.share === 'number') first.share += f.share;
  }
  return out;
}
export const stemOf = (ctx, role, weight) => {
  const fs = ctx.faces.filter((f) => f.role === role && f.style !== 'italic');
  const f = fs.find((x) => x.weight === weight) || fs.reduce((a, b) => (a && Math.abs(a.weight - weight) <= Math.abs(b.weight - weight) ? a : b), null);
  return f ? f.stem : CH[400];
};
// the lines of a sentence in a box, and the height they take
export const para = (text, w, { size = 13, lh = 20, stem = CH[400] } = {}) => { const n = nLines(stem, text, size, w); return { n, h: n * lh }; };

// ---- the page's colours: the few the guide needs from the brand (cached on the ctx) ----
function palette(ctx) {
  if (ctx._gk21) return ctx._gk21;
  const L = ctx.roles.light, ok = (h) => ctx.C.isHex(h), rev = (ctx.brand.logo.colourways && ctx.brand.logo.colourways.reversed) || {};
  const R = {};
  R.ink = ok(L.text) ? L.text : '#000000';
  // the dark field is the reversed colourway's ground; its ink is the first of the reversed name, the surface and white and black that reads at 4.5 : 1 on it
  R.dark = ok(rev.ground) ? rev.ground : R.ink;
  const dInks = [rev.name, L.surface, '#ffffff', '#000000'].filter(ok);
  R.darkInk = dInks.find((h) => ctx.ratio(h, R.dark) >= 4.5) || dInks.reduce((a, b) => (ctx.ratio(b, R.dark) > ctx.ratio(a, R.dark) ? b : a));
  ctx.pair(R.darkInk, R.dark, { size: 12, weight: 500, what: '(Keynote guide text on the dark field)' });
  // the grey for captions: the brand's own quiet ink when it reads at 4.5 : 1 on the page and on a sunken panel, else its soft ink, else its text
  const onBoth = (h) => ctx.ratio(h, L.surface) >= 4.5 && (!ok(L.sunken) || ctx.ratio(h, L.sunken) >= 4.5);
  R.quiet = [L.quiet, L.textSoft, L.text].filter(ok).find(onBoth) || R.ink;
  R.hair = ok(L.divider) ? L.divider : R.quiet;
  R.edge = R.quiet;
  // the plate the brand's own colour logo is drawn on (an object's ground), else the brand's raised surface, else its surface
  const cw = ctx.brand.logo.colourways, g = cw && cw.colour && cw.colour.ground;
  R.ground = ok(g) ? g : ok(L.raised) ? L.raised : L.surface;
  R.near = (hex) => ctx.ratio(hex, L.surface) < 1.5;
  const act = ctx.colours.find((c) => c.role === 'action');
  R.action = act && ok(act.hex) ? act.hex : L.action;
  // text on a coloured field: the brand's ink or surface, whichever reaches 4.5 : 1 (else the one that comes nearest)
  R.onColour = (bg, size = 13, weight = 400) => {
    const cands = [R.ink, L.surface, L.text, R.darkInk].filter(ok), best = cands.reduce((a, b) => (ctx.ratio(b, bg) > ctx.ratio(a, bg) ? b : a));
    let pick = ctx.textOn(bg, { size, weight, prefer: best });
    if (!ok(pick) || ctx.ratio(pick, bg) < 4.5) pick = cands.concat(['#000000', '#ffffff']).find((h) => ctx.ratio(h, bg) >= 4.5) || best;
    ctx.pair(pick, bg, { size, weight, what: '(Keynote guide text on a field)' });
    return pick;
  };
  // text on a swatch: the nearer to black or to white, whichever has the higher ratio (the brand's own ink and surface count as the black-ish and the white-ish)
  R.bestInk = (bg, size = 13, weight = 500) => {
    const cands = [R.ink, L.surface, '#111111', '#ffffff'].filter(ok);
    let pick = cands.reduce((a, b) => (ctx.ratio(b, bg) > ctx.ratio(a, bg) ? b : a));
    // a mid-tone swatch can leave every one of those under 4.5 : 1; pure black or white then, whichever reads better
    if (ctx.ratio(pick, bg) < 4.5) pick = ctx.ratio('#000000', bg) >= ctx.ratio('#ffffff', bg) ? '#000000' : '#ffffff';
    ctx.pair(pick, bg, { size, weight, what: '(Keynote guide text on a swatch)' });
    return pick;
  };
  // the logo colourway to use on a ground: one drawn on that ground, else the colourway whose name colour reads best on it
  R.colourwayOn = (bg) => {
    const ways = ctx.brand.logo.colourways, keys = Object.keys(ways);
    return keys.find((k) => String(ways[k].ground).toLowerCase() === String(bg).toLowerCase()) || keys.reduce((a, b) => (ctx.ratio(ways[b].name, bg) > ctx.ratio(ways[a].name, bg) ? b : a));
  };
  return (ctx._gk21 = R);
}
export function kit(ctx) {
  const B = ctx.brand, d = B.fonts.display, R = palette(ctx);
  LAB = ctx.placeholders && ctx.placeholders.label ? ctx.placeholders.label : (s) => s;
  return {
    B, R, d, st: num(d.stretch, 100) / 100,
    S: { disp: stemOf(ctx, 'display', ctx.weights.heading), body: stemOf(ctx, 'body', 400), mono: B.fonts.mono ? stemOf(ctx, 'mono', 400) : CH[400] },
  };
}

// the logo at a width. The slot edition draws this theme's own placeholder, not the engine's watermark (36% of the width, and it ignores the height): the mark is the largest that
// fits its frame at the mark's own proportion, never under 40 px wide, so a dimension line measures a mark that is drawn. A slot page asks for a frame of that proportion (slotH).
const MARK = { w: 323.61, h: 200, paths: ['M0 0H100V123.61A123.61 123.61 0 0 0 126.43 200H76.39A76.39 76.39 0 0 1 0 123.61Z', 'M125 0H177.79A47.21 47.21 0 0 1 225 47.21V125H276.39A47.21 47.21 0 0 1 323.61 172.21V200H201.39A76.39 76.39 0 0 1 125 123.61Z'] };
export const MARK_MIN_W = 40;
export const slotH = (w) => (w * MARK.h) / MARK.w;
export function slotMark(ctx, id, w, o = {}) {
  const g = ctx.logo.geos[id], h = o.h != null ? o.h : (w * g.h) / g.w, asp = MARK.w / MARK.h;
  const mw = Math.min(w, Math.max(MARK_MIN_W, Math.min(w, h * asp)));
  return { w, h, mw, mh: mw / asp };
}
// the width the mark is drawn at: what a dimension line reads
export const drawnW = (ctx, id, w, o = {}) => (ctx.edition === 'slot' ? slotMark(ctx, id, w, o).mw : w);
export const art = (ctx, id, w, o = {}) => {
  if (ctx.edition !== 'slot') return logoArt(ctx, id, w, o);
  const m = slotMark(ctx, id, w, o), ink = o.color || 'currentColor';
  const mark = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${MARK.w} ${MARK.h}" width="${r1(m.mw)}" height="${r1(m.mh)}" aria-hidden="true" focusable="false" style="display:block;flex:none;opacity:.55">${MARK.paths.map((d) => `<path d="${d}" fill="currentColor"/>`).join('')}</svg>`;
  return `<div class="logo-slot" role="img" aria-label="Logo placeholder" style="width:${r1(w)}px;height:${r1(m.h)}px;box-sizing:border-box;color:${ink};display:flex;align-items:center;justify-content:center;overflow:hidden${o.frame ? ';outline:1px dashed currentColor;outline-offset:-1px' : ''}">${mark}</div>`;
};

// ---- placing things ----
export const at = (x, y, html, { w, cls = '', style = '' } = {}) => `<div class="a ${cls}" style="left:${r1(x)}px;top:${r1(y)}px;${w != null ? `width:${r1(w)}px;` : ''}${style}">${html}</div>`;
export const rect = (x, y, w, h, style = '', inner = '', cls = '') => `<div class="a ${cls}" style="left:${r1(x)}px;top:${r1(y)}px;width:${r1(w)}px;height:${r1(h)}px;${style}">${inner}</div>`;
// a 1 px rule
export const hr = (x, y, w, col) => rect(x, y, w, 1, `background:${col}`);
// an object: its fill, and a 1 px outline (drawn inside, so it never moves the contents) when asked or when the fill is close to the page in tone
export const obj = (K, x, y, w, h, hex, inner = '', { frame = false, style = '' } = {}) => rect(x, y, w, h, `background:${hex};${frame || K.R.near(hex) ? `outline:1px solid ${K.R.edge};outline-offset:-1px;` : ''}${style}`, inner);
// a section header: a 2 px ink bar, the number and the name under it, and a quiet note at the right
export function sec(K, x, y, w, no, name, note = '') {
  const nameW = Math.ceil(tw(CH[600], name, 15)), noteW = note ? Math.ceil(tw(CH[400], note, 12)) : 0, lead0 = x + 30 + nameW + 12;
  const showNote = note && x + w - noteW - lead0 >= 16;
  return rect(x, y, w, 2, `background:${K.R.ink}`)
    + at(x, y + 9, A(no), { cls: 'gk-m gk-q' })
    + at(x + 30, y + 8, A(name), { cls: 'gk-h' })
    + (showNote ? at(x + w - noteW, y + 10, A(note), { cls: 'gk-r gk-q gk-nw' }) : '');
}
// a register: rows ruled with hairlines, a key in the first column and a value in the second. rows: [[key, valueHtml, height]]
export function register(K, x, y, w, rows, { kw = 88 } = {}) {
  let yy = y, out = '';
  for (const [k, v, h] of rows) {
    out += hr(x, yy, w, K.R.hair) + at(x, yy + 4, A(k), { w: kw - 8, cls: 'gk-r gk-q', style: 'line-height:20px' }) + at(x + kw, yy + 4, v, { w: w - kw });
    yy += h;
  }
  return out + hr(x, yy, w, K.R.hair);
}

// ---- measure lines: ink with an end tick, a tabular value; print a true size only ----
const INK = 'var(--ink)';
const ln = (x1, y1, x2, y2) => `<path d="M${f2(x1)} ${f2(y1)}L${f2(x2)} ${f2(y2)}" stroke="${INK}" stroke-width="1" fill="none"/>`;
const val = (x, y, text, anchor = 'start') => `<text x="${f2(x)}" y="${f2(y)}" text-anchor="${anchor}" fill="${INK}" style="font:500 12px var(--chrome);font-variant-numeric:tabular-nums">${A(text)}</text>`;
const valW = (t) => tw(CH[500], t, 12);
// a horizontal measure: the line at y from x1 to x2 with a square end tick, the value centred with the line broken round it (past the far tick when it does not fit).
// obj is the y of the object's edge: guide lines start 4 px off it and run 6 px past the line.
export function dimH({ x1, x2, y, label, obj: o }) {
  const w0 = valW(label), mid = (x1 + x2) / 2, fits = x2 - x1 >= w0 + 12 + 16;
  let s = '';
  if (o != null) { const sg = Math.sign(y - o) || 1; for (const X of [x1, x2]) s += ln(X + 0.5, o + sg * 4, X + 0.5, y + sg * 6); }
  if (fits) s += ln(x1, y, mid - w0 / 2 - 6, y) + ln(mid + w0 / 2 + 6, y, x2, y) + val(mid, y + 4, label, 'middle');
  else s += ln(x1, y, x2, y) + val(x2 + 10, y + 4, label);
  return s + ln(x1 + 0.5, y - 4, x1 + 0.5, y + 4) + ln(x2 + 0.5, y - 4, x2 + 0.5, y + 4);
}
// a vertical measure: the line at x from y1 to y2, the value to its left (right: to its right)
export function dimV({ x, y1, y2, label, obj: o, right = false }) {
  let s = '';
  if (o != null) { const sg = Math.sign(x - o) || 1; for (const Y of [y1, y2]) s += ln(o + sg * 4, Y + 0.5, x + sg * 6, Y + 0.5); }
  s += ln(x + 0.5, y1, x + 0.5, y2) + ln(x - 4, y1 + 0.5, x + 5, y1 + 0.5) + ln(x - 4, y2 + 0.5, x + 5, y2 + 0.5);
  return s + val(right ? x + 10 : x - 10, (y1 + y2) / 2 + 4, label, right ? 'start' : 'end');
}

// a page's number and the total: its place among the pages actually drawn (lane-guide.js finds them in a dry pass and keeps them on ctx._g21ids), so a page left out is not
// counted; before that pass the engine's own numbering stands
const folioOf = (ctx, id) => {
  const ids = ctx._g21ids, i = ids ? ids.indexOf(id) : -1;
  return i >= 0 ? { n: i + 1, total: ids.length } : { n: ctx.pageNo(id) || 0, total: Object.keys(NAME).length };
};
// the page: the dark head field with its running head, the work, a foot line, and the page's measure lines over everything. The cover is the dark field the whole way down.
export function shell(ctx, id, body, svg = '', { cover = false } = {}) {
  const B = ctx.brand, { n, total } = folioOf(ctx, id), R = palette(ctx), ink = R.darkInk;
  const slab = rect(0, 0, PAGE.W, cover ? PAGE.H : SLAB, `background:${R.dark}`);
  const head = at(X0, 24, `<span class="gk-n" style="color:${ink}">${pad2(n)}</span><span style="margin-left:14px">${A(NAME[id])}</span>`, { w: 190, cls: 'gk-hd gk-e', style: `color:${ink}` })
    + at(X0 + 210, 24, A(`${B.name} style guide`), { w: CW - 210 - 96, cls: 'gk-hd gk-e', style: `text-align:right;color:${ink}` })
    + at(XR - 80, 24, `${pad3(n)} / ${pad3(total)}`, { w: 80, cls: 'gk-m gk-fo', style: `text-align:right;color:${ink}` });
  const ver = String(B.version.number);
  const foot = cover ? '' : hr(X0, 1066, CW, R.hair) + at(X0, 1076, A(B.name), { w: 440, cls: 'gk-r gk-q gk-e' }) + at(XR - 200, 1076, A(`Version ${ver}`), { w: 200, cls: 'gk-r gk-q gk-e', style: 'text-align:right' });
  return pageSection(id, `${slab}${head}${body}${foot}<svg class="a" style="left:0;top:0" width="${PAGE.W}" height="${PAGE.H}" viewBox="0 0 ${PAGE.W} ${PAGE.H}" fill="none" aria-hidden="true">${svg}</svg>`);
}
// the page title: the page's name in the display face, set once in the head field at the left, and one sentence in the body face at the right, both standing on the field's foot.
// The sentence is the first candidate that sets in three lines, else the last.
const TITLE_SIZES = [56, 50, 44, 40, 36, 32, 28, 24], TITLE_W = 340, LEAD_X = 412, LEAD_W = 334;
export function title(ctx, K, id, cands) {
  const { R, S } = K, list = Array.isArray(cands) ? cands : [cands];
  const word = NAME[id], sz = TITLE_SIZES.find((s) => tw(S.disp, word, s) * K.st * 1.04 <= TITLE_W) || 24, lh = Math.round(sz * 1.05);
  const pick = list.find((s) => nLines(S.body, s, 14, LEAD_W) <= 3) ?? list[list.length - 1], n = Math.min(3, nLines(S.body, pick, 14, LEAD_W));
  const base = SLAB - 24;
  return {
    html: at(X0, base - lh, A(word), { w: TITLE_W, cls: 'gk-d', style: `font-size:${sz}px;line-height:${lh}px;color:${R.darkInk};white-space:nowrap` })
      + at(LEAD_X, base - n * 22, A(pick), { w: LEAD_W, cls: 'gk-body', style: `font-size:14px;line-height:22px;color:${R.darkInk}` }),
    top: SLAB + 28,
  };
}
export const flow = stacker({ theme: 'Keynote', bottom: BOT });

export function guideCss(ctx) {
  const W = ctx.weights, d = ctx.brand.fonts.display, b = ctx.brand.fonts.body, m = ctx.brand.fonts.mono, Lt = ctx.roles.light, R = palette(ctx);
  const darkInk = R.darkInk;
  return `/* Keynote style guide: A4 portrait. A dark head field, a running head and folio, ruled registers, whole fields of colour. */
.pg{--quiet:${R.quiet};--hair:${R.hair};--bmono:'${(m || b).family}',monospace}
.pg .a{position:absolute;box-sizing:border-box}
.pg .gk-h{font:600 15px/20px var(--chrome);white-space:nowrap}
.pg .gk-hd{font:500 12px/16px var(--chrome);letter-spacing:.01em;white-space:nowrap}
.pg .gk-r{font:400 12px/16px var(--chrome);letter-spacing:.01em;text-wrap:pretty}
.pg .gk-n{font:400 13px/20px var(--chrome);overflow-wrap:anywhere;text-wrap:pretty}
.pg .gk-v{font:500 13px/18px var(--chrome)}
.pg .gk-m{font:400 12px/16px var(--chrome);font-variant-numeric:tabular-nums;white-space:nowrap;color:var(--ink)}
.pg .gk-fo{font-weight:500}
.pg .gk-d{font-family:var(--display);font-weight:${W.heading};font-stretch:${num(d.stretch, 100)}%;letter-spacing:-.01em;overflow-wrap:anywhere;text-wrap:balance}
/* the cover statement in the template edition: the placeholder sets at the statement size, without its dashed box */
.pg .gk-cv .ph-b{border:0;padding:0}
.pg .gk-cv .ph-w{font-size:1em;line-height:inherit}
/* on the applied objects each placeholder field stands on its own line, with room around its words */
.pg .gk-ap .ph-c{display:block;width:fit-content;max-width:100%;box-sizing:border-box;padding:2px 8px;margin:0 0 6px;line-height:18px}
.pg .gk-body{font:${W.regular} 13px/20px var(--body);overflow-wrap:anywhere;text-wrap:pretty}
.pg .gk-bm{font-family:var(--bmono);font-weight:${m ? m.weights[0] : 400};font-size:12px;line-height:16px;white-space:nowrap}
.pg .gk-q{color:var(--quiet)}
.pg .gk-e{white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.pg .gk-wrap{white-space:normal;overflow-wrap:anywhere}
.pg .gk-spec{white-space:nowrap;overflow:hidden;text-overflow:ellipsis;color:var(--ink)}
.pg .gk-nw{white-space:nowrap}
/* the phone edition keeps the deck's look in light: each heading is a full-width field in the reversed colourway with its number, the display face leads, and the caption grey is the
   brand's own unless it misses 4.5:1 on the ground. */
@media screen and (max-width:841px){
main.sg-screen{counter-reset:sgno;overflow-wrap:anywhere;--quiet:${R.quiet};--dark:${R.dark};--dark-ink:${darkInk}}
main.sg-screen .sg-wrap{box-sizing:border-box;padding:20px 16px 0}
main.sg-screen .sg-wrap::after{content:'Keynote style guide';display:block;margin:32px -16px 0;padding:14px 16px;background:var(--dark);color:var(--dark-ink);font:500 12px/16px 'Instrument Sans',sans-serif}
main.sg-screen h1 .ph-c{margin-right:10px;margin-bottom:6px;vertical-align:.15em}
main.sg-screen h2{counter-increment:sgno;display:flex;align-items:baseline;gap:14px;margin:32px -16px 16px;padding:14px 16px;border:0;background:var(--dark);color:var(--dark-ink);font:600 15px/22px 'Instrument Sans',sans-serif}
main.sg-screen h2::before{content:counter(sgno,decimal-leading-zero);flex:none;font:500 12px/22px 'Instrument Sans',sans-serif;font-variant-numeric:tabular-nums}
main.sg-screen div:has(> .sg-tile + p.sg-quiet){display:grid;grid-template-columns:112px 1fr;gap:8px 12px;align-items:center}
main.sg-screen div:has(> .sg-tile + p.sg-quiet) .sg-tile{margin:0;padding:8px;min-height:56px;min-width:0;overflow:hidden;justify-content:center}
main.sg-screen div:has(> .sg-tile + p.sg-quiet) .logo-slot{width:100%!important;height:40px!important}
main.sg-screen div:has(> .sg-tile + p.sg-quiet) p.sg-quiet{margin:0!important}
}
`;
}
export { sum };
