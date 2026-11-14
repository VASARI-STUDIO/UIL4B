// Lane kt helpers (the brand kit PDFs). Copies of the round 1 measuring helpers in guidelines-r1.js, which keeps them private, plus the kit's
// running head and the field arithmetic. Nothing here is named guidelines, uikit, css, readMe or sheets, so the lane loader merges nothing from it.
import { A } from './helpers.js';
import { outline } from '../../engine/logo.js';
import { loadFont } from '../../engine/nodeFont.js';

export { A };
export const W = 1280, H = 720, M = 56;
export const px = (n) => +(+n).toFixed(2);

// ---- measuring ------------------------------------------------------------------------------------------------------------------
export const face = (ctx, role, weight) => ctx.faces.find((f) => f.role === role && f.style !== 'italic' && f.weight === weight) || ctx.faces.find((f) => f.role === role && f.style !== 'italic');
export const dispW = (ctx) => ctx.brand.fonts.display.weights[ctx.brand.fonts.display.weights.length - 1];
// width of one line of text in px, from the font file (letter-spacing in em)
export const textW = (ctx, role, weight, text, size, track = 0) => { const o = outline(loadFont(face(ctx, role, weight).stem), String(text), size, track); return (o.x2 - Math.min(0, o.x1)) * 1.02; };
// greedy wrap, as explicit lines so the lines laid out are the lines that render
export function wrap(ctx, role, weight, text, size, maxW, track = 0) {
  const out = []; let cur = '';
  for (const w of String(text).split(' ')) { const t = cur ? `${cur} ${w}` : w; if (cur && textW(ctx, role, weight, t, size, track) > maxW) { out.push(cur); cur = w; } else cur = t; }
  if (cur) out.push(cur);
  return out;
}
// the same line count as greedy, with the lines as even as they can be (the narrowest width that keeps the count)
export function balanced(ctx, role, weight, text, size, maxW, track = 0) {
  const n = wrap(ctx, role, weight, text, size, maxW, track).length;
  if (n === 1) return [text];
  let lo = Math.max(...String(text).split(' ').map((w) => textW(ctx, role, weight, w, size, track))), hi = maxW;
  for (let i = 0; i < 14; i++) { const mid = (lo + hi) / 2; if (wrap(ctx, role, weight, text, size, mid, track).length <= n) hi = mid; else lo = mid; }
  return wrap(ctx, role, weight, text, size, hi, track);
}
// the largest display size from hi down to lo at which the text sets in maxLines balanced lines or fewer, none wider than maxW
export function fitDisplay(ctx, text, hi, lo, maxW, maxLines, track = -0.01) {
  const dw = dispW(ctx);
  for (let s = hi; s > lo; s--) { const lines = balanced(ctx, 'display', dw, text, s, maxW, track); if (lines.length <= maxLines && lines.every((l) => textW(ctx, 'display', dw, l, s, track) <= maxW)) return { size: s, lines }; }
  return { size: lo, lines: balanced(ctx, 'display', dw, text, lo, maxW, track) };
}
// lines as blocks that never re-wrap
export const lineHtml = (lines) => lines.map((l) => `<span class="kt-ln">${A(l)}</span>`).join('');
// running text in the body face: explicit lines at a size, weight and width
export const para = (ctx, text, size, maxW, weight = 400) => wrap(ctx, 'body', weight, text, size, maxW, 0);

// ---- colour roles and the chrome rule (as in guidelines-r1.js) ----------------------------------------------------------------
export const L = (ctx) => ctx.roles.light;
export const byRole = (ctx, role) => ctx.colours.find((c) => c.role === role);
export const inkOn = (ctx, hex) => (ctx.ratio(L(ctx).text, hex) >= ctx.ratio(L(ctx).surface, hex) ? L(ctx).text : L(ctx).surface);
// the brand's quiet tone that reaches 4.5:1 on the ground; else the best of the text colour, the page ground and the dark soft text
export const chromeOn = (ctx, hex) => {
  const q = [L(ctx).quiet, L(ctx).quietOnSunken, ctx.roles.dark.quiet].find((c) => ctx.ratio(c, hex) >= 4.5);
  return q || [L(ctx).text, L(ctx).surface, ctx.roles.dark.textSoft].sort((a, b) => ctx.ratio(b, hex) - ctx.ratio(a, hex))[0];
};
// the reading-text tone that holds 4.5:1 on a ground, else the ink
export const softOn = (ctx, hex) => (ctx.ratio(L(ctx).textSoft, hex) >= 4.5 ? L(ctx).textSoft : inkOn(ctx, hex));
export const same = (a, b) => String(a).toLowerCase() === String(b).toLowerCase();
// the field colours of the slide language: the brand's text role (the dark field), its action, and its panel (the sunken ground)
export const darkField = (ctx) => (byRole(ctx, 'text') || {}).hex || L(ctx).text;
export const actionField = (ctx) => (byRole(ctx, 'action') || {}).hex || L(ctx).action;
export const panelField = (ctx) => L(ctx).sunken;
// the logo colourway whose ground is this colour, else full colour
export const logoOn = (ctx, hex) => Object.entries(ctx.brand.logo.colourways).find(([, v]) => same(v.ground, hex))?.[0] || 'colour';

// ---- boxes, pages, the running head ---------------------------------------------------------------------------------------------
export const box = (x, y, w, h, st = '', inner = '', cls = '') => `<div class="kt-a ${cls}" style="left:${px(x)}px;top:${px(y)}px;${w != null ? `width:${px(w)}px;` : ''}${h != null ? `height:${px(h)}px;` : ''}${st}">${inner}</div>`;
export const page = (id, inner, bg) => `<section class="pg kt" data-page="${id}" style="background:${bg}">${inner}</section>`;
// The one running head of the theme, in the kit's terms: the kit folder and the page title left; the document name and a three-digit folio right.
// Each part takes the chrome colour of the field under it: give the colour under x 56 and the colour under x 1224.
export function head(ctx, { folder, title, left, right, no }) {
  const g = L(ctx).surface, cl = chromeOn(ctx, left || g), cr = chromeOn(ctx, right || left || g);
  return `<div class="kt-hd"><span class="num" style="color:${cl}">${folder ? `<b>${A(folder)}</b>` : ''}${A(title)}</span><span class="num" style="color:${cr}">${A(ctx.brand.name)} brand kit<b>${String(no).padStart(3, '0')}</b></span></div>`;
}

// Field widths across a run: each field gets at least the width its label needs; the rest of the run is shared out in proportion to share.
export function fieldWidths(shares, needs, total) {
  const n = shares.length, w = new Array(n).fill(0), fixed = new Set();
  for (let pass = 0; pass <= n; pass++) {
    const left = total - [...fixed].reduce((s, i) => s + w[i], 0), free = shares.map((s, i) => (fixed.has(i) ? 0 : s)), sum = free.reduce((a, b) => a + b, 0) || 1;
    let moved = false;
    for (let i = 0; i < n; i++) if (!fixed.has(i)) { w[i] = (left * free[i]) / sum; if (w[i] < needs[i]) { w[i] = needs[i]; fixed.add(i); moved = true; } }
    if (!moved) break;
  }
  return w.map((x) => Math.round(x));
}
