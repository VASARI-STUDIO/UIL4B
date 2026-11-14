// Theme 22, Ticket: shared helpers. Every page is a roll ticket on a dark bar top. The ticket geometry, the stub and the barcode are fixed here;
// every colour is a role computed from the brand's own colours, pairs and tones, so no colour id, hex or brand name is written in this theme.
import { esc } from '../../engine/brand.js';
import { loadFont } from '../../engine/nodeFont.js';

export const A = esc;
export const px = (n) => `${Math.round(n * 100) / 100}px`;
const r2 = (n) => Math.round(n * 100) / 100;

// ---- the fixed ticket (spec section 2): the same on every page ----
export const T = { x: 32, y: 32, w: 1216, h: 468, perf: 976, stubX: 976, stubW: 272, inX: 1016, inW: 192, bodyW: 944, notchR: 16, holeR: 2 };
export const PAGE = { w: 1280, h: 720 };

// ---- Code 128 B: the barcode on the stub encodes the page id, so it is a real barcode and counts something ----
// widths of bar, space, bar, space, bar, space for symbol values 0 to 106 (the stop has a seventh element)
const P128 = ('212222 222122 222221 121223 121322 131222 122213 122312 132212 221213 221312 231212 112232 122132 122231 113222 123122 123221 223211 221132 '
  + '221231 213212 223112 312131 311222 321122 321221 312212 322112 322211 212123 212321 232121 111323 131123 131321 112313 132113 132311 211313 '
  + '231113 231311 112133 112331 132131 113123 113321 133121 313121 211331 231131 213113 213311 213131 311123 311321 331121 312113 312311 332111 '
  + '314111 221411 431111 111224 111422 121124 121421 141122 141221 112214 112412 122114 122411 142112 142211 241211 221114 413111 241112 134111 '
  + '111242 121142 121241 114212 124112 124211 411212 421112 421211 212141 214121 412121 111143 111341 131141 114113 114311 411113 411311 113141 '
  + '114131 311141 411131 211412 211214 211232 2331112').split(' ');
// a pattern is 11 modules wide (the stop 13), its three bars always add to an even number, and no two are alike
if (P128.length !== 107 || P128.some((p, i) => [...p].reduce((s, d) => s + +d, 0) !== (i === 106 ? 13 : 11) || [...p].filter((_, k) => k % 2 === 0).reduce((s, d) => s + +d, 0) % 2)
  || new Set(P128).size !== 107) throw new Error('Code 128 pattern table is wrong');
export function code128(text) {
  const vals = [...text].map((c) => { const v = c.charCodeAt(0) - 32; if (v < 0 || v > 94) throw new Error(`Code 128 B cannot hold "${c}"`); return v; });
  const codes = [104, ...vals];
  codes.push(codes.reduce((s, v, i) => s + (i === 0 ? v : v * i), 0) % 103, 106);
  const runs = codes.flatMap((c) => [...P128[c]].map(Number));
  return { runs, modules: runs.reduce((s, n) => s + n, 0) };
}
// bars as SVG rects: module width is floor((box / modules) x 4) / 4, left-aligned in the box
export function barcodeRects(text, x, y, w, h, fill) {
  const { runs, modules } = code128(text), mw = Math.floor((w / modules) * 4) / 4;
  let cx = x, out = '';
  runs.forEach((n, i) => { if (i % 2 === 0) out += `<rect x="${r2(cx)}" y="${y}" width="${r2(n * mw)}" height="${h}"/>`; cx += n * mw; });
  return { svg: `<g fill="${fill}">${out}</g>`, width: modules * mw };
}

// Code 128 C (digit pairs): the printed ticket's barcode. 57 modules for four digits, so a bar can be 3 px wide where Code 128 B would need 0.75 px
// (the photograph's resampling turned those into moire). mw is the module width in px, kept as given.
export function barcodeRectsC(digits, x, y, mw, h, fill) {
  if (!/^\d+$/.test(digits) || digits.length % 2) throw new Error(`Code 128 C needs an even count of digits, got "${digits}"`);
  const codes = [105, ...digits.match(/../g).map(Number)];
  codes.push(codes.reduce((s, v, i) => s + (i === 0 ? v : v * i), 0) % 103, 106);
  const runs = codes.flatMap((c) => [...P128[c]].map(Number));
  let cx = x, out = '';
  runs.forEach((n, i) => { if (i % 2 === 0) out += `<rect x="${r2(cx)}" y="${y}" width="${r2(n * mw)}" height="${h}"/>`; cx += n * mw; });
  return { svg: `<g fill="${fill}">${out}</g>`, width: runs.reduce((s, n) => s + n, 0) * mw };
}

