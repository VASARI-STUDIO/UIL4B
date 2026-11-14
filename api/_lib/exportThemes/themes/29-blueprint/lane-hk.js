// Theme 29 (Blueprint), lane hk: the kit site (kitSite). The UI kit on the web as the drawing set: one sheet per page on the cool film, zone numbers in
// the margin and a ruled title strip down the right edge (across the head on a phone). The live components sit on plates, light or dark, keyed with
// numbered tags that read across to what each is; prev and next close each sheet like a transmittal. The sheet's own chrome is this lane's; the
// components are the shipped ones and are never restyled.
import { kitCss } from './lane-hk-css.js';
import { shell } from './lane-hk-parts.js';
import { pages1 } from './lane-hk-pages1.js';
import { pages2 } from './lane-hk-pages2.js';
import { pages3 } from './lane-hk-pages3.js';

const pages = { ...pages1, ...pages2, ...pages3 };

export const kitSite = {
  css(ctx) { return kitCss(ctx); },
  shell,
  pages,
  fallback(ctx, K) { return pages.contents(ctx, K); },
};
