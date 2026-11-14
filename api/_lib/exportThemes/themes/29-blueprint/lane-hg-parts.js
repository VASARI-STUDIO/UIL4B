// Theme 29 (Blueprint), lane hg: the parts of the HTML guide site. Each guideline page is one sheet of the drawing set: a hairline outer frame with
// zone numbers and ticks in its margin, a heavy inner frame, a title strip down the right edge (a ruled title block at the head on a phone) that carries
// the page's name, its number in the guidelines, the scale and the revision, and the drawing itself. Redlines (the brand's action, oblique ticks) print
// only a true size of what they touch, in px as set on this page; where a size changes with the screen, each width class prints its own value.
import { plateImg } from '../../engine/plate.js';
import { esc as A } from '../../engine/brand.js';
import { outline } from '../../engine/logo.js';
import { loadFont } from '../../engine/nodeFont.js';
import { wrap, inkW, displayStem } from './measure.js';

export { A };
export const pad2 = (n) => String(n).padStart(2, '0');
export const pad3 = (n) => String(n).padStart(3, '0');
export const r1 = (n) => Math.round(n * 10) / 10;
export const listAnd = (xs) => (xs.length < 2 ? xs.join('') : `${xs.slice(0, -1).join(', ')} and ${xs[xs.length - 1]}`);
export const WEIGHT = { 100: 'Thin', 200: 'ExtraLight', 300: 'Light', 400: 'Regular', 500: 'Medium', 600: 'SemiBold', 700: 'Bold', 800: 'ExtraBold', 900: 'Black' };
export const capOf = (stem, s) => -outline(loadFont(stem), 'H', s, 0).y1;
export const stemOf = (ctx, role, w) => (ctx.faces.find((f) => f.role === role && f.weight === w && f.style !== 'italic') || ctx.faces.find((f) => f.role === role)).stem;
export const geoH = (ctx, id, w) => Math.round((w * ctx.logo.geos[id].h) / ctx.logo.geos[id].w);

// the revision date as the title block prints it
export function revOf(ctx) {
  const B = ctx.brand, d = new Date(B.version.date + 'T00:00:00Z');
  return `<span class="hg-m">${A(B.version.number)}</span>, ${d.getUTCDate()} ${d.toLocaleDateString('en-AU', { month: 'long', year: 'numeric', timeZone: 'UTC' })}`;
}

// ---- the width classes a fixed size is set at: s (a phone, up to 840), m (841 to 1199), l (1200 and over) ----
export const per = (v) => (typeof v === 'object' ? `<span class="hg-at-s">${A(v.s)}</span><span class="hg-at-m">${A(v.m)}</span><span class="hg-at-l">${A(v.l)}</span>` : A(v));

// ---- redlines. Lines carry pathLength 1 so the draw-in can run on any length. They sit in a box the size of the thing measured. ----
const tick = (x, y) => `<line x1="${x - 4.5}" y1="${y + 4.5}" x2="${x + 4.5}" y2="${y - 4.5}" pathLength="1"/>`;
export function dimH(value, { side = 'top', gap = 8 } = {}) {
  const y = 9.5;
  const ext = side === 'top' ? `<line x1="0" y1="2" x2="0" y2="${18 + gap}" pathLength="1"/>` : `<line x1="0" y1="${-gap}" x2="0" y2="16" pathLength="1"/>`;
  const svg = `<svg class="hg-rl" width="100%" height="20" aria-hidden="true" focusable="false">${ext}<line x1="0" y1="${y}" x2="100%" y2="${y}" pathLength="1" stroke-width="1.5"/>${tick(0, y)}<svg x="100%" overflow="visible">${ext}${tick(0, y)}</svg></svg>`;
  return `<span class="hg-dh hg-dh--${side}" style="--g:${gap}px">${svg}<span class="hg-rv">${per(value)}</span></span>`;
}
export function dimV(value, { gap = 8 } = {}) {
  const x = 10.5;
  const ext = `<line x1="${-gap}" y1="0" x2="16" y2="0" pathLength="1"/>`;
  const svg = `<svg class="hg-rl" width="20" height="100%" aria-hidden="true" focusable="false">${ext}<line x1="${x}" y1="0" x2="${x}" y2="100%" pathLength="1" stroke-width="1.5"/>${tick(x, 0)}<svg y="100%" overflow="visible">${ext}${tick(x, 0)}</svg></svg>`;
  return `<span class="hg-dv" style="--g:${gap}px">${svg}<span class="hg-rv">${per(value)}</span></span>`;
}

