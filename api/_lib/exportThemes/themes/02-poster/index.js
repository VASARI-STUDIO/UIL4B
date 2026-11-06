// Theme 02, Ticket: the thing Encore sells, printed. A 1280 x 720 page. Anybody expanded (the brand's display face) sets the event line,
// Anybody condensed (the chrome face) the serials, stub text and running heads. Full tickets on the cover and the colour pages only;
// elsewhere the perforation is an edge device. The gate pages (cover, palette, colour-values, contrast) are in gate.js and css-gate.js;
// the other pages are the lane files below. Everything reads roles and colourways from the brand; no hex is written here.
import { gate } from './gate.js';
// the full rebuild (2026-11-05): each lane file holds a set of pages and its own css; the gate pages (cover, palette, colour-values, contrast) come first and the lane pages override them
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
const guidelines = { ...gate, ...pFront, ...pLogo, ...pType, ...pImage, ...pApps };
const uikit = { ...uFound, ...uComp, ...uMore, ...uScreens };
import { cssA } from './css-a.js';
import { cssB } from './css-b.js';
import { cssKit } from './css-kit.js';
import { cssBook, bookCss } from './css-book.js';
import { brandBook } from './book.js';
import { cssGate } from './css-gate.js';

export const meta = {
  id: '02-poster', name: 'Ticket', tier: 'Pro', brand: 'encore',
  guidelinesPage: { w: 1280, h: 720 }, uikitPage: { w: 1280, h: 720 }, pageSizes: { 'screen-mobile': [1280, 820] },
  // the chrome face: Anybody pinned at width 50 (condensed) for serials, stub text, running heads and folios. It is the family Anybody,
  // told apart from the brand's expanded Anybody (width 150) by font-stretch, because that is the name Google Fonts serves both under
  // (canvas boards load chrome.q from Google). The css asks for it as Anybody at stretch 50% (css-gate.js); the page embed declares the
  // file without a stretch, which a 50% request still finds first (narrower widths are matched before wider ones). Files are in fonts/.
  chrome: { family: 'Anybody', stretch: 50, q: 'Anybody:wdth,wght@50,700', faces: [{ weight: 700, stem: 'Anybody-50-700' }] },
};

// a solid colour a share of the way from a to b (hairlines on the lamp ground, where an alpha rule would not be measurable)
const mix = (C, a, b, t) => { const x = C.hexToRgb(a), y = C.hexToRgb(b); return C.rgbToHex(x.map((v, i) => v + (y[i] - v) * t)); };

