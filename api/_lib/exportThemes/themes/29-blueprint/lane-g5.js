// Theme 29 (Blueprint), lane g5: the applications sheets (social, signage, email-signature, digital). business-card is round 1's own sheet.
// Each sheet draws the flat artwork as a dimensioned drawing at a stated scale (true mm or px, from the brand's own sizes), with the photographed
// scene as a lettered detail. Brand copy is printed whole; where a line is fitted, the measured size is only a cap and the browser sets the break.
import { esc as A } from '../../engine/brand.js';
import { componentsCss } from '../../engine/components.js';
import { colourMap, tokenGroups } from '../../engine/tokens.js';
import { inkW, wrap, fitW, displayStem, bodyStem } from './measure.js';
import { sheet, reds, detailTag, cloud, PX, ZX, r1 } from './lane-g1-sheet.js';
import { placePhoto, artDoc, arts, isCourier } from './scenes.js';

const CH = 'Chivo-400', CH5 = 'Chivo-500';
const svgAll = (s) => `<svg class="a" style="left:0;top:0" width="1587" height="1123" viewBox="0 0 1587 1123" fill="none" aria-hidden="true">${s}</svg>`;
// a size as a drawing prints it: whole when it is within a twentieth of whole, else to one place
const fmt = (v) => (Math.abs(v - Math.round(v)) < 0.05 ? String(Math.round(v)) : v.toFixed(1));
const colourOf = (ctx, hex) => ctx.colours.find((c) => c.hex.toUpperCase() === String(hex).toUpperCase());
const nameOf = (ctx, hex) => (colourOf(ctx, hex) || {}).name || '';
const lines = (stem, t, s, w, track = 0) => wrap(stem, String(t), s, w - 6, track).length;
// the body weight a set line uses: 500 when the brand loads it, else the nearest; and the regular weight
function mid(ctx) {
  const w = ctx.brand.fonts.body.weights;
  return w.includes(500) ? 500 : w.reduce((a, b) => (Math.abs(b - 500) < Math.abs(a - 500) ? b : a));
}
const reg = (ctx) => { const w = ctx.brand.fonts.body.weights; return w.includes(400) ? 400 : w[0]; };
const tok = (ctx, t, size, line) => { const x = (ctx.uiType || []).find((u) => u.token === t); return x ? { size: x.size, line: Math.round(x.line) } : { size, line }; };
// numbered general notes (items are markup, already escaped)
const notes = (x, y, w, items, gap = 12) => `<div class="a" style="left:${r1(x)}px;top:${r1(y)}px;width:${r1(w)}px;display:flex;flex-direction:column;gap:${gap}px">${items.map((t, i) => `<div style="display:grid;grid-template-columns:24px 1fr"><span class="c-mono" style="line-height:20px">${i + 1}</span><p class="c-note">${t}</p></div>`).join('')}</div>`;
// a lettered photograph detail: a 28 px film square at the photo's corner
const ptag = (x, y, t) => `<span class="a c-mono" style="left:${r1(x)}px;top:${r1(y)}px;width:28px;height:28px;background:var(--film);text-align:center;line-height:28px">${t}</span>`;
// flat art drawn at k sheet px per art px; zoom keeps the text vector and the PDF at 1:1 (transform would shrink the print)
const flat = (x, y, a, k) => `<div class="a" style="left:${r1(x)}px;top:${r1(y)}px;width:${r1(a.w * k)}px;height:${r1(a.h * k)}px;overflow:hidden"><div style="position:relative;width:${a.w}px;height:${a.h}px;zoom:${k}">${a.inner}</div></div>`;
// a hairline frame round a drawn artwork, the art's own edge
const edge = (x, y, w, h) => `<rect x="${r1(x) + 0.5}" y="${r1(y) + 0.5}" width="${r1(w) - 1}" height="${r1(h) - 1}" stroke="var(--ink)" stroke-width="1"/>`;
// a detail title, as round 1's detail sheets title theirs: the numbered circle, the title on a heavy rule, and a line under it
function detailTitle(x, y, n, title, sub) {
  const tw = inkW(CH5, title, 15);
  return detailTag(x + 14, y + 14, n) + `<h3 class="a c-head nw" style="left:${r1(x + 40)}px;top:${r1(y + 3)}px">${title}</h3><p class="a c-note nw" style="left:${r1(x + 40)}px;top:${r1(y + 34)}px">${sub}</p>`
    + svgAll(`<path d="M${r1(x + 40)} ${r1(y + 28.5)}H${r1(x + 40 + tw + 32)}" stroke="var(--ink)" stroke-width="1.5"/>`);
}
// outward normal of quad edge i (corners TL, TR, BR, BL)
function outward(c, i) {
  const p1 = c[i], p2 = c[(i + 1) % 4], cx = c.reduce((a, p) => a + p[0], 0) / 4, cy = c.reduce((a, p) => a + p[1], 0) / 4;
  let n = [-(p2[1] - p1[1]), p2[0] - p1[0]]; const l = Math.hypot(n[0], n[1]); n = [n[0] / l, n[1] / l];
  if (((p1[0] + p2[0]) / 2 - cx) * n[0] + ((p1[1] + p2[1]) / 2 - cy) * n[1] < 0) n = [-n[0], -n[1]];
  return n;
}
// a dimension along a photographed edge, 2 px, its value on a film tab (the .g5-tab wrapper)
function photoDim(R, c, i, value, d = 24) {
  const n = outward(c, i), place = Math.abs(n[0]) > 0.9 ? (n[0] < 0 ? 'left' : 'side') : 'out';
  R.dim(c[i], c[(i + 1) % 4], n, { d, w: 2, value, place });
}
// a point inside a quad, by its share across (u) and down (v)
const bil = (c, u, v) => [0, 1].map((k) => (1 - v) * ((1 - u) * c[0][k] + u * c[1][k]) + v * ((1 - u) * c[3][k] + u * c[2][k]));
// the largest size in a list at which a string sets in n lines or fewer at a width
const fit = (stem, t, sizes, w, n, track = -0.01) => sizes.find((s) => lines(stem, t, s, w, track) <= n) || sizes[sizes.length - 1];

