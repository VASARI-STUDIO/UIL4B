// Theme 22, Stub: the kit under the A4 style guide. The page is the slide's own ticket turned upright at 794 x 1123: the bar-top colour runs full bleed, a paper plate stands on it
// with the work, and a perforation of round holes with a die-cut notch at each end divides the plate from a stub in the brand's field colour. The stub holds the only chrome: a
// serial that is the page's number among the pages drawn, the brand and the page's name, and a Code 128 barcode of the brand's id and that serial. Sections open with a numbered
// field chip and a dotted rule; registers are ruled in dotted hairlines. The brand's body face carries the chrome; the display face sets each page's name once. No shadow, no
// gradient. Text is measured with the fonts' own metrics, so a page that cannot hold its content throws and the route leaves it out.
import { loadFont } from '../../engine/nodeFont.js';
import { esc as A } from '../../engine/brand.js';
import { PAGE, r1, sum, pageSection, stacker, logoArt } from '../../engine/guide-layout.js';
import { roles, barcodeRects, slugOf } from './helpers.js';

export const { X0, XR, CW, COL, COLW } = PAGE;
// the plate (x 24 to 770, y 24 to the perforation), the perforation's y, the stub's foot, the lowest y content reaches, and the height of a section header
export const PL = 24, PR = 770, PT = 24, PERF = 1004, STUB_B = 1099, BOT = 980, SUBH = 32;
export const NAME = { cover: 'Cover', logo: 'Logo', colour: 'Colour', ruler: 'Proportion', applied: 'Applied', type: 'Type', contrast: 'Contrast', tokens: 'Tokens', usage: 'Usage' };
// the chrome face's stems by weight: the brand's body face (set by kit(ctx); pages build one at a time)
export const CH = { 400: 'WorkSans-400', 500: 'WorkSans-500', 600: 'WorkSans-600' };
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
// A slot edition's copy is a placeholder string until the file is finished; it is measured as the short label the compact form prints (set by kit(ctx))
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
  if (ctx._gk22) return ctx._gk22;
  const L = ctx.roles.light, ok = (h) => ctx.C.isHex(h), T = roles(ctx);
  const R = { table: T.table, field: T.field, fieldInk: T.fieldInk, paper: T.paper };
  ctx.pair(R.fieldInk, R.field, { size: 12, weight: 500, what: '(Stub guide text on the stub)' });
  // the ink on the paper plate: the brand's own text colour when it reads on the paper, else the nearest that does
  R.ink = ctx.textOn(R.paper, { size: 13, weight: 400, prefer: ok(L.text) ? L.text : R.table });
  ctx.pair(R.ink, R.paper, { size: 13, weight: 400, what: '(Stub guide text on the plate)' });
  // the plate a colour logo is drawn on (an object's ground), else the paper
  const cw = ctx.brand.logo.colourways, g = cw && cw.colour && cw.colour.ground;
  R.ground = ok(g) ? g : R.paper;
  // the grey for captions: the brand's own quiet ink when it reads at 4.5 : 1 on the paper and on the logo plate, else its soft ink, else the ink
  const onBoth = (h) => ctx.ratio(h, R.paper) >= 4.5 && ctx.ratio(h, R.ground) >= 4.5;
  R.quiet = [L.quiet, L.textSoft, L.text].filter(ok).find(onBoth) || R.ink;
  R.hair = R.quiet;
  R.edge = R.quiet;
  R.near = (hex) => ctx.ratio(hex, R.paper) < 1.5;
  const act = ctx.colours.find((c) => c.role === 'action');
  R.action = act && ok(act.hex) ? act.hex : L.action;
  // the bar top and the ink that reads on it (used where a page sets a dark square or a dark field)
  R.dark = R.table;
  R.darkInk = ctx.textOn(R.table, { size: 12, weight: 500, prefer: R.paper });
  ctx.pair(R.darkInk, R.dark, { size: 12, weight: 500, what: '(Stub guide text on the bar top)' });
  // text on a coloured field: the brand's ink or paper, whichever reaches 4.5 : 1 (else the one that comes nearest)
  R.onColour = (bg, size = 13, weight = 400) => {
    const cands = [R.ink, R.paper, R.table].filter(ok), best = cands.reduce((a, b) => (ctx.ratio(b, bg) > ctx.ratio(a, bg) ? b : a));
    let pick = ctx.textOn(bg, { size, weight, prefer: best });
    if (!ok(pick) || ctx.ratio(pick, bg) < 4.5) pick = cands.concat(['#000000', '#ffffff']).find((h) => ctx.ratio(h, bg) >= 4.5) || best;
    ctx.pair(pick, bg, { size, weight, what: '(Stub guide text on a field)' });
    return pick;
  };
  // text on a swatch: the nearer to black or to white, whichever has the higher ratio (the brand's own ink and paper count as the black-ish and the white-ish)
  R.bestInk = (bg, size = 13, weight = 500) => {
    const cands = [R.ink, R.paper, '#111111', '#ffffff'].filter(ok), pick = cands.reduce((a, b) => (ctx.ratio(b, bg) > ctx.ratio(a, bg) ? b : a));
    ctx.pair(pick, bg, { size, weight, what: '(Stub guide text on a swatch)' });
    return pick;
  };
  // the logo colourway to use on a ground: one drawn on that ground, else the colourway whose name colour reads best on it
  R.colourwayOn = (bg) => {
    const ways = ctx.brand.logo.colourways, keys = Object.keys(ways);
    return keys.find((k) => String(ways[k].ground).toLowerCase() === String(bg).toLowerCase()) || keys.reduce((a, b) => (ctx.ratio(ways[b].name, bg) > ctx.ratio(ways[a].name, bg) ? b : a));
  };
  return (ctx._gk22 = R);
}
export function kit(ctx) {
  const B = ctx.brand, d = B.fonts.display, R = palette(ctx);
  LAB = ctx.placeholders && ctx.placeholders.label ? ctx.placeholders.label : (s) => s;
  for (const w of [400, 500, 600]) CH[w] = stemOf({ faces: ctx.faces }, 'body', w);
  return {
    B, R, d, st: num(d.stretch, 100) / 100,
    S: { disp: stemOf(ctx, 'display', ctx.weights.heading), body: stemOf(ctx, 'body', 400), mono: B.fonts.mono ? stemOf(ctx, 'mono', 400) : CH[400] },
  };
}

