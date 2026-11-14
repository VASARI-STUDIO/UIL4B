// Theme 29 (Blueprint), lane bk: the parts of the HTML brand book. Each section is one sheet of a drawing set: a hairline outer frame with zone
// numbers and ticks in its margin, a heavy inner frame, a title strip down the right edge (on a phone, a ruled title block at the head) that
// carries the drawing's name, sheet number, scale and revision, and the drawing itself. Redlines (the brand's action, oblique ticks) print only
// a true size of what they touch, in px as set on this page; where a size changes with the screen, each width class prints its own value.
import { plateImg } from '../../engine/plate.js';
import { esc as A } from '../../engine/brand.js';
import { outline } from '../../engine/logo.js';
import { loadFont } from '../../engine/nodeFont.js';
import { BOOK_SECTIONS } from '../../engine/book.js';
import { wrap, inkW, displayStem } from './measure.js';

export { A };
export const NO = (id) => BOOK_SECTIONS.findIndex((s) => s.id === id) + 1;
export const TITLE = (id) => BOOK_SECTIONS.find((s) => s.id === id).title;
export const pad3 = (n) => String(n).padStart(3, '0');
export const pad2 = (n) => String(n).padStart(2, '0');
export const r1 = (n) => Math.round(n * 10) / 10;
export const listAnd = (xs) => (xs.length < 2 ? xs.join('') : `${xs.slice(0, -1).join(', ')} and ${xs[xs.length - 1]}`);
export const WEIGHT = { 100: 'Thin', 200: 'ExtraLight', 300: 'Light', 400: 'Regular', 500: 'Medium', 600: 'SemiBold', 700: 'Bold', 800: 'ExtraBold', 900: 'Black' };
export const capOf = (stem, s) => -outline(loadFont(stem), 'H', s, 0).y1;
export const stemOf = (ctx, role, w) => (ctx.faces.find((f) => f.role === role && f.weight === w && f.style !== 'italic') || ctx.faces.find((f) => f.role === role)).stem;

// the revision date as the title block prints it
export function revOf(ctx) {
  const B = ctx.brand, d = new Date(B.version.date + 'T00:00:00Z');
  return `${B.version.number}, ${d.getUTCDate()} ${d.toLocaleDateString('en-AU', { month: 'long', year: 'numeric', timeZone: 'UTC' })}`;
}

// ---- the width classes a fixed size is set at: s (a phone, up to 840), m (841 to 1199), l (1200 and over) ----
// a value that differs by class prints as three spans, and the stylesheet shows one
export const per = (v) => (typeof v === 'object' ? `<span class="bp-at-s">${A(v.s)}</span><span class="bp-at-m">${A(v.m)}</span><span class="bp-at-l">${A(v.l)}</span>` : A(v));

// ---- redlines. Lines carry pathLength 1 so the draw-in can run on any length. They sit in a box the size of the thing measured. ----
const tick = (x, y) => `<line x1="${x - 4.5}" y1="${y + 4.5}" x2="${x + 4.5}" y2="${y - 4.5}" pathLength="1"/>`;
// a width: above the box (side 'top') or below it ('bottom'); the extension lines reach to the box's edge
export function dimH(value, { side = 'top', gap = 8 } = {}) {
  const y = 9.5;
  const ext = side === 'top' ? `<line x1="0" y1="2" x2="0" y2="${18 + gap}" pathLength="1"/>` : `<line x1="0" y1="${-gap}" x2="0" y2="16" pathLength="1"/>`;
  const svg = `<svg class="bp-rl" width="100%" height="20" aria-hidden="true" focusable="false">${ext}<line x1="0" y1="${y}" x2="100%" y2="${y}" pathLength="1" stroke-width="1.5"/>${tick(0, y)}<svg x="100%" overflow="visible">${ext}${tick(0, y)}</svg></svg>`;
  return `<span class="bp-dh bp-dh--${side}" style="--g:${gap}px">${svg}<span class="bp-rv">${per(value)}</span></span>`;
}
// a height: right of the box
export function dimV(value, { gap = 8 } = {}) {
  const x = 10.5;
  const ext = `<line x1="${-gap}" y1="0" x2="16" y2="0" pathLength="1"/>`;
  const svg = `<svg class="bp-rl" width="20" height="100%" aria-hidden="true" focusable="false">${ext}<line x1="${x}" y1="0" x2="${x}" y2="100%" pathLength="1" stroke-width="1.5"/>${tick(x, 0)}<svg y="100%" overflow="visible">${ext}${tick(x, 0)}</svg></svg>`;
  return `<span class="bp-dv" style="--g:${gap}px">${svg}<span class="bp-rv">${per(value)}</span></span>`;
}

