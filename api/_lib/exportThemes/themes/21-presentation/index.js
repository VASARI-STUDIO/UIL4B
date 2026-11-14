import { screenContent } from './once.js';
// Theme 01, Presentation: a 1280 x 720 slide deck. Instrument Sans chrome at 11 to 13 px, the brand's display face used once a slide,
// mostly empty pages, one idea each. Everything below reads roles and colourways from the brand; no brand name or hex is written here.
import { guidelines } from './guidelines.js';
import { uikit } from './uikit.js';
import { cssA } from './css-a.js';
import { cssB } from './css-b.js';
import { cssKit } from './css-kit.js';
import { cssBook, bookCss as baseBookCss } from './css-book.js';
import { brandBook as baseBrandBook } from './book.js';
import { cssR1 } from './css-r1.js';

export const meta = {
  screenContent,  // Long Room says "free" once: the engine's example page and delivery rows read the product screen through this
  id: '21-presentation', name: 'Presentation', tier: 'Pro', brand: 'kerbside',
  guidelinesPage: { w: 1280, h: 720 }, uikitPage: { w: 1280, h: 720 },
  // the chrome face: running heads, folios, captions. Files are in fonts/; google css2 query for canvas boards.
  chrome: { family: 'Instrument Sans', q: 'Instrument+Sans:wght@400;500;600', faces: [{ weight: 400, stem: 'InstrumentSans-400' }, { weight: 500, stem: 'InstrumentSans-500' }, { weight: 600, stem: 'InstrumentSans-600' }] },
};

