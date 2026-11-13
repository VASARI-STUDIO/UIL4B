// Theme 32, Dieline, lane g5: the application pages (business card, social, email signature, digital). Signage is the gate page in guidelines.js.
// Each page lays the flat artwork out as panels of a net, in the die's own line language (cuts solid, folds dashed), and photographs the same art
// in a real scene as the proof: the card at the till, the signature on a laptop, the screen on the till's tablet. Social has no scene in the library,
// so its three posts stand flat as one stepped net. Brand copy is printed whole through esc(); measured sizes only cap the box it sits in.
import { phTight } from './ph.js';
import { roles, pack, allocate, measure, wrap, L, pathLine, ghost, PXMM, r2, esc } from './geom.js';
import { kitCopy } from './lane-u1.js';
import { colourMap } from '../../engine/tokens.js';

const px = (n) => `${r2(n)}px`;
const lc = (h) => String(h).toLowerCase();
// a caption with only its values in mono (numbers with units, hex codes, ratios); the words around them stay in the chrome face
const VALRE = /#[0-9A-Fa-f]{3,8}\b|\d+(?:[.,:]\d+)*(?:\s?x\s?\d+(?:[.,]\d+)*)*(?:\s?(?:mm|px|%)(?![a-z]))?/g;
const mixed = (s) => { s = String(s ?? ''); let o = '', i = 0; for (const m of s.matchAll(VALRE)) { o += esc(s.slice(i, m.index)) + `<span class="m">${esc(m[0])}</span>`; i = m.index + m[0].length; } return o + esc(s.slice(i)); };

// ---- a page: fields, die lines (one svg), text, chrome. The frame of the gate pages (guidelines.js), copied: that file exports only its pages ----
class Pg {
  constructor(ctx, id) {
    this.ctx = ctx; this.id = id; this.R = roles(ctx); this.K = pack(ctx); this.B = ctx.brand;
    this.f = []; this.l = []; this.t = []; this.g = []; this.boxes = [];
    this.kind = this.K.kind; this.gcol = this.R.ghost;
  }
  field(x, y, w, h, hex) { this.f.push(`<div class="fd" style="left:${px(x)};top:${px(y)};width:${px(w)};height:${px(h)};background:${hex}"></div>`); }
  line(...s) { this.l.push(...s); }
  text(x, y, w, h, cls, html, style = '') {
    this.boxes.push({ x, y, w, h });
    this.t.push(`<div class="tx ${cls}" style="left:${px(x)};top:${px(y)};width:${px(w)};height:${px(h)};${style}">${html}</div>`);
  }
  raw(html) { this.t.push(html); }
  gh(kind, axis, at, a, b) { this.g.push({ kind, axis, at, a, b }); }
  html(hl) {
    const { ctx, R, id } = this, ink = R.groundText.ink, p = ctx.pages.find((x) => x.id === id) || {};
    const heads = [[40, this.B.name], [244, 'Brand guidelines'], [550, p.section ? p.section.title : ''], [856, p.title || '']];
    let out = heads.filter((h) => h[1]).map(([x, s]) => `<div class="hd" style="left:${x}px">${esc(s)}</div>`).join('');
    out += `<div class="fo">${String(ctx.pageNo(id)).padStart(3, '0')}</div>`;
    // locator net: the palette in miniature, panels by share; the colour this page is about gets the ink outline
    const ws = allocate(R.order.map((c) => c.share), 240, 6); let x = 40, rects = '', hit = hl === 'all' ? [40, 240] : null;
    R.order.forEach((c, i) => {
      this.field(x, 1016, ws[i], 20, c.hex);
      if (R.isGround(c.hex)) rects += `<rect x="${x + 0.5}" y="1016.5" width="${ws[i] - 1}" height="19" fill="none" stroke="${this.gcol}" stroke-width="1"/>`;
      if (hl && hl !== 'all' && !hit && lc(c.hex) === lc(hl)) hit = [x, ws[i]];
      x += ws[i];
    });
    if (hit) rects += `<rect x="${hit[0] - 2}" y="1014" width="${hit[1] + 4}" height="24" fill="none" stroke="${ink}" stroke-width="1.5"/>`;
    const gl = this.g.map((g) => ghost(g.kind, g.axis, g.at, g.a, g.b, this.boxes, this.gcol)).join('');
    return `<section class="pg${this.kind === 'satchel' ? ' sat' : ''}${phTight(this.ctx, this.id)}" data-page="${id}" style="isolation:isolate">${this.f.join('')}<svg class="ln" viewBox="0 0 1080 1080" xmlns="http://www.w3.org/2000/svg">${gl}${this.l.join('')}${rects}</svg>${this.t.join('')}${out}</section>`;
  }
}

