// Shared machinery for theme 24 (Standards): colour roles read from the brand, the unit x, text measuring, and the device
// every page carries: the x-ruler, dimension lines with slash ticks, crop ticks, the thumb tab and the running head.
// All lengths are page px on a 1123 x 794 page; every printed size is px / x, rounded to 0.5. No hex lives in this folder.
import { esc } from '../../engine/brand.js';
import { ratio } from '../../engine/color.js';
import { outline, capHeight } from '../../engine/logo.js';
import { loadFont } from '../../engine/nodeFont.js';

export const A = esc;
export const f2 = (n) => +(+n).toFixed(2);
export const pad3 = (n) => String(n).padStart(3, '0');

// ---- grid (spec 2.3) ----
export const G = { L: 56, R: 1064, W: 1008, top: 88, bottom: 714, rulerY: 746, labelY: 752, col: [56, 142, 228, 314, 400, 486, 572, 658, 744, 830, 916, 1002], tabX: 1099, tabW: 24, tabH: 66, tabPitch: 70 };
export const span = (n) => 86 * n - 24;

// ---- the unit ----
export const xOf = (ctx) => ctx.brand.ui.spacingBase || 4;
export const half = (v) => Math.round(v * 2) / 2;
export const fx = (ctx, px) => `${half(px / xOf(ctx))}x`;
// position along the ruler in x (0 at the left margin)
export const posX = (ctx, px) => half((px - G.L) / xOf(ctx));

// ---- colour roles (spec 2.5), cached on the ctx ----
export function roles(ctx) {
  if (ctx._r24) return ctx._r24;
  const B = ctx.brand, L = B.ui.light, D = B.ui.dark, cols = B.colours;
  const byRole = (r) => cols.find((c) => c.role === r);
  const ground = (byRole('ground') || { hex: L.surface }).hex, ink = L.text, quiet = L.quiet, hair = L.divider;
  const field = (byRole('highlight') || byRole('action')).hex, dark = (byRole('text') || { hex: ink }).hex;
  const hexOf = (id) => (ctx.byId && ctx.byId[id] ? ctx.byId[id].hex : null);
  const pass = (a, b) => ratio(a, b) >= 4.5;
  const better = (bg) => (ratio(ink, bg) >= ratio(ground, bg) ? ink : ground);
  // the brand's own pair for this background if it passes at 11 px, else whichever of ink and ground reads better
  const inkOn = (bg) => {
    for (const p of B.pairs || []) { if (p.minSize) continue; if (hexOf(p.bg)?.toLowerCase() !== bg.toLowerCase()) continue; const fg = hexOf(p.fg); if (fg && pass(fg, bg)) return fg; }
    return better(bg);
  };
  const quietOn = (bg) => [quiet, D.quiet, ink, ground].find((c) => pass(c, bg)) || better(bg);
  const fieldInk = inkOn(field), darkInk = inkOn(dark);
  return (ctx._r24 = { ground, ink, quiet, hair, field, fieldInk, fieldQuiet: quietOn(field), dark, darkInk, darkQuiet: [D.quiet, darkInk].find((c) => pass(c, dark)) || darkInk, inkOn, quietOn });
}

// ---- text measuring (opentype advance widths plus kerning, as outline() does) ----
const chromeFont = (w) => loadFont(`PublicSans-${w}`);
export function adv(font, text, size, track = 0) {
  let w = 0, prev = null;
  for (const ch of text) {
    const g = font.charToGlyph(ch);
    if (prev) { try { w += (font.getKerningValue(prev, g) * size) / font.unitsPerEm; } catch { /* no kerning table */ } }
    w += (g.advanceWidth * size) / font.unitsPerEm + track * size; prev = g;
  }
  return w;
}
export const displayFont = (ctx, weight) => loadFont(ctx.faces.find((f) => f.role === 'display' && f.weight === weight && f.style !== 'italic').stem);
export { loadFont, outline, capHeight };
// greedy word wrap into explicit lines, so the line count laid out is the line count that renders
export function wrap(font, text, size, maxW, track = 0) {
  const words = text.split(/\s+/), lines = []; let cur = '';
  for (const w of words) { const t = cur ? `${cur} ${w}` : w; if (cur && adv(font, t, size, track) > maxW) { lines.push(cur); cur = w; } else cur = t; }
  if (cur) lines.push(cur);
  return lines;
}