// the logo at a width. The template edition's placeholder is the engine's own UIL4B watermark: this theme adds nothing to it. slotH is the frame height a slot page asks for at a width
export const slotH = (w) => (w * 200) / 323.61;
export const drawnW = (ctx, id, w) => w;
export const art = (ctx, id, w, o = {}) => logoArt(ctx, id, w, o);

// ---- placing things ----
export const at = (x, y, html, { w, cls = '', style = '' } = {}) => `<div class="a ${cls}" style="left:${r1(x)}px;top:${r1(y)}px;${w != null ? `width:${r1(w)}px;` : ''}${style}">${html}</div>`;
export const rect = (x, y, w, h, style = '', inner = '', cls = '') => `<div class="a ${cls}" style="left:${r1(x)}px;top:${r1(y)}px;width:${r1(w)}px;height:${r1(h)}px;${style}">${inner}</div>`;
// a 1 px dotted rule: the perforation the sheet is ruled with
export const hr = (x, y, w, col) => rect(x, y, w, 1, `border-top:1px dotted ${col}`);
// an object: its fill, and a 1 px outline (drawn inside, so it never moves the contents) when asked or when the fill is close to the paper in tone
export const obj = (K, x, y, w, h, hex, inner = '', { frame = false, style = '' } = {}) => rect(x, y, w, h, `background:${hex};${frame || K.R.near(hex) ? `outline:1px solid ${K.R.edge};outline-offset:-1px;` : ''}${style}`, inner);
// a section header: a field chip with the number, the name beside it, a dotted rule running out to a quiet note at the right
export function sec(K, x, y, w, no, name, note = '') {
  const R = K.R, nameW = Math.ceil(tw(CH[600], name, 15)), noteW = note ? Math.ceil(tw(CH[400], note, 12)) : 0, lead0 = x + 38 + nameW + 12;
  const showNote = note && x + w - noteW - 12 - lead0 >= 24, ruleEnd = showNote ? x + w - noteW - 12 : x + w;
  return rect(x, y, 28, 22, `background:${R.field}`, `<div class="tk-m" style="line-height:22px;text-align:center;font-weight:500;color:${R.fieldInk}">${A(no)}</div>`)
    + at(x + 38, y + 1, A(name), { cls: 'tk-h' })
    + (ruleEnd - lead0 >= 16 ? rect(lead0, y + 10, ruleEnd - lead0, 2, `border-top:2px dotted ${R.ink}`) : '')
    + (showNote ? at(x + w - noteW, y + 3, A(note), { cls: 'tk-r tk-q tk-nw' }) : '');
}
// a register: rows ruled with hairlines, a key in the first column and a value in the second. rows: [[key, valueHtml, height]]
export function register(K, x, y, w, rows, { kw = 88 } = {}) {
  let yy = y, out = '';
  for (const [k, v, h] of rows) {
    out += hr(x, yy, w, K.R.hair) + at(x, yy + 4, A(k), { w: kw - 8, cls: 'tk-r tk-q', style: 'line-height:20px' }) + at(x + kw, yy + 4, v, { w: w - kw });
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

// a page's number and the total: its place among the pages actually drawn (lane-guide.js finds them in a dry pass and keeps them on ctx._g22ids), so a page left out is not
// counted; before that pass the engine's own numbering stands
const folioOf = (ctx, id) => {
  const ids = ctx._g22ids, i = ids ? ids.indexOf(id) : -1;
  return i >= 0 ? { n: i + 1, total: ids.length } : { n: ctx.pageNo(id) || 0, total: Object.keys(NAME).length };
};
// the ticket's device: the bar top, the paper plate, the stub, then the holes, the notches and the barcode drawn over them
function device(ctx, R, id, n, total, cover) {
  const B = ctx.brand, serial = pad3(n), ver = String(B.version.number);
  const code = `${slugOf(ctx).slice(0, 14)}-${serial}`, BCW = 220, BCH = 40, bc = barcodeRects(code, 0, 0, BCW, BCH, R.fieldInk), bx = XR - bc.width;
  const holes = [];
  for (let x = PL + 22; x <= PR - 22; x += 14) holes.push(`<circle cx="${x}" cy="${PERF}" r="4"/>`);
  const svg = `<svg class="a" style="left:0;top:0" width="${PAGE.W}" height="${PAGE.H}" viewBox="0 0 ${PAGE.W} ${PAGE.H}" aria-hidden="true"><g fill="${R.table}">${holes.join('')}<circle cx="${PL}" cy="${PERF}" r="11"/><circle cx="${PR}" cy="${PERF}" r="11"/></g>`
    + `<g transform="translate(${r1(bx)} ${PERF + 16})">${bc.svg}</g></svg>`;
  const nameW = bx - 24 - 150, ink = `color:${R.fieldInk}`;
  return rect(0, 0, PAGE.W, PAGE.H, `background:${R.table}`) + rect(PL, PT, PR - PL, PERF - PT, `background:${R.paper}`) + rect(PL, PERF, PR - PL, STUB_B - PERF, `background:${R.field}`) + svg
    + at(X0, PERF + 12, 'No.', { cls: 'tk-hd', style: ink })
    + at(X0, PERF + 26, `<span class="tk-no">${serial}</span>`, { cls: 'tk-fo', style: ink })
    + at(150, PERF + 16, A(B.name), { w: nameW, cls: 'tk-h tk-e', style: ink })
    + at(150, PERF + 38, A(cover ? 'Brand style guide' : NAME[id]), { w: nameW, cls: 'tk-hd tk-e', style: ink })
    + at(150, PERF + 58, A(`Version ${ver}, ${n} of ${total}`), { w: nameW, cls: 'tk-hd tk-e', style: ink })
    + at(bx, PERF + 16 + BCH + 6, A(code), { w: bc.width, cls: 'tk-bm tk-e', style: `${ink};text-align:center` });
}
// the page: the ticket, the work, and the page's measure lines over everything
export function shell(ctx, id, body, svg = '', { cover = false } = {}) {
  const R = palette(ctx), { n, total } = folioOf(ctx, id);
  return pageSection(id, `${device(ctx, R, id, n, total, cover)}${body}<svg class="a" style="left:0;top:0" width="${PAGE.W}" height="${PAGE.H}" viewBox="0 0 ${PAGE.W} ${PAGE.H}" fill="none" aria-hidden="true">${svg}</svg>`);
}
// the page title: the page's name in the display face at the left, one sentence in the body face at the right, and a dotted rule under both. The sentence is the first
// candidate that sets in three lines, else the last.
const TITLE_SIZES = [44, 40, 36, 32, 28, 24], TITLE_W = 300, LEAD_X = 372, LEAD_W = 374, TITLE_Y = 44;
export function title(ctx, K, id, cands) {
  const { R, S } = K, list = Array.isArray(cands) ? cands : [cands];
  const word = NAME[id], sz = TITLE_SIZES.find((s) => tw(S.disp, word, s) * K.st * 1.04 <= TITLE_W) || 24, lh = Math.round(sz * 1.1);
  const pick = list.find((s) => nLines(S.body, s, 14, LEAD_W) <= 3) ?? list[list.length - 1], n = Math.min(3, nLines(S.body, pick, 14, LEAD_W));
  const bh = Math.max(lh, n * 22), rule = TITLE_Y + bh + 12;
  return {
    html: at(X0, TITLE_Y + Math.round((bh - lh) / 2), A(word), { w: TITLE_W, cls: 'tk-d', style: `font-size:${sz}px;line-height:${lh}px;white-space:nowrap` })
      + at(LEAD_X, TITLE_Y + Math.round((bh - n * 22) / 2), A(pick), { w: LEAD_W, cls: 'tk-body', style: 'font-size:14px;line-height:22px' })
      + hr(X0, rule, CW, R.ink),
    top: rule + 22,
  };
}
export const flow = stacker({ theme: 'Stub', bottom: BOT });

export function guideCss(ctx) {
  const W = ctx.weights, d = ctx.brand.fonts.display, b = ctx.brand.fonts.body, m = ctx.brand.fonts.mono, R = palette(ctx);
  const nm = String(ctx.brand.name).replace(/["'\\n\r]/g, '');
  return `/* Stub style guide: A4 portrait. A paper plate on the bar top, a perforation and a stub with the serial and the barcode, dotted rules, numbered chips. */
section.pg[data-page]{--ink:${R.ink};--quiet:${R.quiet};--hair:${R.hair};--bmono:'${(m || b).family}',monospace}
.pg .a{position:absolute;box-sizing:border-box}
.pg .tk-h{font:600 15px/20px var(--chrome);white-space:nowrap}
.pg .tk-hd{font:500 12px/16px var(--chrome);letter-spacing:.01em;white-space:nowrap}
.pg .tk-r{font:400 12px/16px var(--chrome);letter-spacing:.01em;text-wrap:pretty}
.pg .tk-n{font:400 13px/20px var(--chrome);overflow-wrap:anywhere;text-wrap:pretty}
.pg .tk-v{font:500 13px/18px var(--chrome)}
.pg .tk-m{font:400 12px/16px var(--chrome);font-variant-numeric:tabular-nums;white-space:nowrap;color:var(--ink)}
.pg .tk-fo{white-space:nowrap}
.pg .tk-no{font-family:var(--display);font-weight:${W.heading};font-stretch:${num(d.stretch, 100)}%;font-size:44px;line-height:48px;font-variant-numeric:tabular-nums;letter-spacing:-.01em}
.pg .tk-d{font-family:var(--display);font-weight:${W.heading};font-stretch:${num(d.stretch, 100)}%;letter-spacing:-.01em;overflow-wrap:anywhere;text-wrap:balance;color:var(--ink)}
/* the cover statement in the template edition: the placeholder sets at the statement size, without its dashed box */
.pg .tk-cv .ph-b{border:0;padding:0}
.pg .tk-cv .ph-w{font-size:1em;line-height:inherit}
/* on the applied objects each placeholder field stands on its own line, with room around its words */
.pg .tk-ap .ph-c{display:block;width:fit-content;max-width:100%;box-sizing:border-box;padding:2px 8px;margin:0 0 6px;line-height:18px}
.pg .tk-body{font:${W.regular} 13px/20px var(--body);overflow-wrap:anywhere;text-wrap:pretty;color:var(--ink)}
.pg .tk-bm{font-family:var(--bmono);font-weight:${m ? m.weights[0] : 400};font-size:11px;line-height:14px;white-space:nowrap}
.pg .tk-q{color:var(--quiet)}
.pg .tk-e{white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.pg .tk-wrap{white-space:normal;overflow-wrap:anywhere}
.pg .tk-spec{white-space:nowrap;overflow:hidden;text-overflow:ellipsis;color:var(--ink)}
.pg .tk-nw{white-space:nowrap}
/* the phone edition keeps the ticket's look in light: each heading is a full-width bar with a field chip for its number and a dotted rule under it, and a dotted perforation closes the page over a stub line */
@media screen and (max-width:841px){
main.sg-screen{counter-reset:sgno;overflow-wrap:anywhere;--quiet:${R.quiet};--tk-field:${R.field};--tk-field-ink:${R.fieldInk};--tk-table:${R.table}}
main.sg-screen .sg-wrap{box-sizing:border-box;padding:20px 16px 0}
main.sg-screen .sg-wrap::after{content:"${nm} style guide";display:block;margin:32px -16px 0;padding:14px 16px;border-top:3px dotted var(--tk-table);background:var(--tk-field);color:var(--tk-field-ink);font:500 12px/16px var(--chrome)}
main.sg-screen h1 .ph-c{margin-right:10px;margin-bottom:6px;vertical-align:.15em}
main.sg-screen h2{counter-increment:sgno;display:flex;align-items:baseline;gap:14px;margin:32px -16px 16px;padding:12px 16px;border:0;border-bottom:2px dotted var(--ink);font:600 15px/22px var(--chrome)}
main.sg-screen h2::before{content:counter(sgno,decimal-leading-zero);flex:none;min-width:28px;padding:0 6px;text-align:center;background:var(--tk-field);color:var(--tk-field-ink);font:500 12px/22px var(--chrome);font-variant-numeric:tabular-nums}
main.sg-screen div:has(> .sg-tile + p.sg-quiet){display:grid;grid-template-columns:112px 1fr;gap:8px 12px;align-items:center}
main.sg-screen div:has(> .sg-tile + p.sg-quiet) .sg-tile{margin:0;padding:8px;min-height:56px;min-width:0;overflow:hidden;justify-content:center}
main.sg-screen div:has(> .sg-tile + p.sg-quiet) .logo-slot{width:100%!important;height:40px!important}
main.sg-screen div:has(> .sg-tile + p.sg-quiet) p.sg-quiet{margin:0!important}
}
`;
}
export { sum };
