// Theme 32, Dieline, lane u1: the UI kit foundations (cover, contents, colour-light, colour-dark, type-scale, spacing, radii-borders, elevation).
// The kit is packed in the same die as the guidelines. Every page is one panel of the brand's pack, flattened, and the real components
// are seen through die-cut windows in the board, the way a carton shows its product. Closures come from the pack kind, colours from roles.
//
// For lanes u2 and u3 (import read-only, never copy the look of a page):
//   KitPage     a kit page: fields, die lines, text, windows, running head ("<brand>", "UI kit", section, page), folio and locator net
//   panel       one panel of the net at page scale by role ('front' | 'back' | 'side'), or any box you give it, with its closures and ghost neighbours
//   kitNet      a run of panels left to right (fin or glue flap, satchel flap, closures, tear notches), for a page that shows the whole net
//   inner       the band inside a panel that text may use, clear of seals, crimps, gusset folds and weld seams
//   reach       how far a kind's closure reaches past a panel's top and bottom edge
//   say         slot-edition copy: the brand's words in showcase, a dashed placeholder label in slot (works inside ctx.ui components too)
//   kitCopy     the screen copy the kit pages use, already passed through say()
//   inkOn       the best text colour on any hex (brand pairs first, then the UI roles of both modes)
// u1's css() carries the kit tokens (.pg .ui, light; .pg .ui[data-theme="dark"]) and componentsCss(ctx) once, so u2 and u3 need not add them again.
// A window is a .ui region: KitPage.win(x, y, w, h, html, { dark, on }) cuts it into the board, `on` being the hex of the panel it sits in.
import { roles, pack, allocate, measure, wrap, L, pathLine, ghost, closure, satchelFlap, crimp, r2, esc } from './geom.js';
import { colourMap, tokenGroups } from '../../engine/tokens.js';
import { componentsCss } from '../../engine/components.js';
import { DESCRIPTORS } from '../../engine/placeholders.js';

const px = (n) => `${r2(n)}px`;
export const isSlot = (ctx) => ctx.edition === 'slot';

// ---- slot copy. Theme 32 is not in the engine's placeholder set, so the slot ctx still holds the sample brand's words. The kit swaps them itself:
// say() returns a marked label (the marks survive esc() and the components), and KitPage.html() turns each mark into a dashed frame.
// Labels are the engine's own descriptor labels, so a slot kit reads the same as the other themes' slot kits.
const PO = '⟦', PC = '⟧';
export function say(ctx, path, real, n = 1) {
  if (!isSlot(ctx)) return real;
  const d = DESCRIPTORS[path];
  return PO + (d ? d.label.replace('{n}', String(n)) : path) + PC;
}
// a mark inside an attribute value, a textarea or an option cannot hold the dashed frame (it would break the tag), so there it is the label as plain text
export const unmark = (html) => html
  .replace(/="([^"]*)"/g, (m, v) => `="${v.replace(/[⟦⟧]/g, '')}"`)
  .replace(/(<(textarea|option)\b[^>]*>)([^<]*)/g, (m, a, t, v) => a + v.replace(/[⟦⟧]/g, ''))
  .replace(/⟦([^⟧]*)⟧/g, (m, l) => `<span class="u1-ph">${esc(l)}</span>`);
const marked = (s) => String(s).includes(PO);
// a width for text that may hold a placeholder: the label's own width plus its frame
export function textW(ctx, role, weight, s, size) {
  let extra = 0; const plain = String(s).replace(/⟦([^⟧]*)⟧/g, (m, l) => { extra += size * 0.6 + 4; return l; });
  return measure(ctx, marked(s) ? 'chrome' : role, marked(s) ? 500 : weight, plain, size) + extra;
}
export function kitCopy(ctx) {
  const S = ctx.brand.ui.screen.content, F = S.form, D = S.dialog || {}, s = (p, v) => say(ctx, 'ui.screen.content.' + p, v);
  const st = (id) => { const i = ctx.status.findIndex((x) => x.id === id); return say(ctx, 'ui.status.*.label', ctx.status[Math.max(i, 0)].label, i + 1); };
  return {
    status: s('status', S.status), eta: s('eta', S.eta), pickup: s('pickup', S.pickup), rider: s('rider', S.rider), riderNote: s('riderNote', S.riderNote),
    deliverTo: s('deliverTo', S.deliverTo), paid: s('paid', S.paid),
    form: { pickup: s('form.pickup', F.pickup), pickupValue: s('form.pickupValue', F.pickupValue), dropoff: s('form.dropoff', F.dropoff), dropoffValue: s('form.dropoffValue', F.dropoffValue), book: s('form.book', F.book), notesHelp: s('form.notesHelp', F.notesHelp), notes: s('form.notes', F.notes) },
    empty: { title: s('empty.title', (S.empty || {}).title || '') },
    dialog: { title: s('dialog.title', D.title), body: s('dialog.body', D.body), confirm: s('dialog.confirm', D.confirm), keep: say(ctx, 'ui.screen.content.dialog.keep', D.keep) },
    st, name: say(ctx, 'name', ctx.brand.name),
  };
}

