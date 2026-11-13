// Theme 30, Fluted, lane hk: the UI kit as a website (kitSite). Each page is its heading, the real components (ctx.ui, unrestyled) and, under them, one figure of the
// theme's own device: the band of vertical reeds over that page's values (a ratio, a size, a count) standing as windows, with the values printed in a key row beneath.
// Helpers: lane-hk-glass.js (the figure), lane-hk-parts.js (frame and shell), lane-hk-css.js, lane-hk-found.js, lane-hk-comps.js, lane-hk-pat.js. Every class starts hk-.
import { css } from './lane-hk-css.js';
import { frame, shell } from './lane-hk-parts.js';
import { pages as found } from './lane-hk-found.js';
import { pages as comps } from './lane-hk-comps.js';
import { pages as pat } from './lane-hk-pat.js';

export const kitSite = {
  css,
  shell,
  pages: { ...found, ...comps, ...pat },
  // a page the theme has no composition for: its heading and the pages around it
  fallback: (ctx, K) => frame(ctx, K, { title: K.page.title, show: '', build: () => ({ art: '', items: [] }) }),
};
