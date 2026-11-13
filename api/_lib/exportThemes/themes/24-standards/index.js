// Theme 24, Standards (Pro): a 1123 x 794 landscape measured manual. Every size is given in x; three marks carry every page:
// the x-ruler along the foot, dimension lines with slash ticks, and one thumb tab cut into the right edge. Public Sans chrome at 11 to 20 px;
// brand faces appear only as the work. Roles and colourways come from the brand; no brand name or hex is written in this folder.
import { guidelines } from './guidelines.js';
import { componentsCss } from '../../engine/components.js';
import { colourMap, tokenGroups } from '../../engine/tokens.js';
import { roles } from './helpers.js';

export const meta = {
  id: '24-standards', name: 'Standards', tier: 'Pro', brand: 'two-shores',
  guidelinesPage: { w: 1123, h: 794 }, uikitPage: { w: 1123, h: 794 },
  chrome: { family: 'Public Sans', q: 'Public+Sans:wght@400;600', faces: [{ weight: 400, stem: 'PublicSans-400' }, { weight: 600, stem: 'PublicSans-600' }] },
};

function baseCss(ctx) {
  const B = ctx.brand, d = B.fonts.display, b = B.fonts.body, mono = B.fonts.mono, R = roles(ctx);
  const g = tokenGroups(ctx), decl = (o) => Object.entries(o).map(([k, v]) => `--${k}:${v}`).join(';');
  // the product screen on the digital page uses the UI kit's components, so it carries the kit's light tokens
  const uiScope = `.pg .ui{${decl(colourMap(ctx, 'light'))};${decl(g.space)};${decl(g.radius)};${decl(g.width)};${decl(g.font)};${decl(g.text)};${decl(g.shadow)}}`;
  return `.pg{--ink:${R.ink};--quiet:${R.quiet};--ground:${R.ground};--hair:${R.hair};--field:${R.field};--field-ink:${R.fieldInk};--dark:${R.dark};--dark-ink:${R.darkInk};
  --chrome:'${meta.chrome.family}',sans-serif;--display:'${d.family}',sans-serif;--body:'${b.family}',sans-serif;--mono:'${mono.family}',monospace;
  background:var(--ground);color:var(--ink);font-family:var(--chrome);font-size:13px;line-height:20px;font-weight:400;font-variant-numeric:tabular-nums;-webkit-font-smoothing:antialiased}
.pg :where(h1,h2,h3,p,ul,ol,figure,table){margin:0;padding:0;font-size:inherit;font-weight:inherit}
.pg :where(ul,ol){list-style:none}
.pg .a{position:absolute;box-sizing:border-box}
.pg .nw{white-space:nowrap}
.pg .ov{position:absolute;left:0;top:0}
.pg .ov text{font-family:var(--chrome);font-variant-numeric:normal}
.pg .c-micro{font-size:12px;line-height:16px;font-weight:400}
.pg .c-head{font-size:12px;line-height:16px;font-weight:600}
.pg .c-body{font-size:13px;line-height:20px;font-weight:400;max-width:56ch;text-wrap:pretty}
.pg .lands{text-wrap:balance}
.pg .c-name{font-size:13px;line-height:20px;font-weight:600}
.pg .c-title{font-size:20px;line-height:24px;font-weight:600;letter-spacing:-0.005em}
.pg .tab{border-radius:2px 0 0 2px;font-size:13px;line-height:16px;font-weight:600;text-align:center;padding-top:10px}
.pg .vn{font-size:13px;line-height:16px;font-weight:600;margin-bottom:4px}
.pg .val-blk .val{line-height:16px}
.pg .trow{display:flex;justify-content:space-between;white-space:nowrap;font-variant-numeric:normal}
/* the phone screen on the digital page: fixed heights, all whole x (56, 176, 72, 44, 16) */
.pg .ph{position:relative;width:390px;height:844px;overflow:hidden;box-sizing:border-box}
.pg .ph-top{display:flex;align-items:center;justify-content:space-between;height:56px;padding:0 16px;box-sizing:border-box;border-bottom:1px solid var(--divider)}
.pg .ph-time{font-size:14px;line-height:20px;font-weight:500;font-variant-numeric:tabular-nums;color:var(--quiet)}
.pg .ph-ans{height:176px;padding:16px;box-sizing:border-box;border-bottom:1px solid var(--divider);display:flex;flex-direction:column;align-items:flex-start;gap:8px}
.pg .ph-line{display:flex;align-items:center;gap:12px;height:24px}
.pg .ph-ft{font-size:14px;line-height:20px;color:var(--quiet)}
.pg .ph-eta{margin:0;font-size:44px;line-height:44px}
.pg .ph-note{margin:0;font-size:14px;line-height:20px;color:var(--quiet);max-width:300px}
.pg .ph .ui-list{margin:0;padding:0}
.pg .ph .ui-row{box-sizing:border-box;height:72px;min-height:72px;padding:0 16px}
.pg .ph-btn{position:absolute;left:16px;right:16px;bottom:16px}
.pg .val{font-family:var(--mono);font-size:12px;font-weight:400}
.pg .disp{font-family:var(--display)}
.pg .logo-box svg{display:block}
.pg .slot-box{box-sizing:border-box;border:1.5px dashed currentColor;padding:8px}
.pg .ph-b>.ph-l{font-weight:600}
.pg table{border-collapse:collapse;width:100%}
.pg td,.pg th{text-align:left;font-weight:400;vertical-align:middle;padding:0}
.pg tr{height:32px;border-top:1px solid var(--hair)}
${uiScope}
${componentsCss(ctx)}`;
}

export { guidelines };
export const uikit = {};

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
