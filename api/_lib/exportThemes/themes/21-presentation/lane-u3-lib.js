// Helpers for lane u3 (theme 21, UI kit screens and code). lane-u1.js keeps these private, so they are copied here unchanged in behaviour:
// measuring with the brand's own font files, the chrome colour rule, absolute boxes on the 1280 slide, and the one running head with its folio.
import { A } from './helpers.js';
import { outline } from '../../engine/logo.js';
import { loadFont } from '../../engine/nodeFont.js';

export { A };
export const face = (ctx, role, weight) => ctx.faces.find((f) => f.role === role && f.style !== 'italic' && f.weight === weight) || ctx.faces.find((f) => f.role === role && f.style !== 'italic');
export const dispW = (ctx) => ctx.brand.fonts.display.weights[ctx.brand.fonts.display.weights.length - 1];
export const textW = (ctx, role, weight, text, size, track = 0) => { const o = outline(loadFont(face(ctx, role, weight).stem), text, size, track); return (o.x2 - Math.min(0, o.x1)) * 1.02; };
export const topForBaseline = (ctx, role, weight, size, lh, y) => { const f = loadFont(face(ctx, role, weight).stem), u = f.unitsPerEm, asc = f.ascender / u, desc = -f.descender / u; return +(y - ((lh * size - (asc + desc) * size) / 2 + asc * size)).toFixed(1); };
export function greedy(ctx, role, weight, text, size, maxW, track = 0) {
  const out = []; let cur = '';
  for (const w of String(text).split(' ')) { const t = cur ? `${cur} ${w}` : w; if (cur && textW(ctx, role, weight, t, size, track) > maxW) { out.push(cur); cur = w; } else cur = t; }
  if (cur) out.push(cur);
  return out;
}
// the largest display size from hi down to lo at which every text sets on one line of maxW
export const fitOne = (ctx, texts, hi, lo, maxW, track = -0.01) => { for (let s = hi; s > lo; s--) if (texts.every((t) => textW(ctx, 'display', dispW(ctx), t, s, track) <= maxW)) return s; return lo; };
export const lineHtml = (lines) => lines.map((l) => `<span class="r-ln">${A(l)}</span>`).join('');
// body text set as explicit measured lines, so the line count laid out is the count that renders
export const bodyLines = (ctx, text, size, w, weight = 400) => lineHtml(greedy(ctx, 'body', weight, text, size, w));
export const px = (n) => +(+n).toFixed(2);

// ---- colour roles and the chrome rule (as in guidelines-r1.js) ----
export const L = (ctx) => ctx.roles.light;
export const byRole = (ctx, role) => ctx.colours.find((c) => c.role === role);
export const inkOn = (ctx, hex) => (ctx.ratio(L(ctx).text, hex) >= ctx.ratio(L(ctx).surface, hex) ? L(ctx).text : L(ctx).surface);
// the brand's quiet tone that reaches 4.5:1 on every ground given; else the best of the text colour, the page ground and the dark soft text
export const chromeOn = (ctx, ...hexes) => {
  const q = [L(ctx).quiet, L(ctx).quietOnSunken, ctx.roles.dark.quiet].find((c) => hexes.every((h) => ctx.ratio(c, h) >= 4.5));
  return q || [L(ctx).text, L(ctx).surface, ctx.roles.dark.textSoft].sort((a, b) => Math.min(...hexes.map((h) => ctx.ratio(b, h))) - Math.min(...hexes.map((h) => ctx.ratio(a, h))))[0];
};
// a softer body ink for longer notes: the brand's soft text where it reads at 4.5:1, else the full ink
export const softOn = (ctx, hex) => [L(ctx).textSoft, ctx.roles.dark.textSoft].find((c) => ctx.ratio(c, hex) >= 4.5) || inkOn(ctx, hex);

export const box = (x, y, w, h, st = '', inner = '', cls = '') => `<div class="r-a ${cls}" style="left:${px(x)}px;top:${px(y)}px;${w ? `width:${px(w)}px;` : ''}${h ? `height:${px(h)}px;` : ''}${st}">${inner}</div>`;
export const field = (x, y, w, h, hex, st = '') => box(x, y, w, h, `background:${hex};${st}`);
export const p = (cls, text, st = '') => `<p class="${cls}"${st ? ` style="${st}"` : ''}>${text}</p>`;
export const mono = (t) => `<span class="u3-m">${A(t)}</span>`;

// the 12-column grid of the 1280 slide (margin 56, gutter 16), read from the page size
export const grid = (ctx) => { const cw = (ctx.size.w - 112 - 11 * 16) / 12; return { col: (n) => 56 + n * (cw + 16), span: (k) => k * cw + (k - 1) * 16 }; };

// the one running head: section number and title left, document name and a three-digit folio right, each in the chrome colour of the field under it
export const docName = (ctx) => `${ctx.brand.name} UI kit`;
export function head(ctx, id, { left = [L(ctx).surface], right } = {}) {
  const pg = ctx.pages.find((x) => x.id === id);
  const cl = chromeOn(ctx, ...left), cr = chromeOn(ctx, ...(right || left));
  const folio = String(ctx.pageNo(id)).padStart(3, '0');
  return `<div class="r-hd"><span class="r-hl num" style="color:${cl}">${pg.ref ? `<b>${pg.ref}</b>` : ''}${A(pg.title)}</span><span class="r-hr num" style="color:${cr}"><i>${A(docName(ctx))}</i><b>${folio}</b></span></div>`;
}
export const page = (id, inner, bg, cls = '') => `<section class="pg pg--r u3 ${cls}" data-page="${id}" style="background:${bg}">${inner}</section>`;
// a .ui region that reads the kit's tokens but leaves the field's colour showing through
export const uiR = (inner, { dark = false, st = '', cls = '' } = {}) => `<div class="ui u3-ui ${cls}"${dark ? ' data-theme="dark"' : ''}${st ? ` style="${st}"` : ''}>${inner}</div>`;
export { screenContent as sc } from './once.js';

// the brand's logo for a screen header, or in the slot edition a dashed frame of the same box. k is the zoom it is shown at, so the frame's words stay 12 px on the page.
export function logoAt(ctx, id, width, { ink, colourway, k = 1 } = {}) {
  const gid = ctx.logo.geos[id] ? id : 'colour';
  if (ctx.edition !== 'slot') return ctx.logo.html(gid, { width, colourway, color: ink });
  const g = ctx.logo.geos[gid], h = Math.max((width * g.h) / g.w, 16 / k), line = px(1.5 / k);
  return `<span class="logo-slot" role="img" aria-label="Logo slot" style="display:inline-flex;width:${px(width)}px;height:${px(h)}px;box-sizing:border-box;border:${line}px dashed ${ink};color:${ink};align-items:center;justify-content:center;font:500 ${px(Math.min(12 / k, h * 0.7))}px/1 var(--body);white-space:nowrap">Logo</span>`;
}
