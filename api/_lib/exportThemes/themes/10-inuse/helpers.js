// Shared page helpers for theme 10 (In use). Pages are 794 x 1123: a running head, a title, the product on a phone, notes beside it.
import { esc } from '../../engine/brand.js';
import { statusText } from '../../engine/tokens.js';

export const A = esc;
// the colour a status's words print in, light mode (a status is plain words in one colour, never a tinted pill)
export const wordsHex = (ctx, s) => statusText(ctx, 'light', s).hex;
export const ratioText = (t) => `${t} : 1`;
// width that fits a logo version inside a box
export const fit = (ctx, id, maxW, maxH) => { const g = ctx.logo.geos[id]; return Math.floor(Math.min(maxW, (maxH * g.w) / g.h)); };
// a tone (soft, quiet) is named by its role in pair labels
export const nameOf = (ctx, id) => { const c = ctx.byId[id]; return ctx.tones.some((t) => t.id === id) && c.role.endsWith('text') ? ctx.cap(c.role) : c.name; };

// the standard page: running head with the folio, a title, then the body
export function std(ctx, id, title, inner, cls = '') {
  const p = ctx.pages.find((x) => x.id === id);
  return `<section class="pg pg--std ${cls}" data-page="${id}"><div class="hd"><span>${A(ctx.brand.name)} brand guidelines</span><span class="fo">${ctx.pageNo(id)}</span></div><h1 class="ttl">${A(title || p.title)}</h1>${inner}</section>`;
}
// a numbered marker; the same circle sits on the screen and beside its note
export const mk = (n, style = '') => `<span class="mk" style="${style}">${n}</span>`;

// the Today screen on a 360 x 740 phone, from ui.screen.content
export function phoneToday(ctx, style = '') {
  const S = ctx.brand.ui.screen.content;
  const lanes = [84, 150, 216, 282].map((x) => `<i class="lane" style="left:${x}px"></i>`).join('');
  return `<div class="ph" style="${style}" aria-hidden="true"><div class="sb">${A(S.time)}</div><div class="scr"><span class="chip" style="color:${wordsHex(ctx, ctx.status[0])}">${A(ctx.status[0].label)}</span><div class="disp s30">${A(S.eta)}</div><div class="pool">${lanes}<span class="fl">${A(S.to)}</span></div><div class="teach"><span class="av">${A(S.initials)}</span><div><b>${A(S.rider.split(',')[0])}</b><span>${A(S.riderNote)}</span></div></div></div></div>`;
}
