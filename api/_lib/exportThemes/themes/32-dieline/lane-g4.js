// Theme 32, Dieline, lane g4: imagery and layout (photo-direction, shot-list, imagery-rules, grid). `layouts` is round 1's.
// Photographs sit in die-cut windows: a window is cut where the photo exists, and an unshot photo is an unprinted window with its brief written in it.
// The shot list is a six-face carton, one shot a face; the grid is the brand's own page drawn as a print panel (trim cut, safe area sealed, columns filled).
// Colours come from roles, copy from brand.json; in the slot edition every line of brand copy and every photo becomes a labelled placeholder.
import { phTight } from './ph.js';
import { roles, pack, allocate, measure, wrap, L, pathLine, ghost, closure, satchelFlap, flapPath, r2, esc } from './geom.js';
import { DESCRIPTORS } from '../../engine/placeholders.js';
import { focusOf, creditOf } from './lane-fix-focus.js';

const px = (n) => `${r2(n)}px`;
// where text may start and end inside a panel, clear of the seal, crimp, gusset fold or weld seam (as lane g1)
const inner = (kind, y0, y1) => ({ top: y0 + (kind === 'bag' ? 88 : 48), bot: y1 - (kind === 'bag' ? 56 : kind === 'satchel' ? 40 : 32) });
const WORDS = ['No', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine'];

// ---- a page: fields (divs), die lines (one svg under the text), text, chrome. A copy of guidelines.js's Pg, which that file does not export ----
class Pg {
  constructor(ctx, id) {
    this.ctx = ctx; this.id = id; this.R = roles(ctx); this.K = pack(ctx); this.B = ctx.brand; this.slot = ctx.edition === 'slot'; this.hand = this.slot && !ctx.placeholders;
    this.f = []; this.l = []; this.t = []; this.g = []; this.boxes = [];
    this.kind = this.K.kind; this.y0 = this.kind === 'bag' ? 96 : 168; this.y1 = 912; this.gcol = this.R.ghost;
  }
  field(x, y, w, h, hex) { this.f.push(`<div class="fd" style="left:${px(x)};top:${px(y)};width:${px(w)};height:${px(h)};background:${hex}"></div>`); }
  line(...s) { this.l.push(...s); }
  text(x, y, w, h, cls, html, style = '') {
    this.boxes.push({ x, y, w, h });
    this.t.push(`<div class="tx ${cls}" style="left:${px(x)};top:${px(y)};width:${px(w)};height:${px(h)};${style}">${html}</div>`);
  }
  raw(html) { this.t.push(html); }
  // wrapped text: returns its height
  para(x, y, w, cls, role, weight, size, lh, s, style) { const r = wrap(this.ctx, role, weight, s, size, w); this.text(x, y, w, r.length * lh, cls, r.map(esc).join('<br>'), `line-height:${lh}px;${style}`); return r.length * lh; }
  gh(kind, axis, at, a, b) { this.g.push({ kind, axis, at, a, b }); }
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
    return `<section class="pg${this.kind === 'satchel' ? ' sat' : ''}${phTight(this.ctx, this.id)} g4" data-page="${id}" style="isolation:isolate">${this.f.join('')}<svg class="ln" viewBox="0 0 1080 1080" xmlns="http://www.w3.org/2000/svg">${gl}${this.l.join('')}${rects}</svg>${this.t.join('')}${out}</section>`;
  }
}

// a filled panel with the kind's closures (the satchel flap in the front colour, as on every page of the theme)
function panel(P, g) {
  P.field(g.x0, g.y0, g.x1 - g.x0, g.y1 - g.y0, g.hex);
  const out = [];
  if (P.kind === 'satchel') satchelFlap(P.R, g.x0, g.x1, g.y0, P.R.front.hex, g.l, g.r, out);
  closure(P.R, P.kind, { valve: false, ...g }, out);
  P.line(...out);
}
const rect = (x, y, w, h) => `M${r2(x)} ${r2(y)}H${r2(x + w)}V${r2(y + h)}H${r2(x)}Z`;
const disp = (size, lh, col) => `font-size:${size}px;line-height:${lh}px;letter-spacing:-.005em;color:${col}`;
// the largest display size in the list at which the text fits maxW in at most n lines
function fitDisplay(ctx, text, sizes, maxW, n) {
  const W = ctx.weights;
  for (const s of sizes) { const rows = wrap(ctx, 'display', W.heading, text, s, maxW, -0.005); if (rows.length <= n && rows.every((r) => measure(ctx, 'display', W.heading, r, s, -0.005) <= maxW)) return { size: s, rows }; }
  const s = sizes[sizes.length - 1]; return { size: s, rows: wrap(ctx, 'display', W.heading, text, s, maxW, -0.005) };
}