// ---- text ----
export const sentences = (s) => s.match(/[^.!?]+[.!?]+(?=\s|$)|[^.!?]+$/g)?.map((x) => x.trim()) || [s];
const WEIGHT_NAMES = { 100: 'Thin', 200: 'Extralight', 300: 'Light', 400: 'Regular', 500: 'Medium', 600: 'Semibold', 700: 'Bold', 800: 'Extrabold', 900: 'Black' };
export const weightName = (w) => WEIGHT_NAMES[w] || String(w);
export const listAnd = (xs) => (xs.length <= 1 ? xs.join('') : `${xs.slice(0, -1).join(', ')} and ${xs[xs.length - 1]}`);
export const longDate = (iso) => new Date(iso + 'T00:00:00Z').toLocaleDateString('en-AU', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });
export const oklchParts = (s) => /oklch\(([\d.]+) ([\d.]+) ([\d.]+)\)/.exec(s).slice(1, 4);
export const serialOf = (ctx, id) => String(ctx.pageNo(id)).padStart(3, '0');
// the id the barcode and the docket code are built from: the brand's slug without the build suffixes this export adds
export const slugOf = (ctx) => ctx.brand.slug.replace(/-r1(-\d+)?$/, '');

// ---- measuring (glyph advances plus kerning plus tracking, as outline() lays them out) ----
const faceOf = (ctx, role) => ctx.faces.find((x) => x.role === role && x.style !== 'italic');
// The engine's .ttf (measured here) and .woff2 (drawn by the browser) for one stem can differ in width (Anybody-62-800: 1.25 times), so each face's
// browser-to-ttf ratio is applied to every width taken from the .ttf. The ratios were measured in a headless browser, once, for the faces the sample
// brand sets; a face not listed is taken as 1.
const CALIB = { 'Anybody-62-800@62': 1.2487, 'Anybody-150-800@150': 1.0, 'WorkSans-400@100': 0.9933, 'WorkSans-500@100': 0.9937, 'WorkSans-600@100': 0.9942, 'GeistMono-400@100': 1.0 };
const calibOf = (ctx, role) => {
  const f = faceOf(ctx, role), stretch = role === 'display' ? (ctx.brand.fonts.display.stretch || 100) : 100;
  return CALIB[`${f.stem}@${stretch}`] || 1;
};
export function textWidth(ctx, role, text, size, track = 0) {
  const font = loadFont(faceOf(ctx, role).stem), k = calibOf(ctx, role);
  let x = 0, prev = null;
  for (const ch of text) {
    const g = font.charToGlyph(ch);
    if (prev) { try { x += font.getKerningValue(prev, g) * size / font.unitsPerEm * k; } catch { /* no kerning table */ } }
    x += g.advanceWidth * size / font.unitsPerEm * k + track * size; prev = g;
  }
  return x;
}
// ink width and left edge of a short run (the "Aa"), glyph outlines with tracking
export function inkWidth(ctx, role, text, size, track = 0) {
  const font = loadFont(faceOf(ctx, role).stem), k = calibOf(ctx, role);
  let x = 0, x1 = 1e9, x2 = -1e9, prev = null;
  for (const ch of text) {
    const g = font.charToGlyph(ch);
    if (prev) { try { x += font.getKerningValue(prev, g) * size / font.unitsPerEm * k; } catch { /* no kerning table */ } }
    const bb = g.getPath(x, 0, size).getBoundingBox(), gw = (bb.x2 - bb.x1) * k, gx = x + (bb.x1 - x) * k;
    if (isFinite(bb.x1) && bb.x2 > bb.x1) { x1 = Math.min(x1, gx); x2 = Math.max(x2, gx + gw); }
    x += g.advanceWidth * size / font.unitsPerEm * k + track * size; prev = g;
  }
  return { w: x2 - x1, x1 };
}
// where a line box must start so its first baseline lands on `baseline` (the browser centres the face's hhea ascent and descent in the line)
export function lineTop(ctx, role, size, line, baseline) {
  const font = loadFont(faceOf(ctx, role).stem), h = font.tables.hhea, upm = font.unitsPerEm;
  const asc = h.ascender / upm * size, desc = -h.descender / upm * size;
  return baseline - ((line - (asc + desc)) / 2 + asc);
}
// The spec's fit rule: break at sentence ends first, then take the largest size, from max down in 2 px steps, at which every line fits the box
// (with a 2% margin) and the line count is within maxLines. If nothing fits at min, one more line is allowed at min.
// the display tracking the brand's own type rule states ("minus 0.015 em"), else -0.015
export const trackOf = (ctx) => {
  const m = ((ctx.brand.type && ctx.brand.type.rules) || []).map((r) => /tracking at minus ([\d.]+) em/i.exec(r.do)).find(Boolean);
  return m ? -parseFloat(m[1]) : -0.015;
};
export function fitLines(ctx, text, { w, max, min, maxLines, track = trackOf(ctx), role = 'display', step = 2 }) {
  const sents = sentences(text);
  const wrap = (size) => {
    const lines = [], limit = w * 0.98, tw = (s) => textWidth(ctx, role, s, size, track);
    for (const s of sents) {
      if (tw(s) <= limit) { lines.push(s); continue; }
      let cur = '';
      for (const word of s.split(' ')) { const t = cur ? `${cur} ${word}` : word; if (cur && tw(t) > limit) { lines.push(cur); cur = word; } else cur = t; }
      if (cur) lines.push(cur);
    }
    return lines;
  };
  for (let size = max; size >= min; size -= step) { const lines = wrap(size); if (lines.length <= maxLines) return { size, lines }; }
  return { size: min, lines: wrap(min) };
}
// the fitted lines as a block: each line is its own nowrap block, so the line count laid out is the count that renders
export function fitBlock(ctx, text, { x, y, w, max, min, maxLines, color, track = trackOf(ctx), cls = 'disp', extra = '' }) {
  const f = fitLines(ctx, text, { w, max, min, maxLines, track });
  const lh = Math.round(f.size * 0.92 * 100) / 100;
  const html = `<div class="${cls} fit" style="left:${px(x)};top:${px(y)};width:${px(w)};font-size:${f.size}px;line-height:${lh}px;letter-spacing:${track}em;color:${color};${extra}">${f.lines.map((l) => `<span class="ln">${A(l)}</span>`).join('')}</div>`;
  return { html, size: f.size, lines: f.lines.length, height: lh * f.lines.length };
}