// ---- where a piece of art is drawn: on the page at an offset (each line goes to the checker), or into an art document for a photograph ----
const onPage = (P, ox, oy) => ({ text: (x, y, w, h, cls, html, st) => P.text(ox + x, oy + y, w, h, cls, html, st), field: (x, y, w, h, hex) => P.field(ox + x, oy + y, w, h, hex) });
function onArt() {
  const o = [];
  return {
    o,
    text: (x, y, w, h, cls, html, st = '') => o.push(`<div class="tx ${cls}" style="left:${px(x)};top:${px(y)};width:${px(w)};height:${px(h)};${st}">${html}</div>`),
    field: (x, y, w, h, hex) => o.push(`<div class="fd" style="left:${px(x)};top:${px(y)};width:${px(w)};height:${px(h)};background:${hex}"></div>`),
  };
}
const shift = (E, dx, dy) => ({ text: (x, y, ...r) => E.text(x + dx, y + dy, ...r), field: (x, y, ...r) => E.field(x + dx, y + dy, ...r) });
const artDoc = (ctx, w, h, E, bg) => ({ w, h, html: ctx.artPage(`<div style="position:relative;width:${w}px;height:${h}px;overflow:hidden;background:${bg}">${E.o.join('')}</div>`, { w, h }) });

// ---- type: brand copy printed whole, in a box as tall as the measured lines (the measure is a cap: a placeholder fits the same box) ----
function fitDisp(ctx, s, w, sizes, maxL) {
  const W = ctx.weights.heading;
  for (const z of sizes) { const r = wrap(ctx, 'display', W, s, z, w); if (r.length <= maxL && r.every((t) => measure(ctx, 'display', W, t, z) <= w)) return { z, n: r.length }; }
  const z = sizes[sizes.length - 1]; return { z, n: wrap(ctx, 'display', W, s, z, w).length };
}
// display copy anchored by its top (dir 1) or its foot (dir -1); returns the height
function disp(E, ctx, x, y, w, s, sizes, maxL, color, dir = 1) {
  const { z, n } = fitDisp(ctx, s, w - 2, sizes, maxL), lh = Math.round(z * 0.92 * 100) / 100, h = n * lh;
  E.text(x, dir > 0 ? y : y - h, w, h, 'disp wrap', esc(s), `font-size:${px(z)};line-height:${px(lh)};letter-spacing:-.005em;color:${color}`);
  return h;
}
// body copy, wrapped; returns the height
function body(E, ctx, x, y, w, s, size, lh, color, weight) {
  const W = ctx.weights, wt = weight || W.regular, n = wrap(ctx, 'body', wt, String(s), size, w - 2).length;
  E.text(x, y, w, n * lh, `b-body wrap${wt === W.medium ? ' b-med' : ''}`, esc(s), `font-size:${px(size)};line-height:${px(lh)};font-weight:${wt};color:${color}`);
  return n * lh;
}
// chrome captions on the page, wrapped at the real glyph widths; values in mono
function cap(P, x, y, w, s, color) {
  const r = wrap(P.ctx, 'chrome', 400, s, 14, w);
  P.text(x, y, w, r.length * 20, 'cap', r.map(mixed).join('<br>'), `color:${color}`);
  return r.length * 20;
}
const logoBox = (ctx, R, id, hex, w) => { const g = ctx.logo.geos[id] || ctx.logo.geos.colour, h = w * g.h / g.w; return { w, h, html: ctx.logo.html(id, { width: r2(w), colourway: R.colourwayOn(hex), color: R.textOn(hex).ink }) }; };
const wide = (ctx) => (ctx.logo.geos.horizontal ? 'horizontal' : 'colour');

