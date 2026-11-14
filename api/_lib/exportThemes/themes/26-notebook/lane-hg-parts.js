// Theme 26, Notebook, lane hg: small parts for the guide site (the notebook laid open on a desk, one guideline a spread). Every class is hg-.
import { plateImg } from '../../engine/plate.js';
import { A, folios, nearPaper, sceneCrop, brandRoles } from './helpers.js';

export const P = (text, cls = '') => `<p class="hg-p${cls ? ' ' + cls : ''}"><span class="hg-k">${A(text)}</span></p>`;
export const H3 = (text, cls = '') => `<h3 class="hg-h3${cls ? ' ' + cls : ''}"><span class="hg-k">${A(text)}</span></h3>`;
export const tag = (text, el = 'span', cls = '') => `<${el} class="hg-tag${cls ? ' ' + cls : ''}">${A(text)}</${el}>`;
export const pageOf = (ctx, id) => ctx.pages.find((p) => p.id === id) || { id, title: id, section: null };

// the title of the page: the one h1, in the brand's display face, on the dots
export const h1 = (ctx, id, cls = '') => `<h1 class="hg-h1 disp${cls ? ' ' + cls : ''}"><span class="hg-k">${A(pageOf(ctx, id).title)}</span></h1>`;
// the cell that carries the title: it comes first on a phone
export const lead = (inner) => ({ lead: true, html: inner });

// the best readable ink from the brand's own text roles on a fill
export function ink(ctx, bg) {
  const L = ctx.roles.light, D = ctx.roles.dark;
  const pool = [L.text, L.surface, D.text, D.surface, L.actionLabel].filter(Boolean);
  return pool.slice().sort((a, b) => ctx.ratio(b, bg) - ctx.ratio(a, bg))[0];
}
export function reversed(ctx) {
  const cws = ctx.brand.logo.colourways, lum = (h) => ctx.C.luminance(h);
  const key = cws.reversed ? 'reversed' : Object.keys(cws).sort((a, b) => lum(cws[a].ground) - lum(cws[b].ground))[0];
  return { key, ...cws[key] };
}
export const cwKey = (ctx, id) => { const c = ctx.brand.logo.colourways; return c[id] ? id : c.colour ? 'colour' : Object.keys(c)[0]; };

// the logo (or the slot frame) at a width, scaled by its wrapper; the slot's label is dropped on a small frame so it can never spill
export function logoAt(ctx, id, w, key, label) {
  const k = key || cwKey(ctx, id), cw = ctx.brand.logo.colourways[k], g = ctx.logo.geos[id];
  const lab = w >= 168 ? (label === undefined ? 'Your logo goes here' : label) : '';
  return `<span class="hg-logo" style="width:${w}px;--ar:${g.w}/${g.h}">${ctx.logo.html(id, { width: w, colourway: k, color: cw.name, label: lab })}</span>`;
}
// the logo on the ground of its own colourway
export function cut(ctx, id, w, key, cls = '') {
  const k = key || cwKey(ctx, id), cw = ctx.brand.logo.colourways[k];
  return `<div class="hg-cut${cls ? ' ' + cls : ''}${nearPaper(ctx, cw.ground) ? ' is-edge' : ''}" style="background:${cw.ground}">${logoAt(ctx, id, w, k)}</div>`;
}