// ---- html bits ----
// an absolutely placed block: x, y, optional w, h; cls is a type token (c-micro, c-head, c-body, c-title)
export const blk = (x, y, w, h, cls, inner, style = '', tag = 'div') => `<${tag} class="a ${cls}" style="left:${x}px;top:${y}px;${w ? `width:${w}px;` : ''}${h ? `height:${h}px;` : ''}${style}">${inner}</${tag}>`;
export const fill = (x, y, w, h, bg, extra = '') => `<div class="a" style="left:${x}px;top:${y}px;width:${w}px;height:${h}px;background:${bg};${extra}"></div>`;

// ---- svg bits (page coordinates; draw into the full-page overlay) ----
export const stxt = (x, y, text, { anchor = 'start', col, w = 600, size = 12, style = '' } = {}) => `<text x="${f2(x)}" y="${f2(y)}" text-anchor="${anchor}" font-size="${size}" font-weight="${w}" fill="${col}"${style ? ` style="${style}"` : ''}>${A(text)}</text>`;
const slash = (x, y, col) => `<path d="M${f2(x - 2.83)} ${f2(y + 2.83)}L${f2(x + 2.83)} ${f2(y - 2.83)}" stroke="${col}" stroke-width="1" fill="none"/>`;
const ln = (x1, y1, x2, y2, col) => `<path d="M${f2(x1)} ${f2(y1)}L${f2(x2)} ${f2(y2)}" stroke="${col}" stroke-width="1" fill="none"/>`;
const labelW = (t) => adv(chromeFont(600), t, 12);

// a horizontal dimension: line at y from x1 to x2, 45 degree slashes at the ends, the label centred with the line broken 6 px either side.
// obj = y of the object edge: extension lines start 4 px off it and run 6 px past the dimension line. Under 8x the label sits outside, past the far tick.
export function dimH(ctx, { x1, x2, y, label, col, qcol, obj, outside, labelAt, above = false }) {
  const tw = labelW(label), mid = (x1 + x2) / 2, out = outside ?? (x2 - x1 < 8 * xOf(ctx) || x2 - x1 < tw + 12 + 16);
  let s = '';
  if (obj != null) { const sg = Math.sign(y - obj) || 1; for (const X of [x1, x2]) s += ln(X + 0.5, obj + sg * 4, X + 0.5, y + sg * 6, qcol); }
  if (above) s += ln(x1, y, x2, y, col) + stxt(mid, y - 8, label, { anchor: 'middle', col }); // a short line: the label sits over it, unbroken
  else if (out)s += ln(x1, y, x2, y, col) + stxt(labelAt ?? x2 + 8, y + 4, label, { col });
  else s += ln(x1, y, mid - tw / 2 - 6, y, col) + ln(mid + tw / 2 + 6, y, x2, y, col) + stxt(mid, y + 4, label, { anchor: 'middle', col });
  return s + slash(x1, y, col) + slash(x2, y, col);
}
// a vertical dimension: line at x from y1 to y2, label to its left, right-aligned with a 6 px gap, centred on the midpoint.
export function dimV(ctx, { x, y1, y2, label, col, qcol, obj, labelAt, labelY, right = false }) {
  const small = y2 - y1 < 8 * xOf(ctx);
  let s = '';
  if (obj != null) { const sg = Math.sign(x - obj) || 1; for (const Y of [y1, y2]) s += ln(obj + sg * 4, Y + 0.5, x + sg * 6, Y + 0.5, qcol); }
  s += ln(x + 0.5, y1, x + 0.5, y2, col) + slash(x + 0.5, y1, col) + slash(x + 0.5, y2, col);
  return s + stxt(labelAt ?? (right ? x + 8 : x - 6), labelY ?? (small ? y2 + 16 : (y1 + y2) / 2 + 4), label, { anchor: right ? 'start' : 'end', col });
}
// four 12 px L-marks, 6 px off the corners of a drawing
export function cropTicks(x, y, w, h, col) {
  const o = 6, a = 12, c = (cx, cy, dx, dy) => `M${f2(cx + dx * a)} ${f2(cy + 0.5)}H${f2(cx)}V${f2(cy + dy * a)}`;
  return `<path d="${c(x - o, y - o, 1, 1)}${c(x + w + o, y - o, -1, 1)}${c(x - o, y + h + o, 1, -1)}${c(x + w + o, y + h + o, -1, -1)}" stroke="${col}" stroke-width="1" fill="none"/>`;
}