// ---- a photograph cropped in CSS: box bw x bh, scaled by k round a point of the scene, clamped so the box never shows past the photo ----
function cropAt(ctx, id, bw, bh, cx, cy, k0) {
  const sc = ctx.sceneInfo(id), k = Math.max(k0, bw / sc.w, bh / sc.h), cl = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
  return { w: sc.w * k, h: sc.h * k, left: cl(bw / 2 - cx * k, bw - sc.w * k, 0), top: cl(bh / 2 - cy * k, bh - sc.h * k, 0) };
}
const quadMid = (ctx, id, qs) => { const ps = qs.flatMap((i) => ctx.sceneInfo(id).quads[i].corners), xs = ps.map((p) => p[0]), ys = ps.map((p) => p[1]); return [(Math.min(...xs) + Math.max(...xs)) / 2, (Math.min(...ys) + Math.max(...ys)) / 2]; };
const photo = (P, x, y, bw, bh, url, c, alt) => {
  P.boxes.push({ x, y, w: bw, h: bh });
  P.raw(`<div class="ph" style="left:${x}px;top:${y}px;width:${bw}px;height:${bh}px;outline:1px solid oklch(0 0 0 / .1);outline-offset:-1px"><svg role="img" aria-label="${esc(alt)}" style="left:${r2(c.left)}px;top:${r2(c.top)}px;width:${r2(c.w)}px;height:${r2(c.h)}px"><image href="${esc(url)}" width="100%" height="100%" preserveAspectRatio="none"/></svg></div>`);
};
const artFor = (ctx, id, i, w) => [w, Math.round(w / ctx.sceneInfo(id).quads[i].aspect)];

// a flap hinged on a vertical fold at xh, `depth` out to the right (dir 1) or left (dir -1), rounded at its outer corners (from lane-g3)
function tuckSide(xh, a, b, depth, dir) {
  const xe = xh + dir * depth, sw = dir > 0 ? 1 : 0, r = Math.min(32, (b - a) / 2);
  return `M${xh} ${a}H${r2(xe - dir * r)}A${r2(r)} ${r2(r)} 0 0 ${sw} ${xe} ${r2(a + r)}V${r2(b - r)}A${r2(r)} ${r2(r)} 0 0 ${sw} ${r2(xe - dir * r)} ${b}H${xh}`;
}
// a dimension line, the way a die drawing carries one: ticks at both ends, the value in a gap in the middle
function dim(P, axis, at, a, b, label, col) {
  const m = (a + b) / 2, g = 36, t = (v) => (axis === 'h' ? L('cut', v, at - 5, v, at + 5, col, 1) : L('cut', at - 5, v, at + 5, v, col, 1));
  if (axis === 'h') {
    P.line(L('cut', a, at, m - g, at, col, 1), L('cut', m + g, at, b, at, col, 1), t(a), t(b));
    P.text(m - g, at - 8, 2 * g, 16, 'cap', mixed(label), `text-align:center;line-height:16px;color:${col}`);
  } else {
    P.line(L('cut', at, a, at, b, col, 1), t(a), t(b));
  }
}

// ---- the card, 90 x 55 mm. Front: the colour of the pack's front with the logo and the line. Back: the person, on the back panel's colour ----
const CARD = [90, 55];
function cardFront(ctx, R, E, w, h) {
  const B = ctx.brand, hex = R.front.hex, tx = R.textOn(hex), u = w / 900, m = 64 * u;
  E.field(0, 0, w, h, hex);
  let lg = logoBox(ctx, R, 'colour', hex, 340 * u); if (lg.h > 150 * u) lg = logoBox(ctx, R, 'colour', hex, 340 * u * 150 * u / lg.h);
  E.text(m, m, lg.w, lg.h, '', lg.html);
  disp(E, ctx, m, h - m, w - 2 * m, B.lines.primary, [56, 52, 48, 44, 40].map((s) => s * u), 2, tx.ink, -1);
}
function cardBack(ctx, R, E, w, h) {
  const B = ctx.brand, A = B.applications || {}, c = A.card || {}, hex = R.back.hex, tx = R.textOn(hex), u = w / 900, m = 64 * u, W = ctx.weights, iw = w - 2 * m;
  E.field(0, 0, w, h, hex);
  let y = m;
  if (c.person) y += body(E, ctx, m, y, iw, c.person, 42 * u, 52 * u, tx.ink, W.medium);
  if (c.role) body(E, ctx, m, y, iw, c.role, 34 * u, 46 * u, tx.quiet);
  const foot = [c.contact, A.site && A.site.url].filter(Boolean);
  let fy = h - m - foot.length * 46 * u;
  for (const s of foot) fy += body(E, ctx, m, fy, iw, s, 34 * u, 46 * u, tx.ink);
}

