// Theme 32, Dieline, lane g2: the logo pages (logo, logo-versions, clear-space, min-size, logo-grounds, logo-misuse).
// The logo is read off the pack it prints on: the front panel as printed, every version on the panel or base that fits it,
// the clear zone as the safe line of a die, the minimum on the narrowest panel at actual size, the grounds as a sleeve turned
// on its side, and misuse as a press sheet of rejected proofs. Colours come from roles and colourways, so nothing names a brand.
import { phTight } from './ph.js';
import { roles, pack, allocate, measure, wrap, L, pathLine, ghost, closure, satchelFlap, crimp, flapPath, r2, esc } from './geom.js';
import { DESCRIPTORS } from '../../engine/placeholders.js';

const px = (n) => `${r2(n)}px`;
// where text may start and end inside a panel, clear of the seal, crimp, gusset fold or weld seam
const inner = (kind, y0, y1) => ({ top: y0 + (kind === 'bag' ? 88 : 48), bot: y1 - (kind === 'bag' ? 56 : kind === 'satchel' ? 40 : 32) });
// slot edition: the engine does not swap this theme's brand copy, so a page asks for it through P.copy(path, s) and gets the
// engine's own descriptor (what to write, how long) back, drawn as a dashed block of measured height
const isPh = (s) => s && typeof s === 'object' && s.ph;

