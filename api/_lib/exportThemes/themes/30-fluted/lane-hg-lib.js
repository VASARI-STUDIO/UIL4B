// Theme 30, Fluted, lane hg: shared pieces of the guide site (the web version of the guidelines). The site is the lobby wall run down a page, as the brand book
// is: a running head, the two-tone headline, a short lead, the page's one big thing, then the band of reeded glass across the full width with the key under it,
// then the specs as hairline rows. The band is drawn by lane-bk-glass.js (read-only); this file renames its classes and ids to hg- and wraps it for the guide.
import { esc } from '../../engine/brand.js';
import { band, layoutWindows, hexIn } from './lane-bk-glass.js';
import { adv } from './helpers.js';

export const A = esc;
export const v = (t) => `<span class="hg-v">${t}</span>`;
export const cap1 = (s) => s.charAt(0).toUpperCase() + s.slice(1);
const NUM = ['no', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve'];
export const nWord = (n) => NUM[n] || String(n);
export const listAnd = (xs) => (xs.length < 2 ? xs.join('') : `${xs.slice(0, -1).join(', ')} and ${xs[xs.length - 1]}`);
export const WEIGHT = { 100: 'Thin', 200: 'Extra light', 300: 'Light', 400: 'Regular', 500: 'Medium', 600: 'Semibold', 700: 'Bold', 800: 'Extra bold', 900: 'Black' };
export const h2 = (t) => `<h2 class="hg-h2">${t}</h2>`;
export const p = (t, cls = '') => `<p class="hg-p ${cls}">${A(t)}</p>`;
export const q = (t) => `<p class="hg-q">${t}</p>`;
export const rgbOf = (ctx, hex) => { const [r, g, b] = ctx.C.hexToRgb(hex); return `rgb(${r}, ${g}, ${b})`; };
export const rules = (list) => `<ul class="hg-rules">${list.map((r) => `<li><p><span class="hg-do">Do</span> ${A(r.do)}</p><p class="hg-q"><span class="hg-do">Don&rsquo;t</span> ${A(r.dont)}</p></li>`).join('')}</ul>`;
export const dl = (pairs, cls = '') => `<dl class="hg-rows ${cls}">${pairs.map(([k, x]) => `<div><dt>${k}</dt><dd>${x}</dd></div>`).join('')}</dl>`;
export const two = (a, b) => `<div class="hg-two"><div>${a}</div><div>${b}</div></div>`;

// type sized to its box: the size at which the run fits one line of `w` (measured with the real glyphs), used as a cap and scaled with the box through cqw
export const fitCap = (ctx, text, role, weight, max, w, track = -0.02) => Math.max(16, Math.min(max, Math.floor(w / (adv(ctx, role, text, 100, track, weight) / 100))));
export const cq = (s, w) => `min(${s}px,${(s / w * 100).toFixed(3)}cqw)`;

// ---- the logo: in the colourway made for a ground (else the one that reads best); a dashed frame in the slot edition ----
export const cwOn = (ctx, bg) => {
  const cw = ctx.brand.logo.colourways, keys = Object.keys(cw);
  return keys.find((k) => cw[k].ground.toLowerCase() === bg.toLowerCase()) || keys.reduce((a, b) => (ctx.ratio(cw[b].name, bg) > ctx.ratio(cw[a].name, bg) ? b : a));
};
export const slotFrame = (ctx, id, w, bg = null) => {
  const g = ctx.logo.geos[id], tx = [ctx.roles.light.text, ctx.roles.dark.text], c = bg ? tx.reduce((a, b) => (ctx.ratio(b, bg) > ctx.ratio(a, bg) ? b : a)) : null;
  return `<span class="hg-slot" role="img" aria-label="Logo slot" style="width:${w}px;aspect-ratio:${g.w.toFixed(2)}/${g.h.toFixed(2)}${c ? `;color:${c};border-color:${c}` : ''}">${w >= 160 ? '<span>Your logo goes here</span>' : ''}</span>`;
};
export function logoOn(ctx, id, bg, w) {
  if (ctx.edition === 'slot') return slotFrame(ctx, id, w, bg);
  return `<span class="hg-logo" style="--lw:${w}px">${ctx.logo.html(id, { width: w, colourway: cwOn(ctx, bg), label: 'Logo' })}</span>`;
}
export const logoModes = (ctx, id, w) => (ctx.edition === 'slot' ? slotFrame(ctx, id, w)
  : `<span class="hg-for-light">${logoOn(ctx, id, ctx.roles.light.surface, w)}</span><span class="hg-for-dark">${logoOn(ctx, id, ctx.roles.dark.surface, w)}</span>`);
// the version's own colourway on its ground
export function logoCw(ctx, id, key, w) {
  const w0 = ctx.brand.logo.colourways[key];
  if (ctx.edition === 'slot') return slotFrame(ctx, id, w, w0.ground);
  return `<span class="hg-logo" style="--lw:${w}px">${ctx.logo.html(id, { width: w, colourway: key, color: w0.name, label: 'Logo' })}</span>`;
}

// ---- the band and its key ----
const DW = { W: 1440, H: 336, lift: 48, margin: 64 }, DN = { W: 588, H: 264, lift: 40, margin: 24 };
// a window whose fill sits close to either mode's ground gets a quiet outline, so it never vanishes into the page
export const edgeFor = (ctx, fill) => (['l', 'd'].some((m) => ctx.ratio(hexIn(ctx, m, fill), hexIn(ctx, m, 'g')) < 1.5) ? 'quiet' : null);
// the arch in the key: the same window in miniature, in the same paint
export const arch = (t) => {
  const fill = t.fill ? (t.fill.startsWith('#') ? `fill="${t.fill}"` : `style="fill:var(--${t.fill})"`) : 'fill="none"';
  const st = t.stroke ? 'stroke="currentColor" stroke-width="1.5"' : t.edge ? 'stroke="currentColor" stroke-width="1"' : '';
  return `<svg class="hg-arch" viewBox="0 0 16 24" width="16" height="24" aria-hidden="true" focusable="false"><path d="M1.5 23.5V8.5a6.5 6.5 0 0 1 13 0V23.5Z" ${fill} ${st}/></svg>`;
};
// the band's own classes and ids (fl-) become hg-: this touches only generated svg, never brand copy
const hg = (svg) => svg.replace(/\bfl-/g, 'hg-');
export function drawBand(ctx, id, items, { layout = null, fields = null, settle = false } = {}) {
  const draw = (D, tag) => {
    const pos = layout ? layout(D) : layoutWindows(items.map((t) => t.value), { W: D.W, margin: D.margin });
    const ws = items.map((t, i) => ({ ...t, ...pos[i] })).filter((t) => t.w > 0);
    return hg(band(ctx, { id: `fl-${id}-${tag}`, W: D.W, H: D.H, lift: D.lift, items: ws, fields: fields ? fields(D) : [], settle, cls: `fl-svg--${tag}` }));
  };
  return draw(DW, 'w') + draw(DN, 'n');
}
export const keyOf = (its, label) => `<ol class="hg-key" aria-label="${A(label)}, the key">${its.map((t) => `<li>${arch(t)}<span class="hg-key__n">${t.name}</span>${t.val ? v(t.val) : ''}</li>`).join('')}</ol>`;
// items: [{value, fill?, stroke?, name, val}]; fill a hex, a role (g, ink, soft, quiet, strong, panel) or t-<tone>
export function glass(ctx, id, items, { label, fields = null, layout = null, settle = false, keyNote = '', key = true } = {}) {
  const its = items.map((t) => ({ ...t, edge: t.fill ? edgeFor(ctx, t.fill) : null }));
  const k = key ? keyOf(its, label) : '';
  return `<figure class="hg-band" role="img" aria-label="${A(label)}">${drawBand(ctx, id, its, { layout, fields, settle })}</figure>
<div class="hg-in hg-keyrow">${k}${keyNote ? `<p class="hg-q hg-keynote">${keyNote}</p>` : ''}</div>`;
}

// ---- the page: running head, headline in two tones, lead, the big thing; then the band; then the appendix ----
export function sheet(ctx, id, { no, section, title, l1, l2 = '', lead = '', big = '', note = '', band: bandHtml = '', body = '', h = 'h1', cls = '' }) {
  const run = `<p class="hg-run"><span class="hg-no">${A(no)}</span><span class="hg-run__t">${A(section)}</span>${note ? `<span class="hg-run__n">${note}</span>` : ''}</p>`;
  const head = `<${h} class="hg-hd hg-disp" id="hg-h-${id}"><span class="hg-hd__1">${l1}</span>${l2 ? ` <span class="hg-hd__2">${l2}</span>` : ''}</${h}>`;
  void title;
  return `<article class="hg-sec hg-sec--${id} ${cls}" aria-labelledby="hg-h-${id}">
<div class="hg-in hg-top"><div class="hg-top__t">${run}${head}${lead ? `<p class="hg-lead">${lead}</p>` : ''}</div>${big ? `<div class="hg-top__b">${big}</div>` : ''}</div>
${bandHtml}
${body ? `<div class="hg-in hg-body">${body}</div>` : ''}
</article>`;
}

export { layoutWindows, hexIn };