export function css(ctx) {
  const L = ctx.roles.light, D = ctx.roles.dark, B = ctx.brand, d = B.fonts.display, b = B.fonts.body;
  const m = B.layout.margin, r = B.ui.radius;
  const lamp = D.action, lampInk = D.actionLabel;
  return `.pg{--night:${D.surface};--stage:${D.raised};--smoke:${L.surface};--lamp:${lamp};--lamp-ink:${lampInk};--m:${m}px;--r:${r.control}px;--rc:${r.card}px;
  --ground:${D.surface};--ink:${D.text};--soft:${D.textSoft};--quiet:${D.quiet};--hair:${D.divider};--panel:${D.raised};--lit:${lamp};
  --chrome:'${meta.chrome.family}',sans-serif;--display:'${d.family}',serif;--body:'${b.family}',sans-serif;
  background:var(--ground);color:var(--ink);font-family:var(--body);font-size:17px;line-height:1.55;-webkit-font-smoothing:antialiased}
.pg--paper{--ground:${L.surface};--ink:${L.text};--soft:${L.textSoft};--quiet:${L.quiet};--hair:${L.divider};--panel:${L.sunken};--lit:${L.text}}
.pg--lamp{--ground:${lamp};--ink:${lampInk};--soft:${L.textSoft};--quiet:${L.quiet};--hair:${mix(ctx.C, lampInk, lamp, 0.35)};--panel:${mix(ctx.C, lampInk, lamp, 0.12)};--lit:${lampInk}}
.pg :where(h1,h2,h3,p,ul,ol,figure){margin:0;padding:0}
.pg :where(ul,ol){list-style:none}
.disp{font-family:var(--display);font-style:normal;font-weight:${d.weights[0]};letter-spacing:-0.015em;line-height:0.92}
.num{font-variant-numeric:tabular-nums}

/* the poster page: running head, then the page */
.pg--std{display:flex;flex-direction:column;justify-content:space-between;padding:44px var(--m) 48px}
.hd{display:flex;justify-content:space-between;font-family:var(--chrome);font-weight:600;font-size:30px;line-height:36px}
.fo{font-size:12px;line-height:16px;color:var(--quiet);font-variant-numeric:tabular-nums}
.rule{border-top:2px solid var(--ink)}
.lead{font-size:17px;line-height:1.55;color:var(--soft);max-width:36em}
.cap{font-size:13px;line-height:1.4;color:var(--quiet)}
.cap b{display:block;font-size:14px;font-weight:600;color:var(--ink);margin-bottom:2px}
.h3{font-family:var(--chrome);font-weight:600;font-size:20px;line-height:24px}

/* cover: Houselight ground, the name as big as the page allows, a fact row under a rule */
.pg--cover{display:flex;flex-direction:column;justify-content:space-between;padding:44px var(--m) 56px}
.pg--cover .stack{display:flex;flex-direction:column;gap:28px}
.pg--cover .name{font-size:290px;line-height:0.84;margin-left:-8px;white-space:nowrap}
.pg--cover .facts{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:0 32px;font-family:var(--chrome);font-weight:600;font-size:26px;line-height:1.2}
.pg--cover .facts span{border-top:2px solid var(--ink);padding-top:12px}
.pg--cover .facts span:last-child{text-align:right}
.pg--cover .slot-corner{position:absolute;right:var(--m);top:140px}

/* contents: the running order. A number for each act, the section as the act, its pages as the set, the page on the right */
.g-ro{flex:1;min-height:0;display:flex;flex-direction:column;justify-content:space-between;padding-top:20px}
.g-ro .say{font-size:80px;white-space:nowrap}
.g-ro .lit{color:var(--lit)}
.toc{display:flex;flex-direction:column;border-top:2px solid var(--ink)}
.toc li{display:grid;grid-template-columns:92px 400px minmax(0,1fr) 56px;align-items:center;height:52px;border-bottom:1px solid var(--hair)}
.toc .n{font-family:var(--chrome);font-weight:600;font-size:44px;line-height:1;color:var(--lit)}
.toc .t{font-family:var(--display);font-size:38px;line-height:1;letter-spacing:-0.015em}
.toc .s{font-size:14px;line-height:1.4;color:var(--soft)}
.toc .p{font-family:var(--chrome);font-weight:600;font-size:30px;line-height:1;text-align:right;font-variant-numeric:tabular-nums}

/* logo versions: a flyposter wall. Posters of unequal sizes pasted edge to edge (no gutters), bleeding off the sides and foot of the page */
.pg--versions .g-wall{flex:1;min-height:0;display:flex;margin:16px calc(-1 * var(--m)) -48px}
.g-col{display:flex;flex-direction:column;min-width:0;min-height:0}
.g-row{display:flex;min-width:0;min-height:0}
.g-po{margin:0;min-width:0;min-height:0;display:flex;flex-direction:column;padding:16px 20px;box-shadow:inset 0 0 0 1px var(--hair);overflow:hidden}
.g-lg{flex:1;min-height:0;display:flex;align-items:center;justify-content:center}
.g-pc{border-top:2px solid currentColor;padding-top:8px;font-size:13px;line-height:1.4}
.g-pc b{display:block;font-family:var(--chrome);font-weight:600;font-size:20px;line-height:1.15;margin-bottom:2px}
.g-po--lead .g-pc b{font-size:28px}
.g-po--head{background:var(--panel);color:var(--ink);display:grid;grid-template-columns:auto minmax(0,1fr);gap:32px;align-items:end}
.g-po--head h1{font-size:54px;white-space:nowrap}
.g-po--head .lead{font-size:15px;line-height:1.5}

/* contrast: a door list. Each pair a huge ratio in the chrome face on its own ground, stacked like ticket prices, the first the headliner */
.g-dl{flex:1;min-height:0;display:grid;grid-template-columns:360px minmax(0,1fr);gap:40px;padding-top:16px}
.g-dl__l{display:flex;flex-direction:column;justify-content:space-between;min-height:0}
.g-nu{padding-top:12px}
.g-doors{display:flex;flex-direction:column;gap:2px;min-height:0}
.g-door{display:grid;grid-template-columns:340px minmax(0,1fr);align-items:center;gap:0 20px;padding:0 20px;min-height:0;overflow:hidden;box-shadow:inset 0 0 0 1px var(--hair)}
.g-door .r{font-family:var(--chrome);font-weight:600;line-height:0.9;white-space:nowrap;font-variant-numeric:tabular-nums}
.g-door p{font-size:13px;line-height:1.3}
.g-door .u{font-weight:600}
.notused{display:grid;gap:10px;margin-top:12px}
.nu{display:flex;gap:12px;align-items:center}
.nu .sw{flex:none;width:36px;height:36px;border-radius:var(--r);display:grid;place-items:center;box-shadow:inset 0 0 0 1px var(--hair)}
.nu .sw i{display:block;width:16px;height:16px;border-radius:1px}

/* business card */
.g-bc{flex:1;min-height:0;display:flex;flex-direction:column;justify-content:space-between;padding-top:12px}
.pg--card .top{display:flex;align-items:flex-end;gap:48px}
.pg--card h1{font-size:168px;white-space:nowrap}
.pg--card .top .lead{max-width:360px;padding-bottom:16px}
.cards{display:flex;justify-content:space-between;align-items:flex-start}
.g-fact{display:flex;align-items:baseline;gap:16px;border-top:2px solid var(--ink);padding:8px 0 10px}
.g-fact b{font-family:var(--chrome);font-weight:600;font-size:22px;line-height:1.1}
.g-fact span{font-size:14px;line-height:1.4;color:var(--soft)}
.card{width:540px;height:330px;border-radius:var(--rc);position:relative;overflow:hidden;flex:none}
.card--front{background:var(--night);color:${D.text}}
.card--back{background:var(--smoke);color:${L.text}}
.card--front .logo{position:absolute;left:44px;top:50%;transform:translateY(-50%)}
.card--front .line{position:absolute;left:44px;bottom:36px;font-size:15px;color:${D.quiet}}
.card--back .mark{position:absolute;right:40px;top:36px}
.card--back .who{position:absolute;left:44px;bottom:40px}
.card--back .nm{font-family:var(--display);font-size:34px;line-height:1.1;letter-spacing:-0.015em}
.card--back .rl{font-size:15px;color:${L.quiet};margin-top:4px}
.card--back .ct{font-size:15px;margin-top:18px;line-height:1.5}
.card--back .site{position:absolute;right:40px;bottom:40px;font-size:15px}
/* the engine draws the slot label inline in the chrome face at weight 400; condensed Anybody is loaded at 700 only, so the label takes the body face */
.pg .logo-slot{font-family:var(--body)!important}
.photo-slot{display:flex;align-items:flex-end;padding:12px;font-size:12px;line-height:1.4;background:var(--panel);color:var(--quiet)}
` + cssA(ctx) + cssB(ctx) + cssKit(ctx) + cssBook(ctx) + cssGate(ctx, meta) + cssPFront(ctx) + cssPLogo(ctx) + cssPType(ctx) + cssPImage(ctx) + cssPApps(ctx) + cssUFound(ctx) + cssUComp(ctx) + cssUMore(ctx) + cssUScreens(ctx);
}

export { readMe, sheets } from './kit.js';
export { guidelines, uikit, brandBook, bookCss };
