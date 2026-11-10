// Shared page helpers for theme 08 (Monograph). Pages are 794 x 1123: a running head in italic chrome, a folio, plates with margin captions.
import { esc } from '../../engine/brand.js';

export const A = esc;
export const ratioText = (t) => `${t} : 1`;
// a tone (quiet, panel...) is named by its role, so it reads "Quiet text on White"
export const nameOf = (ctx, id) => { const c = ctx.byId[id]; return ctx.tones.some((t) => t.id === id) && c.role.endsWith('text') ? ctx.cap(c.role) : c.name; };
// width that fits a logo version inside a box
export const fit = (ctx, id, maxW, maxH) => { const g = ctx.logo.geos[id]; return Math.floor(Math.min(maxW, (maxH * g.w) / g.h)); };

// the standard page: running head (italic title left, folio right), content, nothing else
export function std(ctx, id, inner, cls = '') {
  const p = ctx.pages.find((x) => x.id === id);
  const head = `<div class="hd"><span class="it">${A(ctx.brand.name)}, brand guidelines</span><span class="num">${ctx.pageNo(id)}</span></div>`;
  return `<section class="pg pg--std ${cls}" data-page="${id}">${head}${inner}</section>`;
}
// the margin column: a plate number and title, then facts as term and detail
export const facts = (items) => `<dl class="facts">${items.map(([t, d, cls]) => `<dt>${A(t)}</dt><dd${cls ? ` class="${cls}"` : ''}>${d}</dd>`).join('')}</dl>`;