// ---- the posts: square, portrait, story. Each is one colour of the pack, with one of the brand's social lines ----
const POSTS = [['Square', 1080, 1080, 'front'], ['Portrait', 1080, 1350, 'back'], ['Story', 1080, 1920, 'side']];
function post(ctx, R, E, i, w, h) {
  const B = ctx.brand, A = B.applications || {}, lines = A.social || [B.lines.primary], s = lines[i % lines.length], role = POSTS[i][3], hex = R[role].hex, tx = R.textOn(hex), u = w / 1080, m = 80 * u;
  const url = A.site && A.site.url, iw = w - 2 * m;
  E.field(0, 0, w, h, hex);
  if (i === 0) {
    // the sign-off post: the logo at the head, the line standing on the foot
    const lg = logoBox(ctx, R, 'colour', hex, 400 * u); E.text(m, m, lg.w, lg.h, '', lg.html);
    disp(E, ctx, m, h - m, iw, s, [136, 120, 104, 88, 72].map((v) => v * u), 3, tx.ink, -1);
  } else if (i === 1) {
    // the line fills the head of the frame; the wide logo and the address sit on the foot
    disp(E, ctx, m, m, iw, s, [152, 136, 120, 104, 88].map((v) => v * u), 4, tx.ink, 1);
    const lg = logoBox(ctx, R, wide(ctx), hex, Math.min(440 * u, iw)); E.text(m, h - m - lg.h, lg.w, lg.h, '', lg.html);
    if (url) body(E, ctx, m, h - m - lg.h - 32 * u - 56 * u, iw, url, 40 * u, 56 * u, tx.ink);
  } else {
    // the story keeps 250 px clear at its head and foot, where the app draws over it
    const safe = 250 * u;
    const lg = logoBox(ctx, R, 'colour', hex, 400 * u); E.text(m, safe, lg.w, lg.h, '', lg.html);
    const foot = h - safe;
    let y = foot;
    if (url) { y -= 56 * u; body(E, ctx, m, y, iw, url, 40 * u, 56 * u, tx.ink); y -= 48 * u; }
    disp(E, ctx, m, y, iw, s, [176, 160, 144, 128, 112].map((v) => v * u), 4, tx.ink, -1);
  }
}

// ---- the signature, 600 px wide at 1:1: the wide logo, a rule in the front colour, then the person and how to reach them ----
const SIG = { w: 600, h: 140 };
function signature(ctx, R, E) {
  const A = ctx.brand.applications || {}, e = A.email || {}, c = A.card || {}, gi = R.groundText, W = ctx.weights;
  let lg = logoBox(ctx, R, wide(ctx), R.ground.hex, 200); if (lg.h > 40) lg = logoBox(ctx, R, wide(ctx), R.ground.hex, 200 * 40 / lg.h);
  E.text(24, 24, lg.w, lg.h, '', lg.html);
  const rx = 24 + lg.w + 24, tx = rx + 25, tw = SIG.w - tx - 24;
  E.field(rx, 24, 1, SIG.h - 48, R.front.hex);
  let y = 24;
  if (e.person) y += body(E, ctx, tx, y, tw, e.person, 16, 24, gi.ink, W.medium);
  if (e.role) y += body(E, ctx, tx, y, tw, e.role, 14, 20, gi.quiet);
  y += 8;
  const reach = [e.person && c.person === e.person ? c.contact : null, A.site && A.site.url].filter(Boolean);
  for (const s of reach) y += body(E, ctx, tx, y, tw, s, 14, 20, gi.ink);
}
const sigLines = (ctx) => { const A = ctx.brand.applications || {}, e = A.email || {}, c = A.card || {}; return [e.person, e.role, e.person && c.person === e.person ? c.contact : null, A.site && A.site.url].filter(Boolean); };

// the email the signature closes, on a laptop: subject, sender, the brand's own email body, then the signature at 1:1
function mailArt(ctx, R, w, h) {
  const B = ctx.brand, G = (B.guideB && B.guideB.email) || {}, A = B.applications || {}, e = A.email || {}, c = A.card || {}, gi = R.groundText, W = ctx.weights, E = onArt();
  E.field(0, 0, w, h, R.ground.hex);
  const m = 48;
  if (G.subject) body(E, ctx, m, 32, w - 2 * m - 96, G.subject, 24, 32, gi.ink, W.medium);
  if (G.time) E.text(w - m - 96, 36, 96, 24, 'b-body', esc(G.time), `font-size:15px;line-height:24px;text-align:right;color:${gi.quiet}`);
  let y = 84;
  const row = (lab, html) => { E.text(m, y, 56, 24, 'b-body', lab, `font-size:15px;line-height:24px;color:${gi.quiet}`); E.text(m + 56, y, w - 2 * m - 56, 24, 'b-body', html, `font-size:15px;line-height:24px;color:${gi.ink}`); y += 24; };
  if (e.person) row('From', `${esc(e.person)}${c.person === e.person && c.contact ? `&nbsp;&nbsp;<span style="color:${gi.quiet}">${esc(c.contact)}</span>` : ''}`);
  if (G.to) row('To', esc(G.to));
  E.field(m, y + 16, w - 2 * m, 1, R.ghost); y += 40;
  for (const p of G.body || []) y += body(E, ctx, m, y, 600, p, 16, 26, gi.ink) + 12;
  signature(ctx, R, shift(E, m - 24, y + 12));
  return artDoc(ctx, w, h, E, R.ground.hex);
}