// ---- geometry shared with the guidelines lanes ----
export const reach = (kind, tuck) => ({ up: kind === 'satchel' ? 104 : kind === 'box' ? (tuck ? 88 : 56) : 0, down: kind === 'box' ? (tuck ? 88 : 56) : 0 });
export const inner = (kind, y0, y1) => ({ top: y0 + (kind === 'bag' ? 88 : 48), bot: y1 - (kind === 'bag' ? 56 : kind === 'satchel' ? 40 : 32) });
const fmtR = (ctx, a, b) => `${ctx.fmt(ctx.ratio(a, b))}:1`;

// the best text colour on a hex: the brand's own pairs first; a UI ground the brand never paired (a dark surface, a hover tint) takes the
// strongest of the brand colours and both modes' text and surface roles
export function inkOn(P, hex) {
  const { ctx, R } = P;
  try { return R.textOn(hex).ink; } catch { /* not a brand pair: measure below */ }
  const lm = colourMap(ctx, 'light'), dm = colourMap(ctx, 'dark');
  const c = [...ctx.brand.colours.map((k) => k.hex), lm.text, lm.surface, dm.text, dm.surface];
  return c.reduce((a, b) => (ctx.ratio(b, hex) > ctx.ratio(a, hex) ? b : a));
}

// ---- a kit page ----
export class KitPage {
  constructor(ctx, id) {
    this.ctx = ctx; this.id = id; this.R = roles(ctx); this.K = pack(ctx); this.B = ctx.brand;
    this.f = []; this.l = []; this.t = []; this.g = []; this.boxes = []; this.cells = [0, 1, 2, 3];
    this.kind = this.K.kind; this.y0 = this.kind === 'bag' ? 96 : 168; this.y1 = 912; this.gcol = this.R.ghost;
    // closures on a UI colour (a dark surface, a hover tint) ask for a line colour the brand never paired: measure it instead of failing
    this.RL = { ...this.R, lineOn: (hex) => (this.R.isGround(hex) ? this.R.ghost : inkOn(this, hex)) };
  }
  get inn() { return inner(this.kind, this.y0, this.y1); }
  field(x, y, w, h, hex) { this.f.push(`<div class="fd" style="left:${px(x)};top:${px(y)};width:${px(w)};height:${px(h)};background:${hex}"></div>`); }
  line(...s) { this.l.push(...s); }
  text(x, y, w, h, cls, html, style = '') {
    this.boxes.push({ x, y, w, h });
    this.t.push(`<div class="tx ${cls}" style="left:${px(x)};top:${px(y)};width:${px(w)};height:${px(h)};${style}">${html}</div>`);
  }
  // wrapped text at the real glyph widths; returns its height. Copy that holds a placeholder is not wrapped: the frame is one line.
  para(x, y, w, cls, role, weight, size, lh, s, style = '') {
    const r = marked(s) ? [s] : wrap(this.ctx, role, weight, s, size, w);
    this.text(x, y, w, r.length * lh, cls, r.map(esc).join('<br>'), `line-height:${lh}px;${style}`); return r.length * lh;
  }
  gh(kind, axis, at, a, b) { this.g.push({ kind, axis, at, a, b }); }
  // a die-cut window: a .ui region cut into the board, its cut line drawn just outside it in the line colour of the board it is cut from
  win(x, y, w, h, html, { dark = false, on, pad = 24, cls = '' } = {}) {
    this.boxes.push({ x, y, w, h });
    this.f.push(`<div class="ui u1-win ${cls}"${dark ? ' data-theme="dark"' : ''} style="left:${px(x)};top:${px(y)};width:${px(w)};height:${px(h)};padding:${pad}px">${html}</div>`);
    this.l.push(`<rect x="${r2(x - 0.75)}" y="${r2(y - 0.75)}" width="${r2(w + 1.5)}" height="${r2(h + 1.5)}" fill="none" stroke="${this.RL.lineOn(on || this.R.ground.hex)}" stroke-width="1.5"/>`);
  }
  html(hl) {
    const { ctx, R, id } = this, ink = R.groundText.ink, p = ctx.pages.find((x) => x.id === id) || {};
    const heads = [[40, say(ctx, 'name', this.B.name)], [244, 'UI kit'], [550, p.section ? p.section.title : ''], [856, p.title || '']];
    let out = heads.filter((h, i) => this.cells.includes(i) && h[1]).map(([x, s]) => `<div class="hd" style="left:${x}px">${esc(s)}</div>`).join('');
    out += `<div class="fo">${String(ctx.pageNo(id)).padStart(3, '0')}</div>`;
    // locator net: the palette in miniature, panels by share, this page's colour outlined
    const ws = allocate(R.order.map((c) => c.share), 240, 6); let x = 40, rects = '', hit = hl === 'all' ? [40, 240] : null;
    R.order.forEach((c, i) => {
      this.field(x, 1016, ws[i], 20, c.hex);
      if (R.isGround(c.hex)) rects += `<rect x="${x + 0.5}" y="1016.5" width="${ws[i] - 1}" height="19" fill="none" stroke="${this.gcol}" stroke-width="1"/>`;
      if (hl && hl !== 'all' && !hit && c.hex.toLowerCase() === hl.toLowerCase()) hit = [x, ws[i]];
      x += ws[i];
    });
    if (hit) rects += `<rect x="${hit[0] - 2}" y="1014" width="${hit[1] + 4}" height="24" fill="none" stroke="${ink}" stroke-width="1.5"/>`;
    const gl = this.g.map((g) => ghost(g.kind, g.axis, g.at, g.a, g.b, this.boxes, this.gcol)).join('');
    return unmark(`<section class="pg${this.kind === 'satchel' ? ' sat' : ''} u1" data-page="${id}" style="isolation:isolate">${this.f.join('')}<svg class="ln" viewBox="0 0 1080 1080" xmlns="http://www.w3.org/2000/svg">${gl}${this.l.join('')}${rects}</svg>${this.t.join('')}${out}</section>`);
  }
}

