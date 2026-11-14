// Theme 30, Fluted (Pro): every page is a flat composition above and below one band of vertical glass reeds. The band y 768 to 1152 refracts the
// page's behind-art (the palette in proportion plus the page's one shape), mirrored and magnified about each reed. Round 1 builds the six gate pages
// and the section opener. 1080 x 1350, no photographs on the guidelines pages except the business card, radius 0 on every theme element.
import { guidelines } from './guidelines.js';
import { tokens } from './helpers.js';

export const meta = {
  id: '30-fluted', name: 'Fluted', tier: 'Pro',
  brand: 'northern-current',
  guidelinesPage: { w: 1080, h: 1350 }, uikitPage: { w: 1080, h: 1350 },
  // Familjen Grotesk is the chrome on both brands: one fixed face for the head, folio and keys, so it never swaps with the brand's body face
  chrome: { family: 'Familjen Grotesk', q: 'Familjen+Grotesk:wght@400;500', faces: [{ weight: 400, stem: 'FamiljenGrotesk-400' }, { weight: 500, stem: 'FamiljenGrotesk-500' }] },
  // DM Mono sets folios and values on both brands
  fonts: [{ family: 'DM Mono', weight: 400, stem: 'DMMono-400', q: 'DM+Mono:wght@400' }],
};

export { guidelines };
export const uikit = {};

function baseCss(ctx) {
  const B = ctx.brand, d = B.fonts.display, b = B.fonts.body, m = B.fonts.mono, T = tokens(ctx), W = ctx.weights;
  return `.pg{--ground:${T.ground};--ink:${T.ink};--soft:${T.soft};--quiet:${T.quiet};--hair:${T.hair};--panel:${T.panel};--strong:${T.strong};
  --chrome:'${meta.chrome.family}',sans-serif;--dm:'DM Mono',monospace;--display:'${d.family}',sans-serif;--body:'${b.family}',sans-serif;--mono:'${m ? m.family : 'DM Mono'}',monospace;
  background:var(--ground);color:var(--ink);font-family:var(--body);font-size:16px;line-height:25px;font-weight:${W.regular};-webkit-font-smoothing:antialiased;font-kerning:normal;overflow:hidden}
.pg :where(h1,h2,h3,p,ul,ol,figure){margin:0;padding:0}
.pg svg{display:block}
.a{position:absolute;white-space:nowrap}
.disp{font-family:var(--display);font-weight:${W.heading};font-stretch:${d.stretch || 100}%;letter-spacing:-0.02em}
.hd{font:500 15px/20px var(--chrome);color:var(--ink)}
.fo{font:400 15px/20px var(--dm);color:var(--quiet);text-align:right}
.ft{font:400 15px/20px var(--chrome);color:var(--quiet)}
.k{font:400 15px/20px var(--chrome);color:var(--soft)}
.kn{font:500 15px/20px var(--chrome);color:var(--ink)}
.v{font:400 15px/20px var(--dm);color:var(--quiet)}
.mono{font-family:var(--mono);font-weight:${m ? m.weights[0] : 400}}
.body{font:${W.regular} 16px/25px var(--body);color:var(--soft);white-space:normal}
.hair{position:absolute;height:1px;background:var(--hair)}
.num{font-variant-numeric:tabular-nums}
.pg .ph-keep .ph-c{font-size:1em}`;
}

// ---- lane modules (overnight build, 11 Nov): each builder adds lane-<name>.js beside this file, merged in file-name order (engine/lanes.js) ----
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