// ---- social: three posts in the platform sizes, each carrying one of the brand's social lines whole ----
const FORMATS = [
  { tag: 'P1', name: 'Square post', w: 1080, h: 1080 },
  { tag: 'P2', name: 'Portrait post', w: 1080, h: 1350 },
  { tag: 'P3', name: 'Story', w: 1080, h: 1920 },
];
// a post ground is always one of the brand's own colours: the role's colour when it is one, else the nearest brand colour a sibling post doesn't already use
function socialGrounds(ctx) {
  const L = ctx.roles.light, rev = ctx.brand.logo.colourways.reversed, rgb = (h) => [1, 3, 5].map((k) => parseInt(String(h).slice(k, k + 2), 16));
  const d = (a, b) => { const x = rgb(a), y = rgb(b); return x.reduce((s, v, k) => s + (v - y[k]) ** 2, 0); };
  const pick = (hex, taken) => {
    const own = colourOf(ctx, hex);
    if (own && !taken.includes(own.hex.toUpperCase())) return own.hex;
    return ctx.colours.filter((c) => !taken.includes(c.hex.toUpperCase()) && ctx.ratio(c.hex, L.text) >= 7).sort((a, b) => d(a.hex, hex) - d(b.hex, hex))[0].hex;
  };
  const g1 = pick(L.raised, [rev.ground.toUpperCase()]);
  return [rev.ground, g1, pick(L.surface, [rev.ground.toUpperCase(), g1.toUpperCase()])];
}
function post(ctx, i) {
  const B = ctx.brand, L = ctx.roles.light, rev = B.logo.colourways.reversed, f = FORMATS[i], S = B.applications.social || [];
  const line = S[i] || B.lines.primary, dark = i === 0, ground = socialGrounds(ctx)[i], fg = dark ? rev.name : L.text;
  const M = 96, stem = displayStem(ctx), W = f.w - 2 * M, g = ctx.logo.geos.horizontal;
  const size = fit(stem, line, i === 2 ? [168, 152, 136, 120, 104, 96, 88] : [144, 128, 112, 104, 96, 88, 80, 72], W, i === 2 ? 5 : 4);
  const n = lines(stem, line, size, W, -0.01), lh = Math.round(size * 1.02), lw = fitW(ctx, 'horizontal', 300, 72), lgh = (lw * g.h) / g.w;
  const logo = (top) => `<div class="a" style="left:${M}px;top:${r1(top)}px;width:${lw}px;color:${fg}">${ctx.logo.html('horizontal', { width: lw, colourway: dark ? 'reversed' : 'colour', label: 'Logo' })}</div>`;
  const txt = (top) => `<p class="a bd" style="left:${M}px;top:${r1(top)}px;width:${W}px;font-size:${size}px;line-height:${lh}px;white-space:normal;color:${fg}">${A(line)}</p>`;
  // the square leads with the line and signs off with the logo; the portrait hangs the logo from the top and sets the line on the foot margin;
  // the story keeps the logo clear of the app's own bar at the top and stands the line in the upper middle
  const body = i === 0 ? txt(M) + logo(f.h - M - lgh) : i === 1 ? logo(M) + txt(f.h - M - n * lh) : logo(232) + txt(Math.round(f.h * 0.36));
  return { inner: `<div class="a" style="inset:0;background:${ground};color:${fg}"></div>${body}`, w: f.w, h: f.h, ground, fg, f, line, size };
}
// the phone's screen: the story in the app's viewer, its three posts as three progress segments, the reply field under it
function storyViewer(ctx, aspect) {
  const L = ctx.roles.light, rev = ctx.brand.logo.colourways.reversed, W = 390, H = Math.round(W / aspect), k = W / 1080, SH = 1920 * k;
  const p = post(ctx, 2), seg = (W - 16 - 8) / 3;
  const bars = [0, 1, 2].map((j) => `<div class="a" style="left:${r1(8 + j * (seg + 4))}px;top:10px;width:${r1(seg)}px;height:3px;border-radius:2px;background:${j === 0 ? L.text : L.divider}"></div>`).join('');
  const inner = `<div class="a" style="inset:0;background:${rev.ground}"></div>
<div class="a" style="left:0;top:0;width:${W}px;height:${r1(SH)}px;border-radius:10px;overflow:hidden"><div style="position:relative;width:1080px;height:1920px;zoom:${k}">${p.inner}</div></div>${bars}
<div class="a" style="left:12px;top:${r1(SH + 18)}px;width:${W - 24}px;height:44px;border-radius:22px;box-shadow:inset 0 0 0 1px ${L.divider}"></div>
<p class="a nw" style="left:32px;top:${r1(SH + 30)}px;font:400 15px/20px var(--chrome);color:${rev.name}">Send message</p>`;
  return { inner, w: W, h: H };
}