// ---- the x-ruler (spec 3.1) ----
// pieces: [{x1, x2, ink, quiet, hair}] one per ground region (default: the whole 56 to 1064 line on the page ground).
// live: [leftPx, rightPx] the hero's extent: two 24 px ink marks, a 3 px run between them, and their positions in x (12 px, weight 600).
// edgeAnchor: both live labels stay inside their marks (left starts at its mark, right ends at its mark), for a hero whose edges are the ruler's own ends.
// endAnchor: the right live label ends at its mark (and the mark steps 1 px inside) when the hero's edge is a boundary between two pieces.
// Ordinary labels (every 16x, 12 px) are dropped when their centre is within 44 px of a live label's centre, or their text would touch it.
export function ruler(ctx, { uid, pieces, live, endAnchor = false, edgeAnchor = false }) {
  const x = xOf(ctx), R = roles(ctx), y = G.rulerY, LS = 12;
  pieces = pieces || [{ x1: G.L, x2: G.R, ink: R.ink, quiet: R.quiet, hair: R.hair }];
  const n = Math.round(G.W / x), pieceAt = (px) => pieces.find((p) => px >= p.x1 - 0.01 && px <= p.x2 + 0.01) || pieces[0];
  const lo = Math.min(...pieces.map((p) => p.x1)), hi = Math.max(...pieces.map((p) => p.x2));
  const lives = live ? live.map((px, i) => {
    const end = (endAnchor || edgeAnchor) && i === 1, start = edgeAnchor && i === 0, text = i === 0 && half((px - G.L) / x) === 0 ? '0' : `${posX(ctx, px)}x`, tw = adv(chromeFont(600), text, LS), mx = end ? px - 1 : px;
    const a = end ? mx + 1 - tw : start ? mx : mx + 0.5 - tw / 2, b = end ? mx + 1 : start ? mx + tw : mx + 0.5 + tw / 2;
    return { px: mx, text, end, start, wide: endAnchor && i === 1, a, b, c: (a + b) / 2 };
  }) : [];
  let out = '';
  pieces.forEach((p, i) => {
    const id = `rc-${uid}-${i}`, t = { h: '', q: '', i: '' };
    for (let k = 0; k <= n; k++) {
      const px = G.L + k * x; if (px < p.x1 - 0.01 || px > p.x2 + 0.01) continue;
      const cls = k % 16 === 0 ? 'i' : k % 4 === 0 ? 'q' : 'h', hgt = cls === 'i' ? 10 : cls === 'q' ? 6 : 3;
      t[cls] += `M${f2(px + 0.5)} ${y}v${-hgt}`;
    }
    out += `<clipPath id="${id}"><rect x="${p.x1}" y="${y - 26}" width="${p.x2 - p.x1 + 1}" height="32"/></clipPath><g clip-path="url(#${id})">`
      + `<path d="${t.h}" stroke="${p.hair}" stroke-width="1" fill="none"/><path d="${t.q}" stroke="${p.quiet}" stroke-width="1" fill="none"/><path d="${t.i}" stroke="${p.ink}" stroke-width="1" fill="none"/>`
      + `<rect x="${p.x1}" y="${y}" width="${p.x2 - p.x1 + 1}" height="1" fill="${p.ink}"/>`;
    if (live) {
      out += `<rect x="${f2(live[0])}" y="${y - 1}" width="${f2(live[1] - live[0] + 1)}" height="3" fill="${p.ink}"/>`;
      // (endAnchor: the right-hand mark is 2 px, so it reads as its own mark beside the next piece's repeat)
      for (const l of lives) out += `<rect x="${f2(l.wide ? l.px - 1 : l.px)}" y="${y - 23}" width="${l.wide ? 2 : 1}" height="25" fill="${p.ink}"/>`;
      // a hero edge on a boundary between two pieces: the next piece repeats the mark in its own ink, so it reads against the column edge
      for (const l of lives) if (l.end && Math.abs(p.x1 - (l.px + 1)) < 0.6) out += `<rect x="${p.x1}" y="${y - 23}" width="2" height="25" fill="${p.ink}"/>`;
    }
    out += '</g>';
  });
  // an ordinary label is kept only if it is clear of every live label and sits on one ground
  const clear = (px, hw) => !lives.some((l) => Math.abs(px - l.c) < 44 || (px + hw > l.a - 10 && px - hw < l.b + 10));
  for (let k = 0; k <= n; k += 16) {
    const px = G.L + k * x, hw = adv(chromeFont(400), String(k), LS) / 2;
    if (!clear(px, hw)) continue;
    // a label over the gap between two pieces would sit on the wrong ground (the outer ends of the ruler may overhang)
    if (!pieces.some((p) => px - hw >= (p.x1 === lo ? p.x1 - 12 : p.x1) && px + hw <= (p.x2 === hi ? p.x2 + 13 : p.x2) + 1)) continue;
    out += stxt(px + 0.5, G.labelY + 11, String(k), { anchor: 'middle', col: pieceAt(px).quiet, w: 400 });
  }
  const end = G.L + n * x;
  if (clear(end + 8, 4)) out += stxt(end + 4, G.labelY + 11, 'x', { col: pieceAt(end).quiet, w: 400 });
  for (const l of lives) out += stxt(l.px + (l.end ? 1 : l.start ? 0 : 0.5), G.labelY + 11, l.text, { anchor: l.end ? 'end' : l.start ? 'start' : 'middle', col: pieceAt(l.px).ink, w: 600, size: LS });
  return out;
}

