// Shared page helpers for theme 06, Studio. Every page file imports these; pages return one <section class="pg"> at 794 x 1123.
import { esc } from '../../engine/brand.js';

export const A = esc;
export const ratioText = (t) => `${t} : 1`;
// a tone (soft, quiet...) is a text colour: name it by its role, so it reads "Quiet text on White"
export const nameOf = (ctx, id) => { const c = ctx.byId[id]; return ctx.tones.some((t) => t.id === id) && c.role.endsWith('text') ? ctx.cap(c.role) : c.name; };
// width that fits a logo version inside a box
export const fit = (ctx, id, maxW, maxH) => { const g = ctx.logo.geos[id]; return Math.floor(Math.min(maxW, (maxH * g.w) / g.h)); };

// The standard page: running head (document name left, folio right), a page title and one line of intro, the body, then a hairline foot.
// `inner` is the body markup; `lead` the one sentence under the title (omit for pages that carry their own).
export function std(ctx, id, inner, { lead = '', cls = '', title } = {}) {
  const p = ctx.pages.find((x) => x.id === id);
  const head = `<header class="hd"><span class="hd__t">${A(ctx.brand.name)} ${ctx.kind === 'uikit' ? 'UI kit' : 'brand guidelines'}</span><span class="num">${ctx.pageNo(id)}</span></header>`;
  const top = `<div class="top"><h1>${A(title || p.title)}</h1>${lead ? `<p class="lead">${A(lead)}</p>` : ''}</div>`;
  const foot = `<footer class="fo"><span>${p.ref ? `<span class="num">${p.ref}</span> ` : ''}${A(p.title)}</span><span class="num">${A(ctx.versionLine)}</span></footer>`;
  return `<section class="pg pg--std ${cls}" data-page="${id}">${head}${top}<div class="bd">${inner}</div>${foot}</section>`;
}
