// Theme 33, Flyleaf: a book-like edition. Every page is placed on a grid in px (16:9 on 12 columns, A4 portrait on 6), set in the brand's own faces with DM Mono for
// every label, running head, caption and value. Sections open on a leaf of solid brand colour. No photographs and no mockups: flat colour, hairlines and type.
// The brand guidelines live in brand-a.js (sections 1 to 3) and the files that follow; the UI style guide (the `guide` row) is still the as-built layout (ui-pages.js).
import { guidelines as brandA } from './brand-a.js';
import { guidelines as brandB } from './brand-b.js';
import { guidelines as brandC } from './brand-c.js';
import { guidelines as brandD } from './brand-d.js';
import { guidelines as slice2 } from './brand-s2.js';
import { guidelines as slice3 } from './brand-s3.js';
import { guidelines as slice4 } from './brand-s4.js';
import { guidelines as slice4b } from './brand-s4b.js';
import { guidelines as slice5 } from './brand-s5.js';
import { a4 } from './brand-a4.js';
import { guide as uiGuide } from './lane-guide.js';
import { uiOrder } from './helpers.js';
import { brandOrder, geo } from './kit.js';
import { photoCss } from './photos.js';
import { realCopy } from './real-copy.js';

export const meta = {
  id: '33-flyleaf', name: 'Flyleaf', tier: 'Free',
  brand: 'margin',
  pages: ['16x9', 'a4-portrait'],  // the sizes a request may ask for (EXPORT_PAGES); the table entry in src/data/exportThemes.js lists the same
  realCopy,  // the project's own name and colours print as words in the slot edition, not as placeholder boxes (see real-copy.js)
  mockups: false, // photo scenes on the mockup pages: false in a real export; the harness turns it on for the showcase (kit.js mockupsOn)
  guidelinesPage: { w: 1280, h: 720 }, uikitPage: { w: 1280, h: 720 }, guidePage: { w: 794, h: 1123 },
  // the theme's mono is DM Mono (OFL, files in ./fonts); meta.fonts embeds both weights beside the chrome face
  chrome: { family: 'DM Mono', q: 'DM+Mono:wght@400', faces: [{ weight: 400, stem: 'DMMono-400' }] },
  fonts: [{ family: 'DM Mono', weight: 300, stem: 'DMMono-300', q: 'DM+Mono:wght@300' }],
};

export const guidelines = { ...brandA, ...brandB, ...brandC, ...brandD, ...slice2, ...slice3, ...slice4, ...slice4b, ...slice5 };
// the A4 portrait edition (brand-a4.js) takes every page in a portrait ctx; a 16:9 ctx keeps its own page
for (const id of Object.keys(a4)) { const prev = guidelines[id]; guidelines[id] = (ctx) => (geo(ctx).portrait ? a4[id](ctx) : prev(ctx)); }
export const uikit = {};
export const guide = { ...uiGuide, order: (edition, ctx) => uiOrder(ctx) };
// the page list the document draws, by kind: only the pages that exist (the route also skips an id with no function)
export const order = (kind, ctx) => (kind === 'guide' ? uiOrder(ctx) : brandOrder(ctx).filter((id) => typeof guidelines[id] === 'function'));
// the preview dialog asks for the engine's page id; this theme's own id for it
export const previewId = {
  cover: 'cover', contents: 'contents', intro: 'who', personality: 'voice', voice: 'voice', 'write-this': 'words', messaging: 'words',
  logo: 'mark', 'logo-versions': 'versions', 'clear-space': 'space', 'min-size': 'space', 'logo-grounds': 'versions', 'logo-misuse': 'misuse',
  palette: 'palette', colour: 'palette', proportion: 'tints', contrast: 'pairs', 'colour-values': 'values',
  typefaces: 'faces', hierarchy: 'scale', 'type-in-use': 'hierarchy', 'type-rules': 'type-rules',
  grid: 'grid', layouts: 'compositions', 'business-card': 'print', social: 'social', digital: 'digital', summary: 'summary', 'contact-scope': 'contact',
};

