// Theme 22, Ticket: lane ht, the webpage versions of the guidelines and the UI kit. The guidelines site is lane-ht-guide.js, the UI kit site
// lane-ht-kit.js; the box office bar, the running order and the page ticket they share are lane-ht-parts.js, the stylesheet lane-ht-css.js.
import { guideSite as G } from './lane-ht-guide.js';
import { kitSite as K } from './lane-ht-kit.js';
import { htCss } from './lane-ht-css.js';

export const guideSite = { ...G, css: htCss };
export const kitSite = { ...K, css: htCss };