// ---- drafting marks ----
export const tag = (n) => `<span class="hg-tag" aria-hidden="true">${A(n)}</span>`;
export const detail = (n, title, { h = 'h2', note = '' } = {}) => `<div class="hg-dt">${tag(n)}<div class="hg-dt__t"><${h} class="hg-dt__h">${title}</${h}>${note ? `<p class="hg-dt__n">${note}</p>` : ''}</div></div>`;
export const notes = (items, cls = '') => `<ol class="hg-notes ${cls}">${items.map((t) => `<li><span class="hg-notes__n" aria-hidden="true">${t[0]}</span><div>${t[1]}</div></li>`).join('')}</ol>`;
export const label = (t) => `<p class="hg-lab">${t}</p>`;

// ---- the sheet: one per page ----
export function sheet(ctx, id, { drawing, scale, title }, inner) {
  const B = ctx.brand, u = ctx.pages.find((p) => p.id === id), total = ctx.pages.length, no = ctx.pageNo(u.id);
  const zones = `<div class="hg-zn" aria-hidden="true">${Array.from({ length: 8 }, (_, k) => `<span>${k + 1}</span>`).join('')}</div>`;
  const ticks = (side) => `<svg class="hg-zt hg-zt--${side}" aria-hidden="true" focusable="false"><defs><pattern id="hg-zp-${side}" width="24" height="176" patternUnits="userSpaceOnUse"><path d="M0 0.5H24"/></pattern></defs><rect width="100%" height="100%" fill="url(#hg-zp-${side})"/></svg>`;
  const logo = ctx.edition === 'slot'
    ? `<span class="hg-tb__lg">${ctx.logo.html('horizontal', { width: 160, label: 'Logo' })}</span>`
    : `<span class="hg-tb__lg"><span class="hg-for-light">${ctx.logo.html('horizontal', { width: 160, colourway: 'colour', label: 'Logo' })}</span><span class="hg-for-dark">${ctx.logo.html('horizontal', { width: 160, colourway: 'reversed', label: 'Logo' })}</span></span>`;
  const sec = u.section ? `${pad2(u.section.n)} ${A(u.section.title)}` : '';
  const tb = `<div class="hg-tb"><div class="hg-tb__in">
<div class="hg-tb__c hg-tb__c--d"><p class="hg-lab">${sec}</p><h1 class="hg-tb__t" id="h-${u.id}">${A(title || u.title)}</h1><p class="hg-tb__s">${A(drawing)}</p></div>
<div class="hg-tb__c"><p class="hg-lab">Page</p><p class="hg-sn"><span class="hg-m">${pad3(no)}</span> <span class="hg-sn__of">of <span class="hg-m">${pad3(total)}</span></span></p></div>
<div class="hg-tb__c"><p class="hg-lab">Scale</p><p class="hg-tb__v">${scale}</p></div>
<div class="hg-tb__c"><p class="hg-lab">Revision</p><p class="hg-tb__v">${revOf(ctx)}</p></div>
<div class="hg-tb__c"><p class="hg-lab">Project</p><p class="hg-tb__v hg-tb__p">${A(B.name)}</p><p class="hg-tb__v">Brand guidelines</p></div>
${logo}</div></div>`;
  return `<section class="hg-sec hg-sec--${u.id}" aria-labelledby="h-${u.id}">${zones}<span class="hg-cm" aria-hidden="true"></span>${ticks('l')}${ticks('r')}
<div class="hg-fr">${tb}<div class="hg-dw">${inner}</div></div></section>`;
}