function baseCss(ctx) {
  const L = ctx.roles.light, B = ctx.brand, d = B.fonts.display, b = B.fonts.body, rev = B.logo.colourways.reversed;
  const m = B.layout.margin;
  return `.pg{--ink:${L.text};--soft:${L.textSoft};--quiet:${L.quiet};--quiet-panel:${L.quietOnSunken};--ground:${L.surface};--panel:${L.sunken};--hair:${L.divider};--accent:${L.action};--accent-ink:${L.actionLabel};--dark:${rev.ground};--dark-ink:${rev.name};--m:${m}px;
  --chrome:'${meta.chrome.family}',sans-serif;--display:'${d.family}',sans-serif;--body:'${b.family}',sans-serif;
  background:var(--ground);color:var(--ink);font-family:var(--chrome);font-size:12px;line-height:1.4;-webkit-font-smoothing:antialiased}
.pg :where(h1,h2,h3,p,ul,ol,figure){margin:0;padding:0}
.pg :where(ul,ol){list-style:none}
.disp{font-family:var(--display);font-stretch:${d.stretch || 100}%;font-weight:${d.weights[d.weights.length - 1]};letter-spacing:-0.01em}
.num{font-variant-numeric:tabular-nums}

/* a standard slide: running head, one idea, folio */
.pg--std{display:flex;flex-direction:column;justify-content:space-between;padding:40px var(--m)}
.hd{display:flex;justify-content:space-between;font-size:12px;color:var(--quiet)}
.hd b{font-weight:400;margin-right:12px}
.fo{font-size:12px;color:var(--quiet);font-variant-numeric:tabular-nums}
.cols{display:grid;grid-template-columns:250px minmax(0,1fr);gap:64px}
.lead{font-family:var(--body);font-size:13px;line-height:1.65;color:var(--soft)}
.cap{font-size:11px;line-height:1.5;color:var(--quiet)}
.cap b{display:block;font-size:12px;font-weight:600;color:var(--ink)}
.on-panel .cap{color:var(--quiet-panel)}

/* cover */
.pg--cover{background:var(--dark);color:var(--dark-ink)}
.pg--cover .bleed{position:absolute;inset:0;width:100%;height:100%}
.pg--cover .tint{position:absolute;inset:0}
.pg--cover .top{position:absolute;left:var(--m);right:var(--m);top:40px;display:flex;justify-content:space-between;font-size:12px;letter-spacing:0.01em}
.pg--cover .title{position:absolute;left:var(--m);bottom:52px;display:flex;flex-direction:column;gap:18px}
.pg--cover .title .disp{font-size:118px;line-height:0.86}
.pg--cover .tag{position:absolute;right:var(--m);bottom:52px;font-size:12px}
.pg--cover .slot-corner{position:absolute;right:var(--m);bottom:52px}
.pg--cover .slot-corner .logo-slot{border-color:var(--dark-ink)}

/* run G pages (contents, logo versions, contrast, business card): full-bleed slides, head and folio laid over the first panel */
.pg--g{padding:0}
.pg--g .hd,.pg--g .fo{position:absolute;z-index:2;color:inherit}
.pg--g .hd{top:36px;left:var(--m);right:var(--m)}
.pg--g .fo{left:var(--m);bottom:32px}
.pg--g :where(.lead,.cap,.h3),.pg--g .cap b{color:inherit}
.pg--g .hairline{box-shadow:inset 0 0 0 1px var(--hair)}
.h3{font-size:12px;font-weight:600;color:var(--ink);margin-bottom:12px}

/* contents: the slide sorter, a contact grid of section thumbnails with their pages listed under each */
.g-h1{position:absolute;left:var(--m);top:64px;font-size:44px;line-height:1}
.g-sorter{position:absolute;left:var(--m);right:var(--m);top:128px;display:flex;flex-wrap:wrap;gap:24px 20px;align-items:flex-start}
.g-sc{min-width:0;flex:1 1 calc((100% - 80px) / 5)}
.g-th{position:relative;height:calc((1280px - 2 * var(--m) - 80px) * 9 / 80);margin-bottom:12px}
.g-thn,.g-thp{position:absolute;top:10px;font-size:12px;line-height:1}
.g-thn{left:12px}
.g-thp{right:12px}
.g-tht{position:absolute;left:12px;right:12px;bottom:12px;font-size:19px;line-height:1.05}
.g-pl li{display:flex;justify-content:space-between;gap:8px;padding:3px 0;border-top:1px solid var(--hair);font-size:12px;line-height:1.3}
.g-pl li .num{color:var(--quiet)}

/* logo versions: a mosaic of slides, each version alone on its ground */
.g-mosaic{position:absolute;inset:0;display:grid;grid-template-columns:repeat(4,minmax(0,1fr));grid-template-rows:repeat(3,minmax(0,1fr))}
.g-vc{position:relative;display:flex;flex-direction:column;min-height:0;min-width:0;margin:0}
.g-va{flex:1;min-height:0;display:flex;align-items:center;justify-content:center;padding:56px 24px 0}
.g-vc .cap{padding:0 24px 20px}
.g-vc--first .cap{padding-left:var(--m)}
.g-vlead{padding:104px 24px 0 var(--m);max-width:none}

/* contrast: one results slide, each pair as a big ratio in its own colours */
.g-clead{position:absolute;left:var(--m);top:72px;width:880px}
.g-results{position:absolute;left:0;right:0;top:132px;bottom:128px;display:grid}
.g-pr{display:flex;flex-direction:column;justify-content:space-between;gap:8px;min-height:0;min-width:0;padding:18px 24px 20px;font-family:var(--body)}
.g-pr--first{padding-left:var(--m)}
.g-rn{font-size:60px;line-height:1;white-space:nowrap}
.g-rn i{font-style:normal;font-size:24px}
.g-ru{font-size:12px;line-height:1.4}
.g-ru b{display:block;font-size:13px;font-weight:600}
.g-pr--l{grid-row:1/-1;padding-right:var(--m);padding-left:32px}
.g-pr--l .g-rn{font-size:92px}
.g-pr--l .g-rn i{font-size:28px}
.g-pr--l .g-ru,.g-pr--l .g-ru b{font-size:24px;line-height:1.2;font-weight:500}
.g-notused{position:absolute;left:0;right:0;bottom:0;height:128px;padding:20px var(--m) 0;display:grid;grid-template-columns:140px minmax(0,1fr);align-items:start}
.g-notused ul{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:10px 16px}
.g-nu{display:flex;gap:12px;align-items:center;min-width:0}
.g-nsw{flex:none;width:36px;height:36px;border-radius:2px;display:grid;place-items:center}
.g-nsw i{display:block;width:16px;height:16px;border-radius:1px}

/* business card: a head strip, the photograph, and a foot strip of small type */
.pg--bc .hd{position:absolute;top:0;left:var(--m);right:var(--m);height:56px;align-items:center}
.bc-photo{position:absolute;left:0;right:0;top:56px;height:568px;margin:0}
.bc-photo img,.bc-photo svg.pl{display:block;width:100%;height:100%;object-fit:cover}
.bc-cap{position:absolute;top:648px;width:300px}
.bc-note{position:absolute;top:648px;right:var(--m);text-align:right}
.pg--bc .fo{position:absolute;left:var(--m);bottom:32px}
.g-card{width:540px;height:330px;border-radius:3px;position:relative;overflow:hidden;flex:none}
.g-card--front{background:var(--dark);color:var(--dark-ink)}
.g-card--back{background:var(--ground);color:var(--ink)}
.g-card--front .logo{position:absolute;left:44px;top:50%;transform:translateY(-50%)}
.g-card--front .line{position:absolute;left:44px;bottom:36px;font-size:12px}
.g-card--back .mark{position:absolute;right:40px;top:36px}
.g-card--back .who{position:absolute;left:44px;bottom:40px;font-family:var(--body)}
.g-card--back .who .nm{font-size:22px;font-weight:600;line-height:1.2}
.g-card--back .who .rl{font-size:15px;color:var(--soft);margin-top:2px}
.g-card--back .who .ct{font-size:15px;color:var(--ink);margin-top:20px;line-height:1.5}
.photo-slot{display:flex;align-items:flex-end;padding:12px;font-size:11px;line-height:1.4;background:var(--panel);color:var(--quiet-panel)}
` + cssA(ctx) + cssB(ctx) + cssKit(ctx) + cssBook(ctx) + cssR1(ctx);
}

import { readMe as baseReadMe, sheets as baseSheets } from './kit.js';
export { guidelines, uikit };

// ---- lane modules (overnight build, 11 Nov): each builder adds lane-<name>.js beside this file, merged in file-name order (engine/lanes.js) ----
import { tightenPages } from './ph.js';
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
tightenPages(guidelines); // slot: compact placeholders on the pages laid out from measured lines (ph.js)
if (__L.fonts.length) meta.fonts = [...(meta.fonts || []), ...__L.fonts];
export const css = __laneCss(baseCss, __L);
export const brandBook = __L.brandBook || baseBrandBook;
export const bookCss = __L.bookCss || baseBookCss;
export const readMe = __L.readMe || baseReadMe;
export const sheets = __L.sheets || baseSheets;
export const guideSite = __L.guideSite || undefined;
export const kitSite = __L.kitSite || undefined;
