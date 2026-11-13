// Theme 30, Fluted: shared helpers. Colours come from ctx roles, sizes from the brand's scale; no brand colour id, hex or name is written here.
import { esc } from '../../engine/brand.js';
import { outline } from '../../engine/logo.js';
import { loadFont } from '../../engine/nodeFont.js';
import { glassBand, glassTone, paletteFields } from './glass.js';

export const A = esc;
// the brand name's first letter, for the big initial on the covers; the slot edition holds the name as a placeholder (never cut), so it shows a neutral A
export const initial = (ctx) => (ctx.placeholders ? 'A' : [...ctx.brand.name][0].toUpperCase());
export const PW = 1080, PH = 1350;
export const px = (n) => `${Math.round(n * 100) / 100}px`;
export const GX = [64, 185, 306, 427, 548, 669, 790, 911];   // the 8 column x positions; right edge 1016
export const FIELD_MIN = 192;  // a palette field is at least 16 reeds wide, so the three value lines fit it at the type floor with 16 px clear of the field's right edge
export const TXT = 15;  // the type floor: nothing on a 1080 px page is set smaller (13 px reads as about 7.8 px at laptop fit)

// The edition: dark when the brand's ground-role colour has OKLCH L below 0.4, else light
export function tokens(ctx) {
  const g = ctx.brand.colours.find((c) => c.role === 'ground') || ctx.brand.colours[0];
  const light = ctx.C.toOklch(g.hex).L >= 0.4;
  const R = light ? ctx.roles.light : ctx.roles.dark;
  return { light, R, ground: R.surface, ink: R.text, soft: R.textSoft, quiet: R.quiet, hair: R.divider, panel: R.raised, strong: R.action, strongLabel: R.actionLabel };
}

// ---- font metrics ----
const stemOf = (ctx, role, weight) => {
  if (role === 'chrome') return weight >= 500 ? 'FamiljenGrotesk-500' : 'FamiljenGrotesk-400';
  if (role === 'dm') return 'DMMono-400';
  const fs = ctx.faces.filter((x) => x.role === role && x.style !== 'italic');
  return (fs.find((x) => x.weight === weight) || fs[0]).stem;
};
export const fontOf = (ctx, role, weight) => loadFont(stemOf(ctx, role, weight));
// advance width of a run (px), with kerning and tracking in em
export function adv(ctx, role, text, size, track = 0, weight = ctx.weights.heading) {
  const font = fontOf(ctx, role, weight);
  let x = 0, prev = null;
  for (const ch of text) {
    const g = font.charToGlyph(ch);
    if (prev) { try { x += font.getKerningValue(prev, g) * size / font.unitsPerEm; } catch { /* no kerning table */ } }
    x += g.advanceWidth * size / font.unitsPerEm + track * size; prev = g;
  }
  return x;
}
// top of a line box so the first baseline lands on `baseline` (the browser centres the content area in the line, from hhea)
export function lineTop(ctx, role, size, line, baseline, weight = ctx.weights.heading) {
  const font = fontOf(ctx, role, weight), h = font.tables.hhea, upm = font.unitsPerEm;
  const asc = h.ascender / upm * size, desc = -h.descender / upm * size;
  return baseline - ((line - (asc + desc)) / 2 + asc);
}
export const capH = (ctx, role, size, weight) => { const f = fontOf(ctx, role, weight); const c = f.tables.os2 && f.tables.os2.sCapHeight; return c ? c / f.unitsPerEm * size : -outline(f, 'H', size, 0).y1; };
export const xH = (ctx, role, size, weight) => { const f = fontOf(ctx, role, weight); const c = f.tables.os2 && f.tables.os2.sxHeight; return c ? c / f.unitsPerEm * size : -outline(f, 'x', size, 0).y1; };
// the largest size (down to `min`) at which a run fits `maxW`
export function fitSize(ctx, role, text, from, maxW, track = 0, weight = ctx.weights.heading, min = 8) {
  let s = from; while (s > min && adv(ctx, role, text, s, track, weight) > maxW) s -= 1; return s;
}
// a run as outlined paths: {d, x1, x2, y1, y2} at the origin (baseline 0)
export const paths = (ctx, role, text, size, track = 0, weight = ctx.weights.heading) => outline(fontOf(ctx, role, weight), text, size, track);

// ---- placing ----
// text at a line box; baseline (optional) overrides y. `plate` is a hex: the box is painted that colour with `fg` text so the checker measures against it.
// `under` (an array): the plate is not painted on the text's own box but pushed there as a div of its own, to be laid under the glass (run 10: on the glass a plate showed as a flat patch
// in the reeds; under it the reeds cover it, and the checker still finds an opaque ancestor of the right colour in the stack beneath the text)
export function put(ctx, { x, y, w, cls = '', html, role = 'body', size = 16, line = 25, baseline, weight, align = 'left', plate, fg, h, style = '', under = null }) {
  const top = baseline != null ? lineTop(ctx, role, size, line, baseline, weight) : y;
  if (plate && under) under.push(`<div class="a" style="left:${px(x)};top:${px(top)};width:${px(w)};height:${px(h || line)};background:${plate}"></div>`);
  const bg = plate ? `${under ? '' : `background:${plate};`}color:${fg};` : '';
  // slot edition: a box that holds a placeholder takes the compact form (ph-tight), as the page is laid out in fixed rows
  if (ctx.placeholders && /[-]/.test(html)) cls += ' ph-tight';
  return `<div class="a ${cls}" style="left:${px(x)};top:${px(top)};${w ? `width:${px(w)};` : ''}${h ? `height:${px(h)};` : ''}${align !== 'left' ? `text-align:${align};` : ''}${bg}${style}">${html}</div>`;
}
// the better of ink and ground on a fill, asserted
export function onFill(ctx, T, bg, size = TXT, weight = 400) {
  const best = ctx.ratio(T.ink, bg) >= ctx.ratio(T.ground, bg) ? T.ink : T.ground;
  ctx.pair(best, bg, { size, weight, what: '(Text on a strong field)' });
  return best;
}

