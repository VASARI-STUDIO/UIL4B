// Theme 28, Print Shop: the themed A4 style guide, nine pages (cover, logo, colour, proportion, applied, type, contrast, tokens, usage). The md and phone editions come from the shared engine.
import { makeGuide, withHooks, PAGE_IDS } from '../../engine/guide-layout.js';
import { cover, logoPage, colourPage, rulerPage } from './guide-pages-a.js';
import { appliedPage, typePage } from './guide-pages-b.js';
import { contrastPage, tokensPage, usagePage } from './guide-pages-c.js';

const PAGES = { cover, logo: logoPage, colour: colourPage, ruler: rulerPage, applied: appliedPage, type: typePage, contrast: contrastPage, tokens: tokensPage, usage: usagePage };

// which pages this brand draws, found once by a dry pass, so each page's folio reads "n / total" over the pages that are really in the set
function drawnIds(ctx) {
  if (ctx._g28ids) return;
  const kept = ctx.mdHooks, ids = [];
  try {
    for (const id of PAGE_IDS) {
      try { PAGES[id](ctx); ids.push(id); } catch (err) { if (err && err.code === 'font_missing') throw err; }
    }
  } finally { ctx.mdHooks = kept; }
  ctx._g28ids = ids;
}
const withFaces = (fn) => (ctx) => { drawnIds(ctx); return withHooks(ctx, () => fn(ctx)); };

export const guide = makeGuide(Object.fromEntries(Object.entries(PAGES).map(([id, fn]) => [id, withFaces(fn)])), { order: PAGE_IDS, extra: ['ruler', 'applied'] });
export { guideCss } from './guide-kit.js';
