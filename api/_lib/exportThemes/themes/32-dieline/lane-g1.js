// Theme 32, Dieline, lane g1: the brand and voice pages (contents, intro, voice, write-this, messaging, summary, contact-scope).
// Each page is a different part of the brand's own pack, flattened: the folded insert, the base band, a gusset, the front beside the unprinted board,
// the top band, the whole net and the back panel. Closures come from the pack kind, colours from roles, so nothing here names a brand.
import { phTight } from './ph.js';
import { roles, pack, allocate, measure, wrap, sentences, L, pathLine, ghost, closure, satchelFlap, r2, esc } from './geom.js';

const px = (n) => `${r2(n)}px`;
// how far a kind's closure reaches past a panel's top and bottom edge, so text on the ground keeps 16 px clear of it
const reach = (kind, tuck) => ({ up: kind === 'satchel' ? 104 : kind === 'box' ? (tuck ? 88 : 56) : 0, down: kind === 'box' ? (tuck ? 88 : 56) : 0 });
// where text may start and end inside a panel, clear of the seal, crimp, gusset fold or weld seam
const inner = (kind, y0, y1) => ({ top: y0 + (kind === 'bag' ? 88 : 48), bot: y1 - (kind === 'bag' ? 56 : kind === 'satchel' ? 40 : 32) });