// ---- the screen: the UI kit's desktop screen, real components only (the markup of lane-u3.js, copied: that file exports only its pages) ----
function screenCopy(ctx) {
  const cx = Object.create(ctx, { edition: { value: 'showcase' } }), C = ctx.brand.ui.screen.content, X = C.example || {};
  return {
    ...kitCopy(cx), C, title: ctx.brand.ui.screen.title, time: C.time, from: C.from, to: C.to, initials: C.initials, call: C.call, progress: C.progress,
    deliverToLabel: C.deliverToLabel, paidLabel: C.paidLabel, share: C.share, rows: C.deliveries, tabs: X.tabs || [], links: X.links || [],
  };
}
function screen(ctx, R) {
  const ui = ctx.ui, S = screenCopy(ctx), M = colourMap(ctx, 'light'), asp = ctx.logo.geo.aspect, lw = Math.min(132, 28 * asp), p = Math.round((S.progress || 0) * 100);
  const logo = `<span class="u3-logo" style="width:${r2(lw)}px;height:${r2(lw / asp)}px">${ctx.logo.html('colour', { width: lw, colourway: R.colourwayOn(M.surface), color: M.text })}</span>`;
  const rows = `<ul class="ui-list">${S.rows.slice(1, 4).map((d) => ui.row({ lead: ui.icon(d.icon || ctx.brand.ui.rowIcon || 'package', 18), title: d.to, sub: d.when, end: d.price, chip: ui.statusChip(d.status, { label: S.st(d.status) }) })).join('')}</ul>`;
  return `<div class="u3-scr">
<nav class="ui-topbar" aria-label="Main">${logo}<div class="ui-topbar__links">${ui.links(S.links, 0)}</div><span class="ui-num u3-clock">${esc(S.time)}</span></nav>
<div class="u3-main">
<section class="u3-track"><p class="u3-k">${esc(S.title)}</p><div class="u3-eta"><h2 class="ui-display u3-big">${esc(S.eta)}</h2>${ui.statusChip('on-the-way', { label: S.st('on-the-way') })}</div>
<p class="u3-soft">${esc(S.pickup)}</p><div><div class="ui-progress" role="progressbar" aria-label="Progress" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${p}"><div class="ui-progress__bar"><i style="width:${p}%"></i></div><span class="ui-progress__dot" style="left:${p}%"></span></div><div class="u3-route"><span>${esc(S.from)}</span><span>${esc(S.to)}</span></div></div>
<div class="u3-person"><span class="ui-avatar">${esc(S.initials)}</span><div class="u3-pm"><p class="u3-pn">${esc(S.rider)}</p><p class="u3-ps">${esc(S.riderNote)}</p></div>${ui.btn(S.call, { variant: 'secondary', size: 'sm' })}</div>
<dl class="u3-dl"><div><dt>${esc(S.deliverToLabel)}</dt><dd>${esc(S.deliverTo)}</dd></div><div><dt>${esc(S.paidLabel)}</dt><dd class="ui-num">${esc(S.paid)}</dd></div></dl>${ui.btn(S.share, { variant: 'secondary', block: true })}</section>
<section class="u3-side">${ui.tabs(S.tabs, 0)}${rows}<div class="u3-go">${ui.btn(S.form.book, { iconRight: 'arrow-right' })}</div></section>
</div></div>`;
}
const SCR = { w: 1024, h: 768 };