// ---- signage: the sign face at the brand's own size, half a px to the mm ----
function signFace(ctx) {
  const B = ctx.brand, rev = B.logo.colourways.reversed, stem = displayStem(ctx), g = ctx.logo.geos.horizontal;
  let mm = null; try { mm = arts.hoarding(ctx).mm; } catch { mm = null; }
  const [Wmm, Hmm] = mm || [3400, 1000];
  const W = Wmm / 2, H = Hmm / 2, M = 100, line = B.lines.others[0] || B.lines.primary, TW = W - 2 * M;
  // fitted to 90% of the measure, so the browser's own line breaking (in the photo's art page too) never spills a third line
  const size = fit(stem, line, [120, 112, 104, 96, 88, 80, 72, 64, 56], TW * 0.9, 2), n = lines(stem, line, size, TW * 0.9, -0.01), lh = Math.round(size * 1.02);
  const lw = fitW(ctx, 'horizontal', 400, 80), lgh = (lw * g.h) / g.w, top = 64, foot = 64;
  const inner = `<div class="a" style="inset:0;background:${rev.ground};color:${rev.name}"></div>
<p class="a bd" style="left:${M}px;top:${top}px;width:${TW}px;font-size:${size}px;line-height:${lh}px;white-space:normal;color:${rev.name}">${A(line)}</p>
<div class="a" style="left:${M}px;top:${r1(H - foot - lgh)}px;width:${lw}px;color:${rev.name}">${ctx.logo.html('horizontal', { width: lw, colourway: 'reversed', label: 'Your logo goes here' })}</div>
<p class="a bn nw" style="right:${M}px;top:${r1(H - foot - 36)}px;font:${mid(ctx)} 32px/36px var(--body);color:${rev.name}">${A(B.applications.site.url)}</p>`;
  return { inner, w: W, h: H, mm: [Wmm, Hmm], M, lw, lgh, n, size, foot, ground: rev.ground, fg: rev.name };
}
// the panel on the photographed hoarding: the face itself when its shape matches the panel, else the face centred on a panel in the brand's surface
function signPanel(ctx, f, aspect) {
  if (Math.abs(f.w / f.h / aspect - 1) <= 0.04) return { inner: f.inner, w: f.w, h: f.h, ox: 0, oy: 0 };
  const W = Math.max(f.w, Math.round(f.h * aspect)), H = Math.max(f.h, Math.round(f.w / aspect)), ox = (W - f.w) / 2, oy = (H - f.h) / 2;
  const inner = `<div class="a" style="inset:0;background:${ctx.roles.light.surface}"></div><div class="a" style="left:${r1(ox)}px;top:${r1(oy)}px;width:${f.w}px;height:${f.h}px">${f.inner}</div>`;
  return { inner, w: W, h: H, ox, oy };
}

// ---- email: the signature, and the message it closes as it opens in a mail client ----
function signature(ctx) {
  const B = ctx.brand, L = ctx.roles.light, e = B.applications.email || {}, c = B.applications.card || {};
  const tb = tok(ctx, 'body', 16, 24), tc = tok(ctx, 'caption', 13, 18), w5 = mid(ctx), w4 = reg(ctx), s5 = bodyStem(ctx, w5), s4 = bodyStem(ctx, w4);
  const g = ctx.logo.geos.horizontal, LW = fitW(ctx, 'horizontal', 152, 40), lh = (LW * g.h) / g.w, G1 = 20, G2 = 16, GAP = 20;
  const LT = 2 * tb.line + G1, CT = Math.round(LT + lh + G2), H = CT + tc.line;
  const contact = c.contact || '', url = B.applications.site.url;
  // slot: the contact line and the address are compact placeholders (about 300 px with the gap), not the sentinels measured here
  const W = Math.max(Math.ceil(Math.max(LW, inkW(s5, e.person || '', tb.size), inkW(s4, e.role || '', tb.size), inkW(s4, contact, tc.size) + GAP + inkW(s4, url, tc.size))) + 8, ctx.placeholders ? 320 : 0);
  const inner = `<p class="a bn nw" style="left:0;top:0;font:${w5} ${tb.size}px/${tb.line}px var(--body);color:${L.text}">${A(e.person || '')}</p>
<p class="a bn nw" style="left:0;top:${tb.line}px;font:${w4} ${tb.size}px/${tb.line}px var(--body);color:${L.quiet}">${A(e.role || '')}</p>
<div class="a" style="left:0;top:${LT}px;width:${LW}px;color:${L.text}">${ctx.logo.html('horizontal', { width: LW, colourway: 'colour', label: 'Logo' })}</div>
<p class="a bn nw" style="left:0;top:${CT}px;font:${w4} ${tc.size}px/${tc.line}px var(--body);color:${L.quiet}"><span>${A(contact)}</span><span style="margin-left:${GAP}px">${A(url)}</span></p>`;
  return { inner, w: W, h: H, LW, lh, LT, CT, G1, G2, tb, tc, w4, w5 };
}
function mailScreen(ctx, aspect) {
  const B = ctx.brand, L = ctx.roles.light, E = B.guideB.email || { subject: '', to: '', time: '', body: [] }, e = B.applications.email || {}, c = B.applications.card || {};
  const W = 1440, H = Math.round(W / aspect), X = 160, sig = signature(ctx), tb = sig.tb, s4 = bodyStem(ctx, sig.w4), BW = 680;
  const sn = lines(CH5, E.subject, 30, 1120), y1 = 72 + sn * 38 + 28, y2 = y1 + 26, dv = y2 + 22 + 24;
  let y = dv + 32, body = '';
  const paras = E.body.map((t) => { const n = lines(s4, t, tb.size, BW), p = { y, n }; body += `<p class="a bn" style="left:${X}px;top:${y}px;width:${BW}px;font:${sig.w4} ${tb.size}px/${tb.line}px var(--body);color:${L.text}">${A(t)}</p>`; y += n * tb.line + tb.line; return p; });
  const sy = y + 16;
  const inner = `<div class="a" style="inset:0;background:${L.surface}"></div>
<p class="a" style="left:${X}px;top:72px;width:1120px;font:500 30px/38px var(--chrome);color:${L.text}">${A(E.subject)}</p>
<p class="a nw" style="left:${X}px;top:${y1}px;font:500 17px/24px var(--chrome);color:${L.text}">${A(e.person || '')} <span style="font-weight:400;color:${L.quiet}">&lt;${A(c.contact || '')}&gt;</span></p>
<p class="a nw" style="right:${X}px;top:${y1}px;font:400 15px/24px var(--chrome);color:${L.quiet}">${A(E.time)}</p>
<p class="a nw" style="left:${X}px;top:${y2}px;font:400 15px/22px var(--chrome);color:${L.quiet}">To ${A(E.to)}</p>
<div class="a" style="left:${X}px;top:${dv}px;width:${W - 2 * X}px;height:1px;background:${L.divider}"></div>
${body}<div class="a" style="left:${X}px;top:${sy}px;width:${sig.w}px;height:${sig.h}px">${sig.inner}</div>`;
  return { inner, w: W, h: H, X, sn, y1, y2, dv, paras, BW, sig, sy, tb };
}