// ---- fitting display type: the largest size in the list at which the text sets in `lines` at width w, measured with the real glyphs.
// The text is printed whole and the size is a cap that also scales with the drawing (cqw), so a longer placeholder still fits. ----
export function fitDisp(ctx, text, w, lines, sizes) {
  const stem = displayStem(ctx);
  return sizes.find((x) => { const L = wrap(stem, String(text), x, w - 8, -0.01); return L.length <= lines && L.every((l) => inkW(stem, l, x, -0.01) <= w - 8); }) || sizes[sizes.length - 1];
}
export const cq = (s, w) => `min(${s}px,${(s / w * 100).toFixed(3)}cqw)`;
export function wordCap(stem, text, size, w) {
  const longest = Math.max(...String(text).split(/\s+/).map((x) => inkW(stem, x, size)));
  return longest <= w - 8 ? `${size}px` : `min(${size}px,${(size * (w - 8) / longest * 100 / w).toFixed(3)}cqw)`;
}

// ---- logos ----
// on the film the logo follows the preview: the colour version on the light film, the reversed one on the dark film
export function logoFilm(ctx, id, w, label = 'Logo') {
  const g = ctx.logo.geos[id] || ctx.logo.geo;
  const box = (inner) => `<span class="hg-logo" style="--ar:${g.w.toFixed(2)}/${g.h.toFixed(2)}">${inner}</span>`;
  if (ctx.edition === 'slot') return box(ctx.logo.html(id, { width: w, label }));
  const darkHtml = id === 'colour' ? ctx.logo.html('reversed', { width: w, label }) : ctx.logo.html(id, { width: w, colourway: 'reversed', label });
  return box(`<span class="hg-for-light">${ctx.logo.html(id, { width: w, colourway: 'colour', label })}</span><span class="hg-for-dark">${darkHtml}</span>`);
}
// a logo version on its own ground (never swapped with the mode): the ground is the colourway's
export function logoOn(ctx, id, key, w, label = 'Logo') {
  const cw = ctx.brand.logo.colourways[key], g = ctx.logo.geos[id], slot = ctx.edition === 'slot';
  // a slot frame's label is text on this ground, so it takes whichever of the roles' two text colours reads better on it
  const ink = [ctx.roles.light.text, ctx.roles.dark.text, ctx.roles.light.actionLabel].sort((a, b) => ctx.ratio(b, cw.ground) - ctx.ratio(a, cw.ground))[0];
  const html = slot ? ctx.logo.html(id, { width: w, label }) : ctx.logo.html(id, { width: w, colourway: key, color: cw.name, label });
  return `<span class="hg-logo" style="width:${w}px;--ar:${g.w.toFixed(2)}/${g.h.toFixed(2)}${slot ? ';color:' + ink : ''}">${html}</span>`;
}

// ---- photographed pieces ----
export function shot(ctx, sceneId, arts, { ar = '3/2', alt, cls = '' }) {
  const sc = ctx.sceneInfo(sceneId), q = sc.quads[0].corners, xs = q.map((c) => c[0]), ys = q.map((c) => c[1]);
  const cx = (Math.min(...xs) + Math.max(...xs)) / 2 / sc.w * 100, cy = (Math.min(...ys) + Math.max(...ys)) / 2 / sc.h * 100;
  const url = ctx.mockup(sceneId, arts);
  return `<div class="hg-shot ${cls}" style="aspect-ratio:${ar}">${plateImg(`${A(url)}`, `${A(alt)}`, `object-position:${cx.toFixed(1)}% ${cy.toFixed(1)}%`)}</div>`;
}
export const surfAspect = (ctx, sceneId, surface) => { const sc = ctx.sceneInfo(sceneId), i = Math.max(0, sc.surfaces.indexOf(surface)); return sc.quads[i].aspect; };
// a shot with no photograph yet: a "To shoot" tile on the brand's own reversed ground, carrying the shot's brief, never an empty frame
export const briefTile = (ctx, s, cls = '') => {
  const rev = ctx.brand.logo.colourways.reversed;
  return `<div class="hg-photo hg-brief ${cls}" role="img" aria-label="${A('To shoot. ' + (s.slot || ''))}" style="background:${rev.ground};color:${rev.name}"><b class="hg-m">To shoot</b><span>${A(s.slot || '')}</span></div>`;
};
