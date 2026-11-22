// Theme 31, Contact sheet: shared helpers. Colours come from ctx roles and the brand's data; no brand colour id, hex or name is written here.
import { esc } from '../../engine/brand.js';
import { loadFont } from '../../engine/nodeFont.js';

export const A = esc;
export const PW = 1500, PH = 1000;
const r2 = (n) => Math.round(n * 100) / 100;
export const px = (n) => `${r2(n)}px`;

// ---- colour: the dark edition's roles, and the film derived from the ground (spec 4.1, 4.3) ----
export function tokens(ctx) {
  const R = ctx.roles.dark, C = ctx.C, g = C.toOklch(R.surface);
  const ok = (L, c) => C.fromOklch(L, c, g.H);
  const clamped = g.L + 0.07 > 0.40;
  const film = ok(clamped ? 0.40 : g.L + 0.07, Math.min(g.C, 0.012));
  const hole = ok(clamped ? 0.14 : Math.max(0.14, g.L - 0.06), Math.min(g.C, 0.008));
  const gate = ok(Math.min(0.5, g.L + 0.16), Math.min(g.C, 0.012));
  const dL = (a, b) => Math.abs(C.toOklch(a).L - C.toOklch(b).L);
  if (dL(film, R.surface) < 0.06 - 1e-9 && !clamped) throw new Error('31-contact: the film is too close to the ground');
  if (dL(film, hole) < 0.10 - 1e-9) throw new Error('31-contact: the sprocket holes are too close to the film');
  const edge = [R.quiet, R.textSoft, R.text].find((c) => ctx.ratio(c, film) >= 4.5) || R.text;
  const strongOk = ctx.ratio(R.action, film) >= 3 && C.toOklch(R.action).C >= 0.08;
  const loop = strongOk ? R.action : R.text;
  return { R, ground: R.surface, ink: R.text, soft: R.textSoft, quiet: R.quiet, hair: R.divider, panel: R.raised, strong: R.action, film, hole, gate, edge, loop };
}

// ---- brand colours by luminance, never by id ----
export function palette(ctx) {
  const B = ctx.brand, C = ctx.C;
  const cols = B.colours.map((c) => ({ ...c, lum: C.luminance(c.hex) })).sort((a, b) => a.lum - b.lum);
  const dark = cols[0], light = cols[cols.length - 1];
  const action = B.colours.find((c) => c.role === 'action') || dark;
  const panel = B.colours.find((c) => c.role === 'panel') || null;
  const inkOn = (bg) => ctx.textOn(bg, { size: 24, prefer: ctx.ratio(light.hex, bg) >= ctx.ratio(dark.hex, bg) ? light.hex : dark.hex });
  // the quietest brand tone that still reads at 4.5 on this ground, else the ink
  const quietOn = (bg) => {
    const ok = [...(B.tones || []), ...B.colours].map((t) => t.hex).filter((h) => ctx.ratio(h, bg) >= 4.5 && h.toLowerCase() !== inkOn(bg).toLowerCase());
    const tones = (B.tones || []).filter((t) => /quiet/.test(t.role) && ctx.ratio(t.hex, bg) >= 4.5).map((t) => t.hex);
    return tones.sort((a, b) => ctx.ratio(a, bg) - ctx.ratio(b, bg))[0] || ok[0] || inkOn(bg);
  };
  const softOn = (bg) => { const t = (B.tones || []).find((x) => /reading/.test(x.role)); return t && ctx.ratio(t.hex, bg) >= 4.5 ? t.hex : inkOn(bg); };
  return { dark, light, action, panel, inkOn, quietOn, softOn };
}
// the colourway key drawn on a given ground, else the one whose name colour reads best on it
export function cwOn(ctx, bg) {
  const cw = ctx.brand.logo.colourways, keys = Object.keys(cw);
  return keys.find((k) => cw[k].ground.toLowerCase() === bg.toLowerCase()) || keys.reduce((a, b) => (ctx.ratio(cw[b].name, bg) > ctx.ratio(cw[a].name, bg) ? b : a));
}

