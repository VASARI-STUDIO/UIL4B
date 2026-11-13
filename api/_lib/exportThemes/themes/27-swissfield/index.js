// Theme 27, Swiss Field (round 1, Free): a 1920 x 1080 book that stands on the brand's share ruler. A strip along the foot of every page is cut into the
// palette by share, and a colour field may rise from its segment to full height. Host Grotesk chrome and DM Mono for literal values (both SIL Open Font
// Licence 1.1, from Google Fonts). The device is in swiss.js and reads everything from the brand; no colour id, hex or photo is named in this theme.
// R1_BRAND picks the brand for a build, so a second brand can be checked without a second theme folder.
import { guidelines } from './guidelines.js';
import { model, FREE_PAGES } from './swiss.js';

export const meta = {
  id: '27-swissfield', name: 'Swiss Field', tier: 'Free', brand: 'northern-current',
  guidelinesPage: { w: 1920, h: 1080 }, uikitPage: { w: 1920, h: 1080 },
  chrome: { family: 'Host Grotesk', q: 'Host+Grotesk:wght@400;500', faces: [{ weight: 400, stem: 'HostGrotesk-400' }, { weight: 500, stem: 'HostGrotesk-500' }] },
  fonts: [{ family: 'DM Mono', weight: 400, stem: 'DMMono-400', q: 'DM+Mono:wght@400' }],
};

function baseCss(ctx) {
  const L = ctx.roles.light, B = ctx.brand, d = B.fonts.display, b = B.fonts.body, mo = B.fonts.mono, m = model(ctx);
  return `.pg{--ink:${L.text};--quiet:${L.quiet};--hair:${L.divider};--tone2:${m.tone2};--ground:${L.surface};--action:${L.action};--action-label:${L.actionLabel};
  --chrome:'Host Grotesk',sans-serif;--cmono:'DM Mono',monospace;--display:'${d.family}',sans-serif;--body:'${b.family}',sans-serif;--bmono:'${(mo || b).family}',monospace;
  background:var(--ground);color:var(--ink);font-family:var(--chrome);font-size:17px;line-height:24px;-webkit-font-smoothing:antialiased}
.pg :where(h1,h2,h3,p,ul,ol,figure){margin:0;padding:0}
.pg .a{position:absolute}
.pg .c-head{font:500 17px/24px var(--chrome);white-space:nowrap}
.pg .c-note{font:400 17px/24px var(--chrome);text-wrap:pretty}
.pg .c-body{font:400 20px/30px var(--chrome);text-wrap:pretty}
.pg .c-title{font:500 48px/52px var(--chrome);letter-spacing:-0.02em;text-wrap:balance}
.pg .c-value{font:400 16px/20px var(--cmono);font-variant-numeric:tabular-nums;white-space:nowrap}
.pg .rl{line-height:22px}
.pg .fo{font-variant-numeric:tabular-nums}
.pg .rh-cover span+span{margin-left:16px}
.pg .disp{font-family:var(--display);font-stretch:${d.stretch || 100}%;font-weight:${ctx.weights.heading};letter-spacing:-0.01em;text-wrap:balance}
.pg .bf{font-family:var(--body);font-weight:${ctx.weights.regular};text-wrap:pretty}
.pg .bal{text-wrap:balance}
.pg svg{display:block}
.pg .hl{position:absolute;height:1px;background:var(--hair)}
.pg .nw{white-space:nowrap}
`;
}

export const uikit = {};
export { guidelines };

// ---- lane modules: the pages and css written in lane-<name>.js beside this file, merged in file-name order (engine/lanes.js) ----
import { mergeLanes as __mergeLanes, laneCss as __laneCss } from '../../engine/lanes.js';
import * as __g1 from './lane-g1.js';
import * as __g2 from './lane-g2.js';
import * as __g3 from './lane-g3.js';
import * as __g5 from './lane-g5.js';
const __L = __mergeLanes([__g1, __g2, __g3, __g5]);
Object.assign(guidelines, __L.guidelines);
Object.assign(uikit, __L.uikit);
// A Free theme ships the Free twelve only (SPEC section 6). The pages outside it (intro, contents, voice, messaging, contact-scope, logo-versions) stay drafted in
// their files but are not exported, so the build skips them. The engine's page list sets the order: cover, personality, write-this, logo, clear-space, palette,
// contrast, typefaces, hierarchy, business-card, social, summary.
for (const id of Object.keys(guidelines)) if (!FREE_PAGES.includes(id)) delete guidelines[id];
if (__L.fonts.length) meta.fonts = [...(meta.fonts || []), ...__L.fonts];
export const css = __laneCss(baseCss, __L);
export const brandBook = __L.brandBook || undefined;
export const bookCss = __L.bookCss || undefined;
export const readMe = __L.readMe || undefined;
export const sheets = __L.sheets || undefined;
export const guideSite = __L.guideSite || undefined;
export const kitSite = __L.kitSite || undefined;