// the logo's letters merging is checked in the export-systems build (wordmark-check.mjs), which needs a browser; the server export has nothing to run here
export function checkWordmark() {}

// ---- colour roles (spec section 2), all computed from the brand ----
export function roles(ctx) {
  const C = ctx.C, cols = ctx.colours;
  const lum = (h) => C.luminance(h), L = (h) => C.toOklch(h).L;
  const action = cols.find((c) => c.role === 'action') || cols[0];
  const darkest = [...cols].sort((a, b) => L(a.hex) - L(b.hex))[0];
  // the darkest brand colour is the bar top; a brand with no dark colour gets a near-black in the action colour's hue
  const table = L(darkest.hex) <= 0.30 ? darkest.hex : C.fromOklch(0.19, 0.012, C.toOklch(action.hex).H);
  const passes = cols.filter((c) => ctx.ratio(c.hex, table) >= 2.0);
  const field = (ctx.ratio(action.hex, table) >= 2.0 ? action
    : [...passes].sort((a, b) => C.toOklch(b.hex).C - C.toOklch(a.hex).C)[0]
    || [...cols].sort((a, b) => lum(b.hex) - lum(a.hex))[0]).hex;
  const paper = [...cols].sort((a, b) => lum(b.hex) - lum(a.hex))[0].hex;
  const same = (a, b) => a.toLowerCase() === b.toLowerCase();
  // the ink on the field: the foreground of the brand pair printed on it with the best ratio, else the better of the table and the paper
  const onField = ctx.pairs.filter((p) => same(p.bgHex, field)).sort((a, b) => b.ratio - a.ratio)[0];
  const fieldInk = onField ? onField.fgHex : (ctx.ratio(table, field) >= ctx.ratio(paper, field) ? table : paper);
  if (ctx.ratio(fieldInk, field) < 4.5) throw new Error(`ticket: ink ${fieldInk} on field ${field} is under 4.5:1`);
  // quiet text on the bar top: the tone the brand pairs with it, else the paper mixed into the table until it reaches 4.6:1
  const toneOn = ctx.pairs.find((p) => same(p.bgHex, table) && ctx.tones.some((t) => t.id === p.fg));
  let quiet;
  if (toneOn) quiet = toneOn.fgHex;
  else {
    const a = C.toOklch(table), b = C.toOklch(paper);
    for (let k = 0.05; k <= 1.0001; k += 0.01) { quiet = C.fromOklch(a.L + (b.L - a.L) * k, a.C + (b.C - a.C) * k, a.H); if (ctx.ratio(quiet, table) >= 4.6) break; }
  }
  const R = { table, field, fieldInk, paper, quiet, hole: table, edge: quiet };
  // text on a given plate: the brand colour with the best ratio that passes
  R.inkOn = (bg, size = 13, weight = 400, what = '(Ticket text on a plate)') => {
    const best = cols.filter((c) => !same(c.hex, bg)).map((c) => c.hex).reduce((a, b) => (ctx.ratio(b, bg) > ctx.ratio(a, bg) ? b : a));
    ctx.pair(best, bg, { size, weight, what });
    return best;
  };
  R.nearTable = (hex) => ctx.ratio(hex, table) < 1.3;
  // the logo colourway drawn on a ground: the one whose ground equals it (colour first, then mono-dark), else the one whose name reads best
  R.colourwayOn = (bg) => {
    const cw = ctx.brand.logo.colourways, keys = Object.keys(cw);
    const order = ['colour', 'mono-dark', ...keys.filter((k) => k !== 'colour' && k !== 'mono-dark')];
    const eq = order.find((k) => same(cw[k].ground, bg)) || order.find((k) => ctx.ratio(cw[k].ground, bg) < 1.15);
    return eq || keys.reduce((a, b) => (ctx.ratio(cw[b].name, bg) > ctx.ratio(cw[a].name, bg) ? b : a));
  };
  // the same roles with the ticket printed on the paper colour and the bar-top colour as ink (a Stock ticket: stub, perforation, notches and barcode unchanged)
  R.onPaper = () => {
    if (ctx.ratio(table, paper) < 7) throw new Error(`ticket: ink ${table} on paper ${paper} is under 7:1`);
    return { ...R, field: paper, fieldInk: table };
  };
  return R;
}

