// Theme 05, Catalogue: the library card catalogue, 794 x 1123. Drawer fronts and guide cards drawn in Rod line, printed cards at 5 : 3
// with the call number top left, the rod hole bottom centre and the tracings at the foot. Cards appear only in the colour drawer.
// The gate pages (cover, palette, colour-values, contrast) are in guidelines-k.js and css-k.js; every other page comes from the p-*.js (guidelines) and u-*.js (UI kit) files below.
// Everything reads roles and colourways from the brand; no brand name or hex is written here.
import { guidelinesK } from './guidelines-k.js';
// each p-*.js and u-*.js file holds a set of pages and its own css; the gate pages are spread first and the later page sets override them
import { pFront } from './p-front.js';
import { cssPFront } from './css-p-front.js';
import { pLogo } from './p-logo.js';
import { cssPLogo } from './css-p-logo.js';
import { pType } from './p-type.js';
import { cssPType } from './css-p-type.js';
import { pImage } from './p-image.js';
import { cssPImage } from './css-p-image.js';
import { pApps } from './p-apps.js';
import { cssPApps } from './css-p-apps.js';
import { uFound } from './u-found.js';
import { cssUFound } from './css-u-found.js';
import { uComp } from './u-comp.js';
import { cssUComp } from './css-u-comp.js';
import { uMore } from './u-more.js';
import { cssUMore } from './css-u-more.js';
import { uScreens } from './u-screens.js';
import { cssUScreens } from './css-u-screens.js';
const guidelines = { ...guidelinesK, ...pFront, ...pLogo, ...pType, ...pImage, ...pApps };
const uikit = { ...uFound, ...uComp, ...uMore, ...uScreens };
import { cssA } from './css-a.js';
import { cssB } from './css-b.js';
import { cssKit } from './css-kit.js';
import { cssBook, bookCss } from './css-book.js';
import { brandBook } from './book.js';
import { cssK } from './css-k.js';
import { cssStr, cssNum } from '../../engine/escape.js';

export const meta = {
  id: '05-specimen', name: 'Catalogue', tier: 'Pro', brand: 'margin',
  guidelinesPage: { w: 794, h: 1123 }, uikitPage: { w: 794, h: 1123 },
  // the chrome face: running heads, folios, captions. Files are in fonts/; google css2 query for canvas boards.
  chrome: { family: 'Albert Sans', q: 'Albert+Sans:wght@400;500;600', faces: [{ weight: 400, stem: 'AlbertSans-400' }, { weight: 500, stem: 'AlbertSans-500' }, { weight: 600, stem: 'AlbertSans-600' }] },
};

// the ink at 22% over the ground, as a solid colour: the specimen sheet's strong hairline (a border, never text)
const mix = (ctx, a, b, t) => ctx.C.hexToRgb(a).map((v, i) => Math.round(v * t + ctx.C.hexToRgb(b)[i] * (1 - t)));
const toHex = (rgb) => '#' + rgb.map((v) => v.toString(16).padStart(2, '0')).join('').toUpperCase();