// ---- drafting marks ----
// the detail tag: a numbered circle; the detail title beside it on a heavy rule
export const tag = (n) => `<span class="bp-tag" aria-hidden="true">${A(n)}</span>`;
export const detail = (n, title, { h = 'h3', note = '' } = {}) => `<div class="bp-dt">${tag(n)}<div class="bp-dt__t"><${h} class="bp-dt__h">${title}</${h}>${note ? `<p class="bp-dt__n">${note}</p>` : ''}</div></div>`;
// general notes: numbered in the sheet's mono
export const notes = (items, cls = '') => `<ol class="bp-notes ${cls}">${items.map((t) => `<li><span class="bp-notes__n" aria-hidden="true">${t[0]}</span><div>${t[1]}</div></li>`).join('')}</ol>`;
export const label = (t) => `<p class="bp-lab">${t}</p>`;

// ---- the sheet ----
export function sheet(ctx, id, { drawing, scale }, inner, { first = false } = {}) {
  const B = ctx.brand, n = NO(id), total = BOOK_SECTIONS.length;
  const title = first ? `<p class="bp-tb__t">${A(TITLE(id))}</p>` : `<h2 class="bp-tb__t" id="h-${id}">${A(TITLE(id))}</h2>`;
  const zones = `<div class="bp-zn" aria-hidden="true">${Array.from({ length: 8 }, (_, k) => `<span>${k + 1}</span>`).join('')}</div>`;
  const ticks = (side) => `<svg class="bp-zt bp-zt--${side}" aria-hidden="true" focusable="false"><defs><pattern id="bp-zp-${id}-${side}" width="24" height="176" patternUnits="userSpaceOnUse"><path d="M0 0.5H24"/></pattern></defs><rect width="100%" height="100%" fill="url(#bp-zp-${id}-${side})"/></svg>`;
  const logo = ctx.edition === 'slot'
    ? `<span class="bp-tb__lg">${ctx.logo.html('horizontal', { width: 160, label: 'Logo' })}</span>`
    : `<span class="bp-tb__lg"><span class="bp-for-light">${ctx.logo.html('horizontal', { width: 160, colourway: 'colour', label: 'Logo' })}</span><span class="bp-for-dark">${ctx.logo.html('horizontal', { width: 160, colourway: 'reversed', label: 'Logo' })}</span></span>`;
  const tb = `<div class="bp-tb"><div class="bp-tb__in">
<div class="bp-tb__c bp-tb__c--d"><p class="bp-lab">Drawing</p>${title}<p class="bp-tb__s">${A(drawing)}</p></div>
<div class="bp-tb__c"><p class="bp-lab">Sheet</p><p class="bp-sn"><span class="bp-m">${pad3(n)}</span> <span class="bp-sn__of">of <span class="bp-m">${pad3(total)}</span></span></p></div>
<div class="bp-tb__c"><p class="bp-lab">Scale</p><p class="bp-tb__v">${scale}</p></div>
<div class="bp-tb__c"><p class="bp-lab">Revision</p><p class="bp-tb__v">${A(revOf(ctx))}</p></div>
<div class="bp-tb__c"><p class="bp-lab">Project</p><p class="bp-tb__v bp-tb__p">${A(B.name)}</p><p class="bp-tb__v">Brand book</p></div>
${logo}</div></div>`;
  return `<section class="bk-sec bp-sec bp-sec--${id}" id="${id}" aria-labelledby="h-${id}">${zones}<span class="bp-cm" aria-hidden="true"></span>${ticks('l')}${ticks('r')}
<div class="bp-fr">${tb}<div class="bp-dw">${inner}</div></div></section>`;
}

