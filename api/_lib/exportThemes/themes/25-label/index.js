// Theme 25, Label (Free): every page is one wall in a gallery. The wall is the brand's own ground colour. One object, or one group, hangs on a sightline at y 384 and on the
// centre of the hang (x 356), wall text (a page title and one line) sits at x 712 from y 96, and a 240 x 256 wall label stays fixed at x 712, y 416 on every page: a pale
// card set in the brand's own body face. 1000 x 800, no photographs, no shadows, no radius. The only edge is a 1 px line on an object close to the wall in tone.
// Round 1 builds the six gate pages; the other six of the Free twelve come in round 2.
import { guidelines } from './guidelines.js';
import { roles, LABEL, WALLTEXT, SIGHT, CREDIT_BASELINE, TERM_COL, lineTop } from './helpers.js';

export const meta = {
  id: '25-label', name: 'Label', tier: 'Free',
  // LABEL_BRAND builds the same pages with another brand (the second-brand check in the gate); without it the sample brand builds
  brand: 'margin',
  guidelinesPage: { w: 1000, h: 800 }, uikitPage: { w: 1000, h: 800 },
  chrome: { family: 'Schibsted Grotesk', q: 'Schibsted+Grotesk:wght@400;500', faces: [{ weight: 400, stem: 'SchibstedGrotesk-400' }, { weight: 500, stem: 'SchibstedGrotesk-500' }] },
};

export { guidelines };
export const uikit = {};

