// Shared page helpers for theme 05, Specimen. Every page file imports these; pages return one <section class="pg"> at 794 x 1123.
import { esc } from '../../engine/brand.js';

export const A = esc;
export const ratioText = (t) => `${t} : 1`;
// a tone (quiet...) is a text colour: name it by its role, so it reads "Quiet text on Cream"
export const nameOf = (ctx, id) => { const c = ctx.byId[id]; return ctx.tones.some((t) => t.id === id) && c.role.endsWith('text') ? ctx.cap(c.role) : c.name; };
// width that fits a logo version inside a box
export const fit = (ctx, id, maxW, maxH) => { const g = ctx.logo.geos[id]; return Math.floor(Math.min(maxW, (maxH * g.w) / g.h)); };

// the specimen sheet: bold title left, brand and folio right, then the page's one subject
export function std(ctx, id, inner, cls = '') {
  const p = ctx.pages.find((x) => x.id === id);
  const head = `<div class="hd"><span class="hd-t">${p.ref ? `<b class="num">${p.ref}</b>` : ''}${A(p.title)}</span><span>${A(ctx.brand.name)} brand guidelines<i class="fo num">${ctx.pageNo(id)}</i></span></div>`;
  return `<section class="pg pg--std ${cls}" data-page="${id}">${head}${inner}</section>`;
}
