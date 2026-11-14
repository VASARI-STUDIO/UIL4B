// Theme 22, Ticket (Pro): every page is a printed roll ticket lying on a dark bar top. A big field of the brand's colour carries the page's one thing;
// a perforation with two die-cut notches divides it from a stub, and the stub holds the only chrome (section, page, a serial that is the page number,
// and a barcode that encodes the page id). 1280 x 720. Round 1 builds the six gate pages; the other 27 pages, the UI kit and the book come in round 2.
import { guidelines } from './guidelines.js';
import { roles } from './helpers.js';

// the sample brand builds the pages
const BRAND = 'encore';
// the theme brings no chrome face of its own: the stub and the captions are set in the brand's body face, so its files are the chrome files
const bodyFont = { family: 'Work Sans', css: 'Work+Sans:wght@400;500;600', file: 'WorkSans', weights: [400, 500, 600] };

export const meta = {
  id: '22-ticket', name: 'Stub', tier: 'Pro', brand: BRAND,
  guidelinesPage: { w: 1280, h: 720 }, uikitPage: { w: 1280, h: 720 },
  chrome: { family: bodyFont.family, q: bodyFont.css, faces: bodyFont.weights.map((w) => ({ weight: w, stem: `${bodyFont.file}-${w}` })) },
};

export { guidelines };
export const uikit = {};

function baseCss(ctx) {
  const B = ctx.brand, d = B.fonts.display, b = B.fonts.body, m = B.fonts.mono, R = roles(ctx), W = ctx.weights;
  return `.pg{--table:${R.table};--field:${R.field};--ink:${R.fieldInk};--paper:${R.paper};--quiet:${R.quiet};--edge:${R.edge};
  --chrome:'${b.family}',sans-serif;--display:'${d.family}',sans-serif;--body:'${b.family}',sans-serif;--mono:'${m.family}',monospace;
  position:relative;isolation:isolate;background:var(--table);color:var(--paper);font-family:var(--body);font-size:13px;line-height:18px;-webkit-font-smoothing:antialiased;font-kerning:normal}
.pg :where(h1,h2,h3,p,ul,ol,figure){margin:0;padding:0}
.disp{font-family:var(--display);font-weight:${W.heading};font-stretch:${d.stretch || 100}%;font-variant-numeric:tabular-nums}
.num{font-variant-numeric:tabular-nums}
.m{font-family:var(--mono);font-weight:${m.weights[0]};font-size:12px;line-height:16px;font-variant-numeric:tabular-nums}

/* the ticket: plates (the colour under the text), the SVG (holes, notches, edges), then the content */
.plates,.tk{position:absolute;left:0;top:0;width:100%;height:100%;z-index:0}
.pl{position:absolute}
.ct{position:absolute;left:0;top:0;width:100%;height:100%;z-index:1}
.ct .a,.a{position:absolute}
.bc{position:absolute;left:0;top:0}

/* the type scale: c- chrome in the body face, d- display */
.c12{font:400 12px/16px var(--body)}
.c13{font:400 13px/18px var(--body)}
.c13.b,.c12.b{font-weight:600}
.c15{font:400 15px/22px var(--body)}
.c15.b{font-weight:600}
.c20{font:400 20px/28px var(--body)}
.c24{font:500 24px/32px var(--body);letter-spacing:-0.005em}
.fit{position:absolute}
.ln{display:block;white-space:nowrap}
.nw{white-space:nowrap}

/* the stub: fixed slots, identical on every page */
.st{position:absolute;left:1016px;width:192px;color:var(--ink)}
.st.c13,.st.c12{margin:0}
.st.b{font-weight:600}
.st.two{height:32px}
.st.serial{font-family:var(--display);font-weight:${W.heading};font-stretch:${d.stretch || 100}%;font-size:56px;line-height:56px;letter-spacing:-0.015em;font-variant-numeric:tabular-nums;white-space:nowrap}
.st.mono12{font-family:var(--mono);font-weight:${m.weights[0]};font-size:12px;line-height:16px}
.st.c12,.st.c13{font-family:var(--body)}

/* on the field the hierarchy is weight and size only; on the bar top it is paper and the measured quiet colour */
.ink{color:var(--ink)}
.paper{color:var(--paper)}
.qt{color:var(--quiet)}
.zone b{font-weight:600;color:var(--paper)}

/* logo slot frame for the slot edition: 1 px dashed, labelled top left */
.logo-slot{align-items:flex-start!important;justify-content:flex-start!important;padding:8px;text-align:left!important}
.slotframe{position:absolute;box-sizing:border-box;border:1px dashed var(--ink);color:var(--ink);padding:8px;font:400 13px/18px var(--body)}

/* arts drawn inside the page (layouts) or photographed (signage): their own coordinates, their own ground */
.ar{position:absolute;overflow:hidden}
.ar::after{content:'';position:absolute;inset:0;box-shadow:inset 0 0 0 1px oklch(0 0 0 / .14);pointer-events:none;z-index:2}
/* zoom, not transform: a scaled box wider than its slot makes Chromium's print shrink the PDF page */
.ar .sc{position:absolute;left:0;top:0}
.ar .sc *{box-sizing:border-box}
.pg--art{background:transparent}
.ar-body{font-family:var(--body)}
.ar .a,.ar-root .a{position:absolute}
.ar-root{position:absolute;left:0;top:0;overflow:hidden;font-family:var(--body);-webkit-font-smoothing:antialiased}
.ar-root .ln{display:block;white-space:nowrap}
`;
}

// ---- lane modules (overnight build, 11 Nov): each builder adds lane-<name>.js beside this file, merged in file-name order (engine/lanes.js) ----
import { mergeLanes as __mergeLanes, laneCss as __laneCss } from '../../engine/lanes.js';
import * as __bk_apps from './lane-bk-apps.js';
import * as __bk_css from './lane-bk-css.js';
import * as __bk from './lane-bk.js';
import * as __g1 from './lane-g1.js';
import * as __g2 from './lane-g2.js';
import * as __g3 from './lane-g3.js';
import * as __g4 from './lane-g4.js';
import * as __g5 from './lane-g5.js';
import * as __ht_css from './lane-ht-css.js';
import * as __ht_guide from './lane-ht-guide.js';
import * as __ht_kit from './lane-ht-kit.js';
import * as __ht_parts from './lane-ht-parts.js';
import * as __ht from './lane-ht.js';
import * as __kt from './lane-kt.js';
import * as __u1 from './lane-u1.js';
import * as __u2 from './lane-u2.js';
import * as __u3 from './lane-u3.js';

const __L = __mergeLanes([__bk_apps, __bk_css, __bk, __g1, __g2, __g3, __g4, __g5, __ht_css, __ht_guide, __ht_kit, __ht_parts, __ht, __kt, __u1, __u2, __u3]);
Object.assign(guidelines, __L.guidelines);
Object.assign(uikit, __L.uikit);
if (__L.fonts.length) meta.fonts = [...(meta.fonts || []), ...__L.fonts];
export const css = __laneCss(baseCss, __L);
export const brandBook = __L.brandBook || undefined;
export const bookCss = __L.bookCss || undefined;
export const readMe = __L.readMe || undefined;
export const sheets = __L.sheets || undefined;
export const guideSite = __L.guideSite || undefined;
export const kitSite = __L.kitSite || undefined;