// ---- one panel at page scale (spec 2.3). role gives the shape; opts can move it: { x0, x1, y0, y1, l, r, valve, fin, near: [[a, b], ...], far: [x, ...] } ----
const SHAPE = { front: { x0: 244, x1: 1080, l: 'fold', r: 'bleed', near: [[40, 244]], far: [40] }, back: { x0: 0, x1: 756, l: 'bleed', r: 'fold', near: [[770, 1000]], far: [1000] }, side: { x0: 640, x1: 920, l: 'fold', r: 'fold', near: [[300, 640], [920, 1040]], far: [300, 1040] } };
export function panel(P, role, hex, opts = {}) {
  const { kind } = P, R = P.RL, base = SHAPE[role] || { x0: 40, x1: 1040, l: 'cut', r: 'cut', near: [], far: [] };
  const g = { ...base, y0: P.y0, y1: P.y1, valve: false, fin: kind === 'bag' && role === 'back', ...opts, hex, role: role === 'base' ? '' : role };
  P.field(g.x0, g.y0, g.x1 - g.x0, g.y1 - g.y0, hex);
  const out = [];
  if (kind === 'satchel') satchelFlap(R, g.x0, g.x1, g.y0, P.R.front.hex, g.l, g.r, out);   // one flap colour on every page: the front colour
  closure(R, kind, g, out);
  P.line(...out);
  // the bag's back seam: a fin on the panel's fold edge, tear-notched, with the seal line and crimp running through it
  if (g.fin) {
    const fx = g.x1, fw = 14, col = R.lineOn(hex), nx = fx + fw - 0.75;
    P.field(fx, g.y0, fw, g.y1 - g.y0, hex);
    P.line(L('cut', fx, g.y0 + 0.75, fx + fw, g.y0 + 0.75, col), L('cut', fx, g.y1 - 0.75, fx + fw, g.y1 - 0.75, col),
      pathLine('cut', `M${nx} ${g.y0}V${g.y0 + 50}L${nx - 8} ${g.y0 + 56}L${nx} ${g.y0 + 62}V${g.y1}`, col),
      L('seal', fx, g.y0 + 44, fx + fw, g.y0 + 44, col), crimp(fx, fx + fw, g.y0 + 44, col));
  }
  // the rest of the net on the ground: a bag's neighbouring gusset keeps its own seal, crimp and fold; other kinds show their cut lines as ghost
  const top = kind === 'bag' ? 'cut' : 'fold', bot = kind === 'bag' || kind === 'satchel' ? 'cut' : 'fold';
  for (const [a, b] of g.near || []) {
    if (kind === 'bag' && role !== 'side') { const o = []; closure(R, 'bag', { x0: a, x1: b, y0: g.y0, y1: g.y1, hex: P.R.ground.hex, l: 'none', r: 'none', role: 'side', valve: false }, o); P.line(...o); }
    else { P.gh(top, 'h', g.y0, a, b); P.gh(bot, 'h', g.y1, a, b); }
  }
  for (const x of g.far || []) P.gh('fold', 'v', x, g.y0, g.y1);
  return g;
}

// ---- a run of panels, left to right from x0 to 1040: [{ w, hex, role }]. Returns each panel's x. ----
export function kitNet(P, panels, y0, y1) {
  const { kind } = P, R = P.RL, out = [], first = panels[0], fcol = R.lineOn(first.hex);
  const sx = kind === 'box' ? 72 : 56;
  if (kind === 'box') out.push(pathLine('cut', `M${sx} ${y0}L40 ${y0 + 24}V${y1 - 24}L${sx} ${y1}`, P.gcol));
  else {
    P.field(40, y0, 16, y1 - y0, first.hex);
    out.push(L('cut', 40.75, y0, 40.75, y1, fcol), L('cut', 40, y0 + 0.75, 56, y0 + 0.75, fcol), L('cut', 40, y1 - 0.75, 56, y1 - 0.75, fcol));
    out.push(kind === 'bag' ? L('seal', 40, y0 + 44, 56, y0 + 44, fcol) + L('fold', 40, y1 - 40, 56, y1 - 40, fcol) + crimp(40, 56, y0 + 44, fcol) : L('seal', 40, y1 - 16, 56, y1 - 16, fcol));
  }
  if (kind === 'satchel') satchelFlap(R, 40, 1040, y0, P.R.front.hex, 'cut', 'cut', out);
  const xs = []; let x = sx;
  panels.forEach((p, i) => {
    xs.push(x);
    P.field(x, y0, p.w, y1 - y0, p.hex);
    closure(R, kind, { x0: x, x1: x + p.w, y0, y1, hex: p.hex, l: 'fold', r: i === panels.length - 1 ? 'cut' : 'none', role: p.role || '', valve: false }, out);
    x += p.w;
  });
  if (kind === 'bag') {
    const lc = R.lineOn(panels[panels.length - 1].hex);
    out.push(pathLine('cut', `M1040 ${y0 + 50}L1030 ${y0 + 56}L1040 ${y0 + 62}`, lc, { fill: P.R.ground.hex }), pathLine('cut', `M40 ${y0 + 50}L50 ${y0 + 56}L40 ${y0 + 62}`, fcol, { fill: P.R.ground.hex }));
  }
  P.line(...out);
  return { xs, sx };
}