// ---- the thumb tab (spec 3.3): n is the section number; inverted on a page whose right edge is a dark field ----
export function tab(ctx, n, { inverted = false } = {}) {
  const R = roles(ctx), bg = inverted ? R.ground : R.dark, fg = inverted ? R.ink : R.darkInk;
  return `<div class="a tab" style="left:${G.tabX}px;top:${G.top + (n - 1) * G.tabPitch}px;width:${G.tabW}px;height:${G.tabH}px;background:${bg};color:${fg}">${n}</div>`;
}

// ---- the running head (spec 2.6). parts: [{x1, x2, col, slots: [[x, text], ...]}]; the last part carries the folio at its right edge ----
export function head(ctx, id, parts, { folio = true } = {}) {
  const p = ctx.pages.find((q) => q.id === id), R = roles(ctx);
  const sec = p.section ? `${p.section.n} ${p.section.title}` : p.title;
  const dflt = [{ x1: G.L, x2: G.R, col: R.ink, slots: [[G.col[0], `${ctx.brand.name} brand standards`], [G.col[3], sec], [G.col[6], p.title]] }];
  parts = parts || dflt;
  return parts.map((q, i) => fill(q.x1, 56, q.x2 - q.x1, 1, q.col)
    + q.slots.map(([sx, t]) => blk(sx, 32, 0, 16, 'c-head nw', A(t), `color:${q.col}`)).join('')
    + (folio && i === parts.length - 1 ? blk(q.x2 - 60, 32, 60, 16, 'c-micro nw', pad3(ctx.pageNo(id)), `text-align:right;font-weight:600;color:${q.col}`) : '')).join('');
}

// ---- the page wrapper ----
export function page(ctx, id, { bg, body, svg = '', cls = '' }) {
  return `<section class="pg pg24 ${cls}" data-page="${id}" style="background:${bg}">${body}<svg class="ov" width="${ctx.size.w}" height="${ctx.size.h}" viewBox="0 0 ${ctx.size.w} ${ctx.size.h}" aria-hidden="true">${svg}</svg></section>`;
}

// the brand's logo on a field: the colourway whose ground is that field, else mono-dark
export function colourwayFor(ctx, hex) {
  const cws = ctx.brand.logo.colourways;
  return Object.keys(cws).find((k) => cws[k].ground.toLowerCase() === hex.toLowerCase()) || 'mono-dark';
}
// The sample brand art plates (brands/<slug>/art.js upstream) are not carried into the app: a project brand has none, so every page takes its no-art path.
export const artOf = () => null;
export const dateLong = (iso) => new Date(iso + 'T00:00:00Z').toLocaleDateString('en-AU', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });

// a contrast pair's name: "Foreground on Ground". A tone that already names its ground ("Quiet on White") is not given it twice.
export const pairName = (ctx, p) => {
  const fg = ctx.byId[p.fg].name, bg = ctx.byId[p.bg].name;
  return fg.endsWith(` on ${bg}`) || fg.endsWith(` on ${bg.toLowerCase()}`) ? fg : `${fg} on ${bg}`;
};

// slot edition: a brand string is a sentinel until it is written out, and a control prints its short label. Measure that label, not the sentinel,
// so a button, a segment or a choice is wide enough for what it will show. Showcase strings come back as they are.
export const slotLabel = (ctx, s) => (ctx.edition === 'slot' && ctx.placeholders ? ctx.placeholders.label(s) : s);