// a print of the brand photographed in place: the scene cropped to bw x bh (percentages, so it stays fluid), held by a piece of tape
export function mock(ctx, sid, arts, [bw, bh], frac, by, alt, cap, cls = '') {
  const sc = ctx.sceneInfo(sid), url = ctx.mockup(sid, arts), c = sceneCrop(sc, bw, bh, frac, by);
  const pc = (v, of) => (v / of * 100).toFixed(3);
  return `<figure class="hg-print${cls ? ' ' + cls : ''}"><div class="hg-print__f" style="aspect-ratio:${bw}/${bh}"><div class="hg-print__i">${plateImg(A(url), A(alt), `width:${pc(c.iw, bw)}%;left:${pc(c.left, bw)}%;top:${pc(c.top, bh)}%`, 'hg-mock')}</div><span class="hg-piece" aria-hidden="true"></span></div><figcaption><span class="hg-k">${A(cap)}</span></figcaption></figure>`;
}
// where the subject sits in each Kerbside photo (read off the pictures); a photo not listed is centred
const POS = { riders: '96% 50%', evening: '8% 50%', busstop: '92% 50%' };
export const posOf = (s) => (s && s.focus ? `${s.focus.x ?? 50}% ${s.focus.y ?? 50}%` : (s && POS[s.id]) || '');
// a print of a brand photograph (a "Your photo" frame in the slot edition, which is a short note, not a tall empty frame)
export function photo(ctx, s, { cls = '', ar = '4/3', pos = '' } = {}) {
  const inner = ctx.photo(s.id, { cls: 'hg-photo' }), slot = inner.includes('photo-slot'), ps = pos || posOf(s);
  return `<figure class="hg-print${slot ? ' hg-print--slot' : ''}${cls ? ' ' + cls : ''}"><div class="hg-print__f"${slot ? '' : ` style="aspect-ratio:${ar}"`}><div class="hg-print__i"${ps ? ` style="--pos:${ps}"` : ''}>${inner}</div><span class="hg-piece" aria-hidden="true"></span></div>${s.caption ? `<figcaption><span class="hg-k">${A(s.caption)}</span></figcaption>` : ''}</figure>`;
}

const thread = () => '<svg class="hg-thread" aria-hidden="true" focusable="false"><line x1="2" y1="0" x2="2" y2="100%"/><circle cx="2" cy="0" r="2"/><circle cx="2" cy="50%" r="2"/><circle cx="2" cy="100%" r="2"/></svg>';

// one open spread: running heads, rows of verso and recto cells (a phone reads them v1, r1, v2, r2), folios; `end` is an endpaper over a whole leaf.
// A cell is markup, null, or lead(markup) (the cell with the page title, which a phone reads first).
export function spread(ctx, id, { rows = [], end = null, cls = '', tab = true, id2 = '' }) {
  const p = pageOf(ctx, id), B = ctx.brand, [f1, f2] = folios(ctx, id);
  const sec = p.section, i = sec ? sec.n - 1 : 0;
  const endV = end && end.side !== 'r', endR = end && end.side === 'r', n = rows.length + 2;
  const cell = (c, side) => {
    if (!c) return `<div class="hg-${side} hg-empty"></div>`;
    const o = typeof c === 'object' ? c : { html: c };
    return `<div class="hg-${side}${o.lead ? ' hg-lead' : ''}">${o.html}</div>`;
  };
  let h = tab && sec ? `<p class="hg-tab" style="--i:${i}">${A(`${sec.n} ${sec.title}`)}</p>` : '';
  if (!endV) h += `<div class="hg-v hg-hd">${A(B.name)} brand guidelines</div>`;
  if (!endR) h += `<div class="hg-r hg-hd">${sec ? A(sec.title) : ''}</div>`;
  if (end) h += `<div class="hg-end ${endV ? 'hg-v' : 'hg-r'}${end.lead ? ' hg-lead' : ''}" style="--span:${n};--eg:${end.ground};--ei:${end.ink}">${end.html}</div>`;
  for (const [v, r] of rows) {
    if (!endV) h += cell(v, 'v');
    if (!endR) h += cell(r, 'r');
  }
  if (!endV) h += `<div class="hg-v hg-ft"><span class="hg-fo">${f1}</span></div>`;
  if (!endR) h += `<div class="hg-r hg-ft"><span class="hg-fo">${f2}</span></div>`;
  return `<section class="hg-spread${cls ? ' ' + cls : ''}" data-page="${A(id)}"${id2 ? ` id="${A(id2)}"` : ''}>${thread()}${h}</section>`;
}
export { brandRoles };