// ---- digital: the brand's own screen, built from the UI kit's components ----
function productScreen(ctx, aspect) {
  const B = ctx.brand, S = B.ui.screen.content, ui = ctx.ui, W = 1440, H = Math.round(W / aspect), Ex = S.example || {};
  const st = ctx.status.find((s) => s.label === S.status) || ctx.status[0], pct = Math.round(S.progress * 100), dstem = displayStem(ctx);
  const g = ctx.logo.geos.horizontal, lw = fitW(ctx, 'horizontal', 150, 36), lgh = (lw * g.h) / g.w;
  const CX = 64, CY = 120, CWd = 560, IN = 40, IX = CX + IN, IW = CWd - 2 * IN, RX = CX + CWd + 48, RW = W - 64 - RX;
  const es = fit(dstem, S.eta, [56, 52, 48, 44, 40], IW, 2), en = lines(dstem, S.eta, es, IW, -0.01), elh = Math.round(es * 1.08);
  const s4 = bodyStem(ctx, reg(ctx)), pn = lines(s4, S.pickup, 16, IW);
  const Y = { title: CY + 36, chip: CY + 68, eta: CY + 120 }; Y.prog = Y.eta + en * elh + 28; Y.ft = Y.prog + 20; Y.pick = Y.ft + 40; Y.rider = Math.max(Y.pick + pn * 24 + 40, CY + 456); Y.facts = Y.rider + 96; Y.share = Y.facts + 88;
  const at = (x, y, w, html, extra = '') => `<div style="position:absolute;left:${x}px;top:${y}px;${w ? `width:${w}px;` : ''}${extra}">${html}</div>`;
  const inner = `<div class="ui" style="position:absolute;inset:0;background:var(--raised)">
${at(0, 0, W, `<nav class="ui-topbar" aria-label="Main" style="height:72px;padding:0 64px;display:flex;align-items:center;gap:48px;background:var(--surface);border-bottom:1px solid var(--divider)"><span style="display:block;width:${lw}px;color:var(--text)">${ctx.logo.html('horizontal', { width: lw, colourway: 'colour', label: 'Logo' })}</span><div class="ui-topbar__links" style="display:flex;gap:8px">${ui.links(Ex.links || [], 0)}</div><span style="margin-left:auto">${ui.btn(S.form.book, { size: 'sm' })}</span></nav>`)}
${at(CX, CY, CWd, '', `height:${H - 48 - CY}px;background:var(--surface);border:1px solid var(--divider);border-radius:var(--r-card)`)}
${at(IX, Y.title, IW, `<p style="margin:0;font:500 var(--fs-label)/var(--lh-label) var(--ff-body);color:var(--text-soft)">${A(B.ui.screen.title)}</p>`)}
${at(IX, Y.chip, 0, ui.statusChip(st.id, { label: S.status }))}
${at(IX, Y.eta, IW, `<h2 class="ui-display" style="margin:0;font-size:${es}px;line-height:${elh}px;color:var(--text)">${A(S.eta)}</h2>`)}
${at(IX, Y.prog, IW, `<div class="ui-progress"><span class="ui-progress__bar"><i style="width:${pct}%"></i></span><span class="ui-progress__dot" style="left:${pct}%"></span></div>`)}
${at(IX, Y.ft, IW, `<p style="margin:0;display:flex;justify-content:space-between;font:400 var(--fs-caption)/var(--lh-caption) var(--ff-body);color:var(--text-soft)"><span>${A(S.from)}</span><span>${A(S.to)}</span></p>`)}
${at(IX, Y.pick, IW, `<p style="margin:0;font:400 16px/24px var(--ff-body);color:var(--text)">${A(S.pickup)}</p>`)}
${at(IX, Y.rider, IW, `<div style="display:flex;align-items:center;gap:16px;padding-top:24px;border-top:1px solid var(--divider)"><span class="ui-avatar" aria-hidden="true">${A(S.initials)}</span><div style="flex:1"><p style="margin:0;font:500 16px/24px var(--ff-body);color:var(--text)">${A(S.rider)}</p><p style="margin:0;font:400 var(--fs-caption)/var(--lh-caption) var(--ff-body);color:var(--text-soft)">${A(S.riderNote)}</p></div>${ui.btn(S.call, { variant: 'secondary', iconLeft: 'phone', size: 'sm' })}</div>`)}
${at(IX, Y.facts, IW, `<div style="display:flex;justify-content:space-between;align-items:flex-end;padding-top:24px;border-top:1px solid var(--divider)"><div><p style="margin:0;font:400 var(--fs-caption)/var(--lh-caption) var(--ff-body);color:var(--text-soft)">${A(S.deliverToLabel)}</p><p style="margin:0;font:500 16px/24px var(--ff-body);color:var(--text)">${A(S.deliverTo)}</p></div><div style="text-align:right"><p style="margin:0;font:400 var(--fs-caption)/var(--lh-caption) var(--ff-body);color:var(--text-soft)">${A(S.paidLabel)}</p><p class="ui-display ui-num" style="margin:0;font-size:30px;line-height:36px;color:var(--text)">${A(S.paid)}</p></div></div>`)}
${at(IX - 12, Y.share, 0, ui.btn(S.share, { variant: 'quiet', iconRight: 'arrow-right' }))}
${at(RX, CY, RW, `${Ex.tabs ? ui.tabs(Ex.tabs, 0) : ''}<div style="margin-top:24px;background:var(--surface);border:1px solid var(--divider);border-radius:var(--r-card);overflow:hidden">${ui.deliveryRows(4)}</div>`)}
</div>`;
  return { inner, w: W, h: H, lw, lgh, CX, CY, CWd, IX, RX, RW, Y, stId: st.id };
}