// ---- a page: fields (divs), die lines (one svg under the text), text, chrome. A copy of guidelines.js's Pg, which that file does not export ----
class Pg {
  constructor(ctx, id) {
    this.ctx = ctx; this.id = id; this.R = roles(ctx); this.K = pack(ctx); this.B = ctx.brand;
    this.f = []; this.l = []; this.t = []; this.g = []; this.boxes = [];
    this.kind = this.K.kind; this.y0 = this.kind === 'bag' ? 96 : 168; this.y1 = 912; this.gcol = this.R.ghost;
  }
  field(x, y, w, h, hex) { this.f.push(`<div class="fd" style="left:${px(x)};top:${px(y)};width:${px(w)};height:${px(h)};background:${hex}"></div>`); }
  line(...s) { this.l.push(...s); }
  text(x, y, w, h, cls, html, style = '') {
    this.boxes.push({ x, y, w, h });
    this.t.push(`<div class="tx ${cls}" style="left:${px(x)};top:${px(y)};width:${px(w)};height:${px(h)};${style}">${html}</div>`);
  }
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
    return `<section class="pg${this.kind === 'satchel' ? ' sat' : ''}${phTight(this.ctx, this.id)} g1" data-page="${id}" style="isolation:isolate">${this.f.join('')}<svg class="ln" viewBox="0 0 1080 1080" xmlns="http://www.w3.org/2000/svg">${gl}${this.l.join('')}${rects}</svg>${this.t.join('')}${out}</section>`;
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
// the largest display size in the list at which every text fits maxW in at most n lines
function fitDisplay(ctx, texts, sizes, maxW, n, track = -0.005) {
  const W = ctx.weights;
  for (const s of sizes) {
    const rows = texts.map((t) => wrap(ctx, 'display', W.heading, t, s, maxW, track));
    if (rows.every((r) => r.length <= n && r.every((l) => measure(ctx, 'display', W.heading, l, s, track) <= maxW))) return { size: s, rows };
  }
  const s = sizes[sizes.length - 1]; return { size: s, rows: texts.map((t) => wrap(ctx, 'display', W.heading, t, s, maxW, track)) };
}
const disp = (size, lh, col) => `font-size:${size}px;line-height:${lh}px;letter-spacing:-.005em;color:${col}`;
const words = (s) => String(s || '').trim().split(/\s+/).filter(Boolean).length;

export const guidelines = {
  // the folded insert: one band per section, as tall as the section's share of the book, its pages listed on the unprinted half beside it
  contents(ctx) {
    const P = new Pg(ctx, 'contents'), { R } = P, hex = R.front.hex, tx = R.textOn(hex), gi = R.groundText, W = ctx.weights, col = R.lineOn(hex);
    const secs = ctx.sections, x0 = 40, x1 = 550, top = 96, bot = 912;
    const hs = allocate(secs.map((s) => s.pages.length), bot - top, 60);
    P.field(x0, top, x1 - x0, bot - top, hex);
    P.line(L('cut', x0, top + 0.75, x1, top + 0.75, col), L('cut', x0, bot - 0.75, x1, bot - 0.75, col), L('cut', x0 + 0.75, top, x0 + 0.75, bot, col), L('fold', x1 - 0.75, top, x1 - 0.75, bot, col));
    P.gh('cut', 'h', top, x1, 1040); P.gh('cut', 'h', bot, x1, 1040); P.gh('cut', 'v', 1040, top, bot);
    const ts = fitDisplay(ctx, secs.map((s) => s.title), [28, 24], 300, 1).size;
    let y = top;
    secs.forEach((s, i) => {
      const h = hs[i], mid = y + h / 2;
      if (i > 0) { P.line(L('fold', x0, y, x1, y, col)); P.gh('fold', 'h', y, x1, 1040); }
      P.text(80, mid - ts / 2, 48, ts, 'disp', String(s.n).padStart(2, '0'), `${disp(ts, ts, tx.quiet)};font-variant-numeric:tabular-nums`);
      P.text(136, mid - ts / 2, 300, ts, 'disp', esc(s.title), disp(ts, ts, tx.ink));
      P.text(430, mid - 8, 80, 16, 'cap', String(s.pages[0].no).padStart(3, '0'), `line-height:16px;text-align:right;font-variant-numeric:tabular-nums;color:${tx.ink}`);
      const r = wrap(ctx, 'chrome', 400, s.pages.map((p) => p.title).join(' / '), 14, 410);
      P.text(590, mid - r.length * 10, 410, r.length * 20, 'cap', r.map(esc).join('<br>'), `color:${gi.quiet}`);
      y += h;
    });
    return P.html(hex);
  },

  // the base band: who the brand is, printed across the foot of the page; what it does and who it serves noted on the board above
  intro(ctx) {
    const P = new Pg(ctx, 'intro'), { R, B, kind } = P, hex = R.flap.hex, tx = R.textOn(hex), gi = R.groundText, W = ctx.weights;
    const y0 = 456, y1 = 912, ins = inner(kind, y0, y1);
    panel(P, { x0: 0, x1: 1080, y0, y1, hex, l: 'bleed', r: 'bleed', role: '' });
    const notes = [['What it does', B.product], ['Who it serves', B.audience]];
    notes.forEach(([h, s], i) => {
      const x = i ? 550 : 40;
      P.text(x, 96, 400, 24, 'b-body b-med', esc(h), `color:${gi.ink}`);
      P.para(x, 120, 400, 'b-body', 'body', W.regular, 15, 24, s, `color:${gi.ink}`);
    });
    const [first, ...rest] = sentences(B.description);
    const f = fitDisplay(ctx, [first], [72, 64, 56, 48], 880, 3);
    const lh = Math.round(f.size * 0.92);
    P.text(40, ins.top, 880, lh * f.rows[0].length, 'disp', f.rows[0].map(esc).join('<br>'), disp(f.size, lh, tx.ink));
    if (rest.length) P.para(40, ins.top + lh * f.rows[0].length + 32, 560, 'b-body', 'body', W.regular, 15, 24, rest.join(' '), `color:${tx.ink}`);
    return P.html(hex);
  },

  // a gusset opened out: each principle named on the board, its example printed on the dark panel beside it
  voice(ctx) {
    const P = new Pg(ctx, 'voice'), { R, B, kind } = P, hex = R.side.hex, tx = R.textOn(hex), gi = R.groundText, W = ctx.weights;
    const x0 = 380, x1 = 1040, { y0, y1 } = P, ins = inner(kind, y0, y1);
    panel(P, { x0, x1, y0, y1, hex, l: 'fold', r: 'cut', role: 'side' });
    if (kind === 'bag') notch(P, 1040, y0, -1, R.lineOn(hex));
    neighbour(P, 40, x0, y0, y1, 40);
    const pr = (B.voice.principles || []).slice(0, 4), n = pr.length;
    const f = fitDisplay(ctx, pr.map((p) => p.example), [48, 40, 36, 32, 28], 580, 2), lh = Math.round(f.size * 1.0);
    const slot = (ins.bot - ins.top) / n;
    pr.forEach((p, i) => {
      const y = Math.round(ins.top + 8 + i * slot);
      P.para(40, y, 300, 'b-body b-med', 'body', W.medium, 15, 24, p.title, `color:${gi.ink}`);
      P.text(420, y, 580, lh * f.rows[i].length, 'disp', f.rows[i].map(esc).join('<br>'), disp(f.size, lh, tx.ink));
    });
    return P.html(hex);
  },

  // the front beside the unprinted board: what we print on the front, and on the board the line it replaces and why
  'write-this'(ctx) {
    const P = new Pg(ctx, 'write-this'), { R, B, kind } = P, hex = R.front.hex, tx = R.textOn(hex), gi = R.groundText, W = ctx.weights;
    const x0 = 40, x1 = 560, { y0, y1 } = P, ins = inner(kind, y0, y1);
    panel(P, { x0, x1, y0, y1, hex, l: 'cut', r: 'fold', role: 'front', valve: kind === 'bag' });
    if (kind === 'bag') notch(P, 40, y0, 1, R.lineOn(hex));
    neighbour(P, x1, 1040, y0, y1, 1040);
    const rows = (B.voice.writeThis || []).slice(0, 5), n = rows.length;
    const top = kind === 'bag' ? y0 + 168 : ins.top + 8;
    const f = fitDisplay(ctx, rows.map((r) => r.write), [32, 28, 24, 22, 20], 440, 3), lh = Math.round(f.size * 1.05);
    // rows stand on equal gaps, not equal slots, so a three-line row never crowds the next one
    const hs = rows.map((r, i) => Math.max(lh * f.rows[i].length, wrap(ctx, 'body', W.regular, r.not, 15, 420).length * 24 + 4 + wrap(ctx, 'chrome', 400, r.because, 14, 420).length * 20));
    const gap = Math.max(24, Math.min(96, (ins.bot - top - hs.reduce((s, h) => s + h, 0)) / Math.max(1, n - 1)));
    let yy = top;
    rows.forEach((r, i) => {
      const y = Math.round(yy); yy += hs[i] + gap;
      P.text(80, y, 440, lh * f.rows[i].length, 'disp', f.rows[i].map(esc).join('<br>'), disp(f.size, lh, tx.ink));
      const h = P.para(600, y, 420, 'b-body', 'body', W.regular, 15, 24, r.not, `color:${gi.ink}`);
      P.para(600, y + h + 4, 420, 'cap', 'chrome', 400, 14, 20, r.because, `color:${gi.quiet}`);
    });
    return P.html(hex);
  },

  // the top band: the lines as the pack prints them; the boilerplate and the name rules on the board under it
  messaging(ctx) {
    const P = new Pg(ctx, 'messaging'), { R, B, kind } = P, hex = R.front.hex, tx = R.textOn(hex), gi = R.groundText, W = ctx.weights, V = B.voice;
    const y0 = P.y0, y1 = y0 + 384, ins = inner(kind, y0, y1);
    panel(P, { x0: 0, x1: 1080, y0, y1, hex, l: 'bleed', r: 'bleed', role: 'front' });
    const pl = fitDisplay(ctx, [B.lines.primary], [72, 64, 56, 48, 40], 560, 3), plh = Math.round(pl.size * 0.92);
    P.text(40, ins.top, 560, plh * pl.rows[0].length, 'disp', pl.rows[0].map(esc).join('<br>'), disp(pl.size, plh, tx.ink));
    const others = (B.lines.others || []).slice(0, 2), ol = fitDisplay(ctx, others, [32, 28, 24], 360, 2), olh = Math.round(ol.size * 1.05);
    let oy = ins.top;
    others.forEach((t, i) => { P.text(660, oy, 360, olh * ol.rows[i].length, 'disp', ol.rows[i].map(esc).join('<br>'), disp(ol.size, olh, tx.mid)); oy += olh * ol.rows[i].length + 24; });
    const gy = y1 + reach(kind, true).down + 40;
    const cols = [['Writing the name', V.nameRules, 40, 280], [`Short boilerplate, ${words(V.boilerplate25)} words`, V.boilerplate25, 360, 300], [`Long boilerplate, ${words(V.boilerplate50)} words`, V.boilerplate50, 700, 340]];
    cols.forEach(([h, s, x, w]) => {
      if (!s) return;
      P.text(x, gy, w, 24, 'b-body b-med', esc(h), `color:${gi.ink}`);
      P.para(x, gy + 28, w, 'b-body', 'body', W.regular, 15, 24, s, `color:${gi.ink}`);
    });
    return P.html(hex);
  },

  // the whole net: the back carries the rules, one gusset the faces, the front the logo and the lines, the other gusset the colours
  summary(ctx) {
    const P = new Pg(ctx, 'summary'), { R, B, kind } = P, W = ctx.weights, { y0, y1 } = P, ins = inner(kind, y0, y1);
    const lead = kind === 'bag' ? 16 : kind === 'box' ? 32 : 0, sx = 40 + lead;
    const ps = [['back', R.back], ['side', R.side], ['front', R.front], ['side', R.side]];
    const ws = allocate([300, 200, 300, 200], 1040 - sx, 0), out = [];
    if (kind === 'satchel') satchelFlap(R, 40, 1040, y0, R.front.hex, 'cut', 'cut', out);
    if (kind === 'bag') {
      const c = R.back.hex, fc = R.lineOn(c); P.field(40, y0, 16, y1 - y0, c);
      out.push(L('cut', 40.75, y0, 40.75, y1, fc), L('cut', 40, y0 + 0.75, 56, y0 + 0.75, fc), L('cut', 40, y1 - 0.75, 56, y1 - 0.75, fc), L('seal', 40, y0 + 44, 56, y0 + 44, fc), L('fold', 40, y1 - 40, 56, y1 - 40, fc));
    } else if (kind === 'box') out.push(pathLine('cut', `M${sx} ${y0}L40 ${y0 + 24}V${y1 - 24}L${sx} ${y1}`, P.gcol));
    let x = sx; const xs = [];
    ps.forEach(([role, c], i) => {
      P.field(x, y0, ws[i], y1 - y0, c.hex);
      closure(R, kind, { x0: x, x1: x + ws[i], y0, y1, hex: c.hex, l: i === 0 && !lead ? 'cut' : 'fold', r: i === ps.length - 1 ? 'cut' : 'none', role, valve: role === 'front' && kind === 'bag' }, out);
      xs.push([x, x + ws[i], c.hex]); x += ws[i];
    });
    P.line(...out);
    if (kind === 'bag') { notch(P, 40, y0, 1, R.lineOn(R.back.hex)); notch(P, 1040, y0, -1, R.lineOn(R.side.hex)); }
    const pad = 24, box = (i) => ({ x: xs[i][0] + pad, w: xs[i][1] - xs[i][0] - 2 * pad, t: R.textOn(xs[i][2]) });
    // back: the three rules
    { const b = box(0); let y = ins.top + 8;
      const rules = (B.guideB && B.guideB.rules) || (B.voice.principles || []).map((p) => ({ title: p.title, text: p.example }));
      rules.slice(0, 3).forEach((r) => { y += P.para(b.x, y, b.w, 'b-body b-med', 'body', W.medium, 15, 24, r.title, `color:${b.t.ink}`) + 4; y += P.para(b.x, y, b.w, 'b-small', 'body', W.regular, 14, 20, r.text, `color:${b.t.ink}`) + 32; }); }
    // first gusset: the two faces, each as a large Aa with its name
    { const b = box(1); let y = ins.top + 8; const f = B.fonts;
      [['display', f.display, W.heading], ['body', f.body, W.regular]].forEach(([role, fc, w]) => {
        P.text(b.x, y, b.w, 72, '', 'Aa', `font-family:var(--${role});font-weight:${w};font-size:72px;line-height:72px;${role === 'display' ? `font-stretch:${fc.stretch || 100}%;` : ''}color:${b.t.ink}`); y += 80;
        y += P.para(b.x, y, b.w, 'b-small b-med', 'body', W.medium, 14, 20, fc.family, `color:${b.t.ink}`);
        y += P.para(b.x, y, b.w, 'b-small', 'body', W.regular, 14, 20, `${role === 'display' ? 'Display' : 'Body'}, ${fc.weights.join(', ')}`, `color:${b.t.ink}`) + 40;
      }); }
    // front: the primary line under the valve, the other lines, the logo standing on the gusset
    { const b = box(2), t = b.t, ls = sentences(B.lines.primary);
      const f = fitDisplay(ctx, [ls.join(' ')], ctx.placeholders ? [24] : [32, 28, 24], b.w, 4), lh = Math.round(f.size * 0.95), nl = ctx.placeholders ? 2 : f.rows[0].length;  // slot: the placeholder wraps in its own way, so two lines are held
      let y = kind === 'bag' ? y0 + 160 : ins.top + 8;
      P.text(b.x, y, b.w, lh * nl, 'disp', f.rows[0].map(esc).join('<br>'), disp(f.size, lh, t.ink)); y += lh * nl + 16;
      (B.lines.others || []).forEach((o) => { y += P.para(b.x, y, b.w, 'b-small', 'body', W.regular, 14, 20, o, `color:${t.ink}`) + 4; });
      const lw = b.w, lh2 = lw / ctx.logo.geo.aspect;
      P.text(b.x, ins.bot - 8 - lh2, lw, lh2, '', ctx.logo.html('colour', { width: lw, colourway: R.colourwayOn(xs[2][2]), color: t.ink })); }
    // second gusset: the colours by share, each with a chip, its name, hex and share
    { const b = box(3), lc = R.lineOn(xs[3][2]); let y = ins.top + 8;
      R.order.forEach((c) => {
        P.field(b.x, y + 2, 16, 16, c.hex); P.line(`<rect x="${b.x - 0.5}" y="${y + 1.5}" width="17" height="17" fill="none" stroke="${lc}" stroke-width="1"/>`);
        P.text(b.x + 28, y, b.w - 28, 20, 'b-small b-med', esc(c.name), `color:${b.t.ink}`);
        P.text(b.x + 28, y + 20, b.w - 28, 20, 'b-small', `<span class="m">${esc(c.hex)}</span>&nbsp; ${Math.round(c.share * 100)}%`, `color:${b.t.ink}`);
        y += 60;
      }); }
    return P.html('all');
  },

  // the back panel, where a pack prints who to write to; what this document holds and leaves out on the board beside it
  'contact-scope'(ctx) {
    const P = new Pg(ctx, 'contact-scope'), { R, B, kind } = P, hex = R.back.hex, tx = R.textOn(hex), gi = R.groundText, W = ctx.weights;
    const x0 = 600, x1 = 1040, { y0, y1 } = P, ins = inner(kind, y0, y1);
    panel(P, { x0, x1, y0, y1, hex, l: 'fold', r: 'cut', role: 'back' });
    if (kind === 'bag') notch(P, 1040, y0, -1, R.lineOn(hex));
    neighbour(P, 40, x0, y0, y1, 40);
    const c = B.contact || {}, bw = 360, bx = 640;
    const f = fitDisplay(ctx, [c.owner || B.name], [72, 64, 56, 48, 40], bw, 2), lh = Math.round(f.size * 0.92);
    let y = ins.top + 8;
    P.text(bx, y, bw, 24, 'b-body b-med', 'Who to ask', `color:${tx.ink}`); y += 32;
    P.text(bx, y, bw, lh * f.rows[0].length, 'disp', f.rows[0].map(esc).join('<br>'), disp(f.size, lh, tx.ink)); y += lh * f.rows[0].length + 24;
    y += P.para(bx, y, bw, 'b-body', 'body', W.regular, 15, 24, ctx.placeholders ? 'The person named above owns this document. Write to them for a logo file, a missing asset or an exception.' : `${c.owner || B.name} owns this document. Write to them for a logo file, a missing asset or an exception.`,`color:${tx.ink}`) + 8;
    if (c.email) P.text(bx, y, bw, 24, 'b-body b-med', esc(c.email), `color:${tx.ink}`);
    P.text(bx, ins.bot - 48, bw, 24, 'b-body b-med', 'Version history', `color:${tx.ink}`);
    P.text(bx, ins.bot - 24, bw, 24, 'b-body', esc(ctx.versionLine), `color:${tx.ink}`);
    // on the board: what is in this document and what is not
    let gy = ins.top + 8;
    const n = ctx.pages.length, s = ctx.sections;
    P.text(40, gy, 520, 24, 'b-body b-med', 'In this document', `color:${gi.ink}`); gy += 28;
    gy += P.para(40, gy, 520, 'b-body', 'body', W.regular, 15, 24, `${n} pages in ${s.length} sections: ${s.map((x) => x.title).join(', ')}.`, `color:${gi.ink}`) + 40;
    P.text(40, gy, 520, 24, 'b-body b-med', 'Not in this document', `color:${gi.ink}`); gy += 28;
    [['Logo files, palettes and fonts.', 'They are in the brand kit.'], ['Interface components and tokens.', 'They are in the UI kit.'], ['Print specifications, CMYK and Pantone values.', 'Ask your printer for a proof.']].forEach(([a, b]) => {
      P.text(40, gy, 520, 24, 'b-body', esc(a), `color:${gi.ink}`); P.text(40, gy + 24, 520, 20, 'cap', esc(b), `color:${gi.quiet}`); gy += 64;
    });
    return P.html(hex);
  },
};
