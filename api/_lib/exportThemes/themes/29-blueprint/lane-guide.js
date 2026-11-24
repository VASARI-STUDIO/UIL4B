// Theme 29, Drawing Sheet: the A4 style guide. A drawing sheet at 794 x 1123: border with zone references, ink frame, title block at the foot, numbered detail tags and red dimension lines.
// Every fact comes from engine/styleguide.js; nothing here names a colour id, a hex or a brand. Pages place everything with absolute coordinates and measure text with the fonts' own
// metrics, so a page that cannot hold its content throws and the route leaves it out. The kit is in guide-kit.js, the pages in guide-pages-a/b/c.js.
import { PAGE_IDS, withHooks, makeGuide } from '../../engine/guide-layout.js';
import { cover, logoPage, rulerPage, colourPage } from './guide-pages-a.js';
import { appliedPage, typePage } from './guide-pages-b.js';
import { contrastPage, tokensPage, usagePage } from './guide-pages-c.js';

const PAGES = { cover, logo: logoPage, colour: colourPage, ruler: rulerPage, applied: appliedPage, type: typePage, contrast: contrastPage, tokens: tokensPage, usage: usagePage };

// The sheet counter ("003 of 008") counts the pages that are drawn. The route only learns which those are after building, and a page that cannot hold this brand's words is left
// out, so the first page asked for builds every page once to see which draw, and the list is kept on ctx for shell() and title() (guide-kit.js). What the dry pass wrote for
// style-guide.md is put back; a missing font file is not a fit problem and goes on up, as the route does.
function drawnIds(ctx) {
  if (ctx._g29ids) return;
  const kept = ctx.mdHooks, ids = [];
  try {
    for (const id of PAGE_IDS) {
      try { PAGES[id](ctx); ids.push(id); } catch (err) { if (err && err.code === 'font_missing') throw err; }
    }
  } finally { ctx.mdHooks = kept; }
  ctx._g29ids = ids;
}

// each page builds inside withHooks, so what it states for style-guide.md is gathered with the page
const withFaces = (fn) => (ctx) => { drawnIds(ctx); return withHooks(ctx, () => fn(ctx)); };

export const guide = makeGuide(Object.fromEntries(Object.entries(PAGES).map(([id, fn]) => [id, withFaces(fn)])), { order: PAGE_IDS, extra: ['ruler', 'applied'] });

export { guideCss } from './guide-kit.js';