// ---- a page: fields (divs), die lines (one svg under the text), text, chrome. A copy of lane-g1's Pg (guidelines.js does not export it) ----
class Pg {
  constructor(ctx, id) {
    this.ctx = ctx; this.id = id; this.R = roles(ctx); this.K = pack(ctx); this.B = ctx.brand; this.slot = ctx.edition === 'slot';
    this.f = []; this.l = []; this.t = []; this.g = []; this.boxes = [];
    this.kind = this.K.kind; this.y0 = this.kind === 'bag' ? 96 : 168; this.y1 = 912; this.gcol = this.R.ghost;
  }
  field(x, y, w, h, hex) { this.f.push(`<div class="fd" style="left:${px(x)};top:${px(y)};width:${px(w)};height:${px(h)};background:${hex}"></div>`); }
  line(...s) { this.l.push(...s); }
  text(x, y, w, h, cls, html, style = '') {
    this.boxes.push({ x, y, w, h });
    this.t.push(`<div class="tx ${cls}" style="left:${px(x)};top:${px(y)};width:${px(w)};height:${px(h)};${style}">${html}</div>`);
  }
  para(x, y, w, cls, role, weight, size, lh, s, style) { const r = wrap(this.ctx, role, weight, s, size, w); this.text(x, y, w, r.length * lh, cls, r.map(esc).join('<br>'), `line-height:${lh}px;${style}`); return r.length * lh; }
  gh(kind, axis, at, a, b) { this.g.push({ kind, axis, at, a, b }); }
  copy(path, s) { if (!this.slot || this.ctx.placeholders) return s; const d = DESCRIPTORS[path]; return d ? { ph: d } : s; }
  phLines(w, d) { return wrap(this.ctx, 'chrome', 400, d.what, 14, w - 30); }
  // a note: a 500 head and a 400 body in chrome type; a placeholder body is a dashed block: label, what to write, how long
  note(x, y, w, head, body, c) {
    let h = 0;
    if (head) { this.text(x, y, w, 20, 'cap', esc(head), `font-weight:500;color:${c.ink}`); h = 20; }
    if (isPh(body)) {
      const d = body.ph, r = this.phLines(w, d), bh = (r.length + 2) * 20 + 27;
      this.text(x, y + h + 8, w, bh, 'cap', `<span style="font-weight:500">${esc(d.label)}</span><br>${r.map(esc).join('<br>')}<br>${esc(d.length)}`, `box-sizing:border-box;padding:12px 15px;border:1.5px dashed ${c.ink};line-height:20px;color:${c.ink}`);
      h += 8 + bh;
    } else if (body) h += this.para(x, y + h, w, 'cap', 'chrome', 400, 14, 20, body, `color:${c.quiet}`);
    return h;
  }
  noteH(w, head, body) { return (head ? 20 : 0) + (isPh(body) ? 8 + (this.phLines(w, body.ph).length + 2) * 20 + 27 : body ? 20 * wrap(this.ctx, 'chrome', 400, body, 14, w).length : 0); }
  // a colour's name for a sentence; in the slot edition the hex, since a name there is a placeholder of unknown width
  nm(hex) {
    if (this.slot) return hex.toUpperCase();
    const h = hex.toLowerCase(), c = [...this.B.colours, ...(this.B.tones || [])].find((x) => x.hex.toLowerCase() === h);
    return c ? c.name : hex.toUpperCase();
  }
  html(hl) {
    const { ctx, R, id } = this, ink = R.groundText.ink, p = ctx.pages.find((x) => x.id === id) || {};
    const heads = [[40, this.B.name], [244, 'Brand guidelines'], [550, p.section ? p.section.title : ''], [856, p.title || '']];
    let out = heads.filter((h) => h[1]).map(([x, s]) => `<div class="hd" style="left:${x}px">${esc(s)}</div>`).join('');
    out += `<div class="fo">${String(ctx.pageNo(id)).padStart(3, '0')}</div>`;
    // locator net: the palette in miniature, panels by share, this page's colour outlined
    const ws = allocate(R.order.map((c) => c.share), 240, 6); let x = 40, rects = '', hit = hl === 'all' ? [40, 240] : null;
    R.order.forEach((c, i) => {
      this.field(x, 1016, ws[i], 20, c.hex);
      if (R.isGround(c.hex)) rects += `<rect x="${x + 0.5}" y="1016.5" width="${ws[i] - 1}" height="19" fill="none" stroke="${this.gcol}" stroke-width="1"/>`;
      if (hl && hl !== 'all' && c.hex.toLowerCase() === hl.toLowerCase()) hit = [x, ws[i]];
      x += ws[i];
    });
    if (hit) rects += `<rect x="${hit[0] - 2}" y="1014" width="${hit[1] + 4}" height="24" fill="none" stroke="${ink}" stroke-width="1.5"/>`;
    const gl = this.g.map((g) => ghost(g.kind, g.axis, g.at, g.a, g.b, this.boxes, this.gcol)).join('');
    return `<section class="pg${this.kind === 'satchel' ? ' sat' : ''}${phTight(this.ctx, this.id)} g2" data-page="${id}" style="isolation:isolate">${this.f.join('')}<svg class="ln" viewBox="0 0 1080 1080" xmlns="http://www.w3.org/2000/svg">${gl}${this.l.join('')}${rects}</svg>${this.t.join('')}${out}</section>`;
  }
}

