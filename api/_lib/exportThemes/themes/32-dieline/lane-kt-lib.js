// Theme 32, Dieline, lane kt: the page frame and text helpers for the brand kit sheets. Each kit sheet is one of the inserts packed with the
// brand's own pack (a folded leaflet, a tear-off strip, a swing tag, a sleeve, a map fold, a sticker sheet), drawn flat with its die lines.
// The frame is the guidelines' frame (head cells, folio, locator net) with the kit's folder and sheet in the head. Classes start kt-.
import { phTight } from './ph.js';
import { roles, pack, allocate, measure, wrap, L, ghost, closure, satchelFlap, r2, esc } from './geom.js';

export const px = (n) => `${r2(n)}px`;
export const TRACK = -0.005;
export const disp = (size, lh, col) => `font-size:${size}px;line-height:${lh}px;letter-spacing:${TRACK}em;color:${col}`;
const WEIGHT_NAMES = { 100: 'Thin', 200: 'ExtraLight', 300: 'Light', 400: 'Regular', 500: 'Medium', 600: 'SemiBold', 700: 'Bold', 800: 'ExtraBold', 900: 'Black' };
export const weightName = (w) => WEIGHT_NAMES[w] || String(w);
export const listAnd = (xs) => (xs.length < 2 ? xs.join('') : `${xs.slice(0, -1).join(', ')} and ${xs[xs.length - 1]}`);

// the kit's pages in the order the engine prints them (read-me, palette, type, photography, icons): the folio is the position here
export const KIT = [
  ['read-me', '00 Read me', 'Read me'],
  ['start-here', '00 Read me', 'Start here'],
  ['palette', '02 Colour', 'Swatch sheet'],
  ['typefaces', '03 Type', 'Type specimen'],
  ['photography-1', '05 Imagery', 'Photography direction'],
  ['photography-2', '05 Imagery', 'Shot list'],
  ['icons', '04 Icons', 'Icon sheet'],
];

// ---- a page: fields (divs), die lines (one svg under the text), text, chrome ----
export class Pg {
  constructor(ctx, id, { no, folder, title } = {}) {
    const k = KIT.find((x) => x[0] === id) || KIT[KIT.length - 1];
    this.ctx = ctx; this.id = id; this.R = roles(ctx); this.K = pack(ctx); this.B = ctx.brand;
    this.no = no || KIT.indexOf(k) + 1; this.folder = folder || k[1]; this.title = title || k[2];
    this.f = []; this.l = []; this.t = []; this.g = []; this.boxes = [];
    this.kind = this.K.kind; this.y0 = this.kind === 'bag' ? 96 : 168; this.y1 = 912; this.gcol = this.R.ghost; this.slot = ctx.edition === 'slot';
  }
  field(x, y, w, h, hex) { this.f.push(`<div class="fd" style="left:${px(x)};top:${px(y)};width:${px(w)};height:${px(h)};background:${hex}"></div>`); }
  raw(html) { this.f.push(html); }
  line(...s) { this.l.push(...s); }
  text(x, y, w, h, cls, html, style = '') {
    this.boxes.push({ x, y, w, h });
    this.t.push(`<div class="tx ${cls}" style="left:${px(x)};top:${px(y)};width:${px(w)};height:${px(h)};${style}">${html}</div>`);
  }
  gh(kind, axis, at, a, b) { this.g.push({ kind, axis, at, a, b }); }
  html(hl) {
    const { R } = this, ink = R.groundText.ink;
    const heads = [[40, this.B.name], [244, 'Brand kit'], [550, this.folder], [856, this.title]];
    let out = heads.map(([x, s]) => `<div class="hd" style="left:${x}px">${esc(s)}</div>`).join('');
    out += `<div class="fo">${String(this.no).padStart(3, '0')}</div>`;
    // locator net: the palette in miniature, panels by share, this sheet's colour outlined (the whole net on the swatch sheet)
    const ws = allocate(R.order.map((c) => c.share), 240, 6); let x = 40, rects = '', hit = hl === 'all' ? [40, 240] : null;
    R.order.forEach((c, i) => {
      this.field(x, 1016, ws[i], 20, c.hex);
      if (R.isGround(c.hex)) rects += `<rect x="${x + 0.5}" y="1016.5" width="${ws[i] - 1}" height="19" fill="none" stroke="${this.gcol}" stroke-width="1"/>`;
      if (hl && hl !== 'all' && c.hex.toLowerCase() === hl.toLowerCase()) hit = [x, ws[i]];
      x += ws[i];
    });
    if (hit) rects += `<rect x="${hit[0] - 2}" y="1014" width="${hit[1] + 4}" height="24" fill="none" stroke="${ink}" stroke-width="1.5"/>`;
    const gl = this.g.map((g) => ghost(g.kind, g.axis, g.at, g.a, g.b, this.boxes, this.gcol)).join('');
    return `<section class="pg kt${this.kind === 'satchel' ? ' sat' : ''}${phTight(this.ctx, this.id)}" data-page="${this.id}" style="isolation:isolate">${this.f.join('')}<svg class="ln" viewBox="0 0 1080 1080" xmlns="http://www.w3.org/2000/svg">${gl}${this.l.join('')}${rects}</svg>${this.t.join('')}${out}</section>`;
  }
}

