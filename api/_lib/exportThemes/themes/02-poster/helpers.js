// Shared page helpers for theme 02. Every page file imports these; pages return one <section class="pg"> at 1280 x 720.
import { esc } from '../../engine/brand.js';

export const A = esc;
export const ratioText = (t) => `${t} : 1`; // no break inside a ratio
// a tone (quiet...) is a text colour: name it by its role in pair labels
export const nameOf = (ctx, id) => ctx.byId[id].name.replace(/ on .+$/, '');
// width that fits a logo version inside a box
export const fit = (ctx, id, maxW, maxH) => { const g = ctx.logo.geos[id]; return Math.floor(Math.min(maxW, (maxH * g.w) / g.h)); };

// the standard poster page: running head (page name left, folio right) in the chrome face, then the page
// ground: '' (Night), 'paper' (Smoke) or 'lamp' (Houselight)
export function std(ctx, id, inner, ground = '', cls = '') {
  const p = ctx.pages.find((x) => x.id === id);
  const head = `<div class="hd"><span>${A(p.title)}</span><span class="num">${ctx.pageNo(id)}</span></div>`;
  return `<section class="pg pg--std ${ground ? 'pg--' + ground : ''} ${cls}" data-page="${id}">${head}${inner}</section>`;
}
