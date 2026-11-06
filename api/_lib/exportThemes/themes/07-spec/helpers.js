// Shared page helpers for theme 07 (Specification). Pages return one <section class="pg"> at 794 x 1123.
import { esc } from '../../engine/brand.js';

export const A = esc;
export const ratioText = (t) => `${t} : 1`;
// literal values (hex, token, version) are set in mono
export const mono = (s) => `<span class="m">${A(s)}</span>`;
export const nameOf = (ctx, id) => { const c = ctx.byId[id]; return ctx.tones.some((t) => t.id === id) && c.role.endsWith('text') ? ctx.cap(c.role) : c.name; };
// width that fits a logo version inside a box
export const fit = (ctx, id, maxW, maxH) => { const g = ctx.logo.geos[id]; return Math.floor(Math.min(maxW, (maxH * g.w) / g.h)); };
export const issued = (ctx) => new Date(ctx.brand.version.date + 'T00:00:00Z').toLocaleDateString('en-AU', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });
export const sectionOf = (ctx, id) => ctx.sections.find((s) => s.pages.some((p) => p.id === id));

// Each section is normative (it sets requirements) or informative (it explains). Keyed by section number (engine/pages.js GUIDE_PAGES).
const KIND = { 1: 'informative', 2: 'normative', 3: 'normative', 4: 'normative', 5: 'normative', 6: 'normative', 7: 'normative', 8: 'normative', 9: 'informative' };
export const kindOf = (n) => KIND[n] || 'normative';
// the document's designation, "Northern Current 1:2026": the brand's full name (brand data nameRules: never initials), part 1, the year of issue.
// The name is read whole and escaped once, so the slot edition's placeholder stays whole too.
export const designation = (ctx) => `${A(ctx.brand.name)} 1:${String(ctx.brand.version.date).slice(0, 4)}`;
export const pageCount = (ctx) => ctx.pages[ctx.pages.length - 1].no;

// running head: the section and its kind (or the document) on the left, "Northern Current 1:2026, page 14 of 33" on the right
export function head(ctx, id) {
  const s = sectionOf(ctx, id);
  const left = s ? `§${s.n} ${A(s.title)} (${kindOf(s.n)})` : `${A(ctx.brand.name)} brand guidelines ${mono(ctx.brand.version.number)}`;
  return `<div class="hd"><span>${left}</span><span>${designation(ctx)}, page <span class="num">${ctx.pageNo(id)}</span> of <span class="num">${pageCount(ctx)}</span></span></div>`;
}
// the standard page: head, then the page's own markup; `note` sits at the foot
export function std(ctx, id, inner, { cls = '', note = '' } = {}) {
  return `<section class="pg pg--std ${cls}" data-page="${id}">${head(ctx, id)}${inner}${note ? `<p class="foot">${note}</p>` : ''}</section>`;
}
// "4.3 Contrast" and an optional lede
export function title(ctx, id, lede = '') {
  const p = ctx.pages.find((x) => x.id === id);
  return `<h1 class="t">${p.ref ? `${p.ref} ` : ''}${A(p.title)}</h1>${lede ? `<p class="lede">${lede}</p>` : ''}`;
}
