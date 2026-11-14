// Theme 32, Dieline, lane g3: the colour and type pages (proportion, contrast, colour values, hierarchy, type in use, type rules).
// Each page is a different part of the pack, flattened: the pack filled by share, the carton net laid on its side, the row of dust flaps,
// the front with its gusset, the back panel at print size, and one big tuck flap. Every colour, size and ratio is read from ctx.
import { phTight } from './ph.js';
import { roles, pack, allocate, measure, wrap, sentences, L, pathLine, ghost, flapPath, closure, satchelFlap, crimp, scaleFor, r2, esc } from './geom.js';

const px = (n) => `${r2(n)}px`;
const lc = (h) => String(h).toLowerCase();
// a line with only its values in mono (numbers with units, hex codes, ratios); the words around them stay in the sans
const VALRE = /#[0-9A-Fa-f]{3,8}\b|\d+(?:[.,]\d+)*(?:\s?x\s?\d+(?:[.,]\d+)*)*(?:\s?(?:mm|kg|g|px)\b)?/g;
const mixed = (s) => { s = String(s ?? ''); let o = '', i = 0; for (const m of s.matchAll(VALRE)) { o += esc(s.slice(i, m.index)) + `<span class="m">${esc(m[0])}</span>`; i = m.index + m[0].length; } return o + esc(s.slice(i)); };
const WN = { 300: 'Light', 400: 'Regular', 500: 'Medium', 600: 'SemiBold', 700: 'Bold', 800: 'ExtraBold', 900: 'Black' };
const nameOf = (ctx, hex) => ([...ctx.colours, ...(ctx.tones || [])].find((c) => lc(c.hex) === lc(hex)) || { name: hex }).name;
const pct = (s) => `${Math.round(s * 100)}%`;

// ---- a page: fields (html divs, so the checker reads the ground under each line of text), die lines (one svg), text, chrome.
// The same frame as the gate pages' (guidelines.js), copied here because that file exports only its pages.
class Pg {
  constructor(ctx, id) {
    this.ctx = ctx; this.id = id; this.R = roles(ctx); this.K = pack(ctx); this.B = ctx.brand;
    this.f = []; this.l = []; this.t = []; this.g = []; this.boxes = [];
    this.kind = this.K.kind; this.y0 = this.kind === 'bag' ? 96 : 168; this.y1 = 912;
    this.gcol = this.R.ghost;
  }
  field(x, y, w, h, hex, extra = '') { this.f.push(`<div class="fd" style="left:${px(x)};top:${px(y)};width:${px(w)};height:${px(h)};background:${hex}${extra}"></div>`); }
  line(...s) { this.l.push(...s); }
  text(x, y, w, h, cls, html, style = '') {
    this.boxes.push({ x, y, w, h });
    this.t.push(`<div class="tx ${cls}" style="left:${px(x)};top:${px(y)};width:${px(w)};height:${px(h)};${style}">${html}</div>`);
  }
  rows(x, y, w, cls, rows, lh, style = '', fmt = esc) { this.text(x, y, w, rows.length * lh, cls, rows.map(fmt).join('<br>'), `line-height:${lh}px;${style}`); return rows.length * lh; }
  gh(kind, axis, at, a, b, col) { this.g.push({ kind, axis, at, a, b, col: col || this.gcol }); }
  chrome(hl) {
    const { ctx, R, id } = this, ink = R.groundText.ink, p = ctx.pages.find((x) => x.id === id) || {};
    const heads = [[40, this.B.name], [244, 'Brand guidelines'], [550, p.section ? p.section.title : ''], [856, p.title || '']];
    let out = heads.filter((h) => h[1]).map(([x, s]) => `<div class="hd" style="left:${x}px">${esc(s)}</div>`).join('');
    out += `<div class="fo">${String(ctx.pageNo(id)).padStart(3, '0')}</div>`;
    // locator net: the palette in miniature, 240 wide, panels by share; the colour this page is about gets the ink outline
    const ws = allocate(R.order.map((c) => c.share), 240, 6); let x = 40, rects = '', hit = null;
    R.order.forEach((c, i) => {
      this.field(x, 1016, ws[i], 20, c.hex);
      if (R.isGround(c.hex)) rects += `<rect x="${x + 0.5}" y="1016.5" width="${ws[i] - 1}" height="19" fill="none" stroke="${this.gcol}" stroke-width="1"/>`;
      if (hl !== 'all' && hl && lc(c.hex) === lc(hl)) hit = [x, ws[i]];
      x += ws[i];
    });
    if (hl === 'all') hit = [40, 240];
    if (hit) rects += `<rect x="${hit[0] - 2}" y="${1016 - 2}" width="${hit[1] + 4}" height="24" fill="none" stroke="${ink}" stroke-width="1.5"/>`;
    return { out, rects };
  }
  html(hl) {
    const gl = this.g.map((g) => ghost(g.kind, g.axis, g.at, g.a, g.b, this.boxes, g.col)).join('');
    const c = this.chrome(hl);
    return `<section class="pg${this.kind === 'satchel' ? ' sat' : ''}${phTight(this.ctx, this.id)}" data-page="${this.id}" style="isolation:isolate">${this.f.join('')}<svg class="ln" viewBox="0 0 1080 1080" xmlns="http://www.w3.org/2000/svg">${gl}${this.l.join('')}${c.rects}</svg>${this.t.join('')}${c.out}</section>`;
  }
}

