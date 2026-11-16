// Theme 31, Contact sheet: a photo studio's proof sheet. A 1500 x 1000 page; a strip of film across the top holds the page's own frame (circled in a grease-pencil loop)
// and its neighbours; the words live in a caption column in the margin. Everything reads roles and colourways from the brand; no hex is written here.
import { tokens } from './helpers.js';
import { guidelines as g } from './guidelines.js';

export const meta = {
  id: '31-contact', name: 'Contact', tier: 'Pro', brand: 'plumbline',
  guidelinesPage: { w: 1500, h: 1000 }, uikitPage: { w: 1500, h: 1000 },
  // Instrument Sans in two widths: width 100 at 400 and 500 for chrome labels, width 75 at 600 for the edge print and frame numerals. Each weight has its own pinned query.
  chrome: {
    family: 'Instrument Sans', q: 'Instrument+Sans:wdth,wght@100,400',
    faces: [
      { weight: 400, stem: 'InstrumentSans-100-400', q: 'Instrument+Sans:wdth,wght@100,400' },
      { weight: 500, stem: 'InstrumentSans-100-500', q: 'Instrument+Sans:wdth,wght@100,500' },
    ],
  },
  fonts: [
    { family: 'Instrument Sans', weight: 600, stretch: 75, stem: 'InstrumentSans-75-600', q: 'Instrument+Sans:wdth,wght@75,600' },
    { family: 'Source Serif 4', weight: 400, stem: 'SourceSerif4-400', q: 'Source+Serif+4:opsz,wght@60,400' },
    { family: 'Source Serif 4', weight: 600, stem: 'SourceSerif4-600', q: 'Source+Serif+4:opsz,wght@60,600' },
  ],
};

export const guidelines = g;
export const uikit = {};

function baseCss(ctx) {
  const T = tokens(ctx), B = ctx.brand, d = B.fonts.display, b = B.fonts.body, m = B.fonts.mono;
  const stretch = d.stretch || 100;
  return `.pg{--ground:${T.ground};--ink:${T.ink};--soft:${T.soft};--quiet:${T.quiet};--hair:${T.hair};--panel:${T.panel};--strong:${T.strong};--film:${T.film};--hole:${T.hole};--gate:${T.gate};--edge:${T.edge};--loop:${T.loop};
  --chrome:'Instrument Sans',sans-serif;--display:'${d.family}',serif;--body:'${b.family}',sans-serif;--mono:'${m.family}',monospace;
  position:relative;overflow:hidden;background:var(--ground);color:var(--ink);font:400 14px/22px var(--body);font-stretch:100%;-webkit-font-smoothing:antialiased}
.pg :where(h1,h2,h3,p,ul,ol,figure){margin:0;padding:0}
.pg :where(ul,ol){list-style:none}
.a{position:absolute;white-space:nowrap}
.strip{isolation:isolate}
.edge{font:600 12px/12px var(--chrome);font-stretch:75%;letter-spacing:.04em;text-transform:uppercase;color:var(--edge)}
.tri{display:inline-block;width:0;height:0;margin:0 0 0 6px;border-left:6px solid currentColor;border-top:3.5px solid transparent;border-bottom:3.5px solid transparent}
.pslot{display:flex;align-items:center;justify-content:center;box-sizing:border-box;border:1px dashed var(--edge);background:var(--film)}
.pg .logo-slot{padding:0 6px;font-weight:500!important;line-height:1!important}
.fno{font:600 40px/40px var(--chrome);font-stretch:75%;font-variant-numeric:tabular-nums;color:var(--ink)}
.num{font-variant-numeric:tabular-nums}
.nl{font:500 12px/16px var(--chrome);font-stretch:100%;letter-spacing:.02em;color:var(--quiet)}
.ft{font:400 12px/16px var(--chrome);font-stretch:100%;color:var(--quiet)}
.ct{font:500 16px/24px var(--body);color:var(--ink);overflow:hidden;text-overflow:ellipsis}
.cx{font:400 14px/22px var(--body);color:var(--soft);white-space:normal;text-wrap:pretty}
.fr{border-radius:2px;overflow:hidden}
.fr::after{content:"";position:absolute;inset:0;border-radius:2px;box-shadow:inset 0 0 0 1px oklch(1 0 0 / .1);pointer-events:none}
.fr--empty{box-shadow:inset 0 0 0 1px ${T.gate}}
.fr--empty::after{box-shadow:none}
.disp{font-family:var(--display);font-style:normal;font-weight:${ctx.weights.heading};font-stretch:${stretch}%;letter-spacing:-0.01em}
.mono{font:400 12px/18px var(--mono);color:var(--quiet)}
.hl{background:var(--hair)}
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