// ---- font metrics (opentype advance widths plus kerning, as outline() does) ----
export function fontOf(ctx, role, weight) {
  if (role === 'edge') return loadFont('InstrumentSans-75-600');
  if (role === 'chrome') return loadFont(weight >= 500 ? 'InstrumentSans-100-500' : 'InstrumentSans-100-400');
  const fs = ctx.faces.filter((x) => x.role === role && x.style !== 'italic');
  const want = weight ?? (role === 'display' ? ctx.weights.heading : ctx.weights.regular);
  return loadFont((fs.find((x) => x.weight === want) || fs[0]).stem);
}
// slot edition: the words a placeholder prints in its compact form, so a layout can measure what is on the page (the string stays whole for printing)
export const shown = (ctx, s) => (ctx.placeholders
  ? String(s).replace(/([-]+)/g, (m, g) => { const e = ctx.placeholders.entries[Number([...g].map((c) => c.charCodeAt(0) - 0xE010).join(''))]; return e.bare ? e.label : `${e.label}, ${e.length}`; })
  : String(s));
export function adv(ctx, role, text, size, track = 0, weight) {
  const font = fontOf(ctx, role, weight); let x = 0, prev = null;
  for (const ch of text) {
    const g = font.charToGlyph(ch);
    if (prev) { try { x += font.getKerningValue(prev, g) * size / font.unitsPerEm; } catch { /* no kerning table */ } }
    x += g.advanceWidth * size / font.unitsPerEm + track * size; prev = g;
  }
  return x;
}
// top of a line box so the first baseline lands on `baseline` (the browser centres the content area in the line, from hhea)
export function lineTop(ctx, role, size, line, baseline, weight) {
  const font = fontOf(ctx, role, weight), h = font.tables.hhea, upm = font.unitsPerEm;
  const asc = h.ascender / upm * size, desc = -h.descender / upm * size;
  return baseline - ((line - (asc + desc)) / 2 + asc);
}
// greedy wrap into explicit lines
export function wrap(ctx, role, text, size, maxW, track = 0, weight) {
  const words = text.split(/\s+/), out = []; let cur = '';
  for (const w of words) { const t = cur ? cur + ' ' + w : w; if (cur && adv(ctx, role, t, size, track, weight) > maxW) { out.push(cur); cur = w; } else cur = t; }
  if (cur) out.push(cur); return out;
}
// the largest size (stepping down by `step`) at which the text wraps into at most `maxLines`
export function fitLines(ctx, role, text, from, maxW, maxLines, track = 0, weight, step = 4, min = 24) {
  let s = from, lines = wrap(ctx, role, text, s, maxW, track, weight);
  while ((lines.length > maxLines || lines.some((l) => adv(ctx, role, l, s, track, weight) > maxW)) && s > min) { s -= step; lines = wrap(ctx, role, text, s, maxW, track, weight); }
  return { size: s, lines };
}

// the brand line split into two lines: at a full stop if one falls before the end, else the word boundary nearest 60% of the characters
export function splitLine(text) {
  const stop = text.search(/[.!?]\s/);
  if (stop >= 0) return [text.slice(0, stop + 1), text.slice(stop + 2)];
  const words = text.split(/\s+/); let best = 1, bd = 1e9, n = 0;
  words.forEach((w, i) => { n += w.length + (i ? 1 : 0); if (i < words.length - 1 && Math.abs(n - text.length * 0.6) < bd) { bd = Math.abs(n - text.length * 0.6); best = i + 1; } });
  return [words.slice(0, best).join(' '), words.slice(best).join(' ')];
}
// fitLines, then a lone last word is pulled into a balanced two-line split when that still fits (no "keep." on a line of its own)
export function fitBalanced(ctx, role, text, from, maxW, maxLines, track = 0, weight, step = 4, min = 24) {
  const f = fitLines(ctx, role, text, from, maxW, maxLines, track, weight, step, min);
  if (f.lines.length === 2 && !f.lines[1].includes(' ') && maxLines >= 2) {
    const s = splitLine(text);
    if (s.length === 2 && s.every((l) => adv(ctx, role, l, f.size, track, weight) <= maxW)) return { size: f.size, lines: s };
  }
  return f;
}

