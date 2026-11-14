// Theme 23, Broadsheet (Pro): the brand's own weekly paper. Every page is one story on a four-column grid of cool grey newsprint, under a folio line and
// a thin-thick rule, with the brand's photographs printed in one ink as a coarse halftone. A3 portrait, 1123 x 1587. Round 1 builds the six gate pages.
// Chrome is Sofia Sans, Sofia Sans Condensed and Fragment Mono (all SIL Open Font Licence 1.1, from Google Fonts).
import { guidelines } from './guidelines.js';
import { N, G, spotOf, bodyWeight, displayWeight, TRACK } from './helpers.js';

export const meta = {
  id: '23-broadsheet', name: 'Broadsheet', tier: 'Pro', brand: 'saltbush',
  guidelinesPage: { w: 1123, h: 1587 }, uikitPage: { w: 1123, h: 1587 },
  chrome: {
    family: 'Sofia Sans', q: 'Sofia+Sans:wght@400',
    faces: [{ weight: 400, stem: 'SofiaSans-400' }, { weight: 600, stem: 'SofiaSans-600' }, { weight: 700, stem: 'SofiaSans-700' }, { weight: 500, style: 'italic', stem: 'SofiaSans-500i' }],
  },
  fonts: [
    { family: 'Sofia Sans Condensed', weight: 600, stem: 'SofiaSansCondensed-600', q: 'Sofia+Sans+Condensed:wght@600' },
    { family: 'Sofia Sans Condensed', weight: 700, stem: 'SofiaSansCondensed-700', q: 'Sofia+Sans+Condensed:wght@700' },
    { family: 'Fragment Mono', weight: 400, stem: 'FragmentMono-400', q: 'Fragment+Mono' },
  ],
};

export { guidelines };
export const uikit = {};

