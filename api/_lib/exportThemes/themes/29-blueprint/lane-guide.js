// Theme 29, Drawing Sheet: the A4 style guide. A drawing sheet at 794 x 1123: border with zone references, ink frame, title block at the foot, numbered detail tags and red dimension lines.
// Every fact comes from engine/styleguide.js; nothing here names a colour id, a hex or a brand. Pages place everything with absolute coordinates and measure text with the fonts' own
// metrics, so a page that cannot hold its content throws and the route leaves it out. The kit is in guide-kit.js, the pages in guide-pages-a/b/c.js.
import { PAGE_IDS, withHooks, makeGuide } from '../../engine/guide-layout.js';
import { cover, logoPage, rulerPage, colourPage } from './guide-pages-a.js';
import { appliedPage, typePage } from './guide-pages-b.js';
import { contrastPage, tokensPage, usagePage } from './guide-pages-c.js';

// each page builds inside withHooks, so what it states for style-guide.md is gathered with the page
const withFaces = (fn) => (ctx) => withHooks(ctx, () => fn(ctx));

export const guide = makeGuide({
  cover: withFaces(cover), logo: withFaces(logoPage), colour: withFaces(colourPage), ruler: withFaces(rulerPage), applied: withFaces(appliedPage),
  type: withFaces(typePage), contrast: withFaces(contrastPage), tokens: withFaces(tokensPage), usage: withFaces(usagePage),
}, { order: PAGE_IDS, extra: ['ruler', 'applied'] });

export { guideCss } from './guide-kit.js';