// the largest size in the list at which a line of display type fits maxW
function fitSize(ctx, s, sizes, maxW, track = -0.01) {
  for (const z of sizes) if (textW(ctx, 'display', ctx.weights.heading, s, z) + track * z * String(s).length <= maxW) return z;
  return sizes[sizes.length - 1];
}
// a caption with only its literal values (tokens, hex, px, ratios) in mono
const VAL = /--[a-z0-9-]+|#[0-9A-Fa-f]{6}\b|\d+(?:\.\d+)?(?::1| px)?/g;
const mixed = (s) => { s = String(s); let o = '', i = 0; for (const m of s.matchAll(VAL)) { o += esc(s.slice(i, m.index)) + `<span class="m">${esc(m[0])}</span>`; i = m.index + m[0].length; } return o + esc(s.slice(i)); };

// ---- the pages ----
export const uikit = {
  // the front of the pack, as on the guidelines cover, but with a window cut in it: the product shows through the board
  cover(ctx) {
    const P = new KitPage(ctx, 'cover'); P.cells = [0, 1];
    const { R, kind } = P, hex = R.front.hex, tx = R.textOn(hex), W = ctx.weights, S = kitCopy(ctx), ui = ctx.ui, inn = P.inn;
    panel(P, 'front', hex, { valve: kind === 'bag' });
    // the logo, top left of the front, at most 300 wide and 96 tall
    const asp = ctx.logo.geo.aspect, lw = Math.min(300, 96 * asp), lh = lw / asp;
    P.text(284, 288, lw, lh, '', ctx.logo.html('colour', { width: lw, colourway: R.colourwayOn(hex), color: tx.ink }));
    // the window: the live status, the time promise and the main action, at their real size
    P.win(640, 288, 360, 312, `<div class="u1-cv">${ui.statusChip('on-the-way', { label: S.st('on-the-way') })}<p class="ui-display u1-cv-eta">${esc(S.eta)}</p><p class="u1-cv-p">${esc(S.pickup)}</p>${ui.btn(S.form.book)}</div>`, { on: hex });
    // one word on the page: the document's name, as large as fits the front
    const gz = fitSize(ctx, 'UI kit', [200, 184, 168, 152, 136], 716), glh = Math.round(gz * 0.86);
    const vy = inn.bot - 24, gy = vy - 32 - glh;
    P.text(284, gy, 716, glh, 'disp', 'UI kit', `font-size:${gz}px;line-height:${glh}px;letter-spacing:-.01em;color:${tx.ink}`);
    P.text(284, vy, 600, 24, 'b-body', esc(ctx.versionLine), `color:${tx.ink}`);
    return P.html(hex);
  },

  // the kit's own net: one panel a section, the widest for the section with the most pages, each listing its pages and their folios
  contents(ctx) {
    const P = new KitPage(ctx, 'contents'), { R, kind, K } = P, W = ctx.weights, gi = R.groundText;
    const secs = ctx.sections, total = secs.reduce((s, x) => s + x.pages.length, 0);
    const rank = [...secs].sort((a, b) => b.pages.length - a.pages.length || a.n - b.n), hues = [R.front, R.back, R.side, R.flap];
    const hexOf = (s) => (hues[rank.indexOf(s)] || R.flap).hex;
    const sx = kind === 'box' ? 72 : 56, ws = allocate(secs.map((s) => s.pages.length), 1040 - sx, 232);
    const most = Math.max(...secs.map((s) => s.pages.length));
    const t = kind === 'bag' ? 88 : 48, b = kind === 'bag' ? 56 : 40, y1 = kind === 'box' ? 824 : 912, y0 = y1 - (t + 72 + most * 24 + b);
    const { xs } = kitNet(P, secs.map((s, i) => ({ w: ws[i], hex: hexOf(s) })), y0, y1);
    secs.forEach((s, i) => {
      const x = xs[i], w = ws[i], hex = hexOf(s), tx = R.textOn(hex) || {}, ink = inkOn(P, hex);
      let y = y0 + t;
      const tz = fitSize(ctx, s.title, [32, 28, 24, 20], w - 48);
      P.text(x + 24, y + 32 - tz, w - 48, tz, 'disp', esc(s.title), `font-size:${tz}px;line-height:${tz}px;color:${ink}`);
      P.text(x + 24, y + 40, w - 48, 20, 'b-small', `${s.pages.length} pages`, `color:${ink}`);
      y += 72;
      for (const p of s.pages) {
        P.text(x + 24, y, w - 88, 20, 'b-small', esc(p.title), `color:${ink}`);
        P.text(x + w - 64, y, 40, 20, 'b-small', String(p.no).padStart(3, '0'), `color:${ink};text-align:right;font-variant-numeric:tabular-nums`);
        y += 24;
      }
    });
    // the ground above the net: what the net is, in one line
    P.para(40, 96, 504, 'b-body', 'body', W.regular, 15, 24, `The kit folds like the ${K.noun}: ${secs.length} panels, one for each section, ${total} pages in all. The widest panel holds the most pages.`, `color:${gi.ink}`);
    return P.html('all');
  },

  'colour-light': (ctx) => colourPage(ctx, 'colour-light', 'light'),
  'colour-dark': (ctx) => colourPage(ctx, 'colour-dark', 'dark'),

  // the back panel carries the type at its real sizes; each style's spec runs on across the fold, on the ground
  'type-scale'(ctx) {
    const P = new KitPage(ctx, 'type-scale'), { R, B } = P, W = ctx.weights, hex = R.back.hex, ink = inkOn(P, hex), gi = R.groundText, inn = P.inn, S = kitCopy(ctx);
    const g = panel(P, 'back', hex);
    const sx = 40, sw = 676, rx = g.x1 + (g.fin ? 14 : 0) + 40, rw = 1040 - rx;
    const dF = B.fonts.display, bF = B.fonts.body, stretch = dF.stretch || 100;
    // the two faces first: the display family set in itself, the body family below it
    let y = inn.top;
    const fz = fitSize(ctx, dF.family, [56, 48, 40, 32], sw);
    P.text(sx, y, sw, fz, 'disp', esc(dF.family), `font-size:${fz}px;line-height:${fz}px;letter-spacing:-.01em;color:${ink}`);
    P.text(rx, y, rw, 20, 'cap', `Display, ${W.heading}`, `color:${gi.ink}`);
    P.text(rx, y + 20, rw, 16, 'm', esc(dF.family), `color:${gi.quiet}`);
    y += fz + 8;
    P.text(sx, y, sw, 32, 'b-body', esc(bF.family), `font-size:28px;line-height:32px;color:${ink}`);
    P.text(rx, y + 4, rw, 20, 'cap', `Body, ${[W.regular, W.medium, W.strong].filter((v, i, a) => a.indexOf(v) === i).join(', ')}`, `color:${gi.ink}`);
    y += 32 + 40;
    const sample = { caption: S.form.notesHelp, label: S.form.pickup, body: S.pickup, control: S.form.book, 'title-s': S.dialog.title, title: S.eta, headline: S.empty.title || S.eta };
    const rows = [...ctx.uiType].reverse();
    // each row is as tall as its sample or its spec, whichever is taller, plus a gap that shrinks if the page runs short
    const specs = rows.map((t) => wrap(ctx, 'chrome', 400, t.use, 14, rw));
    const hts = rows.map((t, i) => Math.max(t.line, 16 + specs[i].length * 20));
    const gap = Math.max(12, Math.min(28, Math.floor((inn.bot - y - hts.reduce((a, b) => a + b, 0)) / (rows.length - 1))));
    rows.forEach((t, i) => {
      const face = t.face === 'display' ? `font-family:var(--display);font-stretch:${stretch}%;letter-spacing:-.01em;` : 'font-family:var(--body);';
      let s = sample[t.token] || t.use;
      // a sample that would run past the fold is cut back to whole words; a placeholder frame is one line already
      if (!marked(s)) while (textW(ctx, t.face === 'display' ? 'display' : 'body', t.weight, s, t.size) > sw && s.includes(' ')) s = s.replace(/[\s,]+\S+$/, '');
      P.text(sx, y, sw, t.line, 'u1-ts', esc(s), `${face}font-size:${t.size}px;line-height:${t.line}px;font-weight:${t.weight};color:${ink}`);
      P.text(rx, y, rw, 16, 'm', `${esc(t.token)}&nbsp; ${t.size} / ${t.line} / ${t.weight}`, `color:${gi.ink}`);
      P.text(rx, y + 16, rw, specs[i].length * 20, 'cap', specs[i].map(esc).join('<br>'), `color:${gi.quiet}`);
      y += hts[i] + gap;
    });
    return P.html(hex);
  },

  // the gusset as a ruler: every step of the scale at its true size, and the base step large on the ground
  spacing(ctx) {
    const P = new KitPage(ctx, 'spacing'), { R } = P, W = ctx.weights, hex = R.side.hex, ink = inkOn(P, hex), gi = R.groundText, inn = P.inn, ui = ctx.ui, S = kitCopy(ctx);
    const g = panel(P, 'side', hex), base = ctx.brand.ui.spacingBase || ctx.space[0].px;
    const big = Math.max(...ctx.space.map((s) => s.px)), qx = g.x0 + 40, lx = qx + big + 16;
    let y = inn.top;
    for (const s of ctx.space) {
      const h = Math.max(s.px, 32);
      P.field(qx, y, s.px, s.px, ink);
      P.text(lx, y, g.x1 - 40 - lx, 16, 'm', `--${s.token.replace('space-', 'sp-')}`, `color:${ink}`);
      P.text(lx, y + 16, g.x1 - 40 - lx, 16, 'm', `${s.px} px`, `color:${ink}`);
      y += h + 12;
    }
    // the base step, large on the ground, then the rule it sets
    const word = `${base} px`, gz = fitSize(ctx, word, [200, 176, 160], 520), glh = Math.round(gz * 0.86);
    P.text(40, inn.top, 560, glh, 'disp', esc(word), `font-size:${gz}px;line-height:${glh}px;letter-spacing:-.01em;color:${gi.ink}`);
    let ty = inn.top + glh + 32;
    const sp = (i) => ctx.space[Math.min(i, ctx.space.length - 1)];
    const steps = 44 % base === 0 ? `, ${44 / base} steps` : '';
    ty += P.para(40, ty, 520, 'b-body', 'body', W.regular, 15, 24, `Every gap in the kit is a step of ${base} px. The gap inside a group is smaller than the gap between groups, so the grouping reads before the words do. Controls are 44 px tall${steps}; small buttons are 36 px.`, `color:${gi.ink}`) + 32;
    // the scale at work: a window in the unprinted board, its padding, field gap and button gap all taken from the scale
    const p5 = sp(4), p3 = sp(2), wh = Math.min(inn.bot - ty, 216);
    P.win(40, ty, 520, wh, `<div class="u1-sp" style="gap:${p5.px}px">${ui.field({ id: 'u1-sp1', label: S.form.pickup, value: S.form.pickupValue })}<div class="u1-row" style="gap:${p3.px}px">${ui.btn(S.form.book)}${ui.btn(say(ctx, 'ui.screen.content.call', ctx.brand.ui.screen.content.call), { variant: 'secondary' })}</div></div>`, { pad: p5.px });
    const capY = ty + wh + 12;
    if (capY + 20 <= inn.bot + 16) P.text(40, capY, 560, 20, 'cap', mixed(`Padding --sp-${ctx.space.indexOf(p5) + 1}, ${p5.px} px. Buttons --sp-${ctx.space.indexOf(p3) + 1}, ${p3.px} px apart.`), `color:${gi.quiet}`);
    return P.html(hex);
  },

  // the base of the pack holds the corners; the board above it holds the three line weights, each on the part that uses it
  'radii-borders'(ctx) {
    const P = new KitPage(ctx, 'radii-borders'), { R, kind } = P, W = ctx.weights, gi = R.groundText, ui = ctx.ui, S = kitCopy(ctx);
    const hex = R.flap.hex, ink = inkOn(P, hex), [rc, rk, rr] = ctx.radii, [bh, bc, bf] = ctx.borders;
    P.y0 = 576; P.y1 = kind === 'box' ? 880 : 912;
    panel(P, 'base', hex, { x0: 40, x1: 1040, l: 'cut', r: 'cut' });
    const inn = P.inn;
    // radii: three windows in the base, each as wide as its part needs, the token and use on the board under it
    const rad = [
      [200, `<div class="u1-c">${ui.btn(S.form.book)}</div>`, `--r-control ${rc.px} px`, rc.use],
      [360, `<div class="u1-c u1-c--card">${ui.card({ meta: S.status, title: S.rider, text: S.riderNote })}</div>`, `--r-card ${rk.px} px`, rk.use],
      [240, `<div class="u1-c">${ui.switch(say(ctx, 'ui.screen.content.share', 'On'), { checked: true })}</div>`, '--r-round 9999 px', rr.use],
    ];
    const wh = Math.min(152, inn.bot - inn.top - 52), gapX = Math.floor((1000 - 80 - rad.reduce((s, r) => s + r[0], 0)) / (rad.length - 1));
    let x = 80;
    for (const [w, html, tok, use] of rad) {
      P.win(x, inn.top, w, wh, html, { on: hex, pad: 16 });
      P.text(x, inn.top + wh + 12, w, 16, 'm', esc(tok), `color:${ink}`);
      P.text(x, inn.top + wh + 30, w, 20, 'cap', esc(use), `color:${ink}`);
      x += w + gapX;
    }
    // borders: one window on the board, a part per line weight, the spec to its left on the same row
    const top = 96, rowH = 96, ww = 520, wx = 520, wy = top;
    const parts = [
      [`<ul class="ui-list">${ui.row({ lead: ui.icon(ctx.brand.ui.rowIcon || 'package', 18), title: S.rider, sub: S.riderNote, end: S.paid })}</ul>`, bh, '--w-hairline'],
      [ui.field({ id: 'u1-rb1', label: S.form.dropoff, value: S.form.dropoffValue }), bc, '--w-control'],
      [ui.field({ id: 'u1-rb2', label: S.form.pickup, value: S.form.pickupValue, state: 'focus' }), bf, '--w-focus'],
    ];
    const wH = 24 * 2 + rowH * parts.length;
    P.win(wx, wy, ww, wH, `<div class="u1-bd" style="grid-template-rows:repeat(${parts.length},${rowH}px)">${parts.map((p) => `<div>${p[0]}</div>`).join('')}</div>`);
    parts.forEach(([, b, tok], i) => {
      const ry = wy + 24 + i * rowH + 24;
      P.text(40, ry, 400, 16, 'm', `${esc(tok)}&nbsp; ${b.px} px`, `color:${gi.ink}`);
      P.text(40, ry + 20, 400, 20, 'cap', esc(b.use), `color:${gi.quiet}`);
    });
    return P.html(hex);
  },

  // depth in the die is a fold, never a shadow: the ground steps on the board, and a dialog floating over the scrim inside the window
  elevation(ctx) {
    const P = new KitPage(ctx, 'elevation'), { R } = P, W = ctx.weights, gi = R.groundText, ui = ctx.ui, S = kitCopy(ctx), inn = P.inn, M = colourMap(ctx, 'light');
    const hex = R.side.hex, ink = inkOn(P, hex);
    const g = panel(P, 'front', hex, { x0: 440, near: [[40, 440]], far: [40] });
    // the window: the scrim and the dialog on it, at their real size
    const wx = g.x0 + 40, ww = 1040 - wx, wh = 400;
    P.win(wx, inn.top, ww, wh, `<div class="ui-scrim u1-fill">${ui.dialog({ title: S.dialog.title, body: S.dialog.body, confirm: S.dialog.confirm, keep: S.dialog.keep }).replace(/dlg-t/g, 'u1-dlg')}</div>`, { on: hex, pad: 0 });
    const sh = tokenGroups(ctx).shadow['shadow-float'];
    const cy = inn.top + wh + 24;
    P.para(wx, cy, ww, 'b-small', 'body', W.regular, 14, 20, `A dialog floats on --scrim with a ${ctx.borders[1].px} px edge in --text. Shadow: ${sh}.`.replace(/--[a-z-]+/g, (m) => m), `color:${ink}`);
    // the ground steps, on the board beside the panel
    const steps = [['sunken', 'Avatars, skeletons, wells'], ['surface', 'The page, and every card on it'], ['raised', 'Raised cards, sidebars, table headers']];
    let y = inn.top;
    const note = say(ctx, 'ui.elevationNote', ctx.brand.ui.elevationNote || '');
    if (note) y += P.para(40, y, 360, 'b-body', 'body', W.regular, 15, 24, marked(note) ? note : note, `color:${gi.ink}`) + 40;
    for (const [tok, use] of steps) {
      P.field(40, y, 120, 64, M[tok]);
      if (ctx.ratio(M[tok], R.ground.hex) < 1.1) P.line(`<rect x="40.5" y="${y + 0.5}" width="119" height="63" fill="none" stroke="${P.gcol}" stroke-width="1"/>`);
      P.text(176, y, 224, 16, 'm', `--${tok}&nbsp; ${esc(M[tok])}`, `color:${gi.ink}`);
      P.text(176, y + 20, 224, 40, 'cap wrap', esc(use), `color:${gi.quiet}`);
      y += 64 + 24;
    }
    return P.html(hex);
  },
};