// ---- slot edition: a placeholder for one line of brand copy, as the engine's descriptor (label, what to write, how long), framed dashed ----
const slotLines = (ctx, path, w) => wrap(ctx, 'chrome', 400, DESCRIPTORS[path].what, 14, w - 35);
const slotH = (ctx, path, w) => 67 + slotLines(ctx, path, w).length * 20;
function slotCopy(P, x, y, w, path, n, col) {
  const d = DESCRIPTORS[path], r = slotLines(P.ctx, path, w), h = 67 + r.length * 20;
  P.text(x, y, w, h, 'g4-ph', `<span class="g4-pl">${esc(d.label.replace('{n}', n))}</span><span class="g4-pw">${r.map(esc).join('<br>')}</span><span class="g4-pn">${esc(d.length)}</span>`, `color:${col}`);
  return h;
}
// brand copy in a box: the words in showcase, the placeholder in the slot edition. Returns the height it takes (measure with dry = true)
function copy(P, x, y, w, { path, n = 1, text, cls = 'b-body', size = 15, lh = 24, weight, col, dry = false }) {
  const ctx = P.ctx;
  if (P.hand) return dry ? slotH(ctx, path, w) : slotCopy(P, x, y, w, path, n, col);
  const wt = weight || ctx.weights.regular;
  if (dry) return wrap(ctx, 'body', wt, text, size, w).length * lh;
  return P.para(x, y, w, cls, 'body', wt, size, lh, text, `font-size:${size}px;font-weight:${wt};color:${col}`);
}

// a shot brief splits at its colon into a name ("The hopper") and the brief itself
const splitShot = (s) => { const m = /^([^:]{2,40}):\s*(.+)$/.exec(String(s || '')); return m ? { title: m[1], brief: m[2].charAt(0).toUpperCase() + m[2].slice(1) } : { title: '', brief: String(s || '') }; };
const photoShots = (P) => (P.slot ? [] : (P.B.imagery.shots || []).filter((s) => s.photo));
// a photograph filling a box, under the die lines (the window's cut is drawn over its edge), with the content-image hairline
function photoIn(P, x, y, w, h, shot, pos = focusOf(shot.id)) {
  const img = P.ctx.photo(shot.id, { pos, style: 'position:absolute;left:0;top:0;width:100%;height:100%;outline:1px solid oklch(0 0 0 / .1);outline-offset:-1px' });
  P.raw(`<div class="ph" style="left:${px(x)};top:${px(y)};width:${px(w)};height:${px(h)}">${img}</div>`);
}
// a die-cut window: the photo shows through it; an unshot photo leaves the window as unprinted board with the brief written in it
function windowShot(P, x, y, w, h, shot, n, onHex) {
  const { ctx, R } = P, gi = R.groundText, pad = 32;
  P.line(pathLine('cut', rect(x + 0.75, y + 0.75, w - 1.5, h - 1.5), R.lineOn(onHex)));
  if (!P.slot && shot.photo) { photoIn(P, x, y, w, h, shot); return; }
  P.field(x, y, w, h, R.ground.hex);
  if (P.hand) { slotCopy(P, x + 24, y + 24, Math.min(w - 48, 420), 'imagery.shots.*.slot', n, gi.ink); return; }
  // the window reads as a card to shoot to: crop marks at the corners, a centre mark, and the shot's place in the list at the foot
  const mk = R.ghost, ins = 12, tk = 16, cxm = x + w / 2, cym = y + h / 2, total = (P.B.imagery.shots || []).length, corner = (cx, cy, dx, dy) => pathLine('cut', `M${cx + dx * tk} ${cy}H${cx}V${cy + dy * tk}`, mk, { w: 1 });
  P.line(corner(x + ins, y + ins, 1, 1), corner(x + w - ins, y + ins, -1, 1), corner(x + ins, y + h - ins, 1, -1), corner(x + w - ins, y + h - ins, -1, -1),
    L('cut', cxm - 8, cym, cxm + 8, cym, mk, 1), L('cut', cxm, cym - 8, cxm, cym + 8, mk, 1));
  if (n && total) P.text(x + pad, y + h - pad - 16, w - 2 * pad, 16, 'cap', `Shot ${n} of ${total}. Still to shoot.`, `color:${gi.quiet}`);
  const { title, brief } = splitShot(shot.slot), tw = Math.min(w - 2 * pad, 460);
  let yy = y + pad;
  if (title) { const f = fitDisplay(ctx, title, [32, 28, 24], tw, 2), lh = Math.round(f.size * 1.05); P.text(x + pad, yy, tw, lh * f.rows.length, 'disp', f.rows.map(esc).join('<br>'), disp(f.size, lh, gi.ink)); yy += lh * f.rows.length + 12; }
  P.para(x + pad, yy, tw, 'b-body', 'body', ctx.weights.regular, 15, 24, brief, `color:${gi.ink}`);
}