// the logo, or in the slot edition a dashed frame of the same proportion: 1.5 px in the quiet colour with a label at the type floor
// (the engine's own slot label is 13 px at most, and cannot be seen once the art is photographed, so `fs` sets the label size there)
export function logoHtml(ctx, T, id, { width, colourway, label = 'Your logo goes here', fs = TXT, color = T.quiet, bw = 1.5 } = {}) {
  if (ctx.edition !== 'slot') return ctx.logo.html(id, { width, colourway });
  const g = ctx.logo.geos[id];
  return `<div role="img" aria-label="Logo slot" style="width:${width}px;height:${(width * g.h / g.w).toFixed(1)}px;box-sizing:border-box;border:${bw}px dashed ${color};color:${color};display:flex;align-items:center;justify-content:center;font:400 ${fs}px/1.2 var(--chrome);text-align:center">${A(label)}</div>`;
}

// ---- the frame: running head and folio, on every page ----
// strongFrom: x from which the page's strong field sits under the chrome (cells that start there go on a plate)
export function chrome(ctx, id, T, { strongFrom = null, left = null, title = null, folio = null, under = null } = {}) {
  const p = ctx.pages.find((x) => x.id === id);
  // the third cell steps in 16 px from a strong field's edge, so its plate never sits flush on the edge
  const x3 = strongFrom != null ? Math.max(GX[5], strongFrom + 16) : GX[5];
  const cells = [[GX[0], ctx.brand.name], [GX[3], p.section ? p.section.title : ''], [x3, title != null ? title : p.title]].filter(([, t]) => t);
  // a cell over the strong field goes on a plate exactly as wide as its text, in the strong colour
  const cell = (x, t, i) => {
    const onS = strongFrom != null && x >= strongFrom, w = onS ? Math.ceil(adv(ctx, 'chrome', t, TXT, 0, 500)) + 1 : (cells[i + 1] ? cells[i + 1][0] : PW - 64) - x - 16;
    return put(ctx, { x, baseline: 52, w, cls: 'hd', role: 'chrome', size: TXT, line: 20, weight: 500, html: A(t), h: 20, ...(onS ? { under, plate: T.strong, fg: onFill(ctx, T, T.strong, TXT, 500) } : {}) });
  };
  let out = cells.map(([x, t], i) => cell(x, t, i)).join('');
  const lt = left != null ? left : `Brand guidelines, version ${ctx.brand.version.number}`;
  out += put(ctx, { x: 64, baseline: 1302, w: 800, cls: 'ft', role: 'chrome', size: TXT, line: 20, weight: 400, html: A(lt), h: 20 });
  const fo = folio != null ? folio : String(ctx.pageNo(id)).padStart(3, '0');
  const onS = strongFrom != null && strongFrom < 940, fw = Math.ceil(adv(ctx, 'dm', fo, TXT, 0, 400)) + 1;
  out += put(ctx, { x: onS ? 1016 - fw : 916, baseline: 1302, w: onS ? fw : 100, cls: 'fo num', role: 'dm', size: TXT, line: 20, weight: 400, html: fo, align: 'right', h: 20, ...(onS ? { under, plate: T.strong, fg: onFill(ctx, T, T.strong, TXT, 400) } : {}) });
  return out;
}

// ---- the page shell: flat SVG, the glass over it, then HTML text ----
// flat: SVG markup in page coordinates (painted under the glass and the text). shape: the page's shape in page coordinates; the ground and the palette fields are added to it for the glass.
export function shell(ctx, id, T, { flat = '', under = '', shape = '', fields = true, omit = [], band = {}, html = '', strongFrom = null, left = null, title = null, folio = null, fieldY = 768, fieldH = 384 }) {
  const ground = `<rect x="-60" y="-10" width="${PW + 120}" height="${PH + 20}" fill="${T.ground}"/>`;
  const fl = fields ? paletteFields(ctx, { ground: T.ground, y: fieldY, h: fieldH, actionHex: T.strong, omit, minW: FIELD_MIN }) : '';
  const behind = ground + fl + shape;
  const glass = glassBand(ctx, { id: `fx-${id}`, behind, light: T.light, ground: T.ground, pitch: 12, accent: !T.light, ...band });
  const plates = [], chromeHtml = chrome(ctx, id, T, { strongFrom, left, title, folio, under: plates });
  return `<section class="pg" data-page="${id}"><svg class="a" style="left:0;top:0" width="${PW}" height="${PH}" viewBox="0 0 ${PW} ${PH}" aria-hidden="true">${flat}</svg>${under}${plates.join('')}${glass}${html}${chromeHtml}</section>`;
}
export const rect = (x, y, w, h, fill, extra = '') => `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${fill}"${extra}/>`;
// a half disc standing on a horizon: centre x, horizon y (the flat edge), width
export const halfDisc = (cx, hy, w, fill) => `<path d="M${cx - w / 2} ${hy} A${w / 2} ${w / 2} 0 0 1 ${cx + w / 2} ${hy} Z" fill="${fill}"/>`;

// ---- facets under text ----
// the rect when text in `fg` fails 4.5 against the ground under a lit or shade strip (so the glass drops its facets there), else null
export function facetCut(ctx, T, fg, r) {
  const bad = [1, -1, ...(T.light ? [] : [2])].some((d) => ctx.ratio(fg, glassTone(ctx, T.ground, d)) < 4.5);
  return bad ? r : null;
}