export const guidelines = {
  // ---- business card: the photograph at the till across the head; under it the two faces at 1:1, joined at a fold, dimensioned ----
  'business-card'(ctx) {
    const P = new Pg(ctx, 'business-card'), { R, B } = P, gi = R.groundText, scene = 'counter-till-cards';
    // the art: each face at 900 px wide, the surface's own shape
    const [aw, ah] = artFor(ctx, scene, 0, 900), [bw2, bh2] = artFor(ctx, scene, 1, 900);
    const fa = onArt(); cardFront(ctx, R, fa, aw, ah);
    const ba = onArt(); cardBack(ctx, R, ba, bw2, bh2);
    const url = ctx.mockup(scene, [artDoc(ctx, aw, ah, fa, R.front.hex), artDoc(ctx, bw2, bh2, ba, R.back.hex)]);
    const [mx, my] = quadMid(ctx, scene, [0, 1]);
    photo(P, 40, 96, 1000, 520, url, cropAt(ctx, scene, 1000, 520, mx, my, 0), `${B.name} cards on the counter by the till, front and back`);
    // the net: front and back at 1:1, one sheet with the fold between them
    const cw = CARD[0] * PXMM, ch = CARD[1] * PXMM, x0 = 40, y0 = 664, xf = x0 + cw, x1 = xf + cw, y1 = y0 + ch;
    cardFront(ctx, R, onPage(P, x0, y0), cw, ch);
    cardBack(ctx, R, onPage(P, xf, y0), cw, ch);
    const fc = R.lineOn(R.front.hex), bc = R.lineOn(R.back.hex);
    P.line(L('cut', x0, y0 + 0.75, xf, y0 + 0.75, fc), L('cut', x0, y1 - 0.75, xf, y1 - 0.75, fc), L('cut', x0 + 0.75, y0, x0 + 0.75, y1, fc),
      L('cut', xf, y0 + 0.75, x1, y0 + 0.75, bc), L('cut', xf, y1 - 0.75, x1, y1 - 0.75, bc), L('cut', x1 - 0.75, y0, x1 - 0.75, y1, bc), L('fold', xf + 0.75, y0, xf + 0.75, y1, bc));
    // dimensions: the width under the front, the height beside the back
    dim(P, 'h', y1 + 24, x0, xf, `${CARD[0]} mm`, gi.ink);
    dim(P, 'v', x1 + 24, y0, y1, '', gi.ink);
    P.text(x1 + 36, y0 + ch / 2 - 8, 64, 16, 'cap', mixed(`${CARD[1]} mm`), `line-height:16px;color:${gi.ink}`);
    // the column: what the page is, then each face's colour and type
    const cx = 824, cwid = 216, W = ctx.weights;
    let y = y0;
    y += cap(P, cx, y, cwid, `The card, front and back, laid flat with the fold between them. Drawn at 1:1.`, gi.ink) + 16;
    P.text(cx, y, cwid, 20, 'cap', 'Front', `color:${gi.ink};font-weight:500`); y += 20;
    y += cap(P, cx, y, cwid, `${R.front.name} ${R.front.hex}`, gi.quiet) + 12;
    P.text(cx, y, cwid, 20, 'cap', 'Back', `color:${gi.ink};font-weight:500`); y += 20;
    cap(P, cx, y, cwid, `${R.back.name} ${R.back.hex}, ${B.fonts.body.family} ${W.medium} and ${W.regular}`, gi.quiet);
    cap(P, x0, 628, 1000, 'On the counter by the till: the front on the left, the back on the right.', gi.quiet);
    return P.html(R.front.hex);
  },

  // ---- social: the three posts as one stepped net, story to square, standing on one cut, a glue flap at the tall end ----
  social(ctx) {
    const P = new Pg(ctx, 'social'), { R, B } = P, gi = R.groundText, W = ctx.weights;
    const pw = 320, k = pw / 1080, base = 864, x0 = 80;
    const panels = POSTS.map((p, i) => ({ name: p[0], w: p[1], h: p[2], hex: R[p[3]].hex, col: R[p[3]].name, i }));
    // tallest first, so the net steps down to the right
    const order = [2, 1, 0].map((i) => panels[i]);
    let x = x0; const out = [];
    order.forEach((p, j) => {
      const h = p.h * k, top = base - h, col = R.lineOn(p.hex);
      post(ctx, R, onPage(P, x, top), p.i, pw, h);
      out.push(L('cut', x, top + 0.75, x + pw, top + 0.75, col), L('cut', x, base - 0.75, x + pw, base - 0.75, col));
      // the left edge: a fold where it meets its neighbour (up to the shorter one's top), cut above that
      if (j === 0) out.push(L('fold', x + 0.75, top, x + 0.75, base, col), pathLine('cut', `M${x} ${top}L${x - 32} ${top + 24}V${base - 24}L${x} ${base}`, P.gcol));
      else { const prev = order[j - 1], pc = R.lineOn(prev.hex), ph = base - prev.h * k; out.push(L('fold', x + 0.75, top, x + 0.75, base, col)); if (ph < top) out.push(L('cut', x - 0.75, ph, x - 0.75, top, pc)); }
      if (j === order.length - 1) out.push(L('cut', x + pw - 0.75, top, x + pw - 0.75, base, col));
      p.x = x; x += pw;
    });
    P.line(...out);
    // under each post: its format, its size in pixels, its colour
    order.forEach((p) => {
      P.text(p.x, base + 24, pw, 20, 'cap', esc(p.name), `color:${gi.ink};font-weight:500`);
      P.text(p.x, base + 44, pw, 20, 'cap', mixed(`${p.w} x ${p.h} px, drawn at ${Math.round(k * 1000) / 10}%`), `color:${gi.quiet}`);
      P.text(p.x, base + 64, pw, 20, 'cap', mixed(`${p.col} ${p.hex}`), `color:${gi.quiet}`);
    });
    const intro = `One line a post, each on a colour of the ${P.K.noun}. The story keeps 250 px clear at its head and foot, where the app draws over it.`;
    const ir = wrap(ctx, 'body', W.regular, intro, 15, 440);
    P.text(40, 96, 440, ir.length * 24, 'b-body', ir.map(mixed).join('<br>'), `line-height:24px;color:${gi.ink}`);
    return P.html('all');
  },

  // ---- email signature: the email on a laptop at the head, bleeding off the right; the signature at 1:1 on unprinted board below ----
  'email-signature'(ctx) {
    const P = new Pg(ctx, 'email-signature'), { R, B } = P, gi = R.groundText, W = ctx.weights, scene = 'bench-laptop-shoulder';
    const [aw, ah] = artFor(ctx, scene, 0, 960), url = ctx.mockup(scene, [mailArt(ctx, R, aw, ah)]);
    const [mx, my] = quadMid(ctx, scene, [0]);
    photo(P, 440, 96, 640, 427, url, cropAt(ctx, scene, 640, 427, mx, my, 640 / 1156), `An email from ${B.name} on a laptop, signed at the foot`);
    const intro = 'The signature closes every email. It is live text, so it still reads with images turned off.';
    const ir = wrap(ctx, 'body', W.regular, intro, 15, 360);
    P.text(40, 96, 360, ir.length * 24, 'b-body', ir.map(esc).join('<br>'), `line-height:24px;color:${gi.ink}`);
    cap(P, 40, 96 + ir.length * 24 + 24, 360, 'On a laptop, at the foot of an email.', gi.quiet);
    // the signature at 1:1 on unprinted board: a cut all round, the width dimensioned above it
    const sx = 40, sy = 600;
    signature(ctx, R, onPage(P, sx, sy));
    P.line(`<rect x="${sx + 0.75}" y="${sy + 0.75}" width="${SIG.w - 1.5}" height="${SIG.h - 1.5}" fill="none" stroke="${P.gcol}" stroke-width="1.5"/>`);
    dim(P, 'h', sy - 24, sx, sx + SIG.w, `${SIG.w} px`, gi.ink);
    cap(P, sx, sy + SIG.h + 16, SIG.w, 'The signature, drawn at 1:1.', gi.quiet);
    // the plain-text version, for mail sent without formatting: the same lines, no logo
    const px0 = 680, lines = sigLines(ctx);
    P.text(px0, sy - 32, 360, 20, 'cap', 'Plain text', `color:${gi.ink};font-weight:500`);
    P.text(px0, sy, 360, lines.length * 20, 'm', lines.map(esc).join('<br>'), `line-height:20px;color:${gi.ink}`);
    cap(P, px0, sy + lines.length * 20 + 16, 360, 'For mail sent without formatting: the same lines, with no logo.', gi.quiet);
    // the type, line by line
    const A = B.applications || {}, rows = [['Name', `${B.fonts.body.family} ${W.medium}, 16 px`, gi.ink], ['Role', `${B.fonts.body.family} ${W.regular}, 14 px`, gi.quiet], ['Contact', `${B.fonts.body.family} ${W.regular}, 14 px`, gi.ink]];
    const nm = (hex) => ([...ctx.colours, ...(ctx.tones || [])].find((c) => lc(c.hex) === lc(hex)) || { name: '' }).name;
    let ty = 820;
    P.line(L('cut', 40, ty - 8, 1040, ty - 8, P.gcol, 1));
    rows.forEach(([a, b, hex]) => {
      P.text(40, ty, 160, 20, 'cap', esc(a), `color:${gi.ink};font-weight:500`);
      P.text(200, ty, 440, 20, 'cap', mixed(b), `color:${gi.ink}`);
      P.text(680, ty, 360, 20, 'cap', mixed(`${nm(hex)} ${hex}`), `color:${gi.quiet}`);
      ty += 28;
    });
    P.text(40, ty, 160, 20, 'cap', 'Rule', `color:${gi.ink};font-weight:500`);
    P.text(200, ty, 440, 20, 'cap', mixed('1 px, between the logo and the name'), `color:${gi.ink}`);
    P.text(680, ty, 360, 20, 'cap', mixed(`${R.front.name} ${R.front.hex}`), `color:${gi.quiet}`);
    return P.html('all');
  },

  // ---- digital: the screen cut into the front panel as a window, a tuck flap off its fold; the same screen on the till's tablet as proof ----
  digital(ctx) {
    const P = new Pg(ctx, 'digital'), { R, B } = P, gi = R.groundText, W = ctx.weights, scene = 'counter-tablet-till', hex = R.front.hex, tx = R.textOn(hex), col = R.lineOn(hex);
    const [aw, ah] = artFor(ctx, scene, 0, SCR.w);
    const art = { w: aw, h: ah, html: ctx.artPage(`<div class="ui" style="position:absolute;left:0;top:0;width:${aw}px;height:${ah}px">${screen(ctx, R)}</div>`, { w: aw, h: ah }) };
    const url = ctx.mockup(scene, [art]);
    // the panel, bleeding off the left; the window at half size; the fold on its right edge with a tuck flap past it
    const py0 = 96, py1 = 560, pr = 600, z = 0.5, wx = 40, wy = 136, ww = aw * z, wh = ah * z;
    P.field(0, py0, pr, py1 - py0, hex);
    P.raw(`<div class="g5-win" style="left:${wx}px;top:${wy}px;width:${r2(ww)}px;height:${r2(wh)}px"><div class="ui" style="zoom:${z};width:${aw}px;height:${ah}px">${screen(ctx, R)}</div></div>`);
    P.boxes.push({ x: wx, y: wy, w: ww, h: wh });
    P.line(L('cut', 0, py0 + 0.75, pr, py0 + 0.75, col), L('cut', 0, py1 - 0.75, pr, py1 - 0.75, col), L('fold', pr - 0.75, py0, pr - 0.75, py1, col),
      pathLine('cut', tuckSide(pr, py0 + 12, py1 - 12, 72, 1), P.gcol),
      `<rect x="${r2(wx - 0.75)}" y="${r2(wy - 0.75)}" width="${r2(ww + 1.5)}" height="${r2(wh + 1.5)}" fill="none" stroke="${col}" stroke-width="1.5"/>`);
    P.text(wx, wy + wh + 12, ww, 20, 'b-small', mixed(`${aw} x ${ah} px, drawn at ${z * 100}%`), `color:${tx.ink}`);
    // the column past the flap: what the screen is and what it is built from
    const cx = 712, cw = 328;
    const intro = `The ${B.name} screen is built from the UI kit: its components on the light tokens, nothing restyled for this page.`;
    const ir = wrap(ctx, 'body', W.regular, intro, 15, cw);
    P.text(cx, 96, cw, ir.length * 24, 'b-body', ir.map(esc).join('<br>'), `line-height:24px;color:${gi.ink}`);
    let y = 96 + ir.length * 24 + 24;
    P.text(cx, y, cw, 20, 'cap', 'The parts in it', `color:${gi.ink};font-weight:500`); y += 24;
    const parts = ['.ui-topbar', '.ui-link', '.ui-chip', '.ui-progress', '.ui-avatar', '.ui-btn', '.ui-tabs', '.ui-list', '.ui-row'];
    P.text(cx, y, cw, parts.length * 20, 'm', parts.map(esc).join('<br>'), `line-height:20px;color:${gi.ink}`);
    // the photograph: the same screen on the tablet at the till
    const [mx, my] = quadMid(ctx, scene, [0]);
    photo(P, 560, 592, 480, 320, url, cropAt(ctx, scene, 480, 320, mx, my, 480 / 1100), `${B.name} screen on a tablet at the counter`);
    let ly = 592;
    ly += cap(P, 40, ly, 480, 'The same screen on a tablet at the counter, at the size a customer sees it.', gi.quiet) + 16;
    const act = ctx.colours.find((c) => c.role === 'action') || R.front;
    cap(P, 40, ly, 480, `The main button is ${act.name} ${act.hex}. Everything else is the light surface and its text.`, gi.ink);
    return P.html(hex);
  },
};

export function css() {
  return `.pg .g5-win{position:absolute;overflow:hidden;z-index:0}
.pg .g5-win>.ui{position:relative;display:block}`;
}
