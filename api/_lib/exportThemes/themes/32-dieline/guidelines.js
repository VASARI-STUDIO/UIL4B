// Theme 32, Dieline: the six round-1 gate pages. Every page is one panel of the brand's pack (or the whole net), drawn flat.
import { phTight } from './ph.js';
import { roles, pack, allocate, measure, wrap, sentences, L, pathLine, fillPath, ghost, flapPath, closure, satchelFlap, crimp, scaleFor, r2, esc } from './geom.js';

// a caption line with only its values in mono (numbers with units, hex codes); the words around them stay in the sans
const VALRE = /#[0-9A-Fa-f]{3,8}\b|\d+(?:[.,]\d+)*(?:\s?x\s?\d+(?:[.,]\d+)*)*(?:\s?(?:mm|kg|g|px\/mm)\b)?/g;
const mixed = (s) => { s = String(s ?? ''); let o = '', i = 0; for (const m of s.matchAll(VALRE)) { o += esc(s.slice(i, m.index)) + `<span class="m">${esc(m[0])}</span>`; i = m.index + m[0].length; } return o + esc(s.slice(i)); };

const px = (n) => `${r2(n)}px`;

// ---- a page: fields (html divs), die lines (one svg), text (html), chrome ----
class Pg {
  constructor(ctx, id) {
    this.ctx = ctx; this.id = id; this.R = roles(ctx); this.K = pack(ctx); this.B = ctx.brand;
    this.f = []; this.l = []; this.t = []; this.g = []; this.boxes = []; this.cells = [0, 1, 2, 3];
    this.kind = this.K.kind; this.y0 = this.kind === 'bag' ? 96 : 168; this.y1 = 912;
    this.gcol = this.R.ghost;
  }
  field(x, y, w, h, hex, extra = '') { this.f.push(`<div class="fd" style="left:${px(x)};top:${px(y)};width:${px(w)};height:${px(h)};background:${hex}${extra}"></div>`); }
  line(...s) { this.l.push(...s); }
  text(x, y, w, h, cls, html, style = '') {
    this.boxes.push({ x, y, w, h });
    this.t.push(`<div class="tx ${cls}" style="left:${px(x)};top:${px(y)};width:${px(w)};height:${px(h)};${style}">${html}</div>`);
  }
  raw(html) { this.t.push(html); }
  gh(kind, axis, at, a, b, col) { this.g.push({ kind, axis, at, a, b, col: col || this.gcol }); }
  chrome(hl) {
    const { ctx, R, id } = this, ink = R.groundText.ink, p = ctx.pages.find((x) => x.id === id) || {};
    const heads = [[40, this.B.name], [244, 'Brand guidelines'], [550, p.section ? p.section.title : ''], [856, p.title || '']];
    let out = heads.filter((h, i) => this.cells.includes(i) && h[1]).map(([x, s]) => `<div class="hd" style="left:${x}px">${esc(s)}</div>`).join('');
    out += `<div class="fo">${String(ctx.pageNo(id)).padStart(3, '0')}</div>`;
    // locator net: the palette in miniature, 240 wide, panels by share
    const ws = allocate(R.order.map((c) => c.share), 240, 6); let x = 40, rects = '', hit = null;
    R.order.forEach((c, i) => {
      this.field(x, 1016, ws[i], 20, c.hex);
      if (R.isGround(c.hex)) rects += `<rect x="${x + 0.5}" y="1016.5" width="${ws[i] - 1}" height="19" fill="none" stroke="${this.gcol}" stroke-width="1"/>`;
      if (hl !== 'all' && hl && c.hex.toLowerCase() === hl.toLowerCase()) hit = [x, ws[i]];
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

// ---- the panel of a role on its page (spec 2.3) ----
const SHAPE = { front: { x0: 244, x1: 1080, l: 'fold', r: 'bleed' }, back: { x0: 0, x1: 756, l: 'bleed', r: 'fold' }, side: { x0: 640, x1: 920, l: 'fold', r: 'fold' } };
function panel(P, role, hex, { valve = false } = {}) {
  const { R, kind } = P, g = { ...SHAPE[role], y0: P.y0, y1: P.y1, hex, role, valve };
  P.field(g.x0, g.y0, g.x1 - g.x0, g.y1 - g.y0, hex);
  const out = [];
  if (kind === 'satchel') satchelFlap(R, g.x0, g.x1, g.y0, R.front.hex, g.l, g.r, out);   // one flap colour on every page: the front colour
  closure(R, kind, g, out);
  P.line(...out);
  const top = kind === 'bag' ? 'cut' : 'fold', bot = kind === 'bag' || kind === 'satchel' ? 'cut' : 'fold';
  // the bag's back seam: a fin on the back panel's fold edge, tear-notched, with the seal line and crimp running through it
  const fin = kind === 'bag' && role === 'back' ? 14 : 0;
  if (fin) {
    const fx = g.x1, col = R.lineOn(hex), nx = fx + fin - 0.75;
    P.field(fx, g.y0, fin, g.y1 - g.y0, hex);
    P.line(L('cut', fx, g.y0 + 0.75, fx + fin, g.y0 + 0.75, col), L('cut', fx, g.y1 - 0.75, fx + fin, g.y1 - 0.75, col),
      pathLine('cut', `M${nx} ${g.y0}V${g.y0 + 50}L${nx - 8} ${g.y0 + 56}L${nx} ${g.y0 + 62}V${g.y1}`, col),
      L('seal', fx, g.y0 + 44, fx + fin, g.y0 + 44, col), crimp(fx, fx + fin, g.y0 + 44, col));
  }
  // ghost lines run only between the verticals they close: each one joins a fold at both ends
  const span = (a, b) => { P.gh(top, 'h', g.y0, a, b); P.gh(bot, 'h', g.y1, a, b); };
  // on a bag the neighbouring gusset panel is drawn with its own seal, crimp and W-fold, so the ground beside the colour is the rest of the die, not empty
  const nbr = (a, b) => { const o = []; closure(R, kind, { x0: a, x1: b, y0: g.y0, y1: g.y1, hex: R.ground.hex, l: 'none', r: 'none', role: 'side', valve: false }, o); P.line(...o); };
  if (role === 'front') { if (kind === 'bag') nbr(40, g.x0); else span(40, g.x0); P.gh('fold', 'v', 40, g.y0, g.y1); }
  if (role === 'back') { if (kind === 'bag') nbr(g.x1 + fin, 1000); else span(g.x1 + fin, 1000); P.gh('fold', 'v', 1000, g.y0, g.y1); }
  if (role === 'side') { span(300, g.x0); span(g.x1, 1040); P.gh('fold', 'v', 300, g.y0, g.y1); P.gh('fold', 'v', 1040, g.y0, g.y1); }
  return g;
}

// ---- photographed art (signage): flat art for a mockup surface, sized to the surface's own shape ----
const at = (x, y, w, h, cls, html, style = '') => `<div class="tx ${cls}" style="left:${px(x)};top:${px(y)};width:${px(w)};height:${px(h)};${style}">${html}</div>`;
const artDoc = (ctx, R, w, h, inner) => ({ w, h, html: ctx.artPage(`<div style="position:relative;width:${w}px;height:${h}px;overflow:hidden;background:${R.front.hex}">${inner}</div>`, { w, h }) });
const artSize = (ctx, sceneId, w) => { const q = ctx.sceneInfo(sceneId).quads[0]; return [w, Math.round(w / q.aspect)]; };
function bagArt(ctx, P, sceneId, w0) {
  const { R, K, B } = P, W = ctx.weights, tx = R.textOn(R.front.hex), [w, h] = artSize(ctx, sceneId, w0), s = w / 520, m = 48 * s, iw = w - 2 * m;
  let o = '';
  const pr = K.product;
  // the art lands at about 0.74 of its size on the page, so the smallest type is set at 17 to come out near 12.5 px
  if (K.place) o += at(m, 104 * s, iw, 24 * s, 'b-small', esc(K.place), `font-size:${17 * s}px;line-height:${24 * s}px;color:${tx.quiet}`);
  let cur = h - 72 * s;
  if (pr.net) { o += at(m, cur - 4 * s, iw, 24 * s, 'b-small', esc(pr.net), `font-size:${17 * s}px;line-height:${24 * s}px;color:${tx.mid}`); cur -= 36 * s; }
  if (pr.date) { const ds = Math.round(56 * s); o += at(m, cur - ds, iw, ds, 'disp', esc(pr.date), `font-size:${ds}px;line-height:${ds}px;color:${tx.quiet}`); cur -= ds + 48 * s; }
  if (pr.note) { const nr = wrap(ctx, 'body', W.regular, pr.note, 18 * s, iw); o += at(m, cur - nr.length * 26 * s, iw, nr.length * 26 * s, 'b-body', nr.map(esc).join('<br>'), `font-size:${18 * s}px;line-height:${26 * s}px;color:${tx.mid}`); cur -= nr.length * 26 * s + 16 * s; }
  const ns = Math.round(40 * s); o += at(m, cur - ns, iw, ns, 'disp', esc(pr.name), `font-size:${ns}px;line-height:${ns}px;color:${tx.ink}`); cur -= ns + 56 * s;
  const lw = Math.min(pr.logoW * s, iw), lh = lw / ctx.logo.geo.aspect;
  o += at(m, cur - lh, lw, lh, '', ctx.logo.html('colour', { width: lw, colourway: R.colourwayOn(R.front.hex), color: tx.ink }));
  return artDoc(ctx, R, w, h, o);
}
function posterArt(ctx, P, sceneId, w0) {
  const { R, K } = P, W = ctx.weights, tx = R.textOn(R.front.hex), [w, h] = artSize(ctx, sceneId, w0), m = 48, iw = w - 2 * m, pr = { ...K.product, name: K.product.poster || K.product.name };
  let o = '', cur = h - m;
  const lw = Math.min(360, iw), lh = lw / ctx.logo.geo.aspect;
  o += at(m, m, lw, lh, '', ctx.logo.html('colour', { width: lw, colourway: R.colourwayOn(R.front.hex), color: tx.ink }));
  // the headline only: a poster is read from across a street, and a line of body copy at 15 px would be mush on the wall
  let sz = 112, rows; for (const s of [112, 96, 80, 64]) { sz = s; rows = wrap(ctx, 'display', W.heading, pr.name, s, iw); if (rows.length <= 3 && rows.every((r) => measure(ctx, 'display', W.heading, r, s) <= iw)) break; }
  const lh2 = Math.round(sz * 0.92);
  o += at(m, cur - rows.length * lh2, iw, rows.length * lh2, 'disp', rows.map(esc).join('<br>'), `font-size:${sz}px;line-height:${lh2}px;color:${tx.ink}`);
  return artDoc(ctx, R, w, h, o);
}
function fasciaArt(ctx, P, sceneId, w0, vis) {
  const { R, K } = P, tx = R.textOn(R.front.hex), [w, h] = artSize(ctx, sceneId, w0), g = ctx.logo.geos.horizontal, lh = Math.round(h * 0.52), lw = lh * g.w / g.h, fs = Math.round(h * 0.5);
  // vis: the stretch of the sign the crop shows; the logo and the word sit 56 in from its ends
  const v0 = vis ? vis[0] : 0, v1 = vis ? vis[1] : w, e = vis ? 56 : 64;
  let o = at(v0 + e, (h - lh) / 2, lw, lh, '', ctx.logo.html('horizontal', { width: lw, colourway: R.colourwayOn(R.front.hex), color: tx.ink }));
  // the word on the fascia is read from the pavement, so it is set large: about 28 px once the sign is placed on the page
  if (K.product.fascia) o += at(v1 - e - 640, (h - fs) / 2, 640, fs, 'disp', esc(K.product.fascia), `font-size:${fs}px;line-height:${fs}px;text-align:right;color:${tx.quiet}`);
  return artDoc(ctx, R, w, h, o);
}
// a photo cropped in CSS: box bw x bh, scaled to cover; with `fill` the surface fills that share of the box height, centred on the surface
function crop(ctx, sceneId, bw, bh, fill) {
  const sc = ctx.sceneInfo(sceneId), q = sc.quads[0].corners, xs = q.map((c) => c[0]), ys = q.map((c) => c[1]);
  const qh = Math.max(...ys) - Math.min(...ys), cx = (Math.min(...xs) + Math.max(...xs)) / 2, cy = (Math.min(...ys) + Math.max(...ys)) / 2;
  const k = Math.max(fill ? fill * bh / qh : 0, bw / sc.w, bh / sc.h), cl = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
  return { w: sc.w * k, h: sc.h * k, left: cl(bw / 2 - cx * k, bw - sc.w * k, 0), top: cl(bh / 2 - cy * k, bh - sc.h * k, 0) };
}
const photo = (P, x, y, bw, bh, url, c, alt, style = '') => P.raw(`<div class="ph" style="left:${x}px;top:${y}px;width:${bw}px;height:${bh}px;${style}"><svg role="img" aria-label="${esc(alt)}" style="left:${r2(c.left)}px;top:${r2(c.top)}px;width:${r2(c.w)}px;height:${r2(c.h)}px"><image href="${esc(url)}" width="100%" height="100%" preserveAspectRatio="none"/></svg></div>`);

// ---- a net drawn at k px/mm (layouts page, signage satchel): panels filled by role, closures at net scale, art on the front ----
const netMm = (spec) => ({ w: spec.panels.reduce((s, p) => s + p[1], 0), h: spec.kind === 'bag' ? spec.height + spec.seal : spec.kind === 'satchel' ? spec.height + spec.flap : spec.height + 2 * spec.tuck });
function drawNet(P, spec, x0, top, k) {
  const { R, ctx } = P, kind = spec.kind, pn = spec.panels, W = ctx.weights, gcol = P.gcol, mm = netMm(spec), mmH = mm.h, o = [];
  const y0 = kind === 'bag' ? top : top + (kind === 'satchel' ? spec.flap : spec.tuck) * k, y1 = kind === 'bag' ? top + mmH * k : y0 + spec.height * k;
  const hexOf = (role) => ({ front: R.front, back: R.back, side: R.side, flap: R.flap, ground: R.ground }[role] || R.back).hex;
  const sides = pn.filter((p) => p[0] === 'side').map((p) => p[1]), gus = (sides.length ? Math.min(...sides) : 70) / 2;
  const xs = [x0]; pn.forEach((p) => xs.push(xs[xs.length - 1] + p[1] * k));
  const netR = xs[xs.length - 1], topK = kind === 'box' ? 'fold' : kind === 'satchel' ? 'fold' : 'cut', botK = kind === 'box' ? 'fold' : 'cut';
  if (kind === 'satchel') {
    // the flap, with the peel strip inside it
    // the flap is the front colour on every page, as on the cover (Signal is the jacket and the bag in the brand data)
    const fy = top, r = Math.min(spec.flap * k * 0.45, 16), fh = R.front.hex, col = R.lineOn(fh), inset = Math.max(10, 0.05 * (netR - x0));
    const py = fy + spec.flap * k * 0.3, ph = spec.flap * k * 0.4;
    o.push(pathLine('cut', `M${r2(x0 + 0.75)} ${r2(y0)}V${r2(fy + r)}A${r2(r)} ${r2(r)} 0 0 1 ${r2(x0 + r)} ${r2(fy + 0.75)}H${r2(netR - r)}A${r2(r)} ${r2(r)} 0 0 1 ${r2(netR - 0.75)} ${r2(fy + r)}V${r2(y0)}Z`, col, { fill: fh }));
    o.push(pathLine('seal', `M${r2(x0 + inset)} ${r2(py)}H${r2(netR - inset)}V${r2(py + ph)}H${r2(x0 + inset)}Z`, col));
    // the peel strip says what it is for, in the strip itself
    if (spec.peel && ph >= 28) P.text(x0 + inset, py + (ph - 20) / 2, netR - x0 - 2 * inset, 20, 'cap', esc(spec.peel), `text-align:center;color:${R.textOn(fh).ink}`);
  }
  pn.forEach(([role, mmw, tag], i) => {
    const x = xs[i], xe = xs[i + 1], hex = hexOf(role), col = R.lineOn(hex), glue = tag === 'glue';
    if (glue) {
      const ins = Math.min(17 * k, (y1 - y0) / 4);
      o.push(pathLine('cut', `M${r2(xe)} ${r2(y0)}L${r2(x)} ${r2(y0 + ins)}V${r2(y1 - ins)}L${r2(xe)} ${r2(y1)}`, gcol));
    } else P.field(x, y0, xe - x, y1 - y0, hex);
    if (!glue) { o.push(L(topK, x, y0 + 0.75, xe, y0 + 0.75, col), L(botK, x, y1 - 0.75, xe, y1 - 0.75, col)); }
    if (i > 0) o.push(L('fold', x + 0.75, y0, x + 0.75, y1, col)); else if (!glue) o.push(L('cut', x + 0.75, y0, x + 0.75, y1, col));
    if (i === pn.length - 1) o.push(L('cut', xe - 0.75, y0, xe - 0.75, y1, col));
    if (kind === 'bag') {
      o.push(L('seal', x, y0 + spec.seal * k, xe, y0 + spec.seal * k, col), L('fold', x, y1 - gus * k, xe, y1 - gus * k, col));
      if (!glue) o.push(crimp(x, xe, y0 + spec.seal * k, col, 9));
    }
    if (kind === 'box' && !glue) {
      const tuck = role === 'front' || role === 'back', h = (tuck ? spec.tuck : spec.dust) * k, ins = tuck ? Math.min(12, 8.6 * k) : 0, rad = Math.min(h * 0.6, (tuck ? 22 : 17) * k);
      const opt = { ra: true, rb: true, r: rad };
      o.push(pathLine('cut', flapPath(tuck ? 'tuck' : 'dust', x + ins, xe - ins, y0, h, -1, opt), gcol), pathLine('cut', flapPath(tuck ? 'tuck' : 'dust', x + ins, xe - ins, y1, h, 1, opt), gcol));
    }
    if (tag === 'front') {
      const tx = R.textOn(hex), a = spec.art || {}, floor = y1 - (kind === 'bag' ? gus * k : kind === 'satchel' ? spec.seal * k : 0) - 16;
      let cur = floor; const pad = a.pad || 10, ax = x + pad, aw = xe - x - 2 * pad;
      const add = (h, cls, html, style) => { cur -= h; P.text(ax, cur, aw, h, cls, html, style); cur -= 8; };
      // a headline set at the top of the front, as large as the width allows (spec.art.head: the lines, size cap in px)
      const headL = a.head || (a.brandLine ? sentences(P.B.lines.primary) : null);
      if (headL) {
        let hs = a.headMax || 48, hl; for (const hmin = a.headMin || 24; hs > hmin; hs -= 4) { if (a.headWhole) { hl = headL; if (hl.every((t) => measure(ctx, 'display', W.heading, t, hs, -0.005) <= aw)) break; continue; } hl = headL.flatMap((t) => (measure(ctx, 'display', W.heading, t, hs, -0.005) > aw ? wrap(ctx, 'display', W.heading, t, hs, aw, -0.005) : [t])); if (hl.every((t) => measure(ctx, 'display', W.heading, t, hs, -0.005) <= aw) && hl.length <= (a.headLines || 3)) break; }
        const hh = Math.round(hs * 0.92); P.text(ax, y0 + pad, aw, hh * hl.length, 'disp', hl.map(esc).join('<br>'), `font-size:${hs}px;line-height:${hh}px;letter-spacing:-.005em;color:${tx.ink}`);
      }
      if (a.dateMm && a.dateMm * k >= 11 && a.date) { let s = Math.round(a.dateMm * k); while (s > 11 && measure(ctx, 'display', W.heading, a.date, s) > aw) s--; add(s, 'disp', esc(a.date), `font-size:${s}px;line-height:${s}px;color:${tx.quiet}`); }
      if (a.note) { const ns = Math.max(14, Math.round(5 * k)), nl = Math.round(ns * 1.5), nr = wrap(ctx, 'body', W.regular, a.note, ns, aw); add(nr.length * nl, 'b-body', nr.map(esc).join('<br>'), `font-size:${ns}px;line-height:${nl}px;color:${tx.mid}`); }
      if (a.titleMm && a.titleMm * k >= 11 && a.title) { const s = Math.round(a.titleMm * k); add(s, 'disp', esc(a.title), `font-size:${s}px;line-height:${s}px;color:${tx.ink}`); }
      if (a.logoMm) { const lw = Math.min(a.logoMm * k, aw), lh = lw / ctx.logo.geo.aspect; add(lh, '', ctx.logo.html('colour', { width: r2(lw), colourway: R.colourwayOn(hex), color: tx.ink })); }
      if (kind === 'bag') {   // the valve sits on the front, above the art
        const d = 20 * k, cx = xe - 0.5 * 26 * k - d / 2, cy = y0 + spec.seal * k + 22 * k;
        o.push(pathLine('seal', `M${r2(cx - d / 2)} ${r2(cy)}a${r2(d / 2)} ${r2(d / 2)} 0 1 0 ${r2(d)} 0a${r2(d / 2)} ${r2(d / 2)} 0 1 0 ${r2(-d)} 0`, col), pathLine('seal', `M${r2(cx - d * 0.18)} ${r2(cy)}a${r2(d * 0.18)} ${r2(d * 0.18)} 0 1 0 ${r2(d * 0.36)} 0a${r2(d * 0.18)} ${r2(d * 0.18)} 0 1 0 ${r2(-d * 0.36)} 0`, col));
      }
    }
  });
  if (kind === 'satchel') {
    // the weld seam: a band along the foot, closed like the peel strip, with the ribs of the weld inside it
    const col = R.lineOn(hexOf(pn[pn.length - 1][0])), sy = y1 - spec.seal * k;
    o.push(pathLine('seal', `M${r2(x0 + 2)} ${r2(sy)}H${r2(netR - 2)}V${r2(y1 - 2)}H${r2(x0 + 2)}Z`, col));
    if (spec.seal * k >= 20) o.push(crimp(x0 + 2, netR - 2, sy, col, 14));
  }
  P.line(...o);
  const bottom = kind === 'box' ? y1 + spec.tuck * k : y1, frontMm = (pn.find((p) => p[2] === 'front') || pn[0])[1];
  // a bag or a satchel net is the flat sheet, so its size is the sheet's; the box prints its finished size
  const dims = kind === 'bag' || kind === 'satchel' ? `${mm.w} x ${mmH} mm` :`${frontMm} x ${(pn.find((p) => p[0] === 'side') || pn[0])[1]} x ${spec.height} mm`;
  return { x: x0, right: netR, top, bottom, k, name: spec.name, dims, tail: kind === 'bag' || kind === 'satchel' ? ' flat' : '', note: spec.note, y0, y1 };
}
// a satchel's own parts, in words (the die has them whether or not the brand says so)
const PARTS = { satchel: 'Peel strip in the flap, weld seam along the foot.' };
// one caption under or beside a net: name, then the size with the scale it is drawn at (values in mono), then the parts and note
function netCaption(P, n, x, y, w, kind, ratio) {
  const gi = P.R.groundText;
  P.text(x, y, w, 20, 'cap', esc(n.name), `color:${gi.ink}`);
  P.text(x, y + 20, w, 20, 'cap', `${mixed(n.dims)}${esc(n.tail)}, drawn at <span class="m">${esc(ratio)}</span>`, `color:${gi.quiet}`);
  let yy = y + 40;
  const extra = [PARTS[kind], n.note].filter(Boolean).join(' ');
  if (extra) { const r = wrap(P.ctx, 'chrome', 400, extra, 14, w); P.text(x, yy, w, r.length * 20, 'cap', r.map(esc).join('<br>'), `color:${gi.quiet}`); yy += r.length * 20; }
  return yy;
}

export const guidelines = {
  cover(ctx) {
    const P = new Pg(ctx, 'cover'), { R, K, B } = P, hex = R.front.hex, tx = R.textOn(hex);
    P.cells = [0, 1];
    panel(P, 'front', hex, { valve: true });
    if (K.place) P.text(284, P.y0 + 168, 400, 20, 'b-small', esc(K.place), `color:${tx.quiet}`);
    const lw = 640, lh = lw / ctx.logo.geo.aspect;
    P.text(284, 776 - lh, lw, lh, '', ctx.logo.html('colour', { width: lw, colourway: R.colourwayOn(hex), color: tx.ink }));
    P.text(284, 800, 400, 24, 'b-body', 'Brand guidelines', `color:${tx.ink}`);
    P.text(284, 824, 400, 24, 'b-body', esc(ctx.versionLine), `color:${tx.quiet}`);
    return P.html(hex);
  },
  personality(ctx) {
    const P = new Pg(ctx, 'personality'), { R, B, K } = P, hex = R.back.hex, tx = R.textOn(hex), W = ctx.weights;
    panel(P, 'back', hex);
    // the primary line: one sentence a line, stepped down until the widest line fits 676 and there are at most two lines
    const sents = sentences(B.lines.primary); let size = 80, ls = sents;
    for (const s of [80, 72, 64, 56]) {
      size = s; ls = sents.flatMap((t) => (measure(ctx, 'display', W.heading, t, s, -0.005) > 676 ? wrap(ctx, 'display', W.heading, t, s, 676, -0.005) : [t]));
      if (ls.length <= 2) break;
    }
    const lh = Math.round(size * 0.92), top = P.y0 + 104;
    P.text(40, top, 676, lh * ls.length, 'disp', ls.map(esc).join('<br>'), `font-size:${size}px;line-height:${lh}px;letter-spacing:-.005em;color:${tx.ink}`);
    const second = (B.lines.others || [])[0];
    if (second) P.text(40, top + lh * ls.length + 24, 600, 24, 'b-body', esc(second), `color:${tx.quiet}`);
    // three traits as rows, not columns: the name on the left, what it means on the right, cut to whole sentences so nothing ends mid-thought
    const tr = (B.personality || []).slice(0, 3).map((t) => {
      let ss = sentences(t.means), rows;
      for (;;) { rows = wrap(ctx, 'body', W.regular, ss.join(' '), 14, 500); if (rows.length <= 3 || ss.length === 1) break; ss = ss.slice(0, -1); }
      return { t, rows };
    });
    let ty = P.y1 - 64 - tr.reduce((s, r) => s + Math.max(24, r.rows.length * 20) + 24, -24);
    tr.forEach(({ t, rows }) => {
      P.text(40, ty, ctx.placeholders ? 220 : 124, 24, 'b-body b-med', esc(t.trait), `color:${tx.ink}`);
      P.text(ctx.placeholders ? 276 : 180, ty + 2, ctx.placeholders ? 440 : 536, rows.length * 20, 'b-small', rows.map(esc).join('<br>'), `color:${tx.ink}`);
      ty += Math.max(24, rows.length * 20) + 24;
    });
    const gn = wrap(ctx, 'chrome', 400, K.groundNote, 14, 188);
    P.text(796, top, 188, gn.length * 20, 'cap', gn.map(esc).join('<br>'), `color:${R.groundText.quiet}`);
    return P.html(hex);
  },
  palette(ctx) {
    const P = new Pg(ctx, 'palette'), { R, K, B, kind } = P, W = ctx.weights, gi = R.groundText;
    [P.y0, P.y1] = { bag: [216, 840], satchel: [264, 792], box: [232, 792] }[kind];
    const { y0, y1 } = P, ord = R.order, sx = kind === 'box' ? 72 : 56, ws = allocate(ord.map((c) => c.share), 1040 - sx, 48);
    const iw = kind === 'bag' ? 504 : 620;
    const il = wrap(ctx, 'body', W.regular, `Colour by share. Each panel of the ${K.noun} is as wide as that colour’s share of a ${B.name} page, so the net you see is the palette at its true proportion.`, 15, iw);
    P.text(40, 96, iw, il.length * 24, 'b-body', il.map(esc).join('<br>'), `color:${gi.ink};line-height:24px`);
    const out = [], first = ord[0], fcol = R.lineOn(first.hex);
    // the leading strip: bag fin or satchel weld strip (16, first panel's colour) or the box's glue flap (trapezoid, unprinted board)
    if (kind === 'box') {
      out.push(pathLine('cut', `M${sx} ${y0}L40 ${y0 + 24}V${y1 - 24}L${sx} ${y1}`, P.gcol));
    } else {
      P.field(40, y0, 16, y1 - y0, first.hex);
      out.push(L('cut', 40.75, y0, 40.75, y1, fcol), L('cut', 40, y0 + 0.75, 56, y0 + 0.75, fcol), L('cut', 40, y1 - 0.75, 56, y1 - 0.75, fcol));
      out.push(kind === 'bag' ? L('seal', 40, y0 + 44, 56, y0 + 44, fcol) + L('fold', 40, y1 - 40, 56, y1 - 40, fcol) : L('seal', 40, y1 - 16, 56, y1 - 16, fcol));
    }
    if (kind === 'satchel') satchelFlap(R, 40, 1040, y0, R.front.hex, 'cut', 'cut', out);
    const below = []; let x = sx;
    ord.forEach((c, i) => {
      const w = ws[i], tx = R.textOn(c.hex), role = c.hex === R.front.hex ? 'front' : c.hex === R.back.hex ? 'back' : c.hex === R.side.hex ? 'side' : 'flap';
      P.field(x, y0, w, y1 - y0, c.hex);
      closure(R, kind, { x0: x, x1: x + w, y0, y1, hex: c.hex, l: 'fold', r: i === ord.length - 1 ? (kind === 'satchel' ? 'bleed' : 'cut') : 'none', role, valve: c.hex === R.front.hex }, out);
      if (kind === 'bag' && i === ord.length - 1) out.push(pathLine('cut', `M${1040 - 0} ${y0 + 50}L1030 ${y0 + 56}L1040 ${y0 + 62}`, fcol, { fill: R.ground.hex }));
      const pct = `${Math.round(c.share * 100)}%`;
      if (w >= 160) {
        P.text(x + 16, y0 + 76, w - 32, 20, 'b-small b-med', esc(c.name), `color:${tx.ink}`);
        P.text(x + 16, y0 + 96, w - 32, 16, 'm', esc(c.hex), `color:${tx.ink}`);
        P.text(x + 16, y0 + 112, w - 32, 20, 'b-small', pct, `color:${tx.ink}`);
        let ss = sentences(c.lands || ''), rows;
        for (;;) { rows = wrap(ctx, 'body', W.regular, ss.join(' '), 14, w - 32); if (rows.length <= 6 || ss.length === 1) break; ss = ss.slice(0, -1); }
        if (c.lands) P.text(x + 16, y1 - 200, w - 32, rows.length * 20, 'b-small', rows.map(esc).join('<br>'), `color:${tx.ink}`);
      } else below.push({ c, pct, x, w });
      x += w;
    });
    // a bag's tear notch on the fin side too
    if (kind === 'bag') out.push(pathLine('cut', `M40 ${y0 + 50}L50 ${y0 + 56}L40 ${y0 + 62}`, fcol, { fill: R.ground.hex }));
    P.line(...out);
    // panels too narrow for their own values: a swatch chip, the name and a tick up to the panel, in rows under the net.
    // A row sits at its panel's x where it fits; otherwise it hangs left of its tick. Rows run left to right, top to bottom, so no tick crosses a row.
    const cb = kind === 'box' ? Math.min(y1 + 88, 996) : y1; let by = Math.max(840, cb + 28);
    const sv = [];
    below.forEach((n, j) => {
      const { c, pct } = n, cx = n.x + n.w / 2, lim = j + 1 < below.length ? below[j + 1].x + below[j + 1].w / 2 - 14 : 1040;
      const hw = measure(ctx, 'body', W.regular, `${c.name}  ${c.hex}  ${pct}`, 14) + 8, own = lim - n.x - 20 >= Math.max(hw, 150);
      const wmax = own ? Math.min(300, lim - n.x - 20) : 280;
      let ss = sentences(c.lands || ''), rows;
      for (;;) { rows = wrap(ctx, 'body', W.regular, ss.join(' '), 14, wmax); if (rows.length <= 3 || ss.length <= 1) break; ss = ss.slice(0, -1); }
      const bw = Math.ceil(Math.max(hw, ...rows.map((r) => measure(ctx, 'body', W.regular, r, 14)))) + 2;
      const tx0 = own ? n.x + 20 : cx - 14 - bw, chx = tx0 - 20;
      P.field(chx, by + 4, 12, 12, c.hex);
      sv.push(`<rect x="${chx + 0.5}" y="${by + 4.5}" width="11" height="11" fill="none" stroke="${gi.quiet}" stroke-width="1"/>`);
      sv.push(own ? L('cut', chx + 6, cb, chx + 6, by + 4, gi.ink, 1) : pathLine('cut', `M${r2(cx)} ${cb}V${by - 8}H${r2(chx + 6)}V${by + 4}`, gi.ink, { w: 1 }));
      P.text(tx0, by, bw + 8, 20, 'b-small', `<span class="b-med" style="color:${gi.ink}">${esc(c.name)}</span>&nbsp; <span class="m" style="color:${gi.quiet}">${esc(c.hex)}</span>&nbsp; <span style="color:${gi.ink}">${pct}</span>`);
      if (rows.length && c.lands) P.text(tx0, by + 20, bw + 8, rows.length * 20, 'b-small', rows.map(esc).join('<br>'), `color:${gi.ink}`);
      by += 20 + rows.length * 20 + 20;
    });
    P.line(...sv);
    return P.html('all');
  },
  typefaces(ctx) {
    const P = new Pg(ctx, 'typefaces'), { R, K, B } = P, W = ctx.weights, hex = R.side.hex, tx = R.textOn(hex), gi = R.groundText;
    const WN = { 300: 'Light', 400: 'Regular', 500: 'Medium', 600: 'SemiBold', 700: 'Bold', 800: 'ExtraBold', 900: 'Black' }, wn = (w) => `${WN[w] || w} ${w}`;
    const d = B.fonts.display, b = B.fonts.body, m = B.fonts.mono, mono = m ? m.family : 'Spline Sans Mono', mw = m ? m.weights[0] : 400;
    panel(P, 'side', hex);
    const label = (y, a, q) => { P.text(40, y, 560, 20, 'cap', esc(a), `color:${gi.ink}`); P.text(40, y + 20, 560, 20, 'cap', esc(q), `color:${gi.quiet}`); };
    label(96, `Display: ${d.family}, ${wn(W.heading)}.`, `${K.type.display} SIL Open Font Licence.`);
    // the giant: the last word of the primary line, stepped down until it fits 560
    const word = (sentences(B.lines.primary).pop().match(/[\p{L}\p{N}'’-]+/gu) || [B.name]).pop(), giant = ctx.placeholders ? 'Aa' : word[0].toUpperCase() + word.slice(1);
    let gs = 200; for (const s of [200, 160, 128, 96]) { gs = s; if (measure(ctx, 'display', W.heading, giant, s, -0.01) <= 560) break; }
    const gl = Math.round(gs * 0.86);
    P.text(40, 372 - gl, 560, gl, 'disp', esc(giant), `font-size:${gs}px;line-height:${gl}px;letter-spacing:-.01em;color:${gi.ink}`);
    // character set, three lines
    const cs = ['ABCDEFGHIJKLM', 'NOPQRSTUVWXYZ', K.type.charset]; let cz = 40;
    while (cz > 24 && Math.max(...cs.map((s) => measure(ctx, 'display', W.heading, s, cz))) > 560) cz -= 4;
    P.text(40, 420, 560, Math.round(cz * 1.1) * 3, 'disp', cs.map(esc).join('<br>'), `font-size:${cz}px;line-height:${Math.round(cz * 1.1)}px;color:${gi.ink}`);
    label(600, `Body: ${b.family}, ${b.weights.filter((w) => w <= 600).map(wn).join(', ')}.`, K.type.body);
    b.weights.filter((w) => w <= 600).slice(0, 3).forEach((w, i) => P.text(40, 652 + i * 40, 560, 40, '', wn(w), `font-family:var(--body);font-weight:${w};font-size:32px;line-height:40px;color:${gi.ink}`));
    label(812, `Values: ${mono}, ${wn(mw)}.`, K.type.mono);
    // the side panel carries the gusset copy and one line in the brand's mono
    const gy = P.y0 + 100;
    P.text(680, gy, 200, 20, 'b-small b-med', esc(b.family), `color:${tx.ink}`);
    const gr = wrap(ctx, 'body', W.regular, K.gusset, 14, 200);
    P.text(680, gy + 20, 200, gr.length * 20, 'b-small', gr.map(esc).join('<br>'), `color:${tx.mid}`);
    if (K.monoSample) P.text(680, P.y1 - 112, 200, 16, 'mono', esc(K.monoSample), `color:${tx.quiet}`);
    return P.html(hex);
  },
  signage(ctx) {
    const P = new Pg(ctx, 'signage'), { R, K } = P, gi = R.groundText, S = K.signage, flat = K.kind === 'satchel';
    P.y0 = 96;
    let heroVal = mixed(S.heroVal), heroFoot = 912;
    const wideSign = !flat && ctx.sceneInfo(S.secondScene).quads[0].aspect > 2;
    if (flat) {
      // no satchel scene exists, so the satchel is drawn flat from the cover net: front, flap with its peel strip, weld seam along the foot.
      // The flap is the front colour and the lockup sits 40 px in, as on the cover; the brand line is set large above the name, and the scale prints as a ratio
      const spec0 = K.nets.find((n) => n.kind === 'satchel'), fm = spec0.panels.find((p) => p[2] === 'front')[1], { k, label } = scaleFor(1.55);
      const spec = { ...spec0, name: '', panels: [['front', fm, 'front']], flapHex: R.front.hex, peel: 'Peel, fold, press.',
        art: { pad: 40, logoMm: Math.round(fm * 0.78), head: sentences(P.B.lines.primary), headMax: 56, headWhole: true, title: K.product.name, titleMm: 22, note: K.product.note } };
      const nx = 150, ny = 112, n = drawNet(P, spec, nx, ny, k), dc = gi.ink, dim = [];
      // dimension lines, the way a die drawing carries them: the width under the foot, the body height beside the left edge
      const yb = n.bottom + 24, xd = nx - 28, tick = (x, y, v) => (v ? L('cut', x, y - 5, x, y + 5, dc, 1) : L('cut', x - 5, y, x + 5, y, dc, 1));
      dim.push(L('cut', nx, yb, nx + fm * k / 2 - 36, yb, dc, 1), L('cut', nx + fm * k / 2 + 36, yb, nx + fm * k, yb, dc, 1), tick(nx, yb, true), tick(nx + fm * k, yb, true));
      dim.push(L('cut', xd, n.y0, xd, n.y1, dc, 1), tick(xd, n.y0, false), tick(xd, n.y1, false));
      P.line(...dim);
      P.text(nx + fm * k / 2 - 36, yb - 8, 72, 16, 'cap', mixed(`${fm} mm`), `text-align:center;color:${gi.ink}`);
      P.text(40, (n.y0 + n.y1) / 2 - 8, xd - 8 - 40, 16, 'cap', mixed(`${spec.height} mm`), `text-align:right;color:${gi.ink}`);
      heroVal = `${mixed(S.heroVal)}, drawn at <span class="m">${label}</span>`; heroFoot = n.y1;
    } else {
      // hero: the pack's front on a real surface, cropped so the surface fills most of the box. Art is rendered at twice the surface's own size so the type stays sharp
      // a bag stands on the roastery shelf (library: counter-pouch-shelf); beside a wide sign the bag's panel narrows to a tall crop and the sign gets the room
      const heroScene = K.kind === 'bag' ? 'counter-pouch-shelf' : 'counter-bag-handover', pouch = heroScene === 'counter-pouch-shelf', hw = wideSign ? 440 : 700;
      const hero = ctx.mockup(heroScene, [bagArt(ctx, P, heroScene, pouch ? 520 : 1008)]);
      photo(P, 0, 96, hw, 816, hero, crop(ctx, heroScene, hw, 816, pouch ? (wideSign ? 0.62 : 0.66) : 0.78), `${K.name}, front panel, photographed`);
      P.line(L('fold', hw + 1.25, 96, hw + 1.25, 912, P.gcol), L('cut', hw, 96.75, 1060, 96.75, P.gcol, 1), L('cut', hw, 911.25, 1060, 911.25, P.gcol, 1), L('fold', 1059.25, 96, 1059.25, 912, P.gcol, 1));
    }
    // second surface: shopfront fascia or poster, whichever the brand names
    const sc = S.secondScene, sInfo = ctx.sceneInfo(sc), wide = sInfo.quads[0].aspect > 2;
    const cw = flat ? 300 : wide ? 600 : 320, fh = wide ? 520 : 320;   // the column: 300 wide beside the flat satchel, 320 beside the photographed bag
    // the fascia is cropped to a 320 square around the sign, so it reads larger; the sign's own art is laid out inside the part the crop shows
    let fc = null, vis = null;
    if (wide) {
      const q = sInfo.quads[0].corners, qx = q.map((p) => p[0]), x0 = Math.min(...qx), x1 = Math.max(...qx), k = Math.max(cw / sInfo.w, fh / sInfo.h), aw = 1376 / (x1 - x0);
      const left = Math.min(0, Math.max(cw - sInfo.w * k, cw / 2 - (x0 + x1) / 2 * k));
      fc = { w: sInfo.w * k, h: sInfo.h * k, left, top: 0 }; vis = [Math.max(0, (-left / k - x0) * aw), Math.min(1376, ((cw - left) / k - x0) * aw)];
    }
    const art = wide ? fasciaArt(ctx, P, sc, 1376, vis) : posterArt(ctx, P, sc, 520);
    // the column: 300 wide beside the flat satchel, 320 in the dashed frame beside the photographed bag (where the fascia is enlarged and cropped to the sign, so the empty shop recedes)
    const cx = flat ? 740 : wide ? 460 : 720;
    const cap = (y, a, q) => { const r = wrap(ctx, 'chrome', 400, a, 14, cw); P.text(cx, y, cw, r.length * 20, 'cap', r.map(esc).join('<br>'), `color:${gi.ink}`); if (q) P.text(cx, y + r.length * 20, cw, 20, 'cap', q, `color:${gi.quiet}`); return r.length * 20 + (q ? 20 : 0); };
    // beside a flat-drawn hero the column fills the satchel's height: the hero's caption at the flap's top, then the poster, its caption ending on the hero's foot
    const hcap = wrap(ctx, 'chrome', 400, S.hero, 14, cw).length * 20 + 20, scap = wrap(ctx, 'chrome', 400, S.second, 14, cw).length * 20 + 20;
    const py = flat ? 112 + hcap + 40 : wide ? 96 + Math.round((816 - (fh + 16 + scap + 40 + hcap)) / 2) : 168, bh = flat ? heroFoot - scap - 16 - py : wide ? fh : 400;
    let c;
    if (wide) c = fc;
    else c = crop(ctx, sc, cw, bh, flat ? 0.66 : 0);
    photo(P, cx, py, cw, bh, ctx.mockup(sc, [art]), c, S.second || sc, 'outline:1px solid oklch(0 0 0 / .1);outline-offset:-1px');
    const sh = cap(py + bh + 16, S.second, mixed(S.secondVal));
    // beside the photographed bag the bag's caption follows the fascia's, so the column reads top to bottom
    cap(flat ? 112 : py + bh + 16 + sh + 40, S.hero, heroVal);
    return P.html('all');
  },
  layouts(ctx) {
    const P = new Pg(ctx, 'layouts'), { R, K } = P, gi = R.groundText, W = ctx.weights, fl = R.flap.hex, ft = R.textOn(fl), fc = R.lineOn(fl);
    const ir = wrap(ctx, 'body', W.regular, K.layouts.intro, 15, 600);
    P.text(40, 96, 600, ir.length * 24, 'b-body', ir.map(esc).join('<br>'), `color:${gi.ink};line-height:24px`);
    // nets A and B at one scale, standing on one line; the captions share a baseline and print the scale
    // all three nets share one scale, printed as a ratio: the largest that fits the width (A and B side by side) and the height (A or B, captions, then C), rounded to a half step of the ratio
    const [A, Bn, C] = K.nets, mA = netMm(A), mB = netMm(Bn), mC = netMm(C), capH = A.kind === 'satchel' ? 60 : 40;
    const { k, label } = scaleFor(Math.min(952 / (mA.w + mB.w), 740 / mC.w, (808 - 176 - 16 - capH - 24) / (Math.max(mA.h, mB.h) + mC.h))), base = 176 + Math.max(mA.h, mB.h) * k;
    const bx = 1040 - mB.w * k;
    const nA = drawNet(P, A, 40, base - mA.h * k, k), nB = drawNet(P, Bn, bx, base - mB.h * k, k);
    const cy = base + 16, yA = netCaption(P, nA, nA.x, cy, Math.min(bx - 40 - 24, 440), A.kind, label), yB = netCaption(P, nB, nB.x, cy, 440, Bn.kind, label);
    // net C below, at the same scale
    const cTop = Math.max(yA, yB) + 24, nC = drawNet(P, C, 40, cTop, k);
    netCaption(P, nC, nC.right + 32, cTop + (nC.bottom - cTop) / 2 - 40, 1040 - nC.right - 32, C.kind, label);
    // the page's own panel: the base, in the flap colour, folded at its top edge. One rule leads, two follow.
    P.field(40, 824, 1000, 88, fl);
    P.line(L('fold', 40, 824.75, 1040, 824.75, fc), L('cut', 40, 911.25, 1040, 911.25, fc), L('cut', 40.75, 824, 40.75, 912, fc), L('cut', 1039.25, 824, 1039.25, 912, fc));
    const rs = (K.layouts.rules || []).slice(0, 3);
    if (rs[0]) { const r = wrap(ctx, 'body', W.regular, rs[0], 18, 380); P.text(80, 824 + (88 - r.length * 24) / 2, 380, r.length * 24, 'b-body', r.map(esc).join('<br>'), `font-size:18px;line-height:24px;color:${ft.ink}`); }
    let ry = 0; const rr = rs.slice(1).map((t) => wrap(ctx, 'body', W.regular, t, 14, 480)), th = rr.reduce((s, r) => s + r.length * 20, 0) + 4 * (rr.length - 1);
    ry = 824 + (88 - th) / 2;
    rr.forEach((r) => { P.text(520, ry, 480, r.length * 20, 'b-small', r.map(esc).join('<br>'), `color:${ft.ink}`); ry += r.length * 20 + 4; });
    return P.html(fl);
  },
};
