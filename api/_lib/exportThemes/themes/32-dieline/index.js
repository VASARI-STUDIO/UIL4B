// Theme 32, Dieline (Pro, square 1080): every page is one panel of the brand's own pack, flattened. A panel is a solid colour field; folds are dashed,
// cuts solid, seals dotted. The application page shows the same panels folded into a real pack. Round 1 builds the six gate pages.
import { guidelines } from './guidelines.js';
import { roles } from './geom.js';

export const meta = {
  id: '32-dieline', name: 'Dieline', tier: 'Pro',
  // R1_BRAND builds the same pages with another brand (the second-brand check in the gate); without it the sample brand builds
  brand: 'kerbside',
  guidelinesPage: { w: 1080, h: 1080 }, uikitPage: { w: 1080, h: 1080 },
  chrome: { family: 'Funnel Sans', q: 'Funnel+Sans:wght@400;500', faces: [{ weight: 400, stem: 'FunnelSans-400' }, { weight: 500, stem: 'FunnelSans-500' }] },
  fonts: [{ family: 'Spline Sans Mono', weight: 400, stem: 'SplineSansMono-400', q: 'Spline+Sans+Mono:wght@400' }],
};

export { guidelines };
export const uikit = {};

function baseCss(ctx) {
  const B = ctx.brand, d = B.fonts.display, b = B.fonts.body, m = B.fonts.mono, R = roles(ctx), W = ctx.weights;
  const g = R.groundText;
  return `.pg{--ground:${R.ground.hex};--ink:${g.ink};--quiet:${g.quiet};--chrome:'${meta.chrome.family}',sans-serif;--val:'Spline Sans Mono',monospace;
  --display:'${d.family}',sans-serif;--body:'${b.family}',sans-serif;--mono:'${m ? m.family : 'Spline Sans Mono'}',monospace;
  background:var(--ground);color:var(--ink);font-family:var(--body);font-size:15px;line-height:1.5;-webkit-font-smoothing:antialiased;font-kerning:normal;isolation:isolate;text-wrap:pretty}
.pg :where(h1,h2,h3,p,ul,ol,figure){margin:0;padding:0}
.pg .fd,.pg .tx,.pg .hd,.pg .fo,.pg img,.pg .lc>*{position:absolute}
.pg .fd{z-index:0}
.pg svg.ln{position:absolute;left:0;top:0;width:100%;height:100%;z-index:1;overflow:visible;pointer-events:none}
.pg .tx{z-index:2;margin:0;white-space:nowrap}
.pg .ph{position:absolute;overflow:hidden;z-index:0}
/* chrome: running head cells and the folio sit at the same y on every page */
.pg .hd{z-index:2;top:32px;font:500 12px/16px var(--chrome);letter-spacing:.01em;color:var(--quiet);white-space:nowrap}
.pg .fo{z-index:2;left:940px;width:100px;top:1020px;text-align:right;font:500 12px/16px var(--chrome);color:var(--ink);font-variant-numeric:tabular-nums}
.pg .lc{z-index:0}
/* chrome type: captions and literal values */
.pg.sat .hd{top:24px}
.pg .cap{font:400 14px/20px var(--chrome)}
.pg .m{font:400 12px/16px var(--val)}
/* brand type */
.pg .disp{font-family:var(--display);font-weight:${W.heading};font-stretch:${d.stretch || 100}%;letter-spacing:0}
.pg .b-body{font:400 15px/1.5 var(--body);font-weight:${W.regular}}
.pg .b-small{font:400 14px/20px var(--body);font-weight:${W.regular}}
.pg .b-med{font-weight:${W.medium}}
.pg .wrap{white-space:normal}
.pg .mono{font-family:var(--mono);font-weight:${m ? m.weights[0] : 400};font-size:12px;line-height:16px}
.pg img.photo{display:block;object-fit:cover}`;
}

// ---- lane modules: the pages and css written in lane-<name>.js beside this file, merged in file-name order (engine/lanes.js) ----
import { mergeLanes as __mergeLanes, laneCss as __laneCss } from '../../engine/lanes.js';
import * as __bk from './lane-bk.js';
import * as __g1 from './lane-g1.js';
import * as __g2 from './lane-g2.js';
import * as __g3 from './lane-g3.js';
import * as __g4 from './lane-g4.js';
import * as __g5 from './lane-g5.js';
import * as __hg from './lane-hg.js';
import * as __hk from './lane-hk.js';
import * as __kt from './lane-kt.js';
import * as __u1 from './lane-u1.js';
import * as __u2 from './lane-u2.js';
import * as __u3 from './lane-u3.js';

const __L = __mergeLanes([__bk, __g1, __g2, __g3, __g4, __g5, __hg, __hk, __kt, __u1, __u2, __u3]);
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