// ---- placing text: x, then y (top of the line box) or baseline ----
export function put(ctx, { x, y, w, h, cls = '', html, role = 'body', size = 14, line = 22, baseline, weight, align = 'left', style = '' }) {
  const top = baseline != null ? lineTop(ctx, role, size, line, baseline, weight) : y;
  return `<div class="a ${cls}" style="left:${px(x)};top:${px(top)};${w ? `width:${px(w)};` : ''}${h ? `height:${px(h)};` : ''}${align !== 'left' ? `text-align:${align};` : ''}${style}">${html}</div>`;
}
export const hline = (x, y, w) => `<div class="a" style="left:${x}px;top:${y}px;width:${w}px;height:1px;background:var(--hair)"></div>`;

// ---- the roll: which setup each frame holds (spec 4.4). Frame n is page n of the full book; the gate pages circle 1, 3, 8, 14, 18 and 27 ----
// A frame is the brand's own photograph (['photo', k, v]: the k-th shot that has a photo, v the bracket crop) or one setup's render. Photographs fall on frames 1 and 3
// (the cover's and the intro's own frame, so the circled frame is a picture) and then every third frame or so; none sits next to another of the same shot, and a run
// of six frames never holds one shot twice when the brand has six or more. With fewer photographs the shots come round again, as the 1.10 and 1.22 crops (spec 4.4).
// The shot order in brand.json is the book's choice: its first shot is the one the intro circles.
const PHOTO_FRAMES = [1, 3, 5, 7, 10, 13, 16, 19, 22, 25, 28, 31, 34];
// Three photographs: the cycle is broken so each shows on four or five of the six gate pages, not one on all six and one on two (no two neighbours the same shot)
const photoOrder = (n) => (n >= 6 ? [3, 0, 1, 4, 2, 5] : n === 3 ? [1, 0, 2, 0, 2, 1, 2, 0, 1, 2, 1, 0, 2] : Array.from({ length: n }, (_, i) => (i + 1) % n));
const SETUPS = {
  2: 'poster', 4: 'sheets', 6: 'app', 8: 'book', 9: 'laptop', 11: 'card', 12: 'night', 14: 'tote', 15: 'app', 17: 'laptop', 18: 'letter', 20: 'night', 21: 'card', 23: 'sheets',
  24: 'tote', 26: 'app', 27: 'lightbox', 29: 'poster', 30: 'letter', 32: 'book', 33: 'laptop', 35: 'card', 36: 'night',
};
const rollCache = new WeakMap();
export function rollOf(ctx) {
  if (rollCache.has(ctx)) return rollCache.get(ctx);
  const n = Math.max(1, (ctx.brand.imagery.shots || []).filter((s) => s.photo).length), order = photoOrder(n), seen = {}, r = {};
  for (const [f, s] of Object.entries(SETUPS)) r[f] = [s, 0];
  PHOTO_FRAMES.forEach((f, i) => { const k = order[i % order.length], c = seen[k] = (seen[k] ?? -1) + 1; r[f] = ['photo', k, n < 6 ? c % 3 : 0]; });
  rollCache.set(ctx, r);
  return r;
}
export const frameLabel = (f) => (f === -1 ? '00' : f === 0 ? '0' : String(f).padStart(2, '0'));

