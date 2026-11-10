// Shared page helpers for theme 03 (Broadsheet). Every page file imports these; pages return one <section class="pg"> at 1280 x 720.
import { esc } from '../../engine/brand.js';

export const A = esc;
export const ratioText = (t) => `${t} : 1`;
// a tone is named by its role when it is text ("Quiet text"), else by its own name
export const nameOf = (ctx, id) => { const c = ctx.byId[id]; return ctx.tones.some((t) => t.id === id) && c.role.endsWith('text') ? ctx.cap(c.role) : c.name; };
// width that fits a logo version inside a box
export const fit = (ctx, id, maxW, maxH) => { const g = ctx.logo.geos[id]; return Math.floor(Math.min(maxW, (maxH * g.w) / g.h)); };
// "1.0" -> "Edition 1.0"
export const edition = (ctx) => `Edition ${ctx.brand.version.number}`;

// the standard inner page: a running head with the brand, the page title and the folio over a 4 px action rule, then the page body
export function std(ctx, id, inner, cls = '') {
  const p = ctx.pages.find((x) => x.id === id);
  const head = `<div class="hd"><span class="nm">${A(ctx.brand.name)}</span><span class="tt">${p.ref ? `<b class="num">${p.ref}</b>` : ''}${A(p.title)}</span><span class="fo">${ctx.pageNo(id)}</span></div>`;
  return `<section class="pg pg--std ${cls}" data-page="${id}">${head}${inner}</section>`;
}