// ---- the device: plates (HTML, so the checker can read the colour under text), then the SVG with holes, notches, edges and the barcode ----
// segments: [{ x, w, hex }] across the body (x from 32 to 976); a single segment is the whole body.
const holeRow = (x, y0, y1) => {
  const n = Math.round((y1 - y0) / 10) + 1, pitch = (y1 - y0) / (n - 1);
  return Array.from({ length: n }, (_, i) => `<circle cx="${x}" cy="${r2(y0 + i * pitch)}" r="${T.holeR}"/>`).join('');
};
// inset: the segments are separate tickets with the bar top showing between them (square corners, like the rest of the theme, and each with its own
// perforation 12 px inside its right edge, the last included when it stops short of the stub), instead of one strip joined by perforations
export function device(R, { segments, inset = false }) {
  const segs = segments || [{ x: T.x, w: T.bodyW, hex: R.field }];
  const plateOf = (s) => {
    const extra = inset && R.nearTable(s.hex) ? `box-shadow:inset 0 0 0 1px ${R.edge};` : '';
    return `<div class="pl" style="left:${s.x}px;top:${T.y}px;width:${s.w}px;height:${T.h}px;background:${s.hex};${extra}"></div>`;
  };
  const plates = segs.map(plateOf).join('')
    + `<div class="pl" style="left:${T.stubX}px;top:${T.y}px;width:${T.stubW}px;height:${T.h}px;background:${R.field}"></div>`;
  let svg = `<g fill="${R.hole}"><circle cx="${T.perf}" cy="${T.y}" r="${T.notchR}"/><circle cx="${T.perf}" cy="${T.y + T.h}" r="${T.notchR}"/>`
    + holeRow(T.perf, T.y + T.notchR + 12, T.y + T.h - T.notchR - 12);
  // joins between the colour tickets of a strip: the same holes, 12 px from the ticket's edges, no notches
  // (a ticket that is the bar top's own colour gets its holes ringed in the edge colour, or they could not be seen)
  if (inset) segs.forEach((s) => {
    if (s.x + s.w >= T.perf - 1) return;
    const row = holeRow(s.x + s.w - 12, T.y + 12, T.y + T.h - 12);
    svg += R.nearTable(s.hex) ? `<g stroke="${R.edge}" stroke-width="1">${row}</g>` : row;
  });
  else for (let i = 1; i < segs.length; i++) svg += holeRow(segs[i].x, T.y + 12, T.y + T.h - 12);
  svg += '</g>';
  // a segment that is nearly the bar top's colour gets a 1 px edge along its outer edges so the ticket's outline holds
  let edges = '';
  segs.forEach((s, i) => {
    if (inset || !R.nearTable(s.hex)) return;
    edges += `<rect x="${s.x}" y="${T.y}" width="${s.w}" height="1"/><rect x="${s.x}" y="${T.y + T.h - 1}" width="${s.w}" height="1"/>`;
    if (i === 0) edges += `<rect x="${s.x}" y="${T.y}" width="1" height="${T.h}"/>`;
  });
  return `<div class="plates">${plates}</div><svg class="tk" viewBox="0 0 ${PAGE.w} ${PAGE.h}" width="${PAGE.w}" height="${PAGE.h}" aria-hidden="true">${svg}<g fill="${R.edge}">${edges}</g></svg>`;
}