// a filled panel with the kind's closures (satchel flap in the front colour, as on every page of the theme)
function panel(P, g) {
  P.field(g.x0, g.y0, g.x1 - g.x0, g.y1 - g.y0, g.hex);
  const out = [];
  if (P.kind === 'satchel') satchelFlap(P.R, g.x0, g.x1, g.y0, P.R.front.hex, g.l, g.r, out);
  closure(P.R, P.kind, { valve: false, ...g }, out);
  P.line(...out);
}
// the unprinted neighbour on the ground: on a bag its own seal, crimp and gusset fold in ghost; on other kinds the cut lines only
function neighbour(P, a, b, y0, y1, far) {
  if (P.kind === 'bag') { const o = []; closure(P.R, 'bag', { x0: a, x1: b, y0, y1, hex: P.R.ground.hex, l: 'none', r: 'none', role: 'side', valve: false }, o); P.line(...o); }
  else { const top = P.kind === 'box' ? 'fold' : 'cut'; P.gh(top, 'h', y0, a, b); P.gh('cut', 'h', y1, a, b); }
  if (far != null) P.gh('fold', 'v', far, y0, y1);
}
// a bag's tear notch, cut into an outer edge at the seal
const notch = (P, x, y0, dir, col) => P.line(pathLine('cut', `M${x} ${y0 + 50}L${x + dir * 10} ${y0 + 56}L${x} ${y0 + 62}`, col, { fill: P.R.ground.hex }));
// the widest a logo version can be inside a w x h box
const fitW = (ctx, id, w, h) => { const g = ctx.logo.geos[id]; return Math.floor(Math.min(w, h * g.w / g.h)); };
const logoH = (ctx, id, w) => { const g = ctx.logo.geos[id]; return w * g.h / g.w; };
// a colourway's parts in words: "Name in Coal, line in Anchorage." or "Name and line in Coal."
function partsOf(P, cw) {
  const by = new Map();
  for (const [k, hex] of Object.entries(cw)) { if (k === 'ground') continue; const h = hex.toLowerCase(); by.set(h, [...(by.get(h) || []), k]); }
  const s = [...by.entries()].map(([h, ks]) => `${ks.join(' and ')} in ${P.nm(h)}`).join(', ');
  return s.charAt(0).toUpperCase() + s.slice(1) + '.';
}
// a colourway's name on the page: the engine's label for the four primary ones, else the ground it is drawn for
const cwLabel = (P, key) => P.ctx.logo.labels[key] || `On ${P.nm(P.B.logo.colourways[key].ground)}`;

