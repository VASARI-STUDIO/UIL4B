// Theme 34, Set Square: a drawing set. Every page is a sheet with a drawn grid and a title block; dimension lines state what is really on the page. Plumbline is the
// showcase brand (brand 'plumbline' in the engine); the real export is the slot edition, which never prints it. Pages live in pages-1.js and the files after it; the UI style guide (the `guide` row) is drawn by guide-a4.js.
import { guidelines as pages1 } from './pages-1.js';
import { guidelines as pages2 } from './pages-2.js';
import { guidelines as pages3 } from './pages-3.js';
import { guidelines as pages4 } from './pages-4.js';
import { a4 } from './pages-a4.js';
import { brandOrder, css as kitCss, geo } from './kit.js';
import { photoCss } from './photos.js';
import { guide as uiGuide } from './lane-guide.js';
import { uiOrder } from './guide-helpers.js';
import { realCopy } from './real-copy.js';

export const meta = {
  id: '34-set-square', name: 'Set Square', tier: 'Free',
  brand: 'plumbline',
  pages: ['16x9', 'a4-portrait'],  // the sizes a request may ask for (EXPORT_PAGES); the table entry in src/data/exportThemes.js lists the same
  fontLicences: ['IBMPlexMono-OFL.txt'],  // the SIL Open Font License travels in every zip beside the IBM Plex Mono file
  realCopy,  // the project's own name and colours print as words in the slot edition, not as placeholder boxes (see real-copy.js)
  mockups: false, // photo scenes on the mockup pages: false in a real export; the harness turns it on for the showcase (kit.js mockupsOn)
  guidelinesPage: { w: 1280, h: 720 }, uikitPage: { w: 1280, h: 720 }, guidePage: { w: 794, h: 1123 },
  // the theme's mono is IBM Plex Mono (OFL), already in the engine's fonts; its licence is named in fontLicences above
  chrome: { family: 'IBM Plex Mono', q: 'IBM+Plex+Mono:wght@400', faces: [{ weight: 400, stem: 'IBMPlexMono-400' }] },
};

export const guidelines = { ...pages1, ...pages2, ...pages3, ...pages4 };
// the A4 portrait edition (pages-a4.js) takes every page in a portrait ctx; a 16:9 ctx keeps its own page
for (const id of Object.keys(a4)) { const prev = guidelines[id]; guidelines[id] = (ctx) => (geo(ctx).portrait ? a4[id](ctx) : prev(ctx)); }
export const uikit = {};
export const guide = { ...uiGuide, order: (edition, ctx) => uiOrder(ctx) };
// the page list the document draws, by kind: only the pages that exist (the route also skips an id with no function)
export const order = (kind, ctx) => (kind === 'guide' ? uiOrder(ctx) : brandOrder(ctx).filter((id) => typeof guidelines[id] === 'function'));
export const previewId = {
  cover: 'cover', contents: 'contents', intro: 'who', personality: 'voice', voice: 'voice', 'write-this': 'words', messaging: 'words',
  logo: 'mark', 'logo-versions': 'versions', 'clear-space': 'space', 'min-size': 'space', 'logo-grounds': 'versions', 'logo-misuse': 'misuse',
  palette: 'palette', colour: 'palette', proportion: 'tints', contrast: 'pairs', 'colour-values': 'values',
  typefaces: 'faces', hierarchy: 'scale', 'type-in-use': 'hierarchy', 'type-rules': 'type-rules',
  grid: 'grid', layouts: 'compositions', 'business-card': 'print', social: 'social', digital: 'digital', summary: 'summary', 'contact-scope': 'contact',
};
// the guide row's preview ids: the old guide ids map to the page that replaced them, every other id passes through (used only for the guide row)
export const guidePreviewId = { interface: 'screen', colour: 'roles', contrast: 'roles', components: 'buttons', icons: 'space' };
export const css = (ctx) => kitCss(ctx, photoCss(ctx));
export { guideCss } from './guide-a4.js';