const DIRECTION = [['subject', 'Subject'], ['light', 'Light'], ['crop', 'Crop'], ['colour', 'Colour'], ['people', 'People']];

export const guidelines = {
  // the back panel bleeding off the left, with one window cut in it: the brand's first photograph (or its brief), and the brand's line in the clear third
  // left under it, as the crop rule asks; the direction is noted on the unprinted board beside the fold
  'photo-direction'(ctx) {
    const P = new Pg(ctx, 'photo-direction'), { R, B, kind } = P, hex = R.back.hex, tx = R.textOn(hex), gi = R.groundText, W = ctx.weights;
    const y0 = P.y0, y1 = P.y1, x1 = 700, ins = inner(kind, y0, y1), iw = x1 - 80;
    panel(P, { x0: 0, x1, y0, y1, hex, l: 'bleed', r: 'fold', role: 'back' });
    P.gh(kind === 'box' ? 'fold' : 'cut', 'h', y0, x1, 1080); P.gh('cut', 'h', y1, x1, 1080);
    // the brand's line, set at the foot of the panel
    let lineH;
    if (P.hand) { lineH = slotH(ctx, 'lines.primary', iw); slotCopy(P, 40, ins.bot - lineH, iw, 'lines.primary', 1, tx.ink); }
    else {
      const f = fitDisplay(ctx, B.lines.primary, [64, 56, 48, 40, 32], iw, 2), lh = Math.round(f.size * 0.92); lineH = lh * f.rows.length;
      P.text(40, ins.bot - lineH, iw, lineH, 'disp', f.rows.map(esc).join('<br>'), disp(f.size, lh, tx.ink));
    }
    const shots = B.imagery.shots || [], ph = photoShots(P), shot = ph[0] || shots[0], n = shots.indexOf(shot) + 1;
    windowShot(P, 40, ins.top, iw, ins.bot - lineH - 40 - ins.top, shot, n, hex);
    // the direction on the board: label in the chrome, the brand's words under it
    const dir = B.imagery.direction || {}, cw = 300, cx = 740, gap = 28;
    const rows = DIRECTION.filter(([k]) => dir[k]).map(([k, label]) => ({ k, label, h: 24 + copy(P, 0, 0, cw, { path: `imagery.direction.${k}`, text: dir[k], dry: true }) }));
    const total = rows.reduce((s, r) => s + r.h, 0) + gap * (rows.length - 1);
    let y = ins.top + total <= y1 - 24 ? ins.top : Math.max(y0 + 24, y1 - 24 - total);
    rows.forEach((r) => {
      P.text(cx, y, cw, 20, 'cap', esc(r.label), `color:${gi.quiet}`);
      copy(P, cx, y + 24, cw, { path: `imagery.direction.${r.k}`, text: dir[r.k], col: gi.ink });
      y += r.h + gap;
    });
    return P.html(!P.slot && shot && shot.photo ? 'all' : hex);
  },

  // the shot list is a carton: six faces, one shot on each. A face with a photograph shows it, its caption on a band of the face's colour;
  // a face still to be shot is printed in its colour with the brief on it. Flaps stay unprinted board, as on the brand's own cartons.
  'shot-list'(ctx) {
    const P = new Pg(ctx, 'shot-list'), { R, B } = P, gi = R.groundText, W = ctx.weights, s = 244;
    const faces = [[284, 128, 'flap'], [40, 372, 'side'], [284, 372, 'front'], [528, 372, 'side'], [772, 372, 'back'], [284, 616, 'flap']].map(([x, y, role]) => ({ x, y, hex: R[role].hex }));
    const shots = (B.imagery.shots || []).slice(0, 6);
    // edges: one shared by two faces is a fold; a hinge to a flap is a fold; the rest of the outline is cut
    const key = (a) => a.join(','), seen = {};
    const edges = (f) => [['h', f.y, f.x, f.x + s], ['h', f.y + s, f.x, f.x + s], ['v', f.x, f.y, f.y + s], ['v', f.x + s, f.y, f.y + s]];
    faces.forEach((f) => edges(f).forEach((e) => { seen[key(e)] = (seen[key(e)] || 0) + 1; }));
    const hinge = new Set([key(['h', 128, 284, 528]), key(['h', 860, 284, 528]), key(['h', 372, 40, 284]), key(['h', 616, 40, 284]), key(['h', 372, 528, 772]), key(['h', 616, 528, 772]), key(['v', 1016, 372, 616])]);
    const drawn = new Set();
    faces.forEach((f, i) => {
      P.field(f.x, f.y, s, s, f.hex);
      const col = R.lineOn(f.hex);
      edges(f).forEach((e) => {
        const k = key(e); if (drawn.has(k)) return; drawn.add(k);
        const fold = seen[k] > 1 || hinge.has(k), [ax, at, a, b] = e;
        // a cut is drawn 0.75 inside its own face; a fold sits on the edge the two faces share
        const off = fold ? 0 : (ax === 'h' ? (at === f.y ? 0.75 : -0.75) : (at === f.x ? 0.75 : -0.75));
        P.line(ax === 'h' ? L(fold ? 'fold' : 'cut', a, at + off, b, at + off, col) : L(fold ? 'fold' : 'cut', at + off, a, at + off, b, col));
      });
    });
    // the flaps: tucks on the lid and the base, dust flaps on the sides, the glue flap on the back's free edge
    const gc = R.ghost;
    P.line(pathLine('cut', flapPath('tuck', 296, 516, 128, 40, -1, { r: 20 }), gc), pathLine('cut', flapPath('tuck', 296, 516, 860, 40, 1, { r: 20 }), gc));
    for (const [a, b] of [[40, 284], [528, 772]]) P.line(pathLine('cut', flapPath('dust', a, b, 372, 40, -1, { r: 16 }), gc), pathLine('cut', flapPath('dust', a, b, 616, 40, 1, { r: 16 }), gc));
    P.line(pathLine('cut', 'M1016 372L1040 392V596L1016 616', gc));
    // what the page is, on the board above the left side face
    const nWord = WORDS[shots.length] || String(shots.length), todo = shots.some((x) => P.slot || !x.photo);
    P.para(40, 96, 220, 'b-body', 'body', W.regular, 15, 24, `${nWord} shots, one carton. Each face holds one photograph.${todo ? ' A face still to be shot carries its brief, written for the photographer.' : ''}`, `color:${gi.ink}`);
    shots.forEach((sh, i) => {
      const f = faces[i], tx = R.textOn(f.hex), pad = 24, tw = s - 2 * pad;
      if (P.hand) { slotCopy(P, f.x + 16, f.y + 16, s - 32, 'imagery.shots.*.slot', i + 1, tx.ink); return; }
      if (sh.photo) {
        photoIn(P, f.x, f.y, s, s - 56, sh);
        const cap = sh.caption || splitShot(sh.alt).title || '';
        if (cap) P.text(f.x + pad, f.y + s - 40, tw, 24, 'b-body b-med', esc(cap), `color:${tx.ink}`);
        return;
      }
      const { title, brief } = splitShot(sh.slot);
      let y = f.y + pad;
      if (title) { P.text(f.x + pad, y, tw, 24, 'b-body b-med', esc(title), `color:${tx.ink}`); y += 32; }
      // the brief steps down a size if it would run past the face's foot
      const room = f.y + s - pad - y, big = wrap(ctx, 'body', W.regular, brief, 14, tw).length * 20 <= room;
      P.para(f.x + pad, y, tw, 'b-small', 'body', W.regular, big ? 14 : 13, big ? 20 : 18, brief, `font-size:${big ? 14 : 13}px;color:${tx.ink}`);
    });
    const credits = [...new Set(photoShots(P).map(creditOf).filter(Boolean))];
    if (credits.length) P.text(560, 688, 440, 20, 'cap', `Photographs: ${esc(credits.join(', '))}.`, `color:${gi.quiet}`);
    return P.html('all');
  },

  // a two-panel net folded down the middle: the printed side says do, the unprinted inside says don't, each rule level across the fold.
  // The first rule is shown, not only said: a window cut for the photo to take, and a window drawn but never cut for the one not to take.
  'imagery-rules'(ctx) {
    const P = new Pg(ctx, 'imagery-rules'), { R, B, kind } = P, hex = R.front.hex, tx = R.textOn(hex), gi = R.groundText, W = ctx.weights;
    const y0 = P.y0, y1 = P.y1, xf = 540, ins = inner(kind, y0, y1), cw = 460, lx = 40, rx = 580;
    panel(P, { x0: 0, x1: xf, y0, y1, hex, l: 'bleed', r: 'fold', role: 'back' });
    P.gh(kind === 'box' ? 'fold' : 'cut', 'h', y0, xf, 1080); P.gh('cut', 'h', y1, xf, 1080);
    const rules = (B.imagery.rules || []).slice(0, 5), top = ins.top;
    P.text(lx, top, cw, 32, 'disp', 'Do', disp(32, 32, tx.ink)); P.text(rx, top, cw, 32, 'disp', 'Don’t', disp(32, 32, gi.ink));
    const ht = (r, i, side, dry) => copy(P, side === 'do' ? lx : rx, 0, cw, { path: `imagery.rules.*.${side}`, n: i + 1, text: r[side], dry: true });
    // rule 1: its do is the caption under the cut window; its don't is written inside the window that is never cut
    const cap0 = rules[0] ? ht(rules[0], 0, 'do') : 0;
    const rowH = rules.slice(1).map((r, i) => Math.max(ht(r, i + 1, 'do'), ht(r, i + 1, 'dont')));
    // placeholders are taller than the rules they stand for, so the slot edition closes the bands up (the fold still keeps 16 clear of each)
    const gap = P.slot ? 32 : 48, wy = top + 56, rowsH = rowH.reduce((a, h) => a + h + gap, 0), wh = Math.max(120, ins.bot - wy - 20 - cap0 - rowsH);
    const shots = B.imagery.shots || [], ph = photoShots(P), shot = ph[1] || ph[0] || shots[1] || shots[0];
    if (shot) windowShot(P, lx, wy, cw, wh, shot, shots.indexOf(shot) + 1, hex);
    P.line(pathLine('fold', rect(rx + 0.5, wy + 0.5, cw - 1, wh - 1), R.ghost, { w: 1 }));
    if (rules[0]) {
      if (P.hand) slotCopy(P, rx + 24, wy + 24, cw - 48, 'imagery.rules.*.dont', 1, gi.ink);
      else { const f = fitDisplay(ctx, rules[0].dont, [32, 28, 24], cw - 64, 2), lh = Math.round(f.size * 1.05); P.text(rx + 32, wy + 32, cw - 64, lh * f.rows.length, 'disp', f.rows.map(esc).join('<br>'), disp(f.size, lh, gi.quiet)); }
      copy(P, lx, wy + wh + 20, cw, { path: 'imagery.rules.*.do', n: 1, text: rules[0].do, col: tx.ink });
    }
    // the other rules, one band each, a fold between bands running across the panel and on over the board
    let y = wy + wh + 20 + cap0;
    rules.slice(1).forEach((r, i) => {
      const fy = y + gap / 2; P.line(L('fold', 0, fy, xf, fy, R.lineOn(hex))); P.gh('fold', 'h', fy, xf, 1080);
      y += gap;
      copy(P, lx, y, cw, { path: 'imagery.rules.*.do', n: i + 2, text: r.do, col: tx.ink });
      copy(P, rx, y, cw, { path: 'imagery.rules.*.dont', n: i + 2, text: r.dont, col: gi.ink });
      y += rowH[i];
    });
    return P.html(hex);
  },

  // the brand's own page, drawn as a print panel: the trim is cut, the margin is the sealed safe area, the columns are filled in the front colour.
  // Every value printed is read from the brand's layout data.
  grid(ctx) {
    const P = new Pg(ctx, 'grid'), { R } = P, G = ctx.gridMeasures, gi = R.groundText, W = ctx.weights;
    const pw = G.page.w, ph = G.page.h, wide = pw / ph >= 1.25, A = wide ? { x: 136, y: 152, w: 904, h: 520 } : { x: 136, y: 152, w: 588, h: 720 };
    const k = Math.min(A.w / pw, A.h / ph), x0 = A.x, y0 = A.y, w = pw * k, h = ph * k, m = G.margin * k, cwk = G.col * k, gk = G.gutter * k;
    const hex = R.back.hex, col = R.lineOn(hex), fhex = R.front.hex, ftx = R.textOn(fhex);
    P.field(x0, y0, w, h, hex);
    for (let i = 0; i < G.columns; i++) {
      const cx = x0 + m + i * (cwk + gk); P.field(cx, y0 + m, cwk, h - 2 * m, fhex);
      if (cwk >= 22) P.text(cx, y0 + m + 16, cwk, 16, 'cap', String(i + 1), `font-size:12px;line-height:16px;font-weight:500;text-align:center;font-variant-numeric:tabular-nums;color:${ftx.ink}`);
    }
    P.line(pathLine('cut', rect(x0 + 0.75, y0 + 0.75, w - 1.5, h - 1.5), col), pathLine('seal', rect(x0 + m, y0 + m, w - 2 * m, h - 2 * m), col));
    // dimension lines on the board, 1 px with end ticks; their values in mono
    const dc = R.ghost, fmt = (v) => (Number.isInteger(v) ? String(v) : v.toFixed(1)), tick = (x, y, v) => (v ? L('cut', x, y - 6, x, y + 6, dc, 1) : L('cut', x - 6, y, x + 6, y, dc, 1));
    const dimH = (a, b, y) => P.line(L('cut', a, y, b, y, dc, 1), tick(a, y, true), tick(b, y, true));
    const val = (x, y, w2, s, align = 'center') => P.text(x, y, w2, 16, 'm', esc(s), `text-align:${align};color:${gi.ink}`);
    dimH(x0, x0 + w, y0 - 24); val(x0, y0 - 56, w, `${pw} px`);
    P.line(L('cut', x0 - 24, y0, x0 - 24, y0 + h, dc, 1), tick(x0 - 24, y0, false), tick(x0 - 24, y0 + h, false));
    val(40, y0 + h / 2 - 8, x0 - 40 - 40, `${ph} px`, 'right');
    // margin, one column and one gutter, measured under the first columns; a label that would touch its neighbour drops a row
    const by = y0 + h + 24, segs = [[x0, x0 + m, G.margin], [x0 + m, x0 + m + cwk, G.col], [x0 + m + cwk, x0 + m + cwk + gk, G.gutter]];
    P.line(L('cut', x0, by, segs[2][1], by, dc, 1), ...[x0, ...segs.map((s) => s[1])].map((x) => tick(x, by, true)));
    let lastR = -Infinity, row = 0;
    segs.forEach(([a, b, v]) => {
      const s = fmt(v), tw = measure(ctx, 'val', 400, s, 12) + 2, c = (a + b) / 2, l = c - tw / 2;
      row = l < lastR + 6 ? row + 1 : 0; val(l, by + 16 + row * 20, tw, s); lastR = l + tw;
    });
    // the values, as an appendix to the drawing
    const scale = Math.round(k * 100), lead = `The page every layout starts from, drawn at ${scale}% of its size. Type and pictures start on a column edge; space between them steps in ${G.base} px.`;
    const rows = [['Page', `${pw} x ${ph} px`], ['Margin', `${G.margin} px each side`], ['Columns', `${G.columns} at ${fmt(G.col)} px`], ['Gutter', `${G.gutter} px`], ['Baseline', `${G.base} px`]];
    const vx = wide ? 560 : 776, vy = wide ? by + 80 : y0, lw = wide ? 360 : 264, lxx = wide ? 136 : 776;
    const leadH = P.para(lxx, vy, lw, 'b-body', 'body', W.regular, 15, 24, lead, `color:${gi.ink}`);
    let ry = wide ? vy : vy + leadH + 40;
    rows.forEach(([l, v]) => {
      P.text(vx, ry, 104, 20, 'cap', esc(l), `color:${gi.quiet}`);
      P.text(vx + 112, ry + 2, wide ? 360 : 152, 16, 'm', esc(v), `color:${gi.ink}`);
      ry += 28;
    });
    return P.html(hex);
  },
};

export function css() {
  return `.pg.g4 .g4-ph{box-sizing:border-box;border:1.5px dashed currentColor;padding:12px 16px;white-space:normal}
.pg.g4 .g4-ph>span{display:block}
.pg.g4 .g4-pl{font:500 12px/16px var(--chrome)}
.pg.g4 .g4-pw{font:400 14px/20px var(--chrome);margin:4px 0}
.pg.g4 .g4-pn{font:400 12px/16px var(--chrome)}`;
}