// ---- fitting display type: the largest size in the list at which the text sets in `lines` at width w, measured with the real glyphs.
// The text is printed whole and the size is a cap that also scales with the drawing (cqw), so a longer placeholder still fits. ----
export function fitDisp(ctx, text, w, lines, sizes) {
  const stem = displayStem(ctx);
  const s = sizes.find((x) => { const L = wrap(stem, String(text), x, w - 8, -0.01); return L.length <= lines && L.every((l) => inkW(stem, l, x, -0.01) <= w - 8); }) || sizes[sizes.length - 1];
  return s;
}
export const cq = (s, w) => `min(${s}px,${(s / w * 100).toFixed(3)}cqw)`;
// a size that only caps the longest word at a width (text that wraps at a set size)
export function wordCap(stem, text, size, w) {
  const longest = Math.max(...String(text).split(/\s+/).map((x) => inkW(stem, x, size)));
  return longest <= w - 8 ? `${size}px` : `min(${size}px,${(size * (w - 8) / longest * 100 / w).toFixed(3)}cqw)`;
}

// ---- controls ----
export const copyBtn = (text, value, what) => `<button type="button" class="bk-btn bp-btn" data-copy="${A(value)}" data-copy-label="${A(what)}" aria-label="${A(text + ', ' + what)}"><span class="bk-btn__t">${A(text)}</span></button>`;
export const valBtn = (kind, value, name) => `<button type="button" class="bk-btn bp-val" data-copy="${A(value)}" data-copy-label="${A(name + ' ' + kind)}" aria-label="Copy ${A(kind)} ${A(value)}, ${A(name)}"><span class="bk-btn__t">${A(value)}</span></button>`;
export const dlLink = (f, label, text) => (f ? `<a class="bp-dl" href="${A(f.href)}" download aria-label="Download ${A(label)}, ${A(f.ext)}, ${A(f.sizeText)}">${A(text || f.ext)}</a>` : '');

// ---- logos ----
// on the film the logo follows the preview: the colour version on the light film, the reversed one on the dark film
export function logoFilm(ctx, id, w, label = 'Logo') {
  const g = ctx.logo.geos[id] || ctx.logo.geo;
  const box = (inner) => `<span class="bp-logo" style="--ar:${g.w.toFixed(2)}/${g.h.toFixed(2)}">${inner}</span>`;
  if (ctx.edition === 'slot') return box(ctx.logo.html(id, { width: w, label }));
  const darkHtml = id === 'colour' ? ctx.logo.html('reversed', { width: w, label }) : ctx.logo.html(id, { width: w, colourway: 'reversed', label });
  return box(`<span class="bp-for-light">${ctx.logo.html(id, { width: w, colourway: 'colour', label })}</span><span class="bp-for-dark">${darkHtml}</span>`);
}

// ---- photographed pieces ----
// a scene in a box of a set shape: cover, centred on the surface (the first quad), so the brand's piece stays in frame
export function shot(ctx, sceneId, arts, { ar = '3/2', alt, cls = '' }) {
  const sc = ctx.sceneInfo(sceneId), q = sc.quads[0].corners, xs = q.map((c) => c[0]), ys = q.map((c) => c[1]);
  const cx = (Math.min(...xs) + Math.max(...xs)) / 2 / sc.w * 100, cy = (Math.min(...ys) + Math.max(...ys)) / 2 / sc.h * 100;
  const url = ctx.mockup(sceneId, arts);
  return `<div class="bp-shot ${cls}" style="aspect-ratio:${ar}">${plateImg(`${A(url)}`, `${A(alt)}`, `object-position:${cx.toFixed(1)}% ${cy.toFixed(1)}%`)}</div>`;
}
export const surfAspect = (ctx, sceneId, surface) => { const sc = ctx.sceneInfo(sceneId), i = Math.max(0, sc.surfaces.indexOf(surface)); return sc.quads[i].aspect; };
