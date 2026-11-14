// Theme 24, Standards, lane hk: the pieces the kit site is built from. The site is a volume of the same measured manual as the PDF kit:
// a drawing then the thing (a real component drawn large and dimensioned in x, beside the real one at 1:1), registers of values as
// hairline rows, dimension lines with slash ticks, and an x-ruler along the head of every sheet. Every class starts hk-.
import { A, xOf, fx, adv, wrap, bodyFace, dispFace, typeOf, sc, kpg } from './lane-u1.js';
import { tokenGroups } from '../../engine/tokens.js';
import { componentsCss } from '../../engine/components.js';

export { A, xOf, fx, adv, wrap, bodyFace, dispFace, typeOf, sc, kpg };
export const f2 = (n) => +(+n).toFixed(2);
export const pad3 = (n) => String(n).padStart(3, '0');
export const hv = (s) => `<span class="hk-v">${A(s)}</span>`;
export const ratioText = (ctx, a, b) => `${ctx.fmt(ctx.ratio(a, b))} : 1`;

// the shipped value of a property in componentsCss, so a measure is read from the code package and never typed here
const cssCache = new WeakMap();
export function shipped(ctx, sel, prop) {
  if (!cssCache.has(ctx)) cssCache.set(ctx, componentsCss(ctx));
  const css = cssCache.get(ctx), key = `\n${sel} {`, i = css.indexOf(key);
  if (i < 0) throw new Error(`standards hk: ${sel} is not in componentsCss`);
  const m = new RegExp(`(?:^|;)\\s*${prop}:\\s*([^;]+)`).exec(css.slice(i + key.length, css.indexOf('}', i)));
  if (!m) throw new Error(`standards hk: ${sel} has no ${prop}`);
  return m[1].trim();
}
export const shippedPx = (ctx, sel, prop) => parseFloat(shipped(ctx, sel, prop));
export const ex = (ctx) => ({ account: 'Account', crumbs: ['Home', 'Section'], tabs: ['One', 'Two', 'Three'], links: [['One', 'map-pin'], ['Two', 'plus'], ['Three', 'clock']], ...(sc(ctx).example || {}) });
export const T = (ctx, tok, d) => typeOf(ctx, tok) || d;
export const sp = (ctx, n, d) => parseFloat(tokenGroups(ctx).space[`sp-${n}`] || d);
export const hairW = (ctx) => parseFloat(tokenGroups(ctx).width['w-hairline'] || '1px');

// widths measured from the faces the components set in
export function btnW(ctx, label, { variant = 'primary', size, icon } = {}) {
  const c = T(ctx, 'control', { size: 16, weight: 500 }), l = T(ctx, 'label', { size: 14 }), fs = size === 'sm' ? l.size : c.size;
  const pad = variant === 'quiet' ? sp(ctx, 3, 12) : size === 'sm' ? sp(ctx, 4, 16) : size === 'lg' ? sp(ctx, 6, 24) : sp(ctx, 5, 20);
  return adv(bodyFace(ctx, c.weight), label, fs) + 2 * pad + 2 * ctx.brand.ui.border + (icon ? 18 + sp(ctx, 2, 8) : 0);
}
export const ceilTo = (v, x) => Math.ceil(v / x) * x;

// ---------------------------------------------------------------- dimension lines (sizes are unzoomed px; the figure's --k scales them)

export const dimH = (v, label) => `<span class="hk-dh" style="--w:${f2(v)}"><b>${A(label)}</b><i><u></u></i></span>`;
export const chainH = (ctx, segs) => `<div class="hk-ch">${segs.map(([v, l]) => dimH(v, l ?? fx(ctx, v))).join('')}</div>`;
export const dimV = (v, label) => `<span class="hk-dv" style="--h:${f2(v)}"><b>${A(label)}</b><i><u></u></i></span>`;
export const chainV = (ctx, segs) => `<div class="hk-cv">${segs.map(([v, l]) => dimV(v, l ?? fx(ctx, v))).join('')}</div>`;

// a drawing: the real component zoomed to k (km at narrow widths) with its dimensions along the top and the left. w is the component's
// width in px at 1:1; the markup is the shipped one, never redrawn.
export function drawing({ k, km, w, html, dark, hdims = '', vdims = '', cap = '', cls = '' }) {
  return `<figure class="hk-fig ${cls}" style="--k:${k};--km:${km ?? Math.min(k, 1.5)}"><div class="hk-fig__g"><span></span><div class="hk-fig__h">${hdims}</div><div class="hk-fig__v">${vdims}</div>`
    + `<div class="ui hk-zoom"${dark ? ' data-theme="dark"' : ''} style="--w:${f2(w)}">${html}</div></div>${cap ? `<figcaption class="hk-cap">${cap}</figcaption>` : ''}</figure>`;
}

// ---------------------------------------------------------------- page pieces

export const ui = (inner, { dark = false, cls = '', style = '', label } = {}) => `<div class="ui hk-ui ${cls}"${dark ? ' data-theme="dark"' : ''}${style ? ` style="${style}"` : ''}${label ? ` role="group" aria-label="${A(label)}"` : ''}>${inner}</div>`;
// a section on the sheet: a hard rule, a heading, then the matter
export const sec = (title, inner, cls = '') => `<section class="hk-sec ${cls}"><h2 class="hk-h">${A(title)}</h2>${inner}</section>`;
// a register: hairline rows of name, value and note
export const reg = (rows, cls = '') => `<ul class="hk-reg ${cls}">${rows.map(([a, b, c]) => `<li><span class="hk-rn">${a}</span><span class="hk-rv">${b ?? ''}</span>${c !== undefined ? `<span class="hk-rq">${c}</span>` : ''}</li>`).join('')}</ul>`;
export const cap = (t) => `<p class="hk-cap">${t}</p>`;
export const title = (ctx, K, lead, cls = '') => `<div class="hk-ttl ${cls}"><h1 class="hk-t">${A(K.page.title)}</h1>${lead ? `<p class="hk-lead">${lead}</p>` : ''}</div>`;
export const swatch = (hex) => `<i class="hk-sw" style="background:${hex}"></i>`;
export const WORD = ['no', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve'];
export const Word = (n) => { const w = WORD[n] || String(n); return w[0].toUpperCase() + w.slice(1); };

// the x-ruler: a tick at every x, a long one every 8x
export function ruler(ctx) {
  const x = xOf(ctx), p = x * 8, ticks = Array.from({ length: 8 }, (_, i) => `M${i * x + 0.5} ${i ? 10 : 0}V16`).join('');
  return `<div class="hk-rul"><svg width="100%" height="16" aria-hidden="true" focusable="false"><defs><pattern id="hk-tick" width="${p}" height="16" patternUnits="userSpaceOnUse"><path d="${ticks}" stroke="currentColor" fill="none"/></pattern></defs><rect width="100%" height="16" fill="url(#hk-tick)"/></svg><p><span>0</span><span>1x = ${x} px</span></p></div>`;
}