export const guidelines = {
  // Social posts: the three formats as elevations at 1:3, standing on one ground line and stepping up to the story, each with its line whole.
  // Detail A is the story on a phone on a kitchen bench at dusk.
  social(ctx) {
    const B = ctx.brand, L = ctx.roles.light, rev = B.logo.colourways.reversed, k = 1 / 3, BY = 892, R = reds();
    const X = [104, 560, 1016], P = [0, 1, 2].map((i) => post(ctx, i));
    let html = '', svg = '';
    P.forEach((p, i) => {
      const x = X[i], w = p.w * k, h = p.h * k, y = BY - h;
      html += flat(x, y, p, k);
      svg += edge(x, y, w, h);
      R.dim([x, y], [x + w, y], [0, -1], { d: 24, value: String(p.f.w) });
      R.dim([x + w, y], [x + w, BY], [1, 0], { d: 20, value: String(p.f.h), place: 'side' });
      html += `<p class="a c-note nw" style="left:${x}px;top:${BY + 16}px"><span class="c-mono">${p.f.tag}</span>  ${p.f.name}, ${p.f.w} × ${p.f.h} px</p>`;
    });
    svg += `<path d="M64 ${BY + 0.5}H1523" stroke="var(--ink)" stroke-width="1.5"/>`;
    // detail A: the story as the app shows it, on the phone
    const cr = isCourier(ctx), id = cr ? 'kerb-crossing-phone' : 'room-kitchen-phone', sc = ctx.sceneInfo(id), q = sc.quads[0];
    const box = { x: 40, y: 40, w: 472, h: 424 };
    const Ph = placePhoto(ctx, id, { 'screen-phone': artDoc(ctx, storyViewer(ctx, q.aspect)) }, box, { scale: cr ? 0.5 : 0.8, focus: cr ? [560, 520] : [520, 720], alt: cr ? `${B.name}'s story on a phone, held at a city crossing` : `${B.name}'s story on a phone on a kitchen bench at dusk` });
    svg += `<path d="M40 ${box.y + box.h + 0.5}H${box.x + box.w + 0.5}V40" stroke="var(--ink)" stroke-width="1"/>`;
    const names = (h) => nameOf(ctx, h) || h.toUpperCase();
    const items = [
      `One line to a post, whole, in ${A(B.fonts.display.family)}. The lines are the brand's own three.`,
      `${A(names(P[0].ground))} carries <span class="c-mono">P1</span>. ${A(names(P[1].ground))} and ${A(names(P[2].ground))} carry <span class="c-mono">P2</span> and <span class="c-mono">P3</span>.`,
      `The story keeps its logo below the app's bar, ${fmt(232)} px from the top.`,
      `<span class="c-mono">(A)</span> The story on a phone, ${cr ? 'held at a city crossing' : 'at home at the end of the day'}.`,
    ];
    html += `<h3 class="a c-head" style="left:560px;top:64px">General notes</h3>${notes(560, 102, 400, items)}`;
    const inner = `${Ph.html}${ptag(40, 40, 'A')}${svgAll(svg)}${html}${R.svg()}`;
    return sheet(ctx, 'social', { drawing: 'Social posts', scale: '[1:3], sizes in px' }, inner);
  },

  // Sign face: the face as an elevation at 1:10 across the top of the sheet, dimensioned in mm, with its setting-out under it.
  // Detail A is the face screwed to a plywood hoarding on a wet footpath.
  signage(ctx) {
    const B = ctx.brand, F = signFace(ctx), k = (2 * PX) / 10, R = reds();
    const EX = 104, EY = 112, w = F.w * k, h = F.h * k;
    let html = flat(EX, EY, F, k), svg = edge(EX, EY, w, h);
    R.dim([EX, EY], [EX + w, EY], [0, -1], { d: 24, value: String(F.mm[0]) });
    R.dim([EX + w, EY], [EX + w, EY + h], [1, 0], { d: 24, value: String(F.mm[1]), place: 'side' });
    // the setting-out under the face: the margin, and the logo's width
    const lx = EX + F.M * k, lr = lx + F.lw * k;
    R.dim([EX, EY + h], [lx, EY + h], [0, 1], { d: 24, value: fmt(F.M * 2) });
    R.dim([lx, EY + h], [lr, EY + h], [0, 1], { d: 24, value: fmt(F.lw * 2) });
    html += `<p class="a c-note" style="left:${EX}px;top:${r1(EY + h + 72)}px;width:${r1(Math.max(w, 900))}px"><span class="c-mono">S1</span>  ${A(B.applications.signage)}</p>`;
    // detail A: the photograph, 3:2, with the face's two sizes along its own edges
    const id = 'kerb-hoarding-footpath', sc = ctx.sceneInfo(id), q = sc.quads[0], pan = signPanel(ctx, F, q.aspect);
    const PY = 600, PH = 971 - PY, PW = PH * 1.5;
    const Ph = placePhoto(ctx, id, { hoarding: artDoc(ctx, pan) }, { x: 40, y: PY, w: PW, h: PH }, { alt: `${B.name}'s sign on a site hoarding beside a footpath` });
    const c = Ph.corners(0), u0 = pan.ox / pan.w, u1 = (pan.ox + F.w) / pan.w, v0 = pan.oy / pan.h, v1 = (pan.oy + F.h) / pan.h;
    const fc = [bil(c, u0, v0), bil(c, u1, v0), bil(c, u1, v1), bil(c, u0, v1)];
    const RP = reds();
    photoDim(RP, fc, 0, String(F.mm[0]));
    photoDim(RP, fc, 3, String(F.mm[1]));
    svg += `<path d="M40 ${PY - 0.5}H${r1(40 + PW) + 0.5}V971" stroke="var(--ink)" stroke-width="1"/>`;
    const dn = nameOf(ctx, F.ground), ln = nameOf(ctx, F.fg), sn = nameOf(ctx, ctx.roles.light.surface);
    const items = [
      `The face, ${F.mm[0]} × ${F.mm[1]} mm, drawn at <span class="v">1:10</span>.${dn ? ` Ground ${A(dn)}` : ''}${ln ? `, the line and the logo in ${A(ln)}` : ''}.`,
      `The line in ${A(B.fonts.display.family)}, at most two lines. A ${fmt(F.M * 2)} mm margin stands at both ends.`,
      `The reversed horizontal logo, ${fmt(F.lw * 2)} mm wide, on the foot with the site address.`,
      ...(pan.ox || pan.oy ? [`On a longer hoarding panel the face is centred${sn ? ` and the panel is ${A(sn)}` : ''}.`] : []),
      `<span class="c-mono">(A)</span> The face on a site hoarding beside a footpath.`,
    ];
    const NX = r1(40 + PW + 48);
    html += `<h3 class="a c-head" style="left:${NX}px;top:${PY + 24}px">General notes</h3>${notes(NX, PY + 62, 460, items)}`;
    const inner = `${html}${Ph.html}${ptag(40, PY, 'A')}${svgAll(svg)}${R.svg()}<div class="g5-tab">${RP.svg()}</div>`;
    return sheet(ctx, 'signage', { drawing: 'Sign face', scale: '[1:10], sizes in mm' }, inner);
  },

  // Email signature: the signature enlarged 2:1 as detail 1, dimensioned in px, on the message's own white; the message as it opens drawn as
  // a key plan at 1:4 with the signature clouded; detail A is the message on a laptop at a shared bench.
  'email-signature'(ctx) {
    const B = ctx.brand, L = ctx.roles.light, R = reds(), sc = ctx.sceneInfo('bench-laptop-shoulder'), q = sc.quads[0];
    const M = mailScreen(ctx, q.aspect), S = M.sig, k = 2, PAD = 32;
    const SX = 104, SY = 152, FW = (S.w + 2 * PAD) * k, FH = (S.h + 2 * PAD) * k, ix = SX + PAD * k, iy = SY + PAD * k;
    let html = `<div class="fld" style="left:${SX}px;top:${SY}px;width:${FW}px;height:${FH}px;background:${L.surface}"></div>${flat(ix, iy, S, k)}`;
    let svg = edge(SX, SY, FW, FH);
    // the signature's own sizes: overall width, the logo's width, and the two gaps that group it
    R.dim([ix, iy], [ix + S.w * k, iy], [0, -1], { d: PAD * k - 20, value: String(S.w) });
    const lt = iy + S.LT * k, lb = lt + S.lh * k;
    R.dim([ix, lb], [ix + S.LW * k, lb], [0, 1], { d: 12, value: String(S.LW) });
    R.dim([ix, lt - S.G1 * k], [ix, lt], [-1, 0], { d: PAD * k + 24, value: String(S.G1), place: 'left' });
    R.dim([ix, lb], [ix, iy + S.CT * k], [-1, 0], { d: PAD * k + 24, value: String(S.G2), place: 'left' });
    R.dim([ix + FW - PAD * k, iy], [ix + FW - PAD * k, iy + S.h * k], [1, 0], { d: 8, value: String(S.h), place: 'side' });
    const ty = SY + FH + 40;
    html += detailTitle(SX, ty, 1, 'Signature', `Enlarged <span class="v">2:1</span>. Sizes are the signature's own, in px.`);
    const df = B.fonts.body.family, items = [
      `Name in ${A(df)} ${S.w5}, role in ${S.w4}, both ${S.tb.size}/${S.tb.line} px. The contact line ${S.tc.size}/${S.tc.line} px in ${A(nameOf(ctx, L.quiet) || 'the quiet text colour')}.`,
      `The horizontal logo, ${S.LW} px wide, in full colour on ${A(nameOf(ctx, L.surface) || 'the message ground')}.`,
      `Live text, never one picture, so the address and the site can be copied.`,
    ];
    html += notes(SX, ty + 88, 520, items);
    // detail A: the message open on the laptop, the whole bench in view
    const PW = 1547 - ZX[4], PH = PW / 1.5;
    const Ph = placePhoto(ctx, 'bench-laptop-shoulder', { 'screen-laptop': artDoc(ctx, M) }, { x: ZX[4], y: 40, w: PW, h: PH }, { alt: `${B.name}'s email open on a laptop at a shared bench` });
    svg += `<path d="M${ZX[4] - 0.5} 40V${r1(40 + PH) + 0.5}H1547" stroke="var(--ink)" stroke-width="1"/>`;
    // the key plan: the message as it opens, drawn as a drafter greys text, at 1:4
    const kk = 0.25, KX = ZX[4] + 24, KY = r1(40 + PH + 72), mx = (v) => KX + v * kk, my = (v) => KY + v * kk;
    svg += edge(KX, KY, M.w * kk, M.h * kk);
    svg += `<path d="M${mx(M.X)} ${r1(my(72 + 19))}H${r1(mx(M.X + 560))}" stroke="var(--ink)" stroke-width="3"/>`;
    svg += `<path d="M${mx(M.X)} ${r1(my(M.y1 + 12))}H${r1(mx(M.X + 300))}M${mx(M.X)} ${r1(my(M.y2 + 11))}H${r1(mx(M.X + 140))}" stroke="var(--quiet)" stroke-width="1.5"/>`;
    svg += `<path d="M${mx(M.X)} ${r1(my(M.dv)) + 0.5}H${r1(mx(M.w - M.X))}" stroke="var(--hair)" stroke-width="1"/>`;
    M.paras.forEach((p) => { for (let j = 0; j < p.n; j++) svg += `<path d="M${mx(M.X)} ${r1(my(p.y + j * M.tb.line + 12))}H${r1(mx(M.X + (j === p.n - 1 && p.n > 1 ? M.BW * 0.55 : M.BW)))}" stroke="var(--quiet)" stroke-width="1.5"/>`; });
    const cx0 = mx(M.X), cy0 = my(M.sy), cw = S.w * kk, chh = S.h * kk;
    svg += `<rect x="${r1(cx0)}" y="${r1(cy0)}" width="${r1(cw)}" height="${r1(chh)}" stroke="var(--ink)" stroke-width="1"/>`;
    svg += `<path d="${cloud(cx0 - 10, cy0 - 10, cw + 20, chh + 20, 6)}" stroke="var(--ink)" stroke-width="1"/>`;
    const tx = cx0 + cw + 48, tyy = cy0 + chh / 2;
    svg += `<path d="M${r1(cx0 + cw + 10)} ${r1(tyy) + 0.5}H${r1(tx - 14)}" stroke="var(--ink)" stroke-width="1"/>`;
    html += detailTag(tx, tyy, 1);
    const NX = r1(KX + M.w * kk + 32);
    html += `<h3 class="a c-head" style="left:${NX}px;top:${KY - 4}px">Key plan</h3><p class="a c-note" style="left:${NX}px;top:${KY + 24}px;width:${r1(1523 - NX)}px">The message as it opens, <span class="v">1:4</span>. The signature closes it, under the last paragraph.</p>
<p class="a c-note" style="left:${NX}px;top:${KY + 112}px;width:${r1(1523 - NX)}px"><span class="c-mono">A</span>  The message on a laptop at a shared bench.</p>`;
    const inner = `${Ph.html}${ptag(ZX[4], 40, 'A')}${svgAll(svg)}${html}${R.svg()}`;
    return sheet(ctx, 'email-signature', { drawing: 'Email signature', scale: '[2:1], key plan [1:4], px' }, inner);
  },

  // Product screen: the brand's own screen, built from the UI kit, drawn at 1:2 with its setting-out chained along the foot and its
  // components keyed. Detail A is the same screen on the laptop, cropped close and upright.
  digital(ctx) {
    const B = ctx.brand, sc = ctx.sceneInfo('bench-laptop-shoulder'), q = sc.quads[0], P = productScreen(ctx, q.aspect), k = 0.5, R = reds();
    const SX = 160, SY = 112, w = P.w * k, h = P.h * k, X = (v) => SX + v * k, Y = (v) => SY + v * k;
    let html = `<div class="g5ui">${flat(SX, SY, P, k)}</div>`, svg = edge(SX, SY, w, h);
    R.dim([SX, SY], [SX + w, SY], [0, -1], { d: 24, value: String(P.w) });
    R.dim([SX, SY], [SX, SY + 72 * k], [-1, 0], { d: 24, value: '72', place: 'left' });
    R.dim([SX, SY], [SX, SY + h], [-1, 0], { d: 64, value: String(P.h), place: 'left' });
    // the setting-out, chained along the foot: margin, panel, gutter, list, margin
    const chain = [0, P.CX, P.CX + P.CWd, P.RX, P.RX + P.RW, P.w];
    for (let i = 0; i < chain.length - 1; i++) R.dim([X(chain[i]), SY + h], [X(chain[i + 1]), SY + h], [0, 1], { d: 24, value: String(chain[i + 1] - chain[i]) });
    // keynotes: a bubble beside each component, numbered to the schedule under the drawing
    const S = B.ui.screen.content, st = ctx.status.find((s) => s.id === P.stId);
    const keys = [
      [X(32), Y(36), 'Top bar', 'The horizontal logo and the page links.'],
      [X(P.IX - 20), Y(P.Y.chip + 14), 'Status chip', `${A(S.status)}, in the kit's ${A(st.tone)} tone.`],
      [X(P.IX - 20), Y(P.Y.prog + 4), 'Progress bar', `${Math.round(S.progress * 100)}% along, from ${A(S.from)} to ${A(S.to)}.`],
      [X(P.IX - 20), Y(P.Y.rider + 46), 'Secondary button', `${A(S.call)}, beside the person on the job.`],
      [X(P.RX - 24), Y(P.CY + 120), 'List rows', `${ctx.brand.ui.screen.content.deliveries.length > 4 ? 'Four' : 'The'} rows, each with its status chip.`],
    ];
    keys.forEach(([x, y], i) => { html += `<svg class="a" style="left:${r1(x - 10)}px;top:${r1(y - 10)}px" width="20" height="20" aria-hidden="true"><circle cx="10" cy="10" r="9.5" fill="var(--film)" stroke="var(--ink)" stroke-width="1"/></svg><span class="a c-mono" style="left:${r1(x - 10)}px;top:${r1(y - 8)}px;width:20px;text-align:center;font-size:11px">${i + 1}</span>`; });
    html += `<p class="a c-note nw" style="left:${SX}px;top:${r1(SY + h + 72)}px"><span class="c-mono">D1</span>  ${A(B.ui.screen.title)}, ${P.w} × ${P.h} px, built from the UI kit's components</p>`;
    // the keynote schedule, two columns under the drawing
    const KY = r1(SY + h + 136), half = Math.ceil(keys.length / 2), CW = (X(P.w) - SX - 48) / 2;
    html += `<h3 class="a c-head" style="left:${SX}px;top:${KY - 36}px">Keynotes</h3>`;
    [keys.slice(0, half), keys.slice(half)].forEach((col, j) => {
      html += `<div class="a" style="left:${r1(SX + j * (CW + 48))}px;top:${KY}px;width:${r1(CW)}px;display:flex;flex-direction:column;gap:12px">${col.map(([, , t, d], i) => `<div style="display:grid;grid-template-columns:24px 1fr"><span class="c-mono" style="line-height:20px">${j * half + i + 1}</span><p class="c-note"><span style="font-weight:500">${t}.</span> ${d}</p></div>`).join('')}</div>`;
    });
    // detail A: the screen on the laptop, cropped upright and close
    const box = { x: ZX[5], y: 40, w: 1547 - ZX[5], h: 931 };
    const Ph = placePhoto(ctx, 'bench-laptop-shoulder', { 'screen-laptop': artDoc(ctx, { ...P, inner: `<div class="g5ui a" style="inset:0">${P.inner}</div>` }) }, box, { focus: [1006, 560], alt: `${B.name}'s screen on a laptop at a shared bench` });
    const c = Ph.corners(0), RP = reds();
    photoDim(RP, c, 0, `${P.w} px`);
    photoDim(RP, c, 3, `${P.h} px`);
    svg += `<path d="M${ZX[5] - 0.5} 40V971" stroke="var(--ink)" stroke-width="1"/>`;
    html += `<p class="a c-note" style="left:${SX}px;top:${KY + 120}px;width:${r1(w)}px"><span class="c-mono">A</span>  The same screen on a laptop at a shared bench. Its two sizes run along the screen's own edges.</p>`;
    const inner = `${Ph.html}${ptag(ZX[5], 40, 'A')}${svgAll(svg)}${html}${R.svg()}<div class="g5-tab">${RP.svg()}</div>`;
    return sheet(ctx, 'digital', { drawing: 'Product screen', scale: '[1:2], sizes in px' }, inner);
  },
};