export function css(ctx) {
  const L = ctx.roles.light, B = ctx.brand, d = B.fonts.display, b = B.fonts.body, rev = B.logo.colourways.reversed;
  const m = B.layout.margin;
  const rule = toHex(mix(ctx, L.text, L.surface, 0.22));
  return `.pg{--ink:${L.text};--soft:${L.textSoft};--quiet:${L.quiet};--quiet-panel:${L.quietOnSunken};--ground:${L.surface};--panel:${L.sunken};--hair:${L.divider};--rule:${rule};--accent:${L.action};--accent-ink:${L.actionLabel};--dark:${rev.ground};--dark-ink:${rev.name};--m:${m}px;
  --chrome:'${cssStr(meta.chrome.family)}',sans-serif;--display:'${cssStr(d.family)}',serif;--body:'${cssStr(b.family)}',serif;
  background:var(--ground);color:var(--ink);font-family:var(--chrome);font-size:12px;line-height:1.4;-webkit-font-smoothing:antialiased}
.pg :where(h1,h2,h3,p,ul,ol,figure){margin:0;padding:0}
.pg :where(ul,ol){list-style:none}
.disp{font-family:var(--display);font-weight:${cssNum(d.weights[d.weights.length - 1])};letter-spacing:0}
.num{font-variant-numeric:tabular-nums}

/* a specimen sheet: running head, one subject, hairline rows */
.pg--std{display:flex;flex-direction:column;padding:40px var(--m) 48px}
.hd{display:flex;justify-content:space-between;align-items:baseline;font-size:12px;color:var(--quiet);margin-bottom:44px;flex:none}
.hd-t{font-weight:600;color:var(--ink)}
.hd-t b{font-weight:600;margin-right:12px;color:var(--quiet)}
.fo{font-style:normal;margin-left:20px;color:var(--ink)}
.note{font-size:12px;line-height:1.6;color:var(--quiet);max-width:440px}
.rw{display:grid;grid-template-columns:112px minmax(0,1fr);gap:0 16px;padding:12px 0;border-top:1px solid var(--hair)}
.rw>.lb{font-size:11px;line-height:1.5;color:var(--quiet)}
.rw>.lb b{display:block;font-size:12px;font-weight:600;color:var(--ink)}
.rw--use{border-top:3px solid var(--accent)}
.cap{font-size:11px;line-height:1.5;color:var(--quiet)}
.cap b{display:block;font-size:12px;font-weight:600;color:var(--ink)}
.on-panel .cap{color:var(--quiet-panel)}
.photo-slot{display:flex;align-items:flex-end;padding:12px;font-size:11px;line-height:1.4;background:var(--panel);color:var(--quiet-panel)}

/* cover: the display glyph at size, then labelled rows */
.pg--cover .g-glyph{align-items:start;padding:28px 0 0;flex:none}
.pg--cover .g-m{display:block;font-family:var(--display);font-weight:400;font-size:520px;line-height:.74;margin-left:-6px;white-space:nowrap}
.pg--cover .g-low{margin-top:auto}
.pg--cover .g-low .rw{padding:14px 0 16px}
.g-title{font-family:var(--display);font-weight:400;font-size:40px;line-height:1.1;color:var(--accent);padding-bottom:.18em;margin-bottom:-.18em}
.g-line{font-family:var(--body);font-size:17px;line-height:26px}
.g-ver{font-family:var(--chrome);font-size:12px;line-height:18px;color:var(--quiet)}
.g-logo{display:block}
.g-logo .logo-slot{border-color:var(--quiet)}

/* contents: a waterfall, each section a step smaller than the one above */
.g-ct{font-family:var(--display);font-weight:400;font-size:88px;line-height:1;padding-bottom:.18em;margin-bottom:4px}
.g-toc .rw{grid-template-columns:176px minmax(0,1fr);align-items:baseline;padding:6px 0 10px}
.g-st{display:block;font-family:var(--display);font-weight:400;line-height:1.05;white-space:nowrap;padding-bottom:.18em;margin-bottom:-.18em}

/* logo versions: each set from full size down to its minimum, on its own ground */
.g-vrows{display:flex;flex-direction:column}
.g-vrows .rw{align-items:stretch;padding:6px 0}
.g-vrun{display:flex;align-items:flex-end;gap:20px;padding:8px 20px 6px;min-width:0}
.g-vs{display:flex;flex-direction:column;align-items:flex-start;gap:6px;flex:none}
.g-vs>:first-child{display:block}
.g-vs i{font-style:normal;font-size:11px;line-height:14px}
.g-vs--min i{font-weight:600;box-shadow:inset 0 -2px 0 currentColor;padding-bottom:3px}

/* contrast: the pair set at the brand's own sizes, largest first, down to the smallest it passes at */
.g-cfall .rw{grid-template-columns:152px minmax(0,1fr);align-items:stretch;padding:4px 0}
.g-cfall .rw>.lb{padding-top:2px}
.g-crun{display:flex;align-items:baseline;gap:18px;padding:6px 16px 4px;min-width:0}
.g-cs{display:flex;flex-direction:column;align-items:flex-start;flex:none}
.g-cw{display:block;font-family:var(--body);font-weight:500;line-height:1;white-space:nowrap}
.g-cw--d{font-family:var(--display);font-weight:400}
.g-cs i{font-style:normal;font-size:11px;line-height:14px;margin-top:6px}
.g-cs--min i{font-weight:600;box-shadow:inset 0 -2px 0 currentColor;padding-bottom:3px}
.notused{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:0 20px}
.nu{display:flex;gap:12px;align-items:center;padding:6px 0;border-top:1px solid var(--hair)}
.nu .sw{flex:none;width:36px;height:36px;display:grid;place-items:center;box-shadow:inset 0 0 0 1px var(--rule)}
.nu .sw i{display:block;width:16px;height:16px}
.h3{font-size:12px;font-weight:600;color:var(--ink);margin-bottom:12px}

/* business card */
.cards{display:flex;flex-direction:column;gap:0}
.cards .rw{align-items:start;padding:16px 0 16px}
.g-cstyles .rw{padding:10px 0 12px}
.g-sn{font-family:var(--display);font-weight:400;line-height:1.1}
.g-sb{font-family:var(--body);line-height:1.4}
.card{width:540px;height:330px;position:relative;overflow:hidden;flex:none}
.card--front{background:var(--dark);color:var(--dark-ink)}
.card--back{background:var(--ground);color:var(--ink);box-shadow:inset 0 0 0 1px var(--rule)}
.card--front .logo{position:absolute;left:44px;top:50%;transform:translateY(-50%)}
.card--front .line{position:absolute;left:44px;bottom:34px;font-family:var(--body);font-size:15px}
.card--back .mark{position:absolute;right:40px;top:36px}
.card--back .who{position:absolute;left:44px;bottom:40px;font-family:var(--body)}
.card--back .who .nm{font-family:var(--display);font-size:28px;line-height:1.1}
.card--back .who .rl{font-size:15px;line-height:20px;color:var(--quiet);margin-top:4px}
.card--back .who .ct{font-size:15px;line-height:22px;margin-top:20px}
` + cssA(ctx) + cssB(ctx) + cssKit(ctx) + cssBook(ctx) + cssK(ctx) + cssPFront(ctx) + cssPLogo(ctx) + cssPType(ctx) + cssPImage(ctx) + cssPApps(ctx) + cssUFound(ctx) + cssUComp(ctx) + cssUMore(ctx) + cssUScreens(ctx);
}

export { readMe, sheets } from './kit.js';
export { guidelines, uikit, brandBook, bookCss };