// a flap hinged on a vertical fold at xh, running from a to b, `depth` out to the left (dir -1) or right (dir 1): tuck flaps round their outer corners, dust flaps chamfer them
function sideFlap(style, xh, a, b, depth, dir) {
  const xe = xh + dir * depth, sw = dir > 0 ? 1 : 0;
  if (style === 'tuck') { const r = Math.min(32, (b - a) / 2); return `M${xh} ${a}H${r2(xe - dir * r)}A${r2(r)} ${r2(r)} 0 0 ${sw} ${xe} ${r2(a + r)}V${r2(b - r)}A${r2(r)} ${r2(r)} 0 0 ${sw} ${r2(xe - dir * r)} ${b}H${xh}`; }
  const c = Math.min(24, (b - a) / 3);
  return `M${xh} ${a}H${r2(xe - dir * c)}L${xe} ${r2(a + c)}V${r2(b - c)}L${r2(xe - dir * c)} ${b}H${xh}`;
}
// values in mono, wrapped by whole tokens to a width (an OKLCH triple breaks between its numbers, never inside one)
function monoRows(ctx, s, w) {
  const out = []; let cur = '';
  for (const t of String(s).split(' ')) { const n = cur ? `${cur} ${t}` : t; if (cur && measure(ctx, 'val', 400, n, 12) > w) { out.push(cur); cur = t; } else cur = n; }
  return cur ? [...out, cur] : out;
}
// the first candidate that sets on one line inside w, else the shortest first word on offer
function oneLine(ctx, face, weight, size, w, cands) {
  const cs = cands.filter((s) => s && String(s).trim()).map((s) => String(s).trim());
  for (const s of cs) if (measure(ctx, face, weight, s, size) <= w) return s;
  const words = cs.map((s) => s.split(/\s+/)[0].replace(/[,.;:]$/, '')).sort((a, b) => measure(ctx, face, weight, a, size) - measure(ctx, face, weight, b, size));
  return words[0] || '';
}