function baseCss(ctx) {
  const B = ctx.brand, d = B.fonts.display, b = B.fonts.body, m = B.fonts.mono, R = roles(ctx);
  const W = ctx.weights;
  const quietWall = R.quietOn(R.wall), quietPanel = R.quietOn(R.panel), quietLabel = R.quietOn(R.labelFill);
  // the credit line is pinned so its baseline lands on the same y on every page
  const creditTop = Math.round(lineTop({ ...ctx, faces: [{ role: 'chrome', stem: meta.chrome.faces[0].stem, style: 'normal' }] }, 'chrome', 12, 16, CREDIT_BASELINE) - LABEL.y);
  return `.pg{--wall:${R.wall};--panel:${R.panel};--label:${R.labelFill};--ink:${R.ink};--quiet:${quietWall};--quiet-panel:${quietPanel};--quiet-label:${quietLabel};--action:${R.action};--edge:${R.edge};
  --chrome:'${meta.chrome.family}',sans-serif;--display:'${d.family}',serif;--body:'${b.family}',serif;--mono:'${m ? m.family : meta.chrome.family}',monospace;
  background:var(--wall);color:var(--ink);font-family:var(--body);font-size:13px;line-height:19px;-webkit-font-smoothing:antialiased;font-kerning:normal;text-wrap:pretty}
.pg :where(h1,h2,h3,p,ul,ol,figure){margin:0;padding:0}
.num{font-variant-numeric:tabular-nums}
.disp{font-family:var(--display);font-weight:${W.heading};font-stretch:${d.stretch || 100}%;letter-spacing:0}

/* chrome: the running head and the folio sit at the same y on every page */
.hd{position:absolute;left:48px;top:21px;width:904px;display:flex;justify-content:space-between;font:500 12px/16px var(--chrome);color:var(--quiet)}
.fo{position:absolute;right:48px;top:748px;font:500 12px/16px var(--chrome);color:var(--ink)}

/* the hang: every object is placed in page coordinates, so the sightline (y ${SIGHT}) is a fact of the markup, never a drawn line */
.hang{position:absolute;left:0;top:0;width:100%;height:100%}
.hang>*,.ob>*{position:absolute}
.ob{position:absolute}
/* the one edge in the theme: 1 px, one colour per brand (the wall drawn toward the ink), only on an object whose fill is close to the wall */
.edge::after{content:'';position:absolute;left:0;top:0;right:0;bottom:0;border:1px solid var(--edge);pointer-events:none}
.key{position:absolute;font:500 12px/16px var(--chrome);color:var(--ink);white-space:nowrap}
.mono{font-family:var(--mono);font-weight:${m ? m.weights[0] : 400};font-size:13px;line-height:18px}
.chrome{font-family:var(--chrome);font-weight:400}

/* wall text: the page title and one line, fixed above the label */
.wt{position:absolute;left:${WALLTEXT.x}px;top:${WALLTEXT.y}px;width:${WALLTEXT.w}px}
.wt-t{font-size:28px;line-height:32px;color:var(--ink);text-wrap:balance}
.wt-l{margin-top:${WALLTEXT.gap}px;font-size:13px;line-height:19px;font-weight:${W.regular};color:var(--quiet);text-wrap:pretty}

/* the label: fixed box, fixed padding, a pale card with ink text, set smaller and tighter than the objects (title 15/18 at ${W.strong}, text 13/18 at ${W.regular}) with a hairline
   between the title block and the text. Never resized; the copy is checked to fit it */
.lb{position:absolute;left:${LABEL.x}px;top:${LABEL.y}px;width:${LABEL.w}px;height:${LABEL.h}px;padding:${LABEL.pad}px;box-sizing:border-box;background:var(--label);color:var(--ink);font-family:var(--body)}
.lb-t{font-size:15px;line-height:18px;font-weight:${W.strong};letter-spacing:-0.005em;text-wrap:balance}
.lb-d{margin-top:4px;font-size:13px;line-height:17px;font-weight:${W.regular};color:var(--quiet-label);text-wrap:pretty}
.lb-p{margin-top:12px;font-size:13px;line-height:18px;font-weight:${W.regular};text-wrap:pretty}
.lb-it{margin-top:12px}
.lb-it p{margin-top:4px;font-size:13px;line-height:18px;font-weight:${W.regular};text-wrap:pretty}
.lb-it p:first-child{margin-top:0}
.lb-it b{font-weight:${W.medium}}
.lb-tb{margin:12px 0 0;display:grid;grid-template-columns:${TERM_COL}px 1fr;font-size:13px;line-height:18px;font-weight:${W.regular}}
.lb-tb dt{font-weight:${W.medium};white-space:nowrap}
.lb-tb dd{margin:0;white-space:nowrap}
.lb-tb dd .mono{margin-right:4px}
.lb-k{margin-top:12px;list-style:none;display:grid;column-gap:12px;font-size:13px;line-height:17px;font-weight:${W.regular}}
.lb-k.c1{grid-template-columns:1fr}.lb-k.c2{grid-template-columns:1fr 1fr}
.lb-k li{display:grid;grid-template-columns:18px 1fr}
.lb-k b{font-weight:${W.medium}}
.lb-c{position:absolute;left:${LABEL.pad}px;top:calc(${creditTop}px + var(--grow,0px));white-space:nowrap;font:400 12px/16px var(--chrome);color:var(--quiet-label)}

/* cover */
.cv-logo{position:absolute}

/* the sign: a printed board */
.sg-line{font-weight:${W.heading}}
.sg-note{font-size:13px;line-height:18px;font-weight:${W.regular};color:var(--quiet-panel);text-wrap:pretty}

/* colour panels: values at the top left, 12 px in */
.sw-n{font-size:13px;line-height:18px;font-weight:${W.medium}}
.sw-v{display:block}
.sw-s{position:absolute;font:500 13px/18px var(--chrome)}

/* type plates */
.pl-g{white-space:nowrap}
.pl-n{font-size:15px;line-height:20px;font-weight:${W.medium};color:var(--ink)}
.pl-r{font-size:13px;line-height:18px;font-weight:${W.regular};color:var(--quiet-panel)}
.pl-b{color:var(--ink);text-wrap:pretty}
.pl-w{font-size:17px;line-height:24px;color:var(--ink)}

/* the business card: 3.2 px to the millimetre */
.cd{width:224px}
.cd-n{font:${W.strong} 14px/18px var(--body);color:var(--ink)}
.cd-r{font:${W.regular} 12px/16px var(--body);color:var(--quiet-panel)}
.cd-e{font:${W.regular} 12px/16px var(--body);color:var(--ink)}
`;
}

// ---- lane modules: the pages and css written in lane-<name>.js beside this file, merged in file-name order (engine/lanes.js) ----
import { mergeLanes as __mergeLanes, laneCss as __laneCss } from '../../engine/lanes.js';
import * as __g1 from './lane-g1.js';
import * as __g2 from './lane-g2.js';
import * as __g3 from './lane-g3.js';
import * as __g5 from './lane-g5.js';
const __L = __mergeLanes([__g1, __g2, __g3, __g5]);
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
