// Theme 28, Riso (round 1): one sheet off the brand's own riso press. A paper stock you can see, and at most three drums of solid ink
// that overprint (multiply). Words are set in the brand's own body face; literal values (hex, rgb, oklch, mm, %, folios) are set in
// Sono Mono (Tyler Finck, SIL Open Font Licence 1.1, from Google Fonts: Sono's MONO axis pinned to 1, a static instance).
// Sono at MONO 0 does load and measures proportional, but its slab-footed i, l and r still read as a typewriter at 11 px, so no word is set in it.


import { guidelines } from './guidelines.js';
import { pressOf } from './sheet.js';
import { tile } from './tiles.js';

const BRAND = 'long-room';

export const meta = {
  id: '28-riso', name: 'Print Shop', tier: 'Pro', brand: BRAND,
  guidelinesPage: { w: 794, h: 1123 }, uikitPage: { w: 794, h: 1123 },
  chrome: { family: 'Sono Mono', q: 'Sono:wght,MONO@400,1', faces: [{ weight: 400, stem: 'SonoMono-400', q: 'Sono:wght,MONO@400,1' }] },
  fonts: [],
};

function baseCss(ctx) {
  const P = pressOf(ctx), B = ctx.brand, d = B.fonts.display, b = B.fonts.body, m = B.fonts.mono;
  const mask = (u, n = 512) => `-webkit-mask-image:url(${u});mask-image:url(${u});-webkit-mask-size:${n}px ${n}px;mask-size:${n}px ${n}px`;
  // only the screens this press uses are inlined (a 768 px tile shown at 384 css px: a grain is 0.5 css px)
  // a 24% pass is printed as two nested screens (17, and the ring up to 31), so those tiles are inlined for it
  const scr = [...new Set([P.plateScreen, P.passScreen, ...(P.passScreen === 24 ? [17, 'ring'] : [])].filter(Boolean))].map((n) => `.pg .mk${n}{${mask(tile(`screen-${n}.png`), 384)}}`).join(String.fromCharCode(10));
  return `.pg{--fibre:url(${tile('paper-fibre.png')});--paper:${P.paper};--key:${P.key};--plate:${P.plate};--pass:${P.pass};--passp:${P.passPlate || P.pass};--hit:${P.hit};--knock:${P.paper};--ptxt:${P.textOnPlate};--hair:${P.key};
  --chrome:'${b.family}',sans-serif;--cmono:'Sono Mono',monospace;--display:'${d.family}',serif;--body:'${b.family}',sans-serif;--bmono:'${(m || b).family}',monospace;
  position:relative;isolation:isolate;overflow:hidden;background:var(--paper);color:var(--key);font:400 14px/21px var(--chrome);-webkit-font-smoothing:antialiased}
.pg :where(h1,h2,h3,p,ul,ol,figure){margin:0;padding:0}
.pg *{box-sizing:border-box}
.pg::before{content:'';position:absolute;inset:0;z-index:0;background:var(--fibre);background-size:512px 512px;background-position:var(--fx,0) var(--fy,0);mix-blend-mode:multiply;pointer-events:none}
.pg .fib{isolation:isolate}
.pg .fib::before{content:'';position:absolute;inset:0;z-index:0;background:var(--fibre);background-size:512px 512px;background-position:137px 61px;mix-blend-mode:multiply;pointer-events:none}
.pg .dr{position:absolute;mix-blend-mode:multiply;pointer-events:none}
.pg .mot{${mask(tile('ink-mottle.png'))}}
${scr}
.pg .lay{position:absolute;inset:0}
.pg .a{position:absolute}
.pg .nw{white-space:nowrap}
.pg .sq{position:absolute;top:1082px;width:10px;height:10px}
.pg .ov{position:absolute;top:1082px;width:10px;height:10px;isolation:isolate}
.pg .ov i{position:absolute;inset:0}
.pg .c-body{font:400 14px/21px var(--chrome)}
.pg .c-note{font:400 12px/17px var(--chrome)}
.pg .ph-ts .ph-c{font-size:min(1em,13px);white-space:nowrap}
.pg .c-label{font:600 11px/14px var(--chrome);letter-spacing:.01em}
.pg .c-foot{font:400 11px/14px var(--chrome);letter-spacing:.01em}
.pg .c-value{font:400 11px/14px var(--cmono);font-variant-numeric:tabular-nums}
.pg span.v{font-family:var(--cmono);font-weight:400;font-variant-numeric:tabular-nums;font-size:.92em}
.pg .bd{font-family:var(--display)}.pg .bn{font-family:var(--body)}
`;
}
export { guidelines };
export const uikit = {};

// ---- lane modules (overnight build, 11 Nov): each builder adds lane-<name>.js beside this file, merged in file-name order (engine/lanes.js) ----
import { mergeLanes as __mergeLanes, laneCss as __laneCss } from '../../engine/lanes.js';
import * as __bk_ink from './lane-bk-ink.js';
import * as __bk from './lane-bk.js';
import * as __g1 from './lane-g1.js';
import * as __g2 from './lane-g2.js';
import * as __g3 from './lane-g3.js';
import * as __g4 from './lane-g4.js';
import * as __g5 from './lane-g5.js';
import * as __hg_pages from './lane-hg-pages.js';
import * as __hg_press from './lane-hg-press.js';
import * as __hg from './lane-hg.js';
import * as __hk_comp from './lane-hk-comp.js';
import * as __hk_css from './lane-hk-css.js';
import * as __hk_found from './lane-hk-found.js';
import * as __hk_lib from './lane-hk-lib.js';
import * as __hk_scr from './lane-hk-scr.js';
import * as __hk from './lane-hk.js';
import * as __kt from './lane-kt.js';
import * as __u1 from './lane-u1.js';
import * as __u2 from './lane-u2.js';
import * as __u3 from './lane-u3.js';

const __L = __mergeLanes([__bk_ink, __bk, __g1, __g2, __g3, __g4, __g5, __hg_pages, __hg_press, __hg, __hk_comp, __hk_css, __hk_found, __hk_lib, __hk_scr, __hk, __kt, __u1, __u2, __u3]);
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