// The kit's own components CSS, scoped under .pg .g5ui so it reaches only this lane's screens (on the sheet and in the photo art), with the
// kit's light tokens on its .ui root. Each top-level selector is prefixed; @media and @supports blocks are prefixed inside.
function scope(css, pre) {
  css = css.replace(/\/\*[\s\S]*?\*\//g, '');
  let out = '', i = 0;
  while (i < css.length) {
    const open = css.indexOf('{', i); if (open < 0) break;
    const head = css.slice(i, open).trim();
    let d = 1, j = open + 1; while (j < css.length && d) { if (css[j] === '{') d++; else if (css[j] === '}') d--; j++; }
    const body = css.slice(open + 1, j - 1);
    if (/^@(media|supports)/.test(head)) out += `${head}{${scope(body, pre)}}\n`;
    else if (head.startsWith('@')) out += `${head}{${body}}\n`;
    else {
      const sels = []; let dd = 0, s = '';
      for (const ch of head) { if (ch === '(') dd++; if (ch === ')') dd--; if (ch === ',' && !dd) { sels.push(s); s = ''; } else s += ch; }
      sels.push(s);
      out += `${sels.map((x) => `${pre} ${x.trim()}`).join(',')}{${body}}\n`;
    }
    i = j;
  }
  return out;
}
export function css(ctx) {
  const g = tokenGroups(ctx), decl = (o) => Object.entries(o).map(([k, v]) => `--${k}:${v}`).join(';');
  return `.pg .g5-tab .rv{background:var(--film);padding:2px 4px;margin:-2px -4px}
.pg .g5ui .ui{${decl(colourMap(ctx, 'light'))};${decl(g.space)};${decl(g.radius)};${decl(g.width)};${decl(g.font)};${decl(g.text)};${decl(g.shadow)}}
.pg .g5ui .ui p,.pg .g5ui .ui h2,.pg .g5ui .ui ul{margin:0}
${scope(componentsCss(ctx), '.pg .g5ui')}`;
}