// ---- text. Brand copy is printed whole and the browser wraps it; the line count is measured with the real glyphs 4% inside the box,
// so the box always holds what renders, and a slot placeholder of the same length still fits ----
const SLACK = 0.96;
export function lines(ctx, role, weight, s, size, w) { return wrap(ctx, role, weight, String(s), size, w * SLACK).length; }
// a wrapped paragraph: returns its height
export function para(P, x, y, w, s, { cls = 'b-body', role = 'body', weight, size = 15, lh = 24, col, style = '' } = {}) {
  const wt = weight || (role === 'chrome' ? 400 : P.ctx.weights.regular), h = lines(P.ctx, role, wt, s, size, w) * lh;
  P.text(x, y, w, h, `${cls} wrap`, esc(s), `font-size:${size}px;line-height:${lh}px;${role === 'body' ? `font-weight:${wt};` : ''}color:${col};${style}`);
  return h;
}
export const paraH = (ctx, w, s, { role = 'body', weight, size = 15, lh = 24 } = {}) => lines(ctx, role, weight || (role === 'chrome' ? 400 : ctx.weights.regular), s, size, w) * lh;
// the largest display size in the list at which the text fits w in at most n lines (and, if given, a height of maxH at line height size * k)
export function fitDisplay(ctx, text, sizes, w, n, { k = 0.92, maxH = Infinity } = {}) {
  const W = ctx.weights.heading;
  for (const s of sizes) {
    const rows = wrap(ctx, 'display', W, String(text), s, w * SLACK, TRACK), lh = Math.round(s * k);
    if (rows.length <= n && rows.length * lh <= maxH && rows.every((r) => measure(ctx, 'display', W, r, s, TRACK) <= w * SLACK)) return { size: s, lh, n: rows.length };
  }
  const s = sizes[sizes.length - 1], lh = Math.round(s * k);
  return { size: s, lh, n: wrap(ctx, 'display', W, String(text), s, w * SLACK, TRACK).length };
}
// a display line or block: returns its height
export function dispText(P, x, y, w, text, sizes, n, col, opt = {}) {
  const f = fitDisplay(P.ctx, text, sizes, w, n, opt), h = f.lh * f.n;
  P.text(x, y, w, h, `disp wrap ${opt.cls || ''}`, esc(text), disp(f.size, f.lh, col) + (opt.style || ''));
  return h;
}
// the largest display size, max down to min, at which every one of these fixed strings fits w on one line
export function fitAll(ctx, strs, w, max, min) {
  for (let s = max; s >= min; s -= 2) if (strs.every((t) => measure(ctx, 'display', ctx.weights.heading, t, s, TRACK) <= w * 0.98)) return s;
  return min;
}
// a note: a name in the body's medium weight over its text; returns the height
export function note(P, x, y, w, head, body, col, { size = 14, lh = 20, html = null } = {}) {
  P.text(x, y, w, 24, 'b-body b-med', esc(head), `color:${col}`);
  // a note with a mono span in it: measured as plain text in a narrower box, since the mono runs wider than the body face
  if (html) { const h = lines(P.ctx, 'body', P.ctx.weights.regular, html.plain, size, w * 0.86) * lh; P.text(x, y + 28, w, h, 'b-small wrap', html.s, `color:${col}`); return 28 + h; }
  return 28 + para(P, x, y + 28, w, body, { cls: 'b-small', size, lh, col });
}
export const mono = (s) => `<span class="m">${esc(s)}</span>`;

// ---- the pack's own panel (start-here): the kind's closures from geom.js, as on the guidelines ----
export const inner = (kind, y0, y1) => ({ top: y0 + (kind === 'bag' ? 88 : 48), bot: y1 - (kind === 'bag' ? 56 : kind === 'satchel' ? 40 : 32) });
export function panel(P, g) {
  P.field(g.x0, g.y0, g.x1 - g.x0, g.y1 - g.y0, g.hex);
  const out = [];
  if (P.kind === 'satchel') satchelFlap(P.R, g.x0, g.x1, g.y0, P.R.front.hex, g.l, g.r, out);
  closure(P.R, P.kind, { valve: false, ...g }, out);
  P.line(...out);
}
// the unprinted neighbour on the ground: on a bag its own seal, crimp and fold in ghost; on other kinds the cut lines only
export function neighbour(P, a, b, y0, y1) {
  if (P.kind === 'bag') { const o = []; closure(P.R, 'bag', { x0: a, x1: b, y0, y1, hex: P.R.ground.hex, l: 'none', r: 'none', role: 'side', valve: false }, o); P.line(...o); }
  else { P.gh(P.kind === 'box' ? 'fold' : 'cut', 'h', y0, a, b); P.gh('cut', 'h', y1, a, b); }
}
export { L, esc, r2, measure };