export function css(ctx) {
  const B = ctx.brand, d = B.fonts.display, b = B.fonts.body, W = ctx.weights, K = geo(ctx);
  const ph = `.pg.fl .ph-b{border:1px dashed var(--hair);color:var(--quiet);padding:.5em .7em .6em;background:transparent}
.pg.fl .ph-l,.pg.fl .ph-m{font:400 ${K.ms}px/1.4 var(--mono);text-transform:uppercase;letter-spacing:.06em;color:var(--quiet)}
.pg.fl .ph-w{font-family:var(--body);color:var(--quiet);font-size:min(1em,${K.portrait ? 15 : 16}px);line-height:1.35}
.pg.fl .ph-b--real .ph-w{font-size:1em}
.pg.fl .tr .ph-b{padding:10px 16px 12px}
.pg.fl .d .ph-w{font-family:var(--display)}
/* copy on a drawn post is the ground's readable ink, not the quiet tone */
.pg.fl .post .ph-w,.pg.fl .post .ph-l,.pg.fl .post .ph-m{color:var(--ink)}
/* a pill inside a drawing scales with it (--pk is the drawing scale against real size, set on the drawing), never under 9px */
.pg.fl[style*="--wash"] .ph-b{display:block;border:0;padding:0}
.pg.fl[style*="--wash"] .ph-l{display:none}
.pg.fl[style*="--wash"] .ph-w{display:block;font:inherit;letter-spacing:inherit;color:var(--quiet);text-wrap:pretty}
.pg.fl[style*="--wash"] .ph-m{display:block;margin-top:8px;white-space:normal;text-transform:none;letter-spacing:.02em;font-size:${K.ms}px;line-height:1.45;max-width:46em;font-style:normal;font-weight:400;text-decoration:none}
.pg.fl[style*="--wash"] .ph-c{border:0;padding:0;background:none}
.pg.fl .ph-c{border:1px dashed var(--hair);color:var(--quiet);font-family:var(--mono);font-size:max(9px,calc(var(--pk,1)*${K.ms}px));letter-spacing:.06em;text-transform:uppercase}`;
  return `.pg.fl{--mono:'DM Mono',monospace;--display:'${d.family}',serif;--body:'${b.family}',serif;
background:var(--g);color:var(--ink);font-family:var(--body);font-size:${K.body}px;line-height:1.5;-webkit-font-smoothing:antialiased;font-kerning:normal;isolation:isolate}
.pg.fl :where(h1,h2,h3,p,div,span){margin:0;padding:0}
.pg.fl .a{position:absolute;box-sizing:border-box;min-width:0}
.pg.fl .m{font:400 ${K.ms}px/1.4 var(--mono);text-transform:uppercase;letter-spacing:.06em;color:var(--quiet);font-variant-numeric:tabular-nums;white-space:nowrap}
.pg.fl .m.i{color:var(--ink)}
.pg.fl .m.w{white-space:normal}
.pg.fl .m.l3{font-weight:300}
.pg.fl .d{font-family:var(--display);font-weight:${W.heading};font-stretch:${d.stretch || 100}%;color:var(--ink);line-height:1;white-space:nowrap}
.pg.fl .ti{font-size:${K.portrait ? 34 : 38}px;line-height:1.05;letter-spacing:-.01em;margin:10px 0 14px;white-space:normal}
.pg.fl .b{font-family:var(--body);font-weight:${W.regular};color:var(--ink)}
.pg.fl .tp{font-size:${K.body}px;line-height:1.5;color:var(--ink);text-wrap:pretty;max-width:34em}
.pg.fl .hr{height:0;border-top:.5px solid var(--hair)}
.pg.fl .vr{width:0;border-left:.5px solid var(--hair)}
.pg.fl .strk{position:relative}
.pg.fl .strk::after{content:"";position:absolute;left:0;right:0;top:55%;border-top:1px solid var(--quiet)}
.pg.fl .strk:has(.ph-b)::after{display:none}
.pg.fl .strk .ph-w{text-decoration:line-through;text-decoration-color:var(--quiet)}
.pg.fl .clip{overflow:hidden}
.pg.fl .wc .ph-w{font-size:1em}
.pg.fl .logo-slot svg{height:84%!important;width:auto!important;max-width:100%;opacity:var(--wm,.5)!important}
.pg.fl .logo-slot span{display:none!important}
.pg.fl .wm{--wm:.9}
.pg.fl .lj .logo-slot{align-items:flex-start!important}
/* the slot logo box is laid out by the theme (logoAr): fill it, so the mark is as wide as the box asked for */
.pg.fl .lf .logo-slot{width:100%!important;height:100%!important;align-items:center!important}
.pg.fl .nw .ph-c{white-space:nowrap}
.pg.fl svg{display:block}
${ph}
${photoCss(ctx)}`;
}

export const guideCss = () => '';