export const guidelines = {
  // ---- proportion: every colour of a page poured into one pack, a band per colour as tall as its share; the ground is the headspace ----
  proportion(ctx) {
    const P = new Pg(ctx, 'proportion'), { R, K, B, kind } = P, W = ctx.weights, gi = R.groundText;
    const x0 = 400, x1 = 1040, y0 = P.y0, y1 = P.y1;
    // top down: the ground, then the rest from the smallest share to the largest, so the biggest colour settles at the bottom
    const rest = R.order.filter((c) => !R.isGround(c.hex)).sort((a, b) => a.share - b.share);
    const bands = [R.ground, ...rest], hs = allocate(bands.map((c) => c.share), y1 - y0, 52);
    const tops = []; hs.reduce((y, h) => (tops.push(y), y + h), y0);
    const at = (y) => { let i = 0; while (i < bands.length - 1 && y >= tops[i + 1]) i++; return bands[i]; };
    const col = (y) => R.lineOn(at(y).hex), out = [];
    const topK = kind === 'bag' ? 'cut' : 'fold', botK = kind === 'box' ? 'fold' : 'cut';
    bands.forEach((c, i) => {
      P.field(x0, tops[i], x1 - x0, hs[i], c.hex);
      const lc0 = R.lineOn(c.hex);
      out.push(L('fold', x0 + 0.75, tops[i], x0 + 0.75, tops[i] + hs[i], lc0), L('cut', x1 - 0.75, tops[i], x1 - 0.75, tops[i] + hs[i], lc0));
    });
    out.push(L(topK, x0, y0 + 0.75, x1, y0 + 0.75, col(y0)), L(botK, x0, y1 - 0.75, x1, y1 - 0.75, col(y1 - 1)));
    if (kind === 'bag') {
      const sc = col(y0 + 44), gc = col(y1 - 40), vc = col(y0 + 112), cx = x1 - 64, cy = y0 + 112;
      out.push(L('seal', x0, y0 + 44, x1, y0 + 44, sc), crimp(x0, x1, y0 + 44, sc), L('fold', x0, y1 - 40, x1, y1 - 40, gc));
      out.push(pathLine('seal', `M${cx - 22} ${cy}a22 22 0 1 0 44 0a22 22 0 1 0 -44 0`, vc), pathLine('seal', `M${cx - 8} ${cy}a8 8 0 1 0 16 0a8 8 0 1 0 -16 0`, vc));
      out.push(pathLine('cut', `M${x1} ${y0 + 50}L${x1 - 10} ${y0 + 56}L${x1} ${y0 + 62}`, col(y0 + 56), { fill: R.ground.hex }));
    } else if (kind === 'satchel') {
      satchelFlap(R, x0, x1, y0, R.front.hex, 'cut', 'cut', out);
      const wc = col(y1 - 16); out.push(L('seal', x0, y1 - 16, x1, y1 - 16, wc), crimp(x0, x1, y1 - 16, wc));
    } else {
      out.push(pathLine('cut', flapPath('tuck', x0 + 12, x1 - 12, y0, 88, -1), P.gcol), pathLine('cut', flapPath('tuck', x0 + 12, x1 - 12, y1, Math.min(88, 996 - y1), 1), P.gcol));
    }
    P.line(...out);
    // each band carries its share in the display face, sized by the band, with its name and hex beside it; clear of the seal, the valve and the gusset fold
    bands.forEach((c, i) => {
      const tx = R.textOn(c.hex), first = i === 0, last = i === bands.length - 1;
      const a = tops[i] + (first && kind === 'bag' ? 74 : 16), b = tops[i] + hs[i] - (last ? (kind === 'bag' ? 56 : kind === 'satchel' ? 32 : 16) : 16);
      const s = Math.max(14, Math.min(96, Math.floor(hs[i] * 0.36 / 4) * 4, b - a)), num = pct(c.share);
      const nw = measure(ctx, 'display', W.heading, num, s);
      P.text(x0 + 40, a, Math.ceil(nw) + 4, s, 'disp', num, `font-size:${s}px;line-height:${s}px;color:${tx.ink}`);
      const lx = x0 + 40 + nw + 20;
      if (s >= 40) {
        P.text(lx, a + 2, 300, 20, 'b-small b-med', esc(c.name), `color:${tx.ink}`);
        P.text(lx, a + 22, 300, 16, 'm', esc(c.hex), `color:${tx.ink}`);
      } else P.text(lx, a + (s - 20) / 2, 320, 20, 'b-small', `<span class="b-med">${esc(c.name)}</span>&nbsp; <span class="m">${esc(c.hex)}</span>`, `color:${tx.ink}`);
    });
    // the fill gauge: a dimension line beside the pack with a tick at every band, read from the bottom
    const dx = 360, dc = P.gcol, g = [L('cut', dx, y0, dx, y1, dc, 1)];
    let below = 0; const marks = [[y1, 0]];
    for (let i = bands.length - 1; i >= 0; i--) { below += bands[i].share; marks.push([tops[i], below]); }
    marks.forEach(([y, v]) => { g.push(L('cut', dx - 6, y, dx + 6, y, dc, 1)); P.text(280, y - 8, 64, 16, 'm', v ? pct(v) : '0', `text-align:right;color:${gi.quiet}`); });
    P.line(...g);
    const bot = rest[rest.length - 1] || R.ground;
    const intro = `Every colour of a ${B.name} page, poured into one ${K.noun}. Each band is as tall as that colour’s share, so ${R.ground.name} is the headspace and ${bot.name} fills the bottom ${pct(bot.share)}.`;
    const ir = wrap(ctx, 'body', W.regular, intro, 15, 216);
    P.rows(40, 96, 216, 'b-body', ir, 24, `color:${gi.ink}`);
    return P.html('all');
  },

  // ---- contrast: the carton net laid on its side, one panel per background, every ink that may print on it with its ratio ----
  contrast(ctx) {
    const P = new Pg(ctx, 'contrast'), { R, B } = P, W = ctx.weights, gi = R.groundText;
    const groups = [];
    for (const p of ctx.pairs) { let g = groups.find((x) => lc(x.bg) === lc(p.bgHex)); if (!g) groups.push(g = { bg: p.bgHex, pairs: [] }); g.pairs.push(p); }
    const un = ctx.unusedPairs || [];
    const intro = `Every pair of colours ${B.name} sets text in, with its contrast ratio. Text needs 4.5 : 1, and type 24 px and over needs 3 : 1. Each panel of this carton is one background.`;
    const ir = wrap(ctx, 'body', W.regular, intro, 15, 620);
    P.rows(40, 96, 620, 'b-body', ir, 24, `color:${gi.ink}`, mixed);
    // pairs that fall short: a list under the net, four to a row when the names fit, else three
    const ul = un.map((p) => ({ p, a: `${inkName(ctx, p.fgHex, p.bgHex, nameOf(ctx, p.fgHex).endsWith(` on ${nameOf(ctx, p.bgHex)}`) ? false : true)} on ${nameOf(ctx, p.bgHex)}` }));
    const wid = (u) => measure(ctx, 'body', W.regular, u.a, 14) + 10 + measure(ctx, 'val', 400, p2(u.p.ratioText), 12);
    const uc = ul.every((u) => wid(u) <= 250 - 24 - 16) ? 4 : 3, ucw = 1000 / uc, urows = Math.ceil(ul.length / uc);
    const uTop = ul.length ? 984 - (28 + urows * 20) : 996;
    const bx0 = 128, bx1 = 952, top = 96 + ir.length * 24 + 24 + 32, bot = ul.length ? uTop - 40 : 912, N = groups.length;
    const h = Math.min(160, Math.floor((bot - top) / N / 4) * 4), out = [];
    // the glue flap along the top edge
    out.push(pathLine('cut', `M${bx0} ${top}L${bx0 + 24} ${top - 32}H${bx1 - 24}L${bx1} ${top}`, P.gcol));
    const k = Math.max(3, ...groups.map((g) => g.pairs.length)), cw = (bx1 - bx0 - 80) / k;
    groups.forEach((g, i) => {
      const y = top + i * h, col = R.lineOn(g.bg), ink = R.textOn(g.bg).ink;
      P.field(bx0, y, bx1 - bx0, h, g.bg);
      out.push(L('fold', bx0, y + 0.75, bx1, y + 0.75, col), L('fold', bx0 + 0.75, y, bx0 + 0.75, y + h, col), L('fold', bx1 - 0.75, y, bx1 - 0.75, y + h, col));
      if (i === N - 1) out.push(L('cut', bx0, y + h - 0.75, bx1, y + h - 0.75, col));
      // flaps at both ends, unprinted board: tuck flaps and dust flaps alternate down the net, as they do round a carton
      const tuck = i % 2 === 0, ins = tuck ? 12 : 0, d = tuck ? 88 : 56;
      out.push(pathLine('cut', sideFlap(tuck ? 'tuck' : 'dust', bx0, y + ins, y + h - ins, d, -1), P.gcol), pathLine('cut', sideFlap(tuck ? 'tuck' : 'dust', bx1, y + ins, y + h - ins, d, 1), P.gcol));
      g.pairs.forEach((p, j) => {
        const cx = bx0 + 40 + j * cw, ds = 32, fg = p.fgHex, nm = inkName(ctx, fg, g.bg, false);
        // the brand's own use line says when a pair is for large type; "24 px and over" is added only where it does not
        const use = p.large && !/24\s*px/i.test(p.use) ? `${p.use}. 24 px and over.` : p.use;
        let ur = wrap(ctx, 'body', W.regular, use, 14, cw - 20); if (ur.length > 2) ur = wrap(ctx, 'body', W.regular, p.use, 14, cw - 20).slice(0, 2);
        const ch = ds + 4 + 20 + ur.length * 20, cy = y + Math.max(12, Math.round((h - ch) / 2));
        const rw = measure(ctx, 'display', W.heading, p2(p.ratioText), ds);
        P.text(cx, cy, Math.ceil(rw) + 4, ds, 'disp', esc(p2(p.ratioText)), `font-size:${ds}px;line-height:${ds}px;color:${fg}`);
        // the ink's name sits under its ratio, then what it is for. A large-only pair names its ink in the panel's own text colour: at 14 px the pair itself would not read
        P.text(cx, cy + ds + 4, cw - 20, 20, 'b-small b-med', esc(nm), `color:${p.large ? ink : fg}`);
        P.rows(cx, cy + ds + 24, cw - 20, 'b-small', ur, 20, `color:${p.large ? ink : fg}`);
      });
    });
    P.line(...out);
    if (ul.length) {
      P.text(40, uTop, 600, 20, 'b-small', `<span class="b-med">Not used for text.</span> These pairs fall under <span class="m">4.5 : 1</span>.`, `color:${gi.ink}`);
      const sv = [];
      ul.forEach((u, i) => {
        const x = 40 + (i % uc) * ucw, y = uTop + 28 + Math.floor(i / uc) * 20;
        // the chip: the ground with a square of the ink in it; no letters, since the pair is the thing that does not read
        P.field(x, y + 3, 14, 14, u.p.bgHex); P.field(x + 4, y + 7, 6, 6, u.p.fgHex);
        sv.push(`<rect x="${x + 0.5}" y="${y + 3.5}" width="13" height="13" fill="none" stroke="${gi.quiet}" stroke-width="1"/>`);
        P.text(x + 24, y, ucw - 32, 20, 'b-small', `${esc(u.a)}&nbsp; <span class="m" style="color:${gi.quiet}">${esc(p2(u.p.ratioText))}</span>`, `color:${gi.ink}`);
      });
      P.line(...sv);
    }
    return P.html('all');
  },

  // ---- colour values: a row of dust flaps hanging from one fold, a flap per colour, each holding its values and its tint ramp ----
  'colour-values'(ctx) {
    const P = new Pg(ctx, 'colour-values'), { R, B } = P, W = ctx.weights, gi = R.groundText, cs = ctx.colours;
    const ws = allocate(cs.map(() => 1), 1000, 0), hy = 112, c = 24, steps = Object.keys(cs[0].ramp);
    const cols = []; let x = 40;
    cs.forEach((col, i) => {
      const x0 = x + 4, x1 = x + ws[i] - 4, iw = x1 - x0 - 32, rows = [];
      const rgb = (col.rgb || '').replace(/[RGB]/g, '').trim(), ok = (col.oklch || '').replace(/^oklch\(|\)$/g, '');
      for (const [lab, val] of [['HEX', col.hex], ['RGB', rgb], ['OKLCH', ok], ...(ctx.C.cmykParts(col) ? [['CMYK', ctx.C.cmykParts(col).join(' ')]] : [])]) rows.push({ lab, val: monoRows(ctx, val, iw) });
      cols.push({ col, x0, x1, iw, rows }); x += ws[i];
    });
    // the values block is as tall as its longest column, so the ramps start on one line across the row
    const vh = Math.max(...cols.map((k) => k.rows.reduce((s, r) => s + 16 + r.val.length * 16 + 8, 0)));
    const rampY = hy + 24 + 28 + vh + 8;
    // the flaps hang as deep as the page allows: what sits under them (the tones, the print note) is measured first, the ramp steps share the rest
    const tones = ctx.tones || [], act = cs.find((k) => k.role === 'action') || R.front;
    const note = `These values are for screens. Ink on board shifts a colour, so ask your printer for a proof on the real stock before a run, and match ${act.name} to the proof. Every ramp step is in the palette files in the brand kit.`;
    const nr = wrap(ctx, 'body', W.regular, note, 15, 440);
    const belowH = Math.max(tones.length ? 28 + tones.length * 20 : 0, nr.length * 24);
    const st = Math.max(20, Math.min(44, Math.floor((976 - 40 - belowH - c - 16 - rampY) / steps.length / 4) * 4));
    const yb = rampY + steps.length * st + 16 + c;
    const out = [];
    cols.forEach(({ col, x0, x1, iw, rows }) => {
      const hex = col.hex, tx = R.textOn(hex), lcol = R.lineOn(hex), ix = x0 + 16;
      P.field(x0, hy, x1 - x0, yb - hy, hex, `;clip-path:polygon(0 0,100% 0,100% calc(100% - ${c}px),calc(100% - ${c}px) 100%,${c}px 100%,0 calc(100% - ${c}px))`);
      out.push(L('fold', x0, hy + 0.75, x1, hy + 0.75, lcol));
      out.push(pathLine('cut', `M${x0 + 0.75} ${hy}V${yb - c}L${x0 + c} ${yb - 0.75}H${x1 - c}L${x1 - 0.75} ${yb - c}V${hy}`, lcol));
      P.text(ix, hy + 24, iw, 20, 'b-small b-med', esc(col.name), `color:${tx.ink}`);
      let y = hy + 24 + 28;
      for (const r of rows) {
        P.text(ix, y, iw, 16, 'g3-lab', r.lab, `color:${tx.quiet}`);
        P.rows(ix, y + 16, iw, 'm', r.val, 16, `color:${tx.ink}`);
        y += 16 + r.val.length * 16 + 8;
      }
      // the ramp, light to dark; the step that is the colour itself is the flap, so it shows as an outlined gap
      steps.forEach((s, j) => {
        const ry = rampY + j * st, bh = st - 4, base = +s === col.rampBase;
        P.text(ix, ry + (bh - 16) / 2, 32, 16, 'm', s, `color:${base ? tx.ink : tx.quiet}`);
        P.field(ix + 40, ry, iw - 40, bh, col.ramp[s]);
        if (base) out.push(`<rect x="${ix + 40.5}" y="${ry + 0.5}" width="${iw - 41}" height="${bh - 1}" fill="none" stroke="${lcol}" stroke-width="1"/>`);
      });
    });
    P.line(...out);
    // below the flaps: the tones, then the print note
    let ty = yb + 40;
    if (tones.length) {
      P.text(40, ty, 440, 20, 'b-small b-med', 'Tones', `color:${gi.ink}`); ty += 28;
      const sv = [];
      for (const t of tones) {
        P.field(40, ty + 3, 14, 14, t.hex);
        if (R.isGround(t.hex)) sv.push(`<rect x="40.5" y="${ty + 3.5}" width="13" height="13" fill="none" stroke="${gi.quiet}" stroke-width="1"/>`);
        P.text(64, ty, 420, 20, 'b-small', `<span class="b-med">${esc(t.name)}</span>&nbsp; <span class="m" style="color:${gi.quiet}">${esc(t.hex)}</span>`, `color:${gi.ink}`);
        ty += 20;
      }
      P.line(...sv);
    }
    P.rows(600, yb + 40, 440, 'b-body', nr, 24, `color:${gi.ink}`);
    return P.html('all');
  },

  // ---- hierarchy: the front of the pack with its gusset, every step of the scale set on it at its true size, a callout to each ----
  hierarchy(ctx) {
    const P = new Pg(ctx, 'hierarchy'), { R, K, B, kind } = P, W = ctx.weights, gi = R.groundText;
    const S = B.type.scale, fh = R.front.hex, tx = R.textOn(fh), sh = R.side.hex, y0 = P.y0, y1 = P.y1;
    const fx0 = kind === 'satchel' ? 40 : 120, fx1 = 720, out = [];
    if (kind !== 'satchel') {
      P.field(40, y0, fx0 - 40, y1 - y0, sh);
      closure(R, kind, { x0: 40, x1: fx0, y0, y1, hex: sh, l: 'cut', r: 'none', role: 'side', valve: false }, out);
    }
    P.field(fx0, y0, fx1 - fx0, y1 - y0, fh);
    if (kind === 'satchel') satchelFlap(R, fx0, fx1, y0, fh, 'cut', 'cut', out);
    closure(R, kind, { x0: fx0, x1: fx1, y0, y1, hex: fh, l: kind === 'satchel' ? 'cut' : 'fold', r: 'cut', role: 'front', valve: true }, out);
    P.line(...out);
    // the samples: the pack's own words where they fit the step on one line at its true size
    const sx = fx0 + 40, sw = fx1 - 56 - sx, c = (B.ui && B.ui.screen && B.ui.screen.content) || {}, pr = K.product || {};
    const prim = sentences(B.lines.primary || ''), others = B.lines.others || [];
    const cands = { display: [pr.name, B.name, ...prim], headline: [pr.date, ...prim, ...others], title: [...others, pr.name, B.name], label: [c.form && c.form.book, c.empty && c.empty.cta, others[0]] };
    const fam = (t) => (t.face === 'display' ? 'display' : 'body'), wt = (t) => (t.face === 'display' ? W.heading : t.weight);
    const rows = S.map((t) => {
      const lh = Math.round(t.size * t.line);
      let lines;
      if (cands[t.token]) lines = [oneLine(ctx, fam(t), wt(t), t.size, sw, cands[t.token])];
      else if (t.token === 'caption') lines = wrap(ctx, fam(t), wt(t), (B.type.sample && B.type.sample.caption) || t.use, t.size, sw);
      else lines = wrap(ctx, fam(t), wt(t), sentences((B.type.sample && B.type.sample.paragraph) || t.use)[0], t.size, Math.min(sw, 440));
      const spec = `${t.size} px, line ${t.line}, ${WN[t.weight] || ''} ${t.weight}`.replace(/\s+/g, ' ');
      const ur = wrap(ctx, 'chrome', 400, t.use, 14, 264);
      return { t, lh, lines, sampleW: Math.max(...lines.map((s) => measure(ctx, fam(t), wt(t), s, t.size))), sh: lines.length * lh, spec, ur, ch: 40 + ur.length * 20 };
    });
    // rows run down the front, each as tall as its sample or its callout; the gaps share what is left
    const start = kind === 'bag' ? y0 + 168 : y0 + 56, end = y1 - (kind === 'bag' ? 56 : kind === 'satchel' ? 32 : 24);
    rows.forEach((r) => { r.lead = Math.min(r.lh, r.sh) / 2; r.h = Math.max(r.sh, r.lead - 10 + r.ch); });
    const gap = Math.max(8, Math.min(40, (end - start - rows.reduce((s, r) => s + r.h, 0)) / Math.max(1, rows.length - 1)));
    let y = start; const lead = [];
    rows.forEach((r) => {
      const { t } = r, ly = y + r.lead;
      P.rows(sx, y, sw, t.face === 'display' ? 'disp' : '', r.lines, r.lh, `font-size:${t.size}px;${t.face === 'display' ? '' : `font-family:var(--body);font-weight:${t.weight};`}color:${tx.ink}`);
      // the callout on the ground: the step's name, its values, what it is for
      P.text(776, ly - 10, 264, 20, 'b-small b-med', esc(ctx.cap(t.token)), `color:${gi.ink}`);
      P.text(776, ly + 10, 264, 20, 'cap', mixed(r.spec), `color:${gi.ink}`);
      P.rows(776, ly + 30, 264, 'cap', r.ur, 20, `color:${gi.quiet}`);
      const ax = sx + r.sampleW + 16;
      lead.push(`<circle cx="${r2(ax)}" cy="${r2(ly)}" r="2.5" fill="${R.lineOn(fh)}"/>`, L('cut', ax, ly, fx1, ly, R.lineOn(fh), 1), L('cut', fx1, ly, 760, ly, P.gcol, 1));
      y += r.h + gap;
    });
    P.line(...lead);
    const intro = `The ${S.length} steps of the ${ctx.placeholders ? 'brand' : B.name} scale, each set on the front of the ${K.noun} at its true size.`;
    P.rows(776, 96, 264, 'b-body', wrap(ctx, 'body', W.regular, intro, 15, 264), 24, `color:${gi.ink}`);
    P.gh('cut', 'h', y1, fx1, 1040);
    return P.html(fh);
  },

  // ---- type in use: the back panel of the pack at its print size, set with a headline, a paragraph and a caption ----
  'type-in-use'(ctx) {
    const P = new Pg(ctx, 'type-in-use'), { R, K, B, kind } = P, W = ctx.weights, gi = R.groundText, S = B.type;
    const tok = (k) => S.scale.find((t) => t.token === k);
    const hd = tok('headline') || S.scale[0], bd = tok('body') || S.scale[S.scale.length - 2], cp = tok('caption') || S.scale[S.scale.length - 1];
    const hex = R.back.hex, tx = R.textOn(hex);
    // the panel's size from the pack's first net: the front panel's width by the body height, at the largest round ratio that fits
    const net = K.nets[0], fp = net && (net.panels.find((p) => p[2] === 'front') || net.panels[0]);
    const top = kind === 'bag' ? 112 : kind === 'satchel' ? 184 : 176, availH = (kind === 'box' ? 900 : 872) - top;
    let pw = 480, ph = availH, ratio = null;
    if (fp) { const s = scaleFor(Math.min(560 / fp[1], availH / net.height)); pw = fp[1] * s.k; ph = net.height * s.k; ratio = s.label; }
    const x0 = 1040 - pw, x1 = 1040, y0 = top, y1 = top + ph, out = [];
    P.field(x0, y0, pw, ph, hex);
    if (kind === 'satchel') satchelFlap(R, x0, x1, y0, R.front.hex, 'cut', 'cut', out);
    closure(R, kind, { x0, x1, y0, y1, hex, l: 'cut', r: 'cut', role: 'back', valve: false }, out);
    if (kind === 'bag') { const col = R.lineOn(hex); for (const [e, d] of [[x0, 1], [x1, -1]]) out.push(pathLine('cut', `M${e} ${y0 + 50}L${e + d * 10} ${y0 + 56}L${e} ${y0 + 62}`, col, { fill: R.ground.hex })); }
    // the width, dimensioned under the panel the way a die drawing carries it
    const yd = (kind === 'box' ? Math.min(y1 + 88, 996) : y1) + 24, dc = gi.ink, wl = fp ? `${fp[1]} mm` : '';
    if (fp && yd < 996) {
      const mx = x0 + pw / 2;
      out.push(L('cut', x0, yd, mx - 40, yd, dc, 1), L('cut', mx + 40, yd, x1, yd, dc, 1), L('cut', x0, yd - 5, x0, yd + 5, dc, 1), L('cut', x1, yd - 5, x1, yd + 5, dc, 1));
      P.text(mx - 40, yd - 8, 80, 16, 'cap', mixed(wl), `text-align:center;color:${gi.ink};line-height:16px`);
    }
    P.line(...out);
    const ix = x0 + 40, iw = pw - 80;
    const hl = Math.round(hd.size * hd.line), bl = Math.round(bd.size * bd.line), cl = Math.round(cp.size * cp.line);
    const hr = wrap(ctx, 'display', W.heading, S.sample.headline, hd.size, iw), cr = wrap(ctx, 'body', cp.weight, S.sample.caption, cp.size, iw);
    const hy = y0 + (kind === 'bag' ? 88 : 40), by = hy + hr.length * hl + 24, cy = y1 - (kind === 'bag' ? 56 : kind === 'satchel' ? 32 : 40) - cr.length * cl;
    // the paragraph keeps whole sentences only, as many as stand clear of the caption on this panel
    const ps = sentences(S.sample.paragraph);
    let br = wrap(ctx, 'body', bd.weight, S.sample.paragraph, bd.size, Math.min(iw, 440));
    for (let n = ps.length - 1; n >= 1 && by + br.length * bl + 24 > cy; n--) br = wrap(ctx, 'body', bd.weight, ps.slice(0, n).join(' '), bd.size, Math.min(iw, 440));
    P.rows(ix, hy, iw, 'disp', hr, hl, `font-size:${hd.size}px;color:${tx.ink}`);
    P.rows(ix, by, iw, 'b-body', br, bl, `font-size:${bd.size}px;font-weight:${bd.weight};color:${tx.ink}`);
    P.rows(ix, cy, iw, '', cr, cl, `font-family:var(--body);font-size:${cp.size}px;font-weight:${cp.weight};color:${tx.quiet}`);
    // the specs, each level with the piece it describes
    const cw = x0 - 48 - 40, fam = (t) => B.fonts[t.face === 'display' ? 'display' : 'body'].family, wt = (t) => (t.face === 'display' ? W.heading : t.weight);
    const spec = (y, name, t) => {
      P.text(40, y, cw, 20, 'b-small b-med', name, `color:${gi.ink}`);
      const r = wrap(ctx, 'chrome', 400, `${fam(t)} ${WN[wt(t)] || ''} ${wt(t)}, ${t.size} px, line ${t.line}`.replace(/\s+/g, ' '), 14, cw);
      P.rows(40, y + 20, cw, 'cap', r, 20, `color:${gi.quiet}`, mixed);
    };
    spec(hy, 'Headline', hd); spec(by, 'Paragraph', bd); spec(cy + cr.length * cl - 60, 'Caption', cp);
    const what = fp ? `${K.name || `the ${K.noun}`}, drawn at ${ratio}: the panel is ${fp[1]} x ${net.height} mm` : `the ${K.noun}`;
    // a value never breaks from its unit or across its x: "250 g" and "130 x 200 mm" are tied with no-break spaces
    const intro = `A headline, a paragraph and a caption on the back of the ${what}. This is where ${B.name} sets its longer copy.`.replace(/(\d) (?=(?:mm|kg|g|x)\b)|(\bx) (?=\d)/g, (m, d, x) => `${d || x}\u00a0`);
    P.rows(40, 96, cw, 'b-body', wrap(ctx, 'body', W.regular, intro, 15, cw), 24, `color:${gi.ink}`, mixed);
    return P.html(hex);
  },

  // ---- type rules: one big tuck flap. What is on the flap is how the brand sets type; what is trimmed off it never prints ----
  'type-rules'(ctx) {
    const P = new Pg(ctx, 'type-rules'), { R, K, B } = P, W = ctx.weights, gi = R.groundText;
    const rules = (B.type.rules || []).slice(0, 6), fh = R.flap.hex, tx = R.textOn(fh), col = R.lineOn(fh);
    const fx1 = 552, fy0 = 112, fy1 = 912, rad = 32;
    P.field(0, fy0, fx1, fy1 - fy0, fh, `;border-bottom-right-radius:${rad}px`);
    P.line(L('fold', 0, fy0 + 0.75, fx1, fy0 + 0.75, col), pathLine('cut', `M${fx1 - 0.75} ${fy0}V${fy1 - rad}A${rad - 0.75} ${rad - 0.75} 0 0 1 ${fx1 - rad} ${fy1 - 0.75}H-4`, col));
    const intro = `On the flap, how ${ctx.placeholders ? 'the brand' : B.name} sets type. Trimmed off it, what never prints.`;
    const ir = wrap(ctx, 'body', W.regular, intro, 15, 440);
    P.rows(600, fy0, 440, 'b-body', ir, 24, `color:${gi.ink}`);
    const disp = R.front.hex && ctx.brand.fonts.display, mono = B.fonts.mono, c = (B.ui && B.ui.screen && B.ui.screen.content) || {}, pr = K.product || {};
    const others = B.lines.others || [], body = (B.type.scale.find((t) => t.token === 'body') || { size: 15 }).size;
    const dw = (s, sz, up) => measure(ctx, 'display', W.heading, up ? s.toUpperCase() : s, sz);
    // a demonstration for each rule, picked by what the rule is about; a rule with nothing to show is words alone
    const demo = (r) => {
      const t = `${r.do} ${r.dont}`.toLowerCase();
      const line = (up) => { for (const sz of [28, 24, 20]) { const s = [pr.name, ...others, B.name].find((x) => x && dw(x, sz, up) <= 400); if (s) return { s, sz }; } return { s: B.name, sz: 20 }; };
      const d = (s, sz, ink, more = '') => `<span class="disp" style="font-size:${sz}px;line-height:32px;color:${ink};${more}">${esc(s)}</span>`;
      if (/date/.test(t) && /as (tall|large) as/.test(t) && pr.name && pr.date) {
        const sz = 28; return { h: 32, do: (ink) => `${d(pr.name, sz, ink)}&nbsp;&nbsp; ${d(pr.date, sz, ink)}`, dont: (ink) => `${d(pr.name, sz, ink)}&nbsp;&nbsp; <span style="font-family:var(--body);font-size:12px;color:${ink}">${esc(pr.date)}</span>` };
      }
      if (/capital|upper ?case|all caps/.test(t)) { const { s, sz } = line(true); return { h: 32, do: (ink) => d(s, sz, ink), dont: (ink) => d(s.toUpperCase(), sz, ink) }; }
      if (/letter-?spac|tracking/.test(t)) { const { s, sz } = line(true); return { h: 32, do: (ink) => d(s, sz, ink), dont: (ink) => d(s, sz, ink, 'letter-spacing:.14em') }; }
      if (/\bpx\b/.test(t) && /smaller|under/.test(t)) {
        const s = c.eta || others[0] || B.name;
        return { h: 24, do: (ink) => `<span style="font-family:var(--body);font-size:${body}px;line-height:24px;color:${ink}">${esc(s)}</span>`, dont: (ink) => `<span style="font-family:var(--body);font-size:9px;line-height:24px;color:${ink}">${esc(s)}</span>` };
      }
      // weight and a quiet colour: shown on the flap only, since the off-cut (faded text) would not read and is never set
      if (/quiet|secondary/.test(t) && /weight/.test(t)) {
        const a = pr.name || B.name, b2 = pr.date || others[0] || '';
        return { h: 24, do: (ink, q) => `<span style="font-family:var(--body);font-weight:${W.medium || 500};font-size:${body}px;line-height:24px;color:${ink}">${esc(a)}</span>${b2 ? `&nbsp;&nbsp; <span style="font-family:var(--body);font-size:${body}px;line-height:24px;color:${q}">${esc(b2)}</span>` : ''}`, dont: null };
      }
      if (/mono/.test(t) && mono) {
        const lab = (c.form && c.form.book) || others[0] || B.name;
        const m = (s, ink) => `<span style="font-family:var(--mono);font-weight:${mono.weights[0]};font-size:14px;line-height:24px;color:${ink}">${esc(s)}</span>`;
        return { h: 24, do: (ink) => m(R.front.hex, ink), dont: (ink) => m(lab, ink) };
      }
      return null;
    };
    const items = rules.map((r) => ({ r, d: demo(r), dor: wrap(ctx, 'body', W.regular, r.do, 14, 472), dnr: wrap(ctx, 'body', W.regular, r.dont, 14, 440) }));
    const start = fy0 + 24 + ir.length * 24 + 32, rowH = (fy1 - 40 - start) / Math.max(1, items.length), cut = [];
    items.forEach(({ d, dor, dnr }, i) => {
      const y = start + i * rowH;
      let a = y, b = y;
      if (d) { P.text(40, a, 472, d.h, '', d.do(tx.ink, tx.quiet)); a += d.h + 8; if (d.dont) { P.text(600, b, 440, d.h, '', d.dont(gi.ink)); b += d.h + 8; } }
      P.rows(40, a, 472, 'b-small', dor, 20, `color:${tx.ink}`);
      P.rows(600, b, 440, 'b-small', dnr, 20, `color:${gi.quiet}`);
      // a trim cut between the off-cuts, so each don't reads as its own piece of waste
      if (i) cut.push(L('cut', 600, y - 16, 1040, y - 16, P.gcol, 1));
    });
    P.line(...cut);
    return P.html(fh);
  },
};

// the ratio as printed: one decimal, never rounded up past a fail (ctx.pairs already carries it so)
// a ratio prints as 17.4:1, never as a bare number
function p2(t) { return `${String(t).replace(/\s*:\s*1$/, '')}:1`; }
// a tone named for the ground it is made for ("Quiet on White") drops that ground where it prints on it, so the panel is not named twice;
// off its own ground the name reads "Quiet (White tone)"
const inkName = (ctx, fgHex, bgHex, off) => {
  const n = nameOf(ctx, fgHex), i = n.lastIndexOf(' on ');
  if (i < 1) return n;
  const base = n.slice(0, i), ground = n.slice(i + 4);
  return off ? `${base} (${ground} tone)` : (ground === nameOf(ctx, bgHex) ? base : n);
};

export function css() {
  return `.pg .g3-lab{font:500 12px/16px var(--chrome);letter-spacing:.01em}`;
}
