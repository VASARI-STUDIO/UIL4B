// Theme 22, Stub: the style guide lane. Nine A4 pages drawn as a ticket: bar-top ground, a paper plate, a perforation and a field-colour stub. The pages live in guide-pages-*.js
// and share guide-kit.js; the md and the shared facts come from engine/styleguide.js. A page that cannot fit throws, and the route leaves it out with a "left out" warning.
import { makeGuide, withHooks, PAGE_IDS } from '../../engine/guide-layout.js';
import { cover } from './guide-pages-a.js';
import { logoPage, colourPage, rulerPage } from './guide-pages-a.js';
import { appliedPage, typePage } from './guide-pages-b.js';
import { contrastPage, tokensPage, usagePage } from './guide-pages-c.js';

const PAGES = { cover, logo: logoPage, colour: colourPage, ruler: rulerPage, applied: appliedPage, type: typePage, contrast: contrastPage, tokens: tokensPage, usage: usagePage };

// which pages draw for this brand decides the folio ("n of total") on every page, so work it out once up front, keeping the md hooks the trial passes set
function drawnIds(ctx) {
  if (ctx._g22ids) return;
  const kept = ctx.mdHooks, ids = [];
  try {
    for (const id of PAGE_IDS) {
      try { PAGES[id](ctx); ids.push(id); } catch (err) { if (err && err.code === 'font_missing') throw err; }
    }
  } finally { ctx.mdHooks = kept; }
  ctx._g22ids = ids;
}
const withFaces = (fn) => (ctx) => { drawnIds(ctx); return withHooks(ctx, () => fn(ctx)); };

export const guide = makeGuide(Object.fromEntries(Object.entries(PAGES).map(([id, fn]) => [id, withFaces(fn)])), { order: PAGE_IDS, extra: ['ruler', 'applied'] });
export { guideCss } from './guide-kit.js';