function baseCss(ctx) {
  const B = ctx.brand, d = B.fonts.display, b = B.fonts.body, m = B.fonts.mono, spot = spotOf(ctx);
  return `.pg{--paper:${N.paper};--paper2:${N.paper2};--hair:${N.hair};--ink:${N.ink};--quiet:${N.quiet};--spot:${spot};
  --chrome:'Sofia Sans';--display:'${d.family}',sans-serif;--body:'${b.family}',sans-serif;--bmono:'${(m || b).family}',monospace;
  position:relative;isolation:isolate;background:var(--paper);color:var(--ink);font-family:'Sofia Sans',sans-serif;font-size:16px;line-height:24px;
  font-variant-numeric:tabular-nums;-webkit-font-smoothing:antialiased;font-kerning:normal;font-synthesis:none}
.pg :where(h1,h2,h3,p,ul,ol,figure){margin:0;padding:0}
.pg :where(ul,ol){list-style:none}
.a{position:absolute}
.colm{position:absolute}
.hr{position:absolute;display:block}
.hr-ink{background:var(--ink)}.hr-hair{background:var(--hair)}
.vr{position:absolute;left:-12.375px;top:0;bottom:0;width:.75px;background:var(--hair)}
.vr--r{left:auto;right:-12.375px}
.ln{display:block;white-space:nowrap}
.c-ink{color:var(--ink)}.c-quiet{color:var(--quiet)}.c-right{text-align:right}.nw{white-space:nowrap}

/* chrome: the condensed cut carries the folio line and labels, the normal width carries captions and notes */
.c-folio-no{font:700 20px/24px 'Sofia Sans Condensed',sans-serif;font-variant-numeric:tabular-nums}
.c-folio{font:600 17px/22px 'Sofia Sans Condensed',sans-serif;letter-spacing:.02em}
.c-label{font:600 17px/22px 'Sofia Sans',sans-serif}
.c-cap{font:400 17px/22px 'Sofia Sans',sans-serif}
.c-note{font:400 17px/22px 'Sofia Sans',sans-serif}
.c-jump{font:italic 500 17px/22px 'Sofia Sans',sans-serif;margin-top:16px}
.c-jump i{font-style:italic}.c-jump b{font-style:normal;font-weight:700;font-variant-numeric:tabular-nums}
.c-mono{font:400 16px/22px 'Fragment Mono',monospace}
.flogo svg{display:block}

/* the brand's type, mapped by role: the display face for the headline, one brief or quote; the body face for the rest */
.b-head,.b-title,.b-headxl{font-family:var(--display);font-weight:${displayWeight(ctx)};font-stretch:${d.stretch || 100}%;letter-spacing:${TRACK}em;text-wrap:balance;font-variant-numeric:lining-nums}
.b-title{font-size:40px;line-height:44px}
.b-deck{font:500 24px/32px var(--body);font-weight:${bodyWeight(ctx, 500)}}
.b-body{font:400 16px/24px var(--body);hyphens:auto;-webkit-hyphens:auto}
.b-price{font:700 16px/24px var(--body);font-weight:${bodyWeight(ctx, 700)};color:var(--spot)}

/* plates: the halftone is ink on transparent, so the paper shows between the dots */
.plate{border-top:1px solid var(--ink)}.plate img,.plate .pl{display:block}
.tp-rule{display:block;height:1px;background:var(--ink);margin-bottom:16px}
.tp-line{margin-bottom:8px}

/* flow rules and the intro briefs */
.hr-flow{display:block;height:1px;background:var(--ink)}
.briefs{margin-top:16px}.brief+.brief{margin-top:16px}
.b-brief{font:700 16px/24px var(--body);font-weight:${bodyWeight(ctx, 700)}}

/* the cover */
.ins-row{display:grid;grid-template-columns:32px minmax(0,1fr) auto;column-gap:0;height:36px;align-items:center;border-bottom:.75px solid var(--hair);box-sizing:border-box}
.ins-row.last{border-bottom:1px solid var(--ink)}

/* palette */
.fld-lab p{margin:0}
.ptab{border-top:0}
.prow{display:grid;grid-template-columns:244px 68px 24px 152px 24px 488px;padding:16px 0;min-height:48px;border-bottom:.75px solid var(--hair);align-items:start}
.prow:last-child{border-bottom:1px solid var(--ink)}
.p1{display:flex;gap:12px;grid-column:1}.p1 .key{display:block;width:16px;height:16px;flex:none;margin-top:3px}
.p2{grid-column:2;text-align:right}.p3{grid-column:4}.p4{grid-column:6}
.p3{white-space:nowrap}
.crule{margin-top:48px;width:488px}
.crule .b-brief{font-weight:${bodyWeight(ctx, 700)}}

/* the market report at the foot of the intro */
.lg-row{display:grid;grid-template-columns:488px 232px 232px;column-gap:24px;align-items:center;border-bottom:.75px solid var(--hair);box-sizing:border-box}
.lg-row.last{border-bottom:1px solid var(--ink)}
.lg-to,.lg-price{white-space:nowrap}
.lg-price{font-size:24px;line-height:32px}

/* typefaces */
.fk-name{font-size:20px;line-height:24px;letter-spacing:0;white-space:nowrap}
.gl{white-space:nowrap}.gl .ln{display:block}
.gl-d{font-family:var(--display);font-weight:${displayWeight(ctx)};font-stretch:${d.stretch || 100}%;letter-spacing:${TRACK}em;font-variant-numeric:lining-nums}
.gl-b{font-family:var(--body);font-weight:400}
.gl-m{font-family:var(--bmono);font-weight:400}
.fkj .c-jump{margin-top:0}
.sm{margin:0;hyphens:manual;-webkit-hyphens:manual}
.b-cap{font:400 15px/21px var(--body);color:var(--quiet)}

/* applications: photographs are clean, never screened; the art that goes onto them is drawn in the brand's own faces */
.ph{overflow:hidden}.ph img,.ph .pl{display:block}
.ar-fill{position:absolute;left:0;top:0;right:0;bottom:0;display:block}
.ar-logo svg{display:block}
.ar-line{font-family:var(--body);font-weight:${bodyWeight(ctx, 500)};white-space:nowrap}
.ar-pline{font-family:var(--display);font-weight:${displayWeight(ctx)};font-stretch:${d.stretch || 100}%;letter-spacing:${TRACK}em}
.ar-addr{font:500 16px/24px var(--body);font-weight:${bodyWeight(ctx, 500)}}

/* layouts: the figures are drawn at their own size and scaled down, with a hairline edge */
.fig{overflow:hidden;box-shadow:0 0 0 .75px var(--hair)}
.fig-in{position:absolute;left:0;top:0;transform-origin:0 0;overflow:hidden}
.fp-head{font:700 16px/24px var(--body);font-weight:${bodyWeight(ctx, 700)};padding-bottom:8px;border-bottom:1px solid var(--ink)}
.fp-row{padding:8px 0;border-bottom:.75px solid var(--hair)}.fp-row.last{border-bottom:1px solid var(--ink)}
.fp-when{font:400 14px/20px var(--body);color:var(--quiet)}
.ph-title{font-family:var(--display);font-weight:${displayWeight(ctx)};font-stretch:${d.stretch || 100}%;font-size:34px;line-height:38px;letter-spacing:${TRACK}em}
.ph-row{padding:14px 0;box-sizing:border-box;min-height:72px}
.ph-to{font:500 17px/24px var(--body);font-weight:${bodyWeight(ctx, 500)}}
.ph-sub{display:flex;justify-content:space-between;gap:12px;font:400 14px/20px var(--body)}
.ph-price{font:700 17px/20px var(--body);font-weight:${bodyWeight(ctx, 700)};white-space:nowrap}
.ph-btn{display:flex;align-items:center;justify-content:center;font:600 17px/24px var(--body);font-weight:${bodyWeight(ctx, 600)}}
.po-line{font-family:var(--display);font-weight:${displayWeight(ctx)};font-stretch:${d.stretch || 100}%;letter-spacing:${TRACK}em}
/* slot placeholders: the engine sets a descriptor label in weight 500, which this face does not load */
.ph-b>.ph-l{font-weight:600}
`;
}

// ---- lane modules (overnight build, 11 Nov): each builder adds lane-<name>.js beside this file, merged in file-name order (engine/lanes.js) ----
import { mergeLanes as __mergeLanes, laneCss as __laneCss } from '../../engine/lanes.js';
import * as __bk from './lane-bk.js';
import * as __g1 from './lane-g1.js';
import * as __g2 from './lane-g2.js';
import * as __g3 from './lane-g3.js';
import * as __g4 from './lane-g4.js';
import * as __g5 from './lane-g5.js';
import * as __ht from './lane-ht.js';
import * as __kt from './lane-kt.js';
import * as __u1 from './lane-u1.js';
import * as __u2 from './lane-u2.js';
import * as __u3 from './lane-u3.js';

const __L = __mergeLanes([__bk, __g1, __g2, __g3, __g4, __g5, __ht, __kt, __u1, __u2, __u3]);
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
