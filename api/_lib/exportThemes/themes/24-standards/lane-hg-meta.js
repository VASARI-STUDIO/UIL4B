// Theme 24, Standards, lane hg: where a guideline sits (section number, its place in the section, its reference) and the page's opening.
import { GUIDE_PAGES } from '../../engine/pages.js';
import { A } from './helpers.js';

const PAGES = GUIDE_PAGES.filter((p) => p.section);
const SECS = [...new Set(PAGES.map((p) => p.section.title))];
export const meta = (id) => {
  const p = PAGES.find((q) => q.id === id), sn = SECS.indexOf(p.section.title) + 1, k = PAGES.filter((q) => q.section.title === p.section.title).findIndex((q) => q.id === id) + 1;
  return { id, title: p.title, sec: p.section.title, sn, ref: `${sn}.${k}` };
};
// row numbers: 3.2 -> 3.2.1, 3.2.2 ...
export const rowNo = (id, i, j) => `${meta(id).ref}.${i + 1}${j == null ? '' : '.' + (j + 1)}`;
// the running head, the one h1 and an optional lead (html; callers escape brand copy)
export function top(ctx, id, lead) {
  const m = meta(id);
  return `<div class="hg-rh" aria-hidden="true"><span>${A(ctx.brand.name)} brand guidelines</span><span><span class="hg-rh__n">${m.ref}</span> ${A(m.title)}</span></div><h1 class="hg-h1">${A(m.title)}</h1>${lead ? `<p class="hg-lead">${lead}</p>` : ''}`;
}
export const sub = (no, text) => `<h2 class="hg-h2"><span class="hg-no">${no}</span>${A(text)}</h2>`;
