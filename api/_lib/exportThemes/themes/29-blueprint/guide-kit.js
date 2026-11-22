// Theme 29, Drawing Sheet: the kit under the A4 style guide. The page is a drawing sheet at 794 x 1123: a quiet outer border with zone ticks and zone references (1 to 6 across,
// A to H down), the ink frame, a title block along the foot (drawing, project, revision, format, sheet), numbered detail tags for the sections, and red dimension lines
// with oblique ticks and mono values, drawn only where a true size is printed. Chivo and Chivo Mono carry the chrome; the brand's faces appear only as the work.
// No shadow, no gradient. Text is measured with the fonts' own metrics, so a page that cannot hold its content throws and the route leaves it out.
import { loadFont } from '../../engine/nodeFont.js';
import { esc as A } from '../../engine/brand.js';
import { PAGE, r1, sum, pageSection, stacker, SLOT_MIN_H, logoArt } from '../../engine/guide-layout.js';

export const { X0, XR, CW, COL, COLW } = PAGE;
// the lowest y content reaches, and the height of a section header (its tag, name and leader, with the gap under it before the content's own 8 px)
export const BOT = 1008, SUBH = 32;
export const NAME = { cover: 'Cover', logo: 'Logo', colour: 'Colour', ruler: 'Proportion', applied: 'Applied', type: 'Type', contrast: 'Contrast', tokens: 'Tokens', usage: 'Usage' };
export const CH = { 400: 'Chivo-400', 500: 'Chivo-500' };
export const MONO = 'ChivoMono-400';
// The film and ink are the sheet's own material, the same for every brand; the redline is the brand's action stepped to 7 : 1 on the film.
// Copied from index.js (a lane does not import its theme's index: the loader is waiting on the lane).
const SHEET = { film: '#EEF1F2', hair: '#C3CBD0', ink: '#1F2A33', quiet: '#56636D' };
function redOf(ctx) {
  const C = ctx.C, L = ctx.roles.light, o = C.toOklch(L.action);
  const gap = Math.abs(o.H - 245), hueGap = Math.min(gap, 360 - gap);
  if (hueGap < 35 || o.C < 0.06) return '#B23A2A';
  let hex = L.action;
  for (let l = o.L; C.ratio(hex, SHEET.film) < 7 && l > 0.2; l -= 0.02) hex = C.fromOklch(l, o.C, o.H);
  return hex;
}
const f2 = (n) => +(+n).toFixed(2);
export const cap1 = (s) => (s ? s[0].toUpperCase() + s.slice(1) : s);
export const pad2 = (n) => String(n || 0).padStart(2, '0');
export const pad3 = (n) => String(n || 0).padStart(3, '0');
export const pct = (s) => `${+((s ?? 0) * 100).toFixed(1)}%`;
const NUMBER_WORDS = ['No', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten'];
export const numberWord = (n) => NUMBER_WORDS[n] || String(n);
const WEIGHT_NAMES = { 100: 'Thin', 200: 'Extralight', 300: 'Light', 400: 'Regular', 500: 'Medium', 600: 'Semibold', 700: 'Bold', 800: 'Extrabold', 900: 'Black' };
export const weightName = (w) => WEIGHT_NAMES[w] || String(w);
export const listAnd = (xs) => (xs.length <= 1 ? xs.join('') : `${xs.slice(0, -1).join(', ')} and ${xs[xs.length - 1]}`);
export const longDate = (iso) => { const d = new Date(iso + 'T00:00:00Z'); return Number.isNaN(+d) ? String(iso) : d.toLocaleDateString('en-AU', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' }); };
const shortDate = (iso) => { const d = new Date(iso + 'T00:00:00Z'); return Number.isNaN(+d) ? '' : d.toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' }); };
// a length printed as the true size it is
export const px = (n) => `${+(+n).toFixed(1)} px`;

// ---- measuring (the fonts' own advances and kerning, the way the browser sets a line) ----
export function tw(stem, text, size, track = 0) {
  const font = loadFont(stem);
  let x = 0, prev = null;
  for (const ch of String(text).replace(/ /g, ' ')) {
    const g = font.charToGlyph(ch);
    if (prev) { try { x += (font.getKerningValue(prev, g) * size) / font.unitsPerEm; } catch { /* no kerning table */ } }
    x += (g.advanceWidth * size) / font.unitsPerEm + track * size;
    prev = g;
  }
  return x;
}
// the lines a text takes in a box: greedy at the browser's own breaks, and a single run wider than the box counts the lines it will fold into (overflow-wrap:anywhere), so no text throws
// A slot edition's copy is a placeholder string until the file is finished; it is measured as the short label the compact form prints (set by kit(ctx), pages build one at a time)
let LAB = (s) => s;
export function nLines(stem, text, size, w, st = 1) {
  const wide = (s) => tw(stem, s, size) * st * 1.04;
  const fold = (s) => Math.max(0, Math.ceil(wide(s) / w) - 1);
  let n = 1, cur = '';
  for (const word of String(LAB(String(text))).split(' ')) {
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

// ---- the page's colours: the sheet's own, plus the few the guide needs from the brand (cached on the ctx) ----
function palette(ctx) {
  if (ctx._ga29) return ctx._ga29;
  const L = ctx.roles.light, ok = (h) => ctx.C.isHex(h);
  const R = { film: SHEET.film, hair: SHEET.hair, ink: SHEET.ink, quiet: SHEET.quiet, red: redOf(ctx) };
  // the plate the brand's own colour logo is drawn on (an object's ground), else the brand's raised surface, else the film
  const cw = ctx.brand.logo.colourways, g = cw && cw.colour && cw.colour.ground;
  R.ground = ok(g) ? g : ok(L.raised) ? L.raised : SHEET.film;
  R.edge = SHEET.quiet;
  R.near = (hex) => ctx.ratio(hex, SHEET.film) < 1.5;
  const act = ctx.colours.find((c) => c.role === 'action');
  R.action = act ? act.hex : L.action;
  // text on a coloured object: the sheet's ink or film, or the brand's text and surface, whichever reaches 4.5 : 1 (else the one that comes nearest)
  R.onColour = (bg, size = 13, weight = 400) => {
    const cands = [SHEET.ink, SHEET.film, L.text, L.surface].filter(ok), best = cands.reduce((a, b) => (ctx.ratio(b, bg) > ctx.ratio(a, bg) ? b : a));
    let pick = ctx.textOn(bg, { size, weight, prefer: best });
    if (!ok(pick) || ctx.ratio(pick, bg) < 4.5) pick = cands.concat(['#000000', '#ffffff']).find((h) => ctx.ratio(h, bg) >= 4.5) || best;
    ctx.pair(pick, bg, { size, weight, what: '(Drawing Sheet text on an object)' });
    return pick;
  };
  // the logo colourway to use on a ground: one drawn on that ground, else the colourway whose name colour reads best on it
  R.colourwayOn = (bg) => {
    const ways = ctx.brand.logo.colourways, keys = Object.keys(ways);
    return keys.find((k) => ways[k].ground.toLowerCase() === bg.toLowerCase()) || keys.reduce((a, b) => (ctx.ratio(ways[b].name, bg) > ctx.ratio(ways[a].name, bg) ? b : a));
  };
  return (ctx._ga29 = R);
}
export function kit(ctx) {
  const B = ctx.brand, d = B.fonts.display, R = palette(ctx);
  LAB = ctx.placeholders && ctx.placeholders.label ? ctx.placeholders.label : (s) => s;
  return {
    B, R, d, st: (d.stretch || 100) / 100,
    S: { disp: stemOf(ctx, 'display', ctx.weights.heading), body: stemOf(ctx, 'body', 400), mono: B.fonts.mono ? stemOf(ctx, 'mono', 400) : MONO },
  };
}
// the logo at a width; a slot frame too short to hold its word is drawn without the word (the page names it instead)
export const art = (ctx, id, w, o = {}) => {
  const g = ctx.logo.geos[id], h = (w * g.h) / g.w;
  if (ctx.edition === 'slot' && h < SLOT_MIN_H - 0.5) return ctx.logo.html(id, { width: r1(w), ...o, label: '' });
  return logoArt(ctx, id, w, o);
};

// ---- placing things ----
export const at = (x, y, html, { w, cls = '', style = '' } = {}) => `<div class="a ${cls}" style="left:${r1(x)}px;top:${r1(y)}px;${w != null ? `width:${r1(w)}px;` : ''}${style}">${html}</div>`;
export const rect = (x, y, w, h, style = '', inner = '', cls = '') => `<div class="a ${cls}" style="left:${r1(x)}px;top:${r1(y)}px;width:${r1(w)}px;height:${r1(h)}px;${style}">${inner}</div>`;
// a 1 px rule
export const hr = (x, y, w, col) => rect(x, y, w, 1, `background:${col}`);
// an object: its fill, and a 1 px outline (drawn inside, so it never moves the contents) when asked or when the fill is close to the film in tone
export const obj = (K, x, y, w, h, hex, inner = '', { frame = false, style = '' } = {}) => rect(x, y, w, h, `background:${hex};${frame || K.R.near(hex) ? `outline:1px solid ${K.R.edge};outline-offset:-1px;` : ''}${style}`, inner);
// the drafter's numbered circle (a detail tag): the number in mono, centred in it
export const tag = (cx, cy, n, r = 11) => `<svg class="a" style="left:${r1(cx - r - 1)}px;top:${r1(cy - r - 1)}px" width="${2 * r + 2}" height="${2 * r + 2}" fill="none" aria-hidden="true"><circle cx="${r + 1}" cy="${r + 1}" r="${r}" stroke="var(--ink)" stroke-width="1"/></svg><span class="a ga-m" style="left:${r1(cx - r)}px;top:${r1(cy - 8)}px;width:${2 * r}px;text-align:center">${A(n)}</span>`;
// a section header: the detail tag, the name, and an ink leader to the note at the right
export function sec(K, x, y, w, no, name, note = '') {
  const nameW = Math.ceil(tw(CH[500], name, 14)), noteW = note ? Math.ceil(tw(CH[400], note, 12)) : 0, lead0 = x + 30 + nameW + 12;
  const showNote = note && x + w - noteW - 12 - lead0 >= 24;
  const lead1 = showNote ? x + w - noteW - 12 : x + w;
  return tag(x + 11, y + 12, no) + at(x + 30, y + 2, A(name), { cls: 'ga-h' })
    + hr(lead0, y + 12, Math.max(0, lead1 - lead0), K.R.ink)
    + (showNote ? at(x + w - noteW, y + 4, A(note), { cls: 'ga-r ga-q ga-nw' }) : '');
}
// a section's number is its place on the page
export const catNo = (ctx, id, i) => String(i);
// a register: rows ruled with hairlines, a key in the first column and a value in the second. rows: [[key, valueHtml, height]]
export function register(K, x, y, w, rows, { kw = 88 } = {}) {
  let yy = y, out = '';
  for (const [k, v, h] of rows) {
    out += hr(x, yy, w, K.R.hair) + at(x, yy + 4, A(k), { w: kw - 8, cls: 'ga-r ga-q', style: 'line-height:20px' }) + at(x + kw, yy + 4, v, { w: w - kw });
    yy += h;
  }
  return out + hr(x, yy, w, K.R.hair);
}

// ---- red dimension lines: oblique ticks, a mono value; print a true size only ----
const RED = 'var(--red)', INK = 'var(--ink)';
const tick = (x, y, col) => `<path d="M${f2(x - 3.5)} ${f2(y + 3.5)}L${f2(x + 3.5)} ${f2(y - 3.5)}" stroke="${col}" stroke-width="1" fill="none"/>`;
const ln = (x1, y1, x2, y2, col) => `<path d="M${f2(x1)} ${f2(y1)}L${f2(x2)} ${f2(y2)}" stroke="${col}" stroke-width="1" fill="none"/>`;
const val = (x, y, text, col, anchor = 'start') => `<text x="${f2(x)}" y="${f2(y)}" text-anchor="${anchor}" fill="${col}" style="font:400 12px var(--cmono)">${A(text)}</text>`;
const valW = (t) => tw(MONO, t, 12);
// a horizontal dimension: the line at y from x1 to x2, oblique ticks at the ends, the value centred with the line broken round it (past the far tick when it does not fit).
// obj is the y of the object's edge: extension lines start 4 px off it and run 6 px past the line. tone 'ink' draws it in ink (a proportion, not a true size).
export function dimH({ x1, x2, y, label, obj: o, tone = 'red' }) {
  const col = tone === 'red' ? RED : INK, tw0 = valW(label), mid = (x1 + x2) / 2, fits = x2 - x1 >= tw0 + 12 + 16;
  let s = '';
  if (o != null) { const sg = Math.sign(y - o) || 1; for (const X of [x1, x2]) s += ln(X + 0.5, o + sg * 4, X + 0.5, y + sg * 6, col); }
  if (fits) s += ln(x1, y, mid - tw0 / 2 - 6, y, col) + ln(mid + tw0 / 2 + 6, y, x2, y, col) + val(mid, y + 4, label, col, 'middle');
  else s += ln(x1, y, x2, y, col) + val(x2 + 10, y + 4, label, col);
  return s + tick(x1, y, col) + tick(x2, y, col);
}
// a vertical dimension: the line at x from y1 to y2, the value to its left (right: to its right)
export function dimV({ x, y1, y2, label, obj: o, tone = 'red', right = false }) {
  const col = tone === 'red' ? RED : INK;
  let s = '';
  if (o != null) { const sg = Math.sign(x - o) || 1; for (const Y of [y1, y2]) s += ln(o + sg * 4, Y + 0.5, x + sg * 6, Y + 0.5, col); }
  s += ln(x + 0.5, y1, x + 0.5, y2, col) + tick(x + 0.5, y1, col) + tick(x + 0.5, y2, col);
  return s + val(right ? x + 10 : x - 10, (y1 + y2) / 2 + 4, label, col, right ? 'start' : 'end');
}
// a revision cloud: the drafter's scalloped contour round a change, drawn clockwise so every arc bulges outward
export function cloud(x, y, w, h, bump = 9) {
  const nx = Math.max(2, Math.round(w / (bump * 2))), ny = Math.max(2, Math.round(h / (bump * 2)));
  const sx = w / nx, sy = h / ny, rx = sx / 2 + 0.5, ry = sy / 2 + 0.5;
  let d = `M${r1(x)} ${r1(y)}`;
  for (let i = 1; i <= nx; i++) d += `A${r1(rx)} ${r1(rx)} 0 0 1 ${r1(x + i * sx)} ${r1(y)}`;
  for (let i = 1; i <= ny; i++) d += `A${r1(ry)} ${r1(ry)} 0 0 1 ${r1(x + w)} ${r1(y + i * sy)}`;
  for (let i = 1; i <= nx; i++) d += `A${r1(rx)} ${r1(rx)} 0 0 1 ${r1(x + w - i * sx)} ${r1(y + h)}`;
  for (let i = 1; i <= ny; i++) d += `A${r1(ry)} ${r1(ry)} 0 0 1 ${r1(x)} ${r1(y + h - i * sy)}`;
  return `<path d="${d}Z" stroke="${INK}" stroke-width="1" fill="none"/>`;
}

// ---- the sheet: border with zone ticks, ink frame, title block (the same on every page, so drawn once) ----
const FX0 = 32, FX1 = 762, FY0 = 32, FY1 = 1091, TBY = 1031, ZN = 6, ZM = 8;
const crisp = (v) => Math.round(v) + 0.5;
const TBC = [['Drawing', 210], ['Project', 170], ['Revision', 150], ['Format', 110], ['Sheet', 90]];
let FRAME = null;
function frame() {
  if (FRAME) return FRAME;
  const zw = (FX1 - FX0) / ZN, zh = (FY1 - FY0) / ZM;
  let svg = `<rect x="12.5" y="12.5" width="769" height="1098" stroke="${SHEET.quiet}" stroke-width=".75" fill="none"/>`;
  for (let k = 0; k <= ZN; k++) { const x = crisp(FX0 + k * zw); svg += `<path d="M${x} 12V32M${x} 1091V1111" stroke="${SHEET.quiet}" stroke-width="1"/>`; }
  for (let j = 0; j <= ZM; j++) { const y = crisp(FY0 + j * zh); svg += `<path d="M12 ${y}H32M762 ${y}H782" stroke="${SHEET.quiet}" stroke-width="1"/>`; }
  svg += `<path d="M397 0V32M397 1091V1123M0 561.5H32M762 561.5H794" stroke="${SHEET.ink}" stroke-width="1.5"/>`;
  svg += `<rect x="${FX0}" y="${FY0}" width="${FX1 - FX0}" height="${FY1 - FY0}" stroke="${SHEET.ink}" stroke-width="1.5" fill="none"/><path d="M${FX0} ${TBY}H${FX1}" stroke="${SHEET.ink}" stroke-width="1.5"/>`;
  let x = FX0;
  for (const [, w] of TBC.slice(0, -1)) { x += w; svg += `<path d="M${x + 0.5} ${TBY + 1}V${FY1}" stroke="${SHEET.hair}" stroke-width="1"/>`; }
  let nums = '';
  for (let k = 0; k < ZN; k++) for (const y of [15, 1094]) nums += `<span class="zr" style="left:${r1(FX0 + k * zw)}px;width:${r1(zw)}px;top:${y}px">${k + 1}</span>`;
  for (let j = 0; j < ZM; j++) for (const x0 of [12, 762]) nums += `<span class="zr" style="left:${x0}px;width:20px;top:${r1(FY0 + j * zh + zh / 2 - 7)}px">${'ABCDEFGH'[j]}</span>`;
  return (FRAME = { svg, nums });
}
// the page: the work, the title block with this sheet's own values, and the page's dimension lines over everything
export function shell(ctx, id, body, svg = '') {
  const B = ctx.brand, n = ctx.pageNo(id) || 0, total = (ctx.pages && ctx.pages.length) || Object.keys(NAME).length, F = frame();
  let x = FX0;
  const cell = (i, inner) => { const lab = TBC[i][0], cx = x + 12, w = TBC[i][1]; x += w; return `<span class="a tl" style="left:${cx}px;top:${TBY + 5}px">${lab}</span>${inner(cx, w - 24)}`; };
  const ver = String(B.version.number), date = shortDate(B.version.date);
  const tb = cell(0, (cx, w) => at(cx, TBY + 22, A(NAME[id]), { w, cls: 'ga-t ga-e' }))
    + cell(1, (cx, w) => at(cx, TBY + 22, A(B.name), { w, cls: 'ga-v ga-e', style: 'font-weight:500' }))
    + cell(2, (cx, w) => at(cx, TBY + 22, `<div class="ga-v ga-e">${A(ver)}</div>${date ? `<div class="ga-r ga-q ga-e">${A(date)}</div>` : ''}`, { w }))
    + cell(3, (cx, w) => at(cx, TBY + 22, '<div class="ga-v">A4</div><div class="ga-r ga-q ga-nw">210 × 297 mm</div>', { w }))
    + cell(4, (cx, w) => at(cx, TBY + 20, `<div class="ga-m" style="font-size:18px;line-height:22px">${pad3(n)}</div><div class="ga-r ga-q ga-nw">of ${pad3(total)}</div>`, { w }));
  return pageSection(id, `<svg class="a" style="left:0;top:0" width="${PAGE.W}" height="${PAGE.H}" viewBox="0 0 ${PAGE.W} ${PAGE.H}" fill="none" aria-hidden="true">${F.svg}</svg>${F.nums}${tb}${body}<svg class="a" style="left:0;top:0" width="${PAGE.W}" height="${PAGE.H}" viewBox="0 0 ${PAGE.W} ${PAGE.H}" fill="none" aria-hidden="true">${svg}</svg>`);
}
// the page title (a detail tag with its number, the name at 22/26) and one quiet sentence under it: the first candidate that sets in two lines, else the last
export function title(ctx, K, id, cands) {
  const list = Array.isArray(cands) ? cands : [cands], W = 560;
  const pick = list.find((s) => nLines(CH[400], s, 13, W) <= 2) ?? list[list.length - 1], n = nLines(CH[400], pick, 13, W);
  return {
    html: tag(X0 + 14, 70, pad2(ctx.pageNo(id)), 14) + at(X0 + 40, 57, A(NAME[id]), { cls: 'ga-t' }) + at(X0 + 40, 90, A(pick), { w: W, cls: 'ga-n ga-q' }),
    top: 90 + n * 20 + 28,
  };
}
export const flow = stacker({ theme: 'Blueprint', bottom: BOT });

export function guideCss(ctx) {
  const W = ctx.weights, d = ctx.brand.fonts.display, m = ctx.brand.fonts.mono;
  return `/* Drawing Sheet style guide: A4 portrait. The 1587 x 1123 drawing sheet at page scale: border, zone references, title block, detail tags, redlines. */
.pg .ga-h{font:500 14px/20px var(--chrome);white-space:nowrap}
.pg .ga-r{font:400 12px/16px var(--chrome);letter-spacing:.01em;text-wrap:pretty}
.pg .ga-n{font:400 13px/20px var(--chrome);overflow-wrap:anywhere;text-wrap:pretty}
.pg .ga-v{font:400 13px/18px var(--chrome)}
.pg .ga-m{font-family:var(--cmono);font-weight:400;font-size:12px;line-height:16px;font-variant-numeric:tabular-nums;white-space:nowrap;color:var(--ink)}
.pg .ga-t{font:500 22px/26px var(--chrome);letter-spacing:-.005em;white-space:nowrap}
.pg .ga-d{font-family:var(--display);font-weight:${W.heading};font-stretch:${d.stretch || 100}%;overflow-wrap:anywhere;text-wrap:balance}
.pg .ga-body{font:${W.regular} 13px/20px var(--body);overflow-wrap:anywhere;text-wrap:pretty}
.pg .ga-bm{font-family:var(--bmono);font-weight:${m ? m.weights[0] : 400};font-size:12px;line-height:16px;white-space:nowrap}
.pg .ga-q{color:var(--quiet)}
.pg .ga-e{white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.pg .ga-wrap{white-space:normal;overflow-wrap:anywhere}
.pg .ga-spec{white-space:nowrap;overflow:hidden;text-overflow:ellipsis;color:var(--ink)}
.pg .ga-nw{white-space:nowrap}
/* the phone edition wears the sheet: each heading takes a detail tag and an ink leader */
@media screen and (max-width:841px){
.sg-screen{counter-reset:sgno;overflow-wrap:anywhere}
.sg-screen h2{counter-increment:sgno;display:flex;align-items:center;gap:10px;border-top:0;padding-top:0;font:500 15px/24px 'Chivo',sans-serif}
.sg-screen h2::before{content:counter(sgno);flex:none;box-sizing:border-box;width:24px;height:24px;border:1px solid var(--ink);border-radius:50%;font:400 12px/22px 'Chivo Mono',monospace;text-align:center}
.sg-screen h2::after{content:'';flex:1;min-width:12px;height:1px;background:var(--ink)}
.sg-screen .sg-wrap{padding-left:16px;padding-right:16px;box-sizing:border-box}
}
`;
}
export { sum };
