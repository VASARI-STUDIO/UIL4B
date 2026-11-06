// Theme 08, Riso: A4 portrait. The art space's own riso press: the brand's colours are its drums, Wall is the paper, and figures are
// shown as separations (each drum alone, then the composite) with a registration cross at the sheet corners. Familjen Grotesk is the
// chrome. Everything reads roles, colours and colourways from the brand; no hex is written here. The gate pages (cover, palette,
// colour-values, contrast) are in guidelines-r.js, styled in css-r.js; every other page is in a p-*.js or u-*.js file below, each with its own css.
import { guidelinesR } from './guidelines-r.js';
// each p-*.js and u-*.js file holds a set of pages and its own css; the gate pages sit underneath them
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
const guidelines = { ...guidelinesR, ...pFront, ...pLogo, ...pType, ...pImage, ...pApps };
const uikit = { ...uFound, ...uComp, ...uMore, ...uScreens };
import { cssR } from './css-r.js';
import { cssB } from './css-b.js';
import { cssKit } from './css-kit.js';
import { cssBook, bookCss } from './css-book.js';
import { brandBook } from './book.js';
import { readMe, sheets } from './kit.js';
import { cssStr, cssNum } from '../../engine/escape.js';

export const meta = {
  id: '08-monograph', name: 'Riso', tier: 'Pro', brand: 'long-room',
  guidelinesPage: { w: 794, h: 1123 }, uikitPage: { w: 794, h: 1123 },
  chrome: { family: 'Familjen Grotesk', q: 'Familjen+Grotesk:wght@400;500;600;700', faces: [{ weight: 400, stem: 'FamiljenGrotesk-400' }, { weight: 500, stem: 'FamiljenGrotesk-500' }, { weight: 600, stem: 'FamiljenGrotesk-600' }, { weight: 700, stem: 'FamiljenGrotesk-700' }] },
  // the italic: stored under its own family name for the engine (it declares every face upright); css() declares it as a real italic
  fonts: [
    { family: 'Bodoni Moda Italic', weight: 500, stem: 'BodoniModa-i500', q: 'Bodoni+Moda:ital,wght@1,500' },
  ],
};

export function css(ctx) {
  const L = ctx.roles.light, B = ctx.brand, d = B.fonts.display, b = B.fonts.body, cw = B.logo.colourways;
  const fb = ctx.mode && ctx.mode.fontBase;
  const italics = fb ? `@font-face{font-family:"${cssStr(d.family)}";font-style:italic;font-weight:500;font-display:swap;src:url(${fb}BodoniModa-i500.woff2) format("woff2")}\n` : '';
  return italics + `.pg{--ink:${L.text};--soft:${L.textSoft};--quiet:${L.quiet};--panel:${L.sunken};--ground:${L.surface};--hair:${L.divider};--accent:${L.action};--accent-ink:${L.actionLabel};--dark:${cw.reversed.ground};--dark-ink:${cw.reversed.name};--plate:${cw.colour.plate};--m:${B.layout.margin}px;
  --chrome:'${cssStr(meta.chrome.family)}',sans-serif;--display:'${cssStr(d.family)}',serif;--body:'${cssStr(b.family)}',sans-serif;--mono:'${cssStr(B.fonts.mono.family)}',monospace;
  background:var(--ground);color:var(--ink);font-family:var(--chrome);font-size:14px;line-height:1.5;-webkit-font-smoothing:antialiased}
.pg :where(h1,h2,h3,p,ul,ol,dl,dd,figure){margin:0;padding:0}
.pg :where(ul,ol){list-style:none}
.pg :where(h1,h2,h3){font-weight:${cssNum(d.weights[0])}}
.pg em{font-style:italic}
.pg .it{font-style:italic}
.disp{font-family:var(--display);font-weight:${cssNum(d.weights[0])};letter-spacing:-0.005em}
.num{font-variant-numeric:tabular-nums}
.q{color:var(--quiet)}
.pg--std{display:block}
.hd{position:absolute;left:var(--m);right:var(--m);top:48px;display:flex;justify-content:space-between;color:var(--quiet)}
.facts{position:absolute;left:var(--m);top:160px;width:150px;font-size:11px;line-height:1.6}
.facts dt{color:var(--quiet);margin-top:14px}.facts dt:first-child{margin-top:0}
.facts dd{font-family:var(--body);font-size:13px;line-height:1.5;color:var(--ink)}
.facts dd.ttl2{font-weight:500;font-family:var(--display);font-style:italic;font-size:22px;line-height:1.2}
.plates{position:absolute;left:262px;top:160px;width:460px}
.cp{font-size:11px;line-height:1.6;color:var(--quiet)}.cp em{color:var(--ink)}
.ttl{position:absolute;left:113px;top:160px;font-size:44px;line-height:1.12}

/* cover */
.pg--cover .lg{position:absolute;left:113px;top:300px}
.pg--cover .line{position:absolute;left:113px;top:560px;width:560px;font-size:22px;line-height:1.3}
.pg--cover .imprint{position:absolute;left:113px;bottom:96px;line-height:1.7}

/* contents */
.toc{position:absolute;left:262px;top:300px;width:460px}
.toc li{display:grid;grid-template-columns:28px minmax(0,1fr) 28px;gap:0 8px;align-items:baseline;padding:18px 0;border-top:1px solid var(--hair)}
.toc li:last-child{border-bottom:1px solid var(--hair)}
.toc .t{font-size:22px;line-height:1.3;color:var(--ink)}.toc .n,.toc .s{color:var(--quiet)}
.toc .s{grid-column:2;margin-top:2px}.toc .p{grid-column:3;grid-row:1;text-align:right}

/* a figure and a hairline ring */
.vc{margin:0}.vc .tile{display:flex;align-items:center;justify-content:center}.vc .cp{margin-top:8px}.vc .vn{display:block;color:var(--ink)}
.hair{box-shadow:inset 0 0 0 1px var(--hair)}

/* business card */
.card{width:432px;height:264px;position:relative;overflow:hidden}
.card--front{background:var(--dark);color:var(--dark-ink);display:flex;align-items:center;justify-content:center}
.card--back{background:var(--ground);color:var(--ink);box-shadow:inset 0 0 0 1px var(--hair);font-family:var(--body)}
.card--back .mk{position:absolute;right:32px;top:32px}
.card--back .nm{font-weight:500;position:absolute;left:36px;bottom:92px;font-family:var(--display);font-size:22px;line-height:1.2}
.card--back .rl{position:absolute;left:36px;bottom:72px;font-size:12px;color:var(--soft)}
.card--back .ct{position:absolute;left:36px;bottom:30px;font-size:12px;line-height:1.5}
.photo-slot{display:flex;align-items:flex-end;padding:12px;font-size:11px;line-height:1.5;background:var(--panel);color:var(--quiet);font-style:italic}
` + cssB(ctx) + cssKit(ctx) + cssBook(ctx) + cssR(ctx) + cssPFront(ctx) + cssPLogo(ctx) + cssPType(ctx) + cssPImage(ctx) + cssPApps(ctx) + cssUFound(ctx) + cssUComp(ctx) + cssUMore(ctx) + cssUScreens(ctx);
}

export { readMe, sheets, guidelines, uikit, brandBook, bookCss };