// ---- colour, light and dark: the UI's grounds are the board, and every ink is printed on the ground it is measured on ----
const INKS = { surface: ['text', 'text-soft', 'quiet', 'edge', 'divider', 'focus', 'success', 'warning', 'danger', 'info'], raised: ['text', 'quiet'], sunken: ['text', 'quiet-sunken'], 'disabled-bg': ['disabled-text'] };
const LINES = new Set(['edge', 'divider', 'focus']);
function colourPage(ctx, id, mode) {
  const P = new KitPage(ctx, id), M = colourMap(ctx, mode), { R, kind } = P, W = ctx.weights, gi = R.groundText, dark = mode === 'dark';
  const best = (bg) => [M.text, M.surface, M['action-label']].reduce((a, b) => (ctx.ratio(b, bg) > ctx.ratio(a, bg) ? b : a));
  const cols = [{ tok: 'surface', wt: 3.4 }, { tok: 'raised', wt: 1 }, { tok: 'sunken', wt: 1 }, { tok: 'action', bands: ['action', 'action-hover', 'action-pressed'], wt: 1.1 }, { tok: 'disabled-bg', wt: 1 }, { tok: 'scrim', wt: 0.9 }];
  const t = kind === 'bag' ? 88 : 48, b = kind === 'bag' ? 56 : kind === 'satchel' ? 40 : 32, rows = INKS.surface.length, pitch = 44;
  const need = t + 52 + rows * pitch - 12 + b;
  const down = reach(kind, true).down;
  // light hangs from the top of the sheet, dark stands on the foot, so the pair never reads as one page twice
  const y0 = dark ? 912 - down - need : P.y0, y1 = y0 + need;
  const sx = kind === 'box' ? 72 : 56, ws = allocate(cols.map((c) => c.wt), 1040 - sx, 156);
  const { xs } = kitNet(P, cols.map((c, i) => ({ w: ws[i], hex: M[c.tok] })), y0, y1);
  const row = (x, y, w, tok, bg) => {
    const c = M[tok], r = ctx.ratio(c, bg), reads = !LINES.has(tok) && r >= 4.5, on = reads ? c : best(bg);
    let lx = x;
    if (!reads) { P.field(x, y + 7, 16, LINES.has(tok) ? 2 : 8, c); lx = x + 24; }
    P.text(lx, y, w - (lx - x), 16, 'm', `--${tok}`, `color:${on}`);
    P.text(x, y + 16, w, 16, 'm', `${esc(c)}&nbsp; ${fmtR(ctx, c, bg)}`, `color:${on}`);
  };
  cols.forEach((c, i) => {
    const x = xs[i] + 16, w = ws[i] - 32;
    if (c.bands) {
      const bh = Math.floor((y1 - y0) / c.bands.length);
      c.bands.forEach((tok, k) => {
        const by = y0 + k * bh, bg = M[tok], hh = k === c.bands.length - 1 ? y1 - by : bh;
        if (k) { P.field(xs[i], by, ws[i], hh, bg); P.line(L('fold', xs[i], by, xs[i] + ws[i], by, inkOn(P, M[c.bands[k - 1]]))); }
        const ty = k ? by + 20 : y0 + t, on = best(bg);
        P.text(x, ty, w, 16, 'm', `--${tok}`, `color:${on}`);
        P.text(x, ty + 16, w, 16, 'm', esc(bg), `color:${on}`);
        row(x, ty + 48, w, 'action-label', bg);
      });
      return;
    }
    const bg = M[c.tok], on = best(bg);
    P.text(x, y0 + t, w, 16, 'm', `--${c.tok}`, `color:${on}`);
    P.text(x, y0 + t + 16, w, 16, 'm', esc(bg), `color:${on}`);
    if (c.tok === 'scrim') P.text(x, y0 + t + 52, w, 20, 'cap', 'Behind dialogs', `color:${on}`);
    (INKS[c.tok] || []).forEach((tok, k) => row(x, y0 + t + 52 + k * pitch, w, tok, bg));
  });
  // three short rules on the ground, beside the net
  const L3 = [
    `Roles name a job, not a colour. Components read --action, never a palette name, so ${dark ? 'dark' : 'light'} and ${dark ? 'light' : 'dark'} swap without a change to the markup.`,
    'Each ink sits on the ground it is measured on. Text under 24 px needs 4.5:1. Edges and the focus ring need 3:1; a divider is decoration.',
    `The action label reads at ${fmtR(ctx, M['action-label'], M.action)} on the fill, ${fmtR(ctx, M['action-label'], M['action-hover'])} on hover and ${fmtR(ctx, M['action-label'], M['action-pressed'])} pressed.`,
  ];
  const ry = dark ? 96 : y1 + down + 40, cw = 300;
  L3.forEach((s, i) => {
    const lines = wrap(ctx, 'body', W.regular, s, 14, cw);
    P.text(40 + i * 340, ry, cw, lines.length * 20, 'b-small', lines.map(mixed).join('<br>'), `color:${gi.ink}`);
  });
  return P.html('all');
}