// ---- the stub: the only chrome. Fixed slots; the serial is the page number and the barcode encodes the page id ----
// the section and the page say the same word ("Layout" over "Layouts"): the second line is dropped
const sameWord = (a, b) => !!a && !!b && a.toLowerCase().replace(/s$/, '') === b.toLowerCase().replace(/s$/, '');
export function stub(ctx, R, id, { cover = false } = {}) {
  const B = ctx.brand, p = ctx.pages.find((x) => x.id === id), serial = serialOf(ctx, id), code = `${slugOf(ctx)}-${serial}`;
  const slot = (y, cls, text) => `<div class="st ${cls}" style="top:${y}px">${A(text)}</div>`;
  let h = '';
  // the cover's version, date and city sit in the dark zone, so its stub keeps only the label, the serial and the barcode
  if (cover) h += slot(72, 'c13 b', 'Brand guidelines');
  else h += slot(72, 'c13 b', B.name) + slot(90, 'c12', `Brand guidelines ${B.version.number}`) + slot(200, 'c13 b', p.section ? p.section.title : '') + (sameWord(p.section && p.section.title, p.title) ? '' : slot(218, 'c12 two', p.title));
  h += slot(330, 'c13 b', 'No.') + `<div class="st serial" style="top:348px">${serial}</div>`;
  const bc = barcodeRects(code, T.inX, 420, T.inW, 24, R.fieldInk);
  h += `<svg class="bc" role="img" aria-label="Barcode, ${A(code)}" viewBox="0 0 ${PAGE.w} ${PAGE.h}" width="${PAGE.w}" height="${PAGE.h}">${bc.svg}</svg>` + slot(444, 'mono12', code);
  return h;
}

// ---- the page ----
// R may be the paper variant (R.onPaper()): the ticket is then printed on the lightest colour, and --ink is the dark ink on it
export function page(ctx, R, id, { segments, cover = false, body = '', zone = '', inset = false }) {
  return `<section class="pg" data-page="${id}" style="--ink:${R.fieldInk};--field:${R.field}">${device(R, { segments, inset })}<div class="ct">${body}${stub(ctx, R, id, { cover })}${zone}</div></section>`;
}