export const guidelines = {
  // the front panel as it prints: the logo alone on the front colour, the die around it; the idea and the colourway on the board beside
  logo(ctx) {
    const P = new Pg(ctx, 'logo'), { R, B, kind } = P, hex = R.front.hex, tx = R.textOn(hex), gi = R.groundText, Lg = ctx.logo;
    const x0 = 40, x1 = 700, { y0, y1 } = P, ins = inner(kind, y0, y1), key = R.colourwayOn(hex), cw = B.logo.colourways[key];
    panel(P, { x0, x1, y0, y1, hex, l: 'cut', r: 'fold', role: 'front', valve: kind === 'bag' });
    if (kind === 'bag') notch(P, x0, y0, 1, R.lineOn(hex));
    neighbour(P, x1, 1040, y0, y1, 1040);
    // the logo: as wide as the panel allows with 64 clear each side, and no taller than a third of the printable height
    const lw = fitW(ctx, 'colour', x1 - x0 - 128, (ins.bot - ins.top) / 3), lh = logoH(ctx, 'colour', lw);
    const ly = Math.round(ins.top + (ins.bot - ins.top - lh) * 0.56);
    P.text(x0 + 64, ly, lw, lh, '', Lg.html('colour', { width: lw, colourway: key, color: tx.ink }), `color:${tx.ink}`);
    // the board beside: the idea at the top, the colourway that prints here at the foot
    const nx = x1 + 40, nw = 260, c = { ink: gi.ink, quiet: gi.ink };
    P.note(nx, ins.top, nw, 'The idea', P.copy('logo.idea', B.logo.idea), c);
    const when = B.logo.when[key] ? P.copy(`logo.when.${key}`, B.logo.when[key]) : partsOf(P, cw);
    const vals = Object.entries(cw).filter(([k]) => k !== 'ground').map(([k, h]) => `${k} ${h.toUpperCase()}`);
    const vh = vals.length * 16, nh = P.noteH(nw, `Printed here: ${cwLabel(P, key)}`, when);
    const fy = ins.bot - vh - 12 - nh;
    P.note(nx, fy, nw, `Printed here: ${cwLabel(P, key)}`, when, c);
    P.text(nx, ins.bot - vh, nw, vh, 'm', vals.map(esc).join('<br>'), `color:${gi.quiet}`);
    return P.html(hex);
  },

  // the run of body panels, each printed in the colourway it carries; the three shapes that need a different space on the base strip under them
  'logo-versions'(ctx) {
    const P = new Pg(ctx, 'logo-versions'), { R, B, kind } = P, Lg = ctx.logo, cws = B.logo.colourways, out = [];
    const y0 = kind === 'bag' ? 96 : kind === 'box' ? 168 : 184, yb = 704, y2 = 832, top = y0 + (kind === 'bag' ? 88 : 48);
    const body = [['colour', 40, 440], ['mono-dark', 440, 620], ['reversed', 620, 820], ['mono-light', 820, 1040]];
    const base = [['horizontal', 40, 620], ['stacked', 620, 820], ['symbol', 820, 1040]];
    if (kind === 'satchel') satchelFlap(R, 40, 1040, y0, R.front.hex, 'cut', 'cut', out);
    // a version's cell: filled with the ground of the colourway it uses
    const vers = (id, a, b, ya, yz) => {
      const cw = cws[Lg.colourwayOf(id)], hex = cw.ground, col = R.lineOn(hex), tx = R.textOn(hex), w = b - a;
      P.field(a, ya, w, yz - ya, hex);
      return { cw, hex, col, tx, w };
    };
    // every caption starts on one line and every logo sits on one centre line, so the run reads as one printed strip
    const whenOf = (id) => P.copy(`logo.when.${id}`, B.logo.when[id]);
    const ny = yb - 32 - Math.max(...body.map(([id, a, b]) => P.noteH(b - a - 56, Lg.labels[id], whenOf(id)))), cy = top + (ny - 32 - top) * 0.46;
    body.forEach(([id, a, b], i) => {
      const { col, tx, w } = vers(id, a, b, y0, yb);
      // top edge: the bag's film cut with its seal and crimp; on a box or satchel the fold its flap hinges on
      out.push(L(kind === 'bag' ? 'cut' : 'fold', a, y0 + 0.75, b, y0 + 0.75, col));
      if (kind === 'bag') out.push(L('seal', a, y0 + 44, b, y0 + 44, col), crimp(a, b, y0 + 44, col));
      if (kind === 'box') { const tuck = i % 2 === 0; out.push(pathLine('cut', flapPath(tuck ? 'tuck' : 'dust', tuck ? a + 12 : a, tuck ? b - 12 : b, y0, tuck ? 88 : 56, -1), R.ghost)); }
      out.push(L(i === 0 ? 'cut' : 'fold', a + 0.75, y0, a + 0.75, yb, col), L('fold', a, yb - 0.75, b, yb - 0.75, col));
      if (i === body.length - 1) out.push(L('cut', b - 0.75, y0, b - 0.75, yb, col));
      const head = Lg.labels[id];
      P.note(a + 28, ny, w - 56, head, whenOf(id), { ink: tx.ink, quiet: tx.quiet });
      const lw = fitW(ctx, id, Math.min(w - 72, 300), 160), lh = logoH(ctx, id, lw), ly = Math.round(cy - lh / 2);
      P.text(a + (w - lw) / 2, ly, lw, lh, '', Lg.html(id, { width: lw, colourway: Lg.colourwayOf(id), color: tx.ink, label: head }), `color:${tx.ink}`);
    });
    if (kind === 'bag') { notch(P, 40, y0, 1, R.lineOn(cws[Lg.colourwayOf(body[0][0])].ground)); notch(P, 1040, y0, -1, R.lineOn(cws[Lg.colourwayOf(body[3][0])].ground)); }
    // the base strip: cut at its foot and ends, folded between the three shapes; each caption on the board under its cell
    base.forEach(([id, a, b], i) => {
      const { col, tx, w } = vers(id, a, b, yb, y2);
      out.push(L('cut', a, y2 - 0.75, b, y2 - 0.75, col), L(i === 0 ? 'cut' : 'fold', a + 0.75, yb, a + 0.75, y2, col));
      if (i === base.length - 1) out.push(L('cut', b - 0.75, yb, b - 0.75, y2, col));
      const lw = fitW(ctx, id, w - 80, 72), lh = logoH(ctx, id, lw);
      P.text(a + (w - lw) / 2, yb + (y2 - yb - lh) / 2, lw, lh, '', Lg.html(id, { width: lw, colourway: 'colour', color: tx.ink, label: Lg.labels[id] }), `color:${tx.ink}`);
      P.note(a, y2 + 16, w - 24, Lg.labels[id], P.copy(`logo.when.${id}`, B.logo.when[id]), P.R.groundText);
    });
    P.line(...out);
    return P.html('all');
  },

  // the safe line of a die drawn round the logo: the clear zone, x on every side, on the back panel; the rule on the board beside
  'clear-space'(ctx) {
    const P = new Pg(ctx, 'clear-space'), { R, kind } = P, hex = R.back.hex, tx = R.textOn(hex), gi = R.groundText, Lg = ctx.logo, g = Lg.geo;
    const x0 = 0, x1 = 700, { y0, y1 } = P, ins = inner(kind, y0, y1), key = R.colourwayOn(hex), col = R.lineOn(hex);
    panel(P, { x0, x1, y0, y1, hex, l: 'bleed', r: 'fold', role: 'back' });
    neighbour(P, x1, 1040, y0, y1, 1040);
    // x as a share of the logo's height; the zone is the logo grown by x on all four sides
    const u = g.unit / g.height, a = g.width / g.height, room = ins.bot - ins.top - 56;
    const lw = Math.floor(Math.min(520, 580 / (1 + 2 * u / a), room * a / (1 + 2 * u))), lh = lw / a, X = u * lh;
    const zw = lw + 2 * X, zh = lh + 2 * X, zx = r2(40 + (620 - zw) / 2), zy = r2(ins.top + 56 + (room - zh) / 2);
    const out = [pathLine('seal', `M${zx} ${zy}H${r2(zx + zw)}V${r2(zy + zh)}H${zx}Z`, col)];
    // each corner square is x by x, named inside when it has room for 16 clear round the letter, else once above the zone
    const named = X >= 56;
    for (const [cx, cy] of [[zx, zy], [zx + zw - X, zy], [zx, zy + zh - X], [zx + zw - X, zy + zh - X]]) {
      out.push(pathLine('cut', `M${r2(cx)} ${r2(cy)}h${r2(X)}v${r2(X)}h${r2(-X)}Z`, col, { w: 1 }));
      if (named) P.text(r2(cx + X / 2 - 12), r2(cy + X / 2 - 10), 24, 20, 'cap', 'x', `font-weight:500;text-align:center;color:${tx.ink}`);
    }
    P.line(...out);
    if (!named) P.text(zx, zy - 36, 24, 20, 'cap', 'x', `font-weight:500;color:${tx.ink}`);
    P.text(zx + X, zy + X, lw, lh, '', Lg.html('colour', { width: lw, colourway: key, color: tx.ink }), `color:${tx.ink}`);
    const nx = x1 + 40, nw = 260, c = { ink: gi.ink, quiet: gi.ink };
    let y = ins.top;
    y += P.note(nx, y, nw, 'Clear space', `Keep x clear on all four sides. x is ${Lg.clearShare}% of the logo's height, measured from its edge.`, c) + 24;
    P.note(nx, y, nw, 'Nothing in the zone', 'No type, no other logo, and no fold or edge of the pack.', c);
    const vals = [`x ${Math.round(X)} px`, `logo ${lw} x ${Math.round(lh)} px`];
    P.text(nx, ins.bot - 32, nw, 32, 'm', vals.map(esc).join('<br>'), `color:${gi.quiet}`);
    return P.html(hex);
  },

  // the narrowest panel of the pack, with the logo on it at its two minimums, actual size; the print minimum set large on the board
  'min-size'(ctx) {
    const P = new Pg(ctx, 'min-size'), { R, K, kind } = P, hex = R.side.hex, tx = R.textOn(hex), gi = R.groundText, Lg = ctx.logo, m = Lg.minSize, W = ctx.weights;
    const x0 = 640, x1 = 920, { y0, y1 } = P, ins = inner(kind, y0, y1), key = R.colourwayOn(hex), col = R.lineOn(hex), cx = (x0 + x1) / 2;
    panel(P, { x0, x1, y0, y1, hex, l: 'fold', r: 'fold', role: 'side' });
    neighbour(P, 40, x0, y0, y1, null); neighbour(P, x1, 1040, y0, y1, 1040);
    const mm = (v) => v * 96 / 25.4, span = ins.bot - ins.top;
    const sizes = [['Screen', m.screenPx, `${m.screenPx} x ${m.screenH} px`], ['Print', mm(m.printMm), `${m.printMm} x ${m.printH} mm`]];
    sizes.forEach(([head, w, val], i) => {
      const y = Math.round(ins.top + span * (i ? 0.56 : 0.16)), lh = logoH(ctx, 'colour', w), lx = r2(cx - w / 2), dy = r2(y + 36 + lh + 16);
      P.text(x0 + 40, y, x1 - x0 - 80, 20, 'cap', head, `font-weight:500;color:${tx.ink}`);
      P.text(lx, y + 36, w, lh, '', Lg.html('colour', { width: w, colourway: key, color: tx.ink, label: 'Logo' }), `color:${tx.ink}`);
      P.line(L('cut', lx, dy, lx + w, dy, col, 1), L('cut', lx + 0.5, dy - 6, lx + 0.5, dy + 6, col, 1), L('cut', lx + w - 0.5, dy - 6, lx + w - 0.5, dy + 6, col, 1));
      P.text(x0 + 40, dy + 16, x1 - x0 - 80, 16, 'm', esc(val), `text-align:center;color:${tx.ink}`);
    });
    // the print minimum, the page's one large word
    const big = `${m.printMm} mm`, size = [200, 180, 160, 140, 120].find((s) => measure(ctx, 'display', W.heading, big, s, -0.01) <= 540) || 120, bl = Math.round(size * 0.92);
    const by = Math.round(ins.top + span * 0.16);
    P.text(40, by, 560, bl, 'disp', esc(big), `font-size:${size}px;line-height:${bl}px;letter-spacing:-.01em;color:${gi.ink}`);
    P.para(40, by + bl + 32, 440, 'b-body', 'body', W.regular, 15, 24, `Drawn at actual size on the narrowest panel of the ${K.noun}. In print the logo is never narrower than ${m.printMm} mm; on screen, never narrower than ${m.screenPx} px.`, `color:${gi.ink}`);
    return P.html(hex);
  },

  // the net turned on its side: one band for every ground the logo has a colourway for, each with the logo as it prints there
  'logo-grounds'(ctx) {
    const P = new Pg(ctx, 'logo-grounds'), { R, B, kind } = P, Lg = ctx.logo, cws = B.logo.colourways, out = [];
    const seen = new Set(), keys = Object.keys(cws).filter((k) => { const gr = cws[k].ground.toLowerCase(); if (seen.has(gr)) return false; seen.add(gr); return true; }).slice(0, 6);
    // a photograph band when the brand has a shot on file (never in the slot edition): mono light on the picture
    // the shot: a low-light one if the brand has one (its dark areas are where mono light reads), else the first on file
    const shots = !P.slot && cws['mono-light'] ? ((B.imagery && B.imagery.shots) || []).filter((s) => s.photo) : [];
    const shot = shots.find((s) => /evening|night|dusk|low light|dark/i.test(s.alt || '')) || shots[0];
    const n = keys.length + (shot ? 1 : 0), top = 96, bot = 912, x0 = 96, x1 = 1040, hs = allocate(Array(n).fill(1), bot - top, 1);
    // the left end of the net: a box's glue flap, a bag's fin seal; a satchel has none
    if (kind === 'box') out.push(pathLine('cut', `M${x0} ${top}L${x0 - 32} ${top + 24}V${bot - 24}L${x0} ${bot}`, R.ghost));
    if (kind === 'bag') out.push(L('seal', x0 - 12, top, x0 - 12, bot, R.ghost), pathLine('cut', `M${x0} ${top}H${x0 - 24}V${bot}H${x0}`, R.ghost));
    let y = top;
    keys.forEach((k, i) => {
      const cw = cws[k], hex = cw.ground, col = R.lineOn(hex), tx = R.textOn(hex), h = hs[i];
      P.field(x0, y, x1 - x0, h, hex);
      out.push(L(i === 0 ? 'cut' : 'fold', x0, y + 0.75, x1, y + 0.75, col), L(kind === 'satchel' ? 'cut' : 'fold', x0 + 0.75, y, x0 + 0.75, y + h, col), L('cut', x1 - 0.75, y, x1 - 0.75, y + h, col));
      if (i === n - 1) out.push(L('cut', x0, y + h - 0.75, x1, y + h - 0.75, col));
      const lw = fitW(ctx, 'colour', 400, h - 72), lh = logoH(ctx, 'colour', lw);
      P.text(x0 + 56, y + (h - lh) / 2, lw, lh, '', Lg.html('colour', { width: lw, colourway: k, color: tx.ink, label: 'Logo' }), `color:${tx.ink}`);
      const body = P.slot ? `Logo in ${P.nm(cw.name)}.` : partsOf(P, cw), nw = 360, nh = P.noteH(nw, cwLabel(P, k), body) + 24, ny = Math.round(y + (h - nh) / 2);
      P.note(600, ny, nw, cwLabel(P, k), body, { ink: tx.ink, quiet: tx.quiet });
      P.text(600, ny + nh - 16, nw, 16, 'm', `name on ground ${ctx.ratio(cw.name, hex).toFixed(1)}:1`, `color:${tx.quiet}`);
      y += h;
    });
    if (shot) {
      const ml = cws['mono-light'], h = hs[n - 1], pw = 580 - x0, tx = R.textOn(ml.ground), col = R.lineOn(ml.ground);
      P.f.push(`<div class="ph" style="left:${px(x0)};top:${px(y)};width:${px(pw)};height:${px(h)}">${ctx.photo(shot.id, { pos: '100% 72%', style: 'position:absolute;left:0;top:0;width:100%;height:100%' })}</div>`);
      P.field(580, y, x1 - 580, h, ml.ground);
      out.push(L('fold', x0, y + 0.75, x1, y + 0.75, col), L('cut', x0, y + h - 0.75, x1, y + h - 0.75, col), L('cut', x1 - 0.75, y, x1 - 0.75, y + h, col));
      const lw = Math.min(168, fitW(ctx, 'mono-light', 200, h - 96)), lh = logoH(ctx, 'mono-light', lw);
      // the wordmark sits in the quiet lower right of the photo (the crop is anchored there), clear of faces, foliage and edges
      P.text(x0 + pw - 32 - lw, y + h - 28 - lh, lw, lh, '', Lg.html('mono-light', { width: lw, colourway: 'mono-light' }));
      const nh = P.noteH(360, 'On a photo', 'Mono light, on a quiet part of the picture, clear of faces and edges.');
      P.note(600, Math.round(y + (h - nh) / 2), 360, 'On a photo', 'Mono light, on a quiet part of the picture, clear of faces and edges.', { ink: tx.ink, quiet: tx.quiet });
    }
    P.line(...out);
    return P.html('all');
  },

  // a press sheet of six front panels, stepped and repeated, every proof rejected: the logo printed six wrong ways
  'logo-misuse'(ctx) {
    const P = new Pg(ctx, 'logo-misuse'), { R, B } = P, hex = R.front.hex, tx = R.textOn(hex), gi = R.groundText, Lg = ctx.logo, W = ctx.weights;
    const key = R.colourwayOn(hex), cw = B.logo.colourways[key], col = R.lineOn(hex), gcol = R.ghost;
    P.para(40, 96, 640, 'b-body', 'body', W.regular, 15, 24, 'Six proofs off the press, and every one rejected. Print the supplied files as they are.', `color:${gi.ink}`);
    const sx = 66, sy = 168, pw = 316, ph = 368;
    P.field(sx, sy, pw * 3, ph * 2, hex);
    const out = [pathLine('cut', `M${sx + 0.75} ${sy + 0.75}H${sx + pw * 3 - 0.75}V${sy + ph * 2 - 0.75}H${sx + 0.75}Z`, col)];
    out.push(L('cut', sx + pw, sy, sx + pw, sy + ph * 2, col), L('cut', sx + pw * 2, sy, sx + pw * 2, sy + ph * 2, col), L('cut', sx, sy + ph, sx + pw * 3, sy + ph, col));
    // crop marks at the sheet's corners, on the board
    for (const [x, y, dx, dy] of [[sx, sy, -1, -1], [sx + pw * 3, sy, 1, -1], [sx, sy + ph * 2, -1, 1], [sx + pw * 3, sy + ph * 2, 1, 1]]) out.push(L('cut', x + dx * 8, y, x + dx * 26, y, gcol, 1), L('cut', x, y + dy * 8, x, y + dy * 26, gcol, 1));
    // the wrong colour: a hue near the opposite of the panel's, dark on a light panel and light on a dark one, so the mistake shows (and the slot label still reads)
    const f = ctx.C.toOklch(hex), wrong = ctx.C.fromOklch(f.L > 0.6 ? 0.26 : 0.9, 0.12, ((Number.isFinite(f.H) ? f.H : 30) + 150) % 360);
    const lw = 180, lh = logoH(ctx, 'colour', lw), logo = (w) => Lg.html('colour', { width: w, colourway: key, color: tx.ink, label: 'Logo' });
    const stretch = (h, w2, h2) => h.replace(/width="[\d.]+" height="[\d.]+"/, `width="${r2(w2)}" height="${r2(h2)}" preserveAspectRatio="none"`).replace(/width:[\d.]+px;height:[\d.]+px/, `width:${r2(w2)}px;height:${r2(h2)}px`);
    const items = [
      ['Stretched', 'Scale it evenly, never squash it.', lw * 1.3, lh * 0.65, stretch(logo(lw), lw * 1.3, lh * 0.65)],
      ['Recoloured', 'Use a colourway from the versions page.', lw, lh, Lg.forMisuse(lw, { fill: wrong })],
      ['Rotated', 'It sits level with the panel.', lw, lh, `<div style="transform:rotate(-12deg)">${logo(lw)}</div>`],
      ['Shadowed', 'No shadows, glows or bevels.', lw, lh, `<div style="filter:drop-shadow(6px 8px 5px ${gi.ink}b3)">${logo(lw)}</div>`],
      ['Boxed', 'No outline, box or frame around it.', lw, lh + 31, `<div style="box-sizing:border-box;width:${lw}px;border:1.5px solid ${tx.ink};padding:14px 18px">${logo(lw - 39)}</div>`],
      ['Across a fold', 'Keep it on one panel, clear of every fold.', lw, lh, logo(lw)],
    ];
    items.forEach(([head, rule, w, h, html], i) => {
      const px0 = sx + (i % 3) * pw, py0 = sy + Math.floor(i / 3) * ph, nw = pw - 56;
      const nh = P.noteH(nw, head, rule), ny = py0 + ph - 32 - nh, ly = r2(py0 + (ny - py0 - h) / 2 + 12), lx = r2(px0 + (pw - w) / 2);
      P.note(px0 + 28, ny, nw, head, rule, { ink: tx.ink, quiet: tx.quiet });
      P.text(lx, ly, w, h, '', html, `color:${tx.ink}`);
      // the reject mark: a struck box in the proof's corner
      const rx = px0 + pw - 48, ry = py0 + 28;
      out.push(pathLine('cut', `M${rx} ${ry}h20v20h-20Z`, col), L('cut', rx + 4, ry + 4, rx + 16, ry + 16, col), L('cut', rx + 16, ry + 4, rx + 4, ry + 16, col));
      if (head === 'Across a fold') out.push(L('fold', r2(lx + w * 0.3), py0, r2(lx + w * 0.3), ny - 24, col));
    });
    P.line(...out);
    return P.html(hex);
  },
};