// ---- css: the kit tokens and the real components (once, for every kit lane), then this lane's page parts, all under .pg ----
export function css(ctx) {
  const g = tokenGroups(ctx), decl = (o) => Object.entries(o).map(([k, v]) => `--${k}:${v};`).join('');
  return `
.pg .ui{${decl(colourMap(ctx, 'light'))}${decl(g.space)}${decl(g.radius)}${decl(g.width)}${decl(g.font)}${decl(g.text)}${decl(g.shadow)}}
.pg .ui[data-theme="dark"]{${decl(colourMap(ctx, 'dark'))}}
${componentsCss(ctx).replace(/^\/\*[^\n]*\n/, '')}
.pg .ui :where(h1,h2,h3,p,ul,ol,dl,dd){margin:0;padding:0}
.pg .ui-display{font-stretch:${ctx.brand.fonts.display.stretch || 100}%}
/* a die-cut window: the kit's surface seen through the board */
.pg .u1-win{position:absolute;z-index:0;overflow:hidden;display:flex;flex-direction:column}
.pg .u1-ph{display:inline-block;border:1px dashed currentColor;padding:0 .3em;font-family:var(--chrome);font-weight:500;font-style:normal;letter-spacing:0;line-height:1.2;white-space:nowrap;vertical-align:baseline}
.pg.u1 .tx.wrap{white-space:normal}
.pg .u1-cv{display:flex;flex-direction:column;align-items:flex-start;height:100%}
.pg .u1-cv-eta{font-size:var(--fs-title);line-height:var(--lh-title);margin:12px 0 8px}
.pg .u1-cv-p{color:var(--text-soft);font-size:var(--fs-body);line-height:var(--lh-body);margin-bottom:auto;white-space:normal}
.pg .u1-sp{display:flex;flex-direction:column}
.pg .u1-row{display:flex;flex-wrap:wrap}
.pg .u1-c{display:flex;align-items:center;justify-content:flex-start;height:100%}
.pg .u1-c--card{align-items:stretch}.pg .u1-c--card>.ui-card{flex:1}
.pg .u1-bd{display:grid;align-content:start}.pg .u1-bd>div{display:flex;flex-direction:column;justify-content:center}
.pg .u1-fill{height:100%;width:100%}
`;
}