// ---- the grease-pencil loop (spec 4.3): one tapered pass of a pencil, a filled outline ----
const hash32 = (s) => { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; };
const mulberry32 = (a) => () => { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
export function loopPath(slug, pageId, cx0 = 633, cy0 = 158) {
  const rnd = mulberry32(hash32(slug + ':' + pageId));
  const dx = -3 + 6 * rnd(), dy = -3 + 6 * rnd(), rho = (-4.5 + 3 * rnd()) * Math.PI / 180, phi = 2 * Math.PI * rnd();
  // each page's own hand: where the pencil lands (a 44 degree spread), how far the tail overruns the start, how hard it pressed, a slightly different oval
  const T0 = 128 + 44 * rnd(), T1 = T0 + 360 + 8 + 26 * rnd(), Wmax = 6 + 3 * rnd(), grow = 0.025 + 0.025 * rnd();
  const cx = cx0 + dx, cy = cy0 + dy, a = 126 * (0.97 + 0.06 * rnd()), b = 94 * (0.97 + 0.06 * rnd()), n = 3 + 0.5 * rnd(), e = 2 / n, step = 3;
  const sg = (v) => (v < 0 ? -1 : 1), cr = Math.cos(rho), sr = Math.sin(rho);
  const pts = [];
  for (let t = T0; t <= T1 + 1e-9; t += step) {
    const s = (t - T0) / (T1 - T0), th = t * Math.PI / 180;
    const g = 1 + grow * s, w = 1 + 0.012 * Math.sin(2 * th + phi);
    const ux = a * g * w * sg(Math.cos(th)) * Math.abs(Math.cos(th)) ** e, uy = b * g * w * sg(Math.sin(th)) * Math.abs(Math.sin(th)) ** e;
    const W = Math.max(1.2, Wmax * Math.min(1, s / 0.06) ** 0.5 * Math.min(1, (1 - s) / 0.14) ** 0.8 * (0.94 + 0.12 * Math.sin(Math.PI * s)));
    pts.push({ x: cx + ux * cr - uy * sr, y: cy + ux * sr + uy * cr, W });
  }
  // the broken edge of a wax pencil: each side of the stroke wanders by up to 0.5 px on a two to three point grain, still one vector outline
  const grain = () => { const k = []; for (let i = 0; i <= Math.ceil(pts.length / 2) + 1; i++) k.push(2 * rnd() - 1); return (i) => { const f = i / 2, i0 = Math.floor(f), u = f - i0; return k[i0] * (1 - u) + k[i0 + 1] * u; }; };
  const gL = grain(), gR = grain();
  const L = [], R = [];
  pts.forEach((p, i) => {
    const p0 = pts[Math.max(0, i - 1)], p1 = pts[Math.min(pts.length - 1, i + 1)];
    let tx = p1.x - p0.x, ty = p1.y - p0.y; const m = Math.hypot(tx, ty) || 1; tx /= m; ty /= m;
    const am = Math.min(1, p.W / 3) * 0.5, wl = p.W / 2 + am * gL(i), wr = p.W / 2 + am * gR(i);
    L.push([p.x - ty * wl, p.y + tx * wl]); R.push([p.x + ty * wr, p.y - tx * wr]);
  });
  const poly = [...L, ...R.reverse()], N = poly.length, al = 0.5;
  const d = (u, v) => Math.max(1e-6, Math.hypot(u[0] - v[0], u[1] - v[1]) ** al);
  let out = `M${r2(poly[0][0])} ${r2(poly[0][1])}`;
  for (let i = 0; i < N; i++) {
    const P0 = poly[(i - 1 + N) % N], P1 = poly[i], P2 = poly[(i + 1) % N], P3 = poly[(i + 2) % N];
    const d1 = d(P0, P1), d2 = d(P1, P2), d3 = d(P2, P3);
    const B1 = [0, 1].map((k) => (d1 * d1 * P2[k] - d2 * d2 * P0[k] + (2 * d1 * d1 + 3 * d1 * d2 + d2 * d2) * P1[k]) / (3 * d1 * (d1 + d2)));
    const B2 = [0, 1].map((k) => (d3 * d3 * P1[k] - d2 * d2 * P3[k] + (2 * d3 * d3 + 3 * d3 * d2 + d2 * d2) * P2[k]) / (3 * d3 * (d3 + d2)));
    out += `C${r2(B1[0])} ${r2(B1[1])} ${r2(B2[0])} ${r2(B2[1])} ${r2(P2[0])} ${r2(P2[1])}`;
  }
  return out + 'Z';
}

// ---- the strip (spec 4.1, 4.2): film, holes, six frames, edge print; the loop goes over it ----
export const GX = [60, 294, 528, 762, 996, 1230];
export function strip(ctx, T, pageId, n, head, frameHtml) {
  const O = 48;  // the strip's own origin on the page
  let holes = '';
  for (let j = 0; j < 48; j++) { const x = 62.625 + 29.25 * j - 6 - O; holes += `<rect x="${r2(x)}" y="${54 - O}" width="12" height="17" rx="2.5"/><rect x="${r2(x)}" y="${245 - O}" width="12" height="17" rx="2.5"/>`; }
  const holeSvg = `<svg class="a" style="left:0;top:0" width="1404" height="220" viewBox="0 0 1404 220" aria-hidden="true" fill="${T.hole}">${holes}</svg>`;
  let frames = '', nums = '';
  GX.forEach((gx, i) => {
    const f = n - 3 + i + 1, lx = gx - O, ly = 88 - O;
    if (f > 36) return;                                    // the roll has ended: plain film, no gate
    const roll = rollOf(ctx)[f];
    if (!roll || f < 1) return;                            // before frame 1: the film leader, plain film with its holes, no gate and no number
    frames += `<div class="a fr" style="left:${lx}px;top:${ly}px;width:210px;height:140px">${frameHtml(roll[0], roll[1], 210, 140, f, roll[2])}</div>`;
    nums += put(ctx, { x: gx + 105 - 40 - O, baseline: 240 - O, w: 80, h: 12, cls: 'edge', role: 'edge', size: 12, line: 12, weight: 600, align: 'center', html: frameLabel(f) + '<i class="tri"></i>' });
  });
  const hd = (x, t, raw) => put(ctx, { x: x - O, baseline: 84 - O, w: 196, h: 16, cls: 'edge', role: 'edge', size: 12, line: 16, weight: 600, style: 'line-height:16px;overflow:hidden;text-overflow:ellipsis;white-space:pre', html: raw ? t : A(t) });
  // the stock code: the film's name, its speed and the frame code, with the edge-print arrow
  const stock = `${A(ctx.brand.name.toUpperCase())} 400<i class="tri"></i>${String(n).padStart(2, '0')}A`;
  const heads = hd(68, head[0]) + hd(302, stock, true) + hd(770, head[1]) + hd(1238, head[2]);
  return `<div class="a strip" style="left:${O}px;top:${O}px;width:1404px;height:220px;background:${T.film};overflow:hidden">${holeSvg}${frames}${nums}${heads}</div>`;
}
export const loopSvg = (T, d) => `<svg class="a" style="left:0;top:0;pointer-events:none" width="${PW}" height="${PH}" viewBox="0 0 ${PW} ${PH}" aria-hidden="true"><path d="${d}" fill="${T.loop}"/></svg>`;

// the head cells of the running head
export function headCells(ctx, id) {
  const B = ctx.brand, p = ctx.pages.find((x) => x.id === id);
  const mon = new Date(B.version.date + 'T00:00:00Z').toLocaleDateString('en-AU', { month: 'long', year: 'numeric', timeZone: 'UTC' });
  const a = `${B.name}  GUIDELINES ${B.version.number}`;
  if (id === 'cover') return [a, B.city || '', mon];
  // the page shows prints, not the card the engine's page list is named for
  return [a, p.section ? p.section.title : '', id === 'business-card' ? 'Print' : p.title];
}

// ---- the caption column (spec 4.5) ----
export function captionHead(ctx, { x = 996, no, title, text, head = 316, baseline = 348, titleY = 372, textY = 400, lines = 3, w = 444 }) {
  return put(ctx, { x, baseline, w, h: 40, cls: 'fno num', role: 'edge', size: 40, line: 40, weight: 600, html: A(no) })
    + put(ctx, { x, y: titleY, w, h: 24, cls: 'ct', role: 'body', size: 16, line: 24, weight: 500, html: A(title) })
    + put(ctx, { x, y: textY, w, h: 22 * lines, cls: 'cx', html: A(text) });
}
export const foot = (ctx) => {
  const B = ctx.brand, mon = new Date(B.version.date + 'T00:00:00Z').toLocaleDateString('en-AU', { month: 'long', year: 'numeric', timeZone: 'UTC' });
  return put(ctx, { x: 60, baseline: 968, w: 700, h: 16, cls: 'ft', role: 'chrome', size: 12, line: 16, weight: 400, html: A(`${B.name} brand guidelines, version ${B.version.number}, ${mon}`) });
};

// the page: strip, loop, body, foot
// slot edition: pages whose brand copy sits in fixed rows take the compact placeholder form (ph-tight on the page)
export const PH_TIGHT = new Set(["intro", "write-this", "messaging", "logo", "typefaces", "hierarchy", "type-in-use", "email-signature"]);
export function shell(ctx, id, T, body, frameHtml) {
  const n = ctx.pageNo(id), slug = ctx.slug || ctx.brand.slug;
  return `<section class="pg${ctx.placeholders && PH_TIGHT.has(id) ? " ph-tight" : ""}" data-page="${id}">${strip(ctx, T, id, n, headCells(ctx, id), frameHtml)}${loopSvg(T, loopPath(slug, id))}${body}${foot(ctx)}</section>`;
}
